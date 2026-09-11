import type { FC, PropsWithChildren } from '../rue'

export interface SuspenseProps extends PropsWithChildren<Record<string, unknown>> {
  fallback?: unknown
  timeout?: number | string
  suspensible?: boolean
  onReject?: (error: unknown) => void
  onPending?: () => void
  onResolve?: () => void
  onFallback?: () => void
}

/** Compiler-recognized async boundary backed by staged CompiledBlock ranges. */
export const Suspense: FC<SuspenseProps> = () => {
  throw new Error('[rue] Suspense requires compilation')
}
