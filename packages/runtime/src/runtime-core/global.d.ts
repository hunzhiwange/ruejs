export {}

declare global {
  const __TEST__: boolean

  type RuntimeVaporErrorHandler = (error: unknown, instance?: unknown) => unknown
  type RuntimeVaporRenderTriggeredHook = (event: unknown) => unknown

  interface RuntimeVaporRenderOwner {
    __rue_context_owner_parent__?: RuntimeVaporRenderOwner
    __rue_render_triggered_hooks?: RuntimeVaporRenderTriggeredHook[]
    __rue_shared_render_scope_id?: number
    __rue_shared_vapor_scope_id?: number
  }

  interface RuntimeVaporSharedRuntime {
    __rueActivateEffectOwnerTracking?(): void
    __rueActivateRenderTriggered?(): void
    __rueBeginRenderDebugOwner?(owner: RuntimeVaporRenderOwner): void
    __rueCreateDetachedEffectScope(): number
    __rueDisposeEffectScope(scopeId: number): void
    __rueDisposeHookScopeForInstance?(instance: RuntimeVaporRenderOwner): void
    __rueEndRenderDebugOwner?(): void
    __rueGetCurrentEffectScope?(): unknown
    __ruePopEffectScope(): void
    __ruePushEffectScope(scopeId: number): void
    getCurrentInstance?(): unknown
    setCurrentInstance?(instance: unknown): void
  }

  interface RuntimeVaporSharedBridge {
    __rue_render_triggered_dispatch_installed__?: boolean
    __rue_render_triggered_owner?: unknown
    __rue_render_tracked_owner?: unknown
    activateEffectOwnerTracking?(): void
    activateRenderTriggered?(): void
    beginComponentRender?(instance: unknown): unknown
    beginComponentSetup?(instance: unknown): unknown
    beginVaporScope(owner: unknown): boolean
    dispatchErrorCaptured?(...args: unknown[]): unknown
    dispatchRenderTriggeredForEffect?(...args: unknown[]): unknown
    disposeComponent(instance: unknown): void
    disposeVaporScope(owner: unknown): void
    endComponentRender?(instance?: unknown): unknown
    endComponentSetup?(): unknown
    endVaporScope(didPush: boolean): void
    getCurrentContainer?(): unknown
    getCurrentRenderOwner?(): unknown
    popCurrentContainer?(): unknown
    pushCurrentContainer?(container: unknown): unknown
  }

  type InstalledRuntimeVaporSharedBridge = Omit<
    RuntimeVaporSharedBridge,
    | '__rue_render_triggered_owner'
    | 'activateEffectOwnerTracking'
    | 'activateRenderTriggered'
    | 'beginComponentRender'
    | 'beginComponentSetup'
    | 'dispatchErrorCaptured'
    | 'endComponentRender'
    | 'endComponentSetup'
    | 'getCurrentContainer'
    | 'getCurrentRenderOwner'
    | 'popCurrentContainer'
    | 'pushCurrentContainer'
  > & {
    __rue_render_triggered_owner?: RuntimeVaporRenderOwner
    __rue_render_tracked_owner?: RuntimeVaporRenderOwner
    activateEffectOwnerTracking(): void
    activateRenderTriggered(): void
    beginComponentRender(instance: unknown): void
    beginComponentSetup(instance: unknown): void
    dispatchErrorCaptured(error: unknown, instance: unknown, info: string): boolean
    endComponentRender(): void
    endComponentSetup(): void
    getCurrentContainer(): unknown
    getCurrentRenderOwner(): RuntimeVaporRenderOwner | undefined
    popCurrentContainer(): void
    pushCurrentContainer(container: unknown): void
  }

  interface RuntimeVaporEntryPrivateFields {
    __rue_active_entry_depth__?: number
    __rue_js_error_bridge_installed?: boolean
    __rue_js_error_handlers?: Set<RuntimeVaporErrorHandler>
    __rue_pending_entry_error__?: unknown
    __rueHandleComponentError?: (error: unknown) => never
  }

  var __rue_dispatch_error_captured:
    | ((error: unknown, instance?: unknown, info?: string) => boolean)
    | undefined
  var __rue_compiled_runtime_backend_test_hook__:
    | ((details: {
        kernel: 'typescript'
        entry: 'browser:full' | 'browser:vapor' | 'node:full' | 'node:vapor'
        hooks: 'js'
        runtime: 'js'
      }) => void)
    | undefined
  var __rue_compiled_runtime_bridge: RuntimeVaporSharedBridge | undefined
}
