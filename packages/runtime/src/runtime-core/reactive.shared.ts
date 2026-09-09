import { createReactiveFacade } from './js-reactive/facade.js'
import { reactiveKernel } from './reactive-kernel/shared.js'

export type EffectHandle = import('./js-reactive/types.js').EffectHandle
export type SignalHandle<T> = import('./js-reactive/types.js').SignalHandle<T>

const facade = createReactiveFacade(reactiveKernel)
const runtimeWithJsHooks = {
  ...facade.default,
  ...facade.hooks,
}

export const {
  __rueGetEffectScopeDebugState,
  watchPostEffect,
  watchSyncEffect,
  watchEffect,
  watch,
  onWatcherCleanup,
  onScopeDispose,
  nextTick,
  __rueCurrentEffectId,
  __rueDisposeEffectScope,
  __rueGetSignalWrapperRegistryDebugState,
  createSignal,
  signal,
  normalizeRenderTriggeredEvent,
  isReadonly,
  isRef,
  onRenderTracked,
  getCurrentScope,
  effectScope,
  computed,
  customRef,
  createComputed,
  shallowRef,
  triggerRef,
} = facade

export const {
  __rueDisposeHookScopeForInstance,
  getCurrentInstance,
  setCurrentInstance,
  isReactive,
  ref,
  unref,
  useEffect,
  useRef,
  useSetup,
  useState,
  vaporWithHookId,
  withHookSlot,
} = facade.hooks

export const {
  EffectHandle,
  SignalHandle,
  batch,
  createEffect,
  createRef,
  createResource,
  createCustomRef,
  onCleanup,
  setReactiveScheduling,
  toValue,
  untrack,
  watchDeepSignal,
  watchFn,
  watchPath,
  watchSignal,
  __rueActivateEffectOwnerTracking,
  __rueActivateRenderTriggered,
  __rueBeginRenderDebugOwner,
  __rueCreateDetachedEffectScope,
  __rueEndRenderDebugOwner,
  __rueGetCurrentEffectScope,
  __ruePopEffectScope,
  __ruePushEffectScope,
} = reactiveKernel

export default runtimeWithJsHooks
