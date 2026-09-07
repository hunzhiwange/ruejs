# Anchor 分级性能优化计划

目标：让编译器按动态区域形状选择最低成本挂载路径，减少非必要注释节点、通用 `renderAnchor` 调度和 DOM 操作，且以实测性能收益为合入条件。

范围：覆盖 SWC JSX/TSX 动态文本、可证明非空单根分支、编译组件与 slot 的边界选择；复用 `CompiledTarget`/`CompiledBlock` 现有 ABI；补充编译形状、真实 DOM 行为、清理、hydration 与 Chromium 性能回归。

范围外：不删除 `renderAnchor` 公开/兼容入口，不强行去除可空、多根、列表尾界、Teleport、KeepAlive、Suspense 或 hydration 所必需的边界，不做无性能证据的大规模 ABI 重写。

假设：当前工作树已有与单注释锚点和删除旧 range 路径重叠的未提交变更；执行时必须保留这些变更并以当时实际源码重新采样基线。现有 `CompiledBlock` 使用连续 `first/last` 节点，`CompiledTarget.before` 可为 `null`。

## 设计决策

- 采用四级路由：直接 Text/属性更新 → 已知非空 `CompiledBlock` 与真实兄弟边界 → 专用列表/内置组件路径 → 通用 comment anchor + `renderAnchor` 兜底。
- 不引入隐形空 Text 节点冒充无锚点；它仍是节点分配，还会增加文本语义和 hydration 风险。
- 性能优化必须同时给出编译形状证据、DOM 资源计数和稳定基准对比；只减少 `innerHTML` 中可见注释不算完成。
- 保持 `renderAnchor` 的不透明 Renderable/legacy 兼容边界，不让编译器猜测无法证明的返回形状。

## 架构说明

- 编译决策主要位于 `element_children.rs`/`element_expr.rs`/`element_slot.rs`/`vapor/template.rs`；挂载 ABI 位于 `compiler-runtime/mount.ts` 与 `compiled-component.ts`；`compiled-render-anchor.ts` 只承担不透明兜底。
- 不恢复已删除的双边界 JS runtime；优先复用现有 `CompiledTarget.before` 、`CompiledBlock.first/last` 和编译期 template hole 定位能力。

## 开发策略

- 对会改变行为的代码，使用失败验证-通过验证-重构。
- 在实施步骤前规划失败验证命令和预期失败。
- 将实施步骤限制在失败测试所证明的行为范围内。
- 测试真实行为，不验证模拟对象或实现细节。
