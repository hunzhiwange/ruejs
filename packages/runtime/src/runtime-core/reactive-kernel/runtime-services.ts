import { installScopeRuntime } from './scope-runtime.js'
import type { ReactiveEffectRuntime } from './effect.js'
import type { ReactiveGraph } from './graph.js'
import type { EffectScopeManager } from './scope.js'
import type { ReactiveNodeId } from './graph-core.js'
import type { ReactiveSchedulingMode } from './runtime-state-core.js'
import type { EffectHandle } from './effect-handle.js'
import type {
  EffectCallback,
  EffectCleanup,
  EffectOptions,
  ComputedEffectBinding,
  ReactiveTriggerEvent,
} from './effect-core.js'
import * as core from './effect-core.js'
import * as graph from './graph-core.js'
import * as scopes from './scope-core.js'

export type ReactiveRuntimeServices = Omit<
  ReactiveEffectRuntime,
  'state' | 'scheduler' | 'graph' | 'scopes'
> & {
  graph: Pick<ReactiveGraph, 'createDependencyNode' | 'createComputedNode' | 'subscriberCount'>
  scopes: Pick<
    EffectScopeManager,
    'create' | 'dispose' | 'current' | 'push' | 'pop' | 'onScopeDispose'
  >
}

/** Minimal method adapter for the public factories; all operations use the shared storage. */
export const createRuntimeServices = (
  storage: core.ReactiveEffectRuntimeStorage,
): ReactiveRuntimeServices => {
  installScopeRuntime(storage)
  return {
    storage,
    graph: {
      createDependencyNode: () => graph.graphCreateDependencyNode(storage.graph),
      createComputedNode: id => graph.graphCreateComputedNode(storage.graph, id),
      subscriberCount: id => graph.graphSubscriberCount(storage.graph, id),
    },
    scopes: {
      create: detached => scopes.scopeCreate(storage.scopes!, detached),
      dispose: id => scopes.scopeDispose(storage.scopes!, id),
      get current() {
        return scopes.scopeCurrent(storage.scopes!)
      },
      push: id => scopes.scopePush(storage.scopes!, id),
      pop: () => scopes.scopePop(storage.scopes!),
      onScopeDispose: (cleanup, silent) =>
        scopes.scopeOnScopeDispose(storage.scopes!, cleanup, silent),
    },
    get currentEffectId(): number | undefined {
      return core.effectCurrentEffectId(storage)
    },
    setScheduling(mode: ReactiveSchedulingMode): void {
      return core.effectSetScheduling(storage, mode)
    },
    beginRenderDebugOwner(owner: unknown): void {
      return core.effectBeginRenderDebugOwner(storage, owner)
    },
    endRenderDebugOwner(): unknown {
      return core.effectEndRenderDebugOwner(storage)
    },
    createEffect(callback: EffectCallback, options: EffectOptions = {}): EffectHandle {
      return core.effectCreateEffect(storage, callback, options)
    },
    createComputedEffect(
      node: ReactiveNodeId,
      callback: EffectCallback,
      binding: ComputedEffectBinding,
    ): EffectHandle {
      return core.effectCreateComputedEffect(storage, node, callback, binding)
    },
    runEffect(id: number): void {
      return core.effectRunEffect(storage, id)
    },
    disposeEffect(id: number): boolean {
      return core.effectDisposeEffect(storage, id)
    },
    isEffectActive(id: number): boolean {
      return core.effectIsEffectActive(storage, id)
    },
    onCleanup(cleanup: EffectCleanup): boolean {
      return core.effectOnCleanup(storage, cleanup)
    },
    onWatcherCleanup(cleanup: EffectCleanup, failSilently = false): boolean {
      return core.effectOnWatcherCleanup(storage, cleanup, failSilently)
    },
    runWatcherHandler<T>(id: number, callback: () => T): T {
      return core.effectRunWatcherHandler(storage, id, callback)
    },
    untrack<T>(callback: () => T): T {
      return core.effectUntrack(storage, callback)
    },
    batch<T>(callback: () => T): T {
      return core.effectBatch(storage, callback)
    },
    nextTick<T>(callback?: () => T | PromiseLike<T>): Promise<T | void> {
      return callback === undefined
        ? core.effectNextTick(storage)
        : core.effectNextTick(storage, callback)
    },
    trackDependency(node: ReactiveNodeId): boolean {
      return core.effectTrackDependency(storage, node)
    },
    triggerDependency(node: ReactiveNodeId, event?: ReactiveTriggerEvent): void {
      return core.effectTriggerDependency(storage, node, event)
    },
    triggerDependencies(nodes: Iterable<ReactiveNodeId>, event?: ReactiveTriggerEvent): void {
      return core.effectTriggerDependencies(storage, nodes, event)
    },
    invalidateComputed(node: ReactiveNodeId, event?: ReactiveTriggerEvent): void {
      return core.effectInvalidateComputed(storage, node, event)
    },
    removeReactiveNode(node: ReactiveNodeId): boolean {
      return core.effectRemoveReactiveNode(storage, node)
    },
    allocateSignalId(): number {
      return core.effectAllocateSignalId(storage)
    },
  } as ReactiveRuntimeServices
}
