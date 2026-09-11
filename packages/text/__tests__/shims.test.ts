import { describe, it, expect, vi } from 'vite-plus/test'
import { createElement, renderAppServerElementToHtml } from './app-server-protocol-test-utils.js'
import { extractTextTextDataJson } from '../src/client/text-text-data.js'

describe('text text data client helpers', () => {
  it('extracts __TEXT_DATA__ after carriage-return whitespace', () => {
    const json = '{"props":{},"page":"/","query":{}}'

    expect(extractTextTextDataJson(`<script>window.__TEXT_DATA__ = \r\n\t${json}</script>`)).toBe(
      json,
    )
  })
})

describe('text/navigation shim', () => {
  it('exports usePathname, useSearchParams, useParams, useRouter', async () => {
    const nav = await import('../src/shims/navigation.js')
    expect(typeof nav.usePathname).toBe('function')
    expect(typeof nav.useSearchParams).toBe('function')
    expect(typeof nav.useParams).toBe('function')
    expect(typeof nav.useRouter).toBe('function')
  })

  // Text.js parity: text/navigation's useRouter reads AppRouterContext and
  // throws when it is rendered outside the App Router provider.
  // Ported from Text.js:
  // https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/navigation.ts
  it('useRouter() throws when AppRouterContext is not mounted', async () => {
    const { useRouter } = await import('../src/shims/navigation.js')

    function Probe() {
      useRouter()
      return createElement('span', null, 'unreachable')
    }

    await expect(renderAppServerElementToHtml(createElement(Probe))).rejects.toThrow(
      'invariant expected app router to be mounted',
    )
  })

  // Regression test: within the App Router provider, useRouter() must return
  // the mounted router instance. Text.js returns a stable router reference from
  // context, so components using the router in dependency arrays do not
  // re-render unnecessarily.
  // Ported from: https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/hooks/hooks.test.ts
  it('useRouter() returns the mounted AppRouterContext router', async () => {
    const { useRouter, appRouterInstance } = await import('../src/shims/navigation.js')
    const { AppRouterContext } = await import('../src/shims/internal/app-router-context.js')
    const captured: unknown[] = []

    function Probe() {
      captured.push(useRouter(), useRouter())
      return createElement('span', null, 'ok')
    }

    if (!AppRouterContext) {
      throw new Error('Expected AppRouterContext to be available in the test renderer')
    }

    await renderAppServerElementToHtml(
      createElement(AppRouterContext.Provider, { value: appRouterInstance }, createElement(Probe)),
    )

    expect(captured).toEqual([appRouterInstance, appRouterInstance])
  })

  it('appRouterInstance singleton exposes the expected navigation methods', async () => {
    const { appRouterInstance: router } = await import('../src/shims/navigation.js')
    expect(typeof router.push).toBe('function')
    expect(typeof router.replace).toBe('function')
    expect(typeof router.back).toBe('function')
    expect(typeof router.forward).toBe('function')
    expect(typeof router.refresh).toBe('function')
    expect(typeof router.prefetch).toBe('function')
  })

  it('appRouterInstance exposes the stable bfcacheId placeholder', async () => {
    const { appRouterInstance } = await import('../src/shims/navigation.js')
    expect(typeof appRouterInstance.bfcacheId).toBe('string')
    expect(appRouterInstance.bfcacheId).toBe('0')
  })

  // Text.js parity: refresh-reducer.ts invalidates the entire segment cache.
  // Our equivalent is clearClientNavigationCaches(), which router.refresh()
  // must call before re-fetching, or stale cached RSC payloads for sibling
  // routes will still satisfy a subsequent client navigation. The clear must
  // happen before the rscNavigate dispatch so it cannot race with prefetches
  // kicked off during the transition's renders.
  // Ported from: https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/router-reducer/reducers/refresh-reducer.ts
  it('router.refresh() clears nav caches before dispatching the RSC re-fetch', async () => {
    const previousWindow = (globalThis as any).window
    const calls: string[] = []
    const win = {
      location: { href: 'http://localhost/current' },
      history: {
        state: null,
        pushState: () => {},
        replaceState: () => {},
      },
      addEventListener: () => {},
      [Symbol.for('text.navigationRuntime')]: {
        bootstrap: {
          routeManifest: null,
          rsc: undefined,
        },
        functions: {
          clearNavigationCaches: () => {
            calls.push('clear')
          },
          navigate: async (_href: string, _depth: number, kind: string) => {
            calls.push(`navigate:${kind}`)
          },
        },
      },
    }
    ;(globalThis as any).window = win

    try {
      vi.resetModules()
      const { appRouterInstance } = await import('../src/shims/navigation.js')
      appRouterInstance.refresh()
      // refresh() schedules the rscNavigate inside the transition scheduler, so
      // the navigate call lands after the synchronous clear but is dispatched
      // in the same tick — yield once to let it flush.
      await Promise.resolve()
      await Promise.resolve()

      expect(calls[0]).toBe('clear')
      expect(calls).toContain('navigate:refresh')
      expect(calls.indexOf('clear')).toBeLessThan(calls.indexOf('navigate:refresh'))
    } finally {
      ;(globalThis as any).window = previousWindow
      vi.resetModules()
    }
  })

  it('keeps pending render snapshot active when external history.pushState syncs the URL', async () => {
    const previousWindow = (globalThis as any).window
    const win = {
      location: {
        pathname: '/current',
        search: '?from=committed',
        hash: '',
        href: 'http://localhost/current?from=committed',
        origin: 'http://localhost',
      },
      history: {
        state: null,
        pushState(_data: unknown, _unused: string, url?: string | URL | null) {
          if (!url) return
          const parsed = new URL(url, win.location.href)
          win.location.pathname = parsed.pathname
          win.location.search = parsed.search
          win.location.hash = parsed.hash
          win.location.href = parsed.href
        },
        replaceState(_data: unknown, _unused: string, url?: string | URL | null) {
          if (!url) return
          const parsed = new URL(url, win.location.href)
          win.location.pathname = parsed.pathname
          win.location.search = parsed.search
          win.location.hash = parsed.hash
          win.location.href = parsed.href
        },
      },
      addEventListener: vi.fn(),
    }
    ;(globalThis as any).window = win

    try {
      vi.resetModules()
      const navigation = await import('../src/shims/navigation.js')
      const Context = navigation.getClientNavigationRenderContext()
      if (!Context) {
        throw new Error('Expected client navigation render context')
      }

      navigation.activateNavigationSnapshot()
      const snapshot = navigation.createClientNavigationRenderSnapshot(
        'http://localhost/pending?from=snapshot',
        {},
      )

      const readHookValues = async () => {
        let pathname = ''
        let search = ''
        function Probe() {
          pathname = navigation.usePathname()
          search = navigation.useSearchParams().toString()
          return createElement('span', null, pathname)
        }

        await renderAppServerElementToHtml(
          createElement(Context.Provider, { value: snapshot }, createElement(Probe)),
        )

        return { pathname, search }
      }

      expect(await readHookValues()).toEqual({
        pathname: '/pending',
        search: 'from=snapshot',
      })

      win.history.pushState(null, '', '/ownerless?from=history')

      expect(await readHookValues()).toEqual({
        pathname: '/pending',
        search: 'from=snapshot',
      })
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
    }
  })

  it('preserves App Router history metadata when external history calls provide caller state', async () => {
    // Matches Text.js' external History API wrapper behavior:
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/app-router.tsx#L114-L127
    // Covered by Text.js shallow-routing tests for object, null, and undefined state:
    // https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/shallow-routing/shallow-routing.test.ts
    const previousWindow = (globalThis as any).window
    const historyPreviousTextUrlKey = '__text_previousTextUrl'
    const historyTraversalIndexKey = '__text_historyIndex'
    const win = {
      location: {
        pathname: '/photo/1',
        search: '',
        hash: '',
        href: 'http://localhost/photo/1',
        origin: 'http://localhost',
      },
      history: {
        state: {
          [historyPreviousTextUrlKey]: '/feed',
          [historyTraversalIndexKey]: 4,
        } as unknown,
        pushState(data: unknown, _unused: string, url?: string | URL | null) {
          this.state = data
          if (!url) return
          const parsed = new URL(url, win.location.href)
          win.location.pathname = parsed.pathname
          win.location.search = parsed.search
          win.location.hash = parsed.hash
          win.location.href = parsed.href
        },
        replaceState(data: unknown, _unused: string, url?: string | URL | null) {
          this.state = data
          if (!url) return
          const parsed = new URL(url, win.location.href)
          win.location.pathname = parsed.pathname
          win.location.search = parsed.search
          win.location.hash = parsed.hash
          win.location.href = parsed.href
        },
      },
      addEventListener: vi.fn(),
    }
    ;(globalThis as any).window = win

    try {
      vi.resetModules()
      await import('../src/shims/navigation.js')

      win.history.pushState({ myData: { foo: 'bar' } }, '', '/photo/1?filter=active')
      expect(win.history.state).toEqual({
        [historyPreviousTextUrlKey]: '/feed',
        [historyTraversalIndexKey]: 4,
        myData: { foo: 'bar' },
      })

      win.history.pushState(null, '', '/photo/1?filter=pending')
      expect(win.history.state).toEqual({
        [historyPreviousTextUrlKey]: '/feed',
        [historyTraversalIndexKey]: 4,
      })

      win.history.replaceState(null, '', '/photo/1?filter=archived')
      expect(win.history.state).toEqual({
        [historyPreviousTextUrlKey]: '/feed',
        [historyTraversalIndexKey]: 4,
      })

      win.history.replaceState(undefined, '', '/photo/1?filter=all')
      expect(win.history.state).toEqual({
        [historyPreviousTextUrlKey]: '/feed',
        [historyTraversalIndexKey]: 4,
      })

      win.history.state = { [historyTraversalIndexKey]: 7 }
      win.history.pushState({ text: true }, '', '/photo/1?filter=done')
      expect(win.history.state).toEqual({
        [historyTraversalIndexKey]: 7,
        text: true,
      })
    } finally {
      vi.resetModules()
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
    }
  })

  it('exports redirect, notFound, permanentRedirect', async () => {
    const nav = await import('../src/shims/navigation.js')
    expect(typeof nav.redirect).toBe('function')
    expect(typeof nav.notFound).toBe('function')
    expect(typeof nav.permanentRedirect).toBe('function')
  })

  it('redirect() throws with correct digest', async () => {
    const { redirect } = await import('../src/shims/navigation.js')
    try {
      redirect('/login')
      expect.unreachable('should have thrown')
    } catch (e: any) {
      expect(e.digest).toContain('TEXT_REDIRECT')
      // URL is encodeURIComponent-encoded in the digest to prevent delimiter injection
      expect(e.digest).toContain(encodeURIComponent('/login'))
    }
  })

  // Ported from Text.js: packages/text/src/client/components/redirect.ts
  // In Text.js, redirect() without an explicit type uses an empty sentinel so
  // the context (action vs render) can resolve the default at the catch site.
  it('redirect() without explicit type uses empty sentinel (context-dependent default)', async () => {
    const { redirect } = await import('../src/shims/navigation.js')
    try {
      redirect('/dashboard')
      expect.unreachable('should have thrown')
    } catch (e: any) {
      const parts = e.digest.split(';')
      expect(parts[0]).toBe('TEXT_REDIRECT')
      // Empty string sentinel — the catch site determines push vs replace
      expect(parts[1]).toBe('')
      expect(decodeURIComponent(parts[2])).toBe('/dashboard')
    }
  })

  it("redirect() with explicit 'push' type preserves it in digest", async () => {
    const { redirect } = await import('../src/shims/navigation.js')
    try {
      redirect('/dashboard', 'push')
      expect.unreachable('should have thrown')
    } catch (e: any) {
      const parts = e.digest.split(';')
      expect(parts[1]).toBe('push')
    }
  })

  it("redirect() with explicit 'replace' type preserves it in digest", async () => {
    const { redirect } = await import('../src/shims/navigation.js')
    try {
      redirect('/dashboard', 'replace')
      expect.unreachable('should have thrown')
    } catch (e: any) {
      const parts = e.digest.split(';')
      expect(parts[1]).toBe('replace')
    }
  })

  it('redirect() encodes semicolons in URL to prevent digest injection', async () => {
    const { redirect } = await import('../src/shims/navigation.js')
    try {
      redirect('http://example.com;301')
      expect.unreachable('should have thrown')
    } catch (e: any) {
      const parts = e.digest.split(';')
      // The URL field must not leak into the status code position
      expect(parts).toHaveLength(3) // TEXT_REDIRECT, type, encoded-url
      expect(parts[0]).toBe('TEXT_REDIRECT')
      // Empty sentinel — no explicit type passed
      expect(parts[1]).toBe('')
      expect(decodeURIComponent(parts[2])).toBe('http://example.com;301')
    }
  })

  it('permanentRedirect() accepts an optional type parameter', async () => {
    const { permanentRedirect } = await import('../src/shims/navigation.js')
    try {
      permanentRedirect('/new-page', 'push')
      expect.unreachable('should have thrown')
    } catch (e: any) {
      const parts = e.digest.split(';')
      expect(parts[0]).toBe('TEXT_REDIRECT')
      expect(parts[1]).toBe('push')
      expect(decodeURIComponent(parts[2])).toBe('/new-page')
      expect(parts[3]).toBe('308')
    }
  })

  it("permanentRedirect() defaults to 'replace' when no type given", async () => {
    const { permanentRedirect } = await import('../src/shims/navigation.js')
    try {
      permanentRedirect('/new-page')
      expect.unreachable('should have thrown')
    } catch (e: any) {
      const parts = e.digest.split(';')
      expect(parts[1]).toBe('replace')
    }
  })

  it('notFound() throws with correct digest', async () => {
    const { notFound } = await import('../src/shims/navigation.js')
    try {
      notFound()
      expect.unreachable('should have thrown')
    } catch (e: any) {
      expect(e.digest).toBe('TEXT_HTTP_ERROR_FALLBACK;404')
    }
  })

  it('forbidden() throws with correct digest', async () => {
    const { forbidden } = await import('../src/shims/navigation.js')
    try {
      forbidden()
      expect.unreachable('should have thrown')
    } catch (e: any) {
      expect(e.digest).toBe('TEXT_HTTP_ERROR_FALLBACK;403')
    }
  })

  it('unauthorized() throws with correct digest', async () => {
    const { unauthorized } = await import('../src/shims/navigation.js')
    try {
      unauthorized()
      expect.unreachable('should have thrown')
    } catch (e: any) {
      expect(e.digest).toBe('TEXT_HTTP_ERROR_FALLBACK;401')
    }
  })

  it('isHTTPAccessFallbackError detects all HTTP access fallback errors', async () => {
    const {
      notFound,
      forbidden,
      unauthorized,
      isHTTPAccessFallbackError,
      getAccessFallbackHTTPStatus,
    } = await import('../src/shims/navigation.js')

    // Test notFound
    try {
      notFound()
    } catch (e) {
      expect(isHTTPAccessFallbackError(e)).toBe(true)
      expect(getAccessFallbackHTTPStatus(e)).toBe(404)
    }

    // Test forbidden
    try {
      forbidden()
    } catch (e) {
      expect(isHTTPAccessFallbackError(e)).toBe(true)
      expect(getAccessFallbackHTTPStatus(e)).toBe(403)
    }

    // Test unauthorized
    try {
      unauthorized()
    } catch (e) {
      expect(isHTTPAccessFallbackError(e)).toBe(true)
      expect(getAccessFallbackHTTPStatus(e)).toBe(401)
    }

    // Test non-access error
    expect(isHTTPAccessFallbackError(new Error('random'))).toBe(false)
    expect(isHTTPAccessFallbackError(null)).toBe(false)

    // Test legacy TEXT_NOT_FOUND format
    const legacyErr = new Error('old')
    ;(legacyErr as any).digest = 'TEXT_NOT_FOUND'
    expect(isHTTPAccessFallbackError(legacyErr)).toBe(true)
    expect(getAccessFallbackHTTPStatus(legacyErr)).toBe(404)
  })

  it('setNavigationContext / useParams works on server side', async () => {
    const { setNavigationContext, useParams } = await import('../src/shims/navigation.js')
    setNavigationContext({
      pathname: '/blog/test',
      searchParams: new URLSearchParams(''),
      params: { slug: 'test' },
    })
    const params = useParams()
    expect(params).toEqual({ slug: 'test' })
    setNavigationContext(null)
  })

  it('shares the hydrated navigation snapshot across browser module instances', async () => {
    // Text.js derives usePathname/useSearchParams from PathnameContext in
    // packages/text/src/client/components/app-router.tsx, so hydration does
    // not have a per-module fallback to "/" for the first client snapshot.
    const previousWindow = globalThis.window
    const accessorsKey = Symbol.for('text.navigation.globalAccessors')
    const hydrationKey = Symbol.for('text.navigation.clientHydrationContext')
    const globalRecord = globalThis as Record<PropertyKey, unknown>
    const previousAccessors = globalRecord[accessorsKey]
    const previousHydration = globalRecord[hydrationKey]

    try {
      delete globalRecord[accessorsKey]
      delete globalRecord[hydrationKey]
      ;(globalThis as any).window = {
        addEventListener() {},
        dispatchEvent() {
          return true
        },
        history: {
          pushState() {},
          replaceState() {},
        },
        location: {
          href: 'http://localhost/split-hydration?q=hello',
          origin: 'http://localhost',
          pathname: '/split-hydration',
          search: '?q=hello',
        },
        removeEventListener() {},
      }

      const setterPath = '../src/shims/navigation.js?hydration-setter=issue-871'
      const hookPath = '../src/shims/navigation.js?hydration-hook=issue-871'
      const setterMod = (await import(setterPath)) as typeof import('../src/shims/navigation.js')
      const hookMod = (await import(hookPath)) as typeof import('../src/shims/navigation.js')

      setterMod.setNavigationContext({
        pathname: '/split-hydration',
        searchParams: new URLSearchParams('q=hello'),
        params: { slug: 'hello' },
      })

      function Probe() {
        const pathname = hookMod.usePathname()
        const searchParams = hookMod.useSearchParams()
        const params = hookMod.useParams<{ slug: string }>()
        return createElement(
          'span',
          null,
          `${pathname}|${searchParams.get('q') ?? ''}|${params.slug ?? ''}`,
        )
      }

      expect(
        (await renderAppServerElementToHtml(createElement(Probe))).replace(/<!--.*?-->/g, ''),
      ).toBe('<span>/split-hydration|hello|hello</span>')

      setterMod.setNavigationContext(null)
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
      if (previousAccessors === undefined) {
        delete globalRecord[accessorsKey]
      } else {
        globalRecord[accessorsKey] = previousAccessors
      }
      if (previousHydration === undefined) {
        delete globalRecord[hydrationKey]
      } else {
        globalRecord[hydrationKey] = previousHydration
      }
    }
  })

  it('setClientParams provides referential stability for identical params', async () => {
    const { setClientParams, getClientParams } = await import('../src/shims/navigation.js')
    // Set params initially
    setClientParams({ slug: 'hello' })
    const first = getClientParams()
    // Set params with same values — should return same object reference
    setClientParams({ slug: 'hello' })
    const second = getClientParams()
    expect(first).toBe(second) // referential equality

    // Set params with different values — should return new object
    setClientParams({ slug: 'world' })
    const third = getClientParams()
    expect(third).not.toBe(first)
    expect(third).toEqual({ slug: 'world' })

    // Clean up
    setClientParams({})
  })

  it('exports useSelectedLayoutSegment and useSelectedLayoutSegments', async () => {
    const nav = await import('../src/shims/navigation.js')
    expect(typeof nav.useSelectedLayoutSegment).toBe('function')
    expect(typeof nav.useSelectedLayoutSegments).toBe('function')
  })

  it('useSelectedLayoutSegment still works when provider and hook are loaded from different module instances', async () => {
    const hookPath = '../src/shims/navigation.js?hook-instance=a'
    const providerPath = '../src/shims/layout-segment-context.tsx?provider-instance=b'
    const hookMod: typeof import('../src/shims/navigation.js') = await import(hookPath)
    const providerMod: typeof import('../src/shims/layout-segment-context.tsx') = await import(
      providerPath
    )

    function Probe() {
      const segment = hookMod.useSelectedLayoutSegment()
      return createElement('span', { 'data-testid': 'segment' }, segment ?? 'null')
    }

    const html = await renderAppServerElementToHtml(
      createElement(providerMod.LayoutSegmentProvider, {
        segmentMap: { children: ['explore'] },
        children: createElement(Probe),
      }),
    )

    expect(html).toContain('>explore<')
  })

  it('ServerInsertedHTMLContext stays shared across multiple module instances', async () => {
    const providerPath = '../src/shims/navigation.js?inserted-html-provider=a'
    const consumerPath = '../src/shims/navigation.js?inserted-html-consumer=b'
    const [providerMod, consumerMod]: [
      typeof import('../src/shims/navigation.js'),
      typeof import('../src/shims/navigation.js'),
    ] = await Promise.all([import(providerPath), import(consumerPath)])
    const { useTextCompatContext } = await import('../src/shims/context-adapter.js')
    const providerCtx = providerMod.ServerInsertedHTMLContext
    const consumerCtx = consumerMod.ServerInsertedHTMLContext
    expect(providerCtx).toBeTruthy()
    expect(consumerCtx).toBeTruthy()

    const register = () => {}
    let received: unknown = undefined

    function Probe() {
      received = useTextCompatContext(consumerCtx!)
      return () => {}
    }

    await renderAppServerElementToHtml(
      createElement(providerCtx!.Provider, { value: register }, createElement(Probe)),
    )

    expect(received).toBe(register)
  })

  it('useSelectedLayoutSegments returns empty array outside layout context', async () => {
    const { useSelectedLayoutSegments } = await import('../src/shims/navigation.js')
    // Outside a layout tree, no LayoutSegmentProvider wraps us,
    // so the context defaults to [].
    const segments = useSelectedLayoutSegments()
    expect(segments).toEqual([])
  })

  it('useSelectedLayoutSegment returns null outside layout context', async () => {
    const { useSelectedLayoutSegment } = await import('../src/shims/navigation.js')
    // Outside a layout tree, no LayoutSegmentProvider wraps us,
    // so there are no child segments → null.
    expect(useSelectedLayoutSegment()).toBeNull()
  })

  it('useSelectedLayoutSegments() accepts parallelRoutesKey and returns matching segments', async () => {
    const nav = await import('../src/shims/navigation.js')
    // Outside a layout tree, returns [] regardless of key.
    const result = nav.useSelectedLayoutSegments('team')
    expect(result).toEqual([])
  })

  it('useSelectedLayoutSegment() accepts parallelRoutesKey and returns null outside layout tree', async () => {
    const nav = await import('../src/shims/navigation.js')
    const result = nav.useSelectedLayoutSegment('team')
    expect(result).toBeNull()
  })

  it('useSelectedLayoutSegments(parallelRoutesKey) returns per-slot segments via segmentMap', async () => {
    const { LayoutSegmentProvider } = await import('../src/shims/layout-segment-context.js')
    const { useSelectedLayoutSegments, useSelectedLayoutSegment } =
      await import('../src/shims/navigation.js')

    function TestComponent() {
      const childrenSegs = useSelectedLayoutSegments()
      const teamSegs = useSelectedLayoutSegments('team')
      const teamSeg = useSelectedLayoutSegment('team')
      return createElement(
        'div',
        null,
        createElement('span', { id: 'children' }, JSON.stringify(childrenSegs)),
        createElement('span', { id: 'team' }, JSON.stringify(teamSegs)),
        createElement('span', { id: 'team-singular' }, teamSeg ?? 'null'),
      )
    }

    const html = await renderAppServerElementToHtml(
      createElement(LayoutSegmentProvider, {
        segmentMap: { children: ['blog', 'hello'], team: ['settings'] },
        children: createElement(TestComponent),
      }),
    )

    expect(html.replace(/<!--.*?-->/g, '')).toContain('<span id="children">["blog","hello"]</span>')
    expect(html.replace(/<!--.*?-->/g, '')).toContain('<span id="team">["settings"]</span>')
    expect(html.replace(/<!--.*?-->/g, '')).toContain('<span id="team-singular">settings</span>')
  })

  it('useSelectedLayoutSegments(unknownKey) returns [] for missing slot', async () => {
    const { LayoutSegmentProvider } = await import('../src/shims/layout-segment-context.js')
    const { useSelectedLayoutSegments } = await import('../src/shims/navigation.js')

    function TestComponent() {
      const segs = useSelectedLayoutSegments('nonexistent')
      return createElement('span', null, JSON.stringify(segs))
    }

    const html = await renderAppServerElementToHtml(
      createElement(LayoutSegmentProvider, {
        segmentMap: { children: ['blog'] },
        children: createElement(TestComponent),
      }),
    )

    expect(html).toContain('[]')
  })

  // -------------------------------------------------------------------------
  // unstable_rethrow + unstable_isUnrecognizedActionError
  //
  // Ported from Text.js:
  //   https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/unstable-rethrow.ts
  //   https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/unrecognized-action-error.ts
  // -------------------------------------------------------------------------
  it('exports unstable_rethrow and unstable_isUnrecognizedActionError', async () => {
    const nav = await import('../src/shims/navigation.js')
    expect(typeof nav.unstable_rethrow).toBe('function')
    expect(typeof nav.unstable_isUnrecognizedActionError).toBe('function')
    expect(typeof nav.isRedirectError).toBe('function')
    expect(typeof nav.isTextRouterError).toBe('function')
    expect(typeof nav.UnrecognizedActionError).toBe('function')
  })

  it('unstable_rethrow re-throws redirect errors', async () => {
    const { redirect, unstable_rethrow } = await import('../src/shims/navigation.js')
    let captured: unknown = null
    try {
      redirect('/login')
    } catch (e) {
      captured = e
    }
    expect(captured).not.toBeNull()

    expect(() => unstable_rethrow(captured)).toThrow()
    try {
      unstable_rethrow(captured)
    } catch (rethrown) {
      // Identity-preserving rethrow — must be the same error reference
      expect(rethrown).toBe(captured)
    }
  })

  it('unstable_rethrow re-throws notFound/forbidden/unauthorized errors', async () => {
    const { notFound, forbidden, unauthorized, unstable_rethrow } =
      await import('../src/shims/navigation.js')
    for (const trigger of [notFound, forbidden, unauthorized]) {
      let captured: unknown = null
      try {
        trigger()
      } catch (e) {
        captured = e
      }
      expect(captured).not.toBeNull()
      expect(() => unstable_rethrow(captured)).toThrow()
    }
  })

  it('unstable_rethrow is a no-op for unrelated errors', async () => {
    const { unstable_rethrow } = await import('../src/shims/navigation.js')
    // Plain Error: no digest, no cause
    expect(() => unstable_rethrow(new Error('plain'))).not.toThrow()
    expect(() => unstable_rethrow('string error')).not.toThrow()
    expect(() => unstable_rethrow(null)).not.toThrow()
    expect(() => unstable_rethrow(undefined)).not.toThrow()
    expect(() => unstable_rethrow({ digest: 'not-a-text-error' })).not.toThrow()
  })

  // -------------------------------------------------------------------------
  // BailoutToCSRError + DynamicServerError parity
  //
  // Ported from Text.js:
  //   https://github.com/vercel/next.js/blob/canary/packages/text/src/shared/lib/lazy-dynamic/bailout-to-csr.ts
  //   https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/hooks-server-context.ts
  // -------------------------------------------------------------------------
  it('exports BailoutToCSRError + isBailoutToCSRError with the canonical digest', async () => {
    const { BailoutToCSRError, isBailoutToCSRError } = await import('../src/shims/navigation.js')
    const err = new BailoutToCSRError('test-reason')
    expect(err.digest).toBe('BAILOUT_TO_CLIENT_SIDE_RENDERING')
    expect(err.reason).toBe('test-reason')
    expect(err.message).toBe('Bail out to client-side rendering: test-reason')
    expect(isBailoutToCSRError(err)).toBe(true)
    // Predicate matches by digest, not by instanceof — a foreign object with
    // the canonical digest should also be detected (Text.js parity).
    expect(isBailoutToCSRError({ digest: 'BAILOUT_TO_CLIENT_SIDE_RENDERING' })).toBe(true)
    // Negative cases.
    expect(isBailoutToCSRError(new Error('plain'))).toBe(false)
    expect(isBailoutToCSRError({ digest: 'OTHER' })).toBe(false)
    expect(isBailoutToCSRError(null)).toBe(false)
    expect(isBailoutToCSRError(undefined)).toBe(false)
  })

  it('exports DynamicServerError + isDynamicServerError with the canonical digest', async () => {
    const { DynamicServerError, isDynamicServerError } = await import('../src/shims/navigation.js')
    const err = new DynamicServerError('cookies()')
    expect(err.digest).toBe('DYNAMIC_SERVER_USAGE')
    expect(err.description).toBe('cookies()')
    expect(err.message).toBe('Dynamic server usage: cookies()')
    expect(isDynamicServerError(err)).toBe(true)
    // Predicate matches by digest — Text.js parity.
    expect(isDynamicServerError({ digest: 'DYNAMIC_SERVER_USAGE' })).toBe(true)
    // Negative cases.
    expect(isDynamicServerError(new Error('plain'))).toBe(false)
    expect(isDynamicServerError({ digest: 'OTHER' })).toBe(false)
    expect(isDynamicServerError(null)).toBe(false)
    expect(isDynamicServerError(undefined)).toBe(false)
  })

  // Mirrors the Text.js fixture
  //   .textjs-ref/test/e2e/app-dir/unstable-rethrow/app/dynamic-error/page.tsx
  // where `cookies()` throws a DynamicServerError inside a try/catch and
  // unstable_rethrow must propagate it.
  it('unstable_rethrow re-throws BailoutToCSRError (text/dynamic ssr:false bailout)', async () => {
    const { BailoutToCSRError, unstable_rethrow } = await import('../src/shims/navigation.js')
    const err = new BailoutToCSRError('Lazy(): No ssr')
    expect(() => unstable_rethrow(err)).toThrow()
    try {
      unstable_rethrow(err)
    } catch (rethrown) {
      expect(rethrown).toBe(err)
    }
  })

  it('unstable_rethrow re-throws DynamicServerError (cookies()/headers() in static render)', async () => {
    const { DynamicServerError, unstable_rethrow } = await import('../src/shims/navigation.js')
    const err = new DynamicServerError('Route used cookies()')
    expect(() => unstable_rethrow(err)).toThrow()
    try {
      unstable_rethrow(err)
    } catch (rethrown) {
      expect(rethrown).toBe(err)
    }
  })

  it('unstable_rethrow does NOT match the four server-only categories text does not implement', async () => {
    // These categories (isDynamicPostpone, isPostpone,
    // isHangingPromiseRejectionError, isPrerenderInterruptedError) are
    // server-only Text.js internals tied to PPR / prerender-controller
    // machinery text does not implement. They are deferred as follow-ups
    // (see the JSDoc on unstable_rethrow). This test pins that intentional
    // gap so the omission is visible to future maintainers.
    const { unstable_rethrow } = await import('../src/shims/navigation.js')

    const postpone = { $$typeof: Symbol.for(`${['re', 'act'].join('')}.postpone`) }
    expect(() => unstable_rethrow(postpone)).not.toThrow()

    const hanging = Object.assign(new Error('hanging'), { digest: 'HANGING_PROMISE_REJECTION' })
    expect(() => unstable_rethrow(hanging)).not.toThrow()

    const interrupted = Object.assign(new Error('interrupt'), {
      digest: 'TEXT_PRERENDER_INTERRUPTED',
    })
    expect(() => unstable_rethrow(interrupted)).not.toThrow()

    // No fixed digest — message-shape based detection. We don't try to
    // construct a faithful payload here; just confirm an arbitrary message
    // doesn't match.
    const dynamicPostpone = new Error('some random message')
    expect(() => unstable_rethrow(dynamicPostpone)).not.toThrow()
  })

  it('unstable_rethrow recurses through error.cause to rethrow wrapped Text.js errors', async () => {
    const { redirect, unstable_rethrow } = await import('../src/shims/navigation.js')
    let inner: unknown = null
    try {
      redirect('/login')
    } catch (e) {
      inner = e
    }
    const wrapped = new Error('user wrapped this', { cause: inner })

    expect(() => unstable_rethrow(wrapped)).toThrow()
    try {
      unstable_rethrow(wrapped)
    } catch (rethrown) {
      // The recursion should rethrow the original Text.js error, not the wrapper
      expect(rethrown).toBe(inner)
    }
  })

  it('unstable_isUnrecognizedActionError returns true for UnrecognizedActionError instances', async () => {
    const { UnrecognizedActionError, unstable_isUnrecognizedActionError } =
      await import('../src/shims/navigation.js')
    const err = new UnrecognizedActionError("missing action 'abc'")
    expect(err.name).toBe('UnrecognizedActionError')
    expect(unstable_isUnrecognizedActionError(err)).toBe(true)
  })

  it('unstable_isUnrecognizedActionError returns false for other errors', async () => {
    const { unstable_isUnrecognizedActionError } = await import('../src/shims/navigation.js')
    expect(unstable_isUnrecognizedActionError(new Error('other'))).toBe(false)
    expect(unstable_isUnrecognizedActionError(null)).toBe(false)
    expect(unstable_isUnrecognizedActionError(undefined)).toBe(false)
    expect(unstable_isUnrecognizedActionError('string')).toBe(false)
    expect(unstable_isUnrecognizedActionError({ name: 'UnrecognizedActionError' })).toBe(false)
  })

  // -------------------------------------------------------------------------
  // RSC re-exports
  // -------------------------------------------------------------------------
  it('navigation.rsc re-exports unstable_rethrow and stubs unstable_isUnrecognizedActionError', async () => {
    const rsc = await import('../src/shims/navigation.rsc.js')
    expect(typeof rsc.unstable_rethrow).toBe('function')
    expect(typeof rsc.unstable_isUnrecognizedActionError).toBe('function')

    // The RSC stub should throw a clear "client-only" error, matching Text.js.
    expect(() => rsc.unstable_isUnrecognizedActionError()).toThrow(/client/i)

    // unstable_rethrow itself is environment-agnostic — re-exported from
    // ./navigation.js — and should behave identically to the client export.
    const { redirect } = await import('../src/shims/navigation.js')
    let captured: unknown = null
    try {
      redirect('/login')
    } catch (e) {
      captured = e
    }
    expect(() => rsc.unstable_rethrow(captured)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// text/error shim — unstable_catchError
//
// Ported from Text.js:
//   https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/catch-error.tsx
//   https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/catch-error/
// ---------------------------------------------------------------------------
describe('text/error shim — unstable_catchError', () => {
  it('exports unstable_catchError as a function', async () => {
    const mod = await import('../src/shims/error.js?text-ssr')
    expect(typeof mod.unstable_catchError).toBe('function')
  })

  it('returns a Component that renders children when no error occurs', async () => {
    const { unstable_catchError } = await import('../src/shims/error.js?text-ssr')

    function Fallback(_props: { title: string }) {
      return createElement('p', null, 'should not render')
    }

    const Boundary = unstable_catchError<{ title: string }>(Fallback)
    const html = await renderAppServerElementToHtml(
      createElement(Boundary, { title: 'ignored' }, createElement('span', { id: 'ok' }, 'hello')),
    )

    expect(html).toContain('id="ok"')
    expect(html).toContain('hello')
  })
})

// ---------------------------------------------------------------------------
// window.text debug/diagnostic global
//
// Text.js exposes a `window.text` object from both the Pages Router client
// bootstrap (packages/text/src/client/text.ts) and the App Router bootstrap
// (packages/text/src/client/app-bootstrap.ts). Pages Router test suites,
// userland code, and third-party libraries reach into it directly — most
// commonly `window.text.router.push(...)` and
// `window.text.router.events.on(...)`. Without this global, the Text.js
// deploy test suite reports ~422 console errors and 30+ runtime failures
// against text, with `TypeError: Cannot read properties of undefined
// (reading 'router')` the most cited.
//
// The installer helper lives in packages/text/src/client/window-text.ts
// and is invoked from both router bootstraps. The Pages Router shim
// (shims/router.ts) installs it as a top-level side effect, and the App
// Router browser entry (server/app-browser-entry.ts) installs it before
// hydration starts.
// ---------------------------------------------------------------------------
