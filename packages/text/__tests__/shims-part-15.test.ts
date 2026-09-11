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
describe('Pages Router router helpers', () => {
  it('exports wrapWithRouterContext function', async () => {
    const mod = await import('../src/shims/router.js?text-ssr')
    expect(typeof mod.wrapWithRouterContext).toBe('function')
  })

  it('serializes array query values as repeated params for object-form router URLs', async () => {
    const previousWindow = (globalThis as any).window
    const pushState = vi.fn()
    const replaceState = vi.fn()

    ;(globalThis as any).window = {
      location: {
        pathname: '/',
        search: '',
        hash: '',
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn(),
      },
      history: {
        state: null,
        pushState,
        replaceState,
        back: vi.fn(),
      },
      dispatchEvent: vi.fn(),
      scrollTo: vi.fn(),
      scrollX: 0,
      scrollY: 0,
      __TEXT_DATA__: {
        page: '/',
        query: {},
        isFallback: false,
      },
      __TEXT_LOCALE__: undefined,
      __TEXT_LOCALES__: undefined,
      __TEXT_DEFAULT_LOCALE__: undefined,
    }

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      await routerModule.default.push(
        { pathname: '/search', query: { tag: ['a', 'b'], q: 'x' } },
        undefined,
        { shallow: true },
      )

      expect(pushState).toHaveBeenCalledWith({}, '', '/search?tag=a&tag=b&q=x')
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
    }
  })

  it('stringifies scalar query values like Text.js for object-form router URLs', async () => {
    const previousWindow = (globalThis as any).window
    const pushState = vi.fn()
    const replaceState = vi.fn()

    ;(globalThis as any).window = {
      location: {
        pathname: '/',
        search: '',
        hash: '',
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn(),
      },
      history: {
        state: null,
        pushState,
        replaceState,
        back: vi.fn(),
      },
      dispatchEvent: vi.fn(),
      scrollTo: vi.fn(),
      scrollX: 0,
      scrollY: 0,
      __TEXT_DATA__: {
        page: '/',
        query: {},
        isFallback: false,
      },
      __TEXT_LOCALE__: undefined,
      __TEXT_LOCALES__: undefined,
      __TEXT_DEFAULT_LOCALE__: undefined,
    }

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      await routerModule.default.push(
        {
          pathname: '/search',
          query: { page: 2, draft: false, empty: null, missing: undefined, tag: ['a', 'b'] },
        },
        undefined,
        { shallow: true },
      )

      expect(pushState).toHaveBeenCalledWith(
        {},
        '',
        '/search?page=2&draft=false&empty=&missing=&tag=a&tag=b',
      )
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
    }
  })

  it('updates dynamic route params from the URL after shallow navigation', async () => {
    // Ported from Text.js: test/e2e/middleware-rewrites/test/index.test.ts
    // https://github.com/vercel/next.js/blob/canary/test/e2e/middleware-rewrites/test/index.test.ts
    const { useRouter: useCompatRouter } = await import('../src/shims/compat-router.js')
    const routerModule = await import('../src/shims/router.js?text-ssr')

    const previousWindow = (globalThis as any).window
    const win = {
      location: {
        pathname: '/posts/42',
        search: '',
        hash: '',
        href: 'http://localhost/posts/42',
        hostname: 'localhost',
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn(),
      },
      history: {
        state: null,
        pushState: vi.fn((_state: unknown, _title: string, url: string) => {
          const textUrl = new URL(url, win.location.href)
          win.location.pathname = textUrl.pathname
          win.location.search = textUrl.search
          win.location.hash = textUrl.hash
          win.location.href = textUrl.href
        }),
        replaceState: vi.fn(),
        back: vi.fn(),
      },
      dispatchEvent: vi.fn(),
      scrollTo: vi.fn(),
      scrollX: 0,
      scrollY: 0,
      __TEXT_DATA__: {
        page: '/posts/[id]',
        query: { id: '42' },
        isFallback: false,
      },
      __TEXT_LOCALE__: undefined,
      __TEXT_LOCALES__: undefined,
      __TEXT_DEFAULT_LOCALE__: undefined,
    }
    ;(globalThis as any).window = win

    try {
      await routerModule.default.push('/posts/43', undefined, { shallow: true })

      let captured: unknown = 'NOT_SET'
      function Probe() {
        captured = useCompatRouter()
        return createElement('div', null, 'probe')
      }

      await renderAppServerElementToHtml(routerModule.wrapWithRouterContext(createElement(Probe)))

      expect(captured).not.toBeNull()
      expect((captured as any).pathname).toBe('/posts/[id]')
      expect((captured as any).asPath).toBe('/posts/43')
      expect((captured as any).query).toEqual({ id: '43' })
      expect(win.__TEXT_DATA__.query).toEqual({ id: '42' })
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
    }
  })

  it('exposes beforePopState on both the Router singleton and wrapped router context', async () => {
    const mod = await import('../src/shims/router.js?text-ssr')
    const { useRouter: useCompatRouter } = await import('../src/shims/compat-router.js')
    const routerSingleton = mod.default

    let captured: unknown = 'NOT_SET'
    function Probe() {
      captured = useCompatRouter()
      return createElement('div', null, 'probe')
    }

    await renderAppServerElementToHtml(mod.wrapWithRouterContext(createElement(Probe)))

    expect(typeof (routerSingleton as any).beforePopState).toBe('function')
    expect(typeof (captured as any).beforePopState).toBe('function')
  })

  describe('isExternalUrl', () => {
    it('detects https:// as external', () => {
      expect(isExternalUrl('https://example.com')).toBe(true)
      expect(isExternalUrl('https://example.com/path')).toBe(true)
    })

    it('detects http:// as external', () => {
      expect(isExternalUrl('http://example.com')).toBe(true)
    })

    it('detects protocol-relative // as external', () => {
      expect(isExternalUrl('//cdn.example.com/img.png')).toBe(true)
    })

    it('detects native URI schemes as external', () => {
      expect(isExternalUrl('mailto:hello@example.com')).toBe(true)
      expect(isExternalUrl('tel:+123456789')).toBe(true)
      expect(isExternalUrl('sms:+123456789')).toBe(true)
    })

    it('returns false for relative paths', () => {
      expect(isExternalUrl('/about')).toBe(false)
      expect(isExternalUrl('/')).toBe(false)
      expect(isExternalUrl('about')).toBe(false)
    })

    it('returns false for hash-only', () => {
      expect(isExternalUrl('#section')).toBe(false)
    })

    it('returns false for query-only', () => {
      expect(isExternalUrl('?foo=1')).toBe(false)
    })
  })

  describe('isHashOnlyChange', () => {
    it('returns true for hash-only strings starting with #', () => {
      // This works even without window because of the startsWith check
      expect(isHashOnlyChange('#foo')).toBe(true)
      expect(isHashOnlyChange('#')).toBe(true)
      expect(isHashOnlyChange('#section-2')).toBe(true)
    })

    it('returns false for absolute paths without window context', () => {
      // Without a real browser window, URL-based comparison returns false
      // because typeof window === "undefined" → returns false
      expect(isHashOnlyChange('/about')).toBe(false)
      expect(isHashOnlyChange('/about#foo')).toBe(false)
    })

    it('returns false for full URLs without window context', () => {
      expect(isHashOnlyChange('https://example.com#foo')).toBe(false)
    })
  })

  describe('applyNavigationLocale', () => {
    it('does not prefix absolute https:// URLs', async () => {
      const { applyNavigationLocale } = await import('../src/shims/router.js?text-ssr')
      // Simulate a browser-like window so the locale guard is reached
      ;(globalThis as any).window = { __TEXT_DEFAULT_LOCALE__: 'en' }
      try {
        expect(applyNavigationLocale('https://example.com/about', 'fr')).toBe(
          'https://example.com/about',
        )
      } finally {
        delete (globalThis as any).window
      }
    })

    it('does not prefix absolute http:// URLs', async () => {
      const { applyNavigationLocale } = await import('../src/shims/router.js?text-ssr')
      ;(globalThis as any).window = { __TEXT_DEFAULT_LOCALE__: 'en' }
      try {
        expect(applyNavigationLocale('http://example.com/path', 'de')).toBe(
          'http://example.com/path',
        )
      } finally {
        delete (globalThis as any).window
      }
    })

    it('does not prefix protocol-relative // URLs', async () => {
      const { applyNavigationLocale } = await import('../src/shims/router.js?text-ssr')
      ;(globalThis as any).window = { __TEXT_DEFAULT_LOCALE__: 'en' }
      try {
        expect(applyNavigationLocale('//cdn.example.com/img.png', 'fr')).toBe(
          '//cdn.example.com/img.png',
        )
      } finally {
        delete (globalThis as any).window
      }
    })

    it('does not prefix native URI schemes', async () => {
      const { applyNavigationLocale } = await import('../src/shims/router.js?text-ssr')
      ;(globalThis as any).window = { __TEXT_DEFAULT_LOCALE__: 'en' }
      try {
        expect(applyNavigationLocale('mailto:hello@example.com', 'fr')).toBe(
          'mailto:hello@example.com',
        )
        expect(applyNavigationLocale('tel:+123456789', 'fr')).toBe('tel:+123456789')
      } finally {
        delete (globalThis as any).window
      }
    })

    it('prefixes local paths with locale', async () => {
      const { applyNavigationLocale } = await import('../src/shims/router.js?text-ssr')
      ;(globalThis as any).window = { __TEXT_DEFAULT_LOCALE__: 'en' }
      try {
        expect(applyNavigationLocale('/about', 'fr')).toBe('/fr/about')
      } finally {
        delete (globalThis as any).window
      }
    })
  })
})

describe('Pages Router concurrent navigation', () => {
  it('does not install the Pages Router popstate runtime when text/router is imported', async () => {
    const previousWindow = (globalThis as any).window
    const { win } = createNavWindow()
    win.addEventListener = vi.fn()
    ;(globalThis as any).window = win

    try {
      vi.resetModules()
      await import('../src/shims/router.js?text-ssr')

      expect(win.addEventListener).not.toHaveBeenCalledWith('popstate', expect.any(Function))
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
    }
  })

  it('installPagesRouterRuntime registers the Pages Router popstate handler once', async () => {
    const previousWindow = (globalThis as any).window
    const { win } = createNavWindow()
    win.addEventListener = vi.fn()
    ;(globalThis as any).window = win

    try {
      vi.resetModules()
      await import('../src/shims/router.js?text-ssr')
      const { installPagesRouterRuntime } =
        await import('../src/shims/pages-router-runtime.js?text-ssr')

      installPagesRouterRuntime()
      installPagesRouterRuntime()

      expect(win.addEventListener).toHaveBeenCalledTimes(1)
      expect(win.addEventListener).toHaveBeenCalledWith('popstate', expect.any(Function))
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
    }
  })

  /**
   * Helper: create a mock window suitable for non-shallow Router.push().
   * Returns an object with the window mock plus helpers for controlling
   * the fetch responses (deferred promises).
   */
  function createNavWindow() {
    const pushState = vi.fn()
    const replaceState = vi.fn()
    const render = vi.fn()

    const win = {
      location: {
        pathname: '/',
        search: '',
        hash: '',
        href: 'http://localhost/',
        hostname: 'localhost',
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn(),
      },
      history: {
        state: null,
        pushState: pushState as any,
        replaceState: replaceState as any,
        back: vi.fn(),
      },
      dispatchEvent: vi.fn(),
      scrollTo: vi.fn(),
      scrollX: 0,
      scrollY: 0,
      addEventListener: vi.fn(),
      __TEXT_DATA__: {
        page: '/',
        query: {},
        isFallback: false,
        props: { pageProps: {} },
        __text: { pageModuleUrl: '/@fs/pages/index.js' },
      },
      __TEXT_ROOT__: { render },
      __TEXT_APP__: undefined,
      __TEXT_LOCALE__: undefined as string | undefined,
      __TEXT_LOCALES__: undefined as string[] | undefined,
      __TEXT_DEFAULT_LOCALE__: undefined as string | undefined,
    }

    // Make pushState update location to simulate real browser behavior
    pushState.mockImplementation((_state: unknown, _title: string, url: string) => {
      try {
        const parsed = new URL(url, 'http://localhost')
        win.location.pathname = parsed.pathname
        win.location.search = parsed.search
        win.location.hash = parsed.hash
        win.location.href = parsed.href
      } catch {
        // Relative URL — just set pathname
        win.location.pathname = url
        win.location.href = 'http://localhost' + url
      }
    })

    replaceState.mockImplementation((_state: unknown, _title: string, url?: string) => {
      if (!url) return
      try {
        const parsed = new URL(url, 'http://localhost')
        win.location.pathname = parsed.pathname
        win.location.search = parsed.search
        win.location.hash = parsed.hash
        win.location.href = parsed.href
      } catch {
        win.location.pathname = url
        win.location.href = 'http://localhost' + url
      }
    })

    return { win, pushState, replaceState, render }
  }

  /**
   * Build a minimal HTML response that navigateClient can parse.
   * Includes __TEXT_DATA__ with a pageModuleUrl pointing to the given path.
   */
  function buildNavHtml(
    page: string,
    pageModuleUrl: string,
    query: Record<string, unknown> = {},
    i18n?: { locale: string; locales: string[]; defaultLocale: string },
  ): string {
    const textDataScript = buildPagesTextDataScript({
      buildId: null,
      i18n: i18n ?? {},
      pageProps: { page },
      params: query,
      routePattern: page,
      safeJsonStringify,
      text: { pageModuleUrl },
    })
    return `<html><head></head><body>${textDataScript}</body></html>`
  }

  function buildNavHtmlWithText(
    page: string,
    text: { pageModuleUrl?: string; appModuleUrl?: string; hasMiddleware?: boolean },
  ): string {
    const textDataScript = buildPagesTextDataScript({
      buildId: null,
      i18n: {},
      pageProps: { page },
      params: {},
      routePattern: page,
      safeJsonStringify,
      text,
    })
    return `<html><head></head><body>${textDataScript}</body></html>`
  }

  function getFetchHref(url: RequestInfo | URL): string {
    if (typeof url === 'string') return url
    if (url instanceof URL) return url.href
    return url.url
  }

  /**
   * Create a deferred promise for controlling fetch timing.
   */
  function createDeferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }

  function trackHrefAssignments(win: {
    location: {
      href: string
    }
  }): string[] {
    let currentHref = win.location.href
    const assignments: string[] = []

    Object.defineProperty(win.location, 'href', {
      configurable: true,
      enumerable: true,
      get: () => currentHref,
      set: (value: string) => {
        currentHref = value
        assignments.push(value)
      },
    })

    return assignments
  }

  async function expectPagesRouterPushTrailingSlashNormalization({
    target,
    expectedBrowserUrl,
  }: {
    target: string
    expectedBrowserUrl: string
  }): Promise<void> {
    const previousWindow = (globalThis as any).window
    const previousTrailingSlash = process.env.__TEXT_TRAILING_SLASH
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    ;(globalThis as any).window = win
    process.env.__TEXT_TRAILING_SLASH = 'true'
    vi.resetModules()

    globalThis.fetch = vi.fn(async () => {
      throw new Error('shallow trailing-slash normalization test must not fetch page HTML')
    })

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push(target, undefined, { shallow: true })

      expect(result).toBe(true)
      expect(win.history.pushState).toHaveBeenCalledWith({}, '', expectedBrowserUrl)
    } finally {
      if (previousTrailingSlash === undefined) {
        delete process.env.__TEXT_TRAILING_SLASH
      } else {
        process.env.__TEXT_TRAILING_SLASH = previousTrailingSlash
      }
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  }

  it('Pages Router push normalizes query-bearing paths when trailingSlash is true', async () => {
    await expectPagesRouterPushTrailingSlashNormalization({
      target: '/about?hello=world',
      expectedBrowserUrl: '/about/?hello=world',
    })
  })

  it('Pages Router push preserves canonical query-bearing paths when trailingSlash is true', async () => {
    await expectPagesRouterPushTrailingSlashNormalization({
      target: '/about/?hello=world',
      expectedBrowserUrl: '/about/?hello=world',
    })
  })

  it('Pages Router push strips file-looking path slashes when trailingSlash is true', async () => {
    await expectPagesRouterPushTrailingSlashNormalization({
      target: '/catch-all/hello.world/',
      expectedBrowserUrl: '/catch-all/hello.world',
    })
  })

  // Ported from Text.js:
  // test/e2e/basepath/error-pages.test.ts
  // https://github.com/vercel/next.js/blob/canary/test/e2e/basepath/error-pages.test.ts
  it('Pages Router fetches the error route while preserving the masked URL under basePath', async () => {
    const previousWindow = (globalThis as any).window
    const previousBasePath = process.env.__TEXT_ROUTER_BASEPATH
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    const pageModuleUrl = path.resolve(import.meta.dirname, 'fixtures/client-navigation-page.tsx')
    win.location.pathname = '/docs/slug-1'
    win.location.href = 'http://localhost/docs/slug-1'
    ;(globalThis as any).window = win
    process.env.__TEXT_ROUTER_BASEPATH = '/docs'

    const fetch = vi.fn(
      async () =>
        new Response(buildNavHtml('/404', pageModuleUrl), {
          status: 404,
        }),
    )
    globalThis.fetch = fetch

    try {
      vi.resetModules()
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('/404', '/slug-2')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/docs/404', expect.any(Object))
      expect(win.history.pushState).toHaveBeenCalledWith({}, '', '/docs/slug-2')
      expect(win.location.pathname).toBe('/docs/slug-2')
      expect(win.__TEXT_DATA__.page).toBe('/404')
    } finally {
      if (previousBasePath === undefined) {
        delete process.env.__TEXT_ROUTER_BASEPATH
      } else {
        process.env.__TEXT_ROUTER_BASEPATH = previousBasePath
      }
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('Pages Router maps masked /_error client navigations to the 404 page under basePath', async () => {
    const previousWindow = (globalThis as any).window
    const previousBasePath = process.env.__TEXT_ROUTER_BASEPATH
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    const pageModuleUrl = path.resolve(import.meta.dirname, 'fixtures/client-navigation-page.tsx')
    win.location.pathname = '/docs/slug-1'
    win.location.href = 'http://localhost/docs/slug-1'
    ;(globalThis as any).window = win
    process.env.__TEXT_ROUTER_BASEPATH = '/docs'

    const fetch = vi.fn(
      async () =>
        new Response(buildNavHtml('/404', pageModuleUrl), {
          status: 404,
        }),
    )
    globalThis.fetch = fetch

    try {
      vi.resetModules()
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('/_error', '/slug-2')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/docs/404', expect.any(Object))
      expect(win.history.pushState).toHaveBeenCalledWith({}, '', '/docs/slug-2')
      expect(win.location.pathname).toBe('/docs/slug-2')
      expect(win.__TEXT_DATA__.page).toBe('/404')
    } finally {
      if (previousBasePath === undefined) {
        delete process.env.__TEXT_ROUTER_BASEPATH
      } else {
        process.env.__TEXT_ROUTER_BASEPATH = previousBasePath
      }
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('Pages Router fetches /404 through a non-default locale while preserving the masked URL', async () => {
    const previousWindow = (globalThis as any).window
    const previousBasePath = process.env.__TEXT_ROUTER_BASEPATH
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    const pageModuleUrl = path.resolve(import.meta.dirname, 'fixtures/client-navigation-page.tsx')
    win.location.pathname = '/docs/fr/slug-1'
    win.location.href = 'http://localhost/docs/fr/slug-1'
    win.__TEXT_LOCALE__ = 'fr'
    win.__TEXT_LOCALES__ = ['en', 'fr']
    win.__TEXT_DEFAULT_LOCALE__ = 'en'
    ;(globalThis as any).window = win
    process.env.__TEXT_ROUTER_BASEPATH = '/docs'

    const fetch = vi.fn(
      async () =>
        new Response(
          buildNavHtml(
            '/404',
            pageModuleUrl,
            {},
            {
              locale: 'fr',
              locales: ['en', 'fr'],
              defaultLocale: 'en',
            },
          ),
          { status: 404 },
        ),
    )
    globalThis.fetch = fetch

    try {
      vi.resetModules()
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('/404', '/slug-2')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/docs/fr/404', expect.any(Object))
      expect(win.history.pushState).toHaveBeenCalledWith({}, '', '/docs/fr/slug-2')
      expect(win.location.pathname).toBe('/docs/fr/slug-2')
      expect(win.__TEXT_DATA__.page).toBe('/404')
    } finally {
      if (previousBasePath === undefined) {
        delete process.env.__TEXT_ROUTER_BASEPATH
      } else {
        process.env.__TEXT_ROUTER_BASEPATH = previousBasePath
      }
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('Pages Router maps /_error through a non-default locale while preserving the masked URL', async () => {
    const previousWindow = (globalThis as any).window
    const previousBasePath = process.env.__TEXT_ROUTER_BASEPATH
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    const pageModuleUrl = path.resolve(import.meta.dirname, 'fixtures/client-navigation-page.tsx')
    win.location.pathname = '/docs/fr/slug-1'
    win.location.href = 'http://localhost/docs/fr/slug-1'
    win.__TEXT_LOCALE__ = 'fr'
    win.__TEXT_LOCALES__ = ['en', 'fr']
    win.__TEXT_DEFAULT_LOCALE__ = 'en'
    ;(globalThis as any).window = win
    process.env.__TEXT_ROUTER_BASEPATH = '/docs'

    const fetch = vi.fn(
      async () =>
        new Response(
          buildNavHtml(
            '/404',
            pageModuleUrl,
            {},
            {
              locale: 'fr',
              locales: ['en', 'fr'],
              defaultLocale: 'en',
            },
          ),
          { status: 404 },
        ),
    )
    globalThis.fetch = fetch

    try {
      vi.resetModules()
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('/_error', '/slug-2')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/docs/fr/404', expect.any(Object))
      expect(win.history.pushState).toHaveBeenCalledWith({}, '', '/docs/fr/slug-2')
      expect(win.location.pathname).toBe('/docs/fr/slug-2')
      expect(win.__TEXT_DATA__.page).toBe('/404')
    } finally {
      if (previousBasePath === undefined) {
        delete process.env.__TEXT_ROUTER_BASEPATH
      } else {
        process.env.__TEXT_ROUTER_BASEPATH = previousBasePath
      }
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('last push() wins when two overlap — superseded navigation does not render', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    ;(globalThis as any).window = win

    // Two deferred fetches so we control resolution order
    const fetchA = createDeferred<Response>()
    const fetchB = createDeferred<Response>()
    let fetchCount = 0

    globalThis.fetch = async (_url: any, _init: any) => {
      fetchCount++
      if (fetchCount === 1) return fetchA.promise
      return fetchB.promise
    }

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      // Start two navigations — don't await yet
      const navA = Router.push('/page-a')
      // Let microtask queue process so navA's fetch has been called
      await Promise.resolve()
      const navB = Router.push('/page-b')

      // Resolve B first (the winning navigation)
      fetchB.resolve(new Response(buildNavHtml('/page-b', '/@fs/pages/page-b.js')))

      // Resolve A after B (stale — should be ignored)
      fetchA.resolve(new Response(buildNavHtml('/page-a', '/@fs/pages/page-a.js')))

      await Promise.allSettled([navA, navB])

      // The superseded navigation (page-a) must NOT have committed its data.
      // In a real browser page-b would render; in the test env B's dynamic import
      // may fail, so we verify the important invariant: A never writes.
      expect(win.__TEXT_DATA__.page).not.toBe('/page-a')
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('routeChangeComplete does not fire for the superseded navigation', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    ;(globalThis as any).window = win

    const fetchA = createDeferred<Response>()
    const fetchB = createDeferred<Response>()
    let fetchCount = 0

    globalThis.fetch = async (_url: any, _init: any) => {
      fetchCount++
      if (fetchCount === 1) return fetchA.promise
      return fetchB.promise
    }

    const completedUrls: string[] = []
    const onRouteChangeComplete = (...args: unknown[]) => {
      completedUrls.push(String(args[0]))
    }

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      Router.events.on('routeChangeComplete', onRouteChangeComplete)

      // Start two overlapping navigations
      const navA = Router.push('/page-a')
      await Promise.resolve()
      const navB = Router.push('/page-b')

      // Resolve B first, then A
      fetchB.resolve(new Response(buildNavHtml('/page-b', '/@fs/pages/page-b.js')))
      fetchA.resolve(new Response(buildNavHtml('/page-a', '/@fs/pages/page-a.js')))

      await Promise.allSettled([navA, navB])

      // The superseded navigation (page-a) must NOT fire routeChangeComplete.
      // page-b may or may not complete fully (dynamic import may fail in test
      // env), but that's a separate concern. The critical fix is that the
      // cancelled navigation never fires routeChangeComplete.
      expect(completedUrls).not.toContain('/page-a')
    } finally {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      Router.events.off('routeChangeComplete', onRouteChangeComplete)
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('routeChangeError fires for superseded navigation with cancelled error', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    ;(globalThis as any).window = win

    const fetchA = createDeferred<Response>()
    const fetchB = createDeferred<Response>()
    let fetchCount = 0

    globalThis.fetch = async (_url: any, _init: any) => {
      fetchCount++
      if (fetchCount === 1) return fetchA.promise
      return fetchB.promise
    }

    const errors: Array<{ err: unknown; url: string }> = []
    const onRouteChangeError = (...args: unknown[]) => {
      errors.push({ err: args[0], url: String(args[1]) })
    }

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      Router.events.on('routeChangeError', onRouteChangeError)

      // Start two overlapping navigations
      const navA = Router.push('/page-a')
      await Promise.resolve()
      const navB = Router.push('/page-b')

      // Resolve both
      fetchB.resolve(new Response(buildNavHtml('/page-b', '/@fs/pages/page-b.js')))
      fetchA.resolve(new Response(buildNavHtml('/page-a', '/@fs/pages/page-a.js')))

      await Promise.allSettled([navA, navB])

      // The superseded navigation (page-a) should emit routeChangeError
      // with a cancelled error, matching Text.js behavior
      const cancelledError = errors.find(e => e.url === '/page-a')
      expect(cancelledError).toBeDefined()
      const errObj = cancelledError?.err
      expect(errObj).toHaveProperty('cancelled', true)
    } finally {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      Router.events.off('routeChangeError', onRouteChangeError)
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('failed navigation (non-OK response) does not emit routeChangeComplete', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    ;(globalThis as any).window = win

    globalThis.fetch = async (_url: any, _init: any) =>
      new Response('Internal Server Error', { status: 500 })

    const completedUrls: string[] = []
    const errorUrls: string[] = []
    const onRouteChangeComplete = (...args: unknown[]) => {
      completedUrls.push(String(args[0]))
    }
    const onRouteChangeError = (...args: unknown[]) => {
      errorUrls.push(String(args[1]))
    }

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      Router.events.on('routeChangeComplete', onRouteChangeComplete)
      Router.events.on('routeChangeError', onRouteChangeError)

      await Router.push('/failing-page')

      // Should NOT have fired routeChangeComplete for a failed navigation
      expect(completedUrls).not.toContain('/failing-page')
      // Should have fired routeChangeError
      expect(errorUrls).toContain('/failing-page')
    } finally {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      Router.events.off('routeChangeComplete', onRouteChangeComplete)
      Router.events.off('routeChangeError', onRouteChangeError)
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('known navigation failures schedule exactly one hard-navigation fallback', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    const hrefAssignments = trackHrefAssignments(win)
    ;(globalThis as any).window = win

    globalThis.fetch = async (_url: any, _init: any) =>
      new Response('Internal Server Error', { status: 500 })

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('/failing-page')
      // Distinguish the history update from the hard-navigation fallback:
      // pushState writes the absolute browser URL, while the fallback helper
      // writes the raw app-relative URL. The guard is correct only if each
      // happens exactly once.
      const fallbackAssignments = hrefAssignments.filter(value => value === '/failing-page')
      const pushStateAssignments = hrefAssignments.filter(
        value => value === 'http://localhost/failing-page',
      )

      expect(result).toBe(false)
      expect(fallbackAssignments).toHaveLength(1)
      expect(pushStateAssignments).toHaveLength(1)
      // Catch-all: exactly one history write plus exactly one hard-nav fallback.
      expect(hrefAssignments).toHaveLength(2)
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('fetches default-locale root through a locale-qualified URL without changing the browser URL', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    const pageModuleUrl = path.resolve(import.meta.dirname, 'fixtures/client-navigation-page.tsx')
    win.location.pathname = '/new'
    win.location.href = 'http://localhost/new'
    Object.assign(win, {
      __TEXT_LOCALE__: 'en',
      __TEXT_LOCALES__: ['en', 'id'],
      __TEXT_DEFAULT_LOCALE__: 'en',
    })
    ;(globalThis as any).window = win

    const fetch = vi.fn(
      async () =>
        new Response(
          buildNavHtml(
            '/',
            pageModuleUrl,
            {},
            {
              locale: 'en',
              locales: ['en', 'id'],
              defaultLocale: 'en',
            },
          ),
          { status: 200 },
        ),
    )
    globalThis.fetch = fetch

    try {
      vi.resetModules()
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('/')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/en', expect.any(Object))
      expect(win.history.pushState).toHaveBeenCalledWith({}, '', '/')
      expect(win.location.href).toBe('http://localhost/')
      expect(win.__TEXT_LOCALE__).toBe('en')
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('treats a non-locale-prefixed current path as the default locale for root Link navigations', async () => {
    // Ported from Text.js:
    // test/e2e/i18n-preferred-locale-detection/i18n-preferred-locale-detection.test.ts
    // https://github.com/vercel/next.js/blob/canary/test/e2e/i18n-preferred-locale-detection/i18n-preferred-locale-detection.test.ts
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    const pageModuleUrl = path.resolve(import.meta.dirname, 'fixtures/client-navigation-page.tsx')
    win.location.pathname = '/new'
    win.location.href = 'http://localhost/new'
    Object.assign(win, {
      // Simulate a stale/preferred locale signal that must not override the
      // URL-derived Pages Router locale for an unprefixed path.
      __TEXT_LOCALE__: 'id',
      __TEXT_LOCALES__: ['en', 'id'],
      __TEXT_DEFAULT_LOCALE__: 'en',
    })
    ;(globalThis as any).window = win

    const fetch = vi.fn(
      async () =>
        new Response(
          buildNavHtml(
            '/',
            pageModuleUrl,
            {},
            {
              locale: 'en',
              locales: ['en', 'id'],
              defaultLocale: 'en',
            },
          ),
          { status: 200 },
        ),
    )
    globalThis.fetch = fetch

    try {
      vi.resetModules()
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('/')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/en', expect.any(Object))
      expect(win.history.pushState).toHaveBeenCalledWith({}, '', '/')
      expect(win.location.href).toBe('http://localhost/')
      expect(win.__TEXT_LOCALE__).toBe('en')
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('keeps a locale-prefixed current path locale for root Link navigations', async () => {
    // Ported from Text.js:
    // test/e2e/i18n-preferred-locale-detection/i18n-preferred-locale-detection.test.ts
    // https://github.com/vercel/next.js/blob/canary/test/e2e/i18n-preferred-locale-detection/i18n-preferred-locale-detection.test.ts
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    const pageModuleUrl = path.resolve(import.meta.dirname, 'fixtures/client-navigation-page.tsx')
    win.location.pathname = '/id/new'
    win.location.href = 'http://localhost/id/new'
    Object.assign(win, {
      __TEXT_LOCALE__: 'id',
      __TEXT_LOCALES__: ['en', 'id'],
      __TEXT_DEFAULT_LOCALE__: 'en',
    })
    ;(globalThis as any).window = win

    const fetch = vi.fn(
      async () =>
        new Response(
          buildNavHtml(
            '/',
            pageModuleUrl,
            {},
            {
              locale: 'id',
              locales: ['en', 'id'],
              defaultLocale: 'en',
            },
          ),
          { status: 200 },
        ),
    )
    globalThis.fetch = fetch

    try {
      vi.resetModules()
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('/')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/id', expect.any(Object))
      expect(win.history.pushState).toHaveBeenCalledWith({}, '', '/id')
      expect(win.location.href).toBe('http://localhost/id')
      expect(win.__TEXT_LOCALE__).toBe('id')
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('popstate fetches default-locale root through a locale-qualified URL', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const originalCustomEvent = globalThis.CustomEvent
    const listeners = new Map<string, (event: any) => void>()
    const { win } = createNavWindow()
    const pageModuleUrl = path.resolve(import.meta.dirname, 'fixtures/client-navigation-page.tsx')

    win.location.pathname = '/about'
    win.location.href = 'http://localhost/about'
    Object.assign(win, {
      __TEXT_LOCALE__: 'en',
      __TEXT_LOCALES__: ['en', 'id'],
      __TEXT_DEFAULT_LOCALE__: 'en',
    })
    win.addEventListener = vi.fn((type: string, handler: (event: any) => void) => {
      listeners.set(type, handler)
    })

    ;(globalThis as any).window = win
    ;(globalThis as any).CustomEvent = class CustomEventMock {
      constructor(public type: string) {}
    } as any

    const fetch = vi.fn(
      async () =>
        new Response(
          buildNavHtml(
            '/',
            pageModuleUrl,
            {},
            {
              locale: 'en',
              locales: ['en', 'id'],
              defaultLocale: 'en',
            },
          ),
          { status: 200 },
        ),
    )
    globalThis.fetch = fetch

    try {
      vi.resetModules()
      await import('../src/shims/router.js?text-ssr')
      const { installPagesRouterRuntime } =
        await import('../src/shims/pages-router-runtime.js?text-ssr')
      installPagesRouterRuntime()

      const popstateHandler = listeners.get('popstate')
      expect(popstateHandler).toBeDefined()

      win.location.pathname = '/'
      win.location.href = 'http://localhost/'
      popstateHandler!({ state: null })
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(fetch).toHaveBeenCalledWith('/en', expect.any(Object))
      expect(win.location.href).toBe('http://localhost/')
      expect(win.__TEXT_LOCALE__).toBe('en')
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
      ;(globalThis as any).CustomEvent = originalCustomEvent
    }
  })

  it('does not prefix a locale-qualified target with the current locale', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    const pageModuleUrl = path.resolve(import.meta.dirname, 'fixtures/client-navigation-page.tsx')
    Object.assign(win, {
      __TEXT_LOCALE__: 'id',
      __TEXT_LOCALES__: ['en', 'id', 'fr'],
      __TEXT_DEFAULT_LOCALE__: 'en',
    })
    ;(globalThis as any).window = win

    const fetch = vi.fn(
      async () =>
        new Response(
          buildNavHtml(
            '/about',
            pageModuleUrl,
            {},
            {
              locale: 'fr',
              locales: ['en', 'id', 'fr'],
              defaultLocale: 'en',
            },
          ),
          { status: 200 },
        ),
    )
    globalThis.fetch = fetch

    try {
      vi.resetModules()
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('/fr/about')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/fr/about', expect.any(Object))
      expect(win.history.pushState).toHaveBeenCalledWith({}, '', '/fr/about')
      expect(win.location.href).toBe('http://localhost/fr/about')
      expect(win.__TEXT_LOCALE__).toBe('fr')
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('handles Pages Router middleware internal redirects as client-side redirects', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win, replaceState, render } = createNavWindow()
    const pageModuleUrl = path.resolve(import.meta.dirname, 'fixtures/client-navigation-page.tsx')
    Object.assign(win.location, { origin: 'http://localhost' })
    Object.assign(win, {
      __TEXT_LOCALE__: 'en',
      __TEXT_LOCALES__: ['en', 'fr', 'nl', 'es'],
      __TEXT_DEFAULT_LOCALE__: 'en',
    })
    Object.assign(win.__TEXT_DATA__, {
      buildId: 'build-1',
      __text: { ...win.__TEXT_DATA__.__text, hasMiddleware: true },
    })
    Object.assign(win, {
      __TEXT_PAGE_LOADERS__: {
        '/new-home': async () => import(pageModuleUrl),
      },
    })
    ;(globalThis as any).window = win

    const fetch = vi.fn(async (url: RequestInfo | URL) => {
      const href = getFetchHref(url)
      if (href === '/_text/data/build-1/old-home.json') {
        return new Response('{}', {
          headers: { 'x-textjs-redirect': '/new-home' },
          status: 200,
        })
      }
      if (href === '/new-home') {
        return new Response(buildNavHtmlWithText('/new-home', { hasMiddleware: true }))
      }
      throw new Error(`Unexpected fetch: ${href}`)
    })
    globalThis.fetch = fetch

    try {
      vi.resetModules()
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('/old-home')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        '/_text/data/build-1/old-home.json',
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-textjs-data': '1' }),
        }),
      )
      expect(fetch).toHaveBeenNthCalledWith(2, '/new-home', expect.any(Object))
      expect(replaceState).toHaveBeenLastCalledWith({}, '', '/new-home')
      expect(win.location.pathname).toBe('/new-home')
      expect(render).toHaveBeenCalled()
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('does not double-prefix basePath for middleware data redirects', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const previousBasePath = process.env.__TEXT_ROUTER_BASEPATH
    const { win, replaceState, render } = createNavWindow()
    const pageModuleUrl = path.resolve(import.meta.dirname, 'fixtures/client-navigation-page.tsx')
    Object.assign(win.location, {
      origin: 'http://localhost',
      pathname: '/docs',
      href: 'http://localhost/docs',
    })
    Object.assign(win.__TEXT_DATA__, {
      buildId: 'build-1',
      __text: { ...win.__TEXT_DATA__.__text, hasMiddleware: true },
    })
    Object.assign(win, {
      __TEXT_PAGE_LOADERS__: {
        '/new-home': async () => import(pageModuleUrl),
      },
    })
    process.env.__TEXT_ROUTER_BASEPATH = '/docs'
    ;(globalThis as any).window = win

    const fetch = vi.fn(async (url: RequestInfo | URL) => {
      const href = getFetchHref(url)
      if (href === '/docs/_text/data/build-1/old-home.json') {
        return new Response('{}', {
          headers: { 'x-textjs-redirect': '/docs/new-home' },
          status: 200,
        })
      }
      if (href === '/docs/new-home') {
        return new Response(buildNavHtmlWithText('/new-home', { hasMiddleware: true }))
      }
      throw new Error(`Unexpected fetch: ${href}`)
    })
    globalThis.fetch = fetch

    try {
      vi.resetModules()
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('/old-home')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        '/docs/_text/data/build-1/old-home.json',
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-textjs-data': '1' }),
        }),
      )
      expect(fetch).toHaveBeenNthCalledWith(2, '/docs/new-home', expect.any(Object))
      expect(fetch).not.toHaveBeenCalledWith('/docs/docs/new-home', expect.any(Object))
      expect(replaceState).toHaveBeenLastCalledWith({}, '', '/docs/new-home')
      expect(win.location.href).toBe('http://localhost/docs/new-home')
      expect(render).toHaveBeenCalled()
    } finally {
      vi.resetModules()
      if (previousBasePath === undefined) {
        delete process.env.__TEXT_ROUTER_BASEPATH
      } else {
        process.env.__TEXT_ROUTER_BASEPATH = previousBasePath
      }
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('falls through to normal page navigation when the middleware data probe fails', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win, render } = createNavWindow()
    const pageModuleUrl = path.resolve(import.meta.dirname, 'fixtures/client-navigation-page.tsx')
    Object.assign(win.location, { origin: 'http://localhost' })
    Object.assign(win.__TEXT_DATA__, {
      buildId: 'build-1',
      __text: { ...win.__TEXT_DATA__.__text, hasMiddleware: true },
    })
    ;(globalThis as any).window = win

    const fetch = vi.fn(async (url: RequestInfo | URL) => {
      const href = getFetchHref(url)
      if (href === '/_text/data/build-1/old-home.json') {
        throw new TypeError('probe failed')
      }
      if (href === '/old-home') {
        return new Response(buildNavHtml('/old-home', pageModuleUrl))
      }
      throw new Error(`Unexpected fetch: ${href}`)
    })
    globalThis.fetch = fetch

    try {
      vi.resetModules()
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('/old-home')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        '/_text/data/build-1/old-home.json',
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-textjs-data': '1' }),
        }),
      )
      expect(fetch).toHaveBeenNthCalledWith(2, '/old-home', expect.any(Object))
      expect(win.location.href).toBe('http://localhost/old-home')
      expect(render).toHaveBeenCalled()
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('hard-navigates to the final middleware redirect URL when it is not a page', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    const hrefAssignments = trackHrefAssignments(win)
    Object.assign(win.location, { origin: 'http://localhost' })
    Object.assign(win, {
      __TEXT_LOCALE__: 'en',
      __TEXT_LOCALES__: ['en', 'fr', 'nl', 'es'],
      __TEXT_DEFAULT_LOCALE__: 'en',
    })
    Object.assign(win.__TEXT_DATA__, {
      buildId: 'build-1',
      __text: { ...win.__TEXT_DATA__.__text, hasMiddleware: true },
    })
    ;(globalThis as any).window = win

    const fetch = vi.fn(async (url: RequestInfo | URL) => {
      const href = getFetchHref(url)
      if (href === '/_text/data/build-1/nl/to.json?pathname=/api/ok') {
        return new Response('{}', {
          headers: { 'x-textjs-redirect': '/nl/api/ok' },
          status: 200,
        })
      }
      if (href === '/api/ok') return new Response('ok', { status: 200 })
      throw new Error(`Unexpected fetch: ${href}`)
    })
    globalThis.fetch = fetch

    try {
      vi.resetModules()
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('/to?pathname=/api/ok', undefined, { locale: 'nl' })

      expect(result).toBe(false)
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        '/_text/data/build-1/nl/to.json?pathname=/api/ok',
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-textjs-data': '1' }),
        }),
      )
      expect(hrefAssignments).toContain('http://localhost/nl/to?pathname=/api/ok')
      expect(hrefAssignments).toContain('/api/ok')
      expect(hrefAssignments).not.toContain('/nl/api/ok')
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  async function expectBasePathHashOnlyPush({
    browserPath,
    target,
    expectedBrowserUrl,
    expectedEventUrl,
  }: {
    browserPath: string
    target: string
    expectedBrowserUrl: string
    expectedEventUrl: string
  }) {
    const previousWindow = (globalThis as any).window
    const previousDocument = (globalThis as any).document
    const originalFetch = globalThis.fetch
    const previousBasePath = process.env.__TEXT_ROUTER_BASEPATH
    const { win } = createNavWindow()
    win.location.pathname = browserPath
    win.location.href = `http://localhost${browserPath}`
    ;(globalThis as any).window = win
    ;(globalThis as any).document = {
      getElementById: vi.fn(() => ({ scrollIntoView: vi.fn() })),
    }
    process.env.__TEXT_ROUTER_BASEPATH = '/app'
    vi.resetModules()

    const fetch = vi.fn(async () => {
      throw new Error('hash-only navigations must not fetch page HTML')
    })
    globalThis.fetch = fetch

    const hashEvents: string[] = []
    const routeEvents: string[] = []
    const onHashChangeStart = (...args: unknown[]) => {
      hashEvents.push(`start:${String(args[0])}`)
    }
    const onHashChangeComplete = (...args: unknown[]) => {
      hashEvents.push(`complete:${String(args[0])}`)
    }
    const onRouteChangeStart = (...args: unknown[]) => {
      routeEvents.push(`start:${String(args[0])}`)
    }

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      Router.events.on('hashChangeStart', onHashChangeStart)
      Router.events.on('hashChangeComplete', onHashChangeComplete)
      Router.events.on('routeChangeStart', onRouteChangeStart)

      const result = await Router.push(target)

      expect(result).toBe(true)
      expect(fetch).not.toHaveBeenCalled()
      expect(win.history.pushState).toHaveBeenCalledWith({}, '', expectedBrowserUrl)
      expect(hashEvents).toEqual([`start:${expectedEventUrl}`, `complete:${expectedEventUrl}`])
      expect(routeEvents).toEqual([])
    } finally {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      Router.events.off('hashChangeStart', onHashChangeStart)
      Router.events.off('hashChangeComplete', onHashChangeComplete)
      Router.events.off('routeChangeStart', onRouteChangeStart)
      if (previousBasePath === undefined) {
        delete process.env.__TEXT_ROUTER_BASEPATH
      } else {
        process.env.__TEXT_ROUTER_BASEPATH = previousBasePath
      }
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      if (previousDocument === undefined) {
        delete (globalThis as any).document
      } else {
        ;(globalThis as any).document = previousDocument
      }
      globalThis.fetch = originalFetch
    }
  }

  it('treats app-relative hash navigations as hash-only when basePath is configured', async () => {
    await expectBasePathHashOnlyPush({
      browserPath: '/app/router-events-test',
      target: '/router-events-test#section-1',
      expectedBrowserUrl: '/app/router-events-test#section-1',
      expectedEventUrl: '/router-events-test#section-1',
    })
  })

  it('scrolls hash-only pushes to URI-decoded id targets', async () => {
    const previousWindow = (globalThis as any).window
    const previousDocument = (globalThis as any).document
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    ;(globalThis as any).window = win

    const target = { scrollIntoView: vi.fn() }
    const getElementById = vi.fn((id: string) => (id === 'hello world' ? target : null))
    const getElementsByName = vi.fn(() => [])
    ;(globalThis as any).document = { getElementById, getElementsByName }
    globalThis.fetch = vi.fn(async () => {
      throw new Error('hash-only navigations must not fetch page HTML')
    })
    vi.resetModules()

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('#hello%20world')

      expect(result).toBe(true)
      expect(getElementById).toHaveBeenCalledWith('hello world')
      expect(getElementsByName).not.toHaveBeenCalled()
      expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' })
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      if (previousDocument === undefined) {
        delete (globalThis as any).document
      } else {
        ;(globalThis as any).document = previousDocument
      }
      globalThis.fetch = originalFetch
    }
  })

  it('scrolls hash-only pushes to named anchors when no id matches', async () => {
    const previousWindow = (globalThis as any).window
    const previousDocument = (globalThis as any).document
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    ;(globalThis as any).window = win

    const target = { scrollIntoView: vi.fn() }
    const getElementById = vi.fn(() => null)
    const getElementsByName = vi.fn((name: string) => (name === 'legacy-anchor' ? [target] : []))
    ;(globalThis as any).document = { getElementById, getElementsByName }
    globalThis.fetch = vi.fn(async () => {
      throw new Error('hash-only navigations must not fetch page HTML')
    })
    vi.resetModules()

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('#legacy-anchor')

      expect(result).toBe(true)
      expect(getElementById).toHaveBeenCalledWith('legacy-anchor')
      expect(getElementsByName).toHaveBeenCalledWith('legacy-anchor')
      expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' })
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      if (previousDocument === undefined) {
        delete (globalThis as any).document
      } else {
        ;(globalThis as any).document = previousDocument
      }
      globalThis.fetch = originalFetch
    }
  })

  it('does not scroll hash-only pushes when scroll is false', async () => {
    const previousWindow = (globalThis as any).window
    const previousDocument = (globalThis as any).document
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    ;(globalThis as any).window = win

    const target = { scrollIntoView: vi.fn() }
    const getElementById = vi.fn(() => target)
    const getElementsByName = vi.fn(() => [])
    ;(globalThis as any).document = { getElementById, getElementsByName }
    globalThis.fetch = vi.fn(async () => {
      throw new Error('hash-only navigations must not fetch page HTML')
    })
    vi.resetModules()

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      const result = await Router.push('#legacy-anchor', undefined, { scroll: false })

      expect(result).toBe(true)
      expect(getElementById).not.toHaveBeenCalled()
      expect(getElementsByName).not.toHaveBeenCalled()
      expect(target.scrollIntoView).not.toHaveBeenCalled()
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      if (previousDocument === undefined) {
        delete (globalThis as any).document
      } else {
        ;(globalThis as any).document = previousDocument
      }
      globalThis.fetch = originalFetch
    }
  })

  it('does not strip app-relative targets that start with the basePath segment', async () => {
    await expectBasePathHashOnlyPush({
      browserPath: '/app/app/foo',
      target: '/app/foo#section-1',
      expectedBrowserUrl: '/app/app/foo#section-1',
      expectedEventUrl: '/app/foo#section-1',
    })
  })

  it('popstate known failures schedule a single hard navigation', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const originalCustomEvent = globalThis.CustomEvent
    const listeners = new Map<string, (event: any) => void>()
    const { win } = createNavWindow()
    win.addEventListener = vi.fn((type: string, handler: (event: any) => void) => {
      listeners.set(type, handler)
    })

    ;(globalThis as any).window = win
    ;(globalThis as any).CustomEvent = class CustomEventMock {
      constructor(public type: string) {}
    } as any

    globalThis.fetch = async (_url: any, _init: any) =>
      new Response('Internal Server Error', { status: 500 })

    try {
      vi.resetModules()
      await import('../src/shims/router.js?text-ssr')
      const { installPagesRouterRuntime } =
        await import('../src/shims/pages-router-runtime.js?text-ssr')
      installPagesRouterRuntime()

      const popstateHandler = listeners.get('popstate')
      expect(popstateHandler).toBeDefined()

      win.location.pathname = '/failing-page'
      win.location.href = 'http://localhost/failing-page'
      // Install tracking after test setup so we only capture popstate-driven
      // writes, not the setup assignment above.
      const hrefAssignments = trackHrefAssignments(win)
      popstateHandler!({ state: null })
      // Cross a task boundary so the async popstate chain has fully settled.
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(hrefAssignments.filter(value => value === '/failing-page')).toHaveLength(1)
      expect(hrefAssignments).toHaveLength(1)
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
      ;(globalThis as any).CustomEvent = originalCustomEvent
    }
  })

  it('replace() also cancels superseded navigation', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    ;(globalThis as any).window = win

    const fetchA = createDeferred<Response>()
    const fetchB = createDeferred<Response>()
    let fetchCount = 0

    globalThis.fetch = async (_url: any, _init: any) => {
      fetchCount++
      if (fetchCount === 1) return fetchA.promise
      return fetchB.promise
    }

    const completedUrls: string[] = []
    const errors: Array<{ err: unknown; url: string }> = []
    const onRouteChangeComplete = (...args: unknown[]) => {
      completedUrls.push(String(args[0]))
    }
    const onRouteChangeError = (...args: unknown[]) => {
      errors.push({ err: args[0], url: String(args[1]) })
    }

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      Router.events.on('routeChangeComplete', onRouteChangeComplete)
      Router.events.on('routeChangeError', onRouteChangeError)

      // First push, then replace overlapping
      const navA = Router.push('/page-a')
      await Promise.resolve()
      const navB = Router.replace('/page-b')

      fetchB.resolve(new Response(buildNavHtml('/page-b', '/@fs/pages/page-b.js')))
      fetchA.resolve(new Response(buildNavHtml('/page-a', '/@fs/pages/page-a.js')))

      await Promise.allSettled([navA, navB])

      // The superseded push (page-a) should be cancelled, not completed
      expect(completedUrls).not.toContain('/page-a')
      // page-a should have a cancelled error
      const cancelledA = errors.find(e => e.url === '/page-a')
      expect(cancelledA).toBeDefined()
      expect(cancelledA?.err).toHaveProperty('cancelled', true)
    } finally {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      Router.events.off('routeChangeComplete', onRouteChangeComplete)
      Router.events.off('routeChangeError', onRouteChangeError)
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('abort signal fires when navigation is superseded — AbortError becomes NavigationCancelledError', async () => {
    // Verify that the AbortController signal passed to fetch actually fires when a
    // newer navigation starts, and that the resulting AbortError is converted into
    // a NavigationCancelledError (the routeChangeError path, not a plain rejection).
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    ;(globalThis as any).window = win

    const fetchA = createDeferred<Response>()
    const fetchB = createDeferred<Response>()
    let fetchCount = 0

    // Signal-aware mock: the first fetch rejects with AbortError when its signal fires.
    globalThis.fetch = async (_url: any, _init: any) => {
      fetchCount++
      if (fetchCount === 1) {
        return new Promise<Response>((resolve, reject) => {
          fetchA.promise.then(resolve, reject)
          _init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
        })
      }
      return fetchB.promise
    }

    const errors: Array<{ err: unknown; url: string }> = []
    const onRouteChangeError = (...args: unknown[]) => {
      errors.push({ err: args[0], url: String(args[1]) })
    }

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      Router.events.on('routeChangeError', onRouteChangeError)

      // Start navigation A then immediately supersede it with B
      const navA = Router.push('/page-a')
      await Promise.resolve()
      const navB = Router.push('/page-b')

      // Resolve B; A is aborted via its signal — no manual resolution needed
      fetchB.resolve(new Response(buildNavHtml('/page-b', '/@fs/pages/page-b.js')))

      await Promise.allSettled([navA, navB])

      // navA's fetch was aborted via signal → AbortError → NavigationCancelledError
      const cancelledError = errors.find(e => e.url === '/page-a')
      expect(cancelledError).toBeDefined()
      expect(cancelledError?.err).toHaveProperty('cancelled', true)
    } finally {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      Router.events.off('routeChangeError', onRouteChangeError)
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('stale response arriving first does not render before the winning navigation', async () => {
    // fetchA (stale, page-a) resolves before fetchB (winning, page-b).
    // assertStillCurrent() in navigateClient must catch the stale navigation
    // after it processes the response, so page-a's data never reaches the DOM.
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    ;(globalThis as any).window = win

    const fetchA = createDeferred<Response>()
    const fetchB = createDeferred<Response>()
    let fetchCount = 0

    globalThis.fetch = async (_url: any, _init: any) => {
      fetchCount++
      if (fetchCount === 1) return fetchA.promise
      return fetchB.promise
    }

    const completedUrls: string[] = []
    const onRouteChangeComplete = (...args: unknown[]) => {
      completedUrls.push(String(args[0]))
    }

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      Router.events.on('routeChangeComplete', onRouteChangeComplete)

      // Start two navigations
      const navA = Router.push('/page-a')
      await Promise.resolve()
      const navB = Router.push('/page-b')

      // Stale fetch (A) resolves first this time
      fetchA.resolve(new Response(buildNavHtml('/page-a', '/@fs/pages/page-a.js')))
      // Winning fetch (B) resolves after
      fetchB.resolve(new Response(buildNavHtml('/page-b', '/@fs/pages/page-b.js')))

      await Promise.allSettled([navA, navB])

      // Stale navigation must not have committed its data to the DOM.
      // B may also fail at dynamic import in test env, so we only verify A never wrote.
      expect(win.__TEXT_DATA__.page).not.toBe('/page-a')
      // Stale navigation must not fire routeChangeComplete
      expect(completedUrls).not.toContain('/page-a')
    } finally {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      Router.events.off('routeChangeComplete', onRouteChangeComplete)
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  it('__TEXT_DATA__ is not stale when routeChangeError fires for a cancelled navigation', async () => {
    // Regression test: __TEXT_DATA__ must not reflect the cancelled route's data
    // at the moment routeChangeError fires.  The fix defers the global write until
    // just before root.render(), after all assertStillCurrent() checks pass.
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()
    ;(globalThis as any).window = win

    const fetchA = createDeferred<Response>()
    const fetchB = createDeferred<Response>()
    let fetchCount = 0

    globalThis.fetch = async (_url: any, _init: any) => {
      fetchCount++
      if (fetchCount === 1) return fetchA.promise
      return fetchB.promise
    }

    // Track __TEXT_DATA__.page at the moment of each routeChangeError
    const textDataPageAtError: string[] = []
    const onRouteChangeError = () => {
      textDataPageAtError.push(win.__TEXT_DATA__.page)
    }

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      Router.events.on('routeChangeError', onRouteChangeError)

      // Start two navigations — A will be superseded by B
      const navA = Router.push('/page-a')
      await Promise.resolve()
      const navB = Router.push('/page-b')

      // Resolve stale (A) first, then winning (B)
      fetchA.resolve(new Response(buildNavHtml('/page-a', '/@fs/pages/page-a.js')))
      fetchB.resolve(new Response(buildNavHtml('/page-b', '/@fs/pages/page-b.js')))

      await Promise.allSettled([navA, navB])

      // At the moment routeChangeError fired for nav A, __TEXT_DATA__ must NOT
      // have been overwritten with page-a's data
      for (const page of textDataPageAtError) {
        expect(page).not.toBe('/page-a')
      }
    } finally {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      Router.events.off('routeChangeError', onRouteChangeError)
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      globalThis.fetch = originalFetch
    }
  })

  // Ported from Text.js: test/e2e/middleware-dynamic-basepath-matcher-rewrites
  // https://github.com/vercel/next.js/blob/canary/test/e2e/middleware-dynamic-basepath-matcher-rewrites
  // Issue #1196 — catch-all router.query must not be corrupted by basePath + rewrites + middleware.
  it('initializes catch-all router.query from __TEXT_DATA__ with basePath', async () => {
    const previousWindow = (globalThis as any).window
    const previousBasePath = process.env.__TEXT_ROUTER_BASEPATH
    const { win } = createNavWindow()

    // Simulate being on a catch-all page under basePath
    process.env.__TEXT_ROUTER_BASEPATH = '/docs'
    win.location.pathname = '/docs/first'
    win.location.href = 'http://localhost/docs/first'

    // Server-rendered __TEXT_DATA__ for the catch-all page
    win.__TEXT_DATA__ = {
      page: '/[...path]',
      query: { path: ['first'] },
      isFallback: false,
      props: { pageProps: {} },
      __text: { pageModuleUrl: '/@fs/pages/[...path].js' },
    }

    ;(globalThis as any).window = win
    vi.resetModules()

    const routerModule = await import('../src/shims/router.js?text-ssr')

    let capturedRouter: any
    function Probe() {
      capturedRouter = routerModule.useRouter()
      return createElement('span', null, 'ok')
    }

    try {
      await renderAppServerElementToHtml(routerModule.wrapWithRouterContext(createElement(Probe)))

      expect(capturedRouter.query.path).toEqual(['first'])
      expect(capturedRouter.pathname).toBe('/[...path]')
      expect(capturedRouter.asPath).toBe('/first')
    } finally {
      if (previousBasePath === undefined) {
        delete process.env.__TEXT_ROUTER_BASEPATH
      } else {
        process.env.__TEXT_ROUTER_BASEPATH = previousBasePath
      }
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      vi.resetModules()
    }
  })

  // Ported from Text.js: test/e2e/middleware-dynamic-basepath-matcher-rewrites
  // https://github.com/vercel/next.js/blob/canary/test/e2e/middleware-dynamic-basepath-matcher-rewrites
  // Issue #1196 — during a client-side <Link>/Router.push() navigation on a
  // catch-all route under basePath, router.query.<catchAll> must reflect the
  // destination URL segments and not be corrupted by intermediate data-URL
  // handling. In Text.js the corruption originated in getMiddlewareData where
  // basePath wasn't stripped from the _text/data/... URL before the catch-all
  // route regex matched against it. text's navigateClient reads __TEXT_DATA__
  // directly from the response HTML rather than constructing _text/data URLs,
  // so it doesn't have that architectural pattern, but the route-param
  // extraction path that ultimately produces router.query must still strip
  // basePath from the resolved pathname before matching the catch-all pattern.
  // This test exercises Router.push() through performNavigation → pushState
  // and verifies that router.query.path reflects the destination segments.
  it('preserves catch-all router.query after client navigation with basePath', async () => {
    const previousWindow = (globalThis as any).window
    const previousBasePath = process.env.__TEXT_ROUTER_BASEPATH
    const originalFetch = globalThis.fetch
    const { win } = createNavWindow()

    // Simulate being on a catch-all page under basePath when navigation starts.
    process.env.__TEXT_ROUTER_BASEPATH = '/docs'
    win.location.pathname = '/docs/first'
    win.location.href = 'http://localhost/docs/first'
    win.__TEXT_DATA__ = {
      page: '/[...path]',
      query: { path: ['first'] },
      isFallback: false,
      props: { pageProps: {} },
      // The catch-all module file is referenced through a Vite-style path that
      // passes isValidModulePath() (no ".." directory-traversal segments).
      __text: { pageModuleUrl: '/@fs/pages/catchall.js' },
    }

    ;(globalThis as any).window = win
    vi.resetModules()

    // Capture router state mid-navigation, after pushState has updated
    // window.location but before navigateClient's dynamic import runs (which
    // would fail in this test env). useRouter() reads from window.location
    // and window.__TEXT_DATA__ at provider-mount time, so rendering a Probe
    // inside the mocked fetch handler observes the post-pushState state —
    // exactly the code path that #1196 corrupts in Text.js.
    const routerModule = await import('../src/shims/router.js?text-ssr')

    let capturedRouter: any
    function Probe() {
      capturedRouter = routerModule.useRouter()
      return createElement('span', null, 'ok')
    }

    globalThis.fetch = async (_url: any, _init: any) => {
      await renderAppServerElementToHtml(routerModule.wrapWithRouterContext(createElement(Probe)))
      // Return HTML containing the destination's __TEXT_DATA__. The dynamic
      // import of the page module fails in this test env, which is fine — the
      // assertion above has already captured router.query.
      return new Response(
        buildNavHtml('/[...path]', '/@fs/pages/catchall.js', { path: ['second'] }),
      )
    }

    // Silence the expected routeChangeError from the page-module import failure.
    const onRouteChangeError = vi.fn()

    try {
      const Router = routerModule.default
      Router.events.on('routeChangeError', onRouteChangeError)

      // Router.push() takes an app-relative path; basePath is added internally
      // by performNavigation → toBrowserNavigationHref before pushState.
      await Router.push('/second')

      // pushState has fired, so location.pathname is "/docs/second".
      // stripBasePath() removes "/docs", and the catch-all pattern
      // "/[...path]" from __TEXT_DATA__.page extracts { path: ["second"] }.
      expect(capturedRouter.pathname).toBe('/[...path]')
      expect(capturedRouter.asPath).toBe('/second')
      expect(capturedRouter.query.path).toEqual(['second'])
      // Negative assertion mirroring #1196: query.path must NOT contain
      // _text/data segments.
      expect(capturedRouter.query.path).not.toContain('_text')
      expect(capturedRouter.query.path).not.toContain('data')
    } finally {
      routerModule.default.events.off('routeChangeError', onRouteChangeError)
      globalThis.fetch = originalFetch
      if (previousBasePath === undefined) {
        delete process.env.__TEXT_ROUTER_BASEPATH
      } else {
        process.env.__TEXT_ROUTER_BASEPATH = previousBasePath
      }
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      vi.resetModules()
    }
  })
})
