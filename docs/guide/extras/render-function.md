# 编译 JSX 与动态渲染 {#render-functions-jsx}

Rue 的渲染入口是经过编译的 JSX / TSX。源码由 Rue 编译器转换为静态 DOM、compiled core 或按能力选择的 Vapor 操作；应用代码不直接构造通用树对象。

> 如果你还没建立整体图景，请先阅读[渲染机制](/guide/guide/extras/rendering-mechanism)。

## 编译器是必需环节 {#compiler-required}

TypeScript 配置应保留 JSX，实际转换由 Rue 插件完成：

```json
{
  "compilerOptions": {
    "jsx": "preserve"
  }
}
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import rue from '@rue-js/vite-plugin-rue'

export default defineConfig({
  plugins: [rue()],
})
```

Rue 编译完成后会检查是否仍有 JSX AST。只要存在残留，构建就会在对应文件和语法位置失败。不要让 TypeScript、Babel 或其他转换器先以 automatic 模式降低 JSX；那会绕过 Rue 的语义入口。

## 创建渲染输出 {#creating-render-output}

函数组件直接返回 TSX：

```tsx
import { ref, type FC } from '@rue-js/rue'

interface Props {
  message: string
}

const Counter: FC<Props> = props => {
  const count = ref(0)

  return (
    <button onClick={() => (count.value += 1)}>
      {props.message}: {count}
    </button>
  )
}
```

静态结构、动态文本、属性和事件会由编译器分别归类。编译产物可能导入 `@rue-js/rue/internal` 的窄 helper；应用源码不应手写这些 helper。

### Ref 的最终展示自动解包 {#ref-display-unwrapping}

JSX child 表达式计算完成后，如果最终展示值是 Rue 标记的 Ref，运行时会自动读取一层 `.value`。这包括 `ref()` 和 `computed()` 返回的 Ref，也包括条件表达式选出的 Ref 和数组中的 Ref 叶子：

```tsx
import { computed, ref } from '@rue-js/rue'

const count = ref(0)
const doubled = computed(() => count.value * 2)
const ready = ref(true)

return (
  <div>
    <span>{count}</span>
    <span>{ready.value ? doubled : count}</span>
    <p>{[count, ' / ', doubled]}</p>
  </div>
)
```

自动解包仅限最终展示边界。表达式内部的计算、条件测试、事件处理和 DOM 属性仍使用 `.value`；Signal 仍使用 `get()`：

```tsx
import { ref, signal } from '@rue-js/rue'

const count = ref(0)
const enabled = ref(true)
const signalCount = signal(0)

return (
  <>
    <span>{count.value + 1}</span>
    <input disabled={!enabled.value} value={count.value} />
    <button onClick={() => count.value++}>加一</button>
    <span>{signalCount.get()}</span>
  </>
)
```

组件 Props 也不会在传递时解包：`<Child value={count}>` 传入的是 Ref 本身；只有子组件把 `props.value` 放到自己的 JSX child 最终展示位置时才会解包。Rue 只识别严格的 Ref 标记，不会因为普通对象含有 `value` 属性而解包，也不会把用于 DOM / 组件实例的 React 风格 `useRef` 当作响应式 Ref。

组件也可以返回文本、条件片段或多个根节点：

```tsx
const Message: FC<{ ready: boolean }> = props =>
  props.ready ? <strong>ready</strong> : <span>waiting</span>

const MultiRoot: FC = () => (
  <>
    <div>one</div>
    <div>two</div>
  </>
)
```

## 条件与列表 {#control-flow}

使用 JavaScript 表达式描述条件和列表：

```tsx
import { ref, type FC } from '@rue-js/rue'

const TodoList: FC = () => {
  const showDone = ref(false)
  const items = ref([
    { id: 1, text: '编译 JSX', done: true },
    { id: 2, text: '运行验证', done: false },
  ])

  return (
    <ul>
      {items.value
        .filter(item => showDone.value || !item.done)
        .map(item => (
          <li key={item.id}>{item.text}</li>
        ))}
    </ul>
  )
}
```

稳定列表项应提供 `key`，以便编译器和运行时保持身份及 DOM 区间。

## 事件和属性 {#events-and-attributes}

事件监听器使用 `onXxx` props；DOM 属性、attribute、`class` 和 `style` 直接写在 JSX 上：

```tsx
<button
  class={active.value ? 'active' : ''}
  aria-pressed={active.value}
  onClick={() => (active.value = !active.value)}
>
  切换
</button>
```

`.passive`、`.capture` 和 `.once` 可以拼在事件名后，例如 `onClickCapture` 和 `onKeyupOnce`。其他控制逻辑直接写在处理器中。

## 组件与动态身份 {#components}

已知组件直接使用其 JSX 标签：

```tsx
import UserCard from './UserCard'

const Profile = () => (
  <section>
    <UserCard name="Rue" />
  </section>
)
```

如果组件身份来自有限运行时选择，使用带字面量 `registry` 的 `<Component>` 边界：

```tsx
import { Component, type FC } from '@rue-js/rue'

const Card: FC = () => <article>Card</article>
const Panel: FC = () => <section>Panel</section>

const DynamicPanel: FC<{ kind: 'card' | 'panel' }> = props => (
  <Component is={props.kind} registry={{ card: Card, panel: Panel }} />
)
```

`registry` 必须是字面量有限映射，值必须是编译器可识别的静态组件工厂。不支持任意组件函数、全局字符串注册、MDX 组件模块或运行时 JSX factory。静态节点直接使用 TSX。

## Children、具名内容与 render prop {#rendering-slots}

默认内容读取 `props.children`。具名内容使用显式命名 props；需要把数据传回父组件时使用函数 prop：

```tsx
import type { FC, RenderableOutput } from '@rue-js/rue'

interface LayoutProps {
  footer?: (text: string) => RenderableOutput
  children?: RenderableOutput
}

const Layout: FC<LayoutProps> = props => (
  <section>
    <main>{props.children}</main>
    <footer>{props.footer?.('状态正常')}</footer>
  </section>
)

const Page = () => <Layout footer={text => <small>{text}</small>}>正文</Layout>
```

## 内置组件 {#built-in-components}

内置组件和普通组件一样显式导入并在 TSX 中使用：

```tsx
import { Teleport, Transition, TransitionGroup } from '@rue-js/rue'

const Overlay = () => (
  <Teleport to="body">
    <Transition mode="out-in">
      <div>overlay</div>
    </Transition>
  </Teleport>
)
```

## 模板 refs {#template-refs}

在 JSX 路径中使用 `useRef()` 返回的容器或函数 ref 持有 DOM / 组件实例。模板 ref 与带 `.value` 的响应式 ref 是两类不同概念。

## 函数组件类型 {#functional-components}

使用 `FC<Props>` 标注函数组件；需要 render prop 时将函数签名声明到 props：

```tsx
import type { FC, RenderableOutput } from '@rue-js/rue'

interface ListProps {
  items: string[]
  children?: (item: string, index: number) => RenderableOutput
}

const List: FC<ListProps> = props => (
  <ul>
    {props.items.map((item, index) => (
      <li key={item}>{props.children?.(item, index) ?? item}</li>
    ))}
  </ul>
)
```

编译器生成的 helper 和协议属于编译 ABI，不构成可手写的兼容接口。
