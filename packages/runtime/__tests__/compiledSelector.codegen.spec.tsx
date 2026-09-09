// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import swc from '@swc/core'
import { afterEach, describe, expect, it } from 'vitest'

import {
  createOwner as createCompiledOwner,
  createSelector as createCompiledSelector,
  disposeOwner as disposeCompiledOwner,
  effect as compiledEffect,
  onCleanup as compiledOnCleanup,
  onOwnerCleanup as compiledOnOwnerCleanup,
  runWithOwner as runWithCompiledOwner,
  setReactiveScheduling,
  signal,
} from '../src/runtime-core/compiled'
import { _$reconcileKeyedSingle } from '../src/compiler-runtime/compact-keyed-list'
import {
  _$compiledAppendChild,
  _$compiledCreateComment,
  _$compiledCreateElement,
  _$compiledCreateTextNode,
} from '../src/internal'
import * as compilerInternalRuntime from '../src/compiler-internal'

void createCompiledSelector
void compiledOnCleanup

type Row = { readonly key: number; readonly id: number; label: string }

const pluginPath = resolve(process.cwd(), 'packages/swc-plugin-rue/swc-plugin-rue.wasm')

const compile = (source: string): string => {
  expect(readFileSync(pluginPath).byteLength).toBeGreaterThan(0)
  return swc.transformSync(source, {
    filename: 'compiled-selector-codegen.tsx',
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
    module: { type: 'es6' },
  }).code
}

const source = `
export const View = () => (
  <tbody>
    {rows.get().map(row => (
      <tr
        key={row.id}
        className={row.id === selected.get() ? 'danger' : ''}
        onClick={() => onRowClick(row.id)}
        onMouseOver={() => onRowMouseOver(row.id)}
      >
        <td>{row.label}</td>
      </tr>
    ))}
  </tbody>
)
`

const stripModuleSyntax = (output: string): string =>
  output
    .replace(/import\s*\{[^}]*\}\s*from\s*["'][^"']+["'];?/g, '')
    .replace(/export\s+const\s+/g, 'const ')

const flushCompiledEffects = async (): Promise<void> => {
  const tick = (): Promise<void> =>
    typeof requestAnimationFrame === 'function'
      ? new Promise(resolveFrame => requestAnimationFrame(() => resolveFrame()))
      : Promise.resolve()
  await tick()
  await tick()
  await tick()
}

afterEach(() => {
  setReactiveScheduling('frame')
  document.body.innerHTML = ''
})

describe('compiled selector codegen', () => {
  it('updates only the previous and next selected rows and disposes deleted row effects', async () => {
    const output = compile(source)
    const compiledImport = output.match(
      /import\s*\{([^}]*)\}\s*from\s*["']@rue-js\/rue\/internal\/compiler["']/,
    )
    for (const helper of [
      '_$mountCompiledKeyedSingleRowOwnerless',
      'createSelector',
      '_$reconcileKeyedSingle',
    ]) {
      expect(compiledImport?.[1]).toContain(helper)
    }
    expect(compiledImport?.[1]).not.toContain('_$mountCompiledKeyedRowSetup')
    expect(compiledImport?.[1]).not.toMatch(/(?:^|,)\s*effect\s*(?:,|$)/)
    for (const helper of ['createOwner', 'disposeOwner', 'runWithOwner']) {
      expect(compiledImport?.[1]).not.toContain(helper)
    }
    expect(output).not.toContain('watchEffect')
    expect(output).not.toContain('_$compiledKeyedList')
    expect(output.match(/\bcreateOwner\(\)/g)).toBeNull()
    expect(output.match(/\bdisposeOwner\(/g)).toBeNull()
    expect(output).toContain('.subscribe(')
    expect(output).toContain('onOwnerCleanup(')

    let selectorBindingRuns = 0
    const clickEvents: number[] = []
    const mouseOverEvents: number[] = []
    const makeRow = (key: number, label = `row ${key}`): Row => ({ key, id: key, label })
    const initial = Array.from({ length: 1_000 }, (_, index) => makeRow(index + 1))
    const rows = signal<Row[]>(initial)
    const selected = signal<number | undefined>(undefined)

    let reconcileRuns = 0
    const reconcile: typeof _$reconcileKeyedSingle = (...args) => {
      reconcileRuns += 1
      return _$reconcileKeyedSingle(...args)
    }

    const activeEffects = new Set<number>()
    const trackedEffect: typeof compiledEffect = (callback, options) => {
      const handle = compiledEffect(callback, options)
      const id = handle.id!
      activeEffects.add(id)
      compiledOnOwnerCleanup(() => activeEffects.delete(id))
      const dispose = () => {
        handle.dispose()
        activeEffects.delete(id)
      }
      return {
        id,
        dispose,
        free: dispose,
        [Symbol.dispose]: dispose,
      }
    }

    const executable = `${stripModuleSyntax(output)}\nreturn View;`
    const bindings = {
      ...compilerInternalRuntime,
      rows,
      selected,
      onRowClick: (id: number) => clickEvents.push(id),
      onRowMouseOver: (id: number) => mouseOverEvents.push(id),
      effect: trackedEffect,
      createSelector: createCompiledSelector,
      _$compiledRenderEffect: compilerInternalRuntime._$compiledRenderEffect,
      _$reconcileKeyedSingle: reconcile,
      String: (value: unknown) => {
        selectorBindingRuns += 1
        return String(value)
      },
    }
    const names = Object.keys(bindings)
    const factory = new Function(...names, executable)
    const View = factory(...names.map(name => bindings[name as keyof typeof bindings])) as () => {
      __rue_compiled_mount(parent: ParentNode): HTMLTableSectionElement
    }

    const debugBefore = compilerInternalRuntime.__rueGetCompiledReactiveDebugState()
    const rootOwner = createCompiledOwner()
    const host = document.createElement('table')
    let tbody: HTMLTableSectionElement | undefined
    runWithCompiledOwner(rootOwner, () => {
      const handle = View()
      tbody = handle.__rue_compiled_mount(host)
      host.appendChild(tbody)
    })
    if (!tbody) throw new Error('Expected compiled tbody')
    expect(tbody.querySelectorAll('tr')).toHaveLength(1_000)
    expect(activeEffects.size).toBe(0)
    const firstRow = tbody.querySelectorAll('tr')[0]!
    firstRow.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    firstRow.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    expect({ clickEvents, mouseOverEvents }).toEqual({
      clickEvents: [1],
      mouseOverEvents: [1],
    })

    selectorBindingRuns = 0
    reconcileRuns = 0
    const mutations: MutationRecord[] = []
    const observer = new MutationObserver(records => mutations.push(...records))
    observer.observe(tbody, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    })

    selected.set(125)
    await flushCompiledEffects()
    mutations.push(...observer.takeRecords())
    const firstSelection = { selectorBindingRuns, reconcileRuns, mutations: mutations.length }
    expect(firstSelection).toEqual({
      selectorBindingRuns: 1,
      reconcileRuns: 0,
      mutations: 1,
    })
    expect(tbody.querySelectorAll('tr')[124]?.className).toBe('danger')

    selectorBindingRuns = 0
    selected.set(125)
    await flushCompiledEffects()
    expect(selectorBindingRuns).toBe(0)

    selectorBindingRuns = 0
    mutations.length = 0
    selected.set(875)
    await flushCompiledEffects()
    mutations.push(...observer.takeRecords())
    const selectionSwitch = { selectorBindingRuns, reconcileRuns, mutations: mutations.length }
    expect(selectionSwitch).toEqual({
      selectorBindingRuns: 2,
      reconcileRuns: 0,
      mutations: 2,
    })

    selectorBindingRuns = 0
    mutations.length = 0
    rows.set(initial.map(row => (row.key === 500 ? makeRow(500, 'row 500 updated') : row)))
    await flushCompiledEffects()
    mutations.push(...observer.takeRecords())
    expect(reconcileRuns).toBe(1)
    expect(tbody.querySelectorAll('tr')[499]?.textContent).toBe('row 500 updated')
    expect(mutations).toHaveLength(1)

    const retained = tbody.querySelectorAll('tr')[499]!
    retained.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(clickEvents.at(-1)).toBe(500)

    rows.set([rows.peek()[1]!, rows.peek()[0]!, ...rows.peek().slice(2)])
    await flushCompiledEffects()
    expect(tbody.querySelectorAll('tr')[0]?.textContent).toBe('row 2')

    mutations.length = 0
    const removedSelectedRow = tbody.querySelectorAll('tr')[874]!
    rows.set(rows.peek().filter(row => row.key !== 875))
    await flushCompiledEffects()
    const afterSelectedRowRemoval = { effects: activeEffects.size }
    expect(afterSelectedRowRemoval).toEqual({ effects: 0 })
    removedSelectedRow.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    removedSelectedRow.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    expect({ clickEvents, mouseOverEvents }).toEqual({
      clickEvents: [1, 500],
      mouseOverEvents: [1],
    })
    selectorBindingRuns = 0
    reconcileRuns = 0
    selected.set(1)
    await flushCompiledEffects()
    expect(selectorBindingRuns).toBe(1)
    expect(reconcileRuns).toBe(0)

    selectorBindingRuns = 0
    rows.set([])
    await flushCompiledEffects()
    expect(tbody.querySelectorAll('tr')).toHaveLength(0)
    expect(tbody.childNodes).toHaveLength(1)
    expect(activeEffects.size).toBe(0)
    firstRow.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    firstRow.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    selected.set(2)
    await flushCompiledEffects()
    expect(selectorBindingRuns).toBe(0)
    expect({ clickEvents, mouseOverEvents }).toEqual({
      clickEvents: [1, 500],
      mouseOverEvents: [1],
    })

    rows.set([makeRow(2, 'row 2 rebuilt')])
    await flushCompiledEffects()
    expect(tbody.querySelector('tr')?.className).toBe('danger')
    expect(tbody.querySelector('tr')?.textContent).toBe('row 2 rebuilt')

    console.info('[compiled selector codegen]', {
      firstSelection,
      selectionSwitch,
      afterSelectedRowRemoval,
      survivingSelectionRuns: selectorBindingRuns,
    })

    observer.disconnect()
    disposeCompiledOwner(rootOwner)
    expect(compilerInternalRuntime.__rueGetCompiledReactiveDebugState()).toEqual(debugBefore)
  })

  it('detaches a direct selector subscription when its initial callback throws', () => {
    setReactiveScheduling('sync')
    const selected = signal(1)
    const owner = createCompiledOwner()
    let runs = 0
    runWithCompiledOwner(owner, () => {
      const isSelected = createCompiledSelector(() => selected.get())
      expect(() =>
        isSelected.subscribe(() => {
          runs += 1
          isSelected(1)
          throw new Error('selector setup failed')
        }),
      ).toThrow('selector setup failed')
    })

    selected.set(2)
    expect(runs).toBe(1)
    disposeCompiledOwner(owner)
  })

  it('does not optimize complex, callable, multi-external, or non-key comparisons', () => {
    for (const expression of [
      "normalize(row.id) === selected.get() ? 'danger' : ''",
      "row.id === getSelected() ? 'danger' : ''",
      "row.id === selected.get() && enabled.get() ? 'danger' : ''",
      "row.group === selected.get() ? 'danger' : ''",
    ]) {
      const output = compile(`
        export const View = () => (
          <tbody>{rows.get().map(row => <tr key={row.id} className={${expression}}>{row.label}</tr>)}</tbody>
        )
      `)
      expect(output).not.toContain('createSelector')
      expect(output).not.toContain('runWithOwner')
    }
  })
})
