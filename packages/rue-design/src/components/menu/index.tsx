/*
Menu 组件概述
- 形态：方向与尺寸控制菜单布局（vertical/horizontal、xs~xl）。
- 数据驱动：支持 Title/Item/Dropdown/Submenu 组合；或使用复合子组件。
*/
import type { FC } from '@rue-js/rue'
import { RouterLink } from '@rue-js/router'
/* 引入 RouterLink 以支持路由内部跳转 */

type MenuSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type MenuDirection = 'vertical' | 'horizontal'

interface MenuDataTitle {
  kind: 'title'
  as?: 'li' | 'h2'
  className?: string
  children?: any
}

interface MenuDataDropdownToggle {
  visible?: boolean
  className?: string
  children?: any
}

interface MenuDataDropdown {
  visible?: boolean
  className?: string
  items?: ReadonlyArray<MenuDataEntry>
}

interface MenuDataSubmenu {
  className?: string
  items?: ReadonlyArray<MenuDataEntry>
}

interface MenuDataItem {
  kind: 'item'
  as?: 'a' | 'button' | 'span'
  href?: string
  to?: string
  target?: string
  rel?: string
  onClick?: (e: any) => void
  disabled?: boolean
  active?: boolean
  focus?: boolean
  liClassName?: string
  className?: string
  children?: any
  dropdownToggle?: MenuDataDropdownToggle
  dropdown?: MenuDataDropdown
  submenu?: MenuDataSubmenu
  [key: string]: any
}

type MenuDataEntry = MenuDataTitle | MenuDataItem

interface MenuProps {
  size?: MenuSize
  direction?: MenuDirection
  className?: string
  children?: any
  items?: ReadonlyArray<MenuDataEntry>
}

/** 渲染数据项为菜单结构 */
const renderEntry = (m: MenuDataEntry, idx: number) => {
  if (m.kind === 'title') {
    /* 标题项：使用 Title 子组件渲染 */
    return (
      <Title key={idx} as={m.as} className={m.className}>
        {m.children}
      </Title>
    )
  }
  /* 普通项：组合禁用/激活/聚焦与自定义类 */
  const innerClasses = [
    m.disabled ? 'menu-disabled' : '',
    m.active ? 'menu-active' : '',
    m.focus ? 'menu-focus' : '',
    m.className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
  /* li 容器类（可选） */
  const liCls = m.liClassName ? m.liClassName : undefined
  return (
    <li className={liCls} key={idx}>
      {/* 渲染不同标签类型：button/span/RouterLink/a */}
      {m.as === 'button' ? (
        <button className={innerClasses || undefined} {...m}>
          {m.children}
        </button>
      ) : m.as === 'span' ? (
        <span className={innerClasses || undefined} {...m}>
          {m.children}
        </span>
      ) : m.to ? (
        <RouterLink className={innerClasses || undefined} to={m.to} onClick={m.onClick}>
          {m.children}
        </RouterLink>
      ) : m.href ? (
        <a
          className={innerClasses || undefined}
          href={m.href}
          target={m.target}
          rel={m.rel}
          onClick={m.onClick}
        >
          {m.children}
        </a>
      ) : (
        <a className={innerClasses || undefined} onClick={m.onClick}>
          {m.children}
        </a>
      )}
      {/* 下拉切换：可见性与样式 */}
      {m.dropdownToggle ? (
        <DropdownToggle visible={m.dropdownToggle.visible} className={m.dropdownToggle.className}>
          {m.dropdownToggle.children}
        </DropdownToggle>
      ) : null}
      {/* 下拉菜单：递归渲染子项 */}
      {m.dropdown ? (
        <Dropdown visible={m.dropdown.visible} className={m.dropdown.className}>
          {m.dropdown.items?.map((child, i) => renderEntry(child, i))}
        </Dropdown>
      ) : null}
      {/* 子菜单：递归渲染子项 */}
      {m.submenu ? (
        <Submenu className={m.submenu.className}>
          {m.submenu.items?.map((child, i) => renderEntry(child, i))}
        </Submenu>
      ) : null}
    </li>
  )
}

/** 菜单组件：数据驱动或 children 渲染 */
const Menu: FC<MenuProps> = ({ size, direction = 'vertical', className, children, items }) => {
  let cls = 'menu'
  /* 布局方向类名 */
  if (direction === 'horizontal') cls += ` menu-horizontal`
  else if (direction === 'vertical') cls += ` menu-vertical`
  /* 尺寸类名 */
  if (size) cls += ` menu-${size}`
  /* 附加类名 */
  if (className) cls += ` ${className}`
  /* 数据驱动渲染 */
  if (items && items.length)
    return <ul className={cls}>{items.map((m, i) => renderEntry(m, i))}</ul>
  /* children 形式 */
  return <ul className={cls}>{children}</ul>
}

interface MenuItemProps {
  as?: 'a' | 'button' | 'span'
  href?: string
  to?: string
  target?: string
  rel?: string
  onClick?: (e: any) => void
  disabled?: boolean
  active?: boolean
  focus?: boolean
  liClassName?: string
  className?: string
  children?: any
  [key: string]: any
}

/** 菜单项子组件：支持 a/button/span 与 RouterLink */
const Item: FC<MenuItemProps> = ({
  as = 'a',
  href,
  to,
  target,
  rel,
  onClick,
  disabled,
  active,
  focus,
  liClassName,
  className,
  children,
  ...rest
}) => {
  const innerClasses = [
    disabled ? 'menu-disabled' : '',
    active ? 'menu-active' : '',
    focus ? 'menu-focus' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  const liCls = liClassName ? liClassName : undefined
  return (
    <li className={liCls}>
      {as === 'button' ? (
        <button className={innerClasses || undefined} onClick={onClick} {...rest}>
          {children}
        </button>
      ) : as === 'span' ? (
        <span className={innerClasses || undefined} onClick={onClick} {...rest}>
          {children}
        </span>
      ) : to ? (
        <RouterLink className={innerClasses || undefined} to={to} onClick={onClick}>
          {children}
        </RouterLink>
      ) : href ? (
        <a
          className={innerClasses || undefined}
          href={href}
          target={target}
          rel={rel}
          onClick={onClick}
          {...rest}
        >
          {children}
        </a>
      ) : (
        <a className={innerClasses || undefined} onClick={onClick} {...rest}>
          {children}
        </a>
      )}
    </li>
  )
}

interface MenuTitleProps {
  as?: 'li' | 'h2'
  className?: string
  children?: any
}

/** 标题子组件：li 或 h2 */
const Title: FC<MenuTitleProps> = ({ as = 'li', className, children }) => {
  let cls = 'menu-title'
  if (className) cls += ` ${className}`
  if (as === 'h2') return <h2 className={cls}>{children}</h2>
  return <li className={cls}>{children}</li>
}

interface MenuDropdownProps {
  visible?: boolean
  className?: string
  children?: any
}

/** 下拉菜单子组件 */
const Dropdown: FC<MenuDropdownProps> = ({ visible, className, children }) => {
  let cls = 'menu-dropdown'
  if (visible) cls += ` menu-dropdown-visible`
  if (className) cls += ` ${className}`
  return <ul className={cls}>{children}</ul>
}

interface MenuDropdownToggleProps {
  visible?: boolean
  className?: string
  children?: any
}

/** 下拉切换子组件 */
const DropdownToggle: FC<MenuDropdownToggleProps> = ({ visible, className, children }) => {
  let cls = 'menu-dropdown-toggle'
  if (visible) cls += ` menu-dropdown-visible`
  if (className) cls += ` ${className}`
  return <span className={cls}>{children}</span>
}

interface SubmenuProps {
  className?: string
  children?: any
}

/** 子菜单容器组件 */
const Submenu: FC<SubmenuProps> = ({ className, children }) => {
  const cls = className ? className : undefined
  return <ul className={cls}>{children}</ul>
}

type MenuCompound = FC<MenuProps> & {
  Item: FC<MenuItemProps>
  Title: FC<MenuTitleProps>
  Dropdown: FC<MenuDropdownProps>
  DropdownToggle: FC<MenuDropdownToggleProps>
  Submenu: FC<SubmenuProps>
}

const MenuCompound: MenuCompound = Object.assign(Menu, {
  Item,
  Title,
  Dropdown,
  DropdownToggle,
  Submenu,
})

export default MenuCompound
