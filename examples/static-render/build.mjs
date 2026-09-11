import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStaticRouteHtml, renderStaticRoutes } from '@rue-js/server-renderer/static'
import { build, createServer } from 'vite'
import {
  createRueExampleAliases,
  createRueExampleDefine,
  createRueExamplePlugins,
} from '../shared/rue-vite.mjs'
import { findAvailablePort } from '../shared/ports.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(root, 'dist')
const clientDir = path.resolve(distDir, 'client')

const normalizeTemplateForStaticHtml = template => template.replace('<!--app-html-->', '')

const createConfig = ({ ssr = false } = {}) => ({
  root,
  cacheDir: path.resolve(root, ssr ? 'node_modules/.vite-rue-server' : 'node_modules/.vite-rue-client'),
  configFile: false,
  publicDir: false,
  appType: ssr ? 'custom' : 'spa',
  plugins: createRueExamplePlugins({ target: ssr ? 'server' : 'client' }),
  resolve: {
    conditions: ssr ? ['development', 'node'] : ['development', 'browser'],
    alias: createRueExampleAliases({ ssr }),
  },
  define: createRueExampleDefine({ dev: false, ssr }),
})

const assertStaticRenderSucceeded = result => {
  if (result.summary.fatalFailures === 0) {
    return
  }

  const failure = result.snapshotFailures[0]
  const detail =
    failure?.ssrError instanceof Error ? failure.ssrError.message : String(failure?.ssrError)
  throw new Error(`Static render failed for ${failure?.route || 'unknown route'}: ${detail}`)
}

await rm(distDir, { recursive: true, force: true })

await build({
  ...createConfig(),
  build: {
    outDir: clientDir,
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(root, 'index.html'),
    },
  },
})

const template = normalizeTemplateForStaticHtml(
  await readFile(path.resolve(clientDir, 'index.html'), 'utf-8'),
)
const hmrPort = await findAvailablePort(process.env.STATIC_RENDER_HMR_PORT || 24678)
const vite = await createServer({
  ...createConfig({ ssr: true }),
  server: {
    hmr: {
      port: hmrPort,
    },
    middlewareMode: true,
  },
})

try {
  const serverEntry = await vite.ssrLoadModule('/src/entry-server.tsx')
  const result = await renderStaticRoutes({
    routes: serverEntry.staticRoutes,
    outDir: clientDir,
    concurrency: 1,
    renderRoute: ({ route }) => serverEntry.render(route),
    renderHtml: ({ html }) => createStaticRouteHtml(template, html),
  })

  assertStaticRenderSucceeded(result)
} finally {
  await vite.close()
}

console.log(`Static Rue demo built at ${path.relative(process.cwd(), clientDir)}`)
