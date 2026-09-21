// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  dispose = undefined
  document.body.innerHTML = ''
})

describe('event directive runtime helpers', () => {
  it('runs a compiled click handler from a real DOM event and updates text', async () => {
    const mounted = mountCompiledFixture(`
      import { signal } from '@rue-js/rue';
      export const count = signal(0);
      export const View = () => <button onClick={() => count.set(count.get() + 1)}>{count.get()}</button>;
    `)
    dispose = mounted.dispose
    expect(document.querySelector('button')?.textContent).toBe('0')
    document.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await mounted.flush()
    expect(document.querySelector('button')?.textContent).toBe('1')
  })

  it('honors once for a DOM-dispatched listener and removes its mounted node', () => {
    const host = document.createElement('div')
    const button = document.createElement('button')
    const handler = vi.fn()
    document.body.appendChild(host)
    host.appendChild(button)
    button.addEventListener('click', handler, { once: true })
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)
    button.remove()
    expect(host.childNodes).toHaveLength(0)
  })
})
