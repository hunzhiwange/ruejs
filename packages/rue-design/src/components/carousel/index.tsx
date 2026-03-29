/*
Carousel 组件概述
- 方向与对齐：horizontal/vertical 与 start/center/end 控制布局。
- 自动播放：auto/interval/loop/autoDirection 控制翻页节奏与循环。
- 复合组件：Item 子组件表示单个滑块。
*/
import type { FC } from '@rue-js/rue'
import { onMounted, onUnmounted, useRef, watch } from '@rue-js/rue'
/* 生命周期钩子与引用：驱动自动播放与滚动定位 */

type CarouselAlign = 'start' | 'center' | 'end'
type CarouselDirection = 'horizontal' | 'vertical'

interface CarouselDataItem {
  content: any
  className?: string
}

interface CarouselProps {
  align?: CarouselAlign
  direction?: CarouselDirection
  auto?: boolean
  interval?: number
  loop?: boolean
  autoDirection?: 'forward' | 'backward'
  activeIndex?: number
  onIndexChange?: (index: number) => void
  className?: string
  children?: any
  items?: ReadonlyArray<CarouselDataItem>
}

/** 走马灯组件：支持自动播放与受控索引 */
const Carousel: FC<CarouselProps> = ({
  align = 'start',
  direction = 'horizontal',
  auto = false,
  interval = 3000,
  loop = true,
  autoDirection = 'forward',
  activeIndex,
  onIndexChange,
  className,
  children,
  items,
}) => {
  const containerRef = useRef<HTMLDivElement>()
  /* 容器类名：对齐与方向控制 */
  let cls = 'carousel'
  if (align === 'center') cls += ` carousel-center`
  if (align === 'end') cls += ` carousel-end`
  if (direction === 'vertical') cls += ` carousel-vertical`
  else cls += ` carousel-horizontal`
  if (className) cls += ` ${className}`

  const getItems = () => {
    const el = containerRef.current
    if (!el) return [] as HTMLElement[]
    return Array.from(el.querySelectorAll<HTMLElement>('.carousel-item'))
  }
  const scrollToIndex = (i: number) => {
    /* 滚动到指定索引 */
    const items = getItems()
    if (!items.length) return
    const idx = Math.max(0, Math.min(i, items.length - 1))
    const target = items[idx]
    const el = containerRef.current
    if (!el || !target) return
    const canScrollTo = typeof (el as any).scrollTo === 'function'
    if (direction === 'vertical') {
      if (canScrollTo) (el as any).scrollTo({ top: target.offsetTop, behavior: 'smooth' })
      else el.scrollTop = target.offsetTop
    } else {
      if (canScrollTo) (el as any).scrollTo({ left: target.offsetLeft, behavior: 'smooth' })
      else el.scrollLeft = target.offsetLeft
    }
    /* 更新外部受控索引 */
    if (onIndexChange) onIndexChange(idx)
  }

  const getCurrentIndex = () => {
    /* 根据滚动位置推断当前索引 */
    const items = getItems()
    const el = containerRef.current
    if (!el || !items.length) return 0
    const pos = direction === 'vertical' ? el.scrollTop : el.scrollLeft
    let idx = 0
    for (let i = 0; i < items.length; i++) {
      const off = direction === 'vertical' ? items[i].offsetTop : items[i].offsetLeft
      if (off <= pos + 1) idx = i
      else break
    }
    return idx
  }

  let timer: any = null
  const smoothScrollTo = (pos: number) => {
    /* 平滑滚动到目标位置 */
    const el = containerRef.current
    if (!el) return
    const canScrollTo = typeof (el as any).scrollTo === 'function'
    if (direction === 'vertical') {
      requestAnimationFrame(() => {
        if (canScrollTo) (el as any).scrollTo({ top: pos, behavior: 'smooth' })
        else el.scrollTop = pos
      })
    } else {
      requestAnimationFrame(() => {
        if (canScrollTo) (el as any).scrollTo({ left: pos, behavior: 'smooth' })
        else el.scrollLeft = pos
      })
    }
  }
  const scrollByPage = (dir: 'forward' | 'backward') => {
    /* 按页面尺寸翻滚，支持循环与边界处理 */
    const el = containerRef.current
    if (!el) return
    const delta = direction === 'vertical' ? el.clientHeight : el.clientWidth
    const pos = direction === 'vertical' ? el.scrollTop : el.scrollLeft
    const max = direction === 'vertical' ? el.scrollHeight : el.scrollWidth
    let nextPos = pos
    if (dir === 'forward') {
      if (loop) {
        if (pos - delta >= 0) {
          nextPos = pos - delta
        } else {
          nextPos = Math.max(0, max - delta)
        }
      } else {
        nextPos = Math.max(pos - delta, 0)
      }
    } else {
      if (loop) {
        if (pos + delta <= Math.max(0, max - delta)) {
          nextPos = pos + delta
        } else {
          nextPos = 0
        }
      } else {
        nextPos = Math.min(pos + delta, Math.max(0, max - delta))
      }
    }
    smoothScrollTo(nextPos)
    /* 翻页后同步当前索引 */
    const idx = getCurrentIndex()
    if (onIndexChange) onIndexChange(idx)
  }
  const startAuto = () => {
    /* 启动自动播放 */
    if (!auto) return
    stopAuto()
    timer = setInterval(() => {
      if (autoDirection === 'backward') scrollByPage('backward')
      else scrollByPage('forward')
    }, interval)
  }
  const stopAuto = () => {
    /* 停止自动播放 */
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onMounted(() => {
    /* 初始定位：考虑 loop 与方向与 autoDirection */
    const el = containerRef.current
    if (el && loop) {
      const delta = direction === 'vertical' ? el.clientHeight : el.clientWidth
      const max = direction === 'vertical' ? el.scrollHeight : el.scrollWidth
      if (autoDirection === 'forward') {
        if (direction === 'vertical') el.scrollTop = Math.max(0, max - delta)
        else {
          el.scrollLeft = Math.max(0, max - delta)
        }
      } else {
        if (direction === 'vertical') el.scrollTop = 0
        else el.scrollLeft = 0
      }
    }
    startAuto()
  })
  onUnmounted(() => {
    /* 组件卸载：清理自动播放定时器 */
    stopAuto()
  })

  watch(
    () => activeIndex,
    v => {
      /* 受控索引变化：同步滚动 */
      if (typeof v === 'number') {
        scrollToIndex(v)
      }
    },
    { immediate: true },
  )

  return (
    <div ref={containerRef} className={cls}>
      {/* items 优先：否则回退到 children */}
      {items && items.length
        ? items.map((it, i) => (
            <div key={i} className={`carousel-item${it.className ? ` ${it.className}` : ''}`}>
              {it.content}
            </div>
          ))
        : children}
    </div>
  )
}

interface CarouselItemProps {
  className?: string
  children?: any
}

/** 子项组件：单个滑块容器 */
const Item: FC<CarouselItemProps> = ({ className, children }) => {
  let cls = 'carousel-item'
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

type CarouselCompound = FC<CarouselProps> & {
  Item: FC<CarouselItemProps>
}

const CarouselCompound: CarouselCompound = Object.assign(Carousel, {
  Item,
})

export default CarouselCompound
