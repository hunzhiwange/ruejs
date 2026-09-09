# 响应式 API：工具 {#reactivity-api-utilities}

## isRef() {#isref}

检查某个值是否为 Rue ref。

- **类型**

  ```ts
  function isRef<T = any>(value: unknown): value is { value: T }
  ```

- **示例**

  ```ts
  import { computed, isRef, ref } from '@rue-js/rue'

  const count = ref(1)
  const doubled = computed(() => count.value * 2)

  isRef(count) // true
  isRef(doubled) // true
  isRef(1) // false
  ```

  如果只是想把值规范化为普通值，应优先使用 [`unref()`](#unref) 或 [`toValue()`](#tovalue)。

## unref() {#unref}

如果参数形如 Rue 的 ref，则返回其 `.value`；否则返回参数本身。

- **类型**

  ```ts
  function unref<T = any>(obj: any): T
  ```

- **示例**

  ```ts
  function useFoo(x: number | Ref<number>) {
    const unwrapped = unref(x)
    // unwrapped 现在保证是 number 类型
  }
  ```

## 路径派生值 {#path-values}

旧 `toRef` 已删除，使用 `computed(() => state.getPath('name'))` 保持派生读取，写入通过 `state.setPath('name', next)` 完成。

## toValue() {#tovalue}

将值/refs/getters 规范化为值。这与 [unref()](#unref) 类似，但它还会规范化 getters。如果参数是 getter，它将被调用并返回其返回值。

这可以在[组合式函数](/guide/guide/reusability/composables)中用于规范化一个可以是值、ref 或 getter 的参数。

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
  type ValueSource<T> = T | { value: T } | (() => T)

  function useFeature(id: ValueSource<number>) {
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

## 句柄解构与迁移 {#signal-values}

返回 `{ count: signal(0), label: signal('Rue') }`，解构后仍保留句柄身份。解构 `get()` 返回的对象只取得普通值，不会自动绑定路径。

`toRefs`、`isProxy`、`isReactive` 和 `isReadonly` 已删除；无需判断对象是否为响应式代理。`isRef` 判断句柄，不能用于证明普通对象可以自动响应属性写入。
