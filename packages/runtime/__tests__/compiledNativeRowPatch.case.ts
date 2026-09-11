import { resolveCompilerCapability } from './compiler-capability-test-runtime'
// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import swc from '@swc/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createOwner, disposeOwner, runWithOwner, signal } from '../src/runtime-core/compiled'
import type { _$compiledRoot } from '../src/compiler-runtime/block'
import * as compilerInternalRuntime from '../src/compiler-internal'

type Row = { id: number; label: string; className: string }

const pluginPath = resolve(process.cwd(), 'packages/swc-plugin-rue/swc-plugin-rue.wasm')

const compile = (source: string): string => {
  expect(readFileSync(pluginPath).byteLength).toBeGreaterThan(0)
  return swc.transformSync(source, {
    filename: 'compiled-native-row-patch.tsx',
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

const stripModuleSyntax = (output: string): string =>
  output
    .replace(/import\s*\{[^}]*\}\s*from\s*["'][^"']+["'];?/g, '')
    .replace(/export\s+const\s+/g, 'const ')

const capabilityBindings = (output: string): Record<string, any> =>
  Object.assign(
    {},
    ...[...output.matchAll(/import\s*\{[^}]*\}\s*from\s*["']([^"']+)["']/g)].map(match => {
      const capability = resolveCompilerCapability(match[1])
      if (!capability) throw new Error(`Unexpected compiler import: ${match[1]}`)
      return capability
    }),
  )

const evaluateView = (output: string, rows: ReturnType<typeof signal<Row[]>>, capture: unknown) => {
  const bindings = capabilityBindings(output)
  return new Function(
    'rows',
    'capture',
    ...Object.keys(bindings),
    `${stripModuleSyntax(output)}\nreturn View;`,
  )(rows, capture, ...Object.values(bindings)) as () => ReturnType<typeof _$compiledRoot>
}

const flush = async (): Promise<void> => {
  const tick = (): Promise<void> =>
    typeof requestAnimationFrame === 'function'
      ? new Promise(resolveFrame => requestAnimationFrame(() => resolveFrame()))
      : Promise.resolve()
  await tick()
  await tick()
  await tick()
}

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('compiled simple native row patch', () => {
  it('reuses isolated template Text without replacement or connected sentinel leakage', async () => {
    const output = compile(`export const View = () => <ul>{rows.get().map(row =>
      <li key={row.id}><a onClick={() => capture(row)}>{row.label}</a></li>
    )}</ul>`)
    const rows = signal<Row[]>([
      { id: 1, label: 'first', className: '' },
      { id: 2, label: 'second', className: '' },
    ])
    const capture = vi.fn()
    const View = evaluateView(output, rows, capture)
    const host = document.createElement('div')
    document.body.appendChild(host)
    const created = vi.spyOn(document, 'createTextNode')
    const insert = Node.prototype.insertBefore
    const inserted = vi.spyOn(Node.prototype, 'insertBefore').mockImplementation(function <
      T extends Node,
    >(this: Node, node: T, anchor: Node | null): T {
      if (this.isConnected) expect(node.textContent).not.toContain('rue:row-text')
      return insert.call(this, node, anchor) as T
    })
    const removed = vi.spyOn(Node.prototype, 'removeChild')
    const append = Node.prototype.appendChild
    vi.spyOn(Node.prototype, 'appendChild').mockImplementation(function <T extends Node>(
      this: Node,
      node: T,
    ): T {
      if (this.isConnected) expect(node.textContent).not.toContain('rue:row-text')
      return append.call(this, node) as T
    })
    const handle = View()
    host.appendChild(handle.__rue_compiled_mount(host)!)
    const anchors = [...host.querySelectorAll('a')]
    const texts = anchors.map(a => a.firstChild)
    expect(anchors.map(a => a.textContent)).toEqual(['first', 'second'])
    expect(created.mock.calls.filter(([value]) => value === '')).toHaveLength(0)
    expect(inserted.mock.calls.filter(([node]) => node.nodeType === Node.TEXT_NODE)).toHaveLength(0)
    expect(removed.mock.calls.filter(([node]) => node.nodeType === Node.COMMENT_NODE)).toHaveLength(
      0,
    )
    for (const label of ['', null, false, true, undefined, 'latest']) {
      const replacement = { id: 1, label, className: '' } as Row
      rows.set([{ id: 2, label: 'second', className: '' }, replacement])
      await flush()
      expect([...host.querySelectorAll('a')]).toEqual([anchors[1], anchors[0]])
      expect(anchors[0].firstChild).toBe(texts[0])
      expect(anchors[0].textContent).toBe(typeof label === 'string' ? label : '')
      anchors[0].click()
      expect(capture).toHaveBeenLastCalledWith(replacement)
      expect(host.textContent).not.toContain('rue:row-text')
    }
    handle.dispose()
  })

  it('preserves adjacent static and multiple dynamic text through updates', async () => {
    const output = compile(`export const View = () => <ul>{rows.get().map(row =>
      <li key={row.id}><a>prefix{row.label}</a><span>{row.label}{row.id}</span></li>
    )}</ul>`)
    expect(output).not.toContain('rue:row-text')
    expect(output).toContain('rue:text-hole')
    const rows = signal<Row[]>([{ id: 1, label: 'first', className: '' }])
    const View = evaluateView(output, rows, vi.fn())
    const host = document.createElement('div')
    const handle = View()
    host.appendChild(handle.__rue_compiled_mount(host)!)
    expect(host.querySelector('li')!.textContent).toBe('prefixfirstfirst1')
    rows.set([{ id: 1, label: '', className: '' }])
    await flush()
    expect(host.querySelector('li')!.textContent).toBe('prefix1')
    handle.dispose()
  })

  it('reuses mount results through real SWC batch creation, append and replacement', async () => {
    const output = compile(`export const View = () => <ul>{rows.get().map(row =>
      <li key={row.id} onClick={() => capture(row)}>{row.label}</li>
    )}</ul>`)
    expect(output).toContain('_$mountCompiledKeyedSingleRowOwnerless(')
    const names = [...output.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'][^"']+["']/g)].flatMap(
      match => match[1].split(',').map(name => name.trim()),
    )
    const mounted: unknown[] = []
    const reconciled: unknown[] = []
    const actual = capabilityBindings(output)
    const bindings = {
      ...actual,
      _$mountCompiledKeyedSingleRowOwnerless: (
        ...args: Parameters<typeof compilerInternalRuntime._$mountCompiledKeyedSingleRowOwnerless>
      ) => {
        const result = actual._$mountCompiledKeyedSingleRowOwnerless(...args)
        mounted.push(result)
        return result
      },
      _$reconcileKeyedSingle: (
        ...args: Parameters<typeof compilerInternalRuntime._$reconcileKeyedSingle>
      ) => {
        const result = actual._$reconcileKeyedSingle(...args)
        reconciled.splice(0, reconciled.length, ...result)
        return result
      },
    }
    const rows = compilerInternalRuntime.signal<Row[]>([])
    const capture = vi.fn()
    const View = new Function(
      'rows',
      'capture',
      ...names,
      `${stripModuleSyntax(output)}; return View;`,
    )(rows, capture, ...names.map(name => bindings[name as keyof typeof bindings]))
    const host = document.createElement('div')
    const handle = View()
    host.appendChild(handle.__rue_compiled_mount(host)!)
    try {
      for (const phase of ['create', 'append', 'replace']) {
        const offset = mounted.length
        const added = Array.from({ length: 1000 }, (_, i) => ({
          id: offset + i,
          label: String(offset + i),
          className: '',
        }))
        rows.set(phase === 'append' ? rows.peek().concat(added) : added)
        await flush()
        expect(host.querySelectorAll('li')).toHaveLength(rows.peek().length)
        expect(mounted).toHaveLength(offset + 1000)
        for (let i = 0; i < 1000; i++)
          expect(reconciled[phase === 'append' ? i + 1000 : i]).toBe(mounted[offset + i])
        const elements = [...host.querySelectorAll('li')]
        expect(elements.map(node => node.textContent)).toEqual(rows.peek().map(row => row.label))
        const last = elements[elements.length - 1]
        expect(last.textContent).toBe(added[999].label)
        last.click()
        expect(capture).toHaveBeenLastCalledWith(added[999])
      }
    } finally {
      handle.dispose()
      rows.dispose()
    }
  })

  it('mounts delegated-event and selector row factories and releases their owners', async () => {
    const output = compile(`
      export const View = () => <ul>{rows.get().map(row =>
        <li key={row.id} onClick={() => capture(row)}
          className={row.id === capture.get() ? 'selected' : ''}>{row.label}</li>
      )}</ul>
    `)
    expect(output).toContain('_$mountCompiledKeyedSingleRowOwnerless(')
    expect(output).not.toContain('_$mountCompiledKeyedSingleRowSetup')
    expect(output).toContain('.subscribe(')
    const names = [...output.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'][^"']+["']/g)].flatMap(
      match => match[1].split(',').map(name => name.trim()),
    )
    const selected = compilerInternalRuntime.signal(-1)
    const capture = Object.assign(vi.fn(), { get: () => selected.get() })
    const rows = compilerInternalRuntime.signal<Row[]>([])
    const View = new Function(
      'rows',
      'capture',
      ...names,
      `${stripModuleSyntax(output)}; return View;`,
    )(rows, capture, ...names.map(name => capabilityBindings(output)[name]))
    const listeners = vi.spyOn(EventTarget.prototype, 'addEventListener')
    const removals = vi.spyOn(EventTarget.prototype, 'removeEventListener')
    const before = compilerInternalRuntime.__rueGetCompiledReactiveDebugState()
    const host = document.createElement('div')
    const handle = View()
    host.appendChild(handle.__rue_compiled_mount(host)!)
    const empty = compilerInternalRuntime.__rueGetCompiledReactiveDebugState()
    rows.set(Array.from({ length: 1000 }, (_, id) => ({ id, label: String(id), className: '' })))
    await flush()
    const mounted = compilerInternalRuntime.__rueGetCompiledReactiveDebugState()
    expect(mounted.activeOwners - empty.activeOwners, 'row owners').toBe(0)
    expect(mounted.activeEffects - empty.activeEffects, 'row effects').toBe(0)
    const first = host.querySelector('li')!
    const replacement = { id: 0, label: 'latest', className: '' }
    rows.set([replacement, ...rows.peek().slice(1)])
    selected.set(0)
    await flush()
    expect(host.querySelector('li')).toBe(first)
    expect(first.className).toBe('selected')
    first.click()
    expect(capture).toHaveBeenLastCalledWith(replacement)
    rows.set(rows.peek().slice(1))
    await flush()
    first.click()
    expect(capture).toHaveBeenCalledTimes(1)
    const retained = host.querySelector('li')!
    rows.set([])
    await flush()
    retained.click()
    expect(capture).toHaveBeenCalledTimes(1)
    expect(compilerInternalRuntime.__rueGetCompiledReactiveDebugState()).toEqual(empty)
    const rowClickCount = (spy: typeof listeners) =>
      spy.mock.calls.filter(
        ([type], index) => type === 'click' && spy.mock.contexts[index] instanceof HTMLLIElement,
      ).length
    const rootClickCount = (spy: typeof listeners) =>
      spy.mock.calls.filter(
        ([type], index) => type === 'click' && spy.mock.contexts[index] instanceof HTMLUListElement,
      ).length
    expect(rowClickCount(listeners), 'row click additions').toBe(0)
    expect(rootClickCount(listeners), 'root click additions').toBe(1)
    expect(rowClickCount(removals), 'row click removals').toBe(0)
    expect(rootClickCount(removals), 'root click removals').toBe(0)
    handle.dispose()
    expect(compilerInternalRuntime.__rueGetCompiledReactiveDebugState()).toEqual(before)

    rows.set([
      { id: 1, label: 'ok', className: '' },
      {
        id: 2,
        get label(): string {
          throw new Error('setup failed')
        },
        className: '',
      },
    ])
    const failing = View()
    expect(() => failing.__rue_compiled_mount(host)).toThrow('setup failed')
    expect(compilerInternalRuntime.__rueGetCompiledReactiveDebugState()).toEqual(before)
    expect(rowClickCount(listeners)).toBe(0)
    expect(rowClickCount(removals)).toBe(0)
    expect(host.querySelectorAll('li')).toHaveLength(0)
  })

  it('keeps event resources owned through the compiler capability entries', async () => {
    const output = compile(`export const View = () => <ul>{rows.get().map(row =>
      <li key={row.id} onClick={() => capture(row)}>{row.label}</li>
    )}</ul>`)
    const rows = signal<Row[]>([{ id: 1, label: 'one', className: '' }])
    const capture = vi.fn()
    const View = evaluateView(output, rows, capture)
    const host = document.createElement('div')
    const handle = View()
    host.appendChild(handle.__rue_compiled_mount(host)!)
    const first = host.querySelector('li')!
    first.click()
    const next = { id: 1, label: 'latest', className: '' }
    rows.set([next])
    await flush()
    first.click()
    expect(capture).toHaveBeenLastCalledWith(next)
    rows.set([])
    await flush()
    first.click()
    expect(capture).toHaveBeenCalledTimes(2)
    handle.dispose()
  })

  it('emits ownerless factories only for proven native rows', () => {
    const resourceFree = compile(`
      export const View = () => <ul>{rows.get().map(row =>
        <li key={row.id} className={row.className}>{row.label}</li>
      )}</ul>
    `)
    expect(resourceFree).toContain('_$mountCompiledKeyedSingleRowOwnerless(')
    expect(resourceFree).not.toContain('_$mountCompiledKeyedSingleRow(')
    expect(resourceFree).toContain('_$reconcileKeyedSingle')
    expect(resourceFree).not.toContain('_$reconcileKeyed,')
    expect(resourceFree).not.toContain('_$mountCompiledKeyedRowOwnerless')
    expect(resourceFree).not.toMatch(/return\s+_\$mountCompiledKeyedRow\s*\(/)
    expect(resourceFree.match(/_\$compiledScalarEffect\s*\(/g)).toHaveLength(1)

    for (const source of [
      `export const View = () => <ul>{rows.get().map(row => <li key={row.id} onClick={event => capture(event, row)}>{row.label}</li>)}</ul>`,
      `export const View = () => <ul>{rows.get().map(row => <li key={row.id} onClickCapture={() => capture(row)}>{row.label}</li>)}</ul>`,
      `export const View = () => <ul>{rows.get().map(row => <li key={row.id} onScroll={() => capture(row)}>{row.label}</li>)}</ul>`,
      `export const View = () => <ul>{rows.get().map(row => <li key={row.id} v-memo={[row.label]}>{row.label}</li>)}</ul>`,
      `const Row = ({label}) => <li>{label}</li>; export const View = () => <ul>{rows.get().map(row => <Row key={row.id} label={row.label} />)}</ul>`,
      `export const View = () => <ul>{rows.get().map(row => { onCleanup(() => capture(row)); return <li key={row.id}>{row.label}</li> })}</ul>`,
      `export const View = () => <ul>{rows.get().map(row => { effect(() => capture(row)); return <li key={row.id}>{row.label}</li> })}</ul>`,
    ]) {
      expect(compile(source)).not.toContain('_$mountCompiledKeyedSingleRowOwnerless')
    }
  })

  it('does not allocate row owners for 1k resource-free rows', async () => {
    const resourceFreeOutput = compile(`
      export const View = () => <ul>{rows.get().map(row =>
        <li key={row.id} className={row.className}>{row.label}</li>
      )}</ul>
    `)
    const before = compilerInternalRuntime.__rueGetCompiledReactiveDebugState()
    const rows = signal<Row[]>(
      Array.from({ length: 1000 }, (_, id) => ({
        id,
        label: String(id),
        className: id % 2 === 0 ? 'even' : 'odd',
      })),
    )
    const host = document.createElement('div')
    const handle = evaluateView(resourceFreeOutput, rows, undefined)()
    host.appendChild(handle.__rue_compiled_mount(host)!)

    expect(compilerInternalRuntime.__rueGetCompiledReactiveDebugState().activeOwners).toBe(
      before.activeOwners,
    )
    expect(compilerInternalRuntime.__rueGetCompiledReactiveDebugState().activeEffects).toBe(
      before.activeEffects,
    )

    rows.set(
      Array.from({ length: 1000 }, (_, offset) => ({
        id: offset + 1000,
        label: String(offset + 1000),
        className: 'replacement',
      })),
    )
    await flush()
    rows.set([])
    await flush()
    rows.set([{ id: 1, label: 'restored', className: 'restored' }])
    await flush()
    expect(compilerInternalRuntime.__rueGetCompiledReactiveDebugState().activeOwners).toBe(
      before.activeOwners,
    )
    handle.dispose()

    const failingRows = signal<Row[]>([
      {
        id: 1,
        get label(): string {
          throw new Error('row mount failed')
        },
        className: '',
      },
    ])
    const failingHandle = evaluateView(resourceFreeOutput, failingRows, undefined)()
    expect(() => failingHandle.__rue_compiled_mount(host)).toThrow('row mount failed')
    expect(compilerInternalRuntime.__rueGetCompiledReactiveDebugState().activeOwners).toBe(
      before.activeOwners,
    )

    const resourceOutput = compile(`
      export const View = () => <ul>{rows.get().map(row =>
        <li key={row.id} onClick={event => capture(event, row)}>{row.label}</li>
      )}</ul>
    `)
    const resourceRows = signal<Row[]>([
      { id: 1, label: 'one', className: '' },
      { id: 2, label: 'two', className: '' },
      { id: 3, label: 'three', className: '' },
    ])
    const resourceHandle = evaluateView(resourceOutput, resourceRows, () => {})()
    host.appendChild(resourceHandle.__rue_compiled_mount(host)!)
    expect(compilerInternalRuntime.__rueGetCompiledReactiveDebugState().activeOwners).toBe(
      before.activeOwners + 3,
    )
    resourceHandle.dispose()
    expect(compilerInternalRuntime.__rueGetCompiledReactiveDebugState().activeOwners).toBe(
      before.activeOwners,
    )
  })

  it('appends compiled rows without writing or replacing the stable prefix', async () => {
    const output = compile(`
      export const View = () => <ul>{rows.get().map(row =>
        <li key={row.id}>{row.label}</li>
      )}</ul>
    `)
    const initial = Array.from({ length: 1000 }, (_, id) => ({
      id,
      label: String(id),
      className: '',
    }))
    const rows = signal<Row[]>(initial)
    const owner = createOwner()
    const host = document.createElement('div')
    runWithOwner(owner, () => {
      const handle = evaluateView(output, rows, undefined)()
      host.appendChild(handle.__rue_compiled_mount(host)!)
    })
    const prefix = [...host.querySelectorAll('li')]
    const textDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent')!
    let prefixWrites = 0
    for (const row of prefix) {
      Object.defineProperty(row.firstChild!, 'textContent', {
        configurable: true,
        get: textDescriptor.get,
        set(value) {
          prefixWrites += 1
          textDescriptor.set!.call(this, value)
        },
      })
    }
    const insertBefore = vi.spyOn(Node.prototype, 'insertBefore')
    insertBefore.mockClear()

    rows.set([
      ...initial,
      ...Array.from({ length: 1000 }, (_, offset) => {
        const id = offset + 1000
        return { id, label: String(id), className: '' }
      }),
    ])
    await flush()

    expect([...host.querySelectorAll('li')].slice(0, 1000)).toEqual(prefix)
    expect(host.querySelectorAll('li')).toHaveLength(2000)
    expect(prefixWrites).toBe(0)
    expect(
      insertBefore.mock.contexts.filter(context => context instanceof HTMLUListElement),
    ).toHaveLength(1)
    disposeOwner(owner)
  })

  it('writes only the 100 changed rows in a compiled 1k stable-key update', async () => {
    const output = compile(`
      export const View = () => <ul>{rows.get().map(row =>
        <li key={row.id}>{row.label}</li>
      )}</ul>
    `)
    const initial = Array.from({ length: 1000 }, (_, id) => ({
      id,
      label: String(id),
      className: '',
    }))
    const rows = signal<Row[]>(initial)
    const owner = createOwner()
    const host = document.createElement('div')
    runWithOwner(owner, () => {
      const handle = evaluateView(output, rows, undefined)()
      host.appendChild(handle.__rue_compiled_mount(host)!)
    })
    const rendered = [...host.querySelectorAll('li')]
    const textDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent')!
    let textWrites = 0
    for (const row of rendered) {
      Object.defineProperty(row.firstChild!, 'textContent', {
        configurable: true,
        get: textDescriptor.get,
        set(value) {
          textWrites += 1
          textDescriptor.set!.call(this, value)
        },
      })
    }

    rows.set(
      initial.map((row, index) =>
        index % 10 === 0 ? { ...row, label: `updated:${row.id}` } : row,
      ),
    )
    await flush()

    expect(textWrites).toBe(100)
    expect(rendered[0].textContent).toBe('updated:0')
    expect(rendered[1].textContent).toBe('1')
    expect([...host.querySelectorAll('li')]).toEqual(rendered)
    disposeOwner(owner)
  })

  it('batch mounts 1k initial and fully replaced single rows without range probing', async () => {
    const output = compile(`
      export const View = () => <ul>{rows.get().map(row =>
        <li key={row.id} className={row.className}>{row.label}</li>
      )}</ul>
    `)
    expect(output).toMatch(/\(row,\s*[^,]+,\s*[^)]+\)\s*=>/)

    const createFragment = vi.spyOn(document, 'createDocumentFragment')
    const insertBefore = vi.spyOn(Node.prototype, 'insertBefore')
    const rows = signal<Row[]>(
      Array.from({ length: 1000 }, (_, id) => ({
        id,
        label: String(id),
        className: id % 2 === 0 ? 'even' : 'odd',
      })),
    )
    const owner = createOwner()
    const host = document.createElement('div')
    runWithOwner(owner, () => {
      const handle = evaluateView(output, rows, undefined)()
      host.appendChild(handle.__rue_compiled_mount(host)!)
    })

    const listInsertCount = () =>
      insertBefore.mock.contexts.filter(context => context instanceof HTMLUListElement).length
    expect(host.querySelectorAll('li')).toHaveLength(1000)
    expect(listInsertCount()).toBe(1)

    const deletion = vi.spyOn(Range.prototype, 'deleteContents')
    const remove = vi.spyOn(host.querySelector('ul')!, 'removeChild')
    createFragment.mockClear()
    insertBefore.mockClear()
    rows.set(
      Array.from({ length: 1000 }, (_, offset) => {
        const id = offset + 1000
        return { id, label: String(id), className: 'replacement' }
      }),
    )
    await flush()

    expect(host.querySelectorAll('li')).toHaveLength(1000)
    expect(host.querySelector('li')?.textContent).toBe('1000')
    expect(deletion).toHaveBeenCalledTimes(1)
    expect(host.querySelectorAll('li')).toHaveLength(1000)
    expect(createFragment).toHaveBeenCalledTimes(1)
    expect(listInsertCount()).toBe(1)
    disposeOwner(owner)
  })

  it('reuses one static table-row template while keeping per-row fields and events isolated', async () => {
    const output = compile(`
      export const View = () => <table><tbody>{rows.get().map(row =>
        <tr key={row.id} className={row.className} onClick={() => capture(row.label)}>
          <td><strong>{row.label}</strong><em>static</em></td>
        </tr>
      )}</tbody></table>
    `)
    const createElement = vi.spyOn(document, 'createElement')
    const rows = signal<Row[]>([
      { id: 1, label: 'one', className: 'cold' },
      { id: 2, label: 'two', className: 'hot' },
      { id: 3, label: 'three', className: 'warm' },
    ])
    const captured: string[] = []
    const owner = createOwner()
    const host = document.createElement('div')

    runWithOwner(owner, () => {
      const handle = evaluateView(output, rows, (label: string) => captured.push(label))()
      host.appendChild(handle.__rue_compiled_mount(host)!)
    })

    // One template backs the outer table shell and one backs every cloned row.
    expect(createElement.mock.calls.filter(([tag]) => tag === 'template')).toHaveLength(2)
    expect(
      createElement.mock.calls.filter(([tag]) => ['tr', 'td', 'strong', 'em'].includes(tag)),
    ).toHaveLength(0)
    expect([...host.querySelectorAll('tr')].map(row => row.outerHTML)).toEqual([
      '<tr class="cold"><td><strong>one</strong><em>static</em></td></tr>',
      '<tr class="hot"><td><strong>two</strong><em>static</em></td></tr>',
      '<tr class="warm"><td><strong>three</strong><em>static</em></td></tr>',
    ])
    const renderedRows = [...host.querySelectorAll('tr')]
    renderedRows[0].click()
    renderedRows[2].click()
    expect(captured).toEqual(['one', 'three'])

    rows.set([...rows.peek(), { id: 4, label: 'four', className: 'new' }])
    await flush()
    expect(createElement.mock.calls.filter(([tag]) => tag === 'template')).toHaveLength(2)
    expect(host.querySelectorAll('tr')).toHaveLength(4)
    host.querySelectorAll('tr')[3].click()
    expect(captured).toEqual(['one', 'three', 'four'])

    const detached = host.querySelectorAll('tr')[1]
    disposeOwner(owner)
    expect(host.querySelectorAll('tr')).toHaveLength(0)
    detached.click()
    expect(captured).toEqual(['one', 'three', 'four'])
    createElement.mockRestore()
  })

  it('directly patches only changed row text/class while preserving identity, memo and events', async () => {
    const output = compile(`
      export const View = () => <ul>{rows.get().map(row =>
        <li key={row.id} v-memo={[row.label, row.className]} className={row.className}
          onClick={() => capture(row.label)}><span>{row.label}</span><em>static</em></li>
      )}</ul>
    `)

    expect(output).toContain('_$rowPatch')
    expect(output).not.toMatch(/_\$rowItem\d+\s*=\s*_\$compiledSignal\s*\(/)
    expect(output).not.toContain('_$compiledText')
    expect(output.match(/_\$compiledScalarEffect\s*\(/g)).toHaveLength(1)

    const rows = signal<Row[]>([
      { id: 1, label: 'one', className: 'cold' },
      { id: 2, label: 'two', className: 'hot' },
    ])
    const captured: string[] = []
    const owner = createOwner()
    const host = document.createElement('div')
    runWithOwner(owner, () => {
      const handle = evaluateView(output, rows, (label: string) => captured.push(label))()
      host.appendChild(handle.__rue_compiled_mount(host)!)
    })
    const original = [...host.querySelectorAll('li')]

    let textWrites = 0
    let classWrites = 0
    const firstText = original[0].querySelector('span')!.firstChild!
    const textDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent')!
    const setAttribute = original[0].setAttribute.bind(original[0])
    Object.defineProperty(firstText, 'textContent', {
      configurable: true,
      get: textDescriptor.get,
      set(value) {
        textWrites += 1
        textDescriptor.set!.call(this, value)
      },
    })
    vi.spyOn(original[0], 'setAttribute').mockImplementation((name, value) => {
      if (name === 'class') classWrites += 1
      setAttribute(name, value)
    })

    rows.set([
      { id: 2, label: 'two', className: 'hot' },
      { id: 1, label: 'ONE', className: 'cold' },
    ])
    await flush()
    expect([...host.querySelectorAll('li')]).toEqual([original[1], original[0]])
    expect(textWrites).toBe(1)
    expect(classWrites).toBe(0)
    original[0].click()
    expect(captured).toEqual(['ONE'])

    textWrites = 0
    rows.set([rows.peek()[0], { id: 1, label: 'ONE', className: 'warm' }])
    await flush()
    expect(textWrites).toBe(0)
    expect(classWrites).toBe(1)
    expect(original[0].className).toBe('warm')
    disposeOwner(owner)
  })

  it('stores simple-row items directly and event closures read the latest object', async () => {
    const output = compile(`
      export const View = () => <ul>{rows.get().map(row =>
        <li key={row.id} className={row.className} onClick={() => capture(row)}>
          {row.label}
        </li>
      )}</ul>
    `)

    expect(output).toContain('_$rowPatch')
    expect(output).not.toMatch(/_\$rowItem\d+\s*=\s*_\$compiledSignal\s*\(/)

    const initial = { id: 1, label: 'one', className: 'cold' }
    const replacement = { id: 1, label: 'ONE', className: 'warm' }
    const rows = signal<Row[]>([initial])
    const captured: Row[] = []
    const owner = createOwner()
    const host = document.createElement('div')
    runWithOwner(owner, () => {
      const handle = evaluateView(output, rows, (row: Row) => captured.push(row))()
      host.appendChild(handle.__rue_compiled_mount(host)!)
    })
    const rendered = host.querySelector('li')!

    rendered.click()
    rows.set([replacement])
    await flush()
    rendered.click()

    expect(host.querySelector('li')).toBe(rendered)
    expect(rendered.outerHTML).toBe('<li class="warm">ONE</li>')
    expect(captured).toEqual([initial, replacement])
    disposeOwner(owner)
  })

  it('keeps compiler-generated selection effects reactive with a direct item slot', async () => {
    const output = compile(`
      export const View = () => <ul>{rows.get().map(row =>
        <li key={row.id} className={row.id === capture.get() ? 'selected' : ''}>
          {row.label}
        </li>
      )}</ul>
    `)
    expect(output).toContain('_$rowPatch')
    expect(output).not.toMatch(/_\$rowItem\d+\s*=\s*_\$compiledSignal\s*\(/)

    const selected = compilerInternalRuntime.signal(1)
    const rows = compilerInternalRuntime.signal<Row[]>([
      { id: 1, label: 'one', className: 'cold' },
      { id: 2, label: 'two', className: 'hot' },
    ])
    const owner = compilerInternalRuntime.createOwner()
    const host = document.createElement('div')
    compilerInternalRuntime.runWithOwner(owner, () => {
      const handle = evaluateView(
        output,
        rows as unknown as ReturnType<typeof signal<Row[]>>,
        selected,
      )()
      host.appendChild(handle.__rue_compiled_mount(host)!)
    })
    const rendered = [...host.querySelectorAll('li')]
    expect(rendered.map(row => row.className)).toEqual(['selected', ''])

    selected.set(2)
    await flush()
    expect(rendered.map(row => row.className)).toEqual(['', 'selected'])

    rows.set([
      { id: 1, label: 'ONE', className: 'cold' },
      { id: 2, label: 'TWO', className: 'hot' },
    ])
    await flush()
    expect(rendered.map(row => row.textContent)).toEqual(['ONE', 'TWO'])
    expect(rendered.map(row => row.className)).toEqual(['', 'selected'])
    compilerInternalRuntime.disposeOwner(owner)
  })

  it('keeps compiled components, spreads and control flow on the range factory path', () => {
    for (const source of [
      `const Row = ({label}) => <li>{label}</li>; export const View = () => <ul>{rows.get().map(row => <Row key={row.id} label={row.label} />)}</ul>`,
      `export const View = () => <ul>{rows.get().map(row => <li key={row.id} {...row}>{row.label}</li>)}</ul>`,
      `export const View = () => <ul>{rows.get().map(row => row.ok ? <li key={row.id}>{row.label}</li> : null)}</ul>`,
      `export const View = () => <ul>{rows.get().map(row => <li key={row.id} data-id={format(row.id)}>{row.label}</li>)}</ul>`,
    ]) {
      const output = compile(source)
      expect(output).not.toContain('_$rowPatch')
      expect(output).not.toContain('_$reconcileKeyedSingle')
    }
  })
})
