import { describe, expect, it } from 'vitest'

import { createSelectorSubscriptions } from '../src/runtime-core/reactive-kernel/selector'

const untrack = <T>(callback: () => T): T => callback()

describe('shared selector subscriptions', () => {
  it('retains other selector dependencies when one selector is disposed', () => {
    const first = createSelectorSubscriptions<number>(untrack)
    const second = createSelectorSubscriptions<number>(untrack)
    let runs = 0
    const dispose = first.subscribe(() => {
      runs++
      first.track(1)
      second.track(2)
    })
    first.dispose()
    second.notify(2, 3)
    expect(runs).toBe(2)
    dispose()
    second.notify(2, 3)
    expect(runs).toBe(2)
  })

  it('refreshes dynamic keys and invokes a subscriber only once per selection change', () => {
    const selector = createSelectorSubscriptions<number>(untrack)
    let key = 1
    let runs = 0
    const dispose = selector.subscribe(() => {
      runs++
      selector.track(key)
      selector.track(key + 1)
    })
    key = 3
    selector.notify(1, 2)
    expect(runs).toBe(2)
    selector.notify(1, 2)
    expect(runs).toBe(2)
    selector.notify(3, 4)
    expect(runs).toBe(3)
    dispose()
  })

  it('detaches a callback that throws during subscription', () => {
    const selector = createSelectorSubscriptions<number>(untrack)
    let runs = 0
    expect(() =>
      selector.subscribe(() => {
        runs++
        selector.track(1)
        throw new Error('setup failed')
      }),
    ).toThrow('setup failed')
    selector.notify(1, 2)
    expect(runs).toBe(1)
  })
})
