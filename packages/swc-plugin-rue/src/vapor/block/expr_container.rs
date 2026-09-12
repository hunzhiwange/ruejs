use std::collections::HashSet;

use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitWith};

use crate::emit::{call_ident, const_decl, string_expr};
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
            Some(ReactiveKind::Signal | ReactiveKind::SlotsValue) | None => false,
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
    matches!(
        vt.reactive_kind(signal.sym.as_ref()),
        Some(ReactiveKind::Signal | ReactiveKind::RefLike)
    )
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
        Expr::Ident(ident) => {
            ident.sym.as_ref() == "undefined"
                || vt.reactive_kind(ident.sym.as_ref())
                    == Some(crate::reactive_provenance::ReactiveKind::RefLike)
        }
        Expr::Member(member) => reactive_member_is_scalar(vt, member),
        Expr::Call(call) => {
            is_reactive_scalar_accessor_call(vt, call, shadowed_names)
                || crate::element_expr::is_proven_plain_call_expr(vt, expr)
        }
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

pub(crate) fn display_scalar_expr(vt: &VaporTransform, expr: &Expr) -> Expr {
    match unwrap_expr(expr) {
        Expr::Ident(ident)
            if vt.reactive_kind(ident.sym.as_ref())
                == Some(crate::reactive_provenance::ReactiveKind::RefLike) =>
        {
            Expr::Member(crate::emit::member(ident.clone(), "value"))
        }
        inner => inner.clone(),
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
    if !is_compiled_text_value(vt, inner) {
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

// Reactive provenance proves how to track props, not that their values are
// text. Keep the capability checks for compiled roots separate from text-only
// emission: named props may contain JSX, fragments, or collections.
fn is_compiled_text_value(vt: &VaporTransform, expr: &Expr) -> bool {
    let shadows = vt.current_scalar_constructor_shadows();
    if !is_compiled_reactive_scalar_expr(vt, expr, &shadows) {
        return false;
    }
    if let Expr::Call(call) = unwrap_expr(expr)
        && (matches!(&call.callee, Callee::Expr(callee)
            if matches!(unwrap_expr(callee), Expr::Ident(name)
                if matches!(name.sym.as_ref(), "String" | "Number" | "Boolean")
                    && !shadows.contains(name.sym.as_ref())))
            || crate::reactive_provenance::is_scalar_call(&vt.plain_local_scopes, expr))
    {
        return true;
    }
    struct PropRead<'a> {
        vt: &'a VaporTransform,
        found: bool,
    }
    impl Visit for PropRead<'_> {
        fn visit_ident(&mut self, ident: &Ident) {
            self.found |=
                self.vt.reactive_kind(ident.sym.as_ref()) == Some(ReactiveKind::PropsValue);
        }
        fn visit_call_expr(&mut self, call: &CallExpr) {
            self.found |= crate::compiled_component::is_static_prop_get_call(call);
            call.visit_children_with(self);
        }
    }
    let mut read = PropRead { vt, found: false };
    expr.visit_with(&mut read);
    !read.found
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
    if !explicitly_coerced
        && !crate::reactive_provenance::is_scalar_call(&vt.plain_local_scopes, inner)
    {
        struct RenderableLocalRead<'a> {
            names: &'a HashSet<String>,
            found: bool,
        }
        impl Visit for RenderableLocalRead<'_> {
            fn visit_ident(&mut self, ident: &Ident) {
                self.found |= self.names.contains(ident.sym.as_ref())
                    && !ident.sym.starts_with("_$rueCompiledProp")
                    && !ident.sym.starts_with("_$row")
                    && !ident.sym.starts_with("_$state");
            }
        }

        let renderable_names = vt.current_renderable_local_names();
        let mut read = RenderableLocalRead { names: &renderable_names, found: false };
        inner.visit_with(&mut read);
        if read.found {
            return false;
        }
    }
    is_compiled_text_value(vt, inner)
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
    if !is_compiled_text_value(vt, inner) {
        return None;
    }

    let arrow = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(display_scalar_expr(vt, inner)))),
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

/// JSX 表达式容器改写：
/// - 已证明的标量由 compiled text binding 处理；
/// - map 优先进入 keyed-list lowering；
/// - 其余 JSX 值统一进入 compiled slot factory ABI，保持 owner 生命周期一致。
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

            let anchor = super::utils::emit_markers(vt, root, is_children, stmts);
            let expr_for_slot =
                if is_children { inner.clone() } else { super::expr::build_slot_expr(vt, inner) };
            crate::element_slot::render_compiled_slot_for_at(
                vt,
                root,
                &Expr::Ident(anchor),
                &expr_for_slot,
                stmts,
            );
        }
    }
}

#[cfg(test)]
#[path = "expr_container_tests.rs"]
mod tests;
