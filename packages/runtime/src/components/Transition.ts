import type { FC, PropsWithChildren } from '../rue'
import type { BaseTransitionProps } from './BaseTransition'

export type TransitionMode = 'default' | 'out-in' | 'in-out'
export type TransitionProps = PropsWithChildren<BaseTransitionProps & { mode?: TransitionMode }>

/** Compiler-recognized single-range transition state machine. */
export const Transition: FC<TransitionProps> = () => {
  throw new Error('[rue] Transition requires compilation')
}
