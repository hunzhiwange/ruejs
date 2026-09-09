import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()

interface PackageManifest {
  type?: string
  main?: string
  exports?: Record<string, unknown>
}

interface PackResult {
  files: Array<{ path: string }>
}

const esmPackages = ['vite-plugin-rue', 'rue-rsc', 'text'] as const

const readManifest = (directory: string) =>
  JSON.parse(
    readFileSync(path.resolve(projectRoot, 'packages', directory, 'package.json'), 'utf8'),
  ) as PackageManifest

const packFiles = (directory: string) => {
  const output = execFileSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], {
    cwd: path.resolve(projectRoot, 'packages', directory),
    encoding: 'utf8',
  })
  const [result] = JSON.parse(output) as PackResult[]
  return result.files.map(file => file.path).sort()
}

describe('tooling ESM package contract', () => {
  it.each(esmPackages)(
    '%s declares ESM and publishes no CommonJS condition or artifact',
    directory => {
      const manifest = readManifest(directory)
      const packedFiles = packFiles(directory)

      expect(manifest.type).toBe('module')
      expect(JSON.stringify(manifest.exports ?? {})).not.toContain('"require"')
      expect(packedFiles.filter(file => /(?:^|\/)\S*\.cjs(?:\.|$)/.test(file))).toEqual([])
    },
    30_000,
  )

  it('keeps the Vite plugin on its existing ESM entry', () => {
    const manifest = readManifest('vite-plugin-rue')

    expect(manifest.main).toBe('index.mjs')
    expect(manifest.exports?.['.']).toEqual(
      expect.objectContaining({ import: './index.mjs', default: './index.mjs' }),
    )
  })

  it('publishes the SWC plugin as a Wasm asset, not a JavaScript dual-format entry', () => {
    const manifest = readManifest('swc-plugin-rue')
    const packedFiles = packFiles('swc-plugin-rue')

    expect(manifest.type).toBe('module')
    expect(manifest.main).toBe('swc-plugin-rue.wasm')
    expect(manifest.exports).toEqual({ '.': './swc-plugin-rue.wasm' })
    expect(packedFiles).toContain('swc-plugin-rue.wasm')
    expect(packedFiles.filter(file => /(?:^|\/)\S*\.(?:cjs|m?js)(?:\.|$)/.test(file))).toEqual([])
  })
})
// @vitest-environment jsdom
