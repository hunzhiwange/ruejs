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
import Document from '../src/shims/document.js?text-ssr'

describe('text/document default export', () => {
  it('provides the class contract required by custom Documents', () => {
    expect(typeof Document.prototype.render).toBe('function')

    class MyDocument extends Document {}

    expect(new MyDocument()).toBeInstanceOf(Document)
  })
})

const FIXTURE_DIR = PAGES_FIXTURE_DIR
describe('text/dist/* internal import shims', () => {
  it('app-router-context exports AppRouterContext and types', async () => {
    const mod = await import('../src/shims/internal/app-router-context.js')
    expect(mod.AppRouterContext).toBeDefined()
    expect(mod.GlobalLayoutRouterContext).toBeDefined()
    expect(mod.LayoutRouterContext).toBeDefined()
    expect(mod.MissingSlotContext).toBeDefined()
    expect(mod.TemplateContext).toBeDefined()
  })

  it('app-router-context imports when Rue createContext is unavailable', async () => {
    vi.resetModules()
    vi.doMock('@rue-js/rue', async importOriginal => {
      const actual = await importOriginal<typeof import('@rue-js/rue')>()
      return { ...actual, createContext: undefined }
    })

    try {
      const mod = await import('../src/shims/internal/app-router-context.js')
      expect(mod.AppRouterContext).toBeDefined()
      expect(mod.GlobalLayoutRouterContext).toBeDefined()
      expect(mod.LayoutRouterContext).toBeDefined()
      expect(mod.MissingSlotContext).toBeDefined()
      expect(mod.TemplateContext).toBeDefined()
    } finally {
      vi.doUnmock('@rue-js/rue')
      vi.resetModules()
    }
  })

  it('utils exports TEXT_DATA type helpers', async () => {
    const mod = await import('../src/shims/internal/utils.js')
    expect(typeof mod.execOnce).toBe('function')
    expect(typeof mod.getLocationOrigin).toBe('function')
    expect(typeof mod.getURL).toBe('function')

    // execOnce should only call the function once
    let count = 0
    const fn = mod.execOnce(() => ++count)
    fn()
    fn()
    fn()
    expect(count).toBe(1)
  })

  it('api-utils exports TextApiRequestCookies type', async () => {
    // This module is primarily type-only, but should resolve without errors
    const mod = await import('../src/shims/internal/api-utils.js')
    expect(mod).toBeDefined()
  })

  it('cookies shim re-exports RequestCookies and ResponseCookies', async () => {
    const mod = await import('../src/shims/internal/cookies.js')
    expect(mod.RequestCookies).toBeDefined()
    expect(mod.ResponseCookies).toBeDefined()
  })

  it('work-unit-async-storage exports AsyncLocalStorage instances', async () => {
    const mod = await import('../src/shims/internal/work-unit-async-storage.js')
    expect(mod.workUnitAsyncStorage).toBeDefined()
    expect(mod.requestAsyncStorage).toBeDefined()
    // Both should be the same AsyncLocalStorage instance
    expect(mod.workUnitAsyncStorage).toBe(mod.requestAsyncStorage)
  })

  it('router-context provides and reads the mounted router value', async () => {
    const mod = await import('../src/shims/internal/router-context.js')
    const { useTextCompatContext } = await import('../src/shims/context-adapter.js')
    const router: TextRouter = {
      pathname: '/context',
      route: '/context',
      query: {},
      asPath: '/context',
      basePath: '',
      isReady: true,
      isPreview: false,
      isFallback: false,
      push: async () => true,
      replace: async () => true,
      back() {},
      reload() {},
      prefetch: async () => {},
      beforePopState() {},
      events: {
        on() {},
        off() {},
        emit() {},
      },
    }
    let received: TextRouter | null = null

    function Probe() {
      received = useTextCompatContext(mod.RouterContext)
      return createElement('span', null, 'ok')
    }

    await renderAppServerElementToHtml(
      createElement(mod.RouterContext.Provider, { value: router }, createElement(Probe)),
    )

    expect(received).toBe(router)
  })
})

// ---------------------------------------------------------------------------
// Cloudflare KV CacheHandler
// ---------------------------------------------------------------------------

describe('KVCacheHandler', () => {
  // In-memory mock of Cloudflare KV namespace
  function createMockKV() {
    const store = new Map<string, { value: string; expirationTtl?: number }>()
    return {
      store,
      async get(key: string): Promise<string | null> {
        return store.get(key)?.value ?? null
      },
      async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
        store.set(key, { value, expirationTtl: options?.expirationTtl })
      },
      async delete(key: string): Promise<void> {
        store.delete(key)
      },
      async list(options?: { prefix?: string; limit?: number; cursor?: string }) {
        const prefix = options?.prefix ?? ''
        const keys: Array<{ name: string }> = []
        for (const k of store.keys()) {
          if (k.startsWith(prefix)) keys.push({ name: k })
        }
        return { keys, list_complete: true }
      },
    }
  }

  it('stores and retrieves a cache entry', async () => {
    const { KVCacheHandler } = await import('../src/cloudflare/kv-cache-handler.js')
    const kv = createMockKV()
    const handler = new KVCacheHandler(kv as any)

    await handler.set('test-key', {
      kind: 'PAGES',
      html: '<h1>Hello</h1>',
      pageData: { props: {} },
      headers: undefined,
      status: 200,
    })

    const result = await handler.get('test-key')
    expect(result).not.toBeNull()
    expect(result!.value).not.toBeNull()
    expect(result!.value!.kind).toBe('PAGES')
    if (result!.value!.kind === 'PAGES') {
      expect(result!.value!.html).toBe('<h1>Hello</h1>')
      expect(result!.value!.status).toBe(200)
    }
  })

  it('returns null for missing keys', async () => {
    const { KVCacheHandler } = await import('../src/cloudflare/kv-cache-handler.js')
    const kv = createMockKV()
    const handler = new KVCacheHandler(kv as any)

    const result = await handler.get('nonexistent')
    expect(result).toBeNull()
  })

  it('handles tag-based invalidation', async () => {
    const { KVCacheHandler } = await import('../src/cloudflare/kv-cache-handler.js')
    const kv = createMockKV()
    const handler = new KVCacheHandler(kv as any)

    await handler.set(
      'tagged-entry',
      {
        kind: 'FETCH',
        data: { headers: {}, body: '{"result":1}', url: 'test' },
        tags: ['my-tag'],
        revalidate: 60,
      },
      { revalidate: 60, tags: ['my-tag'] },
    )

    // Before invalidation — entry exists
    const before = await handler.get('tagged-entry')
    expect(before).not.toBeNull()

    // Invalidate the tag
    await handler.revalidateTag('my-tag')

    // After invalidation — entry should be treated as miss
    const after = await handler.get('tagged-entry')
    expect(after).toBeNull()
  })

  it('returns stale entry when past revalidation time', async () => {
    const { KVCacheHandler } = await import('../src/cloudflare/kv-cache-handler.js')
    const kv = createMockKV()
    const handler = new KVCacheHandler(kv as any)

    // Set with very short revalidation (already expired)
    await handler.set(
      'stale-key',
      {
        kind: 'PAGES',
        html: '<h1>Stale</h1>',
        pageData: {},
        headers: undefined,
        status: 200,
      },
      { revalidate: -1 }, // already past
    )

    // Manually fix the revalidateAt to be in the past
    const raw = await kv.get('cache:stale-key')
    const entry = JSON.parse(raw!)
    entry.revalidateAt = Date.now() - 1000
    await kv.put('cache:stale-key', JSON.stringify(entry))

    const result = await handler.get('stale-key')
    expect(result).not.toBeNull()
    expect(result!.cacheState).toBe('stale')
    expect(result!.value!.kind).toBe('PAGES')
  })

  it('serializes and restores APP_PAGE with rscData ArrayBuffer', async () => {
    const { KVCacheHandler } = await import('../src/cloudflare/kv-cache-handler.js')
    const kv = createMockKV()
    const handler = new KVCacheHandler(kv as any)

    const originalData = new TextEncoder().encode('RSC payload data')

    await handler.set('app-page-key', {
      kind: 'APP_PAGE',
      html: '<div>App page</div>',
      rscData: originalData.buffer as ArrayBuffer,
      headers: { 'x-custom': 'value' },
      postponed: undefined,
      status: 200,
    })

    const result = await handler.get('app-page-key')
    expect(result).not.toBeNull()
    expect(result!.value!.kind).toBe('APP_PAGE')
    if (result!.value!.kind === 'APP_PAGE') {
      expect(result!.value!.html).toBe('<div>App page</div>')
      // rscData should be restored as ArrayBuffer
      expect(result!.value!.rscData).toBeInstanceOf(ArrayBuffer)
      const restored = new TextDecoder().decode(result!.value!.rscData!)
      expect(restored).toBe('RSC payload data')
    }
  })

  it('serializes and restores APP_ROUTE with body ArrayBuffer', async () => {
    const { KVCacheHandler } = await import('../src/cloudflare/kv-cache-handler.js')
    const kv = createMockKV()
    const handler = new KVCacheHandler(kv as any)

    const body = new TextEncoder().encode('{"ok":true}')

    await handler.set('route-key', {
      kind: 'APP_ROUTE',
      body: body.buffer as ArrayBuffer,
      status: 200,
      headers: { 'content-type': 'application/json' },
    })

    const result = await handler.get('route-key')
    expect(result).not.toBeNull()
    if (result!.value!.kind === 'APP_ROUTE') {
      const restored = new TextDecoder().decode(result!.value!.body)
      expect(restored).toBe('{"ok":true}')
    }
  })

  it('sets KV expiration TTL based on revalidation period', async () => {
    const { KVCacheHandler } = await import('../src/cloudflare/kv-cache-handler.js')
    const kv = createMockKV()
    const handler = new KVCacheHandler(kv as any)

    await handler.set(
      'ttl-key',
      {
        kind: 'PAGES',
        html: '<h1>TTL</h1>',
        pageData: {},
        headers: undefined,
        status: 200,
      },
      { revalidate: 60 }, // 60 seconds
    )

    // The KV entry should have an expiration TTL set
    const stored = kv.store.get('cache:ttl-key')
    expect(stored).toBeDefined()
    expect(stored!.expirationTtl).toBeDefined()
    // KV TTL is always 30 days (2592000s) regardless of revalidation period.
    // Staleness is tracked via revalidateAt in the stored JSON, not KV eviction.
    // Tying TTL to revalidation period would cause frequently-revalidated pages
    // (e.g. revalidate=5) to be evicted quickly under low traffic, forcing a
    // blocking fresh render on the text request instead of serving stale content.
    expect(stored!.expirationTtl).toBe(30 * 24 * 3600)
  })

  it('handles multiple tag invalidation in parallel', async () => {
    const { KVCacheHandler } = await import('../src/cloudflare/kv-cache-handler.js')
    const kv = createMockKV()
    const handler = new KVCacheHandler(kv as any)

    await handler.set(
      'multi-tag',
      {
        kind: 'FETCH',
        data: { headers: {}, body: '{}', url: 'test' },
        tags: ['tag-a', 'tag-b'],
        revalidate: 0,
      },
      { tags: ['tag-a', 'tag-b'] },
    )

    // Invalidate both tags at once
    await handler.revalidateTag(['tag-a', 'tag-b'])

    const result = await handler.get('multi-tag')
    expect(result).toBeNull()
  })

  it('handles corrupted KV entries gracefully', async () => {
    const { KVCacheHandler } = await import('../src/cloudflare/kv-cache-handler.js')
    const kv = createMockKV()
    const handler = new KVCacheHandler(kv as any)

    // Put corrupted data directly
    await kv.put('cache:corrupt-key', 'not valid json {{{')

    const result = await handler.get('corrupt-key')
    expect(result).toBeNull()
    // The corrupted entry should be cleaned up
    expect(await kv.get('cache:corrupt-key')).toBeNull()
  })
})

// ─── server-only / client-only shims ─────────────────────────────────────────

describe('server-only shim', () => {
  it('can be imported without error', async () => {
    const mod = await import('../src/shims/server-only.js')
    expect(mod).toBeDefined()
  })

  it('exports nothing (empty marker module)', async () => {
    const mod = await import('../src/shims/server-only.js')
    // The module should have no named exports (just the default module namespace)
    const keys = Object.keys(mod).filter(k => k !== '__esModule' && k !== 'default')
    expect(keys).toHaveLength(0)
  })
})

describe('client-only shim', () => {
  it('can be imported without error', async () => {
    const mod = await import('../src/shims/client-only.js')
    expect(mod).toBeDefined()
  })

  it('exports nothing (empty marker module)', async () => {
    const mod = await import('../src/shims/client-only.js')
    const keys = Object.keys(mod).filter(k => k !== '__esModule' && k !== 'default')
    expect(keys).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// text/link — onNavigate / NavigateEvent (View Transitions support, Issue #38)
// ---------------------------------------------------------------------------

describe('text/link onNavigate / NavigateEvent', () => {
  it('exports Link as default and useLinkStatus as named export', async () => {
    const mod = await import('../src/shims/link.js')
    expect(typeof mod.default).toBe('function')
    expect(typeof mod.useLinkStatus).toBe('function')
  })

  it('NavigateEvent.preventDefault() sets defaultPrevented to true', () => {
    // Mirrors the NavigateEvent construction in the Link click handler
    let prevented = false
    const navEvent = {
      url: new URL('/about', 'http://localhost'),
      preventDefault() {
        prevented = true
      },
      get defaultPrevented() {
        return prevented
      },
    }

    expect(navEvent.defaultPrevented).toBe(false)
    navEvent.preventDefault()
    expect(navEvent.defaultPrevented).toBe(true)
  })

  it('NavigateEvent.defaultPrevented is false when preventDefault is not called', () => {
    let prevented = false
    const navEvent = {
      url: new URL('/products/1', 'http://localhost'),
      preventDefault() {
        prevented = true
      },
      get defaultPrevented() {
        return prevented
      },
    }

    expect(navEvent.defaultPrevented).toBe(false)
    expect(navEvent.url.pathname).toBe('/products/1')
  })

  it('onNavigate callback receives event with correct url', () => {
    // Simulate what the Link component does in its click handler
    const resolvedHref = '/view-transitions/posts/42'
    const navUrl = new URL(resolvedHref, 'http://localhost:3000')

    let prevented = false
    const navEvent = {
      url: navUrl,
      preventDefault() {
        prevented = true
      },
      get defaultPrevented() {
        return prevented
      },
    }

    // Simulated TransitionLink-style callback
    const onNavigate = (event: typeof navEvent) => {
      event.preventDefault()
    }

    onNavigate(navEvent)
    expect(navEvent.defaultPrevented).toBe(true)
    expect(navEvent.url.pathname).toBe('/view-transitions/posts/42')
  })

  it('multiple preventDefault() calls are idempotent', () => {
    let prevented = false
    const navEvent = {
      url: new URL('/', 'http://localhost'),
      preventDefault() {
        prevented = true
      },
      get defaultPrevented() {
        return prevented
      },
    }

    navEvent.preventDefault()
    navEvent.preventDefault()
    navEvent.preventDefault()
    expect(navEvent.defaultPrevented).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// text/head SSR security tests
// ---------------------------------------------------------------------------

describe('text/head SSR security', () => {
  async function collectHeadHTML(children: unknown[]) {
    const { resetSSRHead, getSSRHeadHTML } = await import('../src/shims/head.js')
    const { _getSSRHeadChildren } = await import('../src/shims/head-records.js')
    resetSSRHead()
    _getSSRHeadChildren().push(...children)
    return getSSRHeadHTML()
  }

  it('escapes HTML special characters in title children', async () => {
    const { createHeadRecord } = await import('../src/shims/head.js')
    const html = await collectHeadHTML([
      createHeadRecord('title', { children: '</title><script>alert("xss")</script>' }),
    ])

    // The injected script tag must be escaped, not raw
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('</title><script>')
    expect(html).toContain('&lt;/title&gt;&lt;script&gt;')
  })

  it('escapes ampersands and angle brackets in children', async () => {
    const { createHeadRecord } = await import('../src/shims/head.js')
    const html = await collectHeadHTML([
      createHeadRecord('title', { children: 'Tom & Jerry < Friends > Foes' }),
    ])

    expect(html).toContain('Tom &amp; Jerry &lt; Friends &gt; Foes')
    expect(html).not.toContain('Tom & Jerry < Friends > Foes')
  })

  it('still allows dangerouslySetInnerHTML (intentionally raw)', async () => {
    const { createHeadRecord } = await import('../src/shims/head.js')
    const html = await collectHeadHTML([
      createHeadRecord('style', {
        dangerouslySetInnerHTML: { __html: 'body { color: red; }' },
      }),
    ])

    expect(html).toContain('body { color: red; }')
  })

  it('escapes </script> in dangerouslySetInnerHTML for script tags', async () => {
    const { createHeadRecord } = await import('../src/shims/head.js')
    const html = await collectHeadHTML([
      createHeadRecord('script', {
        dangerouslySetInnerHTML: {
          __html: 'var x = "</script><img src=x onerror=alert(1)>";',
        },
      }),
    ])

    // The raw </script> must NOT appear in the output
    expect(html).not.toContain('</script><img')
    // The escaped form preserves the JS string content
    expect(html).toContain('<\\/script>')
  })

  it('escapes </style> in dangerouslySetInnerHTML for style tags', async () => {
    const { createHeadRecord } = await import('../src/shims/head.js')
    const html = await collectHeadHTML([
      createHeadRecord('style', {
        dangerouslySetInnerHTML: {
          __html: "body::after { content: '</style><img src=x onerror=alert(1)>'; }",
        },
      }),
    ])

    // The raw </style> must NOT appear
    expect(html).not.toContain('</style><img')
    expect(html).toContain('<\\/style>')
  })

  it('escapes case-insensitive closing tags in dangerouslySetInnerHTML', async () => {
    const { createHeadRecord } = await import('../src/shims/head.js')
    const html = await collectHeadHTML([
      createHeadRecord('script', {
        dangerouslySetInnerHTML: {
          __html: 'var x = "</SCRIPT><img src=x onerror=alert(1)>";',
        },
      }),
    ])

    expect(html).not.toContain('</SCRIPT>')
    expect(html).toContain('<\\/SCRIPT>')
  })

  it('attributes are still properly escaped', async () => {
    const { createHeadRecord } = await import('../src/shims/head.js')
    const html = await collectHeadHTML([
      createHeadRecord('meta', {
        name: 'description',
        content: 'He said "hello" & <goodbye>',
      }),
    ])

    expect(html).toContain('&quot;hello&quot;')
    expect(html).toContain('&amp;')
    expect(html).toContain('&lt;goodbye&gt;')
  })

  it('rejects disallowed tag types (iframe)', async () => {
    const { createHeadRecord } = await import('../src/shims/head.js')
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const html = await collectHeadHTML([
      createHeadRecord('iframe' as any, { src: 'https://evil.com' }),
    ])

    expect(html).toBe('')
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('ignoring disallowed tag <iframe>'),
    )
    consoleWarn.mockRestore()
  })

  it('rejects disallowed tag types (object, embed, form)', async () => {
    const { createHeadRecord } = await import('../src/shims/head.js')
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const html = await collectHeadHTML([
      createHeadRecord('object' as any, { data: 'https://evil.com' }),
      createHeadRecord('embed' as any, { src: 'https://evil.com' }),
      createHeadRecord('form' as any, { action: 'https://evil.com' }),
    ])

    expect(html).toBe('')
    consoleWarn.mockRestore()
  })

  it('allows all valid head tags', async () => {
    const { createHeadRecord, resetSSRHead } = await import('../src/shims/head.js')

    const allowedTags = ['title', 'meta', 'link', 'style', 'script', 'base', 'noscript']

    for (const tag of allowedTags) {
      resetSSRHead()
      const selfClosing = ['meta', 'link', 'base'].includes(tag)
      const el = selfClosing
        ? createHeadRecord(tag, { name: 'test', content: 'test' })
        : createHeadRecord(tag, { children: 'test content' })

      const html = await collectHeadHTML([el])

      expect(html).toContain(`<${tag}`)
      expect(html).toContain('data-text-head=""')
    }
  })
})

describe('escapeInlineContent', () => {
  it('escapes </script> within script content', async () => {
    const { escapeInlineContent } = await import('../src/shims/head.js')
    const input = 'var x = "</script><img src=x onerror=alert(1)>";'
    const result = escapeInlineContent(input, 'script')
    expect(result).toBe('var x = "<\\/script><img src=x onerror=alert(1)>";')
    expect(result).not.toContain('</script>')
  })

  it('escapes </style> within style content', async () => {
    const { escapeInlineContent } = await import('../src/shims/head.js')
    const input = "body::after { content: '</style><div>'; }"
    const result = escapeInlineContent(input, 'style')
    expect(result).toBe("body::after { content: '<\\/style><div>'; }")
    expect(result).not.toContain('</style>')
  })

  it('handles case-insensitive closing tags', async () => {
    const { escapeInlineContent } = await import('../src/shims/head.js')
    expect(escapeInlineContent('</Script>', 'script')).toBe('<\\/Script>')
    expect(escapeInlineContent('</SCRIPT>', 'script')).toBe('<\\/SCRIPT>')
    expect(escapeInlineContent('</sCrIpT>', 'script')).toBe('<\\/sCrIpT>')
  })

  it('handles multiple occurrences', async () => {
    const { escapeInlineContent } = await import('../src/shims/head.js')
    const input = '</script></script></SCRIPT>'
    const result = escapeInlineContent(input, 'script')
    expect(result).toBe('<\\/script><\\/script><\\/SCRIPT>')
    expect(result).not.toContain('</script>')
    expect(result).not.toContain('</SCRIPT>')
  })

  it('does not escape unrelated closing tags', async () => {
    const { escapeInlineContent } = await import('../src/shims/head.js')
    // Escaping for "script" should not touch </style>
    const input = '</style></div>'
    const result = escapeInlineContent(input, 'script')
    expect(result).toBe('</style></div>')
  })

  it('passes through content with no closing tags', async () => {
    const { escapeInlineContent } = await import('../src/shims/head.js')
    const input = "console.log('hello world');"
    expect(escapeInlineContent(input, 'script')).toBe(input)
  })
})

describe('isValidModulePath', () => {
  it('accepts valid absolute paths', () => {
    expect(isValidModulePath('/src/pages/index.tsx')).toBe(true)
    expect(isValidModulePath('/pages/about.js')).toBe(true)
    expect(isValidModulePath('/src/pages/posts/[id].tsx')).toBe(true)
  })

  it('accepts valid relative paths starting with ./', () => {
    expect(isValidModulePath('./src/pages/index.tsx')).toBe(true)
    expect(isValidModulePath('./pages/about.js')).toBe(true)
  })

  it('rejects external https:// URLs', () => {
    expect(isValidModulePath('https://evil.com/steal-cookies.js')).toBe(false)
  })

  it('rejects external http:// URLs', () => {
    expect(isValidModulePath('http://evil.com/steal-cookies.js')).toBe(false)
  })

  it('rejects protocol-relative URLs (//)', () => {
    expect(isValidModulePath('//evil.com/steal-cookies.js')).toBe(false)
    expect(isValidModulePath('//cdn.example.com/script.js')).toBe(false)
  })

  it('rejects directory traversal', () => {
    expect(isValidModulePath('/src/../../../etc/passwd')).toBe(false)
    expect(isValidModulePath('./../../secret.js')).toBe(false)
    expect(isValidModulePath('/pages/..%2F..%2Fsecret.js')).toBe(false)
  })

  it('rejects data: URLs', () => {
    expect(isValidModulePath('data:text/javascript,alert(1)')).toBe(false)
  })

  it('rejects blob: URLs', () => {
    expect(isValidModulePath('blob:http://localhost/abc')).toBe(false)
  })

  it('rejects bare specifiers', () => {
    expect(isValidModulePath('evil-package')).toBe(false)
    expect(isValidModulePath('@evil/package')).toBe(false)
  })

  it('rejects non-string values', () => {
    expect(isValidModulePath(null)).toBe(false)
    expect(isValidModulePath(undefined)).toBe(false)
    expect(isValidModulePath(42)).toBe(false)
    expect(isValidModulePath({})).toBe(false)
    expect(isValidModulePath('')).toBe(false)
  })

  it('rejects javascript: protocol', () => {
    expect(isValidModulePath('javascript:alert(1)')).toBe(false)
  })

  it('rejects ftp:// protocol', () => {
    expect(isValidModulePath('ftp://evil.com/script.js')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Cache scope guards — headers()/cookies()/connection() must throw inside
// "use cache" and unstable_cache() scopes (matches Text.js behavior).
// Ported from Text.js: test/e2e/app-dir/use-cache/use-cache.test.ts
// https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/use-cache/use-cache.test.ts
