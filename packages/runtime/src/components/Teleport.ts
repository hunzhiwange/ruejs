/*
Teleport 组件概述
- 使用场景：需要将某段内容“传送”到文档中另一个位置（如模态框、浮层、全局通知）。
- 行为：将子内容渲染到指定目标容器（字符串选择器或元素），禁用时在原位置本地渲染。
- 锚点区间：通过两段注释节点标记内容范围，可在目标变化时整体搬运该范围，保证 DOM 结构稳定。
- 生命周期：组件卸载时清理目标区间内容与锚点，避免遗留节点。
- 依赖追踪：通过 effect 显式读取 props.children 建立依赖，确保子内容变化时重新渲染。
*/
// 参考 Vue3 的 Teleport 设计思想，结合 Rue 的 vapor/renderBetween 机制实现

import { type FC, h, onMounted, onUnmounted, renderBetween, vapor } from '../rue'
import { watchEffect } from '../reactivity'
import {
  createComment,
  createDocumentFragment,
  insertBefore,
  appendChild,
  removeChild,
  querySelector,
  createElement,
  contains,
  getParentNode,
  settextContent,
  setStyle,
} from '../dom'
import type { DomNodeLike, DomElementLike } from '../dom'

export interface TeleportProps {
  to?: string | HTMLElement
  disabled?: boolean
  defer?: boolean
  children?: any
}

/** 解析 Teleport 目标容器 */
const resolveTarget = (to?: string | HTMLElement): HTMLElement | null => {
  if (!to) return null
  if (typeof to === 'string') {
    // 特殊值 'body'：直接选择文档 body
    if (to === 'body') return querySelector('body') as HTMLElement
    return querySelector(to) as HTMLElement | null
  }
  return to as HTMLElement
}

/** Teleport 组件：将 children 渲染到目标容器 */
export const Teleport: FC<TeleportProps> = props => {
  let target: HTMLElement | null = null
  let stop: (() => void) | undefined
  const startEl = createComment('rue-teleport-start')
  const endEl = createComment('rue-teleport-end')

  /** 规范化 children 为 fragment */
  const toVNode = (): any => {
    // 支持单个或数组 children，过滤掉 null/undefined
    const kids = Array.isArray(props.children) ? props.children : [props.children]
    return h('fragment', null, ...kids.filter((c: any) => c != null))
  }

  /** 判断锚点区间是否存在非注释内容 */
  const hasContentBetween = (): boolean => {
    let n: DomNodeLike | null = (startEl as any).nextSibling || null
    while (n && n !== endEl) {
      if ((n as any).nodeType !== 8) return true
      n = (n as any).nextSibling || null
    }
    return false
  }

  /** 清空目标区间内容 */
  const clearRange = (el: HTMLElement | null) => {
    if (!el) return
    renderBetween(
      vapor(() => ({ vaporElement: createDocumentFragment() })),
      el,
      startEl,
      endEl,
    )
  }

  /** 将锚点与区间块搬运并渲染到目标容器 */
  const mountChildren = (el: HTMLElement | null) => {
    if (!el) return
    if (!contains(el, startEl)) {
      // 若锚点尚未在目标内：把锚点之间的现有内容转移到一个 Fragment 中，并移动锚点到目标
      const block = createDocumentFragment()
      {
        let n: DomNodeLike | null = (startEl as any).nextSibling || null
        while (n && n !== endEl) {
          const next = (n as any).nextSibling as DomNodeLike | null
          appendChild(block, n)
          n = next
        }
        // 清理旧父级中的锚点
        const oldParent = getParentNode(startEl) as HTMLElement | null
        if (oldParent && contains(oldParent, startEl)) removeChild(oldParent, startEl)
        if (oldParent && contains(oldParent, endEl)) removeChild(oldParent, endEl)
      }
      // 将锚点插入到目标，并将区间内容插入到 end 锚点之前
      appendChild(el, startEl)
      appendChild(el, endEl)
      insertBefore(el, block, endEl)
    }

    // 渲染最新 children 到目标区间
    const vnode = toVNode()
    renderBetween(vnode, el, startEl, endEl)
    const has = hasContentBetween()
    if (!has) {
      // 若区间为空，插入无语义占位以提升调试可读性
      const fallback = createElement('span') as DomElementLike
      settextContent(fallback, '[Teleport] fallback: empty region after renderBetween')
      setStyle(fallback, { display: 'contents' })
      insertBefore(el, fallback, endEl)
    }
  }

  onMounted(() => {
    // 先解析目标；首次渲染交给 watchEffect 的立即首跑，避免同一轮重复提交 renderBetween。
    const disabled0 = !!props.disabled
    target = disabled0 ? null : resolveTarget(props.to)

    const eh = watchEffect(() => {
      // 显式读取 children 建立依赖，以便 children 变化触发更新
      const _childrenDep = props.children
      const disabled = !!props.disabled
      const nextTarget = disabled ? null : resolveTarget(props.to)
      if (nextTarget !== target) {
        // 目标变化：清理旧目标区间与锚点，并更新当前目标
        if (!nextTarget && target) {
          clearRange(target)
          if (contains(target, startEl)) removeChild(target, startEl)
          if (contains(target, endEl)) removeChild(target, endEl)
        }
        target = nextTarget
      }
      // 在当前目标渲染子内容
      mountChildren(target)
    })
    // 记录销毁函数以便 onUnmounted 清理
    stop = () => eh.dispose()
  })

  onUnmounted(() => {
    if (stop) stop()

    if (target) {
      // 清空区间并移除锚点，避免残留
      clearRange(target)
      if (contains(target, startEl)) removeChild(target, startEl)
      if (contains(target, endEl)) removeChild(target, endEl)
    }
  })

  // 当 Teleport 启用时，不在源节点渲染任何内容；仅在禁用时本地渲染
  return h('fragment', null, props.disabled ? props.children : null) as any
}
