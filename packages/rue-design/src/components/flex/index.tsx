/*
Flex 组件概述
- 提供常见 Flex 容器语义：方向、对齐、换行、间距与 flex 简写。
- 保留 Rue 的轻量组合方式：不额外包裹子节点，继续支持 className 与 style 直出。
- 同时兼容 as 与 component 两套根节点声明，便于延续现有 Rue 组件书写习惯。
*/
import type { FC } from '@rue-js/rue'

/** FlexOrientation 类型。 */
export type FlexOrientation = 'horizontal' | 'vertical'
/** FlexGapPreset 类型。 */
export type FlexGapPreset = 'small' | 'middle' | 'medium' | 'large'
/** FlexWrap 类型。 */
export type FlexWrap = boolean | 'nowrap' | 'wrap' | 'wrap-reverse'
/** FlexJustify 对齐方式类型。 */
export type FlexJustify =
  | 'start'
  | 'end'
  | 'center'
  | 'flex-start'
  | 'flex-end'
  | 'space-between'
  | 'between'
  | 'space-around'
  | 'around'
  | 'space-evenly'
  | 'evenly'
  | 'normal'
  | string

/** FlexAlign 对齐方式类型。 */
export type FlexAlign =
  | 'start'
  | 'end'
  | 'center'
  | 'stretch'
  | 'baseline'
  | 'top'
  | 'middle'
  | 'bottom'
  | 'flex-start'
  | 'flex-end'
  | 'normal'
  | string

/** FlexProps 组件属性。 */
export interface FlexProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** component 配置项。 */
  component?: any
  /** vertical 配置项。 */
  vertical?: boolean
  /** orientation 配置项。 */
  orientation?: FlexOrientation
  /** inline 配置项。 */
  inline?: boolean
  /** wrap 配置项。 */
  wrap?: FlexWrap
  /** 主轴分布方式。 */
  justify?: FlexJustify
  /** 交叉轴或内容对齐方式。 */
  align?: FlexAlign
  /** flex 配置项。 */
  flex?: number | string
  /** 元素间距。 */
  gap?: FlexGapPreset | number | string
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** GAP_PRESET_MAP 内部常量。 */
const GAP_PRESET_MAP: Record<FlexGapPreset, string> = {
  small: '8px',
  middle: '16px',
  medium: '16px',
  large: '24px',
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/**
 * orientation 优先级高于 vertical，保持显式属性优先。
 * 当两者都未传入时，默认沿用横向主轴。
 */
const resolveOrientation = (orientation?: FlexOrientation, vertical?: boolean): FlexOrientation => {
  if (orientation) return orientation
  return vertical ? 'vertical' : 'horizontal'
}

/** 解析 Wrap 的内部工具函数。 */
const resolveWrap = (wrap?: FlexWrap) => {
  if (wrap === undefined) return undefined
  if (wrap === true) return 'wrap'
  if (wrap === false) return 'nowrap'
  return wrap
}

/** 解析 Gap 的内部工具函数。 */
const resolveGap = (gap?: FlexProps['gap']) => {
  if (gap === undefined || gap === null || gap === '') return undefined
  if (typeof gap === 'number') return `${gap}px`
  if (gap in GAP_PRESET_MAP) {
    return GAP_PRESET_MAP[gap as FlexGapPreset]
  }
  return gap
}

/** 解析 Justify 的内部工具函数。 */
const resolveJustify = (justify?: FlexJustify) => {
  switch (justify) {
    case 'start':
      return 'flex-start'
    case 'end':
      return 'flex-end'
    case 'between':
      return 'space-between'
    case 'around':
      return 'space-around'
    case 'evenly':
      return 'space-evenly'
    default:
      return justify
  }
}

/** 解析 Align 的内部工具函数。 */
const resolveAlign = (align?: FlexAlign, orientation?: FlexOrientation) => {
  if (align === undefined) {
    return orientation === 'vertical' ? 'stretch' : 'flex-start'
  }

  switch (align) {
    case 'start':
    case 'top':
      return 'flex-start'
    case 'end':
    case 'bottom':
      return 'flex-end'
    case 'middle':
      return 'center'
    default:
      return align
  }
}

/** Flex 的内部工具函数。 */
const Flex: FC<FlexProps> = ({
  as,
  component,
  vertical,
  orientation,
  inline,
  wrap,
  justify,
  align,
  flex,
  gap,
  className,
  style,
  children,
  ...rest
}) => {
  const Component = (component ?? as ?? 'div') as any
  const resolvedOrientation = resolveOrientation(orientation, vertical)
  const resolvedWrap = resolveWrap(wrap)
  const resolvedGap = resolveGap(gap)
  const mergedStyle: Record<string, any> = {
    ...style,
    display: inline ? 'inline-flex' : 'flex',
    flexDirection: resolvedOrientation === 'vertical' ? 'column' : 'row',
    alignItems: resolveAlign(align, resolvedOrientation),
  }

  if (resolvedWrap !== undefined) mergedStyle.flexWrap = resolvedWrap
  if (justify !== undefined) mergedStyle.justifyContent = resolveJustify(justify)
  if (flex !== undefined && flex !== null) mergedStyle.flex = flex
  if (resolvedGap !== undefined) mergedStyle.gap = resolvedGap

  return Component === 'section' ? (
    <section
      {...rest}
      className={mergeClassName('rue-flex', className)}
      style={mergedStyle}
      data-rue-orientation={resolvedOrientation}
    >
      {children}
    </section>
  ) : Component === 'div' ? (
    <div
      {...rest}
      className={mergeClassName('rue-flex', className)}
      style={mergedStyle}
      data-rue-orientation={resolvedOrientation}
    >
      {children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={mergeClassName('rue-flex', className)}
      style={mergedStyle}
      data-rue-orientation={resolvedOrientation}
    >
      {children}
    </span>
  ) : (
    <></>
  )
}

/** 默认导出弹性布局组件。 */
export default Flex
