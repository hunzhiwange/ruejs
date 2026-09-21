// SWC 常量与上下文：
// - DUMMY_SP：稳定的 span 占位
// - SyntaxContext：统一 empty 上下文
use swc_core::common::{DUMMY_SP, SyntaxContext};
// SWC ECMAScript/JSX AST 节点类型集合（JSXOpeningElement/JSXAttr/Expr 等）
use swc_core::ecma::ast::*;

use crate::emit::*;
use crate::log;
use crate::utils::unwrap_expr;

fn push_expr_stmt(stmts: &mut Vec<Stmt>, expr: Expr) {
    stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(expr) }));
}

fn get_static_literal_value_expr(e: &Expr) -> Option<Expr> {
    match unwrap_expr(e) {
        Expr::Lit(Lit::Str(s)) => Some(Expr::Lit(Lit::Str(s.clone()))),
        Expr::Lit(Lit::Num(n)) => Some(Expr::Lit(Lit::Num(n.clone()))),
        Expr::Lit(Lit::Bool(b)) => Some(Expr::Lit(Lit::Bool(*b))),
        Expr::Lit(Lit::Null(n)) => Some(Expr::Lit(Lit::Null(*n))),
        Expr::Ident(id) if id.sym.as_ref() == "undefined" => Some(Expr::Ident(id.clone())),
        Expr::Unary(u) if matches!(u.op, UnaryOp::Void) => Some(Expr::Unary(u.clone())),
        _ => None,
    }
}

fn get_static_stringified_expr(e: &Expr) -> Option<Expr> {
    match unwrap_expr(e) {
        Expr::Lit(Lit::Str(s)) => Some(Expr::Lit(Lit::Str(s.clone()))),
        Expr::Lit(Lit::Num(n)) => Some(string_expr(&n.value.to_string())),
        Expr::Lit(Lit::Bool(b)) => Some(string_expr(if b.value { "true" } else { "false" })),
        Expr::Lit(Lit::Null(_)) => Some(string_expr("null")),
        Expr::Ident(id) if id.sym.as_ref() == "undefined" => Some(string_expr("undefined")),
        Expr::Unary(u) if matches!(u.op, UnaryOp::Void) => Some(string_expr("undefined")),
        _ => None,
    }
}

fn get_static_truthy_bool(e: &Expr) -> Option<bool> {
    match unwrap_expr(e) {
        Expr::Lit(Lit::Str(s)) => Some(!s.value.is_empty()),
        Expr::Lit(Lit::Num(n)) => Some(n.value != 0.0 && !n.value.is_nan()),
        Expr::Lit(Lit::Bool(b)) => Some(b.value),
        Expr::Lit(Lit::Null(_)) => Some(false),
        Expr::Ident(id) if id.sym.as_ref() == "undefined" => Some(false),
        Expr::Unary(u) if matches!(u.op, UnaryOp::Void) => Some(false),
        _ => None,
    }
}

fn get_static_style_object_expr(obj: &ObjectLit) -> Option<Expr> {
    let mut props = Vec::with_capacity(obj.props.len());
    for prop in &obj.props {
        match prop {
            PropOrSpread::Prop(prop) => match &**prop {
                Prop::KeyValue(kv) => {
                    let value = get_static_literal_value_expr(kv.value.as_ref())?;
                    props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                        key: kv.key.clone(),
                        value: Box::new(value),
                    }))));
                }
                _ => return None,
            },
            PropOrSpread::Spread(_) => return None,
        }
    }
    Some(Expr::Object(ObjectLit { span: obj.span, props }))
}

fn get_static_style_expr(e: &Expr) -> Option<Expr> {
    match unwrap_expr(e) {
        Expr::Object(obj) => get_static_style_object_expr(obj),
        Expr::Lit(Lit::Str(s)) => Some(Expr::Lit(Lit::Str(s.clone()))),
        Expr::Lit(Lit::Num(n)) => Some(Expr::Lit(Lit::Num(n.clone()))),
        Expr::Lit(Lit::Bool(b)) => Some(Expr::Lit(Lit::Bool(*b))),
        Expr::Lit(Lit::Null(n)) => Some(Expr::Lit(Lit::Null(*n))),
        Expr::Ident(id) if id.sym.as_ref() == "undefined" => Some(Expr::Ident(id.clone())),
        Expr::Unary(u) if matches!(u.op, UnaryOp::Void) => Some(Expr::Unary(u.clone())),
        _ => None,
    }
}

fn emit_static_multiple_assign(stmts: &mut Vec<Stmt>, target: &Ident, value: bool) {
    push_expr_stmt(
        stmts,
        Expr::Assign(AssignExpr {
            span: DUMMY_SP,
            op: AssignOp::Assign,
            left: AssignTarget::Simple(SimpleAssignTarget::Member(MemberExpr {
                span: DUMMY_SP,
                obj: Box::new(Expr::Ident(target.clone())),
                prop: MemberProp::Ident(ident_name("multiple")),
            })),
            right: Box::new(Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value }))),
        }),
    );
}

fn is_string_boolean_attr(name: &str) -> bool {
    name.starts_with("data-") || name.starts_with("aria-")
}

fn normalize_html_pattern(value: &str) -> String {
    let chars: Vec<char> = value.chars().collect();
    let mut normalized = String::with_capacity(value.len());
    let mut in_class = false;
    let mut first_class_token = false;
    let mut index = 0;

    while index < chars.len() {
        let character = chars[index];
        if character == '\\' {
            normalized.push(character);
            if let Some(next) = chars.get(index + 1) {
                normalized.push(*next);
                index += 1;
            }
            first_class_token = false;
        } else if !in_class && character == '[' {
            in_class = true;
            first_class_token = true;
            normalized.push(character);
        } else if in_class && character == '^' && first_class_token {
            normalized.push(character);
        } else if in_class && character == ']' {
            in_class = false;
            first_class_token = false;
            normalized.push(character);
        } else {
            if in_class
                && character == '-'
                && (first_class_token || chars.get(index + 1) == Some(&']'))
            {
                normalized.push('\\');
            }
            normalized.push(character);
            first_class_token = false;
        }
        index += 1;
    }

    normalized
}

fn normalized_static_attr_string(name: &str, value: &Str) -> Str {
    if name != "pattern" {
        return value.clone();
    }
    let Some(pattern) = value.value.as_str() else {
        return value.clone();
    };
    let mut normalized = value.clone();
    normalized.value = normalize_html_pattern(pattern).into();
    normalized.raw = None;
    normalized
}

fn normalized_static_attr_expr(name: &str, value: Expr) -> Expr {
    match value {
        Expr::Lit(Lit::Str(value)) => {
            Expr::Lit(Lit::Str(normalized_static_attr_string(name, &value)))
        }
        value => value,
    }
}

fn is_custom_element_opening(opening: &JSXOpeningElement) -> bool {
    match &opening.name {
        JSXElementName::Ident(id) => crate::custom_element::is_custom_element_tag(id.sym.as_ref()),
        _ => false,
    }
}

fn should_emit_custom_element_property(name: &str, inner: &Expr) -> bool {
    if name == "props" || name == "__rue_slots" || name.starts_with("__rue_context_") {
        return true;
    }

    matches!(unwrap_expr(inner), Expr::Object(_) | Expr::Array(_) | Expr::Arrow(_) | Expr::Fn(_))
}

fn emit_dynamic_property(stmts: &mut Vec<Stmt>, target: &Ident, name: &str, inner: &Expr) {
    let value = match inner {
        Expr::Member(_) | Expr::Ident(_) => {
            Expr::Paren(ParenExpr { span: DUMMY_SP, expr: Box::new(inner.clone()) })
        }
        _ => inner.clone(),
    };
    let set_prop =
        call_ident("_$setProperty", vec![Expr::Ident(target.clone()), string_expr(name), value]);
    let arrow = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            stmts: vec![Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(set_prop) })],
        })),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    let watch = call_ident("effect", vec![arrow]);
    stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(watch) }));
}

fn try_emit_static_expr_attr(
    stmts: &mut Vec<Stmt>,
    target: &Ident,
    name: &str,
    inner: &Expr,
) -> bool {
    if name == "style" {
        if let Some(style_expr) = get_static_style_expr(inner) {
            push_expr_stmt(
                stmts,
                call_ident("_$setStyle", vec![Expr::Ident(target.clone()), style_expr]),
            );
            return true;
        }
    } else if name == "className" {
        if let Some(class_name) = get_static_stringified_expr(inner) {
            push_expr_stmt(
                stmts,
                call_ident("_$setClassName", vec![Expr::Ident(target.clone()), class_name]),
            );
            return true;
        }
    } else if name == "value" {
        if let Some(value) = get_static_literal_value_expr(inner) {
            push_expr_stmt(
                stmts,
                call_ident("_$setValue", vec![Expr::Ident(target.clone()), value]),
            );
            return true;
        }
    } else if name == "disabled" {
        if let Some(disabled) = get_static_truthy_bool(inner) {
            push_expr_stmt(
                stmts,
                call_ident(
                    "_$setDisabled",
                    vec![
                        Expr::Ident(target.clone()),
                        Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: disabled })),
                    ],
                ),
            );
            return true;
        }
    } else if name == "multiple" {
        if let Some(multiple) = get_static_truthy_bool(inner) {
            emit_static_multiple_assign(stmts, target, multiple);
            return true;
        }
    } else if name == "checked" {
        if let Some(checked) = get_static_truthy_bool(inner) {
            push_expr_stmt(
                stmts,
                call_ident(
                    "_$setChecked",
                    vec![
                        Expr::Ident(target.clone()),
                        Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: checked })),
                    ],
                ),
            );
            return true;
        }
    } else if let Some(attr_value) = get_static_stringified_expr(inner) {
        push_expr_stmt(
            stmts,
            call_ident(
                "_$setAttribute",
                vec![
                    Expr::Ident(target.clone()),
                    string_expr(name),
                    normalized_static_attr_expr(name, attr_value),
                ],
            ),
        );
        return true;
    }

    false
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) enum DomBindingClass {
    Static,
    CompiledScalar,
    CompiledStyleRecord,
    CompiledEvent,
    CompiledRef,
    Vapor,
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct CompiledEventSpec {
    name: String,
    capture: bool,
    once: bool,
    passive: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
enum CompiledDomBinding {
    ClassName,
    Style,
    StyleProperty { name: String, set_property: bool },
    Value,
    SelectValue,
    BooleanProperty(String),
    Attribute(String),
}

fn compiled_member(object: Expr, property: &str) -> Expr {
    Expr::Member(MemberExpr {
        span: DUMMY_SP,
        obj: Box::new(object),
        prop: MemberProp::Ident(ident_name(property)),
    })
}

fn compiled_call(callee: Expr, args: Vec<Expr>) -> Expr {
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

fn compiled_call_member(object: Expr, property: &str, args: Vec<Expr>) -> Expr {
    compiled_call(compiled_member(object, property), args)
}

fn compiled_let_decl(name: Ident) -> Stmt {
    Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span: DUMMY_SP,
        ctxt: SyntaxContext::empty(),
        kind: VarDeclKind::Let,
        declare: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: Pat::Ident(BindingIdent { id: name, type_ann: None }),
            init: None,
            definite: false,
        }],
    })))
}

fn compiled_assign_ident(name: Ident, value: Expr) -> Stmt {
    push_assignment(
        AssignTarget::Simple(SimpleAssignTarget::Ident(BindingIdent { id: name, type_ann: None })),
        value,
    )
}

fn push_assignment(left: AssignTarget, value: Expr) -> Stmt {
    Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(Expr::Assign(AssignExpr {
            span: DUMMY_SP,
            op: AssignOp::Assign,
            left,
            right: Box::new(value),
        })),
    })
}

fn compiled_assign_member(object: Expr, property: &str, value: Expr) -> Stmt {
    push_assignment(
        AssignTarget::Simple(SimpleAssignTarget::Member(MemberExpr {
            span: DUMMY_SP,
            obj: Box::new(object),
            prop: MemberProp::Ident(ident_name(property)),
        })),
        value,
    )
}

fn is_nullish(value: Expr) -> Expr {
    Expr::Bin(BinExpr {
        span: DUMMY_SP,
        op: BinaryOp::EqEq,
        left: Box::new(value),
        right: Box::new(Expr::Lit(Lit::Null(Null { span: DUMMY_SP }))),
    })
}

fn normalized_string(value: Expr) -> Expr {
    Expr::Cond(CondExpr {
        span: DUMMY_SP,
        test: Box::new(is_nullish(value.clone())),
        cons: Box::new(string_expr("")),
        alt: Box::new(call_ident("String", vec![value])),
    })
}

fn normalized_boolean(value: Expr) -> Expr {
    call_ident("Boolean", vec![value])
}

fn boolean_property_name(name: &str) -> &str {
    match name {
        "autoFocus" => "autofocus",
        "autoPlay" => "autoplay",
        "allowFullScreen" => "allowFullscreen",
        _ => name,
    }
}

fn attr_binding_kind(name: &str) -> CompiledDomBinding {
    match name {
        "className" => CompiledDomBinding::ClassName,
        "style" => CompiledDomBinding::Style,
        "value" => CompiledDomBinding::Value,
        name if crate::vapor::template::is_boolean_attr(name) => {
            CompiledDomBinding::BooleanProperty(boolean_property_name(name).to_string())
        }
        _ => CompiledDomBinding::Attribute(name.to_string()),
    }
}

fn compiled_style_record(
    vt: &crate::vapor::VaporTransform,
    expr: &Expr,
    shadowed_names: &std::collections::HashSet<String>,
) -> Option<Vec<(String, Expr)>> {
    let Expr::Object(object) = unwrap_expr(expr) else {
        return None;
    };
    let mut properties = Vec::with_capacity(object.props.len());
    for property in &object.props {
        let PropOrSpread::Prop(property) = property else {
            return None;
        };
        let Prop::KeyValue(property) = property.as_ref() else {
            return None;
        };
        let name = match &property.key {
            PropName::Ident(name) => name.sym.to_string(),
            PropName::Str(name) => name.value.to_string_lossy().into_owned(),
            PropName::Num(_) | PropName::Computed(_) | PropName::BigInt(_) => return None,
        };
        let value = unwrap_expr(property.value.as_ref());
        if !crate::vapor::is_compiled_reactive_scalar_expr(vt, value, shadowed_names) {
            return None;
        }
        properties.push((name, value.clone()));
    }
    Some(properties)
}

fn compiled_event_spec(name: &str) -> Option<CompiledEventSpec> {
    let mut event = name.strip_prefix("on")?;
    if !event.chars().next()?.is_ascii_uppercase() {
        return None;
    }
    let mut capture = false;
    let mut once = false;
    let mut passive = false;
    loop {
        if event.ends_with("Capture")
            && !matches!(event, "GotPointerCapture" | "LostPointerCapture")
        {
            capture = true;
            event = event.strip_suffix("Capture")?;
        } else if let Some(base) = event.strip_suffix("Once") {
            once = true;
            event = base;
        } else if let Some(base) = event.strip_suffix("Passive") {
            passive = true;
            event = base;
        } else {
            break;
        }
    }
    (!event.is_empty()).then(|| {
        let name = match (event.to_ascii_lowercase().as_str(), capture) {
            // JSX focus events bubble through component wrappers. The corresponding
            // native focus/blur events do not, so non-capture listeners use their
            // bubbling variants while capture listeners observe the native events.
            ("focus", false) => "focusin".to_string(),
            ("blur", false) => "focusout".to_string(),
            (name, _) => name.to_string(),
        };
        CompiledEventSpec { name, capture, once, passive }
    })
}

fn compiled_event_options(spec: &CompiledEventSpec) -> Expr {
    Expr::Object(ObjectLit {
        span: DUMMY_SP,
        props: [("capture", spec.capture), ("once", spec.once), ("passive", spec.passive)]
            .into_iter()
            .filter(|(_, enabled)| *enabled)
            .map(|(name, _)| {
                PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                    key: PropName::Ident(ident_name(name)),
                    value: Box::new(Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true }))),
                })))
            })
            .collect(),
    })
}

fn is_compiled_event_handler_expr(expr: &Expr) -> bool {
    matches!(unwrap_expr(expr), Expr::Ident(_) | Expr::Member(_) | Expr::Arrow(_) | Expr::Fn(_))
        || matches!(unwrap_expr(expr), Expr::Call(call) if
            crate::compiled_component::is_static_prop_get_call(call) ||
            matches!(&call.callee, Callee::Expr(callee) if matches!(callee.as_ref(), Expr::Ident(id) if id.sym == *"_$compiledWithEventModifiers")))
}

fn is_delegated_bubbling_event(name: &str) -> bool {
    matches!(
        name,
        "auxclick"
            | "beforeinput"
            | "change"
            | "click"
            | "compositionend"
            | "compositionstart"
            | "compositionupdate"
            | "contextmenu"
            | "copy"
            | "cut"
            | "dblclick"
            | "drag"
            | "dragend"
            | "dragenter"
            | "dragleave"
            | "dragover"
            | "dragstart"
            | "drop"
            | "focusin"
            | "focusout"
            | "input"
            | "keydown"
            | "keypress"
            | "keyup"
            | "mousedown"
            | "mousemove"
            | "mouseout"
            | "mouseover"
            | "mouseup"
            | "paste"
            | "pointercancel"
            | "pointerdown"
            | "pointermove"
            | "pointerout"
            | "pointerover"
            | "pointerup"
            | "reset"
            | "submit"
            | "touchcancel"
            | "touchend"
            | "touchmove"
            | "touchstart"
            | "wheel"
    )
}

pub(crate) fn is_compiled_delegated_event(attr_name: &str, handler: &Expr) -> bool {
    let Some(spec) = compiled_event_spec(attr_name) else { return false };
    if spec.capture || spec.once || spec.passive || !is_delegated_bubbling_event(&spec.name) {
        return false;
    }
    matches!(
        unwrap_expr(handler),
        Expr::Arrow(ArrowExpr {
            params,
            is_async: false,
            is_generator: false,
            ..
        }) if params.is_empty()
    )
}

fn is_compiled_ref_expr(expr: &Expr) -> bool {
    matches!(unwrap_expr(expr), Expr::Ident(_) | Expr::Member(_) | Expr::Arrow(_) | Expr::Fn(_))
}

fn is_compiled_dom_value_expr(expr: &Expr) -> bool {
    match unwrap_expr(expr) {
        Expr::JSXElement(_)
        | Expr::JSXFragment(_)
        | Expr::Fn(_)
        | Expr::Arrow(_)
        | Expr::Await(_)
        | Expr::Yield(_)
        | Expr::Class(_) => false,
        Expr::Call(call) => call
            .args
            .iter()
            .all(|arg| arg.spread.is_none() && is_compiled_dom_value_expr(arg.expr.as_ref())),
        Expr::TaggedTpl(_) => false,
        Expr::Object(object) => object.props.iter().all(|prop| match prop {
            PropOrSpread::Spread(spread) => is_compiled_dom_value_expr(spread.expr.as_ref()),
            PropOrSpread::Prop(_) => true,
        }),
        Expr::Array(array) => array
            .elems
            .iter()
            .flatten()
            .all(|item| item.spread.is_none() && is_compiled_dom_value_expr(item.expr.as_ref())),
        _ => true,
    }
}

fn classify_dom_attr_with_shadows(
    vt: &crate::vapor::VaporTransform,
    attr: &JSXAttr,
    shadowed_names: &std::collections::HashSet<String>,
) -> DomBindingClass {
    let JSXAttrName::Ident(name) = &attr.name else {
        return DomBindingClass::Vapor;
    };
    let name = name.sym.as_ref();
    if name == "key" || name == "__rue_static_template_id__" {
        return DomBindingClass::Static;
    }
    if name == "dangerouslySetInnerHTML" || name.starts_with("__rue_") {
        return DomBindingClass::Vapor;
    }

    if name == "ref" {
        return match &attr.value {
            Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                expr: JSXExpr::Expr(expr),
                ..
            })) if is_compiled_ref_expr(expr.as_ref()) => DomBindingClass::CompiledRef,
            _ => DomBindingClass::Vapor,
        };
    }

    if compiled_event_spec(name).is_some() {
        return match &attr.value {
            Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                expr: JSXExpr::Expr(expr),
                ..
            })) if is_compiled_event_handler_expr(expr.as_ref()) => DomBindingClass::CompiledEvent,
            _ => DomBindingClass::Vapor,
        };
    }

    match &attr.value {
        Some(JSXAttrValue::Str(_)) | None => DomBindingClass::Static,
        Some(JSXAttrValue::JSXExprContainer(container)) => {
            let JSXExpr::Expr(expr) = &container.expr else {
                return DomBindingClass::Static;
            };
            let inner = unwrap_expr(expr.as_ref());
            let is_static = if name == "style" {
                get_static_style_expr(inner).is_some()
            } else if crate::vapor::template::is_boolean_attr(name) {
                get_static_truthy_bool(inner).is_some()
            } else if name == "value" {
                get_static_literal_value_expr(inner).is_some()
            } else {
                get_static_stringified_expr(inner).is_some()
            };
            if is_static {
                DomBindingClass::Static
            } else if name == "style" && compiled_style_record(vt, inner, shadowed_names).is_some()
            {
                DomBindingClass::CompiledStyleRecord
            } else if crate::vapor::is_compiled_reactive_scalar_expr(vt, inner, shadowed_names)
                || is_compiled_dom_value_expr(inner)
            {
                DomBindingClass::CompiledScalar
            } else {
                DomBindingClass::Vapor
            }
        }
        _ => DomBindingClass::Vapor,
    }
}

pub(crate) fn attrs_support_compiled_scalar(
    vt: &crate::vapor::VaporTransform,
    opening: &JSXOpeningElement,
    shadowed_names: &std::collections::HashSet<String>,
) -> bool {
    opening.attrs.iter().all(|attr| match attr {
        JSXAttrOrSpread::JSXAttr(attr) => {
            classify_dom_attr_with_shadows(vt, attr, shadowed_names) != DomBindingClass::Vapor
        }
        JSXAttrOrSpread::SpreadElement(_) => true,
    })
}

fn compiled_arrow(params: Vec<Pat>, body: BlockStmtOrExpr) -> Expr {
    Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params,
        body: Box::new(body),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    })
}

fn emit_compiled_event(
    vt: &mut crate::vapor::VaporTransform,
    stmts: &mut Vec<Stmt>,
    target: &Ident,
    attr_name: &str,
    handler: &Expr,
) {
    let spec = compiled_event_spec(attr_name).expect("compiled event must have a static name");
    if is_compiled_delegated_event(attr_name, handler) {
        let register = call_ident(
            "_$compiledDelegateEvent",
            vec![
                Expr::Ident(ident("__rue_parent_context")),
                Expr::Ident(target.clone()),
                string_expr(&spec.name),
                compiled_arrow(vec![], BlockStmtOrExpr::Expr(Box::new(handler.clone()))),
            ],
        );
        push_expr_stmt(stmts, call_ident("onOwnerCleanup", vec![register]));
        return;
    }
    let listener = vt.next_event_ident();
    let event = ident("$event");
    let current_handler = ident(&format!("{}_handler", listener.sym));
    let invoke =
        compiled_call(Expr::Ident(current_handler.clone()), vec![Expr::Ident(event.clone())]);
    stmts.push(const_decl(
        listener.clone(),
        compiled_arrow(
            vec![Pat::Ident(BindingIdent { id: event, type_ann: None })],
            BlockStmtOrExpr::BlockStmt(BlockStmt {
                span: DUMMY_SP,
                ctxt: SyntaxContext::empty(),
                stmts: vec![
                    const_decl(current_handler.clone(), handler.clone()),
                    Stmt::If(IfStmt {
                        span: DUMMY_SP,
                        test: Box::new(compiled_typeof_is(&current_handler, "function")),
                        cons: Box::new(Stmt::Expr(ExprStmt {
                            span: DUMMY_SP,
                            expr: Box::new(invoke),
                        })),
                        alt: None,
                    }),
                ],
            }),
        ),
    ));

    let options = (spec.capture || spec.once || spec.passive).then(|| {
        let options = ident(&format!("{}_options", listener.sym));
        stmts.push(const_decl(options.clone(), compiled_event_options(&spec)));
        options
    });

    let listener_args = || {
        let mut args = vec![string_expr(&spec.name), Expr::Ident(listener.clone())];
        if let Some(options) = &options {
            args.push(Expr::Ident(options.clone()));
        }
        args
    };
    push_expr_stmt(
        stmts,
        compiled_call_member(Expr::Ident(target.clone()), "addEventListener", listener_args()),
    );
    let remove =
        compiled_call_member(Expr::Ident(target.clone()), "removeEventListener", listener_args());
    push_expr_stmt(
        stmts,
        call_ident(
            "onOwnerCleanup",
            vec![compiled_arrow(vec![], BlockStmtOrExpr::Expr(Box::new(remove)))],
        ),
    );
}

fn emit_vapor_event(
    stmts: &mut Vec<Stmt>,
    target: &Ident,
    attr_name: &str,
    handler: &Expr,
    attr_index: usize,
) {
    let spec = compiled_event_spec(attr_name).expect("vapor event must have a static name");
    let listener = ident(&format!("{}_event_{}", target.sym, attr_index));
    let event = ident("$event");
    let current_handler = ident(&format!("{}_handler", listener.sym));
    let invoke =
        compiled_call(Expr::Ident(current_handler.clone()), vec![Expr::Ident(event.clone())]);
    stmts.push(const_decl(
        listener.clone(),
        compiled_arrow(
            vec![Pat::Ident(BindingIdent { id: event, type_ann: None })],
            BlockStmtOrExpr::BlockStmt(BlockStmt {
                span: DUMMY_SP,
                ctxt: SyntaxContext::empty(),
                stmts: vec![
                    const_decl(current_handler.clone(), handler.clone()),
                    Stmt::If(IfStmt {
                        span: DUMMY_SP,
                        test: Box::new(compiled_typeof_is(&current_handler, "function")),
                        cons: Box::new(Stmt::Expr(ExprStmt {
                            span: DUMMY_SP,
                            expr: Box::new(invoke),
                        })),
                        alt: None,
                    }),
                ],
            }),
        ),
    ));

    let options = (spec.capture || spec.once || spec.passive).then(|| {
        let options = ident(&format!("{}_options", listener.sym));
        stmts.push(const_decl(options.clone(), compiled_event_options(&spec)));
        options
    });
    let listener_args = || {
        let mut args = vec![string_expr(&spec.name), Expr::Ident(listener.clone())];
        if let Some(options) = &options {
            args.push(Expr::Ident(options.clone()));
        }
        args
    };
    push_expr_stmt(
        stmts,
        compiled_call_member(Expr::Ident(target.clone()), "addEventListener", listener_args()),
    );
    let remove =
        compiled_call_member(Expr::Ident(target.clone()), "removeEventListener", listener_args());
    push_expr_stmt(
        stmts,
        call_ident(
            "onScopeDispose",
            vec![compiled_arrow(vec![], BlockStmtOrExpr::Expr(Box::new(remove)))],
        ),
    );
}

fn compiled_typeof_is(value: &Ident, kind: &str) -> Expr {
    Expr::Bin(BinExpr {
        span: DUMMY_SP,
        op: BinaryOp::EqEqEq,
        left: Box::new(Expr::Unary(UnaryExpr {
            span: DUMMY_SP,
            op: UnaryOp::TypeOf,
            arg: Box::new(Expr::Ident(value.clone())),
        })),
        right: Box::new(string_expr(kind)),
    })
}

fn compiled_object_ref_test(value: &Ident) -> Expr {
    let exists_and_object = Expr::Bin(BinExpr {
        span: DUMMY_SP,
        op: BinaryOp::LogicalAnd,
        left: Box::new(Expr::Ident(value.clone())),
        right: Box::new(compiled_typeof_is(value, "object")),
    });
    Expr::Bin(BinExpr {
        span: DUMMY_SP,
        op: BinaryOp::LogicalAnd,
        left: Box::new(exists_and_object),
        right: Box::new(Expr::Bin(BinExpr {
            span: DUMMY_SP,
            op: BinaryOp::In,
            left: Box::new(string_expr("current")),
            right: Box::new(Expr::Ident(value.clone())),
        })),
    })
}

fn compiled_ref_apply(value: &Ident, assigned: Expr) -> Stmt {
    let call_function = Stmt::Expr(ExprStmt {
        span: DUMMY_SP,
        expr: Box::new(compiled_call(Expr::Ident(value.clone()), vec![assigned.clone()])),
    });
    let assign_object = compiled_assign_member(Expr::Ident(value.clone()), "current", assigned);
    Stmt::If(IfStmt {
        span: DUMMY_SP,
        test: Box::new(compiled_typeof_is(value, "function")),
        cons: Box::new(call_function),
        alt: Some(Box::new(Stmt::If(IfStmt {
            span: DUMMY_SP,
            test: Box::new(compiled_object_ref_test(value)),
            cons: Box::new(assign_object),
            alt: None,
        }))),
    })
}

fn emit_compiled_ref(
    vt: &mut crate::vapor::VaporTransform,
    stmts: &mut Vec<Stmt>,
    target: &Ident,
    value: &Expr,
) {
    let reference = vt.next_ref_ident();
    stmts.push(const_decl(reference.clone(), value.clone()));
    stmts.push(compiled_ref_apply(&reference, Expr::Ident(target.clone())));
    let cleanup = compiled_ref_apply(&reference, Expr::Lit(Lit::Null(Null { span: DUMMY_SP })));
    push_expr_stmt(
        stmts,
        call_ident(
            "onOwnerCleanup",
            vec![compiled_arrow(
                vec![],
                BlockStmtOrExpr::BlockStmt(BlockStmt {
                    span: DUMMY_SP,
                    ctxt: SyntaxContext::empty(),
                    stmts: vec![cleanup],
                }),
            )],
        ),
    );
}

fn emit_direct_attribute(stmts: &mut Vec<Stmt>, target: &Ident, name: &str, value: Expr) {
    push_expr_stmt(
        stmts,
        compiled_call_member(
            Expr::Ident(target.clone()),
            "setAttribute",
            vec![string_expr(name), value],
        ),
    );
}

fn emit_direct_static_attr(
    stmts: &mut Vec<Stmt>,
    target: &Ident,
    name: &str,
    value: Option<&JSXAttrValue>,
) {
    match value {
        Some(JSXAttrValue::Str(value)) => match name {
            "className" => {
                emit_direct_attribute(stmts, target, "class", Expr::Lit(Lit::Str(value.clone())))
            }
            "style" => stmts.push(compiled_assign_member(
                compiled_member(Expr::Ident(target.clone()), "style"),
                "cssText",
                Expr::Lit(Lit::Str(value.clone())),
            )),
            "value" => stmts.push(compiled_assign_member(
                Expr::Ident(target.clone()),
                "value",
                Expr::Lit(Lit::Str(value.clone())),
            )),
            name if crate::vapor::template::is_boolean_attr(name) => {
                stmts.push(compiled_assign_member(
                    Expr::Ident(target.clone()),
                    boolean_property_name(name),
                    Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })),
                ))
            }
            _ => emit_direct_attribute(
                stmts,
                target,
                name,
                Expr::Lit(Lit::Str(normalized_static_attr_string(name, value))),
            ),
        },
        Some(JSXAttrValue::JSXExprContainer(container)) => {
            let JSXExpr::Expr(expr) = &container.expr else {
                return;
            };
            let inner = unwrap_expr(expr.as_ref());
            match name {
                "style" => {
                    let Some(style) = get_static_style_expr(inner) else {
                        return;
                    };
                    if matches!(&style, Expr::Object(object) if object.props.iter().any(|prop|
                        matches!(prop, PropOrSpread::Prop(prop) if matches!(prop.as_ref(), Prop::KeyValue(kv) if matches!(&kv.key, PropName::Str(key) if key.value.as_str().is_some_and(|name| name.starts_with("--")))))
                    )) {
                        stmts.push(compiled_assign_member(
                            compiled_member(Expr::Ident(target.clone()), "style"),
                            "cssText",
                            call_ident("_$compiledStyleValue", vec![style]),
                        ));
                    } else if matches!(style, Expr::Object(_)) {
                        push_expr_stmt(
                            stmts,
                            compiled_call_member(
                                Expr::Ident(ident("Object")),
                                "assign",
                                vec![compiled_member(Expr::Ident(target.clone()), "style"), style],
                            ),
                        );
                    } else {
                        stmts.push(compiled_assign_member(
                            compiled_member(Expr::Ident(target.clone()), "style"),
                            "cssText",
                            normalized_string(style),
                        ));
                    }
                }
                "className" => {
                    if let Some(value) = get_static_stringified_expr(inner) {
                        emit_direct_attribute(stmts, target, "class", value);
                    }
                }
                "value" => {
                    if let Some(value) = get_static_literal_value_expr(inner) {
                        stmts.push(compiled_assign_member(
                            Expr::Ident(target.clone()),
                            "value",
                            normalized_string(value),
                        ));
                    }
                }
                name if crate::vapor::template::is_boolean_attr(name) => {
                    if let Some(value) = get_static_truthy_bool(inner) {
                        stmts.push(compiled_assign_member(
                            Expr::Ident(target.clone()),
                            boolean_property_name(name),
                            Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value })),
                        ));
                    }
                }
                _ => {
                    if let Some(value) = get_static_stringified_expr(inner) {
                        emit_direct_attribute(
                            stmts,
                            target,
                            name,
                            normalized_static_attr_expr(name, value),
                        );
                    }
                }
            }
        }
        None => match name {
            name if crate::vapor::template::is_boolean_attr(name) => {
                stmts.push(compiled_assign_member(
                    Expr::Ident(target.clone()),
                    boolean_property_name(name),
                    Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })),
                ))
            }
            name if is_string_boolean_attr(name) => {
                emit_direct_attribute(stmts, target, name, string_expr("true"));
            }
            _ => {}
        },
        _ => {}
    }
}

fn emit_compiled_binding_effect(
    vt: &mut crate::vapor::VaporTransform,
    stmts: &mut Vec<Stmt>,
    target: &Ident,
    inner: &Expr,
    binding_kind: CompiledDomBinding,
) {
    let binding = vt.next_child_ident();
    let raw = ident(&format!("{}_raw", binding.sym));
    let next = ident(&format!("{}_next", binding.sym));
    stmts.push(compiled_let_decl(binding.clone()));

    let next_expr = match &binding_kind {
        CompiledDomBinding::ClassName | CompiledDomBinding::StyleProperty { .. } => {
            Expr::Cond(CondExpr {
                span: DUMMY_SP,
                test: Box::new(Expr::Bin(BinExpr {
                    span: DUMMY_SP,
                    op: BinaryOp::EqEqEq,
                    left: Box::new(Expr::Ident(raw.clone())),
                    right: Box::new(Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: false }))),
                })),
                cons: Box::new(string_expr("")),
                alt: Box::new(normalized_string(Expr::Ident(raw.clone()))),
            })
        }
        CompiledDomBinding::Value => normalized_string(Expr::Ident(raw.clone())),
        CompiledDomBinding::Style => {
            if matches!(unwrap_expr(inner), Expr::Call(call) if matches!(&call.callee, Callee::Expr(callee) if matches!(callee.as_ref(), Expr::Ident(id) if id.sym == *"String")))
            {
                normalized_string(Expr::Ident(raw.clone()))
            } else {
                call_ident("_$compiledStyleValue", vec![Expr::Ident(raw.clone())])
            }
        }
        CompiledDomBinding::BooleanProperty(_) => normalized_boolean(Expr::Ident(raw.clone())),
        CompiledDomBinding::Attribute(_) | CompiledDomBinding::SelectValue => {
            Expr::Ident(raw.clone())
        }
    };
    let changed = Expr::Unary(UnaryExpr {
        span: DUMMY_SP,
        op: UnaryOp::Bang,
        arg: Box::new(compiled_call_member(
            Expr::Ident(ident("Object")),
            "is",
            vec![Expr::Ident(binding.clone()), Expr::Ident(next.clone())],
        )),
    });

    let write = match &binding_kind {
        CompiledDomBinding::ClassName => Stmt::Expr(ExprStmt {
            span: DUMMY_SP,
            expr: Box::new(compiled_call_member(
                Expr::Ident(target.clone()),
                "setAttribute",
                vec![string_expr("class"), Expr::Ident(next.clone())],
            )),
        }),
        CompiledDomBinding::Style => compiled_assign_member(
            compiled_member(Expr::Ident(target.clone()), "style"),
            "cssText",
            Expr::Ident(next.clone()),
        ),
        CompiledDomBinding::StyleProperty { name, set_property } => {
            let style = compiled_member(Expr::Ident(target.clone()), "style");
            if *set_property {
                Stmt::Expr(ExprStmt {
                    span: DUMMY_SP,
                    expr: Box::new(compiled_call_member(
                        style,
                        "setProperty",
                        vec![string_expr(name), Expr::Ident(next.clone())],
                    )),
                })
            } else {
                compiled_assign_member(style, name, Expr::Ident(next.clone()))
            }
        }
        CompiledDomBinding::Value => {
            compiled_assign_member(Expr::Ident(target.clone()), "value", Expr::Ident(next.clone()))
        }
        CompiledDomBinding::SelectValue => Stmt::Expr(ExprStmt {
            span: DUMMY_SP,
            expr: Box::new(call_ident(
                "_$compiledSelectValue",
                vec![Expr::Ident(target.clone()), Expr::Ident(next.clone())],
            )),
        }),
        CompiledDomBinding::BooleanProperty(name) => {
            compiled_assign_member(Expr::Ident(target.clone()), name, Expr::Ident(next.clone()))
        }
        CompiledDomBinding::Attribute(name) => {
            let remove = Stmt::Expr(ExprStmt {
                span: DUMMY_SP,
                expr: Box::new(compiled_call_member(
                    Expr::Ident(target.clone()),
                    "removeAttribute",
                    vec![string_expr(name)],
                )),
            });
            let set = Stmt::Expr(ExprStmt {
                span: DUMMY_SP,
                expr: Box::new(compiled_call_member(
                    Expr::Ident(target.clone()),
                    "setAttribute",
                    vec![string_expr(name), call_ident("String", vec![Expr::Ident(next.clone())])],
                )),
            });
            let false_value = Expr::Bin(BinExpr {
                span: DUMMY_SP,
                op: BinaryOp::EqEqEq,
                left: Box::new(Expr::Ident(next.clone())),
                right: Box::new(Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: false }))),
            });
            Stmt::If(IfStmt {
                span: DUMMY_SP,
                test: Box::new(Expr::Bin(BinExpr {
                    span: DUMMY_SP,
                    op: BinaryOp::LogicalOr,
                    left: Box::new(is_nullish(Expr::Ident(next.clone()))),
                    right: Box::new(if is_string_boolean_attr(name) {
                        Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: false }))
                    } else {
                        false_value
                    }),
                })),
                cons: Box::new(remove),
                alt: Some(Box::new(set)),
            })
        }
    };

    let arrow = Expr::Arrow(ArrowExpr {
        span: DUMMY_SP,
        params: vec![],
        body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            stmts: vec![
                const_decl(raw, inner.clone()),
                const_decl(next.clone(), next_expr),
                Stmt::If(IfStmt {
                    span: DUMMY_SP,
                    test: Box::new(changed),
                    cons: Box::new(Stmt::Block(BlockStmt {
                        span: DUMMY_SP,
                        ctxt: SyntaxContext::empty(),
                        stmts: vec![compiled_assign_ident(binding, Expr::Ident(next)), write],
                    })),
                    alt: None,
                }),
            ],
        })),
        is_async: false,
        is_generator: false,
        type_params: None,
        return_type: None,
        ctxt: SyntaxContext::empty(),
    });
    push_expr_stmt(stmts, call_ident("effect", vec![arrow]));
}

pub(crate) fn emit_compiled_attrs_for(
    vt: &mut crate::vapor::VaporTransform,
    stmts: &mut Vec<Stmt>,
    target: &Ident,
    opening: &JSXOpeningElement,
) {
    let mut expanded = opening.clone();
    expanded.attrs = opening
        .attrs
        .iter()
        .flat_map(|attr| {
            let JSXAttrOrSpread::SpreadElement(spread) = attr else { return vec![attr.clone()] };
            let Expr::Object(object) = unwrap_expr(&spread.expr) else { return vec![attr.clone()] };
            let attributes: Option<Vec<_>> = object
                .props
                .iter()
                .map(|prop| {
                    let PropOrSpread::Prop(prop) = prop else { return None };
                    let (name, value) = match prop.as_ref() {
                        Prop::KeyValue(kv) => {
                            let name = match &kv.key {
                                PropName::Ident(id) => id.sym.to_string(),
                                PropName::Str(name) => name.value.as_str()?.to_string(),
                                _ => return None,
                            };
                            (name, kv.value.clone())
                        }
                        Prop::Shorthand(id) => {
                            (id.sym.to_string(), Box::new(Expr::Ident(id.clone())))
                        }
                        _ => return None,
                    };
                    Some(JSXAttrOrSpread::JSXAttr(JSXAttr {
                        span: DUMMY_SP,
                        name: JSXAttrName::Ident(ident_name(&name)),
                        value: Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                            span: DUMMY_SP,
                            expr: JSXExpr::Expr(value),
                        })),
                    }))
                })
                .collect();
            attributes.unwrap_or_else(|| vec![attr.clone()])
        })
        .collect();
    let opening = &expanded;
    let shadowed_names = vt.current_scalar_constructor_shadows();
    for (attr_index, attr) in opening.attrs.iter().enumerate() {
        if let JSXAttrOrSpread::SpreadElement(spread) = attr {
            let excluded = Expr::Array(ArrayLit {
                span: DUMMY_SP,
                elems: opening
                    .attrs
                    .iter()
                    .skip(attr_index + 1)
                    .filter_map(|later| {
                        let JSXAttrOrSpread::JSXAttr(later) = later else { return None };
                        let JSXAttrName::Ident(name) = &later.name else { return None };
                        Some(ExprOrSpread {
                            spread: None,
                            expr: Box::new(string_expr(name.sym.as_ref())),
                        })
                    })
                    .map(Some)
                    .collect(),
            });
            let read = compiled_arrow(
                vec![],
                BlockStmtOrExpr::Expr(Box::new(spread.expr.as_ref().clone())),
            );
            push_expr_stmt(
                stmts,
                call_ident(
                    "_$compiledSpreadAttributes",
                    vec![Expr::Ident(target.clone()), read, excluded],
                ),
            );
            continue;
        }
        let JSXAttrOrSpread::JSXAttr(attr) = attr else { unreachable!() };
        let JSXAttrName::Ident(name) = &attr.name else {
            continue;
        };
        let name = name.sym.as_ref();
        if name == "key" || name == "__rue_static_template_id__" {
            continue;
        }
        match classify_dom_attr_with_shadows(vt, attr, &shadowed_names) {
            DomBindingClass::Static => {
                emit_direct_static_attr(stmts, target, name, attr.value.as_ref())
            }
            DomBindingClass::CompiledScalar => {
                let Some(JSXAttrValue::JSXExprContainer(container)) = &attr.value else {
                    continue;
                };
                let JSXExpr::Expr(expr) = &container.expr else {
                    continue;
                };
                emit_compiled_binding_effect(
                    vt,
                    stmts,
                    target,
                    unwrap_expr(expr.as_ref()),
                    if name == "value"
                        && matches!(&opening.name, JSXElementName::Ident(tag) if tag.sym == *"select")
                    {
                        CompiledDomBinding::SelectValue
                    } else {
                        attr_binding_kind(name)
                    },
                );
            }
            DomBindingClass::CompiledStyleRecord => {
                let Some(JSXAttrValue::JSXExprContainer(container)) = &attr.value else {
                    continue;
                };
                let JSXExpr::Expr(expr) = &container.expr else {
                    continue;
                };
                let Some(properties) =
                    compiled_style_record(vt, unwrap_expr(expr.as_ref()), &shadowed_names)
                else {
                    continue;
                };
                for (name, value) in properties {
                    emit_compiled_binding_effect(
                        vt,
                        stmts,
                        target,
                        &value,
                        CompiledDomBinding::StyleProperty {
                            set_property: name.contains('-'),
                            name,
                        },
                    );
                }
            }
            DomBindingClass::CompiledEvent => {
                let Some(JSXAttrValue::JSXExprContainer(container)) = &attr.value else {
                    continue;
                };
                let JSXExpr::Expr(expr) = &container.expr else {
                    continue;
                };
                emit_compiled_event(vt, stmts, target, name, unwrap_expr(expr.as_ref()));
            }
            DomBindingClass::CompiledRef => {
                let Some(JSXAttrValue::JSXExprContainer(container)) = &attr.value else {
                    continue;
                };
                let JSXExpr::Expr(expr) = &container.expr else {
                    continue;
                };
                emit_compiled_ref(vt, stmts, target, unwrap_expr(expr.as_ref()));
            }
            DomBindingClass::Vapor => {}
        }
    }
}

/*
属性与事件编译设计：
- 目标：将 JSX 开标签上的属性转化为稳定的原生 DOM 更新语句，动态值用 `watchEffect` 包裹，实现响应式更新。
- 规则摘要：
  - `className`：转换为 `setClassName(value)`，动态值 watch 包裹，由运行时处理 null/undefined 清理
  - `style`：统一调用 `_$setStyle(el, obj)`，动态值 watch 包裹
  - `dangerouslySetInnerHTML`：设置 `innerHTML`（支持静态/动态对象的 `{ __html }`）
  - `disabled`/`multiple`/`checked` 等布尔：静态直接赋值；动态以布尔保护（`!!expr`）更新对应属性
  - `value`：受控输入；`<select multiple>` 进行集合规范化并同步各 `<option>` 的选中态
  - `ref`：绑定 `useRef`，在卸载时调用 stop 清理
  - 事件（`onClick` 等）：转换为 `addEventListener(event, handler)`，必要时包装以维持最新回调
- 性能与一致性：尽量一次性设置静态值，避免不必要的 watch；使用运行时辅助函数保持不同类型元素的行为统一并便于优化。
*/
/// JSX 属性到原生 DOM 的编译细节（逐调用解释）：
/// - 所有更新均通过运行时适配器完成：来源统一为 `@rue-js/rue/internal`，便于优化与跨环境适配。
/// - `$appendChild(parent, child)`：来源 emit::append_child 封装；用于把子节点插入父节点，抽象原生 `appendChild`，便于统一移动/批量插入策略。
/// - `$setAttribute(el, name, value)`：来源运行时适配层；统一封装不同浏览器行为与边界情况（如 `null/undefined` 清理、命名空间）。
/// - `$setClassName(el, class)`：专为 className 适配；避免直接写 `el.setAttribute('class', ...)` 的差异。
/// - `$setStyle(el, obj)`：统一样式对象到行内样式的写入；内部支持移除与驼峰/连字符转换。
/// - `$setInnerHTML(el, html)`：设置 innerHTML；配合 `dangerouslySetInnerHTML` 的对象形态 `{ __html }`。
/// - `watchEffect(fn)`：响应式更新调度器；在值变化时以微任务批量执行 `fn`，避免频繁同步 DOM。
/// - `$addEventListener(el, event, handler)`：事件统一绑定；保持 handler 最新引用。
/// - `$setValue/$setChecked/$setDisabled`：受控输入适配器；统一 HTML 不同输入类型的行为。
///
/// 选择 watch 包裹或一次性设置的原则：
/// - 纯静态字面量：一次性设置，提高性能；
/// - 动态表达式：包裹到 `watchEffect`，保证值变化时同步到 DOM；
/// - 事件：不使用 watch，而是运行时监听最新 handler 引用，避免重复绑定。
pub fn emit_attrs_for(stmts: &mut Vec<Stmt>, target: &Ident, opening: &JSXOpeningElement) {
    log::debug(&format!("attrs: start count={}", opening.attrs.len()));
    let is_custom_element = is_custom_element_opening(opening);
    for (attr_index, a) in opening.attrs.iter().enumerate() {
        if let JSXAttrOrSpread::SpreadElement(spread) = a {
            let spread_expr = Expr::Paren(ParenExpr { span: DUMMY_SP, expr: spread.expr.clone() });
            let mut excluded_names = Vec::new();
            for later in opening.attrs.iter().skip(attr_index + 1) {
                let JSXAttrOrSpread::JSXAttr(later_attr) = later else {
                    continue;
                };
                let JSXAttrName::Ident(name) = &later_attr.name else {
                    continue;
                };
                if name.sym.as_ref() == "key" || name.sym.as_ref() == "__rue_static_template_id__" {
                    continue;
                }
                if !excluded_names.iter().any(|existing| existing == &name.sym) {
                    excluded_names.push(name.sym.clone());
                }
            }
            let excluded = Expr::Array(ArrayLit {
                span: DUMMY_SP,
                elems: excluded_names
                    .into_iter()
                    .map(|name| {
                        Some(ExprOrSpread {
                            spread: None,
                            expr: Box::new(Expr::Lit(Lit::Str(Str {
                                span: DUMMY_SP,
                                value: name.into(),
                                raw: None,
                            }))),
                        })
                    })
                    .collect(),
            });
            let apply_spread = call_ident(
                "_$spreadAttributes",
                vec![Expr::Ident(target.clone()), spread_expr, excluded],
            );
            let arrow = Expr::Arrow(ArrowExpr {
                span: DUMMY_SP,
                params: vec![],
                body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                    span: DUMMY_SP,
                    ctxt: SyntaxContext::empty(),
                    stmts: vec![Stmt::Expr(ExprStmt {
                        span: DUMMY_SP,
                        expr: Box::new(apply_spread),
                    })],
                })),
                is_async: false,
                is_generator: false,
                type_params: None,
                return_type: None,
                ctxt: SyntaxContext::empty(),
            });
            let watch = call_ident("effect", vec![arrow]);
            stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(watch) }));
            continue;
        }

        if let JSXAttrOrSpread::JSXAttr(attr) = a
            && let JSXAttrName::Ident(n) = &attr.name
        {
            let name = n.sym.to_string();
            log::debug(&format!("attrs: handle name={}", name));
            if name == "key" || name == "__rue_static_template_id__" {
                continue;
            }
            match &attr.value {
                Some(JSXAttrValue::Str(s)) => {
                    if name == "className" {
                        let call = call_ident(
                            "_$setClassName",
                            vec![
                                Expr::Ident(target.clone()),
                                Expr::Lit(Lit::Str(Str {
                                    span: DUMMY_SP,
                                    value: s.value.clone(),
                                    raw: None,
                                })),
                            ],
                        );
                        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(call) }));
                    } else if name == "disabled" {
                        // disabled 字面量按布尔属性处理：直接设置为 true
                        let call = call_ident(
                            "_$setDisabled",
                            vec![
                                Expr::Ident(target.clone()),
                                Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })),
                            ],
                        );
                        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(call) }));
                    } else if name == "dangerouslySetInnerHTML" {
                        let call = call_ident(
                            "_$setInnerHTML",
                            vec![
                                Expr::Ident(target.clone()),
                                Expr::Lit(Lit::Str(Str {
                                    span: DUMMY_SP,
                                    value: s.value.clone(),
                                    raw: None,
                                })),
                            ],
                        );
                        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(call) }));
                    } else {
                        // 其它静态属性：按字符串直接设置
                        let call = call_ident(
                            "_$setAttribute",
                            vec![
                                Expr::Ident(target.clone()),
                                string_expr(&name),
                                Expr::Lit(Lit::Str(Str {
                                    span: DUMMY_SP,
                                    value: s.value.clone(),
                                    raw: None,
                                })),
                            ],
                        );
                        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(call) }));
                    }
                }
                Some(JSXAttrValue::JSXExprContainer(ec)) => {
                    if let JSXExpr::Expr(expr) = &ec.expr {
                        let inner = unwrap_expr(expr.as_ref());
                        if is_custom_element && should_emit_custom_element_property(&name, inner) {
                            emit_dynamic_property(stmts, target, &name, inner);
                            continue;
                        }
                        if try_emit_static_expr_attr(stmts, target, &name, inner) {
                            continue;
                        }
                        // 动态属性统一进入 watch，具体属性按类别分别处理
                        if name == "dangerouslySetInnerHTML" {
                            let obj_ident = ident("__obj");
                            let obj_decl = Stmt::Decl(Decl::Var(Box::new(VarDecl {
                                span: DUMMY_SP,
                                ctxt: SyntaxContext::empty(),
                                kind: VarDeclKind::Const,
                                declare: false,
                                decls: vec![VarDeclarator {
                                    span: DUMMY_SP,
                                    name: Pat::Ident(BindingIdent {
                                        id: obj_ident.clone(),
                                        type_ann: None,
                                    }),
                                    init: Some(Box::new(Expr::Paren(ParenExpr {
                                        span: DUMMY_SP,
                                        expr: Box::new(inner.clone()),
                                    }))),
                                    definite: false,
                                }],
                            })));
                            let has_obj = Expr::Ident(obj_ident.clone());
                            let in_html = Expr::Bin(BinExpr {
                                span: DUMMY_SP,
                                op: BinaryOp::In,
                                left: Box::new(string_expr("__html")),
                                right: Box::new(Expr::Ident(obj_ident.clone())),
                            });
                            let test = Expr::Bin(BinExpr {
                                span: DUMMY_SP,
                                op: BinaryOp::LogicalAnd,
                                left: Box::new(has_obj),
                                right: Box::new(in_html),
                            });
                            let html_member = Expr::Member(MemberExpr {
                                span: DUMMY_SP,
                                obj: Box::new(Expr::Ident(obj_ident.clone())),
                                prop: MemberProp::Ident(ident_name("__html")),
                            });
                            let cond = Expr::Cond(CondExpr {
                                span: DUMMY_SP,
                                test: Box::new(test),
                                cons: Box::new(html_member),
                                alt: Box::new(Expr::Lit(Lit::Str(Str {
                                    span: DUMMY_SP,
                                    value: "".into(),
                                    raw: None,
                                }))),
                            });
                            let call = call_ident(
                                "_$setInnerHTML",
                                vec![Expr::Ident(target.clone()), cond],
                            );
                            let arrow = Expr::Arrow(ArrowExpr {
                                span: DUMMY_SP,
                                params: vec![],
                                body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                    span: DUMMY_SP,
                                    ctxt: SyntaxContext::empty(),
                                    stmts: vec![
                                        obj_decl,
                                        Stmt::Expr(ExprStmt {
                                            span: DUMMY_SP,
                                            expr: Box::new(call),
                                        }),
                                    ],
                                })),
                                is_async: false,
                                is_generator: false,
                                type_params: None,
                                return_type: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            let watch = call_ident("effect", vec![arrow]);
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(watch),
                            }));
                        } else if name == "style" {
                            let style_var = ident(&format!("{}_style", target.sym));
                            let paren = Expr::Paren(ParenExpr {
                                span: DUMMY_SP,
                                expr: Box::new(inner.clone()),
                            });
                            let decl = const_decl(style_var.clone(), paren);
                            let set_style = call_ident(
                                "_$setStyle",
                                vec![Expr::Ident(target.clone()), Expr::Ident(style_var.clone())],
                            );
                            let arrow = Expr::Arrow(ArrowExpr {
                                span: DUMMY_SP,
                                params: vec![],
                                body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                    span: DUMMY_SP,
                                    ctxt: SyntaxContext::empty(),
                                    stmts: vec![
                                        decl,
                                        Stmt::Expr(ExprStmt {
                                            span: DUMMY_SP,
                                            expr: Box::new(set_style),
                                        }),
                                    ],
                                })),
                                is_async: false,
                                is_generator: false,
                                type_params: None,
                                return_type: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            let watch = call_ident("effect", vec![arrow]);
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(watch),
                            }));
                        } else if name == "className" {
                            let arg = match inner {
                                Expr::Member(_) | Expr::Ident(_) => Expr::Paren(ParenExpr {
                                    span: DUMMY_SP,
                                    expr: Box::new(inner.clone()),
                                }),
                                _ => inner.clone(),
                            };
                            let set_attr = call_ident(
                                "_$setClassName",
                                vec![Expr::Ident(target.clone()), arg],
                            );
                            let arrow = Expr::Arrow(ArrowExpr {
                                span: DUMMY_SP,
                                params: vec![],
                                body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                    span: DUMMY_SP,
                                    ctxt: SyntaxContext::empty(),
                                    stmts: vec![Stmt::Expr(ExprStmt {
                                        span: DUMMY_SP,
                                        expr: Box::new(set_attr),
                                    })],
                                })),
                                is_async: false,
                                is_generator: false,
                                type_params: None,
                                return_type: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            let watch = call_ident("effect", vec![arrow]);
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(watch),
                            }));
                        } else if name == "ref" {
                            // 将动态 ref 值封装成箭头函数（ArrowExpr）
                            // - SWC AST 中 ArrowExpr 表示 `() => expr`，这里用来“延迟求值”，保持最新的 ref
                            // - Vapor 运行时在需要时调用该函数，避免在编译期或初次绑定时就固定值
                            let get_ref_arrow = Expr::Arrow(ArrowExpr {
                                span: DUMMY_SP,
                                params: vec![],
                                body: Box::new(BlockStmtOrExpr::Expr(Box::new(Expr::Paren(
                                    ParenExpr { span: DUMMY_SP, expr: Box::new(inner.clone()) },
                                )))),
                                is_async: false,
                                is_generator: false,
                                type_params: None,
                                return_type: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            // 调用编译运行时 `_$compiledBindUseRef(el, getRef)`。
                            // helper 自己把“停止 watcher + 清空旧 ref”收敛成一个幂等 cleanup，
                            // 普通 JSX 登记到组件；列表行会在后续 codegen 阶段补上 owner registrar。
                            let bind_call = call_ident(
                                "_$compiledBindUseRef",
                                vec![Expr::Ident(target.clone()), get_ref_arrow],
                            );
                            push_expr_stmt(stmts, bind_call);
                        } else if name == "value" {
                            // 受控 `value`：
                            // - `<select multiple>`：将值规范化为数组/集合，并同步各 `<option>` 的选中态
                            // - 其它输入：直接赋值给 `el.value`
                            let is_select = match &opening.name {
                                JSXElementName::Ident(i) => i.sym.as_ref() == "select",
                                _ => false,
                            };
                            let has_multiple = opening.attrs.iter().any(|a| match a {
                                JSXAttrOrSpread::JSXAttr(attr) => match &attr.name {
                                    JSXAttrName::Ident(idn) => idn.sym.as_ref() == "multiple",
                                    _ => false,
                                },
                                _ => false,
                            });
                            if is_select && has_multiple {
                                let set_val = call_ident(
                                    "_$setValue",
                                    vec![Expr::Ident(target.clone()), inner.clone()],
                                );
                                let arrow = Expr::Arrow(ArrowExpr {
                                    span: DUMMY_SP,
                                    params: vec![],
                                    body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                        span: DUMMY_SP,
                                        ctxt: SyntaxContext::empty(),
                                        stmts: vec![Stmt::Expr(ExprStmt {
                                            span: DUMMY_SP,
                                            expr: Box::new(set_val),
                                        })],
                                    })),
                                    is_async: false,
                                    is_generator: false,
                                    type_params: None,
                                    return_type: None,
                                    ctxt: SyntaxContext::empty(),
                                });
                                let watch = call_ident("effect", vec![arrow]);
                                stmts.push(Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(watch),
                                }));
                            } else {
                                // 非 `<select multiple>` 的输入，直接委托到适配器 `_$setValue`
                                let set_val = call_ident(
                                    "_$setValue",
                                    vec![Expr::Ident(target.clone()), inner.clone()],
                                );
                                // 同样用 watch 包裹，确保响应式更新
                                let arrow = Expr::Arrow(ArrowExpr {
                                    span: DUMMY_SP,
                                    params: vec![],
                                    body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                        span: DUMMY_SP,
                                        ctxt: SyntaxContext::empty(),
                                        stmts: vec![Stmt::Expr(ExprStmt {
                                            span: DUMMY_SP,
                                            expr: Box::new(set_val),
                                        })],
                                    })),
                                    is_async: false,
                                    is_generator: false,
                                    type_params: None,
                                    return_type: None,
                                    ctxt: SyntaxContext::empty(),
                                });
                                let watch = call_ident("effect", vec![arrow]);
                                stmts.push(Stmt::Expr(ExprStmt {
                                    span: DUMMY_SP,
                                    expr: Box::new(watch),
                                }));
                            }
                        } else if name == "disabled" {
                            // 动态 `disabled` 属性，统一交由适配器处理
                            let call = call_ident(
                                "_$setDisabled",
                                vec![Expr::Ident(target.clone()), inner.clone()],
                            );
                            // 用 watch 保证每次值变化时更新到 DOM
                            let arrow = Expr::Arrow(ArrowExpr {
                                span: DUMMY_SP,
                                params: vec![],
                                body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                    span: DUMMY_SP,
                                    ctxt: SyntaxContext::empty(),
                                    stmts: vec![Stmt::Expr(ExprStmt {
                                        span: DUMMY_SP,
                                        expr: Box::new(call),
                                    })],
                                })),
                                is_async: false,
                                is_generator: false,
                                type_params: None,
                                return_type: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            let watch = call_ident("effect", vec![arrow]);
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(watch),
                            }));
                        } else if name == "multiple" || name == "open" {
                            // 对任意值进行“布尔保护”，`!!expr` 将其转换为严格的 boolean
                            let paren_inner = Expr::Paren(ParenExpr {
                                span: DUMMY_SP,
                                expr: Box::new(inner.clone()),
                            });
                            let notnot = Expr::Unary(UnaryExpr {
                                span: DUMMY_SP,
                                op: UnaryOp::Bang,
                                arg: Box::new(Expr::Unary(UnaryExpr {
                                    span: DUMMY_SP,
                                    op: UnaryOp::Bang,
                                    arg: Box::new(paren_inner),
                                })),
                            });
                            // 直接写回到对应的 DOM 布尔属性；赋值 false 会同步移除其激活状态。
                            let boolean_property =
                                if name == "multiple" { "multiple" } else { "open" };
                            let assign = Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(Expr::Assign(AssignExpr {
                                    span: DUMMY_SP,
                                    op: AssignOp::Assign,
                                    left: AssignTarget::Simple(SimpleAssignTarget::Member(
                                        MemberExpr {
                                            span: DUMMY_SP,
                                            obj: Box::new(Expr::Ident(target.clone())),
                                            prop: MemberProp::Ident(ident_name(boolean_property)),
                                        },
                                    )),
                                    right: Box::new(notnot),
                                })),
                            });
                            // 用 watch 包裹上述赋值
                            let arrow = Expr::Arrow(ArrowExpr {
                                span: DUMMY_SP,
                                params: vec![],
                                body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                    span: DUMMY_SP,
                                    ctxt: SyntaxContext::empty(),
                                    stmts: vec![assign],
                                })),
                                is_async: false,
                                is_generator: false,
                                type_params: None,
                                return_type: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            let watch = call_ident("effect", vec![arrow]);
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(watch),
                            }));
                        } else if name == "checked" {
                            // 动态 `checked` 同样做布尔保护并交由适配器处理
                            let paren_inner = Expr::Paren(ParenExpr {
                                span: DUMMY_SP,
                                expr: Box::new(inner.clone()),
                            });
                            let notnot = Expr::Unary(UnaryExpr {
                                span: DUMMY_SP,
                                op: UnaryOp::Bang,
                                arg: Box::new(Expr::Unary(UnaryExpr {
                                    span: DUMMY_SP,
                                    op: UnaryOp::Bang,
                                    arg: Box::new(paren_inner),
                                })),
                            });
                            let call = call_ident(
                                "_$setChecked",
                                vec![Expr::Ident(target.clone()), notnot],
                            );
                            // watch 包裹，确保响应式更新
                            let arrow = Expr::Arrow(ArrowExpr {
                                span: DUMMY_SP,
                                params: vec![],
                                body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                    span: DUMMY_SP,
                                    ctxt: SyntaxContext::empty(),
                                    stmts: vec![Stmt::Expr(ExprStmt {
                                        span: DUMMY_SP,
                                        expr: Box::new(call),
                                    })],
                                })),
                                is_async: false,
                                is_generator: false,
                                type_params: None,
                                return_type: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            let watch = call_ident("effect", vec![arrow]);
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(watch),
                            }));
                        } else if compiled_event_spec(&name).is_some() {
                            emit_vapor_event(stmts, target, &name, inner, attr_index);
                        } else {
                            let arg = match inner {
                                Expr::Member(_) | Expr::Ident(_) => Expr::Paren(ParenExpr {
                                    span: DUMMY_SP,
                                    expr: Box::new(inner.clone()),
                                }),
                                _ => inner.clone(),
                            };
                            // 将任意动态属性值统一转为字符串：`String(value)`
                            let to_string = Expr::Call(CallExpr {
                                span: DUMMY_SP,
                                callee: Callee::Expr(Box::new(Expr::Ident(ident("String")))),
                                args: vec![ExprOrSpread { spread: None, expr: Box::new(arg) }],
                                type_args: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            // 动态属性统一用适配器设置，避免直接使用原生 DOM API
                            let set_attr = call_ident(
                                "_$setAttribute",
                                vec![Expr::Ident(target.clone()), string_expr(&name), to_string],
                            );
                            // 用 watch 包裹以实现响应式属性更新
                            let arrow = Expr::Arrow(ArrowExpr {
                                span: DUMMY_SP,
                                params: vec![],
                                body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                                    span: DUMMY_SP,
                                    ctxt: SyntaxContext::empty(),
                                    stmts: vec![Stmt::Expr(ExprStmt {
                                        span: DUMMY_SP,
                                        expr: Box::new(set_attr),
                                    })],
                                })),
                                is_async: false,
                                is_generator: false,
                                type_params: None,
                                return_type: None,
                                ctxt: SyntaxContext::empty(),
                            });
                            // 值变更时触发 watch，生命周期由 vapor-runtime 统一管理与清理
                            let watch = call_ident("effect", vec![arrow]);
                            stmts.push(Stmt::Expr(ExprStmt {
                                span: DUMMY_SP,
                                expr: Box::new(watch),
                            }));
                        }
                    }
                }
                _ => {
                    // 无值布尔属性，如 <select multiple>
                    if name == "disabled" {
                        let call = call_ident(
                            "_$setDisabled",
                            vec![
                                Expr::Ident(target.clone()),
                                Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })),
                            ],
                        );
                        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(call) }));
                    } else if name == "checked" {
                        // 无值 `checked`：受控输入的初始勾选态
                        let call = call_ident(
                            "_$setChecked",
                            vec![
                                Expr::Ident(target.clone()),
                                Expr::Lit(Lit::Bool(Bool { span: DUMMY_SP, value: true })),
                            ],
                        );
                        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(call) }));
                    } else if is_string_boolean_attr(&name) {
                        let call = call_ident(
                            "_$setAttribute",
                            vec![
                                Expr::Ident(target.clone()),
                                string_expr(&name),
                                string_expr("true"),
                            ],
                        );
                        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(call) }));
                    } else if name == "multiple" {
                        let call = call_ident(
                            "_$setAttribute",
                            vec![
                                Expr::Ident(target.clone()),
                                string_expr("multiple"),
                                string_expr(""),
                            ],
                        );
                        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(call) }));
                    }
                }
            }
        }
    }
}

#[cfg(test)]
#[path = "attrs_tests.rs"]
mod tests;
