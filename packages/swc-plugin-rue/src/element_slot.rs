use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;

use crate::emit::*;
use crate::vapor::VaporTransform;

// Slots use only compiler-created BlockFactory values.
pub fn render_between_for_slot(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    inner_expr: &Expr,
    is_children: bool,
    stmts: &mut Vec<Stmt>,
) {
    let anchor = vt.next_list_ident();
    let anchor_marker: &str = if is_children { "rue:children:anchor" } else { "rue:slot:anchor" };
    let make_anchor = call_ident("_$createComment", vec![string_expr(anchor_marker)]);
    stmts.push(const_decl(anchor.clone(), make_anchor));
    stmts.push(append_child(el_ident.clone(), Expr::Ident(anchor.clone())));
    render_between_for_slot_at(vt, el_ident, &anchor, inner_expr, stmts);
}

pub(crate) fn render_between_for_slot_at(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    anchor: &Ident,
    inner_expr: &Expr,
    stmts: &mut Vec<Stmt>,
) {
    render_compiled_slot_for_at(vt, el_ident, &Expr::Ident(anchor.clone()), inner_expr, stmts);
}

// Lift compiler-created block expressions in fallback value positions into factories.
// The runtime never guesses whether a slot value is a block or a factory.
pub(crate) fn closed_slot_value(vt: &mut VaporTransform, expr: &Expr) -> Expr {
    // Proven slot sources already carry the target/props/owner factory ABI.
    if crate::element_expr::is_compiled_slot_expr(vt, expr) {
        return expr.clone();
    }
    match crate::utils::unwrap_expr(expr) {
        Expr::Call(call)
            if matches!(&call.callee, Callee::Expr(callee)
            if matches!(callee.as_ref(), Expr::Ident(name)
                if matches!(
                    name.sym.as_ref(),
                    "_$compiledRoot"
                        | "_$compiledBranch"
                        | "_$compiledWithKey"
                        | "_$createComponent"
                        | "_$compiledComponent"
                ))) =>
        {
            let create = Expr::Arrow(ArrowExpr {
                span: DUMMY_SP,
                ctxt: SyntaxContext::empty(),
                params: vec![],
                body: Box::new(BlockStmtOrExpr::Expr(Box::new(expr.clone()))),
                is_async: false,
                is_generator: false,
                type_params: None,
                return_type: None,
            });
            Expr::Arrow(ArrowExpr {
                span: DUMMY_SP,
                ctxt: SyntaxContext::empty(),
                params: ["target", "slotProps", "owner"]
                    .iter()
                    .map(|name| Pat::Ident(BindingIdent { id: ident(name), type_ann: None }))
                    .collect(),
                body: Box::new(BlockStmtOrExpr::Expr(Box::new(call_ident(
                    "_$mountCompiledSlotFactory",
                    vec![Expr::Ident(ident("target")), Expr::Ident(ident("owner")), create],
                )))),
                is_async: false,
                is_generator: false,
                type_params: None,
                return_type: None,
            })
        }
        Expr::Call(call)
            if matches!(&call.callee, Callee::Expr(callee) if matches!(crate::utils::unwrap_expr(callee.as_ref()), Expr::Ident(_)))
                && call.args.iter().all(|arg| arg.spread.is_none())
                && crate::element_expr::is_opaque_renderable_call_expr(vt, call) =>
        {
            let mut deferred_call = call.clone();
            let mut capture_params = Vec::with_capacity(call.args.len());
            let mut capture_args = Vec::with_capacity(call.args.len());
            for arg in &call.args {
                let captured = vt.next_slot_ident();
                capture_params
                    .push(Pat::Ident(BindingIdent { id: captured.clone(), type_ann: None }));
                capture_args.push(arg.clone());
                deferred_call.args[capture_params.len() - 1] =
                    ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(captured)) };
            }

            let value_factory =
                call_ident("_$compiledValueFactory", vec![Expr::Call(deferred_call)]);
            let deferred_factory = Expr::Arrow(ArrowExpr {
                span: DUMMY_SP,
                ctxt: SyntaxContext::empty(),
                params: ["target", "slotProps", "owner"]
                    .iter()
                    .map(|name| Pat::Ident(BindingIdent { id: ident(name), type_ann: None }))
                    .collect(),
                body: Box::new(BlockStmtOrExpr::Expr(Box::new(Expr::Call(CallExpr {
                    span: DUMMY_SP,
                    ctxt: SyntaxContext::empty(),
                    callee: Callee::Expr(Box::new(value_factory)),
                    args: ["target", "slotProps", "owner"]
                        .iter()
                        .map(|name| ExprOrSpread {
                            spread: None,
                            expr: Box::new(Expr::Ident(ident(name))),
                        })
                        .collect(),
                    type_args: None,
                })))),
                is_async: false,
                is_generator: false,
                type_params: None,
                return_type: None,
            });

            if capture_params.is_empty() {
                deferred_factory
            } else {
                Expr::Call(CallExpr {
                    span: DUMMY_SP,
                    ctxt: SyntaxContext::empty(),
                    callee: Callee::Expr(Box::new(Expr::Paren(ParenExpr {
                        span: DUMMY_SP,
                        expr: Box::new(Expr::Arrow(ArrowExpr {
                            span: DUMMY_SP,
                            ctxt: SyntaxContext::empty(),
                            params: capture_params,
                            body: Box::new(BlockStmtOrExpr::Expr(Box::new(deferred_factory))),
                            is_async: false,
                            is_generator: false,
                            type_params: None,
                            return_type: None,
                        })),
                    }))),
                    args: capture_args,
                    type_args: None,
                })
            }
        }
        Expr::Cond(cond) => {
            let mut cond = cond.clone();
            cond.cons = Box::new(closed_slot_value(vt, &cond.cons));
            cond.alt = Box::new(closed_slot_value(vt, &cond.alt));
            Expr::Cond(cond)
        }
        Expr::Lit(_) => crate::element_expr::compiled_slot_factory_expr(vt, expr)
            .unwrap_or_else(|| panic!("Rue slot literal requires a compiled factory")),
        _ => {
            let displayed = crate::vapor::display_scalar_expr(vt, expr);
            let value = if crate::vapor::is_compiled_text_value(vt, expr) {
                expr.clone()
            } else {
                crate::element_expr::string_call_operand(&displayed).unwrap_or(displayed)
            };
            call_ident("_$compiledValueFactory", vec![value])
        }
    }
}

pub(crate) fn render_compiled_slot_for_at(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    before: &Expr,
    inner_expr: &Expr,
    stmts: &mut Vec<Stmt>,
) {
    let target = Expr::Object(ObjectLit {
        span: DUMMY_SP,
        props: vec![
            PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                key: PropName::Ident(ident_name("parent")),
                value: Box::new(Expr::Ident(el_ident.clone())),
            }))),
            PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                key: PropName::Ident(ident_name("before")),
                value: Box::new(before.clone()),
            }))),
        ],
    });
    let read_factory = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(closed_slot_value(vt, inner_expr)))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    let read_props = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(Expr::Paren(ParenExpr {
            span: DUMMY_SP,
            expr: Box::new(Expr::Object(ObjectLit { span: DUMMY_SP, props: vec![] })),
        })))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    stmts.push(Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(call_ident("_$mountCompiledSlotAt", vec![target, read_factory, read_props])),
    }));
}

/// Mount one compiler-proven slot factory at a template hole without retaining the
/// temporary comment. The real next sibling (or `null` at the tail) remains the
/// stable insertion boundary for future component updates.
pub(crate) fn render_compiled_factory_for_slot_at(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    anchor: &Ident,
    factory_expr: Expr,
    stmts: &mut Vec<Stmt>,
) {
    let factory = vt.next_slot_ident();
    let before = vt.next_el_ident();
    stmts.push(const_decl(factory.clone(), factory_expr));
    stmts.push(const_decl(
        before.clone(),
        Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(Expr::Ident(anchor.clone())),
            prop: MemberProp::Ident(ident_name("nextSibling")),
        }),
    ));
    stmts.push(Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(call_member(
            el_ident.clone(),
            "removeChild",
            vec![Expr::Ident(anchor.clone())],
        )),
    }));

    let target = Expr::Object(ObjectLit {
        span: DUMMY_SP,
        props: vec![
            PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                key: PropName::Ident(ident_name("parent")),
                value: Box::new(Expr::Ident(el_ident.clone())),
            }))),
            PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                key: PropName::Ident(ident_name("before")),
                value: Box::new(Expr::Ident(before)),
            }))),
        ],
    });
    let read_factory = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(Expr::Ident(factory)))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    let read_props = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(Expr::Paren(ParenExpr {
            span: DUMMY_SP,
            expr: Box::new(Expr::Object(ObjectLit { span: DUMMY_SP, props: vec![] })),
        })))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    stmts.push(Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(call_ident("_$mountCompiledSlotAt", vec![target, read_factory, read_props])),
    }));
}

pub fn render_once_for_slot(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    inner_expr: &Expr,
    stmts: &mut Vec<Stmt>,
) {
    let anchor = vt.next_list_ident();
    let make_anchor = call_ident("_$createComment", vec![string_expr("rue:slot:anchor")]);
    stmts.push(const_decl(anchor.clone(), make_anchor));
    stmts.push(append_child(el_ident.clone(), Expr::Ident(anchor.clone())));

    render_once_for_slot_at(vt, el_ident, &anchor, inner_expr, stmts);
}

/// `_$compiledBranch` owns its reactive replacement effect, so the surrounding
/// slot only mounts the stable branch handle once.
pub fn render_compiled_branch_for_slot(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    branch_expr: &Expr,
    stmts: &mut Vec<Stmt>,
) {
    let branch = vt.next_list_ident();
    stmts.push(const_decl(branch.clone(), branch_expr.clone()));
    stmts.push(Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(call_member(
            branch,
            "__rue_compiled_mount",
            vec![Expr::Ident(el_ident.clone())],
        )),
    }));
}

pub(crate) fn render_compiled_branch_for_slot_at(
    _vt: &mut VaporTransform,
    el_ident: &Ident,
    before: &Expr,
    branch_expr: &Expr,
    stmts: &mut Vec<Stmt>,
) {
    let reader = crate::element_expr::compiled_branch_reader_from_handle(branch_expr)
        .unwrap_or_else(|| branch_expr.clone());
    stmts.push(Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(call_ident(
            "_$compiledBranchAt",
            vec![Expr::Ident(el_ident.clone()), before.clone(), reader],
        )),
    }));
}

pub(crate) fn render_once_for_slot_at(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    anchor: &Ident,
    inner_expr: &Expr,
    stmts: &mut Vec<Stmt>,
) {
    if matches!(crate::utils::unwrap_expr(inner_expr), Expr::Object(_) | Expr::Array(_)) {
        panic!("Rue slots require a compiled BlockFactory");
    }
    let factory = vt.next_list_ident();
    stmts.push(const_decl(factory.clone(), inner_expr.clone()));
    render_compiled_slot_for_at(
        vt,
        el_ident,
        &Expr::Ident(anchor.clone()),
        &Expr::Ident(factory),
        stmts,
    );
}

#[cfg(test)]
#[path = "element_slot_tests.rs"]
mod tests;
