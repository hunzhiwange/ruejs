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

describe('blurDataURL CSS injection prevention', () => {
  it('accepts valid base64 blurDataURL', async () => {
    const { props } = getImageProps({
      alt: 'valid',
      src: '/photo.jpg',
      width: 400,
      height: 300,
      placeholder: 'blur',
      blurDataURL:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    })

    expect((props.style as any)?.backgroundImage).toContain('data:image/png;base64,')
  })

  it('sanitizes blurDataURL in SSR rendering (Image component)', async () => {
    const maliciousURL = 'data:x); color: red; background: url('
    const html = await renderToString(
      createElement(Image, {
        alt: 'malicious',
        src: '/photo.jpg',
        width: 400,
        height: 300,
        placeholder: 'blur',
        blurDataURL: maliciousURL,
      }),
    )
    // Should NOT contain the malicious CSS injection
    expect(html).not.toContain('color: red')
    expect(html).not.toContain('color:red')
    // Should NOT contain any background-image at all (blur was rejected)
    expect(html).not.toContain('background-image')
  })

  it('renders valid blurDataURL in SSR', async () => {
    const validURL = 'data:image/png;base64,abc123'
    const html = await renderToString(
      createElement(Image, {
        alt: 'valid blur',
        src: '/photo.jpg',
        width: 400,
        height: 300,
        placeholder: 'blur',
        blurDataURL: validURL,
      }),
    )
    expect(html).toContain('background-image')
    expect(html).toContain(validURL)
  })
})
