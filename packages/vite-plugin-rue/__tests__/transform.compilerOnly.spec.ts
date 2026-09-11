// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import VitePluginRue, { compileRueStatic } from '../index.mjs'

type PluginOptions = NonNullable<Parameters<typeof VitePluginRue>[0]>
type StaticCompileOptions = NonNullable<Parameters<typeof compileRueStatic>[1]>
type AssertFalse<T extends false> = T

type _PluginOptionsHaveNoStaticTemplates = AssertFalse<
  'staticTemplates' extends keyof PluginOptions ? true : false
>
type _PluginOptionsHaveNoStaticComponentProps = AssertFalse<
  'staticComponentProps' extends keyof PluginOptions ? true : false
>
type _StaticOptionsHaveNoStaticTemplates = AssertFalse<
  'staticTemplates' extends keyof StaticCompileOptions ? true : false
>
type _StaticOptionsHaveNoStaticComponentProps = AssertFalse<
  'staticComponentProps' extends keyof StaticCompileOptions ? true : false
>

const invokeConfigResolved = async (
  plugin: ReturnType<typeof VitePluginRue>,
  config: Record<string, unknown>,
) => {
  const hook = plugin.configResolved
  if (!hook) return
  return typeof hook === 'function'
    ? hook.call(plugin as any, config as any)
    : hook.handler.call(plugin as any, config as any)
}

const invokeTransform = async (
  source: string,
  id: string,
  options: PluginOptions = {},
  context: Record<string, unknown> = {},
) => {
  const plugin = VitePluginRue({ include: ['/app/', '/packages/rue-design/'], ...options })
  const hook = plugin.transform
  if (!hook) return null
  return typeof hook === 'function'
    ? hook.call(context as any, source, id)
    : hook.handler.call(context as any, source, id)
}

const expectClosedCompiledAbi = (code: string) => {
  expect(code).toMatch(
    /from\s*["']@rue-js\/rue\/internal\/(?:dom|reactive|block|component|list|events)["']/,
  )
  expect(code).not.toContain('@rue-js/runtime-vapor')
  expect(code).not.toContain('@rue-js/rue/vapor')
  expect(code).not.toContain('@rue-js/rue/compiled')
  expect(code).not.toContain('@rue-js/jsx-runtime')
  expect(code).not.toContain('@rue-js/jsx-dev-runtime')
}

describe('vite-plugin-rue compiler-only JSX contract', () => {
  it('keeps benchmark-shaped compiled setup on the compiled runtime entry', async () => {
    const code = await compileRueStatic(
      `
        import { signal } from '@rue-js/rue/internal/reactive'
        const initialRows = [{ id: 1, label: 'one' }, { id: 2, label: 'two' }]
        export const App = () => {
          const rows = signal(initialRows)
          const selected = signal(0)
          const select = id => selected.set(id)
          return <table><tbody>{rows.get().map(row => (
            <tr key={row.id} className={selected.get() === row.id ? 'selected' : ''} onClick={() => select(row.id)}>
              <td>{row.label}</td>
            </tr>
          ))}</tbody></table>
        }
      `,
      { id: '/app/CompiledBenchmark.tsx', production: true },
    )

    expect(code).toContain('_$compiledRoot(')
    expect(code).toContain('_$reconcileKeyedSingle(')
    expectClosedCompiledAbi(code)
    expect(code).toMatch(/from\s*["']@rue-js\/rue\/internal\/reactive["']/)
    expect(code).not.toMatch(/from\s*["']@rue-js\/rue\/internal["']/)
  })

  it('keeps formerly fallback-shaped output on the closed internal ABI', async () => {
    const diagnostics: Array<Record<string, unknown>> = []
    const source = [
      "import { useState } from '@rue-js/rue'",
      'const Child = props => <aside>{props.children}</aside>',
      'export const App = props => {',
      '  const [value] = useState(0)',
      '  return <main {...props}>{props.rows.map(row => <Child>{readUnknown(row, value)}</Child>)}</main>',
      '}',
    ].join('\n')

    const code = await compileRueStatic(source, {
      id: '/app/FallbackInventory.tsx',
      production: true,
      onCompilerDiagnostics: (entries: Array<Record<string, unknown>>) =>
        diagnostics.push(...entries),
    } as any)

    expect(diagnostics).toEqual([])
    expect(code).toContain('_$compiledRoot(')
    expect(code).toMatch(/from\s*["']@rue-js\/rue\/internal\/component["']/)
    expect(code).not.toMatch(/from\s*["']@rue-js\/rue\/internal["']/)
  })

  it.each([
    ['serve', false],
    ['build', true],
  ] as const)(
    'enables static templates and static component props for %s client transforms',
    async (command, production) => {
      const payloads: Array<Record<string, unknown>> = []
      const plugin = VitePluginRue({
        include: ['/app/'],
        transformExecutor: payload => {
          payloads.push(payload as unknown as Record<string, unknown>)
          return 'export const rendered = true'
        },
      })
      await invokeConfigResolved(plugin, { command })
      const transform =
        typeof plugin.transform === 'function' ? plugin.transform : plugin.transform!.handler

      await transform.call(
        { environment: { name: 'client' } } as any,
        'export const Page = () => <main>development</main>',
        '/app/DevelopmentPage.tsx',
        { moduleType: 'js' },
      )

      expect(payloads).toHaveLength(1)
      expect(payloads[0]).toMatchObject({
        isProduction: production,
        target: 'client',
      })
      expect(payloads[0]).not.toHaveProperty('staticTemplates')
      expect(payloads[0]).not.toHaveProperty('staticComponentProps')
    },
  )

  it('compiles the real control-flow page through the internal helper entry', async () => {
    const root = resolve(import.meta.dirname, '../../..')
    const id = resolve(root, 'app/pages/examples/compiled-control-flow/CompiledControlFlowDemo.tsx')
    const plugin = VitePluginRue({ include: ['/app/'] })
    await invokeConfigResolved(plugin, { command: 'serve', root })
    const transform =
      typeof plugin.transform === 'function' ? plugin.transform : plugin.transform!.handler
    const result = await transform.call(
      { environment: { name: 'client' } } as any,
      readFileSync(id, 'utf8'),
      id,
      { moduleType: 'js' },
    )
    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain('/* RUE_TRANSFORMED */')
    expectClosedCompiledAbi(code)
  })

  it('compiles component JSX in non-return expression containers', async () => {
    const code = await compileRueStatic(
      `
        import Card from './Card'
        const moduleNode = <main>module</main>
        const record = { node: <aside>field</aside> }
        function render(node = <header>default</header>) {
          const nested = () => () => <Card>nested</Card>
          return [node, nested()]
        }
      `,
      { id: '/app/ExpressionContainers.tsx', production: false },
    )
    expectClosedCompiledAbi(code)
  })

  it('compiles a reactive key through the internal helper entry', async () => {
    const code = await compileRueStatic(
      `
        const selection = { value: 'after' }
        export const controlledAfterContent = (
          <div key={selection.value} className="controlled-after-content">
            <div className="controlled-after-content__body">After content</div>
          </div>
        )
      `,
      { id: '/app/ControlledAfterContent.tsx', production: false },
    )
    expectClosedCompiledAbi(code)
  })

  it('compiles standalone component output without legacy imports', async () => {
    const code = await compileRueStatic(
      `
        const Card = props => <article>{props.title}</article>
        const title = 'compiled'
        export const Page = () => <main><Card title={title} /></main>
      `,
      { id: '/app/StandaloneDefaults.tsx', production: false },
    )
    expect(code).toContain('_$compiledComponent(Card')
    expect(code).toContain('_$mountCompiledSlotAt')
    expectClosedCompiledAbi(code)
  })

  it('rejects residual JSX from the Vite compiler with file and source position', async () => {
    const source = ['const value = 1', 'const leaked = <span>leaked</span>'].join('\n')

    await expect(
      invokeTransform(source, '/app/Residual.tsx', {
        transformExecutor: () => source,
      }),
    ).rejects.toThrow(/Residual\.tsx:2:\d+/)
  })

  it('uses the same residual JSX validation in compileRueStatic', async () => {
    const source = ['const value = 1', 'const leaked = <span>leaked</span>'].join('\n')

    await expect(
      compileRueStatic(source, {
        id: '/app/StaticResidual.tsx',
        transformExecutor: () => source,
      } as any),
    ).rejects.toThrow(/StaticResidual\.tsx:2:\d+/)
  })

  it.each(['calendar', 'time-picker'])(
    'does not silently skip the rue-design/%s compiler path',
    async component => {
      const source = 'export const View = () => <section>ok</section>'
      const result = await invokeTransform(
        source,
        `/packages/rue-design/src/components/${component}/index.tsx`,
        { transformExecutor: () => 'export const View = compiledView' },
      )

      expect(result).not.toBeNull()
      expect(String((result as any)?.code ?? result)).toContain('RUE_TRANSFORMED')
    },
  )

  it('compiles JSX in the RSC graph with the server target', async () => {
    const result = await invokeTransform(
      'export default function Page() { return <main>RSC</main> }',
      '/app/Page.tsx',
      {},
      { environment: { name: 'rsc' } },
    )
    const code = String((result as any)?.code ?? result)

    expect(code).toContain('@rue-js/rue/internal/ssr')
    expect(code).toContain('_$writeElement')
    expect(code).not.toMatch(/from\s*["']@rue-js\/rue\/internal["']/)
  })
})
