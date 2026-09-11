/*
Popover 组件概述
- 提供接近成熟组件库的悬浮卡片能力，覆盖 hover / focus / click / contextMenu、受控 / 非受控、语义化 classNames/styles 和箭头配置。
- 与 Tooltip 的轻提示不同，Popover 以可交互卡片为核心，适合承载操作按钮、说明块和结构化信息。
- 实现保持为原生 TSX 源文件，交给 Rue 编译器参与优化，而不是预先写入变换结果。
*/
import type { FC } from '@rue-js/rue'
import { onMounted, onUnmounted, ref, useRef, watch } from '@rue-js/rue'

/** PopoverPlacement 位置或方向类型。 */
export type PopoverPlacement =
  | 'top'
  | 'topLeft'
  | 'topRight'
  | 'bottom'
  | 'bottomLeft'
  | 'bottomRight'
  | 'left'
  | 'leftTop'
  | 'leftBottom'
  | 'right'
  | 'rightTop'
  | 'rightBottom'

/** PopoverTrigger 类型。 */
export type PopoverTrigger = 'hover' | 'focus' | 'click' | 'contextMenu'
/** PopoverArrow 类型。 */
export type PopoverArrow = boolean | { pointAtCenter?: boolean }

/** PopoverClassNames 局部类名配置。 */
export interface PopoverClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** trigger 区域配置。 */
  trigger?: string
  /** overlay 配置项。 */
  overlay?: string
  /** panel 区域配置。 */
  panel?: string
  /** arrow 配置项。 */
  arrow?: string
  /** 头部区域内容。 */
  header?: string
  /** 标题内容。 */
  title?: string
  /** 主体内容。 */
  content?: string
}

/** PopoverStyles 局部样式配置。 */
export interface PopoverStyles {
  /** 根节点区域配置。 */
  root?: Record<string, any>
  /** trigger 区域配置。 */
  trigger?: Record<string, any>
  /** overlay 配置项。 */
  overlay?: Record<string, any>
  /** panel 区域配置。 */
  panel?: Record<string, any>
  /** arrow 配置项。 */
  arrow?: Record<string, any>
  /** 头部区域内容。 */
  header?: Record<string, any>
  /** 标题内容。 */
  title?: Record<string, any>
  /** 主体内容。 */
  content?: Record<string, any>
}

/** PopoverProps 组件属性。 */
export interface PopoverProps {
  /** 自定义渲染的宿主元素。 */
  as?: string
  /** 标题内容。 */
  title?: string | number
  /** 主体内容。 */
  content?: string | number
  /** overlay 配置项。 */
  overlay?: any
  /** 弹出层或内容展示位置。 */
  placement?: PopoverPlacement
  /** trigger 区域配置。 */
  trigger?: PopoverTrigger | PopoverTrigger[]
  /** 受控打开状态。 */
  open?: boolean
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** arrow 配置项。 */
  arrow?: PopoverArrow
  /** destroyOnHidden 配置项。 */
  destroyOnHidden?: boolean
  /** mouseEnterDelay 配置项。 */
  mouseEnterDelay?: number
  /** mouseLeaveDelay 配置项。 */
  mouseLeaveDelay?: number
  /** zIndex 配置项。 */
  zIndex?: number
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: string | Record<string, any>
  /** triggerClassName 附加类名。 */
  triggerClassName?: string
  /** triggerStyle 内联样式。 */
  triggerStyle?: string | Record<string, any>
  /** overlayClassName 附加类名。 */
  overlayClassName?: string
  /** overlayStyle 内联样式。 */
  overlayStyle?: Record<string, any>
  /** 按局部区域覆盖的类名集合。 */
  classNames?: PopoverClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: PopoverStyles
  /** 打开状态变化时触发的回调。 */
  onOpenChange?: (open: boolean) => void
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface PlacementLayout {
  direction: 'top' | 'bottom' | 'left' | 'right'
  align: 'start' | 'center' | 'end'
}

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...parts: Array<string | undefined | false | null>) => {
  return parts.filter(Boolean).join(' ')
}

/** merge Styles 的内部工具函数。 */
const mergeStyles = (...parts: Array<Record<string, any> | undefined>) => {
  const merged: Record<string, any> = {}
  parts.forEach(part => {
    if (part) Object.assign(merged, part)
  })
  return merged
}

/** 转换为 Kebab Case 的内部工具函数。 */
const toKebabCase = (value: string) => value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)

/** serialize Style 的内部工具函数。 */
const serializeStyle = (style?: string | Record<string, any>) => {
  if (!style) return ''
  if (typeof style === 'string') return style.trim()
  return Object.entries(style)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key.startsWith('--') ? key : toKebabCase(key)}:${String(value)}`)
    .join('; ')
}

/** merge Style Value 的内部工具函数。 */
const mergeStyleValue = (
  base?: string | Record<string, any>,
  extra?: string | Record<string, any>,
) => {
  const baseStyle = serializeStyle(base)
  const extraStyle = serializeStyle(extra)
  const merged = [baseStyle, extraStyle].filter(Boolean).join('; ')
  return merged || undefined
}

/** 归一化 Trigger 的内部工具函数。 */
const normalizeTrigger = (trigger?: PopoverTrigger | PopoverTrigger[]) => {
  const source = Array.isArray(trigger) ? trigger : trigger ? [trigger] : ['hover']
  return Array.from(new Set(source)) as PopoverTrigger[]
}

/** call Handler 的内部工具函数。 */
const callHandler = (handler: ((event: any) => void) | undefined, event: any) => {
  if (typeof handler === 'function') handler(event)
}

/** 解析 Renderable 的内部工具函数。 */

/** 判断 Renderable 的内部工具函数。 */
const isRenderable = (value: any) => value != null && value !== false && value !== ''

/** 解析 Placement Layout 的内部工具函数。 */
const resolvePlacementLayout = (placement: PopoverPlacement): PlacementLayout => {
  switch (placement) {
    case 'top':
      return { direction: 'top', align: 'center' }
    case 'topLeft':
      return { direction: 'top', align: 'start' }
    case 'topRight':
      return { direction: 'top', align: 'end' }
    case 'bottom':
      return { direction: 'bottom', align: 'center' }
    case 'bottomRight':
      return { direction: 'bottom', align: 'end' }
    case 'left':
      return { direction: 'left', align: 'center' }
    case 'leftTop':
      return { direction: 'left', align: 'start' }
    case 'leftBottom':
      return { direction: 'left', align: 'end' }
    case 'right':
      return { direction: 'right', align: 'center' }
    case 'rightTop':
      return { direction: 'right', align: 'start' }
    case 'rightBottom':
      return { direction: 'right', align: 'end' }
    case 'bottomLeft':
    default:
      return { direction: 'bottom', align: 'start' }
  }
}

/** 读取 Overlay Placement Class 的内部工具函数。 */
const getOverlayPlacementClass = (placement: PopoverPlacement) => {
  switch (placement) {
    case 'top':
      return 'bottom-full left-1/2 mb-3 -translate-x-1/2'
    case 'topLeft':
      return 'bottom-full left-0 mb-3'
    case 'topRight':
      return 'bottom-full right-0 mb-3'
    case 'bottom':
      return 'top-full left-1/2 mt-3 -translate-x-1/2'
    case 'bottomRight':
      return 'top-full right-0 mt-3'
    case 'left':
      return 'right-full top-1/2 me-3 -translate-y-1/2'
    case 'leftTop':
      return 'right-full top-0 me-3'
    case 'leftBottom':
      return 'right-full bottom-0 me-3'
    case 'right':
      return 'left-full top-1/2 ms-3 -translate-y-1/2'
    case 'rightTop':
      return 'left-full top-0 ms-3'
    case 'rightBottom':
      return 'left-full bottom-0 ms-3'
    case 'bottomLeft':
    default:
      return 'top-full left-0 mt-3'
  }
}

/** 读取 Transform Origin Class 的内部工具函数。 */
const getTransformOriginClass = (placement: PopoverPlacement) => {
  switch (placement) {
    case 'top':
    case 'topLeft':
    case 'topRight':
      return 'origin-bottom'
    case 'left':
    case 'leftTop':
    case 'leftBottom':
      return 'origin-right'
    case 'right':
    case 'rightTop':
    case 'rightBottom':
      return 'origin-left'
    case 'bottom':
    case 'bottomLeft':
    case 'bottomRight':
    default:
      return 'origin-top'
  }
}

/** 解析 Arrow Class Name 的内部工具函数。 */
const resolveArrowClassName = (placement: PopoverPlacement, pointAtCenter: boolean) => {
  const layout = resolvePlacementLayout(placement)
  if (layout.direction === 'top') {
    return mergeClassNames(
      'bottom-[-6px] border-r border-b',
      pointAtCenter || layout.align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : layout.align === 'end'
          ? 'right-5'
          : 'left-5',
    )
  }

  if (layout.direction === 'bottom') {
    return mergeClassNames(
      'top-[-6px] border-l border-t',
      pointAtCenter || layout.align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : layout.align === 'end'
          ? 'right-5'
          : 'left-5',
    )
  }

  if (layout.direction === 'left') {
    return mergeClassNames(
      'right-[-6px] border-r border-t',
      pointAtCenter || layout.align === 'center'
        ? 'top-1/2 -translate-y-1/2'
        : layout.align === 'end'
          ? 'bottom-5'
          : 'top-5',
    )
  }

  return mergeClassNames(
    'left-[-6px] border-l border-b',
    pointAtCenter || layout.align === 'center'
      ? 'top-1/2 -translate-y-1/2'
      : layout.align === 'end'
        ? 'bottom-5'
        : 'top-5',
  )
}

/** 渲染 Root 的内部工具函数。 */

/** Root 的内部工具函数。 */
const Root: FC<PopoverProps> = (props, slots: Record<string, any> = {}) => {
  const {
    as = 'div',
    title,
    content,
    overlay,
    placement = 'top',
    trigger,
    open,
    defaultOpen,
    disabled,
    arrow = true,
    destroyOnHidden = false,
    mouseEnterDelay = 0.08,
    mouseLeaveDelay = 0.12,
    zIndex,
    className,
    style,
    triggerClassName,
    triggerStyle,
    overlayClassName,
    overlayStyle,
    classNames,
    styles,
    onOpenChange,
    children,
    ...rest
  } = props
  const Component = as as any
  const uncontrolledOpenRef = useRef(ref(defaultOpen ?? false))
  const currentOpenRef = useRef(ref(open ?? defaultOpen ?? false))
  const currentTriggersRef = useRef(ref(normalizeTrigger(trigger)))
  const uncontrolledOpen = uncontrolledOpenRef.current!
  const currentOpen = currentOpenRef.current!
  const currentTriggers = currentTriggersRef.current!
  const isControlled = open !== undefined
  let rootElement: HTMLElement | null = null
  let triggerElement: HTMLElement | null = null
  let overlayElement: HTMLElement | null = null
  let openTimer: ReturnType<typeof setTimeout> | null = null
  let closeTimer: ReturnType<typeof setTimeout> | null = null

  watch(
    () => props.open,
    nextOpen => {
      currentOpen.value = typeof nextOpen === 'boolean' ? nextOpen : uncontrolledOpen.value
    },
    { immediate: true },
  )

  watch(
    () => props.trigger,
    (nextTrigger: PopoverTrigger | PopoverTrigger[] | undefined) => {
      currentTriggers.value = normalizeTrigger(nextTrigger)
    },
    { immediate: true },
  )

  watch(
    () => props.defaultOpen,
    nextDefaultOpen => {
      if (!isControlled) {
        uncontrolledOpen.value = !!nextDefaultOpen
        currentOpen.value = !!nextDefaultOpen
      }
    },
    { immediate: true },
  )

  const clearTimers = () => {
    if (openTimer) {
      clearTimeout(openTimer)
      openTimer = null
    }
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
  }

  const getCurrentOpen = () => currentOpen.value

  const updateOpen = (nextOpen: boolean) => {
    if (disabled || !hasOverlay) return
    if (nextOpen === getCurrentOpen()) return
    currentOpen.value = nextOpen
    if (!isControlled) uncontrolledOpen.value = nextOpen
    if (typeof onOpenChange === 'function') {
      onOpenChange(nextOpen)
    }
  }

  const scheduleOpen = () => {
    if (!allowHover) return
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
    if (mouseEnterDelay <= 0) {
      updateOpen(true)
      return
    }
    if (openTimer) clearTimeout(openTimer)
    openTimer = setTimeout(() => {
      openTimer = null
      updateOpen(true)
    }, mouseEnterDelay * 1000)
  }

  const scheduleClose = () => {
    if (!allowHover) return
    if (openTimer) {
      clearTimeout(openTimer)
      openTimer = null
    }
    if (mouseLeaveDelay <= 0) {
      updateOpen(false)
      return
    }
    if (closeTimer) clearTimeout(closeTimer)
    closeTimer = setTimeout(() => {
      closeTimer = null
      updateOpen(false)
    }, mouseLeaveDelay * 1000)
  }

  const handleWindowClick = (event: MouseEvent) => {
    if (!getCurrentOpen()) return
    if (!(allowClick || allowContextMenu)) return
    if (rootElement?.contains(event.target as Node)) return
    updateOpen(false)
  }

  const handleWindowKeyDown = (event: KeyboardEvent) => {
    if (!getCurrentOpen() || event.key !== 'Escape') return
    updateOpen(false)
  }

  const handleNativeFocusIn = (_event: FocusEvent) => {
    if (!allowFocus) return
    updateOpen(true)
  }

  const handleNativeFocusOut = (event: FocusEvent) => {
    if (!allowFocus) return
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && rootElement?.contains(nextTarget)) return
    updateOpen(false)
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('click', handleWindowClick, true)
    window.addEventListener('keydown', handleWindowKeyDown)
    rootElement?.addEventListener('focusin', handleNativeFocusIn)
    rootElement?.addEventListener('focusout', handleNativeFocusOut)
  })

  onUnmounted(() => {
    clearTimers()
    rootElement?.removeEventListener('focusin', handleNativeFocusIn)
    rootElement?.removeEventListener('focusout', handleNativeFocusOut)
    if (typeof window === 'undefined') return
    window.removeEventListener('click', handleWindowClick, true)
    window.removeEventListener('keydown', handleWindowKeyDown)
  })

  const resolvedTitle = title
  const resolvedContent = content
  const resolvedOverlay = slots.overlay
  const hasStructuredOverlay = isRenderable(resolvedTitle) || isRenderable(resolvedContent)
  const hasOverlay = isRenderable(resolvedOverlay) || hasStructuredOverlay
  const allowHover = currentTriggers.value.includes('hover')
  const allowFocus = currentTriggers.value.includes('focus')
  const allowClick = currentTriggers.value.includes('click')
  const allowContextMenu = currentTriggers.value.includes('contextMenu')
  const showOverlay = hasOverlay
  const pointAtCenter = typeof arrow === 'object' && !!arrow.pointAtCenter
  const showArrow = arrow !== false
  const { onMouseEnter, onMouseLeave, onFocus, onBlur, onClick, onContextMenu, ...domProps } = rest

  const rootClassName = mergeClassNames(
    'relative inline-flex max-w-full align-top',
    classNames?.root,
    className,
  )
  const triggerClass = mergeClassNames(
    'inline-flex max-w-full items-stretch',
    classNames?.trigger,
    triggerClassName,
  )
  const overlayClasses = mergeClassNames(
    'absolute z-50 w-max max-w-[min(24rem,calc(100vw-2rem))] transform-gpu transition duration-150 ease-out',
    getOverlayPlacementClass(placement),
    getTransformOriginClass(placement),
    currentOpen.value
      ? 'pointer-events-auto visible opacity-100 scale-100'
      : 'pointer-events-none invisible opacity-0 scale-95',
    classNames?.overlay,
    overlayClassName,
  )
  const panelClassName = mergeClassNames(
    'relative min-w-64 overflow-hidden rounded-[1.15rem] border border-base-300/80 bg-base-100/95 shadow-[0_20px_48px_-28px_rgba(15,23,42,0.55)] backdrop-blur',
    classNames?.panel,
  )
  const arrowClassName = mergeClassNames(
    'absolute block h-3 w-3 rotate-45 border-base-300/80 bg-base-100/95',
    resolveArrowClassName(placement, pointAtCenter),
    classNames?.arrow,
  )
  const headerClassName = mergeClassNames(
    'border-b border-base-300/70 px-4 py-3',
    classNames?.header,
  )
  const titleClassName = mergeClassNames(
    'text-sm font-semibold tracking-[0.01em] text-base-content',
    classNames?.title,
  )
  const contentClassName = mergeClassNames(
    'px-4 py-3 text-sm leading-6 text-base-content/80',
    classNames?.content,
  )

  const rootStyle = mergeStyleValue(style, styles?.root)
  const triggerStyleValue = mergeStyleValue(triggerStyle, styles?.trigger)
  const mergedOverlayStyle = mergeStyles(styles?.overlay, overlayStyle)
  if (typeof zIndex === 'number') {
    mergedOverlayStyle.zIndex = zIndex
  }
  const overlayStyleValue = serializeStyle(mergedOverlayStyle) || undefined
  const panelStyleValue = serializeStyle(styles?.panel) || undefined
  const arrowStyleValue = serializeStyle(styles?.arrow) || undefined
  const headerStyleValue = serializeStyle(styles?.header) || undefined
  const titleStyleValue = serializeStyle(styles?.title) || undefined
  const contentStyleValue = serializeStyle(styles?.content) || undefined

  const OverlayContentView = () => (
    <>
      {slots.overlay ? (
        slots.overlay
      ) : (
        <div className={panelClassName} style={panelStyleValue} role="dialog" aria-modal="false">
          {isRenderable(resolvedTitle) ? (
            <div className={headerClassName} style={headerStyleValue}>
              <div className={titleClassName} style={titleStyleValue}>
                {String(resolvedTitle)}
              </div>
            </div>
          ) : null}
          {isRenderable(resolvedContent) ? (
            <div className={contentClassName} style={contentStyleValue}>
              {String(resolvedContent)}
            </div>
          ) : null}
        </div>
      )}
    </>
  )

  const setRootElement = (element: HTMLElement | null) => {
    rootElement = element
  }

  const handleRootMouseEnter = (event: any) => {
    callHandler(onMouseEnter, event)
    if (!event?.defaultPrevented) scheduleOpen()
  }

  const handleRootMouseLeave = (event: any) => {
    callHandler(onMouseLeave, event)
    if (!event?.defaultPrevented) scheduleClose()
  }

  const handleRootFocus = (event: any) => {
    callHandler(onFocus, event)
  }

  const handleRootBlur = (event: any) => {
    callHandler(onBlur, event)
  }

  const TriggerView = () => (
    <div
      className={triggerClass}
      style={triggerStyleValue}
      ref={(element: HTMLElement | null) => {
        triggerElement = element
      }}
      aria-haspopup={hasOverlay ? 'dialog' : undefined}
      aria-expanded={hasOverlay ? String(currentOpen.value) : undefined}
      onClick={(event: any) => {
        callHandler(onClick, event)
        if (!event?.defaultPrevented && allowClick) {
          clearTimers()
          updateOpen(!getCurrentOpen())
        }
      }}
      onContextMenu={(event: any) => {
        callHandler(onContextMenu, event)
        if (!event?.defaultPrevented && allowContextMenu) {
          if (typeof event.preventDefault === 'function') event.preventDefault()
          clearTimers()
          updateOpen(!getCurrentOpen())
        }
      }}
    >
      {children}
    </div>
  )

  const OverlayRootView = () =>
    showOverlay ? (
      <div
        className={overlayClasses}
        style={overlayStyleValue}
        ref={(element: HTMLElement | null) => {
          overlayElement = element
        }}
        aria-hidden={currentOpen.value ? 'false' : 'true'}
      >
        {showArrow ? <span className={arrowClassName} style={arrowStyleValue} /> : null}
        <OverlayContentView />
      </div>
    ) : (
      <></>
    )

  return as === 'span' ? (
    <span
      {...domProps}
      className={rootClassName}
      style={rootStyle}
      ref={setRootElement}
      onMouseEnter={handleRootMouseEnter}
      onMouseLeave={handleRootMouseLeave}
      onFocus={handleRootFocus}
      onBlur={handleRootBlur}
    >
      <TriggerView />
      <OverlayRootView />
    </span>
  ) : (
    <div
      {...domProps}
      className={rootClassName}
      style={rootStyle}
      ref={setRootElement}
      onMouseEnter={handleRootMouseEnter}
      onMouseLeave={handleRootMouseLeave}
      onFocus={handleRootFocus}
      onBlur={handleRootBlur}
    >
      <TriggerView />
      <OverlayRootView />
    </div>
  )
}

/** 默认导出气泡卡片组件。 */
export default Root
