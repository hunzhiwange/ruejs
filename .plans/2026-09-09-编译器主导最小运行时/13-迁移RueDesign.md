# 任务 13: 迁移 Rue Design

批次：【批次 13】 依赖批次：依赖批次 12

状态：未开始

目的：将设计系统复杂 children、compound component 和动态内容全部改为可编译的 branch/slot/data 协议。

来源任务：任务 12

预计会话范围：仅迁移 `packages/rue-design` 及其单元测试，核心 ABI 不再变动。

## 文件

- 修改：`packages/rue-design/src/components/**`
- 修改：`packages/rue-design/src/index.ts`
- 测试：`packages/rue-design/src/components/**/__tests__/*.spec.tsx`

## 上下文

- Form、Table、Tree、Select 等当前存在 children 遍历、runtime patch 或动态 component 模式；应改为编译期 slot 或显式 items/schema。
- 不允许新增设计系统私有 renderable/patch 层。

## 测试计划

- 行为：全部组件单测通过，compound children、表单控制、列表、overlay 和 transition 使用 compiler-only ABI。
- 失败验证测试：设计系统生产源码旧 helper 扫描与代表性复杂组件测试。
- 失败验证命令：`pnpm exec vitest run --project unit-jsdom packages/rue-design/src`
- 预期失败原因：现有复杂组件仍操作任意 JSX 值或旧 helper。
- 通过验证命令：同上，并构建 rue-design。
- 模拟策略：真实编译和 jsdom；保留现有 timer/observer mock。

## 步骤

1. 按旧符号和编译诊断分组组件。
2. 先迁移 compound children 为静态 slot/schema。
3. 再迁移表单、列表和 overlay 动态路径。
4. 删除局部 runtime patch/renderable 工具。
5. 全量运行设计系统测试并确认旧调用为零。

## 验证

- 运行：失败验证命令。
- 运行：rue-design 生产构建命令。
- 预期：组件测试/构建通过，旧符号零命中。
- 所需证据：迁移组件数量、测试总数、构建体积和扫描结果。

## 完成

无法静态表达的 API 应破坏性改为显式数据模型，不保留旧 children 兼容。
