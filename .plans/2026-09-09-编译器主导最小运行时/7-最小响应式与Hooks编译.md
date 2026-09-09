# 任务 7: 最小响应式与 Hooks 编译

批次：【批次 7】 依赖批次：依赖批次 6

状态：未开始

目的：让 compiled 路径只保留 signal/effect/owner/scheduler 必需原语，删除 reactive facade 与运行时 hook 对象。

来源任务：任务 6

预计会话范围：重写响应式入口和 hook codegen；保留经真实用例证明必要的语义，不兼容旧运行时对象 API。

## 文件

- 修改：`packages/swc-plugin-rue/src/pre/on_setup.rs`
- 修改：`packages/swc-plugin-rue/src/pre/side_effect.rs`
- 修改：`packages/swc-plugin-rue/src/reactive_provenance.rs`
- 修改：`packages/runtime/src/runtime-core/compiled.ts`
- 修改：`packages/runtime/src/reactive-core/index.ts`
- 修改：`packages/runtime/src/compiler-runtime/hooks.ts`
- 修改：`packages/runtime/src/internal-reactive.ts`
- 删除：`packages/runtime/src/runtime-core/js-reactive/facade.ts`
- 删除：`packages/runtime/src/runtime-core/reactive.shared.ts`

## 上下文

- 当前 `createReactiveFacade` 构造 watch、hooks、debug registry 和兼容 wrapper，单模块 rendered 约 20 KB。
- 编译器应把 useState/useEffect/computed/watch 的调用绑定为精确原语；不再创建 facade.default/facade.hooks 聚合对象。

## 测试计划

- 行为：state、computed、effect cleanup、batch、owner scope、watch 与生命周期在精确导入下保持语义。
- 失败验证测试：compiled fixture 不得导入 facade、js-reactive/hooks 或 reactive.shared。
- 失败验证命令：`pnpm exec vitest run --project unit-jsdom packages/runtime/__tests__/compiledUseStateReactCompat.spec.tsx packages/runtime/__tests__/compiledUseEffectDependencies.spec.tsx packages/runtime/__tests__/compiled-watch.spec.ts packages/runtime/__tests__/compiledHookScope.spec.ts`
- 预期失败原因：当前公开调用仍经聚合 facade/hook layer。
- 通过验证命令：同上，并运行 reactive provenance 与 setup/effect 编译器测试。
- 模拟策略：真实 scheduler 与 microtask，不 mock 响应式内核。

## 步骤

1. 统计上述行为实际需要的 kernel 原语并先写禁止导入测试。
2. 编译 hooks 为 owner slot 和原语调用，不生成运行时 hooks 表。
3. 合并重复的 compiled/reactive-core 包装层，只保留单一实现。
4. 删除 facade、reactive.shared 及仅为兼容对象 API存在的 values/context 包装。
5. 对未支持的动态 hook 调用给出编译错误。

## 验证

- 运行：`pnpm --filter @rue-js/swc-plugin-rue test`
- 运行：失败验证命令。
- 运行：`node scripts/compiler-only-runtime-audit.js --scenario reactive-text --scenario component --check`
- 预期：行为通过且 compiled 场景不含 facade 路径。
- 所需证据：红绿测试、剩余 kernel 模块、体积、删除文件和 diff。

## 完成

公开响应式 API允许由编译器改写；不得为手写未编译调用保留 facade。
