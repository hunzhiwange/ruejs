/*
运行时公共出口概述
- 统一导出 Rue 核心 API 与内置组件、reactivity 工具。
- 编译器 helper 只从 internal 子路径导出，公共入口不携带 DOM 兼容层。
- 响应式内核和客户端运行时实现统一内置于当前包。
*/
export { version } from './version'

export type * from './runtime-types'
export type { RueContext, ContextProviderProps } from './context'
export * from './rue'
export * from './public/reactivity'
export * from './public/builtins'
export * from './public/hooks'
export * from './public/custom-elements'
