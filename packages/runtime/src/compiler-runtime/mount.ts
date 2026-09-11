import { disposeOwner } from '../runtime-core/compiled'
import { insertBefore, removeChild } from './dom.browser'
import type { CompiledBlock, CompiledRange, CompiledTarget } from './types'
import type { CompiledOwner } from '../runtime-core/compiled'

export type CompiledSlotFactory<Props extends object = Record<string, never>> = (
  target: CompiledTarget,
  slotProps: Props,
  owner: CompiledOwner,
) => CompiledBlock

const assertRange = (range: CompiledRange): ParentNode => {
  const parent = range.first.parentNode
  if (parent == null || range.last.parentNode !== parent) {
    throw new Error('[rue] compiled block range must share one parent')
  }
  let cursor: Node | null = range.first
  while (cursor !== range.last) {
    cursor = cursor.nextSibling
    if (cursor == null) throw new Error('[rue] compiled block range must be contiguous')
  }
  return parent
}

const rangeNodes = (range: CompiledRange): Node[] => {
  const nodes: Node[] = []
  let cursor: Node | null = range.first
  while (cursor != null) {
    const next: Node | null = cursor.nextSibling
    nodes.push(cursor)
    if (cursor === range.last) return nodes
    cursor = next
  }
  return nodes
}

const blockParents = new WeakMap<CompiledBlock, ParentNode>()

const removeRange = (nodes: readonly Node[], parent: ParentNode): void => {
  for (const node of nodes) {
    if (node.parentNode === parent) removeChild(parent, node)
  }
}

export const moveCompiledBlock = (block: CompiledBlock, target: CompiledTarget): void => {
  assertRange(block)
  const after = block.last.nextSibling
  let cursor: Node | null = block.first
  while (cursor !== after) {
    const next: Node | null = cursor!.nextSibling
    insertBefore(target.parent, cursor!, target.before)
    cursor = next
  }
  blockParents.set(block, target.parent)
}

export const createCompiledBlock = (
  _target: CompiledTarget,
  owner: CompiledOwner,
  range: CompiledRange,
  cleanup?: () => void,
): CompiledBlock => {
  const parent = assertRange(range)
  const ownedNodes = rangeNodes(range)
  let disposed = false
  const block: CompiledBlock = {
    first: range.first,
    last: range.last,
    owner,
    dispose() {
      if (disposed) return
      disposed = true
      try {
        cleanup?.()
        const parent = blockParents.get(block)
        if (parent != null) removeRange(ownedNodes, parent)
      } finally {
        blockParents.delete(block)
        disposeOwner(owner)
      }
    },
  }
  blockParents.set(block, parent)
  return block
}

/** Mount a compiler-created slot factory without interpreting an arbitrary value. */
export const mountCompiledSlot = <Props extends object>(
  target: CompiledTarget,
  factory: CompiledSlotFactory<Props>,
  slotProps: Props,
  owner: CompiledOwner,
): CompiledBlock => factory(target, slotProps, owner)

export { _$mountCompiledSlotFactory, _$mountCompiledSlotAt } from './block-factory'

/** Dispose one complete range before mounting its replacement at the same anchor. */
export const replaceCompiledBlock = <Props extends object>(
  current: CompiledBlock,
  target: CompiledTarget,
  factory: CompiledSlotFactory<Props>,
  slotProps: Props,
  owner: CompiledOwner,
): CompiledBlock => {
  current.dispose()
  return mountCompiledSlot(target, factory, slotProps, owner)
}
