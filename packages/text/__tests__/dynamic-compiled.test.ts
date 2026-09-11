import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { compileNodePlan } from '../../runtime/__tests__/node-plan-test-utils'
const dynamicSource = readFileSync('src/shims/dynamic.tsx', 'utf8')

it('renders and hydrates a lazy component through compiled Suspense', async () => {
  const source = `import dynamic from './dynamic.js';import {signal} from '@rue-js/rue';const Counter=()=>{const count=signal(0);return <button onClick={()=>count.set(count.get()+1)}>{count.get()}</button>};const Lazy=dynamic(()=>Promise.resolve(Counter),{loading:()=> <p>Loading</p>});export const View=()=> <main><Lazy/></main>`
  const server = compileNodePlan(source, 'server', false, { './dynamic.js': dynamicSource })
  const browser = compileNodePlan(source, 'hydrate', false, { './dynamic.js': dynamicSource })
  const container = document.createElement('div')
  container.innerHTML = await server.renderToString(server.View)
  const button = container.querySelector('button')!
  const root = browser.hydrateRoot(container, browser.View)
  await root.ready
  expect(container.querySelector('button')).toBe(button)
  button.click()
  await expect.poll(() => button.textContent).toBe('1')
  root.unmount()
})

it('keeps ssr:false loading output identical for the first claim, then loads on mount', async () => {
  const source = `import dynamic from './dynamic.js';const Loaded=()=> <button>Loaded</button>;export let calls=0;const Lazy=dynamic(()=>{calls++;return Promise.resolve(Loaded)},{ssr:false,loading:()=> <p>Loading</p>});export const View=()=> <main><Lazy/></main>`
  const server = compileNodePlan(source, 'server', false, { './dynamic.js': dynamicSource })
  const browser = compileNodePlan(source, 'hydrate', false, { './dynamic.js': dynamicSource })
  const container = document.createElement('div')
  container.innerHTML = await server.renderToString(server.View)
  expect(server.calls).toBe(0)
  expect(container.textContent).toBe('Loading')
  const root = browser.hydrateRoot(container, browser.View)
  await root.ready
  await expect.poll(() => container.textContent).toBe('Loaded')
  expect(browser.calls).toBe(1)
  root.unmount()
})
