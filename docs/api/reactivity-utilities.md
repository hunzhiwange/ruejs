# 响应式 API：工具 {#reactivity-api-utilities}

## isRef() {#isref}

检查值是否为 ref 对象。

- **类型**

  ```ts
  function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
  ```

  注意返回类型是一个[类型断言](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)，这意味着 `isRef` 可用作类型守卫：

  ```ts
  let foo: unknown
  if (isRef(foo)) {
    // foo 的类型被缩小为 Ref<unknown>
    foo.value
  }
  ```

## unref() {#unref}

如果参数是 ref，返回其内部值，否则返回参数本身。这是 `val = isRef(val) ? val.value : val` 的语法糖函数。

- **类型**

  ```ts
  function unref<T>(ref: T | Ref<T>): T
  ```

- **示例**

  ```ts
  function useFoo(x: number | Ref<number>) {
    const unwrapped = unref(x)
    // unwrapped 现在保证是 number 类型
  }
  ```

## toRef() {#toref}

可用于将值/refs/getters 规范化为 refs。

也可用于为源响应式对象的属性创建一个 ref。创建的 ref 与其源属性同步：修改源属性将更新 ref，反之亦然。

- **类型**

  ```ts
  // 规范化签名
  function toRef<T>(
    value: T,
  ): T extends () => infer R ? Readonly<Ref<R>> : T extends Ref ? T : Ref<UnwrapRef<T>>

  // 对象属性签名
  function toRef<T extends object, K extends keyof T>(
    object: T,
    key: K,
    defaultValue?: T[K],
  ): ToRef<T[K]>

  type ToRef<T> = T extends Ref ? T : Ref<T>
  ```

- **示例**

  规范化签名：

  ```js
  // 按原样返回现有的 refs
  toRef(existingRef)

  // 创建一个在访问 .value 时调用 getter 的只读 ref
  toRef(() => props.foo)

  // 从非函数值创建普通 refs
  // 等同于 ref(1)
  toRef(1)
  ```

  对象属性签名：

  ```js
  const state = reactive({
    foo: 1,
    bar: 2,
  })

  // 与原始属性双向同步的 ref
  const fooRef = toRef(state, 'foo')

  // 修改 ref 会更新原始值
  fooRef.value++
  console.log(state.foo) // 2

  // 修改原始值也会更新 ref
  state.foo++
  console.log(fooRef.value) // 3
  ```

  注意这与以下内容不同：

  ```js
  const fooRef = ref(state.foo)
  ```

  上面的 ref **不会**与 `state.foo` 同步，因为 `ref()` 接收的是一个普通数值。

  `toRef()` 在你想要将 prop 的 ref 传递给组合式函数时很有用：

  ```js
  import { toRef } from '@rue-js/rue'

  const props = defineProps(/* ... */)

  // 将 `props.foo` 转换为 ref，然后传入
  // 一个组合式函数
  useSomeFeature(toRef(props, 'foo'))

  // getter 语法 - 推荐
  useSomeFeature(toRef(() => props.foo))
  ```

  当 `toRef` 与组件 props 一起使用时，修改 props 的常规限制仍然适用。尝试为 ref 分配新值等同于尝试直接修改 prop，这是不允许的。在这种情况下，你可能需要考虑改用带有 `get` 和 `set` 的 [`computed`](./reactivity-core#computed)。有关更多信息，请参阅[在组件上使用 `v-model`](/guide/components/v-model) 指南。

  当使用对象属性签名时，即使源属性当前不存在，`toRef()` 也会返回一个可用的 ref。这使得处理可选属性成为可能，而 [`toRefs`](#torefs) 无法处理这种情况。

## toValue() {#tovalue}

将值/refs/getters 规范化为值。这与 [unref()](#unref) 类似，但它还会规范化 getters。如果参数是 getter，它将被调用并返回其返回值。

这可以在[组合式函数](/guide/reusability/composables.html)中用于规范化一个可以是值、ref 或 getter 的参数。

- **类型**

  ```ts
  function toValue<T>(source: T | Ref<T> | (() => T)): T
  ```

- **示例**

  ```js
  toValue(1) //       --> 1
  toValue(ref(1)) //  --> 1
  toValue(() => 1) // --> 1
  ```

  在组合式函数中规范化参数：

  ```ts
  import type { MaybeRefOrGetter } from '@rue-js/rue'

  function useFeature(id: MaybeRefOrGetter<number>) {
    watch(
      () => toValue(id),
      id => {
        // 响应 id 变化
      },
    )
  }

  // 这个组合式函数支持以下任何一种：
  useFeature(1)
  useFeature(ref(1))
  useFeature(() => 1)
  ```

## toRefs() {#torefs}

将响应式对象转换为普通对象，其中结果对象的每个属性都是指向原始对象相应属性的 ref。每个单独的 ref 使用 [`toRef()`](#toref) 创建。

- **类型**

  ```ts
  function toRefs<T extends object>(
    object: T,
  ): {
    [K in keyof T]: ToRef<T[K]>
  }

  type ToRef = T extends Ref ? T : Ref<T>
  ```

- **示例**

  ```js
  const state = reactive({
    foo: 1,
    bar: 2,
  })

  const stateAsRefs = toRefs(state)
  /*
  stateAsRefs 的类型：{
    foo: Ref<number>,
    bar: Ref<number>
  }
  */

  // ref 和原始属性是"链接"的
  state.foo++
  console.log(stateAsRefs.foo.value) // 2

  stateAsRefs.foo.value++
  console.log(state.foo) // 3
  ```

  `toRefs` 在从组合式函数返回响应式对象时很有用，以便消费组件可以在不丢失响应性的情况下解构/展开返回的对象：

  ```js
  function useFeatureX() {
    const state = reactive({
      foo: 1,
      bar: 2,
    })

    // ...对 state 进行操作逻辑

    // 返回时转换为 refs
    return toRefs(state)
  }

  // 可以解构而不会丢失响应性
  const { foo, bar } = useFeatureX()
  ```

  `toRefs` 只会为调用时在源对象上可枚举的属性生成 refs。要为可能尚不存在的属性创建 ref，请改用 [`toRef`](#toref)。

## isProxy() {#isproxy}

检查对象是否是由 [`reactive()`](./reactivity-core#reactive)、[`readonly()`](./reactivity-core#readonly)、[`shallowReactive()`](./reactivity-advanced#shallowreactive) 或 [`shallowReadonly()`](./reactivity-advanced#shallowreadonly) 创建的代理。

- **类型**

  ```ts
  function isProxy(value: any): boolean
  ```

## isReactive() {#isreactive}

检查对象是否是由 [`reactive()`](./reactivity-core#reactive) 或 [`shallowReactive()`](./reactivity-advanced#shallowreactive) 创建的代理。

- **类型**

  ```ts
  function isReactive(value: unknown): boolean
  ```

## isReadonly() {#isreadonly}

检查传递的值是否为只读对象。只读对象的属性可以更改，但不能直接通过传递的对象分配。

由 [`readonly()`](./reactivity-core#readonly) 和 [`shallowReadonly()`](./reactivity-advanced#shallowreadonly) 创建的代理都被认为是只读的，同样，没有 `set` 函数的 [`computed()`](./reactivity-core#computed) ref 也是如此。

- **类型**

  ```ts
  function isReadonly(value: unknown): boolean
  ```
