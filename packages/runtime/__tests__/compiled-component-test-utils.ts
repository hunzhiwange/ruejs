import { resolve } from 'node:path'
import swc from '@swc/core'
import { resolveCompilerCapability } from './compiler-capability-test-runtime'

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
