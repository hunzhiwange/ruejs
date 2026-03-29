use swc_core::ecma::ast::*;

use crate::elements::build_element;
use crate::text::normalize_text;

use super::super::VaporTransform;

/// Vapor 块体子节点编译总览
/// - 职责：将 JSX 子节点编译为原生 DOM 操作（createElement/appendChild 等）
/// - 分派：按照子节点类型分别处理 文本 / 片段 / 表达式容器 / JSX 元素
/// - 文本节点：使用 text::normalize_text + text::compute_jsx_text_content 精细处理空白
/// - 设计目标：与元素编译的空白策略保持一致，避免不同入口产生不一致的渲染
pub(crate) fn emit_children(
    vt: &mut VaporTransform,
    root: &Ident,
    children: &[JSXElementChild],
    stmts: &mut Vec<Stmt>,
) {
    // 遍历并按类型处理每一个子节点：
    // - 文本：规范化空白 + 结合邻居上下文决定是否修剪与插入
    // - 片段：递归展开其 children
    // - 表达式容器：交由 expr_container 模块做插槽渲染（renderBetween）
    // - JSX 元素：递归 build 成原生 DOM
    for (i, c) in children.iter().enumerate() {
        match c {
            JSXElementChild::JSXText(t) => {
                // 文本节点处理：
                // 1) 先做段级归一化（保留无换行的连续空格；含换行压为一个空格）
                // 2) 基于同级前后邻居（文本/表达式/纯空白等）决定插入内容：
                //    - 仅空白文本：在行内拼接场景插入单个空格，否则忽略
                //    - 含可见字符：在行内保留原样；在块级边界修剪首尾；遇到 {' '} 邻居再做方向性修剪
                let txt = normalize_text(&t.value);
                // compute_jsx_text_content 会结合 children 的上下文，返回最终需要插入的文本（或 None 表示无需插入）
                if let Some(content) = crate::text::compute_jsx_text_content(children, i, &txt) {
                    // 以 _$createTextNode(content) 生成文本节点并附加到 root：
                    // - callee：标识符 `_$createTextNode`
                    // - args：单个字符串字面量 `content`
                    // - ctxt：由 `emit::call_ident` 统一设置为 `SyntaxContext::empty()`，避免作用域差异
                    // - 插入：`emit::append_child(root, text)` 封装原生 DOM 插入
                    let text_node = crate::emit::call_ident(
                        "_$createTextNode",
                        vec![crate::emit::string_expr(&content)],
                    );
                    stmts.push(crate::emit::append_child(root.clone(), text_node));
                }
            }
            JSXElementChild::JSXFragment(frag) => {
                // 片段：递归编译其内部子节点
                emit_children(vt, root, &frag.children, stmts);
            }
            JSXElementChild::JSXExprContainer(ec) => {
                // 表达式容器：作为插槽渲染
                // - 生成起止注释锚点
                // - 在 watch 中调用 renderBetween
                // - 静态组件场景可直接一次性渲染
                super::expr_container::handle_expr_container(vt, root, ec, stmts);
            }
            JSXElementChild::JSXElement(child_el) => {
                // JSX 元素：构建为原生 DOM 并附加到当前 root
                // - build_element 内部完成创建/属性/子节点递归
                build_element(vt, child_el, root, stmts);
            }
            JSXElementChild::JSXSpreadChild(_) => {}
        }
    }
}
