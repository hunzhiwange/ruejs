use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::atoms::Atom;

use crate::emit::*;
use crate::text::normalize_text;

use super::VaporTransform;

/*
组件块编译说明（中文）：
- 使用 DocumentFragment 作为组件片段根，并在其下插入 "rue:component:start/end" 注释锚点；
- 若存在内联 children，则将其编译为 props.children（尽可能简化为文本/字面量；否则编译为 Rue VNode）；
- 静态组件直接一次性渲染（renderBetween）；动态组件通过 watchEffect 包裹以支持响应式更新。
*/
/// 组件根渲染块：
/// - 根为 `DocumentFragment`，在其下插入组件占位注释
/// - 若组件存在内联 children，则先编译为 `children` 属性传入一个 Rue VNode
/// - 使用 `watchEffect` + `renderBetween` 在占位注释之间渲染组件本身
///   参考测试：`tests/components.rs`、`tests/spec11.rs`
pub fn emit_component_root(transform: &mut VaporTransform, el: &JSXElement) -> BlockStmt {
    let root = ident("_root");
    let mut stmts: Vec<Stmt> = Vec::new();
    let start = transform.next_list_ident();
    let end = transform.next_list_ident();
    let make_start = call_ident("_$createComment", vec![string_expr("rue:component:start")]);
    let make_end = call_ident("_$createComment", vec![string_expr("rue:component:end")]);

    // 组件片段根创建：
    // - callee：`_$createDocumentFragment`
    // - args：空
    // - ctxt：统一 `SyntaxContext::empty()`（由 emit::call_ident 设置）
    let create_root = call_ident("_$createDocumentFragment", vec![]);
    stmts.push(const_decl(root.clone(), create_root));

    let mut comp_el = el.clone();
    let mut child_stmts: Vec<Stmt> = vec![];
    // 处理内联 children：优先简化为文本/字面量，否则编译为 Rue VNode 并作为 props.children 传入
    if !comp_el.children.is_empty() {
        let child_ident = transform.next_child_ident();
        let mut used_simple = false;
        // 过滤掉仅含空白的 JSXText，保留有意义的子节点
        let mut meaningful: Vec<&JSXElementChild> = vec![];
        for c in &comp_el.children {
            match c {
                JSXElementChild::JSXText(t) => {
                    let txt = normalize_text(&t.value);
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
                    let txt = normalize_text(&t.value);
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
            crate::vapor::block::children::emit_children(
                transform,
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
            // children 包裹为 vapor：
            // - callee：`vapor`
            // - args：箭头函数块体
            // - 返回：{ vaporElement: DocumentFragment }
            let child_vapor = call_ident("vapor", vec![arrow]);
            child_stmts.push(const_decl(child_ident.clone(), child_vapor));
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

    // 静态组件优化：无动态 props/children 的组件直接一次性渲染；否则走 watch 包裹
    let is_static = crate::utils::is_static_component_without_props(&comp_el)
        || crate::utils::component_has_no_dynamic_props_excluding_children(&comp_el)
        || crate::utils::is_static_component_children_ident(&comp_el);
    if is_static && transform.optimize_static_slots && !transform.optimize_component_anchors {
        let anchor = transform.next_list_ident();
        let slot_ident = transform.next_slot_ident();
        stmts.push(const_decl(
            anchor.clone(),
            call_ident("_$createComment", vec![string_expr("rue:static:component")]),
        ));
        stmts.push(append_child(root.clone(), Expr::Ident(anchor.clone())));
        if !child_stmts.is_empty() {
            for s in child_stmts {
                stmts.push(s);
            }
        }
        stmts.push(Stmt::Decl(Decl::Var(Box::new(VarDecl {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            decls: vec![VarDeclarator {
                span: DUMMY_SP,
                name: Pat::Ident(BindingIdent { id: slot_ident.clone(), type_ann: None }),
                init: Some(Box::new(Expr::JSXElement(Box::new(comp_el.clone())))),
                definite: false,
            }],
            kind: VarDeclKind::Const,
            declare: false,
        }))));
        stmts.push(Stmt::Expr(ExprStmt {
            span: DUMMY_SP,
            expr: Box::new(Expr::Call(CallExpr {
                span: DUMMY_SP,
                callee: Callee::Expr(Box::new(Expr::Ident(ident("renderStatic")))),
                args: vec![
                    ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(slot_ident.clone())) },
                    ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(root.clone())) },
                    ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(anchor.clone())) },
                ],
                type_args: None,
                ctxt: SyntaxContext::empty(),
            })),
        }));
        stmts.push(return_root(root.clone()));
        return BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts };
    }

    if transform.optimize_component_anchors {
        let anchor = transform.next_list_ident();
        let make_anchor = call_ident("_$createComment", vec![string_expr("rue:component:anchor")]);
        stmts.push(const_decl(anchor.clone(), make_anchor));
        stmts.push(append_child(root.clone(), Expr::Ident(anchor.clone())));

        if !child_stmts.is_empty() {
            for s in child_stmts {
                stmts.push(s);
            }
        }

        let slot_ident = transform.next_slot_ident();
        let render_call = Expr::Call(CallExpr {
            span: DUMMY_SP,
            callee: Callee::Expr(Box::new(Expr::Ident(ident("renderAnchor")))),
            args: vec![
                ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(slot_ident.clone())) },
                ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(root.clone())) },
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
                    init: Some(Box::new(Expr::JSXElement(Box::new(comp_el.clone())))),
                    definite: false,
                }],
                kind: VarDeclKind::Const,
                declare: false,
            }))));
            stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(render_call) }));
        } else {
            let decl_slot =
                const_decl(slot_ident.clone(), Expr::JSXElement(Box::new(comp_el.clone())));
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

        stmts.push(return_root(root.clone()));
        return BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts };
    }

    stmts.push(const_decl(start.clone(), make_start));
    stmts.push(const_decl(end.clone(), make_end));
    stmts.push(append_child(root.clone(), Expr::Ident(start.clone())));
    stmts.push(append_child(root.clone(), Expr::Ident(end.clone())));

    if !child_stmts.is_empty() {
        for s in child_stmts {
            stmts.push(s);
        }
    }

    let decl_slot = const_decl(ident("__slot"), Expr::JSXElement(Box::new(comp_el.clone())));
    let render_call = Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(Expr::Ident(ident("renderBetween")))),
        args: vec![
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(ident("__slot"))) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(root.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(start.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(end.clone())) },
        ],
        type_args: None,
        ctxt: SyntaxContext::empty(),
    });
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

    if is_static {
        let slot_ident = transform.next_slot_ident();
        stmts.push(Stmt::Decl(Decl::Var(Box::new(VarDecl {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            decls: vec![VarDeclarator {
                span: DUMMY_SP,
                name: Pat::Ident(BindingIdent { id: slot_ident.clone(), type_ann: None }),
                init: Some(Box::new(Expr::JSXElement(Box::new(comp_el.clone())))),
                definite: false,
            }],
            kind: VarDeclKind::Const,
            declare: false,
        }))));
        stmts.push(Stmt::Expr(ExprStmt {
            span: DUMMY_SP,
            expr: Box::new(Expr::Call(CallExpr {
                span: DUMMY_SP,
                callee: Callee::Expr(Box::new(Expr::Ident(ident("renderBetween")))),
                args: vec![
                    ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(slot_ident.clone())) },
                    ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(root.clone())) },
                    ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(start.clone())) },
                    ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(end.clone())) },
                ],
                type_args: None,
                ctxt: SyntaxContext::empty(),
            })),
        }));
    } else {
        // 动态组件：包裹在 watchEffect 中，确保更新
        // - callee：`watchEffect`
        // - args：renderBetween 箭头函数
        // - ctxt：统一空上下文
        let watch = call_ident("watchEffect", vec![render_arrow]);
        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(watch) }));
    }
    // 返回块级结果
    stmts.push(return_root(root.clone()));

    BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts }
}
