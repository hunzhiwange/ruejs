// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  dispose = undefined
  document.body.innerHTML = ''
})

describe('component v-model recovery', () => {
  it('updates parent DOM after a child dispatches the model callback', async () => {
    const mounted = mountCompiledFixture(`
      import { signal } from '@rue-js/rue';
      export const name = signal('小明');
      const Field = props => <button onClick={() => props.onUpdateModelValue('小红')}>{props.modelValue}</button>;
      export const View = () => <section><Field modelValue={name.get()} onUpdateModelValue={value => name.set(value)} /><p>姓名：{name.get()}</p></section>;
    `)
    dispose = mounted.dispose
    expect(document.body.textContent).toContain('姓名：小明')
    document.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await mounted.flush()
    expect(document.body.textContent).toContain('姓名：小红')
  })
})
