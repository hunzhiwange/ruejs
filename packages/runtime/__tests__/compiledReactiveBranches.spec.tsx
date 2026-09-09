// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import swc from '@swc/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createCompiledProps } from '../src/compiled-props'
import * as compiledRuntime from '../src/internal'
import * as runtimeRoot from '../src'
import * as vaporRuntime from './legacy-test-render'

type ReactiveBranchModule = {
  Example: () => compiledRuntime.CompiledRootHandle
  trace: {
    cleanupRuns: number
    set(value: string): void
    setupRuns: number
  }
}

type VideoListModule = {
  VideoList: (props: {
    emptyHeading?: string
    videos: Array<{ desc: string; title: string }>
  }) => compiledRuntime.CompiledRootHandle
  state: {
    emptyHeading?: string
    videos: Array<{ desc: string; title: string }>
  }
}

type RepeatedResourceListModule = {
  ResourceList: () => compiledRuntime.CompiledRootHandle
  setRows(rows: string[]): void
}

type BoundaryReuseModule = {
  Example: () => compiledRuntime.CompiledRootHandle
  state: { set(value: boolean): void }
  trace: { cleanupRuns: number }
}

type ReactiveCase = {
  name: string
  read: string
  setup: string
  update: string
}

const pluginPath = resolve(process.cwd(), 'packages/swc-plugin-rue/swc-plugin-rue.wasm')

const cases: ReactiveCase[] = [
  {
    name: 'ref',
    setup: "const state = ref('one')",
    read: 'state.value',
    update: 'state.value = value',
  },
  {
    name: 'shallowRef',
    setup: "const state = shallowRef('one')",
    read: 'state.value',
    update: 'state.value = value',
  },
  {
    name: 'customRef',
    setup: `
      let raw = 'one'
      const state = customRef((track, trigger) => ({
        get() { track(); return raw },
        set(value) { raw = value; trigger() },
      }))
    `,
    read: 'state.value',
    update: 'state.value = value',
  },
  {
    name: 'computed',
    setup: "const source = ref('one'); const state = computed(() => source.value)",
    read: 'state.get()',
    update: 'source.value = value',
  },
  {
    name: 'signal',
    setup: "const state = signal('one')",
    read: 'state.get()',
    update: 'state.set(value)',
  },
  {
    name: 'useState',
    setup: "const [state, setState] = useState(() => 'one')",
    read: 'state',
    update: 'setState(previous => previous === value ? previous : value)',
  },
]

const sourceFor = ({ read, setup, update }: ReactiveCase): string => `
import {
  computed, customRef, onScopeDispose, ref, shallowRef, signal, useState,
} from '@rue-js/rue'

export const trace = { cleanupRuns: 0, set: value => {}, setupRuns: 0 }

export function Example() {
  trace.setupRuns += 1
  ${setup}
  trace.set = value => { ${update} }
  onScopeDispose(() => { trace.cleanupRuns += 1 })
  return (
    <section data-value={${read}}>
      <span data-text="">{${read}}</span>
      {${read} === 'one'
        ? <b data-branch="one">one</b>
        : <i data-branch="two">two</i>}
    </section>
  )
}
`

const compileSource = (
  source: string,
  moduleType: 'es6' | 'commonjs',
  filename = 'compiled-reactive-branch.tsx',
): string => {
  expect(readFileSync(pluginPath).byteLength).toBeGreaterThan(0)
  return swc.transformSync(source, {
    filename,
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
      experimental: {
        plugins: [[pluginPath, {}]],
      },
    },
    module: { type: moduleType },
  }).code
}

const compile = (reactiveCase: ReactiveCase, moduleType: 'es6' | 'commonjs'): string =>
  compileSource(sourceFor(reactiveCase), moduleType, `compiled-reactive-${reactiveCase.name}.tsx`)

const runtimeRequire = (id: string): Record<string, unknown> => {
  if (id === '@rue-js/rue/internal/compiler') return compiledRuntime
  if (id === '@rue-js/rue/internal/component') return compiledRuntime
  if (id === '@rue-js/rue/internal') return compiledRuntime
  if (id === '@rue-js/rue') return runtimeRoot
  throw new Error(`Unexpected generated import: ${id}`)
}

const evaluateSource = <T extends Record<string, unknown>>(source: string): T => {
  const module = { exports: {} as Record<string, unknown> }
  new Function('require', 'module', 'exports', compileSource(source, 'commonjs'))(
    runtimeRequire,
    module,
    module.exports,
  )
  return module.exports as T
}

const evaluate = (reactiveCase: ReactiveCase): ReactiveBranchModule => {
  const module = { exports: {} as Record<string, unknown> }
  new Function('require', 'module', 'exports', compile(reactiveCase, 'commonjs'))(
    runtimeRequire,
    module,
    module.exports,
  )
  return module.exports as ReactiveBranchModule
}

const mount = (compiled: ReactiveBranchModule, host: HTMLElement) => {
  const owner = compiledRuntime.createOwner()
  const handle = compiledRuntime.runWithOwner(owner, () => compiled.Example())
  if (handle == null) throw new Error('Expected a compiled root handle')
  const root = handle.__rue_compiled_mount(host)
  if (root != null && root.parentNode !== host) host.appendChild(root)
  return () => {
    handle.dispose()
    compiledRuntime.disposeOwner(owner)
  }
}

afterEach(() => {
  compiledRuntime.setReactiveScheduling('frame')
  vaporRuntime.setReactiveScheduling('frame')
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('compiled reactive branches', () => {
  it('reuses a real sibling boundary through 1,000 branch switches and one cleanup', async () => {
    const source = `
      import { onScopeDispose, signal } from '@rue-js/rue'

      export const state = signal(true)
      export const trace = { cleanupRuns: 0 }
      export function Example() {
        onScopeDispose(() => { trace.cleanupRuns += 1 })
        return (
          <section>
            {state.get() ? <b data-branch="yes">yes</b> : <i data-branch="no">no</i>}
            <span data-stable="">stable</span>
          </section>
        )
      }
    `
    const generated = compileSource(source, 'es6', 'compiled-real-boundary.tsx')
    expect(generated).not.toContain('rue:text-hole')

    compiledRuntime.setReactiveScheduling('sync')
    vaporRuntime.setReactiveScheduling('sync')
    const compiled = evaluateSource<BoundaryReuseModule>(source)
    const owner = compiledRuntime.createOwner()
    const host = document.createElement('main')
    const handle = compiledRuntime.runWithOwner(owner, () => compiled.Example())
    if (handle == null) throw new Error('Expected compiled boundary handle')
    const root = handle.__rue_compiled_mount(host) as HTMLElement
    if (root.parentNode !== host) host.appendChild(root)
    const stable = root.querySelector('[data-stable]')
    if (stable == null) throw new Error('Expected a stable successor')
    expect(root.childNodes).toHaveLength(2)
    expect(Array.from(root.childNodes).some(node => node.nodeType === Node.COMMENT_NODE)).toBe(
      false,
    )

    const insertBefore = vi.spyOn(root, 'insertBefore')
    const removeChild = vi.spyOn(root, 'removeChild')
    const records: MutationRecord[] = []
    const observer = new MutationObserver(batch => records.push(...batch))
    observer.observe(root, { childList: true })

    for (let index = 0; index < 1_000; index += 1) {
      compiled.state.set(index % 2 === 1)
      expect(root.lastChild).toBe(stable)
      expect(root.querySelectorAll('[data-branch]')).toHaveLength(1)
    }
    await Promise.resolve()
    observer.disconnect()

    expect(insertBefore).toHaveBeenCalledTimes(1_000)
    expect(removeChild).toHaveBeenCalledTimes(1_000)
    expect(records.reduce((count, record) => count + record.addedNodes.length, 0)).toBe(1_000)
    expect(records.reduce((count, record) => count + record.removedNodes.length, 0)).toBe(1_000)
    expect(root.lastChild).toBe(stable)
    expect(Array.from(root.childNodes).some(node => node.nodeType === Node.COMMENT_NODE)).toBe(
      false,
    )

    handle.dispose()
    compiledRuntime.disposeOwner(owner)
    expect(compiled.trace.cleanupRuns).toBe(1)
    expect(host.childNodes).toHaveLength(0)
  })

  it('tracks explicit root replacement through a compiled prop signal', () => {
    compiledRuntime.setReactiveScheduling('sync')
    const source = runtimeRoot.ref({ open: false })
    const prop = compiledRuntime.signal(source.value)
    const open = compiledRuntime.computed(() => prop.get().open)
    const seen: boolean[] = []
    const watcher = compiledRuntime.effect(() => seen.push(open.get()))

    source.value = { open: true }
    prop.set(source.value)

    expect(seen).toEqual([false, true])
    watcher.dispose()
    open.dispose()
    prop.dispose()
  })

  it('renders_unknown_literal_sibling_cases_as_empty_and_reuses_one_branch_effect', () => {
    compiledRuntime.setReactiveScheduling('sync')
    vaporRuntime.setReactiveScheduling('sync')

    const source = `
import { ref } from '@rue-js/rue'
export const state = ref('preview')
export function Example() {
  return <div>
    {state.value === 'code' && <span data-case="code">code</span>}
    {state.value === 'preview' && <span data-case="preview">preview</span>}
  </div>
}
`
    const generated = compileSource(source, 'es6', 'literal-sibling-branches.tsx')
    expect(generated.match(/_\$compiledBranchAt\(/g)).toHaveLength(1)

    const compiled = evaluateSource<{
      Example: () => compiledRuntime.CompiledRootHandle
      state: { value: string }
    }>(source)
    const host = document.createElement('main')
    const owner = compiledRuntime.createOwner()
    const handle = compiledRuntime.runWithOwner(owner, () => compiled.Example())
    if (handle == null) throw new Error('Expected a compiled sibling branch handle')
    const root = handle.__rue_compiled_mount(host)
    if (root != null && root.parentNode !== host) host.appendChild(root)

    expect(host.querySelector('[data-case]')?.getAttribute('data-case')).toBe('preview')
    compiled.state.value = 'code'
    expect(host.querySelectorAll('[data-case]')).toHaveLength(1)
    expect(host.querySelector('[data-case]')?.getAttribute('data-case')).toBe('code')
    compiled.state.value = 'unknown'
    expect(host.querySelectorAll('[data-case]')).toHaveLength(0)
    compiled.state.value = 'preview'
    expect(host.querySelector('[data-case]')?.getAttribute('data-case')).toBe('preview')

    handle.dispose()
    compiledRuntime.disposeOwner(owner)
  })

  it('updates_compiled_branches_from_all_supported_rue_reactive_sources', () => {
    compiledRuntime.setReactiveScheduling('sync')
    vaporRuntime.setReactiveScheduling('sync')

    for (const reactiveCase of cases) {
      const esm = compile(reactiveCase, 'es6')
      expect(esm, reactiveCase.name).toContain('_$compiledRoot(')
      expect(esm, reactiveCase.name).toContain('_$compiledBranchAt(')
      expect(esm, reactiveCase.name).toMatch(/(?:_\$compiledText|renderAnchor)\(/)
      expect(esm, reactiveCase.name).toContain('effect(')
      expect(esm, reactiveCase.name).toContain('@rue-js/rue/internal/component')

      const compiled = evaluate(reactiveCase)
      const host = document.createElement('main')
      document.body.appendChild(host)
      const dispose = mount(compiled, host)

      const section = host.querySelector('section')
      expect(section?.getAttribute('data-value'), reactiveCase.name).toBe('one')
      expect(section?.querySelector('[data-text]')?.textContent, reactiveCase.name).toBe('one')
      expect(
        section?.querySelector('[data-branch]')?.getAttribute('data-branch'),
        reactiveCase.name,
      ).toBe('one')

      compiled.trace.set('two')
      expect(section?.getAttribute('data-value'), reactiveCase.name).toBe('two')
      expect(section?.querySelector('[data-text]')?.textContent, reactiveCase.name).toBe('two')
      expect(section?.querySelectorAll('[data-branch]'), reactiveCase.name).toHaveLength(1)
      expect(
        section?.querySelector('[data-branch]')?.getAttribute('data-branch'),
        reactiveCase.name,
      ).toBe('two')

      compiled.trace.set('one')
      expect(section?.querySelectorAll('[data-branch]'), reactiveCase.name).toHaveLength(1)
      expect(
        section?.querySelector('[data-branch]')?.getAttribute('data-branch'),
        reactiveCase.name,
      ).toBe('one')
      expect(compiled.trace.setupRuns, reactiveCase.name).toBe(1)

      dispose()
      expect(compiled.trace.cleanupRuns, reactiveCase.name).toBe(1)
      host.remove()
    }
  })

  it('retains_branch_state_and_disposes_reactive_owners_once', () => {
    compiledRuntime.setReactiveScheduling('sync')
    vaporRuntime.setReactiveScheduling('sync')

    const compiled = evaluate(cases[0])
    const host = document.createElement('main')
    document.body.appendChild(host)
    const dispose = mount(compiled, host)
    const section = host.querySelector('section')
    if (section == null) throw new Error('Expected a compiled section root')
    const insertBefore = vi.spyOn(section, 'insertBefore')

    compiled.trace.set('two')
    const writesAfterChange = insertBefore.mock.calls.length
    compiled.trace.set('two')
    expect(insertBefore).toHaveBeenCalledTimes(writesAfterChange)
    compiled.trace.set('one')
    expect(host.querySelectorAll('[data-branch]')).toHaveLength(1)
    expect(host.querySelector('[data-branch]')?.getAttribute('data-branch')).toBe('one')
    expect(compiled.trace.setupRuns).toBe(1)

    const writesBeforeDispose = insertBefore.mock.calls.length
    dispose()
    dispose()
    expect(host.childNodes).toHaveLength(0)
    expect(compiled.trace.cleanupRuns).toBe(1)

    compiled.trace.set('two')
    expect(host.childNodes).toHaveLength(0)
    expect(insertBefore).toHaveBeenCalledTimes(writesBeforeDispose)
  })

  it('compiles and updates a props conditional index-key list as one compiled region', async () => {
    const source = `

      type Video = { title: string; desc: string }
      type Props = { videos: Video[]; emptyHeading?: string }

      export const VideoList = (p: Props) => (
        <div>
          <div>{p.videos.length} videos</div>
          {p.videos.length === 0 ? (
            <span>{p.emptyHeading || 'empty'}</span>
          ) : (
            <ul>
              {p.videos.map((video, index) => (
                <li key={index} data-title={video.title}>
                  <b>{video.title}</b>
                  <small>{video.desc}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      )

      export const state: Props = { videos: [], emptyHeading: 'none' }
    `
    const esm = compileSource(source, 'es6', 'compiled-props-video-list.tsx')
    expect(esm).toContain('_$compiledBranchAt(')
    expect(esm).toContain('_$reconcileKeyedSingle(')
    expect(esm).not.toContain('watchEffect')
    expect(esm).not.toContain('_$compiledKeyedList')
    expect(esm).not.toMatch(/\bvapor\(/)

    compiledRuntime.setReactiveScheduling('sync')
    vaporRuntime.setReactiveScheduling('sync')
    const compiled = evaluateSource<VideoListModule>(source)
    const props = createCompiledProps(compiled.state)
    const owner = compiledRuntime.createOwner()
    const host = document.createElement('main')
    let root: HTMLElement | undefined
    compiledRuntime.runWithOwner(owner, () => {
      const handle = compiled.VideoList(props.props)
      root = handle.__rue_compiled_mount(host) as HTMLElement
      host.appendChild(root)
    })
    if (!root) throw new Error('Expected compiled VideoList root')

    expect(root.textContent).toBe('0 videosnone')
    props.update({
      ...props.snapshot(),
      videos: [
        { title: 'one', desc: 'first' },
        { title: 'two', desc: 'second' },
      ],
    })
    await Promise.resolve()
    expect(root.textContent).toBe('2 videosonefirsttwosecond')
    const initialRows = Array.from(root.querySelectorAll('li'))

    props.update({
      ...props.snapshot(),
      videos: [
        { title: 'TWO', desc: 'SECOND' },
        { title: 'ONE', desc: 'FIRST' },
      ],
    })
    await Promise.resolve()
    const patchedRows = Array.from(root.querySelectorAll('li'))
    expect(patchedRows[0]).toBe(initialRows[0])
    expect(patchedRows[1]).toBe(initialRows[1])
    expect(root.textContent).toBe('2 videosTWOSECONDONEFIRST')

    props.update({ ...props.snapshot(), videos: [] })
    await Promise.resolve()
    expect(root.textContent).toBe('0 videosnone')
    expect(initialRows.every(row => !row.isConnected)).toBe(true)
    props.dispose()
    compiledRuntime.disposeOwner(owner)
  })

  it('refreshes a same-path component branch when a resource-like snapshot changes repeatedly', () => {
    const source = `
      import { signal } from '@rue-js/rue'

      const rows = signal(['main:first'])
      export const setRows = value => rows.set(value)

      export const ResourceList = () => {
        const snapshot = rows.get()
        if (!snapshot.length) return <p>empty</p>
        return <ul>{snapshot.map(value => <li>{value}</li>)}</ul>
      }
    `

    compiledRuntime.setReactiveScheduling('sync')
    vaporRuntime.setReactiveScheduling('sync')
    const compiled = evaluateSource<RepeatedResourceListModule>(source)
    const owner = compiledRuntime.createOwner()
    const host = document.createElement('main')
    compiledRuntime.runWithOwner(owner, () => {
      const handle = compiled.ResourceList()
      const root = handle.__rue_compiled_mount(host)
      if (root != null && root.parentNode !== host) host.appendChild(root)
    })

    expect(host.textContent).toBe('main:first')
    compiled.setRows(['beta:first'])
    expect(host.textContent).toBe('beta:first')
    compiled.setRows(['stable:first'])
    expect(host.textContent).toBe('stable:first')
    compiled.setRows(['main:second'])
    expect(host.textContent).toBe('main:second')

    compiledRuntime.disposeOwner(owner)
  })
})
