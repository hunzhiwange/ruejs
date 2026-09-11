import {
  createAppServerElement as createServerElement,
  AppServerFragment,
} from './app-server-tree.js'
import './server-globals.js'
import type { NavigationContext } from '../shims/navigation.js'
import {
  ServerInsertedHTMLContext,
  beginCurrentSsrLayoutSegmentMap,
  clearCurrentSsrLayoutSegmentMap,
  appRouterInstance,
  clearServerInsertedHTML,
  renderServerInsertedHTML,
  setNavigationContext,
  useServerInsertedHTML,
} from '../shims/navigation.js'
import { runWithNavigationContext } from '../shims/navigation-state.js'
import { runWithRootParamsScope, type RootParams } from '../shims/root-params.js'
import { isOpenRedirectShaped } from './request-pipeline.js'
import { notFoundResponse } from './http-error-responses.js'
import { ScriptNonceContext } from '../shims/script-nonce-context.js'
import {
  BeforeInteractiveContext,
  type BeforeInteractiveInlineScript,
} from '../shims/before-interactive-context.js'
import {
  createInlineScriptTag,
  createNonceAttribute,
  escapeHtmlAttr,
  safeJsonStringify,
} from './html.js'
import {
  createNavigationRuntimeRscMetadataScript,
  createRscEmbedTransform,
  createTickBufferedTransform,
} from './app-ssr-stream.js'
import { normalizeRscPreloadHintText } from './rsc-stream-hints.js'
import { deferUntilStreamConsumed } from './app-page-stream.js'
import { createSsrErrorMetaRenderer } from './app-ssr-error-meta.js'
import { AppElementsWire, type AppElements } from './app-elements.js'
import type { AppSsrInlinePayload } from './app-ssr-inline-payload-protocol.js'
import {
  ElementsContext,
  beginCurrentSsrAppElements,
  clearCurrentSsrAppElements,
  setCurrentSsrAppElements,
  setCurrentSsrAppElementsReader,
} from '../shims/slot-core.js'
import { AppRouterContext } from '../shims/internal/app-router-context.js'
import type { TextCompatNode } from '../shims/text-compat-types.js'
import { RSC_FORM_STATE_GLOBAL } from './app-browser-hydration.js'
import type { AppRscFormState } from './app-rsc-form-state.js'
import { renderAppSsrToReadableStream, renderAppSsrToStaticMarkup } from './app-ssr-renderer.js'
import {
  createAppSsrPayloadReader,
  resolveAppSsrPayloadElements,
} from './app-ssr-payload-reader.js'
import type { AppSsrPayloadDecoder } from './app-ssr-payload-reader-core.js'
import {
  appClientReferencePreloader,
  installAppClientReferenceResolver,
  loadAppBootstrapScriptContent,
  loadAppRscRequestHandler,
} from './app-rsc-ssr-runtime.js'

export type FontPreload = {
  href: string
  type: string
}

export type FontData = {
  links?: string[]
  styles?: string[]
  preloads?: FontPreload[]
}

function ssrErrorDigest(input: string): string {
  let hash = 5381
  for (let i = input.length - 1; i >= 0; i--) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return (hash >>> 0).toString()
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return Object.prototype.toString.call(error)
}

async function renderInsertedHtml(insertedElements: readonly unknown[]): Promise<string> {
  let insertedHTML = ''

  for (const element of insertedElements) {
    try {
      insertedHTML += await renderAppSsrToStaticMarkup(
        createServerElement(AppServerFragment, null, element as TextCompatNode),
      )
    } catch {
      // Ignore individual callback failures so the rest of the page can render.
    }
  }

  return insertedHTML
}

/**
 * Render captured `<Script strategy="beforeInteractive">` inline scripts to
 * HTML, ready to splice immediately after `<head ...>` opens. Each entry has
 * already had its inline content escaped via `escapeInlineContent(..., "script")`
 * inside the Script shim, so this function only quotes the attributes that
 * actually go on the tag (id, nonce, plus the residual passthroughs).
 *
 * Keeping this function colocated with the rest of the head-injection
 * helpers makes it obvious where the boundary is: anything passed through
 * here is being concatenated directly into HTML; treat the inputs
 * accordingly.
 */
// Conservative subset of the HTML attribute-name grammar. Must start with a
// letter and contain only letters, digits, underscores, hyphens, or dots —
// enough to round-trip data-* and standard attributes (`async`, `defer`,
// `type`, `crossorigin`, etc.) without ever splicing a `"`/`>`/whitespace
// into the unquoted *name* position where escaping wouldn't help.
const VALID_ATTR_NAME = /^[a-zA-Z][\w.-]*$/

function renderBeforeInteractiveInlineScripts(
  scripts: readonly BeforeInteractiveInlineScript[],
  fallbackNonce?: string,
): string {
  if (scripts.length === 0) return ''
  let html = ''
  for (const script of scripts) {
    let attrs = ''
    if (script.id) {
      attrs += ` id="${escapeHtmlAttr(script.id)}"`
    }
    attrs += createNonceAttribute(script.nonce ?? fallbackNonce)
    if (script.attributes) {
      for (const [key, value] of Object.entries(script.attributes)) {
        // Attribute *values* go through escapeHtmlAttr below. The *name*
        // can't be escaped — a malformed key would break the tag — so we
        // gate at the boundary instead of trying to neutralise it.
        if (!VALID_ATTR_NAME.test(key)) continue
        if (value === true) {
          attrs += ` ${key}`
        } else if (typeof value === 'string') {
          attrs += ` ${key}="${escapeHtmlAttr(value)}"`
        }
      }
    }
    html += `<script${attrs}>${script.innerHTML}</script>`
  }
  return html
}

function renderFontHtml(fontData?: FontData, nonce?: string): string {
  if (!fontData) return ''

  let fontHTML = ''
  const nonceAttr = createNonceAttribute(nonce)

  for (const url of fontData.links ?? []) {
    fontHTML += `<link rel="stylesheet"${nonceAttr} href="${escapeHtmlAttr(url)}" />\n`
  }

  for (const preload of fontData.preloads ?? []) {
    fontHTML += `<link rel="preload"${nonceAttr} href="${escapeHtmlAttr(preload.href)}" as="font" type="${escapeHtmlAttr(preload.type)}" crossorigin />\n`
  }

  if (fontData.styles && fontData.styles.length > 0) {
    fontHTML += `<style data-text-fonts${nonceAttr}>${fontData.styles.join('\n')}</style>\n`
  }

  return fontHTML
}

/**
 * Extract the bootstrap module URL from the `import("...")` string that the
 * RSC SSR plugin runtime returns for the app browser entry.
 *
 * The plugin-rsc helper returns the bootstrap as an inline call so we can
 * inject it via `bootstrapScriptContent`. We instead pass the URL to
 * Rue's `bootstrapModules` option so a real
 * `<script type="module" src="…">` tag ends up in the streamed HTML —
 * this exposes the URL to anything that reads `script.attribs.src` (e.g.
 * the Text.js asset-prefix fixture test). The same URL also feeds the
 * `<link rel="modulepreload">` we emit ahead of the bootstrap.
 *
 * Returns `undefined` when the helper produced no URL (older plugin-rsc
 * versions, or a custom client entry that disables bootstrap content).
 */
function extractBootstrapModuleUrl(bootstrapScriptContent?: string): string | undefined {
  if (!bootstrapScriptContent) return undefined
  // Accept either quote style — plugin-rsc currently emits double quotes
  // (`import("…")`) but a future version could switch to single quotes,
  // and there's no public contract documenting which is used.
  const match = bootstrapScriptContent.match(/import\(["']([^"']+)["']\)/)
  return match?.[1] ?? undefined
}

function buildModulePreloadHtml(bootstrapModuleUrl?: string, nonce?: string): string {
  if (!bootstrapModuleUrl) return ''
  return `<link rel="modulepreload"${createNonceAttribute(nonce)} href="${escapeHtmlAttr(bootstrapModuleUrl)}" />\n`
}

function buildHeadInjectionHtml(
  navContext: NavigationContext | null,
  bootstrapModuleUrl: string | undefined,
  formState: AppRscFormState | null,
  insertedHTML: string,
  fontHTML: string,
  scriptNonce?: string,
): string {
  const navPayload = {
    pathname: navContext?.pathname ?? '/',
    searchParams: navContext?.searchParams ? [...navContext.searchParams.entries()] : [],
  }
  const rscMetadataScript = createInlineScriptTag(
    createNavigationRuntimeRscMetadataScript(navContext?.params ?? {}, navPayload),
    scriptNonce,
  )
  const formStateScript =
    formState === null
      ? ''
      : createInlineScriptTag(
          'self[' + safeJsonStringify(RSC_FORM_STATE_GLOBAL) + ']=' + safeJsonStringify(formState),
          scriptNonce,
        )

  return (
    rscMetadataScript +
    formStateScript +
    buildModulePreloadHtml(bootstrapModuleUrl, scriptNonce) +
    (bootstrapModuleUrl
      ? `<script type="module"${createNonceAttribute(scriptNonce)} src="${escapeHtmlAttr(bootstrapModuleUrl)}"></script>`
      : '') +
    insertedHTML +
    fontHTML
  )
}

function createEmptyAppSsrPayloadStream(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.close()
    },
  })
}

export async function handleSsr(
  rscStream: ReadableStream<Uint8Array>,
  navContext: NavigationContext | null,
  fontData?: FontData,
  options?: {
    scriptNonce?: string
    /** Pre-split side stream for embed+capture fusion. When provided,
     *  rscStream is fed directly to the SSR payload reader (no internal tee).
     *  The embed transform accumulates raw bytes. */
    sideStream?: ReadableStream<Uint8Array>
    /** Out-parameter: filled with accumulated raw RSC bytes when sideStream is consumed. */
    capturedRscDataRef?: { value: Promise<ArrayBuffer> | null }
    formState?: AppRscFormState | null
    basePath?: string
    rootParams?: RootParams
    ssrPayload?: AppSsrInlinePayload
    ssrPayloadDecoder?: AppSsrPayloadDecoder
    onSsrError?: (error: unknown) => void
    /** When true, wait for the full server-rendered tree (including Suspense boundaries)
     *  to resolve before returning the HTML stream. Used for static prerender
     *  and ISR cache writes to avoid caching fallback content. */
    waitForAllReady?: boolean
  },
): Promise<ReadableStream<Uint8Array>> {
  return runWithNavigationContext(async () => {
    installAppClientReferenceResolver()
    await appClientReferencePreloader.preload()

    if (navContext) {
      setNavigationContext(navContext)
    }

    clearServerInsertedHTML()
    beginCurrentSsrAppElements()
    beginCurrentSsrLayoutSegmentMap()

    const cleanup = (): void => {
      setNavigationContext(null)
      clearCurrentSsrAppElements()
      clearCurrentSsrLayoutSegmentMap()
      clearServerInsertedHTML()
    }

    const rootParams = options?.rootParams ?? {}
    return runWithRootParamsScope(rootParams, async () => {
      try {
        // Fused tee path (#981): caller pre-split the stream. No internal tee needed.
        // sideStream carries both the embed transform and raw byte accumulation.
        // rscStream is used directly for the SSR payload reader.
        let ssrStream: ReadableStream<Uint8Array>
        let createRscEmbed: () => ReturnType<typeof createRscEmbedTransform>

        if (options?.ssrPayload !== undefined) {
          ssrStream = createEmptyAppSsrPayloadStream()
          createRscEmbed = () =>
            createRscEmbedTransform(options.sideStream ?? rscStream, options?.scriptNonce, {
              normalizeTextChunk: normalizeRscPreloadHintText,
            })
        } else if (options?.sideStream) {
          ssrStream = rscStream
          createRscEmbed = () =>
            createRscEmbedTransform(options.sideStream!, options?.scriptNonce, {
              normalizeTextChunk: normalizeRscPreloadHintText,
            })
        } else {
          const [s1, s2] = rscStream.tee()
          ssrStream = s1
          createRscEmbed = () =>
            createRscEmbedTransform(s2, options?.scriptNonce, {
              normalizeTextChunk: normalizeRscPreloadHintText,
            })
        }

        let readSsrPayloadElements: () => AppElements
        if (options?.ssrPayload !== undefined) {
          const resolvedInlineSsrPayloadElements = await resolveAppSsrPayloadElements(ssrStream, {
            inlinePayload: options.ssrPayload,
            primePageForHtmlSsr: options.waitForAllReady === true,
          })
          readSsrPayloadElements = () => resolvedInlineSsrPayloadElements
        } else {
          readSsrPayloadElements = createAppSsrPayloadReader(ssrStream, {
            decodePayload: options?.ssrPayloadDecoder,
            primePageForHtmlSsr: options?.waitForAllReady === true,
          })
        }
        setCurrentSsrAppElementsReader(readSsrPayloadElements)

        function AppSsrPayloadRoot(): TextCompatNode {
          const elements = readSsrPayloadElements()
          setCurrentSsrAppElements(elements)
          const metadata = AppElementsWire.readMetadata(elements)
          const routeElement = elements[metadata.routeId]
          if (routeElement === undefined && process.env.NODE_ENV !== 'production') {
            console.warn(
              '[text] Missing App Router element entry during HTML SSR root render: ' +
                metadata.routeId,
            )
          }
          const routePlan =
            typeof routeElement === 'function'
              ? routeElement
              : routeElement &&
                  typeof routeElement === 'object' &&
                  'version' in routeElement &&
                  routeElement.version === 1 &&
                  'html' in routeElement &&
                  typeof routeElement.html === 'string'
                ? (writer: any) => {
                    writer.chunks.push(routeElement.html)
                  }
                : null
          return createServerElement(
            ElementsContext.Provider,
            { value: elements },
            createServerElement(AppServerFragment, null, routePlan as any),
          )
        }

        const payloadRootElement = createServerElement(AppSsrPayloadRoot)
        const root = AppRouterContext
          ? createServerElement(
              AppRouterContext.Provider,
              { value: appRouterInstance },
              payloadRootElement,
            )
          : payloadRootElement
        const ssrTree = ServerInsertedHTMLContext
          ? createServerElement(
              ServerInsertedHTMLContext.Provider,
              { value: useServerInsertedHTML },
              root,
            )
          : root

        // Capture inline `<Script strategy="beforeInteractive">` content so the
        // SSR stream transform can emit it immediately after `<head ...>`
        // opens — ahead of every server renderer-emitted resource hint. The Script shim
        // pushes here when it sees an inline beforeInteractive Script and
        // returns `null` from its render so the server renderer does not also serialize the
        // tag where the user wrote it (where Fizz would push it *after* the
        // hoisted stylesheets/modulepreloads). See
        // packages/text/src/shims/script.tsx for the capture side.
        const beforeInteractiveInlineScripts: BeforeInteractiveInlineScript[] = []
        const registerBeforeInteractiveInlineScript = (
          script: BeforeInteractiveInlineScript,
        ): void => {
          beforeInteractiveInlineScripts.push(script)
        }
        const treeWithBeforeInteractive = createServerElement(
          BeforeInteractiveContext.Provider,
          { value: registerBeforeInteractiveInlineScript },
          ssrTree,
        )
        const ssrRoot = options?.scriptNonce
          ? createServerElement(
              ScriptNonceContext.Provider,
              { value: options.scriptNonce },
              treeWithBeforeInteractive,
            )
          : treeWithBeforeInteractive

        // plugin-rsc returns the bootstrap as `import("<url>")` so callers can
        // inject it via `bootstrapScriptContent`. We hand the URL to the SSR renderer's
        // `bootstrapModules` option instead so the streamed HTML contains a
        // real `<script type="module" src="<url>">` tag — exposing the URL
        // to anything that inspects `script.attribs.src` (e.g. the Text.js
        // asset-prefix fixture test "bundles should return 200 on served
        // assetPrefix"). Mirrors Text.js's app-render path which passes
        // `bootstrapScripts: [{ src }]` for the same reason; we use
        // `bootstrapModules` because text's chunks are native ES modules
        // (Vite output) so a `type="module"` tag is the correct loader.
        //
        // In dev, `<url>` is a Vite dev URL like
        // `/@id/__x00__virtual:text-app-browser-entry`; the browser fetches
        // it as a module from the dev server. In prod it's the hashed bundle
        // URL (e.g. `/_text/static/index-abc123.js`, optionally prefixed by
        // `assetPrefix`). Both are valid `<script type="module" src=…>` targets.
        const bootstrapScriptContent = await loadAppBootstrapScriptContent()
        const bootstrapModuleUrl = extractBootstrapModuleUrl(bootstrapScriptContent)
        const errorMetaRenderer = createSsrErrorMetaRenderer({
          basePath: options?.basePath,
        })

        const htmlStream = await renderAppSsrToReadableStream(ssrRoot, {
          // `bootstrapScriptContent` was previously how text injected the
          // dynamic-import call. `bootstrapModules` performs the same work
          // natively (and exposes the URL in the DOM), so passing both would
          // load the bootstrap module twice.
          //
          // CSP implications of using `bootstrapModules` instead of inline
          // `bootstrapScriptContent`:
          //  - Apps no longer need `script-src 'unsafe-inline'` to load the
          //    bootstrap (improvement — inline imports required `'unsafe-inline'`).
          //  - Apps that restrict script sources need `'self'` for the
          //    common case, or the CDN origin when `assetPrefix` is an
          //    absolute URL like `https://cdn.example.com`.
          //  - The SSR renderer still applies `nonce` to the emitted
          //    `<script type="module" src=…>` tag, so nonce-based CSP
          //    (`script-src 'nonce-…' 'strict-dynamic'`) keeps working.
          bootstrapModules: bootstrapModuleUrl ? [bootstrapModuleUrl] : undefined,
          formState: options?.formState ?? null,
          nonce: options?.scriptNonce,
          onError(error) {
            errorMetaRenderer.capture(error)
            options?.onSsrError?.(error)

            if (error && typeof error === 'object' && 'digest' in error) {
              return String(error.digest)
            }

            if (process.env.NODE_ENV === 'production' && error) {
              const message = getErrorMessage(error)
              const stack = error instanceof Error ? (error.stack ?? '') : ''
              return ssrErrorDigest(message + stack)
            }

            return undefined
          },
        })

        // When producing static output (prerender / ISR cache writes), wait for
        // the full server-rendered tree to resolve before emitting bytes. This prevents
        // Suspense fallback content from being serialized to the cache.
        // Matches Text.js waitForAllReady forkpoint in renderToNodeFizzStream.
        if (options?.waitForAllReady === true) {
          await htmlStream.allReady
        }

        const rscEmbed = createRscEmbed()
        if (options?.capturedRscDataRef) {
          options.capturedRscDataRef.value = rscEmbed.getRawBuffer()
        }

        const fontHTML = renderFontHtml(fontData, options?.scriptNonce)
        let didInjectHeadHTML = false
        const getInsertedHTML = async (): Promise<string> => {
          const insertedHTML = await renderInsertedHtml(renderServerInsertedHTML())
          const errorMetaHTML = errorMetaRenderer.flush()
          if (didInjectHeadHTML) return insertedHTML + errorMetaHTML

          didInjectHeadHTML = true
          return buildHeadInjectionHtml(
            navContext,
            bootstrapModuleUrl,
            options?.formState ?? null,
            insertedHTML + errorMetaHTML,
            fontHTML,
            options?.scriptNonce,
          )
        }

        // The transform calls this once when it splices after `<head ...>`.
        // By that point the compat SSR renderer has rendered the layout's
        // `<head>` children (where the Script shim registers), so the captured
        // array is populated. We deliberately return a snapshot —
        // `flushBuffered` will not re-invoke us, and any beforeInteractive
        // Script that renders later (inside a Suspense boundary further down
        // the tree) falls back to its inline location, matching the documented
        // guarantee that ordering applies to scripts rendered in the initial
        // shell.
        const getBeforeInteractiveHeadHTML = (): string =>
          renderBeforeInteractiveInlineScripts(beforeInteractiveInlineScripts, options?.scriptNonce)

        return deferUntilStreamConsumed(
          htmlStream.pipeThrough(
            createTickBufferedTransform(rscEmbed, getInsertedHTML, getBeforeInteractiveHeadHTML),
          ),
          cleanup,
        )
      } catch (error) {
        cleanup()
        throw error
      }
    })
  }) as Promise<ReadableStream<Uint8Array>>
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    // Block protocol-relative URL open redirects (including percent-encoded
    // variants like /%5Cevil.com/). See request-pipeline.ts for details.
    if (isOpenRedirectShaped(url.pathname)) {
      return notFoundResponse()
    }

    const rscRequestHandler = await loadAppRscRequestHandler()
    const result = await rscRequestHandler(request)

    if (result instanceof Response) {
      return result
    }

    if (result == null) {
      return notFoundResponse()
    }

    return new Response(String(result), { status: 200 })
  },
}

export const prepareCompiledReferences = installAppClientReferenceResolver
