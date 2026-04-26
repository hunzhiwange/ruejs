# 组件实例 {#component-instance} @todo

> **@todo**: Options API 的组件实例属性和方法（`$data`、`$props`、`$el` 等）尚未实现。Rue 使用 Composition API / FC 模式，组件实例模型与 Options API 不同。

:::info
本页面记录组件公共实例上暴露的内置属性和方法，即 `this`。

本页面上列出的所有属性都是只读的（`$data` 中的嵌套属性除外）。
:::

## $data {#data}

从组件的 [`data`](./options-state#data) 选项返回的对象，由组件使其响应式。组件实例代理访问其数据对象上的属性。

- **类型**

  ```ts
  interface ComponentPublicInstance {
    $data: object
  }
  ```

## $props {#props}

表示组件当前已解析的 props 的对象。

- **类型**

  ```ts
  interface ComponentPublicInstance {
    $props: object
  }
  ```

- **详情**

  只有通过 [`props`](./options-state#props) 选项声明的 props 才会被包含。组件实例代理访问其 props 对象上的属性。

## $el {#el}

组件实例正在管理的根 DOM 节点。

- **类型**

  ```ts
  interface ComponentPublicInstance {
    $el: any
  }
  ```

- **详情**

  `$el` 在组件[挂载](./options-lifecycle#mounted)之前将是 `undefined`。
  - 对于具有单个根元素的组件，`$el` 将指向该元素。
  - 对于具有文本根的组件，`$el` 将指向文本节点。
  - 对于具有多个根节点的组件，`$el` 将是 Vue 用于跟踪组件在 DOM 中位置的占位 DOM 节点（文本节点，或在 SSR 水合模式下的注释节点）。

  :::tip
  为了一致性，建议使用[模板 ref](/guide/essentials/template-refs)直接访问元素，而不是依赖 `$el`。
  :::

## $options {#options}

用于实例化当前组件的已解析组件选项。

- **类型**

  ```ts
  interface ComponentPublicInstance {
    $options: ComponentOptions
  }
  ```

- **详情**

  `$options` 对象暴露了当前组件的已解析选项，是以下可能来源的合并结果：
  - 全局 mixins
  - 组件 `extends` 基类
  - 组件 mixins

  它通常用于支持自定义组件选项：

  ```js
  const app = createApp({
    customOption: 'foo',
    created() {
      console.log(this.$options.customOption) // => 'foo'
    },
  })
  ```

- **另请参阅** [`app.config.optionMergeStrategies`](/api/application#app-config-optionmergestrategies)

## $parent {#parent}

父实例，如果当前实例有的话。对于根实例本身，它将是 `null`。

- **类型**

  ```ts
  interface ComponentPublicInstance {
    $parent: ComponentPublicInstance | null
  }
  ```

## $root {#root}

当前组件树的根组件实例。如果当前实例没有父级，此值将是它自己。

- **类型**

  ```ts
  interface ComponentPublicInstance {
    $root: ComponentPublicInstance
  }
  ```

## $slots {#slots}

表示父组件传递的[插槽](/guide/components/slots)的对象。

- **类型**

  ```ts
  interface ComponentPublicInstance {
    $slots: { [name: string]: Slot }
  }

  type Slot = (...args: any[]) => RenderOutput

  type RenderOutput = RenderableOutput
  ```

- **详情**

  通常在手写[渲染函数](/guide/extras/render-function)时使用，但也可用于检测插槽是否存在。

  每个插槽作为函数暴露在 `this.$slots` 上，返回该插槽名称对应的渲染输出。默认插槽作为 `this.$slots.default` 暴露。

  如果插槽是[作用域插槽](/guide/components/slots#scoped-slots)，传递给插槽函数的参数将可作为其插槽 props 在插槽中使用。

- **另请参阅** [渲染函数 - 渲染插槽](/guide/extras/render-function#rendering-slots)

## $refs {#refs}

通过[模板 refs](/guide/essentials/template-refs)注册的 DOM 元素和组件实例的对象。

- **类型**

  ```ts
  interface ComponentPublicInstance {
    $refs: { [name: string]: Element | ComponentPublicInstance | null }
  }
  ```

- **另请参阅**
  - [模板 refs](/guide/essentials/template-refs)
  - [特殊属性 - ref](./built-in-special-attributes.md#ref)

## $attrs {#attrs}

包含组件的透传属性的对象。

- **类型**

  ```ts
  interface ComponentPublicInstance {
    $attrs: object
  }
  ```

- **详情**

  [透传属性](/guide/components/attrs)是父组件传递的、但未被子组件声明为 prop 或发出事件的属性和事件处理器。

  默认情况下，如果只有一个根元素，`$attrs` 中的所有内容都将自动继承到组件的根元素。如果组件有多个根节点，此行为将被禁用，并且可以通过 [`inheritAttrs`](./options-misc#inheritattrs) 选项显式禁用。

- **另请参阅**
  - [透传属性](/guide/components/attrs)

## $watch() {#watch}

用于创建侦听器的命令式 API。

- **类型**

  ```ts
  interface ComponentPublicInstance {
    $watch(
      source: string | (() => any),
      callback: WatchCallback,
      options?: WatchOptions,
    ): StopHandle
  }

  type WatchCallback<T> = (
    value: T,
    oldValue: T,
    onCleanup: (cleanupFn: () => void) => void,
  ) => void

  interface WatchOptions {
    immediate?: boolean // 默认：false
    deep?: boolean // 默认：false
    flush?: 'pre' | 'post' | 'sync' // 默认：'pre'
    onTrack?: (event: DebuggerEvent) => void
    onTrigger?: (event: DebuggerEvent) => void
  }

  type StopHandle = () => void
  ```

- **详情**

  第一个参数是侦听源。它可以是组件属性名字符串、简单的点分隔路径字符串或 [getter 函数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get#description)。

  第二个参数是回调函数。回调接收侦听源的新值和旧值。
  - **`immediate`**：在侦听器创建时立即触发回调。第一次调用时旧值将是 `undefined`。
  - **`deep`**：如果源是对象，则强制深度遍历，以便在深度变更时触发回调。请参阅 [深度侦听器](/guide/essentials/watchers#deep-watchers)。
  - **`flush`**：调整回调的刷新时机。请参阅 [回调刷新时机](/guide/essentials/watchers#callback-flush-timing) 和 [`watchEffect()`](/api/reactivity-core#watcheffect)。
  - **`onTrack / onTrigger`**：调试侦听器的依赖。请参阅 [侦听器调试](/guide/extras/reactivity-in-depth#watcher-debugging)。

- **示例**

  侦听属性名：

  ```js
  this.$watch('a', (newVal, oldVal) => {})
  ```

  侦听点分隔路径：

  ```js
  this.$watch('a.b', (newVal, oldVal) => {})
  ```

  使用 getter 进行更复杂的表达式：

  ```js
  this.$watch(
    // 每次表达式 `this.a + this.b` 产生
    // 不同结果时，将调用处理器。
    // 就像我们在侦听一个计算属性
    // 而不需要定义计算属性本身。
    () => this.a + this.b,
    (newVal, oldVal) => {},
  )
  ```

  停止侦听器：

  ```js
  const unwatch = this.$watch('a', cb)

  // 稍后...
  unwatch()
  ```

- **另请参阅**
  - [选项 - `watch`](/api/options-state#watch)
  - [指南 - 侦听器](/guide/essentials/watchers)

## $emit() {#emit}

在当前实例上触发自定义事件。任何额外参数都将传递给监听器的回调函数。

- **类型**

  ```ts
  interface ComponentPublicInstance {
    $emit(event: string, ...args: any[]): void
  }
  ```

- **示例**

  ```js
  export default {
    created() {
      // 仅事件
      this.$emit('foo')
      // 带额外参数
      this.$emit('bar', 1, 2, 3)
    },
  }
  ```

- **另请参阅**
  - [组件 - 事件](/guide/components/events)
  - [`emits` 选项](./options-state#emits)

## $forceUpdate() {#forceupdate}

强制组件实例重新渲染。

- **类型**

  ```ts
  interface ComponentPublicInstance {
    $forceUpdate(): void
  }
  ```

- **详情**

  鉴于 Vue 完全自动的响应式系统，这应该很少需要。你可能需要它的唯一情况是当你使用高级响应式 API 显式创建了非响应式组件状态时。

## $nextTick() {#nexttick}

全局 [`nextTick()`](/api/general#nexttick) 的实例绑定版本。

- **类型**

  ```ts
  interface ComponentPublicInstance {
    $nextTick(callback?: (this: ComponentPublicInstance) => void): Promise<void>
  }
  ```

- **详情**

  与全局版本的 `nextTick()` 的唯一区别是传递给 `this.$nextTick()` 的回调会将其 `this` 上下文绑定到当前组件实例。

- **另请参阅** [`nextTick()`](/api/general#nexttick)
