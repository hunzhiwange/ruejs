# 任务 8: 删除响应式 Proxy 公共面

批次：【批次 8】 依赖批次 7

状态：未开始

目的：删除运行时响应式 Proxy、JS facade 中的 Proxy 族 API 和对应类型，只保留 Signal/Effect/Computed/Watch 核心。

来源任务：无

预计会话范围：仅清理 `packages/runtime` 与 `packages/rue` 公共/内部导出和核心测试；生态调用由后续任务迁移。

## 文件

- 删除：`packages/runtime/src/runtime-core/reactive-kernel/reactive.ts`
- 新建：`packages/runtime/src/runtime-core/reactive-kernel/ref.ts`
- 删除：`packages/runtime/src/compiled-reactive-compat.ts`
- 修改：`packages/runtime/src/runtime-core/reactive-kernel/index.ts`
- 修改：`packages/runtime/src/runtime-core/reactive.shared.ts`
- 修改：`packages/runtime/src/runtime-core/js-reactive/facade.ts`
- 修改：`packages/runtime/src/runtime-core/js-reactive/hooks/values.ts`
- 修改：`packages/runtime/src/runtime-core/js-reactive/types.ts`
- 修改：`packages/runtime/src/public/reactivity.ts`
- 修改：`packages/runtime/src/compiler-runtime/hooks.ts`
- 修改：`packages/runtime/src/compiler-runtime/compact-reactivity.ts`
- 修改：`packages/rue/src/index.ts`
- 修改：`packages/rue/src/index.d.ts`
- 修改：`packages/rue/src/internal.ts`
- 修改：`packages/swc-plugin-rue/src/compiled_capabilities.rs`
- 修改：`packages/swc-plugin-rue/src/compiled_capabilities_tests.rs`
- 删除：`packages/runtime/__tests__/reactive-kernel.reactive-proxy.spec.ts`
- 修改：`packages/runtime/__tests__/reactive-kernel.contract.spec.ts`
- 修改：`packages/runtime/__tests__/runtime-architecture.spec.ts`

## 上下文

- 删除 Proxy API 是刻意破坏性变更，不添加 deprecated wrapper 或兼容开关。
- `ref`/`shallowRef` 可继续存在但必须直接基于 Signal；对象路径能力通过 SignalHandle 显式 API和编译 helper 暴露。

## 测试计划

- 行为：公共和 compiler bundle 均不包含响应式 `new Proxy`，已保留核心 API 行为通过，删除的导出在类型和运行时都不存在。
- 失败验证测试：更新 kernel contract，并新增公共导出/源码扫描测试。
- 失败验证命令：`pnpm exec vitest run packages/runtime/__tests__/reactive-kernel.contract.spec.ts packages/runtime/__tests__/runtime-architecture.spec.ts --project unit-jsdom`
- 预期失败原因：当前 contract 和公共入口仍要求 Proxy API，生产文件仍创建响应式 Proxy。
- 通过验证命令：同失败验证命令，并构建 runtime/rue 目标产物。
- 模拟策略：读取真实入口与构建类型，不 mock。

## 步骤

1. 先修改 contract 测试定义新公共面，并添加禁止 Proxy 生产路径测试。
2. 删除 reactive kernel Proxy 文件与 compat 模块，收缩 facade/types/hooks。
3. 将 ref/customRef/isReactive 等保留能力改为 Signal marker/类判断。
4. 更新 runtime/rue 公共导出与 d.ts，删除 SWC capability 中废弃 API。
5. 构建并运行 tree-shaking/size 审计，确认死模块未进入产物。

## 验证

- 运行：`pnpm exec vitest run packages/runtime/__tests__/reactive-kernel.contract.spec.ts packages/runtime/__tests__/runtime-architecture.spec.ts --project unit-jsdom`
- 运行：`node scripts/build.js runtime rue -f esm-bundler-runtime && pnpm run size:tree-shaking:check`
- 预期：命令退出码 0；公开类型无废弃 API；响应式核心和 compiler entry 无 `new Proxy`。
- 所需证据：失败/通过输出、删除导出列表、构建产物扫描、gzip/brotli 变化。

## 完成

确认没有兼容 wrapper、废弃类型或响应式 Proxy 生产代码后删除任务文件。
