# 性能 (Performance) {#performance}

## 概述 (Overview) {#overview}

Rue 旨在在大多数常见用例中具有良好的性能，无需太多手动优化。然而，总有一些具有挑战性的场景需要额外的微调。在本节中，我们将讨论在 Rue 应用中需要注意的性能问题。

首先，让我们讨论 Web 性能的两个主要方面：

- **页面加载性能**：应用在初次访问时显示内容并成为交互式的速度。这通常使用 [Largest Contentful Paint (LCP)](https://web.dev/lcp/) 和 [Interaction to Next Paint](https://web.dev/articles/inp) 等 Web 核心指标来衡量。

- **更新性能**：应用响应用户输入更新的速度。例如，当用户在搜索框中输入时列表更新的速度，或当用户单击单页应用 (SPA) 中的导航链接时页面切换的速度。

虽然理想情况下两者都应最大化，但不同的前端架构往往会影响在这些方面获得所需性能的难易程度。此外，您正在构建的应用类型极大地影响您应该在性能方面优先考虑什么。因此，确保最佳性能的第一步是为您正在构建的应用类型选择正确的架构：

- 查阅 [使用 Rue 的方式](/guide/guide/extras/ways-of-using-rue) 了解如何以不同方式利用 Rue。

- Jason Miller 在 [应用原型](https://jasonformat.com/application-holotypes/) 中讨论了 Web 应用的类型及其各自的理想实现/交付方式。

## 性能分析选项 (Profiling Options) {#profiling-options}

要提高性能，我们首先需要知道如何衡量它。有许多优秀的工具可以帮助解决这个问题：

用于分析生产部署的加载性能：

- [PageSpeed Insights](https://pagespeed.web.dev/)
- [WebPageTest](https://www.webpagetest.org/)

用于分析本地开发期间的性能：

- [Chrome DevTools 性能面板](https://developer.chrome.com/docs/devtools/evaluate-performance/)
- Rue DevTools 扩展也提供性能分析功能。

## 全链路性能预算 (End-to-End Performance Budgets) {#end-to-end-performance-budgets}

Rue 将列表结构、CPU、内存、生产体积和首屏采样分成两层预算验证。结构与产物来源先由确定性测试和 size audit 检查；随后在同一台机器、同一个 Chromium 版本和同一轮运行窗口中，将 Rue 与 Vue 对照实现一起采样。机器计时不能跨机器直接比较，历史基线用于发现漂移，同轮 Vue 用于发布门禁；两者不能互相替代。

体积报告区分静态零 Rue 值依赖、compiled core 和完整 Vapor 入口。compiled core 的预算不是应用包大小承诺：真实应用还包含业务代码、第三方依赖和所用复杂能力；同样，“静态零运行时”也不适用于包含 Signal、组件、路由或 Hydration 的页面。

标准 keyed 列表行只有在编译器能证明它是同步、原生、单根 DOM 行，并且 class、文本和属性绑定可生成局部 patch 时，才进入 compiled keyed core。相等值不会重复写 DOM，简单行也不会带入通用 Vapor 列表 helper。

组件行、多根行、异步或不透明 renderable、结构指令、需要逐行 ref/生命周期所有权的内容，以及 Hydration 无法安全采用的形状，会保留 range/owner fallback。fallback 以语义完整性为优先，不应为了命中性能预算而改写成手工 DOM benchmark 特例。应用代码若把外部依赖隐藏在普通成员调用中，编译器同样会选择 fallback；可证明安全的直接 Signal 读取才能进入 compiled binding 或 keyed reconcile。

从仓库根目录复现完整检查：

```bash
pnpm exec vitest run --project unit scripts/__tests__/js-framework-performance.spec.ts scripts/__tests__/runtime-size-audit.spec.ts
pnpm run size-runtime -- --check
pnpm run benchmark:js-framework -- --compare scripts/js-framework-performance-baseline.json --budget scripts/js-framework-performance-budget.json --output temp/performance/final.json
```

浏览器命令会先重建 workspace 的 Rue 与 runtime TypeScript 产物，验证版本、workspace 解析路径、lockfile 与构建产物 SHA-256 在采样前后保持一致，然后运行预热和多轮有效采样。报告中的 `results.rue`、`results.rue-signal` 和 `results.vue` 分别代表 Rue ref、Rue native signal 和 Vue 等价实现；`budget.entries` 给出尺寸、CPU、select/swap、heap 与 first-paint 比率。`validSamples` 必须满足预算中的最小样本数，缺失 Vue、版本、hash 或样本都会使命令非零退出。

`pnpm run size-runtime -- --check` 单独审计发布入口的模块图和 JavaScript 压缩体积。静态 preset 不得出现 Rue 值模块；compiled preset 只允许最小响应式、owner、selector、DOM 和键控列表核心，不得包含 facade、`js-runtime`、默认 runtime、SSR renderer 或通用 Vapor helper。`scripts/runtime-size-baseline.json` 是可审查的当前产物记录，真正判定超限的是独立的 `scripts/runtime-size-budget.json`，因此更新 baseline 不会自动放宽预算。

## 页面加载优化 (Page Load Optimizations) {#page-load-optimizations}

有许多与框架无关的方面可以优化页面加载性能 - 查看 [此 web.dev 指南](https://web.dev/fast/) 以获取全面的总结。在这里，我们将主要关注 Rue 特定的技术。

如果您的主应用必须是 SPA，但有营销页面（落地页、关于、博客），请将它们分开部署！您的营销页面最好使用 SSG 部署为具有最少 JS 的静态 HTML。

### 包大小和 Tree-shaking (Bundle Size and Tree-shaking) {#bundle-size-and-tree-shaking}

提高页面加载性能的最有效方法之一是提供更小的 JavaScript 包。以下是使用 Rue 时减小包大小的一些方法：

- 如果可能，请使用构建步骤。
  - 构建插件会自动选择静态 DOM、compiled core 或 Vapor fallback。应用代码继续从 `@rue-js/rue` 导入；除非在开发编译器或底层集成，不要手工依赖生成 helper。

  - 纯静态 JSX 可以不包含 Rue 值运行时；Signal 页面只加载它实际使用的 compiled core。组件、路由、Hydration、Transition 等复杂能力会按需增加对应代码。
  - 如果通过现代构建工具打包，Rue 的许多 API 都是 "可 tree-shake 的"。例如，如果您不使用内置的 `<Transition>` 组件，它不会包含在最终的生产包中。Tree-shaking 还可以移除源代码中未使用的其他模块。

  - 使用构建步骤时，模板会被预编译，因此我们不需要将 Rue 编译器发送到浏览器。这节省了 **14kb** min+gzipped 的 JavaScript 并避免了运行时编译成本。

- 引入新依赖时要注意大小！在实际应用中，臃肿的包通常是由于在不知情的情况下引入了重型依赖项造成的。
  - 如果使用构建步骤，请优先选择提供 ES 模块格式且支持 tree-shaking 的依赖项。例如，优先选择 `lodash-es` 而不是 `lodash`。

  - 检查依赖项的大小并评估它提供的功能是否值得。请注意，如果依赖项支持 tree-shaking，实际大小增加将取决于您实际从中导入的 API。像 [bundlejs.com](https://bundlejs.com/) 这样的工具可用于快速检查，但使用实际构建设置进行测量总是最准确的。

### 代码分割 (Code Splitting) {#code-splitting}

代码分割是构建工具将应用包分割成多个较小的块，然后可以按需或并行加载的过程。通过适当的代码分割，页面加载时所需的功能可以立即下载，额外的块只在需要时懒加载，从而提高性能。

像 Rollup（Vite 基于此）或 webpack 这样的打包工具可以通过检测 ESM 动态导入语法自动创建分割块：

```js
// lazy.js 及其依赖项将被分割成单独的块
// 并且只在调用 `loadLazy()` 时加载。
function loadLazy() {
  return import('./lazy.js')
}
```

懒加载最好用于初始页面加载后不需要立即使用的功能。在 Rue 应用中，这可以与 Rue 的 [异步组件](/guide/guide/components/async) 功能结合使用，为组件树创建分割块：

```tsx
import { lazy } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

// 为 Foo.tsx 及其依赖项创建一个单独的块。
// 它只在异步组件在页面上渲染时按需获取。
const Foo = lazy(() => import('./Foo'))

const App: FC = () => {
  return (
    <div>
      <Foo />
    </div>
  )
}
```

对于使用 Rue Router 的应用，强烈建议对路由组件使用懒加载。Rue Router 对懒加载有显式支持，与 `lazy` 分开。

### 用客户端岛减少首屏 JavaScript {#client-islands}

对于以内容为主、只有局部交互的页面，优先使用[客户端岛屿](/guide/guide/extras/islands)，而不是加载完整 SPA 入口。无 `client:*` 的页面会保持零 Rue JS；有岛的页面只加载小型启动器，并在对应策略触发时下载组件 chunk。需要完整客户端路由和全局状态的页面再显式选择 `meta.clientMode: 'app'`。

主题初始化、埋点等业务内联脚本不由岛资源模式管理。应让它们保持独立、短小，并避免把应用主入口伪装成普通用户脚本来绕过资源所有权判断。

## 更新优化 (Update Optimizations) {#update-optimizations}

### Props 稳定性 (Props Stability) {#props-stability}

在 Rue 中，子组件只有在接收到的至少一个 props 发生变化时才会更新。考虑以下示例：

```tsx
// 不理想的方式
list.map(item => <ListItem key={item.id} id={item.id} activeId={activeId} />)
```

在 `<ListItem>` 组件内部，它使用其 `id` 和 `activeId` props 来确定它是否是当前活动项。虽然这可行，但问题是每当 `activeId` 变化时，列表中的 **每个** `<ListItem>` 都必须更新！

理想情况下，只有活动状态发生变化的项才应该更新。我们可以通过将活动状态计算移到父组件中，并让 `<ListItem>` 直接接受 `active` prop 来实现：

```tsx
// 更好的方式
list.map(item => <ListItem key={item.id} id={item.id} active={item.id === activeId} />)
```

现在，对于大多数组件，当 `activeId` 变化时，`active` prop 将保持不变，因此它们不再需要更新。一般来说，想法是保持传递给子组件的 props 尽可能稳定。

### 使用 `memo` 优化 (Using memo) {#using-memo}

Rue 提供了 `memo` 工具来帮助跳过 props 未变化时的组件更新：

```tsx
import { memo } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const ExpensiveComponent: FC<{ data: Data }> = memo(({ data }) => {
  return <div>{/* 昂贵的渲染 */}</div>
})
```

### 计算稳定性 (Computed Stability) {#computed-stability}

派生值应使用 `computed` 表达。Rue 会自动追踪计算过程中读取的响应式依赖，并在依赖变化后按需重新计算：

```tsx
import { computed, ref, watch } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const MyComponent: FC = () => {
  const count = ref(0)
  const isEven = computed(() => count.value % 2 === 0)

  watch(isEven, value => {
    console.log(value)
  })

  return <button onClick={() => count.value++}>{count.value}</button>
}
```

对于非常便宜、只在一个位置使用的派生值，也可以直接写成普通表达式，让意图保持清晰：

```tsx
const isEven = count.value % 2 === 0
```

如果派生计算会创建对象，请只在确实需要这个对象时创建它，并优先让下游读取所需的标量字段。不要为了保持对象引用稳定而引入手动依赖数组。

## 一般优化 (General Optimizations) {#general-optimizations}

> 以下提示影响页面加载和更新性能。

### 虚拟化大型列表 (Virtualize Large Lists) {#virtualize-large-lists}

所有前端应用中最常见的性能问题之一是渲染大型列表。无论框架多么高性能，渲染包含数千个项目的列表 **都会** 很慢，因为浏览器需要处理大量的 DOM 节点。

然而，我们不一定需要预先渲染所有这些节点。在大多数情况下，用户的屏幕大小只能显示我们大型列表的一小部分。我们可以通过 **列表虚拟化** 大大提高性能，该技术只渲染大型列表中当前在视口内或靠近视口的项目。

实现列表虚拟化并不容易，幸运的是有现有的社区库可以直接使用：

- [react-window](https://github.com/bvaughn/react-window)
- [react-virtualized](https://github.com/bvaughn/react-virtualized)
- [@tanstack/react-virtual](https://tanstack.com/virtual/latest)

### 减少大型不可变结构的响应式开销 (Reduce Reactivity Overhead for Large Immutable Structures) {#reduce-reactivity-overhead-for-large-immutable-structures}

Rue 使用无代理 Signal 和路径依赖图。热点读取优先选择具体路径，避免为了读取一个标量而复制整个对象或枚举所有键。

```ts
import { signal, computed } from '@rue-js/rue'
const state = signal({ user: { name: 'Rue' }, visits: 0 })
const name = computed(() => state.getPath('user.name'))
state.updatePath('visits', n => Number(n) + 1)
```

模块级大型不可变数据可以通过 `set(next)` 替换根值；需要细粒度更新时使用路径 API。编译 `useState` 支持可追踪的原生数组变异，不应把它当成只能替换根值的浅层容器。

将状态交给第三方库时显式创建快照，处理完成后写回。不要依赖第三方库对普通对象的原地修改触发界面，也不要为了绕过 `state-escape` 诊断关闭严格编译。

### 避免不必要的组件抽象 (Avoid Unnecessary Component Abstractions) {#avoid-unnecessary-component-abstractions}

有时我们可能会创建 [无渲染组件](/guide/guide/components/slots#renderless-components) 或高阶组件（即使用额外 props 渲染其他组件的组件）以获得更好的抽象或代码组织。虽然这没有错，但请记住，组件实例比纯 DOM 节点昂贵得多，由于抽象模式创建太多组件实例会产生性能成本。

请注意，只减少几个实例不会有明显的效果，所以如果组件在应用中只渲染几次，请不要担心。考虑这种优化的最佳场景再次是大型列表。想象一下 100 个项目的列表，其中每个项目组件包含许多子组件。在这里删除一个不必要的组件抽象可能会导致数百个组件实例的减少。

## Rue 特定的性能提示 (Rue-Specific Performance Tips) {#rue-specific-performance-tips}

### 使用 `key` 属性 (Using the `key` Attribute) {#using-the-key-attribute}

在渲染列表时，始终使用稳定且唯一的 `key` 属性：

```tsx
// 好的做法
items.map(item => <div key={item.id}>{item.name}</div>)

// 避免 - 使用索引作为 key 可能导致性能问题
items.map((item, index) => <div key={index}>{item.name}</div>)
```

### 延迟加载非关键组件 (Lazy Load Non-Critical Components) {#lazy-load-non-critical-components}

对于不需要立即显示的组件，使用 `lazy` 进行延迟加载：

```tsx
import { lazy, Suspense } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const HeavyComponent = lazy(() => import('./HeavyComponent'))

const App: FC = () => {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <HeavyComponent />
    </Suspense>
  )
}
```

### 优化事件处理程序 (Optimize Event Handlers) {#optimize-event-handlers}

Rue 组件的初始化逻辑通常只执行一次，因此事件处理程序可以直接声明。让处理程序闭包读取响应式状态即可：

```tsx
import { memo, ref } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const Parent: FC = () => {
  const count = ref(0)

  const handleClick = () => {
    count.value++
  }

  return <Child onClick={handleClick} />
}

const Child: FC<{ onClick: () => void }> = memo(({ onClick }) => {
  return <button onClick={onClick}>点击</button>
})
```
