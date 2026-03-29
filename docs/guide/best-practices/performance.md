# 性能 (Performance) {#performance}

## 概述 (Overview) {#overview}

Rue 旨在在大多数常见用例中具有良好的性能，无需太多手动优化。然而，总有一些具有挑战性的场景需要额外的微调。在本节中，我们将讨论在 Rue 应用中需要注意的性能问题。

首先，让我们讨论 Web 性能的两个主要方面：

- **页面加载性能**：应用在初次访问时显示内容并成为交互式的速度。这通常使用 [Largest Contentful Paint (LCP)](https://web.dev/lcp/) 和 [Interaction to Next Paint](https://web.dev/articles/inp) 等 Web 核心指标来衡量。

- **更新性能**：应用响应用户输入更新的速度。例如，当用户在搜索框中输入时列表更新的速度，或当用户单击单页应用 (SPA) 中的导航链接时页面切换的速度。

虽然理想情况下两者都应最大化，但不同的前端架构往往会影响在这些方面获得所需性能的难易程度。此外，您正在构建的应用类型极大地影响您应该在性能方面优先考虑什么。因此，确保最佳性能的第一步是为您正在构建的应用类型选择正确的架构：

- 查阅 [使用 Rue 的方式](/guide/extras/ways-of-using-rue) 了解如何以不同方式利用 Rue。

- Jason Miller 在 [应用原型](https://jasonformat.com/application-holotypes/) 中讨论了 Web 应用的类型及其各自的理想实现/交付方式。

## 性能分析选项 (Profiling Options) {#profiling-options}

要提高性能，我们首先需要知道如何衡量它。有许多优秀的工具可以帮助解决这个问题：

用于分析生产部署的加载性能：

- [PageSpeed Insights](https://pagespeed.web.dev/)
- [WebPageTest](https://www.webpagetest.org/)

用于分析本地开发期间的性能：

- [Chrome DevTools 性能面板](https://developer.chrome.com/docs/devtools/evaluate-performance/)
- Rue DevTools 扩展也提供性能分析功能。

## 页面加载优化 (Page Load Optimizations) {#page-load-optimizations}

有许多与框架无关的方面可以优化页面加载性能 - 查看 [此 web.dev 指南](https://web.dev/fast/) 以获取全面的总结。在这里，我们将主要关注 Rue 特定的技术。

### 选择正确的架构 (Choosing the Right Architecture) {#choosing-the-right-architecture}

如果您的用例对页面加载性能敏感，请避免将其作为纯客户端 SPA 交付。您希望服务器直接发送包含用户想要看到的内容的 HTML。纯客户端渲染存在内容到达时间慢的问题。这可以通过 [服务器端渲染 (SSR)](/guide/extras/ways-of-using-rue#fullstack-ssr) 或 [静态站点生成 (SSG)](/guide/extras/ways-of-using-rue#jamstack-ssg) 来缓解。查阅 [SSR 指南](/guide/scaling-up/ssr) 了解如何使用 Rue 执行 SSR。如果您的应用没有丰富的交互需求，您还可以使用传统的后端服务器来渲染 HTML 并在客户端用 Rue 增强它。

如果您的主应用必须是 SPA，但有营销页面（落地页、关于、博客），请将它们分开部署！您的营销页面最好使用 SSG 部署为具有最少 JS 的静态 HTML。

### 包大小和 Tree-shaking (Bundle Size and Tree-shaking) {#bundle-size-and-tree-shaking}

提高页面加载性能的最有效方法之一是提供更小的 JavaScript 包。以下是使用 Rue 时减小包大小的一些方法：

- 如果可能，请使用构建步骤。
  - 如果通过现代构建工具打包，Rue 的许多 API 都是 "可 tree-shake 的"。例如，如果您不使用内置的 `<Transition>` 组件，它不会包含在最终的生产包中。Tree-shaking 还可以移除源代码中未使用的其他模块。

  - 使用构建步骤时，模板会被预编译，因此我们不需要将 Rue 编译器发送到浏览器。这节省了 **14kb** min+gzipped 的 JavaScript 并避免了运行时编译成本。

- 引入新依赖时要注意大小！在实际应用中，臃肿的包通常是由于在不知情的情况下引入了重型依赖项造成的。
  - 如果使用构建步骤，请优先选择提供 ES 模块格式且支持 tree-shaking 的依赖项。例如，优先选择 `lodash-es` 而不是 `lodash`。

  - 检查依赖项的大小并评估它提供的功能是否值得。请注意，如果依赖项支持 tree-shaking，实际大小增加将取决于您实际从中导入的 API。像 [bundlejs.com](https://bundlejs.com/) 这样的工具可用于快速检查，但使用实际构建设置进行测量总是最准确的。

### 代码分割 (Code Splitting) {#code-splitting}

代码分割是构建工具将应用包分割成多个较小的块，然后可以按需或并行加载的过程。通过适当的代码分割，页面加载时所需的功能可以立即下载，额外的块只在需要时懒加载，从而提高性能。

像 Rollup（Vite 基于此）或 webpack 这样的打包工具可以通过检测 ESM 动态导入语法自动创建分割块：

```js
// lazy.js 及其依赖项将被分割成单独的块
// 并且只在调用 `loadLazy()` 时加载。
function loadLazy() {
  return import('./lazy.js')
}
```

懒加载最好用于初始页面加载后不需要立即使用的功能。在 Rue 应用中，这可以与 Rue 的 [异步组件](/guide/components/async) 功能结合使用，为组件树创建分割块：

```tsx
import { lazy } from 'rue-js'
import type { FC } from 'rue-js'

// 为 Foo.tsx 及其依赖项创建一个单独的块。
// 它只在异步组件在页面上渲染时按需获取。
const Foo = lazy(() => import('./Foo'))

const App: FC = () => {
  return (
    <div>
      <Foo />
    </div>
  )
}
```

对于使用 Rue Router 的应用，强烈建议对路由组件使用懒加载。Rue Router 对懒加载有显式支持，与 `lazy` 分开。详情请参阅 [懒加载路由](https://router.vuejs.org/guide/advanced/lazy-loading.html)。

## 更新优化 (Update Optimizations) {#update-optimizations}

### Props 稳定性 (Props Stability) {#props-stability}

在 Rue 中，子组件只有在接收到的至少一个 props 发生变化时才会更新。考虑以下示例：

```tsx
// 不理想的方式
list.map(item => <ListItem key={item.id} id={item.id} activeId={activeId} />)
```

在 `<ListItem>` 组件内部，它使用其 `id` 和 `activeId` props 来确定它是否是当前活动项。虽然这可行，但问题是每当 `activeId` 变化时，列表中的 **每个** `<ListItem>` 都必须更新！

理想情况下，只有活动状态发生变化的项才应该更新。我们可以通过将活动状态计算移到父组件中，并让 `<ListItem>` 直接接受 `active` prop 来实现：

```tsx
// 更好的方式
list.map(item => <ListItem key={item.id} id={item.id} active={item.id === activeId} />)
```

现在，对于大多数组件，当 `activeId` 变化时，`active` prop 将保持不变，因此它们不再需要更新。一般来说，想法是保持传递给子组件的 props 尽可能稳定。

### 使用 `memo` 优化 (Using memo) {#using-memo}

Rue 提供了 `memo` 工具来帮助优化组件重渲染。您可以使用它来记忆化组件或值：

```tsx
import { memo, useMemo } from 'rue-js'
import type { FC } from 'rue-js'

// 记忆化组件
const ExpensiveComponent: FC<{ data: Data }> = memo(({ data }) => {
  return <div>{/* 昂贵的渲染 */}</div>
})

// 在组件内部记忆化值
const MyComponent: FC = () => {
  const expensiveValue = useMemo(() => {
    return computeExpensiveValue(deps)
  }, [deps])

  return <div>{expensiveValue}</div>
}
```

### 计算稳定性 (Computed Stability) {#computed-stability}

使用 `useMemo` 时，只有当计算值从前一个值发生变化时，Rue 才会触发更新。例如，以下 `isEven` 计算只在返回值从 `true` 变为 `false` 或反之亦然时触发效果：

```tsx
import { useMemo, useState, useEffect } from 'rue-js'
import type { FC } from 'rue-js'

const MyComponent: FC = () => {
  const [count, setCount] = useState(0)
  const isEven = useMemo(() => count % 2 === 0, [count])

  useEffect(() => {
    console.log(isEven)
  }, [isEven]) // 只在 isEven 变化时触发

  // 不会触发新的日志，因为计算值保持 `true`
  // count: 2, 4 都不会触发

  return <div>{count}</div>
}
```

这减少了不必要的效果触发，但如果计算每次计算都创建一个新对象，则不起作用：

```tsx
const computedObj = useMemo(() => {
  return {
    isEven: count % 2 === 0,
  }
}, [count])
```

因为每次都创建一个新对象，所以新值在技术上总是与旧值不同。即使 `isEven` 属性保持不变，Rue 也无法知道，除非它对旧值和新值执行深度比较。这样的比较可能很昂贵，可能不值得。

相反，我们可以通过手动比较新值和旧值来优化，如果知道没有任何变化，则条件性地返回旧值：

```tsx
const computedObj = useMemo(
  oldValue => {
    const newValue = {
      isEven: count % 2 === 0,
    }
    if (oldValue && oldValue.isEven === newValue.isEven) {
      return oldValue
    }
    return newValue
  },
  [count],
)
```

注意，您应该在比较和返回旧值之前始终执行完整的计算，以便在每次运行时收集相同的依赖项。

## 一般优化 (General Optimizations) {#general-optimizations}

> 以下提示影响页面加载和更新性能。

### 虚拟化大型列表 (Virtualize Large Lists) {#virtualize-large-lists}

所有前端应用中最常见的性能问题之一是渲染大型列表。无论框架多么高性能，渲染包含数千个项目的列表 **都会** 很慢，因为浏览器需要处理大量的 DOM 节点。

然而，我们不一定需要预先渲染所有这些节点。在大多数情况下，用户的屏幕大小只能显示我们大型列表的一小部分。我们可以通过 **列表虚拟化** 大大提高性能，该技术只渲染大型列表中当前在视口内或靠近视口的项目。

实现列表虚拟化并不容易，幸运的是有现有的社区库可以直接使用：

- [react-window](https://github.com/bvaughn/react-window)
- [react-virtualized](https://github.com/bvaughn/react-virtualized)
- [@tanstack/react-virtual](https://tanstack.com/virtual/latest)

### 减少大型不可变结构的响应式开销 (Reduce Reactivity Overhead for Large Immutable Structures) {#reduce-reactivity-overhead-for-large-immutable-structures}

Rue 的响应式系统默认是深度的。虽然这使得状态管理直观，但当数据大小很大时，它确实会产生一定程度的开销，因为每次属性访问都会触发执行依赖跟踪的代理陷阱。这通常在处理深层嵌套对象的大型数组时变得明显，其中单个渲染需要访问 100,000 多个属性，因此它应该只影响非常特定的用例。

Rue 确实提供了一个逃生口，通过使用浅层状态选择退出深度响应式。浅层 API 创建仅在根级别具有响应式的状态，并暴露所有未更改的嵌套对象。这使嵌套属性访问保持快速，代价是我们现在必须将所有嵌套对象视为不可变的，并且更新只能通过替换根状态来触发：

```tsx
import { useState } from 'rue-js'
import type { FC } from 'rue-js'

const MyComponent: FC = () => {
  const [shallowArray, setShallowArray] = useState(() => [
    /* 大量深层对象 */
  ])

  // 这不会触发更新...
  const handlePush = () => {
    shallowArray.push(newObject)
  }

  // 这会：
  const handleAdd = () => {
    setShallowArray([...shallowArray, newObject])
  }

  return <div>{/* ... */}</div>
}
```

### 避免不必要的组件抽象 (Avoid Unnecessary Component Abstractions) {#avoid-unnecessary-component-abstractions}

有时我们可能会创建 [无渲染组件](/guide/components/slots#renderless-components) 或高阶组件（即使用额外 props 渲染其他组件的组件）以获得更好的抽象或代码组织。虽然这没有错，但请记住，组件实例比纯 DOM 节点昂贵得多，由于抽象模式创建太多组件实例会产生性能成本。

请注意，只减少几个实例不会有明显的效果，所以如果组件在应用中只渲染几次，请不要担心。考虑这种优化的最佳场景再次是大型列表。想象一下 100 个项目的列表，其中每个项目组件包含许多子组件。在这里删除一个不必要的组件抽象可能会导致数百个组件实例的减少。

## Rue 特定的性能提示 (Rue-Specific Performance Tips) {#rue-specific-performance-tips}

### 使用 `key` 属性 (Using the `key` Attribute) {#using-the-key-attribute}

在渲染列表时，始终使用稳定且唯一的 `key` 属性：

```tsx
// 好的做法
items.map(item => <div key={item.id}>{item.name}</div>)

// 避免 - 使用索引作为 key 可能导致性能问题
items.map((item, index) => <div key={index}>{item.name}</div>)
```

### 延迟加载非关键组件 (Lazy Load Non-Critical Components) {#lazy-load-non-critical-components}

对于不需要立即显示的组件，使用 `lazy` 进行延迟加载：

```tsx
import { lazy, Suspense } from 'rue-js'
import type { FC } from 'rue-js'

const HeavyComponent = lazy(() => import('./HeavyComponent'))

const App: FC = () => {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <HeavyComponent />
    </Suspense>
  )
}
```

### 优化事件处理程序 (Optimize Event Handlers) {#optimize-event-handlers}

使用 `useCallback` 来记忆化事件处理程序，避免不必要的子组件重渲染：

```tsx
import { useCallback, useState } from 'rue-js'
import type { FC } from 'rue-js'

const Parent: FC = () => {
  const [count, setCount] = useState(0)

  // 没有 useCallback，每次渲染都会创建新函数
  const handleClick = useCallback(() => {
    setCount(c => c + 1)
  }, [])

  return <Child onClick={handleClick} />
}

const Child: FC<{ onClick: () => void }> = memo(({ onClick }) => {
  return <button onClick={onClick}>点击</button>
})
```
