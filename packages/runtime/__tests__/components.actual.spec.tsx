// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

it('mounts sibling components, updates props, and notifies the parent', async () => {
  const app = mountCompiledFixture(`
    import { signal } from '@rue-js/rue';
    export const name = signal('Rue');
    export const notices = signal(0);
    const Greeting = props => <button onClick={props.onHello}>hello {props.name}</button>;
    export const View = () => <main><Greeting name={name.get()} onHello={() => notices.set(notices.get() + 1)} /><Greeting name="World" onHello={() => {}} /><output>{notices.get()}</output></main>;
  `)
  disposals.push(app.dispose)
  const first = document.querySelector('button')!
  expect([...document.querySelectorAll('button')].map(node => node.textContent)).toEqual([
    'hello Rue',
    'hello World',
  ])
  first.click()
  await app.flush()
  expect(document.querySelector('output')?.textContent).toBe('1')
  app.exports.name.set('Team')
  await app.flush()
  expect(document.querySelector('button')).toBe(first)
  expect(first.textContent).toBe('hello Team')
  app.dispose()
  expect(document.body.childNodes).toHaveLength(0)
})
