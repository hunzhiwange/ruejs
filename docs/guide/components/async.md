# 异步组件 {#async-components}

## 基本用法 {#basic-usage}

在大型应用中，我们可能需要将应用分成更小的块，并且只在需要时从服务器加载组件。为了实现这一点，Rue 提供了 `defineAsyncComponent` 函数：

```tsx
import { defineAsyncComponent } from '@rue-js/rue'

const AsyncComp = defineAsyncComponent(() => {
  return new Promise((resolve, reject) => {
    // ...从服务器加载组件
    resolve(/* 加载的组件 */)
  })
})
// ... 像普通组件一样使用 `AsyncComp`
```

如你所见，`defineAsyncComponent` 接受一个返回 Promise 的加载器函数。Promise 的 `resolve` 回调应该在从服务器检索到组件定义时调用。你也可以调用 `reject(reason)` 来指示加载失败。

[ES 模块动态导入](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) 也返回一个 Promise，所以大多数时候我们会将它与 `defineAsyncComponent` 结合使用。像 Vite 和 webpack 这样的打包器也支持这种语法（并将其用作代码分割点），所以我们可以用它来导入组件：

```tsx
import { defineAsyncComponent } from '@rue-js/rue'

const AsyncComp = defineAsyncComponent(() => import('./components/MyComponent.tsx'))
```

生成的 `AsyncComp` 是一个包装器组件，仅在页面上实际渲染时才调用加载器函数。此外，它会将任何 props 和插槽传递给内部组件，因此你可以使用异步包装器无缝替换原始组件，同时实现懒加载。

与常规组件一样，异步组件可以使用 `app.component()` [全局注册](/guide/components/registration#global-registration)：

```tsx
app.component(
  'MyComponent',
  defineAsyncComponent(() => import('./components/MyComponent.tsx')),
)
```

它们也可以直接在父组件中定义：

```tsx
import { defineAsyncComponent } from '@rue-js/rue'

const AdminPage = defineAsyncComponent(() => import('./components/AdminPageComponent.tsx'))

function Parent() {
  return <AdminPage />
}
```

## 加载和错误状态 {#loading-and-error-states}

异步操作不可避免地涉及加载和错误状态 - `defineAsyncComponent()` 支持通过高级选项处理这些状态：

```tsx
const AsyncComp = defineAsyncComponent({
  // 加载器函数
  loader: () => import('./Foo.tsx'),

  // 异步组件加载时使用的组件
  loadingComponent: LoadingComponent,
  // 显示加载组件前的延迟。默认：200ms。
  delay: 200,

  // 加载失败时使用的组件
  errorComponent: ErrorComponent,
  // 如果提供了超时时间并超过，将显示错误组件。默认：Infinity。
  timeout: 3000,
})
```

如果提供了加载组件，它将在内部组件加载时首先显示。在显示加载组件之前有默认的 200ms 延迟——这是因为在快速网络上，即时加载状态可能会太快被替换，最终看起来像是闪烁。

如果提供了错误组件，它将在加载器函数返回的 Promise 被拒绝时显示。你还可以指定超时时间，在请求时间过长时显示错误组件。

## 懒加载水合 <sup class="vt-badge" data-text="3.5+" /> {#lazy-hydration}

> 本节仅在你使用[服务端渲染](/guide/scaling-up/ssr)时适用。

在 Vue 3.5+ 中，异步组件可以通过提供水合策略来控制何时进行水合。

- Vue 提供了许多内置的水合策略。这些内置策略需要单独导入，以便在不使用时可以被 tree-shake。

- 设计是故意低级别的，以获得灵活性。编译器语法糖可以在未来建立在核心或更高级别的解决方案（例如 Nuxt）之上。

### 空闲时水合 {#hydrate-on-idle}

通过 `requestIdleCallback` 进行水合：

```tsx
import { defineAsyncComponent, hydrateOnIdle } from '@rue-js/rue'

const AsyncComp = defineAsyncComponent({
  loader: () => import('./Comp.tsx'),
  hydrate: hydrateOnIdle(/* 可选传递最大超时时间 */),
})
```

### 可见时水合 {#hydrate-on-visible}

当元素通过 `IntersectionObserver` 可见时进行水合。

```tsx
import { defineAsyncComponent, hydrateOnVisible } from '@rue-js/rue'

const AsyncComp = defineAsyncComponent({
  loader: () => import('./Comp.tsx'),
  hydrate: hydrateOnVisible(),
})
```

可以可选地传入观察者的选项对象值：

```tsx
hydrateOnVisible({ rootMargin: '100px' })
```

### 媒体查询时水合 {#hydrate-on-media-query}

当指定的媒体查询匹配时进行水合。

```tsx
import { defineAsyncComponent, hydrateOnMediaQuery } from '@rue-js/rue'

const AsyncComp = defineAsyncComponent({
  loader: () => import('./Comp.tsx'),
  hydrate: hydrateOnMediaQuery('(max-width:500px)'),
})
```

### 交互时水合 {#hydrate-on-interaction}

当在组件元素上触发指定事件时进行水合。触发水合的事件也会在水合完成后重放。

```tsx
import { defineAsyncComponent, hydrateOnInteraction } from '@rue-js/rue'

const AsyncComp = defineAsyncComponent({
  loader: () => import('./Comp.tsx'),
  hydrate: hydrateOnInteraction('click'),
})
```

也可以是多个事件类型的列表：

```tsx
hydrateOnInteraction(['wheel', 'mouseover'])
```

### 自定义策略 {#custom-strategy}

```tsx
import { defineAsyncComponent, type HydrationStrategy } from '@rue-js/rue'

const myStrategy: HydrationStrategy = (hydrate, forEachElement) => {
  // forEachElement 是一个辅助函数，用于遍历组件非水合 DOM 中的所有根元素，
  // 因为根可以是片段而不是单个元素
  forEachElement(el => {
    // ...
  })
  // 准备好时调用 `hydrate`
  hydrate()
  return () => {
    // 如果需要，返回一个清理函数
  }
}

const AsyncComp = defineAsyncComponent({
  loader: () => import('./Comp.tsx'),
  hydrate: myStrategy,
})
```

## 与 Suspense 一起使用 {#using-with-suspense}

异步组件可以与 `<Suspense>` 内置组件一起使用。`<Suspense>` 与异步组件之间的交互记录在 [`<Suspense>` 的专门章节](/guide/built-ins/suspense)中。
