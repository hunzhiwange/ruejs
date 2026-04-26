// SWC 常量与上下文：DUMMY_SP（稳定 span）、SyntaxContext（统一 empty）
use swc_core::common::{DUMMY_SP, SyntaxContext};
// SWC ECMAScript AST 节点类型集合（Ident/CallExpr/ArrowExpr 等）
use swc_core::ecma::ast::*;

use crate::emit::*;

use super::super::VaporTransform;

/// 块体工具（细化说明）：
/// - emit_markers：生成单锚点注释并插入到根节点，配合 renderAnchor；children/slot 使用不同标记字符串，便于调试与区分
/// - watch_render_slot：将插槽值保存为 `__slot`，直接交给 runtime 新协议入口 `renderAnchor(...)`，供 watch 包裹
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

pub(crate) fn watch_render_slot(expr_for_slot: Expr, root: Ident, anchor: Ident) -> Expr {
    // 保存 slot 原值，并直接交给 runtime 的 Renderable/compat 边界处理
    let decl_slot = const_decl(ident("__slot"), expr_for_slot);

    let render_call = Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(Expr::Ident(ident("renderAnchor")))),
        args: vec![
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(ident("__slot"))) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(root.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(anchor.clone())) },
        ],
        type_args: None,
        ctxt: SyntaxContext::empty(),
    });

    let body = BlockStmt {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        stmts: vec![
            decl_slot,
            Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(render_call) }),
        ],
    };

    // 返回箭头函数：供 watchEffect 包裹执行，实现批处理与响应式更新
    Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::BlockStmt(body)),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    })
}
