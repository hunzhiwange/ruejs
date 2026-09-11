import { Worker } from 'node:worker_threads'
import { resolve } from 'node:path'
// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import VitePluginRue, { compileRueStatic } from '../index.mjs'

describe('vite-plugin-rue server JSX target', () => {
  it('compiles static server JSX without browser or JSX runtime helpers', async () => {
    const output = await compileRueStatic(
      `
        "use server";
        const Item = props => <li>{props.label}</li>
        export const Page = () => <><ul><Item label="Rue" /></ul></>
      `,
      { id: '/app/Page.tsx', target: 'server', production: false },
    )

    expect(output).toMatch(/^\/\* RUE_TRANSFORMED \*\/\n["']use server["'];/)
    expect(output).toContain('@rue-js/rue/internal/ssr')
    expect(output).toContain('_$writeElement')
    expect(output).toContain('_$writeComponent')
    expect(output).not.toMatch(/@rue-js\/rue\/(?:compiled|vapor)/)
    expect(output).not.toContain('@rue-js/rue/internal/compiler')
    expect(output).not.toMatch(/from\s*["']@rue-js\/rue\/internal["']/)
    expect(output).not.toMatch(/jsx(?:-dev)?-runtime/)
    expect(output).not.toMatch(/<(?:li|ul)>/)
  })

  it('keeps client as the default target', async () => {
    const output = await compileRueStatic('export const App = () => <main>client</main>', {
      id: '/app/Client.tsx',
      production: false,
    })

    expect(output).toMatch(/from\s*["']@rue-js\/rue\/internal\/dom["']/)
    expect(output).not.toMatch(/from\s*["']@rue-js\/rue\/internal["']/)
    expect(output).not.toContain('@rue-js/rue/vapor')
    expect(output).not.toContain('@rue-js/runtime-vapor')
    expect(output).not.toContain('@rue-js/server-renderer')
  })

  it('selects the server target for Vite SSR and RSC module graphs', async () => {
    const payloads: Array<Record<string, unknown>> = []
    const plugin = VitePluginRue({
      include: ['/app/'],
      transformExecutor: payload => {
        payloads.push(payload as unknown as Record<string, unknown>)
        return 'export const rendered = true'
      },
    })
    const transform =
      typeof plugin.transform === 'function' ? plugin.transform : plugin.transform!.handler

    await transform.call(
      { environment: { name: 'rsc' } } as any,
      'export const Page = () => <main>RSC</main>',
      '/app/RscPage.tsx',
      { moduleType: 'js' },
    )
    await transform.call(
      { environment: { name: 'server' } } as any,
      'export const Page = () => <main>SSR</main>',
      '/app/SsrPage.tsx',
      { moduleType: 'js', ssr: true },
    )

    expect(payloads.map(payload => payload.target)).toEqual(['server', 'server'])
  })
})

it('preserves declared named slots in both inline and worker compilation', async () => {
  const code = `export const Layout=({team}: {team: import('@rue-js/rue').RenderableOutput})=> <aside>{team}</aside>`
  const inline = await compileRueStatic(code, {
    id: '/app/Named.tsx',
    target: 'server',
    production: false,
  })
  const workerOutput = await new Promise<string>((done, reject) => {
    const worker = new Worker(resolve('packages/vite-plugin-rue/transform-worker.mjs'), {
      workerData: {
        code,
        id: '/app/Named.tsx',
        target: 'server',
        isProduction: false,
        pluginPath: resolve('packages/swc-plugin-rue/swc-plugin-rue.wasm'),
      },
    })
    worker.once('message', result =>
      result.error ? reject(new Error(result.error.message)) : done(result.code),
    )
    worker.once('error', reject)
  })
  for (const output of [inline, workerOutput]) {
    expect(output).toContain('_$writeSlot')
    expect(output).not.toContain('_$writeText')
  }
})
