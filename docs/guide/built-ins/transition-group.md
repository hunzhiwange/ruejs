# TransitionGroup (过渡组) {#transitiongroup}

`<TransitionGroup>` 是一个内置组件，用于为列表中渲染的元素或组件的插入、移除和顺序变化进行动画处理。

## 与 `<Transition>` 的区别 (Differences from `<Transition>`) {#differences-from-transition}

`<TransitionGroup>` 支持与 `<Transition>` 相同的 props、CSS 过渡类和 JavaScript 钩子监听器，但有以下区别：

- 默认情况下，它不渲染包装元素。但您可以使用 `tag` prop 指定要渲染的元素。

- [过渡模式](./transition#transition-modes) 不可用，因为我们不再在互斥元素之间交替。

- 内部的元素 **始终需要** 有一个唯一的 `key` 属性。

- CSS 过渡类将应用于列表中的单个元素，**而不是** 应用于组/容器本身。

:::tip
当在 [DOM 内模板](/guide/essentials/component-basics#in-dom-template-parsing-caveats) 中使用时，它应该引用为 `<transition-group>`。
:::

## 进入/离开过渡 (Enter / Leave Transitions) {#enter-leave-transitions}

以下是对 `v-for` 列表应用进入/离开过渡的示例：

```tsx
import { useState } from 'rue-js'
import { TransitionGroup } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = () => {
  const [items, setItems] = useState(['Item 1', 'Item 2', 'Item 3'])

  const addItem = () => {
    setItems([...items, `Item ${items.length + 1}`])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  return (
    <>
      <button onClick={addItem}>添加项目</button>
      <TransitionGroup name="list" tag="ul">
        {items.map((item, index) => (
          <li key={item} onClick={() => removeItem(index)}>
            {item}
          </li>
        ))}
      </TransitionGroup>
    </>
  )
}
```

```css
.list-enter-active,
.list-exit-active {
  transition: all 0.5s ease;
}
.list-enter,
.list-exit-to {
  opacity: 0;
  transform: translateX(30px);
}
```

## 移动过渡 (Move Transitions) {#move-transitions}

上面的演示有一些明显的缺陷：当插入或移除项目时，其周围的项目会立即 "跳" 到位置而不是平滑移动。我们可以通过添加一些额外的 CSS 规则来修复这个问题：

```css
.list-move, /* 对移动的元素应用过渡 */
.list-enter-active,
.list-exit-active {
  transition: all 0.5s ease;
}

.list-enter,
.list-exit-to {
  opacity: 0;
  transform: translateX(30px);
}

/* 确保离开的项目从布局流中移除，以便移动
   动画可以正确计算。 */
.list-exit-active {
  position: absolute;
}
```

现在看起来好多了 - 即使整个列表被打乱时也能平滑动画：

[完整示例](/examples/#list-transition)

### 自定义 TransitionGroup 类 (Custom TransitionGroup classes) {#custom-transitiongroup-classes}

您还可以通过向 `<TransitionGroup>` 传递 `moveClass` prop 来为移动元素指定自定义过渡类，就像 [`<Transition>` 上的自定义过渡类](/guide/built-ins/transition.html#custom-transition-classes) 一样。

## 交错列表过渡 (Staggering List Transitions) {#staggering-list-transitions}

通过与数据属性通信的 JavaScript 过渡，也可以在列表中交错过渡。首先，我们将项目的索引作为数据属性渲染在 DOM 元素上：

```tsx
<TransitionGroup
  tag="ul"
  css={false}
  onBeforeEnter={onBeforeEnter}
  onEnter={onEnter}
  onExit={onExit}
>
  {computedList.map((item, index) => (
    <li key={item.msg} data-index={index}>
      {item.msg}
    </li>
  ))}
</TransitionGroup>
```

然后，在 JavaScript 钩子中，我们根据数据属性为元素添加延迟动画。此示例使用 [GSAP 库](https://gsap.com/) 执行动画：

```tsx
const onEnter = (el: HTMLElement, done: () => void) => {
  gsap.to(el, {
    opacity: 1,
    height: '1.6em',
    delay: Number(el.dataset.index) * 0.15,
    onComplete: done,
  })
}
```

---

**相关**

- [`<TransitionGroup>` API 参考](/api/built-in-components#transitiongroup)
