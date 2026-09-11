//! Source-only startup macros. No public runtime render/JSX dispatch survives compilation.
use crate::emit::call_ident;
use std::collections::HashMap;
use swc_core::common::{DUMMY_SP, Span, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitMut, VisitMutWith, VisitWith};

pub(crate) struct BootstrapError {
    pub span: Span,
    pub message: &'static str,
}
pub(crate) fn lower(program: &mut Program) -> Result<(), BootstrapError> {
    let mut components = crate::compiled_component::function_component_names(program);
    let Program::Module(module) = program else { return Ok(()) };
    components.extend(crate::compiled_component::imported_component_names(module));
    let mut bindings = HashMap::new();
    for item in &module.body {
        let ModuleItem::ModuleDecl(ModuleDecl::Import(import)) = item else { continue };
        if import.type_only {
            continue;
        }
        let source = import.src.value.as_str().unwrap_or_default();
        if source == "@rue-js/rue/jsx-runtime" || source == "@rue-js/rue/jsx-dev-runtime" {
            return Err(BootstrapError {
                span: import.span,
                message: "Rue compiler required: runtime JSX is unsupported; compile the original JSX with @rue-js/vite-plugin-rue",
            });
        }
        if source != "@rue-js/rue" {
            continue;
        }
        for spec in &import.specifiers {
            if matches!(spec, ImportSpecifier::Namespace(_)) {
                return Err(BootstrapError {
                    span: import.span,
                    message: "Rue compiler required: use named Rue imports; namespace startup dispatch is unsupported",
                });
            }
            let ImportSpecifier::Named(spec) = spec else { continue };
            if spec.is_type_only {
                continue;
            }
            let name = spec
                .imported
                .as_ref()
                .map(|n| n.atom().to_string())
                .unwrap_or_else(|| spec.local.sym.to_string());
            if matches!(
                name.as_str(),
                "render" | "mount" | "createRue" | "useApp" | "createElement"
            ) {
                bindings.insert(spec.local.to_id(), name);
            }
        }
    }
    if bindings.is_empty() {
        return Ok(());
    }
    let mut transform = Bootstrap { bindings: &bindings, components: &components, error: None };
    module.visit_mut_with(&mut transform);
    if let Some(error) = transform.error {
        return Err(error);
    }
    // References to a macro as a value, including indirect calls, are never a runtime escape hatch.
    struct Remaining<'a>(&'a HashMap<Id, String>, Option<Span>);
    impl Visit for Remaining<'_> {
        fn visit_import_decl(&mut self, _: &ImportDecl) {}
        fn visit_ts_type(&mut self, _: &TsType) {}
        fn visit_ident(&mut self, id: &Ident) {
            if self.0.contains_key(&id.to_id()) {
                self.1.get_or_insert(id.span);
            }
        }
    }
    let mut remaining = Remaining(&bindings, None);
    module.visit_with(&mut remaining);
    if let Some(span) = remaining.1 {
        return Err(BootstrapError {
            span,
            message: "Rue compiler required: startup macros must be called directly with a statically known root",
        });
    }
    for item in &mut module.body {
        if let ModuleItem::ModuleDecl(ModuleDecl::Import(import)) = item {
            import.specifiers.retain(|spec| !bindings.contains_key(&spec.local().to_id()));
        }
    }
    module.body.retain(|item| !matches!(item, ModuleItem::ModuleDecl(ModuleDecl::Import(i)) if i.src.value == *"@rue-js/rue" && i.specifiers.is_empty()));
    Ok(())
}
struct Bootstrap<'a> {
    bindings: &'a HashMap<Id, String>,
    components: &'a std::collections::HashSet<String>,
    error: Option<BootstrapError>,
}
impl VisitMut for Bootstrap<'_> {
    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        if self.error.is_some() {
            return;
        }
        let name = match &call.callee {
            Callee::Expr(expr) => match &**expr {
                Expr::Ident(id) => self.bindings.get(&id.to_id()),
                _ => None,
            },
            _ => None,
        }
        .cloned();
        let Some(name) = name else {
            call.visit_mut_children_with(self);
            return;
        };
        let expected = if name == "createRue" || name == "useApp" { 1 } else { 2 };
        if name == "createElement"
            || call.args.len() != expected
            || call.args.iter().any(|a| a.spread.is_some())
        {
            self.error = Some(BootstrapError {
                span: call.span,
                message: "Rue compiler required: use render(<App />, target), mount(App, target), or createRue(App)",
            });
            return;
        }
        let input = crate::utils::unwrap_expr(&call.args.remove(0).expr).clone();
        let jsx = if name == "render" {
            if !matches!(input, Expr::JSXElement(_) | Expr::JSXFragment(_)) {
                self.error = Some(BootstrapError {
                    span: call.span,
                    message: "Rue compiler required: render expects JSX, not an arbitrary runtime value",
                });
                return;
            }
            input
        } else {
            let Expr::Ident(component) = input else {
                self.error = Some(BootstrapError {
                    span: call.span,
                    message: "Rue compiler required: application root must be a component identifier",
                });
                return;
            };
            if !component.sym.chars().next().is_some_and(|c| c.is_ascii_uppercase())
                || !self.components.contains(component.sym.as_ref())
            {
                self.error = Some(BootstrapError {
                    span: call.span,
                    message: "Rue compiler required: application root must be a compiler-proven component",
                });
                return;
            }
            Expr::JSXElement(Box::new(JSXElement {
                span: DUMMY_SP,
                opening: JSXOpeningElement {
                    name: JSXElementName::Ident(component),
                    span: DUMMY_SP,
                    attrs: vec![],
                    self_closing: true,
                    type_args: None,
                },
                children: vec![],
                closing: None,
            }))
        };
        let factory = Expr::Arrow(ArrowExpr {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            params: vec![],
            body: Box::new(BlockStmtOrExpr::Expr(Box::new(jsx))),
            is_async: false,
            is_generator: false,
            type_params: None,
            return_type: None,
        });
        let mut args = vec![factory];
        args.extend(call.args.drain(..).map(|arg| *arg.expr));
        let helper = if expected == 1 { "_$createApp" } else { "_$mountApp" };
        let Expr::Call(replacement) = call_ident(helper, args) else { unreachable!() };
        *call = replacement;
        call.visit_mut_children_with(self);
    }
}
