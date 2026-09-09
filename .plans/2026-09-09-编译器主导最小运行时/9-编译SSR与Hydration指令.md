# 任务 9: 编译 SSR 与 Hydration 指令

批次：【批次 9】 依赖批次：依赖批次 8

状态：未开始

目的：让服务端输出和客户端认领共享编译期节点计划，删除通用服务端 renderer 与 hydration render fallback。

来源任务：任务 8

预计会话范围：重写 SWC server/hydrate codegen、SSR writer 和 claim runtime；Island loader 后续迁移。

## 文件

- 修改：`packages/swc-plugin-rue/src/server.rs`
- 修改：`packages/swc-plugin-rue/src/hydrate.rs`
- 新建：`packages/runtime/src/compiler-runtime/ssr-writer.ts`
- 新建：`packages/runtime/src/compiler-runtime/hydrate-claim.ts`
- 修改：`packages/runtime/src/server.ts`
- 修改：`packages/runtime/src/island.ts`
- 修改：`packages/server-renderer/src/index.ts`
- 测试：`packages/server-renderer/__tests__/server-renderer.spec.tsx`
- 测试：`packages/runtime/__tests__/island.spec.tsx`

## 上下文

- 当前 hydrateRoot 会在多种 adoption 失败后调用通用 render，且 Island runtime 同时承担 manifest、调度与节点 walker。
- 新编译产物必须生成稳定 marker/claim 序列；结构不匹配时明确报错，不静默整树重绘。

## 测试计划

- 行为：HTML/SVG、文本、属性、分支、列表、组件、builtin 的 SSR 输出能被对应 claim 指令恢复并绑定响应式更新。
- 失败验证测试：断言 hydration 产物不导入 dom.js、js-runtime mount/patch、通用 render 或 server renderable normalization。
- 失败验证命令：`pnpm exec vitest run --project unit packages/server-renderer/__tests__ && pnpm exec vitest run --project unit-jsdom packages/runtime/__tests__/island.spec.tsx packages/runtime/__tests__/dom.browser-hot-path.spec.ts`
- 预期失败原因：现有 SSR/hydration 使用通用值协议与 fallback。
- 通过验证命令：同上，并运行 SWC server/hydrate 测试。
- 模拟策略：真实字符串输出和 jsdom claim；动态 import loader 可在 Island 专项测试中模拟模块边界。

## 步骤

1. 定义客户端/服务端共享的编译期节点编号与 marker 规则。
2. SSR 生成直接 writer 调用，禁止运行时递归判断 RenderInput。
3. hydration 生成线性 claim 与事件/响应式绑定指令。
4. 删除 renderer adoption 与 full render fallback；结构错误抛出含节点路径的诊断。
5. 将 Island manifest/调度与 root claim 分离，hydrate 私有入口只导入 claim runtime。

## 验证

- 运行：`pnpm --filter @rue-js/swc-plugin-rue test`
- 运行：失败验证命令。
- 运行：`node scripts/compiler-only-runtime-audit.js --scenario hydrate --check`
- 预期：SSR/runtime 测试通过，hydrate ≤25 KB gzip 且无禁止模块。
- 所需证据：红绿测试、服务端/客户端 marker 对照、错误诊断、依赖图和体积。

## 完成

不得以保留旧 fallback 通过边缘用例；未能静态编译的结构应在构建期拒绝。
