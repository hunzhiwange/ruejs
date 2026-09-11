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
describe('ResponseCookies API', () => {
  it('set() creates Set-Cookie header with options', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('token', 'abc123', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 3600,
    })

    const setCookie = headers.getSetCookie()
    expect(setCookie).toHaveLength(1)
    expect(setCookie[0]).toContain('token=abc123')
    expect(setCookie[0]).toContain('Path=/')
    expect(setCookie[0]).toContain('HttpOnly')
    expect(setCookie[0]).toContain('Secure')
    expect(setCookie[0]).toContain('SameSite=Lax')
    expect(setCookie[0]).toContain('Max-Age=3600')
  })

  it('set() multiple cookies appends multiple Set-Cookie headers', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('a', '1')
    cookies.set('b', '2')

    const setCookie = headers.getSetCookie()
    expect(setCookie).toHaveLength(2)
    expect(setCookie[0]).toContain('a=1')
    expect(setCookie[1]).toContain('b=2')
  })

  it('get() retrieves a cookie from Set-Cookie headers', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('token', 'xyz')
    const result = cookies.get('token')
    expect(result).toEqual({ name: 'token', value: 'xyz' })
  })

  it('getAll() returns all set cookies', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('a', '1')
    cookies.set('b', '2')
    cookies.set('c', '3')

    const all = cookies.getAll()
    expect(all).toHaveLength(3)
    expect(all).toContainEqual({ name: 'a', value: '1' })
    expect(all).toContainEqual({ name: 'b', value: '2' })
    expect(all).toContainEqual({ name: 'c', value: '3' })
  })

  it('has() checks whether a response cookie exists', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('session', 'abc')

    expect(cookies.has('session')).toBe(true)
    expect(cookies.has('missing')).toBe(false)
  })

  it('delete() expires the cookie (matching edge-runtime)', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.delete('session')

    const setCookie = headers.getSetCookie()
    expect(setCookie).toHaveLength(1)
    expect(setCookie[0]).toContain('session=')
    expect(setCookie[0]).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT')
    expect(setCookie[0]).toContain('Path=/')
  })

  it('set() URL-encodes cookie values', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('data', 'hello world; special=chars')

    const setCookie = headers.getSetCookie()
    expect(setCookie[0]).toContain('data=hello%20world%3B%20special%3Dchars')

    // get() should decode it back
    const result = cookies.get('data')
    expect(result?.value).toBe('hello world; special=chars')
  })

  it('iterator yields [name, entry] pairs', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('x', '1')
    cookies.set('y', '2')

    const entries = [...cookies]
    expect(entries).toHaveLength(2)
    expect(entries[0][0]).toBe('x')
    expect(entries[0][1]).toEqual({ name: 'x', value: '1' })
    expect(entries[1][0]).toBe('y')
    expect(entries[1][1]).toEqual({ name: 'y', value: '2' })
  })

  it('set() with domain option includes Domain directive', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('token', 'abc', { domain: '.example.com' })

    const setCookie = headers.getSetCookie()
    expect(setCookie[0]).toContain('Domain=.example.com')
  })

  it('set() with expires option includes Expires directive', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    const expires = new Date('2030-01-01T00:00:00Z')
    cookies.set('token', 'abc', { expires })

    const setCookie = headers.getSetCookie()
    expect(setCookie[0]).toContain('Expires=')
    expect(setCookie[0]).toContain('2030')
  })
})

// ---------------------------------------------------------------------------
// ResponseCookies correctness (Text.js parity)
// Ported from @edge-runtime/cookies: packages/cookies/src/response-cookies.ts
// https://github.com/vercel/edge-runtime/blob/main/packages/cookies/src/response-cookies.ts

describe('ResponseCookies correctness', () => {
  // Bug 1: set() same cookie name twice should replace, not duplicate
  it('set() same cookie name twice replaces the header (no duplicates)', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('session', 'old-value')
    cookies.set('session', 'new-value')

    const setCookie = headers.getSetCookie()
    expect(setCookie).toHaveLength(1)
    expect(setCookie[0]).toContain('session=new-value')
  })

  it('get() returns the latest value after set() overwrites', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('token', 'first')
    cookies.set('token', 'second')

    const result = cookies.get('token')
    expect(result?.value).toBe('second')
  })

  it('set() replaces only the matching cookie, preserves others', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('a', '1')
    cookies.set('b', '2')
    cookies.set('a', '3')

    const setCookie = headers.getSetCookie()
    expect(setCookie).toHaveLength(2)
    // 'a' was replaced, 'b' stays
    const aHeader = setCookie.find((h: string) => h.startsWith('a='))
    const bHeader = setCookie.find((h: string) => h.startsWith('b='))
    expect(aHeader).toContain('a=3')
    expect(bHeader).toContain('b=2')
  })

  // Bug 2: set() should accept object form
  it('set() accepts object form { name, value, ... }', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set({ name: 'token', value: 'abc', httpOnly: true, path: '/api' })

    const setCookie = headers.getSetCookie()
    expect(setCookie).toHaveLength(1)
    expect(setCookie[0]).toContain('token=abc')
    expect(setCookie[0]).toContain('HttpOnly')
    expect(setCookie[0]).toContain('Path=/api')

    const result = cookies.get('token')
    expect(result?.value).toBe('abc')
  })

  it('set() object form replaces existing cookie of same name', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('token', 'old')
    cookies.set({ name: 'token', value: 'new', secure: true })

    const setCookie = headers.getSetCookie()
    expect(setCookie).toHaveLength(1)
    expect(setCookie[0]).toContain('token=new')
    expect(setCookie[0]).toContain('Secure')
  })

  // Bug 3: getAll() should accept optional name filter
  it('getAll(name) filters by cookie name', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('a', '1')
    cookies.set('b', '2')
    cookies.set('c', '3')

    const filtered = cookies.getAll('b')
    expect(filtered).toHaveLength(1)
    expect(filtered[0]).toEqual({ name: 'b', value: '2' })
  })

  it('getAll({ name }) filters by cookie name (object form)', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('x', '10')
    cookies.set('y', '20')

    const filtered = cookies.getAll({ name: 'x' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]).toEqual({ name: 'x', value: '10' })
  })

  it('getAll() with no args returns all cookies', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('a', '1')
    cookies.set('b', '2')

    const all = cookies.getAll()
    expect(all).toHaveLength(2)
  })

  it('getAll(name) returns empty array for non-existent cookie', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('a', '1')

    const filtered = cookies.getAll('missing')
    expect(filtered).toHaveLength(0)
  })

  // Bug 4: delete() should accept object and array forms
  it('delete({ name, path, domain }) sets correct expiry cookie with path and domain', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.delete({ name: 'session', path: '/app', domain: '.example.com' })

    const setCookie = headers.getSetCookie()
    expect(setCookie).toHaveLength(1)
    expect(setCookie[0]).toContain('session=')
    expect(setCookie[0]).toContain('Path=/app')
    expect(setCookie[0]).toContain('Domain=.example.com')
    // Should expire the cookie
    expect(setCookie[0]).toContain('Expires=')
  })

  it('delete() forwards httpOnly, secure, and sameSite attributes', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.delete({
      name: 'session',
      path: '/app',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    })

    const setCookie = headers.getSetCookie()
    expect(setCookie).toHaveLength(1)
    expect(setCookie[0]).toContain('HttpOnly')
    expect(setCookie[0]).toContain('Secure')
    expect(setCookie[0]).toContain('SameSite=Lax')
    expect(setCookie[0]).toContain('Path=/app')
    expect(setCookie[0]).toContain('Expires=')
  })

  it("delete() replaces existing cookie's Set-Cookie header", async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('session', 'abc123', { path: '/app' })
    cookies.delete('session')

    // Should have exactly one Set-Cookie for 'session' (the deletion one)
    const setCookie = headers.getSetCookie()
    const sessionHeaders = setCookie.filter((h: string) => h.startsWith('session='))
    expect(sessionHeaders).toHaveLength(1)
    expect(sessionHeaders[0]).toContain('Expires=')
  })

  // Constructor should parse existing Set-Cookie headers
  it('constructor parses existing Set-Cookie headers', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    headers.append('Set-Cookie', 'existing=value; Path=/')

    const cookies = new ResponseCookies(headers)
    const result = cookies.get('existing')
    expect(result?.value).toBe('value')
  })

  // has() should work with internal map
  it('has() returns false after delete()', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('session', 'abc')
    expect(cookies.has('session')).toBe(true)

    cookies.delete('session')
    // After delete, a new expired cookie replaces the old one.
    // The cookie still "exists" in the map (with empty value and past expiry),
    // matching edge-runtime behavior where delete() calls set().
    // has() returns true because the entry exists in the map.
    expect(cookies.has('session')).toBe(true)
  })

  // get() with object form (matching edge-runtime)
  it('get() accepts object { name } form', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)

    cookies.set('token', 'abc')
    const result = cookies.get({ name: 'token' })
    expect(result?.value).toBe('abc')
  })
})

// ---------------------------------------------------------------------------
// Cookie name/value injection prevention (RFC 6265)

describe('cookie name validation', () => {
  it('RequestCookies.set() rejects names with = (injection)', async () => {
    const headersModule = await import('../src/shims/headers.js')
    headersModule.setHeadersContext({ headers: new Headers(), cookies: new Map() })
    const previousPhase = headersModule.setHeadersAccessPhase('route-handler')
    try {
      const jar = await headersModule.cookies()
      expect(() => jar.set('foo=bar; Path=/; Domain=evil.com', 'val')).toThrow(
        'Invalid cookie name',
      )
    } finally {
      headersModule.setHeadersAccessPhase(previousPhase)
    }
  })

  it('RequestCookies.set() rejects names with semicolons', async () => {
    const headersModule = await import('../src/shims/headers.js')
    headersModule.setHeadersContext({ headers: new Headers(), cookies: new Map() })
    const previousPhase = headersModule.setHeadersAccessPhase('route-handler')
    try {
      const jar = await headersModule.cookies()
      expect(() => jar.set('foo; HttpOnly', 'val')).toThrow('Invalid cookie name')
    } finally {
      headersModule.setHeadersAccessPhase(previousPhase)
    }
  })

  it('RequestCookies.set() rejects names with newlines', async () => {
    const headersModule = await import('../src/shims/headers.js')
    headersModule.setHeadersContext({ headers: new Headers(), cookies: new Map() })
    const previousPhase = headersModule.setHeadersAccessPhase('route-handler')
    try {
      const jar = await headersModule.cookies()
      expect(() => jar.set('foo\r\nSet-Cookie: evil=1', 'val')).toThrow('Invalid cookie name')
    } finally {
      headersModule.setHeadersAccessPhase(previousPhase)
    }
  })

  it('RequestCookies.set() rejects empty names', async () => {
    const headersModule = await import('../src/shims/headers.js')
    headersModule.setHeadersContext({ headers: new Headers(), cookies: new Map() })
    const previousPhase = headersModule.setHeadersAccessPhase('route-handler')
    try {
      const jar = await headersModule.cookies()
      expect(() => jar.set('', 'val')).toThrow('Invalid cookie name')
    } finally {
      headersModule.setHeadersAccessPhase(previousPhase)
    }
  })

  it('RequestCookies.set() accepts valid cookie names', async () => {
    const headersModule = await import('../src/shims/headers.js')
    headersModule.setHeadersContext({ headers: new Headers(), cookies: new Map() })
    const previousPhase = headersModule.setHeadersAccessPhase('route-handler')
    try {
      const jar = await headersModule.cookies()
      // These should not throw
      jar.set('valid-name', 'value')
      jar.set('__Host-token', 'value')
      jar.set('session_id', 'value')
      jar.set('CSRF.Token', 'value')
    } finally {
      headersModule.setHeadersAccessPhase(previousPhase)
    }
  })

  it('RequestCookies.delete() rejects invalid names', async () => {
    const headersModule = await import('../src/shims/headers.js')
    headersModule.setHeadersContext({ headers: new Headers(), cookies: new Map() })
    const previousPhase = headersModule.setHeadersAccessPhase('route-handler')
    try {
      const jar = await headersModule.cookies()
      expect(() => jar.delete('foo=bar')).toThrow('Invalid cookie name')
    } finally {
      headersModule.setHeadersAccessPhase(previousPhase)
    }
  })

  it('RequestCookies.set() rejects path with semicolons', async () => {
    const headersModule = await import('../src/shims/headers.js')
    headersModule.setHeadersContext({ headers: new Headers(), cookies: new Map() })
    const previousPhase = headersModule.setHeadersAccessPhase('route-handler')
    try {
      const jar = await headersModule.cookies()
      expect(() => jar.set('name', 'val', { path: '/; Domain=evil.com' })).toThrow(
        'Invalid cookie Path',
      )
    } finally {
      headersModule.setHeadersAccessPhase(previousPhase)
    }
  })

  it('ResponseCookies.set() rejects names with = (injection)', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)
    expect(() => cookies.set('foo=bar; Path=/', 'val')).toThrow('Invalid cookie name')
  })

  it('ResponseCookies.set() rejects domain with control chars', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)
    expect(() => cookies.set('name', 'val', { domain: 'evil.com\r\nSet-Cookie: hack=1' })).toThrow(
      'Invalid cookie Domain',
    )
  })

  it('ResponseCookies.set() accepts valid cookie names and options', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)
    // These should not throw
    cookies.set('valid-name', 'value', { path: '/', domain: '.example.com' })
    cookies.set('__Secure-token', 'abc', { secure: true, httpOnly: true })
  })
})

// ---------------------------------------------------------------------------
// TextRequest API tests

describe('TextRequest API', () => {
  it("throws canonical 'Please use only absolute URLs' error for relative URL input", async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    // Matches Text.js's documented behaviour — middleware tests assert on this
    // exact message via the middleware-relative-urls docs link.
    expect(() => new TextRequest('/foo')).toThrow(/Please use only absolute URLs/)
    expect(() => new TextRequest('/urls-b')).toThrow(
      /URL is malformed "\/urls-b"\. Please use only absolute URLs/,
    )
  })

  it('cookies reads request cookies', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('http://localhost/test', {
      headers: { cookie: 'session=abc; theme=dark' },
    })

    expect(req.cookies.get('session')).toEqual({ name: 'session', value: 'abc' })
    expect(req.cookies.get('theme')).toEqual({ name: 'theme', value: 'dark' })
    expect(req.cookies.has('session')).toBe(true)
    expect(req.cookies.has('missing')).toBe(false)
  })

  it('textUrl provides URL properties', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('http://localhost:3000/api/test?key=value#hash')

    expect(req.textUrl.pathname).toBe('/api/test')
    expect(req.textUrl.search).toBe('?key=value')
    expect(req.textUrl.searchParams.get('key')).toBe('value')
    expect(req.textUrl.host).toBe('localhost:3000')
    expect(req.textUrl.hostname).toBe('localhost')
    expect(req.textUrl.protocol).toBe('http:')
    expect(req.textUrl.hash).toBe('#hash')
  })

  it('textUrl.clone() creates independent copy', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('http://localhost/test')
    const cloned = req.textUrl.clone()

    cloned.pathname = '/other'
    expect(req.textUrl.pathname).toBe('/test')
    expect(cloned.pathname).toBe('/other')
  })

  it('textUrl supports all URL setters (port, host, hostname, protocol, href)', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://example.com:8080/path?q=1#hash')

    // port setter
    url.port = '9090'
    expect(url.port).toBe('9090')

    // hostname setter
    url.hostname = 'other.com'
    expect(url.hostname).toBe('other.com')

    // host setter (hostname + port)
    url.host = 'third.com:3000'
    expect(url.host).toBe('third.com:3000')
    expect(url.hostname).toBe('third.com')
    expect(url.port).toBe('3000')

    // protocol setter
    url.protocol = 'https:'
    expect(url.protocol).toBe('https:')

    // href setter
    url.href = 'http://new.com/new-path'
    expect(url.href).toBe('http://new.com/new-path')
    expect(url.hostname).toBe('new.com')
    expect(url.pathname).toBe('/new-path')
  })

  it('textUrl.clone() setters work for text-intl compatibility', async () => {
    // text-intl's getAlternateLinksHeaderValue does: cloned.port = ""; cloned.host = h
    // This test ensures those setter operations work without throwing.
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('http://example.com:8080/en')
    const cloned = req.textUrl.clone()

    // Should not throw — text-intl strips port when x-forwarded-host is present
    cloned.port = ''
    expect(cloned.port).toBe('')

    // Should not throw — text-intl sets host from x-forwarded-host header
    cloned.host = 'example.com'
    expect(cloned.hostname).toBe('example.com')

    // Original should be unaffected
    expect(req.textUrl.port).toBe('8080')
  })

  it('ip reads x-forwarded-for header', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('http://localhost/', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(req.ip).toBe('1.2.3.4')
  })

  it('ip returns undefined when no header', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('http://localhost/')
    expect(req.ip).toBeUndefined()
  })

  it('geo reads Cloudflare headers', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('http://localhost/', {
      headers: {
        'cf-ipcountry': 'US',
        'cf-ipcity': 'San Francisco',
      },
    })
    expect(req.geo?.country).toBe('US')
    expect(req.geo?.city).toBe('San Francisco')
  })

  it('geo returns undefined when no geo headers', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('http://localhost/')
    expect(req.geo).toBeUndefined()
  })

  it('textUrl.buildId returns process.env.__TEXT_BUILD_ID when set', async () => {
    const original = process.env.__TEXT_BUILD_ID
    try {
      process.env.__TEXT_BUILD_ID = 'test-build-123'
      const { TextRequest } = await import('../src/shims/server.js')
      const req = new TextRequest('http://localhost/')
      expect(req.textUrl.buildId).toBe('test-build-123')
    } finally {
      if (original === undefined) {
        delete process.env.__TEXT_BUILD_ID
      } else {
        process.env.__TEXT_BUILD_ID = original
      }
    }
  })

  it('textUrl.buildId returns undefined when __TEXT_BUILD_ID is not set', async () => {
    const original = process.env.__TEXT_BUILD_ID
    try {
      delete process.env.__TEXT_BUILD_ID
      const { TextRequest } = await import('../src/shims/server.js')
      const req = new TextRequest('http://localhost/')
      expect(req.textUrl.buildId).toBeUndefined()
    } finally {
      if (original !== undefined) {
        process.env.__TEXT_BUILD_ID = original
      }
    }
  })

  it('buildId pass-through on TextRequest delegates to textUrl.buildId', async () => {
    const original = process.env.__TEXT_BUILD_ID
    try {
      process.env.__TEXT_BUILD_ID = 'test-build-456'
      const { TextRequest } = await import('../src/shims/server.js')
      const req = new TextRequest('http://localhost/')
      expect(req.buildId).toBe(req.textUrl.buildId)
    } finally {
      if (original === undefined) {
        delete process.env.__TEXT_BUILD_ID
      } else {
        process.env.__TEXT_BUILD_ID = original
      }
    }
  })
})

// ---------------------------------------------------------------------------
// TextURL basePath and locale properties
