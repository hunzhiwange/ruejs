# 实用类型 {#utility-types} @todo

> **@todo**: 以下实用类型大部分为 Options API 相关，尚未在 Rue 中实现。

:::info
此页面仅列出一些可能需要解释其用法的常用实用类型。有关导出类型的完整列表，请参阅[源代码](https://github.com/hunzhiwange/ruejs/blob/main/packages/runtime-core/src/index.ts#L131)。
:::

## PropType\<T> {#proptype-t}

用于在使用运行时 props 声明时为 prop 添加更高级的类型注释。

- **示例**

  ```ts
  import type { PropType } from '@rue-js/rue'

  interface Book {
    title: string
    author: string
    year: number
  }

  export default {
    props: {
      book: {
        // 为 `Object` 提供更具体的类型
        type: Object as PropType<Book>,
        required: true,
      },
    },
  }
  ```

- **另请参阅** [指南 - 为组件 Props 添加类型](/guide/typescript/options-api#typing-component-props)

## MaybeRef\<T> {#mayberef}

- 仅在 3.3+ 中支持

`T | Ref<T>` 的别名。用于注释[组合式函数](/guide/reusability/composables.html)的参数。

## MaybeRefOrGetter\<T> {#maybereforgetter}

- 仅在 3.3+ 中支持

`T | Ref<T> | (() => T)` 的别名。用于注释[组合式函数](/guide/reusability/composables.html)的参数。

## ExtractPropTypes\<T> {#extractproptypes}

从运行时 props 选项对象中提取 prop 类型。提取的类型是面向内部的 - 即组件接收的解析后的 props。这意味着布尔 props 和具有默认值的 props 始终被定义，即使它们不是必需的。

要提取面向外部的 props，即父级允许传递的 props，请使用 [`ExtractPublicPropTypes`](#extractpublicproptypes)。

- **示例**

  ```ts
  const propsOptions = {
    foo: String,
    bar: Boolean,
    baz: {
      type: Number,
      required: true,
    },
    qux: {
      type: Number,
      default: 1,
    },
  } as const

  type Props = ExtractPropTypes<typeof propsOptions>
  // {
  //   foo?: string,
  //   bar: boolean,
  //   baz: number,
  //   qux: number
  // }
  ```

## ExtractPublicPropTypes\<T> {#extractpublicproptypes}

- 仅在 3.3+ 中支持

从运行时 props 选项对象中提取 prop 类型。提取的类型是面向外部的 - 即父级允许传递的 props。

- **示例**

  ```ts
  const propsOptions = {
    foo: String,
    bar: Boolean,
    baz: {
      type: Number,
      required: true,
    },
    qux: {
      type: Number,
      default: 1,
    },
  } as const

  type Props = ExtractPublicPropTypes<typeof propsOptions>
  // {
  //   foo?: string,
  //   bar?: boolean,
  //   baz: number,
  //   qux?: number
  // }
  ```

## ComponentCustomProperties {#componentcustomproperties}

用于扩充组件实例类型以支持自定义全局属性。

- **示例**

  ```ts
  import axios from 'axios'

  declare module '@rue-js/rue' {
    interface ComponentCustomProperties {
      $http: typeof axios
      $translate: (key: string) => string
    }
  }
  ```

  :::tip
  扩充必须放置在模块 `.ts` 或 `.d.ts` 文件中。有关更多详细信息，请参见[类型扩充放置](/guide/typescript/options-api#augmenting-global-properties)。
  :::

- **另请参阅** [指南 - 扩充全局属性](/guide/typescript/options-api#augmenting-global-properties)

## ComponentCustomOptions {#componentcustomoptions}

用于扩充组件选项类型以支持自定义选项。

- **示例**

  ```ts
  import { Route } from '@rue-js/router'

  declare module '@rue-js/rue' {
    interface ComponentCustomOptions {
      beforeRouteEnter?(to: any, from: any, next: () => void): void
    }
  }
  ```

  :::tip
  扩充必须放置在模块 `.ts` 或 `.d.ts` 文件中。有关更多详细信息，请参见[类型扩充放置](/guide/typescript/options-api#augmenting-global-properties)。
  :::

- **另请参阅** [指南 - 扩充自定义选项](/guide/typescript/options-api#augmenting-custom-options)

## ComponentCustomProps {#componentcustomprops}

用于扩充允许的 TSX props，以便在 TSX 元素上使用未声明的 props。

- **示例**

  ```ts
  declare module '@rue-js/rue' {
    interface ComponentCustomProps {
      hello?: string
    }
  }

  export {}
  ```

  ```tsx
  // 现在即使 hello 不是声明的 prop 也能工作
  <MyComponent hello="world" />
  ```

  :::tip
  扩充必须放置在模块 `.ts` 或 `.d.ts` 文件中。有关更多详细信息，请参见[类型扩充放置](/guide/typescript/options-api#augmenting-global-properties)。
  :::

## CSSProperties {#cssproperties}

用于扩充样式属性绑定中允许的值。

- **示例**

  允许任何自定义 CSS 属性

  ```ts
  declare module '@rue-js/rue' {
    interface CSSProperties {
      [key: `--${string}`]: string
    }
  }
  ```

  ```tsx
  <div style={ { '--bg-color': 'blue' } }>
  ```

  ```html
  <div :style="{ '--bg-color': 'blue' }"></div>
  ```

:::tip
扩充必须放置在模块 `.ts` 或 `.d.ts` 文件中。有关更多详细信息，请参见[类型扩充放置](/guide/typescript/options-api#augmenting-global-properties)。
:::

:::info 另请参阅
SFC `<style>` 标签支持使用 `v-bind` CSS 函数将 CSS 值链接到动态组件状态。这允许自定义属性无需类型扩充。

- [CSS 中的 v-bind()](/api/sfc-css-features#v-bind-in-css)
  :::
