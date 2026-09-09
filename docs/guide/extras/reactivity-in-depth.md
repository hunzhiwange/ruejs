# 深入响应式系统 {#reactivity-in-depth}

Rue 使用 Signal 和单一增量依赖图管理状态。对象本身保持普通 JavaScript 对象，不通过深层 Proxy 拦截任意读写。组件里的简洁成员语法来自 SWC 编译，而不是运行时对象魔法。

## 依赖如何建立 {#what-is-reactivity}

`signal` 是状态容器，`computed` 表达派生值，effect 在执行时记录读取过的依赖。编译代码与通用运行时使用同一套 Graph、Signal 和 Effect。

```ts
import { signal, computed, watchEffect } from '@rue-js/rue'

const state = signal({ user: { name: 'Rue' }, visits: 0 })
const greeting = computed(() => `你好，${state.getPath('user.name')}`)
const stop = watchEffect(() => console.log(greeting.get()))
state.setPath('user.name', 'Signal')
state.updatePath('visits', value => Number(value) + 1)
// 不再使用时停止订阅
stop()
```

`getPath` 订阅指定路径。路径 Trie 保存依赖节点；`setPath` 和 `updatePath` 原地写入并通知受影响的路径。更新 `visits` 不会令只读取 `user.name` 的计算重新执行。替换祖先或根值会使受影响的子路径重新求值。

`get()` 读取根状态；`peek()` 是不收集依赖的读取。它们都不创建副本。路径写入可保持根对象引用不变，因此不能用根引用是否变化来判断所有子路径更新。

## 编译状态 {#runtime-vs-compile-time-reactivity}

```tsx
import { useState } from '@rue-js/rue'

export default function Counter() {
  const [state] = useState({ count: 0, user: { name: 'Rue' } })
  return (
    <button
      onClick={() => {
        state.count += 1
      }}
    >
      {state.user.name}: {state.count}
    </button>
  )
}
```

Rue SWC 将可证明来源的成员读写降级为 Signal 路径操作，包括直接赋值、复合赋值、自增、自减及受支持的原生数组变异。`useState` 必须用于经过 Rue 编译的组件；普通模块中的共享对象应显式使用 Signal API。

## 支持与诊断边界 {#limitations}

将状态对象交给未知函数、调用未知对象方法或通过不可追踪别名写入，会产生 `state-escape` 等编译诊断。不要为了通过构建而关闭严格模式。可以向外部代码传递显式快照，再将结果写回：

```ts
const snapshot = structuredClone(state.get())
// 外部代码可以修改 snapshot，它不是响应式句柄。
snapshot.user.name = '更新后的名字'
state.set(snapshot)
```

示例中的数据可结构化克隆；包含函数、DOM 或其他不可克隆值的数据应按业务结构复制。对 `state.get().user.name` 直接赋值不会自动通知订阅者。数组元素从普通快照中取出后也不具备代理行为。

静态 props 键由编译器直接读取。动态键枚举、展开和传给外部代码时使用显式快照；快照不是持续更新的 props 视图。子组件通过回调请求父组件更新，不直接修改传入的普通对象。

## 派生值与副作用 {#computed-debugging}

计算函数中读取需要的路径，而不是在计算外提前缓存值。分支切换后，依赖图会更新该次执行实际使用的依赖。副作用由 scope 管理生命周期；在组件外创建长期订阅时保留停止句柄。

## 侦听器 {#watcher-debugging}

需要观察单个字段时，使用 `watch(() => state.getPath('user.name'), callback)`。普通对象深度遍历无法拦截未来的属性赋值；深度选项不能把普通对象变成响应式代理。更新依然需要 Signal API 或编译状态操作。

## 从旧 API 迁移 {#migration}

`reactive`、`shallowReactive`、`readonly`、`shallowReadonly`、`propsReactive`、`toRaw`、`toRef`、`toRefs`、`isProxy`、`isReactive` 和 `isReadonly` 已删除，不保留兼容层。

组件本地对象改用编译期 `useState`；模块级状态改用 `signal`。属性句柄改为路径读取和显式写入，派生读取使用 `computed`。需要解构时返回包含多个 Signal/ref 句柄的普通对象。TypeScript `Readonly<T>` 只表达类型约束；不带 setter 的 `computed` 表达只读派生值。
