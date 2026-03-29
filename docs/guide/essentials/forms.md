# 表单输入绑定 {#form-input-bindings}

在前端处理表单时，我们经常需要将表单输入元素的状态与 JavaScript 中的相应状态同步。手动连接值绑定和变更事件监听器可能会很麻烦：

```tsx
<input value={text.value} onInput={e => (text.value = (e.target as HTMLInputElement).value)} />
```

在 Rue 中，我们可以使用 `value` 绑定和事件处理器来简化上述过程，或者创建可复用的输入组件。

Rue 的响应式系统可以与不同输入类型的输入框、`<textarea>` 和 `<select>` 元素一起使用。它根据使用元素自动展开到不同的 DOM 属性和事件对：

- `<input>` 文本类型和 `<textarea>` 元素使用 `value` 属性和 `input` 事件；
- `<input type="checkbox">` 和 `<input type="radio">` 使用 `checked` 属性和 `change` 事件；
- `<select>` 使用 `value` 作为属性和 `change` 作为事件。

::: tip 注意
表单元素上的初始 `value`、`checked` 或 `selected` 属性会被忽略。Rue 将始终将当前绑定的 JavaScript 状态视为唯一数据源。你应该在 JavaScript 侧声明初始值，使用 [响应式 API](/api/reactivity-core.html#reactivity-api-core)。
:::

## 基本用法 {#basic-usage}

### 文本 {#text}

```tsx
import { ref } from 'rue-js'
import type { FC } from 'rue-js'

const TextInput: FC = () => {
  const message = ref('')

  return (
    <div>
      <p>消息是：{message.value}</p>
      <input
        value={message.value}
        onInput={e => (message.value = (e.target as HTMLInputElement).value)}
        placeholder="编辑我"
      />
    </div>
  )
}
```

::: tip 注意
对于需要使用 [输入法](https://en.wikipedia.org/wiki/Input_method)（中文、日文、韩文等）的语言，你会注意到 `input` 事件在输入法组合期间不会更新。如果你想响应这些更新，请使用你自己的 `input` 事件监听器和 `value` 绑定。
:::

### 多行文本 {#multiline-text}

```tsx
import { ref } from 'rue-js'
import type { FC } from 'rue-js'

const TextArea: FC = () => {
  const message = ref('')

  return (
    <div>
      <span>多行消息是：</span>
      <p style={{ whiteSpace: 'pre-line' }}>{message.value}</p>
      <textarea
        value={message.value}
        onInput={e => (message.value = (e.target as HTMLTextAreaElement).value)}
        placeholder="添加多行"
      />
    </div>
  )
}
```

注意在 `<textarea>` 中使用插值是行不通的。使用 `value` 绑定代替。

```tsx
{
  /* 不好 */
}
;<textarea>{text.value}</textarea>

{
  /* 好 */
}
;<textarea value={text.value} onInput={handleInput} />
```

### 复选框 {#checkbox}

单个复选框，布尔值：

```tsx
import { ref } from 'rue-js'
import type { FC } from 'rue-js'

const Checkbox: FC = () => {
  const checked = ref(false)

  return (
    <div>
      <input
        type="checkbox"
        id="checkbox"
        checked={checked.value}
        onChange={e => (checked.value = (e.target as HTMLInputElement).checked)}
      />
      <label for="checkbox">{checked.value ? '已选中' : '未选中'}</label>
    </div>
  )
}
```

我们也可以将多个复选框绑定到同一个数组或 [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) 值：

```tsx
import { ref } from 'rue-js'
import type { FC } from 'rue-js'

const MultiCheckbox: FC = () => {
  const checkedNames = ref<string[]>([])

  const handleChange = (value: string, checked: boolean) => {
    if (checked) {
      checkedNames.value.push(value)
    } else {
      const index = checkedNames.value.indexOf(value)
      if (index > -1) {
        checkedNames.value.splice(index, 1)
      }
    }
  }

  return (
    <div>
      <div>已选中的名字：{checkedNames.value.join(', ')}</div>

      <input
        type="checkbox"
        id="jack"
        value="Jack"
        checked={checkedNames.value.includes('Jack')}
        onChange={e => handleChange('Jack', (e.target as HTMLInputElement).checked)}
      />
      <label for="jack">Jack</label>

      <input
        type="checkbox"
        id="john"
        value="John"
        checked={checkedNames.value.includes('John')}
        onChange={e => handleChange('John', (e.target as HTMLInputElement).checked)}
      />
      <label for="john">John</label>

      <input
        type="checkbox"
        id="mike"
        value="Mike"
        checked={checkedNames.value.includes('Mike')}
        onChange={e => handleChange('Mike', (e.target as HTMLInputElement).checked)}
      />
      <label for="mike">Mike</label>
    </div>
  )
}
```

在这种情况下，`checkedNames` 数组将始终包含当前选中复选框的值。

### 单选框 {#radio}

```tsx
import { ref } from 'rue-js'
import type { FC } from 'rue-js'

const Radio: FC = () => {
  const picked = ref('')

  return (
    <div>
      <div>已选择：{picked.value}</div>

      <input
        type="radio"
        id="one"
        value="One"
        checked={picked.value === 'One'}
        onChange={e => (picked.value = (e.target as HTMLInputElement).value)}
      />
      <label for="one">One</label>

      <input
        type="radio"
        id="two"
        value="Two"
        checked={picked.value === 'Two'}
        onChange={e => (picked.value = (e.target as HTMLInputElement).value)}
      />
      <label for="two">Two</label>
    </div>
  )
}
```

### 选择器 {#select}

单选：

```tsx
import { ref } from 'rue-js'
import type { FC } from 'rue-js'

const Select: FC = () => {
  const selected = ref('')

  return (
    <div>
      <div>已选择：{selected.value}</div>

      <select
        value={selected.value}
        onChange={e => (selected.value = (e.target as HTMLSelectElement).value)}
      >
        <option disabled value="">
          请选择一个
        </option>
        <option value="A">A</option>
        <option value="B">B</option>
        <option value="C">C</option>
      </select>
    </div>
  )
}
```

:::tip 注意
如果你的 `value` 绑定的初始值不匹配任何选项，`<select>` 元素将以"未选择"状态渲染。在 iOS 上，这会导致用户无法选择第一个项目，因为在这种情况下 iOS 不会触发 change 事件。因此建议提供一个带有空值的禁用选项，如上例所示。
:::

多选（绑定到数组）：

```tsx
import { ref } from 'rue-js'
import type { FC } from 'rue-js'

const MultiSelect: FC = () => {
  const selected = ref<string[]>([])

  const handleChange = (options: HTMLOptionsCollection) => {
    const values: string[] = []
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        values.push(options[i].value)
      }
    }
    selected.value = values
  }

  return (
    <div>
      <div>已选择：{selected.value.join(', ')}</div>

      <select
        multiple
        value={selected.value}
        onChange={e => handleChange((e.target as HTMLSelectElement).options)}
      >
        <option>A</option>
        <option>B</option>
        <option>C</option>
      </select>
    </div>
  )
}
```

可以使用 `map()` 动态渲染选择器选项：

```tsx
import { ref } from 'rue-js'
import type { FC } from 'rue-js'

const DynamicSelect: FC = () => {
  const selected = ref('A')

  const options = ref([
    { text: 'One', value: 'A' },
    { text: 'Two', value: 'B' },
    { text: 'Three', value: 'C' },
  ])

  return (
    <div>
      <div>已选择：{selected.value}</div>

      <select
        value={selected.value}
        onChange={e => (selected.value = (e.target as HTMLSelectElement).value)}
      >
        {options.value.map(option => (
          <option value={option.value}>{option.text}</option>
        ))}
      </select>
    </div>
  )
}
```

## 值绑定 {#value-bindings}

对于单选、复选和选择器选项，`value` 绑定的值通常是静态字符串（对于复选框是布尔值）：

```tsx
{
  /* `picked` 被选中时是字符串 "a" */
}
;<input type="radio" checked={picked.value === 'a'} onChange={() => (picked.value = 'a')} />

{
  /* `toggle` 是 true 或 false */
}
;<input
  type="checkbox"
  checked={toggle.value}
  onChange={e => (toggle.value = (e.target as HTMLInputElement).checked)}
/>

{
  /* `selected` 是第一个选项被选中时的字符串 "abc" */
}
;<select value={selected.value} onChange={handleChange}>
  <option value="abc">ABC</option>
</select>
```

但有时我们可能想将值绑定到当前活动实例的动态属性上。我们可以使用变量来实现这一点。此外，使用变量允许我们将输入值绑定到非字符串值。

### 复选框 {#checkbox-1}

```tsx
<input
  type="checkbox"
  checked={toggle.value === 'yes'}
  onChange={e => {
    toggle.value = (e.target as HTMLInputElement).checked ? 'yes' : 'no'
  }}
/>
```

你也可以绑定到动态值：

```tsx
<input
  type="checkbox"
  checked={toggle.value === dynamicTrueValue.value}
  onChange={e => {
    toggle.value = (e.target as HTMLInputElement).checked
      ? dynamicTrueValue.value
      : dynamicFalseValue.value
  }}
/>
```

:::tip 提示
使用这种方式时，复选框的值绑定不会影响输入的 `value` 属性，因为浏览器不会在表单提交中包含未选中的复选框。要保证在表单中提交两个值之一（例如"是"或"否"），请使用单选输入代替。
:::

### 单选框 {#radio-1}

```tsx
<input
  type="radio"
  checked={pick.value === first.value}
  onChange={() => pick.value = first.value}
/>
<input
  type="radio"
  checked={pick.value === second.value}
  onChange={() => pick.value = second.value}
/>
```

`pick` 将在第一个单选输入被选中时设置为 `first` 的值，在第二个被选中时设置为 `second` 的值。

### 选择器选项 {#select-options}

```tsx
<select value={selected.value} onChange={handleChange}>
  {/* 内联对象字面量 */}
  <option value={JSON.stringify({ number: 123 })}>123</option>
</select>
```

输入绑定也支持非字符串值！在上面的例子中，当选项被选中时，`selected` 将被设置为对象字面量 `{ number: 123 }` 的值。

## 修饰符 {#modifiers}

### `.lazy` {#lazy}

默认情况下，`input` 事件在每次 `input` 事件后将输入与数据同步（IME 组合除外）。你可以使用 `change` 事件代替 `input` 事件来在值改变后才同步：

```tsx
{
  /* 在 "change" 之后同步而不是 "input" */
}
;<input value={msg.value} onChange={e => (msg.value = (e.target as HTMLInputElement).value)} />
```

### `.number` {#number}

如果你想让用户输入自动类型转换为数字，你可以使用 `Number()` 或 `parseFloat()`：

```tsx
<input
  value={age.value}
  onInput={e => {
    const value = (e.target as HTMLInputElement).value
    age.value = value === '' ? '' : Number(value)
  }}
/>
```

如果值不能用 `parseFloat()` 解析，则使用原始（字符串）值。特别是，如果输入为空（例如用户清除输入字段后），返回空字符串。

### `.trim` {#trim}

如果你想自动修剪用户输入的空白字符，你可以在事件处理器中使用 `trim()`：

```tsx
<input value={msg.value} onInput={e => (msg.value = (e.target as HTMLInputElement).value.trim())} />
```

## 与组件一起使用 {#v-model-with-components}

> 如果你还不熟悉 Rue 的组件，可以暂时跳过这个部分。

HTML 的内置输入类型并不总能满足你的需求。幸运的是，Rue 组件允许你构建具有完全自定义行为的可复用输入。这些输入甚至可以与 `value` 绑定一起工作！要了解更多，请阅读组件指南中的 [使用 `value` 绑定](/guide/components/v-model)。
