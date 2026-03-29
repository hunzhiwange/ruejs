# 类与样式绑定 {#class-and-style-bindings}

数据绑定的常见需求是操作元素的类列表和内联样式。由于 `class` 和 `style` 都是属性，我们可以使用 JSX 来动态地给它们赋值字符串，就像其他属性一样。但是，尝试使用字符串连接来生成这些值可能会很麻烦且容易出错。为此，Rue 在使用 `className` 和 `style` 时提供了特殊的增强功能。除了字符串外，表达式还可以求值为对象或数组。

## 绑定 HTML 类 {#binding-html-classes}

### 绑定到对象 {#binding-to-objects}

我们可以传递一个对象给 `className` 来动态切换类：

```tsx
<div className={{ active: isActive.value }} />
```

上述语法意味着 `active` 类的存在将由 `isActive` ref 的真值决定。

你可以在对象中有更多字段来切换多个类。此外，`className` 还可以与普通类属性共存。因此，给定以下状态：

```js
const isActive = ref(true)
const hasError = ref(false)
```

和以下 JSX：

```tsx
<div className="static" className={{ active: isActive.value, 'text-danger': hasError.value }} />
```

这将渲染：

```html
<div class="static active"></div>
```

当 `isActive` 或 `hasError` 更改时，类列表将相应更新。例如，如果 `hasError` 变为 `true`，类列表将变成 `"static active text-danger"`。

绑定的对象不必是内联的：

```js
const classObject = reactive({
  active: true,
  'text-danger': false,
})
```

```tsx
<div className={classObject} />
```

这将渲染：

```html
<div class="active"></div>
```

我们也可以绑定到返回对象的 [计算属性](./computed)。这是一种常见且强大的模式：

```js
const isActive = ref(true)
const error = ref(null)

const classObject = computed(() => ({
  active: isActive.value && !error.value,
  'text-danger': error.value && error.value.type === 'fatal',
}))
```

```tsx
<div className={classObject.value} />
```

### 绑定到数组 {#binding-to-arrays}

我们可以将 `className` 绑定到数组来应用一系列类：

```js
const activeClass = ref('active')
const errorClass = ref('text-danger')
```

```tsx
<div className={[activeClass.value, errorClass.value]} />
```

这将渲染：

```html
<div class="active text-danger"></div>
```

如果你想在列表中条件性地切换一个类，可以使用三元表达式：

```tsx
<div className={[isActive.value ? activeClass.value : '', errorClass.value]} />
```

这将始终应用 `errorClass`，但 `activeClass` 只会在 `isActive` 为真值时应用。

但是，如果你有多个条件类，这可能会有些冗长。因此也可以在数组语法中使用对象语法：

```tsx
<div className={[{ [activeClass.value]: isActive.value }, errorClass.value]} />
```

### 与组件一起使用 {#with-components}

> 本部分假设你了解 [组件](/guide/essentials/component-basics)。如果你还不熟悉，可以跳过并在之后回来查看。

当你在单根元素的组件上使用 `className` 属性时，这些类将被添加到组件的根元素上，并与该元素上已有的任何现有类合并。

例如，如果我们有一个名为 `MyComponent` 的组件，其 JSX 如下：

```tsx
// 子组件
const MyComponent: FC = () => {
  return <p className="foo bar">Hi!</p>
}
```

然后在使用它时添加一些类：

```tsx
// 使用组件
const App: FC = () => {
  return <MyComponent className="baz boo" />
}
```

渲染后的 HTML 将是：

```html
<p class="foo bar baz boo">Hi!</p>
```

类绑定也是如此：

```tsx
<MyComponent className={{ active: isActive.value }} />
```

当 `isActive` 为真值时，渲染后的 HTML 将是：

```html
<p class="foo bar active">Hi!</p>
```

如果你的组件有多个根元素，你需要定义哪个元素将接收此类。你可以通过组件的属性来实现：

```tsx
const MyComponent: FC = props => {
  return (
    <>
      <p className={props.className}>Hi!</p>
      <span>这是子组件</span>
    </>
  )
}
```

```tsx
<MyComponent className="baz" />
```

将渲染：

```html
<p class="baz">Hi!</p>
<span>这是子组件</span>
```

你可以在 [透传属性](/guide/components/attrs) 部分了解更多关于组件属性继承的信息。

## 绑定内联样式 {#binding-inline-styles}

### 绑定到对象 {#binding-to-objects-1}

`style` 支持绑定到 JavaScript 对象值——它对应于 [HTML 元素的 `style` 属性](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style)：

```js
const activeColor = ref('red')
const fontSize = ref(30)
```

```tsx
<div style={{ color: activeColor.value, fontSize: fontSize.value + 'px' }} />
```

虽然推荐使用 camelCase 键，但 `style` 也支持 kebab-case 的 CSS 属性键（对应于实际 CSS 中的使用方式）——例如：

```tsx
<div style={{ 'font-size': fontSize.value + 'px' }} />
```

直接绑定到样式对象通常是个好主意，这样模板更简洁：

```js
const styleObject = reactive({
  color: 'red',
  fontSize: '30px',
})
```

```tsx
<div style={styleObject} />
```

同样，对象样式绑定通常与返回对象的计算属性一起使用。

`style` 也可以与常规样式属性共存，就像 `className` 一样。

模板：

```tsx
<h1 style={{ color: 'red', fontSize: '1em' }}>hello</h1>
```

它将渲染：

```html
<h1 style="color: red; font-size: 1em;">hello</h1>
```

### 绑定到数组 {#binding-to-arrays-1}

我们可以将 `style` 绑定到多个样式对象的数组。这些对象将被合并并应用到同一元素：

```tsx
<div style={[baseStyles, overridingStyles]} />
```

### 自动前缀 {#auto-prefixing}

当你在 `style` 中使用需要 [浏览器前缀](https://developer.mozilla.org/en-US/docs/Glossary/Vendor_Prefix) 的 CSS 属性时，Rue 会自动添加适当的前缀。Rue 通过在运行时检查当前浏览器支持哪些样式属性来实现这一点。如果浏览器不支持某个特定属性，那么将测试各种带前缀的变体以尝试找到支持的变体。

### 多值 {#multiple-values}

你可以为样式属性提供多个（带前缀的）值的数组，例如：

```tsx
<div style={{ display: ['-webkit-box', '-ms-flexbox', 'flex'] }} />
```

这将只渲染浏览器支持的数组中的最后一个值。在此示例中，对于支持 flexbox 无前缀版本的浏览器，它将渲染 `display: flex`。
