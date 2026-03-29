# TypeScript 与 Options API {#typescript-with-options-api}

> 本页面假设你已经阅读了[使用 Rue 与 TypeScript](./overview)的概述。

:::tip
虽然 Rue 确实支持使用 Options API 的 TypeScript，但建议通过 Composition API 将 Rue 与 TypeScript 一起使用，因为它提供了更简单、更高效和更稳健的类型推断。
:::

## 为组件 Props 添加类型 {#typing-component-props}

Options API 中的 props 类型推断需要用 `defineComponent()` 包装组件。有了它，Rue 能够基于 `props` 选项推断类型，并考虑额外的选项如 `required: true` 和 `default`：

```ts
import { defineComponent } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = defineComponent({
  // 启用类型推断
  props: {
    name: String,
    id: [Number, String],
    msg: { type: String, required: true },
    metadata: null,
  },
  mounted() {
    this.name // 类型: string | undefined
    this.id // 类型: number | string | undefined
    this.msg // 类型: string
    this.metadata // 类型: any
  },
})
```

然而，运行时的 `props` 选项只支持使用构造函数作为 prop 的类型——没有办法指定复杂类型，如具有嵌套属性的对象或函数调用签名。

要为复杂 props 类型添加注解，我们可以使用 `PropType` 工具类型：

```ts
import { defineComponent } from 'rue-js'
import type { PropType } from 'rue-js'
import type { FC } from 'rue-js'

interface Book {
  title: string
  author: string
  year: number
}

const App: FC = defineComponent({
  props: {
    book: {
      // 为 `Object` 提供更具体的类型
      type: Object as PropType<Book>,
      required: true,
    },
    // 也可以为函数添加类型注解
    callback: Function as PropType<(id: number) => void>,
  },
  mounted() {
    this.book.title // string
    this.book.year // number

    // TS 错误：类型 'string' 的参数不能
    // 赋给类型 'number' 的参数
    this.callback?.('123')
  },
})
```

### 注意事项 {#caveats}

如果你的 TypeScript 版本低于 `4.7`，在使用函数值作为 `validator` 和 `default` prop 选项时必须小心——确保使用箭头函数：

```ts
import { defineComponent } from 'rue-js'
import type { PropType } from 'rue-js'
import type { FC } from 'rue-js'

interface Book {
  title: string
  year?: number
}

const App: FC = defineComponent({
  props: {
    bookA: {
      type: Object as PropType<Book>,
      // 如果你的 TypeScript 版本低于 4.7，确保使用箭头函数
      default: () => ({
        title: 'Arrow Function Expression',
      }),
      validator: (book: Book) => !!book.title,
    },
  },
})
```

这可以防止 TypeScript 必须推断这些函数内部的 `this` 类型，不幸的是，这可能导致类型推断失败。这是之前的[设计限制](https://github.com/microsoft/TypeScript/issues/38845)，现在已在 [TypeScript 4.7](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#improved-function-inference-in-objects-and-methods) 中得到改进。

## 为组件 Emits 添加类型 {#typing-component-emits}

我们可以使用 `emits` 选项的对象语法为发出的事件声明预期的 payload 类型。此外，所有未声明的发出事件在调用时将抛出类型错误：

```ts
import { defineComponent } from 'rue-js'
import type { FC } from 'rue-js'

type Emits = {
  addBook: (payload: { bookName: string }) => void
}

const App: FC<{}, Emits> = defineComponent({
  emits: {
    addBook(payload: { bookName: string }) {
      // 执行运行时验证
      return payload.bookName.length > 0
    },
  },
  methods: {
    onSubmit() {
      this.$emit('addBook', {
        bookName: 123, // 类型错误！
      })

      this.$emit('non-declared-event') // 类型错误！
    },
  },
})
```

## 为计算属性添加类型 {#typing-computed-properties}

计算属性根据其返回值推断其类型：

```ts
import { defineComponent } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = defineComponent({
  data() {
    return {
      message: 'Hello!',
    }
  },
  computed: {
    greeting() {
      return this.message + '!'
    },
  },
  mounted() {
    this.greeting // 类型: string
  },
})
```

在某些情况下，你可能希望显式地为计算属性添加类型注解以确保其实现正确：

```ts
import { defineComponent } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = defineComponent({
  data() {
    return {
      message: 'Hello!',
    }
  },
  computed: {
    // 显式注解返回类型
    greeting(): string {
      return this.message + '!'
    },

    // 注解可写计算属性
    greetingUppercased: {
      get(): string {
        return this.greeting.toUpperCase()
      },
      set(newValue: string) {
        this.message = newValue.toUpperCase()
      },
    },
  },
})
```

由于循环推断循环导致 TypeScript 无法推断计算属性类型的某些边缘情况，也可能需要显式注解。

## 为事件处理器添加类型 {#typing-event-handlers}

处理原生 DOM 事件时，正确地为传递给处理器的参数添加类型可能很有用。让我们看看这个例子：

```vue
<script lang="ts">
import { defineComponent } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = defineComponent({
  methods: {
    handleChange(event: Event) {
      // `event` 隐式具有 `any` 类型
      console.log((event.target as HTMLInputElement).value)
    },
  },
})
</script>

<template>
  <input type="text" @change="handleChange" />
</template>
```

没有类型注解，`event` 参数将隐式具有 `any` 类型。如果在 `tsconfig.json` 中使用 `"strict": true` 或 `"noImplicitAny": true`，这也会导致 TS 错误。因此，建议显式注解事件处理器的参数。此外，在访问 `event` 的属性时，你可能需要使用类型断言：

```ts
import { defineComponent } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = defineComponent({
  methods: {
    handleChange(event: Event) {
      console.log((event.target as HTMLInputElement).value)
    },
  },
})
```

## 扩展全局属性 {#augmenting-global-properties}

一些插件通过 [`app.config.globalProperties`](/api/application#app-config-globalproperties) 向所有组件实例安装全局可用的属性。例如，我们可以安装 `this.$http` 用于数据获取或 `this.$translate` 用于国际化。为了使其与 TypeScript 良好配合，Rue 公开了一个 `ComponentCustomProperties` 接口，旨在通过 [TypeScript 模块扩充](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation)进行扩充：

```ts
import axios from 'axios'

declare module 'rue-js' {
  interface ComponentCustomProperties {
    $http: typeof axios
    $translate: (key: string) => string
  }
}
```

另请参阅：

- [组件类型扩展的 TypeScript 单元测试](https://github.com/rue-jsjs/core/blob/main/packages-private/dts-test/componentTypeExtensions.test-d.tsx)

### 类型扩充的位置 {#type-augmentation-placement}

我们可以将此类型扩充放在 `.ts` 文件中，或放在项目范围的 `*.d.ts` 文件中。无论哪种方式，确保它包含在 `tsconfig.json` 中。对于库/插件作者，此文件应在 `package.json` 的 `types` 属性中指定。

为了利用模块扩充，你需要确保扩充放置在 [TypeScript 模块](https://www.typescriptlang.org/docs/handbook/modules.html)中。也就是说，文件需要包含至少一个顶级 `import` 或 `export`，即使它只是 `export {}`。如果扩充放置在模块之外，它将覆盖原始类型而不是扩充它们！

```ts
// 不起作用，会覆盖原始类型。
declare module 'rue-js' {
  interface ComponentCustomProperties {
    $translate: (key: string) => string
  }
}
```

```ts
// 正确工作
export {}

declare module 'rue-js' {
  interface ComponentCustomProperties {
    $translate: (key: string) => string
  }
}
```

## 扩展自定义选项 {#augmenting-custom-options}

一些插件，例如 `rue-router`，为自定义组件选项提供支持，如 `beforeRouteEnter`：

```ts
import { defineComponent } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = defineComponent({
  beforeRouteEnter(to, from, next) {
    // ...
  },
})
```

没有适当的类型扩充，此钩子的参数将隐式具有 `any` 类型。我们可以扩充 `ComponentCustomOptions` 接口以支持这些自定义选项：

```ts
import { Route } from 'rue-router'

declare module 'rue-js' {
  interface ComponentCustomOptions {
    beforeRouteEnter?(to: Route, from: Route, next: () => void): void
  }
}
```

现在 `beforeRouteEnter` 选项将被正确类型化。注意这只是一个示例——像 `rue-router` 这样的良好类型化库应该在其自己的类型定义中自动执行这些扩充。

此扩充的放置受与[全局属性扩充](#type-augmentation-placement)相同的限制。

另请参阅：

- [组件类型扩展的 TypeScript 单元测试](https://github.com/rue-jsjs/core/blob/main/packages-private/dts-test/componentTypeExtensions.test-d.tsx)

## 为全局自定义指令添加类型 {#typing-global-custom-directives}

参见：[为全局自定义指令添加类型](/guide/typescript/composition-api#typing-global-custom-directives) <sup class="vt-badge ts" />
