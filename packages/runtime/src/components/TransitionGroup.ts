import type { FC, PropsWithChildren } from '../rue'
import type { BaseTransitionProps } from './BaseTransition'

export type TransitionGroupProps = PropsWithChildren<
  BaseTransitionProps & {
    tag?: string
    moveClass?: string
  }
>

/** Compiler-recognized keyed-range transition coordinator. */
export const TransitionGroup: FC<TransitionGroupProps> = () => {
  throw new Error('[rue] TransitionGroup requires compilation')
}
