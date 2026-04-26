use swc_core::ecma::ast::*;

use crate::emit::*;
use crate::log;
use crate::vapor::VaporTransform;

/*
元素节点创建：
- 目标：解析 JSX 标签名，创建原生元素并插入到父节点下；
- 标签名策略：标识符直接使用；非常规命名（成员/命名空间）回退为 div，避免生成无效 DOM；
- 记录：将元素标识符与标签名映射记录在转换器中，便于后续针对特定标签（如 style）做特殊处理。
*/
/// 解析 JSX 标签名并生成原生元素创建与插入语句。
/// 典型输出：
/// - `const _el1 = _$createElement("div");`
/// - `_$appendChild(_root, _el1);`
/// 标签名解析规则：
/// - 标识符直接使用其字符串值作为标签（如 `div`/`span`）
/// - 复杂场景（成员/命名空间）统一回退为 `div` 以保证生成有效 DOM
/// 参考：`tests/spec4.rs`、`tests/basic.rs`
/// 设计权衡：编译期不做复杂的自定义元素名分辨；遇到非常规命名一律回退，避免生成无效节点导致运行时错误。
pub fn resolve_tag_name(name: &JSXElementName) -> String {
    let tag = match name {
        JSXElementName::Ident(i) => i.sym.to_string(),
        _ => String::from("div"),
    };
    log::debug(&format!("element_node: resolve tag={}", tag));
    tag
}

pub fn emit_create_element(
    vt: &mut VaporTransform,
    parent: &Ident,
    tag: &str,
    stmts: &mut Vec<Stmt>,
) -> Ident {
    let el_ident = vt.next_el_ident();
    // 1) 创建元素：来源 emit::call_ident 封装
    //    - 原因：统一封装元素创建，运行时可适配不同环境（浏览器/SVG/SSR）
    let create_el = call_ident("_$createElement", vec![string_expr(tag)]);
    stmts.push(const_decl(el_ident.clone(), create_el));
    // 2) 插入到父节点：来源 emit::append_child 封装
    //    - 原因：抽象原生 DOM API，便于批量插入/移动优化与跨环境适配
    stmts.push(append_child(parent.clone(), Expr::Ident(el_ident.clone())));
    // 记录元素标识符对应的标签名，后续如 style 文本等需要根据标签做适配处理
    vt.el_tag_by_ident.insert(el_ident.sym.to_string(), tag.to_string());
    log::debug(&format!("element_node: create tag={} id={}", tag, el_ident.sym.to_string()));
    el_ident
}
