/*
Stack 模块概述
- 汇总堆叠布局组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'

const StackItems: FC<{
  items?: ReadonlyArray<{ key?: string | number; content: string | number }>
  reverse?: boolean
  children?: any
}> = ({ items, reverse, children }) => (
  <>
    {items ? (
      <>
        {(reverse ? [...items].reverse() : items).map((item, index) => (
          <div key={item.key ?? index}>{String(item.content)}</div>
        ))}
      </>
    ) : (
      <>{children}</>
    )}
  </>
)

/** StackVerticalAlign 对齐方式类型。 */
export type StackVerticalAlign = 'center' | 'top' | 'bottom'
/** StackHorizontalAlign 对齐方式类型。 */
export type StackHorizontalAlign = 'center' | 'start' | 'end'
/** StackPlacement 位置或方向类型。 */
export type StackPlacement =
  | 'center'
  | 'top'
  | 'bottom'
  | 'start'
  | 'end'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'

/** StackProps 组件属性。 */
export interface StackProps {
  items?: ReadonlyArray<{ key?: string | number; content: string | number }>
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** vertical 配置项。 */
  vertical?: StackVerticalAlign
  /** horizontal 配置项。 */
  horizontal?: StackHorizontalAlign
  /** 弹出层或内容展示位置。 */
  placement?: StackPlacement
  /** reverse 配置项。 */
  reverse?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) =>
  className ? `${base} ${className}` : base

/** 构建 Stack Class Name 的内部工具函数。 */
const buildStackClassName = (
  vertical?: StackVerticalAlign,
  horizontal?: StackHorizontalAlign,
  className?: string,
) => {
  let cls = 'stack'
  if (vertical && vertical !== 'center') cls += ` stack-${vertical}`
  if (horizontal && horizontal !== 'center') cls += ` stack-${horizontal}`
  return mergeClassName(cls, className)
}

/** 转换为 Child Array 的内部工具函数。 */

/** 解析 Placement 的内部工具函数。 */
const resolvePlacement = (placement?: StackPlacement) => {
  switch (placement) {
    case 'top':
      return { vertical: 'top' as StackVerticalAlign }
    case 'bottom':
      return { vertical: 'bottom' as StackVerticalAlign }
    case 'start':
      return { horizontal: 'start' as StackHorizontalAlign }
    case 'end':
      return { horizontal: 'end' as StackHorizontalAlign }
    case 'top-start':
      return { vertical: 'top' as StackVerticalAlign, horizontal: 'start' as StackHorizontalAlign }
    case 'top-end':
      return { vertical: 'top' as StackVerticalAlign, horizontal: 'end' as StackHorizontalAlign }
    case 'bottom-start':
      return {
        vertical: 'bottom' as StackVerticalAlign,
        horizontal: 'start' as StackHorizontalAlign,
      }
    case 'bottom-end':
      return { vertical: 'bottom' as StackVerticalAlign, horizontal: 'end' as StackHorizontalAlign }
    default:
      return {}
  }
}

/** Stack 的内部工具函数。 */
const Stack: FC<StackProps> = ({
  as = 'div',
  vertical,
  horizontal,
  placement,
  reverse,
  className,
  children,
  items,
  ...rest
}) => {
  const Component = as as any
  const placementPreset = resolvePlacement(placement)
  const resolvedVertical = vertical ?? placementPreset.vertical
  const resolvedHorizontal = horizontal ?? placementPreset.horizontal

  return Component === 'section' ? (
    <section
      {...rest}
      className={buildStackClassName(resolvedVertical, resolvedHorizontal, className)}
    >
      <StackItems items={items} reverse={reverse}>
        {children}
      </StackItems>
    </section>
  ) : Component === 'div' ? (
    <div {...rest} className={buildStackClassName(resolvedVertical, resolvedHorizontal, className)}>
      <StackItems items={items} reverse={reverse}>
        {children}
      </StackItems>
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={buildStackClassName(resolvedVertical, resolvedHorizontal, className)}
    >
      <StackItems items={items} reverse={reverse}>
        {children}
      </StackItems>
    </span>
  ) : (
    <></>
  )
}

/** 默认导出堆叠布局组件。 */
export default Stack
