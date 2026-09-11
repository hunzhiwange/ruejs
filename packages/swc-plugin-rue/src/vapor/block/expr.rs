// SWC 常量与上下文：
// - DUMMY_SP：稳定的占位位置信息
// - SyntaxContext：统一 empty 语义上下文
use swc_core::common::{DUMMY_SP, SyntaxContext};
// SWC ECMAScript AST 节点类型集合（Expr/CondExpr/BinExpr/JSXElement 等）
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::VisitMutWith;

use crate::elements::build_element;
use crate::emit::*;
use crate::utils::{is_static_empty_like, unwrap_expr};

use super::super::VaporTransform;

/// 插槽表达式构建（细节）：
/// - JSXElement / JSXFragment → 编译为 `_$compiledRoot(()=>{...})`，统一直接返回 `DocumentFragment`
/// - Cond/逻辑表达式 → 递归规范分支中的 JSX；空值统一回退为 ""
/// - 保持非 JSX 表达式原样，以减少不必要的包装与提升性能
fn make_vapor_slot_expr(child_body: Vec<Stmt>, compiled_anchor: bool) -> Expr {
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
    let mut args = vec![arrow];
    if compiled_anchor {
        args.push(Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })));
    }
    call_ident("_$compiledRoot", args)
}

fn jsx_element_to_slot_value_expr(this: &mut VaporTransform, jsx_el: &JSXElement) -> Expr {
    if crate::utils::is_component(&jsx_el.opening.name) {
        let mut component = jsx_el.clone();
        let rewrite =
            crate::element_component::rewrite_component_children_to_props(this, &mut component);
        let mount_expr = rewrite
            .direct_render_expr
            .unwrap_or_else(|| crate::element_component::build_component_mount_expr(&component));
        return crate::element_component::component_expr_with_prelude(rewrite.stmts, mount_expr);
    }
    if !this.current_function_is_async()
        && crate::element_children::is_compiled_safe_element(this, jsx_el)
    {
        let block = crate::element_children::compiled_scalar_element_to_block(this, jsx_el);
        let compiled_expr = crate::element_children::compiled_block_to_root_expr(block);
        return match crate::element_expr::extract_reactive_jsx_key_expr(jsx_el) {
            Some(key_expr) => call_ident("_$compiledWithKey", vec![compiled_expr, key_expr]),
            None => compiled_expr,
        };
    }
    // 将 JSXElement 编译为 `_$compiledRoot(()=>{...})`，返回可挂载片段根：
    // - child_root：DocumentFragment 承载内部构造
    // - build_element：将 JSX 构建到 child_root 下
    // - return_root：统一直接返回块根
    let child_root = ident("_root");
    let mut child_body: Vec<Stmt> =
        vec![const_decl(child_root.clone(), call_ident("_$createDocumentFragment", vec![]))];
    // 将子 JSX 元素构建到 child_root 下面
    build_element(this, jsx_el, &child_root, &mut child_body);
    if this.is_once_context() {
        crate::vapor::flatten_once_watch_effects(&mut child_body);
    }
    // 返回统一的可挂载槽值
    child_body.push(return_root(child_root.clone()));
    // _$compiledRoot 包裹以形成可执行块体
    let vapor_expr =
        make_vapor_slot_expr(child_body, !crate::utils::is_component(&jsx_el.opening.name));
    match crate::element_expr::extract_reactive_jsx_key_expr(jsx_el) {
        Some(key_expr) => call_ident("_$compiledWithKey", vec![vapor_expr, key_expr]),
        None => vapor_expr,
    }
}

fn jsx_fragment_to_slot_value_expr(this: &mut VaporTransform, frag: &JSXFragment) -> Expr {
    if !this.current_function_is_async()
        && crate::element_children::is_compiled_safe_fragment(this, frag)
    {
        let block = crate::element_children::compiled_fragment_to_block(this, frag);
        return crate::element_children::compiled_block_to_root_expr(block);
    }
    let child_root = ident("_root");
    let mut child_body: Vec<Stmt> =
        vec![const_decl(child_root.clone(), call_ident("_$createDocumentFragment", vec![]))];
    crate::element_fragment::emit_fragment_children(
        this,
        &child_root,
        &frag.children,
        &mut child_body,
    );
    if this.is_once_context() {
        crate::vapor::flatten_once_watch_effects(&mut child_body);
    }
    child_body.push(return_root(child_root.clone()));
    make_vapor_slot_expr(child_body, true)
}

fn jsxish_to_slot_value_expr(this: &mut VaporTransform, expr: &Expr) -> Option<Expr> {
    match expr {
        Expr::JSXElement(jsx_el) => Some(jsx_element_to_slot_value_expr(this, jsx_el)),
        Expr::JSXFragment(frag) => Some(jsx_fragment_to_slot_value_expr(this, frag)),
        _ => None,
    }
}

fn call_callee_ident_name(call: &CallExpr) -> Option<&str> {
    match &call.callee {
        Callee::Expr(expr) => match unwrap_expr(expr.as_ref()) {
            Expr::Ident(id) => Some(id.sym.as_ref()),
            _ => None,
        },
        _ => None,
    }
}

fn arrow_expr_body_expr(arrow: &ArrowExpr) -> Option<&Expr> {
    match arrow.body.as_ref() {
        BlockStmtOrExpr::Expr(expr) => Some(unwrap_expr(expr.as_ref())),
        _ => None,
    }
}

fn stmt_returns_jsx_renderable(stmt: &Stmt) -> bool {
    match stmt {
        Stmt::Return(ret) => {
            ret.arg.as_ref().map(|expr| expr_returns_jsx_renderable(expr.as_ref())).unwrap_or(false)
        }
        Stmt::Block(block) => block_returns_jsx_renderable(block),
        Stmt::If(if_stmt) => {
            stmt_returns_jsx_renderable(if_stmt.cons.as_ref())
                || if_stmt
                    .alt
                    .as_ref()
                    .map(|alt| stmt_returns_jsx_renderable(alt.as_ref()))
                    .unwrap_or(false)
        }
        Stmt::Switch(switch_stmt) => {
            switch_stmt.cases.iter().any(|case| case.cons.iter().any(stmt_returns_jsx_renderable))
        }
        Stmt::Try(try_stmt) => {
            block_returns_jsx_renderable(&try_stmt.block)
                || try_stmt
                    .handler
                    .as_ref()
                    .map(|handler| block_returns_jsx_renderable(&handler.body))
                    .unwrap_or(false)
                || try_stmt.finalizer.as_ref().map(block_returns_jsx_renderable).unwrap_or(false)
        }
        Stmt::While(while_stmt) => stmt_returns_jsx_renderable(while_stmt.body.as_ref()),
        Stmt::DoWhile(do_while_stmt) => stmt_returns_jsx_renderable(do_while_stmt.body.as_ref()),
        Stmt::For(for_stmt) => stmt_returns_jsx_renderable(for_stmt.body.as_ref()),
        Stmt::ForIn(for_in_stmt) => stmt_returns_jsx_renderable(for_in_stmt.body.as_ref()),
        Stmt::ForOf(for_of_stmt) => stmt_returns_jsx_renderable(for_of_stmt.body.as_ref()),
        Stmt::Labeled(labeled_stmt) => stmt_returns_jsx_renderable(labeled_stmt.body.as_ref()),
        _ => false,
    }
}

fn block_returns_jsx_renderable(block: &BlockStmt) -> bool {
    block.stmts.iter().any(stmt_returns_jsx_renderable)
}

fn expr_returns_jsx_renderable(expr: &Expr) -> bool {
    match unwrap_expr(expr) {
        Expr::JSXElement(_) | Expr::JSXFragment(_) => true,
        Expr::Cond(CondExpr { cons, alt, .. }) => {
            expr_returns_jsx_renderable(cons.as_ref()) || expr_returns_jsx_renderable(alt.as_ref())
        }
        Expr::Bin(BinExpr {
            op: BinaryOp::LogicalOr | BinaryOp::NullishCoalescing,
            left,
            right,
            ..
        }) => {
            expr_returns_jsx_renderable(left.as_ref())
                || expr_returns_jsx_renderable(right.as_ref())
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, right, .. }) => {
            expr_returns_jsx_renderable(right.as_ref())
        }
        Expr::Call(call) => call_returns_jsx_renderable(call),
        _ => false,
    }
}

fn arrow_returns_jsx_renderable(expr: &Expr) -> bool {
    match unwrap_expr(expr) {
        Expr::Arrow(arrow) => match arrow.body.as_ref() {
            BlockStmtOrExpr::Expr(expr) => expr_returns_jsx_renderable(expr.as_ref()),
            BlockStmtOrExpr::BlockStmt(block) => block_returns_jsx_renderable(block),
        },
        Expr::Fn(fn_expr) => {
            fn_expr.function.body.as_ref().map(block_returns_jsx_renderable).unwrap_or(false)
        }
        _ => false,
    }
}

fn map_call_returns_jsx_renderable(call: &CallExpr) -> bool {
    let Callee::Expr(callee) = &call.callee else {
        return false;
    };

    let Expr::Member(MemberExpr { prop: MemberProp::Ident(prop_ident), .. }) =
        unwrap_expr(callee.as_ref())
    else {
        return false;
    };

    prop_ident.sym.as_ref() == "map"
        && call
            .args
            .first()
            .map(|arg| arrow_returns_jsx_renderable(arg.expr.as_ref()))
            .unwrap_or(false)
}

fn compiled_memo_call_returns_jsx_renderable(call: &CallExpr) -> bool {
    call_callee_ident_name(call) == Some("_$compiledMemo")
        && call
            .args
            .get(1)
            .map(|arg| arrow_returns_jsx_renderable(arg.expr.as_ref()))
            .unwrap_or(false)
}

fn hook_wrapped_call_returns_jsx_renderable(call: &CallExpr) -> bool {
    call_callee_ident_name(call) == Some("_$compiledWithHookId")
        && call
            .args
            .get(1)
            .map(|arg| arrow_returns_jsx_renderable(arg.expr.as_ref()))
            .unwrap_or(false)
}

fn call_returns_jsx_renderable(call: &CallExpr) -> bool {
    compiled_memo_call_returns_jsx_renderable(call)
        || hook_wrapped_call_returns_jsx_renderable(call)
        || map_call_returns_jsx_renderable(call)
}

#[cfg(test)]
fn compiled_memo_call_has_empty_deps(call: &CallExpr) -> bool {
    call_callee_ident_name(call) == Some("_$compiledMemo")
        && call
            .args
            .get(2)
            .map(|arg| matches!(unwrap_expr(arg.expr.as_ref()), Expr::Array(arr) if arr.elems.is_empty()))
            .unwrap_or(false)
}

#[cfg(test)]
fn arrow_contains_empty_deps_memo(expr: &Expr) -> bool {
    match unwrap_expr(expr) {
        Expr::Arrow(arrow) => {
            arrow_expr_body_expr(arrow).map(is_empty_deps_memoized_jsx_expr).unwrap_or(false)
        }
        _ => false,
    }
}

#[cfg(test)]
fn hook_wrapped_call_has_empty_memo_deps(call: &CallExpr) -> bool {
    call_callee_ident_name(call) == Some("_$compiledWithHookId")
        && call
            .args
            .get(1)
            .map(|arg| arrow_contains_empty_deps_memo(arg.expr.as_ref()))
            .unwrap_or(false)
}

#[cfg(test)]
fn is_empty_deps_memoized_jsx_expr(expr: &Expr) -> bool {
    match unwrap_expr(expr) {
        Expr::Call(call) => {
            compiled_memo_call_has_empty_deps(call)
                || hook_wrapped_call_has_empty_memo_deps(call)
                || call.args.iter().any(|arg| is_empty_deps_memoized_jsx_expr(arg.expr.as_ref()))
        }
        Expr::Arrow(arrow) => {
            arrow_expr_body_expr(arrow).map(is_empty_deps_memoized_jsx_expr).unwrap_or(false)
        }
        Expr::Cond(CondExpr { cons, alt, .. }) => {
            is_empty_deps_memoized_jsx_expr(cons.as_ref())
                || is_empty_deps_memoized_jsx_expr(alt.as_ref())
        }
        Expr::Bin(BinExpr { left, right, .. }) => {
            is_empty_deps_memoized_jsx_expr(left.as_ref())
                || is_empty_deps_memoized_jsx_expr(right.as_ref())
        }
        _ => false,
    }
}

fn rewrite_arrow_expr_body_for_slot(this: &mut VaporTransform, expr: &Expr) -> Option<Expr> {
    match unwrap_expr(expr) {
        Expr::Arrow(arrow) => {
            let body_expr = arrow_expr_body_expr(arrow)?;
            if !expr_returns_jsx_renderable(body_expr) {
                return None;
            }

            let mut next = arrow.clone();
            next.body = Box::new(BlockStmtOrExpr::Expr(Box::new(build_slot_expr(this, body_expr))));
            Some(Expr::Arrow(next))
        }
        _ => None,
    }
}

fn rewrite_use_memo_call_for_slot(this: &mut VaporTransform, call: &CallExpr) -> Option<Expr> {
    if call_callee_ident_name(call) != Some("_$compiledMemo") {
        return None;
    }

    let mut next = call.clone();
    let first = next.args.get_mut(1)?;
    let rewritten =
        this.with_once_context(|this| rewrite_arrow_expr_body_for_slot(this, first.expr.as_ref()))?;
    *first.expr = rewritten;
    Some(Expr::Call(next))
}

fn rewrite_hook_wrapped_call_for_slot(this: &mut VaporTransform, call: &CallExpr) -> Option<Expr> {
    if call_callee_ident_name(call) != Some("_$compiledWithHookId") {
        return None;
    }

    let mut next = call.clone();
    let runner = next.args.get_mut(1)?;
    let rewritten = rewrite_arrow_expr_body_for_slot(this, runner.expr.as_ref())?;
    *runner.expr = rewritten;
    Some(Expr::Call(next))
}

fn rewrite_map_call_for_slot(this: &mut VaporTransform, call: &CallExpr) -> Option<Expr> {
    if !map_call_returns_jsx_renderable(call) {
        return None;
    }

    let next = call.clone();

    let fragment = JSXFragment {
        span: DUMMY_SP,
        opening: JSXOpeningFragment { span: DUMMY_SP },
        children: vec![JSXElementChild::JSXExprContainer(JSXExprContainer {
            span: DUMMY_SP,
            expr: JSXExpr::Expr(Box::new(Expr::Call(next))),
        })],
        closing: JSXClosingFragment { span: DUMMY_SP },
    };

    Some(jsx_fragment_to_slot_value_expr(this, &fragment))
}

fn rewrite_call_for_slot(this: &mut VaporTransform, call: &CallExpr) -> Option<Expr> {
    rewrite_use_memo_call_for_slot(this, call)
        .or_else(|| rewrite_hook_wrapped_call_for_slot(this, call))
        .or_else(|| rewrite_map_call_for_slot(this, call))
        .or_else(|| {
            let Callee::Expr(callee) = &call.callee else {
                return None;
            };
            if !arrow_returns_jsx_renderable(callee.as_ref()) {
                return None;
            }
            let mut next = call.clone();
            next.visit_mut_with(this);
            Some(Expr::Call(next))
        })
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
                } else if expr_returns_jsx_renderable(cons_inner) {
                    build_slot_expr(this, cons_inner)
                } else {
                    match cons_inner {
                        Expr::Cond(_)
                        | Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, .. })
                        | Expr::Bin(BinExpr { op: BinaryOp::LogicalOr, .. })
                        | Expr::Bin(BinExpr { op: BinaryOp::NullishCoalescing, .. }) => {
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
            } else if expr_returns_jsx_renderable(alt_inner) {
                build_slot_expr(this, alt_inner)
            } else {
                match alt_inner {
                    Expr::Cond(_)
                    | Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, .. })
                    | Expr::Bin(BinExpr { op: BinaryOp::LogicalOr, .. })
                    | Expr::Bin(BinExpr { op: BinaryOp::NullishCoalescing, .. }) => {
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
                } else if expr_returns_jsx_renderable(right_inner) {
                    build_slot_expr(this, right_inner)
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
        Expr::Bin(BinExpr { op, left, right, .. })
            if matches!(op, BinaryOp::LogicalOr | BinaryOp::NullishCoalescing) =>
        {
            // 逻辑或/空值合并：保持二元形式，并将两侧的 JSX 子表达式递归 Vapor 化
            let left_inner = unwrap_expr(left.as_ref());
            let right_inner = unwrap_expr(right.as_ref());
            let new_left: Expr =
                if let Some(slot_expr) = jsxish_to_slot_value_expr(this, left_inner) {
                    slot_expr
                } else if expr_returns_jsx_renderable(left_inner) {
                    build_slot_expr(this, left_inner)
                } else {
                    *left.clone()
                };
            let new_right: Expr =
                if let Some(slot_expr) = jsxish_to_slot_value_expr(this, right_inner) {
                    slot_expr
                } else if expr_returns_jsx_renderable(right_inner) {
                    build_slot_expr(this, right_inner)
                } else {
                    match right_inner {
                        Expr::Cond(_)
                        | Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, .. })
                        | Expr::Bin(BinExpr { op: BinaryOp::LogicalOr, .. })
                        | Expr::Bin(BinExpr { op: BinaryOp::NullishCoalescing, .. }) => {
                            build_slot_expr(this, right_inner)
                        }
                        _ => *right.clone(),
                    }
                };
            Expr::Bin(BinExpr {
                span: DUMMY_SP,
                op: *op,
                left: Box::new(new_left),
                right: Box::new(new_right),
            })
        }
        Expr::Call(call) if call_returns_jsx_renderable(call) => {
            rewrite_call_for_slot(this, call).unwrap_or_else(|| inner.clone())
        }
        Expr::Member(_) | Expr::Ident(_) => {
            // 简单成员/标识符：包裹括号，确保后续拼接插入稳定
            Expr::Paren(ParenExpr { span: DUMMY_SP, expr: Box::new(inner.clone()) })
        }
        _ => inner.clone(),
    }
}

#[cfg(test)]
#[path = "expr_tests.rs"]
mod tests;
