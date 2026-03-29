# TypeScript 与 Composition API {#typescript-with-composition-api}

<ScrimbaLink href="https://scrimba.com/links/rue-ts-composition-api" title="免费的 Rue.js TypeScript 与 Composition API 课程" type="scrimba">
  在 Scrimba 上观看互动视频课程
</ScrimbaLink>

> 本页面假设你已经阅读了[使用 Rue 与 TypeScript](./overview)的概述。

## 为组件 Props 添加类型 {#typing-component-props}

### 使用 `<script setup>` {#using-script-setup}

使用 `<script setup>` 时，`defineProps()` 宏支持基于其参数推断 props 类型：

```vue
<script setup lang="ts">
const props = defineProps({
  foo: { type: String, required: true },
  bar: Number,
})

props.foo // string
props.bar // number | undefined
</script>
```

这被称为"运行时声明"，因为传递给 `defineProps()` 的参数将用作运行时 `props` 选项。

然而，通过泛型类型参数用纯类型定义 props 通常更直接：

```vue
<script setup lang="ts">
const props = defineProps<{
  foo: string
  bar?: number
}>()
</script>
```

这被称为"基于类型的声明"。编译器将尝试根据类型参数尽力推断等效的运行时选项。在这种情况下，我们的第二个示例编译成与第一个示例完全相同的运行时选项。

你可以使用基于类型的声明**或**运行时声明，但不能同时使用两者。

我们还可以将 props 类型移到单独的接口中：

```vue
<script setup lang="ts">
interface Props {
  foo: string
  bar?: number
}

const props = defineProps<Props>()
</script>
```

即使 `Props` 是从外部源导入的，这也适用。此功能需要 TypeScript 作为 Rue 的对等依赖。

```vue
<script setup lang="ts">
import type { Props } from './foo'

const props = defineProps<Props>()
</script>
```

#### 语法限制 {#syntax-limitations}

在 3.2 及以下版本中，`defineProps()` 的泛型类型参数限于类型字面量或本地接口的引用。

此限制已在 3.3 中解决。最新版本的 Rue 支持在类型参数位置引用导入的类型和一组有限的复杂类型。然而，由于类型到运行时的转换仍然是基于 AST 的，一些需要实际类型分析的复杂类型，例如条件类型，不受支持。你可以对单个 prop 的类型使用条件类型，但不能对整个 props 对象使用。

### Props 默认值 {#props-default-values}

使用基于类型的声明时，我们失去了声明 props 默认值的能力。这可以通过使用[响应式 Props 解构](/guide/components/props#reactive-props-destructure) <sup class="vt-badge" data-text="3.5+" /> 来解决：

```ts
interface Props {
  msg?: string
  labels?: string[]
}

const { msg = 'hello', labels = ['one', 'two'] } = defineProps<Props>()
```

在 3.4 及以下版本中，默认情况下不启用响应式 Props 解构。替代方案是使用 `withDefaults` 编译器宏：

```ts
interface Props {
  msg?: string
  labels?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  msg: 'hello',
  labels: () => ['one', 'two'],
})
```

这将编译为等效的运行时 props `default` 选项。此外，`withDefaults` 辅助工具为默认值提供类型检查，并确保返回的 `props` 类型为已声明默认值的属性移除可选标志。

:::info
注意，使用 `withDefaults` 时，可变引用类型（如数组或对象）的默认值应包装在函数中，以避免意外修改和外部副作用。这确保每个组件实例获得其默认值的自己的副本。使用解构默认值时**不需要**这样做。
:::

### 不使用 `<script setup>` {#without-script-setup}

如果不使用 `<script setup>`，需要使用 `defineComponent()` 来启用 props 类型推断。传递给 `setup()` 的 props 对象的类型是从 `props` 选项推断的。

```tsx
import { defineComponent } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

interface Props {
  message: string
}

const App: FC<Props> = defineComponent({
  props: {
    message: String,
  },
  setup(props) {
    props.message // <-- 类型: string
  },
})
```

### 复杂 prop 类型 {#complex-prop-types}

使用基于类型的声明时，prop 可以像任何其他类型一样使用复杂类型：

```vue
<script setup lang="ts">
interface Book {
  title: string
  author: string
  year: number
}

const props = defineProps<{
  book: Book
}>()
</script>
```

对于运行时声明，我们可以使用 `PropType` 工具类型：

```ts
import type { PropType } from '@rue-js/rue'

interface Book {
  title: string
  author: string
  year: number
}

const props = defineProps({
  book: Object as PropType<Book>,
})
```

如果我们直接指定 `props` 选项，工作方式大致相同：

```tsx
import { defineComponent } from '@rue-js/rue'
import type { PropType } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

interface Book {
  title: string
  author: string
  year: number
}

const App: FC<{ book: Book }> = defineComponent({
  props: {
    book: Object as PropType<Book>,
  },
})
```

`props` 选项更常用于 Options API，因此你将在[使用 Options API 的 TypeScript](/guide/typescript/options-api#typing-component-props)指南中找到更详细的示例。那些示例中展示的技术也适用于使用 `defineProps()` 的运行时声明。

## 为组件 Emits 添加类型 {#typing-component-emits}

在 `<script setup>` 中，`emit` 函数也可以使用运行时声明**或**类型声明进行类型化：

```vue
<script setup lang="ts">
// 运行时
const emit = defineEmits(['change', 'update'])

// 基于选项
const emit = defineEmits({
  change: (id: number) => {
    // 返回 `true` 或 `false` 以指示
    // 验证通过/失败
  },
  update: (value: string) => {
    // 返回 `true` 或 `false` 以指示
    // 验证通过/失败
  },
})

// 基于类型
const emit = defineEmits<{
  (e: 'change', id: number): void
  (e: 'update', value: string): void
}>()

// 3.3+：替代的更简洁语法
const emit = defineEmits<{
  change: [id: number]
  update: [value: string]
}>()
</script>
```

类型参数可以是以下之一：

1. 可调用函数类型，但写为带有[调用签名](https://www.typescriptlang.org/docs/handbook/2/functions.html#call-signatures)的类型字面量。它将用作返回的 `emit` 函数的类型。
2. 类型字面量，其中键是事件名称，值是表示事件的额外接受参数的数组/元组类型。上面的示例使用命名元组，以便每个参数都可以有显式名称。

正如我们所见，类型声明为我们提供了对发出事件类型约束的更精细控制。

不使用 `<script setup>` 时，`defineComponent()` 能够推断在 setup 上下文中暴露的 `emit` 函数的允许事件：

```tsx
import { defineComponent } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

type Emits = {
  change: () => void
}

const App: FC<{}, Emits> = defineComponent({
  emits: ['change'],
  setup(props, { emit }) {
    emit('change') // <-- 类型检查 / 自动完成
  },
})
```

## 为 `ref()` 添加类型 {#typing-ref}

Refs 从初始值推断类型：

```ts
import { ref } from '@rue-js/rue'

// 推断类型: Ref<number>
const year = ref(2020)

// => TS 错误: Type 'string' is not assignable to type 'number'.
year.value = '2020'
```

有时我们可能需要为 ref 的内部值指定复杂类型。我们可以使用 `Ref` 类型来实现：

```ts
import { ref } from '@rue-js/rue'
import type { Ref } from '@rue-js/rue'

const year: Ref<string | number> = ref('2020')

year.value = 2020 // 正确！
```

或者，通过在调用 `ref()` 时传递泛型参数来覆盖默认推断：

```ts
// 结果类型: Ref<string | number>
const year = ref<string | number>('2020')

year.value = 2020 // 正确！
```

如果你指定了泛型类型参数但省略了初始值，结果类型将是包含 `undefined` 的联合类型：

```ts
// 推断类型: Ref<number | undefined>
const n = ref<number>()
```

## 为 `reactive()` 添加类型 {#typing-reactive}

`reactive()` 也隐式地从其参数推断类型：

```ts
import { reactive } from '@rue-js/rue'

// 推断类型: { title: string }
const book = reactive({ title: 'Rue 3 Guide' })
```

要为 `reactive` 属性显式添加类型，我们可以使用接口：

```ts
import { reactive } from '@rue-js/rue'

interface Book {
  title: string
  year?: number
}

const book: Book = reactive({ title: 'Rue 3 Guide' })
```

:::tip
不建议使用 `reactive()` 的泛型参数，因为返回的类型（处理嵌套 ref 解包）与泛型参数类型不同。
:::

## 为 `computed()` 添加类型 {#typing-computed}

`computed()` 根据其 getter 的返回值推断其类型：

```ts
import { ref, computed } from '@rue-js/rue'

const count = ref(0)

// 推断类型: ComputedRef<number>
const double = computed(() => count.value * 2)

// => TS 错误: Property 'split' does not exist on type 'number'
const result = double.value.split('')
```

你还可以通过泛型参数指定显式类型：

```ts
const double = computed<number>(() => {
  // 如果这不返回数字则类型错误
})
```

## 为事件处理器添加类型 {#typing-event-handlers}

处理原生 DOM 事件时，正确地为传递给处理器的参数添加类型可能很有用。让我们看看这个例子：

```vue
<script setup lang="ts">
function handleChange(event: Event) {
  // `event` 隐式具有 `any` 类型
  console.log((event.target as HTMLInputElement).value)
}
</script>

<template>
  <input type="text" @change="handleChange" />
</template>
```

没有类型注解，`event` 参数将隐式具有 `any` 类型。如果在 `tsconfig.json` 中使用 `"strict": true` 或 `"noImplicitAny": true`，这也会导致 TS 错误。因此，建议显式注解事件处理器的参数。此外，在访问 `event` 的属性时，你可能需要使用类型断言：

```ts
function handleChange(event: Event) {
  console.log((event.target as HTMLInputElement).value)
}
```

## 为 Provide / Inject 添加类型 {#typing-provide-inject}

Provide 和 inject 通常在单独的组件中执行。为了正确地为注入的值添加类型，Rue 提供了一个 `InjectionKey` 接口，它是一个扩展 `Symbol` 的泛型类型。它可用于在提供者和消费者之间同步注入值的类型：

```ts
import { provide, inject } from '@rue-js/rue'
import type { InjectionKey } from '@rue-js/rue'

const key = Symbol() as InjectionKey<string>

provide(key, 'foo') // 提供非字符串值将导致错误

const foo = inject(key) // foo 的类型: string | undefined
```

建议将注入键放在单独的文件中，以便可以在多个组件中导入。

使用字符串注入键时，注入值的类型将是 `unknown`，需要通过泛型类型参数显式声明：

```ts
const foo = inject<string>('foo') // 类型: string | undefined
```

注意，注入的值仍然可以是 `undefined`，因为无法保证提供者将在运行时提供此值。

可以通过提供默认值来移除 `undefined` 类型：

```ts
const foo = inject<string>('foo', 'bar') // 类型: string
```

如果你确定该值始终被提供，你也可以强制转换该值：

```ts
const foo = inject('foo') as string
```

## 为模板 Refs 添加类型 {#typing-template-refs}

使用 Rue 3.5 和 `rue-language-tools` 2.1（支持 IDE 语言服务和 `rue-tsc`），在 SFC 中由 `useTemplateRef()` 创建的 refs 类型可以基于匹配 `ref` 属性使用的元素**自动推断**。

在自动推断不可能的情况下，你仍然可以通过泛型参数将模板 ref 强制转换为显式类型：

```ts
const el = useTemplateRef<HTMLInputElement>('el')
```

<details>
<summary>3.5 之前的用法</summary>

模板 refs 应该使用显式的泛型类型参数和 `null` 的初始值创建：

```vue
<script setup lang="ts">
import { ref, onMounted } from '@rue-js/rue'

const el = ref<HTMLInputElement | null>(null)

onMounted(() => {
  el.value?.focus()
})
</script>

<template>
  <input ref="el" />
</template>
```

</details>

要获取正确的 DOM 接口，你可以查看 [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#technical_summary) 等页面。

注意，为了严格的类型安全，访问 `el.value` 时需要使用可选链或类型守卫。这是因为初始 ref 值在组件挂载之前为 `null`，如果引用的元素被 `v-if` 卸载，它也可以被设置为 `null`。

## 为组件模板 Refs 添加类型 {#typing-component-template-refs}

使用 Rue 3.5 和 `rue-language-tools` 2.1（支持 IDE 语言服务和 `rue-tsc`），在 SFC 中由 `useTemplateRef()` 创建的 refs 类型可以基于匹配 `ref` 属性使用的元素或组件**自动推断**。

在自动推断不可能的情况下（例如非 SFC 用法或动态组件），你仍然可以通过泛型参数将模板 ref 强制转换为显式类型。

为了获取导入组件的实例类型，我们需要首先通过 `typeof` 获取其类型，然后使用 TypeScript 内置的 `InstanceType` 工具提取其实例类型：

```vue{6,7} [App.vue]
<script setup lang="ts">
import { useTemplateRef } from '@rue-js/rue'
import Foo from './Foo.vue'
import Bar from './Bar.vue'

type FooType = InstanceType<typeof Foo>
type BarType = InstanceType<typeof Bar>

const compRef = useTemplateRef<FooType | BarType>('comp')
</script>

<template>
  <component :is="Math.random() > 0.5 ? Foo : Bar" ref="comp" />
</template>
```

在组件的确切类型不可用或不重要的情况下，可以使用 `ComponentPublicInstance`。这将仅包含所有组件共享的属性，例如 `$el`：

```ts
import { useTemplateRef } from '@rue-js/rue'
import type { ComponentPublicInstance } from '@rue-js/rue'

const child = useTemplateRef<ComponentPublicInstance>('child')
```

在被引用的组件是[泛型组件](/guide/typescript/overview.html#generic-components)的情况下，例如 `MyGenericModal`：

```vue [MyGenericModal.vue]
<script setup lang="ts" generic="ContentType extends string | number">
import { ref } from '@rue-js/rue'

const content = ref<ContentType | null>(null)

const open = (newContent: ContentType) => (content.value = newContent)

defineExpose({
  open,
})
</script>
```

需要使用 [`vue-component-type-helpers`](https://www.npmjs.com/package/vue-component-type-helpers) 库中的 `ComponentExposed`，因为 `InstanceType` 不起作用。

```vue [App.vue]
<script setup lang="ts">
import { useTemplateRef } from '@rue-js/rue'
import MyGenericModal from './MyGenericModal.vue'
import type { ComponentExposed } from 'vue-component-type-helpers'

const modal = useTemplateRef<ComponentExposed<typeof MyGenericModal>>('modal')

const openModal = () => {
  modal.value?.open('newValue')
}
</script>
```

注意，使用 `rue-language-tools` 2.1+，静态模板 refs 的类型可以自动推断，上述仅在边缘情况下需要。

## 为全局自定义指令添加类型 {#typing-global-custom-directives}

为了获取使用 `app.directive()` 声明的全局自定义指令的类型提示和类型检查，你可以扩展 `ComponentCustomProperties`

```ts [src/directives/highlight.ts]
import type { Directive } from '@rue-js/rue'

export type HighlightDirective = Directive<HTMLElement, string>

declare module '@rue-js/rue' {
  export interface ComponentCustomProperties {
    // 前缀为 v (v-highlight)
    vHighlight: HighlightDirective
  }
}

export default {
  mounted: (el, binding) => {
    el.style.backgroundColor = binding.value
  },
} satisfies HighlightDirective
```

```ts [main.ts]
import highlight from './directives/highlight'
// ...其他代码
const app = createApp(App)
app.directive('highlight', highlight)
```

在组件中使用

```vue [App.vue]
<template>
  <p v-highlight="'blue'">这句话很重要！</p>
</template>
```
