use swc_core::ecma::ast::*;

use crate::attrs::emit_attrs_for;
use crate::log;
use crate::utils::is_component;
use crate::vapor::VaporTransform;

/*
元素与组件统一构建入口：
- 组件：插入占位注释并以 renderAnchor 渲染；可能携带 children（按需编译/保留）；
- 原生元素：创建节点、设置属性、处理子节点；遇 dangerouslySetInnerHTML 时跳过 children；
- 动机：集中处理两类分支，避免分散到多个调用点导致逻辑重复与策略不一致。
*/
/// 根据 JSX 元素构造 Vapor DOM 代码；
/// - 组件：插入占位注释并使用 `renderAnchor` 动态渲染
/// - 原生元素：创建节点、设置属性、处理子节点
///   生成样例（参考 `tests/lists_and_keys.rs`）：
/// - 原生元素：`const _el1 = _$createElement("ul"); _$appendChild(_root, _el1);`
/// - 属性：`_el1.setAttribute("class","list-disc pl-6")`
/// - 子节点文本：`_$settextContent(_span, idx + 1)`
///
/// 统一入口：集中处理元素与组件分支，避免分散到多个调用点导致的逻辑重复。
pub fn build_element(
    vt: &mut VaporTransform,
    jsx_el: &JSXElement,
    parent: &Ident,
    stmts: &mut Vec<Stmt>,
) {
    build_element_with_anchor(vt, jsx_el, parent, None, stmts);
}

pub(crate) fn build_element_at(
    vt: &mut VaporTransform,
    jsx_el: &JSXElement,
    parent: &Ident,
    anchor: &Ident,
    stmts: &mut Vec<Stmt>,
) {
    build_element_with_anchor(vt, jsx_el, parent, Some(anchor), stmts);
}

fn build_element_with_anchor(
    vt: &mut VaporTransform,
    jsx_el: &JSXElement,
    parent: &Ident,
    anchor: Option<&Ident>,
    stmts: &mut Vec<Stmt>,
) {
    log::debug("elements: build_element");
    if crate::vapor::template::emit_marked_template_child(vt, jsx_el, parent, stmts) {
        log::debug("elements: static html template branch");
        return;
    }
    if let Some(router_link_el) = crate::router_link::rewrite_router_link_fast_path(jsx_el) {
        log::debug("elements: RouterLink fast path -> native anchor");
        build_element_with_anchor(vt, &router_link_el, parent, anchor, stmts);
        return;
    }
    if is_component(&jsx_el.opening.name) {
        log::debug("elements: component branch");
        let built_compiled = if let Some(anchor) = anchor {
            crate::element_component::try_build_compiled_component_element_at(
                vt, jsx_el, parent, anchor, stmts,
            )
        } else {
            crate::element_component::try_build_compiled_component_element(
                vt, jsx_el, parent, stmts,
            )
        };
        if built_compiled {
            return;
        }
        if let Some(anchor) = anchor {
            crate::element_component::build_component_element_at(vt, jsx_el, parent, anchor, stmts);
        } else {
            crate::element_component::build_component_element(vt, jsx_el, parent, stmts);
        }
        return;
    }

    let tag = crate::element_node::resolve_tag_name(&jsx_el.opening.name);
    log::debug(&format!("elements: native tag={}", tag));
    // 创建并插入原生元素节点：
    // - emit_create_element 内部完成：
    //   1) `const _elX = _$createElement(tag)`（来源 emit::call_ident）
    //   2) `_$appendChild(parent, _elX)`（来源 emit::append_child 封装）
    //   3) 记录 `_elX → tag` 映射，便于后续如文本包装/样式适配等根据标签处理
    let el_ident = crate::element_node::emit_create_element(vt, parent, &tag, stmts);
    if let Some(anchor) = anchor {
        stmts.push(Stmt::Expr(ExprStmt {
            span: swc_core::common::DUMMY_SP,
            expr: Box::new(crate::emit::call_member(
                parent.clone(),
                "insertBefore",
                vec![Expr::Ident(el_ident.clone()), Expr::Ident(anchor.clone())],
            )),
        }));
    }

    emit_attrs_for(stmts, &el_ident, &jsx_el.opening);

    let has_dangerously = jsx_el.opening.attrs.iter().any(|a| match a {
        JSXAttrOrSpread::JSXAttr(attr) => match &attr.name {
            JSXAttrName::Ident(idn) => idn.sym.as_ref() == "dangerouslySetInnerHTML",
            _ => false,
        },
        _ => false,
    });

    log::debug(&format!(
        "elements: children path={}",
        if has_dangerously { "skip (dangerouslySetInnerHTML)" } else { "emit" }
    ));
    if !has_dangerously {
        let native_children = if crate::custom_element::is_custom_element_tag(&tag) {
            crate::custom_element::extract_custom_element_slot_children(
                vt,
                &el_ident,
                &jsx_el.children,
                stmts,
            )
        } else {
            jsx_el.children.clone()
        };
        // 子节点统一走 element_children，覆盖文本/表达式/片段/嵌套元素等情况：
        // - 文本：`$createTextNode` + `$appendChild` 或规范化后跳过/修剪
        // - 表达式容器：`$createTextWrapper` → `$settextContent`（静态一次或动态 watch）
        // - 片段：以 DocumentFragment 作为根递归处理
        // - 嵌套元素：递归调用 build_element
        crate::element_children::emit_element_children(vt, &el_ident, &native_children, stmts);
    }
}

#[cfg(test)]
#[path = "elements_tests.rs"]
mod tests;
