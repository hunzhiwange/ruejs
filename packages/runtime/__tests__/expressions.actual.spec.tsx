// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

describe('compiled JSX expressions', () => {
  it('evaluates arithmetic, template, ternary, and array expressions', () => {
    const fixture = mountCompiledFixture(`
      const name = 'Alice'; const value = 6;
      export const View = () => <section><div>{1 + 2}</div><div>{\`hello \${name}\`}</div><div>{value > 5 ? 'large' : 'small'}</div><div>{['A', 'B'].join(',')}</div></section>;
    `)
    disposals.push(fixture.dispose)
    expect(
      Array.from(document.querySelectorAll('section > div'), node => node.textContent),
    ).toEqual(['3', 'hello Alice', 'large', 'A,B'])
  })
})
