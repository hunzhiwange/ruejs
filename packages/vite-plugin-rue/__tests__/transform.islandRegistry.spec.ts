// @vitest-environment jsdom

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import VitePluginRue, {
  RUE_ISLAND_CLIENT_ID,
  RUE_ISLAND_MANIFEST_ID,
  RUE_ISLAND_REGISTRY_ID,
} from '../index.mjs'

const temporaryRoots: string[] = []

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true })
  }
})

const callHook = async (hook: any, ctx: any, ...args: any[]) => {
  if (typeof hook === 'function') return hook.call(ctx, ...args)
  return hook.handler.call(ctx, ...args)
}

const createFixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rue-island-registry-'))
  temporaryRoots.push(root)
  const src = path.join(root, 'src')
  fs.mkdirSync(src)
  fs.writeFileSync(
    path.join(src, 'Page.tsx'),
    `
      import Counter from './Counter'
      import { Chart as RevenueChart } from './Chart'
      export const Page = () => (
        <main>
          <Counter client:load count={1} />
          <RevenueChart client:visible />
        </main>
      )
    `,
  )
  fs.writeFileSync(
    path.join(src, 'Other.tsx'),
    `
      import Counter from './Counter'
      export const Other = () => <Counter client:idle count={2} />
    `,
  )
  fs.mkdirSync(path.join(root, 'dist'))
  fs.writeFileSync(
    path.join(root, 'dist', 'Ignored.tsx'),
    `import Ignored from './Ignored'; export const App = () => <Ignored client:load />`,
  )
  return { root, src }
}

const createPlugin = (root: string) =>
  VitePluginRue({
    include: [path.join(root, 'src')],
    transformTimeoutMs: 0,
  }) as any

const loadVirtual = async (plugin: any, id: string) => {
  const resolved = await callHook(plugin.resolveId, {}, id)
  expect(resolved).toBeTruthy()
  return String(await callHook(plugin.load, {}, resolved))
}

describe('vite-plugin-rue island registry', () => {
  it('skips generated Cargo target trees during pre-indexing', async () => {
    const { root, src } = createFixture()
    const target = path.join(src, 'target')
    fs.mkdirSync(target)
    const generated = path.join(target, 'Generated.tsx')
    fs.writeFileSync(
      generated,
      `import Generated from './Generated'; export const Page = () => <Generated client:load />`,
    )
    const plugin = createPlugin(root)
    plugin.configResolved?.({ command: 'serve', root })
    const watched: string[] = []

    await callHook(plugin.buildStart, { addWatchFile: (file: string) => watched.push(file) })

    expect(watched).not.toContain(generated)
    expect(await loadVirtual(plugin, RUE_ISLAND_REGISTRY_ID)).not.toContain('Generated')
  })

  it('keeps pre-indexed descriptor ids stable when the same source is transformed again', async () => {
    const { root, src } = createFixture()
    const plugin = createPlugin(root)
    plugin.configResolved?.({ command: 'serve', root })
    await callHook(plugin.buildStart, { addWatchFile() {} })

    const manifestBeforeTransform = await loadVirtual(plugin, RUE_ISLAND_MANIFEST_ID)
    const loadId = manifestBeforeTransform.match(/"(rue-[^"]+)":\s*\{[^}]*"hydrate":\s*"load"/)?.[1]
    expect(loadId).toBeTruthy()

    const page = path.join(src, 'Page.tsx')
    const source = fs.readFileSync(page, 'utf8')
    const transformed = await callHook(
      plugin.transform,
      { environment: { name: 'ssr' } },
      source,
      page,
    )

    expect(String(transformed?.code ?? '')).toContain(`"id": "${loadId}"`)
  })

  it('pre-indexes direct imports before virtual modules load and emits deterministic importers', async () => {
    const { root, src } = createFixture()
    const plugin = createPlugin(root)
    plugin.configResolved?.({ command: 'serve', root })
    const watched: string[] = []

    await callHook(plugin.buildStart, { addWatchFile: (file: string) => watched.push(file) })

    const registry = await loadVirtual(plugin, RUE_ISLAND_REGISTRY_ID)
    const manifest = await loadVirtual(plugin, RUE_ISLAND_MANIFEST_ID)
    const counterSource = path.join(src, 'Counter').split(path.sep).join('/')
    const chartSource = path.join(src, 'Chart').split(path.sep).join('/')

    expect(registry).toContain(`import(${JSON.stringify(counterSource)})`)
    expect(registry).toContain(`import(${JSON.stringify(chartSource)})`)
    expect(registry).toContain('default: module.default')
    expect(registry).toContain('default: module["Chart"]')
    expect(registry.match(new RegExp(JSON.stringify(counterSource), 'g'))).toHaveLength(2)
    expect(registry).not.toContain('Ignored')
    expect(manifest).toContain('"hydrate": "load"')
    expect(manifest).toContain('"hydrate": "visible"')
    expect(manifest).toContain('"hydrate": "idle"')
    expect(watched.sort()).toEqual([path.join(src, 'Other.tsx'), path.join(src, 'Page.tsx')].sort())

    const importerIds = Array.from(registry.matchAll(/^  ("rue-[^"]+"):/gm), match => match[1])
    expect(importerIds).toEqual([...importerIds].sort())
  })

  it('exports an explicit client starter without starting during module evaluation', async () => {
    const { root } = createFixture()
    const plugin = createPlugin(root)
    plugin.configResolved?.({ command: 'serve', root })
    await callHook(plugin.buildStart, { addWatchFile() {} })

    const client = await loadVirtual(plugin, RUE_ISLAND_CLIENT_ID)

    expect(client).toContain('startRueIslandLoader')
    expect(client).toContain('resolveRueIslandModule')
    expect(client).toContain('export const startRueIslands =')
    expect(client).toContain('entry: id')
    expect(client).not.toMatch(/(?:^|\n)startRueIslands\(\)/)
  })

  it('removes stale registry and manifest entries after transform or file deletion', async () => {
    const { root, src } = createFixture()
    const plugin = createPlugin(root)
    plugin.configResolved?.({ command: 'serve', root })
    await callHook(plugin.buildStart, { addWatchFile() {} })
    const page = path.join(src, 'Page.tsx')

    await callHook(
      plugin.transform,
      {},
      `import Counter from './Counter'; export const Page = () => <Counter />`,
      page,
    )
    let registry = await loadVirtual(plugin, RUE_ISLAND_REGISTRY_ID)
    let manifest = await loadVirtual(plugin, RUE_ISLAND_MANIFEST_ID)
    expect(registry).not.toContain(path.join(src, 'Chart').split(path.sep).join('/'))
    expect(manifest).not.toContain('"hydrate": "visible"')

    await callHook(plugin.watchChange, {}, path.join(src, 'Other.tsx'), { event: 'delete' })
    registry = await loadVirtual(plugin, RUE_ISLAND_REGISTRY_ID)
    manifest = await loadVirtual(plugin, RUE_ISLAND_MANIFEST_ID)
    expect(registry).not.toContain(path.join(src, 'Counter').split(path.sep).join('/'))
    expect(manifest).toBe('export const manifest = {};\nexport default manifest;\n')
  })
})
