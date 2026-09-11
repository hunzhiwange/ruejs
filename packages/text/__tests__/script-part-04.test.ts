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

  it('passes through additional attributes for beforeInteractive', async () => {
    const html = await renderToString(
      createElement(Script, {
        src: '/secure.js',
        strategy: 'beforeInteractive',
        integrity: 'sha384-abc123',
        crossOrigin: 'anonymous',
      } as ScriptProps),
    )
    expect(html).toContain('<script')
    expect(html).toContain('src="/secure.js"')
  })

  it('uses the request nonce for beforeInteractive scripts when none is passed explicitly', async () => {
    const html = await renderToString(
      createElement(
        ScriptNonceProvider,
        { nonce: 'test-nonce' },
        createElement(Script, {
          src: '/analytics.js',
          strategy: 'beforeInteractive',
        } as ScriptProps),
      ),
    )
    expect(html).toContain('nonce="test-nonce"')
  })

  it('prefers the DOM nonce property over a stripped nonce attribute on the client', async () => {
    const appendedScripts: Array<{ attrs: Record<string, string> }> = []
    class MockHTMLElement {
      nonce = ''
      getAttribute(_name: string): string | null {
        return null
      }
    }

    const nonceElement = new MockHTMLElement()
    nonceElement.nonce = 'property-nonce'
    nonceElement.getAttribute = (name: string) => (name === 'nonce' ? '' : null)

    const createdScript = {
      attrs: {} as Record<string, string>,
      nonce: 'property-nonce',
      getAttribute(name: string) {
        return this.attrs[name] ?? null
      },
      setAttribute(name: string, value: string) {
        this.attrs[name] = value
      },
      addEventListener() {},
    }

    setGlobalValue('HTMLElement', MockHTMLElement)
    setGlobalValue('window', {})
    setGlobalValue('document', {
      querySelector(selector: string) {
        return selector === '[nonce]' ? nonceElement : null
      },
      createElement(tagName: string) {
        expect(tagName).toBe('script')
        return createdScript
      },
      body: {
        appendChild(element: unknown) {
          appendedScripts.push(element as { attrs: Record<string, string> })
        },
      },
    })

    handleClientScriptLoad({ src: '/client.js' })

    expect(appendedScripts).toHaveLength(1)
    expect(appendedScripts[0]!.attrs.nonce).toBe('property-nonce')
  })

  it('clears forced async execution when async is explicitly false', async () => {
    type MockScript = {
      async: boolean
      attrs: Record<string, string>
      src: string
      setAttribute(name: string, value: string): void
      removeAttribute(name: string): void
      getAttribute(name: string): string | null
      addEventListener(): void
    }

    const appendedScripts: MockScript[] = []
    class MockHTMLElement {}

    const createdScript: MockScript = {
      async: true,
      attrs: {},
      src: '',
      setAttribute(name: string, value: string) {
        this.attrs[name] = value
      },
      removeAttribute(name: string) {
        Reflect.deleteProperty(this.attrs, name)
      },
      getAttribute(name: string): string | null {
        return this.attrs[name] ?? null
      },
      addEventListener() {},
    }

    setGlobalValue('HTMLElement', MockHTMLElement)
    setGlobalValue('window', {})
    setGlobalValue('document', {
      querySelector() {
        return null
      },
      createElement(tagName: string) {
        expect(tagName).toBe('script')
        return createdScript
      },
      body: {
        appendChild(element: unknown) {
          appendedScripts.push(element as typeof createdScript)
        },
      },
    })

    handleClientScriptLoad({ src: '/ordered-script.js', async: false })

    expect(appendedScripts).toHaveLength(1)
    expect(appendedScripts[0]!.async).toBe(false)
    expect(appendedScripts[0]!.attrs).not.toHaveProperty('async')
  })
})
