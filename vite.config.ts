import { configDefaults, defineConfig } from 'vitest/config'
import path from 'node:path'
import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import daisyUICalendarStyles from 'daisyui/components/calendar/object.js'
import VitePluginRue from '@rue-js/vite-plugin-rue'
import { mdxToJs, type MdxCompileOptions } from 'satteri'
import type { Plugin } from 'vite'

const rootDir = import.meta.dirname
const testMaxWorkers = Number.parseInt(process.env.VITEST_MAX_WORKERS ?? '4', 10)
const rueClientChunkByPackage = new Map([
  ['@rue-js/i18n', 'rue-i18n'],
  ['@rue-js/router', 'rue-router'],
  ['@rue-js/rue', 'rue-runtime'],
  ['@rue-js/runtime', 'rue-runtime'],
  ['@rue-js/shared', 'rue-runtime'],
  ['@rue-js/store', 'rue-store'],
])

const rueClientSourceChunks = [
  ['i18n', 'rue-i18n'],
  ['router', 'rue-router'],
  ['rue', 'rue-runtime'],
  ['runtime', 'rue-runtime'],
  ['shared', 'rue-runtime'],
  ['store', 'rue-store'],
].map(([packageDir, chunkName]) => [
  `${path.resolve(rootDir, 'packages', packageDir).replaceAll('\\', '/')}/`,
  chunkName,
])

/**
 * Satteri follows the MDX provider convention and emits native elements as
 * `_components.h1`, `_components.p`, and so on. Rue's compiler-only runtime
 * requires component factories to be statically known, so keep authored/imported
 * MDX components intact while lowering those built-in element indirections back
 * to their native JSX tags. Rue docs do not expose the React-style `components`
 * provider or wrapper override.
 */
const lowerRueMdxElementIndirection = (code: string) => {
  const nativeElements = new Set<string>()
  const defaults = code.match(/Object\.assign\(\{([\s\S]*?)\}, props\.components\)/)?.[1] ?? ''

  for (const match of defaults.matchAll(/\b([a-z][\w-]*)\s*:\s*"\1"/g)) {
    nativeElements.add(match[1])
  }

  let lowered = code
  for (const tag of nativeElements) {
    lowered = lowered.replaceAll(`<_components.${tag}`, `<${tag}`)
    lowered = lowered.replaceAll(`</_components.${tag}`, `</${tag}`)
  }

  return lowered.replace(
    /const \{ wrapper: MDXLayout \} = props\.components \|\| \{\};\s*return MDXLayout \? <MDXLayout[\s\S]*?: _createMdxContent\(props\);/,
    'return _createMdxContent(props);',
  )
}

const getRueClientChunk = (id: string) => {
  const normalizedId = id.replaceAll('\\', '/')
  const sourceChunk = rueClientSourceChunks.find(([sourceDir]) =>
    normalizedId.startsWith(sourceDir),
  )

  if (sourceChunk) {
    return sourceChunk[1]
  }

  const nodeModulesIndex = normalizedId.lastIndexOf('/node_modules/')
  if (nodeModulesIndex === -1) {
    return null
  }

  const modulePath = normalizedId.slice(nodeModulesIndex + '/node_modules/'.length)
  if (!modulePath.startsWith('@rue-js/')) {
    return null
  }

  const packageName = modulePath.split('/', 2).join('/')
  return rueClientChunkByPackage.get(packageName) ?? null
}

const createSatteriMdxPlugin = (options: Pick<MdxCompileOptions, 'development'> = {}): Plugin => ({
  name: 'rue:satteri-mdx',
  enforce: 'pre',
  async transform(source, id) {
    const [filePath, query = ''] = id.split('?', 2)
    if (!filePath.endsWith('.mdx') || query === 'raw') {
      return null
    }

    const result = await mdxToJs(source, {
      jsx: true,
      fileURL: pathToFileURL(filePath),
      features: {
        headingAttributes: true,
        directive: true,
        smartPunctuation: true,
      },
      ...options,
    })

    return {
      code: lowerRueMdxElementIndirection(result.code),
      map: null,
    }
  },
})

const asCssRule = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined

// daisyUI 5.6.18 emits `::part(day):hover:not(selected, today)`, which is not a
// valid CSS shadow-parts selector. Keep the intended hover treatment and
// explicitly restore the more specific Cally part states before Tailwind emits CSS.
const fixDaisyUICallyCss = (): Plugin => ({
  name: 'rue:fix-daisyui-cally-css',
  config() {
    const calendar = asCssRule(daisyUICalendarStyles)
    const cally = asCssRule(asCssRule(calendar?.['.cally'])?.['@layer daisyui.l1.l2.l3'])
    const dayHover = asCssRule(cally?.['::part(day):hover'])
    const hoverDeclarations = asCssRule(dayHover?.['&:not(selected, today)'])
    const todayDeclarations = asCssRule(cally?.['::part(button day today)'])
    const selectedDeclarations = asCssRule(cally?.['::part(selected)'])

    if (cally && hoverDeclarations && todayDeclarations && selectedDeclarations) {
      cally['::part(day):hover'] = { ...hoverDeclarations }
      cally['::part(button day today):hover'] = { ...todayDeclarations }
      cally['::part(day selected):hover'] = { ...selectedDeclarations }
    }
  },
})

const vitestProjects = [
  {
    extends: true as const,
    test: {
      name: 'unit',
      include: [
        'packages/**/__tests__/*.{test,spec}.{js,ts,jsx,tsx,mjs,cjs}',
        'scripts/__tests__/*.{test,spec}.{js,ts,jsx,tsx,mjs,cjs}',
      ],
      exclude: [
        ...configDefaults.exclude,
        '**/e2e/**',
        'temp/**',
        'packages/text/**',
        '**/{rue,runtime}/**',
        'packages/runtime/__tests__/transition-utils.spec.ts',
      ],
      environment: 'jsdom',
    },
  },
  {
    extends: true as const,
    test: {
      name: 'unit-jsdom',
      include: [
        'packages/{rue,runtime}/**/*.{test,spec}.{js,ts,jsx,tsx,mjs,cjs}',
        'packages/runtime/__tests__/transition-utils.spec.ts',
      ],
      exclude: [...configDefaults.exclude, '**/e2e/**', 'temp/**'],
      environment: 'jsdom',
    },
  },
  {
    extends: true as const,
    test: {
      name: 'e2e',
      environment: 'jsdom',
      ...(process.env.CI
        ? {
            maxWorkers: 1,
            isolate: false,
          }
        : {}),
      exclude: [...configDefaults.exclude, 'temp/**'],
      include: ['packages/rue/__tests__/e2e/*.spec.ts'],
    },
  },
]

export default defineConfig(({ command, isSsrBuild }) => {
  const isVitest = process.env.VITEST === 'true' || process.env.VITEST === '1'
  let docsOutDir = path.resolve(rootDir, 'dist')
  let shouldCopyDocs = true

  return {
    base: command === 'build' ? './' : '/',
    plugins: [
      fixDaisyUICallyCss(),
      tailwindcss() as any,
      createSatteriMdxPlugin({ development: command === 'serve' && !isVitest }),
      VitePluginRue({
        include: isVitest
          ? [
              '/app/',
              '/docs/',
              '/packages/router/src/',
              '/packages/store/',
              '/packages/i18n/',
              '/packages/router/__tests__/',
              '/packages/rue-design/src/',
              '/packages/rue/__tests__/',
              '/packages/runtime/__tests__/',
              '/app/pages/examples/LocalTodoList.tsx',
              '/app/pages/examples/HelloWorld.tsx',
              '/app/pages/examples/home-demos/LocalTodoListDemo.tsx',
              '/packages/runtime/__tests__/custom-elements.spec.tsx',
              '/packages/runtime/__tests__/nativeControlledInput.actual.spec.tsx',
              '/packages/rue-design/src/components/auto-complete/index.tsx',
              '/packages/rue-design/src/components/checkbox/index.tsx',
              '/packages/rue-design/src/components/color-picker/index.tsx',
              '/packages/rue-design/src/components/descriptions/index.tsx',
              '/packages/rue-design/src/components/drawer-sidebar/index.tsx',
              '/packages/rue-design/src/components/dropdown/index.tsx',
              '/packages/rue-design/src/components/filter/index.tsx',
              '/packages/rue-design/src/components/input-number/index.tsx',
              '/packages/rue-design/src/components/list/index.tsx',
              '/packages/rue-design/src/components/modal/index.tsx',
              '/packages/rue-design/src/components/range/index.tsx',
              '/packages/rue-design/src/components/segmented/index.tsx',
              '/packages/rue-design/src/components/select/index.tsx',
              '/packages/rue-design/src/components/stat/index.tsx',
              '/packages/rue-design/src/components/table/index.tsx',
              '/packages/rue-design/src/components/toast/index.tsx',
              '/packages/rue-design/src/components/tree/index.tsx',
              '/packages/rue-design/src/components/validator/index.tsx',
              '/packages/rue-design/src/components/watermark/index.tsx',
            ]
          : [],
        exclude: [],
        includeExtensions: ['tsx', 'jsx', 'mdx'],
        debug: command === 'serve' && !isVitest,
        transformTimeoutMs: command === 'build' || isVitest ? 60000 : undefined,
      }),
      {
        name: 'copy-docs',
        apply: 'build',
        configResolved: config => {
          docsOutDir = path.isAbsolute(config.build.outDir)
            ? config.build.outDir
            : path.resolve(config.root, config.build.outDir)
          shouldCopyDocs = !config.build.ssr
        },
        closeBundle: async () => {
          if (!shouldCopyDocs) {
            return
          }

          const src = path.resolve(rootDir, 'docs')
          const dest = path.resolve(docsOutDir, 'docs')
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
    ].filter(Boolean),
    css: {
      devSourcemap: true,
    },
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: '@rue-js/rue',
    },
    oxc: false,
    server: {
      port: 5173,
      strictPort: false,
    },
    assetsInclude: ['**/*.md'],
    build: {
      // Keep this explicit so the build path doesn't depend on Vite's implicit
      // minifier default when toolchain internals change.
      minify: true,
      rolldownOptions: {
        input: {
          main: path.resolve(rootDir, 'index.html'),
        },
        devtools: {}, // enable devtools mode
        output: isSsrBuild
          ? undefined
          : {
              codeSplitting: {
                groups: [
                  {
                    includeDependenciesRecursively: false,
                    name(id) {
                      return getRueClientChunk(id)
                    },
                  },
                ],
              },
            },
      },
    },
    test: {
      globals: true,
      pool: 'forks',
      maxWorkers: Number.isFinite(testMaxWorkers) && testMaxWorkers > 0 ? testMaxWorkers : 4,
      vmMemoryLimit: process.env.VITEST_VM_MEMORY_LIMIT ?? '2GB',
      setupFiles: 'scripts/setup-vitest.ts',
      testTimeout: 10_000,
      hookTimeout: 10_000,
      teardownTimeout: 10_000,
      sequence: {
        hooks: 'list',
      },
      projects: vitestProjects,
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
        ...Object.fromEntries(
          ['rue', 'runtime'].flatMap(pkg =>
            [
              'app',
              'dom',
              'reactive',
              'block',
              'component',
              'list',
              'events',
              'builtin',
              'teleport',
              'transition',
              'transitiongroup',
              'keepalive',
              'suspense',
              'hydrate',
              'ssr',
            ].map(capability => [
              `@rue-js/${pkg}/internal/${capability}`,
              path.resolve(
                rootDir,
                `packages/runtime/src/compiler-runtime/entries/${capability}.ts`,
              ),
            ]),
          ),
        ),
        '@rue-js/rue/internal/builtins': path.resolve(
          rootDir,
          'packages/runtime/src/builtins-internal.ts',
        ),
        '@rue-js/runtime/internal/builtins': path.resolve(
          rootDir,
          'packages/runtime/src/builtins-internal.ts',
        ),
        '@rue-js/rue/internal/compiler': path.resolve(rootDir, 'packages/runtime/src/internal.ts'),
        '@rue-js/runtime/internal/compiler': path.resolve(
          rootDir,
          'packages/runtime/src/internal.ts',
        ),
        '@rue-js/rue/internal': path.resolve(rootDir, 'packages/runtime/src/internal.ts'),
        '@rue-js/runtime/internal': path.resolve(rootDir, 'packages/runtime/src/internal.ts'),
        '@rue-js/rue': path.resolve(rootDir, 'packages/rue/src'),
        '@rue-js/router': path.resolve(rootDir, 'packages/router/src'),
        '@rue-js/store': path.resolve(rootDir, 'packages/store/src'),
        '@rue-js/i18n': path.resolve(rootDir, 'packages/i18n/src'),
        '@rue-js/runtime': path.resolve(rootDir, 'packages/runtime/src'),
        '@rue-js/server-renderer': path.resolve(rootDir, 'packages/server-renderer/src'),
        '@rue-js/vite-plugin-rue': path.resolve(rootDir, 'packages/vite-plugin-rue/index.mjs'),
        '@rue-js/shared': path.resolve(rootDir, 'packages/shared/src'),
        '@rue-js/design': path.resolve(rootDir, 'packages/rue-design/src'),
      },
    },
  }
})
