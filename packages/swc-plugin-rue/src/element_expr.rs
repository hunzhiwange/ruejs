// SWC 常量与上下文：DUMMY_SP（稳定 span）、SyntaxContext（统一 empty）
use swc_core::common::{DUMMY_SP, SyntaxContext};
// SWC ECMAScript AST 节点类型集合（JSXExprContainer/CondExpr/BinExpr/ArrowExpr 等）
use swc_core::ecma::ast::*;

use crate::emit::*;
use crate::log;
use crate::utils::is_static_empty_like;
use crate::vapor::VaporTransform;

/*
元素表达式改写：
- 目标：将元素子节点中的任意表达式统一转化为可复用的插槽渲染路径；
- 规则：
  - JSXElement / JSXFragment → 编译为 vapor(()=>{ ... }) 返回 DocumentFragment；
  - 条件（三元）/逻辑（&&/||）→ 递归在分支中规范 JSX，为空值回退 ""；
  - 其它表达式保持原样；
- contains_jsx_in_expr：用于快速判断表达式是否包含 JSX，以决定走“插槽渲染”或“文本渲染”路径。
*/
fn make_vapor_expr_from_child_body(child_body: Vec<Stmt>) -> Expr {
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

fn jsx_element_to_slot_expr(vt: &mut VaporTransform, jsx_el: &JSXElement) -> Expr {
    let child_root = ident("_root");
    let mut child_body: Vec<Stmt> =
        vec![const_decl(child_root.clone(), call_ident("_$createDocumentFragment", vec![]))];
    crate::elements::build_element(vt, jsx_el, &child_root, &mut child_body);
    child_body.push(return_root(child_root.clone()));
    make_vapor_expr_from_child_body(child_body)
}

fn jsx_fragment_to_slot_expr(vt: &mut VaporTransform, frag: &JSXFragment) -> Expr {
    let child_root = ident("_root");
    let mut child_body: Vec<Stmt> =
        vec![const_decl(child_root.clone(), call_ident("_$createDocumentFragment", vec![]))];
    crate::element_fragment::emit_fragment_children(
        vt,
        &child_root,
        &frag.children,
        &mut child_body,
    );
    child_body.push(return_root(child_root.clone()));
    make_vapor_expr_from_child_body(child_body)
}

fn jsx_expr_to_slot_expr(vt: &mut VaporTransform, inner: &Expr) -> Option<Expr> {
    match inner {
        Expr::JSXElement(jsx_el) => Some(jsx_element_to_slot_expr(vt, jsx_el)),
        Expr::JSXFragment(frag) => Some(jsx_fragment_to_slot_expr(vt, frag)),
        _ => None,
    }
}

fn is_svg_tag(tag: &str) -> bool {
    matches!(
        tag,
        "svg"
            | "g"
            | "circle"
            | "ellipse"
            | "line"
            | "path"
            | "polygon"
            | "polyline"
            | "rect"
            | "text"
            | "tspan"
            | "defs"
            | "clipPath"
            | "mask"
            | "pattern"
            | "linearGradient"
            | "radialGradient"
            | "stop"
            | "use"
            | "symbol"
            | "marker"
            | "foreignObject"
    )
}

fn is_non_ref_member_expr(inner: &Expr) -> bool {
    match inner {
        Expr::Member(member) => match &member.prop {
            MemberProp::Ident(prop) => prop.sym.as_ref() != "value",
            _ => true,
        },
        _ => false,
    }
}

/// 将任意表达式（可能包含 JSX、条件、逻辑运算）改写为用于插槽渲染的表达式：
/// - 若是 JSXElement / JSXFragment，则编译为 `vapor(()=>{ ... })` 返回 DocumentFragment
/// - 若是三元表达式，则对 cons/alt 分支中的 JSX 进行同样改写
/// - 若是逻辑与（&&），对右侧为 JSX 的情况进行改写
/// - 其它情况保持原表达式
///   生成示例（参考 `tests/conditional_rendering*.rs`）：
/// - `cond ? <A/> : <B/>` => `cond ? vapor(()=>{...}) : vapor(()=>{...})`
/// - `ok && <X/>` => `ok ? vapor(()=>{...}) : ""`
/// 设计动机：在表达式中内嵌 JSX 时，统一转化为可挂载块值以复用同一套插槽渲染路径，避免多种表达式形态下的分支爆炸。
pub fn make_expr_for_slot(vt: &mut VaporTransform, inner: &Expr) -> Expr {
    match inner {
        Expr::JSXElement(jsx_el) => {
            log::debug("element_expr: slot JSXElement");
            jsx_element_to_slot_expr(vt, jsx_el)
        }
        Expr::JSXFragment(frag) => {
            log::debug("element_expr: slot JSXFragment");
            jsx_fragment_to_slot_expr(vt, frag)
        }
        Expr::Cond(CondExpr { test, cons, alt, .. }) => {
            log::debug("element_expr: slot CondExpr");
            // 条件表达式：分支中若含 JSX，分别编译为 vapor 片段
            let cons_inner = crate::utils::unwrap_expr(cons.as_ref());
            let alt_inner = crate::utils::unwrap_expr(alt.as_ref());
            let new_cons: Expr = if let Some(slot_expr) = jsx_expr_to_slot_expr(vt, cons_inner) {
                slot_expr
            } else if is_static_empty_like(cons_inner) {
                string_expr("")
            } else {
                *cons.clone()
            };
            let new_alt: Expr = if let Some(slot_expr) = jsx_expr_to_slot_expr(vt, alt_inner) {
                slot_expr
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
            let new_cons: Expr = if let Some(slot_expr) = jsx_expr_to_slot_expr(vt, right_inner) {
                slot_expr
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
    // - 直接是 JSXElement / JSXFragment
    // - 条件表达式分支包含 JSXElement / JSXFragment
    // - 逻辑与的右侧为 JSXElement / JSXFragment
    // - 外层括号包裹的这些情况
    match inner_top {
        Expr::JSXElement(_) | Expr::JSXFragment(_) => true,
        Expr::Cond(CondExpr { cons, alt, .. }) => {
            let cons_inner = crate::utils::unwrap_expr(cons.as_ref());
            let alt_inner = crate::utils::unwrap_expr(alt.as_ref());
            matches!(cons_inner, Expr::JSXElement(_) | Expr::JSXFragment(_))
                || matches!(alt_inner, Expr::JSXElement(_) | Expr::JSXFragment(_))
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, right, .. }) => {
            let right_inner = crate::utils::unwrap_expr(right.as_ref());
            matches!(right_inner, Expr::JSXElement(_) | Expr::JSXFragment(_))
        }
        Expr::Paren(ParenExpr { expr, .. }) => {
            let inner = crate::utils::unwrap_expr(expr.as_ref());
            match inner {
                Expr::JSXElement(_) | Expr::JSXFragment(_) => true,
                Expr::Cond(CondExpr { cons, alt, .. }) => {
                    let cons_inner = crate::utils::unwrap_expr(cons.as_ref());
                    let alt_inner = crate::utils::unwrap_expr(alt.as_ref());
                    matches!(cons_inner, Expr::JSXElement(_) | Expr::JSXFragment(_))
                        || matches!(alt_inner, Expr::JSXElement(_) | Expr::JSXFragment(_))
                }
                Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, right, .. }) => {
                    let right_inner = crate::utils::unwrap_expr(right.as_ref());
                    matches!(right_inner, Expr::JSXElement(_) | Expr::JSXFragment(_))
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
    // - 若表达式包含 JSX（条件/逻辑），统一改写为可挂载槽值再作为插槽渲染
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
                let parent_tag = vt.el_tag_by_ident.get(&el_ident.sym.to_string()).cloned();
                let parent_is_style = matches!(parent_tag.as_deref(), Some("style"));
                let parent_is_svg = parent_tag.as_deref().map(is_svg_tag).unwrap_or(false);
                let is_opaque_renderable_expr = is_non_ref_member_expr(&inner_top)
                    && !crate::utils::is_static_empty_like(&inner_top);
                if contains_jsx || (!parent_is_style && !parent_is_svg && is_opaque_renderable_expr)
                {
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
