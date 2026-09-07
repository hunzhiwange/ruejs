use super::*;
use std::collections::HashMap;
use std::sync::Arc;
use swc_core::common::{DUMMY_SP, FileName, SourceMap};
use swc_core::ecma::ast::{Module, ModuleItem, Program};
use swc_core::ecma::atoms::Atom;
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
    let fm = cm
        .new_source_file(FileName::Custom("element-text-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    *parser.parse_expr().expect("parse expr")
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

fn compact(src: &str) -> String {
    src.chars().filter(|ch| !ch.is_whitespace()).collect()
}

fn compile_render_text(expr_src: &str, tsx: bool, once: bool) -> String {
    compact(&compile_render_text_raw(expr_src, tsx, once))
}

fn compile_render_text_raw(expr_src: &str, tsx: bool, once: bool) -> String {
    let expr = parse_expr(expr_src, tsx);
    let mut vt = new_vt();
    let mut stmts = Vec::new();

    if once {
        vt.with_once_context(|vt| {
            render_text_between_with_watch(vt, &crate::emit::ident("root"), &expr, &mut stmts);
        });
    } else {
        render_text_between_with_watch(&mut vt, &crate::emit::ident("root"), &expr, &mut stmts);
    }

    emit_stmts(stmts)
}

fn compile_append_text(raw: &str) -> String {
    compact(&compile_append_text_raw(raw))
}

fn compile_append_text_raw(raw: &str) -> String {
    let mut stmts = Vec::new();
    append_normalized_jsx_text(&crate::emit::ident("root"), &Atom::from(raw), &mut stmts);
    emit_stmts(stmts)
}

#[test]
fn emits_wrapper_and_empty_text_without_watch_for_static_empty_expr() {
    let out = compile_render_text("null", false, false);

    assert!(out.contains("_$createTextWrapper(root)"));
    assert!(out.contains("_$appendChild(root,_el1);"));
    assert!(out.contains("_$settextContent(_el1,\"\");"));
    assert!(!out.contains("watchEffect("));
}

#[test]
fn emits_static_string_literal_without_watch() {
    let out = compile_render_text("\"hello_rue\"", false, false);

    assert!(out.contains("_$createTextWrapper(root)"));
    assert!(out.contains("_$appendChild(root,_el1);"));
    assert!(out.contains("_$settextContent(_el1,\"hello_rue\");"));
    assert!(!out.contains("watchEffect("));
}

#[test]
fn stringifies_static_number_literal_without_watch() {
    let out = compile_render_text("42", false, false);

    assert!(out.contains("_$settextContent(_el1,\"42\");"));
    assert!(!out.contains("_$settextContent(_el1,42);"));
    assert!(!out.contains("watchEffect("));
}

#[test]
fn emits_ts_wrapped_static_text_without_watch() {
    let out = compile_render_text("'typed' as string", false, false);

    assert!(out.contains("_$settextContent(_el1,'typed');"));
    assert!(!out.contains("watchEffect("));
}

#[test]
fn emits_once_dynamic_text_without_watch_effect() {
    let out = compile_render_text("colorValue", false, true);

    assert!(out.contains("_$createTextWrapper(root)"));
    assert!(out.contains("_$appendChild(root,_el1);"));
    assert!(out.contains("_$settextContent(_el1,colorValue);"));
    assert!(!out.contains("watchEffect("));
}

#[test]
fn wraps_dynamic_text_updates_in_watch_effect() {
    let out = compile_render_text("sha.slice(0, 7)", false, false);

    assert!(out.contains("_$createTextWrapper(root)"));
    assert!(out.contains("_$appendChild(root,_el1);"));
    assert!(out.contains("effect(()=>{_$settextContent(_el1,sha.slice(0,7));});"));
}

#[test]
fn skips_empty_normalized_jsx_text() {
    let out = compile_append_text("");

    assert!(out.is_empty());
}

#[test]
fn appends_normalized_jsx_text_as_text_node() {
    let out = compile_append_text_raw("hello\n  rue");

    assert!(out.contains("_$createTextNode(\"hello rue\")"));
    assert!(out.contains("_$appendChild(root"));
}

#[test]
fn replaces_unproven_template_text_markers_with_comment_anchors() {
    let mut vt = new_vt();
    let mut stmts = Vec::new();

    let anchor = replace_template_text_marker_with_comment(
        &mut vt,
        &crate::emit::ident("parent"),
        &crate::emit::ident("marker"),
        3,
        "_$createComment",
        &mut stmts,
    );
    let out = compact(&emit_stmts(stmts));

    assert_eq!(anchor.sym.as_ref(), "_el1");
    assert!(out.contains("const_el1=_$createComment(\"rue:text-hole:3\")"), "{out}");
    assert!(out.contains("parent.replaceChild(_el1,marker)"), "{out}");
}
