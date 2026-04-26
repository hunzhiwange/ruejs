# 选项：渲染 {#options-rendering} @todo

> **@todo**: 整个 Options API 尚未实现。Rue 目前仅支持 Composition API / FC 模式。

## template {#template}

组件的字符串模板。

- **类型**

  ```ts
  interface ComponentOptions {
    template?: string
  }
  ```

- **详情**

  通过 `template` 选项提供的模板将在运行时即时编译。仅在使用包含模板编译器的 Rue 构建时支持。模板编译器**不包含**在名称中有 `runtime` 的 Rue 构建中，例如 `rue.runtime.esm-bundler.js`。有关不同构建的更多详细信息，请参阅 [dist 文件指南](https://github.com/hunzhiwange/ruejs/tree/main/packages/rue#which-dist-file-to-use)。

  如果字符串以 `#` 开头，它将用作 `querySelector` 并使用所选元素的 `innerHTML` 作为模板字符串。这允许使用原生 `<template>` 元素编写源模板。

  如果同一组件中也存在 `render` 选项，`template` 将被忽略。

  如果应用程序的根组件没有指定 `template` 或 `render` 选项，Rue 将尝试使用挂载元素的 `innerHTML` 作为模板。

  :::warning 安全提示
  仅使用您可以信任的模板源。不要使用用户提供的内容作为模板。有关更多详细信息，请参见[安全指南](/guide/best-practices/security#rule-no-1-never-use-non-trusted-templates)。
  :::

## render {#render}

以编程方式返回组件渲染输出的函数。

- **类型**

  ```ts
  interface ComponentOptions {
    render?(this: ComponentPublicInstance): RenderOutput
  }

  type RenderOutput = RenderableOutput
  ```

- **详情**

  `render` 是字符串模板的替代方案，允许您利用 JavaScript 的完整编程能力来声明组件的渲染输出。

  在 Rue 当前默认路径里，这个“渲染输出”并不要求是一棵完整的运行时对象树；它可以是字符串、数组、Renderables、mount handle，或它们的组合。

  预编译的模板，例如单文件组件中的模板，会在构建时被转换为更接近 Block / Vapor 的渲染产物。如果组件中同时存在 `render` 和 `template`，`render` 将具有更高优先级。

- **另请参阅**
  - [渲染机制](/guide/extras/rendering-mechanism)
  - [渲染函数](/guide/extras/render-function)

## compilerOptions {#compileroptions}

配置组件模板的运行时编译器选项。

- **类型**

  ```ts
  interface ComponentOptions {
    compilerOptions?: {
      isCustomElement?: (tag: string) => boolean
      whitespace?: 'condense' | 'preserve' // default: 'condense'
      delimiters?: [string, string] // default: ['{{', '}}']
      comments?: boolean // default: false
    }
  }
  ```

- **详情**

  此配置选项仅在使用完整构建时受尊重（即可以在浏览器中编译模板的独立 `rue.js`）。它支持与应用程序级 [app.config.compilerOptions](/api/application#app-config-compileroptions) 相同的选项，并对当前组件具有更高优先级。

- **另请参阅** [app.config.compilerOptions](/api/application#app-config-compileroptions)

## slots<sup class="vt-badge ts"/> {#slots}

- 仅在 3.3+ 中支持

在渲染函数中以编程方式使用插槽时协助类型推断的选项。

- **详情**

  此选项的运行时值不会被使用。实际类型应使用 `SlotsType` 类型辅助工具通过类型转换声明：

  ```ts
  import { SlotsType } from '@rue-js/rue'

  defineComponent({
    slots: Object as SlotsType<{
      default: { foo: string; bar: number }
      item: { data: number }
    }>,
    setup(props, { slots }) {
      expectType<undefined | ((scope: { foo: string; bar: number }) => any)>(slots.default)
      expectType<undefined | ((scope: { data: number }) => any)>(slots.item)
    },
  })
  ```
