# 渲染机制 {#rendering-mechanism}

Rue 当前默认的渲染机制是 Block / Vapor。模板与 JSX 在编译阶段会尽量直接降到可执行的 Renderable / Block 指令，运行时围绕 DOM 锚点、区间和响应式副作用做最小更新，而不是把整棵界面都当成一棵需要反复 diff 的对象树。

这并不意味着文档里完全不会再出现旧的公开对象术语。`h()` 和少量迁移说明仍会提到它们，用来解释历史上的手写渲染输出；但 Rue 的默认主入口已经不再提供 compat 子路径，也不再接受旧的 compat helper。

## 公开渲染输出与默认 Block / Vapor {#virtual-dom}

如果你从旧版本或其他框架迁移过来，最容易混淆的一点是：

- Rue 仍然允许你手写 `h()` 或 JSX
- 历史文档里仍可能看到旧的公开对象术语
- 但 Rue 默认编译产物已经优先走 Block / Vapor / Renderable 路径

在默认路径中，编译器会提前把静态结构、动态绑定、锚点布局和清理边界编码进输出。运行时拿到的不是“先完整建一棵对象树，再整树比较”，而是“直接执行一段更接近真实 DOM 操作的渲染计划”。

只有在以下情况，你才会明显接触到历史对象桥接/compat 语义：

- 你在手写渲染函数
- 你在桥接历史库或老 helper
- 你在迁移已经被删除的 compat 子路径与旧 helper

## 渲染管道 {#render-pipeline}

在高层次上，当 Rue 组件挂载和更新时，会发生以下事情：

1. **编译**：模板或 JSX 被编译成 Block / Renderable 导向的输出。静态结构、动态区段、锚点与更新提示会尽可能在构建时确定。
2. **挂载**：运行时执行编译产物，创建真实 DOM、插入锚点、建立区间边界，并在执行过程中收集相关响应式依赖。
3. **更新**：依赖变更后，只重新执行受影响的 block / effect。运行时直接更新对应 DOM 节点、区间或组件边界，而不是重新比较整棵对象树。
4. **清理**：当分支切换、组件卸载或 renderable 边界失效时，对应 owner / cleanup bucket 会被回收，事件、订阅与 DOM 区间一并释放。

![render pipeline](./images/render-pipeline.png)

<!-- https://www.figma.com/file/elViLsnxGJ9lsQVsuhwqxM/Rendering-Mechanism -->

## 模板与渲染函数 {#templates-vs-render-functions}

Rue 依然支持手写渲染函数，但默认推荐模板或普通 JSX，原因和以前不同了：

1. 它们更接近 HTML 与组件声明，适合大多数应用代码。
2. 它们能让编译器更早识别静态段、动态段、锚点和清理边界，从而直接生成更高效的 Block / Vapor 输出。
3. 它们不需要你手动维护旧桥接对象细节，也更不容易意外依赖内部字段。

手写渲染函数仍然有价值，尤其适合：

- 高度动态的可复用组件
- 需要精确控制 children / render prop 的库代码
- 迁移中的旧 helper 或预编译产物桥接

如果你需要手写 `h()` 或维护旧的渲染桥接，请把它们视为显式边界，而不是默认开发路径。相关写法见 [渲染函数与 JSX](./render-function)，迁移事项见 [默认 Block / Vapor 路径迁移](/guide/migration/renderable-default)。

## 编译器知情的 Block / Vapor {#compiler-informed-virtual-dom}

Rue 的核心优势在于同时掌控编译器与运行时。编译器可以提前知道哪些结构稳定、哪些片段会更新、哪些区段需要锚点、哪些分支在切换时必须清理；运行时则只执行这些已经被压缩过的信息。

旧文档里把这类优化描述成“编译器知情的整树协调模型”。今天更准确的说法是：Rue 会把编译期知识直接下沉到 Block / Vapor 运行时，让更新路径尽量接近真实 DOM 变更本身。

下面这些优化依旧存在，只是它们服务的对象已经不是“整树对象 diff”，而是“编译后可直接执行的渲染计划”。

### 静态提升 {#cache-static}

模板中不含动态绑定的片段，会在编译阶段被提升、缓存或折叠成可复用的静态结构。这样更新时无需重新创建这些节点，也无需再次遍历它们。

```vue-html{2-3}
<div>
  <div>foo</div>
  <div>bar</div>
  <div>{{ dynamic }}</div>
</div>
```

在这个例子里，只有 `dynamic` 所在的片段需要参与更新；静态节点会在初次挂载后尽量复用。

### Patch 标记与精准更新 {#patch-flags}

对于有动态绑定的节点，编译器会把“究竟什么会变”编码进产物，例如文本、class、style、属性或稳定片段。运行时据此直接走对应的更新路径，而不是重新检查整组 props。

```vue-html
<div :class="{ active }"></div>
<input :id="id" :value="value">
<div>{{ dynamic }}</div>
```

这类提示让运行时可以把更新收敛为“改 class”“改 value”“改 text”这样的定点操作。

### 树扁平化与区间更新 {#tree-flattening}

编译器会把真正可能变化的后代节点提取出来，以 block 或区间边界的方式组织。这样组件更新时，运行时通常只需要遍历动态段，而不是重新访问整个静态子树。

遇到 `v-if`、`v-for`、`Teleport`、`Transition` 之类结构性边界时，Rue 会把它们当作独立的 block / range 处理，并通过锚点定位插入、移动和清理范围。

### 对 SSR 水合的影响 {#impact-on-ssr-hydration}

同样的编译期提示也会影响 SSR 水合。客户端不需要把服务端 HTML 再还原成完整对象树后重跑 diff，而是可以按 block、动态节点和锚点边界接管现有 DOM。

这意味着：

- 静态片段可以更快跳过
- 动态节点可以直接进入对应更新路径
- 结构化边界可以在更小的粒度上完成接管与后续更新

## compat 与迁移边界

显式 compat 子路径已经删除。默认主入口也不再保留 compat-only helper。新代码应优先沿用模板、普通 JSX、`props.children` 与 render prop 等 Rue 当前主路径；旧的手写渲染 helper 则需要直接重写为默认 Renderable / raw node / mount handle 方案。
