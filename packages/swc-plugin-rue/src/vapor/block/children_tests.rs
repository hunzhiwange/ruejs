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

fn parse_fragment(src: &str) -> JSXFragment {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("vapor-block-children-test.tsx".into()).into(),
        src.to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    match *parser.parse_expr().expect("parse fragment") {
        Expr::JSXFragment(fragment) => fragment,
        other => panic!("expected JSXFragment, got {other:?}"),
    }
}

fn parse_expr(src: &str, tsx: bool) -> Expr {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("vapor-block-children-test.tsx".into()).into(),
        src.to_string(),
    );
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

#[test]
fn vapor_block_children_emits_trimmed_text_and_flattens_nested_fragments() {
    let frag = parse_fragment("<>  hello  <>frag</></>");
    let mut vt = new_vt();
    let mut stmts = Vec::new();

    emit_children(&mut vt, &crate::emit::ident("root"), &frag.children, &mut stmts);

    let raw = emit_stmts(stmts);
    let out = compact(&raw);

    assert_eq!(raw.matches("_$createTextNode").count(), 2);
    assert!(out.contains("_$appendChild(root,_$createTextNode(\"hello\"));"));
    assert!(out.contains("_$appendChild(root,_$createTextNode(\"frag\"));"));
    assert!(!out.contains("watchEffect("));
}

#[test]
fn vapor_block_children_preserves_text_spacing_around_nested_elements() {
    let frag = parse_fragment(
        "<>\n  一套基于 <a>RueJS</a> 与浏览器 Office\n  内核构建的轻量工作台。\n</>",
    );
    let mut vt = new_vt();
    let mut stmts = Vec::new();

    emit_children(&mut vt, &crate::emit::ident("root"), &frag.children, &mut stmts);

    let raw = emit_stmts(stmts);
    assert!(raw.contains("_$createTextNode(\"一套基于 \")"));
    assert!(raw.contains("_$createTextNode(\" 与浏览器 Office 内核构建的轻量工作台。\")"));
}

#[test]
fn vapor_block_children_skips_block_whitespace_text() {
    let frag = parse_fragment("<>\n    \n</>");
    let mut vt = new_vt();
    let mut stmts = Vec::new();

    emit_children(&mut vt, &crate::emit::ident("root"), &frag.children, &mut stmts);

    assert!(stmts.is_empty());
}

#[test]
fn vapor_block_children_dispatches_expr_nested_element_and_ignores_spread() {
    let mut frag = parse_fragment("<>{props.children}<span>child</span></>");
    frag.children.push(JSXElementChild::JSXSpreadChild(JSXSpreadChild {
        span: DUMMY_SP,
        expr: Box::new(parse_expr("extra", false)),
    }));

    let mut vt = new_vt();
    let mut stmts = Vec::new();

    emit_children(&mut vt, &crate::emit::ident("root"), &frag.children, &mut stmts);

    let out = compact(&emit_stmts(stmts));

    assert!(out.contains("_$createComment(\"rue:children:anchor\")"));
    assert!(out.contains("_$mountCompiledSlotAt("));
    assert!(out.contains("props.children"));
    assert!(!out.contains("renderAnchor"));
    assert!(out.contains("_$createElement(\"span\",root)"));
    assert!(out.contains("_$appendChild(_el1,_$createTextNode(\"child\"));"));
    assert!(!out.contains("extra"));
}
