// @ts-check
// copy from vuejs/core
// https://github.com/vuejs/core/blob/main/rollup.config.js
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import replace from '@rollup/plugin-replace'
import json from '@rollup/plugin-json'
import pico from 'picocolors'
import commonJS from '@rollup/plugin-commonjs'
import polyfillNode from 'rollup-plugin-polyfill-node'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import esbuild from 'rollup-plugin-esbuild'
import alias from '@rollup/plugin-alias'
import { entries } from './scripts/aliases.js'
import { inlineEnums } from './scripts/inline-enums.js'
import { minify as minifySwc } from '@swc/core'

/**
 * @template T
 * @template {keyof T} K
 * @typedef { Omit<T, K> & Required<Pick<T, K>> } MarkRequired
 */
/** @typedef {'cjs' | 'esm-bundler' | 'global' | 'global-runtime' | 'esm-browser' | 'esm-bundler-runtime' | 'esm-browser-runtime'} PackageFormat */
/** @typedef {MarkRequired<import('rollup').OutputOptions, 'file' | 'format'>} OutputOptions */
/**
 * @typedef {{
 *   entry?: string
 *   filename?: string
 *   name?: string
 *   formats?: ReadonlyArray<PackageFormat>
 * }} SubEntryOptions
 */
/**
 * @typedef {{
 *   entryFile?: string
 *   fileName: string
 *   globalName?: string
 *   formats: ReadonlyArray<PackageFormat>
 *   isMain: boolean
 * }} BuildEntry
 */

if (!process.env.TARGET) {
  throw new Error('TARGET package must be specified via --environment flag.')
}

const require = createRequire(import.meta.url)
const __dirname = fileURLToPath(new URL('.', import.meta.url))

const masterVersion = require('./package.json').version

const packagesDir = path.resolve(__dirname, 'packages')
const packageDir = path.resolve(packagesDir, process.env.TARGET)

const resolve = (/** @type {string} */ p) => path.resolve(packageDir, p)
const pkg = require(resolve(`package.json`))
const packageOptions = pkg.buildOptions || {}
const name = packageOptions.filename || path.basename(packageDir)

const banner = `/**
* ${pkg.name} v${masterVersion}
* (c) 2025-present Xiangmin Liu and Rue contributors
* @license MIT
**/`

const [enumPlugin, enumDefines] = inlineEnums()

/**
 * @param {string} fileName
 * @returns {Record<PackageFormat, OutputOptions>}
 */
function resolveOutputConfigs(fileName) {
  return {
    'esm-bundler': {
      file: resolve(`dist/${fileName}.esm-bundler.js`),
      format: 'es',
    },
    'esm-browser': {
      file: resolve(`dist/${fileName}.esm-browser.js`),
      format: 'es',
    },
    cjs: {
      file: resolve(`dist/${fileName}.cjs.js`),
      format: 'cjs',
    },
    global: {
      file: resolve(`dist/${fileName}.global.js`),
      format: 'iife',
    },
    // runtime-only builds, for main "vue" package only
    'esm-bundler-runtime': {
      file: resolve(`dist/${fileName}.runtime.esm-bundler.js`),
      format: 'es',
    },
    'esm-browser-runtime': {
      file: resolve(`dist/${fileName}.runtime.esm-browser.js`),
      format: 'es',
    },
    'global-runtime': {
      file: resolve(`dist/${fileName}.runtime.global.js`),
      format: 'iife',
    },
  }
}

/** @type {ReadonlyArray<PackageFormat>} */
const defaultFormats = ['esm-bundler', 'cjs']
/** @type {ReadonlyArray<PackageFormat>} */
const inlineFormats = /** @type {any} */ (process.env.FORMATS && process.env.FORMATS.split(','))
/** @type {ReadonlyArray<PackageFormat>} */
const packageFormats = inlineFormats || packageOptions.formats || defaultFormats

/**
 * @param {ReadonlyArray<PackageFormat> | undefined} formats
 * @returns {ReadonlyArray<PackageFormat>}
 */
function resolveEntryFormats(formats) {
  const configuredFormats = formats || packageOptions.formats || defaultFormats
  return inlineFormats
    ? configuredFormats.filter(format => inlineFormats.includes(format))
    : configuredFormats
}

/** @type {BuildEntry[]} */
const buildEntries = [
  {
    fileName: name,
    globalName: packageOptions.name,
    formats: packageFormats,
    isMain: true,
  },
  ...(packageOptions.subEntries || [])
    /** @type {SubEntryOptions[]} */
    .map(subEntry => ({
      entryFile: subEntry.entry,
      fileName: subEntry.filename || '',
      globalName: subEntry.name,
      formats: resolveEntryFormats(subEntry.formats),
      isMain: false,
    }))
    .filter(subEntry => subEntry.entryFile && subEntry.fileName && subEntry.formats.length > 0),
]

const packageConfigs = process.env.PROD_ONLY
  ? []
  : buildEntries.flatMap(buildEntry => {
      const outputConfigs = resolveOutputConfigs(buildEntry.fileName)
      return buildEntry.formats.map(format =>
        createConfig(format, outputConfigs[format], [], buildEntry),
      )
    })

if (process.env.NODE_ENV === 'production') {
  buildEntries.forEach(buildEntry => {
    buildEntry.formats.forEach(format => {
      if (packageOptions.prod === false) {
        return
      }
      if (format === 'cjs') {
        packageConfigs.push(createProductionConfig(format, buildEntry))
      }
      if (/^(global|esm-browser)(-runtime)?/.test(format)) {
        packageConfigs.push(createMinifiedConfig(format, buildEntry))
      }
    })
  })
}

export default packageConfigs

/**
 *
 * @param {PackageFormat} format
 * @param {OutputOptions} output
 * @param {ReadonlyArray<import('rollup').Plugin>} plugins
 * @param {BuildEntry} [buildEntry]
 * @returns {import('rollup').RollupOptions}
 */
function createConfig(format, output, plugins = [], buildEntry = buildEntries[0]) {
  if (!output) {
    console.log(pico.yellow(`invalid format: "${format}"`))
    process.exit(1)
  }

  const isProductionBuild = process.env.__DEV__ === 'false' || output.file.endsWith('.prod.js')
  const isBundlerESMBuild = /esm-bundler/.test(format)
  const isBrowserESMBuild = /esm-browser/.test(format)
  const isCJSBuild = format === 'cjs'
  const isGlobalBuild = /global/.test(format)
  const isCompatPackage = pkg.name === '@vue/compat'
  const isCompatBuild = !!packageOptions.compat
  const isBrowserBuild =
    (isGlobalBuild || isBrowserESMBuild || isBundlerESMBuild) &&
    !packageOptions.enableNonBrowserBranches

  output.banner = banner

  output.exports = isCompatPackage ? 'auto' : 'named'
  if (isCJSBuild) {
    output.esModule = true
  }
  output.sourcemap = !!process.env.SOURCE_MAP
  output.externalLiveBindings = false
  // https://github.com/rollup/rollup/pull/5380
  output.reexportProtoFromExternal = false

  if (isGlobalBuild) {
    output.name = buildEntry.globalName || packageOptions.name
  }

  let entryFile =
    buildEntry.entryFile || (format.endsWith('runtime') ? `src/runtime.ts` : `src/index.ts`)

  // the compat build needs both default AND named exports. This will cause
  // Rollup to complain for non-ESM targets, so we use separate entries for
  // esm vs. non-esm builds.
  if (buildEntry.isMain && isCompatPackage && (isBrowserESMBuild || isBundlerESMBuild)) {
    entryFile = format.endsWith('runtime') ? `src/esm-runtime.ts` : `src/esm-index.ts`
  }

  function resolveDefine() {
    /** @type {Record<string, string>} */
    const replacements = {
      __COMMIT__: `"${process.env.COMMIT}"`,
      __VERSION__: `"${masterVersion}"`,
      // this is only used during Vue's internal tests
      __TEST__: `false`,
      // If the build is expected to run directly in the browser (global / esm builds)
      __BROWSER__: String(isBrowserBuild),
      __GLOBAL__: String(isGlobalBuild),
      __ESM_BUNDLER__: String(isBundlerESMBuild),
      __ESM_BROWSER__: String(isBrowserESMBuild),
      // is targeting Node (SSR)?
      __CJS__: String(isCJSBuild),
      // need SSR-specific branches?
      __SSR__: String(!isGlobalBuild),

      // 2.x compat build
      __COMPAT__: String(isCompatBuild),

      // feature flags
      __FEATURE_SUSPENSE__: `true`,
      __FEATURE_OPTIONS_API__: isBundlerESMBuild ? `__VUE_OPTIONS_API__` : `true`,
      __FEATURE_PROD_DEVTOOLS__: isBundlerESMBuild ? `__VUE_PROD_DEVTOOLS__` : `false`,
      __FEATURE_PROD_HYDRATION_MISMATCH_DETAILS__: isBundlerESMBuild
        ? `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__`
        : `false`,
    }

    if (!isBundlerESMBuild) {
      // hard coded dev/prod builds
      replacements.__DEV__ = String(!isProductionBuild)
    }

    // allow inline overrides like
    //__RUNTIME_COMPILE__=true pnpm build runtime
    Object.keys(replacements).forEach(key => {
      if (key in process.env) {
        const value = process.env[key]
        assert(typeof value === 'string')
        replacements[key] = value
      }
    })
    return replacements
  }

  // esbuild define is a bit strict and only allows literal json or identifiers
  // so we still need replace plugin in some cases
  function resolveReplace() {
    const replacements = { ...enumDefines }

    if (isProductionBuild && isBrowserBuild) {
      Object.assign(replacements, {
        'context.onError(': `/*@__PURE__*/ context.onError(`,
        'emitError(': `/*@__PURE__*/ emitError(`,
        'createCompilerError(': `/*@__PURE__*/ createCompilerError(`,
        'createDOMCompilerError(': `/*@__PURE__*/ createDOMCompilerError(`,
      })
    }

    if (isBundlerESMBuild) {
      Object.assign(replacements, {
        // preserve to be handled by bundlers
        __DEV__: `!!(process.env.NODE_ENV !== 'production')`,
      })
    }

    // for compiler-sfc browser build inlined deps
    if (isBrowserESMBuild) {
      Object.assign(replacements, {
        'process.env': '({})',
        'process.platform': '""',
        'process.stdout': 'null',
      })
    }

    if (Object.keys(replacements).length) {
      return [replace({ values: replacements, preventAssignment: true })]
    } else {
      return []
    }
  }

  function resolveExternal() {
    const treeShakenDeps = [
      'source-map-js',
      '@babel/parser',
      'estree-walker',
      'entities/lib/decode.js',
    ]

    if (isGlobalBuild || isBrowserESMBuild || isCompatPackage) {
      if (!packageOptions.enableNonBrowserBranches) {
        // normal browser builds - non-browser only imports are tree-shaken,
        // they are only listed here to suppress warnings.
        return treeShakenDeps
      }
    } else {
      // Node / esm-bundler builds.
      // externalize all direct deps unless it's the compat build.
      return [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.peerDependencies || {}),
        // for @vue/compiler-sfc / server-renderer
        'path',
        'url',
        'stream',
        // somehow these throw warnings for runtime-* package builds
        ...treeShakenDeps,
      ]
    }
    return []
  }

  function resolveNodePlugins() {
    // requires a ton of template engines which should be ignored.
    /** @type {ReadonlyArray<string>} */
    let cjsIgnores = []

    const nodePlugins =
      (format === 'cjs' && Object.keys(pkg.devDependencies || {}).length) ||
      packageOptions.enableNonBrowserBranches
        ? [
            commonJS({
              sourceMap: false,
              ignore: cjsIgnores,
            }),
            ...(format === 'cjs' ? [] : [polyfillNode()]),
            nodeResolve(),
          ]
        : []

    return nodePlugins
  }

  return {
    input: resolve(entryFile),
    // Global and Browser ESM builds inlines everything so that they can be
    // used alone.
    external: resolveExternal(),
    plugins: [
      json({
        namedExports: false,
      }),
      alias({
        entries,
      }),
      enumPlugin,
      ...resolveReplace(),
      esbuild({
        tsconfig: path.resolve(__dirname, 'tsconfig.json'),
        sourceMap: output.sourcemap,
        minify: false,
        target: 'es2020',
        define: resolveDefine(),
      }),
      ...resolveNodePlugins(),
      ...plugins,
    ],
    output,
    onwarn: (msg, warn) => {
      if (msg.code !== 'CIRCULAR_DEPENDENCY') {
        warn(msg)
      }
    },
    treeshake: {
      moduleSideEffects: false,
    },
  }
}

function createProductionConfig(
  /** @type {PackageFormat} */ format,
  /** @type {BuildEntry} */ buildEntry,
) {
  const outputConfigs = resolveOutputConfigs(buildEntry.fileName)
  return createConfig(
    format,
    {
      file: outputConfigs[format].file.replace(/\.js$/, '.prod.js'),
      format: outputConfigs[format].format,
    },
    [],
    buildEntry,
  )
}

function createMinifiedConfig(
  /** @type {PackageFormat} */ format,
  /** @type {BuildEntry} */ buildEntry,
) {
  const outputConfigs = resolveOutputConfigs(buildEntry.fileName)
  return createConfig(
    format,
    {
      file: outputConfigs[format].file.replace(/\.js$/, '.prod.js'),
      format: outputConfigs[format].format,
    },
    [
      {
        name: 'swc-minify',

        async renderChunk(contents, _, { format }) {
          const { code } = await minifySwc(contents, {
            module: format === 'es',
            format: {
              comments: false,
            },
            compress: {
              ecma: 2016,
              pure_getters: true,
            },
            safari10: true,
            mangle: true,
          })

          return { code: banner + code, map: null }
        },
      },
    ],
    buildEntry,
  )
}
