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

describe('Image SSR rendering', () => {
  it('renders a basic <img> tag with correct attributes', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'a nice image',
        src: '/test.png',
        width: 100,
        height: 100,
      }),
    )
    expect(html).toContain('alt="a nice image"')
    // Local images are routed through the optimization endpoint
    expect(html).toContain(`src="${optUrlHtml('/test.png', 100)}"`)
    expect(html).toContain('width="100"')
    expect(html).toContain('height="100"')
    expect(html).toContain('decoding="async"')
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('data-nimg="1"')
  })

  it('renders with priority (preload + eager loading + fetchpriority)', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'priority image',
        src: '/hero.png',
        width: 800,
        height: 600,
        priority: true,
      }),
    )
    // Ported from Text.js:
    // .textjs-ref/test/e2e/text-image-new/app-dir/app-dir-static.test.ts
    // .textjs-ref/packages/text/src/client/image-component.tsx
    expect(html).toMatch(/<link\b[^>]*\brel="preload"/)
    expect(html).toContain('as="image"')
    expect(html).toContain('fetchPriority="high"')
    expect(html).toContain(`imageSrcSet="${optUrlHtml('/hero.png', 640)} 640w`)
    expect(html).not.toContain(`href="${optUrlHtml('/hero.png', 800)}"`)
    expect(html).toContain('loading="eager"')
    expect(html).toContain('fetchPriority="high"')
    expect(html).not.toContain('loading="lazy"')
  })

  it('renders an image preload for the modern preload prop', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'preloaded image',
        src: '/hero-preload.png',
        width: 800,
        height: 600,
        preload: true,
      }),
    )
    expect(html).toMatch(/<link\b[^>]*\brel="preload"/)
    expect(html).toContain('as="image"')
    expect(html).toContain(`imageSrcSet="${optUrlHtml('/hero-preload.png', 640)} 640w`)
    expect(html).not.toContain('loading="lazy"')
    expect(html).not.toContain('fetchPriority="high"')
  })

  it('renders fill mode with absolute positioning', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'fill image',
        src: '/bg.png',
        fill: true,
      }),
    )
    // Fill mode: no width/height attributes
    expect(html).not.toMatch(/width="\d+"/)
    expect(html).not.toMatch(/height="\d+"/)
    // Fill adds position:absolute and 100% dimensions
    expect(html).toMatch(/position:\s*absolute/)
    expect(html).toMatch(/width:\s*100%/)
    expect(html).toMatch(/height:\s*100%/)
    expect(html).toContain('data-nimg="fill"')
    // Fill defaults sizes to 100vw
    expect(html).toContain('sizes="100vw"')
  })
})
