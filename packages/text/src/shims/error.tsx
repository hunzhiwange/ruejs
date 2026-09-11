/**
 * text/error shim
 *
 * Provides the default Text.js error page component.
 * Used by apps that import `import Error from 'text/error'` for
 * custom error handling in getServerSideProps or API routes.
 *
 * Also re-exports the unstable App Router error-boundary HOC
 * (`unstable_catchError`) and its `ErrorInfo` type, mirroring
 * `text/error`'s public surface.
 */
import { hasAppNavigationRuntime } from '../client/navigation-runtime.js'
import { appRouterInstance, isTextRouterError } from './navigation.js'
import {
  type TextCompatComponentType,
  type TextCompatElement,
  type TextCompatNode,
} from './component-adapter.js'
import { signal, onErrorCaptured, batch } from '@rue-js/rue'

type ErrorProps = {
  statusCode: number
  title?: string
  withDarkMode?: boolean
}

function ErrorComponent({ statusCode, title }: ErrorProps): TextCompatElement {
  const defaultTitle = statusCode === 404 ? 'This page could not be found' : 'Internal Server Error'

  const displayTitle = title ?? defaultTitle

  return (
    <div
      {...{
        style: {
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          height: '100vh',
          textAlign: 'center' as const,
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      <div>
        <h1
          {...{
            style: {
              display: 'inline-block',
              margin: '0 20px 0 0',
              padding: '0 23px 0 0',
              fontSize: 24,
              fontWeight: 500,
              verticalAlign: 'top',
              lineHeight: '49px',
              borderRight: '1px solid rgba(0, 0, 0, .3)',
            },
          }}
        >
          {statusCode}
        </h1>
        <div {...{ style: { display: 'inline-block' } }}>
          <h2
            {...{
              style: {
                fontSize: 14,
                fontWeight: 400,
                lineHeight: '49px',
                margin: 0,
              },
            }}
          >
            {displayTitle + '.'}
          </h2>
        </div>
      </div>
    </div>
  )
}

export default ErrorComponent

// ---------------------------------------------------------------------------
// unstable_catchError — App Router error-boundary HOC
//
// `unstable_catchError(fallback)` returns a Component that renders `children`
// and, if the children throw, renders the user-supplied fallback with an
// `ErrorInfo` object. Internal Text.js navigation signals (redirect /
// notFound / forbidden / unauthorized) are rethrown so they reach the outer
// framework boundaries.
//
// Ported from Text.js:
//   https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/catch-error.tsx
//   https://github.com/vercel/next.js/blob/canary/packages/text/src/api/error.ts
//   https://github.com/vercel/next.js/blob/canary/packages/text/src/api/error.rue-server.ts
//
// Compiled owners capture child failures. Router signals propagate to the
// enclosing framework boundary, and fallback failures propagate outward.
// Reset clears local error state; retry refreshes the active App Router and
// resets in one batch. The function is importable during SSR, while retry
// requires a client App Router runtime.
// ---------------------------------------------------------------------------

export type ErrorInfo = {
  error: unknown
  reset: () => void
  unstable_retry: () => void
}

type _UserProps = Record<string, unknown>

type _CatchErrorState = { thrownValue: unknown } | null

function CatchError<P extends _UserProps>(props: {
  fallback: (props: P, errorInfo: ErrorInfo) => TextCompatNode
  forwardedProps: P
  children?: TextCompatNode
}) {
  const error = signal<_CatchErrorState>(null)
  onErrorCaptured(thrownValue => {
    if (isTextRouterError(thrownValue) || error.peek() !== null) return
    error.set({ thrownValue })
    return false
  })
  const reset = () => error.set(null)
  const unstable_retry = () => {
    if (typeof window === 'undefined' || !hasAppNavigationRuntime()) {
      throw new Error(
        '`unstable_retry()` can only be used on the client. Call it from a user interaction handler inside the error fallback.',
      )
    }
    batch(() => {
      appRouterInstance.refresh()
      reset()
    })
  }
  function Fallback() {
    return props.fallback(props.forwardedProps, {
      error: error.peek()!.thrownValue,
      reset,
      unstable_retry,
    })
  }
  return error.get() !== null ? <Fallback /> : <>{props.children}</>
}

/**
 * Wrap a fallback render function in a Component-level error boundary.
 * Returns a Component that renders `children` and, on error, renders the
 * supplied fallback with an `ErrorInfo` value.
 *
 * Ported from Text.js:
 *   https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/catch-error.tsx
 */
export function unstable_catchError<P extends _UserProps>(
  fallback: (props: P, errorInfo: ErrorInfo) => TextCompatNode,
): TextCompatComponentType<P & { children?: TextCompatNode }> {
  function CatchErrorBoundary({
    children,
    ...rest
  }: P & { children?: TextCompatNode }): TextCompatElement {
    return (
      <CatchError fallback={fallback} forwardedProps={rest as P}>
        {children}
      </CatchError>
    )
  }
  CatchErrorBoundary.displayName = `unstable_catchError(${fallback.name || 'CatchErrorFallback'})`
  return CatchErrorBoundary
}
