import {
  hydrateRoot,
  mountClaimRoot,
  _$claimComponent,
  type ClaimComponent,
  type ClaimPlan,
} from '@rue-js/runtime/internal/hydrate'
import { _$compiledPropsSnapshot } from '@rue-js/runtime/internal/component'
type PagesClientRenderable = {
  component: ClaimComponent
  page: ClaimComponent
  props: Record<string, unknown>
  wrap?: ((plan: ClaimPlan) => ClaimPlan) | null
}
export type PagesClientRoot = { render(element: PagesClientRenderable): void; unmount(): void }
export function createPagesClientElement(options: {
  AppComponent?: ClaimComponent | null
  PageComponent: ClaimComponent
  pageProps: Record<string, unknown>
  wrapWithRouterContext?: ((plan: ClaimPlan) => ClaimPlan) | null
}): PagesClientRenderable {
  return {
    component: options.AppComponent ?? options.PageComponent,
    page: options.PageComponent,
    props: options.AppComponent
      ? { Component: options.PageComponent, pageProps: options.pageProps }
      : options.pageProps,
    wrap: options.wrapWithRouterContext,
  }
}
export function hydratePagesClientRoot(
  container: Element,
  initial: PagesClientRenderable,
): PagesClientRoot {
  let entry = initial
  const factory =
    (entry: PagesClientRenderable): ClaimComponent =>
    props => {
      const plan: ClaimPlan = context =>
        _$claimComponent(
          context,
          'pages',
          entry.component,
          () => _$compiledPropsSnapshot(props),
          null,
        )
      return entry.wrap ? entry.wrap(plan) : plan
    }
  let root = hydrateRoot(container, factory(entry), { props: entry.props })
  return {
    render(next) {
      if (next.component === entry.component && next.page === entry.page)
        root.updateProps(next.props)
      else {
        root.unmount()
        root = mountClaimRoot(container, factory(next), { props: next.props })
      }
      entry = next
    },
    unmount() {
      root.unmount()
    },
  }
}
