# 自定义渲染器 API {#custom-renderer-api}

## createRenderer() {#createrenderer}

创建自定义渲染器。通过提供平台特定的节点创建和操作 API，您可以利用 Rue 的核心运行时来针对非 DOM 环境。

- **类型**

  ```ts
  function createRenderer<HostNode, HostElement>(
    options: RendererOptions<HostNode, HostElement>,
  ): Renderer<HostElement>

  interface Renderer<HostElement> {
    render: RootRenderFunction<HostElement>
    createApp: CreateAppFunction<HostElement>
  }

  interface RendererOptions<HostNode, HostElement> {
    patchProp(
      el: HostElement,
      key: string,
      prevValue: any,
      nextValue: any,
      namespace?: ElementNamespace,
      parentComponent?: ComponentInternalInstance | null,
    ): void
    insert(el: HostNode, parent: HostElement, anchor?: HostNode | null): void
    remove(el: HostNode): void
    createElement(
      type: string,
      namespace?: ElementNamespace,
      isCustomizedBuiltIn?: string,
      vnodeProps?: (VNodeProps & { [key: string]: any }) | null,
    ): HostElement
    createText(text: string): HostNode
    createComment(text: string): HostNode
    setText(node: HostNode, text: string): void
    setElementText(node: HostElement, text: string): void
    parentNode(node: HostNode): HostElement | null
    nextSibling(node: HostNode): HostNode | null
    querySelector?(selector: string): HostElement | null
    setScopeId?(el: HostElement, id: string): void
    cloneNode?(node: HostNode): HostNode
    insertStaticContent?(
      content: string,
      parent: HostElement,
      anchor: HostNode | null,
      namespace: ElementNamespace,
      start?: HostNode | null,
      end?: HostNode | null,
    ): [HostNode, HostNode]
  }
  ```

- **示例**

  ```js
  import { createRenderer } from '@rue-js/runtime-core'

  const { render, createApp } = createRenderer({
    patchProp,
    insert,
    remove,
    createElement,
    // ...
  })

  // `render` 是底层 API
  // `createApp` 返回应用程序实例
  export { render, createApp }

  // 重新导出 Rue 核心 API
  export * from '@rue-js/runtime-core'
  ```

  Rue 自己的 `@rue-js/runtime` [使用相同的 API 实现](https://github.com/hunzhiwange/ruejs/blob/main/packages/runtime/src/index.ts)。有关更简单的实现，请查看 [`@rue-js/runtime-test`](https://github.com/hunzhiwange/ruejs/blob/main/packages/runtime-test/src/index.ts)，这是用于 Rue 自己单元测试的私有包。
