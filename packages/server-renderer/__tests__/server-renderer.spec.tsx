// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import { createContext, type FC, useComponent, useContext } from '@rue-js/rue'
import {
  _$appendChild,
  _$createComment,
  _$createElement,
  _$createTextNode,
  _$setClassName,
} from '@rue-js/runtime'
import * as runtimeServer from '@rue-js/runtime/server'
import { renderAnchor as renderVaporAnchor, _$compiledRoot } from '@rue-js/runtime/internal'

import {
  _$serverComponent,
  _$serverElement,
  _$serverFragment,
  renderToString,
  runWithServerDOMAdapter,
  ServerCommentNode,
  ServerDOMAdapter,
  ServerElementNode,
  ServerFragmentNode,
  ServerTextNode,
} from '../src'
import { createRueIslandDescriptor, createRueServerIslandDescriptor } from '../src/island'

describe('rue server-renderer', () => {
  it('renders compiler-only server operations with escaping and fragments', async () => {
    const Badge = (props: { label: string }) =>
      _$serverElement('strong', { className: 'badge' }, [props.label])
    const App = () =>
      _$serverFragment([
        _$serverElement('h1', null, ['Rue <server>']),
        _$serverComponent(Badge, { label: 'safe & sound' }, []),
      ])

    await expect(renderToString(App)).resolves.toBe(
      '<h1>Rue &lt;server&gt;</h1><strong class="badge">safe &amp; sound</strong>',
    )
  })

  it('preserves Context semantics through compiled server component operations', async () => {
    const Theme = createContext('light')
    const Consumer = () => _$serverElement('span', null, [useContext(Theme)])
    const App = () =>
      _$serverComponent(Theme.Provider, { value: 'dark' }, [_$serverComponent(Consumer, null, [])])

    await expect(renderToString(App as any)).resolves.toBe('<span>dark</span>')
  })

  it('waits for async components used by compiled server operations', async () => {
    let resolveLoader!: (value: { default: FC<{ label: string }> }) => void
    const AsyncBadge = useComponent(
      () =>
        new Promise<{ default: FC<{ label: string }> }>(resolve => {
          resolveLoader = resolve
        }),
    )
    const App = () => _$serverComponent(AsyncBadge, { label: 'ready' }, [])
    const rendered = renderToString(App as any)

    resolveLoader({
      default: props => _$serverElement('em', null, [props.label]) as any,
    })

    await expect(rendered).resolves.toBe('<em>ready</em>')
  })

  it('re-exports the runtime server renderer APIs', () => {
    expect(renderToString).toBeTypeOf('function')
    expect(runWithServerDOMAdapter).toBe(runtimeServer.runWithServerDOMAdapter)
    expect(ServerDOMAdapter).toBe(runtimeServer.ServerDOMAdapter)
    expect(ServerElementNode).toBe(runtimeServer.ServerElementNode)
    expect(ServerTextNode).toBe(runtimeServer.ServerTextNode)
    expect(ServerCommentNode).toBe(runtimeServer.ServerCommentNode)
    expect(ServerFragmentNode).toBe(runtimeServer.ServerFragmentNode)
  })

  it('renders JSX component trees to escaped HTML strings', async () => {
    const App: FC<{ disabled: boolean; title: string }> = props => (
      <section
        className="hero"
        data-title={props.title}
        style={{ color: 'red', backgroundColor: 'white' }}
      >
        <h1>{props.title}</h1>
        <p>{'Rue <SSR> & friends'}</p>
        <input disabled={props.disabled} value="ready" />
      </section>
    )

    await expect(
      renderToString(App, { props: { disabled: true, title: 'Rue "SSR" & <friends>' } }),
    ).resolves.toBe(
      '<section class="hero" data-title="Rue &quot;SSR&quot; &amp; &lt;friends&gt;" style="color: red; background-color: white"><h1>Rue "SSR" &amp; &lt;friends&gt;</h1><p>Rue &lt;SSR&gt; &amp; friends</p><input disabled value="ready"></section>',
    )
  })

  it('renders a client island descriptor as safe SSR HTML and protocol data', async () => {
    const Panel: FC<{ label: string }> = props => <button>{props.label}</button>
    const dangerousLabel = '</script><img src=x onerror=alert(1)>'
    const App: FC = () =>
      createRueIslandDescriptor({
        component: Panel,
        props: { label: dangerousLabel },
        metadata: {
          id: 'panel-visible',
          component: '/src/private/Panel.tsx',
          exportName: 'default',
          hydrate: 'visible',
        },
      }) as any

    const html = await renderToString(App)

    expect(html).toContain('<rue-island')
    expect(html).toContain('data-rue-id="panel-visible"')
    expect(html).toContain('data-rue-component="panel-visible"')
    expect(html).toContain('data-rue-entry="panel-visible"')
    expect(html).toContain('data-rue-hydrate="visible"')
    expect(html).not.toContain('/src/private/Panel.tsx')
    expect(html).toContain('<button>&lt;/script&gt;&lt;img src=x onerror=alert(1)&gt;</button>')
    expect(html).toContain('type="application/json"')
    expect(html).toContain('data-rue-props="panel-visible"')
    expect(html).toContain('\\u003C/script\\u003E')
    expect(html).not.toContain('</script><img')
  })

  it('renders client:only fallback without executing the server component', async () => {
    let componentCalls = 0
    const BrowserOnly: FC = () => {
      componentCalls += 1
      return <strong>browser implementation</strong>
    }
    const App: FC = () =>
      createRueIslandDescriptor({
        component: BrowserOnly,
        props: { enabled: true },
        fallback: <p>Loading browser widget</p>,
        metadata: {
          id: 'browser-only',
          component: '/src/private/BrowserOnly.tsx',
          exportName: 'default',
          hydrate: 'only',
        },
      }) as any

    const html = await renderToString(App)

    expect(componentCalls).toBe(0)
    expect(html).toContain('data-rue-hydrate="only"')
    expect(html).toContain('<p>Loading browser widget</p>')
    expect(html).not.toContain('browser implementation')
    expect(html).toContain('data-rue-props="browser-only"')
  })

  it('renders a deferred server island as a GET fallback without a component reference', async () => {
    const descriptor = createRueServerIslandDescriptor({
      id: 'account-report',
      props: { accountId: 'a-1' },
      fallback: <p>Loading report</p>,
    })
    const encodeCalls: unknown[] = []

    const html = await renderToString(descriptor as any, {
      serverIslands: {
        endpoint: '/_rue/server-island',
        encode: async payload => {
          encodeCalls.push(payload)
          return { v: 1, id: 'account-report', iv: 'fixed-iv', data: 'fixed-cipher' }
        },
      },
    })

    expect('component' in descriptor).toBe(false)
    expect(encodeCalls).toEqual([{ id: 'account-report', props: { accountId: 'a-1' } }])
    expect(html).toContain('<rue-server-island')
    expect(html).toContain('data-rue-server-island="account-report"')
    expect(html).toContain('data-rue-method="GET"')
    expect(html).toContain('data-rue-url="/_rue/server-island?payload=')
    expect(html).toContain('<p>Loading report</p>')
    expect(html).not.toContain('application/json')
  })

  it('uses a script-safe POST payload when the complete GET URL exceeds its byte budget', async () => {
    const descriptor = createRueServerIslandDescriptor({
      id: 'large-report',
      props: { query: 'x'.repeat(100) },
      fallback: <p>Loading large report</p>,
    })

    const html = await renderToString(descriptor as any, {
      serverIslands: {
        endpoint: '/_rue/server-island',
        maxGetUrlLength: 40,
        encode: async () => ({
          v: 1,
          id: 'large-report',
          iv: 'fixed-iv',
          data: '</script><img src=x onerror=alert(1)>',
        }),
      },
    })

    expect(html).toContain('data-rue-method="POST"')
    expect(html).toContain('data-rue-endpoint="/_rue/server-island"')
    expect(html).toContain('type="application/json"')
    expect(html).toContain('data-rue-server-island-payload')
    expect(html).toContain('\\u003C/script\\u003E')
    expect(html).not.toContain('</script><img')
    expect(html).toContain('<p>Loading large report</p>')
  })

  it('rejects deferred server islands when serverIslands is not configured', async () => {
    const descriptor = createRueServerIslandDescriptor({
      id: 'missing-config',
      fallback: <p>Loading</p>,
    })

    await expect(renderToString(descriptor as any)).rejects.toThrow(
      /serverIslands.*required.*server:defer/i,
    )
  })

  it('renders a server descriptor produced inside a compiled-shape Vapor subtree', async () => {
    const App: FC = () =>
      _$compiledRoot(() => {
        const root = _$createElement('section')
        const anchor = _$createComment('compiled-server-island')
        _$appendChild(root, anchor)
        renderVaporAnchor(
          createRueServerIslandDescriptor({
            id: 'compiled-panel',
            props: { accountId: 'a-1' },
            fallback: <p>Compiled fallback</p>,
          }) as any,
          root as any,
          anchor as any,
        )
        return root as any
      }) as any

    const html = await renderToString(App, {
      serverIslands: {
        endpoint: '/_rue/server-island',
        encode: async payload => ({ v: 1, id: payload.id, iv: 'iv', ciphertext: 'cipher' }),
      },
    })

    expect(html).toContain('<section>')
    expect(html).toContain('data-rue-server-island="compiled-panel"')
    expect(html).toContain('data-rue-method="GET"')
    expect(html).toContain('<p>Compiled fallback</p>')
  })

  it('renders explicit boolean data and aria attributes as stable string booleans', async () => {
    const App: FC = () => (
      <section data-editor-content={true} data-ready={true} data-off={false} aria-hidden={true} />
    )

    await expect(renderToString(App)).resolves.toBe(
      '<section data-editor-content="true" data-ready="true" data-off="false" aria-hidden="true"></section>',
    )
  })

  it('defaults no-value data-editor-content to true', async () => {
    const App: FC = () => <section data-editor-content />

    await expect(renderToString(App)).resolves.toBe(
      '<section data-editor-content="true"></section>',
    )
  })

  it('honors the includeComments render option', async () => {
    const WithComment: FC = () => _$createComment('rue:ssr') as any

    await expect(renderToString(WithComment)).resolves.toBe('')
    await expect(renderToString(WithComment, { includeComments: true })).resolves.toBe(
      '<!--rue:ssr-->',
    )
  })

  it('installs and restores the server DOM adapter for low-level runtime helpers', async () => {
    const button = await runWithServerDOMAdapter(() => {
      const el = _$createElement('button') as ServerElementNode

      _$setClassName(el, 'primary')
      _$appendChild(el, _$createTextNode('Save <draft>'))

      return el
    })

    expect(button).toBeInstanceOf(ServerElementNode)
    expect(button.innerHTML).toBe('Save &lt;draft&gt;')
    expect(button.attributes.get('class')).toBe('primary')

    expect(_$createElement('span')).toBeInstanceOf(HTMLSpanElement)
  })
})
