/**
 * text/head shim unit tests.
 *
 * Mirrors test cases from Text.js test/unit/text-head-rendering.test.ts,
 * plus comprehensive coverage for text's Head SSR collection, HTML
 * generation, allowed tags, and escaping.
 */
import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import Head, {
  resetSSRHead,
  getSSRHeadHTML,
  escapeAttr,
  reduceHeadChildren,
  createHeadRecord,
  _applyHeadPropsToElement,
} from '../src/shims/head.js'
import {
  createElement,
  Fragment,
  renderAppServerElementToHtml,
} from './app-server-protocol-test-utils.js'

// ─── SSR rendering (mirrors Text.js test/unit/text-head-rendering.test.ts) ──

describe('Rendering text/head', async () => {
  beforeEach(async () => {
    resetSSRHead()
  })

  it('should render outside of Text.js without error', async () => {
    // Text.js test: renderToString(<><Head /><p>hello world</p></>)
    // Verifies Head doesn't throw when used standalone
    const html = await renderAppServerElementToHtml(
      createElement(
        Fragment,
        null,
        createElement(Head, null),
        createElement('p', null, 'hello world'),
      ),
    )
    expect(html).toContain('hello world')
  })

  it('returns null (no rendered output in body)', async () => {
    const html = await renderAppServerElementToHtml(
      createElement(Head, null, createElement('title', null, 'My Page')),
    )
    // Head always returns null — elements are collected, not rendered inline
    expect(html.replace(/<!--[\s\S]*?-->/g, '')).toBe('')
  })
})

// ─── SSR head collection ────────────────────────────────────────────────

describe('Head SSR collection', async () => {
  beforeEach(async () => {
    resetSSRHead()
  })

  it('collects title element', async () => {
    await renderAppServerElementToHtml(
      createElement(Head, null, createElement('title', null, 'My Page Title')),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('<title')
    expect(headHtml).toContain('My Page Title')
    expect(headHtml).toContain('</title>')
    expect(headHtml).toContain('data-text-head=""')
  })

  it('collects meta elements as self-closing', async () => {
    await renderAppServerElementToHtml(
      createElement(
        Head,
        null,
        createElement('meta', { name: 'description', content: 'A test page' }),
      ),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('<meta name="description" content="A test page"')
    expect(headHtml).toContain('/>') // self-closing
    expect(headHtml).not.toContain('</meta>')
  })

  it('collects link elements as self-closing', async () => {
    await renderAppServerElementToHtml(
      createElement(Head, null, createElement('link', { rel: 'stylesheet', href: '/styles.css' })),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('<link rel="stylesheet" href="/styles.css"')
    expect(headHtml).toContain('/>') // self-closing
  })

  it('collects style elements', async () => {
    await renderAppServerElementToHtml(
      createElement(Head, null, createElement('style', null, 'body { color: red; }')),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('<style')
    // Text content is HTML-escaped
    expect(headHtml).toContain('body { color: red; }')
  })

  it('collects script elements', async () => {
    await renderAppServerElementToHtml(
      createElement(Head, null, createElement('script', { src: '/analytics.js', async: true })),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('<script src="/analytics.js" async')
    expect(headHtml).toContain('</script>')
  })

  it('collects base element as self-closing', async () => {
    await renderAppServerElementToHtml(
      createElement(Head, null, createElement('base', { href: 'https://example.com/' })),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('<base href="https://example.com/"')
    expect(headHtml).toContain('/>') // self-closing
  })

  it('collects noscript elements', async () => {
    await renderAppServerElementToHtml(
      createElement(Head, null, createElement('noscript', null, 'JavaScript is required')),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('<noscript')
    expect(headHtml).toContain('JavaScript is required')
    expect(headHtml).toContain('</noscript>')
  })

  it('collects multiple head elements in order', async () => {
    await renderAppServerElementToHtml(
      createElement(
        Head,
        null,
        createElement('title', null, 'First'),
        createElement('meta', { name: 'viewport', content: 'width=device-width' }),
        createElement('link', { rel: 'icon', href: '/favicon.ico' }),
      ),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('First')
    expect(headHtml).toContain('viewport')
    expect(headHtml).toContain('favicon.ico')
  })

  it('resets head between renders', async () => {
    await renderAppServerElementToHtml(
      createElement(Head, null, createElement('title', null, 'Page 1')),
    )
    expect(getSSRHeadHTML()).toContain('Page 1')

    resetSSRHead()

    await renderAppServerElementToHtml(
      createElement(Head, null, createElement('title', null, 'Page 2')),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('Page 2')
    expect(headHtml).not.toContain('Page 1')
  })

  it('returns empty string when no head elements', async () => {
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toBe('')
  })

  it('dedupes keyed tags across multiple Head instances and keeps the last one', async () => {
    // Text.js documents `key` as the dedupe mechanism for text/head tags:
    // https://github.com/vercel/next.js/blob/canary/docs/02-pages/04-api-reference/01-components/head.mdx
    await renderAppServerElementToHtml(
      createElement(
        Fragment,
        null,
        createElement(
          Head,
          null,
          createElement('meta', {
            property: 'og:title',
            content: 'Original Title',
            key: 'og-title',
          }),
        ),
        createElement(
          Head,
          null,
          createElement('meta', {
            property: 'og:title',
            content: 'Updated Title',
            key: 'og-title',
          }),
        ),
      ),
    )

    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('content="Updated Title"')
    expect(headHtml).not.toContain('content="Original Title"')
    expect(headHtml.match(/property="og:title"/g)).toHaveLength(1)
  })

  it('dedupes keyed tags across Head instances when one Head has multiple children', async () => {
    await renderAppServerElementToHtml(
      createElement(
        Fragment,
        null,
        createElement(
          Head,
          null,
          createElement('meta', {
            property: 'og:title',
            content: 'Title A',
            key: 'og-title',
          }),
          createElement('meta', {
            name: 'description',
            content: 'Desc A',
            key: 'desc',
          }),
        ),
        createElement(
          Head,
          null,
          createElement('meta', {
            property: 'og:title',
            content: 'Title B',
            key: 'og-title',
          }),
        ),
      ),
    )

    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('content="Title B"')
    expect(headHtml).toContain('content="Desc A"')
    expect(headHtml).not.toContain('content="Title A"')
    expect(headHtml.match(/property="og:title"/g)).toHaveLength(1)
  })
})

function record(tag: string, props: Record<string, unknown>) {
  const { key, ...attributes } = props
  return createHeadRecord(tag, attributes, key as string)
}
describe('Head reduction', async () => {
  it('dedupes keyed tags and keeps the last matching element', async () => {
    const reduced = reduceHeadChildren([
      record('meta', {
        property: 'og:title',
        content: 'Original Title',
        key: 'og-title',
      }),
      record('meta', {
        property: 'og:title',
        content: 'Updated Title',
        key: 'og-title',
      }),
    ])

    expect(reduced).toHaveLength(1)
    const dedupedMeta = reduced[0] as { props?: { content?: string } } | undefined
    expect(dedupedMeta?.props.content).toBe('Updated Title')
  })

  it('dedupes meta[name] tags without explicit keys using the last value', async () => {
    const reduced = reduceHeadChildren([
      [
        record('meta', {
          name: 'description',
          content: 'Description A',
        }),
        record('meta', {
          name: 'description',
          content: 'Description B',
        }),
      ],
    ])

    expect(reduced).toHaveLength(1)
    const dedupedMeta = reduced[0] as { props?: { content?: string } } | undefined
    expect(dedupedMeta?.props.content).toBe('Description B')
  })
})

// ─── Disallowed tags ────────────────────────────────────────────────────

describe('Head disallowed tags', async () => {
  beforeEach(async () => {
    resetSSRHead()
  })

  it('ignores <div> tag (not allowed in head)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(async () => {})
    await renderAppServerElementToHtml(createElement(Head, null, createElement('div', null, 'bad')))
    const headHtml = getSSRHeadHTML()
    expect(headHtml).not.toContain('<div')
    expect(headHtml).toBe('')
    warn.mockRestore()
  })

  it('ignores <iframe> tag (security concern)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(async () => {})
    await renderAppServerElementToHtml(
      createElement(Head, null, createElement('iframe', { src: 'https://evil.com' })),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).not.toContain('<iframe')
    expect(headHtml).toBe('')
    warn.mockRestore()
  })

  it('executes compiled components inside Head', async () => {
    function CustomComponent() {
      return createElement('meta', { name: 'custom' })
    }
    await renderAppServerElementToHtml(createElement(Head, null, createElement(CustomComponent)))
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('<meta name="custom"')
  })

  it('keeps allowed tags while ignoring disallowed ones', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(async () => {})
    await renderAppServerElementToHtml(
      createElement(
        Head,
        null,
        createElement('title', null, 'Good'),
        createElement('div', null, 'Bad'),
        createElement('meta', { name: 'good' }),
      ),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('Good')
    expect(headHtml).toContain('name="good"')
    expect(headHtml).not.toContain('<div')
    warn.mockRestore()
  })
})

// ─── HTML/Attribute escaping ────────────────────────────────────────────

describe('Head escaping', async () => {
  beforeEach(async () => {
    resetSSRHead()
  })

  it('escapes HTML in text content', async () => {
    await renderAppServerElementToHtml(
      createElement(Head, null, createElement('title', null, 'Page <script>alert("xss")</script>')),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('&lt;script&gt;')
    expect(headHtml).not.toContain('<script>alert')
  })

  it('escapes HTML in attribute values', async () => {
    await renderAppServerElementToHtml(
      createElement(Head, null, createElement('meta', { name: 'test"value', content: 'a<b>c&d' })),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('&quot;')
    expect(headHtml).toContain('&lt;')
    expect(headHtml).toContain('&amp;')
  })

  it('renders dangerouslySetInnerHTML raw on SSR', async () => {
    await renderAppServerElementToHtml(
      createElement(
        Head,
        null,
        createElement('script', {
          dangerouslySetInnerHTML: { __html: 'console.log("hello")' },
        }),
      ),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('console.log("hello")')
  })

  it('empty dangerouslySetInnerHTML.__html takes precedence over children on SSR', async () => {
    await renderAppServerElementToHtml(
      createElement(
        Head,
        null,
        // oxlint-disable-text-line rue/no-danger-with-children
        createElement('style', {
          dangerouslySetInnerHTML: { __html: '' },
          // oxlint-disable-text-line rue/no-children-prop
          children: 'fallback',
        }),
      ),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).not.toContain('fallback')
    expect(headHtml).toMatch(/<style[^>]*><\/style>/)
  })

  it('converts className to class attribute', async () => {
    await renderAppServerElementToHtml(
      createElement(Head, null, createElement('style', { className: 'critical' }, 'body{}')),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain('class="critical"')
    expect(headHtml).not.toContain('className')
  })

  it('renders boolean true attributes as bare attribute name', async () => {
    await renderAppServerElementToHtml(
      createElement(
        Head,
        null,
        createElement('script', { src: '/app.js', async: true, defer: true }),
      ),
    )
    const headHtml = getSSRHeadHTML()
    expect(headHtml).toContain(' async ')
    expect(headHtml).toContain(' defer ')
  })
})

describe('Head client sync', async () => {
  function createElementDouble() {
    const attributes = new Map<string, string>()
    return {
      attributes,
      innerHTML: '',
      textContent: '',
      setAttribute(name: string, value: string) {
        attributes.set(name, value)
      },
    }
  }

  it('applies dangerouslySetInnerHTML to client-managed head elements', async () => {
    // Text.js client reference:
    // packages/text/src/client/head-manager.ts rueElementToDOM()
    // sets el.innerHTML from dangerouslySetInnerHTML.__html.
    const element = createElementDouble()

    _applyHeadPropsToElement(element, {
      dangerouslySetInnerHTML: { __html: 'body { color: red; }' },
    })

    expect(element.innerHTML).toBe('body { color: red; }')
  })

  it('ignores malformed dangerouslySetInnerHTML without __html key', async () => {
    // dangerouslySetInnerHTML: {} has no __html key, so getDangerouslySetInnerHTML
    // returns undefined. The client falls through to children (matching SSR behavior).
    const element = createElementDouble()
    element.innerHTML = 'previous'

    _applyHeadPropsToElement(element, {
      dangerouslySetInnerHTML: {},
    })

    // No valid __html and no children — content is unchanged.
    expect(element.innerHTML).toBe('previous')
  })

  it('falls through to children when dangerouslySetInnerHTML has no __html key', async () => {
    const element = createElementDouble()

    _applyHeadPropsToElement(element, {
      dangerouslySetInnerHTML: {},
      children: 'fallback',
    })

    // Malformed dangerouslySetInnerHTML is ignored, children win.
    expect(element.textContent).toBe('fallback')
  })

  it('empty dangerouslySetInnerHTML.__html takes precedence over children on client', async () => {
    const element = createElementDouble()
    _applyHeadPropsToElement(element, {
      children: 'fallback',
      dangerouslySetInnerHTML: { __html: '' },
    })
    expect(element.innerHTML).toBe('')
    expect(element.textContent).toBe('')
  })

  it('prefers dangerouslySetInnerHTML over children on client-managed head elements', async () => {
    const element = createElementDouble()

    _applyHeadPropsToElement(element, {
      children: 'children content',
      dangerouslySetInnerHTML: { __html: 'raw content' },
    })

    expect(element.innerHTML).toBe('raw content')
    expect(element.textContent).toBe('')
  })

  it('sets textContent from children when dangerouslySetInnerHTML is absent', async () => {
    const element = createElementDouble()
    _applyHeadPropsToElement(element, { children: 'hello' })
    expect(element.textContent).toBe('hello')
    expect(element.innerHTML).toBe('')
  })

  it('sets textContent from array children by joining them', async () => {
    const element = createElementDouble()
    _applyHeadPropsToElement(element, { children: ['a', 'b', 'c'] })
    expect(element.textContent).toBe('abc')
    expect(element.innerHTML).toBe('')
  })
})

// ─── escapeAttr utility ─────────────────────────────────────────────────

describe('escapeAttr', async () => {
  it('escapes ampersand', async () => {
    expect(escapeAttr('a&b')).toBe('a&amp;b')
  })

  it('escapes double quotes', async () => {
    expect(escapeAttr('a"b')).toBe('a&quot;b')
  })

  it('escapes angle brackets', async () => {
    expect(escapeAttr('a<b>c')).toBe('a&lt;b&gt;c')
  })

  it('returns safe strings unchanged', async () => {
    expect(escapeAttr('hello world')).toBe('hello world')
  })

  it('escapes all special chars together', async () => {
    expect(escapeAttr('&"<>')).toBe('&amp;&quot;&lt;&gt;')
  })
})
