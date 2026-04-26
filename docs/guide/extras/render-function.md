# 渲染函数与 JSX {#render-functions-jsx}

Rue 依然支持手写渲染函数，但它们现在更适合作为显式边界来使用：例如可复用库组件、极动态 UI，或迁移旧的手写渲染 helper。对绝大多数应用代码来说，模板和普通 JSX 仍然是首选，因为它们会在编译阶段直接生成 Block / Vapor 导向的渲染产物。

> 如果你还没建立 Rue 当前默认渲染路径的整体图景，请先阅读[渲染机制](/guide/extras/rendering-mechanism)。

## 基本用法 {#basic-usage}

### 创建渲染输出 {#creating-vnodes}

本节保留了历史锚点，因为 `h()` 仍然是 Rue 的公开 API。需要注意的是：`h()` 创建的是公开渲染输出；在当前默认路径中，编译器通常会直接生成 Renderable / Block，而不是在每个节点上都显式调用 `h()`。

```tsx
import { h } from '@rue-js/rue'

const output = h(
  'div',
  { id: 'foo', class: 'bar' },
  [
    /* children */
  ],
)
```

`h()` 是 hyperscript 的缩写。你可以把它理解为“手写描述渲染输出的最小 API”。它在 Rue 中主要用于：

- 手写渲染函数
- 包装高度动态的子树
- 与历史渲染 helper 或迁移中的桥接层对接

`h()` 的参数保持灵活：

```tsx
// 除 type 外的所有参数都是可选的
h('div')
h('div', { id: 'foo' })

// props 中可以使用属性和特性
h('div', { class: 'bar', innerHTML: 'hello' })

// 可以使用 `.` 和 `^` 前缀分别添加 `.prop` 和 `.attr` 修饰符
h('div', { '.name': 'some-name', '^width': '100' })

// class 和 style 具有与模板中相同的对象/数组值支持
h('div', { class: [foo, { bar }], style: { color: 'red' } })

// 事件监听器应该以 onXxx 形式传递
h('div', { onClick: () => {} })

// children 可以是字符串、数组或 renderable
h('div', { id: 'foo' }, 'hello')
h('div', 'hello')
h('div', [h('span', 'hello')])
h('div', ['hello', h('span', 'hello')])
```

当你显式操作这类公开渲染输出对象时，通常会看到下面这些公开字段：

```js
const output = h('div', { id: 'foo' }, [])

output.type
output.props
output.children
output.key
```

:::warning 注意
不要依赖公开字段之外的内部属性。Rue 当前的公开渲染输出会继续随运行时演进而调整。
:::

### 声明渲染函数 {#declaring-render-functions}

在 Rue 当前的 `FC` 模式下，函数组件本身就是渲染函数。你直接返回渲染输出即可，不需要再额外返回一个 `() => ...`。

```tsx
import { ref, h } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

interface Props {
  msg: string
}

const App: FC<Props> = props => {
  const count = ref(1)
  return h('div', `${props.msg} ${count.value}`)
}
```

除了返回单个节点，你还可以直接返回字符串或数组：

```tsx
import type { FC } from '@rue-js/rue'

const TextOnly: FC = () => 'hello world!'
```

```tsx
import { h } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const MultiRoot: FC = () => [h('div', 'one'), h('div', 'two'), h('div', 'three')]
```

:::tip
如果你在旧文档或旧代码里见到 `return () => ...`，那通常对应的是更接近 Vue `setup()` 的写法，不是 Rue 当前推荐的 `FC` 组件签名。
:::

如果组件不需要额外状态，也可以直接写成普通函数：

```tsx
function Hello() {
  return 'hello world!'
}
```

### 渲染输出必须唯一 {#vnodes-must-be-unique}

同一个输出对象不要在一次渲染里重复复用。这个规则同样适用于你手动持有的 DOM / block / renderable 边界。

```tsx
function render() {
  const p = h('p', 'hi')
  return h('div', [p, p])
}
```

如果你需要多个相同节点，请为每一项重新创建：

```tsx
function render() {
  return h(
    'div',
    Array.from({ length: 20 }).map(() => h('p', 'hi')),
  )
}
```

## JSX / TSX {#jsx-tsx}

[JSX](https://facebook.github.io/jsx/) 允许你用更接近模板的方式编写渲染逻辑：

```jsx
const output = <div>hello</div>
```

```jsx
const output = <div id={dynamicId}>hello, {userName}</div>
```

Rue 的 JSX 与 React JSX 有两点最容易混淆的区别：

- 你可以直接使用 `class` 和 `for`，无需改写成 `className` 或 `htmlFor`
- 组件 children 最终会落到 `props.children` 或显式命名 props，而不是默认套入一层 Vue 风格的 `slots` 上下文

Rue 当前的 JSX 编译也默认服务于 Block / Vapor 路径，因此即便你写的是 JSX，编译结果也不意味着“运行时一定会重建整棵对象树”。

### JSX 类型推断 {#jsx-type-inference}

使用 TSX 时，请确保 `tsconfig.json` 中保留 JSX 语法给 Rue 的转换器处理：

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@rue-js/rue"
  }
}
```

你也可以在单个文件顶部使用 `/* @jsxImportSource @rue-js/rue */`。

## 渲染函数配方 {#render-function-recipes}

下面是一些模板能力对应的渲染函数 / JSX 写法。

### `v-if` {#v-if}

模板：

```vue-html
<div>
  <div v-if="ok">yes</div>
  <span v-else>no</span>
</div>
```

等效渲染函数 / JSX：

```tsx
import { h, ref } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const App: FC = () => {
  const ok = ref(true)
  return h('div', [ok.value ? h('div', 'yes') : h('span', 'no')])
}
```

```jsx
<div>{ok.value ? <div>yes</div> : <span>no</span>}</div>
```

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

```tsx
import { h, ref } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

interface Item {
  id: number
  text: string
}

const App: FC = () => {
  const items = ref<Item[]>([
    { id: 1, text: 'Item 1' },
    { id: 2, text: 'Item 2' },
  ])

  return h(
    'ul',
    items.value.map(({ id, text }) => h('li', { key: id }, text)),
  )
}
```

```jsx
<ul>
  {items.value.map(({ id, text }) => (
    <li key={id}>{text}</li>
  ))}
</ul>
```

### `v-on` {#v-on}

以 `on` 开头后跟大写字母的 prop 名称会被视为事件监听器：

```tsx
import { h } from '@rue-js/rue'

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

`.passive`、`.capture` 和 `.once` 可以直接拼在事件名后面：

```tsx
h('input', {
  onClickCapture() {
    /* capture */
  },
  onKeyupOnce() {
    /* once */
  },
  onMouseoverOnceCapture() {
    /* once + capture */
  },
})
```

```jsx
<input onClickCapture={() => {}} onKeyupOnce={() => {}} onMouseoverOnceCapture={() => {}} />
```

其他修饰符可以配合 [`withModifiers`](/api/render-function#withmodifiers) 使用：

```tsx
import { withModifiers } from '@rue-js/rue'

h('div', {
  onClick: withModifiers(() => {}, ['self']),
})
```

### 组件 {#components}

要为组件创建输出，传给 `h()` 的第一个参数应该是组件本身：

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

动态组件同样直接通过条件表达式切换：

```tsx
function render() {
  return ok.value ? h(Foo) : h(Bar)
}
```

Rue 当前更推荐直接导入组件。默认主入口不再另外文档化按名称解析组件的渲染函数 helper。

### 渲染插槽 {#rendering-slots}

Rue 当前更推荐把插槽理解成普通 props：

- 默认插槽读取 `props.children`
- 具名插槽通常建模成显式命名 props，如 `header`、`footer`
- 作用域插槽则是“函数作为 children / prop”

```tsx
import { h } from '@rue-js/rue'
import type { FC, RenderableOutput } from '@rue-js/rue'

interface LayoutProps {
  message: string
  footer?: (scope: { text: string }) => RenderableOutput
  children?: RenderableOutput
}

const Layout: FC<LayoutProps> = props => {
  return h('section', [
    h('div', props.children),
    h('footer', props.footer?.({ text: props.message }) ?? null),
  ])
}
```

JSX 中同样如此：

```tsx
function Layout(props: LayoutProps) {
  return (
    <section>
      <div>{props.children}</div>
      <footer>{props.footer?.({ text: props.message })}</footer>
    </section>
  )
}
```

### 传递插槽 {#passing-slots}

传递默认内容时，直接把 children 放到第三个参数或 JSX 子节点里即可；传递具名内容时，使用显式命名 props。

```tsx
// 默认内容
h(Layout, { message: 'hello' }, 'body')

// 具名内容
h(Layout, {
  message: 'hello',
  footer: ({ text }) => h('small', text),
}, 'body')
```

```jsx
<Layout message="hello">body</Layout>

<Layout message="hello" footer={({ text }) => <small>{text}</small>}>
  body
</Layout>
```

如果你需要把调用时机延迟到子组件内部，就把 `children` 本身写成函数。

### 作用域插槽 {#scoped-slots}

作用域插槽在 Rue 中就是 render prop：父组件把函数传给子组件，子组件在合适的时机调用，并把自己的数据作为参数传回去。

```tsx
import { h, ref } from '@rue-js/rue'
import type { FC, RenderableOutput } from '@rue-js/rue'

interface ChildProps {
  children?: (scope: { text: string }) => RenderableOutput
}

const Child: FC<ChildProps> = props => {
  const text = ref('hi')
  return h('div', props.children?.({ text: text.value }) ?? null)
}

const Parent: FC = () => h(Child, ({ text }) => h('p', text))
```

```jsx
<Child>{({ text }) => <p>{text}</p>}</Child>
```

### 内置组件 {#built-in-components}

渲染函数里使用内置组件时，直接导入它们即可。当前文档中的核心内置组件包括 `Teleport`、`Transition` 和 `TransitionGroup`：

```tsx
import { h, Teleport, Transition, TransitionGroup } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const App: FC = () => h(Transition, { mode: 'out-in' })
```

这些组件在默认路径下同样直接消费 Renderable / children，而不要求你手动构造旧的对象桥接层。

### `v-model` {#v-model}

`v-model` 在手写渲染函数里需要你显式提供 `modelValue` 和 `onUpdate:modelValue`：

```tsx
import type { FC } from '@rue-js/rue'

interface Props {
  modelValue: string
  'onUpdate:modelValue'?: (value: string) => void
}

const MyInput: FC<Props> = props => {
  return (
    <input
      value={props.modelValue}
      onInput={event =>
        props['onUpdate:modelValue']?.((event.target as HTMLInputElement).value)
      }
    />
  )
}
```

### 自定义指令 {#custom-directives}

Rue 当前默认主入口没有额外公开的 render-function 指令包装 helper。需要指令时，优先在模板或 JSX 路径中使用它们；如果你在维护手写渲染边界，请把这类行为封装在组件或 DOM / block 边界里，而不是继续依赖旧的 compat helper。

### 模板 Refs {#template-refs}

模板 ref 当前更适合在模板或 JSX 路径中使用。对于手写 `h()` 边界，如需获取节点引用，优先通过显式回调 props、原始 DOM 节点或 mount handle 来建模，而不是继续依赖未公开的字符串 ref helper。

## 函数式组件 {#functional-components}

Rue 当前的函数式组件就是普通 `FC`：接收 props，直接返回渲染输出。它不需要 `this`，也不依赖额外的 setup 上下文。

```tsx
import type { FC } from '@rue-js/rue'

interface Props {
  message: string
  onSendMessage?: (message: string) => void
}

const MyComponent: FC<Props> = props => {
  return <button onClick={() => props.onSendMessage?.(props.message)}>{props.message}</button>
}
```

如果组件需要向父级发信号，优先把它建模成显式 callback props，例如 `onSendMessage`、`onClose`、`onUpdate:modelValue`。如果组件需要默认内容或 render prop，则继续使用 `props.children`。

函数组件可以像普通组件一样被导入、注册和消费；把函数传给 `h()` 的第一个参数时，它就会被视为组件。

### 函数式组件的类型定义<sup class="vt-badge ts" /> {#typing-functional-components}

大多数场景下，直接给 `FC<Props>` 标注类型就够了：

```tsx
import type { FC } from '@rue-js/rue'

interface MessageButtonProps {
  message: string
  onSendMessage?: (message: string) => void
}

const MessageButton: FC<MessageButtonProps> = props => {
  return (
    <button onClick={() => props.onSendMessage?.(props.message)}>{props.message}</button>
  )
}
```

如果你的组件还要接受 render prop，可以继续把它声明在 props 里：

```tsx
import type { FC, RenderableOutput } from '@rue-js/rue'

interface ListProps {
  items: string[]
  children?: (item: string, index: number) => RenderableOutput
}

const List: FC<ListProps> = props => {
  return (
    <ul>
      {props.items.map((item, index) => (
        <li key={item}>{props.children?.(item, index) ?? item}</li>
      ))}
    </ul>
  )
}
```
