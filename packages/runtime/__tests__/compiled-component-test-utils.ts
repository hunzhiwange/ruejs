import { resolve } from 'node:path'
import swc from '@swc/core'
import {
  compilerCapabilities,
  createMountedCompiledTestComponent,
  resolveCompilerCapability,
} from './compiler-capability-test-runtime'

export const compileComponent = (source: string, filename = 'closed-component.tsx') =>
  swc.transformSync(source, {
    filename,
    jsc: {
      parser: { syntax: 'typescript', tsx: true },
      target: 'es2022',
      experimental: { plugins: [[resolve('packages/swc-plugin-rue/swc-plugin-rue.wasm'), {}]] },
    },
    module: { type: 'commonjs' },
  }).code

export const evaluateComponent = (source: string, filename?: string) => {
  const code = compileComponent(source, filename)
  const module = { exports: {} as any }
  new Function('require', 'module', 'exports', code)(
    (id: string) => {
      const capability = resolveCompilerCapability(id)
      if (capability) return capability
      throw new Error(`Unexpected generated import: ${id}`)
    },
    module,
    module.exports,
  )
  return { code, exports: module.exports }
}

type CompiledFixtureOptions = {
  exportName?: string
  filename?: string
  host?: HTMLElement
  props?: Record<string, unknown>
  scheduling?: 'sync' | 'microtask'
}

export const mountCompiledFixture = (source: string, options: CompiledFixtureOptions = {}) => {
  const {
    exportName = 'View',
    filename,
    host = document.body,
    props = {},
    scheduling = 'sync',
  } = options
  compilerCapabilities.reactive.setReactiveScheduling(scheduling)

  const evaluated = evaluateComponent(source, filename)
  const componentFactory = evaluated.exports[exportName]
  if (typeof componentFactory !== 'function') {
    throw new Error(`Compiled fixture export is not a component factory: ${exportName}`)
  }
  const mounted = createMountedCompiledTestComponent(componentFactory, host, props)

  return {
    ...evaluated,
    host,
    root: mounted.root,
    flush: async () => {
      await Promise.resolve()
      await Promise.resolve()
    },
    dispose: mounted.dispose,
  }
}
