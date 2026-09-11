/*
JSX block 转换单元测试。

覆盖原生元素、Fragment、组件根节点和 dangerouslySetInnerHTML 的 block 输出形态。
*/
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

fn parse_expr(src: &str) -> Expr {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("vapor-block-jsx-test.tsx".into()).into(),
        src.to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    *parser.parse_expr().expect("parse expr")
}

fn parse_jsx_element(src: &str) -> JSXElement {
    match parse_expr(src) {
        Expr::JSXElement(el) => *el,
        other => panic!("expected JSXElement, got {other:?}"),
    }
}

fn parse_jsx_fragment(src: &str) -> JSXFragment {
    match parse_expr(src) {
        Expr::JSXFragment(fragment) => fragment,
        other => panic!("expected JSXFragment, got {other:?}"),
    }
}

fn emit_block(block: BlockStmt) -> String {
    let cm = Arc::new(SourceMap::default());
    let module =
        Module { span: DUMMY_SP, body: vec![ModuleItem::Stmt(Stmt::Block(block))], shebang: None };
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    emitter.emit_program(&Program::Module(module)).expect("emit block");
    String::from_utf8(buf).expect("utf8")
}

fn compact(src: &str) -> String {
    src.chars().filter(|ch| !ch.is_whitespace()).collect()
}

#[test]
fn jsx_to_block_builds_native_root_attrs_children_and_return() {
    let mut vt = new_vt();
    let el = parse_jsx_element(
        r#"<section id="app" className={klass}>hello <span>{name}</span></section>"#,
    );
    let out = compact(&emit_block(vt.jsx_to_block(&el)));

    assert!(out.contains("const_root=_$createElement(\"section\",__rue_parent_context);"));
    assert!(out.contains("_$setAttribute(_root,\"id\",\"app\");"));
    assert!(out.contains("effect(()=>{_$setClassName(_root,(klass));"));
    assert!(out.contains("_$appendChild(_root,_$createTextNode(\"hello\"));"));
    assert!(out.contains("const_el1=_$createElement(\"span\",_root);"));
    assert!(out.contains("_$createComment(\"rue:slot:anchor\")"));
    assert!(out.contains("_$mountCompiledSlotAt("));
    assert!(out.ends_with("return_root;}"));
}

#[test]
fn jsx_fragment_to_block_builds_document_fragment_children_and_return() {
    let mut vt = new_vt();
    let frag = parse_jsx_fragment("<>pre <span>child</span>{value}</>");
    let out = compact(&emit_block(vt.jsx_fragment_to_block(&frag)));

    assert!(out.contains("const_root=_$createDocumentFragment();"));
    assert!(out.contains("_$appendChild(_root,_$createTextNode(\"pre\"));"));
    assert!(out.contains("const_el1=_$createElement(\"span\",_root);"));
    assert!(out.contains("_$appendChild(_el1,_$createTextNode(\"child\"));"));
    assert!(out.contains("_$createComment(\"rue:slot:anchor\")"));
    assert!(out.contains("_$mountCompiledSlotAt("));
    assert!(!out.contains("renderAnchor"));
    assert!(out.ends_with("return_root;}"));
}

#[test]
fn jsx_to_block_delegates_component_roots() {
    let mut vt = new_vt();
    let el = parse_jsx_element("<Box title={title} />");
    let out = compact(&emit_block(vt.jsx_to_block(&el)));

    assert!(out.contains("const_root=_$createDocumentFragment();"));
    assert!(out.contains("const_list1=_$createComment(\"rue:component:anchor\")"));
    assert!(out.contains("_$createComponent(Box,()=>({title:title}))"));
    assert!(out.contains("_$mountCompiledSlotAt({parent:_root,before:_list1}"));
    assert!(!out.contains("renderAnchor"));
    assert!(out.ends_with("return_root;}"));
}

#[test]
fn jsx_to_block_skips_children_for_dangerously_set_inner_html() {
    let mut vt = new_vt();
    let el = parse_jsx_element(
        r#"<div dangerouslySetInnerHTML={{ __html: html }}><span>ignored</span></div>"#,
    );
    let out = compact(&emit_block(vt.jsx_to_block(&el)));

    assert!(out.contains("const_root=_$createElement(\"div\",__rue_parent_context);"));
    assert!(out.contains("_$setInnerHTML(_root"));
    assert!(out.contains("\"__html\"in__obj"));
    assert!(!out.contains("_$createElement(\"span\",_root)"));
    assert!(!out.contains("ignored"));
    assert!(out.ends_with("return_root;}"));
}

#[test]
fn jsx_to_block_handles_router_link_and_namespaced_fallback_edges() {
    let mut router_vt = new_vt();
    let router = parse_jsx_element(r#"<RouterLink to="/docs">Docs</RouterLink>"#);
    let router_out = compact(&emit_block(router_vt.jsx_to_block(&router)));

    assert!(router_out.contains("_$mountCompiledComponent(_root,RouterLink"), "{router_out}");
    assert!(router_out.contains("to:\"/docs\""));
    assert!(!router_out.contains("RouterLink.__rueHref"));
    assert!(!router_out.contains("RouterLink.__rueOnClick"));

    let mut namespace_vt = new_vt();
    let namespaced = parse_jsx_element(r#"<svg:path xlink:href="url" {...props}>Label</svg:path>"#);
    let namespace_out = compact(&emit_block(namespace_vt.jsx_to_block(&namespaced)));

    assert!(namespace_out.contains("const_root=_$createElement(\"div\",__rue_parent_context);"));
    assert!(namespace_out.contains("_$appendChild(_root,_$createTextNode(\"Label\"));"));
    assert!(namespace_out.ends_with("return_root;}"));
}
