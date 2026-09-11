/**
 * text/app shim
 *
 * Provides the AppProps type and a runtime default `App` class component
 * for Pages Router fixtures that follow the canonical `_app.js` pattern:
 *
 *   import App from "text/app";
 *   export default class MyApp extends App { ... }
 *
 * or call `App.getInitialProps(appContext)` from a custom getInitialProps.
 *
 * Ported from Text.js:
 *   https://github.com/vercel/next.js/blob/canary/packages/text/src/pages/_app.tsx
 *
 * Behavioural parity notes:
 * - `App.getInitialProps(appContext)` returns `{ pageProps }`, where
 *   `pageProps` comes from the wrapped page's own `getInitialProps` (if
 *   any). This matches Text.js's behaviour via `loadGetInitialProps`.
 * - `render()` returns `<Component {...pageProps} />` — the default
 *   behaviour Text.js documents for the built-in App.
 * - `origGetInitialProps` is preserved alongside `getInitialProps` for
 *   userland code that introspects the original implementation.
 *
 * Type signatures mirror Text.js's intentionally permissive `<P = any>`
 * generics so that userland subclasses like `class MyApp extends App`
 * type-check without forcing the caller to supply generic parameters.
 */
// oxlint-disable typescript/no-explicit-any -- match Text.js's permissive _app.tsx generics
import { type TextCompatComponentType, type TextCompatNode } from './component-adapter.js'

export type AppProps<P = any> = {
  Component: TextCompatComponentType<P> & {
    getInitialProps?: (ctx: any) => any
  }
  pageProps: P
  router?: any
  __N_SSG?: boolean
  __N_SSP?: boolean
}

/**
 * The context passed to `App.getInitialProps`. Mirrors Text.js's
 * `AppContextType` from `packages/text/src/shared/lib/utils.ts`.
 */
export type AppContext = {
  Component: TextCompatComponentType<any> & {
    getInitialProps?: (ctx: any) => any
  }
  AppTree: TextCompatComponentType<any>
  ctx: any
  router: any
}

/**
 * The initial props shape returned by `App.getInitialProps`. Mirrors
 * Text.js's `AppInitialProps` from `packages/text/src/shared/lib/utils.ts`.
 */
export type AppInitialProps<PageProps = any> = {
  pageProps: PageProps
}

async function appGetInitialProps({ Component, ctx }: AppContext): Promise<AppInitialProps> {
  // Text.js delegates this to `loadGetInitialProps(Component, ctx)`. For the
  // canonical _app pattern the relevant behaviour is: invoke the wrapped
  // page's `getInitialProps` if defined, otherwise return `{}` for
  // pageProps. We replicate that minimal shape without pulling in the
  // full development-only validation logic from utils.ts.
  let pageProps: any = {}
  if (typeof Component.getInitialProps === 'function') {
    pageProps = await Component.getInitialProps(ctx)
    // Divergence from Text.js (intentional, current scope):
    //
    // Text.js's `loadGetInitialProps` throws when a page's getInitialProps
    // resolves to null/undefined:
    //
    //   "<DisplayName>.getInitialProps() should resolve to an object.
    //    But found "null"/"undefined" instead."
    //
    // See: https://github.com/vercel/next.js/blob/canary/packages/text/src/shared/lib/utils.ts
    //
    // text currently coerces the missing value to `{}` so that fixtures
    // and userland code that accidentally return nothing still render
    // (just with empty pageProps) instead of crashing the page. If you're
    // debugging a Pages Router page that renders with mysteriously empty
    // props, suspect a `getInitialProps` that returns undefined — Text.js
    // would have surfaced that as a thrown error at this point.
    if (pageProps == null) {
      pageProps = {}
    }
  }
  return { pageProps }
}

function App<CP = any>({ Component, pageProps }: AppProps<CP>) {
  return <Component {...(pageProps as Record<string, unknown>)} />
}
export default Object.assign(App, {
  origGetInitialProps: appGetInitialProps,
  getInitialProps: appGetInitialProps,
})
