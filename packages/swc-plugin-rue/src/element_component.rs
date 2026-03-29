use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::atoms::Atom;

use crate::emit::*;
use crate::vapor::VaporTransform;

/*
元素级组件编译（中文详解）：
- 目标：在父元素下以注释锚点占位，结合 renderBetween 将组件输出插入其间；
- children 处理：默认编译为 props.children 的 DocumentFragment；若 keepJSX={true}，保留原始 JSX children；
- 静态优化：无动态 props/children 的组件直接一次性渲染；其它包裹 watchEffect 以支持更新。
*/
/// 处理 JSX 组件元素：
/// - 在父节点下插入占位注释（start/end）
/// - 若组件存在内联 children，将其改写为 children 属性传入一个原生 DocumentFragment，
///   并在调用处直接编译这些子节点为原生 DOM 以便递归渲染
/// - 使用 `renderBetween` + `watchEffect` 在占位之间进行渲染
///   示例（参考 `tests/spec11.rs` 等）：
/// - 插入占位：`const _list1 = _$createComment("rue:slot:start"); const _list2 = _$createComment("rue:slot:end");`
/// - 包裹 children：`children={vapor(()=>{ const _root = _$createDocumentFragment(); ... return { vaporElement: _root }})}`
/// - 渲染：`watchEffect(()=>{ renderBetween(<Comp {...props} />, parent, start, end) })`
/// 可选控制：通过 `keepJSX` 保留原始 JSX children，不进行包裹改写；适用于组件在运行时自行处理 `children` 的场景。
pub fn build_component_element(
    vt: &mut VaporTransform,
    jsx_el: &JSXElement,
    parent: &Ident,
    stmts: &mut Vec<Stmt>,
) {
    // 为组件渲染生成锚点，renderBetween 在二者之间插入组件输出
    let start = vt.next_list_ident();
    let end = vt.next_list_ident();
    let make_start = call_ident("_$createComment", vec![string_expr("rue:component:start")]);
    let make_end = call_ident("_$createComment", vec![string_expr("rue:component:end")]);
    stmts.push(const_decl(start.clone(), make_start));
    stmts.push(const_decl(end.clone(), make_end));
    stmts.push(append_child(parent.clone(), Expr::Ident(start.clone())));
    stmts.push(append_child(parent.clone(), Expr::Ident(end.clone())));

    let mut comp_el = jsx_el.clone();

    // 若存在内联 children，默认使用 vapor(()=>{ ... }) 包裹并作为 children 传入：
    // - 原因：将 JSX children 预编译为原生片段，避免运行时解析 JSX
    // - 例外：检测到 keepJSX={true} 时，保留原始 JSX children，由组件自行在运行时处理
    let mut child_stmts: Vec<Stmt> = vec![];
    // 检测 keepJSX 属性是否显式为 true
    let mut keep_jsx = false;
    if !comp_el.children.is_empty() {
        for a in &comp_el.opening.attrs {
            if let JSXAttrOrSpread::JSXAttr(attr) = a {
                if let JSXAttrName::Ident(idn) = &attr.name {
                    if idn.sym.as_ref() == "keepJSX" {
                        // 布尔属性存在但无值，也视为 true
                        match &attr.value {
                            Some(JSXAttrValue::JSXExprContainer(ec)) => {
                                if let JSXExpr::Expr(expr) = &ec.expr {
                                    if let Expr::Lit(Lit::Bool(b)) = &**expr {
                                        if b.value {
                                            keep_jsx = true;
                                        }
                                    }
                                }
                            }
                            // 布尔存在但无值时也视为 true
                            None => {
                                keep_jsx = true;
                            }
                            _ => {}
                        }
                    }
                }
            }
        }
    }
    if !comp_el.children.is_empty() && !keep_jsx {
        let child_ident = vt.next_child_ident();
        // 简化策略：若 children 仅包含一个纯文本或简单表达式容器，直接作为常量/表达式传入，避免额外 vapor 包裹
        // - 动机：减少不必要的函数封装与 watch 路径，提升可读性与性能
        let mut used_simple = false;
        // 过滤掉仅含空白的 JSXText，保留有意义的子节点
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
                            _ => {}
                        }
                    }
                }
                _ => {}
            }
        }
        if !used_simple {
            // 将 children 逐一编译到片段根，并返回 { vaporElement: _root }：
            // - child_root：DocumentFragment，用于承载编译后的原生 children
            // - element_children：递归编译 JSX children
            // - return_root：统一返回对象形式，便于运行时只取 vaporElement
            let child_root = ident("_root");
            let mut child_body: Vec<Stmt> = vec![const_decl(
                child_root.clone(),
                call_ident("_$createDocumentFragment", vec![]),
            )];
            // 将内联 children 编译到 child_root 内部，覆盖文本/元素/表达式容器/片段等情况
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

    let slot_ident = vt.next_slot_ident();
    let decl_slot = const_decl(slot_ident.clone(), Expr::JSXElement(Box::new(comp_el.clone())));
    // 组件渲染：以 renderBetween 在锚点之间插入组件结果（支持静态/动态场景）
    // - renderBetween：运行时负责在 start/end 注释之间插入/更新片段
    // - args：vnode 或 JSX 生成的可渲染表达式、父节点、起止注释
    let render_call = Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(Expr::Ident(ident("renderBetween")))),
        args: vec![
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(slot_ident.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(parent.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(start.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(end.clone())) },
        ],
        type_args: None,
        ctxt: SyntaxContext::empty(),
    });
    let is_static = crate::utils::is_static_component_without_props(&comp_el)
        || crate::utils::is_static_component_children_ident(&comp_el)
        || crate::utils::component_has_no_dynamic_props_excluding_children(&comp_el);
    let render_arrow = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            stmts: vec![
                decl_slot.clone(),
                Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(render_call) }),
            ],
        })),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });

    if !child_stmts.is_empty() {
        for s in child_stmts {
            stmts.push(s);
        }
    }

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
        stmts.push(Stmt::Expr(ExprStmt {
            span: DUMMY_SP,
            expr: Box::new(Expr::Call(CallExpr {
                span: DUMMY_SP,
                callee: Callee::Expr(Box::new(Expr::Ident(ident("renderBetween")))),
                args: vec![
                    ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(slot_ident.clone())) },
                    ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(parent.clone())) },
                    ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(start.clone())) },
                    ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(end.clone())) },
                ],
                type_args: None,
                ctxt: SyntaxContext::empty(),
            })),
        }));
    } else {
        // 动态场景：以 watch 包裹渲染箭头函数：
        // - 作用：当 props/children 发生变化时，批量更新 start/end 间的渲染结果
        let watch = call_ident("watchEffect", vec![render_arrow]);
        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(watch) }));
    }
}
