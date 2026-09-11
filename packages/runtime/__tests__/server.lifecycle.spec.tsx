// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { compileNodePlan } from './node-plan-test-utils'

it('preserves reactive props until the compiled child explicitly reads them', async () => {
  const source = `import { signal } from '@rue-js/rue'; export const state=signal('prop-value'); export let received; const Child=props=>{received=props.value;return <span>{props.value.get()}</span>}; export const View=()=> <Child value={state}/>;`
  const server = compileNodePlan(source, 'server')
  expect(await server.renderToString(server.View)).toContain('prop-value')
  expect(server.received).toBe(server.state)
})

it('keeps browser mount callbacks out of SSR and attaches refs during root claim', async () => {
  const source = `import { onBeforeMount,onMounted,useRef,onCleanup } from '@rue-js/rue'; export const calls=[]; export const View=()=>{const root=useRef();onBeforeMount(()=>calls.push('before'));onMounted(()=>calls.push(root.current.querySelectorAll('a').length));onCleanup(()=>calls.push('cleanup'));return <nav ref={root}><a href="/">Home</a></nav>};`
  const server = compileNodePlan(source, 'server'),
    client = compileNodePlan(source, 'hydrate')
  const host = document.createElement('div')
  host.innerHTML = await server.renderToString(server.View)
  expect(server.calls).toEqual(['cleanup'])
  const node = host.querySelector('nav')
  const handle = client.hydrateRoot(host, client.View)
  expect(host.querySelector('nav')).toBe(node)
  expect(client.calls).toEqual(['before', 1])
  handle.unmount()
  expect(client.calls).toEqual(['before', 1, 'cleanup'])
})

it('leaves callback and object refs detached in SSR and clears them on unmount', async () => {
  const source = `export const calls=[];export const reference={current:null};export const View=()=> <section ref={reference}><div ref={node=>calls.push(node)}>Ref content</div></section>;`
  const server = compileNodePlan(source, 'server'),
    client = compileNodePlan(source, 'hydrate')
  const host = document.createElement('div')
  host.innerHTML = await server.renderToString(server.View)
  expect(server.calls).toEqual([])
  expect(server.reference.current).toBeNull()
  const handle = client.hydrateRoot(host, client.View)
  expect(client.reference.current).toBe(host.firstElementChild)
  expect(client.calls).toEqual([host.querySelector('div')])
  handle.unmount()
  expect(client.reference.current).toBeNull()
  expect(client.calls.at(-1)).toBeNull()
})
