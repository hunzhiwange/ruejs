/*
Divider 组件概述
- 保留 Rue 现有的 daisyUI 视觉基础。
- 在兼容旧版 direction / placement / variant(颜色) 的同时，补充常用能力。
*/
import type { FC } from '@rue-js/rue'

/** DividerTone 语义色类型。 */
export type DividerTone =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'info'
  | 'error'

/** DividerLegacyDirection 位置或方向类型。 */
export type DividerLegacyDirection = 'vertical' | 'horizontal'
/** DividerOrientation 类型。 */
export type DividerOrientation = 'horizontal' | 'vertical'
/** DividerTitlePlacement 位置或方向类型。 */
export type DividerTitlePlacement = 'start' | 'end' | 'center'
/** DividerPlacement 位置或方向类型。 */
export type DividerPlacement = 'start' | 'end'
/** DividerLineVariant 视觉或语义变体类型。 */
export type DividerLineVariant = 'solid' | 'dashed' | 'dotted'
/** DividerVariant 视觉或语义变体类型。 */
export type DividerVariant = DividerTone | DividerLineVariant

/** DividerProps 组件属性。 */
export interface DividerProps {
  /** 组件语义色。 */
  color?: DividerTone
  /** 组件视觉变体。 */
  variant?: DividerVariant
  /** lineVariant 配置项。 */
  lineVariant?: DividerLineVariant
  /** 布局方向。 */
  direction?: DividerLegacyDirection
  /** orientation 配置项。 */
  orientation?: DividerOrientation
  /** 组件类型或语义类型。 */
  type?: DividerOrientation
  /** vertical 配置项。 */
  vertical?: boolean
  /** 弹出层或内容展示位置。 */
  placement?: DividerPlacement
  /** titlePlacement 配置项。 */
  titlePlacement?: DividerTitlePlacement
  /** orientationMargin 配置项。 */
  orientationMargin?: string | number
  /** dashed 配置项。 */
  dashed?: boolean
  /** plain 配置项。 */
  plain?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** contentStyle 内联样式。 */
  contentStyle?: Record<string, any>
  /** 组件子内容。 */
  content?: string | number
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** 判断 Tone 的内部工具函数。 */
const isTone = (value?: string): value is DividerTone => {
  return (
    value === 'neutral' ||
    value === 'primary' ||
    value === 'secondary' ||
    value === 'accent' ||
    value === 'success' ||
    value === 'warning' ||
    value === 'info' ||
    value === 'error'
  )
}

/** 判断 Line Variant 的内部工具函数。 */
const isLineVariant = (value?: string): value is DividerLineVariant => {
  return value === 'solid' || value === 'dashed' || value === 'dotted'
}

/** 归一化 Spacing Value 的内部工具函数。 */
const normalizeSpacingValue = (value?: string | number) => {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return undefined
  return /^\d+(\.\d+)?$/.test(value) ? Number(value) : value
}

/** 解析 Legacy Direction Class 的内部工具函数。 */
const resolveLegacyDirectionClass = (direction?: DividerLegacyDirection) => {
  if (!direction || direction === 'vertical') return undefined
  return 'divider-horizontal'
}

/** 解析 Orientation Class 的内部工具函数。 */
const resolveOrientationClass = (
  orientation?: DividerOrientation,
  vertical?: boolean,
  type?: DividerOrientation,
) => {
  const resolved = orientation ?? type ?? (vertical ? 'vertical' : 'horizontal')
  return resolved === 'vertical' ? 'divider-horizontal' : undefined
}

/** Divider 的内部工具函数。 */
const Divider: FC<DividerProps> = ({
  color,
  variant,
  lineVariant,
  direction,
  orientation,
  type,
  vertical,
  placement,
  titlePlacement,
  orientationMargin,
  dashed,
  plain,
  className,
  contentClassName,
  style,
  contentStyle,
  children,
  content,
  ...rest
}) => {
  const resolvedTone = color ?? (isTone(variant) ? variant : undefined)
  const resolvedLineVariant =
    lineVariant ?? (isLineVariant(variant) ? variant : undefined) ?? (dashed ? 'dashed' : 'solid')
  const resolvedPlacement = titlePlacement ?? placement
  const orientationClass =
    orientation || type || vertical
      ? resolveOrientationClass(orientation, vertical, type)
      : resolveLegacyDirectionClass(direction)
  const isVerticalSeparator =
    (orientation ?? type ?? (vertical ? 'vertical' : 'horizontal')) === 'vertical'
  const contentMargin = normalizeSpacingValue(orientationMargin)
  const hasContent =
    !isVerticalSeparator &&
    (content !== undefined ? String(content).trim().length > 0 : children != null)

  let cls = 'divider'
  if (orientationClass) cls += ` ${orientationClass}`
  if (resolvedTone) cls += ` divider-${resolvedTone}`
  if (resolvedPlacement && resolvedPlacement !== 'center') cls += ` divider-${resolvedPlacement}`
  if (resolvedLineVariant === 'dashed') cls += ' before:border-dashed after:border-dashed'
  if (resolvedLineVariant === 'dotted') cls += ' before:border-dotted after:border-dotted'
  if (!hasContent) cls += ' gap-0'
  if (className) cls += ` ${className}`

  let textCls = 'whitespace-nowrap'
  if (plain) textCls += ' font-normal opacity-80'
  if (contentClassName) textCls += ` ${contentClassName}`

  const textStyle =
    resolvedPlacement === 'start'
      ? { marginInlineStart: contentMargin, ...contentStyle }
      : resolvedPlacement === 'end'
        ? { marginInlineEnd: contentMargin, ...contentStyle }
        : contentStyle

  return (
    <div
      className={cls}
      style={style}
      role="separator"
      aria-orientation={isVerticalSeparator ? 'vertical' : 'horizontal'}
      {...rest}
    >
      {hasContent ? (
        <span className={textCls} style={textStyle}>
          {content !== undefined ? <span>{String(content)}</span> : children}
        </span>
      ) : null}
    </div>
  )
}

/** 默认导出分割线组件。 */
export default Divider
