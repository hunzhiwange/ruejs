import type { FC, PropsWithChildren } from '../rue'

export type KeepAliveMatchPattern = string | RegExp | Array<string | RegExp>

export interface KeepAliveProps extends PropsWithChildren<Record<string, unknown>> {
  include?: KeepAliveMatchPattern
  exclude?: KeepAliveMatchPattern
  max?: number | string
  __rueRegisterDispose?: (dispose: () => void) => void
}

/** Compiler-recognized LRU block cache; no portable mount metadata is accepted. */
export const KeepAlive: FC<KeepAliveProps> = () => {
  throw new Error('[rue] KeepAlive requires compilation')
}
