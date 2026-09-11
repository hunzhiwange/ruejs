/** Public compiler-runtime surface. Generic rendering and runtime registries are intentionally absent. */
import { CUSTOM_ELEMENT_EMIT_BRIDGE_KEY } from './custom-elements.shared'
import type { ComponentProps } from './runtime-types'

export type {
  ComponentInstance,
  ComponentProps,
  FC,
  PropsWithChildren,
  RenderOutput,
} from './runtime-types'
export { createContext, provideContext, useContext } from './compiler-runtime/context'
export {
  onActivated,
  onBeforeMount,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  onUnmounted,
  onUpdated,
  onBeforeUpdate,
} from './compiler-runtime/hooks'
export { onErrorCaptured } from './error-capture'
export { onError } from './compiler-runtime/component-errors'
export { getCurrentAppTarget as getCurrentContainer } from './compiler-runtime/app'

export { onBeforeMount as onBeforeCreate, onMounted as onCreated } from './compiler-runtime/hooks'
export const useEmit =
  (props: ComponentProps) =>
  (event: string, ...args: unknown[]) => {
    const key = `on${event
      .split(/[-:]/g)
      .filter(Boolean)
      .map(part => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
      .join('')}`
    const handler = props[key] ?? props[key.toLowerCase()]
    if (typeof handler === 'function') return handler(...args)
    const bridge = props[CUSTOM_ELEMENT_EMIT_BRIDGE_KEY]
    return typeof bridge === 'function' ? bridge(event, args) : undefined
  }

const serverPrefetchCallbacks: Array<() => unknown> = []
export const onServerPrefetch = (callback: () => unknown) => {
  serverPrefetchCallbacks.push(callback)
}
export const runServerPrefetch = () =>
  Promise.all(serverPrefetchCallbacks.splice(0).map(run => run()))
export const onRenderTriggered = (_callback: (event: unknown) => void) => () => {}

const compilerRequired = (): never => {
  throw new Error('[rue] this API requires Rue compiler output')
}
export const createElement = compilerRequired
export const createJsxComponent = compilerRequired
export const createCompiledComponent = compilerRequired
export const createCompiledFragmentHandle = compilerRequired
export const Fragment = Symbol.for('rue.jsx.fragment')
export default Object.freeze({})
