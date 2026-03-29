/*
Timeline 组件概述
- 形态：方向（horizontal/vertical）、紧凑与图标吸附。
- 复合组件：Start/Middle/End 三段内容，支持前后分隔线。
*/
import type { FC } from '@rue-js/rue'
/* 函数组件类型：约束 Timeline 组件签名 */

type TimelineDirection = 'horizontal' | 'vertical'

interface TimelineProps {
  direction?: TimelineDirection
  snapIcon?: boolean
  compact?: boolean
  className?: string
  children?: any
  items?: ReadonlyArray<TimelineItem>
}

interface TimelineItemPart {
  box?: boolean
  className?: string
  content?: any
}

interface TimelineItem {
  beforeLine?: boolean
  afterLine?: boolean
  start?: TimelineItemPart
  middle?: { className?: string; content?: any }
  end?: TimelineItemPart
  liClassName?: string
}

/** 时间轴组件：数据驱动或 children 渲染 */
const Timeline: FC<TimelineProps> = ({
  direction,
  snapIcon,
  compact,
  className,
  children,
  items,
}) => {
  let cls = 'timeline'
  /* 方向类：horizontal/vertical */
  if (direction) cls += ` timeline-${direction}`
  /* 图标吸附与紧凑模式 */
  if (snapIcon) cls += ` timeline-snap-icon`
  if (compact) cls += ` timeline-compact`
  /* 附加类名 */
  if (className) cls += ` ${className}`
  if (items && items.length) {
    return (
      <ul className={cls}>
        {items.map((it, i) => (
          <li className={it.liClassName} key={i}>
            {/* 前置分隔线 */}
            {it.beforeLine ? <hr /> : null}
            {/* 起始段 */}
            {it.start ? (
              <Start box={it.start.box} className={it.start.className}>
                {it.start.content}
              </Start>
            ) : null}
            {/* 中间段 */}
            {it.middle ? (
              <Middle className={it.middle.className}>{it.middle.content}</Middle>
            ) : null}
            {/* 结束段 */}
            {it.end ? (
              <End box={it.end.box} className={it.end.className}>
                {it.end.content}
              </End>
            ) : null}
            {/* 后置分隔线 */}
            {it.afterLine ? <hr /> : null}
          </li>
        ))}
      </ul>
    )
  }
  /* children 形式 */
  return <ul className={cls}>{children}</ul>
}

interface TimelinePartProps {
  box?: boolean
  className?: string
  children?: any
}

/** 起始段：可选 box 样式 */
const Start: FC<TimelinePartProps> = ({ box, className, children }) => {
  let cls = 'timeline-start'
  if (box) cls += ` timeline-box`
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

/** 中间段 */
const Middle: FC<TimelinePartProps> = ({ className, children }) => {
  let cls = 'timeline-middle'
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

/** 结束段：可选 box 样式 */
const End: FC<TimelinePartProps> = ({ box, className, children }) => {
  let cls = 'timeline-end'
  if (box) cls += ` timeline-box`
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

type TimelineCompound = FC<TimelineProps> & {
  Start: FC<TimelinePartProps>
  Middle: FC<TimelinePartProps>
  End: FC<TimelinePartProps>
}

const TimelineCompound: TimelineCompound = Object.assign(Timeline, {
  Start,
  Middle,
  End,
})

export default TimelineCompound
