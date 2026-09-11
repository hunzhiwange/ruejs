import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { createCompiledClientReference } from '@rue-js/runtime/internal/ssr'
import {
  createAppServerElement,
  isAppServerPlan,
  scopeAppServerPlan,
  startAppServerPlan,
} from '../src/server/app-server-tree.js'
import { setAppClientReferenceResolver } from '../src/server/app-client-reference-resolver.js'
import { compileServerFixture } from './rue-ssr-test-utils.js'

async function read(stream: ReadableStream<Uint8Array>) {
  return new Response(stream).text()
}
afterEach(() => setAppClientReferenceResolver(null))

describe('compiled App server plans', () => {
  it('requires compiled factories and explicitly brands composed plans', () => {
    expect(() => createAppServerElement('div' as never)).toThrow('compiled component factory')
    expect(isAppServerPlan(() => {})).toBe(false)
    expect(isAppServerPlan(createAppServerElement(() => () => {}))).toBe(true)
  })
  it('shares one execution between HTML and the transport frame', async () => {
    const module = await compileServerFixture(
      'export let calls=0;export const Page=props=>{calls++;return <main>{props.label}</main>}',
    )
    const plan = createAppServerElement(module.Page, { label: 'hello' })
    const first = startAppServerPlan(plan)
    expect(startAppServerPlan(plan)).toBe(first)
    const result = await first
    const html = await read(result.stream)
    expect((await result.frame).html).toBe(html)
    expect(html).toContain('hello')
    expect(module.calls).toBe(1)
  })
  it('composes asynchronous compiled slots without inspecting their output', async () => {
    const module = await compileServerFixture(
      'export const Layout=props=><main>{props.children}</main>;export const Page=async()=> <p>async child</p>',
    )
    const result = await startAppServerPlan(
      createAppServerElement(module.Layout, null, createAppServerElement(module.Page)),
    )
    expect(await read(result.stream)).toContain('async child')
    expect((await result.frame).references).toEqual([])
  })
  it('resolves client exports through the manifest and retains boundary data', async () => {
    const module = await compileServerFixture(
      'export const Button=props=><button>{props.label}</button>',
    )
    const resolve = vi.fn(async () => module.Button)
    setAppClientReferenceResolver(resolve)
    const reference = createCompiledClientReference('/button.tsx', 'Button')
    const result = await startAppServerPlan(
      createAppServerElement(reference, { label: 'client SSR' }),
    )
    expect(await read(result.stream)).toContain('client SSR')
    expect((await result.frame).references).toMatchObject([
      { referenceKey: '/button.tsx', exportName: 'Button', props: { label: 'client SSR' } },
    ])
    expect(resolve).toHaveBeenCalledWith('/button.tsx', 'Button')
  })
  it('keeps server children in a distinct client boundary slot frame', async () => {
    const module = await compileServerFixture(
      'export const Shell=props=><section>{props.children}</section>;export const Child=()=> <p>server child</p>',
    )
    setAppClientReferenceResolver(() => module.Shell)
    const plan = createAppServerElement(
      createCompiledClientReference('/shell.tsx', 'default'),
      null,
      createAppServerElement(module.Child),
    )
    const result = await startAppServerPlan(plan)
    await read(result.stream)
    const frame = await result.frame
    expect(frame.references[0].children?.html).toContain('server child')
    expect(frame.references[0].props).not.toHaveProperty('children')
  })
  it('uses explicit layout scope for stable client boundary identity', async () => {
    const module = await compileServerFixture('export const Button=()=> <button>state</button>')
    setAppClientReferenceResolver(() => module.Button)
    const reference = createCompiledClientReference('/button.tsx', 'default')
    const identities = []
    for (let index = 0; index < 2; index++) {
      const result = await startAppServerPlan(
        scopeAppServerPlan(createAppServerElement(reference), 'layout:/dashboard'),
      )
      await read(result.stream)
      identities.push((await result.frame).references[0].identity)
    }
    expect(identities[0]).toBe(identities[1])
    expect(identities[0]).toContain('layout:/dashboard')
  })
  it('rejects missing client exports instead of producing incomplete HTML', async () => {
    setAppClientReferenceResolver(() => undefined)
    const result = await startAppServerPlan(
      createAppServerElement(createCompiledClientReference('/missing.tsx', 'default')),
    )
    await expect(read(result.stream)).rejects.toThrow('missing compiled SSR export')
    await expect(result.frame).rejects.toThrow('missing compiled SSR export')
  })
  it('propagates server errors through both output channels', async () => {
    const error = new Error('page failed')
    const result = await startAppServerPlan(
      createAppServerElement(() => {
        throw error
      }),
    )
    await expect(read(result.stream)).rejects.toBe(error)
    await expect(result.frame).rejects.toBe(error)
  })
})
