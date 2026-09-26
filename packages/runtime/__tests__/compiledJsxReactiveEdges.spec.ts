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

it('updates text, conditionals, and keyed rows nested in literal JSX arrays', () => {
  compilerCapabilities.reactive.setReactiveScheduling('sync')
  const { App } = evaluate(compile())
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

  host.querySelector('#change')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

  expect(host.querySelector('#array')?.textContent).toBe('10')
  expect(host.querySelector('#rows')?.textContent).toBe('ABlast')

  root.dispose()
  compilerCapabilities.reactive.disposeOwner(owner)
})
