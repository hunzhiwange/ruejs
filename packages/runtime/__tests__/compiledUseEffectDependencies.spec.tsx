// @vitest-environment jsdom

import { resolve } from 'node:path'

import swc from '@swc/core'
import { afterEach, describe, expect, it } from 'vitest'

import * as runtimeRoot from '../src'
import { compilerCapabilities, resolveCompilerCapability } from './compiler-capability-test-runtime'
import * as compiledRuntime from '../src/internal'

const pluginPath = resolve(process.cwd(), 'packages/swc-plugin-rue/swc-plugin-rue.wasm')
const roots: compiledRuntime.CompiledRootHandle[] = []

afterEach(() => {
  try {
    for (const root of roots.splice(0)) root.dispose()
  } finally {
    compilerCapabilities.reactive.setReactiveScheduling('frame')
    document.body.innerHTML = ''
  }
})

const compileEffect = (dependencies: string) => {
  const code = swc.transformSync(
    `
import { signal, useEffect } from '@rue-js/rue'
export const declared = signal(0)
export const incidental = signal(0)
export const events: string[] = []
export function EffectView() {
  useEffect(() => {
    const value = declared.get()
    const other = incidental.get()
    events.push('run:' + value + ':' + other)
    return () => {
      incidental.get()
      events.push('cleanup:' + value + ':' + other)
    }
  }${dependencies})
  return <section>effect owner</section>
}
export function App() {
  return <EffectView />
}
`,
    {
      filename: 'compiled-use-effect-dependencies.tsx',
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
    },
  ).code
  expect(code).toContain('_$compiledUseEffect')
  const module = { exports: {} }
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
  return module.exports as {
    App(): compiledRuntime.CompiledRootHandle
    declared: ReturnType<typeof compiledRuntime.signal<number>>
    incidental: ReturnType<typeof compiledRuntime.signal<number>>
    events: string[]
  }
}

describe('real compiled useEffect dependencies', () => {
  it.each([
    { name: 'automatically tracks callback reads', dependencies: '', mode: 'automatic' },
    { name: 'runs once with an empty array', dependencies: ', []', mode: 'empty' },
    {
      name: 'tracks only declared reads with a lazy dependency array',
      dependencies: ', [declared.get()]',
      mode: 'explicit',
    },
  ])('$name', ({ dependencies, mode }) => {
    compilerCapabilities.reactive.setReactiveScheduling('sync')
    const { App, declared, incidental, events } = compileEffect(dependencies)
    const root = App()
    roots.push(root)
    expect(events).toEqual([])

    // Effects must wait for mount and observe the latest dependency value.
    declared.set(1)
    expect(events).toEqual([])
    const host = document.createElement('main')
    document.body.appendChild(host)
    const mounted = root.__rue_compiled_mount(host)
    if (mounted instanceof Node && mounted.parentNode !== host) host.appendChild(mounted)
    expect(host.textContent).toBe('effect owner')
    const expected = ['run:1:0']
    expect(events).toEqual(expected)

    incidental.set(1)
    if (mode === 'automatic') expected.push('cleanup:1:0', 'run:1:1')
    expect(events).toEqual(expected)

    declared.set(2)
    if (mode === 'automatic') expected.push('cleanup:1:1', 'run:2:1')
    if (mode === 'explicit') expected.push('cleanup:1:0', 'run:2:1')
    expect(events).toEqual(expected)
    declared.set(2)
    expect(events).toEqual(expected)

    // Neither callback nor cleanup reads may become explicit dependencies.
    incidental.set(2)
    if (mode === 'automatic') expected.push('cleanup:2:1', 'run:2:2')
    expect(events).toEqual(expected)

    root.dispose()
    expected.push(
      mode === 'automatic' ? 'cleanup:2:2' : mode === 'explicit' ? 'cleanup:2:1' : 'cleanup:1:0',
    )
    expect(events).toEqual(expected)
    expect(host.innerHTML).toBe('')
    root.dispose()
    declared.set(3)
    incidental.set(3)
    expect(events).toEqual(expected)
  })
})
