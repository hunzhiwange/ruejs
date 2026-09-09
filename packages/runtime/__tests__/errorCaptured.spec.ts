/**
 * onErrorCaptured 运行时测试。
 *
 * 覆盖子组件 render 抛错时的父级捕获、阻止全局传播和继续冒泡行为。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { onError, onErrorCaptured, render, setReactiveScheduling, type FC } from '../src'
import { retainRootMountError } from '../src/error-capture'
import { shouldRetainRootMountError } from '../src/root-mount-error'
import { _$createDynamic } from './legacy-test-render'

const createTestRenderable = (
  type: string | FC,
  props: Record<string, unknown> | null,
  ...children: unknown[]
) => _$createDynamic(type, children.length > 0 ? { ...props, children } : props)
setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('onErrorCaptured', () => {
  it('retains root mount failures by object identity without accepting primitive values', () => {
    const objectError = new Error('object failure')
    const sameMessage = new Error('object failure')
    const functionError = () => 'function failure'

    retainRootMountError(objectError)
    retainRootMountError(functionError)
    retainRootMountError('primitive failure')
    retainRootMountError(1)
    retainRootMountError(null)

    expect(shouldRetainRootMountError(objectError)).toBe(true)
    expect(shouldRetainRootMountError(objectError)).toBe(true)
    expect(shouldRetainRootMountError(sameMessage)).toBe(false)
    expect(shouldRetainRootMountError(functionError)).toBe(true)
    expect(shouldRetainRootMountError(() => 'function failure')).toBe(false)
    expect(shouldRetainRootMountError('primitive failure')).toBe(false)
    expect(shouldRetainRootMountError(1)).toBe(false)
    expect(shouldRetainRootMountError(null)).toBe(false)
  })

  it('captures descendant component render errors and can stop global propagation', () => {
    const container = document.createElement('div')
    const captured: string[] = []
    const globalError = vi.fn()
    const stopGlobalError = onError(globalError)

    const Child: FC = () => {
      throw new Error('planned child failure')
    }

    const Parent: FC = () => {
      onErrorCaptured(error => {
        captured.push(error.message)
        return false
      })
      return createTestRenderable('section', null, createTestRenderable(Child, null))
    }

    render(createTestRenderable(Parent, null), container)

    expect(captured).toEqual(['planned child failure'])
    expect(globalError).not.toHaveBeenCalled()

    stopGlobalError?.()
  })

  it('continues to global error handlers when capture does not stop propagation', () => {
    const container = document.createElement('div')
    const captured: string[] = []
    const globalError = vi.fn()
    const stopGlobalError = onError(globalError)

    const Child: FC = () => {
      throw new Error('bubble child failure')
    }

    const Parent: FC = () => {
      onErrorCaptured(error => {
        captured.push(error.message)
      })
      return createTestRenderable(Child, null)
    }

    expect(() => render(createTestRenderable(Parent, null), container)).toThrow(
      'bubble child failure',
    )

    expect(captured).toEqual(['bubble child failure'])
    expect(globalError).toHaveBeenCalledTimes(1)
    expect(globalError.mock.calls[0]?.[0]?.message).toBe('bubble child failure')

    stopGlobalError?.()
  })
})
