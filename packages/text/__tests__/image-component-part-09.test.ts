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
  it('rejects blurDataURL with ) character (CSS url breakout)', async () => {
    const { props } = getImageProps({
      alt: 'malicious',
      src: '/photo.jpg',
      width: 400,
      height: 300,
      placeholder: 'blur',
      blurDataURL: 'data:x); color: red; background: url(',
    })

    // Should NOT have any backgroundImage — the malicious URL is rejected
    expect((props.style as any)?.backgroundImage).toBeUndefined()
  })

  it('rejects blurDataURL with ; character (CSS property injection)', async () => {
    const { props } = getImageProps({
      alt: 'malicious',
      src: '/photo.jpg',
      width: 400,
      height: 300,
      placeholder: 'blur',
      blurDataURL: 'data:image/png;base64,abc); color: red; x: url(',
    })

    // The ; in data:image/png;base64 is fine, but ) breaks out of url()
    expect((props.style as any)?.backgroundImage).toBeUndefined()
  })

  it('rejects blurDataURL with { character (CSS rule injection)', async () => {
    const { props } = getImageProps({
      alt: 'malicious',
      src: '/photo.jpg',
      width: 400,
      height: 300,
      placeholder: 'blur',
      blurDataURL: 'data:image/svg+xml,<svg>{</svg>',
    })

    expect((props.style as any)?.backgroundImage).toBeUndefined()
  })

  it('rejects blurDataURL that does not start with data:image/', async () => {
    const { props } = getImageProps({
      alt: 'malicious',
      src: '/photo.jpg',
      width: 400,
      height: 300,
      placeholder: 'blur',
      blurDataURL: 'javascript:alert(1)',
    })

    expect((props.style as any)?.backgroundImage).toBeUndefined()
  })
})
