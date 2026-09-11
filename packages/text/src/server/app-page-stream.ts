import type { AppPageFontPreload } from './app-page-execution.js'
import { TEXT_RSC_VARY_HEADER } from './app-rsc-cache-busting.js'
import { applyEdgeRuntimeHeader } from './app-page-response.js'
import { mergeMiddlewareResponseHeaders } from './middleware-response-headers.js'
import type { RootParams } from '../shims/root-params.js'
import type { AppRscFormState } from './app-rsc-form-state.js'
import type { AppSsrInlinePayload } from './app-ssr-inline-payload-protocol.js'
import type { AppSsrPayloadDecoder } from './app-ssr-payload-reader-core.js'

export type AppPageFontData = {
  links: string[]
  preloads: readonly AppPageFontPreload[]
  styles: string[]
}

type CreateAppPageFontDataOptions = {
  getLinks: () => string[]
  getPreloads: () => AppPageFontPreload[]
  getStyles: () => string[]
}

export type AppPageSsrHandler = {
  prepareCompiledReferences?: () => void
  handleSsr: (
    rscStream: ReadableStream<Uint8Array>,
    navigationContext: unknown,
    fontData: AppPageFontData,
    options?: {
      formState?: AppRscFormState | null
      scriptNonce?: string
      basePath?: string
      rootParams?: RootParams
      sideStream?: ReadableStream<Uint8Array>
      ssrPayload?: AppSsrInlinePayload
      ssrPayloadDecoder?: AppSsrPayloadDecoder
      capturedRscDataRef?: { value: Promise<ArrayBuffer> | null }
      onSsrError?: (error: unknown) => void
      /** When true, wait for the full server-rendered tree before emitting bytes. */
      waitForAllReady?: boolean
    },
  ) => Promise<ReadableStream<Uint8Array>>
}

type RenderAppPageHtmlStreamOptions = {
  fontData: AppPageFontData
  formState?: AppRscFormState | null
  navigationContext: unknown
  rscStream: ReadableStream<Uint8Array>
  scriptNonce?: string
  basePath?: string
  rootParams?: RootParams
  ssrHandler: AppPageSsrHandler
  ssrPayload?: AppSsrInlinePayload
  ssrPayloadDecoder?: AppSsrPayloadDecoder
  onSsrError?: (error: unknown) => void
  /** Pre-split side stream for fused embed+capture (#981). When set,
   *  handleSsr skips its internal tee and accumulates raw RSC bytes. */
  sideStream?: ReadableStream<Uint8Array>
  /** Out-parameter filled with accumulated raw RSC bytes after stream consumption. */
  capturedRscDataRef?: { value: Promise<ArrayBuffer> | null }
  /** When true, wait for the full server-rendered tree before emitting bytes. */
  waitForAllReady?: boolean
}

type RenderAppPageHtmlResponseOptions = {
  clearRequestContext: () => void
  fontLinkHeader?: string
  isEdgeRuntime?: boolean
  middlewareHeaders?: Headers | null
  status: number
} & RenderAppPageHtmlStreamOptions

type AppPageHtmlStreamRecoveryResult = {
  htmlStream: ReadableStream<Uint8Array> | null
  response: Response | null
}

type RenderAppPageHtmlStreamWithRecoveryOptions<TSpecialError> = {
  onShellRendered?: () => void
  renderErrorBoundaryResponse: (error: unknown) => Promise<Response | null>
  renderHtmlStream: () => Promise<ReadableStream<Uint8Array>>
  renderSpecialErrorResponse: (specialError: TSpecialError) => Promise<Response>
  resolveSpecialError: (error: unknown) => TSpecialError | null
}

type AppPageRscErrorTracker = {
  getCapturedError: () => unknown
  /**
   * Returns a TEXT_REDIRECT or TEXT_HTTP_ERROR_FALLBACK error captured during
   * the RSC render. Read after the SSR shell promise resolves to swap a
   * 307/404 in place of the streamed body when redirect()/notFound() throws
   * synchronously inside a route-level Suspense boundary (loading.tsx).
   */
  getCapturedSpecialError: () => unknown
  waitForSpecialError: (timeoutMs: number) => Promise<unknown>
  onRenderError: (error: unknown, requestInfo: unknown, errorContext: unknown) => unknown
}

const HTML_DOCTYPE = '<!DOCTYPE html>'

function ensureAppHtmlDoctypeStream(
  stream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const reader = stream.getReader()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let checked = false

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          if (!checked) controller.enqueue(encoder.encode(HTML_DOCTYPE))
          controller.close()
          return
        }

        if (!checked) {
          checked = true
          const prefix = decoder.decode(value.slice(0, 64))
          if (!/^\s*<!doctype\s+html(?:\s|>)/i.test(prefix)) {
            controller.enqueue(encoder.encode(HTML_DOCTYPE))
          }
        }

        controller.enqueue(value)
        return
      }
    },
    cancel(reason) {
      return reader.cancel(reason)
    },
  })
}

type ShouldRerenderAppPageWithErrorBoundaryOptions = {
  capturedError: unknown
  hasLocalBoundary: boolean
}

export function createAppPageFontData(options: CreateAppPageFontDataOptions): AppPageFontData {
  return {
    links: options.getLinks(),
    preloads: options.getPreloads(),
    styles: options.getStyles(),
  }
}

export async function renderAppPageHtmlStream(
  options: RenderAppPageHtmlStreamOptions,
): Promise<ReadableStream<Uint8Array>> {
  const ssrOptions = {
    formState: options.formState ?? null,
    scriptNonce: options.scriptNonce,
    basePath: options.basePath,
    rootParams: options.rootParams,
    ssrPayload: options.ssrPayload,
    ssrPayloadDecoder: options.ssrPayloadDecoder,
    sideStream: options.sideStream,
    capturedRscDataRef: options.capturedRscDataRef,
    onSsrError: options.onSsrError,
    waitForAllReady: options.waitForAllReady,
  }

  return options.ssrHandler.handleSsr(
    options.rscStream,
    options.navigationContext,
    options.fontData,
    ssrOptions,
  )
}

/**
 * Wraps a stream so that `onFlush` is called when the last byte has been read
 * by the downstream consumer (i.e. when the HTTP layer finishes draining the
 * response body). This is the correct place to clear per-request context,
 * because the RSC/SSR pipeline is lazy — components execute while the stream
 * is being consumed, not when the stream handle is first obtained.
 */
export function deferUntilStreamConsumed(
  stream: ReadableStream<Uint8Array>,
  onFlush: () => void,
): ReadableStream<Uint8Array> {
  let called = false
  const once = () => {
    if (!called) {
      called = true
      onFlush()
    }
  }

  const cleanup = new TransformStream<Uint8Array, Uint8Array>({
    flush() {
      once()
    },
  })

  const piped = stream.pipeThrough(cleanup)

  // Wrap with a ReadableStream so we can intercept cancel() — the TransformStream
  // Transformer interface does not expose a cancel hook in the Web Streams spec.
  const reader = piped.getReader()
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      return reader.read().then(
        ({ done, value }) => {
          if (done) {
            controller.close()
          } else {
            controller.enqueue(value)
          }
        },
        error => {
          once()
          controller.error(error)
        },
      )
    },
    cancel(reason) {
      // Stream cancelled before fully consumed (e.g. client disconnected).
      // Still clear per-request context to avoid leaks.
      once()
      return reader.cancel(reason)
    },
  })
}

export async function renderAppPageHtmlResponse(
  options: RenderAppPageHtmlResponseOptions,
): Promise<Response> {
  let htmlStream: ReadableStream<Uint8Array> | null = null
  for (let i = 0; i < 8; i += 1) {
    try {
      htmlStream = await renderAppPageHtmlStream(options)
      break
    } catch (error) {
      if (!isThenable(error)) throw error
      await Promise.resolve(error)
    }
  }
  htmlStream ??= await renderAppPageHtmlStream(options)

  // Defer clearRequestContext() until the stream is fully consumed by the HTTP
  // layer. Calling it synchronously here would race the lazy RSC/SSR pipeline:
  // components execute while the stream is being pulled, not when the handle
  // is first returned. See: https://github.com/cloudflare/vinext/issues/660
  const safeStream = deferUntilStreamConsumed(htmlStream, () => {
    options.clearRequestContext()
  })
  const responseStream = ensureAppHtmlDoctypeStream(safeStream)

  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    Vary: TEXT_RSC_VARY_HEADER,
  })

  applyEdgeRuntimeHeader(headers, options.isEdgeRuntime)

  if (options.fontLinkHeader) {
    headers.set('Link', options.fontLinkHeader)
  }

  mergeMiddlewareResponseHeaders(headers, options.middlewareHeaders ?? null)

  return new Response(responseStream, {
    status: options.status,
    headers,
  })
}

export async function renderAppPageHtmlStreamWithRecovery<TSpecialError>(
  options: RenderAppPageHtmlStreamWithRecoveryOptions<TSpecialError>,
): Promise<AppPageHtmlStreamRecoveryResult> {
  for (let i = 0; i < 8; i += 1) {
    try {
      const htmlStream = await options.renderHtmlStream()
      options.onShellRendered?.()
      return {
        htmlStream,
        response: null,
      }
    } catch (error) {
      if (isThenable(error)) {
        await Promise.resolve(error)
        continue
      }
      return recoverAppPageHtmlStreamError(error, options)
    }
  }

  try {
    const htmlStream = await options.renderHtmlStream()
    options.onShellRendered?.()
    return {
      htmlStream,
      response: null,
    }
  } catch (error) {
    if (isThenable(error)) {
      await Promise.resolve(error)
      const htmlStream = await options.renderHtmlStream()
      options.onShellRendered?.()
      return {
        htmlStream,
        response: null,
      }
    }
    return recoverAppPageHtmlStreamError(error, options)
  }
}

async function recoverAppPageHtmlStreamError<TSpecialError>(
  error: unknown,
  options: Pick<
    RenderAppPageHtmlStreamWithRecoveryOptions<TSpecialError>,
    'renderErrorBoundaryResponse' | 'renderSpecialErrorResponse' | 'resolveSpecialError'
  >,
): Promise<AppPageHtmlStreamRecoveryResult> {
  const specialError = options.resolveSpecialError(error)
  if (specialError) {
    return {
      htmlStream: null,
      response: await options.renderSpecialErrorResponse(specialError),
    }
  }

  const boundaryResponse = await options.renderErrorBoundaryResponse(error)
  if (boundaryResponse) {
    return {
      htmlStream: null,
      response: boundaryResponse,
    }
  }

  throw error
}

export function createAppPageRscErrorTracker(
  baseOnError: (error: unknown, requestInfo: unknown, errorContext: unknown) => unknown,
): AppPageRscErrorTracker {
  let capturedError: unknown = null
  let capturedSpecialError: unknown = null
  let resolveCapturedSpecialError: ((error: unknown) => void) | null = null
  const capturedSpecialErrorPromise = new Promise<unknown>(resolve => {
    resolveCapturedSpecialError = resolve
  })

  const shouldReplaceCapturedError = (textError: unknown): boolean => {
    if (capturedError === null) return true
    if (!(capturedError instanceof Error)) return false
    if (!(textError instanceof Error)) return false
    return (
      capturedError.message.includes('Unexpectedly client reference export') &&
      !textError.message.includes('Unexpectedly client reference export')
    )
  }

  return {
    getCapturedError() {
      return capturedError
    },
    getCapturedSpecialError() {
      return capturedSpecialError
    },
    async waitForSpecialError(timeoutMs) {
      if (capturedSpecialError !== null || timeoutMs <= 0) return capturedSpecialError

      let timeoutId: ReturnType<typeof setTimeout> | null = null
      try {
        return await Promise.race([
          capturedSpecialErrorPromise,
          new Promise<null>(resolve => {
            timeoutId = setTimeout(() => resolve(null), timeoutMs)
          }),
        ])
      } finally {
        if (timeoutId !== null) clearTimeout(timeoutId)
      }
    },
    onRenderError(error, requestInfo, errorContext) {
      if (error && typeof error === 'object' && 'digest' in error) {
        // Errors with a digest are signal throws (TEXT_REDIRECT,
        // TEXT_NOT_FOUND, TEXT_HTTP_ERROR_FALLBACK). They're not real
        // failures — keep the first one so the lifecycle can swap a
        // 307/404 in place of a streamed "Switched to client rendering"
        // body for routes with a route-level Suspense boundary.
        if (capturedSpecialError === null) {
          capturedSpecialError = error
          resolveCapturedSpecialError?.(error)
          resolveCapturedSpecialError = null
        }
      } else if (shouldReplaceCapturedError(error)) {
        capturedError = error
      }
      return baseOnError(error, requestInfo, errorContext)
    },
  }
}

export function shouldRerenderAppPageWithGlobalError(
  options: ShouldRerenderAppPageWithErrorBoundaryOptions,
): boolean {
  void options.hasLocalBoundary
  return Boolean(options.capturedError)
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}
