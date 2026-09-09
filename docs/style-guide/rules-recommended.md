# 优先级 C 规则：推荐 {#priority-c-rules-recommended}

当存在多个同样好的选项时，可以任意选择以确保一致性。在这些规则中，我们描述了每个可接受的选项并建议一个默认选择。这意味着你可以在自己的代码库中自由选择不同的选项，只要你保持一致并有充分的理由。请一定要有充分的理由！通过适应社区标准，你将：

1. 训练你的大脑更轻松地解析你遇到的大多数社区代码
2. 能够复制和粘贴大多数社区代码示例而无需修改
3. 经常发现新员工已经习惯了你喜欢的编码风格，至少在 Rue 方面

## 组件源码顺序 {#component-source-order}

**组件内部的相关代码应保持稳定顺序。**

这是我们推荐的函数组件源码顺序。它们分为类别，因此你将知道在哪里添加新的状态、派生值和事件处理逻辑。

1. **类型与常量**
   - props 类型
   - 组件私有常量

2. **响应式状态**
   - `ref`
   - `signal`
   - `signal`

3. **派生状态**
   - `computed`
   - 由响应式状态派生的普通变量

4. **事件与副作用**
   - 事件处理函数
   - `watch` / `watchEffect`
   - 生命周期钩子

5. **渲染输出**
   - `return <... />`

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

<div class="style-example style-example-bad">
<h3>Bad</h3>

```tsx
type Props = {
  value: string
  focused?: boolean
  label?: string
  icon?: string
}
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

```tsx
type Props = {
  value: string
  focused?: boolean
  label?: string
  icon?: string
}

const formattedValue = computed(() => {
  // ...
})

const inputClasses = computed(() => {
  // ...
})
```

</div>
