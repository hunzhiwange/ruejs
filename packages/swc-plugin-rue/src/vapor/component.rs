use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;

use crate::emit::*;

use super::VaporTransform;

/*
组件块编译说明：
- 使用 DocumentFragment 作为组件片段根，并在其下插入 "rue:component:anchor" 注释锚点；
- 若存在内联 children，则复用 element_component 的共享改写逻辑，保持 TransitionGroup 原始 JSX children、简单字面量快路径与 children vapor 包裹语义一致；
- 组件统一通过 compiled slot ABI 挂载；props 更新由 compiled component ABI 负责。
*/
/// 组件根渲染块：
/// - 根为 `DocumentFragment`，在其下插入组件占位注释
/// - 若组件存在内联 children，则复用普通组件元素路径的 children -> props 改写
/// - 使用 compiled slot ABI 在占位注释前挂载组件本身
///   参考测试：`tests/components.rs`、`tests/spec11.rs`
pub fn emit_component_root(transform: &mut VaporTransform, el: &JSXElement) -> BlockStmt {
    if crate::element_component::is_compiled_component_element(transform, el)
        && let JSXElementName::Ident(component) = &el.opening.name
        && let Some(read_props) =
            crate::element_component::build_compiled_component_read_props(transform, el)
    {
        let root = ident("_root");
        return BlockStmt {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            stmts: vec![
                const_decl(root.clone(), call_ident("_$createDocumentFragment", vec![])),
                Stmt::Expr(ExprStmt {
                    span: DUMMY_SP,
                    expr: Box::new(call_ident(
                        "_$mountCompiledComponent",
                        vec![Expr::Ident(root.clone()), Expr::Ident(component.clone()), read_props],
                    )),
                }),
                Stmt::Return(ReturnStmt { span: DUMMY_SP, arg: Some(Box::new(Expr::Ident(root))) }),
            ],
        };
    }
    let root = ident("_root");
    let mut stmts: Vec<Stmt> = Vec::new();

    // 组件片段根创建
    let create_root = call_ident("_$createDocumentFragment", vec![]);
    stmts.push(const_decl(root.clone(), create_root));

    let mut comp_el = el.clone();
    let rewrite =
        crate::element_component::rewrite_component_children_to_props(transform, &mut comp_el);
    let slot_init_expr = rewrite
        .direct_render_expr
        .clone()
        .unwrap_or_else(|| crate::element_component::build_component_mount_expr(&comp_el));
    let child_stmts = rewrite.stmts;

    let anchor = transform.next_list_ident();
    let make_anchor = call_ident("_$createComment", vec![string_expr("rue:component:anchor")]);
    stmts.push(const_decl(anchor.clone(), make_anchor));
    stmts.push(append_child(root.clone(), Expr::Ident(anchor.clone())));

    stmts.extend(child_stmts);
    crate::element_slot::render_compiled_slot_for_at(
        transform,
        &root,
        &Expr::Ident(anchor),
        &slot_init_expr,
        &mut stmts,
    );

    stmts.push(return_root(root.clone()));
    BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts }
}

#[cfg(test)]
#[path = "component_tests.rs"]
mod tests;
