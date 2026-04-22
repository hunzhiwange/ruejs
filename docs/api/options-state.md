# 选项：状态 {#options-state} @todo

> **@todo**: 整个 Options API 尚未实现。Rue 目前仅支持 Composition API / FC 模式。

## data {#data}

返回组件实例初始响应式状态的函数。

- **类型**

  ```ts
  interface ComponentOptions {
    data?(this: ComponentPublicInstance, vm: ComponentPublicInstance): object
  }
  ```

- **详情**

  该函数期望返回一个普通的 JavaScript 对象，Rue 将使其成为响应式。创建实例后，可以通过 `this.$data` 访问响应式数据对象。组件实例还会代理数据对象上找到的所有属性，因此 `this.a` 将等同于 `this.$data.a`。

  所有顶级数据属性都必须包含在返回的数据对象中。可以向 `this.$data` 添加新属性，但**不推荐**这样做。如果属性的所需值尚不可用，则应包含一个空值（例如 `undefined` 或 `null`）作为占位符，以确保 Rue 知道该属性存在。

  以 `_` 或 `$` 开头的属性**不会**在组件实例上被代理，因为它们可能与 Rue 的内部属性和 API 方法冲突。您必须将它们作为 `this.$data._property` 访问。

  **不推荐**返回具有自己状态行为的对象，例如浏览器 API 对象和原型属性。返回的对象理想情况下应该是一个仅表示组件状态的普通对象。

- **示例**

  ```js
  export default {
    data() {
      return { a: 1 }
    },
    created() {
      console.log(this.a) // 1
      console.log(this.$data) // { a: 1 }
    },
  }
  ```

  请注意，如果您将箭头函数与 `data` 属性一起使用，`this` 将不是组件的实例，但您仍然可以将实例作为函数的第一个参数访问：

  ```js
  data: vm => ({ a: vm.myProp })
  ```

- **另请参阅** [深入响应式系统](/guide/extras/reactivity-in-depth)

## props {#props}

声明组件的 props。

- **类型**

  ```ts
  interface ComponentOptions {
    props?: ArrayPropsOptions | ObjectPropsOptions
  }

  type ArrayPropsOptions = string[]

  type ObjectPropsOptions = { [key: string]: Prop }

  type Prop<T = any> = PropOptions<T> | PropType<T> | null

  interface PropOptions<T> {
    type?: PropType<T>
    required?: boolean
    default?: T | ((rawProps: object) => T)
    validator?: (value: unknown, rawProps: object) => boolean
  }

  type PropType<T> = { new (): T } | { new (): T }[]
  ```

  > 类型为可读性而简化。

- **详情**

  在 Rue 中，所有组件 props 都需要显式声明。组件 props 可以用两种形式声明：
  - 使用字符串数组的简单形式
  - 使用对象的完整形式，其中每个属性键是 prop 的名称，值是 prop 的类型（构造函数函数）或高级选项。

  使用基于对象的语法时，每个 prop 可以进一步定义以下选项：
  - **`type`**：可以是以下原生构造函数之一：`String`、`Number`、`Boolean`、`Array`、`Object`、`Date`、`Function`、`Symbol`，任何自定义构造函数函数或它们的数组。在开发模式下，Rue 将检查 prop 的值是否与声明的类型匹配，如果不匹配则抛出警告。有关更多详细信息，请参见 [Prop 验证](/guide/components/props#prop-validation)。

    另请注意，`Boolean` 类型的 prop 会影响其在开发和生产中的值转换行为。有关更多详细信息，请参见 [Boolean 转换](/guide/components/props#boolean-casting)。

  - **`default`**：指定当父级未传递 prop 或具有 `undefined` 值时的默认值。对象或数组默认值必须使用工厂函数返回。工厂函数还接收原始 props 对象作为参数。

  - **`required`**：定义 prop 是否为必需的。在非生产环境中，如果此值为真值且未传递 prop，则会抛出控制台警告。

  - **`validator`**：自定义验证函数，以 prop 值和 props 对象作为参数。在开发模式下，如果此函数返回假值（即验证失败），则会抛出控制台警告。

- **示例**

  简单声明：

  ```js
  export default {
    props: ['size', 'myMessage'],
  }
  ```

  带验证的对象声明：

  ```js
  export default {
    props: {
      // 类型检查
      height: Number,
      // 类型检查加其他验证
      age: {
        type: Number,
        default: 0,
        required: true,
        validator: value => {
          return value >= 0
        },
      },
    },
  }
  ```

- **另请参阅**
  - [指南 - Props](/guide/components/props)
  - [指南 - 为组件 Props 添加类型](/guide/typescript/options-api#typing-component-props) <sup class="vt-badge ts" />

## computed {#computed}

声明要在组件实例上暴露的计算属性。

- **类型**

  ```ts
  interface ComponentOptions {
    computed?: {
      [key: string]: ComputedGetter<any> | WritableComputedOptions<any>
    }
  }

  type ComputedGetter<T> = (this: ComponentPublicInstance, vm: ComponentPublicInstance) => T

  type ComputedSetter<T> = (this: ComponentPublicInstance, value: T) => void

  type WritableComputedOptions<T> = {
    get: ComputedGetter<T>
    set: ComputedSetter<T>
  }
  ```

- **详情**

  该选项接受一个对象，其中键是计算属性的名称，值是计算 getter 或具有 `get` 和 `set` 方法的对象（用于可写计算属性）。

  所有 getter 和 setter 的 `this` 上下文都会自动绑定到组件实例。

  请注意，如果将箭头函数与计算属性一起使用，`this` 将不会指向组件的实例，但您仍然可以将实例作为函数的第一个参数访问：

  ```js
  export default {
    computed: {
      aDouble: vm => vm.a * 2,
    },
  }
  ```

- **示例**

  ```js
  export default {
    data() {
      return { a: 1 }
    },
    computed: {
      // 只读
      aDouble() {
        return this.a * 2
      },
      // 可写
      aPlus: {
        get() {
          return this.a + 1
        },
        set(v) {
          this.a = v - 1
        },
      },
    },
    created() {
      console.log(this.aDouble) // => 2
      console.log(this.aPlus) // => 2

      this.aPlus = 3
      console.log(this.a) // => 2
      console.log(this.aDouble) // => 4
    },
  }
  ```

- **另请参阅**
  - [指南 - 计算属性](/guide/essentials/computed)
  - [指南 - 为计算属性添加类型](/guide/typescript/options-api#typing-computed-properties) <sup class="vt-badge ts" />

## methods {#methods}

声明要混入组件实例的方法。

- **类型**

  ```ts
  interface ComponentOptions {
    methods?: {
      [key: string]: (this: ComponentPublicInstance, ...args: any[]) => any
    }
  }
  ```

- **详情**

  声明的方法可以直接在组件实例上访问，或在模板表达式中使用。所有方法的 `this` 上下文都会自动绑定到组件实例，即使在被传递时也是如此。

  声明方法时避免使用箭头函数，因为它们将无法通过 `this` 访问组件实例。

- **示例**

  ```js
  export default {
    data() {
      return { a: 1 }
    },
    methods: {
      plus() {
        this.a++
      },
    },
    created() {
      this.plus()
      console.log(this.a) // => 2
    },
  }
  ```

- **另请参阅** [事件处理](/guide/essentials/event-handling)

## watch {#watch}

声明在数据更改时调用的侦听回调。

- **类型**

  ```ts
  interface ComponentOptions {
    watch?: {
      [key: string]: WatchOptionItem | WatchOptionItem[]
    }
  }

  type WatchOptionItem = string | WatchCallback | ObjectWatchOptionItem

  type WatchCallback<T> = (
    value: T,
    oldValue: T,
    onCleanup: (cleanupFn: () => void) => void,
  ) => void

  type ObjectWatchOptionItem = {
    handler: WatchCallback | string
    immediate?: boolean // default: false
    deep?: boolean // default: false
    flush?: 'pre' | 'post' | 'sync' // default: 'pre'
    onTrack?: (event: DebuggerEvent) => void
    onTrigger?: (event: DebuggerEvent) => void
  }
  ```

  > 类型为可读性而简化。

- **详情**

  `watch` 选项期望一个对象，其中键是要侦听的响应式组件实例属性（例如通过 `data` 或 `computed` 声明的属性）——值是相应的回调。回调接收被侦听源的新值和旧值。

  除了根级属性外，键也可以是简单的点分隔路径，例如 `a.b.c`。请注意，此用法**不支持**复杂表达式 - 仅支持点分隔路径。如果您需要侦听复杂数据源，请改用命令式 [`$watch()`](/api/component-instance#watch) API。

  值也可以是方法名称字符串（通过 `methods` 声明的），或包含额外选项的对象。使用对象语法时，回调应在 `handler` 字段下声明。其他选项包括：
  - **`immediate`**：在侦听器创建时立即触发回调。第一次调用时旧值将为 `undefined`。
  - **`deep`**：如果源是对象或数组，则强制深度遍历，以便在深层突变时触发回调。请参见 [深度侦听器](/guide/essentials/watchers#deep-watchers)。
  - **`flush`**：调整回调的刷新时间。请参见 [回调刷新时间](/guide/essentials/watchers#callback-flush-timing) 和 [`watchEffect()`](/api/reactivity-core#watcheffect)。
  - **`onTrack / onTrigger`**：调试侦听器的依赖项。请参见 [侦听器调试](/guide/extras/reactivity-in-depth#watcher-debugging)。

  声明侦听回调时避免使用箭头函数，因为它们将无法通过 `this` 访问组件实例。

- **示例**

  ```js
  export default {
    data() {
      return {
        a: 1,
        b: 2,
        c: {
          d: 4,
        },
        e: 5,
        f: 6,
      }
    },
    watch: {
      // 侦听顶级属性
      a(val, oldVal) {
        console.log(`new: ${val}, old: ${oldVal}`)
      },
      // 字符串方法名称
      b: 'someMethod',
      // 无论被侦听对象的属性在何种嵌套深度发生变化，回调都会被调用
      c: {
        handler(val, oldVal) {
          console.log('c changed')
        },
        deep: true,
      },
      // 侦听单个嵌套属性：
      'c.d': function (val, oldVal) {
        // do something
      },
      // 观察开始后立即调用回调
      e: {
        handler(val, oldVal) {
          console.log('e changed')
        },
        immediate: true,
      },
      // 可以传递回调数组，它们将逐个被调用
      f: [
        'handle1',
        function handle2(val, oldVal) {
          console.log('handle2 triggered')
        },
        {
          handler: function handle3(val, oldVal) {
            console.log('handle3 triggered')
          },
          /* ... */
        },
      ],
    },
    methods: {
      someMethod() {
        console.log('b changed')
      },
      handle1() {
        console.log('handle 1 triggered')
      },
    },
    created() {
      this.a = 3 // => new: 3, old: 1
    },
  }
  ```

- **另请参阅** [侦听器](/guide/essentials/watchers)

## emits {#emits}

声明组件发出的自定义事件。

- **类型**

  ```ts
  interface ComponentOptions {
    emits?: ArrayEmitsOptions | ObjectEmitsOptions
  }

  type ArrayEmitsOptions = string[]

  type ObjectEmitsOptions = { [key: string]: EmitValidator | null }

  type EmitValidator = (...args: unknown[]) => boolean
  ```

- **详情**

  发出的事件可以用两种形式声明：
  - 使用字符串数组的简单形式
  - 使用对象的完整形式，其中每个属性键是事件的名称，值为 `null` 或验证函数。

  验证函数将接收传递给组件的 `$emit` 调用的附加参数。例如，如果调用 `this.$emit('foo', 1)`，则 `foo` 的相应验证器将接收参数 `1`。验证函数应返回布尔值以指示事件参数是否有效。

  请注意，`emits` 选项会影响哪些事件监听器被视为组件事件监听器，而不是原生 DOM 事件监听器。声明事件的监听器将从组件的 `$attrs` 对象中移除，因此它们不会透传到组件的根元素。有关更多详细信息，请参见 [透传属性](/guide/components/attrs)。

- **示例**

  数组语法：

  ```js
  export default {
    emits: ['check'],
    created() {
      this.$emit('check')
    },
  }
  ```

  对象语法：

  ```js
  export default {
    emits: {
      // 无验证
      click: null,

      // 带验证
      submit: payload => {
        if (payload.email && payload.password) {
          return true
        } else {
          console.warn(`Invalid submit event payload!`)
          return false
        }
      },
    },
  }
  ```

- **另请参阅**
  - [指南 - 透传属性](/guide/components/attrs)
  - [指南 - 为组件 Emits 添加类型](/guide/typescript/options-api#typing-component-emits) <sup class="vt-badge ts" />

## expose {#expose}

声明当父组件通过模板 refs 访问组件实例时要暴露的公共属性。

- **类型**

  ```ts
  interface ComponentOptions {
    expose?: string[]
  }
  ```

- **详情**

  默认情况下，当通过 `$parent`、`$root` 或模板 refs 访问时，组件实例会向父级暴露所有实例属性。这可能是不希望的，因为组件很可能具有应保持私有以避免紧耦合的内部状态或方法。

  `expose` 选项期望一个属性名称字符串列表。使用 `expose` 时，只有显式列出的属性才会在组件的公共实例上暴露。

  `expose` 仅影响用户定义的属性 - 它不会过滤掉内置的组件实例属性。

- **示例**

  ```js
  export default {
    // 只有 `publicMethod` 将在公共实例上可用
    expose: ['publicMethod'],
    methods: {
      publicMethod() {
        // ...
      },
      privateMethod() {
        // ...
      },
    },
  }
  ```
