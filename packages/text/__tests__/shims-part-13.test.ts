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
describe('text/font/local shim', () => {
  it('returns className, style for a local font', async () => {
    const { default: localFont } = await import('../src/shims/font-local.js')
    const result = localFont({ src: './my-font.woff2' })

    expect(result.className).toMatch(/^__font_local_/)
    expect(result.style.fontFamily).toMatch(/__local_font_/)
  })

  it('includes variable as generated class name when specified', async () => {
    const { default: localFont } = await import('../src/shims/font-local.js')
    const result = localFont({
      src: './my-font.woff2',
      variable: '--font-custom',
    })
    // variable should be a generated class name, not the raw CSS variable
    expect(result.variable).toMatch(/^__variable_local_/)
    expect(result.variable).not.toBe('--font-custom')
  })

  it('accepts array of font sources', async () => {
    const { default: localFont } = await import('../src/shims/font-local.js')
    const result = localFont({
      src: [
        { path: './regular.woff2', weight: '400' },
        { path: './bold.woff2', weight: '700' },
      ],
    })

    expect(result.className).toMatch(/^__font_local_/)
    expect(result.style.fontFamily).toBeTruthy()
  })

  it('does not include variable when not specified', async () => {
    const { default: localFont } = await import('../src/shims/font-local.js')
    const result = localFont({ src: './no-var.woff2' })
    expect(result.variable).toBeUndefined()
  })

  it('generates SSR font styles for className rules', async () => {
    const fontLocal = await import('../src/shims/font-local.js')
    const localFont = fontLocal.default
    // In test (Node), typeof document === "undefined", so SSR path is used
    const result = localFont({
      src: './ssr-test.woff2',
      variable: '--font-ssr-test',
    })

    const ssrStyles = fontLocal.getSSRFontStyles()
    expect(ssrStyles.length).toBeGreaterThan(0)

    // Should contain @font-face rule
    const allCSS = ssrStyles.join('\n')
    expect(allCSS).toContain('@font-face')
    expect(allCSS).toContain('ssr-test.woff2')

    // Should contain className rule
    expect(allCSS).toContain(`.${result.className}`)
    expect(allCSS).toContain('font-family:')

    // Should contain variable class rule with :root fallback
    expect(allCSS).toContain(`.${result.variable}`)
    expect(allCSS).toContain('--font-ssr-test')
    expect(allCSS).toContain(':root')
  })

  it('generates unique classNames and variableClassNames', async () => {
    const { default: localFont } = await import('../src/shims/font-local.js')
    const a = localFont({ src: './a.woff2', variable: '--font-a' })
    const b = localFont({ src: './b.woff2', variable: '--font-b' })

    expect(a.className).not.toBe(b.className)
    expect(a.variable).not.toBe(b.variable)
    expect(a.variable).toMatch(/^__variable_local_/)
    expect(b.variable).toMatch(/^__variable_local_/)
  })

  it('exports getSSRFontPreloads function', async () => {
    const fontLocal = await import('../src/shims/font-local.js')
    expect(typeof fontLocal.getSSRFontPreloads).toBe('function')
  })

  it('collects preload data for fonts with absolute URLs', async () => {
    const fontLocal = await import('../src/shims/font-local.js')
    const localFont = fontLocal.default

    // Simulate a font with an absolute URL (as resolved by Vite transform)
    localFont({ src: '/assets/my-font-abc123.woff2' })

    const preloads = fontLocal.getSSRFontPreloads()
    const match = preloads.find((p: any) => p.href === '/assets/my-font-abc123.woff2')
    expect(match).toBeDefined()
    expect(match!.type).toBe('font/woff2')
  })

  it('collects preload data for array font sources with absolute URLs', async () => {
    const fontLocal = await import('../src/shims/font-local.js')
    const localFont = fontLocal.default

    localFont({
      src: [
        { path: '/assets/regular-abc.woff2', weight: '400' },
        { path: '/assets/bold-def.woff', weight: '700' },
      ],
    })

    const preloads = fontLocal.getSSRFontPreloads()
    const woff2 = preloads.find((p: any) => p.href === '/assets/regular-abc.woff2')
    const woff = preloads.find((p: any) => p.href === '/assets/bold-def.woff')
    expect(woff2).toBeDefined()
    expect(woff2!.type).toBe('font/woff2')
    expect(woff).toBeDefined()
    expect(woff!.type).toBe('font/woff')
  })

  it('does not collect preload data for relative URLs', async () => {
    const fontLocal = await import('../src/shims/font-local.js')
    const localFont = fontLocal.default

    const preloadsBefore = fontLocal.getSSRFontPreloads().length
    localFont({ src: './relative-font.woff2' })
    const preloadsAfter = fontLocal.getSSRFontPreloads().length

    // Relative URLs should NOT be added to preloads
    expect(preloadsAfter).toBe(preloadsBefore)
  })

  it('deduplicates preload entries by href', async () => {
    const fontLocal = await import('../src/shims/font-local.js')
    const localFont = fontLocal.default

    // Call twice with the same font URL
    localFont({ src: '/assets/dedup-test.woff2' })
    localFont({ src: '/assets/dedup-test.woff2' })

    const preloads = fontLocal.getSSRFontPreloads()
    const matches = preloads.filter((p: any) => p.href === '/assets/dedup-test.woff2')
    expect(matches.length).toBe(1)
  })
})

describe('text/og shim', () => {
  it('exports ImageResponse class', async () => {
    const og = await import('../src/shims/og.js')
    expect(og.ImageResponse).toBeDefined()
    expect(typeof og.ImageResponse).toBe('function')
  })

  it('ImageResponse extends Response', async () => {
    const og = await import('../src/shims/og.js')
    // Check the prototype chain
    expect(og.ImageResponse.prototype instanceof Response).toBe(true)
  })

  it('generates a PNG image from JSX', async () => {
    const og = await import('../src/shims/og.js')

    // Simple colored div — no text so no font needed
    const element = createRueElement('div', {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#ff6600',
        alignItems: 'center',
        justifyContent: 'center',
      },
    })

    const response = new og.ImageResponse(element, {
      width: 100,
      height: 100,
    })

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')

    // Read the response body — should be valid PNG data
    const buffer = await response.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // PNG magic bytes: 0x89 0x50 0x4E 0x47
    expect(bytes[0]).toBe(0x89)
    expect(bytes[1]).toBe(0x50) // P
    expect(bytes[2]).toBe(0x4e) // N
    expect(bytes[3]).toBe(0x47) // G
  })

  it('sets Text.js metadata image cache headers by default', async () => {
    const og = await import('../src/shims/og.js')

    const element = createRueElement('div', {
      style: { display: 'flex', width: '100%', height: '100%', backgroundColor: 'blue' },
    })

    const response = new og.ImageResponse(element, {
      width: 50,
      height: 50,
    })

    expect(response.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate')
  })

  it('respects custom status and headers', async () => {
    const og = await import('../src/shims/og.js')

    const element = createRueElement('div', {
      style: { display: 'flex', width: '100%', height: '100%', backgroundColor: 'blue' },
    })

    const response = new og.ImageResponse(element, {
      width: 50,
      height: 50,
      status: 201,
      headers: { 'x-custom': 'test-value' },
    })

    expect(response.status).toBe(201)
    expect(response.headers.get('x-custom')).toBe('test-value')
    expect(response.headers.get('content-type')).toBe('image/png')
  })

  it('uses default dimensions of 1200x630', async () => {
    const og = await import('../src/shims/og.js')

    const element = createRueElement('div', {
      style: { display: 'flex', width: '100%', height: '100%', backgroundColor: 'green' },
    })

    // No width/height specified — should use defaults
    const response = new og.ImageResponse(element)
    expect(response).toBeInstanceOf(Response)

    // Verify it produces valid PNG
    const buffer = await response.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    expect(bytes[0]).toBe(0x89) // PNG magic
  })
})

describe('metadata route serializers', () => {
  it('sitemapToXml converts sitemap entries to valid XML', async () => {
    const { sitemapToXml } = await import('../src/server/metadata-routes.js')
    const xml = sitemapToXml([
      { url: 'https://example.com', lastModified: '2025-01-01', priority: 1 },
      { url: 'https://example.com/about', changeFrequency: 'monthly' as const },
    ])
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<urlset')
    expect(xml).toContain('<loc>https://example.com</loc>')
    expect(xml).toContain('<lastmod>2025-01-01</lastmod>')
    expect(xml).toContain('<priority>1</priority>')
    expect(xml).toContain('<loc>https://example.com/about</loc>')
    expect(xml).toContain('<changefreq>monthly</changefreq>')
  })

  it('sitemapToXml handles Date objects', async () => {
    const { sitemapToXml } = await import('../src/server/metadata-routes.js')
    const xml = sitemapToXml([{ url: 'https://example.com', lastModified: new Date('2025-06-15') }])
    expect(xml).toContain('<lastmod>2025-06-15T00:00:00.000Z</lastmod>')
  })

  it('robotsToText converts robots config to text', async () => {
    const { robotsToText } = await import('../src/server/metadata-routes.js')
    const text = robotsToText({
      rules: { userAgent: '*', allow: '/', disallow: '/private/' },
      sitemap: 'https://example.com/sitemap.xml',
    })
    expect(text).toContain('User-Agent: *')
    expect(text).toContain('Allow: /')
    expect(text).toContain('Disallow: /private/')
    expect(text).toContain('Sitemap: https://example.com/sitemap.xml')
  })

  it('robotsToText handles multiple rules', async () => {
    const { robotsToText } = await import('../src/server/metadata-routes.js')
    const text = robotsToText({
      rules: [
        { userAgent: 'Googlebot', allow: '/' },
        { userAgent: 'Bingbot', disallow: '/secret' },
      ],
    })
    expect(text).toContain('User-Agent: Googlebot')
    expect(text).toContain('User-Agent: Bingbot')
    expect(text).toContain('Disallow: /secret')
  })

  it('manifestToJson converts manifest config to JSON', async () => {
    const { manifestToJson } = await import('../src/server/metadata-routes.js')
    const json = manifestToJson({
      name: 'Test App',
      short_name: 'Test',
      start_url: '/',
      display: 'standalone',
    })
    const parsed = JSON.parse(json)
    expect(parsed.name).toBe('Test App')
    expect(parsed.display).toBe('standalone')
  })

  it('scanMetadataFiles discovers metadata files in app directory', async () => {
    const { scanMetadataFiles } = await import('../src/server/metadata-routes.js')
    const appDir = path.resolve(import.meta.dirname, './fixtures/app-basic/app')
    const routes = scanMetadataFiles(appDir)

    // Should find our test fixture files
    const types = routes.map((r: { type: string }) => r.type)
    expect(types).toContain('sitemap')
    expect(types).toContain('robots')
    expect(types).toContain('manifest')
    expect(types).toContain('favicon')

    // Root sitemap should be dynamic (.ts)
    const sitemap = routes.find(
      (r: { type: string; servedUrl: string }) =>
        r.type === 'sitemap' && r.servedUrl === '/sitemap.xml',
    )
    expect(sitemap).toBeDefined()
    expect(sitemap!.isDynamic).toBe(true)
    expect(sitemap!.contentType).toBe('application/xml')

    // Favicon should be static (.ico)
    const favicon = routes.find((r: { type: string }) => r.type === 'favicon')
    expect(favicon).toBeDefined()
    expect(favicon!.isDynamic).toBe(false)
    expect(favicon!.servedUrl).toBe('/favicon.ico')
    expect(favicon!.contentType).toBe('image/x-icon')
  })
})

describe('text/dynamic shim', () => {
  it('exports a default function', async () => {
    const mod = await import('../src/shims/dynamic.js?text-ssr')
    expect(typeof mod.default).toBe('function')
  })

  it('exports flushPreloads', async () => {
    const mod = await import('../src/shims/dynamic.js?text-ssr')
    expect(typeof mod.flushPreloads).toBe('function')
  })

  it('returns a component for SSR-enabled dynamic imports', async () => {
    const { default: dynamic, flushPreloads } = await import('../src/shims/dynamic.js?text-ssr')

    const FakeComponent = () => createElement('div', null, 'Hello from dynamic')
    const DynamicComponent = dynamic(() => Promise.resolve({ default: FakeComponent }))

    await flushPreloads()
    const html = await renderAppServerElementToHtml(createElement(DynamicComponent, {}))
    expect(html).toContain('Hello from dynamic')
  })

  it('uses the compiled writer during an RSC request scope', async () => {
    const { default: dynamic } = await import('../src/shims/dynamic.js?text-ssr')
    const { createRequestContext, runWithRequestContext } =
      await import('../src/shims/unified-request-context.js')
    const RscComponent = ({ label }: { label: string }) => createElement('span', null, label)
    const DynamicComponent = dynamic(() => Promise.resolve({ default: RscComponent }))
    const html = await runWithRequestContext(
      createRequestContext({ appRouterRenderPhase: 'rsc' }),
      () => renderAppServerElementToHtml(createElement(DynamicComponent, { label: 'RSC dynamic' })),
    )
    expect(html).toContain('RSC dynamic')
  })

  it('renders loading state for ssr: false on server', async () => {
    const { default: dynamic } = await import('../src/shims/dynamic.js?text-ssr')

    const FakeComponent = () => createElement('div', null, 'Should not appear')
    const Loading = () => createElement('span', null, 'Loading...')
    const DynamicComponent = dynamic(() => Promise.resolve({ default: FakeComponent }), {
      ssr: false,
      loading: Loading,
    })

    // On server with ssr: false, should render loading, not the component
    const html = await renderAppServerElementToHtml(createElement(DynamicComponent))
    expect(html).toContain('Loading...')
    expect(html).not.toContain('Should not appear')
  })

  it('renders nothing for ssr: false without loading on server', async () => {
    const { default: dynamic } = await import('../src/shims/dynamic.js?text-ssr')

    const FakeComponent = () => createElement('div', null, 'Should not appear')
    const DynamicComponent = dynamic(() => Promise.resolve({ default: FakeComponent }), {
      ssr: false,
    })

    // On server with ssr: false and no loading component, should render nothing
    const html = await renderAppServerElementToHtml(createElement(DynamicComponent))
    expect(html.replace(/<!--[\s\S]*?-->/g, '')).toBe('')
  })

  it('accepts module without default export (bare component)', async () => {
    const { default: dynamic, flushPreloads } = await import('../src/shims/dynamic.js?text-ssr')

    const BareComponent = () => createElement('p', null, 'Bare export')
    const DynamicComponent = dynamic(() => Promise.resolve(BareComponent))

    await flushPreloads()
    const html = await renderAppServerElementToHtml(createElement(DynamicComponent, {}))
    expect(html).toContain('Bare export')
  })

  it('forwards props to the underlying component', async () => {
    const { default: dynamic, flushPreloads } = await import('../src/shims/dynamic.js?text-ssr')

    const Greeter = ({ name }: { name: string }) => createElement('span', null, `Hello ${name}`)
    const DynamicGreeter = dynamic(() => Promise.resolve({ default: Greeter }))

    await flushPreloads()
    const html = await renderAppServerElementToHtml(
      createElement(DynamicGreeter, { name: 'World' }),
    )
    expect(html).toContain('Hello World')
  })

  it('renders loading fallback when component not yet resolved (SSR)', async () => {
    const { default: dynamic } = await import('../src/shims/dynamic.js?text-ssr')

    let resolveLoader!: (val: any) => void
    const loaderPromise = new Promise(r => {
      resolveLoader = r
    })
    const SlowComponent = () => createElement('div', null, 'Loaded')
    const Loading = () => createElement('span', null, 'Please wait...')

    const DynamicSlow = dynamic(() => loaderPromise as any, { loading: Loading })

    const { renderAppServerElementToStream } = await import('./app-server-protocol-test-utils.js')
    const reader = renderAppServerElementToStream(createElement(DynamicSlow)).getReader()
    const decoder = new TextDecoder()
    let html = ''
    while (!html.includes('Please wait...')) {
      const part = await reader.read()
      expect(part.done).toBe(false)
      html += decoder.decode(part.value)
    }
    resolveLoader({ default: SlowComponent })
    for (;;) {
      const part = await reader.read()
      if (part.done) break
      html += decoder.decode(part.value)
    }
    expect(html).toContain('Loaded')
  })

  it('streaming renderer resolves multiple dynamic components', async () => {
    const { default: dynamic, flushPreloads } = await import('../src/shims/dynamic.js?text-ssr')

    const CompA = () => createElement('div', null, 'Component A')
    const CompB = () => createElement('div', null, 'Component B')

    const DynA = dynamic(() => new Promise<any>(r => setTimeout(() => r({ default: CompA }), 10)))
    const DynB = dynamic(() => new Promise<any>(r => setTimeout(() => r({ default: CompB }), 10)))

    await flushPreloads()
    const htmlA = await renderAppServerElementToHtml(createElement(DynA, {}))
    const htmlB = await renderAppServerElementToHtml(createElement(DynB, {}))

    expect(htmlA).toContain('Component A')
    expect(htmlB).toContain('Component B')
  })

  it('flushPreloads second call resolves immediately (queue drained)', async () => {
    const { flushPreloads } = await import('../src/shims/dynamic.js?text-ssr')

    // First call should drain whatever's in the queue
    await flushPreloads()

    // Second call should resolve immediately with empty array
    const result = await flushPreloads()
    expect(result).toEqual([])
  })

  it('loading component receives Text.js noSSR loading props', async () => {
    const { default: dynamic } = await import('../src/shims/dynamic.js?text-ssr')

    let receivedProps: any = null
    const Loading = (props: any) => {
      receivedProps = props
      return createElement('span', null, 'Loading')
    }

    const FakeComp = () => createElement('div', null, 'Content')
    const DynComp = dynamic(() => Promise.resolve({ default: FakeComp }), {
      ssr: false,
      loading: Loading,
    })

    await renderAppServerElementToHtml(createElement(DynComp))
    expect(receivedProps).not.toBeNull()
    expect(receivedProps.isLoading).toBe(true)
    expect(receivedProps.pastDelay).toBe(false)
    expect(receivedProps.error).toBeNull()
  })

  it('renders loading fallback for ssr: false with props forwarded', async () => {
    const { default: dynamic } = await import('../src/shims/dynamic.js?text-ssr')

    const HeavyChart = ({ title }: { title: string }) => createElement('canvas', null, title)
    const Loading = () => createElement('div', null, 'Chart loading...')

    const DynamicChart = dynamic(() => Promise.resolve({ default: HeavyChart }), {
      ssr: false,
      loading: Loading,
    })

    // On server: should show loading, not the chart
    const html = await renderAppServerElementToHtml(
      createElement(DynamicChart, { title: 'Revenue' }),
    )
    expect(html).toContain('Chart loading...')
    expect(html).not.toContain('Revenue')
  })

  it('handles module with both default and named exports', async () => {
    const { default: dynamic, flushPreloads } = await import('../src/shims/dynamic.js?text-ssr')

    const MainComponent = () => createElement('div', null, 'Main')
    const namedHelper = () => 'helper'

    const DynComp = dynamic(() => Promise.resolve({ default: MainComponent, namedHelper }))

    await flushPreloads()
    const html = await renderAppServerElementToHtml(createElement(DynComp, {}))
    expect(html).toContain('Main')
  })

  it('loader rejection does not crash flushPreloads', async () => {
    const { default: dynamic, flushPreloads } = await import('../src/shims/dynamic.js?text-ssr')

    dynamic(() => Promise.reject(new Error('Module not found')))

    // flushPreloads should not throw (it's now a no-op for the server lazy path,
    // but kept for backward compatibility with Pages Router)
    await expect(flushPreloads()).resolves.not.toThrow()
  })

  it('loader rejection renders loading component with error', async () => {
    const { default: dynamic, flushPreloads } = await import('../src/shims/dynamic.js?text-ssr')

    const LoadingComp = (props: { error?: Error | null; isLoading?: boolean }) => {
      if (props.error) {
        return createElement('div', null, `Error: ${props.error.message}`)
      }
      return createElement('div', null, 'Loading...')
    }

    const DynComp = dynamic(() => Promise.reject(new Error('chunk load fail')), {
      loading: LoadingComp,
    })

    await flushPreloads()
    const html = await renderAppServerElementToHtml(createElement(DynComp, {}))
    expect(html).toContain('Error: chunk load fail')
  })

  it('loader rejection without loading component propagates via onError', async () => {
    const { default: dynamic, flushPreloads } = await import('../src/shims/dynamic.js?text-ssr')

    const DynComp = dynamic(() => Promise.reject(new Error('fail')))

    await flushPreloads()
    await expect(renderAppServerElementToHtmlAsync(createElement(DynComp))).rejects.toThrow('fail')
  })

  it('loader rejection with non-Error value is caught during SSR', async () => {
    const { default: dynamic, flushPreloads } = await import('../src/shims/dynamic.js?text-ssr')

    const DynComp = dynamic(() => Promise.reject('string error'))

    await flushPreloads()
    await expect(renderAppServerElementToHtmlAsync(createElement(DynComp))).rejects.toThrow(
      'string error',
    )
  })
})

describe('basePath config validation', () => {
  it('resolveTextConfig preserves basePath with leading slash', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({ basePath: '/my-app' })
    expect(config.basePath).toBe('/my-app')
  })

  it('resolveTextConfig handles nested basePath', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({ basePath: '/a/b/c' })
    expect(config.basePath).toBe('/a/b/c')
  })

  it('resolveTextConfig defaults to empty string', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({})
    expect(config.basePath).toBe('')
  })

  it('resolveTextConfig handles undefined basePath', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({ basePath: undefined })
    expect(config.basePath).toBe('')
  })
})

describe('pageExtensions config', () => {
  it('resolveTextConfig defaults pageExtensions to Text.js defaults', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({})
    expect(config.pageExtensions).toEqual(['tsx', 'ts', 'jsx', 'js'])
  })

  it('resolveTextConfig reads pageExtensions from config', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({
      pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'mdx'],
    })
    expect(config.pageExtensions).toEqual(['js', 'jsx', 'ts', 'tsx', 'mdx'])
  })

  it('resolveTextConfig strips leading dots and whitespace from pageExtensions entries', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({
      pageExtensions: ['.tsx', ' ts ', 'tsx', '', '.mdx'],
    })
    expect(config.pageExtensions).toEqual(['tsx', 'ts', 'tsx', 'mdx'])
  })
})
