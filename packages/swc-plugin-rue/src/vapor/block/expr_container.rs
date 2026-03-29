use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;

use crate::emit::{call_ident, const_decl, ident};
use crate::utils::unwrap_expr;

use super::super::VaporTransform;

/// JSX 表达式容器改写（细节详解）：
/// - emit_markers：生成起止注释并插入到根；children 插槽锚点采用独立标识，便于调试与区分。
/// - build_slot_expr：将任意表达式规范化为可渲染 vnode（数组/字符串/JSX/DOM），避免在渲染点做复杂分支。
/// - watchEffect：在箭头函数中调用 renderBetween，保证动态更新合并到微任务批处理。
/// - 静态组件优化：检测纯静态组件场景，直接一次性渲染，无需 watch 包裹。
pub(crate) fn handle_expr_container(
    vt: &mut VaporTransform,
    root: &Ident,
    ec: &JSXExprContainer,
    stmts: &mut Vec<Stmt>,
) {
    // JSX 表达式容器处理：
    // - 识别 props.children 与普通插槽
    // - 生成起止注释，并在 watch 中调用 renderBetween 进行片段渲染
    // - 插槽值会被规范化为 fragment（数组、VNode、DOM 或字符串）
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

            // 生成注释锚点并附加到 root
            let (start, end) = super::utils::emit_markers(vt, root, is_children, stmts);

            // 构建插槽表达式（children 直接渲染原表达式，否则走统一构建）：
            // - children：保持原语义与生命周期
            // - 非 children：统一转为 vnode 表达式，便于渲染与后续优化
            let expr_for_slot =
                if is_children { inner.clone() } else { super::expr::build_slot_expr(vt, inner) };

            // 静态组件优化：某些静态组件（无动态 props/children）可直接一次性渲染，无需 watch
            let maybe_static = match inner {
                Expr::JSXElement(el) => {
                    (crate::utils::is_static_component_without_props(el)
                        || crate::utils::is_static_component_children_ident(el)
                        || crate::utils::component_has_no_dynamic_props_excluding_children(el))
                        && !crate::utils::is_component_named(el, "RouterLink")
                }
                _ => false,
            };
            if maybe_static {
                // 直接构造 vnode 并调用 renderBetween，一次性渲染
                let slot_ident = vt.next_slot_ident();
                let decl_slot = const_decl(slot_ident.clone(), expr_for_slot.clone());
                let vnode_expr =
                    call_ident("_$vaporCreateVNode", vec![Expr::Ident(slot_ident.clone())]);
                // renderBetween 调用细节：
                // - callee：成员为标识符 `renderBetween`
                // - args：依次为 vnode、父 root、start 注释、end 注释
                // - ctxt：统一 `SyntaxContext::empty()`，保证跨文件生成一致性
                let render_call = Expr::Call(CallExpr {
                    span: DUMMY_SP,
                    callee: Callee::Expr(Box::new(Expr::Ident(ident("renderBetween")))),
                    args: vec![
                        ExprOrSpread { spread: None, expr: Box::new(vnode_expr) },
                        ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(root.clone())) },
                        ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(start.clone())) },
                        ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(end.clone())) },
                    ],
                    type_args: None,
                    ctxt: SyntaxContext::empty(),
                });
                stmts.push(decl_slot);
                stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(render_call) }));
            } else {
                // 动态场景：包裹在 watchEffect 中，按注释锚点间进行批处理渲染与更新：
                // - watch_render_between：构造 `() => { const slot = expr_for_slot; renderBetween(...) }`
                // - 原因：在表达式值变化时，统一以微任务批量更新，避免多次同步 DOM
                let arrow =
                    super::utils::watch_render_between(expr_for_slot, root.clone(), start, end);
                // watch 调用细节：
                // - callee：标识符 `watchEffect`
                // - args：单个箭头函数 `() => { ... renderBetween(...) }`
                // - ctxt：由 `emit::call_ident` 统一设置 `SyntaxContext::empty()`
                let watch_expr = call_ident("watchEffect", vec![arrow]);
                stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(watch_expr) }));
            }
        }
    }
}
