/*
路由架构概述
- 历史驱动：通过 HistoryLike 抽象适配不同历史实现（默认 Web Hash）。
- 信号状态：currentPath/route 使用响应式 signal 保存当前路径与匹配结果。
- 路由匹配：编译 path 模式为正则与参数键列表，实现 params 提取。
- 容器绑定：每个应用容器绑定一个 Router，支持通过 attachRouter/useRouter 访问。
- 视图渲染：RouterView 在单锚点前渲染匹配到的组件；RouterLink 处理导航行为与 children 归一化。
*/
import {
  type FC,
  type BlockInstance,
  type RenderTarget,
  h,
  signal,
  getCurrentContainer,
  type SignalHandle,
  renderAnchor,
  renderBetween,
  vapor,
  watchEffect,
  useSetup,
} from '@rue-js/rue'
import { extend } from '@rue-js/shared'

/** 路由静态记录：
 * - path：形如 '/users/:id(\\d+)' 的匹配模式（支持命名参数与可选正则）
 * - component：匹配成功时渲染的组件（接收 { params }）
 */
export type RouteRecord = { path: string; component: FC<any> }
/** 路由参数对象：命名参数的解码后字串映射 */
export type RouteParams = Record<string, string>
/** 当前路由匹配结果：
 * - record：命中的路由记录
 * - params：从路径中提取的参数
 * - path：当前匹配的原始路径
 * - 为 null 表示无匹配（RouterView 将清空渲染区域）
 */
export type Route = { record: RouteRecord; params: RouteParams; path: string } | null
/** Router 核心接口：
 * - currentPath：当前历史位置（字符串）信号
 * - route：当前匹配结果信号（Route 或 null）
 * - push/replace/back：导航 API，委托给历史实现
 * - routes：注册的路由表（顺序即匹配优先级）
 * - history：历史实现（HistoryLike）
 * - install：把 Router 绑定到当前容器上下文
 */
export type Router = {
  currentPath: SignalHandle<string>
  route: SignalHandle<Route>
  push: (p: string) => void
  replace: (p: string) => void
  back: () => void
  routes: RouteRecord[]
  history: HistoryLike
  install: (app: unknown, options: unknown[]) => void
}

/** 历史实现抽象：
 * - location：返回当前位置的字符串（不含井号的路径）
 * - push/replace：更新位置并通知监听者
 * - listen：订阅位置变化（用于驱动信号）
 * - back：可选，后退一步（Web 环境委托给 window.history）
 */
export type HistoryLike = {
  location: () => string
  push: (p: string) => void
  replace: (p: string) => void
  listen: (cb: () => void) => void
  back?: () => void
}

const __routerByContainer = new WeakMap<HTMLElement, Router>()
let __activeRouter: Router | null = null
/** 将 Router 绑定到当前容器并设置为活动路由 */
export const attachRouter = (router: Router) => {
  const c = getCurrentContainer() as HTMLElement | null
  if (c) __routerByContainer.set(c, router)
  __activeRouter = router
}

/** 创建基于 hash 的 Web 历史实现 */
export const createWebHashHistory = () => {
  const g = globalThis as any
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
  const listen = (cb: () => void) => {
    if (g && g.addEventListener) g.addEventListener('hashchange', cb)
  }
  return {
    location: loc,
    push: (p: string) => {
      const next = p.startsWith('#') ? p.slice(1) : p
      if (next === loc()) return
      if (g && g.location) {
        // 兼容传入 '#/path' 或 '/path' 两种形式
        g.location.hash = next
      }
      if (g && g.dispatchEvent && g.HashChangeEvent) {
        // 主动触发事件，确保响应式链路立刻更新
        g.dispatchEvent(new g.HashChangeEvent('hashchange'))
      }
    },
    replace: (p: string) => {
      const next = p.startsWith('#') ? p.slice(1) : p
      if (next === loc()) return
      const href = '#' + next
      if (g && g.location && typeof g.location.replace === 'function') {
        // 使用 location.replace 避免新增历史栈记录
        g.location.replace(href)
      }
      if (g && g.dispatchEvent && g.HashChangeEvent) {
        g.dispatchEvent(new g.HashChangeEvent('hashchange'))
      }
    },
    listen,
    back: () => {
      // 优先使用原生历史回退
      if (g && g.history && typeof g.history.back === 'function') g.history.back()
    },
  } as HistoryLike
}

/** 创建 Router
 * - 编译所有路由规则为正则与键列表
 * - 监听历史变化更新 currentPath 与 route
 * @param options {history, routes}
 * @returns Router 实例
 */
export const createRouter = (options: { history: HistoryLike; routes: RouteRecord[] }): Router => {
  // currentPath：受历史驱动的源信号；第三参 true 表示同步更新立即通知观察者
  const currentPath = signal(options.history.location(), {}, true)

  /** 编译路径模式为正则与参数键 */
  const compilePath = (path: string) => {
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

  // 预编译路由：在记录上挂载 _c 字段以便快速匹配
  const compiled = options.routes.map(
    r =>
      extend(r, {
        _c: compilePath(r.path),
      }) as RouteRecord & { _c: { re: RegExp; keys: string[] } },
  )

  /** 匹配路径并提取参数 */
  const match = (path: string): Route => {
    for (let i = 0; i < compiled.length; i++) {
      const r = compiled[i]
      // 顺序匹配，命中即返回（后续规则不再检查）
      const m = r._c.re.exec(path)
      if (m) {
        const params: RouteParams = {}
        // 将捕获组与命名键对应并解码
        r._c.keys.forEach((k: string, idx: number) => {
          params[k] = decodeURIComponent(m[idx + 1] || '')
        })
        return { record: r, params, path: path }
      }
    }
    // 未命中返回 null（交由视图层决定如何处理）
    return null
  }

  // route：派生信号，保存当前路径对应的匹配结果
  const matchRoute = match(currentPath.get())
  if (null === matchRoute) {
    throw new Error('No route matched path ' + currentPath.get())
  }
  const route = signal<Route>(matchRoute, {}, true)

  // 监听历史变化同步信号
  options.history.listen(() => {
    const p = options.history.location()
    // 去重：避免重复设置导致无意义的通知
    if (p === currentPath.get()) {
      return
    }
    const matchRoute = match(p)
    if (null === matchRoute) {
      throw new Error('No route matched path ' + p)
    }
    currentPath.set(p)
    route.set(matchRoute)
  })

  const router: Router = {
    currentPath,
    route,
    push: (p: string) => options.history.push(p),
    replace: (p: string) => options.history.replace(p),
    back: () => {
      // 优先使用 HistoryLike.back；否则退回到全局 history
      if (options.history.back) return options.history.back()
      const gg = globalThis as any
      if (gg.history && typeof gg.history.back === 'function') gg.history.back()
    },
    routes: options.routes,
    history: options.history,
    /** 插件安装：绑定当前 Router 到容器上下文 */
    install: (_app: unknown, _options: unknown[]) => {
      // 将当前 Router 记录到容器映射，并设为活动路由
      attachRouter(router)
    },
  }

  return router
}

/** 获取当前上下文的 Router（优先容器绑定，其次活动路由） */
export const useRouter = (): Router => {
  const c = getCurrentContainer() as HTMLElement | null
  const r = (c ? __routerByContainer.get(c) || null : null) || __activeRouter
  if (!r) throw new Error('Router not installed for current application/container')
  return r
}

const insertNodeAtTarget = (target: RenderTarget, node: Node) => {
  switch (target.kind) {
    case 'container':
      ;(target.container as Node).appendChild(node)
      return
    case 'between':
      ;(target.parent as Node).insertBefore(node, target.end as Node)
      return
    case 'anchor':
    case 'static':
      ;(target.parent as Node).insertBefore(node, target.anchor as Node)
      return
  }
}

const createRouteComponentBlock = (
  component: RouteRecord['component'],
  params: RouteParams,
): BlockInstance => {
  let start: Comment | null = null
  let end: Comment | null = null

  return {
    kind: 'block',
    mount(target) {
      const routeStart = document.createComment('rue-router-view-route-start')
      const routeEnd = document.createComment('rue-router-view-route-end')
      start = routeStart
      end = routeEnd
      insertNodeAtTarget(target, routeStart)
      insertNodeAtTarget(target, routeEnd)

      const parent =
        target.kind === 'container'
          ? (target.container as unknown as Node)
          : (target.parent as Node)
      renderBetween(
        h(component, { params }) as any,
        parent as any,
        routeStart as any,
        routeEnd as any,
      )
    },
    unmount() {
      if (!start || !end) {
        return
      }

      const parent = start.parentNode
      if (parent && end.parentNode === parent) {
        renderBetween([] as any, parent as any, start as any, end as any)

        let current = start.nextSibling
        while (current && current !== end) {
          const next = current.nextSibling
          parent.removeChild(current)
          current = next
        }

        parent.removeChild(start)
        parent.removeChild(end)
      }

      start = null
      end = null
    },
  }
}

/** RouterView：在单个尾锚点前渲染当前匹配组件 */
export const RouterView: FC = () => {
  const { container } = useSetup(() => {
    const r = useRouter()
    const container = document.createDocumentFragment()
    const anchorEl = document.createComment('rue-router-view-anchor')
    container.appendChild(anchorEl)

    watchEffect(() => {
      const data = r.route.get()
      const parent = (anchorEl as any).parentNode || container

      if (!data) {
        renderAnchor([] as any, parent, anchorEl)
      } else {
        renderAnchor(
          createRouteComponentBlock(data.record.component, data.params) as any,
          parent,
          anchorEl,
        )
      }
    })

    return { container }
  })

  return vapor(() => container)
}

type RouterLinkProps = { to: string; replace?: boolean } & Record<string, unknown>

type RouterLinkFastPath = FC<RouterLinkProps> & {
  __rueHref: (to: unknown) => string
  __rueOnClick: (e: MouseEvent, to: unknown, replace?: unknown) => void
}

const routerLinkHref = (to: unknown) => '#' + String(to || '')

const routerLinkNavigate = (to: unknown, replace?: unknown) => {
  const router = __activeRouter
  if (!router) throw new Error('Router not installed for current application/container')

  const path = String(to || '')
  const nav = replace ? router.replace : router.push
  nav(path)
}

const routerLinkOnClick = (e: MouseEvent, to: unknown, replace?: unknown) => {
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
  e.preventDefault()
  routerLinkNavigate(to, replace)
}

/** RouterLink：渲染链接并处理导航 */
const RouterLinkImpl: FC<RouterLinkProps> = props => {
  const r = useRouter()
  const to = String((props as any).to || '')
  const replace = !!(props as any).replace
  const { children, to: _to, replace: _replace, ...rest } = props as any

  const click = (e: MouseEvent) => {
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
    e.preventDefault()
    const nav = replace ? r.replace : r.push
    nav(to)
  }

  const childList = Array.isArray(children)
    ? (children as any[])
    : children != null
      ? [children]
      : []

  return h('a', { href: routerLinkHref(to), onClick: click, ...rest }, ...childList)
}

export const RouterLink = Object.assign(RouterLinkImpl, {
  __rueHref: routerLinkHref,
  __rueOnClick: routerLinkOnClick,
}) as RouterLinkFastPath

/** 获取当前路由信号 */
export const useRoute = () => {
  const c = getCurrentContainer() as HTMLElement | null
  const r = (c ? __routerByContainer.get(c) || null : null) || __activeRouter
  if (!r) throw new Error('Router not installed for current application/container')

  return r.route
}
