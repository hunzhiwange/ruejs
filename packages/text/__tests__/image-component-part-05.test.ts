/**
 * text/image component unit tests.
 *
 * Mirrors test cases from Text.js test/unit/text-image-new.test.ts and
 * test/unit/text-image-get-img-props.test.ts, adapted for text's
 * Image shim implementation.
 *
 * Tests SSR output, srcSet generation, getImageProps(), fill mode,
 * priority, custom loader, and static image data handling.
 */
import { describe, it, expect, vi, afterEach } from 'vite-plus/test'
import { createElement, renderToString } from './rue-ssr-test-utils.js'
import Image, { getImageProps, type StaticImageData } from '../src/shims/image.js?text-ssr'

/** Helper: expected optimization URL matching what the image shim produces. */
function optUrl(src: string, w: number, q = 75): string {
  return `/_text/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`
}
/** Same as optUrl but with HTML entity encoding (for SSR output assertions). */
function optUrlHtml(src: string, w: number, q = 75): string {
  return optUrl(src, w, q).replace(/&/g, '&amp;')
}

// ─── Issue #1513 reproduction ───────────────────────────────────────────
//
// The default loader must emit URLs starting with /_text/image. This guards
// against regression of https://github.com/cloudflare/vinext/issues/1513.

describe('Image srcSet generation', () => {
  it('generates srcSet for local images with width', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'test',
        src: '/photo.png',
        width: 500,
        height: 400,
      }),
    )
    // RESPONSIVE_WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
    // Filter: widths <= 500 * 2 = 1000 → [640, 750, 828]
    expect(html).toContain('srcSet')
    expect(html).toContain(`${optUrlHtml('/photo.png', 640)} 640w`)
    expect(html).toContain(`${optUrlHtml('/photo.png', 750)} 750w`)
    expect(html).toContain(`${optUrlHtml('/photo.png', 828)} 828w`)
    // Should not include widths > 1000
    expect(html).not.toContain('1080w')
  })

  it('generates srcSet with all widths for large images', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'test',
        src: '/large.png',
        width: 2000,
        height: 1500,
      }),
    )
    // widths <= 4000: all of them
    expect(html).toContain(`${optUrlHtml('/large.png', 640)} 640w`)
    expect(html).toContain(`${optUrlHtml('/large.png', 3840)} 3840w`)
  })

  it('generates fallback srcSet for very small images', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'tiny',
        src: '/icon.png',
        width: 16,
        height: 16,
      }),
    )
    // widths <= 32: none of RESPONSIVE_WIDTHS qualify
    // Falls back to single: optimized icon.png at 16w
    expect(html).toContain(`${optUrlHtml('/icon.png', 16)} 16w`)
  })

  it('does not generate srcSet for fill mode', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'fill',
        src: '/bg.png',
        fill: true,
      }),
    )
    // Fill mode: no srcSet (srcSet is only for local non-fill images with width)
    expect(html).not.toContain('srcSet')
  })
})
