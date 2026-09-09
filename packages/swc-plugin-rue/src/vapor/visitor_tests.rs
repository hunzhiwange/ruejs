use super::*;
use std::collections::HashMap;
use std::sync::Arc;
use swc_core::common::{FileName, SourceMap};
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_core::ecma::visit::VisitMutWith;
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn new_vt() -> VaporTransform {
    VaporTransform {
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

fn transform_module(src: &str) -> String {
    let cm = Arc::new(SourceMap::default());
    let fm =
        cm.new_source_file(FileName::Custom("visitor-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let mut module = parser.parse_module().expect("parse module");
    module.visit_mut_with(&mut new_vt());

    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    emitter.emit_module(&module).expect("emit module");
    String::from_utf8(buf).expect("utf8")
}

fn compact(src: &str) -> String {
    src.chars().filter(|ch| !ch.is_whitespace()).collect()
}

#[test]
fn transforms_static_arrow_expr_body_with_shared_template_helper() {
    let out = compact(&transform_module("const View = () => <div className=\"a\" />;"));

    assert!(out.contains("from\"@rue-js/rue/internal/compiler\""), "{out}");
    assert!(out.contains("constView=()=>_$compiledRoot(Object.assign("), "{out}");
    assert!(out.contains("_$compiledCreateElement(\"div\""), "{out}");
    assert!(out.contains("_root.className=\"a\""), "{out}");
}

#[test]
fn transforms_arrow_fragment_expr_body_and_ignores_bare_returns() {
    let out = compact(&transform_module(
        "const Frag = () => <><i>A</i><b>B</b></>; function noop() { return; }",
    ));

    assert!(out.contains("from\"@rue-js/rue/internal"));
    assert!(out.contains("constFrag=()=>_$compiledRoot(Object.assign((__rue_parent_context)=>{"));
    assert!(out.contains("_$createDocumentFragment()"), "{out}");
    assert!(out.contains("_$template(\"<i>A</i>\")"), "{out}");
    assert!(out.contains("_$template(\"<b>B</b>\")"), "{out}");
    assert!(out.contains("functionnoop(){return;}"));
}

#[test]
fn transforms_block_returns_fragments_and_nested_arrow_returns() {
    let out = compact(&transform_module(
        "function View() { return <><span>A</span></>; } const outer = () => () => <em>B</em>;",
    ));

    assert!(out.contains("return_$compiledRoot(Object.assign((__rue_parent_context)=>{"));
    assert!(out.contains("_$createDocumentFragment()"), "{out}");
    assert!(out.contains("_$template(\"<span>A</span>\")"), "{out}");
    assert!(out.contains("_$compiledCreateElement(\"em\""), "{out}");
    assert!(out.contains("()=>()=>_$compiledRoot(Object.assign("), "{out}");
}

#[test]
fn leaves_non_jsx_modules_without_runtime_imports() {
    let out = transform_module("const value = () => count + 1;");

    assert!(!out.contains("@rue-js/rue"));
    assert!(!out.contains("vapor("));
    assert!(out.contains("count + 1"));
}

#[test]
fn transforms_dynamic_jsx_with_compiled_root() {
    let out = compact(&transform_module("const View = () => <div>{value}</div>;"));
    assert!(out.contains("_$compiledRoot("), "{out}");
    assert!(!out.contains("vapor("), "{out}");
}
