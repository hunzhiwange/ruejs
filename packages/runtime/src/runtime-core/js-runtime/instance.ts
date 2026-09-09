import type {
  ComponentHookCarrier,
  ComponentHookHost,
  ComponentInstance,
  ComponentInstanceManager,
  ComponentMountInput,
  ComponentProps,
  ObjectLike,
  RuntimeState,
  StableComponentProps,
} from './types.js'
import { createHookContext, resolveHookCarrier } from '../js-reactive/hooks/context.js'

import { shallowEqualProp } from '../js-reactive/hooks/values.js'

/*
组件实例管理器维护稳定 props、Hook 宿主、父子关系与副作用域，
并在渲染期间切换当前实例上下文。
*/

const CONTEXT_OWNER_PARENT_KEY = '__rue_context_owner_parent__'
const CONTEXT_PARENT_INSTANCE_KEY = '__rue_context_parent_instance__'
const CONTEXT_PROP_KEYS = new Set([CONTEXT_OWNER_PARENT_KEY, CONTEXT_PARENT_INSTANCE_KEY])

const isObjectLike = (value: unknown): value is ObjectLike =>
  (typeof value === 'object' || typeof value === 'function') && value != null

const runWithOwningRuntime = <T>(runtime: unknown, run: () => T): T => {
  if (!isObjectLike(runtime)) return run()

  const runtimeGlobal = globalThis as typeof globalThis & { __rue_active?: unknown }
  const hadActiveRuntime = Object.prototype.hasOwnProperty.call(runtimeGlobal, '__rue_active')
  const previousRuntime = runtimeGlobal.__rue_active
  runtimeGlobal.__rue_active = runtime
  try {
    return run()
  } finally {
    if (hadActiveRuntime) runtimeGlobal.__rue_active = previousRuntime
    else delete runtimeGlobal.__rue_active
  }
}

const copyProps = <HostNode>(input: ComponentMountInput<HostNode>): ComponentProps => ({
  ...input.props,
})

const syncProps = (target: StableComponentProps, next: ComponentProps): void => {
  const signal = isObjectLike(target) ? target.__signal__ : undefined
  if (typeof signal?.peekPath === 'function' && typeof signal?.setPath === 'function') {
    const hasRemovedUserProp = Object.keys(target).some(
      key => !CONTEXT_PROP_KEYS.has(key) && !Object.prototype.hasOwnProperty.call(next, key),
    )
    if (hasRemovedUserProp) {
      const replacement = { ...next }
      for (const key of CONTEXT_PROP_KEYS) {
        const contextValue = signal.peekPath([key])
        if (contextValue !== undefined) replacement[key] = contextValue
      }
      signal.setPath([], replacement)
      return
    }
    for (const key of Object.keys(next)) {
      const previous = signal.peekPath([key])
      if (!shallowEqualProp(previous, next[key])) signal.setPath([key], next[key])
    }
    return
  }
  for (const key of Object.keys(target)) {
    if (!Object.prototype.hasOwnProperty.call(next, key)) delete target[key]
  }
  for (const key of Object.keys(next)) target[key] = next[key]
}

/** Owns component identity, stable props proxies, and facade-local Hook hosts. */
export const createComponentInstanceManager = <HostNode = unknown>(
  injectedReactive: unknown,
): ComponentInstanceManager<HostNode> => {
  const carrier = (resolveHookCarrier(injectedReactive) ??
    createHookContext()) as ComponentHookCarrier
  const instances = new Map<number, ComponentInstance<ComponentProps, HostNode>>()
  const instancesByHost = new WeakMap<
    ComponentHookHost,
    ComponentInstance<ComponentProps, HostNode>
  >()
  let nextIndex = 0
  let state: RuntimeState<HostNode> | undefined

  const create = (
    input: ComponentMountInput<HostNode>,
  ): ComponentInstance<ComponentProps, HostNode> => {
    const propsSource = copyProps(input)
    const propsRO = propsSource
    const host: ComponentHookHost = {
      __ci_index: nextIndex,
      __hooks: { states: [], index: 0 },
      propsRO,
    }
    const instance: ComponentInstance<ComponentProps, HostNode> = {
      carrier,
      host,
      index: nextIndex,
      input,
      isMounted: false,
      hookScopeDisposed: false,
      propsRO,
      propsSource,
      parentOwner: undefined,
      type: input.type.component,
    }
    nextIndex += 1
    instances.set(instance.index, instance)
    instancesByHost.set(host, instance)
    return instance
  }

  const prepare = (
    instance: ComponentInstance<ComponentProps, HostNode>,
    input: ComponentMountInput<HostNode>,
  ): ComponentInstance<ComponentProps, HostNode> => {
    instance.input = input
    syncProps(instance.propsRO, copyProps(input))
    instance.host.propsRO = instance.propsRO
    const propsParent =
      instance.propsRO?.[CONTEXT_OWNER_PARENT_KEY] ??
      instance.propsRO?.[CONTEXT_PARENT_INSTANCE_KEY]
    const parent = carrier.getCurrentInstance() ?? propsParent ?? instance.parentOwner
    if (isObjectLike(parent) && parent !== instance.host) {
      instance.parentOwner = parent
      instance.host[CONTEXT_OWNER_PARENT_KEY] = parent
      instance.host[CONTEXT_PARENT_INSTANCE_KEY] = parent
    }
    return instance
  }

  const render = <T>(
    instance: ComponentInstance<ComponentProps, HostNode>,
    input: ComponentMountInput<HostNode>,
    run: (props: StableComponentProps) => T,
  ): T | undefined => {
    prepare(instance, input)
    const bridge = globalThis.__rue_compiled_runtime_bridge
    bridge?.beginComponentRender?.(instance.host)
    if (isObjectLike(instance.parentOwner) && instance.parentOwner !== instance.host) {
      instance.host[CONTEXT_OWNER_PARENT_KEY] = instance.parentOwner
      instance.host[CONTEXT_PARENT_INSTANCE_KEY] = instance.parentOwner
    }
    try {
      return runWithOwningRuntime(state?.runtime, () =>
        carrier.renderHooks(instance.host, () => run(instance.propsRO)),
      )
    } catch (error) {
      if (state?.errors?.isPropagating(error)) throw error
      const captured = state?.errors?.capture(error, instance.host, 'component render') === true
      if (captured) return undefined
      state?.errors?.markPropagating(error)
      return state?.runtime?.__rueHandleComponentError?.(error, instance.host, 'component render')
    } finally {
      const endComponentRender = bridge?.endComponentRender
      if (typeof endComponentRender === 'function') Reflect.apply(endComponentRender, bridge, [])
    }
  }

  const disposeScope = (
    instance: ComponentInstance<ComponentProps, HostNode> | undefined,
  ): boolean => {
    if (!instance || instance.hookScopeDisposed) return false
    instance.hookScopeDisposed = true
    const disposeHooks = carrier.__rueDisposeHookScopeForInstance
    if (typeof disposeHooks === 'function') disposeHooks.call(carrier, instance.host)
    return true
  }

  const release = (instance: ComponentInstance<ComponentProps, HostNode> | undefined): boolean => {
    if (!instance || !instances.delete(instance.index)) return false
    instance.isMounted = false
    instancesByHost.delete(instance.host)
    return true
  }

  const dispose = (instance: ComponentInstance<ComponentProps, HostNode> | undefined): boolean => {
    disposeScope(instance)
    return release(instance)
  }

  const withCurrent = <T>(
    instance: ComponentInstance<ComponentProps, HostNode>,
    run: () => T,
  ): T => {
    if (typeof carrier.withCurrentInstance === 'function') {
      return carrier.withCurrentInstance(instance.host, run)
    }
    const previous = carrier.getCurrentInstance()
    carrier.setCurrentInstance(instance.host)
    try {
      return run()
    } finally {
      carrier.setCurrentInstance(previous)
    }
  }

  const free = () => {
    for (const instance of Array.from(instances.values()).reverse()) dispose(instance)
  }

  return {
    count: () => instances.size,
    current: () => {
      const currentHost = carrier.getCurrentInstance()
      return isObjectLike(currentHost)
        ? instancesByHost.get(currentHost as ComponentHookHost)
        : undefined
    },
    create,
    dispose,
    disposeScope,
    free,
    has: instance => instances.get(instance?.index ?? -1) === instance,
    release,
    render,
    setState(nextState: RuntimeState<HostNode>) {
      state = nextState
    },
    update(instance, input) {
      prepare(instance, input)
    },
    withCurrent,
    wrapperCount: () => instances.size,
  }
}
