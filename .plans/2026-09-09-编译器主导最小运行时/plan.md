# 编译器主导最小运行时计划

目标：把 Rue 改造成严格的编译器驱动框架，删除通用 JS/legacy 渲染路径，让常规组件生产包 gzip 不超过 10 KB。

范围：重写 SWC 生成 ABI，使 DOM 创建与精确更新、分支、列表、组件、插槽、内置组件、SSR 与 hydration 都由编译结果决定；保留最小 signal/effect/owner、block 生命周期、宿主节点原语与事件委托；迁移工作区后删除 js-runtime、reactive facade、portable/legacy renderable、通用 render/patch/fallback 及旧导出。

范围外：保留旧 ABI、第三方预编译产物迁移、运行时 JSX、未编译源码回退、Proxy 响应式兼容、Wasm runtime、路由协议重写。

假设：项目无兼容历史包袱，允许 SWC ABI 与公开运行时入口破坏性变更；现有 compiled capability 路由可作为精确 helper 导入的起点；源码安装必须经过 Rue 编译器，未编译 JSX 明确报错。

## 设计决策

- 选择单一 closed compiled ABI；不保留双路径、兼容适配器或运行时值类型分派。
- DOM 静态结构由模板克隆或直接指令生成，动态字段由编译器生成定点 effect；只有动态 spread 使用最小键集合更新器。
- 组件产物是 mount/update/dispose 闭包或定长元组，不暴露万能 handle；builtin、SSR、hydration 使用独立按需原语。
- 备选的渐进兼容层会延续依赖泄漏；仅拆文件又不能保证缩包，因此均不采用。

## 架构说明

- 最小浏览器 runtime 只允许 owner、signal/effect、block disposal、DOM host、delegated events 和被编译器显式导入的 feature helper。
- 禁止 compiled 发布入口依赖 `runtime-core/js-runtime`、`js-reactive/facade`、legacy DOM、portable renderable、通用 `render`、Island 序列化或未使用 builtin。
- SSR 编译为写入器指令；hydration 编译为确定性 claim 指令，禁止失败后退回完整客户端 render。

## 开发策略

- 对会改变行为的代码，使用失败验证-通过验证-重构。
- 在实施步骤前规划失败验证命令和预期失败。
- 将实施步骤限制在失败测试所证明的行为范围内。
- 测试真实编译产物、浏览器 DOM、SSR 字符串和消费包，不验证模拟对象。
- 所有任务串行执行，避免 SWC ABI、runtime 入口、dist 和体积报告发生交叉写入。
- 删除以依赖图、禁止导入测试和消费包体积为准，不以源码行数作为完成证据。
