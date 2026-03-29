<script setup>
import ElasticHeader from './demos/ElasticHeader.vue'
import DisabledButton from './demos/DisabledButton.vue'
import Colors from './demos/Colors.vue'
import AnimateWatcher from './demos/AnimateWatcher.vue'
</script>

# 动画技巧 {#animation-techniques}

Rue 提供了 [`<Transition>`](/guide/built-ins/transition) 和 [`<TransitionGroup>`](/guide/built-ins/transition-group) 组件用于处理进入/离开和列表过渡。然而，还有许多其他在 Web 上使用动画的方式，即使在 Rue 应用中也是如此。这里我们将讨论一些额外的技术。

## 基于类的动画 {#class-based-animations}

对于不进入/离开 DOM 的元素，我们可以通过动态添加 CSS 类来触发动画：

<div class="composition-api">

```tsx
import { ref } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const App: FC = () => {
  const disabled = ref(false)

  const warnDisabled = () => {
    disabled.value = true
    setTimeout(() => {
      disabled.value = false
    }, 1500)
  }

  return (
    <div class={disabled.value ? 'shake' : ''}>
      <button onClick={warnDisabled}>点击我</button>
      {disabled.value && <span>此功能已禁用！</span>}
    </div>
  )
}
```

</div>

```css
.shake {
  animation: shake 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  transform: translate3d(0, 0, 0);
}

@keyframes shake {
  10%,
  90% {
    transform: translate3d(-1px, 0, 0);
  }

  20%,
  80% {
    transform: translate3d(2px, 0, 0);
  }

  30%,
  50%,
  70% {
    transform: translate3d(-4px, 0, 0);
  }

  40%,
  60% {
    transform: translate3d(4px, 0, 0);
  }
}
```

<DisabledButton />

## 状态驱动的动画 {#state-driven-animations}

一些过渡效果可以通过插值值来应用，例如在交互发生时将样式绑定到元素。以这个例子为例：

<div class="composition-api">

```tsx
import { ref } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const App: FC = () => {
  const x = ref(0)

  const onMousemove = (e: MouseEvent) => {
    x.value = e.clientX
  }

  return (
    <div
      onMouseMove={onMousemove}
      style={{ backgroundColor: `hsl(${x.value}, 80%, 50%)` }}
      class="movearea"
    >
      <p>在此 div 上移动鼠标...</p>
      <p>x: {x.value}</p>
    </div>
  )
}
```

</div>

```css
.movearea {
  transition: 0.3s background-color ease;
}
```

<Colors />

除了颜色，你还可以使用样式绑定来动画化 transform、width 或 height。你甚至可以使用弹簧物理来动画化 SVG 路径——毕竟，它们都是属性数据绑定：

<ElasticHeader />

## 使用 Watchers 进行动画 {#animating-with-watchers}

通过一些创意，我们可以使用 watchers 来基于某些数值状态动画化任何内容。例如，我们可以动画化数字本身：

<div class="composition-api">

```tsx
import { ref, reactive, watch } from '@rue-js/rue'
import gsap from 'gsap'
import type { FC } from '@rue-js/rue'

const App: FC = () => {
  const number = ref(0)
  const tweened = reactive({
    number: 0,
  })

  // 注意：对于大于 Number.MAX_SAFE_INTEGER (9007199254740991) 的输入，
  // 由于 JavaScript 数字精度限制，结果可能不准确。
  watch(number, n => {
    gsap.to(tweened, { duration: 0.5, number: Number(n) || 0 })
  })

  return (
    <div>
      输入数字：
      <input
        type="number"
        value={number.value}
        onChange={e => (number.value = Number((e.target as HTMLInputElement).value))}
      />
      <p>{tweened.number.toFixed(0)}</p>
    </div>
  )
}
```

</div>

<AnimateWatcher />

<div class="composition-api">

[在 Playground 中尝试](https://play.@rue-js/ruejs.org/#eNpNUstygzAM/BWNLyEzBDKd6YWSdHrpsacefSGgJG7xY7BImhL+vTKv9ILllXYlr+jEm3PJpUWRidyXjXIEHql1e2mUdrYh6KDBY8yfoiR1wRiuBZVn6OHYWA0r5q6W2pMv3ISHkBPSlNZ4AtPqAzawC2LRdj3DdEU0WA34qB910sBUnsFWmp6LpRmaRo9UHMLIrGG3h4EBQ/OEbDRpxjx51TYFKWtYKHmOF9WP4Qzs+x22EDoA9NLwmaejC/x+vhBqVxeEfAPIK3WBsi6830lRobZSDDjA580hFIt8roxrCS4bbSuskxFmzhhIAenEy92id1CnzZzfd91szETmZ72rH6zYOej7PA3rYXrKE3GUp//m5KunWx3C5CE6enS0hjZXVKczZXCwdfWyoF79YgZPqBliJ9iGSUTEYlzuRrO9X94a/lUGNTklvBTZvAMpwhYCIMWZyPksTVvjvk9JaXUacq9sSlujFJPnvej/AElH3FQ=)

</div>
