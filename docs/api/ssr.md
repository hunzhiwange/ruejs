# 服务器端渲染 API {#server-side-rendering-api} @todo

> **@todo**: 整个 SSR 子系统尚未实现。以下 API 均为规划中。

## renderToString() {#rendertostring}

- **从 `@rue-js/rue/server-renderer` 导出**

- **类型**

  ```ts
  function renderToString(input: App | VNode, context?: SSRContext): Promise<string>
  ```

- **示例**

  ```js
  import { createSSRApp } from '@rue-js/rue'
  import { renderToString } from '@rue-js/rue/server-renderer'

  const app = createSSRApp({
    data: () => ({ msg: 'hello' }),
    render: () => h('div', 'hello'),
  })

  ;(async () => {
    const html = await renderToString(app)
    console.log(html)
  })()
  ```

  ### SSR 上下文 {#ssr-context}

  您可以传递一个可选的上下文对象，该对象可用于在渲染期间记录附加数据，例如[访问 Teleport 的内容](/guide/scaling-up/ssr#teleports)：

  ```js
  const ctx = {}
  const html = await renderToString(app, ctx)

  console.log(ctx.teleports) // { '#teleported': 'teleported content' }
  ```

  此页面上大多数其他 SSR API 也可选地接受上下文对象。上下文对象可以通过 [useSSRContext](#usessrcontext) 辅助函数在组件代码中访问。

- **另请参阅** [指南 - 服务器端渲染](/guide/scaling-up/ssr)

## renderToNodeStream() {#rendertonodestream}

将输入渲染为 [Node.js 可读流](https://nodejs.org/api/stream.html#stream_class_stream_readable)。

- **从 `@rue-js/rue/server-renderer` 导出**

- **类型**

  ```ts
  function renderToNodeStream(input: App | VNode, context?: SSRContext): Readable
  ```

- **示例**

  ```js
  // 在 Node.js http 处理程序内部
  renderToNodeStream(app).pipe(res)
  ```

  :::tip 注意
  此方法在从 Node.js 环境解耦的 `@rue-js/rue/server-renderer` 的 ESM 构建中不受支持。请改用 [`pipeToNodeWritable`](#pipetonodewritable)。
  :::

## pipeToNodeWritable() {#pipetonodewritable}

渲染并管道传输到现有的 [Node.js 可写流](https://nodejs.org/api/stream.html#stream_writable_streams) 实例。

- **从 `@rue-js/rue/server-renderer` 导出**

- **类型**

  ```ts
  function pipeToNodeWritable(
    input: App | VNode,
    context: SSRContext = {},
    writable: Writable,
  ): void
  ```

- **示例**

  ```js
  // 在 Node.js http 处理程序内部
  pipeToNodeWritable(app, {}, res)
  ```

## renderToWebStream() {#rendertowebstream}

将输入渲染为 [Web ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)。

- **从 `@rue-js/rue/server-renderer` 导出**

- **类型**

  ```ts
  function renderToWebStream(input: App | VNode, context?: SSRContext): ReadableStream
  ```

- **示例**

  ```js
  // 在支持 ReadableStream 的环境中
  return new Response(renderToWebStream(app))
  ```

  :::tip 注意
  在不暴露 `ReadableStream` 构造函数到全局作用域的环境中，应改用 [`pipeToWebWritable()`](#pipetowebwritable)。
  :::

## pipeToWebWritable() {#pipetowebwritable}

渲染并管道传输到现有的 [Web WritableStream](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream) 实例。

- **从 `@rue-js/rue/server-renderer` 导出**

- **类型**

  ```ts
  function pipeToWebWritable(
    input: App | VNode,
    context: SSRContext = {},
    writable: WritableStream,
  ): void
  ```

- **示例**

  这通常与 [`TransformStream`](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream) 结合使用：

  ```js
  // TransformStream 在 CloudFlare workers 等环境中可用。
  // 在 Node.js 中，需要从 'stream/web' 显式导入 TransformStream
  const { readable, writable } = new TransformStream()
  pipeToWebWritable(app, {}, writable)

  return new Response(readable)
  ```

## renderToSimpleStream() {#rendertosimplestream}

使用简单的可读接口以流模式渲染输入。

- **从 `@rue-js/rue/server-renderer` 导出**

- **类型**

  ```ts
  function renderToSimpleStream(
    input: App | VNode,
    context: SSRContext,
    options: SimpleReadable,
  ): SimpleReadable

  interface SimpleReadable {
    push(content: string | null): void
    destroy(err: any): void
  }
  ```

- **示例**

  ```js
  let res = ''

  renderToSimpleStream(
    app,
    {},
    {
      push(chunk) {
        if (chunk === null) {
          // 完成
          console(`render complete: ${res}`)
        } else {
          res += chunk
        }
      },
      destroy(err) {
        // 遇到错误
      },
    },
  )
  ```

## useSSRContext() {#usessrcontext}

用于检索传递给 `renderToString()` 或其他服务器渲染 API 的上下文对象的运行时 API。

- **类型**

  ```ts
  function useSSRContext<T = Record<string, any>>(): T | undefined
  ```

- **示例**

  检索到的上下文可用于附加渲染最终 HTML 所需的信息（例如 head 元数据）。

  ```tsx
  import { useSSRContext } from '@rue-js/rue'

  // 确保只在 SSR 期间调用它
  // https://vitejs.dev/guide/ssr.html#conditional-logic
  if (import.meta.env.SSR) {
    const ctx = useSSRContext()
    // ...附加属性到上下文
  }
  ```

## data-allow-mismatch <sup class="vt-badge" data-text="3.5+" /> {#data-allow-mismatch}

可用于抑制 [hydration 不匹配](/guide/scaling-up/ssr#hydration-mismatch) 警告的特殊属性。

- **示例**

  ```html
  <div data-allow-mismatch="text">{data.toLocaleString()}</div>
  ```

  该值可以将允许的不匹配限制为特定类型。允许的值有：
  - `text`
  - `children` (仅允许直接子级的不匹配)
  - `class`
  - `style`
  - `attribute`

  如果未提供值，将允许所有类型的不匹配。
