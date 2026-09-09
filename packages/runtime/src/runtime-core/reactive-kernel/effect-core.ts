import { EffectHandle } from './effect-handle.js'
import * as graphCore from './graph-core.js'
import type { GraphStorage as ReactiveGraph, ReactiveNodeId } from './graph-core.js'
import * as stateCore from './runtime-state-core.js'
import type {
  ReactiveRuntimeStateStorage as ReactiveRuntimeState,
  ReactiveSchedulingMode,
} from './runtime-state-core.js'
import * as schedulerCore from './scheduler-core.js'
import type { ReactiveSchedulerStorage as ReactiveScheduler } from './scheduler-core.js'
import type {
  EffectScopeManagerStorage as EffectScopeManager,
  EffectScopeId,
} from './scope-core.js'

export type EffectCleanup = () => void
export type EffectCallback = () => unknown
export type EffectScheduler = (runner: () => void) => void

export interface EffectOptions {
  readonly lazy?: boolean
  readonly scheduler?: EffectScheduler
  readonly watcher?: boolean
}

export interface ReactiveEffectRuntimeOptions {
  readonly onErrorCaptured?: (error: unknown, owner: unknown, info: string) => boolean
  readonly onRenderTriggered?: (
    effectId: number,
    event: ReactiveTriggerEvent,
    owner: unknown,
  ) => void
  readonly warn?: (message: string) => void
}

export interface ReactiveTriggerEvent {
  readonly effect?: number
  readonly key: unknown
  readonly newValue: unknown
  readonly oldValue: unknown
  readonly path: readonly PropertyKey[]
  readonly target: unknown
  readonly type: 'set'
}

export interface ComputedEffectBinding {
  beginEvaluation(): boolean
  commit(value: unknown): boolean
  abort(): void
}

const enum EffectField {
  Callback,
  Computed,
  Id,
  Node,
  Runner,
  Scheduler,
  ScopeDisposer,
  ScopeId,
  Watcher,
  Cleanups,
  Owner,
}
type EffectRecord = [
  EffectCallback,
  ComputedEffectBinding | undefined,
  number,
  ReactiveNodeId,
  () => void,
  EffectScheduler | undefined,
  EffectCleanup,
  EffectScopeId | undefined,
  boolean,
  EffectCleanup[],
  unknown,
]

const warnByDefault = (message: string): void => console.warn(message)

/**
 * Public lifetime handle backed by an instance-owned effect record.
 *
 * A scheduled runner only retains the numeric id. Disposing first removes that
 * record and its graph node, so delayed custom/default scheduler callbacks are
 * harmless and repeated disposal stays idempotent.
 */

/**
 * Effect execution layer shared by Signal and Computed instances.
 *
 * The graph remains topology-only. This runtime owns callbacks and lifetimes,
 * validates dirty computed dependencies before consumers, and hands runnable
 * ids to the scheduler. Cleanup and tracking contexts are restored in finally
 * blocks so nested effects and thrown callbacks cannot corrupt their parent.
 * Each rerun first executes the previous cleanup; disposal removes queued work
 * and performs the final cleanup exactly once. Custom schedulers receive an
 * idempotent runner rather than ownership of the effect record.
 */
export interface ReactiveEffectRuntimeStorage {
  validate?: (record: EffectRecord) => boolean
  invalidate?: (node: ReactiveNodeId, event?: ReactiveTriggerEvent) => void
  untrack<T>(callback: () => T): T
  scopeOps?: {
    current(): EffectScopeId | undefined
    create(): EffectScopeId
    push(id: EffectScopeId): boolean
    pop(): EffectScopeId | undefined
    dispose(id: EffectScopeId): boolean
    register(callback: EffectCleanup, id?: EffectScopeId): boolean
    unregister(callback: EffectCleanup, id?: EffectScopeId): boolean
    cleanup(callback: EffectCleanup): boolean
    run<T>(id: EffectScopeId, callback: () => T): T | undefined
  }

  state: ReactiveRuntimeState
  graph: ReactiveGraph
  scheduler: ReactiveScheduler
  scopes?: EffectScopeManager
  effects: Map<number, EffectRecord>
  onErrorCaptured: ReactiveEffectRuntimeOptions['onErrorCaptured']
  onRenderTriggered: ReactiveEffectRuntimeOptions['onRenderTriggered']
  warn?: (message: string) => void
  watcherHandlerEffectIds: number[]
}
export function createReactiveEffectRuntimeStorage(
  options: ReactiveEffectRuntimeOptions = {},
): ReactiveEffectRuntimeStorage {
  const state = stateCore.createReactiveRuntimeStateStorage()
  const warn = options.warn
  return {
    effects: new Map(),
    watcherHandlerEffectIds: [],
    state,
    graph: graphCore.createGraphStorage(),
    scheduler: schedulerCore.createReactiveSchedulerStorage(state),
    onErrorCaptured: options.onErrorCaptured,
    onRenderTriggered: options.onRenderTriggered,
    warn,
    untrack: callback => stateCore.stateRunUntracked(state, callback),
  }
}
export function effectCurrentEffectId(storage: ReactiveEffectRuntimeStorage): number | undefined {
  return storage.state.currentEffectId
}
export function effectSetScheduling(
  storage: ReactiveEffectRuntimeStorage,
  mode: ReactiveSchedulingMode,
): void {
  storage.state.schedulingMode = mode
}
export function effectBeginRenderDebugOwner(
  storage: ReactiveEffectRuntimeStorage,
  owner: unknown,
): void {
  stateCore.statePushRenderDebugOwner(storage.state, owner)
}
export function effectEndRenderDebugOwner(storage: ReactiveEffectRuntimeStorage): unknown {
  return stateCore.statePopRenderDebugOwner(storage.state)
}
export function effectCreateEffect(
  storage: ReactiveEffectRuntimeStorage,
  callback: EffectCallback,
  options: EffectOptions = {},
): EffectHandle {
  const id = effectCreateEffectId(storage, callback, options)
  if (!options.lazy) {
    const record = storage.effects.get(id)!
    if (record[EffectField.Scheduler] !== undefined)
      record[EffectField.Scheduler](record[EffectField.Runner])
    else effectRunEffect(storage, id)
  }
  return new EffectHandle(storage, id)
}
/** Allocate and register an effect; each entry owns its initial-run policy. */
export function effectCreateEffectId(
  storage: ReactiveEffectRuntimeStorage,
  callback: EffectCallback,
  options: EffectOptions = {},
): number {
  const id = storage.state.nextEffectId++
  const node = graphCore.graphCreateEffectNode(storage.graph, id)
  effectInsertEffect(storage, id, node, callback, options, undefined)
  return id
}
export function effectCreateComputedEffect(
  storage: ReactiveEffectRuntimeStorage,
  node: ReactiveNodeId,
  callback: EffectCallback,
  binding: ComputedEffectBinding,
): EffectHandle {
  storage.validate ??= record => effectValidate(storage, record)
  storage.invalidate ??= (node, event) => effectInvalidateComputed(storage, node, event)

  const id = storage.state.nextEffectId++
  graphCore.graphBindComputedNode(storage.graph, node, id)
  effectInsertEffect(storage, id, node, callback, { lazy: true }, binding)
  return new EffectHandle(storage, id)
}
function effectValidate(storage: ReactiveEffectRuntimeStorage, record: EffectRecord): boolean {
  if (record[EffectField.Computed] !== undefined) {
    if (graphCore.graphNodeNeedsUpdate(storage.graph, record[EffectField.Node]))
      effectRunComputed(storage, record)
    return false
  }

  for (const [computedNode, computedId] of graphCore.graphPendingComputedEffects(
    storage.graph,
    record[EffectField.Node],
  )) {
    const computedRecord = storage.effects.get(computedId)
    if (computedRecord?.[EffectField.Computed] !== undefined)
      effectRunComputed(storage, computedRecord)
    else graphCore.graphMarkNodeClean(storage.graph, computedNode)
  }

  if (!graphCore.graphSubscriberNeedsRun(storage.graph, record[EffectField.Node])) {
    graphCore.graphMarkNodeClean(storage.graph, record[EffectField.Node])
    return false
  }

  return true
}
export function effectRunEffect(storage: ReactiveEffectRuntimeStorage, id: number): void {
  const record = storage.effects.get(id)
  if (record === undefined) return

  if (storage.validate?.(record) === false) return

  try {
    effectRunEffectBody(storage, record)
  } catch (error) {
    if (!effectCaptureError(storage, record, error)) throw error
  }
}
export function effectDisposeEffect(storage: ReactiveEffectRuntimeStorage, id: number): boolean {
  const record = storage.effects.get(id)
  if (record === undefined) return false

  storage.effects.delete(id)
  schedulerCore.schedulerCancel(storage.scheduler, id)
  storage.scopeOps?.unregister(record[EffectField.ScopeDisposer], record[EffectField.ScopeId])
  graphCore.graphRemoveNode(storage.graph, record[EffectField.Node])
  const cleanups = record[EffectField.Cleanups]
  record[EffectField.Cleanups] = []
  effectRunCleanups(storage, cleanups)
  return true
}
export function effectIsEffectActive(storage: ReactiveEffectRuntimeStorage, id: number): boolean {
  return storage.effects.has(id)
}
export function effectOnCleanup(
  storage: ReactiveEffectRuntimeStorage,
  cleanup: EffectCleanup,
): boolean {
  const id = storage.state.currentEffectId
  if (id === undefined) return false
  const record = storage.effects.get(id)
  if (record === undefined) return false
  record[EffectField.Cleanups].push(cleanup)
  return true
}
export function effectOnWatcherCleanup(
  storage: ReactiveEffectRuntimeStorage,
  cleanup: EffectCleanup,
  failSilently = false,
): boolean {
  // Watch handlers run untracked, but their synchronous cleanup registrations
  // still belong to the watcher that invoked them.
  const id =
    storage.state.currentEffectId ??
    storage.watcherHandlerEffectIds[storage.watcherHandlerEffectIds.length - 1]
  const record = id === undefined ? undefined : storage.effects.get(id)
  if (record?.[EffectField.Watcher]) {
    record[EffectField.Cleanups].push(cleanup)
    return true
  }

  if (!failSilently) {
    ;(storage.warn ?? warnByDefault)(
      'onWatcherCleanup() is called when there is no active watcher.',
    )
  }
  return false
}
export function effectRunWatcherHandler<T>(
  storage: ReactiveEffectRuntimeStorage,
  id: number,
  callback: () => T,
): T {
  if (!storage.effects.get(id)?.[EffectField.Watcher]) return effectUntrack(storage, callback)
  const stackIndex = storage.watcherHandlerEffectIds.length
  storage.watcherHandlerEffectIds.push(id)
  try {
    return effectUntrack(storage, callback)
  } finally {
    storage.watcherHandlerEffectIds.splice(stackIndex, 1)
  }
}
export function effectUntrack<T>(storage: ReactiveEffectRuntimeStorage, callback: () => T): T {
  return stateCore.stateRunUntracked(storage.state, callback)
}
export function effectBatch<T>(storage: ReactiveEffectRuntimeStorage, callback: () => T): T {
  return schedulerCore.schedulerBatch(storage.scheduler, callback)
}
export function effectNextTick(storage: ReactiveEffectRuntimeStorage): Promise<void>
export function effectNextTick<T>(
  storage: ReactiveEffectRuntimeStorage,
  callback: () => T | PromiseLike<T>,
): Promise<T>
export function effectNextTick<T>(
  storage: ReactiveEffectRuntimeStorage,
  callback?: () => T | PromiseLike<T>,
): Promise<T | void> {
  return callback === undefined
    ? schedulerCore.schedulerNextTick(storage.scheduler)
    : schedulerCore.schedulerNextTick(storage.scheduler, callback)
}
export function effectTrackDependency(
  storage: ReactiveEffectRuntimeStorage,
  node: ReactiveNodeId,
): boolean {
  const effectId = storage.state.currentEffectId
  if (effectId === undefined || !storage.effects.has(effectId)) return false
  const owner = stateCore.stateCurrentRenderDebugOwner(storage.state)
  const record = storage.effects.get(effectId)
  if (record !== undefined && owner !== undefined) record[EffectField.Owner] = owner
  return graphCore.graphTrackDependency(storage.graph, node)
}
export function effectTriggerDependency(
  storage: ReactiveEffectRuntimeStorage,
  node: ReactiveNodeId,
  event?: ReactiveTriggerEvent,
): void {
  effectScheduleEffects(storage, graphCore.graphTriggerDependency(storage.graph, node), event)
}
export function effectTriggerDependencies(
  storage: ReactiveEffectRuntimeStorage,
  nodes: Iterable<ReactiveNodeId>,
  event?: ReactiveTriggerEvent,
): void {
  const effectIds = new Set<number>()
  for (const node of nodes) {
    for (const effectId of graphCore.graphTriggerDependency(storage.graph, node))
      effectIds.add(effectId)
  }
  effectScheduleEffects(storage, [...effectIds], event)
}
export function effectInvalidateComputed(
  storage: ReactiveEffectRuntimeStorage,
  node: ReactiveNodeId,
  event?: ReactiveTriggerEvent,
): void {
  effectScheduleEffects(storage, graphCore.graphInvalidateComputed(storage.graph, node), event)
}
export function effectRemoveReactiveNode(
  storage: ReactiveEffectRuntimeStorage,
  node: ReactiveNodeId,
): boolean {
  return graphCore.graphRemoveNode(storage.graph, node)
}
export function effectAllocateSignalId(storage: ReactiveEffectRuntimeStorage): number {
  return storage.state.nextSignalId++
}
export function effectInsertEffect(
  storage: ReactiveEffectRuntimeStorage,
  id: number,
  node: ReactiveNodeId,
  callback: EffectCallback,
  options: EffectOptions,
  computed: ComputedEffectBinding | undefined,
): void {
  const scopeId = storage.scopeOps?.current()
  const runner = (): void => effectRunEffect(storage, id)
  const scopeDisposer = (): void => {
    effectDisposeEffect(storage, id)
  }
  const record: EffectRecord = [
    callback,
    computed,
    id,
    node,
    runner,
    options.scheduler,
    scopeDisposer,
    scopeId,
    options.watcher === true,
    [],
    stateCore.stateCurrentRenderDebugOwner(storage.state),
  ]
  storage.effects.set(id, record)
  storage.scopeOps?.register(scopeDisposer, scopeId)
}
export function effectRunComputed(
  storage: ReactiveEffectRuntimeStorage,
  record: EffectRecord,
): void {
  const binding = record[EffectField.Computed]
  if (binding === undefined || !binding.beginEvaluation()) return

  try {
    const value = effectRunEffectBody(storage, record)
    graphCore.graphCommitComputed(storage.graph, record[EffectField.Node], binding.commit(value))
  } catch (error) {
    binding.abort()
    effectCaptureError(storage, record, error)
    graphCore.graphCommitComputed(
      storage.graph,
      record[EffectField.Node],
      binding.commit(undefined),
    )
  }
}
export function effectRunEffectBody(
  storage: ReactiveEffectRuntimeStorage,
  record: EffectRecord,
): unknown {
  const cleanups = record[EffectField.Cleanups]
  record[EffectField.Cleanups] = []
  effectRunCleanups(storage, cleanups)

  const tracking = graphCore.graphBeginTracking(storage.graph, record[EffectField.Node])
  if (tracking === undefined) return undefined
  try {
    return stateCore.stateRunWithEffect(storage.state, record[EffectField.Id], () => {
      if (record[EffectField.ScopeId] === undefined) return record[EffectField.Callback]()
      return storage.scopeOps!.run(record[EffectField.ScopeId], record[EffectField.Callback])
    })
  } finally {
    graphCore.graphEndTracking(storage.graph, record[EffectField.Node], tracking)
  }
}
export function effectScheduleEffects(
  storage: ReactiveEffectRuntimeStorage,
  effectIds: readonly number[],
  event?: ReactiveTriggerEvent,
): void {
  for (const id of effectIds) {
    const record = storage.effects.get(id)
    if (record === undefined) continue
    if (record[EffectField.Computed] !== undefined) {
      storage.invalidate?.(record[EffectField.Node], event)
      continue
    }

    if (event !== undefined) {
      storage.onRenderTriggered?.(
        id,
        {
          ...event,
          effect: id,
        },
        record[EffectField.Owner],
      )
    }

    if (record[EffectField.Scheduler] !== undefined) {
      schedulerCore.schedulerCancel(storage.scheduler, id)
      record[EffectField.Scheduler](record[EffectField.Runner])
      // A custom scheduler is a notification boundary and may omit its runner.
      // Re-arm the graph so a later source change can notify it again.
      graphCore.graphMarkNodeClean(storage.graph, record[EffectField.Node])
    } else {
      schedulerCore.schedulerSchedule(storage.scheduler, id, record[EffectField.Runner])
    }
  }
}
export function effectCaptureError(
  storage: ReactiveEffectRuntimeStorage,
  record: EffectRecord,
  error: unknown,
): boolean {
  if (storage.onErrorCaptured === undefined) return false
  return stateCore.stateRunWithErrorCaptureEffect(
    storage.state,
    record[EffectField.Id],
    () => storage.onErrorCaptured?.(error, record[EffectField.Owner], 'reactive effect') === true,
  )
}
export function effectRunCleanups(
  storage: ReactiveEffectRuntimeStorage,
  cleanups: readonly EffectCleanup[],
): void {
  for (const cleanup of cleanups) {
    try {
      cleanup()
    } catch {
      // A failed cleanup must not retain later cleanup callbacks or the effect.
    }
  }
}
