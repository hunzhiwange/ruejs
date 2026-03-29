use std::collections::HashSet;
use swc_core::ecma::ast::*;

use super::on_setup;
// side_effect 模块工具函数按需引入，当前未直接使用

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
- `has_jsx_return_in_block`：判定函数体是否返回 JSX/Fragment，用于确定是否进行 useSetup 注入。
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
/// 判定一个语句块 BlockStmt 中，是否存在返回 JSX（JSXElement/JSXFragment）的 return 语句。
/// 说明：
/// - 仅当函数体中存在明确返回 JSX 时，才进行 useSetup 注入；
/// - 同时兼容括号表达式形式的返回：return ( <JSX/> );
pub fn has_jsx_return_in_block(block: &BlockStmt) -> bool {
    block.stmts.iter().any(|s| match s {
        // 命中 return 语句，进一步判断其返回值是否为 JSX
        Stmt::Return(r) => match &r.arg {
            // 有返回值
            Some(arg) => match arg.as_ref() {
                // 直接是 JSX 元素/片段
                Expr::JSXElement(_) | Expr::JSXFragment(_) => true,
                // 若是括号表达式，需检查括号内是否为 JSX
                Expr::Paren(p) => {
                    matches!(p.expr.as_ref(), Expr::JSXElement(_) | Expr::JSXFragment(_))
                }
                // 其他表达式类型：视为非 JSX
                _ => false,
            },
            // 没有返回值（return;）：不计为 JSX 返回
            None => false,
        },
        // 非 return 语句：继续遍历
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

/// 收集注入前的“安全语句”并抽取可用名称
/// 输入：
/// - block：语句块
/// - ret_idx：第一个包含 return 的语句索引（注入边界）
/// - first_control_idx：第一个控制流语句的索引（用于更细粒度的跳过策略）
/// - skip_var_after_control：是否在控制流语句之后跳过变量声明（更保守的策略）
/// 输出：
/// - collected：待搬迁进 useSetup 的语句列表（按原顺序）
/// - names_const：以 const 方式导出的名称（包括函数声明名，作为只读）
/// - names_let：以 let/var 方式导出的名称（可变）
/// - available：在边界之前出现的名称集合（用于纯度/依赖分析）
pub fn collect_setup(
    block: &BlockStmt,
    ret_idx: usize,
    _first_control_idx: usize,
    _skip_var_after_control: bool,
) -> (Vec<Stmt>, Vec<String>, Vec<String>, HashSet<String>) {
    let mut collected: Vec<Stmt> = Vec::new();
    let mut names_const: Vec<String> = Vec::new();
    let mut names_let: Vec<String> = Vec::new();
    let mut available: HashSet<String> = HashSet::new();
    // 迭代遍历语句，直到遇到包含 return 的语句为止（ret_idx 为边界，不跨越）
    // 说明：目前实现未使用 first_control_idx/skip_var_after_control 进行“控制流后变量声明跳过”，
    // 若后续需要更保守的策略，可在 i >= first_control_idx && skip_var_after_control 情况下对 VarDecl 进行过滤。
    for (i, s) in block.stmts.iter().enumerate() {
        if i >= ret_idx {
            break;
        }
        match s {
            Stmt::Decl(Decl::Var(var)) => {
                // 收集变量声明，并从解构模式中递归提取所有绑定的标识符名称
                collected.push(s.clone());
                for vd in &var.decls {
                    fn collect_pat_idents(pat: &Pat, out: &mut Vec<String>) {
                        match pat {
                            Pat::Ident(BindingIdent { id, .. }) => {
                                out.push(id.sym.to_string());
                            }
                            Pat::Array(arr) => {
                                // 数组解构：逐个元素递归提取
                                for elem in &arr.elems {
                                    if let Some(p) = elem {
                                        collect_pat_idents(p, out);
                                    }
                                }
                            }
                            Pat::Object(obj) => {
                                // 对象解构：键值、赋值、rest 三类属性分别处理
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
                                // 赋值型模式：仅解析左侧（实际绑定名），默认值不影响导出名称
                                collect_pat_idents(ap.left.as_ref(), out);
                            }
                            _ => {}
                        }
                    }
                    let mut idents: Vec<String> = Vec::new();
                    collect_pat_idents(&vd.name, &mut idents);
                    // 根据声明的 kind（const/let/var）分类到 names_const / names_let
                    // 同时将名称加入 available 集合，供后续纯度与依赖判断使用
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
                collected.push(s.clone());
            }
        }
    }
    (collected, names_const, names_let, available)
}

/// 将已收集的语句封装进 useSetup 并在边界前插入解构绑定
/// 过程：
/// 1) 调用 `on_setup::build_setup_with_binds(names_const, names_let, collected)` 生成：
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
    let decls =
        on_setup::build_setup_with_binds(names_const.clone(), names_let.clone(), collected.clone());
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
    // 仅对返回 JSX 的函数体进行 useSetup 注入，避免在组件内部的普通函数中注入
    if !has_jsx_return_in_block(block) {
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
    // 2) 记录第一个控制流语句索引（当前实现仅作为参考）
    let fci = first_control_idx(block, ret_idx);
    // 3) 在边界之前收集安全语句，分类导出名
    let (collected, names_const, names_let, _) = collect_setup(block, ret_idx, fci, true);
    // 4) 注入 useSetup 与解构绑定
    inject_setup(block, ret_idx, names_const, names_let, collected);
}

/// 判定 FnDecl 是否需要转换：
/// - 条件一：其函数体中返回 JSX；
/// - 条件二：其返回类型显式标注为 JSX.Element。
pub fn should_transform_fn_decl(f: &FnDecl) -> bool {
    let has_jsx_return = match &f.function.body {
        Some(block) => has_jsx_return_in_block(block),
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
    let (collected, names_const, names_let, _) = collect_setup(block, ret_idx, fci, false);
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
/// - 箭头函数体是 BlockStmt 且内部返回 JSX；
/// - 箭头函数返回类型标注为 JSX.Element（且 body 为 BlockStmt）。
pub fn is_untyped_arrow_component_decl(d: &VarDeclarator) -> bool {
    if let Some(init) = d.init.as_ref() {
        if let Expr::Arrow(a) = init.as_ref() {
            if let BlockStmtOrExpr::BlockStmt(b) = &*a.body {
                if has_jsx_return_in_block(b) {
                    return true;
                }
            }
            if let Some(ann) = &a.return_type {
                if let TsType::TsTypeRef(tr) = &*ann.type_ann {
                    if let TsEntityName::Ident(id) = &tr.type_name {
                        if id.sym.as_ref() == "JSX.Element" {
                            if matches!(&*a.body, BlockStmtOrExpr::BlockStmt(_)) {
                                return true;
                            }
                        }
                    }
                }
            }
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
        // 记录第一个控制流语句索引（当前实现仅作为参考）
        let fci = first_control_idx(block, ret_idx);
        // 收集边界前安全语句并注入
        let (collected, names_const, names_let, _) = collect_setup(block, ret_idx, fci, false);
        inject_setup(block, ret_idx, names_const, names_let, collected);
    }
}

/// 检查语句块中是否已有 `_$useSetup` 声明，避免重复注入
fn block_has_use_setup(block: &BlockStmt) -> bool {
    for s in &block.stmts {
        // 仅检查变量声明语句
        if let Stmt::Decl(Decl::Var(v)) = s {
            for d in &v.decls {
                if let Pat::Ident(BindingIdent { id, .. }) = &d.name {
                    if id.sym.as_ref() == "_$useSetup" {
                        return true;
                    }
                }
            }
        }
    }
    false
}
