import { getSharedReactiveRuntime } from './shared-runtime.js'
import { createReactiveKernel } from './index'

const reactiveKernelKey = Symbol.for('@rue-js/runtime/reactive-kernel')
const reactiveKernelRegistry = globalThis as typeof globalThis & {
  [reactiveKernelKey]?: ReturnType<typeof createReactiveKernel>
}

export const reactiveKernel = (reactiveKernelRegistry[reactiveKernelKey] ??= createReactiveKernel(
  {},
  getSharedReactiveRuntime(),
))
