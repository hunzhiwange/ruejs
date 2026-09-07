import type {} from './global.js'

const RUE_JS_ERROR_BRIDGE_KEY = '__rue_js_error_bridge_installed'
const RUE_JS_ERROR_HANDLERS_KEY = '__rue_js_error_handlers'
const RUE_RENDER_TRIGGERED_HOOKS_KEY = '__rue_render_triggered_hooks'
const RUE_PENDING_ENTRY_ERROR_KEY = '__rue_pending_entry_error__'
const RUE_ACTIVE_ENTRY_DEPTH_KEY = '__rue_active_entry_depth__'

interface RuntimeEntryMethodMap {
  mount(app: unknown, container: unknown): unknown
  render(value: unknown, container: unknown): unknown
  renderAnchor(value: unknown, parent: unknown, anchor: unknown): unknown
  renderStatic(value: unknown, parent: unknown, anchor: unknown): unknown
}

type RuntimeEntryMethodKey = keyof RuntimeEntryMethodMap

type RuntimeEntryTarget = RuntimeVaporEntryPrivateFields &
  Partial<RuntimeEntryMethodMap> & {
    handleError?: (error: unknown, instance?: unknown) => unknown
    onError?: (callback: unknown) => unknown
    onRenderTriggered?: (callback: unknown) => unknown
  }

type NormalizeRenderTriggeredEvent = (event: unknown) => unknown

const canTrackRuntime = (runtime: unknown): runtime is RuntimeEntryTarget =>
  (typeof runtime === 'object' || typeof runtime === 'function') && runtime != null

const isObjectLike = (value: unknown): value is RuntimeVaporRenderOwner =>
  (typeof value === 'object' || typeof value === 'function') && value != null

const registerSharedRenderTriggeredHook = (
  callback: RuntimeVaporRenderTriggeredHook,
): (() => void) | undefined => {
  const bridge = globalThis.__rue_compiled_runtime_bridge
  const owner = bridge?.getCurrentRenderOwner?.()
  if (!bridge || !isObjectLike(owner)) {
    return undefined
  }
  let hooks = owner[RUE_RENDER_TRIGGERED_HOOKS_KEY]
  if (!Array.isArray(hooks)) {
    hooks = []
    Object.defineProperty(owner, RUE_RENDER_TRIGGERED_HOOKS_KEY, {
      value: hooks,
      enumerable: false,
      configurable: true,
    })
  }
  hooks.push(callback)
  bridge.__rue_render_triggered_owner = owner
  return () => {
    const index = hooks.indexOf(callback)
    if (index >= 0) {
      hooks.splice(index, 1)
    }
    if (bridge?.__rue_render_triggered_owner === owner && !hooks.length) {
      bridge.__rue_render_triggered_owner = undefined
    }
  }
}

/*
错误处理桥接：onError

组件级 errorCaptured 优先消费；未处理错误在入口退出前只派发一次，pending entry error
必须等当前入口完成后再抛出，避免与显式错误重复广播。
*/
const installRuntimeErrorBridge = <Runtime>(runtime: Runtime): Runtime => {
  if (!canTrackRuntime(runtime)) {
    return runtime
  }

  if (runtime[RUE_JS_ERROR_BRIDGE_KEY]) {
    return runtime
  }

  const handlers = new Set<RuntimeVaporErrorHandler>()
  const originalHandleError =
    typeof runtime.handleError === 'function' ? runtime.handleError.bind(runtime) : null
  const originalOnError =
    typeof runtime.onError === 'function' ? runtime.onError.bind(runtime) : null
  let handlingExplicitError = false

  const forwardError = (error: unknown, instance?: unknown): void => {
    if (handlingExplicitError) {
      return
    }
    if ((runtime[RUE_ACTIVE_ENTRY_DEPTH_KEY] ?? 0) > 0) {
      if (runtime[RUE_PENDING_ENTRY_ERROR_KEY] !== undefined) {
        return
      }
      runtime[RUE_PENDING_ENTRY_ERROR_KEY] = error
      return
    }
    handlers.forEach(handler => {
      try {
        handler(error, instance)
      } catch {}
    })
  }

  originalOnError?.(forwardError)

  runtime[RUE_JS_ERROR_HANDLERS_KEY] = handlers
  runtime.onError = (fn: unknown): (() => void) | undefined => {
    if (typeof fn !== 'function') {
      return undefined
    }

    const handler = fn as RuntimeVaporErrorHandler
    handlers.add(handler)
    return () => {
      handlers.delete(handler)
    }
  }

  runtime.handleError = (error: unknown, instance?: unknown): boolean => {
    const dispatchErrorCaptured = globalThis.__rue_dispatch_error_captured
    if (
      typeof dispatchErrorCaptured === 'function' &&
      dispatchErrorCaptured(error, instance, 'component render') === true
    ) {
      return false
    }

    if (originalHandleError) {
      handlingExplicitError = true
      try {
        originalHandleError(error, instance)
      } catch {
      } finally {
        handlingExplicitError = false
      }
    } else {
      forwardError(error, instance)
      return true
    }

    dispatchCaughtError(runtime, error, instance)

    if (handlers.size === 0) {
      try {
        console.error?.(error)
      } catch {}
    }

    return true
  }

  // 组件 render 失败已在 JS Runtime 中走过 errorCaptured；这里抛给最外层入口统一派发，
  // 保持底层入口语义，同时避免嵌套组件帧重复派发。
  runtime.__rueHandleComponentError = (error: unknown): never => {
    throw error
  }

  runtime[RUE_JS_ERROR_BRIDGE_KEY] = true
  return runtime
}

const shouldDispatchCaughtError = (runtime: RuntimeEntryTarget): boolean => {
  const handlers = runtime?.[RUE_JS_ERROR_HANDLERS_KEY]
  return handlers instanceof Set && handlers.size > 0
}

const dispatchCaughtError = (
  runtime: RuntimeEntryTarget,
  error: unknown,
  instance: unknown = null,
): void => {
  const handlers = runtime?.[RUE_JS_ERROR_HANDLERS_KEY]
  if (!(handlers instanceof Set)) {
    return
  }
  handlers.forEach(handler => {
    try {
      handler(error, instance)
    } catch {}
  })
}

const wrapRuntimeEntryMethod = <Key extends RuntimeEntryMethodKey>(
  runtime: RuntimeEntryTarget,
  methodName: Key,
): void => {
  const original = runtime[methodName] as RuntimeEntryMethodMap[Key] | undefined
  if (typeof original !== 'function') {
    return
  }

  const wrappedRuntimeEntry = function wrappedRuntimeEntry(
    this: ThisParameterType<RuntimeEntryMethodMap[Key]>,
    ...args: Parameters<RuntimeEntryMethodMap[Key]>
  ): ReturnType<RuntimeEntryMethodMap[Key]> {
    runtime[RUE_PENDING_ENTRY_ERROR_KEY] = undefined
    runtime[RUE_ACTIVE_ENTRY_DEPTH_KEY] = (runtime[RUE_ACTIVE_ENTRY_DEPTH_KEY] ?? 0) + 1
    let rethrowingPendingEntryError = false
    try {
      const result = Reflect.apply(original, this, args) as ReturnType<RuntimeEntryMethodMap[Key]>
      const pending = runtime[RUE_PENDING_ENTRY_ERROR_KEY]
      runtime[RUE_PENDING_ENTRY_ERROR_KEY] = undefined
      if (pending !== undefined && pending !== null) {
        dispatchCaughtError(runtime, pending)
        rethrowingPendingEntryError = true
        throw pending
      }
      return result
    } catch (error) {
      runtime[RUE_PENDING_ENTRY_ERROR_KEY] = undefined
      if (!rethrowingPendingEntryError && shouldDispatchCaughtError(runtime)) {
        dispatchCaughtError(runtime, error)
      }
      throw error
    } finally {
      runtime[RUE_ACTIVE_ENTRY_DEPTH_KEY] = Math.max(
        0,
        (runtime[RUE_ACTIVE_ENTRY_DEPTH_KEY] ?? 1) - 1,
      )
    }
  }
  if (!Reflect.set(runtime, methodName, wrappedRuntimeEntry)) {
    throw new TypeError(`Cannot wrap runtime entry method: ${methodName}`)
  }
}

const wrapRenderTriggeredHook = (
  runtime: RuntimeEntryTarget,
  normalizeRenderTriggeredEvent?: NormalizeRenderTriggeredEvent,
): void => {
  const original = runtime.onRenderTriggered
  if (typeof original !== 'function') {
    return
  }

  runtime.onRenderTriggered = function wrappedOnRenderTriggered(
    this: unknown,
    callback: unknown,
  ): unknown {
    if (typeof callback !== 'function') {
      return Reflect.apply(original, this, [callback])
    }
    const hook = callback as RuntimeVaporRenderTriggeredHook
    const normalizedCallback = (event: unknown): unknown =>
      hook(normalizeRenderTriggeredEvent ? normalizeRenderTriggeredEvent(event) : event)
    const dispose = registerSharedRenderTriggeredHook(normalizedCallback)
    if (dispose) {
      globalThis.__rue_compiled_runtime_bridge?.activateRenderTriggered?.()
      return dispose
    }
    return Reflect.apply(original, this, [normalizedCallback])
  }
}

export const wrapCreateRue =
  <Adapter, Runtime>(
    rawCreateRue: (adapter: Adapter) => Runtime,
    normalizeRenderTriggeredEvent?: NormalizeRenderTriggeredEvent,
  ) =>
  (adapter: Adapter): Runtime => {
    const runtime = installRuntimeErrorBridge(rawCreateRue(adapter))
    if (!canTrackRuntime(runtime)) {
      return runtime
    }

    for (const methodName of ['mount', 'render', 'renderAnchor', 'renderStatic'] as const) {
      wrapRuntimeEntryMethod(runtime, methodName)
    }
    wrapRenderTriggeredHook(runtime, normalizeRenderTriggeredEvent)
    return runtime
  }
