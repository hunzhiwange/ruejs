import { createRuntimeServices } from './runtime-services.js'
import {
  createReactiveEffectRuntimeStorage,
  type ReactiveEffectRuntimeStorage,
} from './effect-core.js'

// Shared across separately bundled public and compiler entries. No facade imports here.
const key = Symbol.for('@rue-js/runtime/reactive-effect-storage')
const registry = globalThis as typeof globalThis & { [key]?: ReactiveEffectRuntimeStorage }
export const getSharedReactiveStorage = () =>
  (registry[key] ??= createReactiveEffectRuntimeStorage({
    onErrorCaptured: (error, owner, info) =>
      globalThis.__rue_compiled_runtime_bridge?.dispatchErrorCaptured?.(error, owner, info) ===
      true,
  }))

export const peekSharedReactiveStorage = () => registry[key]

export const getSharedReactiveRuntime = () => createRuntimeServices(getSharedReactiveStorage())
