import {
  hydrateRoot as claimRoot,
  mountClaimRoot,
  type ClaimComponent,
  type HydrateRootOptions,
  type RueRootHandle,
} from './compiler-runtime/hydrate-claim'
import type { FC } from './runtime-types'
// The compiler turns source JSX factories into the private claim ABI.
export const hydrateRoot = claimRoot as typeof claimRoot &
  ((container: Element, component: FC<any>, options?: HydrateRootOptions) => RueRootHandle)
export type { HydrateRootOptions, RueRootHandle } from './compiler-runtime/hydrate-claim'
type ComponentProps = Record<string, any>
type RenderInput = ClaimComponent
type ComponentInstance = ClaimComponent | FC<any>
import {
  RUE_ISLAND_ELEMENT,
  RUE_ISLAND_PROPS_SCRIPT_TYPE,
  deserializeIslandProps,
  escapeIslandAttribute,
  serializeIslandProps,
  type RueIslandHtmlOptions,
  type RueIslandHydrationStrategy,
  type RueIslandManifest,
  type RueIslandManifestEntry,
} from './island-protocol'
export * from './island-protocol'
export interface RueIslandMountContext {
  island: Element
  props: ComponentProps
  manifest?: RueIslandManifestEntry
  strategy: RueIslandHydrationStrategy
  replayEvent?: Event
}

export interface RueIslandClientModule {
  default?: ComponentInstance
  Component?: ComponentInstance
  adopt?: boolean
  hydrate?: (island: Element, props: ComponentProps, context: RueIslandMountContext) => unknown
  mount?: (island: Element, props: ComponentProps, context: RueIslandMountContext) => unknown
}

export interface RueIslandLoaderOptions {
  root?: ParentNode
  manifest?: RueIslandManifest
  resolveModule?: (
    specifier: string,
    island: Element,
    manifest?: RueIslandManifestEntry,
  ) => Promise<RueIslandClientModule> | RueIslandClientModule
  hydrateRoot?: (
    container: Element,
    value: RenderInput,
    options?: HydrateRootOptions,
  ) => RueRootHandle | void
  onError?: (error: unknown, island: Element, manifest?: RueIslandManifestEntry) => void
}

export interface RueIslandLifecycleDetail {
  id: string
  strategy: RueIslandHydrationStrategy
}

const loadedIslandCleanups = new WeakMap<Element, () => void>()
const activeIslandLoaders = new WeakMap<ParentNode, () => void>()

let islandIdSeed = 0

export const createRueIslandId = (prefix = 'rue-island') => {
  islandIdSeed += 1
  return `${prefix}-${islandIdSeed.toString(36)}`
}

const renderAttrs = (attrs: Record<string, string | undefined>) =>
  Object.entries(attrs)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => ` ${key}="${escapeIslandAttribute(value)}"`)
    .join('')

export const createIslandContainerHtml = (options: RueIslandHtmlOptions) => {
  const hydrate = options.hydrate ?? 'load'
  const attrs = renderAttrs({
    'data-rue-id': options.id,
    'data-rue-component': options.component,
    'data-rue-entry': hydrate === 'none' ? undefined : options.entry,
    'data-rue-export': options.exportName,
    'data-rue-hydrate': hydrate,
    'data-rue-media': options.media,
    'data-rue-interaction': Array.isArray(options.interaction)
      ? options.interaction.join(',')
      : options.interaction,
    'data-rue-timeout': options.timeout === undefined ? undefined : String(options.timeout),
    'data-rue-root-margin': options.rootMargin,
  })
  const body = hydrate === 'only' ? (options.fallback ?? '') : (options.html ?? '')
  const propsScript =
    options.props === undefined || hydrate === 'none'
      ? ''
      : `<script type="${RUE_ISLAND_PROPS_SCRIPT_TYPE}" data-rue-props="${escapeIslandAttribute(
          options.id,
        )}">${serializeIslandProps(options.props)}</script>`

  return `<${RUE_ISLAND_ELEMENT}${attrs}>${body}${propsScript}</${RUE_ISLAND_ELEMENT}>`
}

const getIslandManifestEntry = (
  island: Element,
  manifest?: RueIslandManifest,
): RueIslandManifestEntry | undefined => {
  const id = island.getAttribute('data-rue-id')
  return id ? manifest?.[id] : undefined
}

const getIslandHydrationStrategy = (
  island: Element,
  manifest?: RueIslandManifestEntry,
): RueIslandHydrationStrategy => {
  const raw = manifest?.hydrate ?? island.getAttribute('data-rue-hydrate') ?? 'load'
  switch (raw) {
    case 'idle':
    case 'visible':
    case 'media':
    case 'interaction':
    case 'none':
    case 'only':
      return raw
    default:
      return 'load'
  }
}

const getIslandSpecifier = (island: Element, manifest?: RueIslandManifestEntry) =>
  manifest?.entry ??
  island.getAttribute('data-rue-entry') ??
  manifest?.component ??
  island.getAttribute('data-rue-component') ??
  ''

const getIslandPropsScript = (island: Element, manifest?: RueIslandManifestEntry) => {
  const id = island.getAttribute('data-rue-id') ?? manifest?.id
  const scripts = Array.from(
    island.querySelectorAll(`script[type="${RUE_ISLAND_PROPS_SCRIPT_TYPE}"][data-rue-props]`),
  )
  return scripts.find(script => !id || script.getAttribute('data-rue-props') === id) ?? null
}

const readIslandProps = (island: Element, manifest?: RueIslandManifestEntry): ComponentProps => {
  if (manifest?.props) {
    return deserializeIslandProps(manifest.props)
  }

  const script = getIslandPropsScript(island, manifest)
  if (!script?.textContent) {
    return {}
  }
  return deserializeIslandProps(script.textContent)
}

const defaultResolveModule = async (specifier: string) => {
  const load = new Function('specifier', 'return import(specifier)') as (
    value: string,
  ) => Promise<RueIslandClientModule>
  return load(specifier)
}

const cloneEventForReplay = (event: Event) => {
  const init = {
    bubbles: event.bubbles,
    cancelable: event.cancelable,
    composed: event.composed,
  }

  try {
    const EventCtor = (
      event as unknown as {
        constructor: new (type: string, init?: EventInit) => Event
      }
    ).constructor
    return new EventCtor(event.type, init)
  } catch {
    return new Event(event.type, init)
  }
}

const replayInteractionEvent = (island: Element, event: Event | undefined) => {
  if (!event) {
    return
  }

  queueMicrotask(() => {
    const target = event.target
    const clone = cloneEventForReplay(event)
    if (
      target &&
      typeof (target as EventTarget).dispatchEvent === 'function' &&
      (!('isConnected' in (target as Node)) || (target as Node).isConnected)
    ) {
      ;(target as EventTarget).dispatchEvent(clone)
      return
    }
    island.dispatchEvent(clone)
  })
}

export const mountRueIsland = async (
  island: Element,
  module: RueIslandClientModule,
  context: RueIslandMountContext,
  hydrateRootImpl: (
    container: Element,
    value: RenderInput,
    options?: HydrateRootOptions,
  ) => RueRootHandle | void = hydrateRoot,
) => {
  if (typeof module.mount === 'function') {
    return module.mount(island, context.props, context)
  }

  if (typeof module.hydrate === 'function' && context.strategy !== 'only') {
    return module.hydrate(island, context.props, context)
  }

  const component = (module.default ?? module.Component) as ClaimComponent | undefined
  if (typeof component !== 'function') {
    throw new TypeError('Rue island module must export a component, hydrate(), or mount().')
  }

  island.querySelector(':scope > script[data-rue-props]')?.remove()
  if (context.strategy === 'only') {
    island.replaceChildren()
    return mountClaimRoot(island, component, { props: context.props })
  }
  const handle = hydrateRootImpl(island, component, { props: context.props })
  if (handle) await handle.ready
  return handle
}

const onDocumentReady = (cb: () => void) => {
  if (typeof document === 'undefined' || document.readyState !== 'loading') {
    queueMicrotask(cb)
    return () => {}
  }

  document.addEventListener('DOMContentLoaded', cb, { once: true })
  return () => {
    document.removeEventListener('DOMContentLoaded', cb)
  }
}

const requestIdle = (cb: () => void, timeout?: number) => {
  const win = typeof window !== 'undefined' ? window : undefined
  const request = win?.requestIdleCallback
  const id = request
    ? request(cb, timeout === undefined ? undefined : { timeout })
    : setTimeout(cb, 1)
  return () => {
    if (request) {
      win?.cancelIdleCallback?.(id as number)
    } else {
      clearTimeout(id as number)
    }
  }
}

const scheduleVisible = (island: Element, cb: () => void, rootMargin?: string) => {
  const win = island.ownerDocument?.defaultView ?? (typeof window !== 'undefined' ? window : null)
  const Observer = win?.IntersectionObserver ?? globalThis.IntersectionObserver
  if (typeof Observer !== 'function') {
    cb()
    return () => {}
  }

  const observer = new Observer(
    entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect()
        cb()
      }
    },
    rootMargin ? { rootMargin } : undefined,
  )
  observer.observe(island)
  return () => {
    observer.disconnect()
  }
}

const scheduleMedia = (query: string | undefined, cb: () => void) => {
  const matchMedia =
    (typeof window !== 'undefined' ? window.matchMedia : undefined) ?? globalThis.matchMedia
  if (typeof matchMedia !== 'function' || !query) {
    cb()
    return () => {}
  }

  const list = matchMedia.call(typeof window !== 'undefined' ? window : globalThis, query)
  if (list.matches) {
    cb()
    return () => {}
  }

  const onChange = () => {
    if (!list.matches) {
      return
    }
    cleanup()
    cb()
  }
  const cleanup = () => {
    if (typeof list.removeEventListener === 'function') {
      list.removeEventListener('change', onChange)
    } else {
      list.removeListener(onChange)
    }
  }

  if (typeof list.addEventListener === 'function') {
    list.addEventListener('change', onChange)
  } else {
    list.addListener(onChange)
  }
  return cleanup
}

const parseInteractionEvents = (value: string | string[] | undefined) => {
  const events = Array.isArray(value) ? value : (value ?? 'click').split(',')
  return events.map(event => event.trim()).filter(Boolean)
}

const scheduleInteraction = (
  island: Element,
  events: string | string[] | undefined,
  cb: (event: Event) => void,
) => {
  const eventNames = parseInteractionEvents(events)
  if (eventNames.length === 0) {
    cb(new Event('click'))
    return () => {}
  }

  let active = true
  const onInteraction = (event: Event) => {
    if (!active) {
      return
    }
    cleanup()
    cb(event)
  }
  const cleanup = () => {
    active = false
    for (const eventName of eventNames) {
      island.removeEventListener(eventName, onInteraction)
    }
  }

  for (const eventName of eventNames) {
    island.addEventListener(eventName, onInteraction, { once: true })
  }
  return cleanup
}

const readNonNegativeNumberAttribute = (island: Element, name: string) => {
  const raw = island.getAttribute(name)
  if (raw == null || raw.trim() === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

const scheduleIslandHydration = (
  island: Element,
  strategy: RueIslandHydrationStrategy,
  manifest: RueIslandManifestEntry | undefined,
  hydrate: (event?: Event) => void,
) => {
  switch (strategy) {
    case 'idle':
      return requestIdle(
        () => hydrate(),
        manifest?.timeout ?? readNonNegativeNumberAttribute(island, 'data-rue-timeout'),
      )
    case 'visible':
      return scheduleVisible(
        island,
        () => hydrate(),
        manifest?.rootMargin ?? island.getAttribute('data-rue-root-margin') ?? undefined,
      )
    case 'media':
      return scheduleMedia(
        manifest?.media ?? island.getAttribute('data-rue-media') ?? undefined,
        () => hydrate(),
      )
    case 'interaction':
      return scheduleInteraction(
        island,
        manifest?.interaction ?? island.getAttribute('data-rue-interaction') ?? undefined,
        event => hydrate(event),
      )
    case 'none':
      island.setAttribute('data-rue-status', 'static')
      return () => {}
    default:
      return onDocumentReady(() => hydrate())
  }
}

const dispatchIslandLifecycleEvent = (
  island: Element,
  type: 'rue:before-hydrate' | 'rue:hydrate' | 'rue:error',
  detail: RueIslandLifecycleDetail,
) => {
  const EventConstructor = island.ownerDocument?.defaultView?.CustomEvent ?? globalThis.CustomEvent
  if (typeof EventConstructor !== 'function') return
  island.dispatchEvent(new EventConstructor(type, { bubbles: true, detail }))
}

const isIslandWithinRoot = (island: Element, root: ParentNode | undefined) => {
  if (!root) return island.isConnected
  if (root === island) return true
  return typeof (root as ParentNode & { contains?: (node: Node) => boolean }).contains ===
    'function'
    ? (root as ParentNode & { contains: (node: Node) => boolean }).contains(island)
    : island.isConnected
}

export const registerRueIsland = (
  island: Element,
  options: RueIslandLoaderOptions = {},
): (() => void) | undefined => {
  const existingCleanup = loadedIslandCleanups.get(island)
  if (existingCleanup) {
    return existingCleanup
  }

  const manifest = getIslandManifestEntry(island, options.manifest)
  const strategy = getIslandHydrationStrategy(island, manifest)
  const specifier = getIslandSpecifier(island, manifest)
  const detail: RueIslandLifecycleDetail = {
    id: island.getAttribute('data-rue-id') ?? manifest?.id ?? '',
    strategy,
  }
  let active = true
  let hydrated = false
  let scheduleCleanup = () => {}

  const runHydration = (replayEvent?: Event) => {
    if (hydrated || strategy === 'none' || !active || !isIslandWithinRoot(island, options.root)) {
      return
    }

    hydrated = true
    scheduleCleanup()
    island.setAttribute('data-rue-status', 'loading')
    dispatchIslandLifecycleEvent(island, 'rue:before-hydrate', detail)

    const load = options.resolveModule ?? defaultResolveModule
    Promise.resolve(load(specifier, island, manifest))
      .then(module => {
        if (!active || !isIslandWithinRoot(island, options.root)) return undefined
        return mountRueIsland(
          island,
          module,
          {
            island,
            props: readIslandProps(island, manifest),
            manifest,
            strategy,
            replayEvent,
          },
          options.hydrateRoot ?? hydrateRoot,
        )
      })
      .then(() => {
        if (!active || !isIslandWithinRoot(island, options.root)) return
        island.setAttribute('data-rue-status', 'hydrated')
        dispatchIslandLifecycleEvent(island, 'rue:hydrate', detail)
        replayInteractionEvent(island, replayEvent)
      })
      .catch(error => {
        if (!active || !isIslandWithinRoot(island, options.root)) return
        island.setAttribute('data-rue-status', 'error')
        dispatchIslandLifecycleEvent(island, 'rue:error', detail)
        if (options.onError) {
          options.onError(error, island, manifest)
          return
        }
        setTimeout(() => {
          throw error
        })
      })
  }

  scheduleCleanup = scheduleIslandHydration(island, strategy, manifest, runHydration)
  const unregister = () => {
    if (!active) return
    active = false
    scheduleCleanup()
    loadedIslandCleanups.delete(island)
  }
  loadedIslandCleanups.set(island, unregister)
  if (strategy === 'none') {
    queueMicrotask(() => {
      if (active && isIslandWithinRoot(island, options.root)) {
        dispatchIslandLifecycleEvent(island, 'rue:hydrate', detail)
      }
    })
  }
  return unregister
}

export const startRueIslandLoader = (options: RueIslandLoaderOptions = {}) => {
  const root =
    options.root ??
    (typeof document !== 'undefined' ? document : (undefined as ParentNode | undefined))
  if (!root) {
    return () => {}
  }

  activeIslandLoaders.get(root)?.()

  let active = true
  const registered = new Map<Element, () => void>()
  const terminalStatuses = new Set(['hydrated', 'static', 'error'])

  const getIslandsInSubtree = (node: ParentNode | Element) => {
    const islands: Element[] = []
    if ((node as Element).nodeType === 1 && (node as Element).matches?.(RUE_ISLAND_ELEMENT)) {
      islands.push(node as Element)
    }
    if (typeof node.querySelectorAll === 'function') {
      islands.push(...Array.from(node.querySelectorAll(RUE_ISLAND_ELEMENT)))
    }
    return islands
  }

  const canRegister = (island: Element) => {
    let ancestor = island.parentElement?.closest(RUE_ISLAND_ELEMENT)
    while (ancestor && isIslandWithinRoot(ancestor, root)) {
      const status = ancestor.getAttribute('data-rue-status')
      if (!status || !terminalStatuses.has(status)) return false
      ancestor = ancestor.parentElement?.closest(RUE_ISLAND_ELEMENT)
    }
    return true
  }

  const registerCandidate = (island: Element) => {
    if (
      !active ||
      registered.has(island) ||
      loadedIslandCleanups.has(island) ||
      !isIslandWithinRoot(island, root) ||
      !canRegister(island)
    ) {
      return
    }
    const cleanup = registerRueIsland(island, { ...options, root })
    if (cleanup) registered.set(island, cleanup)
  }

  const scan = (node: ParentNode | Element) => {
    for (const island of getIslandsInSubtree(node)) registerCandidate(island)
  }

  const unregisterSubtree = (node: ParentNode | Element) => {
    for (const island of getIslandsInSubtree(node)) {
      const cleanup = registered.get(island)
      if (!cleanup) continue
      cleanup()
      registered.delete(island)
    }
  }

  const onAncestorComplete = (event: Event) => {
    if (!active || !(event.target instanceof Element)) return
    scan(event.target)
  }
  ;(root as ParentNode & EventTarget).addEventListener?.('rue:hydrate', onAncestorComplete)
  ;(root as ParentNode & EventTarget).addEventListener?.('rue:error', onAncestorComplete)

  const ownerWindow =
    (root as Node).ownerDocument?.defaultView ??
    ((root as Document).defaultView || (typeof window !== 'undefined' ? window : null))
  const Observer = ownerWindow?.MutationObserver ?? globalThis.MutationObserver
  const observer =
    typeof Observer === 'function'
      ? new Observer(records => {
          for (const record of records) {
            for (const removed of Array.from(record.removedNodes)) {
              unregisterSubtree(removed as ParentNode)
            }
            for (const added of Array.from(record.addedNodes)) {
              scan(added as ParentNode)
            }
          }
        })
      : null
  observer?.observe(root as Node, { childList: true, subtree: true })
  scan(root)

  const stop = () => {
    if (!active) return
    active = false
    observer?.disconnect()
    ;(root as ParentNode & EventTarget).removeEventListener?.('rue:hydrate', onAncestorComplete)
    ;(root as ParentNode & EventTarget).removeEventListener?.('rue:error', onAncestorComplete)
    for (const cleanup of registered.values()) cleanup()
    registered.clear()
    if (activeIslandLoaders.get(root) === stop) {
      activeIslandLoaders.delete(root)
    }
  }
  activeIslandLoaders.set(root, stop)
  return stop
}
