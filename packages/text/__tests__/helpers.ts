/**
 * Test helpers for text integration tests.
 *
 * Eliminates boilerplate for:
 * - Creating Pages Router / App Router dev servers
 * - Fetching pages and asserting on responses
 * - Static export setup
 */

import http, { type IncomingHttpHeaders } from 'node:http'
import fs from 'node:fs/promises'
import { TextDecoder, TextEncoder } from 'node:util'
import { createBuilder, createServer, build, type ViteDevServer } from 'vite'
import text, { type TextOptions } from '../src/index.js'
import path from 'node:path'

// ── Fixture paths ─────────────────────────────────────────────
export const PAGES_FIXTURE_DIR = path.resolve(import.meta.dirname, './fixtures/pages-basic')
export const APP_FIXTURE_DIR = path.resolve(import.meta.dirname, './fixtures/app-basic')
export const PAGES_I18N_DOMAINS_FIXTURE_DIR = path.resolve(
  import.meta.dirname,
  './fixtures/pages-i18n-domains',
)
export const PAGES_I18N_DOMAINS_BASEPATH_FIXTURE_DIR = path.resolve(
  import.meta.dirname,
  './fixtures/pages-i18n-domains-basepath',
)

async function mkdtempInTextTestTmp(prefix: string): Promise<string> {
  const testTmpRoot = path.resolve(import.meta.dirname, '.test-tmp')
  await fs.mkdir(testTmpRoot, { recursive: true })
  return fs.mkdtemp(path.join(testTmpRoot, prefix))
}

function installNodeTextEncodingGlobals(): void {
  globalThis.Uint8Array = Object.getPrototypeOf(Buffer) as Uint8ArrayConstructor
  globalThis.TextEncoder = TextEncoder
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder
}

// ── Shared RSC virtual module entries (used by @vitejs/plugin-rsc) ──
export const RSC_ENTRIES = {
  rsc: 'virtual:text-rsc-entry',
  ssr: 'virtual:text-app-ssr-entry',
  client: 'virtual:text-app-browser-entry',
} as const

// ── Server lifecycle helper ───────────────────────────────────

export type TestServerResult = {
  server: ViteDevServer
  baseUrl: string
}

async function resolveFixturePackageAliases(fixtureDir: string): Promise<Record<string, string>> {
  const packagesDir = path.join(fixtureDir, '__test_packages__')
  const aliases: Record<string, string> = {}
  let entries: string[]
  try {
    entries = await fs.readdir(packagesDir)
  } catch {
    return aliases
  }

  await Promise.all(
    entries.map(async entry => {
      const packageDir = path.join(packagesDir, entry)
      const packageJsonPath = path.join(packageDir, 'package.json')
      try {
        const stat = await fs.stat(packageDir)
        if (!stat.isDirectory()) return
        const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as {
          exports?: string | Record<string, unknown>
          main?: string
          name?: string
        }
        if (!pkg.name) return
        const exportRoot =
          typeof pkg.exports === 'string'
            ? pkg.exports
            : typeof pkg.exports?.['.'] === 'string'
              ? pkg.exports['.']
              : (pkg.main ?? 'index.js')
        aliases[pkg.name] = path.join(packageDir, exportRoot)
      } catch {
        // Ignore malformed fixture packages; normal dependency resolution will report them.
      }
    }),
  )

  return aliases
}

/**
 * Start a Vite dev server against a fixture directory.
 *
 * text() auto-registers @vitejs/plugin-rsc when an app/ directory is
 * detected, so callers do NOT need to inject rsc() manually.
 *
 * @param fixtureDir - Path to the fixture directory
 * @param opts.listen - If false, creates server without listening (default: true)
 */
export async function startFixtureServer(
  fixtureDir: string,
  opts?: {
    appRouter?: boolean
    listen?: boolean
    server?: {
      host?: string
      allowedHosts?: true | string[]
      cors?: boolean
      port?: number
    }
    textOptions?: Omit<TextOptions, 'appDir'>
  },
): Promise<TestServerResult> {
  // text() auto-registers @vitejs/plugin-rsc when app/ is detected.
  // Pass appDir explicitly since tests run with configFile: false and
  // cwd may not be the fixture directory.
  // Note: opts.appRouter is accepted but unused — text auto-detects.
  const plugins = [text({ ...opts?.textOptions, appDir: fixtureDir })]
  const fixturePackageAliases = await resolveFixturePackageAliases(fixtureDir)
  const cacheDir = await mkdtempInTextTestTmp('text-vite-cache-')

  const server = await createServer({
    root: fixtureDir,
    cacheDir,
    configFile: false,
    plugins,
    resolve: {
      alias: fixturePackageAliases,
    },
    // Vite may discover additional deps after the first request (especially
    // with @vitejs/plugin-rsc environments) and trigger a re-optimization.
    // In non-browser test clients, we can't "reload" and would otherwise
    // see Vite's "outdated pre-bundle" error responses.
    optimizeDeps: {
      holdUntilCrawlEnd: true,
    },
    server: {
      port: 0,
      cors: false,
      ...opts?.server,
    },
    logLevel: 'silent',
  })
  const originalClose = server.close.bind(server)
  server.close = async () => {
    try {
      await originalClose()
    } finally {
      await fs.rm(cacheDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    }
  }

  let baseUrl = ''
  if (opts?.listen !== false) {
    await server.listen()
    const addr = server.httpServer?.address()
    if (addr && typeof addr === 'object') {
      baseUrl = `http://localhost:${addr.port}`
    }
  }

  return { server, baseUrl }
}

// ── Fetch helpers ─────────────────────────────────────────────

/**
 * Fetch a page and return both the Response and the HTML text.
 */
export async function fetchHtml(
  baseUrl: string,
  urlPath: string,
  init?: RequestInit,
): Promise<{ res: Response; html: string }> {
  const res = await fetch(`${baseUrl}${urlPath}`, init)
  const html = stripRueSsrMarkers(await res.text())
  return { res, html }
}

/**
 * Rue's compiled SSR output contains comment anchors used by hydration. Most
 * integration assertions care about the browser-visible HTML rather than the
 * internal anchor ABI, so remove only Rue-owned markers before comparing it.
 */
export function stripRueSsrMarkers(html: string): string {
  return html.replace(/<!--\/?r:[\s\S]*?-->/g, '')
}

export function extractTextSnippet(
  text: string,
  needle: string,
  options?: { radius?: number; missingLabel?: string },
): string {
  const radius = options?.radius ?? 160
  const index = text.indexOf(needle)
  if (index === -1) {
    return options?.missingLabel ?? `<missing ${JSON.stringify(needle)}>`
  }

  const start = Math.max(0, index - radius)
  const end = Math.min(text.length, index + needle.length + radius)
  const prefix = start === 0 ? '' : '...'
  const suffix = end === text.length ? '' : '...'
  return `${prefix}${text.slice(start, end)}${suffix}`
}

/**
 * Fetch a JSON endpoint and return both the Response and parsed data.
 */
export async function fetchJson(
  baseUrl: string,
  urlPath: string,
  init?: RequestInit,
  // oxlint-disable-text-line typescript/no-explicit-any
): Promise<{ res: Response; data: any }> {
  const res = await fetch(`${baseUrl}${urlPath}`, init)
  const data = await res.json()
  return { res, data }
}

export type NodeHttpResponse = {
  status: number
  headers: IncomingHttpHeaders
  body: string
}

export async function createIsolatedFixture(
  fixtureDir: string,
  prefix: string,
  filter?: (src: string) => boolean,
  nodeModulesDir?: string,
): Promise<string> {
  const tmpDir = await mkdtempInTextTestTmp(prefix)
  // Skip generated artefacts during copy. Full test runs may build into shared
  // fixture dist/out directories in parallel, so isolated fixture copies must
  // only clone source files.
  await fs.cp(fixtureDir, tmpDir, {
    recursive: true,
    filter: src => {
      const relative = path.relative(fixtureDir, src)
      const segments = relative.split(path.sep)
      const isGenerated =
        segments.includes('node_modules') ||
        segments.includes('.vite') ||
        segments.includes('dist') ||
        segments.includes('out') ||
        segments.some(segment => segment.startsWith('out-temp-'))
      return !isGenerated && (filter == null || filter(src))
    },
  })

  const resolvedNodeModules =
    nodeModulesDir ?? path.resolve(import.meta.dirname, '../../../node_modules')
  await fs.symlink(resolvedNodeModules, path.join(tmpDir, 'node_modules'), 'junction')

  return tmpDir
}

export async function requestNodeServerWithHost(
  port: number,
  requestPath: string,
  host: string,
  headers: Record<string, string> = {},
): Promise<NodeHttpResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: requestPath,
        method: 'GET',
        headers: {
          Host: host,
          ...headers,
        },
      },
      res => {
        const chunks: Buffer[] = []
        res.on('data', chunk => chunks.push(Buffer.from(chunk)))
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        })
      },
    )
    req.on('error', reject)
    req.end()
  })
}

/**
 * Build a Pages Router fixture's SSR server bundle into a fresh tmpdir.
 *
 * Returns the path to the built bundle (`entry.js`).
 */
export async function buildPagesFixture(fixtureDir: string): Promise<string> {
  const serverOutDir = path.join(await mkdtempInTextTestTmp('text-pages-build-'), 'server')

  // Use disableAppRouter: true so the RSC/App Router pipeline is not activated.
  // This is required when the fixture has both app/ and pages/ directories
  // (hybrid); we only want the Pages Router SSR bundle here.
  await build({
    root: fixtureDir,
    configFile: false,
    plugins: [text({ disableAppRouter: true })],
    logLevel: 'silent',
    build: {
      outDir: serverOutDir,
      emptyOutDir: true,
      ssr: 'virtual:text-server-entry',
      rollupOptions: {
        output: { entryFileNames: 'entry.js' },
      },
    },
  })

  return path.join(serverOutDir, 'entry.js')
}

/**
 * Build an App Router fixture's RSC/SSR/client bundles.
 *
 * Callers that run against shared fixtures should use buildIsolatedAppFixture()
 * so the default dist/ output stays scoped to a per-test fixture copy.
 *
 * Returns the path to the built RSC bundle (`<fixture>/dist/server/index.js`).
 */
export async function buildAppFixture(fixtureDir: string): Promise<string> {
  const builder = await createBuilder({
    root: fixtureDir,
    configFile: false,
    plugins: [text({ appDir: fixtureDir })],
    logLevel: 'silent',
  })
  await builder.buildApp()

  return path.join(fixtureDir, 'dist', 'server', 'index.js')
}

export async function buildIsolatedAppFixture(
  fixtureDir: string,
  prefix = 'text-app-fixture-',
): Promise<{ fixtureDir: string; rscBundlePath: string }> {
  const isolatedFixtureDir = await createIsolatedFixture(fixtureDir, prefix)
  const rscBundlePath = await buildAppFixture(isolatedFixtureDir)
  return { fixtureDir: isolatedFixtureDir, rscBundlePath }
}

/**
 * Build the `__tests__/fixtures/cf-app-basic` fixture as a Cloudflare Workers
 * bundle in-process using `createBuilder` + `@cloudflare/vite-plugin`.
 *
 * The CF plugin is loaded from the workspace root devDependencies.
 *
 * Both the App Router and Pages Router are served by the same Workers bundle —
 * there is no separate plain-Node SSR bundle for Pages Router. All prerendering
 * for both routers goes through a locally-spawned prod server over HTTP, the
 * same path used for plain Node builds.
 *
 * Returns `{ root, rscBundlePath }`.
 */
export async function buildCloudflareAppFixture(fixtureDir: string): Promise<{
  root: string
  rscBundlePath: string
}> {
  const tmpDir = await createIsolatedFixture(fixtureDir, 'text-cf-build-')
  installNodeTextEncodingGlobals()
  const { cloudflare } = (await import('@cloudflare/vite-plugin')) as unknown as {
    cloudflare: (opts?: {
      viteEnvironment?: { name: string; childEnvironments?: string[] }
    }) => import('vite').Plugin
  }

  const { createBuilder } = await import('vite')
  const builder = await createBuilder({
    root: tmpDir,
    configFile: false,
    plugins: [
      text({ appDir: tmpDir }),
      cloudflare({ viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] } }),
    ],
    logLevel: 'silent',
  })
  await builder.buildApp()

  return {
    root: tmpDir,
    rscBundlePath: path.join(tmpDir, 'dist', 'server', 'index.js'),
  }
}
