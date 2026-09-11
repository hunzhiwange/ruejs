import { effect, onOwnerCleanup } from './runtime-core/compiled'
import { cleanupDOMPropLifecycle, patchDOMProps } from './dom/props'

type SpreadValue = Record<string, unknown> | null | undefined

type LegacySpreadRecord = {
  keys: string[]
  values: Record<string, unknown>
  source?: object
  signature: string
}

type LegacySpreadState = {
  cursor: number
  resetScheduled: boolean
  merged: Record<string, unknown>
  records: LegacySpreadRecord[]
  sources: WeakMap<object, LegacySpreadRecord>
}

const legacySpreadStates = new WeakMap<Element, LegacySpreadState>()

const spreadSignature = (keys: string[]) => keys.slice().sort().join('\u0000')

const mergeSpreadRecords = (records: LegacySpreadRecord[]) => {
  const merged: Record<string, unknown> = {}
  for (const record of records) Object.assign(merged, record.values)
  return merged
}

const createSpreadSources = (records: LegacySpreadRecord[]) => {
  const sources = new WeakMap<object, LegacySpreadRecord>()
  for (const record of records) if (record.source) sources.set(record.source, record)
  return sources
}

const getLegacySpreadState = (element: Element) => {
  let state = legacySpreadStates.get(element)
  if (!state) {
    state = {
      cursor: 0,
      resetScheduled: false,
      merged: {},
      records: [],
      sources: new WeakMap(),
    }
    legacySpreadStates.set(element, state)
  }

  if (!state.resetScheduled) {
    state.resetScheduled = true
    queueMicrotask(() => {
      if (state!.cursor < state!.records.length) {
        state!.records = state!.records.slice(0, state!.cursor)
        state!.sources = createSpreadSources(state!.records)
        const next = mergeSpreadRecords(state!.records)
        patchDOMProps(element, next, state!.merged)
        state!.merged = next
      }
      state!.cursor = 0
      state!.resetScheduled = false
    })
  }
  return state
}

const resolveLegacySpreadRecord = (
  state: LegacySpreadState,
  source: Record<string, unknown>,
  keys: string[],
) => {
  const sourceObject = source && typeof source === 'object' ? source : undefined
  const signature = spreadSignature(keys)
  let record = sourceObject ? state.sources.get(sourceObject) : undefined

  if (!record && state.cursor >= state.records.length) {
    record = { keys: [], values: {}, source: sourceObject, signature }
    state.records.push(record)
  }
  if (!record) {
    const matches = state.records.filter(candidate => candidate.signature === signature)
    if (matches.length === 1) record = matches[0]
  }
  record ??= state.records[state.cursor]
  if (!record) {
    record = { keys: [], values: {}, source: sourceObject, signature }
    state.records.push(record)
  }
  if (sourceObject) {
    record.source = sourceObject
    state.sources.set(sourceObject, record)
  }
  state.cursor += 1
  return record
}

/** Compatibility spread entry; incremental state lives beside the compiled binding lifecycle. */
export const spreadAttributes = (
  element: Element,
  props: SpreadValue,
  excludedKeys: readonly string[] = [],
): void => {
  const next = props && typeof props === 'object' ? props : {}
  const state = getLegacySpreadState(element)
  const excluded = excludedKeys.length > 0 ? new Set(excludedKeys) : undefined
  const keys = excluded ? Object.keys(next).filter(key => !excluded.has(key)) : Object.keys(next)
  const record = resolveLegacySpreadRecord(state, next, keys)
  record.keys = keys
  record.values = Object.fromEntries(keys.map(key => [key, next[key]]))
  record.signature = spreadSignature(keys)

  const merged = mergeSpreadRecords(state.records)
  patchDOMProps(element, merged, state.merged)
  state.merged = merged
}

/** Apply a compiler-owned native spread binding without a generic DOM adapter. */
export const _$compiledSpreadAttributes = (
  element: Element,
  sourceOrRead: SpreadValue | (() => SpreadValue),
  excluded: readonly string[] = [],
): (() => void) => {
  const excludedKeys = new Set(excluded)
  let previous: Record<string, unknown> = {}

  const apply = () => {
    const source = (typeof sourceOrRead === 'function' ? sourceOrRead() : sourceOrRead) ?? {}
    const next: Record<string, unknown> = {}
    for (const key of Object.keys(source)) {
      if (!excludedKeys.has(key) && key !== 'key') next[key] = source[key]
    }
    patchDOMProps(element, next, previous)
    previous = next
  }
  const stop = effect(apply)

  onOwnerCleanup(() => {
    stop.dispose()
    for (const [key, value] of Object.entries(previous)) {
      cleanupDOMPropLifecycle(element, key, value)
    }
  })
  return apply
}
