/*
Footer 组件概述
- 形态：direction 控制纵/横布局；center 居中内容。
*/
import type { FC } from '@rue-js/rue'
/* 函数组件类型：约束 Footer 组件签名 */

type FooterDirection = 'vertical' | 'horizontal'

interface FooterProps {
  direction?: FooterDirection
  center?: boolean
  className?: string
  children?: any
}

/** 页脚组件：根据 props 组合类名 */
/* Footer 主组件：根据方向与居中属性组合类名 */
const Footer: FC<FooterProps> = ({ direction, center, className, children }) => {
  let cls = 'footer'
  if (direction) cls += ` footer-${direction}`
  if (center) cls += ` footer-center`
  if (className) cls += ` ${className}`
  return <footer className={cls}>{children}</footer>
}

export default Footer
