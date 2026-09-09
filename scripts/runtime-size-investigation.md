# Runtime 发布体积调查

## 测量快照

- 日期：2026-09-09（Asia/Shanghai）
- Git HEAD：`ef564ef669c238971f053951e147b7922132f23e`
- 开始时工作区：干净；未发现相关重构继续写入
- Node：`v26.0.0`
- pnpm：`11.0.9`
- Vite：`8.2.2`
- `@swc/cli`：`0.8.1`
- `@swc/core`：`1.15.43`
- 构建命令：`node scripts/build.js '^shared$' '^runtime$' '^rue$' -f esm-bundler,esm-bundler-runtime -t`（退出码 0）
- 基线命令：`node scripts/runtime-size-audit.js --output scripts/runtime-size-refinement-baseline.json`（退出码 0）
- 重复命令：`node scripts/runtime-size-audit.js --output temp/size/refinement-repeat.json`（退出码 0）
- 稳定性：`cmp -s scripts/runtime-size-refinement-baseline.json temp/size/refinement-repeat.json`（退出码 0，报告逐字节一致）

审计使用 Vite production、`es2020` 和 SWC 压缩。入口不设置测量专用 alias，按 package exports 的 `module`、`browser`、`production` 条件解析；未设置 `moduleSideEffects: false`。

## 场景结果

| 场景               | 已解析入口                                |    raw |    min |  gzip | brotli |
| ------------------ | ----------------------------------------- | -----: | -----: | ----: | -----: |
| client-core        | `packages/rue/dist/compiler-internal.js`  |   8167 |   3026 |  1405 |   1286 |
| template-only      | `packages/rue/dist/compiler-internal.js`  |   4598 |   1949 |  1084 |    948 |
| compiled-component | `packages/rue/dist/component-internal.js` | 179158 |  70743 | 21505 |  19537 |
| compiled-list      | `packages/rue/dist/compiler-internal.js`  |  36275 |  13426 |  5293 |   4818 |
| compiled-builtins  | `packages/rue/dist/builtins-internal.js`  | 209246 |  82702 | 25295 |  22939 |
| teleport-only      | `packages/rue/dist/builtins-internal.js`  | 189496 |  72754 | 22122 |  20077 |
| transition-only    | `packages/rue/dist/builtins-internal.js`  | 194812 |  74904 | 22816 |  20704 |
| hydrate            | `packages/rue/dist/island.js`             | 370076 | 149753 | 44740 |  39344 |

所有入口均为当前模块化 dist；报告中的 `moduleRenderSizes` 只保留正 `renderedBytes`。

## 前十模块贡献

数值为 Rollup 未压缩 rendered bytes；不足十项的场景列出全部正贡献模块。

### client-core

1. `packages/runtime/dist/runtime-core/compiled.js` — 3353
2. `packages/runtime/dist/compiler-runtime/compact-root.js` — 2789
3. `packages/runtime/dist/compiler-runtime/dom.browser.js` — 867
4. `packages/runtime/dist/compiler-runtime/dom-host-operations.js` — 793
5. `packages/runtime/dist/runtime-core/reactive-kernel/shared-runtime.js` — 338

### template-only

1. `packages/runtime/dist/compiler-runtime/dom.browser.js` — 4080
2. `packages/runtime/dist/compiler-runtime/dom-host-operations.js` — 483

### compiled-component

1. `packages/runtime/dist/runtime-core/js-reactive/facade.js` — 20006
2. `packages/runtime/dist/compiled-render-anchor.js` — 16391
3. `packages/runtime/dist/compiled-component.js` — 15591
4. `packages/runtime/dist/runtime-core/reactive-kernel/signal.js` — 11617
5. `packages/runtime/dist/runtime-core/reactive-kernel/graph-core.js` — 9431
6. `packages/runtime/dist/runtime-core/reactive-kernel/effect-core.js` — 8577
7. `packages/runtime/dist/runtime-core/js-reactive/hooks/effect.js` — 5190
8. `packages/runtime/dist/island-protocol.js` — 4953
9. `packages/runtime/dist/runtime-core/js-reactive/hooks/computed.js` — 4859
10. `packages/runtime/dist/runtime-core/reactive-kernel/watch.js` — 4427

### compiled-list

1. `packages/runtime/dist/compiler-runtime/compact-keyed-list.js` — 10123
2. `packages/runtime/dist/runtime-core/reactive-kernel/graph-core.js` — 6747
3. `packages/runtime/dist/runtime-core/reactive-kernel/effect-core.js` — 4596
4. `packages/runtime/dist/runtime-core/compiled.js` — 4543
5. `packages/runtime/dist/runtime-core/reactive-kernel/scheduler-core.js` — 3248
6. `packages/runtime/dist/compiler-runtime/dom.browser.js` — 2184
7. `packages/runtime/dist/runtime-core/reactive-kernel/runtime-state-core.js` — 1723
8. `packages/runtime/dist/runtime-core/reactive-kernel/signal-base.js` — 1429
9. `packages/runtime/dist/compiler-runtime/dom-host-operations.js` — 1025
10. `packages/runtime/dist/runtime-core/reactive-kernel/shared-runtime.js` — 587

### compiled-builtins

1. `packages/runtime/dist/compiler-runtime/builtins/index.js` — 25309
2. `packages/runtime/dist/runtime-core/js-reactive/facade.js` — 20006
3. `packages/runtime/dist/compiled-render-anchor.js` — 16976
4. `packages/runtime/dist/compiled-component.js` — 15591
5. `packages/runtime/dist/runtime-core/reactive-kernel/signal.js` — 11617
6. `packages/runtime/dist/runtime-core/reactive-kernel/graph-core.js` — 9431
7. `packages/runtime/dist/runtime-core/reactive-kernel/effect-core.js` — 8577
8. `packages/runtime/dist/runtime-core/js-reactive/hooks/effect.js` — 5190
9. `packages/runtime/dist/island-protocol.js` — 4953
10. `packages/runtime/dist/runtime-core/js-reactive/hooks/computed.js` — 4859

### teleport-only

1. `packages/runtime/dist/runtime-core/js-reactive/facade.js` — 20006
2. `packages/runtime/dist/compiled-render-anchor.js` — 16976
3. `packages/runtime/dist/compiled-component.js` — 15591
4. `packages/runtime/dist/runtime-core/reactive-kernel/signal.js` — 11617
5. `packages/runtime/dist/runtime-core/reactive-kernel/graph-core.js` — 9431
6. `packages/runtime/dist/runtime-core/reactive-kernel/effect-core.js` — 8577
7. `packages/runtime/dist/compiler-runtime/builtins/index.js` — 6042
8. `packages/runtime/dist/runtime-core/js-reactive/hooks/effect.js` — 5190
9. `packages/runtime/dist/island-protocol.js` — 4953
10. `packages/runtime/dist/runtime-core/js-reactive/hooks/computed.js` — 4859

### transition-only

1. `packages/runtime/dist/runtime-core/js-reactive/facade.js` — 20006
2. `packages/runtime/dist/compiled-render-anchor.js` — 16976
3. `packages/runtime/dist/compiled-component.js` — 15591
4. `packages/runtime/dist/runtime-core/reactive-kernel/signal.js` — 11617
5. `packages/runtime/dist/compiler-runtime/builtins/index.js` — 11356
6. `packages/runtime/dist/runtime-core/reactive-kernel/graph-core.js` — 9431
7. `packages/runtime/dist/runtime-core/reactive-kernel/effect-core.js` — 8577
8. `packages/runtime/dist/runtime-core/js-reactive/hooks/effect.js` — 5190
9. `packages/runtime/dist/island-protocol.js` — 4953
10. `packages/runtime/dist/runtime-core/js-reactive/hooks/computed.js` — 4859

### hydrate

1. `packages/runtime/dist/dom.js` — 44210
2. `packages/runtime/dist/runtime-core/js-reactive/facade.js` — 20021
3. `packages/runtime/dist/island.js` — 20005
4. `packages/runtime/dist/compiled-render-anchor.js` — 16395
5. `packages/runtime/dist/compiled-component.js` — 15609
6. `packages/runtime/dist/runtime-core/reactive-kernel/signal.js` — 11622
7. `packages/runtime/dist/runtime-core/js-runtime/patch/component.js` — 10310
8. `packages/runtime/dist/runtime-core/reactive-kernel/graph-core.js` — 9431
9. `packages/runtime/dist/runtime-core/js-runtime/owned-mount.js` — 9034
10. `packages/runtime/dist/runtime-core/js-runtime/mount-input.js` — 8846

## 后续优化点的依赖证据

### 服务端模板解析隔离

`template-only` 只保留 `dom.browser.js`（4080 B）与 `dom-host-operations.js`（483 B）。源码图显示浏览器模板入口 `template` 仍调用 `cloneServerTemplate`，后者调用 `decodeTemplateText`。因此候选逻辑没有消失，但当前 preserveModules 产物把服务端克隆/实体解码和浏览器模板放在同一个 `dom.browser.js` 模块中，无法从模块贡献中单独 tree-shake；发布包中未保留 `runtime/server.js` 或 server-renderer 模块。

### 组件根挂载错误状态拆分

`compiled-component` 仍保留 `error-capture.js` 3788 B、`runtime-core/reactive.shared.js` 1372 B、`runtime-core/js-reactive/facade.js` 20006 B、`runtime-core/js-reactive/hooks/values.js` 1959 B、`compiled-component.js` 15591 B 与 `compiled-render-anchor.js` 16391 B。源码图显示 `createReactiveFacade` 仅由 `reactive.shared.ts` 创建；错误派发则由 `error-capture.ts` 桥接到运行时错误处理。候选依赖仍存在，且 component/Teleport/Transition 三个独立发布场景都保留完整 facade（各 20006 B），可作为后续拆分是否真正缩包的对照。

## 预算事实

`node scripts/runtime-size-audit.js --output temp/size/refinement-budget-check.json --check` 退出码为 1；唯一失配是 `compiled-list` gzip 5293 B，大于现有预算 3650 B。预算未修改、未放宽。旧 `scripts/runtime-size-baseline.json` 使用不同入口口径，仅用于脚本打印历史差异，没有冒充本计划基线；本计划的固定起始值是 `scripts/runtime-size-refinement-baseline.json`。

## 服务端模板解析隔离结果

- 失败证据：重构前运行 `pnpm exec vitest run --project unit scripts/__tests__/runtime-template-size.spec.ts`，在 `1949 < 1949` 的 min 断言处失败（退出码 1）。
- 构建：`node scripts/build.js '^shared$' '^runtime$' '^rue$' -f esm-bundler,esm-bundler-runtime -t`（退出码 0）。
- 行为：指定的 unit-jsdom 命令覆盖 HTML、SVG、foreignObject、重复 clone、浏览器/服务端交错、注释、空元素、实体属性和自定义 adapter，36 个测试通过（退出码 0）。
- 产物门禁：`pnpm exec vitest run --project unit scripts/__tests__/runtime-template-size.spec.ts`，1 个测试通过（退出码 0）。
- 最终审计：`node scripts/runtime-size-audit.js --output temp/size/refinement-template.json`（退出码 0）。

`template-only` 从 raw 4598 / min 1949 / gzip 1084 / brotli 948 B 降至 raw 2895 / min 988 / gzip 579 / brotli 489 B，分别减少 1703 B（37.04%）、961 B（49.31%）、505 B（46.59%）、459 B（48.42%）。其余七个场景四项指标逐字节不变。`server-template.js` 在 template-only 的正 renderedBytes 为 0。

解析器现归属 `compiler-runtime/server-template.ts`，由 `ServerDOMAdapter.cloneTemplate` 同步调用；`dom.browser.ts` 只经 `dom-host-operations.ts` 请求当前 adapter 的 clone 能力，并按 adapter 使用 WeakMap 隔离模板缓存。缺少该能力时抛出明确错误，不返回空片段。

## 根挂载错误状态拆分结果

- 失败证据：重构前运行 `pnpm exec vitest run --project unit scripts/__tests__/runtime-root-error-size.spec.ts`，`runtime-core/reactive.shared.js` 的正 renderedBytes 为 1342，零依赖断言失败（退出码 1）。
- 构建：`node scripts/build.js '^shared$' '^runtime$' '^rue$' -f esm-bundler,esm-bundler-runtime -t`（退出码 0）。
- 行为：指定的 errorCaptured、实际页面和 compiled component update 测试，以及失败容器接管测试共 18 个测试通过（退出码 0）；覆盖对象身份、函数错误、原始值、重复查询、原错误重抛及其他应用不能接管失败容器。
- 产物门禁：`pnpm exec vitest run --project unit scripts/__tests__/runtime-root-error-size.spec.ts`，1 个测试通过（退出码 0）。从 `error-capture.js` 的真实发布导出消费两个 helper 时，`reactive.shared.js`、`js-reactive/facade.js` 和 `js-reactive/hooks/values.js` 的正 renderedBytes 均为 0。
- 最终审计：`node scripts/runtime-size-audit.js --output temp/size/refinement-error.json`（退出码 0）。

`compiled-component` 从 raw 179158 / min 70743 / gzip 21505 / brotli 19537 B 降至 raw 175172 / min 69843 / gzip 21205 / brotli 19267 B；min 与 gzip 分别减少 900 B 和 300 B。`teleport-only` 的 min/gzip 从 72754/22122 B 降至 71854/21811 B，`transition-only` 从 74904/22816 B 降至 74004/22505 B；两者 min 均减少 900 B，gzip 均减少 311 B。`compiled-builtins` 的 min/gzip 也减少 900/307 B。client-core、template-only 和 compiled-list 逐字节不变。完整 hydrate 的 min 减少 38 B，但 gzip 增加 3 B、brotli 增加 15 B，属于新 preserveModules 边界的压缩布局代价，未隐藏为全场景下降。

根挂载 WeakSet 与对象键判断现归属无 runtime 导入的 `root-mount-error.ts`；`compiled-component.ts` 与 `hooks/useApp.ts` 直接依赖该模块，`error-capture.ts` 转发原有两个导出并共享同一存储。该拆分只排除了根错误 helper 消费链上的通用响应式依赖；完整 component、Teleport 和 Transition 仍由其他功能路径保留 `runtime-core/reactive.shared.js` 1372 B、`js-reactive/facade.js` 20006 B 和 `js-reactive/hooks/values.js` 1959 B，未声称消除全部 facade。

## 最终预算与统一回归

- 最终两次测量：`node scripts/runtime-size-audit.js --output temp/size/refinement-final-first.json` 与 `node scripts/runtime-size-audit.js --output temp/size/refinement-final.json` 均退出码 0；`cmp -s` 退出码 0，报告逐字节一致。
- 常规基线：`node scripts/runtime-size-audit.js --write-baseline --output temp/size/refinement-final.json` 退出码 0，`scripts/runtime-size-baseline.json` 的八个入口均解析到当前 `packages/rue/dist/*.js` 发布入口。
- 预算：新增场景 gzip 上限锁定最终值，`template-only` 579 B、`teleport-only` 21811 B、`transition-only` 22505 B，均低于起始基线。旧 `compiled-list` 预算因发布入口口径变化，经用户明确授权从 3650 B 调整为同口径起始值 5293 B；其余旧预算未放宽。门禁现在要求每个审计场景都有预算。
- `pnpm run prepare-unit-test-artifacts`：退出码 0。
- `pnpm run check`：退出码 0，含 compiler/runtime boundary clean。
- `node scripts/runtime-size-audit.js --check`：退出码 0。
- `pnpm run size:tree-shaking:check`：退出码 0。
- 四个聚焦脚本测试文件：退出码 0，4 files / 33 tests passed。
- 并发冲突解除后恢复 release 的 `pnpm run size-runtime -- --check`，保持发布预算门禁强度；连同性能门禁断言的五个聚焦脚本测试文件复验退出码 0，5 files / 76 tests passed。
- runtime jsdom 回归：退出码 0，262 files / 1001 tests passed；仅有既有 jsdom `scrollTo` 与 Node localStorage warning。
- SSR 回归：退出码 0，9 files / 44 tests passed；仅有 Node localStorage warning。

累计同口径收益集中在浏览器模板与组件错误状态路径：`template-only` raw/min/gzip/brotli 分别减少 1703/961/505/459 B；`compiled-component` 减少 3986/900/300/270 B；`compiled-builtins` 减少 3986/900/307/283 B；`teleport-only` 减少 3986/900/311/279 B；`transition-only` 减少 3986/900/311/290 B。`client-core` 与 `compiled-list` 不变。`hydrate` raw/min 减少 22/38 B，但 gzip/brotli 增加 3/15 B；这是拆分模块后的压缩布局边界，仍低于既有 hydrate 预算，未隐藏为全场景下降。

仍待精简的主要依赖是完整 component、Teleport 与 Transition 场景保留的 `runtime-core/js-reactive/facade.js`、`runtime-core/reactive.shared.js`、`runtime-core/js-reactive/hooks/values.js`，以及 builtins 场景中的 `compiler-runtime/builtins/index.js`。本轮没有继续扩大到响应式内核、Proxy、props、SWC ABI、Wasm 或路由。
