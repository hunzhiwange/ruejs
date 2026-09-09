import {
  _$compiledSetup,
  _$compiledStateSignal,
  effect,
  getCurrentOwner,
  registerOwnerLifecycle,
  signal,
  type CompiledSignalHandle,
  type SignalOptions,
} from '../runtime-core/compiled'

export type CompactRef<T> = CompiledSignalHandle<T>

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

export const ref = <T>(value: T): CompactRef<T> => signal(value)

export const computed = <T>(read: () => T): CompactRef<T> => {
  const value = signal(read())
  effect(() => value.set(read()))
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
