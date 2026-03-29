# 单文件组件 (SFC) {#single-file-components}

## 简介 {#introduction}

Rue 单文件组件（简称 **SFC**，扩展名为 `*.rue`）是一种特殊的文件格式，允许我们将组件的模板、逻辑**和**样式封装在单个文件中。以下是一个 SFC 示例：

```vue
<script lang="ts">
import { ref, type FC } from 'rue-js'

export default {
  setup() {
    const greeting = ref('Hello World!')
    return { greeting }
  },
}
</script>

<template>
  <p class="greeting">{{ greeting }}</p>
</template>

<style>
.greeting {
  color: red;
  font-weight: bold;
}
</style>
```

Rue 的 Composition API 风格：

```vue
<script setup lang="ts">
import { ref } from 'rue-js'

const greeting = ref('Hello World!')
</script>

<template>
  <p class="greeting">{{ greeting }}</p>
</template>

<style scoped>
.greeting {
  color: red;
  font-weight: bold;
}
</style>
```

正如我们所见，Rue SFC 是 HTML、CSS 和 JavaScript 经典三巨头的自然扩展。`<template>`、`<script>` 和 `<style>` 块将组件的视图、逻辑和样式封装并集中在同一个文件中。完整语法在 [SFC 语法规范](/api/sfc-spec) 中定义。

## 为什么使用 SFC {#why-sfc}

虽然 SFC 需要构建步骤，但有很多好处作为回报：

- 使用熟悉的 HTML、CSS 和 JavaScript 语法编写模块化组件
- [本质上相关关注点的联合](#what-about-separation-of-concerns)
- 预编译模板，没有运行时编译成本
- [组件作用域 CSS](/api/sfc-css-features)
- [使用 Composition API 时更符合人体工程学的语法](/api/sfc-script-setup)
- 通过跨分析模板和脚本进行更多编译时优化
- [IDE 支持](/guide/scaling-up/tooling#ide-support)，具有模板表达式的自动完成和类型检查
- 开箱即用的热模块替换（HMR）支持

SFC 是 Rue 作为框架的一个定义特性，在以下场景中是使用 Rue 的推荐方法：

- 单页应用（SPA）
- 静态站点生成（SSG）
- 任何非平凡的前端，可以证明构建步骤以获得更好的开发体验（DX）是合理的。

也就是说，我们确实意识到在某些场景下 SFC 可能显得过度。这就是为什么 Rue 仍然可以通过纯 JavaScript 使用而不需要构建步骤。如果你只是想用轻量级交互增强大量静态 HTML，你也可以查看 [petite-vue](https://github.com/vuejs/petite-vue)，这是一个针对渐进式增强优化的 6KB Vue 子集。

## 它是如何工作的 {#how-it-works}

Rue SFC 是一种框架特定的文件格式，必须由 `rue-compiler-sfc` 预编译成标准 JavaScript 和 CSS。编译后的 SFC 是一个标准的 JavaScript（ES）模块——这意味着通过适当的构建设置，你可以像导入模块一样导入 SFC：

```ts
import MyComponent from './MyComponent.rue'

export default {
  components: {
    MyComponent,
  },
}
```

SFC 内部的 `<style>` 标签通常在开发期间作为原生 `<style>` 标签注入以支持热更新。对于生产环境，它们可以提取并合并到单个 CSS 文件中。

你可以在 [Rue SFC Playground](https://play.ruejs.org/) 中试用 SFC 并探索它们是如何编译的。

在实际项目中，我们通常将 SFC 编译器与构建工具（如 [Vite](https://vitejs.dev/)）集成，Rue 通过 `vite-plugin-rue` 提供官方插件支持。查看 [SFC 工具链](/guide/scaling-up/tooling) 部分了解更多详情。

## 关注点分离怎么办？ {#what-about-separation-of-concerns}

一些来自传统 Web 开发背景的用户可能会担心 SFC 将不同的关注点混合在同一个地方——HTML/CSS/JS 本应该分开的！

要回答这个问题，重要的是我们要认同**关注点分离不等于文件类型分离**。工程原则的最终目标是提高代码库的可维护性。在日益复杂的前端应用背景下，将关注点分离教条地作为文件类型分离并不能帮助我们实现这一目标。

在现代 UI 开发中，我们发现，与其将代码库分成三个相互交织的巨大层次，不如将它们分成松散耦合的组件并组合它们。在组件内部，其模板、逻辑和样式本质上是耦合的，将它们集中在一起实际上使组件更具凝聚力和可维护性。

请注意，即使你不喜欢单文件组件的想法，你仍然可以通过使用 [Src Imports](/api/sfc-spec#src-imports) 将 JavaScript 和 CSS 分离到单独文件中来利用其热重载和预编译功能。

## SFC 与 JSX/TSX 的关系

Rue 支持多种编写组件的方式：

1. **SFC (`.rue` 文件)**：推荐用于大多数场景，特别是需要组件作用域样式和更好的模板类型支持时
2. **JSX/TSX**：适合习惯 React 风格的开发者，需要更灵活的 JavaScript 逻辑
3. **纯 JavaScript/TypeScript**：使用 `h()` 函数创建虚拟 DOM

### 何时使用 SFC

- 需要组件作用域 CSS
- 喜欢模板语法而非 JSX
- 需要更好的 IDE 支持（自动完成、类型检查）
- 构建工具支持 `.rue` 文件

### 何时使用 JSX/TSX

- 需要更灵活的 JavaScript 逻辑
- 从 React 迁移
- 需要动态创建组件
- 更喜欢 JavaScript 的全部功能

### 示例对比

SFC 版本：

```vue
<script setup lang="ts">
import { ref, computed } from 'rue-js'

const props = defineProps<{
  items: string[]
}>()

const search = ref('')
const filtered = computed(() => props.items.filter(item => item.includes(search.value)))
</script>

<template>
  <div>
    <input v-model="search" placeholder="搜索..." />
    <ul>
      <li v-for="item in filtered" :key="item">{{ item }}</li>
    </ul>
  </div>
</template>

<style scoped>
input {
  padding: 8px;
  border: 1px solid #ccc;
}
</style>
```

JSX/TSX 版本：

```tsx
import { ref, computed, type FC } from 'rue-js'

interface Props {
  items: string[]
}

export const FilterList: FC<Props> = props => {
  const search = ref('')
  const filtered = computed(() => props.items.filter(item => item.includes(search.value)))

  return () => (
    <div>
      <input
        value={search.value}
        onInput={e => (search.value = (e.target as HTMLInputElement).value)}
        placeholder="搜索..."
      />
      <ul>
        {filtered.value.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
```
