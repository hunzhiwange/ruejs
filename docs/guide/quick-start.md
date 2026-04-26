# 快速开始 {#quick-start}

## 创建 Rue 应用 {#creating-a-rue-application}

:::tip 前置条件

- 熟悉命令行
- 安装 [Node.js](https://nodejs.org/) 版本 >=22.12.0`
  :::

在本节中，我们将介绍如何在本地机器上搭建一个 Rue [单页应用](#/guide/extras/ways-of-using-rue#single-page-application-spa)。创建的项目将使用基于 [Vite](https://vitejs.dev) 的构建设置，并允许我们使用 JSX/TSX 编写组件。

确保你已安装最新版本的 [Node.js](https://nodejs.org/)，并且当前工作目录是你打算创建项目的目录。在命令行中运行以下命令（不带 `$` 符号）：

```sh [npm]
$ npm create rue@latest
```

```sh [pnpm]
$ pnpm create rue@latest
```

```sh [yarn]
# 对于 Yarn (v1+)
$ yarn create rue

# 对于 Yarn Modern (v2+)
$ yarn create rue@latest

# 对于 Yarn ^v4.11
$ yarn dlx create-rue@latest
```

```sh [bun]
$ bun create rue@latest
```

此命令将安装并执行 `create-rue`，即官方的 Rue 项目脚手架工具。你将看到几个可选功能的提示，例如 TypeScript 和测试支持：

<div class="language-sh"><pre><code><span style="color:var(--vt-c-green);">✔</span> <span style="color:#A6ACCD;">项目名称: <span style="color:#888;">… <span style="color:#89DDFF;">&lt;</span><span style="color:#888;">your-project-name</span><span style="color:#89DDFF;">&gt;</span></span></span>
<span style="color:#A6ACCD;">正在 ./<span style="color:#89DDFF;">&lt;</span><span style="color:#888;">your-project-name</span><span style="color:#89DDFF;">&gt;</span> 中搭建项目...</span>
<span style="color:#A6ACCD;">完成。</span></code></pre></div>

如果你不确定某个选项，现在只需按回车选择 `No`。项目创建完成后，按照说明安装依赖并启动开发服务器：

```sh-vue [npm]
$ cd {{'<your-project-name>'}}
$ npm install
$ npm run dev
```

```sh-vue [pnpm]
$ cd {{'<your-project-name>'}}
$ pnpm install
$ pnpm run dev
```

```sh-vue [yarn]
$ cd {{'<your-project-name>'}}
$ yarn
$ yarn dev
```

```sh-vue [bun]
$ cd {{'<your-project-name>'}}
$ bun install
$ bun run dev
```

现在你应该已经运行了你的第一个 Rue 项目！请注意，生成项目中的示例组件是使用 JSX/TSX 编写的。以下是一些额外的提示：

- 推荐的 IDE 配置是 [Visual Studio Code](https://code.visualstudio.com/)。如果你使用其他编辑器，请查看 [IDE 支持部分](#/page/guide/scaling-up/tooling)。
- 更多工具细节，包括与后端框架的集成，在 [工具指南](#/page/guide/scaling-up/tooling) 中讨论。
- 要了解有关底层构建工具 Vite 的更多信息，请查看 [Vite 文档](https://vitejs.dev)。
- 如果你选择使用 TypeScript，请查看 [TypeScript 使用指南](#/guide/guide/typescript/overview)。

当你准备将应用部署到生产环境时，运行以下命令：

```sh [npm]
$ npm run build
```

```sh [pnpm]
$ pnpm run build
```

```sh [yarn]
$ yarn build
```

```sh [bun]
$ bun run build
```

这将在项目的 `./dist` 目录中创建你的应用的生产就绪构建。查看[生产部署指南](##/guide/guide/best-practices/production-deployment)以了解有关将应用部署到生产环境的更多信息。

如果你直接在浏览器中打开上述 `index.html`，你会发现它会抛出错误，因为 ES 模块无法在 `file://` 协议上工作，这是浏览器打开本地文件时使用的协议。

出于安全原因，ES 模块只能在 `http://` 协议上工作，这是浏览器打开网页时使用的协议。为了让 ES 模块在我们的本地机器上工作，我们需要通过本地 HTTP 服务器在 `http://` 协议上提供 `index.html`。

要启动本地 HTTP 服务器，首先确保你已安装 [Node.js](https://nodejs.org/en/)，然后在 HTML 文件所在的目录中从命令行运行 `npx serve`。你也可以使用任何其他能够提供具有正确 MIME 类型的静态文件的 HTTP 服务器。

## 下一步 {#next-steps}

如果你跳过了[简介](#快速开始-quick-start/guide/introduction)，我们强烈建议在继续阅读文档的其余部分之前先阅读它。

<div class="vt-box-container next-steps">
  <a class="vt-box" href="#/guide/essentials/application.html">
    <p class="next-steps-link">继续阅读指南</p>
    <p class="next-steps-caption">指南详细讲解框架的每个方面。</p>
  </a>
  <a class="vt-box" href="#/examples/hello-world/">
    <p class="next-steps-link">查看示例</p>
    <p class="next-steps-caption">探索核心功能和常见 UI 任务的示例。</p>
  </a>
</div>
