import {
  createOwner,
  disposeOwner,
  runWithOwner,
  type CompiledOwner,
} from '../../runtime-core/compiled'
import type { BlockFactory } from '../block-factory'
import type { CompiledBlock, CompiledTarget } from '../types'

export type BuiltinProps = { children?: BlockFactory | null }
export const targetBefore = (anchor: Node): CompiledTarget => {
  if (!anchor.parentNode) throw new Error('[rue] detached builtin range')
  return { parent: anchor.parentNode, before: anchor }
}
export const mountSlot = (
  factory: BlockFactory | null | undefined,
  target: CompiledTarget,
  parentOwner: CompiledOwner,
): CompiledBlock | undefined => {
  if (!factory) return
  return runWithOwner(parentOwner, () => {
    const owner = createOwner()
    try {
      return runWithOwner(owner, () => factory(target, {}, owner))
    } catch (error) {
      disposeOwner(owner)
      throw error
    }
  })
}
