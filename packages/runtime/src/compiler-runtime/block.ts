import {
  adoptOwner,
  createOwner,
  disposeOwner,
  renderEffect as effect,
  getCurrentOwner,
  onOwnerCleanup,
  runOwnerLifecycle,
  runWithOwner,
  untrack,
} from '../runtime-core/compiled'
import {
  createComment,
  createDocumentFragment,
  createTextNode,
  insertBefore,
  removeChild,
  withDOMHostOperations,
} from './dom.browser'
/** A compiler-declared inclusive range. Empty output is always [null, null]. */
export type BlockRange = readonly [Node | null, Node | null]
export type BlockSetup = (parent: ParentNode | null) => BlockRange
export interface BlockRecord {
  readonly first: Node | null
  readonly last: Node | null
  __rue_cleanup_bucket: Array<() => void>
  __rue_compiled_mount(parent: ParentNode | null, before?: Node | null): Node | null
  dispose(): void
}
type FocusableBlockRange = Pick<BlockRecord, 'first' | 'last'>

type PortableRootRecord = { recreate: () => BlockRecord; claimed: boolean }
const portableRoots = new WeakMap<BlockRecord, PortableRootRecord>()

/** Registers a one-shot JSX root so opaque value boundaries can recreate it on reuse. */
export const _$registerPortableCompiledRoot = (
  root: BlockRecord,
  recreate: () => BlockRecord,
): void => {
  portableRoots.set(root, { recreate, claimed: false })
}

/** Claim a JSX value for mounting, recreating its one-shot handle when reused. */
export const _$claimCompiledRoot = (root: BlockRecord): BlockRecord => {
  const record = portableRoots.get(root)
  if (record == null) return root
  if (!record.claimed) {
    record.claimed = true
    return root
  }
  return record.recreate()
}

export const moveBlockRange = (
  first: Node | null,
  last: Node | null,
  parent: ParentNode,
  before: Node | null,
): void => {
  let node = first
  while (node != null) {
    const next = node.nextSibling
    insertBefore(parent, node, before)
    if (node === last) break
    node = next
  }
}

export const _$compiledRoot = (setup: BlockSetup): BlockRecord => {
  const owner = createOwner()
  let first: Node | null = null
  let last: Node | null = null
  let mounted = false
  let disposed = false
  const cleanups: Array<() => void> = []
  const dispose = () => {
    if (disposed) return
    disposed = true
    const nodes: Node[] = []
    let cursor = first
    while (cursor != null) {
      nodes.push(cursor)
      if (cursor === last) break
      cursor = cursor.nextSibling
    }
    try {
      disposeOwner(owner)
      for (const cleanup of cleanups.splice(0)) cleanup()
    } finally {
      for (const node of nodes) {
        if (node.parentNode) removeChild(node.parentNode, node)
      }
      first = last = null
    }
  }
  const root: BlockRecord = {
    get first() {
      return first
    },
    get last() {
      return last
    },
    __rue_cleanup_bucket: cleanups,
    __rue_compiled_mount(parent, before = null) {
      portableRoots.get(root)!.claimed = true
      if (disposed) throw new Error('disposed')
      if (mounted) throw new Error('mounted')
      mounted = true
      adoptOwner(owner, getCurrentOwner())
      // Setup appends its output before returning the declared range. Retain only
      // the preceding boundary so failed setup can remove its unfinished tail.
      const preceding = parent?.lastChild ?? null
      try {
        runOwnerLifecycle(owner, 'beforeMount')
        withDOMHostOperations(parent, () => {
          const staging = parent == null ? null : createDocumentFragment(parent)
          ;[first, last] = runWithOwner(owner, () => untrack(() => setup(staging ?? parent)))!
          if (staging != null) {
            moveBlockRange(first, last, staging, null)
            insertBefore(parent!, staging, before)
          }
          return first
        })
        runWithOwner(owner, () => onOwnerCleanup(dispose))
        runOwnerLifecycle(owner, 'mounted')
        return first
      } catch (error) {
        if (parent && first === null && (!preceding || preceding.parentNode === parent)) {
          let node = preceding ? preceding.nextSibling : parent.firstChild
          while (node) {
            const next = node.nextSibling
            removeChild(parent, node)
            node = next
          }
        }
        try {
          dispose()
        } catch (cleanupError) {
          throw new AggregateError([error, cleanupError], 'mount failed')
        }
        throw error
      }
    },
    dispose,
  }
  _$registerPortableCompiledRoot(root, () => _$compiledRoot(setup))
  return root
}

export interface CompiledBranchCase {
  __rue_compiled_branch_key: unknown
  __rue_compiled_branch_refresh?: boolean
  create: () => BlockRecord
}
export type CompiledBranchFactory = () => CompiledBranchCase

type FocusState = {
  path: number[]
  start: number | null
  end: number | null
  direction: 'forward' | 'backward' | 'none' | null
}
const captureBlockPath = (block: FocusableBlockRange, target: Node): number[] | undefined => {
  let root: Node | null = block.first
  let index = 0
  while (root) {
    if (root === target || root.contains(target)) break
    if (root === block.last) return
    root = root.nextSibling
    index++
  }
  if (!root) return
  const path: number[] = []
  let node = target
  while (node !== root) {
    let sibling = node.previousSibling
    let offset = 0
    while (sibling) {
      offset++
      sibling = sibling.previousSibling
    }
    path.unshift(offset)
    if (!node.parentNode) return
    node = node.parentNode
  }
  path.unshift(index)
  return path
}
export const captureBlockFocus = (
  block: FocusableBlockRange | undefined,
): FocusState | undefined => {
  if (!block) return
  const active = block.first?.ownerDocument?.activeElement ?? null
  if (!active) return
  const path = captureBlockPath(block, active)
  if (!path) return
  const input = active as HTMLInputElement
  return {
    path,
    start: input.selectionStart ?? null,
    end: input.selectionEnd ?? null,
    direction: input.selectionDirection ?? null,
  }
}
export const restoreBlockFocus = (block: FocusableBlockRange, focus: FocusState | undefined) => {
  if (!focus) return
  let node = block.first
  for (let depth = 0; depth < focus.path.length; depth++) {
    if (depth > 0) node = node?.firstChild ?? null
    for (let i = 0; i < focus.path[depth]; i++) {
      if (depth === 0 && node === block.last) return
      node = node?.nextSibling ?? null
    }
  }
  if (!(node instanceof HTMLElement)) return
  node.focus()
  if (focus.start != null && focus.end != null && 'setSelectionRange' in node) {
    ;(node as HTMLInputElement).setSelectionRange(
      focus.start,
      focus.end,
      focus.direction ?? undefined,
    )
  }
}

/** The selector returns one fixed record shape; only its factory runs untracked. */
export const _$compiledBranchAt = (
  parent: ParentNode,
  before: Node | null,
  select: CompiledBranchFactory,
): ReturnType<typeof effect> => {
  let active: BlockRecord | undefined
  let key: unknown
  let initialized = false
  const cleanup = () => {
    const previous = active
    active = undefined
    previous?.dispose()
  }
  onOwnerCleanup(cleanup)
  const runner = effect(() => {
    const selected = select()
    if (
      initialized &&
      Object.is(key, selected.__rue_compiled_branch_key) &&
      !selected.__rue_compiled_branch_refresh
    )
      return
    untrack(() => {
      const focus = captureBlockFocus(active)
      cleanup()
      const next = selected.create()
      try {
        next.__rue_compiled_mount(before?.parentNode ?? parent, before)
      } catch (error) {
        next.dispose()
        throw error
      }
      active = next
      restoreBlockFocus(next, focus)
    })
    key = selected.__rue_compiled_branch_key
    initialized = true
  })
  const stop = runner.dispose.bind(runner)
  runner.dispose = () => {
    stop()
    cleanup()
  }
  return runner
}

export const _$compiledBranch = (select: CompiledBranchFactory): BlockRecord =>
  _$compiledRoot(parent => {
    if (parent == null) throw new Error('A compiled branch requires a mount parent')
    const first = createTextNode('')
    const anchor = createComment('rue:compiled-branch')
    insertBefore(parent, first, null)
    insertBefore(parent, anchor, null)
    onOwnerCleanup(() => {
      if (first.parentNode) removeChild(first.parentNode, first)
      if (anchor.parentNode) removeChild(anchor.parentNode, anchor)
    })
    _$compiledBranchAt(parent, anchor, select)
    return [first, anchor]
  })
