// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { compileNodePlan } from '../../runtime/__tests__/node-plan-test-utils'
import {
  decodeRuePayloadReadableStream,
  renderRuePayloadToReadableStream,
} from '../../rue-rsc/src/core/payload'

it.each([false, true])(
  'carries server HTML and compiled client references through RSC (published: %s)',
  async published => {
    const clientSource = `import {signal} from '@rue-js/rue'; export const View=props=>{const count=signal(0);return <section><button onClick={()=>count.set(count.get()+1)}>{props.label}:{count.get()}</button><div>{props.children}</div></section>};`
    const browserClient = compileNodePlan(
      clientSource + `export {hydrateServerFrame} from '@rue-js/runtime/internal/hydrate';`,
      'hydrate',
      published,
    )
    const page = compileNodePlan(
      `import Client from './client.js'; export {View as Counter} from './counter.js'; export {renderServerFrame} from '@rue-js/runtime/internal/ssr'; export const View=props=> <main><h1>Server only</h1><Client label={props.label ?? "Count"}><p>{props.slot ?? "Server slot"}</p></Client></main>;`,
      'server',
      published,
      {
        './counter.js': clientSource,
        './client.js': `import {createClientReference} from '@rue-js/rsc/core/rsc'; export default createClientReference(null,'counter','View');`,
      },
    )
    const frame = await page.renderServerFrame(page.View, {
      resolve: async (key: string, name: string) => {
        expect([key, name]).toEqual(['counter', 'View'])
        return page.Counter
      },
    })
    const decoded = await decodeRuePayloadReadableStream<typeof frame>(
      renderRuePayloadToReadableStream(frame),
    )
    expect(decoded).toEqual(frame)
    expect(JSON.stringify(frame)).not.toContain('$rue')
    const root = document.createElement('div')
    root.innerHTML = frame.html
    document.body.append(root)
    const button = root.querySelector('button')!
    expect(button).not.toBeNull()
    const heading = root.querySelector('h1')!
    const slot = root.querySelector('p')!
    const missing = {
      ...decoded,
      references: decoded.references.map((entry: Record<string, unknown>) => ({
        ...entry,
        id: '999',
      })),
    }
    await expect(
      browserClient.hydrateServerFrame(root, missing, async () => browserClient.View),
    ).rejects.toThrow('hydration mismatch')
    expect(root.querySelector('button')).toBe(button)
    await expect(
      browserClient.hydrateServerFrame(root, decoded, async () => undefined),
    ).rejects.toThrow('missing compiled client export')
    expect(root.querySelector('button')).toBe(button)
    const handle = await browserClient.hydrateServerFrame(
      root,
      decoded,
      async () => browserClient.View,
    )
    expect(root.querySelector('button')).toBe(button)
    expect(root.querySelector('h1')).toBe(heading)
    expect(root.querySelector('p')).toBe(slot)
    button.click()
    await expect.poll(() => button.textContent).toBe('Count:1')
    const refreshed = await page.renderServerFrame(page.View, {
      props: { label: 'Next', slot: 'Changed slot' },
      resolve: async () => page.Counter,
    })
    await handle.update(refreshed)
    expect(root.querySelector('button')).toBe(button)
    await expect.poll(() => button.textContent).toBe('Next:1')
    expect(root.querySelector('p')?.textContent).toBe('Changed slot')
    const finalFrame = await page.renderServerFrame(page.View, {
      props: { label: 'Final', slot: 'Final slot' },
      resolve: async () => page.Counter,
    })
    await Promise.all([handle.update(refreshed), handle.update(finalFrame)])
    expect(root.querySelector('button')).toBe(button)
    expect(button.textContent).toBe('Final:1')
    expect(root.querySelector('p')?.textContent).toBe('Final slot')
    handle.unmount()
    root.innerHTML = '<p>next root</p>'
    handle.unmount()
    expect(root.textContent).toBe('next root')
    root.remove()
  },
)

it('updates compiled root props without resetting local state or replacing DOM', async () => {
  const source = `import {signal} from '@rue-js/rue'; export const View=props=>{const count=signal(0);return <button onClick={()=>count.set(count.get()+1)}>{props.label}:{count.get()}</button>};`
  const server = compileNodePlan(source, 'server')
  const browser = compileNodePlan(source, 'hydrate')
  const container = document.createElement('div')
  container.innerHTML = await server.renderToString(server.View, { props: { label: 'before' } })
  const button = container.querySelector('button')!
  const handle = browser.hydrateRoot(container, browser.View, { props: { label: 'before' } })
  await handle.ready
  button.click()
  await expect.poll(() => button.textContent).toBe('before:1')
  handle.updateProps({ label: 'after' })
  await expect.poll(() => button.textContent).toBe('after:1')
  expect(container.querySelector('button')).toBe(button)
  handle.unmount()
  expect(() => handle.updateProps({ label: 'gone' })).toThrow('unmounted root')
})

it('updates a compiled root server slot while retaining its interactive sibling', async () => {
  const source = `import {signal} from '@rue-js/rue'; export const View=props=>{const count=signal(0);return <section><button onClick={()=>count.set(count.get()+1)}>{count.get()}</button><div>{props.children}</div></section>};`
  const server = compileNodePlan(source, 'server')
  const browser = compileNodePlan(
    source + `export {claimServerHTML} from '@rue-js/runtime/internal/hydrate';`,
    'hydrate',
  )
  const container = document.createElement('div')
  container.innerHTML = await server.renderToString(server.View, {
    props: {
      children: (writer: any) => {
        writer.chunks.push('<p>before</p>')
      },
    },
  })
  const button = container.querySelector('button')!
  const handle = browser.hydrateRoot(container, browser.View, {
    props: { children: browser.claimServerHTML('<p>before</p>') },
  })
  await handle.ready
  button.click()
  await expect.poll(() => button.textContent).toBe('1')
  handle.updateProps({ children: browser.claimServerHTML('<p>after</p>') })
  await expect.poll(() => container.querySelector('p')?.textContent).toBe('after')
  expect(container.querySelector('button')).toBe(button)
  expect(button.textContent).toBe('1')
  handle.unmount()
})

it('keeps keyed destructured rows live across compiled prop updates', async () => {
  const source = `const _$rowArg0='outer'; export const View=props=><ul>{props.rows.map(([id, {label}])=><li key={id} data-outer={_$rowArg0}>{label}</li>)}</ul>;`
  const server = compileNodePlan(source, 'server')
  const browser = compileNodePlan(source, 'hydrate')
  const rows = [
    ['a', { label: 'one' }],
    ['b', { label: 'two' }],
  ]
  const container = document.createElement('div')
  container.innerHTML = await server.renderToString(server.View, { props: { rows } })
  const original = Array.from(container.querySelectorAll('li'))
  const handle = browser.hydrateRoot(container, browser.View, { props: { rows } })
  await handle.ready
  handle.updateProps({
    rows: [
      ['b', { label: 'changed' }],
      ['a', { label: 'one' }],
    ],
  })
  await expect.poll(() => container.querySelector('li')?.textContent).toBe('changed')
  expect(Array.from(container.querySelectorAll('li'))).toEqual([original[1], original[0]])
  expect(original[1]?.getAttribute('data-outer')).toBe('outer')
  handle.unmount()
})

it('compiles an early empty component return as a closed writer and claim plan', async () => {
  const source = `export const View=props=>{if(props.hidden)return null;return <p>visible</p>};`
  const server = compileNodePlan(source, 'server')
  const browser = compileNodePlan(source, 'hydrate')
  const container = document.createElement('div')
  expect(await server.renderToString(server.View, { props: { hidden: true } })).toBe('')
  const handle = browser.hydrateRoot(container, browser.View, { props: { hidden: true } })
  await handle.ready
  expect(container.childNodes.length).toBe(0)
  handle.unmount()
})

it('remounts nested client boundaries after a captured error and supports repeated resets', async () => {
  const boundarySource = `import {signal,onErrorCaptured} from '@rue-js/rue';const Inner=props=>{const error=signal(false);onErrorCaptured(()=>{error.set(true);return false});return error.get()?<button data-retry onClick={()=>error.set(false)}>retry</button>:<>{props.children}</>};export const Boundary=props=><Inner>{props.children}</Inner>`
  const clientSource = `import {useState,useEffect} from '@rue-js/rue';export const Client=()=>{const [fail,setFail]=useState(false);useEffect(()=>{if(fail)throw new Error('client failed')},[fail]);return <button data-crash onClick={()=>setFail(true)}>crash</button>}`
  const page = compileNodePlan(
    `import {createClientReference} from '@rue-js/rsc/core/rsc';const Boundary=createClientReference(null,'boundary','Boundary');const Client=createClientReference(null,'client','Client');export {Boundary as ServerBoundary} from './boundary.js';export {Client as ServerClient} from './client.js';export {renderServerFrame} from '@rue-js/runtime/internal/ssr';export const View=()=> <main><Boundary><Client/></Boundary></main>`,
    'server',
    false,
    { './boundary.js': boundarySource, './client.js': clientSource },
  )
  const browser = compileNodePlan(
    `export {Boundary} from './boundary.js';export {Client} from './client.js';export {hydrateServerFrame} from '@rue-js/runtime/internal/hydrate'`,
    'hydrate',
    false,
    { './boundary.js': boundarySource, './client.js': clientSource },
  )
  const frame = await page.renderServerFrame(page.View, {
    resolve: (key: string) => (key === 'boundary' ? page.ServerBoundary : page.ServerClient),
  })
  const container = document.createElement('div')
  container.innerHTML = frame.html
  const root = await browser.hydrateServerFrame(container, frame, (key: string) =>
    key === 'boundary' ? browser.Boundary : browser.Client,
  )
  for (let cycle = 0; cycle < 2; cycle++) {
    container.querySelector<HTMLButtonElement>('[data-crash]')!.click()
    await expect.poll(() => container.querySelector('[data-retry]')?.textContent).toBe('retry')
    container.querySelector<HTMLButtonElement>('[data-retry]')!.click()
    await expect.poll(() => container.querySelector('[data-crash]')?.textContent).toBe('crash')
  }
  root.unmount()
})

it('drains frame-scheduled nested slot updates before committing preserved client state', async () => {
  const wrapper = `const Inner=props=><section>{props.children}</section>;export const Wrapper=props=><Inner>{props.children}</Inner>`
  const counter = `import {signal} from '@rue-js/rue';export const Counter=()=>{const count=signal(0);return <button onClick={()=>count.set(count.get()+1)}>{count.get()}</button>}`
  const modules = { './wrapper.js': wrapper, './counter.js': counter }
  const server = compileNodePlan(
    `import {createClientReference} from '@rue-js/rsc/core/rsc';const Wrapper=createClientReference(null,'wrapper','Wrapper');const Counter=createClientReference(null,'counter','Counter');export {Wrapper} from './wrapper.js';export {Counter} from './counter.js';export {renderServerFrame} from '@rue-js/runtime/internal/ssr';export const View=props=><main><Wrapper><Counter/><p>{props.label}</p></Wrapper></main>`,
    'server',
    false,
    modules,
  )
  const browser = compileNodePlan(
    `export {Wrapper} from './wrapper.js';export {Counter} from './counter.js';export {hydrateServerFrame} from '@rue-js/runtime/internal/hydrate'`,
    'hydrate',
    false,
    modules,
  )
  let storage: any, priorMode: any
  let root: any
  try {
    const frame = await server.renderServerFrame(server.View, {
      props: { label: 'before' },
      resolve: (key: string) => (key === 'wrapper' ? server.Wrapper : server.Counter),
    })
    const container = document.createElement('div')
    container.innerHTML = frame.html
    root = await browser.hydrateServerFrame(container, frame, (key: string) =>
      key === 'wrapper' ? browser.Wrapper : browser.Counter,
    )
    storage = (globalThis as any)[Symbol.for('@rue-js/runtime/reactive-effect-storage')]
    priorMode = storage.state.schedulingMode
    storage.state.schedulingMode = 'frame'
    const button = container.querySelector('button')!
    button.click()
    await expect.poll(() => button.textContent).toBe('1')
    const next = await server.renderServerFrame(server.View, {
      props: { label: 'after' },
      resolve: (key: string) => (key === 'wrapper' ? server.Wrapper : server.Counter),
    })
    await root.update(next)
    expect(container.querySelector('button')).toBe(button)
    expect(container.querySelector('p')?.textContent).toBe('after')
    await new Promise(resolve => requestAnimationFrame(resolve))
    expect(container.querySelector('button')).toBe(button)
    button.click()
    await expect.poll(() => button.textContent).toBe('2')
  } finally {
    root?.unmount()
    if (storage) storage.state.schedulingMode = priorMode
  }
})
