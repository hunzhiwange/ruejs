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
describe('matchConfigPattern rejects ReDoS patterns', () => {
  it('returns null for pathological source patterns', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    // This pattern has nested quantifiers: the compiled regex would be (a+)+b
    // which causes catastrophic backtracking. matchConfigPattern should return
    // null (no match) rather than hanging.
    // lgtm[js/redos] — deliberate pathological regex to test safeRegExp guard
    const result = matchConfigPattern('/aaaaaaaaaaaaaaaaaaaac', '/:id((a+)+b)')
    expect(result).toBeNull()
  })
})

describe('matchConfigPattern compiled pattern cache', () => {
  it('returns consistent results when the same pattern is called multiple times', async () => {
    // Regression test for the per-request recompilation bug: patterns that
    // enter the regex branch (containing `(`, `\`, or param suffixes) were
    // previously re-running isSafeRegex + new RegExp() on every call, which
    // dominated CPU profiles on apps with many locale-prefixed redirect rules.
    // After the fix the compiled RegExp is cached at module level.
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')

    // Locale capture-group pattern — the kind that triggered the bottleneck.
    const localePattern = '/:locale(en|es|fr|id|ja|ko|pt-br|pt|ro|ta|tr|uk|zh-cn|zh-tw)?/security'

    // First call — populates the cache.
    const first = matchConfigPattern('/en/security', localePattern)
    expect(first).not.toBeNull()
    expect(first!.locale).toBe('en')

    // Second call — must hit the cache and return the same result.
    const second = matchConfigPattern('/en/security', localePattern)
    expect(second).toEqual(first)

    // Different pathname, same pattern — still uses the cached RegExp.
    const third = matchConfigPattern('/fr/security', localePattern)
    expect(third).not.toBeNull()
    expect(third!.locale).toBe('fr')

    // Non-matching pathname — cache must not corrupt the null path.
    const fourth = matchConfigPattern('/de/security', localePattern)
    expect(fourth).toBeNull()

    // Plain no-match when locale omitted and path wrong.
    const fifth = matchConfigPattern('/security/extra', localePattern)
    expect(fifth).toBeNull()
  })

  it('caches rejection for unsafe (ReDoS) patterns and returns null on repeat calls', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    // lgtm[js/redos] — deliberate pathological regex to test cache-of-null path
    const unsafe = '/:id((a+)+b)'
    expect(matchConfigPattern('/x', unsafe)).toBeNull()
    // Second call must not re-run isSafeRegex — just return null from cache.
    expect(matchConfigPattern('/x', unsafe)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// matchRedirect locale-static index tests
// Verifies the O(1) locale-prefix optimization in matchRedirect.

describe('matchRedirect locale-static index', () => {
  const emptyCtx = {
    headers: new Headers(),
    cookies: {},
    query: new URLSearchParams(),
    host: 'localhost',
  }

  // 63 locale-prefix rules — matches the profiled bottleneck scenario.
  const locales = 'en|es|fr|id|ja|ko|pt-br|pt|ro|ta|tr|uk|zh-cn|zh-tw|'
  function makeLocaleRules(suffixes: string[]) {
    return suffixes.map(s => ({
      source: `/:locale(${locales})?${s}`,
      destination: `/:locale${s}-dest`,
      permanent: false as const,
    }))
  }

  it('matches a locale-prefixed pathname (locale present)', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    const redirects = makeLocaleRules(['/security', '/advisory-board'])
    const result = matchRedirect('/en/security', redirects, emptyCtx)
    expect(result).not.toBeNull()
    expect(result!.destination).toBe('/en/security-dest')
    expect(result!.permanent).toBe(false)
  })

  it('matches a locale-prefixed pathname (locale omitted)', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    const redirects = makeLocaleRules(['/security', '/advisory-board'])
    // When locale is omitted the destination :locale param substitutes to "".
    // sanitizeDestination collapses the leading double slash.
    const result = matchRedirect('/security', redirects, emptyCtx)
    expect(result).not.toBeNull()
    expect(result!.destination).toBe('/security-dest')
  })

  it('returns null when pathname does not match any rule', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    const redirects = makeLocaleRules(['/security', '/advisory-board'])
    // /blog is not in any indexed suffix
    expect(matchRedirect('/blog', redirects, emptyCtx)).toBeNull()
    expect(matchRedirect('/en/blog', redirects, emptyCtx)).toBeNull()
  })

  it('returns null when locale segment is not in the alternation', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    const redirects = makeLocaleRules(['/security'])
    // "de" is not in the locales alternation
    expect(matchRedirect('/de/security', redirects, emptyCtx)).toBeNull()
  })

  it('matches multi-segment locale codes like pt-br and zh-cn', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    const redirects = makeLocaleRules(['/security'])
    const ptBr = matchRedirect('/pt-br/security', redirects, emptyCtx)
    expect(ptBr).not.toBeNull()
    expect(ptBr!.destination).toBe('/pt-br/security-dest')

    const zhCn = matchRedirect('/zh-cn/security', redirects, emptyCtx)
    expect(zhCn).not.toBeNull()
    expect(zhCn!.destination).toBe('/zh-cn/security-dest')
  })

  it('preserves ordering: linear rule earlier than locale-static wins', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    // Rule 0 is a linear catch-all; rule 1 is locale-static.
    // For /en/security, the linear rule (index 0) matches first.
    const redirects = [
      { source: '/:path*', destination: '/catchall', permanent: false as const },
      ...makeLocaleRules(['/security']),
    ]
    const result = matchRedirect('/en/security', redirects, emptyCtx)
    expect(result).not.toBeNull()
    expect(result!.destination).toBe('/catchall')
  })

  it('preserves ordering: locale-static rule earlier than linear wins', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    // Rule 0 is locale-static; rule 1 is linear.
    // For /en/security, the locale-static rule (index 0) matches first.
    const redirects = [
      ...makeLocaleRules(['/security']),
      { source: '/:path*', destination: '/catchall', permanent: false as const },
    ]
    const result = matchRedirect('/en/security', redirects, emptyCtx)
    expect(result).not.toBeNull()
    expect(result!.destination).toBe('/en/security-dest')
  })

  it('returns null efficiently for 63 rules on a non-matching path (no regex exec on hot path)', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    // Construct 63 locale-prefixed rules (matches the profiled bottleneck).
    const suffixes = Array.from({ length: 63 }, (_, i) => `/page-${i}`)
    const redirects = makeLocaleRules(suffixes)
    // /blog does not match any rule.
    const result = matchRedirect('/blog', redirects, emptyCtx)
    expect(result).toBeNull()
    // /en/blog also does not match.
    const result2 = matchRedirect('/en/blog', redirects, emptyCtx)
    expect(result2).toBeNull()
  })

  it('respects has/missing conditions on locale-static rules', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    const redirects = [
      {
        source: `/:locale(en|fr)?/gated`,
        destination: `/:locale/gated-dest`,
        permanent: false as const,
        has: [{ type: 'header' as const, key: 'x-auth', value: '1' }],
      },
    ]

    // Without the header — should NOT match.
    const noHeader = matchRedirect('/en/gated', redirects, emptyCtx)
    expect(noHeader).toBeNull()

    // With the header — should match.
    const withHeader = matchRedirect('/en/gated', redirects, {
      headers: new Headers({ 'x-auth': '1' }),
      cookies: {},
      query: new URLSearchParams(),
      host: 'localhost',
    })
    expect(withHeader).not.toBeNull()
    expect(withHeader!.destination).toBe('/en/gated-dest')
  })

  it('lets has captures override locale params in locale-static redirects', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    const redirects = [
      {
        source: `/:locale(en|fr)?/docs`,
        destination: `/target/:locale`,
        permanent: false as const,
        has: [{ type: 'header' as const, key: 'x-locale', value: '(?<locale>forced)' }],
      },
    ]

    const withLocalePrefix = matchRedirect('/en/docs', redirects, {
      headers: new Headers({ 'x-locale': 'forced' }),
      cookies: {},
      query: new URLSearchParams(),
      host: 'localhost',
    })
    expect(withLocalePrefix).toEqual({ destination: '/target/forced', permanent: false })

    const withoutLocalePrefix = matchRedirect('/docs', redirects, {
      headers: new Headers({ 'x-locale': 'forced' }),
      cookies: {},
      query: new URLSearchParams(),
      host: 'localhost',
    })
    expect(withoutLocalePrefix).toEqual({ destination: '/target/forced', permanent: false })
  })

  it('falls back to linear matching for rules that are not locale-static', async () => {
    const { matchRedirect } = await import('../src/config/config-matchers.js')
    // A mix: some locale-static rules and one catch-all that matches /other.
    const redirects = [
      ...makeLocaleRules(['/security', '/advisory-board']),
      { source: '/other', destination: '/other-dest', permanent: true as const },
    ]
    const result = matchRedirect('/other', redirects, emptyCtx)
    expect(result).not.toBeNull()
    expect(result!.destination).toBe('/other-dest')
    expect(result!.permanent).toBe(true)
  })
})

describe('matchConfigPattern handles parameterized suffix patterns', () => {
  it('matches :path* with literal suffix (e.g. /:path*.md)', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    // Should match URLs ending in .md
    expect(matchConfigPattern('/article.md', '/:path*.md')).toEqual({ path: 'article' })
    expect(matchConfigPattern('/news/my-article.md', '/:path*.md')).toEqual({
      path: 'news/my-article',
    })
    // Should NOT match URLs without .md suffix
    expect(matchConfigPattern('/', '/:path*.md')).toBeNull()
    expect(matchConfigPattern('/about', '/:path*.md')).toBeNull()
    expect(matchConfigPattern('/news', '/:path*.md')).toBeNull()
  })

  it('matches :path+ with literal suffix (e.g. /:path+.json)', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    expect(matchConfigPattern('/data.json', '/:path+.json')).toEqual({ path: 'data' })
    expect(matchConfigPattern('/api/users.json', '/:path+.json')).toEqual({ path: 'api/users' })
    // Zero segments before suffix — should NOT match for :path+
    expect(matchConfigPattern('/.json', '/:path+.json')).toBeNull()
    expect(matchConfigPattern('/', '/:path+.json')).toBeNull()
  })

  it('does not regress plain :path* catch-all (no suffix)', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    expect(matchConfigPattern('/docs', '/docs/:path*')).toEqual({ path: '' })
    expect(matchConfigPattern('/docs/intro', '/docs/:path*')).toEqual({ path: 'intro' })
    expect(matchConfigPattern('/docs/guide/getting-started', '/docs/:path*')).toEqual({
      path: 'guide/getting-started',
    })
  })
})

// ---------------------------------------------------------------------------
// has/missing condition matching unit tests (text.config.js redirects/rewrites)

describe('parseCookies', () => {
  it('parses standard cookie header', async () => {
    const { parseCookies } = await import('../src/config/config-matchers.js')
    expect(parseCookies('a=1; b=2; c=three')).toEqual({ a: '1', b: '2', c: 'three' })
  })

  it('returns empty object for null', async () => {
    const { parseCookies } = await import('../src/config/config-matchers.js')
    expect(parseCookies(null)).toEqual({})
  })

  it('returns empty object for empty string', async () => {
    const { parseCookies } = await import('../src/config/config-matchers.js')
    expect(parseCookies('')).toEqual({})
  })

  it('handles cookies with = in value', async () => {
    const { parseCookies } = await import('../src/config/config-matchers.js')
    expect(parseCookies('token=abc=def')).toEqual({ token: 'abc=def' })
  })

  it('trims whitespace around keys and values', async () => {
    const { parseCookies } = await import('../src/config/config-matchers.js')
    expect(parseCookies('  a = 1 ;  b = 2 ')).toEqual({ a: '1', b: '2' })
  })
})

describe('checkHasConditions', () => {
  function makeCtx(
    overrides: Partial<{
      headers: Record<string, string>
      cookies: Record<string, string>
      query: Record<string, string>
      host: string
    }> = {},
  ) {
    const headers = new Headers(overrides.headers ?? {})
    if (overrides.cookies) {
      headers.set(
        'cookie',
        Object.entries(overrides.cookies)
          .map(([k, v]) => `${k}=${v}`)
          .join('; '),
      )
    }
    const query = new URLSearchParams(overrides.query ?? {})
    return {
      headers,
      cookies: overrides.cookies ?? {},
      query,
      host: overrides.host ?? 'localhost',
    }
  }

  it('returns true when no conditions', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    expect(checkHasConditions(undefined, undefined, makeCtx())).toBe(true)
  })

  // -- header conditions --
  it('has header: passes when header present', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({ headers: { 'x-custom': 'yes' } })
    expect(checkHasConditions([{ type: 'header', key: 'x-custom' }], undefined, ctx)).toBe(true)
  })

  it('has header: fails when header absent', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({})
    expect(checkHasConditions([{ type: 'header', key: 'x-custom' }], undefined, ctx)).toBe(false)
  })

  it('has header with value: matches regex', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({ headers: { 'x-auth': 'yes' } })
    expect(
      checkHasConditions(
        [{ type: 'header', key: 'x-auth', value: '(?:yes|true)' }],
        undefined,
        ctx,
      ),
    ).toBe(true)
    expect(
      checkHasConditions(
        [{ type: 'header', key: 'x-auth', value: '(?:no|false)' }],
        undefined,
        ctx,
      ),
    ).toBe(false)
  })

  // -- cookie conditions --
  it('has cookie: passes when cookie present', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({ cookies: { session: 'abc' } })
    expect(checkHasConditions([{ type: 'cookie', key: 'session' }], undefined, ctx)).toBe(true)
  })

  it('has cookie: fails when cookie absent', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({ cookies: {} })
    expect(checkHasConditions([{ type: 'cookie', key: 'session' }], undefined, ctx)).toBe(false)
  })

  it('has cookie with exact value', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({ cookies: { authorized: 'true' } })
    expect(
      checkHasConditions([{ type: 'cookie', key: 'authorized', value: 'true' }], undefined, ctx),
    ).toBe(true)
    expect(
      checkHasConditions([{ type: 'cookie', key: 'authorized', value: 'false' }], undefined, ctx),
    ).toBe(false)
  })

  // -- query conditions --
  it('has query: passes when query param present', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({ query: { page: 'home' } })
    expect(checkHasConditions([{ type: 'query', key: 'page' }], undefined, ctx)).toBe(true)
  })

  it('has query: fails when query param absent', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({ query: {} })
    expect(checkHasConditions([{ type: 'query', key: 'page' }], undefined, ctx)).toBe(false)
  })

  it('has query with regex value', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({ query: { page: 'home' } })
    expect(
      checkHasConditions([{ type: 'query', key: 'page', value: 'home|about' }], undefined, ctx),
    ).toBe(true)
    expect(
      checkHasConditions([{ type: 'query', key: 'page', value: '^settings$' }], undefined, ctx),
    ).toBe(false)
  })

  // -- host conditions --
  it('has host: matches exact value', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({ host: 'example.com' })
    expect(
      checkHasConditions([{ type: 'host', key: '', value: 'example.com' }], undefined, ctx),
    ).toBe(true)
    expect(
      checkHasConditions([{ type: 'host', key: '', value: 'other.com' }], undefined, ctx),
    ).toBe(false)
  })

  it('has host: matches regex value', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({ host: 'staging.example.com' })
    expect(
      checkHasConditions([{ type: 'host', key: '', value: '.*\\.example\\.com' }], undefined, ctx),
    ).toBe(true)
  })

  // -- missing conditions --
  it('missing header: passes when header absent', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({})
    expect(checkHasConditions(undefined, [{ type: 'header', key: 'x-block' }], ctx)).toBe(true)
  })

  it('missing header: fails when header present', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({ headers: { 'x-block': '1' } })
    expect(checkHasConditions(undefined, [{ type: 'header', key: 'x-block' }], ctx)).toBe(false)
  })

  it('missing cookie: passes when cookie absent', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({ cookies: {} })
    expect(checkHasConditions(undefined, [{ type: 'cookie', key: 'stay-here' }], ctx)).toBe(true)
  })

  it('missing cookie: fails when cookie present', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({ cookies: { 'stay-here': '1' } })
    expect(checkHasConditions(undefined, [{ type: 'cookie', key: 'stay-here' }], ctx)).toBe(false)
  })

  // -- combined has + missing --
  it('both has and missing must pass', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({ cookies: { auth: 'yes' } })
    // has: cookie auth present (passes), missing: cookie block absent (passes)
    expect(
      checkHasConditions(
        [{ type: 'cookie', key: 'auth' }],
        [{ type: 'cookie', key: 'block' }],
        ctx,
      ),
    ).toBe(true)
    // has: cookie auth present (passes), missing: cookie auth absent (fails — it's present)
    expect(
      checkHasConditions([{ type: 'cookie', key: 'auth' }], [{ type: 'cookie', key: 'auth' }], ctx),
    ).toBe(false)
  })

  it('all has conditions must match (conjunction)', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const ctx = makeCtx({ cookies: { a: '1' }, query: { page: 'home' } })
    // Both match
    expect(
      checkHasConditions(
        [
          { type: 'cookie', key: 'a' },
          { type: 'query', key: 'page' },
        ],
        undefined,
        ctx,
      ),
    ).toBe(true)
    // One doesn't match
    expect(
      checkHasConditions(
        [
          { type: 'cookie', key: 'a' },
          { type: 'query', key: 'missing' },
        ],
        undefined,
        ctx,
      ),
    ).toBe(false)
  })
})

describe('matchHeaders', () => {
  function makeCtx(
    overrides: Partial<{
      headers: Record<string, string>
      cookies: Record<string, string>
      query: Record<string, string>
      host: string
    }> = {},
  ) {
    const headers = new Headers(overrides.headers ?? {})
    if (overrides.cookies) {
      headers.set(
        'cookie',
        Object.entries(overrides.cookies)
          .map(([k, v]) => `${k}=${v}`)
          .join('; '),
      )
    }
    const query = new URLSearchParams(overrides.query ?? {})
    return {
      headers,
      cookies: overrides.cookies ?? {},
      query,
      host: overrides.host ?? 'localhost',
    }
  }

  it('applies headers when has header condition is satisfied', async () => {
    const { matchHeaders } = await import('../src/config/config-matchers.js')
    const rules: any[] = [
      {
        source: '/about',
        has: [{ type: 'header', key: 'x-user-tier', value: 'pro' }],
        headers: [{ key: 'x-conditional-header', value: 'enabled' }],
      },
    ]

    const matched = matchHeaders('/about', rules, makeCtx({ headers: { 'x-user-tier': 'pro' } }))
    expect(matched).toEqual([{ key: 'x-conditional-header', value: 'enabled' }])
  })

  it('does not apply headers when missing cookie condition fails', async () => {
    const { matchHeaders } = await import('../src/config/config-matchers.js')
    const rules: any[] = [
      {
        source: '/about',
        missing: [{ type: 'cookie', key: 'no-config-header' }],
        headers: [{ key: 'x-conditional-header', value: 'enabled' }],
      },
    ]

    const matched = matchHeaders('/about', rules, makeCtx({ cookies: { 'no-config-header': '1' } }))
    expect(matched).toEqual([])
  })

  it('applies headers when has query condition is satisfied', async () => {
    const { matchHeaders } = await import('../src/config/config-matchers.js')
    const rules: any[] = [
      {
        source: '/about',
        has: [{ type: 'query', key: 'preview', value: '1' }],
        headers: [{ key: 'x-preview-header', value: 'true' }],
      },
    ]

    const matched = matchHeaders('/about', rules, makeCtx({ query: { preview: '1' } }))
    expect(matched).toEqual([{ key: 'x-preview-header', value: 'true' }])
  })

  it('skips conditional header rule when has condition is not met', async () => {
    const { matchHeaders } = await import('../src/config/config-matchers.js')
    const rules: any[] = [
      {
        source: '/about',
        has: [{ type: 'header', key: 'x-user-tier', value: 'pro' }],
        headers: [{ key: 'x-conditional-header', value: 'enabled' }],
      },
    ]

    // Request without the required header should not match
    const matched = matchHeaders('/about', rules, makeCtx())
    expect(matched).toEqual([])
  })

  // Regression for #1331: under `trailingSlash: true` the incoming pathname
  // arrives as `/about/`, but header source patterns are written without a
  // trailing slash. `matchHeaders` must strip the slash before matching.
  it('matches when the request pathname has a trailing slash', async () => {
    const { matchHeaders } = await import('../src/config/config-matchers.js')
    const rules: any[] = [
      {
        source: '/about',
        headers: [{ key: 'x-static-header', value: '1' }],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'x-api-header', value: '1' }],
      },
    ]

    const aboutMatched = matchHeaders('/about/', rules, makeCtx())
    expect(aboutMatched).toEqual([{ key: 'x-static-header', value: '1' }])

    const apiMatched = matchHeaders('/api/users/', rules, makeCtx())
    expect(apiMatched).toEqual([{ key: 'x-api-header', value: '1' }])
  })
})

describe('matchHeaders compiled source cache', () => {
  // Regression test: escapeHeaderSource() + safeRegExp() were re-run on every
  // request for every header rule. The result is now cached in _compiledHeaderSourceCache
  // keyed by rule.source so subsequent calls skip the tokeniser and isSafeRegex.
  function makeCtx(h: Record<string, string> = {}) {
    return {
      headers: new Headers(h),
      cookies: {},
      query: new URLSearchParams(),
      host: 'localhost',
    }
  }

  it('returns consistent results when the same source is matched multiple times', async () => {
    const { matchHeaders } = await import('../src/config/config-matchers.js')
    const rules: any[] = [
      {
        source: '/blog/:slug',
        headers: [{ key: 'x-content-type', value: 'article' }],
      },
    ]

    // First call — populates _compiledHeaderSourceCache.
    const first = matchHeaders('/blog/hello-world', rules, makeCtx())
    expect(first).toEqual([{ key: 'x-content-type', value: 'article' }])

    // Second call — must hit the cache and return the same result.
    const second = matchHeaders('/blog/hello-world', rules, makeCtx())
    expect(second).toEqual(first)

    // Different matching pathname, same rule — still uses cached regex.
    const third = matchHeaders('/blog/another-post', rules, makeCtx())
    expect(third).toEqual([{ key: 'x-content-type', value: 'article' }])

    // Non-matching pathname.
    const fourth = matchHeaders('/about', rules, makeCtx())
    expect(fourth).toEqual([])
  })

  it('caches regex-bearing source patterns (containing `(`)', async () => {
    const { matchHeaders } = await import('../src/config/config-matchers.js')
    const rules: any[] = [
      {
        source: '/:locale(en|fr|de)/blog',
        headers: [{ key: 'x-locale-blog', value: '1' }],
      },
    ]

    const first = matchHeaders('/en/blog', rules, makeCtx())
    expect(first).toEqual([{ key: 'x-locale-blog', value: '1' }])

    // Cache hit — same source pattern, different matching pathname.
    const second = matchHeaders('/fr/blog', rules, makeCtx())
    expect(second).toEqual([{ key: 'x-locale-blog', value: '1' }])

    // Non-matching locale.
    const third = matchHeaders('/zh/blog', rules, makeCtx())
    expect(third).toEqual([])
  })
})

describe('checkHasConditions condition value cache', () => {
  // Regression test: safeRegExp(condition.value) was called on every request
  // for every has/missing condition. The result is now cached in
  // _compiledConditionCache keyed by value so isSafeRegex runs at most once.
  function makeCtx(
    overrides: {
      headers?: Record<string, string>
      cookies?: Record<string, string>
      query?: Record<string, string>
      host?: string
    } = {},
  ) {
    return {
      headers: new Headers(overrides.headers ?? {}),
      cookies: overrides.cookies ?? {},
      query: new URLSearchParams(overrides.query ?? {}),
      host: overrides.host ?? 'localhost',
    }
  }

  it('returns consistent results when the same condition value is evaluated multiple times', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const has = [{ type: 'header' as const, key: 'x-tier', value: 'pro|enterprise' }]

    // First call — populates _compiledConditionCache for "pro|enterprise".
    expect(checkHasConditions(has, undefined, makeCtx({ headers: { 'x-tier': 'pro' } }))).toBe(true)

    // Second call — must hit the cache.
    expect(
      checkHasConditions(has, undefined, makeCtx({ headers: { 'x-tier': 'enterprise' } })),
    ).toBe(true)

    // Non-matching value.
    expect(checkHasConditions(has, undefined, makeCtx({ headers: { 'x-tier': 'free' } }))).toBe(
      false,
    )
  })

  it('caches condition values across all condition types (header, cookie, query, host)', async () => {
    const { checkHasConditions } = await import('../src/config/config-matchers.js')
    const sharedPattern = '^v\\d+$' // a pattern that will be cached once and reused

    // header
    const hasHeader = [{ type: 'header' as const, key: 'x-version', value: sharedPattern }]
    expect(
      checkHasConditions(hasHeader, undefined, makeCtx({ headers: { 'x-version': 'v3' } })),
    ).toBe(true)
    expect(
      checkHasConditions(hasHeader, undefined, makeCtx({ headers: { 'x-version': 'v3' } })),
    ).toBe(true)

    // cookie — same pattern string, should hit cache populated by header call above
    const hasCookie = [{ type: 'cookie' as const, key: 'ver', value: sharedPattern }]
    expect(checkHasConditions(hasCookie, undefined, makeCtx({ cookies: { ver: 'v1' } }))).toBe(true)
    expect(checkHasConditions(hasCookie, undefined, makeCtx({ cookies: { ver: 'beta' } }))).toBe(
      false,
    )

    // query
    const hasQuery = [{ type: 'query' as const, key: 'v', value: sharedPattern }]
    expect(checkHasConditions(hasQuery, undefined, makeCtx({ query: { v: 'v2' } }))).toBe(true)

    // host
    const hasHost = [{ type: 'host' as const, key: '', value: sharedPattern }]
    expect(checkHasConditions(hasHost, undefined, makeCtx({ host: 'v9' }))).toBe(true)
    expect(checkHasConditions(hasHost, undefined, makeCtx({ host: 'prod' }))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isExternalUrl unit tests (external rewrite detection)

describe('isExternalUrl', () => {
  it('returns true for https:// URLs', async () => {
    const { isExternalUrl } = await import('../src/config/config-matchers.js')
    expect(isExternalUrl('https://example.com/path')).toBe(true)
    expect(isExternalUrl('https://us.i.posthog.com/decide?v=3')).toBe(true)
  })

  it('returns true for http:// URLs', async () => {
    const { isExternalUrl } = await import('../src/config/config-matchers.js')
    expect(isExternalUrl('http://example.com/api')).toBe(true)
  })

  it('returns false for relative paths', async () => {
    const { isExternalUrl } = await import('../src/config/config-matchers.js')
    expect(isExternalUrl('/about')).toBe(false)
    expect(isExternalUrl('/api/test')).toBe(false)
    expect(isExternalUrl('/')).toBe(false)
  })

  it('returns true for protocol-relative URLs', async () => {
    const { isExternalUrl } = await import('../src/config/config-matchers.js')
    expect(isExternalUrl('//example.com')).toBe(true)
    expect(isExternalUrl('//cdn.example.com/image.png')).toBe(true)
  })

  it('returns true for exotic URL schemes (data:, javascript:, blob:, ftp:)', async () => {
    const { isExternalUrl } = await import('../src/config/config-matchers.js')
    expect(isExternalUrl('data:text/html,<h1>hi</h1>')).toBe(true)
    expect(isExternalUrl('javascript:alert(1)')).toBe(true)
    expect(isExternalUrl('blob:http://localhost/abc')).toBe(true)
    expect(isExternalUrl('ftp://files.example.com/pub')).toBe(true)
  })

  it('returns false for hash-only and bare strings', async () => {
    const { isExternalUrl } = await import('../src/config/config-matchers.js')
    expect(isExternalUrl('#section')).toBe(false)
    expect(isExternalUrl('about')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// proxyExternalRequest unit tests
