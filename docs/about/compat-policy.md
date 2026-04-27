# Compat 策略与发布清单

本页用于说明 Rue 当前对历史 compat / VNode-first 协议的最终策略，以及涉及这类 breaking removal 时的发布检查项。

## 当前策略

Rue 默认渲染路径已经完全围绕 Block / Vapor / Renderable-first 组织。显式 compat 子路径已作为 breaking change 删除：

- `@rue-js/runtime/compat`
- `@rue-js/rue/compat`

同时移除的历史 helper 包括：

- `_$vaporCreateVNode`
- `renderCompat`
- `renderBetweenCompat`
- `renderAnchorCompat`
- `renderStaticCompat`

这意味着 compat 不再是“继续保留一个迁移周期的显式边界”，而是已经完成删除的旧协议。

## 迁移原则

旧代码需要直接改写为默认路径能力，而不是继续寻找新的 compat 导入点：

1. 默认内容优先使用 `children`、render prop、callback props。
2. 直接返回 raw node / fragment / mount handle，而不是继续手写 VNode-like 对象。
3. 使用默认 `render`、`renderBetween`、`renderAnchor`、`renderStatic`，不要再包一层 compat render helper。
4. 组件库内部若仍有历史桥接层，应在本轮升级中一并删除，而不是继续向应用层暴露兼容协议。

## 发布清单

当一次改动涉及历史 compat / VNode-first helper 的删除时，发布前至少检查下面这些项：

1. package exports、dist 与 d.ts 产物里已不存在 compat 子路径。
2. 默认主入口不再暴露 compat-only helper，也不再暗示存在替代 compat 导入。
3. 迁移文档明确把旧 helper 标记为 breaking removal，并给出默认路径写法。
4. focused regression 覆盖默认 render 入口、Teleport / Transition / async component 等敏感边界。
5. 发布说明明确写出受影响导入路径、删除的 helper 名称，以及推荐替代模式。

## 对库作者的建议

如果你维护的是组件库、指令库或预编译产物，请优先遵循以下策略：

1. 不要再依赖 compat 子路径或 VNode-first helper。
2. 在 peer 依赖中声明最低运行时版本，避免旧运行时消费新产物时出现隐式不兼容。
3. 尽量把新代码迁到 `props.children`、render prop、显式命名 props 等默认路径。

## 当前结论

- compat 子路径已移除。
- 默认主入口继续保持 Renderable-first。
- 新代码不应继续依赖 VNode-first helper 或显式 compat bridge。
