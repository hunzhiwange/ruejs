# 响应式 API：进阶 {#reactivity-api-advanced}

## shallowRef() {#shallowref}

[`ref()`](./reactivity-core#ref) 的浅层版本。

- **类型**

  ```ts
  function shallowRef<T>(value: T): ShallowRef<T>

  interface ShallowRef<T> {
    value: T
  }
  ```

- **详情**

  与 `ref()` 不同，浅层 ref 的内部值按原样存储和暴露，不会被设为深层响应式。只有 `.value` 访问是响应式的。

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
  - [指南 - 减少大型不可变结构的响应式开销](/guide/best-practices/performance#reduce-reactivity-overhead-for-large-immutable-structures)
  - [指南 - 与外部状态系统集成](/guide/extras/reactivity-in-depth#integration-with-external-state-systems)

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

创建一个显式控制其依赖追踪和更新触发的自定义 ref。

- **类型**

  ```ts
  function customRef<T>(factory: CustomRefFactory<T>): Ref<T>

  type CustomRefFactory<T> = (
    track: () => void,
    trigger: () => void,
  ) => {
    get: () => T
    set: (value: T) => void
  }
  ```

- **详情**

  `customRef()` 期望一个工厂函数，该函数接收 `track` 和 `trigger` 函数作为参数，并应返回一个带有 `get` 和 `set` 方法的对象。

  一般来说，`track()` 应在 `get()` 内部调用，`trigger()` 应在 `set()` 内部调用。然而，你可以完全控制它们何时应该被调用，或者是否应该被调用。

- **示例**

  创建一个防抖 ref，仅在最新 set 调用后的一定超时后才更新值：

  ```js
  import { customRef } from '@rue-js/rue'

  export function useDebouncedRef(value, delay = 200) {
    let timeout
    return customRef((track, trigger) => {
      return {
        get() {
          track()
          return value
        },
        set(newValue) {
          clearTimeout(timeout)
          timeout = setTimeout(() => {
            value = newValue
            trigger()
          }, delay)
        },
      }
    })
  }
  ```

  在组件中使用：

  ```js
  import { useDebouncedRef } from './debouncedRef'
  const text = useDebouncedRef('hello')
  ```

  :::warning 谨慎使用
  使用 customRef 时，我们应该注意其 getter 的返回值，特别是在每次运行 getter 时生成新对象数据类型的情况下。这会影响父子组件之间的关系，当这样的 customRef 作为 prop 传递时。

  父组件的渲染函数可能因不同响应式状态的更改而被触发。在重新渲染期间，我们的 customRef 值被重新评估，返回一个新的对象数据类型作为子组件的 prop。这个 prop 与子组件中的上一个值进行比较，由于它们不同，customRef 的响应式依赖在子组件中被触发。同时，父组件中的响应式依赖不会运行，因为 customRef 的 setter 没有被调用，因此其依赖也没有被触发。
  :::

## shallowReactive() {#shallowreactive}

[`reactive()`](./reactivity-core#reactive) 的浅层版本。

- **类型**

  ```ts
  function shallowReactive<T extends object>(target: T): T
  ```

- **详情**

  与 `reactive()` 不同，没有深度转换：对于浅层响应式对象，只有根级别的属性是响应式的。属性值按原样存储和暴露——这也意味着具有 ref 值的属性不会被自动解包。

  :::warning 谨慎使用
  浅层数据结构只应在组件的根级别状态中使用。避免将其嵌套在深层响应式对象中，因为它会创建一个具有不一致响应式行为的树，这可能难以理解和调试。
  :::

- **示例**

  ```js
  const state = shallowReactive({
    foo: 1,
    nested: {
      bar: 2,
    },
  })

  // 修改 state 自身的属性是响应式的
  state.foo++

  // ...但不会转换嵌套对象
  isReactive(state.nested) // false

  // 不是响应式的
  state.nested.bar++
  ```

## shallowReadonly() {#shallowreadonly}

[`readonly()`](./reactivity-core#readonly) 的浅层版本。

- **类型**

  ```ts
  function shallowReadonly<T extends object>(target: T): Readonly<T>
  ```

- **详情**

  与 `readonly()` 不同，没有深度转换：只有根级别的属性被设为只读。属性值按原样存储和暴露——这也意味着具有 ref 值的属性不会被自动解包。

  :::warning 谨慎使用
  浅层数据结构只应在组件的根级别状态中使用。避免将其嵌套在深层响应式对象中，因为它会创建一个具有不一致响应式行为的树，这可能难以理解和调试。
  :::

- **示例**

  ```js
  const state = shallowReadonly({
    foo: 1,
    nested: {
      bar: 2,
    },
  })

  // 修改 state 自身的属性将失败
  state.foo++

  // ...但在嵌套对象上有效
  isReadonly(state.nested) // false

  // 有效
  state.nested.bar++
  ```

## toRaw() {#toraw}

返回 Rue 创建的代理的原始对象。

- **类型**

  ```ts
  function toRaw<T>(proxy: T): T
  ```

- **详情**

  `toRaw()` 可以从由 [`reactive()`](./reactivity-core#reactive)、[`readonly()`](./reactivity-core#readonly)、[`shallowReactive()`](#shallowreactive) 或 [`shallowReadonly()`](#shallowreadonly) 创建的代理返回原始对象。

  这是一个逃生口，可用于临时读取而不会产生代理访问/追踪开销，或写入而不触发更改。**不推荐**持有对原始对象的持久引用。谨慎使用。

- **示例**

  ```js
  const foo = {}
  const reactiveFoo = reactive(foo)

  console.log(toRaw(reactiveFoo) === foo) // true
  ```

## markRaw() {#markraw}

标记一个对象，使其永远不会被转换为代理。返回对象本身。

- **类型**

  ```ts
  function markRaw<T extends object>(value: T): T
  ```

- **示例**

  ```js
  const foo = markRaw({})
  console.log(isReactive(reactive(foo))) // false

  // 在嵌套在其他响应式对象中时同样有效
  const bar = reactive({ foo })
  console.log(isReactive(bar.foo)) // false
  ```

  :::warning 谨慎使用
  `markRaw()` 和浅层 API（如 `shallowReactive()`）允许你有选择地退出默认的深层响应式/只读转换，并在你的状态图中嵌入原始的非代理对象。它们可以用于各种原因：
  - 有些值根本不应该被设为响应式，例如复杂的第三方类实例或 Vue 组件对象。

  - 当渲染具有不可变数据源的大型列表时，跳过代理转换可以提供性能改进。

  它们被认为是高级功能，因为原始退出只在根级别，所以如果你将一个嵌套的、未标记的原始对象设置到响应式对象中，然后再次访问它，你会得到代理版本。这可能导致**身份风险**——即执行依赖于对象身份的操作，但使用同一对象的原始版本和代理版本：

  ```js
  const foo = markRaw({
    nested: {},
  })

  const bar = reactive({
    // 虽然 `foo` 被标记为原始，但 foo.nested 不是。
    nested: foo.nested,
  })

  console.log(foo.nested === bar.nested) // false
  ```

  身份风险通常很少见。然而，要正确利用这些 API 同时安全地避免身份风险，需要对响应式系统的工作原理有扎实的理解。

  :::

## effectScope() {#effectscope}

创建一个 effect 作用域对象，可以捕获在其中创建的响应式 effect（即 computed 和 watchers），以便这些 effect 可以一起被处置。有关此 API 的详细用例，请参阅相应的 [RFC](https://github.com/vuejs/rfcs/blob/master/active-rfcs/0041-reactivity-effect-scope.md)。

- **类型**

  ```ts
  function effectScope(detached?: boolean): EffectScope

  interface EffectScope {
    run<T>(fn: () => T): T | undefined // 如果作用域不活动则为 undefined
    stop(): void
  }
  ```

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

此方法可用作 `onUnmounted` 的可重用组合式函数的非组件耦合替代，因为每个 Vue 组件的 `setup()` 函数也在 effect 作用域中调用。

如果此函数在没有活动 effect 作用域的情况下被调用，将抛出警告。在版本中，可以通过将 `true` 作为第二个参数传递来抑制此警告。

- **类型**

  ```ts
  function onScopeDispose(fn: () => void, failSilently?: boolean): void
  ```
