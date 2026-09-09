import type { ReactiveRuntimeServices as ReactiveEffectRuntime } from './runtime-services.js'
/**
 * Watchers compose source normalization and an untracked handler over the
 * shared signal/effect runtime; they do not introduce a second graph. Single,
 * multi-source, deep, and path reads preserve their own equality rules and
 * ordering. The initial collection is synchronous, while later runs may use a
 * custom scheduler or debounce. Handler cleanup remains associated with the
 * watcher even though handler reads are not collected as dependencies.
 */

import { type EffectScheduler, EffectHandle } from './effect.js'
import { type EqualityComparator, SignalHandle, type SignalPath } from './signal.js'

export interface WatchEffectOptions {
  readonly debounce?: number
  readonly scheduler?: EffectScheduler
}

export interface WatchOptions<T = unknown> extends WatchEffectOptions {
  readonly equals?: EqualityComparator<T>
  readonly immediate?: boolean
}

export type WatchHandler<T> = (next: T, previous: T | undefined) => void
export type WatchSource<T = unknown> = SignalHandle<T> | (() => T)
export type WatchSourceValue<T> = T extends WatchSource<infer TValue> ? TValue : T
export type WatchMultiValues<TSources extends readonly unknown[]> = {
  -readonly [K in keyof TSources]: WatchSourceValue<TSources[K]>
}

interface SignalLike<T = unknown> {
  get(): T
}

const isSignalLike = (value: unknown): value is SignalLike => {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return false
  try {
    return typeof Reflect.get(value, 'get') === 'function'
  } catch {
    return false
  }
}

const readSignalLike = (source: SignalLike): unknown => {
  try {
    const getter = Reflect.get(source, 'get')
    return typeof getter === 'function' ? Reflect.apply(getter, source, []) : undefined
  } catch {
    return undefined
  }
}

const createDebounceScheduler = (delay: number): EffectScheduler => {
  let timer: ReturnType<typeof setTimeout> | undefined
  return runner => {
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      runner()
    }, delay)
  }
}

const resolveScheduler = (options: WatchEffectOptions): EffectScheduler | undefined =>
  options.scheduler ??
  (typeof options.debounce === 'number' ? createDebounceScheduler(options.debounce) : undefined)

const shallowArrayEqual: EqualityComparator<readonly unknown[]> = (previous, next) =>
  previous.length === next.length && previous.every((value, index) => Object.is(value, next[index]))

const deepEqual = (
  previous: unknown,
  next: unknown,
  seen = new WeakMap<object, object>(),
): boolean => {
  if (Object.is(previous, next)) return true
  if (typeof previous !== typeof next || previous === null || next === null) return false
  if (typeof previous !== 'object' || typeof next !== 'object') return false
  if (seen.get(previous) === next) return true
  seen.set(previous, next)

  const previousArray = Array.isArray(previous)
  if (previousArray !== Array.isArray(next)) return false
  if (previousArray) {
    const nextArray = next as unknown[]
    return (
      previous.length === nextArray.length &&
      previous.every((value, index) => deepEqual(value, nextArray[index], seen))
    )
  }

  const previousKeys = Object.keys(previous)
  const nextRecord = next as Record<string, unknown>
  if (previousKeys.length !== Object.keys(nextRecord).length) return false
  return previousKeys.every(
    key =>
      Object.prototype.hasOwnProperty.call(nextRecord, key) &&
      deepEqual((previous as Record<string, unknown>)[key], nextRecord[key], seen),
  )
}

const createWatcher = <T>(
  runtime: ReactiveEffectRuntime,
  getter: () => T,
  handler: WatchHandler<T>,
  options: WatchOptions<T>,
  fallbackEquals: EqualityComparator<T> = Object.is,
): EffectHandle => {
  let first = true
  let previous: T | undefined
  let handle: EffectHandle
  const equals = options.equals ?? fallbackEquals
  const callback = (): void => {
    const next = getter()
    const changed = first || !equals(previous as T, next)
    if (first) {
      if (options.immediate) {
        runtime.runWatcherHandler(handle.id, () => handler(next, undefined))
      }
      first = false
    } else if (changed) {
      runtime.runWatcherHandler(handle.id, () => handler(next, previous))
    }
    previous = next
  }

  handle = runtime.createEffect(callback, {
    lazy: true,
    scheduler: resolveScheduler(options),
    watcher: true,
  })
  // The first run is synchronous even with a custom scheduler so dependencies
  // exist before createWatcher returns.
  runtime.runEffect(handle.id)
  return handle
}

export const watchFn = <T>(
  runtime: ReactiveEffectRuntime,
  getter: () => T,
  handler: WatchHandler<T>,
  options?: WatchOptions<T> | null,
): EffectHandle => createWatcher(runtime, getter, handler, options ?? {})

export const watchEffect = (
  runtime: ReactiveEffectRuntime,
  callback: () => void,
  options?: WatchEffectOptions | null,
): EffectHandle => {
  const normalized = options ?? {}
  const handle = runtime.createEffect(callback, {
    lazy: true,
    scheduler: resolveScheduler(normalized),
    watcher: true,
  })
  runtime.runEffect(handle.id)
  return handle
}

export const watchSignal = <T>(
  runtime: ReactiveEffectRuntime,
  source: SignalHandle<T>,
  handler: WatchHandler<T>,
  options?: WatchOptions<T> | null,
): EffectHandle => createWatcher(runtime, () => source.get(), handler, options ?? {})

export const watchDeepSignal = <T>(
  runtime: ReactiveEffectRuntime,
  source: SignalHandle<T>,
  handler: WatchHandler<T>,
  options?: WatchOptions<T> | null,
): EffectHandle => createWatcher(runtime, () => source.get(), handler, options ?? {}, deepEqual)

export const watchPath = <T>(
  runtime: ReactiveEffectRuntime,
  source: SignalHandle<T>,
  path: SignalPath,
  handler: WatchHandler<unknown>,
  options?: WatchOptions<unknown> | null,
): EffectHandle => createWatcher(runtime, () => source.getPath(path), handler, options ?? {})

const resolveSource = (source: unknown): unknown => {
  if (typeof source === 'function') {
    try {
      return Reflect.apply(source, undefined, [])
    } catch {
      return undefined
    }
  }
  if (isSignalLike(source)) return readSignalLike(source)
  return source
}

export function watch<TSources extends readonly unknown[]>(
  runtime: ReactiveEffectRuntime,
  source: readonly [...TSources],
  handler: WatchHandler<WatchMultiValues<TSources>>,
  options?: WatchOptions<WatchMultiValues<TSources>> | null,
): EffectHandle
export function watch<T>(
  runtime: ReactiveEffectRuntime,
  source: WatchSource<T>,
  handler: WatchHandler<T>,
  options?: WatchOptions<T> | null,
): EffectHandle
export function watch<T>(
  runtime: ReactiveEffectRuntime,
  source: T,
  handler: WatchHandler<T>,
  options?: WatchOptions<T> | null,
): EffectHandle
export function watch(
  runtime: ReactiveEffectRuntime,
  source: unknown,
  handler: (...args: never[]) => unknown,
  options?:
    | (WatchEffectOptions & {
        readonly equals?: (...args: never[]) => boolean
        readonly immediate?: boolean
      })
    | null,
): EffectHandle {
  const resolvedHandler = handler as unknown as WatchHandler<unknown>
  const resolvedOptions = options as unknown as WatchOptions<unknown> | null | undefined
  if (Array.isArray(source)) {
    const getter = (): unknown[] => source.map(resolveSource)
    return createWatcher(
      runtime,
      getter,
      resolvedHandler as WatchHandler<unknown[]>,
      (resolvedOptions ?? {}) as WatchOptions<unknown[]>,
      shallowArrayEqual,
    )
  }
  if (isSignalLike(source)) {
    return createWatcher(
      runtime,
      () => readSignalLike(source),
      resolvedHandler,
      resolvedOptions ?? {},
    )
  }
  if (typeof source === 'function') {
    return createWatcher(
      runtime,
      () => Reflect.apply(source, undefined, []) as unknown,
      resolvedHandler,
      resolvedOptions ?? {},
    )
  }
  return createWatcher(runtime, () => resolveSource(source), resolvedHandler, resolvedOptions ?? {})
}
