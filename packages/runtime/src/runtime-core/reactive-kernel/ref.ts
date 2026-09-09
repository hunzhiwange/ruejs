import { SignalHandle, createSignal, type SignalOptions } from './signal.js'
import type { ReactiveRuntimeServices } from './runtime-services.js'
type ReactiveEffectRuntime = ReactiveRuntimeServices
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
  [key: PropertyKey]: unknown
  value: T
  readonly __rue_ref__?: true
}

const REF_FLAG = '__rue_ref__'
const TRIGGER_REF_KEY = '__rue_trigger_ref__'
const isObjectLike = (value: unknown): value is object =>
  value !== null && (typeof value === 'object' || typeof value === 'function')
const safeGet = (value: unknown, key: PropertyKey): unknown => {
  if (!isObjectLike(value)) return undefined
  try {
    return Reflect.get(value, key)
  } catch {
    return undefined
  }
}
class RefHandle<T> extends SignalHandle<T> {
  override get __rue_ref__(): boolean {
    return true
  }
  protected override shouldTrackValueRead(): boolean {
    return true
  }
}
export const createRef = <T>(
  runtime: ReactiveRuntimeServices,
  initial: T,
  options?: SignalOptions<T> | null,
): SignalHandle<T> => new RefHandle(runtime, initial, options ?? {})

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

export const isReactive = (value: unknown): boolean => value instanceof SignalHandle || isRef(value)
export const isReadonly = (value: unknown): boolean => safeGet(value, '__isReadonly__') === true
export const isRef = (value: unknown): value is RefValue<unknown> =>
  safeGet(value, REF_FLAG) === true
export const triggerRef = (value: unknown): void => {
  const trigger = safeGet(value, TRIGGER_REF_KEY) ?? safeGet(value, 'trigger')
  if (typeof trigger === 'function') Reflect.apply(trigger, value, [])
}
