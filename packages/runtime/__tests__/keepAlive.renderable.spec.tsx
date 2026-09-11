import { afterEach, expect, it } from 'vitest'
import { evaluateComponent } from './compiled-component-test-utils'
import { setReactiveScheduling } from '../src/runtime-core/compiled'

afterEach(() => {
  document.body.innerHTML = ''
  setReactiveScheduling('frame')
})
it('compiled KeepAlive retains edited inputs by explicit key and evicts LRU entries', () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import { KeepAlive, signal } from '@rue-js/rue';
    export const key = signal('a'); export const max = signal(2); export const include = signal('Panel');
    export const View = () => <KeepAlive cacheKey={key.get()} cacheName="Panel" max={max.get()} include={include.get()}><input/></KeepAlive>;
  `)
  const root = app.View()
  root.__rue_compiled_mount(document.body)
  const first = document.querySelector('input')!
  first.value = 'edited'
  app.key.set('b')
  expect(document.querySelector('input')).not.toBe(first)
  app.key.set('a')
  expect(document.querySelector('input')).toBe(first)
  expect(first.value).toBe('edited')
  app.max.set(1)
  app.key.set('b')
  app.key.set('a')
  expect(document.querySelector('input')).not.toBe(first)
  const current = document.querySelector('input')!
  app.include.set('Other')
  app.key.set('c')
  app.key.set('a')
  expect(document.querySelector('input')).not.toBe(current)
  root.dispose()
  expect(document.body.childNodes).toHaveLength(0)
})

it('compiled cached child owners receive activation, deactivation and final unmount once', () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import { KeepAlive, signal, onActivated, onDeactivated, onUnmounted } from '@rue-js/rue';
    export const key = signal('a'); export const trace = [];
    const Child = () => { const id = key.get(); onActivated(() => trace.push(id + '+')); onDeactivated(() => trace.push(id + '-')); onUnmounted(() => trace.push(id + '!')); return <input/>; };
    export const View = () => <KeepAlive cacheKey={key.get()}><Child/></KeepAlive>;
  `)
  const root = app.View()
  root.__rue_compiled_mount(document.body)
  app.key.set('b')
  app.key.set('a')
  root.dispose()
  expect(app.trace).toEqual(['a+', 'a-', 'b+', 'b-', 'a+', 'a-', 'a!', 'b!'])
})

it('compiled conditional KeepAlive caches the selected branch without switching parked branches', () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import { KeepAlive, signal } from '@rue-js/rue'; export const selected = signal(true);
    export const View = () => <KeepAlive>{selected.get() ? <input value="a"/> : <textarea>b</textarea>}</KeepAlive>;
  `)
  const root = app.View()
  root.__rue_compiled_mount(document.body)
  const input = document.querySelector('input')!
  input.value = 'edited'
  app.selected.set(false)
  expect(document.querySelector('textarea')).not.toBeNull()
  app.selected.set(true)
  expect(document.querySelector('input')).toBe(input)
  expect(input.value).toBe('edited')
  root.dispose()
})
