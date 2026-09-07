# 任务 7: 移除编译 Props 代理

批次：【批次 7】 依赖批次 6

状态：未开始

目的：把 compiled props 的键读取和结构观察改成显式控制器与编译 helper，删除 props 热路径 Proxy。

来源任务：无

预计会话范围：聚焦 compiled props controller、组件 ABI 和 props 成员编译；不处理公共 reactive API。

## 文件

- 修改：`packages/runtime/src/compiled-props.ts`
- 修改：`packages/runtime/src/compiled-component-call.ts`
- 修改：`packages/runtime/src/compiler-internal.ts`
- 修改：`packages/runtime/__tests__/compiledProps.prototype.spec.ts`
- 新建：`packages/runtime/__tests__/compiledProps.direct-access.spec.tsx`
- 修改：`packages/swc-plugin-rue/src/reactive_provenance.rs`
- 修改：`packages/swc-plugin-rue/src/element_component.rs`
- 修改：`packages/swc-plugin-rue/src/attrs.rs`
- 修改：`packages/swc-plugin-rue/src/imports.rs`
- 修改：`packages/swc-plugin-rue/src/compiled_capabilities.rs`
- 修改：`packages/swc-plugin-rue/src/element_component_tests.rs`
- 修改：`packages/swc-plugin-rue/src/attrs_tests.rs`

## 上下文

- controller 提供 `get(key)`、`has(key)`、`keys()` 和 `snapshot()`；静态 props 读取编译为键级 get。
- rest/spread/动态 key 显式取快照或 keys 依赖；不维持 Proxy 的 descriptor/prototype 假象。

## 测试计划

- 行为：单个 prop 更新只触发读取该键的消费者，新增/删除键触发结构消费者，产物无 props Proxy。
- 失败验证测试：新增静态键、动态键、rest、spread、删除键和 prototype 输入的真实组件测试。
- 失败验证命令：`pnpm exec vitest run packages/runtime/__tests__/compiledProps.direct-access.spec.tsx --project unit-jsdom && cargo test --manifest-path packages/swc-plugin-rue/Cargo.toml compiled_props`
- 预期失败原因：`createCompiledProps` 当前返回 `new Proxy`，编译输出直接读取对象属性。
- 通过验证命令：同失败验证命令。
- 模拟策略：真实组件更新与 SWC 输出，无 mock。

## 步骤

1. 建立键级与结构依赖的失败测试。
2. 将 props controller 改为显式读取 API，保留完整 snapshot 仅给动态场景。
3. 编译静态 props 成员、has、rest/spread 到对应 helper。
4. 删除 props Proxy 和 descriptor invariant 代码。
5. 运行组件、attrs、slot 和 SSR 相邻测试。

## 验证

- 运行：`pnpm exec vitest run packages/runtime/__tests__/compiledProps.prototype.spec.ts packages/runtime/__tests__/compiledProps.direct-access.spec.tsx packages/runtime/__tests__/component.renderable.spec.tsx --project unit-jsdom`
- 运行：`cargo test --manifest-path packages/swc-plugin-rue/Cargo.toml attrs && cargo test --manifest-path packages/swc-plugin-rue/Cargo.toml element_component`
- 预期：退出码 0；静态键精确触发；相关产物不含 `new Proxy`。
- 所需证据：红绿测试、编译输出、触发计数、Proxy 文本扫描结果。

## 完成

compiled props 的所有已支持读取形态均不依赖 Proxy 后删除任务文件。

