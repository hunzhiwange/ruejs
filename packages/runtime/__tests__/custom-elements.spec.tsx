import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { useCustomElement as runtimeUseCustomElement } from '@rue-js/runtime'
import { useCustomElement as rueUseCustomElement } from '@rue-js/rue'

describe('custom element public boundary', () => {
  it('exports useCustomElement from the runtime and Rue entries', () => {
    expect(runtimeUseCustomElement).toBeTypeOf('function')
    expect(rueUseCustomElement).toBe(runtimeUseCustomElement)
  })

  it('keeps the implementation on the compiled runtime ABI', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'packages/runtime/src/custom-elements.ts'),
      'utf8',
    )
    expect(source).not.toContain('@rue-js/runtime-vapor')
    expect(source).not.toContain('runtime.vapor')
    expect(source).not.toContain('renderAnchor')
  })
})
