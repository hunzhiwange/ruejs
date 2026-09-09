import { describe, expect, it } from 'vitest'
import { ReactiveEffectRuntime } from '../src/runtime-core/reactive-kernel/effect'
import { createSignal } from '../src/runtime-core/reactive-kernel/signal'

const setup = () => {
  const runtime = new ReactiveEffectRuntime()
  runtime.setScheduling('sync')
  return runtime
}
describe('Signal path Trie', () => {
  it('separates delimiter strings, symbols and noncanonical numeric keys', () => {
    const runtime = setup(),
      a = Symbol('a'),
      b = Symbol('a')
    const signal = createSignal(runtime, {
      'a/s:b': 1,
      a: { b: 2 },
      [a]: 3,
      [b]: 4,
      '01': 5,
      '1': 6,
    })
    const paths = [['a/s:b'], ['a', 'b'], [a], [b], ['01'], [1]] as const
    const hits = paths.map(() => 0)
    paths.forEach((path, i) =>
      runtime.createEffect(() => {
        signal.getPath(path)
        hits[i]++
      }),
    )
    signal.setPath(['a/s:b'], 7)
    signal.setPath([a], 8)
    signal.setPath(['01'], 9)
    expect(hits).toEqual([2, 1, 2, 1, 2, 1])
    expect(signal.peekPath(['1'])).toBe(6)
  })
  it('updates a 10000-item array in place and reuses static tokens', () => {
    const runtime = setup(),
      items = Array.from({ length: 10000 }, (_, count) => ({ count }))
    const root = { items },
      signal = createSignal(runtime, root)
    const token = signal.resolvePath(['items', 9999, 'count'])
    expect(signal.resolvePath('items.9999.count')).toBe(token)
    expect(signal.resolvePath(['items', '9999', 'count'])).toBe(token)
    for (let i = 0; i < 100; i++) signal.updatePath(token, value => Number(value) + 1)
    expect(signal.peek()).toBe(root)
    expect(signal.peek().items).toBe(items)
    expect(signal.getPath(token)).toBe(10099)
  })
  it('notifies exact, descendant and ancestor watchers precisely', () => {
    const runtime = setup(),
      signal = createSignal(runtime, { a: { b: 1 }, other: 1 })
    const hits = [0, 0, 0, 0]
    runtime.createEffect(() => {
      signal.getPath('a')
      hits[0]++
    })
    runtime.createEffect(() => {
      signal.trackPath('a', true)
      hits[1]++
    })
    runtime.createEffect(() => {
      signal.getPath('a.b')
      hits[2]++
    })
    runtime.createEffect(() => {
      signal.getPath('other')
      hits[3]++
    })
    signal.setPath('a.b', 2)
    expect(hits).toEqual([1, 2, 2, 1])
    signal.mutatePath('a', value => {
      ;(value as { b: number }).b++
    })
    expect(hits).toEqual([2, 3, 3, 1])
  })
  it('releases registered graph nodes and permits token reuse after watcher disposal', () => {
    const runtime = setup(),
      signal = createSignal(runtime, { a: { b: 1 } })
    const token = signal.resolvePath('a.b')
    const effect = runtime.createEffect(() => signal.getPath(token))
    expect(runtime.graph.debugStats().nodeCount).toBe(3)
    expect(signal.pathNodeCount).toBe(2)
    effect.dispose()
    signal.triggerPath(token)
    expect(runtime.graph.debugStats().nodeCount).toBe(1)
    let hits = 0
    const nextEffect = runtime.createEffect(() => {
      signal.getPath(token)
      hits++
    })
    signal.setPath(token, 2)
    expect(hits).toBe(2)
    signal.dispose()
    expect(signal.pathNodeCount).toBe(0)
    nextEffect.dispose()
    expect(runtime.graph.debugStats().nodeCount).toBe(0)
  })
})
