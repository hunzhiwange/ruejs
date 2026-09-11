import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { compileRueStatic } from '../../vite-plugin-rue/index.mjs'
import text from '../src/index.js'

const temporaryRoots: string[] = []

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

describe('Text Rue server compilation', () => {
  it('scans RSC directives before Rue JSX lowering and creates client references after', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'text-rue-server-compile-'))
    temporaryRoots.push(root)
    fs.mkdirSync(path.join(root, 'app'))

    const plugins = text({ appDir: root }) as Array<{ name?: string }>
    const directiveScanIndex = plugins.findIndex(
      plugin => plugin.name === 'rsc:use-client/scan-directive',
    )
    const clientReferenceIndex = plugins.findIndex(plugin => plugin.name === 'rsc:use-client')
    const rueLoweringIndex = plugins.findIndex(plugin => plugin.name === '@rue-js/vite-plugin-rue')

    expect(directiveScanIndex).toBeGreaterThanOrEqual(0)
    expect(rueLoweringIndex).toBeGreaterThan(directiveScanIndex)
    expect(clientReferenceIndex).toBeGreaterThan(rueLoweringIndex)
  })

  it('lowers server JSX directly to the server-renderer protocol', async () => {
    const output = await compileRueStatic(
      `
        "use server";
        const Item = props => <li>{props.label}</li>
        export const Page = () => <><ul><Item label="Rue" /></ul></>
      `,
      { id: '/app/page.tsx', target: 'server', production: false },
    )

    expect(output).toMatch(/^\/\* RUE_TRANSFORMED \*\/\n["']use server["'];/)
    expect(output).toContain('@rue-js/rue/internal/ssr')
    expect(output).toContain('_$writeElement')
    expect(output).toContain('_$writeComponent')
    expect(output).toContain('_$writeText')
    expect(output).not.toMatch(/jsx(?:-dev)?-runtime/)
  })
})
