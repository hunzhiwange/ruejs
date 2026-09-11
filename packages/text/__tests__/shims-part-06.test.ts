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
describe('middleware matcher patterns', () => {
  it('matchPattern: exact path match', async () => {
    const { matchPattern } = await import('../src/server/middleware.js')
    expect(matchPattern('/about', '/about')).toBe(true)
    expect(matchPattern('/about', '/other')).toBe(false)
    expect(matchPattern('/', '/')).toBe(true)
  })

  it('matchPattern: named parameter (:param)', async () => {
    const { matchPattern } = await import('../src/server/middleware.js')
    expect(matchPattern('/user/123', '/user/:id')).toBe(true)
    expect(matchPattern('/user/abc', '/user/:id')).toBe(true)
    expect(matchPattern('/user/', '/user/:id')).toBe(false)
    expect(matchPattern('/user/123/posts', '/user/:id')).toBe(false)
  })

  // Ported from Text.js: middleware matchers support :param(constraint) syntax
  // https://textjs.org/docs/app/building-your-application/routing/middleware#matcher
  it('matchPattern: :param(constraint) applies inline regex constraint', async () => {
    const { matchPattern } = await import('../src/server/middleware.js')
    // :id(\d+) should match only digits
    expect(matchPattern('/blog/123', '/blog/:id(\\d+)')).toBe(true)
    expect(matchPattern('/blog/0', '/blog/:id(\\d+)')).toBe(true)
    expect(matchPattern('/blog/abc', '/blog/:id(\\d+)')).toBe(false)
    expect(matchPattern('/blog/12x', '/blog/:id(\\d+)')).toBe(false)

    // Locale-style alternation constraint: :locale(en|es|fr)
    expect(matchPattern('/en/about', '/:locale(en|es|fr)/about')).toBe(true)
    expect(matchPattern('/es/about', '/:locale(en|es|fr)/about')).toBe(true)
    expect(matchPattern('/de/about', '/:locale(en|es|fr)/about')).toBe(false)

    // Optional locale with ? after constraint
    expect(matchPattern('/about', '/:locale(en|es|fr)?/about')).toBe(true)
    expect(matchPattern('/en/about', '/:locale(en|es|fr)?/about')).toBe(true)
    expect(matchPattern('/de/about', '/:locale(en|es|fr)?/about')).toBe(false)
  })

  it('matchPattern: wildcard (:path*) matches zero or more segments', async () => {
    const { matchPattern } = await import('../src/server/middleware.js')
    expect(matchPattern('/dashboard', '/dashboard/:path*')).toBe(true)
    expect(matchPattern('/dashboard/settings', '/dashboard/:path*')).toBe(true)
    expect(matchPattern('/dashboard/settings/profile', '/dashboard/:path*')).toBe(true)
    expect(matchPattern('/other', '/dashboard/:path*')).toBe(false)
  })

  it('matchPattern: :param*(constraint) and :param+(constraint)', async () => {
    const { matchPattern } = await import('../src/server/middleware.js')
    // /:path*(api|static) — optional segment constrained to api or static
    expect(matchPattern('/cdn', '/cdn/:path*(api|static)')).toBe(true)
    expect(matchPattern('/cdn/api', '/cdn/:path*(api|static)')).toBe(true)
    expect(matchPattern('/cdn/static', '/cdn/:path*(api|static)')).toBe(true)
    expect(matchPattern('/cdn/other', '/cdn/:path*(api|static)')).toBe(false)

    // /:path+(api|static) — required segment constrained
    expect(matchPattern('/cdn', '/cdn/:path+(api|static)')).toBe(false)
    expect(matchPattern('/cdn/api', '/cdn/:path+(api|static)')).toBe(true)
    expect(matchPattern('/cdn/static', '/cdn/:path+(api|static)')).toBe(true)
    expect(matchPattern('/cdn/other', '/cdn/:path+(api|static)')).toBe(false)
  })

  it('matchPattern: one-or-more (:path+) requires at least one segment', async () => {
    const { matchPattern } = await import('../src/server/middleware.js')
    expect(matchPattern('/api/users', '/api/:path+')).toBe(true)
    expect(matchPattern('/api/users/123', '/api/:path+')).toBe(true)
    expect(matchPattern('/api', '/api/:path+')).toBe(false)
    // /api/ has no actual segment after the slash
    expect(matchPattern('/api/', '/api/:path+')).toBe(false)
  })

  it('matchPattern: regex patterns with groups', async () => {
    const { matchPattern } = await import('../src/server/middleware.js')
    // Common Text.js matcher: /((?!api|_text|favicon\.ico).*)
    expect(matchPattern('/about', '/((?!api|_text|favicon\\.ico).*)')).toBe(true)
    expect(matchPattern('/dashboard/settings', '/((?!api|_text|favicon\\.ico).*)')).toBe(true)
    expect(matchPattern('/api/hello', '/((?!api|_text|favicon\\.ico).*)')).toBe(false)
    expect(matchPattern('/_text/static/chunk.js', '/((?!api|_text|favicon\\.ico).*)')).toBe(false)
  })

  it('matchPattern: dots are escaped in paths', async () => {
    const { matchPattern } = await import('../src/server/middleware.js')
    expect(matchPattern('/files/data.json', '/files/data.json')).toBe(true)
    expect(matchPattern('/files/dataXjson', '/files/data.json')).toBe(false)
  })

  it('matchesMiddleware: no matcher — matches all paths (Text.js default)', async () => {
    const { matchesMiddleware } = await import('../src/server/middleware.js')
    // Text.js default: middleware runs on ALL paths when no matcher is configured.
    // Users opt out of specific paths by configuring a matcher pattern.
    expect(matchesMiddleware('/', undefined)).toBe(true)
    expect(matchesMiddleware('/about', undefined)).toBe(true)
    expect(matchesMiddleware('/dashboard/settings', undefined)).toBe(true)
    expect(matchesMiddleware('/_text/static/chunk.js', undefined)).toBe(true)
    expect(matchesMiddleware('/api/hello', undefined)).toBe(true)
    expect(matchesMiddleware('/favicon.ico', undefined)).toBe(true)
    expect(matchesMiddleware('/image.png', undefined)).toBe(true)
  })

  it('matchesMiddleware: single string matcher', async () => {
    const { matchesMiddleware } = await import('../src/server/middleware.js')
    expect(matchesMiddleware('/about', '/about')).toBe(true)
    expect(matchesMiddleware('/other', '/about')).toBe(false)
    // Ported from Text.js: test/e2e/middleware-custom-matchers-i18n/test/index.test.ts
    // https://github.com/vercel/next.js/blob/canary/test/e2e/middleware-custom-matchers-i18n/test/index.test.ts
    expect(
      matchesMiddleware('/about', '/about', undefined, {
        locales: ['en', 'fr'],
        defaultLocale: 'en',
      }),
    ).toBe(true)
    expect(
      matchesMiddleware('/fr/about', '/about', undefined, {
        locales: ['en', 'fr'],
        defaultLocale: 'en',
      }),
    ).toBe(true)
    expect(
      matchesMiddleware('/', '/', undefined, {
        locales: ['en', 'fr'],
        defaultLocale: 'en',
      }),
    ).toBe(true)
  })

  it('matchesMiddleware: locale-prefixed negative-lookahead matchers keep internal paths excluded', async () => {
    const { matchesMiddleware } = await import('../src/server/middleware.js')
    const matcher = '/((?!api|_text|favicon\\.ico).*)'
    const i18nConfig = {
      locales: ['en', 'fr'],
      defaultLocale: 'en',
    }

    expect(matchesMiddleware('/fr/about', matcher, undefined, i18nConfig)).toBe(true)
    expect(matchesMiddleware('/fr/api/hello', matcher, undefined, i18nConfig)).toBe(false)
    expect(matchesMiddleware('/fr/_text/static/chunk.js', matcher, undefined, i18nConfig)).toBe(
      false,
    )
    expect(matchesMiddleware('/fr/favicon.ico', matcher, undefined, i18nConfig)).toBe(false)
  })

  it('matchesMiddleware: array of string matchers', async () => {
    const { matchesMiddleware } = await import('../src/server/middleware.js')
    const matcher = ['/about', '/dashboard/:path*']
    expect(matchesMiddleware('/about', matcher)).toBe(true)
    expect(matchesMiddleware('/dashboard', matcher)).toBe(true)
    expect(matchesMiddleware('/dashboard/settings', matcher)).toBe(true)
    expect(matchesMiddleware('/other', matcher)).toBe(false)
  })

  it('matchesMiddleware: array of object matchers with source', async () => {
    const { matchesMiddleware } = await import('../src/server/middleware.js')
    const matcher = [{ source: '/about' }, { source: '/dashboard/:path*' }]
    expect(matchesMiddleware('/about', matcher)).toBe(true)
    expect(matchesMiddleware('/dashboard/settings', matcher)).toBe(true)
    expect(matchesMiddleware('/other', matcher)).toBe(false)
  })

  it('matchesMiddleware: object matchers respect has and missing conditions', async () => {
    const { matchesMiddleware } = await import('../src/server/middleware.js')
    const matcher: any = [
      {
        source: '/dashboard',
        has: [{ type: 'header', key: 'x-user-tier', value: 'pro' }],
        missing: [{ type: 'cookie', key: 'blocked' }],
      },
    ]

    expect(matchesMiddleware('/dashboard', matcher)).toBe(false)
    expect(
      matchesMiddleware(
        '/dashboard',
        matcher,
        new Request('https://example.com/dashboard', {
          headers: { 'x-user-tier': 'pro' },
        }),
      ),
    ).toBe(true)
    expect(
      matchesMiddleware(
        '/dashboard',
        matcher,
        new Request('https://example.com/dashboard', {
          headers: { 'x-user-tier': 'free', cookie: 'blocked=1' },
        }),
      ),
    ).toBe(false)
  })

  it('matchesMiddleware: rejects a single object matcher config', async () => {
    const { matchesMiddleware } = await import('../src/server/middleware.js')
    const matcher: any = {
      source: '/dashboard',
      has: [{ type: 'header', key: 'x-user-tier', value: 'pro' }],
    }

    expect(matchesMiddleware('/dashboard', matcher)).toBe(false)
    expect(
      matchesMiddleware(
        '/dashboard',
        matcher,
        new Request('https://example.com/dashboard', {
          headers: { 'x-user-tier': 'pro' },
        }),
      ),
    ).toBe(false)
  })

  it('matchesMiddleware: rejects object matchers with unsupported fields', async () => {
    const { matchesMiddleware } = await import('../src/server/middleware.js')
    const matcher: any = [{ source: '/does-not-match', regexp: '^/dashboard(?:/.*)?$' }]

    expect(matchesMiddleware('/dashboard/settings', matcher)).toBe(false)
    expect(matchesMiddleware('/about', matcher)).toBe(false)
  })

  it('matchesMiddleware: matches default-locale and locale-prefixed paths unless locale is false', async () => {
    const { matchesMiddleware } = await import('../src/server/middleware.js')
    const i18nConfig = {
      locales: ['en', 'fr'],
      defaultLocale: 'en',
    }

    // Ported from Text.js: test/e2e/middleware-custom-matchers-i18n/test/index.test.ts
    // https://github.com/vercel/next.js/blob/canary/test/e2e/middleware-custom-matchers-i18n/test/index.test.ts
    expect(matchesMiddleware('/dashboard', [{ source: '/dashboard' }], undefined, i18nConfig)).toBe(
      true,
    )
    expect(
      matchesMiddleware('/fr/dashboard', [{ source: '/dashboard' }], undefined, i18nConfig),
    ).toBe(true)
    expect(
      matchesMiddleware(
        '/fr/dashboard',
        [{ source: '/dashboard', locale: false }],
        undefined,
        i18nConfig,
      ),
    ).toBe(false)
  })

  it('matchesMiddleware: mixed array of strings and objects', async () => {
    const { matchesMiddleware } = await import('../src/server/middleware.js')
    const matcher = ['/about', { source: '/api/:path+' }] as any
    expect(matchesMiddleware('/about', matcher)).toBe(true)
    expect(matchesMiddleware('/api/users', matcher)).toBe(true)
    expect(matchesMiddleware('/api', matcher)).toBe(false)
    expect(matchesMiddleware('/other', matcher)).toBe(false)
  })

  it('matchPattern: rejects pathological ReDoS patterns', async () => {
    const { matchPattern } = await import('../src/server/middleware.js')
    // Pathological pattern: (a+)+ causes catastrophic backtracking
    // matchPattern should return false (no match) instead of hanging
    // lgtm[js/redos] — deliberate pathological regex to test safeRegExp guard
    expect(matchPattern('/aaaaaaaaaaaaaaaaaaaac', '(a+)+b')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// normalizePath unit tests

describe('normalizePath', () => {
  it('returns root unchanged', async () => {
    const { normalizePath } = await import('../src/server/normalize-path.js')
    expect(normalizePath('/')).toBe('/')
  })

  it('returns already-canonical paths unchanged', async () => {
    const { normalizePath } = await import('../src/server/normalize-path.js')
    expect(normalizePath('/foo/bar')).toBe('/foo/bar')
    expect(normalizePath('/about')).toBe('/about')
    expect(normalizePath('/api/users/123')).toBe('/api/users/123')
  })

  it('collapses double slashes', async () => {
    const { normalizePath } = await import('../src/server/normalize-path.js')
    expect(normalizePath('//foo')).toBe('/foo')
    expect(normalizePath('/foo//bar')).toBe('/foo/bar')
    expect(normalizePath('/dashboard//settings')).toBe('/dashboard/settings')
    expect(normalizePath('///')).toBe('/')
    expect(normalizePath('/foo///bar///baz')).toBe('/foo/bar/baz')
  })

  it('resolves single-dot segments', async () => {
    const { normalizePath } = await import('../src/server/normalize-path.js')
    expect(normalizePath('/foo/./bar')).toBe('/foo/bar')
    expect(normalizePath('/./foo')).toBe('/foo')
    expect(normalizePath('/foo/.')).toBe('/foo')
  })

  it('resolves double-dot segments', async () => {
    const { normalizePath } = await import('../src/server/normalize-path.js')
    expect(normalizePath('/foo/../bar')).toBe('/bar')
    expect(normalizePath('/foo/bar/../baz')).toBe('/foo/baz')
    expect(normalizePath('/foo/..')).toBe('/')
  })

  it('clamps traversal above root', async () => {
    const { normalizePath } = await import('../src/server/normalize-path.js')
    expect(normalizePath('/../../../etc/passwd')).toBe('/etc/passwd')
    expect(normalizePath('/..')).toBe('/')
  })

  it('ensures leading slash', async () => {
    const { normalizePath } = await import('../src/server/normalize-path.js')
    expect(normalizePath('foo/bar')).toBe('/foo/bar')
    expect(normalizePath('')).toBe('/')
  })

  it('preserves trailing slash on fast path', async () => {
    const { normalizePath } = await import('../src/server/normalize-path.js')
    // Fast path: already canonical with trailing slash
    expect(normalizePath('/foo/bar/')).toBe('/foo/bar/')
  })

  it('handles complex combined cases', async () => {
    const { normalizePath } = await import('../src/server/normalize-path.js')
    expect(normalizePath('/foo/./bar/../baz')).toBe('/foo/baz')
    expect(normalizePath('//foo/./bar//baz/../qux')).toBe('/foo/bar/qux')
  })
})

// ── escapePathDelimiters / decodePathParams ────────────────────────────────
// Ported from Text.js: packages/text/src/shared/lib/router/utils/escape-path-delimiters.ts
// and packages/text/src/server/lib/router-utils/decode-path-params.ts

describe('escapePathDelimiters', () => {
  let escapePathDelimiters: (segment: string, escapeEncoded?: boolean) => string

  beforeEach(async () => {
    const mod = await import('../src/server/normalize-path.js')
    escapePathDelimiters = mod.escapePathDelimiters
  })

  it('re-encodes forward slash', () => {
    expect(escapePathDelimiters('admin/panel')).toBe('admin%2Fpanel')
  })

  it('re-encodes hash and question mark', () => {
    expect(escapePathDelimiters('foo#bar')).toBe('foo%23bar')
    expect(escapePathDelimiters('foo?bar')).toBe('foo%3Fbar')
  })

  it('re-encodes already-encoded delimiters when escapeEncoded is true', () => {
    expect(escapePathDelimiters('admin%2Fpanel', true)).toBe('admin%252Fpanel')
    expect(escapePathDelimiters('foo%23bar', true)).toBe('foo%2523bar')
    expect(escapePathDelimiters('foo%3Fbar', true)).toBe('foo%253Fbar')
    expect(escapePathDelimiters('foo%5Cbar', true)).toBe('foo%255Cbar')
  })

  it('leaves non-delimiter characters unchanged', () => {
    expect(escapePathDelimiters('café')).toBe('café')
    expect(escapePathDelimiters('hello world')).toBe('hello world')
  })
})

describe('decodePathParams', () => {
  let decodePathParams: (pathname: string) => string

  beforeEach(async () => {
    const mod = await import('../src/server/normalize-path.js')
    decodePathParams = mod.decodePathParams
  })

  it('decodes non-ASCII characters within segments', () => {
    expect(decodePathParams('/caf%C3%A9')).toBe('/café')
    expect(decodePathParams('/%E6%97%A5%E6%9C%AC%E8%AA%9E')).toBe('/日本語')
  })

  it('preserves encoded slashes (%2F) - does not change path structure', () => {
    expect(decodePathParams('/admin%2Fpanel')).toBe('/admin%2Fpanel')
  })

  it('preserves encoded hash (%23) and question mark (%3F)', () => {
    expect(decodePathParams('/foo%23bar')).toBe('/foo%23bar')
    expect(decodePathParams('/foo%3Fbar')).toBe('/foo%3Fbar')
  })

  it('decodes encoded backslash (%5C) since it is not a path delimiter', () => {
    // Backslash is not a URL path delimiter (browsers normalize \ to / before
    // sending). The escapePathDelimiters function only re-encodes /, #, and ?.
    // %5C is decoded to \ and left as-is, matching Text.js behavior.
    expect(decodePathParams('/foo%5Cbar')).toBe('/foo\\bar')
  })

  it('decodes mixed paths correctly', () => {
    // Non-ASCII decoded, structural delimiters preserved
    expect(decodePathParams('/caf%C3%A9/admin%2Fpanel')).toBe('/café/admin%2Fpanel')
  })

  it('handles already-decoded paths', () => {
    expect(decodePathParams('/about')).toBe('/about')
    expect(decodePathParams('/foo/bar/baz')).toBe('/foo/bar/baz')
  })

  it('handles malformed percent-encoding gracefully', () => {
    // Should not throw, just return the segment as-is
    expect(decodePathParams('/%E0%A4%A')).toBe('/%E0%A4%A')
  })

  it('handles root path', () => {
    expect(decodePathParams('/')).toBe('/')
  })
})

// ---------------------------------------------------------------------------
// Integration: verify decodeURIComponent + normalizePath applied before matching

describe('middleware bypass prevention', () => {
  it('percent-encoded path is decoded before matching', async () => {
    const { matchPattern, matchesMiddleware } = await import('../src/server/middleware.js')
    const { normalizePath } = await import('../src/server/normalize-path.js')

    // /%61dmin decodes to /admin
    const encoded = '/%61dmin'
    const decoded = normalizePath(decodeURIComponent(encoded))
    expect(decoded).toBe('/admin')
    expect(matchPattern(decoded, '/admin')).toBe(true)
    expect(matchesMiddleware(decoded, '/admin')).toBe(true)
  })

  it('double-slash path is collapsed before matching', async () => {
    const { matchPattern, matchesMiddleware } = await import('../src/server/middleware.js')
    const { normalizePath } = await import('../src/server/normalize-path.js')

    // /dashboard//settings collapses to /dashboard/settings
    const doubleSlash = '/dashboard//settings'
    const normalized = normalizePath(doubleSlash)
    expect(normalized).toBe('/dashboard/settings')
    expect(matchPattern(normalized, '/dashboard/:path*')).toBe(true)
    expect(matchesMiddleware(normalized, '/dashboard/:path*')).toBe(true)
  })

  it('default matcher (no config) matches all paths including /api', async () => {
    const { matchesMiddleware } = await import('../src/server/middleware.js')
    // When no matcher is configured, middleware must run on ALL paths
    expect(matchesMiddleware('/api/hello', undefined)).toBe(true)
    expect(matchesMiddleware('/_text/data/build-id/page.json', undefined)).toBe(true)
    expect(matchesMiddleware('/favicon.ico', undefined)).toBe(true)
  })

  it('regex patterns are not corrupted by dot-escaping', async () => {
    const { matchPattern } = await import('../src/server/middleware.js')
    // The common Text.js regex pattern must work correctly:
    // /((?!api|_text|favicon\.ico).*) should match /about but NOT /api/hello
    const pattern = '/((?!api|_text|favicon\\.ico).*)'
    expect(matchPattern('/about', pattern)).toBe(true)
    expect(matchPattern('/dashboard/settings', pattern)).toBe(true)
    expect(matchPattern('/api/hello', pattern)).toBe(false)
    expect(matchPattern('/_text/static/chunk.js', pattern)).toBe(false)
    expect(matchPattern('/favicon.ico', pattern)).toBe(false)
  })

  // ── Config matcher percent-encoding handling ──

  it('config redirect matcher works with decoded percent-encoded paths', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    const { normalizePath } = await import('../src/server/normalize-path.js')
    const redirects = [
      { source: '/admin', destination: '/login', permanent: true },
      { source: '/old-blog/:slug', destination: '/blog/:slug', permanent: false },
    ]
    const reqCtx = {
      headers: new Headers(),
      cookies: {},
      query: new URLSearchParams(),
      host: 'localhost',
    }
    // Decoded path should match
    const decoded = normalizePath(decodeURIComponent('/%61dmin'))
    expect(decoded).toBe('/admin')
    const result = matchRedirect(decoded, redirects, reqCtx)
    expect(result).toBeTruthy()
    expect(result!.destination).toBe('/login')

    // Mixed encoding in parameterized route
    const slugDecoded = normalizePath(decodeURIComponent('/%6Fld-blog/my-p%6Fst'))
    expect(slugDecoded).toBe('/old-blog/my-post')
    const slugResult = matchRedirect(slugDecoded, redirects, reqCtx)
    expect(slugResult).toBeTruthy()
    expect(slugResult!.destination).toBe('/blog/my-post')

    // Raw encoded path must NOT match (matchers expect decoded paths)
    const rawResult = matchRedirect('/%61dmin', redirects, reqCtx)
    expect(rawResult).toBeNull()
  })

  it('config header matcher works with decoded percent-encoded paths', async () => {
    const { matchHeaders } = await import('../src/config/config-matchers.js')
    const { normalizePath } = await import('../src/server/normalize-path.js')
    const headers = [{ source: '/api/(.*)', headers: [{ key: 'X-Custom', value: 'true' }] }]
    const reqCtx = {
      headers: new Headers(),
      cookies: {},
      query: new URLSearchParams(),
      host: 'localhost',
    }
    // Decoded path should match
    const decoded = normalizePath(decodeURIComponent('/%61pi/hello'))
    expect(decoded).toBe('/api/hello')
    const result = matchHeaders(decoded, headers, reqCtx)
    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('X-Custom')

    // Raw encoded path must NOT match
    const rawResult = matchHeaders('/%61pi/hello', headers, reqCtx)
    expect(rawResult).toHaveLength(0)
  })

  it('config rewrite matcher works with decoded percent-encoded paths', async () => {
    const { matchRewrite } = await import('../src/config/config-matchers.js')
    const { normalizePath } = await import('../src/server/normalize-path.js')
    const rewrites = [{ source: '/before-rewrite', destination: '/about' }]
    const reqCtx = {
      headers: new Headers(),
      cookies: {},
      query: new URLSearchParams(),
      host: 'localhost',
    }
    // Decoded path should match
    const decoded = normalizePath(decodeURIComponent('/%62efore-rewrite'))
    expect(decoded).toBe('/before-rewrite')
    const result = matchRewrite(decoded, rewrites, reqCtx)
    expect(result).toBe('/about')

    // Raw encoded path must NOT match
    const rawResult = matchRewrite('/%62efore-rewrite', rewrites, reqCtx)
    expect(rawResult).toBeNull()
  })

  it('double-encoded paths are decoded only once', async () => {
    const { normalizePath } = await import('../src/server/normalize-path.js')
    // %2561dmin → first decode → %61dmin (literal text, not /admin)
    const doubleEncoded = '/%2561dmin'
    const decoded = normalizePath(decodeURIComponent(doubleEncoded))
    // Should decode to /%61dmin, NOT to /admin
    expect(decoded).toBe('/%61dmin')
    expect(decoded).not.toBe('/admin')
  })
})
