import { createOwner, disposeOwner, effect, onOwnerCleanup } from './internal-reactive'
import type { CompiledSlotFactory } from './compiler-runtime/mount'
import { _$createComponent } from './compiled-component-call'
import { _$compiledRoot, type CompiledRootHandle } from './compiled-root'
import {
  appendChild as appendDomChild,
  createComment,
  createDocumentFragment,
  createTextNode,
} from './compiler-runtime/dom.browser'
import { isHydrationStagingActive, markHydrationStaging } from './compiler-runtime/dom.hydrate'
import { getCompiledKey } from './compiled-legacy-dom'
import { unwrapDisplayRef } from './display-value'
import {
  RUE_ISLAND_ELEMENT,
  RUE_ISLAND_PROPS_SCRIPT_TYPE,
  RUE_SERVER_ISLAND_SSR_BRIDGE,
  RUE_SERVER_COMPILED_VALUE_SNAPSHOT,
  isRueIslandDescriptor,
  isRueServerIslandDescriptor,
  serializeIslandProps,
  type RueIslandDescriptor,
} from './island-protocol'

const isCompiledRoot = (value: unknown): value is CompiledRootHandle =>
  value != null &&
  typeof value === 'object' &&
  typeof (value as CompiledRootHandle).__rue_compiled_mount === 'function'

type AnchorMount = {
  values: unknown[]
  entries: Array<{ handle: CompiledRootHandle; nodes: Node[] }>
}

const anchorMounts = new WeakMap<Node, AnchorMount>()

type AnchorDisplayEffect = {
  source: unknown
  dispose(): void
}

const anchorDisplayEffects = new WeakMap<Node, AnchorDisplayEffect>()

const containsDisplayRef = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsDisplayRef)
  return (
    ((typeof value === 'object' && value !== null) || typeof value === 'function') &&
    Reflect.get(value, '__rue_ref__') === true
  )
}

const disposeAnchorEntry = (entry: AnchorMount['entries'][number]): void => {
  entry.handle.dispose()
  for (const node of entry.nodes) {
    const mountedNode =
      (node as Node & { __rue_hydrated_adopted_target?: Node }).__rue_hydrated_adopted_target ??
      node
    const nested = anchorMounts.get(node) ?? anchorMounts.get(mountedNode)
    if (nested != null) {
      nested.entries.forEach(disposeAnchorEntry)
      anchorMounts.delete(node)
      anchorMounts.delete(mountedNode)
    }
    mountedNode.parentNode?.removeChild(mountedNode)
  }
}

const COMPONENT_FACTORY_KEY = '__rue_compiled_component_factory__'
const SERVER_PROTOCOL_NORMALIZER = Symbol.for('rue.server.protocol-normalizer')
const COMPONENT_READ_PROPS_KEY = '__rue_compiled_component_read_props__'
const COMPONENT_UPDATE_PROPS_KEY = '__rue_compiled_update_props__'

type CompiledThenableState =
  | { status: 'pending'; promise: Promise<unknown> }
  | { status: 'resolved'; value: unknown }
  | { status: 'rejected'; reason: unknown }

const compiledThenableStates = new WeakMap<PromiseLike<unknown>, CompiledThenableState>()

/** Preserve the active server value normalizer for asynchronously resumed rendering. */
export const captureServerProtocolNormalizer = <Args extends unknown[], T>(
  run: (...args: Args) => T,
): ((...args: Args) => T) => {
  const globals = globalThis as Record<PropertyKey, unknown>
  const captured = globals[SERVER_PROTOCOL_NORMALIZER]
  if (typeof captured !== 'function') return run
  return (...args: Args) => {
    const previous = globals[SERVER_PROTOCOL_NORMALIZER]
    globals[SERVER_PROTOCOL_NORMALIZER] = captured
    try {
      return run(...args)
    } finally {
      if (previous === undefined) delete globals[SERVER_PROTOCOL_NORMALIZER]
      else globals[SERVER_PROTOCOL_NORMALIZER] = previous
    }
  }
}

const replayCompiledComponent = (
  mounted: CompiledRootHandle,
  candidate: CompiledRootHandle,
): boolean => {
  if (mounted === candidate) return true
  const current = mounted as unknown as Record<string, unknown>
  const next = candidate as unknown as Record<string, unknown>
  if (
    current[COMPONENT_FACTORY_KEY] == null ||
    current[COMPONENT_FACTORY_KEY] !== next[COMPONENT_FACTORY_KEY]
  ) {
    return false
  }
  const update = current[COMPONENT_UPDATE_PROPS_KEY]
  const read = next[COMPONENT_READ_PROPS_KEY]
  if (typeof update !== 'function' || typeof read !== 'function') return false
  ;(update as (props: unknown) => void)((read as () => unknown)())
  candidate.dispose()
  return true
}

const anchorValues = (value: unknown): unknown[] => {
  const displayed = unwrapDisplayRef(value)
  return Array.isArray(displayed) ? displayed.flatMap(anchorValues) : [displayed]
}

const mountPortableComponent = (
  value: unknown,
  parent: ParentNode,
): Array<() => void> | undefined => {
  if (value == null || typeof value !== 'object' || !('__rue_component_type' in value)) {
    return undefined
  }
  const record = value as Record<string, unknown>
  const component = record.__rue_component_type
  if (typeof component !== 'string' && typeof component !== 'function') {
    throw new TypeError('[rue] portable component type must be a tag string or component factory')
  }
  const props =
    record.props != null && typeof record.props === 'object'
      ? (record.props as Record<string, unknown>)
      : {}
  const handle = _$createComponent(component as any, props)
  if (isHydrationStagingActive()) {
    handle.__rue_compiled_mount(parent)
    return [() => handle.dispose()]
  }
  const container = document.createElement('span')
  container.style.display = 'contents'
  parent.appendChild(container)
  try {
    const result = handle.__rue_compiled_mount(container)
    if (result != null && result.parentNode !== container) container.appendChild(result)
  } catch (error) {
    handle.dispose()
    container.remove()
    throw error
  }
  return [
    () => {
      handle.dispose()
      container.remove()
    },
  ]
}

const mountLegacyHandle = (value: unknown, parent: ParentNode): Array<() => void> | undefined => {
  if (
    value == null ||
    typeof value !== 'object' ||
    !('__rue_runtime_setup_handle' in value || '__rue_mount_id' in value)
  ) {
    return undefined
  }
  const bridge = (
    globalThis as typeof globalThis & {
      __rue_mount_legacy_handle_for_compiled__?: (value: unknown, parent: ParentNode) => void
    }
  ).__rue_mount_legacy_handle_for_compiled__
  if (typeof bridge !== 'function') return undefined

  const previous = new Set(Array.from(parent.childNodes))
  bridge(value, parent)
  const mounted = Array.from(parent.childNodes).filter(node => !previous.has(node))
  return [
    () => {
      for (const node of mounted) {
        node.parentNode?.removeChild(node)
      }
    },
  ]
}

const mountIslandDescriptor = (
  descriptor: RueIslandDescriptor,
  parent: ParentNode,
): Array<() => void> => {
  const strategy = descriptor.metadata.hydrate ?? 'load'
  if (strategy === 'none') {
    return appendValue(_$createComponent(descriptor.component, descriptor.props), parent)
  }

  const document = parent.ownerDocument ?? globalThis.document
  if (document == null) throw new Error('A Rue island descriptor requires a document')
  const island = document.createElement(RUE_ISLAND_ELEMENT)
  const attributes: Record<string, string | undefined> = {
    'data-rue-id': descriptor.metadata.id,
    'data-rue-component': descriptor.metadata.component,
    'data-rue-entry': descriptor.metadata.entry,
    'data-rue-export': descriptor.metadata.exportName,
    'data-rue-hydrate': strategy,
    'data-rue-media': descriptor.metadata.media,
    'data-rue-interaction': Array.isArray(descriptor.metadata.interaction)
      ? descriptor.metadata.interaction.join(',')
      : descriptor.metadata.interaction,
    'data-rue-timeout':
      descriptor.metadata.timeout === undefined ? undefined : String(descriptor.metadata.timeout),
    'data-rue-root-margin': descriptor.metadata.rootMargin,
  }
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== undefined) island.setAttribute(name, value)
  }

  const content =
    strategy === 'only'
      ? descriptor.fallback
      : _$createComponent(descriptor.component, descriptor.props)
  const contentDisposers = content === undefined ? [] : appendValue(content, island)
  const propsScript = document.createElement('script')
  propsScript.type = RUE_ISLAND_PROPS_SCRIPT_TYPE
  propsScript.setAttribute('data-rue-props', descriptor.metadata.id)
  propsScript.textContent = serializeIslandProps(descriptor.props)
  island.appendChild(propsScript)
  parent.appendChild(island)

  return [
    () => {
      contentDisposers.reverse().forEach(dispose => dispose())
      island.parentNode?.removeChild(island)
    },
  ]
}

const cloneServerLikeNode = (value: Record<string, any>, document: Document): Node => {
  if (value.nodeType === 3) return document.createTextNode(String(value.textContent ?? ''))
  if (value.nodeType === 8) return document.createComment(String(value.data ?? ''))
  if (value.nodeType === 11 || value.transparent === true) {
    const fragment = document.createDocumentFragment()
    for (const child of Array.from(value.childNodes ?? [])) {
      fragment.appendChild(cloneServerLikeNode(child as Record<string, any>, document))
    }
    return fragment
  }
  const element = document.createElement(String(value.tagName ?? 'div'))
  if (value.attributes instanceof Map) {
    value.attributes.forEach((attributeValue: unknown, name: string) => {
      element.setAttribute(name, String(attributeValue))
    })
  }
  if (value.rawInnerHTML != null) {
    element.innerHTML = String(value.rawInnerHTML)
  } else {
    for (const child of Array.from(value.childNodes ?? [])) {
      element.appendChild(cloneServerLikeNode(child as Record<string, any>, document))
    }
  }
  return element
}

const appendValue = (value: unknown, parent: ParentNode): Array<() => void> => {
  const displayed = unwrapDisplayRef(value)
  if (displayed !== value) return appendValue(displayed, parent)
  if (value == null || value === false || value === true) return []
  if (isRueServerIslandDescriptor(value)) {
    const bridge = (globalThis as Record<PropertyKey, unknown>)[RUE_SERVER_ISLAND_SSR_BRIDGE]
    if (typeof bridge !== 'function') {
      throw new Error('[rue] server island descriptor requires an active SSR bridge')
    }
    return appendValue((bridge as (descriptor: unknown) => unknown)(value), parent)
  }
  if (isCompiledRoot(value)) {
    const handle =
      typeof value.__rue_compiled_mountable === 'function' && !value.__rue_compiled_mountable()
        ? value.__rue_compiled_clone()
        : value
    const result = handle.__rue_compiled_mount(parent)
    if (result != null && result.parentNode !== parent) parent.appendChild(result)
    return [() => handle.dispose()]
  }
  const isBrowserNode = typeof Node !== 'undefined' && value instanceof Node
  if (
    !isBrowserNode &&
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Node).nodeType === 'number'
  ) {
    if (typeof Node === 'undefined' || !(parent instanceof Node)) {
      const node = value as Node
      appendDomChild(parent as Node, node)
      return [
        () => {
          if (node.parentNode === parent) parent.removeChild(node)
        },
      ]
    }
    return appendValue(
      cloneServerLikeNode(value as Record<string, any>, parent.ownerDocument ?? document),
      parent,
    )
  }
  if (isBrowserNode) {
    const node = value as Node
    parent.appendChild(node)
    return [
      () => {
        if (node.parentNode === parent) parent.removeChild(node)
      },
    ]
  }
  if (Array.isArray(value)) return value.flatMap(item => appendValue(item, parent))
  if (typeof value === 'function') {
    if (value.length >= 2) {
      const anchor = createComment('rue:compiled-slot')
      appendDomChild(parent, anchor)
      const owner = createOwner()
      const block = (value as CompiledSlotFactory)({ parent, before: anchor }, {}, owner)
      return [
        () => {
          block.dispose()
          disposeOwner(owner)
          anchor.parentNode?.removeChild(anchor)
        },
      ]
    }
    return appendValue((value as () => unknown)(), parent)
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    const text = createTextNode(String(value))
    appendDomChild(parent, text)
    return [
      () => {
        text.parentNode?.removeChild(text)
      },
    ]
  }
  if (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  ) {
    const thenable = value as PromiseLike<unknown>
    const existing = compiledThenableStates.get(thenable)
    if (existing?.status === 'resolved') return appendValue(existing.value, parent)
    if (existing?.status === 'rejected') throw existing.reason
    if (existing?.status === 'pending') throw existing.promise
    const promise = Promise.resolve(thenable).then(
      resolved => {
        compiledThenableStates.set(thenable, { status: 'resolved', value: resolved })
        return resolved
      },
      reason => {
        compiledThenableStates.set(thenable, { status: 'rejected', reason })
        throw reason
      },
    )
    compiledThenableStates.set(thenable, { status: 'pending', promise })
    throw promise
  }
  if (isRueIslandDescriptor(value)) return mountIslandDescriptor(value, parent)
  if ((typeof value === 'object' || typeof value === 'function') && value !== null) {
    const normalize = (globalThis as Record<PropertyKey, unknown>)[SERVER_PROTOCOL_NORMALIZER]
    if (typeof normalize === 'function') {
      const normalized = (normalize as (input: unknown) => unknown)(value)
      if (normalized !== value) return appendValue(normalized, parent)
    }
  }
  const portableDisposers = mountPortableComponent(value, parent)
  if (portableDisposers) return portableDisposers
  const legacyDisposers = mountLegacyHandle(value, parent)
  if (legacyDisposers) return legacyDisposers
  const shape = value && typeof value === 'object' ? Object.keys(value).join(',') : typeof value
  throw new Error(`[rue] compiled value is not mountable (${shape})`)
}

export const _$compiledValue = (value: unknown): CompiledRootHandle => {
  const root = _$compiledRoot(parent => {
    if (parent == null) throw new Error('A compiled value requires a mount parent')
    const fragment = createDocumentFragment(parent)
    const disposers = appendValue(value, fragment)
    const first = fragment.firstChild
    parent.appendChild(fragment)
    onOwnerCleanup(() => disposers.reverse().forEach(dispose => dispose()))
    return first
  })
  Object.defineProperty(root, RUE_SERVER_COMPILED_VALUE_SNAPSHOT, {
    configurable: true,
    enumerable: false,
    value,
  })
  return root
}

const renderAnchorValue = (value: unknown, parent: ParentNode, anchor: Node | null): void => {
  const adoptedParent = (parent as ParentNode & { __rue_hydrated_adopted_target?: ParentNode })
    .__rue_hydrated_adopted_target
  const redirectedHydrationParent = adoptedParent != null && adoptedParent !== parent
  parent = adoptedParent ?? parent
  const hydrationAdoptedParent =
    redirectedHydrationParent ||
    (parent as ParentNode & { __rue_hydrated_adopted?: boolean }).__rue_hydrated_adopted === true
  anchor =
    anchor == null
      ? null
      : ((anchor as Node & { __rue_hydrated_adopted_target?: Node })
          .__rue_hydrated_adopted_target ?? anchor)
  if (anchor != null && anchor.parentNode == null) {
    const detachedMount = anchorMounts.get(anchor)
    if (
      detachedMount != null &&
      detachedMount.entries.every(entry =>
        entry.nodes.every(node => {
          const mountedNode =
            (node as Node & { __rue_hydrated_adopted_target?: Node })
              .__rue_hydrated_adopted_target ?? node
          return mountedNode.parentNode == null
        }),
      )
    )
      return
  }
  if (
    anchor != null &&
    anchor.parentNode !== parent &&
    anchor.parentNode != null &&
    parent.nodeType !== 11
  )
    return
  const renderParent = (anchor?.parentNode as ParentNode | null) ?? parent
  const insertionAnchor = anchor?.parentNode === renderParent ? anchor : null
  const mountKey = insertionAnchor ?? (renderParent instanceof Node ? renderParent : null)
  const previous = mountKey == null ? undefined : anchorMounts.get(mountKey)
  if (hydrationAdoptedParent && insertionAnchor != null && previous != null) {
    const trackedNodes = new Set(previous.entries.flatMap(entry => entry.nodes))
    let candidate = insertionAnchor.previousSibling
    while (candidate != null && candidate.nodeType !== Node.COMMENT_NODE) {
      const before = candidate.previousSibling
      if (!trackedNodes.has(candidate) && candidate.parentNode) {
        candidate.parentNode.removeChild(candidate)
      }
      candidate = before
    }
  }
  if (previous == null && insertionAnchor != null) {
    const pairedSSRNode = insertionAnchor.previousSibling as
      | (Node & { __rue_hydrated_adopted?: boolean })
      | null
    if (
      pairedSSRNode != null &&
      (hydrationAdoptedParent || pairedSSRNode.__rue_hydrated_adopted === true)
    ) {
      pairedSSRNode.parentNode?.removeChild(pairedSSRNode)
    }
  }
  const values = anchorValues(value)
  if (
    previous &&
    previous.values.length === values.length &&
    previous.values.every((entry, index) => Object.is(entry, values[index]))
  )
    return

  const claimedPrevious = new Set<number>()
  const entries = values.map((entry, index) => {
    const key = getCompiledKey(entry)
    const retainedIndex =
      previous == null
        ? -1
        : key !== undefined
          ? previous.values.findIndex(
              (candidate, candidateIndex) =>
                !claimedPrevious.has(candidateIndex) && Object.is(getCompiledKey(candidate), key),
            )
          : !claimedPrevious.has(index) && Object.is(previous.values[index], entry)
            ? index
            : -1
    const retained = retainedIndex < 0 ? undefined : previous?.entries[retainedIndex]
    if (retained != null) {
      claimedPrevious.add(retainedIndex)
      const candidate = isCompiledRoot(entry) ? entry : undefined
      if (candidate == null || !replayCompiledComponent(retained.handle, candidate)) {
        candidate?.dispose()
      }
      return retained
    }
    const candidate = isCompiledRoot(entry) ? entry : undefined
    const previousEntry = key === undefined ? previous?.entries[index] : undefined
    if (candidate && previousEntry && replayCompiledComponent(previousEntry.handle, candidate)) {
      claimedPrevious.add(index)
      return previousEntry
    }
    const source = isCompiledRoot(entry) ? entry : _$compiledValue(entry)
    const handle =
      typeof source.__rue_compiled_mountable === 'function' &&
      !source.__rue_compiled_mountable() &&
      typeof source.__rue_compiled_clone === 'function'
        ? source.__rue_compiled_clone()
        : source
    const staging = createDocumentFragment(renderParent)
    markHydrationStaging(staging)
    const result = handle.__rue_compiled_mount(staging)
    if (
      result != null &&
      typeof result === 'object' &&
      'nodeType' in result &&
      result.parentNode !== staging
    ) {
      staging.appendChild(result)
    }
    const nodes = Array.from(staging.childNodes)
    renderParent.insertBefore(staging, insertionAnchor)
    return { handle, nodes }
  })
  previous?.entries.forEach((entry, index) => {
    if (!claimedPrevious.has(index)) disposeAnchorEntry(entry)
  })
  for (const entry of entries) {
    for (const node of entry.nodes) {
      if (node.parentNode === renderParent) renderParent.insertBefore(node, insertionAnchor)
    }
  }
  const current = { values, entries }
  if (mountKey != null) anchorMounts.set(mountKey, current)
  onOwnerCleanup(() => {
    if (mountKey == null || anchorMounts.get(mountKey) === current) {
      entries.forEach(disposeAnchorEntry)
      if (mountKey != null) anchorMounts.delete(mountKey)
    }
  })
}

/** Mount one closed compiler value before an anchor. */
export const renderAnchor = (value: unknown, parent: ParentNode, anchor: Node | null): void => {
  const displayEffectKey =
    anchor ?? (typeof Node !== 'undefined' && parent instanceof Node ? parent : null)
  const previousDisplayEffect =
    displayEffectKey == null ? undefined : anchorDisplayEffects.get(displayEffectKey)

  if (previousDisplayEffect?.source === value) return
  previousDisplayEffect?.dispose()
  if (displayEffectKey != null) anchorDisplayEffects.delete(displayEffectKey)

  if (!containsDisplayRef(value)) {
    renderAnchorValue(value, parent, anchor)
    return
  }

  const handle = effect(() => renderAnchorValue(value, parent, anchor))
  const current: AnchorDisplayEffect = { source: value, dispose: () => handle.dispose() }
  if (displayEffectKey != null) anchorDisplayEffects.set(displayEffectKey, current)
  onOwnerCleanup(() => {
    current.dispose()
    if (displayEffectKey != null && anchorDisplayEffects.get(displayEffectKey) === current) {
      anchorDisplayEffects.delete(displayEffectKey)
    }
  })
}

;(
  globalThis as typeof globalThis & {
    __rue_render_compiled_text_value__?: (
      node: { textContent: string | null },
      value: unknown,
    ) => void
  }
).__rue_render_compiled_text_value__ = (node, value) => {
  if (!(node instanceof Node) || node.parentNode == null) return
  node.textContent = ''
  renderAnchor(value, node.parentNode, node)
}
