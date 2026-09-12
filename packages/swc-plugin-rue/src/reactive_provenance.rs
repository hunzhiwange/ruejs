use std::collections::{HashMap, HashSet};

use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitWith};

const MARKER_PREFIX: &str = "\0rue:reactive-provenance:";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum ReactiveKind {
    RefLike,
    Signal,
    ObjectValue,
    StateValue,
    PropsValue,
    SlotsValue,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum FactoryKind {
    RefLike,
    ToRefs,
    Signal,
    ObjectValue,
    UseState,
    I18n,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Binding {
    Unknown,
    Factory(FactoryKind),
    Value(ReactiveKind),
    RefCollection,
    SignalTuple,
    StateTuple,
    Composer,
    ScalarFunction,
}

impl Binding {
    fn code(self) -> &'static str {
        match self {
            Self::Unknown => "unknown",
            Self::Factory(FactoryKind::I18n) => "factory-i18n",
            Self::Composer => "composer",
            Self::ScalarFunction => "scalar-function",
            Self::Factory(FactoryKind::RefLike) => "factory-ref",
            Self::Factory(FactoryKind::ToRefs) => "factory-to-refs",
            Self::Factory(FactoryKind::Signal) => "factory-signal",
            Self::Factory(FactoryKind::ObjectValue) => "factory-object",
            Self::Factory(FactoryKind::UseState) => "factory-use-state",
            Self::Value(ReactiveKind::RefLike) => "value-ref",
            Self::Value(ReactiveKind::Signal) => "value-signal",
            Self::Value(ReactiveKind::ObjectValue) => "value-object",
            Self::Value(ReactiveKind::StateValue) => "value-state",
            Self::Value(ReactiveKind::PropsValue) => "value-props",
            Self::Value(ReactiveKind::SlotsValue) => "value-slots",
            Self::RefCollection => "ref-collection",
            Self::SignalTuple => "signal-tuple",
            Self::StateTuple => "state-tuple",
        }
    }

    fn from_code(code: &str) -> Option<Self> {
        Some(match code {
            "unknown" => Self::Unknown,
            "factory-i18n" => Self::Factory(FactoryKind::I18n),
            "composer" => Self::Composer,
            "scalar-function" => Self::ScalarFunction,
            "factory-ref" => Self::Factory(FactoryKind::RefLike),
            "factory-to-refs" => Self::Factory(FactoryKind::ToRefs),
            "factory-signal" => Self::Factory(FactoryKind::Signal),
            "factory-object" => Self::Factory(FactoryKind::ObjectValue),
            "factory-use-state" => Self::Factory(FactoryKind::UseState),
            "value-ref" => Self::Value(ReactiveKind::RefLike),
            "value-signal" => Self::Value(ReactiveKind::Signal),
            "value-object" => Self::Value(ReactiveKind::ObjectValue),
            "value-state" => Self::Value(ReactiveKind::StateValue),
            "value-props" => Self::Value(ReactiveKind::PropsValue),
            "value-slots" => Self::Value(ReactiveKind::SlotsValue),
            "ref-collection" => Self::RefCollection,
            "signal-tuple" => Self::SignalTuple,
            "state-tuple" => Self::StateTuple,
            _ => return None,
        })
    }
}

fn marker(name: &str, binding: Binding) -> String {
    format!("{MARKER_PREFIX}{}:{name}", binding.code())
}

pub(crate) fn signal_value_marker(name: &str) -> String {
    marker(name, Binding::Value(ReactiveKind::Signal))
}

fn binding_in_scope(scope: &HashSet<String>, name: &str) -> Option<Binding> {
    let suffix = format!(":{name}");
    scope.iter().find_map(|entry| {
        let code = entry.strip_prefix(MARKER_PREFIX)?.strip_suffix(&suffix)?;
        Binding::from_code(code)
    })
}

fn resolve_binding(scopes: &[HashSet<String>], name: &str) -> Option<Binding> {
    scopes.iter().rev().find_map(|scope| binding_in_scope(scope, name))
}

pub(crate) fn has_binding(scopes: &[HashSet<String>], name: &str) -> bool {
    resolve_binding(scopes, name).is_some()
}

pub(crate) fn reactive_kind(scopes: &[HashSet<String>], name: &str) -> Option<ReactiveKind> {
    match resolve_binding(scopes, name) {
        Some(Binding::Value(kind)) => Some(kind),
        _ => None,
    }
}

// Library return contracts are attached to resolved bindings, never callee spelling.
fn member_binding(value: Binding, name: Option<&str>) -> Binding {
    match value {
        Binding::RefCollection => Binding::Value(ReactiveKind::RefLike),
        Binding::Composer if matches!(name, Some("_" | "d" | "n" | "isLocaleLoading")) => {
            Binding::ScalarFunction
        }
        _ => Binding::Unknown,
    }
}

pub(crate) fn is_scalar_call(scopes: &[HashSet<String>], expr: &Expr) -> bool {
    let Expr::Call(call) = crate::utils::unwrap_expr(expr) else { return false };
    scalar_call_result(scopes, call)
}

pub(crate) fn scalar_call_result(scopes: &[HashSet<String>], call: &CallExpr) -> bool {
    let Callee::Expr(callee) = &call.callee else { return false };
    ScopeBuilder::new(scopes).eval_expr(callee) == Binding::ScalarFunction
}

fn factory_kind(imported: &str) -> Option<FactoryKind> {
    Some(match imported {
        "ref" | "shallowRef" | "customRef" | "toRef" | "computed" => FactoryKind::RefLike,
        "toRefs" => FactoryKind::ToRefs,
        "signal" => FactoryKind::Signal,
        "reactive" | "shallowReactive" | "readonly" | "shallowReadonly" | "propsReactive" => {
            FactoryKind::ObjectValue
        }
        "useState" | "_$compiledUseState" => FactoryKind::UseState,
        _ => return None,
    })
}

fn factory_result(factory: FactoryKind) -> Binding {
    match factory {
        FactoryKind::I18n => Binding::Composer,
        FactoryKind::RefLike => Binding::Value(ReactiveKind::RefLike),
        FactoryKind::ToRefs => Binding::RefCollection,
        FactoryKind::Signal => Binding::Value(ReactiveKind::Signal),
        FactoryKind::ObjectValue => Binding::Value(ReactiveKind::ObjectValue),
        FactoryKind::UseState => Binding::StateTuple,
    }
}

fn is_rue_source(source: &str) -> bool {
    matches!(
        source,
        "@rue-js/rue"
            | "@rue-js/rue/internal"
            | "@rue-js/rue/internal/compiler"
            | "@rue-js/rue/internal/reactive"
    )
}

struct ScopeBuilder<'a> {
    outer: &'a [HashSet<String>],
    bindings: HashMap<String, Binding>,
    setup_collections: HashMap<String, HashMap<String, Binding>>,
}

impl<'a> ScopeBuilder<'a> {
    fn new(outer: &'a [HashSet<String>]) -> Self {
        Self { outer, bindings: HashMap::new(), setup_collections: HashMap::new() }
    }

    fn resolve(&self, name: &str) -> Option<Binding> {
        self.bindings.get(name).copied().or_else(|| resolve_binding(self.outer, name))
    }

    fn bind(&mut self, name: &str, binding: Binding) {
        self.bindings.insert(name.to_string(), binding);
    }

    fn eval_expr(&self, expr: &Expr) -> Binding {
        match crate::utils::unwrap_expr(expr) {
            Expr::Ident(ident) => self.resolve(ident.sym.as_ref()).unwrap_or(Binding::Unknown),
            Expr::Call(call) => self.eval_call(call),
            Expr::Member(member) => {
                let name = match &member.prop {
                    MemberProp::Ident(name) => Some(name.sym.to_string()),
                    MemberProp::Computed(computed) => {
                        match crate::utils::unwrap_expr(&computed.expr) {
                            Expr::Lit(Lit::Str(name)) => {
                                Some(name.value.to_string_lossy().into_owned())
                            }
                            _ => None,
                        }
                    }
                    _ => None,
                };
                member_binding(self.eval_expr(&member.obj), name.as_deref())
            }
            _ => Binding::Unknown,
        }
    }

    fn eval_call(&self, call: &CallExpr) -> Binding {
        let Some(callee_name) = call_callee_ident_name(call) else {
            return Binding::Unknown;
        };
        if callee_name == "_$compiledUseState" {
            return Binding::SignalTuple;
        }
        if callee_name == "_$compiledWithHookId" {
            return call
                .args
                .get(1)
                .and_then(|runner| transparent_runner_expr(runner.expr.as_ref()))
                .map(|expr| self.eval_expr(expr))
                .unwrap_or(Binding::Unknown);
        }
        match self.resolve(callee_name) {
            Some(Binding::Factory(FactoryKind::UseState)) if use_state_signal_kind(call) => {
                Binding::SignalTuple
            }
            Some(Binding::Factory(factory)) => factory_result(factory),
            _ => Binding::Unknown,
        }
    }

    fn bind_pat(&mut self, pat: &Pat, value: Binding) {
        match pat {
            Pat::Ident(binding) => self.bind(binding.id.sym.as_ref(), value),
            Pat::Array(array) => {
                for (index, element) in array.elems.iter().enumerate() {
                    let Some(element) = element else { continue };
                    let element_value = if index == 0 && value == Binding::SignalTuple {
                        Binding::Value(ReactiveKind::Signal)
                    } else if index == 0 && value == Binding::StateTuple {
                        Binding::Value(ReactiveKind::StateValue)
                    } else {
                        Binding::Unknown
                    };
                    self.bind_pat(element, element_value);
                }
            }
            Pat::Object(object) => {
                for property in &object.props {
                    match property {
                        ObjectPatProp::Assign(property) => self.bind(
                            property.key.sym.as_ref(),
                            if property.value.is_some() && value != Binding::RefCollection {
                                Binding::Unknown
                            } else {
                                member_binding(value, Some(property.key.sym.as_ref()))
                            },
                        ),
                        ObjectPatProp::KeyValue(property) => self.bind_pat(
                            property.value.as_ref(),
                            member_binding(value, static_prop_name(&property.key).as_deref()),
                        ),
                        ObjectPatProp::Rest(property) => {
                            self.bind_pat(property.arg.as_ref(), Binding::Unknown)
                        }
                    }
                }
            }
            Pat::Assign(assign) => self.bind_pat(assign.left.as_ref(), value),
            Pat::Rest(rest) => self.bind_pat(rest.arg.as_ref(), Binding::Unknown),
            Pat::Expr(_) | Pat::Invalid(_) => {}
        }
    }

    fn bind_decl(&mut self, decl: &Decl) {
        match decl {
            Decl::Var(var) => {
                for declarator in &var.decls {
                    if let (Pat::Ident(name), Some(init)) =
                        (&declarator.name, declarator.init.as_deref())
                        && let Some(collection) = self.eval_setup_collection(init)
                    {
                        self.bind(name.id.sym.as_ref(), Binding::Unknown);
                        self.setup_collections.insert(name.id.sym.to_string(), collection);
                        continue;
                    }
                    if let (Pat::Object(pattern), Some(init)) =
                        (&declarator.name, declarator.init.as_deref())
                        && let Expr::Ident(source) = crate::utils::unwrap_expr(init)
                        && let Some(collection) =
                            self.setup_collections.get(source.sym.as_ref()).cloned()
                    {
                        self.bind_object_from_collection(pattern, &collection);
                        continue;
                    }
                    let value = declarator
                        .init
                        .as_deref()
                        .map(|init| self.eval_expr(init))
                        .unwrap_or(Binding::Unknown);
                    self.bind_pat(&declarator.name, value);
                }
            }
            Decl::Fn(function) => self.bind(function.ident.sym.as_ref(), Binding::Unknown),
            Decl::Class(class) => self.bind(class.ident.sym.as_ref(), Binding::Unknown),
            _ => {}
        }
    }

    fn eval_setup_collection(&self, expr: &Expr) -> Option<HashMap<String, Binding>> {
        let mut expr = crate::utils::unwrap_expr(expr);
        if let Expr::Call(call) = expr
            && call_callee_ident_name(call) == Some("_$compiledSetup")
        {
            let Expr::Arrow(setup) = crate::utils::unwrap_expr(call.args.get(1)?.expr.as_ref())
            else {
                return None;
            };
            return self.eval_setup_arrow_collection(setup);
        }
        if let Expr::Call(call) = expr
            && call_callee_ident_name(call) == Some("_$compiledWithHookId")
        {
            expr = transparent_runner_expr(call.args.get(1)?.expr.as_ref())?;
        }
        let Expr::Call(call) = expr else { return None };
        if call_callee_ident_name(call) != Some("useSetup") {
            return None;
        }
        let Expr::Arrow(setup) = crate::utils::unwrap_expr(call.args.first()?.expr.as_ref()) else {
            return None;
        };
        self.eval_setup_arrow_collection(setup)
    }

    fn eval_setup_arrow_collection(&self, setup: &ArrowExpr) -> Option<HashMap<String, Binding>> {
        let BlockStmtOrExpr::BlockStmt(block) = setup.body.as_ref() else {
            return None;
        };

        let mut nested = ScopeBuilder {
            outer: self.outer,
            bindings: self.bindings.clone(),
            setup_collections: HashMap::new(),
        };
        for stmt in &block.stmts {
            if let Stmt::Decl(decl) = stmt {
                nested.bind_decl(decl);
            }
        }
        for name in collect_assigned_names(&block.stmts) {
            if nested.bindings.contains_key(&name) || resolve_binding(nested.outer, &name).is_some()
            {
                nested.bindings.insert(name, Binding::Unknown);
            }
        }
        let returned = block.stmts.iter().rev().find_map(|stmt| match stmt {
            Stmt::Return(ReturnStmt { arg: Some(expr), .. }) => {
                match crate::utils::unwrap_expr(expr.as_ref()) {
                    Expr::Object(object) => Some(object),
                    _ => None,
                }
            }
            _ => None,
        })?;

        let mut collection = HashMap::new();
        for property in &returned.props {
            let PropOrSpread::Prop(property) = property else { continue };
            match property.as_ref() {
                Prop::Shorthand(ident) => {
                    collection.insert(
                        ident.sym.to_string(),
                        nested.resolve(ident.sym.as_ref()).unwrap_or(Binding::Unknown),
                    );
                }
                Prop::KeyValue(property) => {
                    let Some(name) = static_prop_name(&property.key) else { continue };
                    collection.insert(name, nested.eval_expr(property.value.as_ref()));
                }
                _ => {}
            }
        }
        Some(collection)
    }

    fn bind_object_from_collection(
        &mut self,
        pattern: &ObjectPat,
        collection: &HashMap<String, Binding>,
    ) {
        for property in &pattern.props {
            match property {
                ObjectPatProp::Assign(property) => self.bind(
                    property.key.sym.as_ref(),
                    collection.get(property.key.sym.as_ref()).copied().unwrap_or(Binding::Unknown),
                ),
                ObjectPatProp::KeyValue(property) => {
                    let value = static_prop_name(&property.key)
                        .and_then(|name| collection.get(&name).copied())
                        .unwrap_or(Binding::Unknown);
                    self.bind_pat(property.value.as_ref(), value);
                }
                ObjectPatProp::Rest(property) => {
                    self.bind_pat(property.arg.as_ref(), Binding::Unknown)
                }
            }
        }
    }

    fn finish(mut self, assigned: HashSet<String>) -> HashSet<String> {
        for name in assigned {
            if self.bindings.contains_key(&name) || resolve_binding(self.outer, &name).is_some() {
                self.bindings.insert(name, Binding::Unknown);
            }
        }
        self.bindings.into_iter().map(|(name, binding)| marker(&name, binding)).collect()
    }
}

fn use_state_signal_kind(call: &CallExpr) -> bool {
    let options_index =
        if call_callee_ident_name(call) == Some("_$compiledUseState") { 2 } else { 1 };
    let Some(options) = call.args.get(options_index) else {
        return false;
    };
    let Expr::Object(options) = crate::utils::unwrap_expr(options.expr.as_ref()) else {
        return false;
    };
    options.props.iter().any(|property| {
        let PropOrSpread::Prop(property) = property else {
            return false;
        };
        let Prop::KeyValue(property) = property.as_ref() else {
            return false;
        };
        static_prop_name(&property.key).as_deref() == Some("kind")
            && matches!(
                crate::utils::unwrap_expr(property.value.as_ref()),
                Expr::Lit(Lit::Str(value)) if value.value.to_string_lossy() == "signal"
            )
    })
}

fn static_prop_name(name: &PropName) -> Option<String> {
    Some(match name {
        PropName::Ident(ident) => ident.sym.to_string(),
        PropName::Str(value) => value.value.to_string_lossy().into_owned(),
        PropName::Num(value) => value.value.to_string(),
        PropName::BigInt(value) => value.value.to_string(),
        PropName::Computed(_) => return None,
    })
}

fn call_callee_ident_name(call: &CallExpr) -> Option<&str> {
    let Callee::Expr(callee) = &call.callee else { return None };
    let Expr::Ident(ident) = crate::utils::unwrap_expr(callee.as_ref()) else { return None };
    Some(ident.sym.as_ref())
}

fn transparent_runner_expr(expr: &Expr) -> Option<&Expr> {
    let Expr::Arrow(arrow) = crate::utils::unwrap_expr(expr) else { return None };
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

pub(crate) fn collect_module_scope(module: &Module, outer: &[HashSet<String>]) -> HashSet<String> {
    let mut builder = ScopeBuilder::new(outer);
    for item in &module.body {
        if let ModuleItem::ModuleDecl(ModuleDecl::Import(import)) = item
            && !import.type_only
            && (is_rue_source(&import.src.value.to_string_lossy())
                || import.src.value.to_string_lossy() == "@rue-js/i18n")
        {
            for specifier in &import.specifiers {
                let ImportSpecifier::Named(named) = specifier else { continue };
                if named.is_type_only {
                    continue;
                }
                let imported = match &named.imported {
                    Some(ModuleExportName::Ident(ident)) => ident.sym.to_string(),
                    Some(ModuleExportName::Str(value)) => {
                        value.value.to_string_lossy().into_owned()
                    }
                    None => named.local.sym.to_string(),
                };
                let factory = if import.src.value.to_string_lossy() == "@rue-js/i18n" {
                    (imported == "useI18n").then_some(FactoryKind::I18n)
                } else {
                    factory_kind(&imported)
                };
                if let Some(factory) = factory {
                    builder.bind(named.local.sym.as_ref(), Binding::Factory(factory));
                }
            }
        }
    }
    for item in &module.body {
        match item {
            ModuleItem::Stmt(Stmt::Decl(decl))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl { decl, .. })) => {
                builder.bind_decl(decl)
            }
            _ => {}
        }
    }
    builder.finish(collect_assigned_names(&module.body))
}

pub(crate) fn collect_stmt_scope<'a>(
    stmts: impl IntoIterator<Item = &'a Stmt>,
    outer: &[HashSet<String>],
) -> HashSet<String> {
    let stmts: Vec<&Stmt> = stmts.into_iter().collect();
    let mut builder = ScopeBuilder::new(outer);
    for stmt in &stmts {
        if let Stmt::Decl(decl) = stmt {
            builder.bind_decl(decl);
        }
    }
    let mut assigned = AssignedIdentCollector::default();
    for stmt in stmts {
        stmt.visit_with(&mut assigned);
    }
    builder.finish(assigned.names)
}

pub(crate) fn collect_parameter_scope<'a>(
    params: impl IntoIterator<Item = &'a Pat>,
) -> HashSet<String> {
    let mut builder = ScopeBuilder::new(&[]);
    for param in params {
        builder.bind_pat(param, Binding::Unknown);
    }
    builder.finish(HashSet::new())
}

pub(crate) fn collect_component_parameter_scope<'a>(
    params: impl IntoIterator<Item = &'a Pat>,
) -> HashSet<String> {
    let mut builder = ScopeBuilder::new(&[]);
    for (index, param) in params.into_iter().enumerate() {
        builder.bind_pat(
            param,
            match index {
                0 => Binding::Value(ReactiveKind::PropsValue),
                1 => Binding::Value(ReactiveKind::SlotsValue),
                _ => Binding::Unknown,
            },
        );
    }
    builder.finish(HashSet::new())
}

#[derive(Default)]
struct AssignedIdentCollector {
    names: HashSet<String>,
}

impl Visit for AssignedIdentCollector {
    fn visit_assign_expr(&mut self, assign: &AssignExpr) {
        if let AssignTarget::Simple(SimpleAssignTarget::Ident(ident)) = &assign.left {
            self.names.insert(ident.id.sym.to_string());
        }
        assign.right.visit_with(self);
    }

    fn visit_update_expr(&mut self, update: &UpdateExpr) {
        if let Expr::Ident(ident) = update.arg.as_ref() {
            self.names.insert(ident.sym.to_string());
        }
    }

    fn visit_function(&mut self, _function: &Function) {}

    fn visit_arrow_expr(&mut self, _arrow: &ArrowExpr) {}
}

fn collect_assigned_names<T>(nodes: &T) -> HashSet<String>
where
    T: VisitWith<AssignedIdentCollector>,
{
    let mut collector = AssignedIdentCollector::default();
    nodes.visit_with(&mut collector);
    collector.names
}
