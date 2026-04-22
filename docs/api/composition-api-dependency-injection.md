# 组合式 API：<br>依赖注入 {#composition-api-dependency-injection}

## provide() {#provide} @todo

提供一个值，可由后代组件注入。

- **类型**

  ```ts
  function provide<T>(key: InjectionKey<T> | string, value: T): void
  ```

- **详情**

  `provide()` 接受两个参数：键（可以是字符串或符号）和要注入的值。

  使用 TypeScript 时，键可以是类型为 `InjectionKey` 的符号 - 这是 Rue 提供的实用类型，扩展了 `Symbol`，可用于在 `provide()` 和 `inject()` 之间同步值类型。

  与生命周期钩子注册 API 类似，`provide()` 必须在组件的 `setup()` 阶段同步调用。

- **示例**

  ```tsx
  import { useSignal, provide } from '@rue-js/rue'
  import { countSymbol } from './injectionSymbols'

  // 提供静态值
  provide('path', '/project/')

  // 提供响应式值
  const [count, setCount] = useSignal(0)
  provide('count', count)

  // 使用 Symbol 键提供
  provide(countSymbol, count)
  ```

- **另请参阅**
  - [指南 - Provide / Inject](/guide/components/provide-inject)
  - [指南 - 为 Provide / Inject 添加类型](/guide/typescript/composition-api#typing-provide-inject) <sup class="vt-badge ts" />

## inject() {#inject} @todo

注入由祖先组件或应用程序（通过 `app.provide()`）提供的值。

- **类型**

  ```ts
  // 没有默认值
  function inject<T>(key: InjectionKey<T> | string): T | undefined

  // 有默认值
  function inject<T>(key: InjectionKey<T> | string, defaultValue: T): T

  // 有工厂函数
  function inject<T>(
    key: InjectionKey<T> | string,
    defaultValue: () => T,
    treatDefaultAsFactory: true,
  ): T
  ```

- **详情**

  第一个参数是注入键。Rue 将遍历父级链以查找具有匹配键的提供的值。如果父级链中有多个组件提供相同的键，则最接近注入组件的那个将"遮蔽"其上方的组件，并使用其值。如果没有找到具有匹配键的值，`inject()` 将返回 `undefined`，除非提供了默认值。

  第二个参数是可选的，是在找不到匹配值时使用的默认值。

  第二个参数也可以是返回昂贵创建值的工厂函数。在这种情况下，必须将 `true` 作为第三个参数传递，以指示该函数应被用作工厂而不是值本身。

  与生命周期钩子注册 API 类似，`inject()` 必须在组件的 `setup()` 阶段同步调用。

  使用 TypeScript 时，键可以是 `InjectionKey` 类型 - 这是 Rue 提供的实用类型，扩展了 `Symbol`，可用于在 `provide()` 和 `inject()` 之间同步值类型。

- **示例**

  假设父组件已按照前面 `provide()` 示例中显示的方式提供了值：

  ```tsx
  import { inject } from '@rue-js/rue'
  import { countSymbol } from './injectionSymbols'

  // 注入没有默认值的静态值
  const path = inject('path')

  // 注入响应式值
  const count = inject('count')

  // 使用 Symbol 键注入
  const count2 = inject(countSymbol)

  // 注入带默认值
  const bar = inject('path', '/default-path')

  // 注入带函数默认值
  const fn = inject('function', () => {})

  // 注入带工厂函数默认值
  const baz = inject('factory', () => new ExpensiveObject(), true)
  ```

- **另请参阅**
  - [指南 - Provide / Inject](/guide/components/provide-inject)
  - [指南 - 为 Provide / Inject 添加类型](/guide/typescript/composition-api#typing-provide-inject) <sup class="vt-badge ts" />

## hasInjectionContext() {#has-injection-context} @todo

- 仅在 3.3+ 中支持

如果可以在不警告在错误位置调用的情况下使用 [inject()](#inject)，则返回 true。此方法旨在供希望在内部使用 `inject()` 而不会向最终用户触发警告的库使用。

- **类型**

  ```ts
  function hasInjectionContext(): boolean
  ```
