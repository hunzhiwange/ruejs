# 优先级 C 规则：推荐 {#priority-c-rules-recommended}

::: warning 注意
此风格指南需要审查。如果你有任何问题或建议，请[提交 issue](https://github.com/ruejs/docs/issues/new)。
:::

当存在多个同样好的选项时，可以任意选择以确保一致性。在这些规则中，我们描述了每个可接受的选项并建议一个默认选择。这意味着你可以在自己的代码库中自由选择不同的选项，只要你保持一致并有充分的理由。请一定要有充分的理由！通过适应社区标准，你将：

1. 训练你的大脑更轻松地解析你遇到的大多数社区代码
2. 能够复制和粘贴大多数社区代码示例而无需修改
3. 经常发现新员工已经习惯了你喜欢的编码风格，至少在 Rue 方面

## 组件/实例选项顺序 {#component-instance-options-order}

**组件/实例选项应始终有序排列。**

这是我们推荐的组件选项默认顺序。它们分为类别，因此你将知道在哪里添加来自插件的新属性。

1. **全局感知**（需要组件之外的知识）
   - `name`

2. **模板编译器选项**（改变模板编译方式）
   - `compilerOptions`

3. **模板依赖**（模板中使用的资源）
   - `components`
   - `directives`

4. **组合**（将属性合并到选项中）
   - `extends`
   - `mixins`
   - `provide`/`inject`

5. **接口**（组件的接口）
   - `inheritAttrs`
   - `props`
   - `emits`

6. **组合式 API**（使用组合式 API 的入口点）
   - `setup`

7. **本地状态**（本地响应式属性）
   - `data`
   - `computed`

8. **事件**（由响应式事件触发的回调）
   - `watch`
   - 生命周期事件（按调用顺序）
     - `beforeCreate`
     - `created`
     - `beforeMount`
     - `mounted`
     - `beforeUpdate`
     - `updated`
     - `activated`
     - `deactivated`
     - `beforeUnmount`
     - `unmounted`
     - `errorCaptured`
     - `renderTracked`
     - `renderTriggered`

9. **非响应式属性**（独立于响应式系统的实例属性）
   - `methods`

10. **渲染**（组件输出的声明式描述）
    - `template`/`render`

## 元素属性顺序 {#element-attribute-order}

**元素（包括组件）的属性应始终有序排列。**

这是我们推荐的组件选项默认顺序。它们分为类别，因此你将知道在哪里添加自定义属性和指令。

1. **定义**（提供组件选项）
   - `is`

2. **列表渲染**（创建同一元素的多个变体）
   - `v-for`

3. **条件**（元素是否渲染/显示）
   - `v-if`
   - `v-else-if`
   - `v-else`
   - `v-show`
   - `v-cloak`

4. **渲染修饰符**（改变元素渲染方式）
   - `v-pre`
   - `v-once`

5. **全局感知**（需要组件之外的知识）
   - `id`

6. **唯一属性**（需要唯一值的属性）
   - `ref`
   - `key`

7. **双向绑定**（结合绑定和事件）
   - `v-model`

8. **其他属性**（所有未指定的绑定和未绑定属性）

9. **事件**（组件事件监听器）
   - `v-on`

10. **内容**（覆盖元素的内容）
    - `v-html`
    - `v-text`

## 组件/实例选项中的空行 {#empty-lines-in-component-instance-options}

**你可能希望在多行属性之间添加一个空行，特别是如果选项在屏幕上无法容纳而不需要滚动时。**

当组件开始感觉拥挤或难以阅读时，在多行属性之间添加空格可以使它们更容易再次浏览。在某些编辑器中，如 Vim，这样的格式化选项还可以使它们更容易用键盘导航。

<div class="options-api">

<div class="style-example style-example-bad">
<h3>Bad</h3>

```js
props: {
  value: {
    type: String,
    required: true
  },

  focused: {
    type: Boolean,
    default: false
  },

  label: String,
  icon: String
},

computed: {
  formattedValue() {
    // ...
  },

  inputClasses() {
    // ...
  }
}
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```js
// 没有空格也可以，只要组件
// 仍然易于阅读和导航。
props: {
  value: {
    type: String,
    required: true
  },
  focused: {
    type: Boolean,
    default: false
  },
  label: String,
  icon: String
},
computed: {
  formattedValue() {
    // ...
  },
  inputClasses() {
    // ...
  }
}
```

</div>

</div>

<div class="composition-api">

<div class="style-example style-example-bad">
<h3>Bad</h3>

```js
defineProps({
  value: {
    type: String,
    required: true,
  },
  focused: {
    type: Boolean,
    default: false,
  },
  label: String,
  icon: String,
})
const formattedValue = computed(() => {
  // ...
})
const inputClasses = computed(() => {
  // ...
})
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```js
defineProps({
  value: {
    type: String,
    required: true,
  },

  focused: {
    type: Boolean,
    default: false,
  },

  label: String,
  icon: String,
})

const formattedValue = computed(() => {
  // ...
})

const inputClasses = computed(() => {
  // ...
})
```

</div>

</div>

## 单文件组件顶层元素顺序 {#single-file-component-top-level-element-order}

**单文件组件应始终一致地排列 `<script>`、`<template>` 和 `<style>` 标签，`<style>` 放在最后，因为其他两个中至少一个是始终必需的。**

<div class="style-example style-example-bad">
<h3>Bad</h3>

```jsx [ComponentX.jsx]
<style>{/* ... */}</style>
<script>{/* ... */}</script>
<template>...</template>
```

```jsx [ComponentA.jsx]
<script>{/* ... */}</script>
<template>...</template>
<style>{/* ... */}</style>
```

```jsx [ComponentB.jsx]
<template>...</template>
<script>{/* ... */}</script>
<style>{/* ... */}</style>
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```jsx [ComponentA.jsx]
<script>{/* ... */}</script>
<template>...</template>
<style>{/* ... */}</style>
```

```jsx [ComponentB.jsx]
<script>{/* ... */}</script>
<template>...</template>
<style>{/* ... */}</style>
```

或

```jsx [ComponentA.jsx]
<template>...</template>
<script>{/* ... */}</script>
<style>{/* ... */}</style>
```

```jsx [ComponentB.jsx]
<template>...</template>
<script>{/* ... */}</script>
<style>{/* ... */}</style>
```

</div>
