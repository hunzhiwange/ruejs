# 计算属性 {#computed-properties}

## 基本示例 {#basic-example}

在 JSX 中表达式非常方便，但它们只适用于简单操作。在模板中放入太多逻辑会使其臃肿且难以维护。例如，如果我们有一个带有嵌套数组的对象：

```js
import { reactive } from 'rue-js'

const author = reactive({
  name: 'John Doe',
  books: ['Rue - 高级指南', 'Rue - 基础指南', 'Rue - 进阶奥秘'],
})
```

我们想根据 `author` 是否已有书籍来显示不同的消息：

```tsx
<p>已出版书籍：</p>
<span>{author.books.length > 0 ? '是' : '否'}</span>
```

此时，模板开始变得有点杂乱。我们必须看一会儿才能意识到它依赖于 `author.books` 进行计算。更重要的是，如果我们需要在模板中多次包含此计算，我们可能不想重复自己。

这就是为什么对于包含响应式数据的复杂逻辑，推荐使用**计算属性**。下面是重构后的示例：

```tsx
import { reactive, computed } from 'rue-js'
import type { FC } from 'rue-js'

const AuthorInfo: FC = () => {
  const author = reactive({
    name: 'John Doe',
    books: ['Rue - 高级指南', 'Rue - 基础指南', 'Rue - 进阶奥秘'],
  })

  // 一个计算 ref
  const publishedBooksMessage = computed(() => {
    return author.books.length > 0 ? '是' : '否'
  })

  return (
    <div>
      <p>已出版书籍：</p>
      <span>{publishedBooksMessage.value}</span>
    </div>
  )
}
```

这里我们声明了一个计算属性 `publishedBooksMessage`。`computed()` 函数期望接收一个 [getter 函数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get#description)，返回的值是一个**计算 ref**。与普通 refs 类似，你可以通过 `publishedBooksMessage.value` 访问计算结果。

计算属性自动追踪其响应式依赖。Rue 知道 `publishedBooksMessage` 的计算依赖于 `author.books`，所以当 `author.books` 更改时，任何依赖于 `publishedBooksMessage` 的绑定都会更新。

另请参见：[为 Computed 添加类型](/guide/typescript/composition-api#typing-computed) <sup class="vt-badge ts" />

## 计算属性缓存 vs 方法 {#computed-caching-vs-methods}

你可能注意到我们可以通过调用方法在表达式中达到相同的结果：

```tsx
import { reactive } from 'rue-js'
import type { FC } from 'rue-js'

const AuthorInfo: FC = () => {
  const author = reactive({
    name: 'John Doe',
    books: ['Rue - 高级指南', 'Rue - 基础指南', 'Rue - 进阶奥秘'],
  })

  function calculateBooksMessage() {
    return author.books.length > 0 ? '是' : '否'
  }

  return (
    <div>
      <p>{calculateBooksMessage()}</p>
    </div>
  )
}
```

不使用计算属性，我们可以将相同的功能定义为方法。对于最终结果，这两种方法确实完全相同。然而，不同之处在于**计算属性是基于其响应式依赖进行缓存的**。计算属性只会在其某些响应式依赖发生更改时重新求值。这意味着只要 `author.books` 没有改变，多次访问 `publishedBooksMessage` 将立即返回之前计算的结果，而不必再次运行 getter 函数。

这也意味着以下计算属性永远不会更新，因为 `Date.now()` 不是响应式依赖：

```js
const now = computed(() => Date.now())
```

相比之下，方法调用将在每次重新渲染时**始终**运行该函数。

为什么我们需要缓存？假设我们有一个昂贵的计算属性 `list`，它需要遍历一个巨大的数组并进行大量计算。然后我们可能还有其他依赖于 `list` 的计算属性。没有缓存，我们将不必要地多次执行 `list` 的 getter！在不需要缓存的情况下，使用方法调用代替。

## 可写的计算属性 {#writable-computed}

计算属性默认是只读的 getter。如果你尝试为计算属性赋新值，会收到运行时警告。在极少数需要"可写"计算属性的情况下，你可以通过提供 getter 和 setter 来创建一个：

```tsx
import { ref, computed } from 'rue-js'
import type { FC } from 'rue-js'

const FullNameEditor: FC = () => {
  const firstName = ref('John')
  const lastName = ref('Doe')

  const fullName = computed({
    // getter
    get() {
      return firstName.value + ' ' + lastName.value
    },
    // setter
    set(newValue) {
      // 注意：这里使用了解构赋值语法
      ;[firstName.value, lastName.value] = newValue.split(' ')
    },
  })

  return (
    <div>
      <p>全名：{fullName.value}</p>
      <button onClick={() => (fullName.value = 'Jane Smith')}>修改全名</button>
    </div>
  )
}
```

现在当你运行 `fullName.value = 'John Doe'` 时，setter 将被调用，`firstName` 和 `lastName` 将相应更新。

## 获取前一个值 {#previous}

如果需要，你可以在 getter 的第一个参数中访问计算属性返回的前一个值：

```tsx
import { ref, computed } from 'rue-js'
import type { FC } from 'rue-js'

const Counter: FC = () => {
  const count = ref(2)

  // 这个计算属性在 count 小于等于 3 时返回 count 的值
  // 当 count >= 4 时，返回满足条件的最后一个值
  // 直到 count 再次小于等于 3
  const alwaysSmall = computed(previous => {
    if (count.value <= 3) {
      return count.value
    }
    return previous
  })

  return (
    <div>
      <p>当前值：{count.value}</p>
      <p>限制值：{alwaysSmall.value}</p>
      <button onClick={() => count.value++}>增加</button>
    </div>
  )
}
```

如果你使用的是可写的计算属性：

```tsx
const alwaysSmall = computed({
  get(previous) {
    if (count.value <= 3) {
      return count.value
    }
    return previous
  },
  set(newValue) {
    count.value = newValue * 2
  },
})
```

## 最佳实践 {#best-practices}

### Getter 应该是无副作用的 {#getters-should-be-side-effect-free}

重要的是要记住，计算属性的 getter 函数应该只执行纯计算，并且没有副作用。例如，**不要在计算属性的 getter 中修改其他状态、进行异步请求或修改 DOM！** 将计算属性视为声明性地描述如何基于其他值派生一个值——它的唯一职责应该是计算并返回该值。在本指南的后面，我们将讨论如何使用 [侦听器](./watchers) 在状态变化时执行副作用。

### 避免修改计算属性值 {#avoid-mutating-computed-value}

从计算属性返回的值是派生状态。将其视为一个临时快照——每次源状态更改时，都会创建一个新快照。修改快照是没有意义的，因此计算属性的返回值应被视为只读，永远不要修改它——相反，更新它所依赖的源状态以触发新的计算。
