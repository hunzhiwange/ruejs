# 任务 9: 迁移 Store 与运行时消费者

批次：【批次 9】 依赖批次 8

状态：未开始

目的：将 Store 包和 runtime 内部的 reactive 对象状态改成显式 Signal 路径操作，并移除 Store 自身的状态门面 Proxy。

来源任务：无

预计会话范围：聚焦 `packages/store` 与 runtime 内部消费者，不修改 app 示例或文档。

## 文件

- 修改：`packages/store/src/index.ts`
- 修改：`packages/store/__tests__/store.spec.ts`
- 修改：`packages/runtime/src/reactivity/index.ts`
- 修改：`packages/runtime/src/custom-elements.ts`
- 修改：`packages/runtime/src/components/Slot.ts`
- 修改：`packages/runtime/src/compiled-render-anchor.ts`
- 修改：`packages/runtime/__tests__/vaporKeyedList.proxyDrift.spec.ts`
- 修改：`packages/runtime/__tests__/vaporEntry.interop.spec.tsx`
- 修改：`packages/runtime/__tests__/isRef.spec.ts`
- 删除：`packages/runtime/__tests__/isReadonly.spec.ts`
- 删除：`packages/runtime/__tests__/toRef.spec.ts`
- 删除：`packages/runtime/__tests__/toRefs.spec.ts`
- 删除：`packages/runtime/__tests__/isProxy.spec.ts`

## 上下文

- Store 对外改为显式 `get/getPath/set/update/mutatePath/subscribe` 能力；删除 `stateFacade` Proxy 和 `dynamicStateTarget` reactive 包装。
- 删除只验证旧 Proxy API 的测试；保留并重写实际业务行为、订阅精度、列表更新和释放测试。

## 测试计划

- 行为：Store 读写、订阅、action、列表和批处理完全基于统一 Graph，状态门面不再是 Proxy。
- 失败验证测试：先把 Store 和 Vapor drift 用例改写为新显式 API，并增加单图/精确触发断言。
- 失败验证命令：`pnpm exec vitest run packages/store/__tests__/store.spec.ts --project unit && pnpm exec vitest run packages/runtime/__tests__/vaporKeyedList.proxyDrift.spec.ts --project unit-jsdom`
- 预期失败原因：生产 Store 仍返回/依赖 Proxy，尚不提供新显式路径能力。
- 通过验证命令：分别运行 Store 的 unit 项目和 Runtime 的 unit-jsdom 项目，并加入 Vapor interop 测试。
- 模拟策略：真实 Store、Runtime 和 DOM，无 mock。

## 步骤

1. 将业务测试先切到新 Store contract 并确认失败。
2. 重构 Store 根状态和 action 写入为 Signal 路径 API。
3. 删除 Store Proxy facade、raw 解包和 reactive 检测分支。
4. 迁移 runtime 内部消费者及删除旧工具测试。
5. 运行 Store、Vapor 列表、interop 和内存释放检查。

## 验证

- 运行：`pnpm exec vitest run packages/store/__tests__/store.spec.ts packages/store/__tests__/storeApp.spec.tsx --project unit`
- 运行：`pnpm exec vitest run packages/runtime/__tests__/vaporKeyedList.proxyDrift.spec.ts packages/runtime/__tests__/vaporEntry.interop.spec.tsx --project unit-jsdom`
- 运行：`rg -n '\bnew\s+Proxy\b|\breactive\s*\(' packages/store/src packages/runtime/src`
- 预期：测试退出码 0；扫描结果只允许 plan 范围外的非响应式 Proxy，并逐条记录原因。
- 所需证据：红绿测试、Store API 差异、精确触发计数、扫描清单和 Graph 释放统计。

## 完成

Store 与 runtime 内部不再依赖响应式 Proxy，旧 API 测试已删除或改为真实业务测试后删除任务文件。
