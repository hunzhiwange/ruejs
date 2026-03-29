/*
Stat 组件概述
- 列表容器：水平/垂直布局；数据驱动或 children 渲染。
- 复合组件：Item/Title/Value/Desc/Figure/Actions 组合统计卡。
*/
import type { FC } from '@rue-js/rue'
/* 函数组件类型：约束 Stat 组件签名 */

type StatsDirection = 'horizontal' | 'vertical'

interface StatsProps {
  direction?: StatsDirection
  className?: string
  children?: any
  items?: ReadonlyArray<StatDataItem>
}

interface StatDataItem {
  center?: boolean
  className?: string
  figure?: any
  figureClassName?: string
  title?: any
  titleClassName?: string
  value?: any
  valueClassName?: string
  desc?: any
  descClassName?: string
  actions?: any
  actionsClassName?: string
}

/** 统计列表容器组件 */
const Stat: FC<StatsProps> = ({ direction, className, children, items }) => {
  let cls = 'stats'
  /* 布局方向：horizontal/vertical */
  if (direction) cls += ` stats-${direction}`
  /* 附加类名 */
  if (className) cls += ` ${className}`
  if (items && items.length) {
    return (
      <div className={cls}>
        {items.map((m, i) => {
          const itemCls = m.className
          return (
            /* 单项：按 center/figure/title/value/desc/actions 组合 */
            <Item center={m.center} className={itemCls} key={i}>
              {m.figure ? <Figure className={m.figureClassName}>{m.figure}</Figure> : null}
              {m.title ? <Title className={m.titleClassName}>{m.title}</Title> : null}
              {m.value ? <Value className={m.valueClassName}>{m.value}</Value> : null}
              {m.desc ? <Desc className={m.descClassName}>{m.desc}</Desc> : null}
              {m.actions ? <Actions className={m.actionsClassName}>{m.actions}</Actions> : null}
            </Item>
          )
        })}
      </div>
    )
  }
  /* children 形式 */
  return <div className={cls}>{children}</div>
}

interface StatItemProps {
  center?: boolean
  className?: string
  children?: any
}

/** 单个统计项容器 */
const Item: FC<StatItemProps> = ({ center, className, children }) => {
  let cls = 'stat'
  /* 居中布局 */
  if (center) cls += ` place-items-center`
  /* 附加类名 */
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

interface StatPartProps {
  className?: string
  children?: any
}

/** 标题区域 */
const Title: FC<StatPartProps> = ({ className, children }) => {
  let cls = 'stat-title'
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

/** 数值区域 */
const Value: FC<StatPartProps> = ({ className, children }) => {
  let cls = 'stat-value'
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

/** 描述区域 */
const Desc: FC<StatPartProps> = ({ className, children }) => {
  let cls = 'stat-desc'
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

/** 图示区域 */
const Figure: FC<StatPartProps> = ({ className, children }) => {
  let cls = 'stat-figure'
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

/** 操作区域 */
const Actions: FC<StatPartProps> = ({ className, children }) => {
  let cls = 'stat-actions'
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

type StatCompound = FC<StatsProps> & {
  Item: FC<StatItemProps>
  Title: FC<StatPartProps>
  Value: FC<StatPartProps>
  Desc: FC<StatPartProps>
  Figure: FC<StatPartProps>
  Actions: FC<StatPartProps>
}

const StatCompound: StatCompound = Object.assign(Stat, {
  Item,
  Title,
  Value,
  Desc,
  Figure,
  Actions,
})

export default StatCompound
