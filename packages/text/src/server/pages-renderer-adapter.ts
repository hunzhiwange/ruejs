import {
  renderToString,
  renderToReadableStream,
  type ServerComponent,
  type ServerPlan,
} from '@rue-js/runtime/server'
import { _$writeComponent } from '@rue-js/runtime/internal/ssr'
import { ScriptNonceContext } from '../shims/script-nonce-context.js'
export type PagesRouterContextWrapper = (plan: ServerPlan) => ServerPlan
export function createPagesDocumentElement(Component: ServerComponent): ServerPlan {
  const prototype = (Component as unknown as { prototype?: { render?: unknown } }).prototype
  const renderDocument: ServerComponent =
    typeof prototype?.render === 'function'
      ? props =>
          new (Component as unknown as new (props: typeof props) => {
            render(): ReturnType<ServerComponent>
          })(props).render()
      : Component

  return writer => _$writeComponent(writer, 'pages', renderDocument, () => ({}), null)
}
export function createPagesPageElement(options: {
  AppComponent?: ServerComponent | null
  PageComponent: ServerComponent
  pageProps: Record<string, unknown>
  wrapWithRouterContext?: PagesRouterContextWrapper | null
}): ServerPlan {
  const Component = options.AppComponent ?? options.PageComponent
  const props = options.AppComponent
    ? { Component: options.PageComponent, pageProps: options.pageProps }
    : options.pageProps
  const plan: ServerPlan = writer => _$writeComponent(writer, 'pages', Component, () => props, null)
  return writer =>
    (options.wrapWithRouterContext ? options.wrapWithRouterContext(plan) : plan)(writer)
}
export function withPagesScriptNonce(plan: ServerPlan, nonce?: string): ServerPlan {
  return ScriptNonceContext.Provider({ value: nonce, children: plan }) as ServerPlan
}
export function renderPagesRenderableToString(plan: ServerPlan): Promise<string> {
  return renderToString(() => plan)
}
export function renderPagesRenderableToReadableStream(
  plan: ServerPlan,
): Promise<ReadableStream<Uint8Array>> {
  return renderToReadableStream(() => plan)
}
