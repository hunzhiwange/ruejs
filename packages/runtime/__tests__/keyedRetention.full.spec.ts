// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

describe('compiled keyed owner retention', () => {
  it('retains reused owners and disposes removed rows exactly once', async () => {
    const harness = mountCompiledFixture(`
      import { onCleanup, signal } from '@rue-js/rue';
      export const rows = signal([{ id: 1 }, { id: 2 }, { id: 3 }]);
      export const mounts = new Map(); export const cleanups = new Map();
      const Row = props => {
        mounts.set(props.id, (mounts.get(props.id) || 0) + 1);
        onCleanup(() => cleanups.set(props.id, (cleanups.get(props.id) || 0) + 1));
        return <li data-id={props.id}>{props.id}</li>;
      };
      export const View = () => <ul>{rows.get().map(row => <Row key={row.id} id={row.id}/>)}</ul>;
    `)
    disposals.push(harness.dispose)
    const nodes = new Map(
      [...document.querySelectorAll('li')].map(node => [node.textContent, node]),
    )

    harness.exports.rows.set([{ id: 3 }, { id: 1 }])
    await harness.flush()
    expect([...document.querySelectorAll('li')]).toEqual([nodes.get('3'), nodes.get('1')])
    expect(harness.exports.mounts.get(1)).toBe(1)
    expect(harness.exports.mounts.get(3)).toBe(1)
    expect(harness.exports.cleanups.get(2)).toBe(1)

    harness.dispose()
    expect(harness.exports.cleanups.get(1)).toBe(1)
    expect(harness.exports.cleanups.get(2)).toBe(1)
    expect(harness.exports.cleanups.get(3)).toBe(1)
  })
})
