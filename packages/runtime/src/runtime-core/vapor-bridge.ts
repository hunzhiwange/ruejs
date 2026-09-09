import type {} from './global.js'

/*
共享运行时桥

挂载与渲染由 JS runtime 维护；TypeScript reactive kernel 通过全局
`__rue_compiled_runtime_bridge` 连接 effect scope、owner 与错误边界相关方法：
- 若桥不存在，直接跳过，保证无共享桥的环境仍可运行
- 若方法存在，按名称反射调用，避免响应式内核与 JS 共享层强耦合
*/

const RUE_SHARED_RENDER_SCOPE_KEY = '__rue_shared_render_scope_id'
const RUE_SHARED_VAPOR_SCOPE_KEY = '__rue_shared_vapor_scope_id'
const RUE_CONTEXT_OWNER_PARENT_KEY = '__rue_context_owner_parent__'
const RUE_SHARED_RUNTIME_REF_KEY = '__rue_shared_runtime_ref__'

type SharedScopeKey = typeof RUE_SHARED_RENDER_SCOPE_KEY | typeof RUE_SHARED_VAPOR_SCOPE_KEY
type SharedRuntimeRef = { current: RuntimeVaporSharedRuntime }
type RebindableSharedBridge = InstalledRuntimeVaporSharedBridge & {
  [RUE_SHARED_RUNTIME_REF_KEY]?: SharedRuntimeRef
}

const asBridgeOwner = (value: unknown): RuntimeVaporRenderOwner | null => {
  if ((typeof value !== 'object' && typeof value !== 'function') || value == null) {
    return null
  }
  return value as RuntimeVaporRenderOwner
}

const disposeScopeKey = (
  sharedRuntime: RuntimeVaporSharedRuntime,
  owner: unknown,
  key: SharedScopeKey,
): void => {
  const target = asBridgeOwner(owner)
  if (!target) {
    return
  }
  const scopeId = target[key]
  if (typeof scopeId === 'number') {
    sharedRuntime.__rueDisposeEffectScope(scopeId)
  }
  target[key] = undefined
}

export const installSharedBridge = (
  sharedRuntime: RuntimeVaporSharedRuntime,
): InstalledRuntimeVaporSharedBridge => {
  const existing = globalThis.__rue_compiled_runtime_bridge as RebindableSharedBridge | undefined
  const existingRuntimeRef = existing?.[RUE_SHARED_RUNTIME_REF_KEY]
  if (existing && existingRuntimeRef) {
    existingRuntimeRef.current = sharedRuntime
    return existing
  }

  const runtimeRef: SharedRuntimeRef = { current: sharedRuntime }
  const getSharedRuntime = (): RuntimeVaporSharedRuntime => runtimeRef.current
  const getCurrentInstance = (): unknown => getSharedRuntime().getCurrentInstance?.()
  const setCurrentInstance = (instance: unknown): void =>
    getSharedRuntime().setCurrentInstance?.(instance)
  const disposeHookScopeForInstance = (instance: RuntimeVaporRenderOwner): void =>
    getSharedRuntime().__rueDisposeHookScopeForInstance?.(instance)

  const instanceStack: unknown[] = []
  // 当前 render owner 供 JS 侧 onRenderTracked 绑定组件实例。
  const renderOwnerStack: Array<RuntimeVaporRenderOwner | undefined> = []
  const renderScopeStack: boolean[] = []
  const componentSetupScopeStack: boolean[] = []
  const vaporInstanceStack: unknown[] = []
  const currentContainerStack: unknown[] = []
  const effectScopeOwners = new Map<number, RuntimeVaporRenderOwner>()

  const forgetScopeOwner = (owner: unknown, key: SharedScopeKey): void => {
    const scopeId = asBridgeOwner(owner)?.[key]
    if (typeof scopeId === 'number') effectScopeOwners.delete(scopeId)
  }

  const bridge: InstalledRuntimeVaporSharedBridge = {
    beginComponentRender(instance: unknown) {
      const target = asBridgeOwner(instance)
      const prevInstance = getCurrentInstance()
      instanceStack.push(prevInstance)
      if (!target) {
        renderOwnerStack.push(undefined)
        renderScopeStack.push(false)
        setCurrentInstance(undefined)
        return
      }
      const hooks = (
        target as RuntimeVaporRenderOwner & {
          __hooks?: { index?: number }
        }
      ).__hooks
      if (hooks && typeof hooks === 'object') hooks.index = 0
      // context 祖先链挂在 owner 上。
      // 如果当前没有更外层实例，或者 currentInstance 已经是 target，自身绝不能再回写成自己的 owner parent；
      // 那会制造 self-loop，让 useContext 退化成错误回退甚至慢循环。
      const activeRenderOwner =
        renderOwnerStack.length > 0 ? renderOwnerStack[renderOwnerStack.length - 1] : undefined
      const fallbackRenderTriggeredOwner =
        asBridgeOwner(bridge.__rue_render_tracked_owner) ??
        asBridgeOwner(bridge.__rue_render_triggered_owner)
      const ownerParent =
        prevInstance == null || prevInstance === target
          ? activeRenderOwner && activeRenderOwner !== target
            ? activeRenderOwner
            : fallbackRenderTriggeredOwner && fallbackRenderTriggeredOwner !== target
              ? fallbackRenderTriggeredOwner
              : target[RUE_CONTEXT_OWNER_PARENT_KEY]
          : prevInstance
      target[RUE_CONTEXT_OWNER_PARENT_KEY] = ownerParent == null ? undefined : ownerParent
      forgetScopeOwner(target, RUE_SHARED_RENDER_SCOPE_KEY)
      const runtime = getSharedRuntime()
      disposeScopeKey(runtime, target, RUE_SHARED_RENDER_SCOPE_KEY)
      const scopeId = runtime.__rueCreateDetachedEffectScope()
      target[RUE_SHARED_RENDER_SCOPE_KEY] = scopeId
      effectScopeOwners.set(scopeId, target)
      setCurrentInstance(target)
      runtime.__ruePushEffectScope(scopeId)
      renderOwnerStack.push(target)
      runtime.__rueBeginRenderDebugOwner?.(target)
      renderScopeStack.push(true)
    },
    endComponentRender() {
      const hadScope = renderScopeStack.pop()
      if (hadScope) {
        const runtime = getSharedRuntime()
        runtime.__ruePopEffectScope()
        runtime.__rueEndRenderDebugOwner?.()
      }
      renderOwnerStack.pop()
      const prev = instanceStack.pop()
      setCurrentInstance(prev == null ? undefined : prev)
    },
    beginComponentSetup(instance: unknown) {
      const target = asBridgeOwner(instance)
      const prevInstance = getCurrentInstance()
      instanceStack.push(prevInstance)
      renderOwnerStack.push(target ?? undefined)
      setCurrentInstance(target ?? undefined)
      const scopeId = target?.[RUE_SHARED_RENDER_SCOPE_KEY]
      const didPush = typeof scopeId === 'number'
      if (didPush) {
        const runtime = getSharedRuntime()
        runtime.__ruePushEffectScope(scopeId)
        runtime.__rueBeginRenderDebugOwner?.(target!)
      }
      componentSetupScopeStack.push(didPush)
    },
    endComponentSetup() {
      const didPush = componentSetupScopeStack.pop()
      if (didPush) {
        const runtime = getSharedRuntime()
        runtime.__ruePopEffectScope()
        runtime.__rueEndRenderDebugOwner?.()
      }
      renderOwnerStack.pop()
      const prev = instanceStack.pop()
      setCurrentInstance(prev == null ? undefined : prev)
    },
    disposeComponent(instance: unknown) {
      const target = asBridgeOwner(instance)
      if (!target) {
        return
      }
      disposeHookScopeForInstance(target)
      forgetScopeOwner(target, RUE_SHARED_RENDER_SCOPE_KEY)
      disposeScopeKey(getSharedRuntime(), target, RUE_SHARED_RENDER_SCOPE_KEY)
    },
    beginVaporScope(owner: unknown) {
      const target = asBridgeOwner(owner)
      if (!target) {
        return false
      }
      const prevInstance = getCurrentInstance()
      vaporInstanceStack.push(prevInstance)
      // raw vapor owner 没有组件 render 那层天然的父子栈，所以这里也要沿用同样的规则：
      // 只有遇到“不同的外层 owner”时才更新 owner parent；否则保留已有祖先，避免自指。
      const activeRenderOwner =
        renderOwnerStack.length > 0 ? renderOwnerStack[renderOwnerStack.length - 1] : undefined
      const fallbackRenderTriggeredOwner =
        asBridgeOwner(bridge.__rue_render_tracked_owner) ??
        asBridgeOwner(bridge.__rue_render_triggered_owner)
      const ownerParent =
        prevInstance == null || prevInstance === target
          ? activeRenderOwner && activeRenderOwner !== target
            ? activeRenderOwner
            : fallbackRenderTriggeredOwner && fallbackRenderTriggeredOwner !== target
              ? fallbackRenderTriggeredOwner
              : target[RUE_CONTEXT_OWNER_PARENT_KEY]
          : prevInstance
      target[RUE_CONTEXT_OWNER_PARENT_KEY] = ownerParent == null ? undefined : ownerParent
      // raw vapor handle 没有组件实例栈那层自动“谁是当前 owner”的保护。
      // 如果这里不主动把 owner 设成 currentInstance，setup 里的 useSetup/watchEffect
      // 就可能挂到外层组件实例，或者挂到已经复用过的旧 hook scope 上。
      // 那样即便 DOM 分支被 renderAnchor 替换掉，dispose 的也只是 mounted vapor scope，
      // 旧 owner 上的 hook-based effect 仍会继续响应 signal 变化。
      //
      // 所以每次进入 raw vapor setup 之前，都先把这个 owner 上遗留的 hook scope 和 vapor scope
      // 清空，再创建一组新的 detached effect scope，并在 setup 执行期间把 currentInstance
      // 临时切到这个 owner。这样 useSetup 创建出来的副作用会稳定落到“本次 raw vapor owner”上，
      // 后续切分支时 disposeVaporScope 才有机会整组清掉。
      disposeHookScopeForInstance(target)
      forgetScopeOwner(target, RUE_SHARED_VAPOR_SCOPE_KEY)
      const runtime = getSharedRuntime()
      disposeScopeKey(runtime, target, RUE_SHARED_VAPOR_SCOPE_KEY)
      const scopeId = runtime.__rueCreateDetachedEffectScope()
      target[RUE_SHARED_VAPOR_SCOPE_KEY] = scopeId
      effectScopeOwners.set(scopeId, target)
      setCurrentInstance(target)
      runtime.__ruePushEffectScope(scopeId)
      renderOwnerStack.push(target)
      runtime.__rueBeginRenderDebugOwner?.(target)
      return true
    },
    endVaporScope(didPush: boolean) {
      if (didPush) {
        const runtime = getSharedRuntime()
        runtime.__ruePopEffectScope()
        runtime.__rueEndRenderDebugOwner?.()
        renderOwnerStack.pop()
      }
      const prev = vaporInstanceStack.pop()
      setCurrentInstance(prev == null ? undefined : prev)
    },
    disposeVaporScope(owner: unknown) {
      const target = asBridgeOwner(owner)
      if (!target) {
        return
      }
      // 这里要同时清两层：
      // 1. useSetup / watchEffect 之类通过 currentInstance 挂在 owner 上的 hook scope；
      // 2. 本次 raw vapor setup 显式 push 的 detached vapor scope。
      // 少清任意一层，都会出现“分支已经卸载，但旧 effect 还在订阅 source”的假活状态。
      disposeHookScopeForInstance(target)
      forgetScopeOwner(target, RUE_SHARED_VAPOR_SCOPE_KEY)
      disposeScopeKey(getSharedRuntime(), owner, RUE_SHARED_VAPOR_SCOPE_KEY)
    },
    pushCurrentContainer(container: unknown) {
      if (container == null) {
        return
      }
      currentContainerStack.push(container)
    },
    popCurrentContainer() {
      currentContainerStack.pop()
    },
    getCurrentContainer() {
      return currentContainerStack.length > 0
        ? currentContainerStack[currentContainerStack.length - 1]
        : undefined
    },
    getCurrentRenderOwner() {
      if (renderOwnerStack.length > 0) return renderOwnerStack[renderOwnerStack.length - 1]
      const scopeId = getSharedRuntime().__rueGetCurrentEffectScope?.()
      return typeof scopeId === 'number' ? effectScopeOwners.get(scopeId) : undefined
    },
    activateEffectOwnerTracking() {
      getSharedRuntime().__rueActivateEffectOwnerTracking?.()
    },
    activateRenderTriggered() {
      getSharedRuntime().__rueActivateRenderTriggered?.()
    },
    dispatchErrorCaptured(error: unknown, instance: unknown, info: string) {
      const dispatch = globalThis.__rue_dispatch_error_captured
      return typeof dispatch === 'function' && dispatch(error, instance, info) === true
    },
  }

  Object.defineProperty(bridge, RUE_SHARED_RUNTIME_REF_KEY, { value: runtimeRef })
  globalThis.__rue_compiled_runtime_bridge = bridge
  return bridge
}

export const buildDefaultExport = <CreateRue>(
  sharedRuntime: RuntimeVaporSharedRuntime,
  createRue: CreateRue,
) => ({
  createRue,
  __rueDisposeHookScopeForInstance: sharedRuntime.__rueDisposeHookScopeForInstance,
  __rueCreateDetachedEffectScope: sharedRuntime.__rueCreateDetachedEffectScope,
  __ruePushEffectScope: sharedRuntime.__ruePushEffectScope,
  __ruePopEffectScope: sharedRuntime.__ruePopEffectScope,
  __rueDisposeEffectScope: sharedRuntime.__rueDisposeEffectScope,
  setCurrentInstance: sharedRuntime.setCurrentInstance,
  getCurrentInstance: sharedRuntime.getCurrentInstance,
})
