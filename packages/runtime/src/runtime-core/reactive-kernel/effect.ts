import { installScopeRuntime } from './scope-runtime.js'
import { EffectHandle } from './effect-handle.js'
export { EffectHandle } from './effect-handle.js'
import { ReactiveGraph, type ReactiveNodeId } from './graph.js'
import { ReactiveRuntimeState, type ReactiveSchedulingMode } from './runtime-state.js'
import { ReactiveScheduler } from './scheduler.js'
import { EffectScopeManager } from './scope.js'
import * as core from './effect-core.js'
export type {
  EffectCleanup,
  EffectCallback,
  EffectScheduler,
  EffectOptions,
  ReactiveEffectRuntimeOptions,
  ReactiveTriggerEvent,
  ComputedEffectBinding,
} from './effect-core.js'
import type {
  EffectCleanup,
  EffectCallback,
  EffectOptions,
  ReactiveEffectRuntimeOptions,
  ReactiveTriggerEvent,
  ComputedEffectBinding,
} from './effect-core.js'
export class ReactiveEffectRuntime {
  readonly storage: core.ReactiveEffectRuntimeStorage
  readonly state: ReactiveRuntimeState
  readonly graph: ReactiveGraph
  readonly scheduler: ReactiveScheduler
  readonly scopes: EffectScopeManager
  constructor(
    options: ReactiveEffectRuntimeOptions = {},
    storage?: core.ReactiveEffectRuntimeStorage,
  ) {
    this.storage = storage ?? core.createReactiveEffectRuntimeStorage(options)
    installScopeRuntime(this.storage)
    this.state = new ReactiveRuntimeState(this.storage.state)
    this.graph = new ReactiveGraph(this.storage.graph)
    this.scheduler = new ReactiveScheduler(this.state, this.storage.scheduler)
    this.scopes = new EffectScopeManager(this.state, undefined, this.storage.scopes!)
  }
  get currentEffectId(): number | undefined {
    return core.effectCurrentEffectId(this.storage)
  }
  setScheduling(mode: ReactiveSchedulingMode): void {
    return core.effectSetScheduling(this.storage, mode)
  }
  beginRenderDebugOwner(owner: unknown): void {
    return core.effectBeginRenderDebugOwner(this.storage, owner)
  }
  endRenderDebugOwner(): unknown {
    return core.effectEndRenderDebugOwner(this.storage)
  }
  createEffect(callback: EffectCallback, options: EffectOptions = {}): EffectHandle {
    return core.effectCreateEffect(this.storage, callback, options)
  }
  createComputedEffect(
    node: ReactiveNodeId,
    callback: EffectCallback,
    binding: ComputedEffectBinding,
  ): EffectHandle {
    return core.effectCreateComputedEffect(this.storage, node, callback, binding)
  }
  runEffect(id: number): void {
    return core.effectRunEffect(this.storage, id)
  }
  disposeEffect(id: number): boolean {
    return core.effectDisposeEffect(this.storage, id)
  }
  isEffectActive(id: number): boolean {
    return core.effectIsEffectActive(this.storage, id)
  }
  onCleanup(cleanup: EffectCleanup): boolean {
    return core.effectOnCleanup(this.storage, cleanup)
  }
  onWatcherCleanup(cleanup: EffectCleanup, failSilently = false): boolean {
    return core.effectOnWatcherCleanup(this.storage, cleanup, failSilently)
  }
  runWatcherHandler<T>(id: number, callback: () => T): T {
    return core.effectRunWatcherHandler(this.storage, id, callback)
  }
  untrack<T>(callback: () => T): T {
    return core.effectUntrack(this.storage, callback)
  }
  batch<T>(callback: () => T): T {
    return core.effectBatch(this.storage, callback)
  }
  nextTick(): Promise<void>
  nextTick<T>(callback: () => T | PromiseLike<T>): Promise<T>
  nextTick<T>(callback?: () => T | PromiseLike<T>): Promise<T | void> {
    return callback === undefined
      ? core.effectNextTick(this.storage)
      : core.effectNextTick(this.storage, callback)
  }
  trackDependency(node: ReactiveNodeId): boolean {
    return core.effectTrackDependency(this.storage, node)
  }
  triggerDependency(node: ReactiveNodeId, event?: ReactiveTriggerEvent): void {
    return core.effectTriggerDependency(this.storage, node, event)
  }
  triggerDependencies(nodes: Iterable<ReactiveNodeId>, event?: ReactiveTriggerEvent): void {
    return core.effectTriggerDependencies(this.storage, nodes, event)
  }
  invalidateComputed(node: ReactiveNodeId, event?: ReactiveTriggerEvent): void {
    return core.effectInvalidateComputed(this.storage, node, event)
  }
  removeReactiveNode(node: ReactiveNodeId): boolean {
    return core.effectRemoveReactiveNode(this.storage, node)
  }
  allocateSignalId(): number {
    return core.effectAllocateSignalId(this.storage)
  }
}

export const createEffect = (
  runtime: ReactiveEffectRuntime,
  callback: EffectCallback,
  options?: EffectOptions | null,
): EffectHandle => runtime.createEffect(callback, options ?? {})

export const onCleanup = (runtime: ReactiveEffectRuntime, cleanup: EffectCleanup): void => {
  runtime.onCleanup(cleanup)
}

export const onWatcherCleanup = (
  runtime: ReactiveEffectRuntime,
  cleanup: EffectCleanup,
  failSilently = false,
): void => {
  runtime.onWatcherCleanup(cleanup, failSilently)
}

export const untrack = <T>(runtime: ReactiveEffectRuntime, callback: () => T): T =>
  runtime.untrack(callback)

export const batch = <T>(runtime: ReactiveEffectRuntime, callback: () => T): T =>
  runtime.batch(callback)
