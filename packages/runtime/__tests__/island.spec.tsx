// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { compileNodePlan } from './node-plan-test-utils'
import { fixture } from './node-plan.fixture'
import {
  mountRueIsland,
  serializeIslandProps,
  deserializeIslandProps,
  createIslandContainerHtml,
  startRueIslandLoader,
  registerRueIsland,
} from '../src/island'

const flush = async () => {
  await Promise.resolve()
  await new Promise(resolve => setTimeout(resolve, 40))
}
describe('compiled hydration and Island scheduling boundary', () => {
  it('claims the exact SSR nodes and binds text, props, events, component slots, branches and keyed lists', async () => {
    const server = compileNodePlan(fixture, 'server')
    const client = compileNodePlan(fixture, 'hydrate')
    const host = document.createElement('div')
    host.innerHTML = await server.renderToString(server.View)
    const button = host.querySelector('button')!
    const rows = Array.from(host.querySelectorAll('li'))
    const handle = client.hydrateRoot(host, client.View)
    expect(host.querySelector('button')).toBe(button)
    expect(host.querySelector('svg text')?.namespaceURI).toBe('http://www.w3.org/2000/svg')
    expect(host.querySelector('foreignObject div')?.namespaceURI).toBe(
      'http://www.w3.org/1999/xhtml',
    )
    button.click()
    expect(client.clicks.get()).toBe(1)
    client.title.set('next')
    client.active.set(false)
    client.rows.set([
      { id: 2, label: 'TWO' },
      { id: 1, label: 'ONE' },
      { id: 3, label: 'three' },
    ])
    await flush()
    expect(button.textContent).toBe('next')
    expect(host.querySelector('main')?.getAttribute('title')).toBe('next')
    expect(host.querySelector('strong')?.textContent).toBe('nextslot')
    expect(host.querySelector('i')?.textContent).toBe('no')
    const reordered = Array.from(host.querySelectorAll('li'))
    expect(reordered.map(node => node.textContent)).toEqual(['TWO', 'ONE', 'three'])
    expect(reordered[0]).toBe(rows[1])
    expect(reordered[1]).toBe(rows[0])
    expect(client.code).not.toMatch(/internal\/dom|internal\/block|serverElement|renderAnchor/)
    expect(client.modules.join('\n')).not.toMatch(
      /js-runtime|compiled-render-anchor|\/island\.ts|\/dom\.ts/,
    )
    handle.unmount()
    expect(host.childNodes).toHaveLength(0)
    button.click()
    expect(client.clicks.get()).toBe(1)
  })
  it('reports the node path on mismatch and never redraws the SSR tree', async () => {
    const source = 'export const View = () => <section><button>stable</button></section>'
    const server = compileNodePlan(source, 'server'),
      client = compileNodePlan(source, 'hydrate')
    const host = document.createElement('div')
    host.innerHTML = await server.renderToString(server.View)
    const section = host.firstElementChild!
    host.querySelector('button')!.outerHTML = '<input value="typed">'
    const input = host.querySelector('input')!
    expect(() => client.hydrateRoot(host, client.View)).toThrow(/hydration mismatch at root\/0\/1/)
    expect(host.firstElementChild).toBe(section)
    expect(host.querySelector('input')).toBe(input)
    expect(input.value).toBe('typed')
  })
  it('rejects missing or extra markers without a client render fallback', async () => {
    const source = 'export const View = () => <p>text</p>'
    const server = compileNodePlan(source, 'server'),
      client = compileNodePlan(source, 'hydrate')
    for (const html of [
      '<p>text</p>',
      (await server.renderToString(server.View)) + '<aside>extra</aside>',
    ]) {
      const host = document.createElement('div')
      host.innerHTML = html
      const first = host.firstChild
      expect(() => client.hydrateRoot(host, client.View)).toThrow(/hydration mismatch/)
      expect(host.firstChild).toBe(first)
    }
  })
  it('keeps Island module loading separate from the root claim entry', async () => {
    const source = 'export const View = props => <button>{props.label}</button>'
    const server = compileNodePlan(source, 'server'),
      client = compileNodePlan(source, 'hydrate')
    const island = document.createElement('rue-island')
    island.innerHTML = await server.renderToString(server.View, { props: { label: 'island' } })
    const button = island.querySelector('button')
    const result = await mountRueIsland(
      island,
      { default: client.View },
      { island, props: { label: 'island' }, strategy: 'load' },
      client.hydrateRoot,
    )
    expect(island.querySelector('button')).toBe(button)
    ;(result as { unmount(): void }).unmount()
    expect(island.childNodes).toHaveLength(0)
    expect(deserializeIslandProps(serializeIslandProps({ text: '</script>' }))).toEqual({
      text: '</script>',
    })
  })
})

describe('builtin claim lifecycle', () => {
  it('claims Teleport inline and preserves node identity across target and disabled updates', async () => {
    const source = `import { Teleport as Portal, signal } from '@rue-js/rue'; export const disabled = signal(false); export const target = signal('#one'); export const View = () => <Portal to={target.get()} disabled={disabled.get()}><input value="initial"/></Portal>;`
    const server = compileNodePlan(source, 'server'),
      client = compileNodePlan(source, 'hydrate')
    document.body.innerHTML = '<main></main><aside id="one"></aside><aside id="two"></aside>'
    const host = document.querySelector('main')!
    host.innerHTML = await server.renderToString(server.View)
    const input = host.querySelector('input')!
    const handle = client.hydrateRoot(host, client.View)
    expect(document.querySelector('#one input')).toBe(input)
    input.value = 'typed'
    client.target.set('#two')
    await flush()
    expect(document.querySelector('#two input')).toBe(input)
    expect(input.value).toBe('typed')
    client.disabled.set(true)
    await flush()
    expect(host.querySelector('input')).toBe(input)
    client.disabled.set(false)
    await flush()
    handle.unmount()
    expect(document.querySelector('input')).toBeNull()
  })
  it('keeps cached hydrated branch nodes and disposes both active and parked owners', async () => {
    const source = `import { KeepAlive, signal } from '@rue-js/rue'; export const active = signal(true); export const View = () => <KeepAlive max={2}>{active.get() ? <input value="one"/> : <button>two</button>}</KeepAlive>;`
    const server = compileNodePlan(source, 'server'),
      client = compileNodePlan(source, 'hydrate')
    const host = document.createElement('div')
    host.innerHTML = await server.renderToString(server.View)
    const input = host.querySelector('input')!
    const handle = client.hydrateRoot(host, client.View)
    input.value = 'typed'
    client.active.set(false)
    await flush()
    expect(host.querySelector('input')).toBeNull()
    client.active.set(true)
    await flush()
    expect(host.querySelector('input')).toBe(input)
    expect(input.value).toBe('typed')
    handle.unmount()
    client.active.set(false)
    await flush()
    expect(host.childNodes).toHaveLength(0)
  })
  it('runs transition leave/enter hooks for a claimed conditional branch', async () => {
    const source = `import { Transition, signal } from '@rue-js/rue'; export const active = signal(true); export const calls = []; export const View = () => <Transition css={false} onEnter={(node, done) => { calls.push('enter'); done(); }} onLeave={(node, done) => { calls.push('leave'); done(); }}>{active.get() ? <b>one</b> : <i>two</i>}</Transition>;`
    const server = compileNodePlan(source, 'server'),
      client = compileNodePlan(source, 'hydrate')
    const host = document.createElement('div')
    host.innerHTML = await server.renderToString(server.View)
    const first = host.querySelector('b')
    const handle = client.hydrateRoot(host, client.View)
    expect(host.querySelector('b')).toBe(first)
    expect(client.calls).toEqual([])
    client.active.set(false)
    await flush()
    expect(client.calls).toEqual(['enter', 'leave'])
    expect(host.querySelector('i')?.textContent).toBe('two')
    expect(host.querySelector('b')).toBeNull()
    handle.unmount()
  })
  it('waits for async component claim under Suspense and binds the existing server nodes', async () => {
    const source = `import { Suspense } from '@rue-js/rue'; export const calls = []; const Child = async () => <button onClick={() => calls.push('click')}>ready</button>; export const View = () => <Suspense onPending={() => calls.push('pending')} onResolve={() => calls.push('resolve')}><Child/></Suspense>;`
    const server = compileNodePlan(source, 'server'),
      client = compileNodePlan(source, 'hydrate')
    const host = document.createElement('div')
    host.innerHTML = await server.renderToString(server.View)
    const button = host.querySelector('button')!
    const handle = client.hydrateRoot(host, client.View)
    await handle.ready
    expect(host.querySelector('button')).toBe(button)
    expect(client.calls).toEqual(['pending', 'resolve'])
    button.click()
    expect(client.calls).toEqual(['pending', 'resolve', 'click'])
    handle.unmount()
  })
})

describe('claim edge cases', () => {
  it('preserves typed input state on claim and updates it on a subsequent binding change', async () => {
    const source = `import { signal } from '@rue-js/rue'; export const value = signal('server'); export const View = () => <><input value={value.get()}/><textarea>{value.get()}</textarea><svg><use xlink:href="#shape"/></svg></>;`
    const server = compileNodePlan(source, 'server'),
      client = compileNodePlan(source, 'hydrate')
    const host = document.createElement('div')
    host.innerHTML = await server.renderToString(server.View)
    const input = host.querySelector('input')!
    input.value = 'typed'
    const handle = client.hydrateRoot(host, client.View)
    expect(input.value).toBe('typed')
    expect(host.querySelector('textarea')?.value).toBe('server')
    client.value.set('next')
    await flush()
    expect(input.value).toBe('next')
    expect(host.querySelector('textarea')?.value).toBe('next')
    expect(host.querySelector('use')?.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe(
      '#shape',
    )
    handle.unmount()
  })
  it('diagnoses a server/client keyed order mismatch before rebinding a row', async () => {
    const source = `import { signal } from '@rue-js/rue'; export const rows = signal([1,2]); export const View = () => <ul>{rows.get().map(row => <li key={row}>{row}</li>)}</ul>;`
    const server = compileNodePlan(source, 'server'),
      client = compileNodePlan(source, 'hydrate')
    const host = document.createElement('div')
    host.innerHTML = await server.renderToString(server.View)
    const row = host.querySelector('li')
    client.rows.set([2, 1])
    expect(() => client.hydrateRoot(host, client.View)).toThrow(/row:number:2/)
    expect(host.querySelector('li')).toBe(row)
    expect(row?.textContent).toBe('1')
  })
  it('does not bind a late async component after unmount', async () => {
    const source = `export let release; export const calls=[]; const Child = async () => { await new Promise(resolve => { release=resolve }); return <button onClick={() => calls.push('click')}>ready</button>; }; export const View = () => <Child/>;`
    const server = compileNodePlan(source, 'server'),
      client = compileNodePlan(source, 'hydrate')
    const rendered = server.renderToString(server.View)
    await waitForContent(() => expect(server.release).toBeTypeOf('function'))
    server.release()
    const host = document.createElement('div')
    host.innerHTML = await rendered
    const button = host.querySelector('button')!
    const handle = client.hydrateRoot(host, client.View)
    handle.unmount()
    client.release()
    await handle.ready
    button.click()
    expect(client.calls).toEqual([])
    expect(host.childNodes).toHaveLength(0)
  })
  it('claims TransitionGroup keyed rows and preserves their identities on reorder', async () => {
    const source = `import { TransitionGroup, signal } from '@rue-js/rue'; export const rows=signal([1,2]); export const View=()=> <TransitionGroup tag="ul">{rows.get().map(row=><li key={row}>{row}</li>)}</TransitionGroup>;`
    const server = compileNodePlan(source, 'server'),
      client = compileNodePlan(source, 'hydrate')
    const host = document.createElement('div')
    host.innerHTML = await server.renderToString(server.View)
    const rows = Array.from(host.querySelectorAll('li'))
    const handle = client.hydrateRoot(host, client.View)
    client.rows.set([2, 1, 3])
    await flush()
    expect(host.querySelectorAll('li')[0]).toBe(rows[1])
    expect(host.querySelectorAll('li')[1]).toBe(rows[0])
    handle.unmount()
  })
})

it('keeps nested Context values scoped per compiled component owner', async () => {
  const source = `import { createContext, useContext, signal } from '@rue-js/rue'; const Theme=createContext('default'); export const value=signal('dark'); const Child=()=> <span>{useContext(Theme)}</span>; export const View=()=> <><Theme.Provider value={value.get()}><Child/></Theme.Provider><Child/></>;`
  const server = compileNodePlan(source, 'server'),
    client = compileNodePlan(source, 'hydrate')
  const host = document.createElement('div')
  host.innerHTML = await server.renderToString(server.View)
  expect(Array.from(host.querySelectorAll('span'), n => n.textContent)).toEqual(['dark', 'default'])
  const handle = client.hydrateRoot(host, client.View)
  client.value.set('light')
  await flush()
  expect(Array.from(host.querySelectorAll('span'), n => n.textContent)).toEqual([
    'light',
    'default',
  ])
  handle.unmount()
})

it('compiles a conditional component return as a reactive range plan', async () => {
  const source = `import {signal} from '@rue-js/rue'; export const active=signal(true); export const View=()=>active.get()?<b>yes</b>:null;`
  const server = compileNodePlan(source, 'server'),
    client = compileNodePlan(source, 'hydrate')
  const host = document.createElement('div')
  host.innerHTML = await server.renderToString(server.View)
  const handle = client.hydrateRoot(host, client.View)
  client.active.set(false)
  await flush()
  expect(host.querySelector('b')).toBeNull()
  handle.unmount()
})

const waitForContent = async (assertion: () => void) => {
  let error: unknown
  for (let i = 0; i < 50; i++) {
    try {
      assertion()
      return
    } catch (e) {
      error = e
      await flush()
    }
  }
  throw error
}

describe('Island protocol and scheduling', () => {
  it('serializes props into script-safe JSON and restores typed values', () => {
    const serialized = serializeIslandProps({
      title: '</script><img src=x onerror=alert(1)>',
      createdAt: new Date('2026-06-22T00:00:00.000Z'),
      url: new URL('https://example.com/rue?x=1'),
      bigint: 9007199254740993n,
      limits: [Infinity, -Infinity],
      matcher: /rue-(island|server)/giu,
      map: new Map<unknown, unknown>([
        ['strategies', new Set(['load', 'visible'])],
        [7, { nested: true }],
      ]),
      bytes: new Uint8Array([0, 127, 255]),
      words: new Uint16Array([0, 1024, 65535]),
      dwords: new Uint32Array([0, 65536, 4294967295]),
    })

    expect(serialized).not.toContain('</script>')
    expect(serialized).toContain('\\u003C/script')

    const props = deserializeIslandProps(serialized)
    expect(props.title).toBe('</script><img src=x onerror=alert(1)>')
    expect(props.createdAt).toBeInstanceOf(Date)
    expect((props.createdAt as Date).toISOString()).toBe('2026-06-22T00:00:00.000Z')
    expect(props.url).toBeInstanceOf(URL)
    expect(String(props.url)).toBe('https://example.com/rue?x=1')
    expect(props.bigint).toBe(9007199254740993n)
    expect(props.limits).toEqual([Infinity, -Infinity])
    expect(props.matcher).toBeInstanceOf(RegExp)
    expect((props.matcher as RegExp).source).toBe('rue-(island|server)')
    expect((props.matcher as RegExp).flags).toBe('giu')
    expect(props.map).toBeInstanceOf(Map)
    expect((props.map as Map<unknown, unknown>).get('strategies')).toEqual(
      new Set(['load', 'visible']),
    )
    expect((props.map as Map<unknown, unknown>).get(7)).toEqual({ nested: true })
    expect(props.bytes).toEqual(new Uint8Array([0, 127, 255]))
    expect(props.words).toEqual(new Uint16Array([0, 1024, 65535]))
    expect(props.dwords).toEqual(new Uint32Array([0, 65536, 4294967295]))
  })

  it('rejects unsupported or unsafe prop values instead of silently serializing them', () => {
    class CustomValue {
      label = 'custom'
    }
    const circular: any = { label: 'loop' }
    circular.self = circular

    expect(() => serializeIslandProps({ value: undefined })).toThrow(/undefined/)
    expect(() => serializeIslandProps({ value: () => {} })).toThrow(/function/)
    expect(() => serializeIslandProps({ value: Symbol('x') })).toThrow(/symbol/)
    expect(() => serializeIslandProps({ value: Number.NaN })).toThrow(/non-finite/)
    expect(() => serializeIslandProps(circular)).toThrow(/circular/)
    expect(() => serializeIslandProps({ value: new CustomValue() })).toThrow(/CustomValue/)
    expect(() => serializeIslandProps({ __rueType: 'Map', value: [] })).toThrow(/reserved/)
    expect(() => deserializeIslandProps('{"__rueType":"Map","value":{"not":"entries"}}')).toThrow(
      /invalid Map/i,
    )
    expect(() =>
      deserializeIslandProps('{"__rueType":"ArbitraryClass","value":"payload"}'),
    ).toThrow(/unknown serialized type/i)
  })

  it('emits island HTML with protocol attributes and a props script', () => {
    const html = createIslandContainerHtml({
      id: 'r1',
      component: '/src/Counter.tsx',
      entry: '/assets/Counter.js',
      hydrate: 'visible',
      rootMargin: '200px',
      timeout: 500,
      props: { count: 1 },
      html: '<button>1</button>',
    })

    expect(html).toContain('<rue-island')
    expect(html).toContain('data-rue-id="r1"')
    expect(html).toContain('data-rue-component="/src/Counter.tsx"')
    expect(html).toContain('data-rue-hydrate="visible"')
    expect(html).toContain('data-rue-root-margin="200px"')
    expect(html).toContain('data-rue-timeout="500"')
    expect(html).toContain('<button>1</button>')
    expect(html).toContain('type="application/json"')
    expect(html).toContain('"count":1')
  })

  it('renders client:only fallback and omits props for client:none HTML', () => {
    const only = createIslandContainerHtml({
      id: 'map',
      component: '/src/Map.tsx',
      entry: '/src/Map.tsx',
      hydrate: 'only',
      props: { zoom: 12 },
      fallback: '<div>loading map</div>',
      html: '<div>server map should not render</div>',
    })
    const none = createIslandContainerHtml({
      id: 'copy',
      component: '/src/Copy.tsx',
      entry: '/src/Copy.tsx',
      hydrate: 'none',
      props: { ignored: true },
      html: '<p>static copy</p>',
    })

    expect(only).toContain('<div>loading map</div>')
    expect(only).not.toContain('server map should not render')
    expect(only).toContain('data-rue-hydrate="only"')
    expect(only).toContain('data-rue-props="map"')
    expect(none).toContain('<p>static copy</p>')
    expect(none).toContain('data-rue-hydrate="none"')
    expect(none).not.toContain('data-rue-entry=')
    expect(none).not.toContain('data-rue-props=')
  })

  it('skips client:none islands', async () => {
    document.body.innerHTML = createIslandContainerHtml({
      id: 'static',
      component: '/src/Static.tsx',
      hydrate: 'none',
      html: '<p>static html</p>',
    })

    const resolveModule = vi.fn()
    startRueIslandLoader({ resolveModule })
    await flush()

    expect(resolveModule).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('static html')
    expect(document.querySelector('rue-island')?.getAttribute('data-rue-status')).toBe('static')
  })

  it('waits for idle before loading idle islands', async () => {
    document.body.innerHTML = createIslandContainerHtml({
      id: 'idle',
      component: '/src/Idle.tsx',
      entry: '/src/Idle.tsx',
      hydrate: 'idle',
      timeout: 500,
      html: '<p>idle server</p>',
    })

    const originalRequestIdle = window.requestIdleCallback
    const originalCancelIdle = window.cancelIdleCallback
    let idleCallback: (() => void) | null = null
    ;(window as any).requestIdleCallback = vi.fn(
      (cb: () => void, _options?: IdleRequestOptions) => {
        idleCallback = cb
        return 7
      },
    )
    ;(window as any).cancelIdleCallback = vi.fn()

    try {
      const resolveModule = vi.fn(async () => ({
        mount: (island: Element) => {
          island.textContent = 'idle hydrated'
        },
      }))

      registerRueIsland(document.querySelector('rue-island')!, { resolveModule })
      await flush()
      expect(resolveModule).not.toHaveBeenCalled()

      expect(idleCallback).not.toBeNull()
      ;(idleCallback as unknown as () => void)()
      await waitForContent(() => {
        expect(document.body.textContent).toContain('idle hydrated')
      })
      expect(resolveModule).toHaveBeenCalledTimes(1)
      expect(window.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
        timeout: 500,
      })
    } finally {
      window.requestIdleCallback = originalRequestIdle
      window.cancelIdleCallback = originalCancelIdle
    }
  })

  it('waits for media query matches before hydrating media islands', async () => {
    document.body.innerHTML = createIslandContainerHtml({
      id: 'media',
      component: '/src/Media.tsx',
      entry: '/src/Media.tsx',
      hydrate: 'media',
      media: '(min-width: 900px)',
      html: '<p>media server</p>',
    })

    const originalMatchMedia = window.matchMedia
    let matches = false
    let changeListener: (() => void) | null = null
    ;(window as any).matchMedia = vi.fn(() => ({
      get matches() {
        return matches
      },
      addEventListener: (_event: string, listener: () => void) => {
        changeListener = listener
      },
      removeEventListener: vi.fn(),
    }))

    try {
      const resolveModule = vi.fn(async () => ({
        mount: (island: Element) => {
          island.textContent = 'media hydrated'
        },
      }))

      registerRueIsland(document.querySelector('rue-island')!, { resolveModule })
      await flush()
      expect(resolveModule).not.toHaveBeenCalled()

      matches = true
      expect(changeListener).not.toBeNull()
      ;(changeListener as unknown as () => void)()
      await waitForContent(() => {
        expect(document.body.textContent).toContain('media hydrated')
      })
      expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 900px)')
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })

  it('waits for visible islands to intersect before hydrating', async () => {
    document.body.innerHTML = createIslandContainerHtml({
      id: 'visible',
      component: '/src/Visible.tsx',
      entry: '/src/Visible.tsx',
      hydrate: 'visible',
      rootMargin: '200px 10%',
      html: '<p>visible server</p>',
    })

    const originalObserver = window.IntersectionObserver
    let observerCallback: ((entries: Array<{ isIntersecting: boolean }>) => void) | null = null
    ;(window as any).IntersectionObserver = class {
      observe = vi.fn()
      disconnect = vi.fn()

      constructor(
        callback: (entries: Array<{ isIntersecting: boolean }>) => void,
        options?: IntersectionObserverInit,
      ) {
        observerCallback = callback
        expect(options).toEqual({ rootMargin: '200px 10%' })
      }
    }

    try {
      const resolveModule = vi.fn(async () => ({
        mount: (island: Element) => {
          island.textContent = 'visible hydrated'
        },
      }))

      registerRueIsland(document.querySelector('rue-island')!, { resolveModule })
      await flush()
      expect(resolveModule).not.toHaveBeenCalled()

      expect(observerCallback).not.toBeNull()
      const fireObserver = observerCallback as unknown as (
        entries: Array<{ isIntersecting: boolean }>,
      ) => void
      fireObserver([{ isIntersecting: false }])
      await flush()
      expect(resolveModule).not.toHaveBeenCalled()

      fireObserver([{ isIntersecting: true }])
      await waitForContent(() => {
        expect(document.body.textContent).toContain('visible hydrated')
      })
      expect(resolveModule).toHaveBeenCalledTimes(1)
    } finally {
      window.IntersectionObserver = originalObserver
    }
  })

  it('waits for interaction islands and passes the triggering event to hydrate()', async () => {
    document.body.innerHTML = createIslandContainerHtml({
      id: 'interactive',
      component: '/src/Button.tsx',
      entry: '/src/Button.tsx',
      hydrate: 'interaction',
      interaction: 'click',
      props: { label: 'Run' },
      html: '<button>server</button>',
    })

    const hydrate = vi.fn((island: Element, props: any, context: any) => {
      island.textContent = `${props.label}:${context.replayEvent.type}`
    })
    const island = document.querySelector('rue-island')!

    registerRueIsland(island, {
      resolveModule: async () => ({ hydrate }),
    })
    await flush()
    expect(hydrate).not.toHaveBeenCalled()

    island.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await waitForContent(() => {
      expect(document.body.textContent).toContain('Run:click')
    })
  })

  it('emits a sanitized lifecycle error before invoking onError', async () => {
    document.body.innerHTML = createIslandContainerHtml({
      id: 'broken',
      component: '/src/Broken.tsx',
      entry: '/src/Broken.tsx',
      hydrate: 'load',
    })
    const island = document.querySelector('rue-island')!
    const events: Array<{ type: string; detail: any }> = []
    for (const type of ['rue:before-hydrate', 'rue:error']) {
      island.addEventListener(type, event => {
        events.push({ type, detail: (event as CustomEvent).detail })
      })
    }
    const onError = vi.fn()

    registerRueIsland(island, {
      resolveModule: async () => {
        throw new Error('module failed')
      },
      onError,
    })

    await waitForContent(() => {
      expect(island.getAttribute('data-rue-status')).toBe('error')
    })
    expect(events).toEqual([
      { type: 'rue:before-hydrate', detail: { id: 'broken', strategy: 'load' } },
      { type: 'rue:error', detail: { id: 'broken', strategy: 'load' } },
    ])
    expect(onError).toHaveBeenCalledWith(expect.any(Error), island, undefined)
  })

  it('observes dynamically inserted islands and invalidates removed or stopped work', async () => {
    let resolveModulePromise!: (module: any) => void
    const pendingModule = new Promise<any>(resolve => {
      resolveModulePromise = resolve
    })
    const mount = vi.fn()
    const resolveModule = vi.fn(() => pendingModule)
    const stop = startRueIslandLoader({ resolveModule })

    document.body.insertAdjacentHTML(
      'beforeend',
      createIslandContainerHtml({
        id: 'dynamic',
        component: '/src/Dynamic.tsx',
        entry: '/src/Dynamic.tsx',
        hydrate: 'load',
        html: '<p>dynamic server</p>',
      }),
    )
    await waitForContent(() => {
      expect(resolveModule).toHaveBeenCalledTimes(1)
    })

    document.querySelector('rue-island[data-rue-id="dynamic"]')?.remove()
    await flush()
    resolveModulePromise({ mount })
    await flush()
    expect(mount).not.toHaveBeenCalled()

    stop()
    document.body.insertAdjacentHTML(
      'beforeend',
      createIslandContainerHtml({
        id: 'after-stop',
        component: '/src/AfterStop.tsx',
        entry: '/src/AfterStop.tsx',
        hydrate: 'load',
      }),
    )
    await flush()
    expect(resolveModule).toHaveBeenCalledTimes(1)
  })

  it('hydrates nested islands parent-first and emits stable lifecycle events', async () => {
    let resolveParent!: (module: any) => void
    const parentModule = new Promise<any>(resolve => {
      resolveParent = resolve
    })
    const order: string[] = []
    const details: any[] = []
    document.body.innerHTML = `
      <rue-island data-rue-id="parent" data-rue-entry="parent" data-rue-hydrate="load">
        <section>
          parent server
          <rue-island data-rue-id="child" data-rue-entry="child" data-rue-hydrate="load">
            child server
          </rue-island>
        </section>
      </rue-island>
    `
    for (const type of ['rue:before-hydrate', 'rue:hydrate', 'rue:error']) {
      document.addEventListener(type, event => {
        const customEvent = event as CustomEvent
        const target = event.target as Element
        order.push(`${type}:${target.getAttribute('data-rue-id')}`)
        details.push(customEvent.detail)
      })
    }

    const resolveModule = vi.fn((specifier: string) => {
      order.push(`load:${specifier}`)
      if (specifier === 'parent') return parentModule
      return Promise.resolve({
        mount: () => {
          order.push('mount:child')
        },
      })
    })
    const stop = startRueIslandLoader({ resolveModule })

    await flush()
    expect(resolveModule).toHaveBeenCalledTimes(1)
    expect(order).toEqual(['rue:before-hydrate:parent', 'load:parent'])

    resolveParent({
      mount: () => {
        order.push('mount:parent')
      },
    })
    await waitForContent(() => {
      expect(resolveModule).toHaveBeenCalledTimes(2)
      expect(order).toContain('rue:hydrate:child')
    })

    expect(order).toEqual([
      'rue:before-hydrate:parent',
      'load:parent',
      'mount:parent',
      'rue:hydrate:parent',
      'rue:before-hydrate:child',
      'load:child',
      'mount:child',
      'rue:hydrate:child',
    ])
    expect(details).toEqual([
      { id: 'parent', strategy: 'load' },
      { id: 'parent', strategy: 'load' },
      { id: 'child', strategy: 'load' },
      { id: 'child', strategy: 'load' },
    ])
    expect(details.every(detail => !('props' in detail))).toBe(true)
    stop()
  })
})

it('keeps destructured component props reactive', async () => {
  const source = `import { signal } from '@rue-js/rue'; export const label=signal('one'); const Child=({label: text='fallback'})=><span>{text}</span>; export const View=()=> <Child label={label.get()}/>;`
  const server = compileNodePlan(source, 'server'),
    client = compileNodePlan(source, 'hydrate')
  const host = document.createElement('div')
  host.innerHTML = await server.renderToString(server.View)
  const handle = client.hydrateRoot(host, client.View)
  client.label.set('two')
  await flush()
  expect(host.querySelector('span')?.textContent).toBe('two')
  handle.unmount()
})

it('hydrates and updates real published ESM package output', async () => {
  const server = compileNodePlan(fixture, 'server', true),
    client = compileNodePlan(fixture, 'hydrate', true)
  const host = document.createElement('div')
  host.innerHTML = await server.renderToString(server.View)
  const button = host.querySelector('button')!
  const handle = client.hydrateRoot(host, client.View)
  client.title.set('published')
  await flush()
  expect(host.querySelector('button')).toBe(button)
  expect(button.textContent).toBe('published')
  expect(
    client.modules.some((id: string) => id.includes('/dist/compiler-runtime/hydrate-claim.js')),
  ).toBe(true)
  expect(client.modules.join('\n')).not.toMatch(
    /js-runtime|compiled-render-anchor|\/island\.js|\/dom\.js/,
  )
  handle.unmount()
})

it('rolls back new list rows when a later row fails during an update', async () => {
  const source = `import { signal, onCleanup, setReactiveScheduling } from '@rue-js/rue'; setReactiveScheduling('sync'); export const disposed=[]; export const rows=signal([{id:1,value:'one'}]); const Item=props=>{onCleanup(()=>disposed.push(props.id));return <li>{props.value}</li>}; export const View=()=> <ul>{rows.get().map(row=><Item key={row.id} id={row.id} value={row.value}/>)}</ul>;`
  const server = compileNodePlan(source, 'server'),
    client = compileNodePlan(source, 'hydrate')
  const host = document.createElement('div')
  host.innerHTML = await server.renderToString(server.View)
  const first = host.querySelector('li')
  const handle = client.hydrateRoot(host, client.View)
  expect(() =>
    client.rows.set([
      { id: 1, value: 'one' },
      { id: 2, value: 'two' },
      { id: 3, value: { bad: true } },
    ]),
  ).toThrow(/scalar/)
  expect(host.querySelectorAll('li')).toHaveLength(1)
  expect(host.querySelector('li')).toBe(first)
  expect(client.disposed.sort()).toEqual([2, 3])
  handle.unmount()
})

it('distinguishes element and range markers when separate modules reuse node IDs', async () => {
  const source = `import {View as Child} from './child.mjs'; export const View=()=> <Child/>;`
  const dependencies = { 'child.mjs': 'export const View=()=> <div>child</div>;' }
  const server = compileNodePlan(source, 'server', false, dependencies),
    client = compileNodePlan(source, 'hydrate', false, dependencies)
  const host = document.createElement('div')
  host.innerHTML = await server.renderToString(server.View)
  expect(host.innerHTML).toContain('<!--r:b:0--><!--r:e:0-->')
  const node = host.querySelector('div')
  const handle = client.hydrateRoot(host, client.View)
  expect(host.querySelector('div')).toBe(node)
  handle.unmount()
})

it('lowers useState and useEffect to owned slots in both compiler targets', async () => {
  const source = `import {useState,useEffect} from '@rue-js/rue';export const calls=[];export const View=()=>{const [count,setCount]=useState(0);useEffect(()=>{calls.push(count);return ()=>calls.push('cleanup')},[count]);return <button onClick={()=>setCount(count+1)}>{count}</button>};`
  const server = compileNodePlan(source, 'server'),
    client = compileNodePlan(source, 'hydrate')
  const host = document.createElement('div')
  host.innerHTML = await server.renderToString(server.View)
  expect(server.calls).toEqual([])
  const handle = client.hydrateRoot(host, client.View)
  const button = host.querySelector('button')!
  button.click()
  await flush()
  expect(button.textContent).toBe('1')
  expect(client.calls).toContain(1)
  handle.unmount()
  expect(client.calls.at(-1)).toBe('cleanup')
})
