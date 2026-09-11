export * from '../runtime-core/reactive.browser'
/** Rue 响应式信号句柄、effect scope 与调试事件类型。 */
export type {
  ComputedHandle,
  DebuggerEvent,
  DebuggerHook,
  EffectScope,
  ObjectRef,
  ToRefs,
  WatchEffectOptions,
  WatchFlush,
  WatchCallback,
  CustomRefFactory,
  WatchMultiSource,
  WatchOptions,
  WatchSource,
} from '../runtime-core/reactive'
export type { SignalHandle } from '../runtime-core/reactive'

export { createResource } from './resource'
