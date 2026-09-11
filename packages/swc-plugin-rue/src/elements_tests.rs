use super::*;
use std::collections::HashMap;
use std::sync::Arc;
use swc_core::common::{DUMMY_SP, FileName, SourceMap};
use swc_core::ecma::ast::{Module, ModuleItem, Program};
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
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

fn parse_jsx_element(src: &str) -> JSXElement {
    let cm = Arc::new(SourceMap::default());
    let fm =
        cm.new_source_file(FileName::Custom("elements-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    match *parser.parse_expr().expect("parse jsx element") {
        Expr::JSXElement(el) => *el,
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

fn compact(src: &str) -> String {
    src.chars().filter(|ch| !ch.is_whitespace()).collect()
}

#[test]
fn builds_native_elements_with_attrs_children_and_tag_tracking() {
    let mut vt = new_vt();
    let el = parse_jsx_element("<section className=\"hero\"><span>Hi</span></section>");
    let mut stmts = Vec::new();

    build_element(&mut vt, &el, &crate::emit::ident("root"), &mut stmts);

    let out = compact(&emit_stmts(stmts));
    assert!(out.contains("const_el1=_$createElement(\"section\",root);"));
    assert!(out.contains("_$appendChild(root,_el1);"));
    assert!(out.contains("_$setClassName(_el1,\"hero\");"));
    assert!(out.contains("const_el2=_$createElement(\"span\",_el1);"));
    assert!(out.contains("_$appendChild(_el2,_$createTextNode(\"Hi\"));"));
    assert_eq!(vt.el_tag_by_ident.get("_el1").map(String::as_str), Some("section"));
    assert_eq!(vt.el_tag_by_ident.get("_el2").map(String::as_str), Some("span"));
}

#[test]
fn skips_children_when_dangerously_set_inner_html_is_present() {
    let mut vt = new_vt();
    let el = parse_jsx_element("<div dangerouslySetInnerHTML={{ __html: html }}>skip me</div>");
    let mut stmts = Vec::new();

    build_element(&mut vt, &el, &crate::emit::ident("root"), &mut stmts);

    let out = compact(&emit_stmts(stmts));
    assert!(out.contains("_$createElement(\"div\",root)"));
    assert!(out.contains("_$setInnerHTML"));
    assert!(!out.contains("skipme"));
    assert!(!out.contains("_$createTextNode(\"skipme\")"));
}

#[test]
fn dispatches_components_and_member_components_to_component_builder() {
    let mut vt = new_vt();
    let el = parse_jsx_element("<UI.Panel title={title} />");
    let mut stmts = Vec::new();

    build_element(&mut vt, &el, &crate::emit::ident("root"), &mut stmts);

    let out = compact(&emit_stmts(stmts));
    assert!(out.contains("_$createComment(\"rue:component:anchor\")"));
    assert!(out.contains("_$createComponent(UI.Panel,()=>({title:title}))"));
    assert!(out.contains("_$mountCompiledSlotAt({parent:root,before:_list1}"));
    assert!(!out.contains("renderAnchor"));
    assert!(!out.contains("_$createElement(\"UI.Panel\""));
}

#[test]
fn preserves_router_link_component_owner_for_app_isolation() {
    let mut vt = new_vt();
    let el = parse_jsx_element("<RouterLink to=\"/docs\" className=\"link\">Docs</RouterLink>");
    let mut stmts = Vec::new();

    build_element(&mut vt, &el, &crate::emit::ident("root"), &mut stmts);

    let out = compact(&emit_stmts(stmts));
    assert!(out.contains("_$mountCompiledComponent(root,RouterLink"), "{out}");
    assert!(!out.contains("RouterLink.__rueOnClick"), "{out}");
    assert!(!out.contains("RouterLink.__rueHref"), "{out}");
}

#[test]
fn treats_namespaced_elements_as_native_fallbacks_and_ignores_non_ident_attrs() {
    let mut vt = new_vt();
    let el = parse_jsx_element(r#"<svg:path xlink:href="url" {...props}>Label</svg:path>"#);
    let mut stmts = Vec::new();

    build_element(&mut vt, &el, &crate::emit::ident("root"), &mut stmts);

    let out = compact(&emit_stmts(stmts));
    assert!(out.contains("const_el1=_$createElement(\"div\",root);"));
    assert!(out.contains("_$appendChild(_el1,_$createTextNode(\"Label\"));"));
    assert_eq!(vt.el_tag_by_ident.get("_el1").map(String::as_str), Some("div"));
}
