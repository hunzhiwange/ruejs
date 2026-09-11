import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import VitePluginRue from '@rue-js/vite-plugin-rue'
import { defineConfig, type Plugin } from 'vite'

const benchmarkDir = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(benchmarkDir, '../../../..')
const workspaceVersion = createRequire(import.meta.url)(
  path.resolve(workspaceRoot, 'package.json'),
).version

const workspaceArtifact = (...parts: string[]) => path.resolve(workspaceRoot, ...parts)

const workspaceProductionEntry = (name: string, subpath = '.') => {
  const packageDir = workspaceArtifact('packages', name)
  const manifest = createRequire(import.meta.url)(path.join(packageDir, 'package.json'))
  const entry = manifest.exports[subpath]
  const target = typeof entry === 'string' ? entry : (entry?.module ?? entry?.import)
  if (typeof target !== 'string' || !target.startsWith('./dist/')) {
    throw new Error(`Missing production export for ${name}${subpath}`)
  }
  return path.resolve(packageDir, target)
}

const benchmarkModuleManifest = (): Plugin => ({
  name: 'rue-benchmark-module-manifest',
  generateBundle(_options, bundle) {
    const chunks = Object.values(bundle)
      .filter(output => output.type === 'chunk')
      .map(chunk => ({
        fileName: chunk.fileName,
        facadeModuleId: chunk.facadeModuleId,
        imports: chunk.imports,
        isEntry: chunk.isEntry,
        moduleIds: chunk.moduleIds.slice().sort(),
        name: chunk.name,
      }))
      .sort((left, right) => left.fileName.localeCompare(right.fileName))
    this.emitFile({
      type: 'asset',
      fileName: 'benchmark-modules.json',
      source: `${JSON.stringify({ schemaVersion: 1, chunks }, null, 2)}\n`,
    })
  },
})

export default defineConfig({
  root: benchmarkDir,
  base: './',
  plugins: [VitePluginRue({ transformTimeoutMs: 60_000 }), benchmarkModuleManifest()],
  resolve: {
    alias: [
      {
        find: /^@rue-js\/rue\/internal\/compiler$/,
        replacement: workspaceProductionEntry('rue', './internal/compiler'),
      },
      {
        find: /^@rue-js\/rue$/,
        replacement: workspaceProductionEntry('rue'),
      },
      {
        find: /^@rue-js\/shared$/,
        replacement: workspaceProductionEntry('shared'),
      },
    ],
  },
  define: {
    __DEV__: false,
    __TEST__: false,
    __VERSION__: JSON.stringify(workspaceVersion),
    __BROWSER__: true,
    __GLOBAL__: false,
    __ESM_BUNDLER__: true,
    __ESM_BROWSER__: false,
    __SSR__: false,
  },
  build: {
    emptyOutDir: true,
    manifest: true,
    minify: true,
    outDir: workspaceArtifact('temp/js-framework-performance/dist'),
    target: 'es2022',
    rollupOptions: {
      treeshake: { moduleSideEffects: false },
      input: {
        rue: path.resolve(benchmarkDir, 'index.html'),
        'rue-signal': path.resolve(benchmarkDir, 'rue-signal.html'),
        vue: path.resolve(benchmarkDir, 'vue.html'),
      },
      output: {
        manualChunks(id) {
          const normalized = id.split(path.sep).join('/')
          if (normalized.endsWith('/packages/runtime/dist/runtime.internal.esm-bundler.js')) {
            return 'rue-internal-runtime'
          }
          if (
            normalized.endsWith('/packages/runtime/dist/runtime.internal-compiler.esm-bundler.js')
          ) {
            return 'rue-compiler-runtime'
          }
        },
      },
    },
  },
})
