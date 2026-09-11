/*
Tooltip 模块概述
- 汇总文字提示组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'

/** TooltipPresetColor 语义色类型。 */
export type TooltipPresetColor =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

/** TooltipColor 语义色类型。 */
export type TooltipColor = TooltipPresetColor | string

/** TooltipPlacement 位置或方向类型。 */
export type TooltipPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'
  | 'leftTop'
  | 'leftBottom'
  | 'rightTop'
  | 'rightBottom'

/** TooltipTrigger 类型。 */
export type TooltipTrigger = 'hover' | 'focus' | 'click' | 'contextMenu'

/** TooltipClassNames 局部类名配置。 */
export interface TooltipClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** 主体区域配置。 */
  body?: string
}

/** TooltipStyles 局部样式配置。 */
export interface TooltipStyles {
  /** 根节点区域配置。 */
  root?: Record<string, any>
  /** 主体区域配置。 */
  body?: Record<string, any>
}

/** TooltipProps 组件属性。 */
export interface TooltipProps {
  /** 自定义渲染的宿主元素。 */
  as?: string
  /** tip 配置项。 */
  tip?: string | number
  /** 标题内容。 */
  title?: any
  /** 主体内容。 */
  content?: any
  /** overlay 配置项。 */
  overlay?: any
  /** 弹出层或内容展示位置。 */
  placement?: TooltipPlacement
  /** 组件语义色。 */
  color?: TooltipColor
  /** 受控打开状态。 */
  open?: boolean
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** arrow 配置项。 */
  arrow?: boolean
  /** trigger 区域配置。 */
  trigger?: TooltipTrigger | TooltipTrigger[]
  /** openClassName 附加类名。 */
  openClassName?: string
  /** overlayClassName 附加类名。 */
  overlayClassName?: string
  /** overlayStyle 内联样式。 */
  overlayStyle?: Record<string, any>
  /** 按局部区域覆盖的类名集合。 */
  classNames?: TooltipClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: TooltipStyles
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** 打开状态变化时触发的回调。 */
  onOpenChange?: (open: boolean) => void
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** TooltipContentProps 组件属性。 */
export interface TooltipContentProps {
  /** 自定义渲染的宿主元素。 */
  as?: string
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** 转换为 Kebab Case 的内部工具函数。 */
const toKebabCase = (value: string) => value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)

/** PRESET_COLORS 内部常量。 */
const PRESET_COLORS: readonly TooltipPresetColor[] = [
  'neutral',
  'primary',
  'secondary',
  'accent',
  'info',
  'success',
  'warning',
  'error',
]

/** PLACEMENT_CLASS_MAP 内部常量。 */
const PLACEMENT_CLASS_MAP: Record<TooltipPlacement, 'top' | 'bottom' | 'left' | 'right'> = {
  top: 'top',
  bottom: 'bottom',
  left: 'left',
  right: 'right',
  topLeft: 'top',
  topRight: 'top',
  bottomLeft: 'bottom',
  bottomRight: 'bottom',
  leftTop: 'left',
  leftBottom: 'left',
  rightTop: 'right',
  rightBottom: 'right',
}

let tooltipIdSeed = 0

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

/** serialize Style 的内部工具函数。 */
const serializeStyle = (style?: string | Record<string, any>) => {
  if (!style) {
    return ''
  }
  if (typeof style === 'string') {
    return style.trim()
  }

  return Object.entries(style)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key.startsWith('--') ? key : toKebabCase(key)}:${String(value)}`)
    .join('; ')
}

/** 归一化 Trigger 的内部工具函数。 */
const normalizeTrigger = (trigger?: TooltipTrigger | TooltipTrigger[]) => {
  const source = Array.isArray(trigger) ? trigger : trigger ? [trigger] : ['hover', 'focus']
  return Array.from(new Set(source)) as TooltipTrigger[]
}

/** 判断 Preset Color 的内部工具函数。 */
const isPresetColor = (color?: TooltipColor): color is TooltipPresetColor => {
  return typeof color === 'string' && PRESET_COLORS.includes(color as TooltipPresetColor)
}

/** 判断 Primitive Tooltip Content 的内部工具函数。 */
const isPrimitiveTooltipContent = (value: any) => {
  return typeof value === 'string' || typeof value === 'number'
}

/** 解析 Tooltip Content 的内部工具函数。 */
const resolveTooltipContent = (overlay: any, title: any, content: any, tip: any) => {
  const candidate =
    overlay !== undefined
      ? overlay
      : title !== undefined
        ? title
        : content !== undefined
          ? content
          : tip
  return typeof candidate === 'function' ? candidate() : candidate
}

/** parse Hex Channel 的内部工具函数。 */
const parseHexChannel = (value: string) => Number.parseInt(value, 16)

/** 归一化 Rgb Channel 的内部工具函数。 */
const normalizeRgbChannel = (value: number) => {
  const ratio = value / 255
  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
}

/** 解析 Readable Text Color 的内部工具函数。 */
const resolveReadableTextColor = (color: string) => {
  const normalized = color.trim()
  let red = Number.NaN
  let green = Number.NaN
  let blue = Number.NaN

  if (/^#([\da-f]{3}|[\da-f]{6})$/i.test(normalized)) {
    const hex = normalized.slice(1)
    if (hex.length === 3) {
      red = parseHexChannel(`${hex[0]}${hex[0]}`)
      green = parseHexChannel(`${hex[1]}${hex[1]}`)
      blue = parseHexChannel(`${hex[2]}${hex[2]}`)
    } else {
      red = parseHexChannel(hex.slice(0, 2))
      green = parseHexChannel(hex.slice(2, 4))
      blue = parseHexChannel(hex.slice(4, 6))
    }
  } else {
    const match = normalized.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
    if (match) {
      red = Number(match[1])
      green = Number(match[2])
      blue = Number(match[3])
    }
  }

  if ([red, green, blue].some(channel => Number.isNaN(channel))) {
    return 'var(--color-neutral-content)'
  }

  const luminance =
    0.2126 * normalizeRgbChannel(red) +
    0.7152 * normalizeRgbChannel(green) +
    0.0722 * normalizeRgbChannel(blue)

  return luminance > 0.45 ? '#111827' : '#f8fafc'
}

/** call Handler 的内部工具函数。 */
const callHandler = (handler: ((event: any) => void) | undefined, event: any) => {
  if (typeof handler === 'function') handler(event)
}

/** Content 的内部工具函数。 */
const Content: FC<TooltipContentProps> = ({ as = 'div', className, style, children, ...rest }) => {
  const Component = as as any
  const contentClassName = mergeClassNames('tooltip-content', className)

  if (as === 'span') {
    return (
      <span {...rest} className={contentClassName} style={style}>
        {children}
      </span>
    )
  }

  if (as === 'p') {
    return (
      <p {...rest} className={contentClassName} style={style}>
        {children}
      </p>
    )
  }

  if (as === 'section') {
    return (
      <section {...rest} className={contentClassName} style={style}>
        {children}
      </section>
    )
  }

  if (as === 'div') {
    return (
      <div {...rest} className={contentClassName} style={style}>
        {children}
      </div>
    )
  }

  return Component === 'div' ? (
    <div {...rest} className={contentClassName} style={style}>
      {children}
    </div>
  ) : Component === 'span' ? (
    <span {...rest} className={contentClassName} style={style}>
      {children}
    </span>
  ) : Component === 'p' ? (
    <p {...rest} className={contentClassName} style={style}>
      {children}
    </p>
  ) : Component === 'section' ? (
    <section {...rest} className={contentClassName} style={style}>
      {children}
    </section>
  ) : Component === 'label' ? (
    <label {...rest} className={contentClassName} style={style}>
      {children}
    </label>
  ) : Component === 'button' ? (
    <button {...rest} className={contentClassName} style={style}>
      {children}
    </button>
  ) : Component === 'article' ? (
    <article {...rest} className={contentClassName} style={style}>
      {children}
    </article>
  ) : (
    <></>
  )
}

/** Root 的内部工具函数。 */
const Root: FC<TooltipProps> = (
  {
    as = 'div',
    tip,
    title,
    content,
    overlay,
    placement = 'top',
    color,
    open,
    defaultOpen,
    disabled,
    arrow = true,
    trigger,
    openClassName,
    overlayClassName,
    overlayStyle,
    classNames,
    styles,
    className,
    style,
    onOpenChange,
    children,
    ...rest
  },
  slots: Record<string, any> = {},
) => {
  const Component = as as any
  const bodyId = `rue-tooltip-${tooltipIdSeed++}`
  const uncontrolledOpen = ref(defaultOpen ?? false)
  let openIntent = defaultOpen ?? false
  const resolvedContent = resolveTooltipContent(overlay, title, content, tip)
  const hasContent =
    slots.content != null ||
    (resolvedContent !== undefined && resolvedContent !== null && resolvedContent !== false)
  const triggerList = normalizeTrigger(trigger)
  const allowHover = triggerList.includes('hover')
  const allowFocus = triggerList.includes('focus')
  const allowClick = triggerList.includes('click')
  const allowContextMenu = triggerList.includes('contextMenu')
  const currentOpen = () => open ?? uncontrolledOpen.value
  const hasCustomColor = !!color && !isPresetColor(color)
  const bodyClassName = mergeClassNames(classNames?.body, overlayClassName)
  const bodyStyle = mergeStyles(styles?.body, overlayStyle)
  const useBodyNode =
    hasContent &&
    (slots.content != null ||
      hasCustomColor ||
      !isPrimitiveTooltipContent(resolvedContent) ||
      !!bodyClassName ||
      Object.keys(bodyStyle ?? {}).length > 0)
  const useDataTip = hasContent && !useBodyNode && isPrimitiveTooltipContent(resolvedContent)
  const manualOnly = !allowHover && !allowFocus
  const shouldForceHidden = () => !disabled && (open === false || (!currentOpen() && manualOnly))

  const updateOpen = (nextOpen: boolean) => {
    const latestOpen = open ?? openIntent
    if (disabled || nextOpen === latestOpen) return
    if (open === undefined) {
      openIntent = nextOpen
      uncontrolledOpen.value = nextOpen
    }
    if (onOpenChange) onOpenChange(nextOpen)
  }

  const rootStyle = mergeStyles(typeof style === 'string' ? undefined : style, styles?.root)
  const bodyFinalStyle = hasCustomColor
    ? mergeStyles(bodyStyle, {
        backgroundColor: color,
        color: resolveReadableTextColor(String(color)),
      })
    : mergeStyles(bodyStyle)

  const getRootClassName = () => {
    let rootClassName = disabled ? '' : 'tooltip'
    if (!disabled) {
      rootClassName = mergeClassNames(rootClassName, `tooltip-${PLACEMENT_CLASS_MAP[placement]}`)
      if (color && isPresetColor(color)) {
        rootClassName = mergeClassNames(rootClassName, `tooltip-${color}`)
      }
      if (currentOpen()) {
        rootClassName = mergeClassNames(rootClassName, 'tooltip-open', openClassName)
      }
      if (!arrow || hasCustomColor) {
        rootClassName = mergeClassNames(rootClassName, 'after:!hidden')
      }
      if (shouldForceHidden()) {
        rootClassName = mergeClassNames(
          rootClassName,
          'before:!opacity-0',
          'after:!opacity-0',
          '[&>.tooltip-content]:!opacity-0',
        )
      }
    }

    rootClassName = mergeClassNames(rootClassName, classNames?.root, className)

    return rootClassName
  }
  const { onMouseEnter, onMouseLeave, onFocus, onBlur, onClick, onContextMenu, ...domProps } = rest

  const rootProps = {
    ...domProps,
    className: getRootClassName() || undefined,
    style: serializeStyle(rootStyle),
    onMouseEnter: (event: any) => {
      callHandler(onMouseEnter, event)
      if (!event?.defaultPrevented && allowHover) updateOpen(true)
    },
    onMouseLeave: (event: any) => {
      callHandler(onMouseLeave, event)
      if (!event?.defaultPrevented && allowHover) updateOpen(false)
    },
    onFocus: (event: any) => {
      callHandler(onFocus, event)
      if (!event?.defaultPrevented && allowFocus) updateOpen(true)
    },
    onBlur: (event: any) => {
      callHandler(onBlur, event)
      if (!event?.defaultPrevented && allowFocus) updateOpen(false)
    },
    onClick: (event: any) => {
      callHandler(onClick, event)
      if (!event?.defaultPrevented && allowClick) {
        const nextOpen = !(open ?? openIntent)
        updateOpen(nextOpen)
        if (open === undefined) {
        }
      }
    },
    onContextMenu: (event: any) => {
      callHandler(onContextMenu, event)
      if (!event?.defaultPrevented && allowContextMenu) {
        if (typeof event?.preventDefault === 'function') event.preventDefault()
        const nextOpen = !(open ?? openIntent)
        updateOpen(nextOpen)
        if (open === undefined) {
        }
      }
    },
  } as Record<string, any>

  if (disabled || !useDataTip) {
    delete rootProps['data-tip']
  } else if (rootProps['data-tip'] === undefined) {
    rootProps['data-tip'] = String(resolvedContent)
  }

  if (useBodyNode && !disabled) {
    rootProps['aria-describedby'] = bodyId
  }

  const RenderOverlayBody = () => {
    if (!useBodyNode || disabled) return <></>

    return (
      <div
        id={bodyId}
        className={mergeClassNames('tooltip-content', bodyClassName)}
        style={Object.keys(bodyFinalStyle ?? {}).length > 0 ? bodyFinalStyle : undefined}
      >
        {slots.content ? slots.content : <span>{String(resolvedContent ?? '')}</span>}
      </div>
    )
  }

  if (as === 'span') {
    return (
      <span {...rootProps} className={getRootClassName()}>
        <RenderOverlayBody />
        {children}
      </span>
    )
  }

  if (as === 'label') {
    return (
      <label {...rootProps} className={getRootClassName()}>
        <RenderOverlayBody />
        {children}
      </label>
    )
  }

  if (as === 'button') {
    return (
      <button {...rootProps} className={getRootClassName()}>
        <RenderOverlayBody />
        {children}
      </button>
    )
  }

  if (as === 'section') {
    return (
      <section {...rootProps} className={getRootClassName()}>
        <RenderOverlayBody />
        {children}
      </section>
    )
  }

  if (as === 'article') {
    return (
      <article {...rootProps} className={getRootClassName()}>
        <RenderOverlayBody />
        {children}
      </article>
    )
  }

  if (as === 'div') {
    return (
      <div {...rootProps} className={getRootClassName()}>
        <RenderOverlayBody />
        {children}
      </div>
    )
  }

  return Component === 'div' ? (
    <div {...rootProps} className={getRootClassName()}>
      <RenderOverlayBody />
      {children}
    </div>
  ) : Component === 'span' ? (
    <span {...rootProps} className={getRootClassName()}>
      <RenderOverlayBody />
      {children}
    </span>
  ) : Component === 'p' ? (
    <p {...rootProps} className={getRootClassName()}>
      <RenderOverlayBody />
      {children}
    </p>
  ) : Component === 'section' ? (
    <section {...rootProps} className={getRootClassName()}>
      <RenderOverlayBody />
      {children}
    </section>
  ) : Component === 'label' ? (
    <label {...rootProps} className={getRootClassName()}>
      <RenderOverlayBody />
      {children}
    </label>
  ) : Component === 'button' ? (
    <button {...rootProps} className={getRootClassName()}>
      <RenderOverlayBody />
      {children}
    </button>
  ) : Component === 'article' ? (
    <article {...rootProps} className={getRootClassName()}>
      <RenderOverlayBody />
      {children}
    </article>
  ) : (
    <></>
  )
}

type TooltipCompound = FC<TooltipProps> & {
  Content: FC<TooltipContentProps>
}

const Tooltip: TooltipCompound = /*#__PURE__*/ Object.assign(Root, {
  Content,
})

/** 默认导出文字提示组件。 */
export default Tooltip
