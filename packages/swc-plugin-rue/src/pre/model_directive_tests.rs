use super::*;
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn parse_jsx_opening(src: &str) -> JSXOpeningElement {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("model-directive-test.tsx".into()).into(),
        src.to_string(),
    );
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

fn parse_ts_expr(src: &str) -> Expr {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("model-directive-test.ts".into()).into(),
        src.to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: false, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    *parser.parse_expr().expect("parse ts expr")
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
            JSXAttrOrSpread::JSXAttr(attr) if jsx_attr_name_matches(&attr.name, name) => Some(attr),
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

fn attr_src(opening: &JSXOpeningElement, name: &str) -> String {
    normalize(&emit_expr_source(attr_expr(ident_attr(opening, name))).expect("attr expr source"))
}

#[test]
fn parses_model_specs_from_namespaced_prefixed_and_safe_names() {
    assert_eq!(normalize_model_arg("user-name"), Some("userName".to_string()));
    assert_eq!(normalize_model_arg("ModelValue"), Some("modelValue".to_string()));

    assert_eq!(
        parse_raw_model_suffix(":lazy-trim-user-name"),
        Some((Some("userName".to_string()), vec!["lazy".to_string(), "trim".to_string()])),
    );
    assert_eq!(parse_raw_model_suffix(":number"), Some((None, vec!["number".to_string()])),);
    assert_eq!(
        parse_safe_model_name("__rue_model__user_name__mods__lazy__trim"),
        Some((Some("userName".to_string()), vec!["lazy".to_string(), "trim".to_string()])),
    );
    assert_eq!(parse_safe_model_name("__rue_model__"), Some((None, Vec::new())));
    assert_eq!(
        parse_safe_model_name("__rue_model__user__mods__..__number"),
        Some((Some("user".to_string()), vec!["number".to_string()])),
    );

    let namespaced_opening = parse_jsx_opening("<Field v-model:trim-user-name={state.value} />");
    let namespaced_attr = match &namespaced_opening.attrs[0] {
        JSXAttrOrSpread::JSXAttr(attr) => attr,
        _ => panic!("expected jsx attr"),
    };
    let namespaced_spec = directive_spec_from_name(&namespaced_attr.name).expect("namespaced spec");
    assert_eq!(namespaced_spec.prop_name, "userName");
    assert_eq!(namespaced_spec.update_name, "onUpdateUserName");
    assert_eq!(namespaced_spec.modifiers_prop_name, "userNameModifiers");
    assert_eq!(namespaced_spec.modifiers, vec!["trim"]);

    let safe_opening =
        parse_jsx_opening("<Field __rue_model__user_name__mods__lazy__trim={state.value} />");
    let safe_attr = match &safe_opening.attrs[0] {
        JSXAttrOrSpread::JSXAttr(attr) => attr,
        _ => panic!("expected safe jsx attr"),
    };
    let safe_spec = directive_spec_from_name(&safe_attr.name).expect("safe spec");
    assert_eq!(safe_spec.prop_name, "userName");
    assert_eq!(safe_spec.modifiers, vec!["lazy", "trim"]);

    let safe_default_opening = parse_jsx_opening("<Field __rue_model__={state.value} />");
    let safe_default_attr = match &safe_default_opening.attrs[0] {
        JSXAttrOrSpread::JSXAttr(attr) => attr,
        _ => panic!("expected safe default attr"),
    };
    let safe_default_spec =
        directive_spec_from_name(&safe_default_attr.name).expect("safe default spec");
    assert_eq!(safe_default_spec.prop_name, "modelValue");
    assert!(safe_default_spec.modifiers.is_empty());

    let r_model_opening = parse_jsx_opening("<Field r-model:lazy-user-name={state.value} />");
    let r_model_attr = match &r_model_opening.attrs[0] {
        JSXAttrOrSpread::JSXAttr(attr) => attr,
        _ => panic!("expected r-model attr"),
    };
    let r_model_spec = directive_spec_from_name(&r_model_attr.name).expect("r-model spec");
    assert_eq!(r_model_spec.prop_name, "userName");
    assert_eq!(r_model_spec.update_name, "onUpdateUserName");
    assert_eq!(r_model_spec.modifiers, vec!["lazy"]);

    let bare_r_model = parse_jsx_opening("<Field r-model={state.value} />");
    let bare_attr = match &bare_r_model.attrs[0] {
        JSXAttrOrSpread::JSXAttr(attr) => attr,
        _ => panic!("expected bare r-model attr"),
    };
    let bare_spec = directive_spec_from_name(&bare_attr.name).expect("bare r-model spec");
    assert_eq!(bare_spec.prop_name, "modelValue");
    assert!(bare_spec.modifiers.is_empty());
}

#[test]
fn rejects_invalid_model_names_and_normalizes_defaults() {
    assert_eq!(normalize_model_arg("--"), None);
    assert_eq!(normalize_model_arg("::"), None);
    assert_eq!(normalize_model_arg("UserName"), Some("userName".to_string()));
    assert_eq!(normalize_model_arg("user:name"), Some("userName".to_string()));
    assert_eq!(normalize_modifier(".."), None);
    assert_eq!(get_static_truthy_bool(&parse_ts_expr("void 0")), Some(false));
    assert_eq!(get_static_truthy_bool(&parse_ts_expr("!ready")), None);
    assert_eq!(parse_raw_model_suffix(""), Some((None, Vec::new())));
    assert_eq!(parse_raw_model_suffix(":."), None);
    assert_eq!(parse_raw_model_suffix(":lazy.trim"), None);
    assert_eq!(
        parse_raw_model_suffix(":lazy-number-"),
        Some((None, vec!["lazy".to_string(), "number".to_string()]))
    );
    assert_eq!(parse_raw_model_suffix(":lazy"), Some((None, vec!["lazy".to_string()])));
    assert_eq!(parse_raw_model_suffix(":lazy-"), Some((None, vec!["lazy".to_string()])));
    assert_eq!(parse_raw_model_suffix(":-user"), Some((Some("user".to_string()), Vec::new())));
    assert_eq!(
        parse_raw_model_suffix(":lazy-trim"),
        Some((None, vec!["lazy".to_string(), "trim".to_string()]))
    );
    assert_eq!(
        parse_safe_model_name("__rue_model____mods____trim"),
        Some((None, vec!["trim".to_string()]))
    );

    let default_spec = parse_model_spec(None, Vec::new());
    assert_eq!(default_spec.prop_name, "modelValue");
    assert_eq!(default_spec.update_name, "onUpdateModelValue");
    assert_eq!(default_spec.modifiers_prop_name, "modelModifiers");

    let invalid_namespace = parse_jsx_opening("<Field x-model:user={state.value} />");
    let attr = match &invalid_namespace.attrs[0] {
        JSXAttrOrSpread::JSXAttr(attr) => attr,
        _ => panic!("expected attr"),
    };
    assert!(directive_spec_from_name(&attr.name).is_none());
}

#[test]
fn classifies_native_model_kinds_from_tag_and_attrs() {
    assert!(matches!(
        native_model_kind(&parse_jsx_opening("<textarea />")),
        NativeModelKind::TextArea
    ));
    assert!(matches!(
        native_model_kind(&parse_jsx_opening("<select multiple />")),
        NativeModelKind::Select { multiple: true }
    ));
    assert!(matches!(
        native_model_kind(&parse_jsx_opening("<input type=\"checkbox\" />")),
        NativeModelKind::Checkbox
    ));
    assert!(matches!(
        native_model_kind(&parse_jsx_opening("<input type=\"radio\" />")),
        NativeModelKind::Radio
    ));
    assert!(matches!(
        native_model_kind(&parse_jsx_opening("<input type=\"number\" />")),
        NativeModelKind::TextInput { event_name: "onInput", auto_number: true, .. }
    ));
    assert!(matches!(
        native_model_kind(&parse_jsx_opening("<input />")),
        NativeModelKind::TextInput { event_name: "onInput", auto_number: false, .. }
    ));
    assert!(matches!(
        native_model_kind(&parse_jsx_opening("<input type={kind} />")),
        NativeModelKind::TextInput { event_name: "onInput", auto_number: false, .. }
    ));
    assert!(matches!(
        native_model_kind(&parse_jsx_opening("<custom-element />")),
        NativeModelKind::TextInput { event_name: "onInput", auto_number: false, .. }
    ));
    assert!(matches!(
        native_model_kind(&parse_jsx_opening("<select multiple={false} />")),
        NativeModelKind::Select { multiple: false }
    ));
    assert!(matches!(
        native_model_kind(&parse_jsx_opening("<UI.Input />")),
        NativeModelKind::TextInput { event_name: "onInput", auto_number: false, .. }
    ));
}

#[test]
fn covers_model_helper_fallbacks_and_static_attr_edges() {
    assert!(matches!(
        parsed_expr_or_noop("}".to_string(), "invalid-model-handler.tsx"),
        Expr::Arrow(_)
    ));

    for (src, expected) in [
        ("'x'", Some(true)),
        ("''", Some(false)),
        ("1", Some(true)),
        ("0", Some(false)),
        ("true", Some(true)),
        ("false", Some(false)),
        ("null", Some(false)),
        ("undefined", Some(false)),
        ("void 0", Some(false)),
        ("value", None),
    ] {
        assert_eq!(get_static_truthy_bool(&parse_expr(src, "truthy.tsx").expect(src)), expected);
    }

    assert!(!is_raw_model_modifier_token("..."));
    assert_eq!(parse_raw_model_suffix("plain"), None);
    assert_eq!(parse_raw_model_suffix(":---"), None);
    assert_eq!(
        parse_safe_model_name("__rue_model__checked"),
        Some((Some("checked".into()), vec![]))
    );

    let mut namespaced = parse_jsx_opening("<input data:x=\"y\" />");
    upsert_attr(&mut namespaced, "value", parse_expr("state.value", "value.tsx").expect("expr"));
    assert_eq!(attr_src(&namespaced, "value"), normalize("state.value"));
    assert!(get_attr_expr_by_names(&namespaced, &["missing"]).is_none());
    assert!(get_static_string_attr(&namespaced, "missing").is_none());

    assert!(!has_truthy_attr(&parse_jsx_opening("<select multiple=\"\" />"), "multiple"));
    assert!(!has_truthy_attr(&parse_jsx_opening("<select multiple={void 0} />"), "multiple"));
    assert!(has_truthy_attr(&parse_jsx_opening("<select {...props} multiple />"), "multiple"));
    assert_eq!(
        get_static_string_attr(&parse_jsx_opening("<input type={'range'} />"), "type"),
        Some("range".to_string())
    );
    assert!(!has_truthy_attr(&parse_jsx_opening("<select data:multiple=\"x\" />"), "multiple"));

    let mut unsupported_multiple = parse_jsx_opening("<select multiple />");
    let span_opening = parse_jsx_opening("<span />");
    for attr in &mut unsupported_multiple.attrs {
        let JSXAttrOrSpread::JSXAttr(attr) = attr else {
            continue;
        };
        if matches!(&attr.name, JSXAttrName::Ident(id) if id.sym.as_ref() == "multiple") {
            attr.value = Some(JSXAttrValue::JSXElement(Box::new(JSXElement {
                span: DUMMY_SP,
                opening: span_opening.clone(),
                children: Vec::new(),
                closing: None,
            })));
        }
    }
    assert!(has_truthy_attr(&unsupported_multiple, "multiple"));

    let mut unsupported_type = parse_jsx_opening("<input type=\"text\" />");
    let span_opening = parse_jsx_opening("<span />");
    for attr in &mut unsupported_type.attrs {
        let JSXAttrOrSpread::JSXAttr(attr) = attr else {
            continue;
        };
        if matches!(&attr.name, JSXAttrName::Ident(id) if id.sym.as_ref() == "type") {
            attr.value = Some(JSXAttrValue::JSXElement(Box::new(JSXElement {
                span: DUMMY_SP,
                opening: span_opening.clone(),
                children: Vec::new(),
                closing: None,
            })));
        }
    }
    assert_eq!(get_static_string_attr(&unsupported_type, "type"), None);

    let mut empty_expr_attr = parse_jsx_opening("<input v-model={value} type=\"text\" />");
    for attr in &mut empty_expr_attr.attrs {
        let JSXAttrOrSpread::JSXAttr(attr) = attr else {
            continue;
        };
        let JSXAttrName::Ident(ident) = &attr.name else {
            continue;
        };
        if ident.sym.as_ref() == "v-model" || ident.sym.as_ref() == "type" {
            attr.value = Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                span: DUMMY_SP,
                expr: JSXExpr::JSXEmptyExpr(JSXEmptyExpr { span: DUMMY_SP }),
            }));
        }
    }
    let model_attr = ident_attr(&empty_expr_attr, "v-model");
    assert!(get_attr_value_expr(model_attr).is_none());
    assert_eq!(get_static_string_attr(&empty_expr_attr, "type"), None);
    assert!(has_truthy_attr(&empty_expr_attr, "type"));
}

#[test]
fn rewrites_component_model_to_controlled_props_and_modifiers() {
    let mut opening = parse_jsx_opening("<Field v-model:lazy-trim-user-name={state.value} />");
    transform_opening(&mut opening);

    assert_eq!(opening.attrs.len(), 3);
    let model_expr = attr_expr(ident_attr(&opening, "userName"));
    assert_eq!(
        normalize(&emit_expr_source(model_expr).expect("model expr")),
        normalize("state.value")
    );

    let update_expr = attr_expr(ident_attr(&opening, "onUpdateUserName"));
    let update_src = normalize(&emit_expr_source(update_expr).expect("update expr"));
    assert!(update_src.contains("(value)"));
    assert!(update_src.contains("state.value = value") || update_src.contains("state.value=value"));

    let modifiers_expr = attr_expr(ident_attr(&opening, "userNameModifiers"));
    let modifiers_src = normalize(&emit_expr_source(modifiers_expr).expect("modifiers expr"));
    assert!(modifiers_src.contains(&normalize("\"lazy\": true")));
    assert!(modifiers_src.contains(&normalize("\"trim\": true")));
    assert!(!modifiers_src.contains("v-model"));
}

#[test]
fn rewrites_multiple_component_models_and_upserts_existing_props() {
    let mut opening = parse_jsx_opening(
        "<Field modelValue=\"old\" onUpdateModelValue={oldHandler} v-model={state.value} __rue_model__checked__mods__lazy={state.checked} />",
    );
    transform_opening(&mut opening);

    assert_eq!(attr_src(&opening, "modelValue"), normalize("state.value"));
    assert!(attr_src(&opening, "onUpdateModelValue").contains("state.value = value"));
    assert_eq!(attr_src(&opening, "checked"), normalize("state.checked"));
    assert!(attr_src(&opening, "onUpdateChecked").contains("state.checked = value"));
    assert!(attr_src(&opening, "checkedModifiers").contains(&normalize("\"lazy\": true")));
    assert!(opening.attrs.iter().all(|attr| match attr {
        JSXAttrOrSpread::JSXAttr(attr) => !is_model_directive_attr(attr),
        _ => true,
    }));

    let mut spread_component = parse_jsx_opening(
        "<Field {...rest} value={oldValue} __rue_model__value__mods__trim={state.value} />",
    );
    transform_opening(&mut spread_component);

    assert_eq!(attr_src(&spread_component, "value"), normalize("state.value"));
    assert!(attr_src(&spread_component, "onUpdateValue").contains("state.value = value"));
    assert!(attr_src(&spread_component, "valueModifiers").contains(&normalize("\"trim\": true")));
    assert!(
        spread_component.attrs.iter().any(|attr| matches!(attr, JSXAttrOrSpread::SpreadElement(_)))
    );
    assert!(spread_component.attrs.iter().all(|attr| match attr {
        JSXAttrOrSpread::JSXAttr(attr) => !is_model_directive_attr(attr),
        _ => true,
    }));
}

#[test]
fn rewrites_native_text_checkbox_and_select_models() {
    let mut text_input =
        parse_jsx_opening("<input type=\"number\" v-model:trim-lazy={age.value} />");
    transform_opening(&mut text_input);
    assert_eq!(
        normalize(
            &emit_expr_source(attr_expr(ident_attr(&text_input, "value"))).expect("value src")
        ),
        normalize("age.value")
    );
    let text_handler_src = normalize(
        &emit_expr_source(attr_expr(ident_attr(&text_input, "onChange"))).expect("text handler"),
    );
    assert!(text_handler_src.contains("value.trim()"));
    assert!(text_handler_src.contains("parseFloat(value)"));
    assert!(text_handler_src.contains("age.value = value"));

    let mut checkbox = parse_jsx_opening(
        "<input type=\"checkbox\" true-value=\"yes\" false-value=\"no\" r-model={picked.value} />",
    );
    transform_opening(&mut checkbox);
    let checked_src = normalize(
        &emit_expr_source(attr_expr(ident_attr(&checkbox, "checked"))).expect("checked expr"),
    );
    assert!(checked_src.contains("Array.isArray(picked.value)"));
    assert!(checked_src.contains("picked.value instanceof Set"));
    assert!(checked_src.contains("(picked.value) === (\"yes\")"));
    let checkbox_handler_src = normalize(
        &emit_expr_source(attr_expr(ident_attr(&checkbox, "onChange"))).expect("checkbox handler"),
    );
    assert!(checkbox_handler_src.contains("picked.value = checked ? \"yes\" : \"no\""));

    let mut select = parse_jsx_opening(
        "<select multiple v-model:number={selected.value}><option value=\"1\">1</option></select>",
    );
    transform_opening(&mut select);
    let select_handler_src = normalize(
        &emit_expr_source(attr_expr(ident_attr(&select, "onChange"))).expect("select handler"),
    );
    assert!(select_handler_src.contains("selectedOptions"));
    assert!(select_handler_src.contains("parseFloat(value)"));
    assert!(select_handler_src.contains("selected.value ="));

    let mut simple_select = parse_jsx_opening("<select multiple v-model={selected} />");
    transform_opening(&mut simple_select);
    let simple_select_handler = attr_src(&simple_select, "onChange");
    assert!(simple_select_handler.contains("selectedOptions"));
    assert!(simple_select_handler.contains("option.value"));
    assert!(!simple_select_handler.contains("parseFloat(value)"));

    let mut trim_select = parse_jsx_opening("<select multiple v-model:trim={selected.value} />");
    transform_opening(&mut trim_select);
    let trim_select_handler = attr_src(&trim_select, "onChange");
    assert!(trim_select_handler.contains("selectedOptions"));
    assert!(trim_select_handler.contains("value.trim()"));
    assert!(trim_select_handler.contains("selected.value ="));
}

#[test]
fn rewrites_textarea_single_select_radio_default_checkbox_and_default_input_models() {
    let mut textarea = parse_jsx_opening("<textarea v-model:lazy-number={form.bio} />");
    transform_opening(&mut textarea);
    assert_eq!(attr_src(&textarea, "value"), normalize("form.bio"));
    let textarea_handler = attr_src(&textarea, "onChange");
    assert!(textarea_handler.contains("$event.target"));
    assert!(textarea_handler.contains("parseFloat(value)"));
    assert!(textarea_handler.contains("form.bio = value"));

    let mut single_select = parse_jsx_opening("<select v-model:trim={form.choice} />");
    transform_opening(&mut single_select);
    assert_eq!(attr_src(&single_select, "value"), normalize("form.choice"));
    let select_handler = attr_src(&single_select, "onChange");
    assert!(select_handler.contains("$event.target"));
    assert!(select_handler.contains("value.trim()"));
    assert!(select_handler.contains("form.choice = value"));

    let mut eager_textarea = parse_jsx_opening("<textarea v-model={form.notes} />");
    transform_opening(&mut eager_textarea);
    assert_eq!(attr_src(&eager_textarea, "value"), normalize("form.notes"));
    assert!(attr_src(&eager_textarea, "onInput").contains("$event.target"));
    assert!(eager_textarea.attrs.iter().all(|attr| {
        !matches!(
            attr,
            JSXAttrOrSpread::JSXAttr(JSXAttr {
                name: JSXAttrName::Ident(name),
                ..
            }) if name.sym.as_ref() == "onChange"
        )
    }));

    let mut radio = parse_jsx_opening("<input type=\"radio\" value=\"yes\" v-model={picked} />");
    transform_opening(&mut radio);
    assert!(attr_src(&radio, "checked").contains("(picked) === (\"yes\")"));
    let radio_handler = attr_src(&radio, "onChange");
    assert!(radio_handler.contains("checked"));
    assert!(radio_handler.contains("picked = \"yes\""));

    let mut checkbox = parse_jsx_opening("<input type=\"checkbox\" v-model={enabled} />");
    transform_opening(&mut checkbox);
    assert!(attr_src(&checkbox, "checked").contains("!!(enabled)"));
    let checkbox_handler = attr_src(&checkbox, "onChange");
    assert!(checkbox_handler.contains("enabled = checked ? true : false"));

    let mut input = parse_jsx_opening("<input {...props} v-model={message} />");
    transform_opening(&mut input);
    assert_eq!(attr_src(&input, "value"), normalize("message"));
    assert!(attr_src(&input, "onInput").contains("$event.target"));
    assert!(input.attrs.iter().any(|attr| matches!(attr, JSXAttrOrSpread::SpreadElement(_))));
}

#[test]
fn rewrites_signal_get_models_with_signal_set_handlers() {
    let mut text_input = parse_jsx_opening("<input v-model={text.get()} />");
    transform_opening(&mut text_input);
    assert_eq!(attr_src(&text_input, "value"), normalize("text.get()"));
    assert!(attr_src(&text_input, "onInput").contains("text.set(value)"));

    let mut checkbox = parse_jsx_opening("<input type=\"checkbox\" r-model={accepted.get()} />");
    transform_opening(&mut checkbox);
    assert!(attr_src(&checkbox, "checked").contains("accepted.get()"));
    assert!(attr_src(&checkbox, "onChange").contains("accepted.set(checked ? true : false)"));
}

#[test]
fn handles_missing_directive_values_as_undefined_model_expr() {
    let mut opening = parse_jsx_opening("<input v-model />");
    transform_opening(&mut opening);

    assert_eq!(attr_src(&opening, "value"), normalize("undefined"));
    assert!(attr_src(&opening, "onInput").contains("undefined = value"));
}

#[test]
fn falls_back_to_undefined_when_model_expr_cannot_be_printed() {
    let invalid_model = Expr::Invalid(Invalid { span: DUMMY_SP });
    let invalid_source = emit_expr_source(&invalid_model);
    assert!(invalid_source.is_none(), "{invalid_source:?}");

    let mut component = parse_jsx_opening("<Field />");
    let spec = parse_model_spec(None, Vec::new());
    apply_component_model(&mut component, &spec, invalid_model.clone());
    let component_update = attr_src(&component, "onUpdateModelValue");
    assert!(component_update.contains("undefined = value"), "{component_update}");

    let mut input = parse_jsx_opening("<input />");
    apply_native_model(&mut input, invalid_model, &[]);
    let input_handler = attr_src(&input, "onInput");
    assert!(input_handler.contains("undefined = value"), "{input_handler}");
}

#[test]
fn ignores_elements_without_model_directives() {
    let mut opening = parse_jsx_opening("<input value={state.value} />");
    transform_opening(&mut opening);
    assert_eq!(opening.attrs.len(), 1);
    assert!(
        matches!(&opening.attrs[0], JSXAttrOrSpread::JSXAttr(attr) if matches!(&attr.name, JSXAttrName::Ident(id) if id.sym.as_ref() == "value"))
    );
}

#[test]
fn hardens_model_attr_scan_and_native_fallback_edges() {
    assert!(parse_safe_model_name("__rue_model__---").is_none());
    assert!(parse_safe_model_name("plain").is_none());

    let no_value = parse_jsx_opening("<input type />");
    assert_eq!(get_static_string_attr(&no_value, "type"), None);
    assert!(has_truthy_attr(&no_value, "type"));

    let mut empty_truthy = parse_jsx_opening("<select multiple={true} />");
    for attr in &mut empty_truthy.attrs {
        let JSXAttrOrSpread::JSXAttr(attr) = attr else {
            continue;
        };
        if matches!(&attr.name, JSXAttrName::Ident(id) if id.sym.as_ref() == "multiple") {
            attr.value = Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                span: DUMMY_SP,
                expr: JSXExpr::JSXEmptyExpr(JSXEmptyExpr { span: DUMMY_SP }),
            }));
        }
    }
    assert!(has_truthy_attr(&empty_truthy, "multiple"));

    let mut opening = parse_jsx_opening(
        "<input {...props} data:model={skip} v-model={first} r-model={second} />",
    );
    transform_opening(&mut opening);

    assert_eq!(attr_src(&opening, "value"), normalize("first"));
    assert!(attr_src(&opening, "onInput").contains("first = value"));
    assert!(opening.attrs.iter().any(|attr| matches!(attr, JSXAttrOrSpread::SpreadElement(_))));
    assert!(opening.attrs.iter().any(|attr| matches!(
        attr,
        JSXAttrOrSpread::JSXAttr(JSXAttr {
            name: JSXAttrName::JSXNamespacedName(ns_name),
            ..
        }) if ns_name.ns.sym.as_ref() == "data"
    )));
    assert!(opening.attrs.iter().all(|attr| match attr {
        JSXAttrOrSpread::JSXAttr(attr) => !is_model_directive_attr(attr),
        _ => true,
    }));
}

#[test]
fn hardens_model_suffix_modifier_arg_and_multi_native_edges() {
    assert_eq!(
        parse_raw_model_suffix(":lazy-number-user_id"),
        Some((Some("userId".to_string()), vec!["lazy".to_string(), "number".to_string()],)),
    );
    assert_eq!(
        parse_raw_model_suffix(":lazy-number"),
        Some((None, vec!["lazy".to_string(), "number".to_string(),]))
    );
    assert_eq!(
        parse_raw_model_suffix(":lazy-number-"),
        Some((None, vec!["lazy".to_string(), "number".to_string(),]))
    );
    assert!(parse_raw_model_suffix(":lazy-...").is_none());
    assert_eq!(
        parse_safe_model_name("__rue_model__user__mods__lazy____number"),
        Some((Some("user".to_string()), vec!["lazy".to_string(), "number".to_string()],))
    );

    let mut native = parse_jsx_opening(
        "<input v-model:trim={first.value} v-model:number-user={second.value} />",
    );
    transform_opening(&mut native);

    assert_eq!(attr_src(&native, "value"), normalize("first.value"));
    assert!(attr_src(&native, "onInput").contains("first.value = value"));
    assert!(native.attrs.iter().all(|attr| match attr {
        JSXAttrOrSpread::JSXAttr(attr) => !is_model_directive_attr(attr),
        _ => true,
    }));
}
