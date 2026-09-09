/**
 * Text.js Compatibility Tests: global-error (basic)
 *
 * Ported from: https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/global-error/basic/index.test.ts
 *
 * Tests error boundary behavior in the App Router:
 * - Server component errors caught by error.tsx
 * - Client component SSR errors caught by error.tsx
 * - Global-error.tsx as the last resort for root-level errors
 * - generateMetadata() errors caught by local error.tsx when present
 * - generateMetadata() errors escalating to global-error when no local boundary
 * - layout generateMetadata() errors following the same boundary path
 * - layout generateViewport() errors following the same boundary path
 *
 * NOTE: Most Text.js global-error tests are browser-based (click buttons, check
 * rendered error UI after hydration/client error). This file tests SSR-level
 * behavior — does global-error.tsx render with the correct content and a clean
 * document structure (single <html>/<body>) when pages or metadata throw?
 *
 * Fixture pages live in:
 * - fixtures/app-basic/app/global-error.tsx (pre-existing)
 * - fixtures/app-basic/app/error-server-test/ (pre-existing)
 * - fixtures/app-basic/app/textjs-compat/global-error-rsc/ (new)
 * - fixtures/app-basic/app/textjs-compat/global-error-ssr/ (new)
 * - fixtures/app-basic/app/textjs-compat/metadata-error-{with,without}-boundary/ (new)
 */

import fs from 'node:fs'
import { describe, it, expect, beforeAll, afterAll } from 'vite-plus/test'
import { createBuilder, preview, type ViteDevServer } from 'vite-plus'
import text from '../../src/index.js'
import {
  APP_FIXTURE_DIR,
  createIsolatedFixture,
  startFixtureServer,
  fetchHtml,
} from '../helpers.js'

describe('Text.js compat: global-error', () => {
  let server: ViteDevServer
  let baseUrl: string

  beforeAll(async () => {
    ;({ server, baseUrl } = await startFixtureServer(APP_FIXTURE_DIR, {
      appRouter: true,
    }))
    // Warm up
    await fetch(`${baseUrl}/`).catch(() => {})
  }, 120_000)

  afterAll(async () => {
    await server?.close()
  })

  // ── Pre-existing text error tests ─────────────────────────
  // These validate that text's existing error handling works,
  // providing a baseline before we test Text.js-specific patterns.

  it('error-server-test: server component throw is caught by error.tsx', async () => {
    const { res, html } = await fetchHtml(baseUrl, '/error-server-test')
    expect(res.status).toBe(200)
    expect(html).toContain('Server Error Caught')
  })

  it('error-nested-test: nested error caught by inner error.tsx', async () => {
    const { res, html } = await fetchHtml(baseUrl, '/error-nested-test/child')
    expect(res.status).toBe(200)
    expect(html).toContain('inner-error-boundary')
    expect(html).not.toContain('outer-error-boundary')
  })

  it('route group error.tsx without sibling layout catches descendant server errors', async () => {
    // Text.js loader trees attach error conventions to the segment even when
    // that segment has no layout:
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/build/webpack/loaders/text-app-loader/index.ts
    const { res, html } = await fetchHtml(baseUrl, '/textjs-compat/route-group-error/child')
    expect(res.status).toBe(200)
    expect(html).toContain('Route group error boundary')
    expect(html).not.toContain('global-error')
  })

  // ── Server component error (RSC throw -> global-error) ─────
  // Text.js: it('should render global error for error in server components', ...)
  // Source: https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/global-error/basic/index.test.ts#L29-L49
  //
  // In Text.js, a server component that throws with NO local error.tsx
  // falls through to global-error.js. Text matches: the error propagates
  // to the server handler, which renders global-error.tsx without layouts.

  it('server component throw without local error.tsx renders global-error', async () => {
    // global-error-rsc/page.tsx throws "server page error" with no error.tsx.
    // Text.js renders global-error.tsx and returns 200 (the boundary "handles" it).
    // Source: index.test.ts#L29-L49
    const { res, html } = await fetchHtml(baseUrl, '/textjs-compat/global-error-rsc')
    expect(res.status).toBe(200)
    expect(html).toContain('global-error')
    expect(html).toContain('server page error')
  })

  // ── Client component SSR error ─────────────────────────────
  // Text.js: it('should render global error for error in client components during SSR', ...)
  // Source: https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/global-error/basic/index.test.ts#L51-L66
  //
  // "use client" component that throws during SSR. In Text.js, global-error catches it.

  it('client component SSR throw without local error.tsx renders global-error', async () => {
    // "use client" component throws during SSR. Text.js renders global-error.tsx.
    // Source: index.test.ts#L51-L66
    const { res, html } = await fetchHtml(baseUrl, '/textjs-compat/global-error-ssr')
    expect(res.status).toBe(200)
    expect(html).toContain('global-error')
    expect(html).toContain('client page error')
  })

  // ── Metadata error with local boundary ─────────────────────
  // Text.js: it('should catch metadata error in error boundary if presented', ...)
  // Source: https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/global-error/basic/index.test.ts#L68-L73
  //
  // generateMetadata() throws, but a local error.tsx exists to catch it.

  it('generateMetadata() error caught by local error.tsx boundary', async () => {
    // generateMetadata() throws, local error.tsx catches it — not global-error.
    // Text.js returns 200 (error is "handled" by the boundary).
    // Source: index.test.ts#L68-L73
    const { res, html } = await fetchHtml(baseUrl, '/textjs-compat/metadata-error-with-boundary')
    expect(res.status).toBe(200)
    expect(html).toContain('Local error boundary')
  })

  // ── Metadata error without boundary ────────────────────────
  // Text.js: it('should catch metadata error in global-error if no error boundary', ...)
  // Source: https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/global-error/basic/index.test.ts#L75-L93
  //
  // generateMetadata() throws, no local error.tsx — falls to global-error.

  it('generateMetadata() error without local boundary renders global-error', async () => {
    // generateMetadata() throws, no local error.tsx — escalates to global-error.tsx.
    // Text.js returns 200 with global-error rendered.
    // Source: index.test.ts#L75-L93
    const { res, html } = await fetchHtml(baseUrl, '/textjs-compat/metadata-error-without-boundary')
    expect(res.status).toBe(200)
    expect(html).toContain('global-error')
    expect(html).toContain('Metadata error')
  })

  it('layout generateMetadata() error caught by local error.tsx boundary', async () => {
    // Ported from Text.js: test/e2e/app-dir/global-error/basic/index.test.ts
    // https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/global-error/basic/index.test.ts
    const { res, html } = await fetchHtml(
      baseUrl,
      '/textjs-compat/layout-metadata-error-with-boundary',
    )
    expect(res.status).toBe(200)
    expect(html).toContain('Local layout metadata error boundary')
    expect(html).not.toContain('layout metadata page rendered')
  })

  it('layout generateMetadata() error without local boundary renders global-error', async () => {
    // Ported from Text.js: test/e2e/app-dir/global-error/basic/index.test.ts
    // https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/global-error/basic/index.test.ts
    const { res, html } = await fetchHtml(
      baseUrl,
      '/textjs-compat/layout-metadata-error-without-boundary',
    )
    expect(res.status).toBe(200)
    expect(html).toContain('global-error')
    expect(html).toContain('Layout metadata error')
  })

  it('layout generateViewport() error caught by local error.tsx boundary', async () => {
    // Text.js resolves viewport through the same metadata outlet error path:
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/lib/metadata/metadata.tsx
    const { res, html } = await fetchHtml(
      baseUrl,
      '/textjs-compat/layout-viewport-error-with-boundary',
    )
    expect(res.status).toBe(200)
    expect(html).toContain('Local layout viewport error boundary')
    expect(html).not.toContain('layout viewport page rendered')
  })

  it('layout generateViewport() error without local boundary renders global-error', async () => {
    // Text.js resolves viewport through the same metadata outlet error path:
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/lib/metadata/metadata.tsx
    const { res, html } = await fetchHtml(
      baseUrl,
      '/textjs-compat/layout-viewport-error-without-boundary',
    )
    expect(res.status).toBe(200)
    expect(html).toContain('global-error')
    expect(html).toContain('Layout viewport error')
  })

  // ── Structural integrity: no double <html>/<body> tags ───────
  // global-error.tsx provides its own <html> and <body>. When it renders,
  // the root layout's <html>/<body> must NOT also appear.

  it('global-error pages have exactly one <html> and one <body> tag', async () => {
    const routes = [
      '/textjs-compat/global-error-rsc',
      '/textjs-compat/global-error-ssr',
      '/textjs-compat/metadata-error-without-boundary',
    ]
    for (const route of routes) {
      const { html } = await fetchHtml(baseUrl, route)
      const htmlTags = (html.match(/<html/gi) || []).length
      const bodyTags = (html.match(/<body/gi) || []).length
      expect(htmlTags, `${route} should have exactly 1 <html> tag, got ${htmlTags}`).toBe(1)
      expect(bodyTags, `${route} should have exactly 1 <body> tag, got ${bodyTags}`).toBe(1)
    }
  })

  // ── Browser-only tests (need Playwright, documented here) ──
  //
  // SKIP: Client-side error trigger via button click -> global-error renders
  //   Source: index.test.ts#L9-L27
  //   WHY SKIPPED: Requires Playwright to click #error-trigger-button, which sets
  //   state causing a throw. The global-error.tsx should render with the error message.
  //   TO PORT: Create __tests__/e2e/app-router/textjs-compat/global-error.spec.ts with
  //   Playwright test that navigates to the page, clicks the button, and verifies
  //   the global-error UI appears.
  //   FIXTURE NEEDED: A page with a "use client" button that triggers a throw
  //   (similar to error-test/throwing-component.tsx but WITHOUT a local error.tsx).
  //
  // SKIP: Nested client error auto-thrown via useEffect/setTimeout -> global-error
  //   Source: index.test.ts#L95-L111
  //   WHY SKIPPED: The nested page uses useEffect to set state that causes throw.
  //   This happens after hydration, so requires a browser to observe.
  //   TO PORT: Same Playwright spec file.
  //   FIXTURE: fixtures/app-basic/app/textjs-compat/global-error-nested/
  //
  // SKIP: Dev-only Redbox display verification
  //   Source: Multiple tests in index.test.ts
  //   WHY SKIPPED: Tests Text.js-specific dev overlay (Redbox) error display format.
  //   Text uses Vite's error overlay which has different formatting.
  //   N/A for compat suite.
})

describe('Text.js compat: global-error (production preview)', () => {
  let fixtureDir: string
  let previewServer: Awaited<ReturnType<typeof preview>>
  let baseUrl: string

  beforeAll(async () => {
    fixtureDir = await createIsolatedFixture(APP_FIXTURE_DIR, 'text-global-error-prod-')
    const builder = await createBuilder({
      root: fixtureDir,
      configFile: false,
      plugins: [text({ appDir: fixtureDir })],
      logLevel: 'silent',
    })
    await builder.buildApp()

    previewServer = await preview({
      root: fixtureDir,
      configFile: false,
      plugins: [text({ appDir: fixtureDir })],
      preview: { port: 0 },
      logLevel: 'silent',
    })

    const addr = previewServer.httpServer.address()
    if (!addr || typeof addr !== 'object') {
      throw new Error('Preview server did not expose a port')
    }
    baseUrl = `http://localhost:${addr.port}`
  }, 60_000)

  afterAll(() => {
    previewServer?.httpServer.close()
    if (fixtureDir) fs.rmSync(fixtureDir, { recursive: true, force: true })
  })

  it('server component throw without local error.tsx renders global-error with 200', async () => {
    const { res, html } = await fetchHtml(baseUrl, '/textjs-compat/global-error-rsc')
    expect(res.status).toBe(200)
    expect(html).toContain('global-error')
    expect(html).toContain('The specific message is omitted in production builds')
    expect(html).not.toContain('server page error')
  })

  it('client component SSR throw without local error.tsx renders global-error with 200', async () => {
    const { res, html } = await fetchHtml(baseUrl, '/textjs-compat/global-error-ssr')
    expect(res.status).toBe(200)
    expect(html).toContain('global-error')
    expect(html).toContain('The specific message is omitted in production builds')
    expect(html).not.toContain('client page error')
  })

  it('server component throw with local error.tsx renders that boundary with 200', async () => {
    const { res, html } = await fetchHtml(baseUrl, '/error-server-test')
    expect(res.status).toBe(200)
    expect(html).toContain('Server Error Caught')
    expect(html).not.toContain('global-error')
  })

  it('nested server component throw resolves to the nearest error.tsx boundary', async () => {
    const { res, html } = await fetchHtml(baseUrl, '/error-nested-test/child')
    expect(res.status).toBe(200)
    expect(html).toContain('inner-error-boundary')
    expect(html).not.toContain('outer-error-boundary')
  })

  it('generateMetadata() errors render the co-located error.tsx boundary with 200', async () => {
    const { res, html } = await fetchHtml(baseUrl, '/textjs-compat/metadata-error-with-boundary')
    expect(res.status).toBe(200)
    expect(html).toContain('Local error boundary')
    expect(html).not.toContain('global-error')
  })

  it('generateMetadata() errors without a local boundary escalate to global-error with 200', async () => {
    const { res, html } = await fetchHtml(baseUrl, '/textjs-compat/metadata-error-without-boundary')
    expect(res.status).toBe(200)
    expect(html).toContain('global-error')
  })

  it('layout generateMetadata() errors render the co-located error.tsx boundary with 200', async () => {
    const { res, html } = await fetchHtml(
      baseUrl,
      '/textjs-compat/layout-metadata-error-with-boundary',
    )
    expect(res.status).toBe(200)
    expect(html).toContain('Local layout metadata error boundary')
    expect(html).not.toContain('global-error')
  })

  it('layout generateMetadata() errors without a local boundary escalate to global-error with 200', async () => {
    const { res, html } = await fetchHtml(
      baseUrl,
      '/textjs-compat/layout-metadata-error-without-boundary',
    )
    expect(res.status).toBe(200)
    expect(html).toContain('global-error')
  })

  it('layout generateViewport() errors render the co-located error.tsx boundary with 200', async () => {
    const { res, html } = await fetchHtml(
      baseUrl,
      '/textjs-compat/layout-viewport-error-with-boundary',
    )
    expect(res.status).toBe(200)
    expect(html).toContain('Local layout viewport error boundary')
    expect(html).not.toContain('global-error')
  })

  it('layout generateViewport() errors without a local boundary escalate to global-error with 200', async () => {
    const { res, html } = await fetchHtml(
      baseUrl,
      '/textjs-compat/layout-viewport-error-without-boundary',
    )
    expect(res.status).toBe(200)
    expect(html).toContain('global-error')
  })
})
