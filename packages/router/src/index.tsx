import type { CompiledSignalHandle as SignalHandle } from '@rue-js/rue/internal/reactive'
import { onOwnerCleanup, untrack } from '@rue-js/rue/internal/reactive'
import { getCurrentAppTarget } from '@rue-js/rue/internal/app'
/**
 * Rue Router 入口模块。
 *
 * 模块按「历史实现 -> 路由编译/匹配 -> 导航解析 -> 组件渲染」组织：
 * - HistoryLike 屏蔽 hash/history 等环境差异，统一提供 location、push、replace 和 listen。
 * - createRouter 将静态路由表编译为正则分支，负责命名路由、redirect、守卫和失败类型。
 * - install/attachRouter 把 Router 绑定到当前容器，同时维护一个进程级活动 Router。
 * - RouterView 依据 matched 链和嵌套深度渲染组件，RouterLink 则提供声明式导航入口。
 */
import { type FC, createContext, signal, onUnmounted, useContext } from '@rue-js/rue'
import { _$compiledComponent, type CompiledComponentFactory } from '@rue-js/rue/internal/component'
import { _$compiledRoot, _$mountCompiledSlotFactory } from '@rue-js/rue/internal/block'
import { _$keepAlive } from '@rue-js/rue/internal/keepalive'
import { provideContext } from '@rue-js/rue/internal/app'
import type { BlockFactory } from '@rue-js/rue/internal/block'
import {
  bindRoutePrefetchTrigger,
  shouldPrefetchRouteForEvent,
  type RoutePrefetchStrategy,
} from './prefetch'
import {
  dispatchAfterNavigation,
  dispatchBeforeNavigation,
  scheduleNavigationPageLoad,
  shouldManageNavigationFocus,
  type NavigationLifecycleType,
} from './navigation-lifecycle'
import { createRouterScrollManager, type RouterScrollBehavior } from './scroll'
import {
  createRouterViewTransitionRunner,
  type RouterViewTransitionsConfig,
} from './view-transitions'

export type { RoutePrefetchStrategy } from './prefetch'
export type { NavigationLifecycleDetail, NavigationLifecycleType } from './navigation-lifecycle'
export type { RouterScrollBehavior, RouterScrollPosition, RouterScrollResult } from './scroll'
export type { RouterViewTransitionsConfig, RouterViewTransitionsOptions } from './view-transitions'

/** 可同步或异步返回的值，主要用于导航守卫。 */
type Awaitable<T> = T | Promise<T>

/** 路由元信息对象，匹配后会按父路由到子路由的顺序浅合并。 */
export type RouteMeta = Record<string, unknown>

/** 命名路由标识，用于通过 `{ name, params }` 生成目标路径。 */
export type RouteName = string

/** 命名路由参数允许传入的基础值；null/undefined 会被忽略。 */
export type RouteParamValue = string | number | boolean | null | undefined

/** 命名路由参数输入对象，最终会被字符串化并 encode 到路径中。 */
export type RouteParamsInput = Record<string, RouteParamValue>

/** 基于显式 path 的导航位置。 */
export type PathRouteLocation = {
  /** 目标路径，会被规范化为以 `/` 开头且无尾斜杠的路径。 */
  path: string
}

/** 基于路由 name 和 params 的导航位置。 */
export type NamedRouteLocation = {
  /** 目标路由名称，必须对应已注册的 RouteRecord.name。 */
  name: RouteName
  /** 用于填充目标路由动态参数的值。 */
  params?: RouteParamsInput
}

/** Router 支持的原始导航目标：字符串路径、path 对象或命名路由对象。 */
export type RouteLocationRaw = string | PathRouteLocation | NamedRouteLocation

/** 导航守卫返回值；false 取消导航，路径/位置对象表示重定向。 */
export type NavigationGuardResult = void | boolean | RouteLocationRaw

/** 路由记录重定向配置，支持静态目标或根据当前命中 route 动态计算。 */
export type RouteRecordRedirect = RouteLocationRaw | ((to: Route) => RouteLocationRaw)

/** 路由组件懒加载函数，支持动态 import 的 default 导出。 */
export type RouteComponentLoader = () => Promise<{ default: FC<any> } | FC<any>>

/** 带懒加载元信息的路由组件包装。 */
export type LazyRouteComponent = FC<any> & {
  readonly __rue_route_loader: RouteComponentLoader
  __rue_route_resolved?: FC<any>
  __rue_route_pending?: Promise<FC<any>>
}

/** 导航失败类型常量。 */
export const NavigationFailureType = {
  /** 导航被守卫显式返回 false 终止。 */
  aborted: 'aborted',
  /** 导航在异步守卫期间被新的导航请求取代。 */
  cancelled: 'cancelled',
  /** 导航目标与当前路径相同。 */
  duplicated: 'duplicated',
} as const

/** 导航失败类型字面量联合。 */
export type NavigationFailureType =
  (typeof NavigationFailureType)[keyof typeof NavigationFailureType]

/** 静态路由记录，createRouter 会将它编译为内部匹配结构。 */
export type RouteRecord = {
  /** 路由匹配模式，例如 `/users/:id(\\d+)`；子路由路径会相对父路由拼接。 */
  path: string
  /** 命名路由，可通过 `router.push({ name, params })` 导航。 */
  name?: RouteName
  /** 匹配成功时渲染的 Rue 组件，RouterView 会向其传入 `{ params }`。 */
  component?: FC<any> | LazyRouteComponent
  /** 匹配该记录后触发的重定向目标。 */
  redirect?: RouteRecordRedirect
  /** 子路由配置，参与 matched 链和嵌套 RouterView 渲染。 */
  children?: RouteRecord[]
  /** 路由元信息，命中后按 matched 链顺序浅合并到 `route.meta`。 */
  meta?: RouteMeta
  /** 路由独享前置守卫，执行顺序在全局 beforeEach 之后。 */
  beforeEnter?: NavigationGuard
  /** 离开该记录时缓存页面实例与 DOM，返回时恢复本地状态。 */
  persist?: boolean
  /** 持久化缓存键；默认使用编译后的完整路由路径。 */
  persistKey?: string
}

/** 公开的原始路由记录别名，保留给外部类型语义使用。 */
export type RouteRecordRaw = RouteRecord

/** 路由参数对象，保存从路径捕获并 decode 后的命名参数。 */
export type RouteParams = Record<string, string>

/** 当前路由匹配结果；为 null 表示路径未命中任何路由记录。 */
export type Route = {
  /** 命中的最深层路由记录。 */
  record: RouteRecord
  /** 当前命中记录的 name。 */
  name?: RouteName
  /** 从父到子的命中链，供嵌套 RouterView 按层级渲染。 */
  matched: RouteRecord[]
  /** 从路径中提取的参数。 */
  params: RouteParams
  /** 由 matched 链按顺序合并后的元信息。 */
  meta: RouteMeta
  /** 当前匹配的规范化路径。 */
  path: string
} | null

/** 导航失败对象，包含失败类型、目标 route 和来源 route。 */
export type NavigationFailure = {
  /** 失败类型。 */
  type: NavigationFailureType
  /** 导航目标 route。 */
  to: Route
  /** 导航发起前的 route。 */
  from: Route
}

/** 导航前置守卫函数。 */
export type NavigationGuard = (to: Route, from: Route) => Awaitable<NavigationGuardResult>

/** afterEach 接收到的失败值，可能是标准导航失败或守卫/重定向抛出的 Error。 */
export type AfterEachFailure = NavigationFailure | Error

/** 导航后置守卫函数；无论导航成功、失败或抛错都会在相应路径中触发。 */
export type AfterEachGuard = (to: Route, from: Route, failure?: AfterEachFailure) => void

/** 判断一个值是否为 Router 产生的导航失败，可选按失败类型过滤。 */
export const isNavigationFailure = (
  value: unknown,
  type?: NavigationFailureType,
): value is NavigationFailure => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const failure = value as Partial<NavigationFailure>
  const knownType = failure.type
  if (
    knownType !== NavigationFailureType.aborted &&
    knownType !== NavigationFailureType.cancelled &&
    knownType !== NavigationFailureType.duplicated
  ) {
    return false
  }

  return type ? knownType === type : true
}

/** Router 核心接口，负责持有导航状态、执行导航和注册守卫。 */
export type Router = {
  /** 当前历史位置的响应式信号。 */
  currentPath: SignalHandle<string>
  /** 当前匹配结果的响应式信号。 */
  route: SignalHandle<Route>
  /** 推入一条新历史记录并导航到目标位置。 */
  push: (p: RouteLocationRaw) => Promise<NavigationFailure | undefined>
  /** 替换当前历史记录并导航到目标位置。 */
  replace: (p: RouteLocationRaw) => Promise<NavigationFailure | undefined>
  /** 解析目标位置并预加载命中的懒路由组件，不执行守卫、导航或历史写入。 */
  prefetch: (p: RouteLocationRaw) => Promise<void>
  /** 等待当前导航队列完成，SSR 中通常在 push(url) 后调用。 */
  isReady: () => Promise<void>
  /** 后退一步，优先委托给 HistoryLike.back。 */
  back: () => void
  /** 注册全局前置守卫，返回取消注册函数。 */
  beforeEach: (guard: NavigationGuard) => () => void
  /** 注册全局后置守卫，返回取消注册函数。 */
  afterEach: (guard: AfterEachGuard) => () => void
  /** 创建 Router 时传入的原始路由表，顺序即匹配优先级。 */
  routes: RouteRecord[]
  /** 当前 Router 使用的历史实现。 */
  history: HistoryLike
  /** 插件安装方法，把 Router 绑定到当前 Rue 容器上下文。 */
  install: (app: unknown, options: unknown[]) => void
}

/** 历史实现抽象，用于适配 Web Hash、Web History 或测试中的自定义历史。 */
export type HistoryLike = {
  /** 返回当前位置的路径字符串，hash 模式下不包含 `#`。 */
  location: () => string
  /** 推入新位置，并负责通知 listen 订阅者。 */
  push: (p: string) => void
  /** 替换当前位置，并负责通知 listen 订阅者。 */
  replace: (p: string) => void
  /** 订阅底层位置变化，用于驱动 Router 的响应式信号。 */
  listen: (cb: (source?: NavigationLifecycleType) => void) => void
  /** 可选的后退能力，Web 环境通常委托给 `window.history.back()`。 */
  back?: () => void
  /** 可选的 href 生成能力，RouterLink 会用它生成 `<a href>`。 */
  createHref?: (p: string) => string
}

// 容器级 Router 映射用于多应用场景；活动 Router 则提供全局兜底访问。
const __routerByContainer = new WeakMap<HTMLElement, Router>()
// RouterLink 的编译快路径会通过实例级 resolver 把 to 转为路径。
const __routerResolvePathByInstance = new WeakMap<Router, (to: RouteLocationRaw) => string>()
const __routerPersistKeysByInstance = new WeakMap<Router, string[]>()
let __activeRouter: Router | null = null
// 嵌套 RouterView 使用 depth context 定位 matched 链上的对应记录。
const RouterViewDepthContext = createContext(0)

/** 编译后的路由记录，额外保存完整路径和路径正则。 */
type CompiledRouteRecord = Omit<RouteRecord, 'children'> & {
  children?: CompiledRouteRecord[]
  _fullPath: string
  _c: { re: RegExp; keys: string[] }
}

const resolveRoutePersistKey = (record: RouteRecord) =>
  record.persistKey || (record as Partial<CompiledRouteRecord>)._fullPath || record.path

/** 一条可匹配分支，record 是末端记录，matched 是父到子的完整链。 */
type RouteBranch = {
  record: CompiledRouteRecord
  matched: CompiledRouteRecord[]
}

/** 守卫归一化后的决策，方便导航解析统一处理。 */
type GuardDecision =
  | { kind: 'allow' }
  | { kind: 'abort' }
  | { kind: 'cancelled' }
  | { kind: 'error'; error: Error }
  | { kind: 'redirect'; href: string }

/** 一次导航解析的结果，尚未提交到 history 或响应式状态。 */
type NavigationResolution =
  | { kind: 'allow'; path: string; href: string; route: Route }
  | { kind: 'abort'; path: string; href: string; route: Route }
  | { kind: 'cancelled'; path: string; href: string; route: Route }
  | { kind: 'error'; path: string; href: string; route: Route; error: Error }

/** 等待底层 history 通知回流的导航事务。 */
type PendingNavigation = {
  id: number
  path: string
  href: string
  route: Route
  from: Route
  notify: boolean
  navigationType: NavigationLifecycleType
  manageFocus: boolean
  resolve?: (result: NavigationFailure | undefined) => void
}

const resolveRecordParams = (
  record: RouteRecord,
  params: RouteParams,
  previousRecord: RouteRecord | null,
  previousParams: RouteParams | null,
) => {
  // 每层 RouterView 只把当前记录声明过的动态参数传给组件；
  // 参数未变化时复用旧对象，减少组件块的无意义重建。
  const recordKeys = ((record as Partial<CompiledRouteRecord>)._c?.keys ?? []) as string[]

  if (!recordKeys.length) {
    if (previousRecord === record && previousParams && !Object.keys(previousParams).length) {
      return previousParams
    }
    return {} as RouteParams
  }

  let changed = previousRecord !== record || !previousParams
  const nextParams: RouteParams = {}

  recordKeys.forEach(key => {
    const value = params[key]
    if (value == null) {
      changed = changed || previousParams?.[key] != null
      return
    }

    nextParams[key] = value
    if (!changed && previousParams?.[key] !== value) {
      changed = true
    }
  })

  if (!changed && previousParams) {
    const previousKeys = Object.keys(previousParams)
    if (previousKeys.length !== recordKeys.length) {
      changed = true
    }
  }

  return !changed && previousParams ? previousParams : nextParams
}

const normalizeRoutePath = (path: string) => {
  // 路由内部统一使用无 hash、以 / 开头、无尾斜杠的路径，避免匹配分支膨胀。
  const raw = String(path || '')
  if (!raw) return '/'

  const withoutHash = raw.startsWith('#') ? raw.replace(/^#/, '') : raw
  const withLeadingSlash = withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`
  const compact = withLeadingSlash.replace(/\/+/g, '/')

  if (compact === '/') {
    return compact
  }

  return compact.endsWith('/') ? compact.slice(0, -1) : compact
}

const findRouteLocationSuffixIndex = (path: string) => {
  const searchIndex = path.indexOf('?')
  const hashIndex = path.indexOf('#')

  if (searchIndex < 0) {
    return hashIndex
  }

  if (hashIndex < 0) {
    return searchIndex
  }

  return Math.min(searchIndex, hashIndex)
}

const normalizeRouteLocation = (path: string) => {
  let raw = String(path || '')

  if (raw.startsWith('#')) {
    raw = raw.replace(/^#/, '')
  }

  const suffixIndex = findRouteLocationSuffixIndex(raw)
  const rawPath = suffixIndex >= 0 ? raw.slice(0, suffixIndex) : raw
  const suffix = suffixIndex >= 0 ? raw.slice(suffixIndex) : ''
  const normalizedPath = normalizeRoutePath(rawPath)

  return {
    path: normalizedPath,
    href: `${normalizedPath}${suffix}`,
  }
}

const normalizeRouteLocationPath = (path: string) => normalizeRouteLocation(path).path
const normalizeRouteLocationHref = (path: string) => normalizeRouteLocation(path).href

const joinRoutePath = (parentPath: string, path: string) => {
  // 子路由相对父路径拼接；绝对路径保持自身语义。
  if (!path) {
    return parentPath || '/'
  }

  if (path.startsWith('/')) {
    return normalizeRoutePath(path)
  }

  if (!parentPath || parentPath === '/') {
    return normalizeRoutePath(`/${path}`)
  }

  return normalizeRoutePath(`${parentPath}/${path}`)
}

const isPathRouteLocation = (value: unknown): value is PathRouteLocation => {
  // 仅做形态判断，具体 path 合法性在 resolveLocation 中统一规范化。
  return !!value && typeof value === 'object' && 'path' in (value as Record<string, unknown>)
}

const isNamedRouteLocation = (value: unknown): value is NamedRouteLocation => {
  // 命名路由的位置对象以 name 字段识别，params 在后续字符串化时处理。
  return !!value && typeof value === 'object' && 'name' in (value as Record<string, unknown>)
}

const toNavigationError = (error: unknown): Error => {
  // 守卫或 redirect 可以抛任意值，对外统一成 Error 便于 afterEach 和调用方处理。
  if (error instanceof Error) {
    return error
  }

  return new Error(String(error))
}

const normalizeLoadedRouteComponent = (value: { default: FC<any> } | FC<any>) =>
  typeof value === 'function' ? value : value.default

const isLazyRouteComponent = (component: unknown): component is LazyRouteComponent =>
  typeof component === 'function' &&
  typeof (component as Partial<LazyRouteComponent>).__rue_route_loader === 'function'

const resolveRouteComponent = (component: RouteRecord['component']) =>
  isLazyRouteComponent(component) ? component.__rue_route_resolved : component

const loadRouteComponent = (component: RouteRecord['component']) => {
  if (!isLazyRouteComponent(component)) {
    return Promise.resolve()
  }

  if (component.__rue_route_resolved) {
    return Promise.resolve()
  }

  if (!component.__rue_route_pending) {
    component.__rue_route_pending = Promise.resolve(component.__rue_route_loader())
      .then(value => {
        const resolved = normalizeLoadedRouteComponent(value)
        component.__rue_route_resolved = resolved
        return resolved
      })
      .finally(() => {
        component.__rue_route_pending = undefined
      })
  }

  return component.__rue_route_pending.then(() => undefined)
}

const loadRouteComponents = (route: Route) =>
  Promise.all((route?.matched ?? []).map(record => loadRouteComponent(record.component))).then(
    () => undefined,
  )

export const useAsyncRouteComponent = (loader: RouteComponentLoader): LazyRouteComponent => {
  const AsyncRouteComponent = ((props: any) => {
    const resolved = AsyncRouteComponent.__rue_route_resolved
    return resolved
      ? _$compiledComponent(resolved as CompiledComponentFactory<any>, () => props)
      : _$compiledRoot(() => [null, null])
  }) as LazyRouteComponent

  Object.defineProperty(AsyncRouteComponent, '__rue_route_loader', {
    value: loader,
    enumerable: false,
    configurable: false,
    writable: false,
  })

  return AsyncRouteComponent
}

/** 将 Router 绑定到当前 Rue 容器，并设置为进程级活动 Router。 */
export const attachRouter = (router: Router) => {
  const c = getCurrentAppTarget() as HTMLElement | null
  if (c) {
    __routerByContainer.set(c, router)
    onOwnerCleanup(() => __routerByContainer.delete(c))
  } else __activeRouter = router
}

/**
 * 创建基于 URL hash 的 Web 历史实现。
 *
 * 内部路径不包含 `#`，RouterLink 生成 href 时会通过 createHref 补回 hash 前缀。
 */
export const createWebHashHistory = () => {
  const g = globalThis as any
  const normalize = (path: string) => {
    return normalizeRouteLocationHref(path)
  }
  if (g && g.location) {
    // 没有 hash 时，默认跳到根路径 '/'
    if (!g.location.hash) g.location.hash = '#/'
  }
  // 规范化 location：取 hash 去掉 '#'，空串回退到 '/'
  const loc = () => {
    const s = g && g.location && g.location.hash ? String(g.location.hash).replace(/^#/, '') : ''
    return s || '/'
  }
  // 注册 hashchange 事件监听（浏览器环境）
  const listeners = new Set<(source?: NavigationLifecycleType) => void>()
  const notify = (source: NavigationLifecycleType) => {
    listeners.forEach(listener => listener(source))
  }
  if (g && g.addEventListener) g.addEventListener('hashchange', () => notify('pop'))
  const listen = (cb: (source?: NavigationLifecycleType) => void) => listeners.add(cb)
  return {
    location: loc,
    push: (p: string) => {
      const next = normalize(p)
      if (next === loc()) return
      if (g && g.location) {
        // 兼容传入 '#/path' 或 '/path' 两种形式
        g.location.hash = next
      }
      notify('push')
    },
    replace: (p: string) => {
      const next = normalize(p)
      if (next === loc()) return
      const href = '#' + next
      if (g && g.location && typeof g.location.replace === 'function') {
        // 使用 location.replace 避免新增历史栈记录
        g.location.replace(href)
      }
      notify('replace')
    },
    listen,
    back: () => {
      // 优先使用原生历史回退
      if (g && g.history && typeof g.history.back === 'function') g.history.back()
    },
    createHref: (p: string) => '#' + normalize(p),
  } as HistoryLike
}

/**
 * 创建内存历史实现。
 *
 * 适用于 SSR、单元测试和没有浏览器 history/location 的宿主。它不会读取或写入
 * globalThis.location，所有导航状态都保存在当前 History 实例中。
 */
export const createMemoryHistory = (initialPath = '/') => {
  let current = normalizeRouteLocationHref(initialPath)
  let index = 0
  const entries = [current]
  const listeners = new Set<(source?: NavigationLifecycleType) => void>()

  const notify = (source: NavigationLifecycleType) => {
    listeners.forEach(listener => listener(source))
  }

  return {
    location: () => current,
    push: (p: string) => {
      const next = normalizeRouteLocationHref(p)
      if (next === current) return
      current = next
      entries.splice(index + 1)
      entries.push(next)
      index = entries.length - 1
      notify('push')
    },
    replace: (p: string) => {
      const next = normalizeRouteLocationHref(p)
      if (next === current) return
      current = next
      entries[index] = next
      notify('replace')
    },
    listen: (cb: (source?: NavigationLifecycleType) => void) => {
      listeners.add(cb)
    },
    back: () => {
      if (index === 0) return
      index -= 1
      current = entries[index]
      notify('pop')
    },
    createHref: (p: string) => normalizeRouteLocationHref(p),
  } as HistoryLike
}

/**
 * 创建基于 History API 的 Web 历史实现。
 *
 * 适合服务端已配置 SPA fallback 的应用；路径直接写入 pathname。
 */
export const createWebHistory = () => {
  const g = globalThis as any
  const notifyHistoryChange = () => {
    if (typeof g?.dispatchEvent === 'function' && typeof g?.Event === 'function') {
      g.dispatchEvent(new g.Event('rue:history-change'))
    }
  }
  const normalize = (path: string) => {
    return normalizeRouteLocationHref(path)
  }
  const loc = () => {
    const pathname = g && g.location ? String(g.location.pathname || '') : ''
    const search = g && g.location ? String(g.location.search || '') : ''
    const hash = g && g.location ? String(g.location.hash || '') : ''
    return `${pathname || '/'}${search}${hash}`
  }
  const listeners = new Set<(source?: NavigationLifecycleType) => void>()
  const notify = (source: NavigationLifecycleType) => {
    listeners.forEach(listener => listener(source))
  }
  if (g && g.addEventListener) g.addEventListener('popstate', () => notify('pop'))
  const listen = (cb: (source?: NavigationLifecycleType) => void) => listeners.add(cb)
  return {
    location: loc,
    push: (p: string) => {
      const next = normalize(p)
      if (next === loc()) return
      if (g && g.history && typeof g.history.pushState === 'function') {
        g.history.pushState(null, '', next)
        notifyHistoryChange()
      } else if (g && g.location) {
        g.location.pathname = next
      }
      notify('push')
    },
    replace: (p: string) => {
      const next = normalize(p)
      if (next === loc()) return
      if (g && g.history && typeof g.history.replaceState === 'function') {
        g.history.replaceState(null, '', next)
        notifyHistoryChange()
      } else if (g && g.location && typeof g.location.replace === 'function') {
        g.location.replace(next)
      }
      notify('replace')
    },
    listen,
    back: () => {
      if (g && g.history && typeof g.history.back === 'function') g.history.back()
    },
    createHref: (p: string) => normalize(p),
  } as HistoryLike
}

/**
 * 创建 Router 实例。
 *
 * createRouter 会编译所有路由规则、解析初始位置和 redirect，并监听 history
 * 变化来同步 currentPath/route 信号。push/replace 的异步结果会在守卫和底层
 * history 通知完成后结算。
 */
export type RouterOptions = {
  history: HistoryLike
  routes: RouteRecord[]
  scrollBehavior?: RouterScrollBehavior
  viewTransitions?: RouterViewTransitionsConfig
}

export const createRouter = (options: RouterOptions): Router => {
  const compilePath = (path: string) => {
    // 将 `/users/:id(\\d+)` 这类模式编译成完整正则，同时记录捕获组对应的参数名。
    const keys: string[] = []
    const reStr =
      '^' +
      path.replace(/\/:([^/()]+)(?:\(([^)]+)\))?/g, (_m, name, pattern) => {
        // 累积命名参数键
        keys.push(name)
        // 若提供子模式，则使用该模式作为捕获组，否则匹配非 '/' 的片段
        const group = pattern ? `(${pattern})` : '([^/]+)'
        return `/${group}`
      }) +
      '$'
    // 生成完整正则与对应键列表
    return { re: new RegExp(reStr), keys }
  }

  const routeByName = new Map<RouteName, CompiledRouteRecord>()

  const normalizeParamsInput = (params?: RouteParamsInput): RouteParams => {
    // 命名路由参数统一转成字符串；null/undefined 不参与路径生成。
    const nextParams: RouteParams = {}

    if (!params) {
      return nextParams
    }

    Object.keys(params).forEach(key => {
      const value = params[key]
      if (value == null) {
        return
      }

      nextParams[key] = String(value)
    })

    return nextParams
  }

  const stringifyRoutePath = (path: string, params?: RouteParamsInput) => {
    // 用传入 params 填充动态路径片段，缺失必填参数时直接抛错。
    const normalizedParams = normalizeParamsInput(params)

    return normalizeRoutePath(
      path.replace(/\/:([^/()]+)(?:\(([^)]+)\))?/g, (_m, name) => {
        const value = normalizedParams[name]
        if (value == null) {
          throw new Error(`Missing required param "${name}" for route path ${path}`)
        }

        return `/${encodeURIComponent(value)}`
      }),
    )
  }

  const resolveLocation = (to: RouteLocationRaw, inheritedParams?: RouteParamsInput) => {
    // 导航入口会拆成两份：path 用于路由匹配，href 用于实际写入 history。
    if (typeof to === 'string') {
      return normalizeRouteLocation(to)
    }

    if (isPathRouteLocation(to)) {
      return normalizeRouteLocation(to.path)
    }

    if (isNamedRouteLocation(to)) {
      const target = routeByName.get(to.name)
      if (!target) {
        throw new Error('No route matched name ' + to.name)
      }

      const path = stringifyRoutePath(target._fullPath, {
        ...normalizeParamsInput(inheritedParams),
        ...normalizeParamsInput(to.params),
      })

      return { path, href: path }
    }

    return normalizeRouteLocation(String(to || ''))
  }

  const resolveRouteRedirect = (to: Route) => {
    // redirect 从最深层记录向父级查找，子路由可以覆盖父级重定向行为。
    if (!to) {
      return { kind: 'none' } as const
    }

    for (let i = to.matched.length - 1; i >= 0; i -= 1) {
      const redirect = to.matched[i].redirect
      if (!redirect) {
        continue
      }

      try {
        const target = typeof redirect === 'function' ? redirect(to) : redirect
        return { kind: 'redirect', href: resolveLocation(target, to.params).href } as const
      } catch (error) {
        return { kind: 'error', error: toNavigationError(error) } as const
      }
    }

    return { kind: 'none' } as const
  }

  const compileRecords = (records: RouteRecord[], parentPath = ''): CompiledRouteRecord[] =>
    records.map(record => {
      // 编译时同时建立 name -> record 映射，后续命名导航无需遍历路由表。
      // 这些值只在 Router 初始化时计算一次。使用非 const 绑定避免 JSX
      // 响应式编译器将递归编译包装成 computed，从而重复注册命名路由。
      let fullPath = joinRoutePath(parentPath, record.path)
      let children = record.children ? compileRecords(record.children, fullPath) : undefined

      let compiledRecord: CompiledRouteRecord = {
        ...record,
        children,
        _fullPath: fullPath,
        _c: compilePath(fullPath),
      }

      if (compiledRecord.name) {
        if (routeByName.has(compiledRecord.name)) {
          throw new Error('Duplicate route name ' + compiledRecord.name)
        }

        routeByName.set(compiledRecord.name, compiledRecord)
      }

      return compiledRecord
    })

  const collectBranches = (records: CompiledRouteRecord[]) => {
    // 将树形路由摊平成可顺序匹配的分支列表，并保留每个叶/中间节点的 matched 链。
    const branches: RouteBranch[] = []

    const visit = (record: CompiledRouteRecord, matched: CompiledRouteRecord[]) => {
      const nextMatched = [...matched, record]

      if (record.children?.length) {
        record.children.forEach(child => visit(child, nextMatched))
      }

      branches.push({ record, matched: nextMatched })
    }

    records.forEach(record => visit(record, []))
    return branches
  }

  // Router 配置是创建时快照，不应被 JSX 响应式编译器重新求值。
  let compiled = compileRecords(options.routes)
  let branches = collectBranches(compiled)
  let persistKeys = Array.from(
    new Set(
      branches.flatMap(branch =>
        branch.matched.filter(record => record.persist).map(resolveRoutePersistKey),
      ),
    ),
  )

  const match = (path: string): Route => {
    // 按声明顺序匹配分支，命中后提取 params，并合并 matched 链上的 meta。
    const normalizedPath = normalizeRoutePath(path)

    for (let i = 0; i < branches.length; i++) {
      const branch = branches[i]
      const r = branch.record
      // 顺序匹配，命中即返回（后续规则不再检查）
      const m = r._c.re.exec(normalizedPath)
      if (m) {
        const params: RouteParams = {}
        // 将捕获组与命名键对应并解码
        r._c.keys.forEach((k: string, idx: number) => {
          params[k] = decodeURIComponent(m[idx + 1] || '')
        })

        const matched = branch.matched as RouteRecord[]
        const meta = matched.reduce<RouteMeta>((acc, record) => {
          if (record.meta) {
            Object.assign(acc, record.meta)
          }
          return acc
        }, {})

        return { record: r, name: r.name, matched, params, meta, path: normalizedPath }
      }
    }
    // 未命中返回 null（交由视图层决定如何处理）
    return null
  }

  const resolveInitialRoute = (
    rawPath: string,
    redirectDepth = 0,
  ): { path: string; href: string; route: Route } => {
    // 初始化阶段没有 from，也不运行守卫，只解析静态 redirect 并限制重定向深度。
    if (redirectDepth > 20) {
      throw new Error('Too many redirects while navigating to ' + rawPath)
    }

    const location = normalizeRouteLocation(rawPath)
    const targetRoute = match(location.path)
    const redirect = resolveRouteRedirect(targetRoute)
    if (redirect.kind === 'redirect') {
      return resolveInitialRoute(redirect.href, redirectDepth + 1)
    }

    if (redirect.kind === 'error') {
      throw redirect.error
    }

    return { path: location.path, href: location.href, route: targetRoute }
  }

  const initialRouteState = resolveInitialRoute(options.history.location())

  // currentPath：受历史驱动的源信号；第三参 true 表示同步更新立即通知观察者
  const currentPath = signal(initialRouteState.path)

  const beforeGuards: NavigationGuard[] = []
  const afterGuards: AfterEachGuard[] = []
  let pendingNavigation: PendingNavigation | null = null
  let navigationRequestId = 0
  let readyPromise: Promise<void> = Promise.resolve()
  const scrollManager = createRouterScrollManager(options.scrollBehavior)
  const runViewTransition = createRouterViewTransitionRunner(options.viewTransitions)
  let committedHistoryHref = initialRouteState.href

  const createNavigationFailure = (
    type: NavigationFailureType,
    to: Route,
    from: Route,
  ): NavigationFailure => ({ type, to, from })

  const runAfterGuards = (to: Route, from: Route, failure?: AfterEachFailure) => {
    // Router callbacks are imperative boundaries. Keep reactive reads performed by user
    // callbacks from leaking into the effect that happened to initiate navigation.
    for (let i = 0; i < afterGuards.length; i++) {
      untrack(() => afterGuards[i](to, from, failure))
    }
  }

  const finishNavigation = (
    to: Route,
    from: Route,
    navigationType: NavigationLifecycleType,
    failure?: AfterEachFailure,
  ) => {
    runAfterGuards(to, from, failure)
    dispatchAfterNavigation({ to, from, type: navigationType, failure })
  }

  const isStaleNavigation = (requestId: number) => requestId !== navigationRequestId

  const resolveGuardDecision = (result: NavigationGuardResult, to: Route): GuardDecision => {
    // 守卫返回值在这里收敛成四类控制流：放行、取消、重定向或错误。
    if (result === false) {
      return { kind: 'abort' }
    }

    if (result === undefined || result === true) {
      return { kind: 'allow' }
    }

    try {
      return { kind: 'redirect', href: resolveLocation(result, to?.params).href }
    } catch (error) {
      return { kind: 'error', error: toNavigationError(error) }
    }
  }

  const runBeforeGuards = async (
    to: Route,
    from: Route,
    requestId: number,
  ): Promise<GuardDecision> => {
    // 全局 beforeEach 先运行，随后按 matched 链从父到子执行 beforeEnter。
    for (let i = 0; i < beforeGuards.length; i++) {
      let result: NavigationGuardResult
      try {
        result = await beforeGuards[i](to, from)
      } catch (error) {
        if (isStaleNavigation(requestId)) {
          return { kind: 'cancelled' }
        }

        return { kind: 'error', error: toNavigationError(error) }
      }

      if (isStaleNavigation(requestId)) {
        return { kind: 'cancelled' }
      }

      const decision = resolveGuardDecision(result, to)
      if (decision.kind !== 'allow') {
        return decision
      }
    }

    if (!to) {
      return { kind: 'allow' }
    }

    for (let i = 0; i < to.matched.length; i++) {
      const record = to.matched[i]
      if (!record.beforeEnter) {
        continue
      }

      let result: NavigationGuardResult
      try {
        result = await record.beforeEnter(to, from)
      } catch (error) {
        if (isStaleNavigation(requestId)) {
          return { kind: 'cancelled' }
        }

        return { kind: 'error', error: toNavigationError(error) }
      }

      if (isStaleNavigation(requestId)) {
        return { kind: 'cancelled' }
      }

      const decision = resolveGuardDecision(result, to)
      if (decision.kind !== 'allow') {
        return decision
      }
    }

    return { kind: 'allow' }
  }

  const resolveNavigation = (
    rawPath: RouteLocationRaw,
    from: Route,
    requestId: number,
    redirectDepth = 0,
  ): Promise<NavigationResolution> => {
    const execute = async (): Promise<NavigationResolution> => {
      // 一次导航解析包括：位置归一化、路由匹配、redirect 解析和守卫执行。
      if (redirectDepth > 20) {
        const href =
          typeof rawPath === 'string' ? normalizeRouteLocationHref(rawPath) : currentPath.get()
        return {
          kind: 'error',
          path:
            typeof rawPath === 'string' ? normalizeRouteLocationPath(rawPath) : currentPath.get(),
          href,
          route: from,
          error: new Error('Too many redirects while navigating to ' + String(rawPath)),
        }
      }

      let location: { path: string; href: string }
      try {
        location = resolveLocation(rawPath)
      } catch (error) {
        return {
          kind: 'error',
          path: currentPath.get(),
          href: currentPath.get(),
          route: null,
          error: toNavigationError(error),
        }
      }

      const targetRoute = match(location.path)
      const redirect = resolveRouteRedirect(targetRoute)
      if (redirect.kind === 'redirect') {
        return resolveNavigation(redirect.href, from, requestId, redirectDepth + 1)
      }

      if (redirect.kind === 'error') {
        return {
          kind: 'error',
          path: location.path,
          href: location.href,
          route: targetRoute,
          error: redirect.error,
        }
      }

      const decision = await runBeforeGuards(targetRoute, from, requestId)

      if (decision.kind === 'redirect') {
        return resolveNavigation(decision.href, from, requestId, redirectDepth + 1)
      }

      if (decision.kind === 'abort') {
        return { kind: 'abort', path: location.path, href: location.href, route: targetRoute }
      }

      if (decision.kind === 'cancelled') {
        return { kind: 'cancelled', path: location.path, href: location.href, route: targetRoute }
      }

      if (decision.kind === 'error') {
        return {
          kind: 'error',
          path: location.path,
          href: location.href,
          route: targetRoute,
          error: decision.error,
        }
      }

      return { kind: 'allow', path: location.path, href: location.href, route: targetRoute }
    }

    return execute()
  }

  const resolveNavigationSync = (
    rawPath: RouteLocationRaw,
    from: Route,
    redirectDepth = 0,
  ): NavigationResolution => {
    if (redirectDepth > 20) {
      const href =
        typeof rawPath === 'string' ? normalizeRouteLocationHref(rawPath) : currentPath.get()
      return {
        kind: 'error',
        path: typeof rawPath === 'string' ? normalizeRouteLocationPath(rawPath) : currentPath.get(),
        href,
        route: from,
        error: new Error('Too many redirects while navigating to ' + String(rawPath)),
      }
    }

    let location: { path: string; href: string }
    try {
      location = resolveLocation(rawPath)
    } catch (error) {
      return {
        kind: 'error',
        path: currentPath.get(),
        href: currentPath.get(),
        route: null,
        error: toNavigationError(error),
      }
    }

    const targetRoute = match(location.path)
    const redirect = resolveRouteRedirect(targetRoute)
    if (redirect.kind === 'redirect') {
      return resolveNavigationSync(redirect.href, from, redirectDepth + 1)
    }

    if (redirect.kind === 'error') {
      return {
        kind: 'error',
        path: location.path,
        href: location.href,
        route: targetRoute,
        error: redirect.error,
      }
    }

    return { kind: 'allow', path: location.path, href: location.href, route: targetRoute }
  }

  const hasBeforeEnterGuards = (to: Route) =>
    !!to?.matched?.some(record => typeof record.beforeEnter === 'function')

  const hasPendingLazyRouteComponents = (to: Route) =>
    !!to?.matched?.some(
      record => isLazyRouteComponent(record.component) && !record.component.__rue_route_resolved,
    )

  const commitNavigation = (
    path: string,
    href: string,
    nextRoute: Route,
    from: Route,
    navigationType: NavigationLifecycleType,
    manageFocus: boolean,
  ) =>
    runViewTransition(() => {
      // 状态提交集中在这里，保证 currentPath/route 和 afterEach 的顺序稳定。
      currentPath.set(path)
      route.set(nextRoute)
      committedHistoryHref = href
      finishNavigation(nextRoute, from, navigationType)
      scheduleNavigationPageLoad(
        { to: nextRoute, from, type: navigationType },
        manageFocus,
        () => route.get() === nextRoute,
        () => scrollManager.scroll({ to: nextRoute, from, type: navigationType, href }),
      )
    })

  const getCurrentHistoryHref = () => normalizeRouteLocationHref(options.history.location())

  const settlePendingNavigation = () => {
    // push/replace 先写入底层 history，再等待 listen 回调确认当前位置已经变化。
    const nextPending = pendingNavigation
    if (!nextPending) {
      return false
    }

    const currentLocation = normalizeRouteLocationPath(options.history.location())
    if (currentLocation !== nextPending.path) {
      return false
    }

    pendingNavigation = null

    const commitPromise = nextPending.notify
      ? commitNavigation(
          nextPending.path,
          nextPending.href,
          nextPending.route,
          nextPending.from,
          nextPending.navigationType,
          nextPending.manageFocus,
        )
      : Promise.resolve()

    void commitPromise.then(() => nextPending.resolve?.(undefined))
    return true
  }

  const commitHistoryNavigation = (
    href: string,
    path: string,
    nextRoute: Route,
    from: Route,
    requestId: number,
    method: 'push' | 'replace',
    manageFocus: boolean,
  ) => {
    const navigationPromise = new Promise<NavigationFailure | undefined>(resolve => {
      pendingNavigation = {
        id: requestId,
        path,
        href,
        route: nextRoute,
        from,
        notify: true,
        navigationType: method,
        manageFocus,
        resolve,
      }
    })

    options.history[method](href)

    if (pendingNavigation?.id === requestId) {
      settlePendingNavigation()
    }

    if (pendingNavigation?.id === requestId) {
      const unresolvedPending = pendingNavigation
      pendingNavigation = null
      void commitNavigation(path, href, nextRoute, from, method, manageFocus).then(() =>
        unresolvedPending.resolve?.(undefined),
      )
    }

    const currentReadyPromise = navigationPromise.then(() => undefined)
    readyPromise = currentReadyPromise
    return navigationPromise.finally(() => {
      if (readyPromise === currentReadyPromise) {
        readyPromise = Promise.resolve()
      }
    })
  }

  const navigate = async (
    rawPath: RouteLocationRaw,
    method: 'push' | 'replace',
  ): Promise<NavigationFailure | undefined> => {
    // 编程式导航先解析和跑守卫，只有 allow 后才委托给 history 修改地址。
    const from = route.get()
    const requestId = ++navigationRequestId
    const manageFocus = shouldManageNavigationFocus()
    scrollManager.save(committedHistoryHref)
    let lifecycleTarget: Route = null
    try {
      lifecycleTarget = match(resolveLocation(rawPath).path)
    } catch {}
    dispatchBeforeNavigation({ to: lifecycleTarget, from, type: method })

    if (beforeGuards.length === 0) {
      const syncResolution = resolveNavigationSync(rawPath, from)
      const canCommitSync =
        syncResolution.kind !== 'allow' ||
        (!hasBeforeEnterGuards(syncResolution.route) &&
          !hasPendingLazyRouteComponents(syncResolution.route))

      if (canCommitSync) {
        if (syncResolution.kind === 'error') {
          finishNavigation(syncResolution.route, from, method, syncResolution.error)
          throw syncResolution.error
        }

        if (
          syncResolution.path === currentPath.get() &&
          syncResolution.href === getCurrentHistoryHref()
        ) {
          const failure = createNavigationFailure(
            NavigationFailureType.duplicated,
            syncResolution.route,
            from,
          )
          finishNavigation(syncResolution.route, from, method, failure)
          return failure
        }

        return commitHistoryNavigation(
          syncResolution.href,
          syncResolution.path,
          syncResolution.route,
          from,
          requestId,
          method,
          manageFocus,
        )
      }
    }

    const resolution = await resolveNavigation(rawPath, from, requestId)

    if (resolution.kind === 'error') {
      finishNavigation(resolution.route, from, method, resolution.error)
      throw resolution.error
    }

    if (resolution.kind === 'cancelled') {
      const failure = createNavigationFailure(
        NavigationFailureType.cancelled,
        resolution.route,
        from,
      )
      finishNavigation(resolution.route, from, method, failure)
      return failure
    }

    if (resolution.kind === 'abort') {
      const failure = createNavigationFailure(NavigationFailureType.aborted, resolution.route, from)
      finishNavigation(resolution.route, from, method, failure)
      return failure
    }

    if (resolution.path === currentPath.get() && resolution.href === getCurrentHistoryHref()) {
      const failure = createNavigationFailure(
        NavigationFailureType.duplicated,
        resolution.route,
        from,
      )
      finishNavigation(resolution.route, from, method, failure)
      return failure
    }

    await loadRouteComponents(resolution.route)
    if (isStaleNavigation(requestId)) {
      const failure = createNavigationFailure(
        NavigationFailureType.cancelled,
        resolution.route,
        from,
      )
      finishNavigation(resolution.route, from, method, failure)
      return failure
    }

    const navigationPromise = new Promise<NavigationFailure | undefined>(resolve => {
      pendingNavigation = {
        id: requestId,
        path: resolution.path,
        href: resolution.href,
        route: resolution.route,
        from,
        notify: true,
        navigationType: method,
        manageFocus,
        resolve,
      }

      options.history[method](resolution.href)
      settlePendingNavigation()
    })

    const currentReadyPromise = navigationPromise.then(
      () => undefined,
      () => undefined,
    )
    readyPromise = currentReadyPromise

    return await navigationPromise.finally(() => {
      if (readyPromise === currentReadyPromise) {
        readyPromise = Promise.resolve()
      }
    })
  }

  // route 保存当前路径对应的匹配结果；当前实现要求初始路径必须命中路由。
  const matchRoute = initialRouteState.route
  if (null === matchRoute) {
    throw new Error('No route matched path ' + currentPath.get())
  }
  const route = signal<Route>(matchRoute)

  const refreshRouteAfterPreload = (loadedRoute: Route) => {
    if (!loadedRoute || route.get() !== loadedRoute) {
      return
    }

    route.set({ ...loadedRoute })
  }

  const preloadAndRefreshRoute = async (targetRoute: Route) => {
    await loadRouteComponents(targetRoute)
    refreshRouteAfterPreload(targetRoute)
  }

  if (hasPendingLazyRouteComponents(matchRoute)) {
    readyPromise = preloadAndRefreshRoute(matchRoute)
  }

  if (initialRouteState.href !== getCurrentHistoryHref()) {
    options.history.replace(initialRouteState.href)
  }

  // 监听浏览器前进/后退或 history 主动通知，并走同一套导航解析流程。
  options.history.listen(source => {
    void (async () => {
      const rawLocation = options.history.location()
      const rawHref = normalizeRouteLocationHref(rawLocation)
      const p = normalizeRouteLocationPath(rawLocation)

      if (settlePendingNavigation()) {
        return
      }

      // 去重：避免重复设置导致无意义的通知
      if (rawHref === committedHistoryHref) {
        return
      }

      const from = route.get()
      const requestId = ++navigationRequestId
      const navigationType = source ?? 'pop'
      const manageFocus = shouldManageNavigationFocus()
      scrollManager.save(committedHistoryHref)
      let lifecycleTarget: Route = null
      try {
        lifecycleTarget = match(resolveLocation(rawLocation).path)
      } catch {}
      dispatchBeforeNavigation({ to: lifecycleTarget, from, type: navigationType })
      const resolution = await resolveNavigation(rawLocation, from, requestId)

      if (resolution.kind === 'error') {
        finishNavigation(resolution.route, from, navigationType, resolution.error)

        if (!from) {
          return
        }

        pendingNavigation = {
          id: requestId,
          path: from.path,
          href: from.path,
          route: from,
          from,
          notify: false,
          navigationType: 'pop',
          manageFocus: false,
        }
        options.history.replace(from.path)
        settlePendingNavigation()
        return
      }

      if (resolution.kind === 'cancelled') {
        const failure = createNavigationFailure(
          NavigationFailureType.cancelled,
          resolution.route,
          from,
        )
        finishNavigation(resolution.route, from, navigationType, failure)
        return
      }

      if (resolution.kind === 'abort') {
        if (!from) {
          return
        }

        const failure = createNavigationFailure(
          NavigationFailureType.aborted,
          resolution.route,
          from,
        )
        finishNavigation(resolution.route, from, navigationType, failure)

        pendingNavigation = {
          id: requestId,
          path: from.path,
          href: from.path,
          route: from,
          from,
          notify: false,
          navigationType: 'pop',
          manageFocus: false,
        }
        options.history.replace(from.path)
        settlePendingNavigation()
        return
      }

      if (resolution.path !== p) {
        await loadRouteComponents(resolution.route)
        if (isStaleNavigation(requestId)) {
          const failure = createNavigationFailure(
            NavigationFailureType.cancelled,
            resolution.route,
            from,
          )
          finishNavigation(resolution.route, from, navigationType, failure)
          return
        }

        pendingNavigation = {
          id: requestId,
          path: resolution.path,
          href: resolution.href,
          route: resolution.route,
          from,
          notify: true,
          navigationType,
          manageFocus,
        }
        options.history.replace(resolution.href)
        settlePendingNavigation()
        return
      }

      await loadRouteComponents(resolution.route)
      if (isStaleNavigation(requestId)) {
        const failure = createNavigationFailure(
          NavigationFailureType.cancelled,
          resolution.route,
          from,
        )
        finishNavigation(resolution.route, from, navigationType, failure)
        return
      }

      await commitNavigation(
        resolution.path,
        resolution.href,
        resolution.route,
        from,
        navigationType,
        manageFocus,
      )
    })()
  })

  const router: Router = {
    currentPath,
    route,
    push: (p: RouteLocationRaw) => navigate(p, 'push'),
    replace: (p: RouteLocationRaw) => navigate(p, 'replace'),
    prefetch: async (p: RouteLocationRaw) => {
      const resolution = resolveNavigationSync(p, route.get())
      if (resolution.kind === 'error') {
        throw resolution.error
      }
      if (resolution.kind === 'allow') {
        await loadRouteComponents(resolution.route)
      }
    },
    isReady: () =>
      readyPromise.then(() => {
        const currentRoute = route.get()
        return preloadAndRefreshRoute(currentRoute)
      }),
    back: () => {
      // 优先使用 HistoryLike.back；否则退回到全局 history
      if (options.history.back) return options.history.back()
      const gg = globalThis as any
      if (gg.history && typeof gg.history.back === 'function') gg.history.back()
    },
    beforeEach: (guard: NavigationGuard) => {
      beforeGuards.push(guard)
      return () => {
        const idx = beforeGuards.indexOf(guard)
        if (idx >= 0) beforeGuards.splice(idx, 1)
      }
    },
    afterEach: (guard: AfterEachGuard) => {
      afterGuards.push(guard)
      return () => {
        const idx = afterGuards.indexOf(guard)
        if (idx >= 0) afterGuards.splice(idx, 1)
      }
    },
    routes: options.routes,
    history: options.history,
    /** 插件安装：绑定当前 Router 到容器上下文 */
    install: (_app: unknown, _options: unknown[]) => {
      // 将当前 Router 记录到容器映射，并设为活动路由
      attachRouter(router)
    },
  }

  __routerResolvePathByInstance.set(router, (to: RouteLocationRaw) => resolveLocation(to).href)
  __routerPersistKeysByInstance.set(router, persistKeys)

  return router
}

/** 获取当前上下文中的 Router，优先使用容器绑定，其次使用活动 Router。 */
export const useRouter = (): Router => {
  const c = getCurrentAppTarget() as HTMLElement | null
  const r = c ? __routerByContainer.get(c) : __activeRouter
  if (!r) throw new Error('Router not installed for current application/container')
  return r
}

/** A route is a closed component call selected by the navigation signal. */
export const RouterView: FC = () => {
  const depth = useContext(RouterViewDepthContext)
  const router = useRouter()
  const persistKeys = __routerPersistKeysByInstance.get(router) ?? []
  const slots = new Map<
    string,
    {
      component: FC<any>
      record: RouteRecord
      params: SignalHandle<RouteParams>
      paramsValue: RouteParams
      children: BlockFactory<any>
    }
  >()
  const view = _$keepAlive(() => {
    const data = router.route.get()
    const record = data?.matched?.[depth]
    const component = record?.component && resolveRouteComponent(record.component)
    const key = record ? resolveRoutePersistKey(record) : undefined
    let entry = key ? slots.get(key) : undefined
    if (component && record && data && key) {
      // Keep the previous value outside the reactive signal. Reading params.get() here would
      // subscribe this KeepAlive effect to the same signal it updates below and create a loop.
      const previousParams = entry?.paramsValue ?? null
      const params = resolveRecordParams(record, data.params, entry?.record ?? null, previousParams)
      if (!entry || entry.component !== component) {
        const source = signal(params)
        const children: BlockFactory<any> = (target, _props, owner) =>
          _$mountCompiledSlotFactory(target, owner, () => {
            provideContext(RouterViewDepthContext, () => depth + 1)
            return _$compiledComponent(component as CompiledComponentFactory<any>, () => ({
              params: source.get(),
            }))
          })
        entry = { component, record, params: source, paramsValue: params, children }
        slots.set(key, entry)
      } else {
        entry.record = record
        if (params !== previousParams) {
          entry.paramsValue = params
          entry.params.set(params)
        }
      }
    }
    return {
      cacheKey: component ? key : undefined,
      cacheName: key,
      include: persistKeys,
      children: component ? entry?.children : undefined,
    }
  })
  return view as any
}

type RouterLinkProps = {
  to: RouteLocationRaw
  replace?: boolean
  prefetch?: RoutePrefetchStrategy
} & Record<string, unknown>

const resolveRouterLocationPath = (router: Router | null, to: unknown) => {
  // 生成 href 时也复用 Router 的命名路由解析逻辑，保证链接和导航目标一致。
  if (!router) {
    if (typeof to === 'string') {
      return normalizeRouteLocationHref(to)
    }

    if (isPathRouteLocation(to)) {
      return normalizeRouteLocationHref(to.path)
    }

    throw new Error('Router not installed for current application/container')
  }

  const resolvePath = __routerResolvePathByInstance.get(router)
  if (!resolvePath) {
    throw new Error('Router path resolver not available for current application/container')
  }

  return resolvePath(to as RouteLocationRaw)
}

const routerLinkHref = (to: unknown) => {
  // HistoryLike.createHref 负责把内部路径转换成用户可点击的 href。
  const router = getCurrentAppTarget() ? useRouter() : __activeRouter
  const path = resolveRouterLocationPath(router, to)
  const createHref = router?.history?.createHref
  return createHref ? createHref(path) : path || '/'
}

const RouterLinkImpl: FC<RouterLinkProps> = props => {
  const to = (props as any).to as RouteLocationRaw
  const replace = !!(props as any).replace
  const prefetch = (props as any).prefetch as RoutePrefetchStrategy | undefined
  const {
    children: _children,
    to: _to,
    replace: _replace,
    prefetch: _prefetch,
    ref: userRef,
    onPointerEnter: userPointerEnter,
    onFocus: userFocus,
    onPointerDown: userPointerDown,
    onTouchStart: userTouchStart,
    ...rest
  } = props as any
  // Server-rendered links only need a stable href. Event handling and prefetching are enabled
  // once the component is mounted inside an application with an installed router.
  const r = getCurrentAppTarget() ? useRouter() : __activeRouter
  let clearPrefetchTrigger = () => {}
  let linkElement: Element | null = null
  const runPrefetch = () => {
    if (r) void r.prefetch(to).catch(() => {})
  }
  const setUserRef = (value: Element | null) => {
    if (typeof userRef === 'function') {
      userRef(value)
    } else if (userRef && typeof userRef === 'object' && 'current' in userRef) {
      userRef.current = value ?? undefined
    }
  }
  const linkRef = (element: Element | null) => {
    clearPrefetchTrigger()
    clearPrefetchTrigger = () => {}
    linkElement = element
    setUserRef(element)
    if (element) {
      clearPrefetchTrigger = bindRoutePrefetchTrigger(element, prefetch, runPrefetch)
    }
  }
  const prefetchOn = (event: Event, userHandler: unknown) => {
    if (typeof userHandler === 'function') {
      userHandler(event)
    }
    if (!event.defaultPrevented && shouldPrefetchRouteForEvent(event.type, prefetch)) {
      runPrefetch()
    }
  }
  onUnmounted(() => {
    clearPrefetchTrigger()
    if (linkElement) {
      setUserRef(null)
      linkElement = null
    }
  })
  const click = (e: MouseEvent) => {
    // 组件路径下使用上下文 Router，避免多个应用共存时误用活动 Router。
    if (
      (e as any).defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return
    }
    if (!r) return
    e.preventDefault()
    const nav = replace ? r.replace : r.push
    void nav(to)
  }

  // children is the compiler-provided default slot.
  return (
    <a
      href={routerLinkHref(to)}
      onClick={click}
      ref={linkRef}
      onPointerEnter={(event: Event) => prefetchOn(event, userPointerEnter)}
      onFocus={(event: Event) => prefetchOn(event, userFocus)}
      onPointerDown={(event: Event) => prefetchOn(event, userPointerDown)}
      onTouchStart={(event: Event) => prefetchOn(event, userTouchStart)}
      {...rest}
    >
      {props.children}
    </a>
  )
}

/**
 * 路由链接组件。
 *
 * 渲染为 `<a>`，默认拦截普通左键点击并调用 router.push；传入 replace 时调用
 * router.replace。href 会根据当前 history 模式生成，保证可复制和可降级。
 */
export const RouterLink = RouterLinkImpl

/** 获取当前路由匹配结果的响应式信号。 */
export const useRoute = (): SignalHandle<Route> => {
  const c = getCurrentAppTarget() as HTMLElement | null
  const r = c ? __routerByContainer.get(c) : __activeRouter
  if (!r) throw new Error('Router not installed for current application/container')

  return r.route
}
