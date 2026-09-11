// SWC ECMAScript AST 节点类型集合（Ident/CallExpr/ArrowExpr 等）
use swc_core::ecma::ast::*;

use crate::emit::*;

use super::super::VaporTransform;

/// 生成 compiled slot 使用的稳定注释锚点；children 使用独立标记，便于调试与区分。
pub(crate) fn emit_markers(
    vt: &mut VaporTransform,
    root: &Ident,
    is_children: bool,
    stmts: &mut Vec<Stmt>,
) -> Ident {
    let anchor = vt.next_list_ident();
    let marker_anchor: &str = if is_children { "rue:children:anchor" } else { "rue:slot:anchor" };

    let make_anchor = call_ident("_$createComment", vec![string_expr(marker_anchor)]);
    stmts.push(const_decl(anchor.clone(), make_anchor));
    stmts.push(append_child(root.clone(), Expr::Ident(anchor.clone())));
    anchor
}
