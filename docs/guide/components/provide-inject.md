# Provide / Inject {#provide-inject}

> 本页面假设你已经阅读过[组件基础](/guide/essentials/component-basics)。如果你是组件的新手，请先阅读那部分内容。

## Prop Drilling {#prop-drilling}

通常，当我们需要将数据从父组件传递给子组件时，我们使用 [props](/guide/components/props)。然而，想象一下我们有一个大型组件树，一个深层嵌套的组件需要来自遥远祖先组件的数据。如果只用 props，我们将不得不在整个父链中传递相同的 prop：

![prop drilling diagram](./images/prop-drilling.png)

<!-- https://www.figma.com/file/yNDTtReM2xVgjcGVRzChss/prop-drilling -->

注意，虽然 `<Footer>` 组件可能根本不关心这些 props，但它仍然需要声明并传递它们，以便 `<DeepChild>` 可以访问它们。如果父链更长，沿途会有更多组件受到影响。这被称为"prop drilling"，绝对不是一件有趣的事情。

我们可以用 `provide` 和 `inject` 来解决 prop drilling。父组件可以作为其所有后代的**依赖提供者**。后代树中的任何组件，无论多深，都可以**注入**由其父链中上游组件提供的依赖。

![Provide/inject scheme](./images/provide-inject.png)

<!-- https://www.figma.com/file/PbTJ9oXis5KUawEOWdy2cE/provide-inject -->

## Provide {#provide}

要向组件的后代提供数据，使用 [`provide()`](/api/composition-api-dependency-injection#provide) 函数：

```tsx
import { provide } from 'rue-js'

provide(/* key */ 'message', /* value */ 'hello!')
```

`provide()` 函数接受两个参数。第一个参数被称为**注入键**，可以是字符串或 `Symbol`。注入键被后代组件用于查找要注入的所需值。单个组件可以调用 `provide()` 多次，使用不同的注入键来提供不同的值。

第二个参数是提供的值。该值可以是任何类型，包括响应式状态，如 refs：

```tsx
import { ref, provide } from 'rue-js'

const count = ref(0)
provide('key', count)
```

提供响应式值允许使用提供值的后代组件与提供者组件建立响应式连接。

## 应用级 Provide {#app-level-provide}

除了在组件中提供数据，我们还可以在应用级别提供：

```tsx
import { createApp } from 'rue-js'

const app = createApp({})

app.provide(/* key */ 'message', /* value */ 'hello!')
```

应用级提供对所有在应用中渲染的组件都可用。这在编写 [插件](/guide/reusability/plugins) 时特别有用，因为插件通常无法使用组件来提供值。

## Inject {#inject}

要注入由祖先组件提供的数据，使用 [`inject()`](/api/composition-api-dependency-injection#inject) 函数：

```tsx
import { inject } from 'rue-js'

const message = inject('message')
```

如果多个父组件使用相同的键提供数据，inject 将解析为组件父链中最接近的父组件的值。

如果提供的值是 ref，它将被原样注入，并且**不会**自动解包。这允许注入器组件保留与提供者组件的响应式连接。

[完整的 provide + inject 响应式示例](https://play.rue-jsjs.org/#eNqFUUFugzAQ/MrKF1IpxfeIVKp66Kk/8MWFDXYFtmUbpArx967BhURRU9/WOzO7MzuxV+fKcUB2YlWovXYRAsbBvQije2d9hAk8Xo7gvB11gzDDxdseCuIUG+ZN6a7JjZIvVRIlgDCcw+d3pmvTglz1okJ499I0C3qB1dJQT9YRooVaSdNiACWdQ5OICj2WwtTWhAg9hiBbhHNSOxQKu84WT8LkNQ9FBhTHXyg1K75aJHNUROxdJyNSBVBp44YI43NvG+zOgmWWYGt7dcipqPhGZEe2ef07wN3lltD+lWN6tNkV/37+rdKjK2rzhRTt7f3u41xhe37/xJZGAL2PLECXa9NKdD/a6QTTtGnP88LgiXJtYv4BaLHhvg==)

### 注入默认值 {#injection-default-values}

默认情况下，`inject` 假设注入键在父链的某个地方被提供。如果键未被提供，将会有一个运行时警告。

如果我们希望注入的属性与可选的提供者一起工作，我们需要声明一个默认值，类似于 props：

```tsx
// 如果未提供与 "message" 匹配的数据，
// `value` 将是 "default value"
const value = inject('message', 'default value')
```

在某些情况下，默认值可能需要通过调用函数或实例化新类来创建。为了避免在可选值未被使用时进行不必要的计算或副作用，我们可以使用工厂函数来创建默认值：

```tsx
const value = inject('key', () => new ExpensiveClass(), true)
```

第三个参数表示默认值应被视为工厂函数。

## 使用响应式数据 {#working-with-reactivity}

当使用响应式 provide / inject 值时，**建议尽可能将对响应式状态的任何更改保留在提供者内部**。这确保了提供的状态及其可能的更改位于同一组件中，使未来更容易维护。

有时我们可能需要从注入器组件更新数据。在这种情况下，我们建议提供一个负责更改状态的函数：

```tsx{7-9,13}
<!-- 在提供者组件内部 -->
import { provide, ref } from 'rue-js'

const location = ref('North Pole')

function updateLocation() {
  location.value = 'South Pole'
}

provide('location', {
  location,
  updateLocation
})
```

```tsx{5}
<!-- 在注入器组件中 -->
import { inject } from 'rue-js'

const { location, updateLocation } = inject('location')
```

最后，如果你想确保通过 `provide` 传递的数据不能被注入器组件更改，可以使用 [`readonly()`](/api/reactivity-core#readonly) 包装提供的值：

```tsx
import { ref, provide, readonly } from 'rue-js'

const count = ref(0)
provide('read-only-count', readonly(count))
```

## 使用 Symbol 键 {#working-with-symbol-keys}

到目前为止，我们在示例中一直使用字符串注入键。如果你在有许多依赖提供者的大型应用中工作，或者你正在编写将被其他开发者使用的组件，最好使用 [Symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol) 注入键以避免潜在的冲突。

建议在专用文件中导出 Symbols：

```tsx [keys.ts]
export const myInjectionKey = Symbol()
```

```tsx
// 在提供者组件中
import { provide } from 'rue-js'
import { myInjectionKey } from './keys.ts'

provide(myInjectionKey, {
  /* 要提供的数据 */
})
```

```tsx
// 在注入器组件中
import { inject } from 'rue-js'
import { myInjectionKey } from './keys.ts'

const injected = inject(myInjectionKey)
```

参见：[为 Provide / Inject 添加类型](/guide/typescript/provide-inject) <sup class="vt-badge ts" />

## 使用 Context API（React 风格）{#using-context-api}

Rue 也支持 React 风格的 Context API，这在某些场景下可能更直观：

```tsx
import { createContext, useContext } from 'rue-js'

// 创建 Context
const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
})

// 提供者组件
function ThemeProvider({ children }) {
  const theme = ref('light')

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

// 消费者组件
function ThemedButton() {
  const { theme, toggleTheme } = useContext(ThemeContext)

  return (
    <button class={theme.value} onClick={toggleTheme}>
      Toggle Theme
    </button>
  )
}
```

这是使用 Context API 的另一种方式，你可以选择最适合你应用的方式。
