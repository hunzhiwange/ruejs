/*
预处理（pre）模块总览：
- 职责：在 SWC 的遍历阶段对源码进行“预处理改写”，为后续 Vapor 化与运行时绑定做准备。
- 组成：
  - helpers：辅助逻辑（如检测函数体是否返回 JSX、收集安全语句、注入 useSetup 包裹与解构绑定、组件识别等）。
  - for_directive：将元素上的 v-for / r-for 指令改写为标准 map 调用表达式，复用现有 TSX 列表路径。
  - if_directive：将兄弟 JSX 元素上的 v-if / v-else-if / v-else 指令改写为条件表达式容器（{ cond ? <A/> : <B/> }）。
  - model_directive：将 v-model / r-model 指令改写为 Rue 现有受控 props / 事件模型。
  - on_setup：构造 useSetup(()=>{ ...; return { ... }}) 以及 const/let 的解构绑定声明。
  - show_directive：将 v-show 类指令改写为受控显示逻辑（具体见该文件）。
  - side_effect：纯度/副作用分析与标识符收集，帮助判定哪些语句可安全搬迁。
  - transform：统一入口，组织遍历流程与调用上述改写。
*/
mod for_directive;
mod helpers;
mod if_directive;
mod model_directive;
mod on_directive;
mod on_setup;
pub(crate) mod pre_directive;
mod show_directive;
mod side_effect;
mod template_directive;
mod transform;

pub(crate) use helpers::{
    block_requires_custom_composable_render_effect, collect_setup_region,
    has_component_render_return_in_block, is_fc_pat, is_untyped_arrow_component_decl,
    stmt_is_snapshot_initializer,
};
pub(crate) use on_setup::build_compiled_setup_with_binds;

/// 对外暴露的预处理入口：
/// - PreTransform 会在编译前阶段运行，按顺序应用 helpers/if_directive/show_directive 等改写；
/// - 旨在保持源代码语义不变的前提下，将条件/useSetup 等结构转换为更利于后续处理的形式。
pub use transform::PreTransform;
