use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;

use crate::emit::*;
use crate::vapor::VaporTransform;

/*
插槽渲染（中文详解）：
- 目标：统一 props.children 或任意 slot 的渲染路径，在注释锚点之间插入片段；
- vnode 规范化策略（参考 `tests/spec14.rs`）：
  - 数组 => `h('fragment', null, ...slot)`
  - Rue VNode（含 `vaporElement`）=> 直接使用
  - 原生 DOM 节点（含 `nodeType`）=> 包裹 `h('fragment', null, slot)`
  - 其它 => `h('fragment', null, String(slot ?? ""))`
- 动机：在插槽可能为“数组 / VNode / 原生 DOM / 原始值”的多形态场景下，统一产出一个可渲染 fragment，避免复杂分支判断。
- 性能说明：注释锚点 + `renderBetween` 能够局部更新片段内容，避免重建父/兄弟节点；watch 包裹保证响应式更新。
*/
pub fn render_between_for_slot(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    inner_expr: &Expr,
    is_children: bool,
    stmts: &mut Vec<Stmt>,
) {
    // 创建 start/end 标记注释并插入到元素下
    let start = vt.next_list_ident();
    let end = vt.next_list_ident();
    let marker_start: &str = if is_children { "rue:children:start" } else { "rue:slot:start" };
    let marker_end: &str = if is_children { "rue:children:end" } else { "rue:slot:end" };
    let make_start = call_ident("_$createComment", vec![string_expr(marker_start)]);
    let make_end = call_ident("_$createComment", vec![string_expr(marker_end)]);
    stmts.push(const_decl(start.clone(), make_start));
    stmts.push(const_decl(end.clone(), make_end));
    stmts.push(append_child(el_ident.clone(), Expr::Ident(start.clone())));
    stmts.push(append_child(el_ident.clone(), Expr::Ident(end.clone())));

    // 槽值：对于标识符/成员表达式使用括号包裹以保证后续判断
    let expr_for_slot = match inner_expr.clone() {
        Expr::Member(_) | Expr::Ident(_) => {
            Expr::Paren(ParenExpr { span: DUMMY_SP, expr: Box::new(inner_expr.clone()) })
        }
        _ => inner_expr.clone(),
    };
    // 保存 slot 原值，并规范化为 vnode 再进行渲染
    let decl_slot = const_decl(ident("__slot"), expr_for_slot);
    let decl_vnode = const_decl(
        ident("__vnode"),
        call_ident("_$vaporCreateVNode", vec![Expr::Ident(ident("__slot"))]),
    );

    // 在注释之间渲染 vnode，并放入 watchEffect 中
    let render_call = Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(Expr::Ident(ident("renderBetween")))),
        args: vec![
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(ident("__vnode"))) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(el_ident.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(start.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(end.clone())) },
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
                decl_vnode,
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
