import type { KernelBridge, RuntimeState } from './types.js'

interface CreateRuntimeStateOptions {
  adapter: unknown
  kernel: KernelBridge
}

/** Create mutable state owned by exactly one JavaScript Runtime instance. */
export const createRuntimeState = <HostNode = unknown>({
  adapter,
  kernel,
}: CreateRuntimeStateOptions): RuntimeState<HostNode> => ({
  activeAppMount: undefined,
  adapter: adapter ?? undefined,
  appMounts: new Map(),
  anchorMounts: new Map(),
  containerMounts: new Map(),
  disposed: false,
  effectScopeIds: new Set(),
  kernel,
  lastContainer: undefined,
  mountInputs: new Map(),
  nextMountInputId: 0,
  pendingComponentLifecycle: [],
  pendingInputs: [],
  renderDepth: 0,
})

export const assertRuntimeActive = (state: RuntimeState): void => {
  if (state.disposed) {
    throw new Error('Rue runtime: JavaScript Runtime instance has been freed')
  }
}
