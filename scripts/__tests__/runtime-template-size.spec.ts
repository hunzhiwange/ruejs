import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildRuntimeSizePreset, RUNTIME_SIZE_PRESETS } from '../runtime-size-audit.js'

const baseline = JSON.parse(readFileSync('scripts/runtime-size-refinement-baseline.json', 'utf8'))

describe('runtime template-only production size', () => {
  it('keeps the real template export while excluding the server template parser', async () => {
    const preset = RUNTIME_SIZE_PRESETS.find(candidate => candidate.name === 'template-only')!
    const result = await buildRuntimeSizePreset(preset)
    const previous = baseline.presets['template-only']

    expect(result.resolvedEntries).toEqual([
      expect.objectContaining({
        entry: '@rue-js/rue/internal/compiler',
        resolvedEntry: 'packages/rue/dist/compiler-internal.js',
      }),
    ])
    expect(result.raw).toBeGreaterThan(0)
    expect(result.min).toBeGreaterThan(0)
    expect(result.gzip).toBeGreaterThan(0)
    expect(result.min).toBeLessThan(previous.min)
    expect(result.gzip).toBeLessThan(previous.gzip)
    expect(
      result.sources.moduleRenderSizes[
        'packages/runtime/dist/compiler-runtime/server-template.js'
      ] ?? 0,
    ).toBe(0)
  }, 30_000)
})
