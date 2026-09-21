import * as stateCore from './runtime-state-core.js'
import type { ReactiveRuntimeStateStorage as ReactiveRuntimeState } from './runtime-state-core.js'

export type SchedulerJobId = number
export type SchedulerJobRunner = () => void

type SchedulerJob = SchedulerJobRunner | { run: SchedulerJobRunner; isActive: () => boolean }

/**
 * Ordered callback scheduler for one reactive runtime instance.
 *
 * Pending jobs are keyed by effect id so a flush round preserves first-in
 * order while deduplicating repeated notifications. A drain takes the current
 * round before running callbacks; jobs created by those callbacks therefore
 * form a follow-up round, and flush waiters resolve only after every round is
 * empty. Frame scheduling prefers the browser clock but retains a short guard
 * and can always be progressed by nextTick.
 */
export interface ReactiveSchedulerStorage {
  pending: Map<SchedulerJobId, SchedulerJob>
  drainScheduled: boolean
  frameGeneration: number
  flushing: boolean
  flushPromise?: Promise<void>
  resolveFlush?: () => void
  state: ReactiveRuntimeState
}
export function createReactiveSchedulerStorage(
  state: ReactiveRuntimeState,
): ReactiveSchedulerStorage {
  return { state, pending: new Map(), drainScheduled: false, frameGeneration: 0, flushing: false }
}
export function schedulerPendingCount(storage: ReactiveSchedulerStorage): number {
  return storage.pending.size
}
export function schedulerIsFlushPending(storage: ReactiveSchedulerStorage): boolean {
  return (
    storage.flushing ||
    storage.drainScheduled ||
    (storage.state.batchDepth > 0 && storage.pending.size > 0)
  )
}
export function schedulerSchedule(
  storage: ReactiveSchedulerStorage,
  id: SchedulerJobId,
  run: SchedulerJobRunner,
  isActive?: () => boolean,
): boolean {
  if (isActive && !isActive()) return false
  const runner: SchedulerJob = isActive ? { run, isActive } : run

  if (storage.state.batchDepth > 0) return schedulerEnqueue(storage, id, runner)

  if (storage.state.schedulingMode === 'sync') {
    if (
      storage.state.activeJobIds.includes(id) ||
      storage.state.activeEffectIds.includes(id) ||
      storage.state.errorCaptureEffectIds.includes(id)
    ) {
      const inserted = schedulerEnqueue(storage, id, runner)
      schedulerScheduleMicrotaskDrain(storage)
      return inserted
    }

    schedulerRunJob(storage, id, runner)
    return true
  }

  const inserted = schedulerEnqueue(storage, id, runner)
  schedulerScheduleDefaultDrain(storage)
  return inserted
}
export function schedulerCancel(storage: ReactiveSchedulerStorage, id: SchedulerJobId): boolean {
  return storage.pending.delete(id)
}
export function schedulerBatch<T>(storage: ReactiveSchedulerStorage, callback: () => T): T {
  stateCore.stateBeginBatch(storage.state)
  try {
    return callback()
  } finally {
    if (stateCore.stateEndBatch(storage.state)) schedulerLeaveOutermostBatch(storage)
  }
}
export function schedulerNextTick(storage: ReactiveSchedulerStorage): Promise<void>
export function schedulerNextTick<T>(
  storage: ReactiveSchedulerStorage,
  callback: () => T | PromiseLike<T>,
): Promise<T>
export function schedulerNextTick<T>(
  storage: ReactiveSchedulerStorage,
  callback?: () => T | PromiseLike<T>,
): Promise<T | void> {
  let pendingFlush: Promise<void>
  if (schedulerIsFlushPending(storage)) {
    pendingFlush = storage.flushPromise ??= new Promise(resolve => {
      storage.resolveFlush = resolve
    })
    // A stale or throttled frame callback must not make nextTick wait forever.
    Promise.resolve().then(() => schedulerDrain(storage))
  } else {
    pendingFlush = Promise.resolve()
  }

  return callback === undefined ? pendingFlush : pendingFlush.then(callback)
}
export function schedulerEnqueue(
  storage: ReactiveSchedulerStorage,
  id: SchedulerJobId,
  run: SchedulerJob,
): boolean {
  if (storage.pending.has(id)) return false
  storage.pending.set(id, run)
  return true
}
export function schedulerLeaveOutermostBatch(storage: ReactiveSchedulerStorage): void {
  if (storage.pending.size === 0) return
  if (storage.state.schedulingMode === 'sync') schedulerDrain(storage)
  else schedulerScheduleDefaultDrain(storage)
}
export function schedulerScheduleDefaultDrain(storage: ReactiveSchedulerStorage): void {
  // A running drain owns all jobs produced by that flush. Let it consume the
  // follow-up round instead of deferring derived component/DOM effects to a
  // second animation frame.
  if (storage.flushing || storage.drainScheduled) return
  if (storage.state.schedulingMode === 'frame') schedulerScheduleFrameDrain(storage)
  else schedulerScheduleMicrotaskDrain(storage)
}
export function schedulerScheduleMicrotaskDrain(storage: ReactiveSchedulerStorage): void {
  if (storage.drainScheduled) return
  storage.drainScheduled = true
  Promise.resolve().then(() => schedulerDrain(storage))
}
export function schedulerScheduleFrameDrain(storage: ReactiveSchedulerStorage): void {
  const host = typeof window === 'undefined' ? globalThis : window
  const requestFrame = host.requestAnimationFrame
  if (typeof requestFrame !== 'function') {
    schedulerScheduleMicrotaskDrain(storage)
    return
  }

  storage.drainScheduled = true
  const generation = ++storage.frameGeneration
  const drainOnce = (): void => {
    if (generation !== storage.frameGeneration) return
    schedulerDrain(storage)
  }

  requestFrame.call(host, drainOnce)
  const setTimeout = host.setTimeout
  if (typeof setTimeout === 'function') setTimeout.call(host, drainOnce, 34)
}
export function schedulerDrain(storage: ReactiveSchedulerStorage): void {
  storage.frameGeneration += 1
  storage.drainScheduled = false
  if (storage.pending.size === 0) {
    schedulerFinishFlush(storage)
    return
  }

  storage.flushing = true
  let firstError: unknown
  while (storage.pending.size > 0) {
    const jobs = [...storage.pending]
    storage.pending.clear()
    for (const [id, run] of jobs) {
      try {
        schedulerRunJob(storage, id, run)
      } catch (error) {
        firstError ??= error
      }
    }
  }

  schedulerFinishFlush(storage)

  if (firstError !== undefined) throw firstError
}
function schedulerRunJob(
  storage: ReactiveSchedulerStorage,
  id: SchedulerJobId,
  job: SchedulerJob,
): void {
  if (typeof job !== 'function') {
    if (!job.isActive()) return
    job = job.run
  }
  stateCore.stateRunScheduledJob(storage.state, id, job)
}
export function schedulerFinishFlush(storage: ReactiveSchedulerStorage): void {
  storage.flushing = false
  storage.resolveFlush?.()
  storage.flushPromise = undefined
  storage.resolveFlush = undefined
}
