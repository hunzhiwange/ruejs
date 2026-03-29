# 快速开始 {#quick-start}

## 在线体验 Rue {#try-rue-online}

- 如果想快速体验 Rue，你可以直接在[演练场](...)中尝试。

- 如果你更喜欢没有任何构建步骤的纯 HTML 设置，可以使用这个 [JSFiddle](...) 作为起点。

- 如果你已经熟悉 Node.js 和构建工具的概念，也可以在 [StackBlitz](...) 上直接在浏览器中尝试完整的构建配置。

- 要获取推荐设置的详细演示，请观看这个交互式教程，了解如何运行、编辑和部署你的第一个 Rue 应用。

## 创建 Rue 应用 {#creating-a-rue-application}

:::tip 前置条件

- 熟悉命令行
- 安装 [Node.js](https://nodejs.org/) 版本 `^20.19.0 || >=22.12.0`
  :::

在本节中，我们将介绍如何在本地机器上搭建一个 Rue [单页应用](/guide/extras/ways-of-using-rue#single-page-application-spa)。创建的项目将使用基于 [Vite](https://vitejs.dev) 的构建设置，并允许我们使用 JSX/TSX 编写组件。

确保你已安装最新版本的 [Node.js](https://nodejs.org/)，并且当前工作目录是你打算创建项目的目录。在命令行中运行以下命令（不带 `$` 符号）：

::: code-group

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

:::

此命令将安装并执行 `create-rue`，即官方的 Rue 项目脚手架工具。你将看到几个可选功能的提示，例如 TypeScript 和测试支持：

<div class="language-sh"><pre><code><span style="color:var(--vt-c-green);">✔</span> <span style="color:#A6ACCD;">项目名称: <span style="color:#888;">… <span style="color:#89DDFF;">&lt;</span><span style="color:#888;">your-project-name</span><span style="color:#89DDFF;">&gt;</span></span></span>
<span style="color:var(--vt-c-green);">✔</span> <span style="color:#A6ACCD;">添加 TypeScript? <span style="color:#888;">… <span style="color:#89DDFF;text-decoration:underline">No</span> / Yes</span></span>
<span style="color:var(--vt-c-green);">✔</span> <span style="color:#A6ACCD;">添加 Rue Router 用于单页应用开发? <span style="color:#888;">… <span style="color:#89DDFF;text-decoration:underline">No</span> / Yes</span></span>
<span style="color:var(--vt-c-green);">✔</span> <span style="color:#A6ACCD;">添加 Vitest 进行单元测试? <span style="color:#888;">… <span style="color:#89DDFF;text-decoration:underline">No</span> / Yes</span></span>
<span style="color:var(--vt-c-green);">✔</span> <span style="color:#A6ACCD;">添加端到端测试解决方案? <span style="color:#888;">… <span style="color:#89DDFF;text-decoration:underline">No</span> / Cypress / Nightwatch / Playwright</span></span>
<span style="color:var(--vt-c-green);">✔</span> <span style="color:#A6ACCD;">添加 ESLint 用于代码质量? <span style="color:#888;">… No / <span style="color:#89DDFF;text-decoration:underline">Yes</span></span></span>
<span style="color:var(--vt-c-green);">✔</span> <span style="color:#A6ACCD;">添加 Prettier 用于代码格式化? <span style="color:#888;">… <span style="color:#89DDFF;text-decoration:underline">No</span> / Yes</span></span>
<span></span>
<span style="color:#A6ACCD;">正在 ./<span style="color:#89DDFF;">&lt;</span><span style="color:#888;">your-project-name</span><span style="color:#89DDFF;">&gt;</span> 中搭建项目...</span>
<span style="color:#A6ACCD;">完成。</span></code></pre></div>

如果你不确定某个选项，现在只需按回车选择 `No`。项目创建完成后，按照说明安装依赖并启动开发服务器：

::: code-group

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

:::

现在你应该已经运行了你的第一个 Rue 项目！请注意，生成项目中的示例组件是使用 JSX/TSX 编写的。以下是一些额外的提示：

- 推荐的 IDE 配置是 [Visual Studio Code](https://code.visualstudio.com/) + [Rue 官方扩展](https://marketplace.visualstudio.com/items?itemName=rue.rue-official)。如果你使用其他编辑器，请查看 [IDE 支持部分](/guide/scaling-up/tooling#ide-support)。
- 更多工具细节，包括与后端框架的集成，在 [工具指南](/guide/scaling-up/tooling) 中讨论。
- 要了解有关底层构建工具 Vite 的更多信息，请查看 [Vite 文档](https://vitejs.dev)。
- 如果你选择使用 TypeScript，请查看 [TypeScript 使用指南](typescript/overview)。

当你准备将应用部署到生产环境时，运行以下命令：

::: code-group

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

:::

这将在项目的 `./dist` 目录中创建你的应用的生产就绪构建。查看[生产部署指南](/guide/best-practices/production-deployment)以了解有关将应用部署到生产环境的更多信息。

[下一步 >](#next-steps)

## 从 CDN 使用 Rue {#using-rue-from-cdn}

你可以通过 script 标签直接从 CDN 使用 Rue：

```html
<script src="https://unpkg.com/rue@latest/dist/rue.global.js"></script>
```

这里我们使用 [unpkg](https://unpkg.com/)，但你也可以使用任何提供 npm 包的 CDN，例如 [jsdelivr](https://www.jsdelivr.com/package/npm/rue) 或 [cdnjs](https://cdnjs.com/libraries/rue)。当然，你也可以下载此文件并自行托管。

当从 CDN 使用 Rue 时，不涉及"构建步骤"。这使得设置更加简单，适用于增强静态 HTML 或与后端框架集成。但是，你将无法使用完整的 JSX 语法，需要使用模板字符串或 DOM API。

### 使用全局构建 {#using-the-global-build}

上面的链接加载了 Rue 的*全局构建*，其中所有顶级 API 都作为全局 `Rue` 对象的属性暴露。以下是使用全局构建的完整示例：

```html
<script src="https://unpkg.com/rue@latest/dist/rue.global.js"></script>

<div id="app"></div>

<script>
  const { createElement, render, ref } = Rue

  const App = () => {
    const count = ref(0)

    const button = document.createElement('button')
    button.textContent = `计数：${count.value}`
    button.onclick = () => {
      count.value++
      button.textContent = `计数：${count.value}`
    }

    return button
  }

  render(App(), document.getElementById('app'))
</script>
```

[CodePen 演示 >](...)

### 使用 ES 模块构建 {#using-the-es-module-build}

在文档的其余部分，我们将主要使用 [ES 模块](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) 语法。大多数现代浏览器现在原生支持 ES 模块，因此我们可以像这样通过 CDN 使用 Rue：

```html{3,4}
<div id="app"></div>

<script type="module">
  import { createElement, render, ref } from 'https://unpkg.com/rue@latest/dist/rue.esm-browser.js'

  const App = () => {
    const count = ref(0)

    const button = document.createElement('button')
    button.textContent = `计数：${count.value}`
    button.onclick = () => {
      count.value++
      button.textContent = `计数：${count.value}`
    }

    return button
  }

  render(App(), document.getElementById('app'))
</script>
```

请注意，我们使用的是 `<script type="module">`，并且导入的 CDN URL 指向 Rue 的 **ES 模块构建**版本。

[CodePen 演示 >](...)

### 启用 Import Maps {#enabling-import-maps}

在上面的示例中，我们是从完整的 CDN URL 导入的，但在文档的其余部分，你将看到像这样的代码：

```js
import { ref } from 'rue-js'
```

我们可以使用 [Import Maps](https://caniuse.com/import-maps) 告诉浏览器在哪里找到 `rue-js` 导入：

```html{1-7,12}
<script type="importmap">
  {
    "imports": {
      "rue-js": "https://unpkg.com/rue@latest/dist/rue.esm-browser.js"
    }
  }
</script>

<div id="app"></div>

<script type="module">
  import { ref, render } from 'rue-js'

  const App = () => {
    const count = ref(0)
    const div = document.createElement('div')
    div.textContent = `计数：${count.value}`
    return div
  }

  render(App(), document.getElementById('app'))
</script>
```

你还可以为其他依赖项添加到 import map 中——但请确保它们指向你打算使用的库的 ES 模块版本。

:::tip Import Maps 浏览器支持
Import Maps 是一个相对较新的浏览器功能。请确保使用在[支持范围](https://caniuse.com/import-maps)内的浏览器。特别是，它仅在 Safari 16.4+ 中受支持。
:::

:::warning 生产使用注意事项
到目前为止的示例使用的是 Rue 的开发构建版本——如果你打算在生产环境中从 CDN 使用 Rue，请务必查看[生产部署指南](/guide/best-practices/production-deployment#without-build-tools)。

虽然可以在没有构建系统的情况下使用 Rue，但另一种可以考虑的方法是使用轻量级替代方案，这可能更适合需要使用 jQuery（过去）或 Alpine.js（现在）的场景。
:::

### 拆分模块 {#splitting-up-the-modules}

随着我们深入了解指南，我们可能需要将代码拆分成单独的 JavaScript 文件以便更好地管理。例如：

```html [index.html]
<div id="app"></div>

<script type="module">
  import { render } from 'rue-js'
  import App from './app.js'

  render(App(), document.getElementById('app'))
</script>
```

```js [app.js]
import { ref } from 'rue-js'

export default function App() {
  const count = ref(0)

  const div = document.createElement('div')
  div.textContent = `计数：${count.value}`

  // 在实际应用中，你需要设置响应式更新
  return div
}
```

如果你直接在浏览器中打开上述 `index.html`，你会发现它会抛出错误，因为 ES 模块无法在 `file://` 协议上工作，这是浏览器打开本地文件时使用的协议。

出于安全原因，ES 模块只能在 `http://` 协议上工作，这是浏览器打开网页时使用的协议。为了让 ES 模块在我们的本地机器上工作，我们需要通过本地 HTTP 服务器在 `http://` 协议上提供 `index.html`。

要启动本地 HTTP 服务器，首先确保你已安装 [Node.js](https://nodejs.org/en/)，然后在 HTML 文件所在的目录中从命令行运行 `npx serve`。你也可以使用任何其他能够提供具有正确 MIME 类型的静态文件的 HTTP 服务器。

## 下一步 {#next-steps}

如果你跳过了[简介](/guide/introduction)，我们强烈建议在继续阅读文档的其余部分之前先阅读它。

<div class="vt-box-container next-steps">
  <a class="vt-box" href="/guide/essentials/application.html">
    <p class="next-steps-link">继续阅读指南</p>
    <p class="next-steps-caption">指南详细讲解框架的每个方面。</p>
  </a>
  <a class="vt-box" href="/tutorial/">
    <p class="next-steps-link">尝试教程</p>
    <p class="next-steps-caption">适合喜欢动手实践的人。</p>
  </a>
  <a class="vt-box" href="/examples/">
    <p class="next-steps-link">查看示例</p>
    <p class="next-steps-caption">探索核心功能和常见 UI 任务的示例。</p>
  </a>
</div>
