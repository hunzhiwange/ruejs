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
import Script, { type ScriptProps } from '../src/shims/script.js?text-ssr'

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

  it('renders <script> tag for beforeInteractive strategy', async () => {
    const html = await renderToString(
      createElement(Script, {
        src: '/analytics.js',
        strategy: 'beforeInteractive',
      } as ScriptProps),
    )
    expect(html).toContain('<script')
    expect(html).toContain('src="/analytics.js"')
  })

  it('emits a preload link for afterInteractive strategy on SSR (no <script> tag)', async () => {
    const html = await renderToString(
      createElement(Script, {
        src: '/tracking.js',
        strategy: 'afterInteractive',
      } as ScriptProps),
    )
    // The App SSR resource-hint path hoists this into <link rel="preload"> in <head>.
    // The Script component itself never returns a <script> tag for afterInteractive.
    // Mirrors .textjs-ref/packages/text/src/client/script.tsx:361-376.
    expect(html).toMatch(/<link\b[^>]*\brel="preload"/)
    expect(html).toContain('href="/tracking.js"')
    expect(html).toContain('as="script"')
    expect(html).not.toContain('<script')
  })

  it('renders nothing for lazyOnload strategy on SSR', async () => {
    const html = await renderToString(() =>
      createElement(Script, {
        src: '/lazy.js',
        strategy: 'lazyOnload',
      } as ScriptProps),
    )
    expect(html).not.toContain('<script')
  })

  it('renders nothing for worker strategy on SSR', async () => {
    const html = await renderToString(() =>
      createElement(Script, {
        src: '/worker.js',
        strategy: 'worker',
      } as ScriptProps),
    )
    expect(html).not.toContain('<script')
  })
})
