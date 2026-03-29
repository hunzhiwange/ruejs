# 优先级 A 规则：必要 {#priority-a-rules-essential}

::: warning 注意
此风格指南需要审查。如果你有任何问题或建议，请[提交 issue](https://github.com/ruejs/docs/issues/new)。
:::

这些规则有助于防止错误，因此无论如何都要学习和遵守。例外可能存在，但应该非常罕见，并且只能由精通 JavaScript 和 Vue 的专家做出。

## 使用多词组件名称 {#use-multi-word-component-names}

用户组件名称应始终是多词的，除了根 `App` 组件。这[防止冲突](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name)与现有和未来的 HTML 元素，因为所有 HTML 元素都是单个词的。

<div class="style-example style-example-bad">
<h3>Bad</h3>

```jsx
// 在预编译模板中
<Item />

// 在 DOM 模板中
<item></item>
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```jsx
// 在预编译模板中
<TodoItem />

// 在 DOM 模板中
<todo-item></todo-item>
```

</div>

## 使用详细的 prop 定义 {#use-detailed-prop-definitions}

在提交的代码中，prop 定义应始终尽可能详细，至少指定类型。

::: details 详细解释
详细的 [prop 定义](/guide/components/props#prop-validation)有两个优点：

- 它们记录了组件的 API，因此很容易看到组件应该如何使用。
- 在开发中，如果组件提供了格式不正确的 props，Vue 会警告你，帮助你捕获潜在的错误来源。
  :::

<div class="options-api">

<div class="style-example style-example-bad">
<h3>Bad</h3>

```js
// 这仅在原型设计时可用
props: ['status']
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```js
props: {
  status: String
}
```

```js
// 更好！
props: {
  status: {
    type: String,
    required: true,

    validator: value => {
      return [
        'syncing',
        'synced',
        'version-conflict',
        'error'
      ].includes(value)
    }
  }
}
```

</div>

</div>

<div class="composition-api">

<div class="style-example style-example-bad">
<h3>Bad</h3>

```js
// 这仅在原型设计时可用
const props = defineProps(['status'])
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```js
const props = defineProps({
  status: String,
})
```

```js
// 更好！

const props = defineProps({
  status: {
    type: String,
    required: true,

    validator: value => {
      return ['syncing', 'synced', 'version-conflict', 'error'].includes(value)
    },
  },
})
```

</div>

</div>

## 使用带 key 的列表渲染 {#use-keyed-v-for}

在组件上使用 `key` 与 `v-for` 始终是必需的，以便在整个子树中维护内部组件状态。即使对于元素，这也是保持可预测行为（如动画中的[对象恒定性](https://bost.ocks.org/mike/constancy/)）的良好实践。

::: details 详细解释
假设你有一个待办事项列表：

<div class="options-api">

```js
data() {
  return {
    todos: [
      {
        id: 1,
        text: 'Learn to use v-for'
      },
      {
        id: 2,
        text: 'Learn to use key'
      }
    ]
  }
}
```

</div>

<div class="composition-api">

```js
const todos = ref([
  {
    id: 1,
    text: 'Learn to use v-for',
  },
  {
    id: 2,
    text: 'Learn to use key',
  },
])
```

</div>

然后你按字母顺序对它们进行排序。更新 DOM 时，Vue 将优化渲染以执行尽可能便宜的 DOM 变更。这可能意味着删除第一个待办事项元素，然后将其重新添加到列表末尾。

问题是，有些情况下不删除将保留在 DOM 中的元素很重要。例如，你可能想要使用 `<TransitionGroup>` 来动画化列表排序，或者在渲染元素是 `<input>` 时保持焦点。在这些情况下，为每个项目添加唯一的 key（例如 `:key="todo.id"`）将告诉 Vue 如何更可预测地表现。

根据我们的经验，最好 _始终_ 添加唯一的 key，这样你和你的团队就根本不需要担心这些边缘情况。然后在罕见的、性能关键的场景中，不需要对象恒定性时，你可以有意识地做出例外。
:::

<div class="style-example style-example-bad">
<h3>Bad</h3>

```jsx
<ul>
  <li v-for="todo in todos">{todo.text}</li>
</ul>
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```jsx
<ul>
  <li v-for="todo in todos" key={todo.id}>
    {todo.text}
  </li>
</ul>
```

</div>

## 避免在 v-for 中使用 v-if {#avoid-v-if-with-v-for}

**永远不要在同一元素上同时使用 `v-if` 和 `v-for`。**

有两种常见情况可能诱使你这样做：

- 过滤列表中的项目（例如 `v-for="user in users" v-if="user.isActive"`）。在这些情况下，将 `users` 替换为返回过滤列表的新计算属性（例如 `activeUsers`）。

- 如果应该隐藏列表，则避免渲染列表（例如 `v-for="user in users" v-if="shouldShowUsers"`）。在这些情况下，将 `v-if` 移动到容器元素（例如 `div`、`ul`）。

::: details 详细解释
当 Vue 处理指令时，`v-if` 的优先级高于 `v-for`，因此以下模板：

```jsx
<ul>
  <li v-for="user in users" v-if="user.isActive" key={user.id}>
    {user.name}
  </li>
</ul>
```

将抛出错误，因为 `v-if` 指令将首先被评估，此时迭代变量 `user` 尚不存在。

这可以通过改为遍历计算属性来修复，如下所示：

<div class="options-api">

```js
computed: {
  activeUsers() {
    return this.users.filter(user => user.isActive)
  }
}
```

</div>

<div class="composition-api">

```js
const activeUsers = computed(() => {
  return users.filter(user => user.isActive)
})
```

</div>

```jsx
<ul>
  <li v-for="user in activeUsers" key={user.id}>
    {user.name}
  </li>
</ul>
```

:::

<div class="style-example style-example-bad">
<h3>Bad</h3>

```jsx
<ul>
  <li v-for="user in users" v-if="user.isActive" key={user.id}>
    {user.name}
  </li>
</ul>
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```jsx
<ul>
  <li v-for="user in activeUsers" key={user.id}>
    {user.name}
  </li>
</ul>
```

</div>

## 使用组件作用域样式 {#use-component-scoped-styling}

对于应用程序，顶层 `App` 组件和布局组件中的样式可能是全局的，但所有其他组件应始终使用作用域样式。

这与[单文件组件](/guide/scaling-up/sfc)相关。它 _不_ 要求使用 `scoped` 属性。作用域可以通过 [CSS modules](https://github.com/css-modules/css-modules)、基于类的策略（如 [BEM](http://getbem.com/)）或其他库/约定来实现。

**但是，组件库应该优先使用基于类的策略而不是 `scoped` 属性。**

这使得覆盖内部样式更容易，使用不会具有太高特异性的人类可读类名，但仍不太可能产生冲突。

::: details 详细解释
如果你正在开发大型项目，与其他开发人员一起工作，或者有时包含第三方 HTML/CSS（例如来自 Auth0），一致的作用域将确保你的样式仅应用于它们适用的组件。

除了 `scoped` 属性，使用唯一类名可以帮助确保第三方 CSS 不应用于你自己的 HTML。例如，许多项目使用 `button`、`btn` 或 `icon` 类名，因此即使不使用 BEM 等策略，添加特定于应用和/或组件的前缀（例如 `ButtonClose-icon`）也可以提供一些保护。
:::

<div class="style-example style-example-bad">
<h3>Bad</h3>

```jsx
<button class="btn btn-close">×</button>

<style>
.btn-close {
  background-color: red;
}
</style>
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```jsx
<button class="button button-close">×</button>

{/* 使用 `scoped` 属性 */}
<style scoped>
.button {
  border: none;
  border-radius: 2px;
}

.button-close {
  background-color: red;
}
</style>
```

```jsx
<button className={styles.button + ' ' + styles.buttonClose}>×</button>

{/* 使用 CSS modules */}
<style module>
.button {
  border: none;
  border-radius: 2px;
}

.buttonClose {
  background-color: red;
}
</style>
```

```jsx
<button class="c-Button c-Button--close">×</button>

{/* 使用 BEM 约定 */}
<style>
.c-Button {
  border: none;
  border-radius: 2px;
}

.c-Button--close {
  background-color: red;
}
</style>
```

</div>
