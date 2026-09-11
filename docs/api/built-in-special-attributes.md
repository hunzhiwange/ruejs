# 内置特殊属性 {#built-in-special-attributes}

## key {#key}

`key` 特殊属性主要用作 Rue 在更新动态子节点时的稳定身份提示，用于在新旧子节点列表之间建立对应关系。

- **期望类型：** `number | string | symbol`

- **详情**

  没有 key 时，Rue 会尽量最小化元素移动并就地重用相同类型的子节点。有了 key，它会优先按 key 建立对应关系、在顺序变化时重排元素，并在 key 不再存在时删除对应节点或组件边界。

  同一公共父级的子级必须具有**唯一的 key**。重复的 key 将导致渲染错误。

  最常见的用例是与列表渲染结合：

  ```tsx
  <ul>
    {items.map(item => (
      <li key={item.id}>...</li>
    ))}
  </ul>
  ```

  它也可用于强制替换元素/组件而不是重用。这在以下情况下很有用：
  - 正确触发组件的生命周期钩子
  - 触发过渡

  例如：

  ```tsx
  <Transition>
    <span key={text}>{text}</span>
  </Transition>
  ```

  当 `text` 更改时，`<span>` 将始终被替换而不是修补，因此将触发过渡。

- **另请参阅** [指南 - 列表渲染 - 使用 `key` 维护状态](/guide/guide/essentials/list#maintaining-state-with-key)

## ref {#ref}

表示[模板 ref](/guide/guide/essentials/template-refs)。

- **期望类型：** `Function | { current: unknown }`

- **详情**

  `ref` 用于注册对元素或子组件的引用。

  在当前的 JSX / TSX 路径中，推荐使用 `useRef()` 返回的容器保存引用：

  ```tsx
  import { useRef } from '@rue-js/rue'

  const pRef = useRef<HTMLParagraphElement>()
  ```

  ```tsx
  <p ref={pRef}>hello</p>
  ```

  如果用于普通 DOM 元素，`current` 将指向该元素；如果用于子组件，`current` 将指向子组件实例。

  Rue 当前直接支持函数 ref 和对象 ref；不会把字符串 ref 自动收集到同名变量或 `$refs` 对象中。

  或者，`ref` 可以接受一个函数值，该函数提供对存储引用位置的完全控制：

  ```tsx
  <ChildComponent ref={el => (child = el)} />
  ```

  关于 ref 注册时间的重要说明：由于 refs 本身是渲染函数的结果，因此必须等到组件挂载后才能访问它们。

- **另请参阅**
  - [指南 - 模板 Refs](/guide/guide/essentials/template-refs)
  - [指南 - 为模板 Refs 添加类型](/guide/guide/typescript/composition-api#typing-template-refs) <sup class="vt-badge ts" />
  - [指南 - 为组件模板 Refs 添加类型](/guide/guide/typescript/composition-api#typing-component-template-refs) <sup class="vt-badge ts" />

## is {#is}

用于在 [`<Component>`](/api/api/built-in-special-elements#component) 上选择要渲染的动态组件或元素。

- **期望类型：** `string`，并配合 `<Component>` 的字面量 `registry`

- **在原生元素上的使用**

  当在普通原生 HTML 元素上使用 `is` 属性时，Rue 不会把它改写为动态组件语义，也不会识别 `rue:` 前缀；它只会作为普通 HTML 属性传递。原生[自定义内置元素](https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements-customized-builtin-example)的行为取决于浏览器支持和元素创建方式。

  动态组件只支持 `<Component is={kind} registry={{ ... }}>` 的有限静态工厂集合。动态原生标签、任意组件对象和全局注册名不受支持。

- **另请参阅**
  - [内置特殊元素 - `<Component>`](/api/api/built-in-special-elements#component)
  - [动态组件](/guide/guide/essentials/component-basics#dynamic-components)
