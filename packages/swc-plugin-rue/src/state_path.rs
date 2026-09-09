//! Static source-state reads. Descriptors are immutable module constants; signal-owned
//! cursors are resolved lazily by the runtime and shared by all bindings of a path.
use std::collections::{HashMap, HashSet};
use swc_core::common::DUMMY_SP;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitMut, VisitMutWith, VisitWith};

fn array(values: Vec<Expr>) -> Expr {
    Expr::Array(ArrayLit {
        span: DUMMY_SP,
        elems: values
            .into_iter()
            .map(|expr| Some(ExprOrSpread { spread: None, expr: Box::new(expr) }))
            .collect(),
    })
}

fn numeric_key(value: f64) -> Expr {
    // Canonicalize safe integer indices, leaving JS to stringify other numbers.
    if value == 0.0 {
        return crate::emit::string_expr("0");
    }
    if value.fract() == 0.0 && value.abs() <= 9_007_199_254_740_991.0 {
        crate::emit::string_expr(&value.to_string())
    } else {
        Expr::Lit(Lit::Num(Number { span: DUMMY_SP, value, raw: None }))
    }
}

fn chain<'a>(expr: &'a Expr, keys: &mut Vec<Expr>, optional: &mut Vec<Expr>) -> Option<&'a Ident> {
    let (member, short) = match expr {
        Expr::Ident(root) => return Some(root),
        Expr::Member(member) => (member, false),
        Expr::OptChain(opt) => match opt.base.as_ref() {
            OptChainBase::Member(member) => (member, opt.optional),
            _ => return None,
        },
        // Parentheses delimit an optional chain: (state?.user).name must still throw.
        _ => return None,
    };
    let root = chain(&member.obj, keys, optional)?;
    let key = match &member.prop {
        MemberProp::Ident(key) => crate::emit::string_expr(key.sym.as_ref()),
        MemberProp::Computed(key) => match crate::utils::unwrap_expr(&key.expr) {
            Expr::Lit(Lit::Str(value)) => crate::emit::string_expr(&value.value.to_string_lossy()),
            Expr::Lit(Lit::Num(value)) if value.value.is_finite() => numeric_key(value.value),
            Expr::Unary(unary) if unary.op == UnaryOp::Minus => {
                let Expr::Lit(Lit::Num(value)) = unary.arg.as_ref() else {
                    return None;
                };
                numeric_key(-value.value)
            }
            _ => return None,
        },
        _ => return None,
    };
    keys.push(key);
    optional.push(Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: short })));
    Some(root)
}

pub(crate) fn lower_read(expr: &Expr, resolve: impl FnOnce(&str) -> Option<Ident>) -> Option<Expr> {
    let mut keys = Vec::new();
    let mut optional = Vec::new();
    let root = chain(expr, &mut keys, &mut optional)?;
    if keys.is_empty() {
        return None;
    }
    let signal = resolve(root.sym.as_ref())?;
    Some(crate::emit::call_ident(
        "_$compiledReadPath",
        vec![
            Expr::Ident(signal),
            crate::emit::call_ident("_$compiledPath", vec![array(keys), array(optional)]),
        ],
    ))
}

#[derive(Default)]
struct Names(HashSet<String>);
impl Visit for Names {
    fn visit_ident(&mut self, ident: &Ident) {
        self.0.insert(ident.sym.to_string());
    }
}
struct Hoist {
    names: HashSet<String>,
    paths: HashMap<String, Ident>,
    declarations: Vec<ModuleItem>,
}
impl VisitMut for Hoist {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if let Expr::Call(call) = expr
            && let Callee::Expr(callee) = &call.callee
            && matches!(callee.as_ref(), Expr::Ident(id) if id.sym == "_$compiledPath")
        {
            let key = format!("{:?}", call.args);
            let ident = self
                .paths
                .entry(key)
                .or_insert_with(|| {
                    let mut index = self.names.len();
                    let name = loop {
                        let name = format!("_$statePath{index}");
                        if self.names.insert(name.clone()) {
                            break name;
                        }
                        index += 1;
                    };
                    let ident = crate::emit::ident(&name);
                    self.declarations.push(ModuleItem::Stmt(crate::emit::const_decl(
                        ident.clone(),
                        expr.clone(),
                    )));
                    ident
                })
                .clone();
            *expr = Expr::Ident(ident);
            return;
        }
        expr.visit_mut_children_with(self);
    }
}
pub(crate) fn hoist(module: &mut Module) {
    let mut names = Names::default();
    module.visit_with(&mut names);
    let mut pass = Hoist { names: names.0, paths: HashMap::new(), declarations: vec![] };
    module.visit_mut_with(&mut pass);
    let offset = module
        .body
        .iter()
        .take_while(|item| match item {
            ModuleItem::ModuleDecl(ModuleDecl::Import(_)) => true,
            ModuleItem::Stmt(Stmt::Expr(stmt)) => {
                matches!(stmt.expr.as_ref(), Expr::Lit(Lit::Str(_)))
            }
            _ => false,
        })
        .count();
    module.body.splice(offset..offset, pass.declarations);
}

// Build each reference before evaluating the next key, just like a JS MemberExpression.
fn reference(expr: &Expr, resolve: &impl Fn(&str) -> Option<Ident>) -> Option<Expr> {
    match crate::utils::unwrap_expr(expr) {
        Expr::Ident(id) => Some(crate::emit::call_ident(
            "_$compiledStateRoot",
            vec![Expr::Ident(resolve(id.sym.as_ref())?)],
        )),
        Expr::Member(member) => {
            let parent = reference(&member.obj, resolve)?;
            let key = match &member.prop {
                MemberProp::Ident(id) => crate::emit::string_expr(id.sym.as_ref()),
                MemberProp::Computed(key) => *key.expr.clone(),
                _ => return None,
            };
            Some(Expr::Call(CallExpr {
                span: DUMMY_SP,
                ctxt: Default::default(),
                callee: Callee::Expr(Box::new(crate::emit::call_ident(
                    "_$compiledStateMember",
                    vec![parent],
                ))),
                args: vec![ExprOrSpread { spread: None, expr: Box::new(key) }],
                type_args: None,
            }))
        }
        _ => None,
    }
}
fn reference_value(expr: Expr) -> MemberExpr {
    MemberExpr {
        span: DUMMY_SP,
        obj: Box::new(expr),
        prop: MemberProp::Ident(IdentName::new("value".into(), DUMMY_SP)),
    }
}
pub(crate) fn lower_write(expr: &Expr, resolve: impl Fn(&str) -> Option<Ident>) -> Option<Expr> {
    match expr {
        Expr::Assign(assign) => {
            let AssignTarget::Simple(SimpleAssignTarget::Member(member)) = &assign.left else {
                return None;
            };
            let target = reference(&Expr::Member(member.clone()), &resolve)?;
            let mut assign = assign.clone();
            assign.left = AssignTarget::Simple(SimpleAssignTarget::Member(reference_value(target)));
            Some(Expr::Assign(assign))
        }
        Expr::Update(update)
            if matches!(crate::utils::unwrap_expr(&update.arg), Expr::Member(_)) =>
        {
            let target = reference(&update.arg, &resolve)?;
            let mut update = update.clone();
            update.arg = Box::new(Expr::Member(reference_value(target)));
            Some(Expr::Update(update))
        }
        Expr::Unary(unary) if unary.op == UnaryOp::Delete => {
            let target = reference(&unary.arg, &resolve)?;
            Some(crate::emit::call_ident("_$compiledStateDelete", vec![target]))
        }
        Expr::Call(call) => {
            let Callee::Expr(callee) = &call.callee else { return None };
            let Expr::Member(member) = callee.as_ref() else { return None };
            let MemberProp::Ident(method) = &member.prop else { return None };
            if !matches!(
                method.sym.as_ref(),
                "push"
                    | "pop"
                    | "shift"
                    | "unshift"
                    | "splice"
                    | "sort"
                    | "reverse"
                    | "fill"
                    | "copyWithin"
            ) {
                return None;
            }
            let target = reference(&member.obj, &resolve)?;
            let mut call = call.clone();
            call.callee = Callee::Expr(Box::new(crate::emit::call_ident(
                "_$compiledStateMutator",
                vec![target, crate::emit::string_expr(method.sym.as_ref())],
            )));
            Some(Expr::Call(call))
        }
        _ => None,
    }
}
