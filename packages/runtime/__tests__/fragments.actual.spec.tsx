// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

describe('compiled fragments', () => {
  it('renders sibling fragment children without an element wrapper', () => {
    const fixture = mountCompiledFixture(
      `export const View = () => <section><><span>one</span><span>two</span></></section>;`,
    )
    disposals.push(fixture.dispose)
    const section = document.querySelector('section')!
    expect(Array.from(section.children, node => node.textContent)).toEqual(['one', 'two'])
    expect(section.querySelectorAll(':scope > span')).toHaveLength(2)
  })

  it('preserves keyed siblings when a fragment row is removed and restored', () => {
    const fixture = mountCompiledFixture(`
      import { signal } from '@rue-js/rue';
      export const show = signal(true);
      export const View = () => <section><>{show.get() ? <span key="alpha" data-row="alpha">Alpha</span> : null}<span key="beta" data-row="beta">Beta</span><span key="gamma" data-row="gamma">Gamma</span></></section>;
    `)
    disposals.push(fixture.dispose)
    const beta = document.querySelector('[data-row="beta"]')
    const gamma = document.querySelector('[data-row="gamma"]')
    fixture.exports.show.set(false)
    expect(document.querySelector('[data-row="alpha"]')).toBeNull()
    expect(document.querySelector('[data-row="beta"]')).toBe(beta)
    expect(document.querySelector('[data-row="gamma"]')).toBe(gamma)
    fixture.exports.show.set(true)
    expect(document.querySelector('[data-row="alpha"]')?.textContent).toBe('Alpha')
    expect(document.querySelector('[data-row="beta"]')).toBe(beta)
  })
})
