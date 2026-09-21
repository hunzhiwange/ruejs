// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

it('keeps parent-derived props live and removes them on dispose', async () => {
  const app = mountCompiledFixture(`
    import { signal } from '@rue-js/rue';
    export const percent = signal(68);
    const Child = props => <span>{props.percent >= 100 ? 'success' : 'normal'}:{props.percent}</span>;
    export const View = () => <Child percent={percent.get()} />;
  `)
  disposals.push(app.dispose)
  expect(document.body.textContent).toBe('normal:68')
  app.exports.percent.set(100)
  await app.flush()
  expect(document.body.textContent).toBe('success:100')
  app.dispose()
  expect(document.body.textContent).toBe('')
})
