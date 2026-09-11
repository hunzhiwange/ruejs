import { ComputedHandle, createComputed, type ComputedInput } from './computed.js'
import { EffectHandle } from './effect-handle.js'
import {
  createReactiveEffectRuntimeStorage,
  type ReactiveEffectRuntimeOptions,
} from './effect-core.js'
import { createRuntimeServices, type ReactiveRuntimeServices } from './runtime-services.js'
import { createCustomRef, createRef, type CustomRefFactory } from './ref.js'
import { createResource } from './resource.js'
import { SignalHandle, createSignal, type SignalOptions, type SignalPath } from './signal.js'
import {
  watch,
  watchDeepSignal,
  watchEffect,
  watchFn,
  watchPath,
  watchSignal,
  type WatchHandler,
  type WatchOptions,
} from './watch.js'

export { ComputedHandle, EffectHandle, SignalHandle }
export type { ComputedGetter, ComputedInput, ComputedOptions, ComputedSetter } from './computed.js'
export type {
  EffectCallback,
  EffectCleanup,
  EffectOptions,
  EffectScheduler,
  ReactiveEffectRuntimeOptions,
  ReactiveTriggerEvent,
} from './effect.js'
export type { CustomRefFactory, RefValue } from './ref.js'
export type { Resource } from './resource.js'
export type { EqualityComparator, SignalOptions, SignalPath, SignalPathToken } from './signal.js'
export type {
  WatchEffectOptions,
  WatchHandler,
  WatchMultiValues,
  WatchOptions,
  WatchSource,
  WatchSourceValue,
} from './watch.js'

const isObjectLike = (value: unknown): value is object | ((...args: never[]) => unknown) =>
  (typeof value === 'object' && value !== null) || typeof value === 'function'

const readProperty = (
  value: object | ((...args: never[]) => unknown),
  key: PropertyKey,
): unknown => {
  try {
    return Reflect.get(value, key)
  } catch {
    return undefined
  }
}

/** Resolve getters and ref-like values while preserving ordinary values. */
const toValue = <T>(value: T | (() => T) | { value?: T; get?: () => T }): T => {
  if (typeof value === 'function') return Reflect.apply(value, undefined, []) as T
  if (!isObjectLike(value)) return value
  const refValue = readProperty(value, 'value')
  if (refValue !== undefined) return refValue as T
  const getter = readProperty(value, 'get')
  return typeof getter === 'function' ? (Reflect.apply(getter, value, []) as T) : (value as T)
}

/**
 * Create one complete TypeScript reactive kernel.
 *
 * Every public operation closes over the same runtime instance, so graph ids,
 * scopes, scheduler queues, and effect ownership cannot split across entries.
 */
export const createReactiveKernel = (
  options: ReactiveEffectRuntimeOptions = {},
  sharedRuntime?: ReactiveRuntimeServices,
) => {
  let renderTriggeredActive = false
  const runtime =
    sharedRuntime ??
    createRuntimeServices(
      createReactiveEffectRuntimeStorage({
        ...options,
        onRenderTriggered: (effectId, event, owner) => {
          options.onRenderTriggered?.(effectId, event, owner)
          if (renderTriggeredActive) {
            ;(globalThis as any).__rue_compiled_runtime_bridge?.dispatchRenderTriggeredForEffect?.(
              effectId,
              event,
              owner,
            )
          }
        },
      }),
    )

  return {
    EffectHandle,
    SignalHandle,
    __rueActivateEffectOwnerTracking: (): void => {},
    __rueActivateRenderTriggered: (): void => {
      renderTriggeredActive = true
      if (sharedRuntime) {
        sharedRuntime.storage.onRenderTriggered = (id, event, owner) =>
          (globalThis as any).__rue_compiled_runtime_bridge?.dispatchRenderTriggeredForEffect?.(
            id,
            event,
            owner,
          )
      }
    },
    __rueBeginRenderDebugOwner: (owner: unknown): void => runtime.beginRenderDebugOwner(owner),
    __rueCreateDetachedEffectScope: (): number => runtime.scopes.create(true),
    __rueCurrentEffectId: (): number | undefined => runtime.currentEffectId,
    __rueDisposeEffectScope: (scopeId: number): void => {
      runtime.scopes.dispose(scopeId)
    },
    __rueEndRenderDebugOwner: (): void => {
      runtime.endRenderDebugOwner()
    },
    __rueGetCurrentEffectScope: (): number | undefined => runtime.scopes.current,
    __ruePopEffectScope: (): void => {
      runtime.scopes.pop()
    },
    __ruePushEffectScope: (scopeId: number): void => {
      runtime.scopes.push(scopeId)
    },
    batch: <T>(callback: () => T): T => runtime.batch(callback),
    createComputed: <T>(input: ComputedInput<T>): ComputedHandle<T> =>
      createComputed(runtime, input),
    createCustomRef: <T>(factory: CustomRefFactory<T>) => createCustomRef(runtime, factory),
    createEffect: (
      callback: () => void,
      effectOptions?: Parameters<ReactiveRuntimeServices['createEffect']>[1] | null,
    ): EffectHandle => runtime.createEffect(callback, effectOptions ?? {}),
    createRef: <T>(initial: T, signalOptions?: SignalOptions<T> | null) =>
      createRef(runtime, initial, signalOptions),
    createResource: <TSource, TData>(
      source: Pick<SignalHandle<TSource>, 'get'>,
      fetcher: (source: TSource) => Promise<TData>,
    ) => createResource(runtime, source, fetcher),
    createSignal: <T>(
      initial: T,
      signalOptions?: SignalOptions<T> | null,
      _forceGlobal?: boolean,
    ): SignalHandle<T> => createSignal(runtime, initial, signalOptions),
    nextTick: <T = void>(callback?: () => T | PromiseLike<T>): Promise<T | void> =>
      callback === undefined ? runtime.nextTick() : runtime.nextTick(callback),
    onCleanup: (cleanup: () => void): void => {
      runtime.onCleanup(cleanup)
    },
    onScopeDispose: (cleanup: () => void, failSilently = false): void => {
      runtime.scopes.onScopeDispose(cleanup, failSilently)
    },
    onWatcherCleanup: (cleanup: () => void, failSilently = false): void => {
      runtime.onWatcherCleanup(cleanup, failSilently)
    },
    setReactiveScheduling: (mode: string): void => {
      runtime.setScheduling(mode === 'sync' || mode === 'frame' ? mode : 'microtask')
    },
    toValue,
    untrack: <T>(callback: () => T): T => runtime.untrack(callback),
    watch: (
      source: unknown,
      handler: WatchHandler<unknown>,
      watchOptions?: WatchOptions<unknown> | null,
    ): EffectHandle => watch(runtime, source, handler, watchOptions),
    watchDeepSignal: <T>(
      source: SignalHandle<T>,
      handler: WatchHandler<T>,
      watchOptions?: WatchOptions<T> | null,
    ): EffectHandle => watchDeepSignal(runtime, source, handler, watchOptions),
    watchEffect: (callback: () => void, watchOptions?: WatchOptions | null): EffectHandle =>
      watchEffect(runtime, callback, watchOptions),
    watchFn: <T>(
      getter: () => T,
      handler: WatchHandler<T>,
      watchOptions?: WatchOptions<T> | null,
    ): EffectHandle => watchFn(runtime, getter, handler, watchOptions),
    watchPath: <T>(
      source: SignalHandle<T>,
      path: SignalPath,
      handler: WatchHandler<unknown>,
      watchOptions?: WatchOptions<unknown> | null,
    ): EffectHandle => watchPath(runtime, source, path, handler, watchOptions),
    watchSignal: <T>(
      source: SignalHandle<T>,
      handler: WatchHandler<T>,
      watchOptions?: WatchOptions<T> | null,
    ): EffectHandle => watchSignal(runtime, source, handler, watchOptions),
  }
}

export type TypeScriptReactiveKernel = ReturnType<typeof createReactiveKernel>
