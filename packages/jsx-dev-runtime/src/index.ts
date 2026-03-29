/*
JSX Dev Runtime 概述
- 目标：面向开发模式的 JSX 运行时，提供 jsx、jsxDEV 与 Fragment。
- 行为：jsxDEV 在此直接调用 jsx，保留签名以兼容编译器输出。
*/
import { Fragment as RueFragment, h } from '@rue-js/rue'

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

/** 片段标记导出（开发模式，与 runtime 保持一致） */
export { RueFragment as Fragment }

/** 开发模式专用的 JSX API，兼容编译器扩展参数
 * @returns VNode
 */
export function jsxDEV(
  type: any,
  props: any,
  key?: any,
  _isStaticChildren?: boolean,
  _source?: any,
  _self?: any,
) {
  return jsx(type, props, key)
}
