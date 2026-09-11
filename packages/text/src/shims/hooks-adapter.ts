import { batch, useEffect, useRef, useState } from '@rue-js/rue'
import { getRequestContext, isInsideUnifiedScope } from './unified-request-context.js'

export { useEffect, useRef, useState } from '@rue-js/rue'
export { useEffect as useLayoutEffect } from '@rue-js/rue'
export {
  _$planContext as createContext,
  _$planUseContext as useContext,
} from '@rue-js/rue/internal/reactive'
export type TextHookDependencyList = readonly unknown[]
export type RueHookDependencyList = TextHookDependencyList

export function createElement(): never {
  throw new Error('Text UI must be compiled from JSX; runtime createElement is not supported')
}

export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T {
  const record = useRef<{ deps: readonly unknown[]; value: T } | null>(null)
  if (
    !record.current ||
    record.current.deps.length !== deps.length ||
    deps.some((value, index) => !Object.is(value, record.current!.deps[index]))
  ) {
    record.current = { deps: [...deps], value: factory() }
  }
  return record.current.value
}
export function useCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  deps: readonly unknown[],
): T {
  return useMemo(() => callback, deps)
}
export function startTransition(callback: () => void): void {
  batch(callback)
}
export function useSyncExternalStore<T>(
  subscribe: (update: () => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot?: () => T,
): T {
  const [value, setValue] = useState(() =>
    typeof window === 'undefined' && getServerSnapshot ? getServerSnapshot() : getSnapshot(),
  )
  useEffect(() => {
    const update = () => setValue(getSnapshot())
    const unsubscribe = subscribe(update)
    update()
    return unsubscribe
  }, [subscribe, getSnapshot])
  return value
}
export { useActionState } from '@rue-js/runtime/internal/reactive'
export function useTransition(): never {
  throw new Error('Use startTransition with explicit pending state')
}

type CacheNode = {
  objects: WeakMap<object, CacheNode>
  primitives: Map<unknown, CacheNode>
  hasValue: boolean
  value: unknown
}
const roots = new WeakMap<Function, CacheNode>()
const node = (): CacheNode => ({
  objects: new WeakMap(),
  primitives: new Map(),
  hasValue: false,
  value: undefined,
})
export function cache<Args extends readonly unknown[], Result>(
  fn: (...args: Args) => Result,
): (...args: Args) => Result {
  return (...args) => {
    const registry = isInsideUnifiedScope() ? getRequestContext().requestCache : roots
    let entry = registry.get(fn) as CacheNode | undefined
    if (!entry) {
      entry = node()
      registry.set(fn, entry)
    }
    for (const arg of args) {
      const map =
        arg !== null && (typeof arg === 'object' || typeof arg === 'function')
          ? entry.objects
          : entry.primitives
      let child = map.get(arg as object)
      if (!child) {
        child = node()
        map.set(arg as object, child)
      }
      entry = child
    }
    if (entry.hasValue) return entry.value as Result
    const value = fn(...args)
    entry.hasValue = true
    entry.value = value
    if (value && typeof (value as PromiseLike<unknown>).then === 'function') {
      const current = entry
      void Promise.resolve(value).catch(() => {
        if (current.value === value) {
          current.hasValue = false
          current.value = undefined
        }
      })
    }
    return value
  }
}
const thenables = new WeakMap<
  object,
  { state: 'pending' | 'fulfilled' | 'rejected'; value: unknown }
>()
export function use<T>(thenable: PromiseLike<T>): T {
  let record = thenables.get(thenable)
  if (!record) {
    record = { state: 'pending', value: thenable }
    thenables.set(thenable, record)
    const current = record
    Promise.resolve(thenable).then(
      value => {
        current.state = 'fulfilled'
        current.value = value
      },
      error => {
        current.state = 'rejected'
        current.value = error
      },
    )
  }
  if (record.state === 'fulfilled') return record.value as T
  throw record.value
}
