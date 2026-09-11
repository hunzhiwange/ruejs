// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import VitePluginRue, { RUE_SERVER_ISLAND_REGISTRY_ID } from '../index.mjs'

const createPlugin = () =>
  VitePluginRue({
    include: ['/app/'],
    transformTimeoutMs: 0,
  }) as any

const callHook = async (hook: any, ctx: any, ...args: any[]) => {
  if (typeof hook === 'function') return hook.call(ctx, ...args)
  return hook.handler.call(ctx, ...args)
}

const transform = async (source: string, ssr: boolean) => {
  const plugin = createPlugin()
  plugin.configResolved?.({ command: 'serve' })
  const context = { environment: { name: ssr ? 'ssr' : 'client' } }
  const result = await callHook(
    plugin.transform,
    context,
    source,
    '/Users/Shared/work/dir/data/codes/rue/app/DeferredPage.tsx',
    { ssr },
  )
  return { plugin, code: String(result?.code ?? '') }
}

describe('vite-plugin-rue server:defer', () => {
  it('lowers direct imports to writer factories and a server-only registry', async () => {
    const { plugin, code } = await transform(
      `
        import Report from './Report'
        import { Chart as RevenueChart } from './Chart'
        export const Page = () => (
          <main>
            <Report server:defer fallback={<p>Loading report</p>} accountId="a-1" />
            <RevenueChart server:defer fallback={<p>Loading chart</p>} />
          </main>
        )
      `,
      true,
    )

    expect(code).not.toContain('server:defer')
    expect(code).toContain('CompiledServerIsland as RueCompiledServerIsland')
    expect(code).toMatch(/_\$writeComponent\(_\$ctx, "\d+", RueCompiledServerIsland/)
    expect(code).toContain('id: "rue-server-')
    expect(code).toContain('props: {')
    expect(code).toContain('"accountId": "a-1"')
    expect(code).toMatch(/_\$writeElement\(_\$ctx, "\d+", "p"/)
    expect(code).not.toContain('<p>Loading report</p>')
    expect(code).not.toMatch(/component:\s*(?:Report|RevenueChart)/)

    const resolved = await callHook(
      plugin.resolveId,
      { environment: { name: 'ssr' } },
      RUE_SERVER_ISLAND_REGISTRY_ID,
      undefined,
      { ssr: true },
    )
    expect(resolved).toBeTruthy()
    const registry = String(
      await callHook(plugin.load, { environment: { name: 'ssr' } }, resolved, { ssr: true }),
    )
    expect(registry).toContain('import("/Users/Shared/work/dir/data/codes/rue/app/Report")')
    expect(registry).toContain('import("/Users/Shared/work/dir/data/codes/rue/app/Chart")')
    expect(registry).toContain('default: module.default')
    expect(registry).toContain('default: module["Chart"]')

    expect(
      await callHook(
        plugin.resolveId,
        { environment: { name: 'client' } },
        RUE_SERVER_ISLAND_REGISTRY_ID,
        undefined,
        { ssr: false },
      ),
    ).toBeNull()
  })

  it('removes server-only import specifiers from the browser graph and keeps fallback', async () => {
    const { code } = await transform(
      `
        import Report from './server-only/Report'
        export const Page = () => (
          <Report server:defer fallback={<p>Loading report</p>} accountId="a-1" />
        )
      `,
      false,
    )

    expect(code).not.toContain('server:defer')
    expect(code).not.toContain('./server-only/Report')
    expect(code).not.toContain('createRueServerIslandDescriptor')
    expect(code).toContain('_$compiledCreateElement("p"')
    expect(code).toContain('_$compiledCreateTextNode("Loading report")')
  })

  it('keeps an import binding that has another browser reference', async () => {
    const { code } = await transform(
      `
        import Report from './Report'
        export const eager = Report
        export const Page = () => <Report server:defer fallback={<p>Loading</p>} />
      `,
      false,
    )

    expect(code).toContain("import Report from './Report'")
    expect(code).toContain('export const eager = Report')
    expect(code).toContain('_$compiledCreateElement("p"')
    expect(code).toContain('_$compiledCreateTextNode("Loading")')
  })

  it('rejects mixed client directives and unsupported targets', async () => {
    const cases = [
      {
        source: `import Panel from './Panel'; export const Page = () => <Panel server:defer client:load />`,
        pattern: /server:defer cannot be combined with client:\*/,
      },
      {
        source: `const Panel = () => <p />; export const Page = () => <Panel server:defer />`,
        pattern: /direct default or named import.*DeferredPage\.tsx.*<Panel>/,
      },
      {
        source: `import * as Widgets from './widgets'; export const Page = () => <Widgets.Panel server:defer />`,
        pattern: /namespace or member.*DeferredPage\.tsx.*<Widgets\.Panel>/,
      },
    ]

    for (const { source, pattern } of cases) {
      await expect(transform(source, true)).rejects.toThrow(pattern)
    }
  })
})
