// @ts-check
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const forbidden = Object.freeze([
  /@rue-js\/runtime-vapor/g,
  /@rue-js\/rue\/vapor/g,
  /runtime\.vapor/g,
  /rue\.vapor/g,
  /_\$vapor[A-Za-z0-9_]*/g,
  /__rue_(?:runtime_)?vapor[A-Za-z0-9_]*/g,
  /vapor-helpers/g,
  /runtime-core\/js-runtime/g,
  /compiled-(?:legacy-dom|dom-bindings-legacy|render-anchor|dynamic)/g,
  /public\/rendering/g,
  /portable-renderable/g,
  /compiler-runtime\/dom-host-operations/g,
  /\b(?:DomFragmentLike|DomTextLike|ServerDOMAdapter|runWithServerDOMAdapter)\b/g,
  /\b(?:setDOMAdapter|getDOMAdapter|registerDOMBridgeConsumer)\b/g,
  /\b(?:interface DOMAdapter|class BrowserDOMAdapter)\b/g,
  /__rue_(?:dom\b|dom_adapter__|default_browser_dom_adapter__|dom_bridge_consumers__|compiled_dom_operation_adapter__)/g,
])
const forbiddenPaths = Object.freeze([
  'packages/runtime/src/runtime-core/js-runtime',
  'packages/runtime/src/compiled-legacy-dom.ts',
  'packages/runtime/src/compiled-dom-bindings-legacy.ts',
  'packages/runtime/src/compiled-render-anchor.ts',
  'packages/runtime/src/compiled-dynamic.ts',
  'packages/runtime/src/public/rendering.ts',
  'packages/runtime/src/compiled-dom.ts',
  'packages/runtime/src/compiler-runtime/dom-host-operations.ts',
  'packages/runtime/src/compiler-runtime/server-template.ts',
  'packages/runtime/src/dom.ts',
])
const roots = Object.freeze(['packages', 'app', 'scripts'])
const extensions = /\.(?:[cm]?[jt]sx?|rs|json|ya?ml)$/

/**
 * @param {string} root
 * @param {string} relative
 * @param {{sourceOnly?: boolean}} options
 * @returns {Promise<string[]>}
 */
async function files(root, relative, options) {
  let entries
  try {
    entries = await readdir(path.resolve(root, relative), { withFileTypes: true })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return []
    throw error
  }
  return (
    await Promise.all(
      entries.map(async entry => {
        const next = path.join(relative, entry.name)
        if (entry.isDirectory()) {
          if (['node_modules', '.git', 'temp', 'coverage', 'target'].includes(entry.name)) return []
          if (options.sourceOnly && entry.name === 'dist') return []
          return files(root, next, options)
        }
        return entry.isFile() && extensions.test(entry.name) ? [next] : []
      }),
    )
  ).flat()
}

/** @param {string} root @param {{sourceOnly?: boolean}} [options] */
export async function scanCompilerRuntimeBoundary(root, options = {}) {
  const candidates = new Set(['package.json', 'pnpm-lock.yaml'])
  for (const directory of roots)
    for (const file of await files(root, directory, options)) candidates.add(file)
  const violations = []
  for (const relative of forbiddenPaths) {
    try {
      await stat(path.resolve(root, relative))
      violations.push({ file: relative, line: 1, token: 'forbidden runtime path' })
    } catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT')
        throw error
    }
  }
  for (const relative of [...candidates].sort()) {
    if (
      relative === 'scripts/check-compiler-runtime-boundary.js' ||
      relative.includes('__tests__') ||
      relative.endsWith('-baseline.json') ||
      (relative.startsWith('scripts/') && relative.includes('audit'))
    )
      continue
    let content
    try {
      content = await readFile(path.resolve(root, relative), 'utf8')
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') continue
      throw error
    }
    for (const pattern of forbidden) {
      pattern.lastIndex = 0
      for (const match of content.matchAll(pattern)) {
        const line = content.slice(0, match.index).split('\n').length
        violations.push({ file: relative.split(path.sep).join('/'), line, token: match[0] })
      }
    }
  }
  return violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
}

/** @param {Array<{file: string, line: number, token: string}>} violations */
export function assertCompilerRuntimeBoundary(violations) {
  if (!violations.length) return
  throw new Error(
    `compiler/runtime boundary check failed:\n${violations.map(v => `- ${v.file}:${v.line} contains ${v.token}`).join('\n')}`,
  )
}

const moduleFile = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === moduleFile) {
  const { values } = parseArgs({
    options: {
      root: { type: 'string', default: process.cwd() },
      'compiler-only-target': { type: 'boolean', default: false },
    },
  })
  assertCompilerRuntimeBoundary(
    await scanCompilerRuntimeBoundary(path.resolve(values.root), { sourceOnly: true }),
  )
  console.log('Compiler/runtime boundary: clean')
  if (values['compiler-only-target']) {
    process.chdir(path.resolve(values.root))
    const { auditCompilerOnlyRuntime, assertCompilerOnlyRuntime } =
      await import('./compiler-only-runtime-audit.js')
    const report = await auditCompilerOnlyRuntime()
    for (const [name, result] of Object.entries(report.scenarios))
      console.log(`${name}: gzip ${result.gzip} B`)
    assertCompilerOnlyRuntime(report)
  }
}
