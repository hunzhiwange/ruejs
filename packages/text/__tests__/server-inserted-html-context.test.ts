/**
 * Tests for ServerInsertedHTMLContext — the compatibility context that CSS-in-JS
 * libraries (Apollo Client, styled-components, emotion) use to register HTML
 * injection callbacks during SSR via useContext().
 *
 * These tests verify the integration pattern used by libraries, not just
 * structural properties of the context object, while rendering through the
 * text/Rue App Server protocol helper.
 */
import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { useTextCompatContext } from '../src/shims/context-adapter.js'
import {
  createElement,
  Fragment,
  renderAppServerElementToHtml,
  type TestServerNode,
} from './app-server-protocol-test-utils.js'

describe('ServerInsertedHTMLContext', () => {
  beforeEach(async () => {
    const { clearServerInsertedHTML } = await import('../src/shims/navigation.js')
    clearServerInsertedHTML()
  })

  it('is exported from text/navigation shim', async () => {
    const mod = await import('../src/shims/navigation.js')
    expect(mod.ServerInsertedHTMLContext).toBeDefined()
  })

  it('can provide and read a registration function', async () => {
    const { ServerInsertedHTMLContext } = await import('../src/shims/navigation.js')
    expect(ServerInsertedHTMLContext).not.toBeNull()

    const register = () => {}
    let received: unknown = undefined

    function ContextReader() {
      received = useTextCompatContext(ServerInsertedHTMLContext!)
      return () => {}
    }

    await renderAppServerElementToHtml(
      createElement(
        ServerInsertedHTMLContext!.Provider,
        { value: register },
        createElement(ContextReader),
      ),
    )

    expect(received).toBe(register)
  })

  it('has null as default value (no Provider)', async () => {
    const { ServerInsertedHTMLContext } = await import('../src/shims/navigation.js')
    // Without a Provider, useContext returns the default value (null).
    // This is correct — Apollo checks for null and throws a clear error
    // if used outside the App Router.
    let contextValue: unknown = 'not-set'
    function ContextReader() {
      contextValue = useTextCompatContext(ServerInsertedHTMLContext!)
      return () => {}
    }
    await renderAppServerElementToHtml(createElement(ContextReader))
    expect(contextValue).toBeNull()
  })

  it('provides a callback registration function when wrapped with Provider', async () => {
    const { ServerInsertedHTMLContext } = await import('../src/shims/navigation.js')

    let contextValue: unknown = 'not-set'

    // Component that reads the context — simulates what Apollo does
    function ContextReader() {
      contextValue = useTextCompatContext(ServerInsertedHTMLContext!)
      return createElement('div', null, 'test')
    }

    // Simulate the SSR pipeline: Provider wraps the tree with a registration function
    const addCallback = (_cb: () => unknown) => {
      /* registration function */
    }
    const tree = createElement(
      ServerInsertedHTMLContext!.Provider,
      { value: addCallback },
      createElement(ContextReader),
    )

    await renderAppServerElementToHtml(tree)
    expect(contextValue).toBe(addCallback)
    expect(typeof contextValue).toBe('function')
  })

  it('Apollo Client pattern: useContext returns a usable registration function', async () => {
    const { ServerInsertedHTMLContext, useServerInsertedHTML, flushServerInsertedHTML } =
      await import('../src/shims/navigation.js')

    // Simulate Apollo's actual usage pattern:
    //   const insertHtml = useContext(ServerInsertedHTMLContext);
    //   if (!insertHtml) throw new Error("...");
    //   insertHtml(() => <style>...</style>);
    let apolloError: Error | null = null

    function ApolloSSRComponent() {
      const insertHtml = useTextCompatContext(ServerInsertedHTMLContext!)
      if (!insertHtml) {
        apolloError = new Error(
          'The SSR build of ApolloTextAppProvider cannot be used outside of the Text App Router!',
        )
        return createElement('div', null, 'error')
      }
      // Register a style injection callback (what Apollo does for SSR)
      insertHtml(() => '<style>.apollo-ssr { color: red; }</style>')
      return createElement('div', null, 'apollo-content')
    }

    // Wrap with Provider (simulates what handleSsr does)
    const tree = createElement(
      ServerInsertedHTMLContext!.Provider,
      { value: useServerInsertedHTML },
      createElement(ApolloSSRComponent),
    )

    const html = await renderAppServerElementToHtml(tree)

    // Apollo should NOT throw
    expect(apolloError).toBeNull()
    expect(html).toContain('apollo-content')

    // The callback should have been registered via useServerInsertedHTML
    const flushed = flushServerInsertedHTML()
    expect(flushed).toHaveLength(1)
    expect(flushed[0]).toBe('<style>.apollo-ssr { color: red; }</style>')
  })

  it('works alongside direct useServerInsertedHTML calls', async () => {
    const { ServerInsertedHTMLContext, useServerInsertedHTML, flushServerInsertedHTML } =
      await import('../src/shims/navigation.js')

    // Component using direct useServerInsertedHTML (styled-components pattern)
    function StyledComponentsRegistry({ children }: { children?: TestServerNode }) {
      useServerInsertedHTML(() => '<style>.sc-1 { display: block; }</style>')
      return createElement(Fragment, null, children)
    }

    // Component using useContext (Apollo pattern)
    function ApolloRegistry() {
      const insertHtml = useTextCompatContext(ServerInsertedHTMLContext!)
      if (insertHtml) {
        insertHtml(() => '<style>.apollo { font-weight: bold; }</style>')
      }
      return createElement('div', null, 'app')
    }

    const tree = createElement(
      ServerInsertedHTMLContext!.Provider,
      { value: useServerInsertedHTML },
      createElement(StyledComponentsRegistry, null, createElement(ApolloRegistry)),
    )

    await renderAppServerElementToHtml(tree)

    // Both callbacks should be in the same array
    const flushed = flushServerInsertedHTML()
    expect(flushed).toHaveLength(2)
    expect(flushed[0]).toContain('.sc-1')
    expect(flushed[1]).toContain('.apollo')
  })

  it('returns null without Provider (Apollo throws clear error)', async () => {
    const { ServerInsertedHTMLContext } = await import('../src/shims/navigation.js')

    let contextValue: unknown = 'not-set'

    function ComponentWithoutProvider() {
      contextValue = useTextCompatContext(ServerInsertedHTMLContext!)
      return createElement('div', null, 'no-provider')
    }

    // Render WITHOUT Provider — simulates using outside App Router
    await renderAppServerElementToHtml(createElement(ComponentWithoutProvider))

    // Context value should be null (the default)
    expect(contextValue).toBeNull()
  })

  it('supports multiple callback registrations from context', async () => {
    const { ServerInsertedHTMLContext, useServerInsertedHTML, flushServerInsertedHTML } =
      await import('../src/shims/navigation.js')

    function MultiCallbackComponent() {
      const insertHtml = useTextCompatContext(ServerInsertedHTMLContext!)
      if (insertHtml) {
        insertHtml(() => '<style>.first {}</style>')
        insertHtml(() => '<style>.second {}</style>')
        insertHtml(() => '<style>.third {}</style>')
      }
      return createElement('div', null, 'multi')
    }

    const tree = createElement(
      ServerInsertedHTMLContext!.Provider,
      { value: useServerInsertedHTML },
      createElement(MultiCallbackComponent),
    )

    await renderAppServerElementToHtml(tree)

    const flushed = flushServerInsertedHTML()
    expect(flushed).toHaveLength(3)
    expect(flushed[0]).toContain('.first')
    expect(flushed[1]).toContain('.second')
    expect(flushed[2]).toContain('.third')
  })
})
