# 优先级 D 规则：谨慎使用 {#priority-d-rules-use-with-caution}

::: warning 注意
此风格指南需要审查。如果你有任何问题或建议，请[提交 issue](https://github.com/ruejs/docs/issues/new)。
:::

Vue 的某些功能存在是为了适应罕见的边缘情况或从遗留代码库更平滑地迁移。然而，如果过度使用，它们会使你的代码更难维护，甚至成为错误的来源。这些规则揭示了潜在的风险功能，描述了何时以及为什么应该避免使用它们。

## 在 scoped 中使用元素选择器 {#element-selectors-with-scoped}

**应避免在 `scoped` 中使用元素选择器。**

优先在 `scoped` 样式中使用类选择器而不是元素选择器，因为大量元素选择器很慢。

::: details 详细解释
为了限定样式范围，Vue 向组件元素添加唯一属性，例如 `data-v-f3f3eg9`。然后选择器被修改，以便仅选择具有此属性的匹配元素（例如 `button[data-v-f3f3eg9]`）。

问题是，大量元素-属性选择器（例如 `button[data-v-f3f3eg9]`）将比类-属性选择器（例如 `.btn-close[data-v-f3f3eg9]`）慢得多，因此应尽可能优先使用类选择器。
:::

<div class="style-example style-example-bad">
<h3>Bad</h3>

```jsx
<button>×</button>

<style scoped>
button {
  background-color: red;
}
</style>
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```jsx
<button class="btn btn-close">×</button>

<style scoped>
.btn-close {
  background-color: red;
}
</style>
```

</div>

## 隐式父子通信 {#implicit-parent-child-communication}

**应优先使用 props 和事件进行父子组件通信，而不是直接访问父组件或修改 props。**

理想的 Vue 应用是 props 向下传递，事件向上传递。坚持这一约定使你的组件更容易理解。然而，存在一些边缘情况，prop 修改或直接访问父组件可以简化已经深度耦合的两个组件。

问题是，也有许多 _简单_ 的情况，这些模式可能提供便利。注意：不要被引诱用短期便利（编写更少的代码）来换取简单性（能够理解你的状态流）。

<div class="options-api">

<div class="style-example style-example-bad">
<h3>Bad</h3>

```js
app.component('TodoItem', {
  props: {
    todo: {
      type: Object,
      required: true,
    },
  },

  template: '<input v-model="todo.text">',
})
```

```js
app.component('TodoItem', {
  props: {
    todo: {
      type: Object,
      required: true,
    },
  },

  methods: {
    removeTodo() {
      this.$parent.todos = this.$parent.todos.filter(todo => todo.id !== this.todo.id)
    },
  },

  template: `
    <span>
      {{ todo.text }}
      <button onClick="removeTodo">
        ×
      </button>
    </span>
  `,
})
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```js
app.component('TodoItem', {
  props: {
    todo: {
      type: Object,
      required: true,
    },
  },

  emits: ['input'],

  template: `
    <input
      value="todo.text"
      onInput="$emit('input', $event.target.value)"
    />
  `,
})
```

```js
app.component('TodoItem', {
  props: {
    todo: {
      type: Object,
      required: true,
    },
  },

  emits: ['delete'],

  template: `
    <span>
      {{ todo.text }}
      <button onClick="$emit('delete')">
        ×
      </button>
    </span>
  `,
})
```

</div>

</div>

<div class="composition-api">

<div class="style-example style-example-bad">
<h3>Bad</h3>

```jsx
<script>
defineProps({
  todo: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <input v-model="todo.text" />
</template>
```

```jsx
<script>
import { getCurrentInstance } from '@rue-js/rue'

const props = defineProps({
  todo: {
    type: Object,
    required: true,
  },
})

const instance = getCurrentInstance()

function removeTodo() {
  const parent = instance.parent
  if (!parent) return

  parent.props.todos = parent.props.todos.filter(todo => {
    return todo.id !== props.todo.id
  })
}
</script>

<template>
  <span>
    {{ todo.text }}
    <button onClick="removeTodo">×</button>
  </span>
</template>
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```jsx
<script>
defineProps({
  todo: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['input'])
</script>

<template>
  <input value="todo.text" onInput="emit('input', $event.target.value)" />
</template>
```

```jsx
<script>
defineProps({
  todo: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['delete'])
</script>

<template>
  <span>
    {{ todo.text }}
    <button onClick="emit('delete')">×</button>
  </span>
</template>
```

</div>

</div>
