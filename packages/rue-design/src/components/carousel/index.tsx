/*
Carousel 组件概述
- 视图模型：以索引为单一真相源，统一承载受控、非受控、自动播放、箭头与 dots。
- 布局策略：scrollx 模式保留 daisyUI carousel/item 的宽度与对齐语义，fade 模式切到叠层过渡。
- 兼容目标：继续支持旧版 align/direction/auto/interval/loop/activeIndex/items 写法，同时补齐常用能力。
*/
import type { FC, RenderOutput } from '@rue-js/rue'
import { nextTick, onMounted, onUnmounted, ref, watch } from '@rue-js/rue'

/** CarouselAlign 对齐方式类型。 */
export type CarouselAlign = 'start' | 'center' | 'end'
/** CarouselDirection 位置或方向类型。 */
export type CarouselDirection = 'horizontal' | 'vertical'
/** CarouselEffect 类型。 */
export type CarouselEffect = 'scrollx' | 'fade'
/** CarouselDotPlacement 位置或方向类型。 */
export type CarouselDotPlacement = 'top' | 'bottom' | 'start' | 'end'
/** CarouselAutoDirection 位置或方向类型。 */
export type CarouselAutoDirection = 'forward' | 'backward'

/** CarouselDataItem 数据项结构。 */
export interface CarouselDataItem {
  /** 数据项唯一标识。 */
  key?: string | number
  /** 主体内容，支持文本与 JSX 可渲染值。 */
  content: RenderOutput
  /** 根节点附加类名。 */
  className?: string
}

/** CarouselDotsConfig 配置对象。 */
export interface CarouselDotsConfig {
  /** 根节点附加类名。 */
  className?: string
}

/** CarouselAutoplayConfig 配置对象。 */
export interface CarouselAutoplayConfig {
  /** dotDuration 配置项。 */
  dotDuration?: boolean
}

/** CarouselArrowRenderProps 组件属性。 */
export interface CarouselArrowRenderProps {
  /** 是否禁用交互。 */
  disabled: boolean
  /** 点击时触发的回调。 */
  onClick: () => void
  /** 布局方向。 */
  direction: 'prev' | 'next'
}

/** CarouselRef 对外暴露的实例引用。 */
export interface CarouselRef {
  /** nativeElement 配置项。 */
  nativeElement?: HTMLDivElement
  /** goTo 配置项。 */
  goTo: (slide: number, dontAnimate?: boolean) => void
  /** next 配置项。 */
  next: () => void
  /** prev 配置项。 */
  prev: () => void
  /** autoPlay 配置项。 */
  autoPlay: (playType?: 'update' | 'leave' | 'blur') => void
  /** stop 配置项。 */
  stop: () => void
}

/** CarouselProps 组件属性。 */
export interface CarouselProps {
  /** 使用默认 slot 提供幻灯片时，显式声明数量。 */
  slideCount?: number
  /** 交叉轴或内容对齐方式。 */
  align?: CarouselAlign
  /** 布局方向。 */
  direction?: CarouselDirection
  /** effect 配置项。 */
  effect?: CarouselEffect
  /** fade 配置项。 */
  fade?: boolean
  /** auto 配置项。 */
  auto?: boolean
  /** autoplay 配置项。 */
  autoplay?: boolean | CarouselAutoplayConfig
  /** interval 配置项。 */
  interval?: number
  /** autoplaySpeed 配置项。 */
  autoplaySpeed?: number
  /** loop 配置项。 */
  loop?: boolean
  /** infinite 配置项。 */
  infinite?: boolean
  /** autoDirection 配置项。 */
  autoDirection?: CarouselAutoDirection
  /** activeIndex 配置项。 */
  activeIndex?: number
  /** defaultActiveIndex 配置项。 */
  defaultActiveIndex?: number
  /** initialSlide 配置项。 */
  initialSlide?: number
  /** slickGoTo 配置项。 */
  slickGoTo?: number
  /** dots 配置项。 */
  dots?: boolean | CarouselDotsConfig
  /** arrows 配置项。 */
  arrows?: boolean
  /** prevArrow 配置项。 */
  prevArrow?: string
  /** nextArrow 配置项。 */
  nextArrow?: string
  /** dotPlacement 配置项。 */
  dotPlacement?: CarouselDotPlacement
  /** dotPosition 配置项。 */
  dotPosition?: CarouselDotPlacement | 'left' | 'right'
  /** draggable 配置项。 */
  draggable?: boolean
  /** waitForAnimate 配置项。 */
  waitForAnimate?: boolean
  /** speed 配置项。 */
  speed?: number
  /** easing 配置项。 */
  easing?: string
  /** pauseOnHover 配置项。 */
  pauseOnHover?: boolean
  /** adaptiveHeight 配置项。 */
  adaptiveHeight?: boolean
  /** onIndexChange 事件回调。 */
  onIndexChange?: (index: number) => void
  /** beforeChange 配置项。 */
  beforeChange?: (current: number, next: number) => void
  /** afterChange 配置项。 */
  afterChange?: (current: number) => void
  /** apiRef 配置项。 */
  apiRef?: any
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: string | Record<string, string | number | null | undefined>
  /** 组件子内容。 */
  children?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<CarouselDataItem>
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface CarouselItemProps {
  className?: string
  children?: any
  [key: string]: any
}

interface CarouselItemContentProps {
  content: RenderOutput
}

const CarouselItemContent: FC<CarouselItemContentProps> = ({ content }) => <>{content}</>

type InlineStyle = string | Record<string, string | number | null | undefined>

/** 转换为 Kebab Case 的内部工具函数。 */
const toKebabCase = (value: string) => value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)

/** serialize Style 的内部工具函数。 */
const serializeStyle = (style?: InlineStyle) => {
  if (!style) return undefined
  if (typeof style === 'string') {
    const trimmed = style.trim()
    return trimmed || undefined
  }

  const serialized = Object.entries(style)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key.startsWith('--') ? key : toKebabCase(key)}:${String(value)}`)
    .join('; ')

  return serialized || undefined
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) =>
  className ? `${base} ${className}` : base

/** flatten Children 的内部工具函数。 */

/** clamp 的内部工具函数。 */
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** 归一化 Index 的内部工具函数。 */
const normalizeIndex = (value: number, count: number, loop: boolean) => {
  if (count <= 0) return 0
  if (loop) {
    const modulo = value % count
    return modulo >= 0 ? modulo : modulo + count
  }
  return clamp(value, 0, count - 1)
}

/** 解析 Dot Placement 的内部工具函数。 */
const resolveDotPlacement = (
  placement: CarouselDotPlacement | 'left' | 'right' | undefined,
): CarouselDotPlacement => {
  switch (placement) {
    case 'left':
      return 'start'
    case 'right':
      return 'end'
    default:
      return placement ?? 'bottom'
  }
}

/** assign Forwarded Ref 的内部工具函数。 */
const assignForwardedRef = (forwardedRef: any, value: CarouselRef | null) => {
  if (typeof forwardedRef === 'function') {
    forwardedRef(value)
    return
  }
  if (forwardedRef && typeof forwardedRef === 'object') {
    ;(forwardedRef as any).current = value ?? undefined
  }
}

/** clear Forwarded Ref 的内部工具函数。 */
const clearForwardedRef = (forwardedRef: any, value: CarouselRef) => {
  if (typeof forwardedRef === 'function') {
    forwardedRef(null)
    return
  }
  if (forwardedRef && typeof forwardedRef === 'object' && (forwardedRef as any).current === value) {
    ;(forwardedRef as any).current = undefined
  }
}

/** 解析 Arrow Node 的内部工具函数。 */

/** 读取 Offset By Align 的内部工具函数。 */
const getOffsetByAlign = (
  align: CarouselAlign,
  viewportSize: number,
  slideStart: number,
  slideSize: number,
  trackSize: number,
) => {
  let target = slideStart
  if (align === 'center') {
    target = slideStart - (viewportSize - slideSize) / 2
  } else if (align === 'end') {
    target = slideStart - (viewportSize - slideSize)
  }
  const maxOffset = Math.max(trackSize - viewportSize, 0)
  return clamp(target, 0, maxOffset)
}

/** clear Transition Style 的内部工具函数。 */
const clearTransitionStyle = (element: HTMLElement) => {
  element.style.transitionProperty = ''
  element.style.transitionDuration = ''
  element.style.transitionTimingFunction = ''
}

/** reset Scroll Slide Style 的内部工具函数。 */
const resetScrollSlideStyle = (slide: HTMLElement) => {
  slide.style.position = ''
  slide.style.inset = ''
  slide.style.opacity = ''
  slide.style.pointerEvents = ''
  slide.style.zIndex = ''
  slide.style.transitionProperty = ''
  slide.style.transitionDuration = ''
  slide.style.transitionTimingFunction = ''
  slide.style.transform = ''
}

/**
 * 走马灯组件：
 * - scrollx 模式保留多宽度、多对齐布局能力
 * - fade 模式补齐常见的叠层切换体验
 * - 支持 ref 暴露 goTo/next/prev/autoPlay 方法
 */
const Carousel: FC<CarouselProps> = (
  {
    align = 'start',
    direction = 'horizontal',
    effect = 'scrollx',
    fade = false,
    auto = false,
    autoplay = false,
    interval = 3000,
    autoplaySpeed,
    loop = true,
    infinite,
    autoDirection = 'forward',
    activeIndex,
    defaultActiveIndex,
    initialSlide,
    slickGoTo,
    dots = false,
    arrows = false,
    prevArrow,
    nextArrow,
    dotPlacement,
    dotPosition,
    draggable = false,
    waitForAnimate = false,
    speed = 500,
    easing = 'ease',
    pauseOnHover,
    adaptiveHeight = false,
    onIndexChange,
    beforeChange,
    afterChange,
    apiRef,
    className,
    style,
    children,
    items,
    slideCount: declaredSlideCount,
    ...rest
  },
  slots: Record<string, any> = {},
) => {
  const CompiledRow1 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const _ = rowArg0
    const index = rowArg1

    const active = index === normalizeIndex(currentIndexState.value, visualCount || 1, mergedLoop)
    return (
      <button
        key={index}
        type="button"
        data-rue-carousel-dot={String(index)}
        className={mergeClassName(
          'relative h-2.5 overflow-hidden rounded-full bg-base-100/60 transition-all duration-300',
          active ? 'w-9 bg-primary/30' : 'w-2.5 hover:bg-base-100/80',
        )}
        aria-label={`Go to slide ${index + 1}`}
        aria-current={active ? 'true' : undefined}
        onClick={() => {
          commitIndex(index, { source: 'user' })
        }}
      >
        <span
          data-rue-carousel-dot-fill="true"
          className={mergeClassName(
            'absolute inset-0 rounded-full bg-primary transition-transform duration-300',
            active ? 'scale-100' : 'scale-0',
          )}
        />
        {mergedShowDotDuration && active ? (
          <span
            key={`${index}-${progressToken.value}`}
            data-rue-carousel-dot-progress="active"
            className="absolute inset-0 origin-left rounded-full bg-primary/35"
            style={{ transform: 'scaleX(0)' }}
          />
        ) : null}
      </button>
    )
  }

  const forwardedRef = rest.ref
  const userOnMouseEnter = rest.onMouseEnter
  const userOnMouseLeave = rest.onMouseLeave
  const userOnPointerDown = rest.onPointerDown
  const userOnPointerUp = rest.onPointerUp
  const userOnPointerCancel = rest.onPointerCancel
  const userOnPointerLeave = rest.onPointerLeave
  if ('ref' in rest) delete rest.ref
  if ('onMouseEnter' in rest) delete rest.onMouseEnter
  if ('onMouseLeave' in rest) delete rest.onMouseLeave
  if ('onPointerDown' in rest) delete rest.onPointerDown
  if ('onPointerUp' in rest) delete rest.onPointerUp
  if ('onPointerCancel' in rest) delete rest.onPointerCancel
  if ('onPointerLeave' in rest) delete rest.onPointerLeave

  const mergedEffect: CarouselEffect = fade ? 'fade' : effect
  const mergedLoop = infinite ?? loop
  const mergedAutoplay = typeof autoplay === 'object' ? true : autoplay || auto
  const mergedAutoplaySpeed = autoplaySpeed ?? interval
  const mergedPauseOnHover = pauseOnHover ?? mergedAutoplay
  const mergedDotPlacement = resolveDotPlacement(dotPlacement ?? dotPosition)
  const mergedShowDotDuration =
    mergedAutoplay && typeof autoplay === 'object' && !!autoplay.dotDuration
  const serializedStyle = serializeStyle(style)
  const normalizedItems = items ?? []
  const slideCountHint =
    normalizedItems.length > 0 ? normalizedItems.length : (declaredSlideCount ?? 0)
  const mergedControlledIndex = slickGoTo ?? activeIndex
  const initialIndex = normalizeIndex(
    typeof mergedControlledIndex === 'number'
      ? mergedControlledIndex
      : (defaultActiveIndex ?? initialSlide ?? 0),
    slideCountHint || 1,
    mergedLoop,
  )

  let rootElement: HTMLDivElement | undefined
  let trackElement: HTMLDivElement | undefined
  let autoplayTimer: ReturnType<typeof setInterval> | null = null
  let transitionTimer: ReturnType<typeof setTimeout> | null = null
  let resizeHandler: (() => void) | null = null
  let loadHandler: ((event: Event) => void) | null = null
  let pendingControlledIndex: number | null = null
  let layoutSyncRequest = 0
  let animationLocked = false
  let dragStart: number | null = null
  const progressToken = ref(0)
  const hovered = ref(false)
  const currentIndexState = ref(initialIndex)
  const resolvedSlideCountState = ref(slideCountHint)

  const getRenderedSlides = () => {
    const track = trackElement
    if (!track) return [] as HTMLElement[]
    return Array.from(track.children ?? []).filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    )
  }

  const getResolvedCount = () => {
    const renderedCount = getRenderedSlides().length
    return renderedCount || slideCountHint
  }

  const clearTransitionTimer = () => {
    if (transitionTimer != null) {
      clearTimeout(transitionTimer)
      transitionTimer = null
    }
    animationLocked = false
  }

  const restartDotProgress = () => {
    if (!mergedShowDotDuration) return
    const root = rootElement
    if (!root || typeof root.querySelector !== 'function') return
    const progress = root.querySelector<HTMLElement>('[data-rue-carousel-dot-progress="active"]')
    if (!progress?.style) return
    progress.style.transition = 'none'
    progress.style.transform = 'scaleX(0)'
    requestAnimationFrame(() => {
      progress.style.transition = `transform ${mergedAutoplaySpeed}ms linear`
      progress.style.transform = 'scaleX(1)'
    })
  }

  const scheduleAfterChange = (next: number, dontAnimate: boolean) => {
    clearTransitionTimer()
    if (!dontAnimate && speed > 0) {
      animationLocked = true
    }

    transitionTimer = setTimeout(
      () => {
        animationLocked = false
        if (afterChange) afterChange(next)
      },
      dontAnimate || speed <= 0 ? 0 : speed,
    )
  }

  const stopAutoplay = () => {
    if (autoplayTimer != null) {
      clearInterval(autoplayTimer)
      autoplayTimer = null
    }
  }

  const startAutoplay = () => {
    stopAutoplay()
    if (!mergedAutoplay || getResolvedCount() <= 1) return
    if (mergedPauseOnHover && hovered.value) return

    autoplayTimer = setInterval(() => {
      const delta = autoDirection === 'backward' ? -1 : 1
      commitIndex(currentIndexState.value + delta, {
        source: 'autoplay',
      })
    }, mergedAutoplaySpeed)
  }

  const api: CarouselRef = {
    nativeElement: undefined,
    goTo: (slide, dontAnimate = false) => {
      commitIndex(slide, { source: 'api', dontAnimate })
    },
    next: () => {
      commitIndex(currentIndexState.value + 1, { source: 'api' })
    },
    prev: () => {
      commitIndex(currentIndexState.value - 1, { source: 'api' })
    },
    autoPlay: playType => {
      if (playType === 'leave' || playType === 'blur') {
        stopAutoplay()
        return
      }
      startAutoplay()
    },
    stop: () => {
      stopAutoplay()
    },
  }

  const syncRef = () => {
    api.nativeElement = rootElement
    assignForwardedRef(forwardedRef, rootElement ? api : null)
    assignForwardedRef(apiRef, rootElement ? api : null)
  }

  const syncScrollLayout = (dontAnimate: boolean) => {
    const root = rootElement
    const track = trackElement
    if (!root || !track) return
    const slides = getRenderedSlides()

    root.style.position = 'relative'
    root.style.overflow = 'hidden'
    root.style.transition = adaptiveHeight ? `height ${speed}ms ${easing}` : ''

    track.style.display = 'flex'
    track.style.flexDirection = direction === 'vertical' ? 'column' : 'row'
    track.style.width = direction === 'vertical' ? '100%' : ''
    track.style.height = direction === 'vertical' ? '100%' : ''
    track.style.position = ''
    track.style.minHeight = ''
    track.style.transitionProperty = 'transform'
    track.style.transitionDuration = dontAnimate ? '0ms' : `${speed}ms`
    track.style.transitionTimingFunction = easing

    slides.forEach(resetScrollSlideStyle)

    if (!slides.length) {
      track.style.transform = ''
      return
    }

    const safeIndex = normalizeIndex(currentIndexState.value, slides.length, mergedLoop)
    if (safeIndex !== currentIndexState.value) {
      currentIndexState.value = safeIndex
      return
    }

    const targetSlide = slides[safeIndex]
    const viewportSize = direction === 'vertical' ? root.clientHeight : root.clientWidth
    const slideStart = direction === 'vertical' ? targetSlide.offsetTop : targetSlide.offsetLeft
    const slideSize = direction === 'vertical' ? targetSlide.offsetHeight : targetSlide.offsetWidth
    const trackSize = direction === 'vertical' ? track.scrollHeight : track.scrollWidth
    const offset = getOffsetByAlign(align, viewportSize, slideStart, slideSize, trackSize)
    track.style.transform =
      direction === 'vertical'
        ? `translate3d(0, -${offset}px, 0)`
        : `translate3d(-${offset}px, 0, 0)`

    if (adaptiveHeight && direction === 'horizontal') {
      root.style.height = `${targetSlide.offsetHeight}px`
    } else if (!adaptiveHeight) {
      root.style.height = ''
    }
  }

  const syncFadeLayout = (dontAnimate: boolean) => {
    const root = rootElement
    const track = trackElement
    if (!root || !track) return
    const slides = getRenderedSlides()

    root.style.position = 'relative'
    root.style.overflow = 'hidden'
    root.style.transition = `height ${speed}ms ${easing}`

    track.style.display = 'block'
    track.style.width = '100%'
    track.style.height = '100%'
    track.style.position = 'relative'
    track.style.transform = ''
    clearTransitionStyle(track)

    if (!slides.length) return

    const safeIndex = normalizeIndex(currentIndexState.value, slides.length, mergedLoop)
    if (safeIndex !== currentIndexState.value) {
      currentIndexState.value = safeIndex
      return
    }

    const currentSlide = slides[safeIndex]
    const tallest = slides.reduce((max, slide) => Math.max(max, slide.offsetHeight), 0)
    const nextHeight = adaptiveHeight ? currentSlide.offsetHeight : tallest
    if (nextHeight > 0) {
      root.style.height = `${nextHeight}px`
      track.style.minHeight = `${nextHeight}px`
    }

    slides.forEach((slide, index) => {
      slide.style.position = 'absolute'
      slide.style.inset = '0'
      slide.style.width = '100%'
      slide.style.height = '100%'
      slide.style.opacity = index === safeIndex ? '1' : '0'
      slide.style.pointerEvents = index === safeIndex ? 'auto' : 'none'
      slide.style.zIndex = index === safeIndex ? '1' : '0'
      slide.style.transitionProperty = 'opacity'
      slide.style.transitionDuration = dontAnimate ? '0ms' : `${speed}ms`
      slide.style.transitionTimingFunction = easing
      slide.style.transform = 'translate3d(0, 0, 0)'
    })
  }

  const syncLayout = (dontAnimate = false) => {
    // SSR refs point to server nodes without browser layout/query APIs.
    if (typeof rootElement?.querySelector !== 'function') return
    const renderedCount = getRenderedSlides().length
    if (renderedCount > 0 && renderedCount !== resolvedSlideCountState.value) {
      resolvedSlideCountState.value = renderedCount
    }
    syncRef()
    if (mergedEffect === 'fade') {
      syncFadeLayout(dontAnimate)
    } else {
      syncScrollLayout(dontAnimate)
    }

    requestAnimationFrame(() => {
      restartDotProgress()
    })
  }

  const requestLayoutSync = (dontAnimate = true) => {
    if (typeof rootElement?.querySelector !== 'function') return
    const request = ++layoutSyncRequest
    const syncIfLatest = () => {
      if (request !== layoutSyncRequest) return
      syncLayout(dontAnimate)
    }

    nextTick(syncIfLatest)
    setTimeout(syncIfLatest, 0)
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(syncIfLatest)
    }
  }

  const commitIndex = (
    targetIndex: number,
    options: {
      source?: 'user' | 'api' | 'prop' | 'autoplay'
      dontAnimate?: boolean
    } = {},
  ) => {
    const count = getResolvedCount()
    if (count <= 0) return

    const nextIndex = normalizeIndex(targetIndex, count, mergedLoop)
    const currentIndex = normalizeIndex(currentIndexState.value, count, mergedLoop)
    if (waitForAnimate && animationLocked && !options.dontAnimate) {
      return
    }

    if (nextIndex === currentIndex) {
      syncLayout(!!options.dontAnimate)
      return
    }

    if (beforeChange) {
      beforeChange(currentIndex, nextIndex)
    }

    currentIndexState.value = nextIndex
    if (options.source !== 'prop') {
      pendingControlledIndex = nextIndex
    }
    if (onIndexChange) {
      onIndexChange(nextIndex)
    }

    progressToken.value += 1
    syncLayout(!!options.dontAnimate)
    scheduleAfterChange(nextIndex, !!options.dontAnimate)
    startAutoplay()
  }

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false
    return !!target.closest('button, a, input, select, textarea, label')
  }

  const setRootElement = (element: HTMLDivElement | null) => {
    if (!element) return
    rootElement = element
    syncRef()
    requestLayoutSync(true)
  }

  const setTrackElement = (element: HTMLDivElement | null) => {
    if (!element) return
    trackElement = element
    requestLayoutSync(true)
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (typeof userOnPointerDown === 'function') userOnPointerDown(event)
    if (!draggable || isInteractiveTarget(event.target)) return
    dragStart = direction === 'vertical' ? event.clientY : event.clientX
  }

  const handlePointerCancel = (event: PointerEvent) => {
    if (typeof userOnPointerCancel === 'function') userOnPointerCancel(event)
    dragStart = null
  }

  const handlePointerEnd = (event: Event) => {
    if (!draggable || dragStart == null) return
    const point = event instanceof PointerEvent ? event : null
    const end = point ? (direction === 'vertical' ? point.clientY : point.clientX) : dragStart
    const delta = end - dragStart
    dragStart = null

    if (Math.abs(delta) < 40) return
    if (delta < 0) {
      commitIndex(currentIndexState.value + 1, { source: 'user' })
      return
    }
    commitIndex(currentIndexState.value - 1, { source: 'user' })
  }

  const visualCount = resolvedSlideCountState.value
  const canShowControls = visualCount > 1

  let rootClassName = 'carousel relative overflow-hidden'
  if (align === 'center') rootClassName += ' carousel-center'
  if (align === 'end') rootClassName += ' carousel-end'
  if (direction === 'vertical') rootClassName += ' carousel-vertical'
  else rootClassName += ' carousel-horizontal'
  if (className) rootClassName += ` ${className}`

  const dotsClassName = (() => {
    const base = 'pointer-events-auto z-20 gap-2'
    if (mergedDotPlacement === 'top') {
      return `${base} absolute left-1/2 top-4 flex -translate-x-1/2`
    }
    if (mergedDotPlacement === 'bottom') {
      return `${base} absolute bottom-4 left-1/2 flex -translate-x-1/2`
    }
    if (direction === 'vertical') {
      return mergedDotPlacement === 'start'
        ? `${base} absolute left-1/2 top-4 flex -translate-x-1/2`
        : `${base} absolute bottom-4 left-1/2 flex -translate-x-1/2`
    }
    return mergedDotPlacement === 'start'
      ? `${base} absolute left-4 top-1/2 flex -translate-y-1/2 flex-col`
      : `${base} absolute right-4 top-1/2 flex -translate-y-1/2 flex-col`
  })()

  onMounted(() => {
    syncRef()
    requestLayoutSync(true)
    startAutoplay()

    resizeHandler = () => {
      syncLayout(true)
    }
    loadHandler = () => {
      syncLayout(true)
    }

    if (typeof window !== 'undefined' && resizeHandler) {
      window.addEventListener('resize', resizeHandler)
    }
    if (rootElement && loadHandler && typeof rootElement.addEventListener === 'function') {
      rootElement.addEventListener('load', loadHandler, true)
    }
  })

  onUnmounted(() => {
    stopAutoplay()
    clearTransitionTimer()
    if (typeof window !== 'undefined' && resizeHandler) {
      window.removeEventListener('resize', resizeHandler)
    }
    if (rootElement && loadHandler && typeof rootElement.removeEventListener === 'function') {
      rootElement.removeEventListener('load', loadHandler, true)
    }
    clearForwardedRef(forwardedRef, api)
    clearForwardedRef(apiRef, api)
    api.nativeElement = undefined
    rootElement = undefined
    trackElement = undefined
  })

  watch(
    () => slickGoTo ?? activeIndex,
    next => {
      if (typeof next !== 'number') return
      const count = getResolvedCount() || 1
      const normalized = normalizeIndex(next, count, mergedLoop)
      if (pendingControlledIndex === normalized) {
        pendingControlledIndex = null
        currentIndexState.value = normalized
        syncLayout(false)
        return
      }
      commitIndex(normalized, { source: 'prop' })
    },
    { immediate: false },
  )

  watch(
    () => slideCountHint,
    (nextCount: number | undefined) => {
      if (!nextCount) return
      currentIndexState.value = normalizeIndex(currentIndexState.value, nextCount, mergedLoop)
      syncLayout(true)
      startAutoplay()
    },
    { immediate: false },
  )

  return (
    <div
      {...rest}
      ref={setRootElement}
      className={rootClassName}
      style={serializedStyle}
      data-rue-carousel-current={String(currentIndexState.value)}
      role={rest.role ?? 'region'}
      aria-roledescription={rest['aria-roledescription'] ?? 'carousel'}
      onMouseEnter={(event: MouseEvent) => {
        hovered.value = true
        if (mergedPauseOnHover) stopAutoplay()
        if (typeof userOnMouseEnter === 'function') userOnMouseEnter(event)
      }}
      onMouseLeave={(event: MouseEvent) => {
        hovered.value = false
        if (mergedPauseOnHover) startAutoplay()
        if (typeof userOnMouseLeave === 'function') userOnMouseLeave(event)
      }}
      onPointerDown={(event: PointerEvent) => {
        handlePointerDown(event)
      }}
      onPointerUp={(event: PointerEvent) => {
        if (typeof userOnPointerUp === 'function') userOnPointerUp(event)
        handlePointerEnd(event)
      }}
      onPointerCancel={(event: PointerEvent) => {
        handlePointerCancel(event)
      }}
      onPointerLeave={(event: PointerEvent) => {
        if (typeof userOnPointerLeave === 'function') userOnPointerLeave(event)
        if (!draggable) return
        handlePointerEnd(event)
      }}
    >
      <div
        ref={setTrackElement}
        className={mergeClassName(
          mergedEffect === 'fade' ? 'relative w-full h-full' : 'will-change-transform',
          mergedEffect === 'scrollx' && direction === 'vertical'
            ? 'flex flex-col'
            : mergedEffect === 'scrollx'
              ? 'flex'
              : undefined,
        )}
        data-rue-carousel-track="true"
      >
        {mergedEffect === 'fade' ? (
          normalizedItems.length > 0 ? (
            <>
              {' '}
              {normalizedItems.map((item, index) => (
                <div
                  key={item.key ?? index}
                  className={`carousel-item${item.className ? ` ${item.className}` : ''}`}
                  data-rue-carousel-slide={String(index)}
                >
                  <CarouselItemContent content={item.content} />
                </div>
              ))}{' '}
            </>
          ) : (
            children
          )
        ) : normalizedItems.length > 0 ? (
          <>
            {' '}
            {normalizedItems.map((item, index) => (
              <div
                key={item.key ?? index}
                className={`carousel-item${item.className ? ` ${item.className}` : ''}`}
                data-rue-carousel-slide={String(index)}
              >
                <CarouselItemContent content={item.content} />
              </div>
            ))}{' '}
          </>
        ) : (
          children
        )}
      </div>

      {arrows && canShowControls ? (
        <>
          <button
            type="button"
            data-rue-carousel-prev="true"
            className="btn btn-circle btn-sm sm:btn-md absolute left-3 top-1/2 z-20 -translate-y-1/2 bg-base-100/80 backdrop-blur disabled:opacity-40"
            disabled={!mergedLoop && currentIndexState.value <= 0}
            aria-label="Previous slide"
            onClick={() => {
              commitIndex(currentIndexState.value - 1, { source: 'user' })
            }}
          >
            {slots.prevArrow ? <>{slots.prevArrow}</> : String(prevArrow ?? '‹')}
          </button>
          <button
            type="button"
            data-rue-carousel-next="true"
            className="btn btn-circle btn-sm sm:btn-md absolute right-3 top-1/2 z-20 -translate-y-1/2 bg-base-100/80 backdrop-blur disabled:opacity-40"
            disabled={!mergedLoop && currentIndexState.value >= Math.max(0, visualCount - 1)}
            aria-label="Next slide"
            onClick={() => {
              commitIndex(currentIndexState.value + 1, { source: 'user' })
            }}
          >
            {slots.nextArrow ? <>{slots.nextArrow}</> : String(nextArrow ?? '›')}
          </button>
        </>
      ) : null}

      {dots && canShowControls ? (
        <div
          className={mergeClassName(
            dotsClassName,
            typeof dots === 'boolean' ? undefined : dots.className,
          )}
        >
          {Array.from({ length: visualCount }).map((rowArg0: any, rowArg1: number) => (
            <CompiledRow1 rowArg0={rowArg0} rowArg1={rowArg1} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** 子项组件：在 scrollx 模式下延续 daisyUI carousel-item 语义。 */
const Item: FC<CarouselItemProps> = ({ className, children, ...rest }) => {
  return (
    <div {...rest} className={mergeClassName('carousel-item', className)}>
      {children}
    </div>
  )
}

type CarouselCompound = FC<CarouselProps> & {
  Item: FC<CarouselItemProps>
}

const CarouselCompound: CarouselCompound = /*#__PURE__*/ Object.assign(Carousel, {
  Item,
})

/** 默认导出轮播组件。 */
export default CarouselCompound
