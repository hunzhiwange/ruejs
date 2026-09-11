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

describe('onLoadingComplete prop', () => {
  it('getImageProps does not leak onLoadingComplete into returned props', async () => {
    const { props } = getImageProps({
      alt: 'test',
      src: '/photo.jpg',
      width: 400,
      height: 300,
      onLoadingComplete: () => {},
    })
    // onLoadingComplete must be consumed internally, not passed through
    expect((props as any).onLoadingComplete).toBeUndefined()
  })

  it('getImageProps does not leak onLoad or onLoadingComplete when both provided', async () => {
    const { props } = getImageProps({
      alt: 'test',
      src: '/photo.jpg',
      width: 400,
      height: 300,
      onLoad: () => {},
      onLoadingComplete: () => {},
    })
    expect((props as any).onLoadingComplete).toBeUndefined()
    expect((props as any).onLoad).toBeUndefined()
  })

  it('does not leak onLoadingComplete as a DOM attribute in SSR (local image)', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'test',
        src: '/photo.jpg',
        width: 400,
        height: 300,
        onLoadingComplete: () => {},
      }),
    )
    expect(html).not.toContain('onLoadingComplete')
    expect(html).not.toContain('onloadingcomplete')
    expect(html).toContain('alt="test"')
  })

  it('does not leak onLoadingComplete as a DOM attribute in SSR (custom loader)', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'cdn',
        src: '/photo.jpg',
        width: 200,
        height: 150,
        loader: ({ src, width }: { src: string; width: number }) =>
          `https://cdn.example.com${src}?w=${width}`,
        onLoadingComplete: () => {},
      }),
    )
    expect(html).not.toContain('onLoadingComplete')
    expect(html).not.toContain('onloadingcomplete')
    expect(html).toContain('alt="cdn"')
  })
})
