import {
  _$collectCompiledOwnerCleanups,
  createOwner,
  disposeOwner,
  effect,
  runWithOwner,
  runOwnerLifecycle,
  signal,
  untrack,
} from '../runtime-core/compiled'
import {
  createDocumentFragment,
  insertBefore,
  removeChild,
  withDOMHostOperations,
} from './dom.browser'

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

const mountBatchRow = <T, K>(
  staging: DocumentFragment,
  item: T,
  index: number,
  key: K,
  mount: CompactCompiledKeyedMount<T>,
  created: CompactCompiledKeyedRow<T, K>[],
): void => {
  const mounted = mount(item, index, { parent: staging, before: null, batch: true })
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

const isMountTarget = (
  value: CompactListMemo | CompactCompiledKeyedMountTarget | undefined,
): value is CompactCompiledKeyedMountTarget => value != null && 'parent' in value

const lastNode = (row: Pick<CompactCompiledKeyedRow<unknown>, 'node' | 'last'>) =>
  row.last ?? row.node

const collectError = (errors: unknown[], run: () => void): void => {
  try {
    run()
  } catch (error) {
    errors.push(error)
  }
}

const throwCollectedErrors = (errors: unknown[]): void => {
  if (errors.length === 1) throw errors[0]
  if (errors.length > 1) throw new AggregateError(errors, '[rue] keyed row cleanup failed')
}

const runCleanups = (cleanups: Array<() => void>): void => {
  let errors: unknown[] | undefined
  for (let index = 0; index < cleanups.length; index += 1) {
    try {
      cleanups[index]()
    } catch (error) {
      ;(errors ??= []).push(error)
    }
  }
  cleanups.length = 0
  if (errors != null) throwCollectedErrors(errors)
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

const sameKey = (left: unknown, right: unknown): boolean =>
  left === right || (left !== left && right !== right)

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
  collectError(errors, () => range.detach())
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

/** Reconcile compiler-created keyed DOM ranges without importing the full runtime facade. */
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
    if (items.length === 0) {
      if (!clearContiguousRows(parent, before, previous)) clearRowsIndividually(parent, previous)
      return
    }
    const keys = Array.from({ length: items.length }) as K[]
    let keysReady = false
    let keysValidated = false
    if (previous.length > 0 && previous.length < items.length) {
      let stablePrefix = true
      const seen = new Set<K>()
      for (let index = 0; index < items.length; index += 1) {
        const key = getKey(items[index], index)
        if (seen.has(key))
          throw new Error('[rue] duplicate keys are not supported by compiled keyed lists')
        seen.add(key)
        keys[index] = key
        if (
          index < previous.length &&
          (!sameKey(key, previous[index].key) || !Object.is(items[index], previous[index].item))
        ) {
          stablePrefix = false
        }
      }
      keysReady = true
      keysValidated = true
      if (stablePrefix && hasContiguousRowsBefore(parent, before, previous)) {
        const staging = createDocumentFragment(parent)
        const created: CompactCompiledKeyedRow<T, K>[] = []
        try {
          for (let index = previous.length; index < items.length; index += 1) {
            mountBatchRow(staging, items[index], index, keys[index], mount, created)
          }
        } catch (error) {
          for (const row of created) disposeDetachedRow(row)
          throw error
        }
        insertBefore(parent, staging, before)
        result = previous.concat(created)
        return
      }
    }
    if (previous.length === items.length) {
      let sameOrder = true
      for (let index = 0; index < items.length; index += 1) {
        const key = getKey(items[index], index)
        keys[index] = key
        if (!sameKey(key, previous[index].key)) sameOrder = false
      }
      if (sameOrder) {
        result = previous.slice()
        for (let index = 0; index < items.length; index += 1) {
          refreshReusedRow(result[index], items[index], index, rowUsesIndex)
        }
        let cursor = before
        for (let index = result.length - 1; index >= 0; index -= 1) {
          moveRange(parent, result[index], cursor)
          cursor = result[index].node
        }
        return
      }
    } else if (!keysReady) {
      for (let index = 0; index < items.length; index += 1) {
        keys[index] = getKey(items[index], index)
      }
    }

    if (!keysValidated) {
      const seen = new Set<K>()
      for (const key of keys) {
        if (seen.has(key))
          throw new Error('[rue] duplicate keys are not supported by compiled keyed lists')
        seen.add(key)
      }
    }
    if (previous.length === 0) {
      result = mountBatch(parent, before, previous, items, keys, mount)
      return
    }
    const oldByKey = new Map(previous.map(row => [row.key, row]))
    if (keys.every(key => !oldByKey.has(key))) {
      result = mountBatch(parent, before, previous, items, keys, mount)
      return
    }

    const created: CompactCompiledKeyedRow<T, K>[] = []
    try {
      result = items.map((item, index) => {
        const key = keys[index]
        const reused = oldByKey.get(key)
        if (reused) {
          oldByKey.delete(key)
          refreshReusedRow(reused, item, index, rowUsesIndex)
          return reused
        }
        const mounted = mount(item, index)
        const row = { ...mounted, key, item, index } as CompactCompiledKeyedRow<T, K>
        created.push(row)
        return row
      })
    } catch (error) {
      for (const row of created) disposeDetachedRow(row)
      result = []
      throw error
    }
    for (const row of oldByKey.values()) disposeRow(parent, row)

    if (previous.length === result.length) {
      let firstMismatch = -1
      let secondMismatch = -1
      let tooManyMismatches = false
      for (let index = previous.length - 1; index >= 0; index -= 1) {
        const row = previous[index]
        if (row.key === result[index].key) continue
        if (firstMismatch < 0) firstMismatch = index
        else if (secondMismatch < 0) secondMismatch = index
        else {
          tooManyMismatches = true
          break
        }
      }

      if (
        !tooManyMismatches &&
        firstMismatch >= 0 &&
        secondMismatch >= 0 &&
        previous[firstMismatch].key === result[secondMismatch].key &&
        previous[secondMismatch].key === result[firstMismatch].key &&
        hasContiguousRowsBefore(parent, before, previous)
      ) {
        const lowerMismatch = Math.min(firstMismatch, secondMismatch)
        const upperMismatch = Math.max(firstMismatch, secondMismatch)
        const firstRow = previous[lowerMismatch]
        const secondRow = previous[upperMismatch]
        const afterSecond = lastNode(secondRow).nextSibling
        moveRange(parent, secondRow, firstRow.node)
        if (lastNode(firstRow).nextSibling !== afterSecond) moveRange(parent, firstRow, afterSecond)
        return
      }
    }

    let cursor = before
    for (let index = result.length - 1; index >= 0; index -= 1) {
      moveRange(parent, result[index], cursor)
      cursor = result[index].node
    }
  })
  return result
}

const moveSingleNode = (
  parent: Node & ParentNode,
  row: Pick<CompactCompiledKeyedSingleRow<unknown>, 'node'>,
  before: Node | null,
): void => {
  if (row.node.parentNode === parent && row.node.nextSibling === before) return
  insertBefore(parent, row.node, before)
}

const disposeSingleRow = <T, K>(
  parent: Node & ParentNode,
  row: CompactCompiledKeyedSingleRow<T, K>,
): void => {
  try {
    row.dispose()
  } finally {
    if (row.node.parentNode === parent) removeChild(parent, row.node)
  }
}

const clearSingleRows = <T, K>(
  parent: Node & ParentNode,
  rows: readonly CompactCompiledKeyedSingleRow<T, K>[],
  before?: Node | null,
  replaceCompletePrefix = false,
): void => {
  if (rows.length === 0) return
  const last = rows[rows.length - 1].node
  const canReplaceCompletePrefix =
    replaceCompletePrefix &&
    rows[0].node === parent.firstChild &&
    last.nextSibling === before &&
    (before == null || before.nextSibling == null) &&
    typeof parent.replaceChildren === 'function'
  let range: Range | undefined
  const ownerDocument = rows[0].node.ownerDocument
  if (
    !canReplaceCompletePrefix &&
    ownerDocument != null &&
    typeof ownerDocument.createRange === 'function'
  ) {
    try {
      range = ownerDocument.createRange()
      range.setStartBefore(rows[0].node)
      range.setEndAfter(rows[rows.length - 1].node)
    } catch {
      range = undefined
    }
  }
  const errors: unknown[] = []
  for (const row of rows) {
    try {
      row.dispose()
    } catch (error) {
      errors.push(error)
    }
  }
  if (canReplaceCompletePrefix) {
    collectError(errors, () => parent.replaceChildren(...(before == null ? [] : [before])))
  } else if (range != null) {
    collectError(errors, () => range!.deleteContents())
    collectError(errors, () => range!.detach())
  } else {
    for (const row of rows) {
      if (row.node.parentNode === parent) collectError(errors, () => removeChild(parent, row.node))
    }
  }
  throwCollectedErrors(errors)
}

const mountSingleBatchRow = <T, K>(
  staging: DocumentFragment,
  item: T,
  index: number,
  key: K,
  mount: CompactCompiledKeyedSingleMount<T>,
  created: CompactCompiledKeyedSingleRow<T, K>[],
): void => {
  const row = mount(item, index, {
    parent: staging,
    before: null,
    batch: true,
  }) as CompactCompiledKeyedSingleRow<T, K>
  row.key = key
  row.item = item
  row.index = index
  created.push(row)
}

const disposeDetachedSingleRow = <T, K>(row: CompactCompiledKeyedSingleRow<T, K>): void => {
  const parent = row.node.parentNode
  if (parent != null) disposeSingleRow(parent as Node & ParentNode, row)
  else row.dispose()
}

const mountSingleBatch = <T, K>(
  parent: Node & ParentNode,
  before: Node | null,
  previous: readonly CompactCompiledKeyedSingleRow<T, K>[],
  items: readonly T[],
  keys: readonly K[],
  mount: CompactCompiledKeyedSingleMount<T>,
): CompactCompiledKeyedSingleRow<T, K>[] => {
  const staging = createDocumentFragment(parent)
  const created: CompactCompiledKeyedSingleRow<T, K>[] = []
  try {
    items.forEach((item, index) => {
      mountSingleBatchRow(staging, item, index, keys[index], mount, created)
    })
    clearSingleRows(parent, previous)
  } catch (error) {
    const errors = [error]
    for (const row of created) collectError(errors, () => disposeDetachedSingleRow(row))
    throwCollectedErrors(errors)
  }
  insertBefore(parent, staging, before)
  return created
}

/** Reconcile compiler-proven single-node keyed rows without range or mount-shape probing. */
export const _$reconcileKeyedSingle = <T, K>(
  parent: Node & ParentNode,
  before: Node | null,
  previous: readonly CompactCompiledKeyedSingleRow<T, K>[],
  items: readonly T[],
  getKey: (item: T, index: number) => K,
  mount: CompactCompiledKeyedSingleMount<T>,
  rowUsesIndex = true,
): CompactCompiledKeyedSingleRow<T, K>[] => {
  let result: CompactCompiledKeyedSingleRow<T, K>[] = []
  withDOMHostOperations(parent, () => {
    if (items.length === 0) {
      clearSingleRows(parent, previous, before, true)
      return
    }

    const keys = Array.from({ length: items.length }) as K[]
    let keysReady = false
    let keysValidated = false
    if (previous.length > 0 && previous.length < items.length) {
      let stablePrefix = true
      const seen = new Set<K>()
      for (let index = 0; index < items.length; index += 1) {
        const key = getKey(items[index], index)
        if (seen.has(key))
          throw new Error('[rue] duplicate keys are not supported by compiled keyed lists')
        seen.add(key)
        keys[index] = key
        if (
          index < previous.length &&
          (!sameKey(key, previous[index].key) || !Object.is(items[index], previous[index].item))
        ) {
          stablePrefix = false
        }
      }
      keysReady = true
      keysValidated = true
      if (stablePrefix) {
        const staging = createDocumentFragment(parent)
        const created: CompactCompiledKeyedSingleRow<T, K>[] = []
        try {
          for (let index = previous.length; index < items.length; index += 1) {
            mountSingleBatchRow(staging, items[index], index, keys[index], mount, created)
          }
        } catch (error) {
          const errors = [error]
          for (const row of created) collectError(errors, () => disposeDetachedSingleRow(row))
          throwCollectedErrors(errors)
        }
        insertBefore(parent, staging, before)
        result = previous.concat(created)
        return
      }
    }

    if (previous.length === items.length) {
      let sameOrder = true
      for (let index = 0; index < items.length; index += 1) {
        const key = getKey(items[index], index)
        keys[index] = key
        if (!sameKey(key, previous[index].key)) sameOrder = false
      }
      if (sameOrder) {
        result = previous.slice()
        for (let index = 0; index < items.length; index += 1) {
          refreshReusedRow(result[index], items[index], index, rowUsesIndex)
        }
        let cursor = before
        for (let index = result.length - 1; index >= 0; index -= 1) {
          moveSingleNode(parent, result[index], cursor)
          cursor = result[index].node
        }
        return
      }
    } else if (!keysReady) {
      for (let index = 0; index < items.length; index += 1) {
        keys[index] = getKey(items[index], index)
      }
    }

    if (!keysValidated) {
      const seen = new Set<K>()
      for (const key of keys) {
        if (seen.has(key))
          throw new Error('[rue] duplicate keys are not supported by compiled keyed lists')
        seen.add(key)
      }
    }
    if (previous.length === 0) {
      result = mountSingleBatch(parent, before, previous, items, keys, mount)
      return
    }
    const oldByKey = new Map(previous.map(row => [row.key, row]))
    if (keys.every(key => !oldByKey.has(key))) {
      result = mountSingleBatch(parent, before, previous, items, keys, mount)
      return
    }

    const created: CompactCompiledKeyedSingleRow<T, K>[] = []
    try {
      result = items.map((item, index) => {
        const key = keys[index]
        const reused = oldByKey.get(key)
        if (reused) {
          oldByKey.delete(key)
          refreshReusedRow(reused, item, index, rowUsesIndex)
          return reused
        }
        const row = mount(item, index) as CompactCompiledKeyedSingleRow<T, K>
        row.key = key
        row.item = item
        row.index = index
        created.push(row)
        return row
      })
    } catch (error) {
      const errors = [error]
      for (const row of created) collectError(errors, () => disposeDetachedSingleRow(row))
      result = []
      throwCollectedErrors(errors)
    }
    for (const row of oldByKey.values()) disposeSingleRow(parent, row)

    if (previous.length === result.length) {
      let firstMismatch = -1
      let secondMismatch = -1
      let tooManyMismatches = false
      for (let index = previous.length - 1; index >= 0; index -= 1) {
        if (sameKey(previous[index].key, result[index].key)) continue
        if (firstMismatch < 0) firstMismatch = index
        else if (secondMismatch < 0) secondMismatch = index
        else tooManyMismatches = true
      }
      if (
        !tooManyMismatches &&
        firstMismatch >= 0 &&
        secondMismatch >= 0 &&
        sameKey(previous[firstMismatch].key, result[secondMismatch].key) &&
        sameKey(previous[secondMismatch].key, result[firstMismatch].key)
      ) {
        const lowerMismatch = Math.min(firstMismatch, secondMismatch)
        const upperMismatch = Math.max(firstMismatch, secondMismatch)
        const firstRow = previous[lowerMismatch]
        const secondRow = previous[upperMismatch]
        const afterSecond = secondRow.node.nextSibling
        moveSingleNode(parent, secondRow, firstRow.node)
        moveSingleNode(parent, firstRow, afterSecond)
        return
      }
    }

    let cursor = before
    for (let index = result.length - 1; index >= 0; index -= 1) {
      moveSingleNode(parent, result[index], cursor)
      cursor = result[index].node
    }
  })
  return result
}

export const _$mountCompiledKeyedRow = <T>(
  factory: (
    target: { parent: ParentNode; before: Node | null },
    props: object,
    owner: number,
  ) => {
    first: Node
    last: Node
    dispose(): void
  },
  patch: (item: T, index: number) => void,
  memoOrTarget?: CompactListMemo | CompactCompiledKeyedMountTarget,
  target?: CompactCompiledKeyedMountTarget,
) => {
  const targetAsThirdArgument = isMountTarget(memoOrTarget)
  const memo = targetAsThirdArgument ? undefined : memoOrTarget
  const mountTarget = targetAsThirdArgument ? memoOrTarget : target
  const owner = createOwner()
  const staging = mountTarget?.parent ?? createDocumentFragment()
  try {
    const block = runWithOwner(owner, () =>
      factory(mountTarget ?? { parent: staging, before: null }, {}, owner),
    )
    if (block == null) throw new Error('[rue] compiled keyed row factory did not return a block')
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
    }
  } catch (error) {
    disposeOwner(owner)
    memo?.dispose()
    throw error
  }
}

/** Mount a compiler-proven single-root row while keeping the generic owned factory lifecycle. */
export const _$mountCompiledKeyedSingleRow = <T>(
  factory: (
    target: { parent: ParentNode; before: Node | null },
    props: object,
    owner: number,
  ) => {
    first: Node
    last: Node
    dispose(): void
  },
  patch: (item: T, index: number) => void,
  memoOrTarget?: CompactListMemo | CompactCompiledKeyedMountTarget,
  target?: CompactCompiledKeyedMountTarget,
) => {
  const targetAsThirdArgument = isMountTarget(memoOrTarget)
  const memo = targetAsThirdArgument ? undefined : memoOrTarget
  const mountTarget = targetAsThirdArgument ? memoOrTarget : target
  const owner = createOwner()
  const staging = mountTarget?.parent ?? createDocumentFragment()
  try {
    const block = runWithOwner(owner, () =>
      factory(mountTarget ?? { parent: staging, before: null }, {}, owner),
    )
    if (block == null || block.first !== block.last) {
      throw new Error('[rue] compiled single keyed row factory did not return one DOM node')
    }
    return {
      node: block.first,
      patch,
      memo,
      dispose: () => {
        try {
          block.dispose()
        } finally {
          memo?.dispose()
        }
      },
    }
  } catch (error) {
    disposeOwner(owner)
    memo?.dispose()
    throw error
  }
}

interface OwnerlessCompiledRowSetupResult {
  __rue_compiled_host: Node | null | undefined
  __rue_compiled_roots: readonly Node[]
  __rue_compiled_error?: unknown
}

const isOwnerlessSetupResult = (
  result: Node | null | undefined | OwnerlessCompiledRowSetupResult,
): result is OwnerlessCompiledRowSetupResult =>
  result != null &&
  typeof result === 'object' &&
  '__rue_compiled_host' in result &&
  '__rue_compiled_roots' in result

/** Mount a compiler-proven resource-free row without allocating an owner or block wrapper. */
export const _$mountCompiledKeyedRowOwnerless = <T>(
  setup: (parent: ParentNode) => Node | null | undefined | OwnerlessCompiledRowSetupResult,
  patch: (item: T, index: number) => void,
  target?: CompactCompiledKeyedMountTarget,
) => {
  const parent = target?.parent ?? createDocumentFragment()
  const before = target?.before ?? null
  const cleanups: Array<() => void> = []
  let roots: readonly Node[] = []
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    runCleanups(cleanups)
  }
  try {
    const result = _$collectCompiledOwnerCleanups(cleanups, () => setup(parent))
    roots = isOwnerlessSetupResult(result)
      ? result.__rue_compiled_roots
      : result == null
        ? []
        : result.nodeType === 11
          ? Array.from(result.childNodes)
          : [result]
    if (isOwnerlessSetupResult(result) && '__rue_compiled_error' in result) {
      throw result.__rue_compiled_error
    }
    if (roots.length === 0) {
      throw new Error('[rue] ownerless compiled keyed row setup did not return a DOM range')
    }
    for (const root of roots) {
      if (root.parentNode !== parent) insertBefore(parent, root, before)
    }
    return {
      node: roots[0],
      last: roots[roots.length - 1],
      patch,
      dispose,
      [batchPlacement]: target?.batch ? parent : undefined,
    }
  } catch (error) {
    const errors: unknown[] = [error]
    collectError(errors, dispose)
    for (const root of roots) {
      if (root.parentNode === parent) collectError(errors, () => removeChild(parent, root))
    }
    throwCollectedErrors(errors)
    throw error
  }
}

/** Mount a compiler-proven resource-free row whose public keyed record is one node. */
export const _$mountCompiledKeyedSingleRowOwnerless = <T>(
  setup: (parent: ParentNode) => Node | null | undefined | OwnerlessCompiledRowSetupResult,
  patch: (item: T, index: number) => void,
  target?: CompactCompiledKeyedMountTarget,
) => {
  const parent = target?.parent ?? createDocumentFragment()
  const before = target?.before ?? null
  const cleanups: Array<() => void> = []
  let roots: readonly Node[] = []
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    runCleanups(cleanups)
  }
  try {
    const result = _$collectCompiledOwnerCleanups(cleanups, () => setup(parent))
    roots = isOwnerlessSetupResult(result)
      ? result.__rue_compiled_roots
      : result == null
        ? []
        : result.nodeType === 11
          ? Array.from(result.childNodes)
          : [result]
    if (isOwnerlessSetupResult(result) && '__rue_compiled_error' in result) {
      throw result.__rue_compiled_error
    }
    if (roots.length !== 1) {
      throw new Error('[rue] ownerless compiled single keyed row setup did not return one DOM node')
    }
    const node = roots[0]
    if (node.parentNode !== parent) insertBefore(parent, node, before)
    return { node, patch, dispose }
  } catch (error) {
    const errors: unknown[] = [error]
    collectError(errors, dispose)
    for (const root of roots) {
      if (root.parentNode === parent) collectError(errors, () => removeChild(parent, root))
    }
    throwCollectedErrors(errors)
    throw error
  }
}

/** Mount compiler-proven native setup with a single owner for events and selector effects. */
export const _$mountCompiledKeyedRowSetup = <T>(
  setup: (parent: ParentNode) => Node | null | undefined | OwnerlessCompiledRowSetupResult,
  patch: (item: T, index: number) => void,
  target?: CompactCompiledKeyedMountTarget,
): ReturnType<CompactCompiledKeyedMount<T>> => {
  const owner = createOwner()
  const parent = target?.parent ?? createDocumentFragment()
  const before = target?.before ?? null
  let roots: readonly Node[] = []
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    disposeOwner(owner)
  }
  try {
    runOwnerLifecycle(owner, 'beforeMount')
    withDOMHostOperations(parent, () => {
      const result = runWithOwner(owner, () => setup(parent))
      roots = isOwnerlessSetupResult(result)
        ? result.__rue_compiled_roots
        : result == null
          ? []
          : result.nodeType === 11
            ? Array.from(result.childNodes)
            : [result]
      if (isOwnerlessSetupResult(result) && '__rue_compiled_error' in result) {
        throw result.__rue_compiled_error
      }
      if (roots.length === 0)
        throw new Error('[rue] compiled keyed row setup did not return a DOM range')
      for (const root of roots) insertBefore(parent, root, before)
    })
    runOwnerLifecycle(owner, 'mounted')
    const mounted = {
      node: roots[0],
      last: roots[roots.length - 1],
      patch,
      dispose,
      [batchPlacement]: target?.batch ? parent : undefined,
    }
    return mounted
  } catch (error) {
    const errors: unknown[] = [error]
    collectError(errors, dispose)
    for (const root of roots) {
      if (root.parentNode === parent) collectError(errors, () => removeChild(parent, root))
    }
    throwCollectedErrors(errors)
    throw error
  }
}

/** Mount compiler-proven native setup with one owner and exactly one DOM root. */
export const _$mountCompiledKeyedSingleRowSetup = <T>(
  setup: (parent: ParentNode) => Node | null | undefined | OwnerlessCompiledRowSetupResult,
  patch: (item: T, index: number) => void,
  target?: CompactCompiledKeyedMountTarget,
) => {
  const owner = createOwner()
  const parent = target?.parent ?? createDocumentFragment()
  const before = target?.before ?? null
  let roots: readonly Node[] = []
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    disposeOwner(owner)
  }
  try {
    runOwnerLifecycle(owner, 'beforeMount')
    withDOMHostOperations(parent, () => {
      const result = runWithOwner(owner, () => setup(parent))
      roots = isOwnerlessSetupResult(result)
        ? result.__rue_compiled_roots
        : result == null
          ? []
          : result.nodeType === 11
            ? Array.from(result.childNodes)
            : [result]
      if (isOwnerlessSetupResult(result) && '__rue_compiled_error' in result) {
        throw result.__rue_compiled_error
      }
      if (roots.length !== 1) {
        throw new Error('[rue] compiled single keyed row setup did not return one DOM node')
      }
      const node = roots[0]
      if (node.parentNode !== parent) insertBefore(parent, node, before)
    })
    runOwnerLifecycle(owner, 'mounted')
    return { node: roots[0], patch, dispose }
  } catch (error) {
    const errors: unknown[] = [error]
    collectError(errors, dispose)
    for (const root of roots) {
      if (root.parentNode === parent) collectError(errors, () => removeChild(parent, root))
    }
    throwCollectedErrors(errors)
    throw error
  }
}
