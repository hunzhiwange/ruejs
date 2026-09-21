// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  dispose = undefined
  document.body.innerHTML = ''
})

describe('DOM event binding recovery', () => {
  it('binds a native event and forwards a component emit callback', async () => {
    const save = vi.fn()
    const mounted = mountCompiledFixture(
      `
      import { useEmit } from '@rue-js/rue';
      const Child = props => { const emit = useEmit(props); return <button onClick={() => emit('save', 7)}>emit</button>; };
      export const View = props => <Child onSave={props.onSave} />;
    `,
      { props: { onSave: save } },
    )
    dispose = mounted.dispose
    document.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await mounted.flush()
    expect(save).toHaveBeenCalledWith(7)
  })
})
