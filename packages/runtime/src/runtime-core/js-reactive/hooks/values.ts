import { isRef, isReactive, isReadonly, triggerRef } from '../../reactive-kernel/ref.js'
import type {
  ComputedHandle,
  ComputedInput,
  CreateValueHooksOptions,
  CustomRefFactory,
  EqualityComparator,
  ObjectLike,
  PortableBlockFactory,
  PortableBlockInstance,
  PortableComponentLike,
  RefLike,
  ValueHookBundle,
} from '../types.js'
import { RUE_MOUNT_ID_KEY, RUE_PORTABLE_COMPONENT_TYPE_KEY } from '../../protocol.js'

interface DomNodeLike extends ObjectLike {
  nodeType: unknown
}

interface MountIdentityLike extends ObjectLike {
  [RUE_MOUNT_ID_KEY]: unknown
}

export const isObjectLike = (value: unknown): value is ObjectLike =>
  (typeof value === 'object' || typeof value === 'function') && value != null

const isRustObject = (value: unknown): value is ObjectLike =>
  typeof value === 'object' && value != null

const safeGet = (value: unknown, key: PropertyKey): unknown => {
  if (!isObjectLike(value)) return undefined
  try {
    const result: unknown = Reflect.get(value, key)
    return result
  } catch {
    return undefined
  }
}

const safeHas = (value: unknown, key: PropertyKey): boolean => {
  if (!isObjectLike(value)) return false
  try {
    return Reflect.has(value, key)
  } catch {
    return false
  }
}

const isDomNodeLike = (value: unknown): value is DomNodeLike => {
  if (!isRustObject(value)) {
    return false
  }
  const nodeType = safeGet(value, 'nodeType')
  return nodeType !== undefined && nodeType !== null
}

const isMountIdentityLike = (value: unknown): value is MountIdentityLike =>
  isRustObject(value) && safeGet(value, RUE_MOUNT_ID_KEY) != null

const renderableIdentity = (value: unknown): unknown => {
  if (isDomNodeLike(value)) {
    return value
  }
  if (!isRustObject(value)) {
    return undefined
  }

  if (isMountIdentityLike(value)) {
    return safeGet(value, RUE_MOUNT_ID_KEY)
  }

  const nodes = safeGet(value, 'nodes')
  if (Array.isArray(nodes) && nodes.length === 1 && nodes[0] != null) {
    return nodes[0]
  }
  return undefined
}

const isBlockInstanceLike = (value: unknown): value is PortableBlockInstance =>
  isRustObject(value) &&
  safeGet(value, 'kind') === 'block' &&
  typeof safeGet(value, 'mount') === 'function'

const isBlockFactoryLike = (value: unknown): value is PortableBlockFactory =>
  typeof value === 'function' && safeGet(value, 'kind') === 'block-factory'

const renderableReferenceIdentity = (value: unknown): unknown => {
  const identity = renderableIdentity(value)
  if (identity !== undefined) {
    return identity
  }
  if (isBlockInstanceLike(value) || isBlockFactoryLike(value)) {
    return value
  }
  return undefined
}

const normalizedRenderableScalar = (value: unknown): unknown => {
  if (renderableReferenceIdentity(value) !== undefined) {
    return value
  }
  if (!Array.isArray(value) || value.length !== 1) {
    return undefined
  }
  return normalizedRenderableScalar(value[0])
}

const normalizedRenderableArray = (value: unknown): readonly unknown[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }
  for (const item of value) {
    if (
      normalizedRenderableScalar(item) === undefined &&
      normalizedRenderableArray(item) === undefined
    ) {
      return undefined
    }
  }
  return value
}

const isPortableComponentLike = (value: unknown): value is PortableComponentLike =>
  isRustObject(value) && safeGet(value, RUE_PORTABLE_COMPONENT_TYPE_KEY) != null

const shallowEqualPortableComponent = (left: unknown, right: unknown): boolean | undefined => {
  const leftPortable = isPortableComponentLike(left)
  const rightPortable = isPortableComponentLike(right)
  if (!leftPortable && !rightPortable) {
    return undefined
  }
  if (
    !leftPortable ||
    !rightPortable ||
    !Object.is(
      safeGet(left, RUE_PORTABLE_COMPONENT_TYPE_KEY),
      safeGet(right, RUE_PORTABLE_COMPONENT_TYPE_KEY),
    )
  ) {
    return false
  }
  return shallowEqualProp(safeGet(left, 'props'), safeGet(right, 'props'))
}

const shallowEqualRenderableLike = (left: unknown, right: unknown): boolean | undefined => {
  const leftScalar = normalizedRenderableScalar(left)
  const rightScalar = normalizedRenderableScalar(right)
  if (leftScalar !== undefined || rightScalar !== undefined) {
    if (leftScalar === undefined || rightScalar === undefined) {
      return false
    }
    return Object.is(
      renderableReferenceIdentity(leftScalar),
      renderableReferenceIdentity(rightScalar),
    )
  }

  const leftArray = normalizedRenderableArray(left)
  const rightArray = normalizedRenderableArray(right)
  if (leftArray === undefined || rightArray === undefined) {
    return undefined
  }
  if (leftArray.length !== rightArray.length) {
    return false
  }
  return leftArray.every(
    (item, index) => shallowEqualRenderableLike(item, rightArray[index]) === true,
  )
}

const isPlainObjectLike = (value: unknown): value is ObjectLike => {
  if (!isRustObject(value) || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === null || prototype === Object.prototype
}

/** Compare props by value, normalizing renderable values to their stable DOM identity. */
export const shallowEqualProp: EqualityComparator<unknown> = (left, right) => {
  if (Object.is(left, right)) {
    return true
  }

  const portableEqual = shallowEqualPortableComponent(left, right)
  if (portableEqual !== undefined) {
    return portableEqual
  }

  const renderableEqual = shallowEqualRenderableLike(left, right)
  if (renderableEqual !== undefined) {
    return renderableEqual
  }

  if (!isPlainObjectLike(left) || !isPlainObjectLike(right)) {
    return false
  }

  let leftKeys: string[]
  let rightKeys: string[]
  try {
    leftKeys = Object.keys(left)
    rightKeys = Object.keys(right)
  } catch {
    return false
  }
  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return leftKeys.every(key => {
    if (!safeHas(right, key)) {
      return false
    }

    const leftValue = safeGet(left, key)
    const rightValue = safeGet(right, key)
    const nestedPortableEqual = shallowEqualPortableComponent(leftValue, rightValue)
    if (nestedPortableEqual !== undefined) {
      return nestedPortableEqual
    }
    const nestedRenderableEqual = shallowEqualRenderableLike(leftValue, rightValue)
    return nestedRenderableEqual === undefined
      ? Object.is(leftValue, rightValue)
      : nestedRenderableEqual
  })
}

const callKernelFactory = <T>(
  runtime: unknown,
  primary: PropertyKey,
  fallback: PropertyKey | undefined,
  args: readonly unknown[],
): T => {
  const primaryFactory = safeGet(runtime, primary)
  const factory =
    typeof primaryFactory === 'function' || fallback === undefined
      ? primaryFactory
      : safeGet(runtime, fallback)
  if (typeof factory !== 'function') {
    throw new TypeError(`reactive runtime method ${String(primary)} is not callable`)
  }
  const result: unknown = Reflect.apply(factory, runtime, args)
  return result as T
}

/** Build value-oriented Hooks and facade wrappers around one injected reactive kernel. */
export const createValueHooks = ({
  reactiveRuntime,
  useSetup,
}: CreateValueHooksOptions): ValueHookBundle => {
  const createRef = <T>(initial: T, options?: unknown): RefLike<T> =>
    callKernelFactory<RefLike<T>>(reactiveRuntime, 'createRef', undefined, [initial, options])
  const useValue = <T>(factory: () => T, forceGlobal?: boolean): T =>
    forceGlobal ? factory() : useSetup(factory)
  const ref = <T>(initial: T, options?: unknown, forceGlobal?: boolean): RefLike<T> =>
    useValue(() => createRef(initial, options), forceGlobal)
  const shallowRef = ref
  const customRef = <T>(factory: CustomRefFactory<T>, forceGlobal?: boolean): RefLike<T> =>
    useValue(
      () => callKernelFactory<RefLike<T>>(reactiveRuntime, 'createCustomRef', undefined, [factory]),
      forceGlobal,
    )
  const computed = <T>(arg: ComputedInput<T>): ComputedHandle<T> =>
    callKernelFactory<ComputedHandle<T>>(reactiveRuntime, 'createComputed', 'computed', [arg])
  const unref = <T>(value: T | RefLike<T>): T => (isRef(value) ? (value.value as T) : (value as T))
  const hooks = { isReactive, isReadonly, isRef, ref, customRef, unref }
  return {
    hooks,
    facade: {
      computed,
      createComputed: computed,
      customRef,
      isReadonly,
      isRef,
      shallowRef,
      triggerRef,
    },
  }
}
