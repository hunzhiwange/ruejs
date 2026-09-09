import { describe, expect, it } from 'vitest'

import { ReactiveGraph, type ReactiveNodeId } from '../src/runtime-core/reactive-kernel/graph'

const track = (
  graph: ReactiveGraph,
  subscriber: ReactiveNodeId,
  dependencies: readonly ReactiveNodeId[],
): void => {
  const state = graph.beginTracking(subscriber)
  expect(state).toBeDefined()
  for (const dependency of dependencies) {
    expect(graph.trackDependency(dependency)).toBe(true)
  }
  graph.endTracking(subscriber, state!)
}

describe('runtime TypeScript reactive graph', () => {
  it('keeps stale numeric handles isolated through large-scale reuse and deduplicates propagation', () => {
    const graph = new ReactiveGraph()
    const stale: ReactiveNodeId[] = []
    for (let round = 0; round < 10_000; round++) {
      const source = graph.createDependencyNode()
      const left = graph.createComputedNode(1)
      const right = graph.createComputedNode(2)
      const first = graph.createEffectNode(3)
      const second = graph.createEffectNode(4)
      graph.connect(source, left)
      graph.connect(source, right)
      graph.connect(left, first)
      graph.connect(right, first)
      graph.connect(right, second)
      graph.markNodeClean(left)
      graph.markNodeClean(right)
      expect(graph.triggerDependency(source)).toEqual([3, 4])
      expect(graph.triggerDependency(source)).toEqual([])
      expect(graph.linkCount).toBe(5)
      for (const id of [source, left, right, first, second]) {
        stale.push(id)
        expect(graph.removeNode(id)).toBe(true)
      }
      expect(graph.linkCount).toBe(0)
    }
    const replacement = graph.createDependencyNode()
    for (const id of stale) {
      expect(graph.contains(id)).toBe(false)
      expect(graph.removeNode(id)).toBe(false)
    }
    expect(typeof replacement).toBe('number')
    expect(graph.debugStats()).toMatchObject({
      nodeCount: 1,
      linkCount: 0,
      nodeCapacity: 5,
      linkCapacity: 5,
      handleObjectAllocations: 0,
      slotObjectAllocations: 0,
      nodeRecordAllocations: 50_001,
      linkRecordAllocations: 50_000,
    })
    graph.removeNode(replacement)
    expect(graph.debugStats()).toMatchObject({ nodeCount: 0, linkCount: 0 })
  })

  it('reuses ordered links without allocations and releases an entire stale tail', () => {
    const graph = new ReactiveGraph()
    const sources = Array.from({ length: 128 }, () => graph.createDependencyNode())
    const effect = graph.createEffectNode(8)
    track(graph, effect, sources)
    const allocations = graph.debugStats().linkRecordAllocations
    for (let round = 0; round < 100; round++) track(graph, effect, sources)
    expect(graph.debugStats().linkRecordAllocations).toBe(allocations)
    track(graph, effect, [sources[0], sources[1], sources[0], sources[1]])
    expect(graph.dependenciesOf(effect)).toEqual(sources.slice(0, 2))
    expect(graph.linkCount).toBe(2)
    for (const source of sources.slice(2)) expect(graph.subscriberCount(source)).toBe(0)
    expect(graph.beginTracking(effect)).toBe(0)
    graph.endTracking(effect, 0)
    expect(graph.linkCount).toBe(0)
    for (const id of [...sources, effect]) graph.removeNode(id)
    expect(graph.debugStats().nodeCount).toBe(0)
  })

  it('ignores the cached queue tail when the next propagation has a smaller scope', () => {
    const graph = new ReactiveGraph()
    const first = graph.createDependencyNode()
    const second = graph.createDependencyNode()
    const chain = Array.from({ length: 32 }, (_, i) => graph.createComputedNode(i))
    const firstEffect = graph.createEffectNode(101)
    const secondEffect = graph.createEffectNode(102)
    let previous = first
    for (const node of chain) {
      graph.connect(previous, node)
      graph.markNodeClean(node)
      previous = node
    }
    graph.connect(previous, firstEffect)
    graph.connect(second, secondEffect)
    expect(graph.propagate(first)).toEqual([101])
    for (const node of [...chain, firstEffect]) graph.markNodeClean(node)
    expect(graph.propagate(second)).toEqual([102])
    expect(graph.nodeNeedsUpdate(firstEffect)).toBe(false)
    for (const node of chain) expect(graph.nodeNeedsUpdate(node)).toBe(false)
    expect(graph.propagate(first)).toEqual([101])
    for (const node of [first, second, ...chain, firstEffect, secondEffect]) graph.removeNode(node)
    expect(graph.debugStats()).toMatchObject({ nodeCount: 0, linkCount: 0 })
  })

  it('reuses links in read order and removes the stale dynamic tail', () => {
    const graph = new ReactiveGraph()
    const gate = graph.createDependencyNode()
    const left = graph.createDependencyNode()
    const right = graph.createDependencyNode()
    const effect = graph.createEffectNode(7)

    track(graph, effect, [gate, left])
    expect(graph.linkCount).toBe(2)
    expect(graph.dependenciesOf(effect)).toEqual([gate, left])

    track(graph, effect, [gate, right, right])

    expect(graph.dependenciesOf(effect)).toEqual([gate, right])
    expect(graph.linkCount).toBe(2)
    expect(graph.subscriberCount(left)).toBe(0)
    expect(graph.subscriberCount(right)).toBe(1)
    expect(graph.triggerDependency(left)).toEqual([])
    expect(graph.triggerDependency(right)).toEqual([7])
  })

  it('replaces the first dependency without retaining a stale head link', () => {
    const graph = new ReactiveGraph()
    const first = graph.createDependencyNode()
    const second = graph.createDependencyNode()
    const effect = graph.createEffectNode(7)

    track(graph, effect, [first])
    track(graph, effect, [second])

    expect(graph.dependenciesOf(effect)).toEqual([second])
    expect(graph.subscriberCount(first)).toBe(0)
    expect(graph.removeNode(effect)).toBe(true)
    expect(graph.linkCount).toBe(0)
    expect(graph.subscriberCount(second)).toBe(0)
  })

  it('restores nested active subscribers and supports an empty collection pass', () => {
    const graph = new ReactiveGraph()
    const outerEffect = graph.createEffectNode(1)
    const innerEffect = graph.createEffectNode(2)
    const before = graph.createDependencyNode()
    const after = graph.createDependencyNode()
    const inner = graph.createDependencyNode()

    const rootState = graph.beginTracking(outerEffect)!
    expect(graph.trackDependency(before)).toBe(true)
    const outerState = graph.beginTracking(innerEffect)!
    expect(graph.trackDependency(inner)).toBe(true)
    graph.endTracking(innerEffect, outerState)
    expect(graph.trackDependency(after)).toBe(true)
    graph.endTracking(outerEffect, rootState)

    expect(graph.dependenciesOf(outerEffect)).toEqual([before, after])
    expect(graph.dependenciesOf(innerEffect)).toEqual([inner])

    track(graph, innerEffect, [])
    expect(graph.dependenciesOf(innerEffect)).toEqual([])
    expect(graph.subscriberCount(inner)).toBe(0)
  })

  it('deduplicates outer reads after a nested tracking pass touches the same dependency', () => {
    const graph = new ReactiveGraph()
    const first = graph.createDependencyNode()
    const second = graph.createDependencyNode()
    const outer = graph.createEffectNode(1)
    const inner = graph.createEffectNode(2)
    const outerState = graph.beginTracking(outer)!
    graph.trackDependency(first)
    graph.trackDependency(second)
    const innerState = graph.beginTracking(inner)!
    graph.trackDependency(first)
    graph.endTracking(inner, innerState)
    graph.trackDependency(first)
    graph.endTracking(outer, outerState)
    expect(graph.dependenciesOf(outer)).toEqual([first, second])
    expect(graph.linkCount).toBe(3)
  })

  it('propagates a computed diamond once and preserves effect subscription order', () => {
    const graph = new ReactiveGraph()
    const source = graph.createDependencyNode()
    const left = graph.createComputedNode(1)
    const right = graph.createComputedNode(2)
    const joined = graph.createComputedNode(3)
    const firstEffect = graph.createEffectNode(41)
    const secondEffect = graph.createEffectNode(42)

    expect(graph.connect(source, left)).toBe(true)
    expect(graph.connect(source, right)).toBe(true)
    expect(graph.connect(left, joined)).toBe(true)
    expect(graph.connect(right, joined)).toBe(true)
    expect(graph.connect(joined, firstEffect)).toBe(true)
    expect(graph.connect(joined, secondEffect)).toBe(true)
    graph.markNodeClean(left)
    graph.markNodeClean(right)
    graph.markNodeClean(joined)

    expect(graph.propagate(source)).toEqual([41, 42])
    expect(graph.nodeNeedsUpdate(joined)).toBe(true)
    expect(graph.propagate(source)).toEqual([])
  })

  it('deduplicates one effect reached through root and path dependencies', () => {
    const graph = new ReactiveGraph()
    const root = graph.createDependencyNode()
    const path = graph.createDependencyNode()
    const effect = graph.createEffectNode(9)

    track(graph, effect, [root, path])

    expect(graph.triggerDependency(root)).toEqual([9])
    expect(graph.triggerDependency(path)).toEqual([])
    graph.markNodeClean(effect)
    expect(graph.triggerDependency(path)).toEqual([9])
  })

  it('returns dirty computed nodes in upstream-first postorder exactly once', () => {
    const graph = new ReactiveGraph()
    const source = graph.createDependencyNode()
    const left = graph.createComputedNode(1)
    const right = graph.createComputedNode(2)
    const joined = graph.createComputedNode(3)
    const effect = graph.createEffectNode(42)

    graph.connect(source, left)
    graph.connect(source, right)
    graph.connect(left, joined)
    graph.connect(right, joined)
    graph.connect(joined, effect)
    graph.markNodeClean(left)
    graph.markNodeClean(right)
    graph.markNodeClean(joined)

    expect(graph.triggerDependency(source)).toEqual([42])
    expect(graph.pendingComputedEffects(effect)).toEqual([
      [left, 1],
      [right, 2],
      [joined, 3],
    ])
    expect(graph.pendingComputedEffects(effect)).toEqual([
      [left, 1],
      [right, 2],
      [joined, 3],
    ])
  })

  it('uses dependency versions to skip an effect when computed output is unchanged', () => {
    const graph = new ReactiveGraph()
    const source = graph.createDependencyNode()
    const computed = graph.createComputedNode()
    const effect = graph.createEffectNode(5)

    expect(graph.bindComputedNode(computed, 17)).toBe(true)
    track(graph, computed, [source])
    graph.commitComputed(computed, true)
    track(graph, effect, [computed])

    expect(graph.valueVersionOf(source)).toBe(0)
    expect(graph.valueVersionOf(computed)).toBe(1)
    expect(graph.triggerDependency(source)).toEqual([5])
    expect(graph.valueVersionOf(source)).toBe(1)
    expect(graph.pendingComputedEffects(effect)).toEqual([[computed, 17]])

    track(graph, computed, [source])
    graph.commitComputed(computed, false)
    expect(graph.valueVersionOf(computed)).toBe(1)
    expect(graph.subscriberNeedsRun(effect)).toBe(false)

    graph.markNodeClean(effect)
    expect(graph.triggerDependency(source)).toEqual([5])
    track(graph, computed, [source])
    graph.commitComputed(computed, true)
    expect(graph.valueVersionOf(computed)).toBe(2)
    expect(graph.subscriberNeedsRun(effect)).toBe(true)
  })

  it('recollects a computed branch without leaving stale notifications downstream', () => {
    const graph = new ReactiveGraph()
    const gate = graph.createDependencyNode()
    const left = graph.createDependencyNode()
    const right = graph.createDependencyNode()
    const computed = graph.createComputedNode(17)
    const effect = graph.createEffectNode(5)

    track(graph, computed, [gate, left])
    graph.commitComputed(computed, true)
    track(graph, effect, [computed])

    expect(graph.triggerDependency(gate)).toEqual([5])
    expect(graph.pendingComputedEffects(effect)).toEqual([[computed, 17]])
    track(graph, computed, [gate, right])
    graph.commitComputed(computed, true)
    track(graph, effect, [computed])

    expect(graph.subscriberCount(left)).toBe(0)
    expect(graph.triggerDependency(left)).toEqual([])
    expect(graph.triggerDependency(right)).toEqual([5])
  })

  it('skips a downstream effect after repeated source changes revert before validation', () => {
    const graph = new ReactiveGraph()
    const source = graph.createDependencyNode()
    const computed = graph.createComputedNode(1)
    const effect = graph.createEffectNode(2)

    track(graph, computed, [source])
    graph.commitComputed(computed, true)
    track(graph, effect, [computed])

    expect(graph.triggerDependency(source)).toEqual([2])
    expect(graph.triggerDependency(source)).toEqual([])
    track(graph, computed, [source])
    graph.commitComputed(computed, false)

    expect(graph.subscriberNeedsRun(effect)).toBe(false)
  })

  it('walks a thousand-node computed chain without recursive stack growth', () => {
    const graph = new ReactiveGraph()
    const source = graph.createDependencyNode()
    let previous = source

    for (let effectId = 0; effectId < 1_000; effectId += 1) {
      const computed = graph.createComputedNode(effectId)
      expect(graph.connect(previous, computed)).toBe(true)
      graph.markNodeClean(computed)
      previous = computed
    }

    const effect = graph.createEffectNode(42)
    expect(graph.connect(previous, effect)).toBe(true)
    expect(graph.propagate(source)).toEqual([42])
    expect(graph.pendingComputedEffects(effect)).toHaveLength(1_000)
  })

  it('unlinks incoming and outgoing edges and makes repeated removal a no-op', () => {
    const graph = new ReactiveGraph()
    const source = graph.createDependencyNode()
    const computed = graph.createComputedNode(1)
    const effect = graph.createEffectNode(9)

    graph.connect(source, computed)
    graph.connect(computed, effect)
    expect(graph.linkCount).toBe(2)

    expect(graph.removeNode(computed)).toBe(true)
    expect(graph.removeNode(computed)).toBe(false)
    expect(graph.linkCount).toBe(0)
    expect(graph.subscriberCount(source)).toBe(0)
    expect(graph.dependenciesOf(effect)).toEqual([])
    expect(graph.triggerDependency(computed)).toEqual([])
    expect(graph.invalidateComputed(computed)).toEqual([])
  })

  it('rejects stale handles after a freed arena slot is reused', () => {
    const graph = new ReactiveGraph()
    const stale = graph.createDependencyNode()

    expect(graph.removeNode(stale)).toBe(true)
    const replacement = graph.createDependencyNode()
    const effect = graph.createEffectNode(11)
    track(graph, effect, [replacement])

    expect(replacement).not.toEqual(stale)
    expect(graph.contains(stale)).toBe(false)
    expect(graph.contains(replacement)).toBe(true)
    expect(graph.connect(stale, effect)).toBe(false)
    expect(graph.triggerDependency(stale)).toEqual([])
    expect(graph.removeNode(stale)).toBe(false)
    expect(graph.subscriberCount(replacement)).toBe(1)
    expect(graph.triggerDependency(replacement)).toEqual([11])
  })

  it('rejects self-links and invalid tracking handles without mutating the graph', () => {
    const graph = new ReactiveGraph()
    const dependency = graph.createDependencyNode()
    const staleEffect = graph.createEffectNode(3)
    graph.removeNode(staleEffect)

    expect(graph.connect(dependency, dependency)).toBe(false)
    expect(graph.beginTracking(staleEffect)).toBeUndefined()
    expect(graph.trackDependency(dependency)).toBe(false)
    expect(graph.linkCount).toBe(0)
  })
})
