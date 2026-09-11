# 内置特殊元素 {#built-in-special-elements}

:::info 不是组件
`<Component>`、`<Slot>` 和 `<Template>` 是模板语法中的特殊元素，不会按普通组件解析。模板编译器会把它们转换为对应的运行时能力，因此在模板中通常用小写字母书写。

在 JSX / TSX 中，Rue 另外提供了与之对应的运行时导出：`Component`、`Slot` 和 `Template`。它们表达的是同一套语义，只是调用方式更接近普通组件，并且需要从 `@rue-js/rue` 显式导入后才能使用。
:::

## `<Component>` {#component}

`<Component>` 只用于在编译器可证明的有限组件集合中切换。

- **Props**

  ```ts
  interface DynamicComponentProps {
    is: string
    registry: Record<string, ComponentInstance>
    [key: string]: unknown
  }
  ```

- **详情**

  JSX / TSX 调用点必须提供字面量 `registry`，其中每个值都是静态组件工厂。编译器把 `is` 降为有限分支；任意函数值、全局字符串注册、动态原生标签和缺少 registry 的调用均不受支持。

- **示例**

  ```tsx
  import { Component } from '@rue-js/rue'
  import Foo from './Foo'
  import Bar from './Bar'

  ;<Component is={kind.value} registry={{ foo: Foo, bar: Bar }} />
  ```

- **另请参阅** [动态组件](/guide/guide/essentials/component-basics#dynamic-components)

## `<Slot>` {#slot}

表示模板中的插槽内容出口。

- **Props**

  ```ts
  interface SlotProps {
    name?: string
    props?: Record<string, unknown>
    source?: Record<string, unknown> | null
    children?: RenderableOutput
  }
  ```

- **详情**

  `<Slot>` 元素可以使用 `name` 属性指定插槽名称。不传时渲染默认插槽。

  对于具名插槽和作用域插槽，Rue 会优先从内部的 slot bag 中读取内容；如果没有，再兼容读取同名普通 prop。默认插槽则优先读取内部 `default` 槽位，回退到 `children`。

  如果匹配的插槽不存在，或者插槽值为空，`<Slot>` 会渲染自身的后备内容。

  当匹配到的是作用域插槽函数时，Rue 会用 `props` 中提供的对象作为参数调用它。

  该元素本身将被其匹配的插槽内容替换。

  Rue 模板中的 `<Slot>` 元素被编译为 JavaScript，因此不应与[原生 `<Slot>` 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/slot)混淆。

  在模板里，传给 `<Slot>` 的额外属性会被编译器整理为作用域插槽参数；在 JSX / TSX 中直接使用运行时 `Slot` 组件时，需要显式通过 `props` 传入这些参数。

  在 JSX / TSX 中，应使用大写的 `Slot`，并从 `@rue-js/rue` 显式导入；小写 `<Slot>` 仅用于模板语法。

- **示例**

  默认插槽与后备内容：

  ```tsx
  import { Slot } from '@rue-js/rue'
  ;<Slot>
    <p>fallback content</p>
  </Slot>
  ```

  具名插槽：

  ```tsx
  import { Slot } from '@rue-js/rue'
  ;<Slot name="header" />
  ```

  作用域插槽：

  ```tsx
  import { Slot } from '@rue-js/rue'
  ;<Slot name="item" props={{ item: post, index }} />
  ```

- **另请参阅** [组件 - 插槽](/guide/guide/components/slots)

## `<Template>` / `<Template>` {#template}

`<Template>` 在模板中用作不产生额外 DOM 元素的占位符；在 JSX / TSX 中，对应的运行时组件名为 `Template`。

- **Props**

  ```ts
  type TemplateProps = {
    children?: RenderableOutput
    [key: string]: unknown
  }
  ```

- **详情**

  只有当 `<Template>` 与以下指令之一一起使用时，才会触发特殊处理：
  - `v-if`、`v-else-if` 或 `v-else` 的 Rue 等效实现
  - 列表渲染的 Rue 等效实现
  - 插槽的 Rue 等效实现

  如果这些指令都不存在，编译器应保留它并将其视为[原生 `<Template>` 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template)。

  带有列表渲染的 `<Template>` 也可以具有 [key 属性](/api/api/built-in-special-attributes#key)。除这一类控制边界的语义外，其余属性和指令在没有实际元素节点时都会被忽略。

  在 JSX / TSX 中直接使用 `Template` 时，它会只渲染子节点本身，不引入额外包装元素；除 `children` 之外的其他 props 在运行时会被忽略。

  在 JSX / TSX 中，应使用大写的 `Template`，并从 `@rue-js/rue` 显式导入；小写 `<Template>` 仅用于模板语法。

- **示例**

  在 JSX / TSX 中分组多个子节点而不引入包装元素：

  ```tsx
  import { Template } from '@rue-js/rue'
  ;<Template>
    <h1>Title</h1>
    <p>Content</p>
  </Template>
  ```

  与列表渲染组合使用：

  ```tsx
  import { Template } from '@rue-js/rue'

  {
    todos.map(todo => (
      <Template key={todo.id}>
        <li>{todo.text}</li>
        <li className="divider" />
      </Template>
    ))
  }
  ```

- **另请参阅**
  - [指南 - 条件渲染中的 `<Template>`](/guide/guide/essentials/conditional#v-if-on-template)
  - [指南 - 列表渲染中的 `<Template>`](/guide/guide/essentials/list#v-for-on-template)
  - [指南 - 具名插槽](/guide/guide/components/slots#named-slots)
