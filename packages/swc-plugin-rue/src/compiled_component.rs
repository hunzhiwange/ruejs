use std::collections::{BTreeSet, HashMap, HashSet};

use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitMut, VisitMutWith, VisitWith};

#[cfg(test)]
#[path = "compiled_component_tests.rs"]
mod tests;

#[derive(Clone, Debug)]
pub(crate) struct CompiledComponentCandidate {
    name: String,
    pub(crate) props_name: String,
    pub(crate) prop_keys: Vec<String>,
    destructured_props: HashMap<String, (String, Option<Expr>)>,
    rest_prop: Option<String>,
    branching: bool,
    hook_aware: bool,
    hook_names: HashMap<String, String>,
}

fn is_regional_setup_helper(name: &str) -> bool {
    matches!(
        name,
        "useEffect"
            | "useRef"
            | "reactive"
            | "ref"
            | "shallowRef"
            | "useState"
            | "watchEffect"
            | "watch"
            | "watchSignal"
            | "watchFn"
            | "watchPath"
            | "watchDeepSignal"
            | "computed"
            | "signal"
            | "readonly"
            | "shallowReactive"
            | "useSetup"
            | "shallowReadonly"
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
}

pub(crate) type CompiledComponentCandidates = HashMap<String, CompiledComponentCandidate>;

struct StaticRootRewriter;
impl VisitMut for StaticRootRewriter {
    fn visit_mut_ident(&mut self, ident: &mut Ident) {
        if ident.sym.as_ref() == "_$compiledRoot" {
            ident.sym = "_$compiledStaticRoot".into();
        }
    }
}

#[derive(Default)]
struct RootOwnershipDetector {
    text: bool,
    other: bool,
}
impl Visit for RootOwnershipDetector {
    fn visit_ident(&mut self, ident: &Ident) {
        let name = ident.sym.as_ref();
        if name == "_$compiledText" {
            self.text = true;
        } else if (name.starts_with("_$compiled")
            && !matches!(
                name,
                "_$compiledCreateElement"
                    | "_$compiledCreateDocumentFragment"
                    | "_$compiledCreateTextNode"
                    | "_$compiledCreateComment"
                    | "_$compiledAppendChild"
            ))
            || matches!(
                name,
                "_$compiledRenderEffect"
                    | "_$compiledBranchAt"
                    | "_$mountCompiledComponent"
                    | "_$mountCompiledSlotFactory"
                    | "_$mountCompiledSlotAt"
                    | "_$reconcileKeyed"
                    | "_$reconcileKeyedSingle"
                    | "_$compiledDelegateEvent"
                    | "_$setRef"
                    | "onOwnerCleanup"
                    | "effect"
            )
        {
            self.other = true;
        }
    }
}

#[derive(Default)]
struct StaticCompiledRootPass;
impl VisitMut for StaticCompiledRootPass {
    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        call.visit_mut_children_with(self);
        let range = crate::compiled_invariants::compiled_root_range_proof(call);
        let Callee::Expr(callee) = &mut call.callee else {
            return;
        };
        let Expr::Ident(helper) = callee.as_mut() else {
            return;
        };
        if helper.sym.as_ref() != "_$compiledRoot" {
            return;
        }
        let mut detector = RootOwnershipDetector::default();
        call.args.visit_with(&mut detector);
        if !detector.other
            && (!detector.text
                || range == crate::compiled_invariants::CompiledRootRangeProof::Single)
        {
            helper.sym = if detector.text
                && range == crate::compiled_invariants::CompiledRootRangeProof::Single
            {
                "_$compiledScalarRoot".into()
            } else {
                "_$compiledStaticRoot".into()
            };
            if detector.text {
                call.args.visit_mut_with(&mut ScalarTextOnlyLowerer);
            }
        }
    }
}

struct ScalarTextOnlyLowerer;
impl VisitMut for ScalarTextOnlyLowerer {
    fn visit_mut_ident(&mut self, ident: &mut Ident) {
        if ident.sym.as_ref() == "_$compiledText" {
            ident.sym = "_$compiledScalarText".into();
        }
    }
}

pub(crate) fn rewrite_static_roots(module: &mut Module) {
    module.visit_mut_with(&mut ScalarFunctionRewriter);
    module.visit_mut_with(&mut StaticCompiledRootPass);
    let mut bridge = BridgeSignalDetector::default();
    module.visit_with(&mut bridge);
    if bridge.scalar_text {
        module.visit_mut_with(&mut BridgeSignalRewriter);
    }
    let mut list = ScalarListDetector::default();
    module.visit_with(&mut list);
    if list.single && !list.general {
        module.visit_mut_with(&mut BridgeSignalRewriter);
        module.visit_mut_with(&mut ScalarListRootPass);
    }
}

#[derive(Default)]
struct BridgeSignalDetector {
    scalar_text: bool,
}
impl Visit for BridgeSignalDetector {
    fn visit_ident(&mut self, ident: &Ident) {
        if ident.sym.as_ref() == "_$compiledScalarText" {
            self.scalar_text = true;
        }
    }
}

struct BridgeSignalRewriter;
impl VisitMut for BridgeSignalRewriter {
    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        call.visit_mut_children_with(self);
        if let Callee::Expr(callee) = &mut call.callee
            && let Expr::Ident(ident) = callee.as_mut()
            && ident.sym.as_ref() == "signal"
        {
            ident.sym = "_$compiledBridgeSignal".into();
        }
    }
}

#[derive(Default)]
struct ScalarListDetector {
    single: bool,
    general: bool,
}
impl Visit for ScalarListDetector {
    fn visit_ident(&mut self, ident: &Ident) {
        match ident.sym.as_ref() {
            "_$reconcileKeyedSingle" => self.single = true,
            "_$reconcileKeyed" | "createSelector" => self.general = true,
            _ => {}
        }
    }
}

struct ScalarListEffectLowerer;
impl VisitMut for ScalarListEffectLowerer {
    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        if matches!(&call.callee, Callee::Expr(callee)
            if matches!(crate::utils::unwrap_expr(callee), Expr::Ident(helper)
                if matches!(helper.sym.as_ref(), "_$compiledRoot" | "_$compiledScalarOwnedRoot" | "_$compiledScalarRoot" | "_$compiledStaticRoot")))
        {
            return;
        }
        call.visit_mut_children_with(self);
    }

    fn visit_mut_ident(&mut self, ident: &mut Ident) {
        ident.sym = match ident.sym.as_ref() {
            "_$compiledRenderEffect" => "_$compiledScalarEffect".into(),
            "onOwnerCleanup" => "_$compiledScalarCleanup".into(),
            _ => return,
        };
    }
}

/// Scalar list cleanup storage is only valid for roots whose public range is a
/// single node. Applying this lowering at module scope turns unrelated fragment
/// roots into scalar roots and silently drops every node after the first one.
struct ScalarListRootPass;
impl VisitMut for ScalarListRootPass {
    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        call.visit_mut_children_with(self);
        let range = crate::compiled_invariants::compiled_root_range_proof(call);
        let Callee::Expr(callee) = &mut call.callee else {
            return;
        };
        let Expr::Ident(helper) = callee.as_mut() else {
            return;
        };
        if helper.sym.as_ref() != "_$compiledRoot" {
            return;
        }

        if range != crate::compiled_invariants::CompiledRootRangeProof::Single {
            return;
        }

        helper.sym = "_$compiledScalarOwnedRoot".into();
        call.args.visit_mut_with(&mut ScalarListEffectLowerer);
    }
}

#[derive(Default)]
struct ScalarSetupDetector {
    signal: bool,
    other: bool,
}
impl Visit for ScalarSetupDetector {
    fn visit_call_expr(&mut self, call: &CallExpr) {
        if let Callee::Expr(callee) = &call.callee
            && let Expr::Ident(ident) = crate::utils::unwrap_expr(callee.as_ref())
        {
            let name = ident.sym.as_ref();
            if name == "signal" {
                self.signal = true;
            } else if is_regional_setup_helper(name) {
                self.other = true;
            }
        }
        call.visit_children_with(self);
    }
}

struct ScalarFunctionRewriter;
impl VisitMut for ScalarFunctionRewriter {
    fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
        arrow.visit_mut_children_with(self);
        let mut scalar = ScalarFunctionDetector::default();
        arrow.visit_with(&mut scalar);
        if scalar.text && scalar.signal && !scalar.other {
            arrow.visit_mut_children_with(&mut ScalarFunctionLowerer);
        }
    }

    fn visit_mut_function(&mut self, function: &mut Function) {
        function.visit_mut_children_with(self);
        let mut scalar = ScalarFunctionDetector::default();
        function.visit_with(&mut scalar);
        if scalar.text && scalar.signal && !scalar.other {
            function.visit_mut_children_with(&mut ScalarFunctionLowerer);
        }
    }
}

#[derive(Default)]
struct ScalarFunctionDetector {
    text: bool,
    signal: bool,
    other: bool,
}
impl Visit for ScalarFunctionDetector {
    fn visit_ident(&mut self, ident: &Ident) {
        let name = ident.sym.as_ref();
        match name {
            "_$compiledText" => self.text = true,
            "_$compiledRenderEffect" | "effect" | "computed" | "watch" | "watchEffect" => {
                self.other = true
            }
            _ => {}
        }
        if name.starts_with("_$compiled")
            && !matches!(
                name,
                "_$compiledText"
                    | "_$compiledCreateElement"
                    | "_$compiledCreateDocumentFragment"
                    | "_$compiledCreateTextNode"
                    | "_$compiledCreateComment"
                    | "_$compiledAppendChild"
            )
        {
            self.other = true
        }
    }
    fn visit_call_expr(&mut self, call: &CallExpr) {
        if let Callee::Expr(callee) = &call.callee
            && let Expr::Ident(ident) = crate::utils::unwrap_expr(callee.as_ref())
            && ident.sym.as_ref() == "signal"
        {
            self.signal = true;
        }
        call.visit_children_with(self);
    }
}

struct ScalarFunctionLowerer;
impl VisitMut for ScalarFunctionLowerer {
    fn visit_mut_ident(&mut self, ident: &mut Ident) {
        ident.sym = match ident.sym.as_ref() {
            "signal" => "_$compiledScalarSignal".into(),
            "_$compiledText" => "_$compiledScalarText".into(),
            "_$compiledRoot" => "_$compiledScalarRoot".into(),
            _ => return,
        };
    }
}

pub(crate) fn imported_component_names(module: &Module) -> HashSet<String> {
    module
        .body
        .iter()
        .filter_map(|item| match item {
            ModuleItem::ModuleDecl(ModuleDecl::Import(import)) if !import.type_only => Some(import),
            _ => None,
        })
        .flat_map(|import| import.specifiers.iter())
        .filter_map(|specifier| match specifier {
            ImportSpecifier::Default(default) => Some(default.local.sym.to_string()),
            ImportSpecifier::Named(named) if !named.is_type_only => {
                Some(named.local.sym.to_string())
            }
            _ => None,
        })
        .filter(|name| name.chars().next().is_some_and(|character| character.is_ascii_uppercase()))
        .collect()
}

pub(crate) fn compound_component_names(module: &Module) -> HashSet<String> {
    fn collect_var(var: &VarDecl, names: &mut HashSet<String>) {
        for declarator in &var.decls {
            let Pat::Ident(binding) = &declarator.name else {
                continue;
            };
            if !binding.id.sym.chars().next().is_some_and(char::is_uppercase) {
                continue;
            }
            let Some(Expr::Call(call)) = declarator.init.as_deref().map(crate::utils::unwrap_expr)
            else {
                continue;
            };
            let Callee::Expr(callee) = &call.callee else {
                continue;
            };
            let Expr::Member(member) = crate::utils::unwrap_expr(callee.as_ref()) else {
                continue;
            };
            let Expr::Ident(object) = crate::utils::unwrap_expr(member.obj.as_ref()) else {
                continue;
            };
            let MemberProp::Ident(property) = &member.prop else {
                continue;
            };
            let Some(first) = call.args.first() else {
                continue;
            };
            let Expr::Ident(root) = crate::utils::unwrap_expr(first.expr.as_ref()) else {
                continue;
            };
            if object.sym == "Object"
                && property.sym == "assign"
                && root.sym.chars().next().is_some_and(char::is_uppercase)
            {
                names.insert(binding.id.sym.to_string());
            }
        }
    }

    let mut names = HashSet::new();
    for item in &module.body {
        match item {
            ModuleItem::Stmt(Stmt::Decl(Decl::Var(var)))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Var(var),
                ..
            })) => collect_var(var, &mut names),
            _ => {}
        }
    }
    names
}

fn async_component_factory_names(module: &Module) -> HashSet<String> {
    let mut use_component_names = HashSet::new();
    for item in &module.body {
        let ModuleItem::ModuleDecl(ModuleDecl::Import(import)) = item else {
            continue;
        };
        if import.type_only
            || !matches!(
                import.src.value.to_string_lossy().as_ref(),
                "@rue-js/rue" | "@rue-js/rue/internal" | "@rue-js/runtime"
            )
        {
            continue;
        }
        for specifier in &import.specifiers {
            let ImportSpecifier::Named(named) = specifier else {
                continue;
            };
            let imported = named
                .imported
                .as_ref()
                .map(|name| match name {
                    ModuleExportName::Ident(id) => id.sym.to_string(),
                    ModuleExportName::Str(value) => value.value.to_string_lossy().into_owned(),
                })
                .unwrap_or_else(|| named.local.sym.to_string());
            if imported == "useComponent" {
                use_component_names.insert(named.local.sym.to_string());
            }
        }
    }

    module
        .body
        .iter()
        .filter_map(|item| match item {
            ModuleItem::Stmt(Stmt::Decl(Decl::Var(var)))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Var(var),
                ..
            })) => Some(var),
            _ => None,
        })
        .flat_map(|var| &var.decls)
        .filter_map(|declarator| {
            let Pat::Ident(binding) = &declarator.name else {
                return None;
            };
            let Some(Expr::Call(call)) = declarator.init.as_deref() else {
                return None;
            };
            let Callee::Expr(callee) = &call.callee else {
                return None;
            };
            let Expr::Ident(factory) = crate::utils::unwrap_expr(callee.as_ref()) else {
                return None;
            };
            use_component_names.contains(factory.sym.as_ref()).then(|| binding.id.sym.to_string())
        })
        .collect()
}

pub(crate) fn is_static_prop_get_call(call: &CallExpr) -> bool {
    call.args.is_empty()
        && matches!(
            &call.callee,
            Callee::Expr(callee)
                if matches!(
                    crate::utils::unwrap_expr(callee.as_ref()),
                    Expr::Member(MemberExpr {
                        obj,
                        prop: MemberProp::Ident(property),
                        ..
                    }) if property.sym.as_ref() == "get"
                        && matches!(
                            crate::utils::unwrap_expr(obj.as_ref()),
                            Expr::Ident(ident)
                                if ident.sym.as_ref().starts_with("_$rueCompiledProp")
                        )
                )
        )
}

#[derive(Default)]
struct DestructuredProps {
    bindings: HashMap<String, (String, Option<Expr>)>,
    rest: Option<String>,
}

fn prop_name_string(name: &PropName) -> Option<String> {
    match name {
        PropName::Ident(key) => Some(key.sym.to_string()),
        PropName::Str(key) => Some(key.value.to_string_lossy().into_owned()),
        _ => None,
    }
}

fn object_param_bindings(object: &ObjectPat) -> Option<DestructuredProps> {
    let mut result = DestructuredProps::default();
    for property in &object.props {
        match property {
            ObjectPatProp::Assign(assign) => {
                result.bindings.insert(
                    assign.key.sym.to_string(),
                    (assign.key.sym.to_string(), assign.value.as_deref().cloned()),
                );
            }
            ObjectPatProp::KeyValue(property) => {
                let key = prop_name_string(&property.key)?;
                let (binding, value) = match property.value.as_ref() {
                    Pat::Ident(binding) => (binding.id.sym.to_string(), None),
                    Pat::Assign(assign) => match assign.left.as_ref() {
                        Pat::Ident(binding) => {
                            (binding.id.sym.to_string(), Some(assign.right.as_ref().clone()))
                        }
                        _ => return None,
                    },
                    _ => return None,
                };
                result.bindings.insert(binding, (key, value));
            }
            ObjectPatProp::Rest(rest) => {
                let Pat::Ident(binding) = rest.arg.as_ref() else { return None };
                if result.rest.replace(binding.id.sym.to_string()).is_some() {
                    return None;
                }
            }
        }
    }
    Some(result)
}

fn component_param(params: &[Pat]) -> Option<(String, Option<DestructuredProps>)> {
    let props = match params {
        [] => return Some(("__rue_props".to_string(), Some(DestructuredProps::default()))),
        [props] => props,
        [props, Pat::Ident(_) | Pat::Assign(_)] => props,
        _ => return None,
    };
    match props {
        Pat::Ident(binding) => Some((binding.id.sym.to_string(), None)),
        Pat::Object(object) => {
            Some(("__rue_props".to_string(), Some(object_param_bindings(object)?)))
        }
        _ => None,
    }
}

fn function_param(function: &Function) -> Option<(String, Option<DestructuredProps>)> {
    let params: Vec<Pat> = function.params.iter().map(|param| param.pat.clone()).collect();
    component_param(&params)
}

fn block_render_expr(block: &BlockStmt) -> Option<&Expr> {
    let mut render = None;
    for stmt in &block.stmts {
        match stmt {
            Stmt::Return(ReturnStmt { arg: Some(expr), .. }) => {
                if render.is_some() {
                    return None;
                }
                render = Some(crate::utils::unwrap_expr(expr));
            }
            Stmt::If(_)
            | Stmt::Switch(_)
            | Stmt::For(_)
            | Stmt::ForIn(_)
            | Stmt::ForOf(_)
            | Stmt::While(_)
            | Stmt::DoWhile(_)
            | Stmt::Try(_)
            | Stmt::With(_)
            | Stmt::Labeled(_) => return None,
            _ => {}
        }
    }
    render
}

fn render_expr_is_safe(expr: &Expr) -> bool {
    if crate::utils::is_static_empty_like(expr) {
        return true;
    }
    match crate::utils::unwrap_expr(expr) {
        Expr::JSXElement(element) => jsx_element_is_safe(element),
        Expr::JSXFragment(fragment) => jsx_fragment_is_safe(fragment),
        Expr::Cond(conditional) => {
            render_expr_is_safe(conditional.cons.as_ref())
                && render_expr_is_safe(conditional.alt.as_ref())
        }
        Expr::Bin(binary) if binary.op == BinaryOp::LogicalAnd => {
            render_expr_is_safe(binary.right.as_ref())
        }
        Expr::Call(call) => {
            compiled_map_render_is_safe(call)
                || matches!(
                    &call.callee,
                    Callee::Expr(callee)
                        if matches!(
                            crate::utils::unwrap_expr(callee),
                            Expr::Ident(ident)
                                if matches!(
                                    ident.sym.as_ref(),
                                    "_$compiledRoot"
                                        | "_$compiledStaticRoot"
                                        | "_$compiledScalarRoot"
                                        | "_$compiledBranch"
                                        | "_$compiledComponent"
                                )
                        )
                )
        }
        _ => false,
    }
}

fn render_expr_requires_branch(expr: &Expr) -> bool {
    matches!(
        crate::utils::unwrap_expr(expr),
        Expr::Cond(_) | Expr::Bin(BinExpr { op: BinaryOp::LogicalAnd, .. })
    )
}

fn compiled_map_render_is_safe(call: &CallExpr) -> bool {
    let Callee::Expr(callee) = &call.callee else {
        return false;
    };
    let Expr::Member(MemberExpr { prop: MemberProp::Ident(property), .. }) =
        crate::utils::unwrap_expr(callee.as_ref())
    else {
        return false;
    };
    if property.sym.as_ref() != "map" || call.args.len() != 1 || call.args[0].spread.is_some() {
        return false;
    }
    let Expr::Arrow(callback) = crate::utils::unwrap_expr(call.args[0].expr.as_ref()) else {
        return false;
    };
    if callback.is_async || callback.is_generator {
        return false;
    }
    match callback.body.as_ref() {
        BlockStmtOrExpr::Expr(render) => render_expr_is_safe(render.as_ref()),
        BlockStmtOrExpr::BlockStmt(block) => {
            block_render_expr(block).is_some_and(render_expr_is_safe)
        }
    }
}

fn switch_render_expr(switch: &SwitchStmt) -> Option<Expr> {
    let mut representative = None;
    let mut has_default = false;
    for case in &switch.cases {
        has_default |= case.test.is_none();
        let block =
            BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts: case.cons.clone() };
        let render = branch_block_render_expr(&block)?;
        representative.get_or_insert(render);
    }
    has_default.then_some(representative?)
}

fn branch_block_render_expr(block: &BlockStmt) -> Option<Expr> {
    let mut fallthrough = None;
    for (index, stmt) in block.stmts.iter().enumerate() {
        match stmt {
            Stmt::Return(ReturnStmt { arg: Some(expr), .. }) if render_expr_is_safe(expr) => {
                if block.stmts[index + 1..].iter().any(|stmt| !matches!(stmt, Stmt::Empty(_))) {
                    return None;
                }
                return Some(crate::utils::unwrap_expr(expr).clone());
            }
            Stmt::If(if_stmt) => {
                let Some(cons) = terminal_render_expr(if_stmt.cons.as_ref()) else {
                    // An early render branch may contain ordinary setup conditionals before its
                    // terminal return (for example, incrementally building a class name). Those
                    // conditionals do not select the component's rendered shape, so keep scanning
                    // the enclosing block for the actual return instead of rejecting the whole
                    // component from compiled branch lowering.
                    if if_stmt.alt.is_none() {
                        continue;
                    }
                    return None;
                };
                if let Some(alt) = &if_stmt.alt {
                    let alt = terminal_render_expr(alt.as_ref())?;
                    return Some(Expr::Cond(CondExpr {
                        span: DUMMY_SP,
                        test: if_stmt.test.clone(),
                        cons: Box::new(cons),
                        alt: Box::new(alt),
                    }));
                }
                fallthrough = Some((if_stmt.test.as_ref().clone(), cons));
            }
            Stmt::Switch(switch) => return switch_render_expr(switch),
            Stmt::Decl(Decl::Var(_) | Decl::Fn(_)) | Stmt::Expr(_) | Stmt::Empty(_) => {}
            _ => return None,
        }
    }
    let _ = fallthrough;
    None
}

fn terminal_render_expr(stmt: &Stmt) -> Option<Expr> {
    match stmt {
        Stmt::Return(ReturnStmt { arg: Some(expr), .. }) if render_expr_is_safe(expr.as_ref()) => {
            Some(crate::utils::unwrap_expr(expr.as_ref()).clone())
        }
        Stmt::Block(block) => branch_block_render_expr(block),
        Stmt::If(if_stmt) => {
            let alt = if_stmt.alt.as_ref()?;
            let cons = terminal_render_expr(if_stmt.cons.as_ref())?;
            let alt = terminal_render_expr(alt.as_ref())?;
            Some(Expr::Cond(CondExpr {
                span: DUMMY_SP,
                test: if_stmt.test.clone(),
                cons: Box::new(cons),
                alt: Box::new(alt),
            }))
        }
        Stmt::Switch(switch) => switch_render_expr(switch),
        _ => None,
    }
}

fn fallthrough_branch_render_expr(block: &BlockStmt) -> Option<Expr> {
    if let Some(render) = branch_block_render_expr(block) {
        return Some(render);
    }
    let mut branches = Vec::new();
    let mut final_render = None;

    for (index, stmt) in block.stmts.iter().enumerate() {
        if final_render.is_some() {
            if !matches!(stmt, Stmt::Empty(_)) {
                return None;
            }
            continue;
        }
        match stmt {
            Stmt::If(if_stmt) if if_stmt.alt.is_none() => {
                branches
                    .push((if_stmt.test.as_ref().clone(), terminal_render_expr(&if_stmt.cons)?));
            }
            Stmt::Return(_) => {
                if block.stmts[index + 1..].iter().any(|stmt| !matches!(stmt, Stmt::Empty(_))) {
                    return None;
                }
                final_render = terminal_render_expr(stmt);
            }
            Stmt::Decl(Decl::Var(_) | Decl::Fn(_)) | Stmt::Expr(_) | Stmt::Empty(_) => {}
            _ => return None,
        }
    }

    if branches.is_empty() {
        return None;
    }
    let mut render = final_render?;
    for (test, cons) in branches.into_iter().rev() {
        render = Expr::Cond(CondExpr {
            span: DUMMY_SP,
            test: Box::new(test),
            cons: Box::new(cons),
            alt: Box::new(render),
        });
    }
    Some(render)
}

struct KeyCompiledBranchReturns {
    next_key: usize,
    selector_bindings: HashSet<String>,
    allow_same_key_refresh: bool,
}

#[derive(Default)]
struct ComponentReturnCounter {
    count: usize,
}

impl Visit for ComponentReturnCounter {
    fn visit_return_stmt(&mut self, return_stmt: &ReturnStmt) {
        self.count += 1;
        return_stmt.visit_children_with(self);
    }

    fn visit_function(&mut self, _: &Function) {}
    fn visit_arrow_expr(&mut self, _: &ArrowExpr) {}
}

#[derive(Default)]
struct SelectorBindingCollector {
    names: HashSet<String>,
}

impl Visit for SelectorBindingCollector {
    fn visit_return_stmt(&mut self, _: &ReturnStmt) {}
    fn visit_function(&mut self, _: &Function) {}
    fn visit_arrow_expr(&mut self, _: &ArrowExpr) {}

    fn visit_binding_ident(&mut self, binding: &BindingIdent) {
        self.names.insert(binding.id.sym.to_string());
    }

    fn visit_fn_decl(&mut self, declaration: &FnDecl) {
        self.names.insert(declaration.ident.sym.to_string());
    }
}

impl VisitMut for KeyCompiledBranchReturns {
    fn visit_mut_function(&mut self, _: &mut Function) {}

    fn visit_mut_arrow_expr(&mut self, _: &mut ArrowExpr) {}

    fn visit_mut_return_stmt(&mut self, return_stmt: &mut ReturnStmt) {
        let Some(mut result) = return_stmt.arg.take() else {
            return;
        };
        if crate::utils::is_static_empty_like(result.as_ref()) {
            result = Box::new(Expr::JSXFragment(JSXFragment {
                span: DUMMY_SP,
                opening: JSXOpeningFragment { span: DUMMY_SP },
                closing: JSXClosingFragment { span: DUMMY_SP },
                children: vec![],
            }));
        }
        let key =
            Expr::Lit(Lit::Num(Number { span: DUMMY_SP, value: self.next_key as f64, raw: None }));
        self.next_key += 1;
        // Reactive props are read by the mounted block itself. Recreate a same-key
        // branch only when its closure captures a selector-local snapshot.
        let mut captures =
            UnavailableReferenceDetector { unavailable: &self.selector_bindings, found: false };
        result.visit_with(&mut captures);
        return_stmt.arg = Some(Box::new(if captures.found && self.allow_same_key_refresh {
            crate::element_expr::refreshing_compiled_branch_case(key, *result)
        } else {
            crate::element_expr::compiled_branch_case(key, *result)
        }));
    }
}

fn arrow_render_expr(arrow: &ArrowExpr) -> Option<&Expr> {
    if arrow.is_async || arrow.is_generator {
        return None;
    }
    match arrow.body.as_ref() {
        BlockStmtOrExpr::Expr(expr) => Some(crate::utils::unwrap_expr(expr)),
        BlockStmtOrExpr::BlockStmt(block) => block_render_expr(block),
    }
}

fn function_render_expr(function: &Function) -> Option<&Expr> {
    if function.is_async || function.is_generator {
        return None;
    }
    block_render_expr(function.body.as_ref()?)
}

fn jsx_element_is_safe(element: &JSXElement) -> bool {
    element.children.iter().all(|child| match child {
        JSXElementChild::JSXElement(child) => jsx_element_is_safe(child),
        JSXElementChild::JSXFragment(fragment) => jsx_fragment_is_safe(fragment),
        JSXElementChild::JSXExprContainer(container) => match &container.expr {
            JSXExpr::JSXEmptyExpr(_) => true,
            JSXExpr::Expr(expr) => !contains_jsx(expr) || render_expr_is_safe(expr),
        },
        JSXElementChild::JSXSpreadChild(_) => false,
        JSXElementChild::JSXText(_) => true,
    })
}

fn jsx_fragment_is_safe(fragment: &JSXFragment) -> bool {
    fragment.children.iter().all(|child| match child {
        JSXElementChild::JSXElement(child) => jsx_element_is_safe(child),
        JSXElementChild::JSXFragment(fragment) => jsx_fragment_is_safe(fragment),
        JSXElementChild::JSXExprContainer(container) => match &container.expr {
            JSXExpr::JSXEmptyExpr(_) => true,
            JSXExpr::Expr(expr) => !contains_jsx(expr) || render_expr_is_safe(expr),
        },
        JSXElementChild::JSXSpreadChild(_) => false,
        JSXElementChild::JSXText(_) => true,
    })
}

#[derive(Default)]
struct JsxDetector {
    found: bool,
}

impl Visit for JsxDetector {
    fn visit_jsx_element(&mut self, _: &JSXElement) {
        self.found = true;
    }

    fn visit_jsx_fragment(&mut self, _: &JSXFragment) {
        self.found = true;
    }
}

fn contains_jsx(expr: &Expr) -> bool {
    let mut detector = JsxDetector::default();
    expr.visit_with(&mut detector);
    detector.found
}

#[derive(Default)]
struct PropsUsageAnalyzer {
    props_name: String,
    keys: BTreeSet<String>,
    invalid: bool,
    consuming_props_object: bool,
    shadowed: bool,
    uses_vapor: bool,
    control_depth: usize,
    nested_function_depth: usize,
    uses_compiled_hooks: bool,
    hook_names: HashMap<String, String>,
}

impl PropsUsageAnalyzer {
    fn new(props_name: String, hook_names: HashMap<String, String>) -> Self {
        Self { props_name, hook_names, ..Self::default() }
    }
}

impl Visit for PropsUsageAnalyzer {
    fn visit_var_declarator(&mut self, declarator: &VarDeclarator) {
        if matches!(&declarator.name, Pat::Object(_))
            && declarator.init.as_deref().is_some_and(|init| {
                matches!(
                    crate::utils::unwrap_expr(init),
                    Expr::Ident(props) if props.sym.as_ref() == self.props_name
                )
            })
        {
            declarator.name.visit_with(self);
            return;
        }
        declarator.visit_children_with(self);
    }

    fn visit_spread_element(&mut self, spread: &SpreadElement) {
        if matches!(
            crate::utils::unwrap_expr(spread.expr.as_ref()),
            Expr::Ident(props) if props.sym.as_ref() == self.props_name
        ) {
            let previous = self.consuming_props_object;
            self.consuming_props_object = true;
            spread.expr.visit_with(self);
            self.consuming_props_object = previous;
            return;
        }
        spread.visit_children_with(self);
    }

    fn visit_binding_ident(&mut self, binding: &BindingIdent) {
        if binding.id.sym.as_ref() == self.props_name {
            self.shadowed = true;
        }
    }

    fn visit_call_expr(&mut self, call: &CallExpr) {
        let is_has_own_property_call = matches!(
            &call.callee,
            Callee::Expr(callee)
                if matches!(
                    crate::utils::unwrap_expr(callee.as_ref()),
                    Expr::Member(MemberExpr {
                        obj,
                        prop: MemberProp::Ident(method),
                        ..
                    }) if method.sym == *"call"
                        && matches!(
                            crate::utils::unwrap_expr(obj.as_ref()),
                            Expr::Member(MemberExpr {
                                prop: MemberProp::Ident(method),
                                ..
                            }) if method.sym == *"hasOwnProperty"
                        )
                )
        );
        if is_has_own_property_call {
            call.callee.visit_with(self);
            for argument in &call.args {
                let consumes_props = matches!(
                    crate::utils::unwrap_expr(argument.expr.as_ref()),
                    Expr::Ident(props) if props.sym.as_ref() == self.props_name
                );
                let previous = self.consuming_props_object;
                self.consuming_props_object |= consumes_props;
                argument.visit_with(self);
                self.consuming_props_object = previous;
            }
            return;
        }
        if let Callee::Expr(callee) = &call.callee
            && let Expr::Ident(ident) = crate::utils::unwrap_expr(callee.as_ref())
        {
            let name = ident.sym.as_ref();
            if matches!(
                name,
                "_$compiledPropsGet"
                    | "_$compiledPropsHas"
                    | "_$compiledPropsKeys"
                    | "_$compiledPropsSnapshot"
            ) && let Some(first) = call.args.first()
                && matches!(
                    crate::utils::unwrap_expr(first.expr.as_ref()),
                    Expr::Ident(props) if props.sym.as_ref() == self.props_name
                )
            {
                if name == "_$compiledPropsGet"
                    && let Some(key) = call.args.get(1)
                    && let Expr::Lit(Lit::Str(key)) = crate::utils::unwrap_expr(key.expr.as_ref())
                {
                    self.keys.insert(key.value.to_string_lossy().into_owned());
                }

                let previous = self.consuming_props_object;
                self.consuming_props_object = true;
                first.expr.visit_with(self);
                self.consuming_props_object = previous;
                for argument in call.args.iter().skip(1) {
                    argument.visit_with(self);
                }
                return;
            }
            let is_regional_helper =
                is_regional_setup_helper(name) || self.hook_names.contains_key(name);
            if is_regional_helper && (self.control_depth > 0 || self.nested_function_depth > 0) {
                self.uses_vapor = true;
            } else if is_regional_helper {
                self.uses_compiled_hooks = true;
            } else if crate::compiled_capabilities::requires_component_context(name)
                && !is_regional_setup_helper(name)
            {
                self.uses_vapor = true;
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

    fn visit_function(&mut self, function: &Function) {
        self.nested_function_depth += 1;
        function.visit_children_with(self);
        self.nested_function_depth -= 1;
    }

    fn visit_arrow_expr(&mut self, arrow: &ArrowExpr) {
        self.nested_function_depth += 1;
        arrow.visit_children_with(self);
        self.nested_function_depth -= 1;
    }

    fn visit_member_expr(&mut self, member: &MemberExpr) {
        if let Expr::Ident(object) = crate::utils::unwrap_expr(member.obj.as_ref())
            && object.sym.as_ref() == self.props_name
        {
            match &member.prop {
                MemberProp::Ident(prop) => {
                    self.keys.insert(prop.sym.to_string());
                    let previous = self.consuming_props_object;
                    self.consuming_props_object = true;
                    member.obj.visit_with(self);
                    self.consuming_props_object = previous;
                    return;
                }
                _ => {
                    self.invalid = true;
                    return;
                }
            }
        }
        member.visit_children_with(self);
    }

    fn visit_ident(&mut self, ident: &Ident) {
        if ident.sym.as_ref() == self.props_name && !self.consuming_props_object {
            self.invalid = true;
        }
    }

    fn visit_assign_expr(&mut self, assign: &AssignExpr) {
        if let AssignTarget::Simple(SimpleAssignTarget::Member(member)) = &assign.left
            && let Expr::Ident(object) = crate::utils::unwrap_expr(member.obj.as_ref())
            && object.sym.as_ref() == self.props_name
        {
            self.invalid = true;
            return;
        }
        assign.visit_children_with(self);
    }

    fn visit_update_expr(&mut self, update: &UpdateExpr) {
        if let Expr::Member(member) = crate::utils::unwrap_expr(update.arg.as_ref())
            && let Expr::Ident(object) = crate::utils::unwrap_expr(member.obj.as_ref())
            && object.sym.as_ref() == self.props_name
        {
            self.invalid = true;
            return;
        }
        update.visit_children_with(self);
    }
}

fn analyze_candidate(
    name: String,
    props_name: String,
    destructured_props: Option<DestructuredProps>,
    body: &impl VisitWith<PropsUsageAnalyzer>,
    render: &Expr,
    branching: bool,
    _render_reactive: bool,
    hook_names: &HashMap<String, String>,
) -> Option<CompiledComponentCandidate> {
    if !render_expr_is_safe(render) {
        return None;
    }

    let mut usage = PropsUsageAnalyzer::new(props_name.clone(), hook_names.clone());
    body.visit_with(&mut usage);
    if let Some(bindings) = &destructured_props {
        usage.keys.extend(bindings.bindings.values().map(|(key, _)| key.clone()));
    }
    if usage.invalid || usage.shadowed {
        return None;
    }

    Some(CompiledComponentCandidate {
        name,
        props_name,
        prop_keys: usage.keys.into_iter().collect(),
        rest_prop: destructured_props.as_ref().and_then(|props| props.rest.clone()),
        destructured_props: destructured_props.map(|props| props.bindings).unwrap_or_default(),
        branching,
        hook_aware: usage.uses_compiled_hooks,
        hook_names: hook_names.clone(),
    })
}

pub(crate) fn default_exported_identifier_names(module: &Module) -> HashSet<String> {
    module
        .body
        .iter()
        .flat_map(|item| match item {
            ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultExpr(export)) => {
                match crate::utils::unwrap_expr(export.expr.as_ref()) {
                    Expr::Ident(ident) => vec![ident.sym.to_string()],
                    _ => Vec::new(),
                }
            }
            ModuleItem::ModuleDecl(ModuleDecl::ExportNamed(export)) => export
                .specifiers
                .iter()
                .filter_map(|specifier| {
                    let ExportSpecifier::Named(named) = specifier else { return None };
                    let exported = named.exported.as_ref()?;
                    let is_default = match exported {
                        ModuleExportName::Ident(ident) => ident.sym == *"default",
                        ModuleExportName::Str(value) => value.value == *"default",
                    };
                    if !is_default {
                        return None;
                    }
                    match &named.orig {
                        ModuleExportName::Ident(ident) => Some(ident.sym.to_string()),
                        ModuleExportName::Str(_) => None,
                    }
                })
                .collect(),
            _ => Vec::new(),
        })
        .collect()
}

pub(crate) fn default_exported_component_spans(module: &Module) -> Vec<swc_core::common::Span> {
    let component_names = function_component_names(&Program::Module(module.clone()));
    let exported = default_exported_identifier_names(module)
        .into_iter()
        .filter(|name| component_names.contains(name))
        .collect::<HashSet<_>>();
    let mut spans = Vec::new();
    for item in &module.body {
        match item {
            ModuleItem::Stmt(Stmt::Decl(Decl::Fn(decl)))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Fn(decl),
                ..
            })) if exported.contains(decl.ident.sym.as_ref()) => spans.push(decl.function.span),
            ModuleItem::Stmt(Stmt::Decl(Decl::Var(var)))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Var(var),
                ..
            })) => {
                for decl in &var.decls {
                    if let Pat::Ident(binding) = &decl.name
                        && exported.contains(binding.id.sym.as_ref())
                        && let Some(Expr::Arrow(arrow)) = decl.init.as_deref()
                    {
                        spans.push(arrow.span);
                    }
                }
            }
            _ => {}
        }
    }
    spans
}

/// JSX lowering turns a source-level Provider child factory into a render plan.
/// Plan contexts already call `children(target)`, so keeping the source factory
/// around would return the plan instead of executing it.
pub(crate) fn flatten_provider_child_plans(module: &mut Module) {
    struct FlattenProviderChildPlans;

    fn is_provider_call(call: &CallExpr) -> bool {
        let Callee::Expr(callee) = &call.callee else { return false };
        let Expr::Member(member) = crate::utils::unwrap_expr(callee) else { return false };
        matches!(&member.prop, MemberProp::Ident(prop) if prop.sym == *"Provider")
    }

    fn is_children_key(key: &PropName) -> bool {
        matches!(key, PropName::Ident(name) if name.sym == *"children")
            || matches!(key, PropName::Str(name) if name.value == *"children")
    }

    fn lowered_plan(expr: &Expr) -> Option<Box<Expr>> {
        let Expr::Arrow(factory) = crate::utils::unwrap_expr(expr) else { return None };
        if !factory.params.is_empty() {
            return None;
        }
        let BlockStmtOrExpr::Expr(body) = factory.body.as_ref() else { return None };
        let plan = crate::utils::unwrap_expr(body);
        let is_plan = matches!(plan, Expr::Arrow(_) | Expr::Fn(_))
            || matches!(plan, Expr::Call(call)
                if matches!(&call.callee, Callee::Expr(callee)
                    if matches!(crate::utils::unwrap_expr(callee), Expr::Ident(helper)
                        if matches!(helper.sym.as_ref(), "_$compiledRoot" | "_$compiledScalarRoot" | "_$compiledStaticRoot" | "_$compiledScalarOwnedRoot"))));
        is_plan.then(|| Box::new(plan.clone()))
    }

    impl VisitMut for FlattenProviderChildPlans {
        fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
            call.visit_mut_children_with(self);
            if !is_provider_call(call) {
                return;
            }
            let Some(first) = call.args.first_mut() else { return };
            let Expr::Object(props) = first.expr.as_mut() else {
                return;
            };
            for prop in &mut props.props {
                let PropOrSpread::Prop(prop) = prop else { continue };
                let Prop::KeyValue(prop) = prop.as_mut() else { continue };
                if is_children_key(&prop.key)
                    && let Some(plan) = lowered_plan(prop.value.as_ref())
                {
                    prop.value = plan;
                }
            }
        }
    }

    module.visit_mut_with(&mut FlattenProviderChildPlans);
}

pub(crate) fn analyze_module(module: &Module) -> CompiledComponentCandidates {
    let mut candidates = HashMap::new();
    let mut imported = HashSet::new();
    let hook_names = imported_hook_names(module);
    let component_names = function_component_names(&Program::Module(module.clone()));
    for item in &module.body {
        if let ModuleItem::ModuleDecl(ModuleDecl::Import(import)) = item {
            for specifier in &import.specifiers {
                let local = match specifier {
                    ImportSpecifier::Named(named) => &named.local,
                    ImportSpecifier::Default(default) => &default.local,
                    ImportSpecifier::Namespace(namespace) => &namespace.local,
                };
                imported.insert(local.sym.to_string());
            }
        }
    }

    for item in &module.body {
        match item {
            ModuleItem::Stmt(Stmt::Decl(Decl::Fn(decl)))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Fn(decl),
                ..
            })) => {
                let name = decl.ident.sym.to_string();
                if imported.contains(&name) || decl.function.is_async || decl.function.is_generator
                {
                    continue;
                }
                if !component_names.contains(&name) {
                    continue;
                }
                let Some((props_name, destructured_props)) = function_param(&decl.function) else {
                    continue;
                };
                if destructured_props
                    .as_ref()
                    .is_some_and(|props| !props.bindings.is_empty() || props.rest.is_some())
                    && !component_names.contains(&name)
                {
                    continue;
                }
                let Some(body) = decl.function.body.as_ref() else {
                    continue;
                };
                let render = function_render_expr(&decl.function)
                    .map(|render| (render.clone(), render_expr_requires_branch(render)))
                    .or_else(|| fallthrough_branch_render_expr(body).map(|render| (render, true)));
                let Some((render, branching)) = render else {
                    continue;
                };
                if let Some(candidate) = analyze_candidate(
                    name.clone(),
                    props_name,
                    destructured_props,
                    body,
                    &render,
                    branching,
                    crate::pre::block_requires_custom_composable_render_effect(body),
                    &hook_names,
                ) {
                    candidates.insert(name, candidate);
                }
            }
            ModuleItem::Stmt(Stmt::Decl(Decl::Var(var)))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Var(var),
                ..
            })) if var.decls.len() == 1 => {
                let declarator = &var.decls[0];
                let Pat::Ident(binding) = &declarator.name else {
                    continue;
                };
                let name = binding.id.sym.to_string();
                let Some(Expr::Arrow(arrow)) = declarator.init.as_deref() else {
                    continue;
                };
                if arrow.is_async || arrow.is_generator {
                    continue;
                }
                if !component_names.contains(&name) {
                    continue;
                }
                let Some((props_name, destructured_props)) = component_param(&arrow.params) else {
                    continue;
                };
                if destructured_props
                    .as_ref()
                    .is_some_and(|props| !props.bindings.is_empty() || props.rest.is_some())
                    && !component_names.contains(&name)
                {
                    continue;
                }
                let render = arrow_render_expr(arrow)
                    .map(|render| (render.clone(), render_expr_requires_branch(render)))
                    .or_else(|| match arrow.body.as_ref() {
                        BlockStmtOrExpr::BlockStmt(block) => {
                            fallthrough_branch_render_expr(block).map(|render| (render, true))
                        }
                        BlockStmtOrExpr::Expr(_) => None,
                    });
                let Some((render, branching)) = render else {
                    continue;
                };
                let render_reactive = matches!(
                    arrow.body.as_ref(),
                    BlockStmtOrExpr::BlockStmt(block)
                        if crate::pre::block_requires_custom_composable_render_effect(block)
                );
                if let Some(candidate) = analyze_candidate(
                    name.clone(),
                    props_name,
                    destructured_props,
                    arrow.body.as_ref(),
                    &render,
                    branching,
                    render_reactive,
                    &hook_names,
                ) {
                    candidates.insert(name, candidate);
                }
            }
            _ => {}
        }
    }
    candidates
}

#[derive(Default)]
struct UsedIdentCollector {
    names: HashSet<String>,
}

impl Visit for UsedIdentCollector {
    fn visit_ident(&mut self, ident: &Ident) {
        self.names.insert(ident.sym.to_string());
    }
}

struct PropsSlotRewriter<'a> {
    props_name: &'a str,
    slots: &'a HashMap<String, Ident>,
    destructured_props: &'a HashMap<String, (String, Option<Expr>)>,
    rest_prop: Option<&'a str>,
    rest_slot: Option<&'a Ident>,
    shadowed: HashSet<String>,
}

fn collect_pattern_names(pat: &Pat, names: &mut HashSet<String>) {
    match pat {
        Pat::Ident(binding) => {
            names.insert(binding.id.sym.to_string());
        }
        Pat::Array(array) => {
            for element in array.elems.iter().flatten() {
                collect_pattern_names(element, names);
            }
        }
        Pat::Object(object) => {
            for property in &object.props {
                match property {
                    ObjectPatProp::Assign(assign) => {
                        names.insert(assign.key.sym.to_string());
                    }
                    ObjectPatProp::KeyValue(property) => {
                        collect_pattern_names(property.value.as_ref(), names)
                    }
                    ObjectPatProp::Rest(rest) => collect_pattern_names(rest.arg.as_ref(), names),
                }
            }
        }
        Pat::Assign(assign) => collect_pattern_names(assign.left.as_ref(), names),
        Pat::Rest(rest) => collect_pattern_names(rest.arg.as_ref(), names),
        _ => {}
    }
}

impl VisitMut for PropsSlotRewriter<'_> {
    fn visit_mut_block_stmt(&mut self, block: &mut BlockStmt) {
        let previous = self.shadowed.clone();
        for stmt in &block.stmts {
            self.shadowed.extend(declared_names(stmt));
        }
        block.visit_mut_children_with(self);
        self.shadowed = previous;
    }

    fn visit_mut_function(&mut self, function: &mut Function) {
        let previous = self.shadowed.clone();
        for parameter in &function.params {
            collect_pattern_names(&parameter.pat, &mut self.shadowed);
        }
        function.visit_mut_children_with(self);
        self.shadowed = previous;
    }

    fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
        let previous = self.shadowed.clone();
        for parameter in &arrow.params {
            collect_pattern_names(parameter, &mut self.shadowed);
        }
        arrow.visit_mut_children_with(self);
        self.shadowed = previous;
    }

    fn visit_mut_prop(&mut self, prop: &mut Prop) {
        if let Prop::Shorthand(ident) = prop
            && !self.shadowed.contains(ident.sym.as_ref())
            && self.rest_prop.is_some_and(|rest| ident.sym.as_ref() == rest)
            && let Some(slot) = self.rest_slot
        {
            *prop = Prop::KeyValue(KeyValueProp {
                key: PropName::Ident(IdentName { span: ident.span, sym: ident.sym.clone() }),
                value: Box::new(crate::emit::call_member(slot.clone(), "get", vec![])),
            });
            return;
        }
        if let Prop::Shorthand(ident) = prop
            && !self.shadowed.contains(ident.sym.as_ref())
            && let Some((key, default)) = self.destructured_props.get(ident.sym.as_ref())
            && let Some(slot) = self.slots.get(key)
        {
            let read = crate::emit::call_member(slot.clone(), "get", vec![]);
            let value = if let Some(default) = default {
                Expr::Cond(CondExpr {
                    span: DUMMY_SP,
                    test: Box::new(Expr::Bin(BinExpr {
                        span: DUMMY_SP,
                        op: BinaryOp::EqEqEq,
                        left: Box::new(read.clone()),
                        right: Box::new(Expr::Unary(UnaryExpr {
                            span: DUMMY_SP,
                            op: UnaryOp::Void,
                            arg: Box::new(Expr::Lit(Lit::Num(Number {
                                span: DUMMY_SP,
                                value: 0.0,
                                raw: None,
                            }))),
                        })),
                    })),
                    cons: Box::new(default.clone()),
                    alt: Box::new(read),
                })
            } else {
                read
            };
            *prop = Prop::KeyValue(KeyValueProp {
                key: PropName::Ident(IdentName { span: ident.span, sym: ident.sym.clone() }),
                value: Box::new(value),
            });
            return;
        }
        prop.visit_mut_children_with(self);
    }

    fn visit_mut_jsx_attr(&mut self, attr: &mut JSXAttr) {
        let is_event = matches!(
            &attr.name,
            JSXAttrName::Ident(name)
                if name.sym.as_ref().strip_prefix("on").is_some_and(|suffix| {
                    suffix.chars().next().is_some_and(char::is_uppercase)
                })
        );
        if is_event
            && let Some(JSXAttrValue::JSXExprContainer(container)) = &mut attr.value
            && let JSXExpr::Expr(expr) = &mut container.expr
            && let Expr::Member(member) = crate::utils::unwrap_expr(expr.as_ref())
            && let Expr::Ident(object) = crate::utils::unwrap_expr(member.obj.as_ref())
            && object.sym.as_ref() == self.props_name
            && !self.shadowed.contains(object.sym.as_ref())
            && let MemberProp::Ident(prop) = &member.prop
            && let Some(slot) = self.slots.get(prop.sym.as_ref())
        {
            // Component callbacks may carry multiple arguments (for example id and patch).
            let event = crate::emit::ident("$args");
            let handler = crate::emit::call_member(slot.clone(), "get", vec![]);
            let invoke = Expr::Call(CallExpr {
                span: DUMMY_SP,
                callee: Callee::Expr(Box::new(handler)),
                args: vec![ExprOrSpread {
                    spread: Some(DUMMY_SP),
                    expr: Box::new(Expr::Ident(event.clone())),
                }],
                type_args: None,
                ctxt: SyntaxContext::empty(),
            });
            **expr = Expr::Arrow(ArrowExpr {
                span: DUMMY_SP,
                params: vec![Pat::Rest(RestPat {
                    span: DUMMY_SP,
                    dot3_token: DUMMY_SP,
                    arg: Box::new(Pat::Ident(BindingIdent { id: event, type_ann: None })),
                    type_ann: None,
                })],
                body: Box::new(BlockStmtOrExpr::Expr(Box::new(invoke))),
                is_async: false,
                is_generator: false,
                type_params: None,
                return_type: None,
                ctxt: SyntaxContext::empty(),
            });
            return;
        }
        attr.visit_mut_children_with(self);
    }

    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if let Expr::Ident(ident) = expr
            && !self.shadowed.contains(ident.sym.as_ref())
            && self.rest_prop.is_some_and(|rest| ident.sym.as_ref() == rest)
            && let Some(slot) = self.rest_slot
        {
            *expr = crate::emit::call_member(slot.clone(), "get", vec![]);
            return;
        }
        if let Expr::Member(member) = crate::utils::unwrap_expr(expr)
            && let Expr::Ident(object) = crate::utils::unwrap_expr(member.obj.as_ref())
            && object.sym.as_ref() == self.props_name
            && !self.shadowed.contains(object.sym.as_ref())
            && let MemberProp::Ident(prop) = &member.prop
            && let Some(slot) = self.slots.get(prop.sym.as_ref())
        {
            *expr = crate::emit::call_member(slot.clone(), "get", vec![]);
            return;
        }
        if let Expr::Ident(ident) = expr
            && !self.shadowed.contains(ident.sym.as_ref())
            && let Some((key, default)) = self.destructured_props.get(ident.sym.as_ref())
            && let Some(slot) = self.slots.get(key)
        {
            let read = crate::emit::call_member(slot.clone(), "get", vec![]);
            *expr = if let Some(default) = default {
                Expr::Cond(CondExpr {
                    span: DUMMY_SP,
                    test: Box::new(Expr::Bin(BinExpr {
                        span: DUMMY_SP,
                        op: BinaryOp::EqEqEq,
                        left: Box::new(read.clone()),
                        right: Box::new(Expr::Unary(UnaryExpr {
                            span: DUMMY_SP,
                            op: UnaryOp::Void,
                            arg: Box::new(Expr::Lit(Lit::Num(Number {
                                span: DUMMY_SP,
                                value: 0.0,
                                raw: None,
                            }))),
                        })),
                    })),
                    cons: Box::new(default.clone()),
                    alt: Box::new(read),
                })
            } else {
                read
            };
            return;
        }
        expr.visit_mut_children_with(self);
    }
}

fn unique_ident(base: &str, used: &mut HashSet<String>) -> Ident {
    if used.insert(base.to_string()) {
        return crate::emit::ident(base);
    }
    let mut suffix = 1;
    loop {
        let name = format!("{base}{suffix}");
        if used.insert(name.clone()) {
            return crate::emit::ident(&name);
        }
        suffix += 1;
    }
}

fn prop_member(object: Ident, key: &str) -> Expr {
    Expr::Member(MemberExpr {
        span: DUMMY_SP,
        obj: Box::new(Expr::Ident(object)),
        prop: MemberProp::Ident(IdentName { span: DUMMY_SP, sym: key.into() }),
    })
}

pub(crate) fn omitted_props_expr(props: Ident, prop_keys: &[String]) -> Expr {
    let keys = Expr::Array(ArrayLit {
        span: DUMMY_SP,
        elems: prop_keys
            .iter()
            .map(|key| {
                Some(ExprOrSpread { spread: None, expr: Box::new(crate::emit::string_expr(key)) })
            })
            .collect(),
    });
    crate::emit::call_ident("_$compiledOmitProps", vec![Expr::Ident(props), keys])
}

fn updater_expr(
    next_props: Ident,
    prop_keys: &[String],
    slots: &HashMap<String, Ident>,
    rest_slot: Option<&Ident>,
) -> Expr {
    let mut setters = prop_keys
        .iter()
        .map(|key| {
            let set = crate::emit::call_member(
                slots[key].clone(),
                "set",
                vec![prop_member(next_props.clone(), key)],
            );
            Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(set) })
        })
        .collect::<Vec<_>>();
    if let Some(rest_slot) = rest_slot {
        let set = crate::emit::call_member(
            rest_slot.clone(),
            "set",
            vec![omitted_props_expr(next_props.clone(), prop_keys)],
        );
        setters.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(set) }));
    }
    let batch_body = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            stmts: setters,
        })),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    let batch = crate::emit::call_ident("_$compiledBatch", vec![batch_body]);
    Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![Pat::Ident(BindingIdent { id: next_props, type_ann: None })],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(batch))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    })
}

fn wrap_render_expr(render: Expr, updater: Expr, props_name: Option<&str>) -> Expr {
    let Some(props_name) = props_name else {
        let empty = matches!(&updater, Expr::Arrow(arrow)
            if matches!(arrow.body.as_ref(), BlockStmtOrExpr::Expr(expr)
                if matches!(expr.as_ref(), Expr::Call(call)
                    if call.args.first().is_some_and(|arg| matches!(arg.expr.as_ref(), Expr::Arrow(batch)
                        if matches!(batch.body.as_ref(), BlockStmtOrExpr::BlockStmt(body) if body.stmts.is_empty()))))));
        return if empty {
            render
        } else {
            crate::emit::call_ident("_$withCompiledPropsUpdater", vec![render, updater])
        };
    };
    let read_props = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(Expr::Ident(crate::emit::ident(
            props_name,
        ))))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    crate::emit::call_ident("_$withCompiledPropsUpdater", vec![render, updater, read_props])
}

fn declared_names(stmt: &Stmt) -> Vec<String> {
    fn collect_pat(pat: &Pat, names: &mut Vec<String>) {
        match pat {
            Pat::Ident(binding) => names.push(binding.id.sym.to_string()),
            Pat::Array(array) => {
                for element in array.elems.iter().flatten() {
                    collect_pat(element, names);
                }
            }
            Pat::Object(object) => {
                for property in &object.props {
                    match property {
                        ObjectPatProp::KeyValue(property) => {
                            collect_pat(property.value.as_ref(), names)
                        }
                        ObjectPatProp::Assign(property) => names.push(property.key.sym.to_string()),
                        ObjectPatProp::Rest(property) => collect_pat(property.arg.as_ref(), names),
                    }
                }
            }
            Pat::Assign(assign) => collect_pat(assign.left.as_ref(), names),
            Pat::Rest(rest) => collect_pat(rest.arg.as_ref(), names),
            _ => {}
        }
    }

    let mut names = Vec::new();
    match stmt {
        Stmt::Decl(Decl::Var(var)) => {
            for declarator in &var.decls {
                collect_pat(&declarator.name, &mut names);
            }
        }
        Stmt::Decl(Decl::Fn(function)) => names.push(function.ident.sym.to_string()),
        _ => {}
    }
    names
}

fn remove_collected(region: Vec<Stmt>, collected: &[Stmt]) -> Vec<Stmt> {
    let mut pending = collected.to_vec();
    region
        .into_iter()
        .filter(|stmt| {
            let Some(index) = pending.iter().position(|candidate| candidate == stmt) else {
                return true;
            };
            pending.remove(index);
            false
        })
        .collect()
}

struct UnavailableReferenceDetector<'a> {
    unavailable: &'a HashSet<String>,
    found: bool,
}

impl Visit for UnavailableReferenceDetector<'_> {
    fn visit_ident(&mut self, ident: &Ident) {
        if self.unavailable.contains(ident.sym.as_ref()) {
            self.found = true;
        }
    }
}

fn references_unavailable(stmt: &Stmt, unavailable: &HashSet<String>) -> bool {
    let mut detector = UnavailableReferenceDetector { unavailable, found: false };
    stmt.visit_with(&mut detector);
    detector.found
}

fn binding_kinds(stmts: &[Stmt]) -> (Vec<String>, Vec<String>) {
    let mut names_const = Vec::new();
    let mut names_let = Vec::new();
    for stmt in stmts {
        match stmt {
            Stmt::Decl(Decl::Var(var)) => {
                let names = declared_names(stmt);
                if var.kind == VarDeclKind::Const {
                    names_const.extend(names);
                } else {
                    names_let.extend(names);
                }
            }
            Stmt::Decl(Decl::Fn(_)) => names_const.extend(declared_names(stmt)),
            _ => {}
        }
    }
    (names_const, names_let)
}

fn declares_object_rest(stmt: &Stmt) -> bool {
    fn pattern_has_object_rest(pattern: &Pat) -> bool {
        match pattern {
            Pat::Object(object) => object.props.iter().any(|property| match property {
                ObjectPatProp::Rest(_) => true,
                ObjectPatProp::KeyValue(property) => pattern_has_object_rest(&property.value),
                ObjectPatProp::Assign(_) => false,
            }),
            Pat::Array(array) => {
                array.elems.iter().flatten().any(|element| pattern_has_object_rest(element))
            }
            Pat::Assign(assign) => pattern_has_object_rest(&assign.left),
            Pat::Rest(rest) => pattern_has_object_rest(&rest.arg),
            _ => false,
        }
    }

    matches!(stmt, Stmt::Decl(Decl::Var(var)) if var.decls.iter().any(|declarator| pattern_has_object_rest(&declarator.name)))
}

fn stable_setup_effect_expr(stmt: &Stmt) -> Option<&ExprStmt> {
    let Stmt::Expr(expression) = stmt else {
        return None;
    };
    let Expr::Call(call) = crate::utils::unwrap_expr(expression.expr.as_ref()) else {
        return None;
    };
    let Callee::Expr(callee) = &call.callee else {
        return None;
    };
    let Expr::Ident(ident) = crate::utils::unwrap_expr(callee.as_ref()) else {
        return None;
    };
    is_regional_setup_helper(ident.sym.as_ref()).then_some(expression).filter(|_| {
        matches!(
            ident.sym.as_ref(),
            "watch"
                | "watchEffect"
                | "watchSignal"
                | "watchFn"
                | "watchPath"
                | "watchDeepSignal"
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
    })
}

fn cache_stable_setup_effects(
    stmts: &mut [Stmt],
    component_name: &str,
    region_index: usize,
) -> bool {
    let mut wrapped = 0usize;
    for stmt in stmts {
        let Some(expression) = stable_setup_effect_expr(stmt).cloned() else {
            continue;
        };
        let slot = format!("{component_name}:setup-effect:{region_index}:{wrapped}");
        wrapped += 1;
        *stmt = Stmt::Expr(ExprStmt {
            span: expression.span,
            expr: Box::new(Expr::Call(CallExpr {
                span: DUMMY_SP,
                ctxt: SyntaxContext::empty(),
                callee: Callee::Expr(Box::new(Expr::Ident(Ident::new_no_ctxt(
                    "_$compiledSetup".into(),
                    DUMMY_SP,
                )))),
                args: vec![
                    ExprOrSpread {
                        spread: None,
                        expr: Box::new(Expr::Lit(Lit::Str(Str {
                            span: DUMMY_SP,
                            value: slot.into(),
                            raw: None,
                        }))),
                    },
                    ExprOrSpread {
                        spread: None,
                        expr: Box::new(Expr::Arrow(ArrowExpr {
                            span: DUMMY_SP,
                            ctxt: SyntaxContext::empty(),
                            params: vec![],
                            body: Box::new(BlockStmtOrExpr::Expr(expression.expr)),
                            is_async: false,
                            is_generator: false,
                            type_params: None,
                            return_type: None,
                        })),
                    },
                ],
                type_args: None,
            })),
        });
    }
    wrapped > 0
}

struct StableSetupValueInliner<'a> {
    values: &'a HashMap<String, Expr>,
}

impl VisitMut for StableSetupValueInliner<'_> {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if let Expr::Ident(ident) = expr
            && let Some(value) = self.values.get(ident.sym.as_ref())
        {
            *expr = value.clone();
            return;
        }
        expr.visit_mut_children_with(self);
    }
}

fn is_reactive_snapshot_declaration(stmt: &Stmt) -> bool {
    let Stmt::Decl(Decl::Var(var)) = stmt else {
        return false;
    };
    var.decls.iter().any(|declarator| {
        let Some(init) = declarator.init.as_deref() else {
            return false;
        };
        matches!(
            crate::utils::unwrap_expr(init),
            Expr::Call(CallExpr {
                callee: Callee::Expr(callee),
                args,
                ..
            }) if args.is_empty()
                && matches!(
                    crate::utils::unwrap_expr(callee),
                    Expr::Member(MemberExpr {
                        prop: MemberProp::Ident(property),
                        ..
                    }) if property.sym == *"get"
                )
        )
    })
}

fn record_stable_setup_values(stmts: &[Stmt], values: &mut HashMap<String, Expr>) {
    let shadows = HashSet::new();
    for stmt in stmts {
        let Stmt::Decl(Decl::Var(var)) = stmt else {
            continue;
        };
        if var.kind != VarDeclKind::Const {
            continue;
        }
        for declarator in &var.decls {
            let (Pat::Ident(binding), Some(init)) = (&declarator.name, declarator.init.as_deref())
            else {
                continue;
            };
            if !is_reactive_snapshot_declaration(stmt)
                && crate::vapor::is_compiled_scalar_expr_with_shadows(init, &shadows)
            {
                values.insert(binding.id.sym.to_string(), init.clone());
            }
        }
    }
}

fn lower_setup_region(
    region: Vec<Stmt>,
    component_name: &str,
    region_index: usize,
    used_names: &mut HashSet<String>,
    available: &mut HashSet<String>,
    unavailable: &mut HashSet<String>,
    stable_values: &mut HashMap<String, Expr>,
    has_setup_regions: &mut bool,
    has_stable_setup_effects: &mut bool,
) -> Vec<Stmt> {
    let region_block =
        BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts: region.clone() };
    let (mut collected, _, _, _) =
        crate::pre::collect_setup_region(&region_block, available, unavailable);
    collected.retain(|stmt| !is_reactive_snapshot_declaration(stmt));
    // Rest bindings carry the source resolver context used by JSX spread references. The setup
    // binder currently reconstructs collected names from strings, which can detach that context
    // when another component in the same module uses the same rest name. Keep the destructure in
    // its original branch scope so hygiene renames the declaration and every reference together.
    collected.retain(|stmt| !declares_object_rest(stmt));

    // Snapshot state must be created once even when its initializer reads live inputs. Keep the
    // already-hoistable declaration chain it depends on (for example computed bounds feeding a
    // default-value ref), while leaving unrelated props-derived render values in the branch.
    let mut setup_once = collected
        .iter()
        .filter(|stmt| crate::pre::stmt_is_snapshot_initializer(stmt))
        .cloned()
        .collect::<Vec<_>>();
    loop {
        let mut added = false;
        for stmt in &region {
            if setup_once.contains(stmt) {
                continue;
            }
            let names = declared_names(stmt).into_iter().collect::<HashSet<_>>();
            if !names.is_empty()
                && setup_once.iter().any(|consumer| references_unavailable(consumer, &names))
            {
                setup_once.push(stmt.clone());
                added = true;
            }
        }
        if !added {
            break;
        }
    }
    // Snapshot dependencies can be excluded by the general collector when they read live props.
    // They still belong to the same one-time initialization chain: leaving them in the branch
    // would move the setup call ahead of their declarations and enter the temporal dead zone.
    // Merge the complete dependency closure back in source order before applying the live-local
    // filtering below.
    for stmt in &region {
        if setup_once.contains(stmt) && !collected.contains(stmt) {
            collected.push(stmt.clone());
        }
    }
    collected.sort_by_key(|stmt| {
        region.iter().position(|candidate| candidate == stmt).unwrap_or(region.len())
    });

    // The shared collector intentionally permits helper closures. For compiled regions, reject
    // any candidate that closes over a live prop-derived local, including transitive closures,
    // so cached setup values never retain the first branch-effect snapshot.
    loop {
        let remaining = remove_collected(region.clone(), &collected);
        let mut live_names = unavailable.clone();
        for stmt in &remaining {
            live_names.extend(declared_names(stmt));
        }
        let before = collected.len();
        collected
            .retain(|stmt| setup_once.contains(stmt) || !references_unavailable(stmt, &live_names));
        if collected.len() == before {
            break;
        }
    }

    let mut remaining = remove_collected(region, &collected);
    if cache_stable_setup_effects(&mut remaining, component_name, region_index) {
        *has_setup_regions = true;
        *has_stable_setup_effects = true;
    }
    for stmt in &collected {
        available.extend(declared_names(stmt));
    }
    for stmt in &remaining {
        unavailable.extend(declared_names(stmt));
    }
    if collected.is_empty() {
        return remaining;
    }

    *has_setup_regions = true;
    record_stable_setup_values(&collected, stable_values);
    let setup_ident = unique_ident(&format!("_$rueCompiledSetup{region_index}"), used_names);
    let (names_const, names_let) = binding_kinds(&collected);
    let mut lowered = crate::pre::build_compiled_setup_with_binds(
        &format!("{component_name}:setup-region:{region_index}"),
        setup_ident,
        names_const,
        names_let,
        collected,
    );
    lowered.extend(remaining);
    lowered
}

struct CompiledHookLowerer<'a> {
    component_name: &'a str,
    next_slot: usize,
    hook_names: &'a HashMap<String, String>,
}

impl VisitMut for CompiledHookLowerer<'_> {
    fn visit_mut_function(&mut self, _: &mut Function) {}

    fn visit_mut_arrow_expr(&mut self, _: &mut ArrowExpr) {}

    // Conditional/repeated calls cannot be assigned a static owner slot. Leave
    // their source identifiers intact so finalize_hooks reports the diagnostic.
    fn visit_mut_if_stmt(&mut self, _: &mut IfStmt) {}
    fn visit_mut_switch_stmt(&mut self, _: &mut SwitchStmt) {}
    fn visit_mut_for_stmt(&mut self, _: &mut ForStmt) {}
    fn visit_mut_for_in_stmt(&mut self, _: &mut ForInStmt) {}
    fn visit_mut_for_of_stmt(&mut self, _: &mut ForOfStmt) {}
    fn visit_mut_while_stmt(&mut self, _: &mut WhileStmt) {}
    fn visit_mut_do_while_stmt(&mut self, _: &mut DoWhileStmt) {}
    fn visit_mut_cond_expr(&mut self, _: &mut CondExpr) {}
    fn visit_mut_catch_clause(&mut self, _: &mut CatchClause) {}
    fn visit_mut_bin_expr(&mut self, expr: &mut BinExpr) {
        if !matches!(
            expr.op,
            BinaryOp::LogicalAnd | BinaryOp::LogicalOr | BinaryOp::NullishCoalescing
        ) {
            expr.visit_mut_children_with(self);
        }
    }

    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        call.visit_mut_children_with(self);
        let Callee::Expr(callee) = &call.callee else {
            return;
        };
        let Expr::Ident(ident) = crate::utils::unwrap_expr(callee.as_ref()) else {
            return;
        };
        let helper = match ident.sym.as_ref() {
            name if self.hook_names.contains_key(name) => match self.hook_names[name].as_str() {
                "useState" => "_$compiledUseState",
                "useActionState" => "_$compiledUseActionState",
                "useEffect" => "_$compiledUseEffect",
                "useRef" => "_$compiledUseRef",
                "useSetup" => "_$compiledUseSetup",
                _ => unreachable!(),
            },
            _ => return,
        };
        let slot = format!("{}:hook:{}", self.component_name, self.next_slot);
        self.next_slot += 1;
        if helper == "_$compiledUseEffect" {
            if let Some(deps) = call.args.get_mut(1) {
                deps.expr = Box::new(Expr::Arrow(ArrowExpr {
                    span: DUMMY_SP,
                    ctxt: SyntaxContext::empty(),
                    params: vec![],
                    body: Box::new(BlockStmtOrExpr::Expr(deps.expr.clone())),
                    is_async: false,
                    is_generator: false,
                    type_params: None,
                    return_type: None,
                }));
            }
        }
        call.callee = Callee::Expr(Box::new(Expr::Ident(crate::emit::ident(helper))));
        call.args.insert(
            0,
            ExprOrSpread { spread: None, expr: Box::new(crate::emit::string_expr(&slot)) },
        );
    }
}

struct ReactStateBindingCollector<'a> {
    used_names: &'a mut HashSet<String>,
    bindings: HashMap<String, Ident>,
}

impl VisitMut for ReactStateBindingCollector<'_> {
    fn visit_mut_function(&mut self, _: &mut Function) {}

    fn visit_mut_arrow_expr(&mut self, _: &mut ArrowExpr) {}

    fn visit_mut_var_declarator(&mut self, declarator: &mut VarDeclarator) {
        let Some(init) = declarator.init.as_deref() else { return };
        let Expr::Call(call) = crate::utils::unwrap_expr(init) else { return };
        let Callee::Expr(callee) = &call.callee else { return };
        let Expr::Ident(callee) = crate::utils::unwrap_expr(callee.as_ref()) else { return };
        if !matches!(callee.sym.as_ref(), "_$compiledUseState" | "_$compiledUseActionState") {
            return;
        }
        let Pat::Array(pattern) = &mut declarator.name else { return };
        let indices: &[usize] =
            if callee.sym.as_ref() == "_$compiledUseActionState" { &[0, 2] } else { &[0] };
        for &index in indices {
            let Some(Some(Pat::Ident(binding))) = pattern.elems.get_mut(index) else { continue };
            let source_name = binding.id.sym.to_string();
            let hidden = unique_ident("_$state", self.used_names);
            binding.id = hidden.clone();
            self.bindings.insert(source_name, hidden);
        }
    }
}

struct ReactStateUsageRewriter<'a> {
    suspend_path: bool,
    bindings: &'a HashMap<String, Ident>,
    scope_stack: Vec<HashSet<String>>,
}

impl ReactStateUsageRewriter<'_> {
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
        let Expr::Ident(ident) = expr else { return false };
        let name = ident.sym.as_ref();
        let Some(hidden) = self.bindings.get(name) else { return false };
        if self.is_shadowed(name) {
            return false;
        }
        *expr = crate::emit::call_member(hidden.clone(), "get", vec![]);
        true
    }
}

impl VisitMut for ReactStateUsageRewriter<'_> {
    fn visit_mut_assign_expr(&mut self, assign: &mut AssignExpr) {
        let saved = self.suspend_path;
        self.suspend_path = true;
        assign.left.visit_mut_with(self);
        self.suspend_path = saved;
        assign.right.visit_mut_with(self);
    }

    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        // Keep the original receiver for method calls; mutator lowering is a later pass.
        let saved = self.suspend_path;
        self.suspend_path = true;
        call.callee.visit_mut_with(self);
        self.suspend_path = saved;
        call.args.visit_mut_with(self);
    }

    fn visit_mut_opt_call(&mut self, call: &mut OptCall) {
        let saved = self.suspend_path;
        self.suspend_path = true;
        call.callee.visit_mut_with(self);
        self.suspend_path = saved;
        call.args.visit_mut_with(self);
    }

    fn visit_mut_unary_expr(&mut self, unary: &mut UnaryExpr) {
        let saved = self.suspend_path;
        if unary.op == UnaryOp::Delete {
            self.suspend_path = true;
        }
        unary.arg.visit_mut_with(self);
        self.suspend_path = saved;
    }
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if let Some(write) = crate::state_path::lower_write(expr, |name| {
            if self.is_shadowed(name) { None } else { self.bindings.get(name).cloned() }
        }) {
            *expr = write;
            expr.visit_mut_children_with(self);
            return;
        }
        if !self.suspend_path
            && let Some(read) = crate::state_path::lower_read(expr, |name| {
                if self.is_shadowed(name) { None } else { self.bindings.get(name).cloned() }
            })
        {
            *expr = read;
            return;
        }
        if self.rewrite_ident_expr(expr) {
            return;
        }
        expr.visit_mut_children_with(self);
    }

    fn visit_mut_prop(&mut self, prop: &mut Prop) {
        if let Prop::Shorthand(ident) = prop {
            let name = ident.sym.as_ref();
            if let Some(hidden) = self.bindings.get(name)
                && !self.is_shadowed(name)
            {
                *prop = Prop::KeyValue(KeyValueProp {
                    key: PropName::Ident(ident.clone().into()),
                    value: Box::new(crate::emit::call_member(hidden.clone(), "get", vec![])),
                });
                return;
            }
        }
        prop.visit_mut_children_with(self);
    }

    fn visit_mut_block_stmt(&mut self, block: &mut BlockStmt) {
        let names = block.stmts.iter().flat_map(declared_names).collect();
        self.push_scope(names);
        block.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_function(&mut self, function: &mut Function) {
        let mut names = HashSet::new();
        for parameter in &function.params {
            collect_pattern_names(&parameter.pat, &mut names);
        }
        if let Some(body) = &function.body {
            names.extend(body.stmts.iter().flat_map(declared_names));
        }
        self.push_scope(names);
        function.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
        let mut names = HashSet::new();
        for parameter in &arrow.params {
            collect_pattern_names(parameter, &mut names);
        }
        if let BlockStmtOrExpr::BlockStmt(block) = arrow.body.as_ref() {
            names.extend(block.stmts.iter().flat_map(declared_names));
        }
        self.push_scope(names);
        arrow.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_catch_clause(&mut self, catch: &mut CatchClause) {
        let mut names = HashSet::new();
        if let Some(parameter) = &catch.param {
            collect_pattern_names(parameter, &mut names);
        }
        self.push_scope(names);
        catch.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_for_stmt(&mut self, for_stmt: &mut ForStmt) {
        let mut names = HashSet::new();
        if let Some(VarDeclOrExpr::VarDecl(var)) = &for_stmt.init {
            for declarator in &var.decls {
                collect_pattern_names(&declarator.name, &mut names);
            }
        }
        self.push_scope(names);
        for_stmt.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_for_in_stmt(&mut self, for_in: &mut ForInStmt) {
        let mut names = HashSet::new();
        if let ForHead::VarDecl(var) = &for_in.left {
            for declarator in &var.decls {
                collect_pattern_names(&declarator.name, &mut names);
            }
        }
        self.push_scope(names);
        for_in.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_for_of_stmt(&mut self, for_of: &mut ForOfStmt) {
        let mut names = HashSet::new();
        if let ForHead::VarDecl(var) = &for_of.left {
            for declarator in &var.decls {
                collect_pattern_names(&declarator.name, &mut names);
            }
        }
        self.push_scope(names);
        for_of.visit_mut_children_with(self);
        self.pop_scope();
    }

    fn visit_mut_update_expr(&mut self, update: &mut UpdateExpr) {
        if matches!(
            update.arg.as_ref(),
            Expr::Ident(ident) if self.bindings.contains_key(ident.sym.as_ref())
        ) {
            return;
        }
        let saved = self.suspend_path;
        self.suspend_path = true;
        update.visit_mut_children_with(self);
        self.suspend_path = saved;
    }
}

fn lower_branch_render(
    block: &mut BlockStmt,
    candidate: &CompiledComponentCandidate,
    used_names: &mut HashSet<String>,
    prop_slots: &HashMap<String, Ident>,
) -> Option<bool> {
    if fallthrough_branch_render_expr(block).is_none() {
        return None;
    }

    fn empty_render_expr() -> Expr {
        Expr::JSXFragment(JSXFragment {
            span: DUMMY_SP,
            opening: JSXOpeningFragment { span: DUMMY_SP },
            closing: JSXClosingFragment { span: DUMMY_SP },
            children: vec![],
        })
    }

    fn expand_render_return(stmt: Stmt) -> Vec<Stmt> {
        let Stmt::Return(ReturnStmt { span, arg: Some(arg) }) = stmt else {
            return vec![stmt];
        };
        match *arg {
            Expr::Cond(cond) => vec![
                Stmt::If(IfStmt {
                    span: DUMMY_SP,
                    test: cond.test,
                    cons: Box::new(Stmt::Return(ReturnStmt { span, arg: Some(cond.cons) })),
                    alt: None,
                }),
                Stmt::Return(ReturnStmt { span, arg: Some(cond.alt) }),
            ],
            Expr::Bin(binary) if binary.op == BinaryOp::LogicalAnd => vec![
                Stmt::If(IfStmt {
                    span: DUMMY_SP,
                    test: binary.left,
                    cons: Box::new(Stmt::Return(ReturnStmt { span, arg: Some(binary.right) })),
                    alt: None,
                }),
                Stmt::Return(ReturnStmt { span, arg: Some(Box::new(empty_render_expr())) }),
            ],
            other => vec![Stmt::Return(ReturnStmt { span, arg: Some(Box::new(other)) })],
        }
    }

    let source = std::mem::take(&mut block.stmts)
        .into_iter()
        .flat_map(expand_render_return)
        .collect::<Vec<_>>();
    let mut branch_stmts = Vec::with_capacity(source.len());
    let mut region = Vec::new();
    let mut region_index = 0;
    let mut available = HashSet::new();
    let mut stable_values = HashMap::new();
    let mut has_setup_regions = false;
    let mut has_stable_setup_effects = false;
    let mut unavailable =
        prop_slots.values().map(|ident| ident.sym.to_string()).collect::<HashSet<_>>();

    for mut stmt in source {
        let is_boundary = matches!(stmt, Stmt::If(_) | Stmt::Switch(_) | Stmt::Return(_));
        if !is_boundary {
            region.push(stmt);
            continue;
        }
        for region_stmt in &mut region {
            region_stmt.visit_mut_with(&mut StableSetupValueInliner { values: &stable_values });
        }
        branch_stmts.extend(lower_setup_region(
            std::mem::take(&mut region),
            &candidate.name,
            region_index,
            used_names,
            &mut available,
            &mut unavailable,
            &mut stable_values,
            &mut has_setup_regions,
            &mut has_stable_setup_effects,
        ));
        region_index += 1;
        stmt.visit_mut_with(&mut StableSetupValueInliner { values: &stable_values });
        branch_stmts.push(stmt);
    }

    let mut bindings = SelectorBindingCollector::default();
    branch_stmts.visit_with(&mut bindings);
    let mut returns = ComponentReturnCounter::default();
    for stmt in &branch_stmts {
        stmt.visit_with(&mut returns);
    }
    branch_stmts.visit_mut_with(&mut KeyCompiledBranchReturns {
        next_key: 0,
        selector_bindings: bindings.names,
        // A selector with one terminal return cannot change branch identity. Its returned
        // compiled block already owns fine-grained bindings, so refreshing it merely replaces
        // stable DOM (and drops input focus/composition state) whenever setup reads invalidate
        // the selector.
        allow_same_key_refresh: returns.count > 1 && !has_stable_setup_effects,
    });

    let factory = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            stmts: branch_stmts,
        })),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    let branch = crate::emit::call_ident("_$compiledBranch", vec![factory]);
    block.stmts.push(Stmt::Return(ReturnStmt { span: DUMMY_SP, arg: Some(Box::new(branch)) }));
    Some(has_setup_regions)
}

fn rewrite_block(block: &mut BlockStmt, candidate: &CompiledComponentCandidate) {
    let mut scalar_detector = ScalarSetupDetector::default();
    block.visit_with(&mut scalar_detector);
    let scalar_only = scalar_detector.signal && !scalar_detector.other && !candidate.branching;
    let mut used = UsedIdentCollector::default();
    block.visit_with(&mut used);
    let mut slots = HashMap::new();
    for (index, key) in candidate.prop_keys.iter().enumerate() {
        let base = if key == "children" {
            "_$rueCompiledSlot".to_string()
        } else {
            format!("_$rueCompiledProp{index}")
        };
        slots.insert(key.clone(), unique_ident(&base, &mut used.names));
    }
    let next_props = unique_ident("_$rueNextProps", &mut used.names);
    let rest_slot =
        candidate.rest_prop.as_ref().map(|_| unique_ident("_$rueCompiledRest", &mut used.names));

    block.visit_mut_with(&mut PropsSlotRewriter {
        props_name: &candidate.props_name,
        slots: &slots,
        destructured_props: &candidate.destructured_props,
        rest_prop: candidate.rest_prop.as_deref(),
        rest_slot: rest_slot.as_ref(),
        shadowed: HashSet::new(),
    });

    block.visit_mut_with(&mut CompiledHookLowerer {
        component_name: &candidate.name,
        next_slot: 0,
        hook_names: &candidate.hook_names,
    });

    let mut state_collector =
        ReactStateBindingCollector { used_names: &mut used.names, bindings: HashMap::new() };
    block.visit_mut_children_with(&mut state_collector);
    if !state_collector.bindings.is_empty() {
        block.visit_mut_children_with(&mut ReactStateUsageRewriter {
            bindings: &state_collector.bindings,
            suspend_path: false,
            scope_stack: Vec::new(),
        });
    }

    if candidate.branching {
        let Some(has_setup_regions) =
            lower_branch_render(block, candidate, &mut used.names, &slots)
        else {
            return;
        };
        let _ = has_setup_regions;
    }

    let updater = updater_expr(next_props, &candidate.prop_keys, &slots, rest_slot.as_ref());
    for stmt in &mut block.stmts {
        if let Stmt::Return(ReturnStmt { arg: Some(render), .. }) = stmt {
            if candidate.name.chars().next().is_some_and(char::is_uppercase)
                && crate::utils::is_static_empty_like(render)
            {
                **render = Expr::JSXFragment(JSXFragment {
                    span: DUMMY_SP,
                    opening: JSXOpeningFragment { span: DUMMY_SP },
                    closing: JSXClosingFragment { span: DUMMY_SP },
                    children: vec![],
                });
            }
            let mut wrapped = wrap_render_expr(
                render.as_ref().clone(),
                updater.clone(),
                (!candidate.prop_keys.is_empty() || candidate.rest_prop.is_some())
                    .then_some(candidate.props_name.as_str()),
            );
            if !candidate.hook_aware {
                wrapped.visit_mut_with(&mut StaticRootRewriter);
            }
            **render = if candidate.hook_aware && !scalar_only {
                let factory = Expr::Arrow(ArrowExpr {
                    span: DUMMY_SP,
                    params: vec![],
                    body: Box::new(BlockStmtOrExpr::Expr(Box::new(wrapped))),
                    is_async: false,
                    is_generator: false,
                    type_params: None,
                    return_type: None,
                    ctxt: SyntaxContext::empty(),
                });
                crate::emit::call_ident("_$withCompiledHookScope", vec![factory])
            } else {
                wrapped
            };
            break;
        }
    }

    let props = crate::emit::ident(&candidate.props_name);
    let mut slot_declarations = candidate
        .prop_keys
        .iter()
        .map(|key| {
            crate::emit::const_decl(
                slots[key].clone(),
                crate::emit::call_ident("_$compiledSignal", vec![prop_member(props.clone(), key)]),
            )
        })
        .collect::<Vec<_>>();
    if let Some(rest_slot) = rest_slot {
        slot_declarations.push(crate::emit::const_decl(
            rest_slot,
            crate::emit::call_ident(
                "_$compiledSignal",
                vec![omitted_props_expr(props.clone(), &candidate.prop_keys)],
            ),
        ));
    }
    slot_declarations.append(&mut block.stmts);
    block.stmts = slot_declarations;
}

fn rewrite_arrow(arrow: &mut ArrowExpr, candidate: &CompiledComponentCandidate) {
    if !candidate.destructured_props.is_empty() {
        let props = Pat::Ident(BindingIdent {
            id: crate::emit::ident(&candidate.props_name),
            type_ann: None,
        });
        if arrow.params.is_empty() {
            arrow.params.push(props);
        } else {
            arrow.params[0] = props;
        }
    }
    if let BlockStmtOrExpr::Expr(render) = arrow.body.as_ref() {
        arrow.body = Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            stmts: vec![Stmt::Return(ReturnStmt { span: DUMMY_SP, arg: Some(render.clone()) })],
        }));
    }
    if let BlockStmtOrExpr::BlockStmt(block) = arrow.body.as_mut() {
        rewrite_block(block, candidate);
    }
}

fn rewrite_function(function: &mut Function, candidate: &CompiledComponentCandidate) {
    if !candidate.destructured_props.is_empty() {
        let props = Param {
            span: DUMMY_SP,
            decorators: vec![],
            pat: Pat::Ident(BindingIdent {
                id: crate::emit::ident(&candidate.props_name),
                type_ann: None,
            }),
        };
        if function.params.is_empty() {
            function.params.push(props);
        } else {
            function.params[0] = props;
        }
    }
    if let Some(block) = &mut function.body {
        rewrite_block(block, candidate);
    }
}

pub(crate) fn transform_module(module: &mut Module, candidates: &CompiledComponentCandidates) {
    if candidates.is_empty() {
        return;
    }
    for item in &mut module.body {
        match item {
            ModuleItem::Stmt(Stmt::Decl(Decl::Fn(decl)))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Fn(decl),
                ..
            })) => {
                if let Some(candidate) = candidates.get(decl.ident.sym.as_ref()) {
                    rewrite_function(&mut decl.function, candidate);
                }
            }
            ModuleItem::Stmt(Stmt::Decl(Decl::Var(var)))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Var(var),
                ..
            })) => {
                for declarator in &mut var.decls {
                    let Pat::Ident(binding) = &declarator.name else {
                        continue;
                    };
                    let Some(candidate) = candidates.get(binding.id.sym.as_ref()) else {
                        continue;
                    };
                    if let Some(Expr::Arrow(arrow)) = declarator.init.as_deref_mut() {
                        rewrite_arrow(arrow, candidate);
                    }
                }
            }
            _ => {}
        }
    }

    // Top-level candidates can declare local component factories that close over reactive
    // setup state. Those factories still need the closed-component branch lowering; otherwise
    // a concise conditional such as `const Indicator = () => visible.value ? <b /> : null`
    // is evaluated only once when mounted. Keep this pass scoped to nested, PascalCase variable
    // factories so ordinary JSX callbacks (map renderers, event callbacks, etc.) are untouched.
    struct NestedComponentTransformer<'a> {
        depth: usize,
        hook_names: &'a HashMap<String, String>,
    }

    impl VisitMut for NestedComponentTransformer<'_> {
        fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
            self.depth += 1;
            arrow.visit_mut_children_with(self);
            self.depth -= 1;
        }

        fn visit_mut_var_declarator(&mut self, declarator: &mut VarDeclarator) {
            declarator.visit_mut_children_with(self);
            if self.depth == 0 {
                return;
            }
            let Pat::Ident(binding) = &declarator.name else {
                return;
            };
            let name = binding.id.sym.to_string();
            if !name.chars().next().is_some_and(char::is_uppercase) {
                return;
            }
            let Some(Expr::Arrow(arrow)) = declarator.init.as_deref_mut() else {
                return;
            };
            if arrow.is_async || arrow.is_generator {
                return;
            }
            let Some((props_name, destructured_props)) = component_param(&arrow.params) else {
                return;
            };
            let render = arrow_render_expr(arrow)
                .map(|render| (render.clone(), render_expr_requires_branch(render)))
                .or_else(|| match arrow.body.as_ref() {
                    BlockStmtOrExpr::BlockStmt(block) => {
                        fallthrough_branch_render_expr(block).map(|render| (render, true))
                    }
                    BlockStmtOrExpr::Expr(_) => None,
                });
            let Some((render, branching)) = render else {
                return;
            };
            let render_reactive = matches!(
                arrow.body.as_ref(),
                BlockStmtOrExpr::BlockStmt(block)
                    if crate::pre::block_requires_custom_composable_render_effect(block)
            );
            let zero_props = arrow.params.is_empty();
            let candidate = analyze_candidate(
                name.clone(),
                props_name.clone(),
                destructured_props,
                arrow.body.as_ref(),
                &render,
                branching,
                render_reactive,
                self.hook_names,
            )
            .or_else(|| {
                // A zero-prop local factory can freely close over its parent's setup state.
                // Props analysis may reject those outer references after setup extraction, but
                // there is no child-props object to specialize in this shape.
                zero_props.then(|| CompiledComponentCandidate {
                    name,
                    props_name,
                    prop_keys: Vec::new(),
                    rest_prop: None,
                    destructured_props: HashMap::new(),
                    branching,
                    hook_aware: false,
                    hook_names: self.hook_names.clone(),
                })
            });
            let Some(candidate) = candidate else {
                return;
            };
            rewrite_arrow(arrow, &candidate);
        }
    }

    let hook_names = imported_hook_names(module);
    module.visit_mut_with(&mut NestedComponentTransformer { depth: 0, hook_names: &hook_names });
}

#[derive(Default)]
struct CompiledUpdaterDetector {
    found: bool,
}

impl Visit for CompiledUpdaterDetector {
    fn visit_call_expr(&mut self, call: &CallExpr) {
        if let Callee::Expr(callee) = &call.callee
            && let Expr::Ident(ident) = crate::utils::unwrap_expr(callee.as_ref())
            && matches!(
                ident.sym.as_ref(),
                "_$withCompiledPropsUpdater"
                    | "_$compiledRoot"
                    | "_$compiledBranch"
                    | "_$compiledComponent"
            )
        {
            self.found = true;
            return;
        }
        call.visit_children_with(self);
    }
}

fn contains_compiled_updater(node: &impl VisitWith<CompiledUpdaterDetector>) -> bool {
    let mut detector = CompiledUpdaterDetector::default();
    node.visit_with(&mut detector);
    detector.found
}

pub(crate) fn transformed_candidate_names(module: &Module) -> HashSet<String> {
    let mut names = HashSet::new();
    for item in &module.body {
        match item {
            ModuleItem::Stmt(Stmt::Decl(Decl::Fn(decl)))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Fn(decl),
                ..
            })) => {
                if contains_compiled_updater(&decl.function) {
                    names.insert(decl.ident.sym.to_string());
                }
            }
            ModuleItem::Stmt(Stmt::Decl(Decl::Var(var)))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Var(var),
                ..
            })) if var.decls.len() == 1 => {
                let declarator = &var.decls[0];
                let Pat::Ident(binding) = &declarator.name else {
                    continue;
                };
                let Some(Expr::Arrow(arrow)) = declarator.init.as_deref() else {
                    continue;
                };
                if contains_compiled_updater(arrow) {
                    names.insert(binding.id.sym.to_string());
                }
            }
            _ => {}
        }
    }
    names
}

/// Reject source shapes that cannot denote a closed, static function component.
pub(crate) fn assert_closed_component_shapes(program: &Program) {
    struct Shapes {
        known: HashSet<String>,
    }
    impl Visit for Shapes {
        fn visit_array_lit(&mut self, array: &ArrayLit) {
            if array.elems.iter().flatten().any(|item| {
                item.spread.is_some()
                    && match crate::utils::unwrap_expr(&item.expr) {
                        Expr::Ident(id) => id.sym == "children",
                        Expr::Member(member) => {
                            matches!(&member.prop, MemberProp::Ident(id) if id.sym == "children")
                        }
                        _ => false,
                    }
            }) {
                panic!(
                    "Rue children is a slot factory, not an array; express ordering in the parent JSX"
                );
            }
            array.visit_children_with(self);
        }
        fn visit_jsx_element(&mut self, element: &JSXElement) {
            if let JSXElementName::Ident(id) = &element.opening.name
                && id.sym.chars().next().is_some_and(char::is_uppercase)
                && !self.known.contains(id.sym.as_ref())
            {
                panic!(
                    "Rue component must reference a statically known function factory: {}",
                    id.sym
                );
            }
            if let JSXElementName::JSXMemberExpr(member) = &element.opening.name {
                fn root_ident(object: &JSXObject) -> &Ident {
                    match object {
                        JSXObject::Ident(ident) => ident,
                        JSXObject::JSXMemberExpr(member) => root_ident(&member.obj),
                    }
                }
                let root = root_ident(&member.obj);
                if !self.known.contains(root.sym.as_ref()) {
                    panic!(
                        "Rue member component must be rooted in a statically known function factory: {}",
                        root.sym
                    );
                }
            }
            element.visit_children_with(self);
        }
    }
    let mut known = function_component_names(program);
    if let Program::Module(module) = program {
        known.extend(analyze_module(module).into_keys());
        known.extend(imported_component_names(module));
        known.extend(compound_component_names(module));
        known.extend(async_component_factory_names(module));
    }
    known.extend(
        [
            "Component",
            "Fragment",
            "Template",
            "Teleport",
            "KeepAlive",
            "Suspense",
            "Transition",
            "TransitionGroup",
            "Slot",
        ]
        .into_iter()
        .map(str::to_string),
    );
    program.visit_with(&mut Shapes { known });
}

/// A component with dynamic prop keys still uses the closed ABI; only its props
/// specialization is omitted. Never route it through the legacy preprocessor.
pub(crate) fn function_component_names(program: &Program) -> HashSet<String> {
    #[derive(Default)]
    struct Names(HashSet<String>);
    impl Visit for Names {
        fn visit_fn_decl(&mut self, decl: &FnDecl) {
            if decl.ident.sym.chars().next().is_some_and(char::is_uppercase)
                || decl
                    .function
                    .body
                    .as_ref()
                    .is_some_and(crate::pre::has_component_render_return_in_block)
            {
                self.0.insert(decl.ident.sym.to_string());
            }
            decl.visit_children_with(self);
        }
        fn visit_var_declarator(&mut self, decl: &VarDeclarator) {
            if let Pat::Ident(id) = &decl.name
                && (crate::pre::is_untyped_arrow_component_decl(decl)
                    || (id.id.sym.chars().next().is_some_and(char::is_uppercase)
                        && matches!(decl.init.as_deref(), Some(Expr::Arrow(_) | Expr::Fn(_)))))
            {
                self.0.insert(id.id.sym.to_string());
            }
            decl.visit_children_with(self);
        }
    }
    let mut names = Names::default();
    program.visit_with(&mut names);
    names.0
}

/// A local custom hook executes once per call under a child owner. Returned state
/// fields are live getters; no component rerender or runtime hook table is needed.
pub(crate) fn lower_custom_hooks(module: &mut Module) {
    let names = imported_hook_names(module);
    for item in &mut module.body {
        let decl = match item {
            ModuleItem::Stmt(Stmt::Decl(Decl::Fn(decl)))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Fn(decl),
                ..
            })) => decl,
            _ => continue,
        };
        if !decl.ident.sym.starts_with("use") {
            continue;
        }
        let Some(body) = decl.function.body.as_mut() else { continue };
        let mut lowerer = CompiledHookLowerer {
            component_name: decl.ident.sym.as_ref(),
            next_slot: 0,
            hook_names: &names,
        };
        body.visit_mut_children_with(&mut lowerer);
        if lowerer.next_slot == 0 {
            continue;
        }
        let mut used = UsedIdentCollector::default();
        body.visit_with(&mut used);
        let mut collector =
            ReactStateBindingCollector { used_names: &mut used.names, bindings: HashMap::new() };
        body.visit_mut_children_with(&mut collector);

        // Preserve a source-level value API when a custom hook returns state fields.
        for stmt in &mut body.stmts {
            if let Stmt::Return(ReturnStmt { arg: Some(value), .. }) = stmt
                && let Expr::Object(object) = value.as_mut()
            {
                for prop in &mut object.props {
                    if let PropOrSpread::Prop(prop) = prop
                        && let Prop::Shorthand(name) = prop.as_ref()
                        && let Some(state) = collector.bindings.get(name.sym.as_ref())
                    {
                        **prop = Prop::Getter(GetterProp {
                            span: DUMMY_SP,
                            key: PropName::Ident(name.clone().into()),
                            type_ann: None,
                            body: Some(BlockStmt {
                                span: DUMMY_SP,
                                ctxt: SyntaxContext::empty(),
                                stmts: vec![Stmt::Return(ReturnStmt {
                                    span: DUMMY_SP,
                                    arg: Some(Box::new(crate::emit::call_member(
                                        state.clone(),
                                        "get",
                                        vec![],
                                    ))),
                                })],
                            }),
                        });
                    }
                }
            }
        }
        body.visit_mut_children_with(&mut ReactStateUsageRewriter {
            bindings: &collector.bindings,
            suspend_path: false,
            scope_stack: Vec::new(),
        });
        let run = Expr::Arrow(ArrowExpr {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            params: vec![],
            body: Box::new(BlockStmtOrExpr::BlockStmt(body.clone())),
            is_async: false,
            is_generator: false,
            type_params: None,
            return_type: None,
        });
        body.stmts = vec![Stmt::Return(ReturnStmt {
            span: DUMMY_SP,
            arg: Some(Box::new(crate::emit::call_ident(
                "_$compiledRunWithOwner",
                vec![crate::emit::call_ident("_$compiledCreateOwner", vec![]), run],
            ))),
        })];
    }
}

/// Erase preprocessor Hook-ID runners after provenance/lowering has consumed
/// them. Source hooks that cannot become static slots are a compile error.
pub(crate) fn finalize_hooks(module: &mut Module) {
    struct Finalize {
        source_hooks: HashSet<String>,
        namespaces: HashSet<String>,
    }
    impl VisitMut for Finalize {
        fn visit_mut_expr(&mut self, expr: &mut Expr) {
            if let Expr::Call(call) = expr
                && matches!(&call.callee, Callee::Expr(callee) if matches!(callee.as_ref(), Expr::Ident(id) if id.sym == *"_$compiledWithHookId"))
                && call.args.len() == 2
                && let Expr::Arrow(runner) = call.args[1].expr.as_ref()
                && runner.params.is_empty()
                && let BlockStmtOrExpr::Expr(body) = runner.body.as_ref()
            {
                *expr = *body.clone();
            }
            if let Expr::Member(member) = expr
                && let Expr::Ident(namespace) = member.obj.as_ref()
                && self.namespaces.contains(namespace.sym.as_ref())
                && match &member.prop {
                    MemberProp::Ident(name) => {
                        matches!(name.sym.as_ref(), "useState" | "useEffect")
                    }
                    MemberProp::Computed(_) => true,
                    _ => false,
                }
            {
                panic!(
                    "Rue hooks require a statically compiled call; namespace hook access is unsupported"
                );
            }
            if let Expr::Ident(ident) = expr
                && self.source_hooks.contains(ident.sym.as_ref())
            {
                panic!(
                    "Rue hooks require a statically compiled call; dynamic or unsupported hook use: {}",
                    ident.sym
                );
            }
            expr.visit_mut_children_with(self);
        }
    }
    let mut source_hooks = HashSet::new();
    let mut namespaces = HashSet::new();
    for item in &module.body {
        if let ModuleItem::ModuleDecl(ModuleDecl::Import(import)) = item
            && matches!(
                import.src.value.to_string_lossy().as_ref(),
                "text/form"
                    | "@rue-js/text/form"
                    | "@rue-js/runtime"
                    | "@rue-js/runtime/internal"
                    | "@rue-js/runtime/internal/reactive"
                    | "@rue-js/runtime/internal/compiler"
                    | "@rue-js/rue"
                    | "@rue-js/rue/internal"
                    | "@rue-js/rue/internal/reactive"
                    | "@rue-js/rue/internal/compiler"
            )
        {
            for specifier in &import.specifiers {
                if let ImportSpecifier::Namespace(namespace) = specifier {
                    namespaces.insert(namespace.local.sym.to_string());
                }
                if let ImportSpecifier::Named(named) = specifier {
                    let imported = named
                        .imported
                        .as_ref()
                        .map(|name| match name {
                            ModuleExportName::Ident(id) => id.sym.to_string(),
                            ModuleExportName::Str(value) => {
                                value.value.to_string_lossy().into_owned()
                            }
                        })
                        .unwrap_or_else(|| named.local.sym.to_string());
                    if matches!(imported.as_str(), "useState" | "useEffect") {
                        source_hooks.insert(named.local.sym.to_string());
                    }
                }
            }
        }
    }
    module.visit_mut_with(&mut Finalize { source_hooks, namespaces });
    for item in &mut module.body {
        if let ModuleItem::ModuleDecl(ModuleDecl::Import(import)) = item {
            import.specifiers.retain(|specifier| !matches!(specifier, ImportSpecifier::Named(named) if named.local.sym == *"_$compiledWithHookId"));
        }
    }
}

fn imported_hook_names(module: &Module) -> HashMap<String, String> {
    let mut names: HashMap<String, String> = HashMap::new();
    for item in &module.body {
        if let ModuleItem::ModuleDecl(ModuleDecl::Import(import)) = item
            && matches!(
                import.src.value.to_string_lossy().as_ref(),
                "text/form"
                    | "@rue-js/text/form"
                    | "@rue-js/runtime"
                    | "@rue-js/runtime/internal"
                    | "@rue-js/runtime/internal/reactive"
                    | "@rue-js/runtime/internal/compiler"
                    | "@rue-js/rue"
                    | "@rue-js/rue/internal"
                    | "@rue-js/rue/internal/reactive"
                    | "@rue-js/rue/internal/compiler"
            )
        {
            for specifier in &import.specifiers {
                if let ImportSpecifier::Named(named) = specifier {
                    let name = named
                        .imported
                        .as_ref()
                        .map(|name| match name {
                            ModuleExportName::Ident(id) => id.sym.to_string(),
                            ModuleExportName::Str(value) => {
                                value.value.to_string_lossy().into_owned()
                            }
                        })
                        .unwrap_or_else(|| named.local.sym.to_string());
                    if matches!(
                        name.as_str(),
                        "useState" | "useActionState" | "useEffect" | "useRef" | "useSetup"
                    ) {
                        names.insert(named.local.sym.to_string(), name);
                    }
                }
            }
        }
    }
    names
}

/// Reuse owner-slot and React-state lowering without introducing a DOM Block ABI.
/// The server/claim compiler supplies its own node instructions after this pass.
pub(crate) fn lower_node_plan_hooks(module: &mut Module) {
    lower_unspecialized_hooks(module, &HashMap::new());
}

/// Hook lowering is required even when dynamic props prevent slot specialization.
pub(crate) fn lower_unspecialized_hooks(
    module: &mut Module,
    candidates: &CompiledComponentCandidates,
) {
    let mut spans = crate::compiled_props::components(&Program::Module(module.clone()));
    let default_exported = default_exported_component_spans(module);
    for item in &module.body {
        match item {
            ModuleItem::Stmt(Stmt::Decl(Decl::Fn(decl)))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Fn(decl),
                ..
            })) => {
                if candidates.contains_key(decl.ident.sym.as_ref()) {
                    spans.retain(|span| *span != decl.function.span);
                } else if default_exported.contains(&decl.function.span) {
                    if !spans.contains(&decl.function.span) {
                        spans.push(decl.function.span);
                    }
                }
            }
            ModuleItem::Stmt(Stmt::Decl(Decl::Var(var)))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Var(var),
                ..
            })) => {
                for decl in &var.decls {
                    if let Pat::Ident(binding) = &decl.name
                        && let Some(Expr::Arrow(arrow)) = decl.init.as_deref()
                    {
                        if candidates.contains_key(binding.id.sym.as_ref()) {
                            spans.retain(|span| *span != arrow.span);
                        } else if default_exported.contains(&arrow.span) {
                            if !spans.contains(&arrow.span) {
                                spans.push(arrow.span);
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }
    let names = imported_hook_names(module);
    fn lower(body: &mut BlockStmt, name: &str, names: &HashMap<String, String>) {
        body.visit_mut_children_with(&mut CompiledHookLowerer {
            component_name: name,
            next_slot: 0,
            hook_names: names,
        });
        let mut used = UsedIdentCollector::default();
        body.visit_with(&mut used);
        let mut collector =
            ReactStateBindingCollector { used_names: &mut used.names, bindings: HashMap::new() };
        body.visit_mut_children_with(&mut collector);
        body.visit_mut_children_with(&mut ReactStateUsageRewriter {
            bindings: &collector.bindings,
            suspend_path: false,
            scope_stack: Vec::new(),
        });
    }
    struct Lower<'a> {
        spans: Vec<swc_core::common::Span>,
        names: &'a HashMap<String, String>,
    }
    impl VisitMut for Lower<'_> {
        fn visit_mut_function(&mut self, function: &mut Function) {
            if self.spans.contains(&function.span)
                && let Some(body) = &mut function.body
            {
                lower(body, &format!("plan:{}", function.span.lo.0), self.names);
            }
            function.visit_mut_children_with(self);
        }
        fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
            if self.spans.contains(&arrow.span)
                && let BlockStmtOrExpr::BlockStmt(body) = arrow.body.as_mut()
            {
                lower(body, &format!("plan:{}", arrow.span.lo.0), self.names);
            }
            arrow.visit_mut_children_with(self);
        }
    }
    module.visit_mut_with(&mut Lower { spans, names: &names });
}
