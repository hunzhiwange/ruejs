# 渲染函数 API {#render-function-apis}

## h() {#h}

创建虚拟 DOM 节点（vnodes）。

- **类型**

  ```ts
  // 完整签名
  function h(
    type: string | Component,
    props?: object | null,
    children?: Children | Slot | Slots,
  ): VNode

  // 省略 props
  function h(type: string | Component, children?: Children | Slot): VNode

  type Children = string | number | boolean | VNode | null | Children[]

  type Slot = () => Children

  type Slots = { [name: string]: Slot }
  ```

  > 类型为可读性而简化。

- **详情**

  第一个参数可以是字符串（用于原生元素）或 Rue 组件定义。第二个参数是要传递的 props，第三个参数是子元素。

  创建组件 vnode 时，子元素必须作为插槽函数传递。如果组件只期望默认插槽，则可以传递单个插槽函数。否则，插槽必须作为插槽函数的对象传递。

  为方便起见，当子元素不是插槽对象时，可以省略 props 参数。

- **示例**

  创建原生元素：

  ```js
  import { h } from '@rue-js/rue'

  // 除 type 外的所有参数都是可选的
  h('div')
  h('div', { id: 'foo' })

  // 属性和属性都可以在 props 中使用
  // Rue 会自动选择正确的分配方式
  h('div', { class: 'bar', innerHTML: 'hello' })

  // class 和 style 与模板中一样支持对象/数组值
  h('div', { class: [foo, { bar }], style: { color: 'red' } })

  // 事件监听器应以 onXxx 形式传递
  h('div', { onClick: () => {} })

  // 子元素可以是字符串
  h('div', { id: 'foo' }, 'hello')

  // 没有 props 时可以省略 props
  h('div', 'hello')
  h('div', [h('span', 'hello')])

  // 子元素数组可以包含混合的 vnode 和字符串
  h('div', ['hello', h('span', 'hello')])
  ```

  创建组件：

  ```js
  import Foo from './Foo'

  // 传递 props
  h(Foo, {
    // 相当于 some-prop="hello"
    someProp: 'hello',
    // 相当于 @update="() => {}"
    onUpdate: () => {},
  })

  // 传递单个默认插槽
  h(Foo, () => 'default slot')

  // 传递具名插槽
  // 注意 `null` 是必需的，以避免
  // 将插槽对象视为 props
  h(MyComponent, null, {
    default: () => 'default slot',
    foo: () => h('div', 'foo'),
    bar: () => [h('span', 'one'), h('span', 'two')],
  })
  ```

- **另请参阅** [指南 - 渲染函数 - 创建 VNode](/guide/extras/render-function#creating-vnodes)

## mergeProps() {#mergeprops}

合并多个 props 对象，并对某些 props 进行特殊处理。

- **类型**

  ```ts
  function mergeProps(...args: object[]): object
  ```

- **详情**

  `mergeProps()` 支持合并多个 props 对象，并对以下 props 进行特殊处理：
  - `class`
  - `style`
  - `onXxx` 事件监听器 - 具有相同名称的多个监听器将合并为数组。

  如果您不需要合并行为而想要简单的覆盖，可以使用原生对象展开。

- **示例**

  ```js
  import { mergeProps } from '@rue-js/rue'

  const one = {
    class: 'foo',
    onClick: handlerA,
  }

  const two = {
    class: { bar: true },
    onClick: handlerB,
  }

  const merged = mergeProps(one, two)
  /**
   {
     class: 'foo bar',
     onClick: [handlerA, handlerB]
   }
   */
  ```

## cloneVNode() {#clonevnode}

克隆一个 vnode。

- **类型**

  ```ts
  function cloneVNode(vnode: VNode, extraProps?: object): VNode
  ```

- **详情**

  返回克隆的 vnode，可选择使用额外的 props 与原始 props 合并。

  Vnode 一旦创建应被视为不可变的，您不应改变现有 vnode 的 props。相反，使用不同的/额外的 props 克隆它。

  Vnode 具有特殊的内部属性，因此克隆它们不像对象展开那么简单。`cloneVNode()` 处理大部分内部逻辑。

- **示例**

  ```js
  import { h, cloneVNode } from '@rue-js/rue'

  const original = h('div')
  const cloned = cloneVNode(original, { id: 'foo' })
  ```

## isVNode() {#isvnode}

检查值是否为 vnode。

- **类型**

  ```ts
  function isVNode(value: unknown): boolean
  ```

## resolveComponent() {#resolvecomponent}

用于手动按名称解析已注册的组件。

- **类型**

  ```ts
  function resolveComponent(name: string): Component | string
  ```

- **详情**

  **注意：如果您可以直接导入组件，则不需要此功能。**

  `resolveComponent()` 必须在<span class="composition-api"> `setup()` 或</span>渲染函数内部调用，以便从正确的组件上下文解析。

  如果未找到组件，将发出运行时警告，并返回名称字符串。

- **示例**

  <div class="composition-api">

  ```js
  import { h, resolveComponent } from '@rue-js/rue'

  export default {
    setup() {
      const ButtonCounter = resolveComponent('ButtonCounter')

      return () => {
        return h(ButtonCounter)
      }
    },
  }
  ```

  </div>
  <div class="options-api">

  ```js
  import { h, resolveComponent } from '@rue-js/rue'

  export default {
    render() {
      const ButtonCounter = resolveComponent('ButtonCounter')
      return h(ButtonCounter)
    },
  }
  ```

  </div>

- **另请参阅** [指南 - 渲染函数 - 组件](/guide/extras/render-function#components)

## resolveDirective() {#resolvedirective}

用于手动按名称解析已注册的指令。

- **类型**

  ```ts
  function resolveDirective(name: string): Directive | undefined
  ```

- **详情**

  **注意：如果您可以直接导入指令，则不需要此功能。**

  `resolveDirective()` 必须在<span class="composition-api"> `setup()` 或</span>渲染函数内部调用，以便从正确的组件上下文解析。

  如果未找到指令，将发出运行时警告，函数返回 `undefined`。

- **另请参阅** [指南 - 渲染函数 - 自定义指令](/guide/extras/render-function#custom-directives)

## withDirectives() {#withdirectives}

用于向 vnodes 添加自定义指令。

- **类型**

  ```ts
  function withDirectives(vnode: VNode, directives: DirectiveArguments): VNode

  // [Directive, value, argument, modifiers]
  type DirectiveArguments = Array<
    | [Directive]
    | [Directive, any]
    | [Directive, any, string]
    | [Directive, any, string, DirectiveModifiers]
  >
  ```

- **详情**

  用自定义指令包装现有的 vnode。第二个参数是自定义指令数组。每个自定义指令也表示为一个数组，形式为 `[Directive, value, argument, modifiers]`。如果不需要，可以省略数组的尾部元素。

- **示例**

  ```js
  import { h, withDirectives } from '@rue-js/rue'

  // 自定义指令
  const pin = {
    mounted() {
      /* ... */
    },
    updated() {
      /* ... */
    },
  }

  // <div v-pin:top.animate="200"></div>
  const vnode = withDirectives(h('div'), [[pin, 200, 'top', { animate: true }]])
  ```

- **另请参阅** [指南 - 渲染函数 - 自定义指令](/guide/extras/render-function#custom-directives)

## withModifiers() {#withmodifiers}

用于向事件处理函数添加内置的 [`v-on` 修饰符](/guide/essentials/event-handling#event-modifiers)。

- **类型**

  ```ts
  function withModifiers(fn: Function, modifiers: ModifierGuardsKeys[]): Function
  ```

- **示例**

  ```js
  import { h, withModifiers } from '@rue-js/rue'

  const vnode = h('button', {
    // 相当于 v-on:click.stop.prevent
    onClick: withModifiers(() => {
      // ...
    }, ['stop', 'prevent']),
  })
  ```

- **另请参阅** [指南 - 渲染函数 - 事件修饰符](/guide/extras/render-function#event-modifiers)
