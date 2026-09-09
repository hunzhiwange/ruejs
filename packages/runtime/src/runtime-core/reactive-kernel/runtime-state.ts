import * as core from './runtime-state-core.js'
export type { ReactiveSchedulingMode } from './runtime-state-core.js'
import type { ReactiveSchedulingMode } from './runtime-state-core.js'
export class ReactiveRuntimeState {
  readonly storage: core.ReactiveRuntimeStateStorage

  constructor(storage?: core.ReactiveRuntimeStateStorage) {
    this.storage = storage ?? core.createReactiveRuntimeStateStorage()
  }
  get schedulingMode(): ReactiveSchedulingMode {
    return core.stateSchedulingMode(this.storage)
  }
  set schedulingMode(mode: ReactiveSchedulingMode) {
    core.stateSetSchedulingMode(this.storage, mode)
  }
  get batchDepth(): number {
    return core.stateBatchDepth(this.storage)
  }
  get currentEffectId(): number | undefined {
    return core.stateCurrentEffectId(this.storage)
  }
  get currentScopeId(): number | undefined {
    return core.stateCurrentScopeId(this.storage)
  }
  get currentRenderDebugOwner(): unknown {
    return core.stateCurrentRenderDebugOwner(this.storage)
  }
  beginBatch(): void {
    return core.stateBeginBatch(this.storage)
  }
  endBatch(): boolean {
    return core.stateEndBatch(this.storage)
  }
  allocateScopeId(): number {
    return core.stateAllocateScopeId(this.storage)
  }
  allocateEffectId(): number {
    return core.stateAllocateEffectId(this.storage)
  }
  allocateSignalId(): number {
    return core.stateAllocateSignalId(this.storage)
  }
  isEffectActive(effectId: number): boolean {
    return core.stateIsEffectActive(this.storage, effectId)
  }
  isScheduledJobActive(jobId: number): boolean {
    return core.stateIsScheduledJobActive(this.storage, jobId)
  }
  isErrorCaptureEffect(effectId: number): boolean {
    return core.stateIsErrorCaptureEffect(this.storage, effectId)
  }
  runWithEffect<T>(effectId: number, callback: () => T): T {
    return core.stateRunWithEffect(this.storage, effectId, callback)
  }
  runUntracked<T>(callback: () => T): T {
    return core.stateRunUntracked(this.storage, callback)
  }
  runWithErrorCaptureEffect<T>(effectId: number, callback: () => T): T {
    return core.stateRunWithErrorCaptureEffect(this.storage, effectId, callback)
  }
  runScheduledJob<T>(jobId: number, callback: () => T): T {
    return core.stateRunScheduledJob(this.storage, jobId, callback)
  }
  pushScope(scopeId: number): void {
    return core.statePushScope(this.storage, scopeId)
  }
  popScope(): number | undefined {
    return core.statePopScope(this.storage)
  }
  removeScope(scopeId: number): void {
    return core.stateRemoveScope(this.storage, scopeId)
  }
  pushRenderDebugOwner(owner: unknown): void {
    return core.statePushRenderDebugOwner(this.storage, owner)
  }
  popRenderDebugOwner(): unknown {
    return core.statePopRenderDebugOwner(this.storage)
  }
  runWithScope<T>(scopeId: number, callback: () => T): T {
    return core.stateRunWithScope(this.storage, scopeId, callback)
  }
}
