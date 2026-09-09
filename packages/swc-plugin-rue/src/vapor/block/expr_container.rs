use std::collections::HashSet;

use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitWith};

use crate::emit::{call_ident, const_decl, ident, string_expr};
use crate::reactive_provenance::ReactiveKind;
use crate::utils::unwrap_expr;

use super::super::VaporTransform;

fn is_scalar_accessor_call(call: &CallExpr, shadowed_names: &HashSet<String>) -> bool {
    if let Callee::Expr(callee) = &call.callee
        && matches!(callee.as_ref(), Expr::Ident(id) if id.sym == "_$compiledReadPath")
    {
        return true;
    }
    if call.args.is_empty()
        && let Callee::Expr(callee) = &call.callee
        && let Expr::Member(member) = unwrap_expr(callee.as_ref())
        && let MemberProp::Ident(property) = &member.prop
        && property.sym.as_ref() == "get"
    {
        return matches!(unwrap_expr(member.obj.as_ref()), Expr::Ident(_) | Expr::Member(_));
    }

    let Callee::Expr(callee) = &call.callee else {
        return false;
    };
    let Expr::Ident(callee) = unwrap_expr(callee.as_ref()) else {
        return false;
    };
    matches!(callee.sym.as_ref(), "String" | "Number" | "Boolean")
        && !shadowed_names.contains(callee.sym.as_ref())
        && call.args.len() == 1
        && call.args[0].spread.is_none()
        && is_compiled_scalar_expr_with_shadows(call.args[0].expr.as_ref(), shadowed_names)
}

fn static_member_object(member: &MemberExpr) -> Option<&Expr> {
    match &member.prop {
        MemberProp::Ident(_) | MemberProp::PrivateName(_) => Some(unwrap_expr(member.obj.as_ref())),
        MemberProp::Computed(computed)
            if matches!(
                unwrap_expr(computed.expr.as_ref()),
                Expr::Lit(Lit::Str(_) | Lit::Num(_) | Lit::BigInt(_))
            ) =>
        {
            Some(unwrap_expr(member.obj.as_ref()))
        }
        MemberProp::Computed(_) => None,
    }
}

fn reactive_member_is_scalar(vt: &VaporTransform, member: &MemberExpr) -> bool {
    let Some(object) = static_member_object(member) else {
        return false;
    };
    match object {
        Expr::Ident(ident) => match vt.reactive_kind(ident.sym.as_ref()) {
            Some(ReactiveKind::ObjectValue | ReactiveKind::PropsValue) => true,
            Some(ReactiveKind::RefLike | ReactiveKind::StateValue) => {
                matches!(&member.prop, MemberProp::Ident(property) if property.sym.as_ref() == "value")
            }
            Some(ReactiveKind::Signal) | None => false,
        },
        Expr::Member(parent) => reactive_member_is_scalar(vt, parent),
        Expr::Call(call) => reactive_signal_get_is_scalar(vt, call),
        _ => false,
    }
}

fn reactive_signal_get_is_scalar(vt: &VaporTransform, call: &CallExpr) -> bool {
    if let Callee::Expr(callee) = &call.callee
        && matches!(callee.as_ref(), Expr::Ident(id) if id.sym == "_$compiledReadPath")
    {
        return true;
    }
    if crate::compiled_component::is_static_prop_get_call(call) {
        return true;
    }
    if !call.args.is_empty() {
        return false;
    }
    let Callee::Expr(callee) = &call.callee else {
        return false;
    };
    let Expr::Member(member) = unwrap_expr(callee.as_ref()) else {
        return false;
    };
    let MemberProp::Ident(property) = &member.prop else {
        return false;
    };
    if property.sym.as_ref() != "get" {
        return false;
    }
    let Expr::Ident(signal) = unwrap_expr(member.obj.as_ref()) else {
        return false;
    };
    vt.reactive_kind(signal.sym.as_ref()) == Some(ReactiveKind::Signal)
}

fn is_reactive_scalar_accessor_call(
    vt: &VaporTransform,
    call: &CallExpr,
    shadowed_names: &HashSet<String>,
) -> bool {
    if reactive_signal_get_is_scalar(vt, call) {
        return true;
    }
    let Callee::Expr(callee) = &call.callee else {
        return false;
    };
    let Expr::Ident(callee) = unwrap_expr(callee.as_ref()) else {
        return false;
    };
    matches!(callee.sym.as_ref(), "String" | "Number" | "Boolean")
        && !shadowed_names.contains(callee.sym.as_ref())
        && call.args.len() == 1
        && call.args[0].spread.is_none()
        && is_compiled_reactive_scalar_expr(vt, call.args[0].expr.as_ref(), shadowed_names)
}

/// Source-aware scalar proof for compiled bindings. Only members rooted in a
/// tracked Rue reactive value, and zero-argument getters on tracked signals,
/// may extend the existing syntactic scalar whitelist.
pub(crate) fn is_compiled_reactive_scalar_expr(
    vt: &VaporTransform,
    expr: &Expr,
    shadowed_names: &HashSet<String>,
) -> bool {
    match unwrap_expr(expr) {
        Expr::Lit(Lit::Str(_) | Lit::Bool(_) | Lit::Null(_) | Lit::Num(_) | Lit::BigInt(_)) => true,
        Expr::Ident(ident) => ident.sym.as_ref() == "undefined",
        Expr::Member(member) => reactive_member_is_scalar(vt, member),
        Expr::Call(call) => is_reactive_scalar_accessor_call(vt, call, shadowed_names),
        Expr::Unary(unary) => {
            !matches!(unary.op, UnaryOp::Delete)
                && is_compiled_reactive_scalar_expr(vt, unary.arg.as_ref(), shadowed_names)
        }
        Expr::Bin(binary) => {
            is_compiled_reactive_scalar_expr(vt, binary.left.as_ref(), shadowed_names)
                && is_compiled_reactive_scalar_expr(vt, binary.right.as_ref(), shadowed_names)
        }
        Expr::Cond(cond) => {
            is_compiled_reactive_scalar_expr(vt, cond.test.as_ref(), shadowed_names)
                && is_compiled_reactive_scalar_expr(vt, cond.cons.as_ref(), shadowed_names)
                && is_compiled_reactive_scalar_expr(vt, cond.alt.as_ref(), shadowed_names)
        }
        Expr::Tpl(template) => template
            .exprs
            .iter()
            .all(|expr| is_compiled_reactive_scalar_expr(vt, expr.as_ref(), shadowed_names)),
        Expr::Seq(sequence) => sequence
            .exprs
            .iter()
            .all(|expr| is_compiled_reactive_scalar_expr(vt, expr.as_ref(), shadowed_names)),
        _ => false,
    }
}

/// Syntactic proof used by the compiled DOM tier. Calls that can return Nodes,
/// collections, promises, or arbitrary user values stay on the Vapor path.
pub(crate) fn is_compiled_scalar_expr_with_shadows(
    expr: &Expr,
    shadowed_names: &HashSet<String>,
) -> bool {
    match unwrap_expr(expr) {
        Expr::Lit(Lit::Str(_) | Lit::Bool(_) | Lit::Null(_) | Lit::Num(_) | Lit::BigInt(_)) => true,
        Expr::Ident(ident) => ident.sym.as_ref() == "undefined",
        // `.value` belongs to the Vapor ref facade and therefore cannot share the
        // lightweight compiled owner. Compiled signals use the explicit `.get()` contract.
        Expr::Member(_) => false,
        Expr::Call(call) => is_scalar_accessor_call(call, shadowed_names),
        Expr::Unary(unary) => {
            !matches!(unary.op, UnaryOp::Delete)
                && is_compiled_scalar_expr_with_shadows(unary.arg.as_ref(), shadowed_names)
        }
        Expr::Bin(binary) => {
            is_compiled_scalar_expr_with_shadows(binary.left.as_ref(), shadowed_names)
                && is_compiled_scalar_expr_with_shadows(binary.right.as_ref(), shadowed_names)
        }
        Expr::Cond(cond) => {
            is_compiled_scalar_expr_with_shadows(cond.test.as_ref(), shadowed_names)
                && is_compiled_scalar_expr_with_shadows(cond.cons.as_ref(), shadowed_names)
                && is_compiled_scalar_expr_with_shadows(cond.alt.as_ref(), shadowed_names)
        }
        Expr::Tpl(template) => template
            .exprs
            .iter()
            .all(|expr| is_compiled_scalar_expr_with_shadows(expr.as_ref(), shadowed_names)),
        Expr::Seq(sequence) => sequence
            .exprs
            .iter()
            .all(|expr| is_compiled_scalar_expr_with_shadows(expr.as_ref(), shadowed_names)),
        _ => false,
    }
}

#[cfg(test)]
pub(crate) fn is_compiled_scalar_expr(expr: &Expr) -> bool {
    is_compiled_scalar_expr_with_shadows(expr, &HashSet::new())
}

/// Emit a text node whose data is updated by an owner-captured compiled effect.
/// Returns `None` without mutating `stmts` when the expression is not proven scalar.
pub(crate) fn emit_compiled_text_binding(
    vt: &mut VaporTransform,
    parent: &Ident,
    container: &JSXExprContainer,
    stmts: &mut Vec<Stmt>,
) -> Option<Ident> {
    let JSXExpr::Expr(expr) = &container.expr else {
        return None;
    };
    let inner = unwrap_expr(expr.as_ref());
    if !is_compiled_reactive_scalar_expr(vt, inner, &vt.current_scalar_constructor_shadows()) {
        return None;
    }

    let node = vt.next_el_ident();
    let create_text = call_ident("_$compiledCreateTextNode", vec![string_expr("")]);
    stmts.push(const_decl(node.clone(), create_text));
    stmts.push(Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(call_ident(
            "_$compiledAppendChild",
            vec![Expr::Ident(parent.clone()), Expr::Ident(node.clone())],
        )),
    }));
    emit_compiled_text_effect(vt, &node, container, stmts)?;
    Some(node)
}

pub(crate) fn is_compiled_text_container(
    vt: &VaporTransform,
    container: &JSXExprContainer,
) -> bool {
    let JSXExpr::Expr(expr) = &container.expr else {
        return false;
    };
    let inner = unwrap_expr(expr.as_ref());
    let shadows = vt.current_scalar_constructor_shadows();
    let explicitly_coerced = matches!(
        inner,
        Expr::Call(CallExpr {
            callee: Callee::Expr(callee),
            args,
            ..
        }) if matches!(unwrap_expr(callee.as_ref()), Expr::Ident(name)
            if matches!(name.sym.as_ref(), "String" | "Number" | "Boolean")
                && !shadows.contains(name.sym.as_ref()))
            && args.len() == 1
            && args[0].spread.is_none()
    );
    if !explicitly_coerced {
        struct RenderableLocalRead<'a> {
            names: &'a HashSet<String>,
            found: bool,
        }
        impl Visit for RenderableLocalRead<'_> {
            fn visit_ident(&mut self, ident: &Ident) {
                self.found |= self.names.contains(ident.sym.as_ref())
                    && !ident.sym.starts_with("_$rueCompiledProp")
                    && !ident.sym.starts_with("_$row");
            }
        }

        let renderable_names = vt.current_renderable_local_names();
        let mut read = RenderableLocalRead { names: &renderable_names, found: false };
        inner.visit_with(&mut read);
        if read.found {
            return false;
        }
    }
    is_compiled_reactive_scalar_expr(vt, inner, &shadows)
}

/// Bind a compiler-proven scalar expression to a text node that already exists.
/// Returns `None` without mutating `stmts` when the expression is not proven scalar.
pub(crate) fn emit_compiled_text_effect(
    vt: &mut VaporTransform,
    node: &Ident,
    container: &JSXExprContainer,
    stmts: &mut Vec<Stmt>,
) -> Option<()> {
    let JSXExpr::Expr(expr) = &container.expr else {
        return None;
    };
    let inner = unwrap_expr(expr.as_ref());
    if !is_compiled_reactive_scalar_expr(vt, inner, &vt.current_scalar_constructor_shadows()) {
        return None;
    }

    let arrow = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(inner.clone()))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    stmts.push(Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(call_ident("_$compiledText", vec![Expr::Ident(node.clone()), arrow])),
    }));
    Some(())
}

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
            let list_stmt_start = stmts.len();
            if let Expr::Call(call) = inner.clone()
                && crate::element_list::try_build_list_from_map(vt, root, &call, stmts)
                && stmts.len() > list_stmt_start
            {
                return;
            }
            let is_children = crate::utils::is_children_member_expr(inner);

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
            let render_once = super::expr::is_empty_deps_memoized_jsx_expr(inner)
                || super::expr::is_empty_deps_memoized_jsx_expr(&expr_for_slot);

            if maybe_static || render_once {
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
                let watch_expr = call_ident("effect", vec![arrow]);
                stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(watch_expr) }));
            }
        }
    }
}

#[cfg(test)]
#[path = "expr_container_tests.rs"]
mod tests;
