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

fn collect_scalar_names_from_pat(pat: &Pat, names: &mut std::collections::HashSet<String>) {
    match pat {
        Pat::Ident(binding) => {
            if crate::element_expr::is_global_scalar_constructor_name(binding.id.sym.as_ref()) {
                names.insert(binding.id.sym.to_string());
            }
        }
        Pat::Array(array) => {
            for element in array.elems.iter().flatten() {
                collect_scalar_names_from_pat(element, names);
            }
        }
        Pat::Object(object) => {
            for prop in &object.props {
                match prop {
                    ObjectPatProp::Assign(prop) => {
                        if crate::element_expr::is_global_scalar_constructor_name(
                            prop.key.sym.as_ref(),
                        ) {
                            names.insert(prop.key.sym.to_string());
                        }
                    }
                    ObjectPatProp::KeyValue(prop) => {
                        collect_scalar_names_from_pat(&prop.value, names);
                    }
                    ObjectPatProp::Rest(prop) => {
                        collect_scalar_names_from_pat(&prop.arg, names);
                    }
                }
            }
        }
        Pat::Assign(assign) => collect_scalar_names_from_pat(&assign.left, names),
        Pat::Rest(rest) => collect_scalar_names_from_pat(&rest.arg, names),
        _ => {}
    }
}

fn collect_scalar_names_from_stmts<'a>(
    stmts: impl IntoIterator<Item = &'a Stmt>,
) -> std::collections::HashSet<String> {
    let mut names = std::collections::HashSet::new();
    for stmt in stmts {
        let Stmt::Decl(decl) = stmt else {
            continue;
        };
        match decl {
            Decl::Var(var) => {
                for declarator in &var.decls {
                    collect_scalar_names_from_pat(&declarator.name, &mut names);
                }
            }
            Decl::Fn(function) => {
                if crate::element_expr::is_global_scalar_constructor_name(
                    function.ident.sym.as_ref(),
                ) {
                    names.insert(function.ident.sym.to_string());
                }
            }
            Decl::Class(class) => {
                if crate::element_expr::is_global_scalar_constructor_name(class.ident.sym.as_ref())
                {
                    names.insert(class.ident.sym.to_string());
                }
            }
            _ => {}
        }
    }
    names
}

fn collect_module_scalar_names(module: &Module) -> std::collections::HashSet<String> {
    let mut names = collect_scalar_names_from_stmts(
        module
            .body
            .iter()
            .filter_map(|item| if let ModuleItem::Stmt(stmt) = item { Some(stmt) } else { None }),
    );
    for item in &module.body {
        let ModuleItem::ModuleDecl(ModuleDecl::Import(import)) = item else {
            continue;
        };
        for specifier in &import.specifiers {
            let local = match specifier {
                ImportSpecifier::Named(specifier) => &specifier.local,
                ImportSpecifier::Default(specifier) => &specifier.local,
                ImportSpecifier::Namespace(specifier) => &specifier.local,
            };
            if crate::element_expr::is_global_scalar_constructor_name(local.sym.as_ref()) {
                names.insert(local.sym.to_string());
            }
        }
    }
    names
}

fn vapor_parent_param() -> Pat {
    Pat::Ident(BindingIdent { id: ident("__rue_parent_context"), type_ann: None })
}

fn component_function_spans(module: &Module) -> Vec<swc_core::common::Span> {
    fn collect_decl(decl: &Decl, spans: &mut Vec<swc_core::common::Span>) {
        match decl {
            Decl::Var(var) => {
                for declarator in &var.decls {
                    if !(crate::pre::is_fc_pat(&declarator.name)
                        || crate::pre::is_untyped_arrow_component_decl(declarator))
                    {
                        continue;
                    }
                    if let Some(Expr::Arrow(arrow)) = declarator.init.as_deref() {
                        spans.push(arrow.span);
                    }
                }
            }
            Decl::Fn(function)
                if function
                    .function
                    .body
                    .as_ref()
                    .is_some_and(|body| crate::pre::has_component_render_return_in_block(body)) =>
            {
                spans.push(function.function.span);
            }
            _ => {}
        }
    }

    let mut spans = Vec::new();
    for item in &module.body {
        match item {
            ModuleItem::Stmt(Stmt::Decl(decl))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl { decl, .. })) => {
                collect_decl(decl, &mut spans)
            }
            _ => {}
        }
    }
    spans
}

/// 访问器核心：
/// - 将表达式体或 `return` 返回的 JSX/Fragment 包裹进 `_$compiledRoot(() => { ... })`
/// - 通过 `jsx_to_block/fragment_to_block` 生成块体，避免运行时解析 JSX
/// - 在发生转换后设置 `did_transform=true`，Module 访问阶段按需注入运行时 import
impl VisitMut for VaporTransform {
    /// JSX may appear in any expression container, not only as an arrow body or return value.
    /// Lower those values through the same slot protocol so SWC never needs a JSX fallback pass.
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        match expr {
            Expr::JSXElement(_) | Expr::JSXFragment(_) => {
                let lowered = crate::element_expr::make_expr_for_slot(self, expr);
                *expr = lowered;
                self.did_transform = true;
            }
            _ => expr.visit_mut_children_with(self),
        }
    }

    fn visit_mut_block_stmt(&mut self, block: &mut BlockStmt) {
        let visible_renderable_locals = self.current_renderable_local_names();
        let scope = crate::element_expr::collect_renderable_local_alias_names(
            block.stmts.iter(),
            &visible_renderable_locals,
        );
        let scalar_scope = collect_scalar_names_from_stmts(block.stmts.iter());
        let reactive_scope = crate::reactive_provenance::collect_stmt_scope(
            block.stmts.iter(),
            &self.plain_local_scopes,
        );
        let mut scalar_scope = scalar_scope;
        scalar_scope.extend(reactive_scope);
        self.push_renderable_local_scope(scope);
        self.push_plain_local_scope(scalar_scope);
        block.visit_mut_children_with(self);
        self.pop_plain_local_scope();
        self.pop_renderable_local_scope();
    }

    /// 将 `() => <JSX />` 的箭头函数体替换为 `() => _$compiledRoot(() => { ... })`
    /// 生成块体示例（参考 `tests/spec1.rs`）：
    /// - `const _root = _$createElement("div");`
    /// - `const _el1 = _$createElement("h1"); _$appendChild(_root, _el1);`
    /// - `return _root`
    fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
        log::debug("rue-swc: visit arrow_expr");
        self.push_function_scope(arrow.is_async);
        let mut scalar_scope = std::collections::HashSet::new();
        for param in &arrow.params {
            collect_scalar_names_from_pat(param, &mut scalar_scope);
        }
        scalar_scope.extend(if self.is_component_function(arrow.span) {
            crate::reactive_provenance::collect_component_parameter_scope(arrow.params.iter())
        } else {
            crate::reactive_provenance::collect_parameter_scope(arrow.params.iter())
        });
        self.push_plain_local_scope(scalar_scope);
        match &mut *arrow.body {
            BlockStmtOrExpr::Expr(expr) => {
                let inner = unwrap_expr(expr.as_ref());
                match inner {
                    Expr::JSXElement(el) => {
                        log::debug("rue-swc: arrow JSXElement");
                        if crate::utils::is_component(&el.opening.name) {
                            **expr = crate::element_expr::make_expr_for_slot(self, inner);
                        } else if !self.current_function_is_async()
                            && crate::element_children::is_compiled_safe_element(self, el.as_ref())
                        {
                            let block = crate::element_children::compiled_scalar_element_to_block(
                                self,
                                el.as_ref(),
                            );
                            **expr = crate::element_children::compiled_block_to_root_expr(block);
                        } else if self.static_templates
                            && !self.current_function_is_async()
                            && let Some((handle, reserved_elements)) =
                                super::template::static_root_handle_expr(el.as_ref())
                        {
                            self.next_el += reserved_elements;
                            **expr = handle;
                        } else {
                            // 将 JSXElement 编译为块体，并用 _$compiledRoot(() => {block}) 包裹
                            let block = self.jsx_to_block(el.as_ref());
                            let func = Expr::Arrow(ArrowExpr {
                                span: DUMMY_SP,
                                params: vec![vapor_parent_param()],
                                body: Box::new(BlockStmtOrExpr::BlockStmt(block)),
                                is_async: false,
                                is_generator: false,
                                type_params: None,
                                return_type: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            **expr = call_ident("_$compiledRoot", vec![func]);
                        }
                        // 标记已进行 Vapor 转换，用于模块级导入注入
                        self.did_transform = true;
                    }
                    Expr::JSXFragment(frag) => {
                        log::debug("rue-swc: arrow JSXFragment");
                        if !self.current_function_is_async()
                            && crate::element_children::is_compiled_safe_fragment(self, frag)
                        {
                            let block =
                                crate::element_children::compiled_fragment_to_block(self, frag);
                            **expr = crate::element_children::compiled_block_to_root_expr(block);
                        } else {
                            // 将片段编译为块体，并用 _$compiledRoot(() => {block}) 包裹
                            let block = self.jsx_fragment_to_block(frag);
                            let func = Expr::Arrow(ArrowExpr {
                                span: DUMMY_SP,
                                params: vec![vapor_parent_param()],
                                body: Box::new(BlockStmtOrExpr::BlockStmt(block)),
                                is_async: false,
                                is_generator: false,
                                type_params: None,
                                return_type: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            **expr = call_ident("_$compiledRoot", vec![func]);
                        }
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
                // 必须走 block visitor 本身，才能为块内 `const iconNode = <JSX />` 这类 bare local
                // renderable alias 建立作用域；只访问 children 会绕过 visit_mut_block_stmt。
                block.visit_mut_with(self);
            }
        }
        self.pop_plain_local_scope();
        self.pop_function_scope();
    }

    fn visit_mut_function(&mut self, function: &mut Function) {
        self.push_function_scope(function.is_async);
        let mut scalar_scope = std::collections::HashSet::new();
        for param in &function.params {
            collect_scalar_names_from_pat(&param.pat, &mut scalar_scope);
        }
        scalar_scope.extend(if self.is_component_function(function.span) {
            crate::reactive_provenance::collect_component_parameter_scope(
                function.params.iter().map(|param| &param.pat),
            )
        } else {
            crate::reactive_provenance::collect_parameter_scope(
                function.params.iter().map(|param| &param.pat),
            )
        });
        self.push_plain_local_scope(scalar_scope);
        function.visit_mut_children_with(self);
        self.pop_plain_local_scope();
        self.pop_function_scope();
    }

    /// 将任意函数体中的 `return <JSX/>` / `return <>...</>` 转成 `return _$compiledRoot(() => { ... })`
    fn visit_mut_return_stmt(&mut self, ret: &mut ReturnStmt) {
        if let Some(expr) = &mut ret.arg {
            let inner = unwrap_expr(expr.as_ref());
            match inner {
                Expr::JSXElement(el) => {
                    log::debug("rue-swc: nested return JSXElement");
                    if crate::utils::is_component(&el.opening.name) {
                        **expr = crate::element_expr::make_expr_for_slot(self, inner);
                    } else if !self.current_function_is_async()
                        && crate::element_children::is_compiled_safe_element(self, el.as_ref())
                    {
                        let block = crate::element_children::compiled_scalar_element_to_block(
                            self,
                            el.as_ref(),
                        );
                        **expr = crate::element_children::compiled_block_to_root_expr(block);
                    } else if self.static_templates
                        && !self.current_function_is_async()
                        && let Some((handle, reserved_elements)) =
                            super::template::static_root_handle_expr(el.as_ref())
                    {
                        self.next_el += reserved_elements;
                        **expr = handle;
                    } else {
                        // 将返回的 JSX 编译为块体，并用 _$compiledRoot 包裹替换原返回值
                        let body_block = self.jsx_to_block(el.as_ref());
                        let func = Expr::Arrow(ArrowExpr {
                            span: DUMMY_SP,
                            params: vec![vapor_parent_param()],
                            body: Box::new(BlockStmtOrExpr::BlockStmt(body_block)),
                            is_async: false,
                            is_generator: false,
                            type_params: None,
                            return_type: None,
                            ctxt: SyntaxContext::empty(),
                        });
                        **expr = call_ident("_$compiledRoot", vec![func]);
                    }
                    self.did_transform = true;
                }
                Expr::JSXFragment(frag) => {
                    log::debug("rue-swc: nested return JSXFragment");
                    if !self.current_function_is_async()
                        && crate::element_children::is_compiled_safe_fragment(self, frag)
                    {
                        let block = crate::element_children::compiled_fragment_to_block(self, frag);
                        **expr = crate::element_children::compiled_block_to_root_expr(block);
                    } else {
                        // 将返回的片段编译为块体，并用 _$compiledRoot 包裹替换原返回值
                        let body_block = self.jsx_fragment_to_block(frag);
                        let func = Expr::Arrow(ArrowExpr {
                            span: DUMMY_SP,
                            params: vec![vapor_parent_param()],
                            body: Box::new(BlockStmtOrExpr::BlockStmt(body_block)),
                            is_async: false,
                            is_generator: false,
                            type_params: None,
                            return_type: None,
                            ctxt: SyntaxContext::empty(),
                        });
                        **expr = call_ident("_$compiledRoot", vec![func]);
                    }
                    self.did_transform = true;
                }
                _ => expr.visit_mut_children_with(self),
            }
        }
    }

    /// 模块级处理：在发生 Vapor 转换后，按需注入 `@rue-js/rue` 运行时 import
    fn visit_mut_module(&mut self, m: &mut Module) {
        log::debug("rue-swc: visit module");
        let mut hoisted_templates = if self.static_templates {
            super::template::collect_hoisted_templates(m)
        } else {
            Vec::new()
        };
        let visible_renderable_locals = self.current_renderable_local_names();
        let scope = crate::element_expr::collect_renderable_local_alias_names(
            m.body.iter().filter_map(|item| match item {
                ModuleItem::Stmt(stmt) => Some(stmt),
                _ => None,
            }),
            &visible_renderable_locals,
        );
        let mut scalar_scope = collect_module_scalar_names(m);
        scalar_scope
            .extend(crate::reactive_provenance::collect_module_scope(m, &self.plain_local_scopes));
        VaporTransform::register_component_functions(
            &mut scalar_scope,
            component_function_spans(m),
        );
        VaporTransform::register_compiled_components(
            &mut scalar_scope,
            crate::compiled_component::transformed_candidate_names(m),
        );
        VaporTransform::register_compiled_components(
            &mut scalar_scope,
            crate::compiled_component::imported_component_names(m),
        );
        VaporTransform::register_compiled_components(
            &mut scalar_scope,
            ["Teleport", "Suspense", "KeepAlive", "Transition", "TransitionGroup", "Template"]
                .into_iter()
                .map(str::to_string),
        );
        self.push_renderable_local_scope(scope);
        self.push_plain_local_scope(scalar_scope);
        // propagate into children first
        m.visit_mut_children_with(self);
        self.pop_plain_local_scope();
        self.pop_renderable_local_scope();
        super::template::strip_template_markers(m);
        super::template::retain_used_hoisted_templates(m, &mut hoisted_templates);
        if !self.did_transform {
            return;
        }
        log::info("rue-swc: ensure runtime imports");
        // 注入导入集合包含：`_$compiledRoot`, `renderAnchor`, `_$createElement`, `_$appendChild`, `watchEffect` 等，
        // 以及类型导入 `FC`；若已存在从 `@rue-js/rue` 的 import，则合并缺失的 specifier，保持一次导入。
        // 细节：
        // - import 源：固定为 '@rue-js/rue'
        // - 类型导入优先插入（如 FC），值导入按稳定序列排序，保证快照稳定
        // - 采用 DUMMY_SP 与 SyntaxContext::empty() 构造 importdecl/specifier，避免位置信息干扰
        super::template::inject_hoisted_templates(m, &hoisted_templates);
        ensure_runtime_imports(m);
    }
}

#[cfg(test)]
#[path = "visitor_tests.rs"]
mod tests;
