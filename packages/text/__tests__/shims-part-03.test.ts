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
describe('text/headers phase-aware cookies', () => {
  it('cookies().set() works in the route-handler phase and accumulates Set-Cookie headers', async () => {
    const { setHeadersContext, setHeadersAccessPhase, cookies, getAndClearPendingCookies } =
      await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map(),
    })

    const previousPhase = setHeadersAccessPhase('route-handler')
    try {
      const c = await cookies()
      c.set('token', 'xyz', { path: '/', httpOnly: true, secure: true })

      expect(c.get('token')).toEqual({ name: 'token', value: 'xyz' })
      expect(c.has('token')).toBe(true)

      const pending = getAndClearPendingCookies()
      expect(pending.length).toBe(1)
      expect(pending[0]).toContain('token=xyz')
      expect(pending[0]).toContain('Path=/')
      expect(pending[0]).toContain('HttpOnly')
      expect(pending[0]).toContain('Secure')
      expect(getAndClearPendingCookies().length).toBe(0)
    } finally {
      setHeadersAccessPhase(previousPhase)
      setHeadersContext(null)
    }
  })

  it('cookies().set() supports legacy sync access in the route-handler phase', async () => {
    const { setHeadersContext, setHeadersAccessPhase, cookies, getAndClearPendingCookies } =
      await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map(),
    })

    const previousPhase = setHeadersAccessPhase('route-handler')
    try {
      const cookieStore = cookies()
      void cookieStore.set('token', 'sync-token', { httpOnly: true })

      expect(cookieStore.get('token')).toEqual({ name: 'token', value: 'sync-token' })
      expect(getAndClearPendingCookies()).toEqual([expect.stringContaining('token=sync-token')])
    } finally {
      setHeadersAccessPhase(previousPhase)
      setHeadersContext(null)
    }
  })

  it('cookies().set() emits Path=/ when no path option is provided', async () => {
    const { setHeadersContext, setHeadersAccessPhase, cookies, getAndClearPendingCookies } =
      await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map(),
    })

    const previousPhase = setHeadersAccessPhase('route-handler')
    try {
      const c = await cookies()
      c.set('token', 'implicit-path')

      const pending = getAndClearPendingCookies()
      expect(pending).toHaveLength(1)
      expect(pending[0]).toContain('token=implicit-path')
      expect(pending[0]).toContain('Path=/')
      expect(getAndClearPendingCookies()).toHaveLength(0)
    } finally {
      setHeadersAccessPhase(previousPhase)
      setHeadersContext(null)
    }
  })

  it('cookies().set() preserves an explicit path option', async () => {
    const { setHeadersContext, setHeadersAccessPhase, cookies, getAndClearPendingCookies } =
      await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map(),
    })

    const previousPhase = setHeadersAccessPhase('route-handler')
    try {
      const c = await cookies()
      c.set('token', 'scoped-path', { path: '/api' })

      const pending = getAndClearPendingCookies()
      expect(pending).toHaveLength(1)
      expect(pending[0]).toContain('token=scoped-path')
      expect(pending[0]).toContain('Path=/api')
      expect(pending[0]).not.toContain('Path=/;')
      expect(getAndClearPendingCookies()).toHaveLength(0)
    } finally {
      setHeadersAccessPhase(previousPhase)
      setHeadersContext(null)
    }
  })

  it('cookies().delete() works in the route-handler phase', async () => {
    const { setHeadersContext, setHeadersAccessPhase, cookies, getAndClearPendingCookies } =
      await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map([['session', 'abc']]),
    })

    const previousPhase = setHeadersAccessPhase('route-handler')
    try {
      const c = await cookies()
      expect(c.has('session')).toBe(true)
      c.delete('session')
      expect(c.has('session')).toBe(false)

      const pending = getAndClearPendingCookies()
      expect(pending.length).toBe(1)
      expect(pending[0]).toContain('session=')
      expect(pending[0]).toContain('Expires=')
    } finally {
      setHeadersAccessPhase(previousPhase)
      setHeadersContext(null)
    }
  })

  it('cookies().delete() accepts options with path and domain', async () => {
    const { setHeadersContext, setHeadersAccessPhase, cookies, getAndClearPendingCookies } =
      await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map([['session', 'abc']]),
    })

    const previousPhase = setHeadersAccessPhase('route-handler')
    try {
      const c = await cookies()
      c.delete({ name: 'session', path: '/account', domain: '.example.com' })

      const pending = getAndClearPendingCookies()
      expect(pending).toHaveLength(1)
      expect(pending[0]).toContain('session=')
      expect(pending[0]).toContain('Path=/account')
      expect(pending[0]).toContain('Domain=.example.com')
      expect(pending[0]).toContain('Expires=')
    } finally {
      setHeadersAccessPhase(previousPhase)
      setHeadersContext(null)
    }
  })

  it('cookies().delete() defaults Path=/ for object syntax without path', async () => {
    const { setHeadersContext, setHeadersAccessPhase, cookies, getAndClearPendingCookies } =
      await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map([['session', 'abc']]),
    })

    const previousPhase = setHeadersAccessPhase('route-handler')
    try {
      const c = await cookies()
      c.delete({ name: 'session' })

      const pending = getAndClearPendingCookies()
      expect(pending).toHaveLength(1)
      expect(pending[0]).toContain('session=')
      expect(pending[0]).toContain('Path=/')
      expect(pending[0]).toContain('Expires=')
    } finally {
      setHeadersAccessPhase(previousPhase)
      setHeadersContext(null)
    }
  })

  it('cookies().set() with object syntax works in the action phase', async () => {
    const { setHeadersContext, setHeadersAccessPhase, cookies, getAndClearPendingCookies } =
      await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map(),
    })

    const previousPhase = setHeadersAccessPhase('action')
    try {
      const c = await cookies()
      c.set({ name: 'pref', value: 'dark', sameSite: 'Lax' })
      expect(c.get('pref')?.value).toBe('dark')

      const pending = getAndClearPendingCookies()
      expect(pending[0]).toContain('pref=dark')
      expect(pending[0]).toContain('SameSite=Lax')
    } finally {
      setHeadersAccessPhase(previousPhase)
      setHeadersContext(null)
    }
  })

  it('mutable cookie references stop accepting writes after the phase returns to render', async () => {
    // Ported from Text.js:
    // packages/text/src/server/web/spec-extension/adapters/request-cookies.test.ts
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/server/web/spec-extension/adapters/request-cookies.test.ts
    const { setHeadersContext, setHeadersAccessPhase, cookies, getAndClearPendingCookies } =
      await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map(),
    })

    const previousPhase = setHeadersAccessPhase('action')
    try {
      const c = await cookies()
      c.set('session', 'abc123')
      expect(c.get('session')?.value).toBe('abc123')

      setHeadersAccessPhase('render')
      expect(() => c.set('session', 'mutated')).toThrow(
        /Cookies can only be modified in a Server Action or Route Handler/,
      )
      expect(() => c.delete('session')).toThrow(
        /Cookies can only be modified in a Server Action or Route Handler/,
      )
      expect(c.get('session')?.value).toBe('abc123')
      expect(getAndClearPendingCookies()).toEqual([expect.stringContaining('session=abc123')])
    } finally {
      setHeadersAccessPhase(previousPhase)
      setHeadersContext(null)
    }
  })
})

describe('text/server shim', () => {
  it('TextRequest wraps a standard Request with textUrl and cookies', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('https://example.com/blog?page=2', {
      headers: { cookie: 'session=abc123; theme=dark' },
    })

    expect(req.textUrl.pathname).toBe('/blog')
    expect(req.textUrl.searchParams.get('page')).toBe('2')
    expect(req.cookies.get('session')).toEqual({ name: 'session', value: 'abc123' })
    expect(req.cookies.get('theme')).toEqual({ name: 'theme', value: 'dark' })
    expect(req.cookies.has('session')).toBe(true)
    expect(req.cookies.has('missing')).toBe(false)
  })

  it('TextRequest copies a Request body without disturbing the source request', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const source = new Request('https://example.com/api/echo', {
      body: JSON.stringify({ ok: true }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    const req = new TextRequest(source)

    await expect(req.json()).resolves.toEqual({ ok: true })
    expect(source.bodyUsed).toBe(false)
    await expect(source.json()).resolves.toEqual({ ok: true })
  })

  it('TextResponse.json() creates a JSON response', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    const res = TextResponse.json({ message: 'hello' }, { status: 201 })

    expect(res.status).toBe(201)
    expect(res.headers.get('content-type')).toBe('application/json')
    const body = await res.json()
    expect(body).toEqual({ message: 'hello' })
  })

  it('TextResponse.redirect() creates a redirect response', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    const res = TextResponse.redirect('https://example.com/new', 308)

    expect(res.status).toBe(308)
    expect(res.headers.get('Location')).toBe('https://example.com/new')
  })

  // Ported from Text.js: test/e2e/middleware-general/test/index.test.ts
  // https://github.com/vercel/next.js/blob/canary/test/e2e/middleware-general/test/index.test.ts
  it('TextResponse.redirect() throws when using a relative URL', async () => {
    const { TextResponse } = await import('../src/shims/server.js')

    expect(() => TextResponse.redirect('/urls-b')).toThrow('URL is malformed')
  })

  it('TextResponse.rewrite() sets x-middleware-rewrite header', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    const res = TextResponse.rewrite('https://example.com/internal')

    expect(res.headers.get('x-middleware-rewrite')).toBe('https://example.com/internal')
  })

  // Ported from Text.js: test/e2e/middleware-general/test/index.test.ts
  // https://github.com/vercel/next.js/blob/canary/test/e2e/middleware-general/test/index.test.ts
  it('TextResponse.rewrite() throws when using a relative URL', async () => {
    const { TextResponse } = await import('../src/shims/server.js')

    expect(() => TextResponse.rewrite('/urls-b')).toThrow('URL is malformed')
  })

  it('TextResponse.rewrite() forwards request header overrides', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    const forwardedHeaders = new Headers({
      cookie: 'a=1',
      'x-added': '1',
    })

    const res = TextResponse.rewrite('https://example.com/internal', {
      request: {
        headers: forwardedHeaders,
      },
    })

    expect(res.headers.get('x-middleware-rewrite')).toBe('https://example.com/internal')
    expect(res.headers.get('x-middleware-override-headers')).toBe('cookie,x-added')
    expect(res.headers.get('x-middleware-request-cookie')).toBe('a=1')
    expect(res.headers.get('x-middleware-request-x-added')).toBe('1')
  })

  // Ported from Text.js:
  // - packages/text/src/server/web/spec-extension/response.ts
  // - test/e2e/app-dir/app-middleware/app-middleware.test.ts
  // https://github.com/vercel/next.js/blob/canary/packages/text/src/server/web/spec-extension/response.ts
  // https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/app-middleware/app-middleware.test.ts
  it('TextResponse.cookies.set() emits x-middleware-set-cookie for same-render reads', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    const res = TextResponse.text()

    res.cookies.set('rsc-cookie-value-1', '123', { path: '/' })
    res.cookies.set('rsc-cookie-value-2', '456', { path: '/', httpOnly: true })

    expect(res.headers.getSetCookie()).toEqual([
      'rsc-cookie-value-1=123; Path=/',
      'rsc-cookie-value-2=456; Path=/; HttpOnly',
    ])
    const internalCookieHeader = res.headers.get('x-middleware-set-cookie')
    expect(internalCookieHeader).not.toBeNull()
    expect(internalCookieHeader).toContain('rsc-cookie-value-1=123; Path=/')
    expect(internalCookieHeader).toContain('rsc-cookie-value-2=456; Path=/; HttpOnly')
  })

  it('TextResponse.text() sets x-middleware-text header', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    const res = TextResponse.text()

    expect(res.headers.get('x-middleware-text')).toBe('1')
  })

  it('ResponseCookies set/get/delete work', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    const res = new TextResponse()
    res.cookies.set('token', 'xyz', { path: '/', httpOnly: true })

    const cookie = res.cookies.get('token')
    expect(cookie).toBeTruthy()
    expect(cookie!.value).toBe('xyz')

    // Verify the Set-Cookie header was set
    const setCookie = res.headers.getSetCookie()
    expect(setCookie.length).toBeGreaterThan(0)
    expect(setCookie[0]).toContain('token=xyz')
    expect(setCookie[0]).toContain('HttpOnly')
  })

  it('userAgentFromString detects bots', async () => {
    const { userAgentFromString } = await import('../src/shims/server.js')
    const bot = userAgentFromString('Googlebot/2.1')
    expect(bot.isBot).toBe(true)

    const human = userAgentFromString('Mozilla/5.0')
    expect(human.isBot).toBe(false)
  })

  it('after() runs a callback asynchronously without throwing', async () => {
    const { after } = await import('../src/shims/server.js')
    let called = false
    after(() => {
      called = true
    })
    // after() schedules as a microtask, so await a tick
    await new Promise(r => setTimeout(r, 10))
    expect(called).toBe(true)
  })

  it('after() handles a promise argument', async () => {
    const { after } = await import('../src/shims/server.js')
    let resolved = false
    const p = new Promise<void>(resolve => {
      setTimeout(() => {
        resolved = true
        resolve()
      }, 5)
    })
    after(p)
    await new Promise(r => setTimeout(r, 20))
    expect(resolved).toBe(true)
  })

  it('after() swallows errors from failing tasks', async () => {
    const { after } = await import('../src/shims/server.js')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    after(() => {
      throw new Error('task failed')
    })
    // after() wraps function tasks in Promise.resolve().then(task) — two microtask
    // ticks are sufficient and more deterministic than a setTimeout.
    await Promise.resolve()
    await Promise.resolve()
    expect(consoleError).toHaveBeenCalledWith('[text] after() task failed:', expect.any(Error))
    consoleError.mockRestore()
  })

  it('after() calls waitUntil on the execution context when one exists', async () => {
    const { after } = await import('../src/shims/server.js')
    const { runWithExecutionContext } = await import('../src/shims/request-context.js')

    const waitUntilCalls: Promise<unknown>[] = []
    const mockCtx = {
      waitUntil: (p: Promise<unknown>) => {
        waitUntilCalls.push(p)
      },
    }

    let called = false
    await runWithExecutionContext(mockCtx, () => {
      after(() => {
        called = true
      })
    })

    // waitUntil is called synchronously — no microtask delay needed
    expect(waitUntilCalls).toHaveLength(1)
    // Await the guarded promise to verify the callback ran
    await waitUntilCalls[0]
    expect(called).toBe(true)
  })

  it('after() falls back to fire-and-forget when no execution context exists', async () => {
    const { after } = await import('../src/shims/server.js')

    // Outside any execution context scope — should still run the task
    let called = false
    after(() => {
      called = true
    })
    // after() wraps function tasks in Promise.resolve().then(task) — two microtask
    // ticks are sufficient and more deterministic than a setTimeout.
    await Promise.resolve()
    await Promise.resolve()
    expect(called).toBe(true)
  })

  it('after() throws inside "use cache" scope', async () => {
    const { after } = await import('../src/shims/server.js')
    const { cacheContextStorage } = await import('../src/shims/cache-runtime.js')

    cacheContextStorage.run(
      {
        tags: [],
        lifeConfigs: [],
        variant: 'default',
        hasExplicitRevalidate: false,
        hasExplicitExpire: false,
        dynamicNestedCacheError: undefined,
      },
      () => {
        expect(() => after(() => {})).toThrow(/cannot be called inside "use cache"/)
      },
    )
  })

  it('after() throws inside unstable_cache() scope', async () => {
    const { after } = await import('../src/shims/server.js')
    const { AsyncLocalStorage } = await import('node:async_hooks')
    const key = Symbol.for('text.unstableCache.als')
    const g = globalThis as unknown as Record<symbol, unknown>
    // Lazily register an ALS on globalThis if cache.ts hasn't been imported yet.
    // This test is intentionally isolated from the real cache.ts registration path —
    // it only validates that server.ts reads from the same Symbol key to detect the
    // unstable_cache scope. If cache.ts was already imported, the existing instance is
    // reused; if not, this standalone ALS is sufficient for the guard to work.
    if (!g[key]) g[key] = new AsyncLocalStorage()

    ;(g[key] as any).run(true, () => {
      expect(() => after(() => {})).toThrow(/unstable_cache/)
    })
  })

  it('connection() returns a resolved promise', async () => {
    const { connection } = await import('../src/shims/server.js')
    const result = connection()
    expect(result).toBeInstanceOf(Promise)
    await expect(result).resolves.toBeUndefined()
  })

  it('URLPattern is exported and available in Node 20+', async () => {
    const { URLPattern } = await import('../src/shims/server.js')
    // Node 22+ has URLPattern globally; if available, test it works
    if (globalThis.URLPattern) {
      expect(URLPattern).toBe(globalThis.URLPattern)
      const pattern = new URLPattern({ pathname: '/blog/:slug' })
      const match = pattern.exec({ pathname: '/blog/hello-world' })
      expect(match).toBeTruthy()
      expect(match!.pathname.groups.slug).toBe('hello-world')
    } else {
      // URLPattern not available — our export should be a fallback that throws
      expect(typeof URLPattern).toBe('function')
    }
  })
})

describe('text/config shim', () => {
  it('getConfig returns default empty config', async () => {
    const { default: getConfig } = await import('../src/shims/config.js')
    const config = getConfig()
    expect(config).toEqual({
      serverRuntimeConfig: {},
      publicRuntimeConfig: {},
    })
  })

  it('setConfig updates the runtime config', async () => {
    const { default: getConfig, setConfig } = await import('../src/shims/config.js')
    setConfig({
      serverRuntimeConfig: { secret: 's3cr3t' },
      publicRuntimeConfig: { appName: 'test-app' },
    })
    const config = getConfig()
    expect(config.serverRuntimeConfig.secret).toBe('s3cr3t')
    expect(config.publicRuntimeConfig.appName).toBe('test-app')

    // Reset for other tests
    setConfig({ serverRuntimeConfig: {}, publicRuntimeConfig: {} })
  })
})
