use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitWith};

use crate::elements::build_element;
use crate::emit::*;
use crate::log;
use crate::utils;
use crate::vapor::VaporTransform;

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
            for elem in &arr.elems {
                if let Some(elem) = elem {
                    collect_declared_idents_from_pat(elem, out);
                }
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

fn is_native_single_root_jsx_element(el: &JSXElement) -> bool {
    match &el.opening.name {
        JSXElementName::Ident(id) => {
            id.sym.chars().next().map(|ch| ch.is_ascii_lowercase()).unwrap_or(false)
        }
        _ => false,
    }
}

/*
列表渲染（Array.map(JSX)）设计：
- 采用“键控片段复用”策略：持久化 `Map<key, { start,end }>`，在更新时重用已存在的 DOM 片段，减少重建与移动。
- 通过注释锚点 `rue:list:start/end` 标记插入边界，`renderBetween` 在边界间渲染每项的片段。
- `_$vaporKeyedList` 负责对比新旧集合并执行插入/移动/卸载；本模块生成其所需的回调与参数对象。
- 参数解构保护：若 `map` 参数使用解构且使用了解构出的 key，需要在 `getKey`/`renderItem` 中显式对 `item` 解构，以保证作用域正确。
*/
// 抽取 Array.map(JSX) 列表渲染逻辑
// 转换目标：将 `arr.map((item, idx) => <li key={...}>...</li>)` 按 Vapor 的“键控片段复用”策略生成：
// - 在父元素下插入 `rue:list:start` / `rue:list:end` 注释作为渲染锚点
// - 声明持久 `Map` 保存 key 到片段之间的映射，跨次渲染复用已有 DOM
// - 在 `watchEffect` 中调用 `_$vaporKeyedList({ items, getKey, elements, parent, before, start, renderItem })`
// - `getKey(item, idx)`：优先使用 JSX 上的 `key` 表达式；否则回退到索引
// - `renderItem(item, parent, start, end, idx)`：默认以 `renderBetween(vapor(()=>{...}), parent, start, end)` 渲染每个项
// - 若开启 `optimize_component_anchors` 且列表项为单根原生元素，则改为 `renderAnchor(vapor(()=>{...}), parent, start)`
// 关键点：当 map 参数使用解构（如 `({ sha })`）且 `key={sha}`，需在 `getKey` 中先对 `item` 进行一次解构，
// 以确保 `sha` 作用域正确（参考 `tests/spec14.rs`）。
pub(crate) fn try_build_list_from_map(
    vt: &mut VaporTransform,
    el_ident: &Ident,
    call: &CallExpr,
    stmts: &mut Vec<Stmt>,
) -> bool {
    // 将 `arr.map((item, idx) => <li key={...}>{...}</li>)` 转为：
    // - 在父元素下插入列表 start/end 注释
    // - 使用持久化 `Map` 实现 key => item 片段 的复用
    // - 在 `watchEffect` 中调用 `_$vaporKeyedList({ items, getKey, elements, parent, before, start, renderItem })`
    // - `renderItem` 默认通过 `renderBetween(vapor(()=>{ ... }), parent, start, end)` 渲染每个项
    // - 若项为单根原生元素且开启单锚点优化，则改为 `renderAnchor(vapor(()=>{ ... }), parent, start)`
    // 参考测试：`tests/lists_and_keys.rs`、`tests/spec14.rs`
    // 仅处理 obj.map(cb) 且仅一个参数的情形
    if let Callee::Expr(expr_callee) = &call.callee {
        if let Expr::Member(MemberExpr { obj, prop: MemberProp::Ident(prop_ident), .. }) =
            &**expr_callee
        {
            if prop_ident.sym == *"map" && call.args.len() == 1 {
                log::debug("list: detected Array.map -> keyed list");
                // 占位标记
                let start = vt.next_list_ident();
                let end = vt.next_list_ident();
                // 生成列表渲染锚点：后续 renderBetween 仅在两注释之间进行插入/移动
                // 注释锚点创建细节：
                // - callee：标识符 `_$createComment`
                // - args：标记字符串（start/end）
                // - ctxt：统一 `SyntaxContext::empty()`，由 emit::call_ident 设置
                let make_start = call_ident("_$createComment", vec![string_expr("rue:list:start")]);
                let make_end = call_ident("_$createComment", vec![string_expr("rue:list:end")]);
                stmts.push(const_decl(start.clone(), make_start));
                stmts.push(const_decl(end.clone(), make_end));
                stmts.push(append_child(el_ident.clone(), Expr::Ident(start.clone())));
                stmts.push(append_child(el_ident.clone(), Expr::Ident(end.clone())));

                // 提取 map 回调与数组对象
                let cb = &call.args[0];
                let cb_expr = utils::unwrap_expr(&cb.expr);
                let arr_expr = utils::unwrap_expr(obj).clone();

                // 使用 Map 键控闭包实现列表渲染与复用
                // 先声明持久 Map：let _mapX_elements = new Map();
                let map_base = vt.next_map_base();
                let elements_ident = ident(&format!("{}{}", map_base, "_elements"));
                // 持久化 Map，实现跨次渲染的片段复用（key -> {start,end,stop}）
                let new_map_expr = Expr::New(NewExpr {
                    span: DUMMY_SP,
                    callee: Box::new(Expr::Ident(ident("Map"))),
                    args: None,
                    type_args: None,
                    ctxt: SyntaxContext::empty(),
                });
                let elements_decl = Stmt::Decl(Decl::Var(Box::new(VarDecl {
                    span: DUMMY_SP,
                    ctxt: SyntaxContext::empty(),
                    kind: VarDeclKind::Let,
                    declare: false,
                    decls: vec![VarDeclarator {
                        span: DUMMY_SP,
                        name: Pat::Ident(BindingIdent {
                            id: elements_ident.clone(),
                            type_ann: None,
                        }),
                        init: Some(Box::new(new_map_expr)),
                        definite: false,
                    }],
                })));
                stmts.push(elements_decl);
                log::debug("list: emitted anchors and elements Map");

                // 构造 watchEffect 箭头函数体
                let map_current = ident(&format!("{}{}", map_base, "_current"));
                let or_arr = Expr::Bin(BinExpr {
                    span: DUMMY_SP,
                    op: BinaryOp::LogicalOr,
                    left: Box::new(arr_expr.clone()),
                    right: Box::new(Expr::Array(ArrayLit { span: DUMMY_SP, elems: vec![] })),
                });
                let decl_current = const_decl(map_current.clone(), or_arr);

                let map_new = ident(&format!("{}{}", map_base, "_newElements"));

                let mut body_stmts: Vec<Stmt> = vec![decl_current.clone()];

                // 构造 for 循环：for (let idx = 0; idx < _map_current.length; idx++) { const item = _map_current[idx]; ... }
                let mut idx_ident = ident("idx");
                let mut item_ident = ident("item");
                let mut item_param_pattern: Option<Pat> = None;
                if let Expr::Arrow(ArrowExpr { params, body, .. }) = cb_expr {
                    if !params.is_empty() {
                        match &params[0] {
                            Pat::Ident(bi) => {
                                item_ident = bi.id.clone();
                            }
                            Pat::Object(_) | Pat::Array(_) => {
                                item_param_pattern = Some(params[0].clone());
                            }
                            _ => {}
                        }
                    }
                    if params.len() >= 2 {
                        if let Pat::Ident(bi) = &params[1] {
                            idx_ident = bi.id.clone();
                        }
                    }
                    // 提取 JSX 根 key 表达式（若无则使用 idx）
                    let mut item_key_expr: Expr = Expr::Ident(idx_ident.clone());
                    let mut try_extract_key = |ret_expr: &Expr| {
                        let inner_ret0 = utils::unwrap_expr(ret_expr);
                        if let Expr::JSXElement(jsx_el0) = inner_ret0 {
                            for a in &jsx_el0.opening.attrs {
                                if let JSXAttrOrSpread::JSXAttr(attr) = a {
                                    if let JSXAttrName::Ident(n) = &attr.name {
                                        if n.sym.as_ref() == "key" {
                                            match &attr.value {
                                                Some(JSXAttrValue::Str(s)) => {
                                                    item_key_expr = Expr::Lit(Lit::Str(Str {
                                                        span: DUMMY_SP,
                                                        value: s.value.clone(),
                                                        raw: None,
                                                    }));
                                                }
                                                Some(JSXAttrValue::JSXExprContainer(ec)) => {
                                                    if let JSXExpr::Expr(expr) = &ec.expr {
                                                        let inner =
                                                            utils::unwrap_expr(expr.as_ref());
                                                        item_key_expr = inner.clone();
                                                    }
                                                }
                                                _ => {}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    };
                    match &**body {
                        BlockStmtOrExpr::BlockStmt(block) => {
                            // 这里不再只看“最后一个 return”，而是先把 block 内所有 return expr 都扫出来。
                            // 原因是 key 可能出现在 if / else 的任意分支里；
                            // 如果只抽最后一个 return，会漏掉前面分支上的 JSX key。
                            let mut return_exprs = Vec::new();
                            collect_return_exprs_in_block(block, &mut return_exprs);
                            for expr in &return_exprs {
                                try_extract_key(expr);
                            }
                        }
                        BlockStmtOrExpr::Expr(expr_ret) => {
                            try_extract_key(expr_ret.as_ref());
                        }
                    }

                    // getKey 箭头函数
                    // 若 `map` 参数是对象/数组解构，这里生成块体箭头：
                    // - `const { ... } = item; return <key-expr>;`
                    // 否则直接返回表达式即可，避免额外包裹
                    let simple_block_render = match &**body {
                        // 只有“纯声明前缀 + 最后 return”的简单 block，
                        // 才允许走 direct vapor 快路径。
                        // 一旦不是这种形态，就交给后面的 fallback 路径保留原控制流。
                        BlockStmtOrExpr::BlockStmt(block) => collect_decl_prefix_and_final_return(block),
                        BlockStmtOrExpr::Expr(_) => None,
                    };
                    let callback_prefix_stmts = simple_block_render
                        .as_ref()
                        .map(|(prefix, _)| prefix.clone())
                        .unwrap_or_default();

                    let key_needs_prefix_scope =
                        expr_uses_declared_prefix(&item_key_expr, &callback_prefix_stmts);
                    // 这里不再因为“callback 是 block body”就无脑生成块体 getKey。
                    // 现在只有两种情况才会包块：
                    // 1. 参数本身是解构，需要先把 item 解构出来；
                    // 2. key 确实依赖声明前缀里的局部变量。
                    //
                    // 这样可以把这次修复范围收窄到“作用域真正需要的部分”，
                    // 避免为了兼容 block body 而让所有 getKey 都发生额外 codegen 变化。
                    let should_block_wrap_get_key = item_param_pattern.is_some() || key_needs_prefix_scope;

                    let get_key_body = if should_block_wrap_get_key {
                        let mut get_key_stmts: Vec<Stmt> = Vec::new();
                        if let Some(pat) = &item_param_pattern {
                            let destruct_decl = Stmt::Decl(Decl::Var(Box::new(VarDecl {
                                span: DUMMY_SP,
                                ctxt: SyntaxContext::empty(),
                                kind: VarDeclKind::Const,
                                declare: false,
                                decls: vec![VarDeclarator {
                                    span: DUMMY_SP,
                                    name: pat.clone(),
                                    init: Some(Box::new(Expr::Ident(item_ident.clone()))),
                                    definite: false,
                                }],
                            })));
                            get_key_stmts.push(destruct_decl);
                        }
                        if key_needs_prefix_scope {
                            get_key_stmts.extend(callback_prefix_stmts.iter().cloned());
                        }
                        get_key_stmts.push(Stmt::Return(ReturnStmt {
                            span: DUMMY_SP,
                            arg: Some(Box::new(item_key_expr.clone())),
                        }));
                        BlockStmtOrExpr::BlockStmt(BlockStmt {
                            span: DUMMY_SP,
                            ctxt: SyntaxContext::empty(),
                            stmts: get_key_stmts,
                        })
                    } else {
                        BlockStmtOrExpr::Expr(Box::new(item_key_expr.clone()))
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

                    let mut use_single_root_anchor = false;

                    // renderItem(item, start, end)
                    // `_$vaporKeyedList` 的 `renderItem` 约定参数：
                    // - `item`：当前项
                    // - `parent`：父元素（插入点所在）
                    // - `start`/`end`：锚点注释，用于片段插入边界
                    // - `idx`：当前索引
                    // 渲染策略：使用 `renderBetween(vapor(()=>{ ... }), parent, start, end)`
                    let start_param_ident = ident("start");
                    let end_param_ident = ident("end");
                    let mut render_item_stmts: Vec<Stmt> = Vec::new();
                    let direct_render_expr = match &**body {
                        BlockStmtOrExpr::Expr(ret_expr) => {
                            Some(utils::unwrap_expr(ret_expr.as_ref()).clone())
                        }
                        BlockStmtOrExpr::BlockStmt(_block) => simple_block_render
                            .as_ref()
                            .map(|(_, ret_expr)| ret_expr.clone()),
                    };

                    if let Some(inner_ret) = direct_render_expr.as_ref() {
                        // direct vapor 快路径：
                        // 只适用于表达式体，或“纯声明前缀 + 最后 return”的简单 block。
                        // 这种情况下可以把前缀声明搬进 vapor setup，
                        // 然后像普通 JSX 一样生成 DocumentFragment。
                        let child_root = ident("_root");
                        let mut child_body: Vec<Stmt> = vec![const_decl(
                            child_root.clone(),
                            call_ident("_$createDocumentFragment", vec![]),
                        )];
                        if let Some(pat) = &item_param_pattern {
                            let destruct_decl = Stmt::Decl(Decl::Var(Box::new(VarDecl {
                                span: DUMMY_SP,
                                ctxt: SyntaxContext::empty(),
                                kind: VarDeclKind::Const,
                                declare: false,
                                decls: vec![VarDeclarator {
                                    span: DUMMY_SP,
                                    name: pat.clone(),
                                    init: Some(Box::new(Expr::Ident(item_ident.clone()))),
                                    definite: false,
                                }],
                            })));
                            child_body.push(destruct_decl);
                        }
                        child_body.extend(callback_prefix_stmts.iter().cloned());
                        match inner_ret {
                            Expr::JSXElement(jsx_el) => {
                                if is_native_single_root_jsx_element(jsx_el) {
                                    use_single_root_anchor = true;
                                }
                                build_element(vt, jsx_el, &child_root.clone(), &mut child_body);
                            }
                            Expr::JSXFragment(frag) => {
                                crate::element_fragment::emit_fragment_children(
                                    vt,
                                    &child_root.clone(),
                                    &frag.children,
                                    &mut child_body,
                                );
                            }
                            _ => {}
                        }
                        child_body.push(return_root(child_root.clone()));
                        let arrow_setup = Expr::Arrow(ArrowExpr {
                            span: DUMMY_SP,
                            params: vec![],
                            body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                span: DUMMY_SP,
                                ctxt: SyntaxContext::empty(),
                                stmts: child_body,
                            })),
                            is_async: false,
                            is_generator: false,
                            type_params: None,
                            return_type: None,
                            ctxt: SyntaxContext::empty(),
                        });
                        let child_vapor_expr = call_ident("vapor", vec![arrow_setup]);
                        let render_item_call = if use_single_root_anchor {
                            Expr::Call(CallExpr {
                                span: DUMMY_SP,
                                callee: Callee::Expr(Box::new(Expr::Ident(ident("renderAnchor")))),
                                args: vec![
                                    ExprOrSpread {
                                        spread: None,
                                        expr: Box::new(Expr::Ident(ident("__slot"))),
                                    },
                                    ExprOrSpread {
                                        spread: None,
                                        expr: Box::new(Expr::Ident(ident("parent"))),
                                    },
                                    ExprOrSpread {
                                        spread: None,
                                        expr: Box::new(Expr::Ident(start_param_ident.clone())),
                                    },
                                ],
                                type_args: None,
                                ctxt: SyntaxContext::empty(),
                            })
                        } else {
                            Expr::Call(CallExpr {
                                span: DUMMY_SP,
                                callee: Callee::Expr(Box::new(Expr::Ident(ident("renderBetween")))),
                                args: vec![
                                    ExprOrSpread {
                                        spread: None,
                                        expr: Box::new(Expr::Ident(ident("__slot"))),
                                    },
                                    ExprOrSpread {
                                        spread: None,
                                        expr: Box::new(Expr::Ident(ident("parent"))),
                                    },
                                    ExprOrSpread {
                                        spread: None,
                                        expr: Box::new(Expr::Ident(start_param_ident.clone())),
                                    },
                                    ExprOrSpread {
                                        spread: None,
                                        expr: Box::new(Expr::Ident(end_param_ident.clone())),
                                    },
                                ],
                                type_args: None,
                                ctxt: SyntaxContext::empty(),
                            })
                        };
                        render_item_stmts.push(const_decl(ident("__slot"), child_vapor_expr));
                        render_item_stmts.push(Stmt::Expr(ExprStmt {
                            span: DUMMY_SP,
                            expr: Box::new(render_item_call),
                        }));
                    } else {
                        // fallback 路径：
                        // 说明当前 block body 已经不是“声明前缀 + 最后 return”的简单形态，
                        // 典型场景是 if/else 多分支 return、try/switch 等复杂控制流。
                        //
                        // 这里不再试图把 block 拆碎重组，而是保留原 block 结构，
                        // 在 renderItem 内执行一个立即调用函数拿到 __slot，
                        // 再交给 _$vaporCreateVNode 统一转成可渲染 vnode。
                        //
                        // 这样做的好处是：
                        // 1. 条件 return 的原始语义不会被破坏；
                        // 2. 不需要继续扩张“前缀语句搬运”的规则；
                        // 3. 能把这次修复范围稳定收敛在作用域问题本身。
                        let mut slot_block_stmts: Vec<Stmt> = Vec::new();
                        if let Some(pat) = &item_param_pattern {
                            let destruct_decl = Stmt::Decl(Decl::Var(Box::new(VarDecl {
                                span: DUMMY_SP,
                                ctxt: SyntaxContext::empty(),
                                kind: VarDeclKind::Const,
                                declare: false,
                                decls: vec![VarDeclarator {
                                    span: DUMMY_SP,
                                    name: pat.clone(),
                                    init: Some(Box::new(Expr::Ident(item_ident.clone()))),
                                    definite: false,
                                }],
                            })));
                            slot_block_stmts.push(destruct_decl);
                        }
                        if let BlockStmtOrExpr::BlockStmt(block) = &**body {
                            slot_block_stmts.extend(block.stmts.iter().cloned());
                        }
                        let slot_arrow = Expr::Arrow(ArrowExpr {
                            span: DUMMY_SP,
                            params: vec![],
                            body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                span: DUMMY_SP,
                                ctxt: SyntaxContext::empty(),
                                stmts: slot_block_stmts,
                            })),
                            is_async: false,
                            is_generator: false,
                            type_params: None,
                            return_type: None,
                            ctxt: SyntaxContext::empty(),
                        });
                        let slot_expr = Expr::Call(CallExpr {
                            span: DUMMY_SP,
                            callee: Callee::Expr(Box::new(Expr::Paren(ParenExpr {
                                span: DUMMY_SP,
                                expr: Box::new(slot_arrow),
                            }))),
                            args: vec![],
                            type_args: None,
                            ctxt: SyntaxContext::empty(),
                        });
                        let render_item_call = Expr::Call(CallExpr {
                            span: DUMMY_SP,
                            callee: Callee::Expr(Box::new(Expr::Ident(ident("renderBetween")))),
                            args: vec![
                                ExprOrSpread {
                                    spread: None,
                                    expr: Box::new(Expr::Ident(ident("__vnode"))),
                                },
                                ExprOrSpread {
                                    spread: None,
                                    expr: Box::new(Expr::Ident(ident("parent"))),
                                },
                                ExprOrSpread {
                                    spread: None,
                                    expr: Box::new(Expr::Ident(start_param_ident.clone())),
                                },
                                ExprOrSpread {
                                    spread: None,
                                    expr: Box::new(Expr::Ident(end_param_ident.clone())),
                                },
                            ],
                            type_args: None,
                            ctxt: SyntaxContext::empty(),
                        });
                        render_item_stmts.push(const_decl(ident("__slot"), slot_expr));
                        render_item_stmts.push(const_decl(
                            ident("__vnode"),
                            call_ident("_$vaporCreateVNode", vec![Expr::Ident(ident("__slot"))]),
                        ));
                        render_item_stmts.push(Stmt::Expr(ExprStmt {
                            span: DUMMY_SP,
                            expr: Box::new(render_item_call),
                        }));
                    }
                    let render_item_arrow = Expr::Arrow(ArrowExpr {
                        span: DUMMY_SP,
                        params: vec![
                            Pat::Ident(BindingIdent { id: item_ident.clone(), type_ann: None }),
                            Pat::Ident(BindingIdent { id: ident("parent"), type_ann: None }),
                            Pat::Ident(BindingIdent {
                                id: start_param_ident.clone(),
                                type_ann: None,
                            }),
                            Pat::Ident(BindingIdent {
                                id: end_param_ident.clone(),
                                type_ann: None,
                            }),
                            Pat::Ident(BindingIdent { id: idx_ident.clone(), type_ann: None }),
                        ],
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

                    // _$vaporKeyedList({ items, getKey, elements, parent, before, start, renderItem })
                    let parent_expr = if el_ident.sym.as_ref() == "_root" {
                        // 对于块体根 _root，renderBetween 的 parent 取 start.parentNode；元素上下文直接用 el_ident
                        Expr::Member(MemberExpr {
                            span: DUMMY_SP,
                            obj: Box::new(Expr::Ident(start.clone())),
                            prop: MemberProp::Ident(ident_name("parentNode")),
                        })
                    } else {
                        Expr::Ident(el_ident.clone())
                    };
                    // 传入 keyedList 所需参数：items、key 计算、元素映射以及父/锚点位置
                    let mut keyed_list_props = vec![
                        PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                            key: PropName::Ident(ident_name("items")),
                            value: Box::new(Expr::Ident(map_current.clone())),
                        }))),
                        PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                            key: PropName::Ident(ident_name("getKey")),
                            value: Box::new(get_key_arrow),
                        }))),
                        PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                            key: PropName::Ident(ident_name("elements")),
                            value: Box::new(Expr::Ident(elements_ident.clone())),
                        }))),
                        PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                            key: PropName::Ident(ident_name("parent")),
                            value: Box::new(parent_expr),
                        }))),
                        PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                            key: PropName::Ident(ident_name("before")),
                            value: Box::new(Expr::Ident(end.clone())),
                        }))),
                    ];

                    if use_single_root_anchor {
                        keyed_list_props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(
                            KeyValueProp {
                                key: PropName::Ident(ident_name("singleRoot")),
                                value: Box::new(Expr::Lit(Lit::Bool(Bool {
                                    span: DUMMY_SP,
                                    value: true,
                                }))),
                            },
                        ))));
                    }

                    keyed_list_props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(
                        KeyValueProp {
                            key: PropName::Ident(ident_name("start")),
                            value: Box::new(Expr::Ident(start.clone())),
                        },
                    ))));
                    keyed_list_props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(
                        KeyValueProp {
                            key: PropName::Ident(ident_name("renderItem")),
                            value: Box::new(render_item_arrow),
                        },
                    ))));

                    let args_obj =
                        Expr::Object(ObjectLit { span: DUMMY_SP, props: keyed_list_props });
                    // _$vaporKeyedList 调用细节：
                    // - callee：标识符 `_$vaporKeyedList`
                    // - args：对象字面量，包含 `items/getKey/elements/parent/before/start/renderItem`
                    // - ctxt：统一 `SyntaxContext::empty()`
                    let decl_new =
                        const_decl(map_new.clone(), call_ident("_$vaporKeyedList", vec![args_obj]));
                    body_stmts.push(decl_new);
                    // elements = newElements
                    // 更新持久 Map 引用，保持下一轮复用
                    body_stmts.push(Stmt::Expr(ExprStmt {
                        span: DUMMY_SP,
                        expr: Box::new(Expr::Assign(AssignExpr {
                            span: DUMMY_SP,
                            op: AssignOp::Assign,
                            left: AssignTarget::Simple(SimpleAssignTarget::Ident(
                                elements_ident.clone().into(),
                            )),
                            right: Box::new(Expr::Ident(map_new.clone())),
                        })),
                    }));
                }

                // watchEffect(() => { ... })
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
                // watch 调用细节：
                // - callee：标识符 `watchEffect`
                // - args：箭头函数体封装列表的 diff 与渲染逻辑
                // - ctxt：`SyntaxContext::empty()`
                let watch_call = call_ident("watchEffect", vec![arrow]);
                stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(watch_call) }));

                return true;
            }
        }
    }
    false
}
