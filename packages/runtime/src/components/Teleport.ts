/*
Teleport 组件概述
- 使用场景：需要将某段内容“传送”到文档中另一个位置（如模态框、浮层、全局通知）。
- 行为：将子内容渲染到指定目标容器（字符串选择器或元素），禁用时在原位置本地渲染。
- 锚点区间：通过两段注释节点标记内容范围，可在目标变化时整体搬运该范围，保证 DOM 结构稳定。
- 生命周期：组件卸载时清理目标区间内容与锚点，避免遗留节点。
- 依赖追踪：通过 effect 显式读取 props.children 建立依赖，确保子内容变化时重新渲染。
*/
// 参考 Vue3 的 Teleport 设计思想，结合 Rue 的默认区间渲染机制实现

import { type FC, h, onMounted, onUnmounted, renderBetween, vapor } from '../rue'
import { signal, watchEffect } from '../reactivity'
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
import { useSetup } from '@rue-js/runtime-vapor'

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

const cloneRenderableChildren = (children: unknown): unknown =>
  Array.isArray(children) ? children.map(cloneRenderableChildren) : children

const snapshotTeleportProps = (props: TeleportProps): TeleportProps => ({
  ...(props as Record<string, unknown>),
  children: cloneRenderableChildren(props.children),
})

/** Teleport 组件：将 children 渲染到目标容器 */
export const Teleport: FC<TeleportProps> = props => {
  const ctx = useSetup(() => ({
    target: null as HTMLElement | null,
    startEl: createComment('rue-teleport-start'),
    endEl: createComment('rue-teleport-end'),
    propsSig: signal(snapshotTeleportProps(props), {}, true),
    started: false,
    effect: null as { dispose: () => void } | null,
  }))

  /** 判断锚点区间是否存在非注释内容 */
  const hasContentBetween = (): boolean => {
    let n: DomNodeLike | null = (ctx.startEl as any).nextSibling || null
    while (n && n !== ctx.endEl) {
      if ((n as any).nodeType !== 8) return true
      n = (n as any).nextSibling || null
    }
    return false
  }

  /** 清空目标区间内容 */
  const clearRange = (el: HTMLElement | null) => {
    if (!el) return
    renderBetween([], el, ctx.startEl, ctx.endEl)
  }

  /** 从当前父级中移除锚点 */
  const detachAnchors = () => {
    const parent = getParentNode(ctx.startEl) as HTMLElement | null
    if (!parent) return
    if (contains(parent, ctx.startEl)) removeChild(parent, ctx.startEl)
    if (contains(parent, ctx.endEl)) removeChild(parent, ctx.endEl)
  }

  /** 将锚点与区间块搬运并渲染到目标容器 */
  const mountChildren = (el: HTMLElement | null, children: unknown) => {
    if (!el) return
    if (!contains(el, ctx.startEl)) {
      // 若锚点尚未在目标内：把锚点之间的现有内容转移到一个 Fragment 中，并移动锚点到目标
      const block = createDocumentFragment()
      {
        let n: DomNodeLike | null = (ctx.startEl as any).nextSibling || null
        while (n && n !== ctx.endEl) {
          const next = (n as any).nextSibling as DomNodeLike | null
          appendChild(block, n)
          n = next
        }
        // 清理旧父级中的锚点
        detachAnchors()
      }
      // 将锚点插入到目标，并将区间内容插入到 end 锚点之前
      appendChild(el, ctx.startEl)
      appendChild(el, ctx.endEl)
      insertBefore(el, block, ctx.endEl)
    }

    const nextRenderable = Array.isArray(children)
      ? h('fragment', null, ...(children as unknown[]))
      : children
    renderBetween(nextRenderable as any, el, ctx.startEl, ctx.endEl)
    const has = hasContentBetween()
    if (!has) {
      // 若区间为空，插入无语义占位以提升调试可读性
      const fallback = createElement('span') as DomElementLike
      settextContent(fallback, '[Teleport] fallback: empty region after renderBetween')
      setStyle(fallback, { display: 'contents' })
      insertBefore(el, fallback, ctx.endEl)
    }
  }

  onMounted(() => {
    if (ctx.started) return
    ctx.started = true

    ctx.effect = watchEffect(() => {
      const curProps = ctx.propsSig.get()
      const disabled = !!curProps.disabled
      const nextTarget = disabled ? null : resolveTarget(curProps.to)

      if (nextTarget !== ctx.target) {
        if (!nextTarget && ctx.target) {
          clearRange(ctx.target)
          detachAnchors()
        }
        ctx.target = nextTarget
      }

      if (!ctx.target) {
        return
      }

      mountChildren(ctx.target, curProps.children)
    })
  })

  onUnmounted(() => {
    if (ctx.effect) {
      ctx.effect.dispose()
      ctx.effect = null
    }
    ctx.started = false

    if (ctx.target) {
      // 清空区间并移除锚点，避免残留
      clearRange(ctx.target)
      detachAnchors()
    }
  })

  return vapor(() => {
    ctx.propsSig.set(snapshotTeleportProps(props))
    return (props.disabled ? props.children : h('fragment', null)) as any
  })
}
