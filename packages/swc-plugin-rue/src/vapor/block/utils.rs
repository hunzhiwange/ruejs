// SWC 常量与上下文：DUMMY_SP（稳定 span）、SyntaxContext（统一 empty）
use swc_core::common::{DUMMY_SP, SyntaxContext};
// SWC ECMAScript AST 节点类型集合（Ident/CallExpr/ArrowExpr 等）
use swc_core::ecma::ast::*;

use crate::emit::*;

use super::super::VaporTransform;

/// 块体工具（细化说明）：
/// - emit_markers：
///   - 默认生成起止注释并插入到根节点，以作为 renderBetween 的锚点
///   - 开启单锚点优化后，仅生成一个 anchor 注释并配合 renderAnchor
///   - children/slot 使用不同标记字符串，便于调试与区分
/// - watch_render_slot：
///   - 将插槽值保存为 `__slot`，统一转为 `__vnode`
///   - 根据锚点模式构造 `renderBetween(...)` 或 `renderAnchor(...)` 的箭头函数体，供 watch 包裹
pub(crate) fn emit_markers(
    vt: &mut VaporTransform,
    root: &Ident,
    is_children: bool,
    stmts: &mut Vec<Stmt>,
) -> (Ident, Option<Ident>) {
    // 生成并插入注释锚点：
    // - 单锚点优化开启时：children/slot 各自使用独立 anchor 标记
    // - 否则：仍使用 start/end 区间，交由 renderBetween 处理
    let anchor = vt.next_list_ident();
    let use_anchor = vt.optimize_component_anchors;
    let marker_anchor: &str = if is_children {
        if use_anchor { "rue:children:anchor" } else { "rue:children:start" }
    } else if use_anchor {
        "rue:slot:anchor"
    } else {
        "rue:slot:start"
    };

    let make_anchor = call_ident("_$createComment", vec![string_expr(marker_anchor)]);
    stmts.push(const_decl(anchor.clone(), make_anchor));
    stmts.push(append_child(root.clone(), Expr::Ident(anchor.clone())));

    if use_anchor {
        (anchor, None)
    } else {
        let end = vt.next_list_ident();
        let marker_end: &str = if is_children { "rue:children:end" } else { "rue:slot:end" };
        let make_end = call_ident("_$createComment", vec![string_expr(marker_end)]);
        stmts.push(const_decl(end.clone(), make_end));
        stmts.push(append_child(root.clone(), Expr::Ident(end.clone())));
        (anchor, Some(end))
    }
}

pub(crate) fn watch_render_slot(
    expr_for_slot: Expr,
    root: Ident,
    anchor: Ident,
    end: Option<Ident>,
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

    // 在锚点前执行渲染：
    // - 区间模式：renderBetween(vnode, parent, start, end)
    // - 单锚点模式：renderAnchor(vnode, parent, anchor)
    let render_call = if let Some(end_ident) = end {
        Expr::Call(CallExpr {
            span: DUMMY_SP,
            callee: Callee::Expr(Box::new(Expr::Ident(ident("renderBetween")))),
            args: vec![
                ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(ident("__vnode"))) },
                ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(root.clone())) },
                ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(anchor.clone())) },
                ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(end_ident)) },
            ],
            type_args: None,
            ctxt: SyntaxContext::empty(),
        })
    } else {
        Expr::Call(CallExpr {
            span: DUMMY_SP,
            callee: Callee::Expr(Box::new(Expr::Ident(ident("renderAnchor")))),
            args: vec![
                ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(ident("__vnode"))) },
                ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(root.clone())) },
                ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(anchor.clone())) },
            ],
            type_args: None,
            ctxt: SyntaxContext::empty(),
        })
    };

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
