import { readdirSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const testsDir = path.resolve(process.cwd(), '__tests__')
const excludedDirs = new Set(['_msw', 'e2e', 'fixtures', 'textjs-compat'])
const excludedFiles = new Set([
  'api-handler.test.ts',
  'app-router.test.ts',
  'asset-prefix.test.ts',
  'build-time-classification-integration.test.ts',
  'draft-secret-exposure.test.ts',
  'features.test.ts',
  'image-optimization-parity.test.ts',
  'invalid-static-asset-404.test.ts',
  'jsx-in-js.test.ts',
  'node-modules-css.test.ts',
  'pages-i18n-prod.test.ts',
  'pages-router-concurrency.test.ts',
  'pages-router.test.ts',
  'prerender.test.ts',
  'prod-server-logs.test.ts',
  'run-prerender-concurrency.test.ts',
  'script-head-ordering.test.ts',
  'scss.test.ts',
  'standalone-build.test.ts',
  'static-export.test.ts',
  'vite-hmr-websocket.test.ts',
])

function collectTestFiles(dir, prefix = '') {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (excludedDirs.has(entry.name)) continue
      files.push(...collectTestFiles(path.join(dir, entry.name), path.join(prefix, entry.name)))
      continue
    }

    if (!/\.test\.tsx?$/.test(entry.name)) continue
    if (prefix === '' && excludedFiles.has(entry.name)) continue
    files.push(
      path.posix.join('__tests__', prefix.split(path.sep).join(path.posix.sep), entry.name),
    )
  }

  return files
}

const files = collectTestFiles(testsDir).sort()

if (files.length === 0) {
  console.error('No @rue-js/text unit test files found.')
  process.exit(1)
}

const result = spawnSync(
  'pnpm',
  ['exec', 'vp', 'test', 'run', ...files, '--environment', 'jsdom', '--teardownTimeout', '60000'],
  { cwd: process.cwd(), stdio: 'inherit' },
)

process.exit(result.status ?? 1)
