import { describe, expect, it, vi } from 'vitest'

import { watch } from '../src/reactivity/index'
import { setReactiveScheduling, signal } from '../src/reactive-core'

describe('compiled watch dependency isolation', () => {
  it.each([false, true])('tracks only its source with immediate=%s', immediate => {
    setReactiveScheduling('sync')
    const source = signal(0)
    const scheduled = signal(false)
    const callback = vi.fn(() => {
      if (!scheduled.get()) scheduled.set(true)
    })
    const watcher = watch(() => source.get(), callback, { immediate })

    try {
      expect(callback).toHaveBeenCalledTimes(immediate ? 1 : 0)
      source.set(1)
      expect(callback).toHaveBeenLastCalledWith(1, 0)
      const calls = callback.mock.calls.length

      scheduled.set(false)
      expect(callback).toHaveBeenCalledTimes(calls)
      expect(scheduled.get()).toBe(false)

      source.set(2)
      expect(callback).toHaveBeenCalledTimes(calls + 1)
      expect(callback).toHaveBeenLastCalledWith(2, 1)
    } finally {
      watcher.dispose()
      source.dispose()
      scheduled.dispose()
    }
  })
})

describe('compact reactive primitives', () => {
  it('batches computed/watch updates and stops descendants with their owner', async () => {
    const r = await import('../src/compiler-runtime/entries/reactive')
    r.setReactiveScheduling('microtask')
    const parent = r.createOwner()
    const events: number[] = []
    let reads = 0
    let source!: ReturnType<typeof r.signal<number>>
    r.runWithOwner(parent, () => {
      const child = r.createOwner()
      r.runWithOwner(child, () => {
        source = r.signal(1)
        const doubled = r.computed(() => {
          reads++
          return source.get() * 2
        })
        r.watch(
          () => doubled.value,
          next => {
            events.push(next)
          },
          { immediate: true },
        )
      })
    })
    expect([reads, events]).toEqual([1, [2]])
    r.batch(() => {
      source.set(2)
      source.set(3)
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(events).toEqual([2, 6])
    r.disposeOwner(parent)
    source.set(4)
    await Promise.resolve()
    expect(events).toEqual([2, 6])
    r.setReactiveScheduling('frame')
  })
})
