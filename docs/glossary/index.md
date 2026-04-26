# 术语表 {#glossary}

本术语表旨在为谈论 Rue 时常用的技术术语的含义提供一些指导。它的目的是**描述性**地说明术语通常如何使用，而不是**规定性**地说明它们必须如何使用。根据周围的上下文，某些术语可能具有略微不同的含义或细微差别。

[[TOC]]

## 异步组件 {#async-component}

*异步组件*是另一个组件的包装器，允许被包装的组件延迟加载。这通常用作减小构建后的 `.js` 文件大小的一种方式，允许将它们分割成仅在需要时加载的较小块。

Rue Router 具有类似的功能用于[路由组件的延迟加载](https://router.vuejs.org/guide/advanced/lazy-loading.html)，尽管这并不使用 Rue 的异步组件功能。

更多详情请参见：

- [指南 - 异步组件](/guide/components/async.html)

## 编译器宏 {#compiler-macro}

*编译器宏*是由编译器处理的特殊代码，并转换为其他内容。它们实际上是一种巧妙的字符串替换形式。

Rue 的 [SFC](#single-file-component) 编译器支持各种宏，例如 `defineProps()`、`defineEmits()` 和 `defineExpose()`。这些宏被故意设计成看起来像普通的 JavaScript 函数，以便它们可以利用 JavaScript / TypeScript 周围的相同解析器和类型推断工具。然而，它们并不是在浏览器中运行的实际函数。这些是编译器检测并替换为将实际运行的真实 JavaScript 代码的特殊字符串。

宏在使用上有一些不适用于普通 JavaScript 代码的限制。例如，你可能认为 `const dp = defineProps` 会让你为 `defineProps` 创建一个别名，但它实际上会导致错误。对于可以传递给 `defineProps()` 的值也有一些限制，因为"参数"必须由编译器处理，而不是在运行时。

更多详情请参见：

- [`<script setup>` - `defineProps()` & `defineEmits()`](/api/sfc-script-setup.html#defineprops-defineemits)
- [`<script setup>` - `defineExpose()`](/api/sfc-script-setup.html#defineexpose)

## 组件 {#component}

*组件*这个术语并不是 Rue 独有的。它在许多 UI 框架中都很常见。它描述了 UI 的一个块，例如按钮或复选框。组件也可以组合成更大的组件。

组件是 Rue 提供的主要机制，用于将 UI 分割成较小的部分，既可以提高可维护性，也可以实现代码重用。

Rue 组件是一个对象。所有属性都是可选的，但组件要渲染，需要模板或渲染函数。例如，以下对象将是一个有效的组件：

```js
const HelloWorldComponent = {
  render() {
    return 'Hello world!'
  },
}
```

在实践中，大多数 Rue 应用程序使用[单文件组件](#single-file-component) (`.vue` 文件)编写。虽然这些组件乍一看可能不像是对象，但 SFC 编译器会将它们转换成一个对象，用作文件的默认导出。从外部角度来看，`.vue` 文件只是一个导出组件对象的 ES 模块。

组件对象的属性通常被称为*选项*。这就是[选项式 API](#options-api)得名的原因。

组件的选项定义了应该如何创建该组件的实例。组件在概念上类似于类，尽管 Rue 不使用实际的 JavaScript 类来定义它们。

组件这个术语也可以更宽松地用于指代组件实例。

更多详情请参见：

- [指南 - 组件基础](/guide/essentials/component-basics.html)

"组件"这个词还出现在其他几个术语中：

- [异步组件](#async-component)
- [动态组件](#dynamic-component)
- [函数式组件](#functional-component)
- [Web 组件](#web-component)

## 组合式函数 {#composable}

*组合式函数*这个术语描述了 Rue 中一种常见的使用模式。它不是 Rue 的单独功能，只是使用该框架[组合式 API](#composition-api)的一种方式。

- 组合式函数是一个函数。
- 组合式函数用于封装和重用有状态的逻辑。
- 函数名通常以 `use` 开头，以便其他开发人员知道它是一个组合式函数。
- 该函数通常预期在组件的 `setup()` 函数的同步执行期间被调用（或者，等效地，在 `<script setup>` 块的执行期间）。这将组合式函数的调用与当前组件上下文联系起来，例如通过调用 `provide()`、`inject()` 或 `onMounted()`。
- 组合式函数通常返回一个普通对象，而不是响应式对象。这个对象通常包含 refs 和函数，并且期望在调用代码中被解构。

与许多模式一样，对于特定代码是否符合该标签可能存在一些分歧。并非所有 JavaScript 实用函数都是组合式函数。如果函数不使用组合式 API，那么它可能不是组合式函数。如果它不期望在 `setup()` 的同步执行期间被调用，那么它可能不是组合式函数。组合式函数专门用于封装有状态的逻辑，它们不仅仅是函数的命名约定。

有关编写组合式函数的更多详情，请参见[指南 - 组合式函数](/guide/reusability/composables.html)。

## 组合式 API {#composition-api}

*组合式 API*是一组用于在 Rue 中编写组件和组合式函数的函数。

该术语也用于描述编写组件的两种主要风格之一，另一种是[选项式 API](#options-api)。使用组合式 API 编写的组件使用 `<script setup>` 或显式的 `setup()` 函数。

更多详情请参见[组合式 API FAQ](/guide/extras/composition-api-faq)。

## 自定义元素 {#custom-element}

*自定义元素*是[Web 组件](#web-component)标准的一项功能，在现代 Web 浏览器中实现。它指的是在 HTML 标记中使用自定义 HTML 元素的能力，以在页面的该点包含一个 Web 组件。

Rue 内置支持渲染自定义元素，并允许它们直接在 Rue 组件模板中使用。

自定义元素不应与在另一个 Rue 组件的模板中将 Rue 组件作为标签包含的能力混淆。自定义元素用于创建 Web 组件，而不是 Rue 组件。

更多详情请参见：

- [指南 - Rue 和 Web 组件](/guide/extras/web-components.html)

## 指令 {#directive}

*指令*这个术语指的是以 `v-` 前缀开头的模板属性，或其等效的简写形式。

内置指令包括 `v-if`、`v-for`、`v-bind`、`v-on` 和 `v-slot`。

Rue 还支持创建自定义指令，尽管它们通常仅用作直接操作 DOM 节点的"逃生舱"。自定义指令通常不能用于重现内置指令的功能。

更多详情请参见：

- [指南 - 模板语法 - 指令](/guide/essentials/template-syntax.html#directives)
- [指南 - 自定义指令](/guide/reusability/custom-directives.html)

## 动态组件 {#dynamic-component}

*动态组件*这个术语用于描述需要动态决定渲染哪个子组件的情况。通常，这是使用 `<component :is="type">` 实现的。

动态组件不是一种特殊类型的组件。任何组件都可以用作动态组件。动态的是组件的选择，而不是组件本身。

更多详情请参见：

- [指南 - 组件基础 - 动态组件](/guide/essentials/component-basics.html#dynamic-components)

## 副作用 {#effect}

参见[响应式副作用](#reactive-effect)和[副作用](#side-effect)。

## 事件 {#event}

使用事件在程序的不同部分之间进行通信在许多不同的编程领域都很常见。在 Rue 中，该术语通常应用于原生 HTML 元素事件和 Rue 组件事件。`v-on` 指令用于模板中监听这两种类型的事件。

更多详情请参见：

- [指南 - 事件处理](/guide/essentials/event-handling.html)
- [指南 - 组件事件](/guide/components/events.html)

## 片段 {#fragment}

*片段*这个术语指的是一种逻辑分组边界，用于把多个兄弟节点作为一个整体传递或编排，但本身不渲染任何元素。

这个名字来自原生 DOM API 中类似的[`DocumentFragment`](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment)概念。

片段用于支持具有多个根节点的组件。虽然这样的组件可能看起来有多个根，但在公开 API 或兼容边界上，它们仍然可以被作为一个整体来表示。

片段也被模板编译器用作包装多个动态节点的一种方式，例如通过 `v-for` 或 `v-if` 创建的节点。这允许编译产物把额外的结构信息传给运行时更新边界。其中大部分是内部处理的，但你可能会直接遇到的一个地方是在带有 `v-for` 的 `<template>` 标签上使用 `key`。在这种情况下，`key` 会被关联到这组片段内容的公开边界上。

片段节点目前被渲染为 DOM 中的空文本节点，尽管这是一个实现细节。如果你使用 `$el` 或尝试使用内置浏览器 API 遍历 DOM，你可能会遇到这些文本节点。

## 函数式组件 {#functional-component}

组件定义通常是一个包含选项的对象。如果你使用的是 `<script setup>`，它可能看起来不是这样，但从 `.vue` 文件导出的组件仍然是一个对象。

*函数式组件*是使用函数声明的组件的替代形式。该函数充当组件的[渲染函数](#render-function)。

函数式组件不能有自己的任何状态。它也不经过通常的组件生命周期，因此不能使用生命周期钩子。这使它们比普通的、有状态的组件稍微轻量一些。

更多详情请参见：

- [指南 - 渲染函数 & JSX - 函数式组件](/guide/extras/render-function.html#functional-components)

## 提升 {#hoisting}

*提升*这个术语用于描述在到达之前运行一段代码，在其他代码之前。执行被"拉"到更早的点。

JavaScript 对某些结构使用提升，例如 `var`、`import` 和函数声明。

在 Rue 的上下文中，编译器应用*提升*来提高性能。编译组件时，静态值被移出组件的作用域。这些静态值被描述为"提升"，因为它们是在组件外部创建的。

## 静态缓存 {#cache-static}

*缓存*这个术语用于描述临时存储经常访问的数据以提高性能。

Rue 模板编译器识别那些静态渲染片段，在初始渲染期间缓存它们，并在后续更新时尽量直接复用。

更多详情请参见：

- [指南 - 渲染机制 - 静态缓存](/guide/extras/rendering-mechanism.html#cache-static)

## DOM 内模板 {#in-dom-template}

有多种方法可以为组件指定模板。在大多数情况下，模板作为字符串提供。

*DOM 内模板*这个术语指的是模板以 DOM 节点的形式提供，而不是字符串的情况。Rue 然后使用 `innerHTML` 将 DOM 节点转换为模板字符串。

通常，DOM 内模板从直接写在页面 HTML 中的 HTML 标记开始。浏览器然后将其解析为 DOM 节点，Rue 使用它们来读取 `innerHTML`。

更多详情请参见：

- [指南 - 创建应用 - DOM 内根组件模板](/guide/essentials/application.html#in-dom-root-component-template)
- [指南 - 组件基础 - DOM 内模板解析注意事项](/guide/essentials/component-basics.html#in-dom-template-parsing-caveats)
- [选项：渲染 - template](/api/options-rendering.html#template)

## 注入 {#inject}

参见[provide / inject](#provide-inject)。

## 生命周期钩子 {#lifecycle-hooks}

Rue 组件实例经历一个生命周期。例如，它被创建、挂载、更新和卸载。

*生命周期钩子*是一种监听这些生命周期事件的方式。

使用选项式 API，每个钩子作为单独的选项提供，例如 `mounted`。组合式 API 使用函数，例如 `onMounted()`。

更多详情请参见：

- [指南 - 生命周期钩子](/guide/essentials/lifecycle.html)

## 宏 {#macro}

参见[编译器宏](#compiler-macro)。

## 具名插槽 {#named-slot}

一个组件可以有多个插槽，通过名称区分。默认插槽以外的插槽被称为*具名插槽*。

更多详情请参见：

- [指南 - 插槽 - 具名插槽](/guide/components/slots.html#named-slots)

## 选项式 API {#options-api}

Rue 组件使用对象定义。这些组件对象的属性被称为*选项*。

组件可以用两种风格编写。一种风格结合使用[组合式 API](#composition-api)和 `setup`（通过 `setup()` 选项或 `<script setup>`）。另一种风格很少直接使用组合式 API，而是使用各种组件选项来实现类似的结果。以这种方式使用的组件选项被称为*选项式 API*。

选项式 API 包括 `data()`、`computed`、`methods` 和 `created()` 等选项。

某些选项，例如 `props`、`emits` 和 `inheritAttrs`，可以在使用任一 API 编写组件时使用。由于它们是组件选项，它们可以被认为是选项式 API 的一部分。然而，由于这些选项也与 `setup()` 一起使用，通常更有用地将它们视为两种组件风格共享的选项。

`setup()` 函数本身是一个组件选项，因此它*可以*被描述为选项式 API 的一部分。然而，这并不是"选项式 API"这个术语通常的使用方式。相反，`setup()` 函数被认为是组合式 API 的一部分。

## 插件 {#plugin}

虽然*插件*这个术语可以在广泛的上下文中使用，但 Rue 有一个特定的插件概念，作为向应用程序添加功能的一种方式。

通过调用 `app.use(plugin)` 将插件添加到应用程序。插件本身是一个函数或具有 `install` 函数的对象。该函数将被传递应用程序实例，然后可以做它需要做的任何事情。

更多详情请参见：

- [指南 - 插件](/guide/reusability/plugins.html)

## 属性 {#prop}

在 Rue 中，_prop_ 这个术语有三种常见用法：

- 组件 props
- 渲染输出 props
- 插槽 props

*组件 props*是大多数人想到的 props。这些由组件使用 `defineProps()` 或 `props` 选项显式定义。

*渲染输出 props*这个术语指的是作为第二个参数传递给 `h()` 的对象属性。这些可以包括组件 props，但它们也可以包括组件事件、DOM 事件、DOM 属性和 DOM attribute。只要你在手写渲染函数边界里直接调用 `h()`，通常就会接触到这一层 props。

*插槽 props*是传递给作用域插槽的属性。

在所有情况下，props 都是从其他地方传入的属性。

虽然 props 这个词来源于*properties*这个词，但在 Rue 的上下文中，props 这个术语具有更具体的含义。你应该避免将其用作 properties 的缩写。

更多详情请参见：

- [指南 - Props](/guide/components/props.html)
- [指南 - 渲染函数 & JSX](/guide/extras/render-function.html)
- [指南 - 插槽 - 作用域插槽](/guide/components/slots.html#scoped-slots)

## provide / inject {#provide-inject}

`provide` 和 `inject` 是一种组件间通信的形式。

当组件*提供*一个值时，该组件的所有后代都可以选择使用 `inject` 获取该值。与 props 不同，提供组件不知道确切哪个组件正在接收该值。

`provide` 和 `inject` 有时用于避免*prop 钻取*。它们也可以用作组件与其插槽内容通信的隐式方式。

`provide` 也可以在应用程序级别使用，使该值可供该应用程序内的所有组件使用。

更多详情请参见：

- [指南 - provide / inject](/guide/components/provide-inject.html)

## 响应式副作用 {#reactive-effect}

*响应式副作用*是 Rue 响应式系统的一部分。它指的是跟踪函数依赖项的过程，并在这些依赖项的值发生变化时重新运行该函数。

`watchEffect()` 是创建副作用的最直接方式。Rue 的各个其他部分内部使用副作用。例如，组件渲染更新、`computed()` 和 `watch()`。

Rue 只能在响应式副作用内跟踪响应式依赖项。如果在响应式副作用之外读取属性的值，它将"失去"响应性，也就是说，如果该属性随后发生变化，Rue 将不知道该怎么办。

该术语源自"副作用"。调用效果函数是属性值更改的副作用。

更多详情请参见：

- [指南 - 深入响应式系统](/guide/extras/reactivity-in-depth.html)

## 响应性 {#reactivity}

一般来说，*响应性*指的是自动执行操作以响应数据更改的能力。例如，在数据值更改时更新 DOM 或发出网络请求。

在 Rue 的上下文中，响应性用于描述一组功能。这些功能组合在一起形成一个*响应式系统*，通过[响应式 API](#reactivity-api)公开。

响应式系统可以有各种不同的实现方式。例如，可以通过代码的静态分析来确定其依赖项来完成。然而，Rue 不使用那种形式的响应式系统。

相反，Rue 的响应式系统在运行时跟踪属性访问。它使用 Proxy 包装器和属性的[getter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get#description)/[setter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set#description)函数来实现这一点。

更多详情请参见：

- [指南 - 响应式基础](/guide/essentials/reactivity-fundamentals.html)
- [指南 - 深入响应式系统](/guide/extras/reactivity-in-depth.html)

## 响应式 API {#reactivity-api}

*响应式 API*是一组与[响应性](#reactivity)相关的核心 Rue 函数。这些可以独立于组件使用。它包括 `ref()`、`reactive()`、`computed()`、`watch()` 和 `watchEffect()` 等函数。

响应式 API 是组合式 API 的子集。

更多详情请参见：

- [响应式 API：核心](/api/reactivity-core.html)
- [响应式 API：工具](/api/reactivity-utilities.html)
- [响应式 API：进阶](/api/reactivity-advanced.html)

## ref {#ref}

> 此条目是关于将 `ref` 用于响应性。对于模板中使用的 `ref` 属性，请改为参见[模板 ref](#template-ref)。

`ref` 是 Rue 响应式系统的一部分。它是一个具有单个响应式属性（称为 `value`）的对象。

有各种不同类型的 ref。例如，可以使用 `ref()`、`shallowRef()`、`computed()` 和 `customRef()` 创建 ref。函数 `isRef()` 可用于检查对象是否为 ref，`isReadonly()` 可用于检查 ref 是否允许直接重新赋值其值。

更多详情请参见：

- [指南 - 响应式基础](/guide/essentials/reactivity-fundamentals.html)
- [响应式 API：核心](/api/reactivity-core.html)
- [响应式 API：工具](/api/reactivity-utilities.html)
- [响应式 API：进阶](/api/reactivity-advanced.html)

## 渲染函数 {#render-function}

*渲染函数*是组件中生成渲染输出的部分。模板或 JSX 可以被编译成更接近 Block / Vapor / Renderable 的产物，而手写渲染函数则通过 `h()` 等 API 显式描述输出边界。

更多详情请参见：

- [指南 - 渲染函数 & JSX](/guide/extras/render-function.html)

## 调度器 {#scheduler}

*调度器*是 Rue 内部控制[响应式副作用](#reactive-effect)运行时间的部分。

当响应式状态更改时，Rue 不会立即触发渲染更新。相反，它使用队列将它们批量处理在一起。这确保了一个组件只重新渲染一次，即使对底层数据进行了多次更改。

[侦听器](/guide/essentials/watchers.html)也使用调度器队列进行批处理。具有 `flush: 'pre'`（默认）的侦听器将在组件渲染之前运行，而那些具有 `flush: 'post'` 的将在组件渲染之后运行。

调度器中的作业还用于执行各种其他内部任务，例如触发某些[生命周期钩子](#lifecycle-hooks)和更新[模板 ref](#template-ref)。

## 作用域插槽 {#scoped-slot}

*作用域插槽*这个术语用于指接收[prop](#prop)的[插槽](#slot)。

从历史上看，Rue 对作用域插槽和非作用域插槽做了更大的区分。在某种程度上，它们可以被视为两个独立的特性，统一在共同的模板语法之后。

在 Rue 3 中，插槽 API 被简化为使所有插槽的行为都像作用域插槽。然而，作用域和非作用域插槽的用例通常不同，因此该术语仍然有用，作为指代带有 props 的插槽的方式。

传递给插槽的 props 只能在父模板中定义插槽内容的特定区域内使用。模板的这个区域充当 props 的变量作用域，因此得名"作用域插槽"。

更多详情请参见：

- [指南 - 插槽 - 作用域插槽](/guide/components/slots.html#scoped-slots)

## SFC {#sfc}

参见[单文件组件](#single-file-component)。

## 副作用 {#side-effect}

*副作用*这个术语并不是 Rue 特有的。它用于描述在其局部作用域之外执行某些操作的函数或操作。

例如，在设置 `user.name = null` 这样的属性的上下文中，预期这会改变 `user.name` 的值。如果它还执行其他操作，例如触发 Rue 的响应式系统，那么这将被描述为副作用。这就是 Rue 中[响应式副作用](#reactive-effect)这个术语的起源。

当函数被描述为具有副作用时，这意味着该函数执行某种在函数外部可观察的操作，而不仅仅是返回一个值。这可能意味着它更新了状态中的值，或触发了网络请求。

该术语通常在描述渲染或计算属性时使用。渲染没有副作用被认为是最佳实践。同样，计算属性的 getter 函数也不应该有副作用。

## 插槽 {#slot}

插槽用于将内容传递给子组件。props 用于传递数据值，而插槽用于传递由 HTML 元素和其他 Rue 组件组成的更丰富内容。

更多详情请参见：

- [指南 - 插槽](/guide/components/slots.html)

## 模板 ref {#template-ref}

*模板 ref*这个术语指的是在模板中的标签上使用 `ref` 属性。组件渲染后，此属性用于用与模板中标签对应的 HTML 元素或组件实例填充相应的属性。

如果你使用的是选项式 API，则 refs 通过 `$refs` 对象的属性公开。

使用组合式 API 时，模板 ref 用同名的响应式[ref](#ref)填充。

模板 ref 不应与 Rue 响应式系统中的响应式 ref 混淆。

更多详情请参见：

- [指南 - 模板 Refs](/guide/essentials/template-refs.html)

## VDOM {#vdom}

参见[旧的整树 diff 渲染模型](#virtual-dom)。

## 旧的整树 diff 渲染模型 {#virtual-dom}

这个锚点保留给历史文档跳转使用。Rue 当前默认路径并不围绕整棵对象树比较来组织，而是围绕 Block / Vapor / Renderable 与 DOM 区间更新组织。

浏览器使用节点树来表示页面当前状态。该树以及用于与之交互的 JavaScript API 被称为*文档对象模型*或*DOM*。

Rue 现在更倾向于在编译阶段提前确定静态结构、动态区段、锚点与清理边界，再让运行时直接更新对应的 DOM 范围。

如果你在旧文档里看到这类历史表述，请把它理解为迁移语境下的旧名词，而不是 Rue 当前默认机制。

更多详情请参见：

- [指南 - 渲染机制](/guide/extras/rendering-mechanism.html)
- [指南 - 渲染函数 & JSX](/guide/extras/render-function.html)

## 公开渲染输出 {#vnode}

这个锚点同样保留给历史跳转使用。对 Rue 当前主路径来说，更准确的理解是：`h()` 产出的是公开渲染输出对象，它属于显式手写渲染边界，而不是默认内部渲染货币。

更多信息请参见[旧的整树 diff 渲染模型](#virtual-dom)。

## Web 组件 {#web-component}

*Web 组件*标准是现代 Web 浏览器中实现的一组功能。

Rue 组件不是 Web 组件，但 `useCustomElement()` 可用于从 Rue 组件创建[自定义元素](#custom-element)。Rue 还支持在 Rue 组件内部使用自定义元素。

更多详情请参见：

- [指南 - Rue 和 Web 组件](/guide/extras/web-components.html)
