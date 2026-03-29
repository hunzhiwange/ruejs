/*
JSX Runtime 概述
- 目标：为自动 JSX 转换（react/jsx-runtime 风格）提供 jsx/jsxs/Fragment。
- h 代理：内部调用 @rue-js/rue 的 h 函数生成 VNode。
- children 处理：jsxs 支持多子元素，jsx 支持单子元素或无子元素。
*/
import { Fragment as RueFragment, h } from '@rue-js/rue'

/** 片段标记导出 */
export { RueFragment as Fragment }

/** 生成单子元素或无子元素的 VNode
 * @param type 组件类型或标签名
 * @param props 属性对象
 * @param key 可选 key，将合并进 props
 * @returns VNode
 */
export function jsx(type: any, props: any, key?: any) {
  const p =
    key !== undefined
      ? (() => {
          const o: any = {}
          if (props) {
            for (const k in props) o[k] = props[k]
          }
          o.key = key
          return o
        })()
      : props
        ? props
        : null
  const c = props ? (props as any).children : undefined
  return Array.isArray(c) ? h(type, p, ...c) : c !== undefined ? h(type, p, c) : h(type, p)
}

/** 生成多子元素的 VNode（与 jsx 等价，保持 API 对齐） */
export const jsxs = jsx
