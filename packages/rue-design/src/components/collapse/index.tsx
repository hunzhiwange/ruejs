/*
Collapse 组件概述
- 形态：arrow/plus/open/close 类名控制视觉与初始状态。
- 标签：支持渲染为 div 或 details；Title/Content 子组件组合内容。
*/
import type { FC } from '@rue-js/rue'
/* 函数组件类型：约束 Collapse 组件签名 */

interface CollapseProps {
  arrow?: boolean
  plus?: boolean
  open?: boolean
  close?: boolean
  tabIndex?: number
  tag?: 'div' | 'details'
  className?: string
  children?: any
}

/** 折叠组件：根据 props 组合类名与标签 */
const Collapse: FC<CollapseProps> = ({
  arrow,
  plus,
  open,
  close,
  tabIndex,
  tag = 'div',
  className,
  children,
}) => {
  let cls = 'collapse'
  /* 箭头/加号样式选择 */
  if (arrow) cls += ' collapse-arrow'
  if (plus) cls += ' collapse-plus'
  /* 初始展开/收起状态 */
  if (open) cls += ' collapse-open'
  if (close) cls += ' collapse-close'
  /* 追加自定义类名 */
  if (className) cls += ` ${className}`
  if (tag === 'details') {
    /* details 语义结构 */
    return <details className={cls}>{children}</details>
  }
  const props: any = { className: cls }
  /* 接收 tabIndex 提升可访问性 */
  if (typeof tabIndex === 'number') props.tabIndex = tabIndex
  return <div {...props}>{children}</div>
}

interface CollapsePartProps {
  as?: 'div' | 'summary'
  className?: string
  children?: any
}

/** 标题子组件：div 或 summary */
const Title: FC<CollapsePartProps> = ({ as = 'div', className, children }) => {
  let cls = 'collapse-title'
  if (className) cls += ` ${className}`
  if (as === 'summary') return <summary className={cls}>{children}</summary>
  return <div className={cls}>{children}</div>
}

/** 内容子组件：collapse-content */
const Content: FC<CollapsePartProps> = ({ className, children }) => {
  let cls = 'collapse-content'
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

type CollapseCompound = FC<CollapseProps> & {
  Title: FC<CollapsePartProps>
  Content: FC<CollapsePartProps>
}

const CollapseCompound: CollapseCompound = Object.assign(Collapse, {
  Title,
  Content,
})

export default CollapseCompound
