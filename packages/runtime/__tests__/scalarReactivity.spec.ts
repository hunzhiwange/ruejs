import { describe, expect, it, vi } from 'vitest'
import {
  _$compiledScalarEffect,
  _$compiledScalarRoot,
  _$compiledScalarSignal,
  _$compiledScalarText,
} from '../src/compiler-runtime/scalar-reactivity'

describe('compiler scalar reactivity', () => {
  it.each(['effect', 'text'] as const)(
    'releases subscriptions when initial %s evaluation throws',
    kind => {
      const value = _$compiledScalarSignal('ready')
      const failure = new Error('initial evaluation')
      const earlier = vi.fn(() => value.get())
      const read = vi.fn(() => {
        value.get()
        throw failure
      })
      const root = _$compiledScalarRoot(() => {
        _$compiledScalarEffect(earlier)
        if (kind === 'effect') _$compiledScalarEffect(read)
        else _$compiledScalarText(document.createTextNode(''), read)
        return [null, null]
      })
      expect(() => root.__rue_compiled_mount(document.createElement('div'))).toThrow(failure)
      expect(() => value.set('after')).not.toThrow()
      expect(read).toHaveBeenCalledTimes(1)
      expect(earlier).toHaveBeenCalledTimes(1)
      root.dispose()
    },
  )

  it('drops stale conditional dependencies', () => {
    const chooseLeft = _$compiledScalarSignal(true)
    const left = _$compiledScalarSignal('left')
    const right = _$compiledScalarSignal('right')
    const values: string[] = []
    _$compiledScalarEffect(() => values.push(chooseLeft.get() ? left.get() : right.get()))

    chooseLeft.set(false)
    left.set('stale')
    right.set('next')

    expect(values).toEqual(['left', 'right', 'next'])
  })

  it('unsubscribes escaped signals when the root is disposed', () => {
    const value = _$compiledScalarSignal('ready')
    const write = vi.fn(() => value.get())
    const parent = document.createElement('div')
    const root = _$compiledScalarRoot(host => {
      const node = document.createTextNode('')
      host?.appendChild(node)
      _$compiledScalarEffect(write)
      return [node, node]
    })

    root.__rue_compiled_mount(parent)
    expect(write).toHaveBeenCalledTimes(1)
    root.dispose()
    value.set('after')

    expect(write).toHaveBeenCalledTimes(1)
    expect(parent.childNodes).toHaveLength(0)
  })
})
