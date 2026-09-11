use std::collections::{HashMap, HashSet};
use swc_core::atoms::Atom;
use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitMut, VisitMutWith, VisitWith};

use super::on_setup;
use super::side_effect::{collect_idents_in_expr, expr_has_impure_ops};

const REACTIVE_PROPS_IDENT: &str = "__rue_props";

/*
SWC AST 类型速览（中文详细说明）：
- BlockStmt：表示一段以花括号包裹的语句块 { ... }，其中包含若干 Stmt（语句）。
- Stmt：语句的总称，常见子类：
  - Stmt::Decl：声明语句，进一步细分为 Var（变量声明）、Fn（函数声明）等；
  - Stmt::Return：return 语句，可选返回值 Expr；
  - Stmt::If / For / While / Switch / Try 等：控制流语句；
  - Stmt::Block：嵌套的语句块；
  - 其他如 Labeled、Empty 等。
- Expr：表达式的总称，常见子类：
  - Expr::JSXElement / Expr::JSXFragment：JSX 元素/片段；
  - Expr::Paren：括号表达式 (expr)；
  - 其他如 Call、Ident、Arrow、Object、Array 等。
- Pat：模式（用于解构绑定、参数等），常见子类：
  - Pat::Ident：标识符绑定（如 const a = ...）；
  - Pat::Array / Pat::Object：数组/对象解构模式；
  - Pat::Assign：赋值型模式（左侧是模式，右侧是默认值）；
  - 其他如 Rest 等。

本文件的核心目标：
1) 在返回 JSX 的函数/箭头函数组件体内，自动“收集并搬迁”安全的前置语句到一个 useSetup 容器中；
2) 通过 `on_setup::build_setup_with_binds` 注入 useSetup 包裹与解构绑定，使组件体更整洁，并便于后续运行时管理；
3) 明确注入边界：以第一个包含 return 的语句为边界，避免跨越控制流/副作用导致语义变化；
4) 识别组件：显式 FC 类型或未标注但返回 JSX 的箭头函数；
5) 避免重复注入：若已存在 `_$useSetup` 声明，则跳过。
*/

/*
预处理助手说明：
- `has_component_render_return_in_block`：判定函数体是否返回组件渲染结果，用于确定是否进行 useSetup 注入。
- `collect_setup`：
  - 自返回语句之前收集“安全语句”（常量声明、函数声明、已知 watcher、空语句等）；
  - 使用纯度分析与标识符收集，跳过依赖未知名称的表达式与含副作用的语句；
  - 返回收集到的语句以及 `const/let` 名称列表，用于后续解构绑定。
- `inject_setup`：
  - 将收集到的语句封装进 `useSetup(()=>{ ...; return { names... } })`；
  - 在返回语句之前插入 `const { consts } = _$useSetup; let { lets } = _$useSetup` 的解构绑定。
- 组件判定与处理：
  - `is_fc_pat`：变量声明的类型标注为 `FC` 视为函数组件；
  - `is_untyped_arrow_component_decl`：未标注但返回 JSX 的箭头函数视为组件；
  - `process_fn_decl/process_var_decl/process_function`：三类入口统一走“收集 + 注入”流程。
*/
fn expr_is_component_render_call(expr: &Expr) -> bool {
    match crate::utils::unwrap_expr(expr) {
        Expr::Call(call) => match &call.callee {
            Callee::Expr(callee) => match crate::utils::unwrap_expr(callee.as_ref()) {
                Expr::Ident(id) => {
                    matches!(id.sym.as_ref(), "h" | "_jsx" | "_jsxs" | "_jsxDEV")
                }
                _ => false,
            },
            _ => false,
        },
        _ => false,
    }
}

fn expr_is_component_renderable(expr: &Expr) -> bool {
    match crate::utils::unwrap_expr(expr) {
        Expr::JSXElement(_) | Expr::JSXFragment(_) => true,
        Expr::Cond(CondExpr { cons, alt, .. }) => {
            expr_is_component_renderable(cons.as_ref())
                || expr_is_component_renderable(alt.as_ref())
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd | BinaryOp::LogicalOr, right, .. }) => {
            expr_is_component_renderable(right.as_ref())
        }
        other => expr_is_component_render_call(other),
    }
}

pub fn has_component_render_return_in_block(block: &BlockStmt) -> bool {
    block.stmts.iter().any(|stmt| match stmt {
        Stmt::Return(ret) => {
            ret.arg.as_ref().map(|arg| expr_is_component_renderable(arg.as_ref())).unwrap_or(false)
        }
        _ => false,
    })
}

/// 找到第一个控制流语句的索引（If/For/While/ForIn/ForOf/Switch/Try），否则返回 ret_idx。
/// 作用：
/// - 控制流通常意味着路径分叉、副作用或复杂性；
/// - 将其作为潜在的注入边界，有助于避免跨边界搬迁语句导致行为改变。
pub fn first_control_idx(block: &BlockStmt, ret_idx: usize) -> usize {
    block
        .stmts
        .iter()
        .enumerate()
        // 从头开始查找最早出现的控制流语句类型
        .find_map(|(i, s)| match s {
            Stmt::If(_)
            | Stmt::For(_)
            | Stmt::While(_)
            | Stmt::ForIn(_)
            | Stmt::ForOf(_)
            | Stmt::Switch(_)
            | Stmt::Try(_) => Some(i),
            _ => None,
        })
        // 若没有控制流，则使用 ret_idx（即第一个包含 return 的语句索引）
        .unwrap_or(ret_idx)
}

fn object_pat_has_rest(obj: &ObjectPat) -> bool {
    obj.props.iter().any(|prop| match prop {
        ObjectPatProp::Rest(_) => true,
        ObjectPatProp::KeyValue(kv) => pat_has_object_rest(kv.value.as_ref()),
        ObjectPatProp::Assign(_) => false,
    })
}

fn object_pat_has_nested_rest_excluding_top_level(obj: &ObjectPat) -> bool {
    obj.props.iter().any(|prop| match prop {
        ObjectPatProp::Rest(_) => false,
        ObjectPatProp::KeyValue(kv) => pat_has_object_rest(kv.value.as_ref()),
        ObjectPatProp::Assign(_) => false,
    })
}

fn pat_has_object_rest(pat: &Pat) -> bool {
    match pat {
        Pat::Object(obj) => object_pat_has_rest(obj),
        Pat::Array(arr) => arr.elems.iter().flatten().any(pat_has_object_rest),
        Pat::Assign(assign) => pat_has_object_rest(assign.left.as_ref()),
        Pat::Rest(rest) => pat_has_object_rest(rest.arg.as_ref()),
        _ => false,
    }
}

fn collect_pat_declared_names(pat: &Pat, out: &mut HashSet<String>) {
    match pat {
        Pat::Ident(BindingIdent { id, .. }) => {
            out.insert(id.sym.to_string());
        }
        Pat::Array(arr) => {
            for pat in arr.elems.iter().flatten() {
                collect_pat_declared_names(pat, out);
            }
        }
        Pat::Object(obj) => {
            for prop in &obj.props {
                match prop {
                    ObjectPatProp::Assign(assign) => {
                        out.insert(assign.key.sym.to_string());
                    }
                    ObjectPatProp::KeyValue(kv) => {
                        collect_pat_declared_names(kv.value.as_ref(), out);
                    }
                    ObjectPatProp::Rest(rest) => {
                        collect_pat_declared_names(rest.arg.as_ref(), out);
                    }
                }
            }
        }
        Pat::Assign(assign) => collect_pat_declared_names(assign.left.as_ref(), out),
        Pat::Rest(rest) => collect_pat_declared_names(rest.arg.as_ref(), out),
        _ => {}
    }
}

fn collect_block_declared_names(block: &BlockStmt) -> HashSet<String> {
    let mut names = HashSet::new();

    for stmt in &block.stmts {
        match stmt {
            Stmt::Decl(Decl::Var(var)) => {
                for decl in &var.decls {
                    collect_pat_declared_names(&decl.name, &mut names);
                }
            }
            Stmt::Decl(Decl::Fn(fun)) => {
                names.insert(fun.ident.sym.to_string());
            }
            Stmt::Decl(Decl::Class(class)) => {
                names.insert(class.ident.sym.to_string());
            }
            _ => {}
        }
    }

    names
}

fn prop_access_expr(base: Expr, prop: &PropName) -> Expr {
    match prop {
        PropName::Ident(ident) => Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(base),
            prop: MemberProp::Ident(ident.clone()),
        }),
        PropName::Str(str_lit) => Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(base),
            prop: MemberProp::Computed(ComputedPropName {
                span: DUMMY_SP,
                expr: Box::new(Expr::Lit(Lit::Str(str_lit.clone()))),
            }),
        }),
        PropName::Num(num) => Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(base),
            prop: MemberProp::Computed(ComputedPropName {
                span: DUMMY_SP,
                expr: Box::new(Expr::Lit(Lit::Num(num.clone()))),
            }),
        }),
        PropName::Computed(computed) => Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(base),
            prop: MemberProp::Computed(computed.clone()),
        }),
        PropName::BigInt(bigint) => Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(base),
            prop: MemberProp::Computed(ComputedPropName {
                span: DUMMY_SP,
                expr: Box::new(Expr::Lit(Lit::BigInt(bigint.clone()))),
            }),
        }),
    }
}

fn tuple_index_expr(base: Expr, index: usize) -> Expr {
    Expr::Member(MemberExpr {
        span: DUMMY_SP,
        obj: Box::new(base),
        prop: MemberProp::Computed(ComputedPropName {
            span: DUMMY_SP,
            expr: Box::new(Expr::Lit(Lit::Num(Number {
                span: DUMMY_SP,
                value: index as f64,
                raw: None,
            }))),
        }),
    })
}

fn undefined_expr() -> Expr {
    Expr::Unary(UnaryExpr {
        span: DUMMY_SP,
        op: UnaryOp::Void,
        arg: Box::new(Expr::Lit(Lit::Num(Number { span: DUMMY_SP, value: 0.0, raw: None }))),
    })
}

fn with_default_expr(source_expr: Expr, default_expr: Expr) -> Expr {
    Expr::Cond(CondExpr {
        span: DUMMY_SP,
        test: Box::new(Expr::Bin(BinExpr {
            span: DUMMY_SP,
            op: BinaryOp::EqEqEq,
            left: Box::new(source_expr.clone()),
            right: Box::new(undefined_expr()),
        })),
        cons: Box::new(default_expr),
        alt: Box::new(source_expr),
    })
}

fn collect_reactive_prop_alias_exprs_from_pat(
    pat: &Pat,
    source_expr: Expr,
    out: &mut HashMap<String, Expr>,
) {
    match pat {
        Pat::Ident(binding) => {
            out.insert(binding.id.sym.to_string(), source_expr);
        }
        Pat::Array(arr) => {
            for (index, elem) in arr.elems.iter().enumerate() {
                if let Some(elem) = elem {
                    collect_reactive_prop_alias_exprs_from_pat(
                        elem,
                        tuple_index_expr(source_expr.clone(), index),
                        out,
                    );
                }
            }
        }
        Pat::Object(obj) => {
            for prop in &obj.props {
                match prop {
                    ObjectPatProp::Assign(assign) => {
                        let key_prop = PropName::Ident(assign.key.clone().into());
                        let next_expr = prop_access_expr(source_expr.clone(), &key_prop);
                        let mapped_expr = assign
                            .value
                            .as_ref()
                            .map(|default_expr| {
                                with_default_expr(next_expr.clone(), default_expr.as_ref().clone())
                            })
                            .unwrap_or(next_expr);
                        out.insert(assign.key.sym.to_string(), mapped_expr);
                    }
                    ObjectPatProp::KeyValue(kv) => {
                        collect_reactive_prop_alias_exprs_from_pat(
                            kv.value.as_ref(),
                            prop_access_expr(source_expr.clone(), &kv.key),
                            out,
                        );
                    }
                    ObjectPatProp::Rest(_) => {}
                }
            }
        }
        Pat::Assign(assign) => collect_reactive_prop_alias_exprs_from_pat(
            assign.left.as_ref(),
            with_default_expr(source_expr, assign.right.as_ref().clone()),
            out,
        ),
        Pat::Rest(rest) => {
            collect_reactive_prop_alias_exprs_from_pat(rest.arg.as_ref(), source_expr, out)
        }
        _ => {}
    }
}

fn wrap_alias_expr_if_needed(expr: Expr) -> Expr {
    match expr {
        Expr::Paren(_) => expr,
        other => match crate::utils::unwrap_expr(&other) {
            Expr::Bin(_) | Expr::Cond(_) | Expr::Assign(_) | Expr::Seq(_) => {
                Expr::Paren(ParenExpr { span: DUMMY_SP, expr: Box::new(other) })
            }
            _ => other,
        },
    }
}

struct ReactivePropsDestructureRewriter<'a> {
    alias_exprs: &'a HashMap<String, Expr>,
    scope_stack: Vec<HashSet<String>>,
}

impl<'a> ReactivePropsDestructureRewriter<'a> {
    fn new(alias_exprs: &'a HashMap<String, Expr>) -> Self {
        Self { alias_exprs, scope_stack: vec![HashSet::new()] }
    }

    fn is_shadowed(&self, name: &str) -> bool {
        self.scope_stack.iter().rev().any(|scope| scope.contains(name))
    }

    fn push_scope(&mut self, names: HashSet<String>) {
        self.scope_stack.push(names);
    }

    fn pop_scope(&mut self) {
        self.scope_stack.pop();
    }

    fn rewrite_ident_expr(&self, expr: &mut Expr) -> bool {
        if let Expr::Ident(ident) = expr
            && !self.is_shadowed(ident.sym.as_ref())
            && let Some(rewritten) = self.alias_exprs.get(ident.sym.as_ref())
        {
            *expr = wrap_alias_expr_if_needed(rewritten.clone());
            return true;
        }
        false
    }

    fn warning_for_watch_alias(&self, ident: &Ident) {
        if !self.is_shadowed(ident.sym.as_ref())
            && self.alias_exprs.contains_key(ident.sym.as_ref())
        {
            crate::log::warning(&format!(
                "rue-swc: reactive props destructure rewrote `{}` in watch(...). Use watch(() => {}, ...) instead.",
                ident.sym, ident.sym
            ));
        }
    }

    fn scoped_visit_with_names<T>(&mut self, names: HashSet<String>, node: &mut T)
    where
        T: VisitMutWith<Self>,
    {
        self.push_scope(names);
        node.visit_mut_children_with(self);
        self.pop_scope();
    }
}

fn collect_var_decl_names(var: &VarDecl, out: &mut HashSet<String>) {
    for decl in &var.decls {
        collect_pat_declared_names(&decl.name, out);
    }
}

fn collect_for_init_names(init: &Option<VarDeclOrExpr>) -> HashSet<String> {
    let mut names = HashSet::new();
    if let Some(VarDeclOrExpr::VarDecl(var)) = init {
        collect_var_decl_names(var, &mut names);
    }
    names
}

fn collect_for_head_names(left: &ForHead) -> HashSet<String> {
    let mut names = HashSet::new();
    match left {
        ForHead::VarDecl(var) => collect_var_decl_names(var, &mut names),
        ForHead::UsingDecl(using_decl) => {
            for decl in &using_decl.decls {
                collect_pat_declared_names(&decl.name, &mut names);
            }
        }
        ForHead::Pat(pat) => collect_pat_declared_names(pat, &mut names),
    }
    names
}

impl VisitMut for ReactivePropsDestructureRewriter<'_> {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if self.rewrite_ident_expr(expr) {
            return;
        }
        expr.visit_mut_children_with(self);
    }

    fn visit_mut_prop(&mut self, prop: &mut Prop) {
        if let Prop::Shorthand(ident) = prop
            && !self.is_shadowed(ident.sym.as_ref())
            && let Some(rewritten) = self.alias_exprs.get(ident.sym.as_ref())
        {
            *prop = Prop::KeyValue(KeyValueProp {
                key: PropName::Ident(ident.clone().into()),
                value: Box::new(wrap_alias_expr_if_needed(rewritten.clone())),
            });
            return;
        }
        prop.visit_mut_children_with(self);
    }

    fn visit_mut_block_stmt(&mut self, block: &mut BlockStmt) {
        let declared = collect_block_declared_names(block);
        self.push_scope(declared);
        block.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_function(&mut self, func: &mut Function) {
        let mut scope = HashSet::new();
        for param in &func.params {
            collect_pat_declared_names(&param.pat, &mut scope);
        }
        if let Some(body) = &func.body {
            scope.extend(collect_block_declared_names(body));
        }
        self.push_scope(scope);
        func.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
        let mut scope = HashSet::new();
        for param in &arrow.params {
            collect_pat_declared_names(param, &mut scope);
        }
        if let BlockStmtOrExpr::BlockStmt(block) = arrow.body.as_ref() {
            scope.extend(collect_block_declared_names(block));
        }
        self.push_scope(scope);
        arrow.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_catch_clause(&mut self, catch: &mut CatchClause) {
        let mut scope = HashSet::new();
        if let Some(param) = &catch.param {
            collect_pat_declared_names(param, &mut scope);
        }
        self.push_scope(scope);
        catch.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_for_stmt(&mut self, for_stmt: &mut ForStmt) {
        let names = collect_for_init_names(&for_stmt.init);
        self.scoped_visit_with_names(names, for_stmt);
    }

    fn visit_mut_for_in_stmt(&mut self, for_in: &mut ForInStmt) {
        let names = collect_for_head_names(&for_in.left);
        self.scoped_visit_with_names(names, for_in);
    }

    fn visit_mut_for_of_stmt(&mut self, for_of: &mut ForOfStmt) {
        let names = collect_for_head_names(&for_of.left);
        self.scoped_visit_with_names(names, for_of);
    }

    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        if let Callee::Expr(callee_expr) = &call.callee
            && let Expr::Ident(callee_ident) = callee_expr.as_ref()
            && callee_ident.sym.as_ref() == "watch"
            && let Some(first_arg) = call.args.first()
            && let Expr::Ident(ident) = first_arg.expr.as_ref()
        {
            self.warning_for_watch_alias(ident);
        }
        call.visit_mut_children_with(self);
    }
}

fn expr_references_names(expr: &Expr, names: &HashSet<String>) -> bool {
    let mut refs = HashSet::new();
    collect_idents_in_expr(expr, &mut refs);
    refs.into_iter().any(|ident| names.contains(&ident))
}

fn call_expr_callee_ident_name(call: &CallExpr) -> Option<&str> {
    match &call.callee {
        Callee::Expr(expr) => match crate::utils::unwrap_expr(expr.as_ref()) {
            Expr::Ident(id) => Some(id.sym.as_ref()),
            _ => None,
        },
        _ => None,
    }
}

fn is_custom_composable_call_name(name: &str) -> bool {
    let Some(suffix) = name.strip_prefix("use") else {
        return false;
    };
    if !suffix.chars().next().is_some_and(|ch| ch.is_ascii_uppercase()) {
        return false;
    }

    !matches!(name, "useEffect" | "useRef" | "useState" | "useSetup")
}

struct CustomComposableCallDetector {
    found: bool,
}

impl Visit for CustomComposableCallDetector {
    fn visit_call_expr(&mut self, call: &CallExpr) {
        if call_expr_callee_ident_name(call).is_some_and(is_custom_composable_call_name) {
            self.found = true;
            return;
        }
        call.visit_children_with(self);
    }

    fn visit_arrow_expr(&mut self, _arrow: &ArrowExpr) {}

    fn visit_function(&mut self, _function: &Function) {}
}

fn node_contains_custom_composable_call<N>(node: &N) -> bool
where
    N: VisitWith<CustomComposableCallDetector>,
{
    let mut detector = CustomComposableCallDetector { found: false };
    node.visit_with(&mut detector);
    detector.found
}

fn expr_is_custom_composable_truthiness(expr: &Expr, names: &HashSet<String>) -> bool {
    match crate::utils::unwrap_expr(expr) {
        Expr::Ident(ident) => names.contains(ident.sym.as_ref()),
        Expr::Unary(unary) if unary.op == UnaryOp::Bang => {
            expr_is_custom_composable_truthiness(unary.arg.as_ref(), names)
        }
        _ => false,
    }
}

struct CustomComposableRenderUseDetector<'a> {
    names: &'a HashSet<String>,
    found: bool,
}

impl Visit for CustomComposableRenderUseDetector<'_> {
    fn visit_arrow_expr(&mut self, _arrow: &ArrowExpr) {}

    fn visit_function(&mut self, _function: &Function) {}

    fn visit_ident(&mut self, ident: &Ident) {
        if self.names.contains(ident.sym.as_ref()) {
            self.found = true;
        }
    }

    fn visit_unary_expr(&mut self, unary: &UnaryExpr) {
        if unary.op == UnaryOp::Bang
            && expr_is_custom_composable_truthiness(unary.arg.as_ref(), self.names)
        {
            return;
        }
        unary.visit_children_with(self);
    }

    fn visit_var_declarator(&mut self, declarator: &VarDeclarator) {
        let Some(init) = &declarator.init else {
            return;
        };
        if expr_is_custom_composable_initializer(init.as_ref()) {
            return;
        }
        init.visit_with(self);
    }
}

/// A custom composable only needs a component-wide render effect when its returned value is read
/// eagerly by render-stage code. Reads captured by computed/effect/event closures establish their
/// own subscriptions, while boolean existence checks only inspect the stable composable handle.
pub fn block_requires_custom_composable_render_effect(block: &BlockStmt) -> bool {
    let Some(ret_idx) = find_first_return_index(block) else {
        return false;
    };
    let mut names = HashSet::new();
    for stmt in block.stmts.iter().take(ret_idx) {
        let Stmt::Decl(Decl::Var(var)) = stmt else {
            continue;
        };
        for declarator in &var.decls {
            let Some(init) = &declarator.init else {
                continue;
            };
            if expr_is_custom_composable_initializer(init.as_ref()) {
                collect_pat_declared_names(&declarator.name, &mut names);
            }
        }
    }
    if names.is_empty() {
        return false;
    }

    let mut detector = CustomComposableRenderUseDetector { names: &names, found: false };
    block.visit_with(&mut detector);
    detector.found
}

fn arrow_body_expr(arrow: &ArrowExpr) -> Option<&Expr> {
    match arrow.body.as_ref() {
        BlockStmtOrExpr::Expr(expr) => Some(crate::utils::unwrap_expr(expr.as_ref())),
        BlockStmtOrExpr::BlockStmt(block) => block.stmts.iter().find_map(|stmt| match stmt {
            Stmt::Return(ReturnStmt { arg: Some(expr), .. }) => {
                Some(crate::utils::unwrap_expr(expr.as_ref()))
            }
            _ => None,
        }),
    }
}

fn is_phase2_reactive_source_call_name(name: &str) -> bool {
    matches!(
        name,
        "ref"
            | "shallowRef"
            | "reactive"
            | "shallowReactive"
            | "readonly"
            | "shallowReadonly"
            | "propsReactive"
            | "signal"
            | "computed"
            | "createComputed"
            | "toRef"
            | "toRefs"
            | "useRef"
            | "useState"
    )
}

fn expr_is_phase2_reactive_source_initializer(expr: &Expr) -> bool {
    let Expr::Call(call) = crate::utils::unwrap_expr(expr) else {
        return false;
    };

    if call_expr_callee_ident_name(call).is_some_and(is_phase2_reactive_source_call_name) {
        return true;
    }

    if call_expr_callee_ident_name(call) != Some("_$compiledWithHookId") {
        return false;
    }

    let Some(runner) = call.args.get(1) else {
        return false;
    };
    let Expr::Arrow(arrow) = crate::utils::unwrap_expr(runner.expr.as_ref()) else {
        return false;
    };
    let Some(body_expr) = arrow_body_expr(arrow) else {
        return false;
    };
    let Expr::Call(inner_call) = crate::utils::unwrap_expr(body_expr) else {
        return false;
    };

    call_expr_callee_ident_name(inner_call).is_some_and(is_phase2_reactive_source_call_name)
}

fn expr_is_custom_composable_initializer(expr: &Expr) -> bool {
    let Expr::Call(call) = crate::utils::unwrap_expr(expr) else {
        return false;
    };
    call_expr_callee_ident_name(call).is_some_and(is_custom_composable_call_name)
}

fn expr_is_phase2_nonlowerable(expr: &Expr) -> bool {
    if expr_is_phase2_reactive_source_initializer(expr) {
        return true;
    }

    match crate::utils::unwrap_expr(expr) {
        Expr::Arrow(_) | Expr::Fn(_) | Expr::JSXElement(_) | Expr::JSXFragment(_) => true,
        Expr::Call(call) => call_expr_callee_ident_name(call).is_some_and(|name| {
            matches!(
                name,
                "ref"
                    | "reactive"
                    | "signal"
                    | "useRef"
                    | "useState"
                    | "watch"
                    | "watchEffect"
                    | "createEffect"
                    | "effect"
                    | "computed"
                    | "createComputed"
                    | "shallowRef"
                    | "toRef"
                    | "toRefs"
                    | "useEmit"
                    | "useSetup"
            )
        }),
        _ => false,
    }
}

fn is_phase2_private_name(name: &str) -> bool {
    name.starts_with("__rue_phase2_")
}

fn value_member_expr(ident: Ident) -> Expr {
    crate::emit::call_member(ident, "get", vec![])
}

fn wrap_expr_in_computed(expr: Expr) -> Expr {
    let computed_body = match expr {
        Expr::Object(_) => Expr::Paren(ParenExpr { span: DUMMY_SP, expr: Box::new(expr) }),
        _ => expr,
    };

    Expr::Call(CallExpr {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        callee: Callee::Expr(Box::new(Expr::Ident(crate::emit::ident("computed")))),
        args: vec![ExprOrSpread {
            spread: None,
            expr: Box::new(Expr::Arrow(ArrowExpr {
                span: DUMMY_SP,
                params: vec![],
                body: Box::new(BlockStmtOrExpr::Expr(Box::new(computed_body))),
                is_async: false,
                is_generator: false,
                type_params: None,
                return_type: None,
                ctxt: SyntaxContext::empty(),
            })),
        }],
        type_args: None,
    })
}

fn collect_phase2_derived_const_candidates(
    block: &BlockStmt,
    ret_idx: usize,
    reactive_inputs: &HashSet<String>,
) -> HashSet<String> {
    let mut reactive_names = reactive_inputs.clone();
    let mut derived_names = HashSet::new();
    let local_targets = HashSet::new();

    // A render-stage snapshot often calls a small local getter instead of reading props/ref
    // directly. Propagate reactivity through those helper declarations before selecting const
    // candidates, otherwise `const open = getOpen()` is incorrectly hoisted into useSetup.
    let mut changed = true;
    while changed {
        changed = false;
        for stmt in block.stmts.iter().take(ret_idx) {
            let Stmt::Decl(Decl::Var(var)) = stmt else {
                continue;
            };
            for decl in &var.decls {
                let Pat::Ident(binding) = &decl.name else {
                    continue;
                };
                let Some(init) = &decl.init else {
                    continue;
                };
                if !matches!(crate::utils::unwrap_expr(init.as_ref()), Expr::Arrow(_) | Expr::Fn(_))
                    || !expr_references_names(init.as_ref(), &reactive_names)
                {
                    continue;
                }
                changed |= reactive_names.insert(binding.id.sym.to_string());
            }
        }
    }

    for stmt in block.stmts.iter().take(ret_idx) {
        let Stmt::Decl(Decl::Var(var)) = stmt else {
            continue;
        };
        if var.kind != VarDeclKind::Const {
            continue;
        }

        for decl in &var.decls {
            let Pat::Ident(binding) = &decl.name else {
                continue;
            };
            let name = binding.id.sym.to_string();
            if is_phase2_private_name(&name) {
                continue;
            }
            let Some(init) = &decl.init else {
                continue;
            };
            if expr_is_phase2_nonlowerable(init.as_ref()) {
                continue;
            }
            if expr_has_impure_ops(init.as_ref(), &local_targets) {
                continue;
            }
            if !expr_references_names(init.as_ref(), &reactive_names) {
                continue;
            }

            derived_names.insert(name.clone());
            reactive_names.insert(name);
        }
    }

    derived_names
}

fn collect_phase2_reactive_source_names(block: &BlockStmt, ret_idx: usize) -> HashSet<String> {
    let mut names = HashSet::new();

    for stmt in block.stmts.iter().take(ret_idx) {
        let Stmt::Decl(Decl::Var(var)) = stmt else {
            continue;
        };

        for decl in &var.decls {
            let Some(init) = &decl.init else {
                continue;
            };
            if expr_is_custom_composable_initializer(init.as_ref()) {
                collect_pat_declared_names(&decl.name, &mut names);
                continue;
            }
            if !expr_is_phase2_reactive_source_initializer(init.as_ref()) {
                continue;
            }

            let Pat::Ident(binding) = &decl.name else {
                continue;
            };
            names.insert(binding.id.sym.to_string());
        }
    }

    names
}

#[derive(Clone)]
struct Phase2HelperDef {
    params: Vec<Pat>,
    body: BlockStmtOrExpr,
}

impl Phase2HelperDef {
    fn from_expr(expr: &Expr) -> Option<Self> {
        match crate::utils::unwrap_expr(expr) {
            Expr::Arrow(arrow) => {
                Some(Self { params: arrow.params.clone(), body: (*arrow.body).clone() })
            }
            Expr::Fn(fun) => Some(Self {
                params: fun.function.params.iter().map(|param| param.pat.clone()).collect(),
                body: BlockStmtOrExpr::BlockStmt(fun.function.body.clone()?),
            }),
            _ => None,
        }
    }

    fn from_fn_decl(fun: &FnDecl) -> Option<Self> {
        Some(Self {
            params: fun.function.params.iter().map(|param| param.pat.clone()).collect(),
            body: BlockStmtOrExpr::BlockStmt(fun.function.body.clone()?),
        })
    }
}

fn collect_phase2_top_level_helper_defs(
    block: &BlockStmt,
    ret_idx: usize,
) -> HashMap<String, Phase2HelperDef> {
    let mut helpers = HashMap::new();

    for stmt in block.stmts.iter().take(ret_idx) {
        match stmt {
            Stmt::Decl(Decl::Var(var)) => {
                for decl in &var.decls {
                    let Pat::Ident(binding) = &decl.name else {
                        continue;
                    };
                    let Some(init) = &decl.init else {
                        continue;
                    };
                    let Some(helper) = Phase2HelperDef::from_expr(init.as_ref()) else {
                        continue;
                    };
                    helpers.insert(binding.id.sym.to_string(), helper);
                }
            }
            Stmt::Decl(Decl::Fn(fun)) => {
                let Some(helper) = Phase2HelperDef::from_fn_decl(fun) else {
                    continue;
                };
                helpers.insert(fun.ident.sym.to_string(), helper);
            }
            _ => {}
        }
    }

    helpers
}

fn resolve_phase2_helper_alias_target(
    expr: &Expr,
    helper_defs: &HashMap<String, Phase2HelperDef>,
    helper_aliases: &HashMap<String, String>,
) -> Option<String> {
    let Expr::Ident(ident) = crate::utils::unwrap_expr(expr) else {
        return None;
    };

    if helper_defs.contains_key(ident.sym.as_ref()) {
        return Some(ident.sym.to_string());
    }

    helper_aliases.get(ident.sym.as_ref()).cloned()
}

fn collect_phase2_top_level_helper_aliases(
    block: &BlockStmt,
    ret_idx: usize,
    helper_defs: &HashMap<String, Phase2HelperDef>,
) -> HashMap<String, String> {
    let mut helper_aliases = HashMap::new();
    let mut changed = true;

    while changed {
        changed = false;

        for stmt in block.stmts.iter().take(ret_idx) {
            let Stmt::Decl(Decl::Var(var)) = stmt else {
                continue;
            };

            for decl in &var.decls {
                let Pat::Ident(binding) = &decl.name else {
                    continue;
                };
                let Some(init) = &decl.init else {
                    continue;
                };
                let Some(target) =
                    resolve_phase2_helper_alias_target(init.as_ref(), helper_defs, &helper_aliases)
                else {
                    continue;
                };

                if helper_aliases.get(binding.id.sym.as_ref()) != Some(&target) {
                    helper_aliases.insert(binding.id.sym.to_string(), target);
                    changed = true;
                }
            }
        }
    }

    helper_aliases
}

#[derive(Clone)]
enum Phase2UsageMode {
    Dynamic,
    SnapshotInit,
    CandidateInit(String),
    Ignore,
}

struct Phase2UsageCollector<'a> {
    candidate_names: &'a HashSet<String>,
    helper_defs: HashMap<String, Phase2HelperDef>,
    helper_aliases: HashMap<String, String>,
    dynamic_names: HashSet<String>,
    candidate_deps: HashMap<String, HashSet<String>>,
    active_helpers: Vec<String>,
    scope_stack: Vec<HashSet<String>>,
    mode_stack: Vec<Phase2UsageMode>,
}

impl<'a> Phase2UsageCollector<'a> {
    fn new(
        candidate_names: &'a HashSet<String>,
        helper_defs: HashMap<String, Phase2HelperDef>,
        helper_aliases: HashMap<String, String>,
    ) -> Self {
        Self {
            candidate_names,
            helper_defs,
            helper_aliases,
            dynamic_names: HashSet::new(),
            candidate_deps: HashMap::new(),
            active_helpers: Vec::new(),
            scope_stack: vec![HashSet::new()],
            mode_stack: vec![Phase2UsageMode::Ignore],
        }
    }

    fn is_shadowed(&self, name: &str) -> bool {
        self.scope_stack.iter().rev().any(|scope| scope.contains(name))
    }

    fn push_scope(&mut self, names: HashSet<String>) {
        self.scope_stack.push(names);
    }

    fn pop_scope(&mut self) {
        self.scope_stack.pop();
    }

    fn push_mode(&mut self, mode: Phase2UsageMode) {
        self.mode_stack.push(mode);
    }

    fn pop_mode(&mut self) {
        self.mode_stack.pop();
    }

    fn current_mode(&self) -> &Phase2UsageMode {
        self.mode_stack.last().expect("phase2 usage mode")
    }

    fn resolve_phase2_helper_name(&self, name: &str) -> Option<String> {
        if self.helper_defs.contains_key(name) {
            return Some(name.to_string());
        }

        self.helper_aliases.get(name).cloned()
    }

    fn visit_phase2_helper(&mut self, name: &str, mode: Phase2UsageMode) {
        let Some(helper) = self.helper_defs.get(name).cloned() else {
            return;
        };
        if self.active_helpers.iter().any(|active| active == name) {
            return;
        }

        let mut param_scope = HashSet::new();
        for param in &helper.params {
            collect_pat_declared_names(param, &mut param_scope);
        }

        self.active_helpers.push(name.to_string());
        self.push_scope(param_scope);
        self.push_mode(mode);
        match &helper.body {
            BlockStmtOrExpr::BlockStmt(block) => block.visit_with(self),
            BlockStmtOrExpr::Expr(expr) => expr.visit_with(self),
        }
        self.pop_mode();
        self.pop_scope();
        self.active_helpers.pop();
    }

    fn visit_phase2_helper_with_current_mode(&mut self, name: &str) {
        self.visit_phase2_helper(name, self.current_mode().clone());
    }

    fn record_name(&mut self, name: &str) {
        if !self.candidate_names.contains(name) || self.is_shadowed(name) {
            return;
        }

        match self.current_mode() {
            Phase2UsageMode::Dynamic => {
                self.dynamic_names.insert(name.to_string());
            }
            Phase2UsageMode::CandidateInit(consumer) => {
                if consumer != name {
                    self.candidate_deps
                        .entry(consumer.clone())
                        .or_default()
                        .insert(name.to_string());
                }
            }
            Phase2UsageMode::SnapshotInit | Phase2UsageMode::Ignore => {}
        }
    }

    fn visit_expr_with_mode(&mut self, expr: &Expr, mode: Phase2UsageMode) {
        self.push_mode(mode);
        expr.visit_with(self);
        self.pop_mode();
    }

    fn visit_stmt_with_mode(&mut self, stmt: &Stmt, mode: Phase2UsageMode) {
        self.push_mode(mode);
        stmt.visit_with(self);
        self.pop_mode();
    }
}

impl Visit for Phase2UsageCollector<'_> {
    fn visit_expr(&mut self, expr: &Expr) {
        if let Expr::Ident(ident) = expr {
            let name = ident.sym.as_ref();
            if !self.is_shadowed(name)
                && let Some(helper_name) = self.resolve_phase2_helper_name(name)
            {
                self.visit_phase2_helper_with_current_mode(&helper_name);
                return;
            }
            self.record_name(name);
        }
        expr.visit_children_with(self);
    }

    fn visit_prop(&mut self, prop: &Prop) {
        if let Prop::Shorthand(ident) = prop {
            let name = ident.sym.as_ref();
            if !self.is_shadowed(name)
                && let Some(helper_name) = self.resolve_phase2_helper_name(name)
            {
                self.visit_phase2_helper_with_current_mode(&helper_name);
                return;
            }
            self.record_name(name);
        }
        prop.visit_children_with(self);
    }

    fn visit_call_expr(&mut self, call: &CallExpr) {
        if let Some(name) = call_expr_callee_ident_name(call)
            && !self.is_shadowed(name)
            && let Some(helper_name) = self.resolve_phase2_helper_name(name)
        {
            for arg in &call.args {
                arg.visit_with(self);
            }
            self.visit_phase2_helper_with_current_mode(&helper_name);
            return;
        }

        call.visit_children_with(self);
    }

    fn visit_block_stmt(&mut self, block: &BlockStmt) {
        let declared = collect_block_declared_names(block);
        self.push_scope(declared);
        block.visit_children_with(self);
        self.pop_scope();
    }

    fn visit_function(&mut self, func: &Function) {
        let mut scope = HashSet::new();
        for param in &func.params {
            collect_pat_declared_names(&param.pat, &mut scope);
        }
        if let Some(body) = &func.body {
            scope.extend(collect_block_declared_names(body));
        }

        self.push_scope(scope);
        self.push_mode(self.current_mode().clone());
        func.visit_children_with(self);
        self.pop_mode();
        self.pop_scope();
    }

    fn visit_arrow_expr(&mut self, arrow: &ArrowExpr) {
        let mut scope = HashSet::new();
        for param in &arrow.params {
            collect_pat_declared_names(param, &mut scope);
        }
        if let BlockStmtOrExpr::BlockStmt(block) = arrow.body.as_ref() {
            scope.extend(collect_block_declared_names(block));
        }

        self.push_scope(scope);
        self.push_mode(self.current_mode().clone());
        arrow.visit_children_with(self);
        self.pop_mode();
        self.pop_scope();
    }
}

fn expr_is_snapshot_initializer(expr: &Expr) -> bool {
    let Expr::Call(call) = crate::utils::unwrap_expr(expr) else {
        return false;
    };

    call_expr_callee_ident_name(call).is_some_and(|name| {
        matches!(
            name,
            "ref"
                | "reactive"
                | "signal"
                | "useRef"
                | "useState"
                | "shallowReactive"
                | "readonly"
                | "shallowReadonly"
        )
    })
}

fn expr_is_function_literal(expr: &Expr) -> bool {
    matches!(crate::utils::unwrap_expr(expr), Expr::Arrow(_) | Expr::Fn(_))
}

fn select_phase2_live_derived_const_names(
    block: &BlockStmt,
    ret_idx: usize,
    candidate_names: &HashSet<String>,
) -> HashSet<String> {
    let helper_defs = collect_phase2_top_level_helper_defs(block, ret_idx);
    let helper_aliases = collect_phase2_top_level_helper_aliases(block, ret_idx, &helper_defs);
    let mut collector = Phase2UsageCollector::new(candidate_names, helper_defs, helper_aliases);

    for (stmt_idx, stmt) in block.stmts.iter().enumerate() {
        if stmt_idx >= ret_idx {
            collector.visit_stmt_with_mode(stmt, Phase2UsageMode::Dynamic);
            continue;
        }

        match stmt {
            Stmt::Decl(Decl::Fn(_)) => {}
            Stmt::Decl(Decl::Var(var)) => {
                for decl in &var.decls {
                    let Some(init) = &decl.init else {
                        continue;
                    };

                    let mode = match &decl.name {
                        Pat::Ident(binding)
                            if candidate_names.contains(binding.id.sym.as_ref()) =>
                        {
                            Phase2UsageMode::CandidateInit(binding.id.sym.to_string())
                        }
                        _ if expr_is_snapshot_initializer(init.as_ref()) => {
                            Phase2UsageMode::SnapshotInit
                        }
                        _ if expr_is_function_literal(init.as_ref()) => Phase2UsageMode::Ignore,
                        _ => Phase2UsageMode::Ignore,
                    };

                    collector.visit_expr_with_mode(init.as_ref(), mode);
                }
            }
            _ => collector.visit_stmt_with_mode(stmt, Phase2UsageMode::Dynamic),
        }
    }

    let mut selected = collector.dynamic_names;
    let mut changed = true;

    while changed {
        changed = false;
        let current = selected.iter().cloned().collect::<Vec<_>>();
        for name in current {
            if let Some(deps) = collector.candidate_deps.get(&name) {
                for dep in deps {
                    if selected.insert(dep.clone()) {
                        changed = true;
                    }
                }
            }
        }
    }

    selected
}

fn phase2_mutation_root_from_expr(expr: &Expr) -> Option<String> {
    match crate::utils::unwrap_expr(expr) {
        Expr::Ident(ident) => Some(ident.sym.to_string()),
        Expr::Member(member) => phase2_mutation_root_from_expr(member.obj.as_ref()),
        Expr::OptChain(opt_chain) => match opt_chain.base.as_ref() {
            OptChainBase::Member(member) => phase2_mutation_root_from_expr(member.obj.as_ref()),
            OptChainBase::Call(call) => phase2_mutation_root_from_expr(call.callee.as_ref()),
        },
        _ => None,
    }
}

fn phase2_mutation_root_from_simple_assign_target(target: &SimpleAssignTarget) -> Option<String> {
    match target {
        SimpleAssignTarget::Ident(ident) => Some(ident.id.sym.to_string()),
        SimpleAssignTarget::Member(member) => phase2_mutation_root_from_expr(member.obj.as_ref()),
        SimpleAssignTarget::Paren(paren) => phase2_mutation_root_from_expr(paren.expr.as_ref()),
        SimpleAssignTarget::OptChain(opt_chain) => match opt_chain.base.as_ref() {
            OptChainBase::Member(member) => phase2_mutation_root_from_expr(member.obj.as_ref()),
            OptChainBase::Call(call) => phase2_mutation_root_from_expr(call.callee.as_ref()),
        },
        SimpleAssignTarget::TsAs(ts_as) => phase2_mutation_root_from_expr(ts_as.expr.as_ref()),
        SimpleAssignTarget::TsSatisfies(ts_satisfies) => {
            phase2_mutation_root_from_expr(ts_satisfies.expr.as_ref())
        }
        SimpleAssignTarget::TsNonNull(ts_non_null) => {
            phase2_mutation_root_from_expr(ts_non_null.expr.as_ref())
        }
        SimpleAssignTarget::TsTypeAssertion(ts_type_assertion) => {
            phase2_mutation_root_from_expr(ts_type_assertion.expr.as_ref())
        }
        SimpleAssignTarget::TsInstantiation(ts_instantiation) => {
            phase2_mutation_root_from_expr(ts_instantiation.expr.as_ref())
        }
        SimpleAssignTarget::SuperProp(_) | SimpleAssignTarget::Invalid(_) => None,
    }
}

fn phase2_mutation_root_from_assign_target(target: &AssignTarget) -> Option<String> {
    match target {
        AssignTarget::Simple(simple) => phase2_mutation_root_from_simple_assign_target(simple),
        AssignTarget::Pat(_) => None,
    }
}

fn phase2_call_mutated_arg_root(call: &CallExpr) -> Option<String> {
    let Callee::Expr(callee) = &call.callee else {
        return None;
    };
    let Expr::Member(member) = crate::utils::unwrap_expr(callee.as_ref()) else {
        return None;
    };
    let Expr::Ident(obj_ident) = crate::utils::unwrap_expr(member.obj.as_ref()) else {
        return None;
    };
    let MemberProp::Ident(prop_ident) = &member.prop else {
        return None;
    };

    let mutates_first_arg = matches!(
        (obj_ident.sym.as_ref(), prop_ident.sym.as_ref()),
        ("Object", "assign" | "defineProperty" | "defineProperties" | "setPrototypeOf")
            | ("Reflect", "set" | "deleteProperty" | "defineProperty" | "setPrototypeOf")
    );
    if !mutates_first_arg {
        return None;
    }

    call.args.first().and_then(|arg| phase2_mutation_root_from_expr(arg.expr.as_ref()))
}

struct Phase2MutationCollector<'a> {
    candidate_names: &'a HashSet<String>,
    mutated_names: HashSet<String>,
    scope_stack: Vec<HashSet<String>>,
}

impl<'a> Phase2MutationCollector<'a> {
    fn new(candidate_names: &'a HashSet<String>) -> Self {
        Self { candidate_names, mutated_names: HashSet::new(), scope_stack: vec![HashSet::new()] }
    }

    fn is_shadowed(&self, name: &str) -> bool {
        self.scope_stack.iter().rev().any(|scope| scope.contains(name))
    }

    fn push_scope(&mut self, names: HashSet<String>) {
        self.scope_stack.push(names);
    }

    fn pop_scope(&mut self) {
        self.scope_stack.pop();
    }

    fn record_mutation_root(&mut self, root: Option<String>) {
        let Some(name) = root else {
            return;
        };
        if self.candidate_names.contains(&name) && !self.is_shadowed(&name) {
            self.mutated_names.insert(name);
        }
    }
}

impl Visit for Phase2MutationCollector<'_> {
    fn visit_assign_expr(&mut self, assign: &AssignExpr) {
        self.record_mutation_root(phase2_mutation_root_from_assign_target(&assign.left));
        assign.visit_children_with(self);
    }

    fn visit_update_expr(&mut self, update: &UpdateExpr) {
        self.record_mutation_root(phase2_mutation_root_from_expr(update.arg.as_ref()));
        update.visit_children_with(self);
    }

    fn visit_unary_expr(&mut self, unary: &UnaryExpr) {
        if unary.op == UnaryOp::Delete {
            self.record_mutation_root(phase2_mutation_root_from_expr(unary.arg.as_ref()));
        }
        unary.visit_children_with(self);
    }

    fn visit_call_expr(&mut self, call: &CallExpr) {
        self.record_mutation_root(phase2_call_mutated_arg_root(call));
        call.visit_children_with(self);
    }

    fn visit_block_stmt(&mut self, block: &BlockStmt) {
        let declared = collect_block_declared_names(block);
        self.push_scope(declared);
        block.visit_children_with(self);
        self.pop_scope();
    }

    fn visit_function(&mut self, func: &Function) {
        let mut scope = HashSet::new();
        for param in &func.params {
            collect_pat_declared_names(&param.pat, &mut scope);
        }
        if let Some(body) = &func.body {
            scope.extend(collect_block_declared_names(body));
        }

        self.push_scope(scope);
        func.visit_children_with(self);
        self.pop_scope();
    }

    fn visit_arrow_expr(&mut self, arrow: &ArrowExpr) {
        let mut scope = HashSet::new();
        for param in &arrow.params {
            collect_pat_declared_names(param, &mut scope);
        }
        if let BlockStmtOrExpr::BlockStmt(block) = arrow.body.as_ref() {
            scope.extend(collect_block_declared_names(block));
        }

        self.push_scope(scope);
        arrow.visit_children_with(self);
        self.pop_scope();
    }

    fn visit_catch_clause(&mut self, catch: &CatchClause) {
        let mut scope = HashSet::new();
        if let Some(param) = &catch.param {
            collect_pat_declared_names(param, &mut scope);
        }
        self.push_scope(scope);
        catch.visit_children_with(self);
        self.pop_scope();
    }

    fn visit_for_stmt(&mut self, for_stmt: &ForStmt) {
        let names = collect_for_init_names(&for_stmt.init);
        self.push_scope(names);
        for_stmt.visit_children_with(self);
        self.pop_scope();
    }

    fn visit_for_in_stmt(&mut self, for_in: &ForInStmt) {
        let names = collect_for_head_names(&for_in.left);
        self.push_scope(names);
        for_in.visit_children_with(self);
        self.pop_scope();
    }

    fn visit_for_of_stmt(&mut self, for_of: &ForOfStmt) {
        let names = collect_for_head_names(&for_of.left);
        self.push_scope(names);
        for_of.visit_children_with(self);
        self.pop_scope();
    }
}

fn collect_phase2_mutated_candidate_names(
    block: &BlockStmt,
    candidate_names: &HashSet<String>,
) -> HashSet<String> {
    if candidate_names.is_empty() {
        return HashSet::new();
    }

    let mut collector = Phase2MutationCollector::new(candidate_names);
    for stmt in &block.stmts {
        stmt.visit_with(&mut collector);
    }
    collector.mutated_names
}

struct DerivedConstUsageRewriter<'a> {
    derived_names: &'a HashSet<String>,
    replacement_idents: HashMap<String, Ident>,
    scope_stack: Vec<HashSet<String>>,
}

impl<'a> DerivedConstUsageRewriter<'a> {
    fn new(derived_names: &'a HashSet<String>, replacement_idents: HashMap<String, Ident>) -> Self {
        Self { derived_names, replacement_idents, scope_stack: vec![HashSet::new()] }
    }

    fn is_shadowed(&self, name: &str) -> bool {
        self.scope_stack.iter().rev().any(|scope| scope.contains(name))
    }

    fn push_scope(&mut self, names: HashSet<String>) {
        self.scope_stack.push(names);
    }

    fn pop_scope(&mut self) {
        self.scope_stack.pop();
    }

    fn rewrite_ident_expr(&self, expr: &mut Expr) -> bool {
        if let Expr::Ident(ident) = expr {
            let name = ident.sym.to_string();
            if self.derived_names.contains(&name) && !self.is_shadowed(&name) {
                let replacement =
                    self.replacement_idents.get(&name).cloned().unwrap_or_else(|| ident.clone());
                *expr = value_member_expr(replacement);
                return true;
            }
        }
        false
    }
}

impl VisitMut for DerivedConstUsageRewriter<'_> {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if self.rewrite_ident_expr(expr) {
            return;
        }
        expr.visit_mut_children_with(self);
    }

    fn visit_mut_prop(&mut self, prop: &mut Prop) {
        if let Prop::Shorthand(ident) = prop {
            let name = ident.sym.to_string();
            if self.derived_names.contains(&name) && !self.is_shadowed(&name) {
                let replacement =
                    self.replacement_idents.get(&name).cloned().unwrap_or_else(|| ident.clone());
                *prop = Prop::KeyValue(KeyValueProp {
                    key: PropName::Ident(ident.clone().into()),
                    value: Box::new(value_member_expr(replacement)),
                });
                return;
            }
        }
        prop.visit_mut_children_with(self);
    }

    fn visit_mut_block_stmt(&mut self, block: &mut BlockStmt) {
        let declared = collect_block_declared_names(block);
        self.push_scope(declared);
        block.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_function(&mut self, func: &mut Function) {
        let mut scope = HashSet::new();
        for param in &func.params {
            collect_pat_declared_names(&param.pat, &mut scope);
        }
        if let Some(body) = &func.body {
            scope.extend(collect_block_declared_names(body));
        }
        self.push_scope(scope);
        func.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
        let mut scope = HashSet::new();
        for param in &arrow.params {
            collect_pat_declared_names(param, &mut scope);
        }
        if let BlockStmtOrExpr::BlockStmt(block) = arrow.body.as_ref() {
            scope.extend(collect_block_declared_names(block));
        }
        self.push_scope(scope);
        arrow.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_catch_clause(&mut self, catch: &mut CatchClause) {
        let mut scope = HashSet::new();
        if let Some(param) = &catch.param {
            collect_pat_declared_names(param, &mut scope);
        }
        self.push_scope(scope);
        catch.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_for_stmt(&mut self, for_stmt: &mut ForStmt) {
        let names = collect_for_init_names(&for_stmt.init);
        self.push_scope(names);
        for_stmt.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_for_in_stmt(&mut self, for_in: &mut ForInStmt) {
        let names = collect_for_head_names(&for_in.left);
        self.push_scope(names);
        for_in.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_for_of_stmt(&mut self, for_of: &mut ForOfStmt) {
        let names = collect_for_head_names(&for_of.left);
        self.push_scope(names);
        for_of.visit_mut_children_with(self);
        self.pop_scope();
    }
}

fn apply_phase2_props_derived_const_lowering(
    block: &mut BlockStmt,
    ret_idx: usize,
    reactive_inputs: &HashSet<String>,
) -> bool {
    let mut candidate_names =
        collect_phase2_derived_const_candidates(block, ret_idx, reactive_inputs);
    for mutated_name in collect_phase2_mutated_candidate_names(block, &candidate_names) {
        candidate_names.remove(&mutated_name);
    }
    let derived_names = select_phase2_live_derived_const_names(block, ret_idx, &candidate_names);
    if derived_names.is_empty() {
        return false;
    }

    let mut used_names = collect_block_declared_names(block);
    used_names.extend(reactive_inputs.iter().cloned());
    let mut alias_idents = HashMap::new();
    for stmt in block.stmts.iter().take(ret_idx) {
        let Stmt::Decl(Decl::Var(var)) = stmt else {
            continue;
        };
        for decl in &var.decls {
            let Pat::Ident(binding) = &decl.name else {
                continue;
            };
            let name = binding.id.sym.to_string();
            if derived_names.contains(&name) {
                let mut next_name = format!("__rue_phase2_{}", name);
                let mut next_index = 1usize;
                while used_names.contains(&next_name) {
                    next_name = format!("__rue_phase2_{}_{}", name, next_index);
                    next_index += 1;
                }
                used_names.insert(next_name.clone());
                alias_idents.insert(name, crate::emit::ident(&next_name));
            }
        }
    }

    let mut pre_return_rewriter =
        DerivedConstUsageRewriter::new(&derived_names, alias_idents.clone());
    for stmt in block.stmts.iter_mut().take(ret_idx) {
        stmt.visit_mut_with(&mut pre_return_rewriter);
    }

    let mut post_return_rewriter = DerivedConstUsageRewriter::new(&derived_names, HashMap::new());
    for stmt in block.stmts.iter_mut().skip(ret_idx) {
        stmt.visit_mut_with(&mut post_return_rewriter);
    }

    let mut rewritten_stmts = Vec::with_capacity(block.stmts.len() + alias_idents.len() * 2);
    for (stmt_idx, stmt) in std::mem::take(&mut block.stmts).into_iter().enumerate() {
        let Stmt::Decl(Decl::Var(mut var)) = stmt else {
            rewritten_stmts.push(stmt);
            continue;
        };
        let has_derived_decl = stmt_idx < ret_idx
            && var.kind == VarDeclKind::Const
            && var.decls.iter().any(|decl| {
                let Pat::Ident(binding) = &decl.name else {
                    return false;
                };
                derived_names.contains(binding.id.sym.as_ref())
            });
        if !has_derived_decl {
            rewritten_stmts.push(Stmt::Decl(Decl::Var(var)));
            continue;
        }

        let span = var.span;
        let kind = var.kind;
        let declare = var.declare;
        let ctxt = var.ctxt;
        for mut decl in std::mem::take(&mut var.decls) {
            let derived_binding = match &decl.name {
                Pat::Ident(binding) if derived_names.contains(binding.id.sym.as_ref()) => {
                    Some(binding.id.clone())
                }
                _ => None,
            };
            let should_prime = derived_binding.is_some();

            if derived_binding.is_some()
                && let Some(init) = decl.init.take()
            {
                decl.init = Some(Box::new(wrap_expr_in_computed(*init)));
            }

            rewritten_stmts.push(Stmt::Decl(Decl::Var(Box::new(VarDecl {
                span,
                kind,
                declare,
                decls: vec![decl],
                ctxt,
            }))));

            let Some(binding_ident) = derived_binding else {
                continue;
            };

            if should_prime {
                // The source const initializer is eager. Prime every lowered computed at the same
                // lexical point both to preserve that order and to connect component render
                // effects when the value is otherwise first read inside a returned Vapor setup.
                rewritten_stmts.push(Stmt::Expr(ExprStmt {
                    span: DUMMY_SP,
                    expr: Box::new(value_member_expr(binding_ident.clone())),
                }));
            }

            let name = binding_ident.sym.to_string();
            let Some(alias_ident) = alias_idents.get(&name).cloned() else {
                continue;
            };
            rewritten_stmts.push(Stmt::Decl(Decl::Var(Box::new(VarDecl {
                span: DUMMY_SP,
                kind: VarDeclKind::Const,
                declare: false,
                decls: vec![VarDeclarator {
                    span: DUMMY_SP,
                    name: Pat::Ident(BindingIdent { id: alias_ident, type_ann: None }),
                    init: Some(Box::new(Expr::Ident(binding_ident))),
                    definite: false,
                }],
                ctxt: SyntaxContext::empty(),
            }))));
        }
    }

    block.stmts = rewritten_stmts;

    true
}

#[allow(dead_code)]
pub fn lower_props_derived_consts_in_arrow(arrow: &mut ArrowExpr) -> bool {
    lower_props_derived_consts_in_arrow_with_inputs(arrow, HashSet::new())
}

pub fn lower_props_derived_consts_in_arrow_with_inputs(
    arrow: &mut ArrowExpr,
    additional_inputs: HashSet<String>,
) -> bool {
    let BlockStmtOrExpr::BlockStmt(block) = arrow.body.as_mut() else {
        return false;
    };
    let Some(ret_idx) = find_first_return_index(block) else {
        return false;
    };
    let mut reactive_inputs = collect_param_idents(&arrow.params);
    reactive_inputs.extend(additional_inputs);
    reactive_inputs.extend(collect_phase2_reactive_source_names(block, ret_idx));
    apply_phase2_props_derived_const_lowering(block, ret_idx, &reactive_inputs)
}

#[allow(dead_code)]
pub fn lower_props_derived_consts_in_function(func: &mut Function) -> bool {
    lower_props_derived_consts_in_function_with_inputs(func, HashSet::new())
}

pub fn lower_props_derived_consts_in_function_with_inputs(
    func: &mut Function,
    additional_inputs: HashSet<String>,
) -> bool {
    let Some(block) = &mut func.body else {
        return false;
    };
    let Some(ret_idx) = find_first_return_index(block) else {
        return false;
    };
    let params: Vec<Pat> = func.params.iter().map(|param| param.pat.clone()).collect();
    let mut reactive_inputs = collect_param_idents(&params);
    reactive_inputs.extend(additional_inputs);
    reactive_inputs.extend(collect_phase2_reactive_source_names(block, ret_idx));
    apply_phase2_props_derived_const_lowering(block, ret_idx, &reactive_inputs)
}

fn make_hidden_props_binding(type_ann: Option<Box<TsTypeAnn>>) -> Pat {
    Pat::Ident(BindingIdent {
        id: Ident::new(Atom::from(REACTIVE_PROPS_IDENT), DUMMY_SP, SyntaxContext::empty()),
        type_ann,
    })
}

fn build_rest_destructure_prologue(object_pat: &ObjectPat) -> Option<Stmt> {
    let rest_prop = object_pat.props.iter().find_map(|prop| match prop {
        ObjectPatProp::Rest(rest) => Some(rest.clone()),
        _ => None,
    })?;

    let mut props = Vec::new();
    let mut omit_index = 0usize;

    for prop in &object_pat.props {
        let Some(key) = (match prop {
            ObjectPatProp::Assign(assign) => Some(PropName::Ident(assign.key.clone().into())),
            ObjectPatProp::KeyValue(kv) => Some(kv.key.clone()),
            ObjectPatProp::Rest(_) => None,
        }) else {
            continue;
        };

        let omit_ident = Ident::new(
            Atom::from(format!("__rue_rest_omit_{}", omit_index)),
            DUMMY_SP,
            SyntaxContext::empty(),
        );
        omit_index += 1;

        props.push(ObjectPatProp::KeyValue(KeyValuePatProp {
            key,
            value: Box::new(Pat::Ident(BindingIdent { id: omit_ident, type_ann: None })),
        }));
    }

    props.push(ObjectPatProp::Rest(rest_prop));

    Some(Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span: DUMMY_SP,
        kind: VarDeclKind::Const,
        declare: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: Pat::Object(ObjectPat { span: DUMMY_SP, props, optional: false, type_ann: None }),
            init: Some(Box::new(Expr::Ident(Ident::new(
                Atom::from(REACTIVE_PROPS_IDENT),
                DUMMY_SP,
                SyntaxContext::empty(),
            )))),
            definite: false,
        }],
        ctxt: SyntaxContext::empty(),
    }))))
}

fn prepare_component_props_param_rewrite(
    pat: &Pat,
) -> Option<(HashMap<String, Expr>, Pat, Vec<Stmt>)> {
    let hidden_props_expr =
        Expr::Ident(Ident::new(Atom::from(REACTIVE_PROPS_IDENT), DUMMY_SP, SyntaxContext::empty()));

    match pat {
        Pat::Object(object_pat) => {
            let mut prologue = Vec::new();
            if object_pat_has_rest(object_pat) {
                if object_pat_has_nested_rest_excluding_top_level(object_pat) {
                    return None;
                }
                if let Some(stmt) = build_rest_destructure_prologue(object_pat) {
                    prologue.push(stmt);
                }
            }

            let mut alias_exprs = HashMap::new();
            collect_reactive_prop_alias_exprs_from_pat(pat, hidden_props_expr, &mut alias_exprs);
            Some((alias_exprs, make_hidden_props_binding(object_pat.type_ann.clone()), prologue))
        }
        Pat::Assign(assign) => {
            let Pat::Object(object_pat) = assign.left.as_ref() else {
                return None;
            };
            let mut prologue = Vec::new();
            if object_pat_has_rest(object_pat) {
                if object_pat_has_nested_rest_excluding_top_level(object_pat) {
                    return None;
                }
                if let Some(stmt) = build_rest_destructure_prologue(object_pat) {
                    prologue.push(stmt);
                }
            }

            let mut alias_exprs = HashMap::new();
            collect_reactive_prop_alias_exprs_from_pat(
                assign.left.as_ref(),
                hidden_props_expr,
                &mut alias_exprs,
            );
            Some((
                alias_exprs,
                Pat::Assign(AssignPat {
                    span: assign.span,
                    left: Box::new(make_hidden_props_binding(object_pat.type_ann.clone())),
                    right: assign.right.clone(),
                }),
                prologue,
            ))
        }
        _ => None,
    }
}

pub fn rewrite_component_props_destructure_in_arrow(arrow: &mut ArrowExpr) -> bool {
    let Some(first_param) = arrow.params.first_mut() else {
        return false;
    };
    let original_pat = first_param.clone();
    let Some((alias_exprs, replacement_pat, mut prologue)) =
        prepare_component_props_param_rewrite(&original_pat)
    else {
        return false;
    };
    *first_param = replacement_pat;

    let mut rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
    match arrow.body.as_mut() {
        BlockStmtOrExpr::BlockStmt(block) => {
            if !prologue.is_empty() {
                let mut next_stmts = Vec::with_capacity(prologue.len() + block.stmts.len());
                next_stmts.append(&mut prologue);
                next_stmts.append(&mut block.stmts);
                block.stmts = next_stmts;
            }
            block.visit_mut_with(&mut rewriter)
        }
        BlockStmtOrExpr::Expr(expr) => {
            if prologue.is_empty() {
                expr.visit_mut_with(&mut rewriter);
            } else {
                let original_expr = expr.clone();
                let mut block =
                    BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts: prologue };
                block
                    .stmts
                    .push(Stmt::Return(ReturnStmt { span: DUMMY_SP, arg: Some(original_expr) }));
                block.visit_mut_with(&mut rewriter);
                *arrow.body = BlockStmtOrExpr::BlockStmt(block);
            }
        }
    }
    true
}

pub fn rewrite_component_props_destructure_in_function(func: &mut Function) -> bool {
    let Some(first_param) = func.params.first_mut() else {
        return false;
    };
    let original_pat = first_param.pat.clone();
    let Some((alias_exprs, replacement_pat, mut prologue)) =
        prepare_component_props_param_rewrite(&original_pat)
    else {
        return false;
    };
    first_param.pat = replacement_pat;

    if let Some(body) = &mut func.body {
        if !prologue.is_empty() {
            let mut next_stmts = Vec::with_capacity(prologue.len() + body.stmts.len());
            next_stmts.append(&mut prologue);
            next_stmts.append(&mut body.stmts);
            body.stmts = next_stmts;
        }
        let mut rewriter = ReactivePropsDestructureRewriter::new(&alias_exprs);
        body.visit_mut_with(&mut rewriter);
    }
    true
}

/// 收集注入前的“安全语句”并抽取可用名称
/// 输入：
/// - block：语句块
/// - ret_idx：第一个包含 return 的语句索引（注入边界）
/// - first_control_idx：第一个控制流语句的索引（用于更细粒度的跳过策略）
/// - skip_var_after_control：是否在控制流语句之后跳过变量声明（更保守的策略）
///
/// 输出：
/// - collected：待搬迁进 useSetup 的语句列表（按原顺序）
/// - names_const：以 const 方式导出的名称（包括函数声明名，作为只读）
/// - names_let：以 let/var 方式导出的名称（可变）
/// - available：在边界之前出现的名称集合（用于纯度/依赖分析）
pub fn collect_setup(
    block: &BlockStmt,
    ret_idx: usize,
    first_control_idx: usize,
    stop_at_control: bool,
    initial_locals: &HashSet<String>,
) -> (Vec<Stmt>, Vec<String>, Vec<String>, HashSet<String>) {
    collect_setup_with_locals(
        block,
        ret_idx,
        first_control_idx,
        stop_at_control,
        initial_locals,
        initial_locals,
    )
}

/// Crate-internal regional entry used by compiled component lowering. Values in
/// `unavailable_locals` are known live inputs (notably compiled prop slots), so declarations
/// derived from them stay inside the branch effect instead of becoming a `useSetup` snapshot.
pub(crate) fn collect_setup_region(
    block: &BlockStmt,
    available_locals: &HashSet<String>,
    unavailable_locals: &HashSet<String>,
) -> (Vec<Stmt>, Vec<String>, Vec<String>, HashSet<String>) {
    let mut known_locals = available_locals.clone();
    known_locals.extend(unavailable_locals.iter().cloned());
    collect_setup_with_locals(
        block,
        block.stmts.len(),
        block.stmts.len(),
        false,
        available_locals,
        &known_locals,
    )
}

fn collect_setup_with_locals(
    block: &BlockStmt,
    ret_idx: usize,
    first_control_idx: usize,
    stop_at_control: bool,
    initial_available: &HashSet<String>,
    initial_known: &HashSet<String>,
) -> (Vec<Stmt>, Vec<String>, Vec<String>, HashSet<String>) {
    let mut collected: Vec<Stmt> = Vec::new();
    let mut names_const: Vec<String> = Vec::new();
    let mut names_let: Vec<String> = Vec::new();
    // 组件参数本身就是 setup 输入，不应再被视作 useSetup 收集阶段的 unavailable local。
    let mut available: HashSet<String> = initial_available.clone();
    let mut known_locals: HashSet<String> = initial_known.clone();

    fn collect_pat_idents(pat: &Pat, out: &mut Vec<String>) {
        match pat {
            Pat::Ident(BindingIdent { id, .. }) => {
                out.push(id.sym.to_string());
            }
            Pat::Array(arr) => {
                for p in arr.elems.iter().flatten() {
                    collect_pat_idents(p, out);
                }
            }
            Pat::Object(obj) => {
                for prop in &obj.props {
                    match prop {
                        ObjectPatProp::KeyValue(kv) => {
                            collect_pat_idents(kv.value.as_ref(), out);
                        }
                        ObjectPatProp::Assign(assign) => {
                            out.push(assign.key.sym.to_string());
                        }
                        ObjectPatProp::Rest(rest) => {
                            collect_pat_idents(rest.arg.as_ref(), out);
                        }
                    }
                }
            }
            Pat::Assign(ap) => {
                collect_pat_idents(ap.left.as_ref(), out);
            }
            _ => {}
        }
    }

    fn stmt_declared_names(stmt: &Stmt) -> Vec<String> {
        match stmt {
            Stmt::Decl(Decl::Var(var)) => {
                let mut names = Vec::new();
                for decl in &var.decls {
                    collect_pat_idents(&decl.name, &mut names);
                }
                names
            }
            Stmt::Decl(Decl::Fn(fun)) => vec![fun.ident.sym.to_string()],
            _ => Vec::new(),
        }
    }

    fn stmt_uses_unavailable_locals(
        stmt: &Stmt,
        known_locals: &HashSet<String>,
        available: &HashSet<String>,
    ) -> bool {
        let mut refs = HashSet::new();
        match stmt {
            Stmt::Decl(Decl::Var(var)) => {
                for decl in &var.decls {
                    if let Some(init) = &decl.init {
                        collect_idents_in_expr(init.as_ref(), &mut refs);
                    }
                }
            }
            Stmt::Expr(expr_stmt) => {
                collect_idents_in_expr(expr_stmt.expr.as_ref(), &mut refs);
            }
            _ => return false,
        }

        refs.into_iter().any(|ident| known_locals.contains(&ident) && !available.contains(&ident))
    }

    fn expr_contains_jsx(expr: &Expr) -> bool {
        match expr {
            Expr::JSXElement(_) | Expr::JSXFragment(_) => true,
            Expr::Paren(p) => expr_contains_jsx(&p.expr),
            Expr::TsAs(a) => expr_contains_jsx(&a.expr),
            Expr::TsTypeAssertion(a) => expr_contains_jsx(&a.expr),
            Expr::Cond(c) => {
                expr_contains_jsx(&c.test)
                    || expr_contains_jsx(&c.cons)
                    || expr_contains_jsx(&c.alt)
            }
            Expr::Bin(b) => expr_contains_jsx(&b.left) || expr_contains_jsx(&b.right),
            Expr::Call(c) => {
                if let Callee::Expr(e) = &c.callee
                    && expr_contains_jsx(e)
                {
                    return true;
                }
                c.args.iter().any(|arg| expr_contains_jsx(arg.expr.as_ref()))
            }
            Expr::Array(a) => {
                a.elems.iter().flatten().any(|el| expr_contains_jsx(el.expr.as_ref()))
            }
            Expr::Object(o) => o.props.iter().any(|prop| match prop {
                PropOrSpread::Spread(sp) => expr_contains_jsx(sp.expr.as_ref()),
                PropOrSpread::Prop(prop) => match prop.as_ref() {
                    Prop::KeyValue(kv) => expr_contains_jsx(kv.value.as_ref()),
                    Prop::Assign(a) => expr_contains_jsx(a.value.as_ref()),
                    _ => false,
                },
            }),
            Expr::Tpl(t) => t.exprs.iter().any(|expr| expr_contains_jsx(expr.as_ref())),
            _ => false,
        }
    }

    fn var_decl_contains_jsx(var: &VarDecl) -> bool {
        var.decls
            .iter()
            .any(|decl| decl.init.as_ref().is_some_and(|expr| expr_contains_jsx(expr.as_ref())))
    }

    fn call_callee_ident_name(call: &CallExpr) -> Option<&str> {
        match &call.callee {
            Callee::Expr(expr) => match crate::utils::unwrap_expr(expr.as_ref()) {
                Expr::Ident(id) => Some(id.sym.as_ref()),
                _ => None,
            },
            _ => None,
        }
    }

    fn arrow_body_expr(arrow: &ArrowExpr) -> Option<&Expr> {
        match arrow.body.as_ref() {
            BlockStmtOrExpr::Expr(expr) => Some(crate::utils::unwrap_expr(expr.as_ref())),
            BlockStmtOrExpr::BlockStmt(block) => block.stmts.iter().find_map(|stmt| match stmt {
                Stmt::Return(ReturnStmt { arg: Some(expr), .. }) => {
                    Some(crate::utils::unwrap_expr(expr.as_ref()))
                }
                _ => None,
            }),
        }
    }

    fn expr_is_hoistable_computed(expr: &Expr) -> bool {
        let Expr::Call(call) = crate::utils::unwrap_expr(expr) else {
            return false;
        };

        if call_callee_ident_name(call) == Some("computed") {
            return call.args.first().is_some_and(|arg| {
                matches!(crate::utils::unwrap_expr(arg.expr.as_ref()), Expr::Arrow(_) | Expr::Fn(_))
            });
        }

        if call_callee_ident_name(call) != Some("_$compiledWithHookId") {
            return false;
        }

        let Some(runner) = call.args.get(1) else {
            return false;
        };
        let Expr::Arrow(arrow) = crate::utils::unwrap_expr(runner.expr.as_ref()) else {
            return false;
        };
        let Some(body_expr) = arrow_body_expr(arrow) else {
            return false;
        };
        let Expr::Call(inner_call) = crate::utils::unwrap_expr(body_expr) else {
            return false;
        };

        call_callee_ident_name(inner_call) == Some("computed")
            && inner_call.args.first().is_some_and(|arg| {
                matches!(crate::utils::unwrap_expr(arg.expr.as_ref()), Expr::Arrow(_) | Expr::Fn(_))
            })
    }

    fn expr_is_hoistable_watch_effect(expr: &Expr) -> bool {
        let Expr::Call(call) = crate::utils::unwrap_expr(expr) else {
            return false;
        };

        if call_callee_ident_name(call) == Some("watchEffect") {
            return call.args.first().is_some_and(|arg| {
                matches!(crate::utils::unwrap_expr(arg.expr.as_ref()), Expr::Arrow(_) | Expr::Fn(_))
            });
        }

        if call_callee_ident_name(call) != Some("_$compiledWithHookId") {
            return false;
        }

        let Some(runner) = call.args.get(1) else {
            return false;
        };
        let Expr::Arrow(arrow) = crate::utils::unwrap_expr(runner.expr.as_ref()) else {
            return false;
        };
        let Some(body_expr) = arrow_body_expr(arrow) else {
            return false;
        };
        let Expr::Call(inner_call) = crate::utils::unwrap_expr(body_expr) else {
            return false;
        };

        call_callee_ident_name(inner_call) == Some("watchEffect")
            && inner_call.args.first().is_some_and(|arg| {
                matches!(crate::utils::unwrap_expr(arg.expr.as_ref()), Expr::Arrow(_) | Expr::Fn(_))
            })
    }

    fn var_decl_is_hoistable_computed(var: &VarDecl) -> bool {
        !var.decls.is_empty()
            && var
                .decls
                .iter()
                .all(|decl| decl.init.as_ref().is_some_and(|init| expr_is_hoistable_computed(init)))
    }

    struct AwaitExprDetector {
        found: bool,
    }

    impl Visit for AwaitExprDetector {
        fn visit_await_expr(&mut self, _await_expr: &AwaitExpr) {
            self.found = true;
        }
    }

    fn stmt_contains_await_expr(stmt: &Stmt) -> bool {
        let mut detector = AwaitExprDetector { found: false };
        stmt.visit_with(&mut detector);
        detector.found
    }

    fn expr_is_setup_helper(expr: &Expr) -> bool {
        matches!(crate::utils::unwrap_expr(expr), Expr::Arrow(_) | Expr::Fn(_))
    }

    fn var_decl_is_setup_helper(var: &VarDecl) -> bool {
        !var.decls.is_empty()
            && var
                .decls
                .iter()
                .all(|decl| decl.init.as_ref().is_some_and(|init| expr_is_setup_helper(init)))
    }

    fn expr_is_hoistable_setup_effect(expr: &Expr) -> bool {
        let Expr::Call(call) = crate::utils::unwrap_expr(expr) else {
            return false;
        };

        let is_setup_effect_name = |name: &str| {
            // setup 副作用类调用需要保留在 setup 语义内，生命周期注册不能被错误提升。
            matches!(
                name,
                "watch"
                    | "watchEffect"
                    | "createEffect"
                    | "effect"
                    | "onMounted"
                    | "onUnmounted"
                    | "onBeforeMount"
                    | "onBeforeUnmount"
                    | "onServerPrefetch"
                    | "onUpdated"
                    | "onBeforeUpdate"
                    | "onActivated"
                    | "onDeactivated"
            )
        };

        if let Some(name) = call_callee_ident_name(call)
            && is_setup_effect_name(name)
        {
            return true;
        }

        if call_callee_ident_name(call) != Some("_$compiledWithHookId") {
            return false;
        }

        let Some(runner) = call.args.get(1) else {
            return false;
        };
        let Expr::Arrow(arrow) = crate::utils::unwrap_expr(runner.expr.as_ref()) else {
            return false;
        };
        let Some(body_expr) = arrow_body_expr(arrow) else {
            return false;
        };
        let Expr::Call(inner_call) = crate::utils::unwrap_expr(body_expr) else {
            return false;
        };

        call_callee_ident_name(inner_call).is_some_and(is_setup_effect_name)
    }

    // 迭代遍历语句，直到遇到包含 return 的语句为止（ret_idx 为边界，不跨越）。
    // 需要每次渲染重新选择分支时，控制流语句及其后续内容必须留在 render 阶段。
    for (i, s) in block.stmts.iter().enumerate() {
        if i >= ret_idx || (stop_at_control && i >= first_control_idx) {
            break;
        }

        let declared_names = stmt_declared_names(s);
        let uses_unavailable_locals = stmt_uses_unavailable_locals(s, &known_locals, &available);

        if stmt_contains_await_expr(s) {
            for name in declared_names {
                known_locals.insert(name);
            }
            break;
        }

        match s {
            Stmt::Decl(Decl::Var(var)) => {
                if var_decl_contains_jsx(var) {
                    break;
                }
                // 自定义 composable 可能在内部读取响应式状态。它必须在组件 render effect
                // 中执行，才能让这些隐藏依赖被收集；搬进一次性的 useSetup 会冻结首帧值。
                if node_contains_custom_composable_call(var) {
                    break;
                }
                let is_hoistable_computed = var_decl_is_hoistable_computed(var);
                let is_setup_helper = var_decl_is_setup_helper(var);
                if !uses_unavailable_locals || is_hoistable_computed || is_setup_helper {
                    // 收集变量声明，并从解构模式中递归提取所有绑定的标识符名称
                    collected.push(s.clone());
                    for vd in &var.decls {
                        let mut idents: Vec<String> = Vec::new();
                        collect_pat_idents(&vd.name, &mut idents);
                        for nm in idents {
                            match var.kind {
                                VarDeclKind::Const => names_const.push(nm.clone()),
                                VarDeclKind::Let => names_let.push(nm.clone()),
                                VarDeclKind::Var => names_let.push(nm.clone()),
                            }
                            available.insert(nm);
                        }
                    }
                }
            }
            Stmt::Decl(Decl::Fn(fun)) => {
                // 函数声明作为只读导出（等同于 const），安全搬迁
                collected.push(s.clone());
                let nm = fun.ident.sym.to_string();
                names_const.push(nm.clone());
                available.insert(nm);
            }
            Stmt::Return(_) => {
                // skip
            }
            _ => {
                // 其他普通语句（如空语句、已知安全的 watcher、纯表达式等）可直接收集
                let hoistable_expr_stmt = match s {
                    Stmt::Expr(expr_stmt) => {
                        expr_is_hoistable_watch_effect(expr_stmt.expr.as_ref())
                            || expr_is_hoistable_setup_effect(expr_stmt.expr.as_ref())
                    }
                    _ => false,
                };

                if !uses_unavailable_locals || hoistable_expr_stmt {
                    collected.push(s.clone());
                }
            }
        }

        for name in declared_names {
            known_locals.insert(name);
        }
    }
    (collected, names_const, names_let, available)
}

pub fn collect_param_idents(params: &[Pat]) -> HashSet<String> {
    fn collect_pat_names(pat: &Pat, out: &mut HashSet<String>) {
        match pat {
            Pat::Ident(BindingIdent { id, .. }) => {
                out.insert(id.sym.to_string());
            }
            Pat::Array(arr) => {
                for p in arr.elems.iter().flatten() {
                    collect_pat_names(p, out);
                }
            }
            Pat::Object(obj) => {
                for prop in &obj.props {
                    match prop {
                        ObjectPatProp::KeyValue(kv) => collect_pat_names(kv.value.as_ref(), out),
                        ObjectPatProp::Assign(assign) => {
                            out.insert(assign.key.sym.to_string());
                        }
                        ObjectPatProp::Rest(rest) => collect_pat_names(rest.arg.as_ref(), out),
                    }
                }
            }
            Pat::Assign(assign) => collect_pat_names(assign.left.as_ref(), out),
            Pat::Rest(rest) => collect_pat_names(rest.arg.as_ref(), out),
            _ => {}
        }
    }

    let mut names = HashSet::new();
    for pat in params {
        collect_pat_names(pat, &mut names);
    }
    names
}

/// 将已收集的语句封装进 useSetup 并在边界前插入解构绑定
/// 过程：
/// 1) 调用 `on_setup::build_setup_with_binds` 并传入普通组件的稳定区域身份，生成：
///    - `const _$useSetup = useSetup(() => { ...; return {consts..., lets...} })`
///    - `const { consts } = _$useSetup; let { lets } = _$useSetup;`
/// 2) 在原函数体中移除被收集的语句，保留其余语句与返回语句；
/// 3) 保持原有语句顺序与语义边界不变。
pub fn inject_setup(
    block: &mut BlockStmt,
    ret_idx: usize,
    names_const: Vec<String>,
    names_let: Vec<String>,
    collected: Vec<Stmt>,
) {
    if collected.is_empty() {
        return;
    }
    let mut new_body: Vec<Stmt> = Vec::new();
    // 构建 useSetup 包裹及解构绑定的两段声明
    let setup_args = (
        "useSetup:0:0",
        crate::emit::ident("_$useSetup"),
        names_const.clone(),
        names_let.clone(),
        collected.clone(),
    );
    let decls = if setup_is_compiled_safe(&collected) {
        on_setup::build_compiled_setup_with_binds(
            setup_args.0,
            setup_args.1,
            setup_args.2,
            setup_args.3,
            setup_args.4,
        )
    } else {
        on_setup::build_setup_with_binds(
            setup_args.0,
            setup_args.1,
            setup_args.2,
            setup_args.3,
            setup_args.4,
        )
    };
    for d in decls {
        // 依次插入：先插入 useSetup 容器声明，再插入 const/let 解构绑定
        new_body.push(d);
    }
    for (i, s) in block.stmts.iter().enumerate() {
        if i < ret_idx {
            let is_collected = collected.iter().any(|c| c == s);
            if is_collected {
                // 已经搬迁到 useSetup 中的语句，避免在原位置重复出现
                continue;
            }
        }
        // 保留未收集的前置语句与边界之后的所有语句（含 return）
        new_body.push(s.clone());
    }
    block.stmts = new_body;
}

fn setup_is_compiled_safe(collected: &[Stmt]) -> bool {
    struct DirectCallClassifier {
        safe: bool,
    }

    impl Visit for DirectCallClassifier {
        fn visit_call_expr(&mut self, call: &CallExpr) {
            let Callee::Expr(callee) = &call.callee else {
                self.safe = false;
                return;
            };
            if let Expr::Ident(ident) = crate::utils::unwrap_expr(callee.as_ref()) {
                if ident.sym == *"_$compiledWithHookId" {
                    let Some(runner) = call.args.get(1) else {
                        self.safe = false;
                        return;
                    };
                    let Expr::Arrow(arrow) = crate::utils::unwrap_expr(runner.expr.as_ref()) else {
                        self.safe = false;
                        return;
                    };
                    let BlockStmtOrExpr::Expr(body) = arrow.body.as_ref() else {
                        self.safe = false;
                        return;
                    };
                    let Expr::Call(inner) = crate::utils::unwrap_expr(body.as_ref()) else {
                        self.safe = false;
                        return;
                    };
                    self.visit_call_expr(inner);
                    return;
                }
                if crate::compiled_capabilities::runtime_import_entry(ident.sym.as_ref()).is_none()
                    || crate::compiled_capabilities::requires_component_context(ident.sym.as_ref())
                {
                    self.safe = false;
                    return;
                }
            }
            call.visit_children_with(self);
        }

        // Creating a deferred closure is setup-safe; its body is not executed by the setup factory.
        fn visit_arrow_expr(&mut self, _arrow: &ArrowExpr) {}
        fn visit_function(&mut self, _function: &Function) {}
    }

    let mut classifier = DirectCallClassifier { safe: true };
    for stmt in collected {
        stmt.visit_with(&mut classifier);
        if !classifier.safe {
            return false;
        }
    }
    true
}

/// 查找返回语句的索引（更宽松：无论是否返回 JSX，都视为边界）
/// 说明：
/// - 若返回的是括号表达式，且内部为 JSX，也认定为 JSX 返回；
/// - 即使返回的不是 JSX，也作为注入边界使用，保证不跨越 return。
#[allow(dead_code)]
pub fn find_jsx_return_index(block: &BlockStmt) -> Option<usize> {
    block.stmts.iter().enumerate().find_map(|(i, s)| match s {
        Stmt::Return(r) => match &r.arg {
            Some(arg) => match arg.as_ref() {
                Expr::JSXElement(_) | Expr::JSXFragment(_) => Some(i),
                Expr::Paren(p) => {
                    if matches!(p.expr.as_ref(), Expr::JSXElement(_) | Expr::JSXFragment(_)) {
                        Some(i)
                    } else {
                        // 对于非 JSX 的 return，同样视为边界
                        Some(i)
                    }
                }
                // 对于非 JSX 的 return，同样视为边界
                _ => Some(i),
            },
            // `return;` 也视为边界
            None => Some(i),
        },
        _ => None,
    })
}

/// 判断一个语句是否“包含”返回（递归检查嵌套结构）
/// 用于定位“第一个包含 return 的语句”的粗粒度边界：
/// - 若 if/try/switch 等复杂结构体内出现 return，则该结构本身的索引即为边界。
fn stmt_contains_return(s: &Stmt) -> bool {
    match s {
        // 直接为 return 语句
        Stmt::Return(_) => true,
        // 语句块：递归检查内部语句
        Stmt::Block(b) => b.stmts.iter().any(stmt_contains_return),
        // if：检查 then 分支与可选的 else 分支
        Stmt::If(i) => {
            stmt_contains_return(i.cons.as_ref())
                || i.alt.as_ref().map(|x| stmt_contains_return(x.as_ref())).unwrap_or(false)
        }
        // switch：每个 case 的语句列表中是否包含 return
        Stmt::Switch(sw) => sw.cases.iter().any(|c| c.cons.iter().any(stmt_contains_return)),
        // try：检查 try 块、可选的 catch（handler）块与可选的 finally 块
        Stmt::Try(t) => {
            t.block.stmts.iter().any(stmt_contains_return)
                || t.handler
                    .as_ref()
                    .map(|h| h.body.stmts.iter().any(stmt_contains_return))
                    .unwrap_or(false)
                || t.finalizer
                    .as_ref()
                    .map(|f| f.stmts.iter().any(stmt_contains_return))
                    .unwrap_or(false)
        }
        // 循环：检查循环体
        Stmt::While(w) => stmt_contains_return(w.body.as_ref()),
        Stmt::For(f) => stmt_contains_return(f.body.as_ref()),
        Stmt::ForIn(fi) => stmt_contains_return(fi.body.as_ref()),
        Stmt::ForOf(fo) => stmt_contains_return(fo.body.as_ref()),
        // 标签语句：检查标签内的语句体
        Stmt::Labeled(l) => stmt_contains_return(l.body.as_ref()),
        _ => false,
    }
}

/// 返回第一个“包含 return”的语句索引（不是 Return 本身也可能成立）
/// 示例：
/// - 若 if 语句的分支中存在 return，则返回该 if 语句的索引；
/// - 这样可以避免把 if 的前置语句搬迁到 if 之外引起语义变化。
pub fn find_first_return_index(block: &BlockStmt) -> Option<usize> {
    block.stmts.iter().enumerate().find_map(
        |(i, s)| {
            if stmt_contains_return(s) { Some(i) } else { None }
        },
    )
}

/// 处理普通 Function（函数声明/表达式）的函数体注入
/// 流程：
/// 1) 若函数体不存在返回 JSX，则不处理（避免误注入到内部工具函数）；
/// 2) 若已存在 `_$useSetup`，跳过（避免重复注入）；
/// 3) 定位边界（第一个包含 return 的语句索引）；
/// 4) 收集边界前安全语句并提取名称；
/// 5) 执行 useSetup 注入与解构绑定。
pub fn process_function(func: &mut Function) {
    let block = match &mut func.body {
        Some(b) => b,
        None => return,
    };
    // 仅对返回可渲染内容（JSX / h(...)）的函数体进行 useSetup 注入，避免在组件内部的普通函数中注入
    if !has_component_render_return_in_block(block) {
        return;
    }
    // 如果已存在 _$useSetup 声明，避免重复注入
    if block_has_use_setup(block) {
        return;
    }
    // 1) 找到第一个包含 return 的语句索引（作为注入边界）
    let ret_idx_opt = find_first_return_index(block);
    let ret_idx = match ret_idx_opt {
        Some(i) => i,
        None => return,
    };
    // 2) 只有真正选择渲染结果的控制流才是 setup 提升边界。
    let has_render_control = block_has_reactive_render_control(block);
    let fci = first_reactive_render_control_idx(block, ret_idx);
    let params: Vec<Pat> = func.params.iter().map(|param| param.pat.clone()).collect();
    let initial_locals = collect_param_idents(&params);
    // 3) 在边界之前收集安全语句，分类导出名
    let (collected, names_const, names_let, _) =
        collect_setup(block, ret_idx, fci, has_render_control, &initial_locals);
    // 4) 注入 useSetup 与解构绑定
    inject_setup(block, ret_idx, names_const, names_let, collected);
}

struct RenderControlJsxDetector {
    found: bool,
}

impl Visit for RenderControlJsxDetector {
    fn visit_jsx_element(&mut self, _element: &JSXElement) {
        self.found = true;
    }

    fn visit_jsx_fragment(&mut self, _fragment: &JSXFragment) {
        self.found = true;
    }
}

struct RenderControlReturnDetector {
    found: bool,
}

struct RenderControlThrowDetector {
    found: bool,
}

impl Visit for RenderControlThrowDetector {
    fn visit_throw_stmt(&mut self, _throw_stmt: &ThrowStmt) {
        self.found = true;
    }
}

impl Visit for RenderControlReturnDetector {
    fn visit_return_stmt(&mut self, return_stmt: &ReturnStmt) {
        if return_stmt.arg.as_ref().is_some_and(|arg| expr_is_component_renderable(arg.as_ref())) {
            self.found = true;
        }
    }
}

fn expr_selects_render_branch(expr: &Expr) -> bool {
    match crate::utils::unwrap_expr(expr) {
        Expr::Cond(CondExpr { cons, alt, .. }) => {
            expr_is_component_renderable(cons.as_ref())
                || expr_is_component_renderable(alt.as_ref())
                || expr_selects_render_branch(cons.as_ref())
                || expr_selects_render_branch(alt.as_ref())
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd | BinaryOp::LogicalOr, right, .. }) => {
            expr_is_component_renderable(right.as_ref())
                || expr_selects_render_branch(right.as_ref())
        }
        Expr::Seq(sequence) => {
            sequence.exprs.last().is_some_and(|expr| expr_selects_render_branch(expr.as_ref()))
        }
        _ => false,
    }
}

fn stmt_has_render_control(stmt: &Stmt) -> bool {
    match stmt {
        Stmt::Return(ret) => ret.arg.as_ref().is_some_and(|arg| {
            expr_selects_render_branch(arg.as_ref()) || expr_is_dynamic_component_root(arg.as_ref())
        }),
        Stmt::If(_)
        | Stmt::Switch(_)
        | Stmt::Try(_)
        | Stmt::While(_)
        | Stmt::For(_)
        | Stmt::ForIn(_)
        | Stmt::ForOf(_) => {
            let mut jsx = RenderControlJsxDetector { found: false };
            stmt.visit_with(&mut jsx);
            if jsx.found {
                return true;
            }
            let mut render_return = RenderControlReturnDetector { found: false };
            stmt.visit_with(&mut render_return);
            if render_return.found {
                return true;
            }
            let mut render_throw = RenderControlThrowDetector { found: false };
            stmt.visit_with(&mut render_throw);
            render_throw.found
        }
        // Conditional/logical JSX inside a variable initializer or expression is lowered to a
        // fine-grained anchor by the element transform. It does not require a component-wide
        // render effect; marking it here reruns one-time setup and fights those generated effects.
        Stmt::Decl(Decl::Var(_)) | Stmt::Expr(_) => false,
        _ => false,
    }
}

fn first_reactive_render_control_idx(block: &BlockStmt, ret_idx: usize) -> usize {
    block.stmts.iter().take(ret_idx + 1).position(stmt_has_render_control).unwrap_or(ret_idx)
}

/// Detect setup-stage control flow that selects a component's render result. Direct Vapor setup
/// returns stay fine-grained: their generated attr/text/list effects own subsequent updates.
pub fn block_has_reactive_render_control(block: &BlockStmt) -> bool {
    let Some(ret_idx) = find_first_return_index(block) else {
        return false;
    };
    block.stmts.iter().take(ret_idx + 1).any(stmt_has_render_control)
}

pub fn block_has_custom_composable_call(block: &BlockStmt) -> bool {
    node_contains_custom_composable_call(block)
}

pub fn arrow_has_reactive_render_control(arrow: &ArrowExpr) -> bool {
    match arrow.body.as_ref() {
        BlockStmtOrExpr::BlockStmt(block) => block_has_reactive_render_control(block),
        BlockStmtOrExpr::Expr(expr) => expr_is_dynamic_component_root(expr.as_ref()),
    }
}

fn expr_is_dynamic_component_root(expr: &Expr) -> bool {
    let Expr::JSXElement(element) = crate::utils::unwrap_expr(expr) else {
        return false;
    };
    crate::utils::is_component(&element.opening.name)
        && (!crate::utils::component_has_no_dynamic_props_excluding_children(element)
            || component_has_dynamic_children(element))
}

fn component_has_dynamic_children(element: &JSXElement) -> bool {
    element.children.iter().any(|child| match child {
        JSXElementChild::JSXElement(child) => {
            crate::utils::is_component(&child.opening.name)
                && (!crate::utils::component_has_no_dynamic_props_excluding_children(child)
                    || component_has_dynamic_children(child))
        }
        JSXElementChild::JSXFragment(fragment) => {
            fragment.children.iter().any(|child| match child {
                JSXElementChild::JSXElement(child) => {
                    crate::utils::is_component(&child.opening.name)
                        && (!crate::utils::component_has_no_dynamic_props_excluding_children(child)
                            || component_has_dynamic_children(child))
                }
                JSXElementChild::JSXExprContainer(container) => match &container.expr {
                    JSXExpr::Expr(expr) => !matches!(crate::utils::unwrap_expr(expr), Expr::Lit(_)),
                    JSXExpr::JSXEmptyExpr(_) => false,
                },
                JSXElementChild::JSXSpreadChild(_) => true,
                _ => false,
            })
        }
        JSXElementChild::JSXExprContainer(container) => match &container.expr {
            JSXExpr::Expr(expr) => !matches!(crate::utils::unwrap_expr(expr), Expr::Lit(_)),
            JSXExpr::JSXEmptyExpr(_) => false,
        },
        JSXElementChild::JSXSpreadChild(_) => true,
        JSXElementChild::JSXText(_) => false,
    })
}

/// 判定 FnDecl 是否需要转换：
/// - 条件一：其函数体中返回 JSX 或 h(...) 形式的可渲染内容；
/// - 条件二：其返回类型显式标注为 JSX.Element。
pub fn should_transform_fn_decl(f: &FnDecl) -> bool {
    let has_jsx_return = match &f.function.body {
        Some(block) => has_component_render_return_in_block(block),
        None => false,
    };
    let has_jsx_return_type = match &f.function.return_type {
        Some(ann) => match &*ann.type_ann {
            TsType::TsTypeRef(tr) => match &tr.type_name {
                // 识别返回类型名为 JSX.Element（驼峰命名，非 React.FC）
                TsEntityName::Ident(id) => id.sym.as_ref() == "JSX.Element",
                _ => false,
            },
            _ => false,
        },
        None => false,
    };
    has_jsx_return || has_jsx_return_type
}

/// 处理函数声明 FnDecl 的注入逻辑（与 process_function 类似，但入口不同）
pub fn process_fn_decl(f: &mut FnDecl) {
    let block = match &mut f.function.body {
        Some(b) => b,
        None => return,
    };
    // 如果已存在 _$useSetup 声明，避免重复注入
    if block_has_use_setup(block) {
        return;
    }
    let ret_idx_opt = find_first_return_index(block);
    let ret_idx = match ret_idx_opt {
        Some(i) => i,
        None => return,
    };
    let fci = first_control_idx(block, ret_idx);
    let params: Vec<Pat> = f.function.params.iter().map(|param| param.pat.clone()).collect();
    let initial_locals = collect_param_idents(&params);
    let (collected, names_const, names_let, _) =
        collect_setup(block, ret_idx, fci, false, &initial_locals);
    inject_setup(block, ret_idx, names_const, names_let, collected);
}

/// 判定变量声明的模式是否显式标注为 FC（函数组件）
/// 示例：
/// - const Comp: FC = (props) => { ... }
pub fn is_fc_pat(name: &Pat) -> bool {
    match name {
        Pat::Ident(BindingIdent { type_ann: Some(ta), .. }) => match &*ta.type_ann {
            TsType::TsTypeRef(tr) => match &tr.type_name {
                TsEntityName::Ident(id) => id.sym.as_ref() == "FC",
                _ => false,
            },
            _ => false,
        },
        _ => false,
    }
}

/// 判定未标注类型但返回 JSX 的箭头函数是否作为组件处理
/// 满足任一条件：
/// - 箭头函数体是 BlockStmt 且内部返回 JSX / h(...)；
/// - 箭头函数体是单表达式且表达式本身可渲染；
/// - 箭头函数返回类型标注为 JSX.Element（且 body 为 BlockStmt）。
pub fn is_untyped_arrow_component_decl(d: &VarDeclarator) -> bool {
    if let Some(init) = d.init.as_ref()
        && let Expr::Arrow(a) = init.as_ref()
    {
        match &*a.body {
            BlockStmtOrExpr::BlockStmt(b) => {
                if has_component_render_return_in_block(b) {
                    return true;
                }
            }
            BlockStmtOrExpr::Expr(expr) => {
                if expr_is_component_renderable(expr.as_ref()) {
                    return true;
                }
            }
        }
        if let Some(ann) = &a.return_type
            && let TsType::TsTypeRef(tr) = &*ann.type_ann
            && let TsEntityName::Ident(id) = &tr.type_name
            && id.sym.as_ref() == "JSX.Element"
            && matches!(&*a.body, BlockStmtOrExpr::BlockStmt(_))
        {
            return true;
        }
    }
    false
}

/// 处理变量声明 VarDecl（箭头函数组件为主）的注入逻辑
/// 流程：
/// 1) 对每个声明项逐一判断是否为组件（FC 或未标注但返回 JSX）；
/// 2) 若为组件，定位箭头函数体并提取 BlockStmt；
/// 3) 跳过已存在 `_$useSetup` 的情况；
/// 4) 以第一个包含 return 的语句为边界，执行收集与注入。
pub fn process_var_decl(v: &mut VarDecl) {
    for d in &mut v.decls {
        // 判断是否为显式 FC 或未标注但返回 JSX 的箭头函数
        let is_fc = is_fc_pat(&d.name);
        let is_untyped = is_untyped_arrow_component_decl(d);
        if !is_fc && !is_untyped {
            continue;
        }
        // 提取箭头函数体
        let arrow = match d.init.as_mut().map(|b| b.as_mut()) {
            Some(Expr::Arrow(a)) => a,
            _ => continue,
        };
        let block = match arrow.body.as_mut() {
            BlockStmtOrExpr::BlockStmt(b) => b,
            _ => continue,
        };
        // 如果已存在 _$useSetup 声明，避免重复注入
        if block_has_use_setup(block) {
            continue;
        }
        // 以第一个包含 return 的语句为边界
        let ret_idx_opt = find_first_return_index(block);
        let ret_idx = match ret_idx_opt {
            Some(i) => i,
            None => continue,
        };
        // 记录第一个控制流语句索引，响应式渲染分支不能被提升进 setup。
        let fci = first_reactive_render_control_idx(block, ret_idx);
        let has_render_control = block_has_reactive_render_control(block);
        let initial_locals = collect_param_idents(&arrow.params);
        // 收集边界前安全语句并注入
        let (collected, names_const, names_let, _) =
            collect_setup(block, ret_idx, fci, has_render_control, &initial_locals);
        inject_setup(block, ret_idx, names_const, names_let, collected);
    }
}

/// 检查语句块中是否已有 `_$useSetup` 声明，避免重复注入
fn block_has_use_setup(block: &BlockStmt) -> bool {
    for s in &block.stmts {
        // 仅检查变量声明语句
        if let Stmt::Decl(Decl::Var(v)) = s {
            for d in &v.decls {
                if let Pat::Ident(BindingIdent { id, .. }) = &d.name
                    && id.sym.as_ref() == "_$useSetup"
                {
                    return true;
                }
            }
        }
    }
    false
}

#[cfg(test)]
#[path = "helpers_tests.rs"]
mod tests;
