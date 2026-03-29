# 响应式 API：核心 {#reactivity-api-core}

:::info 另请参阅
为了更好地理解响应式 API，建议阅读指南中的以下章节：

- [响应式基础](/guide/essentials/reactivity-fundamentals)（将 API 偏好设置为组合式 API）
- [深入响应式系统](/guide/extras/reactivity-in-depth)
  :::

## ref() {#ref}

接受一个内部值，返回一个响应式的、可更改的 ref 对象，此对象只有一个指向其内部值的属性 `.value`。

- **类型**

  ```ts
  function ref<T>(value: T): Ref<UnwrapRef<T>>

  interface Ref<T> {
    value: T
  }
  ```

- **详情**

  ref 对象是可更改的——也就是说，你可以为 `.value` 赋予新的值。它也是响应式的，即所有对 `.value` 的读取操作都会被追踪，写入操作会触发相关副作用。

  如果一个对象被赋值给 ref，该对象将通过 [reactive()](#reactive) 被设置为深层响应式。这也意味着如果对象包含嵌套的 ref，它们将被深层解包。

  要避免深层转换，请改用 [`shallowRef()`](./reactivity-advanced#shallowref)。

- **示例**

  ```js
  const count = ref(0)
  console.log(count.value) // 0

  count.value = 1
  console.log(count.value) // 1
  ```

- **另请参阅**
  - [指南 - ref() 的响应式基础](/guide/essentials/reactivity-fundamentals#ref)
  - [指南 - 为 ref() 标注类型](/guide/typescript/composition-api#typing-ref) <sup class="vt-badge ts" />

## computed() {#computed}

接受一个 [getter 函数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get#description)，返回一个 getter 返回值的只读响应式 [ref](#ref) 对象。它也可以接受一个带有 `get` 和 `set` 函数的对象来创建一个可写的 ref 对象。

- **类型**

  ```ts
  // 只读
  function computed<T>(
    getter: (oldValue: T | undefined) => T,
    // 见下方"计算属性调试"链接
    debuggerOptions?: DebuggerOptions,
  ): Readonly<Ref<Readonly<T>>>

  // 可写
  function computed<T>(
    options: {
      get: (oldValue: T | undefined) => T
      set: (value: T) => void
    },
    debuggerOptions?: DebuggerOptions,
  ): Ref<T>
  ```

- **示例**

  创建只读计算属性：

  ```js
  const count = ref(1)
  const plusOne = computed(() => count.value + 1)

  console.log(plusOne.value) // 2

  plusOne.value++ // 错误
  ```

  创建可写的计算属性：

  ```js
  const count = ref(1)
  const plusOne = computed({
    get: () => count.value + 1,
    set: val => {
      count.value = val - 1
    },
  })

  plusOne.value = 1
  console.log(count.value) // 0
  ```

  调试：

  ```js
  const plusOne = computed(() => count.value + 1, {
    onTrack(e) {
      debugger
    },
    onTrigger(e) {
      debugger
    },
  })
  ```

- **另请参阅**
  - [指南 - 计算属性](/guide/essentials/computed)
  - [指南 - 计算属性调试](/guide/extras/reactivity-in-depth#computed-debugging)
  - [指南 - 为 computed() 标注类型](/guide/typescript/composition-api#typing-computed) <sup class="vt-badge ts" />
  - [指南 - 性能 - 计算属性稳定性](/guide/best-practices/performance#computed-stability)

## reactive() {#reactive}

返回对象的响应式代理。

- **类型**

  ```ts
  function reactive<T extends object>(target: T): UnwrapNestedRefs<T>
  ```

- **详情**

  响应式转换是"深层"的：它影响所有嵌套属性。响应式对象也会在深层解包任何为 [refs](#ref) 的属性，同时保持响应性。

  还应该注意的是，当 ref 作为响应式数组或原生集合类型（如 `Map`）的元素被访问时，不会执行 ref 解包。

  要避免深层转换并仅在根级别保留响应性，请改用 [shallowReactive()](./reactivity-advanced#shallowreactive)。

  返回的对象及其嵌套对象由 [ES Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 包装，**不等同于**原始对象。建议只使用响应式代理，避免依赖原始对象。

- **示例**

  创建一个响应式对象：

  ```js
  const obj = reactive({ count: 0 })
  obj.count++
  ```

  Ref 解包：

  ```ts
  const count = ref(1)
  const obj = reactive({ count })

  // ref 将被解包
  console.log(obj.count === count.value) // true

  // 它将更新 `obj.count`
  count.value++
  console.log(count.value) // 2
  console.log(obj.count) // 2

  // 它也会更新 `count` ref
  obj.count++
  console.log(obj.count) // 3
  console.log(count.value) // 3
  ```

  注意，refs 作为数组或集合元素访问时**不会**被解包：

  ```js
  const books = reactive([ref('Vue 3 Guide')])
  // 这里需要 .value
  console.log(books[0].value)

  const map = reactive(new Map([['count', ref(0)]]))
  // 这里需要 .value
  console.log(map.get('count').value)
  ```

  当将 [ref](#ref) 赋值给 `reactive` 属性时，该 ref 也会被自动解包：

  ```ts
  const count = ref(1)
  const obj = reactive({})

  obj.count = count

  console.log(obj.count) // 1
  console.log(obj.count === count.value) // true
  ```

- **另请参阅**
  - [指南 - 响应式基础](/guide/essentials/reactivity-fundamentals)
  - [指南 - 为 reactive() 标注类型](/guide/typescript/composition-api#typing-reactive) <sup class="vt-badge ts" />

## readonly() {#readonly}

接受一个对象（响应式或普通对象）或 [ref](#ref)，返回一个原只读的代理。

- **类型**

  ```ts
  function readonly<T extends object>(target: T): DeepReadonly<UnwrapNestedRefs<T>>
  ```

- **详情**

  只读代理是深层的：访问的任何嵌套属性也将是只读的。它还具有与 `reactive()` 相同的 ref 解包行为，只是解包的值也将被设为只读。

  要避免深层转换，请改用 [shallowReadonly()](./reactivity-advanced#shallowreadonly)。

- **示例**

  ```js
  const original = reactive({ count: 0 })

  const copy = readonly(original)

  watchEffect(() => {
    // 适用于响应式追踪
    console.log(copy.count)
  })

  // 修改原始值会触发依赖副本的侦听器
  original.count++

  // 修改副本将失败并导致警告
  copy.count++ // 警告！
  ```

## watchEffect() {#watcheffect}

立即运行一个函数，同时响应式地追踪其依赖，并在依赖更改时重新运行。

- **类型**

  ```ts
  function watchEffect(
    effect: (onCleanup: OnCleanup) => void,
    options?: WatchEffectOptions,
  ): WatchHandle

  type OnCleanup = (cleanupFn: () => void) => void

  interface WatchEffectOptions {
    flush?: 'pre' | 'post' | 'sync' // 默认：'pre'
    onTrack?: (event: DebuggerEvent) => void
    onTrigger?: (event: DebuggerEvent) => void
  }

  interface WatchHandle {
    (): void // 可调用，与 `stop` 相同
    pause: () => void
    resume: () => void
    stop: () => void
  }
  ```

- **详情**

  第一个参数是要运行的 effect 函数。effect 函数接收一个可用于注册清理回调的函数。清理回调将在 effect 下次重新运行之前被调用，可用于清理失效的副作用，例如待处理的异步请求（见下方示例）。

  第二个参数是可选的 options 对象，可用于调整 effect 的刷新时机或调试 effect 的依赖。

  默认情况下，侦听器将在组件渲染之前运行。将 `flush` 设置为 `'post'` 将使侦听器延迟到组件渲染之后。有关详细信息，请参阅 [回调刷新时机](/guide/essentials/watchers#callback-flush-timing)。在极少数情况下，可能有必要在响应式依赖项更改时立即触发侦听器，例如使缓存失效。这可以通过使用 `flush: 'sync'` 来实现。但是，如果同时更新多个属性，此设置应谨慎使用，因为它可能导致性能和数据一致性问题。

  返回值是一个句柄函数，可以调用它来停止 effect 再次运行。

- **示例**

  ```js
  const count = ref(0)

  watchEffect(() => console.log(count.value))
  // -> 输出 0

  count.value++
  // -> 输出 1
  ```

  停止侦听器：

  ```js
  const stop = watchEffect(() => {})

  // 当不再需要侦听器时：
  stop()
  ```

  暂停/恢复侦听器：

  ```js
  const { stop, pause, resume } = watchEffect(() => {})

  // 临时暂停侦听器
  pause()

  // 稍后恢复
  resume()

  // 停止
  stop()
  ```

  副作用清理：

  ```js
  watchEffect(async onCleanup => {
    const { response, cancel } = doAsyncWork(newId)
    // 如果 `id` 更改，将调用 `cancel`，
    // 取消先前的请求（如果尚未完成）
    onCleanup(cancel)
    data.value = await response
  })
  ```

  副作用清理（版本）：

  ```js
  import { onWatcherCleanup } from '@rue-js/rue'

  watchEffect(async () => {
    const { response, cancel } = doAsyncWork(newId)
    // 如果 `id` 更改，将调用 `cancel`，
    // 取消先前的请求（如果尚未完成）
    onWatcherCleanup(cancel)
    data.value = await response
  })
  ```

  选项：

  ```js
  watchEffect(() => {}, {
    flush: 'post',
    onTrack(e) {
      debugger
    },
    onTrigger(e) {
      debugger
    },
  })
  ```

- **另请参阅**
  - [指南 - 侦听器](/guide/essentials/watchers#watcheffect)
  - [指南 - 侦听器调试](/guide/extras/reactivity-in-depth#watcher-debugging)

## watchPostEffect() {#watchposteffect}

带有 `flush: 'post'` 选项的 [`watchEffect()`](#watcheffect) 别名。

## watchSyncEffect() {#watchsynceffect}

带有 `flush: 'sync'` 选项的 [`watchEffect()`](#watcheffect) 别名。

## watch() {#watch}

侦听一个或多个响应式数据源，并在数据源变化时调用回调函数。

- **类型**

  ```ts
  // 侦听单个源
  function watch<T>(
    source: WatchSource<T>,
    callback: WatchCallback<T>,
    options?: WatchOptions,
  ): WatchHandle

  // 侦听多个源
  function watch<T>(
    sources: WatchSource<T>[],
    callback: WatchCallback<T[]>,
    options?: WatchOptions,
  ): WatchHandle

  type WatchCallback<T> = (
    value: T,
    oldValue: T,
    onCleanup: (cleanupFn: () => void) => void,
  ) => void

  type WatchSource<T> =
    | Ref<T> // ref
    | (() => T) // getter
    | (T extends object ? T : never) // reactive object

  interface WatchOptions extends WatchEffectOptions {
    immediate?: boolean // 默认：false
    deep?: boolean | number // 默认：false
    flush?: 'pre' | 'post' | 'sync' // 默认：'pre'
    onTrack?: (event: DebuggerEvent) => void
    onTrigger?: (event: DebuggerEvent) => void
    once?: boolean // 默认：false
  }

  interface WatchHandle {
    (): void // 可调用，与 `stop` 相同
    pause: () => void
    resume: () => void
    stop: () => void
  }
  ```

  > 为便于阅读，类型已简化。

- **详情**

  `watch()` 默认是懒侦听的——即回调仅在侦听源更改时被调用。

  第一个参数是侦听器的**源**。源可以是以下之一：
  - 返回值的 getter 函数
  - ref
  - 响应式对象
  - ...或上述内容的数组。

  第二个参数是源更改时调用的回调。回调接收三个参数：新值、旧值和用于注册副作用清理回调的函数。清理回调将在 effect 下次重新运行之前被调用，可用于清理失效的副作用，例如待处理的异步请求。

  当侦听多个源时，回调接收两个数组，分别包含对应源数组的新值/旧值。

  第三个可选参数是一个 options 对象，支持以下选项：
  - **`immediate`**：在侦听器创建时立即触发回调。第一次调用时旧值将为 `undefined`。
  - **`deep`**：如果源是对象，则强制深度遍历，以便在深度变更时触发回调。在版本中，这也可以是指示最大遍历深度的数字。请参阅 [深度侦听器](/guide/essentials/watchers#deep-watchers)。
  - **`flush`**：调整回调的刷新时机。请参阅 [回调刷新时机](/guide/essentials/watchers#callback-flush-timing) 和 [`watchEffect()`](/api/reactivity-core#watcheffect)。
  - **`onTrack / onTrigger`**：调试侦听器的依赖。请参阅 [侦听器调试](/guide/extras/reactivity-in-depth#watcher-debugging)。
  - **`once`**：只运行一次回调。侦听器在第一次回调运行后自动停止。

  与 [`watchEffect()`](#watcheffect) 相比，`watch()` 使我们能够：
  - 惰性地执行副作用；
  - 更具体地说明应该触发侦听器重新运行的状态；
  - 访问侦听状态的先前值和当前值。

- **示例**

  侦听 getter：

  ```js
  const state = reactive({ count: 0 })
  watch(
    () => state.count,
    (count, prevCount) => {
      /* ... */
    },
  )
  ```

  侦听 ref：

  ```js
  const count = ref(0)
  watch(count, (count, prevCount) => {
    /* ... */
  })
  ```

  当侦听多个源时，回调接收包含对应源数组的新值/旧值的数组：

  ```js
  watch([fooRef, barRef], ([foo, bar], [prevFoo, prevBar]) => {
    /* ... */
  })
  ```

  当使用 getter 源时，只有当 getter 的返回值更改时，侦听器才会触发。如果希望即使深度变更也触发回调，需要使用 `{ deep: true }` 强制侦听器进入深度模式。注意在深度模式下，如果回调是由深度变更触发的，新值和旧值将是同一个对象：

  ```js
  const state = reactive({ count: 0 })
  watch(
    () => state,
    (newValue, oldValue) => {
      // newValue === oldValue
    },
    { deep: true },
  )
  ```

  当直接侦听响应式对象时，侦听器自动进入深度模式：

  ```js
  const state = reactive({ count: 0 })
  watch(state, () => {
    /* 在状态深度变更时触发 */
  })
  ```

  `watch()` 与 [`watchEffect()`](#watcheffect) 共享相同的刷新时机和调试选项：

  ```js
  watch(source, callback, {
    flush: 'post',
    onTrack(e) {
      debugger
    },
    onTrigger(e) {
      debugger
    },
  })
  ```

  停止侦听器：

  ```js
  const stop = watch(source, callback)

  // 当不再需要侦听器时：
  stop()
  ```

  暂停/恢复侦听器：

  ```js
  const { stop, pause, resume } = watch(() => {})

  // 临时暂停侦听器
  pause()

  // 稍后恢复
  resume()

  // 停止
  stop()
  ```

  副作用清理：

  ```js
  watch(id, async (newId, oldId, onCleanup) => {
    const { response, cancel } = doAsyncWork(newId)
    // 如果 `id` 更改，将调用 `cancel`，
    // 取消先前的请求（如果尚未完成）
    onCleanup(cancel)
    data.value = await response
  })
  ```

  副作用清理：

  ```js
  import { onWatcherCleanup } from '@rue-js/rue'

  watch(id, async newId => {
    const { response, cancel } = doAsyncWork(newId)
    onWatcherCleanup(cancel)
    data.value = await response
  })
  ```

- **另请参阅**
  - [指南 - 侦听器](/guide/essentials/watchers)
  - [指南 - 侦听器调试](/guide/extras/reactivity-in-depth#watcher-debugging)

## onWatcherCleanup() {#onwatchercleanup}

注册一个清理函数，在当前侦听器即将重新运行时执行。只能在 `watchEffect` effect 函数或 `watch` 回调函数的同步执行期间调用（即不能在异步函数中的 `await` 语句之后调用。）

- **类型**

  ```ts
  function onWatcherCleanup(cleanupFn: () => void, failSilently?: boolean): void
  ```

- **示例**

  ```ts
  import { watch, onWatcherCleanup } from '@rue-js/rue'

  watch(id, newId => {
    const { response, cancel } = doAsyncWork(newId)
    // 如果 `id` 更改，将调用 `cancel`，
    // 取消先前的请求（如果尚未完成）
    onWatcherCleanup(cancel)
  })
  ```
