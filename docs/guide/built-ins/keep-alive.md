# KeepAlive {#keepalive}

`<KeepAlive>` 是一个内置组件，允许我们在多个组件之间动态切换时有条件地缓存组件实例。

## 基本用法 (Basic Usage) {#basic-usage}

在组件基础章节中，我们介绍了 [动态组件](/guide/guide/essentials/component-basics#dynamic-components) 的语法，使用 `Component` 运行时组件：

```tsx
import { Component, ref } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const App: FC = () => {
  const activeComponent = ref<'a' | 'b'>('a')

  return <Component is={activeComponent.value} registry={{ a: ComponentA, b: ComponentB }} />
}
```

默认情况下，活动组件实例在切换离开它时将被卸载。这将导致它持有的任何更改的状态丢失。当再次显示此组件时，将创建一个具有初始状态的新实例。

在下面的示例中，我们有两个有状态组件 - A 包含一个计数器，而 B 包含一个通过 `useState` 与输入同步的消息。尝试更新其中一个的状态，切换离开，然后切换回它：

您会注意到，当切换回时，之前的更改状态将被重置。

在切换时创建新的组件实例通常是有用的行为，但在这种情况下，我们真的希望即使在组件处于非活动状态时也能保留两个组件实例。为了解决这个问题，我们可以使用 `<KeepAlive>` 内置组件包装我们的动态组件：

```tsx
import { Component, KeepAlive, ref } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const App: FC = () => {
  const activeComponent = ref<'a' | 'b'>('a')

  return (
    <KeepAlive>
      <Component is={activeComponent.value} registry={{ a: ComponentA, b: ComponentB }} />
    </KeepAlive>
  )
}
```

现在，状态将在组件切换之间持久化：

## 包含 / 排除 (Include / Exclude) {#include-exclude}

默认情况下，`<KeepAlive>` 将缓存其中的任何组件实例。我们可以通过 `include` 和 `exclude` props 自定义此行为。两个 props 都可以是用逗号分隔的字符串、`RegExp` 或包含任一类型的数组：

```tsx
{
  /* 逗号分隔的字符串 */
}
;<KeepAlive include="a,b">
  <Component is={view.value} registry={{ a: ComponentA, b: ComponentB }} />
</KeepAlive>

{
  /* 正则表达式 */
}
;<KeepAlive include={/a|b/}>
  <Component is={view.value} registry={{ a: ComponentA, b: ComponentB }} />
</KeepAlive>

{
  /* 数组 */
}
;<KeepAlive include={['a', 'b']}>
  <Component is={view.value} registry={{ a: ComponentA, b: ComponentB }} />
</KeepAlive>
```

当前实现的匹配目标不是组件的 `displayName`。`include` / `exclude` 会优先匹配直接子节点显式传入的字符串 / 数字 `key`，其次才会回退到子节点上的 `name` 或内部挂载标识。因此，如果你需要稳定地命中缓存规则，最稳妥的做法是给动态子节点显式设置字符串 key。

## 最大缓存实例数 (Max Cached Instances) {#max-cached-instances}

我们可以通过 `max` prop 限制可以缓存的最大组件实例数。当指定 `max` 时，`<KeepAlive>` 的行为类似于 [LRU 缓存](<https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU)>)：如果缓存实例数即将超过指定的最大计数，最近最少访问的缓存实例将被销毁以腾出空间给新的实例。

```tsx
<KeepAlive max={10}>
  <Component is={activeComponent.value} registry={{ a: ComponentA, b: ComponentB }} />
</KeepAlive>
```

## 缓存实例的生命周期 (Lifecycle of Cached Instance) {#lifecycle-of-cached-instance}

当前实现会在组件切走时保留实例和 DOM 区间，并在重新命中缓存时把这段 DOM 挪回活动容器。

你可以在被缓存的组件中使用 `onActivated()` 和 `onDeactivated()` 观察这两个状态变化：

```tsx
import { onActivated, onDeactivated } from '@rue-js/rue'

const CachedPanel = () => {
  onActivated(() => {
    // 组件进入活动 DOM 区间
  })

  onDeactivated(() => {
    // 组件被移动到 KeepAlive 的离线缓存区间
  })

  return <section>Cached</section>
}
```

## 与 RouterView 配合 {#router-view-persist}

`@rue-js/router` 已在 RouterView 内部复用同一套 KeepAlive range 缓存。无需手动包装 RouterView，只需在路由记录上声明：

```tsx
const routes = [{ path: '/workspace/:id', component: Workspace, persist: true }]
```

离开后页面实例、表单值和岛内状态会保留；以新 params 返回同一记录时，已缓存实例会收到新参数而不重新 mount。默认缓存 key 是完整路由路径，也可声明 `persistKey`。根应用卸载时，活动与离线缓存都会一起清理。

此能力保留的是 Rue SPA Router 中的路由组件。它不会像跨文档 DOM 匹配器那样，按任意 HTML 元素名称在两个文档之间搬运节点。

---

**相关**

- [`<KeepAlive>` API 参考](/api/api/built-in-components#keepalive)
