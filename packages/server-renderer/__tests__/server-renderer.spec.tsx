// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { compileNodePlan } from '../../runtime/__tests__/node-plan-test-utils'

import { fixture } from '../../runtime/__tests__/node-plan.fixture'

describe('compiled SSR writer', () => {
  it('writes escaped HTML/SVG and matching deterministic node markers', async () => {
    const server = compileNodePlan(fixture, 'server')
    const html = await server.renderToString(server.View)
    expect(html).toContain('safe &amp; &lt;sound&gt;')
    expect(html).toContain('data-ready="true" aria-hidden="false"')
    expect(html).toContain('viewBox="0 0 10 10"')
    expect(html).toContain('<!--r:b:row:number:1-->')
    expect(html).toBe(await server.renderToString(server.View))
    expect(server.code).toContain('_$writeElement')
    expect(server.code).not.toMatch(/serverElement|renderAnchor|internal\/dom/)
    expect(server.modules.join('\n')).not.toMatch(
      /js-runtime|compiled-render-anchor|\/island\.ts|\/dom\.ts/,
    )
  })
  it('supports async compiled components without a renderable normalization pass', async () => {
    const server = compileNodePlan(
      `const Child = async props => <span>{props.label}</span>; export const View = () => <Child label="ready"/>;`,
      'server',
    )
    expect(await server.renderToString(server.View)).toContain('ready')
  })
  it('rejects uncompiled object children at build time', () => {
    expect(() =>
      compileNodePlan('export const View = () => <div>{{bad: true}}</div>', 'server'),
    ).toThrow()
    expect(() =>
      compileNodePlan('export const View = () => <div>{{bad: true}}</div>', 'hydrate'),
    ).toThrow()
  })
})

it('awaits registered server prefetch work before writing and skips browser lifecycle hooks', async () => {
  const source = `import {signal,onServerPrefetch,onMounted,onUnmounted} from '@rue-js/rue'; export const calls=[]; export const View=()=>{const value=signal('before');onServerPrefetch(async()=>{calls.push('first');await Promise.resolve();value.set('ready')});onServerPrefetch(()=>calls.push('second'));onMounted(()=>calls.push('mounted'));onUnmounted(()=>calls.push('unmounted'));return <p>{value.get()}</p>};`
  const server = compileNodePlan(source, 'server')
  expect(await server.renderToString(server.View)).toContain('ready')
  expect(server.calls).toEqual(['first', 'second'])
})

it('resolves useComponent loaders to compiled writer factories', async () => {
  const source = `import {useComponent} from '@rue-js/rue'; const Child=useComponent(async()=>({default:props=><em>{props.label}</em>}));export const View=()=> <Child label="loaded"/>;`
  const server = compileNodePlan(source, 'server')
  expect(await server.renderToString(server.View)).toContain('loaded')
  expect(server.modules.join('\n')).not.toMatch(/js-runtime|compiled-render-anchor|\/dom\.ts/)
})

it('retains request-local Context across writer awaits and concurrent renders', async () => {
  const source = `import {createContext,useContext} from '@rue-js/rue'; export const Theme=createContext('none'); const Child=()=> <span>prefix:{useContext(Theme)}</span>;export const View=props=><Theme.Provider value={props.label}><Child/></Theme.Provider>;`
  const server = compileNodePlan(source, 'server')
  const [one, two] = await Promise.all([
    server.renderToString(server.View, { props: { label: 'one' } }),
    server.renderToString(server.View, { props: { label: 'two' } }),
  ])
  expect(one).toContain('>one<!--')
  expect(two).toContain('>two<!--')
  expect(server.Theme.values.size).toBe(0)
})

it('writes explicit island factories with independently claimable component markup', async () => {
  const server = compileNodePlan(
    `
    import { CompiledIsland } from '@rue-js/runtime/server'
    const Content = props => <button>{props.label}</button>
    export const View = () => <CompiledIsland component={Content} props={{label:'ready'}}
      metadata={{id:'i',component:'Content',hydrate:'load'}} />
    export const Only = () => <CompiledIsland component={Content} props={{label:'hidden'}}
      metadata={{id:'o',component:'Content',hydrate:'only'}} fallback={<p>loading</p>} />
  `,
    'server',
  )
  const html = await server.renderToString(server.View)
  expect(html).toContain('<rue-island')
  expect(html).toMatch(/<rue-island[^>]*><!--r:e:\d+--><button>/)
  expect(html).toContain('ready')
  const only = await server.renderToString(server.Only)
  expect(only).toContain('loading')
  expect(only).not.toContain('<button>')
})

it('writes deferred server islands through an explicit request callback', async () => {
  const server = compileNodePlan(
    `
    import { CompiledServerIsland } from '@rue-js/runtime/server'
    export const View = () => <CompiledServerIsland id="report" props={{account:'a'}}
      fallback={<p>loading</p>} />
  `,
    'server',
  )
  const calls: unknown[] = []
  const html = await server.renderToString(server.View, {
    serverIsland: (id: string, props: unknown, fallback: string) => {
      calls.push([id, props])
      return '<rue-server-island>' + fallback + '</rue-server-island>'
    },
  })
  expect(calls).toEqual([['report', { account: 'a' }]])
  expect(html).toContain('<rue-server-island>')
  expect(html).toContain('loading')
  await expect(server.renderToString(server.View)).rejects.toThrow(
    'requires a serverIsland writer callback',
  )
})
