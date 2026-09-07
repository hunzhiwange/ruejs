/**
 * triggerRef API 测试。
 *
 * 验证 shallowRef 内部对象原地修改后可手动触发依赖更新，并绕过 equals 判断。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling, shallowRef, triggerRef, watchEffect } from '@rue-js/rue'

afterEach(() => {
  document.body.innerHTML = ''
  setReactiveScheduling('microtask')
})

describe('triggerRef api', () => {
  it('manually triggers effects after mutating a shallow ref value in place', () => {
    setReactiveScheduling('sync')

    const state = shallowRef({ count: 1 })
    const seen: number[] = []
    const effect = watchEffect(() => {
      seen.push(state.value.count)
    })

    expect(seen).toEqual([1])

    state.value.count = 2

    expect(seen).toEqual([1])

    triggerRef(state)

    expect(seen).toEqual([1, 2])

    effect.dispose()
  })

  it('bypasses shallowRef equals when manually triggering', () => {
    setReactiveScheduling('sync')

    const state = shallowRef({ count: 1 }, { equals: () => true })
    const seen: number[] = []
    const effect = watchEffect(() => {
      seen.push(state.value.count)
    })

    state.value.count = 2
    triggerRef(state)

    expect(seen).toEqual([1, 2])

    effect.dispose()
  })

  it('supports compiler ref wrappers that expose the trigger ABI directly', () => {
    const trigger = vi.fn()

    triggerRef({ trigger } as never)

    expect(trigger).toHaveBeenCalledOnce()
  })
})
