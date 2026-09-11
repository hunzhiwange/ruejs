use super::*;
use swc_core::ecma::ast::{ExprStmt, Module, ModuleItem, Program, Stmt};
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn parse_ts_expr(src: &str) -> Expr {
    let cm = Arc::new(SourceMap::default());
    let fm =
        cm.new_source_file(FileName::Custom("on-directive-test.ts".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: false, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    *parser.parse_expr().expect("parse typescript expr")
}

fn parse_jsx_opening(src: &str) -> JSXOpeningElement {
    let cm = Arc::new(SourceMap::default());
    let fm = cm
        .new_source_file(FileName::Custom("on-directive-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    match *parser.parse_expr().expect("parse jsx expr") {
        Expr::JSXElement(el) => el.opening,
        other => panic!("expected JSXElement, got {other:?}"),
    }
}

fn parse_jsx_element(src: &str) -> JSXElement {
    let cm = Arc::new(SourceMap::default());
    let fm = cm
        .new_source_file(FileName::Custom("on-directive-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    match *parser.parse_expr().expect("parse jsx expr") {
        Expr::JSXElement(el) => *el,
        other => panic!("expected JSXElement, got {other:?}"),
    }
}

fn emit_expr(expr: Expr) -> String {
    let cm = Arc::new(SourceMap::default());
    let module = Module {
        span: DUMMY_SP,
        body: vec![ModuleItem::Stmt(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(expr) }))],
        shebang: None,
    };
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    emitter.emit_program(&Program::Module(module)).expect("emit expr");
    String::from_utf8(buf).expect("utf8")
}

fn normalize(src: &str) -> String {
    let mut out = String::new();
    let mut prev_space = false;
    for ch in src.chars() {
        if ch.is_whitespace() {
            if !prev_space {
                out.push(' ');
                prev_space = true;
            }
        } else {
            out.push(ch);
            prev_space = false;
        }
    }
    out.trim().to_string()
}

fn ident_attr<'a>(opening: &'a JSXOpeningElement, name: &str) -> &'a JSXAttr {
    opening
        .attrs
        .iter()
        .find_map(|attr| match attr {
            JSXAttrOrSpread::JSXAttr(attr) => match &attr.name {
                JSXAttrName::Ident(ident) if ident.sym.as_ref() == name => Some(attr),
                _ => None,
            },
            _ => None,
        })
        .expect("expected attr")
}

fn attr_expr(attr: &JSXAttr) -> &Expr {
    match attr.value.as_ref().expect("attr value") {
        JSXAttrValue::JSXExprContainer(container) => match &container.expr {
            JSXExpr::Expr(expr) => expr.as_ref(),
            _ => panic!("expected expr attr"),
        },
        other => panic!("expected expr container, got {other:?}"),
    }
}

#[test]
fn normalizes_event_names_and_safe_directive_markers() {
    assert_eq!(normalize_event_suffix("__mouse_down"), Some("MouseDown".to_string()));
    assert_eq!(normalize_event_suffix("mouse--down"), Some("MouseDown".to_string()));
    assert_eq!(normalize_event_suffix("..."), None);
    assert_eq!(normalize_event_suffix("__"), None);

    assert_eq!(normalize_modifier("__Prevent"), Some("prevent".to_string()));
    assert!(is_modifier_token("once"));
    assert!(is_modifier_token("12"));
    assert!(!is_modifier_token("..."));
    assert!(!is_modifier_token("custom"));

    assert_eq!(parse_namespaced_directive_name(""), None);
    assert_eq!(
        parse_namespaced_directive_name("click.prevent.stop"),
        Some(("onClick".to_string(), vec!["prevent".to_string(), "stop".to_string()])),
    );
    assert_eq!(
        parse_namespaced_directive_name("click..prevent."),
        Some(("onClick".to_string(), vec!["prevent".to_string()])),
    );
    assert_eq!(
        parse_namespaced_directive_name("click-meta-exact"),
        Some(("onClick".to_string(), vec!["meta".to_string(), "exact".to_string()])),
    );
    assert_eq!(
        parse_namespaced_directive_name("context-menu-prevent"),
        Some(("onContextMenu".to_string(), vec!["prevent".to_string()])),
    );
    assert_eq!(
        parse_namespaced_directive_name("custom-prevent"),
        Some(("onCustomPrevent".to_string(), Vec::new())),
    );
    assert_eq!(
        parse_namespaced_directive_name("mouse_down"),
        Some(("onMouseDown".to_string(), Vec::new())),
    );
    assert_eq!(
        parse_namespaced_directive_name("custom-widget"),
        Some(("onCustomWidget".to_string(), Vec::new())),
    );
    assert_eq!(
        parse_safe_directive_name("__rue_on__click"),
        Some(("onClick".to_string(), Vec::new())),
    );
    assert_eq!(
        parse_safe_directive_name("__rue_on__mouse_down__mods__native__once"),
        Some(("onMouseDown".to_string(), vec!["native".to_string(), "once".to_string()],)),
    );
    assert_eq!(
        parse_safe_directive_name("__rue_on__click__mods__..__once"),
        Some(("onClick".to_string(), vec!["once".to_string()])),
    );
    assert_eq!(parse_safe_directive_name("__rue_on__..."), None);
    assert!(
        directive_spec_from_name(&JSXAttrName::JSXNamespacedName(JSXNamespacedName {
            span: DUMMY_SP,
            ns: IdentName { span: DUMMY_SP, sym: "v-on".into() },
            name: IdentName { span: DUMMY_SP, sym: "...".into() },
        }))
        .is_none()
    );
}

#[test]
fn parses_inline_handlers_and_wraps_handler_shapes() {
    let empty = parse_inline_handler_source("").expect("empty handler");
    assert_eq!(normalize(&emit_expr(empty)), normalize("($event)=>{};"));

    let direct_expr = parse_inline_handler_source("submit").expect("direct expr");
    assert_eq!(normalize(&emit_expr(direct_expr)), normalize("submit;"));

    let inline_statements =
        parse_inline_handler_source("count++; log($event)").expect("inline statements");
    let emitted_inline = normalize(&emit_expr(inline_statements));
    assert!(emitted_inline.contains(&normalize("($event)=>{")));
    assert!(emitted_inline.contains(&normalize("count++;")));
    assert!(emitted_inline.contains(&normalize("log($event)")));

    let return_statement =
        parse_inline_handler_source("return submit()").expect("return statement");
    let emitted_return = normalize(&emit_expr(return_statement));
    assert!(emitted_return.contains(&normalize("($event)=>{")));
    assert!(emitted_return.contains(&normalize("return submit();")));

    let method_handler = build_handler_expr(parse_ts_expr("actions.submit"));
    assert_eq!(
        normalize(&emit_expr(method_handler)),
        normalize("($event)=>actions.submit($event);"),
    );

    let call_handler = build_handler_expr(parse_ts_expr("submit()"));
    assert_eq!(normalize(&emit_expr(call_handler)), normalize("($event)=>submit();"));

    let literal_handler = build_handler_expr(parse_ts_expr("($event) => submit($event)"));
    assert_eq!(normalize(&emit_expr(literal_handler)), normalize("($event)=>submit($event);"),);

    let unwrapped = wrap_with_modifiers(parse_ts_expr("submit()"), &[]);
    assert_eq!(normalize(&emit_expr(unwrapped)), normalize("submit();"));
}

#[test]
fn rewrites_standard_native_and_safe_event_directives() {
    let mut dom_opening = parse_jsx_opening("<div v-on:click-stop-prevent=\"submit\" />");
    transform_opening(&mut dom_opening);

    let dom_attr = ident_attr(&dom_opening, "onClick");
    let dom_expr = normalize(&emit_expr(attr_expr(dom_attr).clone()));
    assert!(dom_expr.contains("_$compiledWithEventModifiers"));
    assert!(dom_expr.contains(&normalize("submit($event)")));
    assert!(dom_expr.contains(&normalize("\"stop\"")));
    assert!(dom_expr.contains(&normalize("\"prevent\"")));

    let mut component_opening = parse_jsx_opening("<Card r-on:click-native-once={handleClick} />");
    transform_opening(&mut component_opening);

    let component_attr = ident_attr(&component_opening, "__rueNativeOnClick");
    let component_expr = normalize(&emit_expr(attr_expr(component_attr).clone()));
    assert!(component_expr.contains("_$compiledWithEventModifiers"));
    assert!(component_expr.contains(&normalize("handleClick($event)")));
    assert!(component_expr.contains(&normalize("\"once\"")));
    assert!(!component_expr.contains(&normalize("\"native\"")));

    let mut safe_opening = parse_jsx_opening("<div __rue_on__keyup__mods__enter />");
    transform_opening(&mut safe_opening);

    let safe_attr = ident_attr(&safe_opening, "onKeyup");
    let safe_expr = normalize(&emit_expr(attr_expr(safe_attr).clone()));
    assert!(safe_expr.contains("_$compiledWithEventModifiers"));
    assert!(safe_expr.contains(&normalize("($event)=>{}")));
    assert!(safe_expr.contains(&normalize("\"enter\"")));
}

#[test]
fn leaves_non_directive_attrs_unchanged() {
    let mut opening = parse_jsx_opening("<div onClick={handleClick} />");
    transform_opening(&mut opening);

    let attr = ident_attr(&opening, "onClick");
    assert_eq!(normalize(&emit_expr(attr_expr(attr).clone())), normalize("handleClick;"));
}

#[test]
fn skips_spreads_unsupported_namespaces_and_empty_expr_values() {
    let mut opening = parse_jsx_opening("<div {...props} x-on:click={skip} v-on:click={submit} />");

    for attr in &mut opening.attrs {
        let JSXAttrOrSpread::JSXAttr(attr) = attr else {
            continue;
        };
        let JSXAttrName::JSXNamespacedName(ns_name) = &attr.name else {
            continue;
        };
        if ns_name.ns.sym.as_ref() == "v-on" {
            attr.value = Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                span: DUMMY_SP,
                expr: JSXExpr::JSXEmptyExpr(JSXEmptyExpr { span: DUMMY_SP }),
            }));
        }
    }

    transform_opening(&mut opening);

    assert!(opening.attrs.iter().any(|attr| matches!(attr, JSXAttrOrSpread::SpreadElement(_))));
    assert!(opening.attrs.iter().any(|attr| matches!(
        attr,
        JSXAttrOrSpread::JSXAttr(JSXAttr {
            name: JSXAttrName::JSXNamespacedName(ns_name),
            ..
        }) if ns_name.ns.sym.as_ref() == "x-on"
    )));

    let attr = ident_attr(&opening, "onClick");
    assert_eq!(normalize(&emit_expr(attr_expr(attr).clone())), normalize("($event)=>{};"));
}

#[test]
fn leaves_directives_with_unsupported_jsx_attr_values_unchanged() {
    let mut opening = parse_jsx_opening("<div v-on:click={submit} />");
    let span_value = parse_jsx_element("<span />");

    for attr in &mut opening.attrs {
        let JSXAttrOrSpread::JSXAttr(attr) = attr else {
            continue;
        };
        attr.value = Some(JSXAttrValue::JSXElement(Box::new(span_value.clone())));
    }

    transform_opening(&mut opening);

    assert!(opening.attrs.iter().all(|attr| match attr {
        JSXAttrOrSpread::JSXAttr(attr) => !matches!(
            &attr.name,
            JSXAttrName::Ident(id) if id.sym.as_ref() == "onClick"
        ),
        _ => true,
    }));
}

#[test]
fn leaves_malformed_string_handlers_unchanged() {
    assert!(parse_inline_handler_source("function (").is_none());
    let mut opening = parse_jsx_opening("<div v-on:click=\"function (\" />");
    transform_opening(&mut opening);

    assert!(opening.attrs.iter().all(|attr| match attr {
        JSXAttrOrSpread::JSXAttr(attr) => !matches!(
            &attr.name,
            JSXAttrName::Ident(id) if id.sym.as_ref() == "onClick"
        ),
        _ => true,
    }));
    assert!(opening.attrs.iter().any(|attr| matches!(
        attr,
        JSXAttrOrSpread::JSXAttr(JSXAttr {
            name: JSXAttrName::JSXNamespacedName(ns_name),
            ..
        }) if ns_name.ns.sym.as_ref() == "v-on"
    )));
}

#[test]
fn hardens_event_parser_empty_modifier_and_namespace_edges() {
    assert_eq!(normalize_event_suffix(""), None);
    assert_eq!(normalize_event_suffix("---"), None);
    assert_eq!(parse_namespaced_directive_name(""), None);
    assert_eq!(parse_namespaced_directive_name(".prevent"), None);
    assert_eq!(
        parse_namespaced_directive_name("click..prevent"),
        Some(("onClick".to_string(), vec!["prevent".to_string()]))
    );
    assert_eq!(
        parse_namespaced_directive_name("focus-001"),
        Some(("onFocus".to_string(), vec!["001".to_string()]))
    );
    assert_eq!(
        parse_safe_directive_name("__rue_on__click__mods____once__"),
        Some(("onClick".to_string(), vec!["once".to_string()]))
    );

    let mut component = parse_jsx_opening("<Panel v-on:focus-001-native=\"submit\" />");
    transform_opening(&mut component);
    let native = ident_attr(&component, "__rueNativeOnFocus");
    let native_src = normalize(&emit_expr(attr_expr(native).clone()));
    assert!(native_src.contains("_$compiledWithEventModifiers"));
    assert!(native_src.contains("\"001\""));
    assert!(!native_src.contains("\"native\""));

    let mut unsupported = parse_jsx_opening("<div data:click={skip} __rue_on__---={skip} />");
    transform_opening(&mut unsupported);
    assert!(unsupported.attrs.iter().all(|attr| match attr {
        JSXAttrOrSpread::JSXAttr(attr) => !matches!(
            &attr.name,
            JSXAttrName::Ident(id) if id.sym.as_ref().starts_with("on")
        ),
        _ => true,
    }));
}

#[test]
fn hardens_more_event_suffix_and_hyphen_modifier_fallbacks() {
    assert_eq!(normalize_event_suffix("keyup_enter"), Some("KeyupEnter".to_string()));
    assert_eq!(normalize_event_suffix("custom--"), Some("Custom".to_string()));
    assert_eq!(normalize_modifier("::Capture"), Some("capture".to_string()));
    assert_eq!(normalize_modifier("..."), None);
    assert_eq!(
        parse_namespaced_directive_name("custom-prevent-stop"),
        Some(("onCustomPreventStop".to_string(), Vec::new()))
    );
    assert_eq!(
        parse_namespaced_directive_name("key-up-enter-prevent"),
        Some(("onKeyUpEnterPrevent".to_string(), Vec::new()))
    );

    let mut opening = parse_jsx_opening("<button __rue_on__keyup__mods__enter__once=\"submit\" />");
    transform_opening(&mut opening);
    let attr = ident_attr(&opening, "onKeyupOnce");
    let out = normalize(&emit_expr(attr_expr(attr).clone()));
    assert!(out.contains("_$compiledWithEventModifiers"));
    assert!(out.contains("\"enter\""));
    assert!(!out.contains("\"once\""));
}

#[test]
fn hardens_safe_native_event_names_and_inline_statement_handlers() {
    assert_eq!(
        parse_safe_directive_name("__rue_on__pointer_down__mods__native__capture__passive"),
        Some((
            "onPointerDown".to_string(),
            vec!["native".to_string(), "capture".to_string(), "passive".to_string()],
        ))
    );

    let mut component = parse_jsx_opening(
        "<Panel __rue_on__pointer_down__mods__native__capture__passive=\"count++; submit($event)\" />",
    );
    transform_opening(&mut component);

    let attr = ident_attr(&component, "__rueNativeOnPointerDown");
    let out = normalize(&emit_expr(attr_expr(attr).clone()));
    assert!(out.contains("_$compiledWithEventModifiers"), "{out}");
    assert!(out.contains("count++"), "{out}");
    assert!(out.contains("submit($event)"), "{out}");
    assert!(out.contains("\"capture\""), "{out}");
    assert!(out.contains("\"passive\""), "{out}");
    assert!(!out.contains("\"native\""), "{out}");

    let mut dom = parse_jsx_opening("<button r-on:keyup-enter-once={handle} />");
    transform_opening(&mut dom);
    let dom_attr = ident_attr(&dom, "onKeyupOnce");
    let dom_out = normalize(&emit_expr(attr_expr(dom_attr).clone()));
    assert!(dom_out.contains("_$compiledWithEventModifiers"), "{dom_out}");
    assert!(dom_out.contains("\"enter\""), "{dom_out}");
    assert!(!dom_out.contains("\"once\""), "{dom_out}");
}

#[test]
fn hardens_dot_native_events_and_empty_string_handlers() {
    assert!(matches!(
        parse_inline_handler_source("   "),
        Some(Expr::Arrow(ArrowExpr { params, .. })) if params.len() == 1
    ));
    assert_eq!(
        parse_namespaced_directive_name("click.native.once"),
        Some(("onClick".to_string(), vec!["native".to_string(), "once".to_string()]))
    );

    let mut component = parse_jsx_opening("<Panel __rue_on__click__mods__native__once=\"\" />");
    transform_opening(&mut component);

    let attr = ident_attr(&component, "__rueNativeOnClick");
    let out = normalize(&emit_expr(attr_expr(attr).clone()));
    assert!(out.contains("_$compiledWithEventModifiers"), "{out}");
    assert!(out.contains("($event)=>{}"), "{out}");
    assert!(out.contains("\"once\""), "{out}");
    assert!(!out.contains("\"native\""), "{out}");

    let mut native_dom = parse_jsx_opening("<button __rue_on__keyup__mods__enter=\"\" />");
    transform_opening(&mut native_dom);
    let dom_attr = ident_attr(&native_dom, "onKeyup");
    let dom_out = normalize(&emit_expr(attr_expr(dom_attr).clone()));
    assert!(dom_out.contains("($event)=>{}"), "{dom_out}");
    assert!(dom_out.contains("\"enter\""), "{dom_out}");
}
