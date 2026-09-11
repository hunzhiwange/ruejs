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

describe('Script nonce resolution', () => {
  it('emits no nonce in pure Node SSR when no explicit or contextual nonce is provided', async () => {
    // `afterEach` already restores these to undefined; we set them explicitly
    // here so the test reads as a pure-Node assertion regardless of any host
    // polyfill that leaked into the test process.
    setGlobalValue('window', undefined)
    setGlobalValue('document', undefined)
    setGlobalValue('HTMLElement', undefined)

    const html = await renderToString(
      createElement(Script, {
        src: '/x.js',
        strategy: 'beforeInteractive',
      } as ScriptProps),
    )

    expect(html).toContain('src="/x.js"')
    expect(html).not.toContain('nonce=')
  })

  it('returns no nonce when the document has no [nonce] element', async () => {
    // Exercises the "querySelector returned null" branch of getClientAutoNonce.
    class MockHTMLElement {}
    setGlobalValue('HTMLElement', MockHTMLElement)
    setGlobalValue('window', {})
    setGlobalValue('document', {
      querySelector(_selector: string) {
        return null
      },
    })

    const html = await renderToString(
      createElement(Script, {
        src: '/x.js',
        strategy: 'beforeInteractive',
      } as ScriptProps),
    )

    expect(html).toContain('src="/x.js"')
    expect(html).not.toContain('nonce=')
  })
})
