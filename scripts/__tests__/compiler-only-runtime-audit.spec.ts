import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  auditCompilerOnlyRuntime,
  BUILTIN_AUDIT_SOURCES,
  HYDRATE_AUDIT_SOURCE,
  assertCompilerOnlyRuntime,
  compilerOnlyFailures,
  TARGET_SCENARIOS,
} from '../compiler-only-runtime-audit.js'
import { scanCompilerRuntimeBoundary } from '../check-compiler-runtime-boundary.js'

const compliant = () => ({
  publicEntries: [] as string[],
  scenarios: Object.fromEntries(
    TARGET_SCENARIOS.map(s => [
      s.name,
      {
        gzip: 100,
        sources: {
          moduleRenderSizes: {
            'packages/runtime/dist/runtime-core/reactive-kernel/signal.js': 100,
          } as Record<string, number>,
          builtins: [] as string[],
        },
      },
    ]),
  ),
})

describe('compiler-only runtime target contract', () => {
  it('locks all scenarios and budgets (SSR has dependency gates only)', () => {
    expect(TARGET_SCENARIOS.map(s => [s.name, s.maxGzip])).toEqual([
      ['static', 1024],
      ['reactive-text', 3072],
      ['component', 10240],
      ['list', 5120],
      ['Teleport', 12288],
      ['Transition', 12288],
      ['hydrate', 25600],
      ['SSR', null],
    ])
    expect(TARGET_SCENARIOS.find(s => s.name === 'static')?.input).toEqual([
      { entry: '@rue-js/rue/internal/dom', imports: ['_$template'] },
    ])
    expect(HYDRATE_AUDIT_SOURCE).toContain("from '@rue-js/rue/internal/hydrate'")
    expect(TARGET_SCENARIOS.find(s => s.name === 'SSR')?.input).toEqual([
      { entry: '@rue-js/rue/server-renderer', imports: ['renderToString'] },
    ])
  })
  it('keeps alternate DOM hosts and their global bridge out of source', async () => {
    expect(await scanCompilerRuntimeBoundary(process.cwd(), { sourceOnly: true })).toEqual([])
  })
  it('accepts a compliant fixture', () => {
    expect(() => assertCompilerOnlyRuntime(compliant())).not.toThrow()
  })
  it.each([
    'runtime-core/js-runtime/render.js',
    'runtime-core/js-reactive/facade.js',
    'compiled-legacy-dom.js',
    'compiled-dom-bindings-legacy.js',
    'compiled-render-anchor.js',
    'portable-renderable.js',
    'render.js',
    'island.js',
    'unknown-runtime.js',
  ])('rejects %s', module => {
    const report = compliant()
    report.scenarios.component.sources.moduleRenderSizes = {
      [`packages/runtime/dist/${module}`]: 1,
    }
    expect(() => assertCompilerOnlyRuntime(report)).toThrow(/component.*module/)
  })
  it('rejects old public entries, over-budget bundles and missing scenarios', () => {
    const report = compliant()
    report.publicEntries.push('@rue-js/rue/island')
    report.scenarios.component.gzip = 10241
    delete report.scenarios.SSR
    expect(() => assertCompilerOnlyRuntime(report)).toThrow(/public entry/)
    expect(() => assertCompilerOnlyRuntime(report)).toThrow(/component gzip 10241 > 10240/)
    expect(() => assertCompilerOnlyRuntime(report)).toThrow(/SSR missing/)
  })
  it.each(TARGET_SCENARIOS.filter(s => s.maxGzip !== null))(
    'enforces the $name budget at the byte boundary',
    scenario => {
      const report = compliant()
      report.scenarios[scenario.name].gzip = scenario.maxGzip!
      expect(() => assertCompilerOnlyRuntime(report)).not.toThrow()
      report.scenarios[scenario.name].gzip++
      expect(() => assertCompilerOnlyRuntime(report)).toThrow(`${scenario.name} gzip`)
    },
  )
  it('rejects unused builtins and absent measurement evidence', () => {
    const report = compliant()
    report.scenarios.static.sources.builtins = ['Transition']
    report.scenarios.list.sources.moduleRenderSizes = {}
    report.scenarios.hydrate.gzip = NaN
    expect(() => assertCompilerOnlyRuntime(report)).toThrow(/static unused builtin Transition/)
    expect(() => assertCompilerOnlyRuntime(report)).toThrow(/list missing rendered module evidence/)
    expect(() => assertCompilerOnlyRuntime(report)).toThrow(/hydrate missing gzip evidence/)
  })
  it('uses the same builtin fixtures and measurements in isolated and full audits', async () => {
    const report = await auditCompilerOnlyRuntime()
    execFileSync(
      process.execPath,
      [
        'scripts/compiler-only-runtime-audit.js',
        '--scenario',
        'teleport',
        '--scenario',
        'transition',
        '--check',
      ],
      { timeout: 30_000 },
    )
    for (const [name, source] of Object.entries(BUILTIN_AUDIT_SOURCES)) {
      const isolated = JSON.parse(readFileSync(`temp/size/compiler-${name}-task8.json`, 'utf8'))
      const full = report.scenarios[name === 'teleport' ? 'Teleport' : 'Transition']
      expect(isolated.source).toBe(source)
      expect(isolated.gzip).toBe(full.gzip)
      expect(isolated.min).toBe(full.min)
      expect(isolated.failures).toEqual([])
    }
  }, 120_000)
  it('builds compliant real production consumers', async () => {
    const report = await auditCompilerOnlyRuntime()
    for (const scenario of TARGET_SCENARIOS) {
      const result = report.scenarios[scenario.name]
      expect(result.gzip).toBeGreaterThan(0)
      expect(result.resolvedEntries.length).toBeGreaterThan(0)
      expect(Object.keys(result.sources.moduleRenderSizes).length).toBeGreaterThan(0)
    }
    expect(() => assertCompilerOnlyRuntime(report)).not.toThrow()
    expect(report.scenarios.component.gzip).toBeLessThanOrEqual(10240)
    expect(report.scenarios.hydrate.gzip).toBeLessThanOrEqual(25600)
    expect(compilerOnlyFailures(report).filter(failure => failure.startsWith('hydrate '))).toEqual(
      [],
    )
  }, 120_000)
})
