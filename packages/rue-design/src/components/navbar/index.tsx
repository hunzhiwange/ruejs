/*
Navbar 模块概述
- 汇总导航栏组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'

/** NavbarPlacement 位置或方向类型。 */
export type NavbarPlacement = 'start' | 'center' | 'end'
/** NavbarAlign 对齐方式类型。 */
export type NavbarAlign = 'start' | 'center' | 'end' | 'between'

/** NavbarSectionProps 组件属性。 */
export interface NavbarSectionProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 交叉轴或内容对齐方式。 */
  align?: NavbarAlign
  /** grow 配置项。 */
  grow?: boolean
  /** wrap 配置项。 */
  wrap?: boolean
  /** 弹出层或内容展示位置。 */
  placement?: NavbarPlacement
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** NavbarItemProps 组件属性。 */
export interface NavbarItemProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 主体内容。 */
  content?: any
  /** grow 配置项。 */
  grow?: boolean
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** NavbarItem 数据项结构。 */
export interface NavbarItem extends Omit<NavbarItemProps, 'content'> {
  /** 数据项唯一标识。 */
  key?: string | number
  /** 弹出层或内容展示位置。 */
  placement?: NavbarPlacement
  /** 主体内容。 */
  content?: any
}

/** NavbarRootProps 组件属性。 */
export interface NavbarRootProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** brand 配置项。 */
  brand?: any
  /** start 配置项。 */
  start?: any
  /** center 配置项。 */
  center?: any
  /** end 配置项。 */
  end?: any
  /** 操作区内容。 */
  actions?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<NavbarItem>
  /** startProps 透传属性。 */
  startProps?: Omit<NavbarSectionProps, 'children' | 'placement'>
  /** centerProps 透传属性。 */
  centerProps?: Omit<NavbarSectionProps, 'children' | 'placement'>
  /** endProps 透传属性。 */
  endProps?: Omit<NavbarSectionProps, 'children' | 'placement'>
  /** wrap 配置项。 */
  wrap?: boolean
  /** sticky 配置项。 */
  sticky?: boolean
  /** bordered 配置项。 */
  bordered?: boolean
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface NavbarSlotItemProps {
  content?: any
}

interface NavbarPlacementItemsProps {
  items?: ReadonlyArray<NavbarItem>
  placement: NavbarPlacement
}

/** join Class Name 的内部工具函数。 */
const joinClassName = (...values: Array<string | undefined | false>) =>
  values.filter(Boolean).join(' ')

/** 判断是否存在 Renderable Content 的内部工具函数。 */
const hasRenderableContent = (value: any): boolean =>
  value != null && value !== false && value !== ''

/** 判断指定位置是否存在数据驱动项。 */
const hasPlacementItems = (
  items: ReadonlyArray<NavbarItem> | undefined,
  placement: NavbarPlacement,
) => (items ?? []).some(item => (item.placement ?? 'start') === placement)

/** 解析 Align Class 的内部工具函数。 */
const resolveAlignClass = (align?: NavbarAlign, placement?: NavbarPlacement) => {
  if (align === 'between') return 'justify-between'
  if (align === 'center') return 'justify-center'
  if (align === 'end') return 'justify-end'
  if (align === 'start') return 'justify-start'
  if (placement === 'center') return 'justify-center'
  if (placement === 'end') return 'justify-end'
  return undefined
}

/** 构建 Section Class Name 的内部工具函数。 */
const buildSectionClassName = (
  placement: NavbarPlacement,
  align?: NavbarAlign,
  grow?: boolean,
  wrap?: boolean,
  className?: string,
) => {
  return joinClassName(
    `navbar-${placement}`,
    resolveAlignClass(align, placement),
    grow && 'flex-1',
    wrap && 'flex-wrap',
    className,
  )
}

/** Section 的内部工具函数。 */
const Section: FC<NavbarSectionProps> = ({
  as = 'div',
  className,
  children,
  align,
  grow,
  wrap,
  placement = 'start',
  ...rest
}) => {
  const Component = as as any
  return Component === 'div' ? (
    <div {...rest} className={buildSectionClassName(placement, align, grow, wrap, className)}>
      {children}
    </div>
  ) : Component === 'span' ? (
    <span {...rest} className={buildSectionClassName(placement, align, grow, wrap, className)}>
      {children}
    </span>
  ) : (
    <></>
  )
}

/** Item 的内部工具函数。 */
const Item: FC<NavbarItemProps> = ({ as = 'div', className, children, content, grow, ...rest }) => {
  const Component = as as any
  return Component === 'div' ? (
    <div
      {...rest}
      className={joinClassName('inline-flex min-w-0 items-center', grow && 'flex-1', className)}
    >
      {content !== undefined ? <span>{String(content)}</span> : children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={joinClassName('inline-flex min-w-0 items-center', grow && 'flex-1', className)}
    >
      {content !== undefined ? <span>{String(content)}</span> : children}
    </span>
  ) : (
    <></>
  )
}

/** Start 的内部工具函数。 */
const Start: FC<Omit<NavbarSectionProps, 'placement'>> = props => (
  <Section {...props} placement="start" />
)
/** Center 的内部工具函数。 */
const Center: FC<Omit<NavbarSectionProps, 'placement'>> = props => (
  <Section {...props} placement="center" />
)
/** End 的内部工具函数。 */
const End: FC<Omit<NavbarSectionProps, 'placement'>> = props => (
  <Section {...props} placement="end" />
)

/** SlotItem 的内部工具函数。 */
const SlotItem: FC<NavbarSlotItemProps> = ({ content }) => {
  if (!hasRenderableContent(content)) return <></>
  return <Item content={content} />
}

/** PlacementItems 的内部工具函数。 */
const PlacementItems: FC<NavbarPlacementItemsProps> = ({ items, placement }) => {
  const CompiledRow1 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const item = rowArg0
    const index = rowArg1

    const { key, placement: _placement, content, children, ...rest } = item
    return <Item {...rest} content={content} />
  }

  return (
    <>
      {(items ?? [])
        .filter(item => (item.placement ?? 'start') === placement)
        .map((rowArg0: any, rowArg1: number) => (
          <CompiledRow1 rowArg0={rowArg0} rowArg1={rowArg1} />
        ))}
    </>
  )
}

/** Root 的内部工具函数。 */
const Root: FC<NavbarRootProps> = ({
  as = 'div',
  className,
  children,
  brand,
  start,
  center,
  end,
  actions,
  items,
  startProps,
  centerProps,
  endProps,
  wrap,
  sticky,
  bordered,
  ...rest
}) => {
  const Component = as as any
  const hasChildren = hasRenderableContent(children)
  const hasStart =
    hasRenderableContent(brand) || hasRenderableContent(start) || hasPlacementItems(items, 'start')
  const hasCenter = hasRenderableContent(center) || hasPlacementItems(items, 'center')
  const hasEnd =
    hasPlacementItems(items, 'end') || hasRenderableContent(end) || hasRenderableContent(actions)
  const hasStructuredSlots = hasStart || hasCenter || hasEnd

  return Component === 'div' ? (
    <div
      {...rest}
      className={joinClassName(
        'navbar',
        wrap && 'flex-wrap gap-y-2',
        sticky && 'sticky top-0 z-30',
        bordered && 'border-b border-base-300',
        className,
      )}
    >
      {hasChildren ? (
        children
      ) : (
        <>
          {hasStructuredSlots && hasStart ? (
            <Start {...startProps}>
              <SlotItem content={brand} />
              <SlotItem content={start} />
              <PlacementItems items={items} placement="start" />
            </Start>
          ) : null}
          {hasStructuredSlots && hasCenter ? (
            <Center {...centerProps}>
              <SlotItem content={center} />
              <PlacementItems items={items} placement="center" />
            </Center>
          ) : null}
          {hasStructuredSlots && hasEnd ? (
            <End {...endProps}>
              <PlacementItems items={items} placement="end" />
              <SlotItem content={end} />
              <SlotItem content={actions} />
            </End>
          ) : null}
        </>
      )}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={joinClassName(
        'navbar',
        wrap && 'flex-wrap gap-y-2',
        sticky && 'sticky top-0 z-30',
        bordered && 'border-b border-base-300',
        className,
      )}
    >
      {hasChildren ? (
        children
      ) : (
        <>
          {hasStructuredSlots && hasStart ? (
            <Start {...startProps}>
              <SlotItem content={brand} />
              <SlotItem content={start} />
              <PlacementItems items={items} placement="start" />
            </Start>
          ) : null}
          {hasStructuredSlots && hasCenter ? (
            <Center {...centerProps}>
              <SlotItem content={center} />
              <PlacementItems items={items} placement="center" />
            </Center>
          ) : null}
          {hasStructuredSlots && hasEnd ? (
            <End {...endProps}>
              <PlacementItems items={items} placement="end" />
              <SlotItem content={end} />
              <SlotItem content={actions} />
            </End>
          ) : null}
        </>
      )}
    </span>
  ) : Component === 'header' ? (
    <header
      {...rest}
      className={joinClassName(
        'navbar',
        wrap && 'flex-wrap gap-y-2',
        sticky && 'sticky top-0 z-30',
        bordered && 'border-b border-base-300',
        className,
      )}
    >
      {hasChildren ? (
        children
      ) : (
        <>
          {hasStructuredSlots && hasStart ? (
            <Start {...startProps}>
              <SlotItem content={brand} />
              <SlotItem content={start} />
              <PlacementItems items={items} placement="start" />
            </Start>
          ) : null}
          {hasStructuredSlots && hasCenter ? (
            <Center {...centerProps}>
              <SlotItem content={center} />
              <PlacementItems items={items} placement="center" />
            </Center>
          ) : null}
          {hasStructuredSlots && hasEnd ? (
            <End {...endProps}>
              <PlacementItems items={items} placement="end" />
              <SlotItem content={end} />
              <SlotItem content={actions} />
            </End>
          ) : null}
        </>
      )}
    </header>
  ) : (
    <></>
  )
}

type NavbarCompound = FC<NavbarRootProps> & {
  Start: FC<Omit<NavbarSectionProps, 'placement'>>
  Center: FC<Omit<NavbarSectionProps, 'placement'>>
  End: FC<Omit<NavbarSectionProps, 'placement'>>
  Section: FC<NavbarSectionProps>
  Item: FC<NavbarItemProps>
}

const Navbar: NavbarCompound = /*#__PURE__*/ Object.assign(Root, {
  Start,
  Center,
  End,
  Section,
  Item,
})

/** 默认导出导航栏组件。 */
export default Navbar
