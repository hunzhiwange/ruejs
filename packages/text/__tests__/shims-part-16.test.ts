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
describe('Pages Router _text/data client navigation', () => {
  // These tests exercise the JSON path in navigateClient: when
  // `__TEXT_PAGE_LOADERS__` is populated (prod-style hydration), navigation
  // fetches `/_text/data/<buildId>/<page>.json` instead of the full HTML.
  // The HTML path tests above still cover the dev fallback.

  // Local mirror of trackHrefAssignments in the concurrent-navigation suite —
  // duplicated rather than hoisted to avoid disturbing the existing scopes.
  function trackHrefAssignmentsLocal(win: { location: { href: string } }): string[] {
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

  // Local mirror of buildNavHtml — the HTML-fallback assertion needs a
  // minimal HTML response that the navigateClientHtml path can parse.
  function buildNavHtmlLocal(page: string, pageModuleUrl: string): string {
    const textData = {
      props: { pageProps: {} },
      page,
      query: {},
      buildId: null,
      isFallback: false,
      __text: { pageModuleUrl },
    }
    return `<html><head></head><body><script>window.__TEXT_DATA__ = ${JSON.stringify(textData)}</script></body></html>`
  }

  function createDataNavWindow(
    opts: {
      buildId?: string
      page?: string
      locale?: string
      loaders?: Record<string, () => Promise<unknown>>
      appLoader?: () => Promise<unknown>
      /** Initial pathname for window.location. */
      pathname?: string
    } = {},
  ) {
    const pushState = vi.fn()
    const replaceState = vi.fn()
    const render = vi.fn()
    const buildId = opts.buildId ?? 'test-build'

    const win = {
      location: {
        pathname: opts.pathname ?? '/',
        search: '',
        hash: '',
        href: `http://localhost${opts.pathname ?? '/'}`,
        origin: 'http://localhost',
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
        page: opts.page ?? '/',
        query: {},
        isFallback: false,
        props: { pageProps: {} },
        buildId,
      } as any,
      __TEXT_ROOT__: { render },
      __TEXT_APP__: undefined,
      __TEXT_LOCALE__: opts.locale,
      __TEXT_LOCALES__: undefined,
      __TEXT_DEFAULT_LOCALE__: undefined,
      __TEXT_PAGE_LOADERS__: opts.loaders,
      __TEXT_PAGE_PATTERNS__: opts.loaders ? Object.keys(opts.loaders) : undefined,
      __TEXT_APP_LOADER__: opts.appLoader,
    }

    pushState.mockImplementation((_state: unknown, _title: string, url: string) => {
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

    return { win, pushState, replaceState, render, buildId }
  }

  // Fake Rue-component placeholder. The mocked __TEXT_ROOT__.render
  // captures whatever element navigateClient produces; we only assert on the
  // surrounding state (page, query, fetch URL, etc.), so the page modules
  // returned by loaders just need a default export of any function value.
  const FakePage = (() => 'fake-page') as unknown as { default: unknown }
  ;(FakePage as { default: unknown }).default = () => 'fake-page'

  function makePageModule(name: string): { default: unknown } {
    return { default: ((): string => `page:${name}`) as unknown }
  }

  it('fetches /_text/data/<buildId>/<page>.json instead of the HTML page', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch

    const loaderAbout = vi.fn(async () => makePageModule('about'))
    const { win, buildId } = createDataNavWindow({
      loaders: { '/': vi.fn(async () => makePageModule('home')), '/about': loaderAbout },
    })
    ;(globalThis as any).window = win
    vi.resetModules()

    const fetchMock = vi.fn(
      async (_url: any, _init: any) =>
        new Response(JSON.stringify({ pageProps: { hello: 'world' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    globalThis.fetch = fetchMock as any

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      const result = await Router.push('/about')

      expect(result).toBe(true)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [calledUrl, calledInit] = fetchMock.mock.calls[0]
      expect(String(calledUrl)).toBe(`/_text/data/${buildId}/about.json`)
      expect((calledInit as RequestInit).headers).toMatchObject({
        Accept: 'application/json',
        'x-textjs-data': '1',
      })
      expect(loaderAbout).toHaveBeenCalledTimes(1)
      expect(win.__TEXT_DATA__.page).toBe('/about')
      expect(win.__TEXT_DATA__.props.pageProps).toEqual({ hello: 'world' })
    } finally {
      if (previousWindow === undefined) delete (globalThis as any).window
      else (globalThis as any).window = previousWindow
      globalThis.fetch = originalFetch
      vi.resetModules()
    }
  })

  it('hard-reloads when the data endpoint returns 404 (build-skew safety net)', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch

    const { win } = createDataNavWindow({
      loaders: {
        '/': vi.fn(async () => makePageModule('home')),
        '/about': vi.fn(async () => makePageModule('about')),
      },
    })
    ;(globalThis as any).window = win
    const hrefAssignments = trackHrefAssignmentsLocal(win)
    vi.resetModules()

    globalThis.fetch = vi.fn(
      async () =>
        new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } }),
    ) as any

    const onRouteChangeError = vi.fn()

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      Router.events.on('routeChangeError', onRouteChangeError)

      const result = await Router.push('/about')
      expect(result).toBe(false)
      // Hard reload was queued via window.location.href = url.
      expect(hrefAssignments).toContain('/about')
      Router.events.off('routeChangeError', onRouteChangeError)
    } finally {
      if (previousWindow === undefined) delete (globalThis as any).window
      else (globalThis as any).window = previousWindow
      globalThis.fetch = originalFetch
      vi.resetModules()
    }
  })

  it('hard-reloads to the redirect target on x-textjs-redirect', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch

    const { win } = createDataNavWindow({
      loaders: {
        '/': vi.fn(async () => makePageModule('home')),
        '/about': vi.fn(async () => makePageModule('about')),
      },
    })
    ;(globalThis as any).window = win
    const hrefAssignments = trackHrefAssignmentsLocal(win)
    vi.resetModules()

    globalThis.fetch = vi.fn(
      async () =>
        new Response('{}', {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'x-textjs-redirect': '/login' },
        }),
    ) as any

    const onRouteChangeError = vi.fn()

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      Router.events.on('routeChangeError', onRouteChangeError)

      await Router.push('/about')
      // The soft redirect destination is what gets hard-loaded.
      expect(hrefAssignments).toContain('/login')
      Router.events.off('routeChangeError', onRouteChangeError)
    } finally {
      if (previousWindow === undefined) delete (globalThis as any).window
      else (globalThis as any).window = previousWindow
      globalThis.fetch = originalFetch
      vi.resetModules()
    }
  })

  it('falls back to the HTML path when no loader is registered for the target route', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch

    // Loader map has only `/` — no loader for `/about`, so the data path
    // resolves to null and navigateClient falls through to HTML extraction.
    const { win } = createDataNavWindow({
      loaders: { '/': vi.fn(async () => makePageModule('home')) },
    })
    ;(globalThis as any).window = win
    vi.resetModules()

    const fetchMock = vi.fn(
      async (_url: any, _init?: any) =>
        new Response(buildNavHtmlLocal('/about', '/@fs/pages/about.js'), {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
    )
    globalThis.fetch = fetchMock as any

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      await Router.push('/about')

      // The fetch URL must be the HTML page, not the data endpoint.
      const [calledUrl] = fetchMock.mock.calls[0]
      expect(String(calledUrl)).not.toMatch(/^\/_text\/data\//)
      expect(String(calledUrl)).toContain('/about')
    } finally {
      if (previousWindow === undefined) delete (globalThis as any).window
      else (globalThis as any).window = previousWindow
      globalThis.fetch = originalFetch
      vi.resetModules()
    }
  })

  it('extracts dynamic route params from the URL and stores them on __TEXT_DATA__.query', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch

    const blogLoader = vi.fn(async () => makePageModule('blog'))
    const { win, buildId } = createDataNavWindow({
      loaders: { '/': vi.fn(async () => makePageModule('home')), '/blog/[slug]': blogLoader },
    })
    ;(globalThis as any).window = win
    vi.resetModules()

    const fetchMock = vi.fn(
      async (_url: any, _init?: any) =>
        new Response(JSON.stringify({ pageProps: { post: 'hi' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    globalThis.fetch = fetchMock as any

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      await Router.push('/blog/my-post')

      const [calledUrl] = fetchMock.mock.calls[0]
      expect(String(calledUrl)).toBe(`/_text/data/${buildId}/blog/my-post.json`)
      expect(blogLoader).toHaveBeenCalledTimes(1)
      expect(win.__TEXT_DATA__.page).toBe('/blog/[slug]')
      expect(win.__TEXT_DATA__.query).toEqual({ slug: 'my-post' })
    } finally {
      if (previousWindow === undefined) delete (globalThis as any).window
      else (globalThis as any).window = previousWindow
      globalThis.fetch = originalFetch
      vi.resetModules()
    }
  })

  it('merges URL search params and route params into __TEXT_DATA__.query (route params win)', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch

    const { win } = createDataNavWindow({
      loaders: {
        '/': vi.fn(async () => makePageModule('home')),
        '/blog/[slug]': vi.fn(async () => makePageModule('blog')),
      },
    })
    ;(globalThis as any).window = win
    vi.resetModules()

    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ pageProps: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ) as any

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      // Search param `slug` should NOT shadow the dynamic route param `slug`.
      // Search params `q` and `tag` should appear in query alongside `slug`.
      await Router.push('/blog/my-post?slug=spoofed&q=hello&tag=a&tag=b')

      expect(win.__TEXT_DATA__.page).toBe('/blog/[slug]')
      expect(win.__TEXT_DATA__.query).toEqual({
        slug: 'my-post',
        q: 'hello',
        tag: ['a', 'b'],
      })
    } finally {
      if (previousWindow === undefined) delete (globalThis as any).window
      else (globalThis as any).window = previousWindow
      globalThis.fetch = originalFetch
      vi.resetModules()
    }
  })

  it('hard-reloads on a malformed JSON response', async () => {
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch

    const { win } = createDataNavWindow({
      loaders: {
        '/': vi.fn(async () => makePageModule('home')),
        '/about': vi.fn(async () => makePageModule('about')),
      },
    })
    ;(globalThis as any).window = win
    const hrefAssignments = trackHrefAssignmentsLocal(win)
    vi.resetModules()

    globalThis.fetch = vi.fn(
      async () =>
        new Response('not json {{{', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ) as any

    const onRouteChangeError = vi.fn()

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      Router.events.on('routeChangeError', onRouteChangeError)

      await Router.push('/about')
      expect(hrefAssignments).toContain('/about')
      Router.events.off('routeChangeError', onRouteChangeError)
    } finally {
      if (previousWindow === undefined) delete (globalThis as any).window
      else (globalThis as any).window = previousWindow
      globalThis.fetch = originalFetch
      vi.resetModules()
    }
  })

  it('uses the JSON path for prefetch when a loader is registered', async () => {
    const previousWindow = (globalThis as any).window
    const originalDocument = (globalThis as any).document

    const aboutLoader = vi.fn(async () => makePageModule('about'))
    const { win, buildId } = createDataNavWindow({
      loaders: { '/': vi.fn(async () => makePageModule('home')), '/about': aboutLoader },
    })
    ;(globalThis as any).window = win

    const appendedLinks: Array<{ rel: string; as: string; href: string; crossOrigin?: string }> = []
    ;(globalThis as any).document = {
      createElement: (tag: string) => {
        if (tag !== 'link') return {}
        const link: { rel: string; as: string; href: string; crossOrigin?: string } = {
          rel: '',
          as: '',
          href: '',
        }
        return link
      },
      head: {
        appendChild: (node: any) => {
          appendedLinks.push({
            rel: node.rel,
            as: node.as,
            href: node.href,
            crossOrigin: node.crossOrigin,
          })
        },
      },
    }
    vi.resetModules()

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      await Router.prefetch('/about')

      const prefetchLink = appendedLinks.find(l => l.rel === 'prefetch')
      expect(prefetchLink).toBeDefined()
      expect(prefetchLink?.as).toBe('fetch')
      expect(prefetchLink?.href).toBe(`/_text/data/${buildId}/about.json`)
      expect(prefetchLink?.crossOrigin).toBe('anonymous')
      // The loader was warmed (chunk fetch kicked off).
      expect(aboutLoader).toHaveBeenCalledTimes(1)
    } finally {
      if (previousWindow === undefined) delete (globalThis as any).window
      else (globalThis as any).window = previousWindow
      ;(globalThis as any).document = originalDocument
      vi.resetModules()
    }
  })

  it('falls back to as=document prefetch when no loader matches', async () => {
    const previousWindow = (globalThis as any).window
    const originalDocument = (globalThis as any).document

    const { win } = createDataNavWindow({
      loaders: { '/': vi.fn(async () => makePageModule('home')) },
    })
    ;(globalThis as any).window = win

    const appendedLinks: Array<{ rel: string; as: string; href: string }> = []
    ;(globalThis as any).document = {
      createElement: () => ({ rel: '', as: '', href: '' }),
      head: {
        appendChild: (node: any) => {
          appendedLinks.push({ rel: node.rel, as: node.as, href: node.href })
        },
      },
    }
    vi.resetModules()

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      await Router.prefetch('/unmapped')

      const prefetchLink = appendedLinks.find(l => l.rel === 'prefetch')
      expect(prefetchLink?.as).toBe('document')
    } finally {
      if (previousWindow === undefined) delete (globalThis as any).window
      else (globalThis as any).window = previousWindow
      ;(globalThis as any).document = originalDocument
      vi.resetModules()
    }
  })

  it('strips the locale prefix before matching loaders and updates __TEXT_DATA__.locale', async () => {
    // Regression: route patterns in __TEXT_PAGE_PATTERNS__ are
    // locale-unaware (e.g. /about, not /fr/about). Without stripping the
    // locale prefix from the URL before pattern matching, locale transitions
    // would always miss the loader map and fall through to the slower HTML
    // path. The data URL itself must keep the locale prefix so the server
    // returns locale-specific gSSP data.
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch

    const loaderAbout = vi.fn(async () => makePageModule('about'))
    const { win, buildId } = createDataNavWindow({
      loaders: {
        '/': vi.fn(async () => makePageModule('home')),
        '/about': loaderAbout,
      },
      locale: 'en',
    })
    ;(win as any).__TEXT_LOCALES__ = ['en', 'fr']
    ;(win as any).__TEXT_DEFAULT_LOCALE__ = 'en'
    ;(win.__TEXT_DATA__ as any).locale = 'en'
    ;(win.__TEXT_DATA__ as any).locales = ['en', 'fr']
    ;(win.__TEXT_DATA__ as any).defaultLocale = 'en'
    ;(globalThis as any).window = win
    vi.resetModules()

    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ pageProps: { hello: 'bonjour' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    globalThis.fetch = fetchMock as any

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      const result = await Router.push('/fr/about')

      expect(result).toBe(true)
      // URL kept the locale prefix — the server uses it to pick the locale.
      const [calledUrl] = (fetchMock.mock.calls[0] ?? []) as unknown as [unknown, RequestInit?]
      expect(String(calledUrl)).toBe(`/_text/data/${buildId}/fr/about.json`)
      // Loader matched on the locale-stripped pattern.
      expect(loaderAbout).toHaveBeenCalledTimes(1)
      // Page resolved to the unprefixed route pattern.
      expect(win.__TEXT_DATA__.page).toBe('/about')
      // Locale globals updated to the new locale so useRouter().locale reflects it.
      expect((win.__TEXT_DATA__ as any).locale).toBe('fr')
      expect(win.__TEXT_LOCALE__).toBe('fr')
    } finally {
      if (previousWindow === undefined) delete (globalThis as any).window
      else (globalThis as any).window = previousWindow
      globalThis.fetch = originalFetch
      vi.resetModules()
    }
  })

  it('restores the default locale on transitions back to an unprefixed URL', async () => {
    // `Router.push("/about", undefined, { locale: "en" })` from a French page
    // switches back to the default locale. The data URL drops the locale
    // prefix (default locale is unprefixed) and __TEXT_DATA__.locale flips
    // back to "en" so useRouter().locale tracks the new locale.
    const previousWindow = (globalThis as any).window
    const originalFetch = globalThis.fetch

    const loaderAbout = vi.fn(async () => makePageModule('about'))
    const { win, buildId } = createDataNavWindow({
      loaders: {
        '/': vi.fn(async () => makePageModule('home')),
        '/about': loaderAbout,
      },
      locale: 'fr',
      pathname: '/fr',
    })
    ;(win as any).__TEXT_LOCALES__ = ['en', 'fr']
    ;(win as any).__TEXT_DEFAULT_LOCALE__ = 'en'
    ;(win.__TEXT_DATA__ as any).locale = 'fr'
    ;(win.__TEXT_DATA__ as any).locales = ['en', 'fr']
    ;(win.__TEXT_DATA__ as any).defaultLocale = 'en'
    ;(globalThis as any).window = win
    vi.resetModules()

    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ pageProps: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ) as any

    try {
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default
      await Router.push('/about', undefined, { locale: 'en' })

      const [calledUrl] = (globalThis.fetch as any).mock.calls[0]
      expect(String(calledUrl)).toBe(`/_text/data/${buildId}/about.json`)
      expect((win.__TEXT_DATA__ as any).locale).toBe('en')
      expect(win.__TEXT_LOCALE__).toBe('en')
    } finally {
      if (previousWindow === undefined) delete (globalThis as any).window
      else (globalThis as any).window = previousWindow
      globalThis.fetch = originalFetch
      vi.resetModules()
    }
  })
})

describe('text/server enhancements', () => {
  it('TextRequest.ip extracts from x-forwarded-for header', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('https://example.com', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(req.ip).toBe('1.2.3.4')
  })

  it('TextRequest.ip returns undefined without forwarded header', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('https://example.com')
    expect(req.ip).toBeUndefined()
  })

  it('TextRequest.geo extracts from Cloudflare/Vercel headers', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('https://example.com', {
      headers: {
        'cf-ipcountry': 'US',
        'cf-ipcity': 'San Francisco',
      },
    })
    const geo = req.geo
    expect(geo).toBeDefined()
    expect(geo!.country).toBe('US')
    expect(geo!.city).toBe('San Francisco')
  })

  it('TextRequest.geo returns undefined without geo headers', async () => {
    const { TextRequest } = await import('../src/shims/server.js')
    const req = new TextRequest('https://example.com')
    expect(req.geo).toBeUndefined()
  })

  it('ResponseCookies.getAll returns all set cookies', async () => {
    const { ResponseCookies } = await import('../src/shims/server.js')
    const headers = new Headers()
    const cookies = new ResponseCookies(headers)
    cookies.set('a', '1')
    cookies.set('b', '2')
    const all = cookies.getAll()
    expect(all).toHaveLength(2)
    expect(all.find((c: any) => c.name === 'a')?.value).toBe('1')
    expect(all.find((c: any) => c.name === 'b')?.value).toBe('2')
  })
})

describe('text/image enhancements', () => {
  it('exports StaticImageData type', async () => {
    const imageModule = await import('../src/shims/image.js?text-ssr')
    // StaticImageData is an interface, so we can't check at runtime
    // but getImageProps uses it — verify that function exists
    expect(typeof imageModule.getImageProps).toBe('function')
  })

  it('getImageProps returns img props from Image props', async () => {
    const { getImageProps } = await import('../src/shims/image.js?text-ssr')
    const result = getImageProps({
      src: '/photo.jpg',
      alt: 'Test',
      width: 800,
      height: 600,
      priority: true,
    })
    // Local images now route through the optimization endpoint
    expect(result.props.src).toContain('/_text/image')
    expect(result.props.src).toContain('url=%2Fphoto.jpg')
    expect(result.props.src).toContain('w=800')
    expect(result.props.alt).toBe('Test')
    expect(result.props.width).toBe(800)
    expect(result.props.height).toBe(600)
    expect(result.props.loading).toBe('eager')
  })

  it('getImageProps handles fill mode', async () => {
    const { getImageProps } = await import('../src/shims/image.js?text-ssr')
    const result = getImageProps({
      src: '/bg.jpg',
      alt: 'Background',
      fill: true,
    })
    expect(result.props.width).toBeUndefined()
    expect(result.props.height).toBeUndefined()
    expect(result.props.style?.position).toBe('absolute')
  })

  it('getImageProps handles StaticImageData', async () => {
    const { getImageProps } = await import('../src/shims/image.js?text-ssr')
    const result = getImageProps({
      src: { src: '/imported.jpg', width: 1200, height: 800, blurDataURL: 'data:...' },
      alt: 'Imported',
    })
    expect(result.props.src).toContain('/_text/image')
    expect(result.props.src).toContain('url=%2Fimported.jpg')
    expect(result.props.src).toContain('w=1200')
    expect(result.props.width).toBe(1200)
    expect(result.props.height).toBe(800)
  })

  it('getImageProps generates srcSet for local images with width', async () => {
    const { getImageProps } = await import('../src/shims/image.js?text-ssr')
    const result = getImageProps({
      src: '/photo.jpg',
      alt: 'Test',
      width: 1200,
      height: 800,
    })
    expect(result.props.srcSet).toBeDefined()
    // srcSet entries point to /_text/image optimization endpoint
    expect(result.props.srcSet).toContain('/_text/image')
    expect(result.props.srcSet).toContain('url=%2Fphoto.jpg')
    expect(result.props.srcSet).toContain('w')
  })

  it('getImageProps does not generate srcSet for fill images', async () => {
    const { getImageProps } = await import('../src/shims/image.js?text-ssr')
    const result = getImageProps({
      src: '/bg.jpg',
      alt: 'Background',
      fill: true,
    })
    expect(result.props.srcSet).toBeUndefined()
    expect(result.props.sizes).toBe('100vw') // fill implies 100vw
  })

  it('getImageProps includes fetchPriority for priority images', async () => {
    const { getImageProps } = await import('../src/shims/image.js?text-ssr')
    const result = getImageProps({
      src: '/hero.jpg',
      alt: 'Hero',
      width: 1200,
      height: 800,
      priority: true,
    })
    expect(result.props.fetchPriority).toBe('high')
    expect(result.props.loading).toBe('eager')
  })

  it('getImageProps includes data-nimg attribute', async () => {
    const { getImageProps } = await import('../src/shims/image.js?text-ssr')
    const result = getImageProps({
      src: '/photo.jpg',
      alt: 'Photo',
      width: 800,
      height: 600,
    })
    expect((result.props as any)['data-nimg']).toBe('1')

    const fillResult = getImageProps({
      src: '/bg.jpg',
      alt: 'BG',
      fill: true,
    })
    expect((fillResult.props as any)['data-nimg']).toBe('fill')
  })

  it('getImageProps includes blur placeholder background styles', async () => {
    const { getImageProps } = await import('../src/shims/image.js?text-ssr')
    const blurUrl = 'data:image/jpeg;base64,/9j/4AAQ'
    const result = getImageProps({
      src: '/photo.jpg',
      alt: 'Blurry',
      width: 800,
      height: 600,
      placeholder: 'blur',
      blurDataURL: blurUrl,
    })
    expect(result.props.style?.backgroundImage).toContain(blurUrl)
    expect(result.props.style?.backgroundSize).toBe('cover')
  })

  it('getImageProps uses custom loader function', async () => {
    const { getImageProps } = await import('../src/shims/image.js?text-ssr')
    const result = getImageProps({
      src: '/photo.jpg',
      alt: 'Custom',
      width: 800,
      height: 600,
      loader: ({ src, width, quality }) => `https://cdn.example.com${src}?w=${width}&q=${quality}`,
    })
    // Custom loader bypasses the /_text/image endpoint
    expect(result.props.src).toBe('https://cdn.example.com/photo.jpg?w=800&q=75')
    expect(result.props.src).not.toContain('/_text/image')
  })

  it('unoptimized prop bypasses /_text/image endpoint', async () => {
    const { getImageProps } = await import('../src/shims/image.js?text-ssr')
    const result = getImageProps({
      src: '/photo.jpg',
      alt: 'Unoptimized',
      width: 800,
      height: 600,
      unoptimized: true,
    })
    // unoptimized=true should serve the raw src, not the optimization endpoint
    expect(result.props.src).toBe('/photo.jpg')
    expect(result.props.src).not.toContain('/_text/image')
  })

  it('SVG src auto-skips optimization endpoint (default behavior)', async () => {
    const { getImageProps } = await import('../src/shims/image.js?text-ssr')
    const result = getImageProps({
      src: '/logo.svg',
      alt: 'SVG logo',
      width: 200,
      height: 200,
    })
    // By default (dangerouslyAllowSVG not set), .svg sources bypass the optimizer
    expect(result.props.src).toBe('/logo.svg')
    expect(result.props.src).not.toContain('/_text/image')
  })

  it('non-SVG src still uses optimization endpoint', async () => {
    const { getImageProps } = await import('../src/shims/image.js?text-ssr')
    const result = getImageProps({
      src: '/photo.png',
      alt: 'PNG photo',
      width: 256,
      height: 256,
    })
    expect(result.props.src).toContain('/_text/image')
  })
})
describe('text/image component rendering', () => {
  it('renders basic image with src, alt, width, height', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const html = await renderRueToString(
      createRueElement(Image, { src: '/photo.jpg', alt: 'Test photo', width: 800, height: 600 }),
    )
    // Local images route through the optimization endpoint
    expect(html).toContain('/_text/image')
    expect(html).toContain('url=%2Fphoto.jpg')
    expect(html).toContain('alt="Test photo"')
    expect(html).toContain('width="800"')
    expect(html).toContain('height="600"')
  })

  it('renders fill image with absolute positioning', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const html = await renderRueToString(
      createRueElement(Image, { src: '/bg.jpg', alt: 'Background', fill: true }),
    )
    expect(html).toMatch(/position:\s*absolute/)
    expect(html).toContain('data-nimg="fill"')
    // fill images should not have width/height attributes
    expect(html).not.toContain('width=')
    expect(html).not.toContain('height=')
  })

  it('renders priority image with fetchpriority=high and loading=eager', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const html = await renderRueToString(
      createRueElement(Image, {
        src: '/hero.jpg',
        alt: 'Hero',
        width: 1200,
        height: 800,
        priority: true,
      }),
    )
    expect(html).toContain('fetchPriority="high"')
    expect(html).toContain('loading="eager"')
  })

  it('renders lazy loading by default (no priority)', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const html = await renderRueToString(
      createRueElement(Image, { src: '/photo.jpg', alt: 'Photo', width: 800, height: 600 }),
    )
    expect(html).toContain('loading="lazy"')
    expect(html).not.toContain('fetchPriority')
  })

  it('renders srcSet for local images with width', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const html = await renderRueToString(
      createRueElement(Image, { src: '/photo.jpg', alt: 'Photo', width: 1200, height: 800 }),
    )
    expect(html).toContain('srcSet')
    // srcSet entries point to /_text/image optimization endpoint
    expect(html).toContain('/_text/image')
    expect(html).toContain('url=%2Fphoto.jpg')
  })

  it('renders blur placeholder with background-image', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const blurUrl = 'data:image/jpeg;base64,/9j/4AAQ'
    const html = await renderRueToString(
      createRueElement(Image, {
        src: '/photo.jpg',
        alt: 'Blurry',
        width: 800,
        height: 600,
        placeholder: 'blur',
        blurDataURL: blurUrl,
      }),
    )
    expect(html).toContain(blurUrl)
    expect(html).toContain('background-image')
    expect(html).toMatch(/background-size:\s*cover/)
  })

  it('renders with custom loader function', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const html = await renderRueToString(
      createRueElement(Image, {
        src: '/photo.jpg',
        alt: 'Custom',
        width: 800,
        height: 600,
        loader: ({ src, width, quality }: { src: string; width: number; quality?: number }) =>
          `https://cdn.example.com${src}?w=${width}&q=${quality}`,
      }),
    )
    expect(html).toContain('src="https://cdn.example.com/photo.jpg?w=800&amp;q=75"')
  })

  it('renders with custom sizes attribute', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const html = await renderRueToString(
      createRueElement(Image, {
        src: '/photo.jpg',
        alt: 'Responsive',
        width: 1200,
        height: 800,
        sizes: '(max-width: 768px) 100vw, 50vw',
      }),
    )
    expect(html).toContain('sizes="(max-width: 768px) 100vw, 50vw"')
  })

  it('renders fill image with sizes=100vw by default', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const html = await renderRueToString(
      createRueElement(Image, { src: '/bg.jpg', alt: 'BG', fill: true }),
    )
    expect(html).toContain('sizes="100vw"')
  })

  it('handles StaticImageData import objects', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const staticImport = {
      src: '/imported.jpg',
      width: 1200,
      height: 800,
      blurDataURL: 'data:...',
    }
    const html = await renderRueToString(
      createRueElement(Image, { src: staticImport, alt: 'Imported' }),
    )
    expect(html).toContain('/_text/image')
    expect(html).toContain('url=%2Fimported.jpg')
    expect(html).toContain('width="1200"')
    expect(html).toContain('height="800"')
  })

  it('renders with className', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const html = await renderRueToString(
      createRueElement(Image, {
        src: '/photo.jpg',
        alt: 'Styled',
        width: 800,
        height: 600,
        className: 'rounded-lg shadow-md',
      }),
    )
    expect(html).toContain('class="rounded-lg shadow-md"')
  })

  it('includes data-nimg=1 for non-fill images', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const html = await renderRueToString(
      createRueElement(Image, { src: '/photo.jpg', alt: 'Test', width: 800, height: 600 }),
    )
    expect(html).toContain('data-nimg="1"')
  })

  it('always sets decoding=async', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const html = await renderRueToString(
      createRueElement(Image, { src: '/photo.jpg', alt: 'Test', width: 800, height: 600 }),
    )
    expect(html).toContain('decoding="async"')
  })

  // ── SSR-only smoke tests: verify SSR output does not crash when onLoad / onError /
  // ref are provided. The hydration replay logic (useLayoutEffect, img.src = img.src,
  // mergedRef DOM node capture) requires a client-side mount; the handler wiring is
  // tested in the Playwright E2E test suite.

  it('renders with onError callback attached (SSR smoke test)', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const html = await renderRueToString(
      createRueElement(Image, {
        src: '/broken.jpg',
        alt: 'Broken',
        width: 400,
        height: 300,
        onError: () => {},
      }),
    )
    // SSR should render without errors — the onError replay is client-side only
    expect(html).toContain('<img')
    expect(html).toContain('/_text/image')
  })

  it('renders with both onLoad and onError callbacks (SSR smoke test)', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const html = await renderRueToString(
      createRueElement(Image, {
        src: '/photo.jpg',
        alt: 'Photo',
        width: 800,
        height: 600,
        onLoad: () => {},
        onError: () => {},
      }),
    )
    expect(html).toContain('<img')
    expect(html).toContain('/_text/image')
  })

  it('renders img without assigning a browser ref during SSR', async () => {
    const ref = { current: null as HTMLImageElement | null }
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const html = await renderRueToString(
      createRueElement(Image, {
        src: '/photo.jpg',
        alt: 'Ref test',
        width: 800,
        height: 600,
        ref,
      }),
    )
    expect(html).toContain('<img')
    expect(html).toContain('/_text/image')
    expect(ref.current).toBeNull()
  })

  it('renders with onError in loader path (SSR smoke test)', async () => {
    const Image = (await import('../src/shims/image.js?text-ssr')).default

    const html = await renderRueToString(
      createRueElement(Image, {
        src: '/photo.jpg',
        alt: 'Loader',
        width: 800,
        height: 600,
        onError: () => {},
        loader: ({ src, width, quality }) =>
          `https://cdn.example.com${src}?w=${width}&q=${quality}`,
      }),
    )
    expect(html).toContain('<img')
    expect(html).not.toContain('/_text/image')
    expect(html).toContain('cdn.example.com')
  })
})
