import { afterEach, describe, expect, it } from 'vitest'

import { setReactiveScheduling, shallowRef, watchEffect } from '@rue-js/rue'

afterEach(() => {
  document.body.innerHTML = ''
  setReactiveScheduling('microtask')
})

describe('shallowRef api', () => {
  it('tracks only .value access and keeps nested objects non-reactive', () => {
    setReactiveScheduling('sync')

    const state = shallowRef({ count: 1 })
    const seen: number[] = []
    const effect = watchEffect(() => {
      seen.push(state.value.count)
    })

    expect(state.value).toEqual({ count: 1 })
    expect(seen).toEqual([1])

    state.value.count = 2

    expect(seen).toEqual([1])

    state.value = { count: 3 }

    expect(seen).toEqual([1, 3])

    effect.dispose()
  })

  it('supports the same equals option shape as ref', () => {
    setReactiveScheduling('sync')

    const state = shallowRef({ count: 1 }, { equals: (prev, next) => prev.count === next.count })
    const seen: number[] = []
    const effect = watchEffect(() => {
      seen.push(state.value.count)
    })

    expect(seen).toEqual([1])

    state.value = { count: 1 }

    expect(seen).toEqual([1])

    state.value = { count: 2 }

    expect(seen).toEqual([1, 2])

    effect.dispose()
  })
})
