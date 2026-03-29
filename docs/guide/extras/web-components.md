# Rue 与 Web 组件 {#rue-and-web-components}

[Web 组件](https://developer.mozilla.org/en-US/docs/Web/Web_Components)是一组 Web 原生 API 的总称，允许开发者创建可复用的自定义元素。

我们认为 Rue 和 Web 组件主要是互补的技术。Rue 对消费和创建自定义元素都有出色的支持。无论你是将自定义元素集成到现有的 Rue 应用程序中，还是使用 Rue 构建和分发自定义元素，你都找对了地方。

## 在 Rue 中使用自定义元素 {#using-custom-elements-in-rue}

Rue [在 Custom Elements Everywhere 测试中获得了完美的 100% 分数](https://custom-elements-everywhere.com/libraries/rue/results/results.html)。在 Rue 应用程序中消费自定义元素在很大程度上与使用原生 HTML 元素相同，但有一些需要注意的地方：

### 跳过组件解析 {#skipping-component-resolution}

默认情况下，Rue 会尝试将非原生 HTML 标签解析为已注册的 Rue 组件，然后再回退将其渲染为自定义元素。这会导致 Rue 在开发期间发出"无法解析组件"的警告。要让 Rue 知道某些元素应被视为自定义元素并跳过组件解析，我们可以指定 [`compilerOptions.isCustomElement` 选项](/api/application#app-config-compileroptions)。

如果你使用构建设置使用 Rue，该选项应通过构建配置传递，因为它是一个编译时选项。

#### 浏览器内配置示例 {#example-in-browser-config}

```js
// 仅在使用浏览器内编译时有效。
// 如果使用构建工具，请参见下面的配置示例。
app.config.compilerOptions.isCustomElement = tag => tag.includes('-')
```

#### Vite 配置示例 {#example-vite-config}

```js [vite.config.js]
import rue from '@vitejs/plugin-rue'

export default {
  plugins: [
    rue({
      template: {
        compilerOptions: {
          // 将所有带短横线的标签视为自定义元素
          isCustomElement: tag => tag.includes('-'),
        },
      },
    }),
  ],
}
```

#### Rue CLI 配置示例 {#example-rue-cli-config}

```js [rue.config.js]
module.exports = {
  chainWebpack: config => {
    config.module
      .rule('rue')
      .use('rue-loader')
      .tap(options => ({
        ...options,
        compilerOptions: {
          // 将所有以 ion- 开头的标签视为自定义元素
          isCustomElement: tag => tag.startsWith('ion-'),
        },
      }))
  },
}
```

### 传递 DOM 属性 {#passing-dom-properties}

由于 DOM 属性只能是字符串，我们需要将复杂数据作为 DOM 属性传递给自定义元素。在自定义元素上设置 props 时，Rue 3 会自动使用 `in` 运算符检查 DOM 属性是否存在，如果键存在，则会优先将值设置为 DOM 属性。这意味着，在大多数情况下，如果自定义元素遵循[推荐的最佳实践](https://web.dev/custom-elements-best-practices/)，你不需要考虑这个问题。

然而，可能存在数据必须作为 DOM 属性传递，但自定义元素未正确定义/反映属性的罕见情况（导致 `in` 检查失败）。在这种情况下，你可以使用 `.prop` 修饰符强制将 `v-bind` 绑定设置为 DOM 属性：

```vue-html
<my-element :user.prop="{ name: 'jack' }"></my-element>

<!-- 等效的简写 -->
<my-element .user="{ name: 'jack' }"></my-element>
```

## 使用 Rue 构建自定义元素 {#building-custom-elements-with-rue}

自定义元素的主要好处是它们可以与任何框架一起使用，甚至可以完全不使用框架。这使它们成为分发组件的理想选择，因为最终消费者可能不使用相同的前端技术栈，或者当你想将最终应用程序与其实现细节隔离时。

### defineCustomElement {#definecustomelement}

Rue 支持使用与 Rue 组件 API 完全相同的方式创建自定义元素，通过 [`defineCustomElement`](/api/custom-elements#definecustomelement) 方法。该方法接受与 [`defineComponent`](/api/general#definecomponent) 相同的参数，但返回一个扩展 `HTMLElement` 的自定义元素构造函数：

```vue-html
<my-rue-element></my-rue-element>
```

```js
import { defineCustomElement } from 'rue-js'

const MyRueElement = defineCustomElement({
  // 普通 Rue 组件选项在这里
  props: {},
  emits: {},
  template: `...`,

  // defineCustomElement 特有：要注入到 shadow root 的 CSS
  styles: [`/* 内联 css */`],
})

// 注册自定义元素。
// 注册后，页面上所有 `<my-rue-element>` 标签
// 都将被升级。
customElements.define('my-rue-element', MyRueElement)

// 你也可以以编程方式实例化元素：
// （只能在注册后完成）
document.body.appendChild(
  new MyRueElement({
    // 初始 props（可选）
  }),
)
```

#### 生命周期 {#lifecycle}

- 当元素的 [`connectedCallback`](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks) 首次被调用时，Rue 自定义元素将在其 shadow root 中挂载一个内部 Rue 组件实例。

- 当元素的 `disconnectedCallback` 被调用时，Rue 会在微任务 tick 后检查元素是否已从文档中分离。
  - 如果元素仍在文档中，这是一次移动，组件实例将被保留；
  - 如果元素已从文档中分离，这是一次移除，组件实例将被卸载。

#### Props {#props}

- 使用 `props` 选项声明的所有 props 将在自定义元素上定义为属性。Rue 将在适当的情况下自动处理属性/属性之间的反射。
  - 属性始终反射到相应的属性。
  - 具有原始值（`string`、`boolean` 或 `number`）的属性将反射为属性。

- Rue 还会自动将声明为 `Boolean` 或 `Number` 类型的 props 在作为属性设置时（始终是字符串）转换为所需类型。例如，给定以下 props 声明：

  ```js
  props: {
    selected: Boolean,
    index: Number
  }
  ```

  和自定义元素用法：

  ```vue-html
  <my-element selected index="1"></my-element>
  ```

  在组件中，`selected` 将被转换为 `true`（布尔值），`index` 将被转换为 `1`（数字）。

#### 事件 {#events}

通过 `this.$emit` 或 setup `emit` 发出的事件将在自定义元素上作为原生 [CustomEvents](https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events#adding_custom_data_%E2%80%93_customevent) 调度。额外的事件参数（payload）将作为 CustomEvent 对象 `detail` 属性的数组暴露。

#### 插槽 {#slots}

在组件内部，可以像往常一样使用 `<slot/>` 元素渲染插槽。然而，在使用生成的元素时，它只接受[原生插槽语法](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_templates_and_slots)：

- [作用域插槽](/guide/components/slots#scoped-slots)不受支持。
- 传递命名插槽时，使用 `slot` 属性而不是 `v-slot` 指令：

  ```vue-html
  <my-element>
    <div slot="named">hello</div>
  </my-element>
  ```

#### Provide / Inject {#provide-inject}

[Provide / Inject API](/guide/components/provide-inject#provide-inject) 及其 [Composition API 等效项](/api/composition-api-dependency-injection#provide) 也在 Rue 定义的自定义元素之间工作。然而，请注意这**仅在自定义元素之间**工作。也就是说，Rue 定义的自定义元素将无法注入由非自定义元素 Rue 组件提供的属性。

#### 应用级别配置 <sup class="vt-badge" data-text="3.5+" /> {#app-level-config}

你可以使用 `configureApp` 选项配置 Rue 自定义元素的应用实例：

```js
defineCustomElement(MyComponent, {
  configureApp(app) {
    app.config.errorHandler = err => {
      /* ... */
    }
  },
})
```

### SFC 作为自定义元素 {#sfc-as-custom-element}

`defineCustomElement` 也适用于 Rue 单文件组件（SFC）。然而，使用默认的工具设置，SFC 中的 `<style>` 仍将在生产构建期间提取并合并到单个 CSS 文件中。当使用 SFC 作为自定义元素时，通常希望将 `<style>` 标签注入到自定义元素的 shadow root 中。

官方 SFC 工具支持以"自定义元素模式"导入 SFC（需要 `@vitejs/plugin-rue@^1.4.0` 或 `rue-loader@^16.5.0`）。以自定义元素模式加载的 SFC 将其 `<style>` 标签内联为 CSS 字符串，并在组件的 `styles` 选项下暴露它们。这将被 `defineCustomElement` 获取并在实例化时注入到元素的 shadow root 中。

要选择加入此模式，只需将组件文件名以 `.ce.rue` 结尾：

```js
import { defineCustomElement } from 'rue-js'
import Example from './Example.ce.rue'

console.log(Example.styles) // ["/* 内联 css */"]

// 转换为自定义元素构造函数
const ExampleElement = defineCustomElement(Example)

// 注册
customElements.define('my-example', ExampleElement)
```

如果你希望自定义哪些文件应以自定义元素模式导入（例如，将所有 SFC 视为自定义元素），你可以将 `customElement` 选项传递给相应的构建插件：

- [@vitejs/plugin-rue](https://github.com/vitejs/@rue-js/vite-plugin-rue/tree/main/packages/plugin-rue#using-rue-sfcs-as-custom-elements)
- [rue-loader](https://github.com/rue-jsjs/rue-loader/tree/next#v16-only-options)

### Rue 自定义元素库技巧 {#tips-for-a-rue-custom-elements-library}

使用 Rue 构建自定义元素时，元素将依赖 Rue 的运行时。根据使用的功能数量，有约 16kb 的基线大小成本。这意味着如果你要交付单个自定义元素，使用 Rue 并不理想——你可能希望使用纯 JavaScript、[petite-rue](https://github.com/rue-jsjs/petite-rue)，或专门优化小运行时大小的框架。然而，如果你要交付一组具有复杂逻辑的自定义元素，基线大小是合理的，因为 Rue 将允许每个组件用更少的代码编写。一起交付的元素越多，权衡就越好。

如果自定义元素将在也使用 Rue 的应用程序中使用，你可以选择将 Rue 从构建包中外部化，以便元素将使用主机应用程序中的相同 Rue 副本。

建议导出单个元素构造函数，以给用户按需导入并使用所需标签名注册的灵活性。你还可以导出一个便利函数来自动注册所有元素。以下是 Rue 自定义元素库的入口点示例：

```js [elements.js]
import { defineCustomElement } from 'rue-js'
import Foo from './MyFoo.ce.rue'
import Bar from './MyBar.ce.rue'

const MyFoo = defineCustomElement(Foo)
const MyBar = defineCustomElement(Bar)

// 导出单个元素
export { MyFoo, MyBar }

export function register() {
  customElements.define('my-foo', MyFoo)
  customElements.define('my-bar', MyBar)
}
```

消费者可以在 Rue 文件中使用这些元素：

```vue
<script setup>
import { register } from 'path/to/elements.js'
register()
</script>

<template>
  <my-foo ...>
    <my-bar ...></my-bar>
  </my-foo>
</template>
```

或在任何其他框架中，如使用 JSX 的框架，并使用自定义名称：

```jsx
import { MyFoo, MyBar } from 'path/to/elements.js'

customElements.define('some-foo', MyFoo)
customElements.define('some-bar', MyBar)

export function MyComponent() {
  return <>
    <some-foo ... >
      <some-bar ... ></some-bar>
    </some-foo>
  </>
}
```

### 基于 Rue 的 Web 组件与 TypeScript {#web-components-and-typescript}

编写 Rue SFC 模板时，你可能希望[类型检查](/guide/scaling-up/tooling.html#typescript)你的 Rue 组件，包括那些定义为自定义元素的组件。

自定义元素使用浏览器内置 API 全局注册，默认情况下在 Rue 模板中使用它们时没有类型推断。要为注册为自定义元素的 Rue 组件提供类型支持，我们可以通过扩充 [`GlobalComponents` 接口](https://github.com/rue-jsjs/language-tools/wiki/Global-Component-Types)来注册全局组件类型以在 Rue 模板中进行类型检查（JSX 用户可以改为扩充 [JSX.IntrinsicElements](https://www.typescriptlang.org/docs/handbook/jsx.html#intrinsic-elements) 类型，此处未展示）。

以下是如何为使用 Rue 制作的自定义元素定义类型：

```typescript
import { defineCustomElement } from 'rue-js'

// 导入 Rue 组件。
import SomeComponent from './src/components/SomeComponent.ce.rue'

// 将 Rue 组件转换为自定义元素类。
export const SomeElement = defineCustomElement(SomeComponent)

// 记住在浏览器中注册元素类。
customElements.define('some-element', SomeElement)

// 将新元素类型添加到 Rue 的 GlobalComponents 类型。
declare module 'rue-js' {
  interface GlobalComponents {
    // 确保在此处传入 Rue 组件类型
    //（SomeComponent，*不是* SomeElement）。
    // 自定义元素名称中需要短横线，
    // 因此在此处使用带短横线的元素名称。
    'some-element': typeof SomeComponent
  }
}
```

## 非 Rue Web 组件与 TypeScript {#non-rue-web-components-and-typescript}

以下是推荐的在不是用 Rue 构建的自定义元素的 SFC 模板中启用类型检查的方法。

:::tip 注意
这是一种可能的实现方式，但根据用于创建自定义元素的框架，它可能会有所不同。
:::

假设我们有一个定义了一些 JS 属性和事件的自定义元素，它在一个名为 `some-lib` 的库中提供：

```ts [some-lib/src/SomeElement.ts]
// 定义具有类型化 JS 属性的类。
export class SomeElement extends HTMLElement {
  foo: number = 123
  bar: string = 'blah'

  lorem: boolean = false

  // 此方法不应暴露给模板类型。
  someMethod() {
    /* ... */
  }

  // ... 实现细节省略 ...
  // ... 假设元素调度名为 "apple-fell" 的事件 ...
}

customElements.define('some-element', SomeElement)

// 这是 SomeElement 的属性列表，将被选中用于
// 框架模板中的类型检查（例如 Rue SFC 模板）。其他
// 属性将不被暴露。
export type SomeElementAttributes = 'foo' | 'bar'

// 定义 SomeElement 调度的事件类型。
export type SomeElementEvents = {
  'apple-fell': AppleFellEvent
}

export class AppleFellEvent extends Event {
  /* ... 细节省略 ... */
}
```

实现细节已被省略，但重要的是我们对两件事有类型定义：prop 类型和事件类型。

让我们创建一个类型辅助工具，用于在 Rue 中轻松注册自定义元素类型定义：

```ts [some-lib/src/DefineCustomElement.ts]
// 我们可以为需要定义的每个元素重用此类型辅助工具。
type DefineCustomElement<
  ElementType extends HTMLElement,
  Events extends EventMap = {},
  SelectedAttributes extends keyof ElementType = keyof ElementType,
> = new () => ElementType & {
  // 使用 $props 定义暴露给模板类型检查的属性。Rue
  // 专门从 `$props` 类型读取 prop 定义。注意，我们
  // 将元素的 props 与全局 HTML props 和 Rue 的特殊
  // props 组合在一起。
  /** @deprecated 不要在自定义元素 ref 上使用 $props 属性，
    这仅用于模板 prop 类型。 */
  $props: HTMLAttributes & Partial<Pick<ElementType, SelectedAttributes>> & PublicProps

  // 使用 $emit 专门定义事件类型。Rue 专门从
  // `$emit` 类型读取事件类型。注意 `$emit` 期望的特定
  // 格式，我们将 `Events` 映射到它。
  /** @deprecated 不要在自定义元素 ref 上使用 $emit 属性，
    这仅用于模板事件类型。 */
  $emit: RueEmit<Events>
}

type EventMap = {
  [event: string]: Event
}

// 这将 EventMap 映射到 Rue 的 $emit 类型期望的格式。
type RueEmit<T extends EventMap> = EmitFn<{
  [K in keyof T]: (event: T[K]) => void
}>
```

:::tip 注意
我们将 `$props` 和 `$emit` 标记为已弃用，以便当我们获得对自定义元素的 `ref` 时不会被诱惑使用这些属性，因为这些属性仅用于自定义元素的模板类型检查。这些属性实际上不存在于自定义元素实例上。
:::

使用类型辅助工具，我们现在可以选择应在 Rue 模板中暴露进行类型检查的 JS 属性：

```ts [some-lib/src/SomeElement.rue.ts]
import { SomeElement, SomeElementAttributes, SomeElementEvents } from './SomeElement.js'
import type { Component } from 'rue-js'
import type { DefineCustomElement } from './DefineCustomElement'

// 将新元素类型添加到 Rue 的 GlobalComponents 类型。
declare module 'rue-js' {
  interface GlobalComponents {
    'some-element': DefineCustomElement<SomeElement, SomeElementAttributes, SomeElementEvents>
  }
}
```

假设 `some-lib` 将其源 TypeScript 文件构建到 `dist/` 文件夹中。`some-lib` 的用户然后可以导入 `SomeElement` 并在 Rue SFC 中使用它，如下所示：

```vue [SomeElementImpl.vue]
<script setup lang="ts">
// 这将创建并向浏览器注册元素。
import 'some-lib/dist/SomeElement.js'

// 使用 TypeScript 和 Rue 的用户还应导入
// Rue 特定的类型定义（其他框架的用户可能
// 导入其他框架特定的类型定义）。
import type {} from 'some-lib/dist/SomeElement.rue.js'

import { useTemplateRef, onMounted } from 'rue-js'

const el = useTemplateRef('el')

onMounted(() => {
  console.log(el.value!.foo, el.value!.bar, el.value!.lorem, el.value!.someMethod())

  // 不要使用这些 props，它们是 `undefined`
  // IDE 会显示它们被划线
  el.$props
  el.$emit
})
</script>

<template>
  <!-- 现在我们可以使用元素并进行类型检查： -->
  <some-element
    ref="el"
    :foo="456"
    :blah="'hello'"
    @apple-fell="
      event => {
        // `event` 的类型在此处被推断为 `AppleFellEvent`
      }
    "
  ></some-element>
</template>
```

如果元素没有类型定义，属性和事件的类型可以以更手动的方式定义：

```vue [SomeElementImpl.vue]
<script setup lang="ts">
// 假设 `some-lib` 是没有类型定义的纯 JS，
// 且 TypeScript 无法推断类型：
import { SomeElement } from 'some-lib'

// 我们将使用与之前相同的类型辅助工具。
import { DefineCustomElement } from './DefineCustomElement'

type SomeElementProps = { foo?: number; bar?: string }
type SomeElementEvents = { 'apple-fell': AppleFellEvent }
interface AppleFellEvent extends Event {
  /* ... */
}

// 将新元素类型添加到 Rue 的 GlobalComponents 类型。
declare module 'rue-js' {
  interface GlobalComponents {
    'some-element': DefineCustomElement<SomeElementProps, SomeElementEvents>
  }
}

// ... 与之前相同，使用对元素的引用 ...
</script>

<template>
  <!-- ... 与之前相同，在模板中使用元素 ... -->
</template>
```

自定义元素作者不应自动从其库中导出框架特定的自定义元素类型定义，例如不应从也导出库其余部分的 `index.ts` 文件中导出它们，否则用户将遇到意外的模块扩充错误。用户应导入他们需要的框架特定的类型定义文件。

## Web 组件与 Rue 组件 {#web-components-vs-rue-components}

一些开发者认为应该避免框架专有的组件模型，并且专门使用自定义元素使应用程序"面向未来"。在这里，我们将尝试解释为什么我们认为这是对问题的过于简单的看法。

自定义元素和 Rue 组件之间确实存在一定水平的功能重叠：它们都允许我们定义具有数据传递、事件发射和生命周期管理的可复用组件。然而，Web 组件 API 相对底层且基础。要构建实际的应用程序，我们需要平台未涵盖的相当多的额外功能：

- 一个声明式和高效的模板系统；
- 一个响应式状态管理系统，便于跨组件逻辑提取和复用；
- 一种在服务器上渲染组件并在客户端水合它们的高性能方式（SSR），这对 SEO 和 [Web Vitals 指标如 LCP](https://web.dev/vitals/) 很重要。原生自定义元素 SSR 通常涉及在 Node.js 中模拟 DOM 然后序列化变异的 DOM，而 Rue SSR 尽可能编译为字符串连接，这要高效得多。

Rue 的组件模型将这些需求设计为一个连贯的系统。

凭借有能力的工程团队，你可能能够构建与原生自定义元素等效的东西——但这也意味着你正在承担内部框架的长期维护负担，同时失去像 Rue 这样成熟框架的生态系统和社区好处。

还有一些框架使用自定义元素作为其组件模型的基础，但它们都不可避免地必须引入其专有解决方案来解决上述问题。使用这些框架意味着接受它们解决这些问题的技术决策——尽管可能被宣传，但这并不能自动使你免受潜在未来变动的影响。

我们还发现自定义元素在某些方面有限制：

- 急切的插槽评估阻碍了组件组合。Rue 的[作用域插槽](/guide/components/slots#scoped-slots)是一种强大的组件组合机制，由于原生插槽的急切特性，无法被自定义元素支持。急切的插槽也意味着接收组件无法控制何时或是否渲染一段插槽内容。

- 今天使用 shadow DOM 交付带有作用域 CSS 的自定义元素需要将 CSS 嵌入 JavaScript 中，以便它们可以在运行时注入到 shadow root 中。它们在 SSR 场景中也导致标记中的重复样式。有[平台功能](https://github.com/whatwg/html/pull/4898/)正在这个领域开发——但截至目前它们尚未普遍支持，并且仍有生产性能/SSR 问题需要解决。与此同时，Rue SFC 提供支持将样式提取到纯 CSS 文件的 [CSS 作用域机制](/api/sfc-css-features)。

Rue 将始终与 Web 平台的最新标准保持同步，如果平台提供的任何东西能让我们的工作更轻松，我们将很乐意利用它。然而，我们的目标是提供今天运行良好且有效的解决方案。这意味着我们必须以批判的态度纳入新平台功能——这涉及在标准仍有不足时填补空白。
