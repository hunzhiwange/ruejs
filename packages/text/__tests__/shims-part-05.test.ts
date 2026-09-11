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
describe('"use cache" runtime', () => {
  it('registerCachedFunction caches return values', async () => {
    const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
    // Reset state
    const { setCacheHandler, MemoryCacheHandler } = await import('../src/shims/cache.js')
    setCacheHandler(new MemoryCacheHandler())

    let callCount = 0
    const fn = async (x: number) => {
      callCount++
      return { result: x * 2 }
    }

    const cached = registerCachedFunction(fn, 'test:double')

    const r1 = await cached(5)
    expect(r1).toEqual({ result: 10 })
    expect(callCount).toBe(1)

    // Second call with same args — should be cached
    const r2 = await cached(5)
    expect(r2).toEqual({ result: 10 })
    expect(callCount).toBe(1) // Not called again

    // Different args — cache miss
    const r3 = await cached(7)
    expect(r3).toEqual({ result: 14 })
    expect(callCount).toBe(2)
  })

  it('scopes shared cache entries by build ID', async () => {
    const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
    const { setCacheHandler, MemoryCacheHandler } = await import('../src/shims/cache.js')
    setCacheHandler(new MemoryCacheHandler())

    const previousBuildId = process.env.__TEXT_BUILD_ID
    try {
      let callCount = 0

      process.env.__TEXT_BUILD_ID = 'build-one'
      const firstBuild = registerCachedFunction(async () => {
        callCount++
        return { version: 'old' }
      }, 'test:same-id')

      expect(await firstBuild()).toEqual({ version: 'old' })
      expect(callCount).toBe(1)

      process.env.__TEXT_BUILD_ID = 'build-two'
      const secondBuild = registerCachedFunction(async () => {
        callCount++
        return { version: 'new' }
      }, 'test:same-id')

      expect(await secondBuild()).toEqual({ version: 'new' })
      expect(callCount).toBe(2)
    } finally {
      if (previousBuildId === undefined) {
        delete process.env.__TEXT_BUILD_ID
      } else {
        process.env.__TEXT_BUILD_ID = previousBuildId
      }
    }
  })

  it('scopes shared cache entries by deployment ID when available', async () => {
    // Ported from Text.js: test/production/app-dir/use-cache-cross-deployment/use-cache-cross-deployment.test.ts
    // https://github.com/vercel/next.js/blob/07f76411b07de9417d4a6b816f3137cafe1045fc/test/production/app-dir/use-cache-cross-deployment/use-cache-cross-deployment.test.ts
    const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
    const { setCacheHandler, MemoryCacheHandler } = await import('../src/shims/cache.js')
    setCacheHandler(new MemoryCacheHandler())

    const previousBuildId = process.env.__TEXT_BUILD_ID
    const previousDeploymentId = process.env.__TEXT_DEPLOYMENT_ID
    const previousTextDeploymentId = process.env.TEXT_DEPLOYMENT_ID
    try {
      process.env.__TEXT_BUILD_ID = 'stable-build'
      delete process.env.TEXT_DEPLOYMENT_ID

      let callCount = 0
      const cached = registerCachedFunction(async () => {
        callCount++
        return { count: callCount }
      }, 'test:deployment-id')

      process.env.__TEXT_DEPLOYMENT_ID = 'deployment-one'
      expect(await cached()).toEqual({ count: 1 })
      expect(await cached()).toEqual({ count: 1 })

      process.env.__TEXT_DEPLOYMENT_ID = 'deployment-two'
      expect(await cached()).toEqual({ count: 2 })
      expect(await cached()).toEqual({ count: 2 })

      delete process.env.__TEXT_DEPLOYMENT_ID
      expect(await cached()).toEqual({ count: 3 })
      expect(await cached()).toEqual({ count: 3 })
    } finally {
      if (previousBuildId === undefined) {
        delete process.env.__TEXT_BUILD_ID
      } else {
        process.env.__TEXT_BUILD_ID = previousBuildId
      }
      if (previousDeploymentId === undefined) {
        delete process.env.__TEXT_DEPLOYMENT_ID
      } else {
        process.env.__TEXT_DEPLOYMENT_ID = previousDeploymentId
      }
      if (previousTextDeploymentId === undefined) {
        delete process.env.TEXT_DEPLOYMENT_ID
      } else {
        process.env.TEXT_DEPLOYMENT_ID = previousTextDeploymentId
      }
    }
  })

  it('uses TEXT_DEPLOYMENT_ID when the internal define is empty', async () => {
    const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
    const { setCacheHandler, MemoryCacheHandler } = await import('../src/shims/cache.js')
    setCacheHandler(new MemoryCacheHandler())

    const previousBuildId = process.env.__TEXT_BUILD_ID
    const previousDeploymentId = process.env.__TEXT_DEPLOYMENT_ID
    const previousTextDeploymentId = process.env.TEXT_DEPLOYMENT_ID
    try {
      process.env.__TEXT_BUILD_ID = 'stable-build'
      process.env.__TEXT_DEPLOYMENT_ID = ''

      let callCount = 0
      const cached = registerCachedFunction(async () => {
        callCount++
        return { count: callCount }
      }, 'test:text-deployment-id')

      process.env.TEXT_DEPLOYMENT_ID = 'env-deployment-one'
      expect(await cached()).toEqual({ count: 1 })
      expect(await cached()).toEqual({ count: 1 })

      process.env.TEXT_DEPLOYMENT_ID = 'env-deployment-two'
      expect(await cached()).toEqual({ count: 2 })
      expect(await cached()).toEqual({ count: 2 })
      expect(callCount).toBe(2)
    } finally {
      if (previousBuildId === undefined) {
        delete process.env.__TEXT_BUILD_ID
      } else {
        process.env.__TEXT_BUILD_ID = previousBuildId
      }
      if (previousDeploymentId === undefined) {
        delete process.env.__TEXT_DEPLOYMENT_ID
      } else {
        process.env.__TEXT_DEPLOYMENT_ID = previousDeploymentId
      }
      if (previousTextDeploymentId === undefined) {
        delete process.env.TEXT_DEPLOYMENT_ID
      } else {
        process.env.TEXT_DEPLOYMENT_ID = previousTextDeploymentId
      }
    }
  })

  it('registerCachedFunction respects cacheLife inside cached function', async () => {
    const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
    const { setCacheHandler, MemoryCacheHandler, cacheLife } = await import('../src/shims/cache.js')
    setCacheHandler(new MemoryCacheHandler())

    let callCount = 0
    const fn = async () => {
      cacheLife('seconds') // revalidate: 1s
      callCount++
      return { ts: Date.now() }
    }

    const cached = registerCachedFunction(fn, 'test:cachelife')

    await cached()
    expect(callCount).toBe(1)

    // Immediate second call — cached
    await cached()
    expect(callCount).toBe(1)
  })

  it('registerCachedFunction collects cacheTag', async () => {
    const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
    const { setCacheHandler, MemoryCacheHandler, cacheTag } = await import('../src/shims/cache.js')
    const handler = new MemoryCacheHandler()
    setCacheHandler(handler)

    const fn = async () => {
      cacheTag('my-tag', 'another-tag')
      return { data: 'tagged' }
    }

    const cached = registerCachedFunction(fn, 'test:tags')
    await cached()

    // The cache entry should have tags
    const entry = await handler.get('use-cache:test:tags')
    expect(entry).not.toBeNull()
    expect(entry?.value).toHaveProperty('kind', 'FETCH')
    if (entry?.value && entry.value.kind === 'FETCH') {
      expect(entry.value.tags).toContain('my-tag')
      expect(entry.value.tags).toContain('another-tag')
    }
  })

  it('revalidateTag invalidates cached entries', async () => {
    const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
    const { setCacheHandler, MemoryCacheHandler, cacheTag, revalidateTag } =
      await import('../src/shims/cache.js')
    setCacheHandler(new MemoryCacheHandler())

    let callCount = 0
    const fn = async () => {
      cacheTag('invalidate-me')
      callCount++
      return { count: callCount }
    }

    const cached = registerCachedFunction(fn, 'test:invalidate')

    const r1 = await cached()
    expect(r1).toEqual({ count: 1 })
    expect(callCount).toBe(1)

    // Cached
    const r2 = await cached()
    expect(r2).toEqual({ count: 1 })
    expect(callCount).toBe(1)

    // Invalidate the tag
    await revalidateTag('invalidate-me')

    // Should re-execute
    const r3 = await cached()
    expect(r3).toEqual({ count: 2 })
    expect(callCount).toBe(2)
  })

  it('private variant uses per-request cache', async () => {
    const { registerCachedFunction, clearPrivateCache } =
      await import('../src/shims/cache-runtime.js')

    let callCount = 0
    const fn = async () => {
      callCount++
      return { count: callCount }
    }

    const cached = registerCachedFunction(fn, 'test:private', 'private')

    const r1 = await cached()
    expect(r1).toEqual({ count: 1 })

    // Same request — cached
    const r2 = await cached()
    expect(r2).toEqual({ count: 1 })

    // Clear private cache (simulates new request)
    clearPrivateCache()

    // Should re-execute
    const r3 = await cached()
    expect(r3).toEqual({ count: 2 })
  })

  it('private variant marks prerender output dynamic', async () => {
    const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
    const { consumeDynamicUsage } = await import('../src/shims/headers.js')
    const { createRequestContext, runWithRequestContext } =
      await import('../src/shims/unified-request-context.js')

    // Ported from Text.js: "use cache: private" is dynamic in prerendering contexts.
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/server/use-cache/use-cache-wrapper.ts
    const previousPrerender = process.env.TEXT_PRERENDER
    process.env.TEXT_PRERENDER = '1'

    try {
      await runWithRequestContext(createRequestContext(), async () => {
        const cached = registerCachedFunction(
          async () => 'private',
          'test:private-prerender',
          'private',
        )
        await cached()

        expect(consumeDynamicUsage()).toBe(true)
      })
    } finally {
      if (previousPrerender === undefined) {
        delete process.env.TEXT_PRERENDER
      } else {
        process.env.TEXT_PRERENDER = previousPrerender
      }
    }
  })

  it('rejects "use cache: private" nested inside public "use cache"', async () => {
    const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
    const { cookies, setHeadersContext } = await import('../src/shims/headers.js')
    const { createRequestContext, runWithRequestContext } =
      await import('../src/shims/unified-request-context.js')

    // Ported from Text.js: "use cache: private" must not run inside public "use cache".
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/server/use-cache/use-cache-wrapper.ts
    await runWithRequestContext(createRequestContext(), async () => {
      try {
        setHeadersContext({
          headers: new Headers({ cookie: 'test-cookie=leaked' }),
          cookies: new Map([['test-cookie', 'leaked']]),
        })

        const inner = registerCachedFunction(
          async () => (await cookies()).get('test-cookie')?.value,
          'test:private-nested-inner',
          'private',
        )
        const outer = registerCachedFunction(async () => inner(), 'test:private-nested-outer', '')

        await expect(outer()).rejects.toThrow(
          /"use cache: private" must not be used within "use cache"/,
        )
      } finally {
        setHeadersContext(null)
      }
    })
  })

  it('cacheLife minimum-wins rule applies', async () => {
    const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
    const { setCacheHandler, MemoryCacheHandler, cacheLife } = await import('../src/shims/cache.js')
    const handler = new MemoryCacheHandler()
    setCacheHandler(handler)

    const fn = async () => {
      cacheLife('hours') // revalidate: 3600
      cacheLife('seconds') // revalidate: 1  — this should win
      return { data: 'min-wins' }
    }

    const cached = registerCachedFunction(fn, 'test:min-wins')
    await cached()

    // The entry should have the minimum revalidate (1 second from "seconds" profile)
    const entry = await handler.get('use-cache:test:min-wins')
    expect(entry).not.toBeNull()
    if (entry?.value && entry.value.kind === 'FETCH') {
      expect(entry.value.revalidate).toBe(1)
    }
  })

  it('getCacheContext returns null outside cache function', async () => {
    const { getCacheContext } = await import('../src/shims/cache-runtime.js')
    expect(getCacheContext()).toBeNull()
  })

  it('consistent cache keys for same objects regardless of key order', async () => {
    const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
    const { setCacheHandler, MemoryCacheHandler } = await import('../src/shims/cache.js')
    setCacheHandler(new MemoryCacheHandler())

    let callCount = 0
    const fn = async (_opts: Record<string, unknown>) => {
      callCount++
      return { result: 'ok' }
    }

    const cached = registerCachedFunction(fn, 'test:stable-key')

    // Different key order, same content — should be same cache key
    await cached({ b: 2, a: 1 })
    expect(callCount).toBe(1)

    await cached({ a: 1, b: 2 })
    expect(callCount).toBe(1) // Same cache key, still cached
  })

  it('cached function with no args works correctly', async () => {
    const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
    const { setCacheHandler, MemoryCacheHandler } = await import('../src/shims/cache.js')
    setCacheHandler(new MemoryCacheHandler())

    let callCount = 0
    const fn = async () => {
      callCount++
      return { hello: 'world' }
    }

    const cached = registerCachedFunction(fn, 'test:no-args')
    const r1 = await cached()
    const r2 = await cached()
    expect(r1).toEqual({ hello: 'world' })
    expect(r2).toEqual({ hello: 'world' })
    expect(callCount).toBe(1)
  })

  it('falls back to JSON when RSC module is unavailable (test environment)', async () => {
    // In vitest, @vitejs/plugin-rsc/rue/rsc is not available (no Vite RSC
    // environment). The runtime should gracefully fall back to JSON.stringify
    // for cache values and stableStringify for cache keys.
    const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
    const { setCacheHandler, MemoryCacheHandler } = await import('../src/shims/cache.js')
    const handler = new MemoryCacheHandler()
    setCacheHandler(handler)

    const fn = async (x: number) => ({ doubled: x * 2 })
    const cached = registerCachedFunction(fn, 'test:json-fallback')

    const r1 = await cached(3)
    expect(r1).toEqual({ doubled: 6 })

    // Verify the stored value is JSON (no x-text-rsc header)
    // stableStringify wraps args as an array: [3]
    const entry = await handler.get('use-cache:test:json-fallback:[3]')
    expect(entry).not.toBeNull()
    if (entry?.value && entry.value.kind === 'FETCH') {
      expect(entry.value.data.headers['x-text-rsc']).toBeUndefined()
      expect(JSON.parse(entry.value.data.body)).toEqual({ doubled: 6 })
    }
  })

  it('skips caching for non-serializable args (functions)', async () => {
    const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
    const { setCacheHandler, MemoryCacheHandler } = await import('../src/shims/cache.js')
    setCacheHandler(new MemoryCacheHandler())

    let callCount = 0
    const fn = async (_cb: () => void) => {
      callCount++
      return { called: true }
    }

    const cached = registerCachedFunction(fn, 'test:fn-arg')

    // Functions can't be serialized — should execute every time (no caching)
    await cached(() => {})
    await cached(() => {})
    expect(callCount).toBe(2)
  })

  it('produces different cache entries for Promise-augmented params with different values', async () => {
    // Regression test: Text.js 16 params are created via
    // Object.assign(Promise.resolve(params), params) — a "thenable object".
    // encodeReply with temporaryReferences treats Promises as temp refs,
    // which excluded the actual param values from the cache key.
    // This caused all dynamic route pages with "use cache" to share one
    // cache entry (e.g., /layouts/sports showed /layouts/electronics data).
    const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
    const { setCacheHandler, MemoryCacheHandler } = await import('../src/shims/cache.js')
    setCacheHandler(new MemoryCacheHandler())

    let callCount = 0
    // Simulates a page component: async function Page({ params }) { ... }
    const fn = async (props: { params: any }) => {
      callCount++
      const p = typeof props.params.then === 'function' ? await props.params : props.params
      return { section: p.section, data: `data-for-${p.section}` }
    }

    const cached = registerCachedFunction(fn, 'test:thenable-params')

    // Create Promise-augmented params (same pattern as entries/app-rsc-entry.ts)
    const electronicsParams = { section: 'electronics' }
    const asyncElectronics = Object.assign(Promise.resolve(electronicsParams), electronicsParams)

    const sportsParams = { section: 'sports' }
    const asyncSports = Object.assign(Promise.resolve(sportsParams), sportsParams)

    // First call — electronics
    const r1 = await cached({ params: asyncElectronics })
    expect(r1).toEqual({ section: 'electronics', data: 'data-for-electronics' })
    expect(callCount).toBe(1)

    // Second call with SAME params — should be cached
    const asyncElectronics2 = Object.assign(Promise.resolve({ section: 'electronics' }), {
      section: 'electronics',
    })
    const r2 = await cached({ params: asyncElectronics2 })
    expect(r2).toEqual({ section: 'electronics', data: 'data-for-electronics' })
    expect(callCount).toBe(1) // Cache hit

    // Third call with DIFFERENT params — must be a cache MISS
    const r3 = await cached({ params: asyncSports })
    expect(r3).toEqual({ section: 'sports', data: 'data-for-sports' })
    expect(callCount).toBe(2) // Must have called the function again!
  })

  // -----------------------------------------------------------------------
  // Nested-dynamic cache life error tests — ported from Text.js PR #93707
  // https://github.com/vercel/next.js/pull/93707
  // -----------------------------------------------------------------------

  // These tests exercise the prerender-only throw path. The runtime check
  // is gated on `process.env.TEXT_PRERENDER === "1"` (or NODE_ENV ===
  // "development") to match Text.js, which only throws when the work unit
  // type is `prerender` or `request` in dev. We set/restore the flag around
  // each test rather than relying on test ordering.
  function withPrerenderFlag<T>(fn: () => Promise<T>): Promise<T> {
    const previous = process.env.TEXT_PRERENDER
    process.env.TEXT_PRERENDER = '1'
    return fn().finally(() => {
      if (previous === undefined) delete process.env.TEXT_PRERENDER
      else process.env.TEXT_PRERENDER = previous
    })
  }

  it('throws nested-dynamic error when inner cache has revalidate:0 and outer has no explicit cacheLife (prerender)', async () => {
    await withPrerenderFlag(async () => {
      const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
      const { setCacheHandler, MemoryCacheHandler, cacheLife } =
        await import('../src/shims/cache.js')
      setCacheHandler(new MemoryCacheHandler())

      const innerFn = async () => {
        cacheLife({ revalidate: 0 })
        return 'inner'
      }
      const innerCached = registerCachedFunction(innerFn, 'test:nested-rev0-inner')

      const outerFn = async () => {
        const result = await innerCached()
        return `outer-${result}`
      }
      const outerCached = registerCachedFunction(outerFn, 'test:nested-rev0-outer')

      // Top-level call — outer has no explicit cacheLife, inner has revalidate:0
      // This should throw a nested-dynamic error
      let thrown: Error | undefined
      try {
        await outerCached()
      } catch (e) {
        thrown = e as Error
      }

      expect(thrown).toBeDefined()
      expect(thrown!.message).toContain('revalidate')
      expect(thrown!.message).toContain('"use cache"')
      expect(thrown!.message).toContain('not allowed')
      expect(thrown!.cause).toBeDefined()
      expect((thrown!.cause as Error).message).toContain('dynamic cache life')
      expect((thrown!.cause as Error).name).toContain('Nested dynamic')
    })
  })

  it('throws nested-dynamic error when inner cache has short expire and outer has no explicit cacheLife (prerender)', async () => {
    await withPrerenderFlag(async () => {
      const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
      const { setCacheHandler, MemoryCacheHandler, cacheLife } =
        await import('../src/shims/cache.js')
      setCacheHandler(new MemoryCacheHandler())

      const innerFn = async () => {
        cacheLife({ expire: 60 }) // 1 minute, under 5 minute threshold
        return 'inner'
      }
      const innerCached = registerCachedFunction(innerFn, 'test:nested-short-inner')

      const outerFn = async () => {
        const result = await innerCached()
        return `outer-${result}`
      }
      const outerCached = registerCachedFunction(outerFn, 'test:nested-short-outer')

      let thrown: Error | undefined
      try {
        await outerCached()
      } catch (e) {
        thrown = e as Error
      }

      expect(thrown).toBeDefined()
      expect(thrown!.message).toContain('expire')
      expect(thrown!.message).toContain('"use cache"')
      expect(thrown!.message).toContain('not allowed')
      expect(thrown!.cause).toBeDefined()
      expect((thrown!.cause as Error).message).toContain('dynamic cache life')
    })
  })

  it('does not throw outside prerender/dev even with a nested dynamic inner cache', async () => {
    // Verifies the prerender gate: in production runtime SSR (no
    // TEXT_PRERENDER, NODE_ENV !== "development"), nesting a dynamic
    // inner inside a non-cacheLife() outer must NOT throw. This matches
    // Text.js, which only surfaces the error during prerender or dev
    // requests (see use-cache-wrapper.ts).
    // `NODE_ENV` is typed read-only on `process.env`; cast to the indexable
    // signature to allow temporary mutation in this test.
    const env = process.env as Record<string, string | undefined>
    const previousPrerender = env.TEXT_PRERENDER
    const previousNodeEnv = env.NODE_ENV
    delete env.TEXT_PRERENDER
    env.NODE_ENV = 'production'
    try {
      const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
      const { setCacheHandler, MemoryCacheHandler, cacheLife } =
        await import('../src/shims/cache.js')
      setCacheHandler(new MemoryCacheHandler())

      const innerCached = registerCachedFunction(async () => {
        cacheLife({ revalidate: 0 })
        return 'inner'
      }, 'test:nested-prod-inner')

      // No explicit cacheLife on the outer — in prerender this would throw,
      // but in production runtime SSR it must just run and not be cached.
      const outerCached = registerCachedFunction(
        async () => `outer-${await innerCached()}`,
        'test:nested-prod-outer',
      )

      const result = await outerCached()
      expect(result).toBe('outer-inner')
    } finally {
      if (previousPrerender === undefined) delete env.TEXT_PRERENDER
      else env.TEXT_PRERENDER = previousPrerender
      if (previousNodeEnv === undefined) delete env.NODE_ENV
      else env.NODE_ENV = previousNodeEnv
    }
  })

  it('does throw in development mode even without TEXT_PRERENDER set', async () => {
    // Companion to the production test above: verifies the *other side* of
    // the gate. With `NODE_ENV === "development"` (and no TEXT_PRERENDER),
    // the throw must still fire. This catches a hypothetical regression
    // where the gate is broken to e.g. only check TEXT_PRERENDER, or to
    // check `!== "production"` (which would falsely fire in Vitest's
    // default `NODE_ENV=test`). Together with the production test, this
    // pins down both branches of the gate.
    const env = process.env as Record<string, string | undefined>
    const previousPrerender = env.TEXT_PRERENDER
    const previousNodeEnv = env.NODE_ENV
    delete env.TEXT_PRERENDER
    env.NODE_ENV = 'development'
    try {
      const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
      const { setCacheHandler, MemoryCacheHandler, cacheLife } =
        await import('../src/shims/cache.js')
      setCacheHandler(new MemoryCacheHandler())

      const innerCached = registerCachedFunction(async () => {
        cacheLife({ revalidate: 0 })
        return 'inner'
      }, 'test:nested-dev-inner')

      const outerCached = registerCachedFunction(
        async () => `outer-${await innerCached()}`,
        'test:nested-dev-outer',
      )

      let thrown: Error | undefined
      try {
        await outerCached()
      } catch (e) {
        thrown = e as Error
      }

      expect(thrown).toBeDefined()
      expect(thrown!.message).toContain('revalidate')
      // In dev, the message should say "in development", not
      // "during prerendering", since no prerendering is happening.
      expect(thrown!.message).toContain('in development')
      expect(thrown!.message).not.toContain('during prerendering')
    } finally {
      if (previousPrerender === undefined) delete env.TEXT_PRERENDER
      else env.TEXT_PRERENDER = previousPrerender
      if (previousNodeEnv === undefined) delete env.NODE_ENV
      else env.NODE_ENV = previousNodeEnv
    }
  })

  it('does not throw when outer cache has explicit cacheLife', async () => {
    await withPrerenderFlag(async () => {
      const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
      const { setCacheHandler, MemoryCacheHandler, cacheLife } =
        await import('../src/shims/cache.js')
      setCacheHandler(new MemoryCacheHandler())

      const innerFn = async () => {
        cacheLife({ revalidate: 0 })
        return 'inner'
      }
      const innerCached = registerCachedFunction(innerFn, 'test:nested-ok-inner')

      const outerFn = async () => {
        cacheLife({ revalidate: 60 }) // explicit on outer
        const result = await innerCached()
        return `outer-${result}`
      }
      const outerCached = registerCachedFunction(outerFn, 'test:nested-ok-outer')

      // Should NOT throw — outer made an explicit choice
      const result = await outerCached()
      expect(result).toBe('outer-inner')
    })
  })

  it('explicit cacheLife on outer suppresses throw but minimum-wins still applies to effective cache life', async () => {
    // Documents a potentially surprising behavior: when the outer has an
    // explicit `cacheLife({ revalidate: 60 })` and the inner is dynamic
    // (`revalidate: 0`), the throw is suppressed (outer made an explicit
    // choice), but the outer's effective `revalidate` resolves to 0 via
    // minimum-wins (because the inner's resolved life is pushed into the
    // outer's `lifeConfigs`). MemoryCacheHandler treats `revalidate: 0` as
    // not cached, so the outer function executes on every call. This matches
    // Text.js's `propagateCacheLifeAndTagsToRevalidateStore` semantics —
    // the outer's explicit cacheLife() opts it out of the throw, but does
    // not override the inner's minimum-wins contribution.
    await withPrerenderFlag(async () => {
      const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
      const { setCacheHandler, MemoryCacheHandler, cacheLife } =
        await import('../src/shims/cache.js')
      setCacheHandler(new MemoryCacheHandler())

      let innerCalls = 0
      let outerCalls = 0

      const innerCached = registerCachedFunction(async () => {
        innerCalls++
        cacheLife({ revalidate: 0 })
        return 'inner'
      }, 'test:min-wins-inner')

      const outerCached = registerCachedFunction(async () => {
        outerCalls++
        cacheLife({ revalidate: 60 })
        return `outer-${await innerCached()}`
      }, 'test:min-wins-outer')

      const first = await outerCached()
      const second = await outerCached()
      expect(first).toBe('outer-inner')
      expect(second).toBe('outer-inner')
      // The outer function must execute twice — minimum-wins resolved its
      // effective revalidate to 0, so the result was not cached despite the
      // explicit `cacheLife({ revalidate: 60 })`.
      expect(outerCalls).toBe(2)
      // Inner is also dynamic (revalidate: 0) so it re-executes too.
      expect(innerCalls).toBe(2)
    })
  })

  it('keeps first dynamic child as cause when multiple nested caches are dynamic', async () => {
    await withPrerenderFlag(async () => {
      const { registerCachedFunction } = await import('../src/shims/cache-runtime.js')
      const { setCacheHandler, MemoryCacheHandler, cacheLife } =
        await import('../src/shims/cache.js')
      setCacheHandler(new MemoryCacheHandler())

      const innerA = registerCachedFunction(async () => {
        cacheLife({ revalidate: 0 })
        return 'a'
      }, 'test:first-child-a')

      const innerB = registerCachedFunction(async () => {
        cacheLife({ expire: 120 }) // also dynamic
        return 'b'
      }, 'test:first-child-b')

      const outerFn = async () => {
        await innerA()
        await innerB()
        return 'outer'
      }
      const outerCached = registerCachedFunction(outerFn, 'test:first-child-outer')

      let thrown: Error | undefined
      try {
        await outerCached()
      } catch (e) {
        thrown = e as Error
      }

      expect(thrown).toBeDefined()
      expect(thrown!.cause).toBeDefined()
      // The cause should be from the FIRST dynamic child (innerA), which set
      // `revalidate: 0`. The outer error message reflects the first-firing
      // dynamic field — if innerA's revalidate propagated first, the outer
      // throws the revalidate (not expire) error, even though innerB's
      // `expire: 120` is also below DYNAMIC_EXPIRE. This rigorously verifies
      // first-child-wins semantics: dynamicNestedCacheError uses `??=` so the
      // first dynamic child's eager error is preserved as the cause, and the
      // revalidate check fires before the expire check in the outer.
      expect(thrown!.message).toContain('revalidate')
      expect(thrown!.message).not.toContain('expire')
    })
  })
})

describe('replyToCacheKey deterministic hashing', () => {
  it('returns string replies as-is', async () => {
    const { replyToCacheKey } = await import('../src/shims/cache-runtime.js')
    expect(await replyToCacheKey('hello')).toBe('hello')
    expect(await replyToCacheKey('')).toBe('')
  })

  it('produces stable hash for FormData with string entries', async () => {
    const { replyToCacheKey } = await import('../src/shims/cache-runtime.js')

    const fd1 = new FormData()
    fd1.append('a', '1')
    fd1.append('b', '2')

    const fd2 = new FormData()
    fd2.append('a', '1')
    fd2.append('b', '2')

    const key1 = await replyToCacheKey(fd1)
    const key2 = await replyToCacheKey(fd2)
    expect(key1).toBe(key2)
  })

  it('produces stable hash regardless of entry insertion order', async () => {
    const { replyToCacheKey } = await import('../src/shims/cache-runtime.js')

    const fd1 = new FormData()
    fd1.append('b', '2')
    fd1.append('a', '1')

    const fd2 = new FormData()
    fd2.append('a', '1')
    fd2.append('b', '2')

    const key1 = await replyToCacheKey(fd1)
    const key2 = await replyToCacheKey(fd2)
    expect(key1).toBe(key2)
  })

  it('produces stable hash for FormData with Blob entries', async () => {
    const { replyToCacheKey } = await import('../src/shims/cache-runtime.js')

    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/octet-stream' })

    const fd1 = new FormData()
    fd1.append('data', blob)

    const fd2 = new FormData()
    fd2.append('data', blob)

    const key1 = await replyToCacheKey(fd1)
    const key2 = await replyToCacheKey(fd2)
    expect(key1).toBe(key2)
  })

  it('produces different hashes for different FormData content', async () => {
    const { replyToCacheKey } = await import('../src/shims/cache-runtime.js')

    const fd1 = new FormData()
    fd1.append('a', '1')

    const fd2 = new FormData()
    fd2.append('a', '2')

    const key1 = await replyToCacheKey(fd1)
    const key2 = await replyToCacheKey(fd2)
    expect(key1).not.toBe(key2)
  })
})

describe('middleware runner', () => {
  it('findMiddlewareFile finds middleware.ts at project root', async () => {
    const { findMiddlewareFile } = await import('../src/server/middleware.js')
    const { createValidFileMatcher } = await import('../src/routing/file-matcher.js')
    // pages-basic fixture has middleware.ts
    const result = findMiddlewareFile(FIXTURE_DIR, createValidFileMatcher())
    expect(result).not.toBeNull()
    expect(result).toContain('middleware.ts')
  })

  it('findMiddlewareFile returns null when no middleware exists', async () => {
    const { findMiddlewareFile } = await import('../src/server/middleware.js')
    const { createValidFileMatcher } = await import('../src/routing/file-matcher.js')
    const result = findMiddlewareFile(
      '/tmp/nonexistent-dir-' + Date.now(),
      createValidFileMatcher(),
    )
    expect(result).toBeNull()
  })

  it('findMiddlewareFile does not find middleware.ts when ts is not a configured pageExtension', async () => {
    const { findMiddlewareFile } = await import('../src/server/middleware.js')
    const { createValidFileMatcher } = await import('../src/routing/file-matcher.js')
    // FIXTURE_DIR has middleware.ts — restricting to mdx only means it should not match
    const result = findMiddlewareFile(FIXTURE_DIR, createValidFileMatcher(['mdx']))
    expect(result).toBeNull()
  })

  it('findMiddlewareFile emits a deprecation warning when middleware.ts is found', async () => {
    const { findMiddlewareFile } = await import('../src/server/middleware.js')
    const { createValidFileMatcher } = await import('../src/routing/file-matcher.js')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      findMiddlewareFile(FIXTURE_DIR, createValidFileMatcher())
      expect(warnSpy).toHaveBeenCalledOnce()
      // Match Text.js canonical wording: deprecation-warnings and
      // app-middleware e2e suites assert on this exact phrase via toContain.
      // See .textjs-ref/packages/text/src/build/index.ts (the Log.warnOnce call
      // adjacent to MIDDLEWARE_FILENAME / PROXY_FILENAME).
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'The "middleware" file convention is deprecated. Please use "proxy" instead.',
        ),
      )
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://textjs.org/docs/messages/middleware-to-proxy'),
      )
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('findMiddlewareFile prefers proxy.ts over middleware.ts (Text.js 16)', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const os = await import('node:os')
    const { findMiddlewareFile } = await import('../src/server/middleware.js')
    const { createValidFileMatcher } = await import('../src/routing/file-matcher.js')

    // Create a temp directory with both proxy.ts and middleware.ts
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'text-proxy-test-'))
    try {
      fs.writeFileSync(path.join(tmpDir, 'proxy.ts'), 'export default function proxy() {}')
      fs.writeFileSync(path.join(tmpDir, 'middleware.ts'), 'export function middleware() {}')
      const result = findMiddlewareFile(tmpDir, createValidFileMatcher())
      expect(result).not.toBeNull()
      expect(result).toContain('proxy.ts')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('findMiddlewareFile finds proxy.js', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const os = await import('node:os')
    const { findMiddlewareFile } = await import('../src/server/middleware.js')
    const { createValidFileMatcher } = await import('../src/routing/file-matcher.js')

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'text-proxy-test-'))
    try {
      fs.writeFileSync(path.join(tmpDir, 'proxy.js'), 'module.exports = function proxy() {}')
      const result = findMiddlewareFile(tmpDir, createValidFileMatcher())
      expect(result).not.toBeNull()
      expect(result).toContain('proxy.js')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})

// ---------------------------------------------------------------------------
// Dev-mode runMiddleware header preservation tests
// Tests that the middleware.ts runner (used by the dev server) preserves
// x-middleware-request-* headers so the caller can unpack them into actual
// request headers. This is the dev/prod parity fix — the production inline
// codegen (pages-server-entry.ts) already preserved them correctly.

describe('runMiddleware preserves x-middleware-request-* headers (dev mode)', () => {
  it('keeps x-middleware-request-* headers on TextResponse.text()', async () => {
    const { runMiddleware } = await import('../src/server/middleware.js')
    const { TextResponse } = await import('../src/shims/server.js')

    // Mock runner that loads a fake middleware module
    const mockRunner = {
      import: async () => ({
        default: () =>
          TextResponse.text({
            request: {
              headers: new Headers({ 'x-custom-injected': 'from-middleware' }),
            },
          }),
        config: { matcher: '/' },
      }),
    }

    const request = new Request('http://localhost/')
    const result = await runMiddleware(mockRunner as any, '/fake/middleware.ts', request)

    expect(result.continue).toBe(true)
    expect(result.responseHeaders).toBeDefined()
    // x-middleware-request-* must survive so the dev server can unpack them
    expect(result.responseHeaders!.get('x-middleware-request-x-custom-injected')).toBe(
      'from-middleware',
    )
    // Other x-middleware-* internal headers must be stripped
    expect(result.responseHeaders!.has('x-middleware-text')).toBe(false)
  })

  it('preserves status from TextResponse.text()', async () => {
    const { runMiddleware } = await import('../src/server/middleware.js')
    const { TextResponse } = await import('../src/shims/server.js')

    const mockRunner = {
      import: async () => ({
        default: () => TextResponse.text({ status: 404 }),
        config: { matcher: '/' },
      }),
    }

    const request = new Request('http://localhost/')
    const result = await runMiddleware(mockRunner as any, '/fake/middleware.ts', request)

    expect(result.continue).toBe(true)
    expect(result.status).toBe(404)
  })

  it('keeps x-middleware-request-* headers on rewrite', async () => {
    const { runMiddleware } = await import('../src/server/middleware.js')
    const { TextResponse } = await import('../src/shims/server.js')

    const mockRunner = {
      import: async () => ({
        default: () => {
          const res = TextResponse.rewrite(new URL('/rewritten', 'http://localhost'))
          // Simulate middleware also setting request headers on a rewrite
          res.headers.set('x-middleware-request-x-auth', 'bearer-token')
          return res
        },
        config: { matcher: '/' },
      }),
    }

    const request = new Request('http://localhost/')
    const result = await runMiddleware(mockRunner as any, '/fake/middleware.ts', request)

    expect(result.continue).toBe(true)
    expect(result.rewriteUrl).toBe('/rewritten')
    expect(result.responseHeaders).toBeDefined()
    expect(result.responseHeaders!.get('x-middleware-request-x-auth')).toBe('bearer-token')
    // x-middleware-rewrite must be stripped
    expect(result.responseHeaders!.has('x-middleware-rewrite')).toBe(false)
  })

  // Ported from Text.js: test/e2e/middleware-rewrites/test/index.test.ts
  // https://github.com/vercel/next.js/blob/canary/test/e2e/middleware-rewrites/test/index.test.ts
  it('preserves the full external URL for middleware rewrites', async () => {
    const { runMiddleware } = await import('../src/server/middleware.js')
    const { TextResponse } = await import('../src/shims/server.js')

    const mockRunner = {
      import: async () => ({
        default: () => TextResponse.rewrite('https://api.example.com/echo?from=middleware'),
        config: { matcher: '/:path*' },
      }),
    }

    const request = new Request('http://localhost/original?keep=1')
    const result = await runMiddleware(mockRunner as any, '/fake/middleware.ts', request)

    expect(result.continue).toBe(true)
    expect(result.rewriteUrl).toBe('https://api.example.com/echo?from=middleware')
  })

  it('strips x-middleware-set-cookie from custom middleware responses', async () => {
    const { runMiddleware } = await import('../src/server/middleware.js')
    const { TextResponse } = await import('../src/shims/server.js')

    const mockRunner = {
      import: async () => ({
        default: () => {
          const res = new TextResponse('blocked', { status: 403 })
          res.cookies.set('blocked', '1', { path: '/' })
          return res
        },
        config: { matcher: '/:path*' },
      }),
    }

    const request = new Request('http://localhost/blocked')
    const result = await runMiddleware(mockRunner as any, '/fake/middleware.ts', request)

    expect(result.continue).toBe(false)
    expect(result.response).toBeDefined()
    expect(result.response!.headers.get('x-middleware-set-cookie')).toBeNull()
    expect(result.response!.headers.get('set-cookie')).toContain('blocked=1')
  })
})

// ---------------------------------------------------------------------------
// Middleware/proxy export validation tests
// Ported from Text.js: test/e2e/app-dir/proxy-missing-export/proxy-missing-export.test.ts
// https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/proxy-missing-export/proxy-missing-export.test.ts
describe('middleware/proxy export validation', () => {
  it('isProxyFile returns true for proxy files', async () => {
    const { isProxyFile } = await import('../src/server/middleware.js')
    expect(isProxyFile('/app/proxy.ts')).toBe(true)
    expect(isProxyFile('/app/proxy.js')).toBe(true)
    expect(isProxyFile('/app/proxy.mjs')).toBe(true)
    expect(isProxyFile('/app/src/proxy.ts')).toBe(true)
  })

  it('isProxyFile returns false for middleware files', async () => {
    const { isProxyFile } = await import('../src/server/middleware.js')
    expect(isProxyFile('/app/middleware.ts')).toBe(false)
    expect(isProxyFile('/app/middleware.js')).toBe(false)
    expect(isProxyFile('/app/middleware.mjs')).toBe(false)
    expect(isProxyFile('/app/src/middleware.ts')).toBe(false)
  })

  it('resolveMiddlewareHandler: proxy.ts with named proxy export', async () => {
    const { resolveMiddlewareHandler } = await import('../src/server/middleware.js')
    const fn = () => {}
    const handler = resolveMiddlewareHandler({ proxy: fn }, '/app/proxy.ts')
    expect(handler).toBe(fn)
  })

  it('resolveMiddlewareHandler: proxy.ts with default export', async () => {
    const { resolveMiddlewareHandler } = await import('../src/server/middleware.js')
    const fn = () => {}
    const handler = resolveMiddlewareHandler({ default: fn }, '/app/proxy.ts')
    expect(handler).toBe(fn)
  })

  it('resolveMiddlewareHandler: proxy.ts prefers named proxy over default', async () => {
    const { resolveMiddlewareHandler } = await import('../src/server/middleware.js')
    const proxyFn = () => {}
    const defaultFn = () => {}
    const handler = resolveMiddlewareHandler(
      { proxy: proxyFn, default: defaultFn },
      '/app/proxy.ts',
    )
    expect(handler).toBe(proxyFn)
  })

  it('resolveMiddlewareHandler: proxy.ts with default arrow function export', async () => {
    const { resolveMiddlewareHandler } = await import('../src/server/middleware.js')
    const fn = () => {}
    const handler = resolveMiddlewareHandler({ default: fn }, '/app/proxy.ts')
    expect(handler).toBe(fn)
  })

  it("resolveMiddlewareHandler: proxy.ts throws when only 'middleware' is exported (wrong name)", async () => {
    const { resolveMiddlewareHandler } = await import('../src/server/middleware.js')
    expect(() => resolveMiddlewareHandler({ middleware: () => {} }, '/app/proxy.ts')).toThrow(
      'must export a function named `proxy` or a `default` function',
    )
  })

  it('resolveMiddlewareHandler: proxy.ts throws when export is aliased to wrong name', async () => {
    const { resolveMiddlewareHandler } = await import('../src/server/middleware.js')
    expect(() => resolveMiddlewareHandler({ handler: () => {} }, '/app/proxy.ts')).toThrow(
      'must export a function named `proxy` or a `default` function',
    )
  })

  it('resolveMiddlewareHandler: proxy.ts throws when no exports', async () => {
    const { resolveMiddlewareHandler } = await import('../src/server/middleware.js')
    expect(() => resolveMiddlewareHandler({}, '/app/proxy.ts')).toThrow(
      'must export a function named `proxy` or a `default` function',
    )
  })

  it('resolveMiddlewareHandler: proxy.ts throws when export is not a function', async () => {
    const { resolveMiddlewareHandler } = await import('../src/server/middleware.js')
    expect(() => resolveMiddlewareHandler({ proxy: 'not a function' }, '/app/proxy.ts')).toThrow(
      'must export a function named `proxy` or a `default` function',
    )
  })

  it('resolveMiddlewareHandler: middleware.ts with named middleware export', async () => {
    const { resolveMiddlewareHandler } = await import('../src/server/middleware.js')
    const fn = () => {}
    const handler = resolveMiddlewareHandler({ middleware: fn }, '/app/middleware.ts')
    expect(handler).toBe(fn)
  })

  it('resolveMiddlewareHandler: middleware.ts with default export', async () => {
    const { resolveMiddlewareHandler } = await import('../src/server/middleware.js')
    const fn = () => {}
    const handler = resolveMiddlewareHandler({ default: fn }, '/app/middleware.ts')
    expect(handler).toBe(fn)
  })

  it("resolveMiddlewareHandler: middleware.ts throws when only 'proxy' is exported (wrong name)", async () => {
    const { resolveMiddlewareHandler } = await import('../src/server/middleware.js')
    expect(() => resolveMiddlewareHandler({ proxy: () => {} }, '/app/middleware.ts')).toThrow(
      'must export a function named `middleware` or a `default` function',
    )
  })

  it('resolveMiddlewareHandler: middleware.ts throws when no exports', async () => {
    const { resolveMiddlewareHandler } = await import('../src/server/middleware.js')
    expect(() => resolveMiddlewareHandler({}, '/app/middleware.ts')).toThrow(
      'must export a function named `middleware` or a `default` function',
    )
  })
})

// ---------------------------------------------------------------------------
// matchPattern / matchesMiddleware unit tests
