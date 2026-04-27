/*
Transition 组件概述
- 职责：为区间内“首个元素节点”应用进入/离开过渡，简化单元素的动画控制。
- 阶段控制：首次渲染且 props.appear=true 时执行 appear；否则执行 enter。无子元素时执行 leave 或直接清空。
- 容器策略：默认以 display: contents 的 span 作为占位容器，保持文档语义与样式继承的稳定。
*/
// 参考 Vue3 的 Transition 设计思路，结合 Rue 的信号与默认区间渲染机制
import { type FC, onMounted, onUnmounted, renderBetween, vapor } from '../rue'
import { signal, watchEffect } from '../reactivity'
import { type BaseTransitionProps, createTransitionRunner } from './BaseTransition'
import { createElement, createComment, appendChild } from '../dom'
import type { DomNodeLike } from '../dom'
import { useSetup } from '@rue-js/runtime-vapor'

export type TransitionProps = BaseTransitionProps

type TransitionChildInput = Parameters<typeof renderBetween>[0]

const collectTransitionChildren = (
  children: unknown,
  out: TransitionChildInput[] = [],
): TransitionChildInput[] => {
  if (children == null || children === false) {
    return out
  }

  if (Array.isArray(children)) {
    children.forEach(child => collectTransitionChildren(child, out))
    return out
  }

  out.push(children as TransitionChildInput)
  return out
}

const cloneRenderableChildren = (children: unknown): unknown =>
  Array.isArray(children) ? children.map(cloneRenderableChildren) : children

const resolveTransitionChild = (children: unknown): TransitionChildInput | null =>
  collectTransitionChildren(children)[0] ?? null

const hasTransitionChild = (child: unknown): boolean =>
  child !== null && child !== undefined && child !== false

const snapshotTransitionProps = (props: TransitionProps): TransitionProps => ({
  ...(props as Record<string, unknown>),
  children: cloneRenderableChildren(props.children),
})

/** Transition 组件：为区间内首个元素应用过渡 */
export const Transition: FC<TransitionProps> = props => {
  const ctx = useSetup(() => {
    const container = createElement('span') as HTMLElement
    container.style.display = 'contents'
    const startEl = createComment('rue-transition-start')
    const endEl = createComment('rue-transition-end')
    appendChild(container, startEl)
    appendChild(container, endEl)

    return {
      container,
      startEl,
      endEl,
      propsSig: signal(snapshotTransitionProps(props), {}, true),
      prevShown: false,
      firstRender: true,
      started: false,
      effect: null as { dispose: () => void } | null,
    }
  })

  /** 获取区间内第一个元素节点 */
  function firstElementBetween(): HTMLElement | null {
    let n: DomNodeLike | null = (ctx.startEl as any).nextSibling || null
    while (n && n !== ctx.endEl) {
      if ((n as any).nodeType === 1) return n as any as HTMLElement
      n = (n as any).nextSibling || null
    }
    return null
  }

  /** 清空区间内容 */
  function clearRange() {
    renderBetween([], ctx.container, ctx.startEl, ctx.endEl)
  }

  onMounted(() => {
    if (ctx.started) return
    ctx.started = true

    ctx.effect = watchEffect(() => {
      const curProps = ctx.propsSig.get()
      const { runEnter, runLeave } = createTransitionRunner(curProps)
      const child = resolveTransitionChild(curProps.children)
      const hasChild = hasTransitionChild(child)
      const renderVersion = Symbol('transition-render')

      ;(ctx as any).renderVersion = renderVersion

      if (hasChild) {
        renderBetween(child as TransitionChildInput, ctx.container, ctx.startEl, ctx.endEl)
        if (!ctx.prevShown) {
          if (ctx.firstRender) {
            queueMicrotask(() => {
              if ((ctx as any).renderVersion !== renderVersion) return
              const el = firstElementBetween()
              if (el) runEnter(el, curProps.appear ? 'appear' : 'enter')
            })
          } else {
            queueMicrotask(() => {
              if ((ctx as any).renderVersion !== renderVersion) return
              const el = firstElementBetween()
              if (el) runEnter(el, 'enter')
            })
          }
        }
      } else if (ctx.prevShown) {
        const el = firstElementBetween()
        if (el) runLeave(el, () => clearRange())
        else clearRange()
      } else {
        clearRange()
      }

      ctx.prevShown = hasChild
      ctx.firstRender = false
    })
  })

  onUnmounted(() => {
    if (ctx.effect) {
      ctx.effect.dispose()
      ctx.effect = null
    }
    ctx.started = false
  })

  return vapor(() => {
    ctx.propsSig.set(snapshotTransitionProps(props))
    return ctx.container
  })
}
