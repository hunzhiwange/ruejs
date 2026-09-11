import { createInlineScriptTag, safeJsonStringify } from './html.js'
import {
  bytesToBase64,
  concatUint8Arrays,
  RSC_EMBEDDED_BINARY_CHUNK,
  type RscEmbeddedChunk,
} from './app-rsc-embedded-chunks.js'
import { NAVIGATION_RUNTIME_SYMBOL_DESCRIPTION } from '../client/navigation-runtime.js'

type RscEmbedTransform = {
  flush(): string
  finalize(): Promise<string>
  /** Resolves when all raw bytes from the embed stream have been read. */
  getRawBuffer(): Promise<ArrayBuffer>
}

export type RscEmbedTextChunkNormalizer = (text: string) => string

export type CreateRscEmbedTransformOptions = {
  normalizeTextChunk?: RscEmbedTextChunkNormalizer
}

type HtmlInsertion = string | (() => string)

const NAVIGATION_RUNTIME_REFERENCE = `self[Symbol.for(${safeJsonStringify(
  NAVIGATION_RUNTIME_SYMBOL_DESCRIPTION,
)})]`
const BEFORE_INTERACTIVE_INLINE_SCRIPT_RE =
  /<script\b(?=[^>]*\bdata-nscript="beforeInteractive")(?=[^>]*>)(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

export function navigationRuntimeRscBootstrapExpression(): string {
  return `((${NAVIGATION_RUNTIME_REFERENCE}??={bootstrap:{routeManifest:null},functions:{}}).bootstrap.rsc??={rsc:[]})`
}

export function createNavigationRuntimeRscMetadataScript(
  params: Record<string, string | string[]>,
  nav: { pathname: string; searchParams: [string, string][] },
): string {
  const paramsJson = safeJsonStringify(params)
  const navJson = safeJsonStringify(nav)
  return (
    'Object.assign(' +
    navigationRuntimeRscBootstrapExpression() +
    ',{params:' +
    paramsJson +
    ',nav:' +
    navJson +
    '})'
  )
}

function createNavigationRuntimeRscChunkScript(chunk: RscEmbeddedChunk): string {
  const chunkJson = safeJsonStringify(chunk)
  return (
    navigationRuntimeRscBootstrapExpression() +
    '.rsc.push(' +
    chunkJson +
    ');(self.__TEXT_RSC_CHUNKS__??=[]).push(' +
    chunkJson +
    ')'
  )
}

function createNavigationRuntimeRscDoneScript(): string {
  return navigationRuntimeRscBootstrapExpression() + '.done=true;self.__TEXT_RSC_DONE__=true'
}

/**
 * Create a helper that progressively embeds RSC chunks as inline <script> tags.
 * The browser entry turns the embedded chunks back into Uint8Array data.
 */
export function createRscEmbedTransform(
  embedStream: ReadableStream<Uint8Array>,
  scriptNonce?: string,
  options: CreateRscEmbedTransformOptions = {},
): RscEmbedTransform {
  const reader = embedStream.getReader()
  const normalizeTextChunk = options.normalizeTextChunk ?? ((text: string): string => text)
  let pendingChunks: RscEmbeddedChunk[] = []
  const rawChunks: Uint8Array[] = []
  let reading = false

  async function pumpReader(): Promise<void> {
    if (reading) return
    reading = true
    try {
      while (true) {
        let result: ReadableStreamReadResult<Uint8Array>
        try {
          result = await reader.read()
        } catch (error) {
          if (isThenable(error)) {
            await Promise.resolve(error)
            continue
          }
          throw error
        }
        if (result.done) break
        // Accumulate raw bytes before any embed-only normalization so the
        // cache stores unmodified RSC data.
        rawChunks.push(result.value)
        try {
          const decoder = new TextDecoder('utf-8', { fatal: true })
          const text = decoder.decode(result.value)
          pendingChunks.push(normalizeTextChunk(text))
        } catch {
          pendingChunks.push([RSC_EMBEDDED_BINARY_CHUNK, bytesToBase64(result.value)])
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[text] RSC embed stream read error:', error)
      }
      throw error
    } finally {
      reading = false
    }
  }

  const pumpPromise = pumpReader()

  return {
    flush(): string {
      if (pendingChunks.length === 0) return ''

      const chunks = pendingChunks
      pendingChunks = []

      let scripts = ''
      for (const chunk of chunks) {
        scripts += createInlineScriptTag(createNavigationRuntimeRscChunkScript(chunk), scriptNonce)
      }
      return scripts
    },

    async finalize(): Promise<string> {
      await pumpPromise
      let scripts = this.flush()
      scripts += createInlineScriptTag(createNavigationRuntimeRscDoneScript(), scriptNonce)
      return scripts
    },

    async getRawBuffer(): Promise<ArrayBuffer> {
      await pumpPromise
      const buffer = concatUint8Arrays(rawChunks)
      rawChunks.length = 0
      return buffer.buffer
    },
  }
}

/**
 * Fix invalid preload "as" values in server-rendered HTML.
 * The SSR renderer emits <link rel="preload" as="stylesheet"> for CSS, but the
 * HTML spec requires as="style" for <link rel="preload">.
 */
export function fixPreloadAs(html: string): string {
  return html.replace(/<link(?=[^>]*\srel="preload")[^>]*>/g, tag =>
    tag.replace(' as="stylesheet"', ' as="style"'),
  )
}

/**
 * Match the `<head ...>` opening tag in a chunk. Matches both bare `<head>`
 * and `<head class="foo">` shapes. Used to splice HTML immediately after the
 * opening tag so injected content runs before any renderer-emitted resource
 * hints (stylesheets, modulepreloads) hoisted into `<head>`.
 */
const HEAD_OPEN_RE = /<head\b[^>]*>/
const HTML_OPEN_RE = /<html\b[^>]*>/
const BODY_OPEN_RE = /<body\b[^>]*>/

/**
 * Compiled Rue layouts may omit an explicit `<head>` node. Browsers repair
 * that shape, but the streaming injector needs a concrete head boundary for
 * bootstrap, metadata, and beforeInteractive ordering. Once both the html and
 * body openings are present we know the head was genuinely omitted, rather
 * than merely split across chunks.
 */
export function ensureDocumentHead(html: string): string {
  if (HEAD_OPEN_RE.test(html)) return html
  const htmlOpen = HTML_OPEN_RE.exec(html)
  const bodyOpen = BODY_OPEN_RE.exec(html)
  if (!htmlOpen || !bodyOpen || bodyOpen.index < htmlOpen.index + htmlOpen[0].length) return html
  const insertAt = htmlOpen.index + htmlOpen[0].length
  return `${html.slice(0, insertAt)}<head></head>${html.slice(insertAt)}`
}

/**
 * Create the tick-buffered HTML transform that injects RSC scripts between
 * SSR flush cycles without corrupting split HTML chunks.
 *
 * Two insertion points are supported in tandem:
 *
 *  - `injectHTML` is emitted immediately before `</head>`. This is where the
 *    bulk of text's head additions live (RSC navigation runtime metadata,
 *    bootstrap modulepreload, server-inserted HTML, font preloads, etc.).
 *  - `injectAfterHeadOpenHTML` is emitted immediately after the `<head ...>`
 *    opening tag so the content runs before any renderer-emitted resource
 *    hints. This is where inline `<Script strategy="beforeInteractive">`
 *    captures land so the no-flash dark-mode pattern works.
 *
 * Fallback behaviour differs by insertion point:
 *
 *  - `injectHTML` is emitted at end-of-stream by the `flush` handler when no
 *    chunk ever contained `</head>` — callers still see the payload on
 *    highly fragmented streams (just at the end of the body rather than in
 *    the head).
 *  - `injectAfterHeadOpenHTML` is silently dropped when `<head ...>` is not
 *    found in a discoverable chunk. Emitting it at end-of-stream would put
 *    it after the document body, defeating the point — the splice has to
 *    happen before resource hints to be useful, so the safer behaviour is
 *    to no-op and let the user-rendered Script (in its source-order
 *    position) ship as-is.
 */
export function createTickBufferedTransform(
  rscEmbed: RscEmbedTransform,
  injectHTML: string | (() => string | Promise<string>) = '',
  injectAfterHeadOpenHTML: HtmlInsertion = '',
): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  const insertsPerFlush = typeof injectHTML === 'function'
  let injected = false
  let preHeadInjected = false
  let buffered: string[] = []
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let flushWork = Promise.resolve()
  const readInsertion = (): string | Promise<string> =>
    typeof injectHTML === 'function' ? injectHTML() : injectHTML
  const readPreHeadInsertion = (): string =>
    typeof injectAfterHeadOpenHTML === 'function'
      ? injectAfterHeadOpenHTML()
      : injectAfterHeadOpenHTML
  const emitInsertion = async (
    controller: TransformStreamDefaultController<Uint8Array>,
  ): Promise<void> => {
    const insertion = await readInsertion()
    if (insertion) {
      controller.enqueue(encoder.encode(insertion))
    }
  }

  const extractFallbackBeforeInteractiveScript = (): string => {
    if (preHeadInjected || buffered.length === 0) return ''
    const joined = buffered.join('')
    const match = BEFORE_INTERACTIVE_INLINE_SCRIPT_RE.exec(joined)
    if (!match) return ''
    const headMatch = HEAD_OPEN_RE.exec(joined)
    if (!headMatch || headMatch.index > match.index) return ''

    buffered = [joined.slice(0, match.index) + joined.slice(match.index + match[0].length)]
    return match[0]
  }

  /**
   * Splice the pre-head insertion (typically captured beforeInteractive inline
   * scripts) immediately after the `<head ...>` opening tag. Returns the
   * rewritten chunk and a flag indicating whether the splice happened, so the
   * caller can mark `preHeadInjected` and stop scanning further chunks.
   *
   * NOTE: This is called only when `<head ...>` lies fully inside `chunk` —
   * we deliberately avoid stitching across chunk boundaries because doing so
   * would force the transform to hold output until it had seen `<head ...>`,
   * which both delays TTFB and complicates the existing `</head>` injection
   * path. In practice the compat SSR renderer emits the opening shell as a
   * single chunk.
   */
  const spliceAfterHeadOpen = (
    chunk: string,
    fallbackInsertion = '',
  ): { chunk: string; spliced: boolean } => {
    if (preHeadInjected) return { chunk, spliced: false }
    const insertion = readPreHeadInsertion() + fallbackInsertion
    if (!insertion) return { chunk, spliced: false }
    const match = HEAD_OPEN_RE.exec(chunk)
    if (!match) return { chunk, spliced: false }
    const insertAt = match.index + match[0].length
    return {
      chunk: chunk.slice(0, insertAt) + insertion + chunk.slice(insertAt),
      spliced: true,
    }
  }

  const flushBuffered = async (
    controller: TransformStreamDefaultController<Uint8Array>,
  ): Promise<void> => {
    if (buffered.length === 0) return
    buffered = [ensureDocumentHead(buffered.join(''))]
    const fallbackPreHeadInsertion = extractFallbackBeforeInteractiveScript()
    const batch = fixPreloadAs(buffered.join(''))
    buffered = []

    if (injected && insertsPerFlush) {
      // Emit newly collected server-inserted HTML before the text Fizz HTML
      // batch so CSS-in-JS styles precede the elements they style.
      await emitInsertion(controller)
    }

    for (const chunk of [batch]) {
      let working = chunk
      if (!preHeadInjected) {
        const result = spliceAfterHeadOpen(working, fallbackPreHeadInsertion)
        if (result.spliced) {
          working = result.chunk
          preHeadInjected = true
        }
      }
      if (!injected) {
        const headEnd = working.indexOf('</head>')
        if (headEnd !== -1) {
          const before = working.slice(0, headEnd)
          const after = working.slice(headEnd)
          controller.enqueue(encoder.encode(before + (await readInsertion()) + after))
          injected = true
          continue
        }
      }
      controller.enqueue(encoder.encode(working))
    }
  }

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffered.push(decoder.decode(chunk, { stream: true }))

      if (timeoutId !== null) return

      timeoutId = setTimeout(() => {
        timeoutId = null
        flushWork = flushWork
          .then(async () => {
            await flushBuffered(controller)
            const rscScripts = rscEmbed.flush()
            if (rscScripts) controller.enqueue(encoder.encode(rscScripts))
          })
          .catch(error => {
            controller.error(error)
          })
      }, 0)
    },

    async flush(controller) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }

      await flushWork
      await flushBuffered(controller)

      if (!injected) {
        await emitInsertion(controller)
        injected = true
      } else if (insertsPerFlush) {
        await emitInsertion(controller)
      }

      const finalScripts = await rscEmbed.finalize()
      if (finalScripts) {
        controller.enqueue(encoder.encode(finalScripts))
      }
    },
  })
}
