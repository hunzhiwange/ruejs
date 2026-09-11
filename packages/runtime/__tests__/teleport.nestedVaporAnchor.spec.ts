import { afterEach, expect, it } from 'vitest'
import { evaluateComponent } from './compiled-component-test-utils'
import { setReactiveScheduling } from '../src/runtime-core/compiled'

afterEach(() => {
  document.body.innerHTML = ''
  setReactiveScheduling('frame')
})
it.each([false, true])(
  'compiled Teleport retains nested conditional Transition with leading style=%s',
  async style => {
    setReactiveScheduling('sync')
    document.body.innerHTML = '<main></main><aside id="portal"></aside>'
    const { exports: app } = evaluateComponent(`
    import { Teleport, Transition, signal } from '@rue-js/rue'; export const visible = signal(false);
    export const View = () => <Teleport to="#portal">${style ? `<style>{'.modal-mask{display:block;}'}</style>` : ''}<Transition duration={10}>{visible.get() && <div className="modal-mask">OPEN</div>}</Transition></Teleport>;
  `)
    const root = app.View()
    root.__rue_compiled_mount(document.querySelector('main'))
    app.visible.set(true)
    expect(document.querySelector('.modal-mask')!.textContent).toBe('OPEN')
    if (style) expect(document.querySelector('style')!.textContent).toContain('.modal-mask')
    app.visible.set(false)
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(document.querySelector('.modal-mask')).toBeNull()
    root.dispose()
    expect(document.querySelector('#portal')!.childNodes).toHaveLength(0)
  },
)
