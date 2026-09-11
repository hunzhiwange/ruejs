// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'

import * as compilerInternalRuntime from '../src/compiler-internal'
import * as compiledRuntime from '../src/internal'
import { createContext, useContext } from '../src/context'

afterEach(() => {
  compiledRuntime.setReactiveScheduling('frame')
  document.body.innerHTML = ''
})

describe('compiled hook owner', () => {
  it('exports React-compatible useState from the compact compiler entry', () => {
    compilerInternalRuntime.setReactiveScheduling('sync')
    const owner = compilerInternalRuntime.createOwner()
    let initializerRuns = 0
    const render = () =>
      compilerInternalRuntime.runWithOwner(owner, () =>
        compilerInternalRuntime._$compiledUseState('state:count', () => {
          initializerRuns += 1
          return 0
        }),
      )!

    const first = render()
    const second = render()
    expect(second).toEqual(first)
    expect(initializerRuns).toBe(1)

    first[1](previous => previous + 2)
    expect(first[0].get()).toBe(2)
    compilerInternalRuntime.disposeOwner(owner)
  })

  it('brands compiler refs as readonly Rue refs', () => {
    const state = compiledRuntime.ref('ready')

    expect(state.__rue_ref__).toBe(true)
    expect(Reflect.set(state, '__rue_ref__', false)).toBe(false)
    expect(state.__rue_ref__).toBe(true)
    expect(Object.keys(state)).not.toContain('__rue_ref__')
  })

  it('honors automatic, empty, and explicit compiled effect dependencies', () => {
    compiledRuntime.setReactiveScheduling('sync')
    const incidental = compiledRuntime.signal(0)
    const declared = compiledRuntime.signal(0)
    const ref = compiledRuntime.ref(0)
    const revision = compiledRuntime.signal(0)
    let functionCalls = 0
    const functionValue = () => ++functionCalls
    let automaticRuns = 0
    let emptyRuns = 0
    let emptyCleanups = 0
    const events: string[] = []
    const handle = compiledRuntime._$withCompiledHookScope(() => {
      compiledRuntime._$compiledUseEffect('automatic', () => {
        incidental.get()
        automaticRuns++
      })
      compiledRuntime._$compiledUseEffect(
        'empty',
        () => {
          incidental.get()
          emptyRuns++
          return () => {
            emptyCleanups++
          }
        },
        () => [],
      )
      compiledRuntime._$compiledUseEffect(
        'explicit',
        () => {
          incidental.get()
          const value = declared.get()
          events.push(`run:${value}:${ref.value}`)
          return () => {
            incidental.get()
            events.push(`cleanup:${value}`)
          }
        },
        () => {
          revision.get()
          return [declared, ref, declared.get() % 2, functionValue, NaN]
        },
      )
      return compiledRuntime._$compiledRoot(() => {
        const __blockNode = document.createTextNode('effects')
        return [__blockNode, __blockNode] as const
      })
    })

    expect([automaticRuns, emptyRuns, events.length]).toEqual([0, 0, 0])
    declared.set(1)
    handle.__rue_compiled_mount(document.createElement('main'))
    expect(events).toEqual(['run:1:0'])
    incidental.set(1)
    expect([automaticRuns, emptyRuns]).toEqual([2, 1])
    expect(events).toEqual(['run:1:0'])
    revision.set(1)
    expect(events).toEqual(['run:1:0'])
    declared.set(2)
    ref.value = 1
    expect(events).toEqual(['run:1:0', 'cleanup:1', 'run:2:0', 'cleanup:2', 'run:2:1'])
    incidental.set(2)
    expect(events).toHaveLength(5)
    expect(functionCalls).toBe(0)
    handle.dispose()
    handle.dispose()
    expect(events.at(-1)).toBe('cleanup:2')
    expect(events).toHaveLength(6)
    expect(emptyCleanups).toBe(1)
    incidental.set(3)
    declared.set(3)
    ref.value = 2
    expect([automaticRuns, emptyRuns, events.length]).toEqual([3, 1, 6])
  })

  it('compares lazy dependency snapshots by length and Object.is without calling functions', () => {
    compiledRuntime.setReactiveScheduling('sync')
    let functionCalls = 0
    const firstFunction = () => ++functionCalls
    const secondFunction = () => ++functionCalls
    const object = {}
    const dependencies = compiledRuntime.signal<readonly unknown[] | null>([
      NaN,
      0,
      firstFunction,
      object,
    ])
    let runs = 0
    let cleanups = 0
    const handle = compiledRuntime._$withCompiledHookScope(() => {
      const register = () =>
        compiledRuntime._$compiledUseEffect(
          'snapshot',
          () => {
            runs++
            return () => {
              cleanups++
            }
          },
          () => dependencies.get(),
        )
      register()
      register()
      return compiledRuntime._$compiledRoot(() => {
        const __blockNode = document.createTextNode('snapshots')
        return [__blockNode, __blockNode] as const
      })
    })
    handle.__rue_compiled_mount(document.createElement('main'))
    expect(runs).toBe(1)
    dependencies.set([NaN, 0, firstFunction, object])
    expect([runs, cleanups]).toEqual([1, 0])
    dependencies.set([NaN, -0, firstFunction, object])
    dependencies.set([NaN, -0, secondFunction, object])
    dependencies.set([NaN, -0, secondFunction, {}])
    dependencies.set([NaN, -0, secondFunction])
    expect([runs, cleanups, functionCalls]).toEqual([5, 4, 0])
    dependencies.set(null)
    dependencies.set([])
    expect([runs, cleanups]).toEqual([6, 5])
    handle.dispose()
    expect(cleanups).toBe(6)
    dependencies.set([1])
    expect(runs).toBe(6)
  })

  it('implements React useState updates in a compiled slot', () => {
    compiledRuntime.setReactiveScheduling('sync')
    const owner = compiledRuntime.createOwner()
    let initializerRuns = 0
    const initialCallable = (value: number) => `initial:${value}`
    const replacementCallable = (value: number) => `replacement:${value}`
    const render = () =>
      compiledRuntime.runWithOwner(owner, () => ({
        count: compiledRuntime._$compiledUseState('state:count', () => {
          initializerRuns += 1
          return 0
        }),
        object: compiledRuntime._$compiledUseState('state:object', { count: 0 }),
        callable: compiledRuntime._$compiledUseState('state:callable', () => initialCallable),
      }))!

    const first = render()
    const second = render()
    const updaterValues: number[] = []

    expect(initializerRuns).toBe(1)
    expect(second.count[0]).toBe(first.count[0])
    expect(second.count[1]).toBe(first.count[1])

    first.count[1](previous => {
      updaterValues.push(previous)
      return previous + 1
    })
    first.count[1](previous => {
      updaterValues.push(previous)
      return previous + 1
    })
    expect(updaterValues).toEqual([0, 1])
    expect(first.count[0].get()).toBe(2)

    first.count[1](10)
    expect(first.count[0].get()).toBe(10)

    const initialObject = first.object[0].get()
    first.object[1]({ count: 1 })
    expect(first.object[0].get()).toEqual({ count: 1 })
    expect(first.object[0].get()).not.toBe(initialObject)
    first.object[1](previous => ({ count: previous.count + 1 }))
    expect(first.object[0].get()).toEqual({ count: 2 })

    expect(first.callable[0].get()(1)).toBe('initial:1')
    first.callable[1](() => replacementCallable)
    expect(first.callable[0].get()).toBe(replacementCallable)
    expect(first.callable[0].get()(2)).toBe('replacement:2')

    compiledRuntime.disposeOwner(owner)
  })

  it('caches compiler-assigned hook slots on one owner', () => {
    const owner = compiledRuntime.createOwner()
    let memoRuns = 0
    const first = compiledRuntime.runWithOwner(owner, () => ({
      memo: compiledRuntime._$compiledMemo('memo:0', () => ({ run: ++memoRuns }), []),
      ref: compiledRuntime._$compiledUseRef('ref:1', 'first'),
    }))!
    first.ref.current = 'persisted'
    const second = compiledRuntime.runWithOwner(owner, () => ({
      memo: compiledRuntime._$compiledMemo('memo:0', () => ({ run: ++memoRuns }), []),
      ref: compiledRuntime._$compiledUseRef('ref:1', 'ignored'),
    }))!

    expect(second.memo).toBe(first.memo)
    expect(second.ref).toBe(first.ref)
    expect(second.ref.current).toBe('persisted')
    expect(memoRuns).toBe(1)

    const third = compiledRuntime.runWithOwner(owner, () => ({
      memo: compiledRuntime._$compiledMemo('memo:0', () => ({ run: ++memoRuns }), [1]),
    }))!
    expect(third.memo).not.toBe(first.memo)
    expect(memoRuns).toBe(2)
    compiledRuntime.disposeOwner(owner)
  })

  it('runs effects and lifecycle from the compiled owner without current-instance state', () => {
    compiledRuntime.setReactiveScheduling('sync')
    const events: string[] = []
    const value = compiledRuntime.signal(0)
    const handle = compiledRuntime._$withCompiledHookScope(() => {
      compiledRuntime.onBeforeMount(() => events.push('before-mount'))
      compiledRuntime.onMounted(() => events.push('mounted'))
      compiledRuntime.onBeforeUnmount(() => events.push('before-unmount'))
      compiledRuntime.onUnmounted(() => events.push('unmounted'))
      compiledRuntime._$compiledUseEffect('effect:0', () => {
        events.push(`effect:${value.get()}`)
        return () => events.push('effect-cleanup')
      })
      return compiledRuntime._$compiledRoot(() => {
        const __blockNode = document.createTextNode('owned')
        return [__blockNode, __blockNode] as const
      })
    })
    const container = document.createElement('main')

    handle.__rue_compiled_mount(container)
    value.set(1)
    handle.dispose()
    handle.dispose()

    expect(events).toEqual([
      'before-mount',
      'mounted',
      'effect:0',
      'effect-cleanup',
      'effect:1',
      'before-unmount',
      'effect-cleanup',
      'unmounted',
    ])
    expect(container.innerHTML).toBe('')
  })

  it('resolves shadowed context values through the compiled owner parent chain', () => {
    const Theme = createContext('fallback')
    const parent = compiledRuntime.createOwner()
    const parentValue = compiledRuntime.runWithOwner(parent, () => {
      Theme.Provider({ value: 'parent' })
      const child = compiledRuntime.createOwner()
      const childValue = compiledRuntime.runWithOwner(child, () => useContext(Theme))
      const shadow = compiledRuntime.createOwner()
      const shadowValue = compiledRuntime.runWithOwner(shadow, () => {
        Theme.Provider({ value: 'shadow' })
        return useContext(Theme)
      })
      return { childValue, shadowValue }
    })

    expect(parentValue).toEqual({ childValue: 'parent', shadowValue: 'shadow' })
    compiledRuntime.disposeOwner(parent)
  })

  it('disposes the owner exactly once when mount throws', () => {
    const events: string[] = []
    const handle = compiledRuntime._$withCompiledHookScope(() => {
      compiledRuntime.onBeforeUnmount(() => events.push('before-unmount'))
      compiledRuntime.onUnmounted(() => events.push('unmounted'))
      return compiledRuntime._$compiledRoot(parent => {
        parent?.appendChild(document.createElement('span'))
        throw new Error('mount failed')
      })
    })
    const container = document.createElement('main')

    container.innerHTML = '<i>existing</i>'
    expect(() => handle.__rue_compiled_mount(container)).toThrowError('mount failed')
    handle.dispose()
    expect(events).toEqual(['before-unmount', 'unmounted'])
    expect(container.innerHTML).toBe('<i>existing</i>')
  })
})

it('releases hook owners when beforeMount throws', () => {
  const events: string[] = []
  const root = compiledRuntime._$withCompiledHookScope(() => {
    compiledRuntime.onBeforeMount(() => {
      throw new Error('before mount failed')
    })
    compiledRuntime.onUnmounted(() => events.push('released'))
    return compiledRuntime._$compiledRoot(() => [null, null])
  })
  expect(() => root.__rue_compiled_mount(document.createElement('div'))).toThrow(
    'before mount failed',
  )
  expect(events).toEqual(['released'])
  root.dispose()
  expect(events).toEqual(['released'])
})
