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
describe('text/cache shim', () => {
  it('exports revalidateTag, revalidatePath, unstable_cache', async () => {
    const mod = await import('../src/shims/cache.js')
    expect(typeof mod.revalidateTag).toBe('function')
    expect(typeof mod.revalidatePath).toBe('function')
    expect(typeof mod.unstable_cache).toBe('function')
  })

  it('exports setCacheHandler and getCacheHandler', async () => {
    const mod = await import('../src/shims/cache.js')
    expect(typeof mod.setCacheHandler).toBe('function')
    expect(typeof mod.getCacheHandler).toBe('function')
  })

  it('default handler is MemoryCacheHandler', async () => {
    const { getCacheHandler, MemoryCacheHandler } = await import('../src/shims/cache.js')
    const handler = getCacheHandler()
    expect(handler).toBeInstanceOf(MemoryCacheHandler)
  })

  it('unstable_cache caches function results', async () => {
    const { unstable_cache, setCacheHandler, MemoryCacheHandler } =
      await import('../src/shims/cache.js')

    // Fresh handler for isolation
    setCacheHandler(new MemoryCacheHandler())

    let callCount = 0
    const expensive = async (x: number) => {
      callCount++
      return x * 2
    }

    const cached = unstable_cache(expensive, ['test-fn'], {
      tags: ['test-tag'],
    })

    const r1 = await cached(5)
    expect(r1).toBe(10)
    expect(callCount).toBe(1)

    const r2 = await cached(5)
    expect(r2).toBe(10)
    expect(callCount).toBe(1) // Should NOT call the function again

    const r3 = await cached(10)
    expect(r3).toBe(20)
    expect(callCount).toBe(2) // Different args = different cache key

    // Reset
    setCacheHandler(new MemoryCacheHandler())
  })

  it('unstable_cache caches undefined results', async () => {
    const { unstable_cache, setCacheHandler, MemoryCacheHandler } =
      await import('../src/shims/cache.js')

    setCacheHandler(new MemoryCacheHandler())

    let callCount = 0
    const cached = unstable_cache(async () => {
      callCount++
      return undefined
    }, ['undefined-result-test'])

    await expect(cached()).resolves.toBeUndefined()
    expect(callCount).toBe(1)

    await expect(cached()).resolves.toBeUndefined()
    expect(callCount).toBe(1)

    setCacheHandler(new MemoryCacheHandler())
  })

  it('revalidateTag invalidates cached entries', async () => {
    const { unstable_cache, revalidateTag, setCacheHandler, MemoryCacheHandler } =
      await import('../src/shims/cache.js')

    setCacheHandler(new MemoryCacheHandler())

    let callCount = 0
    const fn = async () => {
      callCount++
      return 'result-' + callCount
    }

    const cached = unstable_cache(fn, ['revalidate-test'], {
      tags: ['my-tag'],
    })

    const r1 = await cached()
    expect(r1).toBe('result-1')
    expect(callCount).toBe(1)

    // Revalidate the tag
    await revalidateTag('my-tag')

    // Text call should re-execute the function
    const r2 = await cached()
    expect(r2).toBe('result-2')
    expect(callCount).toBe(2)

    // Reset
    setCacheHandler(new MemoryCacheHandler())
  })

  it('revalidateTag accepts optional cacheLife profile (Text.js 16)', async () => {
    const { revalidateTag, setCacheHandler, MemoryCacheHandler } =
      await import('../src/shims/cache.js')

    setCacheHandler(new MemoryCacheHandler())

    // Should not throw with profile argument
    await revalidateTag('my-tag', 'max')
    await revalidateTag('my-tag', 'hours')
    await revalidateTag('my-tag', { expire: 3600 })

    // Should still work without profile (deprecated single-arg form)
    await revalidateTag('my-tag')

    setCacheHandler(new MemoryCacheHandler())
  })

  it('exports updateTag function (Text.js 16)', async () => {
    const mod = await import('../src/shims/cache.js')
    expect(typeof mod.updateTag).toBe('function')
  })

  it('updateTag invalidates cached entries', async () => {
    const { unstable_cache, updateTag, setCacheHandler, MemoryCacheHandler } =
      await import('../src/shims/cache.js')

    setCacheHandler(new MemoryCacheHandler())

    let callCount = 0
    const fn = async () => {
      callCount++
      return 'result-' + callCount
    }

    const cached = unstable_cache(fn, ['update-tag-test'], {
      tags: ['user-1'],
    })

    const r1 = await cached()
    expect(r1).toBe('result-1')

    // updateTag expires the cache
    await updateTag('user-1')

    const r2 = await cached()
    expect(r2).toBe('result-2')
    expect(callCount).toBe(2)

    setCacheHandler(new MemoryCacheHandler())
  })

  it('exports refresh function (Text.js 16)', async () => {
    const mod = await import('../src/shims/cache.js')
    expect(typeof mod.refresh).toBe('function')
    // refresh() is a no-op on the server but should not throw
    mod.refresh()
  })

  // Ported from Text.js: packages/text/src/client/request/io.browser.ts
  // https://github.com/vercel/next.js/blob/canary/packages/text/src/client/request/io.browser.ts
  it('exports io function', async () => {
    const mod = await import('../src/shims/cache.js')
    expect(typeof mod.io).toBe('function')
  })

  it('io returns a resolved promise', async () => {
    const { io } = await import('../src/shims/cache.js')
    const result = io()
    expect(result).toBeInstanceOf(Promise)
    expect((result as any).status).toBe('fulfilled')
    expect((result as any).value).toBeUndefined()
    await expect(result).resolves.toBeUndefined()
  })

  it('io returns same instance (singleton)', async () => {
    const { io } = await import('../src/shims/cache.js')
    const r1 = io()
    const r2 = io()
    expect(r1).toBe(r2)
  })

  // Ported from Text.js: packages/text/src/server/request/io.ts
  // https://github.com/vercel/next.js/blob/canary/packages/text/src/server/request/io.ts
  it('io returns a hanging promise during prerender', async () => {
    const { io } = await import('../src/shims/cache.js')
    const { workUnitAsyncStorage } =
      await import('../src/shims/internal/work-unit-async-storage.js')

    const controller = new AbortController()

    // run() returns whatever the callback returns — a hanging promise.
    const hanging = workUnitAsyncStorage.run(
      { type: 'prerender', renderSignal: controller.signal },
      io,
    )

    // The promise should not be resolved or rejected (it's "hanging")
    expect(hanging).toBeInstanceOf(Promise)

    // Verify it's still hanging using Promise.race (more portable than V8 internals)
    const result = await Promise.race([
      hanging.then(() => 'resolved'),
      new Promise(r => setTimeout(() => r('still-hanging'), 50)),
    ])
    expect(result).toBe('still-hanging')

    // Clean up by aborting the signal
    controller.abort()
  })

  it('io resolves immediately with request store', async () => {
    const { io } = await import('../src/shims/cache.js')
    const { workUnitAsyncStorage } =
      await import('../src/shims/internal/work-unit-async-storage.js')

    const promise = workUnitAsyncStorage.run({ type: 'request' }, io)

    expect(promise).toBeInstanceOf(Promise)
    await expect(promise).resolves.toBeUndefined()
  })

  it('io resolves immediately with cache store', async () => {
    const { io } = await import('../src/shims/cache.js')
    const { workUnitAsyncStorage } =
      await import('../src/shims/internal/work-unit-async-storage.js')

    const promise = workUnitAsyncStorage.run({ type: 'cache' }, io)

    expect(promise).toBeInstanceOf(Promise)
    await expect(promise).resolves.toBeUndefined()
  })

  it('io rejects hanging promise on abort when prerendering', async () => {
    const { io } = await import('../src/shims/cache.js')
    const { workUnitAsyncStorage } =
      await import('../src/shims/internal/work-unit-async-storage.js')

    const controller = new AbortController()

    const hanging = workUnitAsyncStorage.run(
      { type: 'prerender', renderSignal: controller.signal },
      io,
    )

    expect(hanging).toBeInstanceOf(Promise)

    // Abort the signal — the hanging promise should reject
    controller.abort()
    await expect(hanging).rejects.toThrow(/`io\(\)`/)
  })

  it('io returns rejected promise when signal already aborted', async () => {
    const { io } = await import('../src/shims/cache.js')
    const { workUnitAsyncStorage } =
      await import('../src/shims/internal/work-unit-async-storage.js')

    const controller = new AbortController()
    controller.abort() // already aborted

    const promise = workUnitAsyncStorage.run(
      { type: 'prerender', renderSignal: controller.signal },
      io,
    )

    await expect(promise).rejects.toThrow(/prerendering/i)
  })

  it('io does not emit unhandled rejection when signal already aborted', async () => {
    const { io } = await import('../src/shims/cache.js')
    const { workUnitAsyncStorage } =
      await import('../src/shims/internal/work-unit-async-storage.js')

    const unhandledRejections: unknown[] = []
    const onUnhandledRejection = (reason: unknown) => {
      unhandledRejections.push(reason)
    }
    process.on('unhandledRejection', onUnhandledRejection)

    try {
      const controller = new AbortController()
      controller.abort() // already aborted

      const promise = workUnitAsyncStorage.run(
        { type: 'prerender', renderSignal: controller.signal, route: '/test' },
        io,
      )

      // Wait a tick for potential unhandled rejection to be detected
      await new Promise(resolve => setTimeout(resolve, 10))

      // Await the promise to handle the rejection
      try {
        await promise
      } catch {
        // expected
      }

      expect(unhandledRejections.length).toBe(0)
    } finally {
      process.off('unhandledRejection', onUnhandledRejection)
    }
  })

  it('unstable_io is exported as a deprecation alias for io', async () => {
    const mod = await import('../src/shims/cache.js')
    expect(typeof mod.unstable_io).toBe('function')

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const result = mod.unstable_io()
      expect(result).toBeInstanceOf(Promise)
      await expect(result).resolves.toBeUndefined()
      // Warning fires at most once per process; at least one call must mention deprecation.
      const warned = warn.mock.calls.some(args => String(args[0] ?? '').includes('unstable_io'))
      expect(warned).toBe(true)
    } finally {
      warn.mockRestore()
    }
  })

  it('setCacheHandler swaps the active handler', async () => {
    const { setCacheHandler, getCacheHandler, unstable_cache } =
      await import('../src/shims/cache.js')

    // Create a custom handler that tracks calls
    const calls: string[] = []
    const customHandler = {
      async get(key: string) {
        calls.push(`get:${key}`)
        return null
      },
      async set(key: string) {
        calls.push(`set:${key}`)
      },
      async revalidateTag(tags: string | string[]) {
        const tagList = Array.isArray(tags) ? tags : [tags]
        calls.push(`revalidateTag:${tagList.join(',')}`)
      },
      resetRequestCache() {
        calls.push('reset')
      },
    }

    const originalHandler = getCacheHandler()
    setCacheHandler(customHandler)

    const cached = unstable_cache(async () => 42, ['custom-test'])
    await cached()

    expect(calls.some(c => c.startsWith('get:'))).toBe(true)
    expect(calls.some(c => c.startsWith('set:'))).toBe(true)

    // Restore
    setCacheHandler(originalHandler)
  })

  it('MemoryCacheHandler.get/set round-trips values', async () => {
    const { MemoryCacheHandler } = await import('../src/shims/cache.js')

    const handler = new MemoryCacheHandler()

    await handler.set('test-key', {
      kind: 'FETCH',
      data: { headers: {}, body: '{"x":1}', url: 'test' },
      tags: ['t1'],
      revalidate: 3600,
    })

    const result = await handler.get('test-key')
    expect(result).not.toBeNull()
    expect(result!.value).not.toBeNull()
    expect(result!.value!.kind).toBe('FETCH')
    if (result!.value!.kind === 'FETCH') {
      expect(result!.value!.data.body).toBe('{"x":1}')
    }
  })

  it('MemoryCacheHandler respects tag invalidation', async () => {
    const { MemoryCacheHandler } = await import('../src/shims/cache.js')

    const handler = new MemoryCacheHandler()

    await handler.set(
      'tagged-entry',
      {
        kind: 'FETCH',
        data: { headers: {}, body: '"cached"', url: 'test' },
        tags: ['fresh-tag'],
        revalidate: 3600,
      },
      { tags: ['fresh-tag'] },
    )

    // Should return the entry
    let result = await handler.get('tagged-entry')
    expect(result).not.toBeNull()

    // Invalidate the tag
    await handler.revalidateTag('fresh-tag')

    // Should now return null (invalidated)
    result = await handler.get('tagged-entry')
    expect(result).toBeNull()
  })

  it('exports unstable_noStore and noStore as no-ops', async () => {
    const { unstable_noStore, noStore } = await import('../src/shims/cache.js')
    expect(typeof unstable_noStore).toBe('function')
    expect(typeof noStore).toBe('function')
    // Both should run without throwing
    expect(() => unstable_noStore()).not.toThrow()
    expect(() => noStore()).not.toThrow()
  })

  it('exports cacheLife with built-in profiles', async () => {
    const { cacheLife, cacheLifeProfiles } = await import('../src/shims/cache.js')
    expect(typeof cacheLife).toBe('function')
    expect(typeof cacheLifeProfiles).toBe('object')

    // Built-in profiles should exist
    expect(cacheLifeProfiles).toHaveProperty('default')
    expect(cacheLifeProfiles).toHaveProperty('seconds')
    expect(cacheLifeProfiles).toHaveProperty('minutes')
    expect(cacheLifeProfiles).toHaveProperty('hours')
    expect(cacheLifeProfiles).toHaveProperty('days')
    expect(cacheLifeProfiles).toHaveProperty('weeks')
    expect(cacheLifeProfiles).toHaveProperty('max')

    // Profile shapes
    expect(cacheLifeProfiles.seconds).toEqual({ stale: 30, revalidate: 1, expire: 60 })
    expect(cacheLifeProfiles.max).toEqual({ stale: 300, revalidate: 2592000, expire: 31536000 })

    // Should run without throwing with valid inputs
    expect(() => cacheLife('default')).not.toThrow()
    expect(() => cacheLife('hours')).not.toThrow()
    expect(() => cacheLife({ stale: 60, revalidate: 300, expire: 3600 })).not.toThrow()
  })

  it('cacheLife warns on unknown profile', async () => {
    const { cacheLife } = await import('../src/shims/cache.js')
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    cacheLife('nonexistent-profile')
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('unknown profile'))
    consoleWarn.mockRestore()
  })

  it('cacheLife warns when expire < revalidate', async () => {
    const { cacheLife } = await import('../src/shims/cache.js')
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    cacheLife({ revalidate: 3600, expire: 60 })
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('expire must be >= revalidate'),
    )
    consoleWarn.mockRestore()
  })

  it('cacheLife inline configs inherit default profile values for omitted fields', async () => {
    const {
      cacheLife,
      _consumeRequestScopedCacheLife,
      _peekRequestScopedCacheLife,
      _runWithCacheState,
    } = await import('../src/shims/cache.js')

    await _runWithCacheState(async () => {
      cacheLife({ expire: 60 })

      expect(_peekRequestScopedCacheLife()).toEqual({
        revalidate: 900,
        expire: 60,
      })
      expect(_consumeRequestScopedCacheLife()).toEqual({
        revalidate: 900,
        expire: 60,
      })
      expect(_peekRequestScopedCacheLife()).toBeNull()
    })
  })

  it('exports cacheTag as a no-op function', async () => {
    const { cacheTag } = await import('../src/shims/cache.js')
    expect(typeof cacheTag).toBe('function')
    // Should accept multiple tags without throwing
    expect(() => cacheTag('tag1', 'tag2', 'tag3')).not.toThrow()
  })

  // Ported from Text.js: test/e2e/app-dir/cache-components-errors/cache-components-unstable-deprecations.test.ts
  // https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/cache-components-errors/cache-components-unstable-deprecations.test.ts
  it('unstable_cacheLife is exported as a deprecation alias for cacheLife', async () => {
    const mod = await import('../src/shims/cache.js')
    expect(typeof mod.unstable_cacheLife).toBe('function')

    // Matches the cacheLife signature: accepts a profile name or an inline config.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => mod.unstable_cacheLife('hours')).not.toThrow()
      expect(() =>
        mod.unstable_cacheLife({ stale: 60, revalidate: 300, expire: 3600 }),
      ).not.toThrow()

      // Text.js asserts CLI output contains "Error: `unstable_cacheLife` was recently stabilized".
      // That string comes from console.error(new Error(...)) — match the same surface here.
      const warned = error.mock.calls.some(args => {
        const msg = args[0]
        const text = msg instanceof Error ? msg.message : String(msg ?? '')
        return text.includes('`unstable_cacheLife` was recently stabilized')
      })
      expect(warned).toBe(true)
    } finally {
      error.mockRestore()
    }
  })

  it('unstable_cacheTag is exported as a deprecation alias for cacheTag', async () => {
    const mod = await import('../src/shims/cache.js')
    expect(typeof mod.unstable_cacheTag).toBe('function')

    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      // Matches the cacheTag signature: variadic string tags. Outside a "use cache"
      // scope this is a no-op (same as cacheTag).
      expect(() => mod.unstable_cacheTag('tag1', 'tag2', 'tag3')).not.toThrow()

      const warned = error.mock.calls.some(args => {
        const msg = args[0]
        const text = msg instanceof Error ? msg.message : String(msg ?? '')
        return text.includes('`unstable_cacheTag` was recently stabilized')
      })
      expect(warned).toBe(true)
    } finally {
      error.mockRestore()
    }
  })

  it('unstable_cache re-fetches when entry is stale (time-expired)', async () => {
    const { unstable_cache, setCacheHandler, MemoryCacheHandler } =
      await import('../src/shims/cache.js')

    setCacheHandler(new MemoryCacheHandler())

    let callCount = 0
    const fn = async () => {
      callCount++
      return 'value-' + callCount
    }

    // Use a very short revalidate (1 second)
    const cached = unstable_cache(fn, ['stale-test'], {
      revalidate: 1,
    })

    const r1 = await cached()
    expect(r1).toBe('value-1')
    expect(callCount).toBe(1)

    // Cached call should still return the same value
    const r2 = await cached()
    expect(r2).toBe('value-1')
    expect(callCount).toBe(1)

    // Manually expire the entry by advancing time past revalidate window.
    // We do this by patching the entry's revalidateAt in the handler.
    const handler = (await import('../src/shims/cache.js')).getCacheHandler()
    const store = (handler as any).store as Map<string, any>
    for (const [, entry] of store) {
      if (entry.revalidateAt) {
        entry.revalidateAt = Date.now() - 1000 // expired 1 second ago
      }
    }

    // Text call should re-fetch because entry is now stale
    const r3 = await cached()
    expect(r3).toBe('value-2')
    expect(callCount).toBe(2)

    setCacheHandler(new MemoryCacheHandler())
  })

  it('unstable_cache serves stale entries and refreshes them in the background during App Router requests', async () => {
    const { unstable_cache, setCacheHandler, MemoryCacheHandler } =
      await import('../src/shims/cache.js')
    const { createRequestContext, runWithRequestContext } =
      await import('../src/shims/unified-request-context.js')

    const waitUntilPromises: Promise<unknown>[] = []
    const setBodies: string[] = []
    let callCount = 0

    const handler: CacheHandler = {
      async get(): Promise<CacheHandlerValue> {
        return {
          lastModified: Date.now() - 2_000,
          cacheState: 'stale',
          value: {
            kind: 'FETCH',
            data: {
              headers: {},
              body: JSON.stringify({ v: 'stale-value' }),
              url: 'unstable_cache:stale-swr-test:[]',
            },
            tags: ['stale-swr'],
            revalidate: 1,
          },
        }
      },
      async set(_key: string, data: IncrementalCacheValue | null) {
        if (data?.kind === 'FETCH') {
          setBodies.push(data.data.body)
        }
      },
      async revalidateTag(_tags: string | string[]) {},
    }

    setCacheHandler(handler)

    const cached = unstable_cache(
      async () => {
        callCount++
        await new Promise(resolve => setTimeout(resolve, 50))
        return 'fresh-value'
      },
      ['stale-swr-test'],
      { tags: ['stale-swr'], revalidate: 1 },
    )

    // Matches Text.js App Router semantics: stale entries schedule a
    // pending revalidate and return the stale response immediately.
    // Source: https://github.com/vercel/next.js/blob/canary/packages/text/src/server/web/spec-extension/unstable-cache.ts
    const requestContext = createRequestContext({
      unstableCacheRevalidation: 'background',
      executionContext: {
        waitUntil(promise) {
          waitUntilPromises.push(promise)
        },
      },
    })

    try {
      const result = await Promise.race([
        runWithRequestContext(requestContext, () => cached()),
        new Promise(resolve => setTimeout(() => resolve('blocked'), 10)),
      ])

      expect(result).toBe('stale-value')
      expect(callCount).toBe(1)
      expect(waitUntilPromises).toHaveLength(1)
      expect(setBodies).toEqual([])

      await Promise.all(waitUntilPromises)

      expect(setBodies).toEqual([JSON.stringify({ v: 'fresh-value' })])
    } finally {
      setCacheHandler(new MemoryCacheHandler())
    }
  })

  it('unstable_cache blocks on stale entries inside revalidation scopes', async () => {
    const { unstable_cache, setCacheHandler, MemoryCacheHandler } =
      await import('../src/shims/cache.js')
    const { createRequestContext, runWithRequestContext } =
      await import('../src/shims/unified-request-context.js')

    let callCount = 0
    const handler: CacheHandler = {
      async get(): Promise<CacheHandlerValue> {
        return {
          lastModified: Date.now() - 2_000,
          cacheState: 'stale',
          value: {
            kind: 'FETCH',
            data: {
              headers: {},
              body: JSON.stringify({ v: 'stale-value' }),
              url: 'unstable_cache:foreground-test:[]',
            },
            tags: ['foreground'],
            revalidate: 1,
          },
        }
      },
      async set() {},
      async revalidateTag(_tags: string | string[]) {},
    }

    setCacheHandler(handler)

    const cached = unstable_cache(
      async () => {
        callCount++
        return 'fresh-value'
      },
      ['foreground-test'],
      { tags: ['foreground'], revalidate: 1 },
    )

    // Text.js foreground-revalidates stale unstable_cache entries while
    // regenerating a static/ISR page so the regenerated page stores fresh data.
    // Source test: https://github.com/vercel/next.js/blob/canary/test/production/app-dir/unstable-cache-foreground-revalidate/unstable-cache-foreground-revalidate.test.ts
    const requestContext = createRequestContext({
      unstableCacheRevalidation: 'foreground',
    })

    try {
      await expect(runWithRequestContext(requestContext, () => cached())).resolves.toBe(
        'fresh-value',
      )
      expect(callCount).toBe(1)
    } finally {
      setCacheHandler(new MemoryCacheHandler())
    }
  })

  it('unstable_cache with no revalidate option caches indefinitely', async () => {
    const { unstable_cache, setCacheHandler, MemoryCacheHandler } =
      await import('../src/shims/cache.js')

    setCacheHandler(new MemoryCacheHandler())

    let callCount = 0
    const fn = async () => {
      callCount++
      return 'result-' + callCount
    }

    // No revalidate option (should cache indefinitely, not expire at t=0)
    const cached = unstable_cache(fn, ['no-revalidate-test'])

    const r1 = await cached()
    expect(r1).toBe('result-1')
    expect(callCount).toBe(1)

    // Should return cached value (not re-fetch)
    const r2 = await cached()
    expect(r2).toBe('result-1')
    expect(callCount).toBe(1)

    // Even after "time passes", should still be cached (not stale)
    const handler = (await import('../src/shims/cache.js')).getCacheHandler()
    const store = (handler as any).store as Map<string, any>
    for (const [, entry] of store) {
      // revalidateAt should be null (indefinite) not 0 or past timestamp
      expect(entry.revalidateAt).toBeNull()
    }

    setCacheHandler(new MemoryCacheHandler())
  })
})

// ---------------------------------------------------------------------------
// "use cache" runtime tests
// ---------------------------------------------------------------------------
