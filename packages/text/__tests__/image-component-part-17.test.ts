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

  it('blocks private-IP remote URLs in production (Image returns null)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.__TEXT_IMAGE_REMOTE_PATTERNS = JSON.stringify([{ hostname: '**' }])
    process.env.__TEXT_IMAGE_DANGEROUSLY_ALLOW_LOCAL_IP = 'false'

    // Module-level constants in image.tsx are evaluated at import time from
    // process.env, so we must re-evaluate the module after changing env.
    vi.resetModules()
    const { default: PrivateIpImage } = await import('../src/shims/image.js?text-ssr')

    const html = await renderToString(
      createElement(PrivateIpImage, {
        alt: 'private ip',
        src: 'http://127.0.0.1/photo.jpg',
        width: 400,
        height: 300,
      }),
    )
    // Production: blocked → no img tag rendered
    expect(html).not.toContain('<img')
  })

  it('blocks private-IP remote URLs in production (getImageProps returns empty src)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.__TEXT_IMAGE_REMOTE_PATTERNS = JSON.stringify([{ hostname: '**' }])
    process.env.__TEXT_IMAGE_DANGEROUSLY_ALLOW_LOCAL_IP = 'false'

    vi.resetModules()
    const { getImageProps: privateIpGetImageProps } = await import('../src/shims/image.js?text-ssr')

    const { props } = privateIpGetImageProps({
      alt: 'private ip',
      src: 'http://192.168.1.1/photo.jpg',
      width: 400,
      height: 300,
    })
    expect(props.src).toBe('')
  })

  it('allows private-IP remote URLs when dangerouslyAllowLocalIP = true', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.__TEXT_IMAGE_REMOTE_PATTERNS = JSON.stringify([{ hostname: '**' }])
    process.env.__TEXT_IMAGE_DANGEROUSLY_ALLOW_LOCAL_IP = 'true'

    // Module-level constants in image.tsx are evaluated at import time from
    // process.env, so we must re-evaluate the module after changing env.
    vi.resetModules()
    const { default: PrivateIpImage } = await import('../src/shims/image.js?text-ssr')

    const html = await renderToString(
      createElement(PrivateIpImage, {
        alt: 'private ip allowed',
        src: 'http://10.0.0.1/photo.jpg',
        width: 400,
        height: 300,
      }),
    )
    expect(html).toContain('<img')
    expect(html).toContain('alt="private ip allowed"')
  })

  it('allows public-IP remote URLs regardless of dangerouslyAllowLocalIP', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.__TEXT_IMAGE_REMOTE_PATTERNS = JSON.stringify([{ hostname: '**' }])
    process.env.__TEXT_IMAGE_DANGEROUSLY_ALLOW_LOCAL_IP = 'false'

    // Module-level constants in image.tsx are evaluated at import time from
    // process.env, so we must re-evaluate the module after changing env.
    vi.resetModules()
    const { default: PrivateIpImage } = await import('../src/shims/image.js?text-ssr')

    const html = await renderToString(
      createElement(PrivateIpImage, {
        alt: 'public ip',
        src: 'http://8.8.8.8/photo.jpg',
        width: 400,
        height: 300,
      }),
    )
    expect(html).toContain('<img')
    expect(html).toContain('alt="public ip"')
  })
})
