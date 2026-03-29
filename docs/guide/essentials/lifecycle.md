# 生命周期钩子 {#lifecycle-hooks}

每个 Rue 组件实例在创建时都会经历一系列初始化步骤——例如，需要设置数据观测、编译模板、将实例挂载到 DOM，以及在数据变化时更新 DOM。在此过程中，它还会运行称为生命周期钩子的函数，让用户有机会在特定阶段添加自己的代码。

## 注册生命周期钩子 {#registering-lifecycle-hooks}

例如，`onMounted` 钩子可用于在组件完成初始渲染并创建 DOM 节点后运行代码：

```tsx
import { onMounted, ref } from 'rue-js'
import type { FC } from 'rue-js'

const MyComponent: FC = () => {
  onMounted(() => {
    console.log('组件现在已挂载。')
  })

  return <div>我的组件</div>
}
```

还有其他钩子将在实例生命周期的不同阶段被调用，最常用的是 [`onMounted`](/api/composition-api-lifecycle#onmounted)、[`onUpdated`](/api/composition-api-lifecycle#onupdated) 和 [`onUnmounted`](/api/composition-api-lifecycle#onunmounted)。

当调用 `onMounted` 时，Rue 会自动将注册的回调函数与当前活动的组件实例关联。这要求这些钩子在组件设置期间**同步**注册。例如，不要这样做：

```js
setTimeout(() => {
  onMounted(() => {
    // 这不会生效。
  })
}, 100)
```

请注意，这并不意味着调用必须词法上放置在 `setup()` 内部。`onMounted()` 可以在外部函数中调用，只要调用栈是同步的并且源自 `setup()` 内部。

## 生命周期图示 {#lifecycle-diagram}

下面是实例生命周期的图示。你现在不需要完全理解所有内容，但随着学习和构建更多项目，它将是一个有用的参考。

![组件生命周期图示](./images/lifecycle.png)

<!-- https://www.figma.com/file/Xw3UeNMOralY6NV7gSjWdS/Vue-Lifecycle -->

查阅 [生命周期钩子 API 参考](/api/composition-api-lifecycle) 以了解所有生命周期钩子及其各自用例的详细信息。

## 常用生命周期钩子 {#common-lifecycle-hooks}

### onMounted {#onmounted}

在组件挂载后调用。此时 DOM 元素已经可用：

```tsx
import { onMounted, ref } from 'rue-js'
import type { FC } from 'rue-js'

const MyComponent: FC = () => {
  const elementRef = ref<HTMLDivElement>(null)

  onMounted(() => {
    // DOM 元素现在可用
    console.log(elementRef.value)
    elementRef.value?.focus()
  })

  return <div ref={elementRef}>我的元素</div>
}
```

### onUpdated {#onupdated}

在响应式状态变更导致组件更新其 DOM 树之后调用：

```tsx
import { onUpdated, ref } from 'rue-js'
import type { FC } from 'rue-js'

const MyComponent: FC = () => {
  const count = ref(0)

  onUpdated(() => {
    // 在 DOM 更新后执行某些操作
    console.log('组件已更新')
  })

  return (
    <div>
      <p>计数：{count.value}</p>
      <button onClick={() => count.value++}>增加</button>
    </div>
  )
}
```

:::warning 注意
不要在 `onUpdated` 中更改组件的状态，这可能会导致无限更新循环。
:::

### onUnmounted {#onunmounted}

在组件实例被卸载之后调用：

```tsx
import { onMounted, onUnmounted, ref } from 'rue-js'
import type { FC } from 'rue-js'

const MyComponent: FC = () => {
  const timer = ref<number | null>(null)

  onMounted(() => {
    timer.value = window.setInterval(() => {
      console.log('滴答')
    }, 1000)
  })

  onUnmounted(() => {
    // 清理副作用
    if (timer.value) {
      clearInterval(timer.value)
    }
  })

  return <div>我的组件</div>
}
```

### onBeforeMount / onBeforeUpdate / onBeforeUnmount {#other-hooks}

这些钩子分别在挂载、更新、卸载**之前**调用：

```tsx
import {
  onBeforeMount,
  onBeforeUpdate,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  onUnmounted,
} from 'rue-js'

const MyComponent: FC = () => {
  onBeforeMount(() => {
    console.log('挂载前')
  })

  onMounted(() => {
    console.log('挂载后')
  })

  onBeforeUpdate(() => {
    console.log('更新前')
  })

  onUpdated(() => {
    console.log('更新后')
  })

  onBeforeUnmount(() => {
    console.log('卸载前')
  })

  onUnmounted(() => {
    console.log('卸载后')
  })

  return <div>我的组件</div>
}
```

## 错误处理钩子 {#error-handling-hooks}

### onErrorCaptured {#onerrorcaptured}

在捕获到来自后代组件的错误时被调用：

```tsx
import { onErrorCaptured, ref } from 'rue-js'
import type { FC } from 'rue-js'

const MyComponent: FC = () => {
  const error = ref<Error | null>(null)

  onErrorCaptured((err, instance, info) => {
    error.value = err as Error
    console.error('捕获到错误：', err)
    console.error('错误信息：', info)

    // 返回 false 阻止错误继续向上传播
    return false
  })

  return <div>{error.value ? <p>出错了：{error.value.message}</p> : <ChildComponent />}</div>
}
```

## 调试钩子 {#debug-hooks}

### onRenderTracked / onRenderTriggered {#debug-hooks}

用于调试响应式依赖：

```tsx
import { onRenderTracked, onRenderTriggered, ref } from 'rue-js'
import type { FC } from 'rue-js'

const MyComponent: FC = () => {
  const count = ref(0)

  onRenderTracked(event => {
    // 当响应式依赖被追踪时调用
    console.log('追踪到依赖：', event)
  })

  onRenderTriggered(event => {
    // 当响应式依赖触发重新渲染时调用
    console.log('触发重新渲染：', event)
  })

  return (
    <div>
      <p>计数：{count.value}</p>
      <button onClick={() => count.value++}>增加</button>
    </div>
  )
}
```
