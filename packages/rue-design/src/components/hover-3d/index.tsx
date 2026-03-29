/*
Hover3D 组件概述
- 行为：提供 3D 悬浮视觉效果，可选叠加 overlay divs。
- 标签：支持渲染为 div 或 a。
*/
import type { FC } from '@rue-js/rue'
/* 引入 FC 类型用于定义函数式组件 */

type Hover3DAs = 'div' | 'a'
/* 组件可渲染为 div 或 a，便于作为链接使用 */

interface Hover3DProps {
  as?: Hover3DAs
  href?: string
  className?: string
  overlays?: boolean
  children?: any
}
/* props:
 - as: 渲染标签
 - href: 当 as='a' 时的链接
 - overlays: 是否渲染 8 层覆盖 div
*/

const OverlayDivs = () => (
  <>
    {/* 第 1 层覆盖：参与 3D 叠层效果 */}
    <div></div>
    {/* 第 2 层覆盖：参与 3D 叠层效果 */}
    <div></div>
    {/* 第 3 层覆盖：参与 3D 叠层效果 */}
    <div></div>
    {/* 第 4 层覆盖：参与 3D 叠层效果 */}
    <div></div>
    {/* 第 5 层覆盖：参与 3D 叠层效果 */}
    <div></div>
    <div></div>
    {/* 第 6/7 层覆盖：参与 3D 叠层效果 */}
    <div></div>
    <div></div>
    {/* 第 8 层覆盖：参与 3D 叠层效果 */}
  </>
)

/** 3D 悬浮组件：支持 overlays 覆盖层 */
const Hover3D: FC<Hover3DProps> = ({ as = 'div', href, className, overlays = true, children }) => {
  const cls = className ? `hover-3d ${className}` : 'hover-3d'
  /* 组合类名：外层使用 hover-3d，允许追加自定义类 */
  if (as === 'a') {
    return (
      <a href={href} className={cls}>
        {/* 子内容：内嵌实际展示节点 */}
        {children}
        {/* 叠层：根据 overlays 开关渲染 */}
        {overlays ? <OverlayDivs /> : null}
      </a>
    )
  }
  return (
    <div className={cls}>
      {/* 子内容：内嵌实际展示节点 */}
      {children}
      {/* 叠层：根据 overlays 开关渲染 */}
      {overlays ? <OverlayDivs /> : null}
    </div>
  )
}

export default Hover3D
