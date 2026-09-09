# 任务 4: 闭合 Block 与控制流

批次：【批次 4】 依赖批次：依赖批次 3

状态：未开始

目的：用编译期已知的节点区间与 dispose 闭包替代万能 CompiledRootHandle、值分类和分支扫描。

来源任务：任务 3

预计会话范围：处理 root、fragment、if/三元与动态文本边界；列表和组件留给后续任务。

## 文件

- 修改：`packages/swc-plugin-rue/src/element_expr.rs`
- 修改：`packages/swc-plugin-rue/src/element_fragment.rs`
- 修改：`packages/swc-plugin-rue/src/pre/if_directive.rs`
- 修改：`packages/runtime/src/compiled-root.ts`
- 修改：`packages/runtime/src/compiled-component.ts`
- 新建：`packages/runtime/src/compiler-runtime/block.ts`
- 测试：`packages/runtime/__tests__/compiledRenderBoundary.spec.tsx`
- 测试：`packages/runtime/__tests__/compiledReactiveBranches.spec.tsx`

## 上下文

- 当前 root 通过 mountable/clone/全量 childNodes 差集兼容未知返回值；branch 还保存 focus 并接受通用 handle。
- 新 Block ABI 必须是 closed：编译器提供 first/last、mount、dispose 和可选 update，不运行时判断任意值类型。

## 测试计划

- 行为：静态根和条件分支只操作已知节点区间，替换、focus、清理与 owner 生命周期正确。
- 失败验证测试：断言生成产物不含 `__rue_compiled_mountable`、clone、childNodes 差集或 `renderAnchor`。
- 失败验证命令：`pnpm exec vitest run --project unit-jsdom packages/runtime/__tests__/compiledRoot.spec.ts packages/runtime/__tests__/compiledReactiveBranches.spec.tsx packages/runtime/__tests__/compiledRenderBoundary.spec.tsx`
- 预期失败原因：现有 CompiledRootHandle 和 branch 依赖通用返回值协议。
- 通过验证命令：同上，并运行 SWC element expression/fragment/if 测试。
- 模拟策略：真实 DOM、真实 owner/effect。

## 步骤

1. 定义定长 BlockRecord 或闭包 ABI，拒绝 unknown renderable。
2. 修改编译器直接登记 root 节点和清理函数。
3. 条件分支生成专用选择器和已知 mount factory。
4. 删除 root clone、mountable、插入节点扫描和任意对象识别。
5. 证明 `compiled-render-anchor` 不再服务静态根与普通分支。

## 验证

- 运行：`pnpm --filter @rue-js/swc-plugin-rue test`
- 运行：失败验证命令。
- 预期：分支行为通过且相关产物只依赖 block、dom、reactive 最小入口。
- 所需证据：失败与通过、ABI 快照、依赖图、泄漏检查与体积差。

## 完成

不保留旧 CompiledRootHandle 转换器；调用点必须在本任务内迁移到 closed block。
