/*
TransitionGroup 组件概述
- 列表过渡：以 key 作为稳定标识，跟踪新增/移动/移除并分别应用 enter/leave/move 效果。
- FLIP 技术：通过“快照前后位置差异”计算位移（First-Last-Invert-Play），以 transform 触发流畅移动。
- 容器策略：可指定 tag 作为容器；未指定时使用 display: contents 的 span，避免多余语义干扰布局。
- 事件流：新增元素触发 enter/appear，移除元素先移出渲染区再执行 leave，移动元素执行 moveClass 过渡。
*/
// 参考 Vue3 的 TransitionGroup 设计思路，结合 Rue 的 renderBetween/vapor 机制

import {
  type FC,
  Fragment,
  type VNode,
  emitted,
  h,
  onMounted,
  onUnmounted,
  renderBetween,
  vapor,
} from '../rue'
import { createElement, createComment, appendChild, insertBefore, contains } from '../dom'
import type { DomNodeLike } from '../dom'
import { watchEffect } from '../reactivity'
import type { BaseTransitionProps } from './BaseTransition'
import { createTransitionRunner } from './BaseTransition'
import * as TransitionUtils from './transitionUtils'

import type { TransitionType } from './transitionUtils'

export interface TransitionGroupProps {
  name?: string
  tag?: string
  type?: TransitionType
  css?: boolean
  duration?: number | { enter: number; leave: number }
  moveClass?: string
  appear?: boolean
  keepJSX?: boolean
  // JS hooks (per-item)
  onBeforeEnter?: (el: HTMLElement) => void
  onEnter?: (el: HTMLElement, done: () => void) => void
  onAfterEnter?: (el: HTMLElement) => void
  onBeforeLeave?: (el: HTMLElement) => void
  onLeave?: (el: HTMLElement, done: () => void) => void
  onAfterLeave?: (el: HTMLElement) => void
}

/** TransitionGroup：为多元素列表应用过渡与 FLIP 移动 */
export const TransitionGroup: FC<TransitionGroupProps> = props => {
  const name = props.name || 'rue'
  const moveClass = props.moveClass ?? `${name}-move`

  const container = (props.tag ? createElement(props.tag) : createElement('span')) as HTMLElement
  if (!props.tag) container.style.display = 'contents'
  const startEl = createComment('rue-tg-start')
  const endEl = createComment('rue-tg-end')

  const em = emitted(props)
  const { runEnter, runLeave } = createTransitionRunner(props as BaseTransitionProps)

  /** 收集区间内所有元素节点 */
  function collectElementsBetween(): HTMLElement[] {
    const els: HTMLElement[] = []
    let n: DomNodeLike | null = (startEl as any).nextSibling || null
    while (n && n !== endEl) {
      if ((n as any).nodeType === 1) els.push(n as any as HTMLElement)
      n = (n as any).nextSibling || null
    }
    return els
  }

  onMounted(() => {
    appendChild(container, startEl)
    appendChild(container, endEl)

    let firstRender = true

    watchEffect(() => {
      // 1) 快照阶段：记录当前区间内已渲染元素的 key 与布局矩形
      const prevElementsByKey: Map<string, HTMLElement> = new Map()
      const prevRects: Map<string, DOMRect> = new Map()
      {
        let n: DomNodeLike | null = (startEl as any).nextSibling || null
        while (n && n !== endEl) {
          if ((n as any).nodeType === 1) {
            const el = n as any as HTMLElement
            const k = el.getAttribute('data-rue-key')
            if (k) {
              prevElementsByKey.set(k, el)
              prevRects.set(k, el.getBoundingClientRect())
            }
          }
          n = (n as any).nextSibling || null
        }
      }

      // 2) 渲染阶段：将下一轮 children 渲染到区间
      const ch = props.children as VNode[]
      const nextChildren: VNode[] = Array.isArray(ch) ? ch : ch ? [ch as any] : []
      renderBetween(h(Fragment, null, ...nextChildren), container, startEl, endEl)

      // 3) 关联阶段：按 DOM 顺序为渲染出的元素写入 key 属性，建立 key→元素映射
      const nextKeys: string[] = nextChildren.map((c: any) => String(c.key ?? ''))
      const elements = collectElementsBetween()
      const elementsByKey: Map<string, HTMLElement> = new Map()
      let ei = 0
      for (let i = 0; i < nextKeys.length; i++) {
        const key = nextKeys[i]
        if (!key) continue
        while (ei < elements.length && !elements[ei]) ei++
        const el = elements[ei++]
        if (el) {
          el.setAttribute('data-rue-key', key)
          elementsByKey.set(key, el)
        }
      }

      // 4) 进入阶段：为新增 key 执行 enter；首次渲染且允许 appear 时走 appear
      nextKeys.forEach(k => {
        if (!k) return
        const el = elementsByKey.get(k)
        if (!el) return
        const isNew = !prevElementsByKey.has(k)
        if (isNew) runEnter(el, firstRender && props.appear ? 'appear' : 'enter')
      })

      // 5) 移动阶段（FLIP）：比较快照与当前布局，存在位移则通过 transform 触发过渡
      prevRects.forEach((prev, key) => {
        const el = elementsByKey.get(key)
        if (!el) return
        const next = el.getBoundingClientRect()
        const dx = prev.left - next.left
        const dy = prev.top - next.top
        if (dx || dy) {
          // Invert：先将元素临时移动回旧位置
          el.style.transform = `translate(${dx}px, ${dy}px)`
          el.style.transition = 'transform 0s'
          TransitionUtils.forceReflow(el)
          // Play：再清除临时 transform，让浏览器过渡到新位置
          el.style.transform = ''
          el.style.transition = ''
          TransitionUtils.addClass(el, moveClass)
          // 计算移动动画的最大时长，用于确定何时移除 moveClass
          const type = props.type ?? TransitionUtils.inferType(el)
          const stylesTimeout = Math.max(
            TransitionUtils.resolveDuration(el, 'transition', undefined, 'enter'),
            TransitionUtils.resolveDuration(el, 'animation', undefined, 'enter'),
          )
          TransitionUtils.whenTransitionEnds(el, type ?? null, stylesTimeout, () =>
            TransitionUtils.removeClass(el, moveClass),
          )
        }
      })

      // 6) 离开阶段：对被移除的 key 进行离开动画
      //    实现策略：将旧元素暂时移出锚点区间（插到 endEl 后或容器末尾）以便其在 DOM 中可见，然后执行 leave，结束后移除。
      prevElementsByKey.forEach((oldEl, k) => {
        if (!nextKeys.includes(k)) {
          const afterEnd = (endEl as any).nextSibling
          if (afterEnd && contains(container, afterEnd as any))
            insertBefore(container, oldEl, afterEnd as any)
          else appendChild(container, oldEl)
          runLeave(oldEl, () => {
            oldEl.remove()
            em('after-leave')
          })
        }
      })

      firstRender = false
    })
  })

  onUnmounted(() => {
    /* no-op */
  })

  return vapor(() => ({ vaporElement: container }))
}
