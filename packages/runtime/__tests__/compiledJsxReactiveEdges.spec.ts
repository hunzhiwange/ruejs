// @vitest-environment jsdom

import { resolve } from 'node:path'

import swc from '@swc/core'
import { afterEach, expect, it } from 'vitest'

import * as runtimeRoot from '../src'
import { compilerCapabilities, resolveCompilerCapability } from './compiler-capability-test-runtime'

const pluginPath = resolve(process.cwd(), 'packages/swc-plugin-rue/swc-plugin-rue.wasm')

const source = `
import { useState } from '@rue-js/rue'

export function App() {
  const [state] = useState(() => ({
    count: 0,
    visible: true,
    rows: [{ id: 1, label: 'A' }],
  }))
  const localNode = <em>{state.count}</em>
  return <main>
    <button id="change" onClick={() => {
      state.count += 1
      state.visible = !state.visible
      state.rows.push({ id: 2, label: 'B' })
    }}>change</button>
    <div id="array">{[
      <span key="count">{state.count}</span>,
      [state.visible && <strong key="visible">on</strong>, 0],
    ]}</div>
    <ul id="rows">{[
      state.rows.map(row => <li key={row.id}>{row.label}</li>),
      <li key="last">last</li>,
    ]}</ul>
    <ol id="filtered">{state.rows.filter(row => row.id > 0).map(row =>
      <li key={row.id}>{row.label}</li>
    )}</ol>
    <ol id="optional">{state.rows?.map(row => <li key={row.id}>{row.label}</li>)}</ol>
    <output id="attribute" className={state.count % 2 ? 'odd' : 'even'} title={String(state.count)}>{state.count}</output>
    <input id="controlled" value={state.count} />
    <div id="conditional">{state.visible ? <b>yes</b> : <i>no</i>}</div>
    <div id="local-node">{localNode}</div>
  </main>
}
`

const compile = () =>
  swc.transformSync(source, {
    filename: 'compiled-jsx-reactive-edges.tsx',
    jsc: {
      parser: { syntax: 'typescript', tsx: true },
      target: 'es2020',
      transform: {
        react: {
          runtime: 'automatic',
          importSource: '@rue-js',
          development: false,
          throwIfNamespace: false,
        },
      },
      experimental: { plugins: [[pluginPath, {}]] },
    },
    module: { type: 'commonjs' },
  }).code

const evaluate = (code: string): { App: () => unknown } => {
  const module = { exports: {} as Record<string, unknown> }
  new Function('require', 'module', 'exports', code)(
    (id: string) => {
      const capability = resolveCompilerCapability(id)
      if (capability) return capability
      if (id === '@rue-js/rue') return runtimeRoot
      throw new Error(`Unexpected generated import: ${id}`)
    },
    module,
    module.exports,
  )
  return module.exports as { App: () => unknown }
}

afterEach(() => {
  compilerCapabilities.reactive.setReactiveScheduling('frame')
  document.body.innerHTML = ''
})

// This covers Rue's path-mutation extension, not React useState setter semantics.
it('updates JSX bindings after Rue path mutations', async () => {
  compilerCapabilities.reactive.setReactiveScheduling('sync')
  const code = compile()
  console.log(code.match(/localRows[^\n]*/g))
  expect(code).toContain('_$compiledReadPath')
  const { App } = evaluate(code)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const owner = compilerCapabilities.reactive.createOwner()
  const root = compilerCapabilities.reactive.runWithOwner(
    owner,
    App,
  ) as import('../src/compiler-runtime/block').BlockRecord
  compilerCapabilities.reactive.runWithOwner(owner, () => root.__rue_compiled_mount(host))

  expect(host.querySelector('#array')?.textContent).toBe('0on0')
  expect(host.querySelector('#rows')?.textContent).toBe('Alast')
  expect(host.querySelector('#filtered')?.textContent).toBe('A')
  expect(host.querySelector('#optional')?.textContent).toBe('A')
  expect(host.querySelector('#attribute')?.className).toBe('even')
  expect(host.querySelector('#attribute')?.getAttribute('title')).toBe('0')
  expect((host.querySelector('#controlled') as HTMLInputElement)?.value).toBe('0')
  expect(host.querySelector('#conditional')?.textContent).toBe('yes')
  expect(host.querySelector('#local-node')?.textContent).toBe('0')

  host.querySelector('#change')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()

  expect(host.querySelector('#array')?.textContent).toBe('10')
  expect(host.querySelector('#rows')?.textContent).toBe('ABlast')
  expect(host.querySelector('#filtered')?.textContent).toBe('AB')
  expect(host.querySelector('#optional')?.textContent).toBe('AB')
  expect(host.querySelector('#attribute')?.className).toBe('odd')
  expect(host.querySelector('#attribute')?.getAttribute('title')).toBe('1')
  expect((host.querySelector('#controlled') as HTMLInputElement)?.value).toBe('1')
  expect(host.querySelector('#conditional')?.textContent).toBe('no')
  expect(host.querySelector('#local-node')?.textContent).toBe('1')

  root.dispose()
  compilerCapabilities.reactive.disposeOwner(owner)
})
