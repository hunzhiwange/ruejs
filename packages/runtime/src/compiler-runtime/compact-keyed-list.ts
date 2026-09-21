import {
  _$collectCompiledOwnerCleanups,
  createOwner,
  disposeOwner,
  renderEffect as effect,
  runWithOwner,
  signal,
  untrack,
} from '../runtime-core/compiled'
import {
  createDocumentFragment,
  insertBefore,
  removeChild,
  withDOMHostOperations,
} from './dom.browser'
import type { BlockFactory } from './block-factory'
import type { BlockSetup } from './block'
import {
  _$selectorCleanupRegistry,
  type SelectorCleanupRegistry,
  type SelectorKeyCleanup,
} from '../runtime-core/reactive-kernel/selector'

export interface CompactListMemo {
  read: <T>(read: () => T) => T
  refresh: () => boolean
  dispose: () => void
}

export const _$compiledListMemo = (dependencies: () => readonly unknown[]): CompactListMemo => {
  let dependencyReader: (() => readonly unknown[]) | undefined = dependencies
  let dependencySnapshot: readonly unknown[] | undefined
  let dependenciesChanged = false
  const snapshot = signal<readonly unknown[]>([], {
    equals: (previous, next) =>
      previous.length === next.length && next.every((value, i) => Object.is(value, previous[i])),
  })
  const update = () => {
    const readDependencies = dependencyReader
    if (readDependencies === undefined) return
    const next = readDependencies().slice()
    const previous = dependencySnapshot
    dependencySnapshot = next
    if (
      previous !== undefined &&
      (previous.length !== next.length ||
        next.some((value, index) => !Object.is(value, previous[index])))
    ) {
      dependenciesChanged = true
    }
    snapshot.set(next)
  }
  const watcher = effect(update, {
    onDispose: () => {
      dependencyReader = undefined
      dependencySnapshot = undefined
      dependenciesChanged = false
      snapshot.dispose()
      snapshot.set([])
    },
  })
  return {
    read: read => {
      snapshot.get()
      return untrack(read)
    },
    refresh: () =>
      untrack(() => {
        update()
        const changed = dependenciesChanged
        dependenciesChanged = false
        return changed
      }),
    dispose: () => watcher.dispose(),
  }
}

export interface CompactCompiledKeyedRow<T, K = unknown> {
  key: K
  item: T
  index: number
  node: Node
  last?: Node
  memo?: CompactListMemo
  patch(item: T, index: number, memoChanged?: boolean): void
  dispose(): void
}

/** Compiler-proven single DOM node row. Intentionally excludes range metadata. */
export interface CompactCompiledKeyedSingleRow<T, K = unknown> {
  key: K
  item: T
  index: number
  node: Node
  memo?: CompactListMemo
  patch(item: T, index: number, memoChanged?: boolean): void
  dispose(): void
}

export interface CompactCompiledKeyedMountTarget {
  parent: ParentNode
  before: Node | null
  batch?: true
}

export type CompactCompiledKeyedMount<T> = (
  item: T,
  index: number,
  target?: CompactCompiledKeyedMountTarget,
) => Omit<CompactCompiledKeyedRow<T>, 'key' | 'item' | 'index'>

export type CompactCompiledKeyedSingleMount<T> = (
  item: T,
  index: number,
  target?: CompactCompiledKeyedMountTarget,
) => Omit<CompactCompiledKeyedSingleRow<T>, 'key' | 'item' | 'index'>

// Only our inserting setup helper can certify a fresh result for this batch parent.
// Keep the capability out of the exported mount result type.
const batchPlacement = Symbol('rue.batchPlacement')
const directCleanups = Symbol('rue.directCleanups')
const directPatch = Symbol('rue.directPatch')
const ownerlessRowOwner = 0
let initializingRowOwner: ReturnType<typeof createOwner> | undefined

const mountBatchRow = <T, K>(
  staging: DocumentFragment,
  item: T,
  index: number,
  key: K,
  mount: CompactCompiledKeyedMount<T>,
  created: CompactCompiledKeyedRow<T, K>[],
  ownerless: boolean,
): void => {
  if (ownerless) {
    // Nested ownerless lists must not consume the owner of an enclosing row.
    const previousOwner = initializingRowOwner
    initializingRowOwner = undefined
    let mounted: ReturnType<typeof mount>
    try {
      mounted = mount(item, index, { parent: staging, before: null, batch: true })
    } finally {
      initializingRowOwner = previousOwner
    }
    if (
      (mounted as typeof mounted & { [batchPlacement]?: ParentNode })[batchPlacement] === staging
    ) {
      const row = mounted as CompactCompiledKeyedRow<T, K>
      row.key = key
      row.item = item
      row.index = index
      created.push(row)
      return
    }
    const row = { ...mounted, key, item, index } as CompactCompiledKeyedRow<T, K>
    created.push(row)
    moveRange(staging, row, null)
    return
  }
  // Initialize row signals, memo and DOM under the same row owner, including the
  // declarations emitted before the BlockFactory is invoked.
  const owner = createOwner()
  const previousOwner = initializingRowOwner
  initializingRowOwner = owner
  let mounted: ReturnType<CompactCompiledKeyedMount<T>>
  try {
    mounted = runWithOwner(owner, () =>
      mount(item, index, { parent: staging, before: null, batch: true }),
    )!
    if (!Object.isExtensible(mounted)) mounted = { ...mounted }
    const dispose = mounted.dispose
    mounted.dispose = () => {
      try {
        dispose()
      } finally {
        disposeOwner(owner)
      }
    }
  } catch (error) {
    const errors = [error]
    collectError(errors, () => {
      disposeOwner(owner)
    })
    throwCollectedErrors(errors)
    throw error
  } finally {
    initializingRowOwner = previousOwner
  }
  if (
    (mounted as typeof mounted & { [batchPlacement]?: ParentNode })[batchPlacement] === staging &&
    Object.isExtensible(mounted)
  ) {
    const row = mounted as CompactCompiledKeyedRow<T, K>
    row.key = key
    row.item = item
    row.index = index
    created.push(row)
    return
  }
  const row = { ...mounted, key, item, index } as CompactCompiledKeyedRow<T, K>
  created.push(row)
  moveRange(staging, row, null)
}

const lastNode = (row: Pick<CompactCompiledKeyedRow<unknown>, 'node' | 'last'>) =>
  row.last ?? row.node
const sameKey = (left: unknown, right: unknown) =>
  left === right || (left !== left && right !== right)

const collectError = (errors: unknown[], run: () => void): void => {
  try {
    run()
  } catch (error) {
    errors.push(error)
  }
}

const throwCollectedErrors = (errors: unknown[]): void => {
  if (errors.length === 1) throw errors[0]
  if (errors.length > 1) throw new AggregateError(errors, 'cleanup')
}

const moveRange = (
  parent: Node & ParentNode,
  row: Pick<CompactCompiledKeyedRow<unknown>, 'node' | 'last'>,
  before: Node | null,
): void => {
  const last = lastNode(row)
  if (row.node.parentNode === parent && last.parentNode === parent && last.nextSibling === before) {
    return
  }
  const active = row.node.ownerDocument?.activeElement
  let containsActive = false
  let activeCursor: Node | null = row.node
  while (active != null && activeCursor != null) {
    if (activeCursor === active || activeCursor.contains(active)) {
      containsActive = true
      break
    }
    if (activeCursor === last) break
    activeCursor = activeCursor.nextSibling
  }
  const input = containsActive ? (active as HTMLInputElement) : undefined
  const selectionStart = input?.selectionStart ?? null
  const selectionEnd = input?.selectionEnd ?? null
  const selectionDirection = input?.selectionDirection ?? null
  const after = last.nextSibling
  let cursor: Node | null = row.node
  while (cursor !== after) {
    const next: Node | null = cursor!.nextSibling
    insertBefore(parent, cursor!, before)
    cursor = next
  }
  if (input instanceof HTMLElement && input.ownerDocument.activeElement !== input) {
    input.focus()
    if (selectionStart != null && selectionEnd != null && 'setSelectionRange' in input) {
      input.setSelectionRange(selectionStart, selectionEnd, selectionDirection ?? undefined)
    }
  }
}

const disposeRow = <T, K>(parent: Node & ParentNode, row: CompactCompiledKeyedRow<T, K>) => {
  const last = lastNode(row)
  let cursor: Node | null = row.node
  try {
    row.dispose()
  } finally {
    while (cursor != null) {
      const next: Node | null = cursor.nextSibling
      if (cursor.parentNode === parent) removeChild(parent, cursor)
      if (cursor === last) break
      cursor = next
    }
  }
}

const clearRowsIndividually = <T, K>(
  parent: Node & ParentNode,
  rows: readonly CompactCompiledKeyedRow<T, K>[],
): void => {
  const errors: unknown[] = []
  for (const row of rows) collectError(errors, () => row.dispose())
  for (const row of rows) {
    const last = lastNode(row)
    let cursor: Node | null = row.node
    while (cursor != null) {
      const next: Node | null = cursor.nextSibling
      if (cursor.parentNode === parent) collectError(errors, () => removeChild(parent, cursor!))
      if (cursor === last) break
      cursor = next
    }
  }
  throwCollectedErrors(errors)
}

const disposeDetachedRow = <T, K>(row: CompactCompiledKeyedRow<T, K>) => {
  const parent = row.node.parentNode
  if (parent != null) disposeRow(parent as Node & ParentNode, row)
  else row.dispose()
}

/** Release row-owned resources when the containing compiled root is destroyed. */
export const _$disposeCompiledKeyedRows = <T, K>(
  rows: readonly CompactCompiledKeyedRow<T, K>[],
): void => {
  const errors: unknown[] = []
  for (const row of rows) collectError(errors, () => row.dispose())
  throwCollectedErrors(errors)
}

const refreshReusedRow = <T, K>(
  row: CompactCompiledKeyedRow<T, K>,
  item: T,
  index: number,
  rowUsesIndex: boolean,
): void => {
  const itemChanged = !Object.is(row.item, item)
  const indexChanged = row.index !== index
  if (itemChanged || (rowUsesIndex && indexChanged)) {
    row.patch(item, index, false)
    if (!(row as CompactCompiledKeyedRow<T, K> & { [directPatch]?: true })[directPatch])
      row.memo?.refresh()
    row.item = item
    row.index = index
    return
  }
  row.item = item
  row.index = index
  if (row.memo?.refresh()) row.patch(item, index, true)
}

const hasContiguousRowsBefore = <T, K>(
  parent: Node & ParentNode,
  before: Node | null,
  rows: readonly CompactCompiledKeyedRow<T, K>[],
): boolean => {
  let cursor = before
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index]
    const last = lastNode(row)
    if (
      row.node.parentNode !== parent ||
      last.parentNode !== parent ||
      last.nextSibling !== cursor
    ) {
      return false
    }
    cursor = row.node
  }
  return true
}

const clearContiguousRows = <T, K>(
  parent: Node & ParentNode,
  before: Node | null,
  rows: readonly CompactCompiledKeyedRow<T, K>[],
  ownerless: boolean,
  clearAllOwnerless = false,
): boolean => {
  if (rows.length === 0) return true
  if (
    ownerless &&
    clearAllOwnerless &&
    rows[0].node === parent.firstChild &&
    (before === null || before === parent.lastChild) &&
    parent.childNodes.length === rows.length + (before === null ? 0 : 1)
  ) {
    const registries = new Set<SelectorCleanupRegistry>()
    const canBatchCleanups = rows.every(row => {
      const cleanups = (
        row as CompactCompiledKeyedRow<T, K> & {
          [directCleanups]?: SelectorKeyCleanup[]
        }
      )[directCleanups]
      if (cleanups === undefined) return false
      return cleanups.every(cleanup => {
        const registry = cleanup[_$selectorCleanupRegistry]
        if (registry === undefined) return false
        registries.add(registry)
        return true
      })
    })
    if (canBatchCleanups) {
      const errors: unknown[] = []
      try {
        for (const registry of registries) registry.clear()
        if (before === null) parent.replaceChildren()
        else parent.replaceChildren(before)
      } catch (error) {
        errors.push(error)
        for (const row of rows) {
          try {
            row.dispose()
          } catch (disposeError) {
            errors.push(disposeError)
          }
        }
      }
      throwCollectedErrors(errors)
      return true
    }
  }
  if (!hasContiguousRowsBefore(parent, before, rows)) return false
  const ownerDocument = rows[0].node.ownerDocument
  if (ownerDocument == null || typeof ownerDocument.createRange !== 'function') return false

  let range: Range
  try {
    range = ownerDocument.createRange()
    range.setStartBefore(rows[0].node)
    range.setEndAfter(lastNode(rows[rows.length - 1]))
  } catch {
    return false
  }

  const errors: unknown[] = []
  if (ownerless) {
    let batchCleanupsCleared = false
    const registries = new Set<SelectorCleanupRegistry>()
    const canBatchCleanups =
      clearAllOwnerless &&
      rows.every(row => {
        const cleanups = (
          row as CompactCompiledKeyedRow<T, K> & {
            [directCleanups]?: SelectorKeyCleanup[]
          }
        )[directCleanups]
        if (cleanups === undefined) return false
        return cleanups.every(cleanup => {
          const registry = cleanup[_$selectorCleanupRegistry]
          if (registry === undefined) return false
          registries.add(registry)
          return true
        })
      })
    if (canBatchCleanups) {
      try {
        for (const registry of registries) registry.clear()
        batchCleanupsCleared = true
      } catch (error) {
        errors.push(error)
      }
    }
    // Compiler-proven ownerless rows cannot observe their DOM during cleanup, so
    // detach the contiguous range once instead of letting every block remove its
    // node individually before the range operation becomes a no-op.
    try {
      if (
        batchCleanupsCleared &&
        rows[0].node === parent.firstChild &&
        (before === null || before === parent.lastChild)
      ) {
        if (before === null) parent.replaceChildren()
        else parent.replaceChildren(before)
      } else {
        range.deleteContents()
      }
    } catch (error) {
      errors.push(error)
    }
    if (!batchCleanupsCleared) {
      for (const row of rows) {
        try {
          row.dispose()
        } catch (error) {
          errors.push(error)
        }
      }
    }
  } else {
    for (const row of rows) collectError(errors, () => row.dispose())
    collectError(errors, () => range.deleteContents())
  }
  throwCollectedErrors(errors)
  return true
}

const mountBatch = <T, K>(
  parent: Node & ParentNode,
  before: Node | null,
  previous: readonly CompactCompiledKeyedRow<T, K>[],
  items: readonly T[],
  keys: readonly K[],
  mount: CompactCompiledKeyedMount<T>,
  ownerless: boolean,
): CompactCompiledKeyedRow<T, K>[] => {
  const staging = createDocumentFragment(parent)
  const created: CompactCompiledKeyedRow<T, K>[] = []
  try {
    items.forEach((item, index) => {
      mountBatchRow(staging, item, index, keys[index], mount, created, ownerless)
    })
    // Keep the old UI intact until every replacement row has mounted.
    if (!clearContiguousRows(parent, before, previous, ownerless))
      clearRowsIndividually(parent, previous)
  } catch (error) {
    const errors = [error]
    for (const row of created) collectError(errors, () => disposeDetachedRow(row))
    throwCollectedErrors(errors)
  }
  insertBefore(parent, staging, before)
  return created
}

const mountStableAppend = <T, K>(
  parent: Node & ParentNode,
  before: Node | null,
  previous: readonly CompactCompiledKeyedRow<T, K>[],
  items: readonly T[],
  tailKeys: readonly K[],
  mount: CompactCompiledKeyedMount<T>,
  ownerless: boolean,
): CompactCompiledKeyedRow<T, K>[] => {
  const staging = createDocumentFragment(parent)
  const created: CompactCompiledKeyedRow<T, K>[] = []
  try {
    for (let index = previous.length; index < items.length; index += 1) {
      mountBatchRow(
        staging,
        items[index],
        index,
        tailKeys[index - previous.length],
        mount,
        created,
        ownerless,
      )
    }
  } catch (error) {
    const errors = [error]
    for (const row of created) collectError(errors, () => disposeDetachedRow(row))
    throwCollectedErrors(errors)
    throw error
  }
  insertBefore(parent, staging, before)
  return previous.length === 0 ? created : previous.concat(created)
}

/** The compiler supplies row factories; reconciliation only manages keyed ranges. */
export const _$reconcileKeyed = <T, K>(
  parent: Node & ParentNode,
  before: Node | null,
  previous: readonly CompactCompiledKeyedRow<T, K>[],
  items: readonly T[],
  getKey: (item: T, index: number) => K,
  mount: CompactCompiledKeyedMount<T>,
  rowUsesIndex = true,
  ownerless = false,
): CompactCompiledKeyedRow<T, K>[] => {
  let result: CompactCompiledKeyedRow<T, K>[] = []
  withDOMHostOperations(parent, () => {
    result = (() => {
      if (items.length === 0) {
        if (!clearContiguousRows(parent, before, previous, ownerless, true))
          clearRowsIndividually(parent, previous)
        return []
      }
      if (items.length > previous.length) {
        let stablePrefix = true
        for (let index = 0; index < previous.length; index += 1) {
          const row = previous[index]
          if (
            !sameKey(row.key, getKey(items[index], index)) ||
            !Object.is(row.item, items[index])
          ) {
            stablePrefix = false
            break
          }
        }
        if (stablePrefix && hasContiguousRowsBefore(parent, before, previous)) {
          const tailKeys = new Array<K>(items.length - previous.length)
          for (let index = previous.length; index < items.length; index += 1) {
            tailKeys[index - previous.length] = getKey(items[index], index)
          }
          const uniqueTailKeys = new Set(tailKeys)
          if (
            uniqueTailKeys.size !== tailKeys.length ||
            previous.some(row => uniqueTailKeys.has(row.key))
          ) {
            throw new Error('duplicate key')
          }
          return mountStableAppend(parent, before, previous, items, tailKeys, mount, ownerless)
        }
      }
      if (
        previous.length === items.length + 1 &&
        hasContiguousRowsBefore(parent, before, previous)
      ) {
        let removedIndex = 0
        while (
          removedIndex < items.length &&
          sameKey(previous[removedIndex].key, getKey(items[removedIndex], removedIndex))
        ) {
          removedIndex += 1
        }
        let stableRemoval = true
        for (let index = removedIndex; index < items.length; index += 1) {
          if (!sameKey(previous[index + 1].key, getKey(items[index], index))) {
            stableRemoval = false
            break
          }
        }
        if (stableRemoval) {
          const removed = previous[removedIndex]
          disposeRow(parent, removed)
          const next = previous.slice(0, removedIndex).concat(previous.slice(removedIndex + 1))
          for (let index = 0; index < next.length; index += 1) {
            refreshReusedRow(next[index], items[index], index, rowUsesIndex)
          }
          return next
        }
      }
      const keys = items.map(getKey)
      if (
        previous.length === items.length &&
        keys.every((key, index) => sameKey(key, previous[index].key))
      ) {
        const next = previous.slice()
        // Compiler-proven ownerless single rows that still occupy the complete parent
        // segment need no placement pass. Boundary/count checks retain recovery when
        // consumers have moved a row outside that segment.
        const placementIntact =
          ownerless &&
          next.length > 0 &&
          next[0].last === undefined &&
          next[0].node === parent.firstChild &&
          next[next.length - 1].node.nextSibling === before &&
          parent.childNodes.length === next.length + (before === null ? 0 : 1)
        for (let index = 0; index < next.length; index += 1) {
          refreshReusedRow(next[index], items[index], index, rowUsesIndex)
        }
        if (!placementIntact) {
          let cursor = before
          for (let index = next.length - 1; index >= 0; index -= 1) {
            moveRange(parent, next[index], cursor)
            cursor = next[index].node
          }
        }
        return next
      }
      if (new Set(keys).size !== keys.length) throw new Error('duplicate key')
      const old = new Map(previous.map(row => [row.key, row]))
      if (keys.every(key => !old.has(key)))
        return mountBatch(parent, before, previous, items, keys, mount, ownerless)
      const created: CompactCompiledKeyedRow<T, K>[] = []
      const staging = createDocumentFragment(parent)
      let next: CompactCompiledKeyedRow<T, K>[]
      try {
        next = items.map((item, index) => {
          const key = keys[index]
          const reused = old.get(key)
          if (reused) {
            old.delete(key)
            refreshReusedRow(reused, item, index, rowUsesIndex)
            return reused
          }
          mountBatchRow(staging, item, index, key, mount, created, ownerless)
          return created[created.length - 1]
        })
      } catch (error) {
        const errors = [error]
        for (const row of created) collectError(errors, () => disposeDetachedRow(row))
        throwCollectedErrors(errors)
        throw error
      }
      const errors: unknown[] = []
      for (const row of old.values()) collectError(errors, () => disposeRow(parent, row))
      if (errors.length) {
        for (const row of created) collectError(errors, () => disposeDetachedRow(row))
        throwCollectedErrors(errors)
      }
      // A stable prefix can append the newly mounted range in one DOM insertion.
      if (
        next.length > previous.length &&
        previous.every((row, index) => next[index] === row) &&
        hasContiguousRowsBefore(parent, before, previous)
      ) {
        insertBefore(parent, staging, before)
        return next
      }
      // Preserve the two-move swap optimization for single nodes and fragments alike.
      if (next.length === previous.length && hasContiguousRowsBefore(parent, before, previous)) {
        const changed = next.flatMap((row, index) => (row === previous[index] ? [] : [index]))
        if (changed.length === 2) {
          const [a, b] = changed
          if (next[a] === previous[b] && next[b] === previous[a]) {
            const after = lastNode(previous[b]).nextSibling
            moveRange(parent, previous[b], previous[a].node)
            moveRange(parent, previous[a], after)
            return next
          }
        }
      }
      let cursor = before
      for (let index = next.length - 1; index >= 0; index--) {
        moveRange(parent, next[index], cursor)
        cursor = next[index].node
      }
      return next
    })()
  })
  return result
}

/** Single-node proof changes code generation, not the factory or lifecycle protocol. */
export const _$reconcileKeyedSingle = _$reconcileKeyed

/** Every row is mounted through the same closed factory, including single-node rows. */
export const _$mountCompiledKeyedRow = <T>(
  factory: BlockFactory,
  patch: (item: T, index: number) => void,
  memo?: CompactListMemo,
  target?: CompactCompiledKeyedMountTarget,
) => {
  const owner = initializingRowOwner ?? createOwner()
  const parent = target?.parent ?? createDocumentFragment()
  try {
    const block = runWithOwner(owner, () => factory(target ?? { parent, before: null }, {}, owner))!
    return {
      node: block.first,
      last: block.last,
      patch,
      memo,
      dispose: () => {
        try {
          block.dispose()
        } finally {
          memo?.dispose()
        }
      },
      [batchPlacement]: target?.batch ? parent : undefined,
    }
  } catch (error) {
    disposeOwner(owner)
    memo?.dispose()
    throw error
  }
}

export const _$mountCompiledKeyedSingleRow = <T>(
  factory: BlockFactory,
  patch: (item: T, index: number) => void,
  memo?: CompactListMemo,
  target?: CompactCompiledKeyedMountTarget,
) => {
  const row = _$mountCompiledKeyedRow(factory, patch, memo, target)
  if (row.node !== row.last) {
    row.dispose()
    throw new Error('invalid row')
  }
  return row
}

/** Compiler-proven single-node row whose resources fit the compact cleanup protocol. */
export const _$mountCompiledKeyedSingleRowOwnerless = <T>(
  factory: BlockFactory,
  patch: (item: T, index: number) => void,
  memo?: CompactListMemo,
  target?: CompactCompiledKeyedMountTarget,
) => {
  const parent = target?.parent ?? createDocumentFragment()
  const cleanups: Array<() => void> = []
  let rowOwner = initializingRowOwner
  let block: ReturnType<BlockFactory> | undefined
  let disposed = false
  const collectDisposalErrors = (errors: unknown[]) => {
    if (disposed) return
    disposed = true
    if (block !== undefined) collectError(errors, () => block!.dispose())
    if (memo !== undefined) collectError(errors, () => memo.dispose())
    for (const cleanup of cleanups.splice(0)) collectError(errors, cleanup)
    if (rowOwner !== undefined) {
      collectError(errors, () => disposeOwner(rowOwner!))
      rowOwner = undefined
    }
  }
  try {
    block = _$collectCompiledOwnerCleanups(cleanups, () =>
      factory(target ?? { parent, before: null }, {}, ownerlessRowOwner),
    )
    if (block.first !== block.last) throw new Error('invalid row')
    if (rowOwner !== undefined) {
      disposeOwner(rowOwner)
      rowOwner = undefined
    }
    return {
      node: block.first,
      patch,
      memo,
      dispose: () => {
        const errors: unknown[] = []
        collectDisposalErrors(errors)
        throwCollectedErrors(errors)
      },
      [batchPlacement]: target?.batch ? parent : undefined,
    }
  } catch (error) {
    const errors = [error]
    collectDisposalErrors(errors)
    throwCollectedErrors(errors)
    throw error
  }
}

/** Compiler-proven ownerless single node mounted directly from its root setup. */
export const _$mountCompiledKeyedSingleRowDirect = <T>(
  setup: BlockSetup,
  patch: (item: T, index: number) => void,
  memo?: CompactListMemo,
  target?: CompactCompiledKeyedMountTarget,
) => {
  const parent = target?.parent ?? createDocumentFragment()
  const cleanups: Array<() => void> = []
  let rowOwner = initializingRowOwner
  if (memo === undefined && rowOwner === undefined) {
    let node: Node | undefined
    try {
      const [first, last] = _$collectCompiledOwnerCleanups(cleanups, () => setup(parent))
      if (first == null || first !== last) throw new Error('invalid row')
      node = first
      insertBefore(parent, node, target?.before ?? null)
      return {
        key: undefined,
        item: undefined,
        index: 0,
        node,
        patch,
        dispose: () => {
          const errors: unknown[] = []
          if (node?.parentNode != null) {
            collectError(errors, () => removeChild(node!.parentNode!, node!))
          }
          for (let index = 0; index < cleanups.length; index += 1) {
            collectError(errors, cleanups[index])
          }
          cleanups.length = 0
          throwCollectedErrors(errors)
        },
        [directCleanups]: cleanups,
        [directPatch]: true,
        [batchPlacement]: target?.batch ? parent : undefined,
      }
    } catch (error) {
      const errors = [error]
      if (node?.parentNode != null)
        collectError(errors, () => removeChild(node!.parentNode!, node!))
      for (let index = 0; index < cleanups.length; index += 1) {
        collectError(errors, cleanups[index])
      }
      cleanups.length = 0
      throwCollectedErrors(errors)
      throw error
    }
  }
  let node: Node | undefined
  let disposed = false
  const collectDisposalErrors = (initialErrors?: unknown[]) => {
    let errors = initialErrors
    if (disposed) return errors
    disposed = true
    if (node?.parentNode != null) {
      try {
        removeChild(node.parentNode, node)
      } catch (error) {
        ;(errors ??= []).push(error)
      }
    }
    if (memo !== undefined) {
      try {
        memo.dispose()
      } catch (error) {
        ;(errors ??= []).push(error)
      }
    }
    for (let index = 0; index < cleanups.length; index += 1) {
      try {
        cleanups[index]()
      } catch (error) {
        ;(errors ??= []).push(error)
      }
    }
    cleanups.length = 0
    if (rowOwner !== undefined) {
      try {
        disposeOwner(rowOwner)
      } catch (error) {
        ;(errors ??= []).push(error)
      }
      rowOwner = undefined
    }
    return errors
  }
  try {
    const [first, last] = _$collectCompiledOwnerCleanups(cleanups, () => setup(parent))
    if (first == null || first !== last) throw new Error('invalid row')
    node = first
    insertBefore(parent, node, target?.before ?? null)
    if (rowOwner !== undefined) {
      disposeOwner(rowOwner)
      rowOwner = undefined
    }
    return {
      key: undefined,
      item: undefined,
      index: 0,
      node,
      patch,
      memo,
      dispose: () => {
        const errors = collectDisposalErrors()
        if (errors !== undefined) throwCollectedErrors(errors)
      },
      [directCleanups]: cleanups,
      [directPatch]: true,
      [batchPlacement]: target?.batch ? parent : undefined,
    }
  } catch (error) {
    throwCollectedErrors(collectDisposalErrors([error])!)
    throw error
  }
}
