#![allow(dead_code)]
use std::collections::HashSet;
use swc_core::ecma::ast::*;

/*
模块职责与分析策略（中文详解）：
- 目标：在预处理阶段进行“近似保守”的纯度与副作用分析，辅助 helpers 收集可安全搬迁的语句；
- 两个核心工具函数：
  1) collect_idents_in_expr：遍历表达式（含嵌套语句与对象方法体等），收集其中出现的标识符名称；
     - 用途：判断一个表达式是否依赖“当前边界前已出现”的本地名称（available 集合），从而决定是否安全；
  2) expr_has_impure_ops：判断表达式是否包含副作用（赋值、更新、Object.assign、展开有副作用等）；
     - 用途：避免把含副作用的表达式移动到 useSetup 中造成行为变化；
- 设计原则：保守优先。宁可判定为不安全而不移动，也不要错误移动导致运行时行为改变。
*/
/// 纯度与副作用分析辅助：
/// - `collect_idents_in_expr`：收集表达式中出现的标识符，用于判定是否依赖未在可用集合中的名称。
/// - `expr_has_impure_ops`：判定表达式是否包含副作用（赋值/更新/对象合并等），避免在预处理阶段将其错误移动到 `useSetup`。
/// - 设计权衡：保持近似的保守分析，宁可不移动也不要错误移动，保证转换后的行为与源代码一致。
/// 判断赋值/更新目标是否指向“非本地”对象或标识符
/// locals：当前作用域边界内已知的本地名称集合
fn is_nonlocal_target_expr(e: &Expr, locals: &HashSet<String>) -> bool {
    let x = crate::utils::unwrap_expr(e);
    match x {
        // 目标是标识符：不在 locals 中则视为非本地
        Expr::Ident(id) => !locals.contains(id.sym.as_ref()),
        Expr::Member(m) => match &*m.obj {
            // 形如 foo.bar：若 foo 不在 locals 中，则视为非本地对象属性
            Expr::Ident(id) => !locals.contains(id.sym.as_ref()),
            Expr::Member(_) | Expr::Call(_) | Expr::This(_) => true,
            _ => true,
        },
        // this 始终视为非本地（可能指向外部对象）
        Expr::This(_) => true,
        _ => true,
    }
}

/// 深度收集表达式中出现的标识符名称（字符串形式）
/// 说明：
/// - 对象/数组/模板字面量中的各处表达式都会被递归收集；
/// - 对箭头函数/函数体内的表达式与变量初始化表达式也做了深入遍历；
pub fn collect_idents_in_expr(expr: &Expr, acc: &mut HashSet<String>) {
    match expr {
        Expr::Ident(i) => {
            acc.insert(i.sym.to_string());
        }
        Expr::TsAs(a) => {
            collect_idents_in_expr(&a.expr, acc);
        }
        Expr::TsTypeAssertion(a) => {
            collect_idents_in_expr(&a.expr, acc);
        }
        Expr::Member(m) => {
            if let Expr::Ident(obj) = &*m.obj {
                acc.insert(obj.sym.to_string());
            } else {
                collect_idents_in_expr(&m.obj, acc);
            }
        }
        Expr::Call(c) => {
            if let Callee::Expr(e) = &c.callee {
                collect_idents_in_expr(e, acc);
            }
            for a in &c.args {
                collect_idents_in_expr(a.expr.as_ref(), acc);
            }
        }
        Expr::New(n) => {
            collect_idents_in_expr(n.callee.as_ref(), acc);
            if let Some(args) = &n.args {
                for a in args {
                    collect_idents_in_expr(a.expr.as_ref(), acc);
                }
            }
        }
        Expr::Arrow(a) => match &*a.body {
            // 箭头函数体为表达式：直接收集
            BlockStmtOrExpr::Expr(e) => collect_idents_in_expr(e, acc),
            // 箭头函数体为语句块：遍历内部语句中的表达式与变量初始化
            BlockStmtOrExpr::BlockStmt(b) => {
                for st in &b.stmts {
                    if let Stmt::Expr(es) = st {
                        collect_idents_in_expr(es.expr.as_ref(), acc);
                    }
                    if let Stmt::Decl(Decl::Var(v)) = st {
                        for d in &v.decls {
                            if let Some(init) = &d.init {
                                collect_idents_in_expr(init.as_ref(), acc);
                            }
                        }
                    }
                    if let Stmt::Decl(Decl::Fn(f)) = st {
                        if let Some(body) = &f.function.body {
                            for st2 in &body.stmts {
                                if let Stmt::Expr(es) = st2 {
                                    collect_idents_in_expr(es.expr.as_ref(), acc);
                                }
                                if let Stmt::Decl(Decl::Var(v2)) = st2 {
                                    for d2 in &v2.decls {
                                        if let Some(init2) = &d2.init {
                                            collect_idents_in_expr(init2.as_ref(), acc);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        Expr::Fn(f) => {
            // 普通函数体：同样遍历内部的表达式与变量初始化
            if let Some(body) = &f.function.body {
                for st in &body.stmts {
                    if let Stmt::Expr(es) = st {
                        collect_idents_in_expr(es.expr.as_ref(), acc);
                    }
                    if let Stmt::Decl(Decl::Var(v)) = st {
                        for d in &v.decls {
                            if let Some(init) = &d.init {
                                collect_idents_in_expr(init.as_ref(), acc);
                            }
                        }
                    }
                }
            }
        }
        Expr::Paren(p) => collect_idents_in_expr(&p.expr, acc),
        Expr::Assign(a) => {
            // 赋值表达式：收集右值中的标识符
            collect_idents_in_expr(&a.right, acc);
        }
        Expr::Update(u) => {
            // 自增自减：收集其操作数中的标识符
            collect_idents_in_expr(&u.arg, acc);
        }
        Expr::Bin(b) => {
            collect_idents_in_expr(&b.left, acc);
            collect_idents_in_expr(&b.right, acc);
        }
        Expr::Cond(c) => {
            collect_idents_in_expr(&c.test, acc);
            collect_idents_in_expr(&c.cons, acc);
            collect_idents_in_expr(&c.alt, acc);
        }
        Expr::Object(o) => {
            for p in &o.props {
                match p {
                    PropOrSpread::Spread(sp) => {
                        // 对象展开：收集被展开的表达式中的标识符
                        collect_idents_in_expr(sp.expr.as_ref(), acc);
                    }
                    PropOrSpread::Prop(pb) => match pb.as_ref() {
                        Prop::KeyValue(kv) => collect_idents_in_expr(kv.value.as_ref(), acc),
                        Prop::Method(m) => {
                            // 对象方法体：遍历其中的语句表达式与变量初始化
                            if let Some(body) = &m.function.body {
                                for st in &body.stmts {
                                    if let Stmt::Expr(es) = st {
                                        collect_idents_in_expr(es.expr.as_ref(), acc);
                                    }
                                    if let Stmt::Decl(Decl::Var(v)) = st {
                                        for d in &v.decls {
                                            if let Some(init) = &d.init {
                                                collect_idents_in_expr(init.as_ref(), acc);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        Prop::Getter(g) => {
                            if let Some(body) = &g.body {
                                for st in &body.stmts {
                                    if let Stmt::Expr(es) = st {
                                        collect_idents_in_expr(es.expr.as_ref(), acc);
                                    }
                                }
                            }
                        }
                        Prop::Setter(s) => {
                            if let Some(body) = &s.body {
                                for st in &body.stmts {
                                    if let Stmt::Expr(es) = st {
                                        collect_idents_in_expr(es.expr.as_ref(), acc);
                                    }
                                }
                            }
                        }
                        _ => {}
                    },
                }
            }
        }
        Expr::Array(a) => {
            for e in &a.elems {
                if let Some(el) = e {
                    collect_idents_in_expr(el.expr.as_ref(), acc);
                }
            }
        }
        Expr::Tpl(t) => {
            // 模板字符串中的插值表达式
            for e in &t.exprs {
                collect_idents_in_expr(e.as_ref(), acc);
            }
        }
        _ => {}
    }
}

/// 判断表达式是否含有副作用（保守）
/// 规则概览：
/// - 赋值（包括对象成员赋值、模式赋值）若目标为非本地（不在 locals 集合中）则视为副作用；
/// - 更新（++/--）若目标为非本地也视为副作用；
/// - Object.assign 被视为可能修改对象（副作用）；
/// - 对象/数组/模板等结构中，只要子表达式含副作用，则整体视为副作用。
pub fn expr_has_impure_ops(expr: &Expr, locals: &HashSet<String>) -> bool {
    match expr {
        Expr::Assign(a) => {
            match &a.left {
                AssignTarget::Simple(SimpleAssignTarget::Member(m)) => {
                    // 成员赋值：若对象非本地，则副作用
                    if is_nonlocal_target_expr(&m.obj, locals) {
                        return true;
                    }
                }
                AssignTarget::Simple(SimpleAssignTarget::Ident(i)) => {
                    // 标识符赋值：不在 locals 集合则副作用
                    if !locals.contains(i.sym.as_ref()) {
                        return true;
                    }
                }
                // 模式赋值（如对象/数组解构赋值）：保守视为副作用
                AssignTarget::Pat(_) => return true,
                _ => return true,
            }
            // 继续检查右值是否包含副作用
            expr_has_impure_ops(&a.right, locals)
        }
        Expr::Update(u) => {
            // 自增自减：若目标非本地，则视为副作用
            if is_nonlocal_target_expr(u.arg.as_ref(), locals) {
                return true;
            }
            false
        }
        Expr::Bin(b) => {
            expr_has_impure_ops(&b.left, locals) || expr_has_impure_ops(&b.right, locals)
        }
        Expr::Cond(c) => {
            expr_has_impure_ops(&c.test, locals)
                || expr_has_impure_ops(&c.cons, locals)
                || expr_has_impure_ops(&c.alt, locals)
        }
        Expr::Call(c) => {
            // 调用表达式：先检查 callee 与参数是否含副作用
            if let Callee::Expr(e) = &c.callee {
                if expr_has_impure_ops(e, locals) {
                    return true;
                }
            }
            // 特判 Object.assign(Object, ...)：视为可能修改对象（副作用）
            let is_object_assign = if let Callee::Expr(e) = &c.callee {
                if let Expr::Member(m) = e.as_ref() {
                    let obj_is_object =
                        matches!(&*m.obj, Expr::Ident(id) if id.sym.as_ref() == "Object");
                    let prop_is_assign = match &m.prop {
                        MemberProp::Ident(i) => i.sym.as_ref() == "assign",
                        _ => false,
                    };
                    obj_is_object && prop_is_assign
                } else {
                    false
                }
            } else {
                false
            };
            if is_object_assign {
                return true;
            }
            for a in &c.args {
                if expr_has_impure_ops(a.expr.as_ref(), locals) {
                    return true;
                }
            }
            false
        }
        // 成员访问：递归检查对象侧是否含副作用（如调用链）
        Expr::Member(m) => expr_has_impure_ops(&m.obj, locals),
        // 纯函数/箭头本身不视为副作用（其体是否副作用由调用处决定）
        Expr::Arrow(_) | Expr::Fn(_) => false,
        Expr::Object(o) => {
            for p in &o.props {
                match p {
                    PropOrSpread::Spread(sp) => {
                        // 展开可能触发副作用（若其表达式含副作用）
                        if expr_has_impure_ops(sp.expr.as_ref(), locals) {
                            return true;
                        }
                    }
                    PropOrSpread::Prop(pb) => {
                        if let Prop::KeyValue(kv) = pb.as_ref() {
                            if expr_has_impure_ops(kv.value.as_ref(), locals) {
                                return true;
                            }
                        }
                    }
                }
            }
            false
        }
        Expr::Array(a) => {
            for e in &a.elems {
                if let Some(el) = e {
                    if expr_has_impure_ops(el.expr.as_ref(), locals) {
                        return true;
                    }
                }
            }
            false
        }
        Expr::Paren(p) => expr_has_impure_ops(&p.expr, locals),
        Expr::TsAs(a) => expr_has_impure_ops(&a.expr, locals),
        Expr::TsTypeAssertion(a) => expr_has_impure_ops(&a.expr, locals),
        Expr::Tpl(t) => {
            for e in &t.exprs {
                if expr_has_impure_ops(e.as_ref(), locals) {
                    return true;
                }
            }
            false
        }
        _ => false,
    }
}
