import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  TREE_SHAKING_SCENARIOS,
  evaluateTreeShakingBudget,
  runTreeShakingAudit,
} from '../tree-shaking-audit.js'

const expectedScenarios = [
  'public-signal',
  'public-ref-computed',
  'public-transition',
  'public-custom-element',
  'compiler-internal',
]

describe('consumer tree-shaking audit', () => {
  it('covers the fixed public and compiler consumer matrix', () => {
    expect(TREE_SHAKING_SCENARIOS.map(scenario => scenario.name)).toEqual(expectedScenarios)

    const baseline = JSON.parse(readFileSync('scripts/tree-shaking-baseline.json', 'utf8'))
    expect(Object.keys(baseline.scenarios)).toEqual(expectedScenarios)

    const budget = JSON.parse(readFileSync('scripts/tree-shaking-budget.json', 'utf8'))
    expect(Object.keys(budget.scenarios)).toEqual(expectedScenarios)
    for (const scenario of Object.values(budget.scenarios) as Array<{
      max: Record<string, number>
      forbidModules: string[]
    }>) {
      expect(Object.keys(scenario.max)).toEqual(['minified', 'gzip', 'brotli'])
      expect(scenario.forbidModules.length).toBeGreaterThan(0)
    }

    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(packageJson.scripts['size:tree-shaking:check']).toBe(
      'node scripts/tree-shaking-audit.js --check',
    )
  })

  it('reports deterministic sizes, entry resolution, and Rollup module attribution', async () => {
    const first = await runTreeShakingAudit()
    const second = await runTreeShakingAudit()

    expect(second).toEqual(first)
    expect(first.schemaVersion).toBe(1)
    expect(Object.keys(first.scenarios)).toEqual(expectedScenarios)

    for (const scenario of Object.values(first.scenarios)) {
      expect(scenario.resolvedEntry).toMatch(/^packages\/rue\/dist\/.+\.js$/)
      expect(scenario.sizes).toEqual({
        raw: expect.any(Number),
        minified: expect.any(Number),
        gzip: expect.any(Number),
        brotli: expect.any(Number),
      })
      expect(scenario.sizes.raw).toBeGreaterThan(0)
      expect(scenario.sizes.minified).toBeGreaterThan(0)
      expect(scenario.sizes.gzip).toBeGreaterThan(0)
      expect(scenario.sizes.brotli).toBeGreaterThan(0)
      expect(scenario.modules.length).toBeGreaterThan(0)
      expect(scenario.modules[0]).toEqual({
        id: expect.any(String),
        renderedBytes: expect.any(Number),
      })
      expect(scenario.modules).toEqual(
        [...scenario.modules].sort(
          (left, right) =>
            right.renderedBytes - left.renderedBytes || left.id.localeCompare(right.id),
        ),
      )
    }
  }, 30_000)

  it('accepts reports within every configured byte and module budget', () => {
    const result = evaluateTreeShakingBudget(
      {
        schemaVersion: 1,
        scenarios: {
          lightweight: {
            max: { minified: 120, gzip: 80, brotli: 70 },
            forbidModules: ['server-renderer', 'custom-element'],
          },
        },
      },
      {
        schemaVersion: 1,
        scenarios: {
          lightweight: {
            sizes: { raw: 200, minified: 120, gzip: 79, brotli: 68 },
            modules: [{ id: 'packages/runtime/dist/public/signal.js', renderedBytes: 100 }],
          },
        },
      },
    )

    expect(result).toEqual({ ok: true, failures: [] })
  })

  it('reports byte overruns with deterministic diagnostic fields', () => {
    const result = evaluateTreeShakingBudget(
      {
        schemaVersion: 1,
        scenarios: {
          lightweight: { max: { gzip: 80 }, forbidModules: [] },
        },
      },
      {
        schemaVersion: 1,
        scenarios: {
          lightweight: {
            sizes: { raw: 200, minified: 120, gzip: 83, brotli: 68 },
            modules: [],
          },
        },
      },
    )

    expect(result).toEqual({
      ok: false,
      failures: [
        {
          type: 'size',
          scenario: 'lightweight',
          metric: 'gzip',
          actual: 83,
          max: 80,
          overBy: 3,
        },
      ],
    })
  })

  it('reports forbidden modules with the matching rule and module id', () => {
    const result = evaluateTreeShakingBudget(
      {
        schemaVersion: 1,
        scenarios: {
          lightweight: { max: {}, forbidModules: ['server-renderer', 'custom-element'] },
        },
      },
      {
        schemaVersion: 1,
        scenarios: {
          lightweight: {
            sizes: { raw: 200, minified: 120, gzip: 79, brotli: 68 },
            modules: [
              { id: 'packages/runtime/dist/server-renderer/index.js', renderedBytes: 100 },
              { id: 'packages/runtime/dist/custom-element.js', renderedBytes: 50 },
            ],
          },
        },
      },
    )

    expect(result).toEqual({
      ok: false,
      failures: [
        {
          type: 'forbidden-module',
          scenario: 'lightweight',
          rule: 'server-renderer',
          moduleId: 'packages/runtime/dist/server-renderer/index.js',
        },
        {
          type: 'forbidden-module',
          scenario: 'lightweight',
          rule: 'custom-element',
          moduleId: 'packages/runtime/dist/custom-element.js',
        },
      ],
    })
  })
})
