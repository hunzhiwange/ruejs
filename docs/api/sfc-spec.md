# SFC 语法规范 {#sfc-syntax-specification}

## 概述 {#overview}

Rue Single-File Component (SFC)，通常使用 `*.rue` 或 `*.tsx` 文件扩展名，是一种自定义文件格式，使用类似 HTML 的语法描述 Rue 组件。Rue SFC 在语法上与 HTML 兼容。

每个 `*.rue` 或 `*.tsx` 文件由三种类型的顶级语言块组成：`<template>`、`<script>` 和 `<style>`，以及可选的附加自定义块：

由于 Rue 推荐使用 JSX/TSX，以下是 TSX 格式的等效示例：

```tsx
// MyComponent.tsx
import { type FC } from 'rue-js'

export const MyComponent: FC = () => {
  return (
    <div className="example">
      <h1>Hello world!</h1>
    </div>
  )
}
```

```css
/* MyComponent.css */
.example {
  color: red;
}
```

```txt
<!-- MyComponent.docs.md -->
This could be e.g. documentation for the component.
```

## 语言块 {#language-blocks}

### JSX/TSX 组件 {#jsx-tsx-component}

- 每个 `*.tsx` 文件包含一个默认导出的函数组件。

- 该脚本作为 ES 模块执行。

- **默认导出**应该是一个 Rue 组件函数，可以是普通函数或使用类型标注的函数组件。

### 样式块 {#style-block}

- 一个 `*.tsx` 文件可以导入多个 CSS 文件或使用 CSS-in-JS 方案。

- 样式可以使用 CSS 模块（`*.module.css`）来封装当前组件的样式。在同一组件中可以混合使用不同的封装模式。

### 自定义块 {#custom-blocks}

可以为任何项目特定的需要在 `*.tsx` 文件中包含附加自定义块，例如 `<docs>` 块。自定义块的一些实际示例包括：

- [Gridsome: `<page-query>`](https://gridsome.org/docs/querying-data/)
- [vite-plugin-rue-gql: `<gql>`](https://github.com/wheatjs/vite-plugin-rue-gql)
- [rue-i18n: `<i18n>`](https://github.com/intlify/bundle-tools/tree/main/packages/unplugin-rue-i18n#i18n-custom-block)

自定义块的处理将取决于工具 - 如果您想构建自己的自定义块集成，请参见 [SFC 自定义块集成工具部分](/guide/scaling-up/tooling#sfc-custom-block-integrations) 了解更多详细信息。

## 自动名称推断 {#automatic-name-inference}

SFC 在以下情况下自动从**文件名**推断组件名称：

- Dev 警告格式化
- DevTools 检查
- 递归自引用，例如名为 `FooBar.tsx` 的文件可以在其 JSX 中自引用为 `<FooBar/>`。这优先于显式注册/导入的组件。

## 预处理器 {#pre-processors}

块可以使用 `lang` 属性声明预处理器语言。最常见的用例是对 `<script>` 块使用 TypeScript：

```tsx
// 使用 TypeScript
const MyComponent: FC = () => {
  return <div>Hello</div>
}
```

`lang` 可以应用于任何块 - 例如，我们可以对 `<style>` 使用 [Sass](https://sass-lang.com/)：

```scss
/* MyComponent.module.scss */
$primary-color: #333;
.example {
  color: $primary-color;
}
```

请注意，与各种预处理器的集成可能因工具链而异。查看相应的文档以获取示例：

- [Vite](https://vitejs.dev/guide/features.html#css-pre-processors)
- [Rue CLI](https://cli.ruejs.org/guide/css.html#pre-processors)

## `src` 导入 {#src-imports}

如果您希望将 `*.tsx` 组件拆分为多个文件，可以使用标准 ES 模块导入：

```tsx
import { MyTemplate } from './template'
import './styles.css'

export const MyComponent = () => <MyTemplate />
```

请注意，导入遵循 ES 模块路径解析规则，这意味着：

- 相对路径需要以 `./` 开头
- 您可以从 npm 依赖项导入资源：

```tsx
// 从已安装的 "todomvc-app-css" npm 包导入文件
import 'todomvc-app-css/index.css'
```

导入也适用于自定义块。

:::warning 注意
虽然在 `src` 中使用别名，但不要以 `~` 开头，其后的任何内容都被解释为模块请求。这意味着您可以引用 node_modules 中的资源：

```tsx
<img src="~some-npm-package/foo.png" />
```

:::

## 注释 {#comments}

在每个块中，您应使用所用语言的注释语法（HTML、CSS、JavaScript、Pug 等）。对于顶级注释，使用 HTML 注释语法：`<!-- comment contents here -->`
