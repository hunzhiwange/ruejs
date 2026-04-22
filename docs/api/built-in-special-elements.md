# 内置特殊元素 {#built-in-special-elements}

:::info 不是组件
`<component>`、`<slot>` 和 `<template>` 是类似组件的功能，是模板语法的一部分。它们不是真正的组件，在模板编译期间会被编译掉。因此，它们在模板中通常用小写字母书写。
:::

## `<component>` {#component} @todo

用于渲染动态组件或元素的"元组件"。

- **Props**

  ```ts
  interface DynamicComponentProps {
    is: string | Component
  }
  ```

- **详情**

  实际要渲染的组件由 `is` prop 决定。
  - 当 `is` 是字符串时，它可以是 HTML 标签名或组件的注册名称。

  - 或者，`is` 也可以直接绑定到组件的定义。

- **示例**

  使用变量渲染组件：

  ```tsx
  import Foo from './Foo'
  import Bar from './Bar'

  // 渲染 Foo
  <component is={Foo} />

  // 条件渲染
  <component is={Math.random() > 0.5 ? Foo : Bar} />
  ```

  渲染 HTML 元素：

  ```tsx
  <component is={href ? 'a' : 'span'} />
  ```

  [内置组件](./built-in-components)都可以传递给 `is`，但如果您想通过名称传递，则必须注册它们。例如：

  ```tsx
  import { Transition, TransitionGroup } from '@rue-js/rue'

  // 需要注册
  ;<component is={isGroup ? TransitionGroup : Transition}>...</component>
  ```

  如果您将组件本身传递给 `is` 而不是其名称，则不需要注册，例如在函数组件中。

  如果在 `<component>` 标签上使用 `v-model` 等效模式，模板编译器会将其扩展为 `modelValue` prop 和 `onUpdate:modelValue` 事件监听器，就像对其他任何组件一样。但是，这不适用于原生 HTML 元素，例如 `<input>` 或 `<select>`。因此，使用动态创建的原生元素将无法工作：

  ```tsx
  import { useState } from '@rue-js/rue'

  const [tag, setTag] = useState('input')
  const [username, setUsername] = useState('')

  // 这不适用于原生 HTML 元素
  <component
    is={tag}
    value={username}
    onChange={(e) => setUsername(e.target.value)}
  />
  ```

  实际上，这种边缘情况并不常见，因为原生表单字段通常在真实应用程序中包装在组件中。如果您确实需要直接使用原生元素，可以手动将逻辑拆分为属性和事件。

- **另请参阅** [动态组件](/guide/essentials/component-basics#dynamic-components)

## `<slot>` {#slot} @todo

表示模板中的插槽内容出口。

- **Props**

  ```ts
  interface SlotProps {
    /**
     * 传递给 <slot> 的任何 props 都作为参数
     * 传递给作用域插槽
     */
    [key: string]: any
    /**
     * 保留用于指定插槽名称。
     */
    name?: string
  }
  ```

- **详情**

  `<slot>` 元素可以使用 `name` 属性来指定插槽名称。当没有指定 `name` 时，它将渲染默认插槽。传递给插槽元素的额外属性将作为插槽 props 传递给父级中定义的作用域插槽。

  该元素本身将被其匹配的插槽内容替换。

  Rue 模板中的 `<slot>` 元素被编译为 JavaScript，因此不应与[原生 `<slot>` 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/slot)混淆。

- **另请参阅** [组件 - 插槽](/guide/components/slots)

## `<template>` {#template} @todo

`<template>` 标签在我们想使用内置指令而不在 DOM 中渲染元素时用作占位符。

- **详情**

  只有当 `<template>` 与以下指令之一一起使用时，才会触发特殊处理：
  - `v-if`、`v-else-if` 或 `v-else` 的 Rue 等效实现
  - 列表渲染的 Rue 等效实现
  - 插槽的 Rue 等效实现

  如果这些指令都不存在，它将被渲染为[原生 `<template>` 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template)。

  具有列表渲染的 `<template>` 也可以具有 [`key` 属性](/api/built-in-special-attributes#key)。所有其他属性和指令将被丢弃，因为它们在没有相应元素的情况下没有意义。

  单文件组件使用[顶级 `<template>` 标签](/api/sfc-spec#language-blocks)来包装整个模板。该用法与上述 `<template>` 的用法分开。该顶级标签不是模板本身的一部分，不支持模板语法，例如指令。

- **另请参阅**
  - [指南 - 条件渲染中的 `<template>`](/guide/essentials/conditional#v-if-on-template)
  - [指南 - 列表渲染中的 `<template>`](/guide/essentials/list#v-for-on-template)
  - [指南 - 具名插槽](/guide/components/slots#named-slots)
