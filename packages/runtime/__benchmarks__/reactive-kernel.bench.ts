/** Fixed workloads shared by the standalone runner. An operation is one loop iteration;
 * graph propagation visits 10,000 effects, batch performs 100 writes, and handles
 * creates then releases 100,000 signals per invocation. Setup is outside timing.
 * Graph instrumentation runs separately so counters do not distort CPU results.
 */
import { ReactiveEffectRuntime, createEffect } from '../src/runtime-core/reactive-kernel/effect'
import { createSignal } from '../src/runtime-core/reactive-kernel/signal'

export const WORKLOADS = [
  'signal-shallow',
  'signal-depth4',
  'graph-10000',
  'signal-array-10000',
  'batch-100',
  'handles-100000',
]

export function createWorkload(name: string, instrument = false) {
  const runtime = new ReactiveEffectRuntime({
    onErrorCaptured: error => {
      throw error
    },
  })
  runtime.setScheduling('sync')
  const graph = runtime.graph
  let nodes = 0,
    graphNodesPeak = 0,
    graphEdgesPeak = 0
  const sampleGraph = () => {
    graphNodesPeak = Math.max(graphNodesPeak, nodes)
    graphEdgesPeak = Math.max(graphEdgesPeak, graph.linkCount)
  }
  if (instrument) {
    // Observe the shared storage, so both function and class entry paths count.
    for (const kind of ['nodes', 'links'] as const) {
      const arena = graph.storage[kind]
      const insert = arena.insert.bind(arena)
      Reflect.set(arena, 'insert', (...args: unknown[]) => {
        const id = Reflect.apply(insert, arena, args)
        if (kind === 'nodes') nodes++
        sampleGraph()
        return id
      })
      const remove = arena.remove.bind(arena)
      Reflect.set(arena, 'remove', (...args: unknown[]) => {
        const removed = Reflect.apply(remove, arena, args)
        if (kind === 'nodes' && removed !== undefined) nodes--
        return removed
      })
    }
  }
  const releases: Array<() => void> = []
  const signal = <T>(value: T) => {
    const handle = createSignal(runtime, value)
    releases.push(() => handle.dispose())
    return handle
  }
  const observe = (callback: () => void) => {
    const handle = createEffect(runtime, callback)
    releases.push(() => handle.dispose())
  }
  let operations = 10000
  let run: () => void
  let check: () => void = () => {}
  const assert = (condition: boolean) => {
    if (!condition) throw new Error(`workload failed: ${name}`)
  }
  if (name === 'handles-100000') {
    operations = 100000
    run = () => {
      const handles = Array.from({ length: operations }, (_, i) => createSignal(runtime, i))
      assert(handles[operations - 1].get() === operations - 1)
      for (const handle of handles) handle.dispose()
    }
    check = () => {
      if (instrument) assert(nodes === 0 && graph.linkCount === 0)
    }
  } else if (name === 'graph-10000' || name === 'batch-100') {
    const source = signal(0)
    let hits = 0
    const subscribers = name === 'graph-10000' ? 10000 : 1
    for (let i = 0; i < subscribers; i++)
      observe(() => {
        source.get()
        hits++
      })
    operations = name === 'graph-10000' ? 20 : 1000
    run = () => {
      const before = hits
      for (let i = 0; i < operations; i++) {
        if (name === 'batch-100')
          runtime.batch(() => {
            for (let j = 0; j < 100; j++) source.set(source.peek() + 1)
          })
        else source.set(source.peek() + 1)
      }
      assert(hits - before === operations * subscribers)
    }
  } else {
    const array = name.includes('array')
    const deep = name.includes('depth4')
    const initial = array
      ? { items: Array.from({ length: 10000 }, () => ({ value: 0 })) }
      : deep
        ? { a: { b: { c: { value: 0 } } } }
        : { value: 0 }
    const path = array ? ['items', 5000, 'value'] : deep ? ['a', 'b', 'c', 'value'] : ['value']
    operations = array ? 1000 : 10000
    let read: () => number, write: (value: number) => void
    const state = signal(initial)
    read = () => state.getPath(path) as number
    write = value => state.setPath(path, value)
    let hits = 0
    observe(() => {
      read()
      hits++
    })
    run = () => {
      const before = hits
      for (let i = 0; i < operations; i++) write(read() + 1)
      assert(hits - before === operations)
    }
    check = () => assert(read() === operations)
  }
  return {
    operations,
    run,
    check,
    stats: () => {
      sampleGraph()
      return { graphNodesPeak, graphEdgesPeak }
    },
    dispose: () => {
      for (const release of releases.reverse()) release()
      if (instrument) assert(graph.debugStats().nodeCount === 0 && graph.linkCount === 0)
    },
  }
}
