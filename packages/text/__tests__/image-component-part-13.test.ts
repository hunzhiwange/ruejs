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

describe('priority prop — no DOM leak on remote URL paths', () => {
  it('does not render priority attribute on DOM img (remote URL + width/height)', async () => {
    // Reproduction: this used to emit `priority="true"` on the DOM element,
    // triggering the Rue warning about non-boolean attribute.
    const html = await renderToString(
      createElement(Image, {
        alt: 'remote priority',
        src: 'https://images.unsplash.com/photo-1',
        width: 800,
        height: 600,
        priority: true,
      }),
    )
    expect(html).not.toContain('priority=')
    expect(html).not.toContain('"priority"')
  })

  it('does not render priority attribute on DOM img (remote URL + fill)', async () => {
    // Reproduction: fill layout path also forwarded priority={true} to UnpicImage.
    const html = await renderToString(
      createElement(Image, {
        alt: 'remote fill priority',
        src: 'https://images.unsplash.com/photo-2',
        fill: true,
        priority: true,
      }),
    )
    expect(html).not.toContain('priority=')
    expect(html).not.toContain('"priority"')
  })

  it('renders loading=eager for remote URL + width/height when priority=true', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'remote priority eager',
        src: 'https://images.unsplash.com/photo-3',
        width: 400,
        height: 300,
        priority: true,
      }),
    )
    expect(html).toContain('loading="eager"')
    expect(html).not.toContain('loading="lazy"')
  })

  it('renders loading=eager for remote URL + fill when priority=true', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'remote fill priority eager',
        src: 'https://images.unsplash.com/photo-4',
        fill: true,
        priority: true,
      }),
    )
    expect(html).toContain('loading="eager"')
    expect(html).not.toContain('loading="lazy"')
  })
})
