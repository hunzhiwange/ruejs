# 快速上手

初始化一个 Rue 项目并创建页面：

```bash
pnpm create vite@latest my-app -- --template vanilla
cd my-app
pnpm add @rue-js/rue @rue-js/router
```

在 `app.tsx` 中创建应用：

```tsx
import { type FC, useApp, useError } from '@rue-js/rue'
import { RouterView } from '@rue-js/router'
import router from './router'

// 启用错误处理
useError({ overlay: true, console: true })

const App: FC = () => {
  return (
    <div>
      <h1>我的 Rue 应用</h1>
      <RouterView />
    </div>
  )
}

// 创建并挂载应用
useApp(App).use(router).mount('#app')
```

在 `router/index.ts` 中配置路由：

```ts
import { createRouter } from '@rue-js/router'
import Home from '../pages/Home'
import About from '../pages/About'

export default createRouter({
  history: 'hash',
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
  ],
})
```

## 关于默认渲染路径

Rue 当前默认会把模板和 JSX 编译成 Block / Vapor 导向的渲染产物。大多数应用不需要手写历史渲染 helper，也不需要感知任何 compat 层。

如果你在迁移历史代码，并且还在使用旧的手写渲染 helper，需要直接改写到默认 Renderable / children / raw node 路径。显式 compat 子路径已经删除，不再提供过渡导入。

迁移细节见 [默认 Block / Vapor 路径迁移](/guide/migration/renderable-default)。
