import type { BuiltinProps } from './shared'
import type { CompiledBlock } from '../types'
type TransitionDuration = number | { enter?: number; leave?: number }
export interface CompiledTransitionProps extends BuiltinProps {
  childKey?: unknown
  name?: string
  css?: boolean
  appear?: boolean
  mode?: 'default' | 'out-in' | 'in-out'
  duration?: TransitionDuration
  enterFromClass?: string
  enterActiveClass?: string
  enterToClass?: string
  leaveFromClass?: string
  leaveActiveClass?: string
  leaveToClass?: string
  appearFromClass?: string
  appearActiveClass?: string
  appearToClass?: string
  onBeforeEnter?: (element: HTMLElement) => void
  onEnter?: (element: HTMLElement, done: () => void) => void
  onAfterEnter?: (element: HTMLElement) => void
  onEnterCancelled?: (element: HTMLElement) => void
  onBeforeLeave?: (element: HTMLElement) => void
  onLeave?: (element: HTMLElement, done: () => void) => void
  onAfterLeave?: (element: HTMLElement) => void
  onLeaveCancelled?: (element: HTMLElement) => void
  onBeforeAppear?: (element: HTMLElement) => void
  onAppear?: (element: HTMLElement, done: () => void) => void
  onAfterAppear?: (element: HTMLElement) => void
  onAppearCancelled?: (element: HTMLElement) => void
}

export type ActiveTransition = { cancel(): void }

export const firstElement = (block: CompiledBlock | undefined): HTMLElement | undefined => {
  if (block == null) return undefined
  let node: Node | null = block.first
  while (node != null) {
    if (node.nodeType === Node.ELEMENT_NODE) return node as HTMLElement
    if (node === block.last) return undefined
    node = node.nextSibling
  }
  return undefined
}

export const transitionTime = (
  duration: TransitionDuration | undefined,
  phase: 'enter' | 'leave',
): number => Math.max(0, typeof duration === 'number' ? duration : Number(duration?.[phase] ?? 0))

export const runTransitionPhase = (
  element: HTMLElement,
  props: CompiledTransitionProps,
  phase: 'enter' | 'appear' | 'leave',
  done: () => void,
): ActiveTransition => {
  const entering = phase !== 'leave'
  const name = props.name ?? 'rue'
  const prefix = phase === 'appear' ? 'appear' : phase
  const from =
    phase === 'appear'
      ? (props.appearFromClass ?? props.enterFromClass ?? `${name}-enter-from`)
      : phase === 'enter'
        ? (props.enterFromClass ?? `${name}-enter-from`)
        : (props.leaveFromClass ?? `${name}-leave-from`)
  const active =
    phase === 'appear'
      ? (props.appearActiveClass ?? props.enterActiveClass ?? `${name}-enter-active`)
      : phase === 'enter'
        ? (props.enterActiveClass ?? `${name}-enter-active`)
        : (props.leaveActiveClass ?? `${name}-leave-active`)
  const to =
    phase === 'appear'
      ? (props.appearToClass ?? props.enterToClass ?? `${name}-enter-to`)
      : phase === 'enter'
        ? (props.enterToClass ?? `${name}-enter-to`)
        : (props.leaveToClass ?? `${name}-leave-to`)
  const before =
    phase === 'appear' ? props.onBeforeAppear : entering ? props.onBeforeEnter : props.onBeforeLeave
  const hook = phase === 'appear' ? props.onAppear : entering ? props.onEnter : props.onLeave
  const after =
    phase === 'appear' ? props.onAfterAppear : entering ? props.onAfterEnter : props.onAfterLeave
  const cancelled =
    phase === 'appear'
      ? props.onAppearCancelled
      : entering
        ? props.onEnterCancelled
        : props.onLeaveCancelled
  let settled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let frame: number | undefined
  const cleanup = () => {
    if (timer !== undefined) clearTimeout(timer)
    if (frame !== undefined && typeof cancelAnimationFrame === 'function')
      cancelAnimationFrame(frame)
    if (props.css !== false) element.classList.remove(from, active, to)
  }
  const finish = () => {
    if (settled) return
    settled = true
    cleanup()
    after?.(element)
    done()
  }
  before?.(element)
  if (props.css !== false) {
    element.classList.add(from, active)
    const advance = () => {
      frame = undefined
      if (settled) return
      element.classList.remove(from)
      element.classList.add(to)
    }
    if (typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(advance)
    else setTimeout(advance, 0)
  }
  if (hook != null) hook(element, finish)
  else timer = setTimeout(finish, transitionTime(props.duration, entering ? 'enter' : 'leave'))
  void prefix
  return {
    cancel() {
      if (settled) return
      settled = true
      cleanup()
      cancelled?.(element)
    },
  }
}
