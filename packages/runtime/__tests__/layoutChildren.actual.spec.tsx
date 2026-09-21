// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

it('updates named renderable layout props and nested children', async () => {
  const app = mountCompiledFixture(`
    import { signal } from '@rue-js/rue';
    export const compact = signal(false);
    const Layout = props => <div><header>{props.header}</header><main>{props.children}</main><footer>{props.footer}</footer></div>;
    export const View = () => <Layout header={compact.get() ? 'small' : <b>Header</b>} footer={<i>Footer</i>}><p>{compact.get() ? 'one' : 'one two'}</p></Layout>;
  `)
  disposals.push(app.dispose)
  expect(document.querySelector('header b')?.textContent).toBe('Header')
  expect(document.querySelector('main')?.textContent).toBe('one two')
  app.exports.compact.set(true)
  await app.flush()
  expect(document.querySelector('header')?.textContent).toBe('small')
  expect(document.querySelector('main')?.textContent).toBe('one')
  app.dispose()
  expect(document.body.childNodes).toHaveLength(0)
})
