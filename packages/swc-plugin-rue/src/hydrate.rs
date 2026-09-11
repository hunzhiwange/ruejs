/// Both targets traverse exactly the same JSX node plan. No client renderer adoption.
pub(crate) fn run(
    program: swc_core::ecma::ast::Program,
    _comments: Option<swc_core::plugin::proxies::PluginCommentsProxy>,
) -> swc_core::ecma::ast::Program {
    super::run_node_plan_transform(program, true)
}
