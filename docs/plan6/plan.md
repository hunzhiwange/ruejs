# 第六阶段：清零仓库里剩余的 `VNode` / 虚拟 DOM 语义

第五阶段已经把默认 compat 子路径、默认公开 helper 和一部分文档口径切到了 breaking removal，但这还不等于“仓库里已经没有虚拟 DOM”。当前剩余的问题已经不在默认入口是否继续公开 compat，而在仓库内部是否还保留 `VNode` 结构、vnode-like 输入协议、编译器 vnode 心智，以及围绕这些残留建立的测试、文档和生成产物。

如果这一阶段的目标是“仓库层面彻底删掉虚拟 DOM”，那就不能只满足于默认入口拒绝 legacy 输入；还必须把 source、tests、docs、dist/pkg 和 grep 例外里的 `VNode` 语义一起清空。

## 当前盘点

1. 默认 JS runtime 仍保留 compat 结果分支：`packages/runtime/src/renderable.ts` 的 `NormalizeRenderableResult` 仍有 `kind: 'compat'`，`renderable-normalize.ts` 仍把 plain object 保留为 compat candidate。
2. 默认 Wasm / real_dom 边界仍识别 vnode-like 对象：`packages/runtime-vapor/src/runtime/bridge/input.rs` 的 `looks_like_dev_object()`、`mount_input_from_dev_object_or_registry()`，以及 `runtime/real_dom/convert.rs` 的 `looks_like_default_vnode_object()`、`dev_object_to_input()`、`input_to_dev_object()` 仍保留默认 dev object 协议。
3. runtime-vapor 内核仍保留 `VNode / Child / VNodeType` 实体：`packages/runtime-vapor/src/runtime/types.rs` 仍定义这些类型，`runtime/core.rs` 的 `create_element()` 仍直接构造 compat `VNode`。
4. mounted snapshot / patch / lifecycle 仍通过 `from_vnode()`、`into_patch_vnode()`、`Child::VNode`、`MountedSubtreeChild::VNode` 等回退链路把 mounted state 和 `VNode` 互转。
5. swc-plugin-rue 仍把编译器内部协议表述为“转 vnode / Rue VNode / \_\_vnodeX”：`element_expr.rs`、`element_fragment.rs`、`vapor/block/expr.rs`、`vapor/helpers.rs` 都还保留 vnode IR 命名。
6. 仓库文档、测试和生成产物仍残留虚拟 DOM 叙事：`docs/glossary/index.md`、`docs/guide/reusability/custom-directives.md`、部分 runtime tests、runtime-vapor tests，以及已生成的 `dist/pkg/pkg-node` 产物仍出现 `VNode`、`虚拟 DOM`、`__rue_vnode_id`、`compat` 等字样。

## 当前进度

1. [1.md](./1.md)：删掉默认 JS / Wasm 边界上的 vnode-like 输入协议与 compat 结果分支。
2. [2.md](./2.md)：拆掉 mounted snapshot / patch / real_dom / lifecycle 中的 `VNode` 回退链。
3. [3.md](./3.md)：删除 runtime-vapor core / types 里的 `VNode / Child / VNodeType` 契约与工厂。
4. [4.md](./4.md)：清理 swc-plugin-rue 中的 vnode IR、helper 命名与编译心智。
5. [5.md](./5.md)：统一完成文档、测试、生成产物、grep gate 与发布口径收尾。

## 执行顺序

1. 先完成 [1.md](./1.md)，因为默认 JS / Wasm 边界还在识别 vnode-like 对象时，仓库仍然保留活跃的 VDOM 输入协议。
2. 再完成 [2.md](./2.md)，先拆掉 mounted snapshot 与 patch/real_dom 的 `VNode` 回退链，否则 `types.rs` 无法真正瘦身。
3. 然后推进 [3.md](./3.md)，在回退链消失后删除 runtime-vapor 核心里的 `VNode / Child / VNodeType` 与 `create_element()` compat 工厂。
4. 接着完成 [4.md](./4.md)，把编译器内部的 vnode IR、`__vnodeX` 变量名和“转 vnode”心智一起改掉，避免运行时已经去 VDOM 后编译器继续把语义补回来。
5. 最后用 [5.md](./5.md) 收口文档、测试、生成产物和最终 grep gate，让“仓库已无虚拟 DOM 语义”成为可验证结论。

## 阶段边界

1. 不把“默认入口拒绝 legacy 输入”和“仓库里已经不存在 VNode 协议”混为一谈；这两个完成条件不是一回事。
2. 不允许只把 `VNode` 改名成别的 node/shape/container，而保留同样的递归结构和输入协议。
3. 不在 source 还没清干净时就单独刷新 `dist/pkg`，否则生成产物会继续把旧语义固化回仓库。
4. 不把仅排除 `dist/pkg/tests/docs` 的 source grep 当作最终证明；这阶段需要 repo-level 口径的一致性。

## 完成定义

1. 默认 JS / Wasm 边界不再有 `kind: 'compat'`、vnode-like dev object、`Legacy VNode/compat` 这类运行时协议与错误口径。
2. runtime-vapor 的 mounted snapshot / patch / lifecycle / real_dom 主路径不再通过 `from_vnode()`、`into_patch_vnode()`、`Child::VNode` 一类回退链维持运行。
3. `packages/runtime-vapor/src/runtime/types.rs` 与 `runtime/core.rs` 不再保留 `VNode / Child / VNodeType` 和 compat `create_element()` 工厂。
4. swc-plugin-rue 的内部 lowering、helper 标识符和注释不再以 vnode 为中心组织。
5. 文档、测试、生成产物与仓库级 grep gate 已统一到“仓库无虚拟 DOM 语义”的口径。

## 推荐验证

1. `cargo check`
2. `cargo check --tests`
3. `pnpm --filter @rue-js/runtime-vapor run build`
4. `pnpm --filter @rue-js/runtime-vapor run build-node`
5. `pnpm check`
6. `pnpm test --run`
7. `pnpm app-build`
8. `rg "\bVNode\b|__rue_vnode_id|_\$vaporCreateVNode|renderCompat|renderBetweenCompat|renderAnchorCompat|renderStaticCompat|__vnode|vnodeLike|虚拟 DOM|虚拟 dom" packages docs app scripts`
