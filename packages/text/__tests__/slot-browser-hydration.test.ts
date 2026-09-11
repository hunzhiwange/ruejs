// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { compileNodePlan } from '../../runtime/__tests__/node-plan-test-utils'
import { renderRuePayloadToReadableStream } from '@rue-js/rsc/core/payload'
import { createClientReference } from '@rue-js/rsc/core/rsc'
import { AppElementsWire } from '../src/server/app-elements.js'
import { decodeBrowserRscReadableStream } from '../src/server/app-rsc-browser-payload-protocol.js'

const source = `import {useState} from '@rue-js/rue';export const Button=props=>{const [liked,setLiked]=useState(false);const [likes,setLikes]=useState(props.initialLikes??12);return <button className={liked?'like-button liked':'like-button'} onClick={()=>{const next=!liked;setLiked(next);setLikes(previous=>previous+(next?1:-1))}}>{liked?'Liked':'Like'} · {likes}</button>}`
const roots: Array<{ unmount(): void }> = []
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

async function fixture() {
  const browser = compileNodePlan(
    `${source};export {hydrateServerFrame} from '@rue-js/runtime/internal/hydrate'`,
    'hydrate',
  )
  const server = compileNodePlan(
    `import {createClientReference} from '@rue-js/rsc/core/rsc';const Button=createClientReference(null,'button','Button');export {Button as ServerButton} from './button.js';export {renderServerFrame} from '@rue-js/runtime/internal/ssr';export const View=()=> <main><h1>Server slot</h1><Button initialLikes={16}/></main>`,
    'server',
    false,
    { './button.js': source },
  )
  const frame = await server.renderServerFrame(server.View, { resolve: () => server.ServerButton })
  const clientRequire = vi.fn(() => ({ Button: browser.Button }))
  vi.stubGlobal('__rue_rsc_client_require__', clientRequire)
  const routeId = AppElementsWire.encodeRouteId('/client', null)
  const decoded = await decodeBrowserRscReadableStream<Record<string, any>>(
    renderRuePayloadToReadableStream({
      [AppElementsWire.keys.route]: routeId,
      [AppElementsWire.keys.rootLayout]: '/',
      [AppElementsWire.keys.layoutIds]: [AppElementsWire.encodeLayoutId('/')],
      [routeId]: frame,
      fallback: createClientReference(null, 'button', 'Button'),
    }),
  )
  return { browser, frame: decoded[routeId], decoded, routeId, clientRequire }
}
async function attach(container: Element, value: Awaited<ReturnType<typeof fixture>>) {
  const handle = await value.browser.hydrateServerFrame(
    container,
    value.frame,
    async (key: string, name: string) =>
      (await (globalThis as any).__rue_rsc_client_require__(key))[name],
  )
  roots.push(handle)
  return handle
}

describe('compiled slot browser hydration', () => {
  it('mounts an interactive compiled component directly', async () => {
    const browser = compileNodePlan(source, 'hydrate')
    const container = document.createElement('div')
    const handle = browser.mountClaimRoot(container, browser.Button, {
      props: { initialLikes: 12 },
    })
    roots.push(handle)
    await handle.ready
    const button = container.querySelector('button')!
    button.click()
    await expect.poll(() => button.textContent).toBe('Liked · 13')
  })
  it('resolves transport references to interactive compiled factories', async () => {
    const value = await fixture()
    const container = document.createElement('div')
    container.innerHTML = value.frame.html
    await attach(container, value)
    const button = container.querySelector('button')!
    button.click()
    await expect.poll(() => button.textContent).toBe('Liked · 17')
    expect(value.clientRequire).toHaveBeenCalledWith('button')
    expect(value.decoded.fallback).toBe(value.browser.Button)
  })
  it('selects the compiled route frame from BrowserRoot state metadata', async () => {
    const value = await fixture()
    const elements = AppElementsWire.decode(value.decoded)
    const state = { elements, routeId: AppElementsWire.readMetadata(elements).routeId }
    expect(state.routeId).toBe(value.routeId)
    const container = document.createElement('div')
    container.innerHTML = (state.elements[state.routeId!] as any).html
    await attach(container, value)
    expect(container.querySelector('h1')?.textContent).toBe('Server slot')
  })
  it('retains resolved reference identity while storing decoded frame data', async () => {
    const value = await fixture()
    const stateRef = { current: value.decoded }
    expect(stateRef.current.fallback).toBe(value.browser.Button)
    const container = document.createElement('div')
    container.innerHTML = stateRef.current[value.routeId].html
    await attach(container, value)
    const button = container.querySelector('button')!
    button.click()
    await expect.poll(() => button.className).toBe('like-button liked')
  })
  it('claims existing SSR markup without replacing the heading or button', async () => {
    const value = await fixture()
    const container = document.createElement('div')
    container.innerHTML = value.frame.html
    const button = container.querySelector('button'),
      heading = container.querySelector('h1')
    await attach(container, value)
    expect(container.querySelector('button')).toBe(button)
    expect(container.querySelector('h1')).toBe(heading)
  })
  it('claims a server fragment in document.body and disposes it cleanly', async () => {
    const value = await fixture()
    document.body.innerHTML = value.frame.html
    const root = await attach(document.body, value)
    const button = document.querySelector('button')!
    button.click()
    await expect.poll(() => button.textContent).toBe('Liked · 17')
    root.unmount()
    expect(document.body.childNodes.length).toBe(0)
  })
})
