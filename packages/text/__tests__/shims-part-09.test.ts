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
describe('TextURL basePath and locale properties', () => {
  const i18nConfig = {
    textConfig: {
      i18n: {
        locales: ['en', 'fr', 'de'],
        defaultLocale: 'en',
      },
    },
  }

  it('basePath defaults to empty string when no config provided', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/dashboard')
    expect(url.basePath).toBe('')
  })

  it('basePath returns the configured value', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/dashboard', undefined, {
      basePath: '/app',
    })
    expect(url.basePath).toBe('/app')
  })

  it('basePath setter normalizes leading slash', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/dashboard')
    url.basePath = 'app'
    expect(url.basePath).toBe('/app')
  })

  it('basePath is preserved through clone()', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/dashboard', undefined, {
      basePath: '/docs',
    })
    const cloned = url.clone()
    expect(cloned.basePath).toBe('/docs')
  })

  it('locale defaults to empty string when no i18n config', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/about')
    expect(url.locale).toBe('')
    expect(url.defaultLocale).toBeUndefined()
  })

  it('locale returns the detected locale from pathname', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/fr/about', undefined, i18nConfig)
    expect(url.locale).toBe('fr')
    expect(url.defaultLocale).toBe('en')
    expect(url.pathname).toBe('/about')
  })

  it('locale falls back to defaultLocale when no locale in pathname', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/about', undefined, i18nConfig)
    expect(url.locale).toBe('en')
    expect(url.pathname).toBe('/about')
  })

  it('locale detection is case-insensitive', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/FR/about', undefined, i18nConfig)
    expect(url.locale).toBe('fr')
    expect(url.pathname).toBe('/about')
  })

  it('locale setter updates the locale and affects href', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/fr/about', undefined, i18nConfig)
    expect(url.locale).toBe('fr')
    url.locale = 'de'
    expect(url.locale).toBe('de')
    expect(url.href).toContain('/de/about')
  })

  it('locale setter throws on invalid locale', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/fr/about', undefined, i18nConfig)
    expect(() => {
      url.locale = 'es'
    }).toThrow(TypeError)
  })

  it('locales returns a copy of the configured locales array', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/about', undefined, i18nConfig)
    const locales = url.locales!
    expect(locales).toEqual(['en', 'fr', 'de'])
    // Mutating the returned array must not affect internals
    locales.push('es')
    expect(url.locales).toEqual(['en', 'fr', 'de'])
  })

  it('locales returns undefined without i18n config', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/about')
    expect(url.locales).toBeUndefined()
  })

  // --- href / toString() reconstruction ---

  it('toString() preserves locale prefix in serialized URL', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/fr/about', undefined, i18nConfig)
    expect(url.toString()).toBe('http://localhost/fr/about')
    expect(url.href).toBe('http://localhost/fr/about')
  })

  it('toString() omits defaultLocale prefix (matches Text.js)', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/about', undefined, i18nConfig)
    expect(url.locale).toBe('en') // defaultLocale
    expect(url.toString()).toBe('http://localhost/about')
  })

  it('setting locale changes the serialized href', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/fr/about', undefined, i18nConfig)
    url.locale = 'de'
    expect(url.href).toBe('http://localhost/de/about')
  })

  it('href includes basePath prefix', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/dashboard', undefined, {
      basePath: '/app',
    })
    expect(url.pathname).toBe('/dashboard')
    expect(url.href).toBe('http://localhost/app/dashboard')
  })

  it('href includes both basePath and locale prefix', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/fr/about', undefined, {
      basePath: '/app',
      ...i18nConfig,
    })
    expect(url.pathname).toBe('/about')
    expect(url.href).toBe('http://localhost/app/fr/about')
  })

  it('href preserves port, search, and hash when basePath is active', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost:3000/app/dashboard?q=1#top', undefined, {
      basePath: '/app',
    })
    expect(url.pathname).toBe('/dashboard')
    expect(url.href).toBe('http://localhost:3000/app/dashboard?q=1#top')
  })

  it('root locale path /fr produces pathname /', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/fr', undefined, i18nConfig)
    expect(url.locale).toBe('fr')
    expect(url.pathname).toBe('/')
    expect(url.href).toBe('http://localhost/fr')
  })

  it('href setter re-analyzes locale', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/fr/about', undefined, i18nConfig)
    expect(url.locale).toBe('fr')
    url.href = 'http://localhost/de/contact'
    expect(url.locale).toBe('de')
    expect(url.pathname).toBe('/contact')
  })

  it('href setter re-strips basePath before locale analysis', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/app/fr/about', undefined, {
      basePath: '/app',
      ...i18nConfig,
    })
    url.href = 'http://localhost/app/de/contact'
    expect(url.locale).toBe('de')
    expect(url.pathname).toBe('/contact')
    expect(url.basePath).toBe('/app')
  })

  it('basePath setter to empty string clears basePath', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/dashboard', undefined, {
      basePath: '/app',
    })
    expect(url.basePath).toBe('/app')
    url.basePath = ''
    expect(url.basePath).toBe('')
    expect(url.href).toBe('http://localhost/dashboard')
  })

  it('basePath root path has no trailing slash', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/app', undefined, {
      basePath: '/app',
    })
    expect(url.pathname).toBe('/')
    expect(url.href).toBe('http://localhost/app')
  })

  it('basePath is stripped from input URL (basePath-only, no i18n)', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/app/dashboard', undefined, {
      basePath: '/app',
    })
    expect(url.pathname).toBe('/dashboard')
    expect(url.basePath).toBe('/app')
    expect(url.href).toBe('http://localhost/app/dashboard')
  })

  it('pathname setter does not re-analyze locale', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/fr/about', undefined, i18nConfig)
    url.pathname = '/contact'
    expect(url.locale).toBe('fr') // unchanged
    expect(url.pathname).toBe('/contact')
    expect(url.href).toBe('http://localhost/fr/contact')
  })

  it('basePath root path with default locale has no trailing slash', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/app', undefined, {
      basePath: '/app',
      ...i18nConfig,
    })
    expect(url.locale).toBe('en') // default locale, no prefix in output
    expect(url.pathname).toBe('/')
    expect(url.href).toBe('http://localhost/app')
  })

  it('locale setter resets to defaultLocale when set to undefined with i18n', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/fr/about', undefined, i18nConfig)
    expect(url.locale).toBe('fr')
    url.locale = undefined
    expect(url.locale).toBe('en') // falls back to defaultLocale
    expect(url.href).toBe('http://localhost/about') // default locale omitted from prefix
  })

  it('locale setter resets to defaultLocale when set to empty string with i18n', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/de/contact', undefined, i18nConfig)
    url.locale = ''
    expect(url.locale).toBe('en')
  })

  it('searchParams mutations are reflected in href with basePath and locale', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/fr/about', undefined, {
      basePath: '/app',
      ...i18nConfig,
    })
    url.searchParams.set('q', '2')
    expect(url.href).toBe('http://localhost/app/fr/about?q=2')
  })

  // --- clone() ---

  it('clone() preserves locale, basePath, and config through constructor', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/fr/about', undefined, {
      basePath: '/app',
      ...i18nConfig,
    })
    const cloned = url.clone()
    expect(cloned.basePath).toBe('/app')
    expect(cloned.locale).toBe('fr')
    expect(cloned.defaultLocale).toBe('en')
    expect(cloned.pathname).toBe('/about')
    expect(cloned.href).toBe('http://localhost/app/fr/about')
    // Mutations on clone don't affect original
    cloned.locale = 'de'
    expect(url.locale).toBe('fr')
  })

  // --- TextRequest integration ---

  it('TextRequest passes basePath and i18n config through to textUrl', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('http://localhost/fr/dashboard', {
      textConfig: {
        basePath: '/app',
        i18n: {
          locales: ['en', 'fr'],
          defaultLocale: 'en',
        },
      },
    })
    expect(req.textUrl.basePath).toBe('/app')
    expect(req.textUrl.locale).toBe('fr')
    expect(req.textUrl.defaultLocale).toBe('en')
    expect(req.textUrl.pathname).toBe('/dashboard')
    expect(req.textUrl.href).toBe('http://localhost/app/fr/dashboard')
  })

  it('TextRequest.url reflects the normalized textUrl href', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('http://localhost/fr/dashboard?tab=settings', {
      textConfig: {
        basePath: '/app',
        i18n: { locales: ['en', 'fr'], defaultLocale: 'en' },
      },
    })

    expect(req.textUrl.href).toBe('http://localhost/app/fr/dashboard?tab=settings')
    expect(req.url).toBe(req.textUrl.href)
  })

  it('TextRequest.url preserves raw input when middleware URL normalization is disabled', async () => {
    const previous = process.env.__TEXT_NO_MIDDLEWARE_URL_NORMALIZE
    process.env.__TEXT_NO_MIDDLEWARE_URL_NORMALIZE = '1'
    try {
      const { TextRequest } = await import('../src/shims/server.js')
      const req = new TextRequest('http://localhost/fr/dashboard?tab=settings', {
        textConfig: {
          basePath: '/app',
          i18n: { locales: ['en', 'fr'], defaultLocale: 'en' },
        },
      })

      expect(req.textUrl.href).toBe('http://localhost/app/fr/dashboard?tab=settings')
      expect(req.url).toBe('http://localhost/fr/dashboard?tab=settings')
    } finally {
      if (previous === undefined) {
        delete process.env.__TEXT_NO_MIDDLEWARE_URL_NORMALIZE
      } else {
        process.env.__TEXT_NO_MIDDLEWARE_URL_NORMALIZE = previous
      }
    }
  })

  it('TextRequest passes config when input is a Request object', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const raw = new Request('http://localhost/app/fr/dashboard')
    const req = new TextRequest(raw, {
      textConfig: {
        basePath: '/app',
        i18n: { locales: ['en', 'fr'], defaultLocale: 'en' },
      },
    })
    expect(req.textUrl.basePath).toBe('/app')
    expect(req.textUrl.locale).toBe('fr')
    expect(req.textUrl.pathname).toBe('/dashboard')
    expect(req.textUrl.href).toBe('http://localhost/app/fr/dashboard')
  })

  it('TextRequest.url normalizes Request input through textUrl', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const raw = new Request('http://localhost/fr/dashboard?tab=settings')
    const req = new TextRequest(raw, {
      textConfig: {
        basePath: '/app',
        i18n: { locales: ['en', 'fr'], defaultLocale: 'en' },
      },
    })

    expect(req.textUrl.href).toBe('http://localhost/app/fr/dashboard?tab=settings')
    expect(req.url).toBe(req.textUrl.href)
  })
})

// ---------------------------------------------------------------------------
// TextURL trailingSlash policy (regression for issue #1332)
//
// The trailingSlash config must reach TextURL so that
// `TextResponse.redirect(request.textUrl)` and friends emit a Location header
// that honours the user's slash policy. Mirrors Text.js's
// `formatTextPathnameInfo` behaviour.

describe('TextURL trailingSlash policy', () => {
  it('appends a trailing slash to href when trailingSlash is true', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/about', undefined, {
      textConfig: { trailingSlash: true },
    })
    expect(url.href).toBe('http://localhost/about/')
    expect(url.toString()).toBe('http://localhost/about/')
  })

  it('does not add a trailing slash to the root path', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/', undefined, {
      textConfig: { trailingSlash: true },
    })
    expect(url.href).toBe('http://localhost/')
  })

  it('preserves trailing slash when trailingSlash is true and input already has one', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/about/', undefined, {
      textConfig: { trailingSlash: true },
    })
    expect(url.href).toBe('http://localhost/about/')
  })

  it('strips trailing slash when trailingSlash is false', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/about/', undefined, {
      textConfig: { trailingSlash: false },
    })
    expect(url.href).toBe('http://localhost/about')
  })

  it('defaults to no trailing slash when trailingSlash is not configured', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/about/')
    expect(url.href).toBe('http://localhost/about')
  })

  it('applies trailingSlash after setting pathname', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/x', undefined, {
      textConfig: { trailingSlash: true },
    })
    url.pathname = '/somewhere'
    expect(url.href).toBe('http://localhost/somewhere/')
  })

  it('applies trailingSlash with basePath', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/dashboard', undefined, {
      basePath: '/app',
      textConfig: { trailingSlash: true },
    })
    expect(url.pathname).toBe('/dashboard')
    expect(url.href).toBe('http://localhost/app/dashboard/')
  })

  it('applies trailingSlash with locale', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/fr/about', undefined, {
      textConfig: {
        i18n: { locales: ['en', 'fr'], defaultLocale: 'en' },
        trailingSlash: true,
      },
    })
    expect(url.locale).toBe('fr')
    expect(url.href).toBe('http://localhost/fr/about/')
  })

  it('preserves search and hash when adding trailing slash', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/about?q=1#top', undefined, {
      textConfig: { trailingSlash: true },
    })
    expect(url.href).toBe('http://localhost/about/?q=1#top')
  })

  it('clone() preserves the trailingSlash config', async () => {
    const { TextURL } = await import('../src/shims/server.js')
    const url = new TextURL('http://localhost/about', undefined, {
      textConfig: { trailingSlash: true },
    })
    const cloned = url.clone()
    cloned.pathname = '/contact'
    expect(cloned.href).toBe('http://localhost/contact/')
  })
})

describe('TextRequest plumbs trailingSlash into textUrl', () => {
  it('forwards trailingSlash from textConfig into the TextURL', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('http://localhost/about', {
      textConfig: { trailingSlash: true },
    })
    expect(req.textUrl.href).toBe('http://localhost/about/')
  })

  it('TextResponse.redirect(request.textUrl) emits a Location that honours trailingSlash', async () => {
    const { TextRequest, TextResponse } = await import('../src/shims/server.js')
    const req = new TextRequest('http://localhost/redirect', {
      textConfig: { trailingSlash: true },
    })
    const url = req.textUrl.clone()
    url.pathname = '/somewhere'
    const res = TextResponse.redirect(url)
    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).not.toBeNull()
    // Location is fully-qualified per the spec; the pathname must include the slash.
    expect(new URL(location!).pathname).toBe('/somewhere/')
  })

  it('TextResponse.redirect(request.textUrl) drops trailing slash when trailingSlash is false', async () => {
    const { TextRequest, TextResponse } = await import('../src/shims/server.js')
    const req = new TextRequest('http://localhost/redirect/', {
      textConfig: { trailingSlash: false },
    })
    const url = req.textUrl.clone()
    url.pathname = '/somewhere/'
    const res = TextResponse.redirect(url)
    const location = res.headers.get('location')
    expect(location).not.toBeNull()
    expect(new URL(location!).pathname).toBe('/somewhere')
  })
})

// ---------------------------------------------------------------------------
// TextResponse.text() with request header forwarding

describe('TextResponse.text() request header forwarding', () => {
  it('forwards request headers as x-middleware-request-* headers', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    const res = TextResponse.text({
      request: {
        headers: new Headers({
          'x-custom-header': 'custom-value',
          authorization: 'Bearer token123',
        }),
      },
    })

    expect(res.headers.get('x-middleware-text')).toBe('1')
    expect(res.headers.get('x-middleware-request-x-custom-header')).toBe('custom-value')
    expect(res.headers.get('x-middleware-request-authorization')).toBe('Bearer token123')
  })

  it('serializes the full override set so omitted headers can be deleted downstream', async () => {
    const { TextResponse } = await import('../src/shims/server.js')

    const forwardedHeaders = new Headers({
      'x-custom-header': 'custom-value',
      'x-added': '1',
    })

    const res = TextResponse.text({
      request: {
        headers: forwardedHeaders,
      },
    })

    const overrideHeaders = res.headers.get('x-middleware-override-headers')
    expect(overrideHeaders).not.toBeNull()
    expect(overrideHeaders!.split(',').sort()).toEqual([...forwardedHeaders.keys()].sort())
    expect(res.headers.get('x-middleware-request-x-custom-header')).toBe('custom-value')
    expect(res.headers.get('x-middleware-request-x-added')).toBe('1')
  })
})
describe('middleware request header overrides', () => {
  // Ported from Text.js: test/e2e/middleware-request-header-overrides/test/index.test.ts
  // https://github.com/vercel/next.js/blob/canary/test/e2e/middleware-request-header-overrides/test/index.test.ts
  it('config-matchers applyMiddlewareRequestHeaders deletes omitted headers from the request', async () => {
    const { applyMiddlewareRequestHeaders } = await import('../src/config/config-matchers.js')

    const middlewareHeaders: Record<string, string> = {
      'x-middleware-override-headers': 'x-keep,x-added',
      'x-middleware-request-x-keep': 'updated',
      'x-middleware-request-x-added': '1',
      'x-middleware-text': '1',
    }

    const request = new Request('http://localhost/test', {
      headers: {
        authorization: 'Bearer secret',
        cookie: 'a=1; b=2',
        'x-keep': 'original',
      },
    })

    const { request: textRequest, postMwReqCtx } = applyMiddlewareRequestHeaders(
      middlewareHeaders,
      request,
    )

    expect(textRequest.headers.get('authorization')).toBeNull()
    expect(textRequest.headers.get('cookie')).toBeNull()
    expect(textRequest.headers.get('x-keep')).toBe('updated')
    expect(textRequest.headers.get('x-added')).toBe('1')
    expect(Object.keys(postMwReqCtx.cookies)).toEqual([])
    expect(middlewareHeaders).toEqual({})
  })

  it('config-matchers applyMiddlewareRequestHeaders preserves existing headers in add-only overrides', async () => {
    const { applyMiddlewareRequestHeaders } = await import('../src/config/config-matchers.js')

    const request = new Request('http://localhost/test', {
      headers: {
        authorization: 'Bearer secret',
        cookie: 'a=1; b=2',
        'x-keep': 'original',
      },
    })

    const forwardedHeaders = new Headers(request.headers)
    forwardedHeaders.set('x-added', '1')

    const middlewareHeaders: Record<string, string> = {
      'x-middleware-override-headers': [...forwardedHeaders.keys()].join(','),
      'x-middleware-request-authorization': forwardedHeaders.get('authorization')!,
      'x-middleware-request-cookie': forwardedHeaders.get('cookie')!,
      'x-middleware-request-x-keep': forwardedHeaders.get('x-keep')!,
      'x-middleware-request-x-added': '1',
      'x-middleware-text': '1',
    }

    const { request: textRequest, postMwReqCtx } = applyMiddlewareRequestHeaders(
      middlewareHeaders,
      request,
    )

    expect(textRequest.headers.get('authorization')).toBe('Bearer secret')
    expect(textRequest.headers.get('cookie')).toBe('a=1; b=2')
    expect(textRequest.headers.get('x-keep')).toBe('original')
    expect(textRequest.headers.get('x-added')).toBe('1')
    expect(postMwReqCtx.cookies).toEqual({ a: '1', b: '2' })
    expect(middlewareHeaders).toEqual({})
  })

  it('text/headers applyMiddlewareRequestHeaders replaces the live request header set', async () => {
    const {
      applyMiddlewareRequestHeaders,
      cookies,
      headers,
      headersContextFromRequest,
      runWithHeadersContext,
    } = await import('../src/shims/headers.js')

    const request = new Request('http://localhost/test', {
      headers: {
        authorization: 'Bearer secret',
        cookie: 'a=1; b=2',
        'x-keep': 'original',
      },
    })

    await runWithHeadersContext(headersContextFromRequest(request), async () => {
      applyMiddlewareRequestHeaders(
        new Headers({
          'x-middleware-override-headers': 'x-keep,x-added',
          'x-middleware-request-x-keep': 'updated',
          'x-middleware-request-x-added': '1',
        }),
      )

      const liveHeaders = await headers()
      const liveCookies = await cookies()

      expect(liveHeaders.get('authorization')).toBeNull()
      expect(liveHeaders.get('cookie')).toBeNull()
      expect(liveHeaders.get('x-keep')).toBe('updated')
      expect(liveHeaders.get('x-added')).toBe('1')
      expect(liveCookies.getAll()).toEqual([])
    })
  })

  it('text/headers applyMiddlewareRequestHeaders invalidates headers() snapshot taken before the override', async () => {
    // Regression: a middleware that reads `headers()` (or `cookies()`) before
    // applying a request-header override would prime a sealed read-only
    // snapshot built from the *pre*-override request. Discovered with
    // @clerk/textjs whose `clerkClient()` reads `headers()` via
    // `buildRequestLike()` during middleware execution; before the fix, the
    // Server Component subsequently received the stale snapshot and saw the
    // pre-override credentials and missing middleware-injected headers.
    const {
      applyMiddlewareRequestHeaders,
      cookies,
      headers,
      headersContextFromRequest,
      runWithHeadersContext,
    } = await import('../src/shims/headers.js')

    const request = new Request('http://localhost/test', {
      headers: {
        authorization: 'Bearer secret',
        cookie: 'a=1; b=2',
        'x-keep': 'original',
      },
    })

    await runWithHeadersContext(headersContextFromRequest(request), async () => {
      // 1. Prime the sealed snapshot — this is exactly what
      //    `clerkMiddleware()` does internally via `buildRequestLike()`.
      const preHeadersPromise = headers()
      const preCookiesPromise = cookies()
      const preHeaders = await preHeadersPromise
      const preCookies = await preCookiesPromise
      expect(preHeaders.get('authorization')).toBe('Bearer secret')
      expect(preHeaders.get('x-keep')).toBe('original')
      expect(preCookies.getAll()).toEqual([
        { name: 'a', value: '1' },
        { name: 'b', value: '2' },
      ])

      // 2. Apply the override — drops `authorization`/`cookie`, adds `x-added`,
      //    and updates `x-keep`.
      applyMiddlewareRequestHeaders(
        new Headers({
          'x-middleware-override-headers': 'x-keep,x-added',
          'x-middleware-request-x-keep': 'updated',
          'x-middleware-request-x-added': '1',
        }),
      )

      // 3. A subsequent `headers()` call — for example from the Server
      //    Component's render — must observe the override, not the snapshot
      //    captured in step 1.
      const postHeadersPromise = headers()
      const postCookiesPromise = cookies()
      const postHeaders = await postHeadersPromise
      const postCookies = await postCookiesPromise

      expect(postHeadersPromise).not.toBe(preHeadersPromise)
      expect(postCookiesPromise).not.toBe(preCookiesPromise)
      expect(postHeaders.get('authorization')).toBeNull()
      expect(postHeaders.get('cookie')).toBeNull()
      expect(postHeaders.get('x-keep')).toBe('updated')
      expect(postHeaders.get('x-added')).toBe('1')
      expect(postCookies.getAll()).toEqual([])
    })
  })
})

// ---------------------------------------------------------------------------
// TextResponse.redirect() with different status codes
