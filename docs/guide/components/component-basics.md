# 组件基础 {#component-basics}

组件允许我们将 UI 划分为独立的、可复用的部分，并且可以对每个部分进行单独思考。在实际应用中，组件常常被组织成层层嵌套的树状结构：

![Component Tree](./images/components.png)

<!-- https://www.figma.com/file/qa7WHDQRWu7ZJ7Fm8r9ZR1/Component-Tree -->

这和我们嵌套 HTML 元素的方式类似，Rue 实现了自己的组件模型，使我们可以在使用 TSX/JSX 编写时获得更好的开发体验。

## 定义组件 {#defining-a-component}

在 Rue 中，组件是一个返回 TSX/JSX 的函数：

```tsx
// Button.tsx
function Button() {
  return <button>I'm a button</button>
}
```

这个组件可以在其他组件的 TSX 中导入并使用：

```tsx
import { Button } from './Button'

function App() {
  return (
    <div>
      <h1>Welcome to my app</h1>
      <Button />
    </div>
  )
}
```

## 使用 Props {#using-props}

子组件可以通过 props 接受来自父组件的数据。在 Rue 中，props 通过 TypeScript 接口声明：

```tsx
// BlogPost.tsx
interface BlogPostProps {
  title: string
}

function BlogPost({ title }: BlogPostProps) {
  return <h4>{title}</h4>
}
```

父组件可以通过传递 props 给子组件：

```tsx
import { BlogPost } from './BlogPost'

function App() {
  return (
    <div>
      <BlogPost title="My journey with Vue" />
      <BlogPost title="Blogging with Vue" />
    </div>
  )
}
```

## 监听事件 {#listening-to-events}

在 Rue 中，子组件通过回调 props 与父组件通信：

```tsx
// Counter.tsx
import { ref } from '@rue-js/rue'

interface CounterProps {
  onIncrement?: () => void
}

function Counter({ onIncrement }: CounterProps) {
  const count = ref(0)

  function increment() {
    count.value++
    onIncrement?.()
  }

  return <button onClick={increment}>Count is: {count.value}</button>
}
```

父组件可以监听这些事件：

```tsx
import { Counter } from './Counter'

function App() {
  function handleIncrement() {
    console.log('Counter was incremented!')
  }

  return <Counter onIncrement={handleIncrement} />
}
```

## 使用插槽 {#using-slots}

插槽允许父组件向子组件传递内容：

```tsx
// AlertBox.tsx
interface AlertBoxProps {
  children?: React.ReactNode
}

function AlertBox({ children }: AlertBoxProps) {
  return (
    <div class="alert-box">
      <strong>Error!</strong>
      <br />
      {children}
    </div>
  )
}
```

父组件可以传递内容：

```tsx
import { AlertBox } from './AlertBox'

function App() {
  return <AlertBox>Something bad happened.</AlertBox>
}
```

## 动态组件 {#dynamic-components}

有时我们需要动态切换不同的组件：

```tsx
import { ref } from '@rue-js/rue'
import { Home } from './Home'
import { About } from './About'
import { Posts } from './Posts'

function App() {
  const currentTab = ref('Home')

  const tabs = {
    Home,
    About,
    Posts,
  }

  const CurrentComponent = tabs[currentTab.value]

  return (
    <div>
      <button onClick={() => (currentTab.value = 'Home')}>Home</button>
      <button onClick={() => (currentTab.value = 'About')}>About</button>
      <button onClick={() => (currentTab.value = 'Posts')}>Posts</button>

      <CurrentComponent />
    </div>
  )
}
```

## 组件注册 {#component-registration}

在 Rue 中，组件不需要显式注册。只需导入并在 TSX 中使用即可：

```tsx
import { ComponentA } from './ComponentA'
import { ComponentB } from './ComponentB'

function App() {
  return (
    <div>
      <ComponentA />
      <ComponentB />
    </div>
  )
}
```

这被称为局部注册。这种方式更利于 tree-shaking，并且依赖关系更加明确。

## 传递 Props 的简写 {#passing-props-shorthand}

如果要传递给组件的 prop 名与变量名相同，可以使用简写：

```tsx
// 完整语法
<BlogPost title={post.title} />

// 简写（如果 prop 名与变量名相同）
<BlogPost title />
```

## 组件命名 {#component-naming}

组件名应该使用 PascalCase：

```tsx
// 正确
function MyComponent() {
  return <div>Hello</div>
}

// 错误
function myComponent() {
  return <div>Hello</div>
}
```

这使得组件在 TSX 中与 HTML 元素区分开来。
