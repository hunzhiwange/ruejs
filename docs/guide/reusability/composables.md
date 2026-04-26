# 可复用性 - Composables {#composables}

<script setup>
import { useMouse } from './mouse'
const { x, y } = useMouse()
</script>

:::tip
本章节假设你已经具备 Composition API 的基础知识。如果你只学习过 Options API，可以将 API 偏好设置为 Composition API（使用左侧边栏顶部的切换按钮），然后重新阅读[响应式基础](/guide/essentials/reactivity-fundamentals)和[生命周期钩子](/guide/essentials/lifecycle)章节。
:::

## 什么是 "Composable"？ {#what-is-a-composable}

在 Rue 应用的上下文中，"composable" 是一个利用 Rue 的 Composition API 来封装和复用**有状态逻辑**的函数。

在构建前端应用时，我们经常需要复用通用任务的逻辑。例如，我们可能需要在多个地方格式化日期，因此可以提取一个可复用的函数来实现。这个格式化函数封装的是**无状态逻辑**：它接收一些输入并立即返回预期的输出。有很多库可以用来复用无状态逻辑，例如 [lodash](https://lodash.com/) 和 [date-fns](https://date-fns.org/)。

相比之下，有状态逻辑涉及管理随时间变化的状态。一个简单的例子是跟踪页面上鼠标的当前位置。在实际场景中，也可能是更复杂的逻辑，如触摸手势或数据库连接状态。

## 鼠标跟踪器示例 {#mouse-tracker-example}

如果我们直接在组件内使用 Composition API 实现鼠标跟踪功能，代码看起来会是这样：

```tsx [MouseComponent.tsx]
import { ref, onMounted, onUnmounted, type FC } from '@rue-js/rue'

export const MouseComponent: FC = () => {
  const x = ref(0)
  const y = ref(0)

  function update(event: MouseEvent) {
    x.value = event.pageX
    y.value = event.pageY
  }

  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  return () => (
    <div>
      鼠标位置在：{x.value}, {y.value}
    </div>
  )
}
```

但是，如果我们想在多个组件中复用相同的逻辑呢？我们可以将逻辑提取到一个外部文件中，作为一个 composable 函数：

```ts [mouse.ts]
import { ref, onMounted, onUnmounted } from '@rue-js/rue'

// 按照约定，composable 函数名以 "use" 开头
export function useMouse() {
  // 由 composable 封装和管理的状态
  const x = ref(0)
  const y = ref(0)

  // composable 可以随时间更新其管理的状态
  function update(event: MouseEvent) {
    x.value = event.pageX
    y.value = event.pageY
  }

  // composable 也可以挂钩到其所属组件的生命周期
  // 来设置和清理副作用
  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  // 将管理的状态作为返回值暴露
  return { x, y }
}
```

以下是它在组件中的使用方式：

```tsx [MouseComponent.tsx]
import { type FC } from '@rue-js/rue'
import { useMouse } from './mouse'

export const MouseComponent: FC = () => {
  const { x, y } = useMouse()

  return () => (
    <div>
      鼠标位置在：{x.value}, {y.value}
    </div>
  )
}
```

<div class="demo">
  鼠标位置在：{{ x }}, {{ y }}
</div>

如我们所见，核心逻辑保持完全相同——我们所需要做的只是将其移到一个外部函数中，并返回应该暴露的状态。就像在组件内部一样，你可以在 composables 中使用完整的 [Composition API 函数](/api/#composition-api)。现在，相同的 `useMouse()` 功能可以在任何组件中使用。

composables 更酷的一点是，你还可以嵌套它们：一个 composable 函数可以调用一个或多个其他 composable 函数。这使我们能够使用小的、独立的单元来组合复杂的逻辑，类似于我们使用组件来组合整个应用。事实上，这就是为什么我们决定将使这种模式成为可能的 API 集合称为 Composition API。

例如，我们可以将添加和移除 DOM 事件监听器的逻辑提取到它自己的 composable 中：

```ts [event.ts]
import { onMounted, onUnmounted } from '@rue-js/rue'

export function useEventListener(target: EventTarget, event: string, callback: EventListener) {
  // 如果你愿意，也可以让它支持选择器字符串作为 target
  onMounted(() => target.addEventListener(event, callback))
  onUnmounted(() => target.removeEventListener(event, callback))
}
```

现在我们的 `useMouse()` composable 可以简化为：

```ts{2,8-11} [mouse.ts]
import { ref } from '@rue-js/rue'
import { useEventListener } from './event'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  useEventListener(window, 'mousemove', (event: MouseEvent) => {
    x.value = event.pageX
    y.value = event.pageY
  })

  return { x, y }
}
```

:::tip
每个调用 `useMouse()` 的组件实例都会创建自己的 `x` 和 `y` 状态副本，因此它们不会相互干扰。如果你想在组件之间管理共享状态，请阅读[状态管理](/guide/scaling-up/state-management)章节。
:::

## 异步状态示例 {#async-state-example}

`useMouse()` composable 不接受任何参数，所以让我们来看另一个使用参数的例子。在进行异步数据获取时，我们经常需要处理不同的状态：加载中、成功和错误：

```tsx
import { ref, type FC } from '@rue-js/rue'

export const DataComponent: FC = () => {
  const data = ref(null)
  const error = ref<Error | null>(null)

  fetch('...')
    .then(res => res.json())
    .then(json => (data.value = json))
    .catch(err => (error.value = err))

  return () => (
    <div>
      {error.value ? (
        <div>哎呀！遇到错误：{error.value.message}</div>
      ) : data.value ? (
        <div>
          数据已加载：
          <pre>{JSON.stringify(data.value, null, 2)}</pre>
        </div>
      ) : (
        <div>加载中...</div>
      )}
    </div>
  )
}
```

在每个需要获取数据的组件中重复这种模式会很繁琐。让我们将其提取到一个 composable 中：

```ts [fetch.ts]
import { ref } from '@rue-js/rue'

export function useFetch(url: string) {
  const data = ref(null)
  const error = ref<Error | null>(null)

  fetch(url)
    .then(res => res.json())
    .then(json => (data.value = json))
    .catch(err => (error.value = err))

  return { data, error }
}
```

现在在我们的组件中，我们只需要这样做：

```tsx
import { type FC } from '@rue-js/rue'
import { useFetch } from './fetch'

export const DataComponent: FC = () => {
  const { data, error } = useFetch('...')
  // ...
}
```

### 接受响应式状态 {#accepting-reactive-state}

`useFetch()` 接受一个静态 URL 字符串作为输入——所以它只执行一次 fetch 然后就完成了。如果我们希望它在 URL 更改时重新获取数据呢？为了实现这一点，我们需要将响应式状态传递给 composable 函数，并让 composable 创建监视器，使用传递的状态执行操作。

例如，`useFetch()` 应该能够接受一个 ref：

```ts
const url = ref('/initial-url')

const { data, error } = useFetch(url)

// 这应该触发重新获取
url.value = '/new-url'
```

或者，接受一个 [getter 函数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get#description)：

```ts
// 当 props.id 更改时重新获取
const { data, error } = useFetch(() => `/posts/${props.id}`)
```

我们可以使用 [`watchEffect()`](/api/reactivity-core.html#watcheffect) 和 [`toValue()`](/api/reactivity-utilities.html#tovalue) API 重构我们现有的实现：

```ts{7,12} [fetch.ts]
import { ref, watchEffect, toValue } from '@rue-js/rue'

export function useFetch(url: string | Ref<string> | (() => string)) {
  const data = ref(null)
  const error = ref<Error | null>(null)

  const fetchData = () => {
    // 在获取前重置状态
    data.value = null
    error.value = null

    fetch(toValue(url))
      .then((res) => res.json())
      .then((json) => (data.value = json))
      .catch((err) => (error.value = err))
  }

  watchEffect(() => {
    fetchData()
  })

  return { data, error }
}
```

`toValue()` 是在 3.3 中添加的 API。它的设计目的是将 refs 或 getters 规范化为值。如果参数是 ref，它返回 ref 的值；如果参数是函数，它会调用该函数并返回其返回值。否则，它会原样返回参数。它的工作方式类似于 [`unref()`](/api/reactivity-utilities.html#unref)，但对函数有特殊处理。

请注意，`toValue(url)` 是在 `watchEffect` 回调**内部**调用的。这确保了在 `toValue()` 规范化期间访问的任何响应式依赖都会被监视器跟踪。

这个版本的 `useFetch()` 现在接受静态 URL 字符串、refs 和 getters，使其更加灵活。watch effect 会立即运行，并会跟踪在 `toValue(url)` 期间访问的任何依赖。如果没有跟踪到依赖（例如 url 已经是字符串），效果只运行一次；否则，它会在任何跟踪的依赖更改时重新运行。

## 约定和最佳实践 {#conventions-and-best-practices}

### 命名 {#naming}

按照约定，composable 函数使用 camelCase 命名，以 "use" 开头。

### 输入参数 {#input-arguments}

即使 composable 不依赖它们来实现响应式，它也可以接受 ref 或 getter 参数。如果你正在编写一个可能被其他开发者使用的 composable，最好处理输入参数是 refs 或 getters 而不是原始值的情况。[`toValue()`](/api/reactivity-utilities#tovalue) 实用函数会对此很有帮助：

```ts
import { toValue } from '@rue-js/rue'

function useFeature(maybeRefOrGetter: any) {
  // 如果 maybeRefOrGetter 是 ref 或 getter，
  // 会返回其规范化后的值。
  // 否则，原样返回。
  const value = toValue(maybeRefOrGetter)
}
```

如果你的 composable 在输入是 ref 或 getter 时创建响应式效果，请确保使用 `watch()` 显式监视 ref/getter，或者在 `watchEffect()` 内部调用 `toValue()` 以便正确跟踪。

[前面讨论的 useFetch() 实现](#accepting-reactive-state)提供了一个接受 refs、getters 和普通值作为输入参数的具体示例。

### 返回值 {#return-values}

你可能已经注意到，我们一直在 composables 中专门使用 `ref()` 而不是 `reactive()`。推荐的约定是 composables 始终返回一个包含多个 refs 的普通非响应式对象。这允许在组件中解构时保持响应式：

```ts
// x 和 y 是 refs
const { x, y } = useMouse()
```

从 composable 返回响应式对象会导致此类解构失去与 composable 内部状态的响应式连接，而 refs 会保留该连接。

如果你更喜欢将 composables 返回的状态作为对象属性使用，你可以用 `reactive()` 包装返回的对象，这样 refs 会被解包。例如：

```ts
const mouse = reactive(useMouse())
// mouse.x 链接到原始 ref
console.log(mouse.x)
```

```tsx
<div>
  鼠标位置在：{mouse.x}, {mouse.y}
</div>
```

### 副作用 {#side-effects}

在 composables 中执行副作用（例如添加 DOM 事件监听器或获取数据）是可以的，但请注意以下规则：

- 记得在 `onUnmounted()` 中清理副作用。例如，如果 composable 设置了 DOM 事件监听器，它应该在 `onUnmounted()` 中移除该监听器，正如我们在 `useMouse()` 示例中看到的那样。使用一个自动为你执行此操作的 composable 是个好主意，就像 `useEventListener()` 示例那样。

### 使用限制 {#usage-restrictions}

Composables 应该只在 `<script setup>` 或 `setup()` 钩子中调用。它们还应该在这些上下文中**同步**调用。在某些情况下，你也可以在 `onMounted()` 等生命周期钩子中调用它们。

这些限制很重要，因为这些是 Rue 能够确定当前活动组件实例的上下文。访问活动组件实例是必要的，以便：

1. 生命周期钩子可以注册到它。

2. 计算属性和监视器可以链接到它，以便在实例卸载时被销毁，防止内存泄漏。

:::tip
`<script setup>` 是唯一一个你可以在使用 `await` 之后调用 composables 的地方。编译器会自动在异步操作后为你恢复活动实例上下文。
:::

## 提取 Composables 以组织代码 {#extracting-composables-for-code-organization}

Composables 不仅可以用于复用，还可以用于代码组织。随着组件复杂度的增加，你可能会遇到组件太大而难以导航和理解的情况。Composition API 为你提供了完全的灵活性，让你可以基于逻辑关注点将组件代码组织成更小的函数：

```tsx
import { useFeatureA } from './featureA'
import { useFeatureB } from './featureB'
import { useFeatureC } from './featureC'

export const MyComponent: FC = () => {
  const { foo, bar } = useFeatureA()
  const { baz } = useFeatureB(foo)
  const { qux } = useFeatureC(baz)

  // ...
}
```

在某种程度上，你可以将这些提取的 composables 视为可以相互通信的组件级服务。

## 与其他技术的比较 {#comparisons-with-other-techniques}

### vs. Mixins {#vs-mixins}

来自 Vue 2 的用户可能熟悉 [mixins](/api/options-composition#mixins) 选项，它也允许我们将组件逻辑提取到可复用的单元中。Mixins 有三个主要缺点：

1. **属性来源不清晰**：当使用许多 mixins 时，不清楚哪个实例属性是由哪个 mixin 注入的，这使得追踪实现和理解组件行为变得困难。这也是我们推荐对 composables 使用 refs + 解构模式的原因：它使消费组件中的属性来源清晰。

2. **命名空间冲突**：来自不同作者的多个 mixins 可能会注册相同的属性键，导致命名空间冲突。使用 composables，如果来自不同 composables 的键冲突，你可以重命名解构的变量。

3. **隐式跨 mixin 通信**：需要相互交互的多个 mixin 必须依赖共享的属性键，使它们隐式耦合。使用 composables，从一个 composable 返回的值可以作为参数传递给另一个，就像普通函数一样。

由于上述原因，我们不再推荐在 Vue 3 中使用 mixins。该功能仅出于迁移和熟悉的原因保留。

### vs. 无渲染组件 {#vs-renderless-components}

在组件插槽章节中，我们讨论了基于作用域插槽的[无渲染组件](/guide/components/slots#renderless-components)模式。我们甚至使用无渲染组件实现了相同的鼠标跟踪演示。

Composables 相对于无渲染组件的主要优势在于 composables 不会产生额外的组件实例开销。当在整个应用中使用无渲染组件模式时，创建的额外组件实例数量可能会成为明显的性能开销。

建议是，在复用纯逻辑时使用 composables，在复用逻辑和视觉布局时使用组件。

### vs. React Hooks {#vs-react-hooks}

如果你有 React 经验，你可能会注意到这与自定义 React hooks 非常相似。Composition API 部分受到 React hooks 的启发，Rue composables 确实在逻辑组合能力方面与 React hooks 相似。然而，Rue composables 基于 Rue 的细粒度响应式系统，这与 React hooks 的执行模型根本不同。

## 延伸阅读 {#further-reading}

- [响应式深入](/guide/extras/reactivity-in-depth)：深入了解 Rue 响应式系统的工作原理。
- [状态管理](/guide/scaling-up/state-management)：管理多个组件共享状态的模式。
- [测试 Composables](/guide/scaling-up/testing#testing-composables)：关于单元测试 composables 的技巧。
