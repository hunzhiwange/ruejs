// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'

import {
  createCompiledComponent as createDefaultComponent,
  renderAnchor,
  signal,
  type FC,
} from '@rue-js/runtime'
import {
  _$createComponent as createVaporComponent,
  renderAnchor as renderVaporAnchor,
  _$compiledRoot as createVaporHandle,
} from './legacy-test-render'
import {
  RUE_ISLAND_DESCRIPTOR,
  createIslandContainerHtml,
  createRueIslandDescriptor,
  deserializeIslandProps,
  hydrateRoot,
  mountRueIsland,
  registerRueIsland,
  serializeIslandProps,
  startRueIslandLoader,
} from '@rue-js/runtime/island'

import { flush, waitForContent } from './page-test-utils'

import { createTestRenderable, _$compiledRoot } from './legacy-test-render'

describe('Rue island runtime', () => {
  it('creates a shared island descriptor without executing its component', () => {
    const componentCalls: string[] = []
    const Component: FC<{ label: string }> = props => {
      componentCalls.push(props.label)
      return createTestRenderable('p', null, props.label)
    }
    const props = { label: 'shared descriptor' }
    const fallback = createTestRenderable('p', null, 'loading')

    const descriptor = createRueIslandDescriptor({
      component: Component,
      props,
      fallback,
      metadata: {
        id: 'shared-counter',
        component: '/src/SharedCounter.tsx',
        exportName: 'default',
        hydrate: 'visible',
      },
    })

    expect(descriptor[RUE_ISLAND_DESCRIPTOR]).toBe(true)
    expect(descriptor.component).toBe(Component)
    expect(descriptor.props).toBe(props)
    expect(descriptor.fallback).toBe(fallback)
    expect(descriptor.metadata).toEqual({
      id: 'shared-counter',
      component: '/src/SharedCounter.tsx',
      exportName: 'default',
      hydrate: 'visible',
    })
    expect(componentCalls).toEqual([])
  })

  it('mounts island descriptors produced inside default and Vapor subtrees', () => {
    const Component: FC<{ label: string }> = props =>
      createTestRenderable('button', null, props.label)
    const createDescriptor = (id: string) =>
      createRueIslandDescriptor({
        component: Component,
        props: { label: id },
        metadata: { id, component: `/src/${id}.tsx`, hydrate: 'load' },
      })

    const mountDescriptor = (
      id: string,
      createHandle: typeof _$compiledRoot,
      renderHandle: typeof renderAnchor,
    ) => {
      const host = document.createElement('section')
      const hostAnchor = document.createComment('host')
      host.appendChild(hostAnchor)
      const handle = createHandle(() => {
        const root = document.createDocumentFragment()
        const anchor = document.createComment('descriptor')
        root.appendChild(anchor)
        renderHandle(createDescriptor(id) as any, root as any, anchor as any)
        return root as any
      })
      renderHandle(handle as any, host as any, hostAnchor as any)
      return {
        host,
        dispose: () => renderHandle(null as any, host as any, hostAnchor as any),
      }
    }

    for (const mounted of [
      mountDescriptor('default-descriptor', _$compiledRoot, renderAnchor),
      mountDescriptor('vapor-descriptor', createVaporHandle, renderVaporAnchor),
    ]) {
      const { host } = mounted
      const island = host.querySelector('rue-island')
      expect(island?.getAttribute('data-rue-hydrate')).toBe('load')
      expect(island?.querySelector('button')?.textContent).toBe(island?.getAttribute('data-rue-id'))
      expect(island?.querySelector('script[data-rue-props]')).not.toBeNull()
      mounted.dispose()
      expect(host.querySelector('rue-island')).toBeNull()
    }
  })

  it('accepts island descriptors as component children without accepting arbitrary objects', () => {
    const IslandContent: FC<{ label: string }> = props => <button>{props.label}</button>
    const Frame: FC = props => <section data-frame>{props.children}</section>
    const createDescriptor = (id: string) =>
      createRueIslandDescriptor({
        component: IslandContent,
        props: { label: id },
        metadata: { id, component: `/src/${id}.tsx`, hydrate: 'load' },
      })

    const cases = [
      {
        id: 'default-child-descriptor',
        createComponent: createDefaultComponent,
        render: renderAnchor,
      },
      {
        id: 'vapor-child-descriptor',
        createComponent: createVaporComponent,
        render: renderVaporAnchor,
      },
    ]

    for (const testCase of cases) {
      const host = document.createElement('div')
      const anchor = document.createComment(testCase.id)
      host.appendChild(anchor)
      const handle = testCase.createComponent(Frame, {
        children: createDescriptor(testCase.id) as any,
      })
      testCase.render(handle as any, host as any, anchor as any)

      const island = host.querySelector('rue-island')
      expect(island?.getAttribute('data-rue-id')).toBe(testCase.id)
      expect(island?.querySelector('button')?.textContent).toBe(testCase.id)
      expect(() =>
        testCase.createComponent(Frame, { children: { arbitrary: true } as any }),
      ).toThrow(/Unsupported object inputs are no longer accepted/)
      testCase.render(null as any, host as any, anchor as any)
      expect(host.querySelector('rue-island')).toBeNull()
    }
  })

  it('renders component handles used as client:only fallbacks', () => {
    const ClientContent: FC = () => <button>client</button>
    const Fallback: FC<{ label: string }> = props => <p>{props.label}</p>
    const Frame: FC = props => <section>{props.children}</section>
    const cases = [
      {
        id: 'default-only-fallback',
        createComponent: createDefaultComponent,
        render: renderAnchor,
      },
      {
        id: 'vapor-only-fallback',
        createComponent: createVaporComponent,
        render: renderVaporAnchor,
      },
    ]

    for (const testCase of cases) {
      const host = document.createElement('div')
      const anchor = document.createComment(testCase.id)
      host.appendChild(anchor)
      const descriptor = createRueIslandDescriptor({
        component: ClientContent,
        props: {},
        fallback: testCase.createComponent(Fallback, { label: testCase.id }),
        metadata: {
          id: testCase.id,
          component: `/src/${testCase.id}.tsx`,
          hydrate: 'only',
        },
      })
      const handle = testCase.createComponent(Frame, { children: descriptor as any })

      testCase.render(handle as any, host as any, anchor as any)

      expect(host.querySelector('rue-island p')?.textContent).toBe(testCase.id)
      testCase.render(null as any, host as any, anchor as any)
      expect(host.querySelector('rue-island')).toBeNull()
    }
  })

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

  it('hydrates load islands through a supplied module resolver', async () => {
    document.body.innerHTML = createIslandContainerHtml({
      id: 'counter',
      component: '/src/Counter.tsx',
      entry: '/src/Counter.tsx',
      hydrate: 'load',
      props: { count: 2 },
      html: '<button>server</button>',
    })

    const Counter: FC<{ count: number }> = props =>
      createTestRenderable('button', null, `client ${props.count}`)

    startRueIslandLoader({
      resolveModule: async () => ({ default: Counter }),
    })

    await waitForContent(() => {
      expect(document.body.textContent).toContain('client 2')
    })
    expect(document.querySelector('rue-island')?.getAttribute('data-rue-status')).toBe('hydrated')
  })

  it('adopts matching SSR DOM roots without replacing the root element', () => {
    document.body.innerHTML = `
      <div id="root">
        <button id="server-button">server</button>
        <script type="application/json" data-rue-props="counter">{"count":1}</script>
      </div>
    `
    const container = document.querySelector('#root')!
    const serverButton = container.querySelector('button')!
    const onMismatch = vi.fn()
    const onClick = vi.fn()

    const handle = hydrateRoot(
      container,
      createTestRenderable(
        'button',
        {
          className: 'hydrated',
          id: 'client-button',
          onClick,
          type: 'button',
        },
        'client',
      ),
      { replace: false, onMismatch },
    )

    const adoptedButton = container.querySelector('button')!
    expect(adoptedButton).toBe(serverButton)
    expect(adoptedButton.id).toBe('client-button')
    expect(adoptedButton.className).toBe('hydrated')
    expect(adoptedButton.textContent).toBe('client')
    expect(container.querySelector('script[data-rue-props]')).toBeNull()
    expect(onMismatch).not.toHaveBeenCalled()

    adoptedButton.click()
    expect(onClick).toHaveBeenCalledTimes(1)

    handle.unmount()
    adoptedButton.click()
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(container.childNodes).toHaveLength(0)
  })

  it('falls back to replace-mode mounting when SSR and client roots do not match', () => {
    document.body.innerHTML = '<div id="root"><span id="server-root">server</span></div>'
    const container = document.querySelector('#root')!
    const serverRoot = container.firstElementChild
    const onMismatch = vi.fn()

    hydrateRoot(container, createTestRenderable('button', { type: 'button' }, 'client'), {
      replace: false,
      onMismatch,
    })

    const button = container.querySelector('button')
    expect(button).not.toBeNull()
    expect(button).not.toBe(serverRoot)
    expect(button?.textContent).toContain('client')
    expect(container.querySelector('#server-root')).toBeNull()
    expect(onMismatch).toHaveBeenCalledWith(
      'Rue hydrateRoot SSR root structure did not match the client element.',
      container,
    )
  })

  it('can opt into adopting component island roots through hydrateRoot', () => {
    document.body.innerHTML = '<div id="root"><section id="server-root">server</section></div>'
    const container = document.querySelector('#root')!
    const serverRoot = container.firstElementChild!
    const onClick = vi.fn()

    const StaticPanel: FC<{ label: string }> = props =>
      createTestRenderable('section', { className: 'hydrated', onClick }, props.label)

    hydrateRoot(container, createTestRenderable(StaticPanel, { label: 'client' }), {
      adoptComponents: true,
      replace: false,
    })

    const adoptedRoot = container.firstElementChild!
    expect(adoptedRoot).toBe(serverRoot)
    expect(adoptedRoot.className).toBe('hydrated')
    expect(adoptedRoot.textContent).toBe('client')

    adoptedRoot.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not unfold component handles for adoption unless explicitly requested', () => {
    document.body.innerHTML = '<div id="root"><section id="server-root">server</section></div>'
    const container = document.querySelector('#root')!
    const serverRoot = container.firstElementChild
    const onMismatch = vi.fn()

    const StaticPanel: FC<{ label: string }> = props =>
      createTestRenderable('section', null, props.label)

    hydrateRoot(container, createTestRenderable(StaticPanel, { label: 'client' }), {
      replace: false,
      onMismatch,
    })

    const renderedRoot = container.firstElementChild
    expect(renderedRoot).not.toBe(serverRoot)
    expect(renderedRoot?.textContent).toContain('client')
    expect(onMismatch).toHaveBeenCalledWith(
      'Rue hydrateRoot could not find an adoptable element record.',
      container,
    )
  })

  it('asks hydrateRoot to adopt SSR DOM for opted-in default component islands', async () => {
    const island = document.createElement('rue-island')
    island.setAttribute('data-rue-hydrate', 'load')

    const Panel: FC = () => createTestRenderable('section', null, 'panel')
    const hydrateRootImpl = vi.fn()

    await mountRueIsland(
      island,
      { adopt: true, default: Panel },
      {
        island,
        props: {},
        strategy: 'load',
      },
      hydrateRootImpl,
    )

    expect(hydrateRootImpl).toHaveBeenCalledWith(
      island,
      expect.anything(),
      expect.objectContaining({ adoptComponents: true, replace: false }),
    )
  })

  it('retains matching SSR DOM for opted-in default component islands', async () => {
    document.body.innerHTML = createIslandContainerHtml({
      id: 'static-panel',
      component: '/src/StaticPanel.tsx',
      entry: '/src/StaticPanel.tsx',
      hydrate: 'load',
      props: { label: 'client static panel' },
      html: '<section id="server-panel">server static panel</section>',
    })
    const serverPanel = document.querySelector('#server-panel')!

    const StaticPanel: FC<{ label: string }> = props =>
      createTestRenderable('section', { className: 'hydrated' }, props.label)
    const onMismatch = vi.fn()

    startRueIslandLoader({
      resolveModule: async () => ({ adopt: true, default: StaticPanel }),
      hydrateRoot: (container, value, options) =>
        hydrateRoot(container, value, { ...options, onMismatch }),
    })

    await waitForContent(() => {
      expect(document.querySelector('rue-island')?.getAttribute('data-rue-status')).toBe('hydrated')
    })

    const hydratedPanel = document.querySelector('rue-island section')!
    expect(hydratedPanel).toBe(serverPanel)
    expect(hydratedPanel.className).toBe('hydrated')
    expect(document.querySelector('script[data-rue-props]')).toBeNull()
    expect(onMismatch).not.toHaveBeenCalled()
  })

  it('morphs nested SSR children for opted-in component islands without replacing them', async () => {
    document.body.innerHTML = createIslandContainerHtml({
      id: 'nested-list',
      component: '/src/NestedList.tsx',
      entry: '/src/NestedList.tsx',
      hydrate: 'load',
      props: {},
      html: [
        '<ul id="server-list" data-stale="remove-me">',
        '<li id="server-a" class="server">server A</li>',
        '<li id="server-b" class="server">server B</li>',
        '</ul>',
      ].join(''),
    })
    const serverList = document.querySelector('#server-list')!
    const serverA = document.querySelector('#server-a')!
    const serverB = document.querySelector('#server-b')!

    const NestedList: FC = () =>
      createTestRenderable(
        'ul',
        { id: 'client-list', 'data-fresh': 'yes' },
        createTestRenderable('li', { id: 'client-a', className: 'hydrated' }, 'client A'),
        createTestRenderable('li', { id: 'client-b', className: 'hydrated' }, 'client B'),
      )

    startRueIslandLoader({
      resolveModule: async () => ({ adopt: true, default: NestedList }),
    })

    await waitForContent(() => {
      expect(document.querySelector('rue-island')?.getAttribute('data-rue-status')).toBe('hydrated')
    })

    const hydratedList = document.querySelector('rue-island ul')!
    expect(hydratedList).toBe(serverList)
    expect(hydratedList.id).toBe('client-list')
    expect(hydratedList.getAttribute('data-stale')).toBeNull()
    expect(hydratedList.getAttribute('data-fresh')).toBe('yes')
    expect(document.querySelector('#client-a')).toBe(serverA)
    expect(document.querySelector('#client-b')).toBe(serverB)
    expect([...hydratedList.querySelectorAll('li')].map(li => li.textContent)).toEqual([
      'client A',
      'client B',
    ])
  })

  it('applies form state, removed attributes, and refs to renderer-adopted roots', () => {
    document.body.innerHTML =
      '<div id="root"><input id="server-input" class="server" value="server" disabled data-stale="yes"></div>'
    const container = document.querySelector('#root')!
    const serverInput = document.querySelector('#server-input') as HTMLInputElement
    const ref = { current: null as HTMLInputElement | null }

    const Field: FC = () =>
      createTestRenderable('input', {
        ref,
        id: 'client-input',
        className: 'hydrated',
        value: 'client',
        disabled: false,
        'data-fresh': 'yes',
      })

    hydrateRoot(container, createTestRenderable(Field, null), {
      adoptComponents: true,
      replace: false,
    })

    const hydratedInput = document.querySelector('#client-input') as HTMLInputElement
    expect(hydratedInput).toBe(serverInput)
    expect(hydratedInput.className).toBe('hydrated')
    expect(hydratedInput.value).toBe('client')
    expect(hydratedInput.disabled).toBe(false)
    expect(hydratedInput.getAttribute('data-stale')).toBeNull()
    expect(hydratedInput.getAttribute('data-fresh')).toBe('yes')
    expect(ref.current).toBe(serverInput)
  })

  it('binds stateful opted-in component islands to the adopted SSR DOM owner', async () => {
    document.body.innerHTML = createIslandContainerHtml({
      id: 'stateful-counter',
      component: '/src/Counter.tsx',
      entry: '/src/Counter.tsx',
      hydrate: 'load',
      props: { initial: 1 },
      html: '<button id="server-count" class="server" type="button"><span>1</span></button>',
    })
    const serverButton = document.querySelector('#server-count')!

    const onIncrement = vi.fn()
    let latestCount = 0
    let updateRuns = 0
    const count = signal(1)
    let updateDom = () => {}
    const CounterValue: FC = () =>
      _$compiledRoot(() => {
        const root = document.createElement('span')
        const anchor = document.createComment('counter-value')
        root.appendChild(anchor)
        updateDom = () => {
          updateRuns += 1
          renderAnchor(String(count.get()), root as any, anchor as any)
        }
        updateDom()
        return root as any
      }) as any

    const Counter: FC<{ initial: number }> = props => {
      count.set(props.initial)

      return (
        <button
          className="hydrated"
          id="client-count"
          onClick={() => {
            onIncrement()
            count.set(count.peek() + 1)
            latestCount = count.peek()
            updateDom()
          }}
          type="button"
        >
          <CounterValue />
        </button>
      )
    }

    const onMismatch = vi.fn()
    startRueIslandLoader({
      resolveModule: async () => ({ adopt: true, default: Counter }),
      hydrateRoot: (container, value, options) =>
        hydrateRoot(container, value, { ...options, onMismatch }),
    })

    await waitForContent(() => {
      expect(document.querySelector('rue-island')?.getAttribute('data-rue-status')).toBe('hydrated')
    })

    const hydratedButton = document.querySelector('rue-island button')!
    expect(hydratedButton).toBe(serverButton)
    expect(hydratedButton.id).toBe('client-count')
    expect(hydratedButton.className).toBe('hydrated')
    expect((hydratedButton as any).__rue_hydrated_adopted).toBe(true)
    expect(hydratedButton.textContent).toBe('1')

    hydratedButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    expect(onIncrement).toHaveBeenCalledTimes(1)
    expect(latestCount).toBe(2)
    expect(updateRuns).toBeGreaterThanOrEqual(2)
    expect(document.querySelector('rue-island button')).toBe(serverButton)
    expect(serverButton.textContent).toBe('2')
  })

  it('removes transferred listeners from renderer-adopted roots on unmount', () => {
    document.body.innerHTML =
      '<div id="root"><button id="server-button" type="button"><span>server</span></button></div>'
    const container = document.querySelector('#root')!
    const serverButton = document.querySelector('#server-button') as HTMLButtonElement
    const onClick = vi.fn()
    const onMismatch = vi.fn()
    const label = signal('ready')
    let updateDom = () => {}

    const ButtonLabel: FC = () =>
      _$compiledRoot(() => {
        const root = document.createElement('span')
        const anchor = document.createComment('button-label')
        root.appendChild(anchor)
        updateDom = () => renderAnchor(label.get(), root as any, anchor as any)
        updateDom()
        return root as any
      }) as any

    const Button: FC = () =>
      createTestRenderable(
        'button',
        { id: 'client-button', onClick, type: 'button' },
        createTestRenderable(ButtonLabel, null),
      )

    const handle = hydrateRoot(container, createTestRenderable(Button, null), {
      adoptComponents: true,
      onMismatch,
      replace: false,
    })
    expect(onMismatch).not.toHaveBeenCalled()

    const hydratedButton = document.querySelector('#client-button') as HTMLButtonElement
    expect(hydratedButton).toBe(serverButton)
    hydratedButton.click()
    expect(onClick).toHaveBeenCalledTimes(1)

    label.set('updated')
    updateDom()
    expect(serverButton.textContent).toBe('updated')

    handle.unmount()
    expect(container.childNodes).toHaveLength(0)

    serverButton.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('cleans up renderer hydration attempts before falling back on component tag mismatch', () => {
    document.body.innerHTML = '<div id="root"><section id="server-root">server</section></div>'
    const container = document.querySelector('#root')!
    const onMismatch = vi.fn()

    const Article: FC = () => createTestRenderable('article', { id: 'client-root' }, 'client')

    hydrateRoot(container, createTestRenderable(Article, null), {
      adoptComponents: true,
      replace: false,
      onMismatch,
    })

    expect(container.querySelector('#server-root')).toBeNull()
    expect(container.querySelector('#client-root')?.tagName).toBe('ARTICLE')
    expect(container.textContent).toBe('client')
    expect(
      [...container.childNodes].some(
        node => node.nodeType === Node.COMMENT_NODE && node.textContent === 'rue-hydration-root',
      ),
    ).toBe(false)
    expect(onMismatch).toHaveBeenCalledWith(
      'Rue hydrateRoot SSR root structure did not match the client element.',
      container,
    )
  })

  it('client:only islands replace fallback with client-rendered content', async () => {
    document.body.innerHTML = createIslandContainerHtml({
      id: 'map',
      component: '/src/Map.tsx',
      entry: '/src/Map.tsx',
      hydrate: 'only',
      props: { label: 'Map ready' },
      fallback: '<span>Loading map</span>',
    })

    const Map: FC<{ label: string }> = props => createTestRenderable('strong', null, props.label)

    expect(document.body.textContent).toContain('Loading map')
    startRueIslandLoader({
      resolveModule: async () => ({ default: Map }),
    })

    await waitForContent(() => {
      expect(document.querySelector('rue-island strong')?.textContent).toBe('Map ready')
    })
    expect(document.body.textContent).not.toContain('Loading map')
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

  it('uses manifest props when no props script is present', async () => {
    document.body.innerHTML =
      '<rue-island data-rue-id="manifest-only" data-rue-component="/src/Manifest.tsx" data-rue-hydrate="load"><span>server</span></rue-island>'

    const ManifestPanel: FC<{ label: string }> = props =>
      createTestRenderable('span', null, props.label)

    startRueIslandLoader({
      manifest: {
        'manifest-only': {
          component: '/src/Manifest.tsx',
          entry: '/src/Manifest.tsx',
          hydrate: 'load',
          props: serializeIslandProps({ label: 'from manifest' }),
        },
      },
      resolveModule: async () => ({ default: ManifestPanel }),
    })

    await waitForContent(() => {
      expect(document.body.textContent).toContain('from manifest')
    })
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
    await flush(6)
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
    await flush(6)
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

    await flush(6)
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
