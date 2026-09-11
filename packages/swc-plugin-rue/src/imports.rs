use std::collections::{HashMap, HashSet};
// 原子字符串类型：更高效的字符串存储与比较（用于标识符/字符串字面量）
use swc_core::atoms::Atom;
// SWC 常量与上下文：
// - DUMMY_SP：稳定的“占位”源码位置信息
// - SyntaxContext：语义上下文（此处统一 empty()）
use swc_core::common::{DUMMY_SP, SyntaxContext};
// SWC ECMAScript AST 节点类型集合（Module/ImportDecl/Ident 等）
use swc_core::ecma::ast::*;
// SWC 只读访问器：
// - Visit：只读遍历接口
// - VisitWith：在节点上执行只读访问器
use swc_core::ecma::visit::{Visit, VisitMut, VisitMutWith, VisitWith};

use crate::compiled_capabilities::{runtime_import_entry, should_auto_inject_helper};

/// 运行时导入收集与按需注入：
/// - `RuntimeUseCollector` 通过遍历表达式与类型引用，收集使用到的运行时符号与类型（如 `FC`）。
/// - `ensure_runtime_imports` 在模块级：
///   - 类型导入仍从 `@rue-js/rue` 注入，保持作者侧公开入口稳定；
///   - 每个值 helper 进入唯一 capability 子入口，不受模块中其他语法影响；
///   - 若对应 source 已存在 import，则仅追加缺失的 specifier；否则在顶部插入新的 import。
/// - 设计权衡：按需导入避免“全量导入”造成的未使用警告与打包体积波动，同时保证多次转换只产生一次导入。
struct RuntimeUseCollector {
    used_values: HashSet<String>,
    bound: HashSet<(Atom, SyntaxContext)>,
    used_capabilities: HashSet<String>,
    used_types: HashSet<String>,
    used_type_refs: HashSet<String>,
}

#[derive(Clone, Debug)]
struct NamedImportSpec {
    local: String,
    local_ctxt: SyntaxContext,
    imported: Option<String>,
    is_type_only: bool,
}

impl NamedImportSpec {
    fn export_name(&self) -> &str {
        self.imported.as_deref().unwrap_or(self.local.as_str())
    }
}

const FORCED_ROOT_TYPE_IMPORTS: &[&str] = &["FC"];

impl RuntimeUseCollector {
    fn new() -> Self {
        Self {
            used_values: HashSet::new(),
            bound: HashSet::new(),
            used_capabilities: HashSet::new(),
            used_types: HashSet::new(),
            used_type_refs: HashSet::new(),
        }
    }
}

#[derive(Default)]
struct RuntimeBindings(HashSet<(Atom, SyntaxContext)>);
impl Visit for RuntimeBindings {
    fn visit_binding_ident(&mut self, ident: &BindingIdent) {
        self.0.insert((ident.id.sym.clone(), ident.id.ctxt));
    }
    fn visit_fn_decl(&mut self, function: &FnDecl) {
        self.0.insert((function.ident.sym.clone(), function.ident.ctxt));
        function.visit_children_with(self);
    }
    fn visit_class_decl(&mut self, class: &ClassDecl) {
        self.0.insert((class.ident.sym.clone(), class.ident.ctxt));
        class.visit_children_with(self);
    }
    fn visit_import_decl(&mut self, decl: &ImportDecl) {
        for spec in &decl.specifiers {
            let ident = match spec {
                ImportSpecifier::Named(named) => &named.local,
                ImportSpecifier::Default(default) => &default.local,
                ImportSpecifier::Namespace(namespace) => &namespace.local,
            };
            self.0.insert((ident.sym.clone(), ident.ctxt));
        }
    }
}

impl Visit for RuntimeUseCollector {
    fn visit_jsx_element_name(&mut self, name: &JSXElementName) {
        if let JSXElementName::Ident(id) = name {
            self.used_capabilities.insert(id.sym.to_string());
        }
        name.visit_children_with(self);
    }

    fn visit_expr(&mut self, e: &Expr) {
        if let Expr::Ident(i) = e {
            let name = i.sym.as_ref();
            // This marker is consumed by row/branch lowering, then erased by
            // the final compiler pass. It is never a runtime capability.
            if name == "_$compiledWithKey" {
                return;
            }
            self.used_capabilities.insert(name.to_string());
            assert!(
                !name.starts_with("_$")
                    || self.bound.contains(&(i.sym.clone(), i.ctxt))
                    || runtime_import_entry(name).is_some(),
                "Unknown Rue runtime helper: {name}"
            );
            if should_auto_inject_helper(name) && !self.bound.contains(&(i.sym.clone(), i.ctxt)) {
                self.used_values.insert(name.to_string());
            }
        }
        e.visit_children_with(self);
    }

    fn visit_ts_type_ref(&mut self, t: &TsTypeRef) {
        if let TsEntityName::Ident(id) = &t.type_name {
            self.used_type_refs.insert(id.sym.to_string());
            if id.sym.as_ref() == "FC" {
                self.used_types.insert("FC".to_string());
            }
        }
        t.visit_children_with(self);
    }
}

fn module_export_name_to_string(name: &ModuleExportName) -> String {
    match name {
        ModuleExportName::Ident(ident) => ident.sym.to_string(),
        ModuleExportName::Str(str) => str.value.as_str().unwrap_or_default().to_string(),
    }
}

fn named_import_to_spec(spec: &ImportNamedSpecifier) -> NamedImportSpec {
    NamedImportSpec {
        local: spec.local.sym.to_string(),
        local_ctxt: spec.local.ctxt,
        imported: spec.imported.as_ref().map(module_export_name_to_string),
        is_type_only: spec.is_type_only,
    }
}

fn spec_to_named_import(spec: &NamedImportSpec) -> ImportSpecifier {
    ImportSpecifier::Named(ImportNamedSpecifier {
        span: DUMMY_SP,
        local: Ident::new(Atom::from(spec.local.as_str()), DUMMY_SP, spec.local_ctxt),
        imported: spec.imported.as_ref().map(|name| {
            ModuleExportName::Ident(Ident::new(
                Atom::from(name.as_str()),
                DUMMY_SP,
                SyntaxContext::empty(),
            ))
        }),
        is_type_only: spec.is_type_only,
    })
}

fn mark_root_type_only_imports(m: &mut Module, used_type_refs: &HashSet<String>) {
    if used_type_refs.is_empty() {
        return;
    }

    for item in &mut m.body {
        let ModuleItem::ModuleDecl(ModuleDecl::Import(decl)) = item else {
            continue;
        };
        if decl.src.value.as_str() != Some("@rue-js/rue") {
            continue;
        }

        for spec in &mut decl.specifiers {
            let ImportSpecifier::Named(named) = spec else {
                continue;
            };
            if named.is_type_only {
                continue;
            }

            let export_name = named
                .imported
                .as_ref()
                .map(module_export_name_to_string)
                .unwrap_or_else(|| named.local.sym.to_string());
            if !FORCED_ROOT_TYPE_IMPORTS.contains(&export_name.as_str()) {
                continue;
            }
            if !used_type_refs.contains(export_name.as_str())
                && !used_type_refs.contains(named.local.sym.as_ref())
            {
                continue;
            }

            named.is_type_only = true;
        }
    }
}

fn append_missing_specifiers(decl: &mut ImportDecl, specs: &[NamedImportSpec]) {
    let mut existing: HashSet<(String, Option<String>, bool)> = decl
        .specifiers
        .iter()
        .filter_map(|spec| match spec {
            ImportSpecifier::Named(named) => Some(named_import_to_spec(named)),
            _ => None,
        })
        .map(|spec| (spec.local, spec.imported, spec.is_type_only))
        .collect();

    for spec in specs {
        let key = (spec.local.clone(), spec.imported.clone(), spec.is_type_only);
        let has_local_collision = decl.specifiers.iter().any(|current| match current {
            ImportSpecifier::Named(named) => named.local.sym.as_ref() == spec.local,
            ImportSpecifier::Default(default) => default.local.sym.as_ref() == spec.local,
            ImportSpecifier::Namespace(namespace) => namespace.local.sym.as_ref() == spec.local,
        });
        if existing.contains(&key) || has_local_collision {
            continue;
        }
        decl.specifiers.push(spec_to_named_import(spec));
        existing.insert(key);
    }
}

fn insert_import(m: &mut Module, import_source: &Str, specs: Vec<NamedImportSpec>) {
    let specifiers = specs.iter().map(spec_to_named_import).collect();
    let import = ModuleItem::ModuleDecl(ModuleDecl::Import(ImportDecl {
        span: DUMMY_SP,
        specifiers,
        src: Box::new(import_source.clone()),
        type_only: false,
        with: None,
        phase: Default::default(),
    }));
    let directives = m.body.iter().take_while(|item| matches!(item,
        ModuleItem::Stmt(Stmt::Expr(ExprStmt { expr, .. })) if matches!(expr.as_ref(), Expr::Lit(Lit::Str(_)))
    )).count();
    m.body.insert(directives, import);
}

fn drain_routed_root_value_imports(m: &mut Module) -> Vec<NamedImportSpec> {
    let mut moved = Vec::new();
    let mut routed_bindings = Vec::new();
    let mut next_body = Vec::with_capacity(m.body.len());

    for item in m.body.drain(..) {
        match item {
            ModuleItem::ModuleDecl(ModuleDecl::Import(mut decl))
                if matches!(decl.src.value.as_str(), Some("@rue-js/rue" | "@rue-js/runtime")) =>
            {
                if decl.specifiers.is_empty() {
                    next_body.push(ModuleItem::ModuleDecl(ModuleDecl::Import(decl)));
                    continue;
                }
                let mut next_specifiers = Vec::with_capacity(decl.specifiers.len());
                for spec in decl.specifiers {
                    match spec {
                        ImportSpecifier::Named(named) => {
                            let mut named_spec = named_import_to_spec(&named);
                            let can_route =
                                runtime_import_entry(named_spec.export_name()).is_some();
                            assert!(
                                decl.type_only
                                    || named_spec.is_type_only
                                    || can_route
                                    || !named_spec.export_name().starts_with("_$"),
                                "Unknown Rue runtime helper: {}",
                                named_spec.export_name()
                            );
                            if !decl.type_only && !named_spec.is_type_only && can_route {
                                if named_spec.local_ctxt != SyntaxContext::empty() {
                                    routed_bindings
                                        .push((named.local.sym.clone(), named_spec.local_ctxt));
                                    named_spec.local_ctxt = SyntaxContext::empty();
                                }
                                moved.push(named_spec);
                            } else {
                                next_specifiers.push(ImportSpecifier::Named(named));
                            }
                        }
                        other => next_specifiers.push(other),
                    }
                }

                if !next_specifiers.is_empty() {
                    decl.specifiers = next_specifiers;
                    next_body.push(ModuleItem::ModuleDecl(ModuleDecl::Import(decl)));
                }
            }
            other => next_body.push(other),
        }
    }

    m.body = next_body;
    if !routed_bindings.is_empty() {
        m.visit_mut_with(&mut RoutedBindingNormalizer { bindings: routed_bindings });
    }
    moved
}

fn drain_named_runtime_subpath_imports(m: &mut Module) -> Vec<NamedImportSpec> {
    let mut moved = Vec::new();
    let mut routed_bindings = Vec::new();
    m.body.retain_mut(|item| {
        let ModuleItem::ModuleDecl(ModuleDecl::Import(decl)) = item else {
            return true;
        };
        let source = decl.src.value.as_str();
        if !source.is_some_and(|source| {
            source == "@rue-js/rue/internal" || source.starts_with("@rue-js/rue/internal/")
        }) {
            return true;
        }
        if decl.specifiers.is_empty() {
            return false;
        }
        decl.specifiers.retain(|specifier| {
            if let ImportSpecifier::Named(named) = specifier {
                let mut named_spec = named_import_to_spec(named);
                if decl.type_only || named_spec.is_type_only {
                    return true;
                }
                assert!(
                    runtime_import_entry(named_spec.export_name()).is_some(),
                    "Unknown Rue runtime helper: {}",
                    named_spec.export_name()
                );
                if named_spec.local_ctxt != SyntaxContext::empty() {
                    routed_bindings.push((named.local.sym.clone(), named_spec.local_ctxt));
                    named_spec.local_ctxt = SyntaxContext::empty();
                }
                moved.push(named_spec);
                false
            } else {
                assert!(decl.type_only, "Rue runtime entries require named helper imports");
                true
            }
        });
        !decl.specifiers.is_empty()
    });
    if !routed_bindings.is_empty() {
        m.visit_mut_with(&mut RoutedBindingNormalizer { bindings: routed_bindings });
    }
    moved
}

struct RoutedBindingNormalizer {
    bindings: Vec<(Atom, SyntaxContext)>,
}

impl VisitMut for RoutedBindingNormalizer {
    fn visit_mut_ident(&mut self, ident: &mut Ident) {
        if self.bindings.iter().any(|(sym, ctxt)| ident.sym == *sym && ident.ctxt == *ctxt) {
            ident.ctxt = SyntaxContext::empty();
        }
    }
}

fn runtime_subpath_import_locals(m: &Module, source: &str) -> HashSet<String> {
    m.body
        .iter()
        .filter_map(|item| {
            let ModuleItem::ModuleDecl(ModuleDecl::Import(decl)) = item else {
                return None;
            };
            (decl.src.value.as_str() == Some(source)).then_some(&decl.specifiers)
        })
        .flatten()
        .map(|specifier| match specifier {
            ImportSpecifier::Named(named) => named.local.sym.to_string(),
            ImportSpecifier::Default(default) => default.local.sym.to_string(),
            ImportSpecifier::Namespace(namespace) => namespace.local.sym.to_string(),
        })
        .collect()
}

fn sort_named_specs(specs: &mut [NamedImportSpec], rank: &HashMap<&str, usize>) {
    specs.sort_by(|a, b| {
        let a_rank = rank.get(a.export_name()).cloned().unwrap_or(usize::MAX);
        let b_rank = rank.get(b.export_name()).cloned().unwrap_or(usize::MAX);
        a_rank
            .cmp(&b_rank)
            .then_with(|| a.export_name().cmp(b.export_name()))
            .then_with(|| a.local.cmp(&b.local))
    });
}

fn dedupe_named_specs(specs: &mut Vec<NamedImportSpec>) {
    let mut seen = HashSet::new();
    specs
        .retain(|spec| seen.insert((spec.local.clone(), spec.imported.clone(), spec.is_type_only)));
}

/// 基于模块实际使用情况按需注入运行时导入。
/// 类型走 `@rue-js/rue`，值 helper 走固定 capability 入口。
pub fn ensure_runtime_imports(m: &mut Module) {
    crate::log::debug("rue-swc: ensure_runtime_imports start");
    let type_import_source =
        Str { span: DUMMY_SP, value: Atom::from("@rue-js/rue").into(), raw: None };
    let mut collector = RuntimeUseCollector::new();
    let mut bindings = RuntimeBindings::default();
    m.visit_with(&mut bindings);
    collector.bound = bindings.0;
    m.visit_with(&mut collector);
    if collector.used_capabilities.contains("effect")
        && collector
            .used_capabilities
            .iter()
            .any(|helper| matches!(helper.as_str(), "_$compiledRoot" | "_$reconcileKeyed"))
    {
        collector.used_values.insert("effect".to_string());
    }
    if collector.used_capabilities.contains("_$reconcileKeyed") {
        for helper in ["createOwner", "createSelector", "disposeOwner", "runWithOwner"] {
            if collector.used_capabilities.contains(helper) {
                collector.used_values.insert(helper.to_string());
            }
        }
    }
    mark_root_type_only_imports(m, &collector.used_type_refs);

    let mut moved_helper_specs = drain_routed_root_value_imports(m);
    let mut existing_runtime_specs = drain_named_runtime_subpath_imports(m);
    let mut existing_runtime_locals = runtime_subpath_import_locals(m, "@rue-js/rue/internal");
    existing_runtime_locals
        .extend(runtime_subpath_import_locals(m, "@rue-js/rue/internal/compiler"));
    existing_runtime_locals
        .extend(runtime_subpath_import_locals(m, "@rue-js/rue/internal/component"));
    existing_runtime_locals
        .extend(runtime_subpath_import_locals(m, "@rue-js/rue/internal/builtins"));
    moved_helper_specs.retain(|spec| !existing_runtime_locals.contains(&spec.local));

    let mut helper_specs: Vec<NamedImportSpec> = collector
        .used_values
        .iter()
        .filter(|name| !existing_runtime_locals.contains(name.as_str()))
        .map(|s| NamedImportSpec {
            local: s.clone(),
            local_ctxt: SyntaxContext::empty(),
            imported: None,
            is_type_only: false,
        })
        .collect();
    moved_helper_specs.append(&mut helper_specs);
    moved_helper_specs.append(&mut existing_runtime_specs);
    let mut helper_specs = moved_helper_specs;
    helper_specs.retain(|spec| {
        let imported = spec.imported.as_deref().unwrap_or(spec.local.as_str());
        !matches!(
            imported,
            "Teleport" | "Transition" | "TransitionGroup" | "KeepAlive" | "Suspense" | "Template"
        ) || collector.used_capabilities.contains(&spec.local)
    });

    let type_specs: Vec<NamedImportSpec> = collector
        .used_types
        .iter()
        .map(|s| NamedImportSpec {
            local: s.clone(),
            local_ctxt: SyntaxContext::empty(),
            imported: None,
            is_type_only: true,
        })
        .collect();

    if helper_specs.is_empty() && type_specs.is_empty() {
        crate::log::debug("rue-swc: ensure_runtime_imports none");
        return;
    }

    // 为了稳定输出顺序，按预定义序列排序值导入
    // 说明：稳定的导入顺序有助于避免测试快照抖动，并提升读者的熟悉成本
    let order: Vec<&str> = vec![
        "onBeforeCreate",
        "onCreated",
        "onBeforeMount",
        "onMounted",
        "onBeforeUpdate",
        "onUpdated",
        "onRenderTracked",
        "onBeforeUnmount",
        "onUnmounted",
        "onError",
        "getCurrentContainer",
        "Transition",
        "Template",
        "_$createComponent",
        "useApp",
        "_$createElement",
        "_$template",
        "_$createComment",
        "_$createTextNode",
        "_$setStyle",
        "_$settextContent",
        "_$createDocumentFragment",
        "_$appendChild",
        "_$insertBefore",
        "effect",
        "_$compiledDelegateEvent",
        "_$reconcileKeyed",
        "_$compiledBranch",
        "_$compiledBranchAt",
        "_$compiledComponent",
        "_$compiledCreateDocumentFragment",
        "_$compiledSpreadAttributes",
        "_$compiledOmitProps",
        "_$compiledPropsGet",
        "_$compiledPropsCall",
        "_$compiledPropsHas",
        "_$compiledPropsKeys",
        "_$compiledPropsSnapshot",
        "_$compiledRootFactory",
        "_$compiledText",
        "_$compiledSetup",
        "_$compiledMemo",
        "_$withCompiledHookScope",
        "createOwner",
        "createSelector",
        "runWithOwner",
        "disposeOwner",
        "batch",
        "onCleanup",
        "onOwnerCleanup",
        "onScopeDispose",
        "untrack",
        "setCurrentInstance",
        "getCurrentInstance",
        "withHookSlot",
        "toValue",
        "watchFn",
        "watchEffect",
        "watchSignal",
        "watchDeepSignal",
        "watchPath",
        "createResource",
        "watch",
        "useState",
        "useEffect",
        "signal",
        "ref",
        "shallowRef",
        "customRef",
        "triggerRef",
        "computed",
        "isProxy",
        "isReactive",
        "isReadonly",
        "reactive",
        "shallowReactive",
        "readonly",
        "shallowReadonly",
        "toRaw",
        "propsReactive",
        "_$createTextWrapper",
        "_$compiledShowStyle",
        "_$compiledBindUseRef",
        "_$compiledWithEventModifiers",
        "_$compiledWithNativeEvents",
        "_$compiledWithHookId",
        "_$setAttribute",
        "_$addEventListener",
        "_$setClassName",
        "_$setInnerHTML",
        "_$setValue",
        "_$setChecked",
        "_$setDisabled",
        "useSetup",
        "useRef",
        "unref",
        "setReactiveScheduling",
    ];
    let rank: HashMap<&str, usize> = order.iter().enumerate().map(|(i, s)| (*s, i)).collect();
    sort_named_specs(&mut helper_specs, &rank);
    dedupe_named_specs(&mut helper_specs);

    let mut groups = std::collections::BTreeMap::new();
    for spec in helper_specs {
        let entry = runtime_import_entry(spec.export_name())
            .unwrap_or_else(|| panic!("Unknown Rue runtime helper: {}", spec.export_name()));
        groups.entry(entry).or_insert_with(Vec::new).push(spec);
    }
    for (entry, specs) in groups.into_iter().rev() {
        let source = Str { span: DUMMY_SP, value: Atom::from(entry.source()).into(), raw: None };
        if let Some(decl) = m.body.iter_mut().find_map(|item| match item {
            ModuleItem::ModuleDecl(ModuleDecl::Import(decl))
                if decl.src.value.as_str() == Some(entry.source()) && !decl.type_only =>
            {
                Some(decl)
            }
            _ => None,
        }) {
            append_missing_specifiers(decl, &specs);
        } else {
            insert_import(m, &source, specs);
        }
    }
    if !type_specs.is_empty() {
        if let Some(decl) = m.body.iter_mut().find_map(|item| match item {
            ModuleItem::ModuleDecl(ModuleDecl::Import(decl))
                if decl.src.value.as_str() == Some("@rue-js/rue")
                    && !decl.specifiers.is_empty() =>
            {
                Some(decl)
            }
            _ => None,
        }) {
            append_missing_specifiers(decl, &type_specs);
        } else {
            insert_import(m, &type_import_source, type_specs);
        }
    }
}

/// Inject only the server renderer operations referenced by server-target output.
#[cfg(test)]
#[path = "imports_tests.rs"]
mod tests;
