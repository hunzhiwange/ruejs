# 自定义指令 {#custom-directives}

<script setup>
const vHighlight = {
  mounted: (el: HTMLElement) => {
    el.classList.add('is-highlight')
  }
}
</script>

<style>
.vt-doc p.is-highlight {
  margin-bottom: 0;
}

.is-highlight {
  background-color: yellow;
  color: black;
}
</style>

## 简介 {#introduction}

除了核心中默认提供的指令集（如 `v-model` 或 `v-show`）之外，Rue 还允许你注册自己的自定义指令。

我们已经在 Rue 中介绍了两种代码复用形式：[组件](/guide/essentials/component-basics)和 [composables](./composables)。组件是主要的构建块，而 composables 专注于复用有状态逻辑。另一方面，自定义指令主要用于复用涉及对普通元素进行底层 DOM 访问的逻辑。

自定义指令被定义为一个包含类似于组件生命周期钩子的对象。这些钩子接收指令绑定的元素。以下是一个示例，展示了一个在元素被 Rue 插入 DOM 时为其添加类的指令：

```tsx
import { type FC, ref } from '@rue-js/rue'

// 启用模板中的 v-highlight
const vHighlight = {
  mounted: (el: HTMLElement) => {
    el.classList.add('is-highlight')
  },
}

export const MyComponent: FC = () => {
  return () => <p v-highlight>这句话很重要！</p>
}
```

<div class="demo">
  <p v-highlight>这句话很重要！</p>
</div>

在 Rue 的 JSX/TSX 中，自定义指令通常作为对象使用。指令名使用驼峰命名法（camelCase），然后在模板中使用时转换为短横线命名法（kebab-case）。

也可以在应用级别全局注册自定义指令：

```ts
import { createApp } from '@rue-js/rue'

const app = createApp({})

// 使 v-highlight 在所有组件中可用
app.directive('highlight', {
  mounted(el) {
    el.classList.add('is-highlight')
  },
})
```

可以通过扩展 `@rue-js/rue` 中的 `ComponentCustomProperties` 接口来为全局自定义指令添加类型支持。

更多详情：[类型化全局自定义指令](/guide/typescript/composition-api#typing-global-custom-directives) <sup class="vt-badge ts" />

## 何时使用自定义指令 {#when-to-use}

只有当所需功能无法通过其他方式实现，只能通过直接 DOM 操作时，才应该使用自定义指令。

一个常见的例子是 `v-focus` 自定义指令，它将元素带入聚焦状态。

```tsx
import { type FC } from '@rue-js/rue'

const vFocus = {
  mounted: (el: HTMLElement) => el.focus(),
}

export const MyComponent: FC = () => {
  return () => <input v-focus />
}
```

这个指令比 `autofocus` 属性更有用，因为它不仅在页面加载时有效——当元素被 Rue 动态插入时也同样有效！

只要可能，建议优先使用声明式模板和内置指令（如 `v-bind`），因为它们更高效且对服务端渲染友好。

## 指令钩子 {#directive-hooks}

指令定义对象可以提供几个钩子函数（都是可选的）：

```ts
const myDirective = {
  // 在绑定元素的属性或事件监听器应用之前调用
  created(el, binding, vnode) {
    // 参见下文了解参数详情
  },
  // 在元素插入 DOM 之前调用
  beforeMount(el, binding, vnode) {},
  // 在绑定元素的父组件及其所有子组件挂载后调用
  mounted(el, binding, vnode) {},
  // 在父组件更新之前调用
  beforeUpdate(el, binding, vnode, prevVnode) {},
  // 在父组件及其所有子组件更新后调用
  updated(el, binding, vnode, prevVnode) {},
  // 在父组件卸载之前调用
  beforeUnmount(el, binding, vnode) {},
  // 在父组件卸载时调用
  unmounted(el, binding, vnode) {},
}
```

### 钩子参数 {#hook-arguments}

指令钩子传递以下参数：

- `el`：指令绑定的元素。可用于直接操作 DOM。

- `binding`：包含以下属性的对象。
  - `value`：传递给指令的值。例如在 `v-my-directive="1 + 1"` 中，值将是 `2`。
  - `oldValue`：先前的值，仅在 `beforeUpdate` 和 `updated` 中可用。无论值是否已更改，它都可用。
  - `arg`：传递给指令的参数（如果有）。例如在 `v-my-directive:foo` 中，arg 将是 `"foo"`。
  - `modifiers`：包含修饰符的对象（如果有）。例如在 `v-my-directive.foo.bar` 中，modifiers 对象将是 `{ foo: true, bar: true }`。
  - `instance`：使用指令的组件实例。
  - `dir`：指令定义对象。

- `vnode`：表示绑定元素的底层 VNode。
- `prevVnode`：表示上一个渲染中绑定元素的 VNode。仅在 `beforeUpdate` 和 `updated` 钩子中可用。

例如，考虑以下指令用法：

```tsx
<div v-example:foo.bar="baz" />
```

`binding` 参数将是一个形状如下的对象：

```ts
{
  arg: 'foo',
  modifiers: { bar: true },
  value: /* `baz` 的值 */,
  oldValue: /* 上一次更新的 `baz` 值 */
}
```

与内置指令类似，自定义指令参数也可以是动态的。例如：

```tsx
<div v-example:[arg]="value" />
```

这里，指令参数将根据我们组件状态中的 `arg` 属性进行响应式更新。

:::tip 注意
除了 `el` 之外，你应该将这些参数视为只读，永远不要修改它们。如果你需要在钩子之间共享信息，建议通过元素的 [dataset](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset) 来实现。
:::

## 函数简写 {#function-shorthand}

自定义指令通常在 `mounted` 和 `updated` 中具有相同的行为，不需要其他钩子。在这种情况下，我们可以将指令定义为函数：

```tsx
<div v-color={color} />
```

```ts
app.directive('color', (el, binding) => {
  // 这将在 `mounted` 和 `updated` 中被调用
  el.style.color = binding.value
})
```

## 对象字面量 {#object-literals}

如果你的指令需要多个值，你也可以传入 JavaScript 对象字面量。记住，指令可以接受任何有效的 JavaScript 表达式。

```tsx
<div v-demo={{ color: 'white', text: 'hello!' }} />
```

```ts
app.directive('demo', (el, binding) => {
  console.log(binding.value.color) // => "white"
  console.log(binding.value.text) // => "hello!"
})
```

## 在组件上使用 {#usage-on-components}

:::warning 不推荐
在组件上使用自定义指令不推荐。当组件具有多个根节点时，可能会发生意外行为。
:::

在组件上使用时，自定义指令将始终应用于组件的根节点，类似于[透传 Attributes](/guide/components/attrs)。

```tsx
<MyComponent v-demo="test" />
```

```tsx
// MyComponent 的模板
<div>
  {/* v-demo 指令将应用在这里 */}
  <span>我的组件内容</span>
</div>
```

请注意，组件可能具有多个根节点。当应用于多根组件时，指令将被忽略并抛出警告。与属性不同，指令不能用 `v-bind="$attrs"` 传递给不同的元素。
