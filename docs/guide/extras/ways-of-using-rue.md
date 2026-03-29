# 使用 Rue 的方式 {#ways-of-using-rue}

我们相信网络没有"一刀切"的故事。这就是为什么 Rue 被设计为灵活且可逐步采用的。根据你的用例，Rue 可以以不同的方式使用，以在技术栈复杂性、开发者体验和最终性能之间取得最佳平衡。

## 独立脚本 {#standalone-script}

Rue 可以用作独立脚本文件——无需构建步骤！如果你已经有后端框架渲染大部分 HTML，或者你的前端逻辑不足以证明构建步骤的合理性，这是将 Rue 集成到你的技术栈中最简单的方法。你可以将 Rue 视为 jQuery 的更具声明性的替代品。

我们之前提供了一个名为 [petite-rue](https://github.com/rue-jsjs/petite-rue) 的替代发行版，专门针对渐进式增强现有 HTML 进行了优化。然而，petite-rue 不再积极维护，最后一个版本发布于 Rue 3.2.27。

## 嵌入式 Web 组件 {#embedded-web-components}

你可以使用 Rue 来[构建标准 Web 组件](/guide/extras/web-components)，这些组件可以嵌入到任何 HTML 页面中，无论它们是如何渲染的。这个选项允许你以完全与使用者无关的方式利用 Rue：生成的 web 组件可以嵌入到遗留应用程序、静态 HTML 中，甚至使用其他框架构建的应用程序中。

## 单页应用（SPA）{#single-page-application-spa}

一些应用程序需要丰富的前端交互性、深度会话和非平凡的状态逻辑。构建此类应用程序的最佳方式是使用 Rue 不仅控制整个页面，而且处理数据更新和导航而无需重新加载页面的架构。这种类型的应用程序通常被称为单页应用（SPA）。

Rue 提供了核心库和[全面的工具支持](/guide/scaling-up/tooling)，为构建现代 SPA 提供令人惊叹的开发者体验，包括：

- 客户端路由器
- 极速的构建工具链
- IDE 支持
- 浏览器开发者工具
- TypeScript 集成
- 测试工具

SPA 通常需要后端暴露 API 端点——但你也可以将 Rue 与 [Inertia.js](https://inertiajs.com) 等解决方案配对，在保留以服务器为中心的开发模型的同时获得 SPA 的好处。

## 全栈 / SSR {#fullstack-ssr}

纯客户端 SPA 在应用程序对 SEO 和首屏内容时间敏感时会有问题。这是因为浏览器将收到一个几乎为空的 HTML 页面，并且必须等到 JavaScript 加载后才能渲染任何内容。

Rue 提供了一流 API，用于在服务器上将 Rue 应用"渲染"为 HTML 字符串。这允许服务器发送已经渲染好的 HTML，让最终用户在 JavaScript 下载时立即看到内容。然后 Rue 将在客户端"水合"应用程序以使其具有交互性。这称为[服务器端渲染（SSR）](/guide/scaling-up/ssr)，它大大改善了 Core Web Vital 指标，如[最大内容绘制（LCP）](https://web.dev/lcp/)。

有一些基于这种范式构建的更高级别的 Rue 框架，如 [Nuxt](https://nuxt.com/)，允许你使用 Rue 和 JavaScript 开发全栈应用程序。

## JAMStack / SSG {#jamstack-ssg}

如果所需数据是静态的，可以提前进行服务器端渲染。这意味着我们可以将整个应用程序预渲染成 HTML 并作为静态文件提供。这提高了网站性能，并使部署变得更加简单，因为我们不再需要在每次请求时动态渲染页面。Rue 仍然可以水合此类应用程序以在客户端提供丰富的交互性。这种技术通常称为静态站点生成（SSG），也称为 [JAMStack](https://jamstack.org/what-is-jamstack/)。

SSG 有两种风格：单页和多页。两者都将站点预渲染为静态 HTML，区别在于：

- 在初始页面加载后，单页 SSG 将页面"水合"成 SPA。这需要更多的前期 JS 负载和水合成本，但后续导航会更快，因为它只需要部分更新页面内容而不是重新加载整个页面。

- 多页 SSG 在每次导航时加载一个新页面。好处是它可以提供最少的 JS——如果页面不需要交互，甚至可以完全不提供 JS！一些多页 SSG 框架，如 [Astro](https://astro.build/)，还支持"部分水合"——允许你使用 Rue 组件在静态 HTML 中创建交互式"岛屿"。

如果你期望有丰富的交互性、长会话或在导航之间持久化的元素/状态，单页 SSG 更合适。否则，多页 SSG 会是更好的选择。

Rue 团队还维护着一个名为 [VitePress](https://vitepress.dev/) 的静态站点生成器，它现在正为你提供这个网站！VitePress 支持两种 SSG 风格。[Nuxt](https://nuxt.com/) 也支持 SSG。你甚至可以在同一个 Nuxt 应用中为不同路由混合使用 SSR 和 SSG。

## 超越网络 {#beyond-the-web}

虽然 Rue 主要是为构建 Web 应用程序而设计的，但它绝不仅限于浏览器。你可以：

- 使用 [Electron](https://www.electronjs.org/) 或 [Wails](https://wails.io) 构建桌面应用程序
- 使用 [Ionic Rue](https://ionicframework.com/docs/rue/overview) 构建移动应用程序
- 使用 [Quasar](https://quasar.dev/) 或 [Tauri](https://tauri.app) 从同一代码库构建桌面和移动应用程序
- 使用 [TresJS](https://tresjs.org/) 构建 3D WebGL 体验
- 使用 Rue 的[自定义渲染器 API](/api/custom-renderer) 构建自定义渲染器，如[终端](https://github.com/rue-terminal/rue-termui)！
