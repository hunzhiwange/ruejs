/*
Kbd 组件概述
- 形态：size 控制大小，className 追加样式。
*/
import type { FC } from '@rue-js/rue'
/* 函数组件类型：约束 Kbd 组件签名 */

type KbdSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface KbdProps {
  size?: KbdSize
  className?: string
  children?: any
}

/** 键盘标签组件：kbd 元素包裹 */
/* Kbd 主组件：键盘标签，支持尺寸与自定义类名 */
const Kbd: FC<KbdProps> = ({ size, className, children }) => {
  let cls = 'kbd'
  if (size) cls += ` kbd-${size}`
  if (className) cls += ` ${className}`
  return <kbd className={cls}>{children}</kbd>
}

export default Kbd
