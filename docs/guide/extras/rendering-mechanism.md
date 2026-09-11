# 渲染机制 {#rendering-mechanism}

Rue 的渲染机制由编译器选择最小可用层级：静态 JSX 直接降为原生 DOM 操作，交互路径使用 compiled core。无法静态证明的结构会在构建期失败，不存在运行时 JSX 或 Vapor fallback。

## 公开渲染输出 {#public-render-output}

<span id="virtual-dom"></span>

Rue 应用使用 JSX / TSX 描述输出。编译器会提前识别静态结构、动态绑定、锚点布局和清理边界，并为每个模块选择足以保持语义的最小产物。应用代码通常继续从 `@rue-js/rue` 导入；`@rue-js/rue/internal` 是编译产物和底层集成的入口，不需要为普通组件手动切换。

## 两层执行模型 {#three-tier-execution-model}

1. **静态 DOM**：没有 Rue 动态值的原生 JSX 会被直接编译成 DOM 创建与插入代码，Rue 值依赖为零。
2. **Compiled core**：Signal、effect、owner、选择器、可证明安全的键控列表以及受支持的内置组件只加载所需响应式与 DOM 核心。

“静态零运行时”只描述第一层的构建产物。只要页面使用交互状态或复杂能力，就会加载与该能力匹配的运行时代码。

## 渲染管道 {#render-pipeline}

在高层次上，当 Rue 组件挂载和更新时，会发生以下事情：

1. **编译**：JSX 被分类为静态 DOM 或 compiled core。静态结构、动态区段、锚点与更新提示必须在构建时确定。
2. **挂载**：静态输出直接创建真实 DOM；动态输出由对应的最小层建立 effect、owner、锚点或区间边界。
3. **更新**：依赖变更后，只重新执行受影响的 binding、列表 reconcile、block 或 effect，并直接更新对应 DOM。同身份编译组件会原地同步只读响应式 props，不会仅因 props 变化重新调用整个组件函数。
4. **清理**：当分支切换、组件卸载或 renderable 边界失效时，对应 owner / cleanup bucket 会被回收，事件、订阅与 DOM 区间一并释放。

可以把它理解成一条能力路由管道：编译器先证明最小安全能力集，再生成静态 DOM 或导入恰好足够的运行时层，后者负责挂载、更新与清理。

## JSX 与动态渲染 {#templates-vs-render-functions}

普通 JSX 是 Rue 的源码渲染边界：

1. 它接近 HTML 与组件声明，适合应用和基础组件。
2. 编译器能识别静态段、动态段、锚点和清理边界，从而选择静态 DOM 或更小的 compiled 输出。
3. 应用无需维护底层渲染对象，也不会依赖生成 helper 的内部协议。

有限动态组件使用 `<Component is={kind} registry={{ ... }}>` 表达；任意函数值、全局字符串注册、MDX 组件模块和运行时 JSX factory 不受支持。children 和 render prop 继续建模为普通 props。

这里的“编译 JSX”特指经过 Rue SWC 的产物。编译器会直接导入 `@rue-js/rue/internal`。TypeScript 配置必须使用 `jsx: preserve`，并由 Rue 插件执行转换；如果转换后仍有 JSX AST，构建会在对应文件和语法位置失败。其他工具的 automatic JSX 降级不能替代 Rue 编译器。

## 编译器知情的渲染路径 {#compiler-informed-rendering}

<span id="compiler-informed-virtual-dom"></span>
<span id="compiler-informed-block-vapor"></span>

Rue 的核心优势在于同时掌控编译器与分层运行时。编译器必须提前知道哪些结构稳定、哪些片段会更新、哪些区段需要锚点、哪些分支在切换时必须清理；无法证明安全时会给出构建错误。

Rue 会把编译期知识直接下沉到渲染运行时，让更新路径尽量接近真实 DOM 变更本身。

下面这些优化服务于静态 DOM、compiled core 和编译组件；无法静态证明安全的结构需要改写为显式有限分支。

### 静态提升 {#cache-static}

模板中不含动态绑定的片段，会在编译阶段被提升、缓存或折叠成可复用的静态结构。这样更新时无需重新创建这些节点，也无需再次遍历它们。

```tsx{2-3}
<div>
  <div>foo</div>
  <div>bar</div>
  <div>{dynamic.value}</div>
</div>
```

在这个例子里，只有 `dynamic` 所在的片段需要参与更新；静态节点会在初次挂载后尽量复用。

### Patch 标记与精准更新 {#patch-flags}

对于有动态绑定的节点，编译器会把“究竟什么会变”编码进产物，例如文本、class、style、属性或稳定片段。运行时据此直接走对应的更新路径。

```tsx
<div class={active.value ? 'active' : ''}></div>
<input id={id.value} value={value.value} />
<div>{dynamic.value}</div>
```

这类提示让运行时可以把更新收敛为“改 class”“改 value”“改 text”这样的定点操作。

### 编译组件更新与根替换 {#compiled-component-updates}

编译器生成的组件 helper 会把组件标记为 fine-grained。首次挂载后，运行时保留同一个组件实例和响应式只读 props；父组件传入新 props 时只同步这层 props，组件内部已经建立的文本、属性、列表和子组件 effect 会各自更新。没有显式 render-effect 标记时，props 更新不会重新执行组件函数，也不会递归 patch 组件返回的整棵 Element / Fragment 树。

根替换仍然是必要的动态边界，而不是常规 props 更新手段。组件身份或 key 改变、动态分支切换到不同根、锚点区间需要替换，或者组件显式声明组件级响应式控制流时，运行时会通过已有 anchor / range 完成替换和清理。这样保留了结构变化的正确性，同时让稳定组件的日常更新停留在局部 effect。

应用不会直接进入通用 Element / Fragment patch。需要组件身份切换、根替换或不透明 renderable 时，编译器会生成对应的动态挂载协议，并只加载该能力需要的运行时层。

### 树扁平化与区间更新 {#tree-flattening}

编译器会把真正可能变化的后代节点提取出来，以 block 或区间边界的方式组织。这样组件更新时，运行时通常只需要遍历动态段，而不是重新访问整个静态子树。

遇到 `v-if`、`v-for`、`Teleport`、`Transition` 之类结构性边界时，Rue 会把它们当作独立的 block / range 处理，并通过锚点定位插入、移动和清理范围。
