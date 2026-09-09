import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  findRueWorkspacePackages,
  readProjectJson,
  type PackageManifest,
} from './helpers/esm-package-contract'

const nodeBaseline = '>=22.22.0'
const vitePeerBaseline = '^7.0.0 || ^8.0.0'

Object.assign(globalThis, { document: { body: { innerHTML: '' } } })

describe('workspace modern baseline', () => {
  it('declares Node 22.22.0+ for the root and every Rue workspace package', async () => {
    const rootPackage = await readProjectJson<PackageManifest>('package.json')
    const workspacePackages = await findRueWorkspacePackages()

    expect(workspacePackages).toHaveLength(12)
    expect(rootPackage.engines?.node).toBe(nodeBaseline)
    expect(workspacePackages.map(item => item.manifest.name)).toEqual([
      '@rue-js/design',
      '@rue-js/i18n',
      '@rue-js/router',
      '@rue-js/rsc',
      '@rue-js/rue',
      '@rue-js/runtime',
      '@rue-js/server-renderer',
      '@rue-js/shared',
      '@rue-js/store',
      '@rue-js/swc-plugin-rue',
      '@rue-js/text',
      '@rue-js/vite-plugin-rue',
    ])
    for (const { manifest } of workspacePackages) {
      expect(manifest.engines?.node, manifest.name).toBe(nodeBaseline)
    }
  })

  it('keeps Vite integration packages compatible with Vite 7 and 8', async () => {
    const workspacePackages = await findRueWorkspacePackages()
    const packageByName = new Map(
      workspacePackages.map(item => [item.manifest.name, item.manifest]),
    )

    for (const name of ['@rue-js/rsc', '@rue-js/text', '@rue-js/vite-plugin-rue']) {
      expect(packageByName.get(name)?.peerDependencies?.vite, name).toBe(vitePeerBaseline)
    }
  })

  it('aligns the checked-in Node version and TypeScript baseline with ES2022', async () => {
    const nodeVersion = await readFile(path.resolve(process.cwd(), '.node-version'), 'utf8')
    const tsconfig = await readProjectJson<{ compilerOptions: { target: string; lib: string[] } }>(
      'tsconfig.json',
    )

    expect(nodeVersion.trim()).toBe('22.23.1')
    expect(tsconfig.compilerOptions.target).toBe('ES2022')
    expect(tsconfig.compilerOptions.lib).toEqual(['DOM', 'DOM.Iterable', 'ES2022'])
  })
})
