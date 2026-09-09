/**
 * Instance-owned execution state shared by the TypeScript reactive kernel.
 *
 * Runtime context is stack-shaped: nested effects, untracked handlers, scopes,
 * and scheduler jobs must always restore their caller, including when user code
 * throws. Queues and ownership records live in their respective instance
 * modules; this object only coordinates context that crosses those modules.
 */

export type ReactiveSchedulingMode = 'sync' | 'microtask' | 'frame'

export interface ReactiveRuntimeStateStorage {
  schedulingMode: ReactiveSchedulingMode
  batchDepth: number
  nextEffectId: number
  nextSignalId: number
  nextScopeId: number
  currentEffectId: number | undefined
  activeEffectIds: number[]
  activeJobIds: number[]
  errorCaptureEffectIds: number[]
  renderDebugOwnerStack: unknown[]
  scopeStack: number[]
}
export function createReactiveRuntimeStateStorage(): ReactiveRuntimeStateStorage {
  return {
    schedulingMode: 'frame',
    batchDepth: 0,
    nextEffectId: 1,
    nextSignalId: 1,
    nextScopeId: 1,
    currentEffectId: undefined,
    activeEffectIds: [],
    activeJobIds: [],
    errorCaptureEffectIds: [],
    renderDebugOwnerStack: [],
    scopeStack: [],
  }
}
export function stateSchedulingMode(storage: ReactiveRuntimeStateStorage): ReactiveSchedulingMode {
  return storage.schedulingMode
}
export function stateSetSchedulingMode(
  storage: ReactiveRuntimeStateStorage,
  mode: ReactiveSchedulingMode,
) {
  storage.schedulingMode = mode
}
export function stateBatchDepth(storage: ReactiveRuntimeStateStorage): number {
  return storage.batchDepth
}
export function stateCurrentEffectId(storage: ReactiveRuntimeStateStorage): number | undefined {
  return storage.currentEffectId
}
export function stateCurrentScopeId(storage: ReactiveRuntimeStateStorage): number | undefined {
  return storage.scopeStack[storage.scopeStack.length - 1]
}
export function stateCurrentRenderDebugOwner(storage: ReactiveRuntimeStateStorage): unknown {
  return storage.renderDebugOwnerStack[storage.renderDebugOwnerStack.length - 1]
}
export function stateBeginBatch(storage: ReactiveRuntimeStateStorage): void {
  storage.batchDepth += 1
}
export function stateEndBatch(storage: ReactiveRuntimeStateStorage): boolean {
  if (storage.batchDepth === 0) throw new Error('reactive batch stack underflow')
  storage.batchDepth -= 1
  return storage.batchDepth === 0
}
export function stateAllocateScopeId(storage: ReactiveRuntimeStateStorage): number {
  const id = storage.nextScopeId
  storage.nextScopeId += 1
  return id
}
export function stateAllocateEffectId(storage: ReactiveRuntimeStateStorage): number {
  const id = storage.nextEffectId
  storage.nextEffectId += 1
  return id
}
export function stateAllocateSignalId(storage: ReactiveRuntimeStateStorage): number {
  const id = storage.nextSignalId
  storage.nextSignalId += 1
  return id
}
export function stateIsEffectActive(
  storage: ReactiveRuntimeStateStorage,
  effectId: number,
): boolean {
  return storage.activeEffectIds.includes(effectId)
}
export function stateIsScheduledJobActive(
  storage: ReactiveRuntimeStateStorage,
  jobId: number,
): boolean {
  return storage.activeJobIds.includes(jobId)
}
export function stateIsErrorCaptureEffect(
  storage: ReactiveRuntimeStateStorage,
  effectId: number,
): boolean {
  return storage.errorCaptureEffectIds.includes(effectId)
}
export function stateRunWithEffect<T>(
  storage: ReactiveRuntimeStateStorage,
  effectId: number,
  callback: () => T,
): T {
  const previous = storage.currentEffectId
  const stackIndex = storage.activeEffectIds.length
  storage.currentEffectId = effectId
  storage.activeEffectIds.push(effectId)
  try {
    return callback()
  } finally {
    storage.activeEffectIds.splice(stackIndex, 1)
    storage.currentEffectId = previous
  }
}
export function stateRunUntracked<T>(storage: ReactiveRuntimeStateStorage, callback: () => T): T {
  const previous = storage.currentEffectId
  storage.currentEffectId = undefined
  try {
    return callback()
  } finally {
    storage.currentEffectId = previous
  }
}
export function stateRunWithErrorCaptureEffect<T>(
  storage: ReactiveRuntimeStateStorage,
  effectId: number,
  callback: () => T,
): T {
  const stackIndex = storage.errorCaptureEffectIds.length
  storage.errorCaptureEffectIds.push(effectId)
  try {
    return callback()
  } finally {
    storage.errorCaptureEffectIds.splice(stackIndex, 1)
  }
}
export function stateRunScheduledJob<T>(
  storage: ReactiveRuntimeStateStorage,
  jobId: number,
  callback: () => T,
): T {
  const stackIndex = storage.activeJobIds.length
  storage.activeJobIds.push(jobId)
  try {
    return callback()
  } finally {
    storage.activeJobIds.splice(stackIndex, 1)
  }
}
export function statePushScope(storage: ReactiveRuntimeStateStorage, scopeId: number): void {
  storage.scopeStack.push(scopeId)
}
export function statePopScope(storage: ReactiveRuntimeStateStorage): number | undefined {
  return storage.scopeStack.pop()
}
export function stateRemoveScope(storage: ReactiveRuntimeStateStorage, scopeId: number): void {
  storage.scopeStack = storage.scopeStack.filter(activeId => activeId !== scopeId)
}
export function statePushRenderDebugOwner(
  storage: ReactiveRuntimeStateStorage,
  owner: unknown,
): void {
  storage.renderDebugOwnerStack.push(owner)
}
export function statePopRenderDebugOwner(storage: ReactiveRuntimeStateStorage): unknown {
  return storage.renderDebugOwnerStack.pop()
}
export function stateRunWithScope<T>(
  storage: ReactiveRuntimeStateStorage,
  scopeId: number,
  callback: () => T,
): T {
  const stackIndex = storage.scopeStack.length
  storage.scopeStack.push(scopeId)
  try {
    return callback()
  } finally {
    if (storage.scopeStack[stackIndex] === scopeId) storage.scopeStack.splice(stackIndex, 1)
  }
}
