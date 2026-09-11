/**
 * text/script shim unit tests.
 *
 * Tests the Script component's SSR behavior, strategy handling,
 * and the imperative script loading utilities (handleClientScriptLoad,
 * initScriptLoader). Only SSR-testable behaviors are verified here;
 * client-side loading strategies require a browser environment.
 */
import { afterEach, beforeEach, describe, it, expect } from 'vite-plus/test'
import { createElement, renderToString } from './rue-ssr-test-utils.js'
import Script, { handleClientScriptLoad, type ScriptProps } from '../src/shims/script.js?text-ssr'
import { ScriptNonceProvider } from '../src/shims/script-nonce-context.js?text-ssr'

const originalDocument = globalThis.document
const originalWindow = globalThis.window
const originalHTMLElement = globalThis.HTMLElement

function setGlobalValue(key: 'document' | 'window' | 'HTMLElement', value: unknown): void {
  if (value === undefined) {
    Reflect.deleteProperty(globalThis, key)
    return
  }

  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value,
  })
}

afterEach(() => {
  setGlobalValue('document', originalDocument)
  setGlobalValue('window', originalWindow)
  setGlobalValue('HTMLElement', originalHTMLElement)
})

// ─── SSR rendering ──────────────────────────────────────────────────────

describe('Script SSR rendering', () => {
  beforeEach(() => {
    setGlobalValue('document', undefined)
    setGlobalValue('window', undefined)
    setGlobalValue('HTMLElement', undefined)
  })

  it('defaults to afterInteractive (emits preload link on SSR)', async () => {
    const html = await renderToString(
      createElement(Script, {
        src: '/default.js',
      } as ScriptProps),
    )
    expect(html).toMatch(/<link\b[^>]*\brel="preload"/)
    expect(html).toContain('href="/default.js"')
    expect(html).toContain('as="script"')
  })

  it('preserves crossOrigin and integrity on the preload link', async () => {
    const html = await renderToString(
      createElement(Script, {
        src: '/secure-after.js',
        strategy: 'afterInteractive',
        crossOrigin: 'anonymous',
        integrity: 'sha384-abc123',
      } as ScriptProps),
    )
    expect(html).toMatch(/<link\b[^>]*\brel="preload"/)
    expect(html).toContain('href="/secure-after.js"')
    // Rue normalises `crossOrigin="anonymous"` to `crossorigin=""` in HTML —
    // both forms are equivalent per the HTML spec (an empty value selects
    // the "anonymous" state). Accept either.
    expect(html).toMatch(/crossorigin=("anonymous"|"")/)
    expect(html).toContain('integrity="sha384-abc123"')
  })

  it('does not emit a preload link for inline (no-src) afterInteractive scripts', async () => {
    const html = await renderToString(() =>
      createElement(Script, {
        strategy: 'afterInteractive',
        children: 'console.log("inline")',
      } as ScriptProps),
    )
    expect(html).not.toContain('<script')
    expect(html).not.toContain('rel="preload"')
  })

  it('does not emit a preload link for lazyOnload scripts on SSR', async () => {
    const html = await renderToString(() =>
      createElement(Script, {
        src: '/lazy-preload.js',
        strategy: 'lazyOnload',
      } as ScriptProps),
    )
    expect(html).not.toContain('rel="preload"')
    expect(html).not.toContain('<script')
  })
})
