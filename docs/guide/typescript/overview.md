# 使用 Rue 与 TypeScript {#using-rue-with-typescript}

像 TypeScript 这样的类型系统可以通过在构建时进行静态分析来检测许多常见错误。这减少了生产环境中运行时错误的机会，也使我们能够更有信心地重构大规模应用程序中的代码。TypeScript 还通过 IDE 中的基于类型的自动完成改善了开发者体验。

Rue 本身是用 TypeScript 编写的，并提供一流的 TypeScript 支持。所有官方 Rue 包都带有捆绑的类型声明，应该可以开箱即用。

## 项目设置 {#project-setup}

[`create-rue`](https://github.com/rue-jsjs/create-rue)，官方项目脚手架工具，提供用于脚手架基于 [Vite](https://vitejs.dev/) 的、支持 TypeScript 的 Rue 项目的选项。

### 概述 {#overview}

使用基于 Vite 的设置，开发服务器和打包器仅进行转译，不执行任何类型检查。这确保即使使用 TypeScript，Vite 开发服务器也能保持极快的速度。

- 在开发期间，我们建议依赖良好的 [IDE 设置](#ide-support)来获取类型错误的即时反馈。

- 如果使用 SFC，请使用 [`rue-tsc`](https://github.com/rue-jsjs/language-tools/tree/master/packages/tsc) 工具进行命令行类型检查和类型声明生成。`rue-tsc` 是围绕 `tsc`（TypeScript 自己的命令行接口）的包装器。它的工作方式与 `tsc` 大致相同，但除了 TypeScript 文件外还支持 Rue SFC。你可以在并行于 Vite 开发服务器的情况下在监视模式下运行 `rue-tsc`，或使用像 [vite-plugin-checker](https://vite-plugin-checker.netlify.app/) 这样的 Vite 插件，它在单独的 worker 线程中运行检查。

- Rue CLI 也提供 TypeScript 支持，但不再推荐使用。参见[下面的说明](#note-on-rue-cli-and-ts-loader)。

### IDE 支持 {#ide-support}

- [Visual Studio Code](https://code.visualstudio.com/)（VS Code）因其出色的 TypeScript 开箱即用支持而强烈推荐。
  - [Rue - 官方](https://marketplace.visualstudio.com/items?itemName=Rue.rueolar)（以前称为 Volar）是官方 VS Code 扩展，为 Rue SFC 中的 TypeScript 提供支持，以及许多其他强大功能。

    :::tip
    Rue - 官方扩展取代了 [Vetur](https://marketplace.visualstudio.com/items?itemName=octref.vetur)，我们之前的 Rue 2 官方 VS Code 扩展。如果你当前安装了 Vetur，请确保在 Rue 3 项目中禁用它。
    :::

- [WebStorm](https://www.jetbrains.com/webstorm/) 也为 TypeScript 和 Rue 提供开箱即用支持。其他 JetBrains IDE 也支持它们，开箱即用或通过[免费插件](https://plugins.jetbrains.com/plugin/9442-rue-js)。从 2023.2 版本开始，WebStorm 和 Rue 插件内置支持 Rue 语言服务器。你可以在设置 > 语言和框架 > TypeScript > Rue 下将 Rue 服务设置为在所有 TypeScript 版本上使用 Volar 集成。默认情况下，Volar 将用于 TypeScript 5.0 及更高版本。

### 配置 `tsconfig.json` {#configuring-tsconfig-json}

通过 `create-rue` 脚手架的项目包含预配置的 `tsconfig.json`。基本配置抽象在 [`rue-tsconfig`](https://github.com/rue-jsjs/tsconfig) 包中。在项目内部，我们使用[项目引用](https://www.typescriptlang.org/docs/handbook/project-references.html)来确保在不同环境中运行的代码（例如应用代码和测试代码应有不同的全局变量）具有正确的类型。

手动配置 `tsconfig.json` 时，一些值得注意的选项包括：

- [`compilerOptions.isolatedModules`](https://www.typescriptlang.org/tsconfig#isolatedModules) 设置为 `true`，因为 Vite 使用 [esbuild](https://esbuild.github.io/) 转译 TypeScript，并受限于单文件转译。[`compilerOptions.verbatimModuleSyntax`](https://www.typescriptlang.org/tsconfig#verbatimModuleSyntax) 是 `isolatedModules` 的[超集](https://github.com/microsoft/TypeScript/issues/53601)，也是一个不错的选择——这是 [`rue-tsconfig`](https://github.com/rue-jsjs/tsconfig) 使用的。

- 如果你使用 Options API，需要设置 [`compilerOptions.strict`](https://www.typescriptlang.org/tsconfig#strict) 为 `true`（或至少启用 [`compilerOptions.noImplicitThis`](https://www.typescriptlang.org/tsconfig#noImplicitThis)，它是 `strict` 标志的一部分）以利用组件选项中 `this` 的类型检查。否则 `this` 将被视为 `any`。

- 如果你在构建工具中配置了解析器别名，例如 `create-rue` 项目中默认配置的 `@/*` 别名，你也需要通过 [`compilerOptions.paths`](https://www.typescriptlang.org/tsconfig#paths) 为 TypeScript 配置它。

- 如果你打算将 TSX 与 Rue 一起使用，将 [`compilerOptions.jsx`](https://www.typescriptlang.org/tsconfig#jsx) 设置为 `"preserve"`，并将 [`compilerOptions.jsxImportSource`](https://www.typescriptlang.org/tsconfig#jsxImportSource) 设置为 `"rue-js"`。

另请参阅：

- [官方 TypeScript 编译器选项文档](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- [esbuild TypeScript 编译注意事项](https://esbuild.github.io/content-types/#typescript-caveats)

### 关于 Rue CLI 和 `ts-loader` 的说明 {#note-on-rue-cli-and-ts-loader}

在基于 webpack 的设置（如 Rue CLI）中，通常将类型检查作为模块转换管道的一部分执行，例如使用 `ts-loader`。然而，这不是一个干净的解决方案，因为类型系统需要整个模块图的知识来执行类型检查。单个模块的转换步骤根本不是完成此任务的正确位置。它导致以下问题：

- `ts-loader` 只能对转换后的代码进行类型检查。这与我们在 IDE 或从 `rue-tsc` 看到的错误不一致，后者直接映射回源代码。

- 类型检查可能很慢。当它与代码转换在同一线程/进程中执行时，会显著影响整个应用程序的构建速度。

- 我们已经在 IDE 中的单独进程中运行类型检查，因此开发者体验变慢的成本根本不是一个好的权衡。

如果你当前通过 Rue CLI 使用 Rue 3 + TypeScript，我们强烈建议迁移到 Vite。我们也在研究启用仅转译 TS 支持的 CLI 选项，以便你可以切换到 `rue-tsc` 进行类型检查。

## 一般使用说明 {#general-usage-notes}

### `defineComponent()` {#definecomponent}

为了让 TypeScript 正确推断组件选项内部的类型，我们需要使用 [`defineComponent()`](/api/general#definecomponent) 定义组件：

```ts
import { defineComponent } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = defineComponent({
  // 启用类型推断
  props: {
    name: String,
    msg: { type: String, required: true },
  },
  data() {
    return {
      count: 1,
    }
  },
  mounted() {
    this.name // 类型: string | undefined
    this.msg // 类型: string
    this.count // 类型: number
  },
})
```

`defineComponent()` 还支持在不使用 `<script setup>` 使用 Composition API 时推断传递给 `setup()` 的 props：

```ts
import { defineComponent } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = defineComponent({
  // 启用类型推断
  props: {
    message: String,
  },
  setup(props) {
    props.message // 类型: string | undefined
  },
})
```

另请参阅：

- [关于 webpack Treeshaking 的说明](/api/general#note-on-webpack-treeshaking)
- [`defineComponent` 的类型测试](https://github.com/rue-jsjs/core/blob/main/packages-private/dts-test/defineComponent.test-d.tsx)

:::tip
`defineComponent()` 也为用纯 JavaScript 定义的组件启用类型推断。
:::

### 在单文件组件中使用 {#usage-in-single-file-components}

要在 SFC 中使用 TypeScript，请向 `<script>` 标签添加 `lang="ts"` 属性。当存在 `lang="ts"` 时，所有模板表达式也享有更严格的类型检查。

```vue
<script lang="ts">
import { defineComponent } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = defineComponent({
  data() {
    return {
      count: 1,
    }
  },
})
</script>

<template>
  <!-- 启用类型检查和自动完成 -->
  {{ count.toFixed(2) }}
</template>
```

`lang="ts"` 也可以与 `<script setup>` 一起使用：

```vue
<script setup lang="ts">
// 启用 TypeScript
import { ref } from 'rue-js'

const count = ref(1)
</script>

<template>
  <!-- 启用类型检查和自动完成 -->
  {{ count.toFixed(2) }}
</template>
```

### 模板中的 TypeScript {#typescript-in-templates}

当使用 `<script lang="ts">` 或 `<script setup lang="ts">` 时，`<template>` 也支持在绑定表达式中使用 TypeScript。这在需要在模板表达式中执行类型转换的情况下很有用。

这里有一个有点做作的例子：

```vue
<script setup lang="ts">
let x: string | number = 1
</script>

<template>
  <!-- 错误，因为 x 可能是字符串 -->
  {{ x.toFixed(2) }}
</template>
```

这可以通过内联类型转换来解决：

```vue{6}
<script setup lang="ts">
let x: string | number = 1
</script>

<template>
  {{ (x as number).toFixed(2) }}
</template>
```

:::tip
如果使用 Rue CLI 或基于 webpack 的设置，模板表达式中的 TypeScript 需要 `rue-loader@^16.8.0`。
:::

### 与 TSX 一起使用 {#usage-with-tsx}

Rue 还支持使用 JSX / TSX 编写组件。详细信息在[渲染函数与 JSX](/guide/extras/render-function.html#jsx-tsx)指南中介绍。

## 泛型组件 {#generic-components}

泛型组件在两种情况下受支持：

- 在 SFC 中：[`带 generic 属性的 <script setup>`](/api/sfc-script-setup.html#generics)
- 渲染函数 / JSX 组件：[`defineComponent()` 的函数签名](/api/general.html#function-signature)

## API 特定配方 {#api-specific-recipes}

- [TS 与 Composition API](./composition-api)
- [TS 与 Options API](./options-api)
