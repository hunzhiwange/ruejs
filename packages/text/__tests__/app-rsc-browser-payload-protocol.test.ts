import { describe, expect, it, vi } from 'vite-plus/test'
import { renderRuePayloadToReadableStream } from '@rue-js/rsc/core/payload'
import { AppRscServerClientReferenceSymbol } from '../src/server/app-rsc-client-reference-protocol-core.js'
import { appBrowserPayloadProtocol } from '../src/server/app-rsc-browser-payload-protocol.js'
import { createAppBrowserPayloadProtocol } from '../src/server/app-rsc-browser-payload-protocol-core.js'

function createTestStream(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.close()
    },
  })
}

describe('App browser payload protocol', () => {
  it('decodes fetch payloads through an injectable protocol loader', async () => {
    const response = Promise.resolve(new Response('payload'))
    const payload = { 'page:/': 'home' }
    const options = { references: {} }
    const decodeFetch = vi.fn(async (input: Promise<Response>, decodeOptions: object) => {
      expect(input).toBe(response)
      expect(decodeOptions).toBe(options)
      return payload
    })
    const load = vi.fn(async () => ({
      decodeFetch,
      decodeReadableStream: vi.fn(),
    }))

    const protocol = createAppBrowserPayloadProtocol({ load })

    await expect(protocol.decodeFetch(response, options)).resolves.toBe(payload)
    expect(load).toHaveBeenCalledTimes(1)
    expect(decodeFetch).toHaveBeenCalledTimes(1)
  })

  it('decodes readable streams through an injectable protocol loader', async () => {
    const stream = createTestStream()
    const payload = { 'page:/': 'streamed' }
    const decodeReadableStream = vi.fn(async (input: ReadableStream<Uint8Array>) => {
      expect(input).toBe(stream)
      return payload
    })
    const load = vi.fn(async () => ({
      decodeFetch: vi.fn(),
      decodeReadableStream,
    }))

    const protocol = createAppBrowserPayloadProtocol({ load })

    await expect(protocol.decodeReadableStream(stream)).resolves.toBe(payload)
    expect(load).toHaveBeenCalledTimes(1)
    expect(decodeReadableStream).toHaveBeenCalledTimes(1)
  })

  it('fails with an explicit replacement message when no protocol is available', async () => {
    const protocol = createAppBrowserPayloadProtocol({
      load: vi.fn(async () => null),
    })

    await expect(protocol.decodeFetch(Promise.resolve(new Response('payload')))).rejects.toThrow(
      'provide a Rue-native browser decode implementation',
    )
  })

  it('decodes Rue payload frames and resolves explicitly tagged module references', async () => {
    const globalState = globalThis as typeof globalThis & {
      __rue_rsc_client_require__?: (id: string) => Promise<Record<string, unknown>>
    }
    const previousRequire = globalState.__rue_rsc_client_require__
    const clientComponent = () => () => {}
    globalState.__rue_rsc_client_require__ = vi.fn(async id => {
      expect(id).toBe('/src/client-widget.tsx')
      return { default: clientComponent }
    })

    try {
      const clientReference = {
        $$typeof: AppRscServerClientReferenceSymbol,
        $$id: '/src/client-widget.tsx#default',
        $$referenceKey: '/src/client-widget.tsx',
        $$exportName: 'default',
      }
      const response = Promise.resolve(
        new Response(
          renderRuePayloadToReadableStream({
            reference: clientReference,
            frame: { version: 1, html: '<p>server</p>', references: [] },
          }),
        ),
      )

      const decoded = await appBrowserPayloadProtocol.decodeFetch<Record<string, unknown>>(response)
      expect(decoded.reference).toBe(clientComponent)
      expect(decoded.frame).toEqual({ version: 1, html: '<p>server</p>', references: [] })
      expect(globalState.__rue_rsc_client_require__).toHaveBeenCalledTimes(1)
    } finally {
      if (previousRequire) {
        globalState.__rue_rsc_client_require__ = previousRequire
      } else {
        delete globalState.__rue_rsc_client_require__
      }
    }
  })
})
