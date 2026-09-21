// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import swc from '@swc/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as compiledRuntime from '../src/internal'
import * as runtimeRoot from '../src'
import { resolveCompilerCapability } from './compiler-capability-test-runtime'

type ControlFlowModule = {
  Region: (props: { phase: 'empty' | 'active' }) => compiledRuntime.CompiledComponentHandle<{
    phase: 'empty' | 'active'
  }>
  trace: {
    cleanupRuns: number
    setState(value: 'left' | 'right'): void
    setupRuns: number
  }
}

const pluginPath = resolve(process.cwd(), 'packages/swc-plugin-rue/swc-plugin-rue.wasm')

const source = `
import { onScopeDispose, ref } from '@rue-js/rue'

export const trace = {
  cleanupRuns: 0,
  setupRuns: 0,
  setState: value => {},
}

function createInitialState() {
  trace.setupRuns += 1
  onScopeDispose(() => trace.cleanupRuns += 1)
  return 'left'
}

export function Region(props) {
  if (props.phase === 'empty') return <p data-branch="empty">empty</p>

  const state = ref(createInitialState())
  trace.setState = value => state.value = value
  if (state.value === 'left') return <p data-branch="left">left</p>
  return <p data-branch="right">right</p>
}
`

const compile = (moduleType: 'es6' | 'commonjs', input = source): string => {
  expect(readFileSync(pluginPath).byteLength).toBeGreaterThan(0)
  return swc.transformSync(input, {
    filename: 'compiled-control-flow-setup.tsx',
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

const evaluate = (): ControlFlowModule => {
  const module = { exports: {} as Record<string, unknown> }
  const runtimeRequire = (id: string): Record<string, unknown> => {
    const capability = resolveCompilerCapability(id)
    if (capability) return capability as Record<string, unknown>
    throw new Error(`Unexpected generated import: ${id}`)
  }
  new Function('require', 'module', 'exports', compile('commonjs'))(
    runtimeRequire,
    module,
    module.exports,
  )
  return module.exports as ControlFlowModule
}

afterEach(() => {
  compiledRuntime.setReactiveScheduling('frame')
  runtimeRoot.setReactiveScheduling('frame')
  document.body.innerHTML = ''
})

describe('compiled control-flow setup regions', () => {
  it('keeps_compiled_only_branches_off_the_vapor_hook_path', () => {
    const output = compile(
      'es6',
      `
        export function PlainBranch(props) {
          if (props.active) return <p>active</p>
          return <p>idle</p>
        }
      `,
    )

    expect(output).toContain('from "@rue-js/rue/internal/component"')
    expect(output).toContain('_$compiledBranch(')
    expect(output).not.toContain('_$withCompiledHookScope(')
    expect(output).not.toContain('useSetup(')
    expect(output).not.toContain('watchEffect(')
    expect(output).not.toContain('@rue-js/runtime-vapor')
    expect(output).not.toContain('from "@rue-js/rue/vapor"')
    expect(output).not.toContain('@rue-js/jsx-runtime')
  })

  it('tracks setup once and commits each branch transition with one host insertion', () => {
    compiledRuntime.setReactiveScheduling('sync')
    runtimeRoot.setReactiveScheduling('sync')

    const esm = compile('es6')
    expect(esm).toContain('_$compiledBranch(')
    expect(esm).toContain('_$withCompiledHookScope(')
    expect(esm).toContain('_$compiledSetup(')
    expect(esm).not.toContain('vapor(')
    expect(esm).not.toContain('_$createElement')
    expect(esm).not.toContain('_$compiledMarkComponentRenderReactive')

    const compiled = evaluate()
    const handle = compiled.Region({ phase: 'empty' })
    const host = document.createElement('main')
    const insertBefore = vi.spyOn(host, 'insertBefore')
    document.body.appendChild(host)
    handle.__rue_compiled_mount(host)

    expect(host.querySelector('[data-branch]')?.textContent).toBe('empty')
    expect(compiled.trace).toMatchObject({ setupRuns: 0, cleanupRuns: 0 })
    expect(insertBefore).toHaveBeenCalledTimes(1)

    handle[compiledRuntime.RUE_COMPILED_UPDATE_PROPS_KEY]({ phase: 'active' })
    expect(host.querySelector('[data-branch]')?.textContent).toBe('left')
    expect(compiled.trace).toMatchObject({ setupRuns: 1, cleanupRuns: 0 })
    expect(insertBefore).toHaveBeenCalledTimes(2)

    compiled.trace.setState('right')
    expect(host.querySelectorAll('[data-branch]')).toHaveLength(1)
    expect(host.querySelector('[data-branch]')?.textContent).toBe('right')
    expect(compiled.trace).toMatchObject({ setupRuns: 1, cleanupRuns: 0 })
    expect(insertBefore).toHaveBeenCalledTimes(3)

    handle[compiledRuntime.RUE_COMPILED_UPDATE_PROPS_KEY]({ phase: 'empty' })
    handle[compiledRuntime.RUE_COMPILED_UPDATE_PROPS_KEY]({ phase: 'active' })
    expect(host.querySelectorAll('[data-branch]')).toHaveLength(1)
    expect(host.querySelector('[data-branch]')?.textContent).toBe('right')
    expect(compiled.trace).toMatchObject({ setupRuns: 1, cleanupRuns: 0 })
    expect(insertBefore).toHaveBeenCalledTimes(5)

    handle.dispose()
    handle.dispose()
    expect(host.childNodes).toHaveLength(0)
    expect(compiled.trace.cleanupRuns).toBe(1)

    compiled.trace.setState('left')
    handle[compiledRuntime.RUE_COMPILED_UPDATE_PROPS_KEY]({ phase: 'empty' })
    expect(host.childNodes).toHaveLength(0)
    expect(compiled.trace).toMatchObject({ setupRuns: 1, cleanupRuns: 1 })
    expect(insertBefore).toHaveBeenCalledTimes(5)
  })
})
