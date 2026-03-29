# 列表渲染 {#list-rendering}

## 渲染列表 {#v-for}

我们可以使用 JavaScript 的数组 `map()` 方法来基于数组渲染列表。这是一种更灵活、更符合 JavaScript 习惯的方式：

```tsx
import { ref } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const ItemList: FC = () => {
  const items = ref([{ message: 'Foo' }, { message: 'Bar' }])

  return (
    <ul>
      {items.value.map(item => (
        <li>{item.message}</li>
      ))}
    </ul>
  )
}
```

在 `map()` 回调中，模板表达式可以访问所有父作用域的属性。此外，`map()` 还支持使用第二个参数作为当前项的索引：

```tsx
import { ref } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const ItemList: FC = () => {
  const parentMessage = ref('Parent')
  const items = ref([{ message: 'Foo' }, { message: 'Bar' }])

  return (
    <ul>
      {items.value.map((item, index) => (
        <li>
          {parentMessage.value} - {index} - {item.message}
        </li>
      ))}
    </ul>
  )
}
```

变量作用域与以下 JavaScript 类似：

```js
const parentMessage = 'Parent'
const items = [
  /* ... */
]

items.forEach((item, index) => {
  // 可以访问外部作用域的 `parentMessage`
  // 但 `item` 和 `index` 只能在这里使用
  console.log(parentMessage, item.message, index)
})
```

注意 `map()` 回调的值与 `forEach` 回调的函数签名匹配。事实上，你可以在 `map()` 回调中使用解构，类似于解构函数参数：

```tsx
;<ul>
  {items.value.map(({ message }) => (
    <li>{message}</li>
  ))}
</ul>

{
  /* 带索引的解构 */
}
;<ul>
  {items.value.map(({ message }, index) => (
    <li>
      {message} {index}
    </li>
  ))}
</ul>
```

对于嵌套列表，作用域也类似于嵌套函数。每个 `map()` 回调都有访问父作用域的权限：

```tsx
<ul>
  {items.value.map(item => (
    <li>
      {item.children.map(childItem => (
        <span>
          {item.message} {childItem}
        </span>
      ))}
    </li>
  ))}
</ul>
```

## 遍历对象 {#v-for-with-an-object}

你也可以使用 `Object.entries()` 或 `Object.values()` 来遍历对象的属性。遍历顺序将基于 `Object.values()` 的结果：

```tsx
import { reactive } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const ObjectList: FC = () => {
  const myObject = reactive({
    title: '如何在 Rue 中做列表',
    author: 'Jane Doe',
    publishedAt: '2016-04-10',
  })

  return (
    <ul>
      {Object.entries(myObject).map(([key, value]) => (
        <li>
          {key}: {value}
        </li>
      ))}
    </ul>
  )
}
```

你也可以只获取值：

```tsx
<ul>
  {Object.values(myObject).map(value => (
    <li>{value}</li>
  ))}
</ul>
```

或者同时获取键、值和索引：

```tsx
<ul>
  {Object.entries(myObject).map(([key, value], index) => (
    <li>
      {index}. {key}: {value}
    </li>
  ))}
</ul>
```

## 使用范围 {#v-for-with-a-range}

你也可以使用 `Array.from()` 或简单的循环来基于范围渲染：

```tsx
// 方法 1: 使用 Array.from()
<span>
  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
    <span key={n}>{n}</span>
  ))}
</span>

// 方法 2: 创建范围数组
const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i)

<span>
  {range(1, 10).map(n => (
    <span key={n}>{n}</span>
  ))}
</span>
```

注意这里 `n` 从 1 开始而不是 0。

## 渲染多个元素 {#v-for-on-template}

类似于条件渲染，你可以使用片段或数组返回多个元素：

```tsx
<ul>
  {items.value.map(item => (
    <>
      <li>{item.msg}</li>
      <li className="divider" role="presentation" />
    </>
  ))}
</ul>
```

## 条件列表渲染 {#v-for-with-v-if}

在 JSX 中，条件和列表渲染的顺序完全由你控制。有两种常见的情况：

### 过滤列表项

要过滤列表项（例如只显示活跃的用户），使用计算属性：

```tsx
import { ref, computed } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const FilteredList: FC = () => {
  const users = ref([
    { id: 1, name: 'John', isActive: true },
    { id: 2, name: 'Jane', isActive: false },
    { id: 3, name: 'Bob', isActive: true },
  ])

  // 使用计算属性过滤
  const activeUsers = computed(() => users.value.filter(user => user.isActive))

  return (
    <ul>
      {activeUsers.value.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

### 条件性显示列表

要避免在应该隐藏时渲染列表，将条件移到容器元素：

```tsx
const ConditionalList: FC = () => {
  const shouldShowUsers = ref(true)
  const users = ref([{ id: 1, name: 'John' }])

  return (
    shouldShowUsers.value && (
      <ul>
        {users.value.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    )
  )
}
```

:::warning 注意
不推荐在列表渲染内部使用复杂的条件渲染逻辑，因为这会导致不必要的复杂性和性能问题。
:::

## 使用 `key` 维护状态 {#maintaining-state-with-key}

当 Rue 更新用列表渲染的元素列表时，默认使用"就地更新"策略。如果数据项的顺序发生变化，Rue 不会移动 DOM 元素来匹配项的顺序，而是会就地修补每个元素并确保它反映应该在该特定索引处渲染的内容。

这种默认模式是高效的，但**仅当你的列表渲染输出不依赖于子组件状态或临时 DOM 状态（例如表单输入值）时才适用**。

为了让 Rue 能够追踪每个节点的标识，从而重用和重新排序现有元素，你需要为每个项提供一个唯一的 `key` 属性：

```tsx
<div>
  {items.value.map(item => (
    <div key={item.id}>{/* 内容 */}</div>
  ))}
</div>
```

:::tip 注意
这里的 `key` 是一个特殊的属性，应该被绑定。不要将其与对象属性键混淆。
:::

建议尽可能为列表渲染提供 `key` 属性，除非迭代的 DOM 内容很简单（即不包含组件或有状态的 DOM 元素），或者你有意依赖默认行为以获得性能提升。

`key` 绑定期望原始值——即字符串和数字。不要使用对象作为列表渲染的键。

## 与组件一起使用 {#v-for-with-a-component}

> 本部分假设你了解 [组件](/guide/essentials/component-basics)。如果你还不熟悉，可以跳过并在之后回来查看。

你可以像使用普通元素一样直接在组件上使用列表渲染（不要忘记提供 `key`）：

```tsx
{
  items.value.map(item => <MyComponent key={item.id} />)
}
```

然而，这不会自动将任何数据传递给组件，因为组件有自己的隔离作用域。为了将迭代数据传入组件，我们还应该使用 props：

```tsx
{
  items.value.map((item, index) => <MyComponent key={item.id} item={item} index={index} />)
}
```

不自动将 `item` 注入组件的原因是这使组件与列表渲染的工作方式紧密耦合。明确指出其数据来源使组件在其他情况下可复用。

查看 [这个简单的待办事项列表示例](/examples/#fetching-data) 以了解如何使用列表渲染组件，并向每个实例传递不同的数据。

## 数组变更检测 {#array-change-detection}

### 变更方法 {#mutation-methods}

Rue 能够检测响应式数组的变更方法何时被调用并触发必要的更新。这些变更方法是：

- `push()`
- `pop()`
- `shift()`
- `unshift()`
- `splice()`
- `sort()`
- `reverse()`

### 替换数组 {#replacing-an-array}

变更方法，顾名思义，会改变它们被调用的原始数组。相比之下，还有非变更方法，例如 `filter()`、`concat()` 和 `slice()`，它们不会改变原始数组，而是**始终返回一个新数组**。在使用非变更方法时，我们应该用新数组替换旧数组：

```js
// `items` 是一个数组 ref
items.value = items.value.filter(item => item.message.match(/Foo/))
```

你可能认为这会导致 Rue 丢弃现有 DOM 并重新渲染整个列表——幸运的是，事实并非如此。Rue 实现了一些智能启发式方法来最大化 DOM 元素重用，因此用另一个包含重叠对象的数组替换数组是非常高效的操作。

## 显示过滤/排序结果 {#displaying-filtered-sorted-results}

有时我们想显示数组的过滤或排序版本，而不实际变更或重置原始数据。在这种情况下，你可以创建一个返回过滤或排序数组的计算属性。

例如：

```tsx
import { ref, computed } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const FilteredNumbers: FC = () => {
  const numbers = ref([1, 2, 3, 4, 5])

  const evenNumbers = computed(() => {
    return numbers.value.filter(n => n % 2 === 0)
  })

  return (
    <ul>
      {evenNumbers.value.map(n => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  )
}
```

在计算属性不可行的情况下（例如在嵌套列表渲染中），你可以使用方法：

```tsx
import { ref } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const SetsList: FC = () => {
  const sets = ref([
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
  ])

  function even(numbers: number[]) {
    return numbers.filter(number => number % 2 === 0)
  }

  return (
    <ul>
      {sets.value.map((numbers, setIndex) => (
        <ul key={setIndex}>
          {even(numbers).map(n => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ))}
    </ul>
  )
}
```

在计算属性中小心使用 `reverse()` 和 `sort()`！这两个方法会改变原始数组，这在计算属性的 getter 中应该避免。在调用这些方法之前创建原始数组的副本：

```diff
- return numbers.reverse()
+ return [...numbers].reverse()
```
