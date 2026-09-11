/*
异步组件 Hook 概述
- 使用动机：以最小成本接入动态导入与按需加载，同时保证渲染锚点的稳定与错误兜底。
- 缓存策略：以 loader 函数为 key 建立 WeakMap 缓存，避免重复请求与状态重建。
- 状态管理：signal 存储目标组件与错误；watchEffect 驱动容器内固定锚点前的渲染更新。
- 占位渲染：提供可覆盖的 Loading 与 Error 组件，满足不同产品形态的占位需求。
 * - 固定渲染：使用 vapor + renderAnchor，内部通过 display: contents 容器承载稳定锚点，既能正确卸载，又不额外产生布局盒。
*/
import type { FC } from '../runtime-types'
import { appendChild, createComment, createElement } from '../compiler-runtime/dom.browser'
import { signal, untrack } from '../reactivity'
import { _$createComponent } from '../compiled-component-call'
import { _$withCompiledPropsUpdater } from '../compiled-component'
import { _$compiledRoot } from '../compiled-root'
import { effect, onEffectCleanup, onOwnerCleanup } from '../internal-reactive'
import {
  getCurrentSuspenseBoundary,
  RUE_SUSPENSE_BOUNDARY_KEY,
  type SuspenseBoundary,
} from '../components/suspenseContext'

const asyncComponentCache = new WeakMap<Function, any>()
const SERVER_RENDERING_FLAG = '__rue_is_server_rendering__'
const RUE_SSR_PENDING_ASYNC_COMPONENT_KEY = '__rue_ssr_pending_async_component__'

/** 异步组件加载函数，支持直接返回组件或动态 import 的 default 导出。 */
export type AsyncComponentLoader<P = any> = () => Promise<{ default: FC<P> } | FC<P>>

type HydrationElementIterator = (cb: (el: Element) => void | false) => void

/** 异步组件懒水合策略。调用 hydrate 后，Rue 才会激活客户端异步组件。 */
export type HydrationStrategy = (
  hydrate: () => void | Promise<unknown> | null | undefined,
  forEachElement: HydrationElementIterator,
) => (() => void) | void

/** 创建懒水合策略的工厂函数类型。 */
export type HydrationStrategyFactory<T = void> = (options?: T) => HydrationStrategy

/** 定义异步组件时的完整选项。 */
export interface AsyncComponentOptions<P = any> {
  /** 实际的动态加载函数。 */
  loader: AsyncComponentLoader<P>
  /** 加载中占位组件。 */
  loadingComponent?: FC<any>
  /** 加载失败占位组件。 */
  errorComponent?: FC<{ error: any }>
  /** 显示 loadingComponent 前的延迟毫秒数。 */
  delay?: number
  /** 加载超时时间，超时后进入错误状态。 */
  timeout?: number
  /** 是否把 pending promise 登记到 Suspense 边界。 */
  suspensible?: boolean
  /** 加载失败处理器，可调用 retry 或 fail 控制后续流程。 */
  onError?: (error: Error, retry: () => void, fail: () => void, attempts: number) => any
  /** 客户端懒水合策略；服务端渲染时仍会立即加载组件。 */
  hydrate?: HydrationStrategy
}

/** useComponent 的兼容选项，支持新旧 loading/error 命名。 */
export interface UseComponentOptions<_P = any> {
  /** @deprecated Prefer loadingComponent. */
  loading?: FC<any>
  /** @deprecated Prefer errorComponent. */
  error?: FC<{ error: any }>
  /** 加载中占位组件。 */
  loadingComponent?: FC<any>
  /** 加载失败占位组件。 */
  errorComponent?: FC<{ error: any }>
  /** 显示 loadingComponent 前的延迟毫秒数。 */
  delay?: number
  /** 加载超时时间，超时后进入错误状态。 */
  timeout?: number
  /** 是否把 pending promise 登记到 Suspense 边界。 */
  suspensible?: boolean
  /** 加载失败处理器，可调用 retry 或 fail 控制后续流程。 */
  onError?: (error: Error, retry: () => void, fail: () => void, attempts: number) => any
  /** 客户端懒水合策略；服务端渲染时仍会立即加载组件。 */
  hydrate?: HydrationStrategy
}

const requestIdle: Window['requestIdleCallback'] =
  (globalThis as any).requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(cb, 1) as any)

const cancelIdle: Window['cancelIdleCallback'] =
  (globalThis as any).cancelIdleCallback ?? ((id: number) => clearTimeout(id))

const isDomElement = (value: unknown): value is Element =>
  !!value && typeof value === 'object' && (value as any).nodeType === 1

const getElementWindow = (el: Element): (Window & typeof globalThis) | undefined =>
  el.ownerDocument?.defaultView ?? (typeof window !== 'undefined' ? window : undefined)

type HydrationRect = {
  top: number
  left: number
  bottom: number
  right: number
  width: number
  height: number
}

const getRectSize = (rect: HydrationRect) => ({
  width: rect.width,
  height: rect.height,
})

const parseRootMarginValue = (value: string, rootWidth: number) => {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) {
    return 0
  }

  return value.endsWith('%') ? (parsed / 100) * rootWidth : parsed
}

const parseRootMargin = (rootMargin: string | undefined, rootWidth: number) => {
  const tokens = (rootMargin || '0px').trim().split(/\s+/).filter(Boolean)
  const [top = '0px', right = top, bottom = top, left = right] = tokens

  return {
    top: parseRootMarginValue(top, rootWidth),
    right: parseRootMarginValue(right, rootWidth),
    bottom: parseRootMarginValue(bottom, rootWidth),
    left: parseRootMarginValue(left, rootWidth),
  }
}

const elementIsVisibleInViewport = (el: Element, options?: IntersectionObserverInit) => {
  if (typeof el.getBoundingClientRect !== 'function') {
    return false
  }

  const win = getElementWindow(el)
  if (!win) {
    return false
  }

  const targetRect = el.getBoundingClientRect()
  const { width: targetWidth, height: targetHeight } = getRectSize(targetRect)
  if (targetWidth <= 0 || targetHeight <= 0) {
    return false
  }

  const root = options?.root
  const rootRect: HydrationRect = isDomElement(root)
    ? root.getBoundingClientRect()
    : {
        top: 0,
        left: 0,
        bottom: win.innerHeight,
        right: win.innerWidth,
        width: win.innerWidth,
        height: win.innerHeight,
      }
  const { width: rootWidth } = getRectSize(rootRect)
  const margin = parseRootMargin(options?.rootMargin, rootWidth)

  return (
    targetRect.top < rootRect.bottom + margin.bottom &&
    targetRect.bottom > rootRect.top - margin.top &&
    targetRect.left < rootRect.right + margin.right &&
    targetRect.right > rootRect.left - margin.left
  )
}

/** 在浏览器空闲时触发水合，默认最多等待 10 秒。 */
export const hydrateOnIdle =
  (timeout = 10000): HydrationStrategy =>
  hydrate => {
    const id = requestIdle(
      () => {
        hydrate()
      },
      { timeout },
    )

    return () => {
      cancelIdle(id)
    }
  }

/** 当异步组件根元素进入视口时触发水合。 */
export const hydrateOnVisible = (options?: IntersectionObserverInit): HydrationStrategy => {
  return (hydrate, forEachElement) => {
    const Observer =
      (typeof window !== 'undefined' ? window.IntersectionObserver : undefined) ??
      (globalThis as any).IntersectionObserver

    if (typeof Observer !== 'function') {
      hydrate()
      return
    }

    let hydrated = false
    let active = true
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    const observedElements = new Set<Element>()
    const fallbackWindows = new Set<Window & typeof globalThis>()

    const observeCurrentElements = () => {
      if (!active || hydrated) {
        return false
      }

      let found = false
      forEachElement(el => {
        if (!isDomElement(el)) {
          return
        }

        found = true
        const win = getElementWindow(el)
        if (win && !fallbackWindows.has(win)) {
          fallbackWindows.add(win)
          win.addEventListener('scroll', observeCurrentElements, {
            capture: true,
            passive: true,
          })
          win.addEventListener('resize', observeCurrentElements)
        }

        if (elementIsVisibleInViewport(el, options)) {
          triggerHydrate()
          return false
        }

        if (!observedElements.has(el)) {
          observedElements.add(el)
          observer.observe(el)
        }
        return undefined
      })

      return found
    }

    const cleanup = () => {
      active = false
      if (retryTimer) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
      observer.disconnect()
      fallbackWindows.forEach(win => {
        win.removeEventListener('scroll', observeCurrentElements, { capture: true } as any)
        win.removeEventListener('resize', observeCurrentElements)
      })
      fallbackWindows.clear()
      observedElements.clear()
    }

    const triggerHydrate = () => {
      if (!active || hydrated) {
        return
      }

      hydrated = true
      cleanup()
      hydrate()
    }

    const observer = new Observer((entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue
        }
        triggerHydrate()
        break
      }
    }, options)

    if (!observeCurrentElements()) {
      queueMicrotask(() => {
        observeCurrentElements()
      })
      retryTimer = setTimeout(() => {
        retryTimer = null
        if (!observeCurrentElements() && observedElements.size === 0) {
          triggerHydrate()
        }
      }, 0)
    }

    return cleanup
  }
}

/** 当指定 media query 命中时触发水合。 */
export const hydrateOnMediaQuery =
  (query: string): HydrationStrategy =>
  hydrate => {
    const matchMedia =
      (typeof window !== 'undefined' ? window.matchMedia : undefined) ??
      (globalThis as any).matchMedia

    if (typeof matchMedia !== 'function' || !query) {
      hydrate()
      return
    }

    const mediaQueryList = matchMedia.call(
      typeof window !== 'undefined' ? window : globalThis,
      query,
    ) as MediaQueryList

    if (mediaQueryList.matches) {
      hydrate()
      return
    }

    let cleanup = () => {}
    const onChange = () => {
      if (!mediaQueryList.matches) {
        return
      }
      cleanup()
      hydrate()
    }

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', onChange)
      cleanup = () => {
        mediaQueryList.removeEventListener('change', onChange)
      }
    } else {
      mediaQueryList.addListener(onChange)
      cleanup = () => {
        mediaQueryList.removeListener(onChange)
      }
    }

    return cleanup
  }

const cloneEventForReplay = (event: Event) => {
  const init = {
    bubbles: event.bubbles,
    cancelable: event.cancelable,
    composed: event.composed,
  }

  try {
    return new (event as any).constructor(event.type, event)
  } catch {
    return new Event(event.type, init)
  }
}

/** 当用户触发指定事件时水合，并在水合完成后重放这次事件。 */
export const hydrateOnInteraction = (
  interactions: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> = [],
): HydrationStrategy => {
  return (hydrate, forEachElement) => {
    const eventNames = Array.isArray(interactions) ? interactions : [interactions]
    if (eventNames.length === 0) {
      return
    }

    let hydrated = false
    let cleanup = () => {}
    const onInteraction = (event: Event) => {
      if (hydrated) {
        return
      }
      hydrated = true
      cleanup()
      Promise.resolve(hydrate()).finally(() => {
        const target = event.target
        if (target && typeof target.dispatchEvent === 'function') {
          target.dispatchEvent(cloneEventForReplay(event))
        }
      })
    }

    cleanup = () => {
      forEachElement(el => {
        for (const eventName of eventNames) {
          el.removeEventListener(eventName, onInteraction)
        }
      })
    }

    forEachElement(el => {
      for (const eventName of eventNames) {
        el.addEventListener(eventName, onInteraction, { once: true })
      }
    })

    return cleanup
  }
}

const isAsyncComponentOptions = <P = any>(
  value: AsyncComponentLoader<P> | AsyncComponentOptions<P>,
): value is AsyncComponentOptions<P> =>
  typeof value === 'object' && value !== null && 'loader' in value

const normalizeUseComponentSource = <P = any>(
  source: AsyncComponentLoader<P> | AsyncComponentOptions<P>,
  opts?: UseComponentOptions<P>,
) => {
  const resolvedLoader = isAsyncComponentOptions(source) ? source.loader : source
  const resolvedOptions = (isAsyncComponentOptions(source) ? source : opts) as
    | (AsyncComponentOptions<P> & UseComponentOptions<P>)
    | undefined
  const hasLoadingAlias = !!resolvedOptions?.loading

  return {
    loader: resolvedLoader,
    loading: resolvedOptions?.loadingComponent ?? resolvedOptions?.loading,
    error: resolvedOptions?.errorComponent ?? resolvedOptions?.error,
    hasCustomLoading: !!(resolvedOptions?.loadingComponent ?? resolvedOptions?.loading),
    delay:
      resolvedOptions?.delay ?? (resolvedOptions?.loadingComponent && !hasLoadingAlias ? 200 : 0),
    timeout: resolvedOptions?.timeout ?? Number.POSITIVE_INFINITY,
    suspensible: resolvedOptions?.suspensible !== false,
    onError: resolvedOptions?.onError,
    hydrate: resolvedOptions?.hydrate,
  }
}

const registerServerPendingDependency = (thenable: Promise<unknown> | null | undefined) => {
  if (!thenable) {
    return
  }

  const globalRecord = globalThis as Record<string, unknown>
  const serverRenderingCount = globalRecord[SERVER_RENDERING_FLAG]
  if (typeof serverRenderingCount !== 'number' || serverRenderingCount <= 0) {
    return
  }

  const pending = (globalRecord[RUE_SSR_PENDING_ASYNC_COMPONENT_KEY] ??= []) as Promise<unknown>[]
  pending.push(Promise.resolve(thenable).catch(() => undefined))
}

const isServerRendering = () => {
  const serverRenderingCount = (globalThis as Record<string, unknown>)[SERVER_RENDERING_FLAG]
  return typeof serverRenderingCount === 'number' && serverRenderingCount > 0
}

const collectChildNodes = (node: any): unknown[] => {
  if (!node) {
    return []
  }
  if (node.childNodes && typeof node.childNodes.length === 'number') {
    return Array.from(node.childNodes)
  }
  if (node.children && typeof node.children.length === 'number') {
    return Array.from(node.children)
  }
  if (Array.isArray(node.children)) {
    return node.children
  }
  return []
}

const forEachHydrationElement = (
  ctx: { container: unknown; anchorEl: unknown },
  cb: (el: Element) => void | false,
) => {
  let visited = false
  const visit = (node: unknown): void | false => {
    if (node === ctx.anchorEl) {
      return
    }
    if (isDomElement(node)) {
      visited = true
      return cb(node)
    }
    for (const child of collectChildNodes(node)) {
      if (visit(child) === false) {
        return false
      }
    }
  }

  for (const child of collectChildNodes(ctx.container)) {
    if (visit(child) === false) {
      return
    }
  }

  if (!visited && isDomElement(ctx.container)) {
    cb(ctx.container)
  }
}

const clearHydrationStrategyCleanups = (slot: any) => {
  const cleanups = slot?.hydrationCleanups as Set<() => void> | undefined
  if (!cleanups?.size) {
    return
  }

  for (const cleanup of Array.from(cleanups)) {
    cleanup()
  }
  cleanups.clear()
}

/** 异步组件加载 Hook
 * @param loader 返回组件或 { default } 的动态导入函数
 * @param opts 可选占位组件：loading / error
 * @returns 异步组件 FC
 */
export function useComponent<P = any>(
  source: AsyncComponentLoader<P> | AsyncComponentOptions<P>,
  opts?: UseComponentOptions<P>,
): FC<P> {
  const normalized = normalizeUseComponentSource(source, opts)
  const { loader, loading: loadingComponent, error: errorComponent } = normalized

  return (props: any) => {
    const handleError = (error: unknown) =>
      queueMicrotask(() => {
        throw error
      })
    let slot = asyncComponentCache.get(loader as any)
    if (!slot) {
      // 初始化状态槽位：目标组件与错误各自为独立信号
      const component = signal<FC<P> | null>(null)
      const err = signal<any>(null)
      const loadingVisible = signal<boolean>(false)
      const setComponentState = (next: FC<P> | null) => {
        if (component.get() !== next) {
          component.set(next)
        }
      }
      const setErrorState = (next: any) => {
        if (err.get() !== next) {
          err.set(next)
        }
      }
      const setLoadingState = (next: boolean) => {
        if (loadingVisible.get() !== next) {
          loadingVisible.set(next)
        }
      }
      /** 启动加载流程 */
      const start = () => {
        let pending: Promise<unknown>
        const nextAttempt = ((slot as any)?.attempts ?? 0) + 1
        const loadId = ((slot as any)?.requestId ?? 0) + 1

        ;(slot as any).attempts = nextAttempt
        ;(slot as any).requestId = loadId
        setComponentState(null)
        setErrorState(null)
        setLoadingState(!!(slot as any).hasCustomLoading && (slot as any).delay <= 0)

        if ((slot as any).delayTimer) {
          clearTimeout((slot as any).delayTimer)
          ;(slot as any).delayTimer = null
        }
        if ((slot as any).timeoutTimer) {
          clearTimeout((slot as any).timeoutTimer)
          ;(slot as any).timeoutTimer = null
        }

        const clearPendingState = () => {
          if ((slot as any).delayTimer) {
            clearTimeout((slot as any).delayTimer)
            ;(slot as any).delayTimer = null
          }
          if ((slot as any).timeoutTimer) {
            clearTimeout((slot as any).timeoutTimer)
            ;(slot as any).timeoutTimer = null
          }
          if ((slot as any).promise === pending) {
            ;(slot as any).promise = null
          }
        }

        const finalizeError = (loadError: any) => {
          if ((slot as any).requestId !== loadId) {
            return
          }

          ;(slot as any).requestId = loadId + 1
          clearPendingState()
          setErrorState(loadError)
          const activeContexts = (slot as any).activeContexts as Set<object> | undefined
          if (activeContexts?.size) {
            handleError(loadError)
          } else {
            ;(slot as any).started = false
          }
        }

        const handleLoadError = (loadError: any) => {
          if ((slot as any).requestId !== loadId) {
            return
          }

          const onError = (slot as any).onError as UseComponentOptions<P>['onError']
          if (!onError) {
            finalizeError(loadError)
            return
          }

          let settled = false
          const retry = () => {
            if (settled || (slot as any).requestId !== loadId) {
              return
            }
            settled = true
            clearPendingState()
            start()
          }
          const fail = () => {
            if (settled) {
              return
            }
            settled = true
            finalizeError(loadError)
          }

          try {
            onError(loadError as Error, retry, fail, (slot as any).attempts)
          } catch (handlerError: any) {
            finalizeError(handlerError)
            return
          }

          if (!settled) {
            fail()
          }
        }

        try {
          if ((slot as any).hasCustomLoading && (slot as any).delay > 0) {
            ;(slot as any).delayTimer = setTimeout(
              () => {
                if ((slot as any).requestId === loadId && !component.get() && !err.get()) {
                  setLoadingState(true)
                }
              },
              (slot as any).delay,
            )
          }

          // 执行动态导入：兼容两种返回格式（模块对象或组件函数）
          pending = loader()
            .then((m: any) => {
              if ((slot as any).requestId !== loadId) {
                return
              }
              setComponentState(
                m && (m as any).default ? ((m as any).default as FC<P>) : (m as FC<P>),
              )
              setErrorState(null)
            })
            .catch((e: any) => {
              handleLoadError(e)
            })
            .finally(() => {
              if ((slot as any).requestId === loadId) {
                clearPendingState()
              }
            })

          if (Number.isFinite((slot as any).timeout) && (slot as any).timeout >= 0) {
            ;(slot as any).timeoutTimer = setTimeout(
              () => {
                handleLoadError(
                  new Error(`Async component timed out after ${(slot as any).timeout}ms.`),
                )
              },
              (slot as any).timeout,
            )
          }
          registerServerPendingDependency(pending)
        } catch (e: any) {
          // 同步错误（如 loader 内部抛错）
          handleLoadError(e)
          pending = Promise.resolve()
        }
        ;(slot as any).promise = pending
        return pending
      }

      /** 加载占位组件 */
      const Loading: FC<any> = loadingComponent ?? (() => null)

      /** 错误占位组件 */
      const ErrorComp: FC<any> =
        errorComponent ??
        ((p: any) => {
          // 提取错误消息：优先 message 字段；其次字符串化；兜底 'Error'
          const err = p && p.error
          const msg = err && err.message ? err.message : typeof err === 'string' ? err : 'Error'
          return msg
        })
      // 缓存槽位，避免重复初始化
      slot = {
        component,
        err,
        start,
        Loading,
        ErrorComp,
        loadingVisible,
        hasCustomLoading: normalized.hasCustomLoading,
        delay: normalized.delay,
        timeout: normalized.timeout,
        suspensible: normalized.suspensible,
        onError: normalized.onError,
        hydrate: normalized.hydrate,
        hydrationCleanups: new Set<() => void>(),
        promise: null as Promise<unknown> | null,
        delayTimer: null as ReturnType<typeof setTimeout> | null,
        timeoutTimer: null as ReturnType<typeof setTimeout> | null,
        requestId: 0,
        attempts: 0,
        started: false,
        activeContexts: new Set<object>(),
      }
      asyncComponentCache.set(loader as any, slot)
    }

    const {
      component,
      err,
      start,
      Loading,
      ErrorComp,
      hasCustomLoading,
      suspensible,
      loadingVisible,
    } = slot as any

    const startOnce = () => {
      if ((slot as any).started) {
        return (slot as any).promise as Promise<unknown> | null
      }

      ;(slot as any).started = true
      clearHydrationStrategyCleanups(slot)
      return start()
    }

    const shouldStartImmediately = !(slot as any).hydrate || isServerRendering()
    if (shouldStartImmediately) {
      startOnce()
    }

    if (isServerRendering()) {
      const e = err.get()
      if (e) {
        return _$createComponent(ErrorComp as any, { error: e })
      }

      const comp = component.get()
      if (comp) {
        return _$createComponent(comp as any, props)
      }

      registerServerPendingDependency((slot as any).promise)
      if (hasCustomLoading && loadingVisible.get()) {
        return _$createComponent(Loading as any, {})
      }
      const pending = (slot as any).promise as Promise<unknown> | null
      if (pending) {
        return pending.then(() => {
          const loadError = err.get()
          if (loadError) return _$createComponent(ErrorComp as any, { error: loadError })
          const loaded = component.get()
          return loaded ? _$createComponent(loaded as any, props) : null
        }) as unknown as ReturnType<FC<P>>
      }
      return null
    }

    const propsSignal = signal<any>(props)
    const mountKey = {}
    const root = _$compiledRoot(parent => {
      if (parent == null) throw new Error('[rue] async component requires a mount parent')
      const container = createElement('div') as HTMLElement
      container.style.display = 'contents'
      const anchor = createComment('rue-async-component-anchor')
      appendChild(container, anchor)
      appendChild(parent as any, container)
      const activeContexts = ((slot as any).activeContexts ??= new Set<object>()) as Set<object>
      const context = { parent: container, anchor }
      activeContexts.add(context)
      let hydrationCleanup: (() => void) | undefined

      const findSuspenseBoundary = (): SuspenseBoundary | null => {
        let node: any = container
        while (node) {
          const boundary = node[RUE_SUSPENSE_BOUNDARY_KEY] as SuspenseBoundary | undefined
          if (boundary) return boundary
          node = node.parentNode
        }
        return null
      }

      const registerSuspenseDependency = (thenable: Promise<unknown>) => {
        if ((slot as any).promise !== thenable || component.get() || err.get()) return
        registerServerPendingDependency(thenable)
        ;(getCurrentSuspenseBoundary() ?? findSuspenseBoundary())?.register(thenable)
      }

      if (!shouldStartImmediately) {
        const strategy = (slot as any).hydrate as HydrationStrategy | undefined
        if (strategy && !(slot as any).started && !component.get() && !err.get()) {
          try {
            const cleanup = strategy(startOnce, cb =>
              forEachHydrationElement({ container, anchorEl: anchor }, cb),
            )
            if (typeof cleanup === 'function') {
              hydrationCleanup = cleanup
              ;((slot as any).hydrationCleanups as Set<() => void>).add(cleanup)
            }
          } catch (error: any) {
            handleError(error)
            startOnce()
          }
        }
      }

      let mounted: ReturnType<typeof _$createComponent> | undefined
      effect(() => {
        const curProps = propsSignal.get()
        const currentError = err.get()
        const currentComponent = component.get()
        const showLoading =
          hasCustomLoading &&
          (((slot as any).hydrate && !(slot as any).started) || loadingVisible.get())
        const pending = (slot as any).promise as Promise<unknown> | null
        if (!currentError && !currentComponent && pending && suspensible) {
          registerSuspenseDependency(pending)
        }

        mounted?.dispose()
        mounted = undefined
        if (currentError) mounted = _$createComponent(ErrorComp as any, { error: currentError })
        else if (currentComponent) {
          mounted = _$createComponent(currentComponent as any, { ...curProps, key: mountKey })
        } else if (showLoading) mounted = _$createComponent(Loading as any, {})
        if (!mounted) return

        const handle = mounted
        untrack(() => {
          const staging = document.createDocumentFragment()
          const result = handle.__rue_compiled_mount(staging)
          if (result != null && result.parentNode !== staging) staging.appendChild(result)
          container.insertBefore(staging, anchor as any)
        })
        onEffectCleanup(() => {
          if (mounted === handle) mounted = undefined
          handle.dispose()
        })
      })

      onOwnerCleanup(() => {
        mounted?.dispose()
        mounted = undefined
        activeContexts.delete(context)
        if (activeContexts.size === 0 && err.get()) {
          ;(slot as any).started = false
        }
        if (hydrationCleanup) {
          ;((slot as any).hydrationCleanups as Set<() => void>).delete(hydrationCleanup)
          hydrationCleanup()
        }
      })
      return [container, container]
    })

    return _$withCompiledPropsUpdater(root, nextProps => propsSignal.set(nextProps))
  }
}
