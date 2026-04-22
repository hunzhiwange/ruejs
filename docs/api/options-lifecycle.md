# 选项：生命周期 {#options-lifecycle} @todo

> **@todo**: 整个 Options API 尚未实现。Rue 目前仅支持 Composition API / FC 模式。

:::info 另请参阅
有关生命周期钩子的共享使用，请参阅[指南 - 生命周期钩子](/guide/essentials/lifecycle)
:::

## beforeCreate {#beforecreate}

在实例初始化时调用。

- **类型**

  ```ts
  interface ComponentOptions {
    beforeCreate?(this: ComponentPublicInstance): void
  }
  ```

- **详情**

  在实例初始化且 props 已解析后立即调用。

  然后 props 将被定义为响应式属性，状态如 `data()` 或 `computed` 将被设置。

  注意，组合式 API 的 `setup()` 钩子在任何选项式 API 钩子之前调用，甚至包括 `beforeCreate()`。

## created {#created}

在实例处理完所有与状态相关的选项后调用。

- **类型**

  ```ts
  interface ComponentOptions {
    created?(this: ComponentPublicInstance): void
  }
  ```

- **详情**

  调用此钩子时，以下内容已设置：响应式数据、计算属性、方法和侦听器。但是，挂载阶段尚未开始，`$el` 属性还不可用。

## beforeMount {#beforemount}

在组件即将挂载之前调用。

- **类型**

  ```ts
  interface ComponentOptions {
    beforeMount?(this: ComponentPublicInstance): void
  }
  ```

- **详情**

  调用此钩子时，组件已完成设置其响应式状态，但尚未创建 DOM 节点。它即将首次执行其 DOM 渲染 effect。

  **此钩子在服务器端渲染期间不会被调用。**

## mounted {#mounted}

在组件挂载后调用。

- **类型**

  ```ts
  interface ComponentOptions {
    mounted?(this: ComponentPublicInstance): void
  }
  ```

- **详情**

  组件在以下情况下被视为已挂载：
  - 所有其同步子组件都已挂载（不包括异步组件或 `<Suspense>` 树内的组件）。

  - 其自身的 DOM 树已创建并插入到父容器中。注意，只有当应用的根容器也在文档中时，它才保证组件的 DOM 树在文档中。

  这个钩子通常用于执行需要访问组件渲染 DOM 的副作用，或用于在[服务器渲染应用](/guide/scaling-up/ssr)中将 DOM 相关代码限制在客户端。

  **此钩子在服务器端渲染期间不会被调用。**

## beforeUpdate {#beforeupdate}

在组件即将因响应式状态更改而更新其 DOM 树之前调用。

- **类型**

  ```ts
  interface ComponentOptions {
    beforeUpdate?(this: ComponentPublicInstance): void
  }
  ```

- **详情**

  此钩子可用于在 Vue 更新 DOM 之前访问 DOM 状态。在此钩子中修改组件状态也是安全的。

  **此钩子在服务器端渲染期间不会被调用。**

## updated {#updated}

在组件因响应式状态更改而更新其 DOM 树后调用。

- **类型**

  ```ts
  interface ComponentOptions {
    updated?(this: ComponentPublicInstance): void
  }
  ```

- **详情**

  父组件的更新钩子在其子组件之后调用。

  此钩子在组件的任何 DOM 更新后调用，这可能由不同的状态更改引起。如果你需要在特定状态更改后访问更新后的 DOM，请改用 [nextTick()](/api/general#nexttick)。

  **此钩子在服务器端渲染期间不会被调用。**

  :::warning
  不要在 updated 钩子中修改组件状态——这很可能导致无限更新循环！
  :::

## beforeUnmount {#beforeunmount}

在组件实例即将卸载之前调用。

- **类型**

  ```ts
  interface ComponentOptions {
    beforeUnmount?(this: ComponentPublicInstance): void
  }
  ```

- **详情**

  当调用此钩子时，组件实例仍然完全可用。

  **此钩子在服务器端渲染期间不会被调用。**

## unmounted {#unmounted}

在组件卸载后调用。

- **类型**

  ```ts
  interface ComponentOptions {
    unmounted?(this: ComponentPublicInstance): void
  }
  ```

- **详情**

  组件在以下情况下被视为已卸载：
  - 所有其子组件都已卸载。

  - 所有其关联的响应式 effect（渲染 effect 和在 `setup()` 期间创建的 computed/watchers）都已停止。

  使用此钩子清理手动创建的副作用，如计时器、DOM 事件监听器或服务器连接。

  **此钩子在服务器端渲染期间不会被调用。**

## errorCaptured {#errorcaptured}

在从后代组件捕获到传播的错误时调用。

- **类型**

  ```ts
  interface ComponentOptions {
    errorCaptured?(
      this: ComponentPublicInstance,
      err: unknown,
      instance: ComponentPublicInstance | null,
      info: string,
    ): boolean | void
  }
  ```

- **详情**

  可以从以下源捕获错误：
  - 组件渲染
  - 事件处理器
  - 生命周期钩子
  - `setup()` 函数
  - Watchers
  - 自定义指令钩子
  - 过渡钩子

  钩子接收三个参数：错误、触发错误的组件实例，以及一个指定错误源类型的信息字符串。

  :::tip
  在生产中，第三个参数 (`info`) 将是一个简写代码而不是完整的信息字符串。你可以在[生产错误代码参考](/error-reference/#runtime-errors)中找到代码到字符串的映射。
  :::

  你可以在 `errorCaptured()` 中修改组件状态以向用户显示错误状态。然而，重要的是错误状态不应渲染导致错误的原始内容；否则组件将陷入无限渲染循环。

  钩子可以返回 `false` 来阻止错误进一步传播。请参阅下面的错误传播详情。

  **错误传播规则**
  - 默认情况下，所有错误仍将发送到应用程序级 [`app.config.errorHandler`](/api/application#app-config-errorhandler)（如果已定义），以便这些错误仍可以在一个地方报告给分析服务。

  - 如果组件的继承链或父链上存在多个 `errorCaptured` 钩子，它们都将按从下到上的顺序在同一个错误上调用。这类似于原生 DOM 事件的冒泡机制。

  - 如果 `errorCaptured` 钩子本身抛出错误，则此错误和原始捕获的错误都将发送到 `app.config.errorHandler`。

  - `errorCaptured` 钩子可以返回 `false` 来阻止错误进一步传播。这实质上是说"此错误已处理，应忽略"。它将阻止为此错误调用任何额外的 `errorCaptured` 钩子或 `app.config.errorHandler`。

  **错误捕获注意事项**
  - 在具有异步 `setup()` 函数（带有顶层 `await`）的组件中，Vue **总是**尝试渲染组件模板，即使 `setup()` 抛出错误。这很可能导致更多错误，因为在渲染期间组件模板可能尝试访问失败的 `setup()` 上下文的非现有属性。在此类组件中捕获错误时，请准备好处理来自失败的异步 `setup()`（它们总是首先出现）和失败的渲染过程的错误。

  - 在父组件中深层替换 `<Suspense>` 内的错误子组件将导致 SSR 中的水合不匹配。相反，尝试将可能从子 `setup()` 抛出的逻辑分离到单独的函数中，并在父组件的 `setup()` 中执行它，在那里你可以安全地对执行过程进行 `try/catch` 并在需要时进行替换，然后再渲染实际的子组件。

## renderTracked {#rendertracked}

在组件的渲染 effect 追踪到响应式依赖时调用。

**此钩子仅在开发模式下可用，不会在服务器端渲染期间调用。**

- **类型**

  ```ts
  interface ComponentOptions {
    renderTracked?(this: ComponentPublicInstance, e: DebuggerEvent): void
  }

  type DebuggerEvent = {
    effect: ReactiveEffect
    target: object
    type: TrackOpTypes /* 'get' | 'has' | 'iterate' */
    key: any
  }
  ```

- **另请参阅** [深入响应式系统](/guide/extras/reactivity-in-depth)

## renderTriggered {#rendertriggered}

在响应式依赖触发组件的渲染 effect 重新运行时调用。

**此钩子仅在开发模式下可用，不会在服务器端渲染期间调用。**

- **类型**

  ```ts
  interface ComponentOptions {
    renderTriggered?(this: ComponentPublicInstance, e: DebuggerEvent): void
  }

  type DebuggerEvent = {
    effect: ReactiveEffect
    target: object
    type: TriggerOpTypes /* 'set' | 'add' | 'delete' | 'clear' */
    key: any
    newValue?: any
    oldValue?: any
    oldTarget?: Map<any, any> | Set<any>
  }
  ```

- **另请参阅** [深入响应式系统](/guide/extras/reactivity-in-depth)

## activated {#activated}

在组件实例作为被 [`<KeepAlive>`](/api/built-in-components#keepalive) 缓存的树的一部分插入到 DOM 后调用。

**此钩子在服务器端渲染期间不会被调用。**

- **类型**

  ```ts
  interface ComponentOptions {
    activated?(this: ComponentPublicInstance): void
  }
  ```

- **另请参阅** [指南 - 缓存实例的生命周期](/guide/built-ins/keep-alive#lifecycle-of-cached-instance)

## deactivated {#deactivated}

在组件实例作为被 [`<KeepAlive>`](/api/built-in-components#keepalive) 缓存的树的一部分从 DOM 中移除后调用。

**此钩子在服务器端渲染期间不会被调用。**

- **类型**

  ```ts
  interface ComponentOptions {
    deactivated?(this: ComponentPublicInstance): void
  }
  ```

- **另请参阅** [指南 - 缓存实例的生命周期](/guide/built-ins/keep-alive#lifecycle-of-cached-instance)

## serverPrefetch {#serverprefetch}

在组件实例即将在服务器上渲染之前解析的异步函数。

- **类型**

  ```ts
  interface ComponentOptions {
    serverPrefetch?(this: ComponentPublicInstance): Promise<any>
  }
  ```

- **详情**

  如果钩子返回 Promise，服务器渲染器将等待 Promise 解析后再渲染组件。

  此钩子仅在服务器端渲染期间调用，可用于执行仅服务器的数据获取。

- **示例**

  ```js
  export default {
    data() {
      return {
        data: null,
      }
    },
    async serverPrefetch() {
      // 组件作为初始请求的一部分渲染
      // 在服务器上预取数据比在客户端更快
      this.data = await fetchOnServer(/* ... */)
    },
    async mounted() {
      if (!this.data) {
        // 如果挂载时数据为 null，则意味着组件
        // 在客户端动态渲染。改为执行
        // 客户端获取。
        this.data = await fetchOnClient(/* ... */)
      }
    },
  }
  ```

- **另请参阅** [服务器端渲染](/guide/scaling-up/ssr)
