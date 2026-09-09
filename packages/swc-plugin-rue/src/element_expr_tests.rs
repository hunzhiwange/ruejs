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
    let fm = cm
        .new_source_file(FileName::Custom("element-expr-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    *parser.parse_expr().expect("parse expr")
}

fn parse_call(src: &str, tsx: bool) -> CallExpr {
    match parse_expr(src, tsx) {
        Expr::Call(call) => call,
        other => panic!("expected CallExpr, got {other:?}"),
    }
}

fn parse_module_stmts(src: &str, tsx: bool) -> Vec<Stmt> {
    let cm = Arc::new(SourceMap::default());
    let fm = cm
        .new_source_file(FileName::Custom("element-expr-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let module = parser.parse_module().expect("parse module");
    module
        .body
        .into_iter()
        .filter_map(|item| match item {
            ModuleItem::Stmt(stmt) => Some(stmt),
            _ => None,
        })
        .collect()
}

fn expr_container(src: &str, tsx: bool) -> JSXExprContainer {
    JSXExprContainer { span: DUMMY_SP, expr: JSXExpr::Expr(Box::new(parse_expr(src, tsx))) }
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

fn transform_module(src: &str) -> String {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("element-reactive-scalar-test.tsx".into()).into(),
        src.to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let transformed = crate::apply(parser.parse_program().expect("parse module"));
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    emitter.emit_program(&transformed).expect("emit transformed module");
    String::from_utf8(buf).expect("utf8")
}

fn compact(src: &str) -> String {
    src.chars().filter(|ch| !ch.is_whitespace()).collect()
}

fn compile_expr_child_for_parent(expr_src: &str, parent_tag: &str) -> String {
    let mut vt = new_vt();
    vt.el_tag_by_ident.insert("root".to_string(), parent_tag.to_string());
    let mut stmts = Vec::new();

    emit_element_expr_container_child(
        &mut vt,
        &ident("root"),
        &expr_container(expr_src, true),
        &mut stmts,
    );

    compact(&emit_stmts(stmts))
}

#[test]
fn compiles_slot_factory_with_target_props_owner_abi_without_renderable_helpers() {
    let mut vt = new_vt();
    let factory = compiled_slot_factory_expr(
        &mut vt,
        &parse_expr("<><strong>head</strong><em>tail</em></>", true),
    )
    .expect("compiled slot factory");
    let out = compact(&emit_expr(factory));

    assert!(out.starts_with("(target,slotProps,owner)=>"), "{out}");
    assert!(out.contains("_$mountCompiledSlotFactory(target,owner,"), "{out}");
    assert!(out.contains("_$compiledCreateElement(\"strong\""), "{out}");
    assert!(out.contains("_$compiledCreateElement(\"em\""), "{out}");
    assert!(!out.contains("renderBetween"), "{out}");
    assert!(!out.contains("renderAnchor"), "{out}");
    assert!(!out.contains("_$compiledRootFactory"), "{out}");
    assert!(!out.contains("vapor("), "{out}");
}

#[test]
fn detects_renderable_calls_empty_memos_and_local_aliases() {
    assert!(contains_jsx_in_expr(&parse_expr(
        "_$compiledMemo('memo', () => ok ? <span /> : null, [])",
        true
    )));
    assert!(contains_jsx_in_expr(&parse_expr(
        "_$compiledWithHookId(\"memo:0:0\", () => _$compiledMemo('memo', () => <span />, []))",
        true,
    )));
    assert!(contains_jsx_in_expr(&parse_expr(
        "items.map(item => { if (item.ok) { return <li />; } return null; })",
        true,
    )));
    assert!(expr_returns_jsx_renderable(&parse_expr("(fallback ?? <span />)", true)));
    assert!(expr_returns_jsx_renderable(&parse_expr("(fallback || <span />)", true)));
    assert!(!contains_jsx_in_expr(&parse_expr("_$compiledMemo('memo', () => value, [])", false)));
    assert!(!contains_jsx_in_expr(&parse_expr("String(value)", false)));

    assert!(is_empty_deps_memoized_jsx_expr(&parse_expr(
        "_$compiledMemo('memo', () => <span />, [])",
        true
    )));
    assert!(is_empty_deps_memoized_jsx_expr(&parse_expr(
        "_$compiledWithHookId(\"memo:0:0\", () => _$compiledMemo('memo', () => <span />, []))",
        true,
    )));
    assert!(!is_empty_deps_memoized_jsx_expr(&parse_expr(
        "_$compiledMemo('memo', () => <span />, deps)",
        true,
    )));

    let stmts = parse_module_stmts(
        "
const fromOuter = slotSeed;
const fromJsx = <div />;
const fromCond = ok ? fromJsx : null;
const fromCall = renderThing();
const fromWrapped = (fromCond as any);
const textified = String(fromJsx);
let mutableAlias = fromJsx;
const empty = null;
",
        true,
    );
    let outer = HashSet::from(["slotSeed".to_string()]);
    let aliases = collect_renderable_local_alias_names(stmts.iter(), &outer);

    assert!(aliases.contains("fromOuter"));
    assert!(aliases.contains("fromJsx"));
    assert!(aliases.contains("fromCond"));
    assert!(aliases.contains("fromCall"));
    assert!(aliases.contains("fromWrapped"));
    assert!(!aliases.contains("textified"));
    assert!(!aliases.contains("mutableAlias"));
    assert!(!aliases.contains("empty"));

    let no_init_const = Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span: DUMMY_SP,
        ctxt: Default::default(),
        kind: VarDeclKind::Const,
        declare: false,
        decls: vec![VarDeclarator {
            span: DUMMY_SP,
            name: Pat::Ident(BindingIdent { id: ident("declaredOnly"), type_ann: None }),
            init: None,
            definite: false,
        }],
    })));
    let no_init_aliases = collect_renderable_local_alias_names([&no_init_const], &HashSet::new());
    assert!(no_init_aliases.is_empty());
}

#[test]
fn rewrites_hook_wrapped_memo_calls_for_slot_with_empty_fallbacks() {
    let mut vt = new_vt();
    let expr = parse_expr(
        "_$compiledWithHookId(\"memo:0:0\", () => _$compiledMemo('memo', () => ok ? <span /> : null, []))",
        true,
    );

    let out = compact(&emit_expr(make_expr_for_slot(&mut vt, &expr)));

    assert!(out.contains("_$compiledWithHookId(\"memo:0:0\",()=>_$compiledMemo('memo',()"));
    assert!(out.contains("_$compiledRoot(Object.assign((__rue_parent_context)=>{"));
    assert!(out.contains("_$compiledCreateElement(\"span\",__rue_parent_context)"));
    assert!(out.contains(":\"\""));
}

#[test]
fn emits_slot_render_once_and_style_text_paths_for_expr_children() {
    let mut slot_vt = new_vt();
    slot_vt.el_tag_by_ident.insert("root".to_string(), "div".to_string());
    slot_vt.push_renderable_local_scope(HashSet::from(["slotView".to_string()]));
    let mut slot_stmts = Vec::new();

    emit_element_expr_container_child(
        &mut slot_vt,
        &ident("root"),
        &expr_container("slotView", false),
        &mut slot_stmts,
    );

    let slot_out = compact(&emit_stmts(slot_stmts));
    assert!(slot_out.contains("_$createComment(\"rue:slot:anchor\")"));
    assert!(slot_out.contains(
        "effect(()=>{const__slot=(slotView);untrack(()=>renderAnchor(__slot,root,_list1));});"
    ));

    let mut memo_vt = new_vt();
    memo_vt.el_tag_by_ident.insert("root".to_string(), "div".to_string());
    let mut memo_stmts = Vec::new();

    emit_element_expr_container_child(
        &mut memo_vt,
        &ident("root"),
        &expr_container("_$compiledMemo('memo', () => <span />, [])", true),
        &mut memo_stmts,
    );

    let memo_out = compact(&emit_stmts(memo_stmts));
    assert!(memo_out.contains("_$createComment(\"rue:slot:anchor\")"));
    assert!(memo_out.contains("renderAnchor(_list2,root,_list1);"));
    assert!(!memo_out.contains("watchEffect("));

    let mut style_vt = new_vt();
    style_vt.once_depth = 1;
    style_vt.el_tag_by_ident.insert("styleEl".to_string(), "style".to_string());
    let mut style_stmts = Vec::new();

    emit_element_expr_container_child(
        &mut style_vt,
        &ident("styleEl"),
        &expr_container("colorValue", false),
        &mut style_stmts,
    );

    let style_out = compact(&emit_stmts(style_stmts));
    assert!(style_out.contains("_$settextContent(styleEl,colorValue);"));
    assert!(!style_out.contains("watchEffect("));
}

#[test]
fn routes_opaque_identifier_children_through_slot_anchor_in_html_elements() {
    let out = compile_expr_child_for_parent("extra", "div");

    assert!(out.contains("_$createComment(\"rue:slot:anchor\")"));
    assert!(out.contains(
        "effect(()=>{const__slot=(extra);untrack(()=>renderAnchor(__slot,root,_list1));});"
    ));
    assert!(!out.contains("_$settextContent"));
}

#[test]
fn routes_opaque_conditional_and_logical_children_through_slot_anchor_in_html_elements() {
    let conditional = compile_expr_child_for_parent("enabled ? extra : fallback", "div");
    assert!(conditional.contains("_$createComment(\"rue:slot:anchor\")"));
    assert!(conditional.contains("const__slot=enabled?extra:fallback;"));
    assert!(conditional.contains("renderAnchor(__slot,root,_list1)"));
    assert!(!conditional.contains("_$settextContent"));

    let logical = compile_expr_child_for_parent("visible && extra", "div");
    assert!(logical.contains("_$createComment(\"rue:slot:anchor\")"));
    assert!(logical.contains("const__slot=visible?extra:\"\";"));
    assert!(logical.contains("renderAnchor(__slot,root,_list1)"));
    assert!(!logical.contains("_$settextContent"));

    let nullish = compile_expr_child_for_parent("extra ?? fallback", "div");
    assert!(nullish.contains("_$createComment(\"rue:slot:anchor\")"));
    assert!(nullish.contains("const__slot=extra??fallback;"));
    assert!(nullish.contains("renderAnchor(__slot,root,_list1)"));
    assert!(!nullish.contains("_$settextContent"));
}

#[test]
fn routes_accessor_get_children_through_slot_anchor_in_html_elements() {
    let out = compile_expr_child_for_parent("indicator.get()", "div");

    assert!(out.contains("_$createComment(\"rue:slot:anchor\")"));
    assert!(out.contains("const__slot=indicator.get();"));
    assert!(out.contains("renderAnchor(__slot,root,_list1)"));
    assert!(!out.contains("_$settextContent"));

    let member_text = compile_expr_child_for_parent("sha.slice(0, 7)", "div");
    assert!(member_text.contains("_$createTextWrapper(root)"));
    assert!(member_text.contains("effect(()=>{_$settextContent(_el1,sha.slice(0,7));});"));
    assert!(!member_text.contains("renderAnchor"));
}

#[test]
fn routes_wrapped_and_nested_accessor_get_children_through_slot_anchor() {
    for (src, expected) in [
        ("(indicator.get() as any)", "const__slot=indicator.get();"),
        ("indicator.get() ?? fallback", "const__slot=indicator.get()??fallback;"),
        ("ready ? indicator.get() : fallback", "const__slot=ready?indicator.get():fallback;"),
        ("indicator.get() || fallback", "const__slot=indicator.get()||fallback;"),
        ("ready && indicator.get()", "const__slot=ready?indicator.get():\"\";"),
        ("store.current.get()", "const__slot=store.current.get();"),
    ] {
        let out = compile_expr_child_for_parent(src, "div");

        assert!(out.contains("_$createComment(\"rue:slot:anchor\")"), "{src}: {out}");
        assert!(out.contains(expected), "{src}: {out}");
        assert!(out.contains("renderAnchor(__slot,root,_list1)"), "{src}: {out}");
        assert!(!out.contains("_$settextContent"), "{src}: {out}");
    }
}

#[test]
fn keeps_accessor_get_text_contexts_and_non_accessor_member_calls_on_text_path() {
    for (src, parent_tag) in [("indicator.get()", "style"), ("indicator.get()", "text")] {
        let out = compile_expr_child_for_parent(src, parent_tag);

        assert!(out.contains("_$settextContent"), "{src} in {parent_tag}: {out}");
        assert!(!out.contains("renderAnchor"), "{src} in {parent_tag}: {out}");
    }

    for src in [
        "showB && 'B 显示（&&）'",
        "indicator.get(0)",
        "indicator.peek()",
        "sha.slice(0, 7)",
        "String(indicator.get())",
        "Number(indicator.get())",
        "parseInt(indicator.get(), 10)",
    ] {
        let out = compile_expr_child_for_parent(src, "div");

        assert!(out.contains("_$createTextWrapper(root)"), "{src}: {out}");
        assert!(out.contains("_$settextContent"), "{src}: {out}");
        assert!(!out.contains("renderAnchor"), "{src}: {out}");
    }
}

#[test]
fn keeps_static_literals_on_text_content_path_for_html_children() {
    let string_out = compile_expr_child_for_parent("'ready'", "div");
    assert!(string_out.contains("_$createTextWrapper(root)"));
    assert!(string_out.contains("_$settextContent(_el1,'ready');"));
    assert!(!string_out.contains("renderAnchor"));

    let number_out = compile_expr_child_for_parent("42", "div");
    assert!(number_out.contains("_$createTextWrapper(root)"));
    assert!(number_out.contains("_$settextContent(_el1,\"42\");"));
    assert!(!number_out.contains("renderAnchor"));

    let empty_out = compile_expr_child_for_parent("null", "div");
    assert!(empty_out.contains("_$createTextWrapper(root)"));
    assert!(empty_out.contains("_$settextContent(_el1,\"\");"));
    assert!(!empty_out.contains("renderAnchor"));
}

#[test]
fn keeps_style_and_svg_identifier_children_on_text_content_path() {
    let style_out = compile_expr_child_for_parent("cssText", "style");
    assert!(style_out.contains("effect(()=>{_$settextContent(root,cssText);});"));
    assert!(!style_out.contains("renderAnchor"));

    let svg_out = compile_expr_child_for_parent("label", "text");
    assert!(svg_out.contains("_$createTextWrapper(root)"));
    assert!(svg_out.contains("effect(()=>{_$settextContent(_el1,label);});"));
    assert!(!svg_out.contains("renderAnchor"));
}

#[test]
fn rewrites_fragments_logicals_maps_and_fallback_calls_for_slot_values() {
    let mut fragment_vt = new_vt();
    let fragment_out = compact(&emit_expr(make_expr_for_slot(
        &mut fragment_vt,
        &parse_expr("<><span>one</span><em>two</em></>", true),
    )));

    assert!(fragment_out.contains("_$compiledRoot(Object.assign((__rue_parent_context)=>{"));
    assert!(fragment_out.contains("_$createDocumentFragment()"));
    assert!(fragment_out.contains("_$compiledCreateElement(\"span\",_root)"));
    assert!(fragment_out.contains("_$compiledCreateElement(\"em\",_root)"));

    let mut logical_vt = new_vt();
    let numeric_and = compact(&emit_expr(make_expr_for_slot(
        &mut logical_vt,
        &parse_expr("0 && <span />", true),
    )));
    assert!(numeric_and.contains("0?_$compiledRoot(Object.assign((__rue_parent_context)=>{"));
    assert!(numeric_and.ends_with(":0;"));

    let nan_and = compact(&emit_expr(make_expr_for_slot(
        &mut logical_vt,
        &parse_expr("NaN && <span />", true),
    )));
    assert!(nan_and.ends_with(":NaN;"));

    let nullish = compact(&emit_expr(make_expr_for_slot(
        &mut logical_vt,
        &parse_expr("fallback ?? <strong />", true),
    )));
    assert!(nullish.contains("fallback??_$compiledRoot(Object.assign((__rue_parent_context)=>{"));
    assert!(nullish.contains("_$compiledCreateElement(\"strong\",__rue_parent_context)"));

    let map_out = compact(&emit_expr(make_expr_for_slot(
        &mut logical_vt,
        &parse_expr("items.map(item => <span>{item.name}</span>)", true),
    )));
    assert!(map_out.contains("_$compiledRoot(()=>{"));
    assert!(map_out.contains("items.map((item)=>"), "{map_out}");
    assert!(!map_out.contains("_$compiledKeyedList"), "{map_out}");

    let plain_call = compact(&emit_expr(make_expr_for_slot(
        &mut logical_vt,
        &parse_expr("renderPlain()", false),
    )));
    assert_eq!(plain_call, "renderPlain();");

    let block_body_memo = compact(&emit_expr(make_expr_for_slot(
        &mut logical_vt,
        &parse_expr("_$compiledMemo('memo', () => { return <span />; }, [])", true),
    )));
    assert!(block_body_memo.contains("_$compiledMemo('memo',()=>{return<span/>;},[]);"));
    assert!(!block_body_memo.contains("vapor(()=>{"));
}

#[test]
fn detects_renderable_returns_across_nested_statement_shapes() {
    assert!(arrow_returns_jsx_renderable(&parse_expr(
        "() => { while (ok) { return <span />; } }",
        true,
    )));
    assert!(arrow_returns_jsx_renderable(&parse_expr(
        "() => { label: { return <span />; } }",
        true,
    )));
    assert!(arrow_returns_jsx_renderable(&parse_expr(
        "() => { try { return value; } catch (err) { return null; } finally { return <span />; } }",
        true,
    )));
    assert!(arrow_returns_jsx_renderable(&parse_expr(
        "function () { return ok ? null : <span />; }",
        true,
    )));
    assert!(!arrow_returns_jsx_renderable(&parse_expr("() => { return value; }", false)));

    assert!(contains_jsx_in_expr(&parse_expr("(ok || <span />)", true)));
    assert!(contains_jsx_in_expr(&parse_expr(
        "(ok ? value : _$compiledMemo('memo', () => <span />, []))",
        true
    )));
    assert!(!contains_jsx_in_expr(&parse_expr("(ok ? value : other)", false)));
}

#[test]
fn emits_children_slots_svg_text_style_literals_and_member_renderables() {
    let mut children_vt = new_vt();
    children_vt.el_tag_by_ident.insert("root".to_string(), "div".to_string());
    let mut children_stmts = Vec::new();
    emit_element_expr_container_child(
        &mut children_vt,
        &ident("root"),
        &expr_container("props.children", false),
        &mut children_stmts,
    );
    let children_out = compact(&emit_stmts(children_stmts));
    assert!(children_out.contains("_$createComment(\"rue:children:anchor\")"));
    assert!(
        children_out.contains(
            "_$mountCompiledSlotAt({parent:root,before:_list1},()=>props.children,()=>({}))"
        ),
        "{children_out}"
    );
    assert!(!children_out.contains("renderAnchor"));

    let mut member_vt = new_vt();
    member_vt.el_tag_by_ident.insert("root".to_string(), "div".to_string());
    let mut member_stmts = Vec::new();
    emit_element_expr_container_child(
        &mut member_vt,
        &ident("root"),
        &expr_container("registry.view", false),
        &mut member_stmts,
    );
    let member_out = compact(&emit_stmts(member_stmts));
    assert!(member_out.contains("_$createComment(\"rue:slot:anchor\")"));
    assert!(member_out.contains("renderAnchor(__slot,root,_list1)"));

    let mut svg_vt = new_vt();
    svg_vt.el_tag_by_ident.insert("svgRoot".to_string(), "svg".to_string());
    let mut svg_stmts = Vec::new();
    emit_element_expr_container_child(
        &mut svg_vt,
        &ident("svgRoot"),
        &expr_container("renderIcon()", false),
        &mut svg_stmts,
    );
    let svg_out = compact(&emit_stmts(svg_stmts));
    assert!(svg_out.contains("_$createTextWrapper(svgRoot)"));
    assert!(svg_out.contains("effect(()=>{"));
    assert!(!svg_out.contains("renderAnchor"));

    let mut style_empty_vt = new_vt();
    style_empty_vt.el_tag_by_ident.insert("styleEl".to_string(), "style".to_string());
    let mut style_empty_stmts = Vec::new();
    emit_element_expr_container_child(
        &mut style_empty_vt,
        &ident("styleEl"),
        &expr_container("null", false),
        &mut style_empty_stmts,
    );
    assert_eq!(compact(&emit_stmts(style_empty_stmts)), "_$settextContent(styleEl,\"\");");

    let mut style_static_vt = new_vt();
    style_static_vt.el_tag_by_ident.insert("styleEl".to_string(), "style".to_string());
    let mut style_static_stmts = Vec::new();
    emit_element_expr_container_child(
        &mut style_static_vt,
        &ident("styleEl"),
        &expr_container("\"body{color:red}\"", false),
        &mut style_static_stmts,
    );
    assert_eq!(
        compact(&emit_stmts(style_static_stmts)),
        "_$settextContent(styleEl,\"body{color:red}\");"
    );

    let mut style_dynamic_vt = new_vt();
    style_dynamic_vt.el_tag_by_ident.insert("styleEl".to_string(), "style".to_string());
    let mut style_dynamic_stmts = Vec::new();
    emit_element_expr_container_child(
        &mut style_dynamic_vt,
        &ident("styleEl"),
        &expr_container("dynamicCss", false),
        &mut style_dynamic_stmts,
    );
    assert_eq!(
        compact(&emit_stmts(style_dynamic_stmts)),
        "effect(()=>{_$settextContent(styleEl,dynamicCss);});"
    );
}

#[test]
fn detects_nested_opaque_renderables_and_svg_ref_exceptions() {
    let mut vt = new_vt();
    vt.push_renderable_local_scope(HashSet::from(["slotView".to_string()]));

    assert!(contains_opaque_renderable_expr(&vt, &parse_expr("ok ? null : registry.view", false),));
    assert!(contains_opaque_renderable_expr(&vt, &parse_expr("slotView || fallback", false),));
    assert!(contains_opaque_renderable_expr(&vt, &parse_expr("(maybe ?? renderThing())", false),));
    assert!(contains_opaque_renderable_expr(&vt, &parse_expr("indicator.get()", false),));
    assert!(contains_opaque_renderable_expr(
        &vt,
        &parse_expr("(indicator.get() as any) ?? fallback", true),
    ));
    assert!(contains_opaque_renderable_expr(
        &vt,
        &parse_expr("ready && store.current.get()", false),
    ));
    assert!(!contains_opaque_renderable_expr(&vt, &parse_expr("showB && 'B 显示（&&）'", false),));
    assert!(is_non_ref_member_expr(&parse_expr("registry['view']", false)));
    assert!(!contains_opaque_renderable_expr(&vt, &parse_expr("count.value", false),));
    assert!(!contains_opaque_renderable_expr(&vt, &parse_expr("String(registry.view)", false),));
    assert!(!contains_opaque_renderable_expr(&vt, &parse_expr("sha.slice(0, 7)", false),));
    assert!(!contains_opaque_renderable_expr(&vt, &parse_expr("indicator.get(0)", false),));
    assert!(!contains_opaque_renderable_expr(&vt, &parse_expr("indicator.peek()", false),));

    let mut svg_vt = new_vt();
    svg_vt.el_tag_by_ident.insert("svgRoot".to_string(), "circle".to_string());
    let mut svg_member_stmts = Vec::new();
    emit_element_expr_container_child(
        &mut svg_vt,
        &ident("svgRoot"),
        &expr_container("registry.view", false),
        &mut svg_member_stmts,
    );
    let svg_member_out = compact(&emit_stmts(svg_member_stmts));

    assert!(svg_member_out.contains("_$createTextWrapper(svgRoot)"));
    assert!(!svg_member_out.contains("renderAnchor"));
}

#[test]
fn finds_empty_memo_deps_inside_nested_expressions() {
    assert!(is_empty_deps_memoized_jsx_expr(&parse_expr(
        "ok ? value : _$compiledMemo('memo', () => <span />, [])",
        true,
    )));
    assert!(is_empty_deps_memoized_jsx_expr(&parse_expr(
        "left || _$compiledWithHookId('memo:0:0', () => _$compiledMemo('memo', () => <span />, []))",
        true,
    )));
    assert!(is_empty_deps_memoized_jsx_expr(&parse_expr(
        "(() => _$compiledMemo('memo', () => <span />, []))",
        true,
    )));
    assert!(!is_empty_deps_memoized_jsx_expr(&parse_expr("ok ? value : other", false,)));
}

#[test]
fn covers_parenthesized_contains_jsx_and_renderable_expr_branches() {
    assert!(contains_jsx_in_expr(&parse_expr("(<span />)", true)));
    assert!(contains_jsx_in_expr(&parse_expr("(ok && <span />)", true)));
    assert!(contains_jsx_in_expr(&parse_expr("(left ?? <span />)", true)));
    assert!(contains_jsx_in_expr(&parse_expr("(items.map(item => <span />))", true)));
    assert!(!contains_jsx_in_expr(&parse_expr("(value + 1)", false)));

    assert!(expr_returns_jsx_renderable(&parse_expr("ok || <span />", true)));
    assert!(expr_returns_jsx_renderable(&parse_expr("ok ?? <span />", true)));
    assert!(expr_returns_jsx_renderable(&parse_expr(
        "ok && _$compiledMemo('memo', () => <span />, [])",
        true
    )));
    assert!(!expr_returns_jsx_renderable(&parse_expr("ok && value", false)));

    assert!(expr_is_renderable_local_alias_source(
        &parse_expr("ok && slotView", false),
        &HashSet::from(["slotView".to_string()]),
    ));
    assert!(expr_is_renderable_local_alias_source(
        &parse_expr("maybe ?? renderThing()", false),
        &HashSet::new(),
    ));
    assert!(!expr_is_renderable_local_alias_source(&parse_expr("null", false), &HashSet::new(),));
}

#[test]
fn detects_renderable_returns_in_switch_and_loop_statements() {
    assert!(arrow_returns_jsx_renderable(&parse_expr(
        "() => { switch (kind) { case 'a': return <span />; default: return null; } }",
        true,
    )));
    assert!(arrow_returns_jsx_renderable(&parse_expr(
        "() => { for (let i = 0; i < 1; i++) { return <span />; } }",
        true,
    )));
    assert!(arrow_returns_jsx_renderable(&parse_expr(
        "() => { for (const key in data) { return <span />; } }",
        true,
    )));
    assert!(arrow_returns_jsx_renderable(&parse_expr(
        "() => { for (const row of rows) { return <span />; } }",
        true,
    )));
    assert!(!arrow_returns_jsx_renderable(&parse_expr(
        "() => { if (ok) { return value; } else { return other; } }",
        false,
    )));
}

#[test]
fn rewrites_slot_conditionals_with_renderable_calls_and_plain_fallbacks() {
    let mut vt = new_vt();
    let cond_out = compact(&emit_expr(make_expr_for_slot(
        &mut vt,
        &parse_expr("ok ? _$compiledMemo('memo', () => <span />, []) : null", true),
    )));
    assert!(cond_out.contains(
        "ok?_$compiledMemo('memo',()=>_$compiledRoot(Object.assign((__rue_parent_context)=>{"
    ));
    assert!(cond_out.contains(":\"\""));

    let and_out = compact(&emit_expr(make_expr_for_slot(
        &mut vt,
        &parse_expr("ok && _$compiledMemo('memo', () => <span />, [])", true),
    )));
    assert!(and_out.contains(
        "ok?_$compiledMemo('memo',()=>_$compiledRoot(Object.assign((__rue_parent_context)=>{"
    ));
    assert!(and_out.contains(":\"\""));

    let or_out = compact(&emit_expr(make_expr_for_slot(
        &mut vt,
        &parse_expr("renderFallback() || _$compiledMemo('memo', () => <span />, [])", true),
    )));
    assert!(or_out.contains(
        "renderFallback()||_$compiledMemo('memo',()=>_$compiledRoot(Object.assign((__rue_parent_context)=>{"
    ));

    let left_renderable_or = compact(&emit_expr(make_expr_for_slot(
        &mut vt,
        &parse_expr("_$compiledMemo('memo', () => <span />, []) || fallback", true),
    )));
    assert!(left_renderable_or.contains(
        "_$compiledMemo('memo',()=>_$compiledRoot(Object.assign((__rue_parent_context)=>{"
    ));
    assert!(left_renderable_or.contains("||fallback"));
}

#[test]
fn covers_fragment_once_nested_opaque_and_rewrite_false_edges() {
    let mut once_vt = new_vt();
    let once_fragment = once_vt.with_once_context(|vt| {
        make_expr_for_slot(vt, &parse_expr("ok ? <>frag</> : value", true))
    });
    let once_out = compact(&emit_expr(once_fragment));
    assert!(once_out.contains("ok?_$compiledRoot(Object.assign((__rue_parent_context)=>{"));
    assert!(once_out.contains("_$createDocumentFragment()"));
    assert!(!once_out.contains("watchEffect("));

    let mut branch_vt = new_vt();
    let cond_out = compact(&emit_expr(make_expr_for_slot(
        &mut branch_vt,
        &parse_expr("ok ? null : _$compiledMemo('memo', () => <span />, [])", true),
    )));
    assert!(cond_out.contains(
        "ok?\"\":_$compiledMemo('memo',()=>_$compiledRoot(Object.assign((__rue_parent_context)=>{"
    ));

    let or_left_out = compact(&emit_expr(make_expr_for_slot(
        &mut branch_vt,
        &parse_expr("<span /> || fallback", true),
    )));
    assert!(or_left_out.contains("_$compiledRoot(Object.assign((__rue_parent_context)=>{"));
    assert!(or_left_out.contains("||fallback"));

    assert!(!hook_wrapped_call_has_empty_memo_deps(&parse_call(
        "_$compiledWithHookId('memo:0:0')",
        true,
    )));
    assert!(!hook_wrapped_call_has_empty_memo_deps(&parse_call(
        "_$compiledWithHookId('memo:0:0', function () { return _$compiledMemo('memo', () => <span />, []); })",
        true,
    )));

    assert!(arrow_returns_jsx_renderable(&parse_expr(
        "() => { do { return <span />; } while (ok); }",
        true,
    )));
    assert!(!arrow_returns_jsx_renderable(&parse_expr("value", false)));

    assert!(expr_is_renderable_local_alias_source(
        &parse_expr("((slotView as any))", false),
        &HashSet::from(["slotView".to_string()]),
    ));

    let mut opaque_vt = new_vt();
    opaque_vt.push_renderable_local_scope(HashSet::from(["slotView".to_string()]));
    assert!(contains_opaque_renderable_expr(
        &opaque_vt,
        &parse_expr("((ok ? slotView : renderThing()) || fallback)", false),
    ));
}

#[test]
fn covers_helper_false_edges_plain_slot_branches_and_list_early_return() {
    let super_call = CallExpr {
        span: DUMMY_SP,
        ctxt: Default::default(),
        callee: Callee::Super(Super { span: DUMMY_SP }),
        args: vec![],
        type_args: None,
    };
    assert_eq!(call_callee_ident_name(&super_call), None);
    assert!(!map_call_returns_jsx_renderable(&super_call));
    assert!(!is_opaque_renderable_call_expr(&super_call));

    assert!(!arrow_returns_jsx_renderable(&parse_expr("() => { value; }", false)));
    assert!(!is_non_ref_member_expr(&parse_expr("value", false)));
    assert!(contains_jsx_in_expr(&parse_expr("<span />", true)));
    assert!(contains_jsx_in_expr(&parse_expr("left || <span />", true)));
    assert!(contains_jsx_in_expr(&parse_expr("left ?? <span />", true)));
    assert!(contains_jsx_in_expr(&parse_expr("ok && <span />", true)));

    assert!(!hook_wrapped_call_has_empty_memo_deps(&parse_call(
        "_$compiledWithHookId('memo', () => { return _$compiledMemo('memo', () => <span />, []); })",
        true,
    )));
    assert!(!hook_wrapped_call_has_empty_memo_deps(&parse_call(
        "_$compiledWithHookId('memo', () => value)",
        false,
    )));

    let mut vt = new_vt();
    assert!(rewrite_arrow_expr_body_for_slot(&mut vt, &parse_expr("value", false)).is_none());
    assert!(rewrite_arrow_expr_body_for_slot(&mut vt, &parse_expr("() => value", false)).is_none());
    assert!(
        rewrite_use_memo_call_for_slot(&mut vt, &parse_call("other(() => <span />)", true))
            .is_none()
    );
    assert!(rewrite_use_memo_call_for_slot(&mut vt, &parse_call("useMemo()", true)).is_none());
    assert!(
        rewrite_use_memo_call_for_slot(
            &mut vt,
            &parse_call("_$compiledMemo('memo', () => value)", false)
        )
        .is_none()
    );
    assert!(
        rewrite_hook_wrapped_call_for_slot(
            &mut vt,
            &parse_call("_$compiledWithHookId('memo')", false),
        )
        .is_none()
    );
    assert!(
        rewrite_map_call_for_slot(&mut vt, &parse_call("items.filter(item => <span />)", true))
            .is_none()
    );

    assert_eq!(
        compact(&emit_expr(make_expr_for_slot(&mut vt, &parse_expr("ok ? value : other", false)))),
        "ok?value:other;"
    );
    assert_eq!(
        compact(&emit_expr(make_expr_for_slot(&mut vt, &parse_expr("ok && value", false)))),
        "ok?value:\"\";"
    );
    assert_eq!(
        compact(&emit_expr(make_expr_for_slot(&mut vt, &parse_expr("left || right", false)))),
        "left||right;"
    );

    assert!(expr_is_renderable_local_alias_source(
        &parse_expr("ok ? null : slotView", false),
        &HashSet::from(["slotView".to_string()]),
    ));
    assert!(expr_is_renderable_local_alias_source(
        &parse_expr("null || slotView", false),
        &HashSet::from(["slotView".to_string()]),
    ));

    let mut opaque_vt = new_vt();
    opaque_vt.push_renderable_local_scope(HashSet::from(["slotView".to_string()]));
    assert!(contains_nested_opaque_renderable_expr(
        &opaque_vt,
        &parse_expr("ok ? null : slotView", false),
    ));
    assert!(contains_nested_opaque_renderable_expr(
        &opaque_vt,
        &parse_expr("null || slotView", false),
    ));
    assert!(contains_nested_opaque_renderable_expr(&opaque_vt, &parse_expr("(slotView)", false),));

    let mut list_vt = new_vt();
    list_vt.el_tag_by_ident.insert("root".to_string(), "div".to_string());
    let mut list_stmts = Vec::new();
    emit_element_expr_container_child(
        &mut list_vt,
        &ident("root"),
        &expr_container("items.map(item => <span>{item}</span>)", true),
        &mut list_stmts,
    );
    let list_out = compact(&emit_stmts(list_stmts));
    assert!(list_out.contains("_$reconcileKeyed"), "{list_out}");
    assert!(list_out.contains("_$mountCompiledKeyedRow"), "{list_out}");
}

#[test]
fn hardens_slot_rewrite_false_edges_for_hook_runners_and_nullish_logic() {
    let mut vt = new_vt();

    assert!(
        rewrite_hook_wrapped_call_for_slot(
            &mut vt,
            &parse_call("_$compiledWithHookId('memo', value)", false),
        )
        .is_none()
    );
    assert!(
        rewrite_hook_wrapped_call_for_slot(
            &mut vt,
            &parse_call("_$compiledWithHookId('memo', () => value)", false),
        )
        .is_none()
    );

    assert_eq!(
        compact(&emit_expr(make_expr_for_slot(&mut vt, &parse_expr("left ?? right", false)))),
        "left??right;"
    );
    let jsx_left = compact(&emit_expr(make_expr_for_slot(
        &mut vt,
        &parse_expr("(<span />) ?? fallback", true),
    )));
    assert!(
        jsx_left.contains("_$compiledRoot(Object.assign((__rue_parent_context)=>{"),
        "{jsx_left}"
    );
    assert!(jsx_left.contains("??fallback"), "{jsx_left}");

    let mut style_vt = new_vt();
    style_vt.el_tag_by_ident.insert("styleRoot".to_string(), "style".to_string());
    let mut style_stmts = Vec::new();
    emit_element_expr_container_child(
        &mut style_vt,
        &ident("styleRoot"),
        &expr_container("'body { color: red; }'", false),
        &mut style_stmts,
    );
    let style_out = compact(&emit_stmts(style_stmts));
    assert!(style_out.contains("_$settextContent(styleRoot,"), "{style_out}");
    assert!(style_out.contains("body{color:red;}"), "{style_out}");
}

#[test]
fn builds_compiled_branch_factories_only_for_closed_result_sets() {
    let mut vt = new_vt();
    let conditional =
        try_make_compiled_branch_expr(&mut vt, &parse_expr("true ? <span>yes</span> : null", true))
            .expect("static closed conditional should compile");
    let conditional_out = compact(&emit_expr(conditional));
    assert!(conditional_out.contains("_$compiledBranch(()=>{"), "{conditional_out}");
    assert!(
        conditional_out.contains("if(true)return{__rue_compiled_branch_key:true"),
        "{conditional_out}"
    );
    assert!(conditional_out.contains("_$createDocumentFragment()"), "{conditional_out}");

    let logical =
        try_make_compiled_branch_expr(&mut vt, &parse_expr("0 && <span>unreachable</span>", true))
            .expect("numeric logical falsy value should compile");
    let logical_out = compact(&emit_expr(logical));
    assert!(logical_out.contains("typeof__rue_branch_value===\"number\""), "{logical_out}");
    assert!(logical_out.contains("__rue_compiled_branch_key:true"), "{logical_out}");
    assert!(logical_out.contains("__rue_compiled_branch_key:false"), "{logical_out}");
    assert!(logical_out.contains("_$compiledCreateTextNode"), "{logical_out}");

    assert!(
        try_make_compiled_branch_expr(
            &mut vt,
            &parse_expr("true ? <span>safe</span> : renderNode()", true),
        )
        .is_none()
    );
}

#[test]
fn builds_one_literal_sibling_reader_with_an_explicit_empty_case() {
    let output = compact(&transform_module(
        r#"
import { ref } from '@rue-js/rue';
const tab = ref<'preview' | 'code' | 'unknown'>('preview');
export const View = () => (
  <div>
    {tab.value === 'code' && <span>code</span>}
    {tab.value === 'preview' && <span>preview</span>}
  </div>
);
"#,
    ));

    assert_eq!(output.matches("_$compiledBranchAt(").count(), 1, "{output}");
    assert_eq!(output.matches("const__rue_branch_value=tab.value").count(), 1, "{output}");
    assert!(output.contains("_$createDocumentFragment()"), "{output}");
}

#[test]
fn emits_renderable_expression_at_a_precomputed_anchor_without_creating_another_marker() {
    let mut vt = new_vt();
    let mut stmts = Vec::new();

    emit_element_expr_container_child_at(
        &mut vt,
        &ident("parent"),
        &ident("hole"),
        &expr_container("ok ? <span>shown</span> : null", true),
        &mut stmts,
    );
    let out = compact(&emit_stmts(stmts));

    assert!(out.contains("_$compiledBranchAt(parent,hole"), "{out}");
    assert!(!out.contains("_$createComment("), "{out}");
    assert!(!out.contains("_$appendChild(parent"), "{out}");
}

#[test]
fn emits_proven_reactive_text_as_compiled_text_binding() {
    let output = compact(&transform_module(
        r#"
import { ref, signal } from '@rue-js/rue';
const message = ref('hello');
const count = signal(1);
export const View = () => <p>{message.value}:{count.get()}</p>;
"#,
    ));

    assert!(output.contains("_$compiledRoot"), "{output}");
    assert_eq!(output.matches("_$compiledText(").count(), 2, "{output}");
    assert!(!output.contains("watchEffect"), "{output}");
    assert!(!output.contains("vapor("), "{output}");
}
