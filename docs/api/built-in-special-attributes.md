# 内置特殊属性 {#built-in-special-attributes}

## key {#key}

`key` 特殊属性主要用作 Rue 虚拟 DOM 算法的提示，用于在将新节点列表与旧节点列表进行比较时识别 vnode。

- **期望类型：** `number | string | symbol`

- **详情**

  没有 key 时，Rue 使用一种最小化元素移动并尝试就地修补/重用相同类型元素的算法。有了 key，它将根据 key 的顺序变化重新排序元素，并且 key 不再存在的元素将始终被删除/销毁。

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

- **另请参阅** [指南 - 列表渲染 - 使用 `key` 维护状态](/guide/essentials/list#maintaining-state-with-key)

## ref {#ref}

表示[模板 ref](/guide/essentials/template-refs)。

- **期望类型：** `string | Function`

- **详情**

  `ref` 用于注册对元素或子组件的引用。

  在选项式 API 中，引用将在组件的 `this.$refs` 对象下注册：

  ```vue-html
  <!-- 存储为 this.$refs.p -->
  <p ref="p">hello</p>
  ```

  在组合式 API 中，引用将存储在同名的 ref 中：

  ```tsx
  import { useTemplateRef } from '@rue-js/rue'

  const pRef = useTemplateRef('p')
  ```

  ```tsx
  <p ref={pRef}>hello</p>
  ```

  如果用于普通 DOM 元素，引用将是该元素；如果用于子组件，引用将是子组件实例。

  或者，`ref` 可以接受一个函数值，该函数提供对存储引用位置的完全控制：

  ```tsx
  <ChildComponent ref={el => (child = el)} />
  ```

  关于 ref 注册时间的重要说明：由于 refs 本身是渲染函数的结果，因此必须等到组件挂载后才能访问它们。

  `this.$refs` 也是非响应式的，因此不应尝试在模板中将其用于数据绑定。

- **另请参阅**
  - [指南 - 模板 Refs](/guide/essentials/template-refs)
  - [指南 - 为模板 Refs 添加类型](/guide/typescript/composition-api#typing-template-refs) <sup class="vt-badge ts" />
  - [指南 - 为组件模板 Refs 添加类型](/guide/typescript/composition-api#typing-component-template-refs) <sup class="vt-badge ts" />

## is {#is}

用于绑定[动态组件](/guide/essentials/component-basics#dynamic-components)。

- **期望类型：** `string | Component`

- **在原生元素上的使用**
  - 仅在 3.1+ 中支持

  当在原生 HTML 元素上使用 `is` 属性时，它将被解释为[自定义内置元素](https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements-customized-builtin-example)，这是一个原生 Web 平台功能。

  但是，在某些用例中，您可能需要 Rue 用 Rue 组件替换原生元素，如在[DOM 内模板解析注意事项](/guide/essentials/component-basics#in-dom-template-parsing-caveats)中所述。您可以在 `is` 属性的值前加上 `rue:` 前缀，以便 Rue 将该元素作为 Rue 组件而不是自定义内置元素渲染：

  ```tsx
  <table>
    <tr is="rue:my-row-component"></tr>
  </table>
  ```

- **另请参阅**
  - [内置特殊元素 - `<component>`](/api/built-in-special-elements#component)
  - [动态组件](/guide/essentials/component-basics#dynamic-components)
