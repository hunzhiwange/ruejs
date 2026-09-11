import { preserveFrameSlots } from '../server/app-frame-slots.js'
import {
  AppElementsWire,
  UNMATCHED_SLOT,
  type AppElementValue,
  type AppElements,
} from '../server/app-elements.js'
import { notFound } from './navigation.js'
import { writeAppServerPlan } from '../server/app-server-tree.js'
import {
  getOrCreateTextCompatContext,
  useTextCompatContext,
  type TextCompatContext,
  type TextCompatNode,
} from './context-adapter.js'
import { getRequestContext, isInsideUnifiedScope } from './unified-request-context.js'

const EMPTY_ELEMENTS: AppElements = Object.freeze({})

export { UNMATCHED_SLOT }

/**
 * Holds resolved AppElements (not a Promise). Rue 19's use(Promise) during
 * hydration triggers "async Client Component" for native Promises that lack
 * Rue's internal .status property. Storing resolved values sidesteps this.
 */
const ELEMENTS_CONTEXT_KEY = Symbol.for('text.appElementsContext')
const CHILDREN_CONTEXT_KEY = Symbol.for('text.appChildrenContext')
const PARALLEL_SLOTS_CONTEXT_KEY = Symbol.for('text.appParallelSlotsContext')
const CURRENT_SSR_APP_ELEMENTS_KEY = Symbol.for('text.currentSsrAppElements')

type CurrentSsrAppElementsState = {
  active: boolean
  elements: AppElements | null
  readElements: (() => AppElements) | null
  renderedEntryIds: Set<string>
}

type CurrentSsrAppElementsGlobal = typeof globalThis & {
  [CURRENT_SSR_APP_ELEMENTS_KEY]?: CurrentSsrAppElementsState
}
function getCurrentSsrAppElementsState(): CurrentSsrAppElementsState {
  if (isInsideUnifiedScope()) {
    const context = getRequestContext()
    if (!context.ssrAppElementsState) {
      context.ssrAppElementsState = {
        active: false,
        elements: null,
        readElements: null,
        renderedEntryIds: new Set<string>(),
      } satisfies CurrentSsrAppElementsState
    }
    return context.ssrAppElementsState as CurrentSsrAppElementsState
  }
  const globalState = globalThis as CurrentSsrAppElementsGlobal
  if (!globalState[CURRENT_SSR_APP_ELEMENTS_KEY]) {
    globalState[CURRENT_SSR_APP_ELEMENTS_KEY] = {
      active: false,
      elements: null,
      readElements: null,
      renderedEntryIds: new Set(),
    }
  }
  return globalState[CURRENT_SSR_APP_ELEMENTS_KEY]
}

export function beginCurrentSsrAppElements(): void {
  const state = getCurrentSsrAppElementsState()
  state.active = true
  state.elements = null
  state.readElements = null
  state.renderedEntryIds.clear()
}

export function setCurrentSsrAppElements(elements: AppElements): void {
  const state = getCurrentSsrAppElementsState()
  if (!state.active) return
  state.elements = elements
}

export function setCurrentSsrAppElementsReader(readElements: (() => AppElements) | null): void {
  const state = getCurrentSsrAppElementsState()
  if (!state.active) return
  state.readElements = readElements
}

export function clearCurrentSsrAppElements(): void {
  const state = getCurrentSsrAppElementsState()
  state.active = false
  state.elements = null
  state.readElements = null
  state.renderedEntryIds.clear()
}

export function readCurrentSsrAppElementsFallback(id?: string): AppElements | null {
  const state = getCurrentSsrAppElementsState()
  if (!state.active) return null
  if (!state.elements && state.readElements) {
    const elements = state.readElements()
    state.elements = elements
    return elements
  }
  if (
    id !== undefined &&
    state.elements &&
    !Object.hasOwn(state.elements, id) &&
    state.readElements
  ) {
    const elements = state.readElements()
    state.elements = elements
    return elements
  }
  return state.elements
}

function createLazyRequiredTextCompatContext<T>(
  key: symbol,
  defaultValue: T,
): TextCompatContext<T> {
  let context: TextCompatContext<T> | null = null
  const readContext = () => {
    context ??= getOrCreateTextCompatContext<T>(key, defaultValue)
    if (!context) {
      throw new Error('Rue context is unavailable in this runtime condition.')
    }
    return context
  }
  return new Proxy({} as TextCompatContext<T>, {
    get(_target, prop, receiver) {
      return Reflect.get(readContext() as object, prop, receiver)
    },
    set(_target, prop, value) {
      ;(readContext() as Record<PropertyKey, unknown>)[prop] = value
      return true
    },
    defineProperty(_target, prop, descriptor) {
      return Reflect.defineProperty(readContext() as object, prop, descriptor)
    },
    has(_target, prop) {
      return prop in readContext()
    },
    ownKeys() {
      return Reflect.ownKeys(readContext() as object)
    },
    getOwnPropertyDescriptor(_target, prop) {
      return Reflect.getOwnPropertyDescriptor(readContext() as object, prop)
    },
  })
}

export const ElementsContext: TextCompatContext<AppElements> =
  createLazyRequiredTextCompatContext<AppElements>(ELEMENTS_CONTEXT_KEY, EMPTY_ELEMENTS)

export const ChildrenContext: TextCompatContext<TextCompatNode> =
  createLazyRequiredTextCompatContext<TextCompatNode>(CHILDREN_CONTEXT_KEY, null)

export const ParallelSlotsContext: TextCompatContext<Readonly<
  Record<string, TextCompatNode>
> | null> = createLazyRequiredTextCompatContext<Readonly<Record<string, TextCompatNode>> | null>(
  PARALLEL_SLOTS_CONTEXT_KEY,
  null,
)

type MergeElementsOptions = {
  clearAbsentSlots?: boolean
  preserveAbsentSlots?: boolean
  preserveElementIds?: readonly string[]
  preservePreviousSlotIds?: readonly string[]
}

export function mergeElements(
  prev: AppElements,
  text: AppElements,
  options: MergeElementsOptions | boolean = {},
): AppElements {
  const clearAbsentSlots =
    typeof options === 'boolean' ? options : (options.clearAbsentSlots ?? false)
  const preserveAbsentSlots =
    typeof options === 'boolean' ? !options : (options.preserveAbsentSlots ?? true)
  const preserveElementIds = typeof options === 'boolean' ? [] : (options.preserveElementIds ?? [])
  const preservePreviousSlotIds =
    typeof options === 'boolean' ? [] : (options.preservePreviousSlotIds ?? [])
  const merged: Record<string, AppElementValue> = { ...text }

  for (const id of preserveElementIds) {
    if (Object.hasOwn(merged, id)) continue
    if (Object.hasOwn(prev, id)) {
      const value = prev[id]
      if (value !== undefined) merged[id] = value
    }
  }

  const slotKeys = new Set(
    [...Object.keys(prev), ...Object.keys(text)].filter(key => AppElementsWire.isSlotId(key)),
  )
  // On traversal (browser back/forward), the server renders the full destination
  // route tree. A slot absent from text means the destination route tree does not
  // include it, so clear it rather than keeping the stale prev value. The legacy
  // absent-slot path stays opt-in for unpromoted fallbacks; promoted navigation
  // commits preserve default/unmatched slots through planner-approved
  // preservePreviousSlotIds.
  if (clearAbsentSlots) {
    for (const key of slotKeys) {
      if (!Object.hasOwn(text, key)) {
        delete merged[key]
      }
    }
  } else if (preserveAbsentSlots) {
    for (const key of slotKeys) {
      if (!Object.hasOwn(merged, key) && Object.hasOwn(prev, key)) {
        const value = prev[key]
        if (value !== undefined) merged[key] = value
      }
    }
  }

  // Default/unmatched slot preservation is a router-state decision, not a
  // consequence of a missing key or an unmatched marker on the transport. This
  // loop intentionally runs after clear/preserve element handling so planner-
  // approved slot content and binding proof win the final merged value.
  for (const id of preservePreviousSlotIds) {
    if (!AppElementsWire.isSlotId(id)) continue
    if (!Object.hasOwn(prev, id)) continue
    const value = prev[id]
    if (value !== undefined && value !== UNMATCHED_SLOT) {
      merged[id] = value
    }
  }

  const previousRoute = prev[AppElementsWire.keys.route]
  const nextRoute = text[AppElementsWire.keys.route]
  const before = typeof previousRoute === 'string' ? prev[previousRoute] : null
  const incoming = typeof nextRoute === 'string' ? text[nextRoute] : null
  const frame = (value: unknown): value is import('@rue-js/runtime/internal/hydrate').ServerFrame =>
    value !== null &&
    typeof value === 'object' &&
    (value as { version?: unknown }).version === 1 &&
    typeof (value as { html?: unknown }).html === 'string' &&
    Array.isArray((value as { references?: unknown }).references)
  if (typeof nextRoute === 'string' && frame(before) && frame(incoming)) {
    const retained = new Set(preservePreviousSlotIds)
    if (!clearAbsentSlots && preserveAbsentSlots)
      for (const id of slotKeys) {
        if (!Object.hasOwn(text, id) && Object.hasOwn(prev, id)) retained.add(id)
      }
    merged[nextRoute] = preserveFrameSlots(before, incoming, [...retained])
  }
  return merged
}

export function Slot(props: {
  id: string
  children?: TextCompatNode
  elements?: AppElements
  parallelSlots?: Readonly<Record<string, TextCompatNode>>
}) {
  const contextElements = useTextCompatContext(ElementsContext)
  return renderSlotElement({
    ...props,
    elements:
      props.elements ??
      (contextElements === EMPTY_ELEMENTS
        ? (readCurrentSsrAppElementsFallback() ?? EMPTY_ELEMENTS)
        : contextElements),
  })
}
export function renderSlotElement({
  id,
  children,
  elements,
  parallelSlots,
}: {
  id: string
  children?: TextCompatNode
  elements?: AppElements
  parallelSlots?: Readonly<Record<string, TextCompatNode>>
}) {
  const entries =
    elements && id in elements
      ? elements
      : (readCurrentSsrAppElementsFallback(id) ?? elements ?? EMPTY_ELEMENTS)
  const plan = entries[id]
  if (!(id in entries) && !AppElementsWire.isSlotId(id) && process.env.NODE_ENV !== 'production') {
    console.warn(`[text] Missing App Router element entry during render: ${id}`)
  }
  if (plan === UNMATCHED_SLOT) notFound()
  if (plan != null && typeof plan !== 'function')
    throw new Error(`Text slot ${id} requires a compiled plan`)
  const selectedPlan =
    plan == null
      ? (children ?? (() => {}))
      : async (writer: import('@rue-js/runtime/internal/ssr').Writer) =>
          writeAppServerPlan(plan as import('@rue-js/runtime/internal/ssr').ServerPlan, writer)
  const content =
    plan == null
      ? (children ?? (() => {}))
      : ParallelSlotsContext.Provider({
          value: parallelSlots ?? null,
          children: ChildrenContext.Provider({
            value: children ?? null,
            children: selectedPlan as any,
          }),
        })
  if (!AppElementsWire.isSlotId(id)) return content
  return async (writer: import('@rue-js/runtime/internal/ssr').Writer) => {
    const marker = `text-slot:${encodeURIComponent(id)}`
    writer.chunks.push(`<!--${marker}-->`)
    await (content as import('@rue-js/runtime/internal/ssr').ServerPlan)(writer)
    writer.chunks.push(`<!--/${marker}-->`)
  }
}
export function Children() {
  return useTextCompatContext(ChildrenContext) ?? (() => {})
}
export function ParallelSlot({ name }: { name: string }) {
  return useTextCompatContext(ParallelSlotsContext)?.[name] ?? (() => {})
}
