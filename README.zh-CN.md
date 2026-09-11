# 后悔药 Rue.js

> The Compiler Framework For Native DOM

语言：[English](./README.md) | 简体中文

[![Website](https://img.shields.io/badge/website-ruejs.huododo.com-0f766e)](https://ruejs.huododo.com)
[![npm version](https://img.shields.io/npm/v/%40rue-js%2Frue.svg?style=flat)](https://www.npmjs.com/package/@rue-js/rue)
[![Build and Test](https://github.com/hunzhiwange/ruejs/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/hunzhiwange/ruejs/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Rue.js（发音 /ruː/，中文名后悔药.js）是一个面向 JSX/TSX 的轻量前端框架。它将 JSX 编译为原生 DOM 操作，通过 JavaScript 运行时提供细粒度响应式更新。

你可以使用熟悉的 JSX 语法编写界面，通过 `ref`、`reactive` 和 `computed` 管理状态，并按需接入路由、组件库和全栈应用工具。

## 特性

- **原生 DOM 编译**：通过 SWC 编译插件将 JSX 转换为 DOM 创建与更新代码
- **细粒度响应式**：由 JavaScript 运行时负责依赖追踪、调度与 DOM 更新
- **熟悉的开发体验**：支持 JSX/TSX 与 Vue 风格的响应式 API，无需额外模板语法
- **Vite 集成**：通过官方插件配置 JSX 编译与开发构建流程
- **配套生态**：提供官方路由、设计系统与组件库
- **全栈应用**：Text.js 提供文件系统路由、SSR、API 路由与 Cloudflare Workers 部署支持

## 快速开始

Rue 提供官方脚手架，也支持接入现有 Vite 项目。

### 创建新项目

前置条件：Node.js >= 22.22.0

```sh
pnpm create rue@latest
npm create rue@latest
bun create rue@latest
yarn dlx create-rue@latest
```

进入项目后安装依赖并启动开发服务器：

```sh
cd your-project-name
pnpm install
pnpm run dev
```

### 接入现有项目

```sh
pnpm add @rue-js/rue
pnpm add -D vite @rue-js/vite-plugin-rue
```

在 Vite 配置中通过编译器插件启用 Rue JSX：

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import Rue from '@rue-js/vite-plugin-rue'

export default defineConfig({
  plugins: [Rue()],
})
```

## 示例

下面是一个最小 Rue 应用示例：

```tsx
import { type FC, ref, useApp } from '@rue-js/rue'

const Counter: FC = () => {
  const count = ref(0)

  return <button onClick={() => count.value++}>点击次数：{count}</button>
}

useApp(Counter).mount('#app')
```

需要页面级路由时，先安装 `@rue-js/router`：

```sh
pnpm add @rue-js/router
```

```ts
import { useComponent } from '@rue-js/rue'
import { createRouter } from '@rue-js/router'

export default createRouter({
  history: 'hash',
  routes: [
    { path: '/', component: useComponent(() => import('./pages/Home')) },
    { path: '/about', component: useComponent(() => import('./pages/About')) },
  ],
})
```

## Text.js

Text.js 是 Rue 生态中的全栈应用框架。它基于 Vite、Rue、RSC 与文件系统路由，把 App Router、Pages Router、SSR、静态生成、API 路由、中间件和 Cloudflare Workers 部署整合成一条轻量开发路径。

它面向已经熟悉 Next.js 应用模型的开发者，同时保留 Rue 的 JSX / TSX 运行时与 Vite-first 工具链。常用 CLI 命令包括 `text dev`、`text build`、`text deploy`、`text typegen` 和 `text check`。

## 文档

- [介绍](./docs/intro.md)
- [安装](./docs/installation.md)
- [快速开始](./docs/getting-started.md)
- [路由](./docs/routing.md)
- [指南](./docs/guide)
- [API](./docs/api)

仓库中也包含可直接运行的文档站与示例页面，位于 [app](./app) 和 [app/pages](./app/pages) 下。

## 主要包

这是一个基于 pnpm workspace 的 monorepo，主要包包括：

- `@rue-js/rue`：框架核心与 JSX 入口
- `@rue-js/router`：官方路由
- `@rue-js/text`：Text.js 全栈应用框架与 CLI
- `@rue-js/runtime`：JavaScript 响应式与 DOM 渲染运行时
- `@rue-js/design`：设计系统与组件库
- `@rue-js/vite-plugin-rue`：Vite 集成
- `@rue-js/swc-plugin-rue`：基于 Rust 的 SWC 插件，用于构建时 JSX 编译

## 本地开发

本仓库使用 `pnpm` 管理依赖。

```sh
pnpm install
make dev
pnpm run app-dev
pnpm run app-build
pnpm run app-preview
pnpm run dev
```

常用命令：

```sh
pnpm run build
pnpm run test
pnpm run check
pnpm run release-check
```

### 使用本地开发版运行 js-framework-benchmark

当当前 Rue 版本尚未发布到 npm 时，可以把 workspace 中的本地包临时安装到
`js-framework-benchmark` 的 `rue-signal` 实现中：

```sh
pnpm benchmark:js-framework:install-local -- \
  ../js-framework-benchmark/frameworks/keyed/rue-signal
```

也可以传入 `rue-signal/package.json` 的绝对路径。该命令会构建 Rue 运行时和 SWC 编译插件，打包相关的 `@rue-js/*` workspace 包，以不写入
`package.json` 和 `package-lock.json` 的方式安装它们，并执行 `npm run build-prod`。

安装完成后，在 `js-framework-benchmark` 根目录启动服务器并运行单框架测试：

```sh
npm start
```

在另一个终端中运行：

```sh
npm run bench keyed/rue-signal
```

`rue-signal/package.json` 可以继续保留 npm 上已发布的版本。如果在该目录重新执行
`npm ci`，本地包会被正式版本替换，需要再次运行上述本地安装命令。

## 贡献

欢迎通过 Issue 和 Pull Request 参与 Rue 的开发。提交改动前，建议至少运行以下检查：

```sh
pnpm run check
pnpm run test
```

如果改动涉及构建、发布或编译器，请补充对应包级验证。

## 许可证

[MIT](./LICENSE)
