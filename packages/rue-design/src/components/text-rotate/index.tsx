/*
TextRotate 组件概述
- 行为：在容器内轮换显示多段文本；支持自定义 inner 容器类。
*/
import type { FC } from '@rue-js/rue'
/* 函数组件类型：约束 TextRotate 组件签名 */

interface TextRotateItem {
  text?: any
  className?: string
}

interface TextRotateProps {
  className?: string
  children?: any
  items?: ReadonlyArray<TextRotateItem>
  innerClassName?: string
}

/** 文本轮播组件：items 或 children 渲染 */
/* TextRotate 主组件：文本轮播，支持自定义 inner 容器类 */
const TextRotate: FC<TextRotateProps> = ({ className, children, items, innerClassName }) => {
  let cls = 'text-rotate'
  if (className) cls += ` ${className}`
  if (items && items.length) {
    return (
      <span className={cls}>
        <span className={innerClassName}>
          {items.map((m, i) => (
            <span key={i} className={m.className}>
              {m.text}
            </span>
          ))}
        </span>
      </span>
    )
  }
  return <span className={cls}>{children}</span>
}

export default TextRotate
