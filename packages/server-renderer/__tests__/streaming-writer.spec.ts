import { expect, it } from 'vitest'
import { compileNodePlan } from '../../runtime/__tests__/node-plan-test-utils'

it('streams compiled shell before an async child and keeps the string marker grammar', async () => {
  const server = compileNodePlan(
    `
    export {renderToReadableStream} from '@rue-js/runtime/server';
    export let release;
    const pending = new Promise(resolve => { release = resolve });
    const Child = async () => { await pending; return <p>ready</p> };
    export const View = () => <main><header>shell</header><Child/></main>;
  `,
    'server',
  )
  let stream: ReadableStream<Uint8Array> | undefined
  const pending = server
    .renderToReadableStream(server.View)
    .then((value: ReadableStream<Uint8Array>) => {
      stream = value
    })
  await new Promise(resolve => setTimeout(resolve, 20))
  try {
    expect(stream, 'the response must be available while Child is pending').toBeDefined()
  } finally {
    // A failing baseline must not strand the asynchronous component.
    if (!stream) server.release()
  }
  await pending
  const reader = stream!.getReader()
  const first = await reader.read()
  expect(first.done).toBe(false)
  server.release()
  const decoder = new TextDecoder()
  let html = decoder.decode(first.value)
  for (;;) {
    const part = await reader.read()
    if (part.done) break
    html += decoder.decode(part.value)
  }
  expect(html).toBe(await server.renderToString(server.View))
  expect(html).toContain('shell')
  expect(html).toContain('ready')
})

it('reports late writer errors through the reader and allReady', async () => {
  const server = compileNodePlan(
    `
    export {renderToReadableStream} from '@rue-js/runtime/server';
    const Child = async () => { throw new Error('late failure'); return <p/> };
    export const View = () => <main><Child/></main>;
  `,
    'server',
  )
  const stream = await server.renderToReadableStream(server.View)
  await expect(new Response(stream).text()).rejects.toThrow('late failure')
  await expect(stream.allReady).rejects.toThrow('late failure')
})

it('cancels a pending compiled render and releases its request context', async () => {
  const server = compileNodePlan(
    `
    import {createContext} from '@rue-js/rue';
    export {renderToReadableStream} from '@rue-js/runtime/server';
    export const Context=createContext('none');
    export let release;
    const gate=new Promise(resolve=>{release=resolve});
    const Child=async()=>{await gate;return <p>late</p>};
    export const View=()=> <Context.Provider value="request"><Child/></Context.Provider>;
  `,
    'server',
  )
  const stream = await server.renderToReadableStream(server.View)
  const reader = stream.getReader()
  await reader.read()
  await expect.poll(() => server.Context.values.size).toBe(1)
  await reader.cancel('gone')
  expect(server.Context.values.size).toBe(0)
  await expect(stream.allReady).rejects.toBe('gone')
  server.release()
  await expect(reader.read()).resolves.toEqual({ done: true, value: undefined })
})

it('streams a server frame before completion and executes its component only once', async () => {
  const server = compileNodePlan(
    `
    export {renderServerFrameStream} from '@rue-js/runtime/internal/ssr';
    export let executions = 0;
    export let release;
    const pending = new Promise(resolve => { release = resolve });
    const Child = async () => { await pending; return <p>ready</p> };
    export const View = () => { executions++; return <main><header>shell</header><Child/></main> };
  `,
    'server',
  )
  const result = await server.renderServerFrameStream(server.View, {
    resolve: () => {
      throw new Error('unexpected client reference')
    },
  })
  const reader = result.stream.getReader()
  const first = await reader.read()
  expect(first.done).toBe(false)
  expect(server.executions).toBe(1)
  server.release()
  const decoder = new TextDecoder()
  let html = decoder.decode(first.value)
  for (;;) {
    const part = await reader.read()
    if (part.done) break
    html += decoder.decode(part.value)
  }
  expect(await result.frame).toEqual({ version: 1, html, references: [] })
  expect(html).toContain('ready')
  expect(server.executions).toBe(1)
})

it('streams a Suspense fallback while keeping the final hydration snapshot free of resume scripts', async () => {
  const server = compileNodePlan(
    `import {Suspense} from '@rue-js/rue';export {renderToReadableStream} from '@rue-js/runtime/server';export let release;const pending=new Promise(resolve=>{release=resolve});const Child=async()=>{await pending;return <p>resolved child</p>};export const View=()=> <main><Suspense fallback={<p>loading child</p>}><Child/></Suspense></main>`,
    'server',
  )
  const stream = await server.renderToReadableStream(server.View, { nonce: 'test-nonce' })
  const reader = stream.getReader(),
    decoder = new TextDecoder()
  let wire = ''
  try {
    while (!wire.includes('loading child')) {
      const item = await reader.read()
      expect(item.done).toBe(false)
      wire += decoder.decode(item.value, { stream: true })
    }
    expect(wire).not.toContain('resolved child')
  } finally {
    server.release()
  }
  for (;;) {
    const item = await reader.read()
    if (item.done) break
    wire += decoder.decode(item.value, { stream: true })
  }
  expect(wire).toContain('data-rue-resume=')
  expect(wire).toContain('nonce="test-nonce"')
  const html = await stream.html
  expect(html).toContain('resolved child')
  expect(html).not.toContain('loading child')
  expect(html).not.toContain('data-rue-resume')
  expect(html).not.toContain('<script')
})
