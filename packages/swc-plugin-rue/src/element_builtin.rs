use crate::emit::*;
use crate::vapor::VaporTransform;
use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;

pub(crate) fn helper(vt: &VaporTransform, element: &JSXElement) -> Option<&'static str> {
    let JSXElementName::Ident(name) = &element.opening.name else { return None };
    match canonical_name(vt, name)? {
        "Teleport" => Some("_$teleport"),
        "Transition" => Some("_$transition"),
        "TransitionGroup" => Some("_$transitionGroup"),
        "KeepAlive" => Some("_$keepAlive"),
        "Suspense" => Some("_$suspense"),
        _ => None,
    }
}

pub(crate) fn build(vt: &mut VaporTransform, element: &JSXElement) -> Option<Expr> {
    if matches!(&element.opening.name, JSXElementName::Ident(name) if canonical_name(vt, name) == Some("Template"))
    {
        let fragment = Expr::JSXFragment(JSXFragment {
            span: DUMMY_SP,
            opening: JSXOpeningFragment { span: DUMMY_SP },
            closing: JSXClosingFragment { span: DUMMY_SP },
            children: element.children.clone(),
        });
        return Some(crate::element_expr::make_expr_for_slot(vt, &fragment));
    }
    let name = helper(vt, element)?;
    let mut element = element.clone();
    if let JSXElementName::Ident(id) = &mut element.opening.name {
        if let Some(name) = canonical_name(vt, id) {
            id.sym = name.into();
        }
    }
    if name == "_$transition" || name == "_$keepAlive" {
        let prop = if name == "_$transition" { "childKey" } else { "cacheKey" };
        let mut identity = None;
        for child in &mut element.children {
            if let JSXElementChild::JSXExprContainer(JSXExprContainer {
                expr: JSXExpr::Expr(expr),
                ..
            }) = child
            {
                identity = match crate::utils::unwrap_expr(expr) {
                    Expr::Cond(value) => Some(*value.test.clone()),
                    Expr::Bin(value) if value.op == BinaryOp::LogicalAnd => {
                        Some(*value.left.clone())
                    }
                    _ => None,
                };
                if identity.is_some() {
                    break;
                }
            }
            if let JSXElementChild::JSXElement(child) = child {
                identity = child.opening.attrs.iter().find_map(|attr| {
                    let JSXAttrOrSpread::JSXAttr(attr) = attr else { return None };
                    if !matches!(&attr.name, JSXAttrName::Ident(id) if id.sym == "key") {
                        return None;
                    }
                    match &attr.value {
                        Some(JSXAttrValue::Str(value)) => Some(Expr::Lit(Lit::Str(value.clone()))),
                        Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                            expr: JSXExpr::Expr(value),
                            ..
                        })) => Some(*value.clone()),
                        _ => None,
                    }
                });
                crate::element_component::remove_jsx_attr_ident(&mut child.opening.attrs, "key");
                break;
            }
        }
        if let Some(identity) = identity {
            if !element.opening.attrs.iter().any(|attr| matches!(attr, JSXAttrOrSpread::JSXAttr(JSXAttr { name: JSXAttrName::Ident(id), .. }) if id.sym.as_ref() == prop)) {
                element.opening.attrs.push(JSXAttrOrSpread::JSXAttr(JSXAttr { span: DUMMY_SP,
                    name: JSXAttrName::Ident(ident_name(prop)), value: Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                        span: DUMMY_SP, expr: JSXExpr::Expr(Box::new(identity)) })) }));
            }
        }
    }
    let single_child = element
        .children
        .iter()
        .filter(|child| {
            !matches!(child,
        JSXElementChild::JSXText(text) if text.value.trim().is_empty())
        })
        .count()
        == 1;
    let selected = if single_child && (name == "_$transition" || name == "_$keepAlive") {
        element.children.iter().find_map(|child| {
            let JSXElementChild::JSXExprContainer(JSXExprContainer {
                expr: JSXExpr::Expr(expr),
                ..
            }) = child
            else {
                return None;
            };
            let (test, cons, alt) = match crate::utils::unwrap_expr(expr) {
                Expr::Cond(value) => (*value.test.clone(), *value.cons.clone(), *value.alt.clone()),
                Expr::Bin(value) if value.op == BinaryOp::LogicalAnd => (
                    *value.left.clone(),
                    *value.right.clone(),
                    Expr::Lit(Lit::Null(Null { span: DUMMY_SP })),
                ),
                _ => return None,
            };
            let cons = crate::element_expr::compiled_slot_factory_expr(vt, &cons)?;
            let alt = crate::element_expr::compiled_slot_factory_expr(vt, &alt)?;
            Some(Expr::Cond(CondExpr {
                span: DUMMY_SP,
                test: Box::new(test),
                cons: Box::new(cons),
                alt: Box::new(alt),
            }))
        })
    } else {
        None
    };
    if selected.is_some() {
        element.children.clear();
    }
    let mut read_props =
        crate::element_component::build_compiled_component_read_props(vt, &element)
            .unwrap_or_else(|| panic!("Rue builtin requires compiler-proven block children"));
    if let Some(selected) = selected {
        // Select the factory in the builtin's effect, never inside a parked cached branch.
        let Expr::Arrow(reader) = &mut read_props else { unreachable!() };
        let BlockStmtOrExpr::Expr(body) = reader.body.as_mut() else { unreachable!() };
        let Expr::Paren(paren) = body.as_mut() else { unreachable!() };
        let Expr::Object(props) = paren.expr.as_mut() else { unreachable!() };
        props.props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
            key: PropName::Ident(ident_name("children")),
            value: Box::new(selected),
        }))));
    }
    Some(call_ident(name, vec![read_props]))
}

pub(crate) fn mount(
    vt: &mut VaporTransform,
    element: &JSXElement,
    parent: &Ident,
    anchor: Option<&Ident>,
    stmts: &mut Vec<Stmt>,
) -> bool {
    let Some(block) = build(vt, element) else { return false };
    let args = vec![
        Expr::Ident(parent.clone()),
        anchor
            .map(|id| Expr::Ident(id.clone()))
            .unwrap_or(Expr::Lit(Lit::Null(Null { span: DUMMY_SP }))),
    ];
    let call = Expr::Call(CallExpr {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        callee: Callee::Expr(Box::new(Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(block),
            prop: MemberProp::Ident(ident_name("__rue_compiled_mount")),
        }))),
        args: args
            .into_iter()
            .map(|expr| ExprOrSpread { spread: None, expr: Box::new(expr) })
            .collect(),
        type_args: None,
    });
    stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(call) }));
    true
}

// Binding identity prevents a local component called Teleport from becoming a builtin.
fn canonical_name<'a>(vt: &'a VaporTransform, id: &'a Ident) -> Option<&'a str> {
    if vt.el_tag_by_ident.contains_key("\0builtin:configured") {
        vt.el_tag_by_ident
            .get(&format!("\0builtin:{}:{:?}", id.sym, id.ctxt))
            .map(String::as_str)
            .or_else(|| {
                (id.sym == "Template" && !vt.is_compiled_component("Template"))
                    .then_some("Template")
            })
    } else {
        Some(id.sym.as_ref())
    }
}
pub(crate) fn register(vt: &mut VaporTransform, program: &Program) {
    vt.el_tag_by_ident.insert("\0builtin:configured".into(), String::new());
    let Program::Module(module) = program else { return };
    for item in &module.body {
        let ModuleItem::ModuleDecl(ModuleDecl::Import(decl)) = item else { continue };
        if !matches!(
            decl.src.value.as_str(),
            Some(
                "@rue-js/rue"
                    | "@rue-js/runtime"
                    | "@rue-js/rue/internal/builtin"
                    | "@rue-js/runtime/internal/builtin"
            )
        ) {
            continue;
        }
        for spec in &decl.specifiers {
            let ImportSpecifier::Named(spec) = spec else { continue };
            if spec.is_type_only || decl.type_only {
                continue;
            }
            let imported = spec
                .imported
                .as_ref()
                .map(|name| name.atom().to_string())
                .unwrap_or_else(|| spec.local.sym.to_string());
            if matches!(
                imported.as_str(),
                "Teleport"
                    | "Transition"
                    | "TransitionGroup"
                    | "KeepAlive"
                    | "Suspense"
                    | "Template"
            ) {
                vt.el_tag_by_ident.insert(
                    format!("\0builtin:{}:{:?}", spec.local.sym, spec.local.ctxt),
                    imported,
                );
            }
        }
    }
}
