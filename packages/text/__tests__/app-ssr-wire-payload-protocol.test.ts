import { describe, expect, it } from 'vite-plus/test'
import {
  AppElementsWire,
  UNMATCHED_SLOT,
  type AppWireElements,
} from '../src/server/app-elements.js'
import { createAppServerElement } from '../src/server/app-server-tree.js'
import {
  APP_SSR_WIRE_PAYLOAD_CONTENT_TYPE,
  createAppSsrWirePayloadDecoder,
  decodeAppSsrWirePayloadStream,
  encodeAppSsrWirePayload,
  renderAppSsrWirePayloadToReadableStream,
} from '../src/server/app-ssr-wire-payload-protocol.js'

const encoder = new TextEncoder()

function streamFromText(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text))
      controller.close()
    },
  })
}

describe('App SSR wire payload protocol', () => {
  it('round-trips a JSON App wire payload without plugin-rsc/ssr', async () => {
    const slotId = AppElementsWire.encodeSlotId('modal', '/')
    const payload: AppWireElements = {
      [AppElementsWire.keys.interceptionContext]: null,
      [AppElementsWire.keys.layoutFlags]: {
        [AppElementsWire.encodeLayoutId('/')]: 's',
      },
      [AppElementsWire.keys.layoutIds]: [AppElementsWire.encodeLayoutId('/')],
      [AppElementsWire.keys.rootLayout]: '/',
      [AppElementsWire.keys.route]: AppElementsWire.encodeRouteId('/', null),
      [AppElementsWire.encodePageId('/', null)]: '<main>home</main>',
      [slotId]: AppElementsWire.unmatchedSlotValue,
    }

    const stream = renderAppSsrWirePayloadToReadableStream(payload)
    const decoded = await decodeAppSsrWirePayloadStream(stream)

    expect(APP_SSR_WIRE_PAYLOAD_CONTENT_TYPE).toContain('app-wire+json')
    expect(decoded).toEqual(payload)
    expect(AppElementsWire.decode(decoded)[slotId]).toBe(UNMATCHED_SLOT)
  })

  it('exposes a decoder compatible with the App SSR payload reader contract', async () => {
    const payload: AppWireElements = {
      [AppElementsWire.keys.interceptionContext]: null,
      [AppElementsWire.keys.rootLayout]: '/',
      [AppElementsWire.keys.route]: AppElementsWire.encodeRouteId('/wire', null),
      [AppElementsWire.encodePageId('/wire', null)]: 'wire page',
    }
    const decoder = createAppSsrWirePayloadDecoder()

    await expect(decoder(renderAppSsrWirePayloadToReadableStream(payload))).resolves.toEqual(
      payload,
    )
  })

  it('rejects non-JSON renderables instead of silently losing protocol data', () => {
    const payload = {
      [AppElementsWire.keys.interceptionContext]: null,
      [AppElementsWire.keys.rootLayout]: '/',
      [AppElementsWire.keys.route]: AppElementsWire.encodeRouteId('/', null),
      [AppElementsWire.encodePageId('/', null)]: createAppServerElement(() => () => {}),
    } as unknown as AppWireElements

    expect(() => encodeAppSsrWirePayload(payload)).toThrow('function values are not supported')
  })

  it('rejects invalid JSON streams with a protocol-specific error', async () => {
    await expect(decodeAppSsrWirePayloadStream(streamFromText('{'))).rejects.toThrow(
      'App SSR wire payload must be valid JSON',
    )
  })
})
