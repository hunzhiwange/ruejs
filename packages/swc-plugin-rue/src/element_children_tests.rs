use super::*;
use std::collections::{HashMap, HashSet};
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

fn parse_expr(src: &str, tsx: bool) -> Expr {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("element-children-test.tsx".into()).into(),
        src.to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    *parser.parse_expr().expect("parse expr")
}

fn parse_jsx_element(src: &str) -> JSXElement {
    match parse_expr(src, true) {
        Expr::JSXElement(el) => *el,
        other => panic!("expected JSXElement, got {other:?}"),
    }
}

fn reactive_scope(src: &str) -> HashSet<String> {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("element-children-scope-test.tsx".into()).into(),
        src.to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let module = parser.parse_module().expect("parse reactive scope module");
    crate::reactive_provenance::collect_module_scope(&module, &[])
}

fn jsx_text(value: &str) -> JSXElementChild {
    JSXElementChild::JSXText(JSXText { span: DUMMY_SP, value: value.into(), raw: value.into() })
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

#[test]
fn emits_inline_space_and_trims_block_text_children() {
    let mut vt = new_vt();
    let el = parse_jsx_element("<div>{1}   {2}  hello  </div>");
    let mut stmts = Vec::new();

    emit_element_children(&mut vt, &crate::emit::ident("root"), &el.children, &mut stmts);

    let raw = emit_stmts(stmts);
    let out = compact(&raw);

    assert_eq!(raw.matches("_$createTextNode(\" \")").count(), 1);
    assert!(out.contains("_$appendChild(root,_$createTextNode(\"hello\"));"));
    assert!(out.contains("_$createTextWrapper(root)"));
    assert!(out.contains("_$settextContent(_el1,\"1\");"));
    assert!(out.contains("_$settextContent(_el2,\"2\");"));
    assert!(!out.contains("watchEffect(()=>{_$settextContent(_el1"));
    assert!(!out.contains("watchEffect(()=>{_$settextContent(_el2"));
}

#[test]
fn preserves_text_spacing_around_nested_elements() {
    let mut vt = new_vt();
    let el = parse_jsx_element(
        "<p>\n  一套基于 <a>RueJS</a> 与浏览器 Office\n  内核构建的轻量工作台。\n</p>",
    );
    let mut stmts = Vec::new();

    emit_element_children(&mut vt, &crate::emit::ident("root"), &el.children, &mut stmts);

    let raw = emit_stmts(stmts);
    assert!(raw.contains("_$createTextNode(\"一套基于 \")"));
    assert!(raw.contains("_$createTextNode(\" 与浏览器 Office 内核构建的轻量工作台。\")"));
}

#[test]
fn dispatches_fragment_expr_nested_element_and_ignores_spread_children() {
    let mut vt = new_vt();
    vt.el_tag_by_ident.insert("root".to_string(), "div".to_string());
    vt.push_renderable_local_scope(HashSet::from(["slotView".to_string()]));

    let mut el =
        parse_jsx_element("<div>{props.children}{slotView}<>frag</><span>child</span></div>");
    el.children.push(JSXElementChild::JSXSpreadChild(JSXSpreadChild {
        span: DUMMY_SP,
        expr: Box::new(parse_expr("extra", false)),
    }));

    let mut stmts = Vec::new();
    emit_element_children(&mut vt, &crate::emit::ident("root"), &el.children, &mut stmts);

    let out = compact(&emit_stmts(stmts));

    assert!(out.contains("_$createComment(\"rue:children:anchor\")"));
    assert!(out.contains("_$mountCompiledSlotAt({parent:root,before:_list1}"), "{out}");
    assert!(out.contains("_$createComment(\"rue:slot:anchor\")"));
    assert!(out.contains("_$mountCompiledSlotAt("), "{out}");
    assert!(out.contains("_$appendChild(root,_$createTextNode(\"frag\"));"));
    assert!(out.contains("_$createElement(\"span\",root)"));
    assert!(out.contains("_$appendChild(_el1,_$createTextNode(\"child\"));"));
    assert!(!out.contains("extra"));
}

#[test]
fn skips_block_whitespace_and_empty_expression_children() {
    let mut vt = new_vt();
    let mut el = parse_jsx_element("<div>   <span />   </div>");
    el.children.push(JSXElementChild::JSXExprContainer(JSXExprContainer {
        span: DUMMY_SP,
        expr: JSXExpr::JSXEmptyExpr(JSXEmptyExpr { span: DUMMY_SP }),
    }));
    el.children.push(JSXElementChild::JSXSpreadChild(JSXSpreadChild {
        span: DUMMY_SP,
        expr: Box::new(parse_expr("extra", false)),
    }));

    let mut stmts = Vec::new();
    emit_element_children(&mut vt, &crate::emit::ident("root"), &el.children, &mut stmts);

    let out = compact(&emit_stmts(stmts));

    assert!(out.contains("_$createElement(\"span\",root)"));
    assert!(!out.contains("_$createTextNode(\" \")"));
    assert!(!out.contains("extra"));
}

#[test]
fn trims_text_against_explicit_space_expression_neighbors() {
    let mut vt = new_vt();
    let el = parse_jsx_element("<div>{' '} hello {' '}</div>");
    let mut stmts = Vec::new();

    emit_element_children(&mut vt, &crate::emit::ident("root"), &el.children, &mut stmts);

    let out = compact(&emit_stmts(stmts));

    assert!(out.contains("_$appendChild(root,_$createTextNode(\"hello\"));"));
    assert_eq!(out.matches("_$createTextNode(\"hello\")").count(), 1);
}

#[test]
fn handles_jsx_text_neighbors_for_spaces_and_visible_text() {
    let mut vt = new_vt();
    let children = vec![
        jsx_text("left"),
        jsx_text("   "),
        jsx_text("mid"),
        jsx_text(" right "),
        jsx_text("tail"),
    ];
    let mut stmts = Vec::new();

    emit_element_children(&mut vt, &crate::emit::ident("root"), &children, &mut stmts);

    let raw = emit_stmts(stmts);
    let out = compact(&raw);

    assert_eq!(raw.matches("_$createTextNode(\" \")").count(), 1);
    assert!(out.contains("_$appendChild(root,_$createTextNode(\"left\"));"));
    assert!(out.contains("_$appendChild(root,_$createTextNode(\"mid\"));"));
    assert!(out.contains("_$appendChild(root,_$createTextNode(\"right\"));"));
    assert!(out.contains("_$appendChild(root,_$createTextNode(\"tail\"));"));
}

#[test]
fn treats_non_string_expression_neighbors_as_non_space_neighbors() {
    let mut vt = new_vt();
    let empty_expr = JSXElementChild::JSXExprContainer(JSXExprContainer {
        span: DUMMY_SP,
        expr: JSXExpr::JSXEmptyExpr(JSXEmptyExpr { span: DUMMY_SP }),
    });
    let children = vec![empty_expr.clone(), jsx_text(" padded "), empty_expr];
    let mut stmts = Vec::new();

    emit_element_children(&mut vt, &crate::emit::ident("root"), &children, &mut stmts);

    let out = compact(&emit_stmts(stmts));
    assert!(out.contains("_$appendChild(root,_$createTextNode(\"padded\"));"));
}

#[test]
fn classifies_only_synchronous_scalar_children_for_direct_binding() {
    let scalar = parse_expr("String(count.get())", false);
    let conditional = parse_expr("ready.get() ? label.get() : 'idle'", false);
    let renderable = parse_expr("renderRow()", false);
    let object = parse_expr("({ label: count.get() })", false);

    assert!(crate::vapor::is_compiled_scalar_expr(&scalar));
    assert!(crate::vapor::is_compiled_scalar_expr(&conditional));
    assert!(!crate::vapor::is_compiled_scalar_expr(&renderable));
    assert!(!crate::vapor::is_compiled_scalar_expr(&object));
}

#[test]
fn reports_closed_ranges_for_compiler_proven_element_and_fragment_blocks() {
    let mut element_vt = new_vt();
    let element = parse_jsx_element("<section><span>child</span></section>");
    let element_out = compact(&emit_expr(compiled_block_to_root_expr(
        compiled_scalar_element_to_block(&mut element_vt, &element),
    )));

    assert!(element_out.contains("return[_root,_root]"), "{element_out}");
    assert!(element_out.contains("_$compiledRoot((__rue_parent_context)=>"), "{element_out}");
    assert!(!element_out.contains("__rue_compiled_host"), "{element_out}");
    assert!(element_out.contains("return[_root,_root]"), "{element_out}");

    let mut fragment_vt = new_vt();
    let Expr::JSXFragment(fragment) = parse_expr("<><span>one</span><strong>two</strong></>", true)
    else {
        panic!("expected JSX fragment");
    };
    let fragment_out = compact(&emit_expr(compiled_block_to_root_expr(
        compiled_fragment_to_block(&mut fragment_vt, &fragment),
    )));

    assert!(fragment_out.contains("return[_root.firstChild,_root.lastChild]"), "{fragment_out}");
    assert!(fragment_out.contains("_$compiledRoot((__rue_parent_context)=>"), "{fragment_out}");
    assert!(!fragment_out.contains("Array.from"), "{fragment_out}");
    assert!(fragment_out.contains("return[_root.firstChild,_root.lastChild]"), "{fragment_out}");
}

#[test]
fn groups_same_source_literal_sibling_branches_with_empty_fallback() {
    let mut vt = new_vt();
    vt.push_plain_local_scope(reactive_scope(
        "import { ref } from '@rue-js/rue'; const tab = ref('preview');",
    ));
    let el = parse_jsx_element(
        r#"<div>
          {tab.value === 'code' && <span>code</span>}
          {tab.value === 'preview' && <span>preview</span>}
        </div>"#,
    );
    let mut stmts = Vec::new();

    emit_element_children(&mut vt, &crate::emit::ident("root"), &el.children, &mut stmts);

    let out = compact(&emit_stmts(stmts));
    assert_eq!(out.matches("_$compiledBranch(").count(), 1, "{out}");
    assert_eq!(out.matches("const__rue_branch_value=tab.value").count(), 1, "{out}");
    assert!(out.contains("==='code'"), "{out}");
    assert!(out.contains("==='preview'"), "{out}");
    assert!(out.contains("_$createDocumentFragment()"), "{out}");
}

#[test]
fn keeps_different_sources_and_effectful_tests_as_independent_branches() {
    let mut vt = new_vt();
    let different = parse_jsx_element(
        "<div>{left.get() === 'a' && <span>a</span>}{right.get() === 'b' && <span>b</span>}</div>",
    );
    let mut different_stmts = Vec::new();
    emit_element_children(
        &mut vt,
        &crate::emit::ident("root"),
        &different.children,
        &mut different_stmts,
    );
    assert_ne!(compact(&emit_stmts(different_stmts)).matches("_$compiledBranch(").count(), 1);

    let mut effectful_vt = new_vt();
    let effectful = parse_jsx_element(
        "<div>{readTab() === 'a' && <span>a</span>}{readTab() === 'b' && <span>b</span>}</div>",
    );
    let mut effectful_stmts = Vec::new();
    emit_element_children(
        &mut effectful_vt,
        &crate::emit::ident("root"),
        &effectful.children,
        &mut effectful_stmts,
    );
    assert_ne!(compact(&emit_stmts(effectful_stmts)).matches("_$compiledBranch(").count(), 1);
}

fn reject_unsafe_child(source: &str) {
    let mut vt = new_vt();
    let el = parse_jsx_element(source);
    emit_element_children(&mut vt, &crate::emit::ident("root"), &el.children, &mut Vec::new());
}

#[test]
#[should_panic(expected = "children")]
fn rejects_object_children() {
    reject_unsafe_child("<div>{({ arbitrary: true })}</div>");
}

#[test]
#[should_panic(expected = "children")]
fn rejects_mixed_node_object_children() {
    reject_unsafe_child("<div>{[document.createTextNode('x'), { arbitrary: true }]}</div>");
}

#[test]
#[should_panic(expected = "children")]
fn rejects_object_map_children() {
    reject_unsafe_child(
        "<div>{rows.get().map(row => ({ key: row.id, node: document.createElement('li') }))}</div>",
    );
}
