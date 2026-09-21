// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []

afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

const source = `
import { signal } from '@rue-js/rue';
export const count = signal(0);
const Child = props => <p class="child">{props.children}</p>;
export const View = props => (
  <section>
    <h1>{props.label}</h1>
    <button onClick={() => count.set(count.get() + 1)}>{count.get()}</button>
    <Child><em>child</em></Child>
  </section>
);
`

describe('restored test harness', () => {
  it.each(['sync', 'microtask'] as const)(
    'mounts updates and disposes a compiled fixture (%s)',
    async scheduling => {
      const harness = mountCompiledFixture(source, {
        exportName: 'View',
        host: document.body,
        props: { label: 'ready' },
        scheduling,
      })
      disposals.push(harness.dispose)

      expect(document.querySelector('h1')?.textContent).toBe('ready')
      expect(document.querySelector('.child')?.textContent).toBe('child')

      document.querySelector('button')?.click()
      await harness.flush()
      expect(document.querySelector('button')?.textContent).toBe('1')

      harness.dispose()
      expect(document.body.childNodes).toHaveLength(0)

      harness.exports.count.set(2)
      await harness.flush()
      expect(document.body.childNodes).toHaveLength(0)
    },
  )
})
