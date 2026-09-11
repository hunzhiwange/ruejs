import { makeThenableParams } from '../shims/thenable-params.js'
import { collectAppPageSearchParams } from './app-page-head.js'
import {
  hasAppClientReferenceResolver,
  resolveAppClientReference,
} from './app-client-reference-resolver.js'
import {
  probeAppPageComponent,
  probeAppPageLayouts,
  type AppPageSpecialError,
  type LayoutClassificationOptions,
  type LayoutFlags,
} from './app-page-execution.js'
import { isAppRscServerClientReference } from './app-rsc-client-reference-protocol.js'

const TEXT_CLIENT_REFERENCE_SSR_KEY = Symbol.for('text.clientReferenceSsr')

/**
 * Build a probePage() invocation for the App Router request lifecycle.
 *
 * The generated RSC entry calls this once per request after route matching to
 * eagerly invoke the page component. Surfacing redirect()/notFound() throws
 * here lets the probe lifecycle turn them into proper HTTP responses before
 * RSC streaming begins (see `probeAppPageBeforeRender`).
 *
 * The helper exists to keep the generated entry thin (a single delegation
 * call) and to make the search-params wiring directly unit-testable. A bug
 * here previously slipped through because the entry hand-rolled the call and
 * read a non-existent key off `collectAppPageSearchParams`'s return value
 * (see https://github.com/cloudflare/vinext/issues/1235).
 *
 * Returns `null` when the route has no page component (eg. interception-only
 * routes), matching the caller contract on `probePage`.
 */
export function probeAppPage(options: {
  pageComponent: unknown
  asyncRouteParams: unknown
  searchParams: URLSearchParams | null | undefined
}): unknown {
  const { pageComponent, asyncRouteParams, searchParams } = options
  if (typeof pageComponent !== 'function') {
    return null
  }
  const { pageSearchParams } = collectAppPageSearchParams(searchParams)
  const asyncSearchParams = makeThenableParams(pageSearchParams)
  const pageProps = {
    params: asyncRouteParams,
    searchParams: asyncSearchParams,
  }
  if (isAppRscServerClientReference(pageComponent)) {
    return resolveAppClientPageComponentForProbe(pageComponent, pageProps)
  }
  return (pageComponent as (props: Record<string, unknown>) => unknown)(pageProps)
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

function runWithAppClientReferenceSsr<T>(callback: () => T): T {
  const globalState = globalThis as Record<symbol, unknown>
  const previous = globalState[TEXT_CLIENT_REFERENCE_SSR_KEY]
  const previousCount = typeof previous === 'number' ? previous : 0
  globalState[TEXT_CLIENT_REFERENCE_SSR_KEY] = previousCount + 1

  const restore = () => {
    if (previous === undefined) {
      delete globalState[TEXT_CLIENT_REFERENCE_SSR_KEY]
    } else {
      globalState[TEXT_CLIENT_REFERENCE_SSR_KEY] = previous
    }
  }

  let restoreOnReturn = true
  try {
    const result = callback()
    if (isThenable(result)) {
      restoreOnReturn = false
      return Promise.resolve(result).finally(restore) as T
    }
    return result
  } finally {
    if (restoreOnReturn) restore()
  }
}

function runClientPageComponentForProbe(
  component: (props: Record<string, unknown>) => unknown,
  pageProps: Record<string, unknown>,
): unknown {
  return runWithAppClientReferenceSsr(() => component(pageProps))
}

async function resolveAppClientPageComponentForProbe(
  pageComponent: unknown,
  pageProps: Record<string, unknown>,
): Promise<unknown> {
  if (process.env.TEXT_PRERENDER === '1') {
    return null
  }

  if (!hasAppClientReferenceResolver()) {
    const { installAppClientReferenceResolver } = await import('./app-rsc-ssr-runtime.js')
    installAppClientReferenceResolver()
  }

  const resolvedPageComponent = resolveAppClientReference(pageComponent)
  if (resolvedPageComponent) {
    return Promise.resolve(resolvedPageComponent).then(component =>
      typeof component === 'function'
        ? runClientPageComponentForProbe(
            component as (props: Record<string, unknown>) => unknown,
            pageProps,
          )
        : null,
    )
  }

  return runClientPageComponentForProbe(
    pageComponent as (props: Record<string, unknown>) => unknown,
    pageProps,
  )
}

type ProbeAppPageBeforeRenderResult = {
  response: Response | null
  layoutFlags: LayoutFlags
}

type ProbeAppPageBeforeRenderOptions = {
  hasLoadingBoundary: boolean
  layoutCount: number
  probeLayoutAt: (layoutIndex: number) => unknown
  probePage: () => unknown
  renderLayoutSpecialError: (
    specialError: AppPageSpecialError,
    layoutIndex: number,
  ) => Promise<Response>
  renderPageSpecialError: (specialError: AppPageSpecialError) => Promise<Response>
  renderPageErrorBoundary?: (error: unknown) => Promise<Response | null>
  resolveSpecialError: (error: unknown) => AppPageSpecialError | null
  runWithSuppressedHookWarning<T>(probe: () => Promise<T>): Promise<T>
  /** When provided, enables per-layout static/dynamic classification. */
  classification?: LayoutClassificationOptions | null
}

function isClientReferenceProbeError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Unexpectedly client reference export')
}

function isRueRuntimeDomProbeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (typeof error.stack !== 'string') return false
  return (
    (error.message === 'document is not defined' &&
      error.stack.includes('browserDOMOperations.createTextNode')) ||
    (error.message ===
      'Unsupported object inputs are no longer accepted on the default @rue-js/runtime entry.' &&
      error.stack.includes('TextCompatProvider'))
  )
}

function isTextIntlServerHookProbeError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('`useTranslations` is not callable within an async component')
  )
}

function isThenableProbeError(error: unknown): boolean {
  return (
    (typeof error === 'object' || typeof error === 'function') &&
    error !== null &&
    typeof (error as { then?: unknown }).then === 'function'
  )
}

export async function probeAppPageBeforeRender(
  options: ProbeAppPageBeforeRenderOptions,
): Promise<ProbeAppPageBeforeRenderResult> {
  let layoutFlags: LayoutFlags = {}

  // Layouts render before their children in Text.js, so layout-level special
  // errors must be handled before probing the page component itself.
  if (options.layoutCount > 0) {
    const layoutProbeResult = await probeAppPageLayouts({
      layoutCount: options.layoutCount,
      async onLayoutError(layoutError, layoutIndex) {
        const specialError = options.resolveSpecialError(layoutError)
        if (!specialError) {
          return null
        }

        return options.renderLayoutSpecialError(specialError, layoutIndex)
      },
      probeLayoutAt: options.probeLayoutAt,
      runWithSuppressedHookWarning(probe) {
        return options.runWithSuppressedHookWarning(probe)
      },
      classification: options.classification,
    })

    layoutFlags = layoutProbeResult.layoutFlags

    if (layoutProbeResult.response) {
      return { response: layoutProbeResult.response, layoutFlags }
    }
  }

  // When a route-level loading.tsx is present, the page renders inside a
  // route-level Suspense boundary, so a thrown redirect()/notFound() during
  // page render becomes an error inside that boundary. We can't catch it
  // here without serializing on the page promise — which would defeat the
  // streaming benefit of loading.tsx for slow non-redirecting pages.
  //
  // Recovery for the redirect/notFound case happens later in
  // renderAppPageLifecycle: rscErrorTracker captures the digest from the SSR
  // onError callback, and a short race window after shell-ready lets the
  // lifecycle swap the response to a 307/404 before bytes are flushed.
  // This mirrors Text.js's "until-first-byte-is-flushed" swap behavior.
  if (options.hasLoadingBoundary) {
    return { response: null, layoutFlags }
  }

  // Server Components are functions, so we can probe the page ahead of stream
  // creation and only turn special throws into immediate responses.
  const pageResponse = await probeAppPageComponent({
    awaitAsyncResult: true,
    async onError(pageError) {
      const specialError = options.resolveSpecialError(pageError)
      if (specialError) {
        return options.renderPageSpecialError(specialError)
      }

      if (
        options.renderPageErrorBoundary &&
        !isClientReferenceProbeError(pageError) &&
        !isRueRuntimeDomProbeError(pageError) &&
        !isTextIntlServerHookProbeError(pageError) &&
        !isThenableProbeError(pageError)
      ) {
        return options.renderPageErrorBoundary(pageError)
      }

      // Non-special probe failures (for example use() outside the active render
      // cycle or client references executing on the server) are expected here.
      // The real RSC/SSR render path will surface those properly below.
      return null
    },
    probePage: options.probePage,
    runWithSuppressedHookWarning(probe) {
      return options.runWithSuppressedHookWarning(probe)
    },
  })

  return { response: pageResponse, layoutFlags }
}
