// @vitest-environment jsdom

import fs from 'node:fs/promises'
import { execFile as execFileCallback } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { afterEach, describe, expect, it } from 'vitest'
import { build, type Rollup } from 'vite'

import { createStaticRouteHtml } from '@rue-js/server-renderer/static'
import VitePluginRue from '../index.mjs'

const fixtureRoot = path.resolve('packages/vite-plugin-rue/__tests__/fixtures/islands')
const repoRoot = path.resolve('.')
const temporaryRoots: string[] = []
const execFile = promisify(execFileCallback)

afterEach(async () => {
  delete globalThis.__rueIslandFixtureHydrationOrder
  await Promise.all(
    temporaryRoots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })),
  )
  document.body.innerHTML = ''
})

const buildFixture = async (outDir: string, input: string, ssr = false) => {
  const result = await build({
    configFile: false,
    root: fixtureRoot,
    logLevel: 'silent',
    plugins: [
      VitePluginRue({
        include: [fixtureRoot],
        transformTimeoutMs: 60_000,
      }),
    ],
    resolve: {
      conditions: ['development', 'browser'],
      alias: {
        ...Object.fromEntries(
          ['rue', 'runtime'].flatMap(pkg =>
            [
              'component',
              'block',
              'dom',
              'reactive',
              'hydrate',
              'ssr',
              'teleport',
              'transition',
              'transition-group',
              'keep-alive',
              'suspense',
            ].map(category => [
              `@rue-js/${pkg}/internal/${category}`,
              path.join(repoRoot, `packages/${pkg}/src/compiler-runtime/entries/${category}.ts`),
            ]),
          ),
        ),
        '@rue-js/rue/internal/compiler': path.join(
          repoRoot,
          'packages/rue/src/compiler-internal.ts',
        ),
        '@rue-js/runtime/internal/compiler': path.join(
          repoRoot,
          'packages/runtime/src/compiler-internal.ts',
        ),
        '@rue-js/rue': path.join(repoRoot, 'packages/rue/src'),
        '@rue-js/runtime': path.join(repoRoot, 'packages/runtime/src'),
        '@rue-js/server-renderer': path.join(repoRoot, 'packages/server-renderer/src'),
      },
    },
    build: {
      emptyOutDir: true,
      manifest: !ssr,
      minify: false,
      outDir,
      ssr: ssr ? input : false,
      target: 'es2022',
      write: true,
      rolldownOptions: {
        preserveEntrySignatures: 'strict',
        input,
        output: ssr
          ? { entryFileNames: 'entry-server.mjs', format: 'es' }
          : { entryFileNames: 'assets/[name]-[hash].js', format: 'es' },
      },
    },
    ssr: { noExternal: true },
  })
  return (Array.isArray(result) ? result[0] : result) as Rollup.RollupOutput
}

const collectStaticClosure = (bundle: Rollup.OutputBundle, entry: Rollup.OutputChunk) => {
  const assets = new Set<string>()
  const moduleIds = new Set<string>()
  const visit = (fileName: string) => {
    if (assets.has(`/${fileName}`)) return
    const chunk = bundle[fileName]
    if (!chunk || chunk.type !== 'chunk') return
    assets.add(`/${chunk.fileName}`)
    chunk.moduleIds.forEach(id => moduleIds.add(id))
    chunk.imports.forEach(visit)
  }
  visit(entry.fileName)
  return { entry: `/${entry.fileName}`, assets, moduleIds }
}

const template = `<!doctype html>
<html>
  <head>
    <link rel="stylesheet" href="/fixture.css">
    <link rel="modulepreload" href="/user-module.js">
    <script>document.documentElement.dataset.theme = 'fixture'</script>
    <script type="module" src="/user-module.js"></script>
  </head>
  <body><div id="app"></div><script nomodule src="/legacy.js"></script></body>
</html>`

const renderBuiltServerPages = async (serverEntryFile: string) => {
  const script = `
    const server = await import(${JSON.stringify(pathToFileURL(serverEntryFile).href)});
    const routes = ['static', 'load', 'only', 'nested'];
    const pages = Object.fromEntries(await Promise.all(
      routes.map(async route => [route, await server.renderFixturePage(route)]),
    ));
    process.stdout.write(JSON.stringify(pages));
  `
  const { stdout } = await execFile(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: process.cwd(),
    maxBuffer: 10 * 1024 * 1024,
  })
  return JSON.parse(stdout) as Record<'static' | 'load' | 'only' | 'nested', string>
}

describe('Rue island real build contract', () => {
  it('keeps static pages zero-JS and hydrates real lazy island chunks in parent-first order', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rue-islands-build-'))
    temporaryRoots.push(tempRoot)
    const clientOutDir = path.join(tempRoot, 'client')
    const serverOutDir = path.join(tempRoot, 'server')
    const clientEntry = path.join(fixtureRoot, 'entry-client.ts')
    const serverEntry = path.join(fixtureRoot, 'entry-server.tsx')

    const clientBuild = await buildFixture(clientOutDir, clientEntry)
    const serverBuild = await buildFixture(serverOutDir, serverEntry, true)

    const bundle = Object.fromEntries(clientBuild.output.map(output => [output.fileName, output]))
    const entryChunk = clientBuild.output.find(
      (output): output is Rollup.OutputChunk =>
        output.type === 'chunk' && output.isEntry && output.facadeModuleId === clientEntry,
    )
    expect(entryChunk).toBeTruthy()
    const clientGraph = collectStaticClosure(bundle, entryChunk!)
    const counterChunk = clientBuild.output.find(
      (output): output is Rollup.OutputChunk =>
        output.type === 'chunk' && output.moduleIds.some(id => id.includes('/components/Counter')),
    )
    const onlyChunk = clientBuild.output.find(
      (output): output is Rollup.OutputChunk =>
        output.type === 'chunk' &&
        output.moduleIds.some(id => id.includes('/components/OnlyPanel')),
    )
    const hydratedPanelChunk = clientBuild.output.find(
      (output): output is Rollup.OutputChunk =>
        output.type === 'chunk' &&
        output.moduleIds.some(id => id.includes('/components/HydratedPanel')),
    )
    const builtModuleIds = clientBuild.output.flatMap(output =>
      output.type === 'chunk' ? output.moduleIds : [],
    )
    const serverModuleIds = serverBuild.output.flatMap(output =>
      output.type === 'chunk' ? output.moduleIds : [],
    )
    expect([...builtModuleIds, ...serverModuleIds]).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/\.wasm$|\/pkg-(?:vapor|node)\//)]),
    )
    expect(counterChunk, `client modules: ${builtModuleIds.join(', ')}`).toBeTruthy()
    expect(onlyChunk, `client modules: ${builtModuleIds.join(', ')}`).toBeTruthy()
    expect(hydratedPanelChunk, `client modules: ${builtModuleIds.join(', ')}`).toBeTruthy()
    expect([...clientGraph.moduleIds]).toEqual(
      expect.arrayContaining([expect.stringContaining('compiler-runtime/hydrate-claim')]),
    )
    const hydratedPanelGraph = collectStaticClosure(bundle, hydratedPanelChunk!)
    expect([...hydratedPanelGraph.moduleIds]).toEqual(
      expect.arrayContaining([expect.stringContaining('compiler-runtime/hydrate-claim')]),
    )
    expect(builtModuleIds).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/dom\.hydrate|runtime-core\/js-runtime/)]),
    )
    expect(clientGraph.assets).not.toContain(`/${counterChunk!.fileName}`)
    expect(clientGraph.assets).not.toContain(`/${onlyChunk!.fileName}`)
    expect(entryChunk!.dynamicImports).toEqual(
      expect.arrayContaining([counterChunk!.fileName, onlyChunk!.fileName]),
    )

    const serverEntryChunk = serverBuild.output.find(
      (output): output is Rollup.OutputChunk => output.type === 'chunk' && output.isEntry,
    )
    expect(serverEntryChunk).toBeTruthy()
    const serverFiles = await fs.readdir(serverOutDir, { recursive: true })
    expect(serverFiles, `server output: ${serverFiles.join(', ')}`).toContain(
      serverEntryChunk!.fileName,
    )
    const pages = await renderBuiltServerPages(path.join(serverOutDir, serverEntryChunk!.fileName))
    const clientEntries = {
      app: { entry: '/unused-app.js', assets: new Set(['/unused-app.js']) },
      islands: clientGraph,
    }
    const html = {
      static: createStaticRouteHtml(template, pages.static, {
        clientMode: 'none',
        clientEntries,
      }),
      load: createStaticRouteHtml(template, pages.load, {
        clientMode: 'islands',
        clientEntries,
      }),
      only: createStaticRouteHtml(template, pages.only, {
        clientMode: 'islands',
        clientEntries,
      }),
      nested: createStaticRouteHtml(template, pages.nested, {
        clientMode: 'islands',
        clientEntries,
      }),
    }

    for (const output of Object.values(html)) {
      expect(output).toContain('/fixture.css')
      expect(output).toContain('/user-module.js')
      expect(output).toContain("dataset.theme = 'fixture'")
      expect(output).toContain('/legacy.js')
    }
    expect(html.static).not.toContain(clientGraph.entry)
    expect(html.static).not.toMatch(/<rue-island(?:\s|>)/)
    expect(html.load).toContain(clientGraph.entry)
    expect(html.load).toContain('<rue-island')
    expect(html.only).toContain('data-only-fallback')
    expect(html.only).toContain('only fallback')
    expect(html.only).not.toContain('data-only-client')
    expect(html.nested.match(/<rue-island/g)).toHaveLength(2)

    document.body.innerHTML = html.nested
    const nestedIds = [...document.querySelectorAll('rue-island')].map(island =>
      island.getAttribute('data-rue-id'),
    ) as string[]
    // Execute the emitted ESM in Node with a browser DOM; no second JSX transform.
    const hydrationScript = `
      import { createRequire } from 'node:module';
      const require = createRequire(${JSON.stringify(path.join(repoRoot, 'package.json'))});
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(${JSON.stringify(html.nested)}, {url:'http://localhost/'});
      for (const name of ['window','document','Node','Element','HTMLElement','MutationObserver','Event','CustomEvent']) {
        globalThis[name] = dom.window[name];
      }
      window.requestIdleCallback = callback => {
        queueMicrotask(() => callback({didTimeout:false,timeRemaining:()=>50})); return 1;
      };
      const client = await import(${JSON.stringify(pathToFileURL(path.join(clientOutDir, entryChunk!.fileName)).href)});
      const stop = client.startFixtureIslands();
      for (let i=0;i<100 && document.querySelectorAll('[data-rue-status="hydrated"]').length<2;i++) {
        await new Promise(resolve=>setTimeout(resolve,10));
      }
      const result = {
        order:globalThis.__rueIslandFixtureHydrationOrder ?? [],
        statuses:[...document.querySelectorAll('rue-island')].map(node=>node.getAttribute('data-rue-status'))
      };
      stop(); dom.window.close(); process.stdout.write(JSON.stringify(result));
    `
    const { stdout } = await execFile(
      process.execPath,
      ['--input-type=module', '--eval', hydrationScript],
      { cwd: repoRoot },
    )
    const hydrated = JSON.parse(stdout)
    expect(hydrated.order).toEqual(nestedIds)
    expect(hydrated.statuses).toEqual(['hydrated', 'hydrated'])
  }, 120_000)
})
