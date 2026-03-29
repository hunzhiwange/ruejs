# 服务端渲染 (SSR) {#server-side-rendering-ssr}

## 概述 {#overview}

### 什么是 SSR？ {#what-is-ssr}

Rue 是一个用于构建客户端应用的框架。默认情况下，Rue 组件在浏览器中生成和操作 DOM 作为输出。然而，也可以将相同的组件在服务器上渲染成 HTML 字符串，直接发送到浏览器，最后在客户端将静态标记"激活"成完全交互式的应用。

服务端渲染的 Rue.js 应用也可以被认为是"同构的"或"通用的"，因为你的应用的大部分代码都在服务器**和**客户端上运行。

### 为什么使用 SSR？ {#why-ssr}

与客户端单页应用（SPA）相比，SSR 的优势主要在于：

- **更快的内容到达时间**：这在慢速互联网或慢速设备上更为明显。服务器渲染的标记不需要等到所有 JavaScript 都下载并执行后才显示，所以你的用户会更快地看到完全渲染的页面。此外，初始访问的数据获取在服务器端完成，这可能有比客户端更快的数据库连接。这通常会改善 [Core Web Vitals](https://web.dev/vitals/) 指标，提供更好的用户体验，对于内容到达时间直接与转化率相关的应用可能至关重要。

- **统一的心智模型**：你可以使用相同的语言和相同的声明式、面向组件的心智模型来开发整个应用，而不是在后台模板系统和前端框架之间来回切换。

- **更好的 SEO**：搜索引擎爬虫将直接看到完全渲染的页面。

  :::tip
  截至目前，Google 和 Bing 可以很好地索引同步 JavaScript 应用。同步是关键词。如果你的应用以加载动画开始，然后通过 Ajax 获取内容，爬虫不会等待你完成。这意味着如果你在 SEO 很重要的页面上异步获取内容，SSR 可能是必要的。
  :::

使用 SSR 也有一些权衡需要考虑：

- 开发限制。浏览器特定的代码只能在某些生命周期钩子中使用；一些外部库可能需要特殊处理才能在服务端渲染的应用中运行。

- 更复杂的构建设置和部署需求。与可以完全部署在任何静态文件服务器上的完全静态 SPA 不同，服务端渲染的应用需要一个可以运行 Node.js 服务器的环境。

- 更多的服务端负载。在 Node.js 中渲染完整的应用比仅仅提供静态文件更耗费 CPU，因此如果你预期高流量，请准备相应的服务器负载，并明智地采用缓存策略。

在为你的应用使用 SSR 之前，你应该问的第一个问题是你是否真的需要它。这主要取决于内容到达时间对你的应用有多重要。例如，如果你正在构建一个内部仪表板，初始加载多几百毫秒并不太重要，SSR 将是过度设计。然而，在内容到达时间绝对关键的情况下，SSR 可以帮助你实现最佳的初始加载性能。

### SSR vs SSG {#ssr-vs-ssg}

**静态站点生成（SSG）**，也称为预渲染，是另一种构建快速网站的流行技术。如果需要服务器渲染页面的数据对每个用户都相同，那么与其在每次请求到来时都渲染页面，不如只渲染一次，提前在构建过程中渲染。预渲染的页面作为静态 HTML 文件生成并提供。

SSG 保留了与 SSR 应用相同的性能特征：它提供出色的内容到达时间性能。同时，它比 SSR 应用更便宜、更容易部署，因为输出是静态 HTML 和资源。这里的关键词是**静态**：SSG 只能应用于提供静态数据的页面，即在构建时已知且不能在请求之间更改的数据。每次数据更改时，都需要新的部署。

如果你只是为了改善少数营销页面（例如 `/`、`/about`、`/contact` 等）的 SEO 而研究 SSR，那么你可能需要 SSG 而不是 SSR。SSG 也非常适合基于内容的网站，如文档站点或博客。事实上，你现在正在阅读的这个网站就是使用 [VitePress](https://vitepress.dev/) 静态生成的，这是一个 Rue 驱动的静态站点生成器。

## 基础教程 {#basic-tutorial}

### 渲染应用 {#rendering-an-app}

让我们来看一下最基础的 Rue SSR 示例。

1. 创建一个新目录并 `cd` 进入它
2. 运行 `npm init -y`
3. 在 `package.json` 中添加 `"type": "module"`，以便 Node.js 以 [ES 模块模式](https://nodejs.org/api/esm.html#modules-ecmascript-modules)运行。
4. 运行 `npm install @rue-js/rue rue-server`
5. 创建一个 `example.ts` 文件：

```ts
// 这在 Node.js 服务器上运行
import { createSSRApp, h } from '@rue-js/rue'
// Rue 的服务端渲染 API 暴露在 `rue-server-renderer` 下
import { renderToString } from 'rue-server-renderer'

const app = createSSRApp({
  data: () => ({ count: 1 }),
  render() {
    return h('button', { onClick: () => this.count++ }, this.count)
  },
})

renderToString(app).then(html => {
  console.log(html)
})
```

然后运行：

```sh
npx tsx example.ts
```

它应该打印以下内容到命令行：

```
<button>1</button>
```

[`renderToString()`](/api/ssr#rendertostring) 接收一个 Rue 应用实例并返回一个 Promise，该 Promise 解析为应用的渲染 HTML。也可以使用 [Node.js Stream API](https://nodejs.org/api/stream.html) 或 [Web Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API) 进行流式渲染。查看 [SSR API 参考](/api/ssr) 了解完整详情。

然后我们可以将 Rue SSR 代码移入服务器请求处理程序中，它将应用标记包装在完整的页面 HTML 中。我们将在接下来的步骤中使用 [`express`](https://expressjs.com/)：

- 运行 `npm install express`
- 创建以下 `server.ts` 文件：

```ts
import express from 'express'
import { createSSRApp, h } from '@rue-js/rue'
import { renderToString } from 'rue-server-renderer'

const server = express()

server.get('/', (req, res) => {
  const app = createSSRApp({
    data: () => ({ count: 1 }),
    render() {
      return h('button', { onClick: () => this.count++ }, this.count)
    },
  })

  renderToString(app).then(html => {
    res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Rue SSR Example</title>
      </head>
      <body>
        <div id="app">${html}</div>
        <script type="module" src="/client.js"></script>
      </body>
    </html>
    `)
  })
})

server.use(express.static('.'))

server.listen(3000, () => {
  console.log('服务器已就绪: http://localhost:3000')
})
```

最后，运行 `npx tsx server.ts` 并访问 `http://localhost:3000`。你应该能看到页面上的按钮在工作。

### 客户端激活 {#client-hydration}

如果你点击按钮，你会注意到数字没有变化。HTML 在客户端是完全静态的，因为我们没有在浏览器中加载 Rue。

为了使客户端应用具有交互性，Rue 需要执行**激活**步骤。在激活期间，它会创建与服务器上运行的相同的 Rue 应用，将每个组件与它应该控制的 DOM 节点匹配，并附加 DOM 事件监听器。

要在激活模式下挂载应用，我们需要使用 [`createSSRApp()`](/api/application#createssrapp) 而不是 `createApp()`：

```ts{2}
// 这在浏览器中运行
import { createSSRApp } from '@rue-js/rue'
import { createApp } from './app'

const app = createApp()

// 在客户端挂载 SSR 应用假定
// HTML 已被预渲染，将执行激活
// 而不是挂载新的 DOM 节点
app.mount('#app')
```

### 代码结构 {#code-structure}

注意我们需要重用服务器上相同的应用实现。这是我们需要开始在 SSR 应用中考虑代码结构的地方——我们如何在服务器和客户端之间共享相同的应用代码？

这里我们将演示最基础的设置。首先，让我们将应用创建逻辑拆分为一个专用文件 `app.ts`：

```ts [app.ts]
//（在服务器和客户端之间共享）
import { createSSRApp, h } from '@rue-js/rue'

export function createApp() {
  return createSSRApp({
    data: () => ({ count: 1 }),
    render() {
      return h('button', { onClick: () => this.count++ }, this.count)
    },
  })
}
```

这个文件及其依赖项在服务器和客户端之间共享——我们称它们为**通用代码**。在编写通用代码时，有一些事情需要注意，我们将在[下面讨论](#writing-ssr-friendly-code)。

我们的客户端入口导入通用代码，创建应用，并执行挂载：

```ts [client.ts]
import { createApp } from './app'

createApp().mount('#app')
```

服务器在请求处理程序中使用相同的应用创建逻辑：

```ts{2,5} [server.ts]
//（省略无关代码）
import { createApp } from './app'

server.get('/', (req, res) => {
  const app = createApp()
  renderToString(app).then(html => {
    // ...
  })
})
```

此外，为了在浏览器中加载客户端文件，我们还需要：

1. 通过添加 `server.use(express.static('.'))` 在 `server.ts` 中提供客户端文件。
2. 通过添加 `<script type="module" src="/client.js"></script>` 将客户端条目加载到 HTML shell 中。
3. 通过添加 [Import Map](https://github.com/WICG/import-maps) 到 HTML shell 来支持在浏览器中使用 `import * from '@rue-js/rue'` 这样的用法。

## 高级解决方案 {#higher-level-solutions}

从示例到生产就绪的 SSR 应用涉及更多。我们将需要：

- 支持 Rue SFC 和其他构建步骤需求。事实上，我们需要为同一个应用协调两个构建：一个用于客户端，一个用于服务器。

  :::tip
  用于 SSR 时，Rue 组件的编译方式不同——模板被编译成字符串连接而不是虚拟 DOM 渲染函数，以获得更高效的渲染性能。
  :::

- 在服务器请求处理程序中，用正确的客户端资源链接和最佳资源提示渲染 HTML。我们可能还需要在 SSR 和 SSG 模式之间切换，甚至在同一个应用中混合两者。

- 以通用方式管理路由、数据获取和状态管理存储。

完整的实现会相当复杂，取决于你选择的构建工具链。因此，我们强烈推荐使用高级、有主见的解决方案，为你抽象掉复杂性。下面我们将介绍 Rue 生态系统中一些推荐的 SSR 解决方案。

### Nuxt {#nuxt}

[Nuxt](https://nuxt.com/) 是一个构建在 Rue 生态系统之上的高级框架，为编写通用 Rue 应用提供了简化的开发体验。更好的是，你也可以将其用作静态站点生成器！我们强烈推荐尝试一下。

### Quasar {#quasar}

[Quasar](https://quasar.dev) 是一个完整的基于 Rue 的解决方案，允许你使用一个代码库针对 SPA、SSR、PWA、移动应用、桌面应用和浏览器扩展。它不仅处理构建设置，还提供一套完整的 Material Design 兼容 UI 组件。

### Vite SSR {#vite-ssr}

Vite 提供内置的 [Vue 服务端渲染支持](https://vitejs.dev/guide/ssr.html)，但它是故意低级的。如果你希望直接使用 Vite，请查看 [vite-plugin-ssr](https://vite-plugin-ssr.com/)，这是一个社区插件，为你抽象了许多具有挑战性的细节。

你还可以在[这里](https://github.com/vitejs/vite-plugin-vue/tree/main/playground/ssr-vue)找到一个使用手动设置的 Vue + Vite SSR 项目示例，这可以作为构建的基础。请注意，这仅推荐给你是 SSR/构建工具方面的专家，并且确实想完全控制高级架构时使用。

## 编写 SSR 友好的代码 {#writing-ssr-friendly-code}

无论你的构建设置或高级框架选择如何，有一些原则适用于所有 Rue SSR 应用。

### 服务器上的响应式 {#reactivity-on-the-server}

在 SSR 期间，每个请求 URL 都映射到我们应用的期望状态。没有用户交互和 DOM 更新，因此响应式在服务器上是不必要的。默认情况下，为了更好的性能，响应式在 SSR 期间被禁用。

### 组件生命周期钩子 {#component-lifecycle-hooks}

由于没有动态更新，生命周期钩子如 <span class="options-api">`mounted`</span><span class="composition-api">`onMounted`</span> 或 <span class="options-api">`updated`</span><span class="composition-api">`onUpdated`</span> 在 SSR 期间**不会**被调用，只会在客户端执行。<span class="options-api">在 SSR 期间唯一调用的钩子是 `beforeCreate` 和 `created`</span>

你应该避免在 <span class="options-api">`beforeCreate` 和 `created`</span><span class="composition-api">`setup()` 或 `<script setup>` 的根作用域</span> 中产生需要清理的副作用。这种副作用的一个例子是使用 `setInterval` 设置定时器。在仅客户端的代码中，我们可能会设置一个定时器，然后在 <span class="options-api">`beforeUnmount`</span><span class="composition-api">`onBeforeUnmount`</span> 或 <span class="options-api">`unmounted`</span><span class="composition-api">`onUnmounted`</span> 中将其销毁。然而，因为 unmount 钩子在 SSR 期间永远不会被调用，定时器将永远存在。为了避免这种情况，将你的副作用代码移到 <span class="options-api">`mounted`</span><span class="composition-api">`onMounted`</span> 中。

### 访问平台特定的 API {#access-to-platform-specific-apis}

通用代码不能假定可以访问平台特定的 API，因此如果你的代码直接使用仅浏览器全局对象如 `window` 或 `document`，它们在 Node.js 中执行时会抛出错误，反之亦然。

对于在服务器和客户端之间共享但使用不同平台 API 的任务，建议将平台特定的实现包装在通用 API 内，或使用为你执行此操作的库。例如，你可以使用 [`node-fetch`](https://github.com/node-fetch/node-fetch) 在服务器和客户端上使用相同的 fetch API。

对于仅浏览器的 API，常见的方法是在仅客户端生命周期钩子（如 <span class="options-api">`mounted`</span><span class="composition-api">`onMounted`</span>）中惰性地访问它们。

请注意，如果第三方库没有考虑通用使用，将其集成到服务端渲染的应用中可能会很棘手。你可能通过模拟一些全局对象来使其工作，但这会很 hacky，可能会干扰其他库的环境检测代码。

### 跨请求状态污染 {#cross-request-state-pollution}

在状态管理章节中，我们介绍了一个[使用响应式 API 的简单状态管理模式](state-management#simple-state-management-with-reactivity-api)。在 SSR 上下文中，这种模式需要一些额外的调整。

该模式在 JavaScript 模块的根作用域中声明共享状态。这使它们成为**单例**——即在整个应用的生命周期中只有一个响应式对象的实例。这在纯客户端 Rue 应用中按预期工作，因为我们应用中的模块在每次浏览器页面访问时都会重新初始化。

然而，在 SSR 上下文中，应用模块通常在服务器上只初始化一次，当服务器启动时。相同的模块实例将在多个服务器请求之间重用，我们的单例状态对象也将如此。如果我们用特定于一个用户的数据改变共享的单例状态，它可能会意外地泄漏到另一个用户的请求中。我们称之为**跨请求状态污染**。

从技术上讲，我们可以在每个请求上重新初始化所有 JavaScript 模块，就像我们在浏览器中所做的那样。然而，初始化 JavaScript 模块可能代价高昂，因此这会显著影响服务器性能。

推荐的解决方案是在每个请求上创建整个应用的新实例——包括路由器和全局存储——。然后，我们不是直接在组件中导入它，而是使用[应用级 provide](/guide/components/provide-inject#app-level-provide) 提供共享状态，并在需要它的组件中注入：

```ts [app.ts]
//（在服务器和客户端之间共享）
import { createSSRApp } from '@rue-js/rue'
import { createStore } from './store'

// 在每个请求上调用
export function createApp() {
  const app = createSSRApp(/* ... */)
  // 为每个请求创建 store 的新实例
  const store = createStore(/* ... */)
  // 在应用级提供 store
  app.provide('store', store)
  // 也为激活目的暴露 store
  return { app, store }
}
```

像 Pinia 这样的状态管理库在设计时就考虑到了这一点。有关更多详细信息，请查阅 [Pinia 的 SSR 指南](https://pinia.vuejs.org/ssr/)。

### 激活不匹配 {#hydration-mismatch}

如果预渲染 HTML 的 DOM 结构不匹配客户端应用的预期输出，就会出现激活不匹配错误。激活不匹配最常见的原因有：

1. 模板包含无效的 HTML 嵌套结构，渲染的 HTML 被浏览器的原生 HTML 解析行为"纠正"了。例如，一个常见的陷阱是 [`<div>` 不能放在 `<p>` 内](https://stackoverflow.com/questions/8397852/why-cant-the-p-tag-contain-a-div-tag-inside-it)：

   ```html
   <p><div>hi</div></p>
   ```

   如果我们在服务器渲染的 HTML 中生成这个，浏览器会在遇到 `<div>` 时终止第一个 `<p>`，并将其解析为以下 DOM 结构：

   ```html
   <p></p>
   <div>hi</div>
   <p></p>
   ```

2. 渲染期间使用的数据包含随机生成的值。由于相同的应用将运行两次——一次在服务器上，一次在客户端——随机值在两次运行之间不能保证相同。有两种方法可以避免随机值引起的不匹配：
   1. 使用 `v-if` + `onMounted` 仅在客户端渲染依赖于随机值的部分。你的框架也可能有内置功能使这更容易，例如 VitePress 中的 `<ClientOnly>` 组件。

   2. 使用支持使用种子生成的随机数生成器库，并保证服务器运行和客户端运行使用相同的种子（例如通过在序列化状态中包含种子并在客户端检索它）。

3. 服务器和客户端处于不同的时区。有时，我们可能想将时间戳转换为用户本地时间。然而，服务器运行期间的时区和客户端运行期间的时区并不总是相同的，在服务器运行期间我们可能无法可靠地知道用户的时区。在这种情况下，本地时间转换也应作为仅客户端的操作执行。

当 Rue 遇到激活不匹配时，它将尝试自动恢复并调整预渲染的 DOM 以匹配客户端状态。这会导致一些渲染性能损失，因为不正确的节点被丢弃并挂载新节点，但在大多数情况下，应用应该继续按预期工作。尽管如此，最好在开发期间消除激活不匹配。

#### 抑制激活不匹配 <sup class="vt-badge" data-text="3.5+" /> {#suppressing-hydration-mismatches}

在 Rue 3.5+ 中，可以使用 [`data-allow-mismatch`](/api/ssr#data-allow-mismatch) 属性选择性地抑制不可避免的激活不匹配。

### 自定义指令 {#custom-directives}

由于大多数自定义指令涉及直接 DOM 操作，它们在 SSR 期间被忽略。但是，如果你想指定自定义指令应该如何渲染（即它应该向渲染的元素添加什么属性），你可以使用 `getSSRProps` 指令钩子：

```ts
const myDirective = {
  mounted(el, binding) {
    // 客户端实现：
    // 直接更新 DOM
    el.id = binding.value
  },
  getSSRProps(binding) {
    // 服务端实现：
    // 返回要渲染的 props
    // getSSRProps 只接收指令绑定
    return {
      id: binding.value,
    }
  },
}
```

### Teleports {#teleports}

Teleports 在 SSR 期间需要特殊处理。如果渲染的应用包含 Teleports，被传送的内容不会成为渲染字符串的一部分。一个更简单的解决方案是在挂载时有条件地渲染 Teleport。

如果你确实需要激活被传送的内容，它们暴露在 ssr 上下文对象的 `teleports` 属性下：

```ts
const ctx = {}
const html = await renderToString(app, ctx)

console.log(ctx.teleports) // { '#teleported': 'teleported content' }
```

你需要将 teleport 标记注入到最终页面 HTML 的正确位置，类似于你需要注入主应用标记的方式。

:::tip
一起使用 Teleports 和 SSR 时避免定位 `body` ——通常，`<body>` 将包含其他服务器渲染的内容，这使得 Teleports 无法确定激活的正确起始位置。

相反，更喜欢使用专用容器，例如只包含被传送内容的 `<div id="teleported"></div>`。
:::
