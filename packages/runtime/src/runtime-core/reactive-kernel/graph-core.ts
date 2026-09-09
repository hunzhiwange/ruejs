/**
 * Rue's incremental reactive dependency graph.
 *
 * The topology algorithm is based in part on alien-signals-rs, distributed
 * under the MIT license. Rue keeps the shared dependency/subscriber link idea,
 * ordered link reuse, propagation flags, and lazy computed validation while
 * adapting them to garbage-collected TypeScript data structures.
 *
 * Each link belongs to two ordered lists: the dependencies read by one
 * subscriber and the subscribers attached to one dependency. A tracking pass
 * reuses the unchanged prefix and removes the unread tail. Nodes and links use
 * generational handles so a released slot can be reused without making an old
 * handle point at the replacement.
 */

const MUTABLE = 1 << 0
const WATCHING = 1 << 1
const RECURSED_CHECK = 1 << 2
const RECURSED = 1 << 3
const DIRTY = 1 << 4
const PENDING = 1 << 5
const EFFECT = 1 << 6
const COMPUTED = 1 << 7

type Flags = number

declare const nodeIdBrand: unique symbol
declare const linkIdBrand: unique symbol
export type ReactiveNodeId = number & { readonly [nodeIdBrand]: true }
type LinkId = number & { readonly [linkIdBrand]: true }

// Zero represents a successful tracking entry with no previous subscriber.
export type TrackingState = ReactiveNodeId | 0

const enum NodeField {
  Id,
  Effect,
  Flags,
  Version,
  DepsHead,
  DepsTail,
  SubsHead,
  SubsTail,
}
const enum LinkField {
  Id,
  Version,
  Dep,
  Sub,
  PrevDep,
  NextDep,
  PrevSub,
  NextSub,
}
type GraphNode = [
  ReactiveNodeId,
  number | undefined,
  Flags,
  number,
  Link | undefined,
  Link | undefined,
  Link | undefined,
  Link | undefined,
]
type Link = [
  LinkId,
  number,
  GraphNode,
  GraphNode,
  Link | undefined,
  Link | undefined,
  Link | undefined,
  Link | undefined,
]

// 26 index bits leave 27 generation bits within the exact integer range.
// Exhausted slots are retired, never wrapped back to a stale handle.
const INDEX_STRIDE = 2 ** 26
class Arena<T extends [TId, ...unknown[]], TId extends number> {
  declare readonly values: (T | number)[]
  declare private readonly _freeIndices: number[]
  declare size: number
  declare allocations: number

  constructor() {
    this.values = []
    this._freeIndices = []
    this.size = 0
    this.allocations = 0
  }

  insert(value: T): TId {
    const index = this._freeIndices.pop() ?? this.values.length
    if (index >= INDEX_STRIDE) throw new RangeError('reactive graph arena capacity exceeded')
    const freeHandle = this.values[index]
    value[0] = (typeof freeHandle === 'number' ? freeHandle : INDEX_STRIDE + index) as TId
    this.values[index] = value
    this.size++
    this.allocations++
    return value[0]
  }

  get(id: TId): T | undefined {
    const value = this.values[id & (INDEX_STRIDE - 1)]
    return typeof value !== 'number' && value?.[0] === id ? value : undefined
  }

  remove(id: TId): boolean {
    const index = id & (INDEX_STRIDE - 1)
    if (this.get(id) === undefined) return false
    const next = id + INDEX_STRIDE
    this.values[index] = next
    if (Number.isSafeInteger(next)) {
      this._freeIndices.push(index)
    }
    this.size--
    return true
  }
}

const nextCycle = (cycle: number): number => (cycle >= Number.MAX_SAFE_INTEGER ? 0 : cycle + 1)

export type PendingComputedEffect = readonly [node: ReactiveNodeId, effectId: number]

/**
 * A topology-only graph. Values, user callbacks, scopes, and scheduling queues
 * belong to higher runtime layers; this class only returns stable effect ids.
 */
export interface GraphStorage {
  nodes: Arena<GraphNode, ReactiveNodeId>
  links: Arena<Link, LinkId>
  propagationQueue: ReactiveNodeId[]
  computedStack: number[]
  visited: ReactiveNodeId[]
  activeSubscriber: ReactiveNodeId | undefined
}
export const createGraphStorage = (): GraphStorage => ({
  nodes: new Arena(),
  links: new Arena(),
  propagationQueue: [],
  computedStack: [],
  visited: [],
  activeSubscriber: undefined,
})
export function graphDebugStats(graph: GraphStorage) {
  return {
    nodeCount: graph.nodes.size,
    linkCount: graph.links.size,
    nodeCapacity: graph.nodes.values.length,
    linkCapacity: graph.links.values.length,
    nodeRecordAllocations: graph.nodes.allocations,
    linkRecordAllocations: graph.links.allocations,
    handleObjectAllocations: 0,
    slotObjectAllocations: 0,
  }
}
export function graphLinkCount(graph: GraphStorage): number {
  return graph.links.size
}
export function graphCreateDependencyNode(graph: GraphStorage): ReactiveNodeId {
  return graphAddNode(graph, MUTABLE)
}
export function graphCreateComputedNode(graph: GraphStorage, effectId?: number): ReactiveNodeId {
  return graphAddNode(graph, COMPUTED | MUTABLE | DIRTY, effectId)
}
export function graphCreateEffectNode(graph: GraphStorage, effectId: number): ReactiveNodeId {
  return graphAddNode(graph, EFFECT | WATCHING, effectId)
}
export function graphContains(graph: GraphStorage, id: ReactiveNodeId): boolean {
  return graphNode(graph, id) !== undefined
}
export function graphBeginTracking(
  graph: GraphStorage,
  subscriber: ReactiveNodeId,
): TrackingState | undefined {
  const node = graphNode(graph, subscriber)
  if (node === undefined) return undefined

  const previous = graph.activeSubscriber
  node[NodeField.DepsTail] = undefined
  node[NodeField.Flags] |= RECURSED_CHECK
  if ((node[NodeField.Flags] & EFFECT) !== 0) node[NodeField.Flags] |= WATCHING
  graph.activeSubscriber = subscriber
  return previous ?? 0
}
export function graphEndTracking(
  graph: GraphStorage,
  subscriber: ReactiveNodeId,
  state: TrackingState,
): void {
  const node = graphNode(graph, subscriber)
  if (node !== undefined) {
    graphPurgeStaleDependencies(graph, subscriber)
    node[NodeField.Flags] = node[NodeField.Flags] & ~(RECURSED_CHECK | RECURSED | PENDING)
    if ((node[NodeField.Flags] & EFFECT) !== 0) node[NodeField.Flags] |= WATCHING
  }

  graph.activeSubscriber = state !== 0 && graphContains(graph, state) ? state : undefined
}
export function graphTrackDependency(graph: GraphStorage, id: ReactiveNodeId): boolean {
  const dependency = graphNode(graph, id)
  const subscriber =
    graph.activeSubscriber === undefined ? undefined : graphNode(graph, graph.activeSubscriber)
  if (!dependency || !subscriber || dependency === subscriber) return false
  graphLink(graph, dependency, subscriber)
  return true
}
export function graphConnect(
  graph: GraphStorage,
  dependencyId: ReactiveNodeId,
  subscriberId: ReactiveNodeId,
): boolean {
  const dependency = graphNode(graph, dependencyId)
  const subscriber = graphNode(graph, subscriberId)
  if (!dependency || !subscriber || dependency === subscriber) return false
  graphLink(graph, dependency, subscriber)
  return true
}
export function graphPropagate(graph: GraphStorage, dependency: ReactiveNodeId): number[] {
  if (!graphContains(graph, dependency)) return []
  const queue = graph.propagationQueue
  queue[0] = dependency
  let length = 1
  const effects: number[] = []
  for (let index = 0; index < length; index++) {
    // Adjacency records remain live throughout propagation; no user callback runs here.
    for (
      let edge = graphNode(graph, queue[index]!)![NodeField.SubsHead];
      edge;
      edge = edge[LinkField.NextSub]
    ) {
      const subscriber = edge[LinkField.Sub]
      if ((subscriber[NodeField.Flags] & (DIRTY | PENDING)) !== 0) continue
      subscriber[NodeField.Flags] |= PENDING
      if ((subscriber[NodeField.Flags] & COMPUTED) !== 0) queue[length++] = subscriber[0]
      else if (
        (subscriber[NodeField.Flags] & EFFECT) !== 0 &&
        (subscriber[NodeField.Flags] & WATCHING) !== 0
      ) {
        subscriber[NodeField.Flags] = subscriber[NodeField.Flags] & ~WATCHING
        effects.push(subscriber[NodeField.Effect]!)
      }
    }
  }
  return effects
}
export function graphTriggerDependency(graph: GraphStorage, id: ReactiveNodeId): number[] {
  const node = graphNode(graph, id)
  if (node === undefined) return []
  node[NodeField.Version] = nextCycle(node[NodeField.Version])
  return graphPropagate(graph, id)
}
export function graphBindComputedNode(
  graph: GraphStorage,
  id: ReactiveNodeId,
  effectId: number,
): boolean {
  const node = graphNode(graph, id)
  if (node === undefined) return false
  node[NodeField.Effect] = effectId
  node[NodeField.Flags] = (node[NodeField.Flags] & ~EFFECT) | COMPUTED | MUTABLE | DIRTY
  return true
}
export function graphInvalidateComputed(graph: GraphStorage, id: ReactiveNodeId): number[] {
  const node = graphNode(graph, id)
  if (node === undefined) return []
  node[NodeField.Flags] |= DIRTY
  return graphPropagate(graph, id)
}
export function graphNodeNeedsUpdate(graph: GraphStorage, id: ReactiveNodeId): boolean {
  const node = graphNode(graph, id)
  return node !== undefined && (node[NodeField.Flags] & (DIRTY | PENDING)) !== 0
}
export function graphCommitComputed(
  graph: GraphStorage,
  id: ReactiveNodeId,
  changed: boolean,
): void {
  const node = graphNode(graph, id)
  if (node !== undefined && changed) node[NodeField.Version] = nextCycle(node[NodeField.Version])
  graphMarkNodeClean(graph, id)
}
export function graphMarkNodeClean(graph: GraphStorage, id: ReactiveNodeId): void {
  const node = graphNode(graph, id)
  if (node === undefined) return
  node[NodeField.Flags] = node[NodeField.Flags] & ~(DIRTY | PENDING | RECURSED)
  if ((node[NodeField.Flags] & EFFECT) !== 0) node[NodeField.Flags] |= WATCHING
}
export function graphPendingComputedEffects(
  graph: GraphStorage,
  subscriber: ReactiveNodeId,
): PendingComputedEffect[] {
  const output: PendingComputedEffect[] = []
  const visited = graph.visited
  const stack = graph.computedStack

  let linkId = graphNode(graph, subscriber)?.[NodeField.DepsTail]
  while (linkId !== undefined) {
    const edge = linkId
    if (edge === undefined) break
    stack.push(edge[LinkField.Dep][0])
    linkId = edge[LinkField.PrevDep]
  }

  while (stack.length > 0) {
    const entry = stack.pop()
    if (entry === undefined) break
    const expanded = entry < 0
    const nodeId = (expanded ? -entry : entry) as ReactiveNodeId
    const node = graphNode(graph, nodeId)
    if (
      node === undefined ||
      !((node[NodeField.Flags] & COMPUTED) !== 0) ||
      !((node[NodeField.Flags] & (DIRTY | PENDING)) !== 0)
    ) {
      continue
    }

    if (expanded) {
      if (node[NodeField.Effect] !== undefined) output.push([nodeId, node[NodeField.Effect]])
      continue
    }
    if ((node[NodeField.Flags] & RECURSED) !== 0) continue

    node[NodeField.Flags] |= RECURSED
    visited.push(nodeId)
    stack.push(-nodeId)

    let dependencyLinkId = node[NodeField.DepsTail]
    while (dependencyLinkId !== undefined) {
      const edge = dependencyLinkId
      if (edge === undefined) break
      stack.push(edge[LinkField.Dep][0])
      dependencyLinkId = edge[LinkField.PrevDep]
    }
  }

  for (const nodeId of visited) {
    const node = graphNode(graph, nodeId)
    if (node !== undefined) node[NodeField.Flags] = node[NodeField.Flags] & ~RECURSED
  }
  visited.length = 0
  return output
}
export function graphSubscriberNeedsRun(graph: GraphStorage, subscriber: ReactiveNodeId): boolean {
  const node = graphNode(graph, subscriber)
  if (node === undefined) return false
  if (!((node[NodeField.Flags] & (DIRTY | PENDING)) !== 0)) return true

  let linkId = node[NodeField.DepsHead]
  while (linkId !== undefined) {
    const edge = linkId
    if (edge === undefined) break
    const dependency = edge[LinkField.Dep]
    if (dependency !== undefined && dependency[NodeField.Version] !== edge[LinkField.Version])
      return true
    linkId = edge[LinkField.NextDep]
  }
  return false
}
export function graphRemoveNode(graph: GraphStorage, id: ReactiveNodeId): boolean {
  const node = graphNode(graph, id)
  if (!node) return false
  while (node[NodeField.DepsHead]) graphUnlink(graph, node[NodeField.DepsHead])
  while (node[NodeField.SubsHead]) graphUnlink(graph, node[NodeField.SubsHead])
  if (graph.activeSubscriber === id) graph.activeSubscriber = undefined
  return graph.nodes.remove(id)
}
export function graphDependenciesOf(
  graph: GraphStorage,
  subscriber: ReactiveNodeId,
): ReactiveNodeId[] {
  const dependencies: ReactiveNodeId[] = []
  let linkId = graphNode(graph, subscriber)?.[NodeField.DepsHead]
  while (linkId !== undefined) {
    const edge = linkId
    if (edge === undefined) break
    dependencies.push(edge[LinkField.Dep][0])
    linkId = edge[LinkField.NextDep]
  }
  return dependencies
}
export function graphSubscriberCount(graph: GraphStorage, dependency: ReactiveNodeId): number {
  let count = 0
  let linkId = graphNode(graph, dependency)?.[NodeField.SubsHead]
  while (linkId !== undefined) {
    const edge = linkId
    if (edge === undefined) break
    count += 1
    linkId = edge[LinkField.NextSub]
  }
  return count
}
export function graphValueVersionOf(graph: GraphStorage, id: ReactiveNodeId): number | undefined {
  return graphNode(graph, id)?.[NodeField.Version]
}
function graphAddNode(graph: GraphStorage, flags: Flags, effectId?: number): ReactiveNodeId {
  const node: GraphNode = [
    0 as ReactiveNodeId,
    effectId,
    flags,
    0,
    undefined,
    undefined,
    undefined,
    undefined,
  ]
  graph.nodes.insert(node)
  return node[0]
}
function graphNode(graph: GraphStorage, id: ReactiveNodeId): GraphNode | undefined {
  return graph.nodes.get(id)
}
function graphLink(graph: GraphStorage, dependency: GraphNode, subscriber: GraphNode): void {
  const previous = subscriber[NodeField.DepsTail]
  if (previous?.[LinkField.Dep] === dependency) return
  const next = previous ? previous[LinkField.NextDep] : subscriber[NodeField.DepsHead]
  if (next?.[LinkField.Dep] === dependency) {
    next[LinkField.Version] = dependency[NodeField.Version]
    subscriber[NodeField.DepsTail] = next
    return
  }
  // Only the prefix through the current tail has been read in this pass.
  // This remains valid when nested subscribers read the same dependencies.
  for (
    let edge = previous && subscriber[NodeField.DepsHead];
    edge && edge !== previous;
    edge = edge[LinkField.NextDep]
  ) {
    if (edge[LinkField.Dep] === dependency) return
  }
  const previousSubscriber = dependency[NodeField.SubsTail]
  const link: Link = [
    0 as LinkId,
    dependency[NodeField.Version],
    dependency,
    subscriber,
    previous,
    next,
    previousSubscriber,
    undefined,
  ]
  graph.links.insert(link)
  dependency[NodeField.SubsTail] = link
  if (!dependency[NodeField.SubsHead]) dependency[NodeField.SubsHead] = link
  subscriber[NodeField.DepsTail] = link
  if (previous) previous[LinkField.NextDep] = link
  else subscriber[NodeField.DepsHead] = link
  if (next) next[LinkField.PrevDep] = link
  if (previousSubscriber) previousSubscriber[LinkField.NextSub] = link
}
function graphPurgeStaleDependencies(graph: GraphStorage, subscriber: ReactiveNodeId): void {
  const node = graphNode(graph, subscriber)
  if (node === undefined) return

  let linkId =
    node[NodeField.DepsTail] === undefined
      ? node[NodeField.DepsHead]
      : node[NodeField.DepsTail]?.[LinkField.NextDep]
  while (linkId !== undefined) {
    const next = linkId?.[LinkField.NextDep]
    graphUnlink(graph, linkId)
    linkId = next
  }
}
function graphUnlink(graph: GraphStorage, edge: Link): void {
  const [
    ,
    ,
    dependency,
    subscriber,
    previousDependency,
    nextDependency,
    previousSubscriber,
    nextSubscriber,
  ] = edge
  if (previousDependency) previousDependency[LinkField.NextDep] = nextDependency
  else subscriber[NodeField.DepsHead] = nextDependency
  if (nextDependency) nextDependency[LinkField.PrevDep] = previousDependency
  else subscriber[NodeField.DepsTail] = previousDependency
  if (previousSubscriber) previousSubscriber[LinkField.NextSub] = nextSubscriber
  else dependency[NodeField.SubsHead] = nextSubscriber
  if (nextSubscriber) nextSubscriber[LinkField.PrevSub] = previousSubscriber
  else dependency[NodeField.SubsTail] = previousSubscriber
  graph.links.remove(edge[0])
}
