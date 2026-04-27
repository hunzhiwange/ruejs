# 第七阶段：把仓库里的用户态函数组件全面切到原生 Web Components 协议

当前 runtime 已经具备一套最小但可用的 custom elements 能力：`useCustomElement()`、宿主 `CustomEvent` 桥接、`useHost()` / `useShadowRoot()`、shadow DOM 原生 slot 投影、以及基于响应式 props 容器的细粒度更新都已经存在。这说明“Rue 组件可以跑在原生 custom element 宿主里”已经不是概念验证问题。

真正还没打通的是编译链路与仓库迁移链路。现在 `packages/swc-plugin-rue` 只会把 JSX 函数组件编译成 Rue 自己的组件协议和 `renderAnchor()` 路径；它还不会把组件声明包装为 `useCustomElement()` 构造器，也不会把调用侧的 `<Foo />` 消费改写成原生 custom element 标签、属性、slot 和事件监听协议。

如果这一阶段的目标是“全部原生组件改造”，那就不能只停留在 runtime 有一个手写 demo。必须同时完成以下几层：

1. 定义编译模式、tag 命名、注册策略与豁免边界。
2. 把 runtime custom-elements 契约补到能承接编译产物，而不是只承接手写 demo。
3. 在 swc 插件里新增定义侧包装，把函数组件导出为 custom element 构造器。
4. 在 swc 插件里新增调用侧降级，把组件消费改成原生标签、宿主属性、slot 与事件协议。
5. 对仓库内组件做迁移盘点，给出白名单 / 黑名单 / 暂缓清单，而不是模糊说“全部改”。
6. 把类型、HMR、测试矩阵、文档与发布口径一起收口。

## 当前盘点

1. `packages/runtime/src/custom-elements.ts` 已具备最小可用包装器，但仍偏 runtime 手工接入视角，还没有面向编译器产物冻结稳定协议。
2. `packages/runtime/src/rue.ts` 的 `emitted(props)` 已能桥接宿主 `CustomEvent`，说明事件层具备 native custom element 语义基础。
3. `packages/swc-plugin-rue/src/lib.rs` 当前只解析 `{ vapor: boolean }`，没有任何 compile-to-custom-element 配置入口。
4. `packages/swc-plugin-rue/src/imports.rs` 目前的 runtime helper 注入集合里没有 `useCustomElement`。
5. `packages/swc-plugin-rue/src/elements.rs` / `element_component.rs` 仍把大写标签统一走 Rue 组件分支，核心消费协议还是 `renderAnchor()`。
6. 仓库里目前只有手写 custom elements demo 与文档，没有“组件默认按 native custom element 协议产出并消费”的全链路约束。

## 当前进度

1. [1.md](./1.md)：定义 compile-to-custom-element 模式、tag 命名与注册协议。
2. [2.md](./2.md)：补齐 runtime custom-elements 契约，让编译产物可以稳定依赖。
3. [3.md](./3.md)：实现定义侧编译，把函数组件声明包装成 custom element 构造器。
4. [4.md](./4.md)：实现调用侧降级，把 `<Foo />` 消费链路切到原生标签协议。
5. [5.md](./5.md)：完成仓库组件迁移盘点、白名单豁免与 app/examples 落地。
6. [6.md](./6.md)：完成类型、HMR、测试矩阵、文档与发布收口。

## 执行顺序

1. 先完成 [1.md](./1.md)，否则后面的编译与迁移没有统一目标，不知道什么组件该转、怎么命名、何时注册。
2. 再完成 [2.md](./2.md)，先把 runtime custom element 契约定稳，避免编译器一边产出，runtime 一边再改输入协议。
3. 接着推进 [3.md](./3.md)，先打通“定义侧变成 custom element 构造器”的最小闭环。
4. 然后推进 [4.md](./4.md)，把消费侧 `<Foo />` 改成真正的原生标签宿主协议，这一步完成后才谈得上“全部原生组件改造”。
5. 再执行 [5.md](./5.md)，对仓库里的业务组件、框架控制组件和示例站点进行迁移与豁免分类。
6. 最后用 [6.md](./6.md) 收口类型、HMR、测试、文档与发布口径，避免只在 source 层“看起来能跑”。

## 阶段边界

1. 这一阶段的“全部组件”默认指用户态函数组件与普通业务组件，不把 DOM intrinsic、浏览器内建标签混入范围。
2. `Teleport`、`Transition`、`TransitionGroup`、路由视图一类框架控制组件不能默认按普通 custom element 对待，必须单独评估或明确豁免。
3. 不允许只做“定义侧包装”就宣称完成；如果调用侧仍然走 `renderAnchor()`，那只是新增了一种导出形态，不是 repo-level native component 改造。
4. 不允许把复杂 props 全部退化成 JSON 字符串 attribute；复杂值必须保留宿主属性或 `el.props` 这条 native custom element 友好协议。
5. 不允许把 `props.children` 语义和原生 slot 分发混为一谈；必须明确哪些组件需要改模板、哪些组件必须列入豁免。
6. 不在 source 与测试还没稳定前就宣传“所有组件都能原生 custom element 化”；发布口径必须晚于验证口径。

## 完成定义

1. swc 插件已经有稳定的 compile-to-custom-element 配置入口、tag 命名策略和注册策略。
2. runtime custom-elements 契约已经冻结到编译产物可以稳定依赖，包括 props、事件、slot、styles、hooks 与宿主生命周期。
3. 经过 opt-in 的函数组件定义可以直接编译成 `useCustomElement()` 构造器导出。
4. 经过 opt-in 的组件消费点不再走 Rue 组件分支，而是走原生 custom element 标签、宿主属性和事件监听协议。
5. 仓库内组件已经有明确的迁移清单：哪些已切、哪些保留 Rue 原协议、哪些属于框架控制白名单。
6. 类型、HMR、测试矩阵、文档和发布说明都已对齐“原生 Web Components 改造”口径。

## 推荐验证

1. `cargo check -p swc_plugin_rue`
2. `cargo test -p swc_plugin_rue`
3. `pnpm vitest run packages/runtime/__tests__/custom-elements.spec.tsx packages/runtime/__tests__/rue.event.spec.tsx packages/runtime/__tests__/compat-entry.spec.ts`
4. `pnpm check`
5. `pnpm app-build`
6. 对新增 fixture / app demo 做一次浏览器 smoke test，确认自定义元素注册、slot 投影、复杂 props 和事件桥接都按预期工作。
