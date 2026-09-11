/**
 * text/navigation shim
 *
 * App Router navigation hooks. These work on both server (RSC) and client.
 * Server-side: reads from a request context set by the RSC handler.
 * Client-side: reads from browser Location API and provides navigation.
 */

// The exported `text/navigation` hooks still intentionally present a
// hook-shaped facade for Text-compatible client components; Rue renderable
// handling stays behind the app/pages renderer adapters. Compat dispatcher
// access is centralized in hooks-adapter so RSC-safe namespace handling lives
// in one place.
import { startTransition, useSyncExternalStore } from './hooks-adapter.js'
import { getNavigationRuntime, hasAppNavigationRuntime } from '../client/navigation-runtime.js'
import { notifyAppRouterTransitionStart } from '../client/instrumentation-client-state.js'
import { AppElementsWire } from '../server/app-elements.js'
import { resolveManifestNavigationInterceptionContext } from '../server/app-browser-interception-context.js'
import { createExternalHistoryStatePreservingMetadata } from '../server/app-history-state.js'
import {
  createRscRequestHeaders,
  createRscRequestUrl,
  TEXT_RSC_COMPATIBILITY_ID_HEADER,
  TEXT_RSC_CONTENT_TYPE,
} from '../server/app-rsc-cache-busting.js'
import { TEXT_MOUNTED_SLOTS_HEADER, TEXT_PARAMS_HEADER } from '../server/headers.js'
import {
  isAbsoluteOrProtocolRelativeUrl,
  isHashOnlyBrowserUrlChange,
  toBrowserNavigationHref,
  toSameOriginAppPath,
  withBasePath,
} from './url-utils.js'
import { stripBasePath } from '../utils/base-path.js'
import { ReadonlyURLSearchParams } from './readonly-url-search-params.js'
import { assertSafeNavigationUrl } from './url-safety.js'
import { AppRouterContext } from './internal/app-router-context.js'
import { scrollToHashTarget } from './hash-scroll.js'
import {
  beginAppRouterScrollIntent,
  clearAppRouterScrollIntent,
  consumeAppRouterScrollIntent,
  type AppRouterScrollIntent,
} from './app-router-scroll-state.js'
import {
  getOrCreateTextCompatContext,
  useOptionalTextCompatContext,
  useTextCompatContext,
  type TextCompatContext,
} from './context-adapter.js'
import { getCurrentOwner, getOwnerParent, onOwnerCleanup } from '@rue-js/runtime/internal/reactive'

// ─── Layout segment context ───────────────────────────────────────────────────
// Stores the child segments below the current layout. Each layout wraps its
// children with a provider whose value is the remaining route tree segments
// (including route groups, with dynamic params resolved to actual values).
// Created lazily because context factories are NOT available in the RSC
// condition. In the RSC environment, this remains null.
// The shared context lives behind a global singleton so provider/hook pairs
// still line up if Vite loads this shim through multiple resolved module IDs.
const _LAYOUT_SEGMENT_CTX_KEY = Symbol.for('text.layoutSegmentContext')
const _SERVER_INSERTED_HTML_CTX_KEY = Symbol.for('text.serverInsertedHTMLContext')
const _CURRENT_SSR_LAYOUT_SEGMENT_MAP_KEY = Symbol.for('text.currentSsrLayoutSegmentMap')

/**
 * Map of parallel route key → child segments below the current layout.
 * The "children" key is always present (the default parallel route).
 * Named parallel routes add their own keys (e.g., "team", "analytics").
 *
 * Arrays are mutable (`string[]`) to match Text.js's public API return type
 * without requiring `as` casts. The map itself is Readonly — no key addition.
 */
export type SegmentMap = Readonly<Record<string, string[]>> & { readonly children: string[] }

type CurrentSsrLayoutSegmentMapState = {
  active: boolean
  segmentMap: SegmentMap | null
  ownerMaps: Map<number, SegmentMap>
}

type CurrentSsrLayoutSegmentMapGlobal = typeof globalThis & {
  [_CURRENT_SSR_LAYOUT_SEGMENT_MAP_KEY]?: CurrentSsrLayoutSegmentMapState
}

function getCurrentSsrLayoutSegmentMapState(): CurrentSsrLayoutSegmentMapState {
  const globalState = globalThis as CurrentSsrLayoutSegmentMapGlobal
  if (!globalState[_CURRENT_SSR_LAYOUT_SEGMENT_MAP_KEY]) {
    globalState[_CURRENT_SSR_LAYOUT_SEGMENT_MAP_KEY] = {
      active: false,
      segmentMap: null,
      ownerMaps: new Map(),
    }
  }
  const state = globalState[_CURRENT_SSR_LAYOUT_SEGMENT_MAP_KEY]
  state.ownerMaps ??= new Map()
  return state
}

export function beginCurrentSsrLayoutSegmentMap(): void {
  const state = getCurrentSsrLayoutSegmentMapState()
  state.active = true
  state.segmentMap = null
}

export function setCurrentSsrLayoutSegmentMap(segmentMap: SegmentMap): void {
  const state = getCurrentSsrLayoutSegmentMapState()
  const owner = getCurrentOwner()
  if (owner !== undefined) {
    state.ownerMaps.set(owner, segmentMap)
    onOwnerCleanup(() => state.ownerMaps.delete(owner))
  }
  if (!state.active) return
  state.segmentMap = segmentMap
}

export function clearCurrentSsrLayoutSegmentMap(): void {
  const state = getCurrentSsrLayoutSegmentMapState()
  state.active = false
  state.segmentMap = null
}

// ─── ServerInsertedHTML context ────────────────────────────────────────────────
// Used by CSS-in-JS libraries (Apollo Client, styled-components, emotion) to
// register HTML injection callbacks during SSR via useContext().
// The SSR entry wraps the rendered tree with a Provider whose value is a
// callback registration function (useServerInsertedHTML).
//
// In Text.js, ServerInsertedHTMLContext holds a function:
//   (callback: () => unknown) => void
// Libraries call useContext(ServerInsertedHTMLContext) to get this function,
// then call it to register callbacks that inject HTML during SSR.
//
// Created eagerly at module load time. In the RSC environment (rue-server
// condition), createContext isn't available so this will be null.

function getServerInsertedHTMLContext(): TextCompatContext<
  ((callback: () => unknown) => void) | null
> | null {
  return getOrCreateTextCompatContext<((callback: () => unknown) => void) | null>(
    _SERVER_INSERTED_HTML_CTX_KEY,
    null,
  )
}

export const ServerInsertedHTMLContext: TextCompatContext<
  ((callback: () => unknown) => void) | null
> | null = getServerInsertedHTMLContext()

/**
 * Get or create the layout segment context.
 * Returns null in the RSC environment (createContext unavailable).
 */
export function getLayoutSegmentContext(): TextCompatContext<SegmentMap> | null {
  return getOrCreateTextCompatContext<SegmentMap>(_LAYOUT_SEGMENT_CTX_KEY, { children: [] })
}

/**
 * Read the child segments for a parallel route below the current layout.
 * Returns [] if no context is available (RSC environment, outside the client tree)
 * or if the requested key is not present in the segment map.
 */
/* oxlint-disable eslint-plugin-rue-hooks/rules-of-hooks */
function useChildSegments(parallelRoutesKey: string = 'children'): string[] {
  const currentSsrLayoutSegmentMapState = getCurrentSsrLayoutSegmentMapState()
  let owner = getCurrentOwner()
  while (owner !== undefined) {
    const ownerMap = currentSsrLayoutSegmentMapState.ownerMaps.get(owner)
    if (ownerMap) return ownerMap[parallelRoutesKey] ?? []
    owner = getOwnerParent(owner)
  }
  if (currentSsrLayoutSegmentMapState.active && currentSsrLayoutSegmentMapState.segmentMap) {
    return currentSsrLayoutSegmentMapState.segmentMap[parallelRoutesKey] ?? []
  }
  const ctx = getLayoutSegmentContext()
  if (!ctx) return []
  const segmentMap = useOptionalTextCompatContext<SegmentMap>(ctx, { children: [] })
  return segmentMap[parallelRoutesKey] ?? []
}
/* oxlint-enable eslint-plugin-rue-hooks/rules-of-hooks */

// ---------------------------------------------------------------------------
// Server-side request context (set by the RSC entry before rendering)
// ---------------------------------------------------------------------------

export type NavigationContext = {
  pathname: string
  searchParams: URLSearchParams
  params: Record<string, string | string[]>
}

const _READONLY_SEARCH_PARAMS = Symbol('text.navigation.readonlySearchParams')
const _READONLY_SEARCH_PARAMS_SOURCE = Symbol('text.navigation.readonlySearchParamsSource')

type NavigationContextWithReadonlyCache = NavigationContext & {
  [_READONLY_SEARCH_PARAMS]?: ReadonlyURLSearchParams
  [_READONLY_SEARCH_PARAMS_SOURCE]?: URLSearchParams
}

// ---------------------------------------------------------------------------
// Server-side navigation state lives in a separate server-only module
// (navigation-state.ts) that uses AsyncLocalStorage for request isolation.
// This module is bundled for the browser, so it can't import node:async_hooks.
//
// On the server: state functions are set by navigation-state.ts at import time.
// On the client: _serverContext falls back to null (hooks use window instead).
//
// Global accessor pattern (issue #688):
// Vite's multi-environment dev mode can create separate module instances of
// this file for the SSR entry vs "use client" components. When that happens,
// _registerStateAccessors only updates the SSR entry's instance, leaving the
// "use client" instance with the default (null) fallbacks.
//
// To fix this, navigation-state.ts also stores the accessors on globalThis
// via Symbol.for, and the defaults here check for that global before falling
// back to module-level state. This ensures all module instances can reach the
// ALS-backed state regardless of which instance was registered.
// ---------------------------------------------------------------------------

type _StateAccessors = {
  getServerContext: () => NavigationContext | null
  setServerContext: (ctx: NavigationContext | null) => void
  getInsertedHTMLCallbacks: () => Array<() => unknown>
  clearInsertedHTMLCallbacks: () => void
}

export const GLOBAL_ACCESSORS_KEY = Symbol.for('text.navigation.globalAccessors')
const _GLOBAL_ACCESSORS_KEY = GLOBAL_ACCESSORS_KEY
type _GlobalWithAccessors = typeof globalThis & { [_GLOBAL_ACCESSORS_KEY]?: _StateAccessors }

// Browser hydration has the same module-split shape as SSR in Vite dev:
// the browser entry seeds the snapshot before hydrateRoot(), but client
// components can import a different module instance of this shim.
const GLOBAL_HYDRATION_CONTEXT_KEY = Symbol.for('text.navigation.clientHydrationContext')
const _GLOBAL_HYDRATION_CONTEXT_KEY = GLOBAL_HYDRATION_CONTEXT_KEY
type _GlobalWithHydrationContext = typeof globalThis & {
  [_GLOBAL_HYDRATION_CONTEXT_KEY]?: NavigationContext | null
}

function _getGlobalAccessors(): _StateAccessors | undefined {
  return (globalThis as _GlobalWithAccessors)[_GLOBAL_ACCESSORS_KEY]
}

function _getClientHydrationContext(): NavigationContext | null | undefined {
  const globalState = globalThis as _GlobalWithHydrationContext
  if (Object.prototype.hasOwnProperty.call(globalState, _GLOBAL_HYDRATION_CONTEXT_KEY)) {
    return globalState[_GLOBAL_HYDRATION_CONTEXT_KEY] ?? null
  }
  return undefined
}

function _setClientHydrationContext(ctx: NavigationContext | null): void {
  ;(globalThis as _GlobalWithHydrationContext)[_GLOBAL_HYDRATION_CONTEXT_KEY] = ctx
}

let _serverContext: NavigationContext | null = null
let _serverInsertedHTMLCallbacks: Array<() => unknown> = []

// These are overridden by navigation-state.ts on the server to use ALS.
// The defaults check globalThis for cross-module-instance access (issue #688).
let _getServerContext = (): NavigationContext | null => {
  if (typeof window !== 'undefined') {
    const hydrationContext = _getClientHydrationContext()
    return hydrationContext !== undefined ? hydrationContext : _serverContext
  }
  const g = _getGlobalAccessors()
  return g ? g.getServerContext() : _serverContext
}
let _setServerContext = (ctx: NavigationContext | null): void => {
  if (typeof window !== 'undefined') {
    _serverContext = ctx
    _setClientHydrationContext(ctx)
    return
  }
  const g = _getGlobalAccessors()
  if (g) {
    g.setServerContext(ctx)
  } else {
    _serverContext = ctx
  }
}
let _getInsertedHTMLCallbacks = (): Array<() => unknown> => {
  const g = _getGlobalAccessors()
  return g ? g.getInsertedHTMLCallbacks() : _serverInsertedHTMLCallbacks
}
let _clearInsertedHTMLCallbacks = (): void => {
  const g = _getGlobalAccessors()
  if (g) {
    g.clearInsertedHTMLCallbacks()
  } else {
    _serverInsertedHTMLCallbacks = []
  }
}

/**
 * Register ALS-backed state accessors. Called by navigation-state.ts on import.
 * @internal
 */
export function _registerStateAccessors(accessors: _StateAccessors): void {
  _getServerContext = accessors.getServerContext
  _setServerContext = accessors.setServerContext
  _getInsertedHTMLCallbacks = accessors.getInsertedHTMLCallbacks
  _clearInsertedHTMLCallbacks = accessors.clearInsertedHTMLCallbacks
}

// ---------------------------------------------------------------------------
// Pages Router compat source.
//
// `text/navigation` is the App Router API surface, but Text.js exposes the
// same hook names to Pages Router pages as a compat shim. In Text.js this is
// done by wrapping pages with SearchParamsContext / PathParamsContext /
// PathnameContext providers populated from the Pages Router's state — see:
// .textjs-ref/packages/text/src/server/render.tsx
// .textjs-ref/packages/text/src/client/index.tsx
// .textjs-ref/packages/text/src/shared/lib/router/adapters.tsx
//
// text drives these hooks from a module-level navigation context instead of
// Rue Context, so we fall back to a Pages Router accessor when no App
// Router context is set. The accessor is published by text/router via a
// global Symbol.for handle (see packages/text/src/shims/router.ts); we do
// NOT import router.ts here because doing so would force navigation.ts to be
// loaded for every consumer of text/router, triggering window.history
// patches in unit tests that only want the router shim.
// ---------------------------------------------------------------------------

type PagesNavigationContext = {
  pathname: string
  searchParams: URLSearchParams
  params: Record<string, string | string[]>
}

const PAGES_NAVIGATION_ACCESSOR_KEY = Symbol.for('text.navigation.pagesNavigationContextAccessor')
type _GlobalWithPagesAccessor = typeof globalThis & {
  [PAGES_NAVIGATION_ACCESSOR_KEY]?: () => PagesNavigationContext | null
}

function _getPagesNavigationContext(): PagesNavigationContext | null {
  const accessor = (globalThis as _GlobalWithPagesAccessor)[PAGES_NAVIGATION_ACCESSOR_KEY]
  if (!accessor) return null
  try {
    return accessor()
  } catch {
    return null
  }
}

/**
 * Get the navigation context for the current SSR/RSC render.
 * Reads from AsyncLocalStorage when available (concurrent-safe),
 * otherwise falls back to module-level state.
 */
export function getNavigationContext(): NavigationContext | null {
  return _getServerContext()
}

/**
 * Set the navigation context for the current SSR/RSC render.
 * Called by the framework entry before rendering each request.
 */
export function setNavigationContext(ctx: NavigationContext | null): void {
  _setServerContext(ctx)
}

// ---------------------------------------------------------------------------
// Client-side state
// ---------------------------------------------------------------------------

const isServer = typeof window === 'undefined'

/** basePath from text.config.js, injected by the plugin at build time */
export const __basePath: string = process.env.__TEXT_ROUTER_BASEPATH ?? ''

// ---------------------------------------------------------------------------
// RSC prefetch cache utilities (shared between link.tsx and browser entry)
// ---------------------------------------------------------------------------

/** Maximum number of entries in the RSC prefetch cache. */
export const MAX_PREFETCH_CACHE_SIZE = 50

/** TTL for prefetch cache entries in ms (matches Text.js static prefetch TTL). */
export const PREFETCH_CACHE_TTL = 30_000

/** A buffered RSC response stored as an ArrayBuffer for replay. */
export type CachedRscResponse = {
  compatibilityIdHeader?: string | null
  buffer: ArrayBuffer
  contentType: string
  mountedSlotsHeader?: string | null
  paramsHeader: string | null
  url: string
}

export type PrefetchOptions = {
  kind?: unknown
  onInvalidate?: () => void
}

export type PrefetchCacheEntry = {
  cacheForNavigation?: boolean
  invalidationTimer?: ReturnType<typeof setTimeout>
  onInvalidateCallbacks?: Set<() => void>
  optimisticRouteShell?: boolean
  outcome: 'pending' | 'cache-seeded'
  snapshot?: CachedRscResponse
  pending?: Promise<void>
  timestamp: number
}

export function getCurrentInterceptionContext(): string | null {
  if (isServer) {
    return null
  }

  return stripBasePath(window.location.pathname, __basePath)
}

export function getPrefetchInterceptionContext(targetHref: string): string | null {
  if (isServer) {
    return null
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(targetHref, window.location.href)
  } catch {
    return null
  }

  return resolveManifestNavigationInterceptionContext({
    basePath: __basePath,
    currentPathname: window.location.pathname,
    routeManifest: getNavigationRuntime()?.bootstrap.routeManifest ?? null,
    targetPathname: targetUrl.pathname,
  })
}

export function getCurrentTextUrl(): string {
  if (isServer) {
    return '/'
  }

  return window.location.pathname + window.location.search
}

/** Get or create the shared in-memory RSC prefetch cache on window. */
export function getPrefetchCache(): Map<string, PrefetchCacheEntry> {
  if (isServer) return new Map()
  if (!window.__TEXT_RSC_PREFETCH_CACHE__) {
    window.__TEXT_RSC_PREFETCH_CACHE__ = new Map<string, PrefetchCacheEntry>()
  }
  return window.__TEXT_RSC_PREFETCH_CACHE__
}

/**
 * Get or create the shared set of already-prefetched RSC URLs on window.
 * Keyed by interception-aware cache key so distinct source routes do not alias.
 */
export function getPrefetchedUrls(): Set<string> {
  if (isServer) return new Set()
  if (!window.__TEXT_RSC_PREFETCHED_URLS__) {
    window.__TEXT_RSC_PREFETCHED_URLS__ = new Set<string>()
  }
  return window.__TEXT_RSC_PREFETCHED_URLS__
}

/**
 * Evict prefetch cache entries if at capacity.
 * First sweeps expired entries, then falls back to FIFO eviction.
 */
function evictPrefetchCacheIfNeeded(): void {
  const cache = getPrefetchCache()
  if (cache.size < MAX_PREFETCH_CACHE_SIZE) return

  const now = Date.now()
  const prefetched = getPrefetchedUrls()

  for (const [key, entry] of cache) {
    if (now - entry.timestamp >= PREFETCH_CACHE_TTL) {
      deletePrefetchCacheEntry(cache, prefetched, key, entry, true)
    }
  }

  while (cache.size >= MAX_PREFETCH_CACHE_SIZE) {
    const oldest = cache.keys()['ne' + 'xt']().value
    if (oldest !== undefined) {
      const entry = cache.get(oldest)
      if (entry) {
        deletePrefetchCacheEntry(cache, prefetched, oldest, entry, true)
      } else {
        cache.delete(oldest)
        prefetched.delete(oldest)
      }
    } else {
      break
    }
  }
}

function clearPrefetchInvalidation(entry: PrefetchCacheEntry): void {
  if (entry.invalidationTimer !== undefined) {
    clearTimeout(entry.invalidationTimer)
    entry.invalidationTimer = undefined
  }
}

function notifyPrefetchInvalidated(entry: PrefetchCacheEntry): void {
  clearPrefetchInvalidation(entry)
  const callbacks = entry.onInvalidateCallbacks
  entry.onInvalidateCallbacks = undefined
  if (callbacks === undefined) return

  for (const onInvalidate of callbacks) {
    try {
      onInvalidate()
    } catch (error) {
      if (typeof reportError === 'function') {
        reportError(error)
      } else {
        console.error(error)
      }
    }
  }
}

function deletePrefetchCacheEntry(
  cache: Map<string, PrefetchCacheEntry>,
  prefetched: Set<string>,
  cacheKey: string,
  entry: PrefetchCacheEntry,
  notify: boolean,
): void {
  cache.delete(cacheKey)
  prefetched.delete(cacheKey)
  if (notify) {
    notifyPrefetchInvalidated(entry)
  } else {
    clearPrefetchInvalidation(entry)
    entry.onInvalidateCallbacks = undefined
  }
}

function invalidatePrefetchCacheEntry(cacheKey: string): void {
  const cache = getPrefetchCache()
  const entry = cache.get(cacheKey)
  if (!entry) return
  deletePrefetchCacheEntry(cache, getPrefetchedUrls(), cacheKey, entry, true)
}

function schedulePrefetchInvalidation(cacheKey: string, entry: PrefetchCacheEntry): void {
  if (entry.onInvalidateCallbacks === undefined || entry.onInvalidateCallbacks.size === 0) return

  clearPrefetchInvalidation(entry)
  const elapsed = Date.now() - entry.timestamp
  const delay = Math.max(0, PREFETCH_CACHE_TTL - elapsed)
  entry.invalidationTimer = setTimeout(() => {
    invalidatePrefetchCacheEntry(cacheKey)
  }, delay)
}

function addPrefetchInvalidationCallback(
  entry: PrefetchCacheEntry,
  onInvalidate: (() => void) | undefined,
): void {
  if (onInvalidate === undefined) return
  if (entry.onInvalidateCallbacks === undefined) {
    entry.onInvalidateCallbacks = new Set()
  }
  entry.onInvalidateCallbacks.add(onInvalidate)
}

function attachPrefetchInvalidationCallback(
  cacheKey: string,
  onInvalidate: (() => void) | undefined,
): void {
  if (onInvalidate === undefined) return
  const entry = getPrefetchCache().get(cacheKey)
  if (!entry) return
  addPrefetchInvalidationCallback(entry, onInvalidate)
  if (entry.outcome === 'cache-seeded') {
    schedulePrefetchInvalidation(cacheKey, entry)
  }
}

export function invalidatePrefetchCache(): void {
  const cache = getPrefetchCache()
  const prefetched = getPrefetchedUrls()
  for (const [cacheKey, entry] of cache) {
    deletePrefetchCacheEntry(cache, prefetched, cacheKey, entry, true)
  }
  prefetched.clear()
  if (!isServer) {
    getNavigationRuntime()?.functions.pingVisibleLinks?.()
  }
}

/**
 * Store a prefetched RSC response in the cache by snapshotting it to an
 * ArrayBuffer.  The snapshot completes asynchronously; during that window
 * the entry is marked `pending` so consumePrefetchResponse() will skip it
 * (the caller falls back to a fresh fetch, which is acceptable).
 *
 * Prefer prefetchRscResponse() for new call-sites — it handles the full
 * prefetch lifecycle including dedup and explicit slot context.
 * storePrefetchResponse() is kept for backward compatibility and test
 * helpers. It is slot-unaware: the snapshot's mountedSlotsHeader comes
 * from the response headers, not the caller, so consumePrefetchResponse
 * may reject the entry if the caller's slot context differs.
 *
 * NB: Caller is responsible for managing getPrefetchedUrls() — this
 * function only stores the response in the prefetch cache.
 */
export function storePrefetchResponse(
  rscUrl: string,
  response: Response,
  interceptionContext: string | null = null,
  options?: PrefetchOptions,
): void {
  const cacheKey = AppElementsWire.encodeCacheKey(rscUrl, interceptionContext)
  evictPrefetchCacheIfNeeded()
  const entry: PrefetchCacheEntry = {
    outcome: 'pending',
    timestamp: Date.now(),
  }
  addPrefetchInvalidationCallback(entry, options?.onInvalidate)
  entry.pending = snapshotRscResponse(response)
    .then(snapshot => {
      entry.snapshot = snapshot
    })
    .catch(() => {
      deletePrefetchCacheEntry(getPrefetchCache(), getPrefetchedUrls(), cacheKey, entry, false)
    })
    .finally(() => {
      entry.pending = undefined
      if (entry.snapshot) {
        entry.outcome = 'cache-seeded'
        schedulePrefetchInvalidation(cacheKey, entry)
      }
    })
  getPrefetchCache().set(cacheKey, entry)
}

export function createCachedRscResponseSnapshot(
  response: Response,
  buffer: ArrayBuffer,
  responseUrl: string | null = null,
): CachedRscResponse {
  return {
    compatibilityIdHeader: response.headers.get(TEXT_RSC_COMPATIBILITY_ID_HEADER),
    buffer,
    contentType: response.headers.get('content-type') ?? TEXT_RSC_CONTENT_TYPE,
    mountedSlotsHeader: response.headers.get(TEXT_MOUNTED_SLOTS_HEADER),
    paramsHeader: response.headers.get(TEXT_PARAMS_HEADER),
    url: responseUrl ?? response.url,
  }
}

/**
 * Snapshot an RSC response to an ArrayBuffer for caching and replay.
 * Consumes the response body and stores it with content-type and URL metadata.
 */
export async function snapshotRscResponse(response: Response): Promise<CachedRscResponse> {
  return createCachedRscResponseSnapshot(response, await response.arrayBuffer())
}

/**
 * Reconstruct a Response from a cached RSC snapshot.
 * Creates a new Response with the original ArrayBuffer so createFromFetch
 * can consume the stream from scratch.
 *
 * NOTE: The reconstructed Response always has `url === ""` — the Response
 * constructor does not accept a `url` option, and `response.url` is read-only
 * set by the fetch infrastructure. Callers that need the original URL should
 * read it from `cached.url` directly rather than from the restored Response.
 *
 * @param copy - When true (default), copies the ArrayBuffer so the cached
 *   snapshot remains replayable (needed for the visited-response cache).
 *   Pass false for single-consumption paths (e.g. prefetch cache entries
 *   that are deleted after consumption) to avoid the extra allocation.
 */
export function restoreRscResponse(cached: CachedRscResponse, copy = true): Response {
  const headers = new Headers({ 'content-type': cached.contentType })
  if (cached.mountedSlotsHeader != null) {
    headers.set(TEXT_MOUNTED_SLOTS_HEADER, cached.mountedSlotsHeader)
  }
  if (cached.compatibilityIdHeader != null) {
    headers.set(TEXT_RSC_COMPATIBILITY_ID_HEADER, cached.compatibilityIdHeader)
  }
  if (cached.paramsHeader != null) {
    headers.set(TEXT_PARAMS_HEADER, cached.paramsHeader)
  }

  return new Response(copy ? cached.buffer.slice(0) : cached.buffer, {
    status: 200,
    headers,
  })
}

/**
 * Prefetch an RSC response and snapshot it for later consumption.
 * Stores the in-flight promise so immediate clicks can await it instead
 * of firing a duplicate fetch.
 * Enforces a maximum cache size to prevent unbounded memory growth on
 * link-heavy pages.
 */
export function prefetchRscResponse(
  rscUrl: string,
  fetchPromise: Promise<Response>,
  interceptionContext: string | null = null,
  mountedSlotsHeader: string | null = null,
  options?: PrefetchOptions,
  behavior: { cacheForNavigation?: boolean; optimisticRouteShell?: boolean } = {},
): void {
  const cacheKey = AppElementsWire.encodeCacheKey(rscUrl, interceptionContext)
  const cache = getPrefetchCache()
  const prefetched = getPrefetchedUrls()
  const now = Date.now()

  const entry: PrefetchCacheEntry = {
    cacheForNavigation: behavior.cacheForNavigation ?? true,
    optimisticRouteShell: behavior.optimisticRouteShell === true,
    outcome: 'pending',
    timestamp: now,
  }
  addPrefetchInvalidationCallback(entry, options?.onInvalidate)

  entry.pending = fetchPromise
    .then(async response => {
      if (response.ok) {
        entry.snapshot = {
          ...(await snapshotRscResponse(response)),
          // Prefetch compatibility is defined by the slot context at fetch
          // time, not by whatever header a reused response happens to carry.
          mountedSlotsHeader,
        }
      } else {
        deletePrefetchCacheEntry(cache, prefetched, cacheKey, entry, false)
      }
    })
    .catch(() => {
      deletePrefetchCacheEntry(cache, prefetched, cacheKey, entry, false)
    })
    .finally(() => {
      entry.pending = undefined
      if (entry.snapshot) {
        entry.outcome = 'cache-seeded'
        schedulePrefetchInvalidation(cacheKey, entry)
      }
    })

  // Insert the new entry before evicting. FIFO evicts from the front of the
  // Map (oldest insertion order), so the just-appended entry is safe — only
  // entries inserted before it are candidates for removal.
  cache.set(cacheKey, entry)
  evictPrefetchCacheIfNeeded()
}

/**
 * Consume a prefetched response for a given rscUrl.
 * Only returns settled (non-pending) snapshots synchronously.
 * Returns null if the entry is still in flight or doesn't exist.
 */
export function consumePrefetchResponse(
  rscUrl: string,
  interceptionContext: string | null = null,
  mountedSlotsHeader: string | null = null,
): CachedRscResponse | null {
  const cacheKey = AppElementsWire.encodeCacheKey(rscUrl, interceptionContext)
  const cache = getPrefetchCache()
  const entry = cache.get(cacheKey)
  if (!entry) return null

  // Skip in-flight snapshots and error-path residue where pending cleared
  // without a successful transition to a cache-seeded entry.
  if (entry.pending || entry.outcome !== 'cache-seeded') return null
  if (entry.cacheForNavigation === false) return null

  deletePrefetchCacheEntry(cache, getPrefetchedUrls(), cacheKey, entry, false)

  if (entry.snapshot) {
    if ((entry.snapshot.mountedSlotsHeader ?? null) !== mountedSlotsHeader) {
      // Entry was already removed above. Slot mismatch means the prefetch
      // used stale slot context and cannot be safely reused.
      return null
    }
    if (Date.now() - entry.timestamp >= PREFETCH_CACHE_TTL) {
      return null
    }
    return entry.snapshot
  }

  return null
}

// ---------------------------------------------------------------------------
// Client navigation state — stored on a Symbol.for global to survive
// multiple Vite module instances loading this file through different IDs.
// ---------------------------------------------------------------------------

type NavigationListener = () => void
const _CLIENT_NAV_STATE_KEY = Symbol.for('text.clientNavigationState')
const _MOUNTED_SLOTS_HEADER_KEY = Symbol.for('text.mountedSlotsHeader')

type ClientNavigationState = {
  listeners: Set<NavigationListener>
  cachedSearch: string
  cachedReadonlySearchParams: ReadonlyURLSearchParams
  cachedPathname: string
  clientParams: Record<string, string | string[]>
  clientParamsJson: string
  pendingClientParams: Record<string, string | string[]> | null
  pendingClientParamsJson: string | null
  pendingPathname: string | null
  pendingPathnameNavId: number | null
  originalPushState: typeof window.history.pushState
  originalReplaceState: typeof window.history.replaceState
  patchInstalled: boolean
  hasPendingNavigationUpdate: boolean
  suppressUrlNotifyCount: number
  navigationSnapshotActiveCount: number
}

type CommitClientNavigationStateOptions = {
  releaseSnapshot?: boolean
}

type ClientNavigationGlobal = typeof globalThis & {
  [_CLIENT_NAV_STATE_KEY]?: ClientNavigationState
  [_MOUNTED_SLOTS_HEADER_KEY]?: string | null
}

function createMissingHistoryStateFallback(): typeof window.history.pushState {
  return function missingHistoryStateFallback(data, _unused, url) {
    if (url !== undefined && url !== null) {
      try {
        window.location.href = new URL(url, window.location.href).href
      } catch {
        window.location.href = String(url)
      }
    }
    try {
      Reflect.set(window.history, 'state', data)
    } catch {}
  } as typeof window.history.pushState
}

function getBoundHistoryStateMethod(method: 'pushState' | 'replaceState') {
  const fn = window.history[method]
  if (typeof fn === 'function') {
    return fn.bind(window.history)
  }
  return createMissingHistoryStateFallback()
}

export function setMountedSlotsHeader(header: string | null): void {
  if (isServer) return
  const globalState = window as ClientNavigationGlobal
  globalState[_MOUNTED_SLOTS_HEADER_KEY] = header
}

export function getMountedSlotsHeader(): string | null {
  if (isServer) return null
  const globalState = window as ClientNavigationGlobal
  return globalState[_MOUNTED_SLOTS_HEADER_KEY] ?? null
}

export function getClientNavigationState(): ClientNavigationState | null {
  if (isServer) return null

  const globalState = window as ClientNavigationGlobal
  globalState[_CLIENT_NAV_STATE_KEY] ??= {
    listeners: new Set<NavigationListener>(),
    cachedSearch: window.location.search,
    cachedReadonlySearchParams: new ReadonlyURLSearchParams(window.location.search),
    cachedPathname: stripBasePath(window.location.pathname, __basePath),
    clientParams: {},
    clientParamsJson: '{}',
    pendingClientParams: null,
    pendingClientParamsJson: null,
    pendingPathname: null,
    pendingPathnameNavId: null,
    // NB: These capture the currently installed history methods, not guaranteed
    // native ones. If a third-party library (analytics, router) has already patched
    // history methods before this module loads, we intentionally preserve that
    // wrapper. With Symbol.for global state, the first module instance to load wins.
    originalPushState: getBoundHistoryStateMethod('pushState'),
    originalReplaceState: getBoundHistoryStateMethod('replaceState'),
    patchInstalled: false,
    hasPendingNavigationUpdate: false,
    suppressUrlNotifyCount: 0,
    navigationSnapshotActiveCount: 0,
  }

  return globalState[_CLIENT_NAV_STATE_KEY]!
}

function notifyNavigationListeners(): void {
  const state = getClientNavigationState()
  if (!state) return
  for (const fn of state.listeners) {
    if (typeof fn === 'function') fn()
  }
}

// Cached URLSearchParams, pathname, etc. for referential stability
// useSyncExternalStore compares snapshots with Object.is — avoid creating
// new instances on every render (infinite re-renders).
let _cachedEmptyServerSearchParams: ReadonlyURLSearchParams | null = null

/**
 * Get cached pathname snapshot for useSyncExternalStore.
 * Note: Returns cached value from ClientNavigationState, not live window.location.
 * The cache is updated by syncCommittedUrlStateFromLocation() after navigation commits.
 * This ensures referential stability and prevents infinite re-renders.
 * External pushState/replaceState while URL notifications are suppressed won't
 * be visible until the text commit.
 */
function getPathnameSnapshot(): string {
  return getClientNavigationState()?.cachedPathname ?? '/'
}

let _cachedEmptyClientSearchParams: ReadonlyURLSearchParams | null = null

/**
 * Get cached search params snapshot for useSyncExternalStore.
 * Note: Returns cached value from ClientNavigationState, not live window.location.search.
 * The cache is updated by syncCommittedUrlStateFromLocation() after navigation commits.
 * This ensures referential stability and prevents infinite re-renders.
 * External pushState/replaceState while URL notifications are suppressed won't
 * be visible until the text commit.
 */
function getSearchParamsSnapshot(): ReadonlyURLSearchParams {
  const cached = getClientNavigationState()?.cachedReadonlySearchParams
  if (cached) return cached
  if (_cachedEmptyClientSearchParams === null) {
    _cachedEmptyClientSearchParams = new ReadonlyURLSearchParams()
  }
  return _cachedEmptyClientSearchParams
}

function syncCommittedUrlStateFromLocation(): boolean {
  const state = getClientNavigationState()
  if (!state) return false

  let changed = false

  const pathname = stripBasePath(window.location.pathname, __basePath)
  if (pathname !== state.cachedPathname) {
    state.cachedPathname = pathname
    changed = true
  }

  const search = window.location.search
  if (search !== state.cachedSearch) {
    state.cachedSearch = search
    state.cachedReadonlySearchParams = new ReadonlyURLSearchParams(search)
    changed = true
  }

  return changed
}

function getServerSearchParamsSnapshot(): ReadonlyURLSearchParams {
  const ctx = _getServerContext() as NavigationContextWithReadonlyCache | null

  if (!ctx) {
    // No App Router server context - try Pages Router compat shim.
    // See `adaptForSearchParams` in Text.js's adapters:
    // .textjs-ref/packages/text/src/shared/lib/router/adapters.tsx
    const pagesCtx = _getPagesNavigationContext()
    if (pagesCtx) {
      return new ReadonlyURLSearchParams(pagesCtx.searchParams)
    }
    if (_cachedEmptyServerSearchParams === null) {
      _cachedEmptyServerSearchParams = new ReadonlyURLSearchParams()
    }
    return _cachedEmptyServerSearchParams
  }

  const source = ctx.searchParams
  const cached = ctx[_READONLY_SEARCH_PARAMS]
  const cachedSource = ctx[_READONLY_SEARCH_PARAMS_SOURCE]

  // Return cached wrapper if source hasn't changed
  if (cached && cachedSource === source) {
    return cached
  }

  // Create and cache new wrapper
  const readonly = new ReadonlyURLSearchParams(source)
  ctx[_READONLY_SEARCH_PARAMS] = readonly
  ctx[_READONLY_SEARCH_PARAMS_SOURCE] = source

  return readonly
}

// ---------------------------------------------------------------------------
// Navigation snapshot activation flag
//
// The render snapshot context provides pending URL values during transitions.
// After the transition commits, the snapshot becomes stale and must NOT shadow
// subsequent external URL changes (user pushState/replaceState). This flag
// tracks whether a navigation transition is in progress — hooks only prefer
// the snapshot while it's active.
// ---------------------------------------------------------------------------

/**
 * Mark a navigation snapshot as active. Called before startTransition
 * in renderNavigationPayload. While active, hooks prefer the snapshot
 * context value over useSyncExternalStore. Uses a counter (not boolean)
 * to handle overlapping navigations — rapid clicks can interleave
 * activate/deactivate if multiple transitions are in flight.
 */
export function activateNavigationSnapshot(): void {
  const state = getClientNavigationState()
  if (state) state.navigationSnapshotActiveCount++
}

// Track client-side params (set during RSC hydration/navigation)
// We cache the params object for referential stability — only create a new
// object when the params actually change (shallow key/value comparison).
const _EMPTY_PARAMS: Record<string, string | string[]> = {}

// ---------------------------------------------------------------------------
// Client navigation render snapshot — provides pending URL values to hooks
// during a startTransition so they see the destination, not the stale URL.
// ---------------------------------------------------------------------------

export type ClientNavigationRenderSnapshot = {
  pathname: string
  searchParams: ReadonlyURLSearchParams
  params: Record<string, string | string[]>
}

const _CLIENT_NAV_RENDER_CTX_KEY = Symbol.for('text.clientNavigationRenderContext')

export function getClientNavigationRenderContext(): TextCompatContext<ClientNavigationRenderSnapshot | null> | null {
  return getOrCreateTextCompatContext<ClientNavigationRenderSnapshot | null>(
    _CLIENT_NAV_RENDER_CTX_KEY,
    null,
  )
}

/* oxlint-disable eslint-plugin-rue-hooks/rules-of-hooks */
function useClientNavigationRenderSnapshot(): ClientNavigationRenderSnapshot | null {
  const ctx = getClientNavigationRenderContext()
  return useOptionalTextCompatContext<ClientNavigationRenderSnapshot | null>(ctx, null)
}
/* oxlint-enable eslint-plugin-rue-hooks/rules-of-hooks */

export function createClientNavigationRenderSnapshot(
  href: string,
  params: Record<string, string | string[]>,
): ClientNavigationRenderSnapshot {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const url = new URL(href, origin)

  return {
    pathname: stripBasePath(url.pathname, __basePath),
    searchParams: new ReadonlyURLSearchParams(url.search),
    params,
  }
}

// Module-level fallback for environments without window (tests, SSR).
let _fallbackClientParams: Record<string, string | string[]> = _EMPTY_PARAMS
let _fallbackClientParamsJson = '{}'

export function setClientParams(params: Record<string, string | string[]>): void {
  const state = getClientNavigationState()
  if (!state) {
    const json = JSON.stringify(params)
    if (json !== _fallbackClientParamsJson) {
      _fallbackClientParams = params
      _fallbackClientParamsJson = json
    }
    return
  }

  const json = JSON.stringify(params)
  if (json !== state.clientParamsJson) {
    state.clientParams = params
    state.clientParamsJson = json
    state.pendingClientParams = null
    state.pendingClientParamsJson = null
    notifyNavigationListeners()
  }
}

export function replaceClientParamsWithoutNotify(params: Record<string, string | string[]>): void {
  const state = getClientNavigationState()
  if (!state) return

  const json = JSON.stringify(params)
  if (json !== state.clientParamsJson && json !== state.pendingClientParamsJson) {
    state.pendingClientParams = params
    state.pendingClientParamsJson = json
    state.hasPendingNavigationUpdate = true
  }
}

/** Get the current client params (for testing referential stability). */
export function getClientParams(): Record<string, string | string[]> {
  return getClientNavigationState()?.clientParams ?? _fallbackClientParams
}

/**
 * Set the pending pathname for client-side navigation.
 * Strips the base path before storing. Associates the pathname with the given navId
 * so only that navigation (or a newer one) can clear it.
 */
export function setPendingPathname(pathname: string, navId: number): void {
  const state = getClientNavigationState()
  if (!state) return
  state.pendingPathname = stripBasePath(pathname, __basePath)
  state.pendingPathnameNavId = navId
}

/**
 * Clear the pending pathname, but only if the given navId matches the one
 * that set it, or if pendingPathnameNavId is null (no active owner).
 * This prevents superseded navigations from clearing state belonging to newer navigations.
 */
export function clearPendingPathname(navId: number): void {
  const state = getClientNavigationState()
  if (!state) return
  // Only clear if this navId is the one that set the pendingPathname,
  // or if pendingPathnameNavId is null (no owner)
  if (state.pendingPathnameNavId === null || state.pendingPathnameNavId === navId) {
    state.pendingPathname = null
    state.pendingPathnameNavId = null
  }
}

function getClientParamsSnapshot(): Record<string, string | string[]> {
  const state = getClientNavigationState()
  if (state && Object.keys(state.clientParams).length > 0) {
    return state.clientParams
  }
  // Fall back to the Pages Router compat shim if nothing has populated the
  // App Router client params (Pages Router pages never call setClientParams).
  const pagesCtx = _getPagesNavigationContext()
  if (pagesCtx) return pagesCtx.params
  return state?.clientParams ?? _EMPTY_PARAMS
}

function getServerParamsSnapshot(): Record<string, string | string[]> {
  const ctx = _getServerContext()
  if (ctx) return ctx.params
  // No App Router navigation context — fall back to Pages Router state.
  // See `adaptForPathParams` in Text.js's pages-router adapter:
  // .textjs-ref/packages/text/src/shared/lib/router/adapters.tsx
  const pagesCtx = _getPagesNavigationContext()
  return pagesCtx?.params ?? _EMPTY_PARAMS
}

function subscribeToNavigation(cb: () => void): () => void {
  const state = getClientNavigationState()
  if (!state) return () => {}

  state.listeners.add(cb)
  return () => {
    state.listeners.delete(cb)
  }
}

/* oxlint-disable eslint-plugin-rue-hooks/rules-of-hooks */
/**
 * Returns the current pathname.
 * Server: from request context. Client: from window.location.
 */
export function usePathname(): string {
  const serverContext = _getServerContext()
  if (serverContext) return serverContext.pathname

  if (isServer) {
    // During SSR of "use client" components, the navigation context may not be set.
    // Return a safe fallback — the client will hydrate with the real value.
    // Pages Router compat shim: derive pathname from the Pages Router state.
    return _getPagesNavigationContext()?.pathname ?? '/'
  }
  const renderSnapshot = useClientNavigationRenderSnapshot()
  if (renderSnapshot && (getClientNavigationState()?.navigationSnapshotActiveCount ?? 0) > 0) {
    return renderSnapshot.pathname
  }
  // Client-side: use the hook system for reactivity
  const pathname = useSyncExternalStore(
    subscribeToNavigation,
    getPathnameSnapshot,
    () => _getServerContext()?.pathname ?? _getPagesNavigationContext()?.pathname ?? '/',
  )
  // Prefer the render snapshot during an active navigation transition so
  // hooks return the pending URL, not the stale committed one. After commit,
  // fall through to useSyncExternalStore so user pushState/replaceState
  // calls are immediately reflected.
  return pathname
}
/* oxlint-enable eslint-plugin-rue-hooks/rules-of-hooks */

/* oxlint-disable eslint-plugin-rue-hooks/rules-of-hooks */
/**
 * Returns the current search params as a read-only URLSearchParams.
 */
export function useSearchParams(): ReadonlyURLSearchParams {
  const serverContext = _getServerContext()
  if (serverContext) return getServerSearchParamsSnapshot()

  if (isServer) {
    // During SSR for "use client" components, the navigation context may not be set.
    // getServerSearchParamsSnapshot also covers the Pages Router compat shim.
    return getServerSearchParamsSnapshot()
  }
  const renderSnapshot = useClientNavigationRenderSnapshot()
  if (renderSnapshot && (getClientNavigationState()?.navigationSnapshotActiveCount ?? 0) > 0) {
    return renderSnapshot.searchParams
  }
  const searchParams = useSyncExternalStore(
    subscribeToNavigation,
    getSearchParamsSnapshot,
    getServerSearchParamsSnapshot,
  )
  return searchParams
}
/* oxlint-enable eslint-plugin-rue-hooks/rules-of-hooks */

/* oxlint-disable eslint-plugin-rue-hooks/rules-of-hooks */
/**
 * Returns the dynamic params for the current route.
 */
export function useParams<
  T extends Record<string, string | string[]> = Record<string, string | string[]>,
>(): T {
  const serverContext = _getServerContext()
  if (serverContext) return serverContext.params as T

  if (isServer) {
    // During SSR for "use client" components, the navigation context may not be set.
    // getServerParamsSnapshot covers both App Router and Pages Router compat.
    return getServerParamsSnapshot() as T
  }
  const renderSnapshot = useClientNavigationRenderSnapshot()
  if (renderSnapshot && (getClientNavigationState()?.navigationSnapshotActiveCount ?? 0) > 0) {
    return renderSnapshot.params as T
  }
  const params = useSyncExternalStore(
    subscribeToNavigation,
    getClientParamsSnapshot as () => T,
    getServerParamsSnapshot as () => T,
  )
  return params
}
/* oxlint-enable eslint-plugin-rue-hooks/rules-of-hooks */

/**
 * Check if a href is an external URL (any URL scheme per RFC 3986, or protocol-relative).
 */
function isExternalUrl(href: string): boolean {
  return isAbsoluteOrProtocolRelativeUrl(href)
}

/**
 * Check if a href is only a hash change relative to the current URL.
 */
function isHashOnlyChange(href: string): boolean {
  if (typeof window === 'undefined') return false
  if (href.startsWith('#')) return true
  return isHashOnlyBrowserUrlChange(href, window.location.href, __basePath)
}

// ---------------------------------------------------------------------------
// History method wrappers — suppress notifications for internal updates
// ---------------------------------------------------------------------------

function withSuppressedUrlNotifications<T>(fn: () => T): T {
  const state = getClientNavigationState()
  if (!state) {
    return fn()
  }

  state.suppressUrlNotifyCount += 1
  try {
    return fn()
  } finally {
    state.suppressUrlNotifyCount -= 1
  }
}

/**
 * Commit pending client navigation state to committed snapshots.
 *
 * navId is optional: callers that don't own pendingPathname (for example,
 * superseded pre-paint cleanup) may pass undefined to flush URL/params state
 * without clearing pendingPathname owned by the active navigation. Such callers
 * must opt in explicitly if they also own an activated render snapshot.
 */
export function commitClientNavigationState(
  navId?: number,
  options?: CommitClientNavigationStateOptions,
): void {
  if (isServer) return
  const state = getClientNavigationState()
  if (!state) return

  // Only navigation-owned commits may release a render snapshot. Ownerless URL
  // syncs still update committed pathname/search state, but must not consume
  // the active snapshot for an in-flight App Router transition.
  const shouldReleaseSnapshot = navId !== undefined || options?.releaseSnapshot === true
  if (shouldReleaseSnapshot && state.navigationSnapshotActiveCount > 0) {
    state.navigationSnapshotActiveCount -= 1
  }

  const urlChanged = syncCommittedUrlStateFromLocation()
  if (state.pendingClientParams !== null && state.pendingClientParamsJson !== null) {
    state.clientParams = state.pendingClientParams
    state.clientParamsJson = state.pendingClientParamsJson
    state.pendingClientParams = null
    state.pendingClientParamsJson = null
  }
  // Clear pending pathname when navigation commits, but only if:
  // - The navId matches the one that set pendingPathname
  // - No newer navigation has overwritten pendingPathname (pendingPathnameNavId === null or matches)
  // - navId is undefined only for non-owning callers, which must not clear
  //   pendingPathname for an active navigation.
  const canClearPendingPathname =
    state.pendingPathnameNavId === null ||
    (navId !== undefined && state.pendingPathnameNavId === navId)
  if (canClearPendingPathname) {
    state.pendingPathname = null
    state.pendingPathnameNavId = null
  }
  const shouldNotify = urlChanged || state.hasPendingNavigationUpdate
  state.hasPendingNavigationUpdate = false

  if (shouldNotify) {
    notifyNavigationListeners()
    getNavigationRuntime()?.functions.pingVisibleLinks?.()
  }
}

export function pushHistoryStateWithoutNotify(
  data: unknown,
  unused: string,
  url?: string | URL | null,
): void {
  withSuppressedUrlNotifications(() => {
    const state = getClientNavigationState()
    state?.originalPushState.call(window.history, data, unused, url)
  })
}

export function replaceHistoryStateWithoutNotify(
  data: unknown,
  unused: string,
  url?: string | URL | null,
): void {
  withSuppressedUrlNotifications(() => {
    const state = getClientNavigationState()
    state?.originalReplaceState.call(window.history, data, unused, url)
  })
}

/**
 * Save the current scroll position into the current history state.
 * Called before every navigation to enable scroll restoration on back/forward.
 *
 * Uses replaceHistoryStateWithoutNotify to avoid triggering the patched
 * history.replaceState interception (which would cause spurious re-renders).
 */
function saveScrollPosition(): void {
  const state = window.history.state ?? {}
  replaceHistoryStateWithoutNotify(
    { ...state, __text_scrollX: window.scrollX, __text_scrollY: window.scrollY },
    '',
  )
}

function commitHashOnlyHistoryState(href: string, mode: 'push' | 'replace', scroll: boolean): void {
  const commitAppRouterHashNavigation = getNavigationRuntime()?.functions.commitHashNavigation
  if (commitAppRouterHashNavigation) {
    commitAppRouterHashNavigation(href, mode, scroll)
    return
  }

  if (mode === 'replace') {
    replaceHistoryStateWithoutNotify(null, '', href)
  } else {
    pushHistoryStateWithoutNotify(null, '', href)
  }
}

function applyAppRouterScrollFallback(intent: AppRouterScrollIntent): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }

  if (intent.hash !== null) {
    scrollToHashTarget(intent.hash)
    return
  }

  document.documentElement.scrollTop = 0
}

/**
 * Restore scroll position from a history state object (used on popstate).
 *
 * When an RSC navigation is in flight (back/forward triggers both this
 * handler and the browser entry's popstate handler which calls the registered
 * navigation runtime), we must wait for the new content to render
 * before scrolling. Otherwise the user sees old content flash at the
 * restored scroll position.
 *
 * This handler fires before the browser entry's popstate handler (because
 * navigation.ts is loaded before hydration completes), so we defer via a
 * microtask to give the browser entry handler a chance to set
 * __TEXT_RSC_PENDING__. Promise.resolve() schedules a microtask
 * that runs after all synchronous event listeners have completed.
 */
function restoreScrollPosition(state: unknown): void {
  if (state && typeof state === 'object' && '__text_scrollY' in state) {
    const { __text_scrollX: x, __text_scrollY: y } = state as {
      __text_scrollX: number
      __text_scrollY: number
    }

    // Defer to allow other popstate listeners (browser entry) to run first
    // and set __TEXT_RSC_PENDING__. Promise.resolve() schedules a microtask
    // that runs after all synchronous event listeners have completed.
    void Promise.resolve().then(() => {
      const pending: Promise<void> | null = window.__TEXT_RSC_PENDING__ ?? null

      if (pending) {
        // Wait for the RSC navigation to finish rendering, then scroll.
        void pending.then(() => {
          requestAnimationFrame(() => {
            window.scrollTo(x, y)
          })
        })
      } else {
        // No RSC navigation in flight (Pages Router or already settled).
        requestAnimationFrame(() => {
          window.scrollTo(x, y)
        })
      }
    })
  }
}

/**
 * Navigate to a URL, handling external URLs, hash-only changes, and RSC navigation.
 */
export async function navigateClientSide(
  href: string,
  mode: 'push' | 'replace',
  scroll: boolean,
  programmaticTransition = false,
): Promise<void> {
  // Normalize same-origin absolute URLs to local paths for SPA navigation
  let normalizedHref = href
  if (isExternalUrl(href)) {
    const localPath = toSameOriginAppPath(href, __basePath)
    if (localPath == null) {
      // Truly external: use full page navigation
      if (mode === 'replace') {
        window.location.replace(href)
      } else {
        window.location.assign(href)
      }
      return
    }
    normalizedHref = localPath
  }

  const fullHref = toBrowserNavigationHref(normalizedHref, window.location.href, __basePath)
  // Match Text.js: App Router reports navigation start before dispatching,
  // including hash-only navigations that short-circuit after URL update.
  notifyAppRouterTransitionStart(fullHref, mode)

  // Save scroll position before navigating (for back/forward restoration)
  if (mode === 'push') {
    saveScrollPosition()
  }

  // Hash-only change: update URL and scroll to target, skip RSC fetch
  if (isHashOnlyChange(fullHref)) {
    const hash = fullHref.includes('#') ? fullHref.slice(fullHref.indexOf('#')) : ''
    commitHashOnlyHistoryState(fullHref, mode, scroll)
    commitClientNavigationState()
    if (scroll) {
      scrollToHashTarget(hash)
    }
    return
  }

  // Extract hash for post-navigation scrolling
  const hashIdx = fullHref.indexOf('#')
  const hash = hashIdx !== -1 ? fullHref.slice(hashIdx) : ''
  const scrollIntent = scroll ? beginAppRouterScrollIntent(hash || null) : null
  if (!scroll) {
    clearAppRouterScrollIntent()
  }

  // Trigger RSC re-fetch if available, and wait for the new content to render
  // before scrolling. This prevents the old page from visibly jumping to the
  // top before the new content paints.
  //
  // History is NOT pushed here for RSC navigations — the commit effect inside
  // navigateRsc owns the push/replace exclusively. This avoids a fragile
  // double-push and ensures window.location still reflects the *current* URL
  // when navigateRsc publishes the committed URL.
  const appNavigate = getNavigationRuntime()?.functions.navigate
  try {
    if (appNavigate) {
      await appNavigate(fullHref, 0, 'navigate', mode, undefined, programmaticTransition)
    } else {
      if (mode === 'replace') {
        replaceHistoryStateWithoutNotify(null, '', fullHref)
      } else {
        pushHistoryStateWithoutNotify(null, '', fullHref)
      }
      commitClientNavigationState()
    }
  } catch (error) {
    if (scrollIntent) {
      consumeAppRouterScrollIntent(scrollIntent)
    }
    throw error
  }

  if (scrollIntent) {
    const fallbackIntent = consumeAppRouterScrollIntent(scrollIntent)
    if (fallbackIntent) {
      applyAppRouterScrollFallback(fallbackIntent)
    }
  }
}

// ---------------------------------------------------------------------------
// App Router router singleton
//
// All methods close over module-level state (navigateClientSide, withBasePath, etc.)
// and carry no per-render data, so the object can be created once and reused.
// Text.js returns the same router reference on every call to useRouter(), which
// matters for components that rely on referential equality (e.g. useMemo /
// useEffect dependency arrays, memoized component bailouts).
// ---------------------------------------------------------------------------

/**
 * App Router public router instance. Mirrors Text.js's
 * `publicAppRouterInstance` from
 * `packages/text/src/client/components/app-router-instance.ts`.
 *
 * Exported so the App Router browser entry can install it on
 * `window.text.router` for Text.js parity (see `client/window-text.ts`).
 * Internal callers in this file continue to use `_appRouter` for brevity.
 */
const _appRouter = {
  bfcacheId: '0',
  push(href: string, options?: { scroll?: boolean }): void {
    assertSafeNavigationUrl(href)
    if (isServer) return
    startTransition(() => {
      void navigateClientSide(href, 'push', options?.scroll !== false, true)
    })
  },
  replace(href: string, options?: { scroll?: boolean }): void {
    assertSafeNavigationUrl(href)
    if (isServer) return
    startTransition(() => {
      void navigateClientSide(href, 'replace', options?.scroll !== false, true)
    })
  },
  back(): void {
    if (isServer) return
    window.history.back()
  },
  forward(): void {
    if (isServer) return
    window.history.forward()
  },
  refresh(): void {
    if (isServer) return
    // Drop cached RSC payloads for every previously-visited / prefetched route
    // before re-fetching. Text.js's refresh-reducer invalidates the entire
    // segment cache (refresh-reducer.ts → invalidateSegmentCacheEntries), so
    // without this, a stale cached payload for a sibling route (e.g. a page
    // gated by a session that has since been cleared) would still satisfy a
    // subsequent client navigation and bypass the server's redirect logic.
    getNavigationRuntime()?.functions.clearNavigationCaches?.()
    // Re-fetch the current page's RSC stream
    const rscNavigate = getNavigationRuntime()?.functions.navigate
    if (rscNavigate) {
      const navigate = () => {
        void rscNavigate(window.location.href, 0, 'refresh', undefined, undefined, true)
      }
      startTransition(navigate)
    }
  },
  prefetch(href: string, options?: PrefetchOptions): void {
    assertSafeNavigationUrl(href)
    if (isServer) return
    // Validate the URL is parseable. Mirrors Text.js's createPrefetchURL:
    // `packages/text/src/client/components/app-router-utils.ts` — when the URL
    // cannot be converted, Text.js throws so the call site (and its surrounding
    // error boundary, in the App Router) surfaces the failure. Without this
    // guard, text silently swallows unparseable hrefs and the test app's
    // error boundary never renders. basePath is applied before parsing to match
    // Text.js exactly: a non-empty basePath can make an otherwise broken-looking
    // href parseable (e.g. `new URL("/app///", origin)` succeeds while
    // `new URL("///", origin)` throws).
    try {
      new URL(withBasePath(href, __basePath), window.location.href)
    } catch {
      throw new Error(`Cannot prefetch '${href}' because it cannot be converted to a URL.`)
    }
    void (async () => {
      // Normalize same-origin absolute URLs to local paths; no-op for external
      // origins so we don't pollute the prefetch cache with a same-path .rsc on
      // the current origin. Mirrors Link's prefetchUrl and navigateClientSide.
      let prefetchHref = href
      if (isAbsoluteOrProtocolRelativeUrl(href)) {
        const localPath = toSameOriginAppPath(href, __basePath)
        if (localPath == null) return
        prefetchHref = localPath
      }

      // Prefetch the RSC payload for the target route and store in cache.
      // We must add to prefetchedUrls manually for deduplication.
      // prefetchRscResponse only manages the cache Map, not the URL set.
      const fullHref = toBrowserNavigationHref(prefetchHref, window.location.href, __basePath)
      const interceptionContext = getPrefetchInterceptionContext(fullHref)
      const mountedSlotsHeader = getMountedSlotsHeader()
      const headers = createRscRequestHeaders({ interceptionContext })
      if (mountedSlotsHeader) {
        headers.set(TEXT_MOUNTED_SLOTS_HEADER, mountedSlotsHeader)
      }
      const rscUrl = await createRscRequestUrl(fullHref, headers)
      const cacheKey = AppElementsWire.encodeCacheKey(rscUrl, interceptionContext)
      const prefetched = getPrefetchedUrls()
      if (prefetched.has(cacheKey)) {
        attachPrefetchInvalidationCallback(cacheKey, options?.onInvalidate)
        return
      }
      prefetched.add(cacheKey)
      prefetchRscResponse(
        rscUrl,
        fetch(rscUrl, {
          headers,
          credentials: 'include',
          priority: 'low' as RequestInit['priority'],
        }),
        interceptionContext,
        mountedSlotsHeader,
        options,
      )
    })().catch(error => {
      console.error('[text] RSC prefetch setup error:', error)
    })
  },
}

/**
 * Public App Router instance, exposed for the browser entry so it can wire
 * `window.text.router` to the same singleton returned from `useRouter()`.
 *
 * Mirrors `publicAppRouterInstance` from Text.js's
 * `packages/text/src/client/components/app-router-instance.ts` (line 392).
 */
export const appRouterInstance = _appRouter

/**
 * App Router's useRouter — returns push/replace/back/forward/refresh.
 * Different from Pages Router's useRouter (text/router).
 *
 * Returns a stable singleton: the same object reference on every call,
 * matching Text.js behavior so components using referential equality
 * (e.g. useMemo / useEffect deps, memoized children) don't re-render unnecessarily.
 */
export function useRouter() {
  if (!AppRouterContext) {
    throw new Error('invariant expected app router to be mounted')
  }
  const router = useTextCompatContext(AppRouterContext)
  if (router === null) {
    if (typeof window === 'undefined' && getNavigationContext()) {
      return appRouterInstance
    }
    throw new Error('invariant expected app router to be mounted')
  }
  return router
}

/**
 * Returns the active child segment one level below the layout where it's called.
 *
 * Returns the first segment from the route tree below this layout, including
 * route groups (e.g., "(marketing)") and resolved dynamic params. Returns null
 * if at the leaf (no child segments).
 *
 * @param parallelRoutesKey - Which parallel route to read (default: "children")
 */
export function useSelectedLayoutSegment(parallelRoutesKey?: string): string | null {
  const segments = useSelectedLayoutSegments(parallelRoutesKey)
  if (segments.length === 0) return null

  return parallelRoutesKey === undefined || parallelRoutesKey === 'children'
    ? segments[0]
    : segments[segments.length - 1]
}

/**
 * Returns all active segments below the layout where it's called.
 *
 * Each layout in the App Router tree wraps its children with a
 * LayoutSegmentProvider whose value is a map of parallel route key to
 * segment arrays. The "children" key is the default parallel route.
 *
 * @param parallelRoutesKey - Which parallel route to read (default: "children")
 */
export function useSelectedLayoutSegments(parallelRoutesKey?: string): string[] {
  return useChildSegments(parallelRoutesKey)
}

export { ReadonlyURLSearchParams }

/**
 * useServerInsertedHTML — inject HTML during SSR from client components.
 *
 * Used by CSS-in-JS libraries (styled-components, emotion, StyleX) to inject
 * <style> tags during SSR so styles appear in the initial HTML (no FOUC).
 *
 * The callback is called once after each SSR render pass. The returned JSX/HTML
 * is serialized and injected into the HTML stream.
 *
 * Usage (in a "use client" component wrapping children):
 *   useServerInsertedHTML(() => {
 *     const styles = sheet.getStyleElement();
 *     sheet.instance.clearTag();
 *     return <>{styles}</>;
 *   });
 */

export function useServerInsertedHTML(callback: () => unknown): void {
  _getInsertedHTMLCallbacks().push(callback)
}

/**
 * Flush all collected useServerInsertedHTML callbacks.
 * Returns an array of results (Rue elements or strings).
 * Clears the callback list so the text render starts fresh.
 *
 * Called by the SSR entry after renderToReadableStream completes.
 */
export function flushServerInsertedHTML(): unknown[] {
  const callbacks = _getInsertedHTMLCallbacks()
  const results: unknown[] = []
  for (const cb of callbacks) {
    try {
      const result = cb()
      if (result != null) results.push(result)
    } catch {
      // Ignore errors from individual callbacks
    }
  }
  callbacks.length = 0
  return results
}

/**
 * Render collected useServerInsertedHTML callbacks without unregistering them.
 *
 * Streaming SSR needs to invoke the same style-registry callbacks after each
 * Fizz flush. Libraries such as styled-components and Emotion clear their own
 * per-flush buffers inside the callback; the registration itself must survive
 * until the request stream is closed.
 */
export function renderServerInsertedHTML(): unknown[] {
  const callbacks = _getInsertedHTMLCallbacks()
  const results: unknown[] = []
  for (const cb of callbacks) {
    try {
      const result = cb()
      if (result != null) results.push(result)
    } catch {
      // Ignore errors from individual callbacks
    }
  }
  return results
}

/**
 * Clear all collected useServerInsertedHTML callbacks without flushing.
 * Used for cleanup between requests.
 */
export function clearServerInsertedHTML(): void {
  _clearInsertedHTMLCallbacks()
}

// ---------------------------------------------------------------------------
// Non-hook utilities (can be called from Server Components)
// ---------------------------------------------------------------------------

/**
 * HTTP Access Fallback error code — shared prefix for notFound/forbidden/unauthorized.
 * Matches Text.js 16's unified error handling approach.
 */
export const HTTP_ERROR_FALLBACK_ERROR_CODE = 'TEXT_HTTP_ERROR_FALLBACK'

/**
 * Check if an error is an HTTP Access Fallback error (notFound, forbidden, unauthorized).
 */
export function isHTTPAccessFallbackError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'digest' in error) {
    const digest = String((error as { digest: unknown }).digest)
    return (
      digest === 'TEXT_NOT_FOUND' || // legacy compat
      digest.startsWith(`${HTTP_ERROR_FALLBACK_ERROR_CODE};`)
    )
  }
  return false
}

/**
 * Extract the HTTP status code from an HTTP Access Fallback error.
 * Returns 404 for legacy TEXT_NOT_FOUND errors.
 */
export function getAccessFallbackHTTPStatus(error: unknown): number {
  if (error && typeof error === 'object' && 'digest' in error) {
    const digest = String((error as { digest: unknown }).digest)
    if (digest === 'TEXT_NOT_FOUND') return 404
    if (digest.startsWith(`${HTTP_ERROR_FALLBACK_ERROR_CODE};`)) {
      return parseInt(digest.split(';')[1], 10)
    }
  }
  return 404
}

/**
 * Enum matching Text.js RedirectType for type-safe redirect calls.
 */
export enum RedirectType {
  push = 'push',
  replace = 'replace',
}

/**
 * Internal error class used by redirect/notFound/forbidden/unauthorized.
 * The `digest` field is the serialised control-flow signal read by the
 * framework's error boundary and server-side request handlers.
 */
class TextNavigationError extends Error {
  readonly digest: string
  constructor(message: string, digest: string) {
    super(message)
    this.digest = digest
  }
}

/**
 * Throw a redirect. Caught by the framework to send a redirect response.
 *
 * When `type` is omitted, the digest carries an empty sentinel so the
 * catch site can resolve the default based on context:
 * - Server Action context → "push"  (Back button works after form submission)
 * - SSR render context    → "replace"
 *
 * This matches Text.js behavior where `redirect()` checks
 * `actionAsyncStorage.getStore()?.isAction` at call time.
 *
 * @see https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/redirect.ts
 */
export function redirect(url: string, type?: 'replace' | 'push' | RedirectType): never {
  throw new TextNavigationError(
    `TEXT_REDIRECT:${url}`,
    `TEXT_REDIRECT;${type ?? ''};${encodeURIComponent(url)}`,
  )
}

/**
 * Trigger a permanent redirect (308).
 *
 * Accepts an optional `type` parameter matching Text.js's signature.
 * Defaults to "replace" (not context-dependent like `redirect()`).
 *
 * @see https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/redirect.ts
 */
export function permanentRedirect(
  url: string,
  type: 'replace' | 'push' | RedirectType = 'replace',
): never {
  throw new TextNavigationError(
    `TEXT_REDIRECT:${url}`,
    `TEXT_REDIRECT;${type};${encodeURIComponent(url)};308`,
  )
}

/**
 * Trigger a not-found response (404). Caught by the framework.
 */
export function notFound(): never {
  throw new TextNavigationError('TEXT_NOT_FOUND', `${HTTP_ERROR_FALLBACK_ERROR_CODE};404`)
}

/**
 * Trigger a forbidden response (403). Caught by the framework.
 * In Text.js, this is gated behind experimental.authInterrupts — we
 * support it unconditionally for maximum compatibility.
 */
export function forbidden(): never {
  throw new TextNavigationError('TEXT_FORBIDDEN', `${HTTP_ERROR_FALLBACK_ERROR_CODE};403`)
}

/**
 * Trigger an unauthorized response (401). Caught by the framework.
 * In Text.js, this is gated behind experimental.authInterrupts — we
 * support it unconditionally for maximum compatibility.
 */
export function unauthorized(): never {
  throw new TextNavigationError('TEXT_UNAUTHORIZED', `${HTTP_ERROR_FALLBACK_ERROR_CODE};401`)
}

// ---------------------------------------------------------------------------
// Internal-error predicates and rethrow
//
// `unstable_rethrow` is part of Text.js's public API. User code in try/catch
// wrappers calls it to let Text.js's control-flow signals (redirect, notFound,
// forbidden, unauthorized, dynamic-server-usage, bailout-to-CSR, …)
// propagate up to the framework instead of being swallowed. The canonical
// use case is a `fetch()` retry helper that needs to bail out the moment
// fetch throws a framework signal — see Text.js's
// test/e2e/app-dir/app-static/lib/fetch-retry.js.
//
// Ported from Text.js:
//   - packages/text/src/client/components/unstable-rethrow.ts (dispatcher)
//   - packages/text/src/client/components/unstable-rethrow.browser.ts
//   - packages/text/src/client/components/unstable-rethrow.server.ts
//   - packages/text/src/client/components/is-text-router-error.ts
//   - packages/text/src/client/components/redirect-error.ts
//   - packages/text/src/shared/lib/lazy-dynamic/bailout-to-csr.ts
//   - packages/text/src/client/components/hooks-server-context.ts
//
// Coverage of Text.js's 7 server-side categories (server build):
//   ✓ isTextRouterError (#1) — redirect + HTTP access fallback
//   ✓ isBailoutToCSRError (#2) — digest === "BAILOUT_TO_CLIENT_SIDE_RENDERING"
//   ✓ isDynamicServerError (#3) — digest === "DYNAMIC_SERVER_USAGE"
//   ✗ isDynamicPostpone (#4) — PPR-internal message check; text has no PPR
//   ✗ isPostpone (#5) — compat postpone signal; text has no PPR
//   ✗ isHangingPromiseRejectionError (#6) — prerender abort signal
//   ✗ isPrerenderInterruptedError (#7) — prerender controller interrupt
//
// The four uncovered categories are server-only Text.js internals tied to
// prerender-machinery text does not implement; user code cannot construct
// them in normal use. They will be added if/when text grows PPR support.
// ---------------------------------------------------------------------------

type _RedirectErrorShape = Error & { digest: string }

/**
 * Check whether an error was produced by `redirect()` or `permanentRedirect()`.
 *
 * **Note on text public surface:** Text.js does NOT expose `isRedirectError`
 * from `text/navigation` — it's an internal predicate. text exposes it for
 * symmetry with the already-public `isHTTPAccessFallbackError` and because
 * `unstable_rethrow` consumers benefit from being able to narrow types.
 * Treat it as a text-only extension.
 *
 * **Divergence from Text.js:** Text.js's internal `isRedirectError` performs
 * full 4-segment validation — it splits the digest on `;`, checks `type` ∈
 * {push, replace}, requires a non-empty destination, and validates the
 * status code (303, 307, 308). See:
 *   https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/redirect-error.ts
 *
 * text instead uses a simple prefix check (`startsWith("TEXT_REDIRECT;")`).
 * Reasons:
 *   1. text emits two digest shapes — 3-part for `redirect()`
 *      (`TEXT_REDIRECT;{type};{encoded-url}`) and 4-part for
 *      `permanentRedirect()` (`TEXT_REDIRECT;{type};{encoded-url};308`).
 *      Strict validation would have to special-case both, and Text.js's
 *      validator (tuned to its 5-part canary digests) rejects them.
 *   2. The `type` field is sometimes empty in text's redirect digests
 *      (context-dependent resolution; see `redirect()` above), which the
 *      strict check disallows.
 *
 * **Consequence:** A malformed digest such as `"TEXT_REDIRECT;garbage"`
 * returns `true` here, whereas Text.js would return `false`. In practice,
 * the only callers of this predicate are text-internal code paths
 * (`unstable_rethrow`, `unstable_catchError`, the redirect error boundary)
 * that see digests text itself emits — so the divergence does not surface
 * in normal use. Maintainers extending the prefix logic should keep this
 * predicate in lockstep with the corresponding `decode*` helpers in
 * `shims/error-boundary.tsx`.
 */
export function isRedirectError(error: unknown): error is _RedirectErrorShape {
  if (
    !error ||
    typeof error !== 'object' ||
    !('digest' in error) ||
    typeof (error as { digest: unknown }).digest !== 'string'
  ) {
    return false
  }
  return (error as { digest: string }).digest.startsWith('TEXT_REDIRECT;')
}

/**
 * Returns true if the error is a Text.js navigation signal — either a redirect
 * or an HTTP access fallback (notFound / forbidden / unauthorized).
 *
 * **Note on text public surface:** Like `isRedirectError`, Text.js does NOT
 * expose this from `text/navigation`. text exposes it for symmetry — treat
 * it as a text-only extension.
 *
 * Ported from Text.js:
 *   https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/is-text-router-error.ts
 */
export function isTextRouterError(error: unknown): boolean {
  return isRedirectError(error) || isHTTPAccessFallbackError(error)
}

// ---------------------------------------------------------------------------
// BailoutToCSRError — `text/dynamic` with `ssr: false` throws this during
// server render to signal that the dynamic component must be rendered on
// the client. Lives in shared (non-server) code so it can flow through both
// the SSR pipeline and userland; third-party libraries that emulate
// `text/dynamic` also construct it.
//
// Ported from Text.js:
//   https://github.com/vercel/next.js/blob/canary/packages/text/src/shared/lib/lazy-dynamic/bailout-to-csr.ts
// ---------------------------------------------------------------------------

const _BAILOUT_TO_CSR_DIGEST = 'BAILOUT_TO_CLIENT_SIDE_RENDERING'

/**
 * Error thrown to bail out of server rendering and fall back to client-side
 * rendering. Used by `text/dynamic` with `ssr: false`.
 *
 * text does not yet emit this error itself — it's exposed so user code and
 * third-party libraries that mimic `text/dynamic`'s bailout semantics can
 * construct an error with the canonical digest that `unstable_rethrow`
 * recognises.
 *
 * Ported 1:1 from Text.js:
 *   https://github.com/vercel/next.js/blob/canary/packages/text/src/shared/lib/lazy-dynamic/bailout-to-csr.ts
 */
export class BailoutToCSRError extends Error {
  public readonly digest: typeof _BAILOUT_TO_CSR_DIGEST = _BAILOUT_TO_CSR_DIGEST
  public readonly reason: string

  constructor(reason: string) {
    super(`Bail out to client-side rendering: ${reason}`)
    this.reason = reason
  }
}

/**
 * Returns true if the error is a `BailoutToCSRError`. Matches Text.js's
 * digest-based predicate, so any error from a foreign module instance of
 * the class (or constructed manually with the canonical digest) is also
 * detected.
 *
 * **Note on text public surface:** Text.js does NOT expose this from
 * `text/navigation`. text exposes it for symmetry with `isRedirectError`
 * — treat it as a text-only extension. The matching producer
 * (`BailoutToCSRError`) is the public detection contract; Text.js exposes
 * neither.
 *
 * Ported from Text.js:
 *   https://github.com/vercel/next.js/blob/canary/packages/text/src/shared/lib/lazy-dynamic/bailout-to-csr.ts
 */
export function isBailoutToCSRError(error: unknown): error is BailoutToCSRError {
  if (!error || typeof error !== 'object' || !('digest' in error)) {
    return false
  }
  return (error as { digest: unknown }).digest === _BAILOUT_TO_CSR_DIGEST
}

// ---------------------------------------------------------------------------
// DynamicServerError — thrown by Text.js's internal `cookies()`/`headers()`
// shims when called inside a static render context that cannot resolve
// request-scoped data. text's own `text/headers` shim has its own throw
// semantics, so text never constructs this error itself, but third-party
// code or accidentally-bundled Text.js internals can.
//
// Ported from Text.js:
//   https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/hooks-server-context.ts
// ---------------------------------------------------------------------------

const _DYNAMIC_SERVER_USAGE_DIGEST = 'DYNAMIC_SERVER_USAGE'

/**
 * Error thrown when dynamic server APIs (`cookies()`, `headers()`, etc.) are
 * used inside a static/prerender context. Carries the `DYNAMIC_SERVER_USAGE`
 * digest so `unstable_rethrow` can recognise and propagate it.
 *
 * text does not construct this error itself — exposed for the same
 * "stable detection contract" reason as `BailoutToCSRError` above.
 *
 * Ported 1:1 from Text.js:
 *   https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/hooks-server-context.ts
 */
export class DynamicServerError extends Error {
  public readonly digest: typeof _DYNAMIC_SERVER_USAGE_DIGEST = _DYNAMIC_SERVER_USAGE_DIGEST
  public readonly description: string

  constructor(description: string) {
    super(`Dynamic server usage: ${description}`)
    this.description = description
  }
}

/**
 * Returns true if the error is a `DynamicServerError` (or any error with the
 * canonical `DYNAMIC_SERVER_USAGE` digest).
 *
 * **Note on text public surface:** Text.js does NOT expose this from
 * `text/navigation`. text exposes it for symmetry — treat it as a
 * text-only extension.
 *
 * Ported from Text.js:
 *   https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/hooks-server-context.ts
 */
export function isDynamicServerError(error: unknown): error is DynamicServerError {
  if (!error || typeof error !== 'object' || !('digest' in error)) {
    return false
  }
  // `===` against a string literal already requires the operand to be a
  // string, so no separate `typeof digest === "string"` check is needed.
  // Matches `isBailoutToCSRError` above for stylistic consistency.
  return (error as { digest: unknown }).digest === _DYNAMIC_SERVER_USAGE_DIGEST
}

/**
 * Rethrow internal Text.js errors so they're handled by the framework.
 *
 * When wrapping an API that uses errors for control flow (redirect, notFound,
 * cookies in static render, `text/dynamic` SSR bailout, etc.), call this
 * inside `catch` blocks before doing your own error handling. If the error
 * is a Text.js internal error, it's rethrown; otherwise this is a no-op
 * (apart from recursing through `error.cause`).
 *
 * Recognises (matches Text.js's browser build + the subset of the server
 * build that text can realistically encounter):
 *   - `isTextRouterError`: redirect / notFound / forbidden / unauthorized
 *   - `isBailoutToCSRError`: `text/dynamic` `ssr: false` bailout
 *   - `isDynamicServerError`: dynamic API used in static render
 *
 * text does not yet recognise four additional server-only Text.js
 * categories — `isDynamicPostpone`, `isPostpone`,
 * `isHangingPromiseRejectionError`, `isPrerenderInterruptedError` — because
 * they signal PPR / prerender-controller events that text's render
 * pipeline does not generate. User code cannot construct these in normal
 * use; they will be added if/when text grows PPR support.
 *
 * Ported from Text.js:
 *   https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/unstable-rethrow.ts
 *   https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/unstable-rethrow.server.ts
 *   https://github.com/vercel/next.js/blob/canary/packages/text/src/client/components/unstable-rethrow.browser.ts
 */
export function unstable_rethrow(error: unknown): void {
  if (isTextRouterError(error) || isBailoutToCSRError(error) || isDynamicServerError(error)) {
    throw error
  }

  if (error instanceof Error && 'cause' in error) {
    unstable_rethrow((error as Error & { cause: unknown }).cause)
  }
}

// ---------------------------------------------------------------------------
// Unrecognized server-action errors
//
// `UnrecognizedActionError` / `unstable_isUnrecognizedActionError` live in a
// dedicated zero-dependency module so this `text/navigation` shim and text's
// client server-action dispatcher (`server/server-action-not-found.ts`) share
// one class. `instanceof` is identity-based per module instance, so the
// dispatcher and user code must resolve the same class for the predicate to
// work. Re-exported here to keep the public `text/navigation` surface intact.
// ---------------------------------------------------------------------------

export {
  UnrecognizedActionError,
  unstable_isUnrecognizedActionError,
} from './unrecognized-action-error.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Listen for popstate on the client
if (!isServer) {
  const state = getClientNavigationState()
  if (state && !state.patchInstalled) {
    state.patchInstalled = true

    // Listen for popstate on the client.
    // Note: This handler runs for Pages Router only (when App Router navigation
    // runtime is not available). It restores scroll position with microtask-based deferral.
    // App Router scroll restoration is handled in server/app-browser-entry.ts:697
    // with RSC navigation coordination (waits for pending navigation to settle).
    window.addEventListener('popstate', event => {
      if (!hasAppNavigationRuntime()) {
        commitClientNavigationState()
        restoreScrollPosition(event.state)
      }
    })

    window.history.pushState = function patchedPushState(
      data: unknown,
      unused: string,
      url?: string | URL | null,
    ): void {
      state.originalPushState.call(
        window.history,
        createExternalHistoryStatePreservingMetadata(data, window.history.state),
        unused,
        url,
      )
      if (state.suppressUrlNotifyCount === 0) {
        commitClientNavigationState()
      }
    }

    window.history.replaceState = function patchedReplaceState(
      data: unknown,
      unused: string,
      url?: string | URL | null,
    ): void {
      state.originalReplaceState.call(
        window.history,
        createExternalHistoryStatePreservingMetadata(data, window.history.state),
        unused,
        url,
      )
      if (state.suppressUrlNotifyCount === 0) {
        commitClientNavigationState()
      }
    }
  }
}
