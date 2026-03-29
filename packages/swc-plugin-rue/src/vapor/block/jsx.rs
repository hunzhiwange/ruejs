use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;

// 属性与事件编译入口：将 JSX 开标签上的属性统一转为运行时适配器调用
use crate::attrs::emit_attrs_for;
use crate::emit::*;
use crate::utils::is_component;

use super::super::VaporTransform;
use super::super::component;

impl VaporTransform {
    /// 将一个 JSXElement 转换为 Vapor 块：
    /// - 原生元素：创建根节点、设置属性、编译子节点
    /// - 组件：委托到 component::emit_component_root
    /// - 返回：`return { vaporElement: _root }`
    pub(crate) fn jsx_to_block(&mut self, el: &JSXElement) -> BlockStmt {
        // 声明块级根节点标识符（统一命名为 _root）
        let root = ident("_root");
        let mut stmts: Vec<Stmt> = Vec::new();

        // 若是组件（首字母大写命名等规则），委托给组件根构建逻辑
        if is_component(&el.opening.name) {
            return component::emit_component_root(self, el);
        }

        // 提取原生标签名（默认回退为 div）
        let tag = match &el.opening.name {
            JSXElementName::Ident(i) => i.sym.to_string(),
            _ => String::from("div"),
        };

        // 创建根元素：const _root = _$createElement(tag)
        // - 来源：emit::call_ident("_$createElement", ...)
        // - 原因：统一封装原生元素创建，以便在运行时适配不同环境（如 SSR/自定义渲染器）
        let create_root = call_ident("_$createElement", vec![string_expr(&tag)]);
        stmts.push(const_decl(root.clone(), create_root));
        // 编译并设置属性（包括事件、style、class、指令改写后的属性等）
        // - emit_attrs_for 内部会：
        //   - 静态属性：直接调用 `$setAttribute/$setClassName/$setStyle/...`
        //   - 动态属性：使用 `watchEffect` 包裹，保持与表达式同步
        emit_attrs_for(&mut stmts, &root, &el.opening);

        // 检查是否存在 dangerouslySetInnerHTML，若存在则跳过子节点编译（交由属性处理完成注入）
        let has_dangerously = el.opening.attrs.iter().any(|a| match a {
            JSXAttrOrSpread::JSXAttr(attr) => match &attr.name {
                JSXAttrName::Ident(idn) => idn.sym.as_ref() == "dangerouslySetInnerHTML",
                _ => false,
            },
            _ => false,
        });

        if !has_dangerously {
            // 编译并附加所有子节点到 _root
            // - 子节点可能是：文本、表达式容器、片段、嵌套元素
            // - children.emit_children 内部会对每类情况选择：
            //   - `$createTextNode` + `$appendChild`
            //   - 表达式 → `_$createTextWrapper` + `_$settextContent`（静态一次或动态 watch）
            //   - 递归构建嵌套元素或片段根
            super::children::emit_children(self, &root, &el.children, &mut stmts);
        }

        // 返回块级结果：return { vaporElement: _root }
        stmts.push(return_root(root));
        BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts }
    }

    /// 将 JSXFragment 转换为 Vapor 块：
    /// - 根：`DocumentFragment`
    /// - 子节点：递归
    /// - 返回：`return { vaporElement: _root }`
    pub(crate) fn jsx_fragment_to_block(&mut self, frag: &JSXFragment) -> BlockStmt {
        // 片段统一以 DocumentFragment 为根
        let root = ident("_root");
        let mut stmts: Vec<Stmt> = Vec::new();

        // 片段根创建：`_$createDocumentFragment()`：
        // - callee：标识符 `_$createDocumentFragment`
        // - args：空
        // - ctxt：统一 `SyntaxContext::empty()`
        let create_root = call_ident("_$createDocumentFragment", vec![]);
        stmts.push(const_decl(root.clone(), create_root));

        // 递归编译片段的 children 并附加到 _root
        super::children::emit_children(self, &root, &frag.children, &mut stmts);

        // 返回块级结果
        stmts.push(return_root(root));
        BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts }
    }
}
