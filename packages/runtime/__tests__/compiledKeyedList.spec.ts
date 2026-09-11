// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import {
  _$compiledListMemo,
  _$reconcileKeyed,
  type CompiledKeyedRow,
} from '../src/compiled-keyed-list'

type Row = {
  id: number
  label: string
}

const rowIds = (parent: ParentNode) =>
  Array.from(parent.querySelectorAll<HTMLTableRowElement>(':scope > tr')).map(row =>
    Number(row.dataset.id),
  )

describe('_$reconcileKeyed', () => {
  it('preserves keyed identity through nine direct-root list operations', () => {
    const parent = document.createElement('tbody')
    const before = document.createComment('list:end')
    parent.appendChild(before)
    const liveClosures = new Set<number>()
    const disposeCounts = new Map<number, number>()
    const attachedAtDispose = new Map<number, boolean>()
    const clickCounts = new Map<number, number>()
    const nodes = new Map<number, HTMLTableRowElement>()

    const mount = vi.fn((item: Row, index: number) => {
      const key = item.id
      const node = document.createElement('tr')
      const onClick = () => clickCounts.set(key, (clickCounts.get(key) ?? 0) + 1)
      const patch = vi.fn((next: Row, nextIndex: number) => {
        node.dataset.id = String(next.id)
        node.dataset.index = String(nextIndex)
        node.textContent = next.label
      })
      let disposed = false

      patch(item, index)
      node.addEventListener('click', onClick)
      liveClosures.add(key)
      nodes.set(key, node)

      return {
        node,
        patch,
        dispose: vi.fn(() => {
          expect(disposed).toBe(false)
          disposed = true
          attachedAtDispose.set(key, node.parentNode === parent)
          node.removeEventListener('click', onClick)
          liveClosures.delete(key)
          disposeCounts.set(key, (disposeCounts.get(key) ?? 0) + 1)
        }),
      }
    })

    let previous: CompiledKeyedRow<Row, number>[] = []
    const render = (items: Row[]) => {
      previous = _$reconcileKeyed(parent, before, previous, items, item => item.id, mount)
      expect(rowIds(parent)).toEqual(items.map(item => item.id))
      expect(Object.keys(previous[0] ?? {}).sort()).toEqual(
        previous.length === 0 ? [] : ['dispose', 'index', 'item', 'key', 'node', 'patch'],
      )
    }

    render([
      { id: 1, label: 'one' },
      { id: 2, label: 'two' },
      { id: 3, label: 'three' },
    ]) // create
    const removedByReplace = nodes.get(2)!
    removedByReplace.click()
    expect(clickCounts.get(2)).toBe(1)

    render([
      { id: 4, label: 'four' },
      { id: 5, label: 'five' },
    ]) // replace
    expect(disposeCounts.get(1)).toBe(1)
    expect(disposeCounts.get(2)).toBe(1)
    expect(disposeCounts.get(3)).toBe(1)
    expect(attachedAtDispose.get(2)).toBe(true)
    removedByReplace.click()
    expect(clickCounts.get(2)).toBe(1)

    const four = nodes.get(4)!
    const five = nodes.get(5)!
    render([
      { id: 4, label: 'four' },
      { id: 5, label: 'five' },
      { id: 6, label: 'six' },
      { id: 7, label: 'seven' },
    ]) // append
    expect(nodes.get(4)).toBe(four)
    expect(nodes.get(5)).toBe(five)

    render([
      { id: 4, label: 'FOUR' },
      { id: 5, label: 'five' },
      { id: 6, label: 'six' },
      { id: 7, label: 'seven' },
    ]) // update
    expect(four.textContent).toBe('FOUR')
    expect(nodes.get(4)).toBe(four)

    render([
      { id: 8, label: 'eight' },
      { id: 4, label: 'FOUR' },
      { id: 5, label: 'five' },
      { id: 6, label: 'six' },
      { id: 7, label: 'seven' },
    ]) // prepend

    render([
      { id: 8, label: 'eight' },
      { id: 4, label: 'FOUR' },
      { id: 9, label: 'nine' },
      { id: 5, label: 'five' },
      { id: 6, label: 'six' },
      { id: 7, label: 'seven' },
    ]) // insert

    render([
      { id: 8, label: 'eight' },
      { id: 7, label: 'seven' },
      { id: 9, label: 'nine' },
      { id: 5, label: 'five' },
      { id: 6, label: 'six' },
      { id: 4, label: 'FOUR' },
    ]) // swap
    expect(nodes.get(4)).toBe(four)
    expect(nodes.get(5)).toBe(five)

    render([
      { id: 8, label: 'eight' },
      { id: 7, label: 'seven' },
      { id: 9, label: 'nine' },
      { id: 6, label: 'six' },
      { id: 4, label: 'FOUR' },
    ]) // remove
    expect(disposeCounts.get(5)).toBe(1)
    expect(attachedAtDispose.get(5)).toBe(true)

    render([]) // clear
    expect(parent.childNodes).toEqual(expect.objectContaining({ length: 1 }))
    expect(parent.firstChild).toBe(before)
    expect(liveClosures).toEqual(new Set())
    expect(Array.from(disposeCounts.values())).toEqual(Array.from({ length: 9 }, () => 1))
    expect(Array.from(attachedAtDispose.values()).every(Boolean)).toBe(true)
  })

  it('rejects duplicate keys explicitly', () => {
    const parent = document.createElement('tbody')
    const before = document.createComment('list:end')
    parent.appendChild(before)
    const mount = vi.fn((item: Row) => {
      const node = document.createElement('tr')
      node.dataset.id = String(item.id)
      node.textContent = item.label
      return { node, patch: vi.fn(), dispose: vi.fn() }
    })

    expect(() =>
      _$reconcileKeyed(
        parent,
        before,
        [],
        [
          { id: 1, label: 'one' },
          { id: 1, label: 'duplicate' },
        ],
        item => item.id,
        mount,
      ),
    ).toThrow(/duplicate.*key/)
    expect(mount).not.toHaveBeenCalled()
  })

  it('clears without rescanning previous keys', () => {
    const parent = document.createElement('tbody')
    const before = document.createComment('list:end')
    const getKey = vi.fn((item: Row) => item.id)
    const mount = vi.fn()
    const removeChild = vi.spyOn(parent, 'removeChild')
    let keyReads = 0
    const attachedAtDispose: boolean[] = []

    const previous = [1, 2].map(id => {
      const node = document.createElement('tr')
      node.dataset.id = String(id)
      parent.appendChild(node)
      const row = {
        key: 1,
        item: { id, label: `row ${id}` },
        node,
        patch: vi.fn(),
        dispose: vi.fn(() => attachedAtDispose.push(node.parentNode === parent)),
        index: 0,
      } as CompiledKeyedRow<Row, number>
      Object.defineProperty(row, 'key', {
        configurable: true,
        enumerable: true,
        get() {
          keyReads += 1
          return 1
        },
      })
      return row
    })
    parent.appendChild(before)

    const next = _$reconcileKeyed(parent, before, previous, [], getKey, mount)

    expect(next).toEqual([])
    expect(keyReads).toBe(0)
    expect(getKey).not.toHaveBeenCalled()
    expect(mount).not.toHaveBeenCalled()
    expect(previous.every(row => !vi.mocked(row.patch).mock.calls.length)).toBe(true)
    expect(previous.every(row => vi.mocked(row.dispose).mock.calls.length === 1)).toBe(true)
    expect(attachedAtDispose).toEqual([true, true])
    expect(removeChild).not.toHaveBeenCalled()
    expect(parent.childNodes).toEqual(expect.objectContaining({ length: 1 }))
    expect(parent.firstChild).toBe(before)
  })

  it('uses the exact two-row swap fast path without allocating a key index map', () => {
    const parent = document.createElement('tbody')
    const before = document.createComment('list:end')
    parent.appendChild(before)
    const insertBefore = vi.spyOn(parent, 'insertBefore')
    const patchCounts = new Map<number, number>()
    const mount = (item: Row) => {
      const node = document.createElement('tr')
      node.dataset.id = String(item.id)
      return {
        node,
        patch(next: Row) {
          node.dataset.id = String(next.id)
          node.textContent = next.label
          patchCounts.set(next.id, (patchCounts.get(next.id) ?? 0) + 1)
        },
        dispose: vi.fn(),
      }
    }
    const rows = Array.from({ length: 1_000 }, (_, index) => ({
      id: index + 1,
      label: `row ${index + 1}`,
    }))
    let previous = _$reconcileKeyed(parent, before, [], rows, item => item.id, mount)
    patchCounts.clear()
    insertBefore.mockClear()

    const swapped = rows.slice()
    ;[swapped[1], swapped[998]] = [
      { ...swapped[998], label: 'moved high' },
      { ...swapped[1], label: 'moved low' },
    ]
    const NativeMap = globalThis.Map
    const allocatedMaps: CountingMap<unknown, unknown>[] = []
    class CountingMap<K, V> extends NativeMap<K, V> {
      constructor(entries?: readonly (readonly [K, V])[] | null) {
        super(entries)
        allocatedMaps.push(this as CountingMap<unknown, unknown>)
      }
    }
    vi.stubGlobal('Map', CountingMap)
    try {
      previous = _$reconcileKeyed(parent, before, previous, swapped, item => item.id, mount)
    } finally {
      vi.unstubAllGlobals()
    }

    expect(
      allocatedMaps.some(
        map =>
          map.size >= 900 &&
          Array.from(map).every(
            ([key, value]) => typeof key === 'number' && typeof value === 'number',
          ),
      ),
    ).toBe(false)
    expect(insertBefore).toHaveBeenCalledTimes(2)
    expect(Array.from(patchCounts.values()).reduce((total, count) => total + count, 0)).toBe(2)
    expect(previous[1].node.textContent).toBe('moved high')
    expect(previous[998].node.textContent).toBe('moved low')
    expect(rowIds(parent)).toEqual(swapped.map(item => item.id))
  })

  it('keeps the two-row swap fast path when memo dependencies stay equal', () => {
    const parent = document.createElement('tbody')
    const before = document.createComment('list:end')
    parent.appendChild(before)
    const patches: number[] = []
    const mount = (item: Row) => {
      let current = item
      const node = document.createElement('tr')
      node.dataset.id = String(item.id)
      const memo = _$compiledListMemo(() => [current.label])
      memo.read(() => undefined)
      return {
        node,
        memo,
        patch(next: Row) {
          current = next
          patches.push(next.id)
          node.textContent = next.label
        },
        dispose: vi.fn(),
      }
    }
    const rows = Array.from({ length: 1_000 }, (_, index) => ({
      id: index + 1,
      label: `row ${index + 1}`,
    }))
    let previous = _$reconcileKeyed(parent, before, [], rows, item => item.id, mount)
    const swapped = rows.slice()
    ;[swapped[1], swapped[998]] = [swapped[998], swapped[1]]

    previous = _$reconcileKeyed(parent, before, previous, swapped, item => item.id, mount)

    expect(patches).toEqual(expect.arrayContaining([2, 999]))
    expect(patches).toHaveLength(2)
    expect(rowIds(parent)).toEqual(swapped.map(item => item.id))
  })

  it('patches an in-place memo dependency change while retaining the swap fast path', () => {
    const parent = document.createElement('tbody')
    const before = document.createComment('list:end')
    parent.appendChild(before)
    const patches: number[] = []
    const mount = (item: Row) => {
      let current = item
      const node = document.createElement('tr')
      node.dataset.id = String(item.id)
      node.textContent = item.label
      const memo = _$compiledListMemo(() => [current.label])
      memo.read(() => undefined)
      return {
        node,
        memo,
        patch(next: Row) {
          current = next
          patches.push(next.id)
          node.textContent = next.label
        },
        dispose: vi.fn(),
      }
    }
    const rows = Array.from({ length: 1_000 }, (_, index) => ({
      id: index + 1,
      label: `row ${index + 1}`,
    }))
    let previous = _$reconcileKeyed(parent, before, [], rows, item => item.id, mount)
    const mixed = rows.slice()
    ;[mixed[1], mixed[998]] = [mixed[998], mixed[1]]
    mixed[500].label = 'changed in place'

    previous = _$reconcileKeyed(parent, before, previous, mixed, item => item.id, mount)

    expect(patches).toEqual(expect.arrayContaining([2, 501, 999]))
    expect(patches).toHaveLength(3)
    expect(previous[500].node.textContent).toBe('changed in place')
    expect(rowIds(parent)).toEqual(mixed.map(item => item.id))
  })

  it('patches only changed identities for same-order and two-item swap updates', () => {
    const parent = document.createElement('tbody')
    const before = document.createComment('list:end')
    parent.appendChild(before)
    const patches: Array<[number, number]> = []
    const mount = (item: Row, index: number) => {
      const node = document.createElement('tr')
      node.dataset.id = String(item.id)
      node.dataset.index = String(index)
      node.textContent = item.label
      return {
        node,
        patch(next: Row, nextIndex: number) {
          patches.push([next.id, nextIndex])
          node.dataset.id = String(next.id)
          node.dataset.index = String(nextIndex)
          node.textContent = next.label
        },
        dispose: vi.fn(),
      }
    }
    const rows = Array.from({ length: 1_000 }, (_, index) => ({
      id: index + 1,
      label: `row ${index + 1}`,
    }))
    let previous = _$reconcileKeyed(parent, before, [], rows, item => item.id, mount)

    const updated = rows.map((item, index) =>
      index % 10 === 0 ? { ...item, label: `${item.label} updated` } : item,
    )
    previous = _$reconcileKeyed(parent, before, previous, updated, item => item.id, mount)

    expect(patches).toHaveLength(100)
    expect(patches.map(([id]) => id)).toEqual(
      expect.arrayContaining(updated.filter((_, index) => index % 10 === 0).map(item => item.id)),
    )
    expect(rowIds(parent)).toEqual(updated.map(item => item.id))

    patches.length = 0
    const swapped = updated.slice()
    ;[swapped[1], swapped[998]] = [swapped[998], swapped[1]]
    const swappedNodes = [previous[1].node, previous[998].node]
    previous = _$reconcileKeyed(parent, before, previous, swapped, item => item.id, mount)

    expect(patches).toHaveLength(2)
    expect(patches).toEqual(
      expect.arrayContaining([
        [swapped[1].id, 1],
        [swapped[998].id, 998],
      ]),
    )
    expect(previous[1].node).toBe(swappedNodes[1])
    expect(previous[998].node).toBe(swappedNodes[0])
    expect(rowIds(parent)).toEqual(swapped.map(item => item.id))
  })

  it('reorders an adjacent two-row swap while patching replacement items', () => {
    const parent = document.createElement('tbody')
    const before = document.createComment('list:end')
    parent.appendChild(before)
    const mount = (item: Row) => {
      const node = document.createElement('tr')
      const patch = (next: Row) => {
        node.dataset.id = String(next.id)
        node.textContent = next.label
      }
      patch(item)
      return { node, patch, dispose: vi.fn() }
    }

    let previous = _$reconcileKeyed(
      parent,
      before,
      [],
      [
        { id: 1, label: 'one' },
        { id: 2, label: 'two' },
      ],
      item => item.id,
      mount,
    )
    const firstNode = previous[0].node
    const secondNode = previous[1].node

    previous = _$reconcileKeyed(
      parent,
      before,
      previous,
      [
        { id: 2, label: 'TWO' },
        { id: 1, label: 'ONE' },
      ],
      item => item.id,
      mount,
    )

    expect(rowIds(parent)).toEqual([2, 1])
    expect(previous[0].node).toBe(secondNode)
    expect(previous[1].node).toBe(firstNode)
    expect(previous.map(row => row.node.textContent)).toEqual(['TWO', 'ONE'])
  })

  it('retains keyed nodes when a two-row swap also replaces a stable item', () => {
    const parent = document.createElement('tbody')
    const before = document.createComment('list:end')
    parent.appendChild(before)
    const mount = (item: Row) => {
      const node = document.createElement('tr')
      node.dataset.id = String(item.id)
      return {
        node,
        patch(next: Row) {
          node.dataset.id = String(next.id)
          node.textContent = next.label
        },
        dispose: vi.fn(),
      }
    }
    const rows = Array.from({ length: 1_000 }, (_, index) => ({
      id: index + 1,
      label: `row ${index + 1}`,
    }))
    const previous = _$reconcileKeyed(parent, before, [], rows, item => item.id, mount)
    const mixed = rows.slice()
    ;[mixed[1], mixed[998]] = [mixed[998], mixed[1]]
    mixed[500] = { ...mixed[500], label: 'unrelated replacement' }

    const next = _$reconcileKeyed(parent, before, previous, mixed, item => item.id, mount)
    expect(next[1].node).toBe(previous[998].node)
    expect(next[998].node).toBe(previous[1].node)
    expect(next[500].node).toBe(previous[500].node)
    expect(next[500].node.textContent).toBe('unrelated replacement')
    expect(rowIds(parent)).toEqual(mixed.map(item => item.id))
  })

  it('batch mounts 1k direct roots without row anchors and limits swap moves', () => {
    const parent = document.createElement('tbody')
    const before = document.createComment('list:end')
    parent.appendChild(before)
    const createFragment = vi.spyOn(document, 'createDocumentFragment')
    const createComment = vi.spyOn(document, 'createComment')
    const insertBefore = vi.spyOn(parent, 'insertBefore')
    const removeChild = vi.spyOn(parent, 'removeChild')
    const disposals = new Map<number, number>()
    const mount = vi.fn((item: Row, index: number) => {
      const key = item.id
      const node = document.createElement('tr')
      node.dataset.id = String(key)
      node.dataset.index = String(index)
      return {
        node,
        patch(next: Row, nextIndex: number) {
          node.dataset.id = String(next.id)
          node.dataset.index = String(nextIndex)
        },
        dispose() {
          expect(node.parentNode).toBe(parent)
          disposals.set(key, (disposals.get(key) ?? 0) + 1)
        },
      }
    })
    const rows = Array.from({ length: 1_000 }, (_, index) => ({
      id: index + 1,
      label: `row ${index + 1}`,
    }))

    let previous = _$reconcileKeyed(parent, before, [], rows, item => item.id, mount)
    expect(mount).toHaveBeenCalledTimes(1_000)
    expect(insertBefore).toHaveBeenCalledTimes(1)
    expect(createComment).not.toHaveBeenCalled()
    expect(createFragment).toHaveBeenCalledTimes(1)
    expect(
      Array.from(parent.childNodes).filter(node => node.nodeType === Node.COMMENT_NODE),
    ).toEqual([before])

    insertBefore.mockClear()
    const mutations: MutationRecord[] = []
    const observer = new MutationObserver(records => mutations.push(...records))
    observer.observe(parent, { childList: true })
    const swapped = rows.slice()
    ;[swapped[1], swapped[998]] = [swapped[998], swapped[1]]
    previous = _$reconcileKeyed(parent, before, previous, swapped, item => item.id, mount)
    mutations.push(...observer.takeRecords())
    observer.disconnect()

    expect(rowIds(parent)).toEqual(swapped.map(item => item.id))
    expect(insertBefore.mock.calls.length).toBeLessThanOrEqual(2)
    expect(mutations.filter(record => record.type === 'childList').length).toBeLessThanOrEqual(6)
    expect(mount).toHaveBeenCalledTimes(1_000)

    insertBefore.mockClear()
    createFragment.mockClear()
    const appended = Array.from({ length: 1_000 }, (_, index) => ({
      id: 1_001 + index,
      label: `row ${1_001 + index}`,
    }))
    previous = _$reconcileKeyed(
      parent,
      before,
      previous,
      [...swapped, ...appended],
      item => item.id,
      mount,
    )
    expect(insertBefore).toHaveBeenCalledTimes(1)
    expect(createFragment).toHaveBeenCalledTimes(1)

    removeChild.mockClear()
    const removed = swapped[500]
    previous = _$reconcileKeyed(
      parent,
      before,
      previous,
      [...swapped.filter(item => item !== removed), ...appended],
      item => item.id,
      mount,
    )
    expect(disposals.get(removed.id)).toBe(1)
    expect(removeChild).toHaveBeenCalledTimes(1)
    expect(previous).toHaveLength(1_999)
  })

  it('releases compiled row closures after repeated churn', () => {
    const parent = document.createElement('tbody')
    const before = document.createComment('list:end')
    const liveClosures = new Set<number>()
    let disposed = 0
    parent.appendChild(before)

    const mount = (item: Row) => {
      const node = document.createElement('tr')
      liveClosures.add(item.id)
      return {
        node,
        patch: (next: Row) => {
          node.textContent = next.label
        },
        dispose: () => {
          liveClosures.delete(item.id)
          disposed += 1
        },
      }
    }

    let previous: CompiledKeyedRow<Row, number>[] = []
    for (let round = 0; round < 100; round += 1) {
      const rows = Array.from({ length: 5 }, (_, index) => ({
        id: round * 100 + index,
        label: `row-${round}-${index}`,
      }))
      previous = _$reconcileKeyed(parent, before, previous, rows, item => item.id, mount)
      previous = _$reconcileKeyed(parent, before, previous, [], item => item.id, mount)
    }

    expect(previous).toEqual([])
    expect(liveClosures.size).toBe(0)
    expect(disposed).toBe(500)
    expect(parent.childNodes).toEqual(expect.objectContaining({ length: 1 }))
  })
})
