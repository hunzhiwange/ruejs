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

## customRef() {#customref}

创建一个显式控制依赖追踪和更新触发时机的自定义 ref。

- **类型**

  ```ts
  function customRef<T>(factory: CustomRefFactory<T>): { value: T }

  type CustomRefFactory<T> = (
    track: () => void,
    trigger: () => void,
  ) => {
    get: () => T
    set: (value: T) => void
  }
  ```

- **详情**

  `customRef()` 接收一个工厂函数。工厂函数会拿到 `track` 和 `trigger`，并返回 `.value` 的 `get` / `set` 实现。

  通常应在 `get()` 中调用 `track()` 来收集依赖，在合适的更新时机调用 `trigger()` 来通知订阅者。`set()` 不会自动触发更新，这让你可以实现防抖、节流、外部状态同步等更精细的行为。

- **示例**

  创建一个防抖 ref，仅在最新 set 调用后的一定超时后才触发依赖更新：

  ```js
  import { customRef } from '@rue-js/rue'

  export function useDebouncedRef(value, delay = 200) {
    let timeout

    return customRef((track, trigger) => ({
      get() {
        track()
        return value
      },
      set(nextValue) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          value = nextValue
          trigger()
        }, delay)
      },
    }))
  }
  ```

  在组件中使用：

  ```js
  import { useDebouncedRef } from './debouncedRef'

  const text = useDebouncedRef('hello')
  ```

## 对象状态迁移

`shallowReactive`、`shallowReadonly` 和 `toRaw` 已删除。Signal 保存普通对象，直接使用 `get()` 读取；独立快照需要显式复制。使用根值替换或路径写入更新状态。

## effectScope() {#effectscope}

创建一个 effect 作用域对象，可以捕获在其中创建的响应式 effect（即 computed 和 watchers），以便这些 effect 可以一起被处置。

- **类型**

  ```ts
  function effectScope(detached?: boolean): EffectScope

  interface EffectScope {
    readonly active: boolean
    run<T>(fn: () => T): T | undefined // 如果作用域不活动则为 undefined
    stop(): void
    dispose(): void
  }
  ```

  默认创建的 scope 会关联到当前活动 scope，父 scope 停止时会一并停止子 scope。传入 `true` 会创建 detached scope，使其不随当前父 scope 自动停止。

- **示例**

  ```js
  const scope = effectScope()

  scope.run(() => {
    const doubled = computed(() => counter.value * 2)

    watch(doubled, () => console.log(doubled.value))

    watchEffect(() => console.log('Count: ', doubled.value))
  })

  // 处置作用域中的所有 effect
  scope.stop()
  ```

## getCurrentScope() {#getcurrentscope}

如果存在，返回当前活动的 [effect 作用域](#effectscope)。

- **类型**

  ```ts
  function getCurrentScope(): EffectScope | undefined
  ```

## onScopeDispose() {#onscopedispose}

在当前活动的 [effect 作用域](#effectscope)上注册一个处置回调。当关联的 effect 作用域停止时，将调用回调。

此方法可用作 `onUnmounted` 的可重用组合式函数的非组件耦合替代，因为每个 Rue 组件的初始化逻辑也在 effect 作用域中调用。

如果此函数在没有活动 effect 作用域的情况下被调用，将输出警告。可以通过将 `true` 作为第二个参数传递来抑制此警告。

- **类型**

  ```ts
  function onScopeDispose(fn: () => void, failSilently?: boolean): void
  ```
