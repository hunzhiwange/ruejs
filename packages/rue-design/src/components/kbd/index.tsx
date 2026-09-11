/*
Kbd 组件概述
- 保留 Rue 当前 `kbd` 视觉风格，同时把单键和组合键都整理成更顺手的语义 API。
- 同时支持 `<Kbd>⌘</Kbd>` 的兼容写法，以及 `items` / `Kbd.Combo` / `Kbd.Group` 的增强写法。
*/
import type { FC } from '@rue-js/rue'

/** KbdSize 尺寸类型。 */
export type KbdSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'medium' | 'large'
/** KbdGap 类型。 */
export type KbdGap = 'xs' | 'sm' | 'md' | 'lg'
/** KbdDirection 位置或方向类型。 */
export type KbdDirection = 'horizontal' | 'vertical'

/** KbdItemData 数据项结构。 */
export interface KbdItemData {
  /** 数据项唯一标识。 */
  key?: string | number
  /** 展示标签。 */
  label?: any
  /** 组件子内容。 */
  children?: any
  /** 组件尺寸。 */
  size?: KbdSize
  /** 根节点附加类名。 */
  className?: string
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** KbdProps 组件属性。 */
export interface KbdProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 组件尺寸。 */
  size?: KbdSize
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<KbdItemData | any>
  /** separator 配置项。 */
  separator?: any
  /** itemClassName 附加类名。 */
  itemClassName?: string
  /** separatorClassName 附加类名。 */
  separatorClassName?: string
  /** wrap 配置项。 */
  wrap?: boolean
  /** 元素间距。 */
  gap?: KbdGap
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** KbdGroupProps 组件属性。 */
export interface KbdGroupProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 组件尺寸。 */
  size?: KbdSize
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<KbdItemData | any>
  /** separator 配置项。 */
  separator?: any
  /** itemClassName 附加类名。 */
  itemClassName?: string
  /** separatorClassName 附加类名。 */
  separatorClassName?: string
  /** 布局方向。 */
  direction?: KbdDirection
  /** wrap 配置项。 */
  wrap?: boolean
  /** 元素间距。 */
  gap?: KbdGap
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** KbdComboProps 组件属性。 */
export interface KbdComboProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 组件尺寸。 */
  size?: KbdSize
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<KbdItemData | any>
  /** separator 配置项。 */
  separator?: any
  /** itemClassName 附加类名。 */
  itemClassName?: string
  /** separatorClassName 附加类名。 */
  separatorClassName?: string
  /** wrap 配置项。 */
  wrap?: boolean
  /** 元素间距。 */
  gap?: KbdGap
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** KbdSeparatorProps 组件属性。 */
export interface KbdSeparatorProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface ComboItemsProps extends Pick<
  KbdComboProps,
  'items' | 'size' | 'itemClassName' | 'separator' | 'separatorClassName'
> {}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 判断是否存在 Renderable Content 的内部工具函数。 */
const hasRenderableContent = (value: any): boolean =>
  value != null && value !== false && value !== ''

/** 解析 Size Token 的内部工具函数。 */
const resolveSizeToken = (size?: KbdSize) => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'medium':
    case 'middle':
      return 'md'
    case 'large':
      return 'lg'
    default:
      return size
  }
}

/** 解析 Gap Class 的内部工具函数。 */
const resolveGapClass = (gap: KbdGap = 'sm') => {
  switch (gap) {
    case 'xs':
      return 'gap-1'
    case 'md':
      return 'gap-3'
    case 'lg':
      return 'gap-4'
    default:
      return 'gap-2'
  }
}

/** 构建 Kbd Class Name 的内部工具函数。 */
const buildKbdClassName = (size?: KbdSize, className?: string) => {
  let cls = 'kbd'
  const resolvedSize = resolveSizeToken(size)
  if (resolvedSize) cls += ` kbd-${resolvedSize}`
  if (className) cls += ` ${className}`
  return cls
}

/** 判断 Kbd Item Data 的内部工具函数。 */
const isKbdItemData = (value: any): value is KbdItemData => {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    ('label' in value ||
      'children' in value ||
      'size' in value ||
      'className' in value ||
      'key' in value)
  )
}

/** 归一化 Item 的内部工具函数。 */
const normalizeItem = (item: KbdItemData | any, index: number): KbdItemData => {
  if (isKbdItemData(item)) {
    return item
  }

  return {
    key: index,
    label: item,
  }
}

/** 渲染 Item Content 的内部工具函数。 */
const renderItemContent = (item: KbdItemData) => {
  if (hasRenderableContent(item.children)) return item.children
  return item.label
}

/** join Class Name 的内部工具函数。 */
const joinClassName = (...values: Array<string | undefined | false>) =>
  values.filter(Boolean).join(' ')

/** Key Root 的内部工具函数。 */
const KeyRoot: FC<KbdProps> = ({ as = 'kbd', size, className, children, ...rest }) => {
  const Component = as as any
  return Component === 'div' ? (
    <div {...rest} className={buildKbdClassName(size, className)}>
      {children}
    </div>
  ) : Component === 'span' ? (
    <span {...rest} className={buildKbdClassName(size, className)}>
      {children}
    </span>
  ) : Component === 'kbd' ? (
    <kbd {...rest} className={buildKbdClassName(size, className)}>
      {children}
    </kbd>
  ) : Component === 'label' ? (
    <label {...rest} className={buildKbdClassName(size, className)}>
      {children}
    </label>
  ) : (
    <></>
  )
}

/** Separator 的内部工具函数。 */
const Separator: FC<KbdSeparatorProps> = ({ as = 'span', className, children = '+', ...rest }) => {
  const Component = as as any
  return Component === 'div' ? (
    <div
      {...rest}
      className={mergeClassName(
        'inline-flex items-center justify-center px-1 text-sm opacity-60',
        className,
      )}
    >
      {children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={mergeClassName(
        'inline-flex items-center justify-center px-1 text-sm opacity-60',
        className,
      )}
    >
      {children}
    </span>
  ) : Component === 'kbd' ? (
    <kbd
      {...rest}
      className={mergeClassName(
        'inline-flex items-center justify-center px-1 text-sm opacity-60',
        className,
      )}
    >
      {children}
    </kbd>
  ) : Component === 'label' ? (
    <label
      {...rest}
      className={mergeClassName(
        'inline-flex items-center justify-center px-1 text-sm opacity-60',
        className,
      )}
    >
      {children}
    </label>
  ) : (
    <></>
  )
}

/** Combo Items 的内部工具组件。 */
const ComboItems: FC<ComboItemsProps> = ({
  items,
  size,
  itemClassName,
  separator,
  separatorClassName,
}) => {
  const CompiledRow1 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const rawItem = rowArg0
    const index = rowArg1

    const item = normalizeItem(rawItem, index)
    const itemKey = item.key ?? index
    const { key: _key, size: itemSize, className: itemOwnClassName, ...itemRest } = item

    return (
      <span key={`item-${itemKey}`} className="contents">
        {index > 0 ? (
          <Separator className={separatorClassName}>
            {String(hasRenderableContent(separator) ? separator : '+')}
          </Separator>
        ) : null}
        <KeyRoot
          size={itemSize ?? size}
          className={joinClassName(itemClassName, itemOwnClassName)}
          {...itemRest}
        >
          {String(renderItemContent(item) ?? '')}
        </KeyRoot>
      </span>
    )
  }

  return (
    <>
      {(items ?? []).map((rowArg0: any, rowArg1: number) => (
        <CompiledRow1 rowArg0={rowArg0} rowArg1={rowArg1} />
      ))}
    </>
  )
}

/** Group 的内部工具函数。 */
const Group: FC<KbdGroupProps> = ({
  as = 'span',
  size,
  items,
  separator,
  itemClassName,
  separatorClassName,
  direction = 'horizontal',
  wrap,
  gap = 'sm',
  className,
  children,
  ...rest
}) => {
  const Component = as as any
  const baseClassName =
    direction === 'vertical' ? 'inline-flex flex-col' : 'inline-flex items-center'
  const groupClassName = mergeClassName(
    `${baseClassName}${direction !== 'vertical' && wrap ? ' flex-wrap' : ''} ${resolveGapClass(gap)}`,
    className,
  )

  return Component === 'div' ? (
    <div {...rest} className={groupClassName}>
      {!items?.length && children ? (
        children
      ) : (
        <ComboItems
          items={items}
          size={size}
          itemClassName={itemClassName}
          separator={separator}
          separatorClassName={separatorClassName}
        />
      )}
    </div>
  ) : Component === 'span' ? (
    <span {...rest} className={groupClassName}>
      {!items?.length && children ? (
        children
      ) : (
        <ComboItems
          items={items}
          size={size}
          itemClassName={itemClassName}
          separator={separator}
          separatorClassName={separatorClassName}
        />
      )}
    </span>
  ) : Component === 'kbd' ? (
    <kbd {...rest} className={groupClassName}>
      {!items?.length && children ? (
        children
      ) : (
        <ComboItems
          items={items}
          size={size}
          itemClassName={itemClassName}
          separator={separator}
          separatorClassName={separatorClassName}
        />
      )}
    </kbd>
  ) : Component === 'label' ? (
    <label {...rest} className={groupClassName}>
      {!items?.length && children ? (
        children
      ) : (
        <ComboItems
          items={items}
          size={size}
          itemClassName={itemClassName}
          separator={separator}
          separatorClassName={separatorClassName}
        />
      )}
    </label>
  ) : (
    <></>
  )
}

/** Combo 的内部工具函数。 */
const Combo: FC<KbdComboProps> = ({
  as = 'span',
  size,
  className,
  children,
  items,
  separator,
  itemClassName,
  separatorClassName,
  wrap,
  gap = 'sm',
  ...rest
}) => {
  return (
    <Group
      as={as}
      size={size}
      items={items}
      separator={separator}
      itemClassName={itemClassName}
      separatorClassName={separatorClassName}
      wrap={wrap}
      gap={gap}
      className={className}
      {...rest}
    >
      {children}
    </Group>
  )
}

type KbdCompound = FC<KbdProps> & {
  Group: FC<KbdGroupProps>
  Combo: FC<KbdComboProps>
  Separator: FC<KbdSeparatorProps>
}

/** Root 的内部工具函数。 */
const Root: FC<KbdProps> = ({
  items,
  separator,
  itemClassName,
  separatorClassName,
  wrap,
  gap,
  ...rest
}) => {
  if (Array.isArray(items)) {
    return (
      <Combo
        items={items}
        separator={separator}
        itemClassName={itemClassName}
        separatorClassName={separatorClassName}
        wrap={wrap}
        gap={gap}
        {...rest}
      />
    )
  }

  return <KeyRoot {...rest} />
}

const Kbd: KbdCompound = /*#__PURE__*/ Object.assign(Root, {
  Group,
  Combo,
  Separator,
})

/** 默认导出键盘键位组件。 */
export default Kbd
