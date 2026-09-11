/*
Collapse 组件概述
- 兼容旧版 daisyUI 风格的 children 组合写法。
- 新增 items 驱动的分组折叠能力，支持受控/非受控、手风琴、额外信息与尺寸等增强 API。
*/
import type { FC } from '@rue-js/rue'
import { computed, ref, createContext, useContext } from '@rue-js/rue'

import { provideContext } from '@rue-js/rue/internal/app'

const CollapseOpenContext = createContext<(() => boolean) | undefined>(undefined)
let collapseGroupSeed = 0

/** CollapseItemKey 标识键类型。 */
export type CollapseItemKey = string | number
/** CollapseIcon 类型。 */
export type CollapseIcon = 'arrow' | 'plus'
/** CollapseSize 尺寸类型。 */
export type CollapseSize = 'sm' | 'md' | 'lg' | 'small' | 'middle' | 'large'
/** CollapseCollapsible 类型。 */
export type CollapseCollapsible = 'header' | 'icon' | 'disabled'

/** CollapseItem 数据项结构。 */
export interface CollapseItem {
  /** 数据项唯一标识。 */
  key?: CollapseItemKey
  /** 展示标签。 */
  label?: any
  /** 标题内容。 */
  title?: any
  /** 描述内容。 */
  description?: any
  /** 额外操作或补充内容。 */
  extra?: any
  /** 组件子内容。 */
  children?: any
  /** 主体内容。 */
  content?: any
  /** 根节点附加类名。 */
  className?: string
  /** titleClassName 附加类名。 */
  titleClassName?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** descriptionClassName 附加类名。 */
  descriptionClassName?: string
  /** extraClassName 附加类名。 */
  extraClassName?: string
  /** 图标内容。 */
  icon?: CollapseIcon
  /** showArrow 配置项。 */
  showArrow?: boolean
  /** 受控打开状态。 */
  open?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** collapsible 配置项。 */
  collapsible?: CollapseCollapsible
}

/** CollapseChangeContext 事件或渲染上下文。 */
export interface CollapseChangeContext {
  /** 数据项唯一标识。 */
  key: CollapseItemKey
  /** index 配置项。 */
  index: number
  /** 受控打开状态。 */
  open: boolean
  /** item 区域配置。 */
  item?: CollapseItem
}

/** CollapseProps 组件属性。 */
export interface CollapseProps {
  /** 图标内容。 */
  icon?: CollapseIcon
  /** arrow 配置项。 */
  arrow?: boolean
  /** plus 配置项。 */
  plus?: boolean
  /** showArrow 配置项。 */
  showArrow?: boolean
  /** 受控打开状态。 */
  open?: boolean
  /** 关闭按钮区域配置。 */
  close?: boolean
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean
  /** activeKey 标识键。 */
  activeKey?: CollapseItemKey | ReadonlyArray<CollapseItemKey> | null
  /** defaultActiveKey 标识键。 */
  defaultActiveKey?: CollapseItemKey | ReadonlyArray<CollapseItemKey> | null
  /** accordion 配置项。 */
  accordion?: boolean
  /** bordered 配置项。 */
  bordered?: boolean
  /** ghost 配置项。 */
  ghost?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** collapsible 配置项。 */
  collapsible?: CollapseCollapsible
  /** 组件尺寸。 */
  size?: CollapseSize
  /** expandIconPlacement 配置项。 */
  expandIconPlacement?: 'start' | 'end'
  /** tabIndex 配置项。 */
  tabIndex?: number
  /** tag 配置项。 */
  tag?: 'div' | 'details'
  /** 根节点附加类名。 */
  className?: string
  /** titleClassName 附加类名。 */
  titleClassName?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<CollapseItem>
  /** 组件子内容。 */
  children?: any
  /** 值或状态变化时触发的回调。 */
  onChange?: (
    nextValue: CollapseItemKey | ReadonlyArray<CollapseItemKey> | null,
    context: CollapseChangeContext,
  ) => void
}

interface CollapsePartProps {
  as?: 'div' | 'summary'
  className?: string
  description?: any
  extra?: any
  descriptionClassName?: string
  extraClassName?: string
  children?: any
}

interface NormalizedCollapseItem extends CollapseItem {
  key: CollapseItemKey
  index: number
  label: any
  content: any
}

/** append Class Name 的内部工具函数。 */
const appendClassName = (base?: string, className?: string) => {
  if (!base) return className ?? ''
  return className ? `${base} ${className}` : base
}

/** 读取 Collapse Group Roots 的内部工具函数。 */

/** 读取 Direct Collapse Title 的内部工具函数。 */
const getDirectCollapseTitle = (root: Element) => {
  return Array.from(root.children).find(
    child => child instanceof HTMLElement && child.classList.contains('collapse-title'),
  ) as HTMLElement | undefined
}

/** 判断 Title Trigger Target 的内部工具函数。 */
const isTitleTriggerTarget = (root: Element, target: EventTarget | null) => {
  if (!(target instanceof Node)) return false
  const title = getDirectCollapseTitle(root)
  return !!title?.contains(target)
}

/** 读取 Direct Collapse Input 的内部工具函数。 */
const getDirectCollapseInput = (root: Element) => {
  return Array.from(root.children).find(
    child =>
      child instanceof HTMLInputElement && (child.type === 'checkbox' || child.type === 'radio'),
  ) as HTMLInputElement | undefined
}

/** sync Collapse Panel State 的内部工具函数。 */

/** unique Keys 的内部工具函数。 */
const uniqueKeys = (keys: ReadonlyArray<CollapseItemKey>) => {
  const next: CollapseItemKey[] = []
  keys.forEach(key => {
    if (!next.some(current => current === key)) {
      next.push(key)
    }
  })
  return next
}

/** 归一化 Size 的内部工具函数。 */
const normalizeSize = (size?: CollapseSize) => {
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

/** 归一化 Icon 的内部工具函数。 */
const normalizeIcon = (
  icon: CollapseIcon | undefined,
  arrow: boolean | undefined,
  plus: boolean | undefined,
) => {
  if (icon) return icon
  if (plus) return 'plus'
  if (arrow) return 'arrow'
  return undefined
}

/** key Value To Array 的内部工具函数。 */
const keyValueToArray = (
  value: CollapseItemKey | ReadonlyArray<CollapseItemKey> | null | undefined,
) => {
  if (Array.isArray(value)) return value
  if (value == null) return []
  return [value]
}

/** 归一化 Open Keys 的内部工具函数。 */
const normalizeOpenKeys = (
  value: CollapseItemKey | ReadonlyArray<CollapseItemKey> | null | undefined,
  accordion?: boolean,
) => {
  const normalized = uniqueKeys(keyValueToArray(value))
  return accordion ? normalized.slice(0, 1) : normalized
}

/** 解析 Title Size Class 的内部工具函数。 */
const resolveTitleSizeClass = (size?: CollapseSize) => {
  switch (normalizeSize(size)) {
    case 'sm':
      return 'min-h-0 py-3 text-sm'
    case 'lg':
      return 'min-h-0 py-5 text-lg'
    default:
      return ''
  }
}

/** 解析 Content Size Class 的内部工具函数。 */
const resolveContentSizeClass = (size?: CollapseSize) => {
  switch (normalizeSize(size)) {
    case 'sm':
      return 'pt-0 pb-3 text-sm'
    case 'lg':
      return 'pt-0 pb-5 text-base'
    default:
      return ''
  }
}

/** resolve Legacy State Class 的内部工具函数。 */

/** 解析 Items Default Open Keys 的内部工具函数。 */
const resolveItemsDefaultOpenKeys = (
  items: ReadonlyArray<NormalizedCollapseItem>,
  defaultActiveKey: CollapseProps['defaultActiveKey'],
  accordion?: boolean,
) => {
  if (defaultActiveKey !== undefined) {
    return normalizeOpenKeys(defaultActiveKey, accordion)
  }
  return normalizeOpenKeys(
    items.filter(item => item.open).map(item => item.key),
    accordion,
  )
}

/** 构建 Next Open Keys 的内部工具函数。 */
const buildNextOpenKeys = (
  currentKeys: ReadonlyArray<CollapseItemKey>,
  key: CollapseItemKey,
  shouldOpen: boolean,
  accordion?: boolean,
) => {
  if (accordion) {
    return shouldOpen ? [key] : []
  }
  if (shouldOpen) {
    return uniqueKeys([...currentKeys, key])
  }
  return currentKeys.filter(current => current !== key)
}

/** 解析 Group Class Name 的内部工具函数。 */
const resolveGroupClassName = (
  bordered: boolean,
  ghost: boolean | undefined,
  className?: string,
) => {
  let cls = bordered
    ? 'overflow-hidden rounded-box border border-base-300 bg-base-100 divide-y divide-base-300'
    : 'space-y-3'
  if (ghost) {
    cls += ' bg-transparent'
  }
  return appendClassName(cls, className)
}

/** 解析 Panel Surface Class 的内部工具函数。 */
const resolvePanelSurfaceClass = (bordered: boolean, ghost: boolean | undefined) => {
  if (bordered) return ''
  if (ghost) return 'bg-transparent'
  return 'rounded-box border border-base-300 bg-base-100'
}

/** Arrow Icon 的内部工具函数。 */
const ArrowIcon: FC<{ open: boolean }> = ({ open }) => {
  return (
    <span
      data-rue-collapse-arrow-icon="true"
      aria-hidden="true"
      className={`inline-flex size-5 items-center justify-center transition-transform duration-200 ${open ? 'rotate-90' : ''}`.trim()}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="size-4"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m7 4 6 6-6 6" />
      </svg>
    </span>
  )
}

/** Plus Icon 的内部工具函数。 */
const PlusIcon: FC<{ open: boolean }> = ({ open }) => {
  return (
    <span aria-hidden="true" className="relative inline-flex size-5 items-center justify-center">
      <span className="absolute h-0.5 w-3 rounded-full bg-current" />
      <span
        data-rue-collapse-plus-vertical="true"
        className={`absolute h-3 w-0.5 rounded-full bg-current transition-opacity duration-200 ${open ? 'opacity-0' : 'opacity-100'}`.trim()}
      />
    </span>
  )
}

/** 渲染 Expand Icon 的内部工具函数。 */
const ExpandIcon: FC<{ icon: CollapseIcon; open: boolean }> = ({ icon, open }) => {
  return icon === 'plus' ? <PlusIcon open={open} /> : <ArrowIcon open={open} />
}

/** 渲染 Title Body 的内部工具函数。 */
const RenderTitleBody = ({
  arg0: title,
  arg1: description,
  arg2: extra,
  arg3: descriptionClassName,
  arg4: extraClassName,
}: {
  arg0: any
  arg1: any
  arg2: any
  arg3?: string
  arg4?: string
}) => {
  if (description == null && extra == null) {
    return <>{String(title ?? '')}</>
  }

  return (
    <div className="flex w-full items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div>{String(title ?? '')}</div>
        {description != null ? (
          <div className={appendClassName('mt-1 text-xs opacity-70', descriptionClassName)}>
            {String(description ?? '')}
          </div>
        ) : null}
      </div>
      {extra != null ? (
        <div
          className={appendClassName('shrink-0 text-xs opacity-70', extraClassName)}
          onClick={(event: MouseEvent) => event.stopPropagation()}
          onKeyDown={(event: KeyboardEvent) => event.stopPropagation()}
        >
          {String(extra ?? '')}
        </div>
      ) : null}
    </div>
  )
}

/** items 模式统一使用状态类驱动展开，增强布局与交互能力。 */
const Collapse: FC<CollapseProps> = ({
  icon,
  arrow,
  plus,
  showArrow,
  open,
  close,
  defaultOpen,
  activeKey,
  defaultActiveKey,
  accordion,
  bordered,
  ghost,
  disabled,
  collapsible,
  size,
  expandIconPlacement = 'end',
  tabIndex,
  tag = 'div',
  className,
  titleClassName,
  contentClassName,
  items,
  children,
  onChange,
}) => {
  const normalizedItems: NormalizedCollapseItem[] =
    items?.map((item, index) => ({
      ...item,
      key: item.key ?? index,
      index,
      label: item.label ?? item.title,
      content: item.content,
    })) ?? []
  const hasItems = normalizedItems.length > 0
  const resolvedBordered = bordered ?? hasItems
  const resolvedIcon = normalizeIcon(icon, arrow, plus)
  const hasManagedIcon = showArrow === false ? false : !!resolvedIcon
  const generatedGroupName = ref(`rue-collapse-${collapseGroupSeed++}`)
  const uncontrolledOpenKeys = ref(
    resolveItemsDefaultOpenKeys(normalizedItems, defaultActiveKey, accordion),
  )
  const getCurrentOpenKeys = () => {
    const keys =
      activeKey !== undefined ? normalizeOpenKeys(activeKey, accordion) : uncontrolledOpenKeys.value
    return Array.isArray(keys) ? keys : []
  }

  const mergedOpenKeys = computed(() => getCurrentOpenKeys())

  if (hasItems) {
    const CompiledRow1 = ({
      rowArg0,
      openKeys,
      disabled,
      collapsible,
      size,
      titleClassName,
      contentClassName,
      expandIconPlacement,
    }: {
      rowArg0: any
      openKeys: { get: () => CollapseItemKey[] }
      disabled?: boolean
      collapsible?: CollapseCollapsible
      size?: CollapseSize
      titleClassName?: string
      contentClassName?: string
      expandIconPlacement?: 'start' | 'end'
    }) => {
      const item = rowArg0

      const itemIcon = item.icon ?? resolvedIcon
      const itemShowArrow = item.showArrow ?? hasManagedIcon
      const itemCollapsible =
        disabled || item.disabled ? 'disabled' : (item.collapsible ?? collapsible ?? 'header')
      const itemOpen = computed(() => openKeys.get().some(key => key === item.key))
      const hasHeaderMeta = item.description != null || item.extra != null
      const iconOffsetClassName = hasHeaderMeta ? 'pt-1' : 'mt-0.5'
      const panelSurfaceClass = resolvePanelSurfaceClass(resolvedBordered, ghost)
      const panelClassName = computed(() =>
        appendClassName(
          appendClassName(
            appendClassName('collapse', itemOpen.get() ? 'collapse-open' : 'collapse-close'),
            panelSurfaceClass,
          ),
          item.className,
        ),
      )
      const mergedTitleClassName = appendClassName(
        appendClassName('collapse-title', resolveTitleSizeClass(size)),
        appendClassName(titleClassName, item.titleClassName),
      )
      const mergedContentClassName = appendClassName(
        appendClassName('collapse-content', resolveContentSizeClass(size)),
        appendClassName(contentClassName, item.contentClassName),
      )
      const HeaderBodyView = () => (
        <RenderTitleBody
          arg0={item.label}
          arg1={item.description}
          arg2={item.extra}
          arg3={item.descriptionClassName}
          arg4={item.extraClassName}
        />
      )
      const toggle = (source?: Element | null) => {
        if (itemCollapsible === 'disabled') return
        const nextOpen = !getCurrentOpenKeys().some(key => key === item.key)
        commitChange(item, nextOpen, source)
      }
      const headerInteractiveProps =
        itemCollapsible === 'header'
          ? {
              role: 'button',
              tabIndex: 0,
              onClick: (event: MouseEvent) => toggle(event.currentTarget as Element),
              onKeyDown: (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  toggle(event.currentTarget as Element)
                }
              },
            }
          : {}

      return (
        <div
          className={panelClassName.get()}
          key={item.key}
          data-rue-collapse-group={groupName}
          data-rue-collapse-index={String(item.index)}
        >
          <div
            className={appendClassName(
              mergedTitleClassName,
              itemCollapsible === 'header' ? 'cursor-pointer select-none' : '',
            )}
            aria-expanded={itemOpen.get() ? 'true' : 'false'}
            {...headerInteractiveProps}
          >
            <div className="flex w-full items-start gap-3">
              {itemShowArrow && itemIcon && expandIconPlacement === 'start' ? (
                itemCollapsible === 'icon' ? (
                  <button
                    data-rue-collapse-icon-trigger="true"
                    type="button"
                    className={appendClassName(
                      'inline-flex size-7 shrink-0 self-start items-center justify-center rounded-full border border-transparent transition-colors hover:bg-base-200/70',
                      iconOffsetClassName,
                    )}
                    aria-label={itemOpen.get() ? '收起' : '展开'}
                    onClick={(event: MouseEvent) => {
                      event.stopPropagation()
                      toggle(event.currentTarget as Element)
                    }}
                  >
                    <ExpandIcon icon={itemIcon} open={itemOpen.get()} />
                  </button>
                ) : (
                  <span
                    className={appendClassName(
                      'inline-flex size-7 shrink-0 self-start items-center justify-center',
                      iconOffsetClassName,
                    )}
                  >
                    <ExpandIcon icon={itemIcon} open={itemOpen.get()} />
                  </span>
                )
              ) : null}
              <div className="min-w-0 flex-1">
                <HeaderBodyView />
              </div>
              {itemShowArrow && itemIcon && expandIconPlacement === 'end' ? (
                itemCollapsible === 'icon' ? (
                  <button
                    data-rue-collapse-icon-trigger="true"
                    type="button"
                    className={appendClassName(
                      'inline-flex size-7 shrink-0 self-start items-center justify-center rounded-full border border-transparent transition-colors hover:bg-base-200/70',
                      iconOffsetClassName,
                    )}
                    aria-label={itemOpen.get() ? '收起' : '展开'}
                    onClick={(event: MouseEvent) => {
                      event.stopPropagation()
                      toggle(event.currentTarget as Element)
                    }}
                  >
                    <ExpandIcon icon={itemIcon} open={itemOpen.get()} />
                  </button>
                ) : (
                  <span
                    className={appendClassName(
                      'inline-flex size-7 shrink-0 self-start items-center justify-center',
                      iconOffsetClassName,
                    )}
                  >
                    <ExpandIcon icon={itemIcon} open={itemOpen.get()} />
                  </span>
                )
              ) : null}
            </div>
          </div>
          <div className={mergedContentClassName}>{String(item.content ?? '')}</div>
        </div>
      )
    }

    const groupName = generatedGroupName.value

    const commitChange = (
      item: NormalizedCollapseItem,
      nextOpen: boolean,
      source?: Element | null,
    ) => {
      const nextOpenKeys = buildNextOpenKeys(getCurrentOpenKeys(), item.key, nextOpen, accordion)
      const itemOpen = nextOpenKeys.some(key => key === item.key)

      if (activeKey === undefined) {
        uncontrolledOpenKeys.value = nextOpenKeys
      }

      if (onChange) {
        onChange(accordion ? (nextOpenKeys[0] ?? null) : nextOpenKeys, {
          key: item.key,
          index: item.index,
          open: itemOpen,
          item,
        })
      }
    }

    return (
      <div className={resolveGroupClassName(resolvedBordered, ghost, className)}>
        {normalizedItems.map((rowArg0: any, rowIndex: number) => (
          <CompiledRow1
            key={rowArg0.key}
            rowArg0={rowArg0}
            openKeys={mergedOpenKeys}
            disabled={disabled}
            collapsible={collapsible}
            size={size}
            titleClassName={titleClassName}
            contentClassName={contentClassName}
            expandIconPlacement={expandIconPlacement}
          />
        ))}
      </div>
    )
  }

  const interactiveOpen = ref(!!open || (!close && !!defaultOpen))
  provideContext(CollapseOpenContext, () => () => interactiveOpen.value)
  let cls = 'collapse'
  if (showArrow !== false && (arrow || resolvedIcon === 'arrow')) cls += ' collapse-arrow'
  if (showArrow !== false && (plus || resolvedIcon === 'plus')) cls += ' collapse-plus'
  if (open) cls += ' collapse-open'
  if (close) cls += ' collapse-close'
  if (!open && !close && defaultOpen) cls += ' collapse-open'
  if (disabled) cls += ' opacity-70'
  const panelSurfaceClass = resolvePanelSurfaceClass(!!resolvedBordered, ghost)
  if (panelSurfaceClass) cls += ` ${panelSurfaceClass}`
  if (className) cls += ` ${className}`

  if (tag === 'details') {
    return (
      <details className={cls} open={open || (!close && defaultOpen) ? true : undefined}>
        {children}
      </details>
    )
  }

  const resolvedTabIndex = typeof tabIndex === 'number' ? tabIndex : undefined
  const hasForcedLegacyState = !!open || !!close || !!defaultOpen

  return (
    <div
      className={appendClassName(
        cls,
        hasForcedLegacyState
          ? undefined
          : interactiveOpen.value
            ? 'collapse-open'
            : 'collapse-close',
      )}
      tabindex={resolvedTabIndex === undefined ? undefined : String(resolvedTabIndex)}
      onMouseDown={(event: MouseEvent) => {
        const root = event.currentTarget as HTMLDivElement
        root.dataset.rueCollapsePointerDown = 'true'
      }}
      onClick={(event: MouseEvent) => {
        const root = event.currentTarget as HTMLDivElement
        const target = event.target
        const input = getDirectCollapseInput(root)
        const clickedTitle = isTitleTriggerTarget(root, target)
        const clickedInput = target instanceof HTMLInputElement && target === input

        if (!clickedTitle && !clickedInput) {
          delete root.dataset.rueCollapsePointerDown
          return
        }

        if (resolvedTabIndex !== undefined) {
          root.tabIndex = resolvedTabIndex
          root.setAttribute('tabindex', String(resolvedTabIndex))
          root.focus()
        }
        if (!hasForcedLegacyState) {
          if (input) {
            if (!clickedInput) {
              if (input.type === 'checkbox') {
                input.checked = !input.checked
              } else if (input.type === 'radio') {
                input.checked = true
              }
            }
            interactiveOpen.value = input.checked
          } else {
            interactiveOpen.value = !interactiveOpen.value
          }
        }
        delete root.dataset.rueCollapsePointerDown
      }}
      onFocus={(event: FocusEvent) => {
        if (resolvedTabIndex === undefined || hasForcedLegacyState) return
        const root = event.currentTarget as HTMLDivElement
        if (root.dataset.rueCollapsePointerDown === 'true') return
        interactiveOpen.value = true
      }}
      onBlur={(event: FocusEvent) => {
        delete (event.currentTarget as HTMLDivElement).dataset.rueCollapsePointerDown
        if (resolvedTabIndex === undefined || hasForcedLegacyState) return
        interactiveOpen.value = false
      }}
      onKeyDown={(event: KeyboardEvent) => {
        if (resolvedTabIndex === undefined || hasForcedLegacyState) return
        if (event.key !== 'Enter' && event.key !== ' ') return
        if (!isTitleTriggerTarget(event.currentTarget as HTMLDivElement, event.target)) return

        event.preventDefault()
        const root = event.currentTarget as HTMLDivElement
        interactiveOpen.value = !interactiveOpen.value
      }}
      onChange={(event: Event) => {
        if (hasForcedLegacyState) return
        const target = event.target as HTMLInputElement | null
        if (!target || (target.type !== 'checkbox' && target.type !== 'radio')) return
        interactiveOpen.value = target.checked
      }}
    >
      {children}
    </div>
  )
}

/** 标题子组件：支持简单标题，也支持 description / extra 复合头部。 */
const Title: FC<CollapsePartProps> = ({
  as = 'div',
  className,
  description,
  extra,
  descriptionClassName,
  extraClassName,
  children,
}) => {
  const isOpen = useContext(CollapseOpenContext)
  const cls = appendClassName('collapse-title', className)
  const BodyView = () => (
    <RenderTitleBody
      arg0={children}
      arg1={description}
      arg2={extra}
      arg3={descriptionClassName}
      arg4={extraClassName}
    />
  )
  if (as === 'summary')
    return (
      <summary className={cls} aria-expanded={isOpen ? String(isOpen()) : undefined}>
        <BodyView />
      </summary>
    )
  return (
    <div className={cls} aria-expanded={isOpen ? String(isOpen()) : undefined}>
      <BodyView />
    </div>
  )
}

/** 内容子组件：统一输出 collapse-content，便于旧写法与增强写法复用。 */
const Content: FC<CollapsePartProps> = ({ className, children }) => {
  return <div className={appendClassName('collapse-content', className)}>{children}</div>
}

type CollapseCompound = FC<CollapseProps> & {
  Title: FC<CollapsePartProps>
  Content: FC<CollapsePartProps>
}

const CollapseCompound: CollapseCompound = /*#__PURE__*/ Object.assign(Collapse, {
  Title,
  Content,
})

/** 默认导出折叠面板组件。 */
export default CollapseCompound
