# 删除编译 vapor 别名计划

目标：让 SWC 直接生成 `_$compiledRoot`，删除等价的编译期 `vapor` 别名，并验证产物体积不回退。

范围：修改 SWC JSX 降级与运行时能力路由，迁移仓库内对编译期 `vapor` 的内部用法，删除 `compiled-legacy-dom.ts` 中的转发导出，并执行编译器、运行时、SSR、类型与体积检查。

范围外：不删除 `RueRuntime.vapor(setup)`、portable mount 的 `kind: 'vapor'` 协议、Vapor 响应式运行时、`_$compiledRoot` 的 owner/生命周期/卸载语义，也不承诺不可测的 DOM 热路径性能提升。

假设：`vapor(factory)` 当前严格等价于 `_$compiledRoot(factory)`；`_$compiledRoot` 已由 compiler 与 component 内部入口导出；仓库内部入口不承诺外部兼容迁移。

## 设计决策

- 选择直接生成并调用 `_$compiledRoot`，而不是保留别名或新增替代包装；这样能消除重复 ABI，并允许纯编译模块保持 compiler tier。
- 不把 runtime-core 的 `runtime.vapor` 合并或重命名；它创建 portable mount input，职责和编译根不同。
- 性能结论以 size/tree-shaking 审计为准；若体积无改善，也仍可因接口精简删除别名，但不得声称运行时加速。

## 架构说明

- SWC 的 `RUNTIME_CAPABILITIES` 决定 helper 的入口分层；`_$compiledRoot` 属于 compiled tier，而旧 `vapor` 会把模块提升到 component/Vapor tier。
- `_$compiledRoot` 必须继续负责 owner、effect scope bridge、context、生命周期、单次挂载和卸载清理。

## 开发策略

- 对会改变行为的代码，使用失败验证-通过验证-重构。
- 在实施步骤前规划失败验证命令和预期失败。
- 将实施步骤限制在失败测试所证明的行为范围内。
- 测试真实行为，不验证模拟对象或实现细节。
