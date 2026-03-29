# 路由

Rue 提供 `rue-router` 作为官方路由方案，默认使用 Hash 模式，支持命名参数与正则匹配。

- 创建并安装 Router
- 定义路由与参数匹配
- 在视图中渲染与导航
- 使用运行时 API 获取当前路由

```tsx
import { type FC, useApp } from 'rue-js'
import { createRouter, createWebHashHistory, RouterView, RouterLink } from 'rue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/docs/:id(\\d+)', component: DocDetail }, // 命名参数 + 正则
  ],
})

const RootApp: FC = () => (
  <div>
    <nav className="space-x-2">
      <RouterLink to="/">首页</RouterLink>
      <RouterLink to="/docs/123">文档 123</RouterLink>
    </nav>
    <RouterView />
  </div>
)

useApp(RootApp).use(router).mount('#app')
```

## 历史模式

- `createWebHashHistory()`：基于 `location.hash` 的浏览器历史实现。无 `#` 时会自动跳转到 `#/`，并标准化位置字符串。
- `push('/path')` 与 `replace('/path')` 会更新 `hash`，并主动触发 `hashchange` 事件，确保响应式状态立即同步。

## 路由记录与参数匹配

- 路由记录类型：`{ path: string; component: FC<any> }`
- 路径可包含命名参数与可选正则：`/users/:id(\\d+)`、`/docs/:slug`
- 匹配时会将捕获到的参数解码并传递给组件的 `props.params`

示例：

```tsx
const routes = [
  { path: '/users/:id(\\d+)', component: UserDetail },
  { path: '/docs/:slug', component: DocDetail },
]

const UserDetail: FC<{ params: { id: string } }> = ({ params }) => <div>用户编号：{params.id}</div>
```

## 视图渲染：RouterView

- `RouterView` 会在固定的锚点区间内渲染当前匹配的组件
- 当无匹配时清空渲染区间；相同组件连续命中时避免重复渲染
- 匹配到的组件会收到 `{ params }` 作为 props

示例：

```tsx
const App: FC = () => (
  <main>
    <RouterView />
  </main>
)
```

## 链接导航：RouterLink

- `RouterLink` 渲染为 `<a>` 元素，默认拦截左键点击并执行导航
- `to` 指定目标路径；`replace` 为 `true` 时使用替换而非新增历史记录
- 其他传入的属性会透传给渲染的 `<a>`（例如 `className`）

示例：

```tsx
<RouterLink to="/posts/42" className="btn">查看文章</RouterLink>
<RouterLink to="/settings" replace>返回设置</RouterLink>
```

## 运行时 API

- `useRouter()`：获取当前上下文的 Router（容器优先，其次为活动路由）
- `useRoute()`：获取当前路由匹配结果的信号（`SignalHandle<Route>`）

示例：

```tsx
import { useRoute } from 'rue-router'

const Current: FC = () => {
  const route = useRoute()
  return <div>当前路径：{route.get()?.path}</div>
}
```

## 在应用中使用

- 在应用入口创建并挂载，安装路由作为插件

示例应用入口：

```tsx
import { type FC, useApp } from 'rue-js'
import { RouterView } from 'rue-router'
import router from './router'
import SiteLayout from './pages/site/components/Layout'

const RootApp: FC = () => (
  <SiteLayout>
    <RouterView />
  </SiteLayout>
)

useApp(RootApp).use(router).mount('#app')
```

## 最佳实践

- 路由优先级按定义顺序匹配，通用规则放在靠后位置
- 对需要约束格式的参数使用正则（如 `/orders/:id(\\d+)`）
- 使用 `replace` 避免在设置类页面产生过多历史栈记录
- 在组件中通过 `props.params` 读取参数，避免自行解析路径
