/*
Tabs 组件概述
- 形态：样式风格（box/border/lift）、位置（top/bottom）、尺寸（xs~xl）。
- 行为：activeKey 控制当前标签，onChange 回调。
*/
import type { FC } from 'rue-js'
/* 函数组件类型：约束 Tabs 组件签名 */

interface TabItem {
  key: string
  label: string
  disabled?: boolean
  className?: string
}

interface TabsProps {
  items: TabItem[]
  activeKey: string
  onChange?: (key: string) => void
  style?: 'box' | 'border' | 'lift'
  placement?: 'top' | 'bottom'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

/** 标签组件：受控当前项与样式组合 */
/* Tabs 主组件：受控当前项与样式组合 */
const Tabs: FC<TabsProps> = ({ items, activeKey, onChange, style, placement, size, className }) => {
  let cls = 'tabs'
  if (style === 'box') cls += ' tabs-box'
  if (style === 'border') cls += ' tabs-border'
  if (style === 'lift') cls += ' tabs-lift'
  if (placement === 'bottom') cls += ' tabs-bottom'
  if (size) cls += ` tabs-${size}`
  if (className) cls += ` ${className}`
  return (
    <div role="tablist" className={cls}>
      {items.map(it => (
        <button
          role="tab"
          key={it.key}
          className={`tab ${activeKey === it.key ? 'tab-active' : ''} ${it.disabled ? 'tab-disabled' : ''} ${it.className ?? ''}`}
          disabled={it.disabled}
          onClick={() => !it.disabled && onChange && onChange(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export default Tabs
