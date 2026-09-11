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
  it('does not throw during SSR when window/document exist but HTMLElement is undefined', async () => {
    // Exact minimal repro shape from the upstream bug report: window and
    // document are defined, HTMLElement is not. Pre-fix this threw inside
    // `getClientAutoNonce` because the `instanceof` reference was unguarded.
    setGlobalValue('window', {})
    setGlobalValue('document', {
      querySelector: () => ({ getAttribute: () => 'test-nonce' }),
    })
    setGlobalValue('HTMLElement', undefined)

    await expect(
      renderToString(
        createElement(Script, {
          strategy: 'beforeInteractive',
          dangerouslySetInnerHTML: { __html: "console.log('init')" },
        } as ScriptProps),
      ),
    ).resolves.toEqual(expect.any(String))
  })

  it('picks up the nonce attribute when HTMLElement is unavailable but the [nonce] element is present', async () => {
    // Same runtime shape as above, plus a Script with no explicit/contextual
    // nonce: the DOM fallback must still find the nonce via `getAttribute`.
    setGlobalValue('window', {})
    setGlobalValue('document', {
      querySelector: () => ({ getAttribute: () => 'attr-nonce' }),
    })
    setGlobalValue('HTMLElement', undefined)

    const html = await renderToString(
      createElement(Script, {
        src: '/x.js',
        strategy: 'beforeInteractive',
      } as ScriptProps),
    )

    expect(html).toContain('nonce="attr-nonce"')
  })

  it('prefers the contextual nonce over a DOM nonce and does not query the document', async () => {
    // DOM auto-detection is a browser-only convenience. When the server has
    // already provided a contextual nonce we should never reach into the DOM,
    // and the contextual value must win regardless of what `[nonce]` returns.
    let querySelectorCalls = 0
    class MockHTMLElement {
      nonce = 'wrong-nonce'
      getAttribute(_name: string): string | null {
        return 'wrong-nonce'
      }
    }
    setGlobalValue('HTMLElement', MockHTMLElement)
    setGlobalValue('window', {})
    setGlobalValue('document', {
      querySelector(_selector: string) {
        querySelectorCalls += 1
        return new MockHTMLElement()
      },
    })

    const html = await renderToString(
      createElement(
        ScriptNonceProvider,
        { nonce: 'context-nonce' },
        createElement(Script, {
          src: '/x.js',
          strategy: 'beforeInteractive',
        } as ScriptProps),
      ),
    )

    expect(html).toContain('nonce="context-nonce"')
    expect(html).not.toContain('wrong-nonce')
    expect(querySelectorCalls).toBe(0)
  })

  it('uses the DOM nonce when HTMLElement is defined and no explicit/contextual nonce is provided', async () => {
    // The browser-only fallback: HTMLElement is real, the element matches,
    // and the resolver reads the typed `.nonce` property first (browsers
    // strip the serialised attribute under CSP).
    class MockHTMLElement {
      nonce = 'dom-nonce'
      getAttribute(_name: string): string | null {
        return null
      }
    }
    setGlobalValue('HTMLElement', MockHTMLElement)
    setGlobalValue('window', {})
    setGlobalValue('document', {
      querySelector(_selector: string) {
        return new MockHTMLElement()
      },
    })

    const html = await renderToString(
      createElement(Script, {
        src: '/x.js',
        strategy: 'beforeInteractive',
      } as ScriptProps),
    )

    expect(html).toContain('nonce="dom-nonce"')
  })
})
