import { createContext, provideContext, useContext } from './context'
import { adoptOwner, createOwner, disposeOwner, runWithOwner } from '../runtime-core/compiled'
import type { BlockRecord } from './block'

/** A compiler-generated closure that constructs exactly one closed root block. */
export type AppFactory = () => BlockRecord
export interface AppHandle {
  dispose(): void
}
export interface AppPlugin {
  install(app: unknown, options: unknown[]): void
}
const appTarget = createContext<ParentNode | null>(null)
export const getCurrentAppTarget = () => useContext(appTarget)
const mountedContainers = new WeakSet<ParentNode>()

export function _$mountApp(
  factory: AppFactory,
  target: ParentNode | string,
  install?: () => void,
): AppHandle {
  const parent = typeof target === 'string' ? document.querySelector(target) : target
  if (parent == null) throw new Error('[rue] mountApp target was not found')
  if (mountedContainers.has(parent)) throw new Error('[rue] mountApp target already has an app')
  mountedContainers.add(parent)
  const owner = createOwner()
  adoptOwner(owner, undefined)
  let block: BlockRecord | undefined
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    try {
      block?.dispose()
    } finally {
      try {
        disposeOwner(owner)
      } finally {
        mountedContainers.delete(parent)
      }
    }
  }
  try {
    runWithOwner(owner, () => {
      provideContext(appTarget, () => parent)
      install?.()
      block = factory()
      block.__rue_compiled_mount(parent)
    })
    return { dispose }
  } catch (error) {
    dispose()
    throw error
  }
}

export function _$createApp(factory: AppFactory) {
  let mounted: AppHandle | undefined
  let mounting = false
  let disposeRequested = false
  const dispose = () => {
    if (mounting) disposeRequested = true
    mounted?.dispose()
  }
  const plugins = new Map<AppPlugin, unknown[]>()
  const app = {
    use(plugin: AppPlugin, ...options: unknown[]) {
      if (mounted || mounting) throw new Error('[rue] install plugins before mounting')
      plugins.set(plugin, options)
      return app
    },
    mount(target: ParentNode | string): AppHandle {
      if (mounted || mounting) throw new Error('[rue] app is already mounted')
      mounting = true
      disposeRequested = false
      try {
        const handle = _$mountApp(factory, target, () => {
          for (const [plugin, options] of plugins) plugin.install(app, options)
        })
        const current = {
          dispose() {
            try {
              handle.dispose()
            } finally {
              if (mounted === current) mounted = undefined
            }
          },
        }
        mounted = current
        if (disposeRequested) current.dispose()
        return current
      } finally {
        mounting = false
      }
    },
    dispose,
    unmount: dispose,
  }
  return app
}
