//! Freeze JSX expressions before component analysis or binding rewrites can evaluate them.
use swc_core::common::{DUMMY_SP, Span};
use swc_core::ecma::ast::*;
use swc_core::ecma::codegen::to_code;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use super::if_directive::has_pre_directive;

pub(crate) fn preserve(program: &mut Program, source: Option<&dyn Fn(Span) -> Option<String>>) {
    program.visit_mut_with(&mut PreIslands { source });
}

struct PreIslands<'a> {
    source: Option<&'a dyn Fn(Span) -> Option<String>>,
}

impl VisitMut for PreIslands<'_> {
    fn visit_mut_jsx_element(&mut self, el: &mut JSXElement) {
        if has_pre_directive(el) {
            el.visit_mut_with(&mut RawJsx { source: self.source });
        } else {
            el.visit_mut_children_with(self);
        }
    }
}

struct RawJsx<'a> {
    source: Option<&'a dyn Fn(Span) -> Option<String>>,
}

impl RawJsx<'_> {
    fn expression_text(&self, container: &JSXExprContainer) -> String {
        self.source.and_then(|source| source(container.span)).unwrap_or_else(|| to_code(container))
    }
}

impl VisitMut for RawJsx<'_> {
    fn visit_mut_jsx_expr_container(&mut self, container: &mut JSXExprContainer) {
        // Generated literals are already frozen. This also makes repeated pre passes safe.
        if container.span == DUMMY_SP || matches!(container.expr, JSXExpr::JSXEmptyExpr(_)) {
            return;
        }
        let text = self.expression_text(container);
        *container = JSXExprContainer {
            span: DUMMY_SP,
            expr: JSXExpr::Expr(Box::new(crate::emit::string_expr(&text))),
        };
    }

    fn visit_mut_jsx_attr(&mut self, attr: &mut JSXAttr) {
        if let Some(JSXAttrValue::JSXExprContainer(container)) = &attr.value {
            let text = self.expression_text(container);
            attr.value = Some(JSXAttrValue::Str(crate::emit::str_lit(&text)));
        }
    }

    fn visit_mut_jsx_opening_element(&mut self, opening: &mut JSXOpeningElement) {
        // Spreads have no literal HTML attribute equivalent and must never execute in pre.
        opening.attrs.retain(|attr| !matches!(attr, JSXAttrOrSpread::SpreadElement(_)));
        opening.visit_mut_children_with(self);
    }

    fn visit_mut_jsx_element_child(&mut self, child: &mut JSXElementChild) {
        if let JSXElementChild::JSXSpreadChild(spread) = child {
            let text = self
                .source
                .and_then(|source| source(spread.span))
                .unwrap_or_else(|| format!("{{...{}}}", to_code(&spread.expr)));
            *child = JSXElementChild::JSXExprContainer(JSXExprContainer {
                span: DUMMY_SP,
                expr: JSXExpr::Expr(Box::new(crate::emit::string_expr(&text))),
            });
        } else {
            child.visit_mut_children_with(self);
        }
    }
}
