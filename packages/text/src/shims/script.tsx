'use client'

/**
 * text/script shim
 *
 * Provides the <Script> component for loading third-party scripts with
 * configurable loading strategies.
 *
 * Strategies:
 *   - "beforeInteractive": rendered as a <script> tag in SSR output
 *   - "afterInteractive" (default): loaded client-side after hydration
 *   - "lazyOnload": deferred until window.load + requestIdleCallback
 *   - "worker": sets type="text/partytown" (requires Partytown setup)
 */

import { useEffect, useRef } from '@rue-js/rue'
import { hasAppNavigationRuntimeBootstrap } from '../client/navigation-runtime.js'
import { escapeInlineContent } from './head-records.js'
import { useScriptNonce } from './script-nonce-context.js'
import {
  useBeforeInteractiveRegister,
  type BeforeInteractiveInlineScript,
} from './before-interactive-context.js'
import { type TextCompatElement, type TextCompatNode } from './component-adapter.js'
import { getCurrentRequestScriptNonce } from './unified-request-context.js'

export type ScriptProps = {
  /** Script source URL */
  src?: string
  /** Loading strategy. Default: "afterInteractive" */
  strategy?: 'beforeInteractive' | 'afterInteractive' | 'lazyOnload' | 'worker'
  /** Unique identifier for the script */
  id?: string
  /** Called when the script has loaded */
  onLoad?: (e: Event) => void
  /** Called when the script is ready (after load, and on every re-render if already loaded) */
  onReady?: () => void
  /** Called on script load error */
  onError?: (e: Event) => void
  /** Inline script content */
  children?: TextCompatNode
  /** Dangerous inner HTML */
  dangerouslySetInnerHTML?: { __html: string }
  /** Script type attribute */
  type?: string
  /** Async attribute */
  async?: boolean
  /** Defer attribute */
  defer?: boolean
  /** Crossorigin attribute */
  crossOrigin?: string
  /** Nonce for CSP */
  nonce?: string
  /** Integrity hash */
  integrity?: string
  /** Additional attributes */
  [key: string]: unknown
}

// Track scripts that have already been loaded, plus remote scripts currently
// loading, to avoid duplicate DOM insertion when same-src components mount
// before the first load event fires.
const loadedScripts = new Set<string>()
const loadingScripts = new Map<string, Promise<Event>>()

function preloadScriptResource(input: {
  src: string
  crossOrigin?: 'anonymous' | 'use-credentials'
  integrity?: string
  nonce?: string
}): void {
  if (typeof document === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'script'
  link.href = input.src
  if (input.crossOrigin) link.crossOrigin = input.crossOrigin
  if (input.integrity) link.integrity = input.integrity
  if (input.nonce) link.nonce = input.nonce
  document.head.appendChild(link)
}

function ScriptPreload(input: {
  src: string
  crossOrigin?: 'anonymous' | 'use-credentials'
  integrity?: string
  nonce?: string
}) {
  const props: Record<string, unknown> = {
    rel: 'preload',
    href: input.src,
    as: 'script',
  }
  if (input.crossOrigin) props.crossorigin = input.crossOrigin
  if (input.integrity) props.integrity = input.integrity
  if (input.nonce) props.nonce = input.nonce
  return <link {...props} />
}

function SsrPreload(input: {
  src?: string
  strategy: ScriptProps['strategy']
  rest: Record<string, unknown>
  resolvedNonce?: string
}): TextCompatElement | null {
  const { src, strategy, rest, resolvedNonce } = input
  if (!src || (strategy !== 'afterInteractive' && strategy !== 'beforeInteractive')) {
    return null
  }

  const integrity = typeof rest.integrity === 'string' ? rest.integrity : undefined
  const crossOrigin =
    rest.crossOrigin === 'anonymous' || rest.crossOrigin === 'use-credentials'
      ? rest.crossOrigin
      : undefined

  preloadScriptResource({
    src,
    crossOrigin,
    integrity,
    nonce: resolvedNonce,
  })
  return (
    <ScriptPreload
      src={src}
      crossOrigin={crossOrigin}
      integrity={integrity}
      nonce={resolvedNonce}
    />
  )
}

function getClientAutoNonce(): string | undefined {
  if (typeof document === 'undefined') return undefined

  const existingNonceElement = document.querySelector('[nonce]')
  if (!existingNonceElement) return undefined

  // `HTMLElement` is not defined in some SSR/edge runtimes that polyfill
  // `document` but stop short of the full DOM surface. Guarding the
  // constructor before `instanceof` keeps SSR from crashing in those hosts;
  // when the constructor *is* present we still prefer the typed `.nonce`
  // property because browsers strip the `nonce` attribute from serialised
  // HTML for CSP reasons.
  if (typeof HTMLElement !== 'undefined' && existingNonceElement instanceof HTMLElement) {
    return existingNonceElement.nonce || existingNonceElement.getAttribute('nonce') || undefined
  }

  return existingNonceElement.getAttribute('nonce') || undefined
}

function resolveScriptNonce(explicitNonce: unknown, contextualNonce?: string): string | undefined {
  if (typeof explicitNonce === 'string' && explicitNonce.length > 0) {
    return explicitNonce
  }

  if (typeof contextualNonce === 'string' && contextualNonce.length > 0) {
    return contextualNonce
  }

  if (typeof window === 'undefined') {
    return undefined
  }

  return getClientAutoNonce()
}

function buildBeforeInteractiveScriptProps(options: {
  src?: string
  id?: string
  rest: Record<string, unknown>
  resolvedNonce?: string
  dangerouslySetInnerHTML?: { __html: string }
}): Record<string, unknown> {
  const scriptProps: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(options.rest)) {
    if (key === 'nonce' || key.startsWith('__rue_')) continue
    if (value !== undefined && value !== null) scriptProps[key] = value
  }
  if (options.src) scriptProps.src = options.src
  if (options.id) scriptProps.id = options.id
  scriptProps['data-nscript'] = 'beforeInteractive'
  if (options.resolvedNonce) {
    scriptProps.nonce = options.resolvedNonce
  }
  if (options.dangerouslySetInnerHTML) {
    scriptProps.dangerouslySetInnerHTML = {
      __html: escapeInlineContent(options.dangerouslySetInnerHTML.__html, 'script'),
    }
  }
  return scriptProps
}

/**
 * Extract the inline script content for a `beforeInteractive` Script element
 * with no `src`. Returns `null` when the element has neither a string-shaped
 * `children` value nor a valid `dangerouslySetInnerHTML.__html` payload — in
 * that case the caller should fall through to the regular rendering path.
 *
 * The returned string is the raw author-supplied JavaScript content. Callers
 * are responsible for passing it through `escapeInlineContent(..., "script")`
 * before emitting it inside a `<script>` tag (we keep that escape adjacent
 * to the emit point so the rule is obvious at the boundary).
 */
function extractBeforeInteractiveInlineContent(
  children: TextCompatNode,
  dangerouslySetInnerHTML?: { __html: string },
): string | null {
  if (
    dangerouslySetInnerHTML &&
    typeof dangerouslySetInnerHTML.__html === 'string' &&
    dangerouslySetInnerHTML.__html.length > 0
  ) {
    return dangerouslySetInnerHTML.__html
  }
  if (typeof children === 'string' && children.length > 0) {
    return children
  }
  if (Array.isArray(children) && children.every(c => typeof c === 'string')) {
    const joined = (children as string[]).join('')
    return joined.length > 0 ? joined : null
  }
  return null
}

/**
 * Convert the residual `<Script>` props into a plain string-attributes record
 * for emission inside a hoisted `<script>` tag. Drops runtime-only props
 * (event handlers, children, etc.) and reserved keys already handled by the
 * pre-head-injection emitter (id, nonce). Skips `undefined`/`null` so they
 * round-trip as "attribute absent" rather than `attr="undefined"`.
 */
function collectBeforeInteractiveAttributes(
  rest: Record<string, unknown>,
): Record<string, string | boolean> {
  const RESERVED = new Set([
    'id',
    'nonce',
    'src',
    'children',
    'strategy',
    'dangerouslySetInnerHTML',
    'onLoad',
    'onReady',
    'onError',
  ])
  const out: Record<string, string | boolean> = {}
  for (const [key, value] of Object.entries(rest)) {
    if (RESERVED.has(key)) continue
    if (value === undefined || value === null || value === false) continue
    if (typeof value === 'boolean') {
      out[key] = true
      continue
    }
    if (typeof value === 'string' || typeof value === 'number') {
      out[key] = String(value)
      continue
    }
    // Skip anything else (functions, objects) — they cannot serialise into an
    // HTML attribute and only the developer-controlled string/boolean shape
    // is expected for native `<script>` attributes here.
  }
  return out
}

function setBooleanScriptAttribute(el: HTMLScriptElement, attr: string, value: unknown): boolean {
  const enabled = value !== false && value !== 'false' && Boolean(value)

  switch (attr) {
    case 'async':
      el.async = enabled
      break
    case 'defer':
      el.defer = enabled
      break
    case 'noModule':
    case 'nomodule':
      el.noModule = enabled
      break
    default:
      return false
  }

  if (!enabled) {
    // Dynamic script elements start in the browser's force-async state.
    // Setting and removing the attribute mirrors Text.js and clears that state.
    el.setAttribute(attr, '')
    el.removeAttribute(attr)
  }

  return true
}

function setScriptAttributes(el: HTMLScriptElement, rest: Record<string, unknown>): void {
  for (const [attr, value] of Object.entries(rest)) {
    if (attr === 'dangerouslySetInnerHTML') continue
    if (value === undefined) continue
    if (setBooleanScriptAttribute(el, attr, value)) continue
    if (attr === 'className' && typeof value === 'string') {
      el.setAttribute('class', value)
    } else if (typeof value === 'string') {
      el.setAttribute(attr, value)
    } else if (typeof value === 'boolean' && value) {
      el.setAttribute(attr, '')
    }
  }
}

function loadClientScript(
  props: ScriptProps,
  options: {
    resolvedNonce?: string
    fireReadyWhenAlreadyLoaded: boolean
  },
): void {
  const {
    src,
    id,
    onLoad,
    onReady,
    onError,
    strategy = 'afterInteractive',
    children,
    dangerouslySetInnerHTML,
    ...rest
  } = props
  if (typeof window === 'undefined') return

  const key = id ?? src ?? ''
  if (key && loadedScripts.has(key)) {
    if (options.fireReadyWhenAlreadyLoaded) {
      onReady?.()
    }
    return
  }

  if (src) {
    const existingLoad = loadingScripts.get(src)
    if (existingLoad) {
      void existingLoad.then(
        event => {
          if (key) loadedScripts.add(key)
          onLoad?.(event)
          onReady?.()
        },
        event => onError?.(event),
      )
      return
    }
  }

  const el = document.createElement('script')
  if (src) el.src = src
  if (id) el.id = id

  setScriptAttributes(el, rest)
  if (options.resolvedNonce && !el.getAttribute('nonce')) {
    el.setAttribute('nonce', options.resolvedNonce)
  }

  if (strategy === 'worker') {
    el.setAttribute('type', 'text/partytown')
  }

  const markLoaded = () => {
    if (key) loadedScripts.add(key)
    onReady?.()
  }

  if (dangerouslySetInnerHTML?.__html) {
    // Intentional: mirrors the Text.js <Script> API where dangerouslySetInnerHTML
    // is developer-supplied inline script content (not user input). The prop name
    // itself signals developer awareness of the XSS risk, consistent with the
    // underlying JSX runtime design. User-supplied data must never flow into
    // this prop.
    el.innerHTML = dangerouslySetInnerHTML.__html
    markLoaded()
  } else if (children && typeof children === 'string') {
    el.textContent = children
    markLoaded()
  } else if (src) {
    const loadPromise = new Promise<Event>((resolve, reject) => {
      el.addEventListener('load', event => {
        resolve(event)
        if (key) loadedScripts.add(key)
        onLoad?.(event)
        onReady?.()
      })
      el.addEventListener('error', event => {
        reject(event)
        onError?.(event)
      })
    })
    loadPromise.catch(() => undefined).finally(() => loadingScripts.delete(src))
    loadingScripts.set(src, loadPromise)
  }

  document.body.appendChild(el)
}

/**
 * Load a script imperatively (outside of a component render).
 */
export function handleClientScriptLoad(props: ScriptProps): void {
  loadClientScript(props, {
    resolvedNonce: resolveScriptNonce(props.nonce),
    fireReadyWhenAlreadyLoaded: false,
  })
}

/**
 * Initialize multiple scripts at once (called during app bootstrap).
 */
export function initScriptLoader(scripts: ScriptProps[]): void {
  for (const script of scripts) {
    handleClientScriptLoad(script)
  }
}

function Script(props: ScriptProps) {
  const {
    src,
    id,
    strategy = 'afterInteractive',
    onLoad,
    onReady,
    onError,
    children,
    dangerouslySetInnerHTML,
    ...rest
  } = props

  if (typeof window === 'undefined') {
    const contextualNonce = useScriptNonce() ?? getCurrentRequestScriptNonce()
    const resolvedNonce = resolveScriptNonce(rest.nonce, contextualNonce)
    const registerBeforeInteractive = useBeforeInteractiveRegister()
    if (strategy !== 'beforeInteractive')
      return <SsrPreload src={src} strategy={strategy} rest={rest} resolvedNonce={resolvedNonce} />
    const inlineContent = src
      ? null
      : extractBeforeInteractiveInlineContent(children, dangerouslySetInnerHTML)
    if (inlineContent !== null && registerBeforeInteractive) {
      const inline: BeforeInteractiveInlineScript = {
        id,
        // Escape `</script>` sequences exactly as the inline render path does
        // (see buildBeforeInteractiveScriptProps); keep the escape colocated
        // with the emit boundary so it never gets accidentally skipped.
        innerHTML: escapeInlineContent(inlineContent, 'script'),
        nonce: resolvedNonce,
        attributes: collectBeforeInteractiveAttributes(rest),
      }
      registerBeforeInteractive(inline)
      return null
    }

    const scriptElement = (
      <script
        {...buildBeforeInteractiveScriptProps({
          src,
          id,
          rest,
          resolvedNonce,
          dangerouslySetInnerHTML,
        })}
      >
        {children}
      </script>
    )
    const InlineScript = () => scriptElement
    return (
      <>
        <SsrPreload src={src} strategy={strategy} rest={rest} resolvedNonce={resolvedNonce} />
        <InlineScript />
      </>
    )
  }

  const hasMounted = useRef(false)
  const key = id ?? src ?? ''
  const contextualNonce = useScriptNonce()
  const resolvedNonce = resolveScriptNonce(rest.nonce, contextualNonce)
  // Client path: load scripts via useEffect based on strategy.
  // useEffect never runs during SSR, so it's safe to call unconditionally.
  useEffect(() => {
    if (hasMounted.current) return
    hasMounted.current = true

    if (strategy === 'beforeInteractive') {
      return
    }

    // Already loaded — just fire onReady
    if (key && loadedScripts.has(key)) {
      onReady?.()
      return
    }

    const load = () => {
      if (key && loadedScripts.has(key)) {
        onReady?.()
        return
      }

      loadClientScript(
        {
          src,
          id,
          strategy,
          onLoad,
          onReady,
          onError,
          children,
          dangerouslySetInnerHTML,
          ...rest,
        },
        { resolvedNonce, fireReadyWhenAlreadyLoaded: true },
      )
    }

    if (strategy === 'lazyOnload') {
      // Wait for window load, then use idle callback
      if (document.readyState === 'complete') {
        if (typeof requestIdleCallback === 'function') {
          requestIdleCallback(load)
        } else {
          setTimeout(load, 1)
        }
      } else {
        window.addEventListener('load', () => {
          if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(load)
          } else {
            setTimeout(load, 1)
          }
        })
      }
    } else {
      // "afterInteractive" (default), "beforeInteractive" (client re-mount), "worker"
      load()
    }
  }, [
    src,
    id,
    strategy,
    onLoad,
    onReady,
    onError,
    children,
    dangerouslySetInnerHTML,
    key,
    resolvedNonce,
    rest,
  ])

  if (strategy === 'beforeInteractive') {
    // On the client, only suppress the `<script>` render for inline
    // beforeInteractive Scripts in App Router pages. The pre-head splice
    // in app-ssr-entry/app-ssr-stream already put the tag in the DOM, so
    // rendering it again would either duplicate the script (for Scripts
    // outside `<head>`) or cause a hydration mismatch (positions differ).
    //
    // For Pages Router and any other SSR path that didn't run through
    // app-ssr-entry, the server rendered the `<script>` inline in source
    // order, so the client must match. We detect "App Router" via the
    // navigation runtime that the App Router bootstrap installs before
    // mounting the app root — it is the most reliable runtime signal we
    // can read from inside a `"use client"` shim.
    //
    // External-`src` beforeInteractive scripts always keep rendering
    // inline. They are not captured by the pre-head splice and must mount
    // through the runtime so their `src` attribute is fetched on the client.
    const inlineContent = src
      ? null
      : extractBeforeInteractiveInlineContent(children, dangerouslySetInnerHTML)
    if (inlineContent !== null && hasAppNavigationRuntimeBootstrap()) {
      return null
    }

    return (
      <script
        {...buildBeforeInteractiveScriptProps({
          src,
          id,
          rest,
          resolvedNonce,
          dangerouslySetInnerHTML,
        })}
      >
        {children}
      </script>
    )
  }

  // The component itself renders nothing — scripts are injected imperatively
  return <></>
}

export default Script
