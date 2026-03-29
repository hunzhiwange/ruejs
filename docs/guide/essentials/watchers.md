# 侦听器 {#watchers}

## 基本示例 {#basic-example}

计算属性允许我们声明性地计算派生值。然而，有些情况下我们需要在状态变化时执行"副作用"——例如，改变 DOM，或基于异步操作的结果改变另一段状态。

使用组合式 API，我们可以使用 [`watch` 函数](/api/reactivity-core#watch) 在响应式状态发生变化时触发回调：

```tsx
import { ref, watch } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const QuestionWatcher: FC = () => {
  const question = ref('')
  const answer = ref('问题通常包含问号。;-)')
  const loading = ref(false)

  // 直接在 ref 上使用 watch
  watch(question, async (newQuestion, oldQuestion) => {
    if (newQuestion.includes('?')) {
      loading.value = true
      answer.value = '思考中...'
      try {
        const res = await fetch('https://yesno.wtf/api')
        answer.value = (await res.json()).answer
      } catch (error) {
        answer.value = '错误！无法访问 API。' + error
      } finally {
        loading.value = false
      }
    }
  })

  return (
    <div>
      <p>
        问一个是/否问题：
        <input
          value={question.value}
          onInput={e => (question.value = (e.target as HTMLInputElement).value)}
          disabled={loading.value}
        />
      </p>
      <p>{answer.value}</p>
    </div>
  )
}
```

### 侦听源类型 {#watch-source-types}

`watch` 的第一个参数可以是不同类型的响应式"源"：它可以是 ref（包括计算 ref）、响应式对象、[getter 函数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get#description)，或多个源的数组：

```js
const x = ref(0)
const y = ref(0)

// 单个 ref
watch(x, newX => {
  console.log(`x 是 ${newX}`)
})

// getter
watch(
  () => x.value + y.value,
  sum => {
    console.log(`x + y 的和是：${sum}`)
  },
)

// 多个源的数组
watch([x, () => y.value], ([newX, newY]) => {
  console.log(`x 是 ${newX}，y 是 ${newY}`)
})
```

请注意，你不能像这样观察响应式对象的属性：

```js
const obj = reactive({ count: 0 })

// 这不会生效，因为我们传递了一个数字给 watch()
watch(obj.count, count => {
  console.log(`计数是：${count}`)
})
```

相反，使用 getter：

```js
// 相反，使用 getter：
watch(
  () => obj.count,
  count => {
    console.log(`计数是：${count}`)
  },
)
```

## 深层侦听器 {#deep-watchers}

当你在响应式对象上直接调用 `watch()` 时，它会隐式创建一个深层侦听器——回调将在所有嵌套变更时触发：

```js
const obj = reactive({ count: 0 })

watch(obj, (newValue, oldValue) => {
  // 在嵌套属性变更时触发
  // 注意：`newValue` 在这里将等于 `oldValue`
  // 因为它们都指向同一个对象！
})

obj.count++
```

这应该与返回响应式对象的 getter 区分开来——在后一种情况下，只有当 getter 返回不同的对象时，回调才会触发：

```js
watch(
  () => state.someObject,
  () => {
    // 只在 state.someObject 被替换时触发
  },
)
```

但是，你可以通过显式使用 `deep` 选项强制第二种情况成为深层侦听器：

```js
watch(
  () => state.someObject,
  (newValue, oldValue) => {
    // 注意：除非 state.someObject 已被替换
    // 否则 `newValue` 将等于 `oldValue`
  },
  { deep: true },
)
```

:::warning 谨慎使用
深层侦听需要遍历被侦听对象的所有嵌套属性，在大数据结构上使用可能代价高昂。只在必要时使用，并注意性能影响。
:::

## 即时回调的侦听器 {#eager-watchers}

`watch` 默认是惰性的：在被侦听的源发生变化之前，不会调用回调。但在某些情况下，我们可能希望立即运行相同的回调逻辑——例如，我们可能想获取一些初始数据，然后在相关状态发生变化时重新获取数据。

我们可以通过传递 `immediate: true` 选项来强制侦听器的回调立即执行：

```js
watch(
  source,
  (newValue, oldValue) => {
    // 立即执行，然后在 `source` 变化时再次执行
  },
  { immediate: true },
)
```

## 一次性侦听器 {#once-watchers}

侦听器的回调会在被侦听的源发生变化时执行。如果你希望回调只在源变化时触发一次，请使用 `once: true` 选项。

```js
watch(
  source,
  (newValue, oldValue) => {
    // 当 `source` 变化时，只触发一次
  },
  { once: true },
)
```

## `watchEffect()` {#watcheffect}

侦听器回调使用与被侦听的源完全相同的响应式状态是很常见的。例如，考虑以下代码，它使用侦听器在 `todoId` ref 变化时加载远程资源：

```js
const todoId = ref(1)
const data = ref(null)

watch(
  todoId,
  async () => {
    const response = await fetch(`https://jsonplaceholder.typicode.com/todos/${todoId.value}`)
    data.value = await response.json()
  },
  { immediate: true },
)
```

特别是，注意侦听器使用了两次 `todoId`，一次作为源，然后在回调内部再次使用。

这可以用 [`watchEffect()`](/api/reactivity-core#watcheffect) 来简化。`watchEffect()` 允许我们自动追踪回调的响应式依赖。上面的侦听器可以重写为：

```js
watchEffect(async () => {
  const response = await fetch(`https://jsonplaceholder.typicode.com/todos/${todoId.value}`)
  data.value = await response.json()
})
```

在这里，回调会立即运行，不需要指定 `immediate: true`。在执行过程中，它会自动追踪 `todoId.value` 作为依赖（类似于计算属性）。每当 `todoId.value` 变化时，回调就会再次运行。使用 `watchEffect()`，我们不再需要将 `todoId` 显式作为源值传递。

你可以查看 [`watchEffect()` 和响应式数据获取的实际示例](/examples/#fetching-data)。

对于像这样的只有一个依赖的示例，`watchEffect()` 的好处相对较小。但对于有多个依赖的侦听器，使用 `watchEffect()` 消除了手动维护依赖列表的负担。此外，如果你需要侦听嵌套数据结构中的几个属性，`watchEffect()` 可能比深层侦听器更有效，因为它只会追踪回调中使用的属性，而不是递归追踪所有属性。

:::tip
`watchEffect` 只在其**同步**执行期间追踪依赖。当与异步回调一起使用时，只有第一个 `await` tick 之前访问的属性会被追踪。
:::

### `watch` vs `watchEffect` {#watch-vs-watcheffect}

`watch` 和 `watchEffect` 都允许我们响应式地执行副作用。它们的主要区别在于追踪响应式依赖的方式：

- `watch` 只追踪显式侦听的源。它不会追踪回调内部访问的任何内容。此外，回调只在源实际发生变化时触发。`watch` 将依赖追踪与副作用分离，使我们对回调何时触发有更精确的控制。

- 另一方面，`watchEffect` 将依赖追踪和副作用合并到一个阶段。它会自动追踪其同步执行期间访问的每个响应式属性。这更方便，通常会导致更简洁的代码，但使其响应式依赖不那么明确。

## 副作用清理 {#side-effect-cleanup}

有时我们可能会在侦听器中执行副作用，例如异步请求：

```js
watch(id, newId => {
  fetch(`/api/${newId}`).then(() => {
    // 回调逻辑
  })
})
```

但是如果 `id` 在请求完成之前发生变化呢？当前一个请求完成时，它仍然会用已经过时的 ID 值触发回调。理想情况下，我们希望在 `id` 变化为新值时能够取消过时的请求。

我们可以使用 [`onWatcherCleanup()`](/api/reactivity-core#onwatchercleanup) API 注册一个清理函数，该函数将在侦听器失效并即将重新运行时调用：

```js
import { watch, onWatcherCleanup } from '@rue-js/rue'

watch(id, newId => {
  const controller = new AbortController()

  fetch(`/api/${newId}`, { signal: controller.signal }).then(() => {
    // 回调逻辑
  })

  onWatcherCleanup(() => {
    // 中止过时的请求
    controller.abort()
  })
})
```

请注意，`onWatcherCleanup` 只在 Rue 3.5+ 中受支持，并且必须在 `watchEffect` 效果函数或 `watch` 回调函数的同步执行期间调用：你不能在异步函数的 `await` 语句之后调用它。

或者，一个 `onCleanup` 函数也会作为第三个参数传递给侦听器回调，作为 `watchEffect` 效果函数的第一个参数：

```js
watch(id, (newId, oldId, onCleanup) => {
  // ...
  onCleanup(() => {
    // 清理逻辑
  })
})

watchEffect(onCleanup => {
  // ...
  onCleanup(() => {
    // 清理逻辑
  })
})
```

这适用于 3.5 之前的版本。此外，通过函数参数传递的 `onCleanup` 绑定到侦听器实例，因此不受 `onWatcherCleanup` 的同步限制。

## 回调刷新时机 {#callback-flush-timing}

当你修改响应式状态时，它可能会触发 Rue 组件更新和你创建的侦听器回调。

类似于组件更新，用户创建的侦听器回调会被批处理以避免重复调用。例如，如果我们同步地向被侦听的数组推送一千个项目，我们可能不希望侦听器触发一千次。

默认情况下，侦听器的回调在父组件更新之后（如果有的话），在拥有组件的 DOM 更新之前被调用。这意味着如果你在侦听器回调中尝试访问拥有组件的 DOM，DOM 将处于更新前状态。

### Post 侦听器 {#post-watchers}

如果你想在 Rue 更新 DOM **之后**在侦听器回调中访问拥有组件的 DOM，你需要指定 `flush: 'post'` 选项：

```js
watch(source, callback, {
  flush: 'post',
})

watchEffect(callback, {
  flush: 'post',
})
```

Post-flush `watchEffect()` 还有一个便捷的别名 `watchPostEffect()`：

```js
import { watchPostEffect } from '@rue-js/rue'

watchPostEffect(() => {
  /* 在 Rue 更新后执行 */
})
```

### 同步侦听器 {#sync-watchers}

也可以创建一个在任何 Rue 管理的更新之前同步触发的侦听器：

```js
watch(source, callback, {
  flush: 'sync',
})

watchEffect(callback, {
  flush: 'sync',
})
```

Sync `watchEffect()` 还有一个便捷的别名 `watchSyncEffect()`：

```js
import { watchSyncEffect } from '@rue-js/rue'

watchSyncEffect(() => {
  /* 在响应式数据变化时同步执行 */
})
```

:::warning 谨慎使用
同步侦听器没有批处理，每次检测到响应式变更时都会触发。用它们观察简单的布尔值是可以的，但避免在可能同步变更多次的数据源上使用它们，例如数组。
:::

## 停止侦听器 {#stopping-a-watcher}

在 `setup()` 或组件中同步声明的侦听器绑定到拥有组件实例，并在拥有组件卸载时自动停止。在大多数情况下，你不需要担心停止侦听器。

关键是侦听器必须**同步**创建：如果侦听器是在异步回调中创建的，它不会绑定到拥有组件，必须手动停止以避免内存泄漏。以下是一个示例：

```tsx
import { watchEffect } from '@rue-js/rue'

const MyComponent: FC = () => {
  // 这个会自动停止
  watchEffect(() => {})

  // ...这个不会！
  setTimeout(() => {
    watchEffect(() => {})
  }, 100)

  return <div />
}
```

要手动停止侦听器，使用返回的句柄函数。这适用于 `watch` 和 `watchEffect`：

```js
const unwatch = watchEffect(() => {})

// ...之后，当不再需要时
unwatch()
```

请注意，你应该很少需要异步创建侦听器，应尽可能优先选择同步创建。如果你需要等待一些异步数据，你可以让侦听逻辑成为条件性的：

```js
// 异步加载的数据
const data = ref(null)

watchEffect(() => {
  if (data.value) {
    // 数据加载后做一些事情
  }
})
```
