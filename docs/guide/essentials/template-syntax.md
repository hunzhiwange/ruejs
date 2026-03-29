# JSX 语法 {#jsx-syntax}

Rue 使用 JSX 作为其模板语法。如果你熟悉 React，你已经掌握了大部分知识。本页介绍 Rue 的 JSX 语法及其与 React JSX 的异同。

## 文本插值 {#text-interpolation}

在 JSX 中，使用花括号 `{}` 进行文本插值：

```tsx
<span>Message: {msg}</span>
```

花括号内的表达式将被求值并渲染。它也会在 `msg` 属性变化时自动更新。

## 原始 HTML 输出 {#raw-html}

JSX 默认将内容作为纯文本渲染。要输出原始 HTML，使用 `dangerouslySetInnerHTML`：

```tsx
const rawHtml = '<span style="color: red">This should be red.</span>'

// 文本插值（显示为纯文本）
<p>使用文本插值：{rawHtml}</p>

// 原始 HTML 输出
<p>使用原始 HTML：<span dangerouslySetInnerHTML={{ __html: rawHtml }} /></p>
```

:::warning 安全警告
在你的网站上动态渲染任意 HTML 可能非常危险，因为它很容易导致 [XSS 漏洞](https://en.wikipedia.org/wiki/Cross-site_scripting)。只在可信内容上使用 `dangerouslySetInnerHTML`，**绝不要**在用户提供的内容上使用。
:::

## Attribute 绑定 {#attribute-bindings}

在 JSX 中，使用花括号直接绑定属性：

```tsx
<div id={dynamicId}></div>
```

如果绑定的值是 `null` 或 `undefined`，该属性将从渲染的元素中移除。

### 布尔属性 {#boolean-attributes}

[布尔属性](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#boolean-attributes)是可以通过在元素上存在来表示 true/false 值的属性。例如，[`disabled`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/disabled) 是最常用的布尔属性之一。

在 JSX 中：

```tsx
<button disabled={isButtonDisabled}>Button</button>
```

当 `isButtonDisabled` 为 [truthy 值](https://developer.mozilla.org/en-US/docs/Glossary/Truthy)时，`disabled` 属性将被包含。当为 [falsy 值](https://developer.mozilla.org/en-US/docs/Glossary/Falsy)时，属性将被省略。

### 动态绑定多个属性 {#dynamically-binding-multiple-attributes}

如果你有一个表示多个属性的 JavaScript 对象：

```tsx
const objectOfAttrs = {
  id: 'container',
  className: 'wrapper',
  style: { backgroundColor: 'green' },
}
```

可以使用展开运算符绑定到单个元素：

```tsx
<div {...objectOfAttrs}></div>
```

## 使用 JavaScript 表达式 {#using-javascript-expressions}

JSX 支持在绑定中使用完整的 JavaScript 表达式：

```tsx
<div>
  <p>{number + 1}</p>
  <p>{ok ? 'YES' : 'NO'}</p>
  <p>{message.split('').reverse().join('')}</p>
  <div id={`list-${id}`}></div>
</div>
```

这些表达式将在当前组件实例的数据范围内作为 JavaScript 求值。

### 表达式限制 {#expressions-only}

每个绑定只能包含**单个表达式**。表达式是一段可以求值为值的代码。一个简单的检查是它是否可以跟在 `return` 后面。

因此，以下**不会**工作：

```tsx
// 这是语句，不是表达式：
{
  var a = 1
}

// 流程控制也不行，使用三元表达式
{
  if (ok) {
    return message
  }
}
```

### 调用函数 {#calling-functions}

可以在绑定表达式中调用组件暴露的方法：

```tsx
<time title={toTitleDate(date)} dateTime={date}>
  {formatDate(date)}
</time>
```

:::tip
绑定表达式中调用的函数会在组件每次更新时被调用，因此它们**不应该**有副作用，如改变数据或触发异步操作。
:::

## 条件渲染 {#conditional-rendering}

Rue 支持多种条件渲染方式：

### 三元表达式 {#ternary-operator}

```tsx
<div>{ok ? <p>YES</p> : <p>NO</p>}</div>
```

### 逻辑与运算符 {#logical-and}

```tsx
<div>{seen && <p>Now you see me</p>}</div>
```

### 提前返回 {#early-return}

```tsx
const App: FC = () => {
  if (!user) {
    return <div>请先登录</div>
  }

  return <div>欢迎，{user.name}</div>
}
```

## 列表渲染 {#list-rendering}\n

使用 `map()` 渲染列表：

```tsx
<ul>
  {items.map(item => (
    <li key={item.id}>{item.name}</li>
  ))}
</ul>
```

:::tip key 属性
始终为列表项提供唯一的 `key` 属性，这有助于 Rue 高效地更新列表。
:::

### 过滤列表 {#filtering-lists}

```tsx
<ul>
  {items
    .filter(item => item.completed)
    .map(item => (
      <li key={item.id}>{item.name}</li>
    ))}
</ul>
```

## 事件处理 {#event-handling}

使用 `on` 前缀监听 DOM 事件：

```tsx
<button onClick={handleClick}>点击我</button>
```

### 内联事件处理器 {#inline-handlers}

```tsx
<button onClick={() => count.value++}>+1</button>
```

### 访问事件对象 {#accessing-event-object}

```tsx
<button onClick={e => handleClick(e)}>点击</button>
```

### 事件修饰符 {#event-modifiers}

虽然 JSX 不直接支持 Vue 的事件修饰符，但你可以手动实现相同的功能：

```tsx
// 相当于 @click.prevent
<button onClick={(e) => { e.preventDefault(); handleClick() }}>提交</button>

// 相当于 @click.stop
<button onClick={(e) => { e.stopPropagation(); handleClick() }}>点击</button>

// 相当于 @click.once
<button onClick={(e) => {
  e.currentTarget.disabled = true
  handleClick()
}}>点击一次</button>
```

## 表单输入绑定 {#form-input-bindings}

使用受控组件模式绑定表单输入：

### 文本输入 {#text-input}

```tsx
const message = ref('')

<input
  value={message.value}
  onInput={(e) => message.value = (e.target as HTMLInputElement).value}
/>
<p>消息：{message.value}</p>
```

### 复选框 {#checkbox}

```tsx
const checked = ref(false)

<input
  type="checkbox"
  checked={checked.value}
  onChange={(e) => checked.value = (e.target as HTMLInputElement).checked}
/>
<p>{checked.value ? '已选中' : '未选中'}</p>
```

### 单选按钮 {#radio}

```tsx
const picked = ref('')

<input
  type="radio"
  value="A"
  checked={picked.value === 'A'}
  onChange={(e) => picked.value = (e.target as HTMLInputElement).value}
/> A
<input
  type="radio"
  value="B"
  checked={picked.value === 'B'}
  onChange={(e) => picked.value = (e.target as HTMLInputElement).value}
/> B
```

### 选择框 {#select}

```tsx
const selected = ref('')

<select
  value={selected.value}
  onChange={(e) => selected.value = (e.target as HTMLSelectElement).value}
>
  <option value="">请选择</option>
  <option value="A">选项 A</option>
  <option value="B">选项 B</option>
</select>
```

### 多行文本 {#textarea}

```tsx
const message = ref('')

<textarea
  value={message.value}
  onInput={(e) => message.value = (e.target as HTMLTextAreaElement).value}
/>
```

## 样式绑定 {#style-bindings}

### 绑定 Class {#binding-class}

使用模板字符串或 classnames 库：

```tsx
<div className={`base-class ${isActive ? 'active' : ''}`}></div>

// 或者使用对象
<div className={['base-class', isActive && 'active', isError && 'error'].filter(Boolean).join(' ')}></div>
```

### 绑定内联样式 {#binding-inline-styles}

```tsx
<div style={{ color: 'red', fontSize: '16px' }}></div>

// 或者绑定样式对象
const style = { color: 'red', fontSize: '16px' }
<div style={style}></div>
```

## 片段 {#fragments}

使用 `Fragment` 或简写 `<>` 渲染多个元素而不添加额外 DOM 节点：

```tsx
import { Fragment } from '@rue-js/rue'

const App: FC = () => {
  return (
    <>
      <h1>标题</h1>
      <p>段落 1</p>
      <p>段落 2</p>
    </>
  )
}
```

或者显式使用 Fragment：

```tsx
import { Fragment } from '@rue-js/rue'

const App: FC = () => {
  return (
    <Fragment>
      <h1>标题</h1>
      <p>段落</p>
    </Fragment>
  )
}
```
