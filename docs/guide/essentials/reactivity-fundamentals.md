# 响应式基础 {#reactivity-fundamentals}

## 声明响应式状态 {#declaring-reactive-state}

### `ref()` {#ref}

在 Rue 中，声明响应式状态推荐使用 [`ref()`](/api/api/reactivity-core#ref) 函数：

```js
import { ref } from '@rue-js/rue'

const count = ref(0)
```

`ref()` 接收一个参数并返回一个带有 `.value` 属性的 ref 对象：

```js
const count = ref(0)

console.log(count) // { value: 0 }
console.log(count.value) // 0

count.value++
console.log(count.value) // 1
```

在组件的 JSX 中可以直接使用 ref：

```tsx
import { ref } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const Counter: FC = () => {
  const count = ref(0)

  return <div>{count.value}</div>
}
```

你也可以直接在事件处理器中修改 ref：

```tsx{2}
<button onClick={() => count.value++}>
  {count.value}
</button>
```

对于更复杂的逻辑，我们可以在同一作用域声明修改 ref 的函数：

```tsx
import { ref } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const Counter: FC = () => {
  const count = ref(0)

  function increment() {
    // 在 JavaScript 中需要使用 .value
    count.value++
  }

  return <button onClick={increment}>{count.value}</button>
}
```

### 为什么使用 Refs？ {#why-refs}

你可能会好奇为什么我们需要带有 `.value` 的 refs 而不是使用普通变量。要解释这一点，我们需要简单讨论一下 Rue 的响应式系统是如何工作的。

当你在模板中使用 ref 并在之后更改 ref 的值时，Rue 会自动检测到这个变化并相应地更新 DOM。这是通过一个基于依赖追踪的响应式系统实现的。当组件首次渲染时，Rue 会**追踪**渲染过程中使用的每一个 ref。之后，当 ref 被修改时，它会**触发**追踪它的组件重新渲染。

在标准 JavaScript 中，没有检测普通变量访问或修改的方法。但是，我们可以使用 getter 和 setter 方法来拦截对象的属性访问和修改操作。

`.value` 属性给了 Rue 检测 ref 何时被访问或修改的机会。在底层，Rue 在其 getter 中执行追踪，在 setter 中执行触发。从概念上讲，你可以将 ref 看作是这样的对象：

```js
// 伪代码，不是实际实现
const myRef = {
  _value: 0,
  get value() {
    track()
    return this._value
  },
  set value(newValue) {
    this._value = newValue
    trigger()
  },
}
```

refs 的另一个优点与普通变量不同，你可以将 refs 传递给函数，同时保留对最新值和响应式连接的访问。这在将复杂逻辑重构为可复用代码时特别有用。

响应式系统在 [深入响应式](/guide/guide/extras/reactivity-in-depth) 部分有更详细的讨论。

## 对象与路径状态 {#deep-reactivity}

对象本身不经过深度代理转换。普通模块使用显式路径读写：

```ts
import { signal } from '@rue-js/rue'
const state = signal({ nested: { count: 0 } })
state.updatePath('nested.count', n => Number(n) + 1)
console.log(state.getPath('nested.count'))
```

在经过 Rue SWC 编译的组件内使用 `const [state] = useState({ nested: { count: 0 } })`，编译器会把 `state.nested.count++` 转换为路径更新。

## DOM 更新时机 {#dom-update-timing}

当你修改响应式状态时，DOM 会自动更新。但需要注意的是，DOM 更新不会在同一同步调用栈里立刻应用。相反，Rue 会把默认调度的更新合并到当前这一轮 flush 中，以确保无论进行了多少次状态更改，每个组件都只更新一次。

要等待 DOM 更新在状态更改后完成，可以使用 [nextTick()](/api/api/general#nexttick) 全局 API：

```tsx
import { nextTick, ref, useRef } from '@rue-js/rue'

const count = ref(0)
const counterRef = useRef<HTMLSpanElement>()

async function increment() {
  count.value++

  console.log(counterRef.current?.textContent) // 旧 DOM 文本
  await nextTick()
  console.log(counterRef.current?.textContent) // 新 DOM 文本
}
```

交互式示例：[/examples/next-tick](/examples/next-tick)

## 对象读写边界 {#object-state-boundaries}

`get()` 不创建副本；对读出的普通对象直接赋值不会自动通知依赖。需要交给外部代码时显式复制，修改后使用 `set()` 写回。未知状态逃逸不受支持，严格编译会给出诊断。

旧 `reactive` 对象 API 已删除。详见[新模型与迁移](/guide/guide/extras/reactivity-in-depth#migration)。
