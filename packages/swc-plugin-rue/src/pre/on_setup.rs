use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;

fn unwrap_direct_hook_id(expr: &mut Box<Expr>) {
    let Expr::Call(wrapper) = expr.as_mut() else {
        return;
    };
    let Callee::Expr(callee) = &wrapper.callee else {
        return;
    };
    let Expr::Ident(callee) = callee.as_ref() else {
        return;
    };
    if callee.sym != *"_$compiledWithHookId" || wrapper.args.len() != 2 {
        return;
    }

    let id = &wrapper.args[0];
    if id.spread.is_some() || !matches!(id.expr.as_ref(), Expr::Lit(Lit::Str(_))) {
        return;
    }

    let runner = &wrapper.args[1];
    if runner.spread.is_some() {
        return;
    }
    let Expr::Arrow(runner) = runner.expr.as_ref() else {
        return;
    };
    if !runner.params.is_empty() || runner.is_async || runner.is_generator {
        return;
    }
    let BlockStmtOrExpr::Expr(body) = runner.body.as_ref() else {
        return;
    };
    if !matches!(body.as_ref(), Expr::Call(_)) {
        return;
    }

    *expr = body.clone();
}

fn normalize_setup_stmt(stmt: &mut Stmt) {
    match stmt {
        Stmt::Decl(Decl::Var(var)) => {
            for decl in &mut var.decls {
                if let Some(init) = &mut decl.init {
                    unwrap_direct_hook_id(init);
                }
            }
        }
        Stmt::Expr(expr) => unwrap_direct_hook_id(&mut expr.expr),
        _ => {}
    }
}

/// Build an owner-local setup slot and destructure its exported bindings.
/// Both preprocessed and closed components use the same explicit compiled ABI.
pub fn build_setup_with_binds(
    hook_id: &str,
    setup_ident: Ident,
    names_const: Vec<String>,
    names_let: Vec<String>,
    collected: Vec<Stmt>,
) -> Vec<Stmt> {
    // 1) 组装 useSetup 的函数体：先放入已收集的语句，稍后补上 return { ... }
    let mut setup_body_stmts: Vec<Stmt> = collected.clone();
    for stmt in &mut setup_body_stmts {
        normalize_setup_stmt(stmt);
    }
    // 建立声明名到 Ident 的映射，用于 return 对象的值侧引用（保持原始标识符）
    let mut decl_map: std::collections::HashMap<String, Ident> = std::collections::HashMap::new();
    for s in &collected {
        match s {
            Stmt::Decl(Decl::Var(v)) => {
                for d in &v.decls {
                    fn collect(p: &Pat, out: &mut std::collections::HashMap<String, Ident>) {
                        match p {
                            Pat::Ident(BindingIdent { id, .. }) => {
                                out.insert(id.sym.to_string(), id.clone());
                            }
                            Pat::Array(arr) => {
                                for ep in arr.elems.iter().flatten() {
                                    collect(ep, out);
                                }
                            }
                            Pat::Object(obj) => {
                                for prop in &obj.props {
                                    match prop {
                                        ObjectPatProp::KeyValue(kv) => {
                                            collect(kv.value.as_ref(), out);
                                        }
                                        ObjectPatProp::Assign(a) => {
                                            out.insert(a.key.id.sym.to_string(), a.key.id.clone());
                                        }
                                        ObjectPatProp::Rest(r) => {
                                            collect(r.arg.as_ref(), out);
                                        }
                                    }
                                }
                            }
                            Pat::Assign(ap) => {
                                collect(ap.left.as_ref(), out);
                            }
                            _ => {}
                        }
                    }
                    // 对每个声明的解构模式进行递归解析，收集所有绑定的标识符
                    collect(&d.name, &mut decl_map);
                }
            }
            Stmt::Decl(Decl::Fn(f)) => {
                // 函数声明直接以函数名作为导出标识符
                decl_map.insert(f.ident.sym.to_string(), f.ident.clone());
            }
            _ => {}
        }
    }
    // 2) 构造 return 对象的属性列表：key 使用 ident_name（避免关键字冲突），value 使用原始 Ident
    let mut ret_obj_props: Vec<PropOrSpread> = Vec::new();
    for n in names_const.iter().chain(names_let.iter()) {
        let key_ident = crate::emit::ident_name(n);
        let value_ident = decl_map.get(n).cloned().unwrap_or_else(|| crate::emit::ident(n));
        ret_obj_props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
            key: PropName::Ident(key_ident),
            value: Box::new(Expr::Ident(value_ident)),
        }))));
    }
    // 将 return { ... } 追加到 useSetup 函数体末尾
    setup_body_stmts.push(Stmt::Return(ReturnStmt {
        span: DUMMY_SP,
        arg: Some(Box::new(Expr::Object(ObjectLit { span: DUMMY_SP, props: ret_obj_props }))),
    }));
    // 3) 构造 `() => { <stmts>; return {...} }` 的箭头函数作为 useSetup 的参数
    let setup_arrow = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            stmts: setup_body_stmts,
        })),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    // Every setup region belongs to the same compiler owner; no runtime Hook runner.
    let setup_call = crate::emit::call_ident(
        "_$compiledSetup",
        vec![crate::emit::string_expr(hook_id), setup_arrow],
    );
    // 5) 使用调用者提供的无冲突容器名生成 setup 声明
    let setup_decl = Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span: DUMMY_SP,
        kind: VarDeclKind::Const,
        declare: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: Pat::Ident(BindingIdent { id: setup_ident.clone(), type_ann: None }),
            init: Some(Box::new(setup_call)),
            definite: false,
        }],
        ctxt: SyntaxContext::empty(),
    })));

    let mut out: Vec<Stmt> = vec![setup_decl];
    // 6) 生成 const 的对象解构绑定：从 _$useSetup 取出只读名称
    if !names_const.is_empty() {
        let mut pat_props: Vec<ObjectPatProp> = Vec::new();
        for n in &names_const {
            pat_props.push(ObjectPatProp::KeyValue(KeyValuePatProp {
                key: PropName::Ident(crate::emit::ident_name(n)),
                value: Box::new(Pat::Ident(BindingIdent {
                    id: crate::emit::ident(n),
                    type_ann: None,
                })),
            }));
        }
        let obj_pat = Pat::Object(ObjectPat {
            span: DUMMY_SP,
            props: pat_props,
            optional: false,
            type_ann: None,
        });
        out.push(Stmt::Decl(Decl::Var(Box::new(VarDecl {
            span: DUMMY_SP,
            kind: VarDeclKind::Const,
            declare: false,
            decls: vec![VarDeclarator {
                span: DUMMY_SP,
                name: obj_pat,
                init: Some(Box::new(Expr::Ident(setup_ident.clone()))),
                definite: false,
            }],
            ctxt: SyntaxContext::empty(),
        }))));
    }
    // 7) 生成 let 的对象解构绑定：从 _$useSetup 取出可变名称
    if !names_let.is_empty() {
        let mut pat_props: Vec<ObjectPatProp> = Vec::new();
        for n in &names_let {
            pat_props.push(ObjectPatProp::KeyValue(KeyValuePatProp {
                key: PropName::Ident(crate::emit::ident_name(n)),
                value: Box::new(Pat::Ident(BindingIdent {
                    id: crate::emit::ident(n),
                    type_ann: None,
                })),
            }));
        }
        let obj_pat = Pat::Object(ObjectPat {
            span: DUMMY_SP,
            props: pat_props,
            optional: false,
            type_ann: None,
        });
        out.push(Stmt::Decl(Decl::Var(Box::new(VarDecl {
            span: DUMMY_SP,
            kind: VarDeclKind::Let,
            declare: false,
            decls: vec![VarDeclarator {
                span: DUMMY_SP,
                name: obj_pat,
                init: Some(Box::new(Expr::Ident(setup_ident.clone()))),
                definite: false,
            }],
            ctxt: SyntaxContext::empty(),
        }))));
    }
    out
}

pub use build_setup_with_binds as build_compiled_setup_with_binds;

#[cfg(test)]
#[path = "on_setup_tests.rs"]
mod tests;
