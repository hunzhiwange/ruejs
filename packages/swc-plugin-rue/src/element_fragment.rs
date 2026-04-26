use swc_core::ecma::ast::*;

/*
JSX 片段子节点编译：
- 目标：将 Fragment 的 children 以原生 DOM 操作插入到父节点下，不引入额外包裹元素；
- 策略：
  - 文本：归一化空白后作为 TextNode 插入；
    - 表达式容器：props.children 原样作为槽值；其它改写为可挂载槽值表达式；
  - JSX/Fragment：递归调用，保持结构；
- 渲染：统一通过 element_slot::render_between_for_slot 在注释锚点之间渲染片段，支持响应式更新。
*/
/// 处理 JSX 片段 `<>...</>` 的子节点渲染：
/// - 文本：空白折叠后作为 TextNode 插入
/// - 表达式容器：若为 `props.children` 则原样作为槽值；否则改写为可挂载槽值表达式
/// - 嵌套 JSX/Fragment：递归构建
///   生成代码参考：`tests/spec12.rs`、`tests/spec14.rs`
/// 设计说明：片段根使用 `DocumentFragment`，在插入子节点时不会引入额外包裹元素，保持与 JSX 语义一致。
pub fn emit_fragment_children(
    vt: &mut crate::vapor::VaporTransform,
    parent_ident: &Ident,
    children: &[JSXElementChild],
    stmts: &mut Vec<Stmt>,
) {
    for c in children {
        match c {
            JSXElementChild::JSXText(t) => {
                crate::element_text::append_normalized_jsx_text(parent_ident, &t.value, stmts);
            }
            JSXElementChild::JSXExprContainer(ec) => match &ec.expr {
                JSXExpr::JSXEmptyExpr(_) => {}
                JSXExpr::Expr(expr) => {
                    let inner_top = crate::utils::unwrap_expr(expr.as_ref());
                    let is_children = if let Expr::Member(m) = inner_top {
                        matches!((&*m.obj, &m.prop), (Expr::Ident(id), MemberProp::Ident(pi))
                            if id.sym.as_ref() == "props" && pi.sym.as_ref() == "children")
                    } else {
                        false
                    };

                    // children 槽值直接渲染；其它表达式统一改写为可挂载槽值表达式
                    let expr_for_slot = if is_children {
                        inner_top.clone()
                    } else {
                        crate::element_expr::make_expr_for_slot(vt, inner_top)
                    };

                    // 在注释锚点之间渲染该槽值，支持响应式更新
                    crate::element_slot::render_between_for_slot(
                        vt,
                        parent_ident,
                        &expr_for_slot,
                        is_children,
                        stmts,
                    );
                }
            },
            JSXElementChild::JSXElement(el) => {
                crate::elements::build_element(vt, el, parent_ident, stmts);
            }
            JSXElementChild::JSXFragment(frag) => {
                emit_fragment_children(vt, parent_ident, &frag.children, stmts);
            }
            JSXElementChild::JSXSpreadChild(_) => {}
        }
    }
}
