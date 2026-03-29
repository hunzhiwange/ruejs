# 模板引用 {#template-refs}

虽然 Rue 的声明式渲染模型为你抽象了大部分直接 DOM 操作，但在某些情况下，我们仍然需要直接访问底层 DOM 元素。为实现这一点，我们可以使用 `ref` 属性：

```tsx
<input ref={inputRef} />
```

`ref` 是一个特殊的属性，类似于列表渲染章节中讨论的 `key` 属性。它允许我们在元素挂载后直接引用特定的 DOM 元素或子组件实例。这可能很有用，例如，当你想在组件挂载时以编程方式聚焦输入框，或在元素上初始化第三方库时。

## 访问引用 {#accessing-the-refs}

要获取引用，我们可以在组件中使用 `ref()`：

```tsx
import { ref, onMounted } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const InputFocus: FC = () => {
  // 声明一个 ref 来保存元素引用
  // 名称必须与模板 ref 值匹配
  const input = ref<HTMLInputElement>(null)

  onMounted(() => {
    input.value?.focus()
  })

  return <input ref={input} />
}
```

注意你只能**在组件挂载后**访问 ref。如果你尝试在模板表达式中访问 `input.value`，在第一次渲染时它将是 `null`。这是因为在第一次渲染之前元素不存在！

如果你试图观察模板 ref 的变化，请务必考虑 ref 值为 `null` 的情况：

```tsx
import { watchEffect } from '@rue-js/rue'

watchEffect(() => {
  if (input.value) {
    input.value.focus()
  } else {
    // 尚未挂载，或元素已被卸载（例如被条件渲染）
  }
})
```

另请参见：[为模板引用添加类型](/guide/typescript/composition-api#typing-template-refs) <sup class="vt-badge ts" />

## 组件上的引用 {#ref-on-component}

> 本部分假设你了解 [组件](/guide/essentials/component-basics)。如果你还不熟悉，可以跳过并在之后回来查看。

`ref` 也可以在子组件上使用。在这种情况下，引用将是组件实例：

```tsx
import { ref, onMounted } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'
import Child from './Child'

const Parent: FC = () => {
  const childRef = ref<InstanceType<typeof Child>>(null)

  onMounted(() => {
    // childRef.value 将持有 <Child /> 的实例
    // 可以访问子组件的公开方法和属性
  })

  return <Child ref={childRef} />
}
```

被引用的实例将与子组件的 `this` 相同，这意味着父组件可以完全访问子组件的每个属性和方法。这使得在父子之间创建紧密耦合的实现细节变得容易，因此组件引用应该只在绝对需要时使用——在大多数情况下，你应该首先尝试使用标准的 props 和 emit 接口来实现父子交互。

### 暴露公共接口 {#exposing-public-interface}

默认情况下，组件是**私有的**：引用子组件的父组件无法访问任何东西，除非子组件选择使用导出暴露公共接口：

```tsx
import { ref } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

// 子组件
const Child: FC = () => {
  const a = 1
  const b = ref(2)

  // 通过命名导出暴露公共接口
  // 父组件可以通过 ref 访问这些值
  return <div>子组件</div>
}

// 暴露给父组件的公共属性
export type ChildExpose = {
  a: number
  b: number
}

export default Child
```

当父组件通过模板引用获取此组件的实例时，获取的实例将具有 `{ a: number, b: number }` 的形状（refs 会自动解包，就像普通实例上一样）。

注意，必须在任何异步操作之前完成暴露。否则，在 await 操作之后暴露的属性和方法将不可访问。

另请参见：[为组件模板引用添加类型](/guide/typescript/composition-api#typing-component-template-refs) <sup class="vt-badge ts" />

## 列表中的引用 {#refs-inside-v-for}

当在列表渲染中使用 `ref` 时，相应的 ref 应该包含一个数组值，在挂载后会被填充元素：

```tsx
import { ref, onMounted } from '@rue-js/rue'
import type { FC } from '@rue-js/rue'

const ListWithRefs: FC = () => {
  const list = ref([
    { id: 1, name: '项目 1' },
    { id: 2, name: '项目 2' },
    { id: 3, name: '项目 3' },
  ])

  const itemRefs = ref<HTMLLIElement[]>([])

  onMounted(() => {
    console.log(itemRefs.value)
    // [li, li, li]
  })

  return (
    <ul>
      {list.value.map((item, index) => (
        <li
          key={item.id}
          ref={el => {
            if (el) itemRefs.value[index] = el
          }}
        >
          {item.name}
        </li>
      ))}
    </ul>
  )
}
```

需要注意的是，ref 数组**不**保证与源数组顺序相同。

## 函数式引用 {#function-refs}

除了字符串键，`ref` 属性也可以绑定到一个函数，该函数将在每次组件更新时被调用，并给你完全的灵活性来决定在哪里存储元素引用。该函数接收元素引用作为第一个参数：

```tsx
const elementRef = ref<HTMLInputElement>(null)

return (
  <input
    ref={el => {
      // 将 el 赋值给属性或 ref
      elementRef.value = el
    }}
  />
)
```

注意我们使用了一个函数作为 `ref` 绑定，这样我们可以传递一个函数而不是 ref 名称字符串。当元素卸载时，参数将是 `null`。当然，你也可以使用方法代替内联函数。

### 清理函数 {#cleanup-function}

当元素卸载时，你可以通过返回一个清理函数来处理清理逻辑：

```tsx
const ItemList: FC = () => {
  const itemRefs = new Map<number, HTMLLIElement>()

  const setItemRef = (el: HTMLLIElement | null, id: number) => {
    if (el) {
      itemRefs.set(id, el)
    }

    // 返回清理函数
    return () => {
      itemRefs.delete(id)
    }
  }

  return (
    <ul>
      {items.value.map(item => (
        <li key={item.id} ref={el => setItemRef(el, item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  )
}
```

## 引用组件实例的方法 {#referencing-component-methods}

当你需要调用子组件的方法时，模板引用特别有用：

```tsx
// 子组件
const ChildComponent: FC = () => {
  const internalData = ref('内部数据')

  const doSomething = () => {
    console.log('做点什么')
    return internalData.value
  }

  // 暴露给父组件的方法
  return <div>子组件</div>
}

// 父组件
const ParentComponent: FC = () => {
  const childRef = ref<InstanceType<typeof ChildComponent>>(null)

  const handleClick = () => {
    // 调用子组件的方法
    const result = childRef.value?.doSomething()
    console.log('结果：', result)
  }

  return (
    <div>
      <ChildComponent ref={childRef} />
      <button onClick={handleClick}>调用子组件方法</button>
    </div>
  )
}
```

## 引用与响应式对象 {#refs-and-reactive-objects}

模板引用可以作为响应式对象的属性使用：

```tsx
const MyComponent: FC = () => {
  const refs = reactive({
    input: null as HTMLInputElement | null,
    button: null as HTMLButtonElement | null,
  })

  onMounted(() => {
    refs.input?.focus()
    refs.button?.click()
  })

  return (
    <div>
      <input
        ref={el => {
          refs.input = el
        }}
      />
      <button
        ref={el => {
          refs.button = el
        }}
      >
        按钮
      </button>
    </div>
  )
}
```

这使得管理多个引用更加有条理。
