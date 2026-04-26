use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;

use crate::emit::{call_ident, const_decl, ident};
use crate::utils::unwrap_expr;

use super::super::VaporTransform;

/// JSX 表达式容器改写（细节详解）：
/// - emit_markers：生成单锚点注释并插入到根；children 插槽锚点采用独立标识，便于调试与区分。
/// - build_slot_expr：仅对需要保留 compat 结构的 slot 表达式做局部改写，最终仍把原始值交给 runtime 新协议入口。
/// - watchEffect：在箭头函数中调用 renderAnchor，保证动态更新合并到微任务批处理。
/// - 静态组件优化：检测纯静态组件场景，直接一次性渲染（renderAnchor），无需 watch 包裹。
pub(crate) fn handle_expr_container(
    vt: &mut VaporTransform,
    root: &Ident,
    ec: &JSXExprContainer,
    stmts: &mut Vec<Stmt>,
) {
    match &ec.expr {
        JSXExpr::JSXEmptyExpr(_) => {}
        JSXExpr::Expr(expr) => {
            let inner = unwrap_expr(expr.as_ref());
            // 优先识别 Array.map(JSX) 并走键控复用列表路径
            if let Expr::Call(call) = inner.clone() {
                if crate::element_list::try_build_list_from_map(vt, root, &call, stmts) {
                    return;
                }
            }
            let is_children = if let Expr::Member(m) = inner {
                matches!((&*m.obj, &m.prop), (Expr::Ident(id), MemberProp::Ident(pi))
                    if id.sym.as_ref() == "props" && pi.sym.as_ref() == "children")
            } else {
                false
            };

            let maybe_static = match inner {
                Expr::JSXElement(el) => {
                    !crate::utils::is_transition_group_component(el)
                        && (crate::utils::is_static_component_without_props(el)
                            || crate::utils::is_static_component_children_ident(el)
                            || crate::utils::component_has_no_dynamic_props_excluding_children(el))
                }
                _ => false,
            };

            // 生成单锚点注释并附加到 root
            let anchor = super::utils::emit_markers(vt, root, is_children, stmts);
            let expr_for_slot =
                if is_children { inner.clone() } else { super::expr::build_slot_expr(vt, inner) };

            if maybe_static {
                // 静态插槽：直接 renderAnchor，无需 watchEffect 包裹
                let slot_ident = vt.next_slot_ident();
                let decl_slot = const_decl(slot_ident.clone(), expr_for_slot.clone());
                let render_call = Expr::Call(CallExpr {
                    span: DUMMY_SP,
                    callee: Callee::Expr(Box::new(Expr::Ident(ident("renderAnchor")))),
                    args: vec![
                        ExprOrSpread {
                            spread: None,
                            expr: Box::new(Expr::Ident(slot_ident.clone())),
                        },
                        ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(root.clone())) },
                        ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(anchor.clone())) },
                    ],
                    type_args: None,
                    ctxt: SyntaxContext::empty(),
                });
                stmts.push(decl_slot);
                stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(render_call) }));
            } else {
                // 动态插槽：包裹在 watchEffect 中，按注释锚点进行批处理渲染与更新
                let arrow = super::utils::watch_render_slot(expr_for_slot, root.clone(), anchor);
                let watch_expr = call_ident("watchEffect", vec![arrow]);
                stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(watch_expr) }));
            }
        }
    }
}
