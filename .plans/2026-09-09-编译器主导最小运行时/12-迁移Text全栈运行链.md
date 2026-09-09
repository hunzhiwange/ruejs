# 任务 12: 迁移 Text 全栈运行链

批次：【批次 12】 依赖批次：依赖批次 11

状态：未开始

目的：将 Text 的浏览器路由、RSC、SSR、流式响应和 hydration 接入编译 writer/claim 协议。

来源任务：任务 11

预计会话范围：仅处理 `packages/text`；其全栈协议独立且测试面大，单独执行完整 unit 与聚焦 E2E。

## 文件

- 修改：`packages/text/src/**`
- 测试：`packages/text/__tests__/app-browser-entry.test.ts`
- 测试：`packages/text/__tests__/app-ssr-entry.test.ts`
- 测试：`packages/text/__tests__/app-rsc-ssr-payload-protocol.test.ts`
- 测试：`packages/text/__tests__/slot-browser-hydration.test.ts`

## 上下文

- Text 不得保留 app fallback renderer、旧 SSR renderable normalization 或客户端 full-render recovery。
- RSC wire protocol 可保留数据协议，但最终 UI 必须落到编译 ComponentFactory/claim 指令。

## 测试计划

- 行为：浏览器导航、RSC payload、SSR streaming、server action 后刷新和 hydration 在新 ABI 下工作。
- 失败验证测试：旧 fallback renderer/import 扫描和上述协议测试。
- 失败验证命令：`pnpm exec vitest run --project unit packages/text/__tests__`
- 预期失败原因：Text 仍调用旧 runtime render/SSR/hydration 路径。
- 通过验证命令：同上，加 app-router hydration/navigation/SSR 聚焦 E2E。
- 模拟策略：沿用现有请求/MSW 边界；编译、writer 和 claim 使用真实实现。

## 步骤

1. 建立 Text 旧运行时依赖清单和失败扫描。
2. 迁移服务端页面执行到 SSR writer factory。
3. 迁移浏览器 payload 落地到 compiled mount/claim。
4. 删除 fallback renderer 和兼容 payload→renderable 转换。
5. 运行 unit 与 hydration/navigation/SSR E2E。

## 验证

- 运行：`pnpm exec vitest run --project unit packages/text/__tests__`
- 运行：Text app-router hydration、navigation、SSR 的现有 Playwright 配置命令。
- 预期：协议与 E2E 通过，旧 runtime 调用为零。
- 所需证据：测试数量、E2E 场景、旧符号零命中和构建输出。

## 完成

不得用 Text 私有 renderer 绕过核心编译 ABI。
