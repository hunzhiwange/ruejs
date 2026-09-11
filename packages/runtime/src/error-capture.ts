/**
 * 组件错误捕获辅助模块。
 *
 * onErrorCaptured 将处理器登记在当前组件实例及其关联 Context owner 上；
 * dispatchErrorCaptured 则沿组件父链向上冒泡，遇到返回 false 的处理器即停止继续传播。
 */
import { getCurrentInstance } from './runtime-core/reactive'
import { isWeakKey, retainRootMountError, shouldRetainRootMountError } from './root-mount-error'

export { retainRootMountError, shouldRetainRootMountError }

/** 组件实例上保存 errorCaptured handlers 的非枚举内部字段。 */
const RUE_ERROR_CAPTURE_HANDLERS_KEY = '__rue_error_capture_handlers__'
/** Context provider 记录的 owner 父级字段，用于跨 Context 恢复错误冒泡链。 */
const RUE_CONTEXT_OWNER_PARENT_PROP = '__rue_context_owner_parent__'
/** 组件实例记录的直接父级字段。 */
const RUE_CONTEXT_PARENT_INSTANCE_PROP = '__rue_context_parent_instance__'
/** Context owner 与真实组件实例之间的双向关联字段。 */
const RUE_CONTEXT_LINKED_INSTANCE_PROP = '__rue_context_linked_instance__'

/** onErrorCaptured 注册的处理器；返回 false 表示错误已被消费。 */
export type ErrorCapturedHook = (error: any, instance?: any, info?: string) => boolean | void

/** 可挂载错误捕获处理器的组件/Context owner 形态。 */
type ErrorCaptureOwner = Record<string, unknown> & {
  [RUE_ERROR_CAPTURE_HANDLERS_KEY]?: Set<ErrorCapturedHook>
}

/** dispatch 时可跳过的 owner 集合，避免同一错误在包装组件处重复触发。 */
type DispatchErrorCapturedOptions = {
  ignoredOwners?: Set<unknown>
}

/** 已经走过 errorCaptured 冒泡的 Error 对象，用于避免全局桥接重复派发。 */
const dispatchedErrors = new WeakSet<object>()

/** 将未知值安全收窄为错误捕获 owner。 */
const asErrorCaptureOwner = (value: unknown): ErrorCaptureOwner | null =>
  isWeakKey(value) ? (value as ErrorCaptureOwner) : null

/** 获取 Context owner 关联的真实组件实例。 */
const getLinkedInstance = (instance: unknown) => {
  const owner = asErrorCaptureOwner(instance)
  return owner?.[RUE_CONTEXT_LINKED_INSTANCE_PROP]
}

/** 解析错误冒泡的上一级，兼容实例字段与 propsRO 上的 Context 父级标记。 */
const getParentErrorCaptureInstance = (instance: unknown) => {
  const owner = asErrorCaptureOwner(instance)
  if (!owner) {
    return null
  }

  const ownerParent = owner[RUE_CONTEXT_OWNER_PARENT_PROP]
  if (ownerParent != null && ownerParent !== instance) {
    return ownerParent
  }

  const directParent = owner[RUE_CONTEXT_PARENT_INSTANCE_PROP]
  if (directParent != null && directParent !== instance) {
    return directParent
  }

  const props = owner.propsRO
  if (isWeakKey(props)) {
    return props[RUE_CONTEXT_OWNER_PARENT_PROP] ?? props[RUE_CONTEXT_PARENT_INSTANCE_PROP] ?? null
  }

  return null
}

/** 标记错误已被 errorCaptured 链处理过。 */
const rememberDispatchedError = (error: unknown) => {
  if (isWeakKey(error)) {
    dispatchedErrors.add(error)
  }
}

/** 判断某个错误对象是否已走过 errorCaptured 派发流程。 */
export const wasErrorCapturedDispatched = (error: unknown) => dispatchedErrors.has(error as object)

/** 注册组件树错误捕获回调，返回取消注册函数。 */
export { onErrorCaptured } from './compiler-runtime/component-errors'

/** 生成需要跳过的当前实例/关联实例集合，供组件包装器避免重复派发。 */
export const createIgnoredErrorCaptureOwners = (instance: unknown) => {
  const ignored = new Set<unknown>()
  if (instance != null) {
    ignored.add(instance)
  }
  const linked = getLinkedInstance(instance)
  if (linked != null) {
    ignored.add(linked)
  }
  return ignored
}

/** 从当前实例开始向父级冒泡错误捕获处理器；返回 true 表示错误被消费。 */
export const dispatchErrorCaptured = (
  error: any,
  instance?: any,
  info = 'runtime error',
  options: DispatchErrorCapturedOptions = {},
) => {
  const start = instance ?? getCurrentInstance()
  const visitedOwners = new Set<unknown>()
  const invokedHandlers = new Set<ErrorCapturedHook>()
  let current: unknown = start

  rememberDispatchedError(error)

  while (current && !visitedOwners.has(current)) {
    visitedOwners.add(current)

    const linked = getLinkedInstance(current)
    const owners = linked && linked !== current ? [current, linked] : [current]

    for (const owner of owners) {
      if (options.ignoredOwners?.has(owner)) {
        continue
      }
      const handlers = asErrorCaptureOwner(owner)?.[RUE_ERROR_CAPTURE_HANDLERS_KEY]
      if (!(handlers instanceof Set)) {
        continue
      }

      // oxlint-disable-next-line unicorn/no-useless-spread -- Snapshot before invoking handlers; handlers may mutate the set.
      for (const handler of [...handlers]) {
        if (invokedHandlers.has(handler)) {
          continue
        }
        invokedHandlers.add(handler)
        try {
          if (handler(error, instance ?? start, info) === false) {
            return true
          }
        } catch (hookError) {
          try {
            ;(console as any).error?.(hookError)
          } catch {}
        }
      }
    }

    current = getParentErrorCaptureInstance(current)
  }

  return false
}

;(
  globalThis as typeof globalThis & {
    __rue_dispatch_error_captured?: (error: any, instance?: any, info?: string) => boolean
  }
).__rue_dispatch_error_captured = (error, instance, info) =>
  wasErrorCapturedDispatched(error) ? false : dispatchErrorCaptured(error, instance, info)
