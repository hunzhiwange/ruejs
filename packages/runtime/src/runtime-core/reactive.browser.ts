// Direct primitives. There is no default/hooks facade or runtime Hook object.
export * from './compiled'
export {
  effect as createEffect,
  signal as createSignal,
  getCurrentOwner as getCurrentInstance,
  onOwnerCleanup as onScopeDispose,
} from './compiled'
export {
  computed,
  computed as createComputed,
  ref,
  shallowRef,
  isRef,
  unref,
  toValue,
  triggerRef,
  watch,
  watchFn,
  watchSignal,
  watchPath,
  watchEffect,
} from '../compiler-runtime/compact-reactivity'
export { useState, useEffect, useRef, useSetup } from '../compiler-runtime/hooks'
// Legacy runtime construction is removed by the entry migration task; it uses only the kernel.
export { reactiveKernel as default } from './reactive-kernel/shared'
export { EffectHandle } from './reactive-kernel/index'
export type { CompiledSignalHandle as SignalHandle } from './compiled'

import { getSharedReactiveRuntime } from './reactive-kernel/shared-runtime'
export const nextTick = <T = void>(callback?: () => T | PromiseLike<T>) =>
  callback === undefined
    ? getSharedReactiveRuntime().nextTick()
    : getSharedReactiveRuntime().nextTick(callback)
