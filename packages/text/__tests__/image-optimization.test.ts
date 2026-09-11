import { describe, expect, it, vi } from 'vite-plus/test'

import { handleImageOptimization, parseImageParams } from '../src/server/image-optimization.js'

describe('image optimization local path parsing', () => {
  it.each([
    ['/äöüščří.png', '/äöüščří.png'],
    ['/hello world.png', '/hello world.png'],
  ])('decodes the local image path once: %s', (imagePath, expected) => {
    const url = new URL('http://localhost/_text/image')
    url.searchParams.set('url', imagePath)
    url.searchParams.set('w', '64')
    url.searchParams.set('q', '75')

    expect(parseImageParams(url, [64])?.imageUrl).toBe(expected)
  })

  it('does not decode an already-decoded image path a second time', () => {
    const url = new URL(
      'http://localhost/_text/image?url=%2Fimages%252Fstill-encoded.png&w=64&q=75',
    )

    expect(parseImageParams(url, [64])?.imageUrl).toBe('/images%2Fstill-encoded.png')
  })

  it.each([
    'http://evil.example/image.png',
    '//evil.example/image.png',
    '/../secret.png',
    '/images/../../secret.png',
  ])('rejects unsafe local image paths: %s', imagePath => {
    const url = new URL('http://localhost/_text/image')
    url.searchParams.set('url', imagePath)
    url.searchParams.set('w', '64')

    expect(parseImageParams(url, [64])).toBeNull()
  })

  it('rejects a fetched resource with a non-image content type', async () => {
    const fetchAsset = vi.fn(
      async () =>
        new Response('<script>alert(1)</script>', {
          headers: { 'Content-Type': 'text/html' },
        }),
    )
    const url = new URL('http://localhost/_text/image')
    url.searchParams.set('url', '/safe.png')
    url.searchParams.set('w', '64')

    const response = await handleImageOptimization(new Request(url), { fetchAsset }, [64])

    expect(response.status).toBe(400)
  })
})
