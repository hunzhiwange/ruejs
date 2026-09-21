/*
Dock 组件概述
- 形态：保留原有 children / items 双写法，并补充 key、disabled、链接语义等增强能力。
- 状态：兼容 activeIndex，也支持 activeKey / defaultActiveKey 这类更语义化的导航控制。
- 复合组件：Item / Label 仍可独立组合，保持 Rue 当前 dock 视觉风格。
*/
import type { FC } from '@rue-js/rue'
import { computed, ref } from '@rue-js/rue'

/** DockRootAs 类型。 */
export type DockRootAs = 'div' | 'nav'
/** DockItemAs 类型。 */
export type DockItemAs = 'button' | 'a' | 'div'
/** DockItemKey 标识键类型。 */
export type DockItemKey = string | number
/** DockSize 尺寸类型。 */
export type DockSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'medium' | 'large'

/** DockChangeContext 事件或渲染上下文。 */
export interface DockChangeContext {
  /** 数据项唯一标识。 */
  key: DockItemKey
  /** index 配置项。 */
  index: number
  /** item 区域配置。 */
  item?: DockItemData
}

/** DockItemData 数据项结构。 */
export interface DockItemData {
  /** 数据项唯一标识。 */
  key?: DockItemKey
  /** 自定义渲染的宿主元素。 */
  as?: DockItemAs
  /** 根节点附加类名。 */
  className?: string
  /** 图标内容。 */
  icon?: any
  /** iconClassName 附加类名。 */
  iconClassName?: string
  /** 展示标签。 */
  label?: any
  /** labelClassName 附加类名。 */
  labelClassName?: string
  /** 链接地址。 */
  href?: string
  /** 链接或定位目标。 */
  target?: string
  /** 链接 rel 属性。 */
  rel?: string
  /** 原生 button type 属性。 */
  htmlType?: 'button' | 'submit' | 'reset'
  /** 是否处于激活态。 */
  active?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** ariaLabel 标签内容。 */
  ariaLabel?: string
  /** 点击时触发的回调。 */
  onClick?: (event: MouseEvent, context: DockChangeContext) => void
}

/** DockProps 组件属性。 */
export interface DockProps {
  /** 自定义渲染的宿主元素。 */
  as?: DockRootAs
  /** 组件尺寸。 */
  size?: DockSize
  /** 根节点附加类名。 */
  className?: string
  /** ariaLabel 标签内容。 */
  ariaLabel?: string
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<DockItemData>
  /** activeIndex 配置项。 */
  activeIndex?: number
  /** defaultActiveIndex 配置项。 */
  defaultActiveIndex?: number
  /** activeKey 标识键。 */
  activeKey?: DockItemKey | null
  /** defaultActiveKey 标识键。 */
  defaultActiveKey?: DockItemKey | null
  /** 值或状态变化时触发的回调。 */
  onChange?: (index: number, context: DockChangeContext) => void
  /** 选中项时触发的回调。 */
  onSelect?: (key: DockItemKey | null, context: DockChangeContext) => void
  /** 组件子内容。 */
  children?: any
}

/** DockItemProps 组件属性。 */
export interface DockItemProps {
  /** 自定义渲染的宿主元素。 */
  as?: DockItemAs
  /** 是否处于激活态。 */
  active?: boolean
  /** @internal 数据模式下用于让单个 keyed item 直接订阅选中态。 */
  activeKeySource?: { get(): DockItemKey | null }
  /** @internal 与 activeKeySource 配对的当前 item key。 */
  itemKey?: DockItemKey
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 链接地址。 */
  href?: string
  /** 链接或定位目标。 */
  target?: string
  /** 链接 rel 属性。 */
  rel?: string
  /** 原生 button type 属性。 */
  htmlType?: 'button' | 'submit' | 'reset'
  /** ariaLabel 标签内容。 */
  ariaLabel?: string
  /** 点击时触发的回调。 */
  onClick?: (event: MouseEvent) => void
  /** 组件子内容。 */
  children?: any
}

/** DockLabelProps 组件属性。 */
export interface DockLabelProps {
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
}

interface NormalizedDockItem extends DockItemData {
  key: DockItemKey
  index: number
}

/** append Class Name 的内部工具函数。 */
const appendClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: DockSize) => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'middle':
    case 'medium':
      return 'md'
    case 'large':
      return 'lg'
    default:
      return size
  }
}

/** 解析 Anchor Rel 的内部工具函数。 */
const resolveAnchorRel = (target?: string, rel?: string) => {
  if (target === '_blank' && !rel) return 'noreferrer'
  return rel
}

/** 解析 Selected Key 的内部工具函数。 */
const resolveSelectedKey = (
  items: ReadonlyArray<NormalizedDockItem>,
  activeKey: DockItemKey | null | undefined,
  activeIndex: number | undefined,
  uncontrolledActiveKey: DockItemKey | null,
) => {
  if (activeKey !== undefined) return activeKey
  if (activeIndex !== undefined) return items[activeIndex]?.key ?? null
  return uncontrolledActiveKey
}

/** 解析 Initial Selected Key 的内部工具函数。 */
const resolveInitialSelectedKey = (
  items: ReadonlyArray<NormalizedDockItem>,
  defaultActiveKey: DockItemKey | null | undefined,
  defaultActiveIndex: number | undefined,
) => {
  if (defaultActiveKey !== undefined) return defaultActiveKey
  if (defaultActiveIndex !== undefined) return items[defaultActiveIndex]?.key ?? null
  return items.find(item => item.active)?.key ?? null
}

/** 构建 Item Class Name 的内部工具函数。 */
const buildItemClassName = (active?: boolean, disabled?: boolean, className?: string) => {
  let cls = ''
  if (active) cls += ' dock-active'
  if (disabled) cls += ' opacity-50'
  if (className) cls += ` ${className}`
  return cls.trim() || undefined
}

/** Item 的内部工具函数。 */
const Item: FC<DockItemProps> = ({
  as,
  active,
  activeKeySource,
  itemKey,
  disabled,
  className,
  href,
  target,
  rel,
  htmlType,
  ariaLabel,
  onClick,
  children,
}) => {
  const renderAs = as ?? (href ? 'a' : 'button')
  const getActive = () =>
    activeKeySource
      ? activeKeySource.get() != null
        ? activeKeySource.get() === itemKey
        : active
      : active
  const getClassName = () => buildItemClassName(getActive(), disabled, className)

  const handleClick = (event: MouseEvent) => {
    if (disabled) {
      if (typeof (event as any).preventDefault === 'function') {
        ;(event as any).preventDefault()
      }
      if (typeof (event as any).stopPropagation === 'function') {
        ;(event as any).stopPropagation()
      }
      return
    }
    if (onClick) onClick(event)
  }

  if (renderAs === 'a') {
    return (
      <a
        href={disabled ? undefined : href}
        target={target}
        rel={resolveAnchorRel(target, rel)}
        className={getClassName()}
        aria-label={ariaLabel}
        aria-current={getActive() ? 'page' : undefined}
        aria-disabled={disabled ? 'true' : undefined}
        onClick={handleClick}
      >
        {children}
      </a>
    )
  }

  if (renderAs === 'div') {
    return (
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={getClassName()}
        aria-label={ariaLabel}
        aria-current={getActive() ? 'page' : undefined}
        aria-disabled={disabled ? 'true' : undefined}
        onClick={handleClick}
      >
        {children}
      </div>
    )
  }

  return (
    <button
      className={getClassName()}
      type={htmlType ?? 'button'}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={getActive() ? 'page' : undefined}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}

/** 停靠栏组件：数据驱动或 children 渲染。 */
const RenderDataItem = ({
  arg0: item,
  currentSelectedKey,
  handleItemClick,
}: {
  arg0: NormalizedDockItem
  currentSelectedKey: any
  handleItemClick: (event: MouseEvent, item: NormalizedDockItem, context: DockChangeContext) => void
}) => {
  const active = () =>
    currentSelectedKey.get() != null ? currentSelectedKey.get() === item.key : item.active
  const click = (event: MouseEvent) =>
    handleItemClick(event, item, { key: item.key, index: item.index, item })
  return (
    <>
      {item.href || item.as === 'a' ? (
        <a
          href={item.disabled ? undefined : item.href}
          target={item.target}
          rel={resolveAnchorRel(item.target, item.rel)}
          className={buildItemClassName(active(), item.disabled, item.className)}
          aria-label={item.ariaLabel}
          aria-current={active() ? 'page' : undefined}
          aria-disabled={item.disabled ? 'true' : undefined}
          onClick={click}
        >
          <span className={item.iconClassName}>{item.icon}</span>
          <span className={appendClassName('dock-label', item.labelClassName)}>{item.label}</span>
        </a>
      ) : (
        <button
          type={item.htmlType ?? 'button'}
          disabled={item.disabled}
          className={buildItemClassName(active(), item.disabled, item.className)}
          aria-label={item.ariaLabel}
          aria-current={active() ? 'page' : undefined}
          onClick={click}
        >
          <span className={item.iconClassName}>{item.icon}</span>
          <span className={appendClassName('dock-label', item.labelClassName)}>{item.label}</span>
        </button>
      )}
    </>
  )
}

const Dock: FC<DockProps> = ({
  as = 'div',
  size,
  className,
  ariaLabel,
  items,
  activeIndex,
  defaultActiveIndex,
  activeKey,
  defaultActiveKey,
  onChange,
  onSelect,
  children,
}) => {
  let cls = 'dock'
  const resolvedSize = resolveSizeClass(size)
  if (resolvedSize) cls += ` dock-${resolvedSize}`
  if (className) cls += ` ${className}`

  const normalizedItems: NormalizedDockItem[] = (items ?? []).map((item, index) => ({
    ...item,
    key: item.key ?? index,
    index,
  }))
  const uncontrolledActiveKey = ref(
    resolveInitialSelectedKey(normalizedItems, defaultActiveKey, defaultActiveIndex),
  )
  const currentSelectedKey = computed(() =>
    resolveSelectedKey(normalizedItems, activeKey, activeIndex, uncontrolledActiveKey.value),
  )
  const isControlled = activeKey !== undefined || activeIndex !== undefined

  if (normalizedItems.length) {
    const handleItemClick = (
      event: MouseEvent,
      item: NormalizedDockItem,
      context: DockChangeContext,
    ) => {
      if (item.disabled) {
        if (typeof (event as any).preventDefault === 'function') {
          ;(event as any).preventDefault()
        }
        if (typeof (event as any).stopPropagation === 'function') {
          ;(event as any).stopPropagation()
        }
        return
      }
      if (!isControlled) uncontrolledActiveKey.value = item.key
      if (item.onClick) item.onClick(event, context)
      if (onChange) onChange(item.index, context)
      if (onSelect) onSelect(item.key, context)
    }
    if (as === 'nav') {
      return (
        <nav className={cls} aria-label={ariaLabel}>
          {normalizedItems.map(item => (
            <RenderDataItem
              key={item.key}
              arg0={item}
              currentSelectedKey={currentSelectedKey}
              handleItemClick={handleItemClick}
            />
          ))}
        </nav>
      )
    }
    return (
      <div className={cls} aria-label={ariaLabel}>
        {normalizedItems.map(item => (
          <RenderDataItem
            key={item.key}
            arg0={item}
            currentSelectedKey={currentSelectedKey}
            handleItemClick={handleItemClick}
          />
        ))}
      </div>
    )
  }

  if (as === 'nav') {
    return (
      <nav className={cls} aria-label={ariaLabel}>
        {children}
      </nav>
    )
  }
  return (
    <div className={cls} aria-label={ariaLabel}>
      {children}
    </div>
  )
}

/** 项标签组件：显示文字或图标旁说明。 */
const Label: FC<DockLabelProps> = ({ className, children }) => {
  return <span className={appendClassName('dock-label', className)}>{children}</span>
}

type DockCompound = FC<DockProps> & {
  Item: FC<DockItemProps>
  Label: FC<DockLabelProps>
}

const DockCompound: DockCompound = /*#__PURE__*/ Object.assign(Dock, {
  Item,
  Label,
})

/** 默认导出停靠栏组件。 */
export default DockCompound
