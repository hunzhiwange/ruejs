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
  it('renders StaticImageData (import result)', async () => {
    const staticImage: StaticImageData = {
      src: '/_text/static/media/test.abc123.png',
      width: 800,
      height: 600,
      blurDataURL: 'data:image/png;base64,xyz',
    }
    const html = await renderToString(
      createElement(Image, {
        alt: 'static import',
        src: staticImage,
        placeholder: 'blur',
      }),
    )
    expect(html).toContain(`src="${optUrlHtml('/_text/static/media/test.abc123.png', 800)}"`)

    expect(html).toContain('width="800"')
    expect(html).toContain('height="600"')
    expect(html).toContain('data:image/png;base64,xyz')
  })

  it('applies className and custom style', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'styled',
        src: '/test.png',
        width: 100,
        height: 100,
        className: 'hero-img',
        style: { borderRadius: '8px' },
      }),
    )
    expect(html).toContain('class="hero-img"')
    expect(html).toMatch(/border-radius:\s*8px/)
  })

  it('preserves custom style for remote images with width and height', async () => {
    // Text.js computes a single imgAttributes.style object in getImgProps and
    // passes it through to the rendered <img>.
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/shared/lib/get-img-props.ts
    // https://github.com/vercel/next.js/blob/canary/packages/text/src/client/image-component.tsx
    const html = await renderToString(
      createElement(Image, {
        alt: 'remote styled',
        src: 'https://images.unsplash.com/photo-style',
        width: 400,
        height: 300,
        style: {
          borderRadius: '12px',
          objectPosition: 'left center',
          transform: 'scale(0.9)',
        },
      }),
    )

    expect(html).toMatch(/border-radius:\s*12px/)
    expect(html).toMatch(/object-position:\s*left center/)
    expect(html).toMatch(/transform:\s*scale\(0\.9\)/)
  })
})
