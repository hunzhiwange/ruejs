// SWC 常量与上下文：
// - DUMMY_SP：稳定的“占位”源码位置信息，避免测试受原始位置信息影响
// - SyntaxContext：语义上下文（此处统一用 empty() 保持简单作用域）
use swc_core::common::{DUMMY_SP, SyntaxContext};
// SWC ECMAScript AST 节点类型集合（ArrowExpr/JSXElement/Module 等）
use swc_core::ecma::ast::*;
// SWC 访问器接口：
// - VisitMut：实现可变访问器以就地改写 AST
// - VisitMutWith：在某节点上调用访问器（驱动遍历）
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::emit::*;
use crate::imports::ensure_runtime_imports;
use crate::utils::unwrap_expr;

use super::VaporTransform;
use crate::log;

/// 访问器核心：
/// - 将表达式体或 `return` 返回的 JSX/Fragment 包裹进 `vapor(() => { ... })`
/// - 通过 `jsx_to_block/fragment_to_block` 生成块体，避免运行时解析 JSX
/// - 在发生转换后设置 `did_transform=true`，Module 访问阶段按需注入运行时 import
impl VisitMut for VaporTransform {
    /// 将 `() => <JSX />` 的箭头函数体替换为 `() => vapor(() => { ... })`
    /// 生成块体示例（参考 `tests/spec1.rs`）：
    /// - `const _root = _$createElement("div");`
    /// - `const _el1 = _$createElement("h1"); _$appendChild(_root, _el1);`
    /// - `return { vaporElement: _root }`
    fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
        log::debug("rue-swc: visit arrow_expr");
        match &mut *arrow.body {
            BlockStmtOrExpr::Expr(expr) => {
                let inner = unwrap_expr(expr.as_ref());
                match inner {
                    Expr::JSXElement(el) => {
                        log::debug("rue-swc: arrow JSXElement");
                        // 将 JSXElement 编译为块体，并用 vapor(() => {block}) 包裹
                        let block = self.jsx_to_block(el.as_ref());
                        let func = Expr::Arrow(ArrowExpr {
                            span: DUMMY_SP,
                            params: vec![],
                            body: Box::new(BlockStmtOrExpr::BlockStmt(block)),
                            is_async: false,
                            is_generator: false,
                            type_params: None,
                            return_type: None,
                            ctxt: SyntaxContext::empty(),
                        });
                        let call = call_ident("vapor", vec![func]);
                        *expr = Box::new(call);
                        // 标记已进行 Vapor 转换，用于模块级导入注入
                        self.did_transform = true;
                    }
                    Expr::JSXFragment(frag) => {
                        log::debug("rue-swc: arrow JSXFragment");
                        // 将片段编译为块体，并用 vapor(() => {block}) 包裹
                        let block = self.jsx_fragment_to_block(frag);
                        let func = Expr::Arrow(ArrowExpr {
                            span: DUMMY_SP,
                            params: vec![],
                            body: Box::new(BlockStmtOrExpr::BlockStmt(block)),
                            is_async: false,
                            is_generator: false,
                            type_params: None,
                            return_type: None,
                            ctxt: SyntaxContext::empty(),
                        });
                        let call = call_ident("vapor", vec![func]);
                        *expr = Box::new(call);
                        self.did_transform = true;
                    }
                    _ => {
                        // 重要：表达式体不直接是 JSX 时，仍需深入遍历其子节点（例如参数中的 ArrowExpr）
                        expr.visit_mut_children_with(self);
                    }
                }
            }
            BlockStmtOrExpr::BlockStmt(block) => {
                log::debug("rue-swc: arrow block");
                // 递归访问块体，让嵌套分支中的 return 也能转换为 vapor(() => { ... })
                block.visit_mut_children_with(self);
            }
        }
    }

    /// 将任意函数体中的 `return <JSX/>` / `return <>...</>` 转成 `return vapor(() => { ... })`
    fn visit_mut_return_stmt(&mut self, ret: &mut ReturnStmt) {
        if let Some(expr) = &mut ret.arg {
            let inner = unwrap_expr(expr.as_ref());
            match inner {
                Expr::JSXElement(el) => {
                    log::debug("rue-swc: nested return JSXElement");
                    // 将返回的 JSX 编译为块体，并用 vapor 包裹替换原返回值
                    let body_block = self.jsx_to_block(el.as_ref());
                    let func = Expr::Arrow(ArrowExpr {
                        span: DUMMY_SP,
                        params: vec![],
                        body: Box::new(BlockStmtOrExpr::BlockStmt(body_block)),
                        is_async: false,
                        is_generator: false,
                        type_params: None,
                        return_type: None,
                        ctxt: SyntaxContext::empty(),
                    });
                    let call = call_ident("vapor", vec![func]);
                    *expr = Box::new(call);
                    self.did_transform = true;
                }
                Expr::JSXFragment(frag) => {
                    log::debug("rue-swc: nested return JSXFragment");
                    // 将返回的片段编译为块体，并用 vapor 包裹替换原返回值
                    let body_block = self.jsx_fragment_to_block(frag);
                    let func = Expr::Arrow(ArrowExpr {
                        span: DUMMY_SP,
                        params: vec![],
                        body: Box::new(BlockStmtOrExpr::BlockStmt(body_block)),
                        is_async: false,
                        is_generator: false,
                        type_params: None,
                        return_type: None,
                        ctxt: SyntaxContext::empty(),
                    });
                    let call = call_ident("vapor", vec![func]);
                    *expr = Box::new(call);
                    self.did_transform = true;
                }
                _ => {}
            }
        }
    }

    /// 模块级处理：在发生 Vapor 转换后，按需注入 `rue-js` 运行时 import
    fn visit_mut_module(&mut self, m: &mut Module) {
        log::debug("rue-swc: visit module");
        // propagate into children first
        m.visit_mut_children_with(self);
        if !self.did_transform {
            return;
        }
        log::info("rue-swc: ensure runtime imports");
        // 注入导入集合包含：`vapor`, `renderBetween`, `_$createElement`, `_$appendChild`, `watchEffect` 等，
        // 以及类型导入 `FC`；若已存在从 `rue-js` 的 import，则合并缺失的 specifier，保持一次导入。
        // 细节：
        // - import 源：固定为 'rue-js'
        // - 类型导入优先插入（如 FC），值导入按稳定序列排序，保证快照稳定
        // - 采用 DUMMY_SP 与 SyntaxContext::empty() 构造 importdecl/specifier，避免位置信息干扰
        ensure_runtime_imports(m);
    }
}
