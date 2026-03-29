# 简介 {#introduction}

:::info 你正在阅读 Rue 的文档！

- Rue 是一个现代化的 JavaScript 响应式框架。
  :::

## Rue 是什么？ {#what-is-rue}

Rue（发音 /ruː/，同"rue"）是一个用于构建用户界面的 JavaScript 框架。它建立在标准 HTML、CSS 和 JavaScript 之上，提供声明式、基于组件的编程模型，帮助你高效地开发任何复杂度的用户界面。

Rue 的设计哲学借鉴了 Vue 和 React 的优点，采用 JSX/TSX 作为主要的组件编写方式，同时提供了类似 Vue 的响应式系统。

下面是一个最小示例：

```tsx
import { type FC, ref } from '@rue-js/rue'

const App: FC = () => {
  const count = ref(0)

  return <button onClick={() => count.value++}>计数：{count.value}</button>
}

export default App
```

**效果**

<script setup>
import { ref } from '@rue-js/rue'
const count = ref(0)
</script>

<div class="demo">
  <button @click="count++">
    计数：{{ count }}
  </button>
</div>

上面的示例展示了 Rue 的两个核心特性：

- **声明式渲染**：Rue 使用 JSX 扩展了 JavaScript，允许我们基于 JavaScript 状态声明式地描述 UI 输出。

- **响应式**：Rue 会自动追踪 JavaScript 状态的变化，并在状态变化时高效地更新 DOM。

你可能已经有一些疑问——不必担心。在文档的其余部分，我们将涵盖每一个细节。现在，请继续阅读，以便对 Rue 提供的功能有一个高层次的理解。

:::tip 前置知识
本文档假设你已具备 HTML、CSS 和 JavaScript 的基础知识。如果你是完全的前端开发新手，直接跳入框架可能不是最好的第一步——先掌握基础，然后再回来！如果需要，你可以通过这些概览来检查你的知识水平：[JavaScript](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/A_re-introduction_to_JavaScript)、[HTML](https://developer.mozilla.org/zh-CN/docs/Learn/HTML/Introduction_to_HTML) 和 [CSS](https://developer.mozilla.org/zh-CN/docs/Learn/CSS/First_steps)。有使用其他框架的经验会有帮助，但不是必需的。
:::

## 渐进式框架 {#the-progressive-framework}

Rue 是一个覆盖了前端开发中大部分常见功能需求的框架和生态系统。但 Web 极其多样化——我们在 Web 上构建的东西在形式和规模上可能千差万别。考虑到这一点，Rue 被设计成灵活且可逐步采用的。根据你的使用场景，Rue 可以以不同的方式使用：

- 无需构建步骤增强静态 HTML
- 在任何页面上嵌入为 Web 组件
- 单页应用（SPA）
- 全栈 / 服务端渲染（SSR）
- Jamstack / 静态站点生成（SSG）
- 针对桌面、移动端、WebGL，甚至是终端

如果你觉得这些概念令人生畏，不用担心！本教程和指南只需要基础的 HTML 和 JavaScript 知识，即使你不是这些领域的专家，也应该能够跟上。

如果你是希望了解如何最好地将 Rue 集成到你的技术栈中的经验丰富的开发者，或者你对这些术语的含义感到好奇，我们在[使用 Rue 的方式](/guide/extras/ways-of-using-rue)中更详细地讨论了它们。

尽管具有灵活性，但关于 Rue 如何工作的核心知识在所有这些使用场景中是共享的。即使你现在是初学者，一路上获得的知识在你将来处理更雄心勃勃的目标时仍然有用。如果你是老手，你可以根据你要解决的问题选择最优的方式来利用 Rue，同时保持相同的生产力。这就是为什么我们称 Rue 为"渐进式框架"：它是一个可以与你一起成长并适应你需求的框架。

## JSX 组件 {#jsx-components}

在 Rue 项目中，我们使用 JSX/TSX 语法编写组件。JSX 是一种 JavaScript 语法扩展，允许你在 JavaScript 中编写类似 HTML 的代码。Rue 的组件是使用函数定义的，我们称之为**函数组件**（FC，Functional Component）。

这是之前的示例，使用 JSX 格式编写：

```tsx
import { type FC, ref } from '@rue-js/rue'

const App: FC = () => {
  const count = ref(0)

  const increment = () => {
    count.value++
  }

  return <button onClick={increment}>计数：{count.value}</button>
}

export default App
```

Rue 的组件系统相比 Vue 的单文件组件（SFC）更加简洁，不需要特殊的文件格式。你可以在任何 `.tsx` 或 `.jsx` 文件中编写组件。

## API 风格 {#api-styles}

Rue 支持多种编写组件的方式，让你可以根据自己的偏好选择：

### 使用 ref 和 reactive {#using-ref-and-reactive}

Rue 提供了类似 Vue 的响应式 API，包括 `ref` 和 `reactive`：

```tsx
import { type FC, ref, reactive, computed } from '@rue-js/rue'

const App: FC = () => {
  // 使用 ref 创建响应式基本类型
  const count = ref(0)

  // 使用 reactive 创建响应式对象
  const state = reactive({
    message: 'Hello Rue!',
    items: ['苹果', '香蕉', '橘子'],
  })

  // 使用 computed 创建计算属性
  const doubleCount = computed(() => count.value * 2)

  return (
    <div>
      <p>{state.message}</p>
      <p>计数：{count.value}</p>
      <p>双倍计数：{doubleCount.value}</p>
      <ul>
        {state.items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
```

### 使用 useState {#using-usestate}

如果你更喜欢 React 风格的 API，Rue 也提供了 `useState`：

```tsx
import { type FC, useState } from '@rue-js/rue'

const App: FC = () => {
  const [count, setCount] = useState(0)

  return <button onClick={() => setCount(count.value + 1)}>计数：{count.value}</button>
}
```

### 使用 watch 和 watchEffect {#using-watch}

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

- 如果你喜欢 Vue 风格的响应式系统，使用 `ref`、`reactive` 和 `computed`
- 如果你熟悉 React，使用 `useState`
- 可以根据项目需要混合使用不同的 API

对于学习目的，选择看起来更容易理解的风格。大多数核心概念在不同风格之间是共享的。你可以随时在学习过程中切换到另一种风格。

对于生产使用：

- 如果你计划构建完整的应用程序，推荐使用 `ref` + `reactive` + JSX
- 如果你从 React 迁移过来，`useState` 可以帮你更快上手

在学习阶段，你不必只承诺一种风格。本文档将在适用的地方提供不同风格的代码示例，你可以随时使用左侧边栏顶部的 **API 偏好开关** 在它们之间切换。

## 还有疑问？ {#still-got-questions}

查看我们的[常见问题](/about/faq)。

## 选择你的学习路径 {#pick-your-learning-path}

不同的开发者有不同的学习风格。随意选择适合你偏好的学习路径——尽管我们建议尽可能阅读所有内容！

<div class="vt-box-container next-steps">
  <a class="vt-box" href="/tutorial/">
    <p class="next-steps-link">尝试教程</p>
    <p class="next-steps-caption">适合喜欢动手实践的人。</p>
  </a>
  <a class="vt-box" href="/guide/quick-start.html">
    <p class="next-steps-link">阅读指南</p>
    <p class="next-steps-caption">指南详细讲解框架的每个方面。</p>
  </a>
  <a class="vt-box" href="/examples/">
    <p class="next-steps-link">查看示例</p>
    <p class="next-steps-caption">探索核心功能和常见 UI 任务的示例。</p>
  </a>
</div>
