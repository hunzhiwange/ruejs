// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

it('normalizes component renderables across nodes, fragments, text, and null', async () => {
  const app = mountCompiledFixture(`
    import { signal } from '@rue-js/rue';
    export const mode = signal(0);
    const Child = props => <section>{props.content}</section>;
    export const View = () => <Child content={mode.get() === 0 ? <b>node</b> : mode.get() === 1 ? <><i>a</i><i>b</i></> : mode.get() === 2 ? 'text' : null} />;
  `)
  disposals.push(app.dispose)
  expect(document.querySelector('b')?.textContent).toBe('node')
  app.exports.mode.set(1)
  await app.flush()
  expect(document.querySelector('section')?.textContent).toBe('ab')
  app.exports.mode.set(2)
  await app.flush()
  expect(document.querySelector('section')?.textContent).toBe('text')
  app.exports.mode.set(3)
  await app.flush()
  expect(document.querySelector('section')?.textContent).toBe('')
  app.dispose()
  expect(document.body.childNodes).toHaveLength(0)
})
