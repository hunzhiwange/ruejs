# 自定义元素 API {#custom-elements-api}

## useCustomElement() {#definecustomelement}

此方法把 Rue 组件包装为原生[自定义元素](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements)类构造函数。

当前实现是一个最小运行时包装器，适合把 Rue 组件注册到 `customElements` 并挂载到宿主元素或 shadow root 中。

- **类型**

  ```ts
  function useCustomElement(
    component:
      | ComponentInstance
      | {
          setup?: (props: Record<string, unknown>) => any
          render?: (ctx: any) => RenderableOutput
        },
    options?: CustomElementsOptions,
  ): {
    new (): HTMLElement & {
      props: Record<string, unknown>
    }
  }

  interface CustomElementsOptions {
    styles?: string[]
    configureApp?: (app: ReturnType<typeof useApp>) => void
    shadowRoot?: boolean
    nonce?: string
  }
  ```

  > 类型为可读性而简化。

- **详情**

  `useCustomElement()` 当前支持以下能力：
  - **`styles`**：内联 CSS 字符串数组。样式会在挂载后注入到 shadow root，或在 `shadowRoot: false` 时注入到宿主元素。

  - **`configureApp`**：可在每个自定义元素实例挂载前拿到 `useApp()` 返回值，便于安装插件或追加应用级配置。

  - **`shadowRoot`**：`boolean`，默认为 `true`。设置为 `false` 时，组件直接渲染到宿主元素的 light DOM。

  - **`nonce`**：如果提供，会写到注入的 `<style>` 标签上。

  自定义元素实例的 props 目前通过两条路径传入：
  - 宿主属性会被读取并按 kebab-case -> camelCase 转成字符串 props。
  - 宿主实例上的 `props` 对象可用于传递非字符串值，例如 `el.props = { count: 1 }`。
  - 更新后的值会被同步到同一个响应式 props 容器中，组件子树会按普通 Rue 响应式更新重新渲染，而不是整棵重挂载。

  组件内部通过 `emitted(props)` 发出的事件，会在宿主元素上桥接为同名 `CustomEvent`。事件参数会按原顺序放到 `event.detail` 数组里，并以 `bubbles: true`、`composed: true` 调度。

  在 `shadowRoot: true` 模式下，组件模板中的原生 `<slot>` 会直接依赖浏览器的 slot 分发机制，从宿主 light DOM 投影内容。

  请注意，这些选项可以作为第二个参数传递，而不是作为组件本身的一部分传递：

  ```js
  import { useCustomElement } from '@rue-js/rue'

  const MyElement = useCustomElement(
    props => {
      return <p>{props.label ?? 'hello'}</p>
    },
    {
      configureApp(app) {
        // app.use(...)
      },
    },
  )

  customElements.define('my-element', MyElement)
  ```

  返回值是一个可以使用 [`customElements.define()`](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define) 注册的自定义元素构造函数。

- **示例**

  ```js
  import { useCustomElement } from '@rue-js/rue'

  const MyRueElement = useCustomElement(
    props => {
      return <div>{props.label ?? 'hello'}</div>
    },
    {
      styles: [':host { display: block; }'],
    },
  )

  // 注册自定义元素。
  customElements.define('my-rue-element', MyRueElement)
  ```

- **另请参阅**
  - [指南 - 使用 Rue 构建自定义元素](/guide/extras/web-components#building-custom-elements-with-rue)

## useHost() <sup class="vt-badge" data-text="3.5+"/> {#usehost}

返回当前 Rue 自定义元素的宿主元素。

## useShadowRoot() <sup class="vt-badge" data-text="3.5+"/> {#useshadowroot}

返回当前 Rue 自定义元素的 shadow root；如果当前元素使用的是 light DOM 渲染，则返回 `null`。

## this.$host <sup class="vt-badge" data-text="3.5+"/> {#this-host}

当前默认入口尚未实现此 API。
