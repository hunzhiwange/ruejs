import { _$compiledRoot, type BlockRecord } from '../block'
import { effect, getCurrentOwner, onOwnerCleanup, untrack } from '../../runtime-core/compiled'
import { appendChild, createComment, insertBefore } from '../dom.browser'
import type { CompiledBlock } from '../types'
import { mountSlot, targetBefore } from './shared'
import {
  firstElement,
  runTransitionPhase,
  type ActiveTransition,
  type CompiledTransitionProps,
} from './transition-phase'
export type { CompiledTransitionProps } from './transition-phase'
export const _$transition = (readProps: () => CompiledTransitionProps): BlockRecord =>
  _$compiledRoot(parent => {
    if (!parent) throw new Error('[rue] Transition requires a parent')
    const owner = getCurrentOwner()!
    const start = createComment('rue:transition:start')
    const anchor = createComment('rue:transition:end')
    appendChild(parent, start)
    appendChild(parent, anchor)
    let block: CompiledBlock | undefined
    let key: unknown
    let initialized = false
    let generation = 0
    let entering: ActiveTransition | undefined
    let leaving: ActiveTransition | undefined
    let disposeLeaving: (() => void) | undefined
    onOwnerCleanup(() => {
      generation++
      entering?.cancel()
      leaving?.cancel()
      disposeLeaving?.()
      block?.dispose()
    })
    effect(() => {
      const props = readProps()
      if (initialized && Object.is(key, props.childKey)) return
      key = props.childKey
      untrack(() => {
        const version = ++generation
        entering?.cancel()
        leaving?.cancel()
        disposeLeaving?.()
        const previous = block
        const element = firstElement(previous)
        const snapshot = element?.cloneNode(true) as HTMLElement | undefined
        if (snapshot && element?.parentNode)
          insertBefore(element.parentNode, snapshot, previous!.first)
        previous?.dispose()
        block = undefined
        disposeLeaving = () => snapshot?.remove()
        const leave = (done: () => void) => {
          if (!snapshot) {
            done()
            return
          }
          leaving = runTransitionPhase(snapshot, props, 'leave', () => {
            snapshot.remove()
            done()
          })
        }
        const mount = (done?: () => void) => {
          if (version !== generation) return
          block = mountSlot(props.children, targetBefore(anchor), owner)
          const next = firstElement(block)
          if (next)
            entering = runTransitionPhase(
              next,
              props,
              !initialized && props.appear ? 'appear' : 'enter',
              () => done?.(),
            )
          else done?.()
        }
        if (props.mode === 'out-in') leave(mount)
        else if (props.mode === 'in-out') mount(() => leave(() => {}))
        else {
          leave(() => {})
          mount()
        }
        initialized = true
      })
    })
    return [start, anchor]
  })
