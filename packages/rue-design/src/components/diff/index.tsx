/*
Diff 组件概述
- 结构：Diff 容器 + Item1/Item2 两侧内容 + Resizer 分隔条。
- 用途：对比两段内容，支持键盘可访问性与自定义类。
*/
import type { FC } from '@rue-js/rue'
/* 函数组件类型：约束 Diff 组件签名 */

interface DiffProps {
  className?: string
  tabIndex?: number
  children?: any
}

/** 对比容器：figure 包裹两侧内容与分隔条 */
const Diff: FC<DiffProps> = ({ className, tabIndex, children }) => {
  let cls = 'diff'
  /* 附加类名 */
  if (className) cls += ` ${className}`
  return (
    <figure className={cls} tabIndex={tabIndex}>
      {/* 两侧内容与分隔条作为子节点传入 */}
      {children}
    </figure>
  )
}

interface DiffItemProps {
  className?: string
  role?: string
  tabIndex?: number
  children?: any
}

/** 左侧内容区域 */
const Item1: FC<DiffItemProps> = ({ className, role, tabIndex, children }) => {
  let cls = 'diff-item-1'
  /* 附加类名与可访问性属性 */
  if (className) cls += ` ${className}`
  return (
    <div className={cls} role={role} tabIndex={tabIndex}>
      {children}
    </div>
  )
}

/** 右侧内容区域 */
const Item2: FC<DiffItemProps> = ({ className, role, tabIndex, children }) => {
  let cls = 'diff-item-2'
  /* 附加类名与可访问性属性 */
  if (className) cls += ` ${className}`
  return (
    <div className={cls} role={role} tabIndex={tabIndex}>
      {children}
    </div>
  )
}

interface DiffResizerProps {
  className?: string
}

/** 分隔条组件 */
const Resizer: FC<DiffResizerProps> = ({ className }) => {
  let cls = 'diff-resizer'
  /* 附加类名 */
  if (className) cls += ` ${className}`
  return <div className={cls} />
}

type DiffCompound = FC<DiffProps> & {
  Item1: FC<DiffItemProps>
  Item2: FC<DiffItemProps>
  Resizer: FC<DiffResizerProps>
}

const DiffCompound: DiffCompound = Object.assign(Diff, {
  Item1,
  Item2,
  Resizer,
})

export default DiffCompound
