// @ts-check
// copy from vuejs/core
// https://github.com/vuejs/core/blob/main/scripts/aliases.js

// these aliases are shared between vitest and rollup
import { existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/**
 * @param {string} metaUrl
 * @param {string} [cwd]
 */
export const resolveScriptsDirectory = (metaUrl, cwd = process.cwd()) =>
  metaUrl.startsWith('file:') ? path.dirname(fileURLToPath(metaUrl)) : path.resolve(cwd, 'scripts')

const scriptsDir = resolveScriptsDirectory(import.meta.url)
const packagesDir = path.resolve(scriptsDir, '../packages')

const resolveEntryForPkg = (/** @type {string} */ p) => {
  const packageDir = path.resolve(packagesDir, p)
  const tsxEntry = path.resolve(packageDir, 'src/index.tsx')
  return existsSync(tsxEntry) ? tsxEntry : path.resolve(packageDir, 'src/index.ts')
}

const resolveSubEntryForPkg = (/** @type {string} */ p, /** @type {string} */ subEntry) =>
  path.resolve(packagesDir, p, `src/${subEntry}.ts`)

const dirs = readdirSync(packagesDir)

/** @type {Array<{ find: string | RegExp; replacement: string; exact?: boolean }> } */
const entries = []

const nonSrcPackages = ['sfc-playground']

for (const dir of dirs) {
  const key = `rue-${dir}`
  const isDir = statSync(path.resolve(packagesDir, dir)).isDirectory()
  if (!isDir || dir === '@rue-js') continue
  if (!nonSrcPackages.includes(dir)) {
    entries.push({ find: key, replacement: resolveEntryForPkg(dir) })

    for (const subEntry of ['island']) {
      const entry = resolveSubEntryForPkg(dir, subEntry)
      if (existsSync(entry)) {
        entries.push({
          find: new RegExp(`^@rue-js/${dir}/${subEntry}$`),
          replacement: entry,
        })
      }
    }
  }
}

export { entries }

entries.push({
  find: /^@rue-js\/rue\/internal\/compiler$/,
  replacement: resolveSubEntryForPkg('rue', 'compiler-internal'),
})
entries.push({
  find: /^@rue-js\/rue\/internal\/builtins$/,
  replacement: resolveSubEntryForPkg('rue', 'builtins-internal'),
})
entries.push({
  find: /^@rue-js\/rue\/internal$/,
  replacement: resolveSubEntryForPkg('rue', 'internal'),
})
for (const capability of [
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
]) {
  for (const pkg of ['rue', 'runtime']) {
    entries.push({
      find: new RegExp(`^@rue-js/${pkg}/internal/${capability}$`),
      replacement: resolveSubEntryForPkg(pkg, `compiler-runtime/entries/${capability}`),
    })
  }
}
// additional alias for legacy '@rue-js/rue' import path
entries.push({ find: '@rue-js/rue', replacement: resolveEntryForPkg('rue') })
