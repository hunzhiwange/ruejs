# Teleport (传送门) {#teleport}

`<Teleport>` 是一个内置组件，允许我们将组件模板的一部分 "传送" 到存在于该组件 DOM 层次结构之外的 DOM 节点。

## 基本用法 (Basic Usage) {#basic-usage}

有时组件模板的一部分在逻辑上属于它，但从视觉角度来看，它应该显示在 DOM 的其他位置，甚至可能在 Rue 应用之外。

最常见的例子是构建全屏模态框时。理想情况下，我们希望模态框的按钮代码和模态框本身都写在同一个单文件组件中，因为它们都与模态框的打开/关闭状态相关。但这意味着模态框将与按钮一起渲染，深深地嵌套在应用的 DOM 层次结构中。通过 CSS 定位模态框时这可能会产生一些棘手的问题。

考虑以下 HTML 结构：

```tsx
<div className="outer">
  <h3>Rue Teleport 示例</h3>
  <div>
    <MyModal />
  </div>
</div>
```

这是 `<MyModal>` 的实现：

```tsx
import { useState } from 'rue-js'
import type { FC } from 'rue-js'

const MyModal: FC = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}>打开模态框</button>

      {open && (
        <div className="modal">
          <p>来自模态框的问候！</p>
          <button onClick={() => setOpen(false)}>关闭</button>
        </div>
      )}
    </>
  )
}

export default MyModal
```

```css
.modal {
  position: fixed;
  z-index: 999;
  top: 20%;
  left: 50%;
  width: 300px;
  margin-left: -150px;
}
```

该组件包含一个 `<button>` 来触发打开模态框，以及一个类名为 `.modal` 的 `<div>`，它将包含模态框的内容和一个自我关闭的按钮。

在初始 HTML 结构中使用此组件时，有许多潜在问题：

- `position: fixed` 仅在没有祖先元素设置 `transform`、`perspective` 或 `filter` 属性时才将元素相对于视口放置。例如，如果我们打算使用 CSS transform 为祖先 `<div class="outer">` 添加动画，它会破坏模态框布局！

- 模态框的 `z-index` 受其包含元素的约束。如果有另一个元素与 `<div class="outer">` 重叠并且具有更高的 `z-index`，它将覆盖我们的模态框。

`<Teleport>` 提供了一种干净的方法来解决这些问题，允许我们跳出嵌套的 DOM 结构。让我们修改 `<MyModal>` 以使用 `<Teleport>`：

```tsx
import { useState } from 'rue-js'
import { Teleport } from 'rue-js'
import type { FC } from 'rue-js'

const MyModal: FC = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}>打开模态框</button>

      <Teleport to="body">
        {open && (
          <div className="modal">
            <p>来自模态框的问候！</p>
            <button onClick={() => setOpen(false)}>关闭</button>
          </div>
        )}
      </Teleport>
    </>
  )
}
```

`<Teleport>` 的 `to` 目标期望一个 CSS 选择器字符串或实际的 DOM 节点。在这里，我们实际上是在告诉 Rue "**传送** 此模板片段 **到** **`body`** 标签"。

您可以将 `<Teleport>` 与 [`<Transition>`](./transition) 结合使用来创建动画模态框 - 参见 [示例](/examples/#modal)。

:::tip
传送门 `to` 目标必须在 `<Teleport>` 组件挂载时已经存在于 DOM 中。理想情况下，这应该是整个 Rue 应用之外的元素。如果目标是 Rue 渲染的另一个元素，您需要确保该元素在 `<Teleport>` 之前挂载。
:::

## 与组件一起使用 (Using with Components) {#using-with-components}

`<Teleport>` 只改变渲染的 DOM 结构 - 它不影响组件的逻辑层次结构。也就是说，如果 `<Teleport>` 包含一个组件，该组件将保持作为包含 `<Teleport>` 的父组件的逻辑子组件。Props 传递和事件发出将继续以相同的方式工作。

这也意味着父组件的注入按预期工作，并且子组件将在 Rue Devtools 中嵌套在父组件下方，而不是放在实际内容移动到的位置。

## 禁用传送门 (Disabling Teleport) {#disabling-teleport}

在某些情况下，我们可能希望有条件地禁用 `<Teleport>`。例如，我们可能希望在桌面上将组件渲染为覆盖层，但在移动设备上内联渲染。`<Teleport>` 支持 `disabled` prop，可以动态切换：

```tsx
<Teleport disabled={isMobile}>...</Teleport>
```

然后我们可以动态更新 `isMobile`。

## 同一目标上的多个传送门 (Multiple Teleports on the Same Target) {#multiple-teleports-on-the-same-target}

一个常见的用例是一个可重用的 `<Modal>` 组件，可能有多个实例同时处于活动状态。对于这种场景，多个 `<Teleport>` 组件可以将其内容挂载到同一个目标元素。顺序将是简单的追加，后面的挂载位于前面的之后，但都在目标元素内。

给定以下用法：

```tsx
<Teleport to="#modals">
  <div>A</div>
</Teleport>
<Teleport to="#modals">
  <div>B</div>
</Teleport>
```

渲染结果将是：

```html
<div id="modals">
  <div>A</div>
  <div>B</div>
</div>
```

## 延迟传送门 <sup class="vt-badge" data-text="3.5+" /> (Deferred Teleport) {#deferred-teleport}

在 Rue 3.5 及以上版本中，我们可以使用 `defer` prop 将 Teleport 的目标解析延迟到应用的其他部分挂载之后。这允许 Teleport 目标是由 Rue 渲染的容器元素，但在组件树的后面部分：

```tsx
;<Teleport defer to="#late-div">
  ...
</Teleport>

{
  /* 模板后面某处 */
}
;<div id="late-div"></div>
```

注意，目标元素必须与 Teleport 在同一挂载/更新周期内渲染 - 即，如果 `<div>` 在一秒后挂载，Teleport 仍然会报告错误。defer 的工作方式类似于 `mounted` 生命周期钩子。

---

**相关**

- [`<Teleport>` API 参考](/api/built-in-components#teleport)
- [在 SSR 中处理 Teleports](/guide/scaling-up/ssr#teleports)
