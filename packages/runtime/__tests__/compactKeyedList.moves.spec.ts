import { _$compiledRoot, type BlockSetup } from '../src/compiler-runtime/block'
import { _$mountCompiledSlotFactory } from '../src/compiler-runtime/block-factory'
import { _$selectorCleanupRegistry } from '../src/runtime-core/reactive-kernel/selector'

// Test fixtures exercise the production closed factory with explicit node ranges.
const mountRowFactory = <T>(
  setup: BlockSetup,
  patch: (item: T, index: number) => void,
  target?: CompactCompiledKeyedMountTarget,
) =>
  _$mountCompiledKeyedRow<T>(
    (target, _props, owner) =>
      _$mountCompiledSlotFactory(target, owner, () => _$compiledRoot(setup)),
    patch,
    undefined,
    target,
  )
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  _$mountCompiledKeyedSingleRowDirect,
  _$mountCompiledKeyedSingleRowOwnerless,
  _$mountCompiledKeyedRow,
  _$reconcileKeyed,
  _$reconcileKeyedSingle,
  type CompactCompiledKeyedMountTarget,
  type CompactCompiledKeyedRow,
  type CompactCompiledKeyedSingleRow,
} from '../src/compiler-runtime/compact-keyed-list'
import {
  createOwner,
  runWithOwner,
  getCurrentOwner,
  getOwnerParent,
  registerOwnerLifecycle,
  __rueGetCompiledReactiveDebugState,
  disposeOwner,
  onOwnerCleanup,
} from '../src/runtime-core/compiled'

type Item = { id: number; label: string }

const fixture = (range = false) => {
  const parent = document.createElement('div')
  const insertBefore = parent.insertBefore.bind(parent)
  let insertions = 0
  vi.spyOn(parent, 'insertBefore').mockImplementation((node, before) => {
    if (++insertions > 2500) throw new Error('range movement did not terminate')
    return insertBefore(node, before)
  })
  const anchor = document.createComment('end')
  parent.appendChild(anchor)
  let previous: CompactCompiledKeyedRow<Item, number>[] = []
  const mount = (item: Item) => {
    const node = document.createElement('span')
    node.textContent = item.label
    const last = range ? document.createTextNode('tail') : node
    const staging = document.createDocumentFragment()
    staging.appendChild(node)
    if (range) staging.appendChild(last)
    return {
      node,
      last,
      patch: (next: Item) => {
        node.textContent = next.label
      },
      dispose() {},
    }
  }
  const render = (items: Item[]) => {
    previous = _$reconcileKeyed(parent, anchor, previous, items, item => item.id, mount)
    return previous
  }
  return { parent, anchor, render }
}

const batchFixture = (range = false, throwOnId?: number) => {
  const parent = document.createElement('div')
  const anchor = document.createComment('end')
  parent.appendChild(anchor)
  let previous: CompactCompiledKeyedRow<Item, number>[] = []
  const disposed: number[] = []
  const mount = (item: Item, _index: number, target?: CompactCompiledKeyedMountTarget) => {
    if (item.id === throwOnId) throw new Error(`failed to mount ${item.id}`)
    const staging = target?.parent ?? document.createDocumentFragment()
    const node = document.createElement('span')
    node.textContent = item.label
    const last = range ? document.createTextNode(`tail:${item.id}`) : node
    staging.insertBefore(node, target?.before ?? null)
    if (range) staging.insertBefore(last, target?.before ?? null)
    return {
      node,
      last,
      patch: (next: Item) => {
        node.textContent = next.label
      },
      dispose: () => disposed.push(item.id),
    }
  }
  const render = (items: Item[]) => {
    previous = _$reconcileKeyed(parent, anchor, previous, items, item => item.id, mount)
    return previous
  }
  return { parent, anchor, disposed, render }
}

const singleFixture = (throwOnId?: number, throwOnDisposeId?: number) => {
  const parent = document.createElement('div')
  const anchor = document.createComment('end')
  parent.appendChild(anchor)
  let previous: CompactCompiledKeyedSingleRow<Item, number>[] = []
  const disposed: number[] = []
  let mounts = 0
  const mount = (item: Item, _index: number, target?: CompactCompiledKeyedMountTarget) => {
    mounts += 1
    if (item.id === throwOnId) throw new Error(`failed to mount ${item.id}`)
    const staging = target?.parent ?? document.createDocumentFragment()
    const node = document.createElement('span')
    node.textContent = item.label
    staging.insertBefore(node, target?.before ?? null)
    return {
      node,
      patch: (next: Item) => {
        node.textContent = next.label
      },
      dispose: () => {
        disposed.push(item.id)
        if (item.id === throwOnDisposeId) throw new Error(`failed to dispose ${item.id}`)
      },
    }
  }
  const render = (items: Item[]) => {
    previous = _$reconcileKeyedSingle(parent, anchor, previous, items, item => item.id, mount)
    return previous
  }
  return {
    parent,
    anchor,
    disposed,
    get mounts() {
      return mounts
    },
    render,
  }
}

afterEach(() => vi.restoreAllMocks())

describe('compact keyed list DOM moves', () => {
  it('runs the full single-root keyed operation matrix without range probing or private metadata', () => {
    const { parent, anchor, render } = singleFixture()
    const createRange = vi.spyOn(document, 'createRange')
    const insert = vi.spyOn(parent, 'insertBefore')
    const remove = vi.spyOn(parent, 'removeChild')
    const replaceChildren = vi.spyOn(parent, 'replaceChildren')
    const a = { id: 1, label: 'one' }
    const b = { id: 2, label: 'two' }
    const c = { id: 3, label: 'three' }

    let rows = render([a, b, c])
    const original = rows.map(row => row.node)
    expect(
      rows.every(row => !('last' in row) && Object.getOwnPropertySymbols(row).length === 0),
    ).toBe(true)
    expect(insert).toHaveBeenCalledTimes(1)

    rows = render([a, { ...b, label: 'selected' }, c])
    expect(rows.map(row => row.node)).toEqual(original)
    expect(rows[1].node.textContent).toBe('selected')

    insert.mockClear()
    rows = render([a, c, rows[1].item])
    expect(rows.map(row => row.node)).toEqual([original[0], original[2], original[1]])
    expect(insert.mock.calls.length).toBeLessThanOrEqual(2)

    remove.mockClear()
    rows = render([a, rows[2].item])
    expect(rows.map(row => row.node)).toEqual([original[0], original[1]])
    expect(remove).toHaveBeenCalledTimes(1)

    insert.mockClear()
    rows = render([...rows.map(row => row.item), { id: 4, label: 'four' }])
    expect(rows.slice(0, 2).map(row => row.node)).toEqual([original[0], original[1]])
    expect(insert).toHaveBeenCalledTimes(1)

    insert.mockClear()
    remove.mockClear()
    rows = render([
      { id: 5, label: 'five' },
      { id: 6, label: 'six' },
    ])
    expect(insert).toHaveBeenCalledTimes(1)
    expect(remove).not.toHaveBeenCalled()
    expect([...parent.childNodes]).toEqual([rows[0].node, rows[1].node, anchor])

    remove.mockClear()
    expect(render([])).toEqual([])
    expect(remove).not.toHaveBeenCalled()
    expect([...parent.childNodes]).toEqual([anchor])
    expect(createRange).toHaveBeenCalledTimes(2)
    expect(replaceChildren).not.toHaveBeenCalled()
  })

  it('keeps single-root duplicate, mount rollback and cleanup failure semantics atomic', () => {
    const duplicate = singleFixture()
    const old = duplicate.render([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ])
    const mountCount = duplicate.mounts
    expect(() => duplicate.render([old[0].item, { id: 1, label: 'duplicate' }])).toThrow(
      /duplicate.*key/,
    )
    expect(duplicate.mounts).toBe(mountCount)
    expect([...duplicate.parent.childNodes]).toEqual([old[0].node, old[1].node, duplicate.anchor])

    const failingMount = singleFixture(4)
    const retained = failingMount.render([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ])
    expect(() =>
      failingMount.render([
        { id: 3, label: 'three' },
        { id: 4, label: 'four' },
      ]),
    ).toThrow('failed to mount 4')
    expect(failingMount.disposed).toEqual([3])
    expect([...failingMount.parent.childNodes]).toEqual([
      retained[0].node,
      retained[1].node,
      failingMount.anchor,
    ])

    const failingCleanup = singleFixture(undefined, 2)
    failingCleanup.render([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
      { id: 3, label: 'three' },
    ])
    expect(() => failingCleanup.render([])).toThrow('failed to dispose 2')
    expect(failingCleanup.disposed).toEqual([1, 2, 3])
    expect([...failingCleanup.parent.childNodes]).toEqual([failingCleanup.anchor])
  })

  it.each([
    ['range', _$reconcileKeyed],
    ['single', _$reconcileKeyedSingle],
  ] as const)(
    'stable 1k+1k append uses tail-only allocation and one DOM insertion (%s)',
    (_mode, reconcile) => {
      const parent = document.createElement('div')
      const anchor = document.createComment('end')
      parent.append(anchor)
      let keyReads = 0
      let mounts = 0
      let patches = 0
      const mount = (item: Item, _index: number, target?: CompactCompiledKeyedMountTarget) => {
        mounts += 1
        const node = document.createElement('span')
        node.textContent = item.label
        const staging = target?.parent ?? document.createDocumentFragment()
        staging.insertBefore(node, target?.before ?? null)
        return {
          node,
          patch: () => {
            patches += 1
          },
          dispose() {},
        }
      }
      const getKey = (item: Item) => {
        keyReads += 1
        return item.id
      }
      const initialItems = Array.from({ length: 1000 }, (_, id) => ({ id, label: String(id) }))
      const previous = reconcile(parent, anchor, [], initialItems, getKey, mount)
      const oldNodes = previous.map(row => row.node)
      const nativeMap = globalThis.Map
      const nativeSet = globalThis.Set
      const mapInputSizes: number[] = []
      const setInputSizes: number[] = []
      const inputSize = (value: unknown) =>
        value == null ? 0 : Array.isArray(value) ? value.length : -1
      vi.stubGlobal(
        'Map',
        new Proxy(nativeMap, {
          construct(target, args) {
            const size = inputSize(args[0])
            if (size >= 1000) mapInputSizes.push(size)
            return Reflect.construct(target, args, target)
          },
        }),
      )
      vi.stubGlobal(
        'Set',
        new Proxy(nativeSet, {
          construct(target, args) {
            const size = inputSize(args[0])
            if (size >= 1000) setInputSizes.push(size)
            return Reflect.construct(target, args, target)
          },
        }),
      )
      const insert = vi.spyOn(parent, 'insertBefore')
      keyReads = 0
      mounts = 0
      try {
        const appended = initialItems.concat(
          Array.from({ length: 1000 }, (_, offset) => ({
            id: 1000 + offset,
            label: String(1000 + offset),
          })),
        )
        const next = reconcile(parent, anchor, previous, appended, getKey, mount)
        expect(next.slice(0, 1000)).toEqual(previous)
        expect(next.slice(0, 1000).map(row => row.node)).toEqual(oldNodes)
        expect(keyReads).toBe(2000)
        expect(mounts).toBe(1000)
        expect(patches).toBe(0)
        expect(mapInputSizes).toEqual([])
        expect(setInputSizes).toEqual([1000])
        expect(insert).toHaveBeenCalledExactlyOnceWith(expect.any(DocumentFragment), anchor)
      } finally {
        vi.stubGlobal('Map', nativeMap)
        vi.stubGlobal('Set', nativeSet)
      }
    },
    60_000,
  )

  it('rejects stable-append duplicates and rolls back a failing tail atomically', () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.append(anchor)
    const disposed: number[] = []
    let failAt: number | undefined
    const mount = (item: Item, _index: number, target?: CompactCompiledKeyedMountTarget) => {
      if (item.id === failAt) throw new Error(`failed to mount ${item.id}`)
      const node = document.createElement('span')
      const staging = target?.parent ?? document.createDocumentFragment()
      staging.insertBefore(node, target?.before ?? null)
      return { node, patch() {}, dispose: () => disposed.push(item.id) }
    }
    const initialItems = [0, 1, 2].map(id => ({ id, label: String(id) }))
    const previous = _$reconcileKeyed(parent, anchor, [], initialItems, item => item.id, mount)
    const originalDOM = [...parent.childNodes]

    expect(() =>
      _$reconcileKeyed(
        parent,
        anchor,
        previous,
        initialItems.concat({ id: 1, label: 'prefix duplicate' }),
        item => item.id,
        mount,
      ),
    ).toThrow(/duplicate.*key/)
    expect(() =>
      _$reconcileKeyed(
        parent,
        anchor,
        previous,
        initialItems.concat([
          { id: 3, label: 'three' },
          { id: 3, label: 'tail duplicate' },
        ]),
        item => item.id,
        mount,
      ),
    ).toThrow(/duplicate.*key/)
    expect(disposed).toEqual([])
    expect([...parent.childNodes]).toEqual(originalDOM)

    failAt = 5
    expect(() =>
      _$reconcileKeyed(
        parent,
        anchor,
        previous,
        initialItems.concat([3, 4, 5].map(id => ({ id, label: String(id) }))),
        item => item.id,
        mount,
      ),
    ).toThrow('failed to mount 5')
    expect(disposed).toEqual([3, 4])
    expect([...parent.childNodes]).toEqual(originalDOM)
  })

  it.each(['direct', 'plain', 'frozen', 'wrong target'] as const)(
    'batch creation, append and replacement preserve ranges with %s results',
    mode => {
      const parent = document.createElement('div')
      const anchor = document.createComment('end')
      parent.append(anchor)
      const mounts: Array<
        Pick<ReturnType<typeof mountRowFactory<Item>>, 'node' | 'last' | 'patch' | 'dispose'>
      > = []
      const disposed: number[] = []
      const mount = (item: Item, _index: number, target?: CompactCompiledKeyedMountTarget) => {
        const actualTarget =
          mode === 'wrong target'
            ? { parent: document.createDocumentFragment(), before: null, batch: true as const }
            : target
        const result = mountRowFactory<Item>(
          () => {
            const fragment = document.createDocumentFragment()
            const node = document.createElement('span')
            node.textContent = item.label
            fragment.append(node, document.createTextNode('tail'))
            onOwnerCleanup(() => disposed.push(item.id))
            return [fragment.firstChild, fragment.lastChild] as const
          },
          () => {},
          actualTarget,
        )
        const returned =
          mode === 'plain'
            ? { node: result.node, last: result.last, patch: result.patch, dispose: result.dispose }
            : mode === 'frozen'
              ? Object.freeze(result)
              : result
        mounts.push(returned)
        return returned
      }
      let rows: CompactCompiledKeyedRow<Item, number>[] = []
      let items: Item[] = []
      for (const phase of ['create', 'append', 'replace']) {
        const added = Array.from({ length: 1000 }, (_, i) => ({
          id: mounts.length + i,
          label: String(mounts.length + i),
        }))
        items = phase === 'append' ? items.concat(added) : added
        const start = mounts.length
        rows = _$reconcileKeyed(parent, anchor, rows, items, item => item.id, mount)
        for (let i = 0; i < added.length; i++) {
          const row = rows[phase === 'append' ? i + 1000 : i]
          if (mode === 'direct') expect(row).toBe(mounts[start + i])
          else {
            expect(row).not.toBe(mounts[start + i])
            expect(mounts[start + i]).not.toHaveProperty('key')
          }
          expect(row.key).toBe(added[i].id)
          expect(row.item).toBe(added[i])
          expect(row.index).toBe(phase === 'append' ? i + 1000 : i)
        }
        expect([...parent.childNodes]).toEqual([
          ...rows.flatMap(row => [row.node, row.last!]),
          anchor,
        ])
      }
      expect(disposed).toEqual(Array.from({ length: 2000 }, (_, i) => i))
      _$reconcileKeyed(parent, anchor, rows, [], item => item.id, mount)
      expect(disposed).toHaveLength(3000)
    },
    60_000,
  )

  it.each(['create', 'append', 'replace'])(
    'rolls back every direct row after a mid-%s mount failure',
    phase => {
      const parent = document.createElement('div')
      const disposed: number[] = []
      const nodes: Node[] = []
      const error = new Error('mount failed')
      const mount = (item: Item, _index: number, target?: CompactCompiledKeyedMountTarget) =>
        mountRowFactory<Item>(
          () => {
            onOwnerCleanup(() => disposed.push(item.id))
            if (item.id === 4) throw error
            const node = document.createElement('span')
            nodes.push(node)
            return [node, node] as const
          },
          () => {},
          target,
        )
      const items = [0, 1].map(id => ({ id, label: String(id) }))
      const old = _$reconcileKeyed(
        parent,
        null,
        [],
        phase === 'create' ? [] : items,
        item => item.id,
        mount,
      )
      const added = [2, 3, 4].map(id => ({ id, label: String(id) }))
      expect(() =>
        _$reconcileKeyed(
          parent,
          null,
          old,
          phase === 'append' ? items.concat(added) : added,
          item => item.id,
          mount,
        ),
      ).toThrow(error)
      expect(disposed).toEqual([4, 2, 3])
      expect([...parent.childNodes]).toEqual(old.map(row => row.node))
      expect(nodes.slice(old.length).every(node => node.parentNode === null)).toBe(true)
      _$reconcileKeyed(parent, null, old, [], item => item.id, mount)
    },
  )

  it.each([false, true])(
    'full replacement deletes contiguous old rows with one Range (range=%s)',
    multi => {
      const { parent, anchor, disposed, render } = batchFixture(multi)
      render(Array.from({ length: 1000 }, (_, id) => ({ id, label: String(id) })))
      const range = document.createRange()
      const deletion = vi.spyOn(range, 'deleteContents')
      vi.spyOn(document, 'createRange').mockReturnValue(range)
      const remove = vi.spyOn(parent, 'removeChild')
      const insert = vi.spyOn(parent, 'insertBefore')
      const next = render(
        Array.from({ length: 1000 }, (_, i) => ({ id: i + 1000, label: String(i) })),
      )
      expect(deletion).toHaveBeenCalledTimes(1)
      expect(remove).not.toHaveBeenCalled()
      expect(insert).toHaveBeenCalledExactlyOnceWith(expect.any(DocumentFragment), anchor)
      expect(disposed).toEqual(Array.from({ length: 1000 }, (_, id) => id))
      expect([...parent.childNodes]).toEqual([
        ...next.flatMap(row => (multi ? [row.node, row.last!] : [row.node])),
        anchor,
      ])
    },
  )

  it.each(['gap', 'no Range'])('full replacement safely falls back for %s', mode => {
    const { parent, anchor, disposed, render } = batchFixture(true)
    const old = render([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ])
    const unrelated = document.createElement('i')
    if (mode === 'gap') parent.insertBefore(unrelated, old[1].node)
    if (mode === 'no Range')
      Object.defineProperty(document, 'createRange', { configurable: true, value: undefined })
    const remove = vi.spyOn(parent, 'removeChild')
    let next: CompactCompiledKeyedRow<Item, number>[]
    try {
      next = render([{ id: 3, label: 'three' }])
    } finally {
      if (mode === 'no Range')
        delete (document as unknown as { createRange?: () => Range }).createRange
    }
    expect(disposed).toEqual([1, 2])
    expect(remove).toHaveBeenCalledTimes(4)
    expect([...parent.childNodes]).toEqual([
      ...(mode === 'gap' ? [unrelated] : []),
      next[0].node,
      next[0].last,
      anchor,
    ])
  })

  it.each([false, true])(
    'cleans all old and staged rows after replacement cleanup failure (rollback throws=%s)',
    rollbackThrows => {
      const parent = document.createElement('div')
      const anchor = document.createComment('end')
      parent.append(anchor)
      const disposed: number[] = []
      const nodes: Node[] = []
      const originalError = new Error('old cleanup failed')
      const rollbackError = new Error('new cleanup failed')
      const mount = (item: Item) => {
        const node = document.createElement('span')
        nodes.push(node)
        return {
          node,
          patch() {},
          dispose() {
            disposed.push(item.id)
            if (item.id === 1) throw originalError
            if (item.id === 3 && rollbackThrows) throw rollbackError
          },
        }
      }
      const old = _$reconcileKeyed(
        parent,
        anchor,
        [],
        [1, 2].map(id => ({ id, label: String(id) })),
        item => item.id,
        mount,
      )
      let caught: unknown
      try {
        _$reconcileKeyed(
          parent,
          anchor,
          old,
          [3, 4].map(id => ({ id, label: String(id) })),
          item => item.id,
          mount,
        )
      } catch (error) {
        caught = error
      }
      if (rollbackThrows) {
        expect(caught).toBeInstanceOf(AggregateError)
        expect((caught as AggregateError).errors).toEqual([originalError, rollbackError])
      } else expect(caught).toBe(originalError)
      expect(disposed).toEqual([1, 2, 3, 4])
      expect([...parent.childNodes]).toEqual([anchor])
      expect(nodes.every(node => node.parentNode === null)).toBe(true)
    },
  )

  it('clears 1k contiguous rows with one Range deletion and no per-node removal', () => {
    const { parent, anchor, disposed, render } = batchFixture(true)
    render(Array.from({ length: 1000 }, (_, id) => ({ id, label: String(id) })))
    const range = document.createRange()
    const deleteContents = vi.spyOn(range, 'deleteContents')
    vi.spyOn(document, 'createRange').mockReturnValue(range)
    const remove = vi.spyOn(parent, 'removeChild')

    const rows = render([])

    expect(rows).toEqual([])
    expect([...parent.childNodes]).toEqual([anchor])
    expect(disposed).toHaveLength(1000)
    expect(new Set(disposed).size).toBe(1000)
    expect(deleteContents).toHaveBeenCalledTimes(1)
    expect(remove).not.toHaveBeenCalled()
  })

  it('falls back to per-node removal when createRange is unavailable', () => {
    const { parent, anchor, disposed, render } = batchFixture(true)
    render([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ])
    const hadOwnCreateRange = Object.hasOwn(document, 'createRange')
    const originalCreateRange = document.createRange
    Object.defineProperty(document, 'createRange', { configurable: true, value: undefined })
    const remove = vi.spyOn(parent, 'removeChild')

    try {
      expect(render([])).toEqual([])
    } finally {
      if (hadOwnCreateRange) {
        Object.defineProperty(document, 'createRange', {
          configurable: true,
          value: originalCreateRange,
        })
      } else {
        delete (document as unknown as { createRange?: () => Range }).createRange
      }
    }

    expect([...parent.childNodes]).toEqual([anchor])
    expect(disposed).toEqual([1, 2])
    expect(remove).toHaveBeenCalledTimes(4)
  })

  it('falls back without deleting unrelated DOM when rows are not contiguous', () => {
    const { parent, anchor, disposed, render } = batchFixture()
    const rows = render([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ])
    const unrelated = document.createElement('i')
    parent.insertBefore(unrelated, rows[1].node)
    const createRange = vi.spyOn(document, 'createRange')
    const remove = vi.spyOn(parent, 'removeChild')

    expect(render([])).toEqual([])

    expect([...parent.childNodes]).toEqual([unrelated, anchor])
    expect(disposed).toEqual([1, 2])
    expect(createRange).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledTimes(2)
  })

  it('deletes the contiguous DOM range and releases every sibling when cleanup throws', () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    const disposed: number[] = []
    const mount = (item: Item) => {
      const node = document.createElement('span')
      node.textContent = item.label
      return {
        node,
        patch() {},
        dispose() {
          disposed.push(item.id)
          if (item.id === 2) throw new Error('row cleanup failed')
        },
      }
    }
    const previous = _$reconcileKeyed(
      parent,
      anchor,
      [],
      [
        { id: 1, label: 'one' },
        { id: 2, label: 'two' },
        { id: 3, label: 'three' },
      ],
      item => item.id,
      mount,
    )
    const range = document.createRange()
    const deleteContents = vi.spyOn(range, 'deleteContents')
    vi.spyOn(document, 'createRange').mockReturnValue(range)
    const remove = vi.spyOn(parent, 'removeChild')

    expect(() => _$reconcileKeyed(parent, anchor, previous, [], item => item.id, mount)).toThrow(
      'row cleanup failed',
    )
    expect(disposed).toEqual([1, 2, 3])
    expect([...parent.childNodes]).toEqual([anchor])
    expect(deleteContents).toHaveBeenCalledTimes(1)
    expect(remove).not.toHaveBeenCalled()
  })

  it('appends 1k rows without patching, refreshing or moving the stable 1k prefix', () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    const initial = Array.from({ length: 1000 }, (_, id) => ({ id, label: String(id) }))
    let mounts = 0
    let patches = 0
    let refreshes = 0
    const mount = (item: Item, _index: number, target?: CompactCompiledKeyedMountTarget) => {
      mounts += 1
      const staging = target?.parent ?? document.createDocumentFragment()
      const node = document.createElement('span')
      node.textContent = item.label
      staging.insertBefore(node, target?.before ?? null)
      return {
        node,
        patch: () => {
          patches += 1
        },
        memo: {
          read: <T>(read: () => T) => read(),
          refresh: () => {
            refreshes += 1
            return false
          },
          dispose() {},
        },
        dispose() {},
      }
    }
    const previous = _$reconcileKeyed(parent, anchor, [], initial, item => item.id, mount)
    const prefixNodes = previous.map(row => row.node)
    const insert = vi.spyOn(parent, 'insertBefore')
    insert.mockClear()
    mounts = 0

    const next = _$reconcileKeyed(
      parent,
      anchor,
      previous,
      [
        ...initial,
        ...Array.from({ length: 1000 }, (_, offset) => ({
          id: offset + 1000,
          label: String(offset + 1000),
        })),
      ],
      item => item.id,
      mount,
    )

    expect(next.slice(0, 1000).map(row => row.node)).toEqual(prefixNodes)
    expect(next).toHaveLength(2000)
    expect(mounts).toBe(1000)
    expect(patches).toBe(0)
    expect(refreshes).toBe(0)
    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledWith(expect.any(DocumentFragment), anchor)
  })

  it('falls back when an append-like update replaces a prefix object', () => {
    const { parent, anchor, render } = fixture()
    const a = { id: 1, label: 'one' }
    const b = { id: 2, label: 'two' }
    const previous = render([a, b])

    const next = render([{ ...a, label: 'ONE' }, b, { id: 3, label: 'three' }])

    expect(next.slice(0, 2).map(row => row.node)).toEqual(previous.map(row => row.node))
    expect(next[0].node.textContent).toBe('ONE')
    expect([...parent.childNodes]).toEqual([next[0].node, next[1].node, next[2].node, anchor])
  })

  it('falls back for a middle insertion and preserves the surrounding row identities', () => {
    const { parent, anchor, render } = fixture()
    const a = { id: 1, label: 'one' }
    const b = { id: 2, label: 'two' }
    const previous = render([a, b])

    const next = render([a, { id: 3, label: 'three' }, b])

    expect(next[0].node).toBe(previous[0].node)
    expect(next[2].node).toBe(previous[1].node)
    expect([...parent.childNodes]).toEqual([next[0].node, next[1].node, next[2].node, anchor])
  })

  it('rejects a duplicate tail key before mounting any appended rows', () => {
    const { parent, anchor, render } = batchFixture()
    const previous = render([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ])

    expect(() =>
      render([
        previous[0].item,
        previous[1].item,
        { id: 3, label: 'three' },
        { id: 1, label: 'duplicate' },
      ]),
    ).toThrow(/duplicate.*key/)
    expect([...parent.childNodes]).toEqual([previous[0].node, previous[1].node, anchor])

    expect(() =>
      render([
        previous[0].item,
        previous[1].item,
        { id: 3, label: 'three' },
        { id: 3, label: 'duplicate tail' },
      ]),
    ).toThrow(/duplicate.*key/)
    expect([...parent.childNodes]).toEqual([previous[0].node, previous[1].node, anchor])
  })

  it('falls back and restores a prefix range from another parent before appending', () => {
    const { parent, anchor, render } = fixture(true)
    const initial = [
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ]
    const previous = render(initial)
    const other = document.createElement('div')
    other.append(previous[1].node, previous[1].last!)

    const next = render([...initial, { id: 3, label: 'three' }])

    expect([...parent.childNodes]).toEqual([
      next[0].node,
      next[0].last,
      next[1].node,
      next[1].last,
      next[2].node,
      next[2].last,
      anchor,
    ])
  })

  it('batch appends ordered multi-node ranges and rolls them back on mount failure', () => {
    const successful = batchFixture(true)
    const initialItems = [
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ]
    const previous = successful.render(initialItems)
    const insert = vi.spyOn(successful.parent, 'insertBefore')
    insert.mockClear()
    const next = successful.render([...initialItems, { id: 3, label: 'three' }])
    expect([...successful.parent.childNodes]).toEqual([
      previous[0].node,
      previous[0].last,
      previous[1].node,
      previous[1].last,
      next[2].node,
      next[2].last,
      successful.anchor,
    ])
    expect(insert).toHaveBeenCalledTimes(1)

    const failing = batchFixture(true, 4)
    const original = failing.render(initialItems)
    expect(() =>
      failing.render([...initialItems, { id: 3, label: 'three' }, { id: 4, label: 'four' }]),
    ).toThrow('failed to mount 4')
    expect([...failing.parent.childNodes]).toEqual([
      original[0].node,
      original[0].last,
      original[1].node,
      original[1].last,
      failing.anchor,
    ])
    expect(failing.disposed).toContain(3)
  })

  it('patches only changed items for a 1k stable-key sparse update without Map or Set', () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    const initial = Array.from({ length: 1000 }, (_, id) => ({ id, label: String(id) }))
    let keyReads = 0
    let patches = 0
    const mount = (item: Item) => {
      const node = document.createElement('span')
      node.textContent = item.label
      return {
        node,
        patch: (next: Item) => {
          patches += 1
          node.textContent = next.label
        },
        dispose() {},
      }
    }
    const getKey = (item: Item) => {
      keyReads += 1
      return item.id
    }
    const previous = _$reconcileKeyed(parent, anchor, [], initial, getKey, mount)
    const updated = initial.map((item, index) =>
      index % 10 === 0 ? { ...item, label: `updated:${item.id}` } : item,
    )
    const NativeMap = globalThis.Map
    const NativeSet = globalThis.Set
    let keyedMapAllocations = 0
    let keyedSetAllocations = 0
    class CountingMap<K, V> extends NativeMap<K, V> {
      constructor(entries?: readonly (readonly [K, V])[] | null) {
        super(entries)
        if (entries?.length === 1000) keyedMapAllocations += 1
      }
    }
    class CountingSet<T> extends NativeSet<T> {
      override add(value: T): this {
        super.add(value)
        if (this.size === 1000 && [...this].every(entry => typeof entry === 'number')) {
          keyedSetAllocations += 1
        }
        return this
      }
    }
    vi.stubGlobal('Map', CountingMap)
    vi.stubGlobal('Set', CountingSet)
    keyReads = 0
    let next: CompactCompiledKeyedRow<Item, number>[]

    try {
      next = _$reconcileKeyed(parent, anchor, previous, updated, getKey, mount)
    } finally {
      vi.unstubAllGlobals()
    }
    expect(next!.map(row => row.node)).toEqual(previous.map(row => row.node))
    expect(next![0].node.textContent).toBe('updated:0')
    expect(next![1].node.textContent).toBe('1')
    expect(keyReads).toBe(1000)
    expect(patches).toBe(100)
    expect(keyedMapAllocations).toBe(0)
    expect(keyedSetAllocations).toBe(0)
  })

  it('patches reused rows whose index changed but skips stable item/index pairs', () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    const patched: Array<[number, number]> = []
    const mount = (item: Item) => {
      const node = document.createElement('span')
      node.textContent = item.label
      return {
        node,
        patch: (next: Item, index: number) => patched.push([next.id, index]),
        dispose() {},
      }
    }
    const a = { id: 1, label: 'one' }
    const b = { id: 2, label: 'two' }
    const c = { id: 3, label: 'three' }
    const inserted = { id: 4, label: 'four' }
    const previous = _$reconcileKeyed(parent, anchor, [], [a, b, c], item => item.id, mount)

    _$reconcileKeyed(parent, anchor, previous, [a, inserted, b, c], item => item.id, mount)

    expect(patched).toEqual([
      [2, 2],
      [3, 3],
    ])
  })

  it('skips index-only patches when the compiler proves a multi-node row ignores index', () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    const patched: Array<[number, number]> = []
    const mount = (item: Item) => {
      const node = document.createElement('span')
      const last = document.createTextNode(`tail:${item.id}`)
      const staging = document.createDocumentFragment()
      node.textContent = item.label
      staging.append(node, last)
      return {
        node,
        last,
        patch: (next: Item, index: number) => {
          patched.push([next.id, index])
          node.textContent = next.label
        },
        dispose() {},
      }
    }
    const a = { id: 1, label: 'one' }
    const b = { id: 2, label: 'two' }
    const c = { id: 3, label: 'three' }
    const original = _$reconcileKeyed(parent, anchor, [], [a, b, c], item => item.id, mount, false)

    const reordered = _$reconcileKeyed(
      parent,
      anchor,
      original,
      [c, a, b],
      item => item.id,
      mount,
      false,
    )
    expect(patched).toEqual([])
    expect(reordered.map(row => row.node)).toEqual([
      original[2].node,
      original[0].node,
      original[1].node,
    ])
    expect(reordered.map(row => row.index)).toEqual([0, 1, 2])
    expect([...parent.childNodes]).toEqual([
      reordered[0].node,
      reordered[0].last,
      reordered[1].node,
      reordered[1].last,
      reordered[2].node,
      reordered[2].last,
      anchor,
    ])

    const removed = _$reconcileKeyed(
      parent,
      anchor,
      reordered,
      [a, b],
      item => item.id,
      mount,
      false,
    )
    expect(patched).toEqual([])
    expect(removed.map(row => row.index)).toEqual([0, 1])

    const replacement = { id: 1, label: 'ONE' }
    _$reconcileKeyed(parent, anchor, removed, [replacement, b], item => item.id, mount, false)
    expect(patched).toEqual([[1, 0]])
    expect(removed[0].node.textContent).toBe('ONE')
    expect(removed[0].item).toBe(replacement)
  })

  it.each([false, true])('does not move unchanged ranges during text updates (range=%s)', range => {
    const { parent, anchor, render } = fixture(range)
    const nodes = render([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ]).map(row => row.node)
    const insert = vi.mocked(parent.insertBefore)
    insert.mockClear()
    const updated = render([
      { id: 1, label: 'ONE' },
      { id: 2, label: 'two' },
    ])
    expect(updated.map(row => row.node)).toEqual(nodes)
    expect(nodes[0].textContent).toBe('ONE')
    expect(parent.lastChild).toBe(anchor)
    expect(insert).not.toHaveBeenCalled()
  })

  it('restores a range that moved to a different parent', () => {
    const { parent, render } = fixture(true)
    const items = [{ id: 1, label: 'one' }]
    const row = render(items)[0]
    const other = document.createElement('div')
    other.append(row.node, row.last!)
    render(items)
    expect(row.node.parentNode).toBe(parent)
    expect(row.last!.parentNode).toBe(parent)
    expect(row.node.nextSibling).toBe(row.last)
  })

  it('keeps multi-node ranges ordered through insertion, removal and reversal', () => {
    const { parent, anchor, render } = fixture(true)
    const a = { id: 1, label: 'one' },
      b = { id: 2, label: 'two' },
      c = { id: 3, label: 'three' }
    const original = render([a, b])
    render([c, a, b])
    const next = render([b, a])
    expect(next[0].node).toBe(original[1].node)
    expect(next[1].node).toBe(original[0].node)
    expect([...parent.childNodes]).toEqual([
      next[0].node,
      next[0].last,
      next[1].node,
      next[1].last,
      anchor,
    ])
    render([])
    expect([...parent.childNodes]).toEqual([anchor])
  })

  it('moves at most two single-node rows for distant and adjacent swaps', () => {
    const { parent, render } = fixture()
    const items = Array.from({ length: 1000 }, (_, id) => ({ id, label: String(id) }))
    const original = render(items)
    const insert = vi.mocked(parent.insertBefore)

    insert.mockClear()
    const distant = items.slice()
    ;[distant[1], distant[998]] = [distant[998], distant[1]]
    const swapped = render(distant)
    expect(insert).toHaveBeenCalledTimes(2)
    expect(swapped[1].node).toBe(original[998].node)
    expect(swapped[998].node).toBe(original[1].node)

    insert.mockClear()
    const adjacent = distant.slice()
    ;[adjacent[500], adjacent[501]] = [adjacent[501], adjacent[500]]
    render(adjacent)
    expect(insert.mock.calls.length).toBeLessThanOrEqual(2)
  })

  it('counts each node once when swapping multi-node rows and still patches content', () => {
    const { parent, render } = fixture(true)
    const items = Array.from({ length: 12 }, (_, id) => ({ id, label: String(id) }))
    const original = render(items)
    const insert = vi.mocked(parent.insertBefore)
    insert.mockClear()
    const swapped = items.map(item => ({ ...item }))
    ;[swapped[2], swapped[9]] = [swapped[9], swapped[2]]
    swapped[5] = { ...swapped[5], label: 'updated' }
    const next = render(swapped)
    expect(insert).toHaveBeenCalledTimes(4)
    expect(next[2].node).toBe(original[9].node)
    expect(next[9].node).toBe(original[2].node)
    expect(next[5].node.textContent).toBe('updated')
  })

  it.each([1000, 10_000])(
    'assembles %i initial rows in one list fragment and commits once',
    count => {
      const createFragment = vi.spyOn(document, 'createDocumentFragment')
      const { parent, anchor, render } = batchFixture()
      const insert = vi.spyOn(parent, 'insertBefore')

      const rows = render(Array.from({ length: count }, (_, id) => ({ id, label: String(id) })))

      expect(rows).toHaveLength(count)
      expect(parent.childNodes).toHaveLength(count + 1)
      expect(parent.lastChild).toBe(anchor)
      expect(createFragment).toHaveBeenCalledTimes(1)
      expect(insert).toHaveBeenCalledTimes(1)
      expect(insert).toHaveBeenCalledWith(expect.any(DocumentFragment), anchor)
    },
  )

  it('batch commits a full-key replacement with ordered multi-node ranges', () => {
    const createFragment = vi.spyOn(document, 'createDocumentFragment')
    const { parent, anchor, disposed, render } = batchFixture(true)
    render([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ])
    const insert = vi.spyOn(parent, 'insertBefore')
    insert.mockClear()
    createFragment.mockClear()

    const next = render([
      { id: 3, label: 'three' },
      { id: 4, label: 'four' },
    ])

    expect([...parent.childNodes]).toEqual([
      next[0].node,
      next[0].last,
      next[1].node,
      next[1].last,
      anchor,
    ])
    expect(disposed).toEqual([1, 2])
    expect(createFragment).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledWith(expect.any(DocumentFragment), anchor)
  })

  it('rolls back already-mounted rows when a batched replacement throws', () => {
    const { parent, anchor, disposed, render } = batchFixture(false, 4)
    const original = render([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ])

    expect(() =>
      render([
        { id: 3, label: 'three' },
        { id: 4, label: 'four' },
        { id: 5, label: 'five' },
      ]),
    ).toThrow('failed to mount 4')
    expect([...parent.childNodes]).toEqual([original[0].node, original[1].node, anchor])
    expect(disposed).toEqual([3])
  })

  it('validates every initial key before mounting and rejects a duplicate at row 1000', () => {
    const parent = document.createElement('div')
    const items = Array.from({ length: 1000 }, (_, id) => id)
    let keyReads = 0
    let mounts = 0
    const getKey = (item: number) => {
      keyReads += 1
      return item
    }
    const mount = (item: number) => {
      expect(keyReads).toBe(1000)
      mounts += 1
      const node = document.createElement('span')
      node.textContent = String(item)
      return { node, patch() {}, dispose() {} }
    }
    expect(() =>
      _$reconcileKeyed(parent, null, [], [...items.slice(0, -1), 0], getKey, mount),
    ).toThrow(/duplicate.*key/)
    expect(keyReads).toBe(1000)
    expect(mounts).toBe(0)
    expect(parent.childNodes).toHaveLength(0)
    keyReads = 0
    const rows = _$reconcileKeyed(parent, null, [], items, getKey, mount)
    expect(mounts).toBe(1000)
    expect(rows.map(row => row.key)).toEqual(items)
    expect([...parent.childNodes]).toEqual(rows.map(row => row.node))
  })

  it('rolls back initial native rows and resources even when one cleanup throws', () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    const baseline = __rueGetCompiledReactiveDebugState()
    const cleaned: number[] = []
    const nodes: Node[] = []
    const failure = new Error('initial mount failed')
    const cleanupFailure = new Error('initial cleanup failed')
    let caught: unknown
    try {
      _$reconcileKeyed(
        parent,
        anchor,
        [],
        Array.from({ length: 1000 }, (_, i) => i),
        item => item,
        (item, _index, target) =>
          mountRowFactory(
            () => {
              onOwnerCleanup(() => {
                cleaned.push(item)
                if (item === 0) throw cleanupFailure
              })
              if (item === 500) throw failure
              const node = document.createElement('span')
              nodes.push(node)
              return [node, node] as const
            },
            () => {},
            target,
          ),
      )
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(AggregateError)
    expect((caught as AggregateError).errors).toEqual([failure, cleanupFailure])
    expect(cleaned.slice().sort((a, b) => a - b)).toEqual(Array.from({ length: 501 }, (_, i) => i))
    expect(nodes.every(node => node.parentNode === null)).toBe(true)
    expect([...parent.childNodes]).toEqual([anchor])
    expect(__rueGetCompiledReactiveDebugState()).toEqual(baseline)
  })

  it('disposes compiled row owners when a batched mount fails', () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    const cleaned: number[] = []
    const mount = (item: Item, _index: number, target?: CompactCompiledKeyedMountTarget) =>
      _$mountCompiledKeyedRow<Item>(
        (rowTarget, _props, owner) => {
          onOwnerCleanup(() => cleaned.push(item.id))
          const node = document.createElement('span')
          rowTarget.parent.insertBefore(node, rowTarget.before)
          if (item.id === 2) throw new Error('compiled row failed')
          return {
            owner,
            first: node,
            last: node,
            dispose: () => disposeOwner(owner),
          }
        },
        () => {},
        undefined,
        target,
      )

    expect(() =>
      _$reconcileKeyed(
        parent,
        anchor,
        [],
        [
          { id: 1, label: 'one' },
          { id: 2, label: 'two' },
        ],
        item => item.id,
        mount,
      ),
    ).toThrow('compiled row failed')
    expect([...parent.childNodes]).toEqual([anchor])
    expect(cleaned.sort()).toEqual([1, 2])
  })
})

describe('single owner native setup lifecycle', () => {
  it('parents the owner, mounts explicit roots and aggregates failed cleanup during rollback', () => {
    const baseline = __rueGetCompiledReactiveDebugState()
    const parentOwner = createOwner()
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    const events: string[] = []
    const roots = [document.createElement('span'), document.createTextNode('tail')]
    const row = runWithOwner(parentOwner, () =>
      mountRowFactory(
        () => {
          expect(getOwnerParent(getOwnerParent(getCurrentOwner()!)!)).toBe(parentOwner)
          registerOwnerLifecycle('mounted', () => events.push('mounted'))
          onOwnerCleanup(() => events.push('cleanup'))
          const fragment = document.createDocumentFragment()
          fragment.append(...roots)
          return [roots[0], roots[1]] as const
        },
        () => {},
        { parent, before: anchor },
      ),
    )!
    expect([...parent.childNodes]).toEqual([...roots, anchor])
    expect(row.node).toBe(roots[0])
    expect(row.last).toBe(roots[1])
    expect(events).toEqual(['mounted'])
    disposeOwner(parentOwner)
    row.dispose()
    expect(events).toEqual(['mounted', 'cleanup'])
    expect(__rueGetCompiledReactiveDebugState()).toEqual(baseline)

    const failedRoot = document.createElement('span')
    expect(() =>
      mountRowFactory(
        () => {
          parent.insertBefore(failedRoot, anchor)
          onOwnerCleanup(() => {
            throw new Error('cleanup failed')
          })
          onOwnerCleanup(() => events.push('second cleanup'))
          onOwnerCleanup(() => failedRoot.remove())
          throw new Error('setup failed')
        },
        () => {},
        { parent, before: anchor },
      ),
    ).toThrow(AggregateError)
    expect(failedRoot.parentNode).toBeNull()
    expect(events).toContain('second cleanup')
    expect(__rueGetCompiledReactiveDebugState()).toEqual(baseline)
  })
})

describe('ownerless single row lifecycle', () => {
  it('clears compiler-proven fixed-key subscriptions as one full-list batch', () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    const registry = { clear: vi.fn() }
    const individualCleanup = vi.fn()
    const replaceChildren = vi.spyOn(parent, 'replaceChildren')
    const mount = (item: Item, _index: number, target?: CompactCompiledKeyedMountTarget) =>
      _$mountCompiledKeyedSingleRowDirect<Item>(
        () => {
          const node = document.createElement('span')
          node.textContent = item.label
          const cleanup = Object.assign(individualCleanup, {
            [_$selectorCleanupRegistry]: registry,
          })
          onOwnerCleanup(cleanup)
          return [node, node]
        },
        () => {},
        undefined,
        target,
      )
    const previous = _$reconcileKeyedSingle(
      parent,
      anchor,
      [],
      [
        { id: 1, label: 'one' },
        { id: 2, label: 'two' },
      ],
      item => item.id,
      mount,
      false,
      true,
    )

    expect(
      _$reconcileKeyedSingle(parent, anchor, previous, [], item => item.id, mount, false, true),
    ).toEqual([])
    expect(registry.clear).toHaveBeenCalledTimes(1)
    expect(individualCleanup).not.toHaveBeenCalled()
    expect(replaceChildren).toHaveBeenCalledWith(anchor)
    expect([...parent.childNodes]).toEqual([anchor])
  })

  it('mounts direct row setups without a compiled block handle', () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    const cleaned: number[] = []
    let rows: CompactCompiledKeyedSingleRow<Item, number>[] = []
    const mount = (item: Item, _index: number, target?: CompactCompiledKeyedMountTarget) => {
      let current = item
      let node!: HTMLSpanElement
      return _$mountCompiledKeyedSingleRowDirect<Item>(
        parentContext => {
          expect(parentContext).toBe(target?.parent)
          node = document.createElement('span')
          node.textContent = current.label
          onOwnerCleanup(() => cleaned.push(item.id))
          return [node, node]
        },
        next => {
          current = next
          node.textContent = current.label
        },
        undefined,
        target,
      )
    }
    const render = (items: Item[]) => {
      rows = _$reconcileKeyedSingle(
        parent,
        anchor,
        rows,
        items,
        item => item.id,
        mount,
        false,
        true,
      )
      return rows
    }

    const initial = render([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
    ])
    expect([...parent.childNodes]).toEqual([initial[0].node, initial[1].node, anchor])
    const updated = render([
      { id: 2, label: 'updated' },
      { id: 1, label: 'one' },
    ])
    expect(updated[0].node).toBe(initial[1].node)
    expect(updated[0].node.textContent).toBe('updated')
    expect(render([])).toEqual([])
    expect(cleaned.sort()).toEqual([1, 2])
    expect([...parent.childNodes]).toEqual([anchor])
  })

  it('detaches one contiguous DOM range before releasing ownerless row blocks', () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    const range = document.createRange()
    const deleteContents = vi.spyOn(range, 'deleteContents')
    vi.spyOn(document, 'createRange').mockReturnValue(range)
    const remove = vi.spyOn(parent, 'removeChild')
    const disposalConnectivity: boolean[] = []
    const mount = (item: Item, _index: number, target?: CompactCompiledKeyedMountTarget) =>
      _$mountCompiledKeyedSingleRowOwnerless<Item>(
        (rowTarget, _props, owner) => {
          const node = document.createElement('span')
          node.textContent = item.label
          rowTarget.parent.insertBefore(node, rowTarget.before)
          return {
            owner,
            first: node,
            last: node,
            dispose() {
              disposalConnectivity.push(node.parentNode === parent)
              node.parentNode?.removeChild(node)
            },
          }
        },
        () => {},
        undefined,
        target,
      )

    const previous = _$reconcileKeyedSingle(
      parent,
      anchor,
      [],
      Array.from({ length: 1000 }, (_, id) => ({ id, label: String(id) })),
      item => item.id,
      mount,
      false,
      true,
    )
    expect(() =>
      _$reconcileKeyedSingle(parent, anchor, previous, [], item => item.id, mount, false, true),
    ).not.toThrow()

    expect(deleteContents).toHaveBeenCalledTimes(1)
    expect(remove).not.toHaveBeenCalled()
    expect(disposalConnectivity).toEqual(Array.from({ length: 1000 }, () => false))
    expect([...parent.childNodes]).toEqual([anchor])
  })

  it('ownerless single rows collect cleanup without allocating owners', () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    const baselineOwners = __rueGetCompiledReactiveDebugState().activeOwners
    const cleaned: number[] = []
    let rows: CompactCompiledKeyedSingleRow<Item, number>[] = []
    const mount = (item: Item, _index: number, target?: CompactCompiledKeyedMountTarget) => {
      let current = item
      let node!: HTMLSpanElement
      return _$mountCompiledKeyedSingleRowOwnerless<Item>(
        (rowTarget, _props, owner) => {
          node = document.createElement('span')
          node.textContent = current.label
          rowTarget.parent.insertBefore(node, rowTarget.before)
          onOwnerCleanup(() => cleaned.push(item.id))
          return { owner, first: node, last: node, dispose() {} }
        },
        next => {
          current = next
          node.textContent = current.label
        },
        undefined,
        target,
      )
    }
    const render = (items: Item[]) => {
      rows = _$reconcileKeyedSingle(parent, anchor, rows, items, item => item.id, mount)
      expect(__rueGetCompiledReactiveDebugState().activeOwners).toBe(baselineOwners)
      return rows
    }
    const items = Array.from({ length: 1000 }, (_, id) => ({ id, label: String(id) }))
    const initial = render(items)
    const nodes = initial.map(row => row.node)

    const updated = items.slice()
    updated[500] = { ...updated[500], label: 'updated' }
    let next = render(updated)
    expect(next.map(row => row.node)).toEqual(nodes)
    expect(next[500].node.textContent).toBe('updated')

    ;[updated[1], updated[998]] = [updated[998], updated[1]]
    next = render(updated)
    expect(next[1].node).toBe(nodes[998])
    expect(next[998].node).toBe(nodes[1])

    next = render(updated.slice(0, 750))
    expect(cleaned).toHaveLength(250)
    expect(new Set(cleaned).size).toBe(250)
    expect([...parent.childNodes]).toEqual([...next.map(row => row.node), anchor])

    expect(render([])).toEqual([])
    expect(cleaned).toHaveLength(1000)
    expect(new Set(cleaned).size).toBe(1000)
    expect([...parent.childNodes]).toEqual([anchor])
  })

  it('rolls back ownerless single rows and aggregates cleanup failures', () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    const baseline = __rueGetCompiledReactiveDebugState()
    const cleaned: number[] = []
    const mountFailure = new Error('ownerless mount failed')
    const cleanupFailure = new Error('ownerless cleanup failed')
    const nodes: Node[] = []
    const mount = (item: Item, _index: number, target?: CompactCompiledKeyedMountTarget) =>
      _$mountCompiledKeyedSingleRowOwnerless<Item>(
        (rowTarget, _props, owner) => {
          onOwnerCleanup(() => {
            cleaned.push(item.id)
            if (item.id === 0) throw cleanupFailure
          })
          if (item.id === 500) throw mountFailure
          const node = document.createElement('span')
          nodes.push(node)
          rowTarget.parent.insertBefore(node, rowTarget.before)
          return { owner, first: node, last: node, dispose() {} }
        },
        () => {},
        undefined,
        target,
      )

    let caught: unknown
    try {
      _$reconcileKeyedSingle(
        parent,
        anchor,
        [],
        Array.from({ length: 1000 }, (_, id) => ({ id, label: String(id) })),
        item => item.id,
        mount,
      )
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(AggregateError)
    expect((caught as AggregateError).errors).toEqual([mountFailure, cleanupFailure])
    expect(cleaned.slice().sort((a, b) => a - b)).toEqual(Array.from({ length: 501 }, (_, i) => i))
    expect(nodes.every(node => node.parentNode === null)).toBe(true)
    expect([...parent.childNodes]).toEqual([anchor])
    expect(__rueGetCompiledReactiveDebugState()).toEqual(baseline)
  })
})

it('disposes staged factories when removing an old row fails during a mixed update', () => {
  const parent = document.createElement('div')
  const baseline = __rueGetCompiledReactiveDebugState()
  const cleaned: number[] = []
  const mount = (id: number, _index: number, target?: CompactCompiledKeyedMountTarget) =>
    mountRowFactory(
      () => {
        const node = document.createElement('span')
        node.textContent = String(id)
        onOwnerCleanup(() => {
          cleaned.push(id)
          if (id === 1) throw new Error('old row cleanup failed')
        })
        return [node, node] as const
      },
      () => {},
      target,
    )
  const previous = _$reconcileKeyed(parent, null, [], [1, 2], id => id, mount)
  expect(() => _$reconcileKeyed(parent, null, previous, [2, 3], id => id, mount)).toThrow(
    'old row cleanup failed',
  )
  expect(cleaned).toEqual([1, 3])
  expect(parent.textContent).toBe('2')
  previous[1].dispose()
  expect(__rueGetCompiledReactiveDebugState()).toEqual(baseline)
})
