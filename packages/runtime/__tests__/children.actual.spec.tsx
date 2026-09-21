// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

it('mounts, updates, and disposes nested compiled children', async () => {
  const app = mountCompiledFixture(`
    import { signal } from '@rue-js/rue';
    export const label = signal('inner');
    const Box = props => <article><h2>outer</h2>{props.children}</article>;
    export const View = () => <Box><strong>{label.get()}</strong><i>tail</i></Box>;
  `)
  disposals.push(app.dispose)
  expect(document.querySelector('article')?.textContent).toBe('outerinnertail')
  app.exports.label.set('updated')
  await app.flush()
  expect(document.querySelector('strong')?.textContent).toBe('updated')
  app.dispose()
  expect(document.body.childNodes).toHaveLength(0)
})
