use super::*;
use std::collections::HashMap;
use std::sync::Arc;
use swc_core::common::SourceMap;
use swc_core::ecma::ast::{Module, ModuleItem, Program};
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};

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

#[test]
fn wraps_dynamic_slot_reads_in_watch_effect_with_children_anchor() {
    let mut vt = new_vt();
    let mut stmts = Vec::new();

    render_between_for_slot(
        &mut vt,
        &ident("root"),
        &Expr::Ident(ident("slotValue")),
        true,
        &mut stmts,
    );

    let out = normalize(&emit_stmts(stmts));

    assert!(out.contains(&normalize(r#"const _list1 = _$createComment("rue:children:anchor");"#)));
    assert!(out.contains(&normalize(r#"_$appendChild(root, _list1);"#)));
    assert!(out.contains("_$mountCompiledSlotAt("));
    assert!(out.contains("parent: root"));
    assert!(out.contains("before: _list1"));
    assert!(!out.contains("renderAnchor"));
}

#[test]
fn renders_static_slot_once_without_watch_effect() {
    let mut vt = new_vt();
    let mut stmts = Vec::new();

    render_once_for_slot(
        &mut vt,
        &ident("root"),
        &Expr::Call(CallExpr {
            span: DUMMY_SP,
            callee: Callee::Expr(Box::new(Expr::Ident(ident("buildSlot")))),
            args: vec![],
            type_args: None,
            ctxt: SyntaxContext::empty(),
        }),
        &mut stmts,
    );

    let out = normalize(&emit_stmts(stmts));

    assert!(out.contains(&normalize(r#"const _list1 = _$createComment("rue:slot:anchor");"#)));
    assert!(out.contains(&normalize(r#"const _list2 = buildSlot();"#)));
    assert!(out.contains(&normalize(r#"_$mountCompiledSlotAt("#)));
    assert!(!out.contains("watchEffect("));
}

#[test]
fn renders_identifier_slot_once_with_parenthesized_slot_value() {
    let mut vt = new_vt();
    let mut stmts = Vec::new();

    render_once_for_slot(&mut vt, &ident("root"), &Expr::Ident(ident("slotValue")), &mut stmts);

    let out = normalize(&emit_stmts(stmts));
    assert!(out.contains(&normalize(r#"const _list2 = slotValue;"#)));
    assert!(out.contains(&normalize(r#"_$mountCompiledSlotAt("#)));
    assert!(!out.contains("watchEffect("));
}
