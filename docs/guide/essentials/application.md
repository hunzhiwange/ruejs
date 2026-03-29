# 创建 Rue 应用 {#creating-a-rue-application}

## 应用实例 {#the-application-instance}

每个 Rue 应用都通过 [`useApp`](/api/application#useapp) 函数创建一个新的**应用实例**：

```tsx
import { type FC, useApp } from 'rue-js'

const App: FC = () => {
  return <div>Hello Rue!</div>
}

const app = useApp(App)
```

## 根组件 {#the-root-component}

传递给 `useApp` 的 `App` 是根组件。每个应用都需要一个"根组件"，它可以包含其他组件作为其子组件。

如果应用使用 JSX/TSX，我们通常从另一个文件导入根组件：

```tsx
import { useApp } from 'rue-js'
import App from './App'

const app = useApp(App)
```

虽然本指南中的许多示例只需要单个组件，但大多数真实应用都是由嵌套的可重用组件组成的树。例如，一个待办事项应用的组件树可能如下所示：

```
App (根组件)
├─ TodoList
│  └─ TodoItem
│     ├─ TodoDeleteButton
│     └─ TodoEditButton
└─ TodoFooter
   ├─ TodoClearButton
   └─ TodoStatistics
```

在本指南的后续部分中，我们将讨论如何定义和组合多个组件。在此之前，我们将专注于单个组件内部的内容。

## 挂载应用 {#mounting-the-app}

应用实例在调用 `.mount()` 方法之前不会渲染任何内容。它需要一个"容器"参数，可以是实际的 DOM 元素或选择器字符串：

```html
<div id="app"></div>
```

```tsx
app.mount('#app')
```

应用的根组件内容将渲染在容器元素内部。容器元素本身不被视为应用的一部分。

`.mount()` 方法应在所有应用配置和资源注册完成后调用。还要注意，其返回值与资源注册方法不同，返回的是根组件实例而不是应用实例。

## 应用配置 {#app-configurations}

应用实例暴露了一个 `.config` 对象，允许我们配置一些应用级选项。例如，定义一个应用级错误处理器来捕获所有后代组件的错误：

```tsx
import { useError } from 'rue-js'

useError({
  overlay: true, // 显示错误遮罩层
  console: true, // 在控制台输出错误
})
```

应用实例还提供了一些用于注册应用范围资源的方法。例如，注册一个插件：

```tsx
import { useApp } from 'rue-js'
import router from './router'
import { createPlugin } from '@rue-js/plugin'

const rustPlugin = createPlugin()

useApp(App)
  .use(router)
  .use(rustPlugin, [{ name: 'demo' }])
  .mount('#app')
```

这使得 `router` 和 `rustPlugin` 可以在我们的整个应用中使用。我们将在本指南的后续部分讨论组件和其他类型资源的注册。你还可以在其 [API 参考](/api/application) 中浏览应用实例 API 的完整列表。

确保在挂载应用之前应用所有应用配置！

## 多个应用实例 {#multiple-application-instances}

在同一页面上不限于单个应用实例。`useApp` API 允许多个 Rue 应用在同一页面上共存，每个都有自己的配置和全局资源范围：

```tsx
const app1 = useApp(App1)
app1.mount('#container-1')

const app2 = useApp(App2)
app2.mount('#container-2')
```

如果你使用 Rue 来增强服务器渲染的 HTML，并且只需要 Rue 控制大页面的特定部分，请避免在整个页面上挂载单个 Rue 应用实例。相反，创建多个小型应用实例，并将它们挂载在它们负责的各个元素上。

## 快速开始示例 {#quick-start-example}

以下是一个完整的 Rue 应用示例：

```tsx
// main.tsx
import { type FC, useApp, useError } from 'rue-js'
import { RouterView } from '@rue-js/router'
import router from './router'

// 启用错误处理
useError({ overlay: true, console: true })

// 根组件
const App: FC = () => {
  return (
    <div className="app">
      <header>
        <h1>我的 Rue 应用</h1>
      </header>
      <main>
        <RouterView />
      </main>
    </div>
  )
}

// 创建并挂载应用
useApp(App).use(router).mount('#app')
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Rue App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```
