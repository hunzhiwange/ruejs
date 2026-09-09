import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  buildRuntimeSizePreset,
  checkRuntimeSizeBudget,
  createAuditReport,
  RUNTIME_SIZE_PRESETS,
  RuntimeSizeBudgetError,
} from '../runtime-size-audit.js'

describe('runtime size audit', () => {
  it('covers client, template, component, list, built-ins and hydrate independently', () => {
    expect(RUNTIME_SIZE_PRESETS.map(preset => preset.name)).toEqual([
      'client-core',
      'template-only',
      'compiled-component',
      'compiled-list',
      'compiled-builtins',
      'teleport-only',
      'transition-only',
      'hydrate',
    ])
  })

  it.each(RUNTIME_SIZE_PRESETS)(
    'resolves $name through package exports to current modular dist',
    async preset => {
      const result = await buildRuntimeSizePreset(preset)

      expect(result.resolvedEntries).toHaveLength(preset.input.length)
      expect(result.resolvedEntries).toEqual(
        expect.arrayContaining(
          preset.input.map(input =>
            expect.objectContaining({
              entry: input.entry,
              resolvedEntry: expect.stringMatching(/^packages\/(?:rue|runtime)\/dist\/.+\.js$/),
            }),
          ),
        ),
      )
      expect(result.sources.allModules).not.toContain('packages/runtime/src/compiler-internal.ts')
      expect(Object.values(result.sources.moduleRenderSizes)).toEqual(
        expect.arrayContaining([expect.any(Number)]),
      )
      expect(Object.values(result.sources.moduleRenderSizes).every(bytes => bytes > 0)).toBe(true)
      expect(result.raw).toBeGreaterThan(0)
      expect(result.min).toBeGreaterThan(0)
      expect(result.gzip).toBeGreaterThan(0)
      expect(result.brotli).toBeGreaterThan(0)
    },
    30_000,
  )

  it('does not override package side-effect declarations', () => {
    expect(readFileSync('scripts/runtime-size-audit.js', 'utf8')).not.toContain(
      'moduleSideEffects: false',
    )
  })

  it('detects compiled runtime and reactive kernel modules from modular dist', async () => {
    const preset = RUNTIME_SIZE_PRESETS.find(candidate => candidate.name === 'client-core')!
    const result = await buildRuntimeSizePreset(preset)

    expect(result.sources.compiledRuntime).toBe(true)
    expect(result.sources.reactiveKernel.moduleCount).toBeGreaterThan(0)
    expect(result.sources.reactiveKernel.renderedBytes).toBeGreaterThan(0)
  })

  it('audits component and builtin capabilities through their private entries', () => {
    const entries = Object.fromEntries(
      RUNTIME_SIZE_PRESETS.map(preset => [preset.name, preset.input.map(input => input.entry)]),
    )
    expect(entries['compiled-component']).toEqual(['@rue-js/rue/internal/component'])
    expect(entries['compiled-builtins']).toEqual(['@rue-js/rue/internal/builtins'])
    expect(entries['template-only']).toEqual(['@rue-js/rue/internal/compiler'])
    expect(entries['teleport-only']).toEqual(['@rue-js/rue/internal/builtins'])
    expect(entries['transition-only']).toEqual(['@rue-js/rue/internal/builtins'])
  })

  it('turns an over-budget fixture into a hard failure', () => {
    expect(() =>
      checkRuntimeSizeBudget(
        { presets: { 'client-core': { gzip: 12_289, sources: {} } } },
        { presets: { 'client-core': { max: { gzip: 12_288 } } } },
      ),
    ).toThrow(RuntimeSizeBudgetError)
  })

  it('requires every configured preset', () => {
    expect(() =>
      checkRuntimeSizeBudget(
        { presets: {} },
        {
          presets: { 'compiled-list': { max: { gzip: 12_288 } } },
        },
      ),
    ).toThrow(/missing/)
  })

  it('requires a budget for every audited preset', () => {
    expect(() =>
      checkRuntimeSizeBudget(
        {
          presets: {
            'client-core': { gzip: 10, sources: {} },
            'template-only': { gzip: 10, sources: {} },
          },
        },
        {
          presets: {
            'client-core': { measurement: 'absolute', max: { gzip: 10 } },
          },
        },
      ),
    ).toThrow(/template-only.*budget/m)
  })

  it('emits an absolute final-runtime report', () => {
    const report = createAuditReport([
      {
        name: 'client-core',
        input: [],
        buildMode: 'production',
        raw: 10,
        min: 8,
        gzip: 6,
        brotli: 5,
        sources: {},
      },
    ] as never)
    expect(report.schemaVersion).toBe(4)
    expect(report.presets['client-core']).not.toHaveProperty('deltaFromVaporCore')
  })

  it('makes both gates part of release validation', () => {
    const source = readFileSync('scripts/release.js', 'utf8')
    expect(source).toContain("['run', 'check:compiler-runtime-boundary']")
    expect(source).toContain("['run', 'size-runtime', '--', '--check']")
  })
})
