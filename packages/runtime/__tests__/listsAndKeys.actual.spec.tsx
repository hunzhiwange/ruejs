// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

describe('compiled lists and keys', () => {
  it('preserves node identity, focus and local input state across keyed reorder', async () => {
    const harness = mountCompiledFixture(`
      import { signal } from '@rue-js/rue';
      export const rows = signal([{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }, { id: 'c', label: 'Gamma' }]);
      export const View = () => <ul>{rows.get().map((row, index) =>
        <li key={row.id} data-id={row.id}><span>{index + ':' + row.label}</span><input/></li>
      )}</ul>;
    `)
    disposals.push(harness.dispose)
    const a = document.querySelector('[data-id="a"]')!
    const input = a.querySelector('input')!
    input.value = 'draft'
    input.focus()

    harness.exports.rows.set([
      { id: 'c', label: 'Gamma' },
      { id: 'a', label: 'ALPHA' },
      { id: 'b', label: 'Beta' },
    ])
    await harness.flush()
    expect([...document.querySelectorAll('li')].map(node => node.dataset.id)).toEqual([
      'c',
      'a',
      'b',
    ])
    expect(document.querySelector('[data-id="a"]')).toBe(a)
    expect(a.querySelector('span')?.textContent).toBe('1:ALPHA')
    expect(a.querySelector('input')).toBe(input)
    expect(input.value).toBe('draft')
    // Current regression: moving the connected keyed row retains its nodes/state but blurs input.
    expect(document.activeElement).toBe(input)
  })
})
