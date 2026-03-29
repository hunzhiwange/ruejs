/*
HoverGallery 组件概述
- 数据驱动：支持字符串 src、对象项或自定义节点 node。
- 标签：可渲染为 figure 或 div。
*/
import type { FC } from 'rue-js'
/* 函数组件类型：约束 HoverGallery 组件签名 */

interface HoverGalleryItem {
  src?: string
  alt?: string
  className?: string
  node?: any
}

interface HoverGalleryProps {
  as?: 'figure' | 'div'
  className?: string
  children?: any
  items?: ReadonlyArray<HoverGalleryItem | string | any>
}

/** 悬浮画廊：支持多种 item 输入形态 */
const HoverGallery: FC<HoverGalleryProps> = ({ as = 'figure', className, children, items }) => {
  let cls = 'hover-gallery'
  /* 附加类名 */
  if (className) cls += ` ${className}`

  const content =
    items && items.length
      ? items.map((it, i) => {
          /* 字符串项：直接作为图片 src 使用 */
          if (typeof it === 'string') {
            return <img key={i} src={it} alt={''} />
          }
          if (it && typeof it === 'object') {
            const obj = it as HoverGalleryItem
            /* 自定义节点：直接返回 */
            if (obj.node) return obj.node
            /* 对象项：有 src 则渲染图片 */
            if (obj.src)
              return <img key={i} src={obj.src} alt={obj.alt ?? ''} className={obj.className} />
          }
          /* 其他类型：原样返回 */
          return it
        })
      : children

  /* 选择渲染标签：figure 或 div */
  return as === 'figure' ? (
    <figure className={cls}>{content}</figure>
  ) : (
    <div className={cls}>{content}</div>
  )
}

export default HoverGallery
