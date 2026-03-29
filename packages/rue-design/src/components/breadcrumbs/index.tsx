/*
Breadcrumbs 组件概述
- 数据驱动：支持 items 渲染链接或文本。
- 复合组件：提供 Item 子组件，便于自定义 children 形式。
*/
import type { FC } from 'rue-js'
/* 函数组件类型：约束 Breadcrumbs 组件签名 */

interface BreadcrumbsProps {
  className?: string
  children?: any
  items?: ReadonlyArray<BreadcrumbsDataItem>
}

interface BreadcrumbsDataItem {
  label?: any
  href?: string
  icon?: any
  className?: string
  linkClassName?: string
}

/** 面包屑组件：根据 items 或 children 渲染 */
/* Breadcrumbs 主组件：根据 items 或 children 渲染面包屑 */
const Breadcrumbs: FC<BreadcrumbsProps> = ({ className, children, items }) => {
  let cls = 'breadcrumbs'
  if (className) cls += ` ${className}`
  if (items && items.length) {
    return (
      <div className={cls}>
        <ul>
          {items.map((it, i) => (
            <li className={it.className ?? ''} key={i}>
              {it.href ? (
                <a className={it.linkClassName ?? ''} href={it.href}>
                  {it.icon ?? null}
                  {it.label}
                </a>
              ) : (
                <span className={it.linkClassName ?? ''}>
                  {it.icon ?? null}
                  {it.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    )
  } else {
    return (
      <div className={cls}>
        <ul>{children}</ul>
      </div>
    )
  }
}

interface BreadcrumbsItemProps {
  className?: string
  children?: any
}

/** 子项组件：用于 children 形式的面包屑项 */
/* 子项组件：用于 children 形式的面包屑项 */
const Item: FC<BreadcrumbsItemProps> = ({ className, children }) => {
  let cls = ''
  if (className) cls += ` ${className}`
  return <li className={cls.trim()}>{children}</li>
}

type BreadcrumbsCompound = FC<BreadcrumbsProps> & {
  Item: FC<BreadcrumbsItemProps>
}

const BreadcrumbsCompound: BreadcrumbsCompound = Object.assign(Breadcrumbs, {
  Item,
})

export default BreadcrumbsCompound
