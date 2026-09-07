# 响应式内核无代理重构计划

目标：以 `signal` 和单一增量依赖图替代响应式对象 Proxy 与重复内核，让编译产物直接执行低分配的细粒度读写。

范围：重构 `packages/runtime` 响应式图、Signal 路径访问、编译 ABI 与 props；扩展 SWC 对状态成员读写的降级；删除 reactive/readonly Proxy 族和重复 Set 内核；迁移仓库内调用；建立时间、内存、体积回归门禁。

范围外：路由参数、RSC/RPC、Text 兼容层和默认 `rue` 门面的非响应式 Proxy；第三方 Vue API 兼容；未经编译的对象属性魔法响应式。

假设：Rue 的 TSX/JSX 主路径始终经过 SWC；现有 `SignalHandle.getPath/setPath/updatePath`、`ReactiveGraph` 和编译 provenance 可作为重构入口；允许删除旧 API、改变对象引用与原地写入语义，并同步迁移仓库内代码。

## 设计决策

- `signal` 是唯一状态容器；删除 Proxy API，不保留兼容层。
- 路径 Trie 原地精确触发；编译器生成路径读写，未知逃逸直接报错。
- compiler 与通用运行时共享一套 Graph/Signal/Effect。

## 架构说明

- 数据流为“编译成员访问 → 路径节点 → Graph → Effect”；props 静态键直读，动态结构显式快照。
- ABI 切换必须通过行为、内存、性能和体积门禁。

## 开发策略

- 对会改变行为的代码，使用失败验证-通过验证-重构。
- 在实施步骤前规划失败验证命令和预期失败。
- 将实施步骤限制在失败测试所证明的行为范围内。
- 测试真实行为，不验证模拟对象或实现细节。
