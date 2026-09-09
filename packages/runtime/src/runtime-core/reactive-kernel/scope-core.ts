import * as stateCore from './runtime-state-core.js'
import type { ReactiveRuntimeStateStorage as ReactiveRuntimeState } from './runtime-state-core.js'

export type EffectScopeId = number
export type ScopeCleanup = () => void

const enum ScopeField {
  Children,
  Cleanups,
  EffectDisposers,
  Parent,
}
type EffectScopeRecord = [
  Set<EffectScopeId> | undefined,
  ScopeCleanup[],
  ScopeCleanup[],
  EffectScopeId | undefined,
]

type ScopeWarningHandler = (message: string) => void

const warnByDefault: ScopeWarningHandler = message => console.warn(message)

/**
 * Parent-owned effect scopes for one reactive runtime instance.
 *
 * Attached scopes belong to the current scope; detached scopes are roots.
 * Disposal removes ownership first, then recursively stops children, effect
 * disposers, and user cleanups in registration order. Removing records before
 * callbacks makes repeated or re-entrant disposal idempotent.
 */
export interface EffectScopeManagerStorage {
  scopes: Map<EffectScopeId, EffectScopeRecord>
  state: ReactiveRuntimeState
  warn?: ScopeWarningHandler
}
export function createEffectScopeManagerStorage(
  state: ReactiveRuntimeState,
  warn?: ScopeWarningHandler,
): EffectScopeManagerStorage {
  return { state, warn, scopes: new Map() }
}
export function scopeCurrent(storage: EffectScopeManagerStorage): EffectScopeId | undefined {
  const current = stateCore.stateCurrentScopeId(storage.state)
  return current !== undefined && storage.scopes.has(current) ? current : undefined
}
export function scopeCreateDetached(storage: EffectScopeManagerStorage): EffectScopeId {
  const id = storage.state.nextScopeId++
  storage.scopes.set(id, [undefined, [], [], undefined])
  return id
}
export function scopeCreate(storage: EffectScopeManagerStorage, detached = false): EffectScopeId {
  const parent = detached ? undefined : scopeCurrent(storage)
  const id = scopeCreateDetached(storage)
  storage.scopes.get(id)![ScopeField.Parent] = parent
  if (parent !== undefined) (storage.scopes.get(parent)![ScopeField.Children] ??= new Set()).add(id)
  return id
}
export function scopeIsActive(storage: EffectScopeManagerStorage, scopeId: EffectScopeId): boolean {
  return storage.scopes.has(scopeId)
}
export function scopePush(storage: EffectScopeManagerStorage, scopeId: EffectScopeId): boolean {
  if (!storage.scopes.has(scopeId)) return false
  stateCore.statePushScope(storage.state, scopeId)
  return true
}
export function scopePop(storage: EffectScopeManagerStorage): EffectScopeId | undefined {
  return stateCore.statePopScope(storage.state)
}
export function scopeRun<T>(
  storage: EffectScopeManagerStorage,
  scopeId: EffectScopeId,
  callback: () => T,
): T | undefined {
  if (!storage.scopes.has(scopeId)) return undefined
  return stateCore.stateRunWithScope(storage.state, scopeId, callback)
}
export function scopeBind<TArgs extends unknown[], TResult>(
  storage: EffectScopeManagerStorage,
  scopeId: EffectScopeId,
  runner: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult | undefined {
  return (...args) => scopeRun(storage, scopeId, () => runner(...args))
}
export function scopeRegisterEffectDisposer(
  storage: EffectScopeManagerStorage,
  disposer: ScopeCleanup,
  scopeId: EffectScopeId | undefined = scopeCurrent(storage),
): boolean {
  if (scopeId === undefined) return false
  const scope = storage.scopes.get(scopeId)
  if (scope === undefined) return false
  scope[ScopeField.EffectDisposers].push(disposer)
  return true
}
export function scopeUnregisterEffectDisposer(
  storage: EffectScopeManagerStorage,
  disposer: ScopeCleanup,
  scopeId: EffectScopeId | undefined = scopeCurrent(storage),
): boolean {
  if (scopeId === undefined) return false
  const disposers = storage.scopes.get(scopeId)?.[ScopeField.EffectDisposers]
  const index = disposers?.indexOf(disposer) ?? -1
  if (disposers === undefined || index < 0) return false
  disposers.splice(index, 1)
  return true
}
export function scopeRegisterCleanup(
  storage: EffectScopeManagerStorage,
  cleanup: ScopeCleanup,
): boolean {
  const scopeId = scopeCurrent(storage)
  const scope = scopeId === undefined ? undefined : storage.scopes.get(scopeId)
  if (scope === undefined) return false
  scope[ScopeField.Cleanups].push(cleanup)
  return true
}
export function scopeOnScopeDispose(
  storage: EffectScopeManagerStorage,
  cleanup: ScopeCleanup,
  failSilently = false,
): boolean {
  if (scopeRegisterCleanup(storage, cleanup)) return true
  if (!failSilently) {
    ;(storage.warn ?? warnByDefault)(
      'onScopeDispose() is called when there is no active effect scope.',
    )
  }
  return false
}
export function scopeDispose(storage: EffectScopeManagerStorage, scopeId: EffectScopeId): boolean {
  const scope = storage.scopes.get(scopeId)
  if (scope === undefined) return false

  storage.scopes.delete(scopeId)
  stateCore.stateRemoveScope(storage.state, scopeId)
  if (scope[ScopeField.Parent] !== undefined)
    storage.scopes.get(scope[ScopeField.Parent])?.[ScopeField.Children]?.delete(scopeId)

  for (const child of scope[ScopeField.Children] ?? []) scopeDispose(storage, child)
  for (const disposer of scope[ScopeField.EffectDisposers]) scopeCallSafely(storage, disposer)
  for (const cleanup of scope[ScopeField.Cleanups]) scopeCallSafely(storage, cleanup)
  return true
}
export function scopeCallSafely(storage: EffectScopeManagerStorage, callback: ScopeCleanup): void {
  try {
    callback()
  } catch {
    // Scope disposal mirrors the existing kernel: one failing cleanup must not
    // retain the remaining effects, children, or user cleanup callbacks.
  }
}
