/*
Vapor 运行时辅助概述
- 显隐样式：vaporShowStyle 根据条件生成字符串或对象样式，隐藏时追加或设置 display。
- Keyed 列表渲染：vaporKeyedList 通过注释锚点维护每项 DOM 范围，支持重排、增删和单根优化。
- ref 绑定：vaporBindUseRef 以响应式方式同步函数 ref / 对象 ref，并在卸载时清理。
- Hooks ID：vaporWithHookId 通过 id -> index 映射稳定 hook 槽位，避免重渲染时索引漂移。
*/
import { onBeforeUnmount } from './rue'
import { signal, untrack, watchEffect } from './reactivity'
import { getCurrentInstance } from '@rue-js/runtime-vapor'
import {
  createComment,
  createDocumentFragment,
  insertBefore,
  appendChild,
  removeChild,
  contains,
} from './dom'
import type { DomNodeLike } from './dom'

/** 根据条件生成 display 显隐样式
 * 支持字符串 style 与对象 style 的输入。
 */
export const vaporShowStyle = (s: any, cond: any) => {
  if (typeof s === 'string') {
    return cond ? s : s + '; display: none'
  }
  if (s && typeof s === 'object') {
    return { ...s, display: cond ? '' : 'none' }
  }
  return { display: cond ? '' : 'none' }
}

/** 为编译产物生成的可挂载值附加稳定 key，供 TransitionGroup 等读取 */
export const vaporWithKey = <T>(value: T, key: unknown): T => {
  if (key == null) {
    return value
  }
  if ((typeof value !== 'object' && typeof value !== 'function') || value == null) {
    return value
  }
  try {
    ;(value as any).key = key
  } catch {}
  return value
}

/** 列表项在 DOM 中的范围定义 */
export type VaporListItemRange = {
  start?: DomNodeLike
  end: DomNodeLike
  stop?: () => void
  singleRoot?: boolean
  current?: ReturnType<typeof signal<{ item: any; index: number }>>
}

/** 基于 Key 的列表渲染与重排 */
export const vaporKeyedList = <T>(args: {
  items: T[]
  getKey: (item: T, index: number) => any
  elements: Map<any, VaporListItemRange>
  parent: any
  before: any
  singleRoot?: boolean
  renderItem: (item: T, parent: any, start: any, end: any, idx?: number) => void
}) => {
  const { items, getKey, elements, parent, before, renderItem, singleRoot = false } = args
  const nextElements = new Map<any, VaporListItemRange>()
  const syncEffectOptions = {
    scheduler: (run: () => void) => run(),
  }

  const getRawIdentity = (value: T) => {
    if (value && typeof value === 'object') {
      try {
        const raw = (value as any).__rue_raw__
        if (raw !== undefined) return raw
      } catch {}
    }
    return value
  }

  const syncCurrentItem = (range: VaporListItemRange, nextItem: T, nextIndex: number) => {
    if (!range.current) {
      range.current = signal({ item: nextItem, index: nextIndex }, {}, true)
      return range.current
    }

    const prev = untrack(() => range.current!.get())
    if (getRawIdentity(prev.item) !== getRawIdentity(nextItem) || prev.index !== nextIndex) {
      range.current.set({ item: nextItem, index: nextIndex })
    }
    return range.current
  }

  const resolveStartNode = (range: VaporListItemRange) => {
    if (!range.singleRoot) {
      return range.start as DomNodeLike
    }
    const head = ((range.end as any).previousSibling as DomNodeLike | null) || null
    return head && contains(parent as any, head as any) ? head : range.end
  }

  let cursor: DomNodeLike | null = before as any

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index]
    const key = getKey(item, index)
    let range = elements.get(key)
    let start: DomNodeLike
    let end: DomNodeLike

    if (!range) {
      if (singleRoot) {
        end = createComment('rue:list:item:anchor')
        insertBefore(parent, end, cursor as any)
        const entry: VaporListItemRange = { end, singleRoot: true }
        const current = syncCurrentItem(entry, item, index)
        const stop = watchEffect(() => {
          const next = current.get()
          renderItem(next.item, parent as any, end, end, next.index)
        }, syncEffectOptions)
        entry.stop = () => stop.dispose()
        range = entry
      } else {
        start = createComment('rue:list:item:start')
        end = createComment('rue:list:item:end')
        insertBefore(parent, end, cursor as any)
        insertBefore(parent, start, end)
        const entry: VaporListItemRange = { start, end }
        const current = syncCurrentItem(entry, item, index)
        const stop = watchEffect(() => {
          const next = current.get()
          renderItem(next.item, parent as any, start, end, next.index)
        }, syncEffectOptions)
        entry.stop = () => stop.dispose()
        range = entry
      }
    } else {
      syncCurrentItem(range, item, index)
      start = resolveStartNode(range)
      end = range.end
    }

    const blockStart = resolveStartNode(range)

    if ((end as any).nextSibling !== cursor && cursor !== blockStart) {
      const block = createDocumentFragment()
      let node: DomNodeLike | null = blockStart
      while (node) {
        const next: DomNodeLike | null = (node as any).nextSibling
        appendChild(block, node)
        if (node === end) break
        node = next
      }
      const cursorIsChild = !!cursor && contains(parent, cursor as any)
      if (cursorIsChild) insertBefore(parent, block, cursor as any)
      else appendChild(parent, block)
    }

    nextElements.set(key, range!)
    cursor = blockStart
  }

  elements.forEach((range, key) => {
    if (!nextElements.has(key)) {
      if (range.stop) range.stop()

      let node: DomNodeLike | null = resolveStartNode(range)
      while (node) {
        const next: DomNodeLike | null = (node as any).nextSibling || null
        if (contains(parent as any, node as any)) removeChild(parent as any, node as any)
        if (node === range.end) break
        node = next
      }
    }
  })
  elements.clear()
  nextElements.forEach((range, key) => elements.set(key, range))
  return elements
}

/** 反应式绑定 ref：支持函数 ref 与对象 ref */
export const vaporBindUseRef = (el: any, getRef: () => any) => {
  let prev: any
  const stop = watchEffect(() => {
    const refValue = getRef()
    const prevRef = prev
    if (prevRef && prevRef !== refValue) {
      if (typeof prevRef === 'function') {
        prevRef(null)
      } else if (typeof prevRef === 'object' && 'current' in prevRef) {
        ;(prevRef as any).current = undefined
      }
    }
    if (typeof refValue === 'function') {
      refValue(el)
    } else if (typeof refValue === 'object' && 'current' in refValue) {
      ;(refValue as any).current = el
    }
    prev = refValue
  })
  onBeforeUnmount(() => {
    const prevRef = prev
    if (prevRef) {
      if (typeof prevRef === 'function') {
        prevRef(null)
      } else if (typeof prevRef === 'object' && 'current' in prevRef) {
        ;(prevRef as any).current = undefined
      }
    }
  })
  return stop
}

/** 以给定 Hook ID 强制 hooks 的执行索引 */
export function vaporWithHookId<T>(id: string, runner: () => T): T {
  const instance = getCurrentInstance() as any
  if (!instance) return runner()
  const hooks = instance.__hooks || (instance.__hooks = { states: [], index: 0 })
  const map: Map<string, number> =
    (hooks as any).__idMap || ((hooks as any).__idMap = new Map<string, number>())
  let index = map.get(id)
  if (index === undefined) {
    index = (hooks.states?.length as number) ?? 0
    map.set(id, index)
  }
  ;(hooks as any).__forcedIndex = index
  try {
    return runner()
  } finally {
    ;(hooks as any).__forcedIndex = undefined
  }
}
