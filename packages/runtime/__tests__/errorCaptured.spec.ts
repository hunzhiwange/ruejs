// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { evaluateComponent } from './compiled-component-test-utils'
import { _$createComponent } from '../src/compiled-component-call'
import {
  setReactiveScheduling,
  __rueGetCompiledReactiveDebugState,
} from '../src/runtime-core/compiled'

afterEach(() => {
  document.body.innerHTML = ''
  setReactiveScheduling('frame')
  vi.restoreAllMocks()
})
describe('closed component owner errors', () => {
  it.each([true, false])('propagates descendant errors along owners (stop=%s)', stop => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => {})
    setReactiveScheduling('sync')
    const { exports: app } = evaluateComponent(`
      import {onErrorCaptured,onError,onUnmounted} from '@rue-js/rue';
      export const captured=[], globalErrors=[], disposed=[];
      export const stopGlobal=onError(error=>globalErrors.push(error.message));
      const Child=()=>{onUnmounted(()=>disposed.push('child'));throw Error('child failure');return <i/>};
      const Parent=()=>{onErrorCaptured(error=>{captured.push(error.message);return ${stop ? 'false' : 'undefined'}});return <section><Child/></section>};
      export const View=()=> <main><Parent/></main>;
    `)
    const baseline = __rueGetCompiledReactiveDebugState()
    const root = _$createComponent(app.View, {})
    try {
      if (stop) root.__rue_compiled_mount(document.body)
      else expect(() => root.__rue_compiled_mount(document.body)).toThrow('child failure')
      expect(app.captured).toEqual(['child failure'])
      expect(app.globalErrors).toEqual(stop ? [] : ['child failure'])
      expect(output).toHaveBeenCalledTimes(stop ? 0 : 1)
    } finally {
      root.dispose()
      app.stopGlobal()
    }
    expect(app.disposed).toEqual(['child'])
    expect(__rueGetCompiledReactiveDebugState()).toEqual(baseline)
    expect(document.body.childNodes.length).toBe(0)
  })

  it('does not catch a component failure with its own boundary', () => {
    const { exports: app } = evaluateComponent(`
      import {onErrorCaptured} from '@rue-js/rue';
      export const calls=[];
      export const View=()=>{onErrorCaptured(()=>{calls.push('own');return false});throw Error('own failure');return <i/>};
    `)
    const root = _$createComponent(app.View, {})
    expect(() => root.__rue_compiled_mount(document.body)).toThrow('own failure')
    expect(app.calls).toEqual([])
    root.dispose()
  })
})

it('captures errors from a descendant owned effect after mount', () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import {signal,effect,onErrorCaptured} from '@rue-js/rue';
    export const fail=signal(false), errors=[];
    const Child=()=>{effect(()=>{if(fail.get())throw Error('effect failure')});return <i>stable</i>};
    export const View=()=>{onErrorCaptured(error=>{errors.push(error.message);return false});return <main><Child/></main>};
  `)
  const root = _$createComponent(app.View, {})
  try {
    root.__rue_compiled_mount(document.body)
    expect(() => app.fail.set(true)).not.toThrow()
    expect(app.errors).toEqual(['effect failure'])
    expect(document.querySelector('i')?.textContent).toBe('stable')
  } finally {
    root.dispose()
    app.fail.dispose()
  }
})

import { retainRootMountError, shouldRetainRootMountError } from '../src/root-mount-error'
it('retains root mount errors by identity without retaining primitives', () => {
  const error = Error('failure')
  const callback = () => 'failure'
  retainRootMountError(error)
  retainRootMountError(callback)
  retainRootMountError('failure')
  expect(shouldRetainRootMountError(error)).toBe(true)
  expect(shouldRetainRootMountError(callback)).toBe(true)
  expect(shouldRetainRootMountError(Error('failure'))).toBe(false)
  expect(shouldRetainRootMountError('failure')).toBe(false)
})
