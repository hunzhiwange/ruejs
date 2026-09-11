import { batch, type CompiledSignalHandle } from '../runtime-core/compiled'
import { createRootSignal } from '../runtime-core/reactive-kernel/signal-base'
import { getSharedReactiveStorage } from '../runtime-core/reactive-kernel/shared-runtime'

interface CompiledPropState {
  present: boolean
  value: unknown
}

type CompiledPropKey = string | symbol

export interface CompiledPropsController<T extends object> {
  readonly props: Readonly<T>
  get(key: PropertyKey): unknown
  has(key: PropertyKey): boolean
  keys(): CompiledPropKey[]
  snapshot(): T
  update(nextProps: T): void
  dispose(): void
}

export const _$compiledOmitProps = <T extends object>(
  props: T,
  excluded: readonly string[],
): Partial<T> => {
  const result: Partial<T> = {}
  const excludedKeys = new Set(excluded)
  const source = _$compiledPropsSnapshot(props)
  for (const key of enumerableOwnKeys(source) as Array<keyof T>) {
    if (typeof key !== 'string' || !excludedKeys.has(key)) {
      Object.defineProperty(result, key, {
        value: source[key],
        enumerable: true,
        configurable: true,
        writable: true,
      })
    }
  }
  return result
}

const enumerableOwnKeys = (value: object): CompiledPropKey[] =>
  Reflect.ownKeys(value).filter(key => Object.prototype.propertyIsEnumerable.call(value, key))

const snapshotEnumerableProps = (value: object): Map<CompiledPropKey, unknown> => {
  const snapshot = new Map<CompiledPropKey, unknown>()
  for (const key of enumerableOwnKeys(value)) snapshot.set(key, Reflect.get(value, key))
  return snapshot
}

const sameKeys = (
  previous: readonly CompiledPropKey[],
  next: readonly CompiledPropKey[],
): boolean =>
  previous.length === next.length && previous.every((key, index) => Object.is(key, next[index]))

const samePropValue = (key: CompiledPropKey, previous: unknown, next: unknown): boolean =>
  Object.is(previous, next) ||
  (key === 'children' &&
    Array.isArray(previous) &&
    Array.isArray(next) &&
    previous.length === next.length &&
    previous.every((value, index) => Object.is(value, next[index])))

const controllersKey = /* @__PURE__ */ Symbol.for('@rue-js/runtime/compiled-props-controllers')
// Compiler and component entries are flattened separately when published. Keep their
// weak controller lookup shared, without adding observable metadata to user props.
const controllers = (): WeakMap<object, CompiledPropsController<object>> => {
  const shared = globalThis as typeof globalThis & {
    [key: symbol]: WeakMap<object, CompiledPropsController<object>> | undefined
  }
  return (shared[controllersKey] ??= new WeakMap())
}

export const _$compiledPropsGet = (props: object | null | undefined, key: PropertyKey): unknown => {
  if (props == null) return undefined
  const controller = controllers().get(props)
  return controller ? controller.get(key) : Reflect.get(props, key)
}
export const _$compiledPropsHas = (props: object | null | undefined, key: PropertyKey): boolean =>
  props == null ? false : (controllers().get(props)?.has(key) ?? Reflect.has(props, key))
export const _$compiledPropsKeys = (props: object | null | undefined): string[] =>
  (props == null ? [] : (controllers().get(props)?.keys() ?? enumerableOwnKeys(props))).filter(
    (key): key is string => typeof key === 'string',
  )
export const _$compiledPropsSnapshot = <T extends object>(props: T | null | undefined): T =>
  (props == null ? {} : (controllers().get(props)?.snapshot() ?? props)) as T

/** Explicit key and structure subscriptions over shallow, enumerable own props. */
export const createCompiledProps = <T extends object>(
  initialProps: T,
): CompiledPropsController<T> => {
  let disposed = false
  let snapshot = snapshotEnumerableProps(initialProps)
  let keys = Array.from(snapshot.keys())
  const records = new Map<CompiledPropKey, CompiledSignalHandle<CompiledPropState>>()
  // Records belong to this controller, not the owner that first reads a lazy key.
  // A child render can be replaced while its parent props controller remains live.
  const kernel = getSharedReactiveStorage()
  const keyVersion = createRootSignal(kernel, 0)

  const stateFor = (key: CompiledPropKey): CompiledSignalHandle<CompiledPropState> => {
    let record = records.get(key)
    if (record !== undefined) return record

    record = createRootSignal(kernel, { present: snapshot.has(key), value: snapshot.get(key) })
    records.set(key, record)
    return record
  }

  const props = Object.create(null) as T
  const get = (key: PropertyKey): unknown => {
    const normalized = typeof key === 'symbol' ? key : String(key)
    return disposed ? snapshot.get(normalized) : stateFor(normalized).get().value
  }
  const has = (key: PropertyKey): boolean => {
    const normalized = typeof key === 'symbol' ? key : String(key)
    return disposed ? snapshot.has(normalized) : stateFor(normalized).get().present
  }
  const readKeys = (): CompiledPropKey[] => {
    if (!disposed) keyVersion.get()
    return keys.slice()
  }
  const readSnapshot = (): T => {
    const result = {} as T
    for (const key of readKeys()) {
      Object.defineProperty(result, key, {
        value: get(key),
        enumerable: true,
        configurable: true,
        writable: true,
      })
    }
    return result
  }
  // Property getters preserve the receiver of callback props. Compiled expressions
  // subscribe through the explicit key operations above.
  const publishKeys = () => {
    for (const key of Reflect.ownKeys(props))
      if (!snapshot.has(key)) Reflect.deleteProperty(props, key)
    for (const key of keys)
      if (!Object.prototype.hasOwnProperty.call(props, key)) {
        Object.defineProperty(props, key, {
          enumerable: true,
          configurable: true,
          get: () => get(key),
        })
      }
  }
  publishKeys()

  const update = (nextProps: T): void => {
    if (disposed) throw new Error('Cannot update disposed compiled props')

    const nextSnapshot = snapshotEnumerableProps(nextProps)
    const nextKeys = Array.from(nextSnapshot.keys())
    const keysChanged = !sameKeys(keys, nextKeys)

    batch(() => {
      // Publish the complete snapshot before notifying any synchronous prop subscribers so a
      // rerunning component can discover newly read keys from the same update.
      snapshot = nextSnapshot
      keys = nextKeys
      publishKeys()
      for (const [key, record] of records) {
        const previous = record.peek()
        const present = nextSnapshot.has(key)
        const value = nextSnapshot.get(key)
        if (previous.present !== present || !samePropValue(key, previous.value, value)) {
          record.set({ present, value })
        }
      }

      if (keysChanged) keyVersion.update(version => version + 1)
    })
  }

  const dispose = (): void => {
    if (disposed) return
    disposed = true
    for (const record of records.values()) record.dispose()
    keyVersion.dispose()
    records.clear()
  }

  const controller = { props, get, has, keys: readKeys, snapshot: readSnapshot, update, dispose }
  controllers().set(props, controller)
  return controller
}

export const _$compiledPropsCall = (
  fn: (...args: unknown[]) => unknown,
  receiver: object,
  args: unknown[],
): unknown => Reflect.apply(fn, receiver, args)
