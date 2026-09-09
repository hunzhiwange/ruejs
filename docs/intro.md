# Rue 介绍

Rue 是一个轻量的前端框架，追求简单直观的开发体验，同时提供高性能渲染能力与易用的路由、状态管理。

- **轻量、直观**：简洁的 API 设计，快速上手
- **编译驱动的原生 DOM 渲染**：静态 JSX 可直接生成 DOM 操作，不引入 Rue 值运行时
- **易用的路由与组件**：内置路由系统，灵活的组件机制
- **响应式系统**：直观的响应式 API，支持 ref、signal、computed，并贯穿组件与渲染更新
- **JSX/TSX 支持**：使用 JSX 语法编写组件，无需学习模板语法

对于绝大多数应用代码，你只需要从 `@rue-js/rue` 导入 API 并编写普通 JSX。构建插件会根据代码实际使用的能力选择三层输出：纯静态 JSX 直接生成 DOM、Signal 交互只加载 compiled core，组件边界和复杂结构则按需回退到 Vapor 兼容层。

这意味着静态页面可以没有 Rue 值运行时，常见交互也不必携带完整运行时；它不意味着所有 Rue 应用都绝对零运行时。使用组件、路由、Hydration、Teleport、Transition、异步 renderable 或其他复杂能力时，相应的兼容实现仍会进入产物。

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
