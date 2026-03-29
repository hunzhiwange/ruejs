import { defineConfig } from 'vitest/config'
import path from 'node:path'
import fs from 'node:fs/promises'
import tailwindcss from '@tailwindcss/vite'
import VitePluginRue from '@rue-js/vite-plugin-rue'
import { resolve } from 'node:path'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'
import dts from 'vite-plugin-dts'

const rootDir = resolve(__dirname)

export default defineConfig({
  plugins: [
    topLevelAwait({
      // The export name of top-level await promise for each chunk module
      promiseExportName: '__tla',
      // The function to generate import names of top-level await promise in each chunk module
      promiseImportName: i => `__tla_${i}`,
    }),
    wasm(),
    tailwindcss() as any,
    VitePluginRue({
      include: ['/app/'],
      debug: true,
    }),
    dts(),
    {
      name: 'copy-docs',
      apply: 'build',
      closeBundle: async () => {
        const src = path.resolve(__dirname, 'docs')
        const dest = path.resolve(__dirname, 'dist/docs')
        const copy = async (src: string, dest: string) => {
          await fs.mkdir(dest, { recursive: true })
          const items = await fs.readdir(src, { withFileTypes: true })
          for (const it of items) {
            const sp = path.join(src, it.name)
            const dp = path.join(dest, it.name)
            if (it.isDirectory()) await copy(sp, dp)
            else await fs.copyFile(sp, dp)
          }
        }
        await copy(src, dest)
      },
    },
  ],
  css: {
    devSourcemap: true,
  },
  assetsInclude: ['**/*.md'],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  test: {
    globals: true,
    pool: 'threads',
    setupFiles: 'scripts/setup-vitest.ts',
    sequence: {
      hooks: 'list',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      include: ['packages/*/src/**'],
      exclude: ['packages/runtime/src/components/Transition*'],
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 80,
        branches: 75,
      },
    },
  },
  define: {
    __DEV__: true,
    __TEST__: true,
    __VERSION__: '"test"',
    __BROWSER__: false,
    __GLOBAL__: false,
    __ESM_BUNDLER__: true,
    __ESM_BROWSER__: false,
    __CJS__: true,
    __SSR__: true,
    __FEATURE_OPTIONS_API__: true,
    __FEATURE_SUSPENSE__: true,
    __FEATURE_PROD_DEVTOOLS__: false,
    __FEATURE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    __COMPAT__: true,
  },
  resolve: {
    conditions: ['development', 'browser'],
    alias: {
      'rue-js': path.resolve(rootDir, 'packages/rue/src'),
      '@rue-js/router': path.resolve(rootDir, 'packages/router/src'),
      '@rue-js/jsx-runtime': path.resolve(rootDir, 'packages/jsx-runtime/src'),
      '@rue-js/jsx-dev-runtime': path.resolve(rootDir, 'packages/jsx-dev-runtime/src'),
      '@rue-js/runtime': path.resolve(rootDir, 'packages/runtime/src'),
      '@rue-js/vite-plugin-rue': path.resolve(rootDir, 'packages/vite-plugin-rue/index.mjs'),
      '@rue-js/shared': path.resolve(rootDir, 'packages/shared/src'),
      '@rue-js/design': path.resolve(rootDir, 'packages/rue-design/src'),
      '@rue-js/runtime-vapor': process.env.VITEST
        ? path.resolve(rootDir, 'packages/runtime-vapor/pkg-node/rue_runtime_vapor.js')
        : path.resolve(rootDir, 'packages/runtime-vapor/pkg/rue_runtime_vapor.js'),
      // '@rue-js/learn-wgpu': path.resolve(rootDir, 'packages/learn-wgpu/index.js'),
      // '@rue-js/app-rust': path.resolve(rootDir, 'packages/app-rust/pkg/app_rust.js'),
      // '@rue-js/plugin': path.resolve(rootDir, 'packages/rue-rs-plugin/pkg/rue_rs_plugin.js'),
    },
  },
})
