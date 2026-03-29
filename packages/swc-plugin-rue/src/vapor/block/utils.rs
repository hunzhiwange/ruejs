// SWC 常量与上下文：DUMMY_SP（稳定 span）、SyntaxContext（统一 empty）
use swc_core::common::{DUMMY_SP, SyntaxContext};
// SWC ECMAScript AST 节点类型集合（Ident/CallExpr/ArrowExpr 等）
use swc_core::ecma::ast::*;

use crate::emit::*;

use super::super::VaporTransform;

/// 块体工具（细化说明）：
/// - emit_markers：
///   - 生成起止注释并插入到根节点，以作为 renderBetween 的锚点
///   - children/slot 使用不同标记字符串，便于调试与区分
/// - watch_render_between：
///   - 将插槽值保存为 `__slot`，统一转为 `__vnode`
///   - 构造 `renderBetween(__vnode, root, start, end)` 的箭头函数体，供 watch 包裹
pub(crate) fn emit_markers(
    vt: &mut VaporTransform,
    root: &Ident,
    is_children: bool,
    stmts: &mut Vec<Stmt>,
) -> (Ident, Ident) {
    // 生成并插入起止注释，用于 renderBetween 的锚点：
    // - children: "rue:children:start"/"rue:children:end"
    // - slot: "rue:slot:start"/"rue:slot:end"
    let start = vt.next_list_ident();
    let end = vt.next_list_ident();
    let marker_start: &str = if is_children { "rue:children:start" } else { "rue:slot:start" };
    let marker_end: &str = if is_children { "rue:children:end" } else { "rue:slot:end" };

    // 在 DOM 中创建注释节点并声明为局部常量：
    // - 调用来源：emit::call_ident("_$createComment", ...)
    let make_start = call_ident("_$createComment", vec![string_expr(marker_start)]);
    let make_end = call_ident("_$createComment", vec![string_expr(marker_end)]);
    stmts.push(const_decl(start.clone(), make_start));
    stmts.push(const_decl(end.clone(), make_end));

    // 将注释附加到父 root，后续 renderBetween 在两者之间进行片段渲染
    stmts.push(append_child(root.clone(), Expr::Ident(start.clone())));
    stmts.push(append_child(root.clone(), Expr::Ident(end.clone())));

    (start, end)
}

pub(crate) fn watch_render_between(
    expr_for_slot: Expr,
    root: Ident,
    start: Ident,
    end: Ident,
) -> Expr {
    // 规范插槽值为 vnode：先保存 slot 原值，再转为 VNode 以统一渲染路径
    let decl_slot = const_decl(ident("__slot"), expr_for_slot);
    // vnode 构造调用细节：
    // - callee：标识符 `_$vaporCreateVNode`
    // - args：`__slot` 标识符，表示规范化后的插槽原值
    // - ctxt：`emit::call_ident` 统一设置为 `SyntaxContext::empty()`
    let decl_vnode = const_decl(
        ident("__vnode"),
        call_ident("_$vaporCreateVNode", vec![Expr::Ident(ident("__slot"))]),
    );

    // 在注释锚点之间执行渲染：renderBetween(vnode, parent, start, end)
    // renderBetween 调用细节：
    // - callee：标识符 `renderBetween`
    // - args：`__vnode`, root, start, end
    // - ctxt：统一 `SyntaxContext::empty()`
    let render_call = Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(Expr::Ident(ident("renderBetween")))),
        args: vec![
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(ident("__vnode"))) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(root.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(start.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(end.clone())) },
        ],
        type_args: None,
        ctxt: SyntaxContext::empty(),
    });

    let body = BlockStmt {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        stmts: vec![
            decl_slot,
            decl_vnode,
            Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(render_call) }),
        ],
    };

    // 返回箭头函数：供 watchEffect 包裹执行，实现批处理与响应式更新
    Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::BlockStmt(body)),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    })
}
