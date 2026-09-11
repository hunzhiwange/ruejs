/**
 * text/document shim tests.
 *
 * These components render placeholder markers that the Pages Router dev-server
 * replaces with real content via string substitution. The tests verify the
 * contracts the dev-server depends on — not that Rue can render a div.
 */
import { describe, it, expect } from 'vite-plus/test'
import { createElement, renderToString } from './rue-ssr-test-utils.js'
import Document, {
  Html,
  Head,
  Main,
  TextScript,
  getTextMainHtml,
  getTextScriptsHtml,
} from '../src/shims/document.js?text-ssr'

function render(el: unknown): Promise<string> {
  return renderToString(el)
}

describe('Main', () => {
  it('exposes the main placeholder HTML as a pure helper', () => {
    expect(getTextMainHtml()).toBe('__TEXT_MAIN__')
  })

  it('renders the __TEXT_MAIN__ placeholder inside a #__text container', async () => {
    const html = await render(createElement(Main))
    // Dev-server looks for id="__text" and replaces __TEXT_MAIN__ with rendered page content
    expect(html).toContain('id="__text"')
    expect(html).toContain('__TEXT_MAIN__')
  })
})

describe('TextScript', () => {
  it('exposes the script placeholder HTML as a pure helper', () => {
    expect(getTextScriptsHtml()).toBe('<!-- __TEXT_SCRIPTS__ -->')
  })

  it('renders the __TEXT_SCRIPTS__ comment that dev-server replaces with hydration scripts', async () => {
    const html = await render(createElement(TextScript))
    // Dev-server replaces this HTML comment with __TEXT_DATA__ + module script tags
    expect(html).toContain('<!-- __TEXT_SCRIPTS__ -->')
  })
})

describe('Head', () => {
  it('injects default charset and viewport meta tags', async () => {
    const html = await render(createElement(Head))
    expect(html).toContain('charSet="utf-8"')
    expect(html).toContain('content="width=device-width, initial-scale=1"')
  })

  it('preserves custom children alongside defaults', async () => {
    const html = await render(createElement(Head, null, createElement('title', null, 'My App')))
    // Custom content rendered
    expect(new DOMParser().parseFromString(html, 'text/html').title).toBe('My App')
    // Defaults still present
    expect(html).toContain('charSet="utf-8"')
  })
})

describe('Default Document', () => {
  it('assembles all sub-components in the nesting order the dev-server expects', async () => {
    const html = await render(createElement(Document))

    // The dev-server does string replacement on this output.
    // If the nesting order breaks, SSR output will be malformed.
    const headOpen = html.indexOf('<head>')
    const bodyOpen = html.indexOf('<body>')
    const mainDiv = html.indexOf('id="__text"')
    const placeholder = html.indexOf('__TEXT_MAIN__')
    const scripts = html.indexOf('__TEXT_SCRIPTS__')
    const bodyClose = html.indexOf('</body>')

    // All markers must be present
    expect(headOpen).toBeGreaterThan(-1)
    expect(bodyOpen).toBeGreaterThan(-1)
    expect(mainDiv).toBeGreaterThan(-1)
    expect(placeholder).toBeGreaterThan(-1)
    expect(scripts).toBeGreaterThan(-1)

    // Order matters: head < body < main < placeholder < scripts < /body
    expect(headOpen).toBeLessThan(bodyOpen)
    expect(bodyOpen).toBeLessThan(mainDiv)
    expect(mainDiv).toBeLessThan(placeholder)
    expect(placeholder).toBeLessThan(scripts)
    expect(scripts).toBeLessThan(bodyClose)
  })
})

describe('Html', () => {
  it('forwards lang prop to the root <html> element', async () => {
    const html = await render(createElement(Html, { lang: 'fr' }))
    expect(html).toMatch(/<html[^>]*lang="fr"/)
  })

  it('wraps the entire document as the root element', async () => {
    const html = await render(createElement(Document))
    // Default Document uses Html as root — output must start with <html
    expect(html.replace(/<!--[\s\S]*?-->/g, '')).toMatch(/^<html/)
  })
})

describe('compiled Document factory', () => {
  it('composes a custom document through compiled factories', async () => {
    function MyDocument() {
      return createElement(
        Html,
        { lang: 'ja' },
        createElement(Head),
        createElement(
          'body',
          null,
          createElement('div', { id: 'doc-marker' }, 'ok'),
          createElement(Main),
          createElement(TextScript),
        ),
      )
    }
    const html = await render(createElement(MyDocument))
    expect(html).toMatch(/<html[^>]*lang="ja"/)
    expect(html).toContain('id="doc-marker"')
    expect(html).toContain('__TEXT_MAIN__')
    expect(html).toContain('__TEXT_SCRIPTS__')
  })

  it('exposes a static getInitialProps that resolves to a DocumentInitialProps-shaped value', async () => {
    // The runtime contract: subclasses commonly delegate via
    // `await Document.getInitialProps(ctx)` and destructure `html` from the
    // result. The stub returns an empty html shell — the test pins the shape
    // so wiring up the full Pages Router renderPage flow later doesn't
    // silently regress consumers that destructure `html`.
    const result = await Document.getInitialProps({})
    expect(typeof result.html).toBe('string')
  })
})
