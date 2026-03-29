# 工具链

## 在线体验

如果你只是想快速试用 Rue 组件与 SFC 语法，无需在本机安装复杂环境。你可以：

- 使用任意在线 Vite 沙盒（如 StackBlitz / CodeSandbox），安装 Rue 相关依赖后即可运行
- 在本仓库构建示例 SFC Playground 并本地打开

本地构建并预览：

```sh [pnpm]
$ pnpm run build-sfc-playground
$ pnpm serve
```

在线沙盒适合快速复现与问题报告；复杂场景建议使用本地 Vite 环境。

## 项目搭建

### Vite

[Vite](https://vitejs.dev/) 是轻量快速的构建与开发服务器，Rue 通过官方插件无缝集成，能在保存后立即反馈。

使用 Vite 创建新项目，并接入 Rue：

```sh [npm]
$ npm create vite@latest my-rue-app -- --template vanilla-ts
$ cd my-rue-app
$ npm i @rue-js/runtime @rue-js/vite-plugin-rue
```

```sh [pnpm]
$ pnpm create vite@latest my-rue-app -- --template vanilla-ts
$ cd my-rue-app
$ pnpm add @rue-js/runtime @rue-js/vite-plugin-rue
```

```sh [yarn]
$ yarn create vite my-rue-app --template vanilla-ts
$ cd my-rue-app
$ yarn add @rue-js/runtime @rue-js/vite-plugin-rue
```

```sh [bun]
$ bun create vite my-rue-app --template vanilla-ts
$ cd my-rue-app
$ bun add @rue-js/runtime @rue-js/vite-plugin-rue
```

在 `vite.config.ts` 中启用 Rue 插件：

```ts
import { defineConfig } from 'vite'
import rue from '@rue-js/vite-plugin-rue'

export default defineConfig({
  plugins: [rue()],
})
```

- 了解 Vite：参见 [Vite 文档](https://vitejs.dev)
- Rue 的编译与指令由 `@rue-js/vite-plugin-rue` 负责集成与优化

在线沙盒通常支持将项目打包为 Vite 工程下载。

## IDE 支持

- 推荐使用 [VS Code](https://code.visualstudio.com/)，配合 TypeScript 与 Vite 插件获得语法高亮与提示
- WebStorm、Neovim 等同样可通过 LSP 获得良好体验
- Rue 不需要专用 Rue 扩展，采用常规 TS/JS 能力就可以满足开发需求

## 浏览器调试

- 使用浏览器 DevTools 观察组件更新的 DOM 变化与事件
- 借助 Performance 面板分析渲染时序与热区
- 配合覆盖率报告定位无效代码路径

## TypeScript

- Rue 原生支持 TS，推荐在 CI 中执行类型检查
- 在本仓库可使用脚本进行类型检查：

```sh [pnpm]
$ pnpm check
```

## 测试

- 单元与组件测试使用 [Vitest](https://vitest.dev/)，与 Vite 深度整合
- 运行方式：

```sh [全部]
$ pnpm test
```

```sh [单元测试]
$ pnpm test-unit
```

```sh [覆盖率]
$ pnpm test-coverage
```

如需端到端测试，可结合 Cypress；Rue 与 Vite 的构建产物便于在真实环境下验证。

## 代码质量

Rue 推荐使用快速现代的静态检查工具：

- 使用 `oxlint` 进行代码检查
- 配合 `simple-git-hooks` 与 `lint-staged` 在提交前自动处理改动

在本仓库的相关脚本：

```sh [检查]
$ pnpm lint
```

```sh [自动修复]
$ pnpm lint-fix
```

如果你偏好 ESLint/Prettier 方案，也可在 Rue 项目中沿用，只需按团队规范配置即可。

## 格式化

- 推荐使用 `oxfmt` 对代码与文档进行统一格式化
- 也可采用 Prettier 按需配置

相关脚本：

```sh [格式化]
$ pnpm format
```

```sh [校验]
$ pnpm format-check
```

## SFC 自定义块

Rue 的 SFC 可包含自定义块。它们会在构建时按资源查询被转换为同文件的导入，由底层构建工具 Vite 负责处理。

- 使用 Vite 时，建议通过自定义插件将匹配的块转换为可执行 JS
- Rue 官方提供的 `@rue-js/vite-plugin-rue` 覆盖了常见用例，扩展场景可自行添加插件

## 底层包与生态

以下包在 Rue 项目中常用：

- `@rue-js/runtime`：Rue 运行时核心
- `@rue-js/shared`：通用工具与类型
- `@rue-js/vite-plugin-rue`：Rue 与 Vite 集成的官方插件
- `@rue-js/router`：路由能力
- `@rue-js/jsx-runtime`：JSX 相关运行时支持
- `@rue-js/runtime-vapor`：针对特定运行模式的优化实现

你可以在本仓库的脚本中查看它们的构建方式与使用姿势。

## 其他在线沙盒

- [Vite on StackBlitz](https://vite.new/)
- [Vite on Repl.it](https://replit.com/@templates/Vite)
- [Vite on CodeSandbox](https://codesandbox.io/)
- [CodePen](https://codepen.io/)

在这些平台创建 Vite 工程后，安装 Rue 依赖即可运行基础示例。
