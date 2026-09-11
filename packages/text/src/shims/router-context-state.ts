import type { TextTextData } from '../client/text-text-data.js'
export type SSRContext = {
  pathname: string
  query: Record<string, string | string[]>
  asPath: string
  locale?: string
  locales?: string[]
  defaultLocale?: string
  domainLocales?: TextTextData['domainLocales']
  /**
   * True when rendering a `getStaticPaths` fallback shell for a path that
   * hasn't been pre-rendered yet (`fallback: true` + unlisted path). Mirrors
   * `renderContext.isFallback` in Text.js's `render.tsx`: `getStaticProps`
   * is skipped, the page renders with empty props, and `useRouter().isFallback`
   * returns `true` so user code can show a loading state.
   */
  isFallback?: boolean
}

// ---------------------------------------------------------------------------
// Server-side SSR state uses a registration pattern so this module can be
// bundled for the browser. The ALS-backed implementation lives in
// router-state.ts (server-only) and registers itself on import.
// ---------------------------------------------------------------------------

let _ssrContext: SSRContext | null = null

export let _getSSRContext = (): SSRContext | null => _ssrContext
let _setSSRContextImpl = (ctx: SSRContext | null): void => {
  _ssrContext = ctx
}

/**
 * Register ALS-backed state accessors. Called by router-state.ts on import.
 * @internal
 */
export function _registerRouterStateAccessors(accessors: {
  getSSRContext: () => SSRContext | null
  setSSRContext: (ctx: SSRContext | null) => void
}): void {
  _getSSRContext = accessors.getSSRContext
  _setSSRContextImpl = accessors.setSSRContext
}

export function setSSRContext(ctx: SSRContext | null): void {
  _setSSRContextImpl(ctx)
}
