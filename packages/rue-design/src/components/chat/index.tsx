/*
Chat 组件概述
- 形态：按 start/end 布局气泡；支持头像、头部时间与脚注。
- 数据驱动：items 批量渲染；或使用复合子组件 Bubble/Header/Footer/Image。
*/
import type { FC } from '@rue-js/rue'
/* 函数组件类型：约束 Chat 组件签名 */

type ChatPlacement = 'start' | 'end'

interface ChatDataItem {
  placement: ChatPlacement
  text?: any
  color?: BubbleColor
  imageSrc?: string
  imageAlt?: string
  imageClassName?: string
  headerName?: any
  headerTime?: any
  headerClassName?: string
  footer?: any
  footerClassName?: string
}

interface ChatProps {
  placement?: ChatPlacement
  className?: string
  children?: any
  items?: ReadonlyArray<ChatDataItem>
}

/** 聊天气泡容器：支持数据驱动或 children 组合 */
const Chat: FC<ChatProps> = ({ placement, className, children, items }) => {
  if (items && items.length) {
    return (
      <>
        {items.map((m, i) => {
          let cls = 'chat'
          cls += ` chat-${m.placement}`
          /* 附加类名 */
          if (className) cls += ` ${className}`
          return (
            <div className={cls} key={i}>
              {/* 头像：可选 */}
              {m.imageSrc ? (
                <Image className={m.imageClassName}>
                  <div className="w-10 rounded-full">
                    <img alt={m.imageAlt ?? 'chat image'} src={m.imageSrc} />
                  </div>
                </Image>
              ) : null}
              {/* 头部：昵称与时间 */}
              {m.headerName || m.headerTime ? (
                <Header className={m.headerClassName}>
                  {m.headerName}{' '}
                  {m.headerTime ? <time className="text-xs opacity-50">{m.headerTime}</time> : null}
                </Header>
              ) : null}
              {/* 气泡正文 */}
              <Bubble color={m.color}>{m.text}</Bubble>
              {/* 脚注：可选 */}
              {m.footer ? <Footer className={m.footerClassName}>{m.footer}</Footer> : null}
            </div>
          )
        })}
      </>
    )
  }

  let cls = 'chat'
  cls += ` chat-${placement}`
  /* 附加类名 */
  if (className) cls += ` ${className}`
  /* children 形式 */
  return <div className={cls}>{children}</div>
}

interface ChatPartProps {
  className?: string
  children?: any
}

type BubbleColor =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

interface BubbleProps extends ChatPartProps {
  color?: BubbleColor
}

/** 气泡子组件：支持颜色类 */
const Bubble: FC<BubbleProps> = ({ color, className, children }) => {
  let cls = 'chat-bubble'
  if (color) cls += ` chat-bubble-${color}`
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

/** 头部子组件：显示昵称与时间等内容 */
const Header: FC<ChatPartProps> = ({ className, children }) => {
  let cls = 'chat-header'
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

/** 脚注子组件：附加说明或操作 */
const Footer: FC<ChatPartProps> = ({ className, children }) => {
  let cls = 'chat-footer'
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

/** 头像子组件：用于包裹头像内容 */
const Image: FC<ChatPartProps> = ({ className, children }) => {
  let cls = 'chat-image'
  if (className) cls += ` ${className}`
  return <div className={cls}>{children}</div>
}

type ChatCompound = FC<ChatProps> & {
  Bubble: FC<BubbleProps>
  Header: FC<ChatPartProps>
  Footer: FC<ChatPartProps>
  Image: FC<ChatPartProps>
}

const ChatCompound: ChatCompound = Object.assign(Chat, {
  Bubble,
  Header,
  Footer,
  Image,
})

export default ChatCompound
