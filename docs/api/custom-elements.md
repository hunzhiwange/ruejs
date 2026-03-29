# 自定义元素 API {#custom-elements-api}

## defineCustomElement() {#definecustomelement}

此方法接受与 [`defineComponent`](#definecomponent) 相同的参数，但返回原生[自定义元素](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements)类构造函数。

- **类型**

  ```ts
  function defineCustomElement(
    component: (ComponentOptions & CustomElementsOptions) | ComponentOptions['setup'],
    options?: CustomElementsOptions,
  ): {
    new (props?: object): HTMLElement
  }

  interface CustomElementsOptions {
    styles?: string[]

    // 以下选项是 3.5+
    configureApp?: (app: App) => void
    shadowRoot?: boolean
    nonce?: string
  }
  ```

  > 类型为可读性而简化。

- **详情**

  除了普通组件选项外，`defineCustomElement()` 还支持许多自定义元素特定的选项：
  - **`styles`**：内联 CSS 字符串数组，用于提供应注入元素 shadow root 的 CSS。

  - **`configureApp`** <sup class="vt-badge" data-text="3.5+"/>：可用于配置自定义元素的 Rue 应用程序实例的函数。

  - **`shadowRoot`** <sup class="vt-badge" data-text="3.5+"/>：`boolean`，默认为 `true`。设置为 `false` 以在不使用 shadow root 的情况下渲染自定义元素。这意味着自定义元素 SFC 中的 `<style>` 将不再被封装。

  - **`nonce`** <sup class="vt-badge" data-text="3.5+"/>：`string`，如果提供，将设置为注入到 shadow root 的 style 标签上的 `nonce` 属性。

  请注意，这些选项可以作为第二个参数传递，而不是作为组件本身的一部分传递：

  ```js
  import Element from './MyElement.ce.tsx'

  defineCustomElement(Element, {
    configureApp(app) {
      // ...
    },
  })
  ```

  返回值是一个可以使用 [`customElements.define()`](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define) 注册的自定义元素构造函数。

- **示例**

  ```js
  import { defineCustomElement } from 'rue-js'

  const MyRueElement = defineCustomElement({
    /* 组件选项 */
  })

  // 注册自定义元素。
  customElements.define('my-rue-element', MyRueElement)
  ```

- **另请参阅**
  - [指南 - 使用 Rue 构建自定义元素](/guide/extras/web-components#building-custom-elements-with-rue)

  - 另请注意，`defineCustomElement()` 与单文件组件一起使用时需要[特殊配置](/guide/extras/web-components#sfc-as-custom-element)。

## useHost() <sup class="vt-badge" data-text="3.5+"/> {#usehost}

返回当前 Rue 自定义元素的宿主元素的组合式 API 辅助函数。

## useShadowRoot() <sup class="vt-badge" data-text="3.5+"/> {#useshadowroot}

返回当前 Rue 自定义元素的 shadow root 的组合式 API 辅助函数。

## this.$host <sup class="vt-badge" data-text="3.5+"/> {#this-host}

暴露当前 Rue 自定义元素的宿主元素的选项式 API 属性。
