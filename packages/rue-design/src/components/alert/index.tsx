/*
Alert 组件概述
- 通过 variant/direction/outline/dash/soft 等 props 组合类名，渲染语义化的提示框。
- 使用 role="alert" 提示可访问性；className 可追加自定义类。
*/
import type { FC } from '@rue-js/rue'
/* 函数组件类型：约束 Alert 组件签名 */

type AlertVariant = 'info' | 'success' | 'warning' | 'error'
type AlertDirection = 'vertical' | 'horizontal'

interface AlertProps {
  variant?: AlertVariant
  outline?: boolean
  dash?: boolean
  soft?: boolean
  direction?: AlertDirection
  className?: string
  children?: any
}

/** 提示组件：根据 props 生成类名组合 */
/* Alert 主组件：根据 props 组合类名并渲染内容 */
const Alert: FC<AlertProps> = ({
  variant,
  outline,
  dash,
  soft,
  direction,
  className,
  children,
}) => {
  let cls = 'alert'
  /* 变体类：info/success/warning/error */
  if (variant) cls += ` alert-${variant}`
  /* 边框样式：outline/dash/soft 三态 */
  if (outline) cls += ` alert-outline`
  if (dash) cls += ` alert-dash`
  if (soft) cls += ` alert-soft`
  /* 排列方向：vertical/horizontal */
  if (direction) cls += ` alert-${direction}`
  /* 追加自定义类名 */
  if (className) cls += ` ${className}`
  return (
    <div role="alert" className={cls}>
      {/* 组件内容插槽 */}
      {children}
    </div>
  )
}

export default Alert
