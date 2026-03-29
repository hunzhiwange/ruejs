// SWC 常量与上下文：DUMMY_SP（稳定 span）、SyntaxContext（统一 empty）
use swc_core::common::{DUMMY_SP, SyntaxContext};
// SWC ECMAScript AST 节点类型集合（JSXExprContainer/CondExpr/BinExpr/ArrowExpr 等）
use swc_core::ecma::ast::*;

use crate::emit::*;
use crate::log;
use crate::utils::is_static_empty_like;
use crate::vapor::VaporTransform;

/*
元素表达式改写（中文详解）：
- 目标：将元素子节点中的任意表达式统一转化为可复用的插槽渲染路径；
- 规则：
  - JSX → 编译为 vapor(()=>{ ... }) 返回 DocumentFragment；
  - 条件（三元）/逻辑（&&/||）→ 递归在分支中规范 JSX，为空值回退 ""；
  - 其它表达式保持原样；
- contains_jsx_in_expr：用于快速判断表达式是否包含 JSX，以决定走“插槽渲染”或“文本渲染”路径。
*/
/// 将任意表达式（可能包含 JSX、条件、逻辑运算）改写为用于插槽渲染的表达式：
/// - 若是 JSX，则编译为 `vapor(()=>{ ... })` 返回 DocumentFragment
/// - 若是三元表达式，则对 cons/alt 分支中的 JSX 进行同样改写
/// - 若是逻辑与（&&），对右侧为 JSX 的情况进行改写
/// - 其它情况保持原表达式
///   生成示例（参考 `tests/conditional_rendering*.rs`）：
/// - `cond ? <A/> : <B/>` => `cond ? vapor(()=>{...}) : vapor(()=>{...})`
/// - `ok && <X/>` => `ok ? vapor(()=>{...}) : ""`
/// 设计动机：在表达式中内嵌 JSX 时，统一转化为 Vapor VNode 以复用同一套插槽渲染路径，避免多种表达式形态下的分支爆炸。
pub fn make_expr_for_slot(vt: &mut VaporTransform, inner: &Expr) -> Expr {
    match inner {
        Expr::JSXElement(jsx_el) => {
            log::debug("element_expr: slot JSXElement");
            // 将内嵌 JSX 编译为独立的 DocumentFragment，并包裹为 vapor(() => ...):
            // - child_root：片段根
            // - build_element：将 JSX 编译到 child_root 下
            // - return_root：返回 { vaporElement: child_root }
            let child_root = ident("_root");
            let mut child_body: Vec<Stmt> = vec![const_decl(
                child_root.clone(),
                call_ident("_$createDocumentFragment", vec![]),
            )];
            crate::elements::build_element(vt, jsx_el, &child_root, &mut child_body);
            child_body.push(return_root(child_root.clone()));
            // vapor 调用细节：
            // - callee：标识符 `vapor`
            // - args：单个箭头函数，块体内构造片段并返回 `{ vaporElement: _root }`
            // - ctxt：由 `emit::call_ident` 统一设置为 `SyntaxContext::empty()`
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
            call_ident("vapor", vec![arrow])
        }
        Expr::Cond(CondExpr { test, cons, alt, .. }) => {
            log::debug("element_expr: slot CondExpr");
            // 条件表达式：分支中若含 JSX，分别编译为 vapor 片段
            let cons_inner = crate::utils::unwrap_expr(cons.as_ref());
            let alt_inner = crate::utils::unwrap_expr(alt.as_ref());
            let new_cons: Expr = if let Expr::JSXElement(jsx_el) = cons_inner {
                let child_root = ident("_root");
                let mut child_body: Vec<Stmt> = vec![const_decl(
                    child_root.clone(),
                    call_ident("_$createDocumentFragment", vec![]),
                )];
                crate::elements::build_element(vt, jsx_el, &child_root, &mut child_body);
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
                call_ident("vapor", vec![arrow])
            } else if is_static_empty_like(cons_inner) {
                string_expr("")
            } else {
                *cons.clone()
            };
            let new_alt: Expr = if let Expr::JSXElement(jsx_el) = alt_inner {
                let child_root = ident("_root");
                let mut child_body: Vec<Stmt> = vec![const_decl(
                    child_root.clone(),
                    call_ident("_$createDocumentFragment", vec![]),
                )];
                crate::elements::build_element(vt, jsx_el, &child_root, &mut child_body);
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
                call_ident("vapor", vec![arrow])
            } else if is_static_empty_like(alt_inner) {
                string_expr("")
            } else {
                *alt.clone()
            };
            Expr::Cond(CondExpr {
                span: DUMMY_SP,
                test: test.clone(),
                cons: Box::new(new_cons),
                alt: Box::new(new_alt),
            })
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, left, right, .. }) => {
            log::debug("element_expr: slot LogicalAnd");
            // 逻辑与：右侧为 JSX 则编译为 vapor 片段；否则保持原表达式
            let right_inner = crate::utils::unwrap_expr(right.as_ref());
            let new_cons: Expr = if let Expr::JSXElement(jsx_el) = right_inner {
                let child_root = ident("_root");
                let mut child_body: Vec<Stmt> = vec![const_decl(
                    child_root.clone(),
                    call_ident("_$createDocumentFragment", vec![]),
                )];
                crate::elements::build_element(vt, jsx_el, &child_root, &mut child_body);
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
                call_ident("vapor", vec![arrow])
            } else {
                *right.clone()
            };
            let left_inner = crate::utils::unwrap_expr(left.as_ref());
            let new_alt: Expr = match left_inner {
                Expr::Lit(Lit::Num(_)) => *left.clone(),
                Expr::Ident(id) if id.sym.as_ref() == "NaN" => *left.clone(),
                _ => string_expr(""),
            };
            Expr::Cond(CondExpr {
                span: DUMMY_SP,
                test: left.clone(),
                cons: Box::new(new_cons),
                alt: Box::new(new_alt),
            })
        }
        _ => inner.clone(),
    }
}

pub fn contains_jsx_in_expr(inner_top: &Expr) -> bool {
    // 判定一个表达式是否包含 JSX：
    // - 直接是 JSXElement
    // - 条件表达式分支包含 JSXElement
    // - 逻辑与的右侧为 JSXElement
    // - 外层括号包裹的这些情况
    match inner_top {
        Expr::JSXElement(_) => true,
        Expr::Cond(CondExpr { cons, alt, .. }) => {
            let cons_inner = crate::utils::unwrap_expr(cons.as_ref());
            let alt_inner = crate::utils::unwrap_expr(alt.as_ref());
            matches!(cons_inner, Expr::JSXElement(_)) || matches!(alt_inner, Expr::JSXElement(_))
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, right, .. }) => {
            let right_inner = crate::utils::unwrap_expr(right.as_ref());
            matches!(right_inner, Expr::JSXElement(_))
        }
        Expr::Paren(ParenExpr { expr, .. }) => {
            let inner = crate::utils::unwrap_expr(expr.as_ref());
            match inner {
                Expr::JSXElement(_) => true,
                Expr::Cond(CondExpr { cons, alt, .. }) => {
                    let cons_inner = crate::utils::unwrap_expr(cons.as_ref());
                    let alt_inner = crate::utils::unwrap_expr(alt.as_ref());
                    matches!(cons_inner, Expr::JSXElement(_))
                        || matches!(alt_inner, Expr::JSXElement(_))
                }
                Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, right, .. }) => {
                    let right_inner = crate::utils::unwrap_expr(right.as_ref());
                    matches!(right_inner, Expr::JSXElement(_))
                }
                _ => false,
            }
        }
        _ => false,
    }
}

pub fn emit_element_expr_container_child(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    ec: &JSXExprContainer,
    stmts: &mut Vec<Stmt>,
) {
    log::debug("element_expr: emit container child");
    // 处理元素子节点中的表达式容器：
    // - 若为 `obj.map(cb)` 且回调返回 JSX，走列表渲染改写（`_$vaporKeyedList`）
    // - 若为 `props.children` 或普通插槽，生成起止注释并以 `renderBetween` 渲染
    // - 若表达式包含 JSX（条件/逻辑），统一改写为 Rue VNode 再作为插槽渲染
    // - 若不含 JSX：
    //   - 父标签为 `style`：直接设置一次或 watch 更新 `textContent`
    //   - 其它：使用包装元素（`text`/`span`）并 watch 更新 `textContent`
    // 生成代码参考：`tests/spec14.rs`、`tests/lists_and_keys*.rs`
    match &ec.expr {
        JSXExpr::JSXEmptyExpr(_) => {}
        JSXExpr::Expr(expr) => {
            let inner = crate::utils::unwrap_expr(expr.as_ref());
            if let Expr::Call(call) = inner.clone() {
                if crate::element_list::try_build_list_from_map(vt, el_ident, &call, stmts) {
                    log::debug("element_expr: list map path");
                    return;
                }
            }

            let inner_expr = crate::utils::unwrap_expr(expr.as_ref()).clone();
            // 识别任意对象的 .children 作为插槽（不再局限 props.children）
            if crate::utils::is_children_member_expr(&inner_expr) {
                log::debug("element_expr: children member expr (slot)");
                let is_children = true;
                crate::element_slot::render_between_for_slot(
                    vt,
                    el_ident,
                    &inner_expr,
                    is_children,
                    stmts,
                );
            } else {
                let inner_top = crate::utils::unwrap_expr(&inner_expr).clone();
                let contains_jsx = crate::element_expr::contains_jsx_in_expr(&inner_top);
                if contains_jsx {
                    log::debug("element_expr: contains JSX -> slot");
                    let expr_for_slot = crate::element_expr::make_expr_for_slot(vt, &inner_top);
                    crate::element_slot::render_between_for_slot(
                        vt,
                        el_ident,
                        &expr_for_slot,
                        false,
                        stmts,
                    );
                } else {
                    log::debug("element_expr: text content path");
                    let parent_tag = vt.el_tag_by_ident.get(&el_ident.sym.to_string()).cloned();
                    if matches!(parent_tag.as_deref(), Some("style")) {
                        if crate::utils::is_static_empty_like(&inner_expr) {
                            let set_text = Expr::Call(CallExpr {
                                span: DUMMY_SP,
                                callee: Callee::Expr(Box::new(Expr::Ident(ident(
                                    "_$settextContent",
                                )))),
                                args: vec![
                                    ExprOrSpread {
                                        spread: None,
                                        expr: Box::new(Expr::Ident(el_ident.clone())),
                                    },
                                    ExprOrSpread {
                                        spread: None,
                                        expr: Box::new(Expr::Lit(Lit::Str(Str {
                                            span: DUMMY_SP,
                                            value: "".into(),
                                            raw: None,
                                        }))),
                                    },
                                ],
                                type_args: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(set_text),
                            }));
                        } else if crate::utils::is_static_text_literal(&inner_expr) {
                            if let Some(val_expr) =
                                crate::utils::get_static_text_literal_expr(&inner_expr)
                            {
                                let set_text = Expr::Call(CallExpr {
                                    span: DUMMY_SP,
                                    callee: Callee::Expr(Box::new(Expr::Ident(ident(
                                        "_$settextContent",
                                    )))),
                                    args: vec![
                                        ExprOrSpread {
                                            spread: None,
                                            expr: Box::new(Expr::Ident(el_ident.clone())),
                                        },
                                        ExprOrSpread { spread: None, expr: Box::new(val_expr) },
                                    ],
                                    type_args: None,
                                    ctxt: SyntaxContext::empty(),
                                });
                                stmts.push(Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(set_text),
                                }));
                            }
                        } else {
                            let set_text = Expr::Call(CallExpr {
                                span: DUMMY_SP,
                                callee: Callee::Expr(Box::new(Expr::Ident(ident(
                                    "_$settextContent",
                                )))),
                                args: vec![
                                    ExprOrSpread {
                                        spread: None,
                                        expr: Box::new(Expr::Ident(el_ident.clone())),
                                    },
                                    ExprOrSpread {
                                        spread: None,
                                        expr: Box::new(inner_expr.clone()),
                                    },
                                ],
                                type_args: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            let arrow = Expr::Arrow(ArrowExpr {
                                span: DUMMY_SP,
                                params: vec![],
                                body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                    span: DUMMY_SP,
                                    ctxt: SyntaxContext::empty(),
                                    stmts: vec![Stmt::Expr(ExprStmt {
                                        span: DUMMY_SP,
                                        expr: Box::new(set_text),
                                    })],
                                })),
                                is_async: false,
                                is_generator: false,
                                type_params: None,
                                return_type: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            let watch = call_ident("watchEffect", vec![arrow]);
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(watch),
                            }));
                        }
                    } else {
                        crate::element_text::render_text_between_with_watch(
                            vt,
                            el_ident,
                            &inner_expr,
                            stmts,
                        );
                    }
                }
            }
        }
    }
}
