/*
Transition 组件概述
- 职责：为区间内“首个元素节点”应用进入/离开过渡，简化单元素的动画控制。
- 阶段控制：首次渲染且 props.appear=true 时执行 appear；否则执行 enter。无子元素时执行 leave 或直接清空。
- 容器策略：默认以 display: contents 的 span 作为占位容器，保持文档语义与样式继承的稳定。
*/
// 参考 Vue3 的 Transition 设计思路，结合 Rue 的信号与 vapor 渲染机制
import { type FC, type VNode, onMounted, onUnmounted, renderBetween, vapor } from '../rue'
import { watchEffect } from '../reactivity'
import { type BaseTransitionProps, createTransitionRunner } from '@rue-js/runtime'
import { createElement, createComment, appendChild, createDocumentFragment } from '../dom'
import type { DomNodeLike } from '../dom'

export type TransitionProps = BaseTransitionProps

/** Transition 组件：为区间内首个元素应用过渡 */
export const Transition: FC<TransitionProps> = props => {
  const container = createElement('span') as HTMLElement
  container.style.display = 'contents'
  const startEl = createComment('rue-transition-start')
  const endEl = createComment('rue-transition-end')

  const { runEnter, runLeave } = createTransitionRunner(props)

  let prevShown = false

  /** 获取区间内第一个元素节点 */
  function firstElementBetween(): HTMLElement | null {
    let n: DomNodeLike | null = (startEl as any).nextSibling || null
    while (n && n !== endEl) {
      if ((n as any).nodeType === 1) return n as any as HTMLElement
      n = (n as any).nextSibling || null
    }
    return null
  }

  /** 清空区间内容 */
  function clearRange() {
    renderBetween(
      vapor(() => ({ vaporElement: createDocumentFragment() })),
      container,
      startEl,
      endEl,
    )
  }

  onMounted(() => {
    // 初始化锚点，固定渲染区间
    appendChild(container, startEl)
    appendChild(container, endEl)

    watchEffect(() => {
      // 规范化 children，取首个子节点作为过渡目标
      const ch = props.children as VNode[]
      let child: VNode | null = null
      if (Array.isArray(ch)) child = ch[0] ?? null
      else child = ch as any

      const hasChild = !!child

      if (hasChild) {
        // 渲染首个子节点到锚点区间
        renderBetween(child!, container, startEl, endEl)
        const el = firstElementBetween()
        if (el) {
          // 首次出现且允许 appear 则走 appear，否则 enter
          const phase: 'enter' | 'appear' = !prevShown && props.appear ? 'appear' : 'enter'
          runEnter(el, phase)
        }
      } else if (prevShown) {
        // 从有到无：执行离开过渡，结束后清空
        const el = firstElementBetween()
        if (el) runLeave(el, () => clearRange())
        else clearRange()
      } else {
        // 无内容且之前也无：直接清空以保持区间干净
        clearRange()
      }

      // 记录当前是否显示，用于下一轮决定是否触发 leave
      prevShown = hasChild
    })
  })

  onUnmounted(() => {
    /* no-op */
  })

  return vapor(() => ({ vaporElement: container }))
}
