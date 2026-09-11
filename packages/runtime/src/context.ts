/*
Context 运行时架构
- Provider 的真实上下文边界不是 JSX 调用点，而是运行时里“当前正在渲染的 owner”。
- createContext 会拆成两层：外层 ProviderImpl 只负责捕获 value；内层 ProviderBoundary 在真正的 currentInstance 上挂 store。
- useContext 查找祖先时优先走 runtime owner 链（owner parent / linked instance），只有缺失时才回退到 props 上的 parent-instance 兼容字段。
- 共享 client runtime 的 replay 逻辑必须把 Provider 的 value 和 parent-instance 当成“按引用保留”的结构；一旦深拷贝，就会把 ref / action / owner 链复制坏，既可能让交互失活，也会把示例页切换拖进慢路径。
*/

import { getCurrentInstance } from './reactivity'
import {
  effect,
  getCurrentOwner,
  getOwnerParent,
  getOwnerValue,
  signal,
  setOwnerValue,
} from './reactive-core'
import { _$compiledBranch } from './compiled-component'
import type { CompiledRootHandle } from './compiled-root'
import { invokeCompiledComponent } from './compiled-runtime-bridge'
import type { ComponentProps } from './runtime-types'

const RUE_PORTABLE_COMPONENT_TYPE_KEY = '__rue_component_type'
const RUE_REPEATABLE_MOUNT_FACTORY_KEY = '__rue_repeatable_mount_factory__'
const RUE_COMPILED_COMPONENT_FACTORY_KEY = '__rue_compiled_component_factory__'

const RUE_CONTEXT_VALUE_STORE_PROP = '__rue_context_value_store__'
const RUE_CONTEXT_LINKED_INSTANCE_PROP = '__rue_context_linked_instance__'
const RUE_CONTEXT_OWNER_PARENT_PROP = '__rue_context_owner_parent__'
const RUE_CONTEXT_EXPLICIT_OWNER_PARENT_PROP = '__rue_context_explicit_owner_parent__'
const RUE_CONTEXT_PARENT_INSTANCE_PROP = '__rue_context_parent_instance__'
const RUE_CONTEXT_PRESERVE_PARENT_INSTANCE_PROP = '__rue_context_preserve_parent_instance__'
const RUE_CONTEXT_PROVIDER_MARKER = '__rue_context_provider__'
const RUE_CONTEXT_PROVIDER_CONTEXT_PROP = '__rue_context_provider_context__'
const RUE_CONTEXT_PROVIDER_PROPS_MARKER = '__rue_context_provider_props__'
const RUE_PORTABLE_PROPS_PROP = 'props'
const TEXT_CONTEXT_VALUE_STACK_KEY = Symbol.for('text.contextValueStack')
const COMPILED_CONTEXT_STORE_KEY = Symbol('rue.compiledContextStore')
const COMPILED_CONTEXT_VALUE_READER = Symbol('rue.compiledContextValueReader')

type CompiledContextValue<T> = {
  [COMPILED_CONTEXT_VALUE_READER]: () => T
  set(value: T): void
}

type ContextualComponent = (props: Record<string, unknown>) => unknown

type PortableComponentHandle = {
  [RUE_PORTABLE_COMPONENT_TYPE_KEY]?: string | ContextualComponent
  [RUE_PORTABLE_PROPS_PROP]?: Record<string, unknown> | null
  [RUE_REPEATABLE_MOUNT_FACTORY_KEY]?: () => unknown
}

type ContextCarrier = {
  propsRO?: Record<string, unknown> | null
  [RUE_CONTEXT_VALUE_STORE_PROP]?: Map<RueContext<unknown>, unknown>
  [RUE_CONTEXT_LINKED_INSTANCE_PROP]?: unknown
  [RUE_CONTEXT_OWNER_PARENT_PROP]?: unknown
  [RUE_CONTEXT_EXPLICIT_OWNER_PARENT_PROP]?: unknown
  [RUE_CONTEXT_PARENT_INSTANCE_PROP]?: unknown
  [RUE_CONTEXT_PRESERVE_PARENT_INSTANCE_PROP]?: boolean
  [RUE_CONTEXT_PROVIDER_PROPS_MARKER]?: boolean
}

type ContextProviderComponent = ContextualComponent & {
  [RUE_CONTEXT_PROVIDER_MARKER]?: boolean
  [RUE_CONTEXT_PROVIDER_CONTEXT_PROP]?: RueContext<unknown>
}

export interface ContextProviderProps<T> {
  /** 向后代提供的 context 值，允许是 ref、函数或任意对象引用。 */
  value: T
  /** Provider 包裹的子节点。 */
  children?: ComponentProps['children']
}

/** createContext 返回的上下文对象。 */
export interface RueContext<T> {
  /** Provider 组件，用于在组件树中写入当前 context 值。 */
  Provider: (props: ContextProviderProps<T>) => unknown
  /** 没有祖先 Provider 时 useContext 返回的默认值。 */
  defaultValue: T
}

const isContextProviderComponent = (
  type: string | ContextualComponent,
): type is ContextProviderComponent => {
  return (
    typeof type === 'function' &&
    (type as ContextProviderComponent)[RUE_CONTEXT_PROVIDER_MARKER] === true
  )
}

const resolveProviderChildren = (children: unknown) => {
  if (!Array.isArray(children)) {
    return children ?? null
  }

  if (children.length === 0) {
    return null
  }

  if (children.length === 1) {
    return children[0]
  }

  throw new Error('[rue] context children must be compiled to a closed fragment block')
}

const isObjectLike = (value: unknown): value is Record<string, unknown> =>
  (typeof value === 'object' || typeof value === 'function') && value != null

const readStoredContextValue = <T>(value: unknown): T => {
  if (
    isObjectLike(value) &&
    COMPILED_CONTEXT_VALUE_READER in value &&
    typeof (value as CompiledContextValue<T>)[COMPILED_CONTEXT_VALUE_READER] === 'function'
  ) {
    return (value as CompiledContextValue<T>)[COMPILED_CONTEXT_VALUE_READER]()
  }
  return value as T
}

const asContextCarrier = (value: unknown): ContextCarrier | null => {
  if (!isObjectLike(value)) return null
  return value as ContextCarrier
}

const isCustomElementTag = (value: unknown) => typeof value === 'string' && value.includes('-')

const readTextContextValue = <T>(
  context: RueContext<T>,
): { found: true; value: T } | { found: false } => {
  const stack = (globalThis as { [TEXT_CONTEXT_VALUE_STACK_KEY]?: unknown })[
    TEXT_CONTEXT_VALUE_STACK_KEY
  ]
  if (!Array.isArray(stack)) return { found: false }

  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const scope = stack[i]
    if (scope instanceof Map && scope.has(context)) {
      return { found: true, value: scope.get(context) as T }
    }
  }
  return { found: false }
}

const getParentContextPropDescriptor = (value: unknown) => {
  const carrier = asContextCarrier(value)
  if (!carrier) {
    return null
  }

  return Object.getOwnPropertyDescriptor(carrier, RUE_CONTEXT_PARENT_INSTANCE_PROP) ?? null
}

const markContextProviderProps = <T extends Record<string, unknown>>(target: T): T => {
  Object.defineProperty(target, RUE_CONTEXT_PROVIDER_PROPS_MARKER, {
    configurable: true,
    enumerable: false,
    value: true,
    writable: false,
  })

  return target
}

/** 判断 props 对象是否来自 Rue context Provider。 */
export const isContextProviderProps = (value: unknown): boolean => {
  const carrier = asContextCarrier(value)
  return carrier?.[RUE_CONTEXT_PROVIDER_PROPS_MARKER] === true
}

/** 复制 Provider props 的隐藏 marker，避免 replay 时深拷贝 Provider value。 */
export const copyContextProviderPropsMarker = <T extends Record<string, unknown>>(
  source: unknown,
  target: T,
): T => {
  if (isContextProviderProps(source)) {
    markContextProviderProps(target)
  }

  return target
}

/** 复制隐藏的父 context owner 指针。 */
export const copyParentContextProp = <T extends Record<string, unknown>>(
  source: unknown,
  target: T,
): T => {
  const descriptor = getParentContextPropDescriptor(source)
  if (!descriptor) {
    return target
  }

  Object.defineProperty(target, RUE_CONTEXT_PARENT_INSTANCE_PROP, descriptor)
  return target
}

/** 标记 props 中已有的 parent context 指针应跨 Custom Element root 保留。 */
export const preserveParentContextProps = <T extends Record<string, unknown>>(props: T): T => {
  const carrier = asContextCarrier(props)
  if (!carrier || carrier[RUE_CONTEXT_PARENT_INSTANCE_PROP] == null) {
    return props
  }

  carrier[RUE_CONTEXT_PRESERVE_PARENT_INSTANCE_PROP] = true
  return props
}

/** Link a compiled owner to context carried across an independently mounted custom-element root. */
export const linkCurrentOwnerToParentContextProps = (props: Record<string, unknown>): void => {
  const owner = asContextCarrier(getCurrentOwner())
  const parent = props[RUE_CONTEXT_PARENT_INSTANCE_PROP]
  if (!owner || !isObjectLike(parent) || parent === owner) return
  owner[RUE_CONTEXT_OWNER_PARENT_PROP] = parent
  owner[RUE_CONTEXT_EXPLICIT_OWNER_PARENT_PROP] = parent
}

const getContextValueStore = (instance: unknown, createIfMissing = false) => {
  const carrier = asContextCarrier(instance)
  if (!carrier) return null

  const existing = carrier[RUE_CONTEXT_VALUE_STORE_PROP]
  if (existing instanceof Map) {
    return existing
  }

  // JS wrapper owner 和底层 runtime owner 可能是两层对象；它们需要共享同一份 context store，
  // 否则 Provider 写进 wrapper 后，Consumer 从 linked runtime owner 往上爬时会读不到值。
  const linkedCarrier = asContextCarrier(carrier[RUE_CONTEXT_LINKED_INSTANCE_PROP])
  const linkedStore = linkedCarrier?.[RUE_CONTEXT_VALUE_STORE_PROP]
  if (linkedStore instanceof Map) {
    carrier[RUE_CONTEXT_VALUE_STORE_PROP] = linkedStore
    return linkedStore
  }

  if (!createIfMissing) {
    return null
  }

  const nextStore = new Map<RueContext<unknown>, unknown>()
  carrier[RUE_CONTEXT_VALUE_STORE_PROP] = nextStore
  if (linkedCarrier) {
    linkedCarrier[RUE_CONTEXT_VALUE_STORE_PROP] = nextStore
  }
  return nextStore
}

const getParentContextCandidates = (instance: unknown) => {
  const carrier = asContextCarrier(instance)
  const candidates: unknown[] = []
  const pushCandidate = (candidate: unknown) => {
    if (candidate == null || candidate === instance || candidates.includes(candidate)) {
      return
    }
    candidates.push(candidate)
  }

  // 祖先优先级：
  // 1. 内部 runtime bridge 维护的 owner parent；
  // 2. JSX / repeatable handle 透传下来的 parent-instance；
  // 3. propsRO 上的兼容字段，给老路径和 portable handle 回放兜底。
  // 这里显式避开 self-loop，防止 bridge 或兼容 props 把自己再次指回自己。
  pushCandidate(carrier?.[RUE_CONTEXT_OWNER_PARENT_PROP])
  pushCandidate(carrier?.[RUE_CONTEXT_PARENT_INSTANCE_PROP])
  const props = carrier?.propsRO
  if (props && typeof props === 'object') {
    pushCandidate(props[RUE_CONTEXT_OWNER_PARENT_PROP])
    pushCandidate(props[RUE_CONTEXT_PARENT_INSTANCE_PROP])
  }
  return candidates
}

/** 为组件 props 附加当前 owner 指针，让子组件可沿运行时链路查找 context。 */
export const withParentContextProps = <T extends Record<string, unknown> | null>(
  type: string | ContextualComponent,
  props: T,
): T => {
  if (typeof type !== 'function' && !isCustomElementTag(type)) {
    return props
  }

  if (getCurrentOwner() !== undefined) {
    if (props && isContextProviderComponent(type)) markContextProviderProps(props)
    return props
  }

  const parentInstance = getCurrentInstance()
  if (!parentInstance) {
    return props
  }

  if (props && props[RUE_CONTEXT_PARENT_INSTANCE_PROP] === parentInstance) {
    if (isContextProviderComponent(type)) {
      markContextProviderProps(props)
    }
    return props
  }

  if (
    props &&
    props[RUE_CONTEXT_PRESERVE_PARENT_INSTANCE_PROP] === true &&
    props[RUE_CONTEXT_PARENT_INSTANCE_PROP] != null
  ) {
    if (isContextProviderComponent(type)) {
      markContextProviderProps(props)
    }
    return props
  }

  // 对普通组件，这里只是把“从哪个 owner 往上找 context”随 props 带下去。
  // 对 Provider，还要额外打 marker，告诉 replay 逻辑：这个 props 对象里包含 context value，
  // 后续复制 props 时可以复制壳，但不能递归深拷贝 value 本身。
  const nextProps = {
    ...props,
    [RUE_CONTEXT_PARENT_INSTANCE_PROP]: parentInstance,
  } as Record<string, unknown>

  if (isContextProviderComponent(type)) {
    markContextProviderProps(nextProps)
  }

  return nextProps as T
}

const refreshPortableComponentHandleReplayFactory = (handle: PortableComponentHandle) => {
  Object.defineProperty(handle, RUE_REPEATABLE_MOUNT_FACTORY_KEY, {
    configurable: true,
    enumerable: false,
    value: () => {
      const clone = Object.assign(
        Object.create(Object.getPrototypeOf(handle) ?? Object.prototype),
        handle,
      ) as PortableComponentHandle
      refreshPortableComponentHandleReplayFactory(clone)
      return clone
    },
    writable: true,
  })

  return handle
}

const bindProviderChildrenToCurrentInstance = (
  children: unknown,
  explicitContextParent?: unknown,
): unknown => {
  if (Array.isArray(children)) {
    children.forEach(child => {
      bindProviderChildrenToCurrentInstance(child, explicitContextParent)
    })
    return children
  }

  const compiledHandle = asContextCarrier(children) as
    | (ContextCarrier & { __rue_compiled_link_context_parent?: (parent: object) => void })
    | null
  const contextParent = explicitContextParent ?? getCurrentOwner() ?? getCurrentInstance()
  if (
    compiledHandle &&
    typeof compiledHandle.__rue_compiled_link_context_parent === 'function' &&
    isObjectLike(contextParent)
  ) {
    compiledHandle.__rue_compiled_link_context_parent(contextParent)
    return children
  }

  // ProviderBoundary 自己才是最终写入 context store 的 owner。
  // 但它返回的 children 可能是提前构造好的 portable component handle，handle 里仍然记着“外层调用者”的 parent-instance。
  // 如果不在这里把这些顶层 handle 重新绑到当前 boundary owner，上下文查找会从错误的祖先开始，嵌套 Consumer 就会越过当前 Provider。
  const handle = asContextCarrier(children) as PortableComponentHandle | null
  if (!handle || !(RUE_PORTABLE_COMPONENT_TYPE_KEY in handle)) {
    return children
  }

  const nextProps = withParentContextProps(
    handle[RUE_PORTABLE_COMPONENT_TYPE_KEY] as string | ContextualComponent,
    (handle[RUE_PORTABLE_PROPS_PROP] as Record<string, unknown> | null) ?? null,
  )
  handle[RUE_PORTABLE_PROPS_PROP] = nextProps
  refreshPortableComponentHandleReplayFactory(handle)

  // 多个顶层 children 往往会先折成 fragment handle；直接 DOM 包裹层也会把真正的 consumer 藏在 props.children 里。
  // 这里继续向下递归，确保“Provider 下的第一层可见 children 树”都会重新绑定到当前 boundary owner。
  const nestedChildren = nextProps?.children
  if (nestedChildren !== undefined) {
    bindProviderChildrenToCurrentInstance(nestedChildren, explicitContextParent)
  }

  return children
}

/** 创建可跨组件树传递值的 Rue context。 */
export const createContext = <T>(defaultValue: T): RueContext<T> => {
  const ProviderImpl = (props: ContextProviderProps<T>) => {
    const providerValue = props.value
    const owner = getCurrentOwner()
    if (owner !== undefined) {
      const store =
        getOwnerValue<Map<RueContext<unknown>, unknown>>(owner, COMPILED_CONTEXT_STORE_KEY) ??
        new Map<RueContext<unknown>, unknown>()
      const existing = store.get(context as RueContext<unknown>)
      if (
        isObjectLike(existing) &&
        COMPILED_CONTEXT_VALUE_READER in existing &&
        typeof (existing as CompiledContextValue<T>).set === 'function'
      ) {
        ;(existing as CompiledContextValue<T>).set(providerValue)
      } else {
        const currentValue = signal(providerValue)
        const entry: CompiledContextValue<T> = {
          [COMPILED_CONTEXT_VALUE_READER]: () => currentValue.get(),
          set: value => currentValue.set(value),
        }
        store.set(context as RueContext<unknown>, entry)
        effect(() => entry.set(props.value))
      }
      setOwnerValue(owner, COMPILED_CONTEXT_STORE_KEY, store)
      const initialChildren = props.children
      bindProviderChildrenToCurrentInstance(initialChildren, owner)
      const initialResolved = resolveProviderChildren(initialChildren)
      const initialFactory =
        initialResolved != null && typeof initialResolved === 'object'
          ? (initialResolved as Record<string, unknown>)[RUE_COMPILED_COMPONENT_FACTORY_KEY]
          : undefined
      if (typeof initialFactory !== 'string' || !initialFactory.includes('-')) {
        return initialResolved
      }
      return _$compiledBranch(() => {
        const children = props.children
        bindProviderChildrenToCurrentInstance(children, owner)
        const resolved = resolveProviderChildren(children)
        return {
          __rue_compiled_branch_key: resolved,
          create: () => {
            if (
              resolved != null &&
              typeof resolved === 'object' &&
              typeof (resolved as CompiledRootHandle).__rue_compiled_mount === 'function'
            ) {
              const handle = resolved as CompiledRootHandle
              return handle
            }
            throw new Error('[rue] context children must be compiled to a closed block')
          },
        }
      })
    }

    // 外层 ProviderImpl 只保留 value 的闭包引用。
    // 真正的 store 写入推迟到内层 boundary 执行时完成，这样 store 一定挂在“当前这次 render 的 owner”上，
    // 而不是挂在更早的 JSX 调用点或被 replay 过的 props 壳对象上。
    const ProviderBoundary = (boundaryProps: { children?: ComponentProps['children'] }) => {
      const instance = getCurrentInstance()
      const store = getContextValueStore(instance, true)
      store?.set(context as RueContext<unknown>, providerValue)
      bindProviderChildrenToCurrentInstance(boundaryProps.children)
      return resolveProviderChildren(boundaryProps.children)
    }

    return invokeCompiledComponent(ProviderBoundary as any, { children: props.children })
  }

  Object.defineProperty(ProviderImpl, RUE_CONTEXT_PROVIDER_MARKER, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  })

  const context = {
    defaultValue,
    Provider: ProviderImpl,
  } as RueContext<T>

  Object.defineProperty(ProviderImpl, RUE_CONTEXT_PROVIDER_CONTEXT_PROP, {
    configurable: false,
    enumerable: false,
    value: context,
    writable: false,
  })

  return context
}

/** 从当前组件 owner 向上查找 context 值，未命中时返回默认值。 */
export const useContext = <T>(context: RueContext<T>): T => {
  const textProvided = readTextContextValue(context)
  if (textProvided.found) {
    return textProvided.value
  }

  let owner = getCurrentOwner()
  const visitedOwners = new Set<unknown>()
  while (owner !== undefined && !visitedOwners.has(owner)) {
    visitedOwners.add(owner)
    const store = getOwnerValue<Map<RueContext<unknown>, unknown>>(
      owner,
      COMPILED_CONTEXT_STORE_KEY,
    )
    if (store?.has(context as RueContext<unknown>)) {
      return readStoredContextValue<T>(store.get(context as RueContext<unknown>))
    }
    owner = getOwnerParent(owner)
  }

  const pendingInstances: unknown[] = [getCurrentInstance()]
  const visited = new Set<unknown>()

  // owner parent / parent-instance 是运行时链路，理论上不应成环；
  // 但这里仍保留 visited 保护，避免 bridge 或兼容 props 出错时把 useContext 卡死在循环里。
  while (pendingInstances.length > 0) {
    const currentInstance = pendingInstances.pop()
    if (!currentInstance || visited.has(currentInstance)) {
      continue
    }
    visited.add(currentInstance)
    const store = getContextValueStore(currentInstance)

    if (store?.has(context as RueContext<unknown>)) {
      return readStoredContextValue<T>(store.get(context as RueContext<unknown>))
    }

    const parents = getParentContextCandidates(currentInstance)
    for (let i = parents.length - 1; i >= 0; i -= 1) {
      pendingInstances.push(parents[i])
    }
  }

  return context.defaultValue
}
