/*
Dock 组件概述
- 形态：size 控制大小，activeIndex 或 item.active 控制选中状态。
- 复合组件：Item/Label 子组件构建停靠项结构，支持 a/button/div。
*/
import type { FC } from 'rue-js'
/* 函数组件类型：约束 Dock 组件签名 */

type DockSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface DockItemData {
  as?: 'button' | 'a' | 'div'
  className?: string
  icon?: any
  label?: any
  href?: string
  active?: boolean
}

interface DockProps {
  size?: DockSize
  className?: string
  items?: DockItemData[]
  activeIndex?: number
  onChange?: (index: number) => void
  children?: any
}

/** 停靠栏组件：数据驱动或 children 渲染 */
const Dock: FC<DockProps> = ({ size, className, items, activeIndex, onChange, children }) => {
  let cls = 'dock'
  /* 尺寸类名：xs~xl */
  if (size) cls += ` dock-${size}`
  /* 附加类名 */
  if (className) cls += ` ${className}`
  if (items && items.length) {
    return (
      <div className={cls}>
        {items.map((it, idx) => (
          /* 渲染单个停靠项，active 来源于 activeIndex 或自身 active */
          <Item
            key={idx}
            as={it.as}
            className={it.className}
            active={activeIndex != null ? activeIndex === idx : !!it.active}
            href={it.href}
            onClick={() => onChange && onChange(idx)}
          >
            {it.icon}
            {/* 标签文本：可选 */}
            {it.label != null ? <Label>{it.label}</Label> : null}
          </Item>
        ))}
      </div>
    )
  }
  /* children 形式：自定义结构 */
  return <div className={cls}>{children}</div>
}

interface DockItemProps {
  as?: 'button' | 'a' | 'div'
  active?: boolean
  className?: string
  href?: string
  onClick?: () => void
  children?: any
}

/** 停靠项组件：a/button/div 三态 */
const Item: FC<DockItemProps> = ({ as = 'button', active, className, href, onClick, children }) => {
  let cls = ''
  /* 选中态类名 */
  if (active) cls += ' dock-active'
  /* 附加类名 */
  if (className) cls += ` ${className}`
  const clsTrim = cls.trim()
  if (as === 'a')
    return (
      <a href={href} className={clsTrim} onClick={onClick}>
        {children}
      </a>
    )
  if (as === 'div')
    return (
      <div className={clsTrim} onClick={onClick}>
        {children}
      </div>
    )
  return (
    <button className={clsTrim} onClick={onClick}>
      {children}
    </button>
  )
}

interface DockLabelProps {
  className?: string
  children?: any
}

/** 项标签组件：显示文字或图标旁说明 */
const Label: FC<DockLabelProps> = ({ className, children }) => {
  let cls = 'dock-label'
  if (className) cls += ` ${className}`
  return <span className={cls}>{children}</span>
}

type DockCompound = FC<DockProps> & {
  Item: FC<DockItemProps>
  Label: FC<DockLabelProps>
}

const DockCompound: DockCompound = Object.assign(Dock, {
  Item,
  Label,
})

export default DockCompound
