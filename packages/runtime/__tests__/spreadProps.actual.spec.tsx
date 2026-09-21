// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

it('updates spread component props including addition and removal', async () => {
  const app = mountCompiledFixture(`
    import { signal } from '@rue-js/rue';
    export const attrs = signal({ label: 'Confirm', tone: 'primary', extra: 'present' });
    const Button = props => <button class={'btn btn-' + props.tone} data-extra={props.extra}>{props.label}</button>;
    export const View = () => <Button {...attrs.get()} />;
  `)
  disposals.push(app.dispose)
  const button = document.querySelector('button')!
  expect(button.className).toBe('btn btn-primary')
  expect(button.dataset.extra).toBe('present')
  app.exports.attrs.set({ label: 'Cancel', tone: 'ghost' })
  await app.flush()
  expect(document.querySelector('button')).toBe(button)
  expect(button.textContent).toBe('Cancel')
  expect(button.className).toBe('btn btn-ghost')
  expect(button.hasAttribute('data-extra')).toBe(false)
  app.dispose()
  expect(document.body.childNodes).toHaveLength(0)
})
