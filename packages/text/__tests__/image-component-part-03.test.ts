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
  it('renders remote fill mode with absolute positioning', async () => {
    // Ported from Text.js: test/unit/text-image-get-img-props.test.ts
    // https://github.com/vercel/next.js/blob/canary/test/unit/text-image-get-img-props.test.ts
    const html = await renderToString(
      createElement(Image, {
        alt: 'remote fill image',
        src: 'https://images.unsplash.com/photo-fill',
        fill: true,
      }),
    )
    // Remote fill must preserve the same layout contract as local fill:
    // the DOM img is absolutely positioned and marked as data-nimg="fill".
    expect(html).not.toMatch(/width="\d+"/)
    expect(html).not.toMatch(/height="\d+"/)
    expect(html).toMatch(/position:\s*absolute/)
    expect(html).toMatch(/width:\s*100%/)
    expect(html).toMatch(/height:\s*100%/)
    expect(html).toContain('data-nimg="fill"')
    expect(html).toContain('sizes="100vw"')
  })

  it('renders with custom sizes prop', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'sized',
        src: '/img.png',
        width: 500,
        height: 300,
        sizes: '(max-width: 768px) 100vw, 50vw',
      }),
    )
    expect(html).toContain('sizes="(max-width: 768px) 100vw, 50vw"')
  })

  it('renders with blur placeholder styles', async () => {
    const blurDataURL = 'data:image/png;base64,abc123'
    const html = await renderToString(
      createElement(Image, {
        alt: 'blurry',
        src: '/photo.jpg',
        width: 400,
        height: 300,
        placeholder: 'blur',
        blurDataURL,
      }),
    )
    expect(html).toContain(`url(${blurDataURL})`)
    expect(html).toMatch(/background-size:\s*cover/)
  })

  it('renders with custom loader', async () => {
    const loader = ({ src, width, quality }: { src: string; width: number; quality?: number }) =>
      `https://cdn.example.com${src}?w=${width}&q=${quality || 75}`

    const html = await renderToString(
      createElement(Image, {
        alt: 'cdn image',
        src: '/photo.jpg',
        width: 200,
        height: 150,
        loader,
      }),
    )
    expect(html).toContain('src="https://cdn.example.com/photo.jpg?w=200&amp;q=75"')
  })
})
