# 优先级 B 规则：强烈推荐 {#priority-b-rules-strongly-recommended}

::: warning 注意
此风格指南需要审查。如果你有任何问题或建议，请[提交 issue](https://github.com/ruejs/docs/issues/new)。
:::

这些规则已被发现在大多数项目中提高可读性和/或开发者体验。如果你违反它们，你的代码仍然可以运行，但违规应该很少且有充分的理由。

## 组件文件 {#component-files}

**只要有构建系统可以连接文件，每个组件都应该在自己的文件中。**

这可以帮助你在需要编辑或查看如何使用它时更快地找到组件。

<div class="style-example style-example-bad">
<h3>Bad</h3>

```js
app.component('TodoList', {
  // ...
})

app.component('TodoItem', {
  // ...
})
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```
components/
|- TodoList.js
|- TodoItem.js
```

```
components/
|- TodoList.jsx
|- TodoItem.jsx
```

</div>

## 组件文件名大小写 {#component-filename-casing}

**单文件组件的文件名应始终使用 PascalCase 或始终使用 kebab-case。**

PascalCase 在代码编辑器中配合自动补全效果最好，因为它与我们在 JS(X) 和模板中引用组件的方式一致。然而，在不区分大小写的文件系统上，混合大小写的文件名有时会产生问题，这就是为什么 kebab-case 也是完全可以接受的。

<div class="style-example style-example-bad">
<h3>Bad</h3>

```
components/
|- mycomponent.jsx
```

```
components/
|- myComponent.jsx
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```
components/
|- MyComponent.jsx
```

```
components/
|- my-component.jsx
```

</div>

## 基础组件名称 {#base-component-names}

**应用特定样式和约定的基础组件（又称展示性组件、哑组件或纯组件）都应该以特定前缀开头，例如 `Base`、`App` 或 `V`。**

::: details 详细解释
这些组件为应用中的一致样式和行为奠定基础。它们**只能**包含：

- HTML 元素，
- 其他基础组件，和
- 第三方 UI 组件。

但它们**永远不会**包含全局状态（例如来自状态管理库）。

它们的名称通常包含它们包装的元素的名称（例如 `BaseButton`、`BaseTable`），除非没有元素存在于它们的特定目的（例如 `BaseIcon`）。如果你为更具体的上下文构建类似的组件，它们几乎总是会消费这些组件（例如 `BaseButton` 可能用于 `ButtonSubmit`）。

这种约定的一些优点：

- 在编辑器中按字母顺序组织时，应用的基础组件都列在一起，使它们更容易识别。

- 由于组件名称应始终是多词的，这种约定防止你不得不为简单组件包装器选择任意前缀（例如 `MyButton`、`VueButton`）。

- 由于这些组件使用如此频繁，你可能希望简单地将它们设为全局而不是到处导入。前缀使这可以通过 Webpack 实现：

  ```js
  const requireComponent = require.context('./src', true, /Base[A-Z]\w+\.(jsx|js)$/)
  requireComponent.keys().forEach(function (fileName) {
    let baseComponentConfig = requireComponent(fileName)
    baseComponentConfig = baseComponentConfig.default || baseComponentConfig
    const baseComponentName =
      baseComponentConfig.name || fileName.replace(/^.+\//, '').replace(/\.\w+$/, '')
    app.component(baseComponentName, baseComponentConfig)
  })
  ```

  :::

<div class="style-example style-example-bad">
<h3>Bad</h3>

```
components/
|- MyButton.jsx
|- VueTable.jsx
|- Icon.jsx
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```
components/
|- BaseButton.jsx
|- BaseTable.jsx
|- BaseIcon.jsx
```

```
components/
|- AppButton.jsx
|- AppTable.jsx
|- AppIcon.jsx
```

```
components/
|- VButton.jsx
|- VTable.jsx
|- VIcon.jsx
```

</div>

## 紧密耦合的组件名称 {#tightly-coupled-component-names}

**与其父组件紧密耦合的子组件应在其名称中包含父组件名称作为前缀。**

如果一个组件只在单个父组件的上下文中才有意义，这种关系应该在其名称中显而易见。由于编辑器通常按字母顺序组织文件，这也使这些相关文件彼此相邻。

::: details 详细解释
你可能想通过将子组件嵌套在以父组件命名的目录中来解决这个问题。例如：

```
components/
|- TodoList/
   |- Item/
      |- index.jsx
      |- Button.jsx
   |- index.jsx
```

或：

```
components/
|- TodoList/
   |- Item/
      |- Button.jsx
   |- Item.jsx
|- TodoList.jsx
```

不推荐这样做，因为它会导致：

- 许多名称相似的文件，使得在代码编辑器中快速切换文件更加困难。
- 许多嵌套子目录，这增加了在编辑器侧边栏中浏览组件所需的时间。
  :::

<div class="style-example style-example-bad">
<h3>Bad</h3>

```
components/
|- TodoList.jsx
|- TodoItem.jsx
|- TodoButton.jsx
```

```
components/
|- SearchSidebar.jsx
|- NavigationForSearchSidebar.jsx
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```
components/
|- TodoList.jsx
|- TodoListItem.jsx
|- TodoListItemButton.jsx
```

```
components/
|- SearchSidebar.jsx
|- SearchSidebarNavigation.jsx
```

</div>

## 组件名称中词语的顺序 {#order-of-words-in-component-names}

**组件名称应以最高级别（通常是最通用的）词语开头，以描述性修饰词结尾。**

::: details 详细解释
你可能想知道：

> "为什么我们要强制组件名称使用不太自然的语言？"

在自然英语中，形容词和其他描述符通常出现在名词之前，而例外需要连接词。例如：

- Coffee _with_ milk
- Soup _of the_ day
- Visitor _to the_ museum

如果你愿意，你肯定可以在组件名称中包含这些连接词，但顺序仍然很重要。

还要注意，**什么是"最高级别"将取决于你的应用**。例如，想象一个带有搜索表单的应用。它可能包含这样的组件：

```
components/
|- ClearSearchButton.jsx
|- ExcludeFromSearchInput.jsx
|- LaunchOnStartupCheckbox.jsx
|- RunSearchButton.jsx
|- SearchInput.jsx
|- TermsCheckbox.jsx
```

正如你可能注意到的，很难看出哪些组件特定于搜索。现在让我们根据规则重命名组件：

```
components/
|- SearchButtonClear.jsx
|- SearchButtonRun.jsx
|- SearchInputExcludeGlob.jsx
|- SearchInputQuery.jsx
|- SettingsCheckboxLaunchOnStartup.jsx
|- SettingsCheckboxTerms.jsx
```

由于编辑器通常按字母顺序组织文件，组件之间的所有重要关系现在一目了然。

你可能想通过不同的方式解决这个问题，将所有搜索组件嵌套在"search"目录下，然后将所有设置组件嵌套在"settings"目录下。我们仅在非常大的应用（例如 100+ 组件）中推荐考虑这种方法，原因如下：

- 通常浏览嵌套子目录比在单个 `components` 目录中滚动需要更多时间。
- 名称冲突（例如多个 `ButtonDelete.jsx` 组件）使得在代码编辑器中快速导航到特定组件更加困难。
- 重构变得更加困难，因为查找和替换通常不足以更新对移动组件的相对引用。
  :::

<div class="style-example style-example-bad">
<h3>Bad</h3>

```
components/
|- ClearSearchButton.jsx
|- ExcludeFromSearchInput.jsx
|- LaunchOnStartupCheckbox.jsx
|- RunSearchButton.jsx
|- SearchInput.jsx
|- TermsCheckbox.jsx
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```
components/
|- SearchButtonClear.jsx
|- SearchButtonRun.jsx
|- SearchInputQuery.jsx
|- SearchInputExcludeGlob.jsx
|- SettingsCheckboxTerms.jsx
|- SettingsCheckboxLaunchOnStartup.jsx
```

</div>

## 自闭合组件 {#self-closing-components}

**没有内容的组件在 JSX 中应该是自闭合的。**

自闭合的组件表明它们不仅没有内容，而且**应该**没有内容。这就像书上的空白页和标有"此页故意留白"的页面之间的区别。没有不必要的结束标签，你的代码也更干净。

<div class="style-example style-example-bad">
<h3>Bad</h3>

```jsx
{
  /* 在 JSX 中 */
}
;<MyComponent></MyComponent>
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```jsx
{
  /* 在 JSX 中 */
}
;<MyComponent />
```

</div>

## 模板中的组件名称大小写 {#component-name-casing-in-templates}

**在大多数项目中，组件名称在 JSX 中应始终使用 PascalCase。**

PascalCase 相比 kebab-case 有一些优点：

- 编辑器可以在模板中自动补全组件名称，因为 PascalCase 也用于 JavaScript。
- `<MyComponent>` 比 `<my-component>` 在视觉上与单字 HTML 元素的区别更明显，因为有两个字符差异（两个大写字母），而不是只有一个（连字符）。

如果你已经在 kebab-case 上投入了大量精力，与 HTML 约定保持一致并能够在所有项目中使用相同的大小写可能比上面列出的优点更重要。在这些情况下，**到处使用 kebab-case 也是可以接受的。**

<div class="style-example style-example-bad">
<h3>Bad</h3>

```jsx
{
  /* 在 JSX 中 */
}
;<mycomponent />
```

```jsx
{
  /* 在 JSX 中 */
}
;<myComponent />
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```jsx
{
  /* 在 JSX 中 */
}
;<MyComponent />
```

OR

```jsx
{
  /* 到处使用 */
}
;<my-component />
```

</div>

## JS/JSX 中的组件名称大小写 {#component-name-casing-in-js-jsx}

**JS/JSX 中的组件名称应始终使用 PascalCase。**

::: details 详细解释
在 JavaScript 中，PascalCase 是类和原型构造函数的约定——本质上，任何可以有不同实例的东西。Vue 组件也有实例，因此使用 PascalCase 也是有意义的。作为额外的好处，在 JSX（和模板）中使用 PascalCase 允许代码读者更容易区分组件和 HTML 元素。
:::

<div class="style-example style-example-bad">
<h3>Bad</h3>

```js
app.component('myComponent', {
  // ...
})
```

```js
import myComponent from './MyComponent.jsx'
```

```js
export default {
  name: 'myComponent',
  // ...
}
```

```js
export default {
  name: 'my-component',
  // ...
}
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```js
app.component('MyComponent', {
  // ...
})
```

```js
app.component('my-component', {
  // ...
})
```

```js
import MyComponent from './MyComponent.jsx'
```

```js
export default {
  name: 'MyComponent',
  // ...
}
```

</div>

## 完整单词的组件名称 {#full-word-component-names}

**组件名称应优先使用完整单词而不是缩写。**

编辑器中的自动补全使编写较长名称的成本非常低，而它们提供的清晰度是无价的。特别是不常见的缩写应该始终避免。

<div class="style-example style-example-bad">
<h3>Bad</h3>

```
components/
|- SdSettings.jsx
|- UProfOpts.jsx
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```
components/
|- StudentDashboardSettings.jsx
|- UserProfileOptions.jsx
```

</div>

## Prop 名称大小写 {#prop-name-casing}

**声明时 Prop 名称应始终使用 camelCase。**

<div class="options-api">

<div class="style-example style-example-bad">
<h3>Bad</h3>

```js
props: {
  'greeting-text': String
}
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```js
props: {
  greetingText: String
}
```

</div>

</div>

<div class="composition-api">

<div class="style-example style-example-bad">
<h3>Bad</h3>

```js
const props = defineProps({
  'greeting-text': String,
})
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```js
const props = defineProps({
  greetingText: String,
})
```

</div>

</div>

## 多属性元素 {#multi-attribute-elements}

**具有多个属性的元素应跨多行，每行一个属性。**

在 JavaScript 中，将具有多个属性的对象跨多行拆分被广泛认为是一个良好的约定，因为它更容易阅读。我们的模板和 JSX 也应得到同样的考虑。

<div class="style-example style-example-bad">
<h3>Bad</h3>

```jsx
<img src="https://vuejs.org/images/logo.png" alt="Vue Logo" />
```

```jsx
<MyComponent foo="a" bar="b" baz="c" />
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```jsx
<img src="https://vuejs.org/images/logo.png" alt="Vue Logo" />
```

```jsx
<MyComponent foo="a" bar="b" baz="c" />
```

</div>

## 模板中的简单表达式 {#simple-expressions-in-templates}

**组件模板应只包含简单表达式，更复杂的表达式应重构为计算属性或方法。**

模板中的复杂表达式使它们的声明性降低。我们应该努力描述 _应该_ 出现什么，而不是 _如何_ 计算该值。计算属性和方法还允许代码被重用。

<div class="style-example style-example-bad">
<h3>Bad</h3>

```jsx
{
  fullName
    .split(' ')
    .map(word => {
      return word[0].toUpperCase() + word.slice(1)
    })
    .join(' ')
}
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```jsx
{
  /* 在模板中 */
}
{
  normalizedFullName
}
```

<div class="options-api">

```js
// 复杂表达式已移至计算属性
computed: {
  normalizedFullName() {
    return this.fullName.split(' ')
      .map(word => word[0].toUpperCase() + word.slice(1))
      .join(' ')
  }
}
```

</div>

<div class="composition-api">

```js
// 复杂表达式已移至计算属性
const normalizedFullName = computed(() =>
  fullName.value
    .split(' ')
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(' '),
)
```

</div>

</div>

## 简单的计算属性 {#simple-computed-properties}

**复杂的计算属性应拆分为尽可能多的简单属性。**

::: details 详细解释
更简单、命名良好的计算属性是：

- **更易于测试**

  当每个计算属性只包含一个非常简单的表达式，依赖非常少时，编写测试确认其正确工作要容易得多。

- **更易于阅读**

  简化计算属性迫使你为每个值提供一个描述性名称，即使它没有重用。这使得其他开发人员（和未来的你）更容易专注于他们关心的代码并弄清楚发生了什么。

- **更能适应变化的需求**

  任何可以命名的值可能对视图有用。例如，我们可能决定显示一条消息告诉用户他们节省了多少钱。我们还可能决定计算销售税，但也许单独显示它，而不是作为最终价格的一部分。

  小而集中的计算属性对信息如何使用做出的假设更少，因此随着需求变化需要更少的重构。
  :::

<div class="style-example style-example-bad">
<h3>Bad</h3>

<div class="options-api">

```js
computed: {
  price() {
    const basePrice = this.manufactureCost / (1 - this.profitMargin)
    return (
      basePrice -
      basePrice * (this.discountPercent || 0)
    )
  }
}
```

</div>

<div class="composition-api">

```js
const price = computed(() => {
  const basePrice = manufactureCost.value / (1 - profitMargin.value)
  return basePrice - basePrice * (discountPercent.value || 0)
})
```

</div>

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

<div class="options-api">

```js
computed: {
  basePrice() {
    return this.manufactureCost / (1 - this.profitMargin)
  },

  discount() {
    return this.basePrice * (this.discountPercent || 0)
  },

  finalPrice() {
    return this.basePrice - this.discount
  }
}
```

</div>

<div class="composition-api">

```js
const basePrice = computed(() => manufactureCost.value / (1 - profitMargin.value))

const discount = computed(() => basePrice.value * (discountPercent.value || 0))

const finalPrice = computed(() => basePrice.value - discount.value)
```

</div>

</div>

## 带引号的属性值 {#quoted-attribute-values}

**非空的 HTML 属性值应始终在引号内（单引号或双引号，以 JS 中未使用的为准）。**

虽然 HTML 中没有空格的属性值不需要引号，但这种做法往往导致 _避免_ 空格，使属性值可读性降低。

<div class="style-example style-example-bad">
<h3>Bad</h3>

```jsx
<input type=text />
```

```jsx
<AppSidebar style={{ width: sidebarWidth + 'px' }} />
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```jsx
<input type="text" />
```

```jsx
<AppSidebar style={{ width: sidebarWidth + 'px' }} />
```

</div>

## 指令简写 {#directive-shorthands}

**指令简写（`:` 代表 `v-bind:`，`@` 代表 `v-on:`，`#` 代表 `v-slot:`）应该始终使用或从不使用。**

<div class="style-example style-example-bad">
<h3>Bad</h3>

```jsx
<input v-bind:value="newTodoText" placeholder="newTodoInstructions" />
```

```jsx
<input v-on:input="onInput" onFocus="onFocus" />
```

```jsx
<template v-slot:header>
  <h1>Here might be a page title</h1>
</template>

<template slot="footer">
  <p>Here's some contact info</p>
</template>
```

</div>

<div class="style-example style-example-good">
<h3>Good</h3>

```jsx
<input value="newTodoText" placeholder="newTodoInstructions" />
```

```jsx
<input v-bind:value="newTodoText" v-bind:placeholder="newTodoInstructions" />
```

```jsx
<input onInput="onInput" onFocus="onFocus" />
```

```jsx
<input v-on:input="onInput" v-on:focus="onFocus" />
```

</div>
