// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'

import {
  _$compiledListMemo,
  _$mountCompiledKeyedRow,
  _$reconcileKeyed,
  type CompactCompiledKeyedRow,
} from '../src/compiler-runtime/compact-keyed-list'
import {
  createOwner,
  disposeOwner,
  onOwnerCleanup,
  runWithOwner,
  setReactiveScheduling,
  signal,
} from '../src/runtime-core/compiled'

type Row = { id: number }

const createMemo = (source: ReturnType<typeof signal<number>>, reads: number[]) =>
  _$compiledListMemo(() => {
    reads.push(source.get())
    return [source.get()]
  })

afterEach(() => setReactiveScheduling('frame'))

describe('compact keyed memo retention', () => {
  it('returns 1k row owners and memo subscriptions to baseline after a range clear', () => {
    setReactiveScheduling('sync')
    const source = signal(0)
    const parent = document.createElement('tbody')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    let ownerCleanups = 0
    let memoReads = 0
    const mount = (item: Row) => {
      const memo = _$compiledListMemo(() => {
        memoReads += 1
        return [source.get()]
      })
      return _$mountCompiledKeyedRow<Row>(
        (target, _props, owner) => {
          onOwnerCleanup(() => {
            ownerCleanups += 1
          })
          const node = document.createElement('tr')
          node.dataset.id = String(item.id)
          target.parent.insertBefore(node, target.before)
          return {
            first: node,
            last: node,
            dispose: () => disposeOwner(owner),
          }
        },
        () => {},
        memo,
      )
    }
    let rows = _$reconcileKeyed(
      parent,
      anchor,
      [],
      Array.from({ length: 1000 }, (_, id) => ({ id })),
      row => row.id,
      mount,
    )
    expect(memoReads).toBe(1000)

    rows = _$reconcileKeyed(parent, anchor, rows, [], row => row.id, mount)
    const readsAfterClear = memoReads
    source.set(1)

    expect(rows).toEqual([])
    expect(ownerCleanups).toBe(1000)
    expect(memoReads).toBe(readsAfterClear)
    expect([...parent.childNodes]).toEqual([anchor])
  })

  it('reports and consumes dependency changes, including in-place item changes', () => {
    const item = { id: 1, label: 'one' }
    const memo = _$compiledListMemo(() => [item.label])

    expect(memo.refresh()).toBe(false)
    item.label = 'ONE'
    expect(memo.refresh()).toBe(true)
    expect(memo.refresh()).toBe(false)
    memo.dispose()
  })

  it('patches a stable-key row when memo dependencies change on the same item object', () => {
    const parent = document.createElement('div')
    const item = { id: 1, label: 'one' }
    let patches = 0
    const mount = (mountedItem: typeof item) => {
      const node = document.createElement('span')
      node.textContent = mountedItem.label
      const memo = _$compiledListMemo(() => [mountedItem.label])
      parent.appendChild(node)
      return {
        node,
        memo,
        patch: (next: typeof item) => {
          patches += 1
          node.textContent = next.label
        },
        dispose: () => memo.dispose(),
      }
    }
    const previous = _$reconcileKeyed(parent, null, [], [item], row => row.id, mount)

    _$reconcileKeyed(parent, null, previous, [item], row => row.id, mount)
    expect(patches).toBe(0)
    item.label = 'ONE'
    _$reconcileKeyed(parent, null, previous, [item], row => row.id, mount)

    expect(patches).toBe(1)
    expect(parent.textContent).toBe('ONE')
  })

  it('releases a deleted row and every row cleared from the list', () => {
    setReactiveScheduling('sync')
    const source = signal(0)
    const reads: number[] = []
    const parent = document.createElement('tbody')
    let rows: CompactCompiledKeyedRow<Row, number>[] = []
    const mount = (_item: Row) => {
      const memo = createMemo(source, reads)
      const node = document.createElement('tr')
      parent.appendChild(node)
      return {
        node,
        patch: () => {},
        memo,
        dispose: () => memo.dispose(),
      }
    }

    rows = _$reconcileKeyed(parent, null, rows, [{ id: 1 }, { id: 2 }], row => row.id, mount)
    expect(reads).toEqual([0, 0])
    const removedMemo = rows[0].memo!
    const clearedMemo = rows[1].memo!

    rows = _$reconcileKeyed(parent, null, rows, [{ id: 2 }], row => row.id, mount)
    // Reused rows refresh memo values during reconciliation without subscribing
    // the enclosing list effect to the memo's dependencies.
    expect(reads).toEqual([0, 0, 0])
    source.set(1)
    expect(reads).toEqual([0, 0, 0, 1])
    removedMemo.refresh()
    expect(reads).toEqual([0, 0, 0, 1])

    rows = _$reconcileKeyed(parent, null, rows, [], row => row.id, mount)
    source.set(2)
    clearedMemo.refresh()
    expect(reads).toEqual([0, 0, 0, 1])
  })

  it('releases memo dependencies when the root owner unmounts', () => {
    setReactiveScheduling('sync')
    const source = signal(0)
    const reads: number[] = []
    const owner = createOwner()

    const memo = runWithOwner(owner, () => createMemo(source, reads))!
    expect(reads).toEqual([0])
    expect(disposeOwner(owner)).toBe(true)

    source.set(1)
    memo.refresh()
    expect(reads).toEqual([0])
  })

  it('releases memo dependencies when row mounting throws', () => {
    setReactiveScheduling('sync')
    const source = signal(0)
    const reads: number[] = []
    const memo = createMemo(source, reads)

    expect(() =>
      _$mountCompiledKeyedRow(
        () => {
          throw new Error('mount failed')
        },
        () => {},
        memo,
      ),
    ).toThrow('mount failed')

    source.set(1)
    memo.refresh()
    expect(reads).toEqual([0])
  })
})
