# 任务 3: 编译静态 DOM 与定点更新

批次：【批次 3】 依赖批次：依赖批次 2

状态：未开始

目的：让元素、属性、事件和表单状态编译为直接 DOM 指令，移除通用 DOM patch 需求。

来源任务：任务 2

预计会话范围：聚焦元素与属性 codegen 及最小 DOM helper，不处理分支、列表或组件。

## 文件

- 修改：`packages/swc-plugin-rue/src/attrs.rs`
- 修改：`packages/swc-plugin-rue/src/element_node.rs`
- 修改：`packages/swc-plugin-rue/src/element_text.rs`
- 修改：`packages/swc-plugin-rue/src/pre/model_directive.rs`
- 修改：`packages/swc-plugin-rue/src/pre/on_directive.rs`
- 修改：`packages/runtime/src/compiler-runtime/dom.browser.ts`
- 修改：`packages/runtime/src/compiled-dom-bindings.ts`
- 测试：`packages/swc-plugin-rue/src/attrs_tests.rs`
- 测试：`packages/runtime/__tests__/compiledDomBindings.spec.tsx`

## 上下文

- 静态属性应进入模板或一次性赋值；动态 class/style/property/text 各自生成定点 effect。
- 只有不可静态枚举的 spread 允许使用小型 previous-key 更新器；禁止引入虚拟节点或通用 props diff。

## 测试计划

- 行为：编译产物对已知节点直接更新目标字段，不调用通用 setAttribute/patchStyle/patchChildren。
- 失败验证测试：覆盖 HTML/SVG、布尔属性、value/checked、class/style、事件修饰符、动态 spread 删除键。
- 失败验证命令：`pnpm --filter @rue-js/swc-plugin-rue test && pnpm exec vitest run --project unit-jsdom packages/runtime/__tests__/compiledDomBindings.spec.tsx packages/runtime/__tests__/nativeControlledInput.actual.spec.tsx`
- 预期失败原因：当前生成代码仍调用 legacy DOM 与通用属性处理。
- 通过验证命令：同上。
- 模拟策略：真实 SWC 编译后在 jsdom 操作真实节点。

## 步骤

1. 为每类绑定添加生成源码失败快照与浏览器行为测试。
2. 静态结构优先生成模板 clone；小结构允许直接 createElement。
3. 动态字段生成字段专用 setter 和 effect，事件采用委托表。
4. 将 `v-model` 编译为明确 property/event 对，不经运行时指令分派。
5. 让本任务场景不再引用 legacy DOM helper 和通用 patch。

## 验证

- 运行：失败验证命令。
- 运行：`pnpm exec vitest run --project unit packages/runtime/__tests__/compiler-runtime.compact-dom.spec.ts`
- 预期：行为通过，生成代码无通用 patch token，static/reactive-text 体积达到任务 1 目标。
- 所需证据：红绿测试、DOM 前后值、生成代码片段、模块清单和体积。

## 完成

不得用新的万能 `patchProp` 替换旧实现；动态 spread helper 必须独立场景计量。
