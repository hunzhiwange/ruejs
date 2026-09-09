import type { ReactiveRuntimeState } from './runtime-state.js'
import * as core from './scope-core.js'
export type { EffectScopeId, ScopeCleanup } from './scope-core.js'
import type { EffectScopeId, ScopeCleanup } from './scope-core.js'
export class EffectScopeManager {
  readonly storage: core.EffectScopeManagerStorage

  constructor(
    state: ReactiveRuntimeState,
    warn: (message: string) => void = message => console.warn(message),
    storage?: core.EffectScopeManagerStorage,
  ) {
    this.storage = storage ?? core.createEffectScopeManagerStorage(state.storage, warn)
  }
  get current(): EffectScopeId | undefined {
    return core.scopeCurrent(this.storage)
  }
  create(detached = false): EffectScopeId {
    return core.scopeCreate(this.storage, detached)
  }
  isActive(scopeId: EffectScopeId): boolean {
    return core.scopeIsActive(this.storage, scopeId)
  }
  push(scopeId: EffectScopeId): boolean {
    return core.scopePush(this.storage, scopeId)
  }
  pop(): EffectScopeId | undefined {
    return core.scopePop(this.storage)
  }
  run<T>(scopeId: EffectScopeId, callback: () => T): T | undefined {
    return core.scopeRun(this.storage, scopeId, callback)
  }
  bind<TArgs extends unknown[], TResult>(
    scopeId: EffectScopeId,
    runner: (...args: TArgs) => TResult,
  ): (...args: TArgs) => TResult | undefined {
    return core.scopeBind(this.storage, scopeId, runner)
  }
  registerEffectDisposer(
    disposer: ScopeCleanup,
    scopeId: EffectScopeId | undefined = this.current,
  ): boolean {
    return core.scopeRegisterEffectDisposer(this.storage, disposer, scopeId)
  }
  unregisterEffectDisposer(
    disposer: ScopeCleanup,
    scopeId: EffectScopeId | undefined = this.current,
  ): boolean {
    return core.scopeUnregisterEffectDisposer(this.storage, disposer, scopeId)
  }
  onScopeDispose(cleanup: ScopeCleanup, failSilently = false): boolean {
    return core.scopeOnScopeDispose(this.storage, cleanup, failSilently)
  }
  dispose(scopeId: EffectScopeId): boolean {
    return core.scopeDispose(this.storage, scopeId)
  }
}
