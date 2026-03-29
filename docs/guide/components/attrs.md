# 透传属性 {#fallthrough-attributes}

> 本页面假设你已经阅读过[组件基础](/guide/essentials/component-basics)。如果你是组件的新手，请先阅读那部分内容。

## 属性继承 {#attribute-inheritance}

"透传属性"是指传递给组件但未被接收组件显式声明在 [props](./props) 或 [事件](./events) 中的属性或事件监听器。常见的例子包括 `class`、`style` 和 `id` 属性。

在 Rue 中，透传属性需要通过 `rest` 参数显式处理。例如，给定一个 `<MyButton>` 组件：

```tsx
interface MyButtonProps {
  children?: React.ReactNode
}

function MyButton({ children, ...attrs }: MyButtonProps & JSX.HTMLAttributes<HTMLButtonElement>) {
  return <button {...attrs}>{children}</button>
}
```

父组件这样使用：

```tsx
<MyButton class="large">Click Me</MyButton>
```

最终渲染的 DOM 将是：

```html
<button class="large">Click Me</button>
```

在这里，`<MyButton>` 没有声明 `class` 作为接受的 prop。因此，`class` 被视为透传属性并通过展开运算符传递给 `<button>` 元素。

### class 和 style 合并 {#class-and-style-merging}

如果子组件的根元素已经有现有的 `class` 或 `style` 属性，它们会与从父组件继承的值合并。假设我们将之前示例中的 `<MyButton>` 模板改为：

```tsx
function MyButton({ children, ...attrs }: MyButtonProps & JSX.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button class="btn" {...attrs}>
      {children}
    </button>
  )
}
```

那么最终渲染的 DOM 将变成：

```html
<button class="btn large">Click Me</button>
```

注意：在 Rue/TSX 中，后续属性会覆盖前面的属性。要正确合并 class，你需要使用辅助函数：

```tsx
import { clsx } from 'rue-js'

function MyButton({
  children,
  class: className,
  ...attrs
}: MyButtonProps & JSX.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button class={clsx('btn', className)} {...attrs}>
      {children}
    </button>
  )
}
```

### 事件监听器继承 {#v-on-listener-inheritance}

同样的规则适用于事件监听器：

```tsx
<MyButton onClick={onClick}>Click Me</MyButton>
```

`onClick` 监听器会被传递到 `<MyButton>` 内部的 `<button>` 元素。当原生 `<button>` 被点击时，它会触发父组件的 `onClick` 方法。如果原生 `<button>` 已经通过 `onClick` 绑定了一个点击监听器，那么两个监听器都会触发。

### 嵌套组件继承 {#nested-component-inheritance}

如果组件将另一个组件渲染为其根节点，例如，我们将 `<MyButton>` 重构为渲染一个 `<BaseButton>` 作为其根：

```tsx
// MyButton 的模板，简单地渲染另一个组件
interface MyButtonProps {
  children?: React.ReactNode
}

function MyButton({ children, ...attrs }: MyButtonProps) {
  return <BaseButton {...attrs}>{children}</BaseButton>
}
```

那么 `<MyButton>` 接收到的透传属性将自动转发给 `<BaseButton>`。

注意：

1. 转发的属性不包括被 `<MyButton>` 声明为 props 的任何属性，或者已声明事件的监听器——换句话说，已声明的 props 和监听器已经被 `<MyButton>` "消费"了。

2. 转发的属性可以被 `<BaseButton>` 作为 props 接受，如果它声明了这些属性。

## 禁用属性继承 {#disabling-attribute-inheritance}

如果你**不**希望组件自动继承属性，你可以显式控制哪些属性应该被应用。

```tsx
interface MyButtonProps {
  children?: React.ReactNode
  className?: string
}

function MyButton({ children, className }: MyButtonProps) {
  // 显式只使用 className，其他属性被忽略
  return <button class={className}>{children}</button>
}
```

禁用属性继承的常见场景是当属性需要应用到除根节点以外的其他元素时。

这些透传属性可以直接在模板中通过展开运算符访问：

```tsx
interface MyButtonProps {
  children?: React.ReactNode
}

function MyButton({ children, ...attrs }: MyButtonProps & JSX.HTMLAttributes<HTMLButtonElement>) {
  return (
    <div class="btn-wrapper">
      <button class="btn" {...attrs}>
        {children}
      </button>
    </div>
  )
}
```

使用我们的 `<MyButton>` 组件示例——有时我们可能需要用一个额外的 `<div>` 包裹实际的 `<button>` 元素用于样式目的：

我们希望所有透传属性如 `class` 和事件监听器都应用于内部的 `<button>`，而不是外部的 `<div>`。我们可以通过展开运算符实现这一点：

```tsx {2}
function MyButton({ children, ...attrs }: MyButtonProps & JSX.HTMLAttributes<HTMLButtonElement>) {
  return (
    <div class="btn-wrapper">
      <button class="btn" {...attrs}>
        {children}
      </button>
    </div>
  )
}
```

记住，展开运算符会将对象的所有属性绑定为目标元素的属性。

## 在多个根节点上的属性继承 {#attribute-inheritance-on-multiple-root-nodes}

与具有单个根节点的组件不同，具有多个根节点的组件没有自动属性透传行为。你需要显式决定将属性绑定到哪个元素。

```tsx
interface CustomLayoutProps {
  children?: React.ReactNode
}

function CustomLayout({ children, ...attrs }: CustomLayoutProps & JSX.HTMLAttributes<HTMLElement>) {
  return (
    <>
      <header>...</header>
      <main {...attrs}>{children}</main>
      <footer>...</footer>
    </>
  )
}
```

使用组件：

```tsx
<CustomLayout id="custom-layout" onClick={changeValue}>
  Content here
</CustomLayout>
```

## 在 JavaScript 中访问透传属性 {#accessing-fallthrough-attributes-in-javascript}

如果需要，你可以使用 rest 参数访问组件的透传属性：

```tsx
interface MyButtonProps {
  children?: React.ReactNode
}

function MyButton({ children, ...attrs }: MyButtonProps & JSX.HTMLAttributes<HTMLButtonElement>) {
  // 透传属性在 attrs 对象中
  console.log(attrs)

  return <button {...attrs}>{children}</button>
}
```

注意：

- 与 props 不同，透传属性在 JavaScript 中保留其原始的 casing，因此像 `foo-bar` 这样的属性需要通过 `attrs['foo-bar']` 访问。

- 像 `onClick` 这样的事件监听器会在对象上作为函数暴露为 `attrs.onClick`。

使用示例：

```tsx
interface MyButtonProps {
  children?: React.ReactNode
}

function MyButton({ children, ...attrs }: MyButtonProps & JSX.HTMLAttributes<HTMLButtonElement>) {
  // 访问特定的透传属性
  const { class: className, onClick, id } = attrs

  console.log('Class:', className)
  console.log('ID:', id)

  return (
    <button class={className} onClick={onClick} id={id}>
      {children}
    </button>
  )
}
```
