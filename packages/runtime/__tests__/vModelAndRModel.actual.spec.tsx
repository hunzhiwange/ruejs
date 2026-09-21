// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  dispose = undefined
  document.body.innerHTML = ''
})

describe('v-model and r-model recovery', () => {
  it('synchronizes text and checkbox models but currently ignores model DOM events', async () => {
    const mounted = mountCompiledFixture(`
      import { signal } from '@rue-js/rue';
      export const text = signal('Rue model');
      export const accepted = signal(false);
      export const View = () => <section>
        <input data-text v-model={text.get()} />
        <input data-check type="checkbox" r-model={accepted.get()} />
        <p>{text.get()}:{String(accepted.get())}</p>
      </section>;
    `)
    dispose = mounted.dispose
    expect(document.querySelector('p')?.textContent).toBe('Rue model:false')
    const text = document.querySelector<HTMLInputElement>('[data-text]')!
    text.value = 'Rue next'
    text.dispatchEvent(new Event('input', { bubbles: true }))
    const check = document.querySelector<HTMLInputElement>('[data-check]')!
    check.checked = true
    check.dispatchEvent(new Event('change', { bubbles: true }))
    await mounted.flush()
    expect(document.querySelector('p')?.textContent).toBe('Rue next:true')
  })
})
