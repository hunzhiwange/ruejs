# 简介 {#introduction}

:::info 你正在阅读 Rue 的文档！

- Rue 是一个现代化的编译型 JavaScript 响应式框架，通过编译优化 JSX/TSX 组件的更新过程。
  :::

## Rue 是什么？ {#what-is-rue}

Rue（发音 /ruː/）是一个用于构建用户界面的 JavaScript 框架。它建立在标准 HTML、CSS 和 JavaScript 之上，提供声明式、基于组件的编程模型，帮助你高效地开发任何复杂度的用户界面。

Rue 采用 JSX/TSX 作为主要的组件编写方式，同时提供直观的响应式系统。

下面是一个最小示例：

```tsx
import { type FC, ref } from '@rue-js/rue'

const App: FC = () => {
  const count = ref(0)

  return <button onClick={() => count.value++}>计数：{count}</button>
}

export default App
```

**效果**：按钮会显示当前计数，点击后递增。

这里的 `{count}` 位于 JSX child 的最终展示位置，Rue 会自动解包 Ref。写入、计算或条件判断仍使用 `count.value`；DOM 属性仍写作 `<input value={count.value}>`，而 Signal 仍写作 `{count.get()}`。

上面的示例展示了 Rue 的两个核心特性：

- **声明式渲染**：Rue 使用 JSX 扩展了 JavaScript，允许我们基于 JavaScript 状态声明式地描述 UI 输出。

- **响应式**：Rue 会自动追踪 JavaScript 状态的变化，并在状态变化时高效地更新 DOM。

## 编译型框架

Rue 是一个覆盖了前端开发中大部分常见功能需求的框架和生态系统。但 Web 极其多样化——我们在 Web 上构建的东西在形式和规模上可能千差万别。考虑到这一点，Rue 被设计成灵活且可逐步采用的。根据你的使用场景，Rue 可以以不同的方式使用：

- 无需构建步骤增强静态 HTML
- 在任何页面上嵌入为 Web 组件
- 单页应用（SPA）

## JSX 组件

在 Rue 项目中，我们使用 JSX/TSX 语法编写组件。JSX 是一种 JavaScript 语法扩展，允许你在 JavaScript 中编写类似 HTML 的代码。Rue 的组件是使用函数定义的，我们称之为**函数组件**（FC，Functional Component）。

```tsx
import { type FC, ref } from '@rue-js/rue'

const App: FC = () => {
  const count = ref(0)

  const increment = () => {
    count.value++
  }

  return <button onClick={increment}>计数：{count}</button>
}

export default App
```

Rue 的组件系统不需要特殊的文件格式。你可以在任何 `.tsx` 或 `.jsx` 文件中编写组件。

## API 风格

Rue 支持多种编写组件的方式，让你可以根据自己的偏好选择：

### 使用 ref 和 useState {#using-ref-and-useState}

Rue 提供了直观的响应式 API，包括 `ref`、`useState`，也可以使用 getter / setter 风格的 `signal`：

```tsx
import { type FC, ref, useState, computed } from '@rue-js/rue'

const App: FC = () => {
  // 使用 ref 创建响应式基本类型
  const count = ref(0)

  // 使用编译 useState 创建对象状态
  const [state] = useState({
    message: 'Hello Rue!',
    items: ['苹果', '香蕉', '橘子'],
  })

  // 使用 computed 创建计算属性
  const doubleCount = computed(() => count.value * 2)

  return (
    <div>
      <p>{state.message}</p>
      <p>计数：{count}</p>
      <p>双倍计数：{doubleCount}</p>
      <ul>
        {state.items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
```

`ref()`、`computed()` 和 `customRef()` 创建的 Rue Ref 都会在 JSX child 的最终展示位置自动解包。这个规则不会改变普通 JavaScript：上面的 `computed(() => count.value * 2)` 仍需显式读取 `.value`；组件 Props 也保持原对象，例如 `<Child value={count}>` 会把 Ref 本身传给子组件。

如果你更喜欢 getter / setter 风格，也可以直接使用 `signal`：

```tsx
import { type FC, signal, computed } from '@rue-js/rue'

const App: FC = () => {
  const count = signal(0)
  const doubleCount = computed(() => count.get() * 2)

  return (
    <div>
      <p>计数：{count.get()}</p>
      <p>双倍计数：{doubleCount.get()}</p>
      <button onClick={() => count.set(count.get() + 1)}>加一</button>
    </div>
  )
}
```

### 使用 useState {#using-usestate}

如果你更喜欢 React 风格的 API，Rue 也提供了 `useState`。它返回当前的普通值和一个支持直接值或函数式更新的 setter：

```ts
useState<T>(initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>]
```

```tsx
import { type FC, useState } from '@rue-js/rue'

const App: FC = () => {
  const [count, setCount] = useState(0)

  return <button onClick={() => setCount(previous => previous + 1)}>计数：{count}</button>
}
```

在编译后的组件中，Rue 会用隐藏的 Signal 保存状态并驱动细粒度更新，但 `useState` 的用户 API 始终是普通值。如果需要显式的 Signal 句柄及 `get()`、`set()` 等细粒度操作，请使用 `signal`；偏好 `.value` 属性访问时则使用 `ref`。

### 使用 signal {#using-signal}

`signal` 是 Rue 提供的底层响应式状态句柄。与 `ref` 主要通过 `.value` 读写不同，`signal` 提供了一组更细粒度的 API，包括：

- `get()` / `set()`
- `peek()` / `update()`
- `getPath()` / `setPath()` / `updatePath()` / `peekPath()`
- `value` / `toJSON()` / `valueOf()` / `toString()`

它特别适合以下场景：

- 你更喜欢 getter / setter 风格
- 你需要对嵌套对象按路径读写
- 你希望区分“读取并建立依赖”和“只读取但不建立依赖”
- 你希望用函数式更新复杂状态

`signal` 的签名如下：

```ts
signal<T>(initial: T, options?: { equals?: (prev: T, next: T) => boolean }, forceGlobal?: boolean)
```

- `initial`：初始值
- `options.equals`：自定义等值比较；返回 `true` 表示新旧值等价，不触发更新
- `forceGlobal`：在需要脱离组件 Hook 上下文时强制创建全局 signal，一般场景下可忽略

#### 基本用法

```tsx
import { type FC, signal } from '@rue-js/rue'

const App: FC = () => {
  const count = signal(0)
  const name = signal('Rue')

  return (
    <div>
      <p>
        {name.get()} 的计数：{count.get()}
      </p>
      <button onClick={() => count.set(count.get() + 1)}>加一</button>
      <button onClick={() => count.set(count.get() - 1)}>减一</button>
      <button onClick={() => count.set(0)}>重置</button>
    </div>
  )
}
```

#### get / set / update / peek / value

下面几个 API 是最常用的一组：

- `get()`：读取值，并在响应式上下文中建立依赖
- `set(next)`：直接设置新值
- `update(updater)`：基于旧值计算新值
- `peek()`：读取值，但不建立依赖
- `value`：便捷属性；读取时等同于无依赖读取，写入时等价于 `set()`

```tsx
import { type FC, signal, watchEffect } from '@rue-js/rue'

const App: FC = () => {
  const count = signal(1)

  // get(): 建立依赖，count 变化时会重新执行
  watchEffect(() => {
    console.log('count =', count.get())
  })

  const increment = () => {
    count.set(count.get() + 1)
  }

  const double = () => {
    count.update(prev => prev * 2)
  }

  const logSnapshot = () => {
    // peek(): 只读取，不建立依赖
    console.log('snapshot =', count.peek())
    // value: 读取当前值；写入等价于 set()
    console.log('value =', count.value)
  }

  const reset = () => {
    count.value = 0
  }

  return (
    <div>
      <p>计数：{count.get()}</p>
      <button onClick={increment}>加一</button>
      <button onClick={double}>翻倍</button>
      <button onClick={logSnapshot}>打印快照</button>
      <button onClick={reset}>重置</button>
    </div>
  )
}
```

#### 与 computed 配合

`signal` 与 `computed` 无缝配合，计算属性会自动追踪所有访问过的 `signal` 依赖：

```tsx
import { type FC, signal, computed } from '@rue-js/rue'

const App: FC = () => {
  const firstName = signal('张')
  const lastName = signal('三')

  // computed 自动追踪 firstName 和 lastName 的变化
  const fullName = computed(() => `${firstName.get()}${lastName.get()}`)
  const greeting = computed(() => `你好，${fullName.value}！`)
  const initials = computed(() => `${firstName.get()[0]}${lastName.get()[0]}`)

  return (
    <div>
      <div>
        <input
          value={firstName.get()}
          onInput={e => firstName.set((e.target as HTMLInputElement).value)}
          placeholder="姓"
        />
        <input
          value={lastName.get()}
          onInput={e => lastName.set((e.target as HTMLInputElement).value)}
          placeholder="名"
        />
      </div>
      <p>{greeting.value}</p>
      <p>缩写：{initials.value}</p>
    </div>
  )
}
```

#### getPath / setPath / updatePath / peekPath

当 `signal` 内部存的是对象或数组时，可以按路径操作任意嵌套字段：

- `getPath(path)`：读取路径值，并建立该路径的依赖
- `setPath(path, value)`：设置路径值
- `updatePath(path, updater)`：基于路径旧值更新
- `peekPath(path)`：读取路径值，但不建立依赖

`path` 同时支持两种写法：

- 数组路径：`['user', 'profile', 'name']`
- 字符串路径：`'user.profile.name'`

数组下标同样支持：

- `['items', 0]`
- `'items.0'`

```tsx
import { type FC, signal, watchEffect } from '@rue-js/rue'

const App: FC = () => {
  const state = signal({
    user: {
      profile: {
        name: 'Rue',
      },
      age: 20,
    },
    items: ['苹果', '香蕉'],
  })

  watchEffect(() => {
    // 订阅 user.profile.name 这条路径
    console.log('当前用户名：', state.getPath('user.profile.name'))
  })

  const rename = () => {
    state.setPath(['user', 'profile', 'name'], 'Rue Next')
  }

  const growUp = () => {
    state.updatePath('user.age', prev => (prev ?? 0) + 1)
  }

  const replaceFirstItem = () => {
    state.setPath('items.0', '西瓜')
  }

  const logRawName = () => {
    // 不建立依赖，适合调试或一次性读取
    console.log(state.peekPath('user.profile.name'))
  }

  return (
    <div>
      <p>姓名：{state.getPath('user.profile.name')}</p>
      <p>年龄：{state.getPath('user.age')}</p>
      <p>第一个水果：{state.getPath(['items', 0])}</p>
      <button onClick={rename}>改名</button>
      <button onClick={growUp}>年龄 +1</button>
      <button onClick={replaceFirstItem}>替换第一个水果</button>
      <button onClick={logRawName}>打印姓名快照</button>
    </div>
  )
}
```

路径写入还有几个很实用的特性：

- 空路径 `[]` 或 `''` 表示整个根值
- 缺失的中间路径会自动按对象补齐
- 写入数组越界索引时会自动扩展数组长度
- 函数会被当作普通值存储，不会自动执行

```tsx
import { signal } from '@rue-js/rue'

const state = signal({
  items: ['A'],
})

state.setPath(['config', 'theme', 'mode'], 'dark')
state.setPath('items.2', 'C')
state.setPath('', { ok: true })
state.setPath('callback', () => 42)

console.log(state.get())
// {
//   ok: true,
//   callback: [Function]
// }
```

#### 与 watch / watchEffect 配合

`signal` 可以直接传入 `watch` 进行监听，也可以在 `watchEffect` 中被自动追踪：

```tsx
import { type FC, signal, watch, watchEffect } from '@rue-js/rue'

const App: FC = () => {
  const count = signal(0)
  const keyword = signal('')

  // 监听单个 signal：第一个参数传入 signal 本身
  watch(count, (newVal, oldVal) => {
    console.log(`count 从 ${oldVal} 变为 ${newVal}`)
  })

  // 同时监听多个 signal
  watch([count, keyword], ([newCount, newKeyword], [oldCount, oldKeyword]) => {
    console.log(`count: ${oldCount} → ${newCount}`)
    console.log(`keyword: "${oldKeyword}" → "${newKeyword}"`)
  })

  // watchEffect 自动追踪内部用到的所有 signal
  watchEffect(() => {
    if (keyword.get()) {
      console.log(`正在搜索"${keyword.get()}"，当前计数：${count.get()}`)
    }
  })

  return (
    <div>
      <input
        value={keyword.get()}
        onInput={e => keyword.set((e.target as HTMLInputElement).value)}
        placeholder="搜索关键词"
      />
      <p>计数：{count.get()}</p>
      <button onClick={() => count.set(count.get() + 1)}>加一</button>
    </div>
  )
}
```

#### 自定义 equals

默认情况下，`signal` 会根据内部的等值比较决定是否触发订阅者。你也可以通过 `options.equals` 自定义比较策略：

```tsx
import { signal, watchEffect } from '@rue-js/rue'

const user = signal(
  { id: 1, name: 'Rue' },
  {
    equals: (prev, next) => prev.id === next.id && prev.name === next.name,
  },
)

watchEffect(() => {
  console.log('user changed:', user.get())
})

user.set({ id: 1, name: 'Rue' }) // equals 返回 true，不触发
user.set({ id: 1, name: 'Rue Next' }) // 触发
```

#### 调试与序列化

`signal` 还提供了一些调试辅助 API：

- `toJSON()`：`JSON.stringify(signal)` 时返回内部值
- `valueOf()`：返回内部原始值
- `toString()`：返回 JSON 字符串；无法序列化时会退回占位文本

```tsx
import { signal } from '@rue-js/rue'

const state = signal({
  count: 1,
  nested: { ok: true },
})

console.log(state.toJSON())
console.log(state.valueOf())
console.log(state.toString())
console.log(JSON.stringify(state))
```

#### 对象与数组类型

`signal` 可以存储任意类型的值，包括对象和数组。更新引用类型时，传入新的引用以触发响应式更新：

```tsx
import { type FC, signal, computed } from '@rue-js/rue'

interface Todo {
  id: number
  text: string
  done: boolean
}

const TodoApp: FC = () => {
  const todos = signal<Todo[]>([
    { id: 1, text: '学习 Rue', done: false },
    { id: 2, text: '构建应用', done: false },
  ])
  const input = signal('')

  // 从 signal 派生计算属性
  const remaining = computed(() => todos.get().filter(t => !t.done).length)
  const total = computed(() => todos.get().length)

  const addTodo = () => {
    if (!input.get().trim()) return
    // 传入新数组引用来触发更新
    todos.set([...todos.get(), { id: Date.now(), text: input.get(), done: false }])
    input.set('')
  }

  const toggleTodo = (id: number) => {
    todos.set(todos.get().map(t => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  const removeTodo = (id: number) => {
    todos.set(todos.get().filter(t => t.id !== id))
  }

  return (
    <div>
      <h3>
        待完成：{remaining.value} / {total.value}
      </h3>
      <div>
        <input
          value={input.get()}
          onInput={e => input.set((e.target as HTMLInputElement).value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder="新待办事项，回车确认"
        />
        <button onClick={addTodo}>添加</button>
      </div>
      <ul>
        {todos.get().map(todo => (
          <li key={todo.id}>
            <span
              style={{ textDecoration: todo.done ? 'line-through' : 'none', cursor: 'pointer' }}
              onClick={() => toggleTodo(todo.id)}
            >
              {todo.text}
            </span>
            <button onClick={() => removeTodo(todo.id)}>删除</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

#### signal 与 ref 的对比

| 特性     | `signal`             | `ref`                  |
| -------- | -------------------- | ---------------------- |
| 读取值   | `count.get()`        | `count.value`          |
| 写入值   | `count.set(newVal)`  | `count.value = newVal` |
| 类型风格 | getter / setter 函数 | 属性访问               |
| 适合场景 | 函数式编程偏好       | 属性访问偏好           |

两者在响应式追踪能力上完全等价，可以在同一个项目中混合使用，按团队偏好选择即可。如果你需要路径级别的读取和更新、无依赖快照读取、函数式更新等能力，`signal` 会更灵活。

### 使用 watch 和 watchEffect

Rue 提供了 `watch` 和 `watchEffect` 来监听响应式状态的变化：

```tsx
import { type FC, ref, watch, watchEffect } from '@rue-js/rue'

const App: FC = () => {
  const count = ref(0)

  // 监听特定值的变化
  watch(count, (newValue, oldValue) => {
    console.log(`计数从 ${oldValue} 变为 ${newValue}`)
  })

  // 自动追踪依赖
  watchEffect(() => {
    console.log(`当前计数：${count.value}`)
  })

  return <button onClick={() => count.value++}>计数：{count.value}</button>
}
```

### 生命周期钩子 {#lifecycle-hooks}

Rue 提供了完整的生命周期钩子：

```tsx
import {
  type FC,
  ref,
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
} from '@rue-js/rue'

const App: FC = () => {
  const count = ref(0)

  onBeforeMount(() => {
    console.log('组件即将挂载')
  })

  onMounted(() => {
    console.log('组件已挂载')
  })

  onBeforeUpdate(() => {
    console.log('组件即将更新')
  })

  onUpdated(() => {
    console.log('组件已更新')
  })

  return <button onClick={() => count.value++}>计数：{count.value}</button>
}
```

### 组件通信 {#component-communication}

Rue 使用 props 和事件回调进行组件间通信：

```tsx
import { type FC, ref } from '@rue-js/rue'

// 子组件
const Child: FC<{
  message: string
  onNotify?: (msg: string) => void
}> = props => {
  return (
    <div>
      <p>{props.message}</p>
      <button onClick={() => props.onNotify?.('来自子组件的消息')}>通知父组件</button>
    </div>
  )
}

// 父组件
const Parent: FC = () => {
  const parentMessage = ref('来自父组件的消息')

  const handleNotify = (msg: string) => {
    console.log('收到通知：', msg)
  }

  return <Child message={parentMessage.value} onNotify={handleNotify} />
}
```

### 选择哪种方式？ {#which-to-choose}

所有这些 API 风格都能完全覆盖常见的使用场景。Rue 的灵活性允许你：

- 如果你喜欢属性访问风格的响应式系统，使用 `ref`、`useState` 和 `computed`
- 如果你熟悉 React，使用 `useState`
- 如果你更习惯 getter / setter 风格，使用 `signal` 和 `computed`
- 可以根据项目需要混合使用不同的 API

对于学习目的，选择看起来更容易理解的风格。大多数核心概念在不同风格之间是共享的。你可以随时在学习过程中切换到另一种风格。

对于生产使用：

- 如果你计划构建完整的应用程序，推荐使用 `ref` + `useState` + JSX
- 如果你从 React 迁移过来，`useState` 可以帮你更快上手
