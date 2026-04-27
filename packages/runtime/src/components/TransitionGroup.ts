/*
TransitionGroup 组件概述
- 结构更新交给外层正常 keyed patch，组件自身只负责在提交前后读取 DOM 快照并附加动画。
- enter：对本轮新增元素执行 enter/appear。
- move：基于前后矩形差值执行 FLIP。
- leave：元素被外层 patch 移除后，临时重新插回容器尾部并执行 leave，结束后再真正删除。
*/

import { type FC, h, onUnmounted, type PropsWithChildren } from '../rue'
import { appendChild, contains } from '../dom'
import { useRef, useSetup } from '@rue-js/runtime-vapor'
import type { BaseTransitionProps } from './BaseTransition'
import { createTransitionRunner } from './BaseTransition'
import * as TransitionUtils from './transitionUtils'

type TransitionGroupChildInput = unknown

export type TransitionGroupProps = PropsWithChildren<
  BaseTransitionProps & {
    tag?: string
    moveClass?: string
  }
>

const cloneRenderableChildren = (
  children: TransitionGroupProps['children'],
): TransitionGroupProps['children'] =>
  Array.isArray(children)
    ? (children.map(child => cloneRenderableChildren(child)) as TransitionGroupProps['children'])
    : children

const normalizeTransitionGroupChildren = (children: unknown): TransitionGroupChildInput[] => {
  const out: TransitionGroupChildInput[] = []

  const visit = (value: unknown) => {
    if (value == null || value === false) {
      return
    }

    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }

    out.push(value as TransitionGroupChildInput)
  }

  visit(children)
  return out
}

const readTransitionGroupKey = (child: unknown): string => {
  if ((typeof child !== 'object' && typeof child !== 'function') || child == null) {
    return ''
  }

  const key =
    (child as { key?: unknown; props?: { key?: unknown } }).key ?? (child as any).props?.key
  return key == null ? '' : String(key)
}

const snapshotTransitionGroupProps = (props: TransitionGroupProps): TransitionGroupProps => ({
  ...(props as Record<string, unknown>),
  children: cloneRenderableChildren(props.children),
})

/** TransitionGroup：为多元素列表应用过渡与 FLIP 移动 */
export const TransitionGroup: FC<TransitionGroupProps> = props => {
  const containerRef = useRef<HTMLElement>()
  const ctx = useSetup(() => ({
    firstRender: true,
    renderVersion: null as symbol | null,
  }))

  const collectDirectElements = (container: HTMLElement): HTMLElement[] =>
    Array.from(container.children).filter(
      (node): node is HTMLElement =>
        (node as any).nodeType === 1 && !(node as HTMLElement).hasAttribute('data-rue-leaving'),
    )

  onUnmounted(() => {
    ctx.renderVersion = null
  })

  const curProps = snapshotTransitionGroupProps(props)
  const name = curProps.name || 'rue'
  const moveClass = curProps.moveClass ?? `${name}-move`
  const { runEnter, runLeave } = createTransitionRunner(curProps as BaseTransitionProps)

  const prevElementsByKey: Map<string, HTMLElement> = new Map()
  const prevRects: Map<string, DOMRect> = new Map()
  const prevContainer = containerRef.current
  if (prevContainer) {
    collectDirectElements(prevContainer).forEach(el => {
      const key = el.getAttribute('data-rue-key')
      if (!key) return
      prevElementsByKey.set(key, el)
      prevRects.set(key, el.getBoundingClientRect())
    })
  }

  const nextChildren = normalizeTransitionGroupChildren(curProps.children)
  const nextKeys = nextChildren.map(readTransitionGroupKey)
  const renderVersion = Symbol('transition-group-render')
  const isFirstRender = ctx.firstRender
  ctx.renderVersion = renderVersion

  queueMicrotask(() => {
    if (ctx.renderVersion !== renderVersion) return

    const container = containerRef.current
    if (!container) return

    const nextElements = collectDirectElements(container)
    const elementsByKey: Map<string, HTMLElement> = new Map()

    for (let index = 0; index < nextChildren.length; index++) {
      const el = nextElements[index]
      if (!el) continue
      const key = nextKeys[index]
      if (key) {
        el.setAttribute('data-rue-key', key)
        elementsByKey.set(key, el)
      } else {
        el.removeAttribute('data-rue-key')
      }
    }

    nextKeys.forEach(key => {
      if (!key) return
      const el = elementsByKey.get(key)
      if (!el) return
      if (prevElementsByKey.has(key)) return

      if (isFirstRender) {
        if (curProps.appear) runEnter(el, 'appear')
        return
      }

      runEnter(el, 'enter')
    })

    prevRects.forEach((prevRect, key) => {
      const el = elementsByKey.get(key)
      if (!el) return
      const nextRect = el.getBoundingClientRect()
      const dx = prevRect.left - nextRect.left
      const dy = prevRect.top - nextRect.top
      if (!dx && !dy) return

      el.style.transform = `translate(${dx}px, ${dy}px)`
      el.style.transition = 'transform 0s'
      TransitionUtils.forceReflow(el)
      el.style.transform = ''
      el.style.transition = ''
      TransitionUtils.addClass(el, moveClass)

      const type = curProps.type ?? TransitionUtils.inferType(el)
      const stylesTimeout = Math.max(
        TransitionUtils.resolveDuration(el, 'transition', undefined, 'enter'),
        TransitionUtils.resolveDuration(el, 'animation', undefined, 'enter'),
      )
      TransitionUtils.whenTransitionEnds(el, type ?? null, stylesTimeout, () =>
        TransitionUtils.removeClass(el, moveClass),
      )
    })

    const nextKeySet = new Set(nextKeys.filter(Boolean))
    prevElementsByKey.forEach((oldEl, key) => {
      if (nextKeySet.has(key)) return

      oldEl.setAttribute('data-rue-leaving', 'true')
      if (!contains(container, oldEl)) {
        appendChild(container, oldEl)
      }
      runLeave(oldEl, () => {
        oldEl.remove()
      })
    })
  })

  ctx.firstRender = false

  const containerTag = (props.tag || 'span') as any
  const containerProps = props.tag
    ? { ref: containerRef }
    : { ref: containerRef, style: 'display: contents' }

  return h(containerTag, containerProps as any, props.children as any)
}
