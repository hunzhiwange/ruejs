# 快速上手

初始化一个 Rue 项目并创建页面：

```bash
pnpm create vite@latest my-app -- --template vanilla
cd my-app
pnpm add rue-js rue-router
```

在 `app.tsx` 中创建应用：

```tsx
import { type FC, useApp, useError } from 'rue-js'
import { RouterView } from 'rue-router'
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
import { createRouter } from 'rue-router'
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
