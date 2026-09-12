use super::*;
use std::collections::HashMap;
use std::sync::Arc;
use swc_core::common::{DUMMY_SP, FileName, SourceMap};
use swc_core::ecma::ast::{Module, ModuleItem, Program};
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn new_vt() -> crate::vapor::VaporTransform {
    crate::vapor::VaporTransform {
        next_el: 0,
        next_list: 0,
        next_map: 0,
        next_child: 0,
        once_depth: 0,
        did_transform: false,
        static_templates: true,
        el_tag_by_ident: HashMap::new(),
        renderable_local_scopes: Vec::new(),
        plain_local_scopes: Vec::new(),
    }
}

fn parse_expr(src: &str, tsx: bool) -> Expr {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("vapor-block-expr-test.tsx".into()).into(),
        src.to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    *parser.parse_expr().expect("parse expr")
}

fn parse_call(src: &str, tsx: bool) -> CallExpr {
    match parse_expr(src, tsx) {
        Expr::Call(call) => call,
        other => panic!("expected CallExpr, got {other:?}"),
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

fn compact(src: &str) -> String {
    src.chars().filter(|ch| !ch.is_whitespace()).collect()
}

fn parse_jsx_element(src: &str) -> JSXElement {
    match parse_expr(src, true) {
        Expr::JSXElement(el) => *el,
        other => panic!("expected JSXElement, got {other:?}"),
    }
}

fn parse_jsx_fragment(src: &str) -> JSXFragment {
    match parse_expr(src, true) {
        Expr::JSXFragment(fragment) => fragment,
        other => panic!("expected JSXFragment, got {other:?}"),
    }
}

#[test]
fn vapor_block_expr_detects_renderable_calls_and_empty_memo_deps() {
    assert!(call_returns_jsx_renderable(&parse_call(
        "_$compiledMemo('memo', () => <span />, [])",
        true
    )));
    assert!(call_returns_jsx_renderable(&parse_call(
        "_$compiledWithHookId(\"memo:0:0\", () => _$compiledMemo('memo', () => <span />, []))",
        true,
    )));
    assert!(call_returns_jsx_renderable(&parse_call(
        "items.map(item => item.ok ? <li /> : null)",
        true,
    )));

    assert!(is_empty_deps_memoized_jsx_expr(&parse_expr(
        "_$compiledMemo('memo', () => <span />, [])",
        true
    )));
    assert!(is_empty_deps_memoized_jsx_expr(&parse_expr(
        "_$compiledWithHookId(\"memo:0:0\", () => _$compiledMemo('memo', () => <span />, []))",
        true,
    )));
    assert!(!is_empty_deps_memoized_jsx_expr(&parse_expr(
        "items.map(item => item.ok ? <li /> : null)",
        true,
    )));
    assert!(!call_returns_jsx_renderable(&parse_call("useMemo()", true)));
    assert!(!call_returns_jsx_renderable(&parse_call("_$compiledWithHookId(\"memo:0:0\")", true,)));
    assert!(!call_returns_jsx_renderable(&parse_call("items['map'](item => <li />)", true)));
    assert!(is_empty_deps_memoized_jsx_expr(&parse_expr(
        "ok && _$compiledMemo('memo', () => <span />, [])",
        true,
    )));
}

#[test]
fn vapor_block_expr_detects_renderable_control_flow_returns() {
    for src in [
        "() => { if (ok) { return <span />; } else { return null; } }",
        "() => { switch (kind) { case 'a': return <span />; default: break; } }",
        "() => { try { work(); } catch (e) { return <span />; } }",
        "() => { try { work(); } finally { return <span />; } }",
        "() => { while (ok) { return <span />; } }",
        "() => { do { return <span />; } while (ok); }",
        "() => { for (;;) { return <span />; } }",
        "() => { for (const key in obj) { return <span />; } }",
        "() => { for (const item of items) { return <span />; } }",
        "() => { label: { return <span />; } }",
        "function () { return <span />; }",
    ] {
        assert!(arrow_returns_jsx_renderable(&parse_expr(src, true)), "{src}");
    }

    assert!(!arrow_returns_jsx_renderable(&parse_expr("() => { return value; }", true)));
    assert!(!arrow_returns_jsx_renderable(&parse_expr("value", true)));
}

#[test]
fn vapor_block_expr_rewrites_conditional_and_logical_slots() {
    let mut cond_vt = new_vt();
    let cond_out = compact(&emit_expr(build_slot_expr(
        &mut cond_vt,
        &parse_expr("ok ? <span /> : null", true),
    )));
    assert!(cond_out.contains("ok?_$compiledRoot((__rue_parent_context)=>{"));
    assert!(cond_out.contains("_$compiledCreateElement(\"span\",__rue_parent_context)"));
    assert!(cond_out.contains(":\"\";") || cond_out.contains(":\"\""));

    let mut and_vt = new_vt();
    let and_out =
        compact(&emit_expr(build_slot_expr(&mut and_vt, &parse_expr("ok && <span />", true))));
    assert!(and_out.contains("ok?_$compiledRoot((__rue_parent_context)=>{"));
    assert!(and_out.contains(":\"\""));

    let mut or_vt = new_vt();
    let or_out =
        compact(&emit_expr(build_slot_expr(&mut or_vt, &parse_expr("left || <span />", true))));
    assert!(or_out.contains("left||_$compiledRoot((__rue_parent_context)=>{"));

    let mut nullish_vt = new_vt();
    let nullish_out = compact(&emit_expr(build_slot_expr(
        &mut nullish_vt,
        &parse_expr("left ?? <span />", true),
    )));
    assert!(nullish_out.contains("left??_$compiledRoot((__rue_parent_context)=>{"));

    let mut nested_cond_vt = new_vt();
    let nested_cond_out = compact(&emit_expr(build_slot_expr(
        &mut nested_cond_vt,
        &parse_expr("ok ? (alt ? <span /> : null) : <></>", true),
    )));
    assert!(nested_cond_out.contains("alt?_$compiledRoot((__rue_parent_context)=>{"));
    assert!(nested_cond_out.contains("_$createDocumentFragment()"));

    let mut and_number_vt = new_vt();
    let and_number_out =
        compact(&emit_expr(build_slot_expr(&mut and_number_vt, &parse_expr("0 && value", true))));
    assert!(and_number_out.contains("0?value:0"));

    let mut or_nested_vt = new_vt();
    let or_nested_out = compact(&emit_expr(build_slot_expr(
        &mut or_nested_vt,
        &parse_expr("left || (ok && <span />)", true),
    )));
    assert!(or_nested_out.contains("left||ok?_$compiledRoot((__rue_parent_context)=>{"));
}

#[test]
fn vapor_block_expr_rewrites_calls_for_slot_values() {
    let mut memo_vt = new_vt();
    let memo_out = compact(&emit_expr(build_slot_expr(
        &mut memo_vt,
        &parse_expr("_$compiledMemo('memo', () => <span />, [])", true),
    )));
    assert!(memo_out.contains("_$compiledMemo('memo',()=>_$compiledRoot(()=>{"));
    assert!(memo_out.contains("_$createElement(\"span\",_root)"), "{memo_out}");

    let mut hook_vt = new_vt();
    let hook_out = compact(&emit_expr(build_slot_expr(
        &mut hook_vt,
        &parse_expr("_$compiledWithHookId(\"memo:0:0\", () => <span />)", true),
    )));
    assert!(hook_out.contains(
        "_$compiledWithHookId(\"memo:0:0\",()=>_$compiledRoot((__rue_parent_context)=>{"
    ));

    let mut map_vt = new_vt();
    let map_out = compact(&emit_expr(build_slot_expr(
        &mut map_vt,
        &parse_expr("items.map(item => <span>{item}</span>)", true),
    )));
    assert!(map_out.contains("_$reconcileKeyed("), "{map_out}");
    assert!(map_out.contains("_$compiledRoot("), "{map_out}");
    assert!(!map_out.contains("_$compiledKeyedList"), "{map_out}");

    let mut block_body_memo_vt = new_vt();
    let block_body_memo = compact(&emit_expr(build_slot_expr(
        &mut block_body_memo_vt,
        &parse_expr("_$compiledMemo('memo', () => { return <span />; }, [])", true),
    )));
    assert!(block_body_memo.contains("_$compiledMemo('memo',()=>{return<span/>;},[]);"));
    assert!(!block_body_memo.contains("vapor(()=>{"));
}

#[test]
fn vapor_block_expr_flattens_once_slot_builds_for_elements_and_fragments() {
    let jsx_el = parse_jsx_element("<Box title={title} />");
    let mut normal_element_vt = new_vt();
    let normal_element_out =
        compact(&emit_expr(jsx_element_to_slot_value_expr(&mut normal_element_vt, &jsx_el)));

    let mut once_element_vt = new_vt();
    let once_element_expr =
        once_element_vt.with_once_context(|vt| jsx_element_to_slot_value_expr(vt, &jsx_el));
    let once_element_out = compact(&emit_expr(once_element_expr));

    assert!(normal_element_out.contains("_$createComponent(Box"));
    assert!(!normal_element_out.contains("watchEffect("));
    assert!(!normal_element_out.contains("rue:component:anchor"));
    assert!(!once_element_out.contains("watchEffect("));
    assert!(once_element_out.contains("_$createComponent(Box"));
    assert!(!once_element_out.contains("rue:component:anchor"));

    let frag = parse_jsx_fragment("<><Box title={title} /></>");
    let mut normal_fragment_vt = new_vt();
    let normal_fragment_out =
        compact(&emit_expr(jsx_fragment_to_slot_value_expr(&mut normal_fragment_vt, &frag)));

    let mut once_fragment_vt = new_vt();
    let once_fragment_expr =
        once_fragment_vt.with_once_context(|vt| jsx_fragment_to_slot_value_expr(vt, &frag));
    let once_fragment_out = compact(&emit_expr(once_fragment_expr));

    assert!(!normal_fragment_out.contains("effect("));
    assert!(normal_fragment_out.contains("_$mountCompiledSlotAt("));
    assert!(!once_fragment_out.contains("watchEffect("));
    assert!(once_fragment_out.contains("_$mountCompiledSlotAt("));
    assert!(!once_fragment_out.contains("renderAnchor"));
}

#[test]
fn vapor_block_expr_covers_nested_plain_branches_and_simple_values() {
    let mut vt = new_vt();

    let direct_fragment =
        compact(&emit_expr(build_slot_expr(&mut vt, &parse_expr("<>frag</>", true))));
    assert!(direct_fragment.contains("_$compiledRoot((__rue_parent_context)=>{"));
    assert!(direct_fragment.contains("_$createDocumentFragment()"));

    let nested_plain_cond = compact(&emit_expr(build_slot_expr(
        &mut vt,
        &parse_expr("ok ? (alt ? value : null) : <span />", true),
    )));
    assert!(nested_plain_cond.contains("ok?alt?value:\"\""));
    assert!(nested_plain_cond.contains(":_$compiledRoot((__rue_parent_context)=>{"));

    let nested_alt_cond = compact(&emit_expr(build_slot_expr(
        &mut vt,
        &parse_expr("ok ? <span /> : (alt ? value : null)", true),
    )));
    assert!(nested_alt_cond.contains("ok?_$compiledRoot((__rue_parent_context)=>{"));
    assert!(nested_alt_cond.contains(":alt?value:\"\""));

    let left_jsx_or =
        compact(&emit_expr(build_slot_expr(&mut vt, &parse_expr("<span /> || fallback", true))));
    assert!(left_jsx_or.contains("_$compiledRoot((__rue_parent_context)=>{"));
    assert!(left_jsx_or.contains("||fallback"));

    let right_nested_or = compact(&emit_expr(build_slot_expr(
        &mut vt,
        &parse_expr("fallback || (ok ? value : null)", true),
    )));
    assert!(right_nested_or.contains("fallback||ok?value:\"\""));

    let nested_plain_logic = compact(&emit_expr(build_slot_expr(
        &mut vt,
        &parse_expr("ok ? (alt && value) : (fallback ?? null)", true),
    )));
    assert!(nested_plain_logic.contains("ok?alt?value:\"\""));
    assert!(nested_plain_logic.contains(":fallback??null"));

    let right_nested_logic = compact(&emit_expr(build_slot_expr(
        &mut vt,
        &parse_expr("fallback || (right ?? value)", true),
    )));
    assert!(right_nested_logic.contains("fallback||right??value"));

    assert_eq!(
        compact(&emit_expr(build_slot_expr(&mut vt, &parse_expr("slotView", false)))),
        "(slotView);"
    );
    assert_eq!(
        compact(&emit_expr(build_slot_expr(&mut vt, &parse_expr("registry.view", false)))),
        "(registry.view);"
    );

    assert!(!is_empty_deps_memoized_jsx_expr(&parse_expr(
        "_$compiledWithHookId('memo:0:0', () => value)",
        false,
    )));
}

#[test]
fn vapor_block_expr_covers_false_edges_and_nested_slot_branches() {
    let super_call = CallExpr {
        span: DUMMY_SP,
        ctxt: Default::default(),
        callee: Callee::Super(Super { span: DUMMY_SP }),
        args: vec![],
        type_args: None,
    };
    assert_eq!(call_callee_ident_name(&super_call), None);
    assert!(!call_returns_jsx_renderable(&super_call));

    assert!(arrow_returns_jsx_renderable(&parse_expr(
        "() => { if (ok) value; else return <span />; }",
        true,
    )));
    assert!(expr_returns_jsx_renderable(&parse_expr("plain || <span />", true)));
    assert!(!arrow_contains_empty_deps_memo(&parse_expr("plain", false)));
    assert!(!hook_wrapped_call_has_empty_memo_deps(&parse_call(
        "_$compiledWithHookId('memo', value)",
        false,
    )));

    let mut vt = new_vt();
    assert!(rewrite_arrow_expr_body_for_slot(&mut vt, &parse_expr("() => value", false)).is_none());
    assert!(rewrite_arrow_expr_body_for_slot(&mut vt, &parse_expr("value", false)).is_none());
    assert!(
        rewrite_use_memo_call_for_slot(&mut vt, &parse_call("other(() => <span />)", true))
            .is_none()
    );
    assert!(rewrite_use_memo_call_for_slot(&mut vt, &parse_call("useMemo()", true)).is_none());
    assert!(
        rewrite_use_memo_call_for_slot(
            &mut vt,
            &parse_call("_$compiledMemo('memo', () => value)", false)
        )
        .is_none()
    );
    assert!(
        rewrite_hook_wrapped_call_for_slot(
            &mut vt,
            &parse_call("_$compiledWithHookId('memo')", false),
        )
        .is_none()
    );
    assert!(
        rewrite_map_call_for_slot(&mut vt, &parse_call("items.filter(item => <span />)", true))
            .is_none()
    );

    let empty_cons =
        compact(&emit_expr(build_slot_expr(&mut vt, &parse_expr("ok ? null : <span />", true))));
    assert!(empty_cons.contains("ok?\"\":_$compiledRoot((__rue_parent_context)=>{"));

    let nested_renderable_alt = compact(&emit_expr(build_slot_expr(
        &mut vt,
        &parse_expr("ok ? value : (alt ? <span /> : null)", true),
    )));
    assert!(
        nested_renderable_alt.contains("ok?value:alt?_$compiledRoot((__rue_parent_context)=>{")
    );

    let nested_renderable_and = compact(&emit_expr(build_slot_expr(
        &mut vt,
        &parse_expr("ok && (alt ? <span /> : null)", true),
    )));
    assert!(nested_renderable_and.contains("ok?alt?_$compiledRoot((__rue_parent_context)=>{"));

    let nested_renderable_left_or = compact(&emit_expr(build_slot_expr(
        &mut vt,
        &parse_expr("(ok ? <span /> : null) || fallback", true),
    )));
    assert!(nested_renderable_left_or.contains("ok?_$compiledRoot((__rue_parent_context)=>{"));
    assert!(nested_renderable_left_or.contains("||fallback"));

    assert!(
        rewrite_hook_wrapped_call_for_slot(
            &mut vt,
            &parse_call("_$compiledWithHookId('memo', () => value)", false),
        )
        .is_none()
    );

    let alt_plain_value =
        compact(&emit_expr(build_slot_expr(&mut vt, &parse_expr("ok ? <span /> : value", true))));
    assert!(alt_plain_value.contains(":value"), "{alt_plain_value}");

    let nan_and =
        compact(&emit_expr(build_slot_expr(&mut vt, &parse_expr("NaN && <span />", true))));
    assert!(nan_and.contains(":NaN"), "{nan_and}");
}
