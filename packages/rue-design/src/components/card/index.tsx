/*
Card 组件概述
- 形态：size/border/dash/side/imageFull 等组合类名。
- 复合组件：Body/Title/Actions/Figure 子组件拼装卡片内容结构。
*/
import type { FC } from 'rue-js'

type CardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface CardProps {
  size?: CardSize
  border?: boolean
  dash?: boolean
  side?: boolean
  imageFull?: boolean
  className?: string
  children?: any
}

/** 卡片组件：根据 props 渲染卡片容器 */
const Card: FC<CardProps> = ({ size, border, dash, side, imageFull, className, children }) => {
  let cls = 'card'
  if (size) cls += ` card-${size}`
  if (border) cls += ` card-border`
  if (dash) cls += ` card-dash`
  if (side) cls += ` card-side`
  if (imageFull) cls += ` image-full`
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

interface CardPartProps {
  className?: string
  children?: any
}

/** 卡片主体区域 */
const Body: FC<CardPartProps> = ({ className, children }) => {
  let cls = 'card-body'
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

/** 卡片标题区域 */
const Title: FC<CardPartProps> = ({ className, children }) => {
  let cls = 'card-title'
  if (className) cls += ` ${className}`
  return <h2 className={cls}>{children}</h2>
}

/** 卡片操作区域 */
const Actions: FC<CardPartProps> = ({ className, children }) => {
  let cls = 'card-actions'
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

/** 卡片媒体区域（figure） */
const Figure: FC<CardPartProps> = ({ className, children }) => {
  let cls = 'figure'
  if (className) cls += ` ${className}`
  return <figure className={cls}>{children}</figure>
}

type CardCompound = FC<CardProps> & {
  Body: FC<CardPartProps>
  Title: FC<CardPartProps>
  Actions: FC<CardPartProps>
  Figure: FC<CardPartProps>
}

const CardCompound: CardCompound = Object.assign(Card, {
  Body,
  Title,
  Actions,
  Figure,
})

export default CardCompound
