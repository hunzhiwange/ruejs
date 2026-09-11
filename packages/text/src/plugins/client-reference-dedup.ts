import { readFile as readFileFromFs } from 'node:fs/promises'
import type { Plugin } from 'vite'

type ReadPackageJson = (path: string) => Promise<string>

type ClientReferenceDedupOptions = {
  readFile?: ReadPackageJson
}

type PackageImportSpecifier = {
  packageName: string
  specifier: string
}

type PackagePath = {
  packageName: string
  packageRoot: string
  relativePath: string
}

type PackageJsonInfo = {
  packageRoot: string
  packageJson: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function defaultReadPackageJson(path: string): Promise<string> {
  return readFileFromFs(path, 'utf8')
}

function parsePackagePath(absolutePath: string): PackagePath | null {
  const marker = '/node_modules/'
  const lastIdx = absolutePath.lastIndexOf(marker)
  if (lastIdx === -1) return null

  const rest = absolutePath.slice(lastIdx + marker.length)
  const parts = rest.split('/')
  const packagePartCount = rest.startsWith('@') ? 2 : 1
  const packageParts = parts.slice(0, packagePartCount)

  if (packageParts.length < packagePartCount || packageParts.some(part => part === '')) {
    return null
  }

  const packageName = packageParts.join('/')
  const relativeParts = parts.slice(packagePartCount)

  return {
    packageName,
    packageRoot: absolutePath.slice(0, lastIdx + marker.length + packageName.length),
    relativePath: relativeParts.join('/'),
  }
}

function normalizePathForPlugin(value: string): string {
  return value.replaceAll('\\', '/').replace(/\/+$/, '')
}

/**
 * Extract the bare package name from an absolute file path containing node_modules.
 *
 * Handles scoped packages (`@org/name`) and nested node_modules.
 * Returns `null` if the path doesn't contain `/node_modules/`.
 */
export function extractPackageName(absolutePath: string): string | null {
  return parsePackagePath(absolutePath)?.packageName ?? null
}

function normalizeExportTarget(target: string): string {
  return target.startsWith('./') ? target.slice(2) : target
}

function matchExportTarget(target: string, relativePath: string): string | null {
  const normalizedTarget = normalizeExportTarget(target)
  const wildcardIndex = normalizedTarget.indexOf('*')

  if (wildcardIndex === -1) {
    return normalizedTarget === relativePath ? '' : null
  }

  const beforeWildcard = normalizedTarget.slice(0, wildcardIndex)
  const afterWildcard = normalizedTarget.slice(wildcardIndex + 1)

  if (!relativePath.startsWith(beforeWildcard) || !relativePath.endsWith(afterWildcard)) {
    return null
  }

  return relativePath.slice(beforeWildcard.length, relativePath.length - afterWildcard.length)
}

function exportKeyToSpecifier(
  packageName: string,
  exportKey: string,
  wildcardMatch: string,
): string {
  if (exportKey === '.') return packageName

  const subpath = exportKey.startsWith('./') ? exportKey.slice(2) : exportKey
  const resolvedSubpath = subpath.includes('*') ? subpath.replace('*', wildcardMatch) : subpath

  return `${packageName}/${resolvedSubpath}`
}

function collectExportTargets(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(entry => collectExportTargets(entry))
  if (!isRecord(value)) return []

  return Object.values(value).flatMap(entry => collectExportTargets(entry))
}

function findExportSpecifier(
  packageName: string,
  exportsValue: unknown,
  relativePath: string,
): string | null {
  if (!isRecord(exportsValue)) {
    for (const target of collectExportTargets(exportsValue)) {
      const wildcardMatch = matchExportTarget(target, relativePath)
      if (wildcardMatch !== null) {
        return exportKeyToSpecifier(packageName, '.', wildcardMatch)
      }
    }
    return null
  }

  const entries = Object.entries(exportsValue)
  const hasSubpathKeys = entries.some(([key]) => key === '.' || key.startsWith('./'))
  if (!hasSubpathKeys) {
    for (const target of collectExportTargets(exportsValue)) {
      const wildcardMatch = matchExportTarget(target, relativePath)
      if (wildcardMatch !== null) {
        return exportKeyToSpecifier(packageName, '.', wildcardMatch)
      }
    }
    return null
  }

  let bestMatch: { key: string; wildcard: string } | null = null

  for (const [key, value] of entries) {
    if (key !== '.' && !key.startsWith('./')) continue

    for (const target of collectExportTargets(value)) {
      const wildcardMatch = matchExportTarget(target, relativePath)
      if (wildcardMatch === null) continue

      if (!bestMatch || key.length > bestMatch.key.length) {
        bestMatch = { key, wildcard: wildcardMatch }
      }
    }
  }

  return bestMatch ? exportKeyToSpecifier(packageName, bestMatch.key, bestMatch.wildcard) : null
}

function getLegacyEntry(packageJson: Record<string, unknown>): string {
  const browser = packageJson.browser
  if (typeof browser === 'string') return browser

  const module = packageJson.module
  if (typeof module === 'string') return module

  const main = packageJson.main
  return typeof main === 'string' ? main : 'index.js'
}

function matchesLegacyEntry(legacyEntry: string, relativePath: string): boolean {
  const normalizedEntry = normalizeExportTarget(legacyEntry)
  return normalizedEntry === relativePath || `${normalizedEntry}.js` === relativePath
}

function createPackageImportSpecifier(
  packageName: string,
  relativePath: string,
  packageJson: Record<string, unknown>,
): PackageImportSpecifier {
  if (relativePath === '') {
    return { packageName, specifier: packageName }
  }

  if ('exports' in packageJson) {
    const exportedSpecifier = findExportSpecifier(packageName, packageJson.exports, relativePath)
    return { packageName, specifier: exportedSpecifier ?? packageName }
  }

  const specifier = matchesLegacyEntry(getLegacyEntry(packageJson), relativePath)
    ? packageName
    : `${packageName}/${relativePath}`

  return { packageName, specifier }
}

async function readPackageJsonInfo(
  packageJsonPath: string,
  packageRoot: string,
  readPackageJson: ReadPackageJson,
): Promise<PackageJsonInfo | null> {
  try {
    const rawPackageJson = await readPackageJson(packageJsonPath)
    const parsedPackageJson: unknown = JSON.parse(rawPackageJson)
    return isRecord(parsedPackageJson) ? { packageRoot, packageJson: parsedPackageJson } : null
  } catch {
    return null
  }
}

async function findNearestPackageJson(
  absolutePath: string,
  readPackageJson: ReadPackageJson,
): Promise<PackageJsonInfo | null> {
  const normalizedPath = normalizePathForPlugin(absolutePath)
  let dir = normalizedPath.slice(0, normalizedPath.lastIndexOf('/'))

  while (dir && dir !== '/') {
    const packageJson = await readPackageJsonInfo(`${dir}/package.json`, dir, readPackageJson)
    if (packageJson) return packageJson

    const parent = dir.slice(0, dir.lastIndexOf('/'))
    if (parent === dir) break
    dir = parent || '/'
  }

  return null
}

/**
 * Convert an absolute package file path into the least lossy bare import
 * specifier that can be handed back to Vite's dependency optimizer.
 */
export async function extractPackageImportSpecifier(
  absolutePath: string,
  readPackageJson: ReadPackageJson = defaultReadPackageJson,
): Promise<PackageImportSpecifier | null> {
  const packagePath = parsePackagePath(absolutePath)
  if (!packagePath) return null

  const { packageName, packageRoot, relativePath } = packagePath

  let packageJson: Record<string, unknown> | null = null
  try {
    const rawPackageJson = await readPackageJson(`${packageRoot}/package.json`)
    const parsedPackageJson: unknown = JSON.parse(rawPackageJson)
    packageJson = isRecord(parsedPackageJson) ? parsedPackageJson : null
  } catch {
    packageJson = null
  }

  if (!packageJson) {
    return { packageName, specifier: packageName }
  }

  return createPackageImportSpecifier(packageName, relativePath, packageJson)
}

async function extractPackageImportSpecifierFromNearestPackage(
  absolutePath: string,
  readPackageJson: ReadPackageJson,
  root: string,
): Promise<PackageImportSpecifier | null> {
  const packageJson =
    (await findNearestPackageJson(absolutePath, readPackageJson)) ??
    (absolutePath.startsWith('/') && root
      ? await findNearestPackageJson(
          `${normalizePathForPlugin(root)}${absolutePath}`,
          readPackageJson,
        )
      : null)
  if (!packageJson) return null
  if (normalizePathForPlugin(packageJson.packageRoot) === normalizePathForPlugin(root)) return null

  const packageName =
    typeof packageJson.packageJson.name === 'string' ? packageJson.packageJson.name : null
  if (!packageName) return null

  const directNormalizedPath = normalizePathForPlugin(absolutePath)
  const packageRoot = normalizePathForPlugin(packageJson.packageRoot)
  const normalizedPath = directNormalizedPath.startsWith(packageRoot)
    ? directNormalizedPath
    : `${normalizePathForPlugin(root)}${directNormalizedPath}`
  const relativePath =
    normalizedPath === packageRoot ? '' : normalizedPath.slice(packageRoot.length + 1)

  return createPackageImportSpecifier(packageName, relativePath, packageJson.packageJson)
}

const DEDUP_PREFIX = '\0text:dedup/'
const DEDUP_FILTER = new RegExp('^' + DEDUP_PREFIX)
const PROXY_MARKER = 'virtual:vite-rsc/client-in-server-package-proxy/'
const TEXT_CLIENT_REFERENCES_MARKER = 'virtual:text-rsc/client-references'
const VITE_CLIENT_REFERENCES_MARKER = 'virtual:vite-rsc/client-references'
function isSupportedClientReferenceImporter(environmentName: string | undefined, importer: string) {
  if (environmentName === 'client') {
    return (
      importer.includes(PROXY_MARKER) ||
      importer.includes(TEXT_CLIENT_REFERENCES_MARKER) ||
      importer.includes(VITE_CLIENT_REFERENCES_MARKER)
    )
  }
  if (environmentName === 'ssr' || environmentName === 'rsc') {
    return (
      importer.includes(TEXT_CLIENT_REFERENCES_MARKER) ||
      importer.includes(VITE_CLIENT_REFERENCES_MARKER)
    )
  }
  return false
}

/**
 * Intercepts absolute node_modules path imports originating from RSC
 * `client-in-server-package-proxy` virtual modules in the client environment
 * and redirects them through bare specifier imports. This ensures the browser
 * loads the pre-bundled version (from `.vite/deps/`) rather than the raw ESM
 * file, preventing module duplication and broken Rue contexts.
 *
 * Dev-only — production builds use the SSR manifest which handles this correctly.
 */
export function clientReferenceDedupPlugin(options: ClientReferenceDedupOptions = {}): Plugin {
  let excludeSet = new Set<string>()
  let root = ''
  const readPackageJson = options.readFile ?? defaultReadPackageJson
  const packageImportCache = new Map<string, Promise<PackageImportSpecifier | null>>()

  return {
    name: 'text:client-reference-dedup',
    enforce: 'pre',
    apply: 'serve',

    configResolved(config) {
      root = config.root
      // Capture client environment's optimizeDeps.exclude so we don't
      // redirect packages the user explicitly opted out of pre-bundling.
      const clientExclude =
        config.environments?.client?.optimizeDeps?.exclude ?? config.optimizeDeps?.exclude ?? []
      excludeSet = new Set(clientExclude)
    },

    resolveId: {
      filter: { id: /^(?:\/|[A-Za-z]:[\\/]).*/ },
      async handler(id, importer) {
        // Only intercept imports from client references: browser proxy modules
        // and the SSR client-reference loader used for HTML rendering.
        if (!importer || !isSupportedClientReferenceImporter(this.environment?.name, importer)) {
          return
        }

        // Only handle absolute paths.
        if (!id.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(id)) return

        let packageImportPromise = packageImportCache.get(id)
        if (!packageImportPromise) {
          packageImportPromise = id.includes('/node_modules/')
            ? extractPackageImportSpecifier(id, readPackageJson)
            : extractPackageImportSpecifierFromNearestPackage(id, readPackageJson, root)
          packageImportCache.set(id, packageImportPromise)
        }

        const packageImport = await packageImportPromise
        if (!packageImport) return
        if (excludeSet.has(packageImport.packageName)) return
        if (excludeSet.has(packageImport.specifier)) return

        return `${DEDUP_PREFIX}${packageImport.specifier}`
      },
    },

    load: {
      filter: { id: DEDUP_FILTER },
      handler(id) {
        if (!id.startsWith(DEDUP_PREFIX)) return

        const pkgName = id.slice(DEDUP_PREFIX.length)
        // Re-export via bare specifier — Vite's import analysis will resolve
        // this to the pre-bundled version in .vite/deps/
        // Note: if the package has no default export, `__all__.default` is
        // undefined, so this produces `export default undefined` — which matches
        // the RSC client-in-server-package-proxy behavior.
        return [
          `export * from ${JSON.stringify(pkgName)};`,
          `import * as __all__ from ${JSON.stringify(pkgName)};`,
          `export default __all__.default;`,
        ].join('\n')
      },
    },
  }
}
