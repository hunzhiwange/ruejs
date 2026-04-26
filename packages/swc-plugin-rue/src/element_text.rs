use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::atoms::Atom;

use crate::emit::*;
use crate::vapor::VaporTransform;

/*
元素文本渲染：
- 目标：为元素子节点中的任意文本表达式构造包装元素并设置/更新 textContent；
- 包装元素选择：运行时根据父元素是否为 SVG，选择 <text> 或 <span>；
- 静态优化：空值与纯静态文本直接一次性设置；其它动态表达式用 watchEffect 包裹，以便响应式更新。
*/
/// 动态/静态文本表达式渲染：
/// - 根据父元素类型选择包装元素：`text`（SVG）或 `span`（HTML）
/// - 对静态空值与静态文本字面量直接设置一次 textContent
/// - 其它情况用 `watchEffect` 包裹并在变更时更新 textContent
///   生成示例（参考 `tests/spec14.rs`）：
/// - 包装：`const _span1 = _el3 instanceof SVGElement ? _$createElement("text") : _$createElement("span")`
/// - 设置：`_$settextContent(_span1, sha.slice(0, 7))`
pub fn render_text_between_with_watch(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    inner_expr: &Expr,
    stmts: &mut Vec<Stmt>,
) {
    // 创建包装元素：委托运行时判断 SVG 上下文，返回 <text> 或 <span>
    let expr_wrapper = vt.next_el_ident();
    // CallExpr 细节：
    // - callee：标识符 `_$createTextWrapper`
    // - args：父元素标识符，用于运行时判断上下文（SVG/HTML）
    // - 目的：避免在编译期硬编码包装标签，交由运行时做环境适配
    let make_wrapper = call_ident("_$createTextWrapper", vec![Expr::Ident(el_ident.clone())]);
    stmts.push(const_decl(expr_wrapper.clone(), make_wrapper));
    // 将包装元素插入到父元素下：
    // - append_child 封装原生 DOM 插入，便于运行时做批量/延迟优化
    stmts.push(append_child(el_ident.clone(), Expr::Ident(expr_wrapper.clone())));

    // 静态空值：设置为空字符串一次
    if crate::utils::is_static_empty_like(inner_expr) {
        // 设置空字符串到 textContent：
        // - callee：`_$settextContent(wrapper, "")`
        // - 适用：静态空值（null/undefined/void 0/布尔）统一转为 ""
        // CallExpr 字段级说明：
        // - callee：标识符 `_$settextContent`
        // - args：包装元素 + 空字符串
        // - ctxt：统一 `SyntaxContext::empty()`，保持语义上下文一致
        let set_text = Expr::Call(CallExpr {
            span: DUMMY_SP,
            callee: Callee::Expr(Box::new(Expr::Ident(ident("_$settextContent")))),
            args: vec![
                ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(expr_wrapper.clone())) },
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
        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(set_text) }));
        return;
    }

    // 静态文本字面量：直接设置一次
    if crate::utils::is_static_text_literal(inner_expr) {
        if let Some(val_expr) = crate::utils::get_static_text_literal_expr(inner_expr) {
            // 设置静态文本字面量（字符串或数字转字符串）到 textContent：
            // - 直接一次性赋值，避免不必要的 watch
            // CallExpr 字段级说明：
            // - callee：标识符 `_$settextContent`
            // - args：包装元素 + 静态文本表达式
            // - ctxt：`SyntaxContext::empty()`
            let set_text = Expr::Call(CallExpr {
                span: DUMMY_SP,
                callee: Callee::Expr(Box::new(Expr::Ident(ident("_$settextContent")))),
                args: vec![
                    ExprOrSpread {
                        spread: None,
                        expr: Box::new(Expr::Ident(expr_wrapper.clone())),
                    },
                    ExprOrSpread { spread: None, expr: Box::new(val_expr) },
                ],
                type_args: None,
                ctxt: SyntaxContext::empty(),
            });
            stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(set_text) }));
            return;
        }
    }

    // 其它动态表达式：watch 包裹
    // 动态表达式：在 watch 中更新 textContent
    // - set_text：`_$settextContent(wrapper, expr)`
    // - arrow：`() => { set_text }`
    // - watch：`watchEffect(arrow)`
    // CallExpr 字段级说明：
    // - callee：标识符 `_$settextContent`
    // - args：包装元素 + 原始动态表达式
    // - ctxt：`SyntaxContext::empty()`
    let set_text = Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(Expr::Ident(ident("_$settextContent")))),
        args: vec![
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(expr_wrapper.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(inner_expr.clone()) },
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
            stmts: vec![Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(set_text) })],
        })),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    // 使用 watch 保证 textContent 随表达式变化更新
    let watch = call_ident("watchEffect", vec![arrow]);
    stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(watch) }));
}

pub fn append_normalized_jsx_text(parent_ident: &Ident, raw: &Atom, stmts: &mut Vec<Stmt>) {
    let txt = crate::text::normalize_text(raw);
    if txt.is_empty() {
        return;
    }
    let text_node = call_ident("_$createTextNode", vec![string_expr(&txt)]);
    stmts.push(append_child(parent_ident.clone(), text_node));
}
