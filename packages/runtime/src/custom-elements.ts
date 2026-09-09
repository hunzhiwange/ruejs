/*
自定义元素包装概述
- 目标：把 Rue 组件包装为原生 Custom Element，便于通过 customElements.define 注册。
- 挂载策略：每个宿主元素维护独立的 useApp 实例，在 connected/disconnected 生命周期里挂载与卸载。
- 更新策略：属性变化与 props bag 变化同步到同一个响应式 props 容器，并合并同一微任务内的内部子树更新。
- 样式策略：支持把内联样式注入到 shadow root 或 light DOM 宿主，覆盖最小可用场景。
*/
import { getCurrentContainer, type ComponentInstance } from './rue'
import {
  _$compiledBranch,
  _$compiledComponent,
  type CompiledComponentFactory,
} from './compiled-component'
import { _$compiledRoot } from './compiled-root'
import { onOwnerCleanup } from './internal-reactive'
import { getCurrentInstance, ref } from './reactivity'
import { useSetup } from './compiler-runtime/hooks'
import { appendChild, createComment, createElement as createDomElement } from './dom'
import {
  CUSTOM_ELEMENT_EMIT_BRIDGE_KEY,
  CUSTOM_ELEMENT_SYNC_PROPS_KEY,
  type CustomElementEmitBridge,
} from './custom-elements.shared'
import { linkCurrentOwnerToParentContextProps, preserveParentContextProps } from './context'
import { useApp } from './hooks/useApp'

void appendChild
void createComment

/** useCustomElement 的包装配置。 */
export interface CustomElementsOptions {
  /** 需要注入到 shadow root 或 host 的样式文本。 */
  styles?: string[]
  /** 自定义元素创建内部 app 后的配置回调，可安装插件或注册组件。 */
  configureApp?: (app: ReturnType<typeof useApp>) => void
  /** 是否使用 shadow root 承载组件，默认 true。 */
  shadowRoot?: boolean
  /** 注入 style 标签时使用的 CSP nonce。 */
  nonce?: string
}

/** Rue 自定义元素实例，额外暴露 props bag。 */
export interface RueCustomElement<P = Record<string, unknown>> extends HTMLElement {
  /** 外部可批量设置的 props 对象，会与 attribute / own property 合并。 */
  props: Partial<P>
}

/** useCustomElement 返回的 Custom Element 构造器。 */
export type RueCustomElementConstructor<P = Record<string, unknown>> = {
  new (): RueCustomElement<P>
}

type CustomElementComponent<P = Record<string, unknown>> =
  | ComponentInstance<P>
  | {
      setup?: (props: Partial<P>) => any
      render?: (ctx: any) => ReturnType<CompiledComponentFactory<any>>
    }

const INTERNAL_ATTRIBUTES = new Set(['data-rue-app'])

type CustomElementMountTarget = ShadowRoot | HTMLElement
type ActiveCustomElementContext = {
  host: HTMLElement
  shadowRoot: ShadowRoot | null
}

const appByHost = new WeakMap<HTMLElement, ReturnType<typeof useApp>>()
const observerByHost = new WeakMap<HTMLElement, MutationObserver>()
const propsByHost = new WeakMap<HTMLElement, Record<string, unknown>>()
const propsStateByHost = new WeakMap<HTMLElement, Record<string, unknown>>()
const propsVersionByHost = new WeakMap<HTMLElement, { value: number }>()
const pendingPropsVersionHosts = new WeakSet<HTMLElement>()
const targetByHost = new WeakMap<HTMLElement, CustomElementMountTarget>()
const hostByContainer = new WeakMap<object, HTMLElement>()
const shadowRootByContainer = new WeakMap<object, ShadowRoot>()
const activeCustomElementContexts: ActiveCustomElementContext[] = []
let lastCustomElementContext: ActiveCustomElementContext | null = null

const getActiveCustomElementContext = () => {
  if (activeCustomElementContexts.length > 0) {
    return activeCustomElementContexts[activeCustomElementContexts.length - 1]
  }
  return lastCustomElementContext
}

const withActiveCustomElementContext = <T>(
  context: ActiveCustomElementContext,
  runner: () => T,
) => {
  lastCustomElementContext = context
  activeCustomElementContexts.push(context)
  try {
    return runner()
  } finally {
    activeCustomElementContexts.pop()
  }
}

const resolveContainerHost = (container: unknown): HTMLElement | null => {
  if (!container || typeof container !== 'object') {
    return null
  }
  if (typeof ShadowRoot !== 'undefined' && container instanceof ShadowRoot) {
    return container.host as HTMLElement
  }
  if (container instanceof HTMLElement) {
    if (container.tagName.includes('-')) {
      return container
    }
    const root = container.getRootNode?.()
    if (typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot) {
      return root.host as HTMLElement
    }
  }
  return hostByContainer.get(container as object) ?? null
}

const resolveContainerShadowRoot = (container: unknown): ShadowRoot | null => {
  if (!container || typeof container !== 'object') {
    return null
  }
  if (typeof ShadowRoot !== 'undefined' && container instanceof ShadowRoot) {
    return container
  }
  if (container instanceof HTMLElement) {
    const root = container.getRootNode?.()
    if (typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot) {
      return root
    }
    return container.shadowRoot ?? null
  }
  return shadowRootByContainer.get(container as object) ?? null
}

/** 获取当前自定义元素宿主；不在自定义元素上下文中时尝试从当前容器反查。 */
export const useHost = (): HTMLElement | null => {
  const activeContext = getActiveCustomElementContext()
  if (activeContext) {
    return activeContext.host
  }
  return resolveContainerHost(getCurrentContainer())
}

/** 获取当前自定义元素的 shadow root；light DOM 模式下返回 null。 */
export const useShadowRoot = (): ShadowRoot | null => {
  const activeContext = getActiveCustomElementContext()
  if (activeContext) {
    return activeContext.shadowRoot
  }
  return resolveContainerShadowRoot(getCurrentContainer())
}

const queueTask = (fn: () => void) => {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(fn)
    return
  }
  Promise.resolve().then(fn)
}

const camelizeAttribute = (name: string) =>
  name.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase())

const readAttributeProps = (host: HTMLElement) => {
  const props: Record<string, unknown> = {}
  for (const name of host.getAttributeNames()) {
    if (INTERNAL_ATTRIBUTES.has(name)) continue
    props[camelizeAttribute(name)] = host.getAttribute(name)
  }
  return props
}

const readOwnPropertyProps = (host: HTMLElement) => {
  const props: Record<string, unknown> = {}
  const hostRecord = host as unknown as Record<string, unknown>
  for (const key of Object.keys(host)) {
    props[key] = hostRecord[key]
  }
  return props
}

const normalizePropsBag = <P>(value: Partial<P> | null | undefined) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as Record<string, unknown>
  }
  return { ...(value as Record<string, unknown>) }
}

const collectInputProps = (host: HTMLElement) => ({
  ...readAttributeProps(host),
  ...readOwnPropertyProps(host),
  ...propsByHost.get(host),
})

const createCustomElementEmitBridge = (host: HTMLElement): CustomElementEmitBridge => {
  return (eventName, args) => {
    host.dispatchEvent(
      new CustomEvent(eventName, {
        detail: args,
        bubbles: true,
        composed: true,
      }),
    )
  }
}

const createReactivePropsState = (host: HTMLElement) => {
  const initialState: Record<string, unknown> = {}
  Object.defineProperty(initialState, CUSTOM_ELEMENT_EMIT_BRIDGE_KEY, {
    configurable: true,
    enumerable: true,
    value: createCustomElementEmitBridge(host),
  })
  return initialState
}

const getPropsBag = <P>(host: HTMLElement) => (propsByHost.get(host) ?? {}) as Partial<P>

const setPropsBag = <P>(host: HTMLElement, value: Partial<P> | null | undefined) => {
  propsByHost.set(host, normalizePropsBag(value))
}

const getPropsState = <P>(host: HTMLElement) =>
  (propsStateByHost.get(host) ?? null) as Partial<P> | null

const setPropsState = (host: HTMLElement, state: Record<string, unknown> | null) => {
  if (state) {
    propsStateByHost.set(host, state)
    return
  }
  propsStateByHost.delete(host)
}

const setPropsVersion = (host: HTMLElement, version: { value: number } | null) => {
  if (version) {
    propsVersionByHost.set(host, version)
    return
  }
  propsVersionByHost.delete(host)
}

const bumpPropsVersion = (host: HTMLElement) => {
  const version = propsVersionByHost.get(host)
  if (!version || pendingPropsVersionHosts.has(host)) return
  pendingPropsVersionHosts.add(host)
  queueTask(() => {
    pendingPropsVersionHosts.delete(host)
    const currentVersion = propsVersionByHost.get(host)
    if (currentVersion) currentVersion.value += 1
  })
}

const syncPropsState = (host: HTMLElement) => {
  const state = propsStateByHost.get(host)
  if (!state) {
    return
  }
  const nextProps = collectInputProps(host)
  const keys = new Set([...Object.keys(state), ...Object.keys(nextProps)])
  let changed = false
  for (const key of keys) {
    if (key === CUSTOM_ELEMENT_EMIT_BRIDGE_KEY) {
      continue
    }
    const nextValue = key in nextProps ? nextProps[key] : undefined
    if (!Object.is(state[key], nextValue)) {
      state[key] = nextValue
      changed = true
    }
  }
  if (changed) {
    bumpPropsVersion(host)
  }
}

const getApp = (host: HTMLElement) => appByHost.get(host) ?? null

const setApp = (host: HTMLElement, app: ReturnType<typeof useApp> | null) => {
  if (app) {
    appByHost.set(host, app)
    return
  }
  appByHost.delete(host)
}

const getObserver = (host: HTMLElement) => observerByHost.get(host) ?? null

const setObserver = (host: HTMLElement, observer: MutationObserver | null) => {
  if (observer) {
    observerByHost.set(host, observer)
    return
  }
  observerByHost.delete(host)
}

const setMountTarget = (host: HTMLElement, target: CustomElementMountTarget) => {
  targetByHost.set(host, target)
  hostByContainer.set(host as object, host)
  hostByContainer.set(target as object, host)
  if (target instanceof ShadowRoot) {
    shadowRootByContainer.set(host as object, target)
    shadowRootByContainer.set(target as object, target)
    return
  }
  shadowRootByContainer.delete(host as object)
  shadowRootByContainer.delete(target as object)
}

const clearMountTarget = (host: HTMLElement) => {
  const target = targetByHost.get(host)
  if (!target) {
    return
  }
  hostByContainer.delete(host as object)
  hostByContainer.delete(target as object)
  shadowRootByContainer.delete(host as object)
  shadowRootByContainer.delete(target as object)
  targetByHost.delete(host)
}

const createMountTarget = (host: HTMLElement, useShadowRoot: boolean): ShadowRoot | HTMLElement => {
  if (!useShadowRoot) {
    return host
  }
  return host.shadowRoot ?? host.attachShadow({ mode: 'open' })
}

const removeInjectedStyles = (target: ShadowRoot | HTMLElement) => {
  target.querySelectorAll('style[data-rue-ce-style]').forEach(style => style.remove())
}

const injectStyles = (
  target: ShadowRoot | HTMLElement,
  styles: readonly string[] | undefined,
  nonce: string | undefined,
) => {
  removeInjectedStyles(target)
  if (!styles?.length) return
  for (const styleText of styles) {
    const style = document.createElement('style')
    style.setAttribute('data-rue-ce-style', '')
    if (nonce) {
      style.setAttribute('nonce', nonce)
    }
    style.textContent = styleText
    target.appendChild(style)
  }
}

const shouldIgnoreAttributeMutation = (record: MutationRecord) =>
  record.type === 'attributes' &&
  record.attributeName != null &&
  INTERNAL_ATTRIBUTES.has(record.attributeName)

/** 将 Rue 组件包装成原生 Custom Element 构造器。 */
export function useCustomElement<P = Record<string, unknown>>(
  component: CustomElementComponent<P>,
  options: CustomElementsOptions = {},
): RueCustomElementConstructor<P> {
  const { shadowRoot = true, styles, configureApp, nonce } = options

  const ResolvedComponent =
    typeof component === 'function'
      ? (component as ComponentInstance<any>)
      : (props: Partial<P>) => {
          const ctx =
            typeof component.setup === 'function' ? useSetup(() => component.setup!(props)) : props
          return typeof component.render === 'function'
            ? component.render(ctx)
            : _$compiledRoot(() => null)
        }

  const mountHost = (host: HTMLElement) => {
    const parentContextInstance =
      (host as unknown as Record<string, unknown>).__rue_context_parent_instance__ ??
      getCurrentInstance()
    const target = createMountTarget(host, shadowRoot)
    const customElementContext: ActiveCustomElementContext = {
      host,
      shadowRoot: target instanceof ShadowRoot ? target : null,
    }
    const propsState = createReactivePropsState(host)
    const propsVersion = ref(0)
    setPropsState(host, propsState)
    setPropsVersion(host, propsVersion)
    syncPropsState(host)
    setMountTarget(host, target)

    const ScopedResolvedComponent = (props: Record<string, unknown>) => {
      linkCurrentOwnerToParentContextProps(props)
      return withActiveCustomElementContext(customElementContext, () =>
        ResolvedComponent(props as Partial<P>),
      )
    }

    const readScopedProps = () => {
      const props = {
        ...(getPropsState<P>(host) ?? ({} as Partial<P>)),
      } as Record<string, unknown>
      if (parentContextInstance != null && props.__rue_context_parent_instance__ == null) {
        props.__rue_context_parent_instance__ = parentContextInstance
      }
      preserveParentContextProps(props)
      return props
    }

    const wrapper = (() =>
      _$compiledRoot(() => {
        const root = createDomElement('span') as HTMLElement
        root.style.display = 'contents'
        const component = _$compiledBranch(() => {
          const version = propsVersion.value
          return {
            __rue_compiled_branch_key: version,
            create: () =>
              _$compiledComponent(
                ScopedResolvedComponent as unknown as CompiledComponentFactory<
                  Record<string, unknown>
                >,
                readScopedProps,
              ),
          }
        })
        component.__rue_compiled_mount(root)
        onOwnerCleanup(() => component.dispose())
        return root as any
      })) as unknown as ComponentInstance

    const app = useApp(wrapper)
    configureApp?.(app)
    setApp(host, app)
    app.mount(target as any)
    queueTask(() => {
      if (!getApp(host)) {
        return
      }
      injectStyles(target, styles, nonce)
    })
  }

  const unmountHost = (host: HTMLElement) => {
    getApp(host)?.unmount()
    setApp(host, null)
    setPropsState(host, null)
    setPropsVersion(host, null)
    clearMountTarget(host)
  }

  const startObserver = (host: HTMLElement) => {
    if (typeof MutationObserver !== 'function') {
      return
    }
    getObserver(host)?.disconnect()
    const observer = new MutationObserver(records => {
      if (records.length > 0 && records.every(shouldIgnoreAttributeMutation)) {
        return
      }
      syncPropsState(host)
    })
    observer.observe(host, { attributes: true })
    setObserver(host, observer)
  }

  return class RueElement extends HTMLElement implements RueCustomElement<P> {
    constructor() {
      super()
      setPropsBag<P>(this, null)
    }

    get props() {
      return getPropsBag<P>(this)
    }

    set props(value: Partial<P>) {
      setPropsBag(this, value)
      syncPropsState(this)
    }

    [CUSTOM_ELEMENT_SYNC_PROPS_KEY]() {
      syncPropsState(this)
    }

    connectedCallback() {
      if (getApp(this)) {
        return
      }
      mountHost(this)
      startObserver(this)
    }

    disconnectedCallback() {
      getObserver(this)?.disconnect()
      setObserver(this, null)
      unmountHost(this)
    }
  }
}
