import { AppMeta, AppDiv } from './app-server-tree.js'
import { createAppPageTreePath } from './app-page-segment-state.js'
export { createAppPageTreePath } from './app-page-segment-state.js'
import {
  AppElementsWire,
  APP_PREFETCH_LOADING_SHELL_MARKER_KEY,
  normalizeAppElementsSlotBindings,
  type AppElements,
  type AppElementsInterception,
  type AppElementsSlotBinding,
} from './app-elements.js'
import {
  ErrorBoundary,
  ForbiddenBoundary,
  NotFoundBoundary,
  RedirectBoundary,
  UnauthorizedBoundary,
} from '../shims/error-boundary.js'
import {
  APP_SLOT_PLACEHOLDER_SENTINEL_TYPE,
  createAppSlotPlaceholderSentinelProps,
} from './app-slot-placeholder-protocol.js'
import { AppRouterScrollTarget } from '../shims/app-router-scroll.js'
import type { AppRouteSemanticIds } from '../routing/app-route-graph.js'
import { LayoutSegmentProvider } from '../shims/layout-segment-context-core.js'
import {
  MetadataHead,
  ViewportHead,
  renderMetadataToHtml,
  type Metadata,
  type Viewport,
} from '../shims/metadata.js'
import { Slot, Children, ParallelSlot } from '../shims/slot-core.js'
import type { AppPageParams } from './app-page-boundary.js'
import {
  createAppRenderDependency,
  renderComponentAfterAppDependencyBarrier,
  renderAfterAppDependencies,
  type AppRenderDependency,
} from './app-render-dependency.js'
import { resolveAppPageSegmentParams } from './app-page-params.js'
import {
  APP_RSC_RENDER_MODE_NAVIGATION,
  APP_RSC_RENDER_MODE_PREFETCH_LOADING_SHELL,
  shouldSuppressLoadingBoundaries,
  type AppRscRenderMode,
} from './app-rsc-render-mode.js'
import {
  resolveAppPageChildSegments,
  resolveAppPageRouteStateKey,
  resolveAppPageSegmentStateKey,
} from './app-page-segment-state.js'
import {
  AppServerFragment,
  AppServerSuspense,
  type AppServerComponent,
  createAppServerElement,
  markAppServerPlanAsPage,
  scopeAppServerPlan,
  type AppServerRenderable,
} from './app-server-tree.js'

export { resolveAppPageChildSegments } from './app-page-segment-state.js'

function createAppChildrenPlaceholder(): AppServerRenderable {
  return createAppServerElement(Children)
}
function createAppParallelSlotPlaceholder(name: string): AppServerRenderable {
  return createAppServerElement(ParallelSlot, { name })
}

type AppPageComponentProps = {
  children?: AppServerRenderable
  error?: unknown
  params?: unknown
  reset?: () => void
} & Record<string, unknown>

type AppPageComponent = AppServerComponent<AppPageComponentProps>
type AppPageErrorComponent = AppServerComponent<{ error: unknown; reset: () => void }>

export type AppPageModule = Record<string, unknown> & {
  default?: AppPageComponent | null | undefined
}

export type AppPageErrorModule = Record<string, unknown> & {
  default?: AppPageErrorComponent | null | undefined
}

type AppPageRouteWiringSlot<
  TModule extends AppPageModule = AppPageModule,
  TErrorModule extends AppPageErrorModule = AppPageErrorModule,
> = {
  /** Graph-owned semantic slot identity. */
  id?: string | null
  /** Slot prop name passed to the owning layout (e.g. "modal" from @modal). */
  name: string
  default?: TModule | null
  error?: TErrorModule | null
  layout?: TModule | null
  layoutIndex: number
  loading?: TModule | null
  page?: TModule | null
  routeSegments?: readonly string[] | null
  /**
   * Full URL pattern parts for the slot's mirrored sub-page. Set when the
   * slot's params may differ from the route's (e.g. inherited slot whose
   * dynamic markers have different names than the route's). The runtime
   * matches the request URL against these parts to extract slot params.
   */
  slotPatternParts?: readonly string[] | null
  /** Param names captured by `slotPatternParts`, in order. */
  slotParamNames?: readonly string[] | null
}

export type AppPageRouteWiringRoute<
  TModule extends AppPageModule = AppPageModule,
  TErrorModule extends AppPageErrorModule = AppPageErrorModule,
> = {
  ids?: AppRouteSemanticIds | null
  error?: TErrorModule | null
  errorPaths?: readonly TErrorModule[] | null
  errors?: readonly (TErrorModule | null | undefined)[] | null
  errorTreePositions?: readonly number[] | null
  layoutTreePositions?: readonly number[] | null
  layouts: readonly (TModule | null | undefined)[]
  loading?: TModule | null
  notFound?: TModule | null
  notFounds?: readonly (TModule | null | undefined)[] | null
  forbidden?: TModule | null
  forbiddens?: readonly (TModule | null | undefined)[] | null
  unauthorized?: TModule | null
  unauthorizeds?: readonly (TModule | null | undefined)[] | null
  routeSegments?: readonly string[]
  /**
   * Keyed by stable slot id (name + owner path), not necessarily the slot prop name.
   */
  slots?: Readonly<Record<string, AppPageRouteWiringSlot<TModule, TErrorModule>>> | null
  templateTreePositions?: readonly number[] | null
  templates?: readonly (TModule | null | undefined)[] | null
}

export type AppPageSlotOverride<TModule extends AppPageModule = AppPageModule> = {
  layoutModules?: readonly (TModule | null | undefined)[] | null
  /**
   * The page module to render for this slot. Optional — when omitted, the
   * slot's existing `page` is used (e.g. when the override only changes the
   * slot's `params` for an inherited mirror with distinct param names).
   */
  pageModule?: TModule | null
  params?: AppPageParams
  props?: Readonly<Record<string, unknown>>
}

type AppPageLayoutEntry<
  TModule extends AppPageModule = AppPageModule,
  TErrorModule extends AppPageErrorModule = AppPageErrorModule,
> = {
  errorModule?: TErrorModule | null | undefined
  forbiddenModule?: TModule | null | undefined
  id: string
  layoutModule?: TModule | null | undefined
  notFoundModule?: TModule | null | undefined
  unauthorizedModule?: TModule | null | undefined
  treePath: string
  treePosition: number
}

type BuildAppPageRouteElementOptions<
  TModule extends AppPageModule = AppPageModule,
  TErrorModule extends AppPageErrorModule = AppPageErrorModule,
> = {
  element: AppServerRenderable
  globalErrorModule?: TErrorModule | null
  makeThenableParams: (params: AppPageParams) => unknown
  matchedParams: AppPageParams
  metadataPlacement?: 'body' | 'head'
  resolvedMetadata: Metadata | null
  resolvedMetadataPathname?: string
  resolvedViewport: Viewport
  rootForbiddenModule?: TModule | null
  rootNotFoundModule?: TModule | null
  rootUnauthorizedModule?: TModule | null
  route: AppPageRouteWiringRoute<TModule, TErrorModule>
  slotOverrides?: Readonly<Record<string, AppPageSlotOverride<TModule>>> | null
}

type BuildAppPageElementsOptions<
  TModule extends AppPageModule = AppPageModule,
  TErrorModule extends AppPageErrorModule = AppPageErrorModule,
> = BuildAppPageRouteElementOptions<TModule, TErrorModule> & {
  interception?: AppElementsInterception | null
  interceptionContext?: string | null
  isRscRequest?: boolean
  mountedSlotIds?: ReadonlySet<string> | null
  renderMode?: AppRscRenderMode
  elementRoutePath?: string
  routePath: string
}

type AppPageTemplateEntry<TModule extends AppPageModule = AppPageModule> = {
  id: string
  templateModule?: TModule | null | undefined
  treePath: string
  treePosition: number
}

type AppPageErrorEntry<TErrorModule extends AppPageErrorModule = AppPageErrorModule> = {
  errorModule?: TErrorModule | null | undefined
  treePosition: number
}

function getDefaultExport<TModule extends AppPageModule>(
  module: TModule | null | undefined,
): AppPageComponent | null {
  return module?.default ?? null
}

function getErrorBoundaryExport<TModule extends AppPageErrorModule>(
  module: TModule | null | undefined,
): AppPageErrorComponent | null {
  return module?.default ?? null
}

export function createAppPageLayoutEntries<
  TModule extends AppPageModule,
  TErrorModule extends AppPageErrorModule,
>(
  route: Pick<
    AppPageRouteWiringRoute<TModule, TErrorModule>,
    | 'errors'
    | 'errorTreePositions'
    | 'layoutTreePositions'
    | 'layouts'
    | 'notFounds'
    | 'routeSegments'
  > & {
    forbiddens?: readonly (TModule | null | undefined)[] | null
    unauthorizeds?: readonly (TModule | null | undefined)[] | null
  },
): AppPageLayoutEntry<TModule, TErrorModule>[] {
  return route.layouts.map((layoutModule, index) => {
    const treePosition = route.layoutTreePositions?.[index] ?? 0
    const treePath = createAppPageTreePath(route.routeSegments, treePosition)
    return {
      errorModule: route.errorTreePositions ? null : (route.errors?.[index] ?? null),
      forbiddenModule: route.forbiddens?.[index] ?? null,
      id: AppElementsWire.encodeLayoutId(treePath),
      layoutModule,
      notFoundModule: route.notFounds?.[index] ?? null,
      unauthorizedModule: route.unauthorizeds?.[index] ?? null,
      treePath,
      treePosition,
    }
  })
}

function createAppPageTemplateEntries<TModule extends AppPageModule>(
  route: Pick<
    AppPageRouteWiringRoute<TModule>,
    'routeSegments' | 'templateTreePositions' | 'templates'
  >,
): AppPageTemplateEntry<TModule>[] {
  return (route.templates ?? []).map((templateModule, index) => {
    const treePosition = route.templateTreePositions?.[index] ?? 0
    const treePath = createAppPageTreePath(route.routeSegments, treePosition)
    return {
      id: AppElementsWire.encodeTemplateId(treePath),
      templateModule,
      treePath,
      treePosition,
    }
  })
}

function createAppPageErrorEntries<TErrorModule extends AppPageErrorModule>(
  route: Pick<
    AppPageRouteWiringRoute<AppPageModule, TErrorModule>,
    'errorPaths' | 'errors' | 'errorTreePositions'
  >,
): AppPageErrorEntry<TErrorModule>[] {
  return (route.errorPaths ?? route.errors ?? []).flatMap((errorModule, index) => {
    if (!errorModule) return []
    const treePosition = route.errorTreePositions?.[index]
    if (treePosition === undefined) return []
    return [{ errorModule, treePosition }]
  })
}

function createAppPageParallelSlotEntries<
  TModule extends AppPageModule,
  TErrorModule extends AppPageErrorModule,
>(
  layoutIndex: number,
  layoutEntries: readonly AppPageLayoutEntry<TModule, TErrorModule>[],
  route: AppPageRouteWiringRoute<TModule, TErrorModule>,
  getEffectiveSlotParams: (slotKey: string, slotName: string) => AppPageParams,
): Readonly<Record<string, AppServerRenderable>> | undefined {
  const parallelSlots: Record<string, AppServerRenderable> = {}

  for (const [slotKey, slot] of Object.entries(route.slots ?? {})) {
    const slotName = slot.name
    const targetIndex = slot.layoutIndex >= 0 ? slot.layoutIndex : layoutEntries.length - 1
    if (targetIndex !== layoutIndex) {
      continue
    }

    const layoutEntry = layoutEntries[targetIndex]
    const treePath = layoutEntry?.treePath ?? '/'
    const slotId = resolveAppPageSlotId(slot, treePath)
    const slotParams = getEffectiveSlotParams(slotKey, slotName)
    const slotSegments = slot.routeSegments
      ? resolveAppPageChildSegments(slot.routeSegments, 0, slotParams)
      : []
    parallelSlots[slotName] = createAppServerElement(
      LayoutSegmentProvider,
      { segmentMap: { children: slotSegments } },
      createAppServerElement(Slot, { id: slotId }),
    )
  }

  return Object.keys(parallelSlots).length > 0 ? parallelSlots : undefined
}

function resolveAppPageSlotId(slot: AppPageRouteWiringSlot, treePath: string): string {
  const slotId = AppElementsWire.encodeSlotId(slot.name, treePath)
  if (slot.id && slot.id !== slotId) {
    throw new Error(
      `[text] App Router slot id mismatch for @${slot.name}: graph id ${slot.id} does not match wire id ${slotId}`,
    )
  }
  return slotId
}

function resolveAppPageSlotBindingState(
  slot: AppPageRouteWiringSlot,
  override: AppPageSlotOverride | undefined,
): AppElementsSlotBinding['state'] {
  const pageComponent = getDefaultExport(override?.pageModule) ?? getDefaultExport(slot.page)
  if (pageComponent) return 'active'
  if (getDefaultExport(slot.default)) return 'default'
  return 'unmatched'
}

function createAppPageSlotBindings<
  TModule extends AppPageModule,
  TErrorModule extends AppPageErrorModule,
>(
  route: AppPageRouteWiringRoute<TModule, TErrorModule>,
  layoutEntries: readonly AppPageLayoutEntry<TModule, TErrorModule>[],
  resolveSlotOverride: (
    slotKey: string,
    slotName: string,
  ) => AppPageSlotOverride<TModule> | undefined,
): readonly AppElementsSlotBinding[] {
  const bindings: AppElementsSlotBinding[] = []
  for (const [slotKey, slot] of Object.entries(route.slots ?? {})) {
    const targetIndex = slot.layoutIndex >= 0 ? slot.layoutIndex : layoutEntries.length - 1
    const layoutEntry = layoutEntries[targetIndex] ?? null
    const ownerLayoutId = layoutEntry?.id ?? null
    const override = resolveSlotOverride(slotKey, slot.name)
    bindings.push({
      ownerLayoutId,
      slotId: resolveAppPageSlotId(slot, layoutEntry?.treePath ?? '/'),
      state: resolveAppPageSlotBindingState(slot, override),
    })
  }
  return normalizeAppElementsSlotBindings(bindings, {
    layoutIds: layoutEntries.map(entry => entry.id),
  })
}

function createAppPageRouteHead(
  metadata: Metadata | null,
  viewport: Viewport,
  pathname: string,
  metadataPlacement: 'body' | 'head',
): AppServerRenderable {
  return createAppServerElement(
    AppServerFragment,
    null,
    createAppServerElement(AppMeta, { charSet: 'utf-8' }),
    metadata && metadataPlacement === 'head'
      ? createAppServerElement(MetadataHead, { metadata, pathname })
      : null,
    createAppServerElement(ViewportHead, { viewport }),
  )
}

function createAppPageRouteBodyMetadata(
  metadata: Metadata | null,
  pathname: string,
  metadataPlacement: 'body' | 'head',
): AppServerRenderable {
  if (!metadata || metadataPlacement !== 'body') return null
  return createAppServerElement(AppDiv, {
    dangerouslySetInnerHTML: { __html: renderMetadataToHtml(metadata, pathname) },
    hidden: true,
  })
}

export function buildAppPageElements<
  TModule extends AppPageModule,
  TErrorModule extends AppPageErrorModule,
>(options: BuildAppPageElementsOptions<TModule, TErrorModule>): AppElements {
  const interceptionContext = options.interceptionContext ?? null
  const renderMode = options.renderMode ?? APP_RSC_RENDER_MODE_NAVIGATION
  const routeSegments = options.route.routeSegments ?? []
  const routeResetKey = resolveAppPageRouteStateKey(routeSegments, options.matchedParams)
  const elementRoutePath = options.elementRoutePath ?? options.routePath
  const routeId = AppElementsWire.encodeRouteId(elementRoutePath, interceptionContext)
  const pageId = AppElementsWire.encodePageId(elementRoutePath, interceptionContext)
  const layoutEntries = createAppPageLayoutEntries(options.route)
  const templateEntries = createAppPageTemplateEntries(options.route)
  const errorEntries = createAppPageErrorEntries(options.route)
  const metadataPlacement = options.metadataPlacement ?? 'head'
  const layoutEntriesByTreePosition = new Map<number, AppPageLayoutEntry<TModule, TErrorModule>>()
  const templateEntriesByTreePosition = new Map<number, AppPageTemplateEntry<TModule>>()
  const errorEntriesByTreePosition = new Map<number, AppPageErrorEntry<TErrorModule>>()
  for (const layoutEntry of layoutEntries) {
    layoutEntriesByTreePosition.set(layoutEntry.treePosition, layoutEntry)
  }
  for (const templateEntry of templateEntries) {
    templateEntriesByTreePosition.set(templateEntry.treePosition, templateEntry)
  }
  for (const errorEntry of errorEntries) {
    errorEntriesByTreePosition.set(errorEntry.treePosition, errorEntry)
  }
  const layoutIndicesByTreePosition = new Map<number, number>()
  for (let index = 0; index < layoutEntries.length; index++) {
    layoutIndicesByTreePosition.set(layoutEntries[index].treePosition, index)
  }
  const layoutDependenciesByIndex = new Map<number, AppRenderDependency>()
  const layoutDependenciesBefore: AppRenderDependency[][] = []
  const slotDependenciesByLayoutIndex: AppRenderDependency[][] = []
  const templateDependenciesById = new Map<string, AppRenderDependency>()
  const templateDependenciesBeforeById = new Map<string, AppRenderDependency[]>()
  const pageDependencies: AppRenderDependency[] = []
  const rootLayoutTreePath = layoutEntries[0]?.treePath ?? null
  const slotNameCounts = new Map<string, number>()
  for (const slot of Object.values(options.route.slots ?? {})) {
    const slotName = slot.name
    slotNameCounts.set(slotName, (slotNameCounts.get(slotName) ?? 0) + 1)
  }
  const orderedTreePositions = Array.from(
    new Set<number>([
      ...layoutEntries.map(entry => entry.treePosition),
      ...templateEntries.map(entry => entry.treePosition),
      ...errorEntries.map(entry => entry.treePosition),
    ]),
  ).sort((left, right) => left - right)
  const resolveSlotOverride = (slotKey: string, slotName: string) => {
    const overrideByKey = options.slotOverrides?.[slotKey]
    if (overrideByKey) {
      return overrideByKey
    }

    // Legacy callers may still provide overrides by slot prop name.
    // Only allow that fallback when it is unambiguous.
    if (slotKey === slotName || (slotNameCounts.get(slotName) ?? 0) === 1) {
      return options.slotOverrides?.[slotName]
    }

    return undefined
  }
  const elements: Record<
    string,
    | AppServerRenderable
    | string
    | null
    | AppElementsInterception
    | readonly AppElementsSlotBinding[]
  > = {
    ...AppElementsWire.createMetadataEntries({
      interception: options.interception ?? null,
      interceptionContext,
      layoutIds: options.route.ids?.layouts ?? layoutEntries.map(entry => entry.id),
      rootLayoutTreePath,
      routeId,
      slotBindings: createAppPageSlotBindings(options.route, layoutEntries, resolveSlotOverride),
    }),
  }
  const getEffectiveSlotParams = (slotKey: string, slotName: string): AppPageParams =>
    resolveSlotOverride(slotKey, slotName)?.params ?? options.matchedParams

  const createLayoutSegmentMap = (
    layoutEntry: AppPageLayoutEntry<TModule, TErrorModule>,
    layoutIndex: number,
  ): { children: string[] } & Record<string, string[]> => {
    const segmentMap: { children: string[] } & Record<string, string[]> = {
      children: resolveAppPageChildSegments(
        routeSegments,
        layoutEntry.treePosition,
        options.matchedParams,
      ),
    }

    for (const [slotKey, slot] of Object.entries(options.route.slots ?? {})) {
      const slotName = slot.name
      const targetIndex = slot.layoutIndex >= 0 ? slot.layoutIndex : layoutEntries.length - 1
      if (targetIndex !== layoutIndex) {
        continue
      }
      const slotParams = getEffectiveSlotParams(slotKey, slotName)
      segmentMap[slotName] = slot.routeSegments
        ? resolveAppPageChildSegments(slot.routeSegments, 0, slotParams)
        : []
    }

    return segmentMap
  }

  for (const treePosition of orderedTreePositions) {
    const layoutIndex = layoutIndicesByTreePosition.get(treePosition)
    if (layoutIndex !== undefined) {
      const layoutEntry = layoutEntries[layoutIndex]
      layoutDependenciesBefore[layoutIndex] = [...pageDependencies]
      if (getDefaultExport(layoutEntry.layoutModule)) {
        const layoutDependency = createAppRenderDependency()
        layoutDependenciesByIndex.set(layoutIndex, layoutDependency)
        pageDependencies.push(layoutDependency)
      }
      slotDependenciesByLayoutIndex[layoutIndex] = [...pageDependencies]
    }

    const templateEntry = templateEntriesByTreePosition.get(treePosition)
    if (!templateEntry || !getDefaultExport(templateEntry.templateModule)) {
      continue
    }

    const templateDependency = createAppRenderDependency()
    templateDependenciesById.set(templateEntry.id, templateDependency)
    templateDependenciesBeforeById.set(templateEntry.id, [...pageDependencies])
    pageDependencies.push(templateDependency)
  }

  const routeLoadingComponent = getDefaultExport(options.route.loading)
  const isPrefetchLoadingShell = renderMode === APP_RSC_RENDER_MODE_PREFETCH_LOADING_SHELL
  const shouldRenderPrefetchLoadingShell = isPrefetchLoadingShell && routeLoadingComponent !== null
  if (shouldRenderPrefetchLoadingShell) {
    // Client loading components serialize as module references in RSC payloads. Keep
    // a durable marker in the shell payload so external router tests and
    // diagnostics can recognize this as a loading-boundary response without
    // requiring source text to appear in client component references.
    elements[APP_PREFETCH_LOADING_SHELL_MARKER_KEY] = 'LoadingBoundary'
  }

  elements[pageId] = isPrefetchLoadingShell ? null : markAppServerPlanAsPage(options.element)

  for (const templateEntry of templateEntries) {
    const templateComponent = getDefaultExport(templateEntry.templateModule)
    if (!templateComponent) {
      continue
    }
    const TemplateComponent = templateComponent
    const templateDependency = templateDependenciesById.get(templateEntry.id)
    const templateProps = {
      children: createAppChildrenPlaceholder(),
      params: options.matchedParams,
    } as AppPageComponentProps
    const templateElement = templateDependency
      ? renderComponentAfterAppDependencyBarrier(
          TemplateComponent,
          templateProps,
          templateDependency,
        )
      : createAppServerElement(TemplateComponent, templateProps)
    elements[templateEntry.id] = renderAfterAppDependencies(
      templateElement,
      templateDependenciesBeforeById.get(templateEntry.id) ?? [],
    )
  }

  for (let index = 0; index < layoutEntries.length; index++) {
    const layoutEntry = layoutEntries[index]
    const layoutComponent = getDefaultExport(layoutEntry.layoutModule)
    if (!layoutComponent) {
      continue
    }

    const layoutProps: Record<string, unknown> = {
      params: options.makeThenableParams(
        resolveAppPageSegmentParams(
          options.route.routeSegments,
          layoutEntry.treePosition,
          options.matchedParams,
        ),
      ),
      __textLayoutSegmentMap: createLayoutSegmentMap(layoutEntry, index),
    }

    for (const slot of Object.values(options.route.slots ?? {})) {
      const slotName = slot.name
      const targetIndex = slot.layoutIndex >= 0 ? slot.layoutIndex : layoutEntries.length - 1
      if (targetIndex !== index) {
        continue
      }
      layoutProps[slotName] = createAppParallelSlotPlaceholder(slotName)
    }

    const LayoutComponent = layoutComponent
    const layoutDependency = layoutDependenciesByIndex.get(index)
    const layoutComponentProps = {
      ...layoutProps,
      children: createAppChildrenPlaceholder(),
    } as AppPageComponentProps
    const layoutElement = layoutDependency
      ? renderComponentAfterAppDependencyBarrier(
          LayoutComponent,
          layoutComponentProps,
          layoutDependency,
        )
      : createAppServerElement(LayoutComponent, layoutComponentProps)
    elements[layoutEntry.id] = scopeAppServerPlan(
      renderAfterAppDependencies(layoutElement, layoutDependenciesBefore[index] ?? [])!,
      layoutEntry.id,
      index,
    )
  }

  for (const [slotKey, slot] of Object.entries(options.route.slots ?? {})) {
    const slotName = slot.name
    const targetIndex = slot.layoutIndex >= 0 ? slot.layoutIndex : layoutEntries.length - 1
    const treePath = layoutEntries[targetIndex]?.treePath ?? '/'
    const slotId = resolveAppPageSlotId(slot, treePath)
    const slotOverride = resolveSlotOverride(slotKey, slotName)
    const slotParams = getEffectiveSlotParams(slotKey, slotName)
    const slotRouteSegments = slot.routeSegments ?? []
    const slotResetKey = resolveAppPageRouteStateKey(slotRouteSegments, slotParams)
    const overrideOrPageComponent =
      getDefaultExport(slotOverride?.pageModule) ?? getDefaultExport(slot.page)
    const defaultComponent = getDefaultExport(slot.default)

    // On soft nav (RSC): omit key when only default.tsx exists and the slot is
    // already mounted on the client. Absent key means the browser retains prior
    // slot content rather than replacing it. When the slot is not yet mounted
    // (first entry into this layout), include the key so default.tsx renders.
    if (
      !overrideOrPageComponent &&
      defaultComponent &&
      options.isRscRequest &&
      options.mountedSlotIds?.has(slotId)
    ) {
      continue
    }

    const slotComponent = overrideOrPageComponent ?? defaultComponent

    if (!slotComponent) {
      elements[slotId] = AppElementsWire.unmatchedSlotValue
      continue
    }

    const slotThenableParams = options.makeThenableParams(slotParams)
    const slotProps: Record<string, unknown> = {
      params: slotThenableParams,
    }
    if (slotOverride?.props) {
      Object.assign(slotProps, slotOverride.props)
    }

    const SlotComponent = slotComponent
    let slotElement: AppServerRenderable = createAppServerElement(
      SlotComponent,
      slotProps as AppPageComponentProps,
    )
    const interceptLayouts = slotOverride?.layoutModules ?? []

    for (let layoutIndex = interceptLayouts.length - 1; layoutIndex >= 0; layoutIndex--) {
      const interceptLayoutComponent = getDefaultExport(interceptLayouts[layoutIndex])
      if (!interceptLayoutComponent) {
        continue
      }
      const InterceptLayoutComponent = interceptLayoutComponent
      slotElement = createAppServerElement(
        InterceptLayoutComponent,
        { params: slotThenableParams },
        slotElement,
      )
    }

    const slotLayoutComponent = getDefaultExport(slot.layout)
    if (slotLayoutComponent) {
      const SlotLayoutComponent = slotLayoutComponent
      slotElement = createAppServerElement(
        SlotLayoutComponent,
        { params: slotThenableParams },
        slotElement,
      )
    }

    const slotLoadingComponent = getDefaultExport(slot.loading)
    if (slotLoadingComponent && !shouldSuppressLoadingBoundaries(renderMode)) {
      const SlotLoadingComponent = slotLoadingComponent
      slotElement = createAppServerElement(
        AppServerSuspense,
        { fallback: createAppServerElement(SlotLoadingComponent, null), key: slotResetKey },
        slotElement,
      )
    }

    const slotErrorComponent = getErrorBoundaryExport(slot.error)
    if (slotErrorComponent) {
      slotElement = createAppServerElement(
        ErrorBoundary,
        { fallback: slotErrorComponent, resetKey: slotResetKey },
        slotElement,
      )
    }

    elements[slotId] = renderAfterAppDependencies(
      slotElement,
      targetIndex >= 0 ? (slotDependenciesByLayoutIndex[targetIndex] ?? []) : [],
    )
  }

  let routeChildren: AppServerRenderable = createAppServerElement(
    LayoutSegmentProvider,
    { segmentMap: { children: [] } },
    createAppServerElement(
      AppRouterScrollTarget,
      null,
      createAppServerElement(Slot, { id: pageId }),
    ),
  )

  if (isPrefetchLoadingShell) {
    if (routeLoadingComponent === null) {
      routeChildren = null
    } else {
      const RouteLoadingComponent = routeLoadingComponent
      routeChildren = createAppServerElement(RouteLoadingComponent, null)
    }
  } else {
    // Wrap the page slot in a per-segment RedirectBoundary so that a
    // redirect() thrown from a server component (or a client component
    // within the page subtree) is caught here — below the route's layouts —
    // rather than at the top-level boundary in app-browser-entry. Catching
    // at the top level unmounts the entire route tree including layouts,
    // which destroys client-side state in layout-hosted components
    // (counters, theme toggles, form drafts). Here, only the page subtree
    // is unmounted; the surrounding layouts stay mounted across the
    // boundary's null-render → router.replace transition, and segment
    // reuse keeps their Rue state intact.
    //
    // Placed inside the Suspense (loading) boundary to match Text.js nesting
    // for the redirect boundary specifically:
    //   Error > AccessFallback > Loading (Suspense) > Redirect > content
    // (Note: Text.js places AccessFallback inside Loading, not outside — that
    // is a pre-existing nesting divergence tracked separately.)
    // This keeps the loading fallback visible during redirect-driven
    // transitions rather than unmounting it.
    routeChildren = createAppServerElement(RedirectBoundary, null, routeChildren)

    if (routeLoadingComponent && !shouldSuppressLoadingBoundaries(renderMode)) {
      const RouteLoadingComponent = routeLoadingComponent
      // Route-level wrappers cover the full page branch in text's flat element
      // transport, so their reset key includes the visible segment-state path.
      // Dynamic param changes reset the pending boundary, while search-only changes
      // preserve it.
      routeChildren = createAppServerElement(
        AppServerSuspense,
        { fallback: createAppServerElement(RouteLoadingComponent, null), key: routeResetKey },
        routeChildren,
      )
    }
  }

  const lastLayoutErrorModule =
    errorEntries.length > 0 ? errorEntries[errorEntries.length - 1].errorModule : null
  // Text.js nesting (outer to inner): Error > Unauthorized > Forbidden > NotFound > children.
  // Building bottom-up means NotFoundBoundary must wrap first, then Forbidden, Unauthorized, Error.
  const notFoundComponent =
    getDefaultExport(options.route.notFound) ?? getDefaultExport(options.rootNotFoundModule)
  if (notFoundComponent) {
    const NotFoundComponent = notFoundComponent
    routeChildren = createAppServerElement(
      NotFoundBoundary,
      { fallback: createAppServerElement(NotFoundComponent, null), resetKey: routeResetKey },
      routeChildren,
    )
  }

  const forbiddenComponent =
    getDefaultExport(options.route.forbidden) ?? getDefaultExport(options.rootForbiddenModule)
  if (forbiddenComponent) {
    const ForbiddenComponent = forbiddenComponent
    routeChildren = createAppServerElement(
      ForbiddenBoundary,
      { fallback: createAppServerElement(ForbiddenComponent, null), resetKey: routeResetKey },
      routeChildren,
    )
  }

  const unauthorizedComponent =
    getDefaultExport(options.route.unauthorized) ?? getDefaultExport(options.rootUnauthorizedModule)
  if (unauthorizedComponent) {
    const UnauthorizedComponent = unauthorizedComponent
    routeChildren = createAppServerElement(
      UnauthorizedBoundary,
      { fallback: createAppServerElement(UnauthorizedComponent, null), resetKey: routeResetKey },
      routeChildren,
    )
  }

  const pageErrorComponent = getErrorBoundaryExport(options.route.error)
  if (pageErrorComponent && options.route.error !== lastLayoutErrorModule) {
    routeChildren = createAppServerElement(
      ErrorBoundary,
      { fallback: pageErrorComponent, resetKey: routeResetKey },
      routeChildren,
    )
  }

  for (let index = orderedTreePositions.length - 1; index >= 0; index--) {
    const treePosition = orderedTreePositions[index]
    const segmentResetKey = resolveAppPageSegmentStateKey(
      routeSegments,
      treePosition,
      options.matchedParams,
    )
    let segmentChildren: AppServerRenderable = routeChildren
    const layoutEntry = layoutEntriesByTreePosition.get(treePosition)
    const templateEntry = templateEntriesByTreePosition.get(treePosition)
    const errorEntry = errorEntriesByTreePosition.get(treePosition)

    // Text.js nesting per segment (outer to inner): Layout > Template > Error > Unauthorized > Forbidden > NotFound > children.
    // Building bottom-up means NotFoundBoundary must wrap the leaf subtree first,
    // then ErrorBoundary, then Template, with the Layout slot outermost.
    if (layoutEntry) {
      const layoutNotFoundComponent = getDefaultExport(layoutEntry.notFoundModule)
      if (layoutNotFoundComponent) {
        const LayoutNotFoundComponent = layoutNotFoundComponent
        segmentChildren = createAppServerElement(
          NotFoundBoundary,
          {
            fallback: createAppServerElement(LayoutNotFoundComponent, null),
            resetKey: segmentResetKey,
          },
          segmentChildren,
        )
      }

      const layoutForbiddenComponent = getDefaultExport(layoutEntry.forbiddenModule)
      if (layoutForbiddenComponent) {
        const LayoutForbiddenComponent = layoutForbiddenComponent
        segmentChildren = createAppServerElement(
          ForbiddenBoundary,
          {
            fallback: createAppServerElement(LayoutForbiddenComponent, null),
            resetKey: segmentResetKey,
          },
          segmentChildren,
        )
      }

      const layoutUnauthorizedComponent = getDefaultExport(layoutEntry.unauthorizedModule)
      if (layoutUnauthorizedComponent) {
        const LayoutUnauthorizedComponent = layoutUnauthorizedComponent
        segmentChildren = createAppServerElement(
          UnauthorizedBoundary,
          {
            fallback: createAppServerElement(LayoutUnauthorizedComponent, null),
            resetKey: segmentResetKey,
          },
          segmentChildren,
        )
      }
    }

    const segmentErrorComponent = getErrorBoundaryExport(
      errorEntry?.errorModule ?? layoutEntry?.errorModule,
    )
    if (segmentErrorComponent) {
      segmentChildren = createAppServerElement(
        ErrorBoundary,
        { fallback: segmentErrorComponent, resetKey: segmentResetKey },
        segmentChildren,
      )
    }

    if (templateEntry && getDefaultExport(templateEntry.templateModule)) {
      segmentChildren = createAppServerElement(
        Slot,
        { id: templateEntry.id, key: segmentResetKey },
        segmentChildren,
      )
    }

    if (!layoutEntry) {
      routeChildren = segmentChildren
      continue
    }
    const layoutHasElement = getDefaultExport(layoutEntry.layoutModule) !== null
    const layoutIndex = layoutIndicesByTreePosition.get(treePosition) ?? -1
    const segmentMap = createLayoutSegmentMap(layoutEntry, layoutIndex)

    routeChildren = createAppServerElement(
      LayoutSegmentProvider,
      { segmentMap },
      layoutHasElement
        ? createAppServerElement(
            Slot,
            {
              id: layoutEntry.id,
              parallelSlots: createAppPageParallelSlotEntries(
                layoutIndex,
                layoutEntries,
                options.route,
                getEffectiveSlotParams,
              ),
            },
            segmentChildren,
          )
        : segmentChildren,
    )
  }

  const globalErrorComponent = getErrorBoundaryExport(options.globalErrorModule)
  if (globalErrorComponent) elements.__globalError = globalErrorComponent

  elements[routeId] = createAppServerElement(
    AppServerFragment,
    null,
    createAppPageRouteHead(
      options.resolvedMetadata,
      options.resolvedViewport,
      options.resolvedMetadataPathname ?? options.routePath,
      metadataPlacement,
    ),
    routeChildren,
    createAppPageRouteBodyMetadata(
      options.resolvedMetadata,
      options.resolvedMetadataPathname ?? options.routePath,
      metadataPlacement,
    ),
  )

  return elements
}
