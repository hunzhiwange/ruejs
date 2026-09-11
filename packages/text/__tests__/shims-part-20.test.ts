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
describe('cache scope guards for dynamic APIs', () => {
  it('headers() throws inside "use cache" scope', async () => {
    const { cacheContextStorage } = await import('../src/shims/cache-runtime.js')
    const { headers, setHeadersContext } = await import('../src/shims/headers.js')

    // Set up a valid headers context so the "no context" error doesn't fire
    setHeadersContext({ headers: new Headers(), cookies: new Map() })

    // Run inside a "use cache" ALS scope
    await cacheContextStorage.run(
      {
        tags: [],
        lifeConfigs: [],
        variant: 'default',
        hasExplicitRevalidate: false,
        hasExplicitExpire: false,
        dynamicNestedCacheError: undefined,
      },
      async () => {
        await expect(headers()).rejects.toThrow(/cannot be called inside "use cache"/)
      },
    )

    setHeadersContext(null)
  })

  it('headers() sync access throws the "use cache" error instead of a TypeError', async () => {
    const { cacheContextStorage } = await import('../src/shims/cache-runtime.js')
    const { headers, setHeadersContext } = await import('../src/shims/headers.js')

    setHeadersContext({
      headers: new Headers({ 'x-test': 'blocked' }),
      cookies: new Map(),
    })

    await cacheContextStorage.run(
      {
        tags: [],
        lifeConfigs: [],
        variant: 'default',
        hasExplicitRevalidate: false,
        hasExplicitExpire: false,
        dynamicNestedCacheError: undefined,
      },
      async () => {
        expect(() => headers().get('x-test')).toThrow(/cannot be called inside "use cache"/)
      },
    )

    setHeadersContext(null)
  })

  it('cookies() throws inside "use cache" scope', async () => {
    const { cacheContextStorage } = await import('../src/shims/cache-runtime.js')
    const { cookies, setHeadersContext } = await import('../src/shims/headers.js')

    setHeadersContext({ headers: new Headers(), cookies: new Map() })

    await cacheContextStorage.run(
      {
        tags: [],
        lifeConfigs: [],
        variant: 'default',
        hasExplicitRevalidate: false,
        hasExplicitExpire: false,
        dynamicNestedCacheError: undefined,
      },
      async () => {
        await expect(cookies()).rejects.toThrow(/cannot be called inside "use cache"/)
      },
    )

    setHeadersContext(null)
  })

  it('headers() is allowed inside "use cache: private" scope', async () => {
    const { cacheContextStorage } = await import('../src/shims/cache-runtime.js')
    const { headers, setHeadersContext } = await import('../src/shims/headers.js')

    // Text.js private-cache stores carry request headers.
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/server/app-render/work-unit-async-storage.external.ts
    try {
      setHeadersContext({
        headers: new Headers({ 'x-private': 'allowed' }),
        cookies: new Map(),
      })

      await cacheContextStorage.run(
        {
          tags: [],
          lifeConfigs: [],
          variant: 'private',
          hasExplicitRevalidate: false,
          hasExplicitExpire: false,
          dynamicNestedCacheError: undefined,
        },
        async () => {
          expect((await headers()).get('x-private')).toBe('allowed')
        },
      )
    } finally {
      setHeadersContext(null)
    }
  })

  it('cookies() is allowed inside "use cache: private" scope', async () => {
    const { cacheContextStorage } = await import('../src/shims/cache-runtime.js')
    const { cookies, setHeadersContext } = await import('../src/shims/headers.js')

    // Ported from Text.js: test/e2e/app-dir/use-cache-private/use-cache-private.test.ts
    // https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/use-cache-private/use-cache-private.test.ts
    try {
      setHeadersContext({
        headers: new Headers({ cookie: 'test-cookie=allowed' }),
        cookies: new Map([['test-cookie', 'allowed']]),
      })

      await cacheContextStorage.run(
        {
          tags: [],
          lifeConfigs: [],
          variant: 'private',
          hasExplicitRevalidate: false,
          hasExplicitExpire: false,
          dynamicNestedCacheError: undefined,
        },
        async () => {
          await expect(cookies()).resolves.toMatchObject({
            get: expect.any(Function),
          })
          expect((await cookies()).get('test-cookie')?.value).toBe('allowed')
        },
      )
    } finally {
      setHeadersContext(null)
    }
  })

  it('cookies() sync access throws the "use cache" error instead of a TypeError', async () => {
    const { cacheContextStorage } = await import('../src/shims/cache-runtime.js')
    const { cookies, setHeadersContext } = await import('../src/shims/headers.js')

    setHeadersContext({
      headers: new Headers(),
      cookies: new Map([['session', 'blocked']]),
    })

    await cacheContextStorage.run(
      {
        tags: [],
        lifeConfigs: [],
        variant: 'default',
        hasExplicitRevalidate: false,
        hasExplicitExpire: false,
        dynamicNestedCacheError: undefined,
      },
      async () => {
        expect(() => cookies().get('session')).toThrow(/cannot be called inside "use cache"/)
      },
    )

    setHeadersContext(null)
  })

  it('connection() throws inside "use cache" scope', async () => {
    const { cacheContextStorage } = await import('../src/shims/cache-runtime.js')
    const { connection } = await import('../src/shims/server.js')

    await cacheContextStorage.run(
      {
        tags: [],
        lifeConfigs: [],
        variant: 'default',
        hasExplicitRevalidate: false,
        hasExplicitExpire: false,
        dynamicNestedCacheError: undefined,
      },
      async () => {
        await expect(connection()).rejects.toThrow(/cannot be called inside "use cache"/)
      },
    )
  })

  it('headers() throws inside unstable_cache() scope', async () => {
    const { unstable_cache, setCacheHandler, MemoryCacheHandler } =
      await import('../src/shims/cache.js')
    const { headers, setHeadersContext } = await import('../src/shims/headers.js')

    setCacheHandler(new MemoryCacheHandler())
    setHeadersContext({ headers: new Headers(), cookies: new Map() })

    const cached = unstable_cache(async () => {
      // This should throw because we're inside an unstable_cache scope
      const h = await headers()
      return h.get('x-test')
    }, ['test-headers-in-cache'])

    await expect(cached()).rejects.toThrow(/unstable_cache/)

    setHeadersContext(null)
    setCacheHandler(new MemoryCacheHandler())
  })

  it('cookies() throws inside unstable_cache() scope', async () => {
    const { unstable_cache, setCacheHandler, MemoryCacheHandler } =
      await import('../src/shims/cache.js')
    const { cookies, setHeadersContext } = await import('../src/shims/headers.js')

    setCacheHandler(new MemoryCacheHandler())
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map([['session', 'abc']]),
    })

    const cached = unstable_cache(async () => {
      const c = await cookies()
      return c.get('session')
    }, ['test-cookies-in-cache'])

    await expect(cached()).rejects.toThrow(/unstable_cache/)

    setHeadersContext(null)
    setCacheHandler(new MemoryCacheHandler())
  })

  it('connection() throws inside unstable_cache() scope', async () => {
    const { unstable_cache, setCacheHandler, MemoryCacheHandler } =
      await import('../src/shims/cache.js')
    const { connection } = await import('../src/shims/server.js')

    setCacheHandler(new MemoryCacheHandler())

    const cached = unstable_cache(async () => {
      await connection()
    }, ['test-connection-in-cache'])

    await expect(cached()).rejects.toThrow(/unstable_cache/)

    setCacheHandler(new MemoryCacheHandler())
  })

  it('headers() works normally outside cache scopes', async () => {
    const { headers, setHeadersContext } = await import('../src/shims/headers.js')

    setHeadersContext({
      headers: new Headers({ 'x-test': 'works' }),
      cookies: new Map(),
    })

    // Should not throw outside any cache scope
    const h = await headers()
    expect(h.get('x-test')).toBe('works')

    setHeadersContext(null)
  })

  it('cookies() works normally outside cache scopes', async () => {
    const { cookies, setHeadersContext } = await import('../src/shims/headers.js')

    setHeadersContext({
      headers: new Headers(),
      cookies: new Map([['token', 'abc']]),
    })

    // Should not throw outside any cache scope
    const c = await cookies()
    expect(c.get('token')).toEqual({ name: 'token', value: 'abc' })

    setHeadersContext(null)
  })

  it('draftMode() throws inside "use cache" scope', async () => {
    const { cacheContextStorage } = await import('../src/shims/cache-runtime.js')
    const { draftMode, setHeadersContext } = await import('../src/shims/headers.js')

    setHeadersContext({ headers: new Headers(), cookies: new Map() })

    await cacheContextStorage.run(
      {
        tags: [],
        lifeConfigs: [],
        variant: 'default',
        hasExplicitRevalidate: false,
        hasExplicitExpire: false,
        dynamicNestedCacheError: undefined,
      },
      async () => {
        await expect(draftMode()).rejects.toThrow(/cannot be called inside "use cache"/)
      },
    )

    setHeadersContext(null)
  })

  it('draftMode() throws inside unstable_cache() scope', async () => {
    const { unstable_cache, setCacheHandler, MemoryCacheHandler } =
      await import('../src/shims/cache.js')
    const { draftMode, setHeadersContext } = await import('../src/shims/headers.js')

    setCacheHandler(new MemoryCacheHandler())
    setHeadersContext({ headers: new Headers(), cookies: new Map() })

    const cached = unstable_cache(async () => {
      await draftMode()
    }, ['test-draftmode-in-cache'])

    await expect(cached()).rejects.toThrow(/unstable_cache/)

    setHeadersContext(null)
    setCacheHandler(new MemoryCacheHandler())
  })

  it('headers() throws inside nested scopes (unstable_cache inside "use cache")', async () => {
    const { cacheContextStorage } = await import('../src/shims/cache-runtime.js')
    const { unstable_cache, setCacheHandler, MemoryCacheHandler } =
      await import('../src/shims/cache.js')
    const { headers, setHeadersContext } = await import('../src/shims/headers.js')

    setCacheHandler(new MemoryCacheHandler())
    setHeadersContext({ headers: new Headers(), cookies: new Map() })

    // Nest unstable_cache inside a "use cache" scope: the outermost
    // scope ("use cache") should be detected first.
    await cacheContextStorage.run(
      {
        tags: [],
        lifeConfigs: [],
        variant: 'default',
        hasExplicitRevalidate: false,
        hasExplicitExpire: false,
        dynamicNestedCacheError: undefined,
      },
      async () => {
        const cached = unstable_cache(async () => {
          const h = await headers()
          return h.get('x-test')
        }, ['test-nested-scopes'])

        // Either scope's guard triggers (the "use cache" check runs first)
        await expect(cached()).rejects.toThrow(/cannot be called inside/)
      },
    )

    setHeadersContext(null)
    setCacheHandler(new MemoryCacheHandler())
  })

  it('existing unstable_cache tests still pass (cache miss executes callback)', async () => {
    // Verify that the ALS wrapping in unstable_cache doesn't break normal caching
    const { unstable_cache, setCacheHandler, MemoryCacheHandler } =
      await import('../src/shims/cache.js')

    setCacheHandler(new MemoryCacheHandler())

    let callCount = 0
    const cached = unstable_cache(
      async (x: number) => {
        callCount++
        return x * 2
      },
      ['regression-test'],
    )

    const r1 = await cached(5)
    expect(r1).toBe(10)
    expect(callCount).toBe(1)

    const r2 = await cached(5)
    expect(r2).toBe(10)
    expect(callCount).toBe(1) // Cached, not called again

    setCacheHandler(new MemoryCacheHandler())
  })

  // Ported from Text.js: workStore.invalidDynamicUsageError in
  // packages/text/src/server/app-render/app-render.tsx
  // https://github.com/vercel/next.js/commit/f5e54c06726b571a042fce67417e40a29f6b8689
  it('records invalid dynamic usage error on request context (survives try/catch)', async () => {
    const { cacheContextStorage } = await import('../src/shims/cache-runtime.js')
    const { setHeadersContext, throwIfInsideCacheScope, consumeInvalidDynamicUsageError } =
      await import('../src/shims/headers.js')
    const { createRequestContext, runWithRequestContext } =
      await import('../src/shims/unified-request-context.js')

    setHeadersContext({ headers: new Headers(), cookies: new Map() })

    const ctx = createRequestContext({
      headersContext: { headers: new Headers(), cookies: new Map() },
    })
    let recordedError: unknown = null

    await runWithRequestContext(ctx, async () => {
      try {
        await cacheContextStorage.run(
          {
            tags: [],
            lifeConfigs: [],
            variant: 'default',
            hasExplicitRevalidate: false,
            hasExplicitExpire: false,
            dynamicNestedCacheError: undefined,
          },
          async () => {
            throwIfInsideCacheScope('cookies()')
          },
        )
      } catch {
        // User try/catch — the error should still be recorded on the context
      }
      recordedError = consumeInvalidDynamicUsageError()
    })

    expect(recordedError).toBeInstanceOf(Error)
    expect((recordedError as Error).message).toContain('cannot be called inside "use cache"')

    // After consumption, the error is cleared
    expect(consumeInvalidDynamicUsageError()).toBeNull()

    setHeadersContext(null)
  })

  it('consumeInvalidDynamicUsageError returns null when no error was recorded', async () => {
    const { consumeInvalidDynamicUsageError } = await import('../src/shims/headers.js')
    const { createRequestContext, runWithRequestContext } =
      await import('../src/shims/unified-request-context.js')

    const ctx = createRequestContext()
    let result: unknown

    await runWithRequestContext(ctx, async () => {
      result = consumeInvalidDynamicUsageError()
    })

    expect(result!).toBeNull()
  })

  it('consumeInvalidDynamicUsageError works outside unified request scope', async () => {
    const { consumeInvalidDynamicUsageError } = await import('../src/shims/headers.js')
    // Should return null without throwing when no unified scope is active
    expect(consumeInvalidDynamicUsageError()).toBeNull()
  })
})

describe('shim alias map .js variants', () => {
  it('every top-level text/* alias has a corresponding .js variant', async () => {
    const plugins = text() as Plugin[]
    const configPlugin = plugins.find(p => p.name === 'text:config')
    if (!configPlugin?.config) throw new Error('text:config plugin not found')

    const hookFn = (
      typeof configPlugin.config === 'function' ? configPlugin.config : configPlugin.config.handler
    ) as (config: { root: string }, env: { mode: string; command: string }) => Promise<any>

    const result = await hookFn(
      { root: PAGES_FIXTURE_DIR },
      { mode: 'development', command: 'serve' },
    )

    const aliases = result?.resolve?.alias as Record<string, string> | undefined
    expect(aliases).toBeDefined()

    // Collect top-level text/<name> keys (exclude text/dist/*, text/font/*, text/compat/*, text/legacy/*)
    const topLevel = Object.keys(aliases!).filter(key => {
      if (!key.startsWith('text/')) return false
      if (key.endsWith('.js')) return false
      const segment = key.slice('text/'.length)
      if (segment.startsWith('dist/')) return false
      if (segment.startsWith('font/')) return false
      if (segment.startsWith('compat/')) return false
      if (segment.startsWith('legacy/')) return false
      return true
    })

    expect(topLevel.length).toBeGreaterThan(0)

    const missing = topLevel.filter(key => !(key + '.js' in aliases!))
    expect(missing, `Missing .js aliases for: ${missing.join(', ')}`).toEqual([])
  })
})

describe('@vercel/og compatibility resolution', () => {
  type ResolveIdHook = {
    filter: { id: RegExp }
    handler: (
      this: { environment?: { name?: string } },
      id: string,
      importer?: string,
    ) => string | undefined
  }

  function getResolveIdHook(): ResolveIdHook {
    const plugins = text() as Plugin[]
    const configPlugin = plugins.find(p => p.name === 'text:config')
    if (!configPlugin?.resolveId || typeof configPlugin.resolveId === 'function') {
      throw new Error('text:config resolveId hook not found')
    }
    return configPlugin.resolveId as ResolveIdHook
  }

  it('routes direct @vercel/og app imports through the Text-compatible ImageResponse shim', () => {
    const hook = getResolveIdHook()
    const expectedShim = path.resolve(import.meta.dirname, '../src/shims/og.tsx')

    expect(hook.filter.id.test('@vercel/og')).toBe(true)
    expect(hook.filter.id.test('@vercel/og.js')).toBe(true)
    expect(
      hook.handler.call({}, '@vercel/og', path.join(FIXTURE_DIR, 'app/opengraph-image.tsx')),
    ).toBe(expectedShim)
    expect(
      hook.handler.call({}, '@vercel/og.js', path.join(FIXTURE_DIR, 'app/twitter-image.tsx')),
    ).toBe(expectedShim)
  })

  it('lets the ImageResponse shim delegate to the real @vercel/og package', () => {
    const hook = getResolveIdHook()

    expect(
      hook.handler.call({}, '@vercel/og', '/repo/packages/text/src/shims/og.tsx'),
    ).toBeUndefined()
    expect(
      hook.handler.call({}, '@vercel/og', '/repo/node_modules/text/dist/shims/og.js'),
    ).toBeUndefined()
  })
})

// ── text/head attribute name validation ─────────────────────────────────────

describe('isSafeAttrName', () => {
  let isSafeAttrName: (name: string) => boolean

  beforeEach(async () => {
    const mod = await import('../src/shims/head.js')
    isSafeAttrName = mod.isSafeAttrName
  })

  it('allows standard HTML attribute names', () => {
    expect(isSafeAttrName('name')).toBe(true)
    expect(isSafeAttrName('content')).toBe(true)
    expect(isSafeAttrName('charset')).toBe(true)
    expect(isSafeAttrName('http-equiv')).toBe(true)
    expect(isSafeAttrName('data-testid')).toBe(true)
    expect(isSafeAttrName('property')).toBe(true)
    expect(isSafeAttrName('rel')).toBe(true)
    expect(isSafeAttrName('href')).toBe(true)
    expect(isSafeAttrName('crossOrigin')).toBe(true)
  })

  it('allows xml-namespaced attributes', () => {
    expect(isSafeAttrName('xml:lang')).toBe(true)
    expect(isSafeAttrName('xlink:href')).toBe(true)
  })

  it('rejects attribute names containing quotes', () => {
    expect(isSafeAttrName('x"')).toBe(false)
    expect(isSafeAttrName("x'")).toBe(false)
  })

  it('rejects attribute names containing angle brackets', () => {
    expect(isSafeAttrName('x>')).toBe(false)
    expect(isSafeAttrName('x<script')).toBe(false)
  })

  it('rejects attribute names containing slashes', () => {
    expect(isSafeAttrName('x/')).toBe(false)
    expect(isSafeAttrName('x"/><script>alert(1)</script><meta a="')).toBe(false)
  })

  it('rejects attribute names containing spaces', () => {
    expect(isSafeAttrName('x y')).toBe(false)
    expect(isSafeAttrName('x\ty')).toBe(false)
  })

  it('rejects attribute names containing equals', () => {
    expect(isSafeAttrName('x=y')).toBe(false)
  })

  it('rejects inline event handler attributes', () => {
    expect(isSafeAttrName('onclick')).toBe(false)
    expect(isSafeAttrName('onerror')).toBe(false)
    expect(isSafeAttrName('onload')).toBe(false)
    expect(isSafeAttrName('onmouseover')).toBe(false)
  })

  it("allows attributes starting with 'o' that are not event handlers", () => {
    expect(isSafeAttrName('open')).toBe(true)
    expect(isSafeAttrName('og:title')).toBe(true)
  })

  it('rejects empty or non-alpha-starting names', () => {
    expect(isSafeAttrName('')).toBe(false)
    expect(isSafeAttrName('123')).toBe(false)
    expect(isSafeAttrName('-foo')).toBe(false)
  })
})

// ── has/missing condition value matching (anchored regex) ──────────────────

describe('checkHasConditions value anchoring', () => {
  let checkHasConditions: Function
  let requestContextFromRequest: Function

  beforeEach(async () => {
    const mod = await import('../src/config/config-matchers.js')
    checkHasConditions = mod.checkHasConditions
    requestContextFromRequest = mod.requestContextFromRequest
  })

  it('exact value matches fully', () => {
    const ctx = requestContextFromRequest(
      new Request('http://localhost/', { headers: { cookie: 'role=admin' } }),
    )
    const result = checkHasConditions(
      [{ type: 'cookie', key: 'role', value: 'admin' }],
      undefined,
      ctx,
    )
    expect(result).toBe(true)
  })

  it('does not match substring (anchored regex prevents partial match)', () => {
    const ctx = requestContextFromRequest(
      new Request('http://localhost/', { headers: { cookie: 'role=not-admin' } }),
    )
    const result = checkHasConditions(
      [{ type: 'cookie', key: 'role', value: 'admin' }],
      undefined,
      ctx,
    )
    expect(result).toBe(false)
  })

  it('does not match superstring', () => {
    const ctx = requestContextFromRequest(
      new Request('http://localhost/', { headers: { cookie: 'role=admin-temp' } }),
    )
    const result = checkHasConditions(
      [{ type: 'cookie', key: 'role', value: 'admin' }],
      undefined,
      ctx,
    )
    expect(result).toBe(false)
  })

  it('regex patterns still work with anchoring', () => {
    const ctx = requestContextFromRequest(
      new Request('http://localhost/', { headers: { 'x-lang': 'en-US' } }),
    )
    const result = checkHasConditions(
      [{ type: 'header', key: 'x-lang', value: 'en.*' }],
      undefined,
      ctx,
    )
    expect(result).toBe(true)
  })
})

// ── CSRF origin wildcard matching ─────────────────────────────────────────
// Ported from Text.js: packages/text/src/server/app-render/csrf-protection.test.ts
// https://github.com/vercel/next.js/blob/canary/packages/text/src/server/app-render/csrf-protection.test.ts

describe('isOriginAllowed', () => {
  let isOriginAllowed: (origin: string, allowed: string[]) => boolean

  beforeEach(async () => {
    const mod = await import('../src/server/request-pipeline.js')
    isOriginAllowed = mod.isOriginAllowed
  })

  it('exact match', () => {
    expect(isOriginAllowed('vercel.com', ['vercel.com'])).toBe(true)
    expect(isOriginAllowed('www.vercel.com', ['www.vercel.com'])).toBe(true)
  })

  it('single-level wildcard matches one subdomain', () => {
    expect(isOriginAllowed('asdf.vercel.com', ['*.vercel.com'])).toBe(true)
  })

  it('single-level wildcard does NOT match multiple subdomains', () => {
    expect(isOriginAllowed('asdf.jkl.vercel.com', ['*.vercel.com'])).toBe(false)
  })

  it('double wildcard matches one or more subdomains', () => {
    expect(isOriginAllowed('asdf.vercel.com', ['**.vercel.com'])).toBe(true)
    expect(isOriginAllowed('asdf.jkl.vercel.com', ['**.vercel.com'])).toBe(true)
  })

  it('does not match different TLD', () => {
    expect(isOriginAllowed('asdf.vercel.com', ['*.vercel.app'])).toBe(false)
    expect(isOriginAllowed('asdf.jkl.vercel.app', ['**.vercel.com'])).toBe(false)
  })

  it('does not match unrelated domain', () => {
    expect(isOriginAllowed('vercel.com', ['textjs.org'])).toBe(false)
  })

  it('returns false for undefined/empty allowed list', () => {
    expect(isOriginAllowed('vercel.com', [])).toBe(false)
  })

  it('returns false for empty string pattern', () => {
    expect(isOriginAllowed('vercel.com', [''])).toBe(false)
  })

  it('wildcards only match below the domain level', () => {
    expect(isOriginAllowed('vercel.com', ['*'])).toBe(false)
    expect(isOriginAllowed('vercel.com', ['**'])).toBe(false)
  })

  it('matches case-insensitively (RFC 1035)', () => {
    expect(isOriginAllowed('sub.VERCEL.com', ['*.vercel.com'])).toBe(true)
    expect(isOriginAllowed('SUB.vercel.COM', ['*.vercel.com'])).toBe(true)
    expect(isOriginAllowed('VERCEL.COM', ['vercel.com'])).toBe(true)
    expect(isOriginAllowed('vercel.com', ['VERCEL.COM'])).toBe(true)
  })

  it('localhost patterns', () => {
    expect(isOriginAllowed('subdomain.localhost', ['*.localhost'])).toBe(true)
    expect(isOriginAllowed('localhost', ['*.localhost'])).toBe(false)
    expect(isOriginAllowed('subdomain.localhost', ['**.localhost'])).toBe(true)
    expect(isOriginAllowed('a.b.localhost', ['**.localhost'])).toBe(true)
    expect(isOriginAllowed('localhost', ['**.localhost'])).toBe(false)
    expect(isOriginAllowed('localhost', ['localhost'])).toBe(true)
  })

  it('does NOT match attacker-controlled suffix domains', () => {
    // This was the original vulnerability: endsWith(".example.com") matching
    // evil.example.com.attacker.com
    expect(isOriginAllowed('evil.example.com.attacker.com', ['*.example.com'])).toBe(false)
    expect(isOriginAllowed('evil.example.com.attacker.com', ['**.example.com'])).toBe(false)
  })
})

// Reference: vercel/text.js#92012 — useOffline() hook
describe('text/offline shim', () => {
  it('exports useOffline', async () => {
    const offline = await import('../src/shims/offline.js')
    expect(offline.useOffline).toBeDefined()
    expect(typeof offline.useOffline).toBe('function')
  })

  it('useOffline returns false (no-op stub)', async () => {
    const offline = await import('../src/shims/offline.js')
    expect(offline.useOffline()).toBe(false)
  })
})

// Regression for cloudflare/text#1353. The Pages Router navigation shim
// referenced `window` unconditionally inside `performNavigation()`, so any
// component calling `router.push()` during SSR or prerendering
// (TEXT_PRERENDER=1) crashed the render pipeline with
// `ReferenceError: window is not defined`. Text.js's `ServerRouter`
// (packages/text/src/server/render.tsx) instead throws a documented
// "No router instance found" error from every navigation method. We mirror
// that here so the failure mode is a recoverable render error rather than
// a global ReferenceError.
//
// Ported from Text.js: test/e2e/with-router/pages/router-method-ssr.js +
// test/e2e/with-router/index.test.ts (the "router-method-ssr" SSR case).
