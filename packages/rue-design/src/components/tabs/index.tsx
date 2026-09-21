/*
Tabs 组件概述
- 保留 Rue 当前的 daisyUI 视觉基底，并补齐更接近成熟组件库的 tabs API。
- 同时支持受控 / 非受控、items.children 内容面板、额外操作区与可编辑标签头部。
*/
import type { FC } from '@rue-js/rue'
import { computed, ref } from '@rue-js/rue'

/** TabsStyle 样式值类型。 */
export type TabsStyle = 'box' | 'border' | 'lift'
/** TabsType 视觉或语义变体类型。 */
export type TabsType = 'line' | 'card' | 'editable-card'
/** TabsPlacement 位置或方向类型。 */
export type TabsPlacement = 'top' | 'bottom'
/** TabsExtendedPlacement 位置或方向类型。 */
export type TabsExtendedPlacement = TabsPlacement | 'start' | 'end'
/** TabsSize 尺寸类型。 */
export type TabsSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'large'

/** TabsIndicator 接口。 */
export interface TabsIndicator {
  /** 交叉轴或内容对齐方式。 */
  align?: 'start' | 'center' | 'end'
  /** 组件尺寸。 */
  size?: number | string
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
}

/** TabBarExtraContentMap 接口。 */
export interface TabBarExtraContentMap {
  /** left 配置项。 */
  left?: any
  /** right 配置项。 */
  right?: any
}

/** TabItem 数据项结构。 */
export interface TabItem {
  /** 数据项唯一标识。 */
  key: string
  /** 展示标签。 */
  label: any
  /** 组件子内容。 */
  content?: string | number
  /** 内容面板；保留 content 作为纯文本简写。 */
  children?: any
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** closable 配置项。 */
  closable?: boolean
  /** closeIcon 图标内容。 */
  closeIcon?: any
  /** 图标内容。 */
  icon?: any
}

/** TabsProps 组件属性。 */
export interface TabsProps {
  /** 数据驱动渲染项。 */
  items: TabItem[]
  /** activeKey 标识键。 */
  activeKey?: string
  /** defaultActiveKey 标识键。 */
  defaultActiveKey?: string
  /** 值或状态变化时触发的回调。 */
  onChange?: (key: string) => void
  /** onEdit 事件回调。 */
  onEdit?: (eventOrKey: MouseEvent | string, action: 'add' | 'remove') => void
  /** 根节点内联样式。 */
  style?: TabsStyle
  /** 组件类型或语义类型。 */
  type?: TabsType
  /** 弹出层或内容展示位置。 */
  placement?: TabsPlacement
  /** tabPlacement 配置项。 */
  tabPlacement?: TabsExtendedPlacement
  /** 组件尺寸。 */
  size?: TabsSize
  /** centered 配置项。 */
  centered?: boolean
  /** destroyOnHidden 配置项。 */
  destroyOnHidden?: boolean
  /** hideAdd 配置项。 */
  hideAdd?: boolean
  /** addIcon 图标内容。 */
  addIcon?: any
  /** removeIcon 图标内容。 */
  removeIcon?: any
  /** indicator 配置项。 */
  indicator?: TabsIndicator
  /** 根节点附加类名。 */
  className?: string
  /** tabBarClassName 附加类名。 */
  tabBarClassName?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
  tabBarExtraContent?: TabBarExtraContentMap
}

let tabsIdSeed = 0

/** append Class Name 的内部工具函数。 */
const appendClassName = (base?: string, className?: string) => {
  if (!base) return className ?? ''
  return className ? `${base} ${className}` : base
}

/** 解析 Visual Style 的内部工具函数。 */
const resolveVisualStyle = (style?: TabsStyle, type?: TabsType): TabsStyle | undefined => {
  if (style) return style
  if (type === 'card' || type === 'editable-card') return 'box'
  if (type === 'line') return 'border'
  return undefined
}

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: TabsSize) => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'middle':
      return 'md'
    case 'large':
      return 'lg'
    default:
      return size
  }
}

/** 解析 Initial Active Key 的内部工具函数。 */
const resolveInitialActiveKey = (items: TabItem[], preferredKey?: string) => {
  if (preferredKey !== undefined && items.some(item => item.key === preferredKey)) {
    return preferredKey
  }
  return items.find(item => !item.disabled)?.key ?? items[0]?.key ?? ''
}

/** 归一化 Extra Content 的内部工具函数。 */

/** 构建 Tabs Class Name 的内部工具函数。 */
const buildTabsClassName = (
  style?: TabsStyle,
  placement?: TabsExtendedPlacement,
  size?: TabsSize,
  centered?: boolean,
  className?: string,
) => {
  let cls = 'tabs'
  if (style === 'box') cls += ' tabs-box'
  if (style === 'border') cls += ' tabs-border'
  if (style === 'lift') cls += ' tabs-lift'
  if (placement === 'bottom') cls += ' tabs-bottom'
  if (placement === 'start' || placement === 'end') cls += ' flex-col items-stretch'
  if (resolveSizeClass(size)) cls += ` tabs-${resolveSizeClass(size)}`
  if (centered && placement !== 'start' && placement !== 'end') cls += ' justify-center'
  if (className) cls += ` ${className}`
  return cls
}

/** 解析 Indicator Width 的内部工具函数。 */
const resolveIndicatorWidth = (size?: number | string) => {
  if (typeof size === 'number') return `${size}px`
  return size ?? '100%'
}

/** 解析 Indicator Alignment 的内部工具函数。 */
const resolveIndicatorAlignment = (align?: TabsIndicator['align']) => {
  switch (align) {
    case 'start':
      return 'self-start'
    case 'end':
      return 'self-end'
    default:
      return 'self-center'
  }
}

/** 构建 Panel Class Name 的内部工具函数。 */
const buildPanelClassName = (contentClassName?: string, active = true) =>
  appendClassName(
    appendClassName(
      'tab-content rounded-box border border-base-300 bg-base-100 p-5',
      active ? 'block' : 'hidden',
    ),
    contentClassName,
  )

/** Tabs 主组件：支持 items 内容面板、额外操作区与可编辑头部。 */
const Tabs: FC<TabsProps> = (
  {
    items,
    activeKey,
    defaultActiveKey,
    onChange,
    onEdit,
    style,
    type,
    placement,
    tabPlacement,
    size,
    centered,
    destroyOnHidden,
    hideAdd,
    addIcon,
    removeIcon,
    indicator,
    className,
    tabBarClassName,
    contentClassName,
  },
  slots: Record<string, any> = {},
) => {
  const normalizedItems = items ?? []
  const resolvedPlacement = tabPlacement ?? placement ?? 'top'
  const resolvedStyle = resolveVisualStyle(style, type)
  const currentSeed = ref(`rue-tabs-${tabsIdSeed++}`)
  const uncontrolledActiveKey = ref(
    resolveInitialActiveKey(normalizedItems, defaultActiveKey ?? activeKey),
  )
  const readPanelSlot = (key: string) => slots[key]
  const readPanelContent = (item: TabItem) =>
    item.content != null ? item.content : (item.children ?? readPanelSlot(item.key))
  const readExtraSlot = (side: string) => slots[side]
  const hasPanels = normalizedItems.some(item => readPanelContent(item) != null)
  const extraContent = { left: slots.left, right: slots.right }
  const isVertical = resolvedPlacement === 'start' || resolvedPlacement === 'end'
  const replaceDefaultIndicator = !!indicator && resolvedStyle === 'border'

  const currentActiveKey = computed(() => {
    const mergedActiveKey =
      activeKey ?? uncontrolledActiveKey.value ?? resolveInitialActiveKey(normalizedItems)

    return normalizedItems.some(item => item.key === mergedActiveKey)
      ? mergedActiveKey
      : resolveInitialActiveKey(normalizedItems, defaultActiveKey ?? activeKey)
  })
  const getEffectiveActiveKey = () => currentActiveKey.get()
  const currentActiveItem = computed(() =>
    normalizedItems.find(item => item.key === currentActiveKey.get()),
  )

  const commitChange = (key: string) => {
    if (key === getEffectiveActiveKey()) return
    if (activeKey === undefined) {
      uncontrolledActiveKey.value = key
    }
    if (onChange) onChange(key)
  }

  const handleEditAdd = (event: MouseEvent) => {
    if (onEdit) onEdit(event, 'add')
  }

  const rootClassName = appendClassName(
    appendClassName(appendClassName('rue-tabs', isVertical ? 'block' : 'block'), className),
    hasPanels ? 'w-full' : undefined,
  )
  const tabsClassName = buildTabsClassName(
    resolvedStyle,
    resolvedPlacement,
    size,
    centered,
    appendClassName(tabBarClassName, isVertical ? 'w-full' : undefined),
  )
  const addTrigger = type === 'editable-card' && hideAdd !== true && !!onEdit
  const RenderAddButtonNode = () => {
    if (!addTrigger) return <></>

    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm shrink-0"
        aria-label="新增标签"
        onClick={(event: MouseEvent) => handleEditAdd(event)}
      >
        {addIcon ?? '+'}
      </button>
    )
  }

  const RenderTabsNode = () => (
    <div
      role="tablist"
      aria-orientation={isVertical ? 'vertical' : 'horizontal'}
      className={tabsClassName}
    >
      {normalizedItems.map(item => {
        const closable = type === 'editable-card' && !!onEdit && (item.closable ?? !item.disabled)
        const tabId = `${currentSeed.value}-tab-${item.key}`
        const panelId = `${currentSeed.value}-panel-${item.key}`

        return (
          <button
            type="button"
            role="tab"
            id={tabId}
            key={item.key}
            aria-selected={getEffectiveActiveKey() === item.key ? 'true' : 'false'}
            aria-controls={item.content != null ? panelId : undefined}
            className={appendClassName(
              appendClassName(
                appendClassName(
                  appendClassName(
                    appendClassName(
                      'tab',
                      getEffectiveActiveKey() === item.key
                        ? appendClassName(
                            'tab-active',
                            replaceDefaultIndicator
                              ? 'rue-tabs-indicator-active before:hidden'
                              : undefined,
                          )
                        : undefined,
                    ),
                    item.disabled ? 'tab-disabled' : undefined,
                  ),
                  isVertical ? 'justify-start' : undefined,
                ),
                closable ? 'gap-2 pr-2' : undefined,
              ),
              appendClassName(
                item.className,
                resolvedStyle === 'lift' && getEffectiveActiveKey() !== item.key
                  ? '![--tab-border-color:var(--color-base-300)]'
                  : undefined,
              ),
            )}
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return
              commitChange(item.key)
            }}
          >
            {item.icon != null ? (
              <span
                className="inline-flex shrink-0 items-center justify-center"
                aria-hidden={item.label != null ? 'true' : undefined}
              >
                {item.icon}
              </span>
            ) : null}
            <span className="relative inline-flex min-w-0 flex-col">
              <span className="truncate">{item.label}</span>
              {getEffectiveActiveKey() === item.key && indicator ? (
                <span
                  className={appendClassName(
                    'mt-1 inline-flex h-0.5 rounded-full bg-current opacity-70',
                    appendClassName(
                      resolveIndicatorAlignment(indicator.align),
                      indicator.className,
                    ),
                  )}
                  style={{
                    width: resolveIndicatorWidth(indicator.size),
                    ...indicator.style,
                  }}
                />
              ) : null}
            </span>
            {closable ? (
              <span
                role="button"
                tabindex={item.disabled ? -1 : 0}
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100"
                aria-label={`移除 ${item.key}`}
                onClick={(event: MouseEvent) => {
                  event.preventDefault()
                  event.stopPropagation()
                  if (item.disabled || !onEdit) return
                  onEdit(item.key, 'remove')
                }}
                onKeyDown={(event: KeyboardEvent) => {
                  if (event.key !== 'Enter' && event.key !== ' ') {
                    return
                  }
                  event.preventDefault()
                  event.stopPropagation()
                  if (item.disabled || !onEdit) return
                  onEdit(item.key, 'remove')
                }}
              >
                {item.closeIcon ?? removeIcon ?? '×'}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )

  const readVisiblePanels = () =>
    normalizedItems.filter(
      item =>
        readPanelContent(item) != null &&
        (!destroyOnHidden || item.key === getEffectiveActiveKey()),
    )
  const RenderPanelsNode = () => {
    const CompiledRow1 = ({ rowArg0 }: { rowArg0: any }) => {
      const item = rowArg0

      return (
        <div
          key={`${item.key}-panel`}
          role="tabpanel"
          id={`${currentSeed.value}-panel-${item.key}`}
          aria-labelledby={`${currentSeed.value}-tab-${item.key}`}
          aria-hidden={item.key === getEffectiveActiveKey() ? 'false' : 'true'}
          className={buildPanelClassName(
            item.contentClassName,
            item.key === getEffectiveActiveKey(),
          )}
        >
          {item.content != null ? (
            <span>{String(item.content)}</span>
          ) : (
            <>{readPanelContent(item)}</>
          )}
        </div>
      )
    }

    return (
      <>
        {readVisiblePanels().map(item => (
          <CompiledRow1 key={item.key} rowArg0={item} />
        ))}
      </>
    )
  }

  if (isVertical) {
    return (
      <div className={rootClassName}>
        <div
          className={appendClassName(
            'flex items-start gap-4',
            resolvedPlacement === 'end' ? 'flex-row-reverse' : undefined,
          )}
        >
          <div className="flex w-full max-w-xs shrink-0 flex-col gap-3">
            {extraContent.left != null ? (
              <div className="shrink-0">{readExtraSlot('left')}</div>
            ) : null}
            <RenderTabsNode />
            {addTrigger || extraContent.right != null ? (
              <div className="flex flex-wrap items-center gap-2">
                <RenderAddButtonNode />
                {extraContent.right != null ? (
                  <div className="shrink-0">{readExtraSlot('right')}</div>
                ) : null}
              </div>
            ) : null}
          </div>
          {hasPanels ? (
            <div className={appendClassName('min-w-0 flex-1', contentClassName)}>
              <RenderPanelsNode />
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={rootClassName}>
      <div
        className={appendClassName(
          'flex gap-4',
          resolvedPlacement === 'bottom' ? 'flex-col-reverse' : 'flex-col',
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          {extraContent.left != null ? (
            <div className="shrink-0">{readExtraSlot('left')}</div>
          ) : null}
          <div
            className={appendClassName(
              'min-w-0 flex-1',
              centered ? 'flex justify-center' : undefined,
            )}
          >
            <RenderTabsNode />
          </div>
          <RenderAddButtonNode />
          {extraContent.right != null ? (
            <div className="shrink-0">{readExtraSlot('right')}</div>
          ) : null}
        </div>
        {hasPanels ? (
          <div className={appendClassName('min-w-0 flex-1', contentClassName)}>
            <RenderPanelsNode />
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** 默认导出标签页组件。 */
export default Tabs
