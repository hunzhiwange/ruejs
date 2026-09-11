import {
  createOwner,
  disposeOwner,
  effect,
  onOwnerCleanup,
  untrack,
  runWithOwner,
  type CompiledOwner,
} from '../runtime-core/compiled'
import { createComment, createTextNode, insertBefore, removeChild } from './dom.browser'
import type { CompiledBlock, CompiledTarget } from './types'
import type { CompactCompiledRootHandle } from './compact-root'

export type BlockFactory<Props extends object = Record<string, never>> = (
  target: CompiledTarget,
  props: Props,
  owner: CompiledOwner,
) => CompiledBlock

const isCompactRoot = (value: unknown): value is CompactCompiledRootHandle =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as CompactCompiledRootHandle).__rue_compiled_mount === 'function' &&
  typeof (value as CompactCompiledRootHandle).dispose === 'function'

const isNode = (value: unknown): value is Node =>
  typeof value === 'object' && value !== null && typeof (value as Node).nodeType === 'number'

const compiledObjectValueFactories = new WeakMap<object, BlockFactory<object>>()

/**
 * Turns an expression whose static type is not closed into the slot factory ABI.
 * The compiler uses this only at an opaque JSX boundary; known scalar, branch,
 * component, and list paths keep their specialized lowering.
 */
export const _$compiledValueFactory = <Props extends object>(
  value: unknown,
): BlockFactory<Props> => {
  if (typeof value === 'function') return value as BlockFactory<Props>

  if (typeof value === 'object' && value !== null) {
    const cached = compiledObjectValueFactories.get(value)
    if (cached) return cached as BlockFactory<Props>
  }

  const factory: BlockFactory<Props> = (target, _props, owner) => {
    const roots: CompactCompiledRootHandle[] = []
    const nodes: Node[] = []
    let rangeFirst: Node | null = null
    let rangeLast: Node | null = null
    const includeRange = (first: Node | null, last: Node | null): void => {
      if (first == null || last == null) return
      rangeFirst ??= first
      rangeLast = last
    }
    const mount = (current: unknown): void => {
      if (Array.isArray(current)) {
        current.forEach(mount)
        return
      }
      if (current == null || typeof current === 'boolean') return
      if (isCompactRoot(current)) {
        current.__rue_compiled_mount(target.parent, target.before)
        roots.push(current)
        includeRange(current.first, current.last)
        return
      }
      const node = isNode(current) ? current : createTextNode(String(current))
      insertBefore(target.parent, node, target.before)
      nodes.push(node)
      includeRange(node, node)
    }

    try {
      mount(value)
    } catch (error) {
      roots.reverse().forEach(root => root.dispose())
      nodes.forEach(node => node.parentNode && removeChild(node.parentNode, node))
      disposeOwner(owner)
      throw error
    }

    if (roots.length === 0 && nodes.length === 0) {
      const empty = createComment('rue:empty-slot')
      insertBefore(target.parent, empty, target.before)
      nodes.push(empty)
      includeRange(empty, empty)
    }
    let disposed = false
    return {
      first: rangeFirst!,
      last: rangeLast!,
      owner,
      dispose() {
        if (disposed) return
        disposed = true
        try {
          roots.reverse().forEach(root => root.dispose())
          nodes.forEach(node => node.parentNode && removeChild(node.parentNode, node))
        } finally {
          disposeOwner(owner)
        }
      },
    }
  }
  if (typeof value === 'object' && value !== null)
    compiledObjectValueFactories.set(value, factory as BlockFactory<object>)
  return factory
}

export const _$mountCompiledSlotFactory = (
  target: CompiledTarget,
  owner: CompiledOwner,
  create: () => CompactCompiledRootHandle,
): CompiledBlock => {
  const handle = untrack(create)
  try {
    untrack(() => handle.__rue_compiled_mount(target.parent, target.before))
  } catch (error) {
    handle.dispose()
    disposeOwner(owner)
    throw error
  }
  const empty = handle.first == null ? createComment('rue:empty-slot') : null
  if (empty) insertBefore(target.parent, empty, target.before)
  const first = handle.first ?? empty!
  const last = handle.last ?? empty!
  let disposed = false
  return {
    first,
    last,
    owner,
    dispose() {
      if (disposed) return
      disposed = true
      try {
        handle.dispose()
      } finally {
        if (empty?.parentNode) removeChild(empty.parentNode, empty)
        disposeOwner(owner)
      }
    },
  }
}

export const _$mountCompiledSlotAt = <Props extends object>(
  target: CompiledTarget,
  readFactory: () => BlockFactory<Props> | null | undefined,
  readProps: () => Props,
): void => {
  let mountedFactory: BlockFactory<Props> | null | undefined
  let mountedProps: Props | undefined
  let mounted: CompiledBlock | undefined
  const cleanup = () => {
    const previous = mounted
    mounted = undefined
    previous?.dispose()
  }
  onOwnerCleanup(cleanup)
  effect(() => {
    const factory = readFactory()
    const props = readProps()
    if (
      factory === mountedFactory &&
      mountedProps != null &&
      Object.keys(props).length === Object.keys(mountedProps).length &&
      Object.keys(props).every(key =>
        Object.is(props[key as keyof Props], mountedProps![key as keyof Props]),
      )
    )
      return
    untrack(() => {
      cleanup()
      if (factory != null) {
        const owner = createOwner()
        try {
          mounted = runWithOwner(owner, () =>
            factory(
              { parent: target.before?.parentNode ?? target.parent, before: target.before },
              props,
              owner,
            ),
          )
        } catch (error) {
          disposeOwner(owner)
          throw error
        }
      }
    })
    mountedFactory = factory
    mountedProps = { ...props }
  })
}
