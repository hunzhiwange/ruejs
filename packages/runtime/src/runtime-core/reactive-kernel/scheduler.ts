import type { ReactiveRuntimeState } from './runtime-state.js'
import * as core from './scheduler-core.js'
export type { SchedulerJobId, SchedulerJobRunner } from './scheduler-core.js'
import type { SchedulerJobId, SchedulerJobRunner } from './scheduler-core.js'
export class ReactiveScheduler {
  readonly storage: core.ReactiveSchedulerStorage

  constructor(state: ReactiveRuntimeState, storage?: core.ReactiveSchedulerStorage) {
    this.storage = storage ?? core.createReactiveSchedulerStorage(state.storage)
  }
  get pendingCount(): number {
    return core.schedulerPendingCount(this.storage)
  }
  get isFlushPending(): boolean {
    return core.schedulerIsFlushPending(this.storage)
  }
  schedule(id: SchedulerJobId, run: SchedulerJobRunner, isActive?: () => boolean): boolean {
    return core.schedulerSchedule(this.storage, id, run, isActive)
  }
  cancel(id: SchedulerJobId): boolean {
    return core.schedulerCancel(this.storage, id)
  }
  batch<T>(callback: () => T): T {
    return core.schedulerBatch(this.storage, callback)
  }
  nextTick(): Promise<void>
  nextTick<T>(callback: () => T | PromiseLike<T>): Promise<T>
  nextTick<T>(callback?: () => T | PromiseLike<T>): Promise<T | void> {
    return callback === undefined
      ? core.schedulerNextTick(this.storage)
      : core.schedulerNextTick(this.storage, callback)
  }
}
