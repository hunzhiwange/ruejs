/*
List 组件概述
- 数据驱动：items 支持 item 与 row 两种类型，cols 可用 ColGrow/ColWrap。
- 复合组件：Row/ColGrow/ColWrap/Item 组合行与列。
*/
import type { FC } from '@rue-js/rue'
/* 函数组件类型：约束 List 组件签名 */

interface ListColDataItem {
  type: 'grow' | 'wrap'
  as?: 'div' | 'p' | 'span'
  className?: string
  content?: any
}

interface ListDataItem {
  type?: 'row' | 'item'
  normal?: boolean
  className?: string
  content?: any
  cols?: ReadonlyArray<ListColDataItem>
}

interface ListProps {
  className?: string
  children?: any
  items?: ReadonlyArray<ListDataItem>
}

/** 列表组件：数据驱动或 children 渲染 */
const List: FC<ListProps> = ({ className, children, items }) => {
  let cls = 'list'
  /* 附加类名 */
  if (className) cls += ` ${className}`
  if (items && items.length) {
    return (
      <ul className={cls}>
        {items.map((m, i) => {
          /* 自动判定类型：有 cols 则为 row，否则 item */
          const t = m.type ?? (m.cols ? 'row' : 'item')
          if (t === 'item') {
            const liCls = m.className ? `${m.className}` : ''
            return (
              <li className={liCls || undefined} key={i}>
                {m.content}
              </li>
            )
          }
          /* normal 行：不带 list-row 类 */
          if (m.normal) {
            const liCls = m.className ? `${m.className}` : ''
            return (
              <li className={liCls || undefined} key={i}>
                {m.content}
                {m.cols?.map((c, ci) => {
                  /* grow/wrap 两类列组件 */
                  if (c.type === 'grow')
                    return (
                      <ColGrow as={c.as} className={c.className} key={ci}>
                        {c.content}
                      </ColGrow>
                    )
                  return (
                    <ColWrap as={c.as} className={c.className} key={ci}>
                      {c.content}
                    </ColWrap>
                  )
                })}
              </li>
            )
          }
          /* 默认行：list-row 类名 */
          let liCls = 'list-row'
          if (m.className) liCls += ` ${m.className}`
          return (
            <li className={liCls} key={i}>
              {m.content}
              {m.cols?.map((c, ci) => {
                if (c.type === 'grow')
                  return (
                    <ColGrow as={c.as} className={c.className} key={ci}>
                      {c.content}
                    </ColGrow>
                  )
                return (
                  <ColWrap as={c.as} className={c.className} key={ci}>
                    {c.content}
                  </ColWrap>
                )
              })}
            </li>
          )
        })}
      </ul>
    )
  }
  /* children 形式 */
  return <ul className={cls}>{children}</ul>
}

interface ListRowProps {
  normal?: boolean
  className?: string
  children?: any
}

/** 行组件：normal 时为普通 li，否则为 list-row */
const Row: FC<ListRowProps> = ({ normal, className, children }) => {
  if (normal) {
    const cls = className ? `${className}` : ''
    return <li className={cls || undefined}>{children}</li>
  }
  let cls = 'list-row'
  if (className) cls += ` ${className}`
  return <li className={cls}>{children}</li>
}

interface ListColProps {
  as?: 'div' | 'p' | 'span'
  className?: string
  children?: any
}

/** 列：可伸展区域 */
const ColGrow: FC<ListColProps> = ({ as = 'div', className, children }) => {
  let cls = 'list-col-grow'
  if (className) cls += ` ${className}`
  if (as === 'p') return <p className={cls}>{children}</p>
  if (as === 'span') return <span className={cls}>{children}</span>
  return <div className={cls}>{children}</div>
}

/** 列：包裹区域 */
const ColWrap: FC<ListColProps> = ({ as = 'div', className, children }) => {
  let cls = 'list-col-wrap'
  if (className) cls += ` ${className}`
  if (as === 'p') return <p className={cls}>{children}</p>
  if (as === 'span') return <span className={cls}>{children}</span>
  return <div className={cls}>{children}</div>
}

type ListCompound = FC<ListProps> & {
  Row: FC<ListRowProps>
  ColGrow: FC<ListColProps>
  ColWrap: FC<ListColProps>
  Item: FC<ListItemProps>
}

interface ListItemProps {
  className?: string
  children?: any
}

/** 项组件：普通 li */
const Item: FC<ListItemProps> = ({ className, children }) => {
  let cls = ''
  if (className) cls += ` ${className}`
  return <li className={cls.trim()}>{children}</li>
}

const ListCompound: ListCompound = Object.assign(List, {
  Row,
  ColGrow,
  ColWrap,
  Item,
})

export default ListCompound
