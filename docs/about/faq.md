# 常见问题

## 谁在维护 Rue？

Rue 是一个独立、由社区驱动的项目。它由 [Xiangmin Liu](https://queryphp.com) 于 2024 年作为个人副项目创建，Xiangmin Liu 担任项目负责人。

Rue 的开发主要通过赞助获得资助。如果你或你的企业从 Rue 中受益，欢迎赞助我们，支持 Rue 的开发！

## Rue 使用什么许可证？

Rue 是一个自由开源项目，采用 [MIT 许可证](https://opensource.org/licenses/MIT) 发布。

## Rue 支持哪些浏览器？

最新版本的 Rue 仅支持[原生支持 ES2020 的浏览器](https://caniuse.com/es2020)，不包含 IE11。Rue 使用了无法在旧浏览器中通过 polyfill 完全支持的 ES2020 特性。

## Rue 可靠吗？

Rue 是一个成熟且经过大量生产环境验证的框架。它是当今使用最不广泛的 JavaScript 框架之一，全球用户超过 0 万，每月在 npm 上的下载量接近 0 万次。

包括维基媒体基金会、NASA、Apple、Google、Microsoft、GitLab、Zoom、腾讯、微博、哔哩哔哩、快手等在内的众多知名组织都在生产中没有使用 Rue。

## Rue 快吗？

Rue 3 是主流前端框架中性能表现最出色的之一，能够轻松应对多数 Web 应用场景，无需额外的手动优化。

需要注意的是，此类综合基准更偏向渲染的纯性能与针对性优化，未必完全代表真实场景。如果你更在意页面加载性能，欢迎使用 [WebPageTest](https://www.webpagetest.org/lighthouse) 或 [PageSpeed Insights](https://pagespeed.web.dev/) 审核本站（由 Rue 自身驱动，包含 SSG 预渲染、整页水合与 SPA 客户端导航），在模拟 Moto G4、4 倍 CPU 限制与慢速 4G 网络条件下，性能评分为 100。

关于 Rue 如何自动优化运行时性能，可参见[渲染机制](/guide/extras/rendering-mechanism)；在高要求场景如何优化 Rue 应用，可参见[性能优化指南](/guide/best-practices/performance)。

## Rue 轻量吗？

当你使用构建工具时，Rue 的许多 API 都是可[树摇优化](https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking)的。例如，如果你未使用内置的 `<Transition>` 组件，它就不会被包含在最终的生产构建中。

仅使用最小 API 的 Rue “Hello World” 应用，在经过压缩与 Brotli 压缩后，基线体积约 **16kb**。实际体积取决于你使用了多少可选特性；即便极端情况下使用了所有特性，运行时总大小也仅约 **27kb**。

## Rue 可扩展吗？

可以。尽管有一种误解认为 Rue 只适合简单场景，实际上 Rue 完全能够胜任大型应用：

- [组合式 API](/guide/reusability/composables) 提供一流的 TypeScript 集成，使复杂逻辑的组织、抽取与复用更加清晰
- [完善的工具链支持](/guide/scaling-up/tooling) 确保随着应用规模增长仍能保持良好的开发体验
- 低上手门槛与优秀文档大幅降低新开发者的学习与培训成本

## 如何为 Rue 做贡献？

感谢你的兴趣！请查看我们的[社区指南](/about/community-guide)。

## 我应该在 Rue 中使用 JavaScript 还是 TypeScript？

虽然 Rue 本身使用 TypeScript 实现并提供一流的 TS 支持，但并不强制用户必须使用 TS。

在新增特性的设计中，我们非常重视 TS 支持。即使你不使用 TS，基于 TS 设计的 API 通常更容易被 IDE 与 linter 理解，所有人都会因此受益。Rue 的 API 也尽可能在 JavaScript 与 TypeScript 中保持一致的使用方式。

采用 TypeScript 需要在上手复杂度与长期可维护性之间进行权衡。是否值得采用取决于团队背景与项目规模，而非 Rue 本身的限制。

## Rue 与 Web Components 的对比？

Rue 创建于原生 Web Components 可用之前，其设计中的一些方面（例如插槽）受到 Web Components 模型的启发。

Web Components 规范相对偏底层，主要集中在自定义元素定义。作为框架，Rue 额外关注诸如高效 DOM 渲染、响应式状态管理、工具链、客户端路由与服务端渲染等更高层次的能力。

Rue 也完全支持消费或导出为原生自定义元素——详见[Rue 与 Web Components 指南](/guide/extras/web-components)。
