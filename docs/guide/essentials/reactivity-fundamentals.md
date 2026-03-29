# 响应式基础 {#reactivity-fundamentals}

## 声明响应式状态 {#declaring-reactive-state}

### `ref()` {#ref}

在 Rue 中，声明响应式状态推荐使用 [`ref()`](/api/reactivity-core#ref) 函数：

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

响应式系统在 [深入响应式](/guide/extras/reactivity-in-depth) 部分有更详细的讨论。

## 深层响应式 {#deep-reactivity}

Refs 可以持有任何值类型，包括深层嵌套的对象、数组或 JavaScript 内置数据结构如 `Map`。

一个 ref 会使它的值深层响应式。这意味着即使修改嵌套对象或数组，也可以检测到变化：

```js
import { ref } from '@rue-js/rue'

const obj = ref({
  nested: { count: 0 },
  arr: ['foo', 'bar'],
})

function mutateDeeply() {
  // 这些都能正常工作
  obj.value.nested.count++
  obj.value.arr.push('baz')
}
```

非原始值通过 [`reactive()`](#reactive) 转换为响应式代理，下面会讨论。

也可以通过 [shallow refs](/api/reactivity-advanced#shallowref) 选择退出深层响应式。对于浅层 refs，只有 `.value` 访问被追踪响应式。浅层 refs 可用于通过避免大对象的观测开销来优化性能，或在内部状态由外部库管理的情况下使用。

进一步阅读：

- [减少大型不可变结构的响应式开销](/guide/best-practices/performance#reduce-reactivity-overhead-for-large-immutable-structures)
- [与外部状态系统集成](/guide/extras/reactivity-in-depth#integration-with-external-state-systems)

## DOM 更新时机 {#dom-update-timing}

当你修改响应式状态时，DOM 会自动更新。但需要注意的是，DOM 更新不是同步应用的。相反，Rue 会将它们缓冲到更新周期的"下一个 tick"，以确保无论进行了多少次状态更改，每个组件都只更新一次。

要等待 DOM 更新在状态更改后完成，可以使用 [nextTick()](/api/general#nexttick) 全局 API：

```js
import { nextTick, ref } from '@rue-js/rue'

async function increment() {
  count.value++
  await nextTick()
  // 现在 DOM 已更新
}
```

## `reactive()` {#reactive}

还有另一种声明响应式状态的方式，使用 `reactive()` API。与将内部值包装在特殊对象中的 ref 不同，`reactive()` 使对象本身成为响应式的：

```js
import { reactive } from '@rue-js/rue'

const state = reactive({ count: 0 })
```

> 另请参见：[为 Reactive 添加类型](/guide/typescript/composition-api#typing-reactive) <sup class="vt-badge ts" />

在模板中使用：

```tsx
<button onClick={() => state.count++}>{state.count}</button>
```

响应式对象是 [JavaScript Proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)，行为与普通对象一样。不同之处在于 Vue 能够拦截对响应式对象所有属性的访问和修改以进行响应式追踪和触发。

`reactive()` 深度转换对象：嵌套对象在被访问时也会被 `reactive()` 包装。当 ref 值是对象时，它也会在内部被 `ref()` 调用。与浅层 refs 类似，也有 [`shallowReactive()`](/api/reactivity-advanced#shallowreactive) API 用于选择退出深层响应式。

### Reactive Proxy vs. Original {#reactive-proxy-vs-original}

需要注意的是，`reactive()` 返回的值是原始对象的 [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)，与原始对象不相等：

```js
const raw = {}
const proxy = reactive(raw)

// proxy 不等于原始对象
console.log(proxy === raw) // false
```

只有代理是响应式的——修改原始对象不会触发更新。因此，使用 Rue 的响应式系统时的最佳实践是**只使用状态的代理版本**。

为确保一致地访问代理，对同一对象调用 `reactive()` 始终返回相同的代理，对现有代理调用 `reactive()` 也返回同一代理：

```js
// 对同一对象调用 reactive() 返回相同的代理
console.log(reactive(raw) === proxy) // true

// 对代理调用 reactive() 返回它自身
console.log(reactive(proxy) === proxy) // true
```

这条规则也适用于嵌套对象。由于深层响应式，响应式对象内的嵌套对象也是代理：

```js
const proxy = reactive({})

const raw = {}
proxy.nested = raw

console.log(proxy.nested === raw) // false
```

### `reactive()` 的局限性 {#limitations-of-reactive}

`reactive()` API 有几个局限性：

1. **有限的值类型：** 它只对对象类型（对象、数组和 [集合类型](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects#keyed_collections) 如 `Map` 和 `Set`）有效。它不能持有 [原始类型](https://developer.mozilla.org/en-US/docs/Glossary/Primitive) 如 `string`、`number` 或 `boolean`。

2. **无法替换整个对象：** 由于 Rue 的响应式追踪通过属性访问工作，我们必须始终保持对响应式对象的相同引用。这意味着我们不能轻易地"替换"响应式对象，因为与第一个引用的响应式连接会丢失：

   ```js
   let state = reactive({ count: 0 })

   // 上述引用 ({ count: 0 }) 不再被追踪
   // （响应式连接丢失！）
   state = reactive({ count: 1 })
   ```

3. **对解构不友好：** 当我们将响应式对象的原始类型属性解构为本地变量，或将该属性传递给函数时，我们会丢失响应式连接：

   ```js
   const state = reactive({ count: 0 })

   // 解构时 count 与 state.count 断开连接
   let { count } = state
   // 不会影响原始 state
   count++

   // 函数接收的是普通数字
   // 无法追踪对 state.count 的更改
   // 我们必须传入整个对象以保持响应式
   callSomeFunction(state.count)
   ```

由于这些局限性，我们推荐使用 `ref()` 作为主要 API 来声明响应式状态。

## 额外的 Ref 解包细节 {#additional-ref-unwrapping-details}

### 作为响应式对象属性 {#ref-unwrapping-as-reactive-object-property}

当作为响应式对象的属性访问或修改时，ref 会自动解包。换句话说，它表现得像一个普通属性：

```js
const count = ref(0)
const state = reactive({
  count,
})

console.log(state.count) // 0

state.count = 1
console.log(count.value) // 1
```

如果一个新的 ref 被分配给链接到现有 ref 的属性，它会替换旧的 ref：

```js
const otherCount = ref(2)

state.count = otherCount
console.log(state.count) // 2
// 原始 ref 现在与 state.count 断开连接
console.log(count.value) // 1
```

Ref 解包只发生在嵌套在深层响应式对象内部时。当作为 [浅层响应式对象](/api/reactivity-advanced#shallowreactive) 的属性访问时，它不会应用。

### 数组和集合中的注意事项 {#caveat-in-arrays-and-collections}

与响应式对象不同，当 ref 作为响应式数组或原生集合类型如 `Map` 的元素被访问时，**不会**执行解包：

```js
const books = reactive([ref('Vue 3 Guide')])
// 这里需要 .value
console.log(books[0].value)

const map = reactive(new Map([['count', ref(0)]]))
// 这里需要 .value
console.log(map.get('count').value)
```
