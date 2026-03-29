/*
Accordion 组件概述
- 数据驱动：支持 items 数据渲染或手动 children 组合。
- 形态：icon/force/use 控制箭头/加号、强制开关、radio 或 details 两种实现。
- 复合组件：提供 Title/Content 子组件便于组合。
*/
import type { FC } from '@rue-js/rue'
/* 函数组件类型：约束 Accordion 组件签名 */

type AccordionIcon = 'arrow' | 'plus'
type AccordionForce = 'open' | 'close'
type AccordionUse = 'radio' | 'details'

interface AccordionDataItem {
  title?: any
  content?: any
  titleClassName?: string
  contentClassName?: string
  icon?: AccordionIcon
  force?: AccordionForce
  use?: AccordionUse
  open?: boolean
  className?: string
}

interface AccordionProps {
  icon?: AccordionIcon
  force?: AccordionForce
  use?: AccordionUse
  name?: string
  open?: boolean
  className?: string
  children?: any
  items?: ReadonlyArray<AccordionDataItem>
}

/** 手风琴组件：根据 props 或 items 渲染折叠块 */
/* icon/force/use/name/open/className 共同决定渲染形态与初始状态 */
const Accordion: FC<AccordionProps> = ({
  icon,
  force,
  use = 'radio',
  name,
  open,
  className,
  children,
  items,
}) => {
  if (items && items.length) {
    return (
      <>
        {items.map((it, i) => {
          /* 每项继承全局 icon/force/use，允许局部覆盖 */
          const iIcon = it.icon ?? icon
          const iForce = it.force ?? force
          const iUse = it.use ?? use
          let iCls = 'collapse'
          /* 箭头/加号样式选择 */
          if (iIcon === 'arrow') iCls += ` collapse-arrow`
          if (iIcon === 'plus') iCls += ` collapse-plus`
          /* 强制展开/收起 */
          if (iForce === 'open') iCls += ` collapse-open`
          if (iForce === 'close') iCls += ` collapse-close`
          /* 追加全局/局部类名 */
          if (className) iCls += ` ${className}`
          if (it.className) iCls += ` ${it.className}`

          if (iUse === 'details') {
            return (
              <details className={iCls} name={name} open={it.open} key={i}>
                {/* 标题区域：details/summary 语义结构 */}
                <summary
                  className={
                    it.titleClassName ? `collapse-title ${it.titleClassName}` : 'collapse-title'
                  }
                >
                  {it.title}
                </summary>
                {/* 内容区域：支持局部类名 */}
                <div
                  className={
                    it.contentClassName
                      ? `collapse-content ${it.contentClassName}`
                      : 'collapse-content'
                  }
                >
                  {it.content}
                </div>
              </details>
            )
          }

          return (
            <div className={iCls} key={i}>
              {/* radio 形态：同组互斥展开 */}
              <input type="radio" name={name} checked={it.open} />
              {/* 标题区域 */}
              <div
                className={
                  it.titleClassName ? `collapse-title ${it.titleClassName}` : 'collapse-title'
                }
              >
                {it.title}
              </div>
              {/* 内容区域 */}
              <div
                className={
                  it.contentClassName
                    ? `collapse-content ${it.contentClassName}`
                    : 'collapse-content'
                }
              >
                {it.content}
              </div>
            </div>
          )
        })}
      </>
    )
  }
  let cls = 'collapse'
  /* 单项模式：由 props 控制形态 */
  if (icon === 'arrow') cls += ` collapse-arrow`
  if (icon === 'plus') cls += ` collapse-plus`
  if (force === 'open') cls += ` collapse-open`
  if (force === 'close') cls += ` collapse-close`
  if (className) cls += ` ${className}`

  if (use === 'details') {
    return (
      <details className={cls} name={name} open={open}>
        {/* 子内容：外部自定义结构 */}
        {children}
      </details>
    )
  }

  return (
    <div className={cls}>
      {/* radio 形态：根据 open 决定是否选中 */}
      <input type="radio" name={name} checked={open} />
      {children}
    </div>
  )
}

interface AccordionPartProps {
  className?: string
  children?: any
  as?: 'div' | 'summary'
}

/** 标题子组件：可渲染为 div 或 summary */
const Title: FC<AccordionPartProps> = ({ className, children, as = 'div' }) => {
  let cls = 'collapse-title'
  if (className) cls += ` ${className}`
  return as === 'summary' ? (
    <summary className={cls}>{children}</summary>
  ) : (
    <div className={cls}>{children}</div>
  )
}

/** 内容子组件：渲染 collapse-content */
const Content: FC<AccordionPartProps> = ({ className, children }) => {
  let cls = 'collapse-content'
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

type AccordionCompound = FC<AccordionProps> & {
  Title: FC<AccordionPartProps>
  Content: FC<AccordionPartProps>
}

const AccordionCompound: AccordionCompound = Object.assign(Accordion, {
  Title,
  Content,
})

export default AccordionCompound
