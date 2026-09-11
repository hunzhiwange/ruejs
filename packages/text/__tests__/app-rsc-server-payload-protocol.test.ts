import { describe, expect, it, vi } from 'vite-plus/test'
import {
  decodeRuePayloadReadableStream,
  renderRuePayloadToReadableStream,
} from '@rue-js/rsc/core/payload'
import {
  createAppServerPayloadProtocol,
  createLazyAppServerPayloadProtocol,
} from '../src/server/app-rsc-server-payload-protocol-core.js'

function createTestStream(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.close()
    },
  })
}

describe('App server payload protocol', () => {
  it('renders through an injectable server payload renderer', () => {
    const stream = createTestStream()
    const model = { route: '/' }
    const options = { onError: vi.fn() }
    const renderToReadableStream = vi.fn(() => stream)
    const protocol = createAppServerPayloadProtocol(renderToReadableStream)

    expect(protocol.renderToReadableStream(model, options)).toBe(stream)
    expect(renderToReadableStream).toHaveBeenCalledWith(model, options)
  })

  it('renders through an injectable lazy server payload protocol loader', async () => {
    const stream = createTestStream()
    const model = { route: '/lazy' }
    const options = { onError: vi.fn() }
    const renderToReadableStream = vi.fn(() => stream)
    const load = vi.fn(async () => createAppServerPayloadProtocol(renderToReadableStream))
    const protocol = createLazyAppServerPayloadProtocol({ load })

    await expect(
      protocol.renderToReadableStream(model, options).getReader().read(),
    ).resolves.toEqual({
      done: true,
      value: undefined,
    })
    expect(load).toHaveBeenCalledTimes(1)
    expect(renderToReadableStream).toHaveBeenCalledWith(model, options)
  })

  it('fails with an explicit replacement message when no protocol is available', async () => {
    const protocol = createLazyAppServerPayloadProtocol({
      load: vi.fn(async () => null),
    })

    await expect(protocol.renderToReadableStream({}).getReader().read()).rejects.toThrow(
      'Rue-native renderToReadableStream implementation',
    )
  })

  it('round-trips a compiled frame through the payload codec', async () => {
    const frame = { version: 1, html: '<h1 id="title">Hello Rue</h1>', references: [] }
    const protocol = createAppServerPayloadProtocol(renderRuePayloadToReadableStream)
    const decoded = await decodeRuePayloadReadableStream(
      protocol.renderToReadableStream({ 'route:/': frame }),
    )
    expect(decoded).toEqual({ 'route:/': frame })
  })
})
