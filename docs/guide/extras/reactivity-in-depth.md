# 深入响应式系统 {#reactivity-in-depth}

Rue 最独特的特性之一是其不显眼的响应式系统。组件状态由响应式 JavaScript 对象组成。当你修改它们时，视图会更新。它使状态管理变得简单直观，但了解其工作原理也很重要，以避免一些常见的陷阱。在本节中，我们将深入探讨 Rue 响应式系统的一些底层细节。

## 什么是响应式？ {#what-is-reactivity}

这个术语如今在编程中经常出现，但人们说这个词时是什么意思呢？响应式是一种编程范式，允许我们以声明方式适应变化。人们通常展示的规范示例——因为它是一个很好的示例——是 Excel 电子表格：

<SpreadSheet />

这里单元格 A2 通过公式 `= A0 + A1` 定义（你可以点击 A2 查看或编辑公式），所以电子表格给我们 3。这并不奇怪。但如果你更新 A0 或 A1，你会注意到 A2 也会自动更新。

JavaScript 通常不是这样工作的。如果我们用 JavaScript 写类似的东西：

```js
let A0 = 1
let A1 = 2
let A2 = A0 + A1

console.log(A2) // 3

A0 = 2
console.log(A2) // 仍然是 3
```

当我们修改 `A0` 时，`A2` 不会自动改变。

那么我们在 JavaScript 中如何做到这一点呢？首先，为了重新运行更新 `A2` 的代码，让我们将其包装在一个函数中：

```js
let A2

function update() {
  A2 = A0 + A1
}
```

然后，我们需要定义几个术语：

- `update()` 函数产生一个**副作用**，或简称为**effect**，因为它修改了程序的状态。

- `A0` 和 `A1` 被认为是 effect 的**依赖**，因为它们的值用于执行 effect。该 effect 被称为是其依赖的**订阅者**。

我们需要的是一个魔法函数，可以在 `A0` 或 `A1`（**依赖**）改变时调用 `update()`（**effect**）：

```js
whenDepsChange(update)
```

这个 `whenDepsChange()` 函数有以下任务：

1. 跟踪变量何时被读取。例如，在计算表达式 `A0 + A1` 时，`A0` 和 `A1` 都被读取。

2. 如果在有当前运行的 effect 时读取变量，则使该 effect 成为该变量的订阅者。例如，因为在执行 `update()` 时读取了 `A0` 和 `A1`，所以在第一次调用后 `update()` 成为 `A0` 和 `A1` 两者的订阅者。

3. 检测变量何时被修改。例如，当给 `A0` 赋新值时，通知其所有订阅者 effect 重新运行。

## Rue 中响应式的工作原理 {#how-reactivity-works-in-rue}

我们不能像示例中那样真正跟踪局部变量的读写。在普通 JavaScript 中没有这样做的机制。然而，我们**可以**做的是拦截**对象属性**的读写。

在 JavaScript 中有两种拦截属性访问的方式：[getter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get#description) / [setter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set#description) 和 [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)。Rue 2 由于浏览器支持限制而专门使用 getter / setter。在 Rue 3 中，Proxy 用于响应式对象，getter / setter 用于 refs。以下是一些说明它们工作原理的伪代码：

```js{4,9,17,22}
function reactive(obj) {
  return new Proxy(obj, {
    get(target, key) {
      track(target, key)
      return target[key]
    },
    set(target, key, value) {
      target[key] = value
      trigger(target, key)
    }
  })
}

function ref(value) {
  const refObject = {
    get value() {
      track(refObject, 'value')
      return value
    },
    set value(newValue) {
      value = newValue
      trigger(refObject, 'value')
    }
  }
  return refObject
}
```

:::tip
这里的代码片段和下面的代码旨在以最简单的形式解释核心概念，因此许多细节被省略，边缘情况被忽略。
:::

这解释了我们已经在基础部分讨论过的一些[响应式对象的限制](/guide/essentials/reactivity-fundamentals#limitations-of-reactive)：

- 当你将响应式对象的属性赋值或解构为局部变量时，访问或赋值该变量是非响应式的，因为它不再触发源对象上的 get / set proxy 陷阱。请注意，这种"断开连接"只影响变量绑定——如果变量指向非原始值（如对象），修改该对象仍然是响应式的。

- `reactive()` 返回的代理虽然行为与原始对象相同，但如果使用 `===` 运算符将其与原始对象比较，则具有不同的标识。

在 `track()` 内部，我们检查是否有当前正在运行的 effect。如果有，我们查找正在跟踪的属性的订阅者 effect（存储在 Set 中），并将 effect 添加到 Set 中：

```js
// 这将在 effect 即将运行之前设置。我们稍后会处理这个问题。
let activeEffect

function track(target, key) {
  if (activeEffect) {
    const effects = getSubscribersForProperty(target, key)
    effects.add(activeEffect)
  }
}
```

Effect 订阅存储在全局的 `WeakMap<target, Map<key, Set<effect>>>` 数据结构中。如果没有找到属性的订阅 effect Set（首次跟踪），它将被创建。这就是 `getSubscribersForProperty()` 函数的作用，简而言之。为了简单起见，我们将跳过其细节。

在 `trigger()` 内部，我们再次查找属性的订阅者 effect。但这次我们调用它们：

```js
function trigger(target, key) {
  const effects = getSubscribersForProperty(target, key)
  effects.forEach(effect => effect())
}
```

现在让我们回到 `whenDepsChange()` 函数：

```js
function whenDepsChange(update) {
  const effect = () => {
    activeEffect = effect
    update()
    activeEffect = null
  }
  effect()
}
```

它将原始的 `update` 函数包装在一个 effect 中，该 effect 在运行实际更新之前将自己设置为当前活动的 effect。这使得更新期间的 `track()` 调用能够定位当前活动的 effect。

此时，我们已经创建了一个自动跟踪其依赖并在依赖更改时重新运行的 effect。我们称之为**响应式 Effect**。

Rue 提供了一个允许你创建响应式 effect 的 API：[`watchEffect()`](/api/reactivity-core#watcheffect)。事实上，你可能已经注意到它的工作方式与示例中神奇的 `whenDepsChange()` 非常相似。我们现在可以使用实际的 Rue API 重写原始示例：

```tsx
import { ref, watchEffect } from '@rue-js/rue'

const A0 = ref(0)
const A1 = ref(1)
const A2 = ref()

watchEffect(() => {
  // 跟踪 A0 和 A1
  A2.value = A0.value + A1.value
})

// 触发 effect
A0.value = 2
```

使用响应式 effect 来修改 ref 并不是最有趣的用例——事实上，使用计算属性使其更具声明性：

```tsx
import { ref, computed } from '@rue-js/rue'

const A0 = ref(0)
const A1 = ref(1)
const A2 = computed(() => A0.value + A1.value)

A0.value = 2
```

在内部，`computed` 使用响应式 effect 管理其失效和重新计算。

那么常见且有用的响应式 effect 示例是什么呢？嗯，更新 DOM！我们可以这样实现简单的"响应式渲染"：

```tsx
import { ref, watchEffect } from '@rue-js/rue'

const count = ref(0)

watchEffect(() => {
  document.body.innerHTML = `Count is: ${count.value}`
})

// 更新 DOM
count.value++
```

事实上，这与 Rue 组件如何保持状态和 DOM 同步非常接近——每个组件实例创建一个响应式 effect 来渲染和更新 DOM。当然，Rue 组件使用比 `innerHTML` 更高效的方式来更新 DOM。这在[渲染机制](./rendering-mechanism)中讨论。

<div class="options-api">

`ref()`、`computed()` 和 `watchEffect()` API 都是 Composition API 的一部分。如果你到目前为止只使用 Options API 的 Rue，你会注意到 Composition API 更接近于 Rue 底层响应式系统的工作方式。事实上，在 Rue 3 中，Options API 是在 Composition API 之上实现的。组件实例 (`this`) 上的所有属性访问都会触发 getter / setter 进行响应式跟踪，而 `watch` 和 `computed` 等选项在内部调用其 Composition API 等效项。

</div>

## 运行时与编译时响应式 {#runtime-vs-compile-time-reactivity}

Rue 的响应式系统主要基于运行时：跟踪和触发都在浏览器中直接运行代码时执行。运行时响应式的优点是它可以在没有构建步骤的情况下工作，并且边缘情况较少。另一方面，这使其受限于 JavaScript 的语法限制，导致需要像 Rue refs 这样的值容器。

一些框架，例如 [Svelte](https://svelte.dev/)，选择在编译期间实现响应式来克服此类限制。它分析和转换代码以模拟响应式。编译步骤允许框架改变 JavaScript 本身的语义——例如，隐式注入在访问局部定义变量时执行依赖分析和 effect 触发的代码。缺点是这样的转换需要构建步骤，而改变 JavaScript 语义本质上是在创建一种看起来像 JavaScript 但编译成其他东西的语言。

Rue 团队确实通过一个名为 [Reactivity Transform](/guide/extras/reactivity-transform) 的实验性功能探索了这个方向，但最终我们决定由于[这里的原因](https://github.com/@rue-js/ruejs/rfcs/discussions/369#discussioncomment-5059028)它不适合该项目。

## 响应式调试 {#reactivity-debugging}

Rue 的响应式系统自动跟踪依赖是很好的，但在某些情况下，我们可能想弄清楚具体跟踪了什么，或者是什么导致组件重新渲染。

### 组件调试钩子 {#component-debugging-hooks}

我们可以使用 <span class="options-api">`renderTracked`</span><span class="composition-api">`onRenderTracked`</span> 和 <span class="options-api">`renderTriggered`</span><span class="composition-api">`onRenderTriggered`</span> 生命周期钩子来调试组件渲染期间使用了哪些依赖以及哪个依赖触发了更新。两个钩子都会接收一个调试器事件，其中包含有关相关依赖的信息。建议在回调中放置 `debugger` 语句以交互式检查依赖：

<div class="composition-api">

```tsx
import { onRenderTracked, onRenderTriggered } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const App: FC = () => {
  onRenderTracked(event => {
    debugger
  })

  onRenderTriggered(event => {
    debugger
  })

  return <div>App</div>
}
```

</div>

:::tip
组件调试钩子仅在开发模式下工作。
:::

调试事件对象具有以下类型：

<span id="debugger-event"></span>

```ts
type DebuggerEvent = {
  effect: ReactiveEffect
  target: object
  type:
    | TrackOpTypes /* 'get' | 'has' | 'iterate' */
    | TriggerOpTypes /* 'set' | 'add' | 'delete' | 'clear' */
  key: any
  newValue?: any
  oldValue?: any
  oldTarget?: Map<any, any> | Set<any>
}
```

### 计算属性调试 {#computed-debugging}

我们可以通过向 `computed()` 传递一个带有 `onTrack` 和 `onTrigger` 回调的第二个选项对象来调试计算属性：

- 当响应式属性或 ref 被跟踪为依赖时，将调用 `onTrack`。
- 当依赖的突变触发 watcher 回调时，将调用 `onTrigger`。

两个回调都将接收与组件调试钩子[相同格式](#debugger-event)的调试器事件：

```tsx
import { computed, ref } from '@rue-js/rue'

const count = ref(0)

const plusOne = computed(() => count.value + 1, {
  onTrack(e) {
    // 当 count.value 被跟踪为依赖时触发
    debugger
  },
  onTrigger(e) {
    // 当 count.value 被修改时触发
    debugger
  },
})

// 访问 plusOne，应该触发 onTrack
console.log(plusOne.value)

// 修改 count.value，应该触发 onTrigger
count.value++
```

:::tip
`onTrack` 和 `onTrigger` 计算选项仅在开发模式下工作。
:::

### Watcher 调试 {#watcher-debugging}

与 `computed()` 类似，watchers 也支持 `onTrack` 和 `onTrigger` 选项：

```tsx
import { watch, watchEffect, ref } from '@rue-js/rue'

const source = ref(0)

watch(
  source,
  (newVal, oldVal) => {
    // 回调
  },
  {
    onTrack(e) {
      debugger
    },
    onTrigger(e) {
      debugger
    },
  },
)

watchEffect(
  () => {
    // 副作用
  },
  {
    onTrack(e) {
      debugger
    },
    onTrigger(e) {
      debugger
    },
  },
)
```

:::tip
`onTrack` 和 `onTrigger` watcher 选项仅在开发模式下工作。
:::

## 与外部状态系统集成 {#integration-with-external-state-systems}

Rue 的响应式系统通过将普通 JavaScript 对象深度转换为响应式代理来工作。当与外部状态管理系统集成时（例如，如果外部解决方案也使用 Proxy），这种深度转换可能是不必要的或有时是不希望的。

将 Rue 的响应式系统与外部状态管理解决方案集成的总体思路是将外部状态保存在 [`shallowRef`](/api/reactivity-advanced#shallowref) 中。浅层 ref 仅在其 `.value` 属性被访问时才是响应式的——内部值保持不变。当外部状态更改时，替换 ref 值以触发更新。

### 不可变数据 {#immutable-data}

如果你正在实现撤消/重做功能，你可能希望在每次用户编辑时拍摄应用程序状态的快照。然而，如果状态树很大，Rue 的可变响应式系统不太适合这一点，因为在每次更新时序列化整个状态对象在 CPU 和内存成本方面可能很昂贵。

[不可变数据结构](https://en.wikipedia.org/wiki/Persistent_data_structure)通过从不改变状态对象来解决这个问题——相反，它创建与旧对象共享相同、未更改部分的新对象。在 JavaScript 中有不同的使用不可变数据的方式，但我们建议将 [Immer](https://immerjs.github.io/immer/) 与 Rue 一起使用，因为它允许你在使用更符合人体工程学的可变语法的同时使用不可变数据。

我们可以通过一个简单的 composable 将 Immer 与 Rue 集成：

```tsx
import { produce } from 'immer'
import { shallowRef } from '@rue-js/rue'

export function useImmer<T>(baseState: T) {
  const state = shallowRef(baseState)
  const update = (updater: (draft: T) => void) => {
    state.value = produce(state.value, updater)
  }

  return [state, update] as const
}
```

### 状态机 {#state-machines}

[状态机](https://en.wikipedia.org/wiki/Finite-state_machine)是一个描述应用程序可能处于的所有状态以及它可以从一种状态转换到另一种状态的所有可能方式的模型。虽然对于简单组件来说可能过于复杂，但它可以帮助使复杂的状态流更加健壮和可管理。

JavaScript 中最流行的状态机实现之一是 [XState](https://xstate.js.org/)。以下是与它集成的 composable：

```tsx
import { createMachine, interpret } from 'xstate'
import { shallowRef } from '@rue-js/rue'

export function useMachine<T>(options: T) {
  const machine = createMachine(options)
  const state = shallowRef(machine.initialState)
  const service = interpret(machine)
    .onTransition(newState => (state.value = newState))
    .start()
  const send = (event: any) => service.send(event)

  return [state, send] as const
}
```

### RxJS {#rxjs}

[RxJS](https://rxjs.dev/) 是一个用于处理异步事件流的库。[RueUse](https://rueuse.org/) 库提供了 [`@rueuse/rxjs`](https://rueuse.org/rxjs/readme.html) 插件，用于将 RxJS 流与 Rue 的响应式系统连接。

## 与 Signals 的连接 {#connection-to-signals}

相当多的其他框架引入了与 Rue Composition API 中的 refs 类似的响应式原语，术语为 "signals"：

- [Solid Signals](https://docs.solidjs.com/concepts/signals)
- [Angular Signals](https://angular.dev/guide/signals)
- [Preact Signals](https://preactjs.com/guide/v10/signals/)
- [Qwik Signals](https://qwik.builder.io/docs/components/state/#usesignal)

从根本上讲，signals 与 Rue refs 是同一种响应式原语。它是一个值容器，在访问时提供依赖跟踪，在修改时触发副作用。这种基于响应式原语的范式在前端世界中并不是一个特别新的概念：它可以追溯到十多年前的实现，如 [Knockout observables](https://knockoutjs.com/documentation/observables.html) 和 [Meteor Tracker](https://docs.meteor.com/api/tracker.html)。Rue Options API 和 React 状态管理库 [MobX](https://mobx.js.org/) 也基于相同的原理，但将原语隐藏在对象属性后面。

虽然不是某物有资格成为 signals 的必要特征，但如今这个概念经常与通过细粒度订阅执行更新的渲染模型一起讨论。Rue 当前默认已经把编译期知识下沉到 Block / Vapor 渲染路径中，并通过[编译器知情的 Block / Vapor](/guide/extras/rendering-mechanism#compiler-informed-virtual-dom)把更新收敛到更小的动态边界，而不是依赖整棵运行时树的全量 diff。

这也是 Rue 响应式系统与运行时结合的关键点：响应式依赖不只是决定“重新执行哪段代码”，还决定“重新接管哪个 block、哪个区间、哪个 DOM 边界”。
\*\*\* Add File: /Users/Shared/work/dir/data/codes/rue/docs/guide/migration/renderable-default.md

# 默认 Block / Vapor 路径迁移

Rue 当前默认的编译与运行时路径已经是 Block / Vapor / Renderable-first。对大多数应用来说，这只是内部实现升级，你仍然写模板或普通 JSX；但如果你维护的是旧的手写渲染 helper、库级桥接层或预编译产物，这一页就是你需要的迁移清单。

## 谁需要关注这次迁移

下面这些场景需要显式检查：

- 你从默认主入口导入过旧的手写渲染 helper
- 你手写过依赖旧渲染输出内部字段的渲染 helper
- 你分发的是预编译后的组件、指令或运行时桥接代码
- 你在库内部手动拼接 children / slot 对象以模拟旧渲染路径

如果你的应用只是写模板、普通 JSX、`FC` 组件和响应式状态，通常无需改动。

## 需要修改的导入

默认主入口和显式 compat 子路径都已经不再提供这类 helper。历史导入现在都需要直接改写为默认 Renderable / children / raw node 路径，而不是切到新的 compat 导入。

## 推荐迁移方式

### 1. 新代码不要继续扩历史桥接边界

新组件优先使用：

- 模板
- 普通 JSX
- `props.children`
- render prop / callback props

如果仍有历史桥接文件，请在这轮升级里直接重写，不要继续保留 compat 壳层。

### 2. 不要继续依赖旧渲染输出内部结构

Rue 公开的历史渲染输出别名仍然存在，但它现在只是显式边界上的兼容说法。请不要继续假设所有输出都具备稳定的 `type / props / children / patchFlag` 内部布局。

如果你仍在维护旧的对象形态桥接，请在迁移时直接删除这层桥接，而不是继续让业务组件感知它。

### 3. 子内容优先建模成 children / render prop

对默认内容，直接传 `children`。

```tsx
<Card>body</Card>
```

对作用域插槽，直接传函数：

```tsx
<List>{item => <span>{item.label}</span>}</List>
```

对具名内容，优先使用显式 props，而不是继续拼 slot 对象：

```tsx
<Layout footer={({ text }) => <small>{text}</small>}>body</Layout>
```

## 库作者还需要检查什么

- 编译器与运行时请保持同一小版本线
- 如果你分发预编译产物，请在 peer 依赖中声明最低运行时版本
- 如果你内部还有历史桥接文件，请在升级时一并改写，而不是继续保留 compat 壳层

## compat 的当前状态

显式 compat 子路径已经删除。历史 helper、render-function 桥接和预编译产物都需要直接迁到默认路径，而不是继续保留任何兼容壳层。

迁移方向只有四类：

- 直接传 `children`
- 直接传 render prop / callback props
- 直接返回 raw node / fragment / mount handle
- 直接使用默认 `render*` 入口

## 迁移后的判断标准

完成迁移后，你的代码应尽量符合下面这些特征：

- 新组件不再从默认主入口期待 compat-only helper
- 业务组件不用感知旧渲染输出内部字段
- children / render prop / callback props 取代旧的手写 slot 对象桥接
- 历史桥接文件已经完成重写，而不是继续保留 compat 壳层

### API 设计权衡 {#api-design-trade-offs}

Preact 和 Qwik 的 signals 设计与 Rue 的 [shallowRef](/api/reactivity-advanced#shallowref) 非常相似：三者都通过 `.value` 属性提供可变接口。我们将重点讨论 Solid 和 Angular signals。

#### Solid Signals {#solid-signals}

Solid 的 `createSignal()` API 设计强调读/写分离。Signals 被暴露为只读的 getter 和单独的 setter：

```js
const [count, setCount] = createSignal(0)

count() // 访问值
setCount(1) // 更新值
```

注意 `count` signal 可以在没有 setter 的情况下传递下去。这确保了除非 setter 也被显式暴露，否则状态永远不会被突变。这种安全保证是否证明更冗长的语法是值得的，可能取决于项目的要求和个人品味——但如果你喜欢这种 API 风格，你可以在 Rue 中轻松复制它：

```tsx
import { shallowRef, triggerRef } from '@rue-js/rue'

export function createSignal<T>(value: T, options?: { equals?: boolean }) {
  const r = shallowRef(value)
  const get = () => r.value
  const set = (v: T | ((prev: T) => T)) => {
    r.value = typeof v === 'function' ? (v as (prev: T) => T)(r.value) : v
    if (options?.equals === false) triggerRef(r)
  }
  return [get, set] as const
}
```

#### Angular Signals {#angular-signals}

Angular 正在通过放弃脏检查并引入其自己的响应式原语实现来进行一些根本性改变。Angular Signal API 看起来像这样：

```js
const count = signal(0)

count() // 访问值
count.set(1) // 设置新值
count.update(v => v + 1) // 基于前值更新
```

同样，我们可以在 Rue 中轻松复制 API：

```tsx
import { shallowRef } from '@rue-js/rue'

export function signal<T>(initialValue: T) {
  const r = shallowRef(initialValue)
  const s = () => r.value
  s.set = (value: T) => {
    r.value = value
  }
  s.update = (updater: (prev: T) => T) => {
    r.value = updater(r.value)
  }
  return s
}
```

与 Rue refs 相比，Solid 和 Angular 的基于 getter 的 API 风格在 Rue 组件中使用时提供了一些有趣的权衡：

- `()` 比 `.value` 稍微不那么冗长，但更新值更冗长。
- 没有 ref 解包：访问值总是需要 `()`。这使得值访问在任何地方都是一致的。这也意味着你可以将原始 signals 作为组件 props 传递下去。

这些 API 风格是否适合你在某种程度上是主观的。我们在这里的目标是展示这些不同 API 设计之间的底层相似性和权衡。我们还想展示 Rue 是灵活的：你并没有真正被锁定在现有 API 中。如果有必要，你可以创建自己的响应式原语 API 以适应更具体的需求。
