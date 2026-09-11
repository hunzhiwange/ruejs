use super::*;
use std::sync::Arc;
use swc_core::common::{DUMMY_SP, FileName, SourceMap};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn parse_expr(src: &str, tsx: bool) -> Expr {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(FileName::Custom("utils-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    *parser.parse_expr().expect("parse expr")
}

fn parse_jsx_element(src: &str) -> JSXElement {
    match parse_expr(src, true) {
        Expr::JSXElement(el) => *el,
        other => panic!("expected JSXElement, got {other:?}"),
    }
}

fn with_empty_expr_attr(mut el: JSXElement, name: &str) -> JSXElement {
    for attr in &mut el.opening.attrs {
        let JSXAttrOrSpread::JSXAttr(attr) = attr else {
            continue;
        };
        if matches!(&attr.name, JSXAttrName::Ident(id) if id.sym.as_ref() == name) {
            attr.value = Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                span: DUMMY_SP,
                expr: JSXExpr::JSXEmptyExpr(JSXEmptyExpr { span: DUMMY_SP }),
            }));
        }
    }
    el
}

#[test]
fn unwraps_ts_wrappers_and_detects_component_like_elements() {
    let paren_expr = parse_expr("(((foo)))", false);
    assert!(matches!(unwrap_expr(&paren_expr), Expr::Ident(id) if id.sym.as_ref() == "foo"));

    let as_expr = parse_expr("foo as number", false);
    assert!(matches!(unwrap_expr(&as_expr), Expr::Ident(id) if id.sym.as_ref() == "foo"));

    let type_assert_expr = parse_expr("<number>foo", false);
    assert!(matches!(unwrap_expr(&type_assert_expr), Expr::Ident(id) if id.sym.as_ref() == "foo"));

    let non_null_expr = parse_expr("foo!", false);
    assert!(matches!(unwrap_expr(&non_null_expr), Expr::Ident(id) if id.sym.as_ref() == "foo"));

    let instantiation_expr = parse_expr("foo<string>", false);
    assert!(
        matches!(unwrap_expr(&instantiation_expr), Expr::Ident(id) if id.sym.as_ref() == "foo")
    );

    let satisfies_expr = parse_expr("foo satisfies string", false);
    assert!(matches!(unwrap_expr(&satisfies_expr), Expr::Ident(id) if id.sym.as_ref() == "foo"));

    assert!(is_component(&parse_jsx_element("<Dialog />").opening.name));
    assert!(!is_component(&parse_jsx_element("<dialog />").opening.name));
    assert!(is_component(&parse_jsx_element("<Dialog.Header />").opening.name));
    assert!(is_builtin_fragment_element(&parse_jsx_element("<Fragment />")));
    assert!(is_transition_component(&parse_jsx_element("<Transition />")));
    assert!(is_transition_component(&parse_jsx_element("<UI.Transition />")));
    assert!(!is_transition_component(&parse_jsx_element("<TransitionGroup />")));
    assert!(!is_transition_component(&parse_jsx_element("<UI.Transitions />")));
    assert!(!is_transition_component(&parse_jsx_element("<Transition.Item />")));
    assert!(is_transition_group_component(&parse_jsx_element("<TransitionGroup />")));
    assert!(is_transition_group_component(&parse_jsx_element("<UI.TransitionGroup />")));
    assert!(!is_transition_group_component(&parse_jsx_element("<UI.Panel />")));
    assert!(is_transition_raw_children_component(&parse_jsx_element("<Transition />")));
    assert!(is_transition_raw_children_component(&parse_jsx_element("<UI.Transition />")));
    assert!(is_transition_raw_children_component(&parse_jsx_element("<TransitionGroup />")));
    assert!(!is_transition_raw_children_component(&parse_jsx_element("<UI.Transitions />")));
    assert!(!is_transition_raw_children_component(&parse_jsx_element("<Transition.Item />")));
    assert!(!is_transition_raw_children_component(&parse_jsx_element("<UI.Panel />")));
}

#[test]
fn detects_children_members_and_static_literal_shapes() {
    assert!(is_children_member_expr(&parse_expr("props.children", false)));
    assert!(is_children_member_expr(&parse_expr("ctx.children", false)));
    assert!(is_children_member_expr(&parse_expr("(ctx.children as any)", false)));
    assert!(!is_children_member_expr(&parse_expr("props['children']", false)));

    assert!(is_static_empty_like(&parse_expr("null", false)));
    assert!(is_static_empty_like(&parse_expr("false", false)));
    assert!(is_static_empty_like(&parse_expr("undefined", false)));
    assert!(is_static_empty_like(&parse_expr("void 0", false)));
    assert!(!is_static_empty_like(&parse_expr("1", false)));

    assert!(is_static_text_literal(&parse_expr("'hello'", false)));
    assert!(is_static_text_literal(&parse_expr("42", false)));
    assert!(is_static_text_literal(&parse_expr("(42 as const)", false)));
    assert!(!is_static_text_literal(&parse_expr("true", false)));

    let str_expr = get_static_text_literal_expr(&parse_expr("'hello'", false)).expect("string lit");
    assert!(
        matches!(str_expr, Expr::Lit(Lit::Str(s)) if s.value.as_str().unwrap_or("") == "hello")
    );

    let number_expr = get_static_text_literal_expr(&parse_expr("42", false)).expect("number lit");
    assert!(
        matches!(number_expr, Expr::Lit(Lit::Str(s)) if s.value.as_str().unwrap_or("") == "42")
    );
    assert!(get_static_text_literal_expr(&parse_expr("true", false)).is_none());
}

#[test]
fn hardens_static_component_prop_detection_with_wrapped_literals_and_callbacks() {
    let wrapped_static = parse_jsx_element(
        "<Card title={'ok' as const} count={(1 as number)} active={(true as boolean)} />",
    );
    assert!(component_has_no_dynamic_props_excluding_children(&wrapped_static));

    let callback_aliases = parse_jsx_element(
        "<Card onSave={save} itemHandler={handleItem} renderCallback={render} makeFn={make} />",
    );
    assert!(component_has_no_dynamic_props_excluding_children(&callback_aliases));

    let callback_member = parse_jsx_element("<Card itemHandler={actions.save} />");
    assert!(!component_has_no_dynamic_props_excluding_children(&callback_member));
}

#[test]
fn detects_transition_component_shortcuts() {
    assert!(!is_transition_group_component(&parse_jsx_element("<svg:path />")));
    assert!(!is_transition_raw_children_component(&parse_jsx_element("<svg:path />")));
}

#[test]
fn rejects_namespaced_dynamic_callback_attrs() {
    let namespaced_callback = parse_jsx_element("<Card data:handler={handle} />");
    assert!(!component_has_no_dynamic_props_excluding_children(&namespaced_callback));
}

#[test]
fn distinguishes_dynamic_component_props_from_allowed_static_and_callback_forms() {
    let static_component = parse_jsx_element(
        "<Card title=\"ok\" count={1} active={true} onClick={handleClick} footerCallback={handleFooter} renderFn={() => null} children={slot} />",
    );
    assert!(component_has_no_dynamic_props_excluding_children(&static_component));

    let dynamic_ident_prop = parse_jsx_element("<Card data={store} />");
    assert!(!component_has_no_dynamic_props_excluding_children(&dynamic_ident_prop));

    let spread_component = parse_jsx_element("<Card {...props} title=\"ok\" />");
    assert!(!component_has_no_dynamic_props_excluding_children(&spread_component));

    let dynamic_expr_component = parse_jsx_element("<Card title={label + suffix} />");
    assert!(!component_has_no_dynamic_props_excluding_children(&dynamic_expr_component));

    let native_el = parse_jsx_element("<div title=\"ok\" />");
    assert!(!component_has_no_dynamic_props_excluding_children(&native_el));

    let namespaced_static = parse_jsx_element("<Card data:track=\"ok\" />");
    assert!(component_has_no_dynamic_props_excluding_children(&namespaced_static));

    let empty_expr_attr =
        with_empty_expr_attr(parse_jsx_element("<Card title={value} />"), "title");
    assert!(!component_has_no_dynamic_props_excluding_children(&empty_expr_attr));

    let bare_attr = parse_jsx_element("<Card disabled />");
    assert!(!component_has_no_dynamic_props_excluding_children(&bare_attr));
}
