# KeepAlive {#keepalive}

`<KeepAlive>` 是一个内置组件，允许我们在多个组件之间动态切换时有条件地缓存组件实例。

## 基本用法 (Basic Usage) {#basic-usage}

在组件基础章节中，我们介绍了 [动态组件](/guide/essentials/component-basics#dynamic-components) 的语法，使用特殊的 `<Dynamic>` 组件：

```tsx
import { useState } from 'rue-js'
import { Dynamic } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = () => {
  const [activeComponent, setActiveComponent] = useState('ComponentA')

  return <Dynamic component={activeComponent} />
}
```

默认情况下，活动组件实例在切换离开它时将被卸载。这将导致它持有的任何更改的状态丢失。当再次显示此组件时，将创建一个具有初始状态的新实例。

在下面的示例中，我们有两个有状态组件 - A 包含一个计数器，而 B 包含一个通过 `useState` 与输入同步的消息。尝试更新其中一个的状态，切换离开，然后切换回它：

您会注意到，当切换回时，之前的更改状态将被重置。

在切换时创建新的组件实例通常是有用的行为，但在这种情况下，我们真的希望即使在组件处于非活动状态时也能保留两个组件实例。为了解决这个问题，我们可以使用 `<KeepAlive>` 内置组件包装我们的动态组件：

```tsx
import { useState } from 'rue-js'
import { Dynamic, KeepAlive } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = () => {
  const [activeComponent, setActiveComponent] = useState('ComponentA')

  return (
    <KeepAlive>
      <Dynamic component={activeComponent} />
    </KeepAlive>
  )
}
```

现在，状态将在组件切换之间持久化：

:::tip
当在 [DOM 内模板](/guide/essentials/component-basics#in-dom-template-parsing-caveats) 中使用时，它应该引用为 `<keep-alive>`。
:::

## 包含 / 排除 (Include / Exclude) {#include-exclude}

默认情况下，`<KeepAlive>` 将缓存其中的任何组件实例。我们可以通过 `include` 和 `exclude` props 自定义此行为。两个 props 都可以是用逗号分隔的字符串、`RegExp` 或包含任一类型的数组：

```tsx
{
  /* 逗号分隔的字符串 */
}
;<KeepAlive include="a,b">
  <Dynamic component={view} />
</KeepAlive>

{
  /* 正则表达式 */
}
;<KeepAlive include={/a|b/}>
  <Dynamic component={view} />
</KeepAlive>

{
  /* 数组 */
}
;<KeepAlive include={['a', 'b']}>
  <Dynamic component={view} />
</KeepAlive>
```

匹配是针对组件的 `displayName` 进行检查的，因此需要被 `KeepAlive` 条件缓存的组件必须显式声明一个 `displayName`。

## 最大缓存实例数 (Max Cached Instances) {#max-cached-instances}

我们可以通过 `max` prop 限制可以缓存的最大组件实例数。当指定 `max` 时，`<KeepAlive>` 的行为类似于 [LRU 缓存](<https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU)>)：如果缓存实例数即将超过指定的最大计数，最近最少访问的缓存实例将被销毁以腾出空间给新的实例。

```tsx
<KeepAlive max={10}>
  <Dynamic component={activeComponent} />
</KeepAlive>
```

## 缓存实例的生命周期 (Lifecycle of Cached Instance) {#lifecycle-of-cached-instance}

当组件实例从 DOM 中移除但属于 `<KeepAlive>` 缓存的组件树的一部分时，它进入 **停用** 状态而不是被卸载。当组件实例作为缓存树的一部分插入到 DOM 中时，它被 **激活**。

被 keep-alive 的组件可以使用生命周期钩子注册这两个状态：

```tsx
import { useEffect } from 'rue-js'
import type { FC } from 'rue-js'

const MyComponent: FC = () => {
  useEffect(() => {
    // 在初始挂载时调用
    // 以及每次从缓存中重新插入时
    console.log('组件被激活')

    return () => {
      // 在从 DOM 移除到缓存时调用
      // 以及在卸载时
      console.log('组件被停用')
    }
  }, [])

  return <div>我的组件</div>
}
```

注意：

- 激活钩子也在挂载时调用，停用钩子在卸载时调用。

- 两个钩子不仅适用于 `<KeepAlive>` 缓存的根组件，也适用于缓存树中的后代组件。

---

**相关**

- [`<KeepAlive>` API 参考](/api/built-in-components#keepalive)
