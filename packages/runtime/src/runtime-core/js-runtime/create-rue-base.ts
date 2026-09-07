import { createAppController } from './app.js'
import { flushPendingComponentLifecycle } from './component.js'
import { createKernelBridge } from './kernel-bridge.js'
import { createKeepAliveController } from './keep-alive.js'
import { createComponentInstanceManager } from './instance.js'
import { createErrorController } from './errors.js'
import { createLifecycleController } from './lifecycle.js'
import {
  createElementMountInput,
  createVaporMountInput,
  normalizeMountInput,
  storeMountInput,
} from './mount-input.js'
import { createOwnedMountManager } from './owned-mount.js'
import { createEmitter, createPluginController } from './plugins.js'
import { renderContainer, unmountContainer } from './render/container.js'
import { renderAnchor } from './render/anchor.js'
import { dropRenderEntriesWithin } from './render/helpers.js'
import { renderStatic } from './render/static.js'
import { assertRuntimeActive, createRuntimeState } from './state.js'
import type {
  ComponentHookHost,
  MountController,
  MountInput,
  RenderRuntimeState,
  RueRuntime,
  RuntimeEntry,
  RuntimeLifecycleRegistrar,
  RuntimeLifecycleRegistration,
  RuntimeOrchestrationState,
  RuntimeState,
} from './types.js'

const noop = (): undefined => undefined

function assertRenderControllers<HostNode>(
  state: RuntimeState<HostNode>,
): asserts state is RenderRuntimeState<HostNode> {
  if (!state.components || !state.lifecycle) {
    throw new Error('Rue runtime: JavaScript Runtime render controllers are not initialized')
  }
}

function assertRuntimeControllers<HostNode>(
  state: RuntimeState<HostNode>,
): asserts state is RuntimeOrchestrationState<HostNode> {
  if (
    !state.components ||
    !state.errors ||
    typeof state.flushPendingComponentLifecycle !== 'function' ||
    !state.lifecycle ||
    !state.ownedMounts
  ) {
    throw new Error('Rue runtime: JavaScript Runtime controllers are not initialized')
  }
}

const activeReactiveScopeCount = (reactiveKernel: unknown): number => {
  if (
    (typeof reactiveKernel !== 'object' && typeof reactiveKernel !== 'function') ||
    reactiveKernel == null
  ) {
    return 0
  }
  const getDebugState = Reflect.get(reactiveKernel, '__rueGetEffectScopeDebugState')
  if (typeof getDebugState !== 'function') return 0
  const debugState = Reflect.apply(getDebugState, reactiveKernel, [])
  if ((typeof debugState !== 'object' && typeof debugState !== 'function') || debugState == null) {
    return 0
  }
  const count = Reflect.get(debugState, 'activeScopeHandles')
  return typeof count === 'number' ? count : 0
}

/** Create the non-rendering JavaScript Runtime skeleton used by runtime-vapor. */
export const createRueBase = (
  adapter: unknown,
  reactiveKernel: unknown,
  mountController: MountController,
): RueRuntime => {
  const kernel = createKernelBridge(reactiveKernel)
  const state = createRuntimeState({ adapter, kernel })
  const components = createComponentInstanceManager(reactiveKernel)
  state.components = components
  const lifecycle = createLifecycleController(() => components.current()?.host)
  state.lifecycle = lifecycle
  assertRenderControllers(state)
  const errors = createErrorController()
  state.errors = errors
  const ownedMounts = createOwnedMountManager(state)
  state.ownedMounts = ownedMounts
  state.flushPendingComponentLifecycle = () => flushPendingComponentLifecycle(state)
  assertRuntimeControllers(state)
  const keepAlive = createKeepAliveController(state, lifecycle)
  const assertActive = () => assertRuntimeActive(state)
  const plugins = createPluginController(assertActive)
  const appController = createAppController({
    state,
    plugins,
    lifecycle,
    currentInstance: components.current,
    assertActive,
  })

  const runRenderEntry = <T>(render: () => T): T => {
    state.renderDepth += 1
    try {
      return render()
    } finally {
      state.renderDepth -= 1
      if (state.renderDepth === 0) flushPendingComponentLifecycle(state)
    }
  }

  const registerLifecycle =
    (register: RuntimeLifecycleRegistrar): RuntimeLifecycleRegistration =>
    callback => {
      assertActive()
      register(callback)
      return undefined
    }

  const recordInput = (
    entry: RuntimeEntry,
    value: unknown,
    args: readonly unknown[],
  ): MountInput | null => {
    assertRuntimeActive(state)
    const input = normalizeMountInput(state, value, entry)
    state.pendingInputs.push({ entry, input, args })
    kernel.recordRuntimeInput(entry, input, args)
    return input
  }

  const runtime: RueRuntime = {
    __rtd: noop,
    __rueActivateRange: keepAlive.activate,
    __rueDeactivateRange: keepAlive.deactivate,
    abortOwnedMount: ownedMounts.abortOwnedMount,
    buildOwnedMount: ownedMounts.buildOwnedMount,
    commitMounted: ownedMounts.commitMounted,
    componentInstanceCount: components.count,
    componentWrapperCount: components.wrapperCount,
    createComponent(typeTag, props) {
      assertRuntimeActive(state)
      return storeMountInput(
        state,
        createElementMountInput(state, typeTag, props, undefined, {
          strictComponentReturns: typeof typeTag === 'function',
        }),
      )
    },
    createElement(typeTag, props, children) {
      assertRuntimeActive(state)
      return storeMountInput(state, createElementMountInput(state, typeTag, props, children))
    },
    currentOwnedMountToken: ownedMounts.currentOwnedMountToken,
    disposeOwnedMount: ownedMounts.disposeOwnedMount,
    effectScopeCount: () =>
      components.count() + state.effectScopeIds.size + activeReactiveScopeCount(reactiveKernel),
    emitted: props => createEmitter(props, assertActive),
    flushMounted: ownedMounts.flushMounted,
    getCurrentContainer: appController.getCurrentContainer,
    globalAnchorMountCount: () => state.anchorMounts.size,
    mount(app, container) {
      return appController.mount(app, container, root => {
        const value =
          typeof root === 'function'
            ? storeMountInput(
                state,
                createElementMountInput(
                  state,
                  (props: unknown) => {
                    try {
                      return Reflect.apply(root, undefined, [props])
                    } catch (error) {
                      appController.recordMountError(error)
                      throw error
                    }
                  },
                  {},
                  undefined,
                  {
                    strictComponentReturns: true,
                  },
                ),
              )
            : root
        const input = recordInput('render', value, [container])
        runRenderEntry(() => renderContainer(state, mountController, input, container))
        lifecycle.callGlobal('mounted')
      })
    },
    onActivated: registerLifecycle(lifecycle.onActivated),
    onBeforeCreate: registerLifecycle(lifecycle.onBeforeCreate),
    onBeforeMount: registerLifecycle(lifecycle.onBeforeMount),
    onBeforeUnmount: registerLifecycle(lifecycle.onBeforeUnmount),
    onBeforeUpdate: registerLifecycle(lifecycle.onBeforeUpdate),
    onCreated: registerLifecycle(lifecycle.onCreated),
    onDeactivated: registerLifecycle(lifecycle.onDeactivated),
    onError: registerLifecycle(errors.onError),
    onMounted: registerLifecycle(lifecycle.onMounted),
    onRenderTriggered: registerLifecycle(lifecycle.onRenderTriggered),
    onServerPrefetch: appController.onServerPrefetch,
    onUnmounted: registerLifecycle(lifecycle.onUnmounted),
    onUpdated: registerLifecycle(lifecycle.onUpdated),
    ownedMountCollecting: ownedMounts.ownedMountCollecting,
    ownedMountCount: ownedMounts.ownedMountCount,
    ownedMountEntryCount: ownedMounts.ownedMountEntryCount,
    pendingComponentMountedCount: () =>
      state.pendingComponentLifecycle.length + ownedMounts.pendingLifecycleCount(),
    render(value, container) {
      return appController.withCurrentContainer(container, () => {
        const input = recordInput('render', value, [container])
        runRenderEntry(() => renderContainer(state, mountController, input, container))
      })
    },
    renderAnchor(value, parent, anchor) {
      return appController.withCurrentContainer(parent, () => {
        const input = recordInput('renderAnchor', value, [parent, anchor])
        runRenderEntry(() => renderAnchor(state, mountController, input, parent, anchor))
      })
    },
    renderStatic(value, parent, anchor) {
      return appController.withCurrentContainer(parent, () => {
        const input = recordInput('renderStatic', value, [parent, anchor])
        runRenderEntry(() => renderStatic(state, mountController, input, parent, anchor))
      })
    },
    runServerPrefetch: appController.runServerPrefetch,
    setDOMAdapter(nextAdapter) {
      assertRuntimeActive(state)
      state.adapter = nextAdapter ?? undefined
    },
    unmount(container) {
      return appController.unmount(container, () => {
        lifecycle.callGlobal('before_unmount')
        dropRenderEntriesWithin(state, container)
        unmountContainer(state, container)
        lifecycle.callGlobal('unmounted')
      })
    },
    updateOwnedMount: ownedMounts.updateOwnedMount,
    use: plugins.use,
    vapor(setup) {
      assertRuntimeActive(state)
      const input = createVaporMountInput(setup, kernel)
      if (input.mountEffectScopeId !== undefined) {
        state.effectScopeIds.add(input.mountEffectScopeId)
      }
      return storeMountInput(state, input)
    },
    free() {
      if (state.disposed) return
      state.disposed = true
      for (const scopeId of state.effectScopeIds) {
        kernel.disposeEffectScope(scopeId)
      }
      ownedMounts.free()
      components.free()
      lifecycle.clear()
      errors.clear()
      appController.clear()
      state.effectScopeIds.clear()
      state.anchorMounts.clear()
      state.mountInputs.clear()
      state.pendingInputs.length = 0
      state.pendingComponentLifecycle.length = 0
      state.containerMounts.clear()
      state.adapter = undefined
    },
  }

  Object.defineProperties(runtime, {
    __rueHandleComponentError: {
      configurable: true,
      writable: true,
      value(error: unknown, instance: ComponentHookHost) {
        errors.notifyGlobal(error, instance)
        return undefined
      },
    },
    handleError: {
      configurable: true,
      writable: true,
      value(error: unknown, instance: unknown, info = 'runtime error') {
        if (errors.capture(error, instance, info)) return false
        errors.notifyGlobal(error, instance)
        return true
      },
    },
  })
  state.runtime = runtime
  components.setState(state)

  return runtime
}

export default createRueBase
