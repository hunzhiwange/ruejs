// @ts-check
// copy from vuejs/core
// https://github.com/vuejs/core/blob/main/scripts/aliases.js

// these aliases are shared between vitest and rollup
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const resolveEntryForPkg = (/** @type {string} */ p) =>
  path.resolve(fileURLToPath(import.meta.url), `../../packages/${p}/src/index.ts`)

const resolveSubEntryForPkg = (
  /** @type {string} */ p,
  /** @type {string} */ subEntry,
) => path.resolve(fileURLToPath(import.meta.url), `../../packages/${p}/src/${subEntry}.ts`)

const dirs = readdirSync(new URL('../packages', import.meta.url))

/** @type {Array<{ find: string | RegExp; replacement: string; exact?: boolean }> } */
const entries = []

const nonSrcPackages = ['sfc-playground']

for (const dir of dirs) {
  const key = `rue-${dir}`
  const isDir = statSync(new URL(`../packages/${dir}`, import.meta.url)).isDirectory()
  if (!isDir || dir === '@rue-js') continue
  if (dir === 'runtime-vapor') {
    continue
  }
  if (!nonSrcPackages.includes(dir)) {
    entries.push({ find: key, replacement: resolveEntryForPkg(dir) })

    const vaporEntry = resolveSubEntryForPkg(dir, 'vapor')
    if (existsSync(vaporEntry)) {
      entries.push({
        find: new RegExp(`^@rue-js/${dir}/vapor$`),
        replacement: vaporEntry,
      })
    }
  }
}

export { entries }

// additional alias for legacy '@rue-js/rue' import path
entries.push({ find: '@rue-js/rue', replacement: resolveEntryForPkg('rue') })
