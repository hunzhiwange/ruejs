// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  dispose = undefined
  document.body.innerHTML = ''
})

describe('named model recovery', () => {
  it('updates a named model through a DOM-dispatched child event', async () => {
    const mounted = mountCompiledFixture(`
      import { signal } from '@rue-js/rue';
      export const enabled = signal(false);
      const Toggle = props => <button onClick={() => props.onUpdateEnabled(!props.enabled)}>{String(props.enabled)}</button>;
      export const View = () => <section><Toggle enabled={enabled.get()} onUpdateEnabled={value => enabled.set(value)} /><p>启用状态：{String(enabled.get())}</p></section>;
    `)
    dispose = mounted.dispose
    expect(document.body.textContent).toContain('启用状态：false')
    document.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await mounted.flush()
    expect(document.body.textContent).toContain('启用状态：true')
  })
})
