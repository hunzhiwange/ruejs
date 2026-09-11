import {
  _$compiledSetup,
  createOwner,
  disposeOwner,
  effect,
  getCurrentOwner,
  onOwnerCleanup,
  registerOwnerLifecycle,
  runOwnerLifecycle,
  runWithOwner,
  type CompiledOwner,
  untrack,
} from '../runtime-core/compiled'
import type { CompiledRootHandle } from '../compiled-root'
import { isRef } from '../runtime-core/reactive-kernel/ref'
import { watch, ref, shallowRef } from './compact-reactivity'

const COMPILED_OWNER = Symbol('rue.compiledOwner')
const mountedOwners = new Set<CompiledOwner>()

const isServerRendering = () => {
  const count = (globalThis as Record<string, unknown>).__rue_is_server_rendering__
  return typeof count === 'number' && count > 0
}

type OwnedCompiledRootHandle = CompiledRootHandle & { [COMPILED_OWNER]?: CompiledOwner }
export const _$compiledUseSetup = <T>(slot: string, factory: () => T): T =>
  _$compiledSetup(slot, factory)

export const _$compiledUseRef = <T>(slot: string, value: T): { current: T } =>
  _$compiledSetup(slot, () => ({ current: value }))

export const _$compiledMemo = <T>(
  slot: string,
  factory: () => T,
  dependencies: readonly unknown[],
): T => {
  const record = _$compiledSetup(slot, () => ({
    initialized: false,
    dependencies: undefined as readonly unknown[] | undefined,
    value: undefined as T | undefined,
  }))
  const changed =
    !record.initialized ||
    record.dependencies === undefined ||
    dependencies.length !== record.dependencies.length ||
    dependencies.some((value, index) => !Object.is(value, record.dependencies![index]))
  if (changed) {
    record.value = untrack(factory)
    record.dependencies = [...dependencies]
    record.initialized = true
  }
  return record.value as T
}

export { _$compiledUseState } from './compact-reactivity'

const startCompiledEffect = (callback: () => void | (() => void)): void => {
  effect(callback)
}

const registerLifecycle = (
  phase: Parameters<typeof registerOwnerLifecycle>[0],
  callback: () => void,
): void => {
  registerOwnerLifecycle(phase, callback)
}

export const _$compiledUseEffect = (
  slot: string,
  callback: () => void | (() => void),
  dependencies?: () => readonly unknown[] | null,
): void => {
  _$compiledSetup(slot, () => {
    const start = () => {
      if (dependencies === undefined) {
        startCompiledEffect(callback)
        return
      }
      let previous: readonly unknown[] | undefined
      let cleanup: void | (() => void)
      const disposeCleanup = () => {
        const current = cleanup
        cleanup = undefined
        if (current) untrack(current)
      }
      onOwnerCleanup(disposeCleanup)
      watch(
        () => (dependencies() ?? []).map(value => (isRef(value) ? value.value : value)),
        value => {
          const next = value as readonly unknown[]
          if (
            previous !== undefined &&
            previous.length === next.length &&
            next.every((item, index) => Object.is(item, previous![index]))
          )
            return
          previous = next
          disposeCleanup()
          cleanup = callback()
        },
        { immediate: true },
      )
    }
    const owner = getCurrentOwner()
    if (owner === undefined) start()
    else if (mountedOwners.has(owner)) start()
    else registerOwnerLifecycle('mounted', start)
    return true
  })
}

export const onBeforeMount = (callback: () => void): void => {
  if (isServerRendering()) return
  registerLifecycle('beforeMount', callback)
}
export const onMounted = (callback: () => void): void => {
  if (isServerRendering()) return
  const owner = getCurrentOwner()
  if (owner === undefined) queueMicrotask(callback)
  else registerLifecycle('mounted', callback)
}
export const onBeforeUpdate = (callback: () => void): void => {
  registerLifecycle('beforeUpdate', callback)
}
export const onUpdated = (callback: () => void): void => {
  registerLifecycle('updated', callback)
}
export const onBeforeUnmount = (callback: () => void): void => {
  registerLifecycle('beforeUnmount', callback)
}
export const onUnmounted = (callback: () => void): void => {
  registerLifecycle('unmounted', callback)
}
export const onActivated = (callback: () => void): void => {
  registerLifecycle('activated', callback)
}
export const onDeactivated = (callback: () => void): void => {
  registerLifecycle('deactivated', callback)
}
export const onBeforeCreate = onBeforeMount
export const onCreated = onMounted
export const onScopeDispose = (callback: () => void): void => {
  registerLifecycle('unmounted', callback)
}

export const getCompiledHandleOwner = (handle: CompiledRootHandle): CompiledOwner | undefined =>
  (handle as OwnedCompiledRootHandle)[COMPILED_OWNER]

export const _$withCompiledHookScope = <T extends CompiledRootHandle>(factory: () => T): T => {
  const owner = createOwner()
  let handle: T | undefined
  try {
    handle = runWithOwner(owner, factory)
  } catch (error) {
    disposeOwner(owner)
    throw error
  }
  if (handle === undefined) {
    disposeOwner(owner)
    throw new Error('[rue] compiled component factory did not return a mount handle')
  }

  ;(handle as T & OwnedCompiledRootHandle)[COMPILED_OWNER] = owner
  const mount = handle.__rue_compiled_mount
  const disposeHandle = handle.dispose
  let disposed = false
  handle.__rue_compiled_mount = (parent, before) => {
    try {
      runOwnerLifecycle(owner, 'beforeMount')
      const result = runWithOwner(owner, () => mount.call(handle, parent, before))
      mountedOwners.add(owner)
      runOwnerLifecycle(owner, 'mounted')
      return result ?? null
    } catch (error) {
      handle!.dispose()
      throw error
    }
  }
  handle.dispose = () => {
    if (disposed) return
    disposed = true
    try {
      disposeHandle.call(handle)
    } finally {
      mountedOwners.delete(owner)
      disposeOwner(owner)
    }
  }
  handle.__rue_cleanup_bucket.push(handle.dispose)
  return handle
}

// The compiler may keep the public useSetup call inside a component render effect so its Hook
// slot remains stable. Setup initialization is still non-render work: isolate its incidental
// reads while allowing effects created by the factory to establish their own dependencies.
export const useSetup = <T>(factory: () => T): T => untrack(factory)
export function useRef<T>(value: T): { current: T }
export function useRef<T = undefined>(): { current: T | undefined }
export function useRef<T>(value?: T): { current: T | undefined } {
  return { current: value }
}
/** Source hooks must be lowered to explicit owner slots by the compiler. */
export const useState = <T>(
  _initial: T | (() => T),
  _options?: { equals?: (previous: T, next: T) => boolean },
): [T, (next: T | ((previous: T) => T)) => void] => {
  throw new Error('Rue useState requires compilation to an owner slot')
}
export const useEffect = (
  _callback: () => void | (() => void),
  _dependencies?: readonly unknown[] | null,
): void => {
  throw new Error('Rue useEffect requires compilation to an owner slot')
}
export { ref, shallowRef }

export const _$compiledBindUseRef = (element: Element, readRef: () => unknown): void => {
  const target = readRef()
  if (typeof target === 'function') {
    const cleanup = target(element)
    if (typeof cleanup === 'function') onOwnerCleanup(cleanup)
  } else if (target && typeof target === 'object' && 'current' in target) {
    ;(target as { current: unknown }).current = element
    onOwnerCleanup(() => {
      ;(target as { current: unknown }).current = null
    })
  }
}
