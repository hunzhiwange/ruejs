// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReactiveRuntimeState } from '../src/runtime-core/reactive-kernel/runtime-state'
import { ReactiveScheduler } from '../src/runtime-core/reactive-kernel/scheduler'
import { EffectScopeManager } from '../src/runtime-core/reactive-kernel/scope'

const replaceWindowMethod = (
  name: 'requestAnimationFrame' | 'setTimeout',
  value: unknown,
): (() => void) => {
  const descriptor = Object.getOwnPropertyDescriptor(window, name)
  Object.defineProperty(window, name, { configurable: true, value, writable: true })
  return () => {
    if (descriptor === undefined) Reflect.deleteProperty(window, name)
    else Object.defineProperty(window, name, descriptor)
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('runtime TypeScript runtime state', () => {
  it('isolates instances and restores nested execution context after errors', () => {
    const state = new ReactiveRuntimeState()
    const other = new ReactiveRuntimeState()

    expect(state.schedulingMode).toBe('frame')
    state.schedulingMode = 'sync'
    expect(other.schedulingMode).toBe('frame')

    expect(() =>
      state.runWithEffect(1, () => {
        expect(state.currentEffectId).toBe(1)
        expect(state.isEffectActive(1)).toBe(true)

        state.runWithEffect(2, () => {
          expect(state.currentEffectId).toBe(2)
          expect(state.isEffectActive(1)).toBe(true)
          expect(state.isEffectActive(2)).toBe(true)
        })

        expect(state.currentEffectId).toBe(1)
        state.runUntracked(() => expect(state.currentEffectId).toBeUndefined())
        expect(state.currentEffectId).toBe(1)
        throw new Error('effect failed')
      }),
    ).toThrow('effect failed')

    expect(state.currentEffectId).toBeUndefined()
    expect(state.isEffectActive(1)).toBe(false)
    expect(state.isEffectActive(2)).toBe(false)
  })
})

describe('runtime TypeScript scheduler', () => {
  it('runs sync jobs immediately but defers an active ancestor instead of re-entering it', async () => {
    const state = new ReactiveRuntimeState()
    const scheduler = new ReactiveScheduler(state)
    const events: string[] = []
    state.schedulingMode = 'sync'

    scheduler.schedule(1, () => {
      events.push('parent:start')
      scheduler.schedule(2, () => {
        events.push('child')
        scheduler.schedule(1, () => events.push('parent:deferred'))
      })
      events.push('parent:end')
    })

    expect(events).toEqual(['parent:start', 'child', 'parent:end'])
    await scheduler.nextTick()
    expect(events).toEqual(['parent:start', 'child', 'parent:end', 'parent:deferred'])

    state.runWithEffect(3, () => {
      scheduler.schedule(3, () => events.push('active-effect:deferred'))
      expect(events).not.toContain('active-effect:deferred')
    })
    await scheduler.nextTick()
    expect(events[events.length - 1]).toBe('active-effect:deferred')
  })

  it('keeps insertion order, deduplicates a round, and waits for cascading flushes', async () => {
    const state = new ReactiveRuntimeState()
    const scheduler = new ReactiveScheduler(state)
    const events: string[] = []
    state.schedulingMode = 'microtask'

    scheduler.schedule(1, () => {
      events.push('first')
      scheduler.schedule(3, () => events.push('cascade'))
    })
    scheduler.schedule(2, () => events.push('second'))
    expect(scheduler.schedule(1, () => events.push('duplicate'))).toBe(false)

    expect(events).toEqual([])
    await scheduler.nextTick(() => events.push('tick'))

    expect(events).toEqual(['first', 'second', 'cascade', 'tick'])
    expect(scheduler.pendingCount).toBe(0)
    expect(scheduler.isFlushPending).toBe(false)
  })

  it('batches nested updates until the outer boundary and runs each id once', () => {
    const state = new ReactiveRuntimeState()
    const scheduler = new ReactiveScheduler(state)
    const events: string[] = []
    state.schedulingMode = 'sync'

    const result = scheduler.batch(() => {
      scheduler.schedule(1, () => events.push('first'))
      scheduler.batch(() => {
        scheduler.schedule(2, () => events.push('second'))
        scheduler.schedule(1, () => events.push('duplicate'))
        expect(events).toEqual([])
      })
      expect(events).toEqual([])
      return 'result'
    })

    expect(result).toBe('result')
    expect(events).toEqual(['first', 'second'])
  })

  it('checks queued activity before entering job context and skips deactivated jobs', async () => {
    const state = new ReactiveRuntimeState()
    const scheduler = new ReactiveScheduler(state)
    state.schedulingMode = 'microtask'
    let active = true
    const run = vi.fn()
    const isActive = vi.fn(() => {
      expect(state.isScheduledJobActive(1)).toBe(false)
      return active
    })
    scheduler.schedule(1, run, isActive)
    active = false
    await scheduler.nextTick()
    expect(run).not.toHaveBeenCalled()
    expect(isActive).toHaveBeenCalledTimes(2)
    expect(state.isScheduledJobActive(1)).toBe(false)
  })

  it('keeps an empty nextTick asynchronous without creating a flush', async () => {
    const state = new ReactiveRuntimeState()
    const scheduler = new ReactiveScheduler(state)
    const events: string[] = []

    const tick = scheduler.nextTick(() => events.push('tick'))
    expect(events).toEqual([])
    await tick

    expect(events).toEqual(['tick'])
    expect(scheduler.isFlushPending).toBe(false)

    state.schedulingMode = 'microtask'
    scheduler.schedule(1, () => events.push('cancelled-job'))
    expect(scheduler.cancel(1)).toBe(true)
    const cancelledTick = scheduler.nextTick(() => events.push('cancelled-tick'))
    await Promise.resolve()
    await Promise.resolve()
    expect(events).toEqual(['tick', 'cancelled-tick'])
    await cancelledTick
  })

  it('falls back from frame mode to a microtask when requestAnimationFrame is absent', async () => {
    const restoreRaf = replaceWindowMethod('requestAnimationFrame', undefined)
    try {
      const state = new ReactiveRuntimeState()
      const scheduler = new ReactiveScheduler(state)
      const events: string[] = []

      scheduler.schedule(1, () => events.push('frame-fallback'))
      expect(events).toEqual([])
      await scheduler.nextTick()

      expect(events).toEqual(['frame-fallback'])
    } finally {
      restoreRaf()
    }
  })

  it('uses one RAF with a 34ms guard and ignores duplicate host callbacks', () => {
    vi.useFakeTimers()
    const rafCallbacks: FrameRequestCallback[] = []
    const raf = vi.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback)
      return 1
    })
    const restoreRaf = replaceWindowMethod('requestAnimationFrame', raf)
    try {
      const state = new ReactiveRuntimeState()
      const scheduler = new ReactiveScheduler(state)
      const events: string[] = []

      scheduler.schedule(1, () => events.push('first'))
      scheduler.schedule(2, () => events.push('second'))
      expect(raf).toHaveBeenCalledTimes(1)
      expect(vi.getTimerCount()).toBe(1)

      rafCallbacks[0]?.(0)
      rafCallbacks[0]?.(1)
      vi.advanceTimersByTime(34)

      expect(events).toEqual(['first', 'second'])
      expect(vi.getTimerCount()).toBe(0)
      expect(scheduler.isFlushPending).toBe(false)
    } finally {
      restoreRaf()
    }
  })

  it('settles cascading frame jobs in the same host flush', () => {
    vi.useFakeTimers()
    const rafCallbacks: FrameRequestCallback[] = []
    const raf = vi.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback)
      return rafCallbacks.length
    })
    const restoreRaf = replaceWindowMethod('requestAnimationFrame', raf)
    try {
      const state = new ReactiveRuntimeState()
      const scheduler = new ReactiveScheduler(state)
      const events: string[] = []

      scheduler.schedule(1, () => {
        events.push('parent')
        scheduler.schedule(2, () => events.push('child'))
      })

      expect(raf).toHaveBeenCalledTimes(1)
      rafCallbacks[0]?.(0)

      expect(events).toEqual(['parent', 'child'])
      expect(raf).toHaveBeenCalledTimes(1)
      expect(scheduler.pendingCount).toBe(0)
      expect(scheduler.isFlushPending).toBe(false)
    } finally {
      restoreRaf()
    }
  })

  it('lets nextTick advance a stalled frame flush independently of host callbacks', async () => {
    vi.useFakeTimers()
    const raf = vi.fn(() => 1)
    const restoreRaf = replaceWindowMethod('requestAnimationFrame', raf)
    try {
      const scheduler = new ReactiveScheduler(new ReactiveRuntimeState())
      const events: string[] = []

      scheduler.schedule(1, () => events.push('flushed'))
      await scheduler.nextTick()

      expect(events).toEqual(['flushed'])
      vi.advanceTimersByTime(34)
      expect(events).toEqual(['flushed'])
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      restoreRaf()
    }
  })
})

describe('runtime TypeScript effect scopes', () => {
  it('maintains the scope stack and disposes children, effects, then user cleanups', () => {
    const state = new ReactiveRuntimeState()
    const scopes = new EffectScopeManager(state)
    const events: string[] = []
    const parent = scopes.create()

    expect(scopes.push(parent)).toBe(true)
    expect(scopes.current).toBe(parent)
    const child = scopes.create()
    expect(scopes.push(child)).toBe(true)
    expect(scopes.current).toBe(child)

    scopes.registerEffectDisposer(() => events.push('child:effect'))
    expect(scopes.onScopeDispose(() => events.push('child:cleanup'))).toBe(true)
    expect(scopes.pop()).toBe(child)

    scopes.registerEffectDisposer(() => events.push('parent:effect'))
    expect(scopes.onScopeDispose(() => events.push('parent:cleanup'))).toBe(true)
    expect(scopes.pop()).toBe(parent)
    expect(scopes.current).toBeUndefined()

    expect(scopes.dispose(parent)).toBe(true)
    expect(events).toEqual(['child:effect', 'child:cleanup', 'parent:effect', 'parent:cleanup'])
    expect(scopes.isActive(parent)).toBe(false)
    expect(scopes.isActive(child)).toBe(false)
    expect(scopes.dispose(parent)).toBe(false)
    expect(events).toHaveLength(4)
  })

  it('keeps detached scopes alive and makes bound runners no-op after disposal', () => {
    const state = new ReactiveRuntimeState()
    const scopes = new EffectScopeManager(state)
    const parent = scopes.create()
    scopes.push(parent)
    const attached = scopes.create()
    const detached = scopes.create(true)
    scopes.pop()

    const seen: number[] = []
    const runner = scopes.bind(detached, (value: number) => {
      expect(scopes.current).toBe(detached)
      seen.push(value)
      return value * 2
    })

    expect(runner(2)).toBe(4)
    expect(scopes.dispose(parent)).toBe(true)
    expect(scopes.isActive(attached)).toBe(false)
    expect(scopes.isActive(detached)).toBe(true)
    expect(scopes.onScopeDispose(() => seen.push(99), true)).toBe(false)

    expect(scopes.dispose(detached)).toBe(true)
    expect(runner(3)).toBeUndefined()
    expect(seen).toEqual([2])
  })
})
