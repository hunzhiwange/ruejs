use super::*;
use std::collections::HashMap;
use std::sync::Arc;
use swc_core::common::{FileName, SourceMap};
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
        cm.new_source_file(FileName::Custom("component-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    match *parser.parse_expr().expect("parse expr") {
        Expr::JSXElement(el) => *el,
        other => panic!("expected JSXElement, got {other:?}"),
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
fn component_root_emits_static_mount_with_children_props() {
    let mut vt = new_vt();
    let el = parse_jsx_element("<Box><span>child</span></Box>");
    let out = compact(&emit_block(emit_component_root(&mut vt, &el)));

    assert!(out.contains("const_root=_$createDocumentFragment();"), "{out}");
    assert!(out.contains("_$createComment(\"rue:component:anchor\")"), "{out}");
    assert!(out.contains("const__child1=_$compiledRoot(()=>{"), "{out}");
    assert!(out.contains("_$createElement(\"span\",_root)"), "{out}");
    assert!(out.contains("_$createComponent(Box,()=>({children:__child1}))"), "{out}");
    assert!(out.contains("renderAnchor("), "{out}");
    assert!(out.ends_with("return_root;}"), "{out}");
}

#[test]
fn component_root_wraps_dynamic_props_in_watch_effect() {
    let mut vt = new_vt();
    let el = parse_jsx_element("<Box title={title} />");
    let out = compact(&emit_block(emit_component_root(&mut vt, &el)));

    assert!(out.contains("effect(()=>{"), "{out}");
    assert!(out.contains("const__slot2=_$createComponent(Box,()=>({title:title}));"), "{out}");
    assert!(out.contains("untrack(()=>renderAnchor(__slot2,_root,_list1))"), "{out}");
    assert!(out.contains("return_root;"), "{out}");
}
