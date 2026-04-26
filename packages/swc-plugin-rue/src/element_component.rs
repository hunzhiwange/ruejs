use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::atoms::Atom;

use crate::emit::*;
use crate::vapor::VaporTransform;

/*
元素级组件编译：
- 目标：在父元素下以注释锚点占位，结合 renderBetween 将组件输出插入其间；
- children 处理：默认编译为 props.children 的 DocumentFragment；对于默认需要原始 keyed JSX children 的内建组件（如 TransitionGroup），保留原始 JSX children；
- 内建 Fragment：若 children 已被改写为独立可挂载值，则直接渲染该值，不再额外包一层 <Fragment children={...}/>；
- 静态优化：无动态 props/children 的组件直接一次性渲染；其它包裹 watchEffect 以支持更新。
*/
pub(crate) struct ComponentChildrenRewrite {
    pub(crate) stmts: Vec<Stmt>,
    pub(crate) direct_render_expr: Option<Expr>,
}

fn extract_jsx_key_expr(jsx_el: &JSXElement) -> Option<Expr> {
    for attr in &jsx_el.opening.attrs {
        if let JSXAttrOrSpread::JSXAttr(attr) = attr {
            if let JSXAttrName::Ident(name) = &attr.name {
                if name.sym.as_ref() != "key" {
                    continue;
                }
                match &attr.value {
                    Some(JSXAttrValue::Str(s)) => {
                        return Some(Expr::Lit(Lit::Str(Str {
                            span: DUMMY_SP,
                            value: s.value.clone(),
                            raw: None,
                        })));
                    }
                    Some(JSXAttrValue::JSXExprContainer(ec)) => {
                        if let JSXExpr::Expr(expr) = &ec.expr {
                            return Some(crate::utils::unwrap_expr(expr.as_ref()).clone());
                        }
                    }
                    _ => {}
                }
            }
        }
    }
    None
}

fn wrap_transition_group_child_expr(expr: Expr, key_expr: Option<Expr>) -> Expr {
    if let Some(key_expr) = key_expr {
        call_ident("_$vaporWithKey", vec![expr, key_expr])
    } else {
        expr
    }
}

fn rewrite_transition_group_render_expr(vt: &mut VaporTransform, expr: &Expr) -> Expr {
    let inner = crate::utils::unwrap_expr(expr);
    if let Expr::Call(call) = inner {
        if let Some(mapped) = rewrite_transition_group_map_expr(vt, call) {
            return mapped;
        }
    }

    match inner {
        Expr::JSXElement(jsx_el) => wrap_transition_group_child_expr(
            crate::element_expr::make_expr_for_slot(vt, inner),
            extract_jsx_key_expr(jsx_el),
        ),
        Expr::JSXFragment(_) => crate::element_expr::make_expr_for_slot(vt, inner),
        Expr::Cond(CondExpr { test, cons, alt, .. }) => Expr::Cond(CondExpr {
            span: DUMMY_SP,
            test: test.clone(),
            cons: Box::new(rewrite_transition_group_render_expr(vt, cons.as_ref())),
            alt: Box::new(rewrite_transition_group_render_expr(vt, alt.as_ref())),
        }),
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, left, right, .. }) => Expr::Cond(CondExpr {
            span: DUMMY_SP,
            test: left.clone(),
            cons: Box::new(rewrite_transition_group_render_expr(vt, right.as_ref())),
            alt: Box::new(string_expr("")),
        }),
        _ => inner.clone(),
    }
}

fn rewrite_transition_group_map_callback_body(
    vt: &mut VaporTransform,
    body: &BlockStmtOrExpr,
) -> BlockStmtOrExpr {
    match body {
        BlockStmtOrExpr::Expr(expr) => {
            Box::new(rewrite_transition_group_render_expr(vt, expr.as_ref())).into()
        }
        BlockStmtOrExpr::BlockStmt(block) => {
            let mut next_block = block.clone();
            rewrite_transition_group_returns_in_block(vt, &mut next_block);
            BlockStmtOrExpr::BlockStmt(next_block)
        }
    }
}

fn rewrite_transition_group_returns_in_block(vt: &mut VaporTransform, block: &mut BlockStmt) {
    for stmt in &mut block.stmts {
        rewrite_transition_group_returns_in_stmt(vt, stmt);
    }
}

fn rewrite_transition_group_returns_in_stmt(vt: &mut VaporTransform, stmt: &mut Stmt) {
    match stmt {
        Stmt::Return(ret) => {
            if let Some(arg) = &ret.arg {
                ret.arg = Some(Box::new(rewrite_transition_group_render_expr(vt, arg.as_ref())));
            }
        }
        Stmt::Block(block) => rewrite_transition_group_returns_in_block(vt, block),
        Stmt::If(if_stmt) => {
            rewrite_transition_group_returns_in_stmt(vt, &mut if_stmt.cons);
            if let Some(alt) = &mut if_stmt.alt {
                rewrite_transition_group_returns_in_stmt(vt, alt);
            }
        }
        Stmt::Switch(switch_stmt) => {
            for case in &mut switch_stmt.cases {
                for cons in &mut case.cons {
                    rewrite_transition_group_returns_in_stmt(vt, cons);
                }
            }
        }
        Stmt::Try(try_stmt) => {
            rewrite_transition_group_returns_in_block(vt, &mut try_stmt.block);
            if let Some(handler) = &mut try_stmt.handler {
                rewrite_transition_group_returns_in_block(vt, &mut handler.body);
            }
            if let Some(finalizer) = &mut try_stmt.finalizer {
                rewrite_transition_group_returns_in_block(vt, finalizer);
            }
        }
        _ => {}
    }
}

fn rewrite_transition_group_map_expr(vt: &mut VaporTransform, call: &CallExpr) -> Option<Expr> {
    let Callee::Expr(callee) = &call.callee else {
        return None;
    };
    let Expr::Member(MemberExpr { obj, prop: MemberProp::Ident(prop_ident), .. }) = &**callee
    else {
        return None;
    };
    if prop_ident.sym.as_ref() != "map" || call.args.len() != 1 {
        return None;
    }
    let callback_expr = crate::utils::unwrap_expr(call.args[0].expr.as_ref());
    let Expr::Arrow(arrow) = callback_expr else {
        return None;
    };
    let rewritten_arrow = Expr::Arrow(ArrowExpr {
        span: arrow.span,
        params: arrow.params.clone(),
        body: Box::new(rewrite_transition_group_map_callback_body(vt, arrow.body.as_ref())),
        is_async: arrow.is_async,
        is_generator: arrow.is_generator,
        type_params: arrow.type_params.clone(),
        return_type: arrow.return_type.clone(),
        ctxt: arrow.ctxt,
    });
    Some(Expr::Call(CallExpr {
        span: call.span,
        callee: Callee::Expr(Box::new(Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: obj.clone(),
            prop: MemberProp::Ident(prop_ident.clone()),
        }))),
        args: vec![ExprOrSpread { spread: None, expr: Box::new(rewritten_arrow) }],
        type_args: call.type_args.clone(),
        ctxt: call.ctxt,
    }))
}

fn build_transition_group_children_expr(
    vt: &mut VaporTransform,
    children: &[JSXElementChild],
) -> Option<Expr> {
    let mut out: Vec<Option<Expr>> = Vec::new();
    for child in children {
        let expr = match child {
            JSXElementChild::JSXText(text) => {
                let normalized = crate::text::normalize_text(&text.value);
                if normalized.trim().is_empty() { None } else { Some(string_expr(&normalized)) }
            }
            JSXElementChild::JSXElement(el) => {
                Some(rewrite_transition_group_render_expr(vt, &Expr::JSXElement(el.clone())))
            }
            JSXElementChild::JSXFragment(frag) => {
                Some(rewrite_transition_group_render_expr(vt, &Expr::JSXFragment(frag.clone())))
            }
            JSXElementChild::JSXExprContainer(ec) => match &ec.expr {
                JSXExpr::JSXEmptyExpr(_) => None,
                JSXExpr::Expr(expr) => {
                    Some(rewrite_transition_group_render_expr(vt, expr.as_ref()))
                }
            },
            JSXElementChild::JSXSpreadChild(_) => None,
        };
        out.push(expr);
    }

    let mut exprs: Vec<Expr> = out.into_iter().flatten().collect();
    if exprs.is_empty() {
        return None;
    }
    if exprs.len() == 1 {
        return exprs.pop();
    }
    Some(Expr::Array(ArrayLit {
        span: DUMMY_SP,
        elems: exprs
            .into_iter()
            .map(|expr| Some(ExprOrSpread { spread: None, expr: Box::new(expr) }))
            .collect(),
    }))
}

/// 处理 JSX 组件元素：
/// - 在父节点下插入占位注释（start/end）
/// - 若组件存在内联 children，将其改写为 children 属性传入一个原生 DocumentFragment，
///   并在调用处直接编译这些子节点为原生 DOM 以便递归渲染
/// - 使用 `renderBetween` + `watchEffect` 在占位之间进行渲染
///   示例（参考 `tests/spec11.rs` 等）：
/// - 插入占位：`const _list1 = _$createComment("rue:slot:start"); const _list2 = _$createComment("rue:slot:end");`
/// - 包裹 children：`children={vapor(()=>{ const _root = _$createDocumentFragment(); ... return _root })}`
/// - 渲染：`watchEffect(()=>{ renderBetween(<Comp {...props} />, parent, start, end) })`
/// 组件 children 默认会被改写为 `children` 属性传入；
/// `TransitionGroup` 这类依赖原始 keyed JSX children 的组件在此处保留原始 children。
pub(crate) fn rewrite_component_children_to_props(
    vt: &mut VaporTransform,
    comp_el: &mut JSXElement,
) -> ComponentChildrenRewrite {
    let mut child_stmts: Vec<Stmt> = vec![];
    let mut direct_render_expr: Option<Expr> = None;

    let is_transition_group = crate::utils::is_transition_group_component(comp_el);

    if !comp_el.children.is_empty() && is_transition_group {
        if let Some(children_expr) = build_transition_group_children_expr(vt, &comp_el.children) {
            let mut new_attrs = comp_el.opening.attrs.clone();
            new_attrs.push(JSXAttrOrSpread::JSXAttr(JSXAttr {
                span: DUMMY_SP,
                name: JSXAttrName::Ident(IdentName { span: DUMMY_SP, sym: Atom::from("children") }),
                value: Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                    span: DUMMY_SP,
                    expr: JSXExpr::Expr(Box::new(children_expr)),
                })),
            }));
            comp_el.opening.attrs = new_attrs;
            comp_el.children = vec![];
            comp_el.opening.self_closing = true;
            comp_el.closing = None;
        }
        return ComponentChildrenRewrite { stmts: child_stmts, direct_render_expr };
    }

    if !comp_el.children.is_empty() {
        let child_ident = vt.next_child_ident();
        let mut used_simple = false;
        let mut meaningful: Vec<&JSXElementChild> = vec![];
        for c in &comp_el.children {
            match c {
                JSXElementChild::JSXText(t) => {
                    let txt = crate::text::normalize_text(&t.value);
                    if !txt.is_empty() {
                        meaningful.push(c);
                    }
                }
                _ => meaningful.push(c),
            }
        }
        if meaningful.len() == 1 {
            match meaningful[0] {
                JSXElementChild::JSXText(t) => {
                    let txt = crate::text::normalize_text(&t.value);
                    if let Some(content) =
                        crate::text::compute_jsx_text_content(&comp_el.children, 0, &txt)
                    {
                        child_stmts.push(const_decl(child_ident.clone(), string_expr(&content)));
                        used_simple = true;
                    }
                }
                JSXElementChild::JSXExprContainer(ec) => {
                    if let JSXExpr::Expr(expr) = &ec.expr {
                        let inner = crate::utils::unwrap_expr(expr.as_ref());
                        match inner {
                            Expr::Lit(Lit::Str(_)) | Expr::Lit(Lit::Num(_)) => {
                                child_stmts.push(const_decl(child_ident.clone(), inner.clone()));
                                used_simple = true;
                            }
                            _ if !crate::element_expr::contains_jsx_in_expr(inner) => {
                                child_stmts.push(const_decl(child_ident.clone(), inner.clone()));
                                used_simple = true;
                            }
                            _ => {}
                        }
                    }
                }
                _ => {}
            }
        }
        if !used_simple {
            let child_root = ident("_root");
            let mut child_body: Vec<Stmt> = vec![const_decl(
                child_root.clone(),
                call_ident("_$createDocumentFragment", vec![]),
            )];
            crate::element_children::emit_element_children(
                vt,
                &child_root,
                &comp_el.children,
                &mut child_body,
            );
            child_body.push(return_root(child_root.clone()));
            let arrow = Expr::Arrow(ArrowExpr {
                span: DUMMY_SP,
                params: vec![],
                body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                    span: DUMMY_SP,
                    ctxt: SyntaxContext::empty(),
                    stmts: child_body,
                })),
                is_async: false,
                is_generator: false,
                type_params: None,
                return_type: None,
                ctxt: SyntaxContext::empty(),
            });
            let child_vapor = call_ident("vapor", vec![arrow]);
            child_stmts.push(const_decl(child_ident.clone(), child_vapor));
        }

        if crate::utils::is_builtin_fragment_element(comp_el) {
            direct_render_expr = Some(Expr::Ident(child_ident.clone()));
        }

        let mut new_attrs = comp_el.opening.attrs.clone();
        new_attrs.push(JSXAttrOrSpread::JSXAttr(JSXAttr {
            span: DUMMY_SP,
            name: JSXAttrName::Ident(IdentName { span: DUMMY_SP, sym: Atom::from("children") }),
            value: Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                span: DUMMY_SP,
                expr: JSXExpr::Expr(Box::new(Expr::Ident(child_ident.clone()))),
            })),
        }));
        comp_el.opening.attrs = new_attrs;
        comp_el.children = vec![];
        comp_el.opening.self_closing = true;
        comp_el.closing = None;
    }

    ComponentChildrenRewrite { stmts: child_stmts, direct_render_expr }
}

pub fn build_component_element(
    vt: &mut VaporTransform,
    jsx_el: &JSXElement,
    parent: &Ident,
    stmts: &mut Vec<Stmt>,
) {
    let mut comp_el = jsx_el.clone();
    let rewrite = rewrite_component_children_to_props(vt, &mut comp_el);
    let slot_init_expr = rewrite
        .direct_render_expr
        .clone()
        .unwrap_or_else(|| Expr::JSXElement(Box::new(comp_el.clone())));

    let is_static = !crate::utils::is_transition_group_component(&comp_el)
        && (crate::utils::is_static_component_without_props(&comp_el)
            || crate::utils::is_static_component_children_ident(&comp_el)
            || crate::utils::component_has_no_dynamic_props_excluding_children(&comp_el));

    let anchor = vt.next_list_ident();
    let make_anchor = call_ident("_$createComment", vec![string_expr("rue:component:anchor")]);
    stmts.push(const_decl(anchor.clone(), make_anchor));
    stmts.push(append_child(parent.clone(), Expr::Ident(anchor.clone())));

    if !rewrite.stmts.is_empty() {
        for s in rewrite.stmts {
            stmts.push(s);
        }
    }

    let slot_ident = vt.next_slot_ident();
    let decl_slot = const_decl(slot_ident.clone(), slot_init_expr.clone());
    let render_call = Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(Expr::Ident(ident("renderAnchor")))),
        args: vec![
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(slot_ident.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(parent.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(anchor.clone())) },
        ],
        type_args: None,
        ctxt: SyntaxContext::empty(),
    });

    if is_static {
        stmts.push(Stmt::Decl(Decl::Var(Box::new(VarDecl {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            decls: vec![VarDeclarator {
                span: DUMMY_SP,
                name: Pat::Ident(BindingIdent { id: slot_ident.clone(), type_ann: None }),
                init: Some(Box::new(slot_init_expr.clone())),
                definite: false,
            }],
            kind: VarDeclKind::Const,
            declare: false,
        }))));
        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(render_call) }));
    } else {
        let render_arrow = Expr::Arrow(ArrowExpr {
            span: DUMMY_SP,
            params: vec![],
            body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                span: DUMMY_SP,
                ctxt: SyntaxContext::empty(),
                stmts: vec![
                    decl_slot,
                    Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(render_call) }),
                ],
            })),
            is_async: false,
            is_generator: false,
            type_params: None,
            return_type: None,
            ctxt: SyntaxContext::empty(),
        });
        let watch = call_ident("watchEffect", vec![render_arrow]);
        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(watch) }));
    }
}
