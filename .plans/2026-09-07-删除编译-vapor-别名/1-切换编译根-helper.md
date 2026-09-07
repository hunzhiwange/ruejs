# 任务 1: 切换编译根 helper

批次：【批次 1】 无

状态：未开始

目的：让所有 SWC JSX 降级路径生成 `_$compiledRoot(...)`，并取消 `vapor` 对模块 runtime tier 的提升。

来源任务：无

预计会话范围：聚焦 Rust 编译器的 AST 生成、能力表和对应快照式断言；不修改 TypeScript 运行时实现。

## 文件

- 修改：`packages/swc-plugin-rue/src/compiled_capabilities.rs`
- 修改：`packages/swc-plugin-rue/src/element_component.rs`
- 修改：`packages/swc-plugin-rue/src/element_expr.rs`
- 修改：`packages/swc-plugin-rue/src/element_list.rs`
- 修改：`packages/swc-plugin-rue/src/vapor/visitor.rs`
- 修改：`packages/swc-plugin-rue/src/vapor/block/expr.rs`
- 测试：`packages/swc-plugin-rue/src/compiled_capabilities_tests.rs`
- 测试：`packages/swc-plugin-rue/src/imports_tests.rs`
- 测试：`packages/swc-plugin-rue/src/vapor/visitor_tests.rs`
- 测试：`packages/swc-plugin-rue/src/element_expr_tests.rs`
- 测试：`packages/swc-plugin-rue/src/element_component_tests.rs`
- 测试：`packages/swc-plugin-rue/src/lib_tests.rs`

## 上下文

- `vapor(factory)` 仅转发到 `_$compiledRoot(factory)`。所有 `call_ident("vapor", ...)`、识别 wrapper 的逻辑和生成结果断言需要一致迁移；不能改变 factory 的 parent 参数及生成块内容。

## 测试计划

- 行为：包含非静态 JSX 的编译结果使用 `_$compiledRoot`，且纯编译能力不再被路由到 `internal/component`。
- 失败验证测试：更新或新增 imports/visitor 测试，断言输出包含 `_$compiledRoot`、不包含 `vapor(`，并从 `@rue-js/rue/internal/compiler` 导入。
- 失败验证命令：`pnpm --filter @rue-js/swc-plugin-rue test -- ensure_runtime_imports_injects_vapor_owned_list_effect_and_reconcile_in_mixed_modules`
- 预期失败原因：生产代码仍生成和分层 `vapor`，新断言无法成立。
- 通过验证命令：`pnpm --filter @rue-js/swc-plugin-rue test`
- 模拟策略：直接转换真实 SWC AST 并检查生成模块，不使用 mock。

## 步骤

1. 先把代表性编译与导入路由测试改为 `_$compiledRoot` 契约，确认失败。
2. 将所有编译器生成 `vapor` wrapper 的位置统一改为 `_$compiledRoot`，同步 wrapper 识别逻辑。
3. 从能力表移除编译期 `vapor`，保持 `_$compiledRoot` 为 compiled tier 且在 Vapor 模块中仍可用。
4. 机械更新受影响的 Rust 测试期望与注释，只调整同一生成契约。
5. 运行完整插件测试并检查无生成的 `vapor(` 残留。

## 验证

- 运行：`pnpm --filter @rue-js/swc-plugin-rue test`
- 预期：Cargo 测试退出码 0；编译产物相关断言全部通过。
- 所需证据：记录失败验证的测试名与断言差异、通过时测试数量和退出码；`rg -n 'call_ident\("vapor"|auto_capability\("vapor"' packages/swc-plugin-rue/src` 无结果。

## 完成

只有当上述 Rust 源码与测试统一使用 `_$compiledRoot`、完整插件测试通过且生成路径不再引用 `vapor` 时，任务才可标记为已完成。
