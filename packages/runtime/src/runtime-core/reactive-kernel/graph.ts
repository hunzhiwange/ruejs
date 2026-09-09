import * as core from './graph-core.js'
export type { ReactiveNodeId, TrackingState, PendingComputedEffect } from './graph-core.js'
import type { ReactiveNodeId, TrackingState, PendingComputedEffect } from './graph-core.js'
export class ReactiveGraph {
  constructor(readonly storage = core.createGraphStorage()) {}
  debugStats() {
    return core.graphDebugStats(this.storage)
  }
  get linkCount(): number {
    return core.graphLinkCount(this.storage)
  }
  createDependencyNode(): ReactiveNodeId {
    return core.graphCreateDependencyNode(this.storage)
  }
  createComputedNode(effectId?: number): ReactiveNodeId {
    return core.graphCreateComputedNode(this.storage, effectId)
  }
  createEffectNode(effectId: number): ReactiveNodeId {
    return core.graphCreateEffectNode(this.storage, effectId)
  }
  contains(id: ReactiveNodeId): boolean {
    return core.graphContains(this.storage, id)
  }
  beginTracking(subscriber: ReactiveNodeId): TrackingState | undefined {
    return core.graphBeginTracking(this.storage, subscriber)
  }
  endTracking(subscriber: ReactiveNodeId, state: TrackingState): void {
    return core.graphEndTracking(this.storage, subscriber, state)
  }
  trackDependency(dependency: ReactiveNodeId): boolean {
    return core.graphTrackDependency(this.storage, dependency)
  }
  connect(dependency: ReactiveNodeId, subscriber: ReactiveNodeId): boolean {
    return core.graphConnect(this.storage, dependency, subscriber)
  }
  propagate(dependency: ReactiveNodeId): number[] {
    return core.graphPropagate(this.storage, dependency)
  }
  triggerDependency(id: ReactiveNodeId): number[] {
    return core.graphTriggerDependency(this.storage, id)
  }
  bindComputedNode(id: ReactiveNodeId, effectId: number): boolean {
    return core.graphBindComputedNode(this.storage, id, effectId)
  }
  invalidateComputed(id: ReactiveNodeId): number[] {
    return core.graphInvalidateComputed(this.storage, id)
  }
  nodeNeedsUpdate(id: ReactiveNodeId): boolean {
    return core.graphNodeNeedsUpdate(this.storage, id)
  }
  commitComputed(id: ReactiveNodeId, changed: boolean): void {
    return core.graphCommitComputed(this.storage, id, changed)
  }
  markNodeClean(id: ReactiveNodeId): void {
    return core.graphMarkNodeClean(this.storage, id)
  }
  pendingComputedEffects(subscriber: ReactiveNodeId): PendingComputedEffect[] {
    return core.graphPendingComputedEffects(this.storage, subscriber)
  }
  subscriberNeedsRun(subscriber: ReactiveNodeId): boolean {
    return core.graphSubscriberNeedsRun(this.storage, subscriber)
  }
  removeNode(id: ReactiveNodeId): boolean {
    return core.graphRemoveNode(this.storage, id)
  }
  dependenciesOf(subscriber: ReactiveNodeId): ReactiveNodeId[] {
    return core.graphDependenciesOf(this.storage, subscriber)
  }
  subscriberCount(dependency: ReactiveNodeId): number {
    return core.graphSubscriberCount(this.storage, dependency)
  }
  valueVersionOf(id: ReactiveNodeId): number | undefined {
    return core.graphValueVersionOf(this.storage, id)
  }
}
