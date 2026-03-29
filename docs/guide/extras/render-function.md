# 渲染函数与 JSX {#render-functions-jsx}

Rue 建议在绝大多数情况下使用模板来构建应用程序。然而，有些情况下我们需要 JavaScript 的完整编程能力。这就是我们可以使用**渲染函数**的地方。

> 如果你是虚拟 DOM 和渲染函数概念的新手，请务必先阅读[渲染机制](/guide/extras/rendering-mechanism)章节。

## 基本用法 {#basic-usage}

### 创建 Vnodes {#creating-vnodes}

Rue 提供了一个 `h()` 函数用于创建 vnodes：

```tsx
import { h } from 'rue-js'

const vnode = h(
  'div', // 类型
  { id: 'foo', class: 'bar' }, // props
  [
    /* children */
  ],
)
```

`h()` 是 **hyperscript** 的缩写——意思是"生成 HTML（超文本标记语言）的 JavaScript"。这个名字继承自许多虚拟 DOM 实现共享的约定。一个更具描述性的名字可能是 `createVNode()`，但当你必须在渲染函数中多次调用此函数时，较短的名字更有帮助。

`h()` 函数设计得非常灵活：

```tsx
// 除类型外的所有参数都是可选的
h('div')
h('div', { id: 'foo' })

// props 中可以使用属性和特性
// Rue 会自动选择正确的方式分配它
h('div', { class: 'bar', innerHTML: 'hello' })

// 可以使用 `.` 和 `^` 前缀分别添加 `.prop` 和 `.attr` 修饰符
h('div', { '.name': 'some-name', '^width': '100' })

// class 和 style 具有与模板中相同的对象/数组值支持
h('div', { class: [foo, { bar }], style: { color: 'red' } })

// 事件监听器应该以 onXxx 形式传递
h('div', { onClick: () => {} })

// children 可以是字符串
h('div', { id: 'foo' }, 'hello')

// 没有 props 时可以省略 props
h('div', 'hello')
h('div', [h('span', 'hello')])

// children 数组可以包含混合的 vnodes 和字符串
h('div', ['hello', h('span', 'hello')])
```

生成的 vnode 具有以下形状：

```js
const vnode = h('div', { id: 'foo' }, [])

vnode.type // 'div'
vnode.props // { id: 'foo' }
vnode.children // []
vnode.key // null
```

:::warning 注意
完整的 `VNode` 接口包含许多其他内部属性，但强烈建议避免依赖此处列出的属性以外的任何属性。这可以避免在内部属性更改时发生意外中断。
:::

### 声明渲染函数 {#declaring-render-functions}

<div class="composition-api">

当使用 Composition API 的模板时，`setup()` 钩子的返回值用于向模板暴露数据。然而，当使用渲染函数时，我们可以直接返回渲染函数：

```tsx
import { ref, h } from 'rue-js'
import type { FC } from 'rue-js'

interface Props {
  msg: string
}

const App: FC<Props> = props => {
  const count = ref(1)

  // 返回渲染函数
  return () => h('div', props.msg + count.value)
}
```

渲染函数在 `setup()` 内部声明，因此它自然可以访问在同一作用域中声明的 props 和任何响应式状态。

除了返回单个 vnode，你还可以返回字符串或数组：

```tsx
import type { FC } from 'rue-js'

const App: FC = () => {
  return () => 'hello world!'
}
```

```tsx
import { h } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = () => {
  // 使用数组返回多个根节点
  return () => [h('div'), h('div'), h('div')]
}
```

:::tip
确保返回一个函数而不是直接返回值！`setup()` 函数每个组件只调用一次，而返回的渲染函数将被多次调用。
:::

</div>

如果渲染函数组件不需要任何实例状态，它们也可以直接声明为函数以简洁起见：

```tsx
function Hello() {
  return 'hello world!'
}
```

没错，这是一个有效的 Rue 组件！有关此语法的更多详细信息，请参阅[函数式组件](#functional-components)。

### Vnodes 必须是唯一的 {#vnodes-must-be-unique}

组件树中的所有 vnodes 必须是唯一的。这意味着以下渲染函数是无效的：

```tsx
function render() {
  const p = h('p', 'hi')
  return h('div', [
    // 哎呀 - 重复的 vnodes！
    p,
    p,
  ])
}
```

如果你确实想多次复制相同的元素/组件，你可以使用工厂函数。例如，以下渲染函数是渲染 20 个相同段落的完全有效方式：

```tsx
function render() {
  return h(
    'div',
    Array.from({ length: 20 }).map(() => {
      return h('p', 'hi')
    }),
  )
}
```

## JSX / TSX {#jsx-tsx}

[JSX](https://facebook.github.io/jsx/) 是一种类似 XML 的 JavaScript 扩展，允许我们编写这样的代码：

```jsx
const vnode = <div>hello</div>
```

在 JSX 表达式中，使用花括号嵌入动态值：

```jsx
const vnode = <div id={dynamicId}>hello, {userName}</div>
```

`create-rue` 和 Rue CLI 都有用于脚手架预配置 JSX 支持项目的选项。如果你是手动配置 JSX，请参阅 [`rue-babel-plugin-jsx`](https://github.com/rue-jsjs/jsx-next) 文档了解详细信息。

虽然 JSX 最初由 React 引入，但实际上 JSX 没有定义运行时语义，可以编译成各种不同的输出。如果你之前使用过 JSX，请注意 **Rue JSX 转换与 React 的 JSX 转换不同**，因此你不能在 Rue 应用程序中使用 React 的 JSX 转换。与 React JSX 的一些显著区别包括：

- 你可以使用 HTML 属性，如 `class` 和 `for` 作为 props——无需使用 `className` 或 `htmlFor`。
- 将 children 传递给组件（即插槽）[工作方式不同](#passing-slots)。

Rue 的类型定义也为 TSX 使用提供类型推断。使用 TSX 时，确保在 `tsconfig.json` 中指定 `"jsx": "preserve"`，以便 TypeScript 保留 JSX 语法供 Rue JSX 转换处理。

### JSX 类型推断 {#jsx-type-inference}

与转换类似，Rue 的 JSX 也需要不同的类型定义。

从 Rue 3.4 开始，Rue 不再隐式注册全局 `JSX` 命名空间。要指示 TypeScript 使用 Rue 的 JSX 类型定义，确保在 `tsconfig.json` 中包含以下内容：

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "rue-js"
    // ...
  }
}
```

你还可以通过在文件顶部添加 `/* @jsxImportSource rue-js */` 注释来选择每个文件加入。

如果有代码依赖于全局 `JSX` 命名空间的存在，你可以通过显式导入或引用项目中的 `rue-js/jsx` 来保留确切的 3.4 之前全局行为，这会注册全局 `JSX` 命名空间。

## 渲染函数配方 {#render-function-recipes}

下面我们将提供一些将模板功能实现为其等效渲染函数 / JSX 的常见配方。

### `v-if` {#v-if}

模板：

```vue-html
<div>
  <div v-if="ok">yes</div>
  <span v-else>no</span>
</div>
```

等效渲染函数 / JSX：

<div class="composition-api">

```tsx
import { h, ref } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = () => {
  const ok = ref(true)

  return () => h('div', [ok.value ? h('div', 'yes') : h('span', 'no')])
}
```

```jsx
<div>{ok.value ? <div>yes</div> : <span>no</span>}</div>
```

</div>

### `v-for` {#v-for}

模板：

```vue-html
<ul>
  <li v-for="{ id, text } in items" :key="id">
    {{ text }}
  </li>
</ul>
```

等效渲染函数 / JSX：

<div class="composition-api">

```tsx
import { h, ref } from 'rue-js'
import type { FC } from 'rue-js'

interface Item {
  id: number
  text: string
}

const App: FC = () => {
  const items = ref<Item[]>([
    { id: 1, text: 'Item 1' },
    { id: 2, text: 'Item 2' },
  ])

  return () =>
    h(
      'ul',
      items.value.map(({ id, text }) => {
        return h('li', { key: id }, text)
      }),
    )
}
```

```jsx
<ul>
  {items.value.map(({ id, text }) => {
    return <li key={id}>{text}</li>
  })}
</ul>
```

</div>

### `v-on` {#v-on}

以 `on` 开头后跟大写字母的 props 名称被视为事件监听器。例如，`onClick` 等效于模板中的 `@click`。

```tsx
import { h } from 'rue-js'

h(
  'button',
  {
    onClick(event: MouseEvent) {
      /* ... */
    },
  },
  '点击我',
)
```

```jsx
<button
  onClick={event => {
    /* ... */
  }}
>
  点击我
</button>
```

#### 事件修饰符 {#event-modifiers}

对于 `.passive`、`.capture` 和 `.once` 事件修饰符，它们可以使用 camelCase 连接在事件名称之后。

例如：

```tsx
h('input', {
  onClickCapture() {
    /* capture 模式下的监听器 */
  },
  onKeyupOnce() {
    /* 仅触发一次 */
  },
  onMouseoverOnceCapture() {
    /* once + capture */
  },
})
```

```jsx
<input onClickCapture={() => {}} onKeyupOnce={() => {}} onMouseoverOnceCapture={() => {}} />
```

对于其他事件和键修饰符，可以使用 [`withModifiers`](/api/render-function#withmodifiers) 辅助函数：

```tsx
import { withModifiers } from 'rue-js'

h('div', {
  onClick: withModifiers(() => {}, ['self']),
})
```

```jsx
<div onClick={withModifiers(() => {}, ['self'])} />
```

### 组件 {#components}

要为组件创建 vnode，传递给 `h()` 的第一个参数应该是组件定义。这意味着使用渲染函数时，无需注册组件——你可以直接使用导入的组件：

```tsx
import Foo from './Foo.vue'
import Bar from './Bar.tsx'

function render() {
  return h('div', [h(Foo), h(Bar)])
}
```

```jsx
function render() {
  return (
    <div>
      <Foo />
      <Bar />
    </div>
  )
}
```

正如我们所见，只要它是有效的 Rue 组件，`h` 就可以与从任何文件格式导入的组件一起工作。

使用渲染函数时，动态组件非常简单：

```tsx
import Foo from './Foo.vue'
import Bar from './Bar.tsx'

function render() {
  return ok.value ? h(Foo) : h(Bar)
}
```

```jsx
function render() {
  return ok.value ? <Foo /> : <Bar />
}
```

如果组件按名称注册且无法直接导入（例如，由库全局注册），可以使用 [`resolveComponent()`](/api/render-function#resolvecomponent) 辅助函数以编程方式解析它。

### 渲染插槽 {#rendering-slots}

<div class="composition-api">

在渲染函数中，可以从 `setup()` 上下文访问插槽。`slots` 对象上的每个插槽都是一个**返回 vnode 数组的函数**：

```tsx
import { h, ref } from 'rue-js'
import type { FC } from 'rue-js'

interface Props {
  message: string
}

const MyComponent: FC<Props> = (props, { slots }) => {
  return () => [
    // 默认插槽：
    // <div><slot /></div>
    h('div', slots.default?.()),

    // 命名插槽：
    // <div><slot name="footer" :text="message" /></div>
    h(
      'div',
      slots.footer?.({
        text: props.message,
      }),
    ),
  ]
}
```

JSX 等效代码：

```jsx
// 默认
<div>{slots.default?.()}</div>

// 命名
<div>{slots.footer?.({ text: props.message })}</div>
```

</div>

### 传递插槽 {#passing-slots}

将 children 传递给组件与将 children 传递给元素略有不同。我们需要传递一个插槽函数，或者一个插槽函数的对象，而不是数组。插槽函数可以返回普通渲染函数可以返回的任何内容——当在子组件中访问时，它将始终被规范化为 vnode 数组。

```tsx
// 单个默认插槽
h(MyComponent, () => 'hello')

// 命名插槽
// 注意 `null` 是必需的，以避免
// 将插槽对象视为 props
h(MyComponent, null, {
  default: () => 'default slot',
  foo: () => h('div', 'foo'),
  bar: () => [h('span', 'one'), h('span', 'two')],
})
```

JSX 等效代码：

```jsx
// 默认
<MyComponent>{() => 'hello'}</MyComponent>

// 命名
<MyComponent>{{
  default: () => 'default slot',
  foo: () => <div>foo</div>,
  bar: () => [<span>one</span>, <span>two</span>]
}}</MyComponent>
```

将插槽作为函数传递允许子组件延迟调用它们。这导致插槽的依赖由子组件而不是父组件跟踪，从而产生更准确和高效的更新。

### 作用域插槽 {#scoped-slots}

要在父组件中渲染作用域插槽，插槽被传递给子组件。注意插槽现在有一个参数 `text`。插槽将在子组件中被调用，子组件的数据将被传递到父组件。

```tsx
// 父组件
import type { FC } from 'rue-js'

const ParentComponent: FC = () => {
  return () =>
    h(MyComp, null, {
      default: ({ text }: { text: string }) => h('p', text),
    })
}
```

记住传递 `null` 以便插槽不会被当作 props 处理。

```tsx
// 子组件
import { h, ref } from 'rue-js'
import type { FC } from 'rue-js'

const ChildComponent: FC = (props, { slots }) => {
  const text = ref('hi')
  return () => h('div', null, slots.default?.({ text: text.value }))
}
```

JSX 等效代码：

```jsx
<MyComponent>
  {{
    default: ({ text }: { text: string }) => <p>{text}</p>,
  }}
</MyComponent>
```

### 内置组件 {#built-in-components}

[内置组件](/api/built-in-components)如 `<KeepAlive>`、`<Transition>`、`<TransitionGroup>`、`<Teleport>` 和 `<Suspense>` 必须在渲染函数中导入使用：

<div class="composition-api">

```tsx
import { h, KeepAlive, Teleport, Transition, TransitionGroup } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = () => {
  return () => h(Transition, { mode: 'out-in' } /* ... */)
}
```

</div>

### `v-model` {#v-model}

`v-model` 指令在模板编译期间被展开为 `modelValue` 和 `onUpdate:modelValue` props——我们需要自己提供这些 props：

<div class="composition-api">

```tsx
import { h } from 'rue-js'
import type { FC } from 'rue-js'

interface Props {
  modelValue: string
}

interface Emits {
  'update:modelValue': (value: string) => void
}

const MyComponent: FC<Props, Emits> = (props, { emit }) => {
  return () =>
    h(SomeComponent, {
      modelValue: props.modelValue,
      'onUpdate:modelValue': (value: string) => emit('update:modelValue', value),
    })
}
```

</div>

### 自定义指令 {#custom-directives}

可以使用 [`withDirectives`](/api/render-function#withdirectives) 将自定义指令应用于 vnode：

```tsx
import { h, withDirectives } from 'rue-js'

// 自定义指令
const pin = {
  mounted() {
    /* ... */
  },
  updated() {
    /* ... */
  },
}

// <div v-pin:top.animate="200"></div>
const vnode = withDirectives(h('div'), [[pin, 200, 'top', { animate: true }]])
```

如果指令按名称注册且无法直接导入，可以使用 [`resolveDirective`](/api/render-function#resolvedirective) 辅助函数解析它。

### 模板 Refs {#template-refs}

<div class="composition-api">

使用 Composition API 时，当使用 [`useTemplateRef()`](/api/composition-api-helpers#usetemplateref) <sup class="vt-badge" data-text="3.5+" /> 时，模板 refs 是通过将字符串值作为 prop 传递给 vnode 创建的：

```tsx
import { h, useTemplateRef } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = () => {
  const divEl = useTemplateRef<HTMLDivElement>('my-div')

  // <div ref="my-div">
  return () => h('div', { ref: 'my-div' })
}
```

<details>
<summary>3.5 之前的用法</summary>

在引入 useTemplateRef() 之前的版本中，模板 refs 是通过将 ref() 本身作为 prop 传递给 vnode 创建的：

```tsx
import { h, ref } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = () => {
  const divEl = ref<HTMLDivElement>()

  // <div ref="divEl">
  return () => h('div', { ref: divEl })
}
```

</details>
</div>

## 函数式组件 {#functional-components}

函数式组件是一种没有自己状态的替代组件形式。它们就像纯函数一样：props 进，vnodes 出。它们在不创建组件实例（即没有 `this`）的情况下渲染，并且没有通常的组件生命周期钩子。

要创建函数式组件，我们使用普通函数，而不是选项对象。该函数实际上是组件的 `render` 函数。

<div class="composition-api">

函数式组件的签名与 `setup()` 钩子相同：

```tsx
import type { FC } from 'rue-js'

interface Props {
  message: string
}

const MyComponent: FC<Props> = (props, { slots, emit, attrs }) => {
  // ...
  return <div>{props.message}</div>
}
```

</div>

大多数组件的常用配置选项对函数式组件不可用。但是，可以通过将它们添加为属性来定义 [`props`](/api/options-state#props) 和 [`emits`](/api/options-state#emits)：

```tsx
import type { FC } from 'rue-js'

interface Props {
  value: string
}

type Emits = {
  click: (value: string) => void
}

const MyComponent: FC<Props, Emits> = (props, { emit }) => {
  return <div>{props.value}</div>
}

MyComponent.props = ['value']
MyComponent.emits = ['click']
```

如果未指定 `props` 选项，则传递给函数的 `props` 对象将包含所有属性，与 `attrs` 相同。除非指定了 `props` 选项，否则 prop 名称不会规范化为 camelCase。

对于具有显式 `props` 的函数式组件，[属性透传](/guide/components/attrs)与普通组件的工作方式大致相同。但是，对于不显式指定其 `props` 的函数式组件，默认情况下只有 `class`、`style` 和 `onXxx` 事件监听器会从 `attrs` 继承。无论哪种情况，`inheritAttrs` 都可以设置为 `false` 以禁用属性继承：

```tsx
MyComponent.inheritAttrs = false
```

函数式组件可以像普通组件一样注册和消费。如果你将函数作为 `h()` 的第一个参数传递，它将被视为函数式组件。

### 函数式组件的类型定义<sup class="vt-badge ts" /> {#typing-functional-components}

函数式组件可以根据它们是否有名称来进行类型定义。[Rue - 官方扩展](https://github.com/rue-jsjs/language-tools) 在 SFC 模板中使用正确类型的函数式组件时也支持类型检查。

**命名函数式组件**

```tsx
import type { FC, SetupContext } from 'rue-js'

interface FComponentProps {
  message: string
}

type Events = {
  sendMessage(message: string): void
}

const FComponent: FC<FComponentProps, Events> = (
  props: FComponentProps,
  context: SetupContext<Events>,
) => {
  return <button onClick={() => context.emit('sendMessage', props.message)}>{props.message}</button>
}

FComponent.props = {
  message: {
    type: String,
    required: true,
  },
}

FComponent.emits = {
  sendMessage: (value: unknown) => typeof value === 'string',
}
```

**匿名函数式组件**

```tsx
import type { FunctionalComponent } from 'rue-js'

interface FComponentProps {
  message: string
}

type Events = {
  sendMessage(message: string): void
}

const FComponent: FunctionalComponent<FComponentProps, Events> = (props, context) => {
  return <button onClick={() => context.emit('sendMessage', props.message)}>{props.message}</button>
}

FComponent.props = {
  message: {
    type: String,
    required: true,
  },
}

FComponent.emits = {
  sendMessage: value => typeof value === 'string',
}
```
