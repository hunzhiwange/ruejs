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
describe('double-encoded path handling in middleware', () => {
  it('double-encoded path /%2564ashboard does not match /dashboard middleware pattern', async () => {
    const { matchPattern, matchesMiddleware } = await import('../src/server/middleware.js')
    const { normalizePath } = await import('../src/server/normalize-path.js')

    // /%2564ashboard with a single decode becomes /%64ashboard (NOT /dashboard).
    // The pathname should be decoded exactly once at the entry point.
    const testPath = '/%2564ashboard'
    const decoded = decodeURIComponent(testPath) // Single decode
    const normalized = normalizePath(decoded)
    // After one decode, this is NOT /dashboard — it's /%64ashboard
    expect(normalized).toBe('/%64ashboard')
    // Middleware should NOT match /dashboard for this path
    expect(matchPattern(normalized, '/dashboard')).toBe(false)
    expect(matchesMiddleware(normalized, '/dashboard')).toBe(false)
  })

  it('double-encoded slash /foo/..%252fdashboard does not resolve to /dashboard', async () => {
    const { matchPattern } = await import('../src/server/middleware.js')
    const { normalizePath } = await import('../src/server/normalize-path.js')

    // /foo/..%252fdashboard with a single decode becomes /foo/..%2fdashboard.
    // normalizePath does NOT treat %2f as a path separator, so no traversal occurs.
    const testPath = '/foo/..%252fdashboard'
    const decoded = decodeURIComponent(testPath) // Single decode
    const normalized = normalizePath(decoded)
    // After one decode + normalize, this should NOT resolve to /dashboard
    expect(normalized).not.toBe('/dashboard')
    // The .. only traverses if followed by a real /, not an encoded %2f
    expect(matchPattern(normalized, '/dashboard')).toBe(false)
  })

  it('RSC route matching does not double-decode pathnames', async () => {
    // Verify the generated entry delegates route matching to the typed helper.
    const { generateRscEntry } = await import('../src/entries/app-rsc-entry.js')
    const code = generateRscEntry('/tmp/app', [
      {
        pattern: '/dashboard',
        patternParts: ['dashboard'],
        isDynamic: false,
        params: [],
        pagePath: null,
        routePath: null,
        layouts: [],
        routeSegments: [],
        layoutTreePositions: [],
        templates: [],
        loadingPath: null,
        errorPath: null,
        layoutErrorPaths: [],
        notFoundPath: null,
        notFoundPaths: [],
        forbiddenPaths: [],
        forbiddenPath: null,
        unauthorizedPaths: [],
        unauthorizedPath: null,
        parallelSlots: [],
      },
    ])
    expect(code).toContain('createAppRscRouteMatcher as __createAppRscRouteMatcher')
    expect(code).toContain('return __routeMatcher.matchRoute(url);')

    const routeMatchingSource = await readFile(
      path.resolve(import.meta.dirname, '../src/server/app-rsc-route-matching.ts'),
      'utf8',
    )
    // Verify it does NOT call decodeURIComponent (the comment mentions it but
    // should not have an actual call like `decodeURIComponent(...)`)
    expect(routeMatchingSource).not.toMatch(/\bdecodeURIComponent\s*\(/)
  })

  it('App Router middleware receives a Request with the decoded pathname (not raw URL)', async () => {
    const { applyAppMiddleware } = await import('../src/server/app-middleware.js')
    let capturedUrl: string | undefined
    const module = {
      default: (req: Request) => {
        capturedUrl = req.url
        return new Response(null, {
          headers: { 'x-middleware-text': '1' },
        })
      },
    }

    const result = await applyAppMiddleware({
      cleanPathname: '/%64ashboard',
      context: { headers: null, requestHeaders: null, status: null },
      isProxy: false,
      module,
      request: new Request('http://localhost:3000/%2564ashboard'),
    })

    expect(result.kind).toBe('continue')
    expect(capturedUrl).toBeDefined()
    const mwPathname = new URL(capturedUrl!).pathname
    expect(mwPathname).toBe('/%64ashboard')
    expect(mwPathname).not.toBe('/%2564ashboard')
  })

  it('App Router middleware preserves status from TextResponse.text()', async () => {
    const { applyAppMiddleware } = await import('../src/server/app-middleware.js')
    const { TextResponse } = await import('../src/shims/server.js')
    const context = { headers: null, requestHeaders: null, status: null }

    const result = await applyAppMiddleware({
      cleanPathname: '/',
      context,
      isProxy: false,
      module: {
        default: () => TextResponse.text({ status: 404 }),
      },
      request: new Request('http://localhost:3000/'),
    })

    expect(result.kind).toBe('continue')
    expect(context.status).toBe(404)
  })

  it('App Router middleware does not see internal RSC middleware headers', async () => {
    // Text.js strips FLIGHT_HEADERS before creating the middleware request:
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/server/web/adapter.ts
    const { applyAppMiddleware } = await import('../src/server/app-middleware.js')
    let capturedHeaders: Headers | undefined
    const module = {
      default: (req: Request) => {
        capturedHeaders = new Headers(req.headers)
        return new Response(null, {
          headers: { 'x-middleware-text': '1' },
        })
      },
    }

    const result = await applyAppMiddleware({
      cleanPathname: '/dashboard',
      context: { headers: null, requestHeaders: null, status: null },
      isProxy: false,
      module,
      request: new Request('http://localhost:3000/dashboard', {
        headers: {
          rsc: '1',
          'text-router-state-tree': '%5B%5D',
          'text-router-prefetch': '1',
          'text-router-segment-prefetch': '/dashboard',
          'text-hmr-refresh': '1',
          'x-user-visible': 'keep',
        },
      }),
    })

    expect(result.kind).toBe('continue')
    expect(capturedHeaders?.get('rsc')).toBeNull()
    expect(capturedHeaders?.get('text-router-state-tree')).toBeNull()
    expect(capturedHeaders?.get('text-router-prefetch')).toBeNull()
    expect(capturedHeaders?.get('text-router-segment-prefetch')).toBeNull()
    expect(capturedHeaders?.get('text-hmr-refresh')).toBeNull()
    expect(capturedHeaders?.get('x-user-visible')).toBe('keep')
  })

  it('App Router RSC middleware header stripping does not lock the original request body', async () => {
    const { applyAppMiddleware } = await import('../src/server/app-middleware.js')
    const request = new Request('http://localhost:3000/actions', {
      body: 'action-payload',
      headers: {
        rsc: '1',
        'text-router-state-tree': '%5B%5D',
      },
      method: 'POST',
    })
    const module = {
      default: () =>
        new Response(null, {
          headers: { 'x-middleware-text': '1' },
        }),
    }

    const result = await applyAppMiddleware({
      cleanPathname: '/actions',
      context: { headers: null, requestHeaders: null, status: null },
      isProxy: false,
      module,
      request,
    })

    expect(result.kind).toBe('continue')
    expect(request.body?.locked).toBe(false)
    expect(await request.text()).toBe('action-payload')
  })

  it('App Router middleware can read the body without consuming the downstream request', async () => {
    const { applyAppMiddleware } = await import('../src/server/app-middleware.js')
    const request = new Request('http://localhost:3000/api/echo', {
      body: JSON.stringify({ message: 'hello' }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })
    let middlewareBody: unknown
    const module = {
      default: async (req: Request) => {
        middlewareBody = await req.json()
        return new Response(null, {
          headers: { 'x-middleware-text': '1' },
        })
      },
    }

    const result = await applyAppMiddleware({
      cleanPathname: '/api/echo',
      context: { headers: null, requestHeaders: null, status: null },
      isProxy: false,
      module,
      request,
    })

    expect(result.kind).toBe('continue')
    expect(middlewareBody).toEqual({ message: 'hello' })
    expect(request.bodyUsed).toBe(false)
    await expect(request.json()).resolves.toEqual({ message: 'hello' })
  })

  it('external middleware rewrite proxy strips upstream x-middleware headers without middleware context', async () => {
    const { proxyExternalMiddlewareRewrite } = await import('../src/server/app-middleware.js')
    const http = await import('node:http')
    const server = http.createServer((_req, res) => {
      res.writeHead(200, {
        'content-type': 'text/plain',
        'x-middleware-rewrite': '/internal',
        'x-middleware-text': '1',
        'x-visible': 'keep',
      })
      res.end('proxied')
    })

    await new Promise<void>(resolve => server.listen(0, resolve))
    try {
      const address = server.address()
      expect(address && typeof address === 'object').toBe(true)
      const port = address && typeof address === 'object' ? address.port : 0
      const response = await proxyExternalMiddlewareRewrite(
        new Request('http://localhost:3000/source'),
        `http://127.0.0.1:${port}/target`,
        { headers: null, requestHeaders: null, status: null },
      )

      expect(response.status).toBe(200)
      expect(await response.text()).toBe('proxied')
      expect(response.headers.get('x-middleware-rewrite')).toBeNull()
      expect(response.headers.get('x-middleware-text')).toBeNull()
      expect(response.headers.get('x-visible')).toBe('keep')
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  })

  it('external middleware rewrite proxy preserves credentials when applying partial request overrides', async () => {
    const { proxyExternalMiddlewareRewrite } = await import('../src/server/app-middleware.js')
    const http = await import('node:http')
    let capturedHeaders: Record<string, string | string[] | undefined> = {}
    const server = http.createServer((req, res) => {
      capturedHeaders = req.headers
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('proxied')
    })

    await new Promise<void>(resolve => server.listen(0, resolve))
    try {
      const address = server.address()
      expect(address && typeof address === 'object').toBe(true)
      const port = address && typeof address === 'object' ? address.port : 0
      const response = await proxyExternalMiddlewareRewrite(
        new Request('http://localhost:3000/source', {
          headers: {
            authorization: 'Bearer secret',
            cookie: 'session=abc',
            'x-keep': 'original',
          },
        }),
        `http://127.0.0.1:${port}/target`,
        {
          headers: null,
          requestHeaders: new Headers({
            'x-middleware-override-headers': 'x-added',
            'x-middleware-request-x-added': '1',
          }),
          status: null,
        },
      )

      expect(response.status).toBe(200)
      expect(capturedHeaders.authorization).toBe('Bearer secret')
      expect(capturedHeaders.cookie).toBe('session=abc')
      expect(capturedHeaders['x-added']).toBe('1')
      expect(capturedHeaders['x-keep']).toBeUndefined()
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  })

  it('Pages Router runMiddleware passes decoded pathname to middleware function', async () => {
    const { runMiddleware } = await import('../src/server/middleware.js')
    // Create a mock Vite server that returns a middleware module
    let capturedUrl: string | undefined
    const mockRunner = {
      import: async () => ({
        default: (req: Request) => {
          capturedUrl = req.url
          return new Response('OK', {
            headers: { 'x-middleware-text': '1' },
          })
        },
        config: { matcher: '/:path*' },
      }),
    }

    // Send a double-encoded path — after single decode, it should be /%64ashboard
    const testUrl = 'http://localhost:3000/%2564ashboard'
    const request = new Request(testUrl)
    await runMiddleware(mockRunner as any, '/tmp/middleware.ts', request)

    // Middleware should have received the decoded+normalized URL
    expect(capturedUrl).toBeDefined()
    const mwPathname = new URL(capturedUrl!).pathname
    // After single decode: %25 → %, so /%2564 → /%64
    expect(mwPathname).toBe('/%64ashboard')
    // It must NOT be the raw /%2564ashboard
    expect(mwPathname).not.toBe('/%2564ashboard')
    // It must NOT be double-decoded to /dashboard
    expect(mwPathname).not.toBe('/dashboard')
  })

  it('runMiddleware accepts named proxy export', async () => {
    const { runMiddleware } = await import('../src/server/middleware.js')

    const mockRunner = {
      import: async () => ({
        proxy: () => {
          const response = new Response(null, { status: 307 })
          response.headers.set('location', '/login')
          return response
        },
        config: { matcher: ['/protected'] },
      }),
    }

    const request = new Request('http://localhost/protected')
    const result = await runMiddleware(mockRunner as any, '/tmp/proxy.js', request)

    expect(result.continue).toBe(false)
    expect(result.redirectUrl).toContain('/login')
    expect(result.redirectStatus).toBe(307)
  })

  it('runMiddleware bubbles up waitUntil promises in result', async () => {
    const { runMiddleware } = await import('../src/server/middleware.js')

    let capturedPromise: Promise<unknown> | null = null
    const mockRunner = {
      import: async () => ({
        middleware: (_req: Request, event: { waitUntil: (p: Promise<unknown>) => void }) => {
          const p = Promise.resolve('background-work')
          capturedPromise = p
          event.waitUntil(p)
          return Response.redirect('http://localhost/login', 307)
        },
        config: { matcher: ['/protected'] },
      }),
    }

    const request = new Request('http://localhost/protected')
    const result = await runMiddleware(mockRunner as any, '/tmp/middleware.ts', request)

    // The most critical behavior: waitUntil promises must appear in the result
    // so the runtime (e.g. Cloudflare Workers ctx.waitUntil) can keep them alive.
    expect(result.continue).toBe(false)
    expect(result.redirectUrl).toBeDefined()
    expect(result.waitUntilPromises).toBeDefined()
    expect(result.waitUntilPromises!.length).toBe(1)
    expect(result.waitUntilPromises![0]).toBe(capturedPromise)
  })

  it('runMiddleware bubbles up waitUntil promises on continue: true path', async () => {
    const { runMiddleware } = await import('../src/server/middleware.js')
    const { TextResponse } = await import('../src/shims/server.js')

    let capturedPromise: Promise<unknown> | null = null
    const mockRunner = {
      import: async () => ({
        middleware: (_req: Request, event: { waitUntil: (p: Promise<unknown>) => void }) => {
          const p = Promise.resolve('analytics')
          capturedPromise = p
          event.waitUntil(p)
          return TextResponse.text()
        },
        config: { matcher: ['/dashboard'] },
      }),
    }

    const request = new Request('http://localhost/dashboard')
    const result = await runMiddleware(mockRunner as any, '/tmp/middleware.ts', request)

    expect(result.continue).toBe(true)
    expect(result.waitUntilPromises).toBeDefined()
    expect(result.waitUntilPromises!.length).toBe(1)
    expect(result.waitUntilPromises![0]).toBe(capturedPromise)
  })

  it('app-router-entry.ts does not double-decode (delegates to RSC handler)', async () => {
    // Verify the Cloudflare Worker entry does not decode the pathname itself,
    // leaving that responsibility to the RSC handler.
    const fs = await import('node:fs')
    const entryCode = fs.readFileSync(
      path.resolve(import.meta.dirname, '../src/server/app-router-entry.ts'),
      'utf-8',
    )
    // The entry should validate encoding but NOT normalize+reconstruct the request
    // (the RSC handler is the single decode point)
    expect(entryCode).not.toMatch(/normalizedRequest\s*=\s*new Request\(normalizedUrl/)
    // It should still validate malformed encoding (return 400)
    expect(entryCode).toMatch(
      /decodeURIComponent\(\s*(?:raw)?[pP]athname|decodeURIComponent\(url\.pathname\)/,
    )
    // The delegate call should pass the original request object through,
    // without reconstructing a normalized Request before delegation.
    expect(entryCode).toMatch(/rscHandler\(request(?:,\s*ctx)?\)/)
  })
})

// ---------------------------------------------------------------------------
// TextFetchEvent — middleware receives event with waitUntil support

describe('TextFetchEvent passed to middleware', () => {
  it('runMiddleware passes TextFetchEvent as second argument', async () => {
    const { runMiddleware } = await import('../src/server/middleware.js')
    // Middleware that accesses event.waitUntil — will throw if event is undefined
    let receivedEvent: any
    const mockRunner = {
      import: async () => ({
        middleware: (_req: any, event: any) => {
          receivedEvent = event
          event.waitUntil(Promise.resolve('done'))
          return new Response(null, {
            headers: { 'x-middleware-text': '1' },
          })
        },
        config: { matcher: ['/test'] },
      }),
    }

    const request = new Request('http://localhost:3000/test')
    const result = await runMiddleware(mockRunner as any, '/tmp/middleware.ts', request)

    expect(result.continue).toBe(true)
    expect(receivedEvent).toBeDefined()
    expect(typeof receivedEvent.waitUntil).toBe('function')
    expect(receivedEvent.sourcePage).toBe('/test')
  })

  it('waitUntil promises are drained after middleware runs', async () => {
    const { runMiddleware } = await import('../src/server/middleware.js')
    let sideEffectRan = false
    const mockRunner = {
      import: async () => ({
        middleware: (_req: any, event: any) => {
          event.waitUntil(
            Promise.resolve().then(() => {
              sideEffectRan = true
            }),
          )
          return new Response(null, {
            headers: { 'x-middleware-text': '1' },
          })
        },
        config: { matcher: ['/drain'] },
      }),
    }

    const request = new Request('http://localhost:3000/drain')
    await runMiddleware(mockRunner as any, '/tmp/middleware.ts', request)

    // The waitUntil promise should have been resolved.
    // Flush the microtask queue so Promise.resolve().then(...) callbacks run.
    await new Promise(r => queueMicrotask(r as () => void))
    expect(sideEffectRan).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// RequestCookies comprehensive tests

describe('RequestCookies API', () => {
  it('get() returns cookie by name', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'token=abc123; session=xyz' })
    const cookies = new RequestCookies(headers)

    const token = cookies.get('token')
    expect(token).toEqual({ name: 'token', value: 'abc123' })

    const session = cookies.get('session')
    expect(session).toEqual({ name: 'session', value: 'xyz' })
  })

  it('get() returns undefined for missing cookie', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'token=abc123' })
    const cookies = new RequestCookies(headers)

    expect(cookies.get('missing')).toBeUndefined()
  })

  it('getAll() returns all cookies', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'a=1; b=2; c=3' })
    const cookies = new RequestCookies(headers)

    const all = cookies.getAll()
    expect(all).toHaveLength(3)
    expect(all).toContainEqual({ name: 'a', value: '1' })
    expect(all).toContainEqual({ name: 'b', value: '2' })
    expect(all).toContainEqual({ name: 'c', value: '3' })
  })

  it('getAll(name) filters by cookie name', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'a=1; a=2; b=3' })
    const cookies = new RequestCookies(headers)

    expect(cookies.get('a')).toEqual({ name: 'a', value: '2' })
    expect(cookies.getAll('a')).toEqual([{ name: 'a', value: '2' }])
    expect(cookies.getAll()).toEqual([
      { name: 'a', value: '2' },
      { name: 'b', value: '3' },
    ])
  })

  it('getAll({ name }) filters by cookie name and missing names return []', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'a=1; a=2; token=abc=def' })
    const cookies = new RequestCookies(headers)

    expect(cookies.getAll({ name: 'a', value: 'ignored' })).toEqual([{ name: 'a', value: '2' }])
    expect(cookies.getAll('missing')).toEqual([])
    expect(cookies.getAll({ name: 'missing', value: '' })).toEqual([])
    expect(cookies.get('token')).toEqual({ name: 'token', value: 'abc=def' })
  })

  it('parses encoded values, skips malformed values, and supports bare tokens', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'token=abc%3D123; bad=%E0%A4%A; flag; ok=yes' })
    const cookies = new RequestCookies(headers)

    expect(cookies.get('token')).toEqual({ name: 'token', value: 'abc=123' })
    expect(cookies.get('bad')).toBeUndefined()
    expect(cookies.get('flag')).toEqual({ name: 'flag', value: 'true' })
    expect(cookies.getAll()).toEqual([
      { name: 'token', value: 'abc=123' },
      { name: 'flag', value: 'true' },
      { name: 'ok', value: 'yes' },
    ])
  })

  it('preserves explicit empty values', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'empty=; flag' })
    const cookies = new RequestCookies(headers)

    expect(cookies.get('empty')).toEqual({ name: 'empty', value: '' })
    expect(cookies.get('flag')).toEqual({ name: 'flag', value: 'true' })
    expect(cookies.getAll()).toEqual([
      { name: 'empty', value: '' },
      { name: 'flag', value: 'true' },
    ])
  })

  it('preserves whitespace exactly like the Text.js parser', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'a= 1 ; a =2' })
    const cookies = new RequestCookies(headers)

    expect(cookies.get('a')).toEqual({ name: 'a', value: ' 1 ' })
    expect(cookies.get('a ')).toEqual({ name: 'a ', value: '2' })
    expect(cookies.getAll()).toEqual([
      { name: 'a', value: ' 1 ' },
      { name: 'a ', value: '2' },
    ])
  })

  it('has() checks cookie existence', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'token=abc' })
    const cookies = new RequestCookies(headers)

    expect(cookies.has('token')).toBe(true)
    expect(cookies.has('missing')).toBe(false)
  })

  it('iterator yields [name, entry] pairs', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'x=1; y=2' })
    const cookies = new RequestCookies(headers)

    const entries = [...cookies]
    expect(entries).toHaveLength(2)
    expect(entries[0][0]).toBe('x')
    expect(entries[0][1]).toEqual({ name: 'x', value: '1' })
    expect(entries[1][0]).toBe('y')
    expect(entries[1][1]).toEqual({ name: 'y', value: '2' })
  })

  it('handles empty cookie header', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new RequestCookies(headers)

    expect(cookies.getAll()).toHaveLength(0)
    expect(cookies.get('any')).toBeUndefined()
    expect(cookies.has('any')).toBe(false)
  })

  it('handles cookies with = in value', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'data=base64=encoded=value' })
    const cookies = new RequestCookies(headers)

    const data = cookies.get('data')
    expect(data).toBeDefined()
    expect(data!.value).toBe('base64=encoded=value')
  })

  it('set() adds a cookie and updates the Cookie header', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'a=1' })
    const cookies = new RequestCookies(headers)

    cookies.set('b', '2')

    expect(cookies.get('b')).toEqual({ name: 'b', value: '2' })
    // The underlying Cookie header should be updated
    expect(headers.get('cookie')).toContain('b=2')
    // Original cookie should still be there
    expect(cookies.get('a')).toEqual({ name: 'a', value: '1' })
  })

  it('set() overwrites an existing cookie value', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'token=old' })
    const cookies = new RequestCookies(headers)

    cookies.set('token', 'new')

    expect(cookies.get('token')).toEqual({ name: 'token', value: 'new' })
    expect(headers.get('cookie')).toContain('token=new')
    expect(headers.get('cookie')).not.toContain('token=old')
  })

  it('set() accepts an object with name and value', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new RequestCookies(headers)

    cookies.set({ name: 'session', value: 'abc' })

    expect(cookies.get('session')).toEqual({ name: 'session', value: 'abc' })
  })

  it('set() returns this for chaining', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new RequestCookies(headers)

    const result = cookies.set('a', '1').set('b', '2')

    expect(result).toBe(cookies)
    expect(cookies.get('a')).toEqual({ name: 'a', value: '1' })
    expect(cookies.get('b')).toEqual({ name: 'b', value: '2' })
  })

  it('set() rejects invalid cookie names', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new RequestCookies(headers)

    expect(() => cookies.set('foo=bar; Path=/', 'val')).toThrow('Invalid cookie name')
    expect(() => cookies.set('foo; HttpOnly', 'val')).toThrow('Invalid cookie name')
    expect(() => cookies.set('foo\r\nCookie: evil=1', 'val')).toThrow('Invalid cookie name')
    expect(() => cookies.set('', 'val')).toThrow('Invalid cookie name')
  })

  it('set({ name, value }) rejects invalid cookie names', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new RequestCookies(headers)

    expect(() => cookies.set({ name: 'foo=bar', value: 'val' })).toThrow('Invalid cookie name')
  })

  it('delete() removes a cookie from the Cookie header', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'a=1; b=2; c=3' })
    const cookies = new RequestCookies(headers)

    cookies.delete('b')

    expect(cookies.has('b')).toBe(false)
    expect(cookies.get('b')).toBeUndefined()
    // Other cookies remain
    expect(cookies.get('a')).toEqual({ name: 'a', value: '1' })
    expect(cookies.get('c')).toEqual({ name: 'c', value: '3' })
  })

  it('delete() returns true when cookie existed, false otherwise', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'a=1; b=2' })
    const cookies = new RequestCookies(headers)

    expect(cookies.delete('a')).toBe(true)
    expect(cookies.delete('nonexistent')).toBe(false)
  })

  it('delete() accepts an array of names', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'a=1; b=2; c=3' })
    const cookies = new RequestCookies(headers)

    const results = cookies.delete(['a', 'missing', 'c'])

    expect(results).toEqual([true, false, true])
    expect(cookies.has('a')).toBe(false)
    expect(cookies.has('c')).toBe(false)
    expect(cookies.get('b')).toEqual({ name: 'b', value: '2' })
  })

  it('delete() rejects invalid cookie names', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'a=1; b=2' })
    const cookies = new RequestCookies(headers)

    expect(() => cookies.delete('foo=bar')).toThrow('Invalid cookie name')
    expect(() => cookies.delete(['a', 'foo;bar'])).toThrow('Invalid cookie name')
  })

  it('delete() is a no-op for missing cookies', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'a=1' })
    const cookies = new RequestCookies(headers)

    cookies.delete('nonexistent')

    expect(cookies.get('a')).toEqual({ name: 'a', value: '1' })
  })

  it('size returns the number of cookies', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'a=1; b=2; c=3' })
    const cookies = new RequestCookies(headers)

    expect(cookies.size).toBe(3)
  })

  it('size is 0 for empty cookie header', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new RequestCookies(headers)

    expect(cookies.size).toBe(0)
  })

  it('toString() serializes cookies back to a cookie header string', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'a=1; b=2' })
    const cookies = new RequestCookies(headers)

    const str = cookies.toString()
    expect(str).toContain('a=1')
    expect(str).toContain('b=2')
  })

  it('set() round-trips values with special characters', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new RequestCookies(headers)

    cookies.set('data', 'hello;world=foo')

    expect(cookies.get('data')).toEqual({ name: 'data', value: 'hello;world=foo' })
    // Header should be encoded
    expect(headers.get('cookie')).toBe('data=hello%3Bworld%3Dfoo')
  })

  it('set() preserves existing percent-encoded cookies', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'token=100%25done; sid=abc' })
    const cookies = new RequestCookies(headers)

    cookies.set('new', 'value')

    expect(cookies.get('token')).toEqual({ name: 'token', value: '100%done' })
    expect(cookies.get('new')).toEqual({ name: 'new', value: 'value' })
  })

  it('delete() after set() removes the cookie', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'a=1' })
    const cookies = new RequestCookies(headers)

    cookies.set('b', '2')
    expect(cookies.get('b')).toEqual({ name: 'b', value: '2' })

    cookies.delete('b')
    expect(cookies.has('b')).toBe(false)
    expect(cookies.get('a')).toEqual({ name: 'a', value: '1' })
  })

  it('clear() removes all cookies', async () => {
    const { RequestCookies } = await import('../src/shims/server.js')
    const headers = new Headers({ cookie: 'a=1; b=2; c=3' })
    const cookies = new RequestCookies(headers)

    cookies.clear()

    expect(cookies.size).toBe(0)
    expect(cookies.getAll()).toHaveLength(0)
    expect(headers.get('cookie')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// ResponseCookies comprehensive tests
