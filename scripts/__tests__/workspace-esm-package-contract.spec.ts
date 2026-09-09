// @vitest-environment jsdom

import { execFileSync } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  findRueWorkspacePackages,
  readProjectJson,
  type PackageManifest,
} from './helpers/esm-package-contract'

interface ESMManifest extends PackageManifest {
  private?: boolean
  main?: string
  exports?: unknown
  buildOptions?: { formats?: string[]; subEntries?: Array<{ formats?: string[] }> }
}

interface PackResult {
  files: Array<{ path: string }>
}

const projectRoot = process.cwd()
const wasmPackage = '@rue-js/swc-plugin-rue'
const cjsArtifact = /(?:^|\/)\S*\.cjs(?:\.|$)/

const packFiles = (directory: string) => {
  const output = execFileSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], {
    cwd: path.resolve(projectRoot, 'packages', directory),
    encoding: 'utf8',
  })
  const [result] = JSON.parse(output) as PackResult[]
  return result.files.map(file => file.path).sort()
}

const findCjsDistFiles = async (directory: string) => {
  const dist = path.resolve(projectRoot, 'packages', directory, 'dist')
  const files: string[] = []

  const visit = async (current: string) => {
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }
    await Promise.all(
      entries.map(async entry => {
        const filePath = path.resolve(current, entry.name)
        if (entry.isDirectory()) return visit(filePath)
        if (cjsArtifact.test(entry.name)) files.push(path.relative(dist, filePath))
      }),
    )
  }

  await visit(dist)
  return files.sort()
}

describe('workspace ESM package contract', () => {
  it('automatically discovers and classifies all 12 Rue workspace packages', async () => {
    const packages = await findRueWorkspacePackages()
    const manifests = await Promise.all(
      packages.map(async pkg => ({
        ...pkg,
        manifest: await readProjectJson<ESMManifest>(`packages/${pkg.directory}/package.json`),
      })),
    )

    expect(manifests).toHaveLength(12)
    expect(manifests.filter(pkg => pkg.manifest.private)).toEqual([])
    expect(manifests.filter(pkg => pkg.manifest.name === wasmPackage)).toHaveLength(1)
    expect(
      manifests.filter(pkg => !pkg.manifest.private && pkg.manifest.name !== wasmPackage),
    ).toHaveLength(11)
  })

  it('publishes every JavaScript package as ESM-only and the SWC package as a Wasm asset', async () => {
    const packages = await findRueWorkspacePackages()

    for (const pkg of packages) {
      const manifest = await readProjectJson<ESMManifest>(`packages/${pkg.directory}/package.json`)
      const packedFiles = packFiles(pkg.directory)

      expect(manifest.type, pkg.manifest.name).toBe('module')
      expect(JSON.stringify(manifest.exports ?? {}), pkg.manifest.name).not.toContain('"require"')
      expect(manifest.buildOptions?.formats ?? [], pkg.manifest.name).not.toContain('cjs')
      expect(
        manifest.buildOptions?.subEntries?.flatMap(entry => entry.formats ?? []) ?? [],
        pkg.manifest.name,
      ).not.toContain('cjs')
      expect(
        packedFiles.filter(file => cjsArtifact.test(file)),
        pkg.manifest.name,
      ).toEqual([])
      expect(await findCjsDistFiles(pkg.directory), pkg.manifest.name).toEqual([])

      if (pkg.manifest.name === wasmPackage) {
        expect(manifest.main).toBe('swc-plugin-rue.wasm')
        expect(manifest.exports).toEqual({ '.': './swc-plugin-rue.wasm' })
        expect(packedFiles).toContain('swc-plugin-rue.wasm')
      } else if (!manifest.private) {
        expect(manifest.exports, pkg.manifest.name).toBeDefined()
      }
    }
  }, 120_000)
})
