---
pageClass: api
---

# 内置组件 {#built-in-components}

:::info 注册和使用
内置组件可以直接在 JSX/TSX 中使用，无需注册。它们也是可 tree-shake 的：只有在被使用时才会包含在构建中。

在[渲染函数](/guide/extras/render-function)中使用它们时，需要显式导入。例如：

```js
import { h, Transition } from 'rue-js'

h(Transition, {
  /* props */
})
```

:::

## `<Transition>` {#transition}

为**单个**元素或组件提供动画过渡效果。

- **Props**

  ```ts
  interface TransitionProps {
    /**
     * 用于自动生成过渡 CSS 类名。
     * 例如 `name: 'fade'` 将自动扩展为 `.fade-enter`、
     * `.fade-enter-active` 等。
     */
    name?: string
    /**
     * 是否应用 CSS 过渡类。
     * 默认值：true
     */
    css?: boolean
    /**
     * 指定要等待的过渡事件类型以
     * 确定过渡结束时间。
     * 默认行为是自动检测持续时间较长的类型。
     */
    type?: 'transition' | 'animation'
    /**
     * 指定过渡的显式持续时间。
     * 默认行为是等待根过渡元素上的第一个 `transitionend`
     * 或 `animationend` 事件。
     */
    duration?: number | { enter: number; leave: number }
    /**
     * 控制离开/进入过渡的时间序列。
     * 默认行为是同时进行。
     */
    mode?: 'in-out' | 'out-in' | 'default'
    /**
     * 是否在初始渲染时应用过渡。
     * 默认值：false
     */
    appear?: boolean

    /**
     * 用于自定义过渡类的属性。
     * 在模板中使用短横线形式，例如 enter-from-class="xxx"
     */
    enterFromClass?: string
    enterActiveClass?: string
    enterToClass?: string
    appearFromClass?: string
    appearActiveClass?: string
    appearToClass?: string
    leaveFromClass?: string
    leaveActiveClass?: string
    leaveToClass?: string
  }
  ```

- **事件**
  - `@before-enter`
  - `@before-leave`
  - `@enter`
  - `@leave`
  - `@appear`
  - `@after-enter`
  - `@after-leave`
  - `@after-appear`
  - `@enter-cancelled`
  - `@leave-cancelled` (`v-show` 专用)
  - `@appear-cancelled`

- **示例**

  简单元素：

  ```tsx
  <Transition>{ok && <div>toggled content</div>}</Transition>
  ```

  通过更改 `key` 属性强制触发过渡：

  ```tsx
  <Transition>
    <div key={text}>{text}</div>
  </Transition>
  ```

  动态组件，带过渡模式 + 首次渲染时动画：

  ```tsx
  <Transition name="fade" mode="out-in" appear>
    {view}
  </Transition>
  ```

  监听过渡事件：

  ```tsx
  <Transition onAfterEnter={onTransitionComplete}>{ok && <div>toggled content</div>}</Transition>
  ```

- **另请参阅** [指南 - Transition](/guide/built-ins/transition)

## `<TransitionGroup>` {#transitiongroup}

为列表中的**多个**元素或组件提供过渡效果。

- **Props**

  `<TransitionGroup>` 接受与 `<Transition>` 相同的 props，除了 `mode`，外加两个额外的 props：

  ```ts
  interface TransitionGroupProps extends Omit<TransitionProps, 'mode'> {
    /**
     * 如果未定义，则渲染为片段。
     */
    tag?: string
    /**
     * 用于自定义在移动过渡期间应用的 CSS 类。
     * 在模板中使用短横线形式，例如 move-class="xxx"
     */
    moveClass?: string
  }
  ```

- **事件**

  `<TransitionGroup>` 发出与 `<Transition>` 相同的事件。

- **详情**

  默认情况下，`<TransitionGroup>` 不渲染包装 DOM 元素，但可以通过 `tag` prop 定义一个。

  注意，`<transition-group>` 中的每个子元素必须[**具有唯一的 key**](/guide/essentials/list#maintaining-state-with-key)，动画才能正常工作。

  `<TransitionGroup>` 通过 CSS transform 支持移动过渡。当子元素在屏幕上的位置在更新后发生变化时，它将被应用一个移动的 CSS 类（从 `name` 属性自动生成或使用 `move-class` prop 配置）。如果在应用移动类时 CSS `transform` 属性是"可过渡的"，则元素将使用[FLIP 技术](https://aerotwist.com/blog/flip-your-animations/)平滑地动画到其目标位置。

- **示例**

  ```tsx
  <TransitionGroup tag="ul" name="slide">
    {items.map(item => (
      <li key={item.id}>{item.text}</li>
    ))}
  </TransitionGroup>
  ```

- **另请参阅** [指南 - TransitionGroup](/guide/built-ins/transition-group)

## `<KeepAlive>` {#keepalive}

缓存内部动态切换的组件。

- **Props**

  ```ts
  interface KeepAliveProps {
    /**
     * 如果指定，只有名称与
     * `include` 匹配的组件才会被缓存。
     */
    include?: MatchPattern
    /**
     * 名称与 `exclude` 匹配的任何组件
     * 将不会被缓存。
     */
    exclude?: MatchPattern
    /**
     * 要缓存的组件实例的最大数量。
     */
    max?: number | string
  }

  type MatchPattern = string | RegExp | (string | RegExp)[]
  ```

- **详情**

  当包裹在动态组件周围时，`<KeepAlive>` 会缓存不活动的组件实例而不销毁它们。

  任何时候，`<KeepAlive>` 的直接子级中只能有一个活动的组件实例。

  当在 `<KeepAlive>` 内部切换组件时，其 `activated` 和 `deactivated` 生命周期钩子将相应地被调用，作为 `mounted` 和 `unmounted` 的替代，后者不会被调用。这适用于 `<KeepAlive>` 的直接子级及其所有后代。

- **示例**

  基本用法：

  ```tsx
  <KeepAlive>{view}</KeepAlive>
  ```

  与条件渲染一起使用时，一次只能渲染一个组件：

  ```tsx
  <KeepAlive>{a > 1 ? <CompA /> : <CompB />}</KeepAlive>
  ```

  与 `<Transition>` 一起使用：

  ```tsx
  <Transition>
    <KeepAlive>{view}</KeepAlive>
  </Transition>
  ```

  使用 `include` / `exclude`：

  ```tsx
  {
    /* 逗号分隔的字符串 */
  }
  ;<KeepAlive include="a,b">{view}</KeepAlive>

  {
    /* 正则表达式 */
  }
  ;<KeepAlive include={/a|b/}>{view}</KeepAlive>

  {
    /* 数组 */
  }
  ;<KeepAlive include={['a', 'b']}>{view}</KeepAlive>
  ```

  使用 `max`：

  ```tsx
  <KeepAlive max={10}>{view}</KeepAlive>
  ```

- **另请参阅** [指南 - KeepAlive](/guide/built-ins/keep-alive)

## `<Teleport>` {#teleport}

将其插槽内容渲染到 DOM 的另一部分。

- **Props**

  ```ts
  interface TeleportProps {
    /**
     * 必需。指定目标容器。
     * 可以是选择器或实际元素。
     */
    to: string | HTMLElement
    /**
     * 当为 `true` 时，内容将保留在其原始
     * 位置，而不是移动到目标容器。
     * 可以动态更改。
     */
    disabled?: boolean
    /**
     * 当为 `true` 时，Teleport 将延迟直到
     * 应用程序的其他部分挂载后再解析其目标。(3.5+)
     */
    defer?: boolean
  }
  ```

- **示例**

  指定目标容器：

  ```tsx
  <Teleport to="#some-id" />
  <Teleport to=".some-class" />
  <Teleport to="[data-teleport]" />
  ```

  有条件地禁用：

  ```tsx
  <Teleport to="#popup" disabled={displayVideoInline}>
    <video src="./my-movie.mp4" />
  </Teleport>
  ```

  延迟目标解析 <sup class="vt-badge" data-text="3.5+" />：

  ```tsx
  ;<Teleport defer to="#late-div">
    ...
  </Teleport>

  {
    /* 模板中稍后某处 */
  }
  ;<div id="late-div"></div>
  ```

- **另请参阅** [指南 - Teleport](/guide/built-ins/teleport)

## `<Suspense>` <sup class="vt-badge experimental" /> {#suspense}

用于协调组件树中的嵌套异步依赖项。

- **Props**

  ```ts
  interface SuspenseProps {
    timeout?: string | number
    suspensible?: boolean
  }
  ```

- **事件**
  - `@resolve`
  - `@pending`
  - `@fallback`

- **详情**

  `<Suspense>` 接受两个插槽：`#default` 插槽和 `#fallback` 插槽。它将在内存中渲染默认插槽时显示后备插槽的内容。

  如果在渲染默认插槽时遇到异步依赖项（[异步组件](/guide/components/async)和带有 [`async setup()`](/guide/built-ins/suspense#async-setup) 的组件），它将等待直到所有依赖项都解析完成后再显示默认插槽。

  通过将 Suspense 设置为 `suspensible`，所有异步依赖项处理将由父级 Suspense 处理。参见[实现细节](https://github.com/hunzhiwange/ruejs/pull/6736)

- **另请参阅** [指南 - Suspense](/guide/built-ins/suspense)
