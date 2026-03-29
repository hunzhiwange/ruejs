/*
Link 组件概述
- 形态：支持外链 a 或基于路由的 RouterLink。
- 样式：variant/hover 组合类名；className 追加。
*/
import type { FC } from '@rue-js/rue'
/* 函数组件类型：约束 Link 组件签名 */
import { RouterLink } from '@rue-js/router'

type LinkVariant =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'

interface LinkProps {
  href?: string
  target?: string
  rel?: string
  to?: string
  onClick?: (e: any) => void
  variant?: LinkVariant
  hover?: boolean
  className?: string
  children?: any
}

/** 链接组件：根据 to/href 渲染 RouterLink 或 <a> */
/* Link 主组件：根据 to/href 渲染 RouterLink 或原生 a */
const Link: FC<LinkProps> = ({
  href = '#',
  target,
  rel,
  to,
  onClick,
  variant,
  hover,
  className,
  children,
}) => {
  let cls = 'link'
  /* 样式变体与 hover 效果 */
  if (variant) cls += ` link-${variant}`
  if (hover) cls += ` link-hover`
  if (className) cls += ` ${className}`
  return to ? (
    <RouterLink className={cls} to={to} onClick={onClick}>
      {children}
    </RouterLink>
  ) : (
    <a className={cls} href={href} target={target} rel={rel} onClick={onClick}>
      {children}
    </a>
  )
}

export default Link
