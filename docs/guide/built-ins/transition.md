# Transition (过渡) {#transition}

Rue 提供了两个内置组件来帮助处理响应状态变化的过渡和动画：

- `<Transition>` 用于在元素或组件进入和离开 DOM 时应用动画。本页将介绍此内容。

- `<TransitionGroup>` 用于在 `v-for` 列表中插入、移除或移动元素或组件时应用动画。这将在 [下一章](/guide/built-ins/transition-group) 中介绍。

除了这两个组件之外，我们还可以使用其他技术（如切换 CSS 类或通过样式绑定进行状态驱动动画）在 Rue 中应用动画。这些额外的技术在 [动画技术](/guide/extras/animation) 章节中介绍。

## `<Transition>` 组件 (The `<Transition>` Component) {#the-transition-component}

`<Transition>` 是一个内置组件：这意味着它可用于任何组件的模板中，无需注册。它可用于通过其默认插槽传递给它的元素或组件上应用进入和离开动画。进入或离开可以通过以下之一触发：

- 通过条件渲染
- 通过条件显示
- 通过动态组件切换
- 通过更改特殊的 `key` 属性

这是最基本的用法示例：

```tsx
import { useState } from '@rue-js/rue'
import { Transition } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const App: FC = () => {
  const [show, setShow] = useState(false)

  return (
    <>
      <button onClick={() => setShow(!show)}>切换</button>
      <Transition>{show && <p>你好</p>}</Transition>
    </>
  )
}
```

```css
/* 我们接下来会解释这些类的作用！ */
.rue-enter-active,
.rue-exit-active {
  transition: opacity 0.5s ease;
}

.rue-enter,
.rue-exit-to {
  opacity: 0;
}
```

:::tip
`<Transition>` 仅支持单个元素或组件作为其插槽内容。如果内容是组件，则该组件也必须只有一个根元素。
:::

当 `<Transition>` 组件中的元素被插入或移除时，会发生以下情况：

1. Rue 将自动嗅探目标元素是否应用了 CSS 过渡或动画。如果有，将在适当的时机添加/移除许多 [CSS 过渡类](#transition-classes)。

2. 如果有 [JavaScript 钩子](#javascript-hooks) 的监听器，这些钩子将在适当的时机被调用。

3. 如果没有检测到 CSS 过渡/动画且没有提供 JavaScript 钩子，插入和/或移除的 DOM 操作将在浏览器的下一个动画帧上执行。

## 基于 CSS 的过渡 (CSS-Based Transitions) {#css-based-transitions}

### 过渡类 (Transition Classes) {#transition-classes}

有六个类应用于进入/离开过渡。

![过渡图示](./images/transition-classes.png)

1. `rue-enter`：进入的起始状态。在元素插入之前添加，在元素插入后一帧移除。

2. `rue-enter-active`：进入的活动状态。在整个进入阶段应用。在元素插入之前添加，在过渡/动画完成时移除。此类可用于定义进入过渡的持续时间、延迟和缓动曲线。

3. `rue-enter-to`：进入的结束状态。在元素插入后一帧添加（同时移除 `rue-enter`），在过渡/动画完成时移除。

4. `rue-exit`：离开的起始状态。在触发离开过渡时立即添加，在一帧后移除。

5. `rue-exit-active`：离开的活动状态。在整个离开阶段应用。在触发离开过渡时立即添加，在过渡/动画完成时移除。此类可用于定义离开过渡的持续时间、延迟和缓动曲线。

6. `rue-exit-to`：离开的结束状态。在触发离开过渡后一帧添加（同时移除 `rue-exit`），在过渡/动画完成时移除。

`rue-enter-active` 和 `rue-exit-active` 使我们能够为进入/离开过渡指定不同的缓动曲线，我们将在以下部分看到示例。

### 命名过渡 (Named Transitions) {#named-transitions}

过渡可以通过 `name` prop 命名：

```tsx
<Transition name="fade">...</Transition>
```

对于命名过渡，其过渡类将以其名称而不是 `rue` 为前缀。例如，上述过渡应用的类将是 `fade-enter-active` 而不是 `rue-enter-active`。淡入过渡的 CSS 应该如下所示：

```css
.fade-enter-active,
.fade-exit-active {
  transition: opacity 0.5s ease;
}

.fade-enter,
.fade-exit-to {
  opacity: 0;
}
```

### CSS 过渡 (CSS Transitions) {#css-transitions}

`<Transition>` 最常与 [原生 CSS 过渡](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Transitions/Using_CSS_transitions) 结合使用，如上面的基本示例所示。`transition` CSS 属性是一个简写，允许我们指定过渡的多个方面，包括应该动画化的属性、过渡的持续时间以及 [缓动曲线](https://developer.mozilla.org/zh-CN/docs/Web/CSS/easing-function)。

这里有一个更高级的示例，过渡多个属性，进入和离开有不同的持续时间和缓动曲线：

```tsx
<Transition name="slide-fade">{show && <p>你好</p>}</Transition>
```

```css
/*
  进入和离开动画可以使用不同的
  持续时间和计时函数。
*/
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-exit-active {
  transition: all 0.8s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter,
.slide-fade-exit-to {
  transform: translateX(20px);
  opacity: 0;
}
```

### CSS 动画 (CSS Animations) {#css-animations}

[原生 CSS 动画](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Animations/Using_CSS_animations) 的应用方式与 CSS 过渡相同，不同之处在于 `*-enter` 在元素插入后不会立即移除，而是在 `animationend` 事件时移除。

对于大多数 CSS 动画，我们可以简单地在 `*-enter-active` 和 `*-exit-active` 类下声明它们。示例如下：

```tsx
<Transition name="bounce">
  {show && <p style={{ textAlign: 'center' }}>你好，这里是一些弹跳的文本！</p>}
</Transition>
```

```css
.bounce-enter-active {
  animation: bounce-in 0.5s;
}
.bounce-exit-active {
  animation: bounce-in 0.5s reverse;
}
@keyframes bounce-in {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}
```

### 自定义过渡类 (Custom Transition Classes) {#custom-transition-classes}

您还可以通过向 `<Transition>` 传递以下 props 来指定自定义过渡类：

- `enterClass`
- `enterActiveClass`
- `enterToClass`
- `exitClass`
- `exitActiveClass`
- `exitToClass`

这些将覆盖常规的类名。当您想将 Rue 的过渡系统与现有的 CSS 动画库（如 [Animate.css](https://daneden.github.io/animate.css/)）结合使用时，这特别有用：

```tsx
{
  /* 假设页面中包含 Animate.css */
}
;<Transition
  name="custom-classes"
  enterActiveClass="animate__animated animate__tada"
  exitActiveClass="animate__animated animate__bounceOutRight"
>
  {show && <p>你好</p>}
</Transition>
```

### 一起使用过渡和动画 (Using Transitions and Animations Together) {#using-transitions-and-animations-together}

Rue 需要附加事件监听器以知道过渡何时结束。它可以是 `transitionend` 或 `animationend`，取决于应用的 CSS 规则类型。如果您只使用其中一个，Rue 可以自动检测正确的类型。

但是，在某些情况下您可能希望在同一元素上同时拥有两者，例如，让 Rue 触发 CSS 动画，同时在悬停时有 CSS 过渡效果。在这些情况下，您必须通过传递 `type` prop 显式声明您希望 Rue 关注的类型，其值为 `animation` 或 `transition`：

```tsx
<Transition type="animation">...</Transition>
```

### 嵌套过渡和显式过渡持续时间 (Nested Transitions and Explicit Transition Durations) {#nested-transitions-and-explicit-transition-durations}

虽然过渡类只应用于 `<Transition>` 中的直接子元素，但我们可以使用嵌套 CSS 选择器来过渡嵌套元素：

```tsx
<Transition name="nested">
  {show && (
    <div className="outer">
      <div className="inner">你好</div>
    </div>
  )}
</Transition>
```

```css
/* 针对嵌套元素的规则 */
.nested-enter-active .inner,
.nested-exit-active .inner {
  transition: all 0.3s ease-in-out;
}

.nested-enter .inner,
.nested-exit-to .inner {
  transform: translateX(30px);
  opacity: 0;
}

/* ... 其他必要的 CSS 省略 */
```

我们甚至可以在进入时为嵌套元素添加过渡延迟，这会产生交错的进入动画序列：

```css
/* 延迟嵌套元素的进入以获得交错效果 */
.nested-enter-active .inner {
  transition-delay: 0.25s;
}
```

但是，这会产生一个小问题。默认情况下，`<Transition>` 组件尝试通过监听根过渡元素上的 **第一个** `transitionend` 或 `animationend` 事件来自动确定过渡何时完成。使用嵌套过渡时，期望的行为应该是等待所有内部元素的过渡完成。

在这种情况下，您可以使用 `<Transition>` 组件上的 `duration` prop 指定显式过渡持续时间（以毫秒为单位）。总持续时间应与内部元素的延迟加上过渡持续时间匹配：

```tsx
<Transition duration={550}>...</Transition>
```

如有必要，您还可以使用对象分别为进入和离开持续时间指定单独的值：

```tsx
<Transition duration={{ enter: 500, exit: 800 }}>...</Transition>
```

### 性能考虑 (Performance Considerations) {#performance-considerations}

您可能会注意到，上面显示的动画大多使用 `transform` 和 `opacity` 等属性。这些属性进行动画化很高效，因为：

1. 它们在动画期间不会影响文档布局，因此不会在每次动画帧上触发昂贵的 CSS 布局计算。

2. 大多数现代浏览器在动画化 `transform` 时可以利用 GPU 硬件加速。

相比之下，`height` 或 `margin` 等属性将触发 CSS 布局，因此动画化它们要昂贵得多，应谨慎使用。

## JavaScript 钩子 (JavaScript Hooks) {#javascript-hooks}

您可以通过监听 `<Transition>` 组件上的事件来用 JavaScript 钩入过渡过程：

```tsx
import { Transition } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const App: FC = () => {
  const onBeforeEnter = (el: HTMLElement) => {
    // 在元素插入 DOM 之前调用。
    // 使用它来设置元素的 "enter-from" 状态
  }

  const onEnter = (el: HTMLElement, done: () => void) => {
    // 在元素插入后一帧调用。
    // 使用它来启动进入动画。
    // 调用 done 回调以指示过渡结束
    // 与 CSS 一起使用时可选
    done()
  }

  const onAfterEnter = (el: HTMLElement) => {
    // 在进入过渡完成时调用。
  }

  const onEnterCancelled = (el: HTMLElement) => {
    // 在进入过渡在完成之前被取消时调用。
  }

  const onBeforeExit = (el: HTMLElement) => {
    // 在离开钩子之前调用。
    // 大多数时候，您应该只使用离开钩子
  }

  const onExit = (el: HTMLElement, done: () => void) => {
    // 在离开过渡开始时调用。
    // 使用它来启动离开动画。
    // 调用 done 回调以指示过渡结束
    // 与 CSS 一起使用时可选
    done()
  }

  const onAfterExit = (el: HTMLElement) => {
    // 在离开过渡完成且元素已从 DOM 中移除时调用。
  }

  const onExitCancelled = (el: HTMLElement) => {
    // 仅在 v-show 过渡中可用
  }

  return (
    <Transition
      onBeforeEnter={onBeforeEnter}
      onEnter={onEnter}
      onAfterEnter={onAfterEnter}
      onEnterCancelled={onEnterCancelled}
      onBeforeExit={onBeforeExit}
      onExit={onExit}
      onAfterExit={onAfterExit}
      onExitCancelled={onExitCancelled}
    >
      {/* ... */}
    </Transition>
  )
}
```

这些钩子可以与 CSS 过渡/动画结合使用，也可以单独使用。

当仅使用 JavaScript 过渡时，通常最好添加 `css={false}` prop。这明确告诉 Rue 跳过自动 CSS 过渡检测。除了稍微提高性能外，这还可以防止 CSS 规则意外干扰过渡：

```tsx
<Transition css={false}>...</Transition>
```

使用 `css={false}` 时，我们还完全负责控制过渡何时结束。在这种情况下，`onEnter` 和 `onExit` 钩子的 `done` 回调是必需的。否则，钩子将被同步调用，过渡将立即完成。

以下演示使用 [GSAP 库](https://gsap.com/) 执行动画。当然，您可以使用任何其他动画库，例如 [Anime.js](https://animejs.com/) 或 [Motion One](https://motion.dev/)：

## 可复用过渡 (Reusable Transitions) {#reusable-transitions}

过渡可以通过 Rue 的组件系统复用。要创建可复用的过渡，我们可以创建一个包装 `<Transition>` 组件并传递插槽内容的组件：

```tsx
// MyTransition.tsx
import { Transition } from '@rue-js/rue'
import type { FC, ReactNode } from '@rue-js/rue'

interface MyTransitionProps {
  children: ReactNode
}

const MyTransition: FC<MyTransitionProps> = ({ children }) => {
  return (
    <Transition name="my-transition" onEnter={onEnter} onExit={onExit}>
      {children}
    </Transition>
  )
}

export default MyTransition
```

```css
/*
  必要的 CSS...
  注意：避免在这里使用 <style scoped>，因为它
  不适用于插槽内容。
*/
```

现在 `MyTransition` 可以像内置版本一样导入和使用：

```tsx
import MyTransition from './MyTransition'

const App: FC = () => {
  const [show, setShow] = useState(false)

  return <MyTransition>{show && <div>你好</div>}</MyTransition>
}
```

## 出现时的过渡 (Transition on Appear) {#transition-on-appear}

如果您还想在节点初始渲染时应用过渡，可以添加 `appear` prop：

```tsx
<Transition appear>...</Transition>
```

## 元素之间的过渡 (Transition Between Elements) {#transition-between-elements}

除了使用条件渲染切换元素外，我们还可以使用互斥条件语句在两个元素之间进行过渡，只要确保在任何给定时刻只有一个元素被显示：

```tsx
<Transition>
  {docState === 'saved' && <button>编辑</button>}
  {docState === 'edited' && <button>保存</button>}
  {docState === 'editing' && <button>取消</button>}
</Transition>
```

## 过渡模式 (Transition Modes) {#transition-modes}

在前面的示例中，进入和离开元素同时动画化，我们必须使它们 `position: absolute` 以避免当两个元素都存在于 DOM 中时产生布局问题。

然而，在某些情况下这不是一个选项，或者根本不是期望的行为。我们可能希望离开元素先动画化出去，然后进入元素 **在** 离开动画完成后才插入。手动编排这样的动画将非常复杂 - 幸运的是，我们可以通过向 `<Transition>` 传递 `mode` prop 来启用此行为：

```tsx
<Transition mode="out-in">...</Transition>
```

这是使用 `mode="out-in"` 的前面的演示：

`<Transition>` 还支持 `mode="in-out"`，尽管它的使用频率要低得多。

## 组件之间的过渡 (Transition Between Components) {#transition-between-components}

`<Transition>` 也可以用于 [动态组件](/guide/essentials/component-basics#dynamic-components) 周围：

```tsx
import { useState } from '@rue-js/rue'
import { Transition, Dynamic } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const App: FC = () => {
  const [activeComponent, setActiveComponent] = useState('ComponentA')

  return (
    <Transition name="fade" mode="out-in">
      <Dynamic component={activeComponent} />
    </Transition>
  )
}
```

## 动态过渡 (Dynamic Transitions) {#dynamic-transitions}

`<Transition>` props 如 `name` 也可以是动态的！它允许我们基于状态变化动态应用不同的过渡：

```tsx
<Transition name={transitionName}>...</Transition>
```

当您使用 Rue 的过渡类约定定义了 CSS 过渡/动画并希望在不同过渡之间切换时，这很有用。

您还可以基于组件的当前状态在 JavaScript 过渡钩子中应用不同的行为。最后，创建动态过渡的终极方式是通过 [可复用过渡组件](#reusable-transitions) 接受 props 来改变要使用的过渡性质。这听起来可能有点老套，但唯一的限制真的是您的想象力。

## 使用 Key 属性的过渡 (Transitions with the Key Attribute) {#transitions-with-the-key-attribute}

有时您需要强制重新渲染 DOM 元素以使过渡发生。

以这个计数器组件为例：

```tsx
import { useState, useEffect } from '@rue-js/rue'
import { Transition } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const Counter: FC = () => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => c + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Transition>
      <span key={count}>{count}</span>
    </Transition>
  )
}
```

如果我们排除了 `key` 属性，只有文本节点会被更新，因此不会发生过过渡。但是，有了 `key` 属性，Rue 就知道在 `count` 变化时创建一个新的 `span` 元素，因此 `Transition` 组件有 2 个不同的元素可以在它们之间进行过渡。

---

**相关**

- [`<Transition>` API 参考](/api/built-in-components#transition)
