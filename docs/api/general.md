# 全局 API：通用 {#global-api-general}

## version {#version}

暴露当前版本的 Rue。

- **类型：** `string`

- **示例**

  ```js
  import { version } from '@rue-js/rue'

  console.log(version)
  ```

## nextTick() {#nexttick}

等待下一次 DOM 更新刷新的工具。

- **类型**

  ```ts
  function nextTick(callback?: () => void): Promise<void>
  ```

- **详情**

  当你在 Vue 中更改响应式状态时，产生的 DOM 更新不会同步应用。相反，Vue 会将它们缓冲到"下一 tick"，以确保每个组件只更新一次，无论你做了多少状态更改。

  `nextTick()` 可以在状态更改后立即使用，以等待 DOM 更新完成。你可以传递一个回调作为参数，或等待返回的 Promise。

- **示例**

  <div class="composition-api">

  ```js
  import { ref, nextTick } from '@rue-js/rue'

  const count = ref(0)

  async function increment() {
    count.value++

    // DOM 尚未更新
    console.log(document.getElementById('counter').textContent) // 0

    await nextTick()
    // DOM 现在已更新
    console.log(document.getElementById('counter').textContent) // 1
  }
  ```

  </div>
  <div class="options-api">

  ```js
  import { nextTick } from '@rue-js/rue'

  export default {
    data() {
      return {
        count: 0,
      }
    },
    methods: {
      async increment() {
        this.count++

        // DOM 尚未更新
        console.log(document.getElementById('counter').textContent) // 0

        await nextTick()
        // DOM 现在已更新
        console.log(document.getElementById('counter').textContent) // 1
      },
    },
  }
  ```

  </div>

- **另请参阅** [`this.$nextTick()`](/api/component-instance#nexttick)

## defineComponent() {#definecomponent}

用于定义具有类型推断的 Vue 组件的类型帮助函数。

- **类型**

  ```ts
  // 选项语法
  function defineComponent(component: ComponentOptions): ComponentConstructor

  // 函数语法
  function defineComponent(
    setup: ComponentOptions['setup'],
    extraOptions?: ComponentOptions,
  ): () => any
  ```

  > 为便于阅读，类型已简化。

- **详情**

  第一个参数期望一个组件选项对象。返回值将是相同的选项对象，因为该函数本质上只是一个用于类型推断的运行时空操作。

  注意，返回类型有点特殊：它将是一个构造函数类型，其实例类型是基于选项推断的组件实例类型。这用于在 TSX 中将返回类型用作标签时的类型推断。

  你可以像这样从 `defineComponent()` 的返回类型中提取组件的实例类型（等同于其选项中 `this` 的类型）：

  ```ts
  const Foo = defineComponent(/* ... */)

  type FooInstance = InstanceType<typeof Foo>
  ```

  ### 函数签名 {#function-signature}

  `defineComponent()` 还有一个替代签名，用于与组合式 API 和[渲染函数或 JSX](/guide/extras/render-function.html) 一起使用。

  不是传递选项对象，而是期望一个函数。此函数的工作方式与组合式 API [`setup()`](/api/composition-api-setup.html#composition-api-setup) 函数相同：它接收 props 和 setup 上下文。返回值应该是一个渲染函数——支持 `h()` 和 JSX：

  ```js
  import { ref, h } from '@rue-js/rue'

  const Comp = defineComponent(
    props => {
      // 像使用 script setup 一样在这里使用组合式 API
      const count = ref(0)

      return () => {
        // 渲染函数或 JSX
        return h('div', count.value)
      }
    },
    // 额外选项，例如声明 props 和 emits
    {
      props: {
        /* ... */
      },
    },
  )
  ```

  此签名的主要用例是与 TypeScript（特别是 TSX）一起使用，因为它支持泛型：

  ```tsx
  const Comp = defineComponent(
    <T extends string | number>(props: { msg: T; list: T[] }) => {
      // 像使用 script setup 一样在这里使用组合式 API
      const count = ref(0)

      return () => {
        // 渲染函数或 JSX
        return <div>{count.value}</div>
      }
    },
    // 目前仍需要手动运行时 props 声明。
    {
      props: ['msg', 'list'],
    },
  )
  ```

  未来，我们计划提供一个 Babel 插件，自动推断并注入运行时 props（就像 SFC 中的 `defineProps` 一样），以便可以省略运行时 props 声明。

  ### 关于 webpack Tree Shaking 的说明 {#note-on-webpack-treeshaking}

  因为 `defineComponent()` 是一个函数调用，它可能会对某些构建工具（例如 webpack）产生副作用。这将阻止组件被 tree-shake，即使从未使用过该组件。

  要告诉 webpack 此函数调用可以安全地进行 tree-shake，你可以在函数调用前添加 `/*#__PURE__*/` 注释标记：

  ```js
  export default /*#__PURE__*/ defineComponent(/* ... */)
  ```

  注意，如果你使用 Vite，则不需要这样做，因为 Rollup（Vite 使用的底层生产打包工具）足够智能，可以在没有手动注释的情况下确定 `defineComponent()` 实际上是无副作用的。

- **另请参阅** [指南 - 使用 TypeScript 配合 Vue](/guide/typescript/overview#general-usage-notes)

## defineAsyncComponent() {#defineasynccomponent}

定义一个仅在渲染时延迟加载的异步组件。参数可以是加载函数，也可以是用于更高级控制加载行为的选项对象。

- **类型**

  ```ts
  function defineAsyncComponent(source: AsyncComponentLoader | AsyncComponentOptions): Component

  type AsyncComponentLoader = () => Promise<Component>

  interface AsyncComponentOptions {
    loader: AsyncComponentLoader
    loadingComponent?: Component
    errorComponent?: Component
    delay?: number
    timeout?: number
    suspensible?: boolean
    onError?: (error: Error, retry: () => void, fail: () => void, attempts: number) => any
  }
  ```

- **另请参阅** [指南 - 异步组件](/guide/components/async)
