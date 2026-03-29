/*
Status 组件概述
- 形态：span 或 div 标签；支持尺寸与颜色类名。
*/
import type { FC } from 'rue-js'
/* 函数组件类型：约束 Status 组件签名 */

type StatusAs = 'span' | 'div'
type StatusSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type StatusColor =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

interface StatusProps {
  as?: StatusAs
  ariaLabel?: string
  size?: StatusSize
  color?: StatusColor
  className?: string
  children?: any
}

/** 状态点组件：用于展示状态或标识 */
/* Status 主组件：显示状态点，支持尺寸与颜色 */
const Status: FC<StatusProps> = ({ as = 'span', ariaLabel, size, color, className, children }) => {
  let cls = 'status'
  if (size) cls += ` status-${size}`
  if (color) cls += ` status-${color}`
  if (className) cls += ` ${className}`
  const common = { className: cls, 'aria-label': ariaLabel }
  if (as === 'div') {
    return <div {...common}>{children}</div>
  }
  return <span {...common}>{children}</span>
}

export default Status
