import type { PortableHandle } from './runtime-core/protocol'
import type { StateRef } from './runtime-core/reactive'
import type { CompiledRootHandle } from './compiled-root'

/** JSX/组件 props 的通用结构，允许任意属性和 children。 */
export interface ComponentProps {
  /** 组件或元素属性。 */
  [key: string]: any
  /** JSX 子节点。 */
  children?: ChildInput
}

/** 显式运行时边界返回的可挂载句柄集合。 */
export type RuntimeHandle = PortableHandle | CompiledRootHandle

/** 编译运行时可以闭包化挂载的值。 */
export type RenderOutput =
  | Node
  | RuntimeHandle
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlyArray<RenderOutput>

/** render 接受的编译值。 */
export type RenderInput = RenderOutput

export type Child = RenderOutput
export type ChildInput = Child | StateRef<ChildInput> | ReadonlyArray<ChildInput>

/** 给组件 props 自动附加 children 字段。 */
export type PropsWithChildren<P = {}> = P & { children?: ChildInput }

/** Rue 函数组件类型。 */
export type FC<P = {}> = (props: PropsWithChildren<P>) => RenderOutput

/** 组件实例类型，当前等价于函数组件。 */
export type ComponentInstance<P = {}> = FC<P>

/** Rue runtime 实例类型；底层由 Wasm 工厂返回，暂以 any 兼容。 */
export type Rue = any

export type OwnedMountProtocol = {
  buildOwnedMount(): unknown
  commitMounted(token: unknown, deferMounted?: boolean): boolean
  flushMounted(token: unknown): boolean
  updateOwnedMount(token: unknown): boolean
  disposeOwnedMount(token: unknown): boolean
  abortOwnedMount(token: unknown): boolean
}

export type OwnedMountContinuation = {
  /** 返回 false 表示 owner generation 已失效，调用方不得回退到全局提交。 */
  run(run: () => void): boolean
}
