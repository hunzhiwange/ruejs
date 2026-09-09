# TypeScript 与 Composition API {#typescript-with-composition-api}

<ScrimbaLink href="https://scrimba.com/links/rue-ts-composition-api" title="免费的 Rue.js TypeScript 与 Composition API 课程" type="scrimba">
  在 Scrimba 上观看互动视频课程
</ScrimbaLink>

> 本页面假设你已经阅读了[使用 Rue 与 TypeScript](/guide/guide/typescript/overview)的概述。

本页示例统一使用 Rue 当前仓库里更常见的 TSX / 函数组件写法，风格与 Template Demo 一致：直接导入组合式 API，在组件函数体中声明响应式状态，在 JSX 中消费它们。

## 为组件 Props 添加类型 {#typing-component-props}

在 TSX 组件中，最直接的做法是把 props 类型写在组件签名上：

```tsx
import type { FC } from '@rue-js/rue'

type Tone = 'base' | 'primary' | 'accent'

type TileProps = {
  title: string
  meta: string
  tone?: Tone
}

const Tile: FC<TileProps> = props => (
  <article>
    <h3>{props.title}</h3>
    <p>{props.meta}</p>
  </article>
)
```

我们也可以把 props 类型提取到单独的接口中：

```tsx
import type { FC } from '@rue-js/rue'

interface DashboardShellProps {
  title: string
  subtitle?: string
}

const DashboardShell: FC<DashboardShellProps> = props => (
  <section>
    <h2>{props.title}</h2>
    {props.subtitle && <p>{props.subtitle}</p>}
  </section>
)
```

即使 `DashboardShellProps` 是从外部文件导入的也一样：

```tsx
import type { FC } from '@rue-js/rue'
import type { DashboardShellProps } from './types'

const DashboardShell: FC<DashboardShellProps> = props => <section>{props.title}</section>
```

### 复杂 prop 类型 {#complex-prop-types}

prop 可以像普通 TypeScript 类型一样组合与复用：

```tsx
import type { FC } from '@rue-js/rue'

interface Book {
  title: string
  author: string
  year: number
}

const BookCard: FC<{ book: Book }> = props => (
  <article>
    <h3>{props.book.title}</h3>
    <p>{props.book.author}</p>
  </article>
)
```

如果你除了静态类型，还需要显式声明运行时 `props` 选项，可以使用 `PropType`：

```tsx
import { defineComponent } from '@rue-js/rue'
import type { FC, PropType } from '@rue-js/rue'

interface Book {
  title: string
  author: string
  year: number
}

const BookCard: FC<{ book: Book }> = defineComponent({
  props: {
    book: Object as PropType<Book>,
  },
})
```

前一种写法适合纯 TSX 组件；后一种写法适合还需要运行时 prop 选项的场景。

## 为组件事件回调添加类型 {#typing-component-emits}

在当前这套 TSX 写法里，最直接的做法通常是把组件对外暴露的事件建模成函数 props：

```tsx
import type { FC } from '@rue-js/rue'

type ToolbarProps = {
  onModeChange?: (mode: 'ops' | 'growth') => void
  onBurstToggle?: (visible: boolean) => void
}

const Toolbar: FC<ToolbarProps> = props => {
  return (
    <div className="join">
      <button className="btn btn-sm join-item" onClick={() => props.onModeChange?.('ops')}>
        运维
      </button>
      <button className="btn btn-sm join-item" onClick={() => props.onModeChange?.('growth')}>
        增长
      </button>
      <button className="btn btn-sm join-item" onClick={() => props.onBurstToggle?.(true)}>
        展开
      </button>
    </div>
  )
}
```

这种方式有几个直接收益：

1. 事件名、参数类型和可选性都由 TypeScript 直接检查。
2. 父组件在 JSX 中传错参数类型时会立即报错。
3. 组件内部调用也不需要再切回额外的上下文对象。

如果你的组件 API 本身就更适合“回调 prop”模型，优先这样写通常更清晰。

## 为 `ref()` 添加类型 {#typing-ref}

`ref()` 会从初始值推断类型：

```ts
import { ref } from '@rue-js/rue'

// 推断类型: Ref<number>
const year = ref(2020)

// => TS 错误: Type 'string' is not assignable to type 'number'.
year.value = '2020'
```

有时我们需要为 ref 的内部值指定更复杂的联合类型。可以使用 `Ref` 工具类型：

```ts
import { ref } from '@rue-js/rue'
import type { Ref } from '@rue-js/rue'

const year: Ref<string | number> = ref('2020')

year.value = 2020 // 正确！
```

或者在调用 `ref()` 时直接传泛型参数：

```ts
// 结果类型: Ref<string | number>
const year = ref<string | number>('2020')

year.value = 2020 // 正确！
```

如果你提供了泛型类型参数但省略初始值，结果类型会自动包含 `undefined`：

```ts
// 推断类型: Ref<number | undefined>
const n = ref<number>()
```

Template Demo 里这些状态通常会直接写成字面量联合类型，例如：

```ts
import { ref } from '@rue-js/rue'

const mode = ref<'ops' | 'growth'>('ops')
const branchState = ref<'healthy' | 'warning' | 'critical'>('healthy')
```

这类写法很适合把 UI 状态限制在明确的有限集合内。

## 为 Signal 对象添加类型 {#typing-signal}

```ts
import { signal } from '@rue-js/rue'
interface Book {
  title: string
  year?: number
}
const book = signal<Book>({ title: 'Rue Guide' })
book.setPath('year', 2026)
const title = book.getPath('title') as string
```

根值类型由参数推断，也可显式提供泛型。路径读写使用动态键，调用者应按业务模型校验值类型。

## 为 `computed()` 添加类型 {#typing-computed}

`computed()` 会根据 getter 的返回值推断类型：

```ts
import { ref, computed } from '@rue-js/rue'

const count = ref(0)

// 推断类型: ComputedRef<number>
const double = computed(() => count.value * 2)

// => TS 错误: Property 'split' does not exist on type 'number'
const result = double.value.split('')
```

你也可以显式指定返回类型：

```ts
import { computed } from '@rue-js/rue'

const double = computed<number>(() => {
  return 2
})
```

如果 getter 最后没有返回数字，TypeScript 会立刻报错。

## 为事件处理器添加类型 {#typing-event-handlers}

处理原生 DOM 事件时，建议显式标注事件参数类型：

```tsx
function handleChange(event: Event) {
  console.log((event.target as HTMLInputElement).value)
}

const SearchBox = () => <input type="text" onChange={handleChange} />
```

如果没有类型注解，在开启 `"strict": true` 或 `"noImplicitAny": true` 时，你通常会得到隐式 `any` 的报错。访问 `target`、`currentTarget` 这类 DOM 属性时，也经常需要显式断言到具体元素类型。

## 为 Context 添加类型 {#typing-provide-inject}

Rue 的 Context 类型通常直接来自 `createContext()` 的默认值。建议先声明上下文值类型，再把 Context 放到独立模块里导出，这样 Provider 和 `useContext()` 会共享同一套类型约束。

```ts
import { createContext, useContext } from '@rue-js/rue'

type AuthContextValue = {
  userId: string | null
  login: (userId: string) => void
}

export const AuthContext = createContext<AuthContextValue>({
  userId: null,
  login: () => {},
})

const auth = useContext(AuthContext)
// auth 的类型: AuthContextValue
```

如果默认值里的字面量会把类型收得太窄，可以显式为 `createContext<T>()` 传入泛型参数。

与基于键的注入不同，Rue 的 `useContext()` 不会额外返回 `undefined`；当没有匹配的 Provider 时，它会回退到 `createContext()` 声明时的默认值。因此默认值应尽量保持完整，并为占位函数提供符合签名的空实现。

## 为模板 Refs 添加类型 {#typing-template-refs}

在 Rue 当前的 JSX / TSX 场景里，给 DOM 引用添加类型最直接的方式通常是 `useRef()`：

```tsx
import { type FC, useRef } from '@rue-js/rue'

const FocusInput: FC = () => {
  const inputRef = useRef<HTMLInputElement>()

  const focus = () => {
    inputRef.current?.focus?.()
  }

  return (
    <div>
      <input ref={inputRef} />
      <button onClick={focus}>聚焦</button>
    </div>
  )
}
```

要拿到正确的 DOM 接口，可以参考 MDN 上对应元素的类型说明，例如 `HTMLInputElement`、`HTMLTextAreaElement`、`HTMLButtonElement` 等。

因为引用在挂载前可能还不存在，所以访问 `current` 时应当使用可选链或显式判空。

## 为组件模板 Refs 添加类型 {#typing-component-template-refs}

引用子组件时，也可以用 `useRef()` 为实例添加类型。如果你只关心公共实例能力，可以使用 `ComponentPublicInstance`：

```tsx
import { type FC, useRef } from '@rue-js/rue'
import type { ComponentPublicInstance } from '@rue-js/rue'

const Parent: FC = () => {
  const childRef = useRef<ComponentPublicInstance>()

  return <Child ref={childRef} />
}
```

当你手里已经有更精确的公开实例类型时，可以把 `ComponentPublicInstance` 换成那个具体类型；如果组件只需要作为一个可拿到实例的边界使用，公共实例类型通常已经足够。
