# 选项：杂项 {#options-misc} @todo

> **@todo**: 整个 Options API 尚未实现。Rue 目前仅支持 Composition API / FC 模式。

## name {#name}

为组件显式声明显示名称。

- **类型**

  ```ts
  interface ComponentOptions {
    name?: string
  }
  ```

- **详情**

  组件名称用于以下用途：
  - 组件自身模板中的递归自引用
  - 在 Rue DevTools 的组件检查树中显示
  - 在警告组件跟踪中显示

  当您使用单文件组件时，组件已经从文件名推断出自己的名称。例如，名为 `MyComponent.tsx` 的文件将具有推断的显示名称 "MyComponent"。

  另一种情况是当使用 [`app.component`](/api/application#app-component) 全局注册组件时，全局 ID 会自动设置为其名称。

  `name` 选项允许您覆盖推断的名称，或在无法推断名称时显式提供名称（例如，不使用构建工具时，或内联的非 SFC 组件）。

  有一种情况 `name` 是明确必需的：当通过其 `include / exclude` props 匹配 [`<KeepAlive>`](/guide/built-ins/keep-alive) 中的可缓存组件时。

  :::tip
  从 3.2.34 版本开始，使用 `<script setup>` 的单文件组件将自动根据文件名推断其 `name` 选项，即使与 `<KeepAlive>` 一起使用时也无需手动声明名称。
  :::

## inheritAttrs {#inheritattrs}

控制是否应启用默认组件属性透传行为。

- **类型**

  ```ts
  interface ComponentOptions {
    inheritAttrs?: boolean // default: true
  }
  ```

- **详情**

  默认情况下，父级作用域中未被识别为 props 的属性绑定将"透传"。这意味着当我们有单根组件时，这些绑定将作为普通 HTML 属性应用于子组件的根元素。在编写包装目标元素或其他组件的组件时，这可能并不总是期望的行为。通过将 `inheritAttrs` 设置为 `false`，可以禁用此默认行为。属性可通过 `$attrs` 实例属性使用，并可以使用属性展开显式绑定到非根元素。

- **示例**

  <div class="options-api">

  ```tsx
  export default {
    inheritAttrs: false,
    props: ['label', 'value'],
    emits: ['input'],
    render() {
      return (
        <label>
          {this.label}
          <input
            {...this.$attrs}
            value={this.value}
            onInput={e => this.$emit('input', e.target.value)}
          />
        </label>
      )
    },
  }
  ```

  </div>
  <div class="composition-api">

  在使用 `<script setup>` 的组件中声明此选项时，可以使用 [`defineOptions`](/api/sfc-script-setup#defineoptions) 宏：

  ```tsx
  defineProps(['label', 'value'])
  defineEmits(['input'])
  defineOptions({
    inheritAttrs: false,
  })
  ```

  ```tsx
  <label>
    {label}
    <input {...attrs} value={value} onInput={e => emit('input', e.target.value)} />
  </label>
  ```

  </div>

- **另请参阅**
  - [透传属性](/guide/components/attrs)
  <div class="composition-api">

  - [在普通 `<script>` 中使用 `inheritAttrs`](/api/sfc-script-setup.html#usage-alongside-normal-script)
  </div>

## components {#components}

注册可供组件实例使用的组件的对象。

- **类型**

  ```ts
  interface ComponentOptions {
    components?: { [key: string]: Component }
  }
  ```

- **示例**

  ```js
  import Foo from './Foo'
  import Bar from './Bar'

  export default {
    components: {
      // 简写
      Foo,
      // 以不同名称注册
      RenamedBar: Bar,
    },
  }
  ```

- **另请参阅** [组件注册](/guide/components/registration)

## directives {#directives}

注册可供组件实例使用的指令的对象。

- **类型**

  ```ts
  interface ComponentOptions {
    directives?: { [key: string]: Directive }
  }
  ```

- **示例**

  ```js
  export default {
    directives: {
      // 在模板中启用 v-focus
      focus: {
        mounted(el) {
          el.focus()
        },
      },
    },
  }
  ```

  ```tsx
  <input ref={el => el?.focus()} />
  ```

- **另请参阅** [自定义指令](/guide/reusability/custom-directives)
