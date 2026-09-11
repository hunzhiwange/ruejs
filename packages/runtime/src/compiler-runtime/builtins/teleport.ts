import { _$compiledRoot, type BlockRecord } from '../block'
import { effect, getCurrentOwner, onOwnerCleanup, untrack } from '../../runtime-core/compiled'
import { appendChild, createComment } from '../dom.browser'
import { moveCompiledBlock } from '../mount'
import type { CompiledBlock } from '../types'
import { mountSlot, targetBefore, type BuiltinProps } from './shared'
export interface CompiledTeleportProps extends BuiltinProps {
  to?: string | ParentNode | null
  disabled?: boolean
  defer?: boolean
}
export const _$teleport = (readProps: () => CompiledTeleportProps): BlockRecord =>
  _$compiledRoot(parent => {
    if (!parent) throw new Error('[rue] Teleport requires a parent')
    const owner = getCurrentOwner()!
    const start = createComment('rue:teleport:start')
    const anchor = createComment('rue:teleport:end')
    appendChild(parent, start)
    appendChild(parent, anchor)
    let block: CompiledBlock | undefined
    let generation = 0
    onOwnerCleanup(() => {
      generation++
      block?.dispose()
      block = undefined
    })
    effect(() => {
      const props = readProps()
      const current = ++generation
      const apply = () => {
        if (current !== generation) return
        const destination = props.disabled
          ? anchor.parentNode
          : typeof props.to === 'string'
            ? document.querySelector(props.to)
            : props.to
        if (!destination) return
        const target = props.disabled ? targetBefore(anchor) : { parent: destination, before: null }
        if (!block) block = mountSlot(props.children, target, owner)
        else moveCompiledBlock(block, target)
      }
      if (props.defer) queueMicrotask(apply)
      else untrack(apply)
    })
    return [start, anchor]
  })
