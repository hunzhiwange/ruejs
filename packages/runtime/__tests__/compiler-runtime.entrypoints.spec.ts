import { describe, expect, it } from 'vitest'

import * as compilerRuntime from '../src/compiler-internal'
import * as listRuntime from '../src/compiler-runtime/entries/list'

describe('compiler runtime list entrypoints', () => {
  it('exports the ownerless single-row mount helper from list and compiler entries', () => {
    expect(listRuntime._$mountCompiledKeyedSingleRowOwnerless).toBeTypeOf('function')
    expect(compilerRuntime._$mountCompiledKeyedSingleRowOwnerless).toBe(
      listRuntime._$mountCompiledKeyedSingleRowOwnerless,
    )
  })
})
