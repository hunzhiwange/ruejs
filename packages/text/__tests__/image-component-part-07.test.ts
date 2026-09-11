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

describe('getImageProps', () => {
  it('returns blur placeholder styles', async () => {
    const { props } = getImageProps({
      alt: 'blur',
      src: '/photo.jpg',
      width: 400,
      height: 300,
      placeholder: 'blur',
      blurDataURL: 'data:image/png;base64,test',
    })

    expect((props.style as any)?.backgroundImage).toBe('url(data:image/png;base64,test)')
    expect((props.style as any)?.backgroundSize).toBe('cover')
  })

  it('merges user style with default', async () => {
    const { props } = getImageProps({
      alt: 'styled',
      src: '/test.png',
      width: 100,
      height: 100,
      style: { maxWidth: '100%', height: 'auto' },
    })

    expect((props.style as any)?.maxWidth).toBe('100%')
    expect((props.style as any)?.height).toBe('auto')
  })

  it('passes through arbitrary props', async () => {
    const { props } = getImageProps({
      alt: 'test',
      src: '/test.png',
      width: 100,
      height: 100,
      id: 'my-image',
    } as any)

    expect(props.id).toBe('my-image')
  })

  it('handles StaticImageData', async () => {
    const staticImage: StaticImageData = {
      src: '/static/photo.png',
      width: 1920,
      height: 1080,
    }

    const { props } = getImageProps({
      alt: 'static',
      src: staticImage,
    })

    expect(props.src).toBe(optUrl('/static/photo.png', 1920))
    expect(props.width).toBe(1920)
    expect(props.height).toBe(1080)
  })
})
