import {
  AppServerFragment,
  createAppServerElement,
  type AppServerRenderable,
} from './app-server-tree.js'
import { isAppRscServerClientReference } from './app-rsc-client-reference-protocol.js'

export type AppRenderDependency = {
  promise: Promise<void>
  release: () => void
}

export function createAppRenderDependency(): AppRenderDependency {
  let released = false
  let resolve!: () => void

  const promise = new Promise<void>(promiseResolve => {
    resolve = promiseResolve
  })

  return {
    promise,
    release() {
      if (released) {
        return
      }
      released = true
      resolve()
    },
  }
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

export function renderAfterAppDependencies(
  children: AppServerRenderable,
  dependencies: readonly AppRenderDependency[],
): AppServerRenderable {
  if (dependencies.length === 0) {
    return children
  }

  async function AwaitAppRenderDependencies() {
    await Promise.all(dependencies.map(dependency => dependency.promise))
    return children
  }

  return createAppServerElement(AwaitAppRenderDependencies, null)
}

export function renderComponentAfterAppDependencyBarrier<P>(
  Component: (props: P) => AppServerRenderable,
  props: P,
  dependency: AppRenderDependency,
): AppServerRenderable {
  if (isAppRscServerClientReference(Component)) {
    dependency.release()
    return createAppServerElement(Component, props)
  }

  function ResolveAppRenderDependency(resolvedProps: P) {
    let result: AppServerRenderable
    try {
      result = Component(resolvedProps)
    } catch (error) {
      dependency.release()
      throw error
    }

    if (isThenable(result)) {
      return Promise.resolve(result).then(
        value => {
          dependency.release()
          return value as AppServerRenderable
        },
        error => {
          dependency.release()
          throw error
        },
      )
    }

    dependency.release()
    return result
  }

  const displayName = Component.displayName ?? Component.name
  if (displayName) {
    ResolveAppRenderDependency.displayName = displayName
  }

  return createAppServerElement(ResolveAppRenderDependency, props)
}

export function renderWithAppDependencyBarrier(
  children: AppServerRenderable,
  dependency: AppRenderDependency,
): AppServerRenderable {
  function ReleaseAppRenderDependency() {
    // This render-time release is intentional. The dependency barrier is only
    // used inside the RSC render graph, where producing this leaf means the
    // owning entry has reached the serialization point that downstream entries
    // are allowed to observe. If Phase 2 adds AbortSignal-based render
    // timeouts, this dependency will also need an abort/reject path so stuck
    // async layouts do not suspend downstream entries forever.
    dependency.release()
    return () => {}
  }

  return createAppServerElement(
    AppServerFragment,
    null,
    children,
    createAppServerElement(ReleaseAppRenderDependency, null),
  )
}
