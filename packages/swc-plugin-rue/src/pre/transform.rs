use std::collections::{HashMap, HashSet};
// 原子字符串：高效存储符号/字符串字面量
use swc_core::atoms::Atom;
// SWC 常量与上下文：
// - DUMMY_SP：稳定的占位 span
// - SyntaxContext：语义上下文（统一 empty）
use swc_core::common::{DUMMY_SP, SyntaxContext};
// SWC ECMAScript AST 节点类型集合（Module/JSXElement/CallExpr 等）
use swc_core::ecma::ast::*;
// SWC 可变访问器与驱动接口
use swc_core::ecma::visit::{VisitMut, VisitMutWith};
use swc_core::plugin::proxies::PluginCommentsProxy;

use super::for_directive;
use super::helpers::{
    arrow_has_reactive_render_control, collect_param_idents, has_component_render_return_in_block,
    is_fc_pat, is_untyped_arrow_component_decl, lower_props_derived_consts_in_arrow_with_inputs,
    lower_props_derived_consts_in_function_with_inputs, process_fn_decl, process_function,
    process_var_decl, rewrite_component_props_destructure_in_arrow,
    rewrite_component_props_destructure_in_arrow_with_ident,
    rewrite_component_props_destructure_in_function,
    rewrite_component_props_destructure_in_function_with_ident, should_transform_fn_decl,
};
use super::if_directive;
use super::model_directive;
use super::on_directive;
use super::show_directive;
use super::template_directive;

/*
预处理（浅编译）阶段说明：
- 目标：在不生成原生 DOM 的前提下，对指令与组件 useSetup 进行形态规整，使后续 Vapor 深编译更简单。
- 功能：
  1) 指令处理：
                - `v-on/r-on/@` 事件指令 → 改写为标准 `onClick/onInput` 或组件 native 标记，复用现有事件编译路径
    - `v-show/r-show` → 改写为统一的 `style` 表达式，运行时 `_$compiledShowStyle` 决定隐藏显示
        - `v-for/r-for` → 改写为标准 `map(...)` 表达式，继续走现有 TSX 列表编译路径
    - `v-if/v-else-if/v-else` 与 `r-if/r-else-if/r-else` → 连续兄弟 JSX 改写为一个条件表达式容器
  2) 组件 useSetup 注入：
     - 收集 return 之前的“安全声明与副作用”（常量/函数/已知 watcher 等），插入到返回 JSX 前
     - 白名单与纯度分析结合，避免把带副作用的表达式错误地移动
  3) Hook 包装：
     - 将 `useEffect/useRef/reactive/ref/useState/watchEffect` 包裹为 `_$compiledWithHookId(id, () => innerCall)`
     - `id` 构成：`<kind>:<scope-chain>:<index>`，作用域链与递增索引用于区分同函数内的调用
- Import 注入：预处理已可能引入运行时符号，模块尾部调用 `ensure_runtime_imports` 合并导入。
*/
// 示例（输入 → 输出概要）：
// 输入：
//   function Demo() {
//     const n = ref(0)
//     return <div v-show={n.value > 0}>{n.value > 1 ? <A/> : <B/>}</div>
//   }
// 输出（概要）：
//   - Hook 包装：ref → _$compiledWithHookId("ref:1:0", () => ref(0))
//   - v-show 改写：在 opening.attrs 上生成 style 表达式（运行时 _$compiledShowStyle）
//   - 条件容器：children 中的三元保持表达式形态（Cons/Alt 内含 JSX），后续 Vapor 阶段统一转可挂载槽值
/// 预处理器状态：
/// - in_component：当前遍历是否处于组件语境（用于在函数退出时决定是否注入 useSetup）
/// - seen_ids/dup_count：保留字段（可用于未来重复 ID 统计或消歧）
/// - scope_stack/next_scope：作用域链编号栈，进入函数/模块等时递增，形成 "1.2.3" 链
/// - hook_index_stack：同一作用域内 Hook 调用的递增索引
#[derive(Default)]
pub struct PreTransform {
    in_component: bool,
    #[allow(dead_code)]
    seen_ids: HashSet<String>,
    #[allow(dead_code)]
    dup_count: HashMap<String, usize>,
    scope_stack: Vec<usize>,
    next_scope: usize,
    hook_index_stack: Vec<usize>,
    compiled_runtime_bindings: HashSet<String>,
    compiled_component_names: HashSet<String>,
    in_compiled_component: bool,
}

impl PreTransform {
    pub fn with_compiled_components(
        _comments: Option<PluginCommentsProxy>,
        compiled_component_names: HashSet<String>,
    ) -> Self {
        Self { compiled_component_names, ..Self::default() }
    }
}

#[derive(Default)]
struct HookIdDeduper {
    seen: HashMap<String, usize>,
}

impl VisitMut for HookIdDeduper {
    fn visit_mut_call_expr(&mut self, c: &mut CallExpr) {
        c.visit_mut_children_with(self);

        let Callee::Expr(callee) = &c.callee else {
            return;
        };
        let Expr::Ident(id) = callee.as_ref() else {
            return;
        };
        if id.sym.as_ref() != "_$compiledWithHookId" {
            return;
        }

        let Some(first_arg) = c.args.get_mut(0) else {
            return;
        };
        let Expr::Lit(Lit::Str(str_lit)) = first_arg.expr.as_mut() else {
            return;
        };

        let raw_id = str_lit.value.to_string_lossy().into_owned();
        let count = self.seen.entry(raw_id.clone()).or_insert(0);
        if *count > 0 {
            str_lit.value = Atom::from(format!("{}:dup{}", raw_id, *count)).into();
            str_lit.raw = None;
        }
        *count += 1;
    }
}

#[cfg(test)]
#[path = "transform_tests.rs"]
mod tests;

impl VisitMut for PreTransform {
    fn visit_mut_module(&mut self, m: &mut Module) {
        self.compiled_runtime_bindings = m
            .body
            .iter()
            .filter_map(|item| match item {
                ModuleItem::ModuleDecl(ModuleDecl::Import(import))
                    if import.src.value.as_str().is_some_and(|source| {
                        source == "@rue-js/rue/internal"
                            || source.starts_with("@rue-js/rue/internal/")
                    }) =>
                {
                    Some(&import.specifiers)
                }
                _ => None,
            })
            .flatten()
            .filter_map(|specifier| match specifier {
                ImportSpecifier::Named(named) => Some(named.local.sym.to_string()),
                _ => None,
            })
            .collect();
        // 进入模块作用域：记录 scope，并初始化当前作用域的 hook 索引
        self.next_scope += 1;
        self.scope_stack.push(self.next_scope);
        self.hook_index_stack.push(0);
        m.visit_mut_children_with(self);
        // 退出模块作用域
        self.hook_index_stack.pop();
        self.scope_stack.pop();
        // 对函数声明进行二次处理：若函数体返回 JSX，则进行 useSetup 注入
        for item in &mut m.body {
            if let ModuleItem::Stmt(Stmt::Decl(Decl::Fn(fd))) = item
                && let Some(block) = &mut fd.function.body
            {
                let has_jsx_return = has_component_render_return_in_block(block);
                if has_jsx_return && !self.compiled_component_names.contains(fd.ident.sym.as_ref())
                {
                    process_function(&mut fd.function);
                }
            }
        }
        // 统一为同模块内重复的 hook id 追加稳定后缀，避免跨组件槽位碰撞。
        m.visit_mut_with(&mut HookIdDeduper::default());
        // 合并确保运行时导入（例如 _$compiledWithHookId/_$compiledShowStyle/useSetup 等）
        crate::imports::ensure_runtime_imports(m);
    }

    fn visit_mut_jsx_opening_element(&mut self, opening: &mut JSXOpeningElement) {
        // v-on/r-on/@ 事件指令 → 标准 onX 事件属性或组件 native 事件标记
        on_directive::transform_opening(opening);
        // v-model/r-model → 受控 props / 事件写回
        model_directive::transform_opening(opening);
        // v-show/r-show → 样式驱动显示控制
        show_directive::transform_opening(opening);
    }

    fn visit_mut_jsx_element(&mut self, el: &mut JSXElement) {
        if if_directive::has_pre_directive(el) {
            return;
        }

        el.visit_mut_children_with(self);
        // 小写 <template v-if / v-for / slot> 预先改写为现有的 Template 组件，
        // 以复用后续已有的条件、列表与 slot lowering 路径。
        template_directive::transform_element(el);
        // v-for/r-for → 标准 map 表达式容器
        for_directive::transform_element(el);
        // v-if/v-else-if/v-else 与 r-if/r-else-if/r-else → 条件表达式容器
        if_directive::transform_element(el);
    }

    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        expr.visit_mut_children_with(self);
        if let Expr::JSXElement(el) = expr
            && let Some(memo_expr) = if_directive::memo_or_once_element_expr(el.as_ref())
        {
            *expr = memo_expr;
            return;
        }
    }

    fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
        arrow.visit_mut_children_with(self);
        // Component declarations are rewritten by visit_mut_var_decl before entering their body.
        // Do not reinterpret nested JSX callbacks (notably destructured Array.map renderers) as
        // components: doing so renames their item parameter to __rue_props and shadows the actual
        // component props object referenced by the enclosing render.
        if !self.in_component && arrow_has_reactive_render_control(arrow) {
            let reactive_prop_aliases = collect_param_idents(&arrow.params);
            rewrite_component_props_destructure_in_arrow(arrow);
            lower_props_derived_consts_in_arrow_with_inputs(arrow, reactive_prop_aliases);
        }
    }

    fn visit_mut_function(&mut self, func: &mut Function) {
        // 进入函数作用域：记录 scope，并初始化当前作用域的 hook 索引
        self.next_scope += 1;
        self.scope_stack.push(self.next_scope);
        self.hook_index_stack.push(0);
        func.visit_mut_children_with(self);
        // 退出函数作用域
        self.hook_index_stack.pop();
        self.scope_stack.pop();
        // 若当前处于组件语境，则对该函数体执行 useSetup 注入
        if self.in_component && !self.in_compiled_component {
            process_function(func);
        }
    }

    fn visit_mut_fn_decl(&mut self, f: &mut FnDecl) {
        // 判定该函数声明是否作为组件处理（返回 JSX 或返回类型为 JSX.Element）
        let is_comp = should_transform_fn_decl(f);
        let is_compiled = self.compiled_component_names.contains(f.ident.sym.as_ref());
        if is_comp && !is_compiled {
            let params: Vec<Pat> =
                f.function.params.iter().map(|param| param.pat.clone()).collect();
            let reactive_prop_aliases = collect_param_idents(&params);
            if let (Some(props), Some(body)) = (
                f.function.params.first().and_then(|param| match &param.pat {
                    Pat::Ident(binding) => Some(binding.id.clone()),
                    _ => None,
                }),
                f.function.body.as_mut(),
            ) {
                crate::compiled_props::lower_body_props_destructure(body, &props);
            }
            if self.in_component {
                let nested_props_ident = format!("__rue_nested_props_{}", self.next_scope);
                rewrite_component_props_destructure_in_function_with_ident(
                    &mut f.function,
                    &nested_props_ident,
                );
            } else {
                rewrite_component_props_destructure_in_function(&mut f.function);
            }
            lower_props_derived_consts_in_function_with_inputs(
                &mut f.function,
                reactive_prop_aliases,
            );
        } else if is_comp && is_compiled {
            let reactive_prop_aliases: HashSet<String> = f
                .function
                .params
                .first()
                .and_then(|param| match &param.pat {
                    Pat::Ident(binding) => Some(binding.id.sym.to_string()),
                    _ => None,
                })
                .into_iter()
                .collect();
            if let (Some(props), Some(body)) = (
                f.function.params.first().and_then(|param| match &param.pat {
                    Pat::Ident(binding) => Some(binding.id.clone()),
                    _ => None,
                }),
                f.function.body.as_mut(),
            ) {
                crate::compiled_props::lower_body_props_destructure(body, &props);
            }
            lower_props_derived_consts_in_function_with_inputs(
                &mut f.function,
                reactive_prop_aliases,
            );
        }
        let prev = self.in_component;
        let prev_compiled = self.in_compiled_component;
        if is_comp {
            self.in_component = true;
            self.in_compiled_component = is_compiled;
        }
        f.visit_mut_children_with(self);
        // 恢复组件语境标志
        self.in_component = prev;
        self.in_compiled_component = prev_compiled;
        if !is_comp {
            return;
        }
        // 组件函数声明：执行 useSetup 注入
        if !is_compiled {
            process_fn_decl(f);
        }
    }

    fn visit_mut_var_decl(&mut self, v: &mut VarDecl) {
        // 判定变量声明是否是组件（显式 FC 或未标注但返回 JSX 的箭头函数）
        let is_comp =
            v.decls.iter().any(|d| is_fc_pat(&d.name) || is_untyped_arrow_component_decl(d));
        let compiled_decl = v.decls.iter().find_map(|decl| match &decl.name {
            Pat::Ident(binding)
                if self.compiled_component_names.contains(binding.id.sym.as_ref()) =>
            {
                Some(binding.id.sym.to_string())
            }
            _ => None,
        });
        if is_comp && compiled_decl.is_none() {
            for decl in &mut v.decls {
                let is_decl_comp = is_fc_pat(&decl.name) || is_untyped_arrow_component_decl(decl);
                if !is_decl_comp {
                    continue;
                }
                if let Some(Expr::Arrow(arrow)) = decl.init.as_mut().map(|expr| expr.as_mut()) {
                    let reactive_prop_aliases = collect_param_idents(&arrow.params);
                    if let (Some(Pat::Ident(binding)), BlockStmtOrExpr::BlockStmt(body)) =
                        (arrow.params.first(), arrow.body.as_mut())
                    {
                        crate::compiled_props::lower_body_props_destructure(body, &binding.id);
                    }
                    if self.in_component {
                        let nested_props_ident = format!("__rue_nested_props_{}", self.next_scope);
                        rewrite_component_props_destructure_in_arrow_with_ident(
                            arrow,
                            &nested_props_ident,
                        );
                    } else {
                        rewrite_component_props_destructure_in_arrow(arrow);
                    }
                    lower_props_derived_consts_in_arrow_with_inputs(arrow, reactive_prop_aliases);
                }
            }
        } else if is_comp && compiled_decl.is_some() {
            // 深编译组件仍需在 JSX lowering 前处理响应式状态与 composable 的派生快照；
            // compiled component pass 会继续负责 setup 槽位与细粒度 DOM effects。
            for decl in &mut v.decls {
                let Some(Expr::Arrow(arrow)) = decl.init.as_mut().map(|expr| expr.as_mut()) else {
                    continue;
                };
                let reactive_prop_aliases = collect_param_idents(&arrow.params);
                if let (Some(Pat::Ident(binding)), BlockStmtOrExpr::BlockStmt(body)) =
                    (arrow.params.first(), arrow.body.as_mut())
                {
                    crate::compiled_props::lower_body_props_destructure(body, &binding.id);
                }
                lower_props_derived_consts_in_arrow_with_inputs(arrow, reactive_prop_aliases);
            }
        }
        let prev = self.in_component;
        let prev_compiled = self.in_compiled_component;
        if is_comp {
            self.in_component = true;
            self.in_compiled_component = compiled_decl.is_some();
        }
        v.visit_mut_children_with(self);
        // 恢复组件语境标志；组件的箭头函数体在 helpers 中完成 useSetup 注入
        self.in_component = prev;
        self.in_compiled_component = prev_compiled;
        if compiled_decl.is_none() {
            process_var_decl(v);
        }
    }

    fn visit_mut_call_expr(&mut self, c: &mut CallExpr) {
        c.visit_mut_children_with(self);
        // Hook 包装：将常见 Hook/响应式调用包裹到 _$compiledWithHookId 中，生成稳定的 ID
        let mut should_wrap = false;
        let mut hook_name: Option<String> = None;
        if let Callee::Expr(e) = &c.callee
            && let Expr::Ident(id) = e.as_ref()
        {
            let name = id.sym.as_ref();
            if !self.compiled_runtime_bindings.contains(name)
                && (name == "useEffect"
                    || name == "useRef"
                    || name == "reactive"
                    || name == "ref"
                    || name == "useState"
                    || name == "watchEffect"
                    || name == "watch"
                    || name == "watchSignal"
                    || name == "watchFn"
                    || name == "watchPath"
                    || name == "watchDeepSignal"
                    || name == "computed"
                    || name == "signal"
                    || name == "readonly"
                    || name == "shallowReactive"
                    || name == "useSetup"
                    || name == "shallowReadonly")
            {
                should_wrap = true;
                hook_name = Some(name.to_string());
            }
        }
        if should_wrap && !self.in_compiled_component {
            // kind：Hook 名称；scope：作用域链（如 "1.2"）；idx：同作用域内调用的序号
            let kind = hook_name.unwrap_or_else(|| "hook".to_string());
            let scope = if self.scope_stack.is_empty() {
                "0".to_string()
            } else {
                self.scope_stack.iter().map(|n| n.to_string()).collect::<Vec<_>>().join(".")
            };
            let idx = if let Some(last) = self.hook_index_stack.last_mut() {
                let cur = *last;
                *last = cur + 1;
                cur
            } else {
                0
            };
            // 形如 "useEffect:1.2:0" 的 ID 字符串表达式
            let id_expr = crate::emit::string_expr(&format!("{}:{}:{}", kind, scope, idx));
            // inner：原始调用表达式
            let inner = Expr::Call(c.clone());
            // 箭头函数包裹 inner：() => inner
            let arrow = Expr::Arrow(ArrowExpr {
                span: DUMMY_SP,
                params: vec![],
                body: Box::new(BlockStmtOrExpr::Expr(Box::new(inner))),
                is_async: false,
                is_generator: false,
                type_params: None,
                return_type: None,
                ctxt: SyntaxContext::empty(),
            });
            // 将 callee 改为 _$compiledWithHookId，并以 [id, arrow] 作为参数
            c.callee = Callee::Expr(Box::new(Expr::Ident(Ident::new(
                Atom::from("_$compiledWithHookId"),
                DUMMY_SP,
                SyntaxContext::empty(),
            ))));
            c.args = vec![
                ExprOrSpread { spread: None, expr: Box::new(id_expr) },
                ExprOrSpread { spread: None, expr: Box::new(arrow) },
            ];
            c.type_args = None;
        }
    }
}
