# Suspense {#suspense}

:::warning 实验性功能
`<Suspense>` 是一个实验性功能。它不能保证达到稳定状态，API 在达到之前可能会发生变化。
:::

`<Suspense>` 是一个内置组件，用于协调组件树中的异步依赖。它可以在等待组件树中多个嵌套的异步依赖解析时渲染加载状态。

## 异步依赖 (Async Dependencies) {#async-dependencies}

为了解释 `<Suspense>` 试图解决的问题以及它如何与这些异步依赖交互，让我们想象一个如下的组件层次结构：

```
<Suspense>
└─ <Dashboard>
   ├─ <Profile>
   │  └─ <FriendStatus> (具有异步数据的组件)
   └─ <Content>
      ├─ <ActivityFeed> (异步组件)
      └─ <Stats> (异步组件)
```

在组件树中，有多个嵌套组件，其渲染依赖于某些异步资源首先解析。没有 `<Suspense>`，每个组件都需要处理自己的加载/错误和加载完成状态。在最坏的情况下，我们可能会在页面上看到三个加载旋转器，内容在不同时间显示。

`<Suspense>` 组件使我们能够在等待这些嵌套异步依赖解析时显示顶级加载/错误状态。

`<Suspense>` 可以等待两种类型的异步依赖：

1. 具有异步数据获取的组件。这包括使用 `useEffect` 或 `useQuery` 等 hooks 进行数据获取的组件。

2. [异步组件](/guide/components/async)。

### 异步数据获取 (Async Data Fetching) {#async-data-fetching}

组件可以使用 hooks 获取异步数据：

```tsx
import { useEffect, useState } from 'rue-js'
import type { FC } from 'rue-js'

const Posts: FC = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        setPosts(data)
        setLoading(false)
      })
  }, [])

  if (loading) return <div>加载中...</div>

  return <div>{JSON.stringify(posts)}</div>
}
```

### 异步组件 (Async Components) {#async-components}

异步组件默认是 **"可暂停的"**。这意味着如果父链中有 `<Suspense>`，它将被视为该 `<Suspense>` 的异步依赖。在这种情况下，加载状态将由 `<Suspense>` 控制，组件自己的加载、错误、延迟和超时选项将被忽略。

异步组件可以通过在其选项中指定 `suspensible: false` 来选择退出 `Suspense` 控制，让组件始终控制自己的加载状态。

## 加载状态 (Loading State) {#loading-state}

`<Suspense>` 组件有两个插槽：`children` 和 `fallback`。当异步依赖正在解析时，将显示 `fallback` 内容。

```tsx
import { Suspense } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = () => {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      {/* 具有嵌套异步依赖的组件 */}
      <Dashboard />
    </Suspense>
  )
}
```

在初始渲染时，`<Suspense>` 将在内存中渲染其 `children` 内容。如果在过程中遇到任何异步依赖，它将进入 **待处理** 状态。在待处理状态期间，将显示 `fallback` 内容。当所有遇到的异步依赖都已解析时，`<Suspense>` 进入 **已解析** 状态并显示已解析的 `children` 内容。

如果在初始渲染期间没有遇到异步依赖，`<Suspense>` 将直接进入已解析状态。

一旦处于已解析状态，`<Suspense>` 只会在 `children` 的根节点被替换时恢复为待处理状态。树中更深嵌套的新异步依赖 **不会** 导致 `<Suspense>` 恢复为待处理状态。

当发生恢复时，`fallback` 内容不会立即显示。相反，`<Suspense>` 将显示之前的 `children` 内容，同时等待新内容及其异步依赖被解析。此行为可以使用 `timeout` prop 配置：如果在 `timeout` 毫秒内渲染新的默认内容需要更长时间，`<Suspense>` 将切换到 `fallback` 内容。`timeout` 值为 `0` 将导致在替换默认内容时立即显示 `fallback` 内容。

## 事件 (Events) {#events}

`<Suspense>` 组件发出 3 个事件：`onPending`、`onResolve` 和 `onFallback`。`onPending` 事件在进入待处理状态时发生。`onResolve` 事件在新的内容在 `children` 中完成解析时发出。`onFallback` 事件在显示 `fallback` 内容时触发。

这些事件可用于，例如，在加载新组件时在旧 DOM 前显示加载指示器。

## 错误处理 (Error Handling) {#error-handling}

`<Suspense>` 目前本身不提供错误处理 - 但是，您可以使用错误边界来捕获和处理 `<Suspense>` 中的异步错误。

```tsx
import { Suspense, ErrorBoundary } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = () => {
  return (
    <ErrorBoundary fallback={<div>出错了！</div>}>
      <Suspense fallback={<div>加载中...</div>}>
        <Dashboard />
      </Suspense>
    </ErrorBoundary>
  )
}
```

## 与其他组件结合使用 (Combining with Other Components) {#combining-with-other-components}

通常希望将 `<Suspense>` 与 [`<Transition>`](./transition) 和 [`<KeepAlive>`](./keep-alive) 组件结合使用。这些组件的嵌套顺序对于使它们都正常工作很重要。

此外，这些组件通常与来自 [Rue Router](https://router.vuejs.org/) 的 `<RouterView>` 组件结合使用。

以下示例显示如何嵌套这些组件以使它们都按预期工作。对于更简单的组合，您可以移除不需要的组件：

```tsx
import { Suspense, KeepAlive, Transition } from 'rue-js'
import { RouterView } from 'rue-js-router'
import type { FC } from 'rue-js'

const App: FC = () => {
  return (
    <RouterView>
      {({ Component }) =>
        Component && (
          <Transition mode="outIn">
            <KeepAlive>
              <Suspense fallback={<div>加载中...</div>}>
                <Component />
              </Suspense>
            </KeepAlive>
          </Transition>
        )
      }
    </RouterView>
  )
}
```

Rue Router 内置支持使用动态导入 [懒加载组件](https://router.vuejs.org/guide/advanced/lazy-loading.html)。这些与异步组件不同，目前它们不会触发 `<Suspense>`。但是，它们仍然可以有作为后代的异步组件，这些可以以通常的方式触发 `<Suspense>`。

## 嵌套 Suspense (Nested Suspense) {#nested-suspense}

当我们有多个异步组件（对于嵌套或基于布局的路由很常见）时：

```tsx
<Suspense>
  <DynamicOuter>
    <DynamicInner />
  </DynamicOuter>
</Suspense>
```

`<Suspense>` 创建一个边界，将解析树中的所有异步组件，如预期的那样。但是，当我们更改 `DynamicOuter` 时，`<Suspense>` 正确地等待它，但当我们更改 `DynamicInner` 时，嵌套的 `DynamicInner` 在解析完成之前渲染一个空节点（而不是之前的节点或 fallback 插槽）。

为了解决这个问题，我们可以有一个嵌套的 suspense 来处理嵌套组件的补丁：

```tsx
<Suspense>
  <DynamicOuter>
    <Suspense suspensible>
      <DynamicInner />
    </Suspense>
  </DynamicOuter>
</Suspense>
```

如果您不设置 `suspensible` prop，内部的 `<Suspense>` 将被父 `<Suspense>` 视为同步组件。这意味着它有自己的 fallback 插槽，如果两个 `Dynamic` 组件同时更改，在子 `<Suspense>` 加载其自己的依赖树时可能会有空节点和多个补丁周期，这可能不是期望的。设置后，所有异步依赖处理都交给父 `<Suspense>`（包括发出的事件），内部 `<Suspense>` 仅作为依赖解析和补丁的另一个边界。

---

**相关**

- [`<Suspense>` API 参考](/api/built-in-components#suspense)
