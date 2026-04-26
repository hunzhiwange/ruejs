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

use super::helpers::{
    has_jsx_return_in_block, is_fc_pat, is_untyped_arrow_component_decl, process_fn_decl,
    process_function, process_var_decl, should_transform_fn_decl,
};
use super::if_directive;
use super::show_directive;

/*
预处理（浅编译）阶段说明：
- 目标：在不生成原生 DOM 的前提下，对指令与组件 useSetup 进行形态规整，使后续 Vapor 深编译更简单。
- 功能：
  1) 指令处理：
    - `v-show/r-show` → 改写为统一的 `style` 表达式，运行时 `_$vaporShowStyle` 决定隐藏显示
    - `v-if/v-else-if/v-else` 与 `r-if/r-else-if/r-else` → 连续兄弟 JSX 改写为一个条件表达式容器
  2) 组件 useSetup 注入：
     - 收集 return 之前的“安全声明与副作用”（常量/函数/已知 watcher 等），插入到返回 JSX 前
     - 白名单与纯度分析结合，避免把带副作用的表达式错误地移动
  3) Hook 包装：
     - 将 `useMemo/useEffect/useRef/reactive/ref/useState/watchEffect` 包裹为 `_$vaporWithHookId(id, () => innerCall)`
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
//   - Hook 包装：ref → _$vaporWithHookId("ref:1:0", () => ref(0))
//   - v-show 改写：在 opening.attrs 上生成 style 表达式（运行时 _$vaporShowStyle）
//   - 条件容器：children 中的三元保持表达式形态（Cons/Alt 内含 JSX），后续 Vapor 阶段统一转可挂载槽值
/// 预处理器状态：
/// - in_component：当前遍历是否处于组件语境（用于在函数退出时决定是否注入 useSetup）
/// - seen_ids/dup_count：保留字段（可用于未来重复 ID 统计或消歧）
/// - scope_stack/next_scope：作用域链编号栈，进入函数/模块等时递增，形成 "1.2.3" 链
/// - hook_index_stack：同一作用域内 Hook 调用的递增索引
pub struct PreTransform {
    in_component: bool,
    #[allow(dead_code)]
    seen_ids: HashSet<String>,
    #[allow(dead_code)]
    dup_count: HashMap<String, usize>,
    scope_stack: Vec<usize>,
    next_scope: usize,
    hook_index_stack: Vec<usize>,
}

impl Default for PreTransform {
    fn default() -> Self {
        Self {
            in_component: false,
            seen_ids: HashSet::new(),
            dup_count: HashMap::new(),
            scope_stack: Vec::new(),
            next_scope: 0,
            hook_index_stack: Vec::new(),
        }
    }
}

impl VisitMut for PreTransform {
    fn visit_mut_module(&mut self, m: &mut Module) {
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
            if let ModuleItem::Stmt(Stmt::Decl(Decl::Fn(fd))) = item {
                if let Some(block) = &mut fd.function.body {
                    let has_jsx_return = has_jsx_return_in_block(block);
                    if has_jsx_return {
                        process_function(&mut fd.function);
                    }
                }
            }
        }
        // 合并确保运行时导入（例如 _$vaporWithHookId/_$vaporShowStyle/useSetup 等）
        crate::imports::ensure_runtime_imports(m);
    }

    fn visit_mut_jsx_opening_element(&mut self, opening: &mut JSXOpeningElement) {
        // v-show/r-show → 样式驱动显示控制
        show_directive::transform_opening(opening);
    }

    fn visit_mut_jsx_element(&mut self, el: &mut JSXElement) {
        el.visit_mut_children_with(self);
        // v-if/v-else-if/v-else 与 r-if/r-else-if/r-else → 条件表达式容器
        if_directive::transform_element(el);
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
        if self.in_component {
            process_function(func);
        }
    }

    fn visit_mut_fn_decl(&mut self, f: &mut FnDecl) {
        // 判定该函数声明是否作为组件处理（返回 JSX 或返回类型为 JSX.Element）
        let is_comp = should_transform_fn_decl(f);
        let prev = self.in_component;
        if is_comp {
            self.in_component = true;
        }
        f.visit_mut_children_with(self);
        // 恢复组件语境标志
        self.in_component = prev;
        if !is_comp {
            return;
        }
        // 组件函数声明：执行 useSetup 注入
        process_fn_decl(f);
    }

    fn visit_mut_var_decl(&mut self, v: &mut VarDecl) {
        // 判定变量声明是否是组件（显式 FC 或未标注但返回 JSX 的箭头函数）
        let is_comp =
            v.decls.iter().any(|d| is_fc_pat(&d.name) || is_untyped_arrow_component_decl(d));
        let prev = self.in_component;
        if is_comp {
            self.in_component = true;
        }
        v.visit_mut_children_with(self);
        // 恢复组件语境标志；组件的箭头函数体在 helpers 中完成 useSetup 注入
        self.in_component = prev;
        process_var_decl(v);
    }

    fn visit_mut_call_expr(&mut self, c: &mut CallExpr) {
        c.visit_mut_children_with(self);
        // Hook 包装：将常见 Hook/响应式调用包裹到 _$vaporWithHookId 中，生成稳定的 ID
        let mut should_wrap = false;
        let mut hook_name: Option<String> = None;
        if let Callee::Expr(e) = &c.callee {
            if let Expr::Ident(id) = e.as_ref() {
                let name = id.sym.as_ref();
                if name == "useMemo"
                    || name == "useEffect"
                    || name == "useCallback"
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
                    || name == "useSignal"
                    || name == "useSetup"
                    || name == "shallowReadonly"
                {
                    should_wrap = true;
                    hook_name = Some(name.to_string());
                }
            }
        }
        if should_wrap {
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
            // 形如 "useMemo:1.2:0" 的 ID 字符串表达式
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
            // 将 callee 改为 _$vaporWithHookId，并以 [id, arrow] 作为参数
            c.callee = Callee::Expr(Box::new(Expr::Ident(Ident::new(
                Atom::from("_$vaporWithHookId"),
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
