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
import { describe, it, expect } from 'vite-plus/test'
import { createElement, renderToString } from './rue-ssr-test-utils.js'
import Image from '../src/shims/image.js?text-ssr'

// ─── Issue #1513 reproduction ───────────────────────────────────────────
//
// The default loader must emit URLs starting with /_text/image. This guards
// against regression of https://github.com/cloudflare/vinext/issues/1513.

describe('default loader emits /_text/image URLs (issue #1513)', () => {
  it('imageOptimizationUrl uses /_text/image prefix', async () => {
    const { imageOptimizationUrl } = await import('../src/shims/image.js?text-ssr')
    const url = imageOptimizationUrl('/photo.png', 828, 85)
    expect(url.startsWith('/_text/image?')).toBe(true)
    expect(url).toContain('url=%2Fphoto.png')
    expect(url).toContain('w=828')
    expect(url).toContain('q=85')
  })

  it('Image SSR src starts with /_text/image', async () => {
    const html = await renderToString(
      createElement(Image, {
        alt: 'test',
        src: '/test.png',
        width: 100,
        height: 100,
      }),
    )
    expect(html).toMatch(/src="\/_text\/image\?/)
  })
})
