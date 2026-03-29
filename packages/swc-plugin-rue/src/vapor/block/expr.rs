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
/// - JSX → 编译为 `vapor(()=>{...})`，统一返回 `{ vaporElement: DocumentFragment }`
/// - Cond/逻辑表达式 → 递归规范分支中的 JSX；空值统一回退为 ""
/// - 保持非 JSX 表达式原样，以减少不必要的包装与提升性能
fn jsx_element_to_vnode_expr(this: &mut VaporTransform, jsx_el: &JSXElement) -> Expr {
    // 将 JSXElement 编译为 `vapor(()=>{...})`，返回 Rue VNode：
    // - child_root：DocumentFragment 承载内部构造
    // - build_element：将 JSX 构建到 child_root 下
    // - return_root：统一返回对象形式
    let child_root = ident("_root");
    let mut child_body: Vec<Stmt> =
        vec![const_decl(child_root.clone(), call_ident("_$createDocumentFragment", vec![]))];
    // 将子 JSX 元素构建到 child_root 下面
    build_element(this, jsx_el, &child_root, &mut child_body);
    // 返回 Rue VNode 的统一形式
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
    // vapor 包裹以形成可执行块体
    call_ident("vapor", vec![arrow])
}

pub(crate) fn build_slot_expr(this: &mut VaporTransform, inner: &Expr) -> Expr {
    match inner {
        Expr::JSXElement(jsx_el) => jsx_element_to_vnode_expr(this, jsx_el),
        Expr::Cond(CondExpr { test, cons, alt, .. }) => {
            // 条件表达式：将两个分支中的 JSX 分别转换为 Rue VNode；其余保持原值（空值转空字符串）
            let cons_inner = unwrap_expr(cons.as_ref());
            let alt_inner = unwrap_expr(alt.as_ref());
            let new_cons: Expr = match cons_inner {
                Expr::JSXElement(jsx_el) => jsx_element_to_vnode_expr(this, jsx_el),
                Expr::Cond(_)
                | Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, .. })
                | Expr::Bin(BinExpr { op: BinaryOp::LogicalOr, .. }) => {
                    build_slot_expr(this, cons_inner)
                }
                _ => {
                    // 规范空值为 ""，其他保持原样（以确保渲染稳定）
                    if is_static_empty_like(cons_inner) { string_expr("") } else { *cons.clone() }
                }
            };
            let new_alt: Expr = match alt_inner {
                Expr::JSXElement(jsx_el) => jsx_element_to_vnode_expr(this, jsx_el),
                Expr::Cond(_)
                | Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, .. })
                | Expr::Bin(BinExpr { op: BinaryOp::LogicalOr, .. }) => {
                    build_slot_expr(this, alt_inner)
                }
                _ => {
                    // 规范空值为 ""，其他保持原样
                    if is_static_empty_like(alt_inner) { string_expr("") } else { *alt.clone() }
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
            // 逻辑与：右侧为 JSX 则转换为 Rue VNode，否则保持右侧
            let right_inner = unwrap_expr(right.as_ref());
            let new_cons: Expr = if let Expr::JSXElement(jsx_el) = right_inner {
                jsx_element_to_vnode_expr(this, jsx_el)
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
            let new_right: Expr = match right_inner {
                Expr::JSXElement(jsx_el) => jsx_element_to_vnode_expr(this, jsx_el),
                Expr::Cond(_)
                | Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, .. })
                | Expr::Bin(BinExpr { op: BinaryOp::LogicalOr, .. }) => {
                    build_slot_expr(this, right_inner)
                }
                _ => *right.clone(),
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
