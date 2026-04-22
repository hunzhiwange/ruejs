/*
Vapor 运行时架构概述
- VNode 创建：vaporCreateVNode 统一将 slot 规范化为 fragment 或现有 vaporElement。
- 显隐样式：vaporShowStyle 根据条件生成字符串或对象样式，隐藏时添加/设置 display。
- Keyed 列表渲染：vaporKeyedList 通过注释锚点管理每项的 DOM 范围，支持重排和增删，并用 DocumentFragment 做块移动。
- ref 绑定：vaporBindUseRef 以反应式方式同步函数/对象 ref 的 current，并在卸载时清理。
- Hooks ID：vaporWithHookId 通过 id → index 映射强制 hooks 的执行索引，保证稳定的读取/写入序列。
*/
import { onBeforeUnmount, h } from './rue'
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

/** 规范化 slot 为 Vapor 可渲染 VNode 或 fragment
 * - null/boolean → 空 fragment
 * - array → fragment(children)
 * - object 且含 vaporElement → 直接返回
 * - DOM 节点（有 nodeType）→ 包装为 fragment
 * - 其他（string/number）→ 转字符串并进入 fragment
 * @param slot 任何可作为 children 的输入
 * @returns 规范化后的 VNode 或原对象
 */
export const vaporCreateVNode = (slot: any) => {
  if (slot == null || typeof slot === 'boolean') {
    return h('fragment', null)
  }
  if (typeof slot === 'object') {
    if ('vaporElement' in slot) return slot
    if (Array.isArray(slot)) return h('fragment', null, ...slot)
    if ((slot as any).nodeType) return h('fragment', null, slot)
    return slot
  }
  const tn = document.createTextNode(String(slot))
  return { vaporElement: tn }
}

/** 根据条件生成 display 显隐样式
 * 支持字符串 style 与对象 style 的输入
 * @param s 字符串或对象样式
 * @param cond 条件为真则显示，否则隐藏
 * @returns 处理后的样式
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

/** 列表项在 DOM 中的范围定义 */
export type VaporListItemRange = {
  start?: DomNodeLike
  end: DomNodeLike
  stop?: () => void
  singleRoot?: boolean
  current?: ReturnType<typeof signal<{ item: any; index: number }>>
}

/** 基于 Key 的列表渲染与重排
 * - 每个元素用两个注释节点 start/end 作为锚点，渲染在它们之间
 * - singleRoot 模式下，每个元素只保留一个尾锚点，列表项通过 renderAnchor 渲染到锚点前
 * - 通过 DocumentFragment 批量移动块以适配新顺序
 * - 对删除项执行清理并移除对应节点
 * @param args 列表参数，含 items/getKey/elements/parent/before/renderItem
 * @returns 更新后的 elements 映射
 */
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

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]
    const key = getKey(item, i)
    let range = elements.get(key)
    let start: DomNodeLike
    let end: DomNodeLike

    if (!range) {
      if (singleRoot) {
        end = createComment('rue:list:item:anchor')
        insertBefore(parent, end, cursor as any)
        const entry: VaporListItemRange = { end, singleRoot: true }
        const current = syncCurrentItem(entry, item, i)
        const stop = watchEffect(() => {
          const next = current.get()
          renderItem(next.item, parent as any, end, end, next.index)
        })
        entry.stop = () => stop.dispose()
        range = entry
      } else {
        // 新建未存在的条目：创建锚点并插入
        start = createComment('rue:list:item:start')
        end = createComment('rue:list:item:end')
        insertBefore(parent, end, cursor as any)
        insertBefore(parent, start, end)
        const entry: VaporListItemRange = { start, end }
        const current = syncCurrentItem(entry, item, i)
        // 建立与该 item 渲染相关的副作用
        const stop = watchEffect(() => {
          const next = current.get()
          renderItem(next.item, parent as any, start, end, next.index)
        })
        entry.stop = () => stop.dispose()
        range = entry
      }
    } else {
      syncCurrentItem(range, item, i)
      start = resolveStartNode(range)
      end = range.end
    }

    const blockStart = resolveStartNode(range)

    // 若该块当前位置与期望位置不同，抽取并重新插入到 cursor 前
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

  // 清理不存在于下一轮的条目：停止副作用并移除节点范围
  elements.forEach((range, key) => {
    if (!nextElements.has(key)) {
      if (range.stop) range.stop()

      let n: DomNodeLike | null = resolveStartNode(range)
      while (n) {
        const next: DomNodeLike | null = (n as any).nextSibling || null
        if (contains(parent as any, n as any)) removeChild(parent as any, n as any)
        if (n === range.end) break
        n = next
      }
    }
  })
  elements.clear()
  nextElements.forEach((r, k) => elements.set(k, r))
  return elements
}

/** 反应式绑定 ref：支持函数 ref 与对象 ref
 * - 自动清理旧 ref（函数传 null，对象置 undefined）
 * - 将当前元素写入新 ref 的 current 或直接调用函数
 * @param el 绑定的元素
 * @param getRef 获取 ref 的函数（响应式）
 * @returns stop 句柄（含 dispose）
 */
export const vaporBindUseRef = (el: any, getRef: () => any) => {
  let prev: any
  const stop = watchEffect(() => {
    const r = getRef()
    const p = prev
    if (p && p !== r) {
      if (typeof p === 'function') {
        p(null)
      } else if (typeof p === 'object' && 'current' in p) {
        ;(p as any).current = undefined
      }
    }
    if (typeof r === 'function') {
      r(el)
    } else if (typeof r === 'object' && 'current' in r) {
      ;(r as any).current = el
    }
    prev = r
  })
  onBeforeUnmount(() => {
    const p = prev
    if (p) {
      if (typeof p === 'function') {
        p(null)
      } else if (typeof p === 'object' && 'current' in p) {
        ;(p as any).current = undefined
      }
    }
  })
  return stop
}

/** 以给定 Hook ID 强制 hooks 的执行索引
 * - 通过实例 hooks.__idMap 维护 id → index 映射
 * - 在 runner 执行期间设置 hooks.__forcedIndex，结束后清理
 * @param id Hook 的稳定标识符
 * @param runner 包裹的执行函数
 * @returns runner 的返回值
 */
export function vaporWithHookId<T>(id: string, runner: () => T): T {
  const inst = getCurrentInstance() as any
  if (!inst) return runner()
  const hooks = inst.__hooks || (inst.__hooks = { states: [], index: 0 })
  const map: Map<string, number> =
    (hooks as any).__idMap || ((hooks as any).__idMap = new Map<string, number>())
  let idx = map.get(id)
  if (idx === undefined) {
    idx = (hooks.states?.length as number) ?? 0
    map.set(id, idx)
  }
  ;(hooks as any).__forcedIndex = idx
  try {
    return runner()
  } finally {
    ;(hooks as any).__forcedIndex = undefined
  }
}
