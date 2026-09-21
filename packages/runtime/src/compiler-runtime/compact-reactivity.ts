import {
  _$compiledSetup,
  _$compiledStateSignal,
  effect,
  getCurrentOwner,
  registerOwnerLifecycle,
  untrack,
  onOwnerCleanup,
  signal,
  type CompiledSignalHandle,
  type SignalOptions,
} from '../runtime-core/compiled'

export type CompactRef<T> = CompiledSignalHandle<T> & { readonly __rue_ref__: true }

export type CustomRefFactory<T> = (
  track: () => void,
  trigger: () => void,
) => { get: () => T; set: (value: T) => void }

type SetStateAction<T> = T | ((previous: T) => T)
type Dispatch<T> = (value: T) => void
type StateOptions<T> = SignalOptions<T>

export const _$compiledUseState = <T>(
  slot: string,
  initial: T | (() => T),
  options?: StateOptions<T>,
): [CompiledSignalHandle<T>, Dispatch<SetStateAction<T>>] =>
  _$compiledSetup(slot, () => {
    const value = typeof initial === 'function' ? (initial as () => T)() : initial
    const state = _$compiledStateSignal(value, options)
    const setState: Dispatch<SetStateAction<T>> = next => {
      state.set(typeof next === 'function' ? (next as (previous: T) => T)(state.peek()) : next)
    }
    return [state, setState]
  })

/** Ref.value is a tracked read; signal.value remains the explicit untracked cache. */
export const ref = <T>(value: T, options?: SignalOptions<T>): CompactRef<T> => {
  const state = signal(value, options)
  Object.defineProperty(state, '__rue_ref__', { value: true })
  Object.defineProperty(state, 'value', {
    configurable: true,
    enumerable: true,
    get: () => state.get(),
    set: (next: T) => state.set(next),
  })
  Object.defineProperty(state, Symbol.toPrimitive, {
    configurable: true,
    value: (hint: string) => {
      const current = state.get()
      if (current == null || (typeof current !== 'object' && typeof current !== 'function')) {
        return current
      }
      if (hint === 'number') return Number(current)
      try {
        return JSON.stringify(current) ?? String(current)
      } catch {
        return String(current)
      }
    },
  })
  return state as CompactRef<T>
}

export const customRef = <T>(factory: CustomRefFactory<T>): CompactRef<T> => {
  const dependency = signal<T>(undefined as T)
  const track = dependency.get.bind(dependency)
  const trigger = dependency.trigger.bind(dependency)
  const access = factory(() => {
    track()
  }, trigger)

  dependency.get = access.get
  dependency.peek = () => untrack(access.get)
  dependency.set = access.set
  Object.defineProperty(dependency, '__rue_ref__', { value: true })
  Object.defineProperty(dependency, 'value', {
    configurable: true,
    enumerable: true,
    get: access.get,
    set: access.set,
  })
  return dependency as CompactRef<T>
}

export const computed = <T>(read: () => T): CompactRef<T> => {
  const value = ref<T>(undefined as T)
  const stop = effect(() => value.set(read()))
  const dispose = value.dispose.bind(value)
  value.dispose = () => {
    stop.dispose()
    dispose()
  }
  return value
}

export const watchEffect = (callback: () => void | (() => void)) => effect(callback)

export const onMounted = (callback: () => void): void => {
  if (getCurrentOwner() === undefined) queueMicrotask(callback)
  else registerOwnerLifecycle('mounted', callback)
}

export const onUnmounted = (callback: () => void): void => {
  if (getCurrentOwner() !== undefined) registerOwnerLifecycle('unmounted', callback)
}

export const onBeforeMount = (callback: () => void): void => {
  registerOwnerLifecycle('beforeMount', callback)
}
export const onBeforeUpdate = (callback: () => void): void => {
  registerOwnerLifecycle('beforeUpdate', callback)
}
export const onUpdated = (callback: () => void): void => {
  registerOwnerLifecycle('updated', callback)
}
export const onBeforeUnmount = (callback: () => void): void => {
  registerOwnerLifecycle('beforeUnmount', callback)
}

export const shallowRef = ref
export const isRef = (value: unknown): value is CompactRef<unknown> =>
  value != null && typeof value === 'object' && '__rue_ref__' in value && value.__rue_ref__ === true
export const unref = <T>(value: T | CompactRef<T>): T =>
  isRef(value) ? (value.value as T) : (value as T)
export const toValue = <T>(value: T | (() => T) | CompactRef<T>): T =>
  typeof value === 'function' ? (value as () => T)() : unref(value)
export const triggerRef = (value: CompactRef<unknown>): void => value.trigger()

export interface WatchOptions<T> {
  immediate?: boolean
  equals?: (previous: T, next: T) => boolean
}
/** Only the compiler-provided getter is tracked; callback reads never become dependencies. */
export const watch = <T>(
  read: () => T,
  callback: (next: T, previous: T | undefined) => unknown,
  options: WatchOptions<T> = {},
) => {
  let initialized = false
  let previous: T | undefined
  let cleanup: unknown
  const disposeCleanup = () => {
    const current = cleanup
    cleanup = undefined
    if (typeof current === 'function') untrack(current as () => void)
  }
  onOwnerCleanup(disposeCleanup)
  return effect(
    () => {
      const next = read()
      const changed = !initialized || !(options.equals ?? Object.is)(previous as T, next)
      const invoke = changed && (initialized || options.immediate)
      const old = previous
      previous = next
      initialized = true
      if (invoke)
        untrack(() => {
          disposeCleanup()
          cleanup = callback(next, old)
        })
    },
    { onDispose: disposeCleanup },
  )
}
export const watchFn = watch
export const watchSignal = <T>(
  source: CompiledSignalHandle<T>,
  callback: (next: T, previous: T | undefined) => unknown,
  options?: WatchOptions<T>,
) => watch(() => source.get(), callback, options)
export const watchPath = <T>(
  source: import('../runtime-core/reactive-kernel/signal').SignalHandle<T>,
  path: readonly PropertyKey[],
  callback: (next: unknown, previous: unknown) => unknown,
  options?: WatchOptions<unknown>,
) => watch(() => source.getPath(path), callback, options)
