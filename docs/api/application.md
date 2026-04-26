# 应用 API {#application-api}

## createApp() {#createapp} @todo

创建一个应用实例。

- **类型**

  ```ts
  function createApp(rootComponent: Component, rootProps?: object): App
  ```

- **详情**

  第一个参数是根组件。第二个可选参数是传递给根组件的 props。

- **示例**

  使用内联根组件：

  ```js
  import { createApp } from '@rue-js/rue'

  const app = createApp({
    /* 根组件选项 */
  })
  ```

  使用导入的组件：

  ```js
  import { createApp } from '@rue-js/rue'
  import App from './App.js'

  const app = createApp(App)
  ```

- **参阅** [指南 - 创建一个 Rue 应用](/guide/essentials/application)

## app.mount() {#app-mount}

将应用实例挂载到容器元素中。

- **类型**

  ```ts
  interface App {
    mount(rootContainer: Element | string): ComponentPublicInstance
  }
  ```

- **详情**

  参数可以是一个实际的 DOM 元素或一个 CSS 选择器（将使用第一个匹配的元素）。返回根组件实例。

  如果组件定义了模板或渲染函数，它将替换容器内部现有的 DOM 节点。否则，如果运行时编译器可用，容器的 `innerHTML` 将被用作模板。

  在 SSR 水合模式下，它将对容器内的现有 DOM 节点进行水合。如果出现[不匹配](/guide/scaling-up/ssr#hydration-mismatch)的情况，现有的 DOM 节点将被转换以匹配预期的输出。

  对于每个应用实例，`mount()` 只能被调用一次。

- **示例**

  ```js
  import { createApp } from '@rue-js/rue'
  const app = createApp(/* ... */)

  app.mount('#app')
  ```

  也可以挂载到实际的 DOM 元素：

  ```js
  app.mount(document.body.firstChild)
  ```

## app.unmount() {#app-unmount}

卸载已挂载的应用实例，触发应用组件树中所有组件的卸载生命周期钩子。

- **类型**

  ```ts
  interface App {
    unmount(): void
  }
  ```

## app.onUnmount() {#app-onunmount}

注册应用卸载时调用的回调函数。

- **类型**

  ```ts
  interface App {
    onUnmount(callback: () => any): void
  }
  ```

## app.component() {#app-component} @todo

如果同时传递名称字符串和组件定义，则注册全局组件；如果只传递名称，则返回已注册的组件。

- **类型**

  ```ts
  interface App {
    component(name: string): Component | undefined
    component(name: string, component: Component): this
  }
  ```

- **示例**

  ```js
  import { createApp } from '@rue-js/rue'

  const app = createApp({})

  // 注册一个选项对象
  app.component('MyComponent', {
    /* ... */
  })

  // 获取已注册的组件
  const MyComponent = app.component('MyComponent')
  ```

- **参阅** [组件注册](/guide/components/registration)

## app.directive() {#app-directive} @todo

如果同时传递名称字符串和指令定义，则注册全局自定义指令；如果只传递名称，则返回已注册的指令。

- **类型**

  ```ts
  interface App {
    directive(name: string): Directive | undefined
    directive(name: string, directive: Directive): this
  }
  ```

- **示例**

  ```js
  import { createApp } from '@rue-js/rue'

  const app = createApp({
    /* ... */
  })

  // 注册（对象指令）
  app.directive('myDirective', {
    /* 自定义指令钩子 */
  })

  // 注册（函数指令简写）
  app.directive('myDirective', () => {
    /* ... */
  })

  // 获取已注册的指令
  const myDirective = app.directive('myDirective')
  ```

- **参阅** [自定义指令](/guide/reusability/custom-directives)

## app.use() {#app-use}

安装一个[插件](/guide/reusability/plugins)。

- **类型**

  ```ts
  interface App {
    use(plugin: Plugin, ...options: any[]): this
  }
  ```

- **详情**

  期望插件作为第一个参数，可选的插件选项作为第二个参数。

  插件可以是带有 `install()` 方法的对象，也可以是直接用作 `install()` 方法的函数。`app.use()` 的选项（第二个参数）将被传递给插件的 `install()` 方法。

  当对同一插件多次调用 `app.use()` 时，该插件只会被安装一次。

- **示例**

  ```js
  import { createApp } from '@rue-js/rue'
  import MyPlugin from './plugins/MyPlugin'

  const app = createApp({
    /* ... */
  })

  app.use(MyPlugin)
  ```

- **参阅** [插件](/guide/reusability/plugins)

## app.mixin() {#app-mixin} @todo

应用全局 mixin（限定于应用）。全局 mixin 将其包含的选项应用到应用中每个组件实例。

:::warning 不推荐
Mixin 在 Rue 3 中主要是为了向后兼容而被支持，因为生态系统库中广泛使用它们。在应用代码中应避免使用 mixin，尤其是全局 mixin。

对于逻辑复用，请优先使用[组合式函数](/guide/reusability/composables)。
:::

- **类型**

  ```ts
  interface App {
    mixin(mixin: ComponentOptions): this
  }
  ```

## app.provide() {#app-provide} @todo

提供一个值，可以在应用内的所有后代组件中注入。

- **类型**

  ```ts
  interface App {
    provide<T>(key: InjectionKey<T> | symbol | string, value: T): this
  }
  ```

- **详情**

  期望注入键作为第一个参数，提供的值作为第二个参数。返回应用实例本身。

- **示例**

  ```js
  import { createApp } from '@rue-js/rue'

  const app = createApp(/* ... */)

  app.provide('message', 'hello')
  ```

  在应用中的组件内：

  <div class="composition-api">

  ```js
  import { inject } from '@rue-js/rue'

  export default {
    setup() {
      console.log(inject('message')) // 'hello'
    },
  }
  ```

  </div>
  <div class="options-api">

  ```js
  export default {
    inject: ['message'],
    created() {
      console.log(this.message) // 'hello'
    },
  }
  ```

  </div>

- **参阅**
  - [Provide / Inject](/guide/components/provide-inject)
  - [应用级 Provide](/guide/components/provide-inject#app-level-provide)
  - [app.runWithContext()](#app-runwithcontext)

## app.runWithContext() {#app-runwithcontext} @todo

使用当前应用作为注入上下文执行回调函数。

- **类型**

  ```ts
  interface App {
    runWithContext<T>(fn: () => T): T
  }
  ```

- **详情**

  期望一个回调函数并立即运行该回调。在回调的同步调用期间，`inject()` 调用能够从当前应用提供的值中查找注入，即使没有当前活动的组件实例。回调的返回值也将被返回。

- **示例**

  ```js
  import { inject } from '@rue-js/rue'

  app.provide('id', 1)

  const injected = app.runWithContext(() => {
    return inject('id')
  })

  console.log(injected) // 1
  ```

## app.version {#app-version} @todo

提供创建应用时使用的 Rue 版本。这在[插件](/guide/reusability/plugins)中很有用，你可能需要基于不同的 Rue 版本执行条件逻辑。

- **类型**

  ```ts
  interface App {
    version: string
  }
  ```

- **示例**

  在插件中执行版本检查：

  ```js
  export default {
    install(app) {
      const version = Number(app.version.split('.')[0])
      if (version < 3) {
        console.warn('This plugin requires Rue 3')
      }
    },
  }
  ```

- **参阅** [全局 API - version](/api/general#version)

## app.config {#app-config}

每个应用实例都暴露一个 `config` 对象，其中包含该应用的配置设置。你可以在挂载应用之前修改其属性（见下文）。

```js
import { createApp } from '@rue-js/rue'

const app = createApp(/* ... */)

console.log(app.config)
```

## app.config.errorHandler {#app-config-errorhandler} @todo

为应用中传播的任何未捕获错误分配全局处理程序。

- **类型**

  ```ts
  interface AppConfig {
    errorHandler?: (
      err: unknown,
      instance: ComponentPublicInstance | null,
      // `info` 是 Rue 特定的错误信息，
      // 例如错误发生在哪个生命周期钩子中
      info: string,
    ) => void
  }
  ```

- **详情**

  错误处理程序接收三个参数：错误、触发错误的组件实例，以及一个指定错误源类型的信息字符串。

  它可以捕获以下源的错误：
  - 组件渲染
  - 事件处理器
  - 生命周期钩子
  - `setup()` 函数
  - 侦听器
  - 自定义指令钩子
  - 过渡钩子

  :::tip
  在生产环境中，第三个参数 (`info`) 将是一个简写代码而不是完整的信息字符串。你可以在[生产错误代码参考](/error-reference/#runtime-errors)中找到代码到字符串的映射。
  :::

- **示例**

  ```js
  app.config.errorHandler = (err, instance, info) => {
    // 处理错误，例如报告到服务
  }
  ```

## app.config.warnHandler {#app-config-warnhandler} @todo

为 Rue 的运行时警告分配自定义处理程序。

- **类型**

  ```ts
  interface AppConfig {
    warnHandler?: (msg: string, instance: ComponentPublicInstance | null, trace: string) => void
  }
  ```

- **详情**

  警告处理程序接收警告消息作为第一个参数，源组件实例作为第二个参数，组件追踪字符串作为第三个参数。

  它可以用来过滤特定警告以减少控制台噪音。所有 Rue 警告都应在开发期间解决，因此这只建议在调试会话中专注于特定警告时使用，调试完成后应移除。

  :::tip
  警告只在开发模式下工作，因此此配置在生产模式中被忽略。
  :::

- **示例**

  ```js
  app.config.warnHandler = (msg, instance, trace) => {
    // `trace` 是组件层次结构追踪
  }
  ```

## app.config.performance {#app-config-performance} @todo

设置为 `true` 以在浏览器开发者工具性能/时间线面板中启用组件初始化、编译、渲染和打补丁性能追踪。只在开发模式和支持 [performance.mark](https://developer.mozilla.org/en-US/docs/Web/API/Performance/mark) API 的浏览器中工作。

- **类型：** `boolean`

- **参阅** [指南 - 性能](/guide/best-practices/performance)

## app.config.compilerOptions {#app-config-compileroptions} @todo

配置运行时编译器选项。在此对象上设置的值将被传递给浏览器内模板编译器，并影响配置应用的每个组件。注意，你也可以使用 [`compilerOptions` 选项](/api/options-rendering#compileroptions)在每个组件上覆盖这些选项。

::: warning 重要
此配置选项只在使用完整构建（即可以在浏览器中编译模板的独立 `vue.js`）时被尊重。如果你使用运行时构建配合构建工具设置，编译器选项必须通过构建工具配置传递给 `@vue/compiler-dom`。

- 对于 `vue-loader`：[通过 `compilerOptions` loader 选项传递](https://vue-loader.vuejs.org/options.html#compileroptions)。另请参阅[如何在 `vue-cli` 中配置](https://cli.vuejs.org/guide/webpack.html#modifying-options-of-a-loader)。

- 对于 `vite`：[通过 `@vitejs/plugin-vue` 选项传递](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue#options)。
  :::

### app.config.compilerOptions.isCustomElement {#app-config-compileroptions-iscustomelement}

指定一种检查方法来识别原生自定义元素。

- **类型：** `(tag: string) => boolean`

- **详情**

  如果标签应被视为原生自定义元素，则应返回 `true`。对于匹配的标记，Rue 将将其渲染为原生元素，而不是尝试将其解析为 Rue 组件。

  原生 HTML 和 SVG 标签不需要在此函数中匹配 - Rue 的解析器会自动识别它们。

- **示例**

  ```js
  // 将所有以 'ion-' 开头的标签视为自定义元素
  app.config.compilerOptions.isCustomElement = tag => {
    return tag.startsWith('ion-')
  }
  ```

- **参阅** [Rue 与 Web Components](/guide/extras/web-components)

### app.config.compilerOptions.whitespace {#app-config-compileroptions-whitespace}

调整模板空白字符处理行为。

- **类型：** `'condense' | 'preserve'`

- **默认值：** `'condense'`

- **详情**

  Rue 移除/压缩模板中的空白字符以产生更高效的编译输出。默认策略是 "condense"，行为如下：
  1. 元素内的前导/尾随空白字符被压缩为单个空格。
  2. 包含换行符的元素之间的空白字符被移除。
  3. 文本节点中连续的空白字符被压缩为单个空格。

  将此选项设置为 `'preserve'` 将禁用 (2) 和 (3)。

- **示例**

  ```js
  app.config.compilerOptions.whitespace = 'preserve'
  ```

### app.config.compilerOptions.delimiters {#app-config-compileroptions-delimiters}

调整模板中文本插值使用的分隔符。

- **类型：** `[string, string]`

- **默认值：** `{{ "['\u007b\u007b', '\u007d\u007d']" }}`

- **详情**

  这通常用于避免与也使用 mustache 语法的服务器端框架发生冲突。

- **示例**

  ```js
  // 将分隔符更改为 ES6 模板字符串样式
  app.config.compilerOptions.delimiters = ['${', '}']
  ```

### app.config.compilerOptions.comments {#app-config-compileroptions-comments}

调整模板中 HTML 注释的处理。

- **类型：** `boolean`

- **默认值：** `false`

- **详情**

  默认情况下，Rue 会在生产环境中移除注释。将此选项设置为 `true` 将强制 Rue 即使在生产环境中也保留注释。开发期间始终保留注释。此选项通常在 Rue 与其他依赖 HTML 注释的库一起使用时使用。

- **示例**

  ```js
  app.config.compilerOptions.comments = true
  ```

## app.config.globalProperties {#app-config-globalproperties} @todo

一个可用于注册全局属性的对象，应用内任何组件实例都可以访问这些属性。

- **类型**

  ```ts
  interface AppConfig {
    globalProperties: Record<string, any>
  }
  ```

- **详情**

  这是 Rue 2 中 `Vue.prototype` 的替代，在 Rue 3 中已不再存在。与任何全局内容一样，应该谨慎使用。

  如果全局属性与组件自身的属性冲突，组件自身的属性将具有更高优先级。

- **用法**

  ```js
  app.config.globalProperties.msg = 'hello'
  ```

  这使得 `msg` 在应用中任何组件模板中都可用，并且在任何组件实例的 `this` 上也可用：

  ```js
  export default {
    mounted() {
      console.log(this.msg) // 'hello'
    },
  }
  ```

- **参阅** [指南 - 扩展全局属性](/guide/typescript/options-api#augmenting-global-properties) <sup class="vt-badge ts" />

## app.config.optionMergeStrategies {#app-config-optionmergestrategies} @todo

一个用于定义自定义组件选项合并策略的对象。

- **类型**

  ```ts
  interface AppConfig {
    optionMergeStrategies: Record<string, OptionMergeFunction>
  }

  type OptionMergeFunction = (to: unknown, from: unknown) => any
  ```

- **详情**

  一些插件/库添加了对自定义组件选项的支持（通过注入全局 mixin）。当相同的选项需要从多个来源（例如 mixin 或组件继承）"合并"时，这些选项可能需要特殊的合并逻辑。

  可以通过使用选项的名称作为键，在 `app.config.optionMergeStrategies` 对象上为其分配合并策略函数来注册自定义选项的合并策略。

  合并策略函数接收父实例和子实例上定义的该选项的值分别作为第一和第二个参数。

- **示例**

  ```js
  const app = createApp({
    // 来自自身的选项
    msg: 'Rue',
    // 来自 mixin 的选项
    mixins: [
      {
        msg: 'Hello ',
      },
    ],
    mounted() {
      // 在 this.$options 上暴露的合并后选项
      console.log(this.$options.msg)
    },
  })

  // 为 `msg` 定义自定义合并策略
  app.config.optionMergeStrategies.msg = (parent, child) => {
    return (parent || '') + (child || '')
  }

  app.mount('#app')
  // 输出 'Hello Rue'
  ```

- **参阅** [组件实例 - `$options`](/api/component-instance#options)

## app.config.idPrefix {#app-config-idprefix} @todo

配置此应用中通过 [useId()](/api/composition-api-helpers.html#useid) 生成的所有 ID 的前缀。

- **类型：** `string`

- **默认值：** `undefined`

- **示例**

  ```js
  app.config.idPrefix = 'myApp'
  ```

  ```js
  // 在组件中：
  const id1 = useId() // 'myApp:0'
  const id2 = useId() // 'myApp:1'
  ```

## app.config.throwUnhandledErrorInProduction {#app-config-throwunhandlederrorinproduction} @todo

强制在生产模式下抛出未处理的错误。

- **类型：** `boolean`

- **默认值：** `false`

- **详情**

  默认情况下，在 Rue 应用中抛出但未明确处理的错误在开发和生产模式下的行为不同：
  - 在开发中，错误被抛出并可能导致应用崩溃。这是为了让错误更显眼，以便在开发期间被发现和修复。

  - 在生产中，错误将只记录到控制台以最小化对最终用户的影响。然而，这可能阻止错误监控服务捕获仅在生产中发生的错误。

  通过将 `app.config.throwUnhandledErrorInProduction` 设置为 `true`，即使在生产模式下也会抛出未处理的错误。
