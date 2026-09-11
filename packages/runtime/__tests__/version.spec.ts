import { describe, expect, it } from 'vitest'

import { version as runtimeVersion } from '@rue-js/runtime'
import { version as rueVersion } from '@rue-js/rue'

describe('version export', () => {
  it('exposes the injected Rue version from the default public entries', () => {
    expect(runtimeVersion).toBe('test')
    expect(rueVersion).toBe(runtimeVersion)
    expect(typeof rueVersion).toBe('string')
  })
})
