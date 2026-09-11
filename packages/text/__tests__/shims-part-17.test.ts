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
describe('image remote pattern matching', () => {
  it('matchRemotePattern matches exact hostname', async () => {
    const { matchRemotePattern } = await import('../src/shims/image-config.js')
    const pattern = { hostname: 'cdn.example.com' }
    expect(matchRemotePattern(pattern, new URL('https://cdn.example.com/img.jpg'))).toBe(true)
    expect(matchRemotePattern(pattern, new URL('https://other.example.com/img.jpg'))).toBe(false)
  })

  it('matchRemotePattern matches wildcard hostname with *', async () => {
    const { matchRemotePattern } = await import('../src/shims/image-config.js')
    const pattern = { hostname: '*.example.com' }
    expect(matchRemotePattern(pattern, new URL('https://cdn.example.com/img.jpg'))).toBe(true)
    expect(matchRemotePattern(pattern, new URL('https://images.example.com/img.jpg'))).toBe(true)
    // Single * should NOT match nested subdomains
    expect(matchRemotePattern(pattern, new URL('https://a.b.example.com/img.jpg'))).toBe(false)
    // Should not match bare domain
    expect(matchRemotePattern(pattern, new URL('https://example.com/img.jpg'))).toBe(false)
  })

  it('matchRemotePattern matches ** hostname for any depth', async () => {
    const { matchRemotePattern } = await import('../src/shims/image-config.js')
    const pattern = { hostname: '**.example.com' }
    expect(matchRemotePattern(pattern, new URL('https://cdn.example.com/img.jpg'))).toBe(true)
    expect(matchRemotePattern(pattern, new URL('https://a.b.c.example.com/img.jpg'))).toBe(true)
    // ** requires at least one segment
    expect(matchRemotePattern(pattern, new URL('https://example.com/img.jpg'))).toBe(false)
  })

  it('matchRemotePattern checks protocol when specified', async () => {
    const { matchRemotePattern } = await import('../src/shims/image-config.js')
    const pattern = { protocol: 'https', hostname: 'cdn.example.com' }
    expect(matchRemotePattern(pattern, new URL('https://cdn.example.com/img.jpg'))).toBe(true)
    expect(matchRemotePattern(pattern, new URL('http://cdn.example.com/img.jpg'))).toBe(false)
  })

  it('matchRemotePattern checks port when specified', async () => {
    const { matchRemotePattern } = await import('../src/shims/image-config.js')
    const pattern = { hostname: 'localhost', port: '3000' }
    expect(matchRemotePattern(pattern, new URL('http://localhost:3000/img.jpg'))).toBe(true)
    expect(matchRemotePattern(pattern, new URL('http://localhost:8080/img.jpg'))).toBe(false)
  })

  it('matchRemotePattern checks pathname when specified', async () => {
    const { matchRemotePattern } = await import('../src/shims/image-config.js')
    const pattern = { hostname: 'cdn.example.com', pathname: '/images/**' }
    expect(matchRemotePattern(pattern, new URL('https://cdn.example.com/images/photo.jpg'))).toBe(
      true,
    )
    expect(
      matchRemotePattern(pattern, new URL('https://cdn.example.com/images/nested/photo.jpg')),
    ).toBe(true)
    expect(matchRemotePattern(pattern, new URL('https://cdn.example.com/other/photo.jpg'))).toBe(
      false,
    )
  })

  it('matchRemotePattern checks search when specified', async () => {
    const { matchRemotePattern } = await import('../src/shims/image-config.js')
    const pattern = { hostname: 'cdn.example.com', search: '?v=123' }
    expect(matchRemotePattern(pattern, new URL('https://cdn.example.com/img.jpg?v=123'))).toBe(true)
    expect(matchRemotePattern(pattern, new URL('https://cdn.example.com/img.jpg?v=456'))).toBe(
      false,
    )
    expect(matchRemotePattern(pattern, new URL('https://cdn.example.com/img.jpg'))).toBe(false)
  })

  it('matchRemotePattern defaults pathname to ** when not specified', async () => {
    const { matchRemotePattern } = await import('../src/shims/image-config.js')
    const pattern = { hostname: 'cdn.example.com' }
    expect(
      matchRemotePattern(pattern, new URL('https://cdn.example.com/any/deep/path/img.jpg')),
    ).toBe(true)
    expect(matchRemotePattern(pattern, new URL('https://cdn.example.com/'))).toBe(true)
  })

  it('matchRemotePattern handles protocol with trailing colon', async () => {
    const { matchRemotePattern } = await import('../src/shims/image-config.js')
    const pattern = { protocol: 'https:', hostname: 'cdn.example.com' }
    expect(matchRemotePattern(pattern, new URL('https://cdn.example.com/img.jpg'))).toBe(true)
  })

  it('hasRemoteMatch checks domains list', async () => {
    const { hasRemoteMatch } = await import('../src/shims/image-config.js')
    const domains = ['cdn.example.com', 'images.example.com']
    expect(hasRemoteMatch(domains, [], new URL('https://cdn.example.com/img.jpg'))).toBe(true)
    expect(hasRemoteMatch(domains, [], new URL('https://images.example.com/img.jpg'))).toBe(true)
    expect(hasRemoteMatch(domains, [], new URL('https://other.example.com/img.jpg'))).toBe(false)
  })

  it("hasRemoteMatch checks remotePatterns when domains don't match", async () => {
    const { hasRemoteMatch } = await import('../src/shims/image-config.js')
    const patterns = [{ protocol: 'https', hostname: '**.cdn.example.com' }]
    expect(hasRemoteMatch([], patterns, new URL('https://us.cdn.example.com/img.jpg'))).toBe(true)
    expect(hasRemoteMatch([], patterns, new URL('http://us.cdn.example.com/img.jpg'))).toBe(false)
  })

  it('matchRemotePattern handles single * in pathname', async () => {
    const { matchRemotePattern } = await import('../src/shims/image-config.js')
    const pattern = { hostname: 'cdn.example.com', pathname: '/images/*' }
    expect(matchRemotePattern(pattern, new URL('https://cdn.example.com/images/photo.jpg'))).toBe(
      true,
    )
    // Single * should not match nested paths
    expect(
      matchRemotePattern(pattern, new URL('https://cdn.example.com/images/nested/photo.jpg')),
    ).toBe(false)
  })

  it('matchRemotePattern handles regex special chars in hostname', async () => {
    const { matchRemotePattern } = await import('../src/shims/image-config.js')
    // Dots in hostname are literal (escaped for regex)
    const pattern = { hostname: 'cdn.example.com' }
    expect(matchRemotePattern(pattern, new URL('https://cdn.example.com/img.jpg'))).toBe(true)
    // "cdnXexampleXcom" should not match "cdn.example.com"
    expect(matchRemotePattern(pattern, new URL('https://cdnXexample.com/img.jpg'))).toBe(false)
  })
})

describe('image optimization URL generation', () => {
  it('imageOptimizationUrl generates correct URL', async () => {
    const { imageOptimizationUrl } = await import('../src/shims/image.js?text-ssr')
    const url = imageOptimizationUrl('/images/hero.webp', 1200, 75)
    expect(url).toBe('/_text/image?url=%2Fimages%2Fhero.webp&w=1200&q=75')
  })

  it('imageOptimizationUrl encodes special characters', async () => {
    const { imageOptimizationUrl } = await import('../src/shims/image.js?text-ssr')
    const url = imageOptimizationUrl('/images/my photo.jpg', 800, 80)
    expect(url).toContain('url=%2Fimages%2Fmy%20photo.jpg')
    expect(url).toContain('w=800')
    expect(url).toContain('q=80')
  })

  it('imageOptimizationUrl uses default quality of 75', async () => {
    const { imageOptimizationUrl } = await import('../src/shims/image.js?text-ssr')
    const url = imageOptimizationUrl('/img.png', 640)
    expect(url).toContain('q=75')
  })
})

describe('image optimization request parsing', () => {
  it('parseImageParams extracts url, width, quality', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    const url = new URL('http://localhost/_text/image?url=%2Fimages%2Fhero.webp&w=1200&q=75')
    const params = parseImageParams(url)
    expect(params).not.toBeNull()
    expect(params!.imageUrl).toBe('/images/hero.webp')
    expect(params!.width).toBe(1200)
    expect(params!.quality).toBe(75)
  })

  it('parseImageParams returns null when url is missing', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    const url = new URL('http://localhost/_text/image?w=800&q=75')
    expect(parseImageParams(url)).toBeNull()
  })

  it('parseImageParams blocks absolute http URLs', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    const url = new URL('http://localhost/_text/image?url=http%3A%2F%2Fevil.com%2Fimg.jpg&w=800')
    expect(parseImageParams(url)).toBeNull()
  })

  it('parseImageParams blocks absolute https URLs', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    const url = new URL('http://localhost/_text/image?url=https%3A%2F%2Fevil.com%2Fimg.jpg&w=800')
    expect(parseImageParams(url)).toBeNull()
  })

  it('parseImageParams blocks protocol-relative URLs', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    const url = new URL('http://localhost/_text/image?url=%2F%2Fevil.com%2Fimg.jpg&w=800')
    expect(parseImageParams(url)).toBeNull()
  })

  it('parseImageParams defaults width to 0 and quality to 75', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    const url = new URL('http://localhost/_text/image?url=%2Fimg.jpg')
    const params = parseImageParams(url)
    expect(params).not.toBeNull()
    expect(params!.width).toBe(0)
    expect(params!.quality).toBe(75)
  })

  it('parseImageParams blocks data: URIs (exotic scheme bypass)', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    expect(
      parseImageParams(
        new URL(
          'http://localhost/_text/image?url=data%3Atext%2Fhtml%2C%3Cscript%3Ealert(1)%3C%2Fscript%3E&w=800',
        ),
      ),
    ).toBeNull()
  })

  it('parseImageParams blocks javascript: URIs', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    expect(
      parseImageParams(new URL('http://localhost/_text/image?url=javascript%3Aalert(1)&w=800')),
    ).toBeNull()
  })

  it('parseImageParams blocks bare filenames (no leading slash)', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    expect(parseImageParams(new URL('http://localhost/_text/image?url=img.jpg&w=800'))).toBeNull()
  })

  it('parseImageParams rejects quality outside 1-100', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    expect(parseImageParams(new URL('http://localhost/_text/image?url=%2Fimg.jpg&q=0'))).toBeNull()
    expect(
      parseImageParams(new URL('http://localhost/_text/image?url=%2Fimg.jpg&q=101')),
    ).toBeNull()
  })

  it('parseImageParams blocks backslash-based open redirect (/\\evil.com)', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    // /\evil.com — browsers and the URL constructor treat this as //evil.com
    expect(
      parseImageParams(new URL('http://localhost/_text/image?url=%2F%5Cevil.com&w=800')),
    ).toBeNull()
  })

  it('parseImageParams blocks encoded backslash variants', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    // /\evil.com/img.jpg
    expect(
      parseImageParams(new URL('http://localhost/_text/image?url=%2F%5Cevil.com%2Fimg.jpg&w=800')),
    ).toBeNull()
    // /\\evil.com (double backslash)
    expect(
      parseImageParams(new URL('http://localhost/_text/image?url=%2F%5C%5Cevil.com&w=800')),
    ).toBeNull()
  })

  it("parseImageParams validates origin hasn't changed after URL construction", async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    // This tests defense-in-depth: even if a future parser differential is found,
    // the origin check catches it.
    // A valid relative URL should pass
    const good = parseImageParams(
      new URL('http://localhost/_text/image?url=%2Fimages%2Fhero.webp&w=800'),
    )
    expect(good).not.toBeNull()
    expect(good!.imageUrl).toBe('/images/hero.webp')
  })

  it('parseImageParams normalizes backslashes in returned imageUrl', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    // /images\hero.webp should be normalized to /images/hero.webp
    // (backslash in the middle of a valid path)
    const result = parseImageParams(
      new URL('http://localhost/_text/image?url=%2Fimages%5Chero.webp&w=800'),
    )
    expect(result).not.toBeNull()
    expect(result!.imageUrl).toBe('/images/hero.webp')
  })

  it('parseImageParams rejects width exceeding absolute maximum (3840)', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    expect(
      parseImageParams(new URL('http://localhost/_text/image?url=%2Fimg.jpg&w=3841')),
    ).toBeNull()
    expect(
      parseImageParams(new URL('http://localhost/_text/image?url=%2Fimg.jpg&w=999999999')),
    ).toBeNull()
    expect(
      parseImageParams(new URL('http://localhost/_text/image?url=%2Fimg.jpg&w=2147483647')),
    ).toBeNull()
  })

  it('parseImageParams accepts width at the absolute maximum (3840)', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    const params = parseImageParams(new URL('http://localhost/_text/image?url=%2Fimg.jpg&w=3840'))
    expect(params).not.toBeNull()
    expect(params!.width).toBe(3840)
  })

  it('parseImageParams validates against allowedWidths when provided', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    const allowedWidths = [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
    // Allowed width passes
    const params = parseImageParams(
      new URL('http://localhost/_text/image?url=%2Fimg.jpg&w=1080'),
      allowedWidths,
    )
    expect(params).not.toBeNull()
    expect(params!.width).toBe(1080)
    // Non-allowed width is rejected
    expect(
      parseImageParams(new URL('http://localhost/_text/image?url=%2Fimg.jpg&w=999'), allowedWidths),
    ).toBeNull()
    // w=0 (no resize) is always allowed even with allowedWidths
    const noResize = parseImageParams(
      new URL('http://localhost/_text/image?url=%2Fimg.jpg&w=0'),
      allowedWidths,
    )
    expect(noResize).not.toBeNull()
    expect(noResize!.width).toBe(0)
  })

  it('parseImageParams allows imageSizes (small widths) in allowedWidths', async () => {
    const { parseImageParams } = await import('../src/server/image-optimization.js')
    const allowedWidths = [
      16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
    ]
    const params = parseImageParams(
      new URL('http://localhost/_text/image?url=%2Fimg.jpg&w=64'),
      allowedWidths,
    )
    expect(params).not.toBeNull()
    expect(params!.width).toBe(64)
  })

  it('negotiateImageFormat prefers AVIF over WebP', async () => {
    const { negotiateImageFormat } = await import('../src/server/image-optimization.js')
    expect(negotiateImageFormat('image/avif,image/webp,image/jpeg')).toBe('image/avif')
  })

  it('negotiateImageFormat selects WebP when no AVIF', async () => {
    const { negotiateImageFormat } = await import('../src/server/image-optimization.js')
    expect(negotiateImageFormat('image/webp,image/jpeg')).toBe('image/webp')
  })

  it('negotiateImageFormat falls back to JPEG', async () => {
    const { negotiateImageFormat } = await import('../src/server/image-optimization.js')
    expect(negotiateImageFormat('image/png,image/jpeg')).toBe('image/jpeg')
    expect(negotiateImageFormat(null)).toBe('image/jpeg')
  })

  it('IMAGE_OPTIMIZATION_PATH is /_text/image', async () => {
    const { IMAGE_OPTIMIZATION_PATH } = await import('../src/server/image-optimization.js')
    expect(IMAGE_OPTIMIZATION_PATH).toBe('/_text/image')
  })

  it('TEXT_IMAGE_OPTIMIZATION_PATH is /_text/image', async () => {
    const { TEXT_IMAGE_OPTIMIZATION_PATH } = await import('../src/server/image-optimization.js')
    expect(TEXT_IMAGE_OPTIMIZATION_PATH).toBe('/_text/image')
  })

  it('isImageOptimizationPath accepts only the text endpoint', async () => {
    const { isImageOptimizationPath } = await import('../src/server/image-optimization.js')
    expect(isImageOptimizationPath('/_text/image')).toBe(true)
    expect(isImageOptimizationPath('/_legacy/image')).toBe(false)
    expect(isImageOptimizationPath('/_text/image/')).toBe(false)
    expect(isImageOptimizationPath('/_text/image.png')).toBe(false)
    expect(isImageOptimizationPath('/_text/data')).toBe(false)
    expect(isImageOptimizationPath('/')).toBe(false)
  })

  it('exports DEFAULT_DEVICE_SIZES and DEFAULT_IMAGE_SIZES matching Text.js defaults', async () => {
    const { DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } =
      await import('../src/server/image-optimization.js')
    expect(DEFAULT_DEVICE_SIZES).toEqual([640, 750, 828, 1080, 1200, 1920, 2048, 3840])
    expect(DEFAULT_IMAGE_SIZES).toEqual([16, 32, 48, 64, 96, 128, 256, 384])
  })
})

describe('isSafeImageContentType', () => {
  it('accepts safe image content types', async () => {
    const { isSafeImageContentType } = await import('../src/server/image-optimization.js')
    expect(isSafeImageContentType('image/jpeg')).toBe(true)
    expect(isSafeImageContentType('image/png')).toBe(true)
    expect(isSafeImageContentType('image/gif')).toBe(true)
    expect(isSafeImageContentType('image/webp')).toBe(true)
    expect(isSafeImageContentType('image/avif')).toBe(true)
    expect(isSafeImageContentType('image/x-icon')).toBe(true)
    expect(isSafeImageContentType('image/bmp')).toBe(true)
    expect(isSafeImageContentType('image/tiff')).toBe(true)
  })

  it('rejects SVG content type', async () => {
    const { isSafeImageContentType } = await import('../src/server/image-optimization.js')
    expect(isSafeImageContentType('image/svg+xml')).toBe(false)
  })

  it('rejects non-image content types', async () => {
    const { isSafeImageContentType } = await import('../src/server/image-optimization.js')
    expect(isSafeImageContentType('text/html')).toBe(false)
    expect(isSafeImageContentType('application/javascript')).toBe(false)
    expect(isSafeImageContentType('text/xml')).toBe(false)
    expect(isSafeImageContentType('application/octet-stream')).toBe(false)
  })

  it('rejects null content type', async () => {
    const { isSafeImageContentType } = await import('../src/server/image-optimization.js')
    expect(isSafeImageContentType(null)).toBe(false)
  })

  it('handles content type with parameters (charset, etc.)', async () => {
    const { isSafeImageContentType } = await import('../src/server/image-optimization.js')
    expect(isSafeImageContentType('image/jpeg; charset=utf-8')).toBe(true)
    expect(isSafeImageContentType('image/svg+xml; charset=utf-8')).toBe(false)
  })

  it('is case-insensitive', async () => {
    const { isSafeImageContentType } = await import('../src/server/image-optimization.js')
    expect(isSafeImageContentType('Image/JPEG')).toBe(true)
    expect(isSafeImageContentType('IMAGE/SVG+XML')).toBe(false)
  })

  it('allows SVG when dangerouslyAllowSVG is true', async () => {
    const { isSafeImageContentType } = await import('../src/server/image-optimization.js')
    expect(isSafeImageContentType('image/svg+xml', true)).toBe(true)
  })

  it('allows SVG with parameters when dangerouslyAllowSVG is true', async () => {
    const { isSafeImageContentType } = await import('../src/server/image-optimization.js')
    expect(isSafeImageContentType('image/svg+xml; charset=utf-8', true)).toBe(true)
  })

  it('still rejects non-image types when dangerouslyAllowSVG is true', async () => {
    const { isSafeImageContentType } = await import('../src/server/image-optimization.js')
    expect(isSafeImageContentType('text/html', true)).toBe(false)
    expect(isSafeImageContentType('application/javascript', true)).toBe(false)
    expect(isSafeImageContentType(null, true)).toBe(false)
  })
})
