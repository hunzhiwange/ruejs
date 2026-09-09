import type { ReactiveEffectRuntimeStorage } from './effect-core.js'
import * as scopes from './scope-core.js'

/** Attach public scopes to the same runtime; compiler-only owners need no scope manager. */
export function installScopeRuntime(runtime: ReactiveEffectRuntimeStorage): void {
  if (runtime.scopeOps) return
  const storage = (runtime.scopes = scopes.createEffectScopeManagerStorage(
    runtime.state,
    runtime.warn,
  ))
  runtime.scopeOps = {
    current: () => scopes.scopeCurrent(storage),
    create: () => scopes.scopeCreateDetached(storage),
    push: id => scopes.scopePush(storage, id),
    pop: () => scopes.scopePop(storage),
    dispose: id => scopes.scopeDispose(storage, id),
    register: (callback, id) => scopes.scopeRegisterEffectDisposer(storage, callback, id),
    unregister: (callback, id) => scopes.scopeUnregisterEffectDisposer(storage, callback, id),
    cleanup: callback => scopes.scopeRegisterCleanup(storage, callback),
    run: (id, callback) => scopes.scopeRun(storage, id, callback),
  }
}
