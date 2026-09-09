use serde::Serialize;
use std::collections::HashSet;
use swc_core::common::{Span, Spanned};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitWith};

pub(crate) const MARKER: &str = "__RUE_COMPILER_DIAGNOSTIC__";

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub(crate) struct CompileDiagnostic {
    pub category: &'static str,
    pub start: u32,
    pub end: u32,
    pub syntax: &'static str,
    pub suggestion: &'static str,
}

impl CompileDiagnostic {
    fn new(
        category: &'static str,
        span: Span,
        syntax: &'static str,
        suggestion: &'static str,
    ) -> Self {
        Self { category, start: span.lo.0, end: span.hi.0, syntax, suggestion }
    }
}

#[derive(Default)]
struct Collector {
    diagnostics: Vec<CompileDiagnostic>,
    hooks: HashSet<String>,
    jsx_depth: usize,
    control_depth: usize,
}

impl Collector {
    fn push(&mut self, diagnostic: CompileDiagnostic) {
        if !self
            .diagnostics
            .iter()
            .any(|item| item.category == diagnostic.category && item.start == diagnostic.start)
        {
            self.diagnostics.push(diagnostic);
        }
    }
}

impl Visit for Collector {
    fn visit_jsx_element(&mut self, element: &JSXElement) {
        self.jsx_depth += 1;
        element.visit_children_with(self);
        self.jsx_depth -= 1;
    }

    fn visit_jsx_expr_container(&mut self, container: &JSXExprContainer) {
        container.visit_children_with(self);
    }

    fn visit_call_expr(&mut self, call: &CallExpr) {
        if let Callee::Expr(callee) = &call.callee
            && let Expr::Ident(ident) = callee.as_ref()
            && self.hooks.contains(ident.sym.as_ref())
        {
            if self.control_depth > 0 {
                self.push(CompileDiagnostic::new(
                    "dynamic-hook",
                    call.span,
                    "conditionally executed hook",
                    "Move the hook to unconditional component setup so the compiler can assign a stable slot.",
                ));
            }
        }
        call.visit_children_with(self);
    }

    fn visit_if_stmt(&mut self, stmt: &IfStmt) {
        self.control_depth += 1;
        stmt.visit_children_with(self);
        self.control_depth -= 1;
    }

    fn visit_switch_stmt(&mut self, stmt: &SwitchStmt) {
        self.control_depth += 1;
        stmt.visit_children_with(self);
        self.control_depth -= 1;
    }

    fn visit_cond_expr(&mut self, expr: &CondExpr) {
        self.control_depth += 1;
        expr.visit_children_with(self);
        self.control_depth -= 1;
    }
}

fn is_vapor_hook(name: &str) -> bool {
    matches!(
        name,
        "useState"
            | "useEffect"
            | "useSetup"
            | "useRef"
            | "watch"
            | "watchEffect"
            | "computed"
            | "ref"
            | "reactive"
    )
}

#[derive(Default)]
struct ImportedHookCollector {
    hooks: HashSet<String>,
}

impl Visit for ImportedHookCollector {
    fn visit_import_decl(&mut self, import: &ImportDecl) {
        for specifier in &import.specifiers {
            let ImportSpecifier::Named(named) = specifier else {
                continue;
            };
            let imported_name = match &named.imported {
                Some(ModuleExportName::Ident(ident)) => ident.sym.to_string(),
                Some(ModuleExportName::Str(value)) => value.value.to_string_lossy().into_owned(),
                None => named.local.sym.to_string(),
            };
            if is_vapor_hook(&imported_name) {
                self.hooks.insert(named.local.sym.to_string());
            }
        }
    }
}

struct WrapperHookCollector<'a> {
    known_hooks: &'a HashSet<String>,
    wrappers: HashSet<String>,
    candidate: Option<String>,
}

impl WrapperHookCollector<'_> {
    fn visit_candidate<N>(&mut self, name: &Ident, node: &N)
    where
        N: VisitWith<Self>,
    {
        let name = name.sym.to_string();
        if !is_hook_wrapper_name(&name) {
            return;
        }
        let previous = self.candidate.replace(name);
        node.visit_children_with(self);
        self.candidate = previous;
    }
}

impl Visit for WrapperHookCollector<'_> {
    fn visit_fn_decl(&mut self, declaration: &FnDecl) {
        self.visit_candidate(&declaration.ident, &declaration.function);
    }

    fn visit_var_declarator(&mut self, declaration: &VarDeclarator) {
        let Pat::Ident(binding) = &declaration.name else {
            declaration.visit_children_with(self);
            return;
        };
        let Some(initializer) = &declaration.init else {
            return;
        };
        if matches!(initializer.as_ref(), Expr::Arrow(_) | Expr::Fn(_)) {
            self.visit_candidate(&binding.id, initializer.as_ref());
        } else {
            initializer.visit_with(self);
        }
    }

    fn visit_call_expr(&mut self, call: &CallExpr) {
        if let Some(candidate) = &self.candidate
            && let Callee::Expr(callee) = &call.callee
            && let Expr::Ident(ident) = callee.as_ref()
            && self.known_hooks.contains(ident.sym.as_ref())
        {
            self.wrappers.insert(candidate.clone());
        }
        call.visit_children_with(self);
    }
}

fn is_hook_wrapper_name(name: &str) -> bool {
    let Some(rest) = name.strip_prefix("use") else {
        return false;
    };
    rest.chars().next().is_some_and(char::is_uppercase)
}

fn collect_hooks(program: &Program) -> HashSet<String> {
    let mut imports = ImportedHookCollector::default();
    program.visit_with(&mut imports);
    let mut hooks = imports.hooks;

    loop {
        let mut collector =
            WrapperHookCollector { known_hooks: &hooks, wrappers: HashSet::new(), candidate: None };
        program.visit_with(&mut collector);
        let previous_len = hooks.len();
        hooks.extend(collector.wrappers);
        if hooks.len() == previous_len {
            return hooks;
        }
    }
}

// Source-level escape checking runs before useState is erased by component lowering.
#[derive(Default)]
struct StateEscapes {
    states: std::collections::HashMap<String, bool>,
    hooks: HashSet<String>,
    diagnostics: Vec<CompileDiagnostic>,
}
impl StateEscapes {
    fn root<'a>(&self, expr: &'a Expr) -> Option<&'a Ident> {
        match crate::utils::unwrap_expr(expr) {
            Expr::Ident(id) => Some(id),
            Expr::Member(member) => self.root(&member.obj),
            Expr::OptChain(chain) => match chain.base.as_ref() {
                OptChainBase::Member(member) => self.root(&member.obj),
                OptChainBase::Call(call) => self.root(&call.callee),
            },
            _ => None,
        }
    }
    fn tracked(&self, expr: &Expr) -> bool {
        self.root(expr).is_some_and(|id| self.states.contains_key(id.sym.as_ref()))
    }
    fn reject(&mut self, span: Span, syntax: &'static str) {
        self.diagnostics.push(CompileDiagnostic::new("state-escape", span, syntax,
            "Use direct state path writes or native array mutators; pass an explicit snapshot to unknown code."));
    }
    fn bind(&mut self, pat: &Pat, alias: bool) {
        match pat {
            Pat::Ident(id) => {
                self.states.insert(id.id.sym.to_string(), alias);
            }
            Pat::Array(array) => {
                for pat in array.elems.iter().flatten() {
                    self.bind(pat, alias)
                }
            }
            Pat::Object(object) => {
                for prop in &object.props {
                    match prop {
                        ObjectPatProp::KeyValue(prop) => self.bind(&prop.value, alias),
                        ObjectPatProp::Assign(prop) => {
                            self.states.insert(prop.key.id.sym.to_string(), alias);
                        }
                        ObjectPatProp::Rest(prop) => self.bind(&prop.arg, alias),
                    }
                }
            }
            Pat::Assign(assign) => self.bind(&assign.left, alias),
            Pat::Rest(rest) => self.bind(&rest.arg, alias),
            _ => {}
        }
    }
    fn shadow(&mut self, pat: &Pat) {
        let mut names = StateEscapes::default();
        names.bind(pat, false);
        for name in names.states.keys() {
            self.states.remove(name);
        }
    }
    fn alias_write(&mut self, expr: &Expr) {
        if self.root(expr).is_some_and(|id| self.states.get(id.sym.as_ref()) == Some(&true)) {
            self.reject(expr.span(), "write through a state alias");
        }
    }
}
impl Visit for StateEscapes {
    fn visit_import_decl(&mut self, import: &ImportDecl) {
        if !import.src.value.to_string_lossy().starts_with("@rue-js/") {
            return;
        }
        for specifier in &import.specifiers {
            if let ImportSpecifier::Named(named) = specifier {
                let name = match &named.imported {
                    Some(ModuleExportName::Ident(id)) => id.sym.as_ref(),
                    None => named.local.sym.as_ref(),
                    _ => continue,
                };
                if name == "useState" {
                    self.hooks.insert(named.local.sym.to_string());
                }
            }
        }
    }
    fn visit_block_stmt(&mut self, block: &BlockStmt) {
        let saved = self.states.clone();
        block.visit_children_with(self);
        self.states = saved;
    }
    fn visit_function(&mut self, function: &Function) {
        let saved = self.states.clone();
        for parameter in &function.params {
            self.shadow(&parameter.pat);
        }
        function.visit_children_with(self);
        self.states = saved;
    }
    fn visit_arrow_expr(&mut self, arrow: &ArrowExpr) {
        let saved = self.states.clone();
        for parameter in &arrow.params {
            self.shadow(parameter);
        }
        arrow.visit_children_with(self);
        self.states = saved;
    }
    fn visit_var_declarator(&mut self, declaration: &VarDeclarator) {
        let Some(init) = &declaration.init else {
            self.shadow(&declaration.name);
            return;
        };
        init.visit_with(self);
        let is_state = matches!(crate::utils::unwrap_expr(init), Expr::Call(call)
            if matches!(&call.callee, Callee::Expr(callee) if matches!(callee.as_ref(), Expr::Ident(id) if self.hooks.contains(id.sym.as_ref())))
                && !matches!(call.args.first().map(|arg| crate::utils::unwrap_expr(&arg.expr)), Some(Expr::Lit(_))));
        if is_state {
            if let Pat::Array(pattern) = &declaration.name
                && let Some(Some(first)) = pattern.elems.first()
            {
                self.bind(first, false);
            }
        } else if self.tracked(init) {
            self.bind(&declaration.name, true);
        } else {
            self.shadow(&declaration.name);
        }
    }
    fn visit_assign_expr(&mut self, assign: &AssignExpr) {
        match &assign.left {
            AssignTarget::Simple(SimpleAssignTarget::Member(member)) => {
                self.alias_write(&Expr::Member(member.clone()))
            }
            AssignTarget::Simple(SimpleAssignTarget::Ident(id)) => {
                // Reassigning a local snapshot detaches it from state provenance.
                if self.tracked(&assign.right) {
                    self.states.insert(id.id.sym.to_string(), true);
                } else if self.states.get(id.id.sym.as_ref()) == Some(&true) {
                    self.states.remove(id.id.sym.as_ref());
                }
            }
            AssignTarget::Pat(pattern) => {
                #[derive(Default)]
                struct Names(HashSet<String>);
                impl Visit for Names {
                    fn visit_ident(&mut self, id: &Ident) {
                        self.0.insert(id.sym.to_string());
                    }
                }
                let mut names = Names::default();
                pattern.visit_with(&mut names);
                if self.tracked(&assign.right)
                    || names.0.iter().any(|name| self.states.contains_key(name))
                {
                    self.reject(assign.span, "destructuring state assignment");
                }
            }
            _ => {}
        }
        assign.visit_children_with(self);
    }
    fn visit_update_expr(&mut self, update: &UpdateExpr) {
        self.alias_write(&update.arg);
        update.visit_children_with(self);
    }
    fn visit_unary_expr(&mut self, unary: &UnaryExpr) {
        if unary.op == UnaryOp::Delete {
            self.alias_write(&unary.arg);
        }
        unary.visit_children_with(self);
    }
    fn visit_opt_call(&mut self, call: &OptCall) {
        let member = match call.callee.as_ref() {
            Expr::Member(member) => Some(member),
            Expr::OptChain(chain) => match chain.base.as_ref() {
                OptChainBase::Member(member) => Some(member),
                _ => None,
            },
            _ => None,
        };
        if let Some(member) = member
            && self.tracked(&member.obj)
            && !matches!(&member.prop, MemberProp::Ident(id) if matches!(id.sym.as_ref(), "toString" | "valueOf" | "toLocaleString"))
        {
            self.reject(call.span, "optional state method call");
        }
        call.visit_children_with(self);
    }
    fn visit_call_expr(&mut self, call: &CallExpr) {
        let mut dangerous_object = false;
        if let Callee::Expr(callee) = &call.callee {
            if let Expr::Member(member) = callee.as_ref() {
                dangerous_object = matches!(member.obj.as_ref(), Expr::Ident(id) if id.sym == "Object" || id.sym == "Reflect");
                if self.tracked(&member.obj) {
                    if matches!(member.prop, MemberProp::Computed(_)) {
                        self.reject(call.span, "dynamic state method call");
                    } else if matches!(&member.prop, MemberProp::Ident(method) if !matches!(method.sym.as_ref(),
                        "push" | "pop" | "shift" | "unshift" | "splice" | "sort" | "reverse" | "fill" | "copyWithin" |
                        "map" | "filter" | "slice" | "concat" | "join" | "includes" | "indexOf" | "lastIndexOf" |
                        "at" | "find" | "findIndex" | "some" | "every" | "reduce" | "reduceRight" | "forEach" |
                        "toString" | "toLocaleString" | "valueOf"))
                    {
                        self.reject(call.span, "unknown state method call");
                    } else if self
                        .root(&member.obj)
                        .is_some_and(|id| self.states.get(id.sym.as_ref()) == Some(&true))
                    {
                        self.reject(call.span, "method call through a state alias");
                    }
                }
            }
        }
        for argument in &call.args {
            if self.tracked(&argument.expr)
                && (dangerous_object
                    || matches!(crate::utils::unwrap_expr(&argument.expr), Expr::Ident(_)))
            {
                self.reject(argument.expr.span(), "state passed to unknown code");
            }
        }
        call.visit_children_with(self);
    }
}

pub(crate) fn collect(program: &Program) -> Vec<CompileDiagnostic> {
    let mut collector = Collector { hooks: collect_hooks(program), ..Default::default() };
    program.visit_with(&mut collector);
    let mut escapes = StateEscapes::default();
    program.visit_with(&mut escapes);
    collector.diagnostics.extend(escapes.diagnostics);
    collector.diagnostics.sort_by(|left, right| {
        (left.start, left.end, left.category).cmp(&(right.start, right.end, right.category))
    });
    collector.diagnostics
}

pub(crate) fn append_markers(program: &mut Program, diagnostics: &[CompileDiagnostic]) {
    let Program::Module(module) = program else {
        return;
    };
    let markers = diagnostics.iter().map(|diagnostic| {
        let json = serde_json::to_string(diagnostic).expect("serialize Rue compile diagnostic");
        ModuleItem::Stmt(Stmt::Expr(ExprStmt {
            span: swc_core::common::DUMMY_SP,
            expr: Box::new(Expr::Lit(Lit::Str(Str {
                span: swc_core::common::DUMMY_SP,
                value: format!("{MARKER}{json}").into(),
                raw: None,
            }))),
        }))
    });
    module.body.splice(0..0, markers);
}
