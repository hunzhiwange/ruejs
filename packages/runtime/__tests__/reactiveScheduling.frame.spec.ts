import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling, signal, watchEffect } from '../src'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  setReactiveScheduling('microtask')
})

describe('reactive frame scheduling fallback', () => {
  it('falls back to a timeout when requestAnimationFrame is throttled', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    )

    setReactiveScheduling('frame')

    const count = signal(0, {})
    let latest = -1

    watchEffect(() => {
      latest = count.get()
    })

    expect(latest).toBe(0)

    count.set(1)
    expect(latest).toBe(0)

    await vi.advanceTimersByTimeAsync(34)

    expect(latest).toBe(1)
  })
})
