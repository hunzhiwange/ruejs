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
describe('handleImageOptimization', () => {
  it('returns 400 for invalid params', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image')
    const handlers = {
      fetchAsset: async () => new Response('', { status: 200 }),
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(400)
  })

  it('returns 404 when fetchAsset fails', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800')
    const handlers = {
      fetchAsset: async () => new Response('', { status: 404 }),
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(404)
  })

  it('returns original image when no transformImage handler', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800')
    const handlers = {
      fetchAsset: async () =>
        new Response('original-image-data', {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }),
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('original-image-data')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    expect(response.headers.get('Vary')).toBe('Accept')
  })

  it('calls transformImage when provided', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800&q=90', {
      headers: { Accept: 'image/webp' },
    })
    let capturedOptions: { width: number; format: string; quality: number } | null = null
    const handlers = {
      fetchAsset: async () =>
        new Response('original', {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }),
      transformImage: async (
        _body: ReadableStream,
        options: { width: number; format: string; quality: number },
      ) => {
        capturedOptions = options
        return new Response('transformed', { headers: { 'Content-Type': options.format } })
      },
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('transformed')
    expect(capturedOptions).toEqual({ width: 800, format: 'image/webp', quality: 90 })
  })

  it('falls back to original on transform error', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800')
    let fetchCount = 0
    const handlers = {
      fetchAsset: async () => {
        fetchCount += 1
        return new Response('original', {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        })
      },
      transformImage: async () => {
        throw new Error('transform failed')
      },
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('original')
    expect(fetchCount).toBe(1)
  })

  it('refetches the source when transform consumes the stream before failing', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800')
    let fetchCount = 0
    const handlers = {
      fetchAsset: async () => {
        fetchCount += 1
        return new Response(fetchCount === 1 ? 'original' : 'refetched', {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        })
      },
      transformImage: async (body: ReadableStream) => {
        await new Response(body).arrayBuffer()
        throw new Error('transform failed after consuming stream')
      },
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('refetched')
    expect(fetchCount).toBe(2)
  })

  it('uses refetched source headers when consumed transform falls back', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800')
    let fetchCount = 0
    const handlers = {
      fetchAsset: async () => {
        fetchCount += 1
        return new Response(fetchCount === 1 ? 'original' : 'refetched', {
          status: 200,
          headers: {
            'Content-Type': fetchCount === 1 ? 'image/png' : 'image/jpeg',
            ETag: fetchCount === 1 ? '"source-etag"' : '"refetched-etag"',
          },
        })
      },
      transformImage: async (body: ReadableStream) => {
        await new Response(body).arrayBuffer()
        throw new Error('transform failed after consuming stream')
      },
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(200)
    expect(fetchCount).toBe(2)
    expect(response.headers.get('Content-Type')).toBe('image/jpeg')
    expect(response.headers.get('ETag')).toBe('"refetched-etag"')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    expect(response.headers.get('Vary')).toBe('Accept')
  })

  it('returns 404 when refetch fallback cannot reload the source image', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800')
    let fetchCount = 0
    const handlers = {
      fetchAsset: async () => {
        fetchCount += 1
        if (fetchCount === 1) {
          return new Response('original', {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          })
        }
        return new Response('', { status: 404 })
      },
      transformImage: async (body: ReadableStream) => {
        await new Response(body).arrayBuffer()
        throw new Error('transform failed after consuming stream')
      },
    }
    const response = await handleImageOptimization(request, handlers)
    expect(fetchCount).toBe(2)
    expect(response.status).toBe(404)
  })

  it('returns 400 when refetch fallback reloads an unsafe content type', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800')
    let fetchCount = 0
    const handlers = {
      fetchAsset: async () => {
        fetchCount += 1
        return new Response(fetchCount === 1 ? 'original' : '<html>bad</html>', {
          status: 200,
          headers: {
            'Content-Type': fetchCount === 1 ? 'image/png' : 'text/html',
          },
        })
      },
      transformImage: async (body: ReadableStream) => {
        await new Response(body).arrayBuffer()
        throw new Error('transform failed after consuming stream')
      },
    }
    const response = await handleImageOptimization(request, handlers)
    expect(fetchCount).toBe(2)
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('The requested resource is not an allowed image type')
  })

  it('returns 400 for backslash open redirect (/\\evil.com)', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2F%5Cevil.com&w=800')
    const handlers = {
      fetchAsset: async () => new Response('should not be called', { status: 200 }),
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(400)
  })

  it('does not call fetchAsset for backslash URLs', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2F%5Cgoogle.com%2Fimg.jpg&w=800')
    let fetchCalled = false
    const handlers = {
      fetchAsset: async () => {
        fetchCalled = true
        return new Response('', { status: 200 })
      },
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(400)
    expect(fetchCalled).toBe(false)
  })

  it('blocks SVG content type', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fmalicious.svg&w=100&q=75')
    const handlers = {
      fetchAsset: async () =>
        new Response('<svg><script>alert(1)</script></svg>', {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml' },
        }),
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('The requested resource is not an allowed image type')
  })

  it('blocks text/html content type', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Ffake.jpg&w=100&q=75')
    const handlers = {
      fetchAsset: async () =>
        new Response('<html><script>alert(1)</script></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(400)
  })

  it('blocks responses with no Content-Type', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800')
    const handlers = {
      fetchAsset: async () => new Response('data', { status: 200 }),
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(400)
  })

  it('sets Content-Security-Policy header on fallback responses', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800')
    const handlers = {
      fetchAsset: async () =>
        new Response('image-data', {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }),
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Security-Policy')).toBe(
      "script-src 'none'; frame-src 'none'; sandbox;",
    )
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Content-Disposition')).toBe('inline')
  })

  it('sets Content-Security-Policy header on transformed responses', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800&q=90', {
      headers: { Accept: 'image/webp' },
    })
    const handlers = {
      fetchAsset: async () =>
        new Response('original', {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }),
      transformImage: async (
        _body: ReadableStream,
        options: { width: number; format: string; quality: number },
      ) => new Response('transformed', { headers: { 'Content-Type': options.format } }),
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Security-Policy')).toBe(
      "script-src 'none'; frame-src 'none'; sandbox;",
    )
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Content-Disposition')).toBe('inline')
  })

  it('overrides unsafe Content-Type from transform handler', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800&q=90', {
      headers: { Accept: 'image/webp' },
    })
    const handlers = {
      fetchAsset: async () =>
        new Response('original', {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }),
      transformImage: async () =>
        new Response('transformed', { headers: { 'Content-Type': 'text/html' } }),
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(200)
    // Should override to the negotiated format, not pass through text/html
    expect(response.headers.get('Content-Type')).toBe('image/webp')
  })

  it('allows SVG passthrough with dangerouslyAllowSVG: true', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Flogo.svg&w=100&q=75')
    const handlers = {
      fetchAsset: async () =>
        new Response('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>', {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml' },
        }),
    }
    const response = await handleImageOptimization(request, handlers, undefined, {
      dangerouslyAllowSVG: true,
    })
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>')
    expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
  })

  it('still blocks SVG when dangerouslyAllowSVG is false', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Flogo.svg&w=100&q=75')
    const handlers = {
      fetchAsset: async () =>
        new Response('<svg></svg>', {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml' },
        }),
    }
    const response = await handleImageOptimization(request, handlers, undefined, {
      dangerouslyAllowSVG: false,
    })
    expect(response.status).toBe(400)
  })

  it('SVG passthrough skips transformImage', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Flogo.svg&w=100&q=75')
    let transformCalled = false
    const handlers = {
      fetchAsset: async () =>
        new Response('<svg></svg>', {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml' },
        }),
      transformImage: async () => {
        transformCalled = true
        return new Response('transformed')
      },
    }
    const response = await handleImageOptimization(request, handlers, undefined, {
      dangerouslyAllowSVG: true,
    })
    expect(response.status).toBe(200)
    expect(transformCalled).toBe(false)
    expect(await response.text()).toBe('<svg></svg>')
  })

  it('applies security headers on SVG passthrough', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Flogo.svg&w=100&q=75')
    const handlers = {
      fetchAsset: async () =>
        new Response('<svg></svg>', {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml' },
        }),
    }
    const response = await handleImageOptimization(request, handlers, undefined, {
      dangerouslyAllowSVG: true,
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Security-Policy')).toBe(
      "script-src 'none'; frame-src 'none'; sandbox;",
    )
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Content-Disposition')).toBe('inline')
  })

  it('applies custom contentDispositionType', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800')
    const handlers = {
      fetchAsset: async () =>
        new Response('image-data', {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }),
    }
    const response = await handleImageOptimization(request, handlers, undefined, {
      contentDispositionType: 'attachment',
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Disposition')).toBe('attachment')
  })

  it('defaults Content-Disposition to inline when contentDispositionType is invalid', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800')
    const handlers = {
      fetchAsset: async () =>
        new Response('image-data', {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }),
    }
    const response = await handleImageOptimization(request, handlers, undefined, {
      contentDispositionType: 'bogus' as 'inline',
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Disposition')).toBe('inline')
  })

  it('applies custom contentSecurityPolicy', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800')
    const handlers = {
      fetchAsset: async () =>
        new Response('image-data', {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }),
    }
    const customCSP = "default-src 'self'; script-src 'none';"
    const response = await handleImageOptimization(request, handlers, undefined, {
      contentSecurityPolicy: customCSP,
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Security-Policy')).toBe(customCSP)
  })

  it('default behavior unchanged when no imageConfig provided', async () => {
    const { handleImageOptimization } = await import('../src/server/image-optimization.js')
    const request = new Request('http://localhost/_text/image?url=%2Fimg.jpg&w=800')
    const handlers = {
      fetchAsset: async () =>
        new Response('image-data', {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }),
    }
    const response = await handleImageOptimization(request, handlers)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Security-Policy')).toBe(
      "script-src 'none'; frame-src 'none'; sandbox;",
    )
    expect(response.headers.get('Content-Disposition')).toBe('inline')
  })
})

describe('text/navigation enhancements', () => {
  it('exports ReadonlyURLSearchParams runtime class', async () => {
    const nav = await import('../src/shims/navigation.js')
    expect(typeof nav.ReadonlyURLSearchParams).toBe('function')
    expect(typeof nav.useServerInsertedHTML).toBe('function')
  })

  it('ReadonlyURLSearchParams preserves reads and blocks mutation methods', async () => {
    const { ReadonlyURLSearchParams } = await import('../src/shims/navigation.js')

    const searchParams = new ReadonlyURLSearchParams('foo=bar&foo=baz&zap=zazzle')

    expect(searchParams).toBeInstanceOf(URLSearchParams)
    expect(searchParams).toBeInstanceOf(ReadonlyURLSearchParams)
    expect(searchParams.get('foo')).toBe('bar')
    expect(searchParams.getAll('foo')).toEqual(['bar', 'baz'])
    expect(searchParams.toString()).toBe('foo=bar&foo=baz&zap=zazzle')
    expect(() => searchParams.append('x', '1')).toThrow(
      'Method unavailable on `ReadonlyURLSearchParams`.',
    )
    expect(() => searchParams.delete('foo')).toThrow(
      'Method unavailable on `ReadonlyURLSearchParams`.',
    )
    expect(() => searchParams.set('foo', 'qux')).toThrow(
      'Method unavailable on `ReadonlyURLSearchParams`.',
    )
    expect(() => searchParams.sort()).toThrow('Method unavailable on `ReadonlyURLSearchParams`.')
    expect(searchParams.toString()).toBe('foo=bar&foo=baz&zap=zazzle')
  })

  it('useSearchParams returns a readonly wrapper on the server path', async () => {
    const { ReadonlyURLSearchParams, setNavigationContext, useSearchParams } =
      await import('../src/shims/navigation.js')

    try {
      setNavigationContext({
        pathname: '/readonly-test',
        searchParams: new URLSearchParams('foo=bar&foo=baz'),
        params: {},
      })

      const searchParams = useSearchParams()

      expect(searchParams).toBeInstanceOf(ReadonlyURLSearchParams)
      expect(searchParams.getAll('foo')).toEqual(['bar', 'baz'])
      expect(() => searchParams.set('foo', 'qux')).toThrow(
        'Method unavailable on `ReadonlyURLSearchParams`.',
      )
    } finally {
      setNavigationContext(null)
    }
  })

  it('useSearchParams reuses the same readonly wrapper for the same server context', async () => {
    const { setNavigationContext, useSearchParams } = await import('../src/shims/navigation.js')

    try {
      const ctx = {
        pathname: '/readonly-test',
        searchParams: new URLSearchParams('foo=bar'),
        params: {},
      }

      setNavigationContext(ctx)

      const first = useSearchParams()
      const second = useSearchParams()

      expect(first).toBe(second)
    } finally {
      setNavigationContext(null)
    }
  })

  it('useSearchParams keeps wrapper identity stable across concurrent ALS-scoped requests', async () => {
    const { runWithNavigationContext } = await import('../src/shims/navigation-state.js')
    const { setNavigationContext, useSearchParams } = await import('../src/shims/navigation.js')

    let releaseInterleave!: () => void
    const waitForInterleave = new Promise<void>(resolve => {
      releaseInterleave = resolve
    })

    async function runRequest(query: string, pathname: string) {
      return runWithNavigationContext(async () => {
        setNavigationContext({
          pathname,
          searchParams: new URLSearchParams(query),
          params: {},
        })

        const first = useSearchParams()
        await waitForInterleave
        const second = useSearchParams()

        return {
          first,
          second,
          value: first.toString(),
        }
      })
    }

    const requestA = runRequest('a=1', '/request-a')
    const requestB = runRequest('b=2', '/request-b')

    await Promise.resolve()
    releaseInterleave()

    const [a, b] = await Promise.all([requestA, requestB])

    expect(a.first).toBe(a.second)
    expect(b.first).toBe(b.second)
    expect(a.value).toBe('a=1')
    expect(b.value).toBe('b=2')
    expect(a.first).not.toBe(b.first)
  })

  it('useServerInsertedHTML is a no-op function', async () => {
    const { useServerInsertedHTML } = await import('../src/shims/navigation.js')
    // Should not throw
    expect(() => useServerInsertedHTML(() => null)).not.toThrow()
  })
})

describe('text/legacy/image shim', () => {
  it('renders LegacyImage with layout=fill as modern Image with fill prop', async () => {
    const LegacyImage = (await import('../src/shims/legacy-image.js?text-ssr')).default

    const html = await renderRueToString(() =>
      createRueElement(LegacyImage, {
        src: '/photo.jpg',
        alt: 'Test',
        layout: 'fill',
        objectFit: 'cover',
        objectPosition: 'center',
      }),
    )
    expect(html).toContain('photo.jpg')
    expect(html).toContain('alt')
    // fill mode should produce absolute positioning styles
    expect(html).toMatch(/position:\s*absolute/)
  })

  it('renders LegacyImage with layout=intrinsic using width/height', async () => {
    const LegacyImage = (await import('../src/shims/legacy-image.js?text-ssr')).default

    const html = await renderRueToString(() =>
      createRueElement(LegacyImage, {
        src: '/photo.jpg',
        alt: 'Test',
        layout: 'intrinsic',
        width: 640,
        height: 480,
      }),
    )
    expect(html).toContain('width="640"')
    expect(html).toContain('height="480"')
  })

  it('renders LegacyImage with string width/height (converts to number)', async () => {
    const LegacyImage = (await import('../src/shims/legacy-image.js?text-ssr')).default

    const html = await renderRueToString(() =>
      createRueElement(LegacyImage, {
        src: '/photo.jpg',
        alt: 'Test',
        width: '200',
        height: '150',
      }),
    )
    expect(html).toContain('width="200"')
    expect(html).toContain('height="150"')
  })
})

describe('text/error shim', () => {
  it('renders 404 error page', async () => {
    const ErrorComponent = (await import('../src/shims/error.js?text-ssr')).default

    const html = await renderAppServerElementToHtml(
      createElement(ErrorComponent, { statusCode: 404 }),
    )
    expect(html).toContain('404')
    expect(html).toContain('could not be found')
  })

  it('renders 500 error page', async () => {
    const ErrorComponent = (await import('../src/shims/error.js?text-ssr')).default

    const html = await renderAppServerElementToHtml(
      createElement(ErrorComponent, { statusCode: 500 }),
    )
    expect(html).toContain('500')
    expect(html).toContain('Internal Server Error')
  })

  it('renders custom title', async () => {
    const ErrorComponent = (await import('../src/shims/error.js?text-ssr')).default

    const html = await renderAppServerElementToHtml(
      createElement(ErrorComponent, { statusCode: 403, title: 'Forbidden' }),
    )
    expect(html).toContain('403')
    expect(html).toContain('Forbidden')
  })
})

// text/app default export
//
// Ported from Text.js: packages/text/src/pages/_app.tsx
// https://github.com/vercel/next.js/blob/canary/packages/text/src/pages/_app.tsx
//
// Pages Router fixtures very commonly do:
//   import App from "text/app";
//   export default class MyApp extends App { ... }
// or call App.getInitialProps(appContext) from a custom getInitialProps.
// Without a runtime default export, every such fixture fails to build with
// "[MISSING_EXPORT] 'default' is not exported by ...shims/app.js".
describe('text/app shim', () => {
  it('default compiled App renders Component with pageProps', async () => {
    const AppDefault = (await import('../src/shims/app.js?text-ssr')).default

    function Page(props: { greeting: string }) {
      return createElement('p', null, props.greeting)
    }

    const html = await renderAppServerElementToHtml(
      createElement(AppDefault<unknown, { greeting: string }> as never, {
        Component: Page,
        pageProps: { greeting: 'hello world' },
      }),
    )
    expect(html.replace(/<!--.*?-->/g, '')).toBe('<p>hello world</p>')
  })

  it('App.getInitialProps is a function and forwards Component.getInitialProps result as pageProps', async () => {
    const AppDefault = (await import('../src/shims/app.js?text-ssr')).default
    expect(typeof AppDefault.getInitialProps).toBe('function')
    // origGetInitialProps is preserved for userland code that introspects it.
    expect(typeof AppDefault.origGetInitialProps).toBe('function')

    const pageCtx = { req: { url: '/test' } }
    const Component = Object.assign(() => null, {
      getInitialProps: async (ctx: unknown) => {
        expect(ctx).toBe(pageCtx)
        return { foo: 'bar' }
      },
    })

    const result = await AppDefault.getInitialProps({
      Component,
      AppTree: () => null,
      ctx: pageCtx,
      router: {},
    })
    expect(result).toEqual({ pageProps: { foo: 'bar' } })
  })

  it('App.getInitialProps returns { pageProps: {} } when Component has no getInitialProps', async () => {
    const AppDefault = (await import('../src/shims/app.js?text-ssr')).default
    const result = await AppDefault.getInitialProps({
      Component: () => null,
      AppTree: () => null,
      ctx: {},
      router: {},
    })
    expect(result).toEqual({ pageProps: {} })
  })
})

describe('text/constants shim', () => {
  it('exports all phase constants', async () => {
    const constants = await import('../src/shims/constants.js')
    const constantsFromText = await import('text/constants')
    const pickPhaseConstants = (mod: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(mod).filter(([key]) => key.startsWith('PHASE_')))

    expect(pickPhaseConstants(constants)).toEqual(pickPhaseConstants(constantsFromText))
  })
})
