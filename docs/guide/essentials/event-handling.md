# 事件处理 {#event-handling}

## 监听事件 {#listening-to-events}

在 Rue 中，我们使用 JSX 的事件处理器属性来监听 DOM 事件并在触发时运行 JavaScript。事件处理器使用 `on` 前缀，例如 `onClick`、`onInput`、`onSubmit` 等。

事件处理器的值可以是以下之一：

1. **内联处理器：** 内联 JavaScript，在事件触发时执行（类似于原生的 `onclick` 属性）。

2. **方法处理器：** 指向组件上定义的方法的函数。

## 内联处理器 {#inline-handlers}

内联处理器通常用于简单的情况，例如：

```tsx
import { ref } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const Counter: FC = () => {
  const count = ref(0)

  return (
    <div>
      <button onClick={() => count.value++}>加 1</button>
      <p>计数：{count.value}</p>
    </div>
  )
}
```

## 方法处理器 {#method-handlers}

然而，许多事件处理器的逻辑会更复杂，内联处理器可能不太可行。这就是为什么我们可以将事件处理器绑定到组件中定义的函数。

例如：

```tsx
import { ref } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const Greeter: FC = () => {
  const name = ref('Rue.js')

  function greet(event: MouseEvent) {
    alert(`你好 ${name.value}！`)
    // `event` 是原生 DOM 事件
    if (event) {
      alert(event.target.tagName)
    }
  }

  return <button onClick={greet}>问候</button>
}
```

方法处理器会自动接收触发它的原生 DOM 事件对象——在上面的示例中，我们能够通过 `event.target` 访问调度事件的元素。

另请参见：[为事件处理器添加类型](/guide/typescript/composition-api#typing-event-handlers) <sup class="vt-badge ts" />

### 方法 vs 内联检测 {#method-vs-inline-detection}

在 JSX 中，内联处理器和方法处理器都是通过将函数传递给事件属性来使用的。区别纯粹在于代码组织和可读性。

## 在内联处理器中调用方法 {#calling-methods-in-inline-handlers}

除了直接绑定到方法名，我们也可以在内联处理器中调用方法。这允许我们向方法传递自定义参数而不是原生事件：

```tsx
import type { FC } from '@rue-js/rue'

const Messenger: FC = () => {
  function say(message: string) {
    alert(message)
  }

  return (
    <div>
      <button onClick={() => say('你好')}>说你好</button>
      <button onClick={() => say('再见')}>说再见</button>
    </div>
  )
}
```

## 在内联处理器中访问事件参数 {#accessing-event-argument-in-inline-handlers}

有时我们也需要在内联处理器中访问原始 DOM 事件。你可以将事件作为参数传递给方法：

```tsx
import type { FC } from '@rue-js/rue'

const Form: FC = () => {
  function warn(message: string, event?: Event) {
    // 现在我们可以访问原生事件
    if (event) {
      event.preventDefault()
    }
    alert(message)
  }

  return <button onClick={e => warn('表单还不能提交', e)}>提交</button>
}
```

## 事件修饰符 {#event-modifiers}

在事件处理器中调用 `event.preventDefault()` 或 `event.stopPropagation()` 是非常常见的需求。虽然我们可以很容易地在方法中做到这一点，但如果方法能够纯粹关于数据逻辑而不必处理 DOM 事件细节，那会更好。

Rue 提供了一些工具函数来处理常见的事件修饰需求：

```tsx
import { withModifiers } from '@rue-js/rue'

// 阻止事件冒泡
<button onClick={withModifiers(() => doThis(), ['stop'])}>
  点击
</button>

// 阻止默认行为
<form onSubmit={withModifiers(onSubmit, ['prevent'])}>
  {/* ... */}
</form>

// 修饰符可以链式使用
<a onClick={withModifiers(() => doThat(), ['stop', 'prevent'])}>
  链接
</a>

// 仅当 event.target 是元素本身时才触发处理器
// 即不是来自子元素
<div onClick={withModifiers(() => doThat(), ['self'])}>
  {/* ... */}
</div>
```

::: tip
使用修饰符时顺序很重要，因为相关代码以相同顺序生成。因此 `withModifiers(fn, ['prevent', 'self'])` 会阻止元素本身及其子元素的默认行为，而 `withModifiers(fn, ['self', 'prevent'])` 只会阻止元素本身的默认行为。
:::

`.capture`、`.once` 和 `.passive` 修饰符镜像 [原生 `addEventListener` 方法的选项](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#options)：

```tsx
// 在添加事件监听器时使用捕获模式
// 即针对内部元素的事件在此处处理
// 然后才由该元素处理
<div onClickCapture={doThis}>
  {/* ... */}
</div>

// 点击事件最多触发一次
<a onClick={withModifiers(() => doThis(), ['once'])}>
  链接
</a>
```

`.passive` 修饰符通常与触摸事件监听器一起用于 [提高移动设备上的性能](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#improving_scroll_performance_using_passive_listeners)。

::: tip
不要同时使用 `.passive` 和 `.prevent`，因为 `.passive` 已经向浏览器表明你*不*打算阻止事件的默认行为，如果你这样做，很可能会看到浏览器的警告。
:::

## 按键修饰符 {#key-modifiers}

在监听键盘事件时，我们经常需要检查特定的键。Rue 允许在监听键盘事件时添加键修饰符：

```tsx
// 只有当 `key` 是 `Enter` 时才调用 `submit`
;<input onKeyUp={e => e.key === 'Enter' && submit()} />

// 或者使用辅助函数
function onEnter(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handler()
    }
  }
}

;<input onKeyUp={onEnter(submit)} />
```

你可以直接使用通过 [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values) 暴露的任何有效键名作为修饰符，将它们转换为 camelCase。

### 键别名 {#key-aliases}

以下是常用键的快捷方式：

```tsx
// 常用键处理函数
const onEnter = (fn: () => void) => (e: KeyboardEvent) => e.key === 'Enter' && fn()
const onTab = (fn: () => void) => (e: KeyboardEvent) => e.key === 'Tab' && fn()
const onEsc = (fn: () => void) => (e: KeyboardEvent) => e.key === 'Escape' && fn()
const onSpace = (fn: () => void) => (e: KeyboardEvent) => e.key === ' ' && fn()
const onUp = (fn: () => void) => (e: KeyboardEvent) => e.key === 'ArrowUp' && fn()
const onDown = (fn: () => void) => (e: KeyboardEvent) => e.key === 'ArrowDown' && fn()
const onLeft = (fn: () => void) => (e: KeyboardEvent) => e.key === 'ArrowLeft' && fn()
const onRight = (fn: () => void) => (e: KeyboardEvent) => e.key === 'ArrowRight' && fn()
```

### 系统修饰键 {#system-modifier-keys}

你可以使用以下检查来仅在按下相应修饰键时触发鼠标或键盘事件监听器：

```tsx
// Alt + Enter
<input
  onKeyUp={(e) => e.key === 'Enter' && e.altKey && clear()}
/>

// Ctrl + 点击
<div
  onClick={(e) => e.ctrlKey && doSomething()}
>
  做点什么
</div>
```

::: tip 注意
注意修饰键与普通键不同，当与 `keyup` 事件一起使用时，它们必须在事件发出时被按下。换句话说，`keyup` 配合 Ctrl 只会在你按住 Ctrl 时释放某个键才会触发。如果你只释放 Ctrl 键，它不会触发。
:::

### 精确修饰符 {#exact-modifier}

你可以精确控制系统修饰键的组合来触发事件：

```tsx
// 即使还按下了 Alt 或 Shift 也会触发
<button
  onClick={(e) => e.ctrlKey && onClick()}
>
  A
</button>

// 只有当 Ctrl 被按下且没有其他键时才会触发
<button
  onClick={(e) => e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && onCtrlClick()}
>
  A
</button>

// 只有当没有系统修饰键被按下时才会触发
<button
  onClick={(e) => !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && onClick()}
>
  A
</button>
```

## 鼠标按钮修饰符 {#mouse-button-modifiers}

你可以通过检查 `event.button` 来限制处理器仅由特定鼠标按钮触发的事件：

```tsx
// 左键 (0)
<div onClick={(e) => e.button === 0 && handler()}>左键</div>

// 中键 (1)
<div onClick={(e) => e.button === 1 && handler()}>中键</div>

// 右键 (2)
<div onClick={(e) => e.button === 2 && handler()}>右键</div>
```

注意，`.left`、`.right` 和 `.middle` 修饰符名称基于典型的右手鼠标布局，但实际上分别代表"主"、"辅助"和"次"指针设备事件触发器，而不是实际的物理按钮。因此对于左手鼠标布局，"主"按钮在物理上可能是右边的，但会触发左键修饰符处理器。或者触控板可能用单指点击触发左键处理器，双指点击触发右键处理器，三指点击触发中键处理器。同样，其他设备和事件源生成"鼠标"事件可能有与"左"和"右"完全无关的触发模式。
