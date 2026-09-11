'use client'

import { useCallback } from './hooks-adapter.js'
import { useRef } from '@rue-js/rue'
import type { RueRef } from './rue-shim-types.js'

// Ported from Text.js: packages/text/src/client/use-merged-ref.ts
// This is a compatibility hook to support Rue 18 and 19 refs.
// In 19, a cleanup function from refs may be returned.
// In 18, returning a cleanup function creates a warning.
// Since we take userspace refs, we don't know ahead of time if a cleanup function will be returned.
// This implements cleanup functions with the old behavior in 18.
// We know refs are always called alternating with `null` and then `T`.
// So a call with `null` means we need to call the previous cleanup functions.
export function useMergedRef<TElement>(
  refA: RueRef<TElement>,
  refB: RueRef<TElement>,
): RueRef<TElement> {
  const cleanupA = useRef<(() => void) | null>(null)
  const cleanupB = useRef<(() => void) | null>(null)

  return useCallback(
    (current: TElement | null): void => {
      if (current === null) {
        const cleanupFnA = cleanupA.current
        if (cleanupFnA) {
          cleanupA.current = null
          cleanupFnA()
        }
        const cleanupFnB = cleanupB.current
        if (cleanupFnB) {
          cleanupB.current = null
          cleanupFnB()
        }
      } else {
        if (refA) {
          cleanupA.current = applyRef(refA, current)
        }
        if (refB) {
          cleanupB.current = applyRef(refB, current)
        }
      }
    },
    [refA, refB],
  )
}

function applyRef<TElement>(refA: NonNullable<RueRef<TElement>>, current: TElement) {
  if (typeof refA === 'function') {
    const cleanup = refA(current)
    if (typeof cleanup === 'function') {
      return cleanup
    } else {
      return () => refA(null)
    }
  } else {
    refA.current = current
    return () => {
      refA.current = null
    }
  }
}
