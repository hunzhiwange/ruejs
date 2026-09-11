# 快速上手

初始化一个 Rue 项目并创建页面：

```bash
pnpm create vite@latest my-app -- --template vanilla
cd my-app
pnpm add @rue-js/rue @rue-js/router
```

在 `app.tsx` 中创建应用：

```tsx
import { type FC, useApp } from '@rue-js/rue'
import { RouterView } from '@rue-js/router'
import router from './router'

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

Rue 会自动将未被组件错误边界处理的运行时错误输出到控制台，无需额外安装或清理错误处理器。

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
