# 内置指令 {#built-in-directives}

Rue 使用 JSX/TSX 作为主要模板语法，同时在编译阶段支持一组面向 JSX 的内置指令。大多数指令都同时提供 `v-` 和 `r-` 前缀，两者语义相同；`r-` 更贴近 Rue 命名。

指令值可以使用 JSX 表达式，也可以在部分指令上使用字符串表达式：

```tsx
<div v-if={ready.value}>Ready</div>
<div r-if="ready.value">Ready</div>
```

::: tip
如果你更习惯原生 JSX，也可以继续使用三元表达式、`Array.map()`、`onClick`、`value/onInput` 等写法。下面每个指令都会优先展示 Rue 指令写法，并在需要时补充 JSX 等价写法。
:::

## `v-text` / `r-text` {#v-text}

更新元素的文本内容。`v-text` / `r-text` 会替换元素内部子节点。

```tsx
import { ref } from '@rue-js/rue'

const title = ref('Rue 文本指令')
const status = ref('等待同步')

export default function Demo() {
  return (
    <section>
      <h2 v-text="title.value"></h2>
      <p r-text={status.value}></p>
    </section>
  )
}
```

JSX 等价写法：

```tsx
<h2>{title.value}</h2>
<p>{status.value}</p>
```

## `v-html` / `r-html` {#v-html}

更新元素的 HTML 内容。`v-html` / `r-html` 会被编译为 `dangerouslySetInnerHTML`。

```tsx
import { ref } from '@rue-js/rue'

const articleHtml = ref('<strong>草稿</strong><span> 文档仍在编辑中。</span>')
const badgeHtml = ref('<strong>Pro</strong><span> 专业版在线</span>')

export default function Demo() {
  return (
    <section>
      <div v-html="articleHtml.value" className="alert alert-info"></div>
      <p r-html={badgeHtml.value} className="badge badge-success"></p>
    </section>
  )
}
```

JSX 等价写法：

```tsx
<div dangerouslySetInnerHTML={{ __html: articleHtml.value }} />
```

::: warning 安全提示
动态渲染任意 HTML 可能导致 [XSS 攻击](https://en.wikipedia.org/wiki/Cross-site_scripting)。只在受信任内容上使用 `v-html` / `r-html`，不要渲染未经处理的用户输入。
:::

## `v-show` / `r-show` {#v-show}

根据表达式切换元素的 `display`，但不会销毁节点，适合频繁显示/隐藏且需要保留 DOM 状态的内容。

```tsx
import { ref } from '@rue-js/rue'

const showChart = ref(true)
const showNotice = ref(false)

export default function Demo() {
  return (
    <section>
      <div v-show={showChart.value} className="panel">
        图表面板
      </div>

      <p r-show={showNotice.value} className="notice">
        通知内容
      </p>
    </section>
  )
}
```

JSX 等价写法：

```tsx
<div style={{ display: showChart.value ? undefined : 'none' }}>图表面板</div>
```

## `v-if` / `r-if` {#v-if}

根据表达式决定是否渲染当前元素。`v-if` / `r-if` 会创建条件分支，不满足条件时不会保留对应节点。

```tsx
import { ref } from '@rue-js/rue'

const phase = ref<'draft' | 'review' | 'published'>('draft')
const plan = ref<'pro' | 'basic' | 'offline'>('pro')

export default function Demo() {
  return (
    <section>
      <div v-if={phase.value === 'draft'} className="alert alert-info">
        草稿中
      </div>

      <p r-if={plan.value === 'pro'} className="badge badge-success">
        专业版在线
      </p>
    </section>
  )
}
```

完整交互示例见 [`v-if / r-if` 指令页面](/jsx/v-if-r-if)。

## `v-else-if` / `r-else-if` {#v-else-if}

用于紧跟在 `v-if` / `r-if` 后的条件分支。中间只能有空白文本，不能插入其他节点或表达式。

```tsx
<section>
  <div v-if={phase.value === 'draft'} className="alert alert-info">
    草稿中
  </div>
  <div v-else-if={phase.value === 'review'} className="alert alert-warning">
    审核中
  </div>
  <div v-else className="alert alert-success">
    已发布
  </div>

  <p r-if={plan.value === 'pro'} className="badge badge-success">
    专业版在线
  </p>
  <p r-else-if={plan.value === 'basic'} className="badge badge-info">
    标准版在线
  </p>
  <p r-else className="badge badge-error">
    当前离线
  </p>
</section>
```

JSX 等价写法：

```tsx
{
  phase.value === 'draft' ? (
    <div>草稿中</div>
  ) : phase.value === 'review' ? (
    <div>审核中</div>
  ) : (
    <div>已发布</div>
  )
}
```

## `v-else` / `r-else` {#v-else}

用于 `v-if` / `r-if` 条件链的兜底分支，不需要传入值。

```tsx
<div v-if={ready.value}>Ready</div>
<div v-else>Loading</div>

<div r-if={online.value}>Online</div>
<div r-else>Offline</div>
```

## `v-for` / `r-for` {#v-for}

遍历数组、对象或数字范围。表达式沿用 `item in source`、`(item, index) in source`、`(value, key) in object` 这类写法。

::: tip
`v-for` / `r-for` 的局部变量由 Rue 编译转换引入。如果你的 TypeScript 检查流程直接读取转换前源码，可能需要在示例文件中临时使用 `// @ts-nocheck`。
:::

```tsx
import { ref } from '@rue-js/rue'

const fruits = ref([
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Banana' },
  { id: 3, name: 'Cherry' },
])

const meta = {
  framework: 'Rue',
  renderer: 'Vapor',
}

const count = ref(3)

export default function Demo() {
  return (
    <section>
      <ul>
        <li v-for="(item, index) in fruits.value" key={item.id}>
          {index + 1}. {item.name}
        </li>
      </ul>

      <span r-for="(value, key) in meta" key={key}>
        {key}: {value}
      </span>

      <span v-for="step in count.value" key={step}>
        Step {step}
      </span>
    </section>
  )
}
```

JSX 等价写法：

```tsx
<ul>
  {fruits.value.map((item, index) => (
    <li key={item.id}>
      {index + 1}. {item.name}
    </li>
  ))}
</ul>
```

完整交互示例见 [`v-for / r-for` 指令页面](/jsx/v-for-r-for)。

## `v-on` / `r-on` {#v-on}

绑定事件监听器。可以使用命名空间写法 `v-on:click`，也可以使用安全属性名写法 `v-on:click-stop-prevent` / `r-on:input`。

```tsx
import { ref } from '@rue-js/rue'

const count = ref(0)
const keyword = ref('')

function increment() {
  count.value += 1
}

function updateKeyword(event: Event) {
  keyword.value = (event.target as HTMLInputElement).value
}

export default function Demo() {
  return (
    <section>
      <button v-on:click="increment">点击 {count.value}</button>

      <input value={keyword.value} r-on:input="updateKeyword($event)" />

      <a href="/submit" v-on:click-stop-prevent="increment">
        阻止跳转并计数
      </a>
    </section>
  )
}
```

常用修饰符可以直接写在指令名上：

```tsx
<button v-on:click-once="submit" />
<div v-on:click-self="selectPanel" />
<input v-on:keyup-enter="submit" />
<button r-on:click-meta-exact="openCommandMenu" />
```

JSX 等价写法：

```tsx
<button onClick={increment}>点击 {count.value}</button>
<input value={keyword.value} onInput={updateKeyword} />
```

完整交互示例见 [`v-on / r-on` 指令页面](/jsx/v-on-r-on)。

## `v-bind` {#v-bind}

在 Rue TSX 中，动态属性通常直接使用 JSX 表达式或展开语法，不需要额外的 `v-bind`。

```tsx
<a href={linkHref.value}>查看详情</a>
<button {...{ [dynamicKey.value]: dynamicValue.value }}>点击</button>
<div className={isActive.value ? 'active' : ''} />
<div style={{ color: 'red', fontSize: `${size.value}px` }} />
<ChildComponent {...props} />
```

## `v-model` / `r-model` {#v-model}

在原生表单元素或组件上创建双向绑定。原生输入会被编译为对应的 `value` / `checked` 与输入事件；组件会被编译为 `modelValue` / `onUpdateModelValue` 或带参数的 prop 组合。

```tsx
import { ref } from '@rue-js/rue'

const message = ref('Rue model')
const trimmed = ref(' keep edges tidy ')
const age = ref<string | number>('18')
const accepted = ref(false)
const title = ref('Guide draft')

export default function Demo() {
  return (
    <section>
      <input v-model={message.value} />
      <input v-model:trim={trimmed.value} />
      <input type="number" r-model:number={age.value} />
      <input type="checkbox" v-model={accepted.value} />

      <ModelField v-model={title.value} />
    </section>
  )
}
```

带参数和多个 model：

```tsx
<TitleField v-model:trim-title={articleTitle.value} />

<UserNameEditor
  v-model:trim-first-name={firstName.value}
  v-model:lazy-last-name={lastName.value}
/>
```

JSX 等价写法：

```tsx
<input
  value={message.value}
  onInput={event => {
    message.value = (event.target as HTMLInputElement).value
  }}
/>

<ModelField
  modelValue={title.value}
  onUpdateModelValue={value => {
    title.value = value
  }}
/>
```

完整交互示例见 [`v-model / r-model` 指令页面](/jsx/v-model-r-model)。

## `v-slot` {#v-slot}

Rue 组件通常通过 JSX 子元素、render props 或显式的 `slot` 属性表达插槽内容。对于 TSX，优先使用组件约定，而不是 `v-slot`。

```tsx
<Panel>
  <h2 slot="header">标题</h2>
  <p>默认内容</p>
  <button slot="footer">确认</button>
</Panel>
```

使用 render props 时：

```tsx
<DataProvider>{({ data }) => <pre>{JSON.stringify(data, null, 2)}</pre>}</DataProvider>
```

## `v-pre` / `r-pre` {#v-pre}

跳过当前元素及其子树中的 Rue 指令改写，并将 JSX 插值表达式按原始文本显示。例如 `{phase.value}` 显示为字面文本，不会读取变量或响应更新；HTML 元素仍正常渲染。表达式属性保留为文本，展开属性不会执行。

```tsx
import { ref } from '@rue-js/rue'

const phase = ref<'draft' | 'published'>('draft')
const plan = ref<'pro' | 'basic'>('pro')

export default function Demo() {
  return (
    <section>
      <div v-pre>
        <span v-if={phase.value === 'draft'}>{phase.value}</span>
      </div>

      <div r-pre>
        <span r-if={plan.value === 'pro'}>{plan.value}</span>
      </div>
    </section>
  )
}
```

完整交互示例见 [`v-pre / r-pre` 指令页面](/jsx/v-pre-r-pre)。

## `v-once` / `r-once` {#v-once}

只渲染一次当前元素内容，后续响应式更新不会重新计算这段子树。

```tsx
import { ref } from '@rue-js/rue'

const message = ref('首次渲染')
const count = ref(0)

export default function Demo() {
  return (
    <section>
      <span v-once>{message.value}</span>
      <strong r-once>count: {count.value}</strong>
    </section>
  )
}
```

JSX 等价写法通常是把静态内容提升到组件外部，或根据场景使用缓存：

```tsx
const staticMessage = <span>This will never change</span>
```

完整交互示例见 [`v-once / r-once` 指令页面](/jsx/v-once-r-once)。

## `v-memo` / `r-memo` {#v-memo}

根据依赖数组缓存一段子树。只有依赖变化时，这段子树才会重新计算。

```tsx
import { ref } from '@rue-js/rue'

const selectedId = ref(1)
const refreshCount = ref(0)
const rows = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
]

export default function Demo() {
  return (
    <section>
      {rows.map(row => (
        <div key={row.id} v-memo={[row.id === selectedId.value]}>
          <span>{row.name}</span>
          <span>selected: {row.id === selectedId.value ? 'yes' : 'no'}</span>
          <span>refresh: {refreshCount.value}</span>
        </div>
      ))}

      <p r-memo={[selectedId.value]}>selected id: {selectedId.value}</p>
    </section>
  )
}
```

在 keyed 列表中，将 `key` 与 memo 放在同一个行根元素上。缓存按 `key` 随行保留：换位只移动原 DOM，依赖数组中的值通过 `Object.is` 逐项比较，未变化时跳过行内更新。`key` 不需要重复放入 memo 依赖数组；更换 `key` 会创建新行。

两种指令均支持 `map` 列表及 `v-for` / `r-for` 列表。应将需要触发行内容更新的值（例如 `row.label`、`row.id === selectedId.value`）放入依赖数组；空数组会固定该行内容，直到对应的 key 被移除。

完整交互示例见 [`v-memo / r-memo` 指令页面](/jsx/v-memo-r-memo)。

## `v-cloak` {#v-cloak}

Rue 使用编译后的 JSX/TSX 运行，通常不需要 `v-cloak`。如果应用有自定义的首屏隐藏需求，可以用普通属性和 CSS 自行控制：

```tsx
<div data-cloak={hydrated.value ? undefined : ''}>{content.value}</div>
```

## 指令速查 {#directive-reference}

| 指令                      | Rue TSX 写法                                       | JSX 等价写法                                                      |
| ------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| `v-text` / `r-text`       | `<span v-text="msg.value" />`                      | `<span>{msg.value}</span>`                                        |
| `v-html` / `r-html`       | `<div r-html={html.value} />`                      | `<div dangerouslySetInnerHTML={{ __html: html.value }} />`        |
| `v-show` / `r-show`       | `<div v-show={visible.value} />`                   | `<div style={{ display: visible.value ? undefined : 'none' }} />` |
| `v-if` / `r-if`           | `<div v-if={ok.value}>OK</div>`                    | `{ok.value ? <div>OK</div> : null}`                               |
| `v-else-if` / `r-else-if` | `<div v-else-if={pending.value}>Pending</div>`     | 三元表达式的中间分支                                              |
| `v-else` / `r-else`       | `<div v-else>Fallback</div>`                       | 三元表达式的兜底分支                                              |
| `v-for` / `r-for`         | `<li v-for="item in items.value" key={item.id} />` | `items.value.map(item => <li key={item.id} />)`                   |
| `v-on` / `r-on`           | `<button v-on:click="save" />`                     | `<button onClick={save} />`                                       |
| `v-bind`                  | 直接使用 JSX 表达式                                | `<a href={url.value} />`                                          |
| `v-model` / `r-model`     | `<input v-model={text.value} />`                   | `value` + `onInput`                                               |
| `v-slot`                  | 使用 JSX children / render props                   | `<Panel><div slot="header" /></Panel>`                            |
| `v-pre` / `r-pre`         | `<div v-pre><span v-if={raw} /></div>`             | 不参与 Rue 指令改写                                               |
| `v-once` / `r-once`       | `<span v-once>{msg.value}</span>`                  | 静态提升或缓存                                                    |
| `v-memo` / `r-memo`       | `<div v-memo={[dep.value]} />`                     | 根据依赖缓存子树                                                  |
| `v-cloak`                 | 通常不需要                                         | 自定义属性 + CSS                                                  |
