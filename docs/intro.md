# Rue 介绍

Rue 是一个轻量的前端框架，追求简单直观的开发体验，同时提供高性能渲染能力与易用的路由、状态管理。

- **轻量、直观**：简洁的 API 设计，快速上手
- **Block / Vapor 默认渲染**：编译产物优先走 Renderable / Block 路径，运行时围绕真实 DOM 做最小更新
- **易用的路由与组件**：内置路由系统，灵活的组件机制
- **响应式系统**：类似 Vue 的响应式 API，支持 ref、reactive、computed
- **JSX/TSX 支持**：使用 JSX 语法编写组件，无需学习模板语法

对于绝大多数应用代码，你只需要写模板或普通 JSX。只有在迁移旧的手写渲染逻辑时，才需要查看历史渲染术语与迁移说明。相关说明见 [默认 Block / Vapor 路径迁移](/guide/migration/renderable-default)。

```tsx
// 一个最简单的组件示例
import { type FC } from '@rue-js/rue'

const Hello: FC = () => <div>Hello Rue</div>

export default Hello
```

```tsx
// 带有状态的组件示例
import { type FC, ref } from '@rue-js/rue'

const Counter: FC = () => {
  const count = ref(0)

  return <button onClick={() => count.value++}>点击次数：{count.value}</button>
}

export default Counter
```
