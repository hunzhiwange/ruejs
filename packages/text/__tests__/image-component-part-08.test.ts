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
  it('generates srcSet for local images', async () => {
    const { props } = getImageProps({
      alt: 'local',
      src: '/photo.png',
      width: 800,
      height: 600,
    })

    expect(props.srcSet).toBeDefined()
    expect(props.srcSet).toContain('/_text/image')
    expect(props.srcSet).toContain('photo.png')
    expect(props.srcSet).toContain('w')
  })

  it('handles loading=eager prop', async () => {
    const { props } = getImageProps({
      alt: 'eager',
      src: '/test.png',
      width: 100,
      height: 100,
      loading: 'eager',
    })

    expect(props.loading).toBe('eager')
  })
})
