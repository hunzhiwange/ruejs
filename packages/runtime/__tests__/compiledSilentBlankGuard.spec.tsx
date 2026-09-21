import { resolveCompilerCapability } from './compiler-capability-test-runtime'
// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import swc from '@swc/core'
import { afterEach, describe, expect, it } from 'vitest'

import * as runtimeRoot from '../src'

runtimeRoot.setReactiveScheduling('sync')

type GuardModule = {
  View: () => unknown
  update(): void
}

const pluginPath = resolve(process.cwd(), 'packages/swc-plugin-rue/swc-plugin-rue.wasm')

const source = `
import { type FC, signal, useRef } from '@rue-js/rue'
import { renderPreview } from 'preview-helper'

const title = signal('first')
const rows = signal([
  { id: 1, label: 'one' },
  { id: 2, label: 'two' },
])

const MultiNode: FC<{ label: string }> = props => <>
  <span data-testid="multi-a">A:{props.label}</span>
  <span data-testid="multi-b">B:{props.label}</span>
</>

const ValueSlot: FC = props => <section data-testid="panel">
  <h1 data-testid="title">{title.get()}</h1>
  <div data-testid="slot">{props.children}</div>
</section>

const Preview: FC = () => {
  const value = useRef('preview content')
  return <aside data-testid="preview">{value.current}</aside>
}

const ObjectSlot: FC<{ display: { children: any } }> = ({ display }) => (
  <article data-testid="object-slot">{display.children}</article>
)

export const update = () => {
  title.set('second')
  rows.set([
    { id: 2, label: 'TWO' },
    { id: 1, label: 'ONE' },
    { id: 3, label: 'THREE' },
  ])
}

export const View: FC = () => <main data-testid="guard-root">
  {renderPreview(Preview)}
  <ObjectSlot display={{ children: <em data-testid="object-slot-child">nested object child</em> }} />
  <ValueSlot>
    <strong data-testid="before">before</strong>
    <MultiNode label={title.get()} />
    <strong data-testid="after">after</strong>
    <ul data-testid="rows">
      {rows.get().map(row => <li key={row.id} data-row={row.id}>{row.label}</li>)}
    </ul>
  </ValueSlot>
</main>
`

const compile = (): string => {
  expect(readFileSync(pluginPath).byteLength).toBeGreaterThan(0)
  return swc.transformSync(source, {
    filename: 'compiled-silent-blank-guard.tsx',
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
}

const evaluate = (): GuardModule => {
  const module = { exports: {} as Record<string, unknown> }
  new Function('require', 'module', 'exports', compile())(
    (id: string): Record<string, unknown> => {
      const capability = resolveCompilerCapability(id)
      if (capability) return capability as Record<string, unknown>
      if (id === '@rue-js/rue') return runtimeRoot
      if (id === 'preview-helper') return { renderPreview: (preview: () => unknown) => preview() }
      throw new Error(`Unexpected generated import: ${id}`)
    },
    module,
    module.exports,
  )
  return module.exports as GuardModule
}

const flush = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

const visibleOrder = (slot: Element): string[] =>
  Array.from(slot.children).map(element => {
    if (element.matches('[data-testid="rows"]')) {
      return `rows:${Array.from(element.children)
        .map(row => `${row.getAttribute('data-row')}:${row.textContent}`)
        .join(',')}`
    }
    return `${element.getAttribute('data-testid')}:${element.textContent}`
  })

afterEach(() => {
  runtimeRoot.setReactiveScheduling('sync')
  document.body.innerHTML = ''
})

describe('compiled silent blank guard', () => {
  it('keeps combined slots, component anchors, multi-node ranges, and keyed rows visible', async () => {
    const compiled = evaluate()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = runtimeRoot.useApp(compiled.View as any)

    app.mount(host)
    await flush()

    const root = host.querySelector('[data-testid="guard-root"]')
    const slot = host.querySelector('[data-testid="slot"]')
    expect(root).not.toBeNull()
    expect(host.querySelector('[data-testid="preview"]')?.textContent).toBe('preview content')
    expect(host.querySelector('[data-testid="object-slot-child"]')?.textContent).toBe(
      'nested object child',
    )
    expect(host.textContent).not.toContain('[object Object]')
    expect(host.textContent).not.toContain('target, slotProps, owner')
    expect(host.querySelector('[data-testid="title"]')?.textContent).toBe('first')
    expect(slot).not.toBeNull()
    expect(visibleOrder(slot!)).toEqual([
      'before:before',
      'multi-a:A:first',
      'multi-b:B:first',
      'after:after',
      'rows:1:one,2:two',
    ])

    compiled.update()
    await flush()

    expect(host.querySelector('[data-testid="title"]')?.textContent).toBe('second')
    expect(visibleOrder(slot!)).toEqual([
      'before:before',
      'multi-a:A:second',
      'multi-b:B:second',
      'after:after',
      'rows:2:TWO,1:ONE,3:THREE',
    ])

    app.unmount()
  })
})
