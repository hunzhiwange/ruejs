/*
Indicator 组件概述
- 保留 Rue 当前 indicator / indicator-item 的轻量结构与视觉类名。
- 在复合写法之外，补充 placement、offset，以及根节点 item/items 快捷写法，减少常见角标布局的模板代码。
- horizontal / vertical 仍然直接可用，并且显式值优先于 placement 预设。
*/
import type { FC } from '@rue-js/rue'

/** IndicatorHorizontal 类型。 */
export type IndicatorHorizontal = 'start' | 'center' | 'end'
/** IndicatorVertical 类型。 */
export type IndicatorVertical = 'top' | 'middle' | 'bottom'
/** IndicatorPlacement 位置或方向类型。 */
export type IndicatorPlacement =
  | 'start'
  | 'center'
  | 'end'
  | 'top'
  | 'middle'
  | 'bottom'
  | 'top-start'
  | 'top-center'
  | 'top-end'
  | 'middle-start'
  | 'middle-center'
  | 'middle-end'
  | 'bottom-start'
  | 'bottom-center'
  | 'bottom-end'

/** IndicatorOffset 类型。 */
export type IndicatorOffset = [number | string, number | string]

/** IndicatorItemProps 组件属性。 */
export interface IndicatorItemProps {
  text?: string | number
  /** 自定义渲染的宿主元素。 */
  as?: 'div' | 'span'
  /** 弹出层或内容展示位置。 */
  placement?: IndicatorPlacement
  /** horizontal 配置项。 */
  horizontal?: IndicatorHorizontal
  /** vertical 配置项。 */
  vertical?: IndicatorVertical
  /** offset 配置项。 */
  offset?: IndicatorOffset
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any> | string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** IndicatorItemConfig 配置对象。 */
export interface IndicatorItemConfig extends IndicatorItemProps {
  /** 数据项唯一标识。 */
  key?: string | number
}

/** IndicatorProps 组件属性。 */
export interface IndicatorProps {
  /** 自定义渲染的宿主元素。 */
  as?: 'div' | 'span'
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any> | string
  /** item 区域配置。 */
  item?: string | number
  /** itemProps 透传属性。 */
  itemProps?: Omit<IndicatorItemProps, 'children'>
  /** 数据驱动渲染项。 */
  items?: IndicatorItemConfig[]
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface ResolvedPlacement {
  horizontal?: IndicatorHorizontal
  vertical?: IndicatorVertical
}

const placementMap: Record<IndicatorPlacement, ResolvedPlacement> = {
  start: { horizontal: 'start' },
  center: { horizontal: 'center' },
  end: { horizontal: 'end' },
  top: { vertical: 'top' },
  middle: { vertical: 'middle' },
  bottom: { vertical: 'bottom' },
  'top-start': { horizontal: 'start', vertical: 'top' },
  'top-center': { horizontal: 'center', vertical: 'top' },
  'top-end': { horizontal: 'end', vertical: 'top' },
  'middle-start': { horizontal: 'start', vertical: 'middle' },
  'middle-center': { horizontal: 'center', vertical: 'middle' },
  'middle-end': { horizontal: 'end', vertical: 'middle' },
  'bottom-start': { horizontal: 'start', vertical: 'bottom' },
  'bottom-center': { horizontal: 'center', vertical: 'bottom' },
  'bottom-end': { horizontal: 'end', vertical: 'bottom' },
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 归一化 Offset Value 的内部工具函数。 */
const normalizeOffsetValue = (value: number | string) => {
  return typeof value === 'number' ? `${Math.abs(value)}px` : String(value).trim().replace(/^-/, '')
}

/** 判断 Negative Offset 的内部工具函数。 */
const isNegativeOffset = (value: number | string) => {
  return typeof value === 'number' ? value < 0 : String(value).trim().startsWith('-')
}

/** 解析 Calc Value 的内部工具函数。 */
const resolveCalcValue = (base: string, value: number | string, invert = false) => {
  const subtract = invert ? !isNegativeOffset(value) : isNegativeOffset(value)
  return `calc(${base} ${subtract ? '-' : '+'} ${normalizeOffsetValue(value)})`
}

/** 解析 Placement 的内部工具函数。 */
const resolvePlacement = (placement?: IndicatorPlacement) => {
  return placement ? placementMap[placement] : {}
}

/** 解析 Indicator Item 类名的内部工具函数。 */
const buildItemClassName = (
  horizontal?: IndicatorHorizontal,
  vertical?: IndicatorVertical,
  className?: string,
) => {
  let cls = 'indicator-item'
  if (horizontal) cls += ` indicator-${horizontal}`
  if (vertical) cls += ` indicator-${vertical}`
  if (className) cls += ` ${className}`
  return cls
}

/** offset 通过 daisyUI indicator CSS 变量声明式落到 style 上。 */
const resolveOffsetStyle = (
  horizontal?: IndicatorHorizontal,
  vertical?: IndicatorVertical,
  offset?: IndicatorOffset,
) => {
  if (!offset) {
    return undefined
  }

  const [offsetX, offsetY] = offset
  const style: Record<string, string> = {}

  if (horizontal === 'start') {
    style['--indicator-s'] = resolveCalcValue('0px', offsetX)
    style['--indicator-e'] = 'auto'
  } else if (horizontal === 'center') {
    style['--indicator-s'] = resolveCalcValue('50%', offsetX)
    style['--indicator-e'] = resolveCalcValue('50%', offsetX, true)
  } else if (horizontal === 'end') {
    style['--indicator-s'] = 'auto'
    style['--indicator-e'] = resolveCalcValue('0px', offsetX, true)
  }

  if (vertical === 'top') {
    style['--indicator-t'] = resolveCalcValue('0px', offsetY)
    style['--indicator-b'] = 'auto'
  } else if (vertical === 'middle') {
    style['--indicator-t'] = resolveCalcValue('50%', offsetY)
    style['--indicator-b'] = resolveCalcValue('50%', offsetY, true)
  } else if (vertical === 'bottom') {
    style['--indicator-t'] = 'auto'
    style['--indicator-b'] = resolveCalcValue('0px', offsetY, true)
  }

  return Object.keys(style).length > 0 ? style : undefined
}

/** 合并用户 style 与 offset style，保持 offset 对 CSS 变量的最终控制权。 */
const mergeItemStyle = (
  style?: Record<string, any> | string,
  offsetStyle?: Record<string, string>,
) => {
  if (!offsetStyle) {
    return style
  }

  if (typeof style === 'string') {
    const offsetText = Object.entries(offsetStyle)
      .map(([name, value]) => `${name}: ${value}`)
      .join('; ')
    return style.trim() ? `${style}; ${offsetText}` : offsetText
  }

  return {
    ...style,
    ...offsetStyle,
  }
}

/** Indicator 的内部工具函数。 */
const Indicator: FC<IndicatorProps> = ({
  as = 'div',
  className,
  style,
  item,
  itemProps,
  items,
  children,
  ...rest
}) => {
  const Component = as as any
  const hasItems = Array.isArray(items) && items.length > 0

  return Component === 'div' ? (
    <div {...rest} className={mergeClassName('indicator', className)} style={style}>
      {hasItems ? (
        <>
          {' '}
          {items.map((config, index) => (
            <Item key={config.key ?? index} {...config} />
          ))}{' '}
        </>
      ) : null}
      {!hasItems && item != null ? (
        <Item
          data-testid={itemProps?.['data-testid']}
          placement={itemProps?.placement}
          horizontal={itemProps?.horizontal}
          vertical={itemProps?.vertical}
          offset={itemProps?.offset}
          className={itemProps?.className}
          style={itemProps?.style}
          text={item}
        />
      ) : null}
      {children}
    </div>
  ) : Component === 'span' ? (
    <span {...rest} className={mergeClassName('indicator', className)} style={style}>
      {hasItems ? (
        <>
          {' '}
          {items.map((config, index) => (
            <Item key={config.key ?? index} {...config} />
          ))}{' '}
        </>
      ) : null}
      {!hasItems && item != null ? (
        <Item
          data-testid={itemProps?.['data-testid']}
          placement={itemProps?.placement}
          horizontal={itemProps?.horizontal}
          vertical={itemProps?.vertical}
          offset={itemProps?.offset}
          className={itemProps?.className}
          style={itemProps?.style}
          text={item}
        />
      ) : null}
      {children}
    </span>
  ) : (
    <></>
  )
}

/** Item 的内部工具函数。 */
const Item: FC<IndicatorItemProps> = ({
  as = 'span',
  placement,
  horizontal,
  vertical,
  offset,
  className,
  style,
  children,
  text,
  ...rest
}) => {
  const Component = as as any
  const placementPreset = resolvePlacement(placement)
  const resolvedHorizontal = horizontal ?? placementPreset.horizontal
  const resolvedVertical = vertical ?? placementPreset.vertical
  const offsetStyle = resolveOffsetStyle(resolvedHorizontal, resolvedVertical, offset)

  return Component === 'div' ? (
    <div
      {...rest}
      ref={(element: HTMLElement | null) => {
        if (!element || !offsetStyle) return
        Object.entries(offsetStyle).forEach(([name, value]) =>
          element.style.setProperty(name, value),
        )
      }}
      className={buildItemClassName(resolvedHorizontal, resolvedVertical, className)}
      style={mergeItemStyle(style, offsetStyle)}
    >
      {text !== undefined ? <span>{String(text)}</span> : children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      ref={(element: HTMLElement | null) => {
        if (!element || !offsetStyle) return
        Object.entries(offsetStyle).forEach(([name, value]) =>
          element.style.setProperty(name, value),
        )
      }}
      className={buildItemClassName(resolvedHorizontal, resolvedVertical, className)}
      style={mergeItemStyle(style, offsetStyle)}
    >
      {text !== undefined ? <span>{String(text)}</span> : children}
    </span>
  ) : (
    <></>
  )
}

type IndicatorCompound = FC<IndicatorProps> & {
  Item: FC<IndicatorItemProps>
}

const IndicatorCompound: IndicatorCompound = /*#__PURE__*/ Object.assign(Indicator, {
  Item,
})

/** 默认导出指示器组件。 */
export default IndicatorCompound
