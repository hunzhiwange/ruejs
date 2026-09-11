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
describe('text/router SSR guard (issue #1353)', () => {
  let previousWindow: unknown

  beforeEach(() => {
    previousWindow = (globalThis as any).window
    delete (globalThis as any).window
    vi.resetModules()
  })

  afterEach(() => {
    if (previousWindow === undefined) {
      delete (globalThis as any).window
    } else {
      ;(globalThis as any).window = previousWindow
    }
    vi.resetModules()
  })

  it("Router.push throws the documented 'no router instance' error during SSR (no ReferenceError)", async () => {
    const Router = (await import('../src/shims/router.js?text-ssr')).default
    expect(() => Router.push('/a')).toThrow(/No router instance found/)
  })

  it("Router.replace throws the documented 'no router instance' error during SSR", async () => {
    const Router = (await import('../src/shims/router.js?text-ssr')).default
    expect(() => Router.replace('/a')).toThrow(/No router instance found/)
  })

  it('Router.back throws during SSR instead of touching window.history', async () => {
    const Router = (await import('../src/shims/router.js?text-ssr')).default
    expect(() => Router.back()).toThrow(/No router instance found/)
  })

  it('Router.reload throws during SSR instead of touching window.location', async () => {
    const Router = (await import('../src/shims/router.js?text-ssr')).default
    expect(() => Router.reload()).toThrow(/No router instance found/)
  })

  it('Router.prefetch throws during SSR instead of touching document', async () => {
    const Router = (await import('../src/shims/router.js?text-ssr')).default
    expect(() => Router.prefetch('/a')).toThrow(/No router instance found/)
  })

  it('Router.beforePopState throws during SSR', async () => {
    const Router = (await import('../src/shims/router.js?text-ssr')).default
    expect(() => Router.beforePopState(() => true)).toThrow(/No router instance found/)
  })

  // Render a `withRouter`-wrapped page that calls `router.push()` during SSR
  // (the exact pattern from Text.js's `router-method-ssr.js` fixture).
  // Before the fix this crashed with `ReferenceError: window is not defined`
  // from `performNavigation`. After the fix the render throws the documented
  // "No router instance found" error, which is what Text.js does too.
  it('withRouter component that calls router.push() during SSR throws a render error, not a ReferenceError', async () => {
    const { withRouter, wrapWithRouterContext } = await import('../src/shims/router.js?text-ssr')

    const RouterMethodSSR = ({ router }: { router: TextRouter }) => {
      // Mirrors Text.js's `router-method-ssr.js` fixture, which calls
      // `router.push('/a')` synchronously during SSR. The push must throw
      // synchronously for the test to observe the error; we ignore the
      // returned Promise type via `void` to satisfy the lint rule (the
      // Promise is never produced because the sync throw happens first).
      void router.push('/a')
      return createElement('p', null, 'Navigating...')
    }
    const Wrapped = withRouter(RouterMethodSSR as never)

    let caught: unknown = null
    try {
      await renderAppServerElementToHtml(wrapWithRouterContext(createElement(Wrapped as never)))
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toMatch(/No router instance found/)
    expect((caught as Error).message).not.toMatch(/window is not defined/)
    expect(caught as Error).not.toBeInstanceOf(ReferenceError)
  })
})

// ---------------------------------------------------------------------------
// i18n `locale: false` on rewrites/redirects (issue #1336, item 1).
// Ported from Text.js: test/e2e/i18n-ignore-rewrite-source-locale/rewrites.test.ts
// https://github.com/vercel/next.js/blob/canary/test/e2e/i18n-ignore-rewrite-source-locale/rewrites.test.ts
//
// When a rewrite/redirect source carries `locale: false`, Text.js leaves the
// source pattern untouched (no internal locale prefix is prepended). So a
// source like `/:locale/rewrite-files/:path*` matches the raw locale-prefixed
// path with `:locale` capturing the actual locale segment.
//
// Without `locale: false`, Text.js prepends `/:textInternalLocale(en|sv|nl)?`
// to the source so that the rule matches both prefixed and unprefixed paths
// (and the user-supplied source pattern matches against the de-localised
// remainder).

describe('locale: false on rewrites/redirects (issue #1336)', () => {
  const emptyCtx = {
    headers: new Headers(),
    cookies: {},
    query: new URLSearchParams(),
    host: 'localhost',
  }

  it('matches multi-param source with trailing catch-all (regression)', async () => {
    // Even before the locale: false logic, the underlying matcher must handle
    // a source like `/:locale/rewrite-files/:path*` where there is another
    // named param before the trailing catch-all. Previously this fell into
    // the simple catch-all branch which only handled the trailing param.
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    const pattern = '/:locale/rewrite-files/:path*'
    const result = matchConfigPattern('/en/rewrite-files/file.txt', pattern)
    expect(result).toEqual({ locale: 'en', path: 'file.txt' })

    const nested = matchConfigPattern('/sv/rewrite-files/sub/dir/file.txt', pattern)
    expect(nested).toEqual({ locale: 'sv', path: 'sub/dir/file.txt' })
  })

  it('processRoutes: with locale:false leaves source untouched', async () => {
    const { applyLocaleToRoutes } = await import('../src/config/config-matchers.js')
    const i18n = { locales: ['en', 'sv', 'nl'], defaultLocale: 'en' }
    const rules = [
      {
        source: '/:locale/rewrite-files/:path*',
        destination: '/:path*',
        locale: false as const,
      },
    ]
    const out = applyLocaleToRoutes(rules, i18n, 'rewrite')
    expect(out).toHaveLength(1)
    // locale:false → no internal locale prefix is injected.
    expect(out[0].source).toBe('/:locale/rewrite-files/:path*')
    expect(out[0].destination).toBe('/:path*')
  })

  it('processRoutes: without locale:false prepends the locale alternation', async () => {
    const { applyLocaleToRoutes } = await import('../src/config/config-matchers.js')
    const i18n = { locales: ['en', 'sv', 'nl'], defaultLocale: 'en' }
    const rules = [{ source: '/old', destination: '/new', permanent: true as const }]
    const out = applyLocaleToRoutes(rules, i18n, 'redirect')
    // Text.js produces two source-variants per default-locale (and per domain
    // default locale for redirects): one default-prefixed and one with the
    // internal locale capture group. We only require that one of the produced
    // rules captures the locale alternation so the original source matches
    // localised URLs.
    const hasInternalLocaleVariant = out.some(r => r.source.startsWith('/:textInternalLocale('))
    expect(hasInternalLocaleVariant).toBe(true)
  })

  it('matchRewrite honours locale:false against locale-prefixed paths', async () => {
    const { matchRewrite, applyLocaleToRoutes } = await import('../src/config/config-matchers.js')
    const i18n = { locales: ['en', 'sv', 'nl'], defaultLocale: 'en' }
    const rules = applyLocaleToRoutes(
      [
        {
          source: '/:locale/rewrite-files/:path*',
          destination: '/:path*',
          locale: false as const,
        },
        {
          source: '/:locale/rewrite-api/:path*',
          destination: '/api/:path*',
          locale: false as const,
        },
      ],
      i18n,
      'rewrite',
    )

    expect(matchRewrite('/en/rewrite-files/file.txt', rules, emptyCtx)).toBe('/file.txt')
    expect(matchRewrite('/sv/rewrite-files/file.txt', rules, emptyCtx)).toBe('/file.txt')
    expect(matchRewrite('/nl/rewrite-files/file.txt', rules, emptyCtx)).toBe('/file.txt')
    expect(matchRewrite('/en/rewrite-api/hello', rules, emptyCtx)).toBe('/api/hello')
  })

  it('matchRewrite without locale:false matches all locale-prefixed forms', async () => {
    // When the user writes a plain source like `/old` and i18n is configured,
    // text emits a `/:textInternalLocale(en|sv|nl)` variant so the rule
    // matches any locale-prefixed URL while retaining the original `/old`
    // source for default-locale requests that arrive without a prefix.
    const { matchRewrite, applyLocaleToRoutes } = await import('../src/config/config-matchers.js')
    const i18n = { locales: ['en', 'sv', 'nl'], defaultLocale: 'en' }
    const rules = applyLocaleToRoutes([{ source: '/old', destination: '/new' }], i18n, 'rewrite')

    // Locale-prefixed paths match and the destination is also locale-prefixed.
    expect(matchRewrite('/en/old', rules, emptyCtx)).toBe('/en/new')
    expect(matchRewrite('/sv/old', rules, emptyCtx)).toBe('/sv/new')
    expect(matchRewrite('/nl/old', rules, emptyCtx)).toBe('/nl/new')
    // Unprefixed default-locale paths still match the original source.
    expect(matchRewrite('/old', rules, emptyCtx)).toBe('/new')
  })

  it('matchRedirect uses the locale-static fast path for textInternalLocale variants', async () => {
    // The `_LOCALE_STATIC_RE` detection regex must accept both
    //   `/:locale(en|fr)?/foo` (optional, user-written)
    // and
    //   `/:textInternalLocale(en|fr)/foo` (mandatory, emitted by
    //                                       applyLocaleToRoutes)
    // — otherwise the locale-capture variants emitted by this PR would fall
    // into the linear scan, regressing the O(1) lookup performance of i18n
    // apps with many redirects.
    const { matchRedirect, applyLocaleToRoutes } = await import('../src/config/config-matchers.js')
    const i18n = { locales: ['en', 'sv', 'nl'], defaultLocale: 'en' }
    const rules = applyLocaleToRoutes(
      [{ source: '/security', destination: '/security-dest', permanent: false as const }],
      i18n,
      'redirect',
    )
    // Locale-capture (mandatory) variant must hit the fast path AND substitute
    // the captured locale into the destination.
    expect(matchRedirect('/sv/security', rules, emptyCtx)?.destination).toBe('/sv/security-dest')
    // Default-locale-literal variant strips the prefix.
    expect(matchRedirect('/en/security', rules, emptyCtx)?.destination).toBe('/security-dest')
    // No-locale-prefix path must not be matched by the mandatory variant —
    // the original (unprefixed) source matches and produces the unprefixed
    // destination.
    expect(matchRedirect('/security', rules, emptyCtx)?.destination).toBe('/security-dest')
  })

  it('applyLocaleToRoutes preserves trailing slash when trailingSlash is true', async () => {
    const { applyLocaleToRoutes } = await import('../src/config/config-matchers.js')
    const i18n = { locales: ['en', 'fr'], defaultLocale: 'en' }

    // trailingSlash: false (default) — root source collapses to "".
    const noTrailing = applyLocaleToRoutes(
      [{ source: '/', destination: '/home' }],
      i18n,
      'rewrite',
      { trailingSlash: false },
    )
    const internalNoTrailing = noTrailing.find(r => r.source.startsWith('/:textInternalLocale('))
    expect(internalNoTrailing?.source).toBe('/:textInternalLocale(en|fr)')

    // trailingSlash: true — root source is preserved.
    const withTrailing = applyLocaleToRoutes(
      [{ source: '/', destination: '/home' }],
      i18n,
      'rewrite',
      { trailingSlash: true },
    )
    const internalWithTrailing = withTrailing.find(r =>
      r.source.startsWith('/:textInternalLocale('),
    )
    expect(internalWithTrailing?.source).toBe('/:textInternalLocale(en|fr)/')
  })

  it('matchRedirect emits both default-locale-literal and locale-capture variants', async () => {
    // For redirects, Text.js emits two source variants per rule:
    //   1. `/${defaultLocale}/old` with destination `/new` (no locale prefix
    //      in destination — the default-locale variant strips the prefix).
    //   2. `/:textInternalLocale(en|sv|nl)/old` with destination
    //      `/:textInternalLocale/new` so non-default locales keep their prefix.
    // This matches packages/text/src/lib/load-custom-routes.ts processRoutes.
    const { matchRedirect, applyLocaleToRoutes } = await import('../src/config/config-matchers.js')
    const i18n = { locales: ['en', 'sv', 'nl'], defaultLocale: 'en' }
    const rules = applyLocaleToRoutes(
      [{ source: '/old', destination: '/new', permanent: false as const }],
      i18n,
      'redirect',
    )
    // `/en/old` matches the default-locale-literal variant first → strips the prefix.
    expect(matchRedirect('/en/old', rules, emptyCtx)?.destination).toBe('/new')
    // Non-default locales match the `:textInternalLocale` variant.
    expect(matchRedirect('/sv/old', rules, emptyCtx)?.destination).toBe('/sv/new')
    expect(matchRedirect('/nl/old', rules, emptyCtx)?.destination).toBe('/nl/new')
  })
})

// ---------------------------------------------------------------------------
// Default-locale path normalisation before route matching (issue #1336, item 4).
//
// Text.js normalises every request that arrives without a locale prefix by
// prepending the (domain-aware) defaultLocale before any redirect, rewrite,
// header, or filesystem route match runs. The issue body claims the desired
// behaviour is a 308 from `/en/page` → `/page`, but Text.js does NOT redirect:
// it serves the same content under both URLs and lets the application normalise
// the path internally.
//
// Ported from Text.js:
//   - test/e2e/i18n-default-locale-redirect/i18n-default-locale-redirect.test.ts
//     https://github.com/vercel/next.js/blob/canary/test/e2e/i18n-default-locale-redirect/i18n-default-locale-redirect.test.ts
//   - test/e2e/i18n-ignore-redirect-source-locale/redirects.test.ts
//     https://github.com/vercel/next.js/blob/canary/test/e2e/i18n-ignore-redirect-source-locale/redirects.test.ts
//   - packages/text/src/server/lib/router-utils/resolve-routes.ts (lines ~250-263)
//     https://github.com/vercel/next.js/blob/canary/packages/text/src/server/lib/router-utils/resolve-routes.ts
//
describe('default-locale path normalisation (issue #1336, item 4)', () => {
  const emptyCtx = {
    headers: new Headers(),
    cookies: {},
    query: new URLSearchParams(),
    host: 'localhost',
  }

  it('normalizeDefaultLocalePathname prepends the default locale when path has none', async () => {
    const { normalizeDefaultLocalePathname } = await import('../src/server/pages-i18n.js')
    const i18n = { locales: ['en', 'sv', 'nl'], defaultLocale: 'en' }
    expect(normalizeDefaultLocalePathname('/about', i18n)).toBe('/en/about')
    expect(normalizeDefaultLocalePathname('/', i18n)).toBe('/en')
    expect(normalizeDefaultLocalePathname('/api/health', i18n)).toBe('/en/api/health')
  })

  it('normalizeDefaultLocalePathname leaves locale-prefixed paths untouched', async () => {
    const { normalizeDefaultLocalePathname } = await import('../src/server/pages-i18n.js')
    const i18n = { locales: ['en', 'sv', 'nl'], defaultLocale: 'en' }
    expect(normalizeDefaultLocalePathname('/en/about', i18n)).toBe('/en/about')
    expect(normalizeDefaultLocalePathname('/sv/about', i18n)).toBe('/sv/about')
    expect(normalizeDefaultLocalePathname('/nl', i18n)).toBe('/nl')
  })

  it('normalizeDefaultLocalePathname is a no-op when i18n is not configured', async () => {
    const { normalizeDefaultLocalePathname } = await import('../src/server/pages-i18n.js')
    expect(normalizeDefaultLocalePathname('/about', null)).toBe('/about')
    expect(normalizeDefaultLocalePathname('/', undefined)).toBe('/')
    expect(normalizeDefaultLocalePathname('/about', null, { hostname: 'example.com' })).toBe(
      '/about',
    )
  })

  it('normalizeDefaultLocalePathname skips internal Text.js / text paths', async () => {
    // text internal paths must not get a locale prefix.
    const { normalizeDefaultLocalePathname } = await import('../src/server/pages-i18n.js')
    const i18n = { locales: ['en', 'sv', 'nl'], defaultLocale: 'en' }
    expect(normalizeDefaultLocalePathname('/_text/static/chunks/main.js', i18n)).toBe(
      '/_text/static/chunks/main.js',
    )
    expect(normalizeDefaultLocalePathname('/_text/data/build-id/index.json', i18n)).toBe(
      '/_text/data/build-id/index.json',
    )
    // text-internal endpoints (prerender, image optimisation) likewise.
    expect(normalizeDefaultLocalePathname('/__text/prerender/pages-static-paths', i18n)).toBe(
      '/__text/prerender/pages-static-paths',
    )
  })

  it('normalizeDefaultLocalePathname prefers the domain-mapped default locale', async () => {
    // Text.js's resolve-routes.ts picks `domainLocale.defaultLocale` over the
    // global default when the inbound host matches an i18n.domains entry.
    const { normalizeDefaultLocalePathname } = await import('../src/server/pages-i18n.js')
    const i18n = {
      locales: ['en', 'sv', 'nl'],
      defaultLocale: 'en',
      domains: [{ domain: 'example.nl', defaultLocale: 'nl' }],
    }
    expect(normalizeDefaultLocalePathname('/about', i18n, { hostname: 'example.nl' })).toBe(
      '/nl/about',
    )
    // Unknown host falls back to the global default.
    expect(normalizeDefaultLocalePathname('/about', i18n, { hostname: 'example.com' })).toBe(
      '/en/about',
    )
    // Domain-mapped path that already carries a locale stays untouched.
    expect(normalizeDefaultLocalePathname('/sv/about', i18n, { hostname: 'example.nl' })).toBe(
      '/sv/about',
    )
  })

  it('matchRedirect honours :locale capture on locale:false rules after normalisation', async () => {
    // Ported from Text.js: test/e2e/i18n-ignore-redirect-source-locale/redirects.test.ts
    // A user-supplied source like `/:locale/to-sv` with `locale: false` is
    // matched against the POST-normalisation pathname, so requests that
    // arrive without a locale prefix get the default locale spliced in and
    // the `:locale` segment captures it.
    const { matchRedirect, applyLocaleToRoutes } = await import('../src/config/config-matchers.js')
    const { normalizeDefaultLocalePathname } = await import('../src/server/pages-i18n.js')
    const i18n = { locales: ['en', 'sv', 'nl'], defaultLocale: 'en' }
    const rules = applyLocaleToRoutes(
      [
        {
          source: '/:locale/to-sv',
          destination: '/sv/newpage',
          permanent: false as const,
          locale: false as const,
        },
        {
          source: '/:locale/to-en',
          destination: '/en/newpage',
          permanent: false as const,
          locale: false as const,
        },
        {
          source: '/:locale/to-slash',
          destination: '/newpage',
          permanent: false as const,
          locale: false as const,
        },
        {
          source: '/:locale/to-same',
          destination: '/:locale/newpage',
          permanent: false as const,
          locale: false as const,
        },
      ],
      i18n,
      'redirect',
    )

    // Unprefixed paths get normalised to the default locale first.
    expect(
      matchRedirect(normalizeDefaultLocalePathname('/to-sv', i18n), rules, emptyCtx)?.destination,
    ).toBe('/sv/newpage')
    expect(
      matchRedirect(normalizeDefaultLocalePathname('/to-en', i18n), rules, emptyCtx)?.destination,
    ).toBe('/en/newpage')
    expect(
      matchRedirect(normalizeDefaultLocalePathname('/to-slash', i18n), rules, emptyCtx)
        ?.destination,
    ).toBe('/newpage')
    expect(
      matchRedirect(normalizeDefaultLocalePathname('/to-same', i18n), rules, emptyCtx)?.destination,
    ).toBe('/en/newpage')

    // Locale-prefixed paths are passed through unchanged.
    expect(
      matchRedirect(normalizeDefaultLocalePathname('/sv/to-sv', i18n), rules, emptyCtx)
        ?.destination,
    ).toBe('/sv/newpage')
    expect(
      matchRedirect(normalizeDefaultLocalePathname('/nl/to-same', i18n), rules, emptyCtx)
        ?.destination,
    ).toBe('/nl/newpage')
    expect(
      matchRedirect(normalizeDefaultLocalePathname('/en/to-en', i18n), rules, emptyCtx)
        ?.destination,
    ).toBe('/en/newpage')
  })

  it('matchRedirect on default-locale paths matches the literal default-locale variant', async () => {
    // For redirects WITHOUT `locale: false`, applyLocaleToRoutes already emits
    // a literal `/${defaultLocale}/...` variant. Normalisation routes unprefixed
    // requests through that variant.
    const { matchRedirect, applyLocaleToRoutes } = await import('../src/config/config-matchers.js')
    const { normalizeDefaultLocalePathname } = await import('../src/server/pages-i18n.js')
    const i18n = { locales: ['en', 'sv', 'nl'], defaultLocale: 'en' }
    const rules = applyLocaleToRoutes(
      [{ source: '/old', destination: '/new', permanent: false as const }],
      i18n,
      'redirect',
    )

    // `/old` (unprefixed) → normalised to `/en/old` → matches default-locale variant.
    expect(
      matchRedirect(normalizeDefaultLocalePathname('/old', i18n), rules, emptyCtx)?.destination,
    ).toBe('/new')
    // `/sv/old` already prefixed → matches the locale-capture variant.
    expect(
      matchRedirect(normalizeDefaultLocalePathname('/sv/old', i18n), rules, emptyCtx)?.destination,
    ).toBe('/sv/new')
  })
})
