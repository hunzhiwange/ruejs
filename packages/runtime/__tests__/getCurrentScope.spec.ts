/**
 * getCurrentScope 运行时测试。
 *
 * 覆盖无 active scope、Vapor setup、watchEffect 重跑以及 scope.run 的作用域恢复。
 */
import { afterEach, describe, expect, it } from 'vitest'

import { getCurrentScope, ref, render, setReactiveScheduling, watchEffect } from '../src'
import type { EffectScope } from '../src'
import { _$compiledRoot } from './legacy-test-render'

afterEach(() => {
  render(null as any, document.body as any)
  document.body.innerHTML = ''
  setReactiveScheduling('microtask')
})

describe('getCurrentScope', () => {
  it('returns undefined when no effect scope is active', () => {
    expect(getCurrentScope()).toBeUndefined()
  })

  it('returns the active vapor scope during setup and scoped effect runs', () => {
    setReactiveScheduling('sync')

    const container = document.createElement('div')
    const count = ref(0)
    const seenScopes: Array<EffectScope | undefined> = []
    let setupScope: EffectScope | undefined
    let runResult: string | undefined

    document.body.appendChild(container)

    render(
      _$compiledRoot(() => {
        setupScope = getCurrentScope()
        runResult = setupScope?.run(() => {
          seenScopes.push(getCurrentScope())
          return 'ran'
        })

        const root = document.createElement('div')

        watchEffect(() => {
          root.textContent = String(count.value)
          seenScopes.push(getCurrentScope())
        })

        return root
      }) as any,
      container as any,
    )

    expect(setupScope).toBeDefined()
    expect(runResult).toBe('ran')
    expect(seenScopes).toEqual([setupScope, setupScope])
    expect(container.textContent).toBe('0')

    count.value = 1

    expect(seenScopes).toEqual([setupScope, setupScope, setupScope])
    expect(container.textContent).toBe('1')

    render(null as any, container as any)
    expect(setupScope?.active).toBe(false)

    count.value = 2

    expect(seenScopes).toEqual([setupScope, setupScope, setupScope])
  })
})
