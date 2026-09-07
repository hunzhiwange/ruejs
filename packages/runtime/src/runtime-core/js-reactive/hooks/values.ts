import type {
  ComputedHandle,
  ComputedInput,
  CreateValueHooksOptions,
  CustomRefFactory,
  EqualityComparator,
  EqualityOptions,
  ObjectLike,
  PortableBlockFactory,
  PortableBlockInstance,
  PortableComponentLike,
  ReactiveOptions,
  ReactiveProxyMarkers,
  ReactiveState,
  ReadonlyRefLike,
  RefLike,
  TriggerableSignalHandle,
  ValueHookBundle,
} from '../types.js'
import { RUE_MOUNT_ID_KEY, RUE_PORTABLE_COMPONENT_TYPE_KEY } from '../../protocol.js'

const RUE_REF_FLAG = '__rue_ref__'

interface DomNodeLike extends ObjectLike {
  nodeType: unknown
}

interface MountIdentityLike extends ObjectLike {
  [RUE_MOUNT_ID_KEY]: unknown
}

interface ShallowRefKernelOptions<T> extends ReactiveOptions<RefLike<T>> {
  shallow: true
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

const safeSet = (value: unknown, key: PropertyKey, next: unknown): void => {
  if (!isObjectLike(value)) return
  try {
    Reflect.set(value, key, next)
  } catch {}
}

const hasReadonlyOption = (options: unknown): boolean =>
  isObjectLike(options) && safeGet(options, 'readonly') === true

const hasWritableComputedOptions = <T>(
  options: ComputedInput<T>,
): options is Exclude<ComputedInput<T>, () => T> & { set: (value: T) => void } =>
  isObjectLike(options) && typeof safeGet(options, 'set') === 'function'

const withOption = (options: unknown, key: PropertyKey, value: unknown): ObjectLike => {
  const normalized: ObjectLike = isRustObject(options) ? options : {}
  safeSet(normalized, key, value)
  return normalized
}

const normalizeShallowRefOptions = <T>(options: unknown): ShallowRefKernelOptions<T> => {
  const normalized: ObjectLike = isObjectLike(options) ? { ...options } : {}
  const equals = safeGet(normalized, 'equals')
  if (typeof equals !== 'function') {
    return { ...normalized, shallow: true }
  }

  return {
    ...normalized,
    shallow: true,
    equals: (previous: RefLike<T>, next: RefLike<T>): boolean => {
      const result: unknown = Reflect.apply(equals, undefined, [previous?.value, next?.value])
      return result as boolean
    },
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
  const readonlyFallbacks = new WeakSet<object>()
  const createReactiveFromKernel = <T>(
    initial: T,
    options?: ReactiveOptions<T>,
  ): ReactiveState<T> =>
    callKernelFactory<ReactiveState<T>>(reactiveRuntime, 'createReactive', 'reactive', [
      initial,
      options,
    ])
  const createRefFromKernel = <T>(initial: T, options?: unknown): RefLike<T> =>
    callKernelFactory<RefLike<T>>(reactiveRuntime, 'createRef', undefined, [initial, options])
  const createComputedFromKernel = <T>(arg: ComputedInput<T>): ComputedHandle<T> =>
    callKernelFactory<ComputedHandle<T>>(reactiveRuntime, 'createComputed', 'computed', [arg])

  const markReadonlyResult = <T>(value: T): T => {
    if (isObjectLike(value)) {
      readonlyFallbacks.add(value)
    }
    return value
  }

  const markRefValue = <T>(value: T): T => {
    if (!isObjectLike(value)) {
      return value
    }
    try {
      Object.defineProperty(value, RUE_REF_FLAG, {
        value: true,
        enumerable: false,
        configurable: false,
      })
    } catch {}
    return value
  }

  /** 读取 ref/computed 标记；对代理值优先回到 raw target 再判断。 */
  const refFlagTarget = (value: unknown): ObjectLike | undefined => {
    if (!isRustObject(value)) {
      return undefined
    }
    const raw = safeGet(value, '__rue_raw__')
    return isRustObject(raw) ? raw : value
  }

  /** 判断值是否为 Rue ref 或 computed ref。 */
  const isRef = (value: unknown): value is RefLike<unknown> =>
    safeGet(refFlagTarget(value), RUE_REF_FLAG) === true

  const isReactive = (value: unknown): value is ReactiveProxyMarkers => {
    // 非对象一定不是 reactive
    if (!isRustObject(value)) {
      return false
    }

    // reactive 代理会打上内部标记：
    // - __isReactive__: 布尔或存在即视为真
    // - __signal__:    隐藏的底层信号句柄（对象存在也说明是代理）
    const flag = safeGet(value, '__isReactive__')
    const signal = safeGet(value, '__signal__')
    const flagSet = typeof flag === 'boolean' ? flag : flag !== undefined
    return flagSet || isRustObject(signal)
  }

  /** 判断对象是否带有 readonly 标记，覆盖 readonly/shallowReadonly 与只读 computed。 */
  const isReadonly = (value: unknown): boolean =>
    isRustObject(value) &&
    (readonlyFallbacks.has(value) || safeGet(value, '__isReadonly__') === true)

  const facadeIsReadonly = (value: unknown): boolean => {
    const runtimeIsReadonly = safeGet(reactiveRuntime, 'isReadonly')
    if (typeof runtimeIsReadonly === 'function') {
      const result: unknown = Reflect.apply(runtimeIsReadonly, reactiveRuntime, [value])
      if (result === true) return true
    }
    return isReadonly(value)
  }

  /** 判断对象是否为 Rue reactive 或 readonly 代理，排除 ref/computed 句柄。 */
  const isProxy = (value: unknown): boolean =>
    isRustObject(value) &&
    !isRef(value) &&
    (isReactive(value) || safeGet(value, '__isReadonly__') === true)

  const createReactive = <T>(initial: T, options?: ReactiveOptions<T>): ReactiveState<T> => {
    const value = createReactiveFromKernel(initial, options)
    return hasReadonlyOption(options) ? markReadonlyResult(value) : value
  }

  const createRef = <T>(initial: T, options?: unknown): RefLike<T> =>
    markRefValue(createRefFromKernel(initial, options))

  const useValue = <T>(factory: () => T, forceGlobal?: boolean): T =>
    forceGlobal ? factory() : useSetup(factory)

  // 创建 Reactive：返回一个对象/数组的响应式代理（深/浅、只读可选）
  //
  // 用法（JavaScript / TypeScript）：
  // ```ts
  // // 基础对象：读取与写入都响应式
  // const state = reactive({ user: { name: 'A' }, items: ['x'] })
  // console.log(state.user.name)     // 'A'
  // state.user.name = 'B'            // 写入嵌套字段，触发订阅者
  // state.items.push('y')            // 数组写入也可触发（通过路径写入实现不可变更新）
  //
  // // 在 Vapor JSX 中使用（自动 DOM 更新）
  // // <span>{state.user.name}</span>
  // // <input value={state.user.name} onInput={e => state.user.name = e.target.value} />
  //
  // // 只读代理：禁止写入
  // const ro = reactive({ a: 1 }, { readonly: true })
  // // ro.a = 2 // 将被忽略或导致失败（只读）
  //
  // // 浅代理：仅对顶层对象进行代理，子对象不递归代理
  // const sh = reactive({ nested: { a: 1 } }, { shallow: true })
  // // sh.nested 仍为普通对象（非代理）
  //
  // // 原始类型：普通值会自动包裹为 { value } 并返回其代理
  // const num = reactive(0)
  // console.log(num.value)       // 0
  // num.value = 1               // 写入 value 字段触发订阅者
  // const str = reactive('A')
  // str.value = 'B'             // 原始类型统一通过 value 字段读写
  //
  // // 自定义等值比较：用于控制触发频率
  // const eq = (prev: any, next: any) => _.isEqual(prev, next)
  // const obj = reactive({ a: 1 }, { equals: eq })
  // obj.a = 1 // 不触发（相等）
  // ```
  const reactive = <T>(
    initial: T,
    options?: ReactiveOptions<T>,
    forceGlobal?: boolean,
  ): ReactiveState<T> => useValue(() => createReactive(initial, options), forceGlobal)

  // 创建 Reactive：返回一个对象/数组的响应式代理（浅）
  //
  // 用法（JavaScript / TypeScript）：
  // ```ts
  // // 只读代理：禁止写入
  // const ro = shallowReactive({ a: 1 })
  // // ro.a = 2 // 将被忽略或导致失败（只读）
  //
  // // 浅代理：仅对顶层对象进行代理，子对象不递归代理
  // const sh = shallowReactive({ nested: { a: 1 } })
  // // sh.nested 仍为普通对象（非代理）
  //
  // // 自定义等值比较：用于控制触发频率
  // const eq = (prev: any, next: any) => _.isEqual(prev, next)
  // const obj = shallowReactive({ a: 1 }, { equals: eq })
  // obj.a = 1 // 不触发（相等）
  // ```
  const shallowReactive = <T>(
    initial: T,
    options?: ReactiveOptions<T>,
    forceGlobal?: boolean,
  ): ReactiveState<T> => {
    // 在选项上标记 shallow=true，表示仅代理第一层属性
    const normalizedOptions = withOption(options, 'shallow', true) as ReactiveOptions<T>
    return reactive(initial, normalizedOptions, forceGlobal)
  }

  /**
   * 创建 Reactive：返回一个对象/数组的响应式代理（深度只读）
   *
   * 用法（JavaScript / TypeScript）：
   * ```ts
   * // 只读代理：禁止写入
   * const ro = readonly({ a: 1 })
   * // ro.a = 2 // 将被忽略或导致失败（只读）
   * ```
   */
  const readonly = <T>(initial: T, forceGlobal?: boolean): ReactiveState<T> => {
    // 标记 readonly=true，表示代理只读（写入被忽略/禁止）
    return reactive(initial, { readonly: true }, forceGlobal)
  }

  /**
   * 创建 Reactive：返回一个对象/数组的响应式代理（第一层只读）
   *
   * 用法（JavaScript / TypeScript）：
   * ```ts
   * // 只读代理：禁止写入
   * const ro = readonly({ a: 1, b: {hello: 'world'} })
   * // ro.a = 2 // 将被忽略或导致失败（只读）
   * // ro.hello = 'new world' // 成功
   * ```
   */
  const shallowReadonly = <T>(initial: T, forceGlobal?: boolean): ReactiveState<T> => {
    // 只读 + 浅代理：顶层属性只读，子对象不递归代理
    return reactive(initial, { readonly: true, shallow: true }, forceGlobal)
  }

  const propsReactive = <T>(initial: T, forceGlobal?: boolean): ReactiveState<T> => {
    // 组件 props 应保持浅只读：顶层访问可追踪，DOM/raw value/已有 reactive 值按原样透传。
    return reactive(
      initial,
      {
        readonly: true,
        shallow: true,
        equals: shallowEqualProp as EqualityComparator<T>,
      },
      forceGlobal,
    )
  }

  /**
   * 创建 Ref：返回一个带有 `value` 字段的响应式代理对象
   *
   * 用法（JavaScript / TypeScript）：
   * ```ts
   * // 基本使用：读写 value，自动依赖收集
   * const r = ref(0)
   * console.log(r.value)        // 0
   * r.value = 1                 // 触发订阅者
   *
   * // 与 watchEffect 配合（依赖自动收集）
   * const stop = watchEffect(() => {
   *   console.log('ref value =', r.value)
   * })
   * r.value = 2                 // 触发前面的 watchEffect
   * stop()                      // 停止响应
   *
   * // peek：查看当前值，不收集依赖（不会订阅当前副作用）
   * const cur = r.peek()        // 仅返回值，不产生订阅
   *
   * // update：基于当前值计算并写回
   * r.update(prev => prev + 1)  // 等价于 r.value = (prev + 1)
   *
   * // 自定义等值比较：避免无意义的触发
   * const r2 = ref({ a: 1 }, { equals: (p, n) => _.isEqual(p?.value, n?.value) })
   * r2.value = { a: 1 }         // 不触发（相等）
   *
   * // 与组件/DOM 结合（Vapor 模式下自动更新）
   * // <span>{r.value}</span> 会被编译为原生 DOM + 响应式更新
   * ```
   */
  const ref = <T>(initial: T, options?: unknown, forceGlobal?: boolean): RefLike<T> => {
    // 把“创建 Ref（{ value } 代理）”的过程包装为闭包，以便交给 Hook 槽位懒创建
    const factory = () => createRef(initial, options)
    // 组件内通过 Hook 槽位稳定引用；全局调用则直接创建 Ref。
    return useValue(factory, forceGlobal)
  }

  /**
   * 创建自定义 ref：工厂函数接收 track/trigger，并返回 value 的 get/set 实现。
   */
  const customRef = <T>(factory: CustomRefFactory<T>, forceGlobal?: boolean): RefLike<T> =>
    useValue(
      () => callKernelFactory<RefLike<T>>(reactiveRuntime, 'createCustomRef', undefined, [factory]),
      forceGlobal,
    )

  const facadeReactive = <T>(
    initial: T,
    options?: ReactiveOptions<T>,
    forceGlobal?: boolean,
  ): ReactiveState<T> => {
    // 将“创建 reactive 代理”的逻辑包装为函数，以便交给 Hook 插槽懒初始化/复用
    const factory = () => createReactive(initial, options)
    // 当没有当前组件实例或明确要求强制全局时，直接创建并返回
    const value = useValue(factory, forceGlobal)
    // 否则在“当前组件实例的 Hook 槽位”上创建/复用，保证引用稳定
    return hasReadonlyOption(options) ? markReadonlyResult(value) : value
  }

  const facadeReadonly = <T>(initial: T, forceGlobal?: boolean): ReactiveState<T> =>
    markReadonlyResult(facadeReactive(initial, { readonly: true }, forceGlobal))

  const facadeShallowReadonly = <T>(initial: T, forceGlobal?: boolean): ReactiveState<T> =>
    markReadonlyResult(facadeReactive(initial, { readonly: true, shallow: true }, forceGlobal))

  const facadePropsReactive = <T>(initial: T, forceGlobal?: boolean): ReactiveState<T> =>
    markReadonlyResult(
      facadeReactive(
        initial,
        {
          readonly: true,
          shallow: true,
          equals: shallowEqualProp as EqualityComparator<T>,
        },
        forceGlobal,
      ),
    )

  /**
   * unref：若参数是 ref，返回其 .value；否则原样返回
   */
  const unref = <T>(value: T | RefLike<T>): T => {
    if (!isRustObject(value)) {
      return value as T
    }
    const refValue = safeGet(value, 'value')
    return refValue === undefined ? (value as T) : (refValue as T)
  }

  const readSignalValue = (signal: unknown): unknown => {
    for (const method of ['peek', 'get'] as const) {
      const reader = safeGet(signal, method)
      if (typeof reader !== 'function') {
        continue
      }
      let value: unknown
      try {
        value = Reflect.apply(reader, signal, []) as unknown
      } catch {
        continue
      }
      if (value === undefined) {
        continue
      }
      if (isRustObject(value)) {
        const nestedValue = safeGet(value, 'value')
        if (nestedValue !== undefined) {
          return nestedValue
        }
      }
      return value
    }
    return undefined
  }

  /**
   * 调试工具：获取 reactive 代理背后的原始数据快照
   * - 对 reactive 对象：通过隐藏的 `__signal__` 获取当前值（不收集依赖）
   * - 对 ref：返回其 `.value`
   * - 其他：原样返回
   */
  const toRawValue = (value: unknown): unknown => {
    if (!isRustObject(value)) {
      return value
    }

    // 优先：隐藏原始值
    const raw = safeGet(value, '__rue_raw__')
    if (raw !== undefined) {
      if (isRustObject(raw) && safeGet(raw, RUE_REF_FLAG) === true) {
        const rawRefValue = safeGet(raw, 'value')
        if (rawRefValue !== undefined) {
          return rawRefValue
        }
      }
      return raw
    }

    // 其次：底层信号句柄（代理暴露的隐藏通道）
    const signal = safeGet(value, '__signal__')
    if (signal !== undefined) {
      // 首选 peek()：读取当前值但不收集依赖
      const signalValue = readSignalValue(signal)
      // 回退使用 get()：可能会收集依赖，但能保证读取到当前值
      return signalValue === undefined ? value : signalValue
    }

    // Ref 形态：返回其 value
    const refValue = safeGet(value, 'value')
    if (refValue !== undefined) {
      return refValue
    }

    // 兼容：如果对象含 `get` 方法（只读信号），尝试调用以获取当前值
    const getter = safeGet(value, 'get')
    if (typeof getter === 'function') {
      try {
        const result: unknown = Reflect.apply(getter, value, [])
        if (result !== undefined) {
          return result
        }
      } catch {
        // 若读取失败，返回原对象以保持健壮性
      }
    }
    return value
  }

  const toRaw = <T>(value: unknown): T => toRawValue(value) as T

  const isRefLike = (value: unknown): value is RefLike<unknown> =>
    isObjectLike(value) &&
    (safeGet(value, RUE_REF_FLAG) === true ||
      (safeGet(value, '__signal__') != null && safeHas(value, 'value')))

  const markRefLike = <T>(target: ObjectLike): RefLike<T> => {
    Object.defineProperty(target, RUE_REF_FLAG, {
      value: true,
      enumerable: false,
      configurable: true,
    })
    return target as RefLike<T>
  }

  const createGetterRef = <T>(getter: () => T): ReadonlyRefLike<T> => {
    const result = markRefLike<T>({})
    Object.defineProperty(result, 'value', {
      enumerable: true,
      configurable: true,
      get: getter,
    })
    return result
  }

  const createObjectPropertyRef = <T>(
    source: ObjectLike,
    key: PropertyKey,
    defaultValue: T,
  ): RefLike<T> => {
    const result = markRefLike<T>({})
    Object.defineProperty(result, 'value', {
      enumerable: true,
      configurable: true,
      get(): T {
        const value = safeGet(source, key)
        return value === undefined ? defaultValue : (value as T)
      },
      set(value: T) {
        safeSet(source, key, value)
      },
    })
    return result
  }

  const computed = <T>(arg: ComputedInput<T>): ComputedHandle<T> => {
    const value = markRefValue(createComputedFromKernel(arg))
    return hasWritableComputedOptions(arg) ? value : markReadonlyResult(value)
  }

  const createComputed = <T>(arg: ComputedInput<T>): ComputedHandle<T> => {
    const value = markRefValue(createComputedFromKernel(arg))
    return hasWritableComputedOptions(arg) ? value : markReadonlyResult(value)
  }

  const shallowRef = <T>(
    initial: T,
    options?: EqualityOptions<T>,
    forceGlobal?: boolean,
  ): RefLike<T> => {
    const root = markRefValue<RefLike<T>>({ value: initial })
    return facadeReactive(root, normalizeShallowRefOptions<T>(options), forceGlobal)
  }

  const triggerRef = (refValue: unknown): void => {
    if (!isObjectLike(refValue)) {
      return
    }
    const customTrigger = safeGet(refValue, '__rue_trigger_ref__')
    if (typeof customTrigger === 'function') {
      Reflect.apply(customTrigger, refValue, [])
      return
    }
    const signal = safeGet(refValue, '__signal__')
    const triggerPath = safeGet(signal, 'triggerPath')
    if (typeof triggerPath === 'function') {
      Reflect.apply(triggerPath, signal as TriggerableSignalHandle, [['value']])
      return
    }
    const trigger = safeGet(refValue, 'trigger')
    if (typeof trigger === 'function') Reflect.apply(trigger, refValue, [])
  }

  function toRef<T>(source: RefLike<T>): RefLike<T>
  function toRef<T>(source: () => T): ReadonlyRefLike<T>
  function toRef<T, K extends keyof T>(source: T, key: K, defaultValue?: T[K]): RefLike<T[K]>
  function toRef<T>(source: T): RefLike<T>
  function toRef(source: unknown, key?: PropertyKey, defaultValue?: unknown): RefLike<unknown> {
    if (arguments.length > 1) {
      const rawSource = isObjectLike(source) ? safeGet(source, '__rue_raw__') : undefined
      const rawExisting = isObjectLike(rawSource)
        ? safeGet(rawSource, key as PropertyKey)
        : undefined
      if (isRefLike(rawExisting)) {
        return rawExisting
      }
      const existing = isObjectLike(source) ? safeGet(source, key as PropertyKey) : undefined
      if (isRefLike(existing)) {
        return existing
      }
      const target = isObjectLike(source) ? source : Object.create(null)
      return createObjectPropertyRef(target, key as PropertyKey, defaultValue)
    }
    if (isRefLike(source)) {
      return source
    }
    if (typeof source === 'function') {
      return createGetterRef(source as () => unknown) as RefLike<unknown>
    }
    return createRefFromKernel(source)
  }

  function toRefs<T extends object>(object: T): { [K in keyof T]: RefLike<T[K]> }
  function toRefs(object: unknown): ObjectLike
  function toRefs(object: unknown): ObjectLike {
    if (!isObjectLike(object)) {
      return {}
    }
    const refs: object = Array.isArray(object) ? Array.from({ length: object.length }) : {}
    for (const key of Reflect.ownKeys(object)) {
      const descriptor = Reflect.getOwnPropertyDescriptor(object, key)
      if (descriptor?.enumerable) {
        safeSet(refs, key, toRef(object, key))
      }
    }
    return refs as ObjectLike
  }

  /**
   * 创建带选项的信号
   * options.equals: Function(prev, next) -> bool，返回 true 表示值相等（不触发）
   * 示例（JavaScript）：
   * ```javascript
   * const count = signal(0);
   * createEffect(() => {
   *   console.log('count =', count.get());
   * });
   * count.set(1); // 触发 effect
   *
   * const eq = (prev, next) => prev === next;
   * const s = signal(0, { equals: eq });
   * s.set(0); // 不触发，因为 equals 返回 true（相等）
   * s.set(2); // 触发订阅者
   * ```
   */

  const hooks = {
    isProxy,
    isReactive,
    isReadonly,
    isRef,
    propsReactive,
    reactive,
    readonly,
    ref,
    customRef,
    shallowReactive,
    shallowReadonly,
    toRaw,
    unref,
  }

  return {
    hooks,
    facade: {
      computed,
      customRef,
      createComputed,
      createReactive,
      isReadonly: facadeIsReadonly,
      isRef,
      propsReactive: facadePropsReactive,
      reactive: facadeReactive,
      readonly: facadeReadonly,
      shallowRef,
      shallowReadonly: facadeShallowReadonly,
      toRef,
      toRefs,
      triggerRef,
    },
  }
}
