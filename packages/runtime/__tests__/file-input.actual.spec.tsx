// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  dispose = undefined
  document.body.innerHTML = ''
})

describe('file input recovery', () => {
  it('reads a selected file from a real DOM change event and updates the label', async () => {
    const mounted = mountCompiledFixture(`
      import { signal } from '@rue-js/rue';
      export const filename = signal('none');
      export const View = () => <section><input type="file" onChange={event => filename.set(event.currentTarget.files?.[0]?.name ?? 'none')} /><p>{filename.get()}</p></section>;
    `)
    dispose = mounted.dispose
    const input = document.querySelector('input')!
    expect(document.body.textContent).toContain('none')
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['rue'], 'rue.txt')],
    })
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await mounted.flush()
    expect(document.body.textContent).toContain('rue.txt')
    Reflect.deleteProperty(input, 'files')
  })
})
