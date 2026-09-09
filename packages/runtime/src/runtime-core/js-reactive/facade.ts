import { createHooks } from './hooks/index.js'
import { isObjectLike } from './hooks/values.js'

import type {
  ComputedFunction,
  CreateComputedFunction,
  CreateSignalFunction,
  DebuggerEvent,
  DebuggerHook,
  EffectCleanup,
  EffectHandle,
  EffectScope,
  EffectScopeDebugState,
  EffectScopeHandle,
  ObjectLike,
  ReactiveFacade,
  ReactiveKernel,
  EqualityOptions,
  SchedulerRun,
  SignalFunction,
  SignalHandle,
  SignalWrapperRegistryDebugState,
  SignalWrapperRegistryEntry,
  WatchCallback,
  WatchEffectFunction,
  WatchEffectOptions,
  WatchFlushEffectFunction,
  WatchFunction,
  WatchOptions,
} from './types.js'

/**
 * Assemble the JavaScript reactive facade around one explicitly supplied runtime kernel.
 * All registries and scheduler state are scoped to this factory call.
 */
export const createReactiveFacade = <TRuntime extends object>(
  runtimeSource: TRuntime,
): ReactiveFacade<TRuntime> => {
  const reactiveRuntime = runtimeSource as TRuntime & ReactiveKernel
  const hookLayer = createHooks(reactiveRuntime)
  const baseHooks = hookLayer.hooks
  const { useEffect } = hookLayer.effects
  const { computed: computedHook } = hookLayer.computed
  const { useRef, useState } = hookLayer.state
  const {
    customRef,
    createComputed: createComputedValue,
    isReadonly,
    isRef,
    shallowRef,
    triggerRef,
  } = hookLayer.values
  const currentEffectIdExport = Reflect.get(reactiveRuntime, '__rueCurrentEffectId')
  const getCurrentEffectScopeExport = Reflect.get(reactiveRuntime, '__rueGetCurrentEffectScope')
  const RUE_RENDER_TRACKED_HOOKS_KEY = '__rue_render_tracked_hooks__'
  const RUE_RENDER_TRIGGERED_HOOKS_KEY = '__rue_render_triggered_hooks'
  const RUE_CONTEXT_OWNER_PARENT_KEY = '__rue_context_owner_parent__'
  const RUE_SIGNAL_RENDER_TRACKING_PATCHED = Symbol.for('rue.signal.renderTrackingPatched')
  const RUE_SIGNAL_ID_KEY = '__rue_signal_id__'

  const effectRenderOwnerById = new Map<unknown, ObjectLike>()
  const scopeHandleCache = new Map<EffectScopeHandle, EffectScope>()
  const scopeHandleState = new WeakMap<EffectScope, { active: boolean }>()
  const postFlushQueue = new Set<SchedulerRun>()
  let isDispatchingRenderTracked = false
  let isDispatchingRenderTriggered = false
  let postFlushPending = false

  /** 仅供测试/开发验证 effect scope 元数据是否保持有界。 */
  const __rueGetEffectScopeDebugState = (): EffectScopeDebugState => ({
    activeScopeHandles: scopeHandleCache.size,
    cachedScopeHandles: scopeHandleCache.size,
    stoppedScopeIds: 0,
  })

  // post flush 队列优先复用原生 queueMicrotask，兼容旧环境时退回 Promise microtask。
  const queueTask: (fn: SchedulerRun) => void =
    typeof queueMicrotask === 'function'
      ? queueMicrotask
      : fn => {
          void Promise.resolve().then(fn)
        }

  /** 清空 watchPostEffect 队列，保证同一轮 flush 内重复调度只运行最新 runner。 */
  const flushPostFlushQueue = () => {
    if (!postFlushQueue.size) {
      postFlushPending = false
      return
    }

    const queue = Array.from(postFlushQueue)
    postFlushQueue.clear()
    postFlushPending = false
    for (const run of queue) {
      run()
    }
  }

  /** 安排 post flush 执行；若 runtime 提供 nextTick，则排在响应式 DOM 更新之后。 */
  const queuePostFlush = (run: SchedulerRun): void => {
    postFlushQueue.add(run)
    if (postFlushPending) {
      return
    }

    postFlushPending = true
    queueTask(() => {
      if (typeof reactiveRuntime.nextTick === 'function') {
        reactiveRuntime.nextTick(flushPostFlushQueue)
        return
      }

      queueTask(flushPostFlushQueue)
    })
  }

  /** 创建 watchPostEffect 的调度器，支持用户自定义 scheduler 包裹最终 runner。 */
  const createPostEffectScheduler = (
    options?: Pick<WatchEffectOptions, 'scheduler'> | null,
  ): ((run: SchedulerRun) => void) => {
    const userScheduler =
      options && typeof options === 'object' && typeof options.scheduler === 'function'
        ? options.scheduler
        : undefined
    let queued = false
    let latestRun: SchedulerRun | undefined

    return (run: SchedulerRun): void => {
      latestRun = run
      if (queued) {
        return
      }

      queued = true
      queuePostFlush(() => {
        const runEffect = () => {
          queued = false
          const runner = latestRun
          latestRun = undefined
          runner?.()
        }

        if (userScheduler) {
          userScheduler(runEffect)
          return
        }

        runEffect()
      })
    }
  }

  /** 创建同步 watcher 调度器，绕过默认 microtask/frame 合并。 */
  const createSyncEffectScheduler = (
    options?: Pick<WatchEffectOptions, 'scheduler'> | null,
  ): ((run: SchedulerRun) => void) => {
    const userScheduler =
      options && typeof options === 'object' && typeof options.scheduler === 'function'
        ? options.scheduler
        : undefined

    return (run: SchedulerRun): void => {
      if (userScheduler) {
        userScheduler(run)
        return
      }

      run()
    }
  }

  /** 将传入 options 复制一份并替换为 post flush scheduler。 */
  const withPostEffectScheduler = (options?: WatchEffectOptions | null): WatchEffectOptions => {
    const normalized = options && typeof options === 'object' ? { ...options } : {}
    normalized.scheduler = createPostEffectScheduler(options)
    return normalized
  }

  /** 将传入 options 复制一份并替换为 sync flush scheduler。 */
  const withSyncEffectScheduler = (options?: WatchEffectOptions | null): WatchEffectOptions => {
    const normalized = options && typeof options === 'object' ? { ...options } : {}
    normalized.scheduler = createSyncEffectScheduler(options)
    return normalized
  }

  const getFlushOption = (options?: WatchEffectOptions | null) =>
    options && typeof options === 'object' ? Reflect.get(options, 'flush') : undefined

  const withFlushScheduler = <T>(
    options?: WatchOptions<T> | null,
  ): WatchOptions<T> | null | undefined => {
    const flush = getFlushOption(options)
    if (flush === 'post') {
      return withPostEffectScheduler(options)
    }
    if (flush === 'sync') {
      return withSyncEffectScheduler(options)
    }
    return options
  }

  /** watchEffect 的 post flush 变体，用于 DOM 更新完成后读取布局/文本。 */
  const watchPostEffect: WatchFlushEffectFunction = (cb, options) =>
    reactiveRuntime.createEffect!(cb, withPostEffectScheduler(options))

  /** watchEffect 的 sync flush 变体，用于响应式变更时同步运行。 */
  const watchSyncEffect: WatchFlushEffectFunction = (cb, options) =>
    reactiveRuntime.watchEffect!(cb, withSyncEffectScheduler(options))

  /** 支持 Vue 风格 flush 选项的 watchEffect。 */
  const watchEffect: WatchEffectFunction = (cb, options) => {
    const flush = getFlushOption(options)
    if (flush === 'post') {
      return watchPostEffect(cb, options)
    }
    if (flush === 'sync') {
      return watchSyncEffect(cb, options)
    }
    return reactiveRuntime.watchEffect!(cb, options)
  }

  const normalizeWatchSource = (source: unknown): unknown => {
    if (Array.isArray(source)) {
      return source.map(normalizeWatchSource)
    }
    if (isRef(source)) {
      return () => (typeof source.get === 'function' ? source.get() : source.value)
    }
    return source
  }

  /** 支持 Vue 风格 flush 选项的通用 watch。 */
  const watch = ((
    source: unknown,
    handler: WatchCallback<unknown>,
    options?: WatchOptions<unknown> | null,
  ): EffectHandle =>
    reactiveRuntime.watch!(
      normalizeWatchSource(source),
      handler,
      withFlushScheduler(options),
    )) as WatchFunction

  /** 在当前 watcher 上注册失效清理函数，旧 runtime 下退回 onCleanup。 */
  const onWatcherCleanup = (cleanupFn: EffectCleanup, failSilently?: boolean): void => {
    if (typeof reactiveRuntime.onWatcherCleanup === 'function') {
      return reactiveRuntime.onWatcherCleanup(cleanupFn, failSilently)
    }
    if (typeof reactiveRuntime.onCleanup === 'function') {
      return reactiveRuntime.onCleanup(cleanupFn)
    }
    if (!failSilently) {
      globalThis.console?.warn?.('onWatcherCleanup() is called when there is no active watcher.')
    }
  }

  /** 在当前 effect scope 停止时注册清理函数。 */
  const onScopeDispose = (cleanupFn: EffectCleanup, failSilently?: boolean): void =>
    reactiveRuntime.onScopeDispose!(cleanupFn, failSilently)

  /** 等待响应式 flush 与 post flush 队列完成，可选执行回调。 */
  const nextTick = <T = void>(callback?: () => T | Promise<T>): Promise<T | void> => {
    const promise =
      typeof reactiveRuntime.nextTick === 'function'
        ? reactiveRuntime.nextTick(flushPostFlushQueue)
        : Promise.resolve().then(flushPostFlushQueue)
    return typeof callback === 'function' ? promise.then(callback) : promise
  }

  const __rueCurrentEffectId =
    typeof currentEffectIdExport === 'function'
      ? (): number | undefined => {
          const effectId: unknown = Reflect.apply(currentEffectIdExport, reactiveRuntime, [])
          return typeof effectId === 'number' ? effectId : undefined
        }
      : (): undefined => undefined

  const getCurrentEffectScopeId =
    typeof getCurrentEffectScopeExport === 'function'
      ? (): EffectScopeHandle | undefined => {
          const scopeId: unknown = Reflect.apply(getCurrentEffectScopeExport, reactiveRuntime, [])
          return typeof scopeId === 'number' ? scopeId : undefined
        }
      : (): undefined => undefined

  const createEffectScopeId =
    typeof reactiveRuntime.__rueCreateDetachedEffectScope === 'function'
      ? reactiveRuntime.__rueCreateDetachedEffectScope.bind(reactiveRuntime)
      : undefined

  const disposeEffectScope =
    typeof reactiveRuntime.__rueDisposeEffectScope === 'function'
      ? reactiveRuntime.__rueDisposeEffectScope.bind(reactiveRuntime)
      : undefined

  const markScopeStopped = (id: EffectScopeHandle): void => {
    if (Number.isInteger(id)) {
      const handle = scopeHandleCache.get(id)
      const state = handle ? scopeHandleState.get(handle) : undefined
      if (state) {
        state.active = false
      }
      scopeHandleCache.delete(id)
    }
  }

  const __rueDisposeEffectScope = (id: EffectScopeHandle): void => {
    markScopeStopped(id)
    disposeEffectScope?.(id)
  }

  const signalWrapperRegistry = new Map<number, SignalWrapperRegistryEntry<ObjectLike>>()
  const hasWeakRef = typeof WeakRef === 'function'
  const signalWrapperFinalizer =
    hasWeakRef && typeof FinalizationRegistry === 'function'
      ? new FinalizationRegistry<{ id: number; token: object }>(({ id, token }) => {
          const entry = signalWrapperRegistry.get(id)
          if (entry?.token === token) signalWrapperRegistry.delete(id)
        })
      : undefined
  let signalWrapperRegistrationsSinceSweep = 0
  let signalWrapperSweepIterator

  const resolveSignalWrapperRef = (
    entry: SignalWrapperRegistryEntry<ObjectLike> | undefined,
  ): ObjectLike | undefined => {
    if (!entry) return undefined
    return entry.ref instanceof WeakRef ? entry.ref.deref() : entry.ref
  }

  const sweepDeadSignalWrappers = (budget: number): void => {
    signalWrapperSweepIterator ??= signalWrapperRegistry.entries()
    let visited = 0
    while (visited < budget) {
      const next = signalWrapperSweepIterator.next()
      if (next.done) {
        signalWrapperSweepIterator = undefined
        break
      }
      visited += 1
      const [id, entry] = next.value
      if (!resolveSignalWrapperRef(entry) && signalWrapperRegistry.get(id) === entry) {
        signalWrapperFinalizer?.unregister(entry.token)
        signalWrapperRegistry.delete(id)
      }
    }
  }

  const scheduleSignalWrapperSweep = () => {
    if (!hasWeakRef) return
    signalWrapperRegistrationsSinceSweep += 1
    const trigger = Math.max(256, Math.ceil(signalWrapperRegistry.size / 4))
    if (signalWrapperRegistrationsSinceSweep < trigger) return
    signalWrapperRegistrationsSinceSweep = 0
    sweepDeadSignalWrappers(Math.max(256, Math.ceil(signalWrapperRegistry.size / 2)))
  }

  /** 仅供 GC/内存回归脚本读取 wrapper registry 的存活情况。 */
  const __rueGetSignalWrapperRegistryDebugState = (): SignalWrapperRegistryDebugState => {
    let liveWrappers = 0
    for (const entry of signalWrapperRegistry.values()) {
      if (resolveSignalWrapperRef(entry)) liveWrappers += 1
    }
    return {
      registryKeys: signalWrapperRegistry.size,
      liveWrappers,
      hasFinalizationRegistry: !!signalWrapperFinalizer,
    }
  }

  const rememberSignalWrapper = <TSignal extends ObjectLike>(signal: TSignal): TSignal => {
    const id = signal[RUE_SIGNAL_ID_KEY]
    if (
      typeof id === 'number' &&
      Number.isInteger(id) &&
      resolveSignalWrapperRef(signalWrapperRegistry.get(id)) !== signal
    ) {
      const previousEntry = signalWrapperRegistry.get(id)
      if (previousEntry) signalWrapperFinalizer?.unregister(previousEntry.token)
      const token = {}
      signalWrapperRegistry.set(id, {
        ref: hasWeakRef ? new WeakRef(signal) : signal,
        token,
      })
      signalWrapperFinalizer?.register(signal, { id, token }, token)
      scheduleSignalWrapperSweep()
    }
    return signal
  }

  /** 创建 SignalHandle 时一次性登记 canonical wrapper，避免依赖读取 patch。 */
  const createSignal: CreateSignalFunction = <T>(
    initial: T,
    options?: EqualityOptions<T> | null,
    forceGlobal?: boolean,
  ): SignalHandle<T> =>
    rememberSignalWrapper(reactiveRuntime.createSignal!(initial, options, forceGlobal))

  /** signal hook 同样在返回句柄时登记 canonical wrapper。 */
  const signal: SignalFunction = <T>(
    initial: T,
    options?: EqualityOptions<T> | null,
    forceGlobal?: boolean,
  ): SignalHandle<T> => createSignal(initial, options, forceGlobal)

  /** Hook computed 复用 JS 槽位，同时把稳定句柄登记为 canonical wrapper。 */
  const computed = ((arg: unknown, forceGlobal?: boolean) =>
    rememberSignalWrapper(
      Reflect.apply(computedHook, undefined, [arg, forceGlobal]) as SignalHandle<unknown>,
    )) as ComputedFunction

  /** 全局 computed 工厂只委托共享图内核，并登记 canonical wrapper。 */
  const createComputed = ((arg: unknown) =>
    rememberSignalWrapper(
      Reflect.apply(createComputedValue, undefined, [arg]) as SignalHandle<unknown>,
    )) as CreateComputedFunction

  const resolveCanonicalSignalTarget = (target: ObjectLike): ObjectLike | undefined => {
    try {
      const signalId = target[RUE_SIGNAL_ID_KEY]
      if (typeof signalId !== 'number') return undefined
      const entry = signalWrapperRegistry.get(signalId)
      const canonicalTarget = resolveSignalWrapperRef(entry)
      if (!canonicalTarget && signalWrapperRegistry.get(signalId) === entry) {
        if (entry) signalWrapperFinalizer?.unregister(entry.token)
        signalWrapperRegistry.delete(signalId)
      }
      return canonicalTarget
    } catch {}
    return undefined
  }

  const normalizeRenderTriggeredEvent = (event: unknown): DebuggerEvent => {
    try {
      if (!isObjectLike(event)) return event as unknown as DebuggerEvent
      const target = event.target
      if (!isObjectLike(target)) return event as unknown as DebuggerEvent
      const canonicalTarget = resolveCanonicalSignalTarget(target)
      if (canonicalTarget && target !== canonicalTarget) {
        event.target = canonicalTarget
      }
    } catch {}
    return event as unknown as DebuggerEvent
  }

  /** 从 shared bridge 读取当前组件 render owner。 */
  const currentRenderOwner = () => {
    const bridge = globalThis.__rue_compiled_runtime_bridge
    if (!bridge || typeof bridge.getCurrentRenderOwner !== 'function') {
      return undefined
    }
    return bridge.getCurrentRenderOwner()
  }

  /** 确保组件实例上有 renderTracked hooks 列表。 */
  const ensureRenderTrackedHooks = (instance: unknown): DebuggerHook[] | undefined => {
    if (!isObjectLike(instance)) {
      return undefined
    }
    const existing = instance[RUE_RENDER_TRACKED_HOOKS_KEY]
    if (Array.isArray(existing)) {
      return existing
    }
    const hooks: DebuggerHook[] = []
    Object.defineProperty(instance, RUE_RENDER_TRACKED_HOOKS_KEY, {
      value: hooks,
      enumerable: false,
      configurable: true,
    })
    return hooks
  }

  /** 沿 Context owner 父链派发 renderTracked 调试事件。 */
  const dispatchRenderTracked = (owner: unknown, event: DebuggerEvent<'get'>): void => {
    if (!isObjectLike(owner) || isDispatchingRenderTracked) {
      return
    }
    const visited = new Set()
    let current: unknown = owner
    isDispatchingRenderTracked = true
    try {
      while (isObjectLike(current) && !visited.has(current)) {
        visited.add(current)
        const hooks = current[RUE_RENDER_TRACKED_HOOKS_KEY]
        if (Array.isArray(hooks)) {
          for (const hook of hooks.slice()) {
            if (typeof hook !== 'function') {
              continue
            }
            try {
              if (typeof reactiveRuntime.untrack === 'function') {
                reactiveRuntime.untrack(() => hook(event))
              } else {
                hook(event)
              }
            } catch (error) {
              globalThis.console?.error?.(error)
            }
          }
        }
        const parent = current[RUE_CONTEXT_OWNER_PARENT_KEY]
        current = isObjectLike(parent) ? parent : undefined
      }
    } finally {
      isDispatchingRenderTracked = false
    }
  }

  /** 沿 Context owner 父链派发 renderTriggered 调试事件。 */
  const dispatchRenderTriggered = (owner: unknown, event: DebuggerEvent): void => {
    if (!isObjectLike(owner) || isDispatchingRenderTriggered) {
      return
    }
    const visited = new Set()
    let current: unknown = owner
    isDispatchingRenderTriggered = true
    try {
      while (isObjectLike(current) && !visited.has(current)) {
        visited.add(current)
        const hooks = current[RUE_RENDER_TRIGGERED_HOOKS_KEY]
        if (Array.isArray(hooks)) {
          for (const hook of hooks.slice()) {
            if (typeof hook !== 'function') {
              continue
            }
            try {
              if (typeof reactiveRuntime.untrack === 'function') {
                reactiveRuntime.untrack(() => hook(event))
              } else {
                hook(event)
              }
            } catch (error) {
              globalThis.console?.error?.(error)
            }
          }
        }
        const parent = current[RUE_CONTEXT_OWNER_PARENT_KEY]
        current = isObjectLike(parent) ? parent : undefined
      }
    } finally {
      isDispatchingRenderTriggered = false
    }
  }

  /** 注册 renderTriggered 桥接，并根据 effect id 找回对应的组件 owner。 */
  const installRenderTriggeredBridge = () => {
    const bridge = globalThis.__rue_compiled_runtime_bridge
    if (!bridge || bridge.__rue_render_triggered_dispatch_installed__) {
      return
    }
    const previousDispatch =
      typeof bridge.dispatchRenderTriggeredForEffect === 'function'
        ? bridge.dispatchRenderTriggeredForEffect.bind(bridge)
        : undefined
    bridge.dispatchRenderTriggeredForEffect = (...args: unknown[]) => {
      const [effect, event, ownerHint] = args
      previousDispatch?.(...args)
      const owner = effectRenderOwnerById.get(effect) ?? ownerHint
      if (!isObjectLike(owner) || !isObjectLike(event)) {
        return
      }
      effectRenderOwnerById.set(effect, owner)
      dispatchRenderTriggered(owner, normalizeRenderTriggeredEvent(event))
    }
    Object.defineProperty(bridge, '__rue_render_triggered_dispatch_installed__', {
      value: true,
      configurable: true,
    })
  }

  ;(
    globalThis as typeof globalThis & {
      __rue_install_render_triggered_bridge__?: () => void
    }
  ).__rue_install_render_triggered_bridge__ = installRenderTriggeredBridge

  /** 在 signal get/getPath 时记录 DebuggerEvent 并派发到当前组件。 */
  const notifyRenderTracked = (target: ObjectLike, type: 'get', key: unknown): void => {
    const effect = __rueCurrentEffectId()
    if (effect == null) {
      return
    }
    rememberSignalWrapper(target)
    const activeOwner = currentRenderOwner()
    if (isObjectLike(activeOwner)) {
      effectRenderOwnerById.set(effect, activeOwner)
    }
    const owner = isObjectLike(activeOwner) ? activeOwner : effectRenderOwnerById.get(effect)
    if (!isObjectLike(owner)) {
      return
    }
    dispatchRenderTracked(owner, {
      effect,
      target: resolveCanonicalSignalTarget(target) ?? target,
      type,
      key,
    })
  }

  /** Monkey patch SignalHandle 读取方法，以便 JS 侧实现 onRenderTracked。 */
  const patchSignalRenderTracking = (runtime: ReactiveKernel): void => {
    const proto = runtime.SignalHandle?.prototype
    if (!proto || proto[RUE_SIGNAL_RENDER_TRACKING_PATCHED]) {
      return
    }

    const originalGet = proto.get
    if (typeof originalGet === 'function') {
      proto.get = function (this: ObjectLike, ...args: unknown[]): unknown {
        const value: unknown = Reflect.apply(originalGet, this, args)
        notifyRenderTracked(this, 'get', 'value')
        return value
      }
    }

    const originalGetPath = proto.getPath
    if (typeof originalGetPath === 'function') {
      proto.getPath = function (this: ObjectLike, path: unknown, ...args: unknown[]): unknown {
        const value: unknown = Reflect.apply(originalGetPath, this, [path, ...args])
        notifyRenderTracked(this, 'get', path)
        return value
      }
    }

    Object.defineProperty(proto, RUE_SIGNAL_RENDER_TRACKING_PATCHED, {
      value: true,
      configurable: true,
    })
  }

  installRenderTriggeredBridge()

  /** 注册当前组件的 renderTracked 调试钩子，返回取消注册函数。 */
  const onRenderTracked = (callback: DebuggerHook): (() => void) | undefined => {
    if (typeof callback !== 'function') {
      return undefined
    }
    installRenderTriggeredBridge()
    const instance = baseHooks.getCurrentInstance() ?? currentRenderOwner()
    const hooks = ensureRenderTrackedHooks(instance)
    if (!hooks) {
      return undefined
    }
    hooks.push(callback)
    const bridge = globalThis.__rue_compiled_runtime_bridge
    if (isObjectLike(instance) && bridge) bridge.__rue_render_tracked_owner = instance
    bridge?.activateEffectOwnerTracking?.()
    patchSignalRenderTracking(reactiveRuntime)
    return () => {
      const index = hooks.indexOf(callback)
      if (index >= 0) {
        hooks.splice(index, 1)
      }
      if (bridge && bridge.__rue_render_tracked_owner === instance && hooks.length === 0) {
        bridge.__rue_render_tracked_owner = undefined
      }
    }
  }

  /** 创建 JS EffectScope 句柄，委托共享内核的 scope push/pop/dispose。 */
  const createScopeHandle = (id: EffectScopeHandle): EffectScope => {
    const state = { active: true }
    const handle = {
      get active() {
        return state.active
      },
      run<T>(fn: () => T): T | undefined {
        if (typeof fn !== 'function' || !state.active) {
          return undefined
        }

        reactiveRuntime.__ruePushEffectScope!(id)
        try {
          return fn()
        } finally {
          reactiveRuntime.__ruePopEffectScope!()
        }
      },
      stop() {
        if (!state.active) {
          return
        }

        markScopeStopped(id)
        disposeEffectScope?.(id)
      },
      dispose() {
        this.stop()
      },
    }
    scopeHandleState.set(handle, state)
    return handle
  }

  /** 复用 scope id 对应的 JS 句柄，保持 getCurrentScope 多次读取的引用稳定。 */
  const getScopeHandle = (id: unknown): EffectScope | undefined => {
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      return undefined
    }

    const cached = scopeHandleCache.get(id)
    if (cached) {
      return cached
    }

    const handle = createScopeHandle(id)
    scopeHandleCache.set(id, handle)
    return handle
  }

  /** 读取当前活动 effect scope。 */
  const getCurrentScope = () => getScopeHandle(getCurrentEffectScopeId())

  /** 创建 effect scope，可批量停止其中创建的 computed/watch/effect。 */
  const effectScope = (detached = false): EffectScope => {
    const scope = getScopeHandle(createEffectScopeId?.())
    if (!scope) {
      throw new Error('effectScope() requires effect scope support from @rue-js/runtime.')
    }

    if (!detached) {
      onScopeDispose(() => scope.stop(), true)
    }

    return scope
  }

  const runtimeWithShallowRef = {
    ...reactiveRuntime,
    __rueCurrentEffectId,
    __rueGetEffectScopeDebugState,
    computed,
    customRef,
    createSignal,
    createComputed,
    effectScope,
    getCurrentScope,
    __rueDisposeEffectScope,
    isRef,
    isReadonly,
    nextTick,
    onWatcherCleanup,
    onRenderTracked,
    onScopeDispose,
    shallowRef,
    signal,
    triggerRef,
    watch,
    watchEffect,
    watchPostEffect,
    watchSyncEffect,
  }

  const hooks = {
    ...baseHooks,
    computed,
    customRef,
  }

  return {
    hooks,
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
    useEffect,
    useRef,
    useState,
    default: runtimeWithShallowRef,
  }
}
