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

describe('onLoad / onError handler attachment (SSR)', () => {
  it('does not leak onLoad or onError as DOM attributes (remote URL + fill)', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'remote fill',
        src: 'https://images.unsplash.com/photo-8',
        fill: true,
        onLoad: () => {},
        onError: () => {},
      }),
    )
    expect(html).not.toContain('onload=')
    expect(html).not.toContain('onerror=')
    expect(html).toContain('alt="remote fill"')
  })

  it('renders valid SSR output with both onLoad and onError (local image)', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'events',
        src: '/photo.jpg',
        width: 400,
        height: 300,
        onLoad: () => {},
        onError: () => {},
      }),
    )
    expect(html).toContain('<img')
    expect(html).toContain('alt="events"')
    expect(html).toContain('data-nimg="1"')
  })

  it('renders valid SSR output with both onLoad and onError (remote URL via UnpicImage)', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'remote events',
        src: 'https://images.unsplash.com/photo-9',
        width: 400,
        height: 300,
        onLoad: () => {},
        onError: () => {},
      }),
    )
    expect(html).toContain('<img')
    expect(html).toContain('alt="remote events"')
  })
})
