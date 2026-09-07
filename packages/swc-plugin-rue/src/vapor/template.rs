use std::collections::HashSet;

use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitMut, VisitMutWith, VisitWith};

use crate::emit::{call_ident, ident, ident_name, string_expr};

const TEMPLATE_MARKER_ATTR: &str = "__rue_static_template_id__";

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct StaticTemplate {
    pub(crate) html: String,
    kind: StaticTemplateKind,
}

#[derive(Clone, Debug, Eq, PartialEq)]
enum StaticTemplateKind {
    Pure,
    Dynamic { holes: Vec<TextHolePlan>, targets: Vec<AttrTargetPlan> },
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct TextHolePlan {
    index: usize,
    path: Vec<usize>,
    parent_path: Option<Vec<usize>>,
    before_path: Option<Vec<usize>>,
    kind: TemplateHoleKind,
    reuse_text: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum TemplateHoleKind {
    Expression,
    OpaqueElement,
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct AttrTargetPlan {
    path: Vec<usize>,
}

pub(crate) struct MarkedTextHole<'a> {
    pub(crate) index: usize,
    pub(crate) path: Vec<usize>,
    pub(crate) parent_path: Option<Vec<usize>>,
    pub(crate) before_path: Option<Vec<usize>>,
    pub(crate) reuse_text: bool,
    pub(crate) source: MarkedHoleSource<'a>,
}

pub(crate) enum MarkedHoleSource<'a> {
    Expression(&'a JSXExprContainer),
    OpaqueElement(&'a JSXElement),
}

pub(crate) struct MarkedAttrTarget<'a> {
    pub(crate) path: Vec<usize>,
    pub(crate) opening: &'a JSXOpeningElement,
}

#[derive(Clone, Debug)]
pub(crate) struct HoistedTemplate {
    pub(crate) id: usize,
    pub(crate) getter: Ident,
    pub(crate) html: String,
}

impl StaticTemplate {
    pub(crate) fn classify(element: &JSXElement) -> Option<Self> {
        Self::classify_with_row_text(element, false)
    }

    pub(crate) fn classify_simple_row(element: &JSXElement) -> Option<Self> {
        Self::classify_with_row_text(element, true)
    }

    fn classify_with_row_text(element: &JSXElement, row_text: bool) -> Option<Self> {
        let mut html = String::new();
        let mut text_holes = Vec::new();
        let mut attr_targets = Vec::new();
        let mut has_static_expr_text = false;
        let mut path = Vec::new();
        serialize_element(
            element,
            &mut html,
            &mut text_holes,
            &mut attr_targets,
            &mut has_static_expr_text,
            &mut path,
        )?;
        if text_holes.is_empty() && has_static_expr_text {
            return None;
        }
        for hole in &mut text_holes {
            if hole.reuse_text {
                let marker = if row_text { "rue:row-text" } else { "rue:direct-text" };
                html = html.replace(&format!("<!--rue:text-hole:{}-->", hole.index), marker);
            }
        }
        let kind = if text_holes.is_empty() && attr_targets.is_empty() {
            StaticTemplateKind::Pure
        } else {
            StaticTemplateKind::Dynamic { holes: text_holes, targets: attr_targets }
        };
        Some(Self { html, kind })
    }
}

fn html_tag_name(name: &JSXElementName) -> Option<&str> {
    let JSXElementName::Ident(name) = name else {
        return None;
    };
    let tag = name.sym.as_ref();
    is_native_html_tag(tag).then_some(tag)
}

pub(crate) fn is_native_html_tag(tag: &str) -> bool {
    matches!(
        tag,
        "a" | "abbr"
            | "address"
            | "area"
            | "article"
            | "aside"
            | "audio"
            | "b"
            | "base"
            | "bdi"
            | "bdo"
            | "blockquote"
            | "body"
            | "br"
            | "button"
            | "canvas"
            | "caption"
            | "cite"
            | "code"
            | "col"
            | "colgroup"
            | "data"
            | "datalist"
            | "dd"
            | "del"
            | "details"
            | "dfn"
            | "dialog"
            | "div"
            | "dl"
            | "dt"
            | "em"
            | "embed"
            | "fieldset"
            | "figcaption"
            | "figure"
            | "footer"
            | "form"
            | "h1"
            | "h2"
            | "h3"
            | "h4"
            | "h5"
            | "h6"
            | "head"
            | "header"
            | "hgroup"
            | "hr"
            | "html"
            | "i"
            | "iframe"
            | "img"
            | "input"
            | "ins"
            | "kbd"
            | "label"
            | "legend"
            | "li"
            | "link"
            | "main"
            | "map"
            | "mark"
            | "menu"
            | "meta"
            | "meter"
            | "nav"
            | "noscript"
            | "object"
            | "ol"
            | "optgroup"
            | "option"
            | "output"
            | "p"
            | "picture"
            | "pre"
            | "progress"
            | "q"
            | "rp"
            | "rt"
            | "ruby"
            | "s"
            | "samp"
            | "search"
            | "section"
            | "select"
            | "slot"
            | "small"
            | "source"
            | "span"
            | "strong"
            | "sub"
            | "summary"
            | "sup"
            | "table"
            | "tbody"
            | "td"
            | "template"
            | "tfoot"
            | "th"
            | "thead"
            | "time"
            | "tr"
            | "track"
            | "u"
            | "ul"
            | "var"
            | "video"
            | "wbr"
    )
}

fn is_void_tag(tag: &str) -> bool {
    matches!(
        tag,
        "area"
            | "base"
            | "br"
            | "col"
            | "embed"
            | "hr"
            | "img"
            | "input"
            | "link"
            | "meta"
            | "source"
            | "track"
            | "wbr"
    )
}

fn escape_text(value: &str) -> Option<String> {
    if value.contains('\0') {
        return None;
    }
    Some(value.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;"))
}

fn escape_attr(value: &str) -> Option<String> {
    if value.contains('\0') {
        return None;
    }
    Some(
        value
            .replace('&', "&amp;")
            .replace('"', "&quot;")
            .replace('<', "&lt;")
            .replace('>', "&gt;"),
    )
}

fn normalized_attr_name(name: &str) -> &str {
    match name {
        "className" => "class",
        "htmlFor" => "for",
        "acceptCharset" => "accept-charset",
        "httpEquiv" => "http-equiv",
        _ => name,
    }
}

fn is_boolean_attr(name: &str) -> bool {
    matches!(
        name,
        "allowFullScreen"
            | "async"
            | "autoFocus"
            | "autoPlay"
            | "checked"
            | "controls"
            | "default"
            | "defer"
            | "disabled"
            | "formNoValidate"
            | "hidden"
            | "inert"
            | "loop"
            | "multiple"
            | "muted"
            | "noModule"
            | "noValidate"
            | "open"
            | "playsInline"
            | "readOnly"
            | "required"
            | "reversed"
            | "selected"
    )
}

fn static_expr_attr_value(name: &str, expr: &Expr) -> Option<Option<String>> {
    let expr = crate::utils::unwrap_expr(expr);
    if is_boolean_attr(name) {
        return match expr {
            Expr::Lit(Lit::Bool(value)) => Some(value.value.then(String::new)),
            Expr::Lit(Lit::Str(value)) => Some((!value.value.is_empty()).then(String::new)),
            Expr::Lit(Lit::Num(value)) => {
                Some((value.value != 0.0 && !value.value.is_nan()).then(String::new))
            }
            Expr::Lit(Lit::Null(_)) => Some(None),
            _ => None,
        };
    }

    match expr {
        Expr::Lit(Lit::Str(value)) => Some(Some(value.value.as_str()?.to_string())),
        Expr::Lit(Lit::Num(value)) => Some(Some(value.value.to_string())),
        Expr::Lit(Lit::Bool(value)) => {
            Some(Some(if value.value { "true" } else { "false" }.to_string()))
        }
        _ => None,
    }
}

fn attr_needs_runtime(tag: &str, attr: &JSXAttr) -> Option<bool> {
    let JSXAttrName::Ident(name) = &attr.name else {
        return None;
    };
    let name = name.sym.as_ref();
    if name == TEMPLATE_MARKER_ATTR || name == "key" {
        return Some(false);
    }
    if name == "dangerouslySetInnerHTML"
        || name == "is"
        || (name == "value" && matches!(tag, "select" | "textarea"))
        || name.starts_with("__rue_")
    {
        return None;
    }
    if name == "ref" || name.to_ascii_lowercase().starts_with("on") {
        return Some(true);
    }

    match &attr.value {
        Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
            expr: JSXExpr::Expr(expr),
            ..
        })) => Some(static_expr_attr_value(name, expr).is_none()),
        Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
            expr: JSXExpr::JSXEmptyExpr(_),
            ..
        })) => Some(false),
        Some(JSXAttrValue::Str(_)) | None => Some(false),
        _ => None,
    }
}

fn serialize_attr(tag: &str, attr: &JSXAttr, out: &mut String) -> Option<bool> {
    let needs_runtime = attr_needs_runtime(tag, attr)?;
    if needs_runtime {
        return Some(true);
    }

    let JSXAttrName::Ident(name) = &attr.name else {
        return None;
    };
    let name = name.sym.as_ref();
    if name == TEMPLATE_MARKER_ATTR || name == "key" {
        return Some(false);
    }

    let value = match &attr.value {
        Some(JSXAttrValue::Str(value)) => {
            if is_boolean_attr(name) {
                Some(String::new())
            } else {
                Some(value.value.as_str()?.to_string())
            }
        }
        Some(JSXAttrValue::JSXExprContainer(container)) => {
            let JSXExpr::Expr(expr) = &container.expr else {
                return None;
            };
            static_expr_attr_value(name, expr)?
        }
        None if is_boolean_attr(name) => Some(String::new()),
        None if name.starts_with("data-") || name.starts_with("aria-") => Some("true".to_string()),
        None => return None,
        _ => return None,
    };

    let Some(value) = value else {
        return Some(false);
    };
    out.push(' ');
    out.push_str(normalized_attr_name(name));
    out.push_str("=\"");
    out.push_str(&escape_attr(&value)?);
    out.push('"');
    Some(false)
}

fn serialize_children(
    children: &[JSXElementChild],
    out: &mut String,
    text_holes: &mut Vec<TextHolePlan>,
    attr_targets: &mut Vec<AttrTargetPlan>,
    has_static_expr_text: &mut bool,
    path: &mut Vec<usize>,
) -> Option<()> {
    let mut child_node_index = 0;
    let mut previous_is_text = false;
    serialize_children_at(
        children,
        out,
        text_holes,
        attr_targets,
        has_static_expr_text,
        path,
        &mut child_node_index,
        &mut previous_is_text,
    )
}

fn serialize_children_at(
    children: &[JSXElementChild],
    out: &mut String,
    text_holes: &mut Vec<TextHolePlan>,
    attr_targets: &mut Vec<AttrTargetPlan>,
    has_static_expr_text: &mut bool,
    path: &mut Vec<usize>,
    child_node_index: &mut usize,
    previous_is_text: &mut bool,
) -> Option<()> {
    for (index, child) in children.iter().enumerate() {
        match child {
            JSXElementChild::JSXText(text) => {
                let normalized = crate::text::normalize_text(&text.value);
                if let Some(content) =
                    crate::text::compute_jsx_text_content(children, index, &normalized)
                {
                    out.push_str(&escape_text(&content)?);
                    if !*previous_is_text {
                        *child_node_index += 1;
                    }
                    *previous_is_text = true;
                }
            }
            JSXElementChild::JSXElement(element) => {
                path.push(*child_node_index);
                let out_len = out.len();
                let hole_len = text_holes.len();
                let target_len = attr_targets.len();
                let previous_static_expr = *has_static_expr_text;
                if serialize_element(
                    element,
                    out,
                    text_holes,
                    attr_targets,
                    has_static_expr_text,
                    path,
                )
                .is_none()
                {
                    out.truncate(out_len);
                    text_holes.truncate(hole_len);
                    attr_targets.truncate(target_len);
                    *has_static_expr_text = previous_static_expr;
                    let hole_index = text_holes.len();
                    text_holes.push(TextHolePlan {
                        index: hole_index,
                        path: path.clone(),
                        parent_path: None,
                        before_path: None,
                        kind: TemplateHoleKind::OpaqueElement,
                        reuse_text: false,
                    });
                    out.push_str(&format!("<!--rue:opaque-hole:{hole_index}-->"));
                }
                path.pop();
                *child_node_index += 1;
                *previous_is_text = false;
            }
            JSXElementChild::JSXFragment(fragment) => {
                serialize_children_at(
                    &fragment.children,
                    out,
                    text_holes,
                    attr_targets,
                    has_static_expr_text,
                    path,
                    child_node_index,
                    previous_is_text,
                )?;
            }
            JSXElementChild::JSXExprContainer(container)
                if matches!(container.expr, JSXExpr::JSXEmptyExpr(_)) => {}
            JSXElementChild::JSXExprContainer(JSXExprContainer {
                expr: JSXExpr::Expr(expr),
                ..
            }) if crate::utils::get_static_text_literal_expr(expr.as_ref()).is_some() => {
                let Expr::Lit(Lit::Str(value)) =
                    crate::utils::get_static_text_literal_expr(expr.as_ref())?
                else {
                    return None;
                };
                let content = value.value.as_str()?;
                if !content.is_empty() {
                    *has_static_expr_text = true;
                    out.push_str(&escape_text(content)?);
                    if !*previous_is_text {
                        *child_node_index += 1;
                    }
                    *previous_is_text = true;
                }
            }
            JSXElementChild::JSXExprContainer(container) if is_child_hole_container(container) => {
                let hole_index = text_holes.len();
                let next_static_path =
                    stable_static_successor_path(children, index + 1, path, *child_node_index);
                let sole_tail_branch = *child_node_index == 0
                    && !*previous_is_text
                    && only_ignorable_children(&children[index + 1..])
                    && is_proven_non_empty_single_root_branch(container);
                let real_boundary = next_static_path.is_some()
                    && (is_proven_non_empty_single_root_branch(container)
                        || matches!(
                            &container.expr,
                            JSXExpr::Expr(expr)
                                if crate::element_expr::is_compiled_slot_source_expr(expr.as_ref())
                        ))
                    || sole_tail_branch;
                let mut hole_path = path.clone();
                if let Some(before_path) = &next_static_path {
                    hole_path = before_path.clone();
                } else if !real_boundary {
                    hole_path.push(*child_node_index);
                }
                text_holes.push(TextHolePlan {
                    index: hole_index,
                    path: hole_path,
                    parent_path: real_boundary.then(|| path.clone()),
                    before_path: real_boundary.then_some(next_static_path).flatten(),
                    kind: TemplateHoleKind::Expression,
                    reuse_text: false,
                });
                if !real_boundary {
                    out.push_str(&format!("<!--rue:text-hole:{hole_index}-->"));
                    *child_node_index += 1;
                    *previous_is_text = false;
                }
            }
            JSXElementChild::JSXExprContainer(_) | JSXElementChild::JSXSpreadChild(_) => {
                return None;
            }
        }
    }
    Some(())
}

fn only_ignorable_children(children: &[JSXElementChild]) -> bool {
    children.iter().all(|child| match child {
        JSXElementChild::JSXText(text) => {
            crate::text::normalize_text(&text.value).trim().is_empty()
        }
        JSXElementChild::JSXExprContainer(container) => {
            matches!(container.expr, JSXExpr::JSXEmptyExpr(_))
        }
        _ => false,
    })
}

fn stable_static_successor_path(
    children: &[JSXElementChild],
    start: usize,
    parent_path: &[usize],
    child_node_index: usize,
) -> Option<Vec<usize>> {
    for child in &children[start..] {
        match child {
            JSXElementChild::JSXText(text)
                if crate::text::normalize_text(&text.value).trim().is_empty() => {}
            JSXElementChild::JSXExprContainer(container)
                if matches!(container.expr, JSXExpr::JSXEmptyExpr(_)) => {}
            JSXElementChild::JSXElement(element) if StaticTemplate::classify(element).is_some() => {
                let mut path = parent_path.to_vec();
                path.push(child_node_index);
                return Some(path);
            }
            _ => return None,
        }
    }
    None
}

fn is_proven_non_empty_single_root_branch(container: &JSXExprContainer) -> bool {
    fn result(expr: &Expr) -> bool {
        match crate::utils::unwrap_expr(expr) {
            Expr::JSXElement(element) => {
                !crate::utils::is_component(&element.opening.name)
                    && StaticTemplate::classify(element).is_some()
            }
            Expr::Cond(cond) => result(cond.cons.as_ref()) && result(cond.alt.as_ref()),
            _ => false,
        }
    }

    matches!(&container.expr, JSXExpr::Expr(expr) if matches!(crate::utils::unwrap_expr(expr.as_ref()), Expr::Cond(_)) && result(expr.as_ref()))
}

fn serialize_element(
    element: &JSXElement,
    out: &mut String,
    text_holes: &mut Vec<TextHolePlan>,
    attr_targets: &mut Vec<AttrTargetPlan>,
    has_static_expr_text: &mut bool,
    path: &mut Vec<usize>,
) -> Option<()> {
    let tag = html_tag_name(&element.opening.name)?;
    if matches!(tag, "body" | "head" | "html" | "iframe" | "noscript" | "svg" | "math")
        || crate::custom_element::is_custom_element_tag(tag)
    {
        return None;
    }

    out.push('<');
    out.push_str(tag);
    let mut has_runtime_attrs = false;
    for attr in &element.opening.attrs {
        match attr {
            JSXAttrOrSpread::JSXAttr(attr) => {
                has_runtime_attrs |= serialize_attr(tag, attr, out)?;
            }
            JSXAttrOrSpread::SpreadElement(_) => has_runtime_attrs = true,
        }
    }
    if has_runtime_attrs {
        attr_targets.push(AttrTargetPlan { path: path.clone() });
    }
    out.push('>');

    let children_start = out.len();
    let holes_start = text_holes.len();
    serialize_children(
        &element.children,
        out,
        text_holes,
        attr_targets,
        has_static_expr_text,
        path,
    )?;
    // Only one literal JSX expression in an ordinary text container: no parser
    // coalescing, foster parenting, raw text, fragments, or whitespace ambiguity.
    if matches!(
        tag,
        "a" | "span" | "li" | "div" | "p" | "b" | "strong" | "em" | "td" | "th" | "button"
    ) && matches!(
        element.children.as_slice(),
        [JSXElementChild::JSXExprContainer(container)] if is_direct_text_candidate(container)
    ) && text_holes.len() == holes_start + 1
    {
        text_holes[holes_start].reuse_text = true;
    }
    if is_void_tag(tag) {
        if out.len() != children_start {
            return None;
        }
        return Some(());
    }

    out.push_str("</");
    out.push_str(tag);
    out.push('>');
    Some(())
}

fn is_child_hole_container(container: &JSXExprContainer) -> bool {
    matches!(
        &container.expr,
        JSXExpr::Expr(expr)
            if !crate::utils::is_static_empty_like(expr.as_ref())
                && crate::utils::get_static_text_literal_expr(expr.as_ref()).is_none()
    )
}

fn is_direct_text_candidate(container: &JSXExprContainer) -> bool {
    fn candidate(expr: &Expr) -> bool {
        match crate::utils::unwrap_expr(expr) {
            Expr::Lit(Lit::Str(_) | Lit::Bool(_) | Lit::Null(_) | Lit::Num(_) | Lit::BigInt(_)) => {
                true
            }
            Expr::Ident(ident) => ident.sym.as_ref() == "undefined",
            Expr::Member(member) => {
                !matches!(&member.prop, MemberProp::Ident(property) if property.sym == *"children")
            }
            Expr::Call(call) => {
                let Callee::Expr(callee) = &call.callee else {
                    return false;
                };
                match crate::utils::unwrap_expr(callee.as_ref()) {
                    Expr::Ident(name)
                        if matches!(name.sym.as_ref(), "String" | "Number" | "Boolean") =>
                    {
                        call.args.len() == 1
                            && call.args[0].spread.is_none()
                            && candidate(call.args[0].expr.as_ref())
                    }
                    Expr::Member(member) if matches!(&member.prop, MemberProp::Ident(property) if property.sym == *"get") => {
                        call.args.is_empty()
                            && !matches!(
                                crate::utils::unwrap_expr(member.obj.as_ref()),
                                Expr::Ident(object) if object.sym.starts_with("_$rueCompiledSlot")
                            )
                    }
                    _ => false,
                }
            }
            Expr::Unary(unary) => {
                !matches!(unary.op, UnaryOp::Delete) && candidate(unary.arg.as_ref())
            }
            Expr::Bin(binary) => {
                candidate(binary.left.as_ref()) && candidate(binary.right.as_ref())
            }
            Expr::Cond(cond) => {
                candidate(cond.test.as_ref())
                    && candidate(cond.cons.as_ref())
                    && candidate(cond.alt.as_ref())
            }
            Expr::Tpl(template) => template.exprs.iter().all(|expr| candidate(expr.as_ref())),
            Expr::Seq(sequence) => sequence.exprs.iter().all(|expr| candidate(expr.as_ref())),
            _ => false,
        }
    }

    matches!(&container.expr, JSXExpr::Expr(expr) if candidate(expr.as_ref()))
}

fn marker_id(element: &JSXElement) -> Option<usize> {
    element.opening.attrs.iter().find_map(|attr| {
        let JSXAttrOrSpread::JSXAttr(attr) = attr else {
            return None;
        };
        let JSXAttrName::Ident(name) = &attr.name else {
            return None;
        };
        if name.sym.as_ref() != TEMPLATE_MARKER_ATTR {
            return None;
        }
        let Some(JSXAttrValue::Str(value)) = &attr.value else {
            return None;
        };
        value.value.as_str()?.parse().ok()
    })
}

pub(crate) fn marked_static_template(element: &JSXElement) -> Option<(StaticTemplate, usize)> {
    let id = marker_id(element)?;
    let template = StaticTemplate::classify(element)?;
    matches!(template.kind, StaticTemplateKind::Pure).then_some((template, id))
}

pub(crate) fn marked_dynamic_template(
    element: &JSXElement,
) -> Option<(usize, Vec<MarkedTextHole<'_>>, Vec<MarkedAttrTarget<'_>>)> {
    fn serializes_as_template_root(element: &JSXElement) -> bool {
        let mut html = String::new();
        let mut holes = Vec::new();
        let mut targets = Vec::new();
        let mut has_static_expr_text = false;
        serialize_element(
            element,
            &mut html,
            &mut holes,
            &mut targets,
            &mut has_static_expr_text,
            &mut Vec::new(),
        )
        .is_some()
    }

    fn collect_holes<'a>(element: &'a JSXElement, sources: &mut Vec<MarkedHoleSource<'a>>) {
        fn in_children<'a>(
            children: &'a [JSXElementChild],
            sources: &mut Vec<MarkedHoleSource<'a>>,
        ) {
            for child in children {
                match child {
                    JSXElementChild::JSXExprContainer(container)
                        if is_child_hole_container(container) =>
                    {
                        sources.push(MarkedHoleSource::Expression(container));
                    }
                    JSXElementChild::JSXElement(element)
                        if !serializes_as_template_root(element) =>
                    {
                        sources.push(MarkedHoleSource::OpaqueElement(element));
                    }
                    JSXElementChild::JSXElement(element) => collect_holes(element, sources),
                    JSXElementChild::JSXFragment(fragment) => {
                        in_children(&fragment.children, sources)
                    }
                    _ => {}
                }
            }
        }
        in_children(&element.children, sources);
    }

    let id = marker_id(element)?;
    // The million-and-up namespace is reserved for compiler-proven simple rows.
    let template = if id >= 1_000_000 {
        StaticTemplate::classify_simple_row(element)?
    } else {
        StaticTemplate::classify(element)?
    };
    let StaticTemplateKind::Dynamic { holes, targets } = template.kind else {
        return None;
    };
    let mut sources = Vec::new();
    collect_holes(element, &mut sources);
    if holes.len() != sources.len() {
        return None;
    }
    let marked_holes = holes
        .into_iter()
        .zip(sources)
        .map(|(plan, source)| {
            let source_kind = match source {
                MarkedHoleSource::Expression(_) => TemplateHoleKind::Expression,
                MarkedHoleSource::OpaqueElement(_) => TemplateHoleKind::OpaqueElement,
            };
            (plan.kind == source_kind).then_some(MarkedTextHole {
                index: plan.index,
                path: plan.path,
                parent_path: plan.parent_path,
                before_path: plan.before_path,
                reuse_text: plan.reuse_text,
                source,
            })
        })
        .collect::<Option<Vec<_>>>()?;

    fn collect_targets<'a>(element: &'a JSXElement, openings: &mut Vec<&'a JSXOpeningElement>) {
        fn in_children<'a>(
            children: &'a [JSXElementChild],
            openings: &mut Vec<&'a JSXOpeningElement>,
        ) {
            for child in children {
                match child {
                    JSXElementChild::JSXElement(element)
                        if serializes_as_template_root(element) =>
                    {
                        collect_targets(element, openings)
                    }
                    JSXElementChild::JSXFragment(fragment) => {
                        in_children(&fragment.children, openings)
                    }
                    _ => {}
                }
            }
        }

        let Some(tag) = html_tag_name(&element.opening.name) else {
            return;
        };
        let has_runtime_attrs = element.opening.attrs.iter().any(|attr| match attr {
            JSXAttrOrSpread::SpreadElement(_) => true,
            JSXAttrOrSpread::JSXAttr(attr) => attr_needs_runtime(tag, attr) == Some(true),
        });
        if has_runtime_attrs {
            openings.push(&element.opening);
        }
        in_children(&element.children, openings);
    }

    let mut openings = Vec::new();
    collect_targets(element, &mut openings);
    if targets.len() != openings.len() {
        return None;
    }
    let marked_targets = targets
        .into_iter()
        .zip(openings)
        .map(|(plan, opening)| MarkedAttrTarget { path: plan.path, opening })
        .collect::<Vec<_>>();
    Some((id, marked_holes, marked_targets))
}

struct StaticTemplateCollector {
    hoisted_templates: Vec<HoistedTemplate>,
    used_names: HashSet<String>,
    next_id: usize,
}

impl StaticTemplateCollector {
    fn new(used_names: HashSet<String>) -> Self {
        Self { hoisted_templates: Vec::new(), used_names, next_id: 1 }
    }

    fn intern(&mut self, template: StaticTemplate) -> usize {
        if let Some(index) =
            self.hoisted_templates.iter().position(|existing| existing.html == template.html)
        {
            return self.hoisted_templates[index].id;
        }

        let id = loop {
            let id = self.next_id;
            self.next_id += 1;
            let getter = format!("_$getTemplate{id}");
            if !self.used_names.contains(&getter) {
                self.used_names.insert(getter);
                break id;
            }
        };
        self.hoisted_templates.push(HoistedTemplate {
            id,
            getter: ident(&format!("_$getTemplate{id}")),
            html: template.html,
        });
        id
    }
}

impl VisitMut for StaticTemplateCollector {
    fn visit_mut_jsx_element(&mut self, element: &mut JSXElement) {
        if crate::utils::is_component(&element.opening.name) {
            element.children.visit_mut_with(self);
            return;
        }

        if let Some(template) = StaticTemplate::classify(element) {
            let id = self.intern(template);
            element.opening.attrs.push(JSXAttrOrSpread::JSXAttr(JSXAttr {
                span: DUMMY_SP,
                name: JSXAttrName::Ident(ident(TEMPLATE_MARKER_ATTR).into()),
                value: Some(JSXAttrValue::Str(Str {
                    span: DUMMY_SP,
                    value: id.to_string().into(),
                    raw: None,
                })),
            }));
            return;
        }

        let boundary_tag = match &element.opening.name {
            JSXElementName::Ident(name) => name.sym.as_ref(),
            _ => return,
        };
        if matches!(boundary_tag, "svg" | "math")
            || crate::custom_element::is_custom_element_tag(boundary_tag)
        {
            return;
        }
        element.visit_mut_children_with(self);
    }
}

pub(crate) fn collect_hoisted_templates(module: &mut Module) -> Vec<HoistedTemplate> {
    #[derive(Default)]
    struct IdentCollector {
        names: HashSet<String>,
    }

    impl Visit for IdentCollector {
        fn visit_ident(&mut self, ident: &Ident) {
            self.names.insert(ident.sym.to_string());
        }
    }

    let mut identifiers = IdentCollector::default();
    module.visit_with(&mut identifiers);
    let mut collector = StaticTemplateCollector::new(identifiers.names);
    module.visit_mut_children_with(&mut collector);
    collector.hoisted_templates
}

fn expr_stmt(expr: Expr) -> Stmt {
    Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(expr) })
}

fn member_expr(object: Expr, property: &str) -> Expr {
    Expr::Member(MemberExpr {
        span: DUMMY_SP,
        obj: Box::new(object),
        prop: MemberProp::Ident(ident_name(property)),
    })
}

fn call_expr(callee: Expr, args: Vec<Expr>) -> Expr {
    Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(callee)),
        args: args
            .into_iter()
            .map(|expr| ExprOrSpread { spread: None, expr: Box::new(expr) })
            .collect(),
        type_args: None,
        ctxt: SyntaxContext::empty(),
    })
}

fn call_member(object: Expr, property: &str, args: Vec<Expr>) -> Expr {
    call_expr(member_expr(object, property), args)
}

fn var_decl(kind: VarDeclKind, name: Ident, init: Option<Expr>) -> Stmt {
    Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        kind,
        declare: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: Pat::Ident(BindingIdent { id: name, type_ann: None }),
            init: init.map(Box::new),
            definite: false,
        }],
    })))
}

fn arrow(params: Vec<Pat>, stmts: Vec<Stmt>) -> Expr {
    Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params,
        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            stmts,
        })),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    })
}

fn return_expr(expr: Expr) -> Stmt {
    Stmt::Return(ReturnStmt { span: DUMMY_SP, arg: Some(Box::new(expr)) })
}

fn template_getter_call(id: usize) -> Expr {
    call_expr(Expr::Ident(ident(&format!("_$getTemplate{id}"))), Vec::new())
}

pub(crate) fn clone_template_expr(id: usize) -> Expr {
    call_member(
        member_expr(template_getter_call(id), "content"),
        "cloneNode",
        vec![Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true }))],
    )
}

fn child_node_path(root: Expr, path: &[usize]) -> Expr {
    path.iter().fold(root, |node, index| {
        Expr::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(member_expr(node, "childNodes")),
            prop: MemberProp::Computed(ComputedPropName {
                span: DUMMY_SP,
                expr: Box::new(Expr::Lit(Lit::Num(Number {
                    span: DUMMY_SP,
                    value: *index as f64,
                    raw: None,
                }))),
            }),
        })
    })
}

fn resolve_vapor_hole(
    transform: &mut super::VaporTransform,
    root: &Ident,
    hole: &MarkedTextHole<'_>,
    path_stmts: &mut Vec<Stmt>,
    mutation_stmts: &mut Vec<Stmt>,
) -> (Ident, Ident, bool) {
    if let Some(parent_path) = &hole.parent_path {
        let hole_parent = transform.next_el_ident();
        path_stmts.push(crate::emit::const_decl(
            hole_parent.clone(),
            child_node_path(Expr::Ident(root.clone()), parent_path),
        ));
        let before = hole
            .before_path
            .as_ref()
            .map(|path| {
                let before = transform.next_el_ident();
                path_stmts.push(crate::emit::const_decl(
                    before.clone(),
                    child_node_path(Expr::Ident(root.clone()), path),
                ));
                Expr::Ident(before)
            })
            .unwrap_or(Expr::Lit(Lit::Null(Null { span: DUMMY_SP })));
        let anchor = transform.next_el_ident();
        mutation_stmts.push(crate::emit::const_decl(
            anchor.clone(),
            call_ident("_$createComment", vec![string_expr("rue:slot:anchor")]),
        ));
        mutation_stmts.push(expr_stmt(call_member(
            Expr::Ident(hole_parent.clone()),
            "insertBefore",
            vec![Expr::Ident(anchor.clone()), before],
        )));
        return (hole_parent, anchor, false);
    }

    let anchor = transform.next_el_ident();
    path_stmts.push(crate::emit::const_decl(
        anchor.clone(),
        child_node_path(Expr::Ident(root.clone()), &hole.path),
    ));
    let hole_parent = transform.next_el_ident();
    path_stmts.push(crate::emit::const_decl(
        hole_parent.clone(),
        member_expr(Expr::Ident(anchor.clone()), "parentNode"),
    ));
    let direct_text = hole.reuse_text
        && matches!(
            &hole.source,
            MarkedHoleSource::Expression(container)
                if super::block::expr_container::is_compiled_text_container(transform, container)
        );
    let anchor = if hole.reuse_text && !direct_text {
        crate::element_text::replace_template_text_marker_with_comment(
            transform,
            &hole_parent,
            &anchor,
            hole.index,
            "_$createComment",
            mutation_stmts,
        )
    } else {
        anchor
    };
    (hole_parent, anchor, direct_text)
}

pub(crate) fn emit_marked_template_child(
    transform: &mut super::VaporTransform,
    element: &JSXElement,
    parent: &Ident,
    stmts: &mut Vec<Stmt>,
) -> bool {
    if let Some((_, id)) = marked_static_template(element) {
        transform.next_el += static_element_count(element);
        stmts.push(expr_stmt(call_member(
            Expr::Ident(parent.clone()),
            "appendChild",
            vec![clone_template_expr(id)],
        )));
        return true;
    }

    let Some((id, holes, targets)) = marked_dynamic_template(element) else {
        return false;
    };
    let root = transform.next_el_ident();
    let fragment = ident(&format!("{}_fragment", root.sym));
    stmts.push(crate::emit::const_decl(fragment.clone(), clone_template_expr(id)));
    stmts.push(crate::emit::const_decl(
        root.clone(),
        member_expr(Expr::Ident(fragment.clone()), "firstChild"),
    ));
    let target_idents = targets
        .iter()
        .map(|target| {
            let target_ident = transform.next_el_ident();
            stmts.push(crate::emit::const_decl(
                target_ident.clone(),
                child_node_path(Expr::Ident(root.clone()), &target.path),
            ));
            (target, target_ident)
        })
        .collect::<Vec<_>>();
    let mut hole_mutations = Vec::new();
    let hole_idents = holes
        .iter()
        .map(|hole| {
            let (hole_parent, anchor, direct_text) =
                resolve_vapor_hole(transform, &root, hole, stmts, &mut hole_mutations);
            (hole, hole_parent, anchor, direct_text)
        })
        .collect::<Vec<_>>();
    stmts.append(&mut hole_mutations);
    stmts.push(expr_stmt(call_member(
        Expr::Ident(parent.clone()),
        "appendChild",
        vec![Expr::Ident(fragment)],
    )));
    for (target, target_ident) in &target_idents {
        crate::attrs::emit_attrs_for(stmts, target_ident, target.opening);
    }
    for (expected_index, (hole, hole_parent, anchor, direct_text)) in
        hole_idents.into_iter().enumerate()
    {
        if hole.index != expected_index {
            return false;
        }
        match &hole.source {
            MarkedHoleSource::Expression(container) if direct_text => {
                if super::block::expr_container::emit_compiled_text_effect(
                    transform, &anchor, container, stmts,
                )
                .is_none()
                {
                    return false;
                }
            }
            MarkedHoleSource::Expression(container) => {
                crate::element_expr::emit_element_expr_container_child_at(
                    transform,
                    &hole_parent,
                    &anchor,
                    container,
                    stmts,
                );
            }
            MarkedHoleSource::OpaqueElement(element) => {
                crate::elements::build_element_at(transform, element, &hole_parent, &anchor, stmts);
            }
        }
    }
    transform.next_el +=
        static_element_count(element).saturating_sub(1 + target_idents.len() + holes.len() * 2);
    true
}

pub(crate) fn dynamic_template_to_vapor_block(
    transform: &mut super::VaporTransform,
    element: &JSXElement,
) -> Option<BlockStmt> {
    let (id, holes, targets) = marked_dynamic_template(element)?;
    let fragment = ident("_fragment");
    let root = ident("_root");
    let mut stmts = vec![
        crate::emit::const_decl(fragment.clone(), clone_template_expr(id)),
        crate::emit::const_decl(root.clone(), member_expr(Expr::Ident(fragment), "firstChild")),
    ];
    let target_idents =
        targets.iter().map(|target| (target, transform.next_el_ident())).collect::<Vec<_>>();
    for (target, target_ident) in &target_idents {
        stmts.push(crate::emit::const_decl(
            target_ident.clone(),
            child_node_path(Expr::Ident(root.clone()), &target.path),
        ));
    }
    let mut hole_mutations = Vec::new();
    let hole_idents = holes
        .iter()
        .map(|hole| {
            let (hole_parent, anchor, direct_text) =
                resolve_vapor_hole(transform, &root, hole, &mut stmts, &mut hole_mutations);
            (hole, hole_parent, anchor, direct_text)
        })
        .collect::<Vec<_>>();
    stmts.append(&mut hole_mutations);
    for (target, target_ident) in &target_idents {
        crate::attrs::emit_attrs_for(&mut stmts, target_ident, target.opening);
    }
    for (expected_index, (hole, hole_parent, anchor, direct_text)) in
        hole_idents.into_iter().enumerate()
    {
        if hole.index != expected_index {
            return None;
        }
        match &hole.source {
            MarkedHoleSource::Expression(container) if direct_text => {
                super::block::expr_container::emit_compiled_text_effect(
                    transform, &anchor, container, &mut stmts,
                )?;
            }
            MarkedHoleSource::Expression(container) => {
                crate::element_expr::emit_element_expr_container_child_at(
                    transform,
                    &hole_parent,
                    &anchor,
                    container,
                    &mut stmts,
                );
            }
            MarkedHoleSource::OpaqueElement(element) => {
                crate::elements::build_element_at(
                    transform,
                    element,
                    &hole_parent,
                    &anchor,
                    &mut stmts,
                );
            }
        }
    }
    transform.next_el +=
        static_element_count(element).saturating_sub(target_idents.len() + holes.len() * 2);
    stmts.push(crate::emit::return_root(root));
    Some(BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts })
}

fn static_element_count(element: &JSXElement) -> usize {
    fn child_count(child: &JSXElementChild) -> usize {
        match child {
            JSXElementChild::JSXElement(element) => static_element_count(element),
            JSXElementChild::JSXFragment(fragment) => {
                fragment.children.iter().map(child_count).sum()
            }
            _ => 0,
        }
    }

    1 + element.children.iter().map(child_count).sum::<usize>()
}

pub(crate) fn static_root_handle_expr(element: &JSXElement) -> Option<(Expr, usize)> {
    let (_, id) = marked_static_template(element)?;
    let root = ident("_root");
    let fragment = ident("_fragment");
    let parent_context = ident("__rue_parent_context");

    let setup_arrow = arrow(
        vec![Pat::Ident(BindingIdent { id: parent_context, type_ann: None })],
        vec![
            var_decl(VarDeclKind::Const, fragment.clone(), Some(clone_template_expr(id))),
            var_decl(
                VarDeclKind::Const,
                root.clone(),
                Some(member_expr(Expr::Ident(fragment), "firstChild")),
            ),
            return_expr(Expr::Ident(root.clone())),
        ],
    );
    Some((
        call_ident("_$compiledRoot", vec![setup_arrow]),
        static_element_count(element).saturating_sub(1),
    ))
}

fn hoisted_template_items(template: &HoistedTemplate) -> Vec<ModuleItem> {
    let getter = call_expr(Expr::Ident(ident("_$template")), vec![string_expr(&template.html)]);

    vec![ModuleItem::Stmt(var_decl(VarDeclKind::Const, template.getter.clone(), Some(getter)))]
}

pub(crate) fn inject_hoisted_templates(module: &mut Module, templates: &[HoistedTemplate]) {
    if templates.is_empty() {
        return;
    }
    let insertion = module
        .body
        .iter()
        .take_while(|item| {
            matches!(item, ModuleItem::ModuleDecl(ModuleDecl::Import(_)))
                || matches!(
                    item,
                    ModuleItem::Stmt(Stmt::Expr(ExprStmt { expr, .. }))
                        if matches!(expr.as_ref(), Expr::Lit(Lit::Str(_)))
                )
        })
        .count();
    let items = templates.iter().flat_map(hoisted_template_items).collect::<Vec<_>>();
    module.body.splice(insertion..insertion, items);
}

#[derive(Default)]
struct UsedTemplateGetterCollector {
    names: HashSet<String>,
}

impl Visit for UsedTemplateGetterCollector {
    fn visit_ident(&mut self, ident: &Ident) {
        if ident.sym.starts_with("_$getTemplate") {
            self.names.insert(ident.sym.to_string());
        }
    }
}

pub(crate) fn retain_used_hoisted_templates(module: &Module, templates: &mut Vec<HoistedTemplate>) {
    let mut collector = UsedTemplateGetterCollector::default();
    module.visit_with(&mut collector);
    templates.retain(|template| collector.names.contains(template.getter.sym.as_ref()));
}

struct TemplateMarkerStripper;

impl VisitMut for TemplateMarkerStripper {
    fn visit_mut_jsx_opening_element(&mut self, opening: &mut JSXOpeningElement) {
        opening.attrs.retain(|attr| {
            !matches!(
                attr,
                JSXAttrOrSpread::JSXAttr(JSXAttr {
                    name: JSXAttrName::Ident(name),
                    ..
                }) if name.sym.as_ref() == TEMPLATE_MARKER_ATTR
            )
        });
        opening.visit_mut_children_with(self);
    }
}

pub(crate) fn strip_template_markers(module: &mut Module) {
    module.visit_mut_with(&mut TemplateMarkerStripper);
}

#[cfg(test)]
#[path = "template_tests.rs"]
mod tests;
