import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import swc from '@swc/core'
import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()
const pagePath = resolve(projectRoot, 'app/pages/examples/AttributeBindings.tsx')
const pluginPath = resolve(projectRoot, 'packages/swc-plugin-rue/swc-plugin-rue.wasm')

const compileActualPage = () =>
  swc.transformSync(readFileSync(pagePath, 'utf8'), {
    filename: pagePath,
    jsc: {
      parser: { syntax: 'typescript', tsx: true },
      target: 'es2020',
      transform: {
        react: {
          runtime: 'automatic',
          importSource: '@rue-js',
          development: false,
          throwIfNamespace: false,
        },
      },
      experimental: { plugins: [[pluginPath, {}]] },
    },
    module: { type: 'es6' },
  }).code

describe('AttributeBindings actual page codegen', () => {
  it('stays on one compiled content boundary without Vapor fallback', () => {
    expect(readFileSync(pluginPath).byteLength).toBeGreaterThan(0)
    const generated = compileActualPage()

    expect(generated).toContain('from "@rue-js/rue/internal/component"')
    expect(generated).not.toContain('from "@rue-js/rue/internal"')
    expect(generated).not.toMatch(/\bvapor\(/)
    expect(generated).not.toContain('watchEffect')
    expect(generated).toContain('_$compiledBranchAt')
    expect(generated).toMatch(/\beffect\(/)
    expect(generated).toContain('_$compiledRoot')
    expect(generated).toContain('_$compiledStaticRoot')
  })
})
