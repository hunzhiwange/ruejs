import { afterEach, expect, it } from 'vitest'
import { compileComponent, evaluateComponent } from './compiled-component-test-utils'
import { Component } from '../src/components/Component'
import { resolveCompilerCapability } from './compiler-capability-test-runtime'
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

it.each([
  [true, false],
  [false, false],
  [true, true],
  [false, true],
])(
  'keeps dynamic component identity and local state stable (explicit key: %s, registry: %s)',
  (explicitKey, registry) => {
    setReactiveScheduling('sync')
    const code = compileComponent(`
    import { Component, KeepAlive, ref, onActivated, onDeactivated, onUnmounted } from '@rue-js/rue';
    export const selected = ref('a'); export const label = ref('before'); export const trace = [];
    const Panel = props => {
      const count = ref(0);
      onActivated(() => trace.push(props.name + '+'));
      onDeactivated(() => trace.push(props.name + '-'));
      onUnmounted(() => trace.push(props.name + '!'));
      return <section><input/><button onClick={() => count.value++}>{count.value}</button><span>{props.label}</span></section>;
    };
    const A = props => <Panel name="a" label={props.label}/>;
    const B = props => <Panel name="b" label={props.label}/>;
    const views = { a: A, b: B };
    export const View = () => <KeepAlive><Component ${registry ? 'is={selected.value} registry={{a:A,b:B}}' : 'is={views[selected.value]}'} ${explicitKey ? 'key={selected.value}' : ''} label={label.value}/></KeepAlive>;
  `)
    const module = { exports: {} as any }
    new Function('require', 'module', 'exports', code)(
      (id: string) => (id === '@rue-js/rue' ? { Component } : resolveCompilerCapability(id)),
      module,
      module.exports,
    )
    const app = module.exports
    const root = app.View()
    root.__rue_compiled_mount(document.body)
    const input = document.querySelector('input')!
    input.value = 'draft'
    document.querySelector('button')!.click()
    expect(document.querySelector('button')!.textContent).toBe('1')
    app.selected.value = 'b'
    const second = document.querySelector('input')!
    expect(second).not.toBe(input)
    app.label.value = 'after'
    app.selected.value = 'a'
    expect(document.querySelector('input')).toBe(input)
    expect(input.value).toBe('draft')
    expect(document.querySelector('button')!.textContent).toBe('1')
    expect(document.querySelector('span')!.textContent).toBe('after')
    app.selected.value = 'b'
    expect(document.querySelector('input')).toBe(second)
    root.dispose()
    expect(app.trace).toEqual(['a+', 'a-', 'b+', 'b-', 'a+', 'a-', 'b+', 'b-', 'a!', 'b!'])
  },
)
