# 选项：组合 {#options-composition}

## provide {#provide}

提供可由后代组件注入的值。

- **类型**

  ```ts
  interface ComponentOptions {
    provide?: object | ((this: ComponentPublicInstance) => object)
  }
  ```

- **详情**

  `provide` 和 [`inject`](#inject) 一起使用，允许祖先组件为其所有后代充当依赖注入器，无论组件层次结构有多深，只要它们在同一父级链中。

  `provide` 选项应该是一个对象或返回对象的函数。该对象包含可供注入其后代的属性。您可以在此对象中使用 Symbol 作为键。

- **示例**

  基本用法：

  ```js
  const s = Symbol()

  export default {
    provide: {
      foo: 'foo',
      [s]: 'bar',
    },
  }
  ```

  使用函数提供每个组件的状态：

  ```js
  export default {
    data() {
      return {
        msg: 'foo',
      }
    },
    provide() {
      return {
        msg: this.msg,
      }
    },
  }
  ```

  请注意，上面提供的 `msg` 将**不是**响应式的。有关更多详细信息，请参见[使用响应性](/guide/components/provide-inject#working-with-reactivity)。

- **另请参阅** [Provide / Inject](/guide/components/provide-inject)

## inject {#inject}

声明要从祖先提供者注入当前组件的属性。

- **类型**

  ```ts
  interface ComponentOptions {
    inject?: ArrayInjectOptions | ObjectInjectOptions
  }

  type ArrayInjectOptions = string[]

  type ObjectInjectOptions = {
    [key: string | symbol]: string | symbol | { from?: string | symbol; default?: any }
  }
  ```

- **详情**

  `inject` 选项应该是：
  - 字符串数组，或
  - 对象，其中键是本地绑定名称，值可以是：
    - 在可用注入中搜索的键（字符串或 Symbol），或
    - 对象，其中：
      - `from` 属性是在可用注入中搜索的键（字符串或 Symbol），并且
      - `default` 属性用作回退值。类似于 props 默认值，对象类型需要工厂函数以避免在多个组件实例之间共享值。

  如果没有提供匹配的属性或默认值，注入的属性将为 `undefined`。

  请注意，注入的绑定**不是**响应式的。这是有意为之。但是，如果注入的值是响应式对象，则该对象上的属性确实保持响应性。有关更多详细信息，请参见[使用响应性](/guide/components/provide-inject#working-with-reactivity)。

- **示例**

  基本用法：

  ```js
  export default {
    inject: ['foo'],
    created() {
      console.log(this.foo)
    },
  }
  ```

  使用注入的值作为 prop 的默认值：

  ```js
  const Child = {
    inject: ['foo'],
    props: {
      bar: {
        default() {
          return this.foo
        },
      },
    },
  }
  ```

  使用注入的值作为数据条目：

  ```js
  const Child = {
    inject: ['foo'],
    data() {
      return {
        bar: this.foo,
      }
    },
  }
  ```

  注入可以是可选的带默认值：

  ```js
  const Child = {
    inject: {
      foo: { default: 'foo' },
    },
  }
  ```

  如果需要从具有不同名称的属性注入，请使用 `from` 表示源属性：

  ```js
  const Child = {
    inject: {
      foo: {
        from: 'bar',
        default: 'foo',
      },
    },
  }
  ```

  类似于 prop 默认值，非原始值需要使用工厂函数：

  ```js
  const Child = {
    inject: {
      foo: {
        from: 'bar',
        default: () => [1, 2, 3],
      },
    },
  }
  ```

- **另请参阅** [Provide / Inject](/guide/components/provide-inject)

## mixins {#mixins}

要混入当前组件的选项对象数组。

- **类型**

  ```ts
  interface ComponentOptions {
    mixins?: ComponentOptions[]
  }
  ```

- **详情**

  `mixins` 选项接受混入对象数组。这些混入对象可以包含像普通实例对象一样的实例选项，它们将使用特定的选项合并逻辑与最终选项合并。例如，如果您的混入包含一个 `created` 钩子，而组件本身也有一个，两个函数都将被调用。

  混入钩子按照它们提供的顺序调用，并在组件自己的钩子之前调用。

  :::warning 不再推荐
  在 Rue 2 中，混入是创建可重用组件逻辑块的主要机制。虽然混入在 Rue 3 中继续得到支持，但现在首选使用组合式 API 的[组合式函数](/guide/reusability/composables)作为组件之间代码重用的方法。
  :::

- **示例**

  ```js
  const mixin = {
    created() {
      console.log(1)
    },
  }

  createApp({
    created() {
      console.log(2)
    },
    mixins: [mixin],
  })

  // => 1
  // => 2
  ```

## extends {#extends}

要扩展的"基类"组件。

- **类型**

  ```ts
  interface ComponentOptions {
    extends?: ComponentOptions
  }
  ```

- **详情**

  允许一个组件扩展另一个，继承其组件选项。

  从实现角度来看，`extends` 几乎与 `mixins` 相同。`extends` 指定的组件将被视为第一个混入。

  然而，`extends` 和 `mixins` 表达了不同的意图。`mixins` 选项主要用于组合功能块，而 `extends` 主要关注继承。

  与 `mixins` 一样，任何选项（`setup()` 除外）都将使用相关的合并策略进行合并。

- **示例**

  ```js
  const CompA = { ... }

  const CompB = {
    extends: CompA,
    ...
  }
  ```

  :::warning 不推荐用于组合式 API
  `extends` 是为选项式 API 设计的，不处理 `setup()` 钩子的合并。

  在组合式 API 中，逻辑重用的首选心智模型是"组合"而非"继承"。如果您有需要在一个组件中重用的逻辑，请考虑将其提取到[组合式函数](/guide/reusability/composables#composables)中。

  如果您仍然打算使用组合式 API "扩展"组件，可以在扩展组件的 `setup()` 中调用基组件的 `setup()`：

  ```js
  import Base from './Base.js'
  export default {
    extends: Base,
    setup(props, ctx) {
      return {
        ...Base.setup(props, ctx),
        // 本地绑定
      }
    },
  }
  ```

  :::
