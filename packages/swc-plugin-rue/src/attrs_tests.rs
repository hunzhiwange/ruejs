use super::*;
use std::sync::Arc;
use swc_core::common::{FileName, SourceMap};
use swc_core::ecma::ast::{Module, ModuleItem, Program};
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn parse_expr(src: &str, tsx: bool) -> Expr {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(FileName::Custom("attrs-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    *parser.parse_expr().expect("parse expr")
}

fn parse_jsx_opening(src: &str) -> JSXOpeningElement {
    match parse_expr(src, true) {
        Expr::JSXElement(el) => el.opening,
        other => panic!("expected JSXElement, got {other:?}"),
    }
}

fn emit_stmts(stmts: Vec<Stmt>) -> String {
    let cm = Arc::new(SourceMap::default());
    let module = Module {
        span: DUMMY_SP,
        body: stmts.into_iter().map(ModuleItem::Stmt).collect(),
        shebang: None,
    };
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    emitter.emit_program(&Program::Module(module)).expect("emit stmts");
    String::from_utf8(buf).expect("utf8")
}

fn emit_expr(expr: Expr) -> String {
    emit_stmts(vec![Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(expr) })])
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

fn transform_module(src: &str) -> String {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("compiled-attrs-test.tsx".into()).into(),
        src.to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let program = parser.parse_program().expect("parse module");
    let transformed = crate::apply(program);
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    emitter.emit_program(&transformed).expect("emit transformed module");
    String::from_utf8(buf).expect("utf8")
}

#[test]
fn compiles_proven_scalar_attrs_to_owned_direct_dom_effects() {
    let output = transform_module(
        r#"
import { signal } from '@rue-js/rue';
export const View = () => {
  const state = signal(0);
  return (
  <section
    className={state.get() === 0 ? 'idle' : 'ready'}
    style={String(state.get() === 0 ? 'color:red' : 'color:blue')}
    title={state.get() === 0 ? 'first' : null}
  >
    <input
      value={String(state.get())}
      checked={Boolean(state.get())}
      disabled={Boolean(state.get())}
      multiple={Boolean(state.get())}
    />
  </section>
  );
};
"#,
    );
    let out = normalize(&output);

    assert!(out.contains("from \"@rue-js/rue/internal"), "{output}");
    assert!(!out.contains("from \"@rue-js/rue/internal\""), "{output}");
    assert!(out.contains("_$compiledRoot"), "{output}");
    assert!(out.contains("effect(()=>"), "{output}");
    assert!(out.contains("_$template(\"<section><input></section>\")"), "{output}");
    assert!(out.contains(".content.cloneNode(true)"), "{output}");
    assert!(out.contains("const _el1 = _root"), "{output}");
    assert!(out.contains("const _el2 = _root.childNodes[0]"), "{output}");
    assert!(!out.contains("_$compiledCreateElement"), "{output}");
    assert!(!out.contains("_$compiledAppendChild"), "{output}");
    assert!(!out.contains("document.createElement"), "{output}");
    assert!(out.contains("_el1.setAttribute(\"class\""), "{output}");
    assert!(out.contains("_el1.style.cssText"), "{output}");
    assert!(out.contains("_el1.removeAttribute(\"title\")"), "{output}");
    assert!(out.contains("_el2.value"), "{output}");
    assert!(out.contains(".checked ="), "{output}");
    assert!(out.contains(".disabled ="), "{output}");
    assert!(out.contains(".multiple ="), "{output}");
    assert!(!out.contains("watchEffect"), "{output}");
    assert!(!out.contains("_$setClassName"), "{output}");
    assert!(!out.contains("_$setStyle"), "{output}");
    assert!(!out.contains("_$setAttribute"), "{output}");
    assert!(!out.contains("_$setValue"), "{output}");
    assert!(!out.contains("_$setChecked"), "{output}");
    assert!(!out.contains("_$setDisabled"), "{output}");
}

#[test]
fn compiles_proven_rue_reactive_members_in_native_attrs() {
    let output = transform_module(
        r#"
import { ref, reactive } from '@rue-js/rue';
export const View = () => {
  const label = ref('ready');
  const form = reactive({ className: 'active', style: 'color:red', checked: true });
  return <input className={form.className} style={form.style} title={label.value}
    value={label.value} checked={form.checked} disabled={form.checked} />;
};
"#,
    );
    let out = normalize(&output);

    assert!(out.contains("_$compiledRoot"), "{output}");
    assert!(out.contains("effect(()=>"), "{output}");
    assert!(out.contains("form.className"), "{output}");
    assert!(out.contains("form.style"), "{output}");
    assert!(out.contains("label.value"), "{output}");
    assert!(!out.contains("watchEffect"), "{output}");
    assert!(!out.contains("vapor("), "{output}");
}

#[test]
fn compiles_static_key_reactive_style_records_without_vapor() {
    let output = transform_module(
        r#"
import { ref } from '@rue-js/rue';
export const View = () => {
  const color = ref('green');
  return <p style={{ color: color.value, opacity: 0.75, 'background-color': color.value }} />;
};
"#,
    );
    let out = normalize(&output);

    assert!(out.contains("_$compiledRoot"), "{output}");
    assert!(out.contains("effect(()=>"), "{output}");
    assert!(out.contains("color.value"), "{output}");
    assert!(out.contains("Object.is"), "{output}");
    assert!(out.contains(".style.color"), "{output}");
    assert!(out.contains(".style.opacity"), "{output}");
    assert!(out.contains(".style.setProperty(\"background-color\""), "{output}");
    assert!(!out.contains("watchEffect"), "{output}");
    assert!(!out.contains("_$setStyle"), "{output}");
    assert!(!out.contains("vapor("), "{output}");
}

#[test]
fn compiles_unsafe_style_records_with_the_shared_style_helper() {
    for source in [
        r#"
import { ref } from '@rue-js/rue';
export const View = () => {
  const color = ref('green');
  const base = { opacity: 0.75 };
  return <p style={{ ...base, color: color.value }} />;
};
"#,
        r#"
import { ref } from '@rue-js/rue';
export const View = () => {
  const color = ref('green');
  const property = 'color';
  return <p style={{ [property]: color.value }} />;
};
"#,
        r#"
export const View = () => <p style={{ color: loadColor() }} />;
"#,
    ] {
        let output = transform_module(source);
        let out = normalize(&output);

        assert!(out.contains("from \"@rue-js/rue/internal"), "{output}");
        assert!(out.contains("effect"), "{output}");
        assert!(!out.contains("_$setStyle"), "{output}");
        assert!(out.contains("_$compiledRoot"), "{output}");
        assert!(!out.contains("vapor("), "{output}");
    }
}

#[test]
fn compiles_unproven_attr_values_with_guarded_dom_effects() {
    let output = transform_module(
        r#"
const makeStyle = () => ({ color: 'red' });
export const View = () => <div style={makeStyle()} title={loadValue()} />;
"#,
    );
    let out = normalize(&output);

    assert!(out.contains("from \"@rue-js/rue/internal"), "{output}");
    assert!(out.contains("effect"), "{output}");
    assert!(!out.contains("_$setStyle"), "{output}");
    assert!(out.contains(".setAttribute(\"title\""), "{output}");
    assert!(out.contains("_$compiledRoot"), "{output}");
}

#[test]
fn compiles_shadowed_scalar_constructors_without_assuming_scalar_results() {
    let output = transform_module(
        r#"
import { signal } from '@rue-js/rue';
export const View = () => {
  const state = signal(0);
  const String = (value: unknown) => ({ value });
  return <div title={String(state.get())} />;
};
"#,
    );
    let out = normalize(&output);

    assert!(out.contains("from \"@rue-js/rue/internal"), "{output}");
    assert!(out.contains(".setAttribute(\"title\""), "{output}");
    assert!(out.contains("_$compiledRoot"), "{output}");
}

#[test]
fn compiles_native_events_and_refs_to_owned_browser_operations() {
    let output = transform_module(
        r#"
export const View = (props) => (
  <section>
    <button ref={props.buttonRef} onClick={props.onClick} onFocusCapture={props.onFocus}>
      Save
    </button>
  </section>
);
"#,
    );
    let out = normalize(&output);
    let compiled_import = output
        .lines()
        .find(|line| line.contains("@rue-js/rue/internal/reactive"))
        .expect("compiled runtime import");

    assert!(out.contains("from \"@rue-js/rue/internal"), "{output}");
    assert!(compiled_import.contains("onOwnerCleanup"), "{output}");
    assert!(out.contains("_$compiledRoot"), "{output}");
    assert!(out.contains("onOwnerCleanup"), "{output}");
    assert!(out.contains(".addEventListener(\"click\", __event"), "{output}");
    assert!(out.contains(".removeEventListener(\"click\", __event"), "{output}");
    assert!(out.contains(".addEventListener(\"focus\", __event"), "{output}");
    assert!(out.contains(".removeEventListener(\"focus\", __event"), "{output}");
    assert!(out.contains("capture: true"), "{output}");
    assert!(out.contains("_$compiledPropsGet(props, \"onClick\")"), "{output}");
    assert!(out.contains("typeof __ref"), "{output}");
    assert!(out.contains(".current ="), "{output}");
    assert!(out.contains("null"), "{output}");
    assert!(!out.contains("_$addEventListener"), "{output}");
    assert!(!out.contains("_$compiledBindUseRef"), "{output}");
    assert!(!out.contains("from \"@rue-js/rue/internal\""), "{output}");
}

#[test]
fn delegates_only_zero_parameter_static_bubbling_event_arrows() {
    let output = transform_module(
        r#"
export const View = () => (
  <section>
    <button onClick={() => select(1)}>Delegated</button>
    <button onClick={(event) => selectEvent(event)}>Event parameter</button>
    <button onClickCapture={() => capture()}>Capture</button>
    <button onClickOnce={() => once()}>Once</button>
    <button onClickPassive={() => passive()}>Passive</button>
    <button onMouseEnter={() => enter()}>Non bubbling</button>
    <button onClick={dynamicHandler}>Dynamic</button>
  </section>
);
"#,
    );
    let out = normalize(&output);

    assert_eq!(out.matches("_$compiledDelegateEvent(").count(), 1, "{output}");
    assert!(out.contains("_$compiledDelegateEvent("), "{output}");
    assert_eq!(out.matches(".addEventListener(").count(), 6, "{output}");
    assert_eq!(out.matches(".removeEventListener(").count(), 6, "{output}");
    assert!(out.contains("capture: true"), "{output}");
    assert!(out.contains("()=>()=>select(1)"), "{output}");
}

#[test]
fn compiles_complex_events_and_refs_without_legacy_fallback() {
    let output = transform_module(
        r#"
export const Modified = () => <button r-on:click-stop={handleClick}>Modified</button>;
export const DynamicEvents = () => <button {...eventProps}>Dynamic</button>;
export const DynamicRef = () => <button ref={chooseRef()}>Ref</button>;
import { Panel } from './compiled-components';
export const ComponentRef = () => <Panel ref={panelRef} />;
export const EventBoundary = () => <div r-on:click={handleClick}><Panel /></div>;
"#,
    );
    let out = normalize(&output);

    assert!(out.contains("from \"@rue-js/rue/internal"), "{output}");
    assert!(out.contains("_$compiledWithEventModifiers"), "{output}");
    assert!(out.contains("_$compiledSpreadAttributes"), "{output}");
    assert!(out.contains("_$compiledBindUseRef"), "{output}");
    assert!(out.contains("_$createComponent"), "{output}");
    assert!(!out.contains("_$compiledWithNativeEvents"), "{output}");
    assert!(out.contains("_$compiledRoot"), "{output}");
}

#[test]
fn extracts_static_literals_strings_truthy_values_and_style_objects() {
    assert!(matches!(
        get_static_literal_value_expr(&parse_expr("'hello'", false)),
        Some(Expr::Lit(Lit::Str(s))) if s.value.as_str().unwrap_or("") == "hello"
    ));
    assert!(matches!(
        get_static_literal_value_expr(&parse_expr("42", false)),
        Some(Expr::Lit(Lit::Num(n))) if n.value == 42.0
    ));
    assert!(matches!(
        get_static_literal_value_expr(&parse_expr("true", false)),
        Some(Expr::Lit(Lit::Bool(b))) if b.value
    ));
    assert!(matches!(
        get_static_literal_value_expr(&parse_expr("null", false)),
        Some(Expr::Lit(Lit::Null(_)))
    ));
    assert!(matches!(
        get_static_literal_value_expr(&parse_expr("undefined", false)),
        Some(Expr::Ident(id)) if id.sym.as_ref() == "undefined"
    ));
    assert!(matches!(
        get_static_literal_value_expr(&parse_expr("void 0", false)),
        Some(Expr::Unary(u)) if matches!(u.op, UnaryOp::Void)
    ));
    assert!(get_static_literal_value_expr(&parse_expr("!ready", false)).is_none());
    assert!(get_static_literal_value_expr(&parse_expr("count + 1", false)).is_none());

    assert!(matches!(
        get_static_stringified_expr(&parse_expr("1", false)),
        Some(Expr::Lit(Lit::Str(s))) if s.value.as_str().unwrap_or("") == "1"
    ));
    assert!(matches!(
        get_static_stringified_expr(&parse_expr("false", false)),
        Some(Expr::Lit(Lit::Str(s))) if s.value.as_str().unwrap_or("") == "false"
    ));
    assert!(matches!(
        get_static_stringified_expr(&parse_expr("true", false)),
        Some(Expr::Lit(Lit::Str(s))) if s.value.as_str().unwrap_or("") == "true"
    ));
    assert!(matches!(
        get_static_stringified_expr(&parse_expr("null", false)),
        Some(Expr::Lit(Lit::Str(s))) if s.value.as_str().unwrap_or("") == "null"
    ));
    assert!(matches!(
        get_static_stringified_expr(&parse_expr("undefined", false)),
        Some(Expr::Lit(Lit::Str(s))) if s.value.as_str().unwrap_or("") == "undefined"
    ));
    assert!(matches!(
        get_static_stringified_expr(&parse_expr("void 0", false)),
        Some(Expr::Lit(Lit::Str(s))) if s.value.as_str().unwrap_or("") == "undefined"
    ));
    assert!(get_static_stringified_expr(&parse_expr("!ready", false)).is_none());
    assert_eq!(get_static_truthy_bool(&parse_expr("''", false)), Some(false));
    assert_eq!(get_static_truthy_bool(&parse_expr("'x'", false)), Some(true));
    assert_eq!(get_static_truthy_bool(&parse_expr("0", false)), Some(false));
    assert_eq!(get_static_truthy_bool(&parse_expr("7", false)), Some(true));
    assert_eq!(
        get_static_truthy_bool(&Expr::Lit(Lit::Num(Number {
            span: DUMMY_SP,
            value: f64::NAN,
            raw: None,
        }))),
        Some(false)
    );
    assert_eq!(get_static_truthy_bool(&parse_expr("null", false)), Some(false));
    assert_eq!(get_static_truthy_bool(&parse_expr("undefined", false)), Some(false));
    assert_eq!(get_static_truthy_bool(&parse_expr("void 0", false)), Some(false));
    assert_eq!(get_static_truthy_bool(&parse_expr("!ready", false)), None);
    assert_eq!(get_static_truthy_bool(&parse_expr("count", false)), None);

    let style_expr =
        get_static_style_expr(&parse_expr("({ color: 'red', hidden: false, size: 2 })", false))
            .expect("static style expr");
    let style_out = normalize(&emit_expr(style_expr));
    assert!(style_out.contains(&normalize("color: 'red'")));
    assert!(style_out.contains(&normalize("hidden: false")));
    assert!(style_out.contains(&normalize("size: 2")));

    assert!(get_static_style_expr(&parse_expr("({ color: tone })", false)).is_none());
    assert!(get_static_style_expr(&parse_expr("({ color })", false)).is_none());
    assert!(get_static_style_expr(&parse_expr("({ ...style })", false)).is_none());

    assert!(matches!(
        get_static_style_expr(&parse_expr("'color:red'", false)),
        Some(Expr::Lit(Lit::Str(s))) if s.value.as_str().unwrap_or("") == "color:red"
    ));
    assert!(matches!(
        get_static_style_expr(&parse_expr("3", false)),
        Some(Expr::Lit(Lit::Num(n))) if n.value == 3.0
    ));
    assert!(matches!(
        get_static_style_expr(&parse_expr("true", false)),
        Some(Expr::Lit(Lit::Bool(b))) if b.value
    ));
    assert!(matches!(
        get_static_style_expr(&parse_expr("null", false)),
        Some(Expr::Lit(Lit::Null(_)))
    ));
    assert!(matches!(
        get_static_style_expr(&parse_expr("undefined", false)),
        Some(Expr::Ident(id)) if id.sym.as_ref() == "undefined"
    ));
    assert!(matches!(
        get_static_style_expr(&parse_expr("void 0", false)),
        Some(Expr::Unary(u)) if matches!(u.op, UnaryOp::Void)
    ));
    assert!(get_static_style_expr(&parse_expr("!ready", false)).is_none());
}

#[test]
fn emits_static_expr_attrs_for_special_cases() {
    let target = ident("el");
    let mut stmts = Vec::new();

    assert!(try_emit_static_expr_attr(
        &mut stmts,
        &target,
        "style",
        &parse_expr("({ color: 'red' })", false)
    ));
    assert!(try_emit_static_expr_attr(
        &mut stmts,
        &target,
        "className",
        &parse_expr("'active'", false)
    ));
    assert!(try_emit_static_expr_attr(&mut stmts, &target, "value", &parse_expr("7", false)));
    assert!(try_emit_static_expr_attr(&mut stmts, &target, "disabled", &parse_expr("true", false)));
    assert!(try_emit_static_expr_attr(
        &mut stmts,
        &target,
        "multiple",
        &parse_expr("false", false)
    ));
    assert!(try_emit_static_expr_attr(&mut stmts, &target, "checked", &parse_expr("true", false)));
    assert!(try_emit_static_expr_attr(&mut stmts, &target, "title", &parse_expr("42", false)));
    assert!(!try_emit_static_expr_attr(
        &mut stmts,
        &target,
        "title",
        &parse_expr("count + 1", false)
    ));

    let out = normalize(&emit_stmts(stmts));
    assert!(out.contains(&normalize("_$setStyle(el, { color: 'red' })")));
    assert!(out.contains(&normalize("_$setClassName(el, 'active')")));
    assert!(out.contains(&normalize("_$setValue(el, 7)")));
    assert!(out.contains(&normalize("_$setDisabled(el, true)")));
    assert!(out.contains(&normalize("el.multiple = false")));
    assert!(out.contains(&normalize("_$setChecked(el, true)")));
    assert!(out.contains(&normalize("_$setAttribute(el, \"title\", \"42\")")));
}

#[test]
fn emits_static_string_expr_and_bare_boolean_attrs() {
    let target = ident("el");
    let opening = parse_jsx_opening(
        "<input className=\"field\" disabled=\"\" dangerouslySetInnerHTML=\"<b>safe</b>\" title=\"hello\" style={{ color: 'red' }} value={1} checked={false} multiple={true} />",
    );
    let mut stmts = Vec::new();
    emit_attrs_for(&mut stmts, &target, &opening);

    let out = normalize(&emit_stmts(stmts));
    assert!(out.contains(&normalize("_$setClassName(el, \"field\")")));
    assert!(out.contains(&normalize("_$setDisabled(el, true)")));
    assert!(out.contains(&normalize("_$setInnerHTML(el, \"<b>safe</b>\")")));
    assert!(out.contains(&normalize("_$setAttribute(el, \"title\", \"hello\")")));
    assert!(out.contains(&normalize("_$setStyle(el, { color: 'red' })")));
    assert!(out.contains(&normalize("_$setValue(el, 1)")));
    assert!(out.contains(&normalize("_$setChecked(el, false)")));
    assert!(out.contains(&normalize("el.multiple = true")));

    let bare_opening =
        parse_jsx_opening("<input disabled checked multiple data-ready aria-hidden />");
    let mut bare_stmts = Vec::new();
    emit_attrs_for(&mut bare_stmts, &target, &bare_opening);
    let bare_out = normalize(&emit_stmts(bare_stmts));
    assert!(bare_out.contains(&normalize("_$setDisabled(el, true)")));
    assert!(bare_out.contains(&normalize("_$setChecked(el, true)")));
    assert!(bare_out.contains(&normalize("_$setAttribute(el, \"multiple\", \"\")")));
    assert!(bare_out.contains(&normalize("_$setAttribute(el, \"data-ready\", \"true\")")));
    assert!(bare_out.contains(&normalize("_$setAttribute(el, \"aria-hidden\", \"true\")")));
}

#[test]
fn emits_dynamic_attrs_events_and_skips_unsupported_attr_shapes() {
    let target = ident("el");
    let opening = parse_jsx_opening(
        "<select value={selected} multiple={isMulti} className={klass} style={styleObj} dangerouslySetInnerHTML={htmlObj} onClick={handleClick} data-id={id} ns:name=\"skip\" {...spread} />",
    );
    let mut stmts = Vec::new();
    emit_attrs_for(&mut stmts, &target, &opening);

    let out = normalize(&emit_stmts(stmts));
    assert!(out.contains(&normalize("effect(()=>{ _$setValue(el, selected); })")));
    assert!(out.contains(&normalize("el.multiple = !!(isMulti)")));
    assert!(out.contains(&normalize("_$setClassName(el, (klass))")));
    assert!(out.contains(&normalize("const el_style = (styleObj); _$setStyle(el, el_style);")));
    assert!(out.contains(&normalize("const __obj = (htmlObj);")));
    assert!(out.contains(&normalize(
        "_$setInnerHTML(el, __obj && \"__html\" in __obj ? __obj.__html : \"\")"
    )));
    assert!(out.contains(".addEventListener(\"click\""), "{out}");
    assert!(out.contains("onScopeDispose"), "{out}");
    assert!(out.contains(&normalize("_$setAttribute(el, \"data-id\", String((id)))")));
    assert!(!out.contains("ns:name"));
    assert!(out.contains(&normalize("effect(()=>{ _$spreadAttributes(el, (spread), []); })")));
}

#[test]
fn emits_dynamic_open_as_a_boolean_dom_property() {
    let target = ident("el");
    let opening = parse_jsx_opening("<details open={expanded} />");
    let mut stmts = Vec::new();
    emit_attrs_for(&mut stmts, &target, &opening);

    let out = normalize(&emit_stmts(stmts));
    assert!(out.contains(&normalize("effect(()=>{ el.open = !!(expanded); })")));
    assert!(!out.contains("_$setAttribute"));
}

#[test]
fn emits_dynamic_ref_and_controlled_input_attrs() {
    let target = ident("el");
    let opening = parse_jsx_opening(
        "<input ref={inputRef} value={form.value} disabled={form.disabled} checked={form.checked} />",
    );
    let mut stmts = Vec::new();
    emit_attrs_for(&mut stmts, &target, &opening);

    let out = normalize(&emit_stmts(stmts));
    assert!(out.contains(&normalize("_$compiledBindUseRef(el, ()=>(inputRef));")));
    assert!(!out.contains("onBeforeUnmount"));
    assert!(out.contains(&normalize("effect(()=>{ _$setValue(el, form.value); })")));
    assert!(out.contains(&normalize("effect(()=>{ _$setDisabled(el, form.disabled); })")));
    assert!(out.contains(&normalize("effect(()=>{ _$setChecked(el, !!(form.checked)); })")));
}

#[test]
fn covers_dynamic_attr_false_edges_for_member_roots_and_non_ident_attrs() {
    let target = ident("el");

    let member_opening = parse_jsx_opening("<UI.Input value={form.value} />");
    let mut member_stmts = Vec::new();
    emit_attrs_for(&mut member_stmts, &target, &member_opening);
    let member_out = normalize(&emit_stmts(member_stmts));
    assert!(member_out.contains(&normalize("effect(()=>{ _$setValue(el, form.value); })")));

    let mixed_opening = parse_jsx_opening(
        "<select className={klass + suffix} value={selected} data:track={id} {...spread} />",
    );
    let mut mixed_stmts = Vec::new();
    emit_attrs_for(&mut mixed_stmts, &target, &mixed_opening);
    let mixed_out = normalize(&emit_stmts(mixed_stmts));
    assert!(mixed_out.contains(&normalize("effect(()=>{ _$setClassName(el, klass + suffix); })",)));
    assert!(mixed_out.contains(&normalize("effect(()=>{ _$setValue(el, selected); })")));
    assert!(!mixed_out.contains("data:track"));
    assert!(
        mixed_out.contains(&normalize("effect(()=>{ _$spreadAttributes(el, (spread), []); })"))
    );
}

#[test]
fn emits_string_boolean_attrs_and_skips_empty_expr_attrs() {
    let target = ident("el");
    let mut opening = parse_jsx_opening("<input aria-hidden data-editor-content inert />");
    opening.attrs.push(JSXAttrOrSpread::JSXAttr(JSXAttr {
        span: DUMMY_SP,
        name: JSXAttrName::Ident(ident_name("data-id")),
        value: Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
            span: DUMMY_SP,
            expr: JSXExpr::JSXEmptyExpr(JSXEmptyExpr { span: DUMMY_SP }),
        })),
    }));
    let mut stmts = Vec::new();
    emit_attrs_for(&mut stmts, &target, &opening);

    let out = emit_stmts(stmts);
    assert!(out.contains("_$setAttribute(el, \"aria-hidden\", \"true\")"));
    assert!(out.contains("_$setAttribute(el, \"data-editor-content\", \"true\")"));
    assert!(!out.contains("data-id"));
    assert!(!out.contains("inert"));
}

#[test]
fn native_key_is_structural_metadata_only() {
    let target = ident("el");
    let opening = parse_jsx_opening("<div key={row.id} title={row.title} />");
    let mut stmts = Vec::new();

    emit_attrs_for(&mut stmts, &target, &opening);

    let out = normalize(&emit_stmts(stmts));
    assert!(!out.contains("\"key\""), "native key must not become a DOM attribute: {out}");
    assert!(
        out.contains(&normalize(
            "effect(()=>{ _$setAttribute(el, \"title\", String((row.title))); })"
        )),
        "ordinary native attributes must still be emitted: {out}"
    );
}

#[test]
fn task3_native_fields_do_not_import_legacy_setters() {
    let output = transform_module(
        r#"
import { signal } from '@rue-js/rue';
export const state = signal('red');
export const View = () => <section style={String(state.get())}>
  <input value={state.get()} checked={Boolean(state.get())} required={Boolean(state.get())}/>
  <svg><circle className={state.get()} /></svg>
</section>;
"#,
    );
    for token in ["_$setStyle", "_$setValue", "_$setAttribute", "patchStyle", "patchChildren"] {
        assert!(!output.contains(token), "unexpected {token}: {output}");
    }
    assert!(output.contains(".cssText ="), "{output}");
    assert!(output.contains(".value ="), "{output}");
    assert!(output.contains(".required ="), "{output}");
    assert!(output.contains("setAttribute(\"class\""), "{output}");
}

#[test]
#[should_panic(expected = "requires an explicit DOM event boundary")]
fn rejects_component_native_events_without_a_dom_boundary() {
    transform_module(
        "import Panel from './Panel'; export const View = () => <Panel r-on:click-native={handleClick} />;",
    );
}
