// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

it('switches provided slot content to fallback and can replay it', async () => {
  const app = mountCompiledFixture(`
    import { signal } from '@rue-js/rue';
    export const provided = signal(true);
    const Panel = props => <section><h2>{props.title ?? 'fallback title'}</h2><div>{props.children ?? 'fallback body'}</div></section>;
    export const View = () => <Panel title={provided.get() ? <b>Payment</b> : null}>{provided.get() ? <strong>99.98%</strong> : null}</Panel>;
  `)
  disposals.push(app.dispose)
  expect(document.querySelector('section')?.textContent).toBe('Payment99.98%')
  app.exports.provided.set(false)
  await app.flush()
  expect(document.querySelector('section')?.textContent).toBe('fallback titlefallback body')
  app.exports.provided.set(true)
  await app.flush()
  expect(document.querySelector('strong')?.textContent).toBe('99.98%')
  app.dispose()
  expect(document.body.childNodes).toHaveLength(0)
})
