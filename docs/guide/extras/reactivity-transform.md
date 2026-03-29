# 响应式转换 {#reactivity-transform}

:::danger 已移除的实验性功能
响应式转换是一个实验性功能，已在最新的 3.4 版本中移除。请阅读[这里的原因](https://github.com/@rue-js/ruejs/rfcs/discussions/369#discussioncomment-5059028)。

如果你仍然打算使用它，它现在可以通过 [Rue Macros](https://rue-macros.sxzz.moe/features/reactivity-transform.html) 插件获得。
:::

:::tip 仅适用于 Composition API
响应式转换是特定于 Composition API 的功能，需要构建步骤。
:::

## Refs 与响应式变量 {#refs-vs-reactive-variables}

自从引入 Composition API 以来，一个主要未解决的问题是 refs 与响应式对象的使用。在解构响应式对象时很容易丢失响应式，而在使用 refs 时到处使用 `.value` 可能会很麻烦。此外，如果不使用类型系统，`.value` 很容易被遗漏。

[Rue 响应式转换](https://github.com/@rue-js/ruejs/core/tree/main/packages/reactivity-transform)是一个编译时转换，允许我们编写这样的代码：

```vue
<script setup lang="ts">
let count = $ref(0)

console.log(count)

function increment() {
  count++
}
</script>

<template>
  <button @click="increment">{{ count }}</button>
</template>
```

这里的 `$ref()` 方法是一个**编译时宏**：它不是一个会在运行时实际调用的方法。相反，Rue 编译器使用它作为提示，将生成的 `count` 变量视为**响应式变量**。

响应式变量可以像普通变量一样被访问和重新赋值，但这些操作被编译成带有 `.value` 的 refs。例如，上述组件的 `<script>` 部分被编译成：

```js{5,8}
import { ref } from '@rue-js/rue'

let count = ref(0)

console.log(count.value)

function increment() {
  count.value++
}
```

每个返回 refs 的响应式 API 都会有一个 `$` 前缀的宏等效项。这些 API 包括：

- [`ref`](/api/reactivity-core#ref) -> `$ref`
- [`computed`](/api/reactivity-core#computed) -> `$computed`
- [`shallowRef`](/api/reactivity-advanced#shallowref) -> `$shallowRef`
- [`customRef`](/api/reactivity-advanced#customref) -> `$customRef`
- [`toRef`](/api/reactivity-utilities#toref) -> `$toRef`

这些宏是全局可用的，在启用响应式转换时不需要导入，但如果你想更明确，可以从 `@rue-js/rue/macros` 选择性地导入它们：

```js
import { $ref } from '@rue-js/rue/macros'

let count = $ref(0)
```

## 使用 `$()` 进行解构 {#destructuring-with}

组合函数返回 refs 对象并使用解构来检索这些 refs 是很常见的。为此，响应式转换提供了 **`$()`** 宏：

```js
import { useMouse } from '@rueuse/core'

const { x, y } = $(useMouse())

console.log(x, y)
```

编译输出：

```js
import { toRef } from '@rue-js/rue'
import { useMouse } from '@rueuse/core'

const __temp = useMouse(),
  x = toRef(__temp, 'x'),
  y = toRef(__temp, 'y')

console.log(x.value, y.value)
```

注意，如果 `x` 已经是 ref，`toRef(__temp, 'x')` 将简单地原样返回它，不会创建额外的 ref。如果解构的值不是 ref（例如函数），它仍然可以工作——该值将被包装在 ref 中，以便其余代码按预期工作。

`$()` 解构适用于响应式对象**和**包含 refs 的普通对象。

## 使用 `$()` 将现有 Refs 转换为响应式变量 {#convert-existing-refs-to-reactive-variables-with}

在某些情况下，我们可能有也返回 refs 的包装函数。然而，Rue 编译器无法提前知道函数将返回 ref。在这种情况下，`$()` 宏也可用于将任何现有 refs 转换为响应式变量：

```js
function myCreateRef() {
  return ref(0)
}

let count = $(myCreateRef())
```

## 响应式 Props 解构 {#reactive-props-destructure}

当前在 `<script setup>` 中使用 `defineProps()` 有两个痛点：

1. 与 `.value` 类似，你需要始终将 props 作为 `props.x` 访问以保持响应式。这意味着你不能解构 `defineProps`，因为生成的解构变量不是响应式的，不会更新。

2. 当使用[仅类型的 props 声明](/api/sfc-script-setup#type-only-props-emit-declarations)时，没有简单的方法来声明 props 的默认值。我们为此引入了 `withDefaults()` API，但使用它仍然很笨拙。

我们可以通过在使用解构时对 `defineProps` 应用编译时转换来解决这些问题，类似于我们之前看到的 `$()`：

```html
<script setup lang="ts">
  interface Props {
    msg: string
    count?: number
    foo?: string
  }

  const {
    msg,
    // 默认值可以直接工作
    count = 1,
    // 本地别名也可以直接工作
    // 这里我们将 `props.foo` 别名为 `bar`
    foo: bar,
  } = defineProps<Props>()

  watchEffect(() => {
    // 当 props 更改时将记录日志
    console.log(msg, count, bar)
  })
</script>
```

上述代码将被编译成以下运行时声明等效代码：

```js
export default {
  props: {
    msg: { type: String, required: true },
    count: { type: Number, default: 1 },
    foo: String,
  },
  setup(props) {
    watchEffect(() => {
      console.log(props.msg, props.count, props.foo)
    })
  },
}
```

## 在函数边界之间保持响应式 {#retaining-reactivity-across-function-boundaries}

虽然响应式变量使我们从到处使用 `.value` 中解脱出来，但当我们在函数边界之间传递响应式变量时，它会产生"响应式丢失"的问题。这可能在两种情况下发生：

### 作为参数传入函数 {#passing-into-function-as-argument}

给定一个期望 ref 作为参数的函数，例如：

```ts
function trackChange(x: Ref<number>) {
  watch(x, x => {
    console.log('x changed!')
  })
}

let count = $ref(0)
trackChange(count) // 不起作用！
```

上述情况不会按预期工作，因为它编译为：

```ts
let count = ref(0)
trackChange(count.value)
```

这里 `count.value` 作为数字传递，而 `trackChange` 期望一个实际的 ref。这可以通过在传递之前用 `$$()` 包装 `count` 来修复：

```diff
let count = $ref(0)
- trackChange(count)
+ trackChange($$(count))
```

上述代码编译为：

```js
import { ref } from '@rue-js/rue'

let count = ref(0)
trackChange(count)
```

正如我们所见，`$$()` 是一个作为**转义提示**的宏：`$$()` 内部的响应式变量不会追加 `.value`。

### 在函数作用域内返回 {#returning-inside-function-scope}

如果响应式变量直接在返回表达式中使用，响应式也会丢失：

```ts
function useMouse() {
  let x = $ref(0)
  let y = $ref(0)

  // 监听 mousemove...

  // 不起作用！
  return {
    x,
    y,
  }
}
```

上述返回语句编译为：

```ts
return {
  x: x.value,
  y: y.value,
}
```

为了保持响应式，我们应该返回实际的 refs，而不是返回时的当前值。

同样，我们可以使用 `$$()` 来修复这个问题。在这种情况下，`$$()` 可以直接用于返回的对象——`$$()` 调用中对响应式变量的任何引用将保留对其底层 refs 的引用：

```ts
function useMouse() {
  let x = $ref(0)
  let y = $ref(0)

  // 监听 mousemove...

  // 已修复
  return $$({
    x,
    y,
  })
}
```

### 在解构的 props 上使用 `$$()` {#using-on-destructured-props}

`$$()` 适用于解构的 props，因为它们也是响应式变量。编译器将使用 `toRef` 来高效地转换它：

```ts
const { count } = defineProps<{ count: number }>()

passAsRef($$(count))
```

编译为：

```js
setup(props) {
  const __props_count = toRef(props, 'count')
  passAsRef(__props_count)
}
```

## TypeScript 集成 <sup class="vt-badge ts" /> {#typescript-integration}

Rue 为这些宏提供类型定义（全局可用），所有类型都将按预期工作。与标准 TypeScript 语义没有不兼容性，因此语法将与所有现有工具一起工作。

这也意味着宏可以在任何允许有效 JS / TS 的文件中工作——不仅仅是在 Rue SFC 中。

由于宏是全局可用的，它们的类型需要显式引用（例如在 `env.d.ts` 文件中）：

```ts
/// <reference types="@rue-js/rue/macros-global" />
```

当从 `@rue-js/rue/macros` 显式导入宏时，类型将无需声明全局变量即可工作。

## 显式选择加入 {#explicit-opt-in}

:::danger 核心不再支持
以下内容仅适用于 Rue 3.3 及以下版本。在 Rue 核心 3.4 及以上版本和 `@vitejs/plugin-rue` 5.0 及以上版本中已移除支持。如果你打算继续使用转换，请迁移到 [Rue Macros](https://rue-macros.sxzz.moe/features/reactivity-transform.html)。
:::

### Vite {#vite}

- 需要 `@vitejs/plugin-rue@>=2.0.0`
- 适用于 SFC 和 js(x)/ts(x) 文件。在应用转换之前会对文件执行快速使用检查，因此对于不使用宏的文件应该没有性能开销。
- 注意 `reactivityTransform` 现在是插件根级选项，而不是嵌套在 `script.refSugar` 中，因为它影响的不仅仅是 SFC。

```js [vite.config.js]
export default {
  plugins: [
    rue({
      reactivityTransform: true,
    }),
  ],
}
```

### `rue-cli` {#rue-cli}

- 目前仅影响 SFC
- 需要 `rue-loader@>=17.0.0`

```js [rue.config.js]
module.exports = {
  chainWebpack: config => {
    config.module
      .rule('rue')
      .use('rue-loader')
      .tap(options => {
        return {
          ...options,
          reactivityTransform: true,
        }
      })
  },
}
```

### 纯 `webpack` + `rue-loader` {#plain-webpack-rue-loader}

- 目前仅影响 SFC
- 需要 `rue-loader@>=17.0.0`

```js [webpack.config.js]
module.exports = {
  module: {
    rules: [
      {
        test: /\.rue$/,
        loader: 'rue-loader',
        options: {
          reactivityTransform: true,
        },
      },
    ],
  },
}
```
