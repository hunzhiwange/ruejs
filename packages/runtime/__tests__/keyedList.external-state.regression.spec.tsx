// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

describe('compiled keyed rows with external state', () => {
  it('updates live rows and stops removed row bindings', async () => {
    const harness = mountCompiledFixture(`
      import { onCleanup, signal } from '@rue-js/rue';
      export const tick = signal(0);
      export const rows = signal([{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }]);
      export const runs = new Map();
      export const disposed = [];
      const Row = props => {
        onCleanup(() => disposed.push(props.id));
        return <li data-id={props.id}>{(runs.set(props.id, (runs.get(props.id) || 0) + 1), props.label + ':' + tick.get())}</li>;
      };
      export const View = () => <ul>{rows.get().map(row => <Row key={row.id} {...row}/>)}</ul>;
    `)
    disposals.push(harness.dispose)
    const a = document.querySelector('[data-id="a"]')

    harness.exports.rows.set([{ id: 'a', label: 'ALPHA' }])
    await harness.flush()
    expect(document.querySelector('[data-id="a"]')).toBe(a)
    expect(harness.exports.disposed).toEqual(['b'])
    const retiredRuns = harness.exports.runs.get('b')

    harness.exports.tick.set(1)
    await harness.flush()
    expect(a?.textContent).toBe('ALPHA:1')
    expect(harness.exports.runs.get('b')).toBe(retiredRuns)
  })
})
