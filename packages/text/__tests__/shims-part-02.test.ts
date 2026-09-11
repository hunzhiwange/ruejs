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
describe('window.text debug global', () => {
  it('installWindowText sets version, router, and appDir fields on window.text', async () => {
    const previousWindow = (globalThis as any).window
    const win: any = {}
    ;(globalThis as any).window = win

    try {
      vi.resetModules()
      const { installWindowText } = await import('../src/client/window-text.js')

      const routerStub = {
        push() {},
        replace() {},
        back() {},
        forward() {},
        refresh() {},
        prefetch() {},
      }
      installWindowText({ version: 'test-version', appDir: true, router: routerStub })

      expect(win.text).toBeDefined()
      expect(win.text.version).toBe('test-version')
      expect(win.text.appDir).toBe(true)
      expect(win.text.router).toBe(routerStub)
    } finally {
      ;(globalThis as any).window = previousWindow
      vi.resetModules()
    }
  })

  it('installWindowText merges subsequent calls without clobbering existing fields', async () => {
    const previousWindow = (globalThis as any).window
    const win: any = {}
    ;(globalThis as any).window = win

    try {
      vi.resetModules()
      const { installWindowText } = await import('../src/client/window-text.js')

      const pagesRouter = { kind: 'pages' } as any
      const appRouter = { kind: 'app' } as any

      installWindowText({ version: 'v1', router: pagesRouter })
      installWindowText({ appDir: true, router: appRouter })

      // Whichever installer ran last (in real-world hybrid setups, App
      // Router) wins for `router` — mirrors Text.js's load order where
      // app-bootstrap.ts runs after text.ts.
      expect(win.text.router).toBe(appRouter)
      expect(win.text.appDir).toBe(true)
      // Fields not overridden are preserved.
      expect(win.text.version).toBe('v1')
    } finally {
      ;(globalThis as any).window = previousWindow
      vi.resetModules()
    }
  })

  it('Pages Router shim installs window.text.router with the expected TextRouter surface', async () => {
    // Build a minimal fake window so importing shims/router.ts (which
    // touches window at module load to attach popstate) does not crash.
    const previousWindow = (globalThis as any).window
    const win: any = {
      location: { pathname: '/', search: '', hash: '', href: 'http://localhost/' },
      history: { state: null, pushState() {}, replaceState() {} },
      addEventListener() {},
    }
    ;(globalThis as any).window = win

    try {
      vi.resetModules()
      // Side-effecting import: installs window.text.router at module load.
      const routerModule = await import('../src/shims/router.js?text-ssr')
      const Router = routerModule.default

      expect(win.text).toBeDefined()
      expect(win.text.router).toBe(Router)

      // Ported from Text.js: TextRouter type in
      // packages/text/src/shared/lib/router/router.ts (line 372).
      const router = win.text.router
      expect(typeof router.push).toBe('function')
      expect(typeof router.replace).toBe('function')
      expect(typeof router.back).toBe('function')
      expect(typeof router.reload).toBe('function')
      expect(typeof router.prefetch).toBe('function')
      expect(typeof router.beforePopState).toBe('function')
      expect(router.events).toBeDefined()
      expect(typeof router.events.on).toBe('function')
      expect(typeof router.events.off).toBe('function')
      expect(typeof router.events.emit).toBe('function')

      // State fields — Text.js's singletonRouter exposes pathname/route/query/
      // asPath/basePath/locale*/isReady/isPreview/isFallback as live getters
      // off `window.text.router` (urlPropertyFields in
      // .textjs-ref/packages/text/src/client/router.ts lines 32-47). The
      // Text.js deploy suite drives navigations via
      // `browser.eval('text.router.push(...)')` and then asserts on
      // `browser.eval('text.router.pathname')`, so these must read like data
      // properties, not raise.
      expect(typeof router.pathname).toBe('string')
      expect(typeof router.asPath).toBe('string')
      expect(typeof router.query).toBe('object')
      expect(typeof router.basePath).toBe('string')
      expect(typeof router.isReady).toBe('boolean')
      expect(typeof router.isPreview).toBe('boolean')
      expect(typeof router.isFallback).toBe('boolean')
      expect(typeof router.route).toBe('string')
    } finally {
      ;(globalThis as any).window = previousWindow
      vi.resetModules()
    }
  })

  // Ported from Text.js: tests that rely on `window.text.router.events.on(...)`
  // — e.g. test/development/pages-dir/client-navigation/index.test.ts:457
  // (`window.text.router.events.on('routeChangeError', ...)`).
  it('window.text.router.events forwards Pages Router events', async () => {
    const previousWindow = (globalThis as any).window
    const win: any = {
      location: { pathname: '/', search: '', hash: '', href: 'http://localhost/' },
      history: { state: null, pushState() {}, replaceState() {} },
      addEventListener() {},
    }
    ;(globalThis as any).window = win

    try {
      vi.resetModules()
      await import('../src/shims/router.js?text-ssr')

      const fired: unknown[] = []
      win.text.router.events.on('routeChangeStart', (url: unknown) => {
        fired.push(url)
      })
      win.text.router.events.emit('routeChangeStart', '/text-page')
      expect(fired).toEqual(['/text-page'])
    } finally {
      ;(globalThis as any).window = previousWindow
      vi.resetModules()
    }
  })

  // Issue #1467 — `window.text.router.push(...)` must resolve to a boolean
  // (true on success, false if blocked), matching Text.js's contract in
  // `packages/text/src/shared/lib/router/router.ts:1025-1048` where push/replace
  // delegate to `change()` which returns `Promise<boolean>`. The Text.js deploy
  // test suite (prerender, use-router-with-rewrites, etc.) reads the resolved
  // value via `browser.eval('await window.text.router.push("/foo")')` and
  // asserts truthiness; resolving to `undefined` is observable as a regression
  // even when the navigation otherwise succeeds.
  it('window.text.router.push resolves to true on shallow success', async () => {
    const previousWindow = (globalThis as any).window
    const win: any = {
      location: {
        pathname: '/',
        search: '',
        hash: '',
        href: 'http://localhost/',
        origin: 'http://localhost',
      },
      history: { state: null, pushState() {}, replaceState() {} },
      addEventListener() {},
      dispatchEvent() {},
      scrollTo() {},
    }
    ;(globalThis as any).window = win

    try {
      vi.resetModules()
      await import('../src/shims/router.js?text-ssr')

      // Shallow push avoids the HTML fetch + render path so this unit test
      // does not need a navigateClient stub. The boolean-return contract
      // applies equally to shallow and non-shallow navigations.
      const result = await win.text.router.push('/foo', undefined, { shallow: true })
      expect(result).toBe(true)
    } finally {
      ;(globalThis as any).window = previousWindow
      vi.resetModules()
    }
  })

  it('window.text.router.replace resolves to true on shallow success', async () => {
    const previousWindow = (globalThis as any).window
    const win: any = {
      location: {
        pathname: '/',
        search: '',
        hash: '',
        href: 'http://localhost/',
        origin: 'http://localhost',
      },
      history: { state: null, pushState() {}, replaceState() {} },
      addEventListener() {},
      dispatchEvent() {},
      scrollTo() {},
    }
    ;(globalThis as any).window = win

    try {
      vi.resetModules()
      await import('../src/shims/router.js?text-ssr')

      const result = await win.text.router.replace('/foo', undefined, { shallow: true })
      expect(result).toBe(true)
    } finally {
      ;(globalThis as any).window = previousWindow
      vi.resetModules()
    }
  })

  it('appRouterInstance exported from the navigation shim has the public router surface', async () => {
    vi.resetModules()
    const { appRouterInstance } = await import('../src/shims/navigation.js')

    // Ported from Text.js: publicAppRouterInstance shape in
    // packages/text/src/client/components/app-router-instance.ts (line 392).
    expect(typeof appRouterInstance.push).toBe('function')
    expect(typeof appRouterInstance.replace).toBe('function')
    expect(typeof appRouterInstance.back).toBe('function')
    expect(typeof appRouterInstance.forward).toBe('function')
    expect(typeof appRouterInstance.refresh).toBe('function')
    expect(typeof appRouterInstance.prefetch).toBe('function')
    expect(appRouterInstance.bfcacheId).toBe('0')
  })

  it("installWindowText is a no-op on the server (typeof window === 'undefined')", async () => {
    const previousWindow = (globalThis as any).window
    delete (globalThis as any).window

    try {
      vi.resetModules()
      const { installWindowText } = await import('../src/client/window-text.js')

      // Does not throw and does not attempt to create a global. We cannot
      // observe a non-existent window, so the assertion is structural: the
      // call returns without error and there is no global to inspect.
      expect(() => installWindowText({ version: 'x', appDir: true })).not.toThrow()
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      vi.resetModules()
    }
  })
})

// ---------------------------------------------------------------------------
// text/router withRouter HOC
//
// withRouter is a higher-order component that injects the Pages Router
// `router` instance as a prop into class components (which cannot call
// hooks). Real Text.js apps and the Text.js deploy test suite depend on
// this export — without it, bundlers fail with
// `[MISSING_EXPORT] "withRouter" is not exported by ".../shims/router.js"`.
//
// Ported from Text.js: packages/text/src/client/with-router.tsx
// https://github.com/vercel/next.js/blob/canary/packages/text/src/client/with-router.tsx
//
// Reference Text.js e2e fixture (class component using withRouter):
// .textjs-ref/test/e2e/with-router/pages/a.js
// ---------------------------------------------------------------------------
describe('text/router withRouter HOC', () => {
  let previousWindow: unknown

  function createTestRouter(overrides: Partial<TextRouter> = {}): TextRouter {
    const router: TextRouter = {
      pathname: '/provided',
      route: '/provided',
      query: {},
      asPath: '/provided',
      basePath: '',
      isReady: true,
      isPreview: false,
      isFallback: false,
      push: vi.fn(async () => true),
      replace: vi.fn(async () => true),
      back: vi.fn(),
      reload: vi.fn(),
      prefetch: vi.fn(async () => {}),
      beforePopState: vi.fn(),
      events: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
      },
    }
    return { ...router, ...overrides }
  }

  beforeEach(() => {
    previousWindow = (globalThis as any).window
    ;(globalThis as any).window = {
      location: { pathname: '/', search: '', hash: '', href: 'http://localhost/' },
      history: { state: null, pushState() {}, replaceState() {} },
      addEventListener() {},
    }
    vi.resetModules()
  })

  afterEach(() => {
    ;(globalThis as any).window = previousWindow
    vi.resetModules()
  })

  it('exports withRouter as a named function', async () => {
    const { withRouter } = await import('../src/shims/router.js?text-ssr')
    expect(typeof withRouter).toBe('function')
  })

  it('text/router useRouter reads the mounted RouterContext value', async () => {
    const { useRouter } = await import('../src/shims/router.js?text-ssr')
    const { RouterContext } = await import('../src/shims/internal/router-context.js')

    const providedRouter = createTestRouter({ pathname: '/from-context' })
    let captured: TextRouter | null = null

    function Probe() {
      captured = useRouter()
      return createElement('span', null, 'ok')
    }

    await renderAppServerElementToHtml(
      createElement(RouterContext.Provider, { value: providedRouter }, createElement(Probe)),
    )

    expect(captured).toBe(providedRouter)
  })

  it('text/router useRouter throws when the Pages Router context is not mounted', async () => {
    const { useRouter } = await import('../src/shims/router.js?text-ssr')

    function Probe() {
      useRouter()
      return createElement('span', null, 'ok')
    }

    await expect(renderAppServerElementToHtml(createElement(Probe))).rejects.toThrow(
      'TextRouter was not mounted',
    )
  })

  it('text/router useRouter does not subscribe once per hook call', async () => {
    const previousWindowForMock = (globalThis as any).window
    const addEventListener = vi.fn()
    const providedRouter = createTestRouter()

    ;(globalThis as any).window = {
      location: { pathname: '/', search: '', hash: '', href: 'http://localhost/' },
      history: { state: null, pushState() {}, replaceState() {} },
      addEventListener,
      removeEventListener: vi.fn(),
      __TEXT_DATA__: { page: '/', query: {}, isFallback: false },
    }

    vi.resetModules()
    try {
      const { useRouter } = await import('../src/shims/router.js?text-ssr')

      const { RouterContext } = await import('../src/shims/internal/router-context.js?text-ssr')
      function Probe() {
        expect(useRouter()).toBe(providedRouter)
        expect(useRouter()).toBe(providedRouter)
        expect(useRouter()).toBe(providedRouter)
        return createElement('span', null, 'ok')
      }
      await renderAppServerElementToHtml(
        createElement(RouterContext.Provider, { value: providedRouter }, createElement(Probe)),
      )

      const navigateListenerCalls = addEventListener.mock.calls.filter(
        call => call[0] === 'text:navigate',
      )
      expect(navigateListenerCalls).toHaveLength(0)
    } finally {
      vi.doUnmock('@rue-js/rue')
      if (previousWindowForMock === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindowForMock
      }
      vi.resetModules()
    }
  })

  it('withRouter wraps a component and forwards static props', async () => {
    const { withRouter } = await import('../src/shims/router.js?text-ssr')

    const Inner = (({ label }: { router: any; label: string }) =>
      createElement('span', null, label)) as any

    const Wrapped = withRouter(Inner)
    expect(typeof Wrapped).toBe('function')
    // displayName is set in dev to `withRouter(<Inner>)`.
    if (process.env.NODE_ENV !== 'production') {
      expect(Wrapped.displayName).toContain('withRouter')
    }
  })

  it('withRouter injects a router prop into the wrapped component', async () => {
    const { withRouter, setSSRContext } = await import('../src/shims/router.js?text-ssr')
    const previousWindow = globalThis.window

    let receivedRouter: any = null
    let receivedLabel: string | undefined
    const Inner = (props: { router: any; label: string }) => {
      receivedRouter = props.router
      receivedLabel = props.label
      return createElement('span', null, 'ok')
    }

    const Wrapped = withRouter(Inner)
    setSSRContext({
      pathname: '/with-router',
      query: {},
      asPath: '/with-router',
    })
    try {
      ;(globalThis as any).window = undefined
      const html = await renderAppServerElementToHtmlAsync(createElement(Wrapped, { label: 'hi' }))
      expect(html.replace(/<!--.*?-->/g, '')).toContain('<span>ok</span>')
    } finally {
      ;(globalThis as any).window = previousWindow
      setSSRContext(null)
    }
    expect(receivedLabel).toBe('hi')
    // router must be the TextRouter shape (push/replace/back/...).
    expect(receivedRouter).toBeTruthy()
    expect(typeof receivedRouter.push).toBe('function')
    expect(typeof receivedRouter.replace).toBe('function')
    expect(typeof receivedRouter.back).toBe('function')
    expect(typeof receivedRouter.reload).toBe('function')
    expect(typeof receivedRouter.prefetch).toBe('function')
    expect(receivedRouter.events).toBeDefined()
  })

  // Regression guard for Text.js spread order:
  // packages/text/src/client/with-router.tsx renders
  //   `<ComposedComponent router={useRouter()} {...props} />`
  // — the injected `router` is placed FIRST and `{...props}` spread after,
  // so a user-passed `router` prop overrides the HOC-injected one. If the
  // spread order is ever inverted in the shim, this test fails.
  it('user-passed router prop overrides the HOC-injected router (Text.js spread order)', async () => {
    const { withRouter, setSSRContext } = await import('../src/shims/router.js?text-ssr')
    const previousWindow = globalThis.window

    let receivedRouter: any = null
    const Inner = (props: { router: any }) => {
      receivedRouter = props.router
      return createElement('span', null, 'ok')
    }

    const Wrapped = withRouter(Inner)
    const userRouter = { sentinel: 'user-provided' }
    const WrappedWithOverride = Wrapped as (props: { router: unknown }) => unknown
    setSSRContext({
      pathname: '/with-router',
      query: {},
      asPath: '/with-router',
    })
    try {
      ;(globalThis as any).window = undefined
      await renderAppServerElementToHtmlAsync(
        createElement(WrappedWithOverride, { router: userRouter }),
      )
    } finally {
      ;(globalThis as any).window = previousWindow
      setSSRContext(null)
    }
    // Last spread wins: the user-passed router survives.
    expect(receivedRouter).toBe(userRouter)
  })

  it('withRouter forwards getInitialProps from the composed component', async () => {
    const { withRouter } = await import('../src/shims/router.js?text-ssr')

    type InnerType = ((props: { router: any }) => null) & {
      getInitialProps?: () => unknown
      origGetInitialProps?: () => unknown
    }
    const Inner: InnerType = (() => null) as InnerType
    const gip = () => ({ foo: 'bar' })
    Inner.getInitialProps = gip
    Inner.origGetInitialProps = gip

    const Wrapped = withRouter(Inner) as typeof Inner
    expect(Wrapped.getInitialProps).toBe(gip)
    expect(Wrapped.origGetInitialProps).toBe(gip)
  })
})

describe('text/headers shim', () => {
  it('exports cookies, headers, draftMode', async () => {
    const mod = await import('../src/shims/headers.js')
    expect(typeof mod.cookies).toBe('function')
    expect(typeof mod.headers).toBe('function')
    expect(typeof mod.draftMode).toBe('function')
  })

  it('headers() returns request headers from context', async () => {
    const { setHeadersContext, headers } = await import('../src/shims/headers.js')
    const reqHeaders = new Headers({ 'x-custom': 'test-value' })
    setHeadersContext({
      headers: reqHeaders,
      cookies: new Map(),
    })

    const h = await headers()
    expect(h.get('x-custom')).toBe('test-value')
    setHeadersContext(null)
  })

  it('headers() supports the legacy sync access pattern', async () => {
    // Text.js docs: headers() temporarily supports sync property access in v15.
    const { setHeadersContext, headers } = await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers({ 'x-sync-header': 'sync-value' }),
      cookies: new Map(),
    })

    const headerStore = headers()
    expect(typeof headerStore.get).toBe('function')
    expect(headerStore.get('x-sync-header')).toBe('sync-value')

    const awaited = await headerStore
    expect(awaited.get('x-sync-header')).toBe('sync-value')
    setHeadersContext(null)
  })

  it('headers() and cookies() reuse request API promise identity within a request context', async () => {
    // Text.js caches request API promises by the underlying request object:
    // packages/text/src/server/request/headers.ts
    // packages/text/src/server/request/cookies.ts
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/server/request/headers.ts
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/server/request/cookies.ts
    const { setHeadersAccessPhase, setHeadersContext, headers, cookies } =
      await import('../src/shims/headers.js')

    setHeadersContext({
      headers: new Headers({ 'x-custom': 'test-value' }),
      cookies: new Map([['session', 'abc123']]),
    })

    try {
      const firstHeaders = headers()
      const secondHeaders = headers()
      expect(secondHeaders).toBe(firstHeaders)
      expect(await secondHeaders).toBe(await firstHeaders)

      const firstReadonlyCookies = cookies()
      const secondReadonlyCookies = cookies()
      expect(secondReadonlyCookies).toBe(firstReadonlyCookies)
      expect(await secondReadonlyCookies).toBe(await firstReadonlyCookies)

      setHeadersAccessPhase('route-handler')

      const firstMutableCookies = cookies()
      const secondMutableCookies = cookies()
      expect(secondMutableCookies).toBe(firstMutableCookies)
      expect(await secondMutableCookies).toBe(await firstMutableCookies)
      expect(firstMutableCookies).not.toBe(firstReadonlyCookies)
    } finally {
      setHeadersContext(null)
    }
  })

  it('headers() is read-only for both sync and awaited access', async () => {
    // Ported from Text.js:
    // packages/text/src/server/web/spec-extension/adapters/headers.test.ts
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/server/web/spec-extension/adapters/headers.test.ts
    const { setHeadersContext, headers } = await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers({ foo: 'original' }),
      cookies: new Map(),
    })

    const syncHeaders = headers()
    expect(() => Reflect.get(syncHeaders, 'set')).toThrow(/Headers cannot be modified/)
    expect(() => Reflect.get(syncHeaders, 'append')).toThrow(/Headers cannot be modified/)
    expect(() => Reflect.get(syncHeaders, 'delete')).toThrow(/Headers cannot be modified/)
    expect(() => syncHeaders.set('foo', 'mutated')).toThrow(/Headers cannot be modified/)
    expect(() => syncHeaders.append('foo', 'mutated')).toThrow(/Headers cannot be modified/)
    expect(() => syncHeaders.delete('foo')).toThrow(/Headers cannot be modified/)
    expect(syncHeaders.get('foo')).toBe('original')

    const awaitedHeaders = await headers()
    expect(() => Reflect.get(awaitedHeaders, 'set')).toThrow(/Headers cannot be modified/)
    expect(() => awaitedHeaders.set('foo', 'mutated')).toThrow(/Headers cannot be modified/)
    expect(awaitedHeaders.get('foo')).toBe('original')
    expect((await headers()).get('foo')).toBe('original')
    setHeadersContext(null)
  })

  it('cookies() returns parsed cookies from context', async () => {
    const { setHeadersContext, cookies } = await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map([
        ['session', 'abc123'],
        ['theme', 'dark'],
      ]),
    })

    const c = await cookies()
    expect(c.get('session')).toEqual({ name: 'session', value: 'abc123' })
    expect(c.get('theme')).toEqual({ name: 'theme', value: 'dark' })
    expect(c.has('session')).toBe(true)
    expect(c.has('missing')).toBe(false)
    expect(c.size).toBe(2)
    setHeadersContext(null)
  })

  it('cookies() supports the legacy sync access pattern', async () => {
    // Text.js docs: cookies() temporarily supports sync property access in v15.
    const { setHeadersContext, cookies } = await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map([['session', 'sync-cookie']]),
    })

    const cookieStore = cookies()
    expect(typeof cookieStore.get).toBe('function')
    expect(cookieStore.get('session')).toEqual({ name: 'session', value: 'sync-cookie' })

    const awaited = await cookieStore
    expect(awaited.get('session')).toEqual({ name: 'session', value: 'sync-cookie' })
    setHeadersContext(null)
  })

  it('cookies() is read-only during render for both sync and awaited access', async () => {
    // Ported from Text.js:
    // packages/text/src/server/web/spec-extension/adapters/request-cookies.test.ts
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/server/web/spec-extension/adapters/request-cookies.test.ts
    const { setHeadersContext, cookies, getAndClearPendingCookies } =
      await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map([['session', 'abc123']]),
    })

    const syncCookies = cookies()
    expect(() => Reflect.get(syncCookies, 'set')).toThrow(
      /Cookies can only be modified in a Server Action or Route Handler/,
    )
    expect(() => Reflect.get(syncCookies, 'delete')).toThrow(
      /Cookies can only be modified in a Server Action or Route Handler/,
    )
    expect(() => syncCookies.set('session', 'mutated')).toThrow(
      /Cookies can only be modified in a Server Action or Route Handler/,
    )
    expect(() => syncCookies.delete('session')).toThrow(
      /Cookies can only be modified in a Server Action or Route Handler/,
    )
    expect(syncCookies.get('session')).toEqual({ name: 'session', value: 'abc123' })

    const awaitedCookies = await cookies()
    expect(() => Reflect.get(awaitedCookies, 'set')).toThrow(
      /Cookies can only be modified in a Server Action or Route Handler/,
    )
    expect(() => awaitedCookies.set('session', 'mutated')).toThrow(
      /Cookies can only be modified in a Server Action or Route Handler/,
    )
    expect(() => awaitedCookies.delete('session')).toThrow(
      /Cookies can only be modified in a Server Action or Route Handler/,
    )

    expect(getAndClearPendingCookies()).toEqual([])
    expect((await cookies()).get('session')).toEqual({ name: 'session', value: 'abc123' })
    setHeadersContext(null)
  })

  it('headersContextFromRequest parses cookies from Request', async () => {
    const { headersContextFromRequest } = await import('../src/shims/headers.js')
    const req = new Request('https://example.com', {
      headers: { cookie: 'a=1; b=2' },
    })
    const ctx = headersContextFromRequest(req)

    expect(ctx.cookies.get('a')).toBe('1')
    expect(ctx.cookies.get('b')).toBe('2')
    expect(ctx.headers.get('cookie')).toBe('a=1; b=2')
  })

  it('cookies().getAll(name) filters by name and matches upstream duplicate semantics', async () => {
    const { headersContextFromRequest, runWithHeadersContext, cookies } =
      await import('../src/shims/headers.js')

    // Ported from the current @edge-runtime/cookies RequestCookies behavior:
    // duplicate names are collapsed to the last value, and getAll(name) filters.
    const ctx = headersContextFromRequest(
      new Request('https://example.com', {
        headers: { cookie: 'a=1; a=2; b=3' },
      }),
    )

    await runWithHeadersContext(ctx, async () => {
      const jar = await cookies()
      expect(jar.get('a')).toEqual({ name: 'a', value: '2' })
      expect(jar.getAll('a')).toEqual([{ name: 'a', value: '2' }])
      expect(jar.getAll()).toEqual([
        { name: 'a', value: '2' },
        { name: 'b', value: '3' },
      ])
    })
  })

  it('cookies().getAll({ name }) supports the RequestCookie overload and missing names', async () => {
    const { headersContextFromRequest, runWithHeadersContext, cookies } =
      await import('../src/shims/headers.js')

    const ctx = headersContextFromRequest(
      new Request('https://example.com', {
        headers: { cookie: 'a=1; a=2; token=abc%3D123' },
      }),
    )

    await runWithHeadersContext(ctx, async () => {
      const jar = await cookies()
      expect(jar.getAll({ name: 'a' })).toEqual([{ name: 'a', value: '2' }])
      expect(jar.getAll('missing')).toEqual([])
      expect(jar.getAll({ name: 'missing' })).toEqual([])
      expect(jar.get('token')).toEqual({ name: 'token', value: 'abc=123' })
    })
  })

  it('cookies() ignores malformed cookie values and treats bare tokens as true', async () => {
    const { headersContextFromRequest, runWithHeadersContext, cookies } =
      await import('../src/shims/headers.js')

    const ctx = headersContextFromRequest(
      new Request('https://example.com', {
        headers: { cookie: 'bad=%E0%A4%A; good=ok; flag' },
      }),
    )

    await runWithHeadersContext(ctx, async () => {
      const jar = await cookies()
      expect(jar.get('bad')).toBeUndefined()
      expect(jar.get('good')).toEqual({ name: 'good', value: 'ok' })
      expect(jar.get('flag')).toEqual({ name: 'flag', value: 'true' })
      expect(jar.getAll()).toEqual([
        { name: 'good', value: 'ok' },
        { name: 'flag', value: 'true' },
      ])
    })
  })

  it('cookies() preserves explicit empty values', async () => {
    const { headersContextFromRequest, runWithHeadersContext, cookies } =
      await import('../src/shims/headers.js')

    const ctx = headersContextFromRequest(
      new Request('https://example.com', {
        headers: { cookie: 'empty=; flag' },
      }),
    )

    await runWithHeadersContext(ctx, async () => {
      const jar = await cookies()
      expect(jar.get('empty')).toEqual({ name: 'empty', value: '' })
      expect(jar.get('flag')).toEqual({ name: 'flag', value: 'true' })
      expect(jar.getAll()).toEqual([
        { name: 'empty', value: '' },
        { name: 'flag', value: 'true' },
      ])
    })
  })

  it('cookies() preserves whitespace exactly like the Text.js parser', async () => {
    const { headersContextFromRequest, runWithHeadersContext, cookies } =
      await import('../src/shims/headers.js')

    const ctx = headersContextFromRequest(
      new Request('https://example.com', {
        headers: { cookie: 'a= 1 ; a =2' },
      }),
    )

    await runWithHeadersContext(ctx, async () => {
      const jar = await cookies()
      expect(jar.get('a')).toEqual({ name: 'a', value: ' 1 ' })
      expect(jar.get('a ')).toEqual({ name: 'a ', value: '2' })
      expect(jar.getAll()).toEqual([
        { name: 'a', value: ' 1 ' },
        { name: 'a ', value: '2' },
      ])
    })
  })

  it('headersContextFromRequest returns mutable headers (not the immutable Request.headers)', async () => {
    // In Cloudflare Workers, Request.headers is immutable. applyMiddlewareRequestHeaders
    // needs ctx.headers.set() after middleware runs, so the context must hold a mutable
    // copy, not the original Headers reference.
    const { headersContextFromRequest } = await import('../src/shims/headers.js')
    const req = new Request('https://example.com', {
      headers: { 'x-custom': 'original' },
    })
    const ctx = headersContextFromRequest(req)

    // Must be a separate, mutable copy — not the same reference
    expect(ctx.headers).not.toBe(req.headers)

    // Must be writable without throwing
    expect(() => ctx.headers.set('x-custom', 'modified')).not.toThrow()
    expect(ctx.headers.get('x-custom')).toBe('modified')

    // Original request headers must be unaffected
    expect(req.headers.get('x-custom')).toBe('original')
  })

  it('headersContextFromRequest defers new Headers() copy until first write', async () => {
    // Performance regression guard: the expensive cross-boundary copy in Workerd
    // (new Headers(request.headers)) must NOT happen on reads — only on the
    // first mutating call (.set/.delete/.append).
    const { headersContextFromRequest } = await import('../src/shims/headers.js')
    const req = new Request('https://example.com', {
      headers: { 'x-foo': 'bar', cookie: 'a=1' },
    })
    const ctx = headersContextFromRequest(req)

    // Reads must work before any write (no copy yet)
    expect(ctx.headers.get('x-foo')).toBe('bar')
    expect(ctx.headers.has('x-foo')).toBe(true)

    // After a write, the copy is materialised and the new value is visible
    ctx.headers.set('x-foo', 'baz')
    expect(ctx.headers.get('x-foo')).toBe('baz')

    // Original request is untouched
    expect(req.headers.get('x-foo')).toBe('bar')
  })

  it('headersContextFromRequest preserves iterator-based reads before copy-on-write', async () => {
    // Ported from Text.js:
    // packages/text/src/server/web/spec-extension/adapters/headers.test.ts
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/server/web/spec-extension/adapters/headers.test.ts
    const { headersContextFromRequest } = await import('../src/shims/headers.js')
    const ctx = headersContextFromRequest(
      new Request('https://example.com', {
        headers: {
          'x-iter-a': 'alpha',
          'x-iter-b': 'beta',
        },
      }),
    )

    expect(Array.from(ctx.headers)).toEqual([
      ['x-iter-a', 'alpha'],
      ['x-iter-b', 'beta'],
    ])
    expect(Array.from(ctx.headers.entries())).toEqual([
      ['x-iter-a', 'alpha'],
      ['x-iter-b', 'beta'],
    ])
    expect(Array.from(ctx.headers.keys())).toEqual(['x-iter-a', 'x-iter-b'])
    expect(Array.from(ctx.headers.values())).toEqual(['alpha', 'beta'])
    expect(Object.fromEntries(ctx.headers)).toEqual({
      'x-iter-a': 'alpha',
      'x-iter-b': 'beta',
    })
  })

  it('headers() preserves iterator-based reads for sync and awaited access', async () => {
    const { headersContextFromRequest, runWithHeadersContext, headers } =
      await import('../src/shims/headers.js')
    const ctx = headersContextFromRequest(
      new Request('https://example.com', {
        headers: {
          'x-iter-a': 'alpha',
          'x-iter-b': 'beta',
        },
      }),
    )

    await runWithHeadersContext(ctx, async () => {
      const syncHeaders = headers()
      expect(Array.from(syncHeaders)).toEqual([
        ['x-iter-a', 'alpha'],
        ['x-iter-b', 'beta'],
      ])
      expect(Array.from(syncHeaders.keys())).toEqual(['x-iter-a', 'x-iter-b'])

      const awaitedHeaders = await headers()
      expect(Array.from(awaitedHeaders.entries())).toEqual([
        ['x-iter-a', 'alpha'],
        ['x-iter-b', 'beta'],
      ])
      expect(Array.from(awaitedHeaders.values())).toEqual(['alpha', 'beta'])
      expect(Object.fromEntries(awaitedHeaders)).toEqual({
        'x-iter-a': 'alpha',
        'x-iter-b': 'beta',
      })
    })
  })

  it('headersContextFromRequest defers cookie parsing until first access', async () => {
    // Cookie parsing should be deferred: accessing ctx.cookies triggers parsing,
    // but merely calling headersContextFromRequest must not.
    const { headersContextFromRequest } = await import('../src/shims/headers.js')
    const req = new Request('https://example.com', {
      headers: { cookie: 'session=xyz; theme=dark' },
    })
    const ctx = headersContextFromRequest(req)

    // First access parses cookies
    expect(ctx.cookies.get('session')).toBe('xyz')
    expect(ctx.cookies.get('theme')).toBe('dark')

    // Subsequent access returns the same map (no re-parse)
    const map1 = ctx.cookies
    const map2 = ctx.cookies
    expect(map1).toBe(map2)
  })

  it('headersContextFromRequest cookie getter reflects middleware-modified cookie header', async () => {
    // When middleware calls ctx.headers.set("cookie", ...) the lazy cookie
    // map must reflect the new value on text access.
    const { headersContextFromRequest, applyMiddlewareRequestHeaders, runWithHeadersContext } =
      await import('../src/shims/headers.js')
    const req = new Request('https://example.com', {
      headers: { cookie: 'a=1' },
    })
    const ctx = headersContextFromRequest(req)

    // Simulate middleware updating the cookie header
    const middlewareResponseHeaders = new Headers({
      'x-middleware-request-cookie': 'a=2; b=3',
    })

    await runWithHeadersContext(ctx, async () => {
      applyMiddlewareRequestHeaders(middlewareResponseHeaders)
      // Cookies map should be rebuilt with the new values
      expect(ctx.cookies.get('a')).toBe('2')
      expect(ctx.cookies.get('b')).toBe('3')
    })
  })

  it('cookies().getAll(name) reflects middleware cookie rewrites with duplicate names', async () => {
    const {
      headersContextFromRequest,
      applyMiddlewareRequestHeaders,
      runWithHeadersContext,
      cookies,
    } = await import('../src/shims/headers.js')
    const req = new Request('https://example.com', {
      headers: { cookie: 'a=1; b=2' },
    })
    const ctx = headersContextFromRequest(req)

    await runWithHeadersContext(ctx, async () => {
      applyMiddlewareRequestHeaders(
        new Headers({
          'x-middleware-request-cookie': 'a=1; a=2; b=4',
        }),
      )

      const jar = await cookies()
      expect(jar.get('a')).toEqual({ name: 'a', value: '2' })
      expect(jar.getAll('a')).toEqual([{ name: 'a', value: '2' }])
      expect(jar.getAll({ name: 'a' })).toEqual([{ name: 'a', value: '2' }])
      expect(jar.getAll()).toEqual([
        { name: 'a', value: '2' },
        { name: 'b', value: '4' },
      ])
    })
  })

  it('cookies() preserves explicit empty values after middleware cookie rewrites', async () => {
    const {
      headersContextFromRequest,
      applyMiddlewareRequestHeaders,
      runWithHeadersContext,
      cookies,
    } = await import('../src/shims/headers.js')
    const ctx = headersContextFromRequest(
      new Request('https://example.com', {
        headers: { cookie: 'start=1' },
      }),
    )

    await runWithHeadersContext(ctx, async () => {
      applyMiddlewareRequestHeaders(
        new Headers({
          'x-middleware-request-cookie': 'empty=; flag',
        }),
      )

      const jar = await cookies()
      expect(jar.get('empty')).toEqual({ name: 'empty', value: '' })
      expect(jar.get('flag')).toEqual({ name: 'flag', value: 'true' })
      expect(jar.getAll()).toEqual([
        { name: 'empty', value: '' },
        { name: 'flag', value: 'true' },
      ])
    })
  })

  // Ported from Text.js:
  // - packages/text/src/server/async-storage/request-store.ts
  // - test/e2e/app-dir/app-middleware/app-middleware.test.ts
  // https://github.com/vercel/next.js/blob/canary/packages/text/src/server/async-storage/request-store.ts
  // https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/app-middleware/app-middleware.test.ts
  it('middleware-set cookies are visible to cookies() in the same render', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    const {
      headersContextFromRequest,
      applyMiddlewareRequestHeaders,
      runWithHeadersContext,
      cookies,
    } = await import('../src/shims/headers.js')

    const middlewareResponse = TextResponse.text()
    middlewareResponse.cookies.set('rsc-cookie-value-1', '123', { path: '/' })
    middlewareResponse.cookies.set('rsc-cookie-value-2', '456', { path: '/', secure: true })

    const ctx = headersContextFromRequest(
      new Request('https://example.com/rsc-cookies', {
        headers: { cookie: 'existing=kept' },
      }),
    )

    await runWithHeadersContext(ctx, async () => {
      applyMiddlewareRequestHeaders(middlewareResponse.headers)

      const jar = await cookies()
      expect(jar.get('existing')).toEqual({ name: 'existing', value: 'kept' })
      expect(jar.get('rsc-cookie-value-1')).toEqual({
        name: 'rsc-cookie-value-1',
        value: '123',
      })
      expect(jar.get('rsc-cookie-value-2')).toEqual({
        name: 'rsc-cookie-value-2',
        value: '456',
      })
      expect(jar.getAll()).toEqual([
        { name: 'existing', value: 'kept' },
        { name: 'rsc-cookie-value-1', value: '123' },
        { name: 'rsc-cookie-value-2', value: '456' },
      ])
    })
  })

  it('throws when called outside request context', async () => {
    const { headers, cookies, draftMode } = await import('../src/shims/headers.js')
    // Ensure context is cleared
    const { setHeadersContext } = await import('../src/shims/headers.js')
    setHeadersContext(null)

    await expect(headers()).rejects.toThrow('Server Component')
    await expect(cookies()).rejects.toThrow('Server Component')
    await expect(draftMode()).rejects.toThrow('draftMode() can only be called')
  })

  it('legacy sync access still throws the request-context error outside request context', async () => {
    const { headers, cookies, setHeadersContext } = await import('../src/shims/headers.js')
    setHeadersContext(null)

    expect(() => headers().get('x-test')).toThrow('Server Component')
    expect(() => cookies().get('session')).toThrow('Server Component')
  })

  it('draftMode() returns isEnabled=false when no bypass cookie', async () => {
    const { setHeadersContext, draftMode } = await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map(),
    })
    const dm = await draftMode()
    expect(dm.isEnabled).toBe(false)
    setHeadersContext(null)
  })

  it('draftMode() returns isEnabled=false for arbitrary cookie values (not signed)', async () => {
    const { setHeadersContext, draftMode } = await import('../src/shims/headers.js')
    // An arbitrary cookie value should NOT enable draft mode — only the
    // server-generated secret is valid.
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map([['__prerender_bypass', '1']]),
    })
    const dm = await draftMode()
    expect(dm.isEnabled).toBe(false)
    setHeadersContext(null)
  })

  it('draft mode validation is scoped to the request context secret', async () => {
    const { draftMode, headersContextFromRequest, isDraftModeRequest, runWithHeadersContext } =
      await import('../src/shims/headers.js')

    const firstContext = headersContextFromRequest(new Request('https://example.test/one'), {
      draftModeSecret: 'first-secret',
    })
    const secondContext = headersContextFromRequest(new Request('https://example.test/two'), {
      draftModeSecret: 'second-secret',
    })

    await runWithHeadersContext(firstContext, async () => {
      const dm = await draftMode()
      dm.enable()
      expect(dm.isEnabled).toBe(true)
    })

    await runWithHeadersContext(secondContext, async () => {
      const dm = await draftMode()
      dm.enable()
      expect(dm.isEnabled).toBe(true)
    })

    const firstCookieRequest = new Request('https://example.test/one', {
      headers: { Cookie: '__prerender_bypass=first-secret' },
    })
    expect(isDraftModeRequest(firstCookieRequest, 'first-secret')).toBe(true)
    expect(isDraftModeRequest(firstCookieRequest, 'second-secret')).toBe(false)
  })

  it('draftMode().enable() sets the bypass cookie in context', async () => {
    const { setHeadersContext, draftMode, getDraftModeCookieHeader } =
      await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map(),
    })
    const dm = await draftMode()
    expect(dm.isEnabled).toBe(false)

    dm.enable()
    // isEnabled should reflect the change on the same object (live getter)
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/server/request/draft-mode.ts
    expect(dm.isEnabled).toBe(true)
    // A fresh draftMode() call should also see the change
    const dm2 = await draftMode()
    expect(dm2.isEnabled).toBe(true)

    // The Set-Cookie header should be generated with a non-predictable secret (UUID)
    const cookieHeader = getDraftModeCookieHeader()
    expect(cookieHeader).toContain('__prerender_bypass=')
    const bypassMatch = cookieHeader!.match(/__prerender_bypass=([^;]+)/)
    expect(bypassMatch).not.toBeNull()
    expect(bypassMatch![1]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(cookieHeader).toContain('HttpOnly')
    setHeadersContext(null)
  })

  it('draftMode().disable() clears the bypass cookie', async () => {
    const { setHeadersContext, draftMode, getDraftModeCookieHeader } =
      await import('../src/shims/headers.js')
    setHeadersContext({
      headers: new Headers(),
      cookies: new Map(),
    })
    // Enable first so the cookie is set to the server secret
    const dm = await draftMode()
    dm.enable()
    // Consume the enable Set-Cookie header
    getDraftModeCookieHeader()

    const dm1 = await draftMode()
    expect(dm1.isEnabled).toBe(true)

    dm1.disable()
    // isEnabled should reflect the change on the same object (live getter)
    expect(dm1.isEnabled).toBe(false)
    // A fresh draftMode() call should also see the change
    const dm2 = await draftMode()
    expect(dm2.isEnabled).toBe(false)

    const cookieHeader = getDraftModeCookieHeader()
    expect(cookieHeader).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT')
    expect(cookieHeader).not.toContain('Max-Age=0')
    setHeadersContext(null)
  })

  it('draftMode().disable() throws after its request context has been cleared', async () => {
    const { setHeadersContext, draftMode, getDraftModeCookieHeader } =
      await import('../src/shims/headers.js')

    setHeadersContext({
      headers: new Headers(),
      cookies: new Map([['__prerender_bypass', 'draft-secret']]),
      draftModeSecret: 'draft-secret',
    })
    const dm = await draftMode()
    expect(dm.isEnabled).toBe(true)

    setHeadersContext(null)

    expect(() => dm.disable()).toThrow('draftMode().disable() can only be called')
    expect(getDraftModeCookieHeader()).toBeNull()
  })

  it('draftMode() throws the dynamic = "error" access error before exposing draft controls', async () => {
    const { setHeadersContext, draftMode, getDraftModeCookieHeader, consumeDynamicUsage } =
      await import('../src/shims/headers.js')
    const accessError = new Error(
      'Page with `dynamic = "error"` used a dynamic API. This page was expected to be fully static.',
    )

    setHeadersContext({
      headers: new Headers(),
      cookies: new Map(),
      accessError,
    })

    await expect(draftMode()).rejects.toThrow(accessError)
    expect(consumeDynamicUsage()).toBe(false)
    expect(getDraftModeCookieHeader()).toBeNull()

    setHeadersContext(null)
  })
})
