import {
  PORTABLE_MOUNT_METADATA_KEYS as SHARED_PORTABLE_MOUNT_METADATA_KEYS,
  RUE_CLEANUP_BUCKET_KEY,
  RUE_EFFECT_SCOPE_ID_KEY,
  RUE_KEEP_ALIVE_HOOK_TARGET_KEY,
  RUE_MOUNT_ID_KEY,
  RUE_PORTABLE_COMPONENT_ID_KEY,
  RUE_PORTABLE_COMPONENT_TYPE_KEY,
  RUE_PORTABLE_VAPOR_SETUP_KEY,
  RUE_REPEATABLE_MOUNT_FACTORY_KEY,
} from './runtime-core/protocol'
import {
  CUSTOM_ELEMENT_EMIT_BRIDGE_KEY,
  type CustomElementEmitBridge,
} from './custom-elements.shared'
import { copyContextProviderPropsMarker, isContextProviderProps } from './context'
import { copyBuiltinComponentMarker } from './components/builtinMarkers'
import { isRueIslandDescriptor, isRueServerIslandDescriptor } from './island-protocol'
import { patchDOMProps } from './dom/props'
import type {
  ComponentInstance,
  ComponentProps,
  OwnedMountContinuation,
  OwnedMountProtocol,
  PropsWithChildren,
  RenderOutput,
  RuntimeHandle,
} from './runtime-types'

type OwnedMountContinuationContext = { protocol: OwnedMountProtocol; token: unknown }
const OWNED_MOUNT_CONTINUATION_STACK_KEY = Symbol.for('rue.owned-mount-continuation-stack')

const getOwnedMountContinuationStack = () => {
  const record = globalThis as typeof globalThis & {
    [OWNED_MOUNT_CONTINUATION_STACK_KEY]?: OwnedMountContinuationContext[]
  }
  return (record[OWNED_MOUNT_CONTINUATION_STACK_KEY] ??= [])
}

const runInOwnedMountContinuationContext = <T>(
  context: OwnedMountContinuationContext,
  run: () => T,
): T => {
  const stack = getOwnedMountContinuationStack()
  stack.push(context)
  try {
    return run()
  } finally {
    const index = stack.lastIndexOf(context)
    if (index >= 0) stack.splice(index, 1)
  }
}

export const withOwnedMountContinuationContext = <T>(
  protocol: OwnedMountProtocol,
  token: unknown,
  run: () => T,
): T => runInOwnedMountContinuationContext({ protocol, token }, run)

/** 捕获当前行 owner token，供 Promise/microtask 在提交前校验 generation。 */
export const captureOwnedMountContinuation = (): OwnedMountContinuation | undefined => {
  const stack = getOwnedMountContinuationStack()
  const context = stack[stack.length - 1]
  if (!context) return undefined
  const { protocol, token } = context

  return {
    run(run) {
      if (
        getOwnedMountContinuationStack().some(
          current => current.protocol === protocol && current.token === token,
        )
      ) {
        run()
        return true
      }
      if (!protocol.updateOwnedMount(token)) return false
      try {
        runInOwnedMountContinuationContext(context, run)
        if (!protocol.commitMounted(token)) {
          throw new Error('[rue] async owned mount commit rejected a stale token')
        }
        return true
      } catch (error) {
        protocol.abortOwnedMount(token)
        throw error
      }
    },
  }
}

export const resolveOwnedMountProtocol = (
  getRuntime: () => unknown,
): OwnedMountProtocol | undefined => {
  const runtime = getRuntime() as Partial<OwnedMountProtocol>
  if (
    typeof runtime.buildOwnedMount !== 'function' ||
    typeof runtime.commitMounted !== 'function' ||
    typeof runtime.flushMounted !== 'function' ||
    typeof runtime.updateOwnedMount !== 'function' ||
    typeof runtime.disposeOwnedMount !== 'function' ||
    typeof runtime.abortOwnedMount !== 'function'
  ) {
    return undefined
  }
  return runtime as OwnedMountProtocol
}

export const RUE_FORCE_REMOUNT_ANCHOR_KEY = '__rue_force_remount_anchor'
export const RUE_COMPONENT_CHILDREN_KEY = '__rue_component_children'

type MountReplayCoreOptions = {
  isRef(value: unknown): boolean
  replayMountHandle(value: RuntimeHandle): unknown
  resolveKeepAliveHookTargetComponent<P>(
    componentType: ComponentInstance<P> & Record<string, unknown>,
    target: unknown,
  ): ComponentInstance<P> & Record<string, unknown>
}

export const createMountReplayCore = (options: MountReplayCoreOptions) => {
  const isMountHandle = (value: unknown): value is RuntimeHandle =>
    !!value &&
    typeof value === 'object' &&
    (RUE_MOUNT_ID_KEY in (value as Record<string, unknown>) ||
      RUE_PORTABLE_COMPONENT_TYPE_KEY in (value as Record<string, unknown>) ||
      RUE_PORTABLE_VAPOR_SETUP_KEY in (value as Record<string, unknown>))

  const readPortableComponentType = (value: unknown): unknown =>
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)[RUE_PORTABLE_COMPONENT_TYPE_KEY]
      : undefined

  const readPortableComponentProps = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== 'object') return null
    const props = (value as Record<string, unknown>).props
    return props && typeof props === 'object' ? (props as Record<string, unknown>) : null
  }

  const areShallowEqualProps = (
    left: Record<string, unknown> | null,
    right: Record<string, unknown> | null,
  ) => {
    if (left === right) return true
    if (!left || !right) return !left && !right
    const leftKeys = Object.keys(left).filter(key => key !== '__rue_context_parent_instance__')
    const rightKeys = Object.keys(right).filter(key => key !== '__rue_context_parent_instance__')
    if (leftKeys.length !== rightKeys.length) return false
    return leftKeys.every(
      key => Object.prototype.hasOwnProperty.call(right, key) && Object.is(left[key], right[key]),
    )
  }

  const areEquivalentPortableComponentHandles = (left: unknown, right: unknown) =>
    readPortableComponentType(left) === readPortableComponentType(right) &&
    areShallowEqualProps(readPortableComponentProps(left), readPortableComponentProps(right))

  const attachRepeatableMountFactory = <T>(value: T, factory: () => unknown): T => {
    if (isMountHandle(value)) {
      Object.defineProperty(value, RUE_REPEATABLE_MOUNT_FACTORY_KEY, {
        value: factory,
        enumerable: false,
        configurable: true,
      })
    }
    return value
  }

  const portableMountMetadataKeys = [
    ...SHARED_PORTABLE_MOUNT_METADATA_KEYS,
    RUE_FORCE_REMOUNT_ANCHOR_KEY,
    RUE_COMPONENT_CHILDREN_KEY,
  ] as const

  const copyPortableMountHandleMetadata = <T>(source: unknown, target: T): T => {
    if (!source || typeof source !== 'object' || !target || typeof target !== 'object')
      return target

    const sourceRecord = source as Record<string, unknown>
    const targetRecord = target as Record<string, unknown>
    portableMountMetadataKeys.forEach(key => {
      if (!(key in sourceRecord)) return
      if (key === RUE_CLEANUP_BUCKET_KEY) {
        const sourceBucket = sourceRecord[key]
        const targetBucket = targetRecord[key]
        if (Array.isArray(sourceBucket) && Array.isArray(targetBucket)) {
          sourceBucket.forEach(cleanup => {
            if (!targetBucket.includes(cleanup)) targetBucket.push(cleanup)
          })
          return
        }
        if (!(key in targetRecord)) targetRecord[key] = sourceBucket
        return
      }
      if (key === RUE_EFFECT_SCOPE_ID_KEY && key in targetRecord) return
      targetRecord[key] = sourceRecord[key]
    })
    const hookTarget = sourceRecord[RUE_KEEP_ALIVE_HOOK_TARGET_KEY]
    const componentType = targetRecord[RUE_PORTABLE_COMPONENT_TYPE_KEY]
    if (typeof componentType === 'function') {
      targetRecord[RUE_PORTABLE_COMPONENT_TYPE_KEY] = options.resolveKeepAliveHookTargetComponent(
        componentType as ComponentInstance & Record<string, unknown>,
        hookTarget,
      )
    }
    return target
  }

  const replayMountAwareValue = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      let changed = false
      const nextValue = value.map(item => {
        const replayed = replayMountAwareValue(item)
        if (replayed !== item) changed = true
        return replayed
      })
      return changed ? nextValue : value
    }
    if (options.isRef(value)) return value
    if (isRueIslandDescriptor(value) || isRueServerIslandDescriptor(value)) return value
    if (isMountHandle(value)) return options.replayMountHandle(value)
    return value
  }

  const replayMountAwareProps = (value: ComponentProps | null): ComponentProps | null => {
    if (!value || typeof value !== 'object') return value
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) return value

    let changed = false
    const shouldKeepValueProp = isContextProviderProps(value)
    const nextEntries = Object.entries(value).map(([key, entryValue]) => {
      const replayed =
        (shouldKeepValueProp && key === 'value') || key === '__rue_context_parent_instance__'
          ? entryValue
          : key === 'children' || isMountHandle(entryValue)
            ? replayMountAwareValue(entryValue)
            : entryValue
      if (replayed !== entryValue) changed = true
      return [key, replayed] as const
    })
    if (!changed) return value

    const clone = Object.create(prototype) as Record<string, unknown>
    nextEntries.forEach(([key, entryValue]) => {
      clone[key] = entryValue
    })
    copyContextProviderPropsMarker(value, clone)
    return clone
  }

  return {
    areEquivalentPortableComponentHandles,
    attachRepeatableMountFactory,
    copyPortableMountHandleMetadata,
    isMountHandle,
    readPortableComponentProps,
    replayMountAwareProps,
    replayMountAwareValue,
  }
}

type ComponentAdapterCoreOptions = {
  captureComponentRenderError?(error: unknown, props: ComponentProps): boolean
  createFragmentHandle(children: unknown[]): RenderOutput
  getClientReferenceResolver(): unknown
  getKeepAliveHookTarget(): unknown
  setKeepAliveHookTarget(value: unknown): void
  onErrorCaptured(fn: (error: unknown) => boolean): unknown
  prepareComponentProps?(props: ComponentProps): void
  withHookSlot<T>(factory: () => T): T
}

type ClassComponentInstance<P = ComponentProps> = {
  props: Readonly<P>
  state?: unknown
  render: () => RenderOutput
  componentDidCatch?: (error: unknown, errorInfo: { componentStack: string }) => void
}

type ClassComponentType<P = ComponentProps> = {
  new (props: P): ClassComponentInstance<P>
  getDerivedStateFromProps?: (
    props: P,
    state: unknown,
  ) => Record<string, unknown> | null | undefined
  getDerivedStateFromError?: (error: unknown) => Record<string, unknown> | null | undefined
}

type ClassComponentSlot<P> = { instance: ClassComponentInstance<P> }

export const createComponentAdapterCore = (options: ComponentAdapterCoreOptions) => {
  const classComponentAdapterCache = new WeakMap<Function, ComponentInstance<any>>()
  const componentReturnAdapterCache = new WeakMap<Function, ComponentInstance<any>>()
  const keepAliveHookTargetComponentCache = new WeakMap<
    object,
    WeakMap<Function, ComponentInstance<any>>
  >()

  const readKeepAliveHookTarget = (source: unknown): unknown => {
    if ((typeof source !== 'object' && typeof source !== 'function') || source == null) {
      return undefined
    }
    return (source as Record<string, unknown>)[RUE_KEEP_ALIVE_HOOK_TARGET_KEY]
  }

  const setKeepAliveHookTargetMetadata = <T>(value: T, target: unknown): T => {
    if (!target || (typeof value !== 'object' && typeof value !== 'function') || value == null) {
      return value
    }
    try {
      Object.defineProperty(value, RUE_KEEP_ALIVE_HOOK_TARGET_KEY, {
        configurable: true,
        enumerable: false,
        value: target,
        writable: true,
      })
    } catch {
      try {
        ;(value as Record<string, unknown>)[RUE_KEEP_ALIVE_HOOK_TARGET_KEY] = target
      } catch {}
    }
    return value
  }

  const withActiveKeepAliveHookTargetMetadata = <T>(value: T): T =>
    setKeepAliveHookTargetMetadata(value, options.getKeepAliveHookTarget())

  const runWithKeepAliveHookTarget = <T>(target: unknown, fn: () => T): T => {
    if (!target) return fn()
    const previous = options.getKeepAliveHookTarget()
    options.setKeepAliveHookTarget(target)
    try {
      return fn()
    } finally {
      if (options.getKeepAliveHookTarget() === target) options.setKeepAliveHookTarget(previous)
    }
  }

  const resolveKeepAliveHookTargetComponent = <P>(
    componentType: ComponentInstance<P> & Record<string, unknown>,
    target: unknown,
  ) => {
    if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
      return componentType
    }
    let targetCache = keepAliveHookTargetComponentCache.get(target)
    if (!targetCache) {
      targetCache = new WeakMap()
      keepAliveHookTargetComponentCache.set(target, targetCache)
    }
    const cached = targetCache.get(componentType)
    if (cached) return cached as ComponentInstance<P> & Record<string, unknown>

    const wrapped = ((props: PropsWithChildren<P>) =>
      runWithKeepAliveHookTarget(target, () => componentType(props))) as ComponentInstance<P> &
      Record<string, unknown>
    try {
      Object.defineProperty(wrapped, 'name', {
        configurable: true,
        value: (componentType as Function).name,
      })
    } catch {}
    copyBuiltinComponentMarker(componentType, wrapped)
    if (RUE_PORTABLE_COMPONENT_ID_KEY in componentType) {
      try {
        Object.defineProperty(wrapped, RUE_PORTABLE_COMPONENT_ID_KEY, {
          configurable: false,
          enumerable: false,
          value: componentType[RUE_PORTABLE_COMPONENT_ID_KEY],
          writable: false,
        })
      } catch {}
    }
    targetCache.set(componentType, wrapped)
    return wrapped
  }

  const readClientReferenceExport = (
    value: unknown,
  ): { exportName: string; referenceKey: string } | null => {
    if ((typeof value !== 'object' && typeof value !== 'function') || value === null) return null
    const id = (value as { $$id?: unknown }).$$id
    if (typeof id !== 'string') return null
    const separator = id.lastIndexOf('#')
    if (separator <= 0 || separator === id.length - 1) return null
    return { exportName: id.slice(separator + 1), referenceKey: id.slice(0, separator) }
  }

  const resolveClientReferenceComponentType = <P>(
    type: ComponentInstance<P>,
  ): ComponentInstance<P> => {
    const reference = readClientReferenceExport(type)
    if (!reference) return type
    const resolver = options.getClientReferenceResolver()
    if (typeof resolver !== 'function') return type
    const resolved = (resolver as (referenceKey: string, exportName: string) => unknown)(
      reference.referenceKey,
      reference.exportName,
    )
    return typeof resolved === 'function' ? (resolved as ComponentInstance<P>) : type
  }

  const mergeClassComponentState = (
    state: unknown,
    update: Record<string, unknown> | null | undefined,
  ) => {
    if (!update || typeof update !== 'object') return state
    return { ...((state && typeof state === 'object' ? state : null) as object | null), ...update }
  }

  const createClassComponentAdapter = <P>(
    ClassComponent: ClassComponentType<PropsWithChildren<P>>,
  ): ComponentInstance<P> => {
    const cached = classComponentAdapterCache.get(ClassComponent as unknown as Function)
    if (cached) return cached as ComponentInstance<P>
    const adapter = ((props: PropsWithChildren<P>) => {
      const slot = options.withHookSlot<ClassComponentSlot<PropsWithChildren<P>>>(() => ({
        instance: new ClassComponent(props),
      }))
      const instance = slot.instance
      instance.props = props
      instance.state = mergeClassComponentState(
        instance.state,
        ClassComponent.getDerivedStateFromProps?.(props, instance.state),
      )
      if (typeof ClassComponent.getDerivedStateFromError === 'function') {
        options.onErrorCaptured(error => {
          instance.state = mergeClassComponentState(
            instance.state,
            ClassComponent.getDerivedStateFromError?.(error),
          )
          instance.componentDidCatch?.(error, { componentStack: '' })
          return false
        })
      }
      return instance.render()
    }) as ComponentInstance<P> & Record<string, unknown>
    try {
      Object.defineProperty(adapter, 'name', {
        configurable: true,
        value: (ClassComponent as unknown as Function).name,
      })
    } catch {}
    copyBuiltinComponentMarker(ClassComponent, adapter)
    classComponentAdapterCache.set(ClassComponent as unknown as Function, adapter)
    return adapter
  }

  const normalizeComponentOutput = (value: RenderOutput): RenderOutput => {
    if (Array.isArray(value)) return options.createFragmentHandle(value as unknown[])
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return options.createFragmentHandle([value])
    }
    return value
  }

  const createComponentReturnAdapter = <P>(
    component: ComponentInstance<P>,
  ): ComponentInstance<P> => {
    const cached = componentReturnAdapterCache.get(component as unknown as Function)
    if (cached) return cached as ComponentInstance<P>
    const adapter = ((props: PropsWithChildren<P>) => {
      options.prepareComponentProps?.(props)
      try {
        return normalizeComponentOutput(component(props))
      } catch (error) {
        if (options.captureComponentRenderError?.(error, props)) return null
        throw error
      }
    }) as ComponentInstance<P> & Record<string, unknown>
    try {
      Object.defineProperty(adapter, 'name', {
        configurable: true,
        value: (component as unknown as Function).name,
      })
    } catch {}
    copyBuiltinComponentMarker(component, adapter)
    if (
      (component as unknown as Record<string, unknown>)[
        '__rue_component_render_reactive_factory__'
      ] === true
    ) {
      Object.defineProperty(adapter, '__rue_component_render_reactive_factory__', {
        configurable: true,
        value: true,
      })
    }
    componentReturnAdapterCache.set(component as unknown as Function, adapter)
    return adapter
  }

  const isClassComponentType = <P>(
    type: unknown,
  ): type is ClassComponentType<PropsWithChildren<P>> =>
    typeof type === 'function' &&
    !!(type as { prototype?: { render?: unknown } }).prototype &&
    typeof (type as { prototype?: { render?: unknown } }).prototype?.render === 'function'

  const resolveComponentType = <P = {}>(type: ComponentInstance<P>): ComponentInstance<P> => {
    const resolvedType = resolveClientReferenceComponentType(type)
    const componentType = isClassComponentType<P>(resolvedType)
      ? createClassComponentAdapter(resolvedType)
      : resolvedType
    if (typeof componentType !== 'function') {
      const detail =
        componentType && typeof componentType === 'object'
          ? `object keys: ${Reflect.ownKeys(componentType).map(String).join(', ')}`
          : String(componentType)
      throw new TypeError(`Rue runtime: component type must be a function (${detail})`)
    }
    return createComponentReturnAdapter(componentType)
  }

  return {
    readKeepAliveHookTarget,
    resolveKeepAliveHookTargetComponent,
    resolveComponentType,
    runWithKeepAliveHookTarget,
    withActiveKeepAliveHookTargetMetadata,
  }
}

type LifecycleCoreOptions = {
  getKeepAliveHookTarget(): unknown
  getRuntime(): any
}

export const createLifecycleCore = (options: LifecycleCoreOptions) => {
  const registerKeepAliveHook = (
    hookName: 'activatedHooks' | 'deactivatedHooks',
    fn: () => void,
  ) => {
    const target = options.getKeepAliveHookTarget()
    const hooks =
      target && typeof target === 'object'
        ? (target as Record<string, unknown>)[hookName]
        : undefined
    if (hooks instanceof Set) hooks.add(fn)
  }

  const resolveCustomElementEmitBridge = (
    props: ComponentProps,
  ): CustomElementEmitBridge | null => {
    if (!props || typeof props !== 'object') return null
    const bridge = (props as Record<string, unknown>)[CUSTOM_ELEMENT_EMIT_BRIDGE_KEY]
    return typeof bridge === 'function' ? (bridge as CustomElementEmitBridge) : null
  }

  return {
    onBeforeCreate: (fn: () => void) => options.getRuntime().onBeforeCreate(fn),
    onCreated: (fn: () => void) => options.getRuntime().onCreated(fn),
    onBeforeMount: (fn: () => void) => options.getRuntime().onBeforeMount(fn),
    onMounted: (fn: () => void) => options.getRuntime().onMounted(fn),
    onActivated: (fn: () => void) => {
      registerKeepAliveHook('activatedHooks', fn)
      return options.getRuntime().onActivated(fn)
    },
    onBeforeUpdate: (fn: () => void) => options.getRuntime().onBeforeUpdate(fn),
    onUpdated: (fn: () => void) => options.getRuntime().onUpdated(fn),
    onRenderTriggered: (fn: (event: any) => void) => options.getRuntime().onRenderTriggered(fn),
    onBeforeUnmount: (fn: () => void) => options.getRuntime().onBeforeUnmount(fn),
    onUnmounted: (fn: () => void) => options.getRuntime().onUnmounted(fn),
    onDeactivated: (fn: () => void) => {
      registerKeepAliveHook('deactivatedHooks', fn)
      return options.getRuntime().onDeactivated(fn)
    },
    onServerPrefetch: (fn: () => Promise<any> | any) => options.getRuntime().onServerPrefetch(fn),
    runServerPrefetch: () => options.getRuntime().runServerPrefetch(),
    onError: (fn: (error: any, instance?: any) => void) => options.getRuntime().onError(fn),
    getCurrentContainer: () => options.getRuntime().getCurrentContainer(),
    __rueActivateRange: (start: Node) => options.getRuntime()?.__rueActivateRange?.(start),
    __rueDeactivateRange: (start: Node) => options.getRuntime()?.__rueDeactivateRange?.(start),
    useEmit: (props: ComponentProps) => {
      const baseEmit = options.getRuntime().emitted(props)
      const bridge = resolveCustomElementEmitBridge(props)
      return (eventName: string, ...args: unknown[]) => {
        baseEmit(eventName, args)
        bridge?.(eventName, args)
      }
    },
  }
}

type DOMPropsOperations = {
  addEventListener(el: Element, event: string, handler: (...args: any[]) => any): void
}

export const createDOMPropsCore = (operations: DOMPropsOperations) => {
  const applyDomElementProps = (el: Element, props: ComponentProps | null) => {
    return patchDOMProps(el, props, undefined, {
      addEventListener: (element, event, listener) =>
        operations.addEventListener(element, event, listener),
    })
  }

  return { applyDomElementProps }
}
