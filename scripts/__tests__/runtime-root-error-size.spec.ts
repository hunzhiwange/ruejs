import { describe, expect, it } from 'vitest'
import { buildRuntimeSizePreset } from '../runtime-size-audit.js'

const rootErrorPreset = Object.freeze({
  name: 'root-mount-error-only',
  input: Object.freeze([
    Object.freeze({
      entry: '@rue-js/runtime/dist/error-capture.js',
      imports: Object.freeze(['retainRootMountError', 'shouldRetainRootMountError']),
    }),
  ]),
  builtin: false,
})

describe('runtime root mount error production size', () => {
  it('keeps the error-capture exports without retaining the general reactive facade', async () => {
    const result = await buildRuntimeSizePreset(rootErrorPreset)
    const rendered = result.sources.moduleRenderSizes

    expect(result.resolvedEntries).toEqual([
      expect.objectContaining({
        entry: '@rue-js/runtime/dist/error-capture.js',
        resolvedEntry: 'packages/runtime/dist/error-capture.js',
      }),
    ])
    expect(result.raw).toBeGreaterThan(0)
    expect(result.min).toBeGreaterThan(0)
    expect(result.gzip).toBeGreaterThan(0)
    expect(rendered['packages/runtime/dist/runtime-core/reactive.shared.js'] ?? 0).toBe(0)
    expect(rendered['packages/runtime/dist/runtime-core/js-reactive/facade.js'] ?? 0).toBe(0)
    expect(rendered['packages/runtime/dist/runtime-core/js-reactive/hooks/values.js'] ?? 0).toBe(0)
  }, 30_000)
})
