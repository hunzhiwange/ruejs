import type { EqualityComparator, SignalOptions } from './signal.js'
import { SignalHandle, appendSignalPath, createSignal, type SignalPath } from './signal.js'
import type { ReactiveEffectRuntime } from './effect.js'

export interface ReactiveOptions<T> extends SignalOptions<T> {
  readonly readonly?: boolean
  readonly shallow?: boolean
}

export interface CustomRefDefinition<T> {
  get?: () => T
  set?: (value: T) => void
  [key: PropertyKey]: unknown
}

export type CustomRefFactory<T> = (
  track: () => void,
  trigger: () => void,
) => CustomRefDefinition<T> | null | undefined

export interface RefValue<T> {
  value: T
  readonly __rue_ref__?: true
}

interface ProxyContext {
  readonly hideRootKeys: boolean
  readonly readonly: boolean
  readonly shallow: boolean
  readonly signal: SignalHandle<unknown>
}

const REF_FLAG = '__rue_ref__'
const TRIGGER_REF_KEY = '__rue_trigger_ref__'
const ARRAY_MUTATORS = new Set([
  'copyWithin',
  'fill',
  'pop',
  'push',
  'reverse',
  'shift',
  'sort',
  'splice',
  'unshift',
])

const TYPED_ARRAY_MUTATORS = new Set(['copyWithin', 'fill', 'reverse', 'set', 'sort'])

const isObjectLike = (value: unknown): value is Record<PropertyKey, unknown> | Function =>
  (typeof value === 'object' && value !== null) || typeof value === 'function'

const safeGet = (value: unknown, key: PropertyKey): unknown => {
  if (!isObjectLike(value)) return undefined
  try {
    return Reflect.get(value, key)
  } catch {
    return undefined
  }
}

const rawValue = (value: unknown): unknown => {
  if (!isObjectLike(value)) return value
  const raw = safeGet(value, '__rue_raw__')
  return raw === undefined ? value : raw
}

const cloneArrayLike = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.slice()
  if (ArrayBuffer.isView(value)) {
    const slice = safeGet(value, 'slice')
    if (typeof slice === 'function') return Reflect.apply(slice, value, [])
    return Array.prototype.slice.call(value)
  }
  if (isObjectLike(value)) return Object.assign({}, value)
  return value
}

const createProxyTarget = (holder: unknown): object => {
  if (Array.isArray(holder)) return []
  if (typeof holder === 'function') {
    return function (this: unknown, ...args: unknown[]): unknown {
      return Reflect.apply(holder, this, args)
    }
  }
  return {}
}

const nonConfigurableTargetKeys = (target: object): (string | symbol)[] =>
  Reflect.ownKeys(target).filter(
    key => Reflect.getOwnPropertyDescriptor(target, key)?.configurable === false,
  )

const makeProxy = (
  context: ProxyContext,
  path: readonly PropertyKey[],
): Record<PropertyKey, unknown> => {
  const initialHolder = context.signal.peekPath(path as SignalPath)
  const target = createProxyTarget(initialHolder)
  const handler: ProxyHandler<object> = {
    apply(_target, thisArg, argumentsList) {
      const holder = context.signal.getPath(path as SignalPath)
      if (typeof holder !== 'function') throw new TypeError('reactive value is not callable')
      return Reflect.apply(holder, thisArg, argumentsList.map(rawValue))
    },
    construct(_target, argumentsList, newTarget) {
      const holder = context.signal.getPath(path as SignalPath)
      if (typeof holder !== 'function') throw new TypeError('reactive value is not constructable')
      return Reflect.construct(holder, argumentsList.map(rawValue), newTarget)
    },
    defineProperty(_target, key, descriptor) {
      if (context.readonly) return false
      if ('value' in descriptor) {
        context.signal.setPath(
          appendSignalPath(path, key) as SignalPath,
          rawValue(descriptor.value),
        )
        return true
      }
      return false
    },
    deleteProperty(_target, key) {
      if (context.readonly) return false
      const holder = context.signal.peekPath(path as SignalPath)
      if (!isObjectLike(holder)) return true
      const draft = Array.isArray(holder)
        ? holder.slice()
        : Object.defineProperties(
            Object.create(Object.getPrototypeOf(holder)),
            Object.getOwnPropertyDescriptors(holder),
          )
      const deleted = Reflect.deleteProperty(draft, key)
      if (deleted) context.signal.setPath(path as SignalPath, draft)
      return deleted
    },
    get(_target, key) {
      if (key === '__rue_raw__') return context.signal.peekPath(path as SignalPath)
      if (key === '__signal__') return context.signal
      if (key === '__isReactive__') return true
      if (key === '__isReadonly__') return context.readonly
      if (key === '__rue_path__') return [...path]
      if (key === '__rue_target__') return context.signal.peekPath(path as SignalPath)
      if (key === 'toJSON' || key === 'valueOf') {
        return () => context.signal.getPath(path as SignalPath)
      }
      if (key === 'toString') {
        return () => {
          const current = context.signal.getPath(path as SignalPath)
          if (typeof current === 'string') return current
          try {
            const serialized = JSON.stringify(current)
            return serialized === undefined ? '[object RueReactive]' : serialized
          } catch {
            return '[object RueReactive]'
          }
        }
      }

      const holder = context.signal.peekPath(path as SignalPath)
      const childPath = appendSignalPath(path, key)
      let value: unknown
      try {
        value = isObjectLike(holder) ? Reflect.get(holder, key, holder) : undefined
      } catch {
        value = undefined
      }

      if (typeof value === 'function') {
        if (context.shallow) {
          context.signal.getPath(childPath as SignalPath)
          return value
        }
        const methodName = typeof key === 'string' ? key : ''
        return (...args: unknown[]) => {
          context.signal.trackPath(path as SignalPath, true)
          const base = context.signal.peekPath(path as SignalPath)
          if (!isObjectLike(base)) return undefined
          const method = Reflect.get(base, key, base)
          if (typeof method !== 'function') return undefined
          const normalizedArgs = args.map(rawValue)
          const typedArray = ArrayBuffer.isView(base)
          const mutating =
            (Array.isArray(base) && ARRAY_MUTATORS.has(methodName)) ||
            (typedArray && TYPED_ARRAY_MUTATORS.has(methodName))

          if (context.readonly) {
            const copy = cloneArrayLike(base)
            return Reflect.apply(method, copy, normalizedArgs)
          }
          if (mutating) {
            const draft = cloneArrayLike(base)
            const result = Reflect.apply(method, draft, normalizedArgs)
            context.signal.setPath(path as SignalPath, rawValue(draft))
            return result
          }
          return Reflect.apply(method, base, normalizedArgs)
        }
      }

      if (!context.shallow && isObjectLike(value)) {
        context.signal.getPath(childPath as SignalPath)
        return makeProxy(context, childPath)
      }
      context.signal.getPath(childPath as SignalPath)
      return value
    },
    getOwnPropertyDescriptor(_target, key) {
      const targetDescriptor = Reflect.getOwnPropertyDescriptor(target, key)
      if (targetDescriptor?.configurable === false) return targetDescriptor
      const holder = context.signal.peekPath(path as SignalPath)
      if (!isObjectLike(holder)) return undefined
      const descriptor = Reflect.getOwnPropertyDescriptor(holder, key)
      return descriptor === undefined ? undefined : { ...descriptor, configurable: true }
    },
    has(_target, key) {
      const holder = context.signal.peekPath(path as SignalPath)
      return isObjectLike(holder) && Reflect.has(holder, key)
    },
    ownKeys() {
      const required = nonConfigurableTargetKeys(target)
      if (context.hideRootKeys && path.length === 0) return required
      const holder = context.signal.peekPath(path as SignalPath)
      const holderKeys = isObjectLike(holder) ? Reflect.ownKeys(holder) : []
      return [...new Set([...holderKeys, ...required])]
    },
    set(_target, key, value) {
      if (context.readonly) return false
      context.signal.setPath(appendSignalPath(path, key) as SignalPath, rawValue(value))
      return true
    },
  }
  const proxy = new Proxy(target, handler)
  return proxy as Record<PropertyKey, unknown>
}

export const createReactive = <T>(
  runtime: ReactiveEffectRuntime,
  initial: T,
  options: ReactiveOptions<T> | null = {},
): T extends object ? T : RefValue<T> => {
  const primitive = !isObjectLike(initial)
  const initialRoot = primitive ? { value: initial } : initial
  const equals = options?.equals
  const rootEquals: EqualityComparator<typeof initialRoot> | undefined =
    primitive && equals !== undefined
      ? (previous, next) =>
          equals(
            (isObjectLike(previous) ? safeGet(previous, 'value') : previous) as T,
            (isObjectLike(next) ? safeGet(next, 'value') : next) as T,
          )
      : (equals as EqualityComparator<typeof initialRoot> | undefined)
  const signal = createSignal(runtime, initialRoot, { equals: rootEquals }) as SignalHandle<unknown>
  const context: ProxyContext = {
    hideRootKeys: primitive,
    readonly: options?.readonly === true,
    shallow: options?.shallow === true,
    signal,
  }
  return makeProxy(context, []) as T extends object ? T : RefValue<T>
}

export const createRef = <T>(
  runtime: ReactiveEffectRuntime,
  initial: T,
  options?: SignalOptions<T> | null,
): RefValue<T> => {
  const root = { value: initial } as RefValue<T>
  Object.defineProperty(root, REF_FLAG, {
    value: true,
    enumerable: false,
    configurable: false,
  })
  const equals = options?.equals
  return createReactive(runtime, root, {
    equals:
      equals === undefined ? undefined : (previous, next) => equals(previous.value, next.value),
  }) as RefValue<T>
}

export const ref = createRef

export const createCustomRef = <T>(
  runtime: ReactiveEffectRuntime,
  factory: CustomRefFactory<T>,
): RefValue<T> => {
  const dependency = createSignal(runtime, { value: undefined })
  const track = (): void => {
    dependency.getPath(['value'])
  }
  const trigger = (): void => {
    dependency.triggerPath(['value'])
  }
  const created = factory(track, trigger)
  const definition = isObjectLike(created) ? created : {}
  const result = {} as RefValue<T>
  Object.defineProperty(result, REF_FLAG, {
    value: true,
    enumerable: false,
    configurable: false,
  })
  Object.defineProperty(result, TRIGGER_REF_KEY, {
    value: trigger,
    enumerable: false,
    configurable: true,
  })
  Object.defineProperty(result, 'value', {
    enumerable: true,
    configurable: true,
    get: () => {
      const getter = safeGet(definition, 'get')
      return typeof getter === 'function' ? Reflect.apply(getter, definition, []) : undefined
    },
    set: value => {
      const setter = safeGet(definition, 'set')
      if (typeof setter === 'function') Reflect.apply(setter, definition, [value])
    },
  })
  return result
}

export const isReactive = (value: unknown): boolean =>
  isObjectLike(value) &&
  (safeGet(value, '__isReactive__') === true || isObjectLike(safeGet(value, '__signal__')))

export const isReadonly = (value: unknown): boolean =>
  isObjectLike(value) && safeGet(value, '__isReadonly__') === true

export const isRef = (value: unknown): value is RefValue<unknown> => {
  if (!isObjectLike(value)) return false
  const raw = safeGet(value, '__rue_raw__')
  const target = isObjectLike(raw) ? raw : value
  return safeGet(target, REF_FLAG) === true
}

export const isProxy = (value: unknown): boolean =>
  isObjectLike(value) && !isRef(value) && (isReactive(value) || isReadonly(value))

export const toRaw = <T>(value: T): T => {
  if (!isObjectLike(value)) return value
  const raw = safeGet(value, '__rue_raw__')
  if (raw !== undefined) {
    if (isObjectLike(raw) && safeGet(raw, REF_FLAG) === true) return safeGet(raw, 'value') as T
    return raw as T
  }
  if (isRef(value)) return safeGet(value, 'value') as T
  return value
}

export const triggerRef = (value: unknown): void => {
  if (!isObjectLike(value)) return
  const customTrigger = safeGet(value, TRIGGER_REF_KEY)
  if (typeof customTrigger === 'function') {
    Reflect.apply(customTrigger, value, [])
    return
  }
  const signal = safeGet(value, '__signal__')
  const triggerPath = safeGet(signal, 'triggerPath')
  if (typeof triggerPath === 'function') {
    Reflect.apply(triggerPath, signal, [['value']])
    return
  }
  const trigger = safeGet(value, 'trigger')
  if (typeof trigger === 'function') Reflect.apply(trigger, value, [])
}
