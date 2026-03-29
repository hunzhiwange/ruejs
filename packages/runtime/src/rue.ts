/*
Rue 运行时架构概述
- Wasm 驱动：通过 @rue-js/runtime-vapor 提供的 createRue 工厂，从 wasm 实现获取核心 API。
- DOM 适配：依赖全局 __rue_dom（由 DOMAdapter 注入）作为底层宿主操作集合。
- API 代理：getRue() 返回当前激活的 Rue 实例（支持切换），导出函数均为薄代理到 wasm 核心。
- JSX 工厂：h 函数用于 TSX/JSX，Fragment 用于片段渲染。
*/
'use strict'

import { createRue as createRueWasm } from '@rue-js/runtime-vapor'
import type { DomNodeLike, DomElementLike } from './dom'
import { getDOMAdapter } from './dom'

getDOMAdapter()

export interface ComponentProps {
  [key: string]: any
  children?: Child | Child[]
}
type Child = VNode | string | number | boolean | null | undefined
type ChildInput = Child | ChildInput[]
export type PropsWithChildren<P = {}> = P & { children?: Child | Child[] }
export type FC<P = {}> = (props: PropsWithChildren<P>) => VNode
export type ComponentInstance<P = {}> = FC<P>
export type VNode = any
export type Rue = any

/** 当前 Rue 实例（若不存在则按需初始化） */
const rue: any = ((globalThis as any).__rue ||
  ((globalThis as any).__rue = createRueWasm((globalThis as any).__rue_dom))) as any
/** 获取激活的 Rue 实例：优先 __rue_active，其次默认 __rue */
const getRue = () => (globalThis as any).__rue_active || (globalThis as any).__rue
;(rue as any).handleError =
  (rue as any).handleError ??
  ((error: any, _instance?: any) => {
    try {
      ;(console as any).error?.(error)
    } catch {}
  })

/** 创建元素（JSX 工厂同源）
 * @param type 标签字符串或组件实例
 * @param props 属性对象
 * @param children 子元素集合
 */
export const createElement = <P = {}>(
  type: string | ComponentInstance<P>,
  props: ComponentProps | null,
  ...children: ChildInput[]
) => getRue().createElement(type, props, children as any)
/** 渲染到容器 */
export const render = (vnode: VNode, container: DomElementLike) => getRue().render(vnode, container)
/** 在区间 [start,end] 之间渲染 */
export const renderBetween = (
  vnode: VNode,
  parent: DomElementLike,
  start: DomNodeLike,
  end: DomNodeLike,
) => getRue().renderBetween(vnode, parent, start, end)
/** 挂载应用到容器 */
export const mount = (App: ComponentInstance, container: string | DomElementLike) =>
  getRue().mount(App, container)
/** 安装插件 */
export const use = (plugin: any, ...options: any[]) => getRue().use(plugin, ...options)
/** 生成事件发射器（根据 props） */
export const emitted = (props: ComponentProps) => getRue().emitted(props)
/** Vapor 裸元素模式：返回带 setup 的 dev VNode，由 Rue 侧统一挂载 */
export const vapor = (setup: () => { vaporElement: DomNodeLike }) => ({
  type: 'vapor',
  props: { setup },
  children: [],
})
/** 生命周期：创建前 */
export const onBeforeCreate = (fn: () => void) => getRue().onBeforeCreate(fn)
/** 生命周期：已创建 */
export const onCreated = (fn: () => void) => getRue().onCreated(fn)
/** 生命周期：挂载前 */
export const onBeforeMount = (fn: () => void) => getRue().onBeforeMount(fn)
/** 生命周期：已挂载 */
export const onMounted = (fn: () => void) => getRue().onMounted(fn)
/** 生命周期：更新前 */
export const onBeforeUpdate = (fn: () => void) => getRue().onBeforeUpdate(fn)
/** 生命周期：已更新 */
export const onUpdated = (fn: () => void) => getRue().onUpdated(fn)
/** 生命周期：卸载前 */
export const onBeforeUnmount = (fn: () => void) => getRue().onBeforeUnmount(fn)
/** 生命周期：已卸载 */
export const onUnmounted = (fn: () => void) => getRue().onUnmounted(fn)
/** 错误处理钩子 */
export const onError = (fn: (error: any, instance?: any) => void) => getRue().onError(fn)
/** 获取当前容器（挂载上下文） */
export const getCurrentContainer = () => getRue().getCurrentContainer()
export default rue

/** 直接创建 Rue 实例（用于独立初始化） */
export function createRue() {
  if (!(globalThis as any).__rue_dom) {
    getDOMAdapter()
  }
  return createRueWasm((globalThis as any).__rue_dom) as any
}

// 为 JSX/TSX 提供工厂函数
/** JSX/TSX 工厂函数：与 createElement 同源
 * @returns VNode
 */
export function h<P = {}>(
  type: string | ComponentInstance<P>,
  props: ComponentProps | null,
  ...children: ChildInput[]
): VNode {
  return getRue().createElement(type, props, children as any)
}
/** 片段标记：用于 JSX 片段渲染 */
export const Fragment = 'fragment'

// 类型导出（已在上方直接导出）
