# JSX/TSX 组件语法 {#jsx-tsx-syntax}

Rue 推荐使用 JSX/TSX 语法编写组件，作为单文件组件（SFC）的替代方案。JSX/TSX 提供了更好的 TypeScript 支持和更直观的 JavaScript/TypeScript 编程体验。

## 基本语法 {#basic-syntax}

Rue 组件使用函数组件形式：

```tsx
import { type FC } from '@rue-js/rue'

export const MyComponent: FC = () => {
  return <div>Hello, Rue!</div>
}
```

## 响应式状态 {#reactivity}

使用响应式 API 创建响应式状态：

```tsx
import { useState, type FC } from '@rue-js/rue'

export const Counter: FC = () => {
  const [count, setCount] = useState(0)

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>
}
```

## 使用 Props {#using-props}

为组件定义 props 类型：

```tsx
import { type FC } from '@rue-js/rue'

interface Props {
  title: string
  count?: number
}

export const MyComponent: FC<Props> = ({ title, count = 0 }) => {
  return (
    <div>
      <h1>{title}</h1>
      <p>Count: {count}</p>
    </div>
  )
}
```

## 使用子组件 {#using-components}

直接在 JSX 中使用导入的组件：

```tsx
import { type FC } from '@rue-js/rue'
import MyComponent from './MyComponent'

export const ParentComponent: FC = () => {
  return (
    <div>
      <MyComponent />
    </div>
  )
}
```

### 动态组件 {#dynamic-components}

使用变量作为组件：

```tsx
import { type FC } from '@rue-js/rue'
import Foo from './Foo'
import Bar from './Bar'

export const DynamicComponent: FC = () => {
  const Component = Math.random() > 0.5 ? Foo : Bar
  return <Component />
}
```

### 递归组件 {#recursive-components}

组件可以通过文件名隐式自引用。例如，名为 `FooBar.tsx` 的文件可以在其 JSX 中自引用为 `<FooBar/>`。

请注意，这比导入的组件优先级低。如果您有与组件推断名称冲突的命名导入，可以别名导入：

```js
import { FooBar as FooBarChild } from './components'
```

## 自定义指令 {#using-custom-directives}

在 Rue 的 JSX/TSX 中，全局注册的自定义指令通过 hooks 或 ref 回调实现：

```tsx
import { useEffect, useRef, type FC } from '@rue-js/rue'

export const MyComponent: FC = () => {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      // 自定义指令逻辑
      inputRef.current.focus()
    }
  }, [])

  return <input ref={inputRef} />
}
```

## 定义 Props 和 Emits {#defineprops-defineemits}

在 JSX/TSX 中，props 和 emits 通过 TypeScript 类型定义：

```tsx
import { type FC } from '@rue-js/rue'

// Props 类型定义
interface Props {
  foo: string
  bar?: number
}

// Emits 类型定义
type Emits = {
  change: (id: number) => void
  delete: () => void
}

export const MyComponent: FC<Props, Emits> = ({ foo, bar = 0 }, { emit }) => {
  return (
    <div>
      <p>{foo}</p>
      <button onClick={() => emit('change', 1)}>Change</button>
      <button onClick={() => emit('delete')}>Delete</button>
    </div>
  )
}
```

## 暴露属性 {#defineexpose} @todo

> **@todo**: `useImperativeHandle` 和 `forwardRef` 尚未实现。

在 JSX/TSX 中，使用 `useImperativeHandle` 暴露属性：

```tsx
import { useImperativeHandle, forwardRef, type FC } from '@rue-js/rue'

export interface MyComponentRef {
  a: number
  increment: () => void
}

export const MyComponent: FC<{}, {}, MyComponentRef> = forwardRef((props, ref) => {
  const a = 1
  const [b, setB] = useState(2)

  const increment = () => setB(b => b + 1)

  // 显式暴露属性
  useImperativeHandle(ref, () => ({
    a,
    increment,
  }))

  return <div>{b}</div>
})
```

当父级通过 ref 获取此组件的实例时，检索到的实例将具有 `{ a: number, increment: () => void }` 的形状。

## 使用 Slots 和 Attrs {#useslots-useattrs}

在 JSX/TSX 中，slots 和 attrs 作为 props 传递：

```tsx
import { type FC, type ReactNode } from '@rue-js/rue'

interface Props {
  children?: ReactNode
  header?: ReactNode
  footer?: ReactNode
}

export const Layout: FC<Props> = ({ children, header, footer, ...attrs }) => {
  return (
    <div {...attrs}>
      <header>{header}</header>
      <main>{children}</main>
      <footer>{footer}</footer>
    </div>
  )
}
```

## 顶层 await {#top-level-await} @todo

> **@todo**: 异步组件需要 `<Suspense>` 支持，当前尚未实现。

在组件函数内部使用 async/await：

```tsx
import { type FC } from '@rue-js/rue'

export const AsyncComponent: FC = async () => {
  const post = await fetch(`/api/post/1`).then(r => r.json())

  return <div>{post.title}</div>
}
```

:::warning 注意
`async` 组件必须与 [`Suspense`](/guide/built-ins/suspense.html) 结合使用。
:::

## 泛型组件 {#generics}

泛型类型参数可以在 TypeScript 中声明：

```tsx
import { type FC } from '@rue-js/rue'

interface Props<T> {
  items: T[]
  selected: T
}

export function GenericList<T>({ items, selected }: Props<T>) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} className={item === selected ? 'selected' : ''}>
          {item.name}
        </li>
      ))}
    </ul>
  )
}
```

## 限制 {#restrictions}

- **`<script setup>`** 不能与 `src` 属性一起使用，因为它依赖于组件的上下文。
- Rue 的 JSX/TSX 组件需要适当的构建工具配置以支持 JSX 转换。
