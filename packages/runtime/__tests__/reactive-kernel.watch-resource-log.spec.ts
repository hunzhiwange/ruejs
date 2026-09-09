// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createResource as createCompiledResource } from '../src/runtime-core/reactive'
import { signal as createCompiledSignal } from '../src/reactive-core'
import { nextTick } from '../src/runtime-core/reactive'
import { ReactiveEffectRuntime, onWatcherCleanup } from '../src/runtime-core/reactive-kernel/effect'
import {
  addLogExclude,
  addLogInclude,
  clearLogExclude,
  clearLogInclude,
  log,
  logWithContext,
  setLogConsole,
  setLogEnabled,
  setLogLevel,
  wantLog,
} from '../src/runtime-core/reactive-kernel/log'
import { createResource } from '../src/runtime-core/reactive-kernel/resource'
import { createSignal, type SignalHandle } from '../src/runtime-core/reactive-kernel/signal'
import {
  watch,
  watchDeepSignal,
  watchEffect,
  watchFn,
  watchPath,
  watchSignal,
} from '../src/runtime-core/reactive-kernel/watch'
import {
  expectKernelScenarioParity,
  createReactiveKernelReference,
  type NormalizedKernelValue,
} from './reactive-kernel.test-utils'

type SignalPath = string | readonly PropertyKey[]

type ScenarioSignal<T> = SignalHandle<T>

interface ScenarioEffect {
  dispose(): void
}

interface WatchOptions<T = unknown> {
  debounce?: number
  equals?: (previous: T, next: T) => boolean
  immediate?: boolean
  scheduler?: (runner: () => void) => void
}

interface ScenarioResource<T> {
  data: ScenarioSignal<T | undefined>
  error: ScenarioSignal<unknown>
  loading: ScenarioSignal<boolean>
}

interface ScenarioKernel {
  createResource<TSource, TData>(
    source: ScenarioSignal<TSource>,
    fetcher: (value: TSource) => Promise<TData> | unknown,
  ): ScenarioResource<TData>
  createSignal<T>(initial: T): ScenarioSignal<T>
  onWatcherCleanup(cleanup: () => void, failSilently?: boolean): void
  setReactiveScheduling(mode: 'sync' | 'microtask' | 'frame'): void
  watch<T>(
    source: T | ScenarioSignal<T> | (() => T) | readonly unknown[],
    handler: (next: any, previous: any) => void,
    options?: WatchOptions<any> | null,
  ): ScenarioEffect
  watchDeepSignal<T>(
    source: ScenarioSignal<T>,
    handler: (next: T, previous: T | undefined) => void,
    options?: WatchOptions<T> | null,
  ): ScenarioEffect
  watchEffect(callback: () => void, options?: WatchOptions | null): ScenarioEffect
  watchFn<T>(
    getter: () => T,
    handler: (next: T, previous: T | undefined) => void,
    options?: WatchOptions<T> | null,
  ): ScenarioEffect
  watchPath<T>(
    source: ScenarioSignal<T>,
    path: SignalPath,
    handler: (next: unknown, previous: unknown) => void,
    options?: WatchOptions | null,
  ): ScenarioEffect
  watchSignal<T>(
    source: ScenarioSignal<T>,
    handler: (next: T, previous: T | undefined) => void,
    options?: WatchOptions<T> | null,
  ): ScenarioEffect
}

const createTypeScriptKernel = (): ScenarioKernel => {
  const runtime = new ReactiveEffectRuntime()
  return {
    createResource: <TSource, TData>(
      source: ScenarioSignal<TSource>,
      fetcher: (value: TSource) => Promise<TData> | unknown,
    ): ScenarioResource<TData> => createResource<TSource, TData>(runtime, source, fetcher),
    createSignal: initial => createSignal(runtime, initial),
    onWatcherCleanup: (cleanup, failSilently) => onWatcherCleanup(runtime, cleanup, failSilently),
    setReactiveScheduling: mode => runtime.setScheduling(mode),
    watch: (source, handler, options) => watch(runtime, source, handler, options),
    watchDeepSignal: (source, handler, options) =>
      watchDeepSignal(runtime, source, handler, options),
    watchEffect: (callback, options) => watchEffect(runtime, callback, options),
    watchFn: (getter, handler, options) => watchFn(runtime, getter, handler, options),
    watchPath: (source, path, handler, options) =>
      watchPath(runtime, source, path, handler, options),
    watchSignal: (source, handler, options) => watchSignal(runtime, source, handler, options),
  }
}

const referenceKernel = createReactiveKernelReference() as unknown as ScenarioKernel

const runWatchScenario = (kernel: ScenarioKernel): Record<string, unknown> => {
  kernel.setReactiveScheduling('sync')
  const source = kernel.createSignal(0)
  const local = kernel.createSignal('local')
  const nested = kernel.createSignal({ user: { name: 'A' }, items: ['x'] })
  const other = kernel.createSignal(10)
  const events: string[] = []
  const scheduled: Array<() => void> = []
  let getterRuns = 0
  let cleanups = 0

  const primary = kernel.watchFn(
    () => {
      getterRuns += 1
      return source.get()
    },
    (next, previous) => {
      events.push(`fn:${String(previous)}>${next}`)
      local.get()
      kernel.onWatcherCleanup(() => {
        cleanups += 1
        events.push('cleanup')
      })
    },
    { immediate: true },
  )
  source.set(1)
  local.set('untracked')

  kernel.watch([source, () => other.get(), 'constant'], (next, previous) => {
    events.push(`multi:${previous.join('|')}>${next.join('|')}`)
  })
  other.set(11)

  kernel.watchDeepSignal(nested, next => events.push(`deep:${next.user.name}/${next.items[0]}`), {
    immediate: true,
  })
  kernel.watchPath(
    nested,
    'user.name',
    (next, previous) => events.push(`path:${String(previous)}>${String(next)}`),
    { immediate: true },
  )
  nested.setPath(['user', 'name'], 'B')
  nested.setPath('items.0', 'y')

  kernel.watchSignal(
    source,
    (next, previous) => events.push(`scheduled:${String(previous)}>${next}`),
    { scheduler: runner => scheduled.push(runner) },
  )
  source.set(2)
  const beforeScheduledRun = events.length
  scheduled.shift()?.()

  const equalSource = kernel.createSignal(1)
  kernel.watchSignal(equalSource, () => events.push('equals:unexpected'), {
    equals: () => true,
  })
  equalSource.set(2)

  kernel.watch(
    'CONST',
    (next, previous) => {
      events.push(`constant:${String(previous)}>${next}`)
    },
    { immediate: true },
  )

  const dynamicSignal = kernel.createSignal(0)
  const dynamicSource: { get?: () => number } = { get: () => dynamicSignal.get() }
  kernel.watch<unknown>(dynamicSource, (next, previous) => {
    events.push(`dynamic:${String(previous)}>${String(next)}`)
  })
  delete dynamicSource.get
  dynamicSignal.set(1)

  primary.dispose()
  source.set(3)
  const getterRunsAfterDispose = getterRuns

  return {
    beforeScheduledRun,
    cleanups,
    events,
    getterRuns,
    getterRunsAfterDispose,
  }
}

const flushPromises = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

const runResourceScenario = async (kernel: ScenarioKernel): Promise<Record<string, unknown>> => {
  kernel.setReactiveScheduling('sync')
  const source = kernel.createSignal('first')
  const requests: string[] = []
  let rejectNext = false
  const resource = kernel.createResource(source, value => {
    requests.push(value)
    return rejectNext ? Promise.reject(`failed:${value}`) : Promise.resolve(value.toUpperCase())
  })
  const states: unknown[] = [[resource.loading.get(), resource.data.get(), resource.error.get()]]
  await flushPromises()
  states.push([resource.loading.get(), resource.data.get(), resource.error.get()])

  source.set('second')
  states.push([resource.loading.get(), resource.data.get(), resource.error.get()])
  await flushPromises()
  states.push([resource.loading.get(), resource.data.get(), resource.error.get()])

  rejectNext = true
  source.set('third')
  states.push([resource.loading.get(), resource.data.get(), resource.error.get()])
  await flushPromises()
  states.push([resource.loading.get(), resource.data.get(), resource.error.get()])

  return { requests, states }
}

const assertWatchBehavior = (result: NormalizedKernelValue): void => {
  expect(result).toMatchObject({
    cleanups: 3,
    getterRuns: 3,
    getterRunsAfterDispose: 3,
  })
  expect(JSON.stringify(result)).not.toContain('equals:unexpected')
  expect(JSON.stringify(result)).toContain('path:A>B')
  expect(JSON.stringify(result)).toContain('multi:1|10|constant>1|11|constant')
  expect(JSON.stringify(result)).toContain('dynamic:0>undefined')
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('runtime TypeScript kernel Watch', () => {
  it('matches an isolated kernel reference for sources, cleanup, scheduling and equality', () => {
    expectKernelScenarioParity(
      runWatchScenario(createTypeScriptKernel()),
      runWatchScenario(referenceKernel),
      assertWatchBehavior,
    )
  })

  it('debounces invalidations while keeping the initial dependency collection synchronous', () => {
    vi.useFakeTimers()
    const kernel = createTypeScriptKernel()
    kernel.setReactiveScheduling('sync')
    const source = kernel.createSignal(0)
    const events: number[] = []
    kernel.watchSignal(source, next => events.push(next), { debounce: 20 })

    source.set(1)
    source.set(2)
    source.set(3)
    expect(events).toEqual([])
    vi.advanceTimersByTime(19)
    expect(events).toEqual([])
    vi.advanceTimersByTime(1)
    expect(events).toEqual([3])

    const immediateSchedulerEvents: number[] = []
    kernel.watchSignal(source, next => immediateSchedulerEvents.push(next), {
      debounce: 20,
      scheduler: runner => runner(),
    })
    source.set(4)
    expect(immediateSchedulerEvents).toEqual([4])
  })

  it('keeps watchEffect cleanup and thrown getter/equals/handler errors on the effect path', () => {
    const warnings: string[] = []
    const runtime = new ReactiveEffectRuntime({ warn: message => warnings.push(message) })
    runtime.setScheduling('sync')
    const source = createSignal(runtime, 0)
    const order: string[] = []
    const handle = watchEffect(runtime, () => {
      source.get()
      order.push('run')
      onWatcherCleanup(runtime, () => order.push('cleanup'))
    })
    source.set(1)
    handle.dispose()

    expect(order).toEqual(['run', 'cleanup', 'run', 'cleanup'])
    expect(() =>
      watchFn(
        runtime,
        () => {
          throw new Error('getter boom')
        },
        () => {},
      ),
    ).toThrow('getter boom')
    const handlerSource = createSignal(runtime, 0)
    expect(() =>
      watchSignal(
        runtime,
        handlerSource,
        () => {
          throw new Error('handler boom')
        },
        { immediate: true },
      ),
    ).toThrow('handler boom')
    const equalsSource = createSignal(runtime, 0)
    const equalsHandle = watchSignal(runtime, equalsSource, () => {}, {
      equals: () => {
        throw new Error('equals boom')
      },
    })
    expect(() => equalsSource.set(2)).toThrow('equals boom')
    equalsHandle.dispose()
    onWatcherCleanup(runtime, () => {}, true)
    expect(warnings).toEqual([])
  })
})

describe('runtime TypeScript kernel Resource', () => {
  it('keeps the compiled resource entry subscribed across completed source cycles', async () => {
    const source = createCompiledSignal('main')
    const requests: string[] = []
    const resolvers = new Map<string, Array<(value: string) => void>>()
    const resource = createCompiledResource(source, value => {
      requests.push(value)
      return new Promise<string>(resolve => {
        const queue = resolvers.get(value) ?? []
        queue.push(resolve)
        resolvers.set(value, queue)
      })
    })
    const resolveRequest = (value: string, result: string) =>
      resolvers.get(value)?.shift()?.(result)

    resolveRequest('main', 'MAIN-1')
    await flushPromises()
    expect(resource.data.get()).toBe('MAIN-1')

    for (const [value, result] of [
      ['beta', 'BETA'],
      ['stable', 'STABLE'],
      ['main', 'MAIN-2'],
    ] as const) {
      source.set(value)
      await nextTick()
      expect(resource.data.get()).toBeUndefined()
      expect(resource.loading.get()).toBe(true)
      resolveRequest(value, result)
      await flushPromises()
      expect(resource.data.get()).toBe(result)
    }

    expect(requests).toEqual(['main', 'beta', 'stable', 'main'])
  })

  it('matches resolve/reject state ordering from an isolated kernel reference', async () => {
    const candidate = await runResourceScenario(createTypeScriptKernel())
    const oracle = await runResourceScenario(referenceKernel)
    expectKernelScenarioParity(candidate, oracle, result => {
      expect(result).toEqual({
        requests: ['first', 'second', 'third'],
        states: [
          [true, '[undefined]', '[undefined]'],
          [false, 'FIRST', '[undefined]'],
          [true, '[undefined]', '[undefined]'],
          [false, 'SECOND', '[undefined]'],
          [true, '[undefined]', '[undefined]'],
          [false, '[undefined]', 'failed:third'],
        ],
      })
    })
  })

  it('clears stale data and ignores superseded request results', async () => {
    const kernel = createTypeScriptKernel()
    kernel.setReactiveScheduling('sync')
    const source = kernel.createSignal('old')
    const resolvers = new Map<string, (value: string) => void>()
    const resource = kernel.createResource(source, value =>
      value === 'plain'
        ? 'not-a-promise'
        : new Promise<string>(resolve => resolvers.set(value, resolve)),
    )
    source.set('new')
    expect([resource.data.get(), resource.loading.get()]).toEqual([undefined, true])
    resolvers.get('new')?.('NEW')
    await flushPromises()
    resolvers.get('old')?.('OLD')
    await flushPromises()
    expect([resource.data.get(), resource.loading.get()]).toEqual(['NEW', false])

    source.set('plain')
    await flushPromises()
    expect([resource.data.get(), resource.loading.get()]).toEqual([undefined, false])
  })
})

describe('runtime TypeScript kernel diagnostics', () => {
  it('applies levels, filters, context and throttled localStorage probes without leaking globals', () => {
    const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    const values: Record<string, string | null> = {
      'rue.logs.enabled': 'yes',
      'rue.logs.level': 'warning',
      'rue.logs.verboseDebug': 'off',
      'rue.logs.include': 'watch',
      'rue.logs.exclude': 'drop',
    }
    let storageReads = 0
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem(key: string) {
          storageReads += 1
          return values[key] ?? null
        },
      },
    })

    try {
      expect(wantLog('warning', 'watch ready')).toBe(true)
      expect(storageReads).toBe(5)
      expect(wantLog('info', 'watch ready')).toBe(false)
      expect(wantLog('error', 'other')).toBe(false)
      expect(wantLog('error', 'watch drop')).toBe(false)
      expect(storageReads).toBe(5)

      log('warning', 'watch ready')
      logWithContext('error', 'watch {name}', { name: 'Rue' })
      expect(consoleLog).toHaveBeenCalledTimes(2)
      expect(String(consoleLog.mock.calls[1]?.[0])).toContain('watch Rue')

      setLogEnabled(true)
      setLogConsole(true)
      setLogLevel('debug')
      clearLogInclude()
      clearLogExclude()
      log('debug', 'reactive:effect create id=1')
      expect(consoleLog).toHaveBeenCalledTimes(2)
      addLogInclude('reactive:effect create')
      log('debug', 'reactive:effect create id=2')
      addLogExclude('id=3')
      log('debug', 'reactive:effect create id=3')
      expect(consoleLog).toHaveBeenCalledTimes(3)
    } finally {
      setLogEnabled(false)
      setLogConsole(true)
      setLogLevel('debug')
      clearLogInclude()
      clearLogExclude()
      if (originalStorage === undefined)
        delete (globalThis as { localStorage?: Storage }).localStorage
      else Object.defineProperty(globalThis, 'localStorage', originalStorage)
    }
  })
})
