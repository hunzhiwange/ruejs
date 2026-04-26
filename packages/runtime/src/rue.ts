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
import {
  CUSTOM_ELEMENT_EMIT_BRIDGE_KEY,
  type CustomElementEmitBridge,
} from './custom-elements.shared'
import { getDOMAdapter, getParentNode } from './dom'
import { mountNormalizedRenderableToTarget } from './renderable-bridge'
import { runOwnerCleanupBucket } from './renderable-lifecycle'
import { normalizeRenderable } from './renderable-normalize'
import type { NormalizedRenderable, Renderable } from './renderable'

getDOMAdapter()

export interface ComponentProps {
  [key: string]: any
  children?: ChildInput
}
export interface RueMountHandle {
  __rue_mount_id: unknown
}

export type RenderableInput = Renderable | RueMountHandle | ReadonlyArray<RenderableInput>
export type RenderableOutput = Renderable | RueMountHandle | ReadonlyArray<RenderableOutput>
/** @deprecated Prefer RenderableOutput. */
export type RenderOutput = RenderableOutput
export type VaporSetupResult = DomNodeLike
type Child = RenderableOutput
type ChildInput = Child | ReadonlyArray<ChildInput>
export type PropsWithChildren<P = {}> = P & { children?: ChildInput }
export type FC<P = {}> = (props: PropsWithChildren<P>) => RenderableOutput
export type ComponentInstance<P = {}> = FC<P>
export type Rue = any

const runtimeDOMBridgeByInstance = new WeakMap<object, unknown>()

const canTrackRuntime = (runtime: unknown): runtime is object =>
  (typeof runtime === 'object' || typeof runtime === 'function') && runtime != null

export const getMarkedRuntimeDOMBridge = (runtime: unknown) => {
  if (!canTrackRuntime(runtime)) {
    return undefined
  }
  return runtimeDOMBridgeByInstance.get(runtime)
}

export const markRuntimeDOMBridge = (runtime: unknown, bridge: unknown) => {
  if (!canTrackRuntime(runtime)) {
    return
  }
  runtimeDOMBridgeByInstance.set(runtime, bridge)
}

export const runWithRuntime = <T>(runtime: unknown, runner: () => T): T => {
  if (!canTrackRuntime(runtime)) {
    return runner()
  }

  const globalRecord = globalThis as typeof globalThis & {
    __rue_active?: unknown
  }
  const hadActiveRuntime = Object.prototype.hasOwnProperty.call(globalRecord, '__rue_active')
  const prevRuntime = globalRecord.__rue_active

  globalRecord.__rue_active = runtime
  try {
    return runner()
  } finally {
    if (hadActiveRuntime) {
      globalRecord.__rue_active = prevRuntime
    } else {
      delete globalRecord.__rue_active
    }
  }
}

/** 当前 Rue 实例（若不存在则按需初始化） */
const initialDOMBridge = (globalThis as any).__rue_dom
const rue: any = ((globalThis as any).__rue ||
  ((globalThis as any).__rue = createRueWasm(initialDOMBridge))) as any
markRuntimeDOMBridge(rue, initialDOMBridge)
/** 获取激活的 Rue 实例：优先 __rue_active，其次默认 __rue */
const getRue = () => (globalThis as any).__rue_active || (globalThis as any).__rue

const renderOwnerByContainer = new WeakMap<object, unknown>()
const renderOwnerByRangeStart = new WeakMap<object, unknown>()
const renderOwnerByAnchor = new WeakMap<object, unknown>()
const renderOwnerByStaticAnchor = new WeakMap<object, unknown>()

const syncRenderableOwner = (
  owners: WeakMap<object, unknown>,
  key: object,
  nextOwner: unknown,
) => {
  const prevOwner = owners.get(key)
  if (prevOwner && prevOwner !== nextOwner) {
    runOwnerCleanupBucket(prevOwner)
  }

  if ((typeof nextOwner === 'object' || typeof nextOwner === 'function') && nextOwner != null) {
    owners.set(key, nextOwner)
    return
  }

  owners.delete(key)
}

const DEFAULT_UNSUPPORTED_OBJECT_INPUT_ERROR =
  'Unsupported object inputs are no longer accepted on the default @rue-js/runtime entry.'

const RUE_MOUNT_ID_KEY = '__rue_mount_id'

const isDirectRenderableOwner = (value: unknown): value is { nodes: readonly DomNodeLike[] } =>
  !!value && typeof value === 'object' && Array.isArray((value as { nodes?: unknown }).nodes)

const isAnchorTargetMounted = (parent: DomElementLike, anchor: DomNodeLike) =>
  getParentNode(anchor) === parent

const isBetweenTargetMounted = (
  parent: DomElementLike,
  start: DomNodeLike,
  end: DomNodeLike,
) => getParentNode(start) === parent && getParentNode(end) === parent

type DefaultRenderableAnalysis =
  | {
      kind: 'renderable'
      value: NormalizedRenderable
    }
  | {
      kind: 'mount-handle'
    }

const isMountHandle = (value: unknown): value is RueMountHandle =>
  !!value && typeof value === 'object' && RUE_MOUNT_ID_KEY in (value as Record<string, unknown>)

const analyzeDefaultRenderableInput = (value: unknown): DefaultRenderableAnalysis => {
  if (isMountHandle(value)) {
    return { kind: 'mount-handle' }
  }

  if (Array.isArray(value)) {
    let containsMountHandle = false
    const normalized: NormalizedRenderable[] = []

    for (const item of value) {
      const analysis = analyzeDefaultRenderableInput(item)
      if (analysis.kind === 'mount-handle') {
        containsMountHandle = true
        continue
      }
      if (containsMountHandle) {
        continue
      }
      if (Array.isArray(analysis.value)) {
        normalized.push(...analysis.value)
        continue
      }
      normalized.push(analysis.value)
    }

    if (containsMountHandle) {
      return { kind: 'mount-handle' }
    }

    return { kind: 'renderable', value: normalized }
  }

  const normalized = normalizeRenderable(value)
  if (normalized.kind === 'renderable') {
    return normalized
  }

  throw new TypeError(DEFAULT_UNSUPPORTED_OBJECT_INPUT_ERROR)
}

const getEffectiveChildren = (
  props: ComponentProps | null,
  children: ChildInput[],
): ChildInput[] => {
  if (children.length > 0) {
    return children
  }
  if (props?.children === undefined) {
    return []
  }
  return [props.children]
}

const normalizeCreateElementChild = (value: ChildInput): ChildInput => {
  if (Array.isArray(value)) {
    return value.map(item => normalizeCreateElementChild(item as ChildInput)) as ChildInput
  }
  if (typeof value === 'number') {
    return String(value) as ChildInput
  }
  return value
}

const normalizeCreateElementChildren = (children: ChildInput[]): ChildInput[] =>
  children.map(child => normalizeCreateElementChild(child))

const assertDefaultChildren = (props: ComponentProps | null, children: ChildInput[]) => {
  for (const child of getEffectiveChildren(props, children)) {
    analyzeDefaultRenderableInput(child)
  }
}
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
) => {
  const normalizedChildren = normalizeCreateElementChildren(children)
  assertDefaultChildren(props, normalizedChildren)
  return getRue().createElement(type, props, normalizedChildren as any) as RenderableOutput
}
/** 渲染到容器 */
export const render = (value: RenderableInput, container: DomElementLike) => {
  const analysis = analyzeDefaultRenderableInput(value)
  if (analysis.kind === 'renderable') {
    const prevOwner = renderOwnerByContainer.get(container as object)
    if (prevOwner && !isDirectRenderableOwner(prevOwner)) {
      getRue().render(null, container)
    }
    const owner = mountNormalizedRenderableToTarget(analysis.value, {
      kind: 'container',
      container,
    })
    syncRenderableOwner(renderOwnerByContainer, container as object, owner)
    return
  }

  syncRenderableOwner(renderOwnerByContainer, container as object, value as unknown)
  return getRue().render(value, container)
}
/** 在区间 [start,end] 之间渲染 */
export const renderBetween = (
  value: RenderableInput,
  parent: DomElementLike,
  start: DomNodeLike,
  end: DomNodeLike,
) => {
  if (!isBetweenTargetMounted(parent, start, end)) {
    syncRenderableOwner(renderOwnerByRangeStart, start as object, undefined)
    return
  }

  const analysis = analyzeDefaultRenderableInput(value)
  if (analysis.kind === 'renderable') {
    const prevOwner = renderOwnerByRangeStart.get(start as object)
    if (prevOwner && !isDirectRenderableOwner(prevOwner)) {
      getRue().renderBetween(null, parent, start, end)
    }
    const owner = mountNormalizedRenderableToTarget(
      analysis.value,
      {
        kind: 'between',
        parent,
        start,
        end,
      },
      prevOwner,
    )
    syncRenderableOwner(renderOwnerByRangeStart, start as object, owner)
    return
  }

  syncRenderableOwner(renderOwnerByRangeStart, start as object, value as unknown)
  return getRue().renderBetween(value, parent, start, end)
}
/** 在单个尾锚点前渲染 */
export const renderAnchor = (value: RenderableInput, parent: DomElementLike, anchor: DomNodeLike) => {
  if (!isAnchorTargetMounted(parent, anchor)) {
    syncRenderableOwner(renderOwnerByAnchor, anchor as object, undefined)
    return
  }

  const analysis = analyzeDefaultRenderableInput(value)
  if (analysis.kind === 'renderable') {
    const prevOwner = renderOwnerByAnchor.get(anchor as object)
    if (prevOwner && !isDirectRenderableOwner(prevOwner)) {
      getRue().renderAnchor(null, parent, anchor)
    }
    const owner = mountNormalizedRenderableToTarget(
      analysis.value,
      {
        kind: 'anchor',
        parent,
        anchor,
      },
      isDirectRenderableOwner(prevOwner) ? prevOwner : undefined,
    )
    syncRenderableOwner(renderOwnerByAnchor, anchor as object, owner)
    return
  }

  syncRenderableOwner(renderOwnerByAnchor, anchor as object, value as unknown)
  return getRue().renderAnchor(value, parent, anchor)
}
/** 在单个临时锚点前执行一次性静态渲染 */
export const renderStatic = (value: RenderableInput, parent: DomElementLike, anchor: DomNodeLike) => {
  if (!isAnchorTargetMounted(parent, anchor)) {
    syncRenderableOwner(renderOwnerByStaticAnchor, anchor as object, undefined)
    return
  }

  const analysis = analyzeDefaultRenderableInput(value)
  if (analysis.kind === 'renderable') {
    const owner = mountNormalizedRenderableToTarget(analysis.value, {
      kind: 'static',
      parent,
      anchor,
    })
    syncRenderableOwner(renderOwnerByStaticAnchor, anchor as object, owner)
    return
  }

  syncRenderableOwner(renderOwnerByStaticAnchor, anchor as object, value as unknown)
  return getRue().renderStatic(value, parent, anchor)
}
/** 挂载应用到容器 */
export const mount = (App: ComponentInstance, container: string | DomElementLike) =>
  getRue().mount(App, container)
/** 安装插件 */
export const use = (plugin: any, ...options: any[]) => getRue().use(plugin, ...options)
const resolveCustomElementEmitBridge = (props: ComponentProps): CustomElementEmitBridge | null => {
  if (!props || typeof props !== 'object') {
    return null
  }
  const bridge = (props as Record<string, unknown>)[CUSTOM_ELEMENT_EMIT_BRIDGE_KEY]
  return typeof bridge === 'function' ? (bridge as CustomElementEmitBridge) : null
}
/** 生成事件发射器（根据 props） */
export const emitted = (props: ComponentProps) => {
  const baseEmit = getRue().emitted(props)
  const bridge = resolveCustomElementEmitBridge(props)
  if (!bridge) {
    return baseEmit
  }
  return (eventName: string, ...args: unknown[]) => {
    baseEmit(eventName, ...args)
    bridge(eventName, args)
  }
}
/** Vapor 块模式：返回 runtime-vapor 的最小挂载句柄，而不是旧的 type/props dev object */
export const vapor = (setup: () => VaporSetupResult) => getRue().vapor(setup) as RenderableOutput
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
  const bridge = (globalThis as any).__rue_dom
  const runtime = createRueWasm(bridge) as any
  markRuntimeDOMBridge(runtime, bridge)
  return runtime
}

// 为 JSX/TSX 提供工厂函数
/** JSX/TSX 工厂函数：与 createElement 同源
 * @returns RenderableOutput
 */
export function h<P = {}>(
  type: string | ComponentInstance<P>,
  props: ComponentProps | null,
  ...children: ChildInput[]
): RenderableOutput {
  const normalizedChildren = normalizeCreateElementChildren(children)
  assertDefaultChildren(props, normalizedChildren)
  return getRue().createElement(type, props, normalizedChildren as any) as RenderableOutput
}
/** 片段标记：用于 JSX 片段渲染 */
export const Fragment = 'fragment'

// 类型导出（已在上方直接导出）
