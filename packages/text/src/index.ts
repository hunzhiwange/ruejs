import type { Plugin, PluginOption, UserConfig, ViteDevServer } from 'vite'
import { loadEnv, parseAst } from 'vite'
import { pagesRouter, apiRouter, invalidateRouteCache, matchRoute } from './routing/pages-router.js'
import { generateServerEntry as _generateServerEntry } from './entries/pages-server-entry.js'
import { generateClientEntry as _generateClientEntry } from './entries/pages-client-entry.js'
import { appRouteGraph, appRouter, invalidateAppRouteCache } from './routing/app-router.js'
import type { NitroRouteRuleConfig } from './build/nitro-route-rules.js'
import { createValidFileMatcher } from './routing/file-matcher.js'
import { createSSRHandler } from './server/dev-server.js'
import { handleApiRoute } from './server/api-handler.js'
import { isImageOptimizationPath } from './server/image-optimization.js'
import { normalizeDefaultLocalePathname, stripI18nLocaleForApiRoute } from './server/pages-i18n.js'
import { installSocketErrorBackstop } from './server/socket-error-backstop.js'
import { shouldInvalidateAppRouteFile } from './server/dev-route-files.js'
import { createDirectRunner } from './server/dev-module-runner.js'
import { generateRscEntry } from './entries/app-rsc-entry.js'
import { generateSsrEntry } from './entries/app-ssr-entry.js'
import { generateBrowserEntry } from './entries/app-browser-entry.js'
import {
  collectRouteClassificationManifest,
  type RouteClassificationManifest,
} from './build/route-classification-manifest.js'
import {
  planRouteClassificationInjection,
  type RouteClassificationChunk,
} from './build/route-classification-injector.js'
import { normalizePathnameForRouteMatchStrict } from './routing/utils.js'
import {
  findTextConfigPath,
  loadTextConfig,
  resolveTextConfigInput,
  resolveTextConfig,
  type TextConfig,
  type TextConfigInput,
  type ResolvedTextConfig,
  type TextRedirect,
  type TextRewrite,
  type TextHeader,
} from './config/text-config.js'

import { findMiddlewareFile, runMiddleware } from './server/middleware.js'
import { isTextDataPathname, parseTextDataPathname } from './server/pages-data-route.js'
import {
  MIDDLEWARE_HEADER_PREFIX,
  MIDDLEWARE_TEXT_HEADER,
  MIDDLEWARE_REWRITE_HEADER,
  TEXT_MW_CTX_HEADER,
  TEXT_TIMING_HEADER,
} from './server/headers.js'
import { logRequest, now } from './server/request-log.js'
import { normalizePath } from './server/normalize-path.js'
import {
  filterInternalHeaders,
  INTERNAL_HEADERS,
  isOpenRedirectShaped,
  normalizeTrailingSlash,
  TEXT_INTERNAL_HEADERS,
} from './server/request-pipeline.js'
import {
  findInstrumentationClientFile,
  findInstrumentationFile,
  runInstrumentation,
} from './server/instrumentation.js'
import { PHASE_PRODUCTION_BUILD, PHASE_DEVELOPMENT_SERVER } from './shims/constants.js'
import { precompressAssets } from './build/precompress.js'
import { validateDevRequest } from './server/dev-origin-check.js'
import {
  isExternalUrl,
  proxyExternalRequest,
  matchHeaders,
  matchRedirect,
  matchRewrite,
  requestContextFromRequest,
  sanitizeDestination,
  type RequestContext,
} from './config/config-matchers.js'
import { scanMetadataFiles } from './server/metadata-routes.js'
import { buildRequestHeadersFromMiddlewareResponse } from './server/middleware-request-headers.js'
import { detectPackageManager } from './utils/project.js'
import { manifestFileWithBase, manifestFilesWithBase } from './utils/manifest-paths.js'
import { hasBasePath } from './utils/base-path.js'
import { mergeRewriteQuery } from './utils/query.js'
import {
  ASSET_PREFIX_URL_DIR,
  resolveAssetUrlPrefix,
  resolveAssetsDir,
} from './utils/asset-prefix.js'
import { createAsyncHooksStubPlugin } from './plugins/async-hooks-stub.js'
import { clientReferenceDedupPlugin } from './plugins/client-reference-dedup.js'
import { dataUrlCssPlugin } from './plugins/css-data-url.js'
import { createRscClientReferenceLoadersPlugin } from './plugins/rsc-client-reference-loaders.js'
import { createInstrumentationClientTransformPlugin } from './plugins/instrumentation-client.js'
import {
  generateInstrumentationClientInjectModule,
  INSTRUMENTATION_CLIENT_EMPTY_MODULE,
} from './client/instrumentation-client-inject.js'
import { createMiddlewareServerOnlyPlugin } from './plugins/middleware-server-only.js'
import { createOptimizeImportsPlugin } from './plugins/optimize-imports.js'
import { createOgAssetsPlugin, createOgInlineFetchAssetsPlugin } from './plugins/og-assets.js'
import { generateRouteTypes } from './typegen.js'
import {
  mergeOptimizeDepsExclude,
  TEXT_OPTIMIZE_DEPS_EXCLUDE,
} from './plugins/rsc-client-shim-excludes.js'
import {
  RSC_RUE_CLIENT_OPTIMIZE_INCLUDE,
  RSC_RUE_DEDUPE,
  RSC_RUE_NODE_EXTERNALS,
  RSC_RUE_OPTIMIZE_DEPS_EXCLUDE,
  RSC_RUE_SERVER_DOM_CLIENT_EDGE,
  RSC_RUE_SSR_EXTERNAL_ENTRIES,
} from './plugins/rsc-rue-compat-packages.js'
import { createServerExternalsManifestPlugin } from './plugins/server-externals-manifest.js'
import {
  VIRTUAL_GOOGLE_FONTS,
  RESOLVED_VIRTUAL_GOOGLE_FONTS,
  parseStaticObjectLiteral,
  generateGoogleFontsVirtualModule,
  createGoogleFontsPlugin,
  createLocalFontsPlugin,
} from './plugins/fonts.js'
import { hasWranglerConfig, formatMissingCloudflarePluginError } from './deploy.js'
import { computeLazyChunks } from './utils/lazy-chunks.js'
import { resolvePostcssStringPlugins } from './plugins/postcss.js'
import { buildSassPreprocessorOptions } from './plugins/sass.js'
import {
  createClientManualChunks,
  createClientOutputConfig,
  createClientCodeSplittingConfig,
  getClientTreeshakeConfigForVite,
  getBuildBundlerOptions,
  withBuildBundlerOptions,
} from './build/client-build-config.js'
import {
  augmentSsrManifestFromBundle,
  tryRealpathSync,
  relativeWithinRoot,
  type BundleBackfillChunk,
} from './build/ssr-manifest.js'
import { stripServerExports } from './plugins/strip-server-exports.js'
import { hasMdxFiles } from './utils/mdx-scan.js'
import { scanPublicFileRoutes } from './utils/public-routes.js'
import tsconfigPaths from 'vite-tsconfig-paths'
import type { RueVitePluginOptions } from '@rue-js/vite-plugin-rue'
import createRueRscPlugin from '@rue-js/rsc'
import { transformHoistInlineDirective, transformWrapExport } from '@rue-js/rsc/transforms'
import MagicString from 'magic-string'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { randomBytes, randomUUID } from 'node:crypto'
import commonjs from 'vite-plugin-commonjs'

// Install the process-level peer-disconnect backstop at module load.
// Vite plugin lifecycle hooks (config / configureServer) proved
// timing-fragile in vite-plus — install was silently skipped,
// confirmed via TEXT_DEBUG_SOCKET_ERRORS=1. Skips Vitest workers
// via env-var gate; bypasses during prerender via fire-time
// TEXT_PRERENDER check. See socket-error-backstop.ts.
installSocketErrorBackstop()

function createRscCompatibilityId(textConfig: ResolvedTextConfig): string {
  if (textConfig.deploymentId) return textConfig.deploymentId
  return randomUUID()
}

type ASTNode = ReturnType<typeof parseAst>['body'][number]['parent']

const __dirname = import.meta.dirname
const RUE_FRAMEWORK_DEDUPE = Object.freeze([
  '@rue-js/rue',
  '@rue-js/runtime',
  '@rue-js/server-renderer',
])
const RUE_COMPILER_ENTRIES = [
  'component',
  'reactive',
  'block',
  'events',
  'list',
  'dom',
  'builtin',
  'ssr',
  'hydrate',
  'teleport',
  'transition',
  'transitiongroup',
  'keepalive',
  'suspense',
  'app',
] as const
const RUE_NODE_RUNTIME_ALIASES = Object.freeze([
  ...RUE_COMPILER_ENTRIES.flatMap(entry => [
    `@rue-js/rue/internal/${entry}`,
    `@rue-js/runtime/internal/${entry}`,
  ]),
  '@rue-js/rue',
  '@rue-js/rue/internal',
  '@rue-js/rue/server-renderer',
  '@rue-js/runtime',
  '@rue-js/runtime/internal',
  '@rue-js/runtime/server',
  '@rue-js/server-renderer',
])
const RUE_NODE_RUNTIME_EXTERNALS = Object.freeze(
  RUE_NODE_RUNTIME_ALIASES.filter(entry => entry.startsWith('@rue-js/runtime')),
)
type VitePluginRueModule = typeof import('@rue-js/vite-plugin-rue')
const REMOVED_JSX_RUNTIME_PACKAGE = ['re', 'act'].join('')
const REMOVED_DOM_RUNTIME_PACKAGE = ['re', 'act-dom'].join('')
const REMOVED_LEGACY_OPTION = REMOVED_JSX_RUNTIME_PACKAGE

function compactStringEntries(entries: readonly unknown[]): string[] {
  return entries.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
}

function isRueCompatRscRuntimeOptimizeDep(entry: string): boolean {
  return (
    entry === REMOVED_JSX_RUNTIME_PACKAGE ||
    entry === REMOVED_DOM_RUNTIME_PACKAGE ||
    entry === `${REMOVED_DOM_RUNTIME_PACKAGE}/client` ||
    entry === `${REMOVED_DOM_RUNTIME_PACKAGE}/server` ||
    entry === `${REMOVED_DOM_RUNTIME_PACKAGE}/server.edge` ||
    entry === `${REMOVED_DOM_RUNTIME_PACKAGE}/static.edge`
  )
}

function shouldRunCommonjsTransform(id: string): boolean | undefined {
  const cleanId = id.split('?')[0].replaceAll('\\', '/')
  if (cleanId.includes('/packages/text/dist/runtime/')) return false
  if (cleanId.includes('@vitejs/plugin-rsc')) return false
  if (cleanId.includes('/deps_rsc/@vitejs_plugin-rsc')) return false
  return undefined
}

function createLazyRuePlugin(
  resolvedRuePath: string,
  options: RueVitePluginOptions | (() => RueVitePluginOptions | undefined) | undefined,
  enforce: 'pre' | undefined,
): Plugin {
  let delegatePromise: Promise<Plugin> | null = null

  const loadDelegate = () => {
    if (!delegatePromise) {
      const resolvedOptions = typeof options === 'function' ? options() : options
      delegatePromise = import(pathToFileURL(resolvedRuePath).href)
        .then(mod => (mod as VitePluginRueModule).default(resolvedOptions) as Plugin)
        .catch(cause => {
          throw new Error('text: Failed to load @rue-js/vite-plugin-rue.', {
            cause,
          })
        })
    }
    return delegatePromise
  }

  return {
    name: '@rue-js/vite-plugin-rue',
    enforce,
    apply() {
      return true
    },
    async configResolved(config) {
      const delegate = await loadDelegate()
      await delegate.configResolved?.call(this, config)
    },
    async transform(code, id, options) {
      // Runtime implementation and published compiler entries are already
      // JavaScript. Recompiling their re-exports can remove compiler imports.
      if (
        /(?:packages|@rue-js)\/(?:rue|runtime|server-renderer)\/(?:src|dist)\//.test(
          normalizePath(id),
        )
      )
        return null
      const delegate = await loadDelegate()
      const hook = delegate.transform
      const handler = typeof hook === 'function' ? hook : hook?.handler
      if (!handler) return null
      const cleanId = id.split('?')[0]
      const queryIndex = id.indexOf('?')
      const delegateId = /\.m?js$/.test(cleanId)
        ? queryIndex < 0
          ? `${id}.jsx`
          : `${id.slice(0, queryIndex)}.jsx${id.slice(queryIndex)}`
        : id
      return handler.call(this, code, delegateId, options)
    },
  }
}

function createCompiledShimJsxLoader(shimsDir: string, resolvedRuePath: string | null): Plugin {
  const normalizedShimsDir = normalizePath(shimsDir) + '/'
  let rueModulePromise: Promise<VitePluginRueModule> | null = null

  return {
    name: 'text:compiled-shim-jsx-loader',
    enforce: 'pre',
    async load(id) {
      const cleanId = id.split('?')[0]
      if (!cleanId.endsWith('.js')) return null
      if (!normalizePath(cleanId).startsWith(normalizedShimsDir)) return null
      if (!resolvedRuePath || !fs.existsSync(cleanId)) return null
      rueModulePromise ??= import(
        pathToFileURL(resolvedRuePath).href
      ) as Promise<VitePluginRueModule>
      const rueModule = await rueModulePromise
      const code = fs.readFileSync(cleanId, 'utf8')
      return rueModule.compileRueStatic(code, {
        id: `${cleanId}.jsx`,
        target: this.environment?.name === 'client' ? 'hydrate' : 'server',
        production: this.environment?.mode === 'build',
      })
    },
  }
}

function resolveOptionalDependency(projectRoot: string, specifier: string): string | null {
  try {
    const projectRequire = createRequire(path.join(projectRoot, 'package.json'))
    return projectRequire.resolve(specifier)
  } catch {}

  try {
    const selfRequire = createRequire(import.meta.url)
    return selfRequire.resolve(specifier)
  } catch {}

  return null
}

function resolveShimModulePath(shimsDir: string, moduleName: string): string {
  // Source checkouts only ship TypeScript shims, while built packages only ship
  // JavaScript. Check .ts first to avoid an extra stat in development.
  const candidates = ['.ts', '.tsx', '.js']
  for (const ext of candidates) {
    const candidate = path.join(shimsDir, `${moduleName}${ext}`)
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }
  return path.join(shimsDir, `${moduleName}.js`)
}

function isVercelOgImport(id: string): boolean {
  return id === '@vercel/og' || id === '@vercel/og.js'
}

function isTextOgShimImporter(importer: string | undefined): boolean {
  if (!importer) return false
  const cleanImporter = (importer.startsWith('\0') ? importer.slice(1) : importer).split('?')[0]
  const normalizedImporter = cleanImporter.replace(/\\/g, '/')
  return (
    normalizedImporter.endsWith('/shims/og.tsx') ||
    normalizedImporter.endsWith('/shims/og.js') ||
    normalizedImporter.endsWith('/dist/shims/og.js')
  )
}

function toRelativeFileEntry(root: string, absPath: string): string {
  return path.relative(root, absPath).split(path.sep).join('/')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

const TSCONFIG_FILES = ['tsconfig.json', 'jsconfig.json']

function resolveTsconfigPathCandidate(candidate: string): string | null {
  const candidates = candidate.endsWith('.json')
    ? [candidate]
    : [candidate, `${candidate}.json`, path.join(candidate, 'tsconfig.json')]

  for (const item of candidates) {
    if (fs.existsSync(item) && fs.statSync(item).isFile()) {
      return item
    }
  }

  return null
}

function resolveTsconfigExtends(configPath: string, specifier: string): string | null {
  const fromDir = path.dirname(configPath)
  if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('\\')) {
    return resolveTsconfigPathCandidate(path.resolve(fromDir, specifier))
  }

  const requireFromConfig = createRequire(configPath)
  const candidates = [specifier, `${specifier}.json`, path.join(specifier, 'tsconfig.json')]

  for (const item of candidates) {
    try {
      return requireFromConfig.resolve(item)
    } catch {}
  }

  return null
}

function materializeTsconfigPathAliases(
  pathsConfig: Record<string, unknown>,
  baseUrl: string,
  projectRoot: string,
): Record<string, string> {
  const aliases: Record<string, string> = {}

  for (const [find, rawTargets] of Object.entries(pathsConfig)) {
    const target = Array.isArray(rawTargets)
      ? rawTargets.find((value): value is string => typeof value === 'string')
      : typeof rawTargets === 'string'
        ? rawTargets
        : null
    if (!target) continue

    if (find.includes('*') || target.includes('*')) {
      if (!find.endsWith('/*') || !target.endsWith('/*')) continue
      if (find.indexOf('*') !== find.length - 1 || target.indexOf('*') !== target.length - 1) {
        continue
      }

      const aliasKey = find.slice(0, -2)
      const targetDir = target.slice(0, -2)
      if (!aliasKey || !targetDir) continue

      aliases[aliasKey] = toViteAliasReplacement(path.resolve(baseUrl, targetDir), projectRoot)
      continue
    }

    aliases[find] = toViteAliasReplacement(path.resolve(baseUrl, target), projectRoot)
  }

  return aliases
}

function toViteAliasReplacement(absolutePath: string, projectRoot: string): string {
  const normalizedPath = absolutePath.replace(/\\/g, '/')
  const rootCandidates = new Set<string>([projectRoot])
  const realRoot = tryRealpathSync(projectRoot)
  if (realRoot) rootCandidates.add(realRoot)

  const pathCandidates = new Set<string>([absolutePath])
  const realPath = tryRealpathSync(absolutePath)
  if (realPath) pathCandidates.add(realPath)

  for (const rootCandidate of rootCandidates) {
    for (const pathCandidate of pathCandidates) {
      if (pathCandidate === rootCandidate) {
        return normalizedPath
      }
      const relativeId = relativeWithinRoot(rootCandidate, pathCandidate)
      if (relativeId) return '/' + relativeId
    }
  }

  return normalizedPath
}

function loadTsconfigPathAliases(
  configPath: string,
  projectRoot: string,
  seen = new Set<string>(),
): Record<string, string> {
  const normalizedPath = tryRealpathSync(configPath) ?? configPath
  if (seen.has(normalizedPath)) return {}
  seen.add(normalizedPath)

  let parsed: Record<string, unknown> | null = null
  try {
    parsed = parseStaticObjectLiteral(fs.readFileSync(normalizedPath, 'utf-8'))
  } catch {
    return {}
  }
  if (!parsed) return {}

  let aliases: Record<string, string> = {}
  if (typeof parsed.extends === 'string') {
    const extendedPath = resolveTsconfigExtends(normalizedPath, parsed.extends)
    if (extendedPath) {
      aliases = loadTsconfigPathAliases(extendedPath, projectRoot, seen)
    }
  }

  const compilerOptions = isRecord(parsed.compilerOptions) ? parsed.compilerOptions : null
  const pathsConfig =
    compilerOptions && isRecord(compilerOptions.paths) ? compilerOptions.paths : null
  if (!pathsConfig) return aliases

  const baseUrl =
    compilerOptions && typeof compilerOptions.baseUrl === 'string' ? compilerOptions.baseUrl : '.'
  const resolvedBaseUrl = path.resolve(path.dirname(normalizedPath), baseUrl)

  return {
    ...aliases,
    ...materializeTsconfigPathAliases(pathsConfig, resolvedBaseUrl, projectRoot),
  }
}

/**
 * Detect Vite major version at runtime by resolving from cwd.
 * The plugin may be installed in a workspace root with Vite 7 but used
 * by a project that has Vite 8 — so we resolve from cwd, not from
 * the plugin's own location.
 */
function getViteMajorVersion(): number {
  try {
    const require = createRequire(path.join(process.cwd(), 'package.json'))
    const vitePkg = require('vite/package.json')

    const viteMajor = parseInt(vitePkg?.version, 10)
    if (vitePkg?.name === 'vite' && Number.isFinite(viteMajor)) {
      return viteMajor
    }

    const bundledViteMajor = parseInt(vitePkg?.bundledVersions?.vite, 10)
    if (Number.isFinite(bundledViteMajor)) {
      return bundledViteMajor
    }

    // npm aliases like `vite: npm:@voidzero-dev/vite-plus-core@...` expose the
    // aliased package.json, whose own version is not Vite's version.
    console.warn(
      `[text] Could not determine Vite major version from ${vitePkg?.name ?? 'vite/package.json'}; assuming Vite 7`,
    )
    return 7
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[text] Failed to resolve vite/package.json (${message}); assuming Vite 7`)
    return 7
  }
}

/**
 * Read the text package version once at plugin load. Surfaced via
 * `process.env.__TEXT_VERSION` define so `window.text.version` lands a
 * real string instead of the `"text"` fallback. Resolved relative to
 * this module's own `package.json`, not the project root.
 *
 * Defaults to `"text"` on read failure so a malformed install never
 * breaks the build — only the diagnostic global loses fidelity.
 */
let _textVersionCache: string | null = null
function getTextVersion(): string {
  if (_textVersionCache !== null) return _textVersionCache
  try {
    const pkgUrl = new URL('../package.json', import.meta.url)
    const pkg = JSON.parse(fs.readFileSync(pkgUrl, 'utf-8')) as { version?: unknown }
    _textVersionCache = typeof pkg.version === 'string' ? pkg.version : 'text'
  } catch {
    _textVersionCache = 'text'
  }
  return _textVersionCache
}

type UserResolveConfigWithTsconfigPaths = NonNullable<UserConfig['resolve']> & {
  tsconfigPaths?: boolean
}

// Cache materialized tsconfig/jsconfig aliases so Vite's glob and dynamic-import
// transforms can see them via resolve.alias without re-reading config files per env.
const _tsconfigAliasCache = new Map<string, Record<string, string>>()

function resolveTsconfigAliases(projectRoot: string): Record<string, string> {
  if (_tsconfigAliasCache.has(projectRoot)) {
    return _tsconfigAliasCache.get(projectRoot)!
  }

  let aliases: Record<string, string> = {}
  for (const name of TSCONFIG_FILES) {
    const candidate = path.join(projectRoot, name)
    if (!fs.existsSync(candidate)) continue
    aliases = loadTsconfigPathAliases(candidate, projectRoot)
    break
  }

  _tsconfigAliasCache.set(projectRoot, aliases)
  return aliases
}

type PackageJsonWithDependencies = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

function loadLocalFileDependencyAliases(projectRoot: string): Record<string, string> {
  const packageJsonPath = path.join(projectRoot, 'package.json')
  let packageJson: PackageJsonWithDependencies
  try {
    packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, 'utf-8'),
    ) as PackageJsonWithDependencies
  } catch {
    return {}
  }

  const aliases: Record<string, string> = {}
  const dependencyGroups = [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.optionalDependencies,
    packageJson.peerDependencies,
  ]

  for (const dependencies of dependencyGroups) {
    if (!dependencies) continue

    for (const [name, specifier] of Object.entries(dependencies)) {
      if (aliases[name] || !specifier.startsWith('file:')) continue
      aliases[name] = path.resolve(projectRoot, specifier.slice('file:'.length))
    }
  }

  return aliases
}

// Virtual module IDs for Pages Router production build
const VIRTUAL_SERVER_ENTRY = 'virtual:text-server-entry'
const RESOLVED_SERVER_ENTRY = '\0' + VIRTUAL_SERVER_ENTRY
const VIRTUAL_CLIENT_ENTRY = 'virtual:text-client-entry'
const RESOLVED_CLIENT_ENTRY = '\0' + VIRTUAL_CLIENT_ENTRY

// Virtual module IDs for App Router entries
const VIRTUAL_RSC_ENTRY = 'virtual:text-rsc-entry'
const RESOLVED_RSC_ENTRY = '\0' + VIRTUAL_RSC_ENTRY
const VIRTUAL_APP_SSR_ENTRY = 'virtual:text-app-ssr-entry'
const RESOLVED_APP_SSR_ENTRY = '\0' + VIRTUAL_APP_SSR_ENTRY
const VIRTUAL_APP_BROWSER_ENTRY = 'virtual:text-app-browser-entry'
const RESOLVED_APP_BROWSER_ENTRY = '\0' + VIRTUAL_APP_BROWSER_ENTRY
const VIRTUAL_ROOT_PARAMS = 'virtual:text-root-params'
const RESOLVED_ROOT_PARAMS = '\0' + VIRTUAL_ROOT_PARAMS
/** Virtual module for composed instrumentation-client bootstrap. */
const VIRTUAL_INSTRUMENTATION_CLIENT = 'private-text-instrumentation-client'
const RESOLVED_INSTRUMENTATION_CLIENT = `\0${VIRTUAL_INSTRUMENTATION_CLIENT}.mjs`
/** Image file extensions handled by the text:image-imports plugin.
 *  Shared between the Rolldown hook filter and the transform handler regex. */
const IMAGE_EXTS = 'png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?'

/** Absolute path to text's shims directory, used by clientManualChunks. */
const _shimsDir = path.resolve(__dirname, 'shims') + '/'
const _fontGoogleShimPath = resolveShimModulePath(_shimsDir, 'font-google')

function isValidExportIdentifier(name: string): boolean {
  return /^[$A-Z_a-z][$\w]*$/.test(name)
}

/**
 * Returns true when `code` starts with a `"use client"` or `"use server"`
 * directive (after stripping leading comments, hashbang, and whitespace).
 *
 * Used by `text:jsx-in-js` to opt `.js` files inside `node_modules` into the
 * JSX transform. We mirror `@vitejs/plugin-rsc`'s detection by looking at the
 * directive prologue rather than scanning the whole file — `code.includes`
 * alone would match incidental occurrences in template literals or comments.
 */
function readLeadingRscDirective(code: string): 'use client' | 'use server' | null {
  let i = 0
  const len = code.length
  // Strip BOM.
  if (code.charCodeAt(0) === 0xfeff) i = 1
  // Strip hashbang.
  if (code[i] === '#' && code[i + 1] === '!') {
    const nl = code.indexOf('\n', i)
    if (nl === -1) return null
    i = nl + 1
  }
  while (i < len) {
    // Skip whitespace.
    while (i < len && /\s/.test(code[i] ?? '')) i++
    if (i >= len) return null
    // Skip line comments.
    if (code[i] === '/' && code[i + 1] === '/') {
      const nl = code.indexOf('\n', i + 2)
      if (nl === -1) return null
      i = nl + 1
      continue
    }
    // Skip block comments.
    if (code[i] === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2)
      if (end === -1) return null
      i = end + 2
      continue
    }
    // At first non-comment, non-whitespace token. Must be a string literal
    // directive to qualify (per ECMA-262 Directive Prologue grammar).
    const quote = code[i]
    if (quote !== '"' && quote !== "'") return null
    const closing = code.indexOf(quote, i + 1)
    if (closing === -1) return null
    const directive = code.slice(i + 1, closing)
    if (directive === 'use client' || directive === 'use server') return directive
    // Other directives (e.g., "use strict") may precede the RSC directive.
    // Continue scanning past the statement-terminating `;` or newline.
    i = closing + 1
    while (i < len && (code[i] === ';' || code[i] === ' ' || code[i] === '\t')) i++
    if (code[i] === '\n') i++
  }
  return null
}

function hasUseClientDirective(code: string): boolean {
  return readLeadingRscDirective(code) === 'use client'
}

function generateRootParamsModule(rootParamNames: Iterable<string>): string {
  const names = Array.from(new Set(rootParamNames)).filter(isValidExportIdentifier).sort()
  if (names.length === 0) return 'export {};\n'

  const rootParamsShimPath = resolveShimModulePath(_shimsDir, 'root-params')
  const exports = names
    .map(name => `export function ${name}() { return getRootParam(${JSON.stringify(name)}); }`)
    .join('\n')
  return `import { getRootParam } from ${JSON.stringify(rootParamsShimPath)};\n${exports}\n`
}

function isTextIntlSharedUseImporter(importer: string | undefined): boolean {
  if (!importer) return false
  const normalized = importer.split(path.sep).join('/')
  return /\/text-intl\/dist\/esm\/(?:development|production)\/shared\/use\.js(?:\?|$)/.test(
    normalized,
  )
}

function isTextIntlSharedUseModuleId(id: string): boolean {
  const cleanId = id.startsWith('\0') ? id.slice(1) : id
  const normalized = cleanId.split(path.sep).join('/')
  return /\/text-intl\/dist\/esm\/(?:development|production)\/shared\/use\.js(?:\?|$)/.test(
    normalized,
  )
}

/**
 * Shims with a `.rsc.ts` condition variant for the RSC environment.
 * Maps import specifier → base shim name. In the RSC env, resolveId
 * appends `.rsc`; in other envs it resolves to the base.
 *
 * These MUST NOT appear in `textShimMap` (resolve.alias) because Vite's
 * alias plugin runs before user `enforce:"pre"` plugins — aliases are
 * unoverridable. Keeping them out of the alias lets the resolveId hook
 * control resolution per-environment.
 *
 * To add a new RSC condition shim:
 *   1. Create `<name>.rsc.ts` in src/shims/
 *   2. Add entries here for each import specifier.
 */
const _rscConditionShims = new Map<string, string>([
  ['text/navigation', 'navigation'],
  ['text/navigation.js', 'navigation'],
  ['text/dist/client/components/navigation', 'navigation'],
])

const _rueClientHookExports = new Set(['useState', 'useEffect'])

type ImportSpecifierNode = {
  type: string
  local?: { name?: string }
  imported?: { name?: string; value?: string | boolean | number | null }
  importKind?: string
}

type ImportDeclarationNode = {
  type: string
  start: number
  end: number
  source?: { value?: unknown }
  specifiers?: ImportSpecifierNode[]
  importKind?: string
}

function getImportName(node: {
  name?: string
  value?: string | boolean | number | null
}): string | null {
  if (typeof node.name === 'string') return node.name
  return typeof node.value === 'string' ? node.value : null
}

function renderRueImportSpecifier(specifier: ImportSpecifierNode): string | null {
  const localName = specifier.local?.name
  if (!localName) return null
  if (specifier.type === 'ImportDefaultSpecifier') return localName
  if (specifier.type === 'ImportNamespaceSpecifier') return `* as ${localName}`
  if (specifier.type !== 'ImportSpecifier' || !specifier.imported) return null

  const importedName = getImportName(specifier.imported)
  if (!importedName) return null
  const prefix = specifier.importKind === 'type' ? 'type ' : ''
  return importedName === localName
    ? `${prefix}${importedName}`
    : `${prefix}${importedName} as ${localName}`
}

function buildRueImportStatement(
  specifiers: readonly ImportSpecifierNode[],
  source: string,
): string | null {
  const defaultSpecifier = specifiers.find(specifier => specifier.type === 'ImportDefaultSpecifier')
  const namespaceSpecifier = specifiers.find(
    specifier => specifier.type === 'ImportNamespaceSpecifier',
  )
  const namedSpecifiers = specifiers.filter(specifier => specifier.type === 'ImportSpecifier')

  const defaultRendered = defaultSpecifier ? renderRueImportSpecifier(defaultSpecifier) : null
  const namespaceRendered = namespaceSpecifier ? renderRueImportSpecifier(namespaceSpecifier) : null
  const namedRendered = namedSpecifiers
    .map(renderRueImportSpecifier)
    .filter((specifier): specifier is string => specifier !== null)

  if (namespaceRendered) {
    const prefix = defaultRendered ? `${defaultRendered}, ` : ''
    return `import ${prefix}${namespaceRendered} from ${JSON.stringify(source)};`
  }

  if (defaultRendered && namedRendered.length > 0) {
    return `import ${defaultRendered}, { ${namedRendered.join(', ')} } from ${JSON.stringify(source)};`
  }
  if (defaultRendered) {
    return `import ${defaultRendered} from ${JSON.stringify(source)};`
  }
  if (namedRendered.length > 0) {
    return `import { ${namedRendered.join(', ')} } from ${JSON.stringify(source)};`
  }
  return null
}

function transformRueClientHookImportsWithRegex(
  code: string,
  hookModuleSpecifier: string,
): { code: string; map: null } | null {
  const importPattern =
    /import\s+(?:([$A-Z_a-z][$\w]*)\s*,\s*)?\{([^}]+)\}\s*from\s*(['"])@rue-js\/rue\3\s*;?/g
  let hasChanges = false
  const textCode = code.replace(importPattern, (fullMatch, defaultImport, namedImports) => {
    const guardSpecifiers: string[] = []
    const remainingSpecifiers: string[] = []

    for (const rawSpecifier of String(namedImports).split(',')) {
      const specifier = rawSpecifier.trim()
      if (!specifier) continue
      if (specifier.startsWith('type ')) {
        remainingSpecifiers.push(specifier)
        continue
      }

      const [importedName] = specifier.split(/\s+as\s+/, 1)
      if (_rueClientHookExports.has(importedName.trim())) {
        guardSpecifiers.push(specifier)
      } else {
        remainingSpecifiers.push(specifier)
      }
    }

    if (guardSpecifiers.length === 0) return fullMatch

    const replacement: string[] = []
    if (defaultImport || remainingSpecifiers.length > 0) {
      const defaultPrefix = defaultImport ? `${defaultImport}` : ''
      const namedPart =
        remainingSpecifiers.length > 0 ? `{ ${remainingSpecifiers.join(', ')} }` : ''
      const separator = defaultPrefix && namedPart ? ', ' : ''
      replacement.push(
        `import ${defaultPrefix}${separator}${namedPart} from ${JSON.stringify('@rue-js/rue')};`,
      )
    }
    replacement.push(
      `import { ${guardSpecifiers.join(', ')} } from ${JSON.stringify(hookModuleSpecifier)};`,
    )
    hasChanges = true
    return replacement.join('\n')
  })

  return hasChanges ? { code: textCode, map: null } : null
}

function transformRueClientHookImports(
  code: string,
  hookModuleSpecifier: string,
): { code: string; map: unknown } | null {
  if (!code.includes('@rue-js/rue')) return null
  if (![..._rueClientHookExports].some(hook => code.includes(hook))) return null

  let ast: ReturnType<typeof parseAst>
  try {
    ast = parseAst(code)
  } catch {
    return transformRueClientHookImportsWithRegex(code, hookModuleSpecifier)
  }

  const output = new MagicString(code)
  let hasChanges = false

  for (const node of ast.body as ImportDeclarationNode[]) {
    if (node.type !== 'ImportDeclaration') continue
    if (node.importKind === 'type') continue
    if (node.source?.value !== '@rue-js/rue') continue

    const guardSpecifiers: ImportSpecifierNode[] = []
    const remainingSpecifiers: ImportSpecifierNode[] = []

    for (const specifier of node.specifiers ?? []) {
      if (
        specifier.type === 'ImportSpecifier' &&
        specifier.importKind !== 'type' &&
        specifier.imported
      ) {
        const importedName = getImportName(specifier.imported)
        if (importedName && _rueClientHookExports.has(importedName)) {
          guardSpecifiers.push(specifier)
          continue
        }
      }
      remainingSpecifiers.push(specifier)
    }

    if (guardSpecifiers.length === 0) continue

    const replacement: string[] = []
    const remainingImport = buildRueImportStatement(remainingSpecifiers, '@rue-js/rue')
    if (remainingImport) replacement.push(remainingImport)
    const guardImport = buildRueImportStatement(guardSpecifiers, hookModuleSpecifier)
    if (guardImport) replacement.push(guardImport)

    output.overwrite(node.start, node.end, replacement.join('\n'))
    hasChanges = true
  }

  if (!hasChanges) return transformRueClientHookImportsWithRegex(code, hookModuleSpecifier)
  return {
    code: output.toString(),
    map: output.generateMap({ hires: 'boundary' }),
  }
}

function transformRueClientHookImportsForRsc(
  code: string,
  guardModuleSpecifier: string,
): { code: string; map: unknown } | null {
  if (hasUseClientDirective(code)) return null
  return transformRueClientHookImports(code, guardModuleSpecifier)
}

const clientManualChunks = createClientManualChunks(_shimsDir)
const clientOutputConfig = createClientOutputConfig(clientManualChunks)
const clientCodeSplittingConfig = createClientCodeSplittingConfig(clientManualChunks)

function getClientOutputConfigForVite(viteMajorVersion: number) {
  return viteMajorVersion >= 8 ? { codeSplitting: clientCodeSplittingConfig } : clientOutputConfig
}

export type TextOptions = {
  /**
   * Base directory containing the app/ and pages/ directories.
   * Can be an absolute path or a path relative to the Vite root.
   *
   * By default, text auto-detects: checks for app/ and pages/ at the
   * project root first, then falls back to src/app/ and src/pages/.
   */
  appDir?: string
  /**
   * Force-disable App Router detection even when an app/ directory exists.
   * Only the Pages Router pipeline will be active.
   * Intended for testing and tools that need to build only the Pages Router
   * bundle from a hybrid (app + pages) project.
   * @default false
   */
  disableAppRouter?: boolean
  /**
   * Override the output directory for the RSC server bundle.
   * Absolute paths are used as-is; relative paths are resolved from the
   * Vite root. Defaults to "dist/server".
   * Intended for tests that need to build multiple fixtures in parallel
   * without clobbering each other's output.
   */
  rscOutDir?: string
  /**
   * Override the output directory for the SSR bundle.
   * Defaults to "dist/server/ssr".
   */
  ssrOutDir?: string
  /**
   * Override the output directory for the client bundle.
   * Defaults to Vite's default (dist/client or dist).
   */
  clientOutDir?: string
  /**
   * Inline text config for projects that want to configure text from
   * vite.config without a separate text.config file.
   *
   * When provided, text skips loading text.config.* from disk and uses this
   * value instead. Supports both object-form and function-form config.
   */
  textConfig?: TextConfigInput
  /**
   * Auto-register Rue's native RSC plugin when an app/ directory is detected.
   * Set to `false` to disable auto-registration.
   * @default true
   */
  rsc?: boolean
  /**
   * Options passed to @rue-js/vite-plugin-rue (Rue JSX/TSX transform).
   * Enabled by default. Set to `false` to disable (e.g. if you configure
   * @rue-js/vite-plugin-rue manually in your vite.config.ts), or pass an
   * options object to customize the Rue transform.
   * @default true
   */
  rue?: RueVitePluginOptions | boolean
  /**
   * Enable build-time precompression of static assets (.br, .gz, .zst).
   *
   * When enabled, hashed assets in the client build are precompressed at
   * build time so the production server can serve them without on-the-fly
   * compression overhead.
   *
   * Disabled by default. Not useful when deploying to edge platforms
   * (Cloudflare Workers, Nitro) that handle compression at the CDN layer.
   *
   * Can also be enabled via the `--precompress` CLI flag or by setting the
   * `TEXT_PRECOMPRESS=1` environment variable (useful for CI pipelines
   * that need to enable precompression without modifying vite.config.ts).
   * @default false
   */
  precompress?: boolean
  /**
   * Experimental text-only feature flags.
   */
  experimental?: {
    /**
     * Dedup client references emitted from RSC proxy modules in dev.
     * Disabled by default until the behavior is better proven across
     * ecosystem apps.
     * @default false
     */
    clientReferenceDedup?: boolean
  }
}

type NitroSetupContext = {
  options: {
    dev?: boolean
    routeRules?: Record<string, NitroRouteRuleConfig>
  }
  logger?: {
    warn?: (message: string) => void
  }
}

export default function text(options: TextOptions = {}): PluginOption[] {
  const optionRecord = options as Record<string, unknown>
  const unsupportedRueOption = optionRecord.rue ?? optionRecord[REMOVED_LEGACY_OPTION]
  if (unsupportedRueOption !== undefined && unsupportedRueOption !== false) {
    throw new Error('text: the rue option has been removed.')
  }

  const viteMajorVersion = getViteMajorVersion()
  let root: string
  let pagesDir: string
  let appDir: string
  let hasAppDir = false
  let hasPagesDir = false
  let textConfig: ResolvedTextConfig
  let fileMatcher: ReturnType<typeof createValidFileMatcher>
  let middlewarePath: string | null = null
  let instrumentationPath: string | null = null
  let instrumentationClientPath: string | null = null
  let clientInjectModule: string | null = null
  let hasCloudflarePlugin = false
  let warnedInlineTextConfigOverride = false
  let hasNitroPlugin = false
  let isBuildCommand = false
  let rscCompatibilityId: string | undefined
  const draftModeSecret = randomUUID()

  // Build-time layout classification manifest, captured in the RSC virtual
  // module's load hook and consumed in generateBundle to patch the generated
  // `__TEXT_CLASS` stub with a real dispatch table.
  let rscClassificationManifest: RouteClassificationManifest | null = null

  // Resolve shim paths - works both from source (.ts) and built (.js)
  const shimsDir = path.resolve(__dirname, 'shims')
  const serverDir = path.resolve(__dirname, 'server')
  const configDir = path.resolve(__dirname, 'config')
  const utilsDir = path.resolve(__dirname, 'utils')

  // Shared with the Layer 2 generateBundle hook below. Rolldown stores module
  // IDs as canonicalized filesystem paths (fs.realpathSync.native), so we must
  // canonicalize anything we hand to the classifier and anything we ask the
  // module graph for. The shim files exist in the text package before plugin
  // init, so realpath is safe to evaluate eagerly.
  const canonicalize = (p: string): string => tryRealpathSync(p) ?? p
  const dynamicShimPaths: ReadonlySet<string> = new Set(
    [
      resolveShimModulePath(shimsDir, 'headers'),
      resolveShimModulePath(shimsDir, 'server'),
      resolveShimModulePath(shimsDir, 'cache'),
    ].map(canonicalize),
  )

  // Shim alias map — populated in config(), used by resolveId() for .js variants
  let textShimMap: Record<string, string> = {}
  const nodeRuntimeRequire = createRequire(import.meta.url)
  const resolveRueEsmRuntime = (specifier: string) => {
    const parts = specifier.split('/')
    const packageName = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
    const subpathParts = parts.slice(specifier.startsWith('@') ? 2 : 1)
    const exportKey = subpathParts.length ? `./${subpathParts.join('/')}` : '.'
    const packageDir = nodeRuntimeRequire.resolve
      .paths(packageName)
      ?.map(searchPath => path.join(searchPath, packageName))
      .find(candidate => fs.existsSync(path.join(candidate, 'package.json')))
    if (!packageDir) return null

    try {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'),
      ) as { exports?: Record<string, string | Record<string, string>> }
      const entry = manifest.exports?.[exportKey]
      const target =
        typeof entry === 'string' ? entry : (entry?.module ?? entry?.import ?? entry?.default)
      return target ? canonicalize(path.resolve(packageDir, target)) : null
    } catch {
      return null
    }
  }
  const rueRuntimeImplementation = (specifier: string) => {
    if (specifier === '@rue-js/rue') return '@rue-js/runtime'
    if (specifier === '@rue-js/server-renderer' || specifier === '@rue-js/rue/server-renderer')
      return '@rue-js/runtime/server'
    return specifier.startsWith('@rue-js/rue/internal')
      ? specifier.replace('@rue-js/rue/', '@rue-js/runtime/')
      : specifier
  }
  const rueServerRuntimeAliases = new Map<string, string>()
  const pagesServerRuntimeAliases = new Map<string, string>()
  const rueClientRuntimeAliases = new Map<string, string>()
  const packageTypeCache = new Map<string, 'module' | 'commonjs'>()
  const getRueRuntimeExternalType = (filePath: string): 'module' | 'commonjs' => {
    if (filePath.endsWith('.mjs')) return 'module'
    if (filePath.endsWith('.cjs')) return 'commonjs'

    let dir = path.dirname(filePath)
    while (dir !== path.dirname(dir)) {
      const cached = packageTypeCache.get(dir)
      if (cached) return cached

      const packageJsonPath = path.join(dir, 'package.json')
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
            type?: string
          }
          const type = packageJson.type === 'module' ? 'module' : 'commonjs'
          packageTypeCache.set(dir, type)
          return type
        } catch {
          packageTypeCache.set(dir, 'commonjs')
          return 'commonjs'
        }
      }

      dir = path.dirname(dir)
    }

    return 'commonjs'
  }
  const normalizeRueServerRuntimeId = (id: string): string => {
    let cleanId = id.startsWith('\0') ? id.slice(1) : id
    if (cleanId.startsWith('file://')) {
      try {
        cleanId = fileURLToPath(cleanId)
      } catch {}
    }
    if (cleanId.startsWith('/@fs/')) {
      cleanId = cleanId.slice('/@fs'.length)
    }
    return path.isAbsolute(cleanId) ? (canonicalize(cleanId) ?? cleanId) : cleanId
  }
  const registerRueServerRuntimeAlias = (id: string, resolved: string) => {
    rueServerRuntimeAliases.set(id, resolved)
    rueServerRuntimeAliases.set(canonicalize(resolved), resolved)
    rueServerRuntimeAliases.set(pathToFileURL(resolved).href, resolved)
  }
  const registerPagesServerRuntimeAlias = (id: string, resolved: string) => {
    pagesServerRuntimeAliases.set(id, resolved)
    pagesServerRuntimeAliases.set(canonicalize(resolved), resolved)
    pagesServerRuntimeAliases.set(pathToFileURL(resolved).href, resolved)
  }
  const registerRueClientRuntimeAlias = (id: string, runtimeSpecifier: string) => {
    try {
      const resolved = nodeRuntimeRequire.resolve(runtimeSpecifier)
      registerRueClientResolvedAlias(id, resolved)
    } catch {}
  }
  const registerRueClientResolvedAlias = (id: string, resolved: string) => {
    rueClientRuntimeAliases.set(id, resolved)
    rueClientRuntimeAliases.set(canonicalize(id), resolved)
    rueClientRuntimeAliases.set(canonicalize(resolved), resolved)
    rueClientRuntimeAliases.set(pathToFileURL(resolved).href, resolved)
  }
  for (const specifier of RUE_NODE_RUNTIME_ALIASES) {
    try {
      const implementation = rueRuntimeImplementation(specifier)
      registerRueServerRuntimeAlias(
        specifier,
        resolveRueEsmRuntime(implementation) ?? nodeRuntimeRequire.resolve(implementation),
      )
    } catch {}
  }
  for (const specifier of compactStringEntries(RSC_RUE_NODE_EXTERNALS)) {
    try {
      registerPagesServerRuntimeAlias(specifier, nodeRuntimeRequire.resolve(specifier))
    } catch {}
  }
  registerRueClientRuntimeAlias('@rue-js/rue', '@rue-js/rue/dist/rue.runtime.esm-browser.js')
  registerRueClientRuntimeAlias('@rue-js/runtime', '@rue-js/runtime/dist/runtime.esm-browser.js')
  registerRueClientRuntimeAlias(
    '@rue-js/rue/internal',
    '@rue-js/rue/dist/rue.internal.esm-bundler.js',
  )
  registerRueClientRuntimeAlias(
    '@rue-js/runtime/internal',
    '@rue-js/runtime/dist/runtime.internal.esm-bundler.js',
  )
  try {
    const rueBrowserRequireShim = resolveShimModulePath(shimsDir, 'rue-runtime-browser-require')
    for (const runtimeDir of [
      path.resolve(__dirname, 'runtime'),
      path.resolve(__dirname, '../dist/runtime'),
    ]) {
      for (const entryFile of ['index.js']) {
        const runtimeFile = path.join(runtimeDir, entryFile)
        if (fs.existsSync(runtimeFile)) {
          registerRueClientResolvedAlias(runtimeFile, rueBrowserRequireShim)
        }
      }
    }
  } catch {}
  rueClientRuntimeAliases.set(
    '@rue-js/server-renderer',
    resolveShimModulePath(shimsDir, 'server-renderer-client'),
  )
  const addRueServerSourceAlias = (
    packageName: string,
    sourceRelativePath: string,
    runtimeSpecifier: string,
  ) => {
    try {
      const packageDir = path.dirname(nodeRuntimeRequire.resolve(`${packageName}/package.json`))
      registerRueServerRuntimeAlias(
        canonicalize(path.join(packageDir, sourceRelativePath)),
        resolveRueEsmRuntime(rueRuntimeImplementation(runtimeSpecifier)) ??
          nodeRuntimeRequire.resolve(runtimeSpecifier),
      )
    } catch {}
  }
  for (const entry of RUE_COMPILER_ENTRIES) {
    for (const packageName of ['@rue-js/rue', '@rue-js/runtime']) {
      addRueServerSourceAlias(
        packageName,
        `src/compiler-runtime/entries/${entry}.ts`,
        `@rue-js/runtime/internal/${entry}`,
      )
    }
  }
  addRueServerSourceAlias('@rue-js/rue', 'src/index.ts', '@rue-js/rue')
  addRueServerSourceAlias('@rue-js/rue', 'src/internal.ts', '@rue-js/rue/internal')
  addRueServerSourceAlias('@rue-js/rue', 'src/server-renderer.ts', '@rue-js/rue/server-renderer')
  addRueServerSourceAlias('@rue-js/runtime', 'src/index.ts', '@rue-js/runtime')
  addRueServerSourceAlias('@rue-js/runtime', 'src/internal.ts', '@rue-js/runtime/internal')
  addRueServerSourceAlias('@rue-js/runtime', 'src/server.ts', '@rue-js/runtime/server')
  addRueServerSourceAlias('@rue-js/server-renderer', 'src/index.ts', '@rue-js/server-renderer')
  const externalizeRueServerRuntime = (id: string, importer?: string) => {
    const normalizedId = normalizeRueServerRuntimeId(id)
    const relativeId =
      id.split('?')[0].startsWith('.') && importer
        ? canonicalize(path.resolve(path.dirname(importer.split('?')[0]), id.split('?')[0]))
        : null
    const runtimeAlias =
      rueServerRuntimeAliases.get(id) ??
      rueServerRuntimeAliases.get(normalizedId) ??
      pagesServerRuntimeAliases.get(id) ??
      pagesServerRuntimeAliases.get(normalizedId) ??
      (relativeId ? rueServerRuntimeAliases.get(relativeId) : undefined) ??
      (relativeId ? pagesServerRuntimeAliases.get(relativeId) : undefined)
    if (!runtimeAlias) return null

    return {
      externalize: pathToFileURL(runtimeAlias).href,
      type: getRueRuntimeExternalType(runtimeAlias),
    }
  }

  const isPagesServerRuntimeImporter = (importer?: string) => {
    if (!importer) return false
    const cleanImporter = importer.split('?')[0].replaceAll('\\', '/')
    return (
      cleanImporter === RESOLVED_SERVER_ENTRY ||
      cleanImporter.includes(VIRTUAL_SERVER_ENTRY) ||
      cleanImporter.endsWith('/entries/pages-server-entry.ts') ||
      cleanImporter.endsWith('/dist/entries/pages-server-entry.js')
    )
  }

  /**
   * Generate the virtual SSR server entry module.
   * This is the entry point for `vite build --ssr`.
   */
  async function generateServerEntry(): Promise<string> {
    return _generateServerEntry(
      pagesDir,
      textConfig,
      fileMatcher,
      middlewarePath,
      instrumentationPath,
    )
  }

  /**
   * Generate the virtual client hydration entry module.
   * This is the entry point for `vite build` (client bundle).
   *
   * It maps route patterns to dynamic imports of page modules so Vite
   * code-splits each page into its own chunk. At runtime it reads
   * __TEXT_DATA__ to determine which page to hydrate.
   */
  async function generateClientEntry(): Promise<string> {
    return _generateClientEntry(pagesDir, textConfig, fileMatcher)
  }

  async function writeRouteTypes(): Promise<void> {
    if (!hasAppDir) return
    await generateRouteTypes({
      root,
      appDir,
      pageExtensions: textConfig.pageExtensions,
    })
  }

  let appRouteTypeGeneration: Promise<void> | null = null
  let appRouteTypeGenerationPending = false
  let appRouteTypeGenerationClosing = false

  // Auto-register Rue's native RSC plugin when App Router is detected.
  // Check eagerly at call time using the same heuristic as config().
  // Must mirror the full detection logic: check {base}/app then {base}/src/app.
  const autoRsc = options.rsc !== false
  const earlyBaseDir = options.appDir ?? process.cwd()
  const earlyAppDirExists =
    !options.disableAppRouter &&
    (fs.existsSync(path.join(earlyBaseDir, 'app')) ||
      fs.existsSync(path.join(earlyBaseDir, 'src', 'app')))

  let resolvedRuePath: string | null = null
  // Prefer the user's project graph so text shares the app's Vite/plugin
  // instances. In source/workspace development, test fixtures may not declare
  // peer deps explicitly, so fall back to text's own install location.
  resolvedRuePath = resolveOptionalDependency(earlyBaseDir, '@rue-js/vite-plugin-rue')
  const rueRscPlugins =
    earlyAppDirExists && autoRsc
      ? createRueRscPlugin({
          entries: {
            rsc: VIRTUAL_RSC_ENTRY,
            ssr: VIRTUAL_APP_SSR_ENTRY,
            client: VIRTUAL_APP_BROWSER_ENTRY,
          },
        })
      : []

  const rueOptions: RueVitePluginOptions | undefined =
    options.rue && typeof options.rue === 'object' ? options.rue : undefined
  const getMergedRueOptions = (): RueVitePluginOptions => {
    const textRouteRueExcludes = [
      path.resolve(__dirname, '../../rue-rsc/src'),
      path.resolve(__dirname, '../../runtime'),
    ]
    return {
      ...rueOptions,
      target: 'hydrate',
      exclude: [...new Set([...(rueOptions?.exclude ?? []), ...textRouteRueExcludes])],
    }
  }

  let ruePlugin: Plugin | null = null
  if (options.rue !== false) {
    if (!resolvedRuePath) {
      throw new Error(
        'text: @rue-js/vite-plugin-rue is not installed.\n' +
          'Run: ' +
          detectPackageManager(process.cwd()) +
          ' @rue-js/vite-plugin-rue',
      )
    }
    ruePlugin = createLazyRuePlugin(resolvedRuePath, getMergedRueOptions, 'pre')
  }

  const imageImportDimCache = new Map<string, { width: number; height: number }>()

  // Shared state for the MDX proxy plugin. We auto-inject @mdx-js/rollup when
  // MDX is detected in app/pages during config(), and lazily on first plain
  // .mdx transform for MDX that only enters the graph via import.meta.glob.
  let mdxDelegate: Plugin | null = null
  // Cached across calls — only the first invocation's `reason` affects logging.
  // This is correct because config() always runs before transform() in the same build.
  let mdxDelegatePromise: Promise<Plugin | null> | null = null
  let hasUserMdxPlugin = false
  let warnedMissingMdxPlugin = false

  async function ensureMdxDelegate(reason: 'detected' | 'on-demand'): Promise<Plugin | null> {
    // Reuse the auto-injected delegate once it has been created.
    // If the user registered their own MDX plugin and `mdxDelegate` is still null,
    // return null here so transform() falls through without handling the file and
    // the user's plugin can process the .mdx module later in the pipeline.
    // Note: hasUserMdxPlugin is set during config(), which runs before transform().
    if (mdxDelegate || hasUserMdxPlugin) return mdxDelegate
    if (!mdxDelegatePromise) {
      mdxDelegatePromise = (async () => {
        try {
          const mdxRollup = await import('@mdx-js/rollup')
          const mdxFactory = (mdxRollup.default ?? mdxRollup) as (
            options: Record<string, unknown>,
          ) => Plugin
          const mdxOpts: Record<string, unknown> = { jsx: true }
          if (textConfig.mdx) {
            if (textConfig.mdx.remarkPlugins) mdxOpts.remarkPlugins = textConfig.mdx.remarkPlugins
            if (textConfig.mdx.rehypePlugins) mdxOpts.rehypePlugins = textConfig.mdx.rehypePlugins
            if (textConfig.mdx.recmaPlugins) mdxOpts.recmaPlugins = textConfig.mdx.recmaPlugins
          }
          const delegate = mdxFactory(mdxOpts)
          mdxDelegate = delegate
          if (reason === 'detected') {
            if (textConfig.mdx) {
              console.log(
                '[text] Auto-injected @mdx-js/rollup with remark/rehype plugins from text.config',
              )
            } else {
              console.log('[text] Auto-injected @mdx-js/rollup for MDX support')
            }
          } else {
            console.log('[text] Auto-injected @mdx-js/rollup for on-demand MDX support')
          }
          return delegate
        } catch {
          // Only warn during "detected" path (MDX files in app/pages at config time).
          // For "on-demand" (MDX encountered during transform), the error thrown
          // in transform() is more actionable and immediate. Avoid double messaging.
          if (reason === 'detected' && !warnedMissingMdxPlugin) {
            warnedMissingMdxPlugin = true
            console.warn(
              '[text] MDX files detected but @mdx-js/rollup is not installed. ' +
                'Install it with: ' +
                detectPackageManager(process.cwd()) +
                ' @mdx-js/rollup',
            )
          }
          return null
        }
      })()
    }
    return mdxDelegatePromise
  }

  function transformMdxWithFallback(code: string): { code: string; map: null } {
    const body = code.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim()
    const text = body
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim()
    return {
      code: `const content = ${JSON.stringify(text)};\nexport default function MDXContent() {\n  return content;\n}\n`,
      map: null,
    }
  }

  const plugins: PluginOption[] = [
    // Resolve tsconfig paths/baseUrl aliases so real-world Text.js repos
    // that use @/*, #/*, or baseUrl imports work out of the box.
    // Vite 8+ supports this natively via resolve.tsconfigPaths.
    ...(viteMajorVersion >= 8 ? [] : [tsconfigPaths()]),
    {
      name: 'text:rsc-rue-client-hook-guard',
      enforce: 'pre' as const,
      transform(code: string, id: string) {
        if (this.environment?.name === 'client') return null
        const cleanId = id.split('?')[0]
        if (cleanId.startsWith('\0') || !/\.[cm]?[jt]sx?$/.test(cleanId)) return null
        if (!cleanId.startsWith(appDir + path.sep)) return null
        return transformRueClientHookImportsForRsc(
          code,
          resolveShimModulePath(shimsDir, 'client-hook-error'),
        )
      },
    } satisfies Plugin,
    createCompiledShimJsxLoader(shimsDir, resolvedRuePath),
    // Rue JSX/TSX transform for route and component modules.
    ...(!earlyAppDirExists && ruePlugin ? [ruePlugin] : []),
    {
      name: 'text:app-cjs-interop',
      enforce: 'post' as const,
      transform(code: string, id: string) {
        if (this.environment?.name === 'client') return null
        if (!/\brequire\s*\(/.test(code)) return null
        const cleanId = id.split('?')[0]
        if (cleanId.startsWith('\0') || !/\.[cm]?[jt]sx?$/.test(cleanId)) return null
        if (!cleanId.startsWith(root + path.sep)) return null

        const output = new MagicString(code)
        const requireCallRe = /\brequire\s*\(\s*(["'][^"']+["'])\s*\)/g
        let match: RegExpExecArray | null
        while ((match = requireCallRe.exec(code))) {
          output.overwrite(
            match.index,
            match.index + match[0].length,
            `__text_cjs_interop__(await import(${match[1]}))`,
          )
        }
        if (!output.hasChanged()) return null
        output.prepend(
          `function __text_cjs_interop__(mod){return mod&&"default"in mod?mod.default:mod;}\n`,
        )
        return {
          code: output.toString(),
          map: output.generateMap({ hires: 'boundary' }),
        }
      },
    } satisfies Plugin,
    // Transform CJS require()/module.exports to ESM before other plugins
    // analyze imports (RSC directive scanning, shim resolution, etc.)
    commonjs({ filter: shouldRunCommonjsTransform }),
    // Allow `import 'server-only'` from middleware (and any module reachable
    // from it) in non-RSC environments. Registered before `text:config` so
    // its `enforce: "pre"` resolveId runs ahead of @vitejs/plugin-rsc's
    // `rsc:validate-imports` (which rejects bare `server-only` outside RSC).
    // See packages/text/src/plugins/middleware-server-only.ts for the
    // import-chain taint design.
    createMiddlewareServerOnlyPlugin({
      getMiddlewarePath: () => middlewarePath,
      getCanonicalMiddlewarePath: () =>
        middlewarePath ? (tryRealpathSync(middlewarePath) ?? middlewarePath) : null,
      serverOnlyShimPath: resolveShimModulePath(shimsDir, 'server-only'),
    }),
    // Resolve `data:text/css[+module],...` imports into virtual CSS files so
    // Vite's CSS pipeline (LightningCSS, CSS modules) processes them instead
    // of leaving the data URL as a runtime import that Node/workerd cannot
    // load. Matches Turbopack's behaviour for the Text.js
    // `css-modules-data-urls` fixture. See plugins/css-data-url.ts.
    dataUrlCssPlugin(),
    {
      name: 'text:config',
      enforce: 'pre',

      async config(config, env) {
        root = config.root ?? process.cwd()
        const userResolve = config.resolve as UserResolveConfigWithTsconfigPaths | undefined
        const shouldEnableNativeTsconfigPaths =
          viteMajorVersion >= 8 && userResolve?.tsconfigPaths === undefined
        const tsconfigPathAliases = resolveTsconfigAliases(root)
        const localFileDependencyAliases = loadLocalFileDependencyAliases(root)

        // Load .env files into process.env before anything else.
        // Text.js loads .env files before evaluating text.config.js, so
        // env vars are available in config, server-side code, and as
        // TEXT_PUBLIC_* defines for the client bundle.
        // Pass '' as prefix to load ALL vars, not just VITE_-prefixed ones.
        const mode = env?.mode ?? 'development'
        const envDir = config.envDir ?? root
        const dotenvVars = loadEnv(mode, envDir, '')
        for (const [key, value] of Object.entries(dotenvVars)) {
          if (process.env[key] === undefined) {
            process.env[key] = value
          }
        }
        // Align NODE_ENV with Text.js semantics: build -> production, serve -> development.
        // Text.js unconditionally forces NODE_ENV during build/dev, so we do the same.
        let resolvedNodeEnv: string
        if (mode === 'test') {
          resolvedNodeEnv = 'test'
        } else if (env?.command === 'build') {
          resolvedNodeEnv = 'production'
        } else {
          resolvedNodeEnv = 'development'
        }
        if (process.env.NODE_ENV !== resolvedNodeEnv) {
          process.env.NODE_ENV = resolvedNodeEnv
        }

        // Resolve the base directory for app/pages detection.
        // If appDir is provided, resolve it (supports both relative and absolute paths).
        // If not provided, auto-detect: check root first, then src/ subdirectory.
        let baseDir: string
        if (options.appDir) {
          baseDir = path.isAbsolute(options.appDir)
            ? options.appDir
            : path.resolve(root, options.appDir)
        } else {
          // Auto-detect: prefer root-level app/ and pages/, fall back to src/
          const hasRootApp = fs.existsSync(path.join(root, 'app'))
          const hasRootPages = fs.existsSync(path.join(root, 'pages'))
          const hasSrcApp = fs.existsSync(path.join(root, 'src', 'app'))
          const hasSrcPages = fs.existsSync(path.join(root, 'src', 'pages'))

          if (hasRootApp || hasRootPages) {
            baseDir = root
          } else if (hasSrcApp || hasSrcPages) {
            baseDir = path.join(root, 'src')
          } else {
            baseDir = root
          }
        }
        pagesDir = path.join(baseDir, 'pages')
        appDir = path.join(baseDir, 'app')
        hasPagesDir = fs.existsSync(pagesDir)
        hasAppDir = !options.disableAppRouter && fs.existsSync(appDir)

        // Load text.config.js if present (always from project root, not src/),
        // unless text({ textConfig }) explicitly overrides it.
        // Guard: resolve textConfig only once per plugin instance. In Vite's
        // multi-environment build the config hook fires once per environment;
        // without this guard, resolveTextConfig() → resolveBuildId() generates
        // a fresh random UUID each time, causing different buildId values to be
        // baked into the RSC, SSR, and client bundles.
        // Note: fileMatcher, instrumentationPath, etc. are intentionally set
        // outside this guard — they are cheap and deterministic, and keeping
        // them here ensures they reflect the final resolved root on every call.
        if (!textConfig) {
          const phase = env?.command === 'build' ? PHASE_PRODUCTION_BUILD : PHASE_DEVELOPMENT_SERVER
          let rawConfig: TextConfig | null
          if (options.textConfig) {
            const diskConfigPath = findTextConfigPath(root)
            if (diskConfigPath && !warnedInlineTextConfigOverride) {
              warnedInlineTextConfigOverride = true
              console.warn(
                `[text] text({ textConfig }) overrides ${path.basename(diskConfigPath)}. Remove one of the config sources to avoid drift.`,
              )
            }
            rawConfig = await resolveTextConfigInput(options.textConfig, phase)
          } else {
            rawConfig = await loadTextConfig(root, phase)
          }
          textConfig = await resolveTextConfig(rawConfig, root)
        }
        rscCompatibilityId ??= createRscCompatibilityId(textConfig)
        fileMatcher = createValidFileMatcher(textConfig.pageExtensions)
        instrumentationPath = findInstrumentationFile(root, fileMatcher)
        instrumentationClientPath = findInstrumentationClientFile(root, fileMatcher)
        middlewarePath = findMiddlewareFile(root, fileMatcher)
        const instrumentationClientInjects = textConfig.instrumentationClientInject.map(spec =>
          spec.startsWith('./') || spec.startsWith('../') ? path.resolve(root, spec) : spec,
        )
        clientInjectModule = instrumentationClientInjects.length
          ? generateInstrumentationClientInjectModule(
              instrumentationClientInjects,
              instrumentationClientPath,
              INSTRUMENTATION_CLIENT_EMPTY_MODULE,
            )
          : null
        if (env?.command === 'build') {
          await writeRouteTypes()
        }

        // Merge env from text.config.js with TEXT_PUBLIC_* env vars
        const defines = getTextPublicEnvDefines()
        if (
          !config.define ||
          typeof config.define !== 'object' ||
          !('process.env.NODE_ENV' in config.define)
        ) {
          defines['process.env.NODE_ENV'] = JSON.stringify(resolvedNodeEnv)
        }
        for (const [key, value] of Object.entries(textConfig.env)) {
          // Skip NODE_ENV from text.config.js env — Text.js ignores it too,
          // and it would silently override the value we just set above.
          if (key === 'NODE_ENV') continue
          defines[`process.env.${key}`] = JSON.stringify(value)
        }
        // Expose basePath to client-side code
        defines['process.env.__TEXT_ROUTER_BASEPATH'] = JSON.stringify(textConfig.basePath)
        // Expose trailingSlash to client-side code so <Link> can render hrefs
        // in the canonical form and avoid an unnecessary 308 redirect bounce.
        defines['process.env.__TEXT_TRAILING_SLASH'] = JSON.stringify(
          textConfig.trailingSlash ? 'true' : 'false',
        )
        // Expose image remote patterns for validation in text/image shim
        defines['process.env.__TEXT_IMAGE_REMOTE_PATTERNS'] = JSON.stringify(
          JSON.stringify(textConfig.images?.remotePatterns ?? []),
        )
        defines['process.env.__TEXT_IMAGE_DOMAINS'] = JSON.stringify(
          JSON.stringify(textConfig.images?.domains ?? []),
        )
        // Expose allowed image widths (union of deviceSizes + imageSizes) for
        // server-side validation. Matches Text.js behavior: only configured
        // sizes are accepted by the image optimization endpoint.
        {
          const deviceSizes = textConfig.images?.deviceSizes ?? [
            640, 750, 828, 1080, 1200, 1920, 2048, 3840,
          ]
          const imageSizes = textConfig.images?.imageSizes ?? [16, 32, 48, 64, 96, 128, 256, 384]
          defines['process.env.__TEXT_IMAGE_DEVICE_SIZES'] = JSON.stringify(
            JSON.stringify(deviceSizes),
          )
          defines['process.env.__TEXT_IMAGE_SIZES'] = JSON.stringify(JSON.stringify(imageSizes))
        }
        // Expose dangerouslyAllowSVG flag for the image shim's auto-skip logic.
        // When false (default), .svg sources bypass the optimization endpoint.
        defines['process.env.__TEXT_IMAGE_DANGEROUSLY_ALLOW_SVG'] = JSON.stringify(
          String(textConfig.images?.dangerouslyAllowSVG ?? false),
        )
        // Expose dangerouslyAllowLocalIP flag for the image shim's private-IP guard.
        // When false (default), remote image URLs with literal private-IP hostnames are blocked.
        defines['process.env.__TEXT_IMAGE_DANGEROUSLY_ALLOW_LOCAL_IP'] = JSON.stringify(
          String(textConfig.images?.dangerouslyAllowLocalIP ?? false),
        )
        // Build ID — resolved from text.config generateBuildId() or random UUID.
        // Exposed so server entries and the text/server shim can inject it.
        // Also used to namespace ISR cache keys so old cached entries from a
        // previous deploy are never served by the new one.
        defines['process.env.__TEXT_BUILD_ID'] = JSON.stringify(textConfig.buildId)
        // Public browser-facing identity for App Router RSC compatibility
        // checks. Prefer Text.js-style deploymentId when configured; otherwise
        // generate a separate token so RSC headers do not expose
        // generateBuildId() verbatim.
        defines['process.env.__TEXT_RSC_COMPATIBILITY_ID'] = JSON.stringify(rscCompatibilityId)
        // Deployment ID — mirrors Text.js' TEXT_DEPLOYMENT_ID seed for shared
        // "use cache" entries, falling back to build ID when absent.
        defines['process.env.__TEXT_DEPLOYMENT_ID'] = JSON.stringify(textConfig.deploymentId ?? '')
        // Text.js version compat — mirrors Text.js' `process.env.__TEXT_VERSION`,
        // which is substituted by their webpack DefinePlugin at build time
        // (see `packages/text/src/client/text.ts` line 5 and
        // `packages/text/src/client/app-bootstrap.ts` line 11). Userland code
        // and third-party libraries occasionally branch on this value, and
        // it's the source for `window.text.version` (set in
        // `client/window-text.ts`). We report the text package version
        // because text is the runtime — there is no underlying Text.js
        // version to surface.
        defines['process.env.__TEXT_VERSION'] = JSON.stringify(getTextVersion())
        // App Shells — always false; plumbing-only flag, not yet implemented.
        // See: https://github.com/vercel/next.js/pull/93997
        defines['process.env.__TEXT_APP_SHELLS'] = JSON.stringify(false)

        // Build the shim alias map. Exact `.js` variants are included for the
        // public Text entrypoints that are file-backed in `text/package.json`.
        // Some libraries (for example `nuqs`) import `text/navigation.js`
        // directly; aliasing the `.js` form ensures optimizeDeps pre-bundles
        // text's shim instead of real Text.
        textShimMap = Object.fromEntries(
          Object.entries({
            'text/link': path.join(shimsDir, 'link'),
            'text/head': path.join(shimsDir, 'head'),
            'text/router': path.join(shimsDir, 'router'),
            'text/compat/router': path.join(shimsDir, 'compat-router'),
            'text/image': path.join(shimsDir, 'image'),
            'text/legacy/image': path.join(shimsDir, 'legacy-image'),
            'text/dynamic': path.join(shimsDir, 'dynamic'),
            'text/app': path.join(shimsDir, 'app'),
            'text/document': path.join(shimsDir, 'document'),
            'text/config': path.join(shimsDir, 'config'),
            'text/script': path.join(shimsDir, 'script'),
            'text/server/app-router-entry': path.join(serverDir, 'app-router-entry'),
            'text/server/image-optimization': path.join(serverDir, 'image-optimization'),
            'text/server/pages-i18n': path.join(serverDir, 'pages-i18n'),
            'text/server/prod-server': path.join(serverDir, 'prod-server'),
            'text/server/request-pipeline': path.join(serverDir, 'request-pipeline'),
            'text/server/worker-utils': path.join(serverDir, 'worker-utils'),
            'text/server': path.join(shimsDir, 'server'),
            'text/config/config-matchers': path.join(configDir, 'config-matchers'),
            'text/utils/query': path.join(utilsDir, 'query'),
            // "text/navigation" is NOT here — it's in _rscConditionShims and
            // handled by the resolveId hook for per-environment control (#834).
            'text/headers': path.join(shimsDir, 'headers'),
            'text/font/google': path.join(shimsDir, 'font-google'),
            'text/font/local': path.join(shimsDir, 'font-local'),
            'text/form': path.join(shimsDir, 'form'),
            'text/og': path.join(shimsDir, 'og'),
            'text/web-vitals': path.join(shimsDir, 'web-vitals'),
            'text/amp': path.join(shimsDir, 'amp'),
            'text/offline': path.join(shimsDir, 'offline'),
            'text/error': path.join(shimsDir, 'error'),
            'text/constants': path.join(shimsDir, 'constants'),
            // Internal text/dist/* paths used by popular libraries
            // (text-intl, @clerk/textjs, @sentry/textjs, text-nprogress-bar, etc.)
            'text/dist/shared/lib/app-router-context.shared-runtime': path.join(
              shimsDir,
              'internal',
              'app-router-context',
            ),
            'text/dist/shared/lib/app-router-context': path.join(
              shimsDir,
              'internal',
              'app-router-context',
            ),
            'text/dist/shared/lib/router-context.shared-runtime': path.join(
              shimsDir,
              'internal',
              'router-context',
            ),
            'text/dist/shared/lib/utils': path.join(shimsDir, 'internal', 'utils'),
            'text/dist/server/api-utils': path.join(shimsDir, 'internal', 'api-utils'),
            'text/dist/server/web/spec-extension/cookies': path.join(
              shimsDir,
              'internal',
              'cookies',
            ),
            'text/dist/compiled/@edge-runtime/cookies': path.join(shimsDir, 'internal', 'cookies'),
            'text/dist/server/app-render/work-unit-async-storage.external': path.join(
              shimsDir,
              'internal',
              'work-unit-async-storage',
            ),
            'text/dist/client/components/work-unit-async-storage.external': path.join(
              shimsDir,
              'internal',
              'work-unit-async-storage',
            ),
            'text/dist/client/components/request-async-storage.external': path.join(
              shimsDir,
              'internal',
              'work-unit-async-storage',
            ),
            'text/dist/client/components/request-async-storage': path.join(
              shimsDir,
              'internal',
              'work-unit-async-storage',
            ),
            'text/dist/server/request/root-params': path.join(shimsDir, 'root-params'),
            // Re-export public modules for internal path imports
            // "text/dist/client/components/navigation" in _rscConditionShims (#834).
            'text/dist/server/config-shared': path.join(shimsDir, 'internal', 'utils'),
            // server-only / client-only marker packages
            'server-only': path.join(shimsDir, 'server-only'),
            'client-only': path.join(shimsDir, 'client-only'),
            'text/error-boundary': path.join(shimsDir, 'error-boundary'),
            'text/layout-segment-context': path.join(shimsDir, 'layout-segment-context'),
            'text/metadata': path.join(shimsDir, 'metadata'),
            'text/fetch-cache': path.join(shimsDir, 'fetch-cache'),
            'text/cache-runtime': path.join(shimsDir, 'cache-runtime'),
            'text/navigation-state': path.join(shimsDir, 'navigation-state'),
            'text/unified-request-context': path.join(shimsDir, 'unified-request-context'),
            'text/pages-router-runtime': path.join(shimsDir, 'pages-router-runtime'),
            'text/router-state': path.join(shimsDir, 'router-state'),
            'text/head-state': path.join(shimsDir, 'head-state'),
            'text/i18n-state': path.join(shimsDir, 'i18n-state'),
            'text/i18n-context': path.join(shimsDir, 'i18n-context'),
            'text/cache': path.resolve(__dirname, 'cache'),
            'text/instrumentation': path.resolve(__dirname, 'server', 'instrumentation'),
            'text/instrumentation-client': path.resolve(
              __dirname,
              'client',
              'instrumentation-client',
            ),
            'text/html': path.resolve(__dirname, 'server', 'html'),
            ...(clientInjectModule === null
              ? {
                  'private-text-instrumentation-client':
                    instrumentationClientPath ?? INSTRUMENTATION_CLIENT_EMPTY_MODULE,
                }
              : {}),
          }).flatMap(([k, v]) =>
            k.startsWith('text/')
              ? [
                  [k, v],
                  [`${k}.js`, v],
                ]
              : [[k, v]],
          ),
        )

        // Detect if Cloudflare's vite plugin is present — if so, skip
        // SSR externals (Workers bundle everything, can't have Node.js externals).
        const pluginsFlat: unknown[] = []
        function flattenPlugins(arr: unknown[]) {
          for (const p of arr) {
            if (Array.isArray(p)) flattenPlugins(p)
            else if (p) pluginsFlat.push(p)
          }
        }
        flattenPlugins((config.plugins as unknown[]) ?? [])
        hasCloudflarePlugin = pluginsFlat.some(
          (p: unknown) =>
            p &&
            typeof p === 'object' &&
            'name' in p &&
            typeof p.name === 'string' &&
            (p.name === 'vite-plugin-cloudflare' || p.name.startsWith('vite-plugin-cloudflare:')),
        )
        hasNitroPlugin = pluginsFlat.some(
          (p: unknown) =>
            p &&
            typeof p === 'object' &&
            'name' in p &&
            typeof p.name === 'string' &&
            (p.name === 'nitro' || p.name.startsWith('nitro:')),
        )

        // Resolve PostCSS string plugin names that Vite can't handle.
        // Text.js projects commonly use array-form plugins like
        // `plugins: ["@tailwindcss/postcss"]` which postcss-load-config
        // doesn't resolve (only object-form keys are resolved). We detect
        // this and resolve the strings to actual plugin functions, then
        // inject via css.postcss so Vite uses the resolved plugins.
        // Only do this if the user hasn't already set css.postcss inline.
        // oxlint-disable-text-line typescript/no-explicit-any
        let postcssOverride: { plugins: any[] } | undefined
        if (!config.css?.postcss || typeof config.css.postcss === 'string') {
          postcssOverride = await resolvePostcssStringPlugins(root)
        }

        // Translate `sassOptions` from text.config into Vite's
        // `css.preprocessorOptions.scss` / `.sass` shape so SCSS variables
        // defined via `additionalData` / `prependData`, partials resolved
        // via `includePaths` / `loadPaths`, and a custom `implementation`
        // all behave the same as in Text.js. Text.js destructures these
        // keys before forwarding the rest to sass-loader; we mirror that
        // mapping so users who configured SCSS in text.config don't have
        // to duplicate it in vite.config.
        //
        // Reference: packages/text/src/build/webpack/config/blocks/css/index.ts
        const sassPreprocessorOptions = buildSassPreprocessorOptions(textConfig.sassOptions)

        // Auto-inject @mdx-js/rollup when MDX files exist and no MDX plugin is
        // already configured. Applies remark/rehype plugins from text.config.
        hasUserMdxPlugin = pluginsFlat.some(
          (p: unknown) =>
            p &&
            typeof p === 'object' &&
            'name' in p &&
            typeof p.name === 'string' &&
            (p.name === '@mdx-js/rollup' || p.name === 'mdx'),
        )
        if (
          !hasUserMdxPlugin &&
          hasMdxFiles(root, hasAppDir ? appDir : null, hasPagesDir ? pagesDir : null)
        ) {
          await ensureMdxDelegate('detected')
        }

        // Detect if this is a standalone SSR build (set by `vite build --ssr`
        // or `build.ssr` in config). SSR builds must NOT use manualChunks
        // because they use inlineDynamicImports which is incompatible.
        const isSSR = !!config.build?.ssr
        // Detect if this is a multi-environment build (App Router or Cloudflare).
        // In multi-env builds, manualChunks must only be set per-environment
        // (on the client env), not globally — otherwise it leaks into RSC/SSR
        // environments where it can cause asset resolution issues.
        const isMultiEnv = hasAppDir || hasCloudflarePlugin || hasNitroPlugin
        const shouldDedupeRscCompat = hasAppDir

        const viteConfig: UserConfig = {
          // Disable Vite's default HTML serving - we handle all routing
          appType: 'custom',
          build: {
            // Emit asset files (CSS, etc.) referenced by SSR JS chunks.
            //
            // Vite defaults `environments.ssr.build.emitAssets` to `false`
            // because the SSR environment has `consumer: "server"`. With
            // code-split CSS (the default), the CSS plugin still rewrites
            // server-component CSS imports into `import "<hash>.css"`
            // statements in the SSR JS, then emits the CSS asset via
            // `emitFile`. The asset is subsequently stripped from the
            // bundle by Vite's `vite:asset` generateBundle hook because
            // `emitAssets` is false — leaving Node's ESM loader to crash
            // on the unresolvable import the first time `text start`
            // imports the SSR entry:
            //
            //   Error [ERR_MODULE_NOT_FOUND]: Cannot find module
            //     'dist/server/ssr/style.css'
            //     imported from 'dist/server/ssr/index.js'
            //
            // Setting `ssrEmitAssets: true` at the top level propagates
            // into `environments.ssr.build.emitAssets`. We use the
            // top-level form because Vite re-applies it during
            // `resolveConfig` (see `resolveConfig` in vite/src/node/config.ts)
            // and would otherwise overwrite any per-environment value we
            // tried to set in `environments.ssr.build`. `@vitejs/plugin-rsc`
            // already sets `emitAssets: true` on the `rsc` environment for
            // the same reason; this mirrors that for `ssr`. Affects only
            // the build pipeline.
            ssrEmitAssets: true,
            // CSS minification target. Vite/esbuild defaults to the same target
            // as JS (modern evergreens), which lets esbuild's CSS minifier rewrite
            // `@media (max-width: 768px)` to the Media Queries Level 4 range
            // syntax `@media (width <= 768px)`. Both forms are semantically
            // equivalent in modern browsers, but the rewrite is observable to
            // user code that inspects `cssText` of `CSSMediaRule`s and breaks
            // tools that pattern-match the raw query string. Text.js does not
            // perform this rewrite by default (its webpack/lightningcss CSS
            // pipeline preserves the original syntax), so user code carried
            // over from Text.js can break when migrating to text.
            //
            // esbuild lowers a CSS feature when ANY target in the list lacks
            // support, so we only need to pin one engine below the range-syntax
            // baseline. Range syntax shipped in Chrome 104, Edge 104, Firefox 63,
            // and Safari 16.4 (per esbuild's `internal/compat/css_table.go`
            // MediaRange entry — and caniuse). Of those, Safari is the latest:
            // pinning `safari15` (semantically Safari 15.0, which predates
            // Safari 16.4) is sufficient to suppress the rewrite on its own.
            //
            // The other three targets are pinned to ~2023 baselines instead of
            // the absolute oldest supported version so esbuild does NOT
            // collaterally downlevel unrelated modern CSS features. With
            // chrome111/edge111/firefox114 we keep through:
            //   - `:is()` pseudo-class (Chrome 88, Firefox 78)
            //   - `hwb()` colors (Chrome 101, Firefox 96)
            //   - `lab()`, `oklch()`, `color()` (Chrome 111, Firefox 113)
            //   - gradient interpolation hints (Chrome 111)
            // CSS Nesting (Chrome 120, Safari 17.2) and Firefox-137 gradient
            // interpolation will still be lowered; that is an intentional
            // trade-off — those features are newer than the baseline and
            // lowering them is the correct behavior for our target audience.
            //
            // Mirrors the Text.js fixture
            // test/e2e/app-dir/css-media-query/css-media-query.test.ts which
            // asserts `cssText` preserves `max-width: 768px`.
            cssTarget: ['chrome111', 'edge111', 'firefox114', 'safari15'],
            // Direct Vite to write build output under text's static asset
            // layout so the on-disk path mirrors the emitted URL path:
            //   - empty `assetPrefix`     → `_text/static/`
            //   - path prefix (`/cdn`)    → `cdn/_text/static/`
            //   - absolute URL            → `_text/static/` (CDN serves it
            //                                directly via renderBuiltUrl)
            //
            // Pair with `experimental.renderBuiltUrl` below: the on-disk
            // layout matches the URL path so the Cloudflare ASSETS binding
            // and any static file server can resolve
            // `<assetPrefix?>/_text/static/...` requests directly, and
            // misses naturally fall through as plain-text 404s.
            assetsDir: resolveAssetsDir(textConfig.assetPrefix ?? ''),
            ...withBuildBundlerOptions(viteMajorVersion, {
              // Suppress "Module level directives cause errors when bundled"
              // warnings for "use client" / "use server" directives. Our shims
              // and third-party libraries legitimately use these directives;
              // they are handled by the RSC plugin and are harmless in the
              // final bundle. We preserve any user-supplied onwarn so custom
              // warning handling is not lost.
              onwarn: (() => {
                const userOnwarn = getBuildBundlerOptions(config.build)?.onwarn
                return (warning, defaultHandler) => {
                  if (
                    warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
                    (warning.message?.includes('"use client"') ||
                      warning.message?.includes('"use server"'))
                  ) {
                    return
                  }
                  // Dynamic route pages that don't export generateStaticParams
                  // produce IMPORT_IS_UNDEFINED warnings because the virtual RSC
                  // entry unconditionally references mod?.generateStaticParams for
                  // every dynamic route. The ?. guards the access safely at runtime;
                  // suppress the build-time noise.
                  if (
                    warning.code === 'IMPORT_IS_UNDEFINED' &&
                    warning.message?.includes('generateStaticParams')
                  ) {
                    return
                  }
                  // proxy.ts / middleware.ts may export either a named handler
                  // or default export. The generated virtual entries probe both
                  // forms and validate at runtime, which can trigger noisy
                  // IMPORT_IS_UNDEFINED warnings when only one form exists.
                  // Match any file extension because findMiddlewareFile() scans
                  // all configured pageExtensions, not just .ts/.js.
                  if (
                    warning.code === 'IMPORT_IS_UNDEFINED' &&
                    /Import `(?:default|proxy|middleware)` will always be undefined/.test(
                      warning.message ?? '',
                    ) &&
                    /\b(?:proxy|middleware)\.\w+\b/.test(warning.message ?? '') &&
                    (warning.message?.includes('virtual:text-rsc-entry') ||
                      warning.message?.includes('virtual:text-server-entry'))
                  ) {
                    return
                  }
                  if (userOnwarn) {
                    userOnwarn(warning, defaultHandler)
                  } else {
                    defaultHandler(warning)
                  }
                }
              })(),
              // Enable aggressive tree-shaking for client builds.
              // See getClientTreeshakeConfigForVite JSDoc for rationale.
              // Only apply globally for standalone client builds (Pages Router
              // CLI). For multi-environment builds (App Router, Cloudflare),
              // treeshake is set per-environment on the client env below to
              // avoid leaking into RSC/SSR environments where
              // moduleSideEffects: 'no-external' could drop server packages
              // that rely on module-level side effects.
              ...(!isSSR && !isMultiEnv
                ? {
                    treeshake: getClientTreeshakeConfigForVite(viteMajorVersion),
                  }
                : {}),
              // Code-split client bundles: separate framework,
              // text runtime (shims), and vendor packages into their own
              // chunks so pages only load the JS they need.
              // Only apply globally for standalone client builds (CLI Pages
              // Router). For multi-environment builds (App Router, Cloudflare),
              // manualChunks is set per-environment on the client env below
              // to avoid leaking into RSC/SSR environments.
              ...(!isSSR && !isMultiEnv
                ? { output: getClientOutputConfigForVite(viteMajorVersion) }
                : {}),
            }),
          },
          // Let OPTIONS requests pass through Vite's CORS middleware to our
          // route handlers so they can set the Allow header and run user-defined
          // OPTIONS handlers. Without this, Vite's CORS middleware responds to
          // OPTIONS with a 204 before the request reaches text's handler.
          // Keep Vite's default restrictive origin policy by explicitly
          // setting it. Without the `origin` field, `preflightContinue: true`
          // would override Vite's default and allow any origin.
          server: {
            cors: {
              preflightContinue: true,
              origin: /^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/,
            },
          },
          // Configure SSR transform behaviour for Node targets.
          // - `external`: RSC compat packages are loaded natively by Node (CJS)
          //   rather than through Vite's ESM evaluator.
          // - `noExternal: true`: force everything else through Vite's
          //   transform pipeline so non-JS imports (CSS, images) from
          //   node_modules don't hit Node's native ESM loader.
          //   Any user-provided `ssr.noExternal` is intentionally superseded
          //   by this setting; only `ssr.external` entries escape Vite's transform.
          // Skip when targeting bundled runtimes (Cloudflare/Nitro bundle everything).
          // Also skip `noExternal: true` when the user opted into
          // `ssr.external: true` — they've explicitly asked for everything
          // external, and forcing `noExternal: true` here leaks down into
          // `environments.ssr.resolve.noExternal` (Vite uses top-level
          // `ssr.*` as the default for the per-env resolve config), which
          // makes Vite bundle RSC compat packages despite the user's intent
          // and produces the duplicate RSC compat crashes documented in #1103.
          // This also resolves extensionless-import issues in packages like
          // `validator` (see #189) by routing them through Vite's resolver.
          ...(hasCloudflarePlugin || hasNitroPlugin
            ? {}
            : config.ssr?.external === true
              ? { ssr: { external: true as const } }
              : {
                  ssr: {
                    external: compactStringEntries([
                      ...RSC_RUE_NODE_EXTERNALS,
                      'ipaddr.js',
                      ...RUE_NODE_RUNTIME_EXTERNALS,
                    ]),
                    noExternal: true,
                  },
                }),
          resolve: {
            // Materialize simple tsconfig/jsconfig path aliases into resolve.alias
            // so Vite can transform import.meta.glob("@/...") and import(`@/...`).
            alias: {
              '@rue-js/server-renderer': path.resolve(
                __dirname,
                '../../server-renderer/src/index.ts',
              ),
              ...tsconfigPathAliases,
              ...localFileDependencyAliases,
              ...textConfig.aliases,
              ...textShimMap,
            },
            // Dedupe Rue packages by default. RSC compat entries are only
            // needed while App Router/RSC or the explicit compatibility transform path
            // is active.
            dedupe: [
              ...RUE_FRAMEWORK_DEDUPE,
              ...(shouldDedupeRscCompat ? compactStringEntries(RSC_RUE_DEDUPE) : []),
            ],
            ...(shouldEnableNativeTsconfigPaths ? { tsconfigPaths: true } : {}),
          },
          // NOTE: top-level optimizeDeps is now set below (after capturing
          // incoming values from earlier plugins) so both Pages Router and
          // App Router builds merge correctly.
          // Define env vars for client bundle
          define: defines,
          // Set base path if configured.
          //
          // `base` controls both the dev server URL prefix and the default
          // asset URL prefix in production. Routes live under `basePath`,
          // so we anchor `base` there. Asset URLs are then re-prefixed with
          // `assetPrefix` (when configured) via `experimental.renderBuiltUrl`
          // below — that keeps `basePath` and `assetPrefix` independent, as
          // they are in Text.js.
          ...(textConfig.basePath ? { base: textConfig.basePath + '/' } : {}),
          // When `assetPrefix` is configured, override Vite's default
          // `assetsURL = base + url` behaviour so emitted JS/CSS/asset URLs
          // start with the configured asset prefix and use text's
          // `_text/static/` directory convention. We also write
          // assets to disk under that same path layout (via `build.assetsDir`
          // above) so the Cloudflare ASSETS binding and any static file
          // server can serve them without runtime rewrites.
          //
          // When `assetPrefix` is empty, Vite's default `base + url`
          // composition already produces the correct `/_text/static/...`
          // URLs because `build.assetsDir` is `_text/static` — so this
          // override is only needed for the configured cases.
          //
          // See packages/text/src/utils/asset-prefix.ts for the helpers
          // and Text.js docs for the contract:
          // https://textjs.org/docs/app/api-reference/config/text-config-js/assetPrefix
          ...(textConfig.assetPrefix
            ? {
                experimental: {
                  renderBuiltUrl: (filename: string) => {
                    // `filename` is the bundler-relative output path,
                    // e.g. `_text/static/chunk-abc.js` or
                    // `<assetPrefix-pathname>/_text/static/chunk-abc.js`
                    // when assetPrefix is a path prefix. Re-anchor it under
                    // the configured asset URL prefix.
                    const urlPrefix = resolveAssetUrlPrefix(textConfig.assetPrefix)
                    // Strip any leading on-disk `assetsDir` segment so we
                    // don't double-prefix when the on-disk layout already
                    // mirrors the URL path.
                    const onDiskDir = resolveAssetsDir(textConfig.assetPrefix)
                    const dirPrefix = onDiskDir + '/'
                    const stripped = filename.startsWith(dirPrefix)
                      ? filename.slice(dirPrefix.length)
                      : filename.startsWith(`${ASSET_PREFIX_URL_DIR}/`)
                        ? filename.slice(ASSET_PREFIX_URL_DIR.length + 1)
                        : filename
                    return urlPrefix + stripped
                  },
                },
              }
            : {}),
          // Inject resolved PostCSS plugins (when found) and any
          // sassOptions translated from text.config. Both end up on
          // `css.*`, so we merge them into a single `css` object rather
          // than emitting `{ css: ... }` twice (the second would clobber
          // the first).
          ...(postcssOverride || sassPreprocessorOptions
            ? {
                css: {
                  ...(postcssOverride ? { postcss: postcssOverride } : {}),
                  ...(sassPreprocessorOptions
                    ? {
                        preprocessorOptions: {
                          // Apply the same options to both `.scss` and `.sass`
                          // entry points. Text.js's sass-loader rule matches
                          // /\.s[ca]ss$/, so a single `sassOptions` block
                          // covers both syntaxes there too.
                          scss: sassPreprocessorOptions,
                          sass: sassPreprocessorOptions,
                        },
                      }
                    : {}),
                },
              }
            : {}),
        }

        // Collect user-provided ssr.external so we can propagate it into
        // both the RSC and SSR environment configs. Vite's `ssr.*` config
        // only applies to the default `ssr` environment, not custom ones
        // like `rsc`. Native addon packages (e.g. better-sqlite3) listed
        // in ssr.external must be externalized from ALL server environments.
        // Vite's SSROptions.external is `string[] | true`; handle both forms.
        //
        // Also merge in `serverExternalPackages` from text.config (and the
        // legacy `experimental.serverComponentsExternalPackages` alias). These
        // are packages that Text.js intentionally skips bundling and loads
        // natively — e.g. packages that import Node-specific entry points via
        // conditional exports (like `file-type` which exports `fileTypeFromFile`
        // only from its `node` condition, not from the universal `default` one).
        // Without externalizing them, Vite's optimizer picks the wrong export
        // condition and the build fails with MISSING_EXPORT errors.
        const textServerExternal: string[] = textConfig?.serverExternalPackages ?? []
        const userSsrExternal: string[] | true = Array.isArray(config.ssr?.external)
          ? [...config.ssr.external, ...textServerExternal]
          : config.ssr?.external === true
            ? true
            : textServerExternal

        // Capture top-level optimizeDeps populated by earlier plugins
        // (e.g. @lingui/vite-plugin) so we merge rather than overwrite.
        // Moved above the hasAppDir branch so both Pages Router and App
        // Router code paths can use these values.
        const incomingExclude: string[] =
          (config.optimizeDeps?.exclude as string[] | undefined) ?? []
        const incomingInclude: string[] =
          (config.optimizeDeps?.include as string[] | undefined) ?? []

        // Merge incoming excludes into the top-level optimizeDeps so
        // Pages Router builds (which don't set per-environment configs)
        // also preserve entries from earlier plugins.
        // Build a rolldown plugin for shims resolved via resolveId instead
        // of resolve.alias. The dep optimizer's bundler uses its own
        // rolldown pipeline (not the Vite plugin pipeline), so it needs
        // these aliases injected separately. See #834.
        const depOptimizeAliasPlugin = {
          name: 'text:dep-optimize-alias',
          resolveId(id: string) {
            const shimBase = _rscConditionShims.get(id)
            if (shimBase !== undefined) {
              return resolveShimModulePath(shimsDir, shimBase)
            }
          },
        }
        viteConfig.optimizeDeps = {
          // @tailwindcss/oxide contains native .node bindings that Rolldown cannot process
          exclude: mergeOptimizeDepsExclude(incomingExclude, TEXT_OPTIMIZE_DEPS_EXCLUDE, [
            '@tailwindcss/oxide',
            'text-intl',
            'text-intl/server',
          ]),
          ...(incomingInclude.length > 0 ? { include: incomingInclude } : {}),
          rolldownOptions: { plugins: [depOptimizeAliasPlugin] },
        }
        const pagesOptimizeEntries = !hasAppDir
          ? [
              ...(hasPagesDir ? [toRelativeFileEntry(root, pagesDir) + '/**/*.{tsx,ts,jsx}'] : []),
              ...[instrumentationPath, instrumentationClientPath].flatMap(entry =>
                entry ? [toRelativeFileEntry(root, entry)] : [],
              ),
            ]
          : []

        // If app/ directory exists, configure RSC environments
        if (hasAppDir) {
          // Compute optimizeDeps.entries so Vite discovers server-side
          // dependencies at startup instead of on first request. Without
          // this, deps imported in rsc/ssr environments are found lazily,
          // causing re-optimisation cascades and runtime errors (e.g.
          // "Invalid hook call" from duplicate Rue instances).
          // The entries must be relative to the project root.
          const relAppDir = path.relative(root, appDir)
          // Keep plain .js files out of Vite's dependency scanner: it parses
          // entries before text:jsx-in-js can compile JSX-in-JS, so Text-style
          // `.js` route files with JSX would fail the scan. They are still
          // transformed correctly when requested.
          const appEntries = [`${relAppDir}/**/*.{tsx,ts,jsx}`]
          const explicitInstrumentationEntries = [
            instrumentationPath,
            instrumentationClientPath,
          ].flatMap(entry => (entry ? [toRelativeFileEntry(root, entry)] : []))
          const optimizeEntries = [...new Set([...appEntries, ...explicitInstrumentationEntries])]

          viteConfig.environments = {
            rsc: {
              ...(hasCloudflarePlugin || hasNitroPlugin
                ? {}
                : {
                    resolve: {
                      // Externalize native/heavy packages so the RSC environment
                      // loads them natively via Node rather than through Vite's
                      // ESM module evaluator (which can't handle native addons).
                      // Note: Do NOT externalize compat runtime packages here — they
                      // must be bundled with the server-component condition for RSC.
                      // Skip when targeting bundled runtimes (Cloudflare/Nitro).
                      external:
                        userSsrExternal === true
                          ? true
                          : [
                              'satori',
                              '@resvg/resvg-js',
                              'yoga-wasm-web',
                              ...userSsrExternal,
                              ...RUE_NODE_RUNTIME_EXTERNALS,
                            ],
                      // Force all node_modules through Vite's transform pipeline
                      // so non-JS imports (CSS, images) don't hit Node's native
                      // ESM loader. Matches Text.js behavior of bundling everything.
                      // Packages in `external` above take precedence per Vite rules.
                      // When user sets `ssr.external: true`, skip noExternal since
                      // everything is already externalized.
                      ...(userSsrExternal === true ? {} : { noExternal: true as const }),
                    },
                  }),
              optimizeDeps: {
                exclude: mergeOptimizeDepsExclude(
                  incomingExclude,
                  TEXT_OPTIMIZE_DEPS_EXCLUDE,
                  RSC_RUE_OPTIMIZE_DEPS_EXCLUDE,
                  ['text-intl', 'text-intl/server'],
                  RUE_NODE_RUNTIME_EXTERNALS,
                ),
                entries: optimizeEntries,
              },
              build: {
                outDir: options.rscOutDir ?? 'dist/server',
                ...withBuildBundlerOptions(viteMajorVersion, {
                  input: { index: VIRTUAL_RSC_ENTRY },
                }),
              },
            },
            ssr: {
              ...(hasCloudflarePlugin || hasNitroPlugin
                ? {}
                : {
                    resolve: {
                      external:
                        userSsrExternal === true
                          ? true
                          : [...userSsrExternal, 'ipaddr.js', ...RUE_NODE_RUNTIME_EXTERNALS],
                      // Force all node_modules through Vite's transform pipeline
                      // so non-JS imports (CSS, images) don't hit Node's native
                      // ESM loader. Matches Text.js behavior of bundling everything.
                      // When user sets `ssr.external: true`, skip noExternal since
                      // everything is already externalized.
                      ...(userSsrExternal === true ? {} : { noExternal: true as const }),
                    },
                  }),
              optimizeDeps: {
                // When userSsrExternal === true, exclude Rue from the SSR
                // optimizer so plugin-rsc's crawlFrameworkPkgs doesn't pre-bundle
                // a duplicate Rue copy into deps_ssr/. The SSR env loads Rue
                // via Node's resolver instead, sharing one instance with the
                // renderer and any 'use client' module SSR'd through it. See
                // https://github.com/cloudflare/vinext/issues/1103.
                //
                // `ipaddr.js` is imported by the text/image client shim for
                // server-side private-IP validation. We externalize it on Node
                // SSR via resolve.external above; excluding it from the dep
                // optimizer prevents Vite from pre-bundling it on first request
                // (and the resulting "new dependencies optimized" full reload).
                // On bundled runtimes (Cloudflare/Nitro) the runtime build
                // bundles it anyway, so excluding it from the dev optimizer
                // is still correct — it just defers handling to the runtime
                // resolver instead of the SSR pre-bundle step.
                exclude: mergeOptimizeDepsExclude(
                  incomingExclude,
                  TEXT_OPTIMIZE_DEPS_EXCLUDE,
                  ['ipaddr.js', RSC_RUE_SERVER_DOM_CLIENT_EDGE].filter(Boolean),
                  RUE_NODE_RUNTIME_EXTERNALS,
                  userSsrExternal === true
                    ? compactStringEntries(RSC_RUE_SSR_EXTERNAL_ENTRIES)
                    : [],
                ),
                entries: optimizeEntries,
              },
              build: {
                outDir: options.ssrOutDir ?? 'dist/server/ssr',
                ...withBuildBundlerOptions(viteMajorVersion, {
                  input: { index: VIRTUAL_APP_SSR_ENTRY },
                }),
              },
            },
            client: {
              // Explicitly mark as client consumer so other plugins (e.g. Nitro)
              // can detect this during configEnvironment hooks — before Vite
              // applies the default consumer based on environment name.
              // Without this, Nitro's configEnvironment creates a server-side
              // service for the client environment, causing virtual module
              // imports to leak to Node's native ESM loader (ERR_UNSUPPORTED_ESM_URL_SCHEME).
              consumer: 'client',
              optimizeDeps: {
                // Exclude server-external packages from the client dep optimizer.
                // These packages are server-only by design (listed in text.config's
                // `serverExternalPackages`). If the client optimizer crawls into
                // them through app/ entries, it will use browser export conditions
                // and pick the wrong conditional export (e.g. `file-type` exports
                // `fileTypeFromFile` only from its `node` condition via `index.js`,
                // but the browser optimizer resolves to `core.js` which lacks it,
                // causing MISSING_EXPORT build failures).
                exclude: mergeOptimizeDepsExclude(
                  incomingExclude,
                  TEXT_OPTIMIZE_DEPS_EXCLUDE,
                  textServerExternal,
                ),
                // Crawl app/ source files up front so client-only deps imported
                // by user components are discovered during startup instead of
                // triggering a late re-optimisation + full page reload.
                entries: optimizeEntries,
                // RSC compatibility packages aren't crawled from app/ source
                // files, so pre-include them to avoid late discovery (#25).
                include: [
                  ...new Set(
                    compactStringEntries([...incomingInclude, ...RSC_RUE_CLIENT_OPTIMIZE_INCLUDE]),
                  ),
                ],
              },
              build: {
                // When targeting Cloudflare Workers, enable manifest generation
                // so the text:cloudflare-build closeBundle hook can read the
                // client build manifest, compute lazy chunks (only reachable
                // via dynamic imports), and inject __TEXT_LAZY_CHUNKS__ into
                // the worker entry. Without this, all chunks are modulepreloaded
                // on every page — defeating code-splitting for lazy dynamic
                // component boundaries.
                ...(hasCloudflarePlugin ? { manifest: true } : {}),
                ...withBuildBundlerOptions(viteMajorVersion, {
                  input: { index: VIRTUAL_APP_BROWSER_ENTRY },
                  output: getClientOutputConfigForVite(viteMajorVersion),
                  treeshake: getClientTreeshakeConfigForVite(viteMajorVersion),
                }),
              },
            },
          }
        } else if (hasCloudflarePlugin) {
          // Pages Router on Cloudflare Workers: add a client environment
          // so the multi-environment build produces client JS bundles
          // alongside the worker. Without this, only the worker is built
          // and there's no client-side hydration.
          viteConfig.environments = {
            client: {
              consumer: 'client',
              optimizeDeps:
                pagesOptimizeEntries.length > 0 ? { entries: pagesOptimizeEntries } : undefined,
              build: {
                manifest: true,
                ssrManifest: true,
                ...withBuildBundlerOptions(viteMajorVersion, {
                  input: { index: VIRTUAL_CLIENT_ENTRY },
                  output: getClientOutputConfigForVite(viteMajorVersion),
                  treeshake: getClientTreeshakeConfigForVite(viteMajorVersion),
                }),
              },
            },
          }
        } else if (!isSSR && !getBuildBundlerOptions(config.build)?.input) {
          // Plain Pages Router (Node): define client + ssr environments so
          // createBuilder + buildApp() produces both dist/client and
          // dist/server/entry.js. Without this, buildApp() only sees the
          // default client environment and never builds the server entry.
          // Guard with !isSSR and no explicit input so legacy vite.build()
          // calls that specify their own input (tests, hybrid build step)
          // still work via the single-build path — injecting environments
          // alongside an explicit build input conflicts with the caller's intent.
          viteConfig.environments = {
            client: {
              consumer: 'client',
              optimizeDeps:
                pagesOptimizeEntries.length > 0 ? { entries: pagesOptimizeEntries } : undefined,
              build: {
                outDir: 'dist/client',
                manifest: true,
                ssrManifest: true,
                ...withBuildBundlerOptions(viteMajorVersion, {
                  input: { index: VIRTUAL_CLIENT_ENTRY },
                  output: getClientOutputConfigForVite(viteMajorVersion),
                  treeshake: getClientTreeshakeConfigForVite(viteMajorVersion),
                }),
              },
            },
            ssr: {
              resolve: {
                external: compactStringEntries([
                  ...RSC_RUE_NODE_EXTERNALS,
                  'ipaddr.js',
                  ...RUE_NODE_RUNTIME_EXTERNALS,
                ]),
                noExternal: true as const,
              },
              optimizeDeps: {
                // `ipaddr.js` is imported by the text/image shim for
                // private-IP validation and is externalized via
                // resolve.external above. Excluding it from the SSR dep
                // optimizer avoids the "new dependencies optimized" full
                // reload the first time a Pages Router page renders an
                // <Image>.
                exclude: ['ipaddr.js'],
              },
              build: {
                outDir: 'dist/server',
                ...withBuildBundlerOptions(viteMajorVersion, {
                  input: { index: VIRTUAL_SERVER_ENTRY },
                  output: {
                    entryFileNames: 'entry.js',
                  },
                }),
              },
            },
          }
        }

        if (pagesOptimizeEntries.length > 0 && !hasCloudflarePlugin) {
          viteConfig.optimizeDeps = {
            ...viteConfig.optimizeDeps,
            entries: pagesOptimizeEntries,
          }
        }

        return viteConfig
      },

      configResolved(config) {
        isBuildCommand = config.command === 'build'
        if (hasAppDir) {
          const ssrOptimizeDeps = config.environments?.ssr?.optimizeDeps
          if (ssrOptimizeDeps) {
            const removedSsrRuntimeEntries = Array.isArray(ssrOptimizeDeps.include)
              ? ssrOptimizeDeps.include.filter(isRueCompatRscRuntimeOptimizeDep)
              : []
            if (Array.isArray(ssrOptimizeDeps.include)) {
              ssrOptimizeDeps.include = ssrOptimizeDeps.include.filter(
                entry => !isRueCompatRscRuntimeOptimizeDep(entry),
              )
            }
            ssrOptimizeDeps.exclude = mergeOptimizeDepsExclude(
              (ssrOptimizeDeps.exclude as string[] | undefined) ?? [],
              removedSsrRuntimeEntries,
              [RSC_RUE_SERVER_DOM_CLIENT_EDGE].filter(Boolean),
            )
          }

          const rscEnv = config.environments?.rsc
          const rscOptimizeDeps = rscEnv?.optimizeDeps
          if (rscOptimizeDeps) {
            const removedRscRuntimeEntries = Array.isArray(rscOptimizeDeps.include)
              ? rscOptimizeDeps.include.filter(isRueCompatRscRuntimeOptimizeDep)
              : []
            if (Array.isArray(rscOptimizeDeps.include)) {
              const rscCompatOptimizeDepsExclude = new Set(RSC_RUE_OPTIMIZE_DEPS_EXCLUDE)
              rscOptimizeDeps.include = rscOptimizeDeps.include.filter(
                entry =>
                  !rscCompatOptimizeDepsExclude.has(entry) &&
                  !isRueCompatRscRuntimeOptimizeDep(entry),
              )
            }
            rscOptimizeDeps.exclude = mergeOptimizeDepsExclude(
              (rscOptimizeDeps.exclude as string[] | undefined) ?? [],
              removedRscRuntimeEntries,
              RSC_RUE_OPTIMIZE_DEPS_EXCLUDE,
            )
          }
        }

        // When the user sets `ssr.external: true`, strip Rue entries from
        // `environments.ssr.resolve.noExternal`. @vitejs/plugin-rsc populates
        // this list via crawlFrameworkPkgs, but `noExternal` overrides
        // `external: true` for the listed packages. The result is that the compat
        // runtime gets bundled by Vite's transform pipeline despite the user opting
        // for full externalization, producing a second runtime module record
        // alongside the Node-loaded one used by externalized callers (text's
        // runtime). 'use client' modules SSR'd through the bundled compat env
        // then crash with `Invalid hook call` / `useContext null`. Stripping
        // these entries forces the SSR env to load the compat runtime via Node
        // externals, matching the renderer runtime. See #1103.
        if (hasAppDir) {
          const ssrEnv = config.environments?.ssr
          if (ssrEnv?.resolve?.external === true && Array.isArray(ssrEnv.resolve.noExternal)) {
            // Strip compat runtime entries that @vitejs/plugin-rsc auto-adds to
            // `environments.ssr.resolve.noExternal` via crawlFrameworkPkgs.
            // With `ssr.external: true`, the SSR env loads the runtime via Node's
            // resolver, but a removed runtime noExternal entry overrides that for
            // the listed packages — Vite bundles the compat runtime anyway, producing a
            // second module record alongside the Node-loaded one used by
            // externalized callers (text's runtime). 'use client' modules
            // SSR'd through that env then crash with `useContext null` /
            // `Invalid hook call`. Stripping these entries forces the SSR
            // env to load the compat runtime via Node externals so the renderer
            // and runtime share a single module instance. See #1103.
            ssrEnv.resolve.noExternal = ssrEnv.resolve.noExternal.filter(
              entry => typeof entry !== 'string' || !RSC_RUE_SSR_EXTERNAL_ENTRIES.includes(entry),
            )
          }
        }

        // Detect double Rue plugin registration. When text auto-injects
        // @rue-js/vite-plugin-rue AND the user also registers it manually, the
        // JSX/TSX transform pipeline runs twice.
        if (ruePlugin) {
          const ruePluginCount = config.plugins.filter(
            (p: unknown) =>
              p && typeof p === 'object' && 'name' in p && p.name === '@rue-js/vite-plugin-rue',
          ).length
          if (ruePluginCount > 1) {
            throw new Error(
              '[text] Duplicate @rue-js/vite-plugin-rue detected.\n' +
                '         text auto-registers @rue-js/vite-plugin-rue by default.\n' +
                '         Your config also registers it manually, which duplicates Rue transforms.\n\n' +
                '         Fix: remove the explicit VitePluginRue() call from your plugins array.\n' +
                '         Or: pass rue: false to text() if you want to configure VitePluginRue() yourself.',
            )
          }
        }

        // Detect double RSC plugin registration. text owns the App Router RSC
        // path now, so a manual @rue-js/rsc registration conflicts.
        if (earlyAppDirExists && autoRsc) {
          // Count top-level RSC plugins (name === "rsc") — each call to
          // the rsc() factory produces exactly one plugin with this name.
          const rscRootPlugins = config.plugins.filter(
            (p: unknown) => p && typeof p === 'object' && 'name' in p && p.name === 'rsc',
          )
          if (rscRootPlugins.length > 1) {
            throw new Error(
              '[text] Duplicate @rue-js/rsc detected.\n' +
                '         text auto-registers @rue-js/rsc when app/ is detected.\n' +
                '         Your config also registers @rue-js/rsc manually, which duplicates the RSC pipeline.\n\n' +
                '         Fix: remove the explicit rsc() call from your plugins array.\n' +
                '         Or: pass rsc: false to text() if you want to configure rsc() yourself.',
            )
          }
        }

        // Fail the build when targeting Cloudflare Workers without the
        // cloudflare() plugin. Without it, wrangler's esbuild can't resolve
        // virtual:text-rsc-entry and produces a cryptic error. (#325)
        if (
          config.command === 'build' &&
          !hasCloudflarePlugin &&
          !hasNitroPlugin &&
          hasWranglerConfig(root) &&
          !options.disableAppRouter
        ) {
          throw new Error(
            formatMissingCloudflarePluginError({
              isAppRouter: hasAppDir,
              configFile: config.configFile,
            }),
          )
        }
      },

      resolveId: {
        // Hook filter: only invoke JS for handled Text/Text compatibility modules.
        // Matches "text/navigation", "text/router.js", "virtual:text-rsc-entry",
        // direct @vercel/og imports in metadata routes, and \0-prefixed
        // re-imports from @vitejs/plugin-rsc.
        filter: {
          id: /(?:text\/|virtual:text-|^r(?:eact|ue)$|^text-intl(?:\/server)?$|^@vercel\/og(?:\.js)?$|^@rue-js\/(?:(?:rue|runtime)(?:\/(?:internal(?:\/[a-z-]+)?|server-renderer|server))?|server-renderer)$|(?:^|[/\\])runtime[/\\]index\.js$|packages\/(?:rue|runtime|server-renderer)\/(?:src|dist)\/(?:index|internal|server-renderer|server|compiler-runtime\/entries\/[a-z-]+)\.[jt]s$)/,
        },
        handler(id, importer) {
          // Strip \0 prefix if present — @vitejs/plugin-rsc's generated
          // browser entry imports our virtual module using the already-resolved
          // ID (with \0 prefix). We need to re-resolve it so the client
          // environment's import-analysis can find it.
          const cleanId = id.startsWith('\0') ? id.slice(1) : id

          if (isVercelOgImport(cleanId) && !isTextOgShimImporter(importer)) {
            return resolveShimModulePath(_shimsDir, 'og')
          }

          const rscConditionShim = _rscConditionShims.get(cleanId)
          if (this.environment?.name === 'rsc' && rscConditionShim !== undefined) {
            return resolveShimModulePath(_shimsDir, `${rscConditionShim}.rsc`)
          }

          if (
            isBuildCommand &&
            this.environment?.name !== 'client' &&
            RUE_NODE_RUNTIME_EXTERNALS.includes(cleanId)
          ) {
            const runtimeAlias = rueServerRuntimeAliases.get(cleanId)
            if (runtimeAlias) return { id: runtimeAlias, external: true }
          }

          if (this.environment?.name === 'client') {
            const relativeId =
              cleanId.startsWith('.') && importer
                ? canonicalize(path.resolve(path.dirname(importer.split('?')[0]), cleanId))
                : null
            const runtimeAlias =
              rueClientRuntimeAliases.get(cleanId) ??
              (relativeId ? rueClientRuntimeAliases.get(relativeId) : undefined)
            if (runtimeAlias) return runtimeAlias
          }

          if (
            this.environment?.name !== 'client' &&
            cleanId === REMOVED_JSX_RUNTIME_PACKAGE &&
            isTextIntlSharedUseImporter(importer)
          ) {
            return resolveShimModulePath(_shimsDir, 'hooks-adapter')
          }

          if (this.environment?.name !== 'client' && !hasCloudflarePlugin && !hasNitroPlugin) {
            const runtimeAlias =
              rueServerRuntimeAliases.get(normalizeRueServerRuntimeId(cleanId)) ??
              (!hasAppDir || isPagesServerRuntimeImporter(importer)
                ? pagesServerRuntimeAliases.get(cleanId)
                : undefined)
            if (runtimeAlias) return { id: runtimeAlias, external: true }
          }

          // Pages Router virtual modules
          if (cleanId === VIRTUAL_SERVER_ENTRY) return RESOLVED_SERVER_ENTRY
          if (cleanId === VIRTUAL_CLIENT_ENTRY) return RESOLVED_CLIENT_ENTRY
          if (
            cleanId.endsWith('/' + VIRTUAL_SERVER_ENTRY) ||
            cleanId.endsWith('\\' + VIRTUAL_SERVER_ENTRY)
          ) {
            return RESOLVED_SERVER_ENTRY
          }
          if (
            cleanId.endsWith('/' + VIRTUAL_CLIENT_ENTRY) ||
            cleanId.endsWith('\\' + VIRTUAL_CLIENT_ENTRY)
          ) {
            return RESOLVED_CLIENT_ENTRY
          }
          // App Router virtual modules
          if (cleanId === VIRTUAL_RSC_ENTRY) return RESOLVED_RSC_ENTRY
          if (cleanId === VIRTUAL_APP_SSR_ENTRY) return RESOLVED_APP_SSR_ENTRY
          if (cleanId === VIRTUAL_APP_BROWSER_ENTRY) return RESOLVED_APP_BROWSER_ENTRY
          if (cleanId === 'text/root-params' || cleanId === 'text/root-params.js') {
            return RESOLVED_ROOT_PARAMS
          }
          if (cleanId.startsWith(VIRTUAL_GOOGLE_FONTS + '?')) {
            return RESOLVED_VIRTUAL_GOOGLE_FONTS + cleanId.slice(VIRTUAL_GOOGLE_FONTS.length)
          }
          if (
            cleanId.endsWith('/' + VIRTUAL_RSC_ENTRY) ||
            cleanId.endsWith('\\' + VIRTUAL_RSC_ENTRY)
          ) {
            return RESOLVED_RSC_ENTRY
          }
          if (
            cleanId.endsWith('/' + VIRTUAL_APP_SSR_ENTRY) ||
            cleanId.endsWith('\\' + VIRTUAL_APP_SSR_ENTRY)
          ) {
            return RESOLVED_APP_SSR_ENTRY
          }
          if (
            cleanId.endsWith('/' + VIRTUAL_APP_BROWSER_ENTRY) ||
            cleanId.endsWith('\\' + VIRTUAL_APP_BROWSER_ENTRY)
          ) {
            return RESOLVED_APP_BROWSER_ENTRY
          }
          if (
            cleanId.includes('/' + VIRTUAL_GOOGLE_FONTS + '?') ||
            cleanId.includes('\\' + VIRTUAL_GOOGLE_FONTS + '?')
          ) {
            const queryIndex = cleanId.indexOf(VIRTUAL_GOOGLE_FONTS + '?')
            return (
              RESOLVED_VIRTUAL_GOOGLE_FONTS +
              cleanId.slice(queryIndex + VIRTUAL_GOOGLE_FONTS.length)
            )
          }

          // Shims with RSC condition variants — resolve per-environment.
          // These are NOT in resolve.alias (Vite's alias plugin runs
          // before enforce:"pre" plugins and can't be overridden).
          // See https://github.com/cloudflare/vinext/issues/834
          if (rscConditionShim !== undefined) {
            const shimName =
              this.environment?.name === 'rsc' ? `${rscConditionShim}.rsc` : rscConditionShim
            return resolveShimModulePath(_shimsDir, shimName)
          }
        },
      },

      async load(id) {
        if (isTextIntlSharedUseModuleId(id)) {
          return `export { use as default } from ${JSON.stringify(resolveShimModulePath(_shimsDir, 'hooks-adapter'))};`
        }

        // Pages Router virtual modules
        if (id === RESOLVED_SERVER_ENTRY) {
          return await generateServerEntry()
        }
        if (id === RESOLVED_CLIENT_ENTRY) {
          return await generateClientEntry()
        }
        // App Router virtual modules
        if (id === RESOLVED_RSC_ENTRY && hasAppDir) {
          const routes = await appRouter(appDir, textConfig?.pageExtensions, fileMatcher)
          const metaRoutes = scanMetadataFiles(appDir)
          // Check for global-error.tsx at app root
          const globalErrorPath = findFileWithExts(appDir, 'global-error', fileMatcher)
          // Check for global-not-found.tsx at app root (Text.js 16+ feature)
          // When present, this file replaces the root layout when serving a
          // route-miss 404. The file is responsible for emitting its own
          // <html> and <body> tags (similar to global-error.tsx).
          // See https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/global-not-found
          const globalNotFoundPath = findFileWithExts(appDir, 'global-not-found', fileMatcher)
          // Collect Layer 1 (segment config) classifications for all layouts.
          // Layer 2 (module graph) runs later in generateBundle once Rollup's
          // module info is available.
          // Invariant: rscClassificationManifest must be built from the same
          // `routes` value passed to generateRscEntry below so that layout
          // indices in the manifest correspond 1:1 to the route.layouts arrays
          // used during codegen. generateBundle clears this after patching.
          rscClassificationManifest = collectRouteClassificationManifest(routes)
          return generateRscEntry(
            appDir,
            routes,
            middlewarePath,
            metaRoutes,
            globalErrorPath,
            textConfig?.basePath,
            textConfig?.trailingSlash,
            {
              redirects: textConfig?.redirects,
              rewrites: textConfig?.rewrites,
              headers: textConfig?.headers,
              allowedOrigins: textConfig?.serverActionsAllowedOrigins,
              allowedDevOrigins: textConfig?.allowedDevOrigins,
              bodySizeLimit: textConfig?.serverActionsBodySizeLimit,
              htmlLimitedBots: textConfig?.htmlLimitedBots,
              assetPrefix: textConfig?.assetPrefix,
              expireTime: textConfig?.expireTime,
              i18n: textConfig?.i18n,
              hasPagesDir,
              publicFiles: scanPublicFileRoutes(root),
              globalNotFoundPath,
              draftModeSecret,
            },
            instrumentationPath,
          )
        }
        if (id === RESOLVED_ROOT_PARAMS) {
          const routes = hasAppDir
            ? await appRouter(appDir, textConfig?.pageExtensions, fileMatcher)
            : []
          return generateRootParamsModule(routes.flatMap(route => route.rootParamNames ?? []))
        }
        if (id === RESOLVED_APP_SSR_ENTRY && hasAppDir) {
          return generateSsrEntry(hasPagesDir)
        }
        if (id === RESOLVED_APP_BROWSER_ENTRY && hasAppDir) {
          const graph = await appRouteGraph(appDir, textConfig?.pageExtensions, fileMatcher)
          return generateBrowserEntry(graph.routes, graph.routeManifest)
        }
        if (id.startsWith(RESOLVED_VIRTUAL_GOOGLE_FONTS + '?')) {
          return generateGoogleFontsVirtualModule(id, _fontGoogleShimPath)
        }
      },

      // Layer 2 build-time layout classification. The generated RSC entry
      // emits a `function __TEXT_CLASS(routeIdx) { return null; }` stub;
      // this hook patches it with a switch-statement dispatch table so the
      // runtime probe loop in app-page-execution.ts can skip the Layer 3
      // per-layout dynamic-isolation probe for layouts we proved static or
      // dynamic at build time.
      //
      // @vitejs/plugin-rsc runs the RSC environment build in two phases:
      // a scan phase that discovers client references, and a final build
      // phase that emits the real RSC entry. We only patch when we actually
      // see the stub in a chunk — the scan phase produces a tiny stub chunk
      // that does not contain our code.
      generateBundle(_options, bundle) {
        // Only run in the RSC environment. SSR/client builds never contain
        // the __TEXT_CLASS stub so there is nothing to patch there, and
        // pulling ModuleInfo from the wrong graph would give nonsense results.
        if (this.environment?.name !== 'rsc') return
        if (!rscClassificationManifest) return

        const enableClassificationDebug = Boolean(process.env.TEXT_DEBUG_CLASSIFICATION)

        const chunks: RouteClassificationChunk[] = []
        const chunksByFileName = new Map<
          string,
          Extract<(typeof bundle)[string], { type: 'chunk' }>
        >()
        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== 'chunk') continue
          chunks.push({
            code: chunk.code,
            fileName: chunk.fileName,
          })
          chunksByFileName.set(chunk.fileName, chunk)
        }

        // `canonicalize` and `dynamicShimPaths` are hoisted to plugin init
        // (above) so they are constructed once per plugin instance instead of
        // on every generateBundle invocation. The macOS realpath quirk
        // (/var/folders/... → /private/var/folders/...) still applies to
        // every path we hand to the classifier.

        // Adapter: the classifier in `build/layout-classification.ts` uses
        // `dynamicImportedIds` (matches the old-Rollup field name we used when
        // we wrote it). Rolldown's current ModuleInfo exposes it as
        // `dynamicallyImportedIds` (the new Rollup field name). Keep the
        // translation in one place so future call sites don't have to remember.
        const moduleInfo = {
          getModuleInfo: (moduleId: string) => {
            const info = this.getModuleInfo(moduleId)
            if (!info) return null
            return {
              importedIds: info.importedIds ?? [],
              dynamicImportedIds: info.dynamicallyImportedIds ?? [],
            }
          },
        }

        const patchPlan = planRouteClassificationInjection({
          canonicalizeLayoutPath: canonicalize,
          chunks,
          dynamicShimPaths,
          enableDebugReasons: enableClassificationDebug,
          manifest: rscClassificationManifest,
          moduleInfo,
        })
        if (patchPlan.kind === 'skip') return

        const target = chunksByFileName.get(patchPlan.fileName)
        if (!target) {
          throw new Error(
            `text: build-time classification — patch target ${patchPlan.fileName} disappeared from the RSC bundle`,
          )
        }
        target.code = patchPlan.code

        // The patched body is longer than the stub, so any existing source map
        // would be stale. RSC entry source maps are not served or consumed, so
        // nulling the map is safe and prevents stale-map confusion in tooling.
        target.map = patchPlan.map
        // Consume the manifest exactly once per RSC entry load. Clearing here
        // prevents a stale manifest from leaking into a subsequent generateBundle
        // call if the load hook is not re-triggered (e.g., in non-standard rebuild paths).
        rscClassificationManifest = null
      },
    },
    // Stub node:async_hooks in client builds — see src/plugins/async-hooks-stub.ts
    createAsyncHooksStubPlugin(),
    createInstrumentationClientTransformPlugin(() => instrumentationClientPath),
    {
      name: 'text:instrumentation-client-inject',
      enforce: 'pre',

      resolveId(id) {
        if (id !== VIRTUAL_INSTRUMENTATION_CLIENT) return null
        return clientInjectModule !== null ? RESOLVED_INSTRUMENTATION_CLIENT : null
      },

      load(id) {
        if (id !== RESOLVED_INSTRUMENTATION_CLIENT) return null
        return clientInjectModule
      },
    },
    // Dedup client references from RSC proxy modules — see src/plugins/client-reference-dedup.ts
    ...(options.experimental?.clientReferenceDedup ? [clientReferenceDedupPlugin()] : []),
    // Proxy plugin for @mdx-js/rollup. The real MDX plugin is created lazily
    // during text:config's config() (when MDX files are detected), but
    // plugins returned from config() hooks run too late in the pipeline —
    // after vite:import-analysis. This top-level proxy with enforce:"pre"
    // ensures MDX transforms run at the correct stage. Both text:config
    // and this proxy are enforce:"pre", and text:config comes first in
    // the array, so mdxDelegate is already set when this proxy's hooks fire.
    {
      name: 'text:mdx',
      enforce: 'pre',
      config(config, env) {
        if (!mdxDelegate?.config) return
        const hook = mdxDelegate.config
        const fn = typeof hook === 'function' ? hook : hook.handler
        return fn.call(this, config, env)
      },
      async transform(code, id, options) {
        // Skip ?raw and other query imports — @mdx-js/rollup ignores the query
        // and would compile the file as MDX instead of returning raw text.
        if (id.includes('?')) return
        // Case-insensitive extension check for cross-platform compatibility
        // (Windows/macOS case-insensitive, Linux case-sensitive)
        if (!id.toLowerCase().endsWith('.mdx')) return

        const delegate = mdxDelegate ?? (await ensureMdxDelegate('on-demand'))
        if (delegate?.transform) {
          const hook = delegate.transform
          const transform = typeof hook === 'function' ? hook : hook.handler
          return transform.call(this, code, id, options)
        }

        if (!hasUserMdxPlugin) {
          return transformMdxWithFallback(code)
        }
      },
    },
    {
      name: 'text:pages-router',

      // HMR: trigger full-reload for Pages Router page changes.
      // The Pages Router injects hydration via inline <script type="module">
      // which may not be tracked in Vite's module graph. Explicitly sending
      // full-reload ensures changes are always reflected in the browser.
      hotUpdate(options: { file: string; server: ViteDevServer; modules: unknown[] }) {
        if (!hasPagesDir || hasAppDir) return
        if (options.file.startsWith(pagesDir) && fileMatcher.extensionRegex.test(options.file)) {
          options.server.environments.client.hot.send({ type: 'full-reload' })
          return []
        }
      },

      async closeBundle() {
        appRouteTypeGenerationClosing = true
        while (appRouteTypeGeneration) {
          await appRouteTypeGeneration
        }
      },

      configureServer(server: ViteDevServer) {
        // ModuleRunner treats resolved filesystem URLs as inline modules, even
        // when resolveId marked the original import external. Preserve one Node
        // runtime instance for compiled factories and the writer that owns them.
        if (!hasCloudflarePlugin && !hasNitroPlugin) {
          for (const environment of Object.values(server.environments)) {
            if (environment.name === 'client') continue
            const fetchModule = environment.fetchModule.bind(environment)
            environment.fetchModule = async (id, importer, options) =>
              externalizeRueServerRuntime(id, importer) ?? fetchModule(id, importer, options)
          }
        }
        // Watch route files for additions/removals to invalidate route cache.
        const pageExtensions = fileMatcher.extensionRegex
        appRouteTypeGenerationClosing = false

        // Build a long-lived ModuleRunner for loading all Pages Router modules
        // (middleware, API routes, SSR page rendering) on every request.
        //
        // We must NOT use server.ssrLoadModule() here: when @cloudflare/vite-plugin
        // is present its environments replace the SSR transport, causing
        // SSRCompatModuleRunner to crash with:
        //   TypeError: Cannot read properties of undefined (reading 'outsideEmitter')
        // on the very first request.
        //
        // createDirectRunner() builds a runner on environment.fetchModule() which
        // is a plain async method — safe with all plugin combinations, including
        // @cloudflare/vite-plugin.
        //
        // The runner is created lazily on first use so that all environments are
        // fully registered before we inspect them. We prefer "ssr", then any
        // non-"rsc" environment, then whatever is available.
        let pagesRunner: import('vite/module-runner').ModuleRunner | null = null
        function getPagesRunner() {
          if (!pagesRunner) {
            const env =
              server.environments['ssr'] ??
              Object.values(server.environments).find(e => e !== server.environments['rsc']) ??
              Object.values(server.environments)[0]
            pagesRunner = createDirectRunner(env, {
              externalize: externalizeRueServerRuntime,
            })
          }
          return pagesRunner
        }

        /**
         * Invalidate the virtual RSC entry module in Vite's module graph.
         *
         * The App Router route table is baked into the virtual RSC entry
         * at generation time. When routes are added or removed, clearing
         * the route cache alone is not enough: the virtual module must
         * also be invalidated so Vite re-calls the load() hook to
         * regenerate the entry with the updated route table.
         */
        function invalidateRscEntryModule() {
          const rscEnv = server.environments['rsc']
          if (!rscEnv) return
          const mod = rscEnv.moduleGraph.getModuleById(RESOLVED_RSC_ENTRY)
          if (mod) {
            rscEnv.moduleGraph.invalidateModule(mod)
            rscEnv.hot.send({ type: 'full-reload' })
          }
        }

        function invalidateRootParamsModule() {
          for (const env of Object.values(server.environments)) {
            const mod = env.moduleGraph.getModuleById(RESOLVED_ROOT_PARAMS)
            if (mod) env.moduleGraph.invalidateModule(mod)
          }
        }

        function invalidateAppRoutingModules() {
          invalidateAppRouteCache()
          invalidateRscEntryModule()
          invalidateRootParamsModule()
        }

        function warnRouteTypeGenerationFailure(error: unknown) {
          server.config.logger.warn(
            `[text] Failed to regenerate route types: ${
              error instanceof Error ? error.message : String(error)
            }`,
          )
        }

        async function drainAppRouteTypeGeneration() {
          while (appRouteTypeGenerationPending) {
            appRouteTypeGenerationPending = false
            try {
              await writeRouteTypes()
            } catch (error) {
              warnRouteTypeGenerationFailure(error)
            }
          }
        }

        function regenerateAppRouteTypes() {
          appRouteTypeGenerationPending = true
          if (appRouteTypeGeneration) return

          appRouteTypeGeneration = drainAppRouteTypeGeneration().finally(() => {
            appRouteTypeGeneration = null
            // A watcher event may have arrived after the drain loop's final
            // check but before this finally runs; restart the loop if so.
            if (appRouteTypeGenerationPending) regenerateAppRouteTypes()
          })
        }

        regenerateAppRouteTypes()

        // Node throws on unhandled 'error' events on sockets. When a browser
        // drops the connection mid-response (common in dev: HMR triggers a
        // reload while an RSC stream is still flushing), the text res.write
        // surfaces ECONNRESET on res.socket with no listener attached and
        // takes down the process. A no-op listener on every connection
        // neutralises the throw without hiding write failures from callers.
        // Matches the guard Vite's HMR server and Text.js install for the
        // same reason. See cloudflare/text#905.
        server.httpServer?.on('connection', socket => {
          socket.on('error', () => {})
        })

        server.watcher.on('add', (filePath: string) => {
          if (hasPagesDir && filePath.startsWith(pagesDir) && pageExtensions.test(filePath)) {
            invalidateRouteCache(pagesDir)
          }
          if (
            !appRouteTypeGenerationClosing &&
            hasAppDir &&
            shouldInvalidateAppRouteFile(appDir, filePath, fileMatcher)
          ) {
            invalidateAppRoutingModules()
            regenerateAppRouteTypes()
          }
        })
        server.watcher.on('unlink', (filePath: string) => {
          if (hasPagesDir && filePath.startsWith(pagesDir) && pageExtensions.test(filePath)) {
            invalidateRouteCache(pagesDir)
          }
          if (
            !appRouteTypeGenerationClosing &&
            hasAppDir &&
            shouldInvalidateAppRouteFile(appDir, filePath, fileMatcher)
          ) {
            invalidateAppRoutingModules()
            regenerateAppRouteTypes()
          }
        })

        // ── Dev request origin check ─────────────────────────────────────
        // Registered directly (not in the returned function) so it runs
        // BEFORE Vite's built-in middleware. This ensures all requests
        // (including /@*, /__vite*, /node_modules* paths) are validated
        // before Vite serves any content.
        server.middlewares.use((req, res, text) => {
          const blockReason = validateDevRequest(
            {
              origin: req.headers.origin as string | undefined,
              host: req.headers.host,
              'x-forwarded-host': req.headers['x-forwarded-host'] as string | undefined,
              'sec-fetch-site': req.headers['sec-fetch-site'] as string | undefined,
              'sec-fetch-mode': req.headers['sec-fetch-mode'] as string | undefined,
            },
            textConfig?.allowedDevOrigins,
          )
          if (blockReason) {
            console.warn(`[text] Blocked dev request: ${blockReason} (${req.url})`)
            res.writeHead(403, { 'Content-Type': 'text/plain' })
            res.end('Forbidden')
            return
          }
          text()
        })

        // Return a function to register middleware AFTER Vite's built-in middleware
        return () => {
          // Run instrumentation.ts register() if present (once at server startup).
          // Must be inside the returned function so that all environments are
          // fully registered before getPagesRunner() inspects them.
          //
          // App Router: register() is baked into the generated RSC entry as a
          // top-level await, so it runs inside the Worker process (or RSC Vite
          // environment) — the same process as request handling. Calling
          // runInstrumentation() here too would run it a second time in the host
          // process, which is wrong when @cloudflare/vite-plugin is present.
          //
          // Pages Router prod: register() is baked into generateServerEntry() as
          // a top-level await, so it runs inside the Worker bundle — the same
          // process as request handling. configureServer() is never called during
          // a prod build, so there is no double-invocation risk there either.
          //
          // We pass getPagesRunner() (createDirectRunner) rather than server so
          // that this is safe when @cloudflare/vite-plugin is present. That
          // plugin replaces the SSR environment's hot channel, causing
          // server.ssrLoadModule() to crash with outsideEmitter. The runner
          // calls environment.fetchModule() directly and never touches the hot
          // channel, making it safe with all Vite plugin combinations.
          if (instrumentationPath && !hasAppDir) {
            runInstrumentation(getPagesRunner(), instrumentationPath).catch(err => {
              console.error('[text] Instrumentation error:', err)
            })
          }
          // App Router request logging in dev server
          //
          // For App Router, the RSC plugin handles requests internally.
          // We install a timing middleware here that:
          //   1. Intercepts writeHead() to pluck the X-Text-Timing header
          //      (compileMs,renderMs) that the RSC entry attaches before
          //      it is flushed to the client.
          //   2. Logs the full request after res finishes, using those timings.
          if (hasAppDir) {
            server.middlewares.use((req, res, text) => {
              const url = req.url ?? '/'
              // Skip Vite internals, HMR, and static assets.
              // Do NOT skip .rsc-suffixed URLs or RSC wire requests (Accept: text/x-component)
              // — those are soft navigations and should be logged like any other page request.
              const [pathname] = url.split('?')
              if (
                url.startsWith('/@') ||
                url.startsWith('/__vite') ||
                url.startsWith('/node_modules') ||
                (url.includes('.') && !pathname.endsWith('.html') && !pathname.endsWith('.rsc'))
              ) {
                return text()
              }
              const _reqStart = now()
              let _compileMs: number | undefined
              let _renderMs: number | undefined
              const _forwardTimingHeader =
                process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'

              // Intercept setHeader and writeHead so we can strip X-Text-Timing
              // before it reaches the client and capture the compile/render split.
              // The RSC plugin may set headers either way depending on its version.
              // Parse the three-part X-Text-Timing header:
              //   "handlerStart,inHandlerCompileMs,renderMs"
              //
              // True compile time = time the RSC plugin spent loading/transforming
              // modules before our handler code ran, plus any in-handler work before
              // renderToReadableStream. Concretely:
              //   compileMs = (handlerStart - _reqStart) + inHandlerCompileMs
              //   renderMs  = renderMs from header, or -1 for RSC-only (soft-nav)
              //               responses where rendering is not measured in the handler.
              //               In that case the middleware computes render time as
              //               totalMs - compileMs.
              //
              // handlerStart is performance.now() recorded at the very top of
              // _handleRequest in the generated RSC entry. _reqStart is recorded
              // here in the Node middleware, one stack frame before the RSC plugin
              // loads the module. The gap between them is exactly the Vite
              // compile/transform cost.
              function _parseTiming(raw: unknown) {
                const [handlerStart, inHandlerCompileMs, renderMs] = String(raw)
                  .split(',')
                  .map(v => Number(v))
                if (
                  !Number.isNaN(handlerStart) &&
                  !Number.isNaN(inHandlerCompileMs) &&
                  inHandlerCompileMs !== -1
                ) {
                  _compileMs =
                    Math.max(0, Math.round(handlerStart - _reqStart)) + inHandlerCompileMs
                }
                if (!Number.isNaN(renderMs) && renderMs !== -1) {
                  _renderMs = renderMs
                }
              }

              const _origSetHeader = res.setHeader.bind(res)
              res.setHeader = function (name, value) {
                if (name.toLowerCase() === TEXT_TIMING_HEADER) {
                  _parseTiming(value)
                  return _forwardTimingHeader ? _origSetHeader(name, value) : res
                }
                return _origSetHeader(name, value)
              }

              const _origWriteHead = res.writeHead.bind(res)
              // oxlint-disable-text-line typescript/no-explicit-any
              res.writeHead = function (statusCode, ...args: any[]) {
                // Normalise the optional headers argument (may be reason, headers object, or both).
                let headers: Record<string, unknown> | undefined
                const [reasonOrHeaders, maybeHeaders] = args
                if (typeof reasonOrHeaders === 'string') {
                  headers = maybeHeaders
                } else {
                  headers = reasonOrHeaders
                }

                // Pull timing out of the headers object when present.
                if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
                  const timingKey = Object.keys(headers).find(
                    k => k.toLowerCase() === TEXT_TIMING_HEADER,
                  )
                  if (timingKey) {
                    _parseTiming(headers[timingKey])
                    if (!_forwardTimingHeader) {
                      delete headers[timingKey]
                    }
                  }
                }

                return _origWriteHead(statusCode, ...args)
              }

              res.on('finish', () => {
                // Strip .rsc suffix — it's an internal RSC protocol detail,
                // not part of the actual page path the user navigated to.
                const logUrl = url.replace(/\.rsc(\?|$)/, '$1')
                const totalMs = now() - _reqStart

                // For RSC-only responses (soft nav), renderMs is -1 (sentinel meaning
                // "not measured in the handler"). Compute it as totalMs - compileMs,
                // which is how long the RSC stream took to fully flush to the client —
                // matching what Text.js shows for soft navigations.
                const resolvedRenderMs =
                  _renderMs !== undefined
                    ? _renderMs
                    : _compileMs !== undefined
                      ? Math.max(0, Math.round(totalMs - _compileMs))
                      : undefined

                logRequest({
                  method: req.method ?? 'GET',
                  url: logUrl,
                  status: res.statusCode,
                  totalMs,
                  compileMs: _compileMs,
                  renderMs: resolvedRenderMs,
                })
              })

              text()
            })
          }

          const handlePagesMiddleware = async (
            req: import('node:http').IncomingMessage,
            res: import('node:http').ServerResponse,
            text: (err?: unknown) => void,
          ): Promise<void> => {
            try {
              let url: string = req.url ?? '/'

              // If no pages directory, skip this middleware entirely
              // (app router is handled by @vitejs/plugin-rsc's built-in middleware)
              if (!hasPagesDir) return text()

              // Skip Vite internal requests and static files
              if (
                url.startsWith('/@') ||
                url.startsWith('/__vite') ||
                url.startsWith('/node_modules')
              ) {
                return text()
              }

              // Skip .rsc requests — those are for the App Router RSC handler
              if (url.split('?')[0].endsWith('.rsc')) {
                return text()
              }

              // ── Cross-origin request protection (defense-in-depth) ──────
              // The pre-Vite middleware above already blocks cross-origin
              // requests before Vite serves any content. This second check
              // guards the Pages Router handler specifically, in case the
              // middleware ordering changes or new middleware is added between
              // the two. Both calls use the same validateDevRequest() function.
              const blockReason = validateDevRequest(
                {
                  origin: req.headers.origin as string | undefined,
                  host: req.headers.host,
                  'x-forwarded-host': req.headers['x-forwarded-host'] as string | undefined,
                  'sec-fetch-site': req.headers['sec-fetch-site'] as string | undefined,
                  'sec-fetch-mode': req.headers['sec-fetch-mode'] as string | undefined,
                },
                textConfig?.allowedDevOrigins,
              )
              if (blockReason) {
                console.warn(`[text] Blocked dev request: ${blockReason} (${url})`)
                res.writeHead(403, { 'Content-Type': 'text/plain' })
                res.end('Forbidden')
                return
              }

              // ── Image optimization passthrough (dev mode) ─────────────
              // In dev, redirect to the original asset URL so Vite serves it.
              if (isImageOptimizationPath(url.split('?')[0]!)) {
                const imgParams = new URLSearchParams(url.split('?')[1] ?? '')
                const rawImgUrl = imgParams.get('url')
                // Normalize backslashes: browsers and the URL constructor treat
                // /\evil.com as //evil.com, bypassing the // check.
                const imgUrl = rawImgUrl?.replaceAll('\\', '/') ?? null
                // Allowlist: must start with "/" but not "//" — blocks absolute
                // URLs, protocol-relative, backslash variants, and exotic schemes.
                // Also block internal Vite paths (/@*, /__vite*, /node_modules*)
                // to prevent redirecting to dev server endpoints.
                if (
                  !imgUrl ||
                  !imgUrl.startsWith('/') ||
                  imgUrl.startsWith('//') ||
                  imgUrl.startsWith('/@') ||
                  imgUrl.startsWith('/__vite') ||
                  imgUrl.startsWith('/node_modules')
                ) {
                  res.writeHead(400)
                  res.end(!rawImgUrl ? 'Missing url parameter' : 'Only relative URLs allowed')
                  return
                }
                // Validate the constructed URL's origin hasn't changed (defense in depth).
                const resolvedImg = new URL(imgUrl, `http://${req.headers.host || 'localhost'}`)
                if (resolvedImg.origin !== `http://${req.headers.host || 'localhost'}`) {
                  res.writeHead(400)
                  res.end('Only relative URLs allowed')
                  return
                }
                const encodedLocation = resolvedImg.pathname + resolvedImg.search
                res.writeHead(302, { Location: encodedLocation })
                res.end()
                return
              }

              // Vite's built-in middleware may rewrite "/" to "/index.html".
              // Normalize it back so our router can match correctly.
              const rawPathname = url.split('?')[0]
              if (rawPathname.endsWith('/index.html')) {
                url = url.replace('/index.html', '/')
              } else if (rawPathname.endsWith('.html')) {
                // Strip .html extensions (e.g. "/about.html" -> "/about")
                url = url.replace(/\.html(?=\?|$)/, '')
              }

              let pathname = url.split('?')[0]

              // Guard against protocol-relative URL open redirects.
              // Check the RAW pathname before decode/normalize so both literal
              // (//, /\) and percent-encoded (%5C, %2F) leading delimiters are
              // rejected. Encoded forms survive the segment-wise decode below
              // and would otherwise reach trailing-slash redirect emitters.
              if (isOpenRedirectShaped(pathname)) {
                res.writeHead(404)
                res.end('This page could not be found')
                return
              }
              pathname = pathname.replaceAll('\\', '/')

              // Normalize the pathname to prevent path-confusion attacks.
              // decodeURIComponent prevents /%61dmin bypassing /admin matchers.
              // normalizePath collapses // and resolves . / .. segments.
              try {
                pathname = normalizePath(normalizePathnameForRouteMatchStrict(pathname))
              } catch {
                // Malformed percent-encoding (e.g. /%E0%A4%A) — return 400 instead of crashing.
                res.writeHead(400)
                res.end('Bad Request')
                return
              }

              // Strip basePath prefix from URL for route matching.
              // All internal routing uses basePath-free paths.
              //
              // NOTE: When basePath is set, we also set Vite's `base` config to
              // `basePath + "/"`. Vite's connect middleware stack strips the base
              // prefix from req.url before passing it to our middleware, so the
              // URL will already lack the basePath prefix. We still attempt to
              // strip it (for robustness) but don't reject paths that don't start
              // with basePath — Vite has already done the filtering.
              const bp = textConfig?.basePath ?? ''
              if (bp && pathname.startsWith(bp)) {
                const stripped = pathname.slice(bp.length) || '/'
                const qs = url.includes('?') ? url.slice(url.indexOf('?')) : ''
                url = stripped + qs
                pathname = stripped
              }

              if (textConfig) {
                const qs = url.includes('?') ? url.slice(url.indexOf('?')) : ''
                const trailingSlashRedirect = normalizeTrailingSlash(
                  pathname,
                  bp,
                  textConfig.trailingSlash,
                  qs,
                )
                if (trailingSlashRedirect) {
                  const location = trailingSlashRedirect.headers.get('Location')
                  res.writeHead(
                    trailingSlashRedirect.status,
                    location ? { Location: location } : undefined,
                  )
                  res.end()
                  return
                }
              }

              // ── `_text/data` normalization (Pages Router) ──────────────
              // Client-side navigations in the Pages Router fetch
              // `/_text/data/<buildId>/<page>.json`. Normalize the URL to the
              // page path BEFORE middleware runs so middleware sees `/page`
              // (matching Text.js — see `handleTextDataRequest` in
              // base-server.ts). If the buildId is missing (dev) or matches,
              // accept the request; if it is present and wrong, fall through
              // to the dot-extension skip below which returns 404.
              let isDataReq = false
              if (isTextDataPathname(pathname)) {
                // Use the plugin's resolved buildId so a user-supplied
                // `generateBuildId` in text.config.mjs is honored in dev —
                // matching the value embedded into the prod entry. Fall back
                // to the env-var define (set by the plugin) and finally
                // "development" if the plugin hasn't resolved a config yet.
                const devBuildId =
                  textConfig?.buildId ?? process.env.__TEXT_BUILD_ID ?? 'development'
                const dataMatch = parseTextDataPathname(pathname, devBuildId)
                if (dataMatch) {
                  isDataReq = true
                  const qs = url.includes('?') ? url.slice(url.indexOf('?')) : ''
                  url = dataMatch.pagePathname + qs
                  pathname = dataMatch.pagePathname
                  // Rewrite req.url so downstream middleware sees the page
                  // path, not the raw _text/data URL.
                  req.url = url
                } else {
                  // Stale buildId or malformed path. Return a JSON 404 here
                  // (matching the prod-server path) so clients hard-navigate
                  // instead of trying to parse Vite's HTML 404 as JSON.
                  res.writeHead(404, { 'Content-Type': 'application/json' })
                  res.end('{}')
                  return
                }
              }

              // Skip requests for files with extensions (static assets) after
              // trailing-slash canonicalization so file-looking dynamic routes
              // like /catch-all/hello.world/ still get the Text.js redirect.
              if (pathname.includes('.') && !pathname.endsWith('.html')) {
                return text()
              }

              // When @cloudflare/vite-plugin is present, delegate the entire
              // Pages Router request pipeline to the Worker/miniflare side.
              // That keeps middleware, headers, redirects, rewrites, API
              // routes, and rendering in one place instead of mutating the
              // host request and forwarding post-middleware state downstream.
              if (hasCloudflarePlugin) return text()

              // Snapshot of req.headers before middleware runs. Used for both
              // preMiddlewareReqCtx and the middleware Request itself. Intentionally
              // captured once here — applyRequestHeadersToNodeRequest() mutates
              // req.headers later, but by then this Headers object is no longer read.
              const rawHeaders = new Headers(
                Object.fromEntries(
                  Object.entries(req.headers)
                    .filter(([, v]) => v !== undefined)
                    .map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v)]),
                ),
              )
              // Capture `x-textjs-data` before filterInternalHeaders strips it
              // — the middleware redirect protocol needs to know whether the
              // inbound request was a `_text/data` fetch to emit
              // `x-textjs-redirect` instead of a 3xx.
              const isDataRequest = rawHeaders.get('x-textjs-data') === '1'
              // Strip internal headers from inbound requests so they cannot be
              // forged to influence routing or impersonate internal state.
              // Both the middleware Request (built below) and the SSR handler
              // (which reads req.headers directly) must see clean headers.
              const nodeRequestHeaders = filterInternalHeaders(rawHeaders)
              for (const header of INTERNAL_HEADERS) {
                delete req.headers[header]
              }
              for (const header of TEXT_INTERNAL_HEADERS) {
                delete req.headers[header]
              }

              const requestOrigin = `http://${req.headers.host || 'localhost'}`
              const preMiddlewareReqUrl = new URL(url, requestOrigin)
              const preMiddlewareReqCtx: RequestContext = requestContextFromRequest(
                new Request(preMiddlewareReqUrl, {
                  headers: nodeRequestHeaders,
                }),
              )

              // Default-locale path normalisation (issue #1336, item 4).
              // Text.js prepends `/${defaultLocale}` to every unprefixed
              // request before any config rule or filesystem match runs so
              // that locale-aware rules with `:locale` placeholders still
              // match default-locale URLs. Mirrors resolve-routes.ts.
              //
              // `matchPathname` covers pre-middleware matching against the
              // original pathname. `matchResolvedPathname` is a function form
              // used by the post-middleware rewrite phases (afterFiles,
              // fallback) so they pick up the rewritten URL each time — the
              // same shape as `prod-server.ts` and `deploy.ts`.
              const matchPathname = textConfig?.i18n
                ? normalizeDefaultLocalePathname(pathname, textConfig.i18n, {
                    hostname: preMiddlewareReqUrl.hostname,
                  })
                : pathname
              const matchResolvedPathname = (p: string): string =>
                textConfig?.i18n
                  ? normalizeDefaultLocalePathname(p, textConfig.i18n, {
                      hostname: preMiddlewareReqUrl.hostname,
                    })
                  : p

              // Config redirects run before middleware, but still match against
              // the original normalized pathname and request headers/cookies.
              if (textConfig?.redirects.length) {
                const redirected = applyRedirects(
                  matchPathname,
                  res,
                  textConfig.redirects,
                  preMiddlewareReqCtx,
                  textConfig.basePath ?? '',
                )
                if (redirected) return
              }

              const applyRequestHeadersToNodeRequest = (textRequestHeaders: Headers) => {
                for (const key of Object.keys(req.headers)) {
                  delete req.headers[key]
                }
                for (const [key, value] of textRequestHeaders) {
                  req.headers[key] = value
                }
              }

              let middlewareRequestHeaders: Headers | null = null
              let deferredMwResponseHeaders: [string, string][] | null = null

              const applyDeferredMwHeaders = () => {
                if (deferredMwResponseHeaders) {
                  for (const [key, value] of deferredMwResponseHeaders) {
                    res.appendHeader(key, value)
                  }
                }
              }
              const applyMwRequestHeadersForExternalProxy = () => {
                if (middlewareRequestHeaders) {
                  applyRequestHeadersToNodeRequest(middlewareRequestHeaders)
                } else {
                  delete req.headers[TEXT_MW_CTX_HEADER]
                }
              }

              // Run middleware.ts if present
              if (middlewarePath) {
                // Only trust X-Forwarded-Proto when behind a trusted proxy
                const devTrustProxy =
                  process.env.TEXT_TRUST_PROXY === '1' ||
                  (process.env.TEXT_TRUSTED_HOSTS ?? '').split(',').some(h => h.trim())
                const rawProto = devTrustProxy
                  ? String(req.headers['x-forwarded-proto'] || '')
                      .split(',')[0]
                      .trim()
                  : ''
                const mwProto = rawProto === 'https' || rawProto === 'http' ? rawProto : 'http'
                const origin = `${mwProto}://${req.headers.host || 'localhost'}`
                const middlewareRequest = new Request(new URL(url, origin), {
                  method: req.method,
                  headers: nodeRequestHeaders,
                })
                const result = await runMiddleware(
                  getPagesRunner(),
                  middlewarePath,
                  middlewareRequest,
                  textConfig?.i18n,
                  textConfig?.basePath,
                  textConfig?.trailingSlash,
                  isDataRequest,
                )

                // Settle waitUntil promises — no ctx.waitUntil() in dev, but
                // promises must still run for parity with prod (session sync, telemetry, etc.)
                if (result.waitUntilPromises?.length) {
                  void Promise.allSettled(result.waitUntilPromises)
                }

                if (!result.continue) {
                  if (result.redirectUrl) {
                    const redirectHeaders: Record<string, string | string[]> = {
                      Location: result.redirectUrl,
                    }
                    if (result.responseHeaders) {
                      for (const [key, value] of result.responseHeaders) {
                        const existing = redirectHeaders[key]
                        if (existing === undefined) {
                          redirectHeaders[key] = value
                        } else if (Array.isArray(existing)) {
                          existing.push(value)
                        } else {
                          redirectHeaders[key] = [existing, value]
                        }
                      }
                    }
                    res.writeHead(result.redirectStatus ?? 307, redirectHeaders)
                    res.end()
                    return
                  }
                  if (result.response) {
                    res.statusCode = result.response.status
                    for (const [key, value] of result.response.headers) {
                      res.appendHeader(key, value)
                    }
                    const body = Buffer.from(await result.response.arrayBuffer())
                    res.end(body)
                    return
                  }
                }

                // Apply middleware response headers. Unpack
                // x-middleware-request-* headers into req.headers so
                // config has/missing conditions and downstream handlers
                // see middleware-modified cookies and headers.
                if (result.responseHeaders) {
                  const currentRequestHeaders = new Headers()
                  for (const [key, value] of Object.entries(req.headers)) {
                    if (Array.isArray(value)) {
                      currentRequestHeaders.set(key, value.join(', '))
                    } else if (value !== undefined) {
                      currentRequestHeaders.set(key, value)
                    }
                  }

                  middlewareRequestHeaders = buildRequestHeadersFromMiddlewareResponse(
                    currentRequestHeaders,
                    result.responseHeaders,
                    {
                      preserveCredentialHeaders: Boolean(
                        result.rewriteUrl && isExternalUrl(result.rewriteUrl),
                      ),
                    },
                  )

                  if (middlewareRequestHeaders && !hasAppDir) {
                    applyRequestHeadersToNodeRequest(middlewareRequestHeaders)
                  }

                  if (hasAppDir) {
                    // Hybrid app+pages: defer response headers. They'll be
                    // applied to res for Pages routes or forwarded to the RSC
                    // entry (via x-text-mw-ctx) for App Router routes.
                    deferredMwResponseHeaders = []
                    for (const [key, value] of result.responseHeaders) {
                      if (!key.startsWith(MIDDLEWARE_HEADER_PREFIX)) {
                        deferredMwResponseHeaders.push([key, value])
                      }
                    }
                  } else {
                    for (const [key, value] of result.responseHeaders) {
                      if (!key.startsWith(MIDDLEWARE_HEADER_PREFIX)) {
                        res.appendHeader(key, value)
                      }
                    }
                  }
                }

                // Apply middleware rewrite (URL and optional status code)
                if (result.rewriteUrl) {
                  url = result.rewriteUrl
                  // Write the rewritten URL back onto req.url so every subsequent
                  // handler in the connect chain sees the correct path. The local
                  // `url` variable is only visible within this handler — anything
                  // further down the chain (Vite's built-in middleware, the
                  // Cloudflare plugin's handler, or any other connect middleware)
                  // reads req.url directly. Without this, a middleware rewrite
                  // would be invisible to those handlers and the original URL
                  // would be dispatched instead.
                  req.url = url
                }
                const middlewareStatus = result.status ?? result.rewriteStatus
                if (middlewareStatus !== undefined) {
                  req.__textMiddlewareStatus = middlewareStatus
                }

                // Forward middleware context to the RSC entry so it can
                // populate _mwCtx without re-running the middleware function.
                // This prevents double execution in hybrid app+pages dev mode.
                if (hasAppDir) {
                  const mwCtxEntries: [string, string][] = []
                  if (result.responseHeaders) {
                    for (const [key, value] of result.responseHeaders) {
                      // Exclude control headers that runMiddleware already
                      // consumed — matches the RSC entry's inline filtering.
                      if (key !== MIDDLEWARE_TEXT_HEADER && key !== MIDDLEWARE_REWRITE_HEADER) {
                        mwCtxEntries.push([key, value])
                      }
                    }
                  }
                  req.headers[TEXT_MW_CTX_HEADER] = JSON.stringify({
                    h: mwCtxEntries,
                    s: middlewareStatus ?? null,
                    r: result.rewriteUrl ?? null,
                  })
                }
              }

              // Build request context once for has/missing condition checks
              // for config rules that execute after middleware (rewrites).
              // Convert Node.js IncomingMessage headers to a Web Request for
              // requestContextFromRequest(), which uses the standard Web API.
              const reqUrl = new URL(url, requestOrigin)
              const reqCtxHeaders = middlewareRequestHeaders ?? nodeRequestHeaders
              const reqCtx: RequestContext = requestContextFromRequest(
                new Request(reqUrl, { headers: reqCtxHeaders }),
              )

              // Apply custom headers from text.config.js
              // Header matching still uses the original normalized pathname and
              // pre-middleware request state; middleware response headers win
              // later because they are already on the outgoing response.
              if (textConfig?.headers.length) {
                applyHeaders(matchPathname, res, textConfig.headers, preMiddlewareReqCtx, bp)
              }

              // Apply rewrites from text.config.js (beforeFiles)
              let resolvedUrl = url
              if (textConfig?.rewrites.beforeFiles.length) {
                const rewritten = applyRewrites(
                  matchPathname,
                  textConfig.rewrites.beforeFiles,
                  reqCtx,
                  bp,
                )
                if (rewritten) {
                  // Preserve original query params across the rewrite — Text.js
                  // semantics: `Object.assign(parsedUrl.query, rewriteQuery)`.
                  resolvedUrl = mergeRewriteQuery(url, rewritten)
                }
              }

              // External rewrite from beforeFiles — proxy to external URL
              if (isExternalUrl(resolvedUrl)) {
                applyDeferredMwHeaders()
                applyMwRequestHeadersForExternalProxy()
                await proxyExternalRewriteNode(req, res, resolvedUrl)
                return
              }

              // Handle API routes first (pages/api/*).
              // Strip the i18n locale prefix before the `/api/` check so
              // `/fr/api/ok` resolves to the `pages/api/ok` handler (Text.js
              // parity — see base-server.ts's normalizeLocalePath call).
              const apiLookupUrl = stripI18nLocaleForApiRoute(resolvedUrl, textConfig?.i18n)
              const resolvedPathname = apiLookupUrl.split('?')[0]
              if (resolvedPathname.startsWith('/api/') || resolvedPathname === '/api') {
                const apiRoutes = await apiRouter(pagesDir, textConfig?.pageExtensions, fileMatcher)
                const apiMatch = matchRoute(apiLookupUrl, apiRoutes)
                if (apiMatch) {
                  applyDeferredMwHeaders()
                  if (middlewareRequestHeaders) {
                    applyRequestHeadersToNodeRequest(middlewareRequestHeaders)
                  }
                }
                const handled = await handleApiRoute(
                  getPagesRunner(),
                  req,
                  res,
                  apiLookupUrl,
                  apiRoutes,
                )
                if (handled) return

                // No API route matched — if app dir exists, let the RSC plugin handle it
                // (app/api/* route handlers live there). Otherwise hard-404.
                if (hasAppDir) return text()

                res.statusCode = 404
                res.end('404 - API route not found')
                return
              }

              const routes = await pagesRouter(pagesDir, textConfig?.pageExtensions, fileMatcher)

              let match = matchRoute(resolvedUrl.split('?')[0], routes)

              // Apply afterFiles rewrites after non-dynamic page routes have had a
              // chance to win, but before dynamic route matching.
              if ((!match || match.route.isDynamic) && textConfig?.rewrites.afterFiles.length) {
                const afterRewrite = applyRewrites(
                  matchResolvedPathname(resolvedUrl.split('?')[0]),
                  textConfig.rewrites.afterFiles,
                  reqCtx,
                  bp,
                )
                if (afterRewrite) {
                  resolvedUrl = mergeRewriteQuery(resolvedUrl, afterRewrite)
                  match = matchRoute(resolvedUrl.split('?')[0], routes)
                }
              }

              // External rewrite from afterFiles — proxy to external URL
              if (isExternalUrl(resolvedUrl)) {
                applyDeferredMwHeaders()
                applyMwRequestHeadersForExternalProxy()
                await proxyExternalRewriteNode(req, res, resolvedUrl)
                return
              }

              const handler = createSSRHandler(
                server,
                getPagesRunner(),
                routes,
                pagesDir,
                textConfig?.i18n,
                fileMatcher,
                textConfig?.basePath ?? '',
                textConfig?.trailingSlash ?? false,
                middlewarePath !== null,
              )
              const mwStatus = req.__textMiddlewareStatus

              // Try rendering the resolved URL
              if (match) {
                applyDeferredMwHeaders()
                if (middlewareRequestHeaders) {
                  applyRequestHeadersToNodeRequest(middlewareRequestHeaders)
                }
                await handler(req, res, resolvedUrl, mwStatus, isDataReq)
                return
              }

              // No route matched — try fallback rewrites
              if (textConfig?.rewrites.fallback.length) {
                const fallbackRewrite = applyRewrites(
                  matchResolvedPathname(resolvedUrl.split('?')[0]),
                  textConfig.rewrites.fallback,
                  reqCtx,
                  bp,
                )
                if (fallbackRewrite) {
                  // External fallback rewrite — proxy to external URL
                  if (isExternalUrl(fallbackRewrite)) {
                    applyDeferredMwHeaders()
                    applyMwRequestHeadersForExternalProxy()
                    await proxyExternalRewriteNode(req, res, fallbackRewrite)
                    return
                  }
                  const fallbackMatch = matchRoute(fallbackRewrite.split('?')[0], routes)
                  if (!fallbackMatch && hasAppDir) {
                    return text()
                  }
                  applyDeferredMwHeaders()
                  if (middlewareRequestHeaders) {
                    applyRequestHeadersToNodeRequest(middlewareRequestHeaders)
                  }
                  await handler(req, res, fallbackRewrite, mwStatus, isDataReq)
                  return
                }
              }

              // No fallback matched - if app dir exists, let the RSC plugin handle it,
              // otherwise render via the pages SSR handler (will 404 for unknown routes).
              if (hasAppDir) return text()

              await handler(req, res, resolvedUrl, mwStatus, isDataReq)
            } catch (e) {
              text(e)
            }
          }

          server.middlewares.use((req, res, text) => {
            void handlePagesMiddleware(req, res, text)
          })
        }
      },
    },
    // Strip server-only data-fetching exports (getServerSideProps, getStaticProps,
    // getStaticPaths) from page modules in the client bundle. These functions
    // often import server-only modules (database drivers, fs, etc.) that would
    // break or bloat the client bundle. Text.js does this via an SWC transform
    // (text-ssg-transform); we use Vite's parseAst + MagicString.
    //
    // Only applies to client builds (not SSR) and only to files under the
    // pages/ directory.
    {
      name: 'text:strip-server-exports',
      transform: {
        // Only match page source files, not node_modules
        filter: { id: /\.(tsx?|jsx?|mjs)$/ },
        handler(code, id) {
          const ssr = this.environment?.name !== 'client'
          if (ssr) return null
          if (!hasPagesDir) return null
          // Only transform files under the pages/ directory
          if (!id.startsWith(pagesDir)) return null
          // Skip API routes, _app, _document, _error
          const relativePath = id.slice(pagesDir.length)
          if (relativePath.startsWith('/api/') || relativePath === '/api') return null
          if (/\/_(?:app|document|error)\b/.test(relativePath)) return null

          const result = stripServerExports(code)
          if (!result) return null
          return { code: result, map: null }
        },
      },
    },
    // Local image import transform:
    // When a source file imports a local image (e.g., `import hero from './hero.jpg'`),
    // this plugin transforms the default import to a StaticImageData object with
    // { src, width, height } so the text/image shim can set correct dimensions
    // on <img> tags, preventing CLS.
    //
    // Vite's default image import returns a URL string. We intercept this by
    // adding a `?text-meta` suffix: the original import gets the URL from Vite,
    // and we resolve the `?text-meta` virtual module to provide dimensions.
    {
      name: 'text:image-imports',
      enforce: 'pre',

      // Cache of image dimensions to avoid re-reading files
      _dimCache: imageImportDimCache,

      resolveId: {
        filter: { id: /\?text-meta$/ },
        handler(source, _importer) {
          if (!source.endsWith('?text-meta')) return null
          // Resolve the real image path from the importer
          const realPath = source.replace('?text-meta', '')
          return `\0text-image-meta:${realPath}`
        },
      },

      async load(id) {
        if (!id.startsWith('\0text-image-meta:')) return null
        const imagePath = id.replace('\0text-image-meta:', '')

        // Read from cache first
        const cache = imageImportDimCache
        let dims = cache.get(imagePath)
        if (!dims) {
          try {
            const { imageSize } = await import('image-size')
            const buffer = fs.readFileSync(imagePath)
            const result = imageSize(buffer)
            dims = { width: result.width ?? 0, height: result.height ?? 0 }
            cache.set(imagePath, dims)
          } catch {
            dims = { width: 0, height: 0 }
          }
        }

        return `export default ${JSON.stringify(dims)};`
      },

      transform: {
        // Hook filter: Rolldown evaluates these on the Rust side, skipping
        // the JS handler entirely for files that don't match.
        filter: {
          id: {
            include: /\.(tsx?|jsx?|mjs)$/,
            exclude: /node_modules/,
          },
          code: new RegExp(`import\\s+\\w+\\s+from\\s+['"][^'"]+\\.(${IMAGE_EXTS})['"]`),
        },
        async handler(code, id) {
          // Defensive guard — duplicates filter logic
          if (id.includes('node_modules')) return null
          if (id.startsWith('\0')) return null
          if (!id.match(/\.(tsx?|jsx?|mjs)$/)) return null

          const imageImportRe = new RegExp(
            `import\\s+(\\w+)\\s+from\\s+['"]([^'"]+\\.(${IMAGE_EXTS}))['"];?`,
            'g',
          )
          if (!imageImportRe.test(code)) return null

          imageImportRe.lastIndex = 0

          const s = new MagicString(code)
          let hasChanges = false

          let match
          while ((match = imageImportRe.exec(code)) !== null) {
            const [fullMatch, varName, importPath] = match
            const matchStart = match.index
            const matchEnd = matchStart + fullMatch.length

            // Resolve the absolute path of the image
            const dir = path.dirname(id)
            const absImagePath = path.resolve(dir, importPath)

            if (!fs.existsSync(absImagePath)) continue

            // Replace the single import with two:
            // 1. Original import (Vite gives us the URL string)
            // 2. Meta import (we provide { width, height })
            // Combined into a StaticImageData object
            const urlVar = `__text_img_url_${varName}`
            const metaVar = `__text_img_meta_${varName}`
            const replacement =
              `import ${urlVar} from ${JSON.stringify(importPath)};\n` +
              `import ${metaVar} from ${JSON.stringify(absImagePath + '?text-meta')};\n` +
              `const ${varName} = { src: ${urlVar}, width: ${metaVar}.width, height: ${metaVar}.height };`

            s.overwrite(matchStart, matchEnd, replacement)
            hasChanges = true
          }

          if (!hasChanges) return null

          return {
            code: s.toString(),
            map: s.generateMap({ hires: 'boundary' }),
          }
        },
      },
    } as Plugin & { _dimCache: Map<string, { width: number; height: number }> },
    // Google Fonts import rewrite + self-hosting — see src/plugins/fonts.ts
    createGoogleFontsPlugin(_fontGoogleShimPath, _shimsDir),
    // Local font path resolution — see src/plugins/fonts.ts
    createLocalFontsPlugin(),
    // Barrel import optimization:
    // Rewrites `import { Slot } from "radix-ui"` to the configured slot package.
    // for packages listed in optimizePackageImports or DEFAULT_OPTIMIZE_PACKAGES.
    // This prevents Vite from eagerly evaluating barrel re-exports that call
    // client-only context factories in RSC environments where createContext doesn't exist.
    createOptimizeImportsPlugin(
      () => textConfig,
      () => root,
    ),
    // "use cache" directive transform:
    // Detects "use cache" at file-level or function-level and wraps the
    // exports/functions with registerCachedFunction() from text/cache-runtime.
    // Runs without enforce so it executes after JSX transform (parseAst needs plain JS).
    {
      name: 'text:use-cache',

      transform: {
        // Hook filter: only invoke JS when code contains 'use cache'.
        // The vast majority of files don't use this directive.
        filter: {
          id: {
            include: /\.(tsx?|jsx?|mjs)$/,
            exclude: /node_modules/,
          },
          code: 'use cache',
        },
        async handler(code, id) {
          // Defensive guard — duplicates filter logic
          if (id.includes('node_modules')) return null
          if (id.startsWith('\0')) return null
          if (!id.match(/\.(tsx?|jsx?|mjs)$/)) return null
          if (!code.includes('use cache')) return null

          // Parse the AST first to check for actual "use cache" directives before
          // throwing the missing-RSC error. The fast-path string check above can
          // fire on files that contain "use cache" only in comments or string
          // literals (e.g., in error messages), not as real directives.
          const ast = parseAst(code)

          // Check for file-level "use cache" directive
          const cacheDirective = ast.body.find(
            node =>
              node.type === 'ExpressionStatement' &&
              node.expression?.type === 'Literal' &&
              typeof node.expression.value === 'string' &&
              node.expression.value.startsWith('use cache'),
          )

          // Check for function-level "use cache" directives by walking function bodies.
          // Accepts any function-like node: FunctionDeclaration/Expression, ArrowFunctionExpression,
          // or MethodDefinition. MethodDefinition stores its FunctionExpression in `.value`, not
          // `.body`, so we unwrap it here rather than at each call site to keep the callee safe.
          function nodeHasInlineCacheDirective(node: ASTNode): boolean {
            if (!node || typeof node !== 'object') return false
            // MethodDefinition wraps its FunctionExpression in .value; unwrap to reach .body.
            const fn = node.type === 'MethodDefinition' ? node.value : node
            // fn.body is a BlockStatement node ({type:"BlockStatement", body:Statement[]}), not
            // a raw array. Unwrap it. Arrow functions with expression bodies have a non-array
            // .body — the BlockStatement check handles that case (body.body would be undefined).
            const stmts: ASTNode[] | null =
              // oxlint-disable-text-line typescript/no-explicit-any
              (fn as any)?.body?.type === 'BlockStatement' ? (fn as any).body.body : null
            if (Array.isArray(stmts)) {
              for (const stmt of stmts) {
                if (
                  stmt?.type === 'ExpressionStatement' &&
                  stmt.expression?.type === 'Literal' &&
                  typeof stmt.expression?.value === 'string' &&
                  /^use cache(:\s*\w+)?$/.test(stmt.expression.value)
                ) {
                  return true
                }
              }
            }
            return false
          }
          function astHasInlineCache(nodes: ASTNode[]): boolean {
            for (const node of nodes) {
              if (!node || typeof node !== 'object') continue
              if (
                (node.type === 'FunctionDeclaration' ||
                  node.type === 'FunctionExpression' ||
                  node.type === 'ArrowFunctionExpression' ||
                  node.type === 'MethodDefinition') &&
                nodeHasInlineCacheDirective(node)
              ) {
                return true
              }
              // Walk into variable declarations, export declarations, etc.
              for (const key of Object.keys(node)) {
                if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue
                const child = node[key as keyof typeof node] as ASTNode
                if (Array.isArray(child) && child.some(c => c && typeof c === 'object')) {
                  if (astHasInlineCache(child)) return true
                } else if (child && typeof child === 'object' && child.type) {
                  if (astHasInlineCache([child])) return true
                }
              }
            }
            return false
          }
          const hasInlineCache = !cacheDirective && astHasInlineCache(ast.body)

          if (!cacheDirective && !hasInlineCache) return null

          if (cacheDirective) {
            // File-level "use cache" — wrap function exports with
            // registerCachedFunction. Page default exports are wrapped directly
            // (they're leaf components). Layout/template defaults are excluded
            // because they receive {children} from the framework.
            // oxlint-disable-text-line typescript/no-explicit-any
            const directiveValue = (cacheDirective as any).expression.value
            const variant =
              directiveValue === 'use cache'
                ? ''
                : directiveValue.replace('use cache:', '').replace('use cache: ', '').trim()

            // Only skip default export wrapping for layouts and templates —
            // they receive {children} from the framework which requires
            // temporary reference handling that registerCachedFunction doesn't
            // support yet. Pages, not-found, loading, error, and default are
            // leaf components with no {children} prop and can be cached directly.
            const isLayoutOrTemplate = /\/(layout|template)\.(tsx?|jsx?|mjs)$/.test(id)

            const runtimeModuleSpecifier = resolveShimModulePath(shimsDir, 'cache-runtime').replace(
              /\\/g,
              '/',
            )
            const runtimeImportCode = `import { registerCachedFunction as __text_registerCachedFunction } from ${JSON.stringify(runtimeModuleSpecifier)};\n`
            const result = transformWrapExport(code, ast, {
              runtime: (value: string, name: string) =>
                `__text_registerCachedFunction(${value}, ${JSON.stringify(id + ':' + name)}, ${JSON.stringify(variant)})`,
              rejectNonAsyncFunction: false,
              filter: (name: string, meta: { isFunction?: boolean }) => {
                // Skip non-functions (constants, types, etc.)
                if (meta.isFunction === false) return false
                // Skip the default export on layout/template files — these
                // receive {children} from the framework, and caching them
                // requires temporary reference handling for the children slot.
                // Named exports (e.g. generateMetadata) are still wrapped.
                if (isLayoutOrTemplate && name === 'default') return false
                return true
              },
            })

            if (result.exportNames.length > 0) {
              // Remove the directive itself so it doesn't cause runtime errors
              const output = result.output
              output.prepend(runtimeImportCode)
              output.overwrite(
                cacheDirective.start,
                cacheDirective.end,
                `/* "use cache" — wrapped by text */`,
              )
              return {
                code: output.toString(),
                map: output.generateMap({ hires: 'boundary' }),
              }
            }

            // Even if no exports were wrapped, still strip the directive
            // (e.g., layout/template file with only a default export)
            const output = new MagicString(code)
            output.overwrite(
              cacheDirective.start,
              cacheDirective.end,
              `/* "use cache" — handled by text */`,
            )
            return {
              code: output.toString(),
              map: output.generateMap({ hires: 'boundary' }),
            }
          }

          // Check for function-level "use cache" directives
          // (e.g., async function getData() { "use cache"; ... })
          if (hasInlineCache) {
            const runtimeModuleSpecifier2 = resolveShimModulePath(
              shimsDir,
              'cache-runtime',
            ).replace(/\\/g, '/')
            const runtimeImportCode2 = `import { registerCachedFunction as __text_registerCachedFunction } from ${JSON.stringify(runtimeModuleSpecifier2)};\n`

            try {
              const result = transformHoistInlineDirective(code, ast, {
                directive: /^use cache(:\s*\w+)?$/,
                runtime: (value: string, name: string, meta: { directiveMatch: string[] }) => {
                  const directiveMatch = meta.directiveMatch[0]
                  const variant =
                    directiveMatch === 'use cache'
                      ? ''
                      : directiveMatch.replace('use cache:', '').replace('use cache: ', '').trim()
                  return `__text_registerCachedFunction(${value}, ${JSON.stringify(id + ':' + name)}, ${JSON.stringify(variant)})`
                },
                rejectNonAsyncFunction: false,
              })

              if (result.names.length > 0) {
                result.output.prepend(runtimeImportCode2)
                return {
                  code: result.output.toString(),
                  map: result.output.generateMap({ hires: 'boundary' }),
                }
              }
            } catch {
              // If hoisting fails (e.g., complex closure), fall through
            }
          }

          return null
        },
      },
    },
    // Inline binary assets fetched via `fetch(new URL("./asset", import.meta.url))` —
    // see src/plugins/og-assets.ts
    createOgInlineFetchAssetsPlugin(),
    // Copy @vercel/og binary assets to the RSC output directory — see src/plugins/og-assets.ts
    createOgAssetsPlugin(),
    // Collect SSR/RSC bundle externals and write dist/server/text-externals.json.
    // Used by emitStandaloneOutput to determine which packages to copy into
    // standalone/node_modules/ — uses the bundler's own import graph instead of
    // fragile regex scanning of emitted files.
    createServerExternalsManifestPlugin(),
    // Write image config JSON for the App Router production server.
    // The App Router RSC entry doesn't export textConfig (that's a Pages
    // Router pattern), so we write a separate JSON file at build time that
    // prod-server.ts reads at startup for SVG/security header config.
    {
      name: 'text:image-config',
      apply: 'build',
      enforce: 'post',
      writeBundle: {
        sequential: true,
        order: 'post',
        handler(options) {
          const envName = this.environment?.name
          if (envName !== 'rsc') return

          const outDir = options.dir
          if (!outDir) return

          const imageConfig = {
            dangerouslyAllowSVG: textConfig?.images?.dangerouslyAllowSVG,
            contentDispositionType: textConfig?.images?.contentDispositionType,
            contentSecurityPolicy: textConfig?.images?.contentSecurityPolicy,
          }

          fs.writeFileSync(path.join(outDir, 'image-config.json'), JSON.stringify(imageConfig))
        },
      },
    },
    // Write BUILD_ID to dist/server/ so post-build tools (TPR, seed-cache) can
    // read the build identifier without depending on the prerender manifest.
    // Uses closeBundle (not writeBundle) with a one-time write guard so the file
    // is written exactly once per build regardless of how many environments are
    // active (App Router RSC+SSR+client, Pages Router SSR+client, etc.).
    // The path is always dist/server/BUILD_ID — derived from root, not from the
    // per-environment options.dir — so it works for all router types.
    (() => {
      let buildIdWritten = false
      return {
        name: 'text:build-id',
        apply: 'build' as const,
        enforce: 'post' as const,
        closeBundle: {
          sequential: true,
          order: 'post' as const,
          handler() {
            if (buildIdWritten) return
            buildIdWritten = true
            const outDir = path.join(root, 'dist', 'server')
            fs.mkdirSync(outDir, { recursive: true })
            fs.writeFileSync(path.join(outDir, 'BUILD_ID'), textConfig!.buildId)
          },
        },
      }
    })(),
    // Mix experimental.outputHashSalt / TEXT_HASH_SALT into chunk content hashes.
    // This changes output filenames (e.g., index-[hash].js) without modifying source.
    // Uses augmentChunkHash (supported by Rolldown) instead of the unsupported output.hashSalt.
    {
      name: 'text:hash-salt',
      apply: 'build',
      augmentChunkHash() {
        // Only apply to client environment; SSR/RSC don't use content hashing
        if (this.environment?.name !== 'client') return
        const salt = textConfig?.hashSalt
        if (salt) {
          return salt
        }
      },
    },
    // Note: augmentChunkHash only affects JS chunk hashes. CSS and static asset
    // hashes are not salted, which is a known gap vs Text.js behavior.
    // Write text-server.json to dist/server/ with a per-build prerender secret.
    // The prerender secret is used by prod-server.ts to authenticate requests to
    // the internal /__text/prerender/* endpoints, which are only reachable during
    // the prerender phase of `text build`. A new secret is generated on every
    // build so it rotates with every deployment.
    //
    // The secret is generated once at plugin creation time so that both the rsc
    // and ssr environments write the exact same value (they share the same
    // closure). Without this, each env would call randomBytes() independently
    // and the second write would silently overwrite the first with a different
    // secret, causing prerender auth to fail for whichever env's server reads
    // the file last.
    (() => {
      const prerenderSecret = randomBytes(32).toString('hex')
      return {
        name: 'text:server-manifest',
        apply: 'build' as const,
        enforce: 'post' as const,
        writeBundle: {
          sequential: true,
          order: 'post' as const,
          handler(options: { dir?: string }) {
            const envName = this.environment?.name
            // Fire for App Router RSC builds (rsc env) and Pages Router SSR builds
            // (ssr env). Skip client and other environments.
            if (envName !== 'rsc' && envName !== 'ssr') return

            const outDir = options.dir
            if (!outDir) return

            const manifest = { prerenderSecret }
            fs.writeFileSync(path.join(outDir, 'text-server.json'), JSON.stringify(manifest))
          },
        },
      }
    })(),
    {
      name: 'text:nitro-route-rules',
      nitro: {
        setup: async (nitro: NitroSetupContext) => {
          if (nitro.options.dev) return
          if (!textConfig) return
          if (!hasAppDir && !hasPagesDir) return

          const { collectNitroRouteRules, mergeNitroRouteRules } =
            await import('./build/nitro-route-rules.js')
          const generatedRouteRules = await collectNitroRouteRules({
            appDir: hasAppDir ? appDir : null,
            pagesDir: hasPagesDir ? pagesDir : null,
            pageExtensions: textConfig.pageExtensions,
          })

          if (Object.keys(generatedRouteRules).length === 0) return

          const { routeRules, skippedRoutes } = mergeNitroRouteRules(
            nitro.options.routeRules,
            generatedRouteRules,
          )

          nitro.options.routeRules = routeRules

          if (skippedRoutes.length > 0) {
            const warn = nitro.logger?.warn ?? console.warn
            warn(
              `[text] Skipping generated Nitro routeRules for routes with existing exact cache config: ${skippedRoutes.join(', ')}`,
            )
          }
        },
      },
    } as Plugin & {
      nitro: { setup: (nitro: NitroSetupContext) => Promise<void> }
    }, // Nitro plugin extension convention: https://nitro.build/guide/plugins
    // Vite can emit empty SSR manifest entries for modules that Rollup inlines
    // into another chunk. Pages Router looks up assets by page module path at
    // runtime, so rebuild those mappings from the emitted client bundle.
    {
      name: 'text:ssr-manifest-backfill',
      apply: 'build',
      enforce: 'post',
      writeBundle: {
        sequential: true,
        order: 'post',
        handler(options, bundle) {
          const outDir = options.dir
          if (!outDir) return

          const viteDir = path.join(outDir, '.vite')
          const ssrManifestPath = path.join(viteDir, 'ssr-manifest.json')
          if (!fs.existsSync(ssrManifestPath)) return

          try {
            const ssrManifest = JSON.parse(fs.readFileSync(ssrManifestPath, 'utf-8')) as Record<
              string,
              string[]
            >
            const buildRoot = this.environment?.config.root ?? process.cwd()
            const buildBase = this.environment?.config.base ?? '/'
            const augmentedManifest = augmentSsrManifestFromBundle(
              ssrManifest,
              bundle as Record<string, BundleBackfillChunk | { type: string }>,
              buildRoot,
              buildBase,
            )
            fs.writeFileSync(ssrManifestPath, JSON.stringify(augmentedManifest, null, 2))
          } catch (err) {
            // Leave Vite's manifest untouched if parsing fails.
            console.warn('[text] Failed to augment SSR manifest:', err)
          }
        },
      },
    },
    // Build-time precompression: generate .br, .gz, .zst for hashed assets.
    // Runs after the client bundle is written so compressed variants are
    // available for the production server's static file cache.
    // Opt-in via `precompress: true` in plugin options or `--precompress`
    // CLI flag. Not useful for edge platforms (Cloudflare Workers, Nitro)
    // that handle compression at the CDN layer.
    (() => {
      let pendingPrecompress: Promise<void> | null = null
      let pendingPrecompressError: unknown = null

      return {
        name: 'text:precompress',
        apply: 'build' as const,
        enforce: 'post' as const,
        writeBundle: {
          sequential: true,
          order: 'post' as const,
          handler(outputOptions: { dir?: string }) {
            if (this.environment?.name !== 'client') return

            if (!options.precompress && process.env.TEXT_PRECOMPRESS !== '1') return

            const outDir = outputOptions.dir
            if (!outDir) return

            // Only precompress hashed assets — public directory files use
            // on-the-fly compression since they may change between deploys.
            // When `assetPrefix` is configured the assets live under a
            // different subdirectory (e.g. `cdn/_text/static/`); resolve from
            // the config so we walk the actual on-disk layout.
            const assetsSubdir = resolveAssetsDir(textConfig.assetPrefix)
            const assetsDir = path.join(outDir, assetsSubdir)
            if (!fs.existsSync(assetsDir)) return

            const isTTY = process.stderr.isTTY
            let lastLineLen = 0

            // Start precompression as soon as the client bundle is written, but
            // defer awaiting it until the SSR environment finishes. This overlaps
            // the extra asset work with the final build phase instead of putting
            // the full precompression cost on the critical path of step 4/5.
            pendingPrecompressError = null
            pendingPrecompress = (async () => {
              const result = await precompressAssets(outDir, {
                assetsDir: assetsSubdir,
                onProgress: (completed, total, file) => {
                  if (!isTTY) return
                  const pct = total > 0 ? Math.floor((completed / total) * 100) : 0
                  const bar = `[${'█'.repeat(Math.floor(pct / 5))}${' '.repeat(20 - Math.floor(pct / 5))}]`
                  const maxFile = 30
                  const fileLabel = file.length > maxFile ? '…' + file.slice(-(maxFile - 1)) : file
                  const line = `Compressing assets... ${bar} ${String(completed).padStart(String(total).length)}/${total} ${fileLabel}`
                  const padded = line.padEnd(lastLineLen)
                  lastLineLen = line.length
                  process.stderr.write(`\r${padded}`)
                },
              })
              if (isTTY) {
                process.stderr.write(`\r${' '.repeat(lastLineLen)}\r`)
              }
              if (result.filesCompressed > 0) {
                const ratio = (
                  (1 - result.totalBrotliBytes / result.totalOriginalBytes) *
                  100
                ).toFixed(1)
                console.log(
                  `  Precompressed ${result.filesCompressed} assets (${ratio}% smaller with brotli)`,
                )
              }
            })().catch(error => {
              pendingPrecompressError = error
              // Log immediately so the error isn't invisible if closeBundle
              // never fires (e.g. a crash in a later SSR build plugin).
              console.error('[text] Precompression failed:', error)
            })
          },
        },
        closeBundle: {
          sequential: true,
          order: 'post' as const,
          async handler() {
            if (this.environment?.name !== 'ssr') return
            if (!pendingPrecompress) return

            const task = pendingPrecompress
            pendingPrecompress = null
            await task
            if (pendingPrecompressError) {
              const error = pendingPrecompressError
              pendingPrecompressError = null
              throw error
            }
          },
        },
      }
    })(),
    // Cloudflare Workers production build integration:
    // After all environments are built, compute lazy chunks from the client
    // build manifest and inject globals into the worker entry.
    //
    // Pages Router: injects __TEXT_CLIENT_ENTRY__, __TEXT_SSR_MANIFEST__,
    //   and __TEXT_LAZY_CHUNKS__ into the worker entry (found via wrangler.json).
    // App Router: the RSC plugin handles __TEXT_CLIENT_ENTRY__ via
    //   loadBootstrapScriptContent(), but we still inject __TEXT_LAZY_CHUNKS__
    //   and __TEXT_SSR_MANIFEST__ into the worker entry at dist/server/index.js.
    // Both: generates _headers file for immutable asset caching.
    {
      name: 'text:cloudflare-build',
      apply: 'build',
      enforce: 'post',
      closeBundle: {
        sequential: true,
        order: 'post',
        async handler() {
          const envName = this.environment?.name
          if (!envName || !hasCloudflarePlugin) return
          if (envName !== 'client') return

          const envConfig = this.environment?.config
          if (!envConfig) return
          const buildRoot = envConfig.root ?? process.cwd()
          const distDir = path.resolve(buildRoot, 'dist')
          if (!fs.existsSync(distDir)) return

          const clientDir = path.resolve(buildRoot, 'dist', 'client')
          const clientBase = envConfig.base ?? '/'

          // Read build manifest and compute lazy chunks (only reachable via
          // dynamic imports). This runs for BOTH App Router and Pages Router.
          // clientEntryFile is only used by the Pages Router path below —
          // App Router gets its client entry via the RSC plugin instead.
          let lazyChunksData: string[] | null = null
          let clientEntryFile: string | null = null
          const buildManifestPath = path.join(clientDir, '.vite', 'manifest.json')
          if (fs.existsSync(buildManifestPath)) {
            try {
              const buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf-8'))
              // oxlint-disable-text-line typescript/no-explicit-any
              for (const [, value] of Object.entries(buildManifest) as [string, any][]) {
                if (value && value.isEntry && value.file) {
                  clientEntryFile = manifestFileWithBase(value.file, clientBase)
                  break
                }
              }
              const lazy = manifestFilesWithBase(computeLazyChunks(buildManifest), clientBase)
              if (lazy.length > 0) lazyChunksData = lazy
            } catch {
              /* ignore parse errors */
            }
          }

          // Read SSR manifest for per-page CSS/JS injection
          let ssrManifestData: Record<string, string[]> | null = null
          const ssrManifestPath = path.join(clientDir, '.vite', 'ssr-manifest.json')
          if (fs.existsSync(ssrManifestPath)) {
            try {
              ssrManifestData = JSON.parse(fs.readFileSync(ssrManifestPath, 'utf-8'))
            } catch {
              /* ignore parse errors */
            }
          }

          if (hasAppDir) {
            // App Router: the RSC plugin handles __TEXT_CLIENT_ENTRY__
            // via loadBootstrapScriptContent(), but we still need to inject
            // __TEXT_LAZY_CHUNKS__ and __TEXT_SSR_MANIFEST__ into the
            // worker entry at dist/server/index.js.
            const workerEntry = path.resolve(distDir, 'server', 'index.js')
            if (fs.existsSync(workerEntry) && (lazyChunksData || ssrManifestData)) {
              let code = fs.readFileSync(workerEntry, 'utf-8')
              const globals: string[] = []
              if (ssrManifestData) {
                globals.push(
                  `globalThis.__TEXT_SSR_MANIFEST__ = ${JSON.stringify(ssrManifestData)};`,
                )
              }
              if (lazyChunksData) {
                globals.push(`globalThis.__TEXT_LAZY_CHUNKS__ = ${JSON.stringify(lazyChunksData)};`)
              }
              code = globals.join('\n') + '\n' + code
              fs.writeFileSync(workerEntry, code)
            }
          } else {
            // Pages Router: find worker output by scanning dist/ for a
            // directory containing wrangler.json (Cloudflare plugin default).
            let workerOutDir: string | null = null
            for (const entry of fs.readdirSync(distDir)) {
              const candidate = path.join(distDir, entry)
              if (entry === 'client') continue
              if (
                fs.statSync(candidate).isDirectory() &&
                fs.existsSync(path.join(candidate, 'wrangler.json'))
              ) {
                workerOutDir = candidate
                break
              }
            }
            if (!workerOutDir) return

            const workerEntry = path.join(workerOutDir, 'index.js')
            if (!fs.existsSync(workerEntry)) return

            // Fallback: scan the on-disk assets directory for the client entry
            // chunk when the SSR manifest lookup didn't surface one. Pages Router
            // uses "text-client-entry", App Router uses "text-app-browser-entry".
            //
            // When `assetPrefix` is configured, chunks live under
            // `<prefix>/_text/static/` (path-prefix) or `_text/static/`
            // (absolute-URL prefix) — NOT `assets/`. Resolve the actual
            // subdirectory from the same helper that drives `build.assetsDir`
            // and the prod-server lookup path, so this fallback works for every
            // layout supported by the rest of the pipeline.
            if (!clientEntryFile) {
              const assetsSubdir = resolveAssetsDir(textConfig?.assetPrefix)
              const assetsDir = path.join(clientDir, assetsSubdir)
              if (fs.existsSync(assetsDir)) {
                const files = fs.readdirSync(assetsDir)
                const entry = files.find(
                  (f: string) =>
                    (f.includes('text-client-entry') || f.includes('text-app-browser-entry')) &&
                    f.endsWith('.js'),
                )
                if (entry)
                  clientEntryFile = manifestFileWithBase(`${assetsSubdir}/${entry}`, clientBase)
              }
            }

            // Prepend globals to worker entry
            if (clientEntryFile || ssrManifestData || lazyChunksData) {
              let code = fs.readFileSync(workerEntry, 'utf-8')
              const globals: string[] = []
              if (clientEntryFile) {
                globals.push(
                  `globalThis.__TEXT_CLIENT_ENTRY__ = ${JSON.stringify(clientEntryFile)};`,
                )
              }
              if (ssrManifestData) {
                globals.push(
                  `globalThis.__TEXT_SSR_MANIFEST__ = ${JSON.stringify(ssrManifestData)};`,
                )
              }
              if (lazyChunksData) {
                globals.push(`globalThis.__TEXT_LAZY_CHUNKS__ = ${JSON.stringify(lazyChunksData)};`)
              }
              code = globals.join('\n') + '\n' + code
              fs.writeFileSync(workerEntry, code)
            }
          }

          // Generate _headers file for Cloudflare Workers static asset caching.
          // Vite outputs content-hashed files (JS, CSS, fonts) to the assetsDir
          // (defaults to `_text/static`; see
          // resolveAssetsDir in utils/asset-prefix.ts). These are safe to
          // cache indefinitely since the hash changes on any content change.
          // Without this, Cloudflare serves them with max-age=0 which forces
          // unnecessary revalidation on every page load.
          const headersPath = path.join(clientDir, '_headers')
          if (!fs.existsSync(headersPath)) {
            const assetsDir = envConfig.build?.assetsDir ?? ASSET_PREFIX_URL_DIR
            const headersContent = [
              '# Cache content-hashed assets immutably (generated by text)',
              `/${assetsDir}/*`,
              '  Cache-Control: public, max-age=31536000, immutable',
              '',
            ].join('\n')
            fs.mkdirSync(clientDir, { recursive: true })
            fs.writeFileSync(headersPath, headersContent)
          }
        },
      },
    },
    {
      // @vercel/og WASM patch — universal (workerd + Node.js)
      //
      // @vercel/og/dist/index.edge.js uses two WASM modules that need special handling:
      //
      // 1. YOGA WASM: yoga-layout embeds its WASM as a base64 data URL and instantiates
      //    it via WebAssembly.instantiate(bytes). workerd forbids this — WASM must be
      //    loaded as a pre-compiled WebAssembly.Module via the module system.
      //
      // 2. RESVG WASM: imported as `import resvg_wasm from "./resvg.wasm?module"` which
      //    only works on workerd. Node.js can't import WASM files as ESM modules.
      //
      // Fix: replace all static WASM imports with dynamic imports that try the ?module
      // path (for workerd) and fall back to compiling from bytes (for Node.js). This
      // produces a single build output that runs on both runtimes.
      name: 'text:og-font-patch',
      enforce: 'pre' as const,
      transform(code: string, id: string) {
        if (!id.includes('@vercel/og') || !id.includes('index.edge.js')) return null
        let result = code

        // ── Yoga WASM: dynamic import + inline base64 fallback ──────────────────────
        // yoga-layout's emscripten bundle sets H to a data URL containing the yoga WASM,
        // then later calls WebAssembly.instantiate(bytes, imports), which workerd rejects.
        // Emscripten supports a custom h2.instantiateWasm(imports, callback) escape hatch.
        //
        // Strategy: try dynamic import("./yoga.wasm?module") for workerd (pre-compiled
        // module), fall back to compiling from inline base64 bytes for Node.js.
        // Yoga WASM is ~70KB so inlining the base64 (~95KB) is acceptable.
        const YOGA_DATA_URL_RE = /H = "data:application\/octet-stream;base64,([A-Za-z0-9+/]+=*)";/
        const yogaMatch = YOGA_DATA_URL_RE.exec(result)
        if (yogaMatch) {
          const yogaBase64 = yogaMatch[1]
          const distDir = path.dirname(id)
          const yogaWasmPath = path.join(distDir, 'yoga.wasm')
          // Write yoga.wasm to disk idempotently at transform time (Node.js side)
          // so the ?module dynamic import can resolve it on workerd builds.
          if (!fs.existsSync(yogaWasmPath)) {
            fs.writeFileSync(yogaWasmPath, Buffer.from(yogaBase64, 'base64'))
          }
          // Disable the data-URL branch so emscripten doesn't try to instantiate from bytes
          result = result.replace(yogaMatch[0], `H = "";`)
          // Patch the loadYoga call site to inject instantiateWasm with universal handler.
          // WebAssembly.instantiate(Module, imports) → Instance (workerd path)
          // WebAssembly.instantiate(bytes, imports)  → { module, instance } (Node.js path)
          const YOGA_CALL = `yoga_wasm_base64_esm_default()`
          const YOGA_CALL_PATCHED = [
            `yoga_wasm_base64_esm_default({ instantiateWasm: function(imports, callback) {`,
            `  __vi_yoga_mod.then(function(mod) {`,
            `    if (mod) {`,
            `      WebAssembly.instantiate(mod, imports).then(function(inst) { callback(inst); });`,
            `    } else {`,
            `      var b = Buffer.from(__vi_yoga_b64, "base64");`,
            `      WebAssembly.instantiate(b, imports).then(function(r) { callback(r.instance); });`,
            `    }`,
            `  });`,
            `  return {};`,
            `} })`,
          ].join('\n')
          result = result.replace(YOGA_CALL, YOGA_CALL_PATCHED)
          // Prepend dynamic import with base64 fallback (no static import — Node.js safe)
          const yogaPreamble = [
            `var __vi_yoga_b64 = ${JSON.stringify(yogaBase64)};`,
            `var __vi_yoga_mod = import("./yoga.wasm?module").then(function(m) { return m.default; }).catch(function() { return null; });`,
          ].join('\n')
          result = yogaPreamble + '\n' + result
        }

        // ── Resvg WASM: dynamic import + disk fallback ──────────────────────────────
        // The edge entry has `import resvg_wasm from "./resvg.wasm?module"` which is a
        // static ESM import that only works on workerd. Node.js fails because the WASM
        // binary's emscripten imports (module "a") can't be resolved as npm packages.
        //
        // Strategy: replace the static import with a dynamic import for workerd, falling
        // back to reading the .wasm file from disk + WebAssembly.compile for Node.js.
        // Resvg WASM is ~1.3MB so we read from disk instead of inlining base64.
        const RESVG_STATIC_IMPORT_RE =
          /import\s+resvg_wasm\s+from\s+["']\.\/resvg\.wasm\?module["']\s*;?/
        const resvgMatch = RESVG_STATIC_IMPORT_RE.exec(result)
        if (resvgMatch) {
          // Note: new URL("./resvg.wasm", import.meta.url) MUST be inside the catch handler,
          // not at the top level. In workerd, import.meta.url is "worker" (not a valid URL
          // base), so new URL(..., "worker") throws TypeError at module load time.
          // The catch block only runs on Node.js where import.meta.url is a file:// URL.
          const resvgLoader = [
            `var resvg_wasm = import("./resvg.wasm?module").then(function(m) { return m.default; }).catch(function() {`,
            `  return Promise.all([import("node:fs"), import("node:url")]).then(function(mods) {`,
            `    var p = mods[1].fileURLToPath(new URL("./resvg.wasm", import.meta.url));`,
            `    return mods[0].promises.readFile(p).then(function(buf) { return WebAssembly.compile(buf); });`,
            `  });`,
            `});`,
          ].join('\n')
          result = result.replace(resvgMatch[0], resvgLoader)
        }

        if (result === code) return null
        return { code: result, map: null }
      },
    },
  ]

  // Keep the directive scan ahead of JSX lowering, then let the client-reference
  // transform consume the compiler-only JavaScript output.
  if (earlyAppDirExists && ruePlugin) {
    const directiveScanIndex = rueRscPlugins.findIndex(
      plugin =>
        plugin && typeof plugin === 'object' && plugin.name === 'rsc:use-client/scan-directive',
    )
    if (directiveScanIndex >= 0) {
      plugins.push(...rueRscPlugins.slice(0, directiveScanIndex + 1))
      plugins.push(ruePlugin)
      plugins.push(...rueRscPlugins.slice(directiveScanIndex + 1))
    } else {
      plugins.push(ruePlugin, ...rueRscPlugins)
    }
  } else {
    plugins.push(...rueRscPlugins)
  }
  if (earlyAppDirExists) {
    plugins.push(createRscClientReferenceLoadersPlugin())
  }

  return plugins
}

/**
 * Collect all TEXT_PUBLIC_* env vars and create Vite define entries
 * so they get inlined into the client bundle.
 */
function getTextPublicEnvDefines(): Record<string, string> {
  const defines: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('TEXT_PUBLIC_') && value !== undefined) {
      defines[`process.env.${key}`] = JSON.stringify(value)
    }
  }
  return defines
}

// matchConfigPattern is imported from config-matchers.ts and re-exported
// for tests and other consumers that import it from text's main entry.
// The duplicate local implementation and its extractConstraint helper
// have been removed in favor of the canonical config-matchers.ts version
// which uses a single-pass tokenizer (fixing the chained .replace()
// divergence that CodeQL flagged as incomplete sanitization).

/**
 * Apply redirect rules from text.config.js.
 * Returns true if a redirect was applied.
 */
function applyRedirects(
  pathname: string,
  // oxlint-disable-text-line typescript/no-explicit-any
  res: any,
  redirects: TextRedirect[],
  ctx: RequestContext,
  basePath = '',
): boolean {
  // Vite strips the basePath before our middleware sees the request, so any
  // pathname we see is implicitly "under basePath" for matching purposes.
  // Default rules fire as expected; `basePath: false` rules cannot reach the
  // dev server today because Vite won't proxy out-of-basepath requests.
  const result = matchRedirect(pathname, redirects, ctx, { basePath, hadBasePath: true })
  if (result) {
    // Sanitize to prevent open redirect via protocol-relative URLs
    const dest = sanitizeDestination(
      basePath && !isExternalUrl(result.destination) && !hasBasePath(result.destination, basePath)
        ? basePath + result.destination
        : result.destination,
    )
    res.writeHead(result.permanent ? 308 : 307, { Location: dest })
    res.end()
    return true
  }
  return false
}

/*
 * Converts the Node.js IncomingMessage into a Web Request, calls
 * proxyExternalRequest(), and pipes the response back to the Node.js
 * ServerResponse.
 */
async function proxyExternalRewriteNode(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
  externalUrl: string,
): Promise<void> {
  try {
    const proto = 'http'
    const host = req.headers.host || 'localhost'
    const origin = `${proto}://${host}`
    const method = req.method ?? 'GET'
    const hasBody = method !== 'GET' && method !== 'HEAD'
    const init: RequestInit & { duplex?: string } = {
      method,
      headers: Object.fromEntries(
        Object.entries(req.headers)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v)]),
      ),
    }
    if (hasBody) {
      const { Readable } = await import('node:stream')
      init.body = Readable.toWeb(req) as ReadableStream
      init.duplex = 'half'
    }
    const webRequest = new Request(new URL(req.url ?? '/', origin), init)
    const proxyResponse = await proxyExternalRequest(webRequest, externalUrl)

    // Preserve multi-value headers (e.g. Set-Cookie) — Object.fromEntries()
    // would collapse them into a single value.
    const nodeHeaders: Record<string, string | string[]> = {}
    proxyResponse.headers.forEach((value, key) => {
      const existing = nodeHeaders[key]
      if (existing !== undefined) {
        nodeHeaders[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
      } else {
        nodeHeaders[key] = value
      }
    })
    res.writeHead(proxyResponse.status, nodeHeaders)

    if (proxyResponse.body) {
      const { Readable: ReadableImport } = await import('node:stream')
      const nodeStream = ReadableImport.fromWeb(
        proxyResponse.body as import('stream/web').ReadableStream,
      )
      nodeStream.pipe(res)
    } else {
      res.end()
    }
  } catch (e) {
    console.error('[text] External rewrite proxy error:', e)
    if (!res.headersSent) {
      res.writeHead(502)
      res.end('Bad Gateway')
    }
  }
}

/**
 * Apply rewrite rules from text.config.js.
 * Returns the rewritten URL or null if no rewrite matched.
 */
function applyRewrites(
  pathname: string,
  rewrites: TextRewrite[],
  ctx: RequestContext,
  basePath = '',
): string | null {
  // Vite strips the basePath before our middleware sees the request; see
  // applyRedirects for rationale.
  const dest = matchRewrite(pathname, rewrites, ctx, { basePath, hadBasePath: true })
  if (dest) {
    // Sanitize to prevent open redirect via protocol-relative URLs
    return sanitizeDestination(dest)
  }
  return null
}

/**
 * Apply custom header rules from text.config.js.
 * Middleware headers take precedence: if a header key was already set on the
 * response (by middleware), the config value is skipped for that key.
 */
function applyHeaders(
  pathname: string,
  // oxlint-disable-text-line typescript/no-explicit-any
  res: any,
  headers: TextHeader[],
  ctx: RequestContext,
  basePath = '',
): void {
  // Vite strips the basePath before our middleware sees the request; see
  // applyRedirects for rationale.
  const matched = matchHeaders(pathname, headers, ctx, { basePath, hadBasePath: true })
  for (const header of matched) {
    // Use append semantics for headers where multiple values must coexist
    // (Vary, Set-Cookie). Using setHeader() on these would destroy
    // existing values like "Vary: RSC, Accept".
    const lk = header.key.toLowerCase()
    if (lk === 'set-cookie') {
      // Node.js res.getHeader("set-cookie") returns string[] when
      // multiple Set-Cookie headers have been set. Preserve the array.
      const existing = res.getHeader(lk)
      if (Array.isArray(existing)) {
        res.setHeader(header.key, [...existing, header.value])
      } else if (existing) {
        res.setHeader(header.key, [String(existing), header.value])
      } else {
        res.setHeader(header.key, header.value)
      }
    } else if (lk === 'vary') {
      const existing = res.getHeader(lk)
      if (existing) {
        res.setHeader(header.key, existing + ', ' + header.value)
      } else {
        res.setHeader(header.key, header.value)
      }
    } else {
      // Middleware headers take precedence: skip config keys already set by
      // middleware so middleware always wins over text.config.js headers.
      if (!res.getHeader(lk)) {
        res.setHeader(header.key, header.value)
      }
    }
  }
}

/**
 * Find a file by name (without extension) in a directory.
 * Checks the configured page extensions.
 */
function findFileWithExts(
  dir: string,
  name: string,
  matcher: ReturnType<typeof createValidFileMatcher>,
): string | null {
  for (const ext of matcher.dottedExtensions) {
    const filePath = path.join(dir, name + ext)
    if (fs.existsSync(filePath)) return filePath
  }
  return null
}

// Public exports for static export
export { staticExportPages, staticExportApp } from './build/static-export.js'
export type {
  StaticExportResult,
  StaticExportOptions,
  AppStaticExportOptions,
} from './build/static-export.js'

// Export TextConfig type so text.config.ts files can import it from "text"
// instead of "text".
export type { TextConfig } from './config/text-config.js'
export type TextConfig = TextConfig
export type { Metadata, Viewport } from './shims/metadata.js'
