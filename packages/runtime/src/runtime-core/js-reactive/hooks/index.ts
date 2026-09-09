import { createHookContext } from './context.js'
import { createComputedHooks } from './computed.js'
import { createEffectHooks } from './effect.js'
import { createStateHooks } from './state.js'
import { createValueHooks } from './values.js'

import type { EffectScopeHandle, ObjectLike, SetupSlot, ValueHookBundle } from '../types.js'

const HOOK_EFFECT_SCOPE_KEY = '__hook_effect_scope_id'

const isObjectLike = (value: unknown): value is ObjectLike =>
  (typeof value === 'object' || typeof value === 'function') && value !== null

const safeGet = (value: unknown, key: PropertyKey): unknown => {
  if (!isObjectLike(value)) return undefined
  try {
    const result: unknown = Reflect.get(value, key)
    return result
  } catch {
    return undefined
  }
}

const safeSet = (value: unknown, key: PropertyKey, next: unknown): void => {
  if (!isObjectLike(value)) return
  try {
    Reflect.set(value, key, next)
  } catch {}
}

const isEffectScopeHandle = (value: unknown): value is EffectScopeHandle =>
  typeof value === 'number' && Number.isInteger(value)

const callOptionalRuntimeMethod = (
  runtime: unknown,
  method: PropertyKey,
  args: readonly unknown[] = [],
): unknown => {
  const callable = safeGet(runtime, method)
  if (typeof callable !== 'function') return undefined
  const result: unknown = Reflect.apply(callable, runtime, args)
  return result
}

/** Assemble the JavaScript Hook layer around a facade-local execution context. */
export const createHooks = (reactiveRuntime: unknown) => {
  const context = createHookContext()
  const setupSlot = Symbol('rue.setupSlot')

  const runInPersistentHookScope = <T>(instance: unknown, factory: () => T): T => {
    if (!isObjectLike(instance)) return factory()

    let scopeId = safeGet(instance, HOOK_EFFECT_SCOPE_KEY)
    if (!isEffectScopeHandle(scopeId)) {
      scopeId = callOptionalRuntimeMethod(reactiveRuntime, '__rueCreateDetachedEffectScope')
      if (!isEffectScopeHandle(scopeId)) return factory()
      safeSet(instance, HOOK_EFFECT_SCOPE_KEY, scopeId)
    }
    callOptionalRuntimeMethod(reactiveRuntime, '__ruePushEffectScope', [scopeId])
    try {
      return factory()
    } finally {
      callOptionalRuntimeMethod(reactiveRuntime, '__ruePopEffectScope')
    }
  }

  const runUntracked = <T>(factory: () => T): T => {
    const untrack = safeGet(reactiveRuntime, 'untrack')
    return typeof untrack === 'function'
      ? (Reflect.apply(untrack, reactiveRuntime, [factory]) as T)
      : factory()
  }

  /**
   * useSetup：仅在首次调用时计算一次并缓存
   *
   * - factory 会在组件实例的持久 hook scope 中执行，而不是挂到单次 render scope 上。
   * - 因此 setup 内创建的 watch/watchEffect/createEffect 会随组件实例一起存活，直到组件卸载时统一清理。
   * - 但 setup 首次执行里直接算出来的普通 props 快照仍然只是首帧值；需要动态追踪时，仍应在 computed/watch/effect 中读取 props。
   */
  const useSetup = <T>(factory: () => T): T => {
    const instance = context.getCurrentInstance()
    if (instance == null) {
      return factory()
    }

    // 空依赖数组：只会在首次执行时调用 factory 并缓存结果
    const slot = context.withHookSlot<SetupSlot<T>>(() => ({
      type: setupSlot,
      initialized: false,
      value: undefined,
    }))
    if (!slot.initialized) {
      // Setup is an initialization boundary. Reads performed while creating its cached value
      // must not subscribe an enclosing component render effect; effects created by the factory
      // establish their own tracking contexts and continue to collect dependencies normally.
      const value = runInPersistentHookScope(instance, () => runUntracked(factory))
      slot.value = value
      slot.initialized = true
    }
    return slot.value as T
  }

  const values = createValueHooks({ reactiveRuntime, useSetup }) as unknown as ValueHookBundle
  const state = createStateHooks({ context, reactiveRuntime })
  const computed = createComputedHooks({
    context,
    reactiveRuntime,
    createComputed:
      typeof safeGet(reactiveRuntime, 'createComputed') === 'function'
        ? values.facade.createComputed
        : values.facade.computed,
  })
  const effects = createEffectHooks({ context, reactiveRuntime })
  const __rueDisposeHookScopeForInstance = (instance: unknown): void => {
    effects.disposeHookHost(instance)
    const scopeId = safeGet(instance, HOOK_EFFECT_SCOPE_KEY)
    if (isEffectScopeHandle(scopeId)) {
      callOptionalRuntimeMethod(reactiveRuntime, '__rueDisposeEffectScope', [scopeId])
      safeSet(instance, HOOK_EFFECT_SCOPE_KEY, undefined)
    }
  }

  return {
    hooks: {
      ...context,
      ...computed,
      ...values.hooks,
      ...state,
      useEffect: effects.useEffect,
      __rueDisposeHookScopeForInstance,
      useSetup,
    },
    effects,
    computed,
    state,
    values: values.facade,
  }
}
