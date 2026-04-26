# 渲染函数 API {#render-function-apis}

## h() {#h}

创建手写渲染输出。

- **类型**

  ```ts
  function h(
    type: string | Component,
    props?: object | null,
    ...children: RenderOutput[]
  ): RenderableOutput

  type RenderOutput = Renderable | RueMountHandle | ReadonlyArray<RenderOutput>
  type RenderProp<T = any> = (scope: T) => RenderOutput
  ```

  > 类型为可读性而简化。

- **详情**

  第一个参数可以是字符串（用于原生元素）或 Rue 组件定义。第二个参数是 props，其余参数是 children。

  在 Rue 当前主路径里，组件 children 最终会落到 `props.children`。如果你需要作用域插槽语义，可以把函数作为 children 传入；如果你需要具名插槽样式的 API，通常直接把它们建模成显式命名 props，例如 `header`、`footer`。

  为方便起见，当不需要 props 时，可以省略第二个参数。

- **示例**

  创建原生元素：

  ```js
  import { h } from '@rue-js/rue'

  h('div')
  h('div', { id: 'foo' })
  h('div', { class: 'bar', innerHTML: 'hello' })
  h('div', { class: [foo, { bar }], style: { color: 'red' } })
  h('div', { onClick: () => {} })
  h('div', { id: 'foo' }, 'hello')
  h('div', 'hello')
  h('div', [h('span', 'hello')])
  h('div', ['hello', h('span', 'hello')])
  ```

  创建组件：

  ```js
  import Foo from './Foo'

  h(Foo, {
    someProp: 'hello',
    onUpdate: () => {},
  })

  h(Foo, 'default content')
  h(Foo, scope => h('span', scope.label))

  h(MyComponent, {
    footer: ({ text }) => h('small', text),
  }, 'body')
  ```

- **另请参阅** [指南 - 渲染函数 - 创建渲染输出](/guide/extras/render-function#creating-vnodes)

## mergeProps() {#mergeprops} @todo

Rue 当前默认主入口未公开导出 `mergeProps()`，本页不再提供过时签名。

## cloneVNode() {#clonevnode} @todo

Rue 当前默认主入口未公开导出 `cloneVNode()`，本页不再提供过时签名。

## isVNode() {#isvnode} @todo

Rue 当前默认主入口未公开导出 `isVNode()`，本页不再提供过时签名。

## resolveComponent() {#resolvecomponent} @todo

Rue 当前默认主入口未公开导出 `resolveComponent()`。渲染函数中的组件请直接导入使用。

## resolveDirective() {#resolvedirective} @todo

Rue 当前默认主入口未公开导出 `resolveDirective()`。需要指令时，优先在模板或 JSX 路径中直接使用它们。

## withDirectives() {#withdirectives} @todo

Rue 当前默认主入口未公开导出 `withDirectives()`，本页不再提供过时签名。

## withModifiers() {#withmodifiers} @todo

Rue 当前默认主入口未公开导出 `withModifiers()`，本页不再提供过时签名。
