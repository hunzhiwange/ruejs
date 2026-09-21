// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

describe('compiled map list rendering', () => {
  it('inserts and removes keyed map rows without replacing survivors', async () => {
    const harness = mountCompiledFixture(`
      import { signal } from '@rue-js/rue';
      export const fruits = signal([{ id: 1, name: 'Apple' }, { id: 2, name: 'Banana' }]);
      export const View = () => <ol>{fruits.get().map(fruit => <li key={fruit.id} data-id={fruit.id}>{fruit.name}</li>)}</ol>;
    `)
    disposals.push(harness.dispose)
    const banana = document.querySelector('[data-id="2"]')

    harness.exports.fruits.set([
      { id: 3, name: 'Cherry' },
      { id: 2, name: 'BANANA' },
    ])
    await harness.flush()
    expect([...document.querySelectorAll('li')].map(node => node.textContent)).toEqual([
      'Cherry',
      'BANANA',
    ])
    expect(document.querySelector('[data-id="2"]')).toBe(banana)
    expect(document.querySelector('[data-id="1"]')).toBeNull()
  })
})
