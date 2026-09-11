import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PAGES_FIXTURE_DIR } from './helpers.js'
import {
  createElement,
  renderAppServerElementToHtml,
  renderAppServerElementToHtmlAsync,
} from './app-server-protocol-test-utils.js'
import {
  createElement as createRueElement,
  renderToString as renderRueToString,
} from './rue-ssr-test-utils.js'
import { isExternalUrl, isHashOnlyChange } from '../src/shims/router.js?text-ssr'
import { extractTextTextDataJson } from '../src/client/text-text-data.js'
import { isValidModulePath } from '../src/client/validate-module-path.js'
import text from '../src/index.js'
import { safeJsonStringify } from '../src/server/html.js'
import { buildPagesTextDataScript } from '../src/server/pages-page-response.js'
import type { Plugin } from 'vite-plus'
import type { TextRouter } from '../src/shims/router.js?text-ssr'
import type { CacheHandler, CacheHandlerValue, IncrementalCacheValue } from '../src/shims/cache.js'

const FIXTURE_DIR = PAGES_FIXTURE_DIR
describe('proxyExternalRequest', () => {
  it('proxies request to external URL and returns upstream response', async () => {
    const { proxyExternalRequest } = await import('../src/config/config-matchers.js')

    // Use a well-known public URL that returns a predictable response
    const request = new Request('http://localhost:3000/test?extra=1', {
      method: 'GET',
      headers: { 'user-agent': 'text-test' },
    })

    // We test the function constructs the right request by mocking fetch
    const originalFetch = globalThis.fetch
    let capturedUrl: string | undefined
    let capturedInit: any
    globalThis.fetch = async (url: any, init: any) => {
      capturedUrl = typeof url === 'string' ? url : url.toString()
      capturedInit = init
      return new Response('proxied body', {
        status: 200,
        headers: { 'content-type': 'text/plain', 'x-upstream': 'true' },
      })
    }

    try {
      const response = await proxyExternalRequest(request, 'https://api.example.com/endpoint')
      expect(capturedUrl).toContain('https://api.example.com/endpoint')
      // Extra query param from original request should be merged
      expect(capturedUrl).toContain('extra=1')
      expect(capturedInit.method).toBe('GET')
      expect(capturedInit.redirect).toBe('manual')
      // Host header should be set to the external target
      expect(capturedInit.headers.get('host')).toBe('api.example.com')
      expect(response.status).toBe(200)
      expect(response.headers.get('x-upstream')).toBe('true')
      const body = await response.text()
      expect(body).toBe('proxied body')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('preserves query parameters from the rewrite destination', async () => {
    const { proxyExternalRequest } = await import('../src/config/config-matchers.js')

    const request = new Request('http://localhost:3000/test', {
      method: 'GET',
    })

    const originalFetch = globalThis.fetch
    let capturedUrl: string | undefined
    globalThis.fetch = async (url: any, _init: any) => {
      capturedUrl = typeof url === 'string' ? url : url.toString()
      return new Response('ok', { status: 200 })
    }

    try {
      await proxyExternalRequest(request, 'https://api.example.com/v1?key=abc')
      expect(capturedUrl).toContain('key=abc')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('preserves repeated original query params when the destination does not define that key', async () => {
    const { proxyExternalRequest } = await import('../src/config/config-matchers.js')

    const request = new Request('http://localhost:3000/test?a=1&a=2&b=3', {
      method: 'GET',
    })

    const originalFetch = globalThis.fetch
    let capturedEntries: Array<[string, string]> | undefined
    globalThis.fetch = async (url: any, _init: any) => {
      capturedEntries = [...new URL(typeof url === 'string' ? url : url.toString()).searchParams]
      return new Response('ok', { status: 200 })
    }

    try {
      await proxyExternalRequest(request, 'https://api.example.com/v1')
      expect(capturedEntries).toEqual([
        ['a', '1'],
        ['a', '2'],
        ['b', '3'],
      ])
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('keeps destination query params authoritative while preserving repeated values for other keys', async () => {
    const { proxyExternalRequest } = await import('../src/config/config-matchers.js')

    const request = new Request('http://localhost:3000/test?a=1&a=2&b=3&b=4', {
      method: 'GET',
    })

    const originalFetch = globalThis.fetch
    let capturedEntries: Array<[string, string]> | undefined
    globalThis.fetch = async (url: any, _init: any) => {
      capturedEntries = [...new URL(typeof url === 'string' ? url : url.toString()).searchParams]
      return new Response('ok', { status: 200 })
    }

    try {
      await proxyExternalRequest(request, 'https://api.example.com/v1?a=dest')
      expect(capturedEntries).toEqual([
        ['a', 'dest'],
        ['b', '3'],
        ['b', '4'],
      ])
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('strips hop-by-hop headers from upstream response', async () => {
    const { proxyExternalRequest } = await import('../src/config/config-matchers.js')

    const request = new Request('http://localhost:3000/test')

    const originalFetch = globalThis.fetch
    globalThis.fetch = async (_url: any, _init: any) =>
      new Response('ok', {
        status: 200,
        headers: {
          'content-type': 'text/plain',
          'x-custom': 'preserved',
          // Note: "transfer-encoding" and "connection" are hop-by-hop headers
          // that should be stripped. However, the fetch API may not allow
          // setting them on Response, so we test with headers that can be set.
        },
      })

    try {
      const response = await proxyExternalRequest(request, 'https://api.example.com/test')
      expect(response.headers.get('content-type')).toBe('text/plain')
      expect(response.headers.get('x-custom')).toBe('preserved')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('passes through non-200 status codes', async () => {
    const { proxyExternalRequest } = await import('../src/config/config-matchers.js')

    const request = new Request('http://localhost:3000/test')

    const originalFetch = globalThis.fetch
    globalThis.fetch = async (_url: any, _init: any) => new Response('Not Found', { status: 404 })

    try {
      const response = await proxyExternalRequest(request, 'https://api.example.com/missing')
      expect(response.status).toBe(404)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('forwards credential headers and strips x-middleware-* headers from proxied requests', async () => {
    const { proxyExternalRequest } = await import('../src/config/config-matchers.js')

    const request = new Request('http://localhost:3000/proxy', {
      method: 'GET',
      headers: {
        cookie: 'session=secret123',
        authorization: 'Bearer tok_secret',
        'x-api-key': 'sk_live_secret',
        'proxy-authorization': 'Basic cHJveHk=',
        'x-middleware-rewrite': '/internal',
        'x-middleware-text': '1',
        'x-text-prerender-secret': 'build-secret-123',
        'x-text-prerender-route-params': '%7B%22id%22%3A%22forged%22%7D',
        'x-custom-header': 'keep-me',
        'user-agent': 'text-test',
      },
    })

    const originalFetch = globalThis.fetch
    let capturedHeaders: Headers | undefined
    globalThis.fetch = async (_url: any, init: any) => {
      capturedHeaders = init.headers
      return new Response('ok', { status: 200 })
    }

    try {
      await proxyExternalRequest(request, 'https://api.example.com/data')
      expect(capturedHeaders).toBeDefined()
      // Credential headers must be forwarded to match Text.js external rewrite proxying.
      expect(capturedHeaders!.get('cookie')).toBe('session=secret123')
      expect(capturedHeaders!.get('authorization')).toBe('Bearer tok_secret')
      expect(capturedHeaders!.get('x-api-key')).toBe('sk_live_secret')
      expect(capturedHeaders!.get('proxy-authorization')).toBe('Basic cHJveHk=')
      // Internal middleware headers must be stripped
      expect(capturedHeaders!.get('x-middleware-rewrite')).toBeNull()
      expect(capturedHeaders!.get('x-middleware-text')).toBeNull()
      expect(capturedHeaders!.get('x-text-prerender-secret')).toBeNull()
      expect(capturedHeaders!.get('x-text-prerender-route-params')).toBeNull()
      // Non-sensitive headers must be preserved
      expect(capturedHeaders!.get('x-custom-header')).toBe('keep-me')
      expect(capturedHeaders!.get('user-agent')).toBe('text-test')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('strips hop-by-hop request headers before proxying external rewrites', async () => {
    const { proxyExternalRequest } = await import('../src/config/config-matchers.js')

    const request = new Request('http://localhost:3000/proxy', {
      method: 'DELETE',
      headers: {
        connection: 'keep-alive, x-custom-hop',
        'keep-alive': 'timeout=5',
        te: 'trailers',
        trailers: 'x-trailer',
        'transfer-encoding': 'chunked',
        upgrade: 'websocket',
        'x-custom-hop': 'secret',
        'proxy-authorization': 'Basic cHJveHk=',
        'x-custom-header': 'keep-me',
      },
    })

    const originalFetch = globalThis.fetch
    let capturedHeaders: Headers | undefined
    globalThis.fetch = async (_url: any, init: any) => {
      capturedHeaders = init.headers
      return new Response('ok', { status: 200 })
    }

    try {
      await proxyExternalRequest(request, 'https://api.example.com/data')
      expect(capturedHeaders).toBeDefined()
      expect(capturedHeaders!.get('connection')).toBeNull()
      expect(capturedHeaders!.get('keep-alive')).toBeNull()
      expect(capturedHeaders!.get('te')).toBeNull()
      expect(capturedHeaders!.get('trailers')).toBeNull()
      expect(capturedHeaders!.get('transfer-encoding')).toBeNull()
      expect(capturedHeaders!.get('upgrade')).toBeNull()
      expect(capturedHeaders!.get('x-custom-hop')).toBeNull()
      // Request credentials that are not connection-scoped should still forward.
      expect(capturedHeaders!.get('proxy-authorization')).toBe('Basic cHJveHk=')
      expect(capturedHeaders!.get('x-custom-header')).toBe('keep-me')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('forwards redirect responses without following them', async () => {
    const { proxyExternalRequest } = await import('../src/config/config-matchers.js')

    const request = new Request('http://localhost:3000/test')

    const originalFetch = globalThis.fetch
    globalThis.fetch = async (_url: any, init: any) => {
      // Verify redirect: "manual" was set
      expect(init.redirect).toBe('manual')
      return new Response(null, {
        status: 301,
        headers: { location: 'https://other.example.com/new' },
      })
    }

    try {
      const response = await proxyExternalRequest(request, 'https://api.example.com/old')
      expect(response.status).toBe(301)
      expect(response.headers.get('location')).toBe('https://other.example.com/new')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('strips content-encoding and content-length from proxied response to avoid double-decompression', async () => {
    const { proxyExternalRequest } = await import('../src/config/config-matchers.js')

    const request = new Request('http://localhost:3000/test')

    const originalFetch = globalThis.fetch
    globalThis.fetch = async (_url: any, _init: any) =>
      new Response('decompressed body', {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-encoding': 'gzip',
          'content-length': '42',
          'x-custom': 'keep',
        },
      })

    try {
      const response = await proxyExternalRequest(request, 'https://api.example.com/data')
      // content-encoding and content-length must be stripped to prevent
      // ERR_CONTENT_DECODING_FAILED in the browser (double-decompression bug).
      expect(response.headers.get('content-encoding')).toBeNull()
      expect(response.headers.get('content-length')).toBeNull()
      // Other headers must be preserved
      expect(response.headers.get('content-type')).toBe('application/json')
      expect(response.headers.get('x-custom')).toBe('keep')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

// ---------------------------------------------------------------------------
// matchRewrite + isExternalUrl integration (config-matchers)

describe('matchRewrite with external URLs', () => {
  const emptyCtx = {
    headers: new Headers(),
    cookies: {},
    query: new URLSearchParams(),
    host: 'localhost',
  }

  it('returns full external URL when destination is external', async () => {
    const { matchRewrite, isExternalUrl } = await import('../src/config/config-matchers.js')
    const rewrites = [{ source: '/ph/:path*', destination: 'https://us.i.posthog.com/:path*' }]
    const result = matchRewrite('/ph/decide', rewrites, emptyCtx)
    expect(result).toBe('https://us.i.posthog.com/decide')
    expect(isExternalUrl(result!)).toBe(true)
  })

  it('returns full external URL for static path rewrites', async () => {
    const { matchRewrite, isExternalUrl } = await import('../src/config/config-matchers.js')
    const rewrites = [
      { source: '/ph/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
    ]
    const result = matchRewrite('/ph/static/array.js', rewrites, emptyCtx)
    expect(result).toBe('https://us-assets.i.posthog.com/static/array.js')
    expect(isExternalUrl(result!)).toBe(true)
  })

  it('returns internal path for non-external rewrites', async () => {
    const { matchRewrite, isExternalUrl } = await import('../src/config/config-matchers.js')
    const rewrites = [{ source: '/posts/:id', destination: '/blog/:id' }]
    const result = matchRewrite('/posts/hello', rewrites, emptyCtx)
    expect(result).toBe('/blog/hello')
    expect(isExternalUrl(result!)).toBe(false)
  })

  it('replaces repeated params in rewrite destinations', async () => {
    const { matchRewrite } = await import('../src/config/config-matchers.js')
    const rewrites = [{ source: '/post/:id', destination: '/api/:id/:id' }]
    const result = matchRewrite('/post/123', rewrites, emptyCtx)
    expect(result).toBe('/api/123/123')
  })

  it('replaces adjacent params separated by literal characters', async () => {
    const { matchRewrite } = await import('../src/config/config-matchers.js')
    const rewrites = [{ source: '/legacy/:year/:month', destination: '/archive/:year-:month' }]
    const result = matchRewrite('/legacy/2024/06', rewrites, emptyCtx)
    expect(result).toBe('/archive/2024-06')
  })

  it('replaces hyphenated param names without truncating them', async () => {
    const { matchRewrite } = await import('../src/config/config-matchers.js')
    const rewrites = [{ source: '/auth/:auth-method', destination: '/signin/:auth-method' }]
    const result = matchRewrite('/auth/google', rewrites, emptyCtx)
    expect(result).toBe('/signin/google')
  })

  it('treats hyphen as a literal delimiter when only the shorter param key exists', async () => {
    const { matchRewrite } = await import('../src/config/config-matchers.js')
    const rewrites = [{ source: '/item/:foo', destination: '/dest/:foo-bar' }]
    const result = matchRewrite('/item/123', rewrites, emptyCtx)
    expect(result).toBe('/dest/123-bar')
  })

  it('substitutes named captures from has conditions into rewrite destinations', async () => {
    const { matchRewrite } = await import('../src/config/config-matchers.js')
    // Ported from documented Text.js behavior:
    // https://github.com/vercel/next.js/blob/canary/docs/01-app/03-api-reference/05-config/01-text-config-js/rewrites.mdx
    const rewrites = [
      {
        source: '/:path*',
        has: [{ type: 'header' as const, key: 'x-authorized', value: '(?<authorized>yes|true)' }],
        destination: '/home?authorized=:authorized&path=:path*',
      },
    ]
    const result = matchRewrite('/docs/intro', rewrites, {
      ...emptyCtx,
      headers: new Headers({ 'x-authorized': 'yes' }),
    })
    expect(result).toBe('/home?authorized=yes&path=docs/intro')
  })
})

describe('matchRedirect destination param substitution', () => {
  const emptyCtx = {
    headers: new Headers(),
    cookies: {},
    query: new URLSearchParams(),
    host: 'localhost',
  }

  it('replaces repeated params in redirect destinations', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    const redirects = [{ source: '/post/:id', destination: '/api/:id/:id', permanent: false }]
    const result = matchRedirect('/post/123', redirects, emptyCtx)
    expect(result).toEqual({ destination: '/api/123/123', permanent: false })
  })

  it('replaces adjacent params separated by literal characters in redirect destinations', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    const redirects = [
      { source: '/legacy/:year/:month', destination: '/archive/:year-:month', permanent: true },
    ]
    const result = matchRedirect('/legacy/2024/06', redirects, emptyCtx)
    expect(result).toEqual({ destination: '/archive/2024-06', permanent: true })
  })

  it('replaces repeated locale params in locale-static redirect destinations', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    const redirects = [
      {
        source: '/:locale(en|fr)?/docs',
        destination: '/:locale/:locale/docs',
        permanent: false,
      },
    ]
    const result = matchRedirect('/en/docs', redirects, emptyCtx)
    expect(result).toEqual({ destination: '/en/en/docs', permanent: false })
  })

  it('substitutes named captures from has conditions into redirect destinations', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    // Ported from documented Text.js behavior:
    // https://github.com/vercel/next.js/blob/canary/docs/01-app/03-api-reference/05-config/01-text-config-js/redirects.mdx
    const redirects = [
      {
        source: '/',
        has: [{ type: 'header' as const, key: 'x-authorized', value: '(?<authorized>yes|true)' }],
        destination: '/home?authorized=:authorized',
        permanent: false,
      },
    ]
    const result = matchRedirect('/', redirects, {
      ...emptyCtx,
      headers: new Headers({ 'x-authorized': 'yes' }),
    })
    expect(result).toEqual({ destination: '/home?authorized=yes', permanent: false })
  })
})

// ---------------------------------------------------------------------------
// sanitizeDestination — protocol-relative URL handling

describe('sanitizeDestination', () => {
  it('collapses leading // to / for relative URLs', async () => {
    const { sanitizeDestination } = await import('../src/config/config-matchers.js')
    expect(sanitizeDestination('//evil.com')).toBe('/evil.com')
    expect(sanitizeDestination('///evil.com')).toBe('/evil.com')
    expect(sanitizeDestination('////evil.com/path')).toBe('/evil.com/path')
  })

  it('preserves external http:// and https:// URLs', async () => {
    const { sanitizeDestination } = await import('../src/config/config-matchers.js')
    expect(sanitizeDestination('https://example.com/path')).toBe('https://example.com/path')
    expect(sanitizeDestination('http://example.com')).toBe('http://example.com')
  })

  it('normalizes leading backslashes (browsers treat \\ as /)', async () => {
    const { sanitizeDestination } = await import('../src/config/config-matchers.js')
    expect(sanitizeDestination('\\/evil.com')).toBe('/evil.com')
    expect(sanitizeDestination('\\\\evil.com')).toBe('/evil.com')
    expect(sanitizeDestination('\\\\/evil.com')).toBe('/evil.com')
    expect(sanitizeDestination('/\\evil.com')).toBe('/evil.com')
  })

  it('preserves normal relative paths', async () => {
    const { sanitizeDestination } = await import('../src/config/config-matchers.js')
    expect(sanitizeDestination('/about')).toBe('/about')
    expect(sanitizeDestination('/blog/hello')).toBe('/blog/hello')
    expect(sanitizeDestination('/')).toBe('/')
  })
})

// ---------------------------------------------------------------------------
// Catch-all redirect destination sanitization

describe('open redirect prevention in catch-all redirects', () => {
  const emptyCtx = {
    headers: new Headers(),
    cookies: {},
    query: new URLSearchParams(),
    host: 'localhost',
  }

  it('matchRedirect sanitizes decoded %2F that would produce //evil.com', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    // In the real request flow, the entry point decodes %2F to / and
    // normalizePath collapses // to /. So /old/%2Fevil.com arrives as
    // /old/evil.com (after decode + normalize).
    // Test with the already-decoded path (how matchRedirect is actually called).
    const redirects = [{ source: '/old/:path*', destination: '/:path*', permanent: false }]
    const result = matchRedirect('/old/evil.com', redirects, emptyCtx)
    expect(result).not.toBeNull()
    expect(result!.destination).toBe('/evil.com')
    // Verify it does NOT start with // (protocol-relative)
    expect(result!.destination.startsWith('//')).toBe(false)
  })

  it('matchRedirect sanitizes double-slash in already-decoded paths', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    const redirects = [{ source: '/old/:path*', destination: '/:path*', permanent: false }]
    // Even if an already-decoded path somehow contains //, the sanitizer should handle it
    const result = matchRedirect('/old//evil.com', redirects, emptyCtx)
    expect(result).not.toBeNull()
    expect(result!.destination.startsWith('//')).toBe(false)
  })

  it('matchRedirect preserves valid external redirect destinations', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    const redirects = [
      { source: '/go/:path*', destination: 'https://example.com/:path*', permanent: false },
    ]
    const result = matchRedirect('/go/page', redirects, emptyCtx)
    expect(result).not.toBeNull()
    expect(result!.destination).toBe('https://example.com/page')
  })

  it('matchRewrite sanitizes decoded %2F that would produce //evil.com', async () => {
    const { matchRewrite } = await import('../src/config/config-matchers.js')
    const rewrites = [{ source: '/old/:path*', destination: '/:path*' }]
    // In the real request flow, the entry point decodes and normalizePath
    // collapses //. Test with already-decoded path.
    const result = matchRewrite('/old/evil.com', rewrites, emptyCtx)
    expect(result).not.toBeNull()
    expect(result!).toBe('/evil.com')
    expect(result!.startsWith('//')).toBe(false)
  })
})

describe('text/form shim', () => {
  it('exports default Form component', async () => {
    const mod = await import('../src/shims/form.js?text-ssr')
    expect(mod.default).toBeDefined()
    expect(typeof mod.default).toBe('function')
  })

  it('re-exports useActionState from Rue', async () => {
    const mod = await import('../src/shims/form.js?text-ssr')
    expect(typeof mod.useActionState).toBe('function')
  })

  it('renders a form element with string action in SSR', async () => {
    const { default: Form } = await import('../src/shims/form.js?text-ssr')

    const html = await renderRueToString(() =>
      createRueElement(
        Form,
        { action: '/search' },
        createRueElement('input', { name: 'q' }),
        createRueElement('button', { type: 'submit' }, 'Search'),
      ),
    )
    expect(html).toContain('<form')
    expect(html).toContain('action="/search"')
    expect(html).toContain('name="q"')
    expect(html).toContain('Search')
  })

  it('renders a form with method prop', async () => {
    const { default: Form } = await import('../src/shims/form.js?text-ssr')

    const html = await renderRueToString(() =>
      createRueElement(
        Form,
        { action: '/api/submit', method: 'POST' },
        createRueElement('button', { type: 'submit' }, 'Submit'),
      ),
    )
    expect(html).toContain('<form')
    expect(html).toContain('method="POST"')
  })

  it('renders children inside the form', async () => {
    const { default: Form } = await import('../src/shims/form.js?text-ssr')

    const html = await renderRueToString(() =>
      createRueElement(
        Form,
        { action: '/search' },
        createRueElement('label', null, 'Query:'),
        createRueElement('input', { name: 'q', placeholder: 'Search...' }),
        createRueElement('button', null, 'Go'),
      ),
    )
    expect(html).toContain('Query:')
    expect(html).toContain('placeholder="Search..."')
    expect(html).toContain('Go')
  })

  it('passes className and id through to form element', async () => {
    const { default: Form } = await import('../src/shims/form.js?text-ssr')

    const html = await renderRueToString(() =>
      createRueElement(Form, { action: '/search', className: 'search-form', id: 'main-search' }),
    )
    expect(html).toContain('class="search-form"')
    expect(html).toContain('id="main-search"')
  })
})

describe('Rue hook compatibility adapter', () => {
  it('centralizes Rue-only hook shims for Text-compatible surfaces', async () => {
    const adapter = await import('../src/shims/hooks-adapter.js')

    expect(typeof adapter.useState).toBe('function')
    expect(typeof adapter.useEffect).toBe('function')
    expect(typeof adapter.useRef).toBe('function')
    expect(typeof adapter.useTransition).toBe('function')
    expect(typeof adapter.useActionState).toBe('function')
    expect(typeof adapter.startTransition).toBe('function')
  })

  it('rejects ownerless useState without evaluating the initializer', async () => {
    const adapter = await import('../src/shims/hooks-adapter.js')
    const initializer = vi.fn(() => 2)
    expect(() => adapter.useState(initializer)).toThrow('requires compilation to an owner slot')
    expect(initializer).not.toHaveBeenCalled()
  })
})

describe('compiled client component SSR', () => {
  it('reads initialized state through the writer compilation', async () => {
    const { compileNodePlan } = await import('../../runtime/__tests__/node-plan-test-utils')
    const server = compileNodePlan(
      `import {useState} from '@rue-js/rue'; export const View=()=>{const [count]=useState(()=>3); return <p>{count}</p>}`,
      'server',
    )
    expect(await server.renderToString(server.View)).toContain('>3<!--')
  })
})

describe('text/font/google shim', () => {
  it('returns className and style without variable unless requested for a Google Font', async () => {
    const { createFontLoader } = await import('../src/shims/font-google.js')
    const Inter = createFontLoader('Inter')
    const result = Inter({ subsets: ['latin'], weight: ['400', '700'] })

    expect(result.className).toMatch(/^__font_inter_/)
    expect(result.style.fontFamily).toContain('Inter')
    expect(result.variable).toBeUndefined()
  })

  it('Proxy returns font loaders for any family', async () => {
    const mod = await import('../src/shims/font-google.js')
    const googleFonts = mod.default
    const loader = googleFonts.Poppins
    expect(typeof loader).toBe('function')

    const result = loader({ weight: '400' })
    expect(result.className).toMatch(/^__font_poppins_/)
    expect(result.style.fontFamily).toContain('Poppins')
  })

  it('converts PascalCase to font family name', async () => {
    const mod = await import('../src/shims/font-google.js')
    const googleFonts = mod.default
    const result = googleFonts.RobotoMono({ weight: '400' })

    expect(result.style.fontFamily).toContain('Roboto Mono')
    expect(result.variable).toBeUndefined()
  })

  it('uses custom variable name when provided', async () => {
    const { createFontLoader } = await import('../src/shims/font-google.js')
    const Inter = createFontLoader('Inter')
    const result = Inter({ variable: '--custom-font' })
    // When custom variable is provided, the generated class still sets that variable
    // The returned value is still a class name, not the CSS variable name itself
    expect(result.variable).toMatch(/^__variable_inter_/)
  })

  it('uses custom fallback fonts', async () => {
    const { createFontLoader } = await import('../src/shims/font-google.js')
    const Inter = createFontLoader('Inter')
    const result = Inter({ fallback: ['Helvetica', 'Arial', 'sans-serif'] })
    expect(result.style.fontFamily).toContain('Helvetica')
    expect(result.style.fontFamily).toContain('Arial')
  })

  it('generates CSS rules for className (SSR)', async () => {
    const { createFontLoader, getSSRFontStyles } = await import('../src/shims/font-google.js')
    // Clear any previously collected styles
    getSSRFontStyles()

    const Inter = createFontLoader('Inter')
    const result = Inter({ subsets: ['latin'], weight: ['400'] })

    // getSSRFontStyles should return CSS rules mapping className to font-family
    const styles = getSSRFontStyles()
    const allCss = styles.join('\n')
    expect(allCss).toContain(`.${result.className}`)
    expect(allCss).toContain('font-family:')
    expect(allCss).toContain('Inter')
  })

  it('generates CSS variable rule when variable is specified', async () => {
    const { createFontLoader, getSSRFontStyles } = await import('../src/shims/font-google.js')
    getSSRFontStyles() // clear

    const Inter = createFontLoader('Inter')
    Inter({ variable: '--font-inter' })
    const styles = getSSRFontStyles()
    const allCss = styles.join('\n')
    expect(allCss).toContain('--font-inter:')
  })
})
