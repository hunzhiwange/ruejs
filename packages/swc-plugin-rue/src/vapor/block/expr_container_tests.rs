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

fn parse_expr_container(src: &str) -> JSXExprContainer {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("expr-container-test.tsx".into()).into(),
        format!("<div>{{{src}}}</div>"),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let Expr::JSXElement(el) = *parser.parse_expr().expect("parse expr") else {
        panic!("expected JSXElement");
    };
    let JSXElementChild::JSXExprContainer(container) =
        el.children.into_iter().next().expect("child")
    else {
        panic!("expected JSXExprContainer");
    };
    container
}

fn parse_empty_container() -> JSXExprContainer {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("expr-container-test.tsx".into()).into(),
        "<div>{}</div>".to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let Expr::JSXElement(el) = *parser.parse_expr().expect("parse expr") else {
        panic!("expected JSXElement");
    };
    let JSXElementChild::JSXExprContainer(container) =
        el.children.into_iter().next().expect("child")
    else {
        panic!("expected JSXExprContainer");
    };
    container
}

fn parse_module(src: &str) -> Module {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("expr-container-provenance-test.tsx".into()).into(),
        src.to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    parser.parse_module().expect("parse module")
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
fn skips_empty_expr_containers_without_emitting_markers() {
    let mut vt = new_vt();
    let root = crate::emit::ident("_root");
    let mut stmts = Vec::new();

    handle_expr_container(&mut vt, &root, &parse_empty_container(), &mut stmts);

    assert!(stmts.is_empty());
}

#[test]
fn emits_compiled_slot_for_dynamic_text_exprs() {
    let mut vt = new_vt();
    let root = crate::emit::ident("_root");
    let mut stmts = Vec::new();

    handle_expr_container(&mut vt, &root, &parse_expr_container("message"), &mut stmts);
    let out = compact(&emit_stmts(stmts));

    assert!(out.contains("_$createComment(\"rue:slot:anchor\")"));
    assert!(out.contains("_$mountCompiledSlotAt({parent:_root,before:_list1}"), "{out}");
    assert!(out.contains("_$compiledValueFactory((message))"), "{out}");
    assert!(!out.contains("renderAnchor"), "{out}");
}

#[test]
fn emits_cached_direct_text_effect_for_proven_scalars() {
    let mut vt = new_vt();
    let module =
        parse_module("import { signal } from '@rue-js/rue'; const message = signal('ready');");
    vt.plain_local_scopes.push(crate::reactive_provenance::collect_module_scope(&module, &[]));
    let root = crate::emit::ident("_root");
    let mut stmts = Vec::new();

    emit_compiled_text_binding(
        &mut vt,
        &root,
        &parse_expr_container("String(message.get())"),
        &mut stmts,
    )
    .expect("compiled scalar text binding");
    let out = compact(&emit_stmts(stmts));

    assert!(out.contains("_$compiledCreateTextNode(\"\")"), "{out}");
    assert!(out.contains("_$compiledAppendChild(_root,_el1)"), "{out}");
    assert!(!out.contains("document.createTextNode"), "{out}");
    assert!(!out.contains(".appendChild("), "{out}");
    assert!(out.contains("_$compiledText(_el1,()=>String(message.get()))"), "{out}");
    assert!(!out.contains("Object.is("), "{out}");
    assert!(!out.contains(".textContent="), "{out}");
    assert!(!out.contains("watchEffect"), "{out}");
    assert!(!out.contains("_$settextContent"), "{out}");
    assert!(!out.contains("renderAnchor"), "{out}");

    let mut fallback = Vec::new();
    assert!(
        emit_compiled_text_binding(
            &mut vt,
            &root,
            &parse_expr_container("renderValue()"),
            &mut fallback,
        )
        .is_none()
    );
    assert!(fallback.is_empty());
}

#[test]
fn emits_cached_effect_for_existing_text() {
    let mut vt = new_vt();
    let module =
        parse_module("import { signal } from '@rue-js/rue'; const message = signal('ready');");
    vt.plain_local_scopes.push(crate::reactive_provenance::collect_module_scope(&module, &[]));
    let node = crate::emit::ident("_text");
    let mut stmts = Vec::new();

    emit_compiled_text_effect(
        &mut vt,
        &node,
        &parse_expr_container("String(message.get())"),
        &mut stmts,
    )
    .expect("compiled scalar text effect");
    let out = compact(&emit_stmts(stmts));

    assert!(!out.contains("_$compiledCreateTextNode"), "{out}");
    assert!(!out.contains("_$compiledAppendChild"), "{out}");
    assert!(out.contains("_$compiledText(_text,()=>String(message.get()))"), "{out}");
    assert!(!out.contains("Object.is("), "{out}");
    assert!(!out.contains("_text.textContent="), "{out}");
    assert!(!out.contains("watchEffect"), "{out}");
}

#[test]
fn renders_static_jsx_slots_once_and_map_expressions_as_lists() {
    let root = crate::emit::ident("_root");

    let mut jsx_vt = new_vt();
    let mut jsx_stmts = Vec::new();
    handle_expr_container(&mut jsx_vt, &root, &parse_expr_container("<Box />"), &mut jsx_stmts);
    let jsx_out = compact(&emit_stmts(jsx_stmts));
    assert!(jsx_out.contains("_$createComponent(Box"));
    assert!(jsx_out.contains("_$mountCompiledSlotAt("), "{jsx_out}");
    assert!(!jsx_out.contains("renderAnchor("), "{jsx_out}");

    let mut map_vt = new_vt();
    let mut map_stmts = Vec::new();
    handle_expr_container(
        &mut map_vt,
        &root,
        &parse_expr_container("items.map(item => <li key={item.id}>{item.name}</li>)"),
        &mut map_stmts,
    );
    let map_out = compact(&emit_stmts(map_stmts));
    assert!(map_out.contains("_$reconcileKeyedSingle("));
    assert!(map_out.contains("(item,idx,_$rowTarget)=>{"));
    assert!(!map_out.contains(concat!("direct", "Root:true")));
    assert!(!map_out.contains("_$createDocumentFragment"));
    assert!(!map_out.contains("renderAnchor(__slot,parent,start);"));
}

#[test]
fn handles_children_slots_non_map_calls_and_static_component_variants() {
    let root = crate::emit::ident("_root");

    let mut children_vt = new_vt();
    let mut children_stmts = Vec::new();
    handle_expr_container(
        &mut children_vt,
        &root,
        &parse_expr_container("props.children"),
        &mut children_stmts,
    );
    let children_out = compact(&emit_stmts(children_stmts));
    assert!(children_out.contains("_$createComment(\"rue:children:anchor\")"));
    assert!(children_out.contains("()=>props.children"));
    assert!(!children_out.contains("_$compiledValueFactory(props.children)"));

    let mut member_children_vt = new_vt();
    let mut member_children_stmts = Vec::new();
    handle_expr_container(
        &mut member_children_vt,
        &root,
        &parse_expr_container("ctx.children"),
        &mut member_children_stmts,
    );
    let member_children_out = compact(&emit_stmts(member_children_stmts));
    assert!(member_children_out.contains("_$createComment(\"rue:children:anchor\")"));
    assert!(member_children_out.contains("_$compiledValueFactory(ctx.children)"));
    assert!(!member_children_out.contains("rue:slot:anchor"));

    let mut call_vt = new_vt();
    let mut call_stmts = Vec::new();
    handle_expr_container(&mut call_vt, &root, &parse_expr_container("render()"), &mut call_stmts);
    let call_out = compact(&emit_stmts(call_stmts));
    assert!(call_out.contains("_$compiledValueFactory(render())"));
    assert!(!call_out.contains("_$compiledKeyedList("));

    let mut children_ident_vt = new_vt();
    let mut children_ident_stmts = Vec::new();
    handle_expr_container(
        &mut children_ident_vt,
        &root,
        &parse_expr_container("<Card children={slot} />"),
        &mut children_ident_stmts,
    );
    let children_ident_out = compact(&emit_stmts(children_ident_stmts));
    assert!(children_ident_out.contains("_$mountCompiledSlotAt("));
    assert!(!children_ident_out.contains("renderAnchor("));

    let mut static_props_vt = new_vt();
    let mut static_props_stmts = Vec::new();
    handle_expr_container(
        &mut static_props_vt,
        &root,
        &parse_expr_container("<Card title=\"ok\" count={1} />"),
        &mut static_props_stmts,
    );
    let static_props_out = compact(&emit_stmts(static_props_stmts));
    assert!(static_props_out.contains("_$mountCompiledSlotAt("));
    assert!(!static_props_out.contains("renderAnchor("));
}

#[test]
fn hardens_memoized_jsx_and_transition_group_container_paths() {
    let root = crate::emit::ident("_root");

    let mut memo_vt = new_vt();
    let mut memo_stmts = Vec::new();
    handle_expr_container(
        &mut memo_vt,
        &root,
        &parse_expr_container("_$compiledMemo('memo', () => <span>{label}</span>, [])"),
        &mut memo_stmts,
    );
    let memo_out = compact(&emit_stmts(memo_stmts));
    assert!(memo_out.contains("_$createComment(\"rue:slot:anchor\")"), "{memo_out}");
    assert!(memo_out.contains("_$mountCompiledSlotAt("), "{memo_out}");
    assert!(memo_out.contains("_$compiledValueFactory(_$compiledMemo("), "{memo_out}");
    assert!(!memo_out.contains("renderAnchor"), "{memo_out}");

    let mut transition_vt = new_vt();
    let mut transition_stmts = Vec::new();
    handle_expr_container(
        &mut transition_vt,
        &root,
        &parse_expr_container("<TransitionGroup><li key=\"x\">X</li></TransitionGroup>"),
        &mut transition_stmts,
    );
    let transition_out = compact(&emit_stmts(transition_stmts));
    assert!(transition_out.contains("_$createComment(\"rue:slot:anchor\")"), "{transition_out}");
    assert!(transition_out.contains("_$mountCompiledSlotAt("), "{transition_out}");
    assert!(transition_out.contains("_$transitionGroup("), "{transition_out}");
}
