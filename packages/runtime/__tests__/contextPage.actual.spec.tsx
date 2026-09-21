// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

it('shares a live owner value through deep component props and cleans consumers', async () => {
  const app = mountCompiledFixture(`
    import { signal } from '@rue-js/rue';
    export const count = signal(1);
    const Deep = props => <output>deep:{props.value}</output>;
    const Consumer = props => <section><span>shared:{props.value}</span><Deep value={props.value} /></section>;
    export const View = () => <Consumer value={count.get()} />;
  `)
  disposals.push(app.dispose)
  expect(document.body.textContent).toBe('shared:1deep:1')
  app.exports.count.set(2)
  await app.flush()
  expect(document.body.textContent).toBe('shared:2deep:2')
  app.dispose()
  expect(document.querySelector('output')).toBeNull()
})
