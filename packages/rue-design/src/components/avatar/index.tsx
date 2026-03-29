/*
Avatar 组件概述
- 状态：online/offline/placeholder 三种状态类名。
- 群组：Avatar.Group 支持数据驱动或 children 渲染多个头像。
*/
import type { FC } from '@rue-js/rue'
/* 函数组件类型：约束 Avatar 组件签名 */

type AvatarStatus = 'online' | 'offline' | 'placeholder'

interface AvatarProps {
  status?: AvatarStatus
  className?: string
  children?: any
}

/** 头像组件：根据状态与自定义类名渲染 */
const Avatar: FC<AvatarProps> = ({ status, className, children }) => {
  let cls = 'avatar not-prose'
  /* 状态类：online/offline/placeholder */
  if (status) cls += ` avatar-${status}`
  /* 追加自定义类名 */
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

interface AvatarGroupItem {
  status?: AvatarStatus
  children?: any
}

interface AvatarGroupProps {
  className?: string
  children?: any
  items?: ReadonlyArray<AvatarGroupItem>
}

/** 头像群组：支持 items 或 children */
const Group: FC<AvatarGroupProps> = ({ className, children, items }) => {
  let cls = 'avatar-group'
  /* 群组容器类名 */
  if (className) cls += ` ${className}`
  if (items && items.length) {
    return (
      <div className={cls}>
        {items.map((m, i) => (
          /* 逐项渲染子头像 */
          <Avatar status={m.status} key={i}>
            {m.children}
          </Avatar>
        ))}
      </div>
    )
  }
  /* children 形式 */
  return <div className={cls}>{children}</div>
}

type AvatarCompound = FC<AvatarProps> & {
  Group: FC<AvatarGroupProps>
}

const AvatarCompound: AvatarCompound = Object.assign(Avatar, {
  Group,
})

export default AvatarCompound
