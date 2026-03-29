# 内置指令 {#built-in-directives}

Rue 使用 JSX/TSX 作为主要模板语法，因此大多数 Vue 的模板指令在 Rue 中通过 JSX 表达式或 JavaScript 逻辑实现。以下是 Rue 中对应的实现方式：

## 文本渲染 {#text-rendering}

在 JSX 中直接渲染文本：

```tsx
// 直接渲染
<span>{msg}</span>
```

## 原始 HTML {#raw-html}

使用 `dangerouslySetInnerHTML` 属性：

```tsx
<div dangerouslySetInnerHTML={{ __html: htmlContent }} />
```

::: warning 安全提示
在您的网站上动态渲染任意 HTML 可能非常危险，因为它很容易导致 [XSS 攻击](https://en.wikipedia.org/wiki/Cross-site_scripting)。仅在受信任的内容上使用原始 HTML，**绝不**在用户提供的内容上使用。
:::

## 条件渲染 {#conditional-rendering}

使用 JavaScript 条件表达式：

```tsx
// v-if / v-else-if / v-else
<div>
  {type === 'A' ? (
    <span>A</span>
  ) : type === 'B' ? (
    <span>B</span>
  ) : type === 'C' ? (
    <span>C</span>
  ) : (
    <span>Not A/B/C</span>
  )}
</div>

// v-show (使用 CSS display)
<div style={{ display: shouldShow ? 'block' : 'none' }}>
  条件显示的内容
</div>
```

## 列表渲染 {#list-rendering}

使用 JavaScript 的 `map` 方法：

```tsx
// v-for 替代
<ul>
  {items.map(item => (
    <li key={item.id}>{item.text}</li>
  ))}
</ul>

// 带索引
<ul>
  {items.map((item, index) => (
    <li key={item.id}>{index}: {item.text}</li>
  ))}
</ul>
```

## 事件处理 {#event-handling}

使用标准 JSX 事件属性：

```tsx
// 基础事件处理
<button onClick={handleClick}>点击我</button>

// 带参数
<button onClick={() => handleClick('hello')}>点击我</button>

// 事件对象
<button onClick={(e) => handleClick(e)}>点击我</button>

// 阻止默认行为
<button onClick={(e) => {
  e.preventDefault()
  handleClick()
}}>提交</button>

// 停止冒泡
<button onClick={(e) => {
  e.stopPropagation()
  handleClick()
}}>点击</button>

// 键盘事件
<input onKeyUp={(e) => {
  if (e.key === 'Enter') {
    handleEnter()
  }
}} />
```

## 属性绑定 {#attribute-binding}

使用 JSX 展开语法或单独属性：

```tsx
// 基础绑定
<img src={imageSrc} />

// 动态属性名
<button {...{ [dynamicKey]: value }}>点击</button>

// 类绑定
<div className={isActive ? 'active' : ''} />
<div className={`base-class ${isActive ? 'active' : ''}`} />
<div className={['base', isActive && 'active'].filter(Boolean).join(' ')} />

// 样式绑定
<div style={{ color: 'red', fontSize: size + 'px' }} />
<div style={styleObject} />

// 绑定对象
<div {...{ id: someProp, 'data-custom': otherProp }} />

// 传递所有 props
<ChildComponent {...props} />
```

## 双向绑定 {#two-way-binding}

使用受控组件模式：

```tsx
import { useState } from '@rue-js/rue'

// 输入框
const [value, setValue] = useState('')
<input
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// 复选框
const [checked, setChecked] = useState(false)
<input
  type="checkbox"
  checked={checked}
  onChange={(e) => setChecked(e.target.checked)}
/>

// 选择框
const [selected, setSelected] = useState('')
<select value={selected} onChange={(e) => setSelected(e.target.value)}>
  <option value="a">A</option>
  <option value="b">B</option>
</select>

// 文本域
<textarea
  value={content}
  onChange={(e) => setContent(e.target.value)}
/>
```

## 自定义指令 {#custom-directives}

使用 `use` 钩子或 ref 回调：

```tsx
import { useEffect, useRef } from '@rue-js/rue'

// 使用 ref 和 useEffect 实现自定义指令逻辑
const MyComponent = () => {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      // 自定义指令逻辑
      inputRef.current.focus()
    }
  }, [])

  return <input ref={inputRef} />
}
```

## 渲染一次 {#render-once}

使用 `useMemo` 或常量：

```tsx
import { useMemo } from '@rue-js/rue'

// 使用 useMemo 缓存内容
const staticContent = useMemo(
  () => (
    <div>
      <h1>Comment</h1>
      <p>{msg}</p>
    </div>
  ),
  [],
)

// 或者直接在组件外部定义
const staticMessage = <span>This will never change: {initialMsg}</span>
```

## 备忘优化 {#memo-optimization}

使用 `memo` 或 `useMemo`：

```tsx
import { memo, useMemo } from '@rue-js/rue'

// 组件级别的 memo
const MemoizedComponent = memo(({ valueA, valueB }) => {
  return (
    <div>
      {valueA} - {valueB}
    </div>
  )
})

// 内容级别的 memo
const memoizedContent = useMemo(
  () => (
    <div>
      <p>
        ID: {item.id} - selected: {item.id === selected}
      </p>
      <p>...more child nodes</p>
    </div>
  ),
  [item.id, selected],
)
```

## 原始 Vue 指令参考 {#original-vue-directives}

以下 Vue 模板指令在 Rue 的 JSX/TSX 中有等效实现：

| Vue 指令          | Rue JSX 实现                |
| ----------------- | --------------------------- |
| `v-text`          | `{text}` 表达式             |
| `v-html`          | `dangerouslySetInnerHTML`   |
| `v-show`          | CSS `display` 属性          |
| `v-if` / `v-else` | 三元运算符或 `&&` 运算符    |
| `v-for`           | `Array.map()`               |
| `v-on`            | `onEvent` 属性              |
| `v-bind`          | `{}` 表达式或展开运算符     |
| `v-model`         | 受控组件模式                |
| `v-slot`          | 组件的子元素或 render props |
| `v-pre`           | 无需等效（JSX 按原样编译）  |
| `v-once`          | `useMemo` 或组件外部的常量  |
| `v-memo`          | `memo` 或 `useMemo`         |
| `v-cloak`         | 无需等效（JSX 已编译）      |
