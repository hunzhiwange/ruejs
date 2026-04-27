# 路由 {#routing}

## 客户端路由

服务端路由意味着服务器根据用户访问的 URL 路径发送响应。

## 官方路由 {#official-router}

Rue 非常适合构建 SPA。对于大多数 SPA，建议使用官方支持的 [Rue Router](https://github.com/ruejs/router) 库。更多详情请参见 Rue Router 的[文档](https://router.ruejs.org/)。

## 从零开始实现简单路由 {#simple-routing-from-scratch}

如果你只需要非常简单的路由，不想引入完整功能的路由库，你可以使用[动态组件](/guide/essentials/component-basics#dynamic-components)来实现，并通过监听浏览器 [`hashchange` 事件](https://developer.mozilla.org/en-US/docs/Web/API/Window/hashchange_event) 或使用 [History API](https://developer.mozilla.org/en-US/docs/Web/API/History) 来更新当前组件状态。

以下是一个最简单的示例：

```tsx
import { ref, computed, type FC } from '@rue-js/rue'
import Home from './Home'
import About from './About'
import NotFound from './NotFound'

const routes: Record<string, FC> = {
  '/': Home,
  '/about': About,
}

export const App: FC = () => {
  const currentPath = ref(window.location.hash)

  window.addEventListener('hashchange', () => {
    currentPath.value = window.location.hash
  })

  const CurrentView = computed(() => {
    return routes[currentPath.value.slice(1) || '/'] || NotFound
  })

  return () => (
    <div>
      <a href="#/">首页</a> | <a href="#/about">关于</a> |{' '}
      <a href="#/non-existent-path">无效链接</a>
      <CurrentView.value />
    </div>
  )
}
```

这是一个使用 History API 的改进版本：

```tsx
import { ref, computed, type FC } from '@rue-js/rue'
import Home from './Home'
import About from './About'
import NotFound from './NotFound'

const routes: Record<string, FC> = {
  '/': Home,
  '/about': About,
}

export const App: FC = () => {
  const currentPath = ref(window.location.pathname)

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    currentPath.value = path
  }

  window.addEventListener('popstate', () => {
    currentPath.value = window.location.pathname
  })

  const CurrentView = computed(() => {
    return routes[currentPath.value] || NotFound
  })

  return () => (
    <div>
      <a
        href="/"
        onClick={e => {
          e.preventDefault()
          navigate('/')
        }}
      >
        首页
      </a>{' '}
      |{' '}
      <a
        href="/about"
        onClick={e => {
          e.preventDefault()
          navigate('/about')
        }}
      >
        关于
      </a>{' '}
      |{' '}
      <a
        href="/non-existent-path"
        onClick={e => {
          e.preventDefault()
          navigate('/non-existent-path')
        }}
      >
        无效链接
      </a>
      <CurrentView.value />
    </div>
  )
}
```

## 使用 @rue-js/router {#using-@rue-js/router}

对于生产环境应用，推荐使用 `@rue-js/router`。以下是一个基本示例：

```tsx
import { createRouter, createWebHistory, type RouteRecordRaw } from '@rue-js/router'
import { createApp } from '@rue-js/rue'
import Home from './views/Home'
import About from './views/About'

const routes: RouteRecordRaw[] = [
  { path: '/', component: Home },
  { path: '/about', component: About },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const app = createApp(App)
app.use(router)
app.mount('#app')
```

在组件中使用路由：

```tsx
import { useRoute, useRouter, type FC } from '@rue-js/rue'

export const UserProfile: FC = () => {
  const route = useRoute()
  const router = useRouter()

  const userId = route.params.id

  const goBack = () => {
    router.back()
  }

  return () => (
    <div>
      <h1>用户 {userId}</h1>
      <button onClick={goBack}>返回</button>
    </div>
  )
}
```

### 路由守卫

```tsx
import { useRouter } from '@rue-js/router'

const router = useRouter()

// 全局前置守卫
router.beforeEach((to, from) => {
  // 检查用户是否已登录
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return '/login'
  }
})

// 路由独享守卫
const routes = [
  {
    path: '/admin',
    component: Admin,
    beforeEnter: (to, from) => {
      // 权限检查
    },
  },
]
```

### 路由配置

```tsx
import { createRouter, createWebHistory } from '@rue-js/router'
import type { RouteRecordRaw } from '@rue-js/router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('./views/Home.tsx'),
  },
  {
    path: '/users/:id',
    name: 'User',
    component: () => import('./views/User.tsx'),
    props: true, // 将路由参数作为 props 传递给组件
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('./views/NotFound.tsx'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 返回 savedPosition 可以恢复之前的滚动位置
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  },
})
```
