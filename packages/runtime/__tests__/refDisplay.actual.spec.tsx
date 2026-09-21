// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

it('unwraps a ref at a compiled JSX display boundary and tracks updates', () => {
  const mounted = mountCompiledFixture(`
    import { ref } from '@rue-js/rue'
    export const count = ref('one')
    export const View = () => <output>{count}</output>
  `)
  try {
    expect(document.body.textContent).toBe('one')
    mounted.exports.count.value = 'two'
    expect(document.body.textContent).toBe('two')
  } finally {
    mounted.dispose()
  }
})
