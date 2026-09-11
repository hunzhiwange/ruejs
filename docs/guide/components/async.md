# 异步组件 {#async-components}

## 基本用法 {#basic-usage}

在大型应用中，我们可能需要将应用分成更小的块，并且只在需要时从服务器加载组件。为了实现这一点，Rue 提供了 `useComponent`：

```tsx
import { useComponent } from '@rue-js/rue'

const AsyncComp = useComponent(() => {
  return new Promise((resolve, reject) => {
    // ...从服务器加载组件
    resolve(/* 加载的组件 */)
  })
})
// ... 像普通组件一样使用 `AsyncComp`
```

如你所见，`useComponent` 接受一个返回 Promise 的加载器函数。Promise 的 `resolve` 回调应该在从服务器检索到组件定义时调用。你也可以调用 `reject(reason)` 来指示加载失败。

[ES 模块动态导入](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) 也返回一个 Promise，所以大多数时候我们会将它与 `useComponent` 结合使用。像 Vite 和 webpack 这样的打包器也支持这种语法（并将其用作代码分割点），所以我们可以用它来导入组件：

```tsx
import { useComponent } from '@rue-js/rue'

const AsyncComp = useComponent(() => import('./components/MyComponent.tsx'))
```

生成的 `AsyncComp` 是一个包装器组件，仅在页面上实际渲染时才调用加载器函数。此外，它会将任何 props 和插槽传递给内部组件，因此你可以使用异步包装器无缝替换原始组件，同时实现懒加载。

异步组件必须绑定到静态标识符并直接用于 JSX；不支持运行时名称注册：

```tsx
const MyComponent = useComponent(() => import('./components/MyComponent.tsx'))

<MyComponent />
```

它们也可以直接在父组件中定义：

```tsx
import { useComponent } from '@rue-js/rue'

const AdminPage = useComponent(() => import('./components/AdminPageComponent.tsx'))

function Parent() {
  return <AdminPage />
}
```

## 加载和错误状态 {#loading-and-error-states}

异步操作不可避免地涉及加载和错误状态，`useComponent()` 支持通过高级选项处理这些状态：

```tsx
const AsyncComp = useComponent({
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

如果你使用旧写法 `useComponent(loader, { loading, error })`，则 `loading` 会立即渲染，不会使用这 200ms 默认延迟。

下面这个例子与 Rue 当前实现完全对应，涵盖了 `delay`、`timeout`、`onError` 和 `suspensible`：

```tsx
import { useComponent } from '@rue-js/rue'

const AsyncUserPanel = useComponent({
  loader: () => import('./UserPanel.tsx'),
  loadingComponent: () => <p>Loading user panel...</p>,
  errorComponent: ({ error }) => <p>Load failed: {error.message}</p>,
  delay: 200,
  timeout: 5000,
  suspensible: true,
  onError(error, retry, fail, attempts) {
    if (/fetch|network/i.test(error.message) && attempts < 3) {
      retry()
      return
    }
    fail()
  },
})
```

当前实现还有几个和常见异步组件写法相关、但值得明确说明的细节：

- `loader` 的成功结果既可以是组件本身，也可以是 `import()` 返回的 `{ default }` 模块对象。
- 如果指定了 `loadingComponent` 但未设置 `delay`，默认延迟是 `200ms`；如果加载在这之前完成，就不会渲染 loading。
- 如果使用旧写法 `useComponent(loader, { loading })`，则 loading 会立即显示，以保持旧接口兼容。
- 如果没有指定 `loadingComponent`，加载期间默认保持空白，不会渲染默认占位。
- Promise reject、`loader` 同步抛错、或超时都会走同一条错误处理路径，并把错误传给 `errorComponent`。
- `onError()` 需要显式调用 `retry()` 或 `fail()`；如果两者都不调用，当前实现会按失败处理。
- 同一个 `loader` 会被缓存复用，因此多个实例会共享加载状态，但各自仍有独立的渲染区间和 props。

## 懒加载水合 {#lazy-hydration}

Rue 的异步组件可以通过 `hydrate` 选项控制客户端何时激活组件。服务端渲染时，`loader` 仍会立即执行并参与 SSR pending 收集；客户端渲染时，传入的策略会决定何时启动异步组件。

内置策略需要按需导入：

```tsx
import {
  hydrateOnIdle,
  hydrateOnInteraction,
  hydrateOnMediaQuery,
  hydrateOnVisible,
  useComponent,
} from '@rue-js/rue'
```

### 空闲时水合 {#hydrate-on-idle}

```tsx
const AsyncComp = useComponent({
  loader: () => import('./Comp.tsx'),
  hydrate: hydrateOnIdle(5000),
})
```

`hydrateOnIdle()` 会通过 `requestIdleCallback` 激活组件；参数是可选的最大等待时间，默认 `10000ms`。

### 可见时水合 {#hydrate-on-visible}

```tsx
const AsyncComp = useComponent({
  loader: () => import('./Comp.tsx'),
  hydrate: hydrateOnVisible({ rootMargin: '100px' }),
})
```

`hydrateOnVisible()` 使用 `IntersectionObserver` 监听组件根元素，也可以传入标准的 observer options。

### 媒体查询命中时水合 {#hydrate-on-media-query}

```tsx
const AsyncComp = useComponent({
  loader: () => import('./Comp.tsx'),
  hydrate: hydrateOnMediaQuery('(min-width: 768px)'),
})
```

### 交互时水合 {#hydrate-on-interaction}

```tsx
const AsyncComp = useComponent({
  loader: () => import('./Comp.tsx'),
  hydrate: hydrateOnInteraction(['click', 'focus']),
})
```

触发水合的事件会在组件完成加载后重放一次，适合按钮、菜单、折叠面板这类首个交互很重要的组件。

### 自定义策略 {#custom-hydration-strategy}

```tsx
import { useComponent, type HydrationStrategy } from '@rue-js/rue'

const hydrateOnSignal: HydrationStrategy = (hydrate, forEachElement) => {
  const controller = new AbortController()

  forEachElement(el => {
    el.addEventListener('mouseenter', () => hydrate(), {
      once: true,
      signal: controller.signal,
    })
  })

  return () => {
    controller.abort()
  }
}

const AsyncComp = useComponent({
  loader: () => import('./Comp.tsx'),
  hydrate: hydrateOnSignal,
})
```

`forEachElement()` 会遍历异步组件当前可用的根元素；策略可以在合适时机调用 `hydrate()`，也可以返回清理函数用于卸载前移除监听器或 observer。

## 与 Suspense 一起使用 {#using-with-suspense}

异步组件可以与 `<Suspense>` 内置组件一起使用。默认情况下，`useComponent()` 会把仍在 pending 的加载任务登记到最近的 `<Suspense>` 边界；如果你希望组件始终自行控制 loading 和 error 状态，可以设置 `suspensible: false`。

`<Suspense>` 与异步组件之间的交互记录在 [`<Suspense>` 的专门章节](/guide/guide/built-ins/suspense)中。
