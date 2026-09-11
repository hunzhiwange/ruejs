import { describe, expect, it, vi } from 'vite-plus/test'
import { compileNodePlan } from '../../runtime/__tests__/node-plan-test-utils'
import { AppElementsWire, type AppWireElements } from '../src/server/app-elements.js'
import {
  createAppSsrPayloadReader,
  resolveAppSsrPayloadElements,
  createAppSsrWirePayloadDecoder,
  renderAppSsrWirePayloadToReadableStream,
} from '../src/server/app-ssr-payload-reader.js'
import { APP_SSR_INLINE_PAYLOAD_STREAM_CANCEL_REASON } from '../src/server/app-ssr-inline-payload-protocol.js'
import { createAppServerElement } from '../src/server/app-server-tree.js'

const route = AppElementsWire.encodeRouteId('/reader', null)
function payload(value: unknown): AppWireElements {
  return {
    [AppElementsWire.keys.interceptionContext]: null,
    [AppElementsWire.keys.rootLayout]: '/',
    [AppElementsWire.keys.route]: route,
    [route]: value,
  } as AppWireElements
}
function emptyStream() {
  return new ReadableStream<Uint8Array>()
}

async function settle<T>(read: () => T): Promise<T> {
  try {
    return read()
  } catch (pending) {
    if (!(pending instanceof Promise)) throw pending
    await pending
    return read()
  }
}

describe('App SSR payload reader', () => {
  it('reads synchronous in-process payloads without entering the thenable reader', async () => {
    const cancel = vi.fn()
    const readThenable = vi.fn()
    const value = payload({ version: 1, html: '<main>ready</main>', references: [] })
    const read = createAppSsrPayloadReader(new ReadableStream({ cancel }), {
      inlinePayload: value,
      readThenable,
    })
    expect(read()[route]).toBe(value[route])
    expect(read()).toBe(read())
    expect(readThenable).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(cancel).toHaveBeenCalledExactlyOnceWith(APP_SSR_INLINE_PAYLOAD_STREAM_CANCEL_REASON)
  })

  it('preserves compiled plan identity without executing or adapting the component', () => {
    const factory = vi.fn(() => {
      throw new Error('render only')
    })
    const plan = createAppServerElement(factory)
    const read = createAppSsrPayloadReader(emptyStream(), { inlinePayload: payload(plan) })
    expect(read()[route]).toBe(plan)
    expect(factory).not.toHaveBeenCalled()
  })

  it('does not prime inactive entries while decoding a route', () => {
    const active = vi.fn(),
      inactive = vi.fn()
    const value = {
      ...payload(createAppServerElement(active as never)),
      [AppElementsWire.encodePageId('/inactive', null)]: createAppServerElement(inactive as never),
    }
    const read = createAppSsrPayloadReader(emptyStream(), { inlinePayload: value })
    read()
    expect(active).not.toHaveBeenCalled()
    expect(inactive).not.toHaveBeenCalled()
  })

  it('retains nested frame references and server slots as transport data', () => {
    const nested = {
      id: '1',
      referenceKey: 'counter',
      exportName: 'Counter',
      props: { initial: 2 },
    }
    const frame = {
      version: 1,
      html: '<!--r:b:rsc:0--><!--/r:b:rsc:0-->',
      references: [
        {
          id: '0',
          referenceKey: 'wrapper',
          exportName: 'Wrapper',
          props: {},
          children: { version: 1, html: '<p>slot</p>', references: [nested] },
        },
      ],
    }
    const read = createAppSsrPayloadReader(emptyStream(), { inlinePayload: payload(frame) })
    expect(read()[route]).toBe(frame)
    expect(frame.references[0]!.children.references[0]).toBe(nested)
  })

  it('resolves asynchronous inline payloads through the thenable reader', async () => {
    const value = payload('async data')
    const read = createAppSsrPayloadReader(emptyStream(), { inlinePayload: Promise.resolve(value) })
    expect((await settle(read))[route]).toBe('async data')
    expect(read()[route]).toBe('async data')
  })

  it('surfaces asynchronous decode errors on read', async () => {
    const failure = new Error('decode failed')
    const read = createAppSsrPayloadReader(emptyStream(), {
      decodePayload: () => Promise.reject(failure),
    })
    await expect(settle(read)).rejects.toBe(failure)
    expect(read).toThrow(failure)
  })

  it('invokes an explicit stream decoder only once across repeated reads', async () => {
    const stream = emptyStream()
    const decodePayload = vi.fn(async () => payload('decoded'))
    const read = createAppSsrPayloadReader(stream, { decodePayload })
    expect((await settle(read))[route]).toBe('decoded')
    read()
    expect(decodePayload).toHaveBeenCalledExactlyOnceWith(stream)
  })

  it('prefers an inline payload over an explicit stream decoder', () => {
    const decodePayload = vi.fn()
    const read = createAppSsrPayloadReader(emptyStream(), {
      inlinePayload: payload('inline'),
      decodePayload,
    })
    expect(read()[route]).toBe('inline')
    expect(decodePayload).not.toHaveBeenCalled()
  })

  it('round-trips actual compiled HTML through the wire decoder', async () => {
    const server = compileNodePlan(
      `const Layout=props=><main>{props.children}</main>;export const View=()=> <Layout><h1>Compiled page</h1></Layout>`,
      'server',
    )
    const html = await server.renderToString(server.View)
    const frame = { version: 1, html, references: [] }
    const result = await resolveAppSsrPayloadElements(
      renderAppSsrWirePayloadToReadableStream(payload(frame)),
      { decodePayload: createAppSsrWirePayloadDecoder() },
    )
    expect(result[route]).toEqual(frame)
    expect(html).toContain('Compiled page')
    expect(html).toContain('<!--r:b:')
  })

  it('rejects a missing payload source without choosing another renderer', () => {
    expect(() => createAppSsrPayloadReader(emptyStream())).toThrow('Pass inlinePayload')
  })
})
