/*
Divider 组件概述
- 形态：支持方向、颜色与位置（start/end）控制。
- 用途：在内容中增加分隔与标题区域。
*/
import type { FC } from 'rue-js'
/* 函数组件类型：约束 Divider 组件签名 */

type DividerVariant =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'info'
  | 'error'

type DividerDirection = 'vertical' | 'horizontal'
type DividerPlacement = 'start' | 'end'

interface DividerProps {
  variant?: DividerVariant
  direction?: DividerDirection
  placement?: DividerPlacement
  className?: string
  children?: any
}

/** 分隔线组件：根据 props 生成类名 */
/* Divider 主组件：根据方向/颜色/位置组合类名 */
const Divider: FC<DividerProps> = ({ variant, direction, placement, className, children }) => {
  let cls = 'divider'
  if (direction) cls += ` divider-${direction}`
  if (variant) cls += ` divider-${variant}`
  if (placement) cls += ` divider-${placement}`
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

export default Divider
