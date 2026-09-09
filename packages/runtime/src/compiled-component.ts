import {
  batch,
  createOwner,
  disposeOwner,
  effect,
  onOwnerCleanup,
  runWithOwner,
  runOwnerLifecycle,
  signal,
  untrack,
} from './internal-reactive'
import {
  appendChild,
  createComment,
  createDocumentFragment,
  createTextNode,
  insertBefore,
  removeChild,
  withDOMHostOperations,
} from './compiler-runtime/dom.browser'
import { getCompiledHandleOwner } from './compiler-runtime/hooks'
import { _$compiledRoot, type CompiledRootHandle } from './compiled-root'
import type { CompiledSlotFactory } from './compiler-runtime/mount'
import { _$compiledValue } from './compiled-render-anchor'
import { createCompiledProps, type CompiledPropsController } from './compiled-props'
import { withCompiledHookRun } from './runtime-context'
import { retainRootMountError } from './root-mount-error'

export const RUE_COMPILED_UPDATE_PROPS_KEY = '__rue_compiled_update_props__' as const
export const RUE_COMPILED_COMPONENT_FACTORY_KEY = '__rue_compiled_component_factory__' as const
export const RUE_COMPILED_COMPONENT_READ_PROPS_KEY =
  '__rue_compiled_component_read_props__' as const
export const RUE_COMPILED_COMPONENT_TRACK_PROPS_KEY =
  '__rue_compiled_component_track_props__' as const
export const _$compiledSignal = signal
export const _$compiledBatch = batch

export type CompiledSlotValue =
  | CompiledSlotFactory
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined

/** Mount only the closed compiled-slot union: a compiler factory or a text scalar. */
export const _$compiledSlotValue = (
  readValue: () => CompiledSlotValue | unknown,
): CompiledRootHandle =>
  _$compiledBranch(() => {
    const value = readValue()
    if (typeof value === 'function') {
      return _$compiledRoot(parent => {
        if (parent == null) throw new Error('A compiled slot requires a mount parent')
        const anchor = createComment('rue:compiled-slot')
        appendChild(parent, anchor)
        const owner = createOwner()
        const block = value({ parent, before: anchor }, {}, owner)
        onOwnerCleanup(() => block.dispose())
        return anchor
      })
    }
    if (value != null && typeof value === 'object') return _$compiledValue(value)
    return _$compiledRoot(parent => {
      const text = createTextNode(
        typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint'
          ? String(value)
          : '',
      )
      if (parent != null) appendChild(parent, text)
      return text
    })
  })

export type CompiledPropsUpdater<Props> = (nextProps: Props) => void

export type CompiledComponentHandle<Props> = CompiledRootHandle & {
  [RUE_COMPILED_UPDATE_PROPS_KEY]: CompiledPropsUpdater<Props>
}

export type CompiledComponentFactory<Props> = (
  initialProps: Props,
) => CompiledComponentHandle<Props>

type CompiledClassComponentInstance<Props> = {
  props: Props
  state?: unknown
  render(): unknown
  componentDidCatch?(error: unknown, errorInfo: { componentStack: string }): void
}

type CompiledClassComponentFactory<Props> = {
  new (props: Props): CompiledClassComponentInstance<Props>
  getDerivedStateFromProps?(
    props: Props,
    state: unknown,
  ): Record<string, unknown> | null | undefined
  getDerivedStateFromError?(error: unknown): Record<string, unknown> | null | undefined
}

const isCompiledClassComponentFactory = <Props>(
  factory: CompiledComponentFactory<Props>,
): factory is CompiledComponentFactory<Props> & CompiledClassComponentFactory<Props> =>
  typeof (factory as { prototype?: { render?: unknown } }).prototype?.render === 'function'

const mergeCompiledClassState = (
  state: unknown,
  update: Record<string, unknown> | null | undefined,
): unknown =>
  update && typeof update === 'object'
    ? { ...((state && typeof state === 'object' ? state : null) as object | null), ...update }
    : state

const asCompiledComponentHandle = <Props>(value: unknown): CompiledComponentHandle<Props> => {
  const sourceHandle =
    value != null &&
    typeof value === 'object' &&
    '__rue_compiled_mount' in value &&
    typeof value.__rue_compiled_mount === 'function'
      ? (value as CompiledComponentHandle<Props>)
      : (_$compiledValue(value) as CompiledComponentHandle<Props>)
  return typeof sourceHandle.__rue_compiled_mountable === 'function' &&
    !sourceHandle.__rue_compiled_mountable() &&
    typeof sourceHandle.__rue_compiled_clone === 'function'
    ? (sourceHandle.__rue_compiled_clone() as CompiledComponentHandle<Props>)
    : sourceHandle
}

const dispatchCompiledComponentError = (error: unknown, owner: object, info: string): boolean =>
  globalThis.__rue_compiled_runtime_bridge?.dispatchErrorCaptured?.(error, owner, info) === true

const reportedCompiledErrors = new WeakSet<object>()

const reportCompiledComponentError = (error: unknown, owner: object): void => {
  if ((typeof error === 'object' || typeof error === 'function') && error != null) {
    if (reportedCompiledErrors.has(error)) return
    reportedCompiledErrors.add(error)
  }
  const runtimeGlobal = globalThis as typeof globalThis & {
    __rue?: { handleError?: (error: unknown, instance?: unknown) => void }
    __rue_active?: { handleError?: (error: unknown, instance?: unknown) => void }
    __rue_report_client_error__?: (error: unknown, instance?: unknown) => boolean
  }
  if (runtimeGlobal.__rue_report_client_error__?.(error, owner)) return
  const runtime = runtimeGlobal.__rue_active ?? runtimeGlobal.__rue
  runtime?.handleError?.(error, owner)
}

export interface CompiledBranchCase {
  __rue_compiled_branch_key: unknown
  __rue_compiled_branch_refresh?: boolean
  create: () => CompiledRootHandle
}

export type CompiledBranchFactory = () => CompiledRootHandle | CompiledBranchCase

const isCompiledBranchCase = (
  branch: CompiledRootHandle | CompiledBranchCase,
): branch is CompiledBranchCase =>
  branch != null &&
  typeof branch === 'object' &&
  '__rue_compiled_branch_key' in branch &&
  typeof branch.create === 'function'

const mountCompiledBranch = (
  initialParent: ParentNode,
  anchor: Node | null,
  branch: CompiledRootHandle | null | undefined | false,
): { dispose: () => void; root: Node | null } => {
  const parent = anchor?.parentNode ?? initialParent
  if (!branch) return { dispose: () => {}, root: null }
  const existingNodes = new Set(Array.from(parent.childNodes))
  let result: Node | null | undefined
  try {
    withDOMHostOperations(parent, () => {
      result = branch.__rue_compiled_mount(parent)
      if (result != null && typeof result === 'object' && 'nodeType' in result) {
        insertBefore(parent, result, anchor)
      }
    })
  } catch (error) {
    branch.dispose()
    throw error
  }
  const mountedNodes = Array.from(parent.childNodes).filter(node => !existingNodes.has(node))
  return {
    dispose: () =>
      withDOMHostOperations(parent, () => {
        branch.dispose()
        for (const node of mountedNodes) {
          if (node.parentNode) removeChild(node.parentNode, node)
        }
      }),
    root: mountedNodes.find(node => node.nodeType === 1) ?? result ?? null,
  }
}

type BranchFocus = {
  path: number[]
  selectionDirection: 'forward' | 'backward' | 'none' | null
  selectionEnd: number | null
  selectionStart: number | null
}

const captureBranchFocus = (root: Node | null): BranchFocus | undefined => {
  if (typeof Element === 'undefined' || !(root instanceof Element)) return undefined
  const active = root.ownerDocument.activeElement
  if (
    typeof HTMLElement === 'undefined' ||
    !(active instanceof HTMLElement) ||
    !root.contains(active)
  ) {
    return undefined
  }
  const path: number[] = []
  let cursor: Node = active
  while (cursor !== root) {
    const parent = cursor.parentNode
    if (parent == null) return undefined
    path.unshift(Array.prototype.indexOf.call(parent.childNodes, cursor))
    cursor = parent
  }
  const input = active as HTMLInputElement
  return {
    path,
    selectionStart: typeof input.selectionStart === 'number' ? input.selectionStart : null,
    selectionEnd: typeof input.selectionEnd === 'number' ? input.selectionEnd : null,
    selectionDirection: input.selectionDirection ?? null,
  }
}

const restoreBranchFocus = (root: Node | null, focus: BranchFocus | undefined): void => {
  if (root == null || focus == null) return
  let cursor: Node | undefined = root
  for (const index of focus.path) cursor = cursor?.childNodes[index]
  if (typeof HTMLElement === 'undefined' || !(cursor instanceof HTMLElement)) return
  cursor.focus()
  if (focus.selectionStart != null && focus.selectionEnd != null && 'setSelectionRange' in cursor) {
    ;(cursor as HTMLInputElement).setSelectionRange(
      focus.selectionStart,
      focus.selectionEnd,
      focus.selectionDirection ?? undefined,
    )
  }
}

/** Keep one stable anchor while replacing only the active directly-compiled branch. */
export const _$compiledBranch = (readBranch: CompiledBranchFactory): CompiledRootHandle => {
  return _$compiledRoot(parent => {
    if (parent == null) throw new Error('A compiled branch requires a mount parent')

    const anchor = createComment('rue:compiled-branch')
    appendChild(parent, anchor)

    let initialized = false
    let activeKey: unknown
    let mountedBranch: ReturnType<typeof mountCompiledBranch> | undefined
    let disposed = false
    let stabilizationQueued = false
    const selectBranch = () => {
      const selection = readBranch()
      if (
        isCompiledBranchCase(selection) &&
        initialized &&
        Object.is(activeKey, selection.__rue_compiled_branch_key) &&
        selection.__rue_compiled_branch_refresh !== true
      ) {
        return
      }
      const branch = untrack(() =>
        isCompiledBranchCase(selection) ? selection.create() : selection,
      )
      const focus = captureBranchFocus(mountedBranch?.root ?? null)
      mountedBranch?.dispose()
      mountedBranch = untrack(() => mountCompiledBranch(parent, anchor, branch))
      restoreBranchFocus(mountedBranch.root, focus)
      initialized = true
      activeKey = isCompiledBranchCase(selection) ? selection.__rue_compiled_branch_key : undefined
      if (
        isCompiledBranchCase(selection) &&
        selection.__rue_compiled_branch_refresh !== true &&
        branch != null &&
        (branch as unknown as Record<string, unknown>)[RUE_COMPILED_COMPONENT_FACTORY_KEY] !=
          null &&
        !stabilizationQueued
      ) {
        stabilizationQueued = true
        queueMicrotask(() => {
          stabilizationQueued = false
          if (!disposed) selectBranch()
        })
      }
    }

    effect(selectBranch)
    onOwnerCleanup(() => {
      disposed = true
      mountedBranch?.dispose()
      mountedBranch = undefined
    })

    return anchor
  })
}

/** Mount a closed compiled branch at a stable sibling boundary or the parent tail. */
export const _$compiledBranchAt = (
  parent: ParentNode,
  anchor: Node | null,
  readBranch: CompiledBranchFactory,
): ReturnType<typeof effect> => {
  let initialized = false
  let activeKey: unknown
  let mountedBranch: ReturnType<typeof mountCompiledBranch> | undefined
  let disposed = false
  let stabilizationQueued = false
  const disposeActiveBranch = () => {
    const mounted = mountedBranch
    mountedBranch = undefined
    mounted?.dispose()
  }
  onOwnerCleanup(disposeActiveBranch)
  const selectBranch = () => {
    const selection = readBranch()
    if (
      isCompiledBranchCase(selection) &&
      initialized &&
      Object.is(activeKey, selection.__rue_compiled_branch_key) &&
      selection.__rue_compiled_branch_refresh !== true
    )
      return
    const branch = untrack(() => (isCompiledBranchCase(selection) ? selection.create() : selection))
    disposeActiveBranch()
    mountedBranch = untrack(() => mountCompiledBranch(parent, anchor, branch))
    initialized = true
    activeKey = isCompiledBranchCase(selection) ? selection.__rue_compiled_branch_key : undefined
    if (
      isCompiledBranchCase(selection) &&
      selection.__rue_compiled_branch_refresh !== true &&
      branch != null &&
      (branch as unknown as Record<string, unknown>)[RUE_COMPILED_COMPONENT_FACTORY_KEY] != null &&
      !stabilizationQueued
    ) {
      stabilizationQueued = true
      queueMicrotask(() => {
        stabilizationQueued = false
        if (!disposed) selectBranch()
      })
    }
  }
  const branchEffect = effect(selectBranch)
  const disposeEffect = branchEffect.dispose.bind(branchEffect)
  branchEffect.dispose = () => {
    disposed = true
    disposeActiveBranch()
    disposeEffect()
  }
  return branchEffect
}

export const _$withCompiledPropsUpdater = <Props>(
  root: CompiledRootHandle,
  updateProps: CompiledPropsUpdater<Props>,
  readSourceProps?: () => Props,
): CompiledComponentHandle<Props> => {
  const handle = root as CompiledComponentHandle<Props>
  const owner = getCompiledHandleOwner(root)
  if (readSourceProps) {
    const sourceEffect = effect(() => updateProps(readSourceProps()))
    root.__rue_cleanup_bucket.push(() => sourceEffect.dispose())
  }
  handle[RUE_COMPILED_UPDATE_PROPS_KEY] = nextProps => {
    if (owner === undefined) return updateProps(nextProps)
    runOwnerLifecycle(owner, 'beforeUpdate')
    try {
      updateProps(nextProps)
    } finally {
      runOwnerLifecycle(owner, 'updated')
    }
  }
  return handle
}

/** Mount a compiled child once and only push later reactive props into its static updater. */
export const _$mountCompiledComponent = <Props>(
  parent: ParentNode,
  factory: CompiledComponentFactory<Props>,
  readProps: () => Props,
  registerCleanup?: (cleanup: () => void) => void,
): Node | null | undefined => {
  const owner = createOwner()
  let handle: CompiledComponentHandle<Props> | undefined
  let classInstance: CompiledClassComponentInstance<Props> | undefined
  let propsController: CompiledPropsController<object> | undefined
  let renderEffect: ReturnType<typeof effect> | undefined
  let mounted = false
  let replaceMountedHandle: ((next: CompiledComponentHandle<Props>) => void) | undefined
  const ClassComponent = isCompiledClassComponentFactory(factory) ? factory : undefined
  const componentHookIdentity = {}
  const renderFunctionComponent = (props: Props) => {
    if (
      (factory as unknown as { $$typeof?: unknown }).$$typeof ===
        Symbol.for('rue.client.reference') &&
      Number((globalThis as Record<string, unknown>).__rue_is_server_rendering__ ?? 0) > 0
    ) {
      return null
    }
    const factorySource = Function.prototype.toString.call(factory)
    if (
      Number((globalThis as Record<string, unknown>).__rue_is_server_rendering__ ?? 0) > 0 &&
      factory.constructor?.name === 'AsyncFunction' &&
      factorySource.includes('virtual:rue-rsc/css?type=rsc')
    ) {
      return null
    }
    const bridge = globalThis.__rue_compiled_runtime_bridge
    bridge?.beginComponentRender?.(owner)
    try {
      return withCompiledHookRun(() => factory(props), componentHookIdentity)
    } finally {
      bridge?.endComponentRender?.()
    }
  }
  const mountComponentHandle = (
    mounted: CompiledComponentHandle<Props>,
    target: ParentNode,
  ): Node | null | undefined => {
    const bridge = globalThis.__rue_compiled_runtime_bridge
    bridge?.beginComponentSetup?.(owner)
    try {
      return runWithOwner(owner, () => mounted.__rue_compiled_mount(target))
    } finally {
      bridge?.endComponentSetup?.()
    }
  }
  try {
    runWithOwner(owner, () => {
      const initialProps = untrack(readProps)
      if (initialProps != null && typeof initialProps === 'object') {
        propsController = createCompiledProps(initialProps as object)
      }
      const componentProps = (propsController?.props ?? initialProps) as Props
      if (ClassComponent) {
        classInstance = new ClassComponent(componentProps)
        classInstance.state = mergeCompiledClassState(
          classInstance.state,
          ClassComponent.getDerivedStateFromProps?.(componentProps, classInstance.state),
        )
        handle = asCompiledComponentHandle<Props>(classInstance.render())
      } else if (
        (factory as unknown as Record<string, unknown>)[
          '__rue_component_render_reactive_factory__'
        ] === true
      ) {
        renderEffect = effect(() => {
          let next: CompiledComponentHandle<Props>
          try {
            next = asCompiledComponentHandle<Props>(renderFunctionComponent(componentProps))
          } catch (error) {
            if (
              (
                globalThis as typeof globalThis & {
                  __rue_root_mount_error_rethrow_depth__?: number
                }
              ).__rue_root_mount_error_rethrow_depth__
            ) {
              retainRootMountError(error)
              throw error
            }
            next = asCompiledComponentHandle<Props>(null)
            queueMicrotask(() => {
              if (!dispatchCompiledComponentError(error, owner, 'component update')) {
                reportCompiledComponentError(error, owner)
              }
            })
          }
          if (handle == null) {
            handle = next
          } else if (mounted) {
            replaceMountedHandle?.(next)
          } else {
            handle.dispose()
            handle = next
          }
        })
      } else {
        // A fine-grained compiled child owns its reactive subscriptions through the effects it
        // creates while building the handle. Do not let setup/composable reads escape into a
        // parent render effect, otherwise updating child-local state can remount the parent tree.
        handle = untrack(() =>
          asCompiledComponentHandle<Props>(renderFunctionComponent(componentProps)),
        )
      }
    })
  } catch (error) {
    if (
      error != null &&
      (typeof error === 'object' || typeof error === 'function') &&
      typeof (error as PromiseLike<unknown>).then === 'function'
    ) {
      disposeOwner(owner)
      throw error
    }
    if (dispatchCompiledComponentError(error, owner, 'component render')) {
      handle = asCompiledComponentHandle<Props>(null)
    } else {
      reportCompiledComponentError(error, owner)
      disposeOwner(owner)
      throw error
    }
  }
  if (!handle) {
    disposeOwner(owner)
    throw new Error('[rue] compiled component factory did not return a mount handle')
  }
  let mountedHandle = handle
  let updateEffect: ReturnType<typeof effect> | undefined
  let mountedNodes: Node[] = []
  let componentAnchor: Node | undefined
  let disposed = false
  const cleanup = () => {
    if (disposed) return
    disposed = true
    updateEffect?.dispose()
    renderEffect?.dispose()
    mountedHandle.dispose()
    for (const node of mountedNodes) {
      if (node.parentNode) removeChild(node.parentNode, node)
    }
    mountedNodes = []
    if (componentAnchor?.parentNode) removeChild(componentAnchor.parentNode, componentAnchor)
    componentAnchor = undefined
    propsController?.dispose()
    globalThis.__rue_compiled_runtime_bridge?.disposeComponent(owner)
    disposeOwner(owner)
  }

  try {
    runOwnerLifecycle(owner, 'beforeMount')
    const existingNodes = new Set(Array.from(parent.childNodes))
    let result: Node | null | undefined
    try {
      result = mountComponentHandle(mountedHandle, parent)
    } catch (error) {
      if (
        error != null &&
        (typeof error === 'object' || typeof error === 'function') &&
        typeof (error as PromiseLike<unknown>).then === 'function'
      ) {
        throw error
      }
      if (ClassComponent?.getDerivedStateFromError && classInstance) {
        mountedHandle.dispose()
        classInstance.state = mergeCompiledClassState(
          classInstance.state,
          ClassComponent.getDerivedStateFromError(error),
        )
        classInstance.componentDidCatch?.(error, { componentStack: '' })
        mountedHandle = asCompiledComponentHandle<Props>(
          runWithOwner(owner, () => classInstance!.render()),
        )
        result = mountComponentHandle(mountedHandle, parent)
      } else if (dispatchCompiledComponentError(error, owner, 'component setup')) {
        mountedHandle.dispose()
        mountedHandle = asCompiledComponentHandle<Props>(null)
        result = mountComponentHandle(mountedHandle, parent)
      } else {
        reportCompiledComponentError(error, owner)
        throw error
      }
    }
    if (result != null && (result.nodeType === 11 || result.parentNode !== parent)) {
      appendChild(parent, result)
    }
    componentAnchor = createTextNode('')
    appendChild(parent, componentAnchor)
    mountedNodes = Array.from(parent.childNodes).filter(
      node => node !== componentAnchor && !existingNodes.has(node),
    )
    mounted = true
    runOwnerLifecycle(owner, 'mounted')
    replaceMountedHandle = nextHandle => {
      if (mountedHandle === nextHandle) return
      const mountedRecord = mountedHandle as unknown as Record<string, unknown>
      const nextRecord = nextHandle as unknown as Record<string, unknown>
      const mountedFactory = mountedRecord[RUE_COMPILED_COMPONENT_FACTORY_KEY]
      if (
        typeof mountedFactory === 'string' &&
        mountedFactory.includes('-') &&
        mountedFactory === nextRecord[RUE_COMPILED_COMPONENT_FACTORY_KEY] &&
        typeof mountedHandle[RUE_COMPILED_UPDATE_PROPS_KEY] === 'function' &&
        typeof nextRecord[RUE_COMPILED_COMPONENT_READ_PROPS_KEY] === 'function'
      ) {
        mountedHandle[RUE_COMPILED_UPDATE_PROPS_KEY](
          (nextRecord[RUE_COMPILED_COMPONENT_READ_PROPS_KEY] as () => Props)(),
        )
        nextHandle.dispose()
        return
      }
      const liveParent = componentAnchor?.parentNode as ParentNode | null | undefined
      if (liveParent == null) {
        nextHandle.dispose()
        return
      }
      const focus = captureBranchFocus(liveParent as Node)
      const staging = createDocumentFragment(liveParent)
      const nextResult = untrack(() => mountComponentHandle(nextHandle, staging))
      if (nextResult != null && nextResult.parentNode !== staging) appendChild(staging, nextResult)
      const nextNodes = Array.from(staging.childNodes)
      mountedHandle.dispose()
      const retainedNodes = new Set<Node>(nextNodes)
      for (const node of mountedNodes) {
        if (!retainedNodes.has(node) && node.parentNode) removeChild(node.parentNode, node)
      }
      insertBefore(liveParent, staging, componentAnchor ?? null)
      mountedHandle = nextHandle
      mountedNodes = nextNodes
      restoreBranchFocus(liveParent as Node, focus)
    }
    let initialRun = true
    runWithOwner(owner, () => {
      updateEffect = effect(() => {
        const nextProps = readProps()
        if (initialRun) {
          initialRun = false
          return
        }
        if (renderEffect) {
          if (nextProps != null && typeof nextProps === 'object') {
            propsController?.update(nextProps as object)
          }
          return
        }
        if (classInstance) {
          classInstance.state = mergeCompiledClassState(
            classInstance.state,
            ClassComponent?.getDerivedStateFromProps?.(nextProps, classInstance.state),
          )
        }
        const updateProps = mountedHandle[RUE_COMPILED_UPDATE_PROPS_KEY]
        if (typeof updateProps === 'function') {
          batch(() => {
            if (nextProps != null && typeof nextProps === 'object') {
              propsController?.update(nextProps as object)
            }
            updateProps(nextProps)
          })
          return
        }

        if (nextProps != null && typeof nextProps === 'object') {
          propsController?.update(nextProps as object)
        }

        // A non-reactive compiled function component wires prop reads into its mounted DOM
        // effects. Publishing the props controller update is sufficient; rebuilding the returned handle
        // would replace otherwise-stable form controls on every parent prop update.
        if (!classInstance && propsController) return

        let nextHandle: CompiledComponentHandle<Props>
        try {
          nextHandle = asCompiledComponentHandle<Props>(
            untrack(() =>
              classInstance
                ? classInstance.render()
                : renderFunctionComponent(propsController?.props as Props),
            ),
          )
        } catch (error) {
          if (!dispatchCompiledComponentError(error, owner, 'component update')) {
            reportCompiledComponentError(error, owner)
            throw error
          }
          nextHandle = asCompiledComponentHandle<Props>(null)
        }
        replaceMountedHandle?.(nextHandle)
      })
    })
    onOwnerCleanup(cleanup)
    registerCleanup?.(cleanup)

    return result ?? componentAnchor
  } catch (error) {
    cleanup()
    throw error
  }
}

/** Create a disposable root handle for a compiled component expression. */
export const _$compiledComponent = <Props>(
  factory: CompiledComponentFactory<Props>,
  readProps: () => Props,
): CompiledRootHandle => {
  const props = signal(untrack(readProps))
  const root = _$withCompiledPropsUpdater<Props>(
    _$compiledRoot(parent => {
      if (parent == null) throw new Error('A compiled component requires a mount parent')
      return _$mountCompiledComponent(parent, factory, () => props.get())
    }),
    next => props.set(next),
    readProps,
  ) as unknown as CompiledRootHandle & Record<string, unknown>
  root[RUE_COMPILED_COMPONENT_FACTORY_KEY] = factory
  root[RUE_COMPILED_COMPONENT_READ_PROPS_KEY] = () => props.peek()
  root[RUE_COMPILED_COMPONENT_TRACK_PROPS_KEY] = () => props.get()
  root.__rue_compiled_clone = () => _$compiledComponent(factory, readProps)
  return root
}

/** Select a component from a compiler-provided finite registry and remount on identity changes. */
export const _$compiledDynamicComponent = <Props>(
  readFactory: () => CompiledComponentFactory<Props>,
  readProps: () => Props,
): CompiledRootHandle =>
  _$compiledBranch(() => {
    const factory = readFactory()
    if (typeof factory !== 'function') {
      throw new Error('[rue] compiled dynamic component key is missing from its registry')
    }
    return {
      __rue_compiled_branch_key: factory,
      create: () => _$compiledComponent(factory, readProps),
    }
  })
