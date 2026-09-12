// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { compileComponent, evaluateComponent } from './compiled-component-test-utils'
import { _$createComponent } from '../src/compiled-component-call'
import {
  setReactiveScheduling,
  __rueGetCompiledReactiveDebugState,
} from '../src/runtime-core/compiled'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
  setReactiveScheduling('frame')
})
const source = `
import { signal, onMounted, onUnmounted, onBeforeUpdate, onUpdated } from '@rue-js/rue';
export const values = signal({label:'one', extra:'present'});
export const trace = {calls:0, mounted:0, unmounted:0, beforeUpdate:0, updated:0};
const Child = props => {
  trace.calls++;
  onBeforeUpdate(() => trace.beforeUpdate++);
  onUpdated(() => trace.updated++);
  onMounted(() => trace.mounted++);
  onUnmounted(() => trace.unmounted++);
  return <section><input value={props.label}/><span>{props.label}</span><b>{props.extra ?? 'missing'}</b></section>;
};
export const View = () => <main><Child {...values.get()}/></main>;
`

describe('closed component factory', () => {
  it.each(['sync', 'microtask'] as const)(
    'preserves opaque children when a route-like selector stays on the same branch (%s)',
    async mode => {
      setReactiveScheduling(mode)
      const { exports: app } = evaluateComponent(`
        import { signal, onUnmounted } from '@rue-js/rue';
        export const route = signal('overview');
        export const trace = { unmounted: 0 };
        const insideLayout = () => route.get() !== 'outside';
        export const Child = () => {
          onUnmounted(() => trace.unmounted++);
          return <input value="preserved" />;
        };
        export const View = props => {
          if (insideLayout()) return <>{props.children}</>;
          const label = route.get().toUpperCase();
          return <p>{label}</p>;
        };
      `)
      const child = _$createComponent(app.Child, {})
      const root = _$createComponent(app.View, { children: child })
      disposals.push(() => {
        root.dispose()
        child.dispose()
        app.route.dispose()
      })
      root.__rue_compiled_mount(document.body)
      const input = document.querySelector('input')!
      input.focus()
      for (const path of ['guards', 'overview', 'guards']) {
        app.route.set(path)
        await new Promise(resolve => setTimeout(resolve, 0))
        expect(document.querySelector('input')).toBe(input)
        expect(document.activeElement).toBe(input)
        expect(app.trace.unmounted).toBe(0)
      }
      app.route.set('outside')
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(document.querySelector('input')).toBeNull()
      expect(document.querySelector('p')?.textContent).toBe('OUTSIDE')
      expect(app.trace.unmounted).toBe(1)
    },
  )

  it('has no class, arbitrary value, registry, or runtime bridge path', () => {
    for (const file of ['compiler-runtime/component-call.ts', 'compiler-runtime/component.ts']) {
      const implementation = readFileSync(`packages/runtime/src/${file}`, 'utf8')
      expect(implementation).not.toMatch(
        /compiledValue|compiled-render-anchor|internal-reactive|island-protocol|prototype\?\.render|__rue_compiled_runtime_bridge|Function\.prototype\.toString/,
      )
    }
    const code = compileComponent(source)
    expect(code).toContain('_$compiledComponent')
    expect(code).not.toMatch(
      /compiledValue(?!Factory)|renderAnchor|compiledDynamicComponent|MarkComponentRenderReactive/,
    )
    expect(code).toContain('_$rueSlots')
    expect(code).toContain('_$rueOwner')
  })

  it.each(['sync', 'microtask'] as const)(
    'updates props with stable DOM and a single lifecycle (%s)',
    async mode => {
      setReactiveScheduling(mode)
      const { exports: app } = evaluateComponent(source)
      const root = _$createComponent(app.View, {})
      disposals.push(() => {
        root.dispose()
        app.values.dispose()
      })
      root.__rue_compiled_mount(document.body)
      const input = document.querySelector('input')!
      input.focus()
      app.values.set({ label: 'two' })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(document.querySelector('input')).toBe(input)
      expect(document.activeElement).toBe(input)
      expect(input.value).toBe('two')
      expect(document.querySelector('span')?.textContent).toBe('two')
      expect(document.querySelector('b')?.textContent).toBe('missing')
      expect(app.trace).toEqual({ calls: 1, mounted: 1, unmounted: 0, beforeUpdate: 1, updated: 1 })
      root.dispose()
      root.dispose()
      expect(app.trace.unmounted).toBe(1)
      expect(document.body.childNodes.length).toBe(0)
    },
  )

  it('compiles multiple children to one slot factory', () => {
    const { code, exports: app } = evaluateComponent(`
      const Child = props => <section>{props.children}</section>;
      export const View = () => <Child><i>one</i><b>two</b></Child>;
    `)
    expect(code).not.toMatch(/compiledValue|renderAnchor/)
    const root = _$createComponent(app.View, {})
    disposals.push(() => root.dispose())
    root.__rue_compiled_mount(document.body)
    expect(document.querySelector('section')?.textContent).toBe('onetwo')
  })

  it('mounts compound member components through the closed component ABI', () => {
    const { code, exports: app } = evaluateComponent(`
      const Root = props => <section>{props.children}</section>;
      const Content = props => <strong>{props.children}</strong>;
      const Compound = Object.assign(Root, { Content });
      export const View = () => <Compound><Compound.Content>member</Compound.Content></Compound>;
    `)
    expect(code).toMatch(/_\$mountCompiledComponent\)[^;]+Compound\.Content/)
    const root = _$createComponent(app.View, {})
    disposals.push(() => root.dispose())
    root.__rue_compiled_mount(document.body)
    expect(document.querySelector('section')?.textContent).toBe('member')
  })

  it('compiles a finite component choice into branches', () => {
    setReactiveScheduling('sync')
    const { code, exports: app } = evaluateComponent(`
      import { signal } from '@rue-js/rue';
      export const choice = signal('a');
      const A = props => <i>{props.label}</i>;
      const B = props => <b>{props.label}</b>;
      export const View = () => <Component is={choice.get()} registry={{a:A,b:B}} label="ok"/>;
    `)
    expect(code).not.toMatch(/compiledDynamicComponent|mountCompiledDynamic/)
    expect(code).toContain('switch')
    const root = _$createComponent(app.View, {})
    disposals.push(() => {
      root.dispose()
      app.choice.dispose()
    })
    root.__rue_compiled_mount(document.body)
    expect(document.querySelector('i')?.textContent).toBe('ok')
    app.choice.set('b')
    expect(document.querySelector('i')).toBeNull()
    expect(document.querySelector('b')?.textContent).toBe('ok')
  })

  it.each([
    'class Child { render(){return <i/>} }; export const View=()=> <Child/>;',
    'export const View=props => <Component is={props.kind} registry={props.registry}/>;',
    'export const View=props => <props.component/>;',
  ])('rejects unsupported component expressions', source => {
    expect(() => compileComponent(source)).toThrow(/component|factory|registry/i)
  })
})

it('releases component owners, props records, and effects after repeated mounts', () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(source)
  const baseline = __rueGetCompiledReactiveDebugState()
  for (let i = 0; i < 30; i++) {
    const root = _$createComponent(app.View, {})
    root.__rue_compiled_mount(document.body)
    app.values.set({ label: String(i) })
    root.dispose()
    expect(document.body.childNodes.length).toBe(0)
    expect(__rueGetCompiledReactiveDebugState()).toEqual(baseline)
  }
  app.values.dispose()
})

it('forwards a slot factory through a component branch', () => {
  const { code, exports: app } = evaluateComponent(`
    const Child=props => <article>{props.children}</article>;
    const Forward=props => <Child>{props.children}</Child>;
    export const View=()=> <Forward><b>forwarded</b><i>tail</i></Forward>;
  `)
  expect(code).not.toMatch(/compiledSlotValue|renderAnchor/)
  const root = _$createComponent(app.View, {})
  try {
    root.__rue_compiled_mount(document.body)
    expect(document.querySelector('article')?.textContent).toBe('forwardedtail')
  } finally {
    root.dispose()
  }
})

it('passes named and default factories through the explicit slots parameter', () => {
  const { code, exports: app } = evaluateComponent(`
    const Frame=(props, outlets)=> <section><header>{outlets.header}</header><main>{outlets.default}</main></section>;
    export const View=()=> <Frame><Template slot="header"><b>heading</b></Template><i>body</i></Frame>;
  `)
  expect(code).not.toMatch(/compiledSlotValue|renderAnchor/)
  const root = _$createComponent(app.View, {})
  try {
    root.__rue_compiled_mount(document.body)
    expect(document.querySelector('header')?.textContent).toBe('heading')
    expect(document.querySelector('main')?.textContent).toBe('body')
  } finally {
    root.dispose()
  }
})

it('compiles an empty component to an empty closed block', () => {
  const { exports: app } = evaluateComponent(
    'const Empty=()=>null;export const View=()=> <main><Empty/><b>tail</b></main>',
  )
  const root = _$createComponent(app.View, {})
  try {
    root.__rue_compiled_mount(document.body)
    expect(document.querySelector('main')?.textContent).toBe('tail')
  } finally {
    root.dispose()
  }
})

it('updates computed slot names without retaining the old slot block', () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import {signal} from '@rue-js/rue';
    export const name=signal('header');
    const Frame=(props, outlets)=> <section><header>{outlets.header}</header><footer>{outlets.footer}</footer></section>;
    export const View=()=> <Frame><Template slot={name.get()}><b>content</b></Template></Frame>;
  `)
  const root = _$createComponent(app.View, {})
  try {
    root.__rue_compiled_mount(document.body)
    expect(document.querySelector('header')?.textContent).toBe('content')
    app.name.set('footer')
    expect(document.querySelector('header')?.textContent).toBe('')
    expect(document.querySelector('footer')?.textContent).toBe('content')
    expect(document.querySelectorAll('b')).toHaveLength(1)
  } finally {
    root.dispose()
    app.name.dispose()
  }
})

it('preserves resource props when a child branch becomes visible', () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import {signal} from '@rue-js/rue';
    export const loading=signal(true);
    const resource={loading,data:{get:()=>['resolved commit']}};
    const ResourceContent=props=><p>{String(props.resource.data.get()[0])}</p>;
    export const View=()=> <main><span>{String(loading.get())}</span>{!loading.get() && <ResourceContent resource={resource}/>}</main>;
  `)
  const root = _$createComponent(app.View, {})
  try {
    root.__rue_compiled_mount(document.body)
    expect(document.querySelector('p')).toBeNull()
    app.loading.set(false)
    expect(document.querySelector('p')?.textContent).toBe('resolved commit')
  } finally {
    root.dispose()
    app.loading.dispose()
  }
})

it('preserves a named default slot when no children factory is present', () => {
  const {
    exports: { View },
  } = evaluateComponent(`
    const Frame = (props, slots) => <main>{slots.default}</main>;
    export const View = () => <Frame><Template slot="default"><b>default body</b></Template></Frame>;
  `)
  const block = _$createComponent(View, {})
  block.__rue_compiled_mount(document.body)
  disposals.push(() => block.dispose())
  expect(document.body.textContent).toBe('default body')
})
