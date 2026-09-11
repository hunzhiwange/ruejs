import path from 'node:path'
import { compileRueStatic } from '@rue-js/vite-plugin-rue'
import { defineConfig } from 'vite-plus'

const textRuntimeVirtualModules = [
  'private-text-instrumentation-client',
  'virtual:text-rsc-entry',
  'virtual:text-rsc/client-references',
]

export default defineConfig({
  plugins: [
    {
      name: 'text:test-client-compile',
      enforce: 'pre',
      async resolveId(source, importer) {
        const server = source.endsWith('?text-ssr') || importer?.endsWith('?text-ssr')
        if (!server || (!source.startsWith('.') && !source.startsWith('/'))) return null
        const resolved = await this.resolve(
          source.replace(/\?text-ssr$/, ''),
          importer?.replace(/\?text-ssr$/, ''),
          { skipSelf: true },
        )
        if (!resolved || !resolved.id.includes('/text/src/') || !/\.[jt]sx?$/.test(resolved.id))
          return resolved
        return { ...resolved, id: resolved.id + '?text-ssr' }
      },
      async transform(code, id) {
        if (!/\.(?:tsx|jsx)(?:\?.*)?$/.test(id)) return null
        return {
          code: await compileRueStatic(code, {
            id,
            target: id.endsWith('?text-ssr') ? 'server' : 'hydrate',
            production: false,
          }),
          map: null,
        }
      },
    },
  ],
  define: {
    __VERSION__: JSON.stringify('test'),
  },
  test: {
    pool: 'forks',
    maxWorkers: 2,
    execArgv: ['--max-old-space-size=8192'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    teardownTimeout: 60_000,
  },
  resolve: {
    alias: [
      {
        find: /^text\/head$/,
        replacement: path.resolve(import.meta.dirname, 'src/shims/head.tsx'),
      },
      {
        find: /^text\/image$/,
        replacement: path.resolve(import.meta.dirname, 'src/shims/image.tsx'),
      },
      {
        find: /^text\/legacy\/image$/,
        replacement: path.resolve(import.meta.dirname, 'src/shims/legacy-image.tsx'),
      },
      {
        find: /^text\/router$/,
        replacement: path.resolve(import.meta.dirname, 'src/shims/router.tsx'),
      },
      {
        find: /^text\/compat\/router$/,
        replacement: path.resolve(import.meta.dirname, 'src/shims/compat-router.ts'),
      },
      {
        find: /^text\/headers$/,
        replacement: path.resolve(import.meta.dirname, 'src/shims/headers.ts'),
      },
      {
        find: /^text\/server$/,
        replacement: path.resolve(import.meta.dirname, 'src/shims/server.ts'),
      },
      {
        find: /^text\/dynamic$/,
        replacement: path.resolve(import.meta.dirname, 'src/shims/dynamic.tsx'),
      },
      {
        find: /^text\/config$/,
        replacement: path.resolve(import.meta.dirname, 'src/shims/config.ts'),
      },
      {
        find: /^text\/script$/,
        replacement: path.resolve(import.meta.dirname, 'src/shims/script.tsx'),
      },
      {
        find: /^text\/font\/google$/,
        replacement: path.resolve(import.meta.dirname, 'src/shims/font-google.ts'),
      },
      {
        find: /^text\/font\/local$/,
        replacement: path.resolve(import.meta.dirname, 'src/shims/font-local.ts'),
      },
      { find: /^text\/og$/, replacement: path.resolve(import.meta.dirname, 'src/shims/og.tsx') },
      {
        find: /^text\/constants$/,
        replacement: path.resolve(import.meta.dirname, 'src/shims/constants.ts'),
      },
      { find: /^text\/(.+)$/, replacement: path.resolve(import.meta.dirname, 'src/$1') },
      { find: 'text', replacement: path.resolve(import.meta.dirname, 'src/index.ts') },
      {
        find: /^@rue-js\/rue\/internal\/compiler$/,
        replacement: path.resolve(import.meta.dirname, '../rue/src/compiler-internal.ts'),
      },
      {
        find: /^@rue-js\/rue\/internal$/,
        replacement: path.resolve(import.meta.dirname, '../rue/src/internal.ts'),
      },
      { find: /^@rue-js\/rue$/, replacement: path.resolve(import.meta.dirname, '../rue/src') },
      {
        find: /^@rue-js\/runtime\/internal\/compiler$/,
        replacement: path.resolve(import.meta.dirname, '../runtime/src/compiler-internal.ts'),
      },
      {
        find: /^@rue-js\/runtime\/internal$/,
        replacement: path.resolve(import.meta.dirname, '../runtime/src/internal.ts'),
      },
      {
        find: /^@rue-js\/runtime\/server$/,
        replacement: path.resolve(import.meta.dirname, '../runtime/src/server.ts'),
      },
      {
        find: /^@rue-js\/runtime$/,
        replacement: path.resolve(import.meta.dirname, '../runtime/src'),
      },
      {
        find: /^@rue-js\/server-renderer$/,
        replacement: path.resolve(import.meta.dirname, '../server-renderer/src'),
      },
    ],
  },
  pack: {
    entry: ['src/**/*.ts', 'src/**/*.tsx', '!src/**/*.d.ts'],
    clean: true,
    deps: {
      neverBundle: textRuntimeVirtualModules,
      skipNodeModulesBundle: true,
      dts: {
        neverBundle: textRuntimeVirtualModules,
      },
    },
    dts: true,
    fixedExtension: false,
    format: 'esm',
    sourcemap: true,
    unbundle: true,
  },
})
