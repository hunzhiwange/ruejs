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
  it('returns correct props for basic image', async () => {
    const { props } = getImageProps({
      alt: 'a nice desc',
      src: '/test.png',
      width: 100,
      height: 200,
    })

    expect(props.alt).toBe('a nice desc')
    expect(props.src).toBe(optUrl('/test.png', 100))
    expect(props.width).toBe(100)
    expect(props.height).toBe(200)
    expect(props.loading).toBe('lazy')
    expect(props.decoding).toBe('async')
    expect((props as any)['data-nimg']).toBe('1')
  })

  it('returns priority props', async () => {
    const { props } = getImageProps({
      alt: 'priority',
      src: '/hero.png',
      width: 800,
      height: 600,
      priority: true,
    })

    expect(props.loading).toBe('eager')
    expect(props.fetchPriority).toBe('high')
  })

  it('returns fill mode props', async () => {
    const { props } = getImageProps({
      alt: 'fill',
      src: '/bg.png',
      fill: true,
    })

    expect(props.width).toBeUndefined()
    expect(props.height).toBeUndefined()
    expect(props.sizes).toBe('100vw')
    expect((props as any)['data-nimg']).toBe('fill')
    expect((props.style as any)?.position).toBe('absolute')
    expect((props.style as any)?.width).toBe('100%')
    expect((props.style as any)?.height).toBe('100%')
  })

  it('returns custom loader URL', async () => {
    const loader = ({ src, width }: { src: string; width: number }) =>
      `https://cdn.example.com${src}?w=${width}`

    const { props } = getImageProps({
      alt: 'cdn',
      src: '/photo.jpg',
      width: 300,
      height: 200,
      loader,
    })

    expect(props.src).toBe('https://cdn.example.com/photo.jpg?w=300')
  })
})
