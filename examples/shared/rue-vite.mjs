import path from 'node:path'
import { fileURLToPath } from 'node:url'
import VitePluginRue from '../../packages/vite-plugin-rue/index.mjs'

const sharedDir = path.dirname(fileURLToPath(import.meta.url))
export const repoRoot = path.resolve(sharedDir, '../..')

const compilerRuntimeEntries = [
  'app',
  'block',
  'builtin',
  'component',
  'dom',
  'events',
  'hydrate',
  'keepalive',
  'list',
  'reactive',
  'ssr',
  'suspense',
  'teleport',
  'transition',
  'transitiongroup',
]

export const createRueExampleAliases = () => ({
  ...Object.fromEntries(
    compilerRuntimeEntries.map(entry => [
      `@rue-js/rue/internal/${entry}`,
      path.resolve(repoRoot, `packages/rue/src/compiler-runtime/entries/${entry}.ts`),
    ]),
  ),
  ...Object.fromEntries(
    compilerRuntimeEntries.map(entry => [
      `@rue-js/runtime/internal/${entry}`,
      path.resolve(repoRoot, `packages/runtime/src/compiler-runtime/entries/${entry}.ts`),
    ]),
  ),
  '@rue-js/rue': path.resolve(repoRoot, 'packages/rue/src'),
  '@rue-js/router': path.resolve(repoRoot, 'packages/router/src'),
  '@rue-js/runtime': path.resolve(repoRoot, 'packages/runtime/src'),
  '@rue-js/server-renderer': path.resolve(repoRoot, 'packages/server-renderer/src'),
  '@rue-js/shared': path.resolve(repoRoot, 'packages/shared/src'),
})

export const createRueExampleDefine = ({ dev = true, ssr = false } = {}) => ({
  __DEV__: String(dev),
  __TEST__: 'false',
  __VERSION__: JSON.stringify('example'),
  __BROWSER__: String(!ssr),
  __GLOBAL__: 'false',
  __ESM_BUNDLER__: 'true',
  __ESM_BROWSER__: 'false',
  __CJS__: 'false',
  __SSR__: String(ssr),
  __COMPAT__: 'false',
  __FEATURE_OPTIONS_API__: 'true',
  __FEATURE_SUSPENSE__: 'true',
  __FEATURE_PROD_DEVTOOLS__: 'false',
  __FEATURE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
})

export const createRueExamplePlugins = ({ transformTimeoutMs = 60000, target } = {}) => [
  VitePluginRue({ transformTimeoutMs, target }),
]
