/*
Button 组件概述
- 通过 variant/size/outline/dash/soft/ghost/link 等 props 组合类名，渲染按钮。
- 支持形态与布局（active/block/wide/square/circle）及禁用/加载态；onClick 事件。
*/
import type { FC } from 'rue-js'
/* 函数组件类型：约束 Button 组件签名 */

type BtnVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'neutral'
  | 'ghost'
  | 'link'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

type BtnSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps {
  variant?: BtnVariant
  size?: BtnSize
  outline?: boolean
  dash?: boolean
  soft?: boolean
  ghost?: boolean
  link?: boolean
  active?: boolean
  block?: boolean
  wide?: boolean
  square?: boolean
  circle?: boolean
  disabled?: boolean
  disabledClass?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  onClick?: (e: MouseEvent) => void
  children?: any
}

/** 按钮组件：根据 props 生成类名与行为 */
/* Button 主组件：根据 props 组合类名与行为 */
const Button: FC<ButtonProps> = ({
  variant,
  size,
  outline,
  dash,
  soft,
  ghost,
  link,
  active,
  block,
  wide,
  square,
  circle,
  disabled,
  disabledClass,
  loading,
  type,
  className,
  onClick,
  children,
}) => {
  let cls = 'btn'
  /* 颜色与尺寸 */
  if (variant) cls += ` btn-${variant}`
  if (size) cls += ` btn-${size}`
  /* 边框/虚线/柔和/幽灵/链接样式 */
  if (outline) cls += ` btn-outline`
  if (dash) cls += ` btn-dash`
  if (soft) cls += ` btn-soft`
  if (ghost) cls += ` btn-ghost`
  if (link) cls += ` btn-link`
  /* 状态与布局 */
  if (active) cls += ` btn-active`
  if (block) cls += ` btn-block`
  if (wide) cls += ` btn-wide`
  if (square) cls += ` btn-square`
  if (circle) cls += ` btn-circle`
  /* 禁用样式（仅类名） */
  if (disabledClass) cls += ` btn-disabled`
  /* 附加类名 */
  if (className) cls += ` ${className}`
  return (
    <button className={cls} disabled={disabled || loading} type={type} onClick={onClick}>
      {/* 子内容插槽 */}
      {children}
    </button>
  )
}

export default Button
