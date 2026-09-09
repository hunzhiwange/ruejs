# 响应式 API：核心 {#reactivity-api-core}

:::info 另请参阅
为了更好地理解响应式 API，建议阅读指南中的以下章节：

- [响应式基础](/guide/guide/essentials/reactivity-fundamentals)（将 API 偏好设置为组合式 API）
- [深入响应式系统](/guide/guide/extras/reactivity-in-depth)
  :::

## ref() {#ref}

接受一个内部值，返回一个响应式的、可更改的 ref 对象，此对象只有一个指向其内部值的属性 `.value`。

- **类型**

  ```ts
  function ref<T = any>(
    initial: T,
    options?: { equals?: (prev: T, next: T) => boolean } | null,
    forceGlobal?: boolean,
  ): Ref<T>

  interface Ref<T> {
    value: T
  }
  ```

- **详情**

  ref 对象是可更改的——也就是说，你可以为 `.value` 赋予新的值。它也是响应式的，即所有对 `.value` 的读取操作都会被追踪，写入操作会触发相关副作用。

  在 JSX child 的最终展示位置，Rue 会自动解包带有内部 Ref 标记（`__rue_ref__ === true`）的值，因此可以写 `<span>{count}</span>`。`computed()` 和 `customRef()` 返回的 Ref 也遵循这一规则；普通 JavaScript 表达式、事件处理和属性绑定仍需显式读取 `.value`。Signal 不属于 Ref，展示时继续使用 `count.get()`。

  ```tsx
  const count = ref(0)
  const doubled = computed(() => count.value * 2)

  const view = (
    <>
      <span>{count}</span>
      <span>{doubled}</span>
      <input value={count.value} />
    </>
  )
  ```

  自动解包只发生在表达式计算完成后的最终展示边界，不会按是否存在 `value` 属性来解包普通对象，也不适用于 React 风格的 DOM `useRef`。

  Rue 中的 `ref()` 与运行时 Hook API 保持一致：除了初始值外，还支持传入 `options.equals` 自定义比较函数，以及可选的 `forceGlobal` 参数。`forceGlobal` 通常只用于底层封装、测试或需要跳过当前组件 Hook 槽位的场景。

  ref 基于 Signal；对象保持普通对象。使用路径 API、替换根值或经过编译的状态写入触发更新。

  [`shallowRef()`](/api/api/reactivity-advanced#shallowref) 只追踪根值，嵌套对象仍为普通对象。

- **示例**

  ```js
  const count = ref(0)
  console.log(count.value) // 0

  count.value = 1
  console.log(count.value) // 1

  const state = ref({ count: 1 }, { equals: (prev, next) => prev.count === next.count })

  state.value = { count: 1 } // 相等，不触发更新
  ```

- **另请参阅**
  - [指南 - ref() 的响应式基础](/guide/guide/essentials/reactivity-fundamentals#ref)
  - [指南 - 为 ref() 标注类型](/guide/guide/typescript/composition-api#typing-ref) <sup class="vt-badge ts" />

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
  - [指南 - 计算属性](/guide/guide/essentials/computed)
  - [指南 - 计算属性调试](/guide/guide/extras/reactivity-in-depth#computed-debugging)
  - [指南 - 为 computed() 标注类型](/guide/guide/typescript/composition-api#typing-computed) <sup class="vt-badge ts" />
  - [指南 - 性能 - 计算属性稳定性](/guide/guide/best-practices/performance#computed-stability)

## signal() {#signal}

创建状态句柄，支持根值读写和显式路径读写。对象不会转换为代理。

```ts
import { signal, computed } from '@rue-js/rue'

const state = signal({ user: { name: 'Rue' }, count: 0 })
const name = computed(() => state.getPath('user.name'))
state.setPath('user.name', 'Signal')
state.updatePath('count', value => Number(value) + 1)
const snapshot = structuredClone(state.get())
state.set(snapshot)
```

`get()` 追踪根读取，`peek()` 不收集依赖，两者都返回当前值而不克隆。`getPath(path)` 追踪路径，`setPath(path, value)` 写入，`updatePath(path, updater)` 基于当前路径值更新。路径可使用点分字符串或键数组；键中包含点时使用数组。路径读取返回 `unknown`，在 TypeScript 中按数据结构缩窄类型。

原地路径更新可保持对象引用不变；通过普通对象引用写入不会通知依赖。组件成员语法需要 Rue SWC 的 `useState` 编译支持。

### 旧对象 API 迁移

`reactive()` 与 `readonly()` 已删除。对象状态使用 Signal 或编译 `useState`，只读派生值使用不带 setter 的 `computed`。详见[迁移说明](/guide/guide/extras/reactivity-in-depth#migration)。

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

  默认情况下，侦听器将在组件渲染之前运行。将 `flush` 设置为 `'post'` 将使侦听器延迟到组件渲染之后。有关详细信息，请参阅 [回调刷新时机](/guide/guide/essentials/watchers#callback-flush-timing)。在极少数情况下，可能有必要在响应式依赖项更改时立即触发侦听器，例如使缓存失效。这可以通过使用 `flush: 'sync'` 来实现。但是，如果同时更新多个属性，此设置应谨慎使用，因为它可能导致性能和数据一致性问题。

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
  - [指南 - 侦听器](/guide/guide/essentials/watchers#watcheffect)
  - [指南 - 侦听器调试](/guide/guide/extras/reactivity-in-depth#watcher-debugging)

## watchPostEffect() {#watchposteffect}

带有 `flush: 'post'` 选项的 [`watchEffect()`](#watcheffect) 别名。

## watchSyncEffect() {#watchsynceffect}

带有 `flush: 'sync'` 选项的 [`watchEffect()`](#watcheffect) 别名。

- **类型**

  ```ts
  function watchSyncEffect(
    effect: () => void,
    options?: {
      scheduler?: (run: () => void) => void
    },
  ): WatchHandle
  ```

- **详情**

  `watchSyncEffect()` 会立即运行一次传入的 effect，并在其追踪到的响应式依赖发生变化时同步重新运行。它等价于使用 `flush: 'sync'` 的 `watchEffect()`。

  同步 effect 不会等待组件更新队列或下一轮响应式 flush，因此适合处理必须立刻失效的轻量状态，例如缓存标记或简单布尔值。对于可能在同一个调用栈中连续变化的数据，例如数组或批量对象更新，应谨慎使用同步侦听器，以避免重复运行带来的性能开销或中间状态观察。

- **示例**

  ```js
  import { ref, watchSyncEffect } from '@rue-js/rue'

  const count = ref(0)

  watchSyncEffect(() => {
    console.log(count.value)
  })

  count.value++
  // effect 会在本次响应式写入后同步重新运行
  ```

- **另请参阅**
  - [指南 - 同步侦听器](/guide/guide/essentials/watchers#sync-watchers)
  - [`watchEffect()`](#watcheffect)

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
  - Signal 句柄
  - ...或上述内容的数组。

  第二个参数是源更改时调用的回调。回调接收三个参数：新值、旧值和用于注册副作用清理回调的函数。清理回调将在 effect 下次重新运行之前被调用，可用于清理失效的副作用，例如待处理的异步请求。

  当侦听多个源时，回调接收两个数组，分别包含对应源数组的新值/旧值。

  第三个可选参数是一个 options 对象，支持以下选项：
  - **`immediate`**：在侦听器创建时立即触发回调。第一次调用时旧值将为 `undefined`。
  - **`deep`**：如果源是对象，则强制深度遍历，以便在深度变更时触发回调。在版本中，这也可以是指示最大遍历深度的数字。请参阅 [深度侦听器](/guide/guide/essentials/watchers#deep-watchers)。
  - **`flush`**：调整回调的刷新时机。请参阅 [回调刷新时机](/guide/guide/essentials/watchers#callback-flush-timing) 和 [`watchEffect()`](/api/api/reactivity-core#watcheffect)。
  - **`onTrack / onTrigger`**：调试侦听器的依赖。请参阅 [侦听器调试](/guide/guide/extras/reactivity-in-depth#watcher-debugging)。
  - **`once`**：只运行一次回调。侦听器在第一次回调运行后自动停止。

  与 [`watchEffect()`](#watcheffect) 相比，`watch()` 使我们能够：
  - 惰性地执行副作用；
  - 更具体地说明应该触发侦听器重新运行的状态；
  - 访问侦听状态的先前值和当前值。

- **示例**

  侦听 getter：

  ```js
  const state = signal({ count: 0 })
  watch(
    () => state.getPath('count'),
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

  路径侦听应在 getter 中调用 `getPath`。普通对象的属性赋值不会触发通知，`deep` 也不能恢复已删除的代理行为。需要旧值比较时优先侦听标量路径；需要独立的历史对象时显式复制。

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
  - [指南 - 侦听器](/guide/guide/essentials/watchers)
  - [指南 - 侦听器调试](/guide/guide/extras/reactivity-in-depth#watcher-debugging)

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
