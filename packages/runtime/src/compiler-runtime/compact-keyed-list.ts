import {
  createOwner,
  disposeOwner,
  effect,
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
  patch(item: T, index: number): void
  dispose(): void
}

/** Compiler-proven single DOM node row. Intentionally excludes range metadata. */
export interface CompactCompiledKeyedSingleRow<T, K = unknown> {
  key: K
  item: T
  index: number
  node: Node
  memo?: CompactListMemo
  patch(item: T, index: number): void
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
let initializingRowOwner: ReturnType<typeof createOwner> | undefined

const mountBatchRow = <T, K>(
  staging: DocumentFragment,
  item: T,
  index: number,
  key: K,
  mount: CompactCompiledKeyedMount<T>,
  created: CompactCompiledKeyedRow<T, K>[],
): void => {
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
  const after = last.nextSibling
  let cursor: Node | null = row.node
  while (cursor !== after) {
    const next: Node | null = cursor!.nextSibling
    insertBefore(parent, cursor!, before)
    cursor = next
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
    row.patch(item, index)
    row.memo?.refresh()
    row.item = item
    row.index = index
    return
  }
  row.item = item
  row.index = index
  if (row.memo?.refresh()) row.patch(item, index)
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
): boolean => {
  if (rows.length === 0) return true
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
  for (const row of rows) collectError(errors, () => row.dispose())
  collectError(errors, () => range.deleteContents())
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
): CompactCompiledKeyedRow<T, K>[] => {
  const staging = createDocumentFragment(parent)
  const created: CompactCompiledKeyedRow<T, K>[] = []
  try {
    items.forEach((item, index) => {
      mountBatchRow(staging, item, index, keys[index], mount, created)
    })
    // Keep the old UI intact until every replacement row has mounted.
    if (!clearContiguousRows(parent, before, previous)) clearRowsIndividually(parent, previous)
  } catch (error) {
    const errors = [error]
    for (const row of created) collectError(errors, () => disposeDetachedRow(row))
    throwCollectedErrors(errors)
  }
  insertBefore(parent, staging, before)
  return created
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
): CompactCompiledKeyedRow<T, K>[] => {
  let result: CompactCompiledKeyedRow<T, K>[] = []
  withDOMHostOperations(parent, () => {
    result = (() => {
      if (items.length === 0) {
        if (!clearContiguousRows(parent, before, previous)) clearRowsIndividually(parent, previous)
        return []
      }
      const keys = items.map(getKey)
      if (
        previous.length === items.length &&
        keys.every((key, index) => sameKey(key, previous[index].key))
      ) {
        const next = previous.slice()
        let cursor = before
        for (let index = next.length - 1; index >= 0; index--) {
          refreshReusedRow(next[index], items[index], index, rowUsesIndex)
          moveRange(parent, next[index], cursor)
          cursor = next[index].node
        }
        return next
      }
      const stableAppend =
        items.length > previous.length &&
        previous.every(
          (row, index) => sameKey(row.key, keys[index]) && Object.is(row.item, items[index]),
        )
      if (new Set(keys).size !== keys.length) throw new Error('duplicate key')
      const old = new Map(previous.map(row => [row.key, row]))
      if (keys.every(key => !old.has(key)))
        return mountBatch(parent, before, previous, items, keys, mount)
      const created: CompactCompiledKeyedRow<T, K>[] = []
      const staging = createDocumentFragment(parent)
      let next: CompactCompiledKeyedRow<T, K>[]
      try {
        next = items.map((item, index) => {
          const key = keys[index]
          const reused = old.get(key)
          if (reused) {
            old.delete(key)
            if (!stableAppend) refreshReusedRow(reused, item, index, rowUsesIndex)
            return reused
          }
          mountBatchRow(staging, item, index, key, mount, created)
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
