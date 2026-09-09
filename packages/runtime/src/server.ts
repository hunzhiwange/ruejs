import { nextTick } from './runtime-core/reactive'
import {
  RUE_PORTABLE_COMPONENT_TYPE_KEY,
  RUE_PORTABLE_VAPOR_SETUP_KEY,
  RUE_REPEATABLE_MOUNT_FACTORY_KEY,
} from './runtime-core/protocol'

import {
  getDOMAdapter,
  setDOMAdapter,
  type DOMAdapter,
  type DomElementLike,
  type DomFragmentLike,
  type DomNodeLike,
  type DomTextLike,
} from './dom'
import { cloneServerTemplate } from './compiler-runtime/server-template'
import {
  createCompiledComponent,
  type ComponentInstance,
  type ComponentProps,
  type RenderInput,
} from './rue'
import {
  RUE_ISLAND_PROPS_SCRIPT_TYPE,
  RUE_SERVER_COMPILED_VALUE_SNAPSHOT,
  RUE_SERVER_ISLAND_SSR_BRIDGE,
  escapeIslandJson,
  isRueIslandDescriptor,
  isRueServerIslandDescriptor,
  serializeIslandProps,
  type RueIslandDescriptor,
  type RueServerIslandDescriptor,
} from './island-protocol'
import {
  RUE_COMPILED_COMPONENT_FACTORY_KEY,
  RUE_COMPILED_COMPONENT_READ_PROPS_KEY,
} from './compiled-component'
import { _$compiledValue } from './compiled-render-anchor'
import { unwrapDisplayRef } from './display-value'

type ServerNodeType = 1 | 3 | 8 | 11

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

const BOOLEAN_ATTRIBUTES = new Set(['checked', 'disabled', 'multiple', 'readonly', 'selected'])
const SERVER_RENDERING_FLAG = '__rue_is_server_rendering__'
const RUE_SSR_PENDING_ASYNC_COMPONENT_KEY = '__rue_ssr_pending_async_component__'
const RUE_SSR_STREAM_PENDING_KEY = '__rue_ssr_stream_pending__'
const SERVER_RENDERING_BASE_ADAPTER_KEY = '__rue_server_rendering_base_adapter__'
const SERVER_RENDERING_ADAPTER_STACK_KEY = '__rue_server_rendering_adapter_stack__'
const RUE_PORTABLE_PROPS_KEY = 'props'
const SERVER_PROTOCOL_ELEMENT_SYMBOLS = new Set([
  Symbol.for('rue.transitional.element'),
  Symbol.for('rue.element'),
  Symbol.for('react.transitional.element'),
  Symbol.for('react.element'),
])
const SERVER_PROTOCOL_FRAGMENT_SYMBOLS = new Set([
  Symbol.for('rue.fragment'),
  Symbol.for(`${['re', 'act'].join('')}.fragment`),
])
const RUE_CONTEXT_PROVIDER_MARKER = '__rue_context_provider__'
const RUE_SUSPENSE_STAGING_KEY = '__rue_suspense_staging'
const RUE_ELEMENT_HEAD_RECORD = Symbol.for('rue.element.head-record')
const RUE_SERVER_PROTOCOL_NORMALIZER = Symbol.for('rue.server.protocol-normalizer')
const TEXT_HEAD_RECORD = Symbol.for('text.head.record')
const RUE_CLIENT_REFERENCE_SYMBOL = Symbol.for('rue.client.reference')
const RUE_SERVER_OPERATION = Symbol.for('rue.server.operation')
const TEXT_CLIENT_REFERENCE_SSR_RESOLVER_KEY = '__TEXT_RESOLVE_CLIENT_REFERENCE_EXPORT__'
const TEXT_CLIENT_REFERENCE_SSR_KEY = Symbol.for('text.clientReferenceSsr')

type ServerAsyncComponentState =
  | { status: 'pending'; promise: Promise<unknown> }
  | { status: 'resolved'; value: unknown }
  | { status: 'rejected'; reason: unknown }

const serverAsyncComponentStates = new WeakMap<
  DOMAdapter,
  Map<object | string, ServerAsyncComponentState>
>()

const readServerComponentResult = (
  identity: object,
  stableIdentity: object | string | undefined,
  render: () => unknown,
): unknown => {
  const adapter = getDOMAdapter()
  let states = serverAsyncComponentStates.get(adapter)
  if (!states) {
    states = new Map()
    serverAsyncComponentStates.set(adapter, states)
  }
  const key = stableIdentity ?? identity
  const existing = states.get(key)
  if (existing?.status === 'pending') throw existing.promise
  if (existing?.status === 'resolved') return existing.value
  if (existing?.status === 'rejected') throw existing.reason

  const result = render()
  if (
    (typeof result === 'object' || typeof result === 'function') &&
    result !== null &&
    typeof (result as PromiseLike<unknown>).then === 'function'
  ) {
    const promise = Promise.resolve(result).then(
      value => {
        states.set(key, { status: 'resolved', value })
        return value
      },
      reason => {
        states.set(key, { status: 'rejected', reason })
      },
    )
    states.set(key, { status: 'pending', promise })
    throw promise
  }
  return result
}

const escapeText = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const escapeAttribute = (value: string) =>
  escapeText(value)
    .replace(/"/g, '&quot;')
    .replace(/\u00a0/g, '&nbsp;')

class ServerNode implements DomNodeLike {
  parentNode: ServerNode | null = null
  childNodes: ServerNode[] = []

  constructor(readonly nodeType: ServerNodeType) {}

  get firstChild(): ServerNode | null {
    return this.childNodes[0] ?? null
  }

  get lastChild(): ServerNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null
  }

  get nextSibling(): ServerNode | null {
    if (!this.parentNode) {
      return null
    }
    const siblings = getMutableServerChildNodes(this.parentNode)
    const index = siblings.indexOf(this)
    return index === -1 ? null : (siblings[index + 1] ?? null)
  }

  appendChild<T extends ServerNode>(child: T): T {
    insertServerChild(this, child, null)
    return child
  }

  removeChild<T extends ServerNode>(child: T): T {
    removeServerChild(this, child)
    return child
  }

  insertBefore<T extends ServerNode>(child: T, reference: ServerNode | null): T {
    insertServerChild(this, child, reference)
    return child
  }
}

export class ServerTextNode extends ServerNode implements DomTextLike {
  textContent: string

  constructor(data: string) {
    super(3)
    this.textContent = data
  }
}

export class ServerCommentNode extends ServerNode {
  data: string

  constructor(data: string) {
    super(8)
    this.data = data
  }
}

export class ServerElementNode extends ServerNode implements DomElementLike {
  attributes = new Map<string, string>()
  rawInnerHTML: string | null = null
  style: Record<string, string> = {}
  transparent = false
  value: any
  checked = false
  disabled = false
  multiple = false
  selected = false

  constructor(readonly tagName: string) {
    super(1)
  }

  get innerHTML() {
    return this.rawInnerHTML ?? serializeServerNodeChildren(this)
  }

  set innerHTML(value: any) {
    this.rawInnerHTML = value == null ? '' : String(value)
    this.childNodes.forEach(child => {
      child.parentNode = null
    })
    this.childNodes = []
  }

  setAttribute(name: string, value: any) {
    this.attributes.set(name, String(value))
  }

  removeAttribute(name: string) {
    this.attributes.delete(name)
  }

  get className() {
    return this.attributes.get('class') ?? ''
  }

  set className(value: any) {
    this.attributes.set('class', value == null ? '' : String(value))
  }

  addEventListener() {}

  removeEventListener() {}
}

export class ServerFragmentNode extends ServerNode implements DomFragmentLike {
  externalSource?: Node

  constructor() {
    super(11)
  }
}

const getMutableServerChildNodes = (node: ServerNode): ServerNode[] => {
  const childNodes = node.childNodes
  if (Array.isArray(childNodes)) {
    return childNodes
  }

  const normalized = Array.from((childNodes ?? []) as ArrayLike<ServerNode>)
  try {
    node.childNodes = normalized
  } catch {
    Object.defineProperty(node, 'childNodes', {
      value: normalized,
      configurable: true,
      writable: true,
    })
  }

  return normalized
}

export interface RenderToStringOptions {
  /** 传给组件根节点的 props；当 input 是组件函数时生效。 */
  props?: ComponentProps | null
  /** 是否保留 comment 节点，默认不输出。 */
  includeComments?: boolean
  /** `server:defer` 请求协议；只有包含服务端岛时才需要配置。 */
  serverIslands?: RenderToStringServerIslandsOptions
}

export interface RueServerIslandEncodePayload {
  id: string
  props: ComponentProps
}

export interface RenderToStringServerIslandsOptions {
  /** 浏览器加载延迟片段时请求的 handler 地址。 */
  endpoint: string
  /** 将 registry id 与 props 编码为不透明、可验证的请求 token。 */
  encode: (payload: RueServerIslandEncodePayload) => unknown | Promise<unknown>
  /** 完整 GET URL 的 UTF-8 字节预算，默认 2048。 */
  maxGetUrlLength?: number
}

type ServerIslandTokenState =
  | { status: 'pending'; promise: Promise<void> }
  | { status: 'resolved'; token: unknown }

interface ServerIslandRenderContext {
  options?: RenderToStringServerIslandsOptions
  tokens: Map<string, ServerIslandTokenState>
}

const serverIslandRenderContexts = new WeakMap<DOMAdapter, ServerIslandRenderContext>()

export class ServerDOMAdapter implements DOMAdapter {
  readonly root = new ServerElementNode('rue-ssr-root')

  createComment(data: string) {
    return new ServerCommentNode(data)
  }

  createTextNode(data: string) {
    return new ServerTextNode(data)
  }

  createElement(tag: string) {
    return new ServerElementNode(tag)
  }

  createTextWrapper() {
    const node = new ServerElementNode('span')
    node.transparent = true
    return node
  }

  setStyle(el: DomElementLike, style: string | Partial<CSSStyleDeclaration> | null | undefined) {
    const target = el as ServerElementNode
    if (typeof style === 'string') {
      target.attributes.set('style', style)
      return
    }
    if (!style || typeof style !== 'object') {
      target.attributes.delete('style')
      target.style = {}
      return
    }
    for (const [key, value] of Object.entries(style)) {
      if (value != null && value !== '') {
        target.style[key] = String(value)
      }
    }
    syncStyleAttribute(target)
  }

  patchStyle(
    el: DomElementLike,
    oldStyle: Partial<CSSStyleDeclaration> | undefined,
    newStyle: Partial<CSSStyleDeclaration> | undefined,
  ) {
    const target = el as ServerElementNode
    for (const key of Object.keys(oldStyle || {})) {
      if (!(key in (newStyle || {}))) {
        delete target.style[key]
      }
    }
    for (const [key, value] of Object.entries(newStyle || {})) {
      if (value != null && value !== '') {
        target.style[key] = String(value)
      }
    }
    syncStyleAttribute(target)
  }

  settextContent(el: DomNodeLike, val: any) {
    const text = val == null || typeof val === 'boolean' ? '' : String(val)
    if ((el as ServerNode).nodeType === 3) {
      ;(el as ServerTextNode).textContent = text
      return
    }
    const childNodes = getMutableServerChildNodes(el as ServerNode)
    childNodes.forEach(child => {
      child.parentNode = null
    })
    childNodes.splice(0, childNodes.length, new ServerTextNode(text))
    childNodes[0].parentNode = el as ServerNode
  }

  createDocumentFragment() {
    return new ServerFragmentNode()
  }

  cloneTemplate(html: string) {
    return cloneServerTemplate(html, this)
  }

  appendChild(parent: DomNodeLike, child: DomNodeLike) {
    insertServerChild(parent as ServerNode, child as ServerNode, null)
  }

  removeChild(parent: DomNodeLike, child: DomNodeLike) {
    removeServerChild(parent as ServerNode, child as ServerNode)
  }

  insertBefore(parent: DomNodeLike, child: DomNodeLike, ref: DomNodeLike | null) {
    insertServerChild(parent as ServerNode, child as ServerNode, ref as ServerNode | null)
  }

  replaceChild(parent: DomNodeLike, newChild: DomNodeLike, oldChild: DomNodeLike) {
    const targetParent = parent as ServerNode
    const childNodes = getMutableServerChildNodes(targetParent)
    const oldIndex = childNodes.indexOf(oldChild as ServerNode)
    if (oldIndex === -1) {
      return
    }
    removeServerChild(targetParent, oldChild as ServerNode)
    insertServerChild(targetParent, newChild as ServerNode, childNodes[oldIndex] ?? null)
  }

  querySelector() {
    return null
  }

  setAttribute(el: DomElementLike, name: string, value: any) {
    const canonicalName =
      name === 'charset'
        ? 'charSet'
        : name === 'srcset'
          ? 'srcSet'
          : name === 'fetchpriority'
            ? 'fetchPriority'
            : name === 'imagesizes'
              ? 'imageSizes'
              : name === 'imagesrcset'
                ? 'imageSrcSet'
                : name
    ;(el as ServerElementNode).attributes.set(canonicalName, String(value))
  }

  removeAttribute(el: DomElementLike, name: string) {
    ;(el as ServerElementNode).attributes.delete(name)
  }

  addEventListener() {}

  removeEventListener() {}

  setClassName(el: DomElementLike, value: string) {
    ;(el as ServerElementNode).attributes.set('class', value)
  }

  setInnerHTML(el: DomElementLike, html: string) {
    ;(el as ServerElementNode).innerHTML = html
  }

  setValue(el: DomElementLike, value: any) {
    const target = el as ServerElementNode
    target.value = value
    target.attributes.set('value', value == null ? '' : String(value))
  }

  setChecked(el: DomElementLike, checked: boolean) {
    const target = el as ServerElementNode
    target.checked = checked
    setBooleanAttribute(target, 'checked', checked)
  }

  setDisabled(el: DomElementLike, disabled: boolean) {
    const target = el as ServerElementNode
    target.disabled = disabled
    setBooleanAttribute(target, 'disabled', disabled)
  }

  getTagName(el: DomElementLike) {
    return (el as ServerElementNode).tagName.toUpperCase()
  }

  contains(parent: DomNodeLike, child: DomNodeLike) {
    let current: ServerNode | null = child as ServerNode
    while (current) {
      if (current === parent) {
        return true
      }
      current = current.parentNode
    }
    return false
  }

  getParentNode(node: DomNodeLike) {
    return (node as ServerNode).parentNode
  }

  isFragment(node: DomNodeLike) {
    return (node as ServerNode).nodeType === 11
  }

  collectFragmentChildren(node: DomNodeLike) {
    return this.isFragment(node) ? [...(node as ServerNode).childNodes] : [node]
  }

  // Server nodes are serialization records, not mounted browser elements.
  applyRef(_el: DomElementLike, _ref: any) {}

  clearRef(ref: any) {
    if (typeof ref === 'function') {
      ref(null)
    } else if (ref && typeof ref === 'object' && 'current' in ref) {
      ref.current = undefined
    }
  }
}

const getServerRenderingCount = (globalRecord: Record<string, unknown>) => {
  const count = globalRecord[SERVER_RENDERING_FLAG]
  return typeof count === 'number' && count > 0 ? count : 0
}

// SSR renders can overlap; keep a server adapter installed until every scope exits.
const enterServerDOMAdapterScope = (adapter: DOMAdapter) => {
  const globalRecord = globalThis as Record<string, unknown>
  const previousServerRenderingCount = getServerRenderingCount(globalRecord)

  if (previousServerRenderingCount === 0) {
    globalRecord[SERVER_RENDERING_BASE_ADAPTER_KEY] = getDOMAdapter()
  }

  const adapterStack = Array.isArray(globalRecord[SERVER_RENDERING_ADAPTER_STACK_KEY])
    ? (globalRecord[SERVER_RENDERING_ADAPTER_STACK_KEY] as DOMAdapter[])
    : []
  if (adapterStack.length === 0) {
    globalRecord[SERVER_RENDERING_ADAPTER_STACK_KEY] = adapterStack
  }
  adapterStack.push(adapter)

  setDOMAdapter(adapter)
  globalRecord[SERVER_RENDERING_FLAG] = previousServerRenderingCount + 1

  return () => {
    const currentStack = Array.isArray(globalRecord[SERVER_RENDERING_ADAPTER_STACK_KEY])
      ? (globalRecord[SERVER_RENDERING_ADAPTER_STACK_KEY] as DOMAdapter[])
      : []
    const adapterIndex = currentStack.lastIndexOf(adapter)
    if (adapterIndex >= 0) {
      currentStack.splice(adapterIndex, 1)
    }

    const nextServerRenderingCount = Math.max(0, getServerRenderingCount(globalRecord) - 1)
    if (nextServerRenderingCount > 0) {
      globalRecord[SERVER_RENDERING_FLAG] = nextServerRenderingCount
      const nextAdapter = currentStack[currentStack.length - 1]
      if (nextAdapter && getDOMAdapter() === adapter) {
        setDOMAdapter(nextAdapter)
      }
      return
    }

    delete globalRecord[SERVER_RENDERING_FLAG]
    delete globalRecord[SERVER_RENDERING_ADAPTER_STACK_KEY]
    const baseAdapter = globalRecord[SERVER_RENDERING_BASE_ADAPTER_KEY] as DOMAdapter | undefined
    delete globalRecord[SERVER_RENDERING_BASE_ADAPTER_KEY]
    if (baseAdapter) {
      setDOMAdapter(baseAdapter)
    }
  }
}

function isServerProtocolElement(value: unknown): value is {
  $$typeof: symbol
  type: unknown
  props?: Record<string, unknown> | null
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    SERVER_PROTOCOL_ELEMENT_SYMBOLS.has((value as { $$typeof?: symbol }).$$typeof as symbol)
  )
}

function isStructuralServerProtocolElement(value: unknown): value is {
  type: unknown
  props?: Record<string, unknown> | null
  children: unknown
} {
  if (typeof value !== 'object' || value === null || !Object.hasOwn(value, 'children')) return false
  const record = value as Record<string, unknown>
  if (!Object.hasOwn(record, 'type')) return false
  if (record.props != null && typeof record.props !== 'object') return false
  return (
    typeof record.type === 'string' ||
    typeof record.type === 'function' ||
    typeof record.type === 'symbol'
  )
}

function isClassComponentType(value: unknown): value is new (props: Record<string, unknown>) => {
  render: () => unknown
} {
  return (
    typeof value === 'function' &&
    !!(value as { prototype?: { render?: unknown } }).prototype &&
    typeof (value as { prototype?: { render?: unknown } }).prototype?.render === 'function'
  )
}

function readClientReferenceExport(value: unknown): {
  exportName: string
  referenceKey: string
} | null {
  if (
    (typeof value !== 'object' && typeof value !== 'function') ||
    value === null ||
    (value as { $$typeof?: unknown }).$$typeof !== RUE_CLIENT_REFERENCE_SYMBOL
  ) {
    return null
  }

  const referenceKey = (value as { $$referenceKey?: unknown }).$$referenceKey
  const exportName = (value as { $$exportName?: unknown }).$$exportName
  if (typeof referenceKey === 'string' && typeof exportName === 'string') {
    return { referenceKey, exportName }
  }

  const id = (value as { $$id?: unknown }).$$id
  if (typeof id !== 'string') return null
  const separator = id.lastIndexOf('#')
  if (separator <= 0 || separator === id.length - 1) return null
  return {
    referenceKey: id.slice(0, separator),
    exportName: id.slice(separator + 1),
  }
}

function resolveClientReferenceComponentType(type: unknown): unknown {
  const reference = readClientReferenceExport(type)
  if (!reference) return type

  // This dev-only component removes stylesheet links after hydration. It has
  // no server output, and resolving its client module during SSR can leave a
  // Vite module-runner import pending while the response is being rendered.
  if (reference.referenceKey.includes('virtual:rue-rsc/remove-duplicate-server-css')) {
    return () => null
  }

  const resolver = (globalThis as Record<string, unknown>)[TEXT_CLIENT_REFERENCE_SSR_RESOLVER_KEY]
  if (typeof resolver !== 'function') return type

  const resolved = (resolver as (referenceKey: string, exportName: string) => unknown)(
    reference.referenceKey,
    reference.exportName,
  )
  return typeof resolved === 'function' ? resolved : type
}

function invokeServerProtocolComponent(
  clientReference: ReturnType<typeof readClientReferenceExport>,
  type: (props: Record<string, unknown>) => unknown,
  props: Record<string, unknown>,
): unknown {
  if (!clientReference) return type(props)
  const globalRecord = globalThis as Record<PropertyKey, unknown>
  const previous = globalRecord[TEXT_CLIENT_REFERENCE_SSR_KEY]
  const count = typeof previous === 'number' ? previous : 0
  globalRecord[TEXT_CLIENT_REFERENCE_SSR_KEY] = count + 1
  try {
    const clientProps =
      props.children !== null && typeof props.children === 'object'
        ? { ...props, children: _$compiledValue(props.children) }
        : props
    return type(clientProps)
  } finally {
    if (previous === undefined) delete globalRecord[TEXT_CLIENT_REFERENCE_SSR_KEY]
    else globalRecord[TEXT_CLIENT_REFERENCE_SSR_KEY] = previous
  }
}

function isRuePortableComponentHandle(value: unknown): value is {
  [RUE_PORTABLE_COMPONENT_TYPE_KEY]: unknown
  props?: Record<string, unknown> | null
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    RUE_PORTABLE_COMPONENT_TYPE_KEY in (value as Record<string, unknown>)
  )
}

function isRuePortableVaporHandle(value: unknown): value is {
  [RUE_PORTABLE_VAPOR_SETUP_KEY]: (parentContext?: DomElementLike | null) => unknown
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)[RUE_PORTABLE_VAPOR_SETUP_KEY] === 'function'
  )
}

function readRueElementHeadRecord(value: unknown): {
  type: unknown
  props?: Record<string, unknown> | null
} | null {
  if (typeof value !== 'object' || value === null) return null
  const record = (value as { [RUE_ELEMENT_HEAD_RECORD]?: unknown })[RUE_ELEMENT_HEAD_RECORD]
  if (typeof record !== 'object' || record === null) return null
  if ((record as { [TEXT_HEAD_RECORD]?: unknown })[TEXT_HEAD_RECORD] !== true) return null
  return record as { type: unknown; props?: Record<string, unknown> | null }
}

function createFreshServerRenderable(value: unknown): unknown {
  if (Array.isArray(value)) {
    let changed = false
    const nextValue = value.map(item => {
      const replayed = createFreshServerRenderable(item)
      if (replayed !== item) changed = true
      return replayed
    })
    return changed ? nextValue : value
  }
  if (typeof value !== 'object' && typeof value !== 'function') {
    return value
  }
  if (value === null) {
    return value
  }
  if (isRueIslandDescriptor(value) || isRueServerIslandDescriptor(value)) {
    return value
  }
  if (RUE_SERVER_COMPILED_VALUE_SNAPSHOT in value) {
    return value
  }

  const factory = (value as Record<string, unknown>)[RUE_REPEATABLE_MOUNT_FACTORY_KEY]
  if (typeof factory === 'function') {
    return factory()
  }

  const cloneCompiledRoot = (value as Record<string, unknown>).__rue_compiled_clone
  if (typeof cloneCompiledRoot === 'function') {
    return (cloneCompiledRoot as () => unknown)()
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    return value
  }

  let changed = false
  const clone = Object.create(prototype) as Record<string, unknown>
  for (const [key, entryValue] of Object.entries(value)) {
    const replayed = createFreshServerRenderable(entryValue)
    if (replayed !== entryValue) changed = true
    clone[key] = replayed
  }
  return changed ? clone : value
}

function normalizeServerProtocolProps(rawProps: Record<string, unknown> | null | undefined): {
  children: unknown
  props: Record<string, unknown>
} {
  const source = rawProps ?? {}
  const { children, ...props } = source
  // Only `children` participates in the renderable protocol. Other props may
  // legitimately be zero-argument callbacks (event handlers, server actions,
  // loaders); recursively normalizing them would execute user code during SSR.
  return { children, props }
}

function appendNormalizedServerChild(parent: ServerNode, child: unknown) {
  const normalized = normalizeServerProtocolRenderable(unwrapDisplayRef(child))
  if (Array.isArray(normalized)) {
    for (const item of normalized) {
      appendNormalizedServerChild(parent, item)
    }
    return
  }
  if (normalized == null || typeof normalized === 'boolean') return
  if (typeof normalized === 'string' || typeof normalized === 'number') {
    insertServerChild(parent, new ServerTextNode(String(normalized)), null)
    return
  }
  if (normalized instanceof ServerNode) {
    insertServerChild(parent, normalized, null)
    return
  }
  insertServerChild(parent, cloneExternalDomNode(normalized as ServerNode), null)
}

function setServerElementProp(element: ServerElementNode, key: string, value: unknown) {
  if (
    key === 'children' ||
    key === 'key' ||
    key === 'ref' ||
    key === 'suppressHydrationWarning' ||
    value == null ||
    typeof value === 'function'
  ) {
    return
  }
  if (key === 'dangerouslySetInnerHTML') {
    const html =
      typeof value === 'object' && value !== null
        ? (value as { __html?: unknown }).__html
        : undefined
    if (html !== undefined && html !== null) {
      element.innerHTML = html
    }
    return
  }
  if (key === 'style' && typeof value === 'object' && value !== null) {
    for (const [styleKey, styleValue] of Object.entries(value)) {
      if (styleValue != null && styleValue !== '') {
        element.style[styleKey] = String(styleValue)
      }
    }
    syncStyleAttribute(element)
    return
  }

  const attributeName = key === 'className' ? 'class' : key === 'htmlFor' ? 'for' : key
  if (typeof value === 'boolean') {
    if (BOOLEAN_ATTRIBUTES.has(attributeName)) {
      setBooleanAttribute(element, attributeName, value)
    } else {
      element.attributes.set(attributeName, String(value))
    }
    return
  }
  element.attributes.set(attributeName, String(value))
}

function createServerNodeFromProtocolElement(
  type: string,
  props: Record<string, unknown>,
  children: unknown,
): ServerNode {
  const node = type === 'fragment' ? new ServerFragmentNode() : new ServerElementNode(type)
  if (node instanceof ServerElementNode) {
    for (const [key, value] of Object.entries(props)) {
      setServerElementProp(node, key, value)
    }
  }
  if (!(node instanceof ServerElementNode) || node.rawInnerHTML == null) {
    if (Array.isArray(children)) {
      for (const child of children) appendNormalizedServerChild(node, child)
    } else if (children !== undefined) {
      appendNormalizedServerChild(node, children)
    }
  }
  return node
}

function createServerNodeFromIslandDescriptor(descriptor: RueIslandDescriptor): unknown {
  const hydrate = descriptor.metadata.hydrate ?? 'load'
  if (hydrate === 'none') {
    return normalizeServerProtocolRenderable(
      createCompiledComponent(descriptor.component, descriptor.props),
    )
  }

  const id = descriptor.metadata.id
  const node = new ServerElementNode('rue-island')
  setServerElementProp(node, 'data-rue-id', id)
  setServerElementProp(node, 'data-rue-component', id)
  setServerElementProp(node, 'data-rue-entry', id)
  setServerElementProp(node, 'data-rue-hydrate', hydrate)
  if (descriptor.metadata.media) {
    setServerElementProp(node, 'data-rue-media', descriptor.metadata.media)
  }
  if (descriptor.metadata.interaction) {
    setServerElementProp(
      node,
      'data-rue-interaction',
      Array.isArray(descriptor.metadata.interaction)
        ? descriptor.metadata.interaction.join(',')
        : descriptor.metadata.interaction,
    )
  }
  if (descriptor.metadata.timeout !== undefined) {
    setServerElementProp(node, 'data-rue-timeout', descriptor.metadata.timeout)
  }
  if (descriptor.metadata.rootMargin) {
    setServerElementProp(node, 'data-rue-root-margin', descriptor.metadata.rootMargin)
  }

  const content =
    hydrate === 'only'
      ? descriptor.fallback
      : createCompiledComponent(descriptor.component, descriptor.props)
  if (content !== undefined) {
    appendNormalizedServerChild(node, content)
  }

  const propsScript = new ServerElementNode('script')
  setServerElementProp(propsScript, 'type', RUE_ISLAND_PROPS_SCRIPT_TYPE)
  setServerElementProp(propsScript, 'data-rue-props', id)
  appendNormalizedServerChild(propsScript, serializeIslandProps(descriptor.props))
  insertServerChild(node, propsScript, null)
  return node
}

const getUtf8ByteLength = (value: string) => new TextEncoder().encode(value).byteLength

function createServerNodeFromServerIslandDescriptor(
  descriptor: RueServerIslandDescriptor,
  explicitContext?: ServerIslandRenderContext,
): unknown {
  const context = explicitContext ?? serverIslandRenderContexts.get(getDOMAdapter())
  const options = context?.options
  if (!context || !options) {
    throw new Error(
      'RenderToStringOptions.serverIslands is required when rendering server:defer islands.',
    )
  }
  if (!options.endpoint) {
    throw new Error('RenderToStringOptions.serverIslands.endpoint must be a non-empty string.')
  }
  if (typeof options.encode !== 'function') {
    throw new Error('RenderToStringOptions.serverIslands.encode must be a function.')
  }

  const serializedProps = serializeIslandProps(descriptor.props)
  const cacheKey = `${descriptor.id}\u0000${serializedProps}`
  let state = context.tokens.get(cacheKey)
  if (!state) {
    const payload = { id: descriptor.id, props: descriptor.props }
    const pendingState: ServerIslandTokenState = {
      status: 'pending',
      promise: Promise.resolve(),
    }
    pendingState.promise = Promise.resolve(options.encode(payload)).then(token => {
      context.tokens.set(cacheKey, { status: 'resolved', token })
    })
    state = pendingState
    context.tokens.set(cacheKey, state)
  }

  if (state.status === 'pending') {
    const globalRecord = globalThis as Record<string, unknown>
    const pending = (globalRecord[RUE_SSR_PENDING_ASYNC_COMPONENT_KEY] ??= []) as Promise<unknown>[]
    if (!pending.includes(state.promise)) pending.push(state.promise)
  }

  const node = new ServerElementNode('rue-server-island')
  setServerElementProp(node, 'data-rue-server-island', descriptor.id)
  if (descriptor.fallback !== undefined) {
    appendNormalizedServerChild(node, createFreshServerRenderable(descriptor.fallback))
  }

  if (state.status === 'pending') {
    return node
  }

  const payloadJson = JSON.stringify(state.token)
  if (payloadJson === undefined) {
    throw new TypeError('Rue server island encode() must return a JSON-serializable token.')
  }
  const querySeparator = options.endpoint.includes('?') ? '&' : '?'
  const requestUrl = `${options.endpoint}${querySeparator}payload=${encodeURIComponent(payloadJson)}`
  const maxGetUrlLength = options.maxGetUrlLength ?? 2048
  if (!Number.isFinite(maxGetUrlLength) || maxGetUrlLength <= 0) {
    throw new TypeError('RenderToStringOptions.serverIslands.maxGetUrlLength must be positive.')
  }

  if (getUtf8ByteLength(requestUrl) <= maxGetUrlLength) {
    setServerElementProp(node, 'data-rue-method', 'GET')
    setServerElementProp(node, 'data-rue-url', requestUrl)
    return node
  }

  setServerElementProp(node, 'data-rue-method', 'POST')
  setServerElementProp(node, 'data-rue-endpoint', options.endpoint)
  const payloadScript = new ServerElementNode('script')
  setServerElementProp(payloadScript, 'type', RUE_ISLAND_PROPS_SCRIPT_TYPE)
  setServerElementProp(payloadScript, 'data-rue-server-island-payload', true)
  appendNormalizedServerChild(payloadScript, escapeIslandJson(payloadJson))
  insertServerChild(node, payloadScript, null)
  return node
}

function normalizeServerProtocolRenderable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => normalizeServerProtocolRenderable(item))
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    RUE_SERVER_OPERATION in (value as Record<PropertyKey, unknown>)
  ) {
    const operation = value as {
      [RUE_SERVER_OPERATION]: 'element' | 'component' | 'fragment'
      type?: unknown
      props?: Record<string, unknown> | null
      children?: unknown[]
    }
    const children = operation.children ?? []
    if (operation[RUE_SERVER_OPERATION] === 'fragment') {
      return normalizeServerProtocolRenderable(children)
    }
    return normalizeServerProtocolRenderable({
      $$typeof: Symbol.for('rue.transitional.element'),
      type: operation.type,
      props: {
        ...operation.props,
        ...(children.length > 0
          ? { children: children.length === 1 ? children[0] : children }
          : null),
      },
    })
  }

  if (isRueIslandDescriptor(value)) {
    return createServerNodeFromIslandDescriptor(value)
  }

  if (isRueServerIslandDescriptor(value)) {
    return createServerNodeFromServerIslandDescriptor(value)
  }

  if (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    RUE_SERVER_COMPILED_VALUE_SNAPSHOT in value
  ) {
    return normalizeServerProtocolRenderable(
      (value as Record<PropertyKey, unknown>)[RUE_SERVER_COMPILED_VALUE_SNAPSHOT],
    )
  }

  if ((typeof value === 'object' || typeof value === 'function') && value !== null) {
    const record = value as Record<PropertyKey, unknown>
    const factory = record[RUE_COMPILED_COMPONENT_FACTORY_KEY]
    const readProps = record[RUE_COMPILED_COMPONENT_READ_PROPS_KEY]
    if (
      (typeof factory === 'string' || typeof factory === 'function') &&
      typeof readProps === 'function'
    ) {
      const props = (readProps as () => Record<string, unknown>)() ?? {}
      const { children, props: normalizedProps } = normalizeServerProtocolProps(props)
      if (typeof factory === 'string') {
        return createServerNodeFromProtocolElement(factory, normalizedProps, children)
      }
      if (!(RUE_PORTABLE_VAPOR_SETUP_KEY in record)) {
        const clientReference = readClientReferenceExport(factory)
        const resolvedFactory = resolveClientReferenceComponentType(factory)
        return normalizeServerProtocolRenderable(
          readServerComponentResult(record, resolvedFactory as object, () =>
            invokeServerProtocolComponent(
              clientReference,
              resolvedFactory as (props: Record<string, unknown>) => unknown,
              {
                ...normalizedProps,
                ...(children !== undefined ? { children } : null),
              },
            ),
          ),
        )
      }
      // Function-backed compiler handles must mount through their compiled
      // root below. Calling the factory here bypasses the active DOM host
      // scope, so nested slot factories fall back to the browser `document`
      // while rendering on the server.
    }
  }

  if (isRuePortableComponentHandle(value)) {
    const rawType = value[RUE_PORTABLE_COMPONENT_TYPE_KEY]
    const clientReference = readClientReferenceExport(rawType)
    const type = resolveClientReferenceComponentType(rawType)
    const rawProps =
      value[RUE_PORTABLE_PROPS_KEY] && typeof value[RUE_PORTABLE_PROPS_KEY] === 'object'
        ? (value[RUE_PORTABLE_PROPS_KEY] as Record<string, unknown>)
        : {}
    const { children, props } = normalizeServerProtocolProps(rawProps)

    if (SERVER_PROTOCOL_FRAGMENT_SYMBOLS.has(type as symbol)) {
      return normalizeServerProtocolRenderable(children)
    }

    if (typeof type === 'string') {
      const childList = Array.isArray(children)
        ? children.map(child => normalizeServerProtocolRenderable(child))
        : children !== undefined
          ? [normalizeServerProtocolRenderable(children)]
          : []
      return createServerNodeFromProtocolElement(type, props, childList)
    }

    if (isClassComponentType(type)) {
      const instance = new type({
        ...props,
        ...(children !== undefined ? { children } : null),
      })
      return normalizeServerProtocolRenderable(instance.render())
    }

    if (
      typeof type === 'function' &&
      (type as unknown as Record<string, unknown>)[RUE_CONTEXT_PROVIDER_MARKER] === true
    ) {
      return normalizeServerProtocolRenderable(children)
    }

    if (typeof type === 'function') {
      try {
        return normalizeServerProtocolRenderable(
          invokeServerProtocolComponent(
            clientReference,
            type as (props: Record<string, unknown>) => unknown,
            {
              ...props,
              ...(children !== undefined ? { children } : null),
            },
          ),
        )
      } catch (error) {
        if (
          clientReference &&
          error instanceof Error &&
          error.message.includes('only works in Client Components')
        ) {
          return null
        }
        throw error
      }
    }
  }

  const headRecord = readRueElementHeadRecord(value)
  if (headRecord) {
    const { children, props } = normalizeServerProtocolProps(headRecord.props)
    const childList = Array.isArray(children)
      ? children.map(child => normalizeServerProtocolRenderable(child))
      : children !== undefined
        ? [normalizeServerProtocolRenderable(children)]
        : []
    const type = SERVER_PROTOCOL_FRAGMENT_SYMBOLS.has(headRecord.type as symbol)
      ? 'fragment'
      : headRecord.type
    if (typeof type === 'string') {
      return createServerNodeFromProtocolElement(type, props, childList)
    }
  }

  if (isRuePortableVaporHandle(value)) {
    const isCompiledJsRoot =
      (value as unknown as Record<string, unknown>).__rue_compiled_js_root === true
    if (typeof document !== 'undefined' && !isCompiledJsRoot) {
      const fragment = document.createDocumentFragment()
      const globalRecord = globalThis as Record<string, unknown>
      const globalSymbolRecord = globalThis as Record<PropertyKey, unknown>
      const serverAdapter = getDOMAdapter()
      const serverIslandContext = serverIslandRenderContexts.get(serverAdapter)
      const browserAdapter = globalRecord[SERVER_RENDERING_BASE_ADAPTER_KEY] as
        | DOMAdapter
        | undefined
      const previousServerIslandBridge = globalSymbolRecord[RUE_SERVER_ISLAND_SSR_BRIDGE]
      if (browserAdapter) setDOMAdapter(browserAdapter)
      globalSymbolRecord[RUE_SERVER_ISLAND_SSR_BRIDGE] = (descriptor: RueServerIslandDescriptor) =>
        createServerNodeFromServerIslandDescriptor(descriptor, serverIslandContext)
      try {
        const result = value[RUE_PORTABLE_VAPOR_SETUP_KEY](fragment as unknown as DomElementLike)
        if (result instanceof Node && result.parentNode !== fragment) {
          fragment.appendChild(result)
        }
      } finally {
        if (previousServerIslandBridge === undefined) {
          delete globalSymbolRecord[RUE_SERVER_ISLAND_SSR_BRIDGE]
        } else {
          globalSymbolRecord[RUE_SERVER_ISLAND_SSR_BRIDGE] = previousServerIslandBridge
        }
        if (browserAdapter) setDOMAdapter(serverAdapter)
      }
      const liveFragment = new ServerFragmentNode()
      liveFragment.externalSource = fragment
      return liveFragment
    }

    const adapter = getDOMAdapter()
    const fragment = adapter.createDocumentFragment()
    const fragmentChildren = (fragment as unknown as { childNodes: ArrayLike<unknown> }).childNodes
    const initialChildCount = fragmentChildren.length
    const result = value[RUE_PORTABLE_VAPOR_SETUP_KEY](fragment as DomElementLike)
    if (result != null && fragmentChildren.length === initialChildCount) {
      adapter.appendChild(fragment, result as DomNodeLike)
    }
    return fragment
  }

  if (typeof value === 'function' && value.length === 0) {
    return normalizeServerProtocolRenderable((value as () => unknown)())
  }

  if (isStructuralServerProtocolElement(value)) {
    return normalizeServerProtocolRenderable({
      $$typeof: Symbol.for('rue.transitional.element'),
      type: value.type,
      props: {
        ...value.props,
        children: value.children,
      },
    })
  }

  if (!isServerProtocolElement(value)) {
    return value
  }

  const { children, props } = normalizeServerProtocolProps(value.props)
  const rawType = SERVER_PROTOCOL_FRAGMENT_SYMBOLS.has(value.type as symbol)
    ? 'fragment'
    : value.type
  const clientReference = readClientReferenceExport(rawType)
  const type = resolveClientReferenceComponentType(rawType)

  if (isClassComponentType(type)) {
    const instance = new type({
      ...props,
      ...(children !== undefined ? { children } : null),
    })
    return normalizeServerProtocolRenderable(instance.render())
  }

  if (
    typeof type === 'function' &&
    (type as unknown as Record<string, unknown>)[RUE_CONTEXT_PROVIDER_MARKER] === true
  ) {
    return normalizeServerProtocolRenderable(children)
  }

  if (typeof type === 'function') {
    return normalizeServerProtocolRenderable(
      invokeServerProtocolComponent(
        clientReference,
        type as (props: Record<string, unknown>) => unknown,
        {
          ...props,
          ...(children !== undefined ? { children } : null),
        },
      ),
    )
  }

  if (typeof type !== 'string') {
    return null
  }

  const childList = Array.isArray(children)
    ? children.map(child => normalizeServerProtocolRenderable(child))
    : children !== undefined
      ? [normalizeServerProtocolRenderable(children)]
      : []
  return createServerNodeFromProtocolElement(type, props, childList)
}

const setBooleanAttribute = (node: ServerElementNode, name: string, value: boolean) => {
  if (value) {
    node.attributes.set(name, '')
  } else {
    node.attributes.delete(name)
  }
}

const syncStyleAttribute = (node: ServerElementNode) => {
  const style = Object.entries(node.style)
    .map(
      ([key, value]) =>
        `${key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}: ${value.replace(
          /url\((["'])(.*?)\1\)/g,
          'url($2)',
        )}`,
    )
    .join('; ')
  if (style) {
    node.attributes.set('style', style)
  } else {
    node.attributes.delete('style')
  }
}

const removeServerChild = (parent: ServerNode, child: ServerNode) => {
  const childNodes = getMutableServerChildNodes(parent)
  const index = childNodes.indexOf(child)
  if (index === -1) {
    return
  }
  childNodes.splice(index, 1)
  child.parentNode = null
}

const copyExternalAttributes = (source: unknown, target: ServerElementNode) => {
  const normalizeExternalAttribute = (name: string, value: string) => {
    const canonicalName =
      name === 'charset'
        ? 'charSet'
        : name === 'srcset'
          ? 'srcSet'
          : name === 'fetchpriority'
            ? 'fetchPriority'
            : name === 'imagesizes'
              ? 'imageSizes'
              : name === 'imagesrcset'
                ? 'imageSrcSet'
                : name
    const canonicalValue =
      canonicalName === 'style' ? value.replace(/url\((["'])(.*?)\1\)/g, 'url($2)') : value
    target.attributes.set(canonicalName, canonicalValue)
  }
  const attributes = (source as { attributes?: unknown }).attributes
  if (!attributes) return
  if (attributes instanceof Map) {
    for (const [name, value] of attributes) {
      normalizeExternalAttribute(String(name), String(value))
    }
    return
  }
  if (
    typeof attributes === 'object' &&
    attributes !== null &&
    typeof (attributes as { length?: unknown }).length === 'number'
  ) {
    const list = attributes as {
      length: number
      item?: (index: number) => { name?: unknown; value?: unknown } | null
      [index: number]: { name?: unknown; value?: unknown } | undefined
    }
    for (let i = 0; i < list.length; i += 1) {
      const attr = typeof list.item === 'function' ? list.item(i) : list[i]
      if (!attr || attr.name == null) continue
      normalizeExternalAttribute(String(attr.name), String(attr.value ?? ''))
    }
  }
}

const cloneExternalDomNode = (node: unknown): ServerNode => {
  if (node instanceof ServerNode) return node
  const domNode = node as {
    childNodes?: ArrayLike<unknown>
    data?: unknown
    nodeName?: unknown
    nodeType?: unknown
    tagName?: unknown
    textContent?: unknown
  }
  if (domNode.nodeType === 3) {
    return new ServerTextNode(String(domNode.textContent ?? ''))
  }
  if (domNode.nodeType === 8) {
    return new ServerCommentNode(String(domNode.data ?? ''))
  }
  if (domNode.nodeType === 11) {
    const fragment = new ServerFragmentNode()
    for (const child of Array.from(domNode.childNodes ?? [])) {
      insertServerChild(fragment, child, null)
    }
    return fragment
  }
  if (domNode.nodeType !== 1) return new ServerTextNode('')

  const tagName = String(domNode.tagName ?? domNode.nodeName ?? '').toLowerCase()
  const element = new ServerElementNode(tagName || 'span')
  copyExternalAttributes(node, element)
  if (
    tagName === 'input' &&
    !element.attributes.has('value') &&
    (node as { value?: unknown }).value !== undefined &&
    (node as { value?: unknown }).value !== ''
  ) {
    element.attributes.set('value', String((node as { value?: unknown }).value))
  }
  const externalChildren = Array.from(domNode.childNodes ?? [])
  if (
    externalChildren.some(
      child =>
        (child as { nodeType?: unknown }).nodeType === 8 &&
        String((child as { data?: unknown }).data ?? '').includes('__TEXT_SCRIPTS__'),
    )
  ) {
    element.rawInnerHTML = String((node as { innerHTML?: unknown }).innerHTML ?? '')
    return element
  }
  for (const child of externalChildren) {
    insertServerChild(element, child, null)
  }
  return element
}

const insertServerChild = (parent: ServerNode, child: unknown, ref: ServerNode | null) => {
  const serverChild = cloneExternalDomNode(child)
  if (serverChild.nodeType === 11 && !(serverChild as ServerFragmentNode).externalSource) {
    const moving = [...getMutableServerChildNodes(serverChild)]
    for (const fragmentChild of moving) {
      insertServerChild(parent, fragmentChild, ref)
    }
    return
  }

  if (serverChild.parentNode) {
    removeServerChild(serverChild.parentNode, serverChild)
  }

  const childNodes = getMutableServerChildNodes(parent)
  const refIndex = ref ? childNodes.indexOf(ref) : -1
  const insertIndex = refIndex === -1 ? childNodes.length : refIndex
  childNodes.splice(insertIndex, 0, serverChild)
  serverChild.parentNode = parent
}

const serializeAttributes = (node: ServerElementNode) => {
  const attributes: string[] = []
  for (const [name, value] of node.attributes) {
    if (value == null) {
      continue
    }
    if (BOOLEAN_ATTRIBUTES.has(name) && (value === '' || value === 'true')) {
      attributes.push(name)
      continue
    }
    attributes.push(`${name}="${escapeAttribute(String(value))}"`)
  }
  return attributes.length ? ` ${attributes.join(' ')}` : ''
}

const serializeServerNode = (node: ServerNode, options: RenderToStringOptions = {}): string => {
  if ((node as unknown as Record<string, unknown>)[RUE_SUSPENSE_STAGING_KEY] === true) {
    return ''
  }
  if (node.nodeType === 3) {
    return escapeText((node as ServerTextNode).textContent)
  }
  if (node.nodeType === 8) {
    const data = (node as ServerCommentNode).data
    return options.includeComments || data.includes('__TEXT_SCRIPTS__') ? `<!--${data}-->` : ''
  }
  if (node.nodeType === 11) {
    const externalSource = (node as ServerFragmentNode).externalSource
    if (externalSource) return serializeServerNode(cloneExternalDomNode(externalSource), options)
    return serializeServerNodeChildren(node, options)
  }

  const element = node as ServerElementNode
  if (element.transparent) {
    return serializeServerNodeChildren(element, options)
  }
  const tag = element.tagName
  const attrs = serializeAttributes(element)
  if (VOID_TAGS.has(tag.toLowerCase())) {
    return `<${tag}${attrs}>`
  }
  const children =
    element.rawInnerHTML == null
      ? serializeServerNodeChildren(element, options)
      : element.rawInnerHTML
  return `<${tag}${attrs}>${children}</${tag}>`
}

const serializeServerNodeChildren = (
  node: ServerNode,
  options: RenderToStringOptions = {},
): string => node.childNodes.map(child => serializeServerNode(child, options)).join('')

const flushServerRenderMicrotasks = async () => {
  await nextTick()
  await Promise.resolve()
}

const isServerThenable = (value: unknown): value is PromiseLike<unknown> =>
  (typeof value === 'object' || typeof value === 'function') &&
  value !== null &&
  typeof (value as PromiseLike<unknown>).then === 'function'

export const renderToString = async (
  input: RenderInput | ComponentInstance<any>,
  options: RenderToStringOptions = {},
) => {
  const adapter = new ServerDOMAdapter()
  const globalRecord = globalThis as Record<string, unknown>
  const globalSymbolRecord = globalThis as Record<PropertyKey, unknown>
  const previousServerIslandBridge = globalSymbolRecord[RUE_SERVER_ISLAND_SSR_BRIDGE]
  const previousServerProtocolNormalizer = globalSymbolRecord[RUE_SERVER_PROTOCOL_NORMALIZER]
  globalSymbolRecord[RUE_SERVER_ISLAND_SSR_BRIDGE] = (descriptor: RueServerIslandDescriptor) =>
    createServerNodeFromServerIslandDescriptor(descriptor, serverIslandContext)
  globalSymbolRecord[RUE_SERVER_PROTOCOL_NORMALIZER] = normalizeServerProtocolRenderable
  const leaveServerDOMAdapterScope = enterServerDOMAdapterScope(adapter)
  const serverIslandContext: ServerIslandRenderContext = {
    options: options.serverIslands,
    tokens: new Map(),
  }
  serverIslandRenderContexts.set(adapter, serverIslandContext)

  try {
    const createRenderValue = () => {
      const value =
        typeof input === 'function'
          ? createCompiledComponent(input as ComponentInstance<any>, options.props ?? null)
          : input
      return normalizeServerProtocolRenderable(createFreshServerRenderable(value))
    }
    let shouldRender = true
    for (let i = 0; i < 8; i += 1) {
      if (shouldRender) {
        getMutableServerChildNodes(adapter.root).forEach(child => {
          child.parentNode = null
        })
        adapter.root.childNodes = []
        try {
          const renderValue = createRenderValue()
          appendNormalizedServerChild(adapter.root, renderValue)
        } catch (error) {
          if (!isServerThenable(error)) throw error
          globalRecord[RUE_SSR_PENDING_ASYNC_COMPONENT_KEY] = []
          await Promise.resolve(error)
          await flushServerRenderMicrotasks()
          shouldRender = true
          continue
        }
        shouldRender = false
      }
      const pendingAsyncComponents = globalRecord[RUE_SSR_PENDING_ASYNC_COMPONENT_KEY] as
        | Promise<unknown>[]
        | undefined
      if (pendingAsyncComponents?.length) {
        globalRecord[RUE_SSR_PENDING_ASYNC_COMPONENT_KEY] = []
        await Promise.all(pendingAsyncComponents)
        await flushServerRenderMicrotasks()
        shouldRender = true
        continue
      }
      await flushServerRenderMicrotasks()
    }
    return serializeServerNodeChildren(adapter.root, options)
  } finally {
    try {
      getMutableServerChildNodes(adapter.root).forEach(child => {
        child.parentNode = null
      })
      adapter.root.childNodes = []
      await flushServerRenderMicrotasks()
    } finally {
      serverIslandRenderContexts.delete(adapter)
      if (previousServerIslandBridge === undefined) {
        delete globalSymbolRecord[RUE_SERVER_ISLAND_SSR_BRIDGE]
      } else {
        globalSymbolRecord[RUE_SERVER_ISLAND_SSR_BRIDGE] = previousServerIslandBridge
      }
      if (previousServerProtocolNormalizer === undefined) {
        delete globalSymbolRecord[RUE_SERVER_PROTOCOL_NORMALIZER]
      } else {
        globalSymbolRecord[RUE_SERVER_PROTOCOL_NORMALIZER] = previousServerProtocolNormalizer
      }
      leaveServerDOMAdapterScope()
    }
  }
}

/** Render a compiled SSR shell immediately and keep the adapter alive for Suspense updates. */
export const renderToReadableStream = async (
  input: RenderInput | ComponentInstance<any>,
  options: RenderToStringOptions = {},
): Promise<ReadableStream<Uint8Array>> => {
  const adapter = new ServerDOMAdapter()
  const globalRecord = globalThis as Record<string, unknown>
  const globalSymbolRecord = globalThis as Record<PropertyKey, unknown>
  const previousServerIslandBridge = globalSymbolRecord[RUE_SERVER_ISLAND_SSR_BRIDGE]
  const previousServerProtocolNormalizer = globalSymbolRecord[RUE_SERVER_PROTOCOL_NORMALIZER]
  const previousStreamPending = globalRecord[RUE_SSR_STREAM_PENDING_KEY]
  const serverIslandContext: ServerIslandRenderContext = {
    options: options.serverIslands,
    tokens: new Map(),
  }
  globalRecord[RUE_SSR_STREAM_PENDING_KEY] = []
  globalSymbolRecord[RUE_SERVER_ISLAND_SSR_BRIDGE] = (descriptor: RueServerIslandDescriptor) =>
    createServerNodeFromServerIslandDescriptor(descriptor, serverIslandContext)
  globalSymbolRecord[RUE_SERVER_PROTOCOL_NORMALIZER] = normalizeServerProtocolRenderable
  const leaveServerDOMAdapterScope = enterServerDOMAdapterScope(adapter)
  serverIslandRenderContexts.set(adapter, serverIslandContext)

  const cleanup = async () => {
    getMutableServerChildNodes(adapter.root).forEach(child => {
      child.parentNode = null
    })
    adapter.root.childNodes = []
    await flushServerRenderMicrotasks()
    serverIslandRenderContexts.delete(adapter)
    if (previousServerIslandBridge === undefined)
      delete globalSymbolRecord[RUE_SERVER_ISLAND_SSR_BRIDGE]
    else globalSymbolRecord[RUE_SERVER_ISLAND_SSR_BRIDGE] = previousServerIslandBridge
    if (previousServerProtocolNormalizer === undefined) {
      delete globalSymbolRecord[RUE_SERVER_PROTOCOL_NORMALIZER]
    } else {
      globalSymbolRecord[RUE_SERVER_PROTOCOL_NORMALIZER] = previousServerProtocolNormalizer
    }
    if (previousStreamPending === undefined) delete globalRecord[RUE_SSR_STREAM_PENDING_KEY]
    else globalRecord[RUE_SSR_STREAM_PENDING_KEY] = previousStreamPending
    leaveServerDOMAdapterScope()
  }

  try {
    const value =
      typeof input === 'function'
        ? createCompiledComponent(input as ComponentInstance<any>, options.props ?? null)
        : input
    appendNormalizedServerChild(
      adapter.root,
      normalizeServerProtocolRenderable(createFreshServerRenderable(value)),
    )
    await flushServerRenderMicrotasks()
    const shell = serializeServerNodeChildren(adapter.root, options)
    const encoder = new TextEncoder()
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(shell))
        try {
          for (let pass = 0; pass < 8; pass += 1) {
            const pending = globalRecord[RUE_SSR_STREAM_PENDING_KEY] as
              | PromiseLike<unknown>[]
              | undefined
            if (!pending?.length) break
            globalRecord[RUE_SSR_STREAM_PENDING_KEY] = []
            await Promise.all(pending)
            await flushServerRenderMicrotasks()
          }
          const finalHtml = serializeServerNodeChildren(adapter.root, options)
          if (finalHtml !== shell) controller.enqueue(encoder.encode(finalHtml))
          controller.close()
        } catch (error) {
          controller.error(error)
        } finally {
          await cleanup()
        }
      },
    })
  } catch (error) {
    await cleanup()
    throw error
  }
}

/** Run arbitrary server-side renderable creation with a ServerDOMAdapter installed. */
export const runWithServerDOMAdapter = async <T>(runner: () => T | Promise<T>): Promise<T> => {
  const adapter = new ServerDOMAdapter()
  const leaveServerDOMAdapterScope = enterServerDOMAdapterScope(adapter)

  try {
    return await runner()
  } finally {
    leaveServerDOMAdapterScope()
  }
}
