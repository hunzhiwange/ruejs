/*
Badge 组件概述
- 形态：variant/size/outline/dash/soft/ghost 等组合类名。
- 用途：展示状态或标签内容。
*/
import type { FC } from '@rue-js/rue'
/* 函数组件类型：约束 Badge 组件签名 */

type BadgeVariant =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  outline?: boolean
  dash?: boolean
  soft?: boolean
  ghost?: boolean
  className?: string
  children?: any
}

/** 徽章组件：根据 props 生成样式类名 */
/* Badge 主组件：根据 props 组合类名并渲染内容 */
const Badge: FC<BadgeProps> = ({
  variant,
  size,
  outline,
  dash,
  soft,
  ghost,
  className,
  children,
}) => {
  let cls = 'badge'
  /* 颜色与尺寸 */
  if (variant) cls += ` badge-${variant}`
  if (size) cls += ` badge-${size}`
  /* 边框/虚线/柔和/幽灵 */
  if (outline) cls += ` badge-outline`
  if (dash) cls += ` badge-dash`
  if (soft) cls += ` badge-soft`
  if (ghost) cls += ` badge-ghost`
  /* 附加类名 */
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

export default Badge
