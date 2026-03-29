# 条件渲染 {#conditional-rendering}

## 条件渲染 {#v-if}

在 Rue 中使用 JSX 进行条件渲染非常直观。你可以使用 JavaScript 的逻辑与运算符 `&&` 或三元运算符来条件性地渲染块。只有当条件表达式返回真值时，块才会被渲染。

```tsx
import { ref } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = () => {
  const awesome = ref(true)

  return <div>{awesome.value && <h1>Rue 太棒了！</h1>}</div>
}
```

## else 块 {#v-else}

你可以使用三元运算符来指示 `if` 的"else 块"：

```tsx
import { ref } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = () => {
  const awesome = ref(true)

  return (
    <div>
      <button onClick={() => (awesome.value = !awesome.value)}>切换</button>
      {awesome.value ? <h1>Rue 太棒了！</h1> : <h1>哦，不 😢</h1>}
    </div>
  )
}
```

## else-if 块 {#v-else-if}

三元运算符也可以链式使用来实现"else if"逻辑：

```tsx
import { ref } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = () => {
  const type = ref('A')

  return (
    <div>
      {type.value === 'A' ? (
        <div>A</div>
      ) : type.value === 'B' ? (
        <div>B</div>
      ) : type.value === 'C' ? (
        <div>C</div>
      ) : (
        <div>不是 A/B/C</div>
      )}
    </div>
  )
}
```

## 在片段上条件渲染 {#v-if-on-template}

在 JSX 中，如果你想切换多个元素，可以使用 fragment（片段）作为隐式包装器：

```tsx
import { ref } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = () => {
  const ok = ref(true)

  return (
    <div>
      {ok.value && (
        <>
          <h1>标题</h1>
          <p>段落 1</p>
          <p>段落 2</p>
        </>
      )}
    </div>
  )
}
```

## `display` 切换 {#v-show}

条件性显示元素的另一个选项是使用 `style` 属性直接控制 `display` CSS 属性：

```tsx
import { ref } from 'rue-js'
import type { FC } from 'rue-js'

const App: FC = () => {
  const ok = ref(true)

  return <h1 style={{ display: ok.value ? 'block' : 'none' }}>你好！</h1>
}
```

区别是元素始终会被渲染并保留在 DOM 中；我们通过 CSS 的 `display` 属性来切换可见性。

或者你可以创建一个 `vShow` 工具函数：

```tsx
function vShow(visible: boolean) {
  return { display: visible ? '' : 'none' }
}

// 使用
;<h1 style={vShow(ok.value)}>你好！</h1>
```

## 条件渲染 vs 显示切换 {#v-if-vs-v-show}

使用条件渲染（`&&` 或三元运算符）是"真正的"条件渲染，因为它确保在切换期间正确销毁和重新创建条件块内的事件监听器和子组件。

条件渲染也是**惰性的**：如果初始渲染时条件为假，它将不会执行任何操作——条件块在条件首次变为真之前不会被渲染。

相比之下，显示切换要简单得多——无论初始条件如何，元素始终被渲染，只是基于 CSS 进行切换。

一般来说，条件渲染有更高的切换开销，而显示切换有更高的初始渲染开销。因此，如果你需要频繁切换某些内容，优先使用显示切换；如果条件在运行时不太可能改变，优先使用条件渲染。

## 条件渲染与列表渲染 {#v-if-with-v-for}

在 JSX 中，条件和列表渲染的顺序完全由你控制。建议在列表渲染之前先进行过滤，或者在列表外层进行条件判断：

```tsx
// 推荐：先过滤，再渲染
const filteredItems = computed(() => items.value.filter(item => item.isComplete))

return (
  <ul>
    {filteredItems.value.map(item => (
      <li key={item.id}>{item.name}</li>
    ))}
  </ul>
)
```

```tsx
// 或者：条件包裹列表
return (
  shouldShowList.value && (
    <ul>
      {items.value.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
)
```

::: warning 注意
不推荐在列表渲染内部进行条件渲染，因为这会导致不必要的复杂性。参考上面的示例来组织你的代码。
:::
