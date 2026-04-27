/*
Teleport 组件概述
- 使用场景：需要将某段内容“传送”到文档中另一个位置（如模态框、浮层、全局通知）。
- 行为：将子内容渲染到指定目标容器（字符串选择器或元素），禁用时在原位置本地渲染。
- 锚点区间：通过两组注释节点分别维护“本地占位区间”和“目标区间”，目标变化时整体搬运目标区间。
- 生命周期：组件卸载时清理本地/目标区间，避免遗留节点。
- 依赖追踪：通过内部 signal + watchEffect 监听 props 变化，统一处理目标切换与 children 更新。
*/

import { type FC, h, onMounted, onUnmounted, render, renderBetween, vapor } from '../rue'
import { signal, watchEffect } from '../reactivity'
import {
  appendChild,
  contains,
  createComment,
  createDocumentFragment,
  createElement,
  getParentNode,
  insertBefore,
  querySelector,
  removeChild,
  setStyle,
  settextContent,
} from '../dom'
import type { DomElementLike, DomNodeLike } from '../dom'
import { useSetup } from '@rue-js/runtime-vapor'

export interface TeleportProps {
  to?: string | HTMLElement
  disabled?: boolean
  defer?: boolean
  children?: any
}

const resolveTarget = (to?: string | HTMLElement): HTMLElement | null => {
  if (!to) return null
  if (typeof to === 'string') {
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

const toRenderable = (children: unknown) => {
  if (Array.isArray(children)) {
    return h('fragment', null, ...(children.filter(child => child != null) as unknown[]))
  }
  return children ?? []
}

export const Teleport: FC<TeleportProps> = props => {
  const ctx = useSetup(() => {
    const container = createElement('span') as HTMLElement
    setStyle(container, { display: 'contents' })

    return {
      container,
      targetStart: createComment('rue-teleport-start'),
      targetEnd: createComment('rue-teleport-end'),
      propsSig: signal(snapshotTeleportProps(props), {}, true),
      target: null as HTMLElement | null,
      started: false,
      effect: null as { dispose: () => void } | null,
    }
  })

  const clearLocalRange = () => {
    render([], ctx.container)
  }

  const clearTargetRange = (target: HTMLElement | null) => {
    if (!target) return
    renderBetween([], target, ctx.targetStart, ctx.targetEnd)
  }

  const detachTargetAnchors = () => {
    const parent = getParentNode(ctx.targetStart) as HTMLElement | null
    if (!parent) return
    if (contains(parent, ctx.targetStart)) removeChild(parent, ctx.targetStart)
    if (contains(parent, ctx.targetEnd)) removeChild(parent, ctx.targetEnd)
  }

  const hasContentBetween = (): boolean => {
    let node: DomNodeLike | null = (ctx.targetStart as any).nextSibling || null
    while (node && node !== ctx.targetEnd) {
      if ((node as any).nodeType !== 8) return true
      node = (node as any).nextSibling || null
    }
    return false
  }

  const ensureTargetAnchors = (target: HTMLElement) => {
    if (contains(target, ctx.targetStart)) {
      return
    }

    const block = createDocumentFragment()
    let node: DomNodeLike | null = (ctx.targetStart as any).nextSibling || null
    while (node && node !== ctx.targetEnd) {
      const next = (node as any).nextSibling as DomNodeLike | null
      appendChild(block, node)
      node = next
    }

    detachTargetAnchors()
    appendChild(target, ctx.targetStart)
    appendChild(target, ctx.targetEnd)
    insertBefore(target, block, ctx.targetEnd)
  }

  const renderTargetChildren = (target: HTMLElement | null, children: unknown) => {
    if (!target) return

    ensureTargetAnchors(target)
    renderBetween(toRenderable(children) as any, target, ctx.targetStart, ctx.targetEnd)

    if (!hasContentBetween()) {
      const fallback = createElement('span') as DomElementLike
      settextContent(fallback, '[Teleport] fallback: empty region after renderBetween')
      setStyle(fallback, { display: 'contents' })
      insertBefore(target, fallback, ctx.targetEnd)
    }
  }

  onMounted(() => {
    if (ctx.started) return
    ctx.started = true

    ctx.effect = watchEffect(() => {
      const curProps = ctx.propsSig.get()
      const disabled = !!curProps.disabled
      const nextTarget = disabled ? null : resolveTarget(curProps.to)

      if (disabled) {
        if (ctx.target) {
          clearTargetRange(ctx.target)
          detachTargetAnchors()
          ctx.target = null
        }
        render(toRenderable(curProps.children) as any, ctx.container)
        return
      }

      clearLocalRange()

      if (nextTarget !== ctx.target) {
        if (ctx.target) {
          clearTargetRange(ctx.target)
          detachTargetAnchors()
        }
        ctx.target = nextTarget
      }

      renderTargetChildren(ctx.target, curProps.children)
    })
  })

  onUnmounted(() => {
    if (ctx.effect) {
      ctx.effect.dispose()
      ctx.effect = null
    }
    ctx.started = false

    clearLocalRange()
    if (ctx.target) {
      clearTargetRange(ctx.target)
      detachTargetAnchors()
      ctx.target = null
    }
  })

  return vapor(() => {
    ctx.propsSig.set(snapshotTeleportProps(props))
    return ctx.container
  })
}
