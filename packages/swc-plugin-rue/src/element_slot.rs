use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;

use crate::emit::*;
use crate::vapor::VaporTransform;

/*
插槽渲染：
- 目标：统一 props.children 或任意 slot 的渲染路径，在锚点前插入片段；
- 新协议策略：直接把原始 slot / children 值交给 `renderAnchor`，由 runtime 的 Renderable/compat 边界统一处理。
- 动机：编译器不再提前依赖旧的中间对象规范化 helper，避免把历史 compat 逻辑继续固化进输出。
- 性能说明：默认仍可走 `renderBetween` 区间渲染；开启单锚点优化后，改为单注释锚点 + `renderAnchor`，减少额外 range_map 记录。
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
    let arrow = Expr::Arrow(ArrowExpr {
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
    // watch 包裹，保证插槽值变化时进行增量更新
    let watch = call_ident("watchEffect", vec![arrow]);
    stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(watch) }));
}
