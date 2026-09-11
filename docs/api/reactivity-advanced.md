# 响应式 API：进阶 {#reactivity-api-advanced}

## shallowRef() {#shallowref}

[`ref()`](/api/api/reactivity-core#ref) 的浅层版本。

- **类型**

  ```ts
  function shallowRef<T = any>(
    initial: T,
    options?: { equals?: (prev: T, next: T) => boolean } | null,
    forceGlobal?: boolean,
  ): ShallowRef<T>

  interface ShallowRef<T> {
    value: T
  }
  ```

- **详情**

  浅层 ref 的内部值按原样存储和暴露，只有 `.value` 访问收集根依赖；嵌套对象保持普通对象。

  `shallowRef()` 与 Rue 的 `ref()` 使用同一组选项：你可以通过 `options.equals` 控制整体替换 `.value` 时的比较方式；`forceGlobal` 仍然是面向底层封装和 Hook 边界控制的高级参数。

  `shallowRef()` 通常用于大型数据结构的性能优化，或与外部状态管理系统集成。

- **示例**

  ```js
  const state = shallowRef({ count: 1 })

  // 不会触发更改
  state.value.count = 2

  // 会触发更改
  state.value = { count: 2 }
  ```

- **另请参阅**
  - [指南 - 减少大型不可变结构的响应式开销](/guide/guide/best-practices/performance#reduce-reactivity-overhead-for-large-immutable-structures)
  - [指南 - 与外部状态系统集成](/guide/guide/extras/reactivity-in-depth#integration-with-external-state-systems)

## triggerRef() {#triggerref}

强制触发依赖于[浅层 ref](#shallowref)的副作用。这通常在对浅层 ref 的内部值进行深度变更后使用。

- **类型**

  ```ts
  function triggerRef(ref: ShallowRef): void
  ```

- **示例**

  ```js
  const shallow = shallowRef({
    greet: 'Hello, world',
  })

  // 在首次运行时记录一次 "Hello, world"
  watchEffect(() => {
    console.log(shallow.value.greet)
  })

  // 这不会触发 effect，因为 ref 是浅层的
  shallow.value.greet = 'Hello, universe'

  // 记录 "Hello, universe"
  triggerRef(shallow)
  ```

## 已移除的高级 Ref API {#customref}

`customRef()` 不在 compiler-only 公共能力面中。请使用 `ref()`、`shallowRef()`、`computed()` 和显式事件或定时器组合状态更新。

## 对象状态迁移

`shallowReactive`、`shallowReadonly` 和 `toRaw` 已删除。Signal 保存普通对象，直接使用 `get()` 读取；独立快照需要显式复制。使用根值替换或路径写入更新状态。

## 已移除的独立 Scope API {#effectscope}

`effectScope()` 与 `getCurrentScope()` 不在 compiler-only 公共能力面中。组件生命周期内的清理使用 `onScopeDispose()` 或对应卸载钩子。

## onScopeDispose() {#onscopedispose}

在当前活动的 [effect 作用域](#effectscope)上注册一个处置回调。当关联的 effect 作用域停止时，将调用回调。

此方法可用作 `onUnmounted` 的可重用组合式函数的非组件耦合替代，因为每个 Rue 组件的初始化逻辑也在 effect 作用域中调用。

如果此函数在没有活动 effect 作用域的情况下被调用，将输出警告。可以通过将 `true` 作为第二个参数传递来抑制此警告。

- **类型**

  ```ts
  function onScopeDispose(fn: () => void, failSilently?: boolean): void
  ```
