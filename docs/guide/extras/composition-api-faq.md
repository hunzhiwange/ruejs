# Composition API 常见问题 {#composition-api-faq}

## 什么是 Composition API？ {#what-is-composition-api}

Composition API 是一组 API，允许我们使用导入的函数而不是声明选项来编写 Rue 组件。它是一个涵盖以下 API 的统称：

- [Reactivity API](/api/api/reactivity-core)，例如 `ref()` 和 `signal()`，允许我们直接创建响应式状态、计算状态和 watchers。

- [生命周期钩子](/api/api/composition-api-lifecycle)，例如 `onMounted()` 和 `onUnmounted()`，允许我们以编程方式钩入组件生命周期。

- [Context API](/api/api/composition-api-dependency-injection)，即 `createContext()` 和 `useContext()`，允许我们在需要时跨组件层级共享响应式状态。

在 Rue 中，它更常见的用法是直接在组件函数里导入并调用这些 API。以下是使用 Composition API 的组件的基本示例：

```tsx
import { ref, onMounted } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const App: FC = () => {
  // 响应式状态
  const count = ref(0)

  // 改变状态并触发更新的函数
  const increment = () => {
    count.value++
  }

  // 生命周期钩子
  onMounted(() => {
    console.log(`初始计数为 ${count.value}。`)
  })

  return <button onClick={increment}>Count is: {count.value}</button>
}
```

尽管 Composition API 基于函数组合的 API 风格，**Composition API 不是函数式编程**。Composition API 基于 Rue 的可变、细粒度响应式范式，而函数式编程强调不可变性。

如果你想学习如何使用 Rue 的组合式能力，可以从[响应式基础](/guide/guide/essentials/reactivity-fundamentals)和[组合式函数](/guide/guide/reusability/composables)开始阅读。

## 为什么使用 Composition API？ {#why-composition-api}

### 更好的逻辑复用 {#better-logic-reuse}

Composition API 的主要优势在于它能够实现干净、高效的逻辑复用，形式为 [Composable 函数](/guide/guide/reusability/composables)。状态、派生值和副作用都可以通过普通函数组合，而不需要额外的组件层级。

Composition API 的逻辑复用能力催生了令人印象深刻的社区项目，例如 [RueUse](https://rueuse.org/)，一个不断增长的 composable 工具集合。它还作为将有状态的第三方服务或库轻松集成到 Rue 响应式系统中的干净机制，例如 [不可变数据](/guide/guide/extras/reactivity-in-depth#immutable-data)、[状态机](/guide/guide/extras/reactivity-in-depth#state-machines) 和 [RxJS](/guide/guide/extras/reactivity-in-depth#rxjs)。

### 更好的类型推断 {#better-type-inference}

近年来，越来越多的前端开发者采用 [TypeScript](https://www.typescriptlang.org/)，因为它帮助我们编写更健壮的代码，更有信心地进行更改，并提供出色的 IDE 支持的开发体验。Rue 的函数组件和组合式 API 主要使用普通变量、函数和显式类型，因此能自然获得 TypeScript 的推断能力。

相比之下，Composition API 主要使用普通变量和函数，它们自然对类型友好。用 Composition API 编写的代码可以享受完整的类型推断，几乎不需要手动类型提示。大多数时候，Composition API 代码在 TypeScript 和普通 JavaScript 中看起来大致相同。这也使得纯 JavaScript 用户能够从部分类型推断中受益。

### 更小的生产包和更少的开销 {#smaller-production-bundle-and-less-overhead}

使用 Composition API 编写的代码也往往更直接且更易于压缩。这是因为响应式状态、派生状态和事件处理通常直接声明在组件函数的同一作用域里。渲染逻辑可以直接闭包访问这些局部变量，因此少了一层间接访问，也给压缩器留下了更大的优化空间。

## 与 React Hooks 的比较 {#comparison-with-react-hooks}

Composition API 提供了与 React Hooks 相同级别的逻辑组合能力，但有一些重要的区别。

React Hooks 在每次组件更新时都会重复调用。这产生了许多可能让即使是经验丰富的 React 开发者也感到困惑的注意事项。它还导致可能影响开发体验的性能优化问题。以下是一些例子：

- Hooks 对调用顺序敏感，不能是条件性的。

- 在 React 组件中声明的变量可以被 hook 闭包捕获，如果开发者未能传入正确的依赖数组，就会变成"陈旧的"。这导致 React 开发者依赖额外的静态规则来确保传入正确的依赖。然而，这类规则往往不够智能，过度补偿正确性，这导致在遇到边缘情况时不必要的失效和头痛。

- 昂贵的计算需要显式记忆化，这再次需要手动传入正确的依赖数组。

- 传递给子组件的事件处理程序默认会导致不必要的子更新，需要显式缓存回调作为优化。这几乎总是需要的，并且再次需要正确的依赖数组。忽视这一点会导致默认情况下的过度渲染应用，并可能在未意识到的情况下造成性能问题。

- 陈旧闭包问题与 Concurrent 特性相结合，使得很难推断一段 hooks 代码何时运行，并使处理应该在渲染之间持久化的可变状态（通过 `useRef`）变得繁琐。

> 注意：一些与记忆化相关的上述问题可以通过编译器优化解决。

相比之下，Rue Composition API：

- 组件的组合式逻辑通常只在初始化阶段执行一次。这使得代码更符合习惯用法的 JavaScript 使用直觉，因为不必担心陈旧的闭包。Composition API 调用也对调用顺序不敏感，可以是条件性的。

- Rue 的运行时响应式系统自动收集计算属性和 watchers 中使用的响应式依赖，因此无需手动声明依赖。

- 无需手动缓存回调函数以避免不必要的子更新。总的来说，Rue 的细粒度响应式系统确保子组件只在需要时才更新。手动子更新优化很少是 Rue 开发者需要担心的问题。

我们承认 React Hooks 的创意，它是 Composition API 的主要灵感来源。然而，上述问题确实存在于其设计中，我们注意到 Rue 的响应式模型恰好提供了一种绕过它们的方法。
