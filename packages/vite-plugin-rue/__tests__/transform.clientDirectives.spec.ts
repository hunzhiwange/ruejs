// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import VitePluginRue, { RUE_ISLAND_MANIFEST_ID } from '../index.mjs'

const createPlugin = () =>
  VitePluginRue({
    include: ['/app/'],
    transformTimeoutMs: 0,
  }) as any

const callHook = async (hook: any, ctx: any, ...args: any[]) => {
  if (typeof hook === 'function') {
    return hook.call(ctx, ...args)
  }
  return hook.handler.call(ctx, ...args)
}

const readManifest = async (plugin: any) => {
  const resolvedId = await callHook(plugin.resolveId, {}, RUE_ISLAND_MANIFEST_ID)
  const manifestModule = String(await callHook(plugin.load, {}, resolvedId))
  const marker = 'export const manifest = '
  const start = manifestModule.indexOf(marker)
  const end = manifestModule.indexOf(';\nexport default manifest;', start)
  const json = manifestModule.slice(start + marker.length, end)
  return JSON.parse(json)
}

describe('vite-plugin-rue client directives', () => {
  it('rewrites server graph islands to compiled factories and exposes a manifest', async () => {
    const plugin = createPlugin()
    plugin.configResolved?.({ command: 'serve' })

    const source = `
      import Counter from './Counter'
      import { Chart as RevenueChart } from './Chart'

      export const App = () => (
        <main>
          <Counter client:visible count={1} />
          <RevenueChart client:media="(min-width: 768px)" />
          <Counter client:none />
        </main>
      )
    `

    const result = await callHook(
      plugin.transform,
      { environment: { name: 'ssr' } },
      source,
      '/Users/Shared/work/dir/data/codes/rue/app/IslandDemo.tsx',
    )
    const code = String(result?.code ?? '')

    expect(code).toContain('/* RUE_TRANSFORMED */')
    expect(code).not.toContain('client:visible')
    expect(code).not.toContain('client:media')
    expect(code).not.toContain('client:none')
    expect(code).toContain('CompiledIsland as RueCompiledIsland')
    expect(code).toMatch(/_\$writeComponent\(_\$ctx, "\d+", RueCompiledIsland/)
    expect(code).toContain('component: Counter')
    expect(code).toContain('component: RevenueChart')
    expect(code).toContain('props: {')
    expect(code).toContain('"count": 1')

    const manifestModule = String(
      await callHook(plugin.load, {}, await callHook(plugin.resolveId, {}, RUE_ISLAND_MANIFEST_ID)),
    )
    expect(manifestModule).toContain('export const manifest')
    expect(manifestModule).toContain('"hydrate": "visible"')
    expect(manifestModule).toContain('"hydrate": "media"')
    expect(manifestModule).not.toContain('"hydrate": "none"')
    expect(manifestModule).toContain('"component": "./Counter"')
    expect(manifestModule).toContain('"component": "./Chart"')
    expect(manifestModule).toContain('"media": "(min-width: 768px)"')
  })

  it('keeps client:none static without a descriptor or manifest entry', async () => {
    const plugin = createPlugin()
    plugin.configResolved?.({ command: 'serve' })

    const result = await callHook(
      plugin.transform,
      { environment: { name: 'ssr' } },
      `
        const LocalPanel = () => <button>Local</button>

        export const App = () => <LocalPanel client:none />
      `,
      '/Users/Shared/work/dir/data/codes/rue/app/StaticLocal.tsx',
    )

    const code = String(result?.code ?? '')
    expect(code).not.toContain('client:none')
    expect(code).not.toContain('createRueIslandDescriptor')
    expect(await readManifest(plugin)).toEqual({})
  })

  it('records static interaction arrays for named direct imports', async () => {
    const plugin = createPlugin()
    plugin.configResolved?.({ command: 'serve' })
    const id = '/Users/Shared/work/dir/data/codes/rue/app/InteractionIsland.tsx'

    const result = await callHook(
      plugin.transform,
      { environment: { name: 'ssr' } },
      `
        import { LocalPanel } from './LocalPanel'
        export const App = () => (
          <LocalPanel client:interaction={['pointerdown', 'focus']} />
        )
      `,
      id,
    )

    expect(String(result?.code ?? '')).not.toContain('client:interaction')

    const manifest = await readManifest(plugin)
    const entries = Object.values(manifest) as any[]
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      component: './LocalPanel',
      entry: './LocalPanel',
      exportName: 'LocalPanel',
      hydrate: 'interaction',
      interaction: ['pointerdown', 'focus'],
    })
  })

  it('records idle timeout and visible rootMargin static options', async () => {
    const plugin = createPlugin()
    plugin.configResolved?.({ command: 'serve' })

    await callHook(
      plugin.transform,
      { environment: { name: 'ssr' } },
      `
        import IdlePanel from './IdlePanel'
        import VisiblePanel from './VisiblePanel'
        export const App = () => (
          <main>
            <IdlePanel client:idle={{ timeout: 500 }} />
            <VisiblePanel client:visible={{ rootMargin: '200px 10%' }} />
          </main>
        )
      `,
      '/Users/Shared/work/dir/data/codes/rue/app/ScheduledIslands.tsx',
    )

    const entries = Object.values(await readManifest(plugin)) as any[]
    expect(entries.find(entry => entry.hydrate === 'idle')).toMatchObject({ timeout: 500 })
    expect(entries.find(entry => entry.hydrate === 'visible')).toMatchObject({
      rootMargin: '200px 10%',
    })
  })

  it('rejects invalid or dynamic scheduler options with directive and file context', async () => {
    const cases = [
      `<Panel client:idle={{ timeout: -1 }} />`,
      `<Panel client:idle={{ timeout: Infinity }} />`,
      `<Panel client:idle={{ timeout }} />`,
      `<Panel client:visible={{ rootMargin: 'soon' }} />`,
      `<Panel client:visible={{ rootMargin }} />`,
    ]

    for (const usage of cases) {
      const plugin = createPlugin()
      plugin.configResolved?.({ command: 'serve' })
      await expect(
        callHook(
          plugin.transform,
          {},
          `import Panel from './Panel'; export const App = () => ${usage}`,
          '/Users/Shared/work/dir/data/codes/rue/app/InvalidSchedule.tsx',
        ),
      ).rejects.toThrow(/client:(?:idle|visible).*InvalidSchedule\.tsx/)
    }
  })

  it('rejects local, dynamic, namespace, native, and directive spread targets', async () => {
    const cases = [
      {
        source: `const Local = () => <p />; export const App = () => <Local client:load />`,
        pattern: /direct default or named import.*LocalIsland\.tsx.*<Local>/,
      },
      {
        source: `const Tag = getTag(); export const App = () => <Tag client:visible />`,
        pattern: /direct default or named import.*LocalIsland\.tsx.*<Tag>/,
      },
      {
        source: `import * as Widgets from './widgets'; export const App = () => <Widgets.Panel client:load />`,
        pattern: /namespace or member.*LocalIsland\.tsx.*<Widgets\.Panel>/,
      },
      {
        source: `export const App = () => <button client:load />`,
        pattern: /native element.*LocalIsland\.tsx.*<button>/,
      },
      {
        source: `import Counter from './Counter'; export const App = () => <Counter {...{ 'client:load': true }} />`,
        pattern: /spread.*LocalIsland\.tsx.*<Counter>/,
      },
    ]

    for (const { source, pattern } of cases) {
      const plugin = createPlugin()
      plugin.configResolved?.({ command: 'serve' })
      await expect(
        callHook(
          plugin.transform,
          {},
          source,
          '/Users/Shared/work/dir/data/codes/rue/app/LocalIsland.tsx',
        ),
      ).rejects.toThrow(pattern)
    }
  })

  it('rejects components with multiple client:* directives', async () => {
    const plugin = createPlugin()
    plugin.configResolved?.({ command: 'serve' })

    await expect(
      callHook(
        plugin.transform,
        {},
        `
          import Counter from './Counter'
          export const App = () => <Counter client:load client:visible />
        `,
        '/Users/Shared/work/dir/data/codes/rue/app/DuplicateIsland.tsx',
      ),
    ).rejects.toThrow(/Only one client:\* directive/)
  })

  it('keeps client:only fallback outside client props and avoids helper name collisions', async () => {
    const plugin = createPlugin()
    plugin.configResolved?.({ command: 'serve' })

    const result = await callHook(
      plugin.transform,
      { environment: { name: 'ssr' } },
      `
        import Widget from './Widget'
        const RueCompiledIsland = 'occupied'
        export const App = () => (
          <Widget client:only fallback={<p>loading</p>} label="ready" />
        )
      `,
      '/Users/Shared/work/dir/data/codes/rue/app/OnlyIsland.tsx',
    )
    const code = String(result?.code ?? '')

    expect(code).toContain('CompiledIsland as RueCompiledIsland1')
    expect(code).toContain('fallback: async (_$ctx)=>{')
    expect(code).not.toContain('<p>loading</p>')
    expect(code).toContain('"label": "ready"')
    expect(code).not.toMatch(/props:\s*\{[^}]*fallback/s)
  })

  it('clears stale manifest entries when a module no longer contains client directives', async () => {
    const plugin = createPlugin()
    plugin.configResolved?.({ command: 'serve' })
    const id = '/Users/Shared/work/dir/data/codes/rue/app/HotIsland.tsx'

    await callHook(
      plugin.transform,
      { environment: { name: 'ssr' } },
      `
        import Counter from './Counter'
        export const App = () => <Counter client:load />
      `,
      id,
    )
    expect(Object.keys(await readManifest(plugin))).toHaveLength(1)

    await callHook(
      plugin.transform,
      { environment: { name: 'ssr' } },
      `
        import Counter from './Counter'
        export const App = () => <Counter />
      `,
      id,
    )
    expect(Object.keys(await readManifest(plugin))).toHaveLength(0)
  })
})
