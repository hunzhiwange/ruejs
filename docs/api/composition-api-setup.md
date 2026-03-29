# 组合式 API：setup() {#composition-api-setup}

## 基本用法 {#basic-usage}

`setup()` 钩子作为在以下情况下在组件中使用组合式 API 的入口点：

1. 不使用构建步骤使用组合式 API；
2. 在选项式 API 组件中集成基于组合式 API 的代码。

:::info 注意
如果您在单文件组件中使用组合式 API，强烈建议使用 [`<script setup>`](/api/sfc-script-setup) 以获得更简洁和符合人体工程学的语法。
:::

我们可以使用[响应式 API](./reactivity-core)声明响应式状态，并通过从 `setup()` 返回一个对象将它们暴露给模板。返回对象上的属性也将在组件实例上可用（如果使用其他选项）：

```js
import { useState } from 'rue-js'

export default {
  setup() {
    const [count, setCount] = useState(0)

    // 暴露给模板和其他选项式 API 钩子
    return {
      count,
      setCount,
    }
  },

  mounted() {
    console.log(this.count) // 0
  },
}
```

`setup()` 本身无权访问组件实例 - `this` 在 `setup()` 内部将为 `undefined`。您可以从选项式 API 访问组合式 API 暴露的值，但反之则不行。

`setup()` 应*同步*返回一个对象。只有当组件是 [Suspense](../guide/built-ins/suspense) 组件的后代时，才能使用 `async setup()`。

## 访问 Props {#accessing-props}

`setup` 函数中的第一个参数是 `props` 参数。正如您在标准组件中所期望的那样，`setup` 函数中的 `props` 是响应式的，当传入新的 props 时会更新。

```js
export default {
  props: {
    title: String,
  },
  setup(props) {
    console.log(props.title)
  },
}
```

请注意，如果您解构 `props` 对象，解构的变量将失去响应性。因此建议始终以 `props.xxx` 的形式访问 props。

如果您确实需要解构 props，或者需要将 prop 传递给外部函数同时保持响应性，可以使用 [toRefs()](./reactivity-utilities#torefs) 和 [toRef()](/api/reactivity-utilities#toref) 实用 API：

```js
import { toRefs, toRef } from 'rue-js'

export default {
  setup(props) {
    // 将 `props` 转换为 refs 对象，然后解构
    const { title } = toRefs(props)
    // `title` 是一个跟踪 `props.title` 的 ref
    console.log(title.value)

    // 或者，将 `props` 上的单个属性转换为 ref
    const title = toRef(props, 'title')
  },
}
```

## Setup Context {#setup-context}

传递给 `setup` 函数的第二个参数是一个 **Setup Context** 对象。上下文对象暴露了 `setup` 内部可能有用的其他值：

```js
export default {
  setup(props, context) {
    // 属性（非响应式对象，相当于 $attrs）
    console.log(context.attrs)

    // 插槽（非响应式对象，相当于 $slots）
    console.log(context.slots)

    // 触发事件（函数，相当于 $emit）
    console.log(context.emit)

    // 暴露公共属性（函数）
    console.log(context.expose)
  },
}
```

上下文对象不是响应式的，可以安全地解构：

```js
export default {
  setup(props, { attrs, slots, emit, expose }) {
    // ...
  },
}
```

`attrs` 和 `slots` 是有状态对象，当组件本身更新时始终会更新。这意味着您应该避免解构它们，并始终将属性引用为 `attrs.x` 或 `slots.x`。另请注意，与 `props` 不同，`attrs` 和 `slots` 的属性**不是**响应式的。如果您打算根据 `attrs` 或 `slots` 的更改应用副作用，应在 `onBeforeUpdate` 生命周期钩子中执行。

### 暴露公共属性 {#exposing-public-properties}

`expose` 是一个可用于显式限制当父组件通过[模板 refs](/guide/essentials/template-refs#ref-on-component)访问组件实例时暴露的属性的函数：

```js{5,10}
export default {
  setup(props, { expose }) {
    // 使实例"封闭" -
    // 即不向父级暴露任何内容
    expose()

    const publicCount = useSignal(0)
    const privateCount = useSignal(0)
    // 选择性暴露本地状态
    expose({ count: publicCount })
  }
}
```

## 与渲染函数一起使用 {#usage-with-render-functions}

`setup` 还可以返回一个[渲染函数](/guide/extras/render-function)，该函数可以直接使用在同一作用域中声明的响应式状态：

```js{6}
import { h, useState } from 'rue-js'

export default {
  setup() {
    const [count, setCount] = useState(0)
    return () => h('div', count)
  }
}
```

返回渲染函数会阻止我们返回其他任何东西。这在内部不应该是个问题，但如果我们想通过模板 refs 将此组件的方法暴露给父组件，可能会出现问题。

我们可以通过调用 [`expose()`](#exposing-public-properties) 来解决这个问题：

```js{8-10}
import { h, useState } from 'rue-js'

export default {
  setup(props, { expose }) {
    const [count, setCount] = useState(0)
    const increment = () => setCount(c => c + 1)

    expose({
      increment
    })

    return () => h('div', count)
  }
}
```

然后，`increment` 方法将通过模板 ref 在父组件中可用。
