// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

describe('compiled iteration forms', () => {
  it('updates array, object-entry and numeric map output together', async () => {
    const harness = mountCompiledFixture(`
      import { signal } from '@rue-js/rue';
      export const fruits = signal(['Apple', 'Banana']);
      export const meta = signal({ framework: 'Rue', renderer: 'Vapor' });
      export const count = signal(2);
      export const View = () => <section>
        <ul class="fruits">{fruits.get().map((fruit, index) => <li key={fruit}>{index + ':' + fruit}</li>)}</ul>
        <dl>{Object.entries(meta.get()).map(([key, value]) => <div key={key}>{key + ':' + value}</div>)}</dl>
        <p>{Array.from({ length: count.get() }, (_, index) => <b key={index}>{index + 1}</b>)}</p>
      </section>;
    `)
    disposals.push(harness.dispose)
    const banana = document.querySelectorAll('.fruits li')[1]

    harness.exports.fruits.set(['Banana', 'Cherry'])
    harness.exports.meta.set({ framework: 'Rue', syntax: 'TSX' })
    harness.exports.count.set(3)
    await harness.flush()
    expect([...document.querySelectorAll('.fruits li')].map(node => node.textContent)).toEqual([
      '0:Banana',
      '1:Cherry',
    ])
    expect(document.querySelector('.fruits li')).toBe(banana)
    expect(document.querySelector('dl')?.textContent).toBe('framework:Ruesyntax:TSX')
    expect([...document.querySelectorAll('b')].map(node => node.textContent)).toEqual([
      '1',
      '2',
      '3',
    ])
  })
})
