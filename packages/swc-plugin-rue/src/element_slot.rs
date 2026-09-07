use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;

use crate::emit::*;
use crate::vapor::VaporTransform;

/*
插槽渲染：
- 目标：统一 props.children 或任意 slot 的渲染路径，在锚点前插入片段；
- 新协议策略：直接把原始 slot / children 值交给 `renderAnchor`，由 runtime 的 Renderable/compat 边界统一处理。
- 动机：编译器不再提前依赖旧的中间对象规范化 helper，避免把历史 compat 逻辑继续固化进输出。
- 当前统一使用单注释锚点 + `renderAnchor`，不再生成或维护双边界区间。
*/
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
    _vt: &mut VaporTransform,
    el_ident: &Ident,
    anchor: &Ident,
    inner_expr: &Expr,
    stmts: &mut Vec<Stmt>,
) {
    if crate::element_expr::is_compiled_slot_source_expr(inner_expr) {
        render_compiled_slot_for_at(el_ident, &Expr::Ident(anchor.clone()), inner_expr, stmts);
        return;
    }
    // 槽值：对于标识符/成员表达式使用括号包裹以保证后续判断
    let expr_for_slot = match inner_expr.clone() {
        Expr::Member(_) | Expr::Ident(_) => {
            Expr::Paren(ParenExpr { span: DUMMY_SP, expr: Box::new(inner_expr.clone()) })
        }
        _ => inner_expr.clone(),
    };
    // 保存 slot 原值，并直接交给 runtime 新协议入口进行渲染
    let decl_slot = const_decl(ident("__slot"), expr_for_slot);

    let render_call = Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(Expr::Ident(ident("renderAnchor")))),
        args: vec![
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(ident("__slot"))) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(el_ident.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(anchor.clone())) },
        ],
        type_args: None,
        ctxt: SyntaxContext::empty(),
    });
    let untrack_render = Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(Expr::Ident(ident("untrack")))),
        args: vec![ExprOrSpread {
            spread: None,
            expr: Box::new(Expr::Arrow(ArrowExpr {
                span: DUMMY_SP,
                params: vec![],
                body: Box::new(BlockStmtOrExpr::Expr(Box::new(render_call))),
                is_async: false,
                is_generator: false,
                type_params: None,
                return_type: None,
                ctxt: SyntaxContext::empty(),
            })),
        }],
        type_args: None,
        ctxt: SyntaxContext::empty(),
    });
    let arrow = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            stmts: vec![
                decl_slot,
                Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(untrack_render) }),
            ],
        })),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    // watch 包裹，保证插槽值变化时进行增量更新
    let watch = call_ident("effect", vec![arrow]);
    stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(watch) }));
}

pub(crate) fn render_compiled_slot_for_at(
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
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(inner_expr.clone()))),
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
    let slot_ident = vt.next_list_ident();
    let expr_for_slot = match inner_expr.clone() {
        Expr::Member(_) | Expr::Ident(_) => {
            Expr::Paren(ParenExpr { span: DUMMY_SP, expr: Box::new(inner_expr.clone()) })
        }
        _ => inner_expr.clone(),
    };
    stmts.push(const_decl(slot_ident.clone(), expr_for_slot));

    let render_call = Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(Expr::Ident(ident("renderAnchor")))),
        args: vec![
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(slot_ident)) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(el_ident.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(anchor.clone())) },
        ],
        type_args: None,
        ctxt: SyntaxContext::empty(),
    });
    stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(render_call) }));
}

#[cfg(test)]
#[path = "element_slot_tests.rs"]
mod tests;
