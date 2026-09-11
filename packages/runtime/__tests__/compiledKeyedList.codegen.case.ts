import {
  _$mountCompiledSlotFactory,
  type BlockFactory,
} from '../src/compiler-runtime/block-factory'
import { resolveCompilerCapability } from './compiler-capability-test-runtime'
// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import swc from '@swc/core'
import { afterEach, describe, expect, it } from 'vitest'

import { createOwner, disposeOwner, runWithOwner, signal } from '../src/runtime-core/compiled'
import type { _$compiledRoot } from '../src/compiler-runtime/block'
import * as compactRuntime from '../src/compiler-internal'

type Row = { id: number; label: string; active?: boolean }

const pluginPath = resolve(process.cwd(), 'packages/swc-plugin-rue/swc-plugin-rue.wasm')

const compile = (source: string): string => {
  expect(readFileSync(pluginPath).byteLength).toBeGreaterThan(0)
  return swc.transformSync(source, {
    filename: 'compiled-list-codegen.tsx',
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
      <tr key={row.id} className={row.active ? 'active' : ''} data-id={row.id}>
        <td>{row.label}</td>
      </tr>
    ))}
  </tbody>
)
`

const indexKeySource = `
export const View = () => (
  <tbody>
    {rows.get().map((row, index) => (
      <tr key={index} data-id={row.id}>
        <td>{row.label}</td>
      </tr>
    ))}
  </tbody>
)
`

const directRowSource = `
export const View = () => (
  <ul>
    {rows.get().map(row => (
      <li key={row.id} className={row.label} onClick={() => capture(row)}>{row.label}</li>
    ))}
  </ul>
)
`

const stripModuleSyntax = (output: string): string =>
  output
    .replace(/import\s*\{[^}]*\}\s*from\s*["'][^"']+["'];?/g, '')
    .replace(/export\s+const\s+/g, 'const ')

const evaluateView = (
  output: string,
  rows: ReturnType<typeof signal<Row[]>>,
  bindings: Record<string, unknown> = {},
) => {
  const capabilities = Object.assign(
    {},
    ...[...output.matchAll(/import\s*\{[^}]*\}\s*from\s*["']([^"']+)["']/g)].map(match => {
      const capability = resolveCompilerCapability(match[1])
      if (!capability) throw new Error(`Unexpected compiler import: ${match[1]}`)
      return capability
    }),
  )
  return new Function(
    'rows',
    ...Object.keys(bindings),
    ...Object.keys(capabilities),
    `${stripModuleSyntax(output)}\nreturn View;`,
  )(rows, ...Object.values(bindings), ...Object.values(capabilities)) as () => ReturnType<
    typeof _$compiledRoot
  >
}

const flushCompiledEffects = async (): Promise<void> => {
  const tick = (): Promise<void> =>
    typeof requestAnimationFrame === 'function'
      ? new Promise(resolveFrame => requestAnimationFrame(() => resolveFrame()))
      : Promise.resolve()
  await tick()
  await tick()
  await tick()
}

const rowIds = (parent: ParentNode): number[] =>
  Array.from(parent.querySelectorAll<HTMLTableRowElement>(':scope > tr')).map(row =>
    Number(row.dataset.id),
  )

afterEach(() => {
  document.body.innerHTML = ''
})

describe('compiled keyed list codegen', () => {
  it('omits unused index resources while preserving event closure index reads', async () => {
    const withoutIndex = compile(source)
    expect(withoutIndex).not.toContain('_$rowIndex')

    const withEventIndex = compile(`export const View = () => <tbody>{rows.get().map((row, index) =>
      <tr key={row.id} data-id={row.id} onClick={() => capture(row.id, index)}>
        <td>{row.label}</td>
      </tr>)}</tbody>`)
    expect(withEventIndex).toContain('_$rowIndex')

    const rows = signal<Row[]>([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ])
    const calls: Array<[number, number]> = []
    const owner = createOwner()
    const host = document.createElement('table')
    runWithOwner(owner, () => {
      const handle = evaluateView(withEventIndex, rows, {
        capture: (id: number, index: number) => calls.push([id, index]),
      })()
      host.appendChild(handle.__rue_compiled_mount(host)!)
    })
    const original = [...host.querySelectorAll('tr')]

    rows.set([rows.peek()[1], rows.peek()[0]])
    await flushCompiledEffects()
    expect([...host.querySelectorAll('tr')]).toEqual([original[1], original[0]])
    original[0].click()
    original[1].click()
    expect(calls).toEqual([
      [1, 1],
      [2, 0],
    ])
    disposeOwner(owner)
  })

  it.each(
    ['v-memo', 'r-memo'].flatMap(directive =>
      ['map', 'block', 'for'].map(shape => [directive, shape]),
    ),
  )('preserves keyed identity and memo dependencies with %s / %s', async (directive, shape) => {
    let input = source.replace(
      'key={row.id}',
      `key={row.id} ${directive}={[row.label, row.active]}`,
    )
    if (shape === 'block')
      input = input.replace('row => (', 'row => { return (').replace('))}', '); })}')
    if (shape === 'for')
      input = `export const View = () => <tbody><tr ${directive.startsWith('v') ? 'v-for' : 'r-for'}="row in rows.get()" key={row.id} ${directive}={[row.label, row.active]} data-id={row.id}><td>{row.label}</td></tr></tbody>`
    const output = compile(input)
    expect(output).toContain('_$reconcileKeyed')
    const rows = signal<Row[]>([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ])
    const owner = createOwner()
    const host = document.createElement('table')
    document.body.appendChild(host)
    runWithOwner(owner, () => {
      const handle = evaluateView(output, rows)()
      host.appendChild(handle.__rue_compiled_mount(host)!)
    })
    const original = [...host.querySelectorAll('tr')]
    rows.set([rows.peek()[1], rows.peek()[0]])
    await flushCompiledEffects()
    expect([...host.querySelectorAll('tr')]).toEqual([original[1], original[0]])
    rows.update(items => items.map(row => (row.id === 1 ? { ...row, label: 'ONE' } : row)))
    await flushCompiledEffects()
    expect(original[0].textContent).toBe('ONE')
    expect(host.querySelectorAll('tr')[1]).toBe(original[0])
    rows.peek()[0].label = 'TWO'
    rows.set(rows.peek().slice())
    await flushCompiledEffects()
    expect(original[1].textContent).toBe('TWO')
    rows.set([])
    await flushCompiledEffects()
    expect(host.querySelectorAll('tr')).toHaveLength(0)
    disposeOwner(owner)
  })

  it.each([
    ['v-memo', compactRuntime],
    ['r-memo', compactRuntime],
  ] as const)(
    'skips unchanged rows and tracks external selection with %s (%#)',
    async (directive, runtime) => {
      const { signal } = runtime
      const output = compile(`export const View = () => <tbody>{rows.get().map(row =>
      <tr key={row.id} ${directive}={[row.label, row.id === selected.get()]}
        className={row.id === selected.get() ? 'selected' : ''} data-id={row.id}>
        <td>{String(capture(row.id, row.label + ':' + (row.id === selected.get()) + ':' + unrelated.get()))}</td>
      </tr>)}</tbody>`)
      const rows = signal<Row[]>(
        Array.from({ length: 1_000 }, (_, index) => ({ id: index + 1, label: 'same' })),
      )
      const selectedSignal = signal(1)
      let selectedDependencyReads = 0
      const selected = {
        get: () => {
          selectedDependencyReads += 1
          return selectedSignal.get()
        },
        set: (value: number) => selectedSignal.set(value),
      }
      const unrelated = signal(0)
      const calls: number[] = []
      const capture = (id: number, text: string) => {
        calls.push(id)
        return text
      }
      const owned =
        runtime === compactRuntime
          ? (() => {
              const owner = compactRuntime.createOwner()
              return {
                run: (fn: () => void) => compactRuntime.runWithOwner(owner, fn),
                dispose: () => compactRuntime.disposeOwner(owner),
              }
            })()
          : (() => {
              const owner = createOwner()
              return {
                run: (fn: () => void) => runWithOwner(owner, fn),
                dispose: () => disposeOwner(owner),
              }
            })()
      const host = document.createElement('table')
      owned.run(() => {
        const handle = evaluateView(output, rows, { selected, unrelated, capture })()
        host.appendChild(handle.__rue_compiled_mount(host)!)
      })
      const original = [...host.querySelectorAll('tr')]
      calls.length = 0
      unrelated.set(1)
      rows.set(rows.peek().map(row => ({ ...row })))
      await flushCompiledEffects()
      expect(calls).toEqual([])
      expect(original[0].textContent).toBe('same:true:0')
      selectedDependencyReads = 0
      selected.set(2)
      await flushCompiledEffects()
      expect(selectedDependencyReads).toBe(3)
      expect(calls.sort()).toEqual([1, 2])
      expect(original[0].textContent).toBe('same:false:1')
      expect(original[1].textContent).toBe('same:true:1')
      expect(original[2].textContent).toBe('same:false:0')
      calls.length = 0
      rows.set([rows.peek()[2], rows.peek()[1], rows.peek()[0]])
      await flushCompiledEffects()
      expect([...host.querySelectorAll('tr')]).toEqual([original[2], original[1], original[0]])
      expect(calls).toEqual([])
      rows.set([{ id: 1_001, label: 'same' }, rows.peek()[1]])
      await flushCompiledEffects()
      expect(host.querySelectorAll('tr')[0]).not.toBe(original[2])
      calls.length = 0
      selectedDependencyReads = 0
      selected.set(3)
      await flushCompiledEffects()
      expect(selectedDependencyReads).toBe(2)
      expect(calls).toEqual([2])
      owned.dispose()
      calls.length = 0
      selected.set(1_001)
      await flushCompiledEffects()
      expect(calls).toEqual([])
    },
  )

  it.each(['v-memo', 'r-memo'])(
    'keeps empty %s dependencies frozen while keys move or change',
    async directive => {
      const output = compile(source.replace('key={row.id}', `key={row.id} ${directive}={[]}`))
      const rows = signal<Row[]>([
        { id: 1, label: 'one' },
        { id: 2, label: 'two' },
      ])
      const owner = createOwner()
      const host = document.createElement('table')
      runWithOwner(owner, () => {
        const handle = evaluateView(output, rows)()
        host.appendChild(handle.__rue_compiled_mount(host)!)
      })
      const original = [...host.querySelectorAll('tr')]
      rows.set([
        { id: 2, label: 'TWO' },
        { id: 1, label: 'ONE' },
      ])
      await flushCompiledEffects()
      expect([...host.querySelectorAll('tr')]).toEqual([original[1], original[0]])
      expect(original.map(row => row.textContent)).toEqual(['one', 'two'])
      rows.set([{ id: 3, label: 'three' }])
      await flushCompiledEffects()
      expect(host.querySelector('tr')).not.toBe(original[0])
      expect(host.querySelector('tr')?.textContent).toBe('three')
      disposeOwner(owner)
    },
  )

  it.each(['v-memo', 'r-memo'])(
    'keeps mixed in-place dependency updates visible during a %s swap',
    async directive => {
      const output = compile(
        source.replace('key={row.id}', `key={row.id} ${directive}={[row.label, row.active]}`),
      )
      const rows = signal<Row[]>([
        { id: 1, label: 'one' },
        { id: 2, label: 'two' },
        { id: 3, label: 'three' },
      ])
      const owner = createOwner()
      const host = document.createElement('table')
      runWithOwner(owner, () => {
        const handle = evaluateView(output, rows)()
        host.appendChild(handle.__rue_compiled_mount(host)!)
      })
      const original = [...host.querySelectorAll('tr')]
      const mixed = rows.peek().slice()
      ;[mixed[0], mixed[2]] = [mixed[2], mixed[0]]
      mixed[1].label = 'TWO'

      rows.set(mixed)
      await flushCompiledEffects()

      expect([...host.querySelectorAll('tr')]).toEqual([original[2], original[1], original[0]])
      expect(original[1].textContent).toBe('TWO')
      disposeOwner(owner)
    },
  )

  it('executes the real SWC output through nine keyed operations without the generic list', async () => {
    const output = compile(source)
    const directRowOutput = compile(directRowSource)
    const compiledImport = output.match(
      /import\s*\{([^}]*)\}\s*from\s*["']@rue-js\/rue\/internal\/reactive["']/,
    )
    expect(compiledImport?.[1]).toContain('effect')
    expect(output).toMatch(
      /import\s*\{[^}]*_\$reconcileKeyed[^}]*\}\s*from\s*["']@rue-js\/rue\/internal\/list["']/,
    )
    expect(compiledImport?.[1]).toContain('_$compiledSignal')
    expect(directRowOutput).toContain('_$rowPatch')
    expect(directRowOutput).not.toMatch(/_\$rowItem\d+\s*=\s*_\$compiledSignal\s*\(/)
    expect(output).not.toContain('watchEffect')
    expect(output).not.toContain('_$compiledKeyedList')
    expect(output).not.toContain(['direct', 'Root'].join(''))
    expect(output).not.toContain(['compiled', 'RowPatch'].join(''))
    expect(output).not.toContain('_$createDocumentFragment')

    const rows = signal<Row[]>([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
      { id: 3, label: 'three' },
    ])
    const owner = createOwner()
    const host = document.createElement('table')
    document.body.appendChild(host)
    let tbody: HTMLTableSectionElement | undefined
    runWithOwner(owner, () => {
      const handle = evaluateView(output, rows)()
      tbody = handle.__rue_compiled_mount(host) as HTMLTableSectionElement
      host.appendChild(tbody)
    })
    if (!tbody) throw new Error('Expected compiled tbody')

    const render = async (next: Row[]) => {
      rows.set(next)
      await flushCompiledEffects()
      expect(rowIds(tbody!)).toEqual(next.map(row => row.id))
    }

    expect(rowIds(tbody)).toEqual([1, 2, 3]) // create
    const one = tbody.querySelector<HTMLTableRowElement>('[data-id="1"]')!

    await render([
      { id: 4, label: 'four' },
      { id: 5, label: 'five' },
    ]) // replace
    const four = tbody.querySelector<HTMLTableRowElement>('[data-id="4"]')!
    const five = tbody.querySelector<HTMLTableRowElement>('[data-id="5"]')!
    expect(one.isConnected).toBe(false)

    await render([
      { id: 4, label: 'four' },
      { id: 5, label: 'five' },
      { id: 6, label: 'six' },
    ]) // append
    expect(tbody.querySelector('[data-id="4"]')).toBe(four)

    await render([
      { id: 4, label: 'FOUR', active: true },
      { id: 5, label: 'five' },
      { id: 6, label: 'six' },
    ]) // update
    expect(four.textContent).toBe('FOUR')
    expect(four.className).toBe('active')

    await render([
      { id: 7, label: 'seven' },
      { id: 4, label: 'FOUR', active: true },
      { id: 5, label: 'five' },
      { id: 6, label: 'six' },
    ]) // prepend

    await render([
      { id: 7, label: 'seven' },
      { id: 4, label: 'FOUR', active: true },
      { id: 8, label: 'eight' },
      { id: 5, label: 'five' },
      { id: 6, label: 'six' },
    ]) // insert

    await render([
      { id: 7, label: 'seven' },
      { id: 6, label: 'six' },
      { id: 8, label: 'eight' },
      { id: 5, label: 'five' },
      { id: 4, label: 'FOUR', active: true },
    ]) // swap
    expect(tbody.querySelector('[data-id="4"]')).toBe(four)
    expect(tbody.querySelector('[data-id="5"]')).toBe(five)

    await render([
      { id: 7, label: 'seven' },
      { id: 6, label: 'six' },
      { id: 8, label: 'eight' },
      { id: 4, label: 'FOUR', active: true },
    ]) // remove
    expect(five.isConnected).toBe(false)

    await render([]) // clear
    expect(tbody.querySelectorAll('tr')).toHaveLength(0)
    expect(tbody.childNodes).toHaveLength(1)
    expect(tbody.firstChild?.nodeType).toBe(Node.COMMENT_NODE)

    disposeOwner(owner)
  })

  it('throws explicitly for duplicate keys from the real compiled mount', () => {
    const output = compile(source)
    const rows = signal<Row[]>([
      { id: 1, label: 'one' },
      { id: 1, label: 'duplicate' },
    ])
    const owner = createOwner()
    const host = document.createElement('table')
    expect(() =>
      runWithOwner(owner, () => {
        const handle = evaluateView(output, rows)()
        const tbody = handle.__rue_compiled_mount(host) as HTMLTableSectionElement
        host.appendChild(tbody)
      }),
    ).toThrow(/duplicate.*key/)
    disposeOwner(owner)
  })

  it('patches safe index-key rows in place through the compiled reconciler', async () => {
    const output = compile(indexKeySource)
    expect(output).toContain('_$reconcileKeyed')
    expect(output).not.toContain('_$compiledKeyedList')
    expect(output).not.toContain('watchEffect')

    const rows = signal<Row[]>([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ])
    const owner = createOwner()
    const host = document.createElement('table')
    let tbody: HTMLTableSectionElement | undefined

    runWithOwner(owner, () => {
      const handle = evaluateView(output, rows)()
      tbody = handle.__rue_compiled_mount(host) as HTMLTableSectionElement
      host.appendChild(tbody)
    })
    if (!tbody) throw new Error('Expected compiled tbody')

    const initialRows = Array.from(tbody.querySelectorAll('tr'))
    rows.set([
      { id: 2, label: 'TWO' },
      { id: 1, label: 'ONE' },
    ])
    await flushCompiledEffects()

    const patchedRows = Array.from(tbody.querySelectorAll('tr'))
    expect(patchedRows[0]).toBe(initialRows[0])
    expect(patchedRows[1]).toBe(initialRows[1])
    expect(patchedRows.map(row => row.dataset.id)).toEqual(['2', '1'])
    expect(patchedRows.map(row => row.textContent)).toEqual(['TWO', 'ONE'])

    rows.set([{ id: 3, label: 'three' }])
    await flushCompiledEffects()
    expect(tbody.querySelectorAll('tr')).toHaveLength(1)
    expect(tbody.querySelector('tr')).toBe(initialRows[0])
    expect(initialRows[1].isConnected).toBe(false)
    disposeOwner(owner)
  })
})

describe('closed row and slot factories', () => {
  it('uses the same owned factory for native rows and excludes compatibility helpers', () => {
    const output = compile(directRowSource)
    expect(output).toContain('_$mountCompiledKeyedSingleRow(')
    expect(output).not.toMatch(/Ownerless|RowSetup|renderAnchor|internal\/component["']/)
  })
  it.each([
    ['plain object', '({ arbitrary: true })'],
    ['mixed DOM/object array', '[document.createTextNode("x"), { arbitrary: true }]'],
    [
      'object-returning map',
      'rows.get().map(row => ({ key: row.id, node: document.createElement("li") }))',
    ],
  ])('rejects unsafe children: %s', (_name, value) => {
    expect(() => compile(`export const View = () => <div>{${value}}</div>`)).toThrow(
      /children|value/i,
    )
  })
})

it('replaces compiled slot factories, retains unchanged nodes, and cleans moved ranges', async () => {
  const firstOutput = compile('export const View = () => <><i>one</i><b>tail</b></>')
  const secondOutput = compile('export const View = () => <em>two</em>')
  const slotOutput = compile('export const View = () => <section>{props.children}</section>')
  for (const output of [firstOutput, secondOutput, slotOutput]) {
    expect(output).not.toContain('renderAnchor')
  }
  const unused = signal<Row[]>([])
  const first = evaluateView(firstOutput, unused)
  const second = evaluateView(secondOutput, unused)
  const firstFactory: BlockFactory = (target, _props, owner) =>
    _$mountCompiledSlotFactory(target, owner, first)
  const secondFactory: BlockFactory = (target, _props, owner) =>
    _$mountCompiledSlotFactory(target, owner, second)
  const current = signal<BlockFactory | undefined>(firstFactory)
  const props = {
    get children() {
      return current.get()
    },
  }
  const View = evaluateView(slotOutput, unused, { props })
  const host = document.createElement('div')
  const moved = document.createElement('div')
  const root = View()
  root.__rue_compiled_mount(host)
  const section = host.querySelector('section')!
  const original = [...section.children]
  expect(section.textContent).toBe('onetail')
  current.set(firstFactory)
  await flushCompiledEffects()
  expect([...section.children]).toEqual(original)
  moved.appendChild(section)
  current.set(secondFactory)
  await flushCompiledEffects()
  expect(section.textContent).toBe('two')
  expect(original.every(node => node.parentNode === null)).toBe(true)
  current.set(undefined)
  await flushCompiledEffects()
  expect(section.textContent).toBe('')
  current.set(firstFactory)
  await flushCompiledEffects()
  expect(section.textContent).toBe('onetail')
  root.dispose()
  expect(moved.childNodes).toHaveLength(0)
})

it('compiles JSX slot fallback values into factories', async () => {
  const output = compile(
    'export const View = () => <section>{props.children ?? <b>fallback</b>}</section>',
  )
  expect(output).not.toContain('renderAnchor')
  const current = signal<BlockFactory | undefined>(undefined)
  const props = {
    get children() {
      return current.get()
    },
  }
  const unused = signal<Row[]>([])
  const fallbackView = evaluateView(output, unused, { props })
  const suppliedView = evaluateView(compile('export const View = () => <i>supplied</i>'), unused)
  const host = document.createElement('div')
  const root = fallbackView()
  root.__rue_compiled_mount(host)
  expect(host.textContent).toBe('fallback')
  current.set((target, _props, owner) => _$mountCompiledSlotFactory(target, owner, suppliedView))
  await flushCompiledEffects()
  expect(host.textContent).toBe('supplied')
  current.set(undefined)
  await flushCompiledEffects()
  expect(host.textContent).toBe('fallback')
  root.dispose()
  expect(host.childNodes).toHaveLength(0)
})

it('releases row signals and memo subscriptions on clear while the list remains mounted', async () => {
  const output = compile(source.replace('key={row.id}', 'key={row.id} v-memo={[row.label]}'))
  const rows = signal<Row[]>([])
  const root = evaluateView(output, rows)()
  const host = document.createElement('table')
  root.__rue_compiled_mount(host)
  const baseline = compactRuntime.__rueGetCompiledReactiveDebugState()
  for (let batch = 0; batch < 3; batch++) {
    rows.set(Array.from({ length: 100 }, (_, id) => ({ id, label: String(id) })))
    await flushCompiledEffects()
    rows.set([])
    await flushCompiledEffects()
    expect(host.querySelectorAll('tr')).toHaveLength(0)
    expect(compactRuntime.__rueGetCompiledReactiveDebugState()).toEqual(baseline)
  }
  root.dispose()
})

it('mounts conditional map branches as closed keyed blocks', async () => {
  const output = compile(
    `export const View = () => <ul>{props.visible ? rows.get().map(row => { const label = row.label.toUpperCase(); return <li key={row.id}>{String(label)}</li> }) : <li>empty</li>}</ul>`,
  )
  expect(output).not.toContain('renderAnchor')
  const rows = signal<Row[]>([
    { id: 1, label: 'one' },
    { id: 2, label: 'two' },
  ])
  const visible = signal(true)
  const props = {
    get visible() {
      return visible.get()
    },
  }
  const root = evaluateView(output, rows, { props })()
  const host = document.createElement('div')
  root.__rue_compiled_mount(host)
  expect(host.textContent).toBe('ONETWO')
  const first = host.querySelector('li')
  rows.set([
    { id: 2, label: 'TWO' },
    { id: 1, label: 'ONE' },
  ])
  await flushCompiledEffects()
  expect(host.textContent).toBe('TWOONE')
  expect(host.querySelectorAll('li')[1]).toBe(first)
  visible.set(false)
  await flushCompiledEffects()
  expect(host.textContent).toBe('empty')
  visible.set(true)
  await flushCompiledEffects()
  expect(host.textContent).toBe('TWOONE')
  root.dispose()
  expect(host.childNodes).toHaveLength(0)
})

it('erases key metadata without skipping key expression evaluation', () => {
  const output = compile(
    `export const View = () => <section>{props.children ?? <b key={key.get()}>fallback</b>}</section>`,
  )
  expect(output).not.toContain('_$compiledWithKey')
  let reads = 0
  const rows = signal<Row[]>([])
  const root = evaluateView(output, rows, {
    props: {},
    key: {
      get() {
        reads++
        return 'fallback'
      },
    },
  })()
  const host = document.createElement('div')
  root.__rue_compiled_mount(host)
  expect(host.textContent).toBe('fallback')
  expect(reads).toBe(1)
  root.dispose()
})
