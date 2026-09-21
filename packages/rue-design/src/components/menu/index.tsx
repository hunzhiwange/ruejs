import { createContext, useContext } from '@rue-js/rue'
import { provideContext } from '@rue-js/rue/internal/app'
/*
Menu 组件概述
- 保留 Rue 当前 menu 视觉结构，并补齐更接近成熟组件库的导航能力。
- 同时支持 children 组合写法、旧版 kind 数据结构，以及 items 驱动的增强写法。
*/
import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { useRouter } from '@rue-js/router'

/** MenuKey 标识键类型。 */
export type MenuKey = string | number
/** MenuSize 尺寸类型。 */
export type MenuSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'medium' | 'large'
/** MenuDirection 位置或方向类型。 */
export type MenuDirection = 'vertical' | 'horizontal'
/** MenuMode 类型。 */
export type MenuMode = 'vertical' | 'horizontal' | 'inline'
/** MenuTriggerSubMenuAction 类型。 */
export type MenuTriggerSubMenuAction = 'hover' | 'click'

/** MenuClickInfo 接口。 */
export interface MenuClickInfo {
  /** 数据项唯一标识。 */
  key?: MenuKey
  /** keyPath 配置项。 */
  keyPath: MenuKey[]
  /** item 区域配置。 */
  item?: MenuDataEntry
  /** domEvent 配置项。 */
  domEvent: MouseEvent
}

/** MenuSelectInfo 接口。 */
export interface MenuSelectInfo extends MenuClickInfo {
  /** 数据项唯一标识。 */
  key: MenuKey
  /** selectedKeys 标识键集合。 */
  selectedKeys: MenuKey[]
}

/** MenuTitleData 数据项结构。 */
export interface MenuTitleData {
  /** kind 配置项。 */
  kind: 'title'
  /** 自定义渲染的宿主元素。 */
  as?: 'li' | 'h2'
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
}

/** MenuDropdownToggleData 数据项结构。 */
export interface MenuDropdownToggleData {
  /** show 配置项。 */
  show?: boolean
  /** visible 配置项。 */
  visible?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 点击时触发的回调。 */
  onClick?: (event: MouseEvent) => void
  /** 组件子内容。 */
  children?: any
}

/** MenuDropdownData 数据项结构。 */
export interface MenuDropdownData {
  /** show 配置项。 */
  show?: boolean
  /** visible 配置项。 */
  visible?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<MenuDataEntry>
}

/** MenuLegacySubmenuData 数据项结构。 */
export interface MenuLegacySubmenuData {
  /** 根节点附加类名。 */
  className?: string
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<MenuDataEntry>
}

/** MenuItemData 数据项结构。 */
export interface MenuItemData {
  /** kind 配置项。 */
  kind?: 'item'
  /** 组件类型或语义类型。 */
  type?: undefined
  /** 数据项唯一标识。 */
  key?: MenuKey
  /** 自定义渲染的宿主元素。 */
  as?: 'a' | 'button' | 'span'
  /** 链接地址。 */
  href?: string
  /** to 配置项。 */
  to?: string
  /** 链接或定位目标。 */
  target?: string
  /** 链接 rel 属性。 */
  rel?: string
  /** 标题内容。 */
  title?: string
  /** 展示标签。 */
  label?: any
  /** 图标内容。 */
  icon?: any
  /** 额外操作或补充内容。 */
  extra?: any
  /** danger 配置项。 */
  danger?: boolean
  /** 点击时触发的回调。 */
  onClick?: (event: MouseEvent) => void
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 是否处于激活态。 */
  active?: boolean
  /** selected 配置项。 */
  selected?: boolean
  /** focus 配置项。 */
  focus?: boolean
  /** liClassName 附加类名。 */
  liClassName?: string
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** dropdownToggle 配置项。 */
  dropdownToggle?: MenuDropdownToggleData
  /** dropdown 配置项。 */
  dropdown?: MenuDropdownData
  /** submenu 配置项。 */
  submenu?: MenuLegacySubmenuData
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** MenuSubMenuData 数据项结构。 */
export interface MenuSubMenuData {
  /** 组件类型或语义类型。 */
  type: 'submenu'
  /** 数据项唯一标识。 */
  key?: MenuKey
  /** 展示标签。 */
  label?: any
  /** 图标内容。 */
  icon?: any
  /** 额外操作或补充内容。 */
  extra?: any
  /** 标题内容。 */
  title?: string
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** popupClassName 附加类名。 */
  popupClassName?: string
  /** 组件子内容。 */
  children?: ReadonlyArray<MenuDataEntry>
  /** onTitleClick 事件回调。 */
  onTitleClick?: (info: { key?: MenuKey; domEvent: MouseEvent }) => void
}

/** MenuGroupData 数据项结构。 */
export interface MenuGroupData {
  /** 组件类型或语义类型。 */
  type: 'group'
  /** 数据项唯一标识。 */
  key?: MenuKey
  /** 展示标签。 */
  label?: any
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: ReadonlyArray<MenuDataEntry>
}

/** MenuDividerData 数据项结构。 */
export interface MenuDividerData {
  /** 组件类型或语义类型。 */
  type: 'divider'
  /** 数据项唯一标识。 */
  key?: MenuKey
  /** 根节点附加类名。 */
  className?: string
  /** dashed 配置项。 */
  dashed?: boolean
}

/** MenuDataEntry 类型。 */
export type MenuDataEntry =
  | MenuTitleData
  | MenuItemData
  | MenuSubMenuData
  | MenuGroupData
  | MenuDividerData

/** MenuProps 组件属性。 */
export interface MenuProps {
  /** 组件尺寸。 */
  size?: MenuSize
  /** 布局方向。 */
  direction?: MenuDirection
  /** mode 配置项。 */
  mode?: MenuMode
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** selectable 配置项。 */
  selectable?: boolean
  /** multiple 配置项。 */
  multiple?: boolean
  /** inlineIndent 配置项。 */
  inlineIndent?: number
  /** triggerSubMenuAction 配置项。 */
  triggerSubMenuAction?: MenuTriggerSubMenuAction
  /** selectedKeys 标识键集合。 */
  selectedKeys?: ReadonlyArray<MenuKey>
  /** defaultSelectedKeys 标识键集合。 */
  defaultSelectedKeys?: ReadonlyArray<MenuKey>
  /** openKeys 标识键集合。 */
  openKeys?: ReadonlyArray<MenuKey>
  /** defaultOpenKeys 标识键集合。 */
  defaultOpenKeys?: ReadonlyArray<MenuKey>
  /** 点击时触发的回调。 */
  onClick?: (info: MenuClickInfo) => void
  /** 选中项时触发的回调。 */
  onSelect?: (info: MenuSelectInfo) => void
  /** 取消选中项时触发的回调。 */
  onDeselect?: (info: MenuSelectInfo) => void
  /** 打开状态变化时触发的回调。 */
  onOpenChange?: (openKeys: MenuKey[]) => void
  /** 组件子内容。 */
  children?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<MenuDataEntry>
}

/** MenuItemProps 组件属性。 */
export interface MenuItemProps {
  label?: string | number
  /** eventKey 标识键。 */
  eventKey?: MenuKey
  /** 自定义渲染的宿主元素。 */
  as?: 'a' | 'button' | 'span'
  /** 链接地址。 */
  href?: string
  /** to 配置项。 */
  to?: string
  /** 链接或定位目标。 */
  target?: string
  /** 链接 rel 属性。 */
  rel?: string
  /** 标题内容。 */
  title?: string
  /** 图标内容。 */
  icon?: any
  /** 额外操作或补充内容。 */
  extra?: any
  /** danger 配置项。 */
  danger?: boolean
  /** 点击时触发的回调。 */
  onClick?: (event: MouseEvent) => void
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 是否处于激活态。 */
  active?: boolean
  /** selected 配置项。 */
  selected?: boolean
  /** focus 配置项。 */
  focus?: boolean
  /** liClassName 附加类名。 */
  liClassName?: string
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** MenuTitleProps 组件属性。 */
export interface MenuTitleProps {
  /** 自定义渲染的宿主元素。 */
  as?: 'li' | 'h2'
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
}

/** MenuDropdownProps 组件属性。 */
export interface MenuDropdownProps {
  /** show 配置项。 */
  show?: boolean
  /** visible 配置项。 */
  visible?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
}

/** MenuDropdownToggleProps 组件属性。 */
export interface MenuDropdownToggleProps {
  /** show 配置项。 */
  show?: boolean
  /** visible 配置项。 */
  visible?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 点击时触发的回调。 */
  onClick?: (event: MouseEvent) => void
  /** 组件子内容。 */
  children?: any
}

/** SubmenuProps 组件属性。 */
export interface SubmenuProps {
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
}

/** MenuSubMenuProps 组件属性。 */
export interface MenuSubMenuProps {
  items?: readonly MenuDataEntry[]
  parentKeyPath?: MenuKey[]
  /** eventKey 标识键。 */
  eventKey?: MenuKey
  /** 标题内容。 */
  title?: any
  /** 图标内容。 */
  icon?: any
  /** 额外操作或补充内容。 */
  extra?: any
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 标题按钮附加类名。 */
  titleClassName?: string
  /** popupClassName 附加类名。 */
  popupClassName?: string
  /** 受控打开状态。 */
  open?: boolean
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean
  /** onTitleClick 事件回调。 */
  onTitleClick?: (info: { key?: MenuKey; domEvent: MouseEvent }) => void
  /** 打开状态变化时触发的回调。 */
  onOpenChange?: (open: boolean) => void
  /** 组件子内容。 */
  children?: any
  /** __menuContext 配置项。 */
  __menuContext?: MenuContextValue | null
}

/** MenuItemGroupProps 组件属性。 */
export interface MenuItemGroupProps {
  /** 标题内容。 */
  title?: any
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
}

/** MenuDividerProps 组件属性。 */
export interface MenuDividerProps {
  /** 根节点附加类名。 */
  className?: string
  /** dashed 配置项。 */
  dashed?: boolean
}

interface MenuContextValue {
  mode: MenuMode
  inlineIndent: number
  selectable: boolean
  multiple: boolean
  triggerSubMenuAction: MenuTriggerSubMenuAction
  selectedKeys: MenuKey[]
  openKeys: MenuKey[]
  isSelected: (key?: MenuKey, explicit?: boolean) => boolean
  isOpen: (key?: MenuKey, explicit?: boolean) => boolean
  onItemClick: (event: MouseEvent, item: Partial<MenuItemData>, keyPath?: MenuKey[]) => void
  onSubMenuToggle: (
    key: MenuKey,
    nextOpen: boolean,
    event: MouseEvent,
    item?: Partial<MenuSubMenuData>,
  ) => void
}

/** MENU_CONTEXT_PROP 内部常量。 */
const MenuContext = createContext<MenuContextValue | null>(null)

/** append Class Name 的内部工具函数。 */
const appendClassName = (base: string, className?: string) =>
  className ? `${base} ${className}` : base

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: MenuSize) => {
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

/** 归一化 Keys 的内部工具函数。 */
const normalizeKeys = (keys?: ReadonlyArray<MenuKey>) => {
  return Array.isArray(keys) ? [...keys] : []
}

/** 判断是否存在 Key 的内部工具函数。 */
const hasKey = (keys: ReadonlyArray<MenuKey>, target?: MenuKey) => {
  if (target === undefined) return false
  return keys.some(key => key === target)
}

/** 判断 Renderable Node 的内部工具函数。 */

/** 判断组件类型是否匹配的内部工具函数。 */

/** inject Menu Context 的内部工具函数。 */

/** toggle Key 的内部工具函数。 */
const toggleKey = (keys: ReadonlyArray<MenuKey>, target: MenuKey) => {
  return hasKey(keys, target) ? keys.filter(key => key !== target) : [...keys, target]
}

/** 读取 Menu Mode 的内部工具函数。 */
const getMenuMode = (mode?: MenuMode, direction?: MenuDirection): MenuMode => {
  if (mode) return mode
  if (direction === 'horizontal') return 'horizontal'
  return 'vertical'
}

/** 读取 Anchor Rel 的内部工具函数。 */
const getAnchorRel = (target?: string, rel?: string) => {
  if (target === '_blank' && !rel) return 'noreferrer'
  return rel
}

/** 解析 Router Href 的内部工具函数。 */
const resolveRouterHref = (to: string, router: ReturnType<typeof useRouter> | undefined) => {
  const resolvedHref = router?.history.createHref?.(to) ?? `#${to || '/'}`
  if (!resolvedHref) {
    return '#/'
  }
  if (resolvedHref === to && to && !to.startsWith('#')) {
    return `#${to}`
  }
  return resolvedHref
}

/** 读取 Item Class Name 的内部工具函数。 */
const getItemClassName = ({
  disabled,
  selected,
  focus,
  danger,
  className,
}: {
  disabled?: boolean
  selected?: boolean
  focus?: boolean
  danger?: boolean
  className?: string
}) => {
  let cls = ''
  if (disabled) cls += ' menu-disabled'
  if (selected) cls += ' menu-active'
  if (focus) cls += ' menu-focus'
  if (danger) cls += ' text-error'
  if (className) cls += ` ${className}`
  return cls.trim() || undefined
}

/** 渲染 Item Content 的内部工具函数。 */
const RenderItemContent = ({
  icon,
  children,
  text,
  extra,
  suffix,
}: {
  icon?: any
  children?: any
  text?: string | number
  extra?: any
  suffix?: any
}) => {
  const hasIcon = icon != null
  const hasExtra = extra != null || suffix != null
  return (
    <>
      {hasIcon ? (
        <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>
      ) : null}
      {children != null || text != null ? (
        <span
          className={appendClassName(hasExtra ? 'min-w-0 flex-1' : '', hasIcon ? '' : undefined)}
        >
          {text !== undefined ? <span>{String(text)}</span> : children}
        </span>
      ) : null}
      {extra != null ? (
        <span className="ml-auto shrink-0 pl-3 text-xs opacity-70">{extra}</span>
      ) : null}
      {suffix != null ? <span className="ml-2 shrink-0 opacity-60">{suffix}</span> : null}
    </>
  )
}

/** 渲染 Menu Action 的内部工具函数。 */
const RenderMenuAction = ({
  arg0: props,
  children,
  arg1: menuContext,
  arg2: itemMeta,
  arg3: keyPath,
}: {
  children?: any
  arg0: MenuItemProps
  arg1: MenuContextValue | null
  arg2?: Partial<MenuDataEntry>
  arg3?: MenuKey[]
}) => {
  const {
    eventKey,
    as = 'a',
    href,
    to,
    target: linkTarget,
    rel,
    title,
    icon,
    extra,
    onClick,
    disabled,
    active,
    selected,
    focus,
    danger,
    className,

    ...rest
  } = props

  let linkRouter: ReturnType<typeof useRouter> | undefined
  if (to) {
    try {
      linkRouter = useRouter()
    } catch {
      /* Plain hash links also work without an installed router. */
    }
  }
  const isMergedSelected = () =>
    menuContext?.isSelected(eventKey, selected ?? active) ?? !!(selected ?? active)
  const getInnerClassName = () =>
    getItemClassName({
      disabled,
      selected: isMergedSelected(),
      focus,
      danger,
      className,
    })

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
    if (menuContext) {
      menuContext.onItemClick(
        event,
        {
          key: eventKey,
          label: children,
          icon,
          extra,
          title,
          danger,
          disabled,
          active,
          selected,
          focus,
          className,
          ...(itemMeta as any),
        },
        keyPath,
      )
    }
  }

  if (as === 'button') {
    return (
      <button
        {...rest}
        type={rest.type ?? 'button'}
        className={getInnerClassName()}
        title={title}
        disabled={disabled}
        aria-current={isMergedSelected() ? 'page' : undefined}
        onClick={handleClick}
      >
        <RenderItemContent icon={icon} extra={extra} text={props.text}>
          {children}
        </RenderItemContent>
      </button>
    )
  }

  if (as === 'span') {
    return (
      <span
        {...rest}
        className={getInnerClassName()}
        title={title}
        role={rest.role ?? 'menuitem'}
        tabIndex={disabled ? -1 : (rest.tabIndex ?? 0)}
        aria-current={isMergedSelected() ? 'page' : undefined}
        aria-disabled={disabled ? 'true' : undefined}
        onClick={handleClick}
      >
        <RenderItemContent icon={icon} extra={extra} text={props.text}>
          {children}
        </RenderItemContent>
      </span>
    )
  }

  if (to) {
    if (disabled) {
      return (
        <span
          {...rest}
          className={getInnerClassName()}
          title={title}
          role={rest.role ?? 'menuitem'}
          tabIndex={-1}
          aria-current={isMergedSelected() ? 'page' : undefined}
          aria-disabled="true"
          onClick={handleClick}
        >
          <RenderItemContent icon={icon} extra={extra} text={props.text}>
            {children}
          </RenderItemContent>
        </span>
      )
    }

    const handleRouterClick = (event: MouseEvent) => {
      handleClick(event)
      if ((event as any).defaultPrevented) {
        return
      }
      if (
        linkRouter &&
        event.button === 0 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault()
        void linkRouter.push(to)
      }
    }

    return (
      <a
        {...rest}
        className={getInnerClassName()}
        href={resolveRouterHref(to, linkRouter)}
        title={title}
        aria-current={isMergedSelected() ? 'page' : undefined}
        aria-disabled={disabled ? 'true' : undefined}
        onClick={handleRouterClick}
      >
        <RenderItemContent icon={icon} extra={extra} text={props.text}>
          {children}
        </RenderItemContent>
      </a>
    )
  }

  if (href) {
    return (
      <a
        {...rest}
        className={getInnerClassName()}
        href={disabled ? undefined : href}
        target={linkTarget}
        rel={getAnchorRel(linkTarget, rel)}
        title={title}
        aria-current={isMergedSelected() ? 'page' : undefined}
        aria-disabled={disabled ? 'true' : undefined}
        onClick={handleClick}
      >
        <RenderItemContent icon={icon} extra={extra} text={props.text}>
          {children}
        </RenderItemContent>
      </a>
    )
  }

  return (
    <a
      {...rest}
      className={getInnerClassName()}
      title={title}
      aria-current={isMergedSelected() ? 'page' : undefined}
      aria-disabled={disabled ? 'true' : undefined}
      onClick={handleClick}
    >
      <RenderItemContent icon={icon} extra={extra} text={props.text}>
        {children}
      </RenderItemContent>
    </a>
  )
}

/** Title 的内部工具函数。 */
const Title: FC<MenuTitleProps> = ({ as = 'li', className, children }) => {
  const cls = appendClassName('menu-title', className)
  if (as === 'h2') return <h2 className={cls}>{children}</h2>
  return <li className={cls}>{children}</li>
}

/** Dropdown 的内部工具函数。 */
const Dropdown: FC<MenuDropdownProps> = ({ show, visible, className, children }) => {
  const mergedVisible = visible ?? show
  let cls = 'menu-dropdown'
  if (mergedVisible) cls += ' menu-dropdown-show'
  if (className) cls += ` ${className}`
  return <ul className={cls}>{children}</ul>
}

/** Dropdown Toggle 的内部工具函数。 */
const DropdownToggle: FC<MenuDropdownToggleProps> = ({
  show,
  visible,
  className,
  onClick,
  children,
}) => {
  const mergedVisible = visible ?? show
  let cls = 'menu-dropdown-toggle'
  if (mergedVisible) cls += ' menu-dropdown-show'
  if (className) cls += ` ${className}`
  return (
    <span
      className={cls}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-expanded={onClick ? (mergedVisible ? 'true' : 'false') : undefined}
      onClick={onClick}
      onKeyDown={(event: KeyboardEvent) => {
        if (!onClick) return
        if (event.key !== 'Enter' && event.key !== ' ') return
        if (typeof (event as any).preventDefault === 'function') {
          ;(event as any).preventDefault()
        }
        onClick(event as any)
      }}
    >
      {children}
    </span>
  )
}

/** Submenu 的内部工具函数。 */
const Submenu: FC<SubmenuProps> = ({ className, children }) => {
  return <ul className={className}>{children}</ul>
}

interface LegacyDropdownItemProps {
  entryKey: MenuKey
  itemEntry: MenuItemData
  content: any
  menuContext: MenuContextValue
  keyPath: MenuKey[]
}

/** Item 的内部工具函数。 */
const Item: FC<MenuItemProps & { __menuContext?: MenuContextValue | null }> = ({
  liClassName,
  children,
  __menuContext = null,
  ...rest
}) => {
  const menuContext = __menuContext ?? useContext(MenuContext)
  return (
    <li className={liClassName}>
      <RenderMenuAction arg0={rest} arg1={menuContext}>
        {children}
      </RenderMenuAction>
    </li>
  )
}

/** Divider 的内部工具函数。 */
const Divider: FC<MenuDividerProps> = ({ className, dashed }) => {
  return (
    <li
      role="separator"
      className={appendClassName(
        appendClassName(
          'mx-2 my-1 h-px list-none bg-base-300/80',
          dashed ? 'border-t border-dashed border-base-300 bg-transparent' : undefined,
        ),
        className,
      )}
    />
  )
}

/** Item Group 的内部工具函数。 */
const ItemGroup: FC<MenuItemGroupProps> = ({ title, className, children }) => {
  return (
    <li className={className}>
      <div className="menu-title">{String(title ?? '')}</div>
      <ul>{children}</ul>
    </li>
  )
}

/** Sub Menu 的内部工具函数。 */
const SubMenu: FC<MenuSubMenuProps> = ({
  eventKey,
  title,
  icon,
  extra,
  disabled,
  className,
  titleClassName,
  popupClassName,
  open,
  defaultOpen,
  onTitleClick,
  onOpenChange,
  children,
  items,
  parentKeyPath,
  __menuContext = null,
}) => {
  const menuContext = __menuContext ?? useContext(MenuContext)
  const uncontrolledOpen = ref(!!defaultOpen)
  const isMergedOpen = () =>
    eventKey !== undefined && menuContext
      ? menuContext.isOpen(eventKey, open)
      : (open ?? uncontrolledOpen.value)
  const triggerAction =
    menuContext?.mode === 'inline' ? 'click' : (menuContext?.triggerSubMenuAction ?? 'click')

  const commitOpen = (nextOpen: boolean, event: MouseEvent) => {
    if (disabled) return
    if (onTitleClick) onTitleClick({ key: eventKey, domEvent: event })
    if (eventKey !== undefined && menuContext) {
      menuContext.onSubMenuToggle(eventKey, nextOpen, event, {
        key: eventKey,
        label: title,
        icon,
        extra,
        disabled,
        className,
        popupClassName,
      })
    } else if (open === undefined) {
      uncontrolledOpen.value = nextOpen
    }
    if (onOpenChange) onOpenChange(nextOpen)
  }

  return (
    <li
      className={className}
      onMouseEnter={(event: MouseEvent) => {
        if (triggerAction === 'hover') commitOpen(true, event as any)
      }}
      onMouseLeave={(event: MouseEvent) => {
        if (triggerAction === 'hover') commitOpen(false, event as any)
      }}
    >
      <button
        type="button"
        className={getItemClassName({
          disabled,
          selected: isMergedOpen(),
          className: titleClassName,
        })}
        aria-expanded={isMergedOpen() ? 'true' : 'false'}
        aria-disabled={disabled ? 'true' : undefined}
        onClick={(event: MouseEvent) => {
          if (triggerAction !== 'click') return
          commitOpen(!isMergedOpen(), event as any)
        }}
      >
        <RenderItemContent
          icon={icon}
          extra={extra}
          suffix={isMergedOpen() ? '▾' : '▸'}
          text={String(title ?? '')}
        />
      </button>
      <ul
        className={appendClassName(isMergedOpen() ? '' : 'hidden', popupClassName)}
        style={
          menuContext?.mode === 'inline'
            ? { paddingInlineStart: `${menuContext.inlineIndent}px` }
            : undefined
        }
      >
        {items
          ? items.map((entry, index) => (
              <RenderDataEntry
                key={('key' in entry ? entry.key : undefined) ?? index}
                arg0={entry}
                arg1={index}
                arg2={menuContext!}
                arg3={parentKeyPath}
              />
            ))
          : children}
      </ul>
    </li>
  )
}

/** 渲染 Data Entry 的内部工具函数。 */
const RenderDataEntry: FC<{
  arg0: MenuDataEntry
  arg1: number
  arg2: MenuContextValue
  arg3?: MenuKey[]
}> = ({ arg0: entry, arg1: index, arg2: menuContext, arg3: parentKeyPath = [] }) => {
  const item = entry as Omit<MenuItemData, 'kind' | 'type' | 'as'> & {
    kind?: 'item' | 'title'
    type?: 'divider' | 'group' | 'submenu'
    as?: MenuItemData['as'] | MenuTitleData['as']
  }
  const entryKey = item.key ?? `${parentKeyPath.join('-') || 'root'}-${index}`
  const keyPath = [...parentKeyPath, entryKey]
  const content = item.label ?? item.children
  const legacyContext = { ...menuContext, triggerSubMenuAction: 'click' as const }
  return item.kind === 'title' ? (
    <li className={appendClassName('menu-title', item.className)}>{String(item.label ?? '')}</li>
  ) : item.type === 'divider' ? (
    <Divider className={item.className} dashed={(entry as MenuDividerData).dashed} />
  ) : item.type === 'group' ? (
    <ItemGroup title={item.label} className={item.className}>
      {(entry as MenuGroupData).children?.map((child, childIndex) => (
        <RenderDataEntry
          key={('key' in child ? child.key : undefined) ?? childIndex}
          arg0={child}
          arg1={childIndex}
          arg2={menuContext}
          arg3={keyPath}
        />
      ))}
    </ItemGroup>
  ) : item.type === 'submenu' ? (
    <SubMenu
      eventKey={entryKey}
      title={item.label}
      icon={item.icon}
      extra={item.extra}
      disabled={item.disabled}
      className={item.className}
      popupClassName={(entry as MenuSubMenuData).popupClassName}
      onTitleClick={(entry as MenuSubMenuData).onTitleClick}
      __menuContext={menuContext}
      items={(entry as MenuSubMenuData).children}
      parentKeyPath={keyPath}
    />
  ) : (
    <Item
      eventKey={item.key}
      as={(entry as MenuItemData).as}
      href={item.href}
      to={item.to}
      target={item.target}
      rel={item.rel}
      title={item.title}
      icon={item.icon}
      extra={item.extra}
      danger={item.danger}
      onClick={item.onClick}
      disabled={item.disabled}
      active={item.active}
      selected={item.selected}
      focus={item.focus}
      liClassName={item.liClassName}
      className={item.className}
      __menuContext={menuContext}
    >
      {String(content ?? '')}
    </Item>
  )
}

/** Menu 的内部工具函数。 */
const Menu: FC<MenuProps> = ({
  size,
  direction = 'vertical',
  mode,
  className,
  style,
  selectable = true,
  multiple = false,
  inlineIndent = 24,
  triggerSubMenuAction = 'click',
  selectedKeys,
  defaultSelectedKeys,
  openKeys,
  defaultOpenKeys,
  onClick,
  onSelect,
  onDeselect,
  onOpenChange,
  children,
  items,
}) => {
  const resolvedMode = getMenuMode(mode, direction)
  const uncontrolledSelectedKeys = ref(normalizeKeys(defaultSelectedKeys ?? selectedKeys))
  const uncontrolledOpenKeys = ref(normalizeKeys(defaultOpenKeys ?? openKeys))
  const getMergedSelectedKeys = () =>
    selectedKeys !== undefined ? normalizeKeys(selectedKeys) : uncontrolledSelectedKeys.value
  const getMergedOpenKeys = () =>
    openKeys !== undefined ? normalizeKeys(openKeys) : uncontrolledOpenKeys.value

  const commitSelectedKeys = (nextSelectedKeys: MenuKey[]) => {
    if (selectedKeys === undefined) uncontrolledSelectedKeys.value = nextSelectedKeys
  }

  const commitOpenKeys = (nextOpenKeys: MenuKey[]) => {
    if (openKeys === undefined) uncontrolledOpenKeys.value = nextOpenKeys
    if (onOpenChange) onOpenChange(nextOpenKeys)
  }

  const menuContextValue: MenuContextValue = {
    mode: resolvedMode,
    inlineIndent,
    selectable,
    multiple,
    triggerSubMenuAction,
    get selectedKeys() {
      return getMergedSelectedKeys()
    },
    get openKeys() {
      return getMergedOpenKeys()
    },
    isSelected: (key, explicit) => explicit ?? hasKey(getMergedSelectedKeys(), key),
    isOpen: (key, explicit) => explicit ?? hasKey(getMergedOpenKeys(), key),
    onItemClick: (event, item, keyPath = item.key !== undefined ? [item.key] : []) => {
      const info: MenuClickInfo = {
        key: item.key,
        keyPath,
        item: item as MenuDataEntry,
        domEvent: event,
      }
      if (onClick) onClick(info)
      if (!selectable || item.key === undefined) return

      const mergedSelectedKeys = getMergedSelectedKeys()
      const nextSelectedKeys = multiple ? toggleKey(mergedSelectedKeys, item.key) : [item.key]
      const isSelected = hasKey(mergedSelectedKeys, item.key)
      commitSelectedKeys(nextSelectedKeys)

      const selectInfo: MenuSelectInfo = {
        ...info,
        key: item.key,
        selectedKeys: nextSelectedKeys,
      }

      if (multiple && isSelected) {
        if (onDeselect) onDeselect(selectInfo)
        return
      }
      if (!multiple && isSelected && mergedSelectedKeys.length === 1) return
      if (onSelect) onSelect(selectInfo)
    },
    onSubMenuToggle: (key, nextOpen, _event, _item) => {
      const mergedOpenKeys = getMergedOpenKeys()
      const nextOpenKeys = nextOpen
        ? hasKey(mergedOpenKeys, key)
          ? mergedOpenKeys
          : [...mergedOpenKeys, key]
        : mergedOpenKeys.filter(openKey => openKey !== key)
      commitOpenKeys(nextOpenKeys)
    },
  }

  let cls = 'menu'
  if (resolvedMode === 'horizontal') cls += ' menu-horizontal'
  else cls += ' menu-vertical'
  const resolvedSize = resolveSizeClass(size)
  if (resolvedSize) cls += ` menu-${resolvedSize}`
  if (className) cls += ` ${className}`

  provideContext(MenuContext, () => menuContextValue)

  return (
    <ul
      className={cls}
      style={style}
      role={resolvedMode === 'horizontal' ? 'menubar' : 'menu'}
      aria-orientation={resolvedMode === 'horizontal' ? 'horizontal' : 'vertical'}
    >
      {items && items.length ? (
        <>
          {items.map((entry, index) => (
            <RenderDataEntry
              key={('key' in entry ? entry.key : undefined) ?? index}
              arg0={entry}
              arg1={index}
              arg2={menuContextValue}
            />
          ))}
        </>
      ) : (
        <>{children}</>
      )}
    </ul>
  )
}

type MenuCompound = FC<MenuProps> & {
  Item: FC<MenuItemProps>
  Title: FC<MenuTitleProps>
  Dropdown: FC<MenuDropdownProps>
  DropdownToggle: FC<MenuDropdownToggleProps>
  Submenu: FC<SubmenuProps>
  SubMenu: FC<MenuSubMenuProps>
  ItemGroup: FC<MenuItemGroupProps>
  Divider: FC<MenuDividerProps>
}

const MenuCompound: MenuCompound = /*#__PURE__*/ Object.assign(Menu, {
  Item,
  Title,
  Dropdown,
  DropdownToggle,
  Submenu,
  SubMenu,
  ItemGroup,
  Divider,
})

/** 默认导出菜单组件。 */
export default MenuCompound
