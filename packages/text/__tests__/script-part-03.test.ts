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

  it('emits both preload link and <script> tag for beforeInteractive with src', async () => {
    const html = await renderToString(
      createElement(Script, {
        src: '/before.js',
        strategy: 'beforeInteractive',
      } as ScriptProps),
    )
    expect(html).toMatch(/<link\b[^>]*\brel="preload"/)
    expect(html).toContain('href="/before.js"')
    expect(html).toContain('as="script"')
    expect(html).toContain('<script')
    expect(html).toContain('src="/before.js"')
  })

  it('renders beforeInteractive with id attribute', async () => {
    const html = await renderToString(
      createElement(Script, {
        src: '/gtag.js',
        id: 'google-analytics',
        strategy: 'beforeInteractive',
      } as ScriptProps),
    )
    expect(html).toContain('id="google-analytics"')
    expect(html).toContain('src="/gtag.js"')
  })

  it('renders beforeInteractive with inline content', async () => {
    const html = await renderToString(() =>
      createElement(Script, {
        strategy: 'beforeInteractive',
        children: 'console.log("init")',
      } as ScriptProps),
    )
    expect(html).toContain('<script')
    expect(html).toContain('console.log("init")')
  })

  it('renders beforeInteractive with dangerouslySetInnerHTML', async () => {
    const html = await renderToString(
      createElement(Script, {
        strategy: 'beforeInteractive',
        dangerouslySetInnerHTML: { __html: 'window.x = 1' },
      } as ScriptProps),
    )
    expect(html).toContain('<script')
  })
})
