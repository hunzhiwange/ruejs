// SWC 常量与上下文：
// - DUMMY_SP：稳定的占位位置信息
// - SyntaxContext：统一 empty 语义上下文
use swc_core::common::{DUMMY_SP, SyntaxContext};
// SWC ECMAScript AST 节点类型集合（Expr/CondExpr/BinExpr/JSXElement 等）
use swc_core::ecma::ast::*;

use crate::elements::build_element;
use crate::emit::*;
use crate::utils::{is_static_empty_like, unwrap_expr};

use super::super::VaporTransform;

/// 插槽表达式构建（细节）：
/// - JSXElement / JSXFragment → 编译为 `vapor(()=>{...})`，统一直接返回 `DocumentFragment`
/// - Cond/逻辑表达式 → 递归规范分支中的 JSX；空值统一回退为 ""
/// - 保持非 JSX 表达式原样，以减少不必要的包装与提升性能
fn make_vapor_slot_expr(child_body: Vec<Stmt>) -> Expr {
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

fn jsx_element_to_slot_value_expr(this: &mut VaporTransform, jsx_el: &JSXElement) -> Expr {
    // 将 JSXElement 编译为 `vapor(()=>{...})`，返回可挂载片段根：
    // - child_root：DocumentFragment 承载内部构造
    // - build_element：将 JSX 构建到 child_root 下
    // - return_root：统一直接返回块根
    let child_root = ident("_root");
    let mut child_body: Vec<Stmt> =
        vec![const_decl(child_root.clone(), call_ident("_$createDocumentFragment", vec![]))];
    // 将子 JSX 元素构建到 child_root 下面
    build_element(this, jsx_el, &child_root, &mut child_body);
    // 返回统一的可挂载槽值
    child_body.push(return_root(child_root.clone()));
    // vapor 包裹以形成可执行块体
    make_vapor_slot_expr(child_body)
}

fn jsx_fragment_to_slot_value_expr(this: &mut VaporTransform, frag: &JSXFragment) -> Expr {
    let child_root = ident("_root");
    let mut child_body: Vec<Stmt> =
        vec![const_decl(child_root.clone(), call_ident("_$createDocumentFragment", vec![]))];
    crate::element_fragment::emit_fragment_children(
        this,
        &child_root,
        &frag.children,
        &mut child_body,
    );
    child_body.push(return_root(child_root.clone()));
    make_vapor_slot_expr(child_body)
}

fn jsxish_to_slot_value_expr(this: &mut VaporTransform, expr: &Expr) -> Option<Expr> {
    match expr {
        Expr::JSXElement(jsx_el) => Some(jsx_element_to_slot_value_expr(this, jsx_el)),
        Expr::JSXFragment(frag) => Some(jsx_fragment_to_slot_value_expr(this, frag)),
        _ => None,
    }
}

pub(crate) fn build_slot_expr(this: &mut VaporTransform, inner: &Expr) -> Expr {
    match inner {
        Expr::JSXElement(jsx_el) => jsx_element_to_slot_value_expr(this, jsx_el),
        Expr::JSXFragment(frag) => jsx_fragment_to_slot_value_expr(this, frag),
        Expr::Cond(CondExpr { test, cons, alt, .. }) => {
            // 条件表达式：将两个分支中的 JSX 分别转换为可挂载槽值；其余保持原值（空值转空字符串）
            let cons_inner = unwrap_expr(cons.as_ref());
            let alt_inner = unwrap_expr(alt.as_ref());
            let new_cons: Expr =
                if let Some(slot_expr) = jsxish_to_slot_value_expr(this, cons_inner) {
                    slot_expr
                } else {
                    match cons_inner {
                        Expr::Cond(_)
                        | Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, .. })
                        | Expr::Bin(BinExpr { op: BinaryOp::LogicalOr, .. }) => {
                            build_slot_expr(this, cons_inner)
                        }
                        _ => {
                            // 规范空值为 ""，其他保持原样（以确保渲染稳定）
                            if is_static_empty_like(cons_inner) {
                                string_expr("")
                            } else {
                                *cons.clone()
                            }
                        }
                    }
                };
            let new_alt: Expr = if let Some(slot_expr) = jsxish_to_slot_value_expr(this, alt_inner)
            {
                slot_expr
            } else {
                match alt_inner {
                    Expr::Cond(_)
                    | Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, .. })
                    | Expr::Bin(BinExpr { op: BinaryOp::LogicalOr, .. }) => {
                        build_slot_expr(this, alt_inner)
                    }
                    _ => {
                        // 规范空值为 ""，其他保持原样
                        if is_static_empty_like(alt_inner) { string_expr("") } else { *alt.clone() }
                    }
                }
            };
            Expr::Cond(CondExpr {
                span: DUMMY_SP,
                test: (*test).clone(),
                cons: Box::new(new_cons),
                alt: Box::new(new_alt),
            })
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, left, right, .. }) => {
            // 逻辑与：右侧为 JSX 则转换为可挂载槽值，否则保持右侧
            let right_inner = unwrap_expr(right.as_ref());
            let new_cons: Expr =
                if let Some(slot_expr) = jsxish_to_slot_value_expr(this, right_inner) {
                    slot_expr
                } else {
                    *right.clone()
                };
            // alt 分支：当 left 不为确定的数值/NaN，回退为空字符串，避免插入 undefined/null
            let left_inner = unwrap_expr(left.as_ref());
            let new_alt: Expr = match left_inner {
                Expr::Lit(Lit::Num(_)) => *left.clone(),
                Expr::Ident(id) if id.sym.as_ref() == "NaN" => *left.clone(),
                _ => string_expr(""),
            };
            Expr::Cond(CondExpr {
                span: DUMMY_SP,
                test: (*left).clone(),
                cons: Box::new(new_cons),
                alt: Box::new(new_alt),
            })
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalOr, left, right, .. }) => {
            // 逻辑或：保持二元形式，右侧 JSX/复杂表达式递归 Vapor 化
            let right_inner = unwrap_expr(right.as_ref());
            let new_right: Expr =
                if let Some(slot_expr) = jsxish_to_slot_value_expr(this, right_inner) {
                    slot_expr
                } else {
                    match right_inner {
                        Expr::Cond(_)
                        | Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, .. })
                        | Expr::Bin(BinExpr { op: BinaryOp::LogicalOr, .. }) => {
                            build_slot_expr(this, right_inner)
                        }
                        _ => *right.clone(),
                    }
                };
            Expr::Bin(BinExpr {
                span: DUMMY_SP,
                op: BinaryOp::LogicalOr,
                left: (*left).clone(),
                right: Box::new(new_right),
            })
        }
        Expr::Member(_) | Expr::Ident(_) => {
            // 简单成员/标识符：包裹括号，确保后续拼接插入稳定
            Expr::Paren(ParenExpr { span: DUMMY_SP, expr: Box::new(inner.clone()) })
        }
        _ => inner.clone(),
    }
}
