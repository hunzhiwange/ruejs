use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;

use crate::emit::{ident, ident_name, string_expr};

fn jsx_attr_name(attr: &JSXAttr) -> Option<&str> {
    match &attr.name {
        JSXAttrName::Ident(idn) => Some(idn.sym.as_ref()),
        _ => None,
    }
}

fn jsx_attr_value_expr(value: Option<&JSXAttrValue>, default: Expr) -> Expr {
    match value {
        Some(JSXAttrValue::Str(s)) => Expr::Lit(Lit::Str(s.clone())),
        Some(JSXAttrValue::JSXExprContainer(ec)) => match &ec.expr {
            JSXExpr::Expr(expr) => *expr.clone(),
            _ => default,
        },
        None => Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })),
        _ => default,
    }
}

fn router_link_member(prop: &str) -> Expr {
    Expr::Member(MemberExpr {
        span: DUMMY_SP,
        obj: Box::new(Expr::Ident(ident("RouterLink"))),
        prop: MemberProp::Ident(ident_name(prop)),
    })
}

fn jsx_expr_attr(name: &str, expr: Expr) -> JSXAttrOrSpread {
    JSXAttrOrSpread::JSXAttr(JSXAttr {
        span: DUMMY_SP,
        name: JSXAttrName::Ident(ident_name(name)),
        value: Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
            span: DUMMY_SP,
            expr: JSXExpr::Expr(Box::new(expr)),
        })),
    })
}

fn router_link_click_expr(to_expr: Expr, replace_expr: Expr) -> Expr {
    let event_ident = ident("e");
    let call = Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(router_link_member("__rueOnClick"))),
        args: vec![
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(event_ident.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(to_expr) },
            ExprOrSpread { spread: None, expr: Box::new(replace_expr) },
        ],
        type_args: None,
        ctxt: SyntaxContext::empty(),
    });
    Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![Pat::Ident(BindingIdent { id: event_ident, type_ann: None })],
        body: Box::new(BlockStmtOrExpr::Expr(Box::new(call))),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    })
}

pub fn rewrite_router_link_fast_path(jsx_el: &JSXElement) -> Option<JSXElement> {
    let JSXElementName::Ident(name) = &jsx_el.opening.name else {
        return None;
    };
    if name.sym.as_ref() != "RouterLink" {
        return None;
    }

    let mut to_expr = string_expr("");
    let mut replace_expr = Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: false }));
    let mut new_attrs: Vec<JSXAttrOrSpread> = Vec::new();

    for attr in &jsx_el.opening.attrs {
        match attr {
            JSXAttrOrSpread::SpreadElement(_) => {
                return None;
            }
            JSXAttrOrSpread::JSXAttr(attr) => {
                let Some(name) = jsx_attr_name(attr) else {
                    new_attrs.push(JSXAttrOrSpread::JSXAttr(attr.clone()));
                    continue;
                };
                match name {
                    "to" => {
                        to_expr = jsx_attr_value_expr(attr.value.as_ref(), string_expr(""));
                    }
                    "replace" => {
                        replace_expr = jsx_attr_value_expr(
                            attr.value.as_ref(),
                            Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: false })),
                        );
                    }
                    "onClick" | "children" => {
                        return None;
                    }
                    _ => {
                        new_attrs.push(JSXAttrOrSpread::JSXAttr(attr.clone()));
                    }
                }
            }
        }
    }

    let href_expr = Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(router_link_member("__rueHref"))),
        args: vec![ExprOrSpread { spread: None, expr: Box::new(to_expr.clone()) }],
        type_args: None,
        ctxt: SyntaxContext::empty(),
    });
    new_attrs.insert(0, jsx_expr_attr("href", href_expr));
    new_attrs.insert(1, jsx_expr_attr("onClick", router_link_click_expr(to_expr, replace_expr)));

    Some(JSXElement {
        span: jsx_el.span,
        opening: JSXOpeningElement {
            name: JSXElementName::Ident(ident("a")),
            span: jsx_el.opening.span,
            attrs: new_attrs,
            self_closing: jsx_el.children.is_empty(),
            type_args: None,
        },
        children: jsx_el.children.clone(),
        closing: if jsx_el.children.is_empty() {
            None
        } else {
            Some(JSXClosingElement {
                span: jsx_el.closing.as_ref().map(|c| c.span).unwrap_or(DUMMY_SP),
                name: JSXElementName::Ident(ident("a")),
            })
        },
    })
}
