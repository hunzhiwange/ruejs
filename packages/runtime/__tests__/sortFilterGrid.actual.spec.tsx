// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

describe('compiled sort/filter grid', () => {
  it('sorts, filters and restores keyed rows with correct identity', async () => {
    const harness = mountCompiledFixture(`
      import { computed, signal } from '@rue-js/rue';
      export const query = signal(''); export const descending = signal(false);
      const source = [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }, { id: 3, name: 'Gamma' }];
      export const visible = computed(() => source.filter(row => row.name.toLowerCase().includes(query.get())).sort((a,b) => descending.get() ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)));
      export const View = () => <table><tbody>{visible.get().map(row => <tr key={row.id} data-id={row.id}><td>{row.name}</td></tr>)}</tbody></table>;
    `)
    disposals.push(harness.dispose)
    const beta = document.querySelector('[data-id="2"]')

    harness.exports.descending.set(true)
    await harness.flush()
    expect([...document.querySelectorAll('tr')].map(node => node.dataset.id)).toEqual([
      '3',
      '2',
      '1',
    ])
    expect(document.querySelector('[data-id="2"]')).toBe(beta)

    harness.exports.query.set('bet')
    await harness.flush()
    expect([...document.querySelectorAll('tr')]).toEqual([beta])
  })
})
