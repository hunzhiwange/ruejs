# 组件事件 {#component-events}

> 本页面假设你已经阅读过[组件基础](/guide/essentials/component-basics)。如果你是组件的新手，请先阅读那部分内容。

## 触发和监听事件 {#emitting-and-listening-to-events}

在 Rue 中，组件通过回调 props 来与父组件通信。这与 Vue 的 `$emit` 不同，Rue 使用更直接的回调函数方式：

```tsx
// MyButton.tsx
interface MyButtonProps {
  onSomeEvent?: () => void
}

function MyButton({ onSomeEvent }: MyButtonProps) {
  return <button onClick={onSomeEvent}>Click Me</button>
}
```

父组件可以通过传递回调函数来监听事件：

```tsx
function Parent() {
  const handleSomeEvent = () => {
    console.log('Event received!')
  }

  return <MyButton onSomeEvent={handleSomeEvent} />
}
```

:::tip
与原生 DOM 事件不同，组件触发的事件**不会冒泡**。你只能监听直接子组件触发的事件。如果需要在兄弟组件或深层嵌套组件之间通信，可以使用 [全局状态管理解决方案](/guide/scaling-up/state-management)。
:::

## 事件参数 {#event-arguments}

有时触发事件时传递特定值很有用。例如，我们可能希望 `<BlogPost>` 组件负责决定文本放大的倍数。在这些情况下，我们可以向回调函数传递额外的参数：

```tsx
interface MyButtonProps {
  onIncreaseBy?: (n: number) => void
}

function MyButton({ onIncreaseBy }: MyButtonProps) {
  return <button onClick={() => onIncreaseBy?.(1)}>Increase by 1</button>
}
```

然后，当我们在父组件中监听事件时，可以直接在回调中访问事件参数：

```tsx
import { ref } from '@rue-js/rue'

function Parent() {
  const count = ref(0)

  const increaseCount = (n: number) => {
    count.value += n
  }

  return (
    <div>
      <p>Count: {count.value}</p>
      <MyButton onIncreaseBy={increaseCount} />
    </div>
  )
}
```

:::tip
传递给回调函数的所有参数都可以在监听器的参数中访问。例如，使用 `onFoo={(a, b, c) => ...}` 可以接收三个参数。
:::

## 声明事件回调 {#declaring-event-callbacks}

在 Rue 中，通过 TypeScript 接口显式声明组件的回调 props：

```tsx
interface MyComponentProps {
  onInFocus?: () => void
  onSubmit?: () => void
}

function MyComponent({ onInFocus, onSubmit }: MyComponentProps) {
  function buttonClick() {
    onSubmit?.()
  }

  return <button onClick={buttonClick}>Submit</button>
}
```

回调 props 也支持对象语法。如果使用 TypeScript，你可以为参数添加类型，这允许我们对触发事件的 payload 进行运行时验证：

```tsx
interface SubmitPayload {
  email: string
  password: string
}

interface MyComponentProps {
  onSubmit?: (payload: SubmitPayload) => void
}

function MyComponent({ onSubmit }: MyComponentProps) {
  function submitForm(email: string, password: string) {
    // 可以在这里进行验证
    if (!email || !password) {
      console.warn('Invalid submit payload!')
      return
    }
    onSubmit?.({ email, password })
  }

  return <button onClick={() => submitForm('test@test.com', 'password')}>Submit</button>
}
}
```

更多详情：[为组件事件添加类型](/guide/typescript/events) <sup class="vt-badge ts" />

虽然可选，但建议定义所有回调 props 以便更好地记录组件应该如何工作。这也允许 Rue 从 [透传属性](/guide/components/attrs) 中排除已知的监听器，避免由第三方代码手动分派的 DOM 事件引起的边界情况。

:::tip
如果回调 prop 的名称与原生事件相同（例如 `onClick`），监听器会监听组件触发的 `click` 事件，但也会响应原生的 `click` 事件。
:::

## 事件验证 {#events-validation}

与 prop 类型验证类似，如果使用 TypeScript 类型，触发的事件可以在编译时进行验证。

要在运行时添加验证，可以在组件内部实现验证逻辑：

```tsx
interface SubmitPayload {
  email: string
  password: string
}

interface MyComponentProps {
  onClick?: () => void
  onSubmit?: (payload: SubmitPayload) => void
}

function MyComponent({ onClick, onSubmit }: MyComponentProps) {
  function submitForm(email: string, password: string) {
    // 验证 submit 事件
    if (!email || !password) {
      console.warn('Invalid submit event payload!')
      return false
    }
    onSubmit?.({ email, password })
    return true
  }

  return <button onClick={() => submitForm('test@test.com', 'password')}>Submit</button>
}
```

## 使用 emitted 函数（高级） {#using-emitted-function}

对于更复杂的场景，Rue 提供了 `emitted` 辅助函数：

```tsx
import { emitted } from '@rue-js/rue'

interface MyComponentProps {
  onSubmit?: (payload: { email: string; password: string }) => void
}

function MyComponent(props: MyComponentProps) {
  const emit = emitted(props, ['onSubmit'])

  function submitForm(email: string, password: string) {
    emit('onSubmit', { email, password })
  }

  return <button onClick={() => submitForm('test@test.com', 'password')}>Submit</button>
}
```

:::warning
`emitted()` 主要用于与 Vue 兼容的场景或需要动态事件名的情况。推荐使用直接的回调 props 方式。
:::
