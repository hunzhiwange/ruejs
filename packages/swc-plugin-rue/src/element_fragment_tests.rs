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
    let fm =
        cm.new_source_file(FileName::Custom("fragment-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    match *parser.parse_expr().expect("parse fragment") {
        Expr::JSXFragment(fragment) => fragment,
        _ => panic!("expected JSX fragment"),
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

fn compile_fragment_children(src: &str) -> String {
    let fragment = parse_fragment(src);
    let mut vt = new_vt();
    let mut stmts = Vec::new();
    emit_fragment_children(&mut vt, &crate::emit::ident("parent"), &fragment.children, &mut stmts);
    normalize(&emit_stmts(stmts))
}

#[test]
fn preserves_children_slots_and_map_lists_inside_fragments() {
    let out = compile_fragment_children(
        "<>{props.children}{items.map(item => <span key={item.id}>{item.label}</span>)}</>",
    );

    assert!(out.contains(&normalize(r#"rue:children:anchor"#)));
    assert!(out.contains("_$mountCompiledSlotAt"), "{out}");
    assert!(out.contains(&normalize(r#"_$reconcileKeyedSingle("#)));
    assert!(out.contains(&normalize(r#"rue:list:end"#)));
}

#[test]
fn treats_any_member_children_as_children_slots_inside_fragments() {
    let out = compile_fragment_children("<>{ctx.children}{panel.children}</>");

    assert_eq!(out.matches("rue:children:anchor").count(), 2, "{out}");
    assert_eq!(out.matches("_$mountCompiledSlotAt(").count(), 2, "{out}");
    assert!(out.contains("panel.children"));
    assert!(!out.contains("rue:slot:anchor"));
}

#[test]
fn map_list_children_short_circuit_slot_rendering_inside_fragments() {
    let out = compile_fragment_children("<>{items.map(item => <span>{item.label}</span>)}</>");

    assert!(out.contains("_$reconcileKeyedSingle("), "{out}");
    assert!(out.contains(&normalize(r#"rue:list:end"#)), "{out}");
}

#[test]
fn ignores_empty_and_spread_children_while_flattening_nested_fragments() {
    let out = compile_fragment_children("<>{}{...items}<><span>A</span></>ok</>");

    assert!(!out.contains("items"));
    assert!(out.contains(&normalize(r#"_$createElement("span", parent)"#)));
    assert!(out.contains(&normalize(r#"_$createTextNode("A")"#)));
    assert!(out.contains(&normalize(r#"_$createTextNode("ok")"#)));
}

#[test]
fn falls_back_to_slot_rendering_for_non_map_call_expr_children() {
    let out = compile_fragment_children("<>{renderChild(value)}</>");

    assert!(!out.contains("_$compiledKeyedList"));
    assert!(out.contains(&normalize(r#"renderChild(__slot"#)));
    assert!(out.contains(&normalize(r#"(value)"#)));
    assert!(out.contains(&normalize(r#"_$mountCompiledSlotAt("#)));
}
