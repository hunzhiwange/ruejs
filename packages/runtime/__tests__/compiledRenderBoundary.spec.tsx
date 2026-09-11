import { resolveCompilerCapability } from './compiler-capability-test-runtime'
// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import swc from '@swc/core'
import { afterEach, describe, expect, it } from 'vitest'

import * as compiledRuntime from '../src/internal'
import * as internalRuntime from '../src/internal'
import * as runtimeRoot from '../src'
import { _$mountCompiledSlotAt } from '../src/compiler-runtime/compact-component-abi'
import {
  disposeOwner,
  onOwnerCleanup,
  runWithOwner,
  setReactiveScheduling as setCompiledReactiveScheduling,
  signal as compiledSignal,
  type CompiledOwner,
} from '../src/runtime-core/compiled'
import type { CompiledBlock, CompiledTarget } from '../src/compiler-runtime/types'

runtimeRoot.setReactiveScheduling('sync')

type BoundaryModule = {
  View: () => unknown
  setBranch(value: boolean): void
  setLabel(value: string): void
  trace: {
    branchRenders: number
    mounted: number
    plainRenders: number
    unmounted: number
  }
}

type DirectComponentModule = {
  View: () => unknown
  setLabel(value: string): void
  trace: {
    mounted: number
    renders: number
    unmounted: number
  }
}

const pluginPath = resolve(process.cwd(), 'packages/swc-plugin-rue/swc-plugin-rue.wasm')

const source = `
import {
  type FC,
  onMounted,
  onUnmounted,
  signal,
} from '@rue-js/rue'

const label = signal('one')
const branch = signal(false)

export const trace = {
  branchRenders: 0,
  mounted: 0,
  plainRenders: 0,
  unmounted: 0,
}

const PlainFallback: FC = () => {
  trace.plainRenders += 1
  return <section data-testid="plain-root">
    <input data-testid="plain-input" tabIndex={0} value={label.get()} />
    <span data-testid="plain-label">{label.get()}</span>
  </section>
}

const LifecycleLeaf: FC = () => {
  onMounted(() => trace.mounted += 1)
  onUnmounted(() => trace.unmounted += 1)
  return <aside data-testid="lifecycle-leaf">owned</aside>
}

const BranchBoundary: FC = () => {
  if (branch.get()) {
    trace.branchRenders += 1
    return <section data-testid="branch-root" data-state="active">
      <input data-testid="branch-input" tabIndex={0} value="active" />
      <span>active</span>
    </section>
  }
  trace.branchRenders += 1
  return <section data-testid="branch-root" data-state="idle">
    <input data-testid="branch-input" tabIndex={0} value="idle" />
    <span>idle</span>
  </section>
}

export const setLabel = (value) => label.set(value)
export const setBranch = (value) => branch.set(value)
export const View: FC = () => <main><PlainFallback /><BranchBoundary /><LifecycleLeaf /></main>
`

const directComponentSource = `
import {
  type FC,
  onMounted,
  onUnmounted,
  signal,
} from '@rue-js/rue'

const label = signal('one')

export const trace = {
  mounted: 0,
  renders: 0,
  unmounted: 0,
}

const DirectLeaf: FC<{ label: string }> = props => {
  trace.renders += 1
  onMounted(() => trace.mounted += 1)
  onUnmounted(() => trace.unmounted += 1)
  return <span data-testid="direct-leaf">{props.label}</span>
}

export const setLabel = (value) => label.set(value)
export const View: FC = () => <main><DirectLeaf label={label.get()} /></main>
`

const compile = (moduleType: 'es6' | 'commonjs'): string => {
  expect(readFileSync(pluginPath).byteLength).toBeGreaterThan(0)
  return swc.transformSync(source, {
    filename: 'compiled-render-boundary.tsx',
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
    module: { type: moduleType },
  }).code
}

const compileDirectComponent = (moduleType: 'es6' | 'commonjs'): string => {
  expect(readFileSync(pluginPath).byteLength).toBeGreaterThan(0)
  return swc.transformSync(directComponentSource, {
    filename: 'compiled-direct-component.tsx',
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
    module: { type: moduleType },
  }).code
}

const evaluate = (): BoundaryModule => {
  const module = { exports: {} as Record<string, unknown> }
  const runtimeRequire = (id: string): Record<string, unknown> => {
    const capability = resolveCompilerCapability(id)
    if (capability) return capability as Record<string, unknown>
    if (id === '@rue-js/rue') return runtimeRoot
    throw new Error(`Unexpected generated import: ${id}`)
  }
  new Function('require', 'module', 'exports', compile('commonjs'))(
    runtimeRequire,
    module,
    module.exports,
  )
  return module.exports as BoundaryModule
}

const evaluateDirectComponent = (): DirectComponentModule => {
  const module = { exports: {} as Record<string, unknown> }
  const runtimeRequire = (id: string): Record<string, unknown> => {
    const capability = resolveCompilerCapability(id)
    if (capability) return capability as Record<string, unknown>
    if (id === '@rue-js/rue') return runtimeRoot
    throw new Error(`Unexpected generated import: ${id}`)
  }
  new Function('require', 'module', 'exports', compileDirectComponent('commonjs'))(
    runtimeRequire,
    module,
    module.exports,
  )
  return module.exports as DirectComponentModule
}

const flush = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

afterEach(() => {
  runtimeRoot.setReactiveScheduling('sync')
  document.body.innerHTML = ''
})

describe('compiled component render boundary', () => {
  it('disposes replaced and failed direct slot component owners exactly once', async () => {
    setCompiledReactiveScheduling('sync')
    const host = document.createElement('div')
    const trace = { first: 0, second: 0, failed: 0 }
    const factory =
      (label: keyof typeof trace, throws = false) =>
      (target: CompiledTarget, _props: object, owner: CompiledOwner): CompiledBlock => {
        runWithOwner(owner, () => onOwnerCleanup(() => trace[label]++))
        if (throws) throw new Error('direct mount failed')
        const node = document.createTextNode(label)
        target.parent.insertBefore(node, target.before)
        let disposed = false
        return {
          first: node,
          last: node,
          owner: owner as unknown as CompiledBlock['owner'],
          dispose() {
            if (disposed) return
            disposed = true
            node.parentNode?.removeChild(node)
            disposeOwner(owner)
          },
        }
      }
    const first = factory('first')
    const second = factory('second')
    const failed = factory('failed', true)
    const current = compiledSignal(first)

    _$mountCompiledSlotAt(
      { parent: host, before: null },
      () => current.get(),
      () => ({}),
    )
    expect(host.textContent).toBe('first')

    current.set(second)
    await flush()
    expect(host.textContent).toBe('second')
    expect(trace).toEqual({ first: 1, second: 0, failed: 0 })

    const failedHost = document.createElement('div')
    expect(() =>
      _$mountCompiledSlotAt(
        { parent: failedHost, before: null },
        () => failed,
        () => ({}),
      ),
    ).toThrow('direct mount failed')
    expect(failedHost.textContent).toBe('')
    expect(trace).toEqual({ first: 1, second: 0, failed: 1 })
  })

  it('mounts a proven local component without renderAnchor and preserves its nodes on prop updates', async () => {
    const output = compileDirectComponent('es6')
    expect(output).toContain('_$mountCompiledSlotAt')
    expect(output).toContain('_$mountCompiledSlotFactory')
    expect(output).not.toContain('renderAnchor')

    const compiled = evaluateDirectComponent()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = runtimeRoot.useApp(compiled.View as any)

    app.mount(host)
    await flush()

    const leaf = host.querySelector('[data-testid="direct-leaf"]')
    const comments = Array.from(host.querySelectorAll('main')[0].childNodes).filter(
      node => node.nodeType === Node.COMMENT_NODE,
    )
    expect(leaf?.textContent).toBe('one')
    expect(comments).toHaveLength(2)
    expect(compiled.trace).toEqual({ mounted: 1, renders: 1, unmounted: 0 })

    compiled.setLabel('two')
    await flush()

    expect(host.querySelector('[data-testid="direct-leaf"]')).toBe(leaf)
    expect(leaf?.textContent).toBe('two')
    expect(compiled.trace).toEqual({ mounted: 1, renders: 1, unmounted: 0 })

    app.unmount()
    await flush()
    expect(compiled.trace.unmounted).toBe(1)
    expect(host.childNodes).toHaveLength(0)
  })

  it('keeps local Vapor bindings fine-grained and reruns setup render control once per change', async () => {
    const esm = compile('es6')
    const plainOutput = esm.split('const BranchBoundary')[0]
    const branchOutput = esm.split('const BranchBoundary')[1].split('export const setLabel')[0]
    expect(plainOutput).not.toContain('_$compiledMarkComponentRenderReactive()')
    expect(plainOutput).not.toContain('const PlainFallback = _$compiledMarkComponentRenderReactive')
    expect(branchOutput).toContain('_$compiledBranch(')

    const compiled = evaluate()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = runtimeRoot.useApp(compiled.View as any)

    app.mount(host)
    await flush()

    const plainRoot = host.querySelector('[data-testid="plain-root"]')
    const plainInput = host.querySelector('[data-testid="plain-input"]') as HTMLInputElement
    const branchInput = host.querySelector('[data-testid="branch-input"]') as HTMLInputElement
    const initialBranchRenders = compiled.trace.branchRenders
    expect(compiled.trace).toMatchObject({
      plainRenders: 1,
      branchRenders: 1,
      mounted: 1,
      unmounted: 0,
    })

    plainInput.focus()
    plainInput.setSelectionRange(1, 2)
    compiled.setLabel('two')
    await flush()

    expect(compiled.trace.plainRenders).toBe(1)
    expect(host.querySelector('[data-testid="plain-root"]')).toBe(plainRoot)
    expect(host.querySelector('[data-testid="plain-input"]')).toBe(plainInput)
    expect(host.querySelector('[data-testid="plain-label"]')?.textContent).toBe('two')
    expect(plainInput.value).toBe('two')
    expect(document.activeElement).toBe(plainInput)

    branchInput.focus()
    branchInput.setSelectionRange(1, 3)
    compiled.setBranch(true)
    await flush()

    const currentBranchInput = host.querySelector(
      '[data-testid="branch-input"]',
    ) as HTMLInputElement
    expect(compiled.trace.branchRenders).toBe(initialBranchRenders + 1)
    expect(host.querySelectorAll('[data-testid="branch-root"]')).toHaveLength(1)
    expect(host.querySelectorAll('[data-testid="branch-input"]')).toHaveLength(1)
    expect(host.querySelector('[data-testid="branch-root"]')?.getAttribute('data-state')).toBe(
      'active',
    )
    expect(document.activeElement).toBe(currentBranchInput)
    expect(currentBranchInput.selectionStart).toBe(1)
    expect(currentBranchInput.selectionEnd).toBe(3)
    expect(compiled.trace.mounted).toBe(1)
    expect(compiled.trace.unmounted).toBe(0)

    app.unmount()
    await flush()
    expect(compiled.trace.unmounted).toBe(1)
    expect(host.childNodes).toHaveLength(0)
  })
})
