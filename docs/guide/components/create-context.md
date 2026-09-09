# Create Context {#create-context}

> 本页面假设你已经阅读过[组件基础](/guide/guide/essentials/component-basics)。如果你是组件的新手，请先阅读那部分内容。

## 为什么使用 Context {#why-context}

通常，当我们需要将数据从父组件传递给深层后代组件时，会先想到使用 [props](/guide/guide/components/props)。但当组件层级变深时，同一份数据需要沿着整条父链逐层透传，即使中间组件并不真正使用它。

这种场景通常被称为 prop drilling。它会让中间层组件承担额外的传参职责，也会让组件边界变得更难维护。

Rue 当前推荐使用 Context API 来解决这类跨层级共享状态的问题。Context 允许你在祖先组件中集中提供一份共享值，并让任意后代组件直接读取它，而不需要中间组件重复转发 props。

如果你想先看一个完整可运行的例子，可以直接打开 [Context 示例](/examples/context)。

## 创建 Context {#create}

使用 `createContext()` 创建一个可跨组件共享的上下文对象：

```tsx
import { createContext } from '@rue-js/rue'
import { ref } from '@rue-js/rue'

export const ThemeContext = createContext({
  theme: ref('light'),
  toggleTheme: () => {},
})
```

`createContext()` 接受一个默认值。当组件树中不存在匹配的 Provider 时，消费者会读取到这份默认值。

建议把 Context 定义放在单独文件中导出，便于提供者和消费者复用同一个上下文对象。

## 提供 Context {#provider}

创建好 Context 后，可以通过 Provider 向后代组件提供实际值：

```tsx
import { ref } from '@rue-js/rue'
import { ThemeContext } from './theme-context'

function ThemeProvider(props: { children?: any }) {
  const theme = ref('light')

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>{props.children}</ThemeContext.Provider>
  )
}
```

Provider 会把 `value` 传给其整个子树中的所有消费者。越靠近消费者的 Provider，优先级越高。

## 使用 Context {#consume}

后代组件可以通过 `useContext()` 读取最近的 Provider 值：

```tsx
import { useContext } from '@rue-js/rue'
import { ThemeContext } from './theme-context'

function ThemeButton() {
  const { theme, toggleTheme } = useContext(ThemeContext)

  return (
    <button class={theme.value} onClick={toggleTheme}>
      Toggle Theme
    </button>
  )
}
```

如果组件树中没有对应的 Provider，`useContext()` 会回退到 `createContext()` 时传入的默认值。

## 与响应式状态配合 {#reactivity}

Context 很适合承载 refs、computed 值和状态修改函数。推荐把状态和修改逻辑一起放在 Provider 中，再把只读数据或受控操作暴露给消费者。

```tsx
import { createContext, computed, ref, useContext } from '@rue-js/rue'

const CartContext = createContext({
  count: computed(() => 0),
  addItem: () => {},
})

function CartProvider(props: { children?: any }) {
  const count = ref(0)

  function addItem() {
    count.value += 1
  }

  const visibleCount = computed(() => count.value)
  return (
    <CartContext.Provider value={{ count: visibleCount, addItem }}>
      {props.children}
    </CartContext.Provider>
  )
}

function CartButton() {
  const { count, addItem } = useContext(CartContext)

  return <button onClick={addItem}>Cart: {count.value}</button>
}
```

这种写法可以把状态更新集中在 Provider 内部，避免多个消费者同时直接修改共享状态。

## 最佳实践 {#best-practices}

- 优先把 Context 定义放到独立模块，避免在多个文件里重复创建。
- 默认值应尽量完整，确保组件在缺少 Provider 时也有明确行为。
- 对共享响应式状态，优先暴露修改函数，而不是把可变实现细节直接散给所有消费者。
- 如果某份数据只在父子两层之间使用，仍然优先考虑 props；Context 更适合跨层级共享。
