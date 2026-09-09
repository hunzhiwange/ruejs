import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  customRef,
  isReactive,
  isRef,
  ref,
  setReactiveScheduling,
  triggerRef,
  watch,
  watchEffect,
} from '@rue-js/rue'

afterEach(() => {
  document.body.innerHTML = ''
  setReactiveScheduling('microtask')
  vi.useRealTimers()
})

describe('customRef api', () => {
  it('tracks and triggers only when the factory requests it', () => {
    setReactiveScheduling('sync')

    let value = 1
    let notify!: () => void
    const state = customRef<number>((track, trigger) => {
      notify = trigger
      return {
        get() {
          track()
          return value
        },
        set(next) {
          value = next
        },
      }
    })
    const seen: number[] = []
    const effect = watchEffect(() => {
      seen.push(state.value)
    })

    expect(isRef(state)).toBe(true)
    expect(seen).toEqual([1])

    state.value = 2

    expect(seen).toEqual([1])

    notify()

    expect(seen).toEqual([1, 2])

    state.value = 3
    triggerRef(state)

    expect(seen).toEqual([1, 2, 3])

    effect.dispose()
  })

  it('runs setter-triggered updates synchronously when the setter calls trigger', () => {
    setReactiveScheduling('sync')

    let value = 'ready'
    const state = customRef<string>((track, trigger) => ({
      get() {
        track()
        return value
      },
      set(next) {
        value = next
        trigger()
      },
    }))
    const seen: string[] = []
    const effect = watchEffect(() => {
      seen.push(state.value)
    })

    state.value = 'done'

    expect(seen).toEqual(['ready', 'done'])

    effect.dispose()
  })

  it('preserves custom setter timing when nested in reactive state', () => {
    setReactiveScheduling('sync')
    vi.useFakeTimers()

    let value = 'ready'
    const state = customRef<string>((track, trigger) => ({
      get() {
        track()
        return value
      },
      set(next) {
        setTimeout(() => {
          value = next
          trigger()
        }, 100)
      },
    }))
    const wrapper = ref({ state })

    wrapper.value.state.value = 'done'

    expect(wrapper.value.state.value).toBe('ready')
    vi.advanceTimersByTime(100)
    expect(wrapper.value.state.value).toBe('done')
  })

  it('does not subscribe effects when get omits track', () => {
    setReactiveScheduling('sync')

    let value = 1
    const state = customRef<number>((_track, trigger) => ({
      get() {
        return value
      },
      set(next) {
        value = next
        trigger()
      },
    }))
    const seen: number[] = []
    const effect = watchEffect(() => {
      seen.push(state.value)
    })

    expect(seen).toEqual([1])

    state.value = 2

    expect(state.value).toBe(2)
    expect(seen).toEqual([1])

    effect.dispose()
  })

  it('supports conditional tracking controlled by the getter', () => {
    setReactiveScheduling('sync')

    let value = 1
    let shouldTrack = false
    const refresh = ref(0)
    const state = customRef<number>((track, trigger) => ({
      get() {
        if (shouldTrack) {
          track()
        }
        return value
      },
      set(next) {
        value = next
        trigger()
      },
    }))
    const seen: number[] = []
    const refreshSeen: number[] = []
    const effect = watchEffect(() => {
      refreshSeen.push(refresh.value)
      seen.push(state.value)
    })

    expect(seen).toEqual([1])
    expect(refreshSeen).toEqual([0])

    state.value = 2

    expect(seen).toEqual([1])
    expect(refreshSeen).toEqual([0])

    shouldTrack = true
    refresh.value++

    expect(seen).toEqual([1, 2])
    expect(refreshSeen).toEqual([0, 1])

    state.value = 3

    expect(seen).toEqual([1, 2, 3])
    expect(refreshSeen).toEqual([0, 1, 1])

    effect.dispose()
  })

  it('supports debounced setters that trigger after a timer', () => {
    setReactiveScheduling('sync')
    vi.useFakeTimers()

    let value = 'r'
    let timer: ReturnType<typeof setTimeout> | undefined
    const state = customRef<string>((track, trigger) => ({
      get() {
        track()
        return value
      },
      set(next) {
        if (timer !== undefined) {
          clearTimeout(timer)
        }
        timer = setTimeout(() => {
          value = next
          timer = undefined
          trigger()
        }, 100)
      },
    }))
    const seen: string[] = []
    const effect = watchEffect(() => {
      seen.push(state.value)
    })

    state.value = 'ru'
    state.value = 'rue'
    vi.advanceTimersByTime(99)

    expect(seen).toEqual(['r'])

    vi.advanceTimersByTime(1)

    expect(seen).toEqual(['r', 'rue'])

    state.value = 'ruejs'
    vi.advanceTimersByTime(100)

    expect(seen).toEqual(['r', 'rue', 'ruejs'])

    effect.dispose()
  })

  it('notifies multiple subscribers from one trigger', () => {
    setReactiveScheduling('sync')

    let value = 1
    const state = customRef<number>((track, trigger) => ({
      get() {
        track()
        return value
      },
      set(next) {
        value = next
        trigger()
      },
    }))
    const first: number[] = []
    const second: number[] = []
    const firstEffect = watchEffect(() => {
      first.push(state.value)
    })
    const secondEffect = watchEffect(() => {
      second.push(state.value * 10)
    })

    state.value = 2

    expect(first).toEqual([1, 2])
    expect(second).toEqual([10, 20])

    firstEffect.dispose()
    secondEffect.dispose()
  })

  it('stops notifying a disposed effect', () => {
    setReactiveScheduling('sync')

    let value = 1
    const state = customRef<number>((track, trigger) => ({
      get() {
        track()
        return value
      },
      set(next) {
        value = next
        trigger()
      },
    }))
    const seen: number[] = []
    const effect = watchEffect(() => {
      seen.push(state.value)
    })

    state.value = 2
    effect.dispose()
    state.value = 3

    expect(seen).toEqual([1, 2])
  })

  it('works as a watch source', () => {
    setReactiveScheduling('sync')

    let value = 1
    const state = customRef<number>((track, trigger) => ({
      get() {
        track()
        return value
      },
      set(next) {
        value = next
        trigger()
      },
    }))
    const changes: Array<[number, number]> = []
    const effect = watch(state, (next, prev) => {
      changes.push([next, prev])
    })

    state.value = 2
    state.value = 3

    expect(changes).toEqual([
      [2, 1],
      [3, 2],
    ])

    effect.dispose()
  })

  it('works inside an array watch source', () => {
    setReactiveScheduling('sync')

    let first = 1
    let second = 'a'
    const firstRef = customRef<number>((track, trigger) => ({
      get() {
        track()
        return first
      },
      set(next) {
        first = next
        trigger()
      },
    }))
    const secondRef = customRef<string>((track, trigger) => ({
      get() {
        track()
        return second
      },
      set(next) {
        second = next
        trigger()
      },
    }))
    const changes: Array<[unknown[], unknown[]]> = []
    const effect = watch([firstRef, secondRef], (next, prev) => {
      changes.push([next, prev])
    })

    firstRef.value = 2
    secondRef.value = 'b'

    expect(changes).toEqual([
      [
        [2, 'a'],
        [1, 'a'],
      ],
      [
        [2, 'b'],
        [2, 'a'],
      ],
    ])

    effect.dispose()
  })

  it('identifies custom refs by their marker', () => {
    const state = customRef<number>((track, trigger) => ({
      get() {
        track()
        return 1
      },
      set() {
        trigger()
      },
    }))
    const refDescriptor = Object.getOwnPropertyDescriptor(state, '__rue_ref__')
    const triggerDescriptor = Object.getOwnPropertyDescriptor(state, '__rue_trigger_ref__')

    expect(isRef(state)).toBe(true)
    expect(isReactive(state)).toBe(true)
    expect(state.value).toBe(1)
    expect(Object.keys(state)).toEqual(['value'])
    expect(refDescriptor).toMatchObject({
      configurable: false,
      enumerable: false,
      value: true,
      writable: false,
    })
    expect(triggerDescriptor).toMatchObject({
      configurable: true,
      enumerable: false,
      writable: false,
    })
    expect(typeof triggerDescriptor?.value).toBe('function')
  })

  it('binds get and set to the factory returned object', () => {
    setReactiveScheduling('sync')

    type Box = {
      current: string
      get(this: Box): string
      set(this: Box, next: string): void
    }

    const state = customRef<string>((track, trigger) => {
      const box: Box = {
        current: 'draft',
        get() {
          track()
          return this.current
        },
        set(next) {
          this.current = next
          trigger()
        },
      }
      return box
    })
    const seen: string[] = []
    const effect = watchEffect(() => {
      seen.push(state.value)
    })

    state.value = 'ready'

    expect(seen).toEqual(['draft', 'ready'])

    effect.dispose()
  })

  it('calls the factory only once per customRef instance', () => {
    let factoryCalls = 0
    let value = 1
    const state = customRef<number>((track, trigger) => {
      factoryCalls++
      return {
        get() {
          track()
          return value
        },
        set(next) {
          value = next
          trigger()
        },
      }
    })

    expect(factoryCalls).toBe(1)

    expect(state.value).toBe(1)
    state.value = 2
    expect(state.value).toBe(2)

    expect(factoryCalls).toBe(1)
  })

  it('tolerates missing get and set definitions', () => {
    const state = customRef<number>(() => ({}) as any)

    expect(isRef(state)).toBe(true)
    expect(state.value).toBeUndefined()
    expect(() => {
      state.value = 1
      triggerRef(state)
      triggerRef({} as any)
      triggerRef(null as any)
    }).not.toThrow()
  })

  it('tolerates factories that return non-object definitions', () => {
    const state = customRef<number>(() => null as any)

    expect(isRef(state)).toBe(true)
    expect(state.value).toBeUndefined()
    expect(() => {
      state.value = 1
    }).not.toThrow()
  })
})
