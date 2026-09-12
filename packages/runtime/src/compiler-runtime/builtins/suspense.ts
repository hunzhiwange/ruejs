import { _$compiledRoot, type BlockRecord } from '../block'
import {
  renderEffect as effect,
  getCurrentOwner,
  onOwnerCleanup,
  untrack,
  runWithOwner,
} from '../../runtime-core/compiled'
import { appendChild, createComment, createDocumentFragment } from '../dom.browser'
import { moveCompiledBlock } from '../mount'
import type { CompiledBlock } from '../types'
import type { BlockFactory } from '../block-factory'
import { mountSlot, targetBefore, type BuiltinProps } from './shared'
import {
  getCurrentSuspenseBoundary,
  withSuspenseBoundary,
  type SuspenseBoundary,
} from '../../components/suspenseContext'
export interface CompiledSuspenseProps extends BuiltinProps {
  fallback?: BlockFactory
  suspensible?: boolean
  timeout?: number
  onPending?: () => void
  onFallback?: () => void
  onResolve?: () => void
  onReject?: (error: unknown) => void
}
export const _$suspense = (readProps: () => CompiledSuspenseProps): BlockRecord =>
  _$compiledRoot(parent => {
    if (!parent) throw new Error('[rue] Suspense requires a parent')
    const owner = getCurrentOwner()!
    const parentBoundary = getCurrentSuspenseBoundary()
    const start = createComment('rue:suspense:start')
    const anchor = createComment('rue:suspense:end')
    appendChild(parent, start)
    appendChild(parent, anchor)
    let block: CompiledBlock | undefined
    let generation = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const cancelTimer = () => {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
    }
    onOwnerCleanup(() => {
      generation++
      cancelTimer()
      block?.dispose()
      block = undefined
    })
    const render = (props: CompiledSuspenseProps) => {
      const current = ++generation
      cancelTimer()
      const staging = createDocumentFragment(parent)
      let next: CompiledBlock | undefined
      try {
        const pending = new Set<PromiseLike<unknown>>()
        const boundary: SuspenseBoundary = {
          id: Symbol(),
          register: promise => {
            pending.add(promise)
          },
        }
        next = withSuspenseBoundary(boundary, () =>
          mountSlot(props.children, { parent: staging, before: null }, owner),
        )
        if (pending.size) {
          next?.dispose()
          next = undefined
          const dependency = Promise.all(pending)
          if (props.suspensible) parentBoundary?.register(dependency)
          throw dependency
        }
        block?.dispose()
        block = next
        if (block) moveCompiledBlock(block, targetBefore(anchor))
        props.onResolve?.()
      } catch (error) {
        next?.dispose()
        if (error == null || typeof (error as PromiseLike<unknown>).then !== 'function') throw error
        props.onPending?.()
        const fallback = () => {
          if (generation !== current) return
          timer = undefined
          block?.dispose()
          block = mountSlot(props.fallback, targetBefore(anchor), owner)
          props.onFallback?.()
        }
        const timeout = Math.max(0, Number(props.timeout ?? 0))
        if (timeout) timer = setTimeout(fallback, timeout)
        else fallback()
        Promise.resolve(error).then(
          () => {
            if (generation === current) runWithOwner(owner, () => render(props))
          },
          reason => {
            if (generation !== current) return
            cancelTimer()
            generation++
            if (props.onReject) runWithOwner(owner, () => props.onReject!(reason))
            else
              queueMicrotask(() => {
                throw reason
              })
          },
        )
      }
    }
    effect(() => {
      const props = readProps()
      untrack(() => render(props))
    })
    return [start, anchor]
  })
export default _$suspense
