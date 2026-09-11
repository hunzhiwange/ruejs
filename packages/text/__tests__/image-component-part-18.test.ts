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

describe('dangerouslyAllowLocalIP private-IP guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    delete process.env.__TEXT_IMAGE_REMOTE_PATTERNS
    delete process.env.__TEXT_IMAGE_DOMAINS
    delete process.env.__TEXT_IMAGE_DANGEROUSLY_ALLOW_LOCAL_IP
  })

  it('warns but does not block private-IP remote URLs in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    process.env.__TEXT_IMAGE_REMOTE_PATTERNS = JSON.stringify([{ hostname: '**' }])
    process.env.__TEXT_IMAGE_DANGEROUSLY_ALLOW_LOCAL_IP = 'false'

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Module-level constants in image.tsx are evaluated at import time from
    // process.env, so we must re-evaluate the module after changing env.
    vi.resetModules()
    const { default: PrivateIpImage } = await import('../src/shims/image.js?text-ssr')

    const html = await renderToString(
      createElement(PrivateIpImage, {
        alt: 'private ip dev',
        src: 'http://172.16.0.1/photo.jpg',
        width: 400,
        height: 300,
      }),
    )
    // Dev: warn but still render
    expect(html).toContain('<img')
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('resolved to private IP'))

    warnSpy.mockRestore()
  })
})
