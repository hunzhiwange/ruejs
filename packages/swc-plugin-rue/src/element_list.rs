use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitMut, VisitMutWith, VisitWith};

use crate::emit::*;
use crate::log;
use crate::utils;
use crate::vapor::VaporTransform;

struct OwnerlessRowRootRewriter;
impl VisitMut for OwnerlessRowRootRewriter {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        expr.visit_mut_children_with(self);
        let Expr::Call(outer) = expr else {
            return;
        };
        let Callee::Expr(outer_callee) = &outer.callee else {
            return;
        };
        let Expr::Ident(outer_helper) = crate::utils::unwrap_expr(outer_callee) else {
            return;
        };
        if outer_helper.sym.as_ref() != "onOwnerCleanup" || outer.args.len() != 1 {
            return;
        }
        let Expr::Call(delegate) = crate::utils::unwrap_expr(outer.args[0].expr.as_ref()) else {
            return;
        };
        let Callee::Expr(delegate_callee) = &delegate.callee else {
            return;
        };
        let Expr::Ident(delegate_helper) = crate::utils::unwrap_expr(delegate_callee) else {
            return;
        };
        if delegate_helper.sym.as_ref() != "_$compiledDelegateEvent" {
            return;
        }
        let mut delegate = delegate.clone();
        delegate.callee =
            Callee::Expr(Box::new(Expr::Ident(ident("_$compiledDelegateEventOwnerless"))));
        *expr = Expr::Call(delegate);
    }

    fn visit_mut_ident(&mut self, ident: &mut Ident) {
        if ident.sym.as_ref() == "_$compiledRoot" {
            ident.sym = "_$compiledStaticRoot".into();
        }
    }
}

fn ownerless_row_setup_expr(factory: &Expr) -> Option<Expr> {
    let Expr::Arrow(factory) = crate::utils::unwrap_expr(factory) else {
        return None;
    };
    let BlockStmtOrExpr::BlockStmt(body) = factory.body.as_ref() else {
        return None;
    };
    body.stmts.iter().find_map(|stmt| {
        let Stmt::Decl(Decl::Var(decl)) = stmt else {
            return None;
        };
        decl.decls.iter().find_map(|declarator| {
            let Expr::Arrow(create) = crate::utils::unwrap_expr(declarator.init.as_deref()?) else {
                return None;
            };
            let BlockStmtOrExpr::Expr(created) = create.body.as_ref() else {
                return None;
            };
            let Expr::Call(call) = crate::utils::unwrap_expr(created) else {
                return None;
            };
            let Callee::Expr(callee) = &call.callee else {
                return None;
            };
            let Expr::Ident(helper) = crate::utils::unwrap_expr(callee) else {
                return None;
            };
            (helper.sym.as_ref() == "_$compiledStaticRoot" && call.args.len() == 1)
                .then(|| (*call.args[0].expr).clone())
        })
    })
}

fn reactive_call_slot_factory(vt: &mut VaporTransform, call: &Expr) -> Expr {
    let root = ident("_root");
    let anchor = vt.next_list_ident();
    let mut stmts = vec![
        const_decl(root.clone(), call_ident("_$createDocumentFragment", vec![])),
        const_decl(
            anchor.clone(),
            call_ident("_$compiledCreateComment", vec![string_expr("rue:row-call")]),
        ),
        append_child(root.clone(), Expr::Ident(anchor.clone())),
    ];
    crate::element_slot::render_between_for_slot_at(vt, &root, &anchor, call, &mut stmts);
    stmts.push(return_root(root));
    let handle = crate::element_children::compiled_block_to_root_expr(BlockStmt {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        stmts,
    });
    crate::element_slot::closed_slot_value(vt, &handle)
}

fn strip_compiled_list_row_keys(expr: &mut Expr) {
    match expr {
        Expr::JSXElement(element) => {
            element.opening.attrs.retain(|attr| {
                !matches!(attr, JSXAttrOrSpread::JSXAttr(JSXAttr { name: JSXAttrName::Ident(name), .. }) if name.sym == *"key")
            });
            for child in &mut element.children {
                match child {
                    JSXElementChild::JSXElement(element) => {
                        strip_compiled_list_row_keys(&mut Expr::JSXElement(element.clone()));
                    }
                    JSXElementChild::JSXFragment(fragment) => {
                        let mut nested = Expr::JSXFragment(fragment.clone());
                        strip_compiled_list_row_keys(&mut nested);
                        if let Expr::JSXFragment(next) = nested {
                            *fragment = next;
                        }
                    }
                    JSXElementChild::JSXExprContainer(container) => {
                        if let JSXExpr::Expr(expr) = &mut container.expr {
                            strip_compiled_list_row_keys(expr);
                        }
                    }
                    _ => {}
                }
            }
        }
        Expr::JSXFragment(fragment) => {
            for child in &mut fragment.children {
                if let JSXElementChild::JSXElement(element) = child {
                    element.opening.attrs.retain(|attr| {
                        !matches!(attr, JSXAttrOrSpread::JSXAttr(JSXAttr { name: JSXAttrName::Ident(name), .. }) if name.sym == *"key")
                    });
                }
            }
        }
        Expr::Cond(cond) => {
            strip_compiled_list_row_keys(&mut cond.cons);
            strip_compiled_list_row_keys(&mut cond.alt);
        }
        Expr::Bin(bin) if matches!(bin.op, BinaryOp::LogicalAnd | BinaryOp::LogicalOr) => {
            strip_compiled_list_row_keys(&mut bin.right);
        }
        _ => {}
    }
}

struct CompileListBlockReturns<'a> {
    vt: &'a mut VaporTransform,
    next_key: usize,
    failed: bool,
}

impl VisitMut for CompileListBlockReturns<'_> {
    fn visit_mut_function(&mut self, _: &mut Function) {}

    fn visit_mut_arrow_expr(&mut self, _: &mut ArrowExpr) {}

    fn visit_mut_return_stmt(&mut self, return_stmt: &mut ReturnStmt) {
        let Some(mut result) = return_stmt.arg.take() else {
            self.failed = true;
            return;
        };
        strip_compiled_list_row_keys(&mut result);
        let Some(compiled) = crate::element_expr::compiled_branch_result(self.vt, &result) else {
            self.failed = true;
            return_stmt.arg = Some(result);
            return;
        };
        let key =
            Expr::Lit(Lit::Num(Number { span: DUMMY_SP, value: self.next_key as f64, raw: None }));
        self.next_key += 1;
        return_stmt.arg = Some(Box::new(crate::element_expr::compiled_branch_case(key, compiled)));
    }
}

fn compiled_list_block_factory(vt: &mut VaporTransform, block: &BlockStmt) -> Option<Expr> {
    let mut block = block.clone();
    let mut compiler = CompileListBlockReturns { vt, next_key: 0, failed: false };
    block.visit_mut_with(&mut compiler);
    if compiler.failed || compiler.next_key == 0 {
        return None;
    }
    let reader = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::BlockStmt(block)),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    let create = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(call_ident(
            "_$compiledBranch",
            vec![reader],
        )))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    Some(Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![
            Pat::Ident(BindingIdent { id: ident("target"), type_ann: None }),
            Pat::Ident(BindingIdent { id: ident("slotProps"), type_ann: None }),
            Pat::Ident(BindingIdent { id: ident("owner"), type_ann: None }),
        ],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(call_ident(
            "_$mountCompiledSlotFactory",
            vec![Expr::Ident(ident("target")), Expr::Ident(ident("owner")), create],
        )))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    }))
}

/// 判断一条语句是否属于“纯声明前缀”。
///
/// 这里故意只接受 `Stmt::Decl(_)`，不接受赋值、调用、if、for 等任意可执行语句。
/// 原因是这次收窄修复的目标，只是把诸如 `const y = ...` 这类局部绑定保留下来，
/// 而不是试图在编译阶段重放整段 block body 的控制流。
///
/// 一旦把带副作用或带控制流的语句也当成“可提取前缀”，就会出现两个风险：
/// 1. 语句被搬到 renderItem/getKey 后，执行时机可能变化；
/// 2. 语句原本依赖的条件分支/早退语义会被破坏。
///
/// 所以这里宁可保守，只认声明，不做更激进的代码搬运。
fn is_declaration_only_stmt(stmt: &Stmt) -> bool {
    matches!(stmt, Stmt::Decl(_))
}

/// 从一个 block body 中提取“声明前缀 + 最后一个 return 表达式”。
///
/// 这个函数只服务于“简单 block”快路径，适用的源码形态大致是：
///
/// ```ts
/// items.map(item => {
///   const y = ...
///   const z = ...
///   return <div>{y + z}</div>
/// })
/// ```
///
/// 满足条件时返回：
/// - 前缀声明列表：`const y = ...; const z = ...;`
/// - 最后 return 的表达式：`<div>{y + z}</div>`
///
/// 不满足条件时返回 None，典型包括：
/// - 中间夹了 if/for/表达式语句
/// - 最后一条不是 `return ...`
/// - 存在更复杂的多分支 return
///
/// 返回 None 后，调用方会切换到更保守的 fallback 路径，保留原 block 控制流，
/// 而不是继续尝试把整段逻辑硬拆成“前缀 + JSX return”。
fn collect_decl_prefix_and_final_return(block: &BlockStmt) -> Option<(Vec<Stmt>, Expr)> {
    let (last, prefix_stmts) = block.stmts.split_last()?;
    let mut prefix: Vec<Stmt> = Vec::new();

    for stmt in prefix_stmts {
        if !is_declaration_only_stmt(stmt) {
            return None;
        }
        prefix.push(stmt.clone());
    }

    match last {
        Stmt::Return(ReturnStmt { arg: Some(arg), .. }) => {
            Some((prefix, utils::unwrap_expr(arg.as_ref()).clone()))
        }
        _ => None,
    }
}

/// 递归收集一个 block 中所有 return 的表达式。
///
/// 这里的用途不是直接生成 renderItem，而是做“key 提取预扫描”：
/// map callback 里可能有多个 return，尤其是条件分支：
///
/// ```ts
/// items.map(item => {
///   if (item.hot) return <li key={item.id}>hot</li>
///   return <li key={item.id}>cold</li>
/// })
/// ```
///
/// 为了拿到 JSX 根上的 key，我们不能只看最后一个 return，
/// 否则前面的分支会漏掉。所以这里先把所有 return expr 扫一遍，
/// 后续统一交给 `try_extract_key` 处理。
fn collect_return_exprs_in_block(block: &BlockStmt, out: &mut Vec<Expr>) {
    for stmt in &block.stmts {
        collect_return_exprs_in_stmt(stmt, out);
    }
}

/// 递归收集单条语句里的所有 return 表达式。
///
/// 之所以递归到 if/switch/try/loop，是因为 map callback 的 return 可能埋在这些控制流里。
/// 这里只做“扫描”，不做语义改写；真正的渲染策略选择，仍由后面的 renderItem 分支决定。
fn collect_return_exprs_in_stmt(stmt: &Stmt, out: &mut Vec<Expr>) {
    match stmt {
        Stmt::Return(ReturnStmt { arg: Some(arg), .. }) => {
            out.push(utils::unwrap_expr(arg.as_ref()).clone());
        }
        Stmt::Block(block) => collect_return_exprs_in_block(block, out),
        Stmt::If(if_stmt) => {
            collect_return_exprs_in_stmt(if_stmt.cons.as_ref(), out);
            if let Some(alt) = &if_stmt.alt {
                collect_return_exprs_in_stmt(alt.as_ref(), out);
            }
        }
        Stmt::Labeled(stmt) => collect_return_exprs_in_stmt(stmt.body.as_ref(), out),
        Stmt::With(stmt) => collect_return_exprs_in_stmt(stmt.body.as_ref(), out),
        Stmt::Switch(stmt) => {
            for case in &stmt.cases {
                for case_stmt in &case.cons {
                    collect_return_exprs_in_stmt(case_stmt, out);
                }
            }
        }
        Stmt::Try(stmt) => {
            collect_return_exprs_in_block(&stmt.block, out);
            if let Some(handler) = &stmt.handler {
                collect_return_exprs_in_block(&handler.body, out);
            }
            if let Some(finalizer) = &stmt.finalizer {
                collect_return_exprs_in_block(finalizer, out);
            }
        }
        Stmt::While(stmt) => collect_return_exprs_in_stmt(stmt.body.as_ref(), out),
        Stmt::DoWhile(stmt) => collect_return_exprs_in_stmt(stmt.body.as_ref(), out),
        Stmt::For(stmt) => collect_return_exprs_in_stmt(stmt.body.as_ref(), out),
        Stmt::ForIn(stmt) => collect_return_exprs_in_stmt(stmt.body.as_ref(), out),
        Stmt::ForOf(stmt) => collect_return_exprs_in_stmt(stmt.body.as_ref(), out),
        _ => {}
    }
}

/// 从模式（pattern）里收集所有声明出来的标识符名。
///
/// 这个辅助函数主要给对象/数组解构服务，例如：
/// - `const { id, value } = row`
/// - `const [a, b] = pair`
///
/// 后面我们需要知道“某个 key 表达式是否依赖这些前缀声明”，
/// 所以先把声明名抽成集合，再做一次 AST 访问。
fn collect_declared_idents_from_pat(pat: &Pat, out: &mut std::collections::HashSet<String>) {
    match pat {
        Pat::Ident(binding) => {
            out.insert(binding.id.sym.to_string());
        }
        Pat::Array(arr) => {
            for elem in arr.elems.iter().flatten() {
                collect_declared_idents_from_pat(elem, out);
            }
        }
        Pat::Object(obj) => {
            for prop in &obj.props {
                match prop {
                    ObjectPatProp::Assign(assign) => {
                        out.insert(assign.key.sym.to_string());
                    }
                    ObjectPatProp::KeyValue(kv) => collect_declared_idents_from_pat(&kv.value, out),
                    ObjectPatProp::Rest(rest) => collect_declared_idents_from_pat(&rest.arg, out),
                }
            }
        }
        Pat::Assign(assign) => collect_declared_idents_from_pat(&assign.left, out),
        Pat::Rest(rest) => collect_declared_idents_from_pat(&rest.arg, out),
        _ => {}
    }
}

fn fresh_ident_avoiding(base: &str, used: &std::collections::HashSet<String>) -> Ident {
    if !used.contains(base) {
        return ident(base);
    }

    let mut counter = 1usize;
    loop {
        let candidate = format!("__rue_{}{}", base, counter);
        if !used.contains(&candidate) {
            return ident(&candidate);
        }
        counter += 1;
    }
}

fn member_base_expr(base: Expr) -> Expr {
    match base {
        Expr::Paren(_) => base,
        Expr::Bin(_) | Expr::Cond(_) | Expr::Assign(_) | Expr::Seq(_) => {
            Expr::Paren(ParenExpr { span: DUMMY_SP, expr: Box::new(base) })
        }
        _ => base,
    }
}

fn tuple_index_expr(base: Expr, index: usize) -> Expr {
    Expr::Member(MemberExpr {
        span: DUMMY_SP,
        obj: Box::new(member_base_expr(base)),
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

fn prop_access_expr(base: Expr, key: &PropName) -> Expr {
    let base = member_base_expr(base);
    match key {
        PropName::Ident(id) => Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(base),
            prop: MemberProp::Ident(id.clone()),
        }),
        PropName::Str(s) => Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(base),
            prop: MemberProp::Computed(ComputedPropName {
                span: DUMMY_SP,
                expr: Box::new(Expr::Lit(Lit::Str(s.clone()))),
            }),
        }),
        PropName::Num(n) => Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(base),
            prop: MemberProp::Computed(ComputedPropName {
                span: DUMMY_SP,
                expr: Box::new(Expr::Lit(Lit::Num(n.clone()))),
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

fn defaulted_param_expr(value_expr: Expr, default_expr: Expr) -> Expr {
    Expr::Cond(CondExpr {
        span: DUMMY_SP,
        test: Box::new(Expr::Bin(BinExpr {
            span: DUMMY_SP,
            op: BinaryOp::EqEqEq,
            left: Box::new(value_expr.clone()),
            right: Box::new(Expr::Ident(ident("undefined"))),
        })),
        cons: Box::new(default_expr),
        alt: Box::new(value_expr),
    })
}

fn collect_alias_exprs_from_pat(
    pat: &Pat,
    source_expr: Expr,
    out: &mut std::collections::HashMap<String, Expr>,
) {
    match pat {
        Pat::Ident(binding) => {
            out.insert(binding.id.sym.to_string(), source_expr);
        }
        Pat::Array(arr) => {
            for (index, elem) in arr.elems.iter().enumerate() {
                if let Some(elem) = elem {
                    collect_alias_exprs_from_pat(
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
                        out.insert(
                            assign.key.sym.to_string(),
                            prop_access_expr(
                                source_expr.clone(),
                                &PropName::Ident(assign.key.clone().into()),
                            ),
                        );
                    }
                    ObjectPatProp::KeyValue(kv) => {
                        collect_alias_exprs_from_pat(
                            &kv.value,
                            prop_access_expr(source_expr.clone(), &kv.key),
                            out,
                        );
                    }
                    ObjectPatProp::Rest(rest) => {
                        collect_alias_exprs_from_pat(&rest.arg, source_expr.clone(), out);
                    }
                }
            }
        }
        Pat::Assign(assign) => {
            collect_alias_exprs_from_pat(
                &assign.left,
                defaulted_param_expr(source_expr, *assign.right.clone()),
                out,
            );
        }
        Pat::Rest(rest) => collect_alias_exprs_from_pat(&rest.arg, source_expr, out),
        _ => {}
    }
}

struct AliasExprRewriter<'a> {
    alias_exprs: &'a std::collections::HashMap<String, Expr>,
}

fn wrap_alias_expr_if_needed(expr: Expr) -> Expr {
    match expr {
        Expr::Paren(_) => expr,
        other => match utils::unwrap_expr(&other) {
            Expr::Bin(_) | Expr::Cond(_) | Expr::Assign(_) | Expr::Seq(_) => {
                Expr::Paren(ParenExpr { span: DUMMY_SP, expr: Box::new(other) })
            }
            _ => other,
        },
    }
}

impl VisitMut for AliasExprRewriter<'_> {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if let Expr::Ident(ident) = expr
            && let Some(rewritten) = self.alias_exprs.get(ident.sym.as_ref())
        {
            *expr = wrap_alias_expr_if_needed(rewritten.clone());
            return;
        }
        expr.visit_mut_children_with(self);
    }

    fn visit_mut_prop(&mut self, prop: &mut Prop) {
        if let Prop::Shorthand(ident) = prop
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
}

fn rewrite_alias_exprs_in_expr(
    expr: &mut Expr,
    alias_exprs: &std::collections::HashMap<String, Expr>,
) {
    if alias_exprs.is_empty() {
        return;
    }
    let mut rewriter = AliasExprRewriter { alias_exprs };
    expr.visit_mut_with(&mut rewriter);
}

fn rewrite_alias_exprs_in_stmt(
    stmt: &mut Stmt,
    alias_exprs: &std::collections::HashMap<String, Expr>,
) {
    if alias_exprs.is_empty() {
        return;
    }
    let mut rewriter = AliasExprRewriter { alias_exprs };
    stmt.visit_mut_with(&mut rewriter);
}

/// 从一组语句里收集所有“由声明引入的标识符名”。
///
/// 它和 `collect_declared_idents_from_pat` 配合使用，最终产物是一个名字集合，
/// 用来回答下面这个问题：
/// “当前 getKey 表达式，是否引用了前缀声明里定义出来的局部变量？”
///
/// 例如：
///
/// ```ts
/// const rowKey = id
/// return <li key={rowKey}>...</li>
/// ```
///
/// 这里 key 实际依赖 `rowKey`，所以 getKey 里也必须保留 `const rowKey = id`。
fn collect_declared_idents_in_stmts(stmts: &[Stmt]) -> std::collections::HashSet<String> {
    let mut out = std::collections::HashSet::new();
    for stmt in stmts {
        match stmt {
            Stmt::Decl(Decl::Var(var)) => {
                for decl in &var.decls {
                    collect_declared_idents_from_pat(&decl.name, &mut out);
                }
            }
            Stmt::Decl(Decl::Fn(func)) => {
                out.insert(func.ident.sym.to_string());
            }
            Stmt::Decl(Decl::Class(class)) => {
                out.insert(class.ident.sym.to_string());
            }
            _ => {}
        }
    }
    out
}

struct IdentUseCollector<'a> {
    names: &'a std::collections::HashSet<String>,
    found: bool,
}

impl Visit for IdentUseCollector<'_> {
    /// 访问表达式里的所有标识符，只要命中目标集合中的任意一个名字，就认为“表达式依赖前缀声明”。
    fn visit_ident(&mut self, ident: &Ident) {
        if self.names.contains(ident.sym.as_ref()) {
            self.found = true;
        }
    }
}

/// 判断一个表达式是否使用了前缀声明里引入的局部变量。
///
/// 这里的核心用途只有一个：
/// 决定 getKey 是否需要把某些“声明前缀”一并复制进去。
///
/// 如果 key 本身只依赖原始 item / idx，就不要多生成块体；
/// 如果 key 依赖前面声明出来的中间变量，就必须把对应声明带进 getKey，
/// 否则会再次出现“key 用到了未定义变量”的同类作用域问题。
fn expr_uses_declared_prefix(expr: &Expr, prefix_stmts: &[Stmt]) -> bool {
    let declared = collect_declared_idents_in_stmts(prefix_stmts);
    if declared.is_empty() {
        return false;
    }
    let mut collector = IdentUseCollector { names: &declared, found: false };
    expr.visit_with(&mut collector);
    collector.found
}

struct UnshadowedIdentUse<'a> {
    target: &'a str,
    shadowed: usize,
    found: bool,
}

impl UnshadowedIdentUse<'_> {
    fn pattern_shadows_target(&self, pat: &Pat) -> bool {
        let mut names = std::collections::HashSet::new();
        collect_declared_idents_from_pat(pat, &mut names);
        names.contains(self.target)
    }

    fn with_shadowed(&mut self, shadows_target: bool, visit: impl FnOnce(&mut Self)) {
        if shadows_target {
            self.shadowed += 1;
        }
        visit(self);
        if shadows_target {
            self.shadowed -= 1;
        }
    }

    fn record(&mut self, ident: &Ident) {
        if self.shadowed == 0 && ident.sym.as_ref() == self.target {
            self.found = true;
        }
    }
}

impl Visit for UnshadowedIdentUse<'_> {
    fn visit_expr(&mut self, expr: &Expr) {
        if let Expr::Ident(ident) = expr {
            self.record(ident);
        }
        if !self.found {
            expr.visit_children_with(self);
        }
    }

    fn visit_prop(&mut self, prop: &Prop) {
        if let Prop::Shorthand(ident) = prop {
            self.record(ident);
        }
        if !self.found {
            prop.visit_children_with(self);
        }
    }

    fn visit_jsx_attr(&mut self, attr: &JSXAttr) {
        if matches!(&attr.name, JSXAttrName::Ident(name) if name.sym == *"key") {
            return;
        }
        attr.visit_children_with(self);
    }

    fn visit_arrow_expr(&mut self, arrow: &ArrowExpr) {
        let shadows_target = arrow.params.iter().any(|pat| self.pattern_shadows_target(pat));
        self.with_shadowed(shadows_target, |visitor| arrow.visit_children_with(visitor));
    }

    fn visit_function(&mut self, function: &Function) {
        let shadows_target =
            function.params.iter().any(|param| self.pattern_shadows_target(&param.pat));
        self.with_shadowed(shadows_target, |visitor| function.visit_children_with(visitor));
    }

    fn visit_block_stmt(&mut self, block: &BlockStmt) {
        let shadows_target = collect_declared_idents_in_stmts(&block.stmts).contains(self.target);
        self.with_shadowed(shadows_target, |visitor| block.visit_children_with(visitor));
    }
}

fn expr_uses_unshadowed_ident(expr: &Expr, ident: &Ident) -> bool {
    let mut visitor = UnshadowedIdentUse { target: ident.sym.as_ref(), shadowed: 0, found: false };
    expr.visit_with(&mut visitor);
    visitor.found
}

fn block_uses_unshadowed_ident(block: &BlockStmt, ident: &Ident) -> bool {
    let mut visitor = UnshadowedIdentUse { target: ident.sym.as_ref(), shadowed: 0, found: false };
    block.visit_with(&mut visitor);
    visitor.found
}

struct ExternalReactivePrefixCollector<'a> {
    local_names: &'a std::collections::HashSet<String>,
    found: bool,
}

impl Visit for ExternalReactivePrefixCollector<'_> {
    fn visit_member_expr(&mut self, member: &MemberExpr) {
        if self.found {
            return;
        }

        if let Expr::Ident(obj_ident) = utils::unwrap_expr(member.obj.as_ref()) {
            let is_local = self.local_names.contains(obj_ident.sym.as_ref());
            if !is_local
                && let MemberProp::Ident(prop) = &member.prop
                && prop.sym.as_ref() == "value"
            {
                self.found = true;
                return;
            }
        }

        member.visit_children_with(self);
    }

    fn visit_call_expr(&mut self, call: &CallExpr) {
        if self.found {
            return;
        }

        if let Callee::Expr(callee) = &call.callee
            && let Expr::Member(member) = utils::unwrap_expr(callee.as_ref())
            && let Expr::Ident(obj_ident) = utils::unwrap_expr(member.obj.as_ref())
        {
            let is_local = self.local_names.contains(obj_ident.sym.as_ref());
            if !is_local
                && let MemberProp::Ident(prop) = &member.prop
                && prop.sym.as_ref() == "get"
                && call.args.is_empty()
            {
                self.found = true;
                return;
            }
        }

        call.visit_children_with(self);
    }
}

fn prefix_reads_external_reactive_values(
    prefix_stmts: &[Stmt],
    local_names: &std::collections::HashSet<String>,
) -> bool {
    if prefix_stmts.is_empty() {
        return false;
    }

    let mut collector = ExternalReactivePrefixCollector { local_names, found: false };
    for stmt in prefix_stmts {
        stmt.visit_with(&mut collector);
        if collector.found {
            return true;
        }
    }

    false
}

fn collect_inline_alias_exprs_from_prefix(
    prefix_stmts: &[Stmt],
) -> Option<std::collections::HashMap<String, Expr>> {
    let mut alias_exprs = std::collections::HashMap::new();

    for stmt in prefix_stmts {
        let Stmt::Decl(Decl::Var(var)) = stmt else {
            return None;
        };

        for decl in &var.decls {
            let Pat::Ident(binding) = &decl.name else {
                return None;
            };
            let init = decl.init.as_ref()?;
            let mut next_expr = utils::unwrap_expr(init.as_ref()).clone();
            rewrite_alias_exprs_in_expr(&mut next_expr, &alias_exprs);
            alias_exprs.insert(binding.id.sym.to_string(), next_expr);
        }
    }

    Some(alias_exprs)
}

fn same_simple_selector_expr(left: &Expr, right: &Expr) -> bool {
    match (utils::unwrap_expr(left), utils::unwrap_expr(right)) {
        (Expr::Ident(left), Expr::Ident(right)) => left.to_id() == right.to_id(),
        (Expr::Member(left), Expr::Member(right)) => {
            same_simple_selector_expr(left.obj.as_ref(), right.obj.as_ref())
                && matches!(
                    (&left.prop, &right.prop),
                    (MemberProp::Ident(left), MemberProp::Ident(right)) if left.sym == right.sym
                )
        }
        (Expr::Call(left), Expr::Call(right)) if left.args.is_empty() && right.args.is_empty() => {
            matches!(
                (&left.callee, &right.callee),
                (Callee::Expr(left), Callee::Expr(right))
                    if same_simple_selector_expr(left.as_ref(), right.as_ref())
            )
        }
        _ => false,
    }
}

fn external_selector_read(
    expr: &Expr,
    row_local_names: &std::collections::HashSet<String>,
) -> Option<Expr> {
    let expr = utils::unwrap_expr(expr);
    match expr {
        Expr::Member(MemberExpr { obj, prop: MemberProp::Ident(property), .. })
            if property.sym == *"value" =>
        {
            let Expr::Ident(source) = utils::unwrap_expr(obj.as_ref()) else {
                return None;
            };
            (!row_local_names.contains(source.sym.as_ref())).then(|| expr.clone())
        }
        Expr::Call(CallExpr { callee: Callee::Expr(callee), args, .. }) if args.is_empty() => {
            let Expr::Member(MemberExpr { obj, prop: MemberProp::Ident(property), .. }) =
                utils::unwrap_expr(callee.as_ref())
            else {
                return None;
            };
            let Expr::Ident(source) = utils::unwrap_expr(obj.as_ref()) else {
                return None;
            };
            (property.sym == *"get" && !row_local_names.contains(source.sym.as_ref()))
                .then(|| expr.clone())
        }
        _ => None,
    }
}

fn selector_source_from_equality(
    expr: &Expr,
    row_key: &Expr,
    row_local_names: &std::collections::HashSet<String>,
) -> Option<Expr> {
    let Expr::Bin(BinExpr { op: BinaryOp::EqEqEq, left, right, .. }) = utils::unwrap_expr(expr)
    else {
        return None;
    };

    if same_simple_selector_expr(left.as_ref(), row_key) {
        external_selector_read(right.as_ref(), row_local_names)
    } else if same_simple_selector_expr(right.as_ref(), row_key) {
        external_selector_read(left.as_ref(), row_local_names)
    } else {
        None
    }
}

fn selector_source_from_binding(
    expr: &Expr,
    row_key: &Expr,
    row_local_names: &std::collections::HashSet<String>,
) -> Option<Expr> {
    match utils::unwrap_expr(expr) {
        Expr::Cond(CondExpr { test, cons, alt, .. })
            if matches!(utils::unwrap_expr(cons.as_ref()), Expr::Lit(_))
                && matches!(utils::unwrap_expr(alt.as_ref()), Expr::Lit(_)) =>
        {
            selector_source_from_equality(test.as_ref(), row_key, row_local_names)
        }
        equality => selector_source_from_equality(equality, row_key, row_local_names),
    }
}

fn collect_selector_sources_from_element(
    element: &JSXElement,
    row_key: &Expr,
    row_local_names: &std::collections::HashSet<String>,
    sources: &mut Vec<Expr>,
) {
    for attr in &element.opening.attrs {
        let JSXAttrOrSpread::JSXAttr(attr) = attr else {
            continue;
        };
        if matches!(&attr.name, JSXAttrName::Ident(name) if name.sym == *"key") {
            continue;
        }
        if let Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
            expr: JSXExpr::Expr(expr),
            ..
        })) = &attr.value
            && let Some(source) =
                selector_source_from_binding(expr.as_ref(), row_key, row_local_names)
        {
            sources.push(source);
        }
    }

    for child in &element.children {
        match child {
            JSXElementChild::JSXElement(child) => {
                collect_selector_sources_from_element(child, row_key, row_local_names, sources);
            }
            JSXElementChild::JSXFragment(fragment) => {
                for child in &fragment.children {
                    if let JSXElementChild::JSXElement(child) = child {
                        collect_selector_sources_from_element(
                            child,
                            row_key,
                            row_local_names,
                            sources,
                        );
                    } else if let JSXElementChild::JSXExprContainer(JSXExprContainer {
                        expr: JSXExpr::Expr(expr),
                        ..
                    }) = child
                        && let Some(source) =
                            selector_source_from_binding(expr.as_ref(), row_key, row_local_names)
                    {
                        sources.push(source);
                    }
                }
            }
            JSXElementChild::JSXExprContainer(JSXExprContainer {
                expr: JSXExpr::Expr(expr),
                ..
            }) => {
                if let Some(source) =
                    selector_source_from_binding(expr.as_ref(), row_key, row_local_names)
                {
                    sources.push(source);
                }
            }
            _ => {}
        }
    }
}

fn list_row_selector_source(
    element: &JSXElement,
    row_key: &Expr,
    row_local_names: &std::collections::HashSet<String>,
) -> Option<Expr> {
    let mut sources = Vec::new();
    collect_selector_sources_from_element(element, row_key, row_local_names, &mut sources);
    let first = sources.first()?.clone();
    sources.iter().all(|source| same_simple_selector_expr(source, &first)).then_some(first)
}

struct RewriteSelectorEquality<'a> {
    row_key: &'a Expr,
    source: &'a Expr,
    selector: &'a Ident,
}

impl VisitMut for RewriteSelectorEquality<'_> {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        expr.visit_mut_children_with(self);
        let Some(source) =
            selector_source_from_equality(expr, self.row_key, &std::collections::HashSet::new())
        else {
            return;
        };
        if !same_simple_selector_expr(&source, self.source) {
            return;
        }
        let row_key = match utils::unwrap_expr(expr) {
            Expr::Bin(BinExpr { left, .. })
                if same_simple_selector_expr(left.as_ref(), self.row_key) =>
            {
                left.as_ref().clone()
            }
            Expr::Bin(BinExpr { right, .. }) => right.as_ref().clone(),
            _ => return,
        };
        *expr = call_ident(self.selector.sym.as_ref(), vec![row_key]);
    }
}

fn rewrite_selector_bindings_in_element(
    element: &mut JSXElement,
    row_key: &Expr,
    row_local_names: &std::collections::HashSet<String>,
    source: &Expr,
    selector: &Ident,
) {
    struct RewriteBindings<'a> {
        row_key: &'a Expr,
        row_local_names: &'a std::collections::HashSet<String>,
        source: &'a Expr,
        selector: &'a Ident,
    }

    impl VisitMut for RewriteBindings<'_> {
        fn visit_mut_jsx_expr_container(&mut self, container: &mut JSXExprContainer) {
            let JSXExpr::Expr(expr) = &mut container.expr else {
                return;
            };
            let Some(source) =
                selector_source_from_binding(expr.as_ref(), self.row_key, self.row_local_names)
            else {
                return;
            };
            if !same_simple_selector_expr(&source, self.source) {
                return;
            }
            expr.visit_mut_with(&mut RewriteSelectorEquality {
                row_key: self.row_key,
                source: self.source,
                selector: self.selector,
            });
        }
    }

    element.visit_mut_with(&mut RewriteBindings { row_key, row_local_names, source, selector });
}

fn rewrite_selector_bindings_in_expr(
    expr: &mut Expr,
    row_key: &Expr,
    source: &Expr,
    selector: &Ident,
) {
    expr.visit_mut_with(&mut RewriteSelectorEquality { row_key, source, selector });
}

fn extract_jsx_element_key_expr(jsx_el: &JSXElement) -> Option<Expr> {
    for attr in &jsx_el.opening.attrs {
        if let JSXAttrOrSpread::JSXAttr(attr) = attr
            && let JSXAttrName::Ident(name) = &attr.name
        {
            if name.sym.as_ref() != "key" {
                continue;
            }
            match &attr.value {
                Some(JSXAttrValue::Str(s)) => {
                    return Some(Expr::Lit(Lit::Str(Str {
                        span: DUMMY_SP,
                        value: s.value.clone(),
                        raw: None,
                    })));
                }
                Some(JSXAttrValue::JSXExprContainer(ec)) => {
                    if let JSXExpr::Expr(expr) = &ec.expr {
                        return Some(crate::utils::unwrap_expr(expr.as_ref()).clone());
                    }
                }
                _ => {}
            }
        }
    }
    None
}

fn call_callee_ident_name(call: &CallExpr) -> Option<&str> {
    let Callee::Expr(callee) = &call.callee else {
        return None;
    };
    let Expr::Ident(ident) = crate::utils::unwrap_expr(callee.as_ref()) else {
        return None;
    };
    Some(ident.sym.as_ref())
}

fn extract_arrow_body_key_expr(body: &BlockStmtOrExpr) -> Option<Expr> {
    match body {
        BlockStmtOrExpr::Expr(expr) => extract_render_root_key_expr(expr.as_ref()),
        BlockStmtOrExpr::BlockStmt(block) => {
            let mut return_exprs = Vec::new();
            collect_return_exprs_in_block(block, &mut return_exprs);
            return_exprs.iter().find_map(extract_render_root_key_expr)
        }
    }
}

fn extract_render_root_key_expr(expr: &Expr) -> Option<Expr> {
    match crate::utils::unwrap_expr(expr) {
        Expr::JSXElement(jsx_el) => extract_jsx_element_key_expr(jsx_el),
        Expr::Cond(CondExpr { span, test, cons, alt }) => {
            match (
                extract_render_root_key_expr(cons.as_ref()),
                extract_render_root_key_expr(alt.as_ref()),
            ) {
                (Some(cons), Some(alt)) => Some(Expr::Cond(CondExpr {
                    span: *span,
                    test: test.clone(),
                    cons: Box::new(cons),
                    alt: Box::new(alt),
                })),
                (Some(key), None) | (None, Some(key)) => Some(key),
                (None, None) => None,
            }
        }
        Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, right, .. })
        | Expr::Bin(BinExpr { op: BinaryOp::LogicalOr, right, .. }) => {
            extract_render_root_key_expr(right.as_ref())
        }
        Expr::Call(call) => match call_callee_ident_name(call) {
            Some("_$compiledWithKey") if call.args.len() >= 2 => {
                Some(crate::utils::unwrap_expr(call.args[1].expr.as_ref()).clone())
            }
            Some("_$compiledRoot") | Some("_$compiledMemo") => {
                let first = if call_callee_ident_name(call) == Some("_$compiledMemo") {
                    call.args.get(1)?
                } else {
                    call.args.first()?
                };
                let Expr::Arrow(arrow) = crate::utils::unwrap_expr(first.expr.as_ref()) else {
                    return None;
                };
                extract_arrow_body_key_expr(&arrow.body)
            }
            Some("_$compiledWithHookId") => {
                let runner = call.args.get(1)?;
                let Expr::Arrow(arrow) = crate::utils::unwrap_expr(runner.expr.as_ref()) else {
                    return None;
                };
                extract_arrow_body_key_expr(&arrow.body)
            }
            _ => None,
        },
        _ => None,
    }
}

// Recover the directive lowering before selecting the closed keyed-row path.
fn list_memo_expr(expr: &Expr) -> Option<(Expr, Expr)> {
    let Expr::Call(call) = utils::unwrap_expr(expr) else { return None };
    let arrow_body = |expr: &Expr| -> Option<Expr> {
        let Expr::Arrow(arrow) = utils::unwrap_expr(expr) else { return None };
        match arrow.body.as_ref() {
            BlockStmtOrExpr::Expr(expr) => Some(*expr.clone()),
            _ => None,
        }
    };
    match call_callee_ident_name(call) {
        Some("_$compiledWithHookId") => list_memo_expr(&arrow_body(&call.args.get(1)?.expr)?),
        Some("_$compiledMemo") => {
            Some((arrow_body(&call.args.get(1)?.expr)?, *call.args.get(2)?.expr.clone()))
        }
        _ => None,
    }
}

fn list_reader(expr: Expr) -> Expr {
    Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(expr))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    })
}

struct GateListMemoReads<'a>(&'a Ident);
impl VisitMut for GateListMemoReads<'_> {
    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        call.visit_mut_children_with(self);
        if !call.span.is_dummy() {
            return;
        }
        let index = match call_callee_ident_name(call) {
            Some("effect") => 0,
            Some("_$compiledText") => 1,
            _ => return,
        };
        let Some(arg) = call.args.get_mut(index) else { return };
        let Expr::Arrow(callback) = arg.expr.as_ref() else { return };
        let mut wrapped = callback.clone();
        wrapped.body = Box::new(BlockStmtOrExpr::Expr(Box::new(call_member(
            self.0.clone(),
            "read",
            vec![Expr::Arrow(callback.clone())],
        ))));
        arg.expr = Box::new(Expr::Arrow(wrapped));
    }
}

// Lower Array.map(JSX) into a stable anchor plus compiled keyed row factories.
// Each row owns an explicit DOM range; unsupported row shapes are diagnosed by
// strict capability collection instead of falling back to the Vapor list runtime.
pub(crate) fn try_build_list_from_map(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    call: &CallExpr,
    stmts: &mut Vec<Stmt>,
) -> bool {
    try_build_list_from_map_with_anchor(vt, el_ident, None, call, stmts)
}

pub(crate) fn try_build_list_from_map_at(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    anchor: &Ident,
    call: &CallExpr,
    stmts: &mut Vec<Stmt>,
) -> bool {
    try_build_list_from_map_with_anchor(vt, el_ident, Some(anchor), call, stmts)
}

fn try_build_list_from_map_with_anchor(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    precomputed_anchor: Option<&Ident>,
    call: &CallExpr,
    stmts: &mut Vec<Stmt>,
) -> bool {
    let list_stmt_start = stmts.len();
    // Only a single-argument Array.map with a synchronous arrow callback can become a
    // closed compiled keyed list. Unsupported rows are left to the caller's strict
    // diagnostic path without retaining any partially emitted statements.
    if let Callee::Expr(expr_callee) = &call.callee
        && let Expr::Member(MemberExpr { obj, prop: MemberProp::Ident(prop_ident), .. }) =
            &**expr_callee
        && prop_ident.sym == *"map"
        && call.args.len() == 1
    {
        let cb = &call.args[0];
        let cb_expr = utils::unwrap_expr(&cb.expr);
        let Expr::Arrow(callback) = cb_expr else {
            return true;
        };
        if callback.is_async {
            stmts.truncate(list_stmt_start);
            return false;
        }
        let arr_expr = utils::unwrap_expr(obj).clone();
        let counter_checkpoint = (vt.next_el, vt.next_list, vt.next_map, vt.next_child);

        log::debug("list: detected Array.map -> keyed list");
        let end = precomputed_anchor.cloned().unwrap_or_else(|| vt.next_list_ident());
        let map_base = vt.next_map_base();
        let elements_ident = ident(&format!("{}{}", map_base, "_elements"));

        let map_current = ident(&format!("{}{}", map_base, "_current"));
        let or_arr = Expr::Bin(BinExpr {
            span: DUMMY_SP,
            op: BinaryOp::LogicalOr,
            left: Box::new(arr_expr.clone()),
            right: Box::new(Expr::Array(ArrayLit { span: DUMMY_SP, elems: vec![] })),
        });
        let decl_current = const_decl(map_current.clone(), or_arr);

        let mut body_stmts: Vec<Stmt> = vec![decl_current.clone()];

        // 构造 for 循环：for (let idx = 0; idx < _map_current.length; idx++) { const item = _map_current[idx]; ... }
        let mut idx_ident = ident("idx");
        let mut item_ident = ident("item");
        let mut item_param_pattern: Option<Pat> = None;
        let mut item_alias_exprs = std::collections::HashMap::new();
        let mut selector_decl = None;
        let mut selector_binding = None;
        let mut row_template_decl = None;
        if let Expr::Arrow(ArrowExpr { params, body, .. }) = cb_expr {
            if !params.is_empty() {
                match &params[0] {
                    Pat::Ident(bi) => {
                        item_ident = bi.id.clone();
                    }
                    Pat::Object(_) | Pat::Array(_) => {
                        item_param_pattern = Some(params[0].clone());
                    }
                    Pat::Assign(assign) => match assign.left.as_ref() {
                        Pat::Ident(binding) => {
                            item_alias_exprs.insert(
                                binding.id.sym.to_string(),
                                defaulted_param_expr(
                                    Expr::Ident(item_ident.clone()),
                                    *assign.right.clone(),
                                ),
                            );
                        }
                        Pat::Object(_) | Pat::Array(_) => {
                            item_param_pattern = Some(params[0].clone());
                        }
                        _ => {}
                    },
                    _ => {}
                }
            }
            if params.len() >= 2
                && let Pat::Ident(bi) = &params[1]
            {
                idx_ident = bi.id.clone();
            }
            if let Some(pat) = &item_param_pattern {
                let mut pattern_bound_idents = std::collections::HashSet::new();
                collect_declared_idents_from_pat(pat, &mut pattern_bound_idents);

                let mut internal_param_names = pattern_bound_idents.clone();
                item_ident = fresh_ident_avoiding("item", &internal_param_names);
                internal_param_names.insert(item_ident.sym.to_string());

                if params.len() < 2 {
                    idx_ident = fresh_ident_avoiding("idx", &internal_param_names);
                }
                collect_alias_exprs_from_pat(
                    pat,
                    Expr::Ident(item_ident.clone()),
                    &mut item_alias_exprs,
                );
            }
            // 提取 JSX 根 key 表达式（若无则使用 idx）
            let mut item_key_expr: Expr = Expr::Ident(idx_ident.clone());
            let simple_block_render = match &**body {
                // 只有“纯声明前缀 + 最后 return”的简单 block，
                // 才允许走 direct _$compiledRoot 快路径。
                // 一旦不是这种形态，就交给后面的 fallback 路径保留原控制流。
                BlockStmtOrExpr::BlockStmt(block) => collect_decl_prefix_and_final_return(block),
                BlockStmtOrExpr::Expr(_) => None,
            };

            if let Some((_, ret_expr)) = simple_block_render.as_ref() {
                if let Some(key_expr) = extract_render_root_key_expr(ret_expr) {
                    item_key_expr = key_expr;
                }
            } else {
                match &**body {
                    BlockStmtOrExpr::BlockStmt(block) => {
                        // 这里不再只看“最后一个 return”，而是先把 block 内所有 return expr 都扫出来。
                        // 原因是 key 可能出现在 if / else 的任意分支里；
                        // 如果只抽最后一个 return，会漏掉前面分支上的 JSX key。
                        let mut return_exprs = Vec::new();
                        collect_return_exprs_in_block(block, &mut return_exprs);
                        for expr in &return_exprs {
                            if let Some(key_expr) = extract_render_root_key_expr(expr) {
                                item_key_expr = key_expr;
                            }
                        }
                    }
                    BlockStmtOrExpr::Expr(expr_ret) => {
                        if let Some(key_expr) = extract_render_root_key_expr(expr_ret.as_ref()) {
                            item_key_expr = key_expr;
                        }
                    }
                }
            }

            let direct_render_expr = match &**body {
                BlockStmtOrExpr::Expr(ret_expr) => {
                    Some(utils::unwrap_expr(ret_expr.as_ref()).clone())
                }
                BlockStmtOrExpr::BlockStmt(_block) => {
                    simple_block_render.as_ref().map(|(_, ret_expr)| ret_expr.clone())
                }
            };

            let mut memo_dependencies = None;
            let direct_render_expr = direct_render_expr.map(|expr| {
                if let Some((inner, deps)) = list_memo_expr(&expr) {
                    memo_dependencies = Some(deps);
                    inner
                } else {
                    expr
                }
            });
            let direct_render_expr = direct_render_expr.map(|mut expr| {
                rewrite_alias_exprs_in_expr(&mut expr, &item_alias_exprs);
                expr
            });

            if let Some(ret_expr) = direct_render_expr.as_ref()
                && let Some(key_expr) = extract_render_root_key_expr(ret_expr)
            {
                item_key_expr = key_expr;
            }

            let callback_prefix_stmts =
                simple_block_render.as_ref().map(|(prefix, _)| prefix.clone()).unwrap_or_default();

            let mut rewritten_callback_prefix_stmts = callback_prefix_stmts.clone();
            for stmt in &mut rewritten_callback_prefix_stmts {
                rewrite_alias_exprs_in_stmt(stmt, &item_alias_exprs);
            }

            let mut render_prefix_local_names =
                collect_declared_idents_in_stmts(&rewritten_callback_prefix_stmts);
            render_prefix_local_names.insert(item_ident.sym.to_string());
            render_prefix_local_names.insert(idx_ident.sym.to_string());
            let prefix_has_external_reactive_reads = prefix_reads_external_reactive_values(
                &rewritten_callback_prefix_stmts,
                &render_prefix_local_names,
            );
            let reactive_prefix_inline_alias_exprs = if prefix_has_external_reactive_reads {
                collect_inline_alias_exprs_from_prefix(&rewritten_callback_prefix_stmts)
            } else {
                None
            };
            let render_item_prefix_stmts = if prefix_has_external_reactive_reads
                && reactive_prefix_inline_alias_exprs.is_some()
            {
                Vec::new()
            } else {
                rewritten_callback_prefix_stmts.clone()
            };
            let mut render_item_direct_expr = if prefix_has_external_reactive_reads {
                reactive_prefix_inline_alias_exprs.as_ref().and_then(|alias_exprs| {
                    direct_render_expr.as_ref().map(|expr| {
                        let mut next = expr.clone();
                        rewrite_alias_exprs_in_expr(&mut next, alias_exprs);
                        next
                    })
                })
            } else {
                direct_render_expr.clone()
            };

            if let Some(Expr::JSXElement(element)) = render_item_direct_expr.as_mut() {
                let mut row_local_names = render_prefix_local_names.clone();
                row_local_names.insert(item_ident.sym.to_string());
                row_local_names.insert(idx_ident.sym.to_string());
                let mut selector_row_key = item_key_expr.clone();
                rewrite_alias_exprs_in_expr(&mut selector_row_key, &item_alias_exprs);
                if let Some(source) =
                    list_row_selector_source(element, &selector_row_key, &row_local_names)
                {
                    let selector = ident(&format!("{}_selector", map_base));
                    rewrite_selector_bindings_in_element(
                        element,
                        &selector_row_key,
                        &row_local_names,
                        &source,
                        &selector,
                    );
                    selector_binding = Some((selector_row_key, source.clone(), selector.clone()));
                    selector_decl = Some(const_decl(
                        selector,
                        call_ident(
                            "createSelector",
                            vec![Expr::Arrow(ArrowExpr {
                                span: DUMMY_SP,
                                params: vec![],
                                body: Box::new(BlockStmtOrExpr::Expr(Box::new(source))),
                                is_async: false,
                                is_generator: false,
                                type_params: None,
                                return_type: None,
                                ctxt: SyntaxContext::empty(),
                            })],
                        ),
                    ));
                }
            }

            let memo_ident = ident(&format!("{}_memo", map_base));
            let mut memo_setup = None;
            let simple_native_row_patch = render_item_prefix_stmts.is_empty()
                && render_item_direct_expr.as_ref().is_some_and(|expr| {
                    crate::element_list_patch::accepts_simple_native_row(expr, &item_ident)
                });
            let ownerless_simple_native_row = memo_dependencies.is_none()
                && render_item_direct_expr.as_ref().is_some_and(|expr| {
                    crate::element_list_patch::accepts_ownerless_simple_native_row(
                        expr,
                        &item_ident,
                    )
                });
            // A compiled row factory owns a closed DOM range. The keyed reconciler only
            // reuses, patches, moves, and disposes that explicit block.
            let mut render_item_stmts: Vec<Stmt> = Vec::new();
            let compiled_row_uses_index;
            let compiled_single_root;
            let compiled_row_factory = render_item_direct_expr.as_ref().and_then(|inner| {
                let inner = utils::unwrap_expr(inner);
                let needs_block_range =
                    matches!(inner, Expr::JSXElement(_) | Expr::JSXFragment(_) | Expr::Cond(_))
                        || matches!(inner, Expr::Bin(bin) if matches!(bin.op, BinaryOp::LogicalAnd | BinaryOp::LogicalOr))
                        || matches!(inner, Expr::Call(_));
                if needs_block_range {
                    let mut compiled_inner = inner.clone();
                    strip_compiled_list_row_keys(&mut compiled_inner);
                    let row_scope = vt.next_map;
                    let item_signal = ident(&format!("_$rowItem{row_scope}"));
                    let index_signal = ident(&format!("_$rowIndex{row_scope}"));
                    let prefix_uses_index = block_uses_unshadowed_ident(
                        &BlockStmt {
                            span: DUMMY_SP,
                            ctxt: SyntaxContext::empty(),
                            stmts: render_item_prefix_stmts.clone(),
                        },
                        &idx_ident,
                    );
                    let row_uses_index = prefix_uses_index
                        || expr_uses_unshadowed_ident(&compiled_inner, &idx_ident)
                        || memo_dependencies
                            .as_ref()
                            .is_some_and(|deps| expr_uses_unshadowed_ident(deps, &idx_ident));
                    let getter = |signal: &Ident| call_member(signal.clone(), "get", vec![]);
                    let direct_item_slot = simple_native_row_patch;
                    let mut aliases = std::collections::HashMap::from([
                        (item_ident.sym.to_string(), getter(&item_signal)),
                    ]);
                    if row_uses_index {
                        aliases.insert(idx_ident.sym.to_string(), getter(&index_signal));
                    }
                    rewrite_alias_exprs_in_expr(&mut compiled_inner, &aliases);
                    let row_template = simple_native_row_patch.then(|| {
                        crate::element_list_patch::mark_simple_native_row_template(
                            &mut compiled_inner,
                            row_scope,
                        )
                    }).flatten();
                    if let Some(deps) = &memo_dependencies {
                        let mut deps = deps.clone();
                        rewrite_alias_exprs_in_expr(&mut deps, &item_alias_exprs);
                        if let Some(prefix) = collect_inline_alias_exprs_from_prefix(&rewritten_callback_prefix_stmts) {
                            rewrite_alias_exprs_in_expr(&mut deps, &prefix);
                        }
                        if let Some((row_key, source, selector)) = &selector_binding {
                            rewrite_selector_bindings_in_expr(
                                &mut deps,
                                row_key,
                                source,
                                selector,
                            );
                        }
                        rewrite_alias_exprs_in_expr(&mut deps, &aliases);
                        memo_setup = Some(const_decl(memo_ident.clone(), call_ident("_$compiledListMemo", vec![list_reader(deps)])));

                    }
                    let mut row_signal_markers = std::collections::HashSet::from([
                        crate::reactive_provenance::signal_value_marker(item_signal.sym.as_ref()),
                    ]);
                    if row_uses_index {
                        row_signal_markers.insert(crate::reactive_provenance::signal_value_marker(
                            index_signal.sym.as_ref(),
                        ));
                    }
                    vt.push_plain_local_scope(row_signal_markers);
                    let static_templates = vt.static_templates;
                    vt.static_templates = row_template.is_some();
                    let factory = crate::element_expr::compiled_slot_factory_expr(
                        vt,
                        &compiled_inner,
                    )
                    .or_else(|| {
                        matches!(crate::utils::unwrap_expr(&compiled_inner), Expr::Call(_))
                            .then(|| reactive_call_slot_factory(vt, &compiled_inner))
                    });
                    vt.static_templates = static_templates;
                    vt.pop_plain_local_scope();
                    factory.map(|mut factory| {
                        if memo_dependencies.is_some() && !simple_native_row_patch {
                            factory.visit_mut_with(&mut GateListMemoReads(&memo_ident));
                        }
                        let patch_impl = ident("_$rowPatchImpl");
                        let direct_patch = simple_native_row_patch
                            .then(|| {
                                crate::element_list_patch::lower_simple_native_row_factory(
                                    &mut factory,
                                    patch_impl.clone(),
                                )
                            })
                            .unwrap_or(false);
                        if direct_patch
                            && ownerless_simple_native_row
                            && !row_uses_index
                        {
                            factory.visit_mut_with(&mut OwnerlessRowRootRewriter);
                        }
                        if direct_item_slot {
                            crate::element_list_patch::rewrite_direct_row_item_reads_in_expr(
                                &mut factory,
                                &item_signal,
                            );
                            if let Some(setup) = memo_setup.as_mut() {
                                crate::element_list_patch::rewrite_direct_row_item_reads_in_stmt(
                                    setup,
                                    &item_signal,
                                );
                            }
                        }
                        (
                            factory,
                            item_signal,
                            index_signal,
                            row_uses_index,
                            direct_item_slot,
                            direct_patch,
                            patch_impl,
                            row_template,
                        )
                    })
                } else {
                    None
                }
            }).or_else(|| {
                let BlockStmtOrExpr::BlockStmt(block) = body.as_ref() else {
                    return None;
                };
                let row_scope = vt.next_map;
                let item_signal = ident(&format!("_$rowItem{row_scope}"));
                let index_signal = ident(&format!("_$rowIndex{row_scope}"));
                let mut block = block.clone();
                for stmt in &mut block.stmts {
                    rewrite_alias_exprs_in_stmt(stmt, &item_alias_exprs);
                }
                let row_uses_index = block_uses_unshadowed_ident(&block, &idx_ident);
                let getter = |signal: &Ident| call_member(signal.clone(), "get", vec![]);
                let mut aliases = std::collections::HashMap::from([
                    (item_ident.sym.to_string(), getter(&item_signal)),
                ]);
                if row_uses_index {
                    aliases.insert(idx_ident.sym.to_string(), getter(&index_signal));
                }
                for stmt in &mut block.stmts {
                    rewrite_alias_exprs_in_stmt(stmt, &aliases);
                }
                let mut row_signal_markers = std::collections::HashSet::from([
                    crate::reactive_provenance::signal_value_marker(item_signal.sym.as_ref()),
                ]);
                if row_uses_index {
                    row_signal_markers.insert(crate::reactive_provenance::signal_value_marker(
                        index_signal.sym.as_ref(),
                    ));
                }
                vt.push_plain_local_scope(row_signal_markers);
                let static_templates = vt.static_templates;
                vt.static_templates = false;
                let factory = compiled_list_block_factory(vt, &block);
                vt.static_templates = static_templates;
                vt.pop_plain_local_scope();
                factory.map(|factory| {
                    (
                        factory,
                        item_signal,
                        index_signal,
                        row_uses_index,
                        false,
                        false,
                        ident("_$rowPatchImpl"),
                        None,
                    )
                })
            });
            let row_mount_target;
            if let Some((
                factory,
                item_signal,
                index_signal,
                row_uses_index,
                direct_item_slot,
                direct_patch,
                patch_impl,
                row_template,
            )) = compiled_row_factory
            {
                compiled_row_uses_index = row_uses_index;
                compiled_single_root = simple_native_row_patch && direct_patch;
                row_template_decl = row_template.map(crate::element_list_patch::row_template_decl);
                let next_item = fresh_ident_avoiding("_$rowNextItem", &render_prefix_local_names);
                let mut patch_names = render_prefix_local_names.clone();
                patch_names.insert(next_item.sym.to_string());
                let next_index = fresh_ident_avoiding("_$rowNextIndex", &patch_names);
                row_mount_target =
                    direct_item_slot.then(|| fresh_ident_avoiding("_$rowTarget", &patch_names));
                let mut patch = Expr::Arrow(ArrowExpr {
                    span: DUMMY_SP,
                    params: vec![
                        Pat::Ident(BindingIdent { id: next_item.clone(), type_ann: None }),
                        Pat::Ident(BindingIdent { id: next_index.clone(), type_ann: None }),
                    ],
                    body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                        span: DUMMY_SP,
                        ctxt: SyntaxContext::empty(),
                        stmts: vec![
                            Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(Expr::Assign(AssignExpr {
                                    span: DUMMY_SP,
                                    op: AssignOp::Assign,
                                    left: AssignTarget::Simple(SimpleAssignTarget::Ident(
                                        item_ident.clone().into(),
                                    )),
                                    right: Box::new(Expr::Ident(next_item.clone())),
                                })),
                            }),
                            Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(Expr::Assign(AssignExpr {
                                    span: DUMMY_SP,
                                    op: AssignOp::Assign,
                                    left: AssignTarget::Simple(SimpleAssignTarget::Ident(
                                        idx_ident.clone().into(),
                                    )),
                                    right: Box::new(Expr::Ident(next_index.clone())),
                                })),
                            }),
                            if direct_item_slot {
                                crate::element_list_patch::direct_row_item_update(
                                    item_signal.clone(),
                                    next_item,
                                )
                            } else {
                                Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(call_member(
                                        item_signal.clone(),
                                        "set",
                                        vec![Expr::Ident(next_item)],
                                    )),
                                })
                            },
                        ],
                    })),
                    is_async: false,
                    is_generator: false,
                    type_params: None,
                    return_type: None,
                    ctxt: SyntaxContext::empty(),
                });
                if render_item_direct_expr.is_some() {
                    render_item_stmts.extend(render_item_prefix_stmts.iter().cloned());
                }
                if direct_item_slot {
                    render_item_stmts.push(crate::element_list_patch::direct_row_item_decl(
                        item_signal,
                        item_ident.clone(),
                    ));
                } else {
                    render_item_stmts.push(const_decl(
                        item_signal,
                        call_ident("_$compiledSignal", vec![Expr::Ident(item_ident.clone())]),
                    ));
                }
                if row_uses_index {
                    render_item_stmts.push(const_decl(
                        index_signal.clone(),
                        call_ident("_$compiledSignal", vec![Expr::Ident(idx_ident.clone())]),
                    ));
                    if let Expr::Arrow(patch_arrow) = &mut patch
                        && let BlockStmtOrExpr::BlockStmt(body) = patch_arrow.body.as_mut()
                    {
                        body.stmts.push(Stmt::Expr(ExprStmt {
                            span: DUMMY_SP,
                            expr: Box::new(call_member(
                                index_signal,
                                "set",
                                vec![Expr::Ident(next_index)],
                            )),
                        }));
                    }
                }
                if direct_patch {
                    render_item_stmts.push(Stmt::Decl(Decl::Var(Box::new(VarDecl {
                        span: DUMMY_SP,
                        ctxt: SyntaxContext::empty(),
                        kind: VarDeclKind::Let,
                        declare: false,
                        decls: vec![VarDeclarator {
                            span: DUMMY_SP,
                            name: Pat::Ident(BindingIdent {
                                id: patch_impl.clone(),
                                type_ann: None,
                            }),
                            init: None,
                            definite: false,
                        }],
                    }))));
                    if let Expr::Arrow(patch_arrow) = &mut patch
                        && let BlockStmtOrExpr::BlockStmt(body) = patch_arrow.body.as_mut()
                    {
                        body.stmts.push(Stmt::Expr(ExprStmt {
                            span: DUMMY_SP,
                            expr: Box::new(call_ident(patch_impl.sym.as_ref(), vec![])),
                        }));
                    }
                }
                let patch_arg = if direct_patch {
                    let patch_ident = fresh_ident_avoiding("_$rowPatch", &patch_names);
                    render_item_stmts.push(const_decl(patch_ident.clone(), patch));
                    Expr::Ident(patch_ident)
                } else {
                    patch
                };
                let direct_ownerless_setup = if compiled_single_root
                    && ownerless_simple_native_row
                    && !compiled_row_uses_index
                {
                    ownerless_row_setup_expr(&factory)
                } else {
                    None
                };
                let uses_direct_ownerless_setup = direct_ownerless_setup.is_some();
                let mut mount_args = vec![direct_ownerless_setup.unwrap_or(factory), patch_arg];
                if let Some(setup) = memo_setup {
                    render_item_stmts.push(setup);
                    mount_args.push(Expr::Ident(memo_ident));
                } else {
                    mount_args.push(Expr::Ident(ident("undefined")));
                }
                if let Some(target) = &row_mount_target {
                    mount_args.push(Expr::Ident(target.clone()));
                }
                let mount_helper = if uses_direct_ownerless_setup {
                    "_$mountCompiledKeyedSingleRowDirect"
                } else if compiled_single_root
                    && ownerless_simple_native_row
                    && !compiled_row_uses_index
                {
                    "_$mountCompiledKeyedSingleRowOwnerless"
                } else if compiled_single_root {
                    "_$mountCompiledKeyedSingleRow"
                } else {
                    "_$mountCompiledKeyedRow"
                };
                render_item_stmts.push(Stmt::Return(ReturnStmt {
                    span: DUMMY_SP,
                    arg: Some(Box::new(call_ident(mount_helper, mount_args))),
                }));
            } else {
                (vt.next_el, vt.next_list, vt.next_map, vt.next_child) = counter_checkpoint;
                stmts.truncate(list_stmt_start);
                return true;
            }

            let mut render_item_params = vec![
                Pat::Ident(BindingIdent { id: item_ident.clone(), type_ann: None }),
                Pat::Ident(BindingIdent { id: idx_ident.clone(), type_ann: None }),
            ];
            if let Some(target) = row_mount_target {
                render_item_params.push(Pat::Ident(BindingIdent { id: target, type_ann: None }));
            }
            let render_item_arrow = Expr::Arrow(ArrowExpr {
                span: DUMMY_SP,
                params: render_item_params,
                body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                    span: DUMMY_SP,
                    ctxt: SyntaxContext::empty(),
                    stmts: render_item_stmts,
                })),
                is_async: false,
                is_generator: false,
                type_params: None,
                return_type: None,
                ctxt: SyntaxContext::empty(),
            });

            // getKey 箭头函数
            // 若 `map` 参数是对象/数组解构，这里不再手动插入
            // `const { ... } = item; return <key-expr>;`。
            // 这种“拆成声明 + 表达式”的重组方式，在后续打包重命名时
            // 可能让 key 表达式里的别名引用和解构声明脱钩。
            //
            // 改为保留原始 pattern 作为一个立即调用的箭头函数参数：
            // - `(__rue_item)=>(([item, index])=>item.id)(__rue_item)`
            // 这样 key 表达式和解构绑定仍在同一棵 AST 子树里，
            // 后续改名时不会再出现 `const [item1] = ...; return item.id` 这类悬空引用。
            let mut rewritten_item_key_expr = item_key_expr.clone();
            rewrite_alias_exprs_in_expr(&mut rewritten_item_key_expr, &item_alias_exprs);
            if let Some(prefix_aliases) =
                collect_inline_alias_exprs_from_prefix(&rewritten_callback_prefix_stmts)
            {
                rewrite_alias_exprs_in_expr(&mut rewritten_item_key_expr, &prefix_aliases);
            }

            let key_needs_prefix_scope = expr_uses_declared_prefix(
                &rewritten_item_key_expr,
                &rewritten_callback_prefix_stmts,
            );
            // 这里不再因为“callback 是 block body”就无脑生成块体 getKey。
            // 现在只有两种情况才会包块：
            // 1. 参数本身是解构，需要先把 item 解构出来；
            // 2. key 确实依赖声明前缀里的局部变量。
            //
            // 这样可以把这次修复范围收窄到“作用域真正需要的部分”，
            // 避免为了兼容 block body 而让所有 getKey 都发生额外 codegen 变化。
            let get_key_body = if key_needs_prefix_scope {
                let mut get_key_stmts: Vec<Stmt> = Vec::new();
                get_key_stmts.extend(rewritten_callback_prefix_stmts.iter().cloned());
                get_key_stmts.push(Stmt::Return(ReturnStmt {
                    span: DUMMY_SP,
                    arg: Some(Box::new(rewritten_item_key_expr.clone())),
                }));
                BlockStmtOrExpr::BlockStmt(BlockStmt {
                    span: DUMMY_SP,
                    ctxt: SyntaxContext::empty(),
                    stmts: get_key_stmts,
                })
            } else {
                BlockStmtOrExpr::Expr(Box::new(rewritten_item_key_expr.clone()))
            };
            let get_key_arrow = Expr::Arrow(ArrowExpr {
                span: DUMMY_SP,
                params: vec![
                    Pat::Ident(BindingIdent { id: item_ident.clone(), type_ann: None }),
                    Pat::Ident(BindingIdent { id: idx_ident.clone(), type_ann: None }),
                ],
                body: Box::new(get_key_body),
                is_async: false,
                is_generator: false,
                type_params: None,
                return_type: None,
                ctxt: SyntaxContext::empty(),
            });

            let parent_expr = if el_ident.sym.as_ref() == "_root" {
                // A root-level list reconciles through the compiled end anchor's parent.
                Expr::Member(MemberExpr {
                    span: DUMMY_SP,
                    obj: Box::new(Expr::Ident(end.clone())),
                    prop: MemberProp::Ident(ident_name("parentNode")),
                })
            } else {
                Expr::Ident(el_ident.clone())
            };
            let reconcile = call_ident(
                if compiled_single_root { "_$reconcileKeyedSingle" } else { "_$reconcileKeyed" },
                vec![
                    parent_expr,
                    Expr::Ident(end.clone()),
                    Expr::Ident(elements_ident.clone()),
                    Expr::Ident(map_current.clone()),
                    get_key_arrow,
                    render_item_arrow,
                    Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: compiled_row_uses_index })),
                    Expr::Lit(Lit::Bool(Bool {
                        span: DUMMY_SP,
                        value: compiled_single_root
                            && ownerless_simple_native_row
                            && !compiled_row_uses_index,
                    })),
                ],
            );
            body_stmts.push(Stmt::Expr(ExprStmt {
                span: DUMMY_SP,
                expr: Box::new(Expr::Assign(AssignExpr {
                    span: DUMMY_SP,
                    op: AssignOp::Assign,
                    left: AssignTarget::Simple(SimpleAssignTarget::Ident(
                        elements_ident.clone().into(),
                    )),
                    right: Box::new(reconcile),
                })),
            }));
        }

        stmts.truncate(list_stmt_start);
        if let Some(selector_decl) = selector_decl {
            stmts.push(selector_decl);
        }
        if let Some(row_template_decl) = row_template_decl {
            stmts.push(row_template_decl);
        }
        if precomputed_anchor.is_none() {
            stmts.push(const_decl(
                end.clone(),
                call_ident("_$compiledCreateComment", vec![string_expr("rue:list:end")]),
            ));
            stmts.push(Stmt::Expr(ExprStmt {
                span: DUMMY_SP,
                expr: Box::new(call_ident(
                    "_$compiledAppendChild",
                    vec![Expr::Ident(el_ident.clone()), Expr::Ident(end.clone())],
                )),
            }));
        }
        stmts.push(Stmt::Decl(Decl::Var(Box::new(VarDecl {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            kind: VarDeclKind::Let,
            declare: false,
            decls: vec![VarDeclarator {
                span: DUMMY_SP,
                name: Pat::Ident(BindingIdent { id: elements_ident.clone(), type_ann: None }),
                init: Some(Box::new(Expr::Array(ArrayLit { span: DUMMY_SP, elems: vec![] }))),
                definite: false,
            }],
        }))));
        // The compiled list effect only reads the item source and patches explicit blocks.
        let arrow = Expr::Arrow(ArrowExpr {
            span: DUMMY_SP,
            params: vec![],
            body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                span: DUMMY_SP,
                ctxt: SyntaxContext::empty(),
                stmts: body_stmts,
            })),
            is_async: false,
            is_generator: false,
            type_params: None,
            return_type: None,
            ctxt: SyntaxContext::empty(),
        });
        let watch_call = call_ident("_$compiledRenderEffect", vec![arrow]);
        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(watch_call) }));
        stmts.push(Stmt::Expr(ExprStmt {
            span: DUMMY_SP,
            expr: Box::new(call_ident(
                "onOwnerCleanup",
                vec![Expr::Arrow(ArrowExpr {
                    span: DUMMY_SP,
                    params: vec![],
                    body: Box::new(BlockStmtOrExpr::Expr(Box::new(call_ident(
                        "_$disposeCompiledKeyedRows",
                        vec![Expr::Ident(elements_ident)],
                    )))),
                    is_async: false,
                    is_generator: false,
                    type_params: None,
                    return_type: None,
                    ctxt: SyntaxContext::empty(),
                })],
            )),
        }));

        return true;
    }
    false
}

#[cfg(test)]
#[path = "element_list_tests.rs"]
mod tests;

/// Key wrappers are compiler metadata. Remove them only after all row/branch
/// extraction has finished, retaining left-to-right evaluation of both arguments.
pub(crate) fn erase_key_metadata(module: &mut Module) {
    struct Erase;
    impl VisitMut for Erase {
        fn visit_mut_expr(&mut self, expr: &mut Expr) {
            expr.visit_mut_children_with(self);
            if let Expr::Call(call) = expr
                && matches!(&call.callee, Callee::Expr(callee)
                    if matches!(callee.as_ref(), Expr::Ident(id) if id.sym == *"_$compiledWithKey"))
            {
                let value = ident("__rue_key_value");
                call.callee = Callee::Expr(Box::new(Expr::Paren(ParenExpr {
                    span: DUMMY_SP,
                    expr: Box::new(Expr::Arrow(ArrowExpr {
                        span: DUMMY_SP,
                        ctxt: SyntaxContext::empty(),
                        params: vec![Pat::Ident(BindingIdent {
                            id: value.clone(),
                            type_ann: None,
                        })],
                        body: Box::new(BlockStmtOrExpr::Expr(Box::new(Expr::Ident(value)))),
                        is_async: false,
                        is_generator: false,
                        type_params: None,
                        return_type: None,
                    })),
                })));
            }
        }
    }
    module.visit_mut_with(&mut Erase);
    for item in &mut module.body {
        if let ModuleItem::ModuleDecl(ModuleDecl::Import(import)) = item
            && import.src.value.to_string_lossy().starts_with("@rue-js/")
        {
            import.specifiers.retain(|specifier| {
                !matches!(specifier,
                ImportSpecifier::Named(named) if named.local.sym == *"_$compiledWithKey")
            });
        }
    }
}
