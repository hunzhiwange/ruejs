import {
  createOwner,
  disposeOwner,
  renderEffect as effect,
  onOwnerCleanup,
  runOwnerLifecycle,
  untrack,
  runWithOwner,
  type CompiledOwner,
} from '../runtime-core/compiled'
import { createComment, createTextNode, insertBefore, removeChild } from './dom.browser'
import type { CompiledBlock, CompiledTarget } from './types'
import type { CompactCompiledRootHandle } from './compact-root'
import { _$claimCompiledRoot, captureBlockFocus, restoreBlockFocus } from './block'

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

const isChildrenValueWrapper = (value: unknown): value is { children: unknown } =>
  typeof value === 'object' &&
  value !== null &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Object.keys(value).length === 1 &&
  Object.prototype.hasOwnProperty.call(value, 'children')

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
    const blocks: CompiledBlock[] = []
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
      if (isChildrenValueWrapper(current)) {
        mount(current.children)
        return
      }
      if (typeof current === 'function') {
        const childOwner = createOwner()
        try {
          const block = runWithOwner(childOwner, () =>
            (current as BlockFactory<Props>)(target, _props, childOwner),
          )
          if (!block) throw new TypeError('Rue compiled slot factory did not return a block')
          blocks.push(block)
          includeRange(block.first, block.last)
        } catch (error) {
          disposeOwner(childOwner)
          throw error
        }
        return
      }
      if (isCompactRoot(current)) {
        const root = _$claimCompiledRoot(current)
        root.__rue_compiled_mount(target.parent, target.before)
        roots.push(root)
        includeRange(root.first, root.last)
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
      blocks.reverse().forEach(block => block.dispose())
      roots.reverse().forEach(root => root.dispose())
      nodes.forEach(node => node.parentNode && removeChild(node.parentNode, node))
      disposeOwner(owner)
      throw error
    }

    if (blocks.length === 0 && roots.length === 0 && nodes.length === 0) {
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
          blocks.reverse().forEach(block => block.dispose())
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
  readFactory: () => unknown,
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
    const value = readFactory()
    const factory = value == null ? value : _$compiledValueFactory<Props>(value)
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
    // Commit the slot identity before mounting. Mount hooks and ref callbacks may
    // synchronously invalidate a dependency read above; a re-entrant effect must
    // see the in-flight factory as already current instead of disposing the root
    // and attempting to mount that same one-shot handle again.
    mountedFactory = factory
    mountedProps = { ...props }
    untrack(() => {
      const focus = captureBlockFocus(mounted)
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
          runOwnerLifecycle(owner, 'mounted')
        } catch (error) {
          if (mounted?.owner === owner) cleanup()
          else disposeOwner(owner)
          if (mountedFactory === factory) {
            mountedFactory = undefined
            mountedProps = undefined
          }
          throw error
        }
      }
      if (mounted) restoreBlockFocus(mounted, focus)
    })
  })
}
