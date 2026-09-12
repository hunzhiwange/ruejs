//! Preserve statically provable component-root identity at Transition boundaries.
use std::collections::{HashMap, HashSet};
use swc_core::ecma::{
    ast::*,
    visit::{Visit, VisitMut, VisitMutWith, VisitWith},
};

// Only follow plain property paths. Moving arbitrary expressions out of a
// component would change setup scope or duplicate user side effects.
fn path(expr: &Expr) -> Option<(Id, Vec<IdentName>)> {
    match crate::utils::unwrap_expr(expr) {
        Expr::Ident(id) => Some((id.to_id(), vec![])),
        Expr::Member(member) => {
            let MemberProp::Ident(prop) = &member.prop else { return None };
            let (root, mut parts) = path(&member.obj)?;
            parts.push(prop.clone());
            Some((root, parts))
        }
        _ => None,
    }
}
fn key(element: &JSXElement) -> Option<&JSXAttr> {
    element.opening.attrs.iter().find_map(|attr| match attr {
        JSXAttrOrSpread::JSXAttr(attr) if matches!(&attr.name, JSXAttrName::Ident(id) if id.sym == "key") => Some(attr),
        _ => None,
    })
}
#[derive(Default)]
struct Roots {
    transitions: HashSet<Id>,
    keys: HashMap<Id, Vec<IdentName>>,
}
impl Visit for Roots {
    fn visit_import_decl(&mut self, import: &ImportDecl) {
        if !matches!(import.src.value.as_str(), Some("@rue-js/rue" | "@rue-js/runtime")) {
            return;
        }
        for spec in &import.specifiers {
            if let ImportSpecifier::Named(spec) = spec {
                let name = match &spec.imported {
                    Some(ModuleExportName::Ident(id)) => id.sym.as_ref(),
                    None => spec.local.sym.as_ref(),
                    _ => continue,
                };
                if name == "Transition" {
                    self.transitions.insert(spec.local.to_id());
                }
            }
        }
    }
    fn visit_var_declarator(&mut self, decl: &VarDeclarator) {
        decl.visit_children_with(self);
        let Pat::Ident(name) = &decl.name else { return };
        let Some(init) = &decl.init else { return };
        let Expr::Arrow(arrow) = crate::utils::unwrap_expr(init) else { return };
        let Some(Pat::Ident(props)) = arrow.params.first() else { return };
        let BlockStmtOrExpr::Expr(body) = arrow.body.as_ref() else { return };
        let Expr::JSXElement(root) = crate::utils::unwrap_expr(body) else { return };
        let Some(JSXAttr {
            value:
                Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                    expr: JSXExpr::Expr(expr), ..
                })),
            ..
        }) = key(root)
        else {
            return;
        };
        let Some((base, parts)) = path(expr) else { return };
        if base == props.id.to_id() && !parts.is_empty() {
            self.keys.insert(name.id.to_id(), parts);
        }
    }
}
impl VisitMut for Roots {
    fn visit_mut_jsx_element(&mut self, element: &mut JSXElement) {
        element.visit_mut_children_with(self);
        let JSXElementName::Ident(name) = &element.opening.name else { return };
        if !self.transitions.contains(&name.to_id()) {
            return;
        }
        let mut children = element.children.iter_mut().filter(|child| !matches!(child, JSXElementChild::JSXText(text) if text.value.trim().is_empty()));
        let Some(JSXElementChild::JSXElement(child)) = children.next() else { return };
        if children.next().is_some() || key(child).is_some() {
            return;
        }
        let JSXElementName::Ident(component) = &child.opening.name else { return };
        let Some(parts) = self.keys.get(&component.to_id()) else { return };
        if child.opening.attrs.iter().any(|attr| matches!(attr, JSXAttrOrSpread::SpreadElement(_)))
        {
            return;
        }
        let Some(mut attr) = child.opening.attrs.iter().find_map(|attr| match attr {
            JSXAttrOrSpread::JSXAttr(attr) if matches!(&attr.name, JSXAttrName::Ident(id) if id.sym == parts[0].sym) => Some(attr.clone()),
            _ => None,
        }) else { return };
        let Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
            expr: JSXExpr::Expr(value),
            ..
        })) = &mut attr.value
        else {
            return;
        };
        for prop in &parts[1..] {
            *value = Box::new(Expr::Member(MemberExpr {
                span: attr.span,
                obj: value.clone(),
                prop: MemberProp::Ident(prop.clone()),
            }));
        }
        attr.name = JSXAttrName::Ident(crate::emit::ident_name("key"));
        child.opening.attrs.push(JSXAttrOrSpread::JSXAttr(attr));
    }
}
pub(crate) fn preserve(module: &mut Module) {
    let mut roots = Roots::default();
    module.visit_with(&mut roots);
    module.visit_mut_with(&mut roots);
}
