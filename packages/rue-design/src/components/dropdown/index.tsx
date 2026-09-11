/*
Dropdown 组件概述
- 保留 Rue 当前的 daisyUI 原生结构能力：details / popover / focus 三类写法继续可用。
- 同时补齐更接近成熟组件库的增强 API：menu/items、trigger、open/defaultOpen、popupRender。
- 视觉仍沿用 Rue 当前的 dropdown 基底，只做交互与组织能力增强。
*/
import { computed, onMounted, onUnmounted, ref, useRef, watch, type FC } from '@rue-js/rue'
import Menu from '../menu/index'
import type { MenuClickInfo, MenuDataEntry, MenuProps } from '../menu/index'

/** DropdownAlign 对齐方式类型。 */
export type DropdownAlign = 'start' | 'center' | 'end'
/** DropdownDirection 位置或方向类型。 */
export type DropdownDirection = 'top' | 'bottom' | 'left' | 'right'
/** DropdownPlacement 位置或方向类型。 */
export type DropdownPlacement =
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
/** DropdownTriggerMode 类型。 */
export type DropdownTriggerMode = 'hover' | 'click' | 'contextMenu'
/** DropdownOpenSource 类型。 */
export type DropdownOpenSource = 'trigger' | 'menu' | 'outside' | 'escape' | 'contextMenu'

/** DropdownMenuProps 组件属性。 */
export interface DropdownMenuProps extends Omit<MenuProps, 'children'> {}

/** DropdownOpenChangeInfo 接口。 */
export interface DropdownOpenChangeInfo {
  /** source 配置项。 */
  source: DropdownOpenSource
}

/** DropdownClassNames 局部类名配置。 */
export interface DropdownClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** trigger 区域配置。 */
  trigger?: string
  /** overlay 配置项。 */
  overlay?: string
  /** menu 配置项。 */
  menu?: string
}

/** DropdownStyles 局部样式配置。 */
export interface DropdownStyles {
  /** 根节点区域配置。 */
  root?: Record<string, any>
  /** overlay 配置项。 */
  overlay?: Record<string, any>
  /** menu 配置项。 */
  menu?: Record<string, any>
}

interface DropdownProps {
  as?: string
  align?: DropdownAlign
  direction?: DropdownDirection
  placement?: DropdownPlacement
  trigger?: DropdownTriggerMode | DropdownTriggerMode[]
  hover?: boolean
  open?: boolean
  defaultOpen?: boolean
  disabled?: boolean
  arrow?: boolean
  closeOnClick?: boolean
  forceOpen?: boolean
  forceClose?: boolean
  className?: string
  style?: string | Record<string, any>
  triggerClassName?: string
  overlay?: any
  content?: any
  popupRender?: (originNode: any) => any

  menu?: DropdownMenuProps
  items?: ReadonlyArray<MenuDataEntry>
  overlayClassName?: string
  overlayStyle?: Record<string, any>
  classNames?: DropdownClassNames
  styles?: DropdownStyles
  onOpenChange?: (open: boolean, info: DropdownOpenChangeInfo) => void
  children?: any
  [key: string]: any
}

interface DropdownContentProps {
  as?: string
  className?: string
  style?: string | Record<string, any>
  children?: any
  [key: string]: any
}

interface DropdownTriggerProps {
  as?: string
  className?: string
  style?: string | Record<string, any>
  children?: any
  [key: string]: any
}

interface OverlaySlotProps {
  className?: string
  style?: string
  arrow?: boolean
  arrowClassName?: string
  onClick?: (event: MouseEvent) => void
  setRef?: (element: HTMLElement | null) => void
  children?: any
}

interface EnhancedTriggerProps {
  className?: string
  expanded?: boolean
  disabled?: boolean
  hasMenu?: boolean
  onClick?: (event: MouseEvent) => void
  onContextMenu?: (event: MouseEvent) => void
  setRef?: (element: HTMLElement | null) => void
  children?: any
}

interface PlacementLayout {
  align?: DropdownAlign
  direction?: DropdownDirection
}

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...parts: Array<string | undefined | false>) => {
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
  return [baseStyle, extraStyle].filter(Boolean).join('; ')
}

/** 更新交互状态，由编译绑定同步视图。 */
const setRefValueQuietly = <T,>(target: { value: T }, value: T) => {
  target.value = value
}

/** 转换为 Child Array 的内部工具函数。 */

/** 判断 Renderable Node 的内部工具函数。 */

/** 判断 Renderable Node 是否来自指定组件的内部工具函数。 */

/** 归一化 Trigger 的内部工具函数。 */
const normalizeTrigger = (trigger?: DropdownTriggerMode | DropdownTriggerMode[]) => {
  const source = Array.isArray(trigger) ? trigger : trigger ? [trigger] : ['hover']
  return Array.from(new Set(source)) as DropdownTriggerMode[]
}

/** 解析 Placement Layout 的内部工具函数。 */
const resolvePlacementLayout = (placement?: DropdownPlacement): PlacementLayout => {
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

/** 读取 Overlay Offset Class 的内部工具函数。 */
const getOverlayOffsetClass = (direction?: DropdownDirection) => {
  switch (direction) {
    case 'top':
      return 'mb-2'
    case 'left':
      return 'me-2'
    case 'right':
      return 'ms-2'
    default:
      return 'mt-2'
  }
}

/** 读取 Arrow Class Name 的内部工具函数。 */
const getArrowClassName = (direction?: DropdownDirection, align?: DropdownAlign) => {
  switch (direction) {
    case 'top':
      return mergeClassNames(
        'bottom-[-5px]',
        align === 'start' ? 'left-4' : align === 'end' ? 'right-4' : 'left-1/2 -translate-x-1/2',
      )
    case 'left':
      return mergeClassNames(
        'right-[-5px]',
        align === 'start' ? 'top-4' : align === 'end' ? 'bottom-4' : 'top-1/2 -translate-y-1/2',
      )
    case 'right':
      return mergeClassNames(
        'left-[-5px]',
        align === 'start' ? 'top-4' : align === 'end' ? 'bottom-4' : 'top-1/2 -translate-y-1/2',
      )
    default:
      return mergeClassNames(
        'top-[-5px]',
        align === 'start' ? 'left-4' : align === 'end' ? 'right-4' : 'left-1/2 -translate-x-1/2',
      )
  }
}

const CONTEXT_MENU_VIEWPORT_PADDING = 8

/** 读取右键浮层在视口内的安全位置。 */
const getSafeContextOverlayPosition = (
  position: { x: number; y: number },
  overlayElement: HTMLElement,
) => {
  if (typeof window === 'undefined') return position
  const viewportWidth = window.innerWidth || document.documentElement?.clientWidth || 0
  const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0
  if (!viewportWidth || !viewportHeight) return position

  const rect = overlayElement.getBoundingClientRect()
  const overlayWidth = rect.width || overlayElement.offsetWidth
  const overlayHeight = rect.height || overlayElement.offsetHeight
  if (!overlayWidth || !overlayHeight) return position

  const minX = CONTEXT_MENU_VIEWPORT_PADDING
  const minY = CONTEXT_MENU_VIEWPORT_PADDING
  const maxX = Math.max(minX, viewportWidth - overlayWidth - CONTEXT_MENU_VIEWPORT_PADDING)
  const maxY = Math.max(minY, viewportHeight - overlayHeight - CONTEXT_MENU_VIEWPORT_PADDING)

  return {
    x: Math.min(Math.max(position.x, minX), maxX),
    y: Math.min(Math.max(position.y, minY), maxY),
  }
}

/** 读取右键浮层的固定定位样式。 */
const getContextOverlayStyle = (position: { x: number; y: number }) => ({
  position: 'fixed',
  inset: 'auto auto auto auto',
  left: `${position.x}px`,
  top: `${position.y}px`,
  margin: 0,
  scale: 1,
  translate: '0 0',
  transformOrigin: 'top left',
  transition: 'none',
  animation: 'none',
})

/** should Use Enhanced Mode 的内部工具函数。 */
const shouldUseEnhancedMode = ({
  placement,
  trigger,
  disabled,
  arrow: _arrow,
  triggerClassName,
  overlay,
  content,

  menu,
  items,
  overlayClassName,
  overlayStyle,
  classNames,
  styles,
  onOpenChange,
}: DropdownProps) => {
  return (
    placement !== undefined ||
    trigger !== undefined ||
    disabled !== undefined ||
    triggerClassName !== undefined ||
    overlay !== undefined ||
    content !== undefined ||
    menu !== undefined ||
    items !== undefined ||
    overlayClassName !== undefined ||
    overlayStyle !== undefined ||
    classNames !== undefined ||
    styles !== undefined ||
    onOpenChange !== undefined
  )
}

/** 渲染 As Component 的内部工具函数。 */

/** Content 的内部工具函数。 */
const Content: FC<DropdownContentProps> = ({
  as = 'div',
  className,
  style,
  children,
  ref: forwardedRef,
  ...rest
}) => {
  const Component = as as any
  const contentClassName = mergeClassNames('dropdown-content', className)
  const contentStyle = style ? serializeStyle(style) : undefined

  if (Component === 'span') {
    return (
      <span {...rest} ref={forwardedRef} className={contentClassName} style={contentStyle}>
        {children}
      </span>
    )
  }

  if (Component === 'section') {
    return (
      <section {...rest} ref={forwardedRef} className={contentClassName} style={contentStyle}>
        {children}
      </section>
    )
  }

  if (Component === 'article') {
    return (
      <article {...rest} ref={forwardedRef} className={contentClassName} style={contentStyle}>
        {children}
      </article>
    )
  }

  if (Component === 'details') {
    return (
      <details {...rest} ref={forwardedRef} className={contentClassName} style={contentStyle}>
        {children}
      </details>
    )
  }

  if (Component === 'ul') {
    return (
      <ul {...rest} ref={forwardedRef} className={contentClassName} style={contentStyle}>
        {children}
      </ul>
    )
  }

  if (Component === 'div') {
    return (
      <div {...rest} ref={forwardedRef} className={contentClassName} style={contentStyle}>
        {children}
      </div>
    )
  }

  return Component === 'div' ? (
    <div {...rest} ref={forwardedRef} className={contentClassName} style={contentStyle}>
      {children}
    </div>
  ) : Component === 'span' ? (
    <span {...rest} ref={forwardedRef} className={contentClassName} style={contentStyle}>
      {children}
    </span>
  ) : Component === 'section' ? (
    <section {...rest} ref={forwardedRef} className={contentClassName} style={contentStyle}>
      {children}
    </section>
  ) : Component === 'article' ? (
    <article {...rest} ref={forwardedRef} className={contentClassName} style={contentStyle}>
      {children}
    </article>
  ) : Component === 'details' ? (
    <details {...rest} ref={forwardedRef} className={contentClassName} style={contentStyle}>
      {children}
    </details>
  ) : Component === 'ul' ? (
    <ul {...rest} ref={forwardedRef} className={contentClassName} style={contentStyle}>
      {children}
    </ul>
  ) : Component === 'button' ? (
    <button {...rest} ref={forwardedRef} className={contentClassName} style={contentStyle}>
      {children}
    </button>
  ) : Component === 'li' ? (
    <li {...rest} ref={forwardedRef} className={contentClassName} style={contentStyle}>
      {children}
    </li>
  ) : (
    <></>
  )
}

/** Trigger 的内部工具函数。 */
const Trigger: FC<DropdownTriggerProps> = ({ as = 'div', className, style, children, ...rest }) => {
  const Component = as as any
  const triggerProps: Record<string, any> = {
    ...rest,
    className,
    style: style ? serializeStyle(style) : undefined,
  }

  if (as === 'div') {
    if (typeof triggerProps.tabIndex !== 'number') {
      triggerProps.tabIndex = 0
    }
    if (!triggerProps.role) {
      triggerProps.role = 'button'
    }
    const userOnKeyDown = triggerProps.onKeyDown
    triggerProps.onKeyDown = (event: KeyboardEvent) => {
      if (userOnKeyDown) userOnKeyDown(event)
      if (event.defaultPrevented) return
      if (
        (event.key === 'Enter' || event.key === ' ') &&
        event.currentTarget instanceof HTMLElement
      ) {
        if (typeof event.preventDefault === 'function') event.preventDefault()
        event.currentTarget.click()
      }
    }
  }

  return Component === 'button' ? (
    <button {...triggerProps}>{children}</button>
  ) : Component === 'summary' ? (
    <summary {...triggerProps}>{children}</summary>
  ) : Component === 'a' ? (
    <a {...triggerProps}>{children}</a>
  ) : (
    <div {...triggerProps}>{children}</div>
  )
}

/** OverlaySlot 的内部工具函数。 */

/** EnhancedTrigger 的内部工具函数。 */
const EnhancedTrigger: FC<EnhancedTriggerProps> = ({
  className,
  expanded,
  disabled,
  hasMenu,
  onClick,
  onContextMenu,
  setRef,
  children,
}) => {
  return (
    <div
      ref={setRef}
      className={className}
      aria-haspopup={hasMenu ? 'menu' : 'dialog'}
      aria-expanded={expanded ? 'true' : 'false'}
      aria-disabled={disabled ? 'true' : undefined}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {children}
    </div>
  )
}

/** Dropdown 的内部工具函数。 */
const Dropdown: FC<DropdownProps> = (
  {
    as = 'div',
    align,
    direction,
    placement,
    trigger,
    hover,
    open,
    defaultOpen,
    disabled,
    arrow,
    closeOnClick,
    forceOpen,
    forceClose,
    className,
    style,
    triggerClassName,
    overlay,
    content,

    menu,
    items,
    overlayClassName,
    overlayStyle,
    classNames,
    styles,
    onOpenChange,
    children,
    ...rest
  },
  slots: Record<string, any> = {},
) => {
  const Component = as as any
  const mergedArrow = arrow ?? false
  const mergedCloseOnClick = closeOnClick ?? true
  const placementLayout = resolvePlacementLayout(placement)
  const resolvedAlign = align ?? placementLayout.align
  const resolvedDirection = direction ?? placementLayout.direction
  const enhancedMode =
    as !== 'details' &&
    shouldUseEnhancedMode({
      as,
      align,
      direction,
      placement,
      trigger,
      hover,
      open,
      defaultOpen,
      disabled,
      arrow,
      closeOnClick,
      forceOpen,
      forceClose,
      className,
      style,
      triggerClassName,
      overlay,
      content,

      menu,
      items,
      overlayClassName,
      overlayStyle,
      classNames,
      styles,
      onOpenChange,
      children,
    })

  if (!enhancedMode) {
    let cls = 'dropdown'
    if (resolvedAlign) cls += ` dropdown-${resolvedAlign}`
    if (resolvedDirection) cls += ` dropdown-${resolvedDirection}`
    if (hover) cls += ' dropdown-hover'
    if (forceOpen) cls += ' dropdown-open'
    if (forceClose) cls += ' dropdown-close'
    if (className) cls += ` ${className}`

    const plainProps = { ...rest, className: cls, open: open === true ? true : undefined, style }
    return Component === 'details' ? (
      <details {...plainProps}>{children}</details>
    ) : Component === 'span' ? (
      <span {...plainProps}>{children}</span>
    ) : Component === 'section' ? (
      <section {...plainProps}>{children}</section>
    ) : (
      <div {...plainProps}>{children}</div>
    )
  }

  const uncontrolledOpen = ref(defaultOpen ?? false)
  const currentOpen = ref(open ?? defaultOpen ?? false)
  const currentTriggers = ref(normalizeTrigger(trigger))
  const contextPosition = ref<{ x: number; y: number } | null>(null)
  const menuConfig = computed<DropdownMenuProps | undefined>(() =>
    menu || items
      ? {
          ...menu,
          items: items ?? menu?.items,
        }
      : undefined,
  )

  let rootElement: HTMLElement | null = null
  let triggerElement: HTMLElement | null = null
  let overlayElement: HTMLElement | null = null
  const isControlled = open !== undefined

  const hasElementDom = (element: HTMLElement | null): element is HTMLElement =>
    !!element && typeof element.setAttribute === 'function'

  const syncOverlayDom = (visible = currentOpen.value || !!forceOpen) => {
    if (!hasElementDom(overlayElement) || !overlayElement.style) return
    if (
      typeof overlayElement.style.setProperty !== 'function' ||
      typeof overlayElement.style.removeProperty !== 'function'
    ) {
      return
    }
    if (visible && contextPosition.value) {
      const safePosition = getSafeContextOverlayPosition(contextPosition.value, overlayElement)
      overlayElement.style.position = 'fixed'
      overlayElement.style.inset = 'auto auto auto auto'
      overlayElement.style.left = `${safePosition.x}px`
      overlayElement.style.top = `${safePosition.y}px`
      overlayElement.style.margin = '0'
      overlayElement.style.setProperty('scale', '1')
      overlayElement.style.setProperty('translate', '0 0')
      overlayElement.style.transformOrigin = 'top left'
      overlayElement.style.transition = 'none'
      overlayElement.style.animation = 'none'
      return
    }
    overlayElement.style.position = ''
    overlayElement.style.inset = ''
    overlayElement.style.left = ''
    overlayElement.style.top = ''
    overlayElement.style.margin = ''
    overlayElement.style.removeProperty('scale')
    overlayElement.style.removeProperty('translate')
    overlayElement.style.transformOrigin = ''
    overlayElement.style.transition = ''
    overlayElement.style.animation = ''
  }

  const syncDropdownDom = (nextOpen: boolean) => {
    const nextVisible = !!forceOpen || nextOpen
    syncOverlayDom(nextVisible)
  }

  const requestOpenChange = (nextOpen: boolean, source: DropdownOpenSource) => {
    if (disabled) return
    if (currentOpen.value === nextOpen) {
      if (source === 'contextMenu' && nextOpen) {
        syncDropdownDom(nextOpen)
        if (onOpenChange) onOpenChange(nextOpen, { source })
      }
      return
    }
    if (!isControlled) setRefValueQuietly(uncontrolledOpen, nextOpen)
    setRefValueQuietly(currentOpen, nextOpen)
    if (!nextOpen) setRefValueQuietly(contextPosition, null)
    syncDropdownDom(nextOpen)
    if (onOpenChange) onOpenChange(nextOpen, { source })
  }

  watch(
    () => open,
    nextOpen => {
      if (typeof nextOpen === 'boolean') {
        setRefValueQuietly(currentOpen, nextOpen)
        if (!nextOpen) setRefValueQuietly(contextPosition, null)
        syncDropdownDom(nextOpen)
      } else {
        setRefValueQuietly(currentOpen, uncontrolledOpen.value)
        syncDropdownDom(uncontrolledOpen.value)
      }
    },
    { immediate: true },
  )

  watch(
    () => defaultOpen,
    nextDefaultOpen => {
      if (!isControlled) {
        setRefValueQuietly(uncontrolledOpen, !!nextDefaultOpen)
        setRefValueQuietly(currentOpen, !!nextDefaultOpen)
        syncDropdownDom(!!nextDefaultOpen)
      }
    },
    { immediate: true },
  )

  watch(
    () => trigger,
    (nextTrigger: DropdownProps['trigger']) => {
      currentTriggers.value = normalizeTrigger(nextTrigger)
    },
    { immediate: true },
  )

  onMounted(() => {
    if (typeof window === 'undefined') return

    const handleWindowClick = (event: MouseEvent) => {
      if (!currentOpen.value) return
      const allowOutsideClose =
        currentTriggers.value.includes('click') || currentTriggers.value.includes('contextMenu')
      if (!allowOutsideClose) return
      if (rootElement?.contains(event.target as Node)) return
      requestOpenChange(false, 'outside')
    }

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (!currentOpen.value || event.key !== 'Escape') return
      requestOpenChange(false, 'escape')
    }

    window.addEventListener('click', handleWindowClick, true)
    window.addEventListener('keydown', handleWindowKeyDown)

    onUnmounted(() => {
      window.removeEventListener('click', handleWindowClick, true)
      window.removeEventListener('keydown', handleWindowKeyDown)
    })
  })

  const allowHover = currentTriggers.value.includes('hover')
  const allowClick = currentTriggers.value.includes('click')
  const allowContextMenu = currentTriggers.value.includes('contextMenu')
  const hasOverlay =
    slots.overlay ||
    (menuConfig.get()?.items?.length ?? 0) > 0 ||
    (overlay !== undefined && overlay !== null && overlay !== false) ||
    (content !== undefined && content !== null && content !== false)

  const getRootClassName = () => {
    let cls = 'dropdown'
    if (resolvedAlign) cls += ` dropdown-${resolvedAlign}`
    if (resolvedDirection) cls += ` dropdown-${resolvedDirection}`
    if (hover) cls += ' dropdown-hover'
    if (currentOpen.value || forceOpen) cls += ' dropdown-open'
    if (forceClose) cls += ' dropdown-close'
    if (classNames?.root) cls += ` ${classNames.root}`
    if (className) cls += ` ${className}`
    return cls
  }

  const rootStyle = mergeStyleValue(style, styles?.root) || undefined
  const contextOverlayStyle = contextPosition.value
    ? getContextOverlayStyle(contextPosition.value)
    : undefined
  const overlayStyleValue =
    mergeStyleValue(
      slots.overlay ? undefined : mergeStyles(styles?.overlay, overlayStyle, contextOverlayStyle),
      undefined,
    ) || undefined

  const overlayClass = mergeClassNames(
    slots.overlay
      ? getOverlayOffsetClass(resolvedDirection)
      : mergeClassNames(
          'z-30 min-w-56 rounded-box border border-base-300/60 bg-base-100 shadow-lg',
          getOverlayOffsetClass(resolvedDirection),
          (menuConfig.get()?.items?.length ?? 0) > 0 ? 'p-1' : 'p-0',
        ),
    classNames?.overlay,
    overlayClassName,
  )

  const { onMouseEnter, onMouseLeave, onKeyDown, ...domProps } = rest
  const setOverlayElement = (element: HTMLElement | null) => {
    overlayElement = element
    syncOverlayDom()
  }
  const closeFromMenu = () => requestOpenChange(false, 'menu')
  const handleOverlayContentClick = (event: MouseEvent) => {
    if (!menuConfig.get()?.items?.length || !mergedCloseOnClick) return
    const clickable = (event.target as HTMLElement | null)?.closest?.('a,button,[role="menuitem"]')
    if (!clickable) return
    const parentLi = clickable.closest('li')
    const hasNestedSubmenu =
      !!parentLi && Array.from(parentLi.children).some(child => child.tagName === 'UL')
    if (!hasNestedSubmenu) {
      requestOpenChange(false, 'menu')
    }
  }
  const overlayPatchedStyle = mergeStyles(overlayStyle, styles?.overlay, contextOverlayStyle)
  const RenderOverlaySourceNode = () => {
    if ((menuConfig.get()?.items?.length ?? 0) > 0) {
      return (
        <Menu
          {...menuConfig.get()}
          items={menuConfig.get()?.items}
          selectable={menuConfig.get()?.selectable ?? false}
          triggerSubMenuAction={menuConfig.get()?.triggerSubMenuAction ?? 'click'}
          className={mergeClassNames(
            'w-full min-w-56 rounded-box bg-transparent p-0',
            classNames?.menu,
            menuConfig.get()?.className,
          )}
          style={mergeStyleValue(menuConfig.get()?.style, styles?.menu) || undefined}
          onClick={(info: MenuClickInfo) => {
            menuConfig.get()?.onClick?.(info)
            if (mergedCloseOnClick) closeFromMenu()
          }}
        />
      )
    }

    return slots.overlay ? <>{slots.overlay}</> : <>{String(overlay ?? content ?? '')}</>
  }
  const RenderOverlayNode = () => (
    <div
      ref={setOverlayElement}
      className={mergeClassNames('dropdown-content', overlayClass)}
      style={overlayStyleValue}
      onClick={handleOverlayContentClick}
    >
      {mergedArrow ? (
        <span
          aria-hidden="true"
          className={mergeClassNames(
            'pointer-events-none absolute z-[-1] h-2.5 w-2.5 rotate-45 border border-base-300/60 bg-base-100',
            getArrowClassName(resolvedDirection, resolvedAlign),
          )}
        />
      ) : null}
      <RenderOverlaySourceNode />
    </div>
  )
  const setRootElement = (element: HTMLElement | null) => {
    rootElement = element
    syncDropdownDom(currentOpen.value)
  }
  const handleRootMouseEnter = (event: MouseEvent) => {
    if (allowHover) requestOpenChange(true, 'trigger')
    if (onMouseEnter) onMouseEnter(event)
  }
  const handleRootMouseLeave = (event: MouseEvent) => {
    if (allowHover) requestOpenChange(false, 'outside')
    if (onMouseLeave) onMouseLeave(event)
  }
  const handleRootKeyDown = (event: KeyboardEvent) => {
    if (onKeyDown) onKeyDown(event)
    if (!event.defaultPrevented && event.key === 'Escape' && currentOpen.value) {
      requestOpenChange(false, 'escape')
    }
  }
  const RenderTriggerNode = () => {
    return (
      <EnhancedTrigger
        setRef={(element: HTMLElement | null) => {
          triggerElement = element
          if (element) {
            element.setAttribute('aria-expanded', currentOpen.value ? 'true' : 'false')
          }
        }}
        className={mergeClassNames('inline-flex', classNames?.trigger, triggerClassName)}
        hasMenu={!!menuConfig.get()?.items?.length}
        expanded={currentOpen.value}
        disabled={disabled}
        onClick={(_event: MouseEvent) => {
          if (!allowClick) return
          requestOpenChange(!currentOpen.value, 'trigger')
        }}
        onContextMenu={(event: MouseEvent) => {
          if (!allowContextMenu) return
          if (typeof event.preventDefault === 'function') event.preventDefault()
          setRefValueQuietly(contextPosition, {
            x: (event as any).clientX ?? 0,
            y: (event as any).clientY ?? 0,
          })
          requestOpenChange(true, 'contextMenu')
        }}
      >
        {children}
      </EnhancedTrigger>
    )
  }

  if (Component === 'span') {
    return (
      <span
        {...domProps}
        ref={setRootElement}
        className={getRootClassName()}
        style={rootStyle}
        onMouseEnter={handleRootMouseEnter}
        onMouseLeave={handleRootMouseLeave}
        onKeyDown={handleRootKeyDown}
      >
        <RenderTriggerNode />
        {hasOverlay ? <RenderOverlayNode /> : null}
      </span>
    )
  }

  if (Component === 'section') {
    return (
      <section
        {...domProps}
        ref={setRootElement}
        className={getRootClassName()}
        style={rootStyle}
        onMouseEnter={handleRootMouseEnter}
        onMouseLeave={handleRootMouseLeave}
        onKeyDown={handleRootKeyDown}
      >
        <RenderTriggerNode />
        {hasOverlay ? <RenderOverlayNode /> : null}
      </section>
    )
  }

  if (Component === 'article') {
    return (
      <article
        {...domProps}
        ref={setRootElement}
        className={getRootClassName()}
        style={rootStyle}
        onMouseEnter={handleRootMouseEnter}
        onMouseLeave={handleRootMouseLeave}
        onKeyDown={handleRootKeyDown}
      >
        <RenderTriggerNode />
        {hasOverlay ? <RenderOverlayNode /> : null}
      </article>
    )
  }

  if (Component === 'details') {
    return (
      <details
        {...domProps}
        ref={setRootElement}
        className={getRootClassName()}
        style={rootStyle}
        onMouseEnter={handleRootMouseEnter}
        onMouseLeave={handleRootMouseLeave}
        onKeyDown={handleRootKeyDown}
      >
        <RenderTriggerNode />
        {hasOverlay ? <RenderOverlayNode /> : null}
      </details>
    )
  }

  if (Component === 'ul') {
    return (
      <ul
        {...domProps}
        ref={setRootElement}
        className={getRootClassName()}
        style={rootStyle}
        onMouseEnter={handleRootMouseEnter}
        onMouseLeave={handleRootMouseLeave}
        onKeyDown={handleRootKeyDown}
      >
        <RenderTriggerNode />
        {hasOverlay ? <RenderOverlayNode /> : null}
      </ul>
    )
  }

  if (Component === 'div') {
    return (
      <div
        {...domProps}
        ref={setRootElement}
        className={getRootClassName()}
        style={rootStyle}
        onMouseEnter={handleRootMouseEnter}
        onMouseLeave={handleRootMouseLeave}
        onKeyDown={handleRootKeyDown}
      >
        <RenderTriggerNode />
        {hasOverlay ? <RenderOverlayNode /> : null}
      </div>
    )
  }

  return Component === 'div' ? (
    <div
      {...domProps}
      ref={setRootElement}
      className={getRootClassName()}
      style={rootStyle}
      onMouseEnter={handleRootMouseEnter}
      onMouseLeave={handleRootMouseLeave}
      onKeyDown={handleRootKeyDown}
    >
      <RenderTriggerNode />
      {hasOverlay ? <RenderOverlayNode /> : null}
    </div>
  ) : Component === 'span' ? (
    <span
      {...domProps}
      ref={setRootElement}
      className={getRootClassName()}
      style={rootStyle}
      onMouseEnter={handleRootMouseEnter}
      onMouseLeave={handleRootMouseLeave}
      onKeyDown={handleRootKeyDown}
    >
      <RenderTriggerNode />
      {hasOverlay ? <RenderOverlayNode /> : null}
    </span>
  ) : Component === 'section' ? (
    <section
      {...domProps}
      ref={setRootElement}
      className={getRootClassName()}
      style={rootStyle}
      onMouseEnter={handleRootMouseEnter}
      onMouseLeave={handleRootMouseLeave}
      onKeyDown={handleRootKeyDown}
    >
      <RenderTriggerNode />
      {hasOverlay ? <RenderOverlayNode /> : null}
    </section>
  ) : Component === 'article' ? (
    <article
      {...domProps}
      ref={setRootElement}
      className={getRootClassName()}
      style={rootStyle}
      onMouseEnter={handleRootMouseEnter}
      onMouseLeave={handleRootMouseLeave}
      onKeyDown={handleRootKeyDown}
    >
      <RenderTriggerNode />
      {hasOverlay ? <RenderOverlayNode /> : null}
    </article>
  ) : Component === 'details' ? (
    <details
      {...domProps}
      ref={setRootElement}
      className={getRootClassName()}
      style={rootStyle}
      onMouseEnter={handleRootMouseEnter}
      onMouseLeave={handleRootMouseLeave}
      onKeyDown={handleRootKeyDown}
    >
      <RenderTriggerNode />
      {hasOverlay ? <RenderOverlayNode /> : null}
    </details>
  ) : Component === 'ul' ? (
    <ul
      {...domProps}
      ref={setRootElement}
      className={getRootClassName()}
      style={rootStyle}
      onMouseEnter={handleRootMouseEnter}
      onMouseLeave={handleRootMouseLeave}
      onKeyDown={handleRootKeyDown}
    >
      <RenderTriggerNode />
      {hasOverlay ? <RenderOverlayNode /> : null}
    </ul>
  ) : Component === 'button' ? (
    <button
      {...domProps}
      ref={setRootElement}
      className={getRootClassName()}
      style={rootStyle}
      onMouseEnter={handleRootMouseEnter}
      onMouseLeave={handleRootMouseLeave}
      onKeyDown={handleRootKeyDown}
    >
      <RenderTriggerNode />
      {hasOverlay ? <RenderOverlayNode /> : null}
    </button>
  ) : Component === 'li' ? (
    <li
      {...domProps}
      ref={setRootElement}
      className={getRootClassName()}
      style={rootStyle}
      onMouseEnter={handleRootMouseEnter}
      onMouseLeave={handleRootMouseLeave}
      onKeyDown={handleRootKeyDown}
    >
      <RenderTriggerNode />
      {hasOverlay ? <RenderOverlayNode /> : null}
    </li>
  ) : (
    <></>
  )
}

type DropdownCompound = FC<DropdownProps> & {
  Trigger: FC<DropdownTriggerProps>
  Content: FC<DropdownContentProps>
}

const DropdownCompound: DropdownCompound = /*#__PURE__*/ Object.assign(Dropdown, {
  Trigger,
  Content,
})

/** 默认导出下拉菜单组件。 */
export default DropdownCompound
