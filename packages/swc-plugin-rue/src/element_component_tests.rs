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

fn parse_expr(src: &str, tsx: bool) -> Expr {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("element-component-test.tsx".into()).into(),
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
    emitter.emit_program(&Program::Module(module)).expect("emit expr");
    String::from_utf8(buf).expect("utf8")
}

fn emit_expr(expr: Expr) -> String {
    emit_stmts(vec![Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(expr) })])
}

fn compact(src: &str) -> String {
    src.chars().filter(|ch| !ch.is_whitespace()).collect()
}

fn transform_component_module(src: &str) -> String {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("component-template-test.tsx".into()).into(),
        src.to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let program = Program::Module(parser.parse_module().expect("parse module"));
    let output = crate::apply(program);
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    emitter.emit_program(&output).expect("emit transformed module");
    String::from_utf8(buf).expect("utf8")
}

fn transform_component_module_with_static_props(src: &str) -> String {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("compiled-component-template-test.tsx".into()).into(),
        src.to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let program = Program::Module(parser.parse_module().expect("parse module"));
    let output = crate::run_full_transform_with_options(program, true, true, None);
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    emitter.emit_program(&output).expect("emit transformed module");
    String::from_utf8(buf).expect("utf8")
}

#[test]
fn compiles_multiple_children_to_one_closed_slot_factory() {
    let source = "const Child = props => <section>{props.children}</section>; export const View = () => <Child><i>one</i><b>two</b></Child>;";
    for code in
        [transform_component_module(source), transform_component_module_with_static_props(source)]
    {
        assert!(!code.contains("compiledValue"), "{code}");
        assert!(!code.contains("renderAnchor"), "{code}");
        assert_eq!(code.matches("_$mountCompiledSlotFactory(target, owner,").count(), 1, "{code}");
    }
}

#[test]
fn lowers_single_static_text_child_to_string_expr() {
    let mut vt = new_vt();
    let el = parse_jsx_element("<Box>hello</Box>");

    let lowered = lower_slot_value(&mut vt, &el.children).expect("lowered slot value");

    assert!(lowered.stmts.is_empty());
    assert!(!lowered.is_function);
    assert_eq!(compact(&emit_expr(lowered.expr)), "\"hello\";");
}

#[test]
fn lowers_single_expr_children_for_plain_jsx_call_and_empty_cases() {
    let mut plain_vt = new_vt();
    let plain = parse_jsx_element("<Box>{value}</Box>");
    let plain_lowered = lower_slot_value(&mut plain_vt, &plain.children).expect("plain lowered");

    assert!(plain_lowered.stmts.is_empty());
    assert!(!plain_lowered.is_function);
    assert_eq!(compact(&emit_expr(plain_lowered.expr)), "value;");

    let mut call_vt = new_vt();
    let call = parse_jsx_element("<Box>{_$compiledMemo('memo', () => <span />, [])}</Box>");
    let call_lowered = lower_slot_value(&mut call_vt, &call.children).expect("call lowered");
    let call_out = compact(&emit_expr(call_lowered.expr));

    assert!(call_lowered.stmts.is_empty());
    assert!(!call_lowered.is_function);
    assert!(call_out.contains("_$compiledMemo('memo',()=>_$compiledRoot(()=>{"));
    assert!(call_out.contains("_$createElement(\"span\",_root)"));

    let mut empty_vt = new_vt();
    let empty = parse_jsx_element("<Box>{null}</Box>");
    assert!(lower_slot_value(&mut empty_vt, &empty.children).is_none());

    let mut empty_text_vt = new_vt();
    let empty_text = parse_jsx_element("<Box>   </Box>");
    assert!(lower_slot_value(&mut empty_text_vt, &empty_text.children).is_none());

    let mut spread_vt = new_vt();
    let spread_child = parse_jsx_element("<Box>{...items}</Box>");
    let spread_lowered =
        lower_slot_value(&mut spread_vt, &spread_child.children).expect("spread child lowered");
    assert!(!compact(&emit_expr(spread_lowered.expr)).is_empty());
}

#[test]
fn falls_back_for_single_children_that_cannot_lower_directly() {
    let mut ws_vt = new_vt();
    let whitespace_text = parse_jsx_element("<Box>   </Box>");
    assert!(lower_slot_value(&mut ws_vt, &whitespace_text.children).is_none());

    let mut mixed_jsx_expr_vt = new_vt();
    let mixed_jsx_expr = parse_jsx_element("<Box>{ok ? <A /> : <B />}</Box>");
    let lowered =
        lower_slot_value(&mut mixed_jsx_expr_vt, &mixed_jsx_expr.children).expect("fallback slot");
    let lowered_stmts = compact(&emit_stmts(lowered.stmts));
    let lowered_expr = compact(&emit_expr(lowered.expr));

    assert!(lowered_stmts.contains("_$compiledRoot(()=>{"), "{lowered_stmts}");
    assert!(lowered_stmts.contains("_$createDocumentFragment()"), "{lowered_stmts}");
    assert!(lowered_expr.contains("__child"), "{lowered_expr}");
    assert!(!lowered.is_function);
}

#[test]
fn preserves_multiple_component_children_as_individually_reorderable_values() {
    let mut vt = new_vt();
    let host = parse_jsx_element("<Box><span>A</span><span>B</span><span>C</span></Box>");
    let lowered = lower_slot_value(&mut vt, &host.children).expect("multiple children");
    let stmts = compact(&emit_stmts(lowered.stmts));
    let expr = compact(&emit_expr(lowered.expr));

    assert!(!stmts.contains("vapor("), "{stmts}");
    assert_eq!(expr.matches("_$compiledRoot(").count(), 3, "{expr}");
    assert!(!expr.contains("vapor("), "{expr}");
}

#[test]
fn localizes_multi_child_vapor_fallback_without_wrapping_safe_siblings() {
    let mut vt = new_vt();
    let host = parse_jsx_element(
        "<Box><span>before</span>{ok ? <OpaqueA /> : <OpaqueB />}<strong>after</strong></Box>",
    );
    let lowered = lower_slot_value(&mut vt, &host.children).expect("mixed children");
    let stmts = compact(&emit_stmts(lowered.stmts));
    let expr = compact(&emit_expr(lowered.expr));

    assert_eq!(stmts.matches("_$compiledRoot(()=>{").count(), 1, "{stmts}");
    assert_eq!(stmts.matches("_$createDocumentFragment()").count(), 1, "{stmts}");
    assert_eq!(expr.matches("_$compiledRoot(").count(), 2, "{expr}");
    assert_eq!(expr.matches("__child").count(), 1, "{expr}");

    let before = expr
        .find("_$compiledRoot(")
        .unwrap_or_else(|| panic!("safe child before fallback: {expr}"));
    let fallback = expr.find("__child").expect("localized fallback");
    let after = expr.rfind("_$compiledRoot(").expect("safe child after fallback");
    assert!(before < fallback && fallback < after, "{expr}");

    let named = compact(&transform_component_module(
        r#"import Box from './Box'; const View = () => <Box><Template slot="header"><span>head</span></Template></Box>;"#,
    ));
    assert!(named.contains("__rue_slots:{\"header\":"), "{named}");

    let scoped = compact(&transform_component_module(
        r#"import Box from './Box'; const View = () => <Box>{(scope) => <span>{scope.label}</span>}</Box>;"#,
    ));
    assert!(scoped.contains("__rue_slots:{\"default\":"), "{scoped}");
}

#[test]
fn uses_closed_ranges_for_branch_and_opaque_slot_setups() {
    let mut compiled_vt = new_vt();
    compiled_vt.static_templates = false;
    let compiled_host =
        parse_jsx_element("<Box>{ok ? <span>yes</span> : <strong>no</strong>}</Box>");
    let compiled_lowered =
        lower_slot_value(&mut compiled_vt, &compiled_host.children).expect("compiled branch");
    let compiled = compact(&format!(
        "{}{}",
        emit_stmts(compiled_lowered.stmts),
        emit_expr(compiled_lowered.expr)
    ));
    assert!(compiled.contains("return[_root,_root]"), "{compiled}");
    assert!(compiled.contains("return[_root,_root]"), "{compiled}");

    let opaque = compact(&transform_component_module(
        "import {Box,OpaqueA,OpaqueB} from './components'; const View = () => <Box>{ok ? <OpaqueA /> : <OpaqueB />}</Box>;",
    ));
    assert!(opaque.contains("_$compiledComponent(OpaqueA"), "{opaque}");
    assert!(opaque.contains("_$compiledComponent(OpaqueB"), "{opaque}");
}

#[test]
fn lowers_safe_native_component_children_without_vapor_wrappers() {
    let output = compact(&transform_component_module(
        r#"
        import { ref } from '@rue-js/rue'
        import Box from './Box'
        const Demo = () => {
          const active = ref(false)
          return <Box><h1>Demo</h1><div role="tablist"><button className={`tab ${active.value ? 'on' : ''}`} onClick={() => active.value = true}>效果</button></div></Box>
        }
        "#,
    ));

    assert!(output.contains("children:(target,slotProps,owner)=>{"), "{output}");
    assert!(output.contains("target==null?__slot"), "{output}");
    assert!(output.contains("_$mountCompiledSlotFactory("), "{output}");
    assert!(output.contains("_$compiledRoot("), "{output}");
    assert!(output.contains("_$template(\"<h1>Demo</h1>\")"), "{output}");
    assert!(output.contains(".content.cloneNode(true)"), "{output}");
    assert!(output.contains("effect(()=>{"), "{output}");
    assert!(
        output.contains("onOwnerCleanup(_$compiledDelegateEvent(__rue_parent_context,"),
        "{output}"
    );
    assert!(output.contains(",\"click\",()=>()=>active.value=true)"), "{output}");
    assert!(!output.contains(".addEventListener("), "{output}");
    assert!(
        !output.contains("const__child1=_$compiledRoot(")
            && !output.contains("children:_$compiledRoot("),
        "{output}"
    );
}

#[test]
fn keeps_static_opaque_components_inside_compiled_slot_branches_without_vapor() {
    let output = compact(&transform_component_module(
        r#"
        import { ref } from '@rue-js/rue'
        import Box from './Box'
        import Code from './Code'
        const Demo = () => {
          const active = ref(false)
          return <Box><h1>Demo</h1><div>{active.value && <section><Code lang="tsx" code={`demo`} /></section>}</div></Box>
        }
        "#,
    ));

    assert!(output.contains("_$compiledBranchAt("), "{output}");
    assert!(output.contains("_$mountCompiledComponent("), "{output}");
    assert!(
        output.contains("_$mountCompiledComponent(_root,Code,()=>({lang:\"tsx\",code:`demo`}))"),
        "{output}"
    );
    assert!(!output.contains("vapor("), "{output}");
}

#[test]
fn rewrites_slot_carrier_wrapper_and_fragment_children_stably() {
    let mut slot_vt = new_vt();
    let mut slot_host =
        parse_jsx_element("<Box><Template slot=\"header\"><span>head</span></Template></Box>");
    let slot_rewrite = rewrite_component_children_to_props(&mut slot_vt, &mut slot_host);
    let slot_stmts = compact(&emit_stmts(slot_rewrite.stmts.clone()));
    let slot_mount = compact(&emit_expr(build_component_mount_expr(&slot_host)));

    assert!(slot_host.children.is_empty());
    assert!(slot_host.opening.self_closing);
    assert!(slot_rewrite.direct_render_expr.is_none());
    assert!(slot_stmts.contains("const__child1=_$compiledRoot(()=>{"));
    assert!(slot_stmts.contains("_$createElement(\"span\",_root)"));
    assert!(!slot_stmts.contains("Template"));
    assert!(slot_mount.contains("__rue_slots:{\"header\":__child1}"));
    assert!(!slot_mount.contains("Template"));

    let mut fragment_vt = new_vt();
    let mut fragment_host = parse_jsx_element("<Fragment><span>body</span></Fragment>");
    let fragment_rewrite =
        rewrite_component_children_to_props(&mut fragment_vt, &mut fragment_host);
    let fragment_stmts = compact(&emit_stmts(fragment_rewrite.stmts.clone()));
    let fragment_direct = compact(&emit_expr(
        fragment_rewrite.direct_render_expr.clone().expect("fragment direct render expr"),
    ));

    assert!(fragment_host.children.is_empty());
    assert!(fragment_host.opening.self_closing);
    assert!(fragment_stmts.contains("const__child1=_$compiledRoot(()=>{"));
    assert!(fragment_stmts.contains("_$createElement(\"span\",_root)"));
    assert_eq!(fragment_direct, "__child1;");
}

#[test]
fn named_slot_static_native_child_keeps_lazy_slot_carrier_and_clones_template() {
    let output = transform_component_module(
        r#"
import SidebarPlayground from './SidebarPlayground';
const View = () => <SidebarPlayground><Template slot="sidebar"><aside><strong>Tools</strong></aside></Template></SidebarPlayground>;
"#,
    );
    let compact = compact(&output);

    assert!(compact.contains("const_$getTemplate1=_$template("), "{output}");
    assert!(compact.contains("<aside><strong>Tools</strong></aside>"), "{output}");
    assert_eq!(compact.matches(".content.cloneNode(true)").count(), 1, "{output}");
    assert!(compact.contains("__rue_slots:{\"sidebar\":(target,slotProps,owner)=>{"), "{output}");
    assert!(compact.contains("target==null?__slot"), "{output}");
    assert!(compact.contains("_$mountCompiledSlotFactory("), "{output}");
    assert!(!compact.contains("_$createElement(\"aside\""), "{output}");
    assert!(!compact.contains("_$createComponent(Template"), "{output}");
}

#[test]
fn builds_direct_render_and_dynamic_component_anchor_paths() {
    let mut fragment_vt = new_vt();
    let fragment = parse_jsx_element("<Fragment><span>body</span></Fragment>");
    let mut fragment_stmts = Vec::new();

    build_component_element(
        &mut fragment_vt,
        &fragment,
        &crate::emit::ident("root"),
        &mut fragment_stmts,
    );

    let fragment_out = compact(&emit_stmts(fragment_stmts));

    assert!(fragment_out.contains("_$createComment(\"rue:component:anchor\")"));
    assert!(fragment_out.contains("const__child1=_$compiledRoot(()=>{"));
    assert!(fragment_out.contains("_$mountCompiledSlotAt({parent:root,before:_list1}"));
    assert!(!fragment_out.contains("renderAnchor"));
    assert!(!fragment_out.contains("_$createComponent(Fragment"));

    let mut component_vt = new_vt();
    let component = parse_jsx_element("<Box title={title} />");
    let mut component_stmts = Vec::new();

    build_component_element(
        &mut component_vt,
        &component,
        &crate::emit::ident("root"),
        &mut component_stmts,
    );

    let component_out = compact(&emit_stmts(component_stmts));

    assert!(component_out.contains("_$createComment(\"rue:component:anchor\")"));
    assert!(component_out.contains("_$mountCompiledSlotAt({parent:root,before:_list1}"));
    assert!(component_out.contains("_$createComponent(Box,()=>({title:title}))"));
    assert!(!component_out.contains("renderAnchor"));
}

#[test]
fn mounts_component_at_explicit_anchor() {
    let mut vt = new_vt();
    let component = parse_jsx_element("<Box title={title} />");
    let mut stmts = Vec::new();

    build_component_element_at(
        &mut vt,
        &component,
        &crate::emit::ident("root"),
        &crate::emit::ident("anchor"),
        &mut stmts,
    );

    let output = compact(&emit_stmts(stmts));
    assert!(output.contains("_$mountCompiledSlotAt({parent:root,before:anchor}"), "{output}");
    assert!(!output.contains("renderAnchor"), "{output}");
}

#[test]
fn mounts_proven_local_compiled_component_through_direct_slot_abi() {
    let output = compact(&transform_component_module_with_static_props(
        r#"
        import { type FC } from '@rue-js/rue';
        const Code: FC<{ code: string }> = props => <strong>{props.code}</strong>;
        export const Page: FC<{ code: string }> = props => <section><Code code={props.code} /></section>;
        "#,
    ));

    assert!(output.contains("_$mountCompiledSlotAt({parent:"), "{output}");
    assert!(output.contains("_$mountCompiledSlotFactory(target,owner,"), "{output}");
    assert!(output.contains("_$compiledComponent(Code,()=>({code:"), "{output}");
    let page_output = output.split("exportconstPage").nth(1).expect("compiled Page output");
    assert!(!page_output.contains("renderAnchor("), "{output}");
}

#[test]
fn mounts_member_components_through_the_compiled_component_abi() {
    let output = compact(&transform_component_module_with_static_props(
        r#"
        import { Accordion } from '@rue-js/design';
        export const Page = () => (
          <Accordion>
            <Accordion.Title className="font-semibold">Title</Accordion.Title>
            <Accordion.Content>Content</Accordion.Content>
          </Accordion>
        );
        "#,
    ));

    assert!(output.contains("_$mountCompiledComponent(_root,Accordion.Title,"), "{output}");
    assert!(output.contains("_$mountCompiledComponent(_root,Accordion.Content,"), "{output}");
    assert!(!output.contains("_$createComponent(Accordion.Title"), "{output}");
}

#[test]
fn mounts_object_assign_compound_components_through_the_compiled_component_abi() {
    let output = compact(&transform_component_module_with_static_props(
        r#"
        const Root = props => <section>{props.children}</section>;
        const Content = props => <strong>{props.children}</strong>;
        const Typography = Object.assign(Root, { Content });
        export const Page = () => (
          <Typography>
            <Typography.Content>Content</Typography.Content>
          </Typography>
        );
        "#,
    ));

    assert!(output.contains("_$compiledComponent(Typography,"), "{output}");
    assert!(output.contains("_$mountCompiledComponent(_root,Typography.Content,"), "{output}");
    assert!(!output.contains("renderAnchor("), "{output}");
}

#[test]
fn component_jsx_uses_the_compiled_component_helper_without_h() {
    let component = parse_jsx_element("<Panel title={title} />");
    let output = compact(&emit_expr(build_component_mount_expr(&component)));

    assert!(output.contains("_$createComponent(Panel,()=>({title:title}))"), "{output}");
    assert!(!output.contains("h("), "{output}");
}

#[test]
fn compiles_dynamic_native_component_without_a_registry() {
    let element = parse_jsx_element("<Component is={resolveComponent()} />");
    let mut vt = new_vt();
    let output = compact(&emit_expr(
        build_compiled_dynamic_component_expr(&mut vt, &element).expect("dynamic component"),
    ));

    assert!(output.contains("_$createDynamicElement(resolveComponent(),"), "{output}");
    assert!(output.contains("__rue_compiled_branch_key:resolveComponent()"), "{output}");
}

#[test]
fn builds_mount_expr_with_slot_source_event_props_and_string_props() {
    let slot =
        parse_jsx_element("<Slot foo-bar=\"baz\" enabled handleClick={onClick} {...rest} />");

    let out = compact(&emit_expr(build_component_mount_expr(&slot)));

    assert!(out.starts_with("_$createComponent(Slot,"));
    assert!(out.contains("\"foo-bar\":\"baz\""));
    assert!(out.contains("enabled:true"));
    assert!(out.contains("...rest"));
    assert!(out.contains("source:getCurrentInstance()&&getCurrentInstance().propsRO"));
    assert!(out.contains("handleClick:onClick"));

    let namespaced =
        parse_jsx_element("<Box foo:bar=\"dropped\" onUpdateModelValue={update} normal />");
    let namespaced_out = compact(&emit_expr(build_component_mount_expr(&namespaced)));

    assert!(!namespaced_out.contains("foo:bar"));
    assert!(namespaced_out.contains("onUpdateModelValue:update"));
    assert!(namespaced_out.contains("normal:true"));
}

#[test]
fn rewrites_named_slot_expression_branches_and_default_function_slot_bag() {
    let mut vt = new_vt();
    let mut host = parse_jsx_element(
        "<Box>{(props) => <span>{props.msg}</span>}{ok ? <Template slot=\"header\"><h1>H</h1></Template> : null}{empty ? null : <span slot={dynamicName}>Tail</span>}{ready && <span slot=\"footer\">F</span>}</Box>",
    );

    let rewrite = rewrite_component_children_to_props(&mut vt, &mut host);
    let stmts = compact(&emit_stmts(rewrite.stmts));
    let mount = compact(&emit_expr(build_component_mount_expr(&host)));

    assert!(stmts.contains("const__child1=_$compiledRoot(()=>{"));
    assert!(stmts.contains("const__child2=_$compiledRoot(()=>{"));
    assert!(stmts.contains("const__child3=_$compiledRoot(()=>{"));
    assert!(host.children.is_empty());
    assert!(host.opening.self_closing);
    assert!(mount.contains("__rue_slots:{"));
    assert!(mount.contains("\"default\":(props)=><span>{props.msg}</span>"));
    assert!(mount.contains("\"header\":ok?__child1:undefined"));
    assert!(mount.contains("[dynamicName]:empty?undefined:__child2"));
    assert!(mount.contains("\"footer\":ready?__child3:undefined"));
    assert!(!mount.contains("slot:"));

    let mut default_cond_vt = new_vt();
    let default_cond = parse_jsx_element("<Box>{empty ? null : <span>Tail</span>}</Box>");
    let lowered =
        lower_slot_value(&mut default_cond_vt, &default_cond.children).expect("default cond");
    let lowered_out = compact(&emit_expr(lowered.expr));
    assert!(lowered_out.contains("empty?undefined:"));

    let mut failed_named_vt = new_vt();
    assert!(
        lower_named_slot_expr(
            &mut failed_named_vt,
            &parse_expr("ok ? value : <span slot=\"header\">H</span>", true),
        )
        .is_none()
    );

    let mut empty_carrier_vt = new_vt();
    assert!(
        lower_named_slot_expr(
            &mut empty_carrier_vt,
            &parse_expr("<Template slot=\"header\">{null}</Template>", true),
        )
        .is_none()
    );

    let mut rejected_slot_vt = new_vt();
    assert!(
        lower_expr_slot_value(
            &mut rejected_slot_vt,
            &parse_expr("ready ? value : <span>Fallback</span>", true),
        )
        .is_none()
    );

    let mut rejected_named_vt = new_vt();
    assert!(
        lower_named_slot_expr(
            &mut rejected_named_vt,
            &parse_expr("ready ? value : <span slot=\"header\">Fallback</span>", true),
        )
        .is_none()
    );

    let mut mixed_child_vt = new_vt();
    let mixed_child = parse_jsx_element("<Box>{ready ? value : <span>Fallback</span>}</Box>");
    let mixed_lowered =
        lower_slot_value(&mut mixed_child_vt, &mixed_child.children).expect("mixed child");
    assert!(
        compact(&emit_stmts(mixed_lowered.stmts))
            .contains("_$compiledRoot((__rue_parent_context)=>{")
    );
    assert!(!mixed_lowered.is_function);
}

#[test]
fn rewrites_transition_group_children_maps_keys_and_nested_returns() {
    let mut vt = new_vt();
    let mut host = parse_jsx_element(
        r#"<TransitionGroup>{items.map(item => <li key={item.id}>{String(item.name)}</li>)}</TransitionGroup>"#,
    );
    let rewrite = rewrite_component_children_to_props(&mut vt, &mut host);
    let mount = compact(&emit_expr(rewrite.direct_render_expr.expect("dedicated primitive")));
    assert!(rewrite.stmts.is_empty());
    assert!(mount.contains("_$transitionGroup("), "{mount}");
    assert!(mount.contains("_$reconcileKeyed"), "{mount}");
    assert!(mount.contains("_$mountCompiledSlotFactory"), "{mount}");
    assert!(!mount.contains("_$createComponent"), "{mount}");
    assert!(!mount.contains("__rueTransitionChildFactory"), "{mount}");
}

#[test]
fn rewrites_transition_children_with_keys_for_mode_switches() {
    let mut vt = new_vt();
    let mut host = parse_jsx_element(
        r#"<Transition mode="out-in"><div key={view.value}>{String(view.value)}</div></Transition>"#,
    );
    let rewrite = rewrite_component_children_to_props(&mut vt, &mut host);
    let mount = compact(&emit_expr(rewrite.direct_render_expr.expect("dedicated primitive")));
    assert!(rewrite.stmts.is_empty());
    assert!(mount.contains("_$transition("), "{mount}");
    assert!(mount.contains("childKey:view.value"), "{mount}");
    assert!(mount.contains("_$mountCompiledSlotFactory"), "{mount}");
    assert!(!mount.contains("_$createComponent"), "{mount}");
    assert!(!mount.contains("__rueTransitionChildFactory"), "{mount}");
}

#[test]
fn rewrites_transition_conditional_children_factory_with_branch_keys() {
    let mut vt = new_vt();
    let mut host = parse_jsx_element(
        r#"<Transition mode={mode}>{ok ? <section>A</section> : <section>B</section>}</Transition>"#,
    );
    let rewrite = rewrite_component_children_to_props(&mut vt, &mut host);
    let mount = compact(&emit_expr(rewrite.direct_render_expr.expect("dedicated primitive")));
    assert!(rewrite.stmts.is_empty());
    assert!(mount.contains("_$transition("), "{mount}");
    assert!(mount.contains("children:ok?"), "{mount}");
    assert!(mount.contains("_$mountCompiledSlotFactory"), "{mount}");
    assert!(!mount.contains("_$createComponent"), "{mount}");
    assert!(!mount.contains("__rueTransitionChildFactory"), "{mount}");
}

#[test]
fn keeps_transition_group_on_children_prop_instead_of_transition_factory() {
    let mut vt = new_vt();
    let mut host =
        parse_jsx_element(r#"<TransitionGroup><li>A</li>{ready && <li>B</li>}</TransitionGroup>"#);
    let rewrite = rewrite_component_children_to_props(&mut vt, &mut host);
    let mount = compact(&emit_expr(rewrite.direct_render_expr.expect("dedicated primitive")));
    assert!(rewrite.stmts.is_empty());
    assert!(mount.contains("_$transitionGroup("), "{mount}");
    assert!(mount.contains("children:(target,slotProps,owner)=>"), "{mount}");
    assert!(mount.contains("_$mountCompiledSlotFactory"), "{mount}");
    assert!(!mount.contains("_$createComponent"), "{mount}");
    assert!(!mount.contains("__rueTransitionChildFactory"), "{mount}");
}

#[test]
fn lowers_component_and_expression_slot_values_recursively() {
    let mut component_vt = new_vt();
    let single_component =
        parse_jsx_element("<Box><Child title={title}><span>body</span></Child></Box>");
    let lowered_component =
        lower_slot_value(&mut component_vt, &single_component.children).expect("component slot");
    let component_stmts = compact(&emit_stmts(lowered_component.stmts));
    let component_expr = compact(&emit_expr(lowered_component.expr));

    assert!(component_stmts.contains("const__child1=_$compiledRoot(()=>{"));
    assert!(component_stmts.contains("const__child2=_$createComponent(Child"));
    assert!(component_stmts.contains("children:__child1"));
    assert_eq!(component_expr, "__child2;");

    let mut expr_vt = new_vt();
    let expr_element = parse_jsx_element("<Box>{<span>{msg}</span>}</Box>");
    let lowered_expr =
        lower_slot_value(&mut expr_vt, &expr_element.children).expect("jsx expr slot");
    assert!(
        compact(&emit_stmts(lowered_expr.stmts)).contains("const__child1=_$compiledRoot(()=>{")
    );
    assert_eq!(compact(&emit_expr(lowered_expr.expr)), "__child1;");

    let cond_cons = parse_expr("ok ? <span /> : null", true);
    let lowered_cond_cons =
        lower_expr_slot_value(&mut expr_vt, &cond_cons).expect("conditional cons slot");
    assert!(
        compact(&emit_stmts(lowered_cond_cons.stmts))
            .contains("_$compiledRoot((__rue_parent_context)=>{")
    );
    let cond_cons_out = compact(&emit_expr(lowered_cond_cons.expr));
    assert!(cond_cons_out.contains("ok?__child"));
    assert!(cond_cons_out.contains(":undefined"));

    let cond_alt = parse_expr("ok ? null : <span />", true);
    let lowered_cond_alt =
        lower_expr_slot_value(&mut expr_vt, &cond_alt).expect("conditional alt slot");
    assert!(
        compact(&emit_stmts(lowered_cond_alt.stmts))
            .contains("_$compiledRoot((__rue_parent_context)=>{")
    );
    assert!(compact(&emit_expr(lowered_cond_alt.expr)).contains("ok?undefined:__child"));

    let logical = parse_expr("ready && <span />", true);
    let lowered_logical = lower_expr_slot_value(&mut expr_vt, &logical).expect("logical slot");
    assert!(
        compact(&emit_stmts(lowered_logical.stmts))
            .contains("_$compiledRoot((__rue_parent_context)=>{")
    );
    assert!(compact(&emit_expr(lowered_logical.expr)).contains("ready?__child"));

    assert!(lower_expr_slot_value(&mut expr_vt, &parse_expr("ok ? <A /> : <B />", true)).is_none());
}

#[test]
fn supports_member_component_names_template_members_and_jsx_attr_values() {
    let mut member_slot_vt = new_vt();
    let mut host =
        parse_jsx_element("<Box><UI.Template slot=\"side\"><span>Side</span></UI.Template></Box>");
    let rewrite = rewrite_component_children_to_props(&mut member_slot_vt, &mut host);
    let member_slot_mount = compact(&emit_expr(build_component_mount_expr(&host)));

    assert!(!rewrite.stmts.is_empty());
    assert!(member_slot_mount.contains("__rue_slots:{\"side\":__child1}"));
    assert!(!member_slot_mount.contains("UI.Template"));

    let member_component =
        parse_jsx_element("<UI.Panel render={<span />} fallback={<></>} foo-bar=\"x\" />");
    let member_mount = compact(&emit_expr(build_component_mount_expr(&member_component)));

    assert!(member_mount.contains("_$createComponent(UI.Panel,()=>({"));
    assert!(member_mount.contains("render:<span/>"));
    assert!(member_mount.contains("fallback:<></>"));
    assert!(member_mount.contains("\"foo-bar\":\"x\""));

    let namespaced = parse_expr("<ns:Panel />", true);
    let Expr::JSXElement(namespaced_el) = namespaced else {
        panic!("expected namespaced element");
    };
    assert!(jsx_name_to_expr(&namespaced_el.opening.name).is_none());
    assert!(
        compact(&emit_expr(build_component_mount_expr(&namespaced_el)))
            .contains("_$createComponent(\"div\",()=>({}))")
    );
}

#[test]
fn covers_additional_component_slot_and_transition_group_edges() {
    let nested_member = parse_jsx_element("<UI.Kit.Panel title=\"ok\" />");
    let nested_member_out = compact(&emit_expr(build_component_mount_expr(&nested_member)));
    assert!(nested_member_out.contains("_$createComponent(UI.Kit.Panel,()=>({title:\"ok\"}))"));

    let namespaced_slot = parse_jsx_element("<ns:Slot />");
    assert!(!is_slot_component(&namespaced_slot));
    assert!(!is_template_component(&namespaced_slot));

    let mut fragment_expr_vt = new_vt();
    let fragment_expr_host = parse_jsx_element("<Box>{<>frag</>}</Box>");
    let fragment_lowered = lower_slot_value(&mut fragment_expr_vt, &fragment_expr_host.children)
        .expect("fragment expr");
    assert!(
        compact(&emit_stmts(fragment_lowered.stmts)).contains("const__child1=_$compiledRoot(()=>{")
    );
    assert_eq!(compact(&emit_expr(fragment_lowered.expr)), "__child1;");

    let mut literal_vt = new_vt();
    let string_host = parse_jsx_element("<Box>{\"hello\"}</Box>");
    let string_lowered = lower_slot_value(&mut literal_vt, &string_host.children).expect("string");
    assert_eq!(compact(&emit_expr(string_lowered.expr)), "\"hello\";");

    let number_host = parse_jsx_element("<Box>{42}</Box>");
    let number_lowered = lower_slot_value(&mut literal_vt, &number_host.children).expect("number");
    assert_eq!(compact(&emit_expr(number_lowered.expr)), "42;");

    let mut empty_group_vt = new_vt();
    let empty_group = parse_jsx_element("<TransitionGroup>{}{...ignored}</TransitionGroup>");
    assert!(
        build_transition_group_children_expr(&mut empty_group_vt, &empty_group.children).is_none()
    );

    let mut group_vt = new_vt();
    let mut group = parse_jsx_element("<TransitionGroup>lead<li>A</li></TransitionGroup>");
    let rewrite = rewrite_component_children_to_props(&mut group_vt, &mut group);
    let mount = compact(&emit_expr(rewrite.direct_render_expr.unwrap()));
    assert!(mount.contains("_$transitionGroup("), "{mount}");
    assert!(mount.contains("children:(target,slotProps,owner)=>"), "{mount}");
    assert!(mount.contains("lead"), "{mount}");
}

#[test]
fn covers_component_helper_false_edges_and_direct_named_slots() {
    let Expr::JSXElement(attr_el) = parse_expr("<span />", true) else {
        panic!("expected jsx element");
    };
    assert!(matches!(
        jsx_attr_value_to_expr(&JSXAttrValue::JSXElement(attr_el)),
        Some(Expr::JSXElement(_))
    ));
    let Expr::JSXFragment(attr_frag) = parse_expr("<></>", true) else {
        panic!("expected jsx fragment");
    };
    assert!(matches!(
        jsx_attr_value_to_expr(&JSXAttrValue::JSXFragment(attr_frag)),
        Some(Expr::JSXFragment(_))
    ));

    let mut empty_attr_el = parse_jsx_element("<Box value={value} />");
    let JSXAttrOrSpread::JSXAttr(first_attr) = &mut empty_attr_el.opening.attrs[0] else {
        panic!("expected attr");
    };
    first_attr.value = Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
        span: DUMMY_SP,
        expr: JSXExpr::JSXEmptyExpr(JSXEmptyExpr { span: DUMMY_SP }),
    }));
    assert!(first_attr.value.as_ref().and_then(jsx_attr_value_to_expr).is_none());

    assert!(!is_safe_prop_ident(""));
    assert!(
        extract_slot_name_expr(
            &parse_jsx_element("<Box {...props} data:x=\"y\" title=\"t\" />").opening.attrs
        )
        .is_none()
    );
    assert!(!is_substantive_slot_child(&JSXElementChild::JSXExprContainer(JSXExprContainer {
        span: DUMMY_SP,
        expr: JSXExpr::JSXEmptyExpr(JSXEmptyExpr { span: DUMMY_SP }),
    })));

    let mut complex_expr_vt = new_vt();
    let complex_expr_host = parse_jsx_element("<Box>{ok ? <A /> : <B />}</Box>");
    let complex_lowered =
        lower_slot_value(&mut complex_expr_vt, &complex_expr_host.children).expect("complex slot");
    let complex_stmts = compact(&emit_stmts(complex_lowered.stmts));
    assert!(complex_stmts.contains("_$compiledRoot(()=>{"), "{complex_stmts}");

    let mut named_vt = new_vt();
    assert!(
        lower_named_slot_expr(
            &mut named_vt,
            &parse_expr("ok ? <span slot=\"a\" /> : <span slot=\"b\" />", true),
        )
        .is_none()
    );

    let mut direct_slot_vt = new_vt();
    let mut direct_slot_host = parse_jsx_element("<Box><span slot=\"label\">Label</span></Box>");
    let direct_slot_rewrite =
        rewrite_component_children_to_props(&mut direct_slot_vt, &mut direct_slot_host);
    let direct_slot_mount = compact(&emit_expr(build_component_mount_expr(&direct_slot_host)));
    assert!(
        compact(&emit_stmts(direct_slot_rewrite.stmts))
            .contains("const__child1=_$compiledRoot(()=>{")
    );
    assert!(direct_slot_mount.contains("__rue_slots:{\"label\":__child1}"));

    let mut text_default_vt = new_vt();
    let mut text_default_host = parse_jsx_element("<Box>plain</Box>");
    let text_default_rewrite =
        rewrite_component_children_to_props(&mut text_default_vt, &mut text_default_host);
    assert!(text_default_rewrite.stmts.is_empty());
    assert!(
        compact(&emit_expr(build_component_mount_expr(&text_default_host)))
            .contains("children:\"plain\"")
    );

    assert!(extract_jsx_key_expr(&parse_jsx_element("<li id=\"x\" />")).is_none());
    assert!(extract_jsx_key_expr(&parse_jsx_element("<li key />")).is_none());
    let mut empty_key = parse_jsx_element("<li key={value} />");
    let JSXAttrOrSpread::JSXAttr(key_attr) = &mut empty_key.opening.attrs[0] else {
        panic!("expected key attr");
    };
    key_attr.value = Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
        span: DUMMY_SP,
        expr: JSXExpr::JSXEmptyExpr(JSXEmptyExpr { span: DUMMY_SP }),
    }));
    assert!(extract_jsx_key_expr(&empty_key).is_none());

    let mut jsx_value_key = parse_jsx_element("<li />");
    let Expr::JSXElement(key_value_el) = parse_expr("<span />", true) else {
        panic!("expected jsx value element");
    };
    jsx_value_key.opening.attrs.push(JSXAttrOrSpread::JSXAttr(JSXAttr {
        span: DUMMY_SP,
        name: JSXAttrName::Ident(ident_name("key")),
        value: Some(JSXAttrValue::JSXElement(key_value_el)),
    }));
    assert!(extract_jsx_key_expr(&jsx_value_key).is_none());

    let mut empty_expr_key = parse_jsx_element("<li key={id} />");
    let JSXAttrOrSpread::JSXAttr(attr) = &mut empty_expr_key.opening.attrs[0] else {
        panic!("expected key attr");
    };
    attr.value = Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
        span: DUMMY_SP,
        expr: JSXExpr::JSXEmptyExpr(JSXEmptyExpr { span: DUMMY_SP }),
    }));
    assert!(extract_jsx_key_expr(&empty_expr_key).is_none());

    let mut tg_vt = new_vt();
    assert_eq!(
        compact(&emit_expr(rewrite_transition_group_render_expr(
            &mut tg_vt,
            &parse_expr("value", false)
        ))),
        "value;"
    );
    let super_call = CallExpr {
        span: DUMMY_SP,
        ctxt: Default::default(),
        callee: Callee::Super(Super { span: DUMMY_SP }),
        args: vec![],
        type_args: None,
    };
    assert!(rewrite_transition_group_map_expr(&mut tg_vt, &super_call).is_none());
    let direct_map_render = rewrite_transition_group_render_expr(
        &mut tg_vt,
        &parse_expr("items.map(item => <li key={item.id}>{item.name}</li>)", true),
    );
    let direct_map_out = compact(&emit_expr(direct_map_render));
    assert!(direct_map_out.contains("items.map((item)=>_$compiledWithKey"));
    assert!(direct_map_out.contains("item.id"));
    assert!(
        rewrite_transition_group_map_expr(
            &mut tg_vt,
            &match parse_expr("items.filter(item => <li />)", true) {
                Expr::Call(call) => call,
                other => panic!("expected call, got {other:?}"),
            },
        )
        .is_none()
    );
    assert!(
        rewrite_transition_group_map_expr(
            &mut tg_vt,
            &match parse_expr("items['map'](item => <li />)", true) {
                Expr::Call(call) => call,
                other => panic!("expected call, got {other:?}"),
            },
        )
        .is_none()
    );
    assert!(
        rewrite_transition_group_map_expr(
            &mut tg_vt,
            &match parse_expr("items.map(item => <li />, other)", true) {
                Expr::Call(call) => call,
                other => panic!("expected call, got {other:?}"),
            },
        )
        .is_none()
    );
    assert!(
        rewrite_transition_group_map_expr(
            &mut tg_vt,
            &match parse_expr("items.map(renderItem)", true) {
                Expr::Call(call) => call,
                other => panic!("expected call, got {other:?}"),
            },
        )
        .is_none()
    );

    let single_child = parse_jsx_element("<TransitionGroup><li key=\"a\">A</li></TransitionGroup>");
    let single_expr =
        build_transition_group_children_expr(&mut tg_vt, &single_child.children).expect("single");
    assert!(!matches!(single_expr, Expr::Array(_)));

    let if_else_group = parse_jsx_element(
        "<TransitionGroup>{items.map(item => { if (item.ok) { return <li key={item.id}>A</li>; } else { return <li key={item.alt}>B</li>; } })}</TransitionGroup>",
    );
    let if_else_expr =
        build_transition_group_children_expr(&mut tg_vt, &if_else_group.children).expect("if else");
    let if_else_out = compact(&emit_expr(if_else_expr));
    assert!(if_else_out.contains("item.ok"));
    assert!(if_else_out.contains("item.alt"));

    let mut plain_expr_host = parse_jsx_element("<Box>{value}</Box>");
    let rewrite = rewrite_component_children_to_props(&mut tg_vt, &mut plain_expr_host);
    assert!(rewrite.stmts.is_empty());
    assert!(
        compact(&emit_expr(build_component_mount_expr(&plain_expr_host)))
            .contains("children:value")
    );

    let mut empty_expr_host = parse_jsx_element("<Box>{}</Box>");
    let rewrite = rewrite_component_children_to_props(&mut tg_vt, &mut empty_expr_host);
    assert!(rewrite.stmts.is_empty());
    assert!(
        compact(&emit_expr(build_component_mount_expr(&empty_expr_host))).contains(",()=>({}))")
    );
}

#[test]
fn hardens_slot_condition_fallback_and_named_alt_edges() {
    let mut vt = new_vt();
    let cond_host = parse_jsx_element("<Box>{ok ? <One /> : <Two />}</Box>");
    let cond_lowered = lower_slot_value(&mut vt, &cond_host.children).expect("cond lowered");
    let cond_out = compact(&emit_stmts(cond_lowered.stmts));

    assert!(cond_out.contains("_$compiledRoot(()=>"));
    assert!(cond_out.contains("_$createDocumentFragment"));
    assert!(!cond_lowered.is_function);

    let alt_named = lower_named_slot_expr(
        &mut vt,
        &parse_expr("ok ? null : <template slot=\"footer\"><span /></template>", true),
    )
    .expect("alt named slot");
    let alt_name = compact(&emit_expr(alt_named.0));
    let alt_value = compact(&emit_expr(alt_named.1.expr));

    assert_eq!(alt_name, "\"footer\";");
    assert!(alt_value.contains("ok?undefined:"));

    let and_named = lower_named_slot_expr(
        &mut vt,
        &parse_expr("ok && <template slot=\"footer\"><span /></template>", true),
    )
    .expect("logical named slot");
    let and_value = compact(&emit_expr(and_named.1.expr));
    assert!(and_value.contains("ok?"));
    assert!(and_value.contains(":undefined"));

    assert!(
        lower_named_slot_expr(
            &mut vt,
            &parse_expr("ok ? <template slot=\"a\"><span /></template> : <template slot=\"b\"><span /></template>", true),
        )
        .is_none()
    );
}

#[test]
fn hardens_member_component_empty_attr_and_transition_control_returns() {
    let mut vt = new_vt();
    let mut member_component =
        parse_jsx_element("<App.UI.Button label={<span />} empty={value} />");
    for attr in &mut member_component.opening.attrs {
        let JSXAttrOrSpread::JSXAttr(attr) = attr else {
            continue;
        };
        if matches!(&attr.name, JSXAttrName::Ident(name) if name.sym.as_ref() == "empty") {
            attr.value = Some(JSXAttrValue::JSXExprContainer(JSXExprContainer {
                span: DUMMY_SP,
                expr: JSXExpr::JSXEmptyExpr(JSXEmptyExpr { span: DUMMY_SP }),
            }));
        }
    }
    let member_out = compact(&emit_expr(build_component_mount_expr(&member_component)));
    assert!(member_out.contains("App.UI.Button"));
    assert!(member_out.contains("label:"));
    assert!(!member_out.contains("empty:"));

    let switch_group = parse_jsx_element(
        "<TransitionGroup>{items.map(item => { switch (item.kind) { case 'a': return <li key={item.a}>A</li>; default: return <li key={item.b}>B</li>; } })}</TransitionGroup>",
    );
    let switch_expr =
        build_transition_group_children_expr(&mut vt, &switch_group.children).expect("switch");
    let switch_out = compact(&emit_expr(switch_expr));
    assert!(switch_out.contains("item.a"));
    assert!(switch_out.contains("item.b"));

    let try_group = parse_jsx_element(
        "<TransitionGroup>{items.map(item => { try { return <li key={item.id}>A</li>; } catch (err) { return <li key={item.err}>B</li>; } finally { cleanup(item); } })}</TransitionGroup>",
    );
    let try_expr = build_transition_group_children_expr(&mut vt, &try_group.children).expect("try");
    let try_out = compact(&emit_expr(try_expr));
    assert!(try_out.contains("item.id"));
    assert!(try_out.contains("item.err"));
    assert!(try_out.contains("cleanup(item)"));
}

#[test]
fn hardens_remaining_transition_and_default_child_edges() {
    let mut transition_vt = new_vt();
    let mixed_group = parse_jsx_element(
        "<TransitionGroup> lead {...items}{null}<li key={id}>A</li></TransitionGroup>",
    );
    let mixed_expr =
        build_transition_group_children_expr(&mut transition_vt, &mixed_group.children)
            .expect("mixed transition children");
    let mixed_out = compact(&emit_expr(mixed_expr));

    assert!(mixed_out.contains("[\"lead\""));
    assert!(mixed_out.contains("_$compiledWithKey(_$compiledRoot((__rue_parent_context)=>{"));
    assert!(mixed_out.contains("id"));
    assert!(!mixed_out.contains("items"));

    let mut empty_vt = new_vt();
    let empty_group = parse_jsx_element("<TransitionGroup>   {...items}</TransitionGroup>");
    assert!(build_transition_group_children_expr(&mut empty_vt, &empty_group.children).is_none());

    let mut default_vt = new_vt();
    let mut host = parse_jsx_element("<Box><span>A</span><span>B</span></Box>");
    let rewrite = rewrite_component_children_to_props(&mut default_vt, &mut host);
    let stmts = compact(&emit_stmts(rewrite.stmts));
    let mount = compact(&emit_expr(build_component_mount_expr(&host)));

    assert!(stmts.is_empty(), "{stmts}");
    assert_eq!(mount.matches("_$compiledRoot(").count(), 2, "{mount}");
    assert!(mount.contains("children:[_$compiledRoot("), "{mount}");
    assert!(!mount.contains("vapor("), "{mount}");
    assert!(!mount.contains("__rue_slots"));

    let mut empty_rewrite_vt = new_vt();
    let mut empty_transition = parse_jsx_element("<TransitionGroup />");
    let empty_rewrite =
        rewrite_component_children_to_props(&mut empty_rewrite_vt, &mut empty_transition);
    assert!(empty_rewrite.stmts.is_empty());
    assert!(empty_rewrite.direct_render_expr.is_some());

    let mut no_slot_vt = new_vt();
    let no_slot = parse_jsx_element("<span />");
    assert!(lower_named_slot_element(&mut no_slot_vt, &no_slot).is_none());

    let keyed_weird = parse_jsx_element("<li data:x=\"y\" {...props} key={<span />} />");
    assert!(matches!(extract_jsx_key_expr(&keyed_weird), Some(Expr::JSXElement(_))));
}

#[test]
fn hardens_slot_static_empty_alt_and_transition_call_fallbacks() {
    let mut alt_vt = new_vt();
    let alt_host = parse_jsx_element("<Box>{ok ? null : <span>Late</span>}</Box>");
    let alt_lowered = lower_slot_value(&mut alt_vt, &alt_host.children).expect("alt slot");
    let alt_out = compact(&emit_expr(alt_lowered.expr));

    assert!(alt_out.contains("ok?undefined:"));
    assert!(!alt_lowered.is_function);

    let mut jsx_array_vt = new_vt();
    let jsx_array_host = parse_jsx_element("<Box>{[<span key=\"a\" />]}</Box>");
    let jsx_array_lowered =
        lower_slot_value(&mut jsx_array_vt, &jsx_array_host.children).expect("array slot");
    let jsx_array_out = compact(&emit_expr(jsx_array_lowered.expr));

    assert!(jsx_array_lowered.stmts.is_empty());
    assert!(jsx_array_out.starts_with('['));

    let mut transition_vt = new_vt();
    let fallback = rewrite_transition_group_render_expr(
        &mut transition_vt,
        &parse_expr("renderItem(<li key={id} />)", true),
    );
    let fallback_out = compact(&emit_expr(fallback));

    assert_eq!(fallback_out, "renderItem(<likey={id}/>);");
}

#[test]
fn hardens_slot_rejection_and_transition_void_return_edges() {
    let mut vt = new_vt();

    assert!(lower_expr_slot_value(&mut vt, &parse_expr("ok ? value : <span />", true)).is_none());
    assert!(lower_expr_slot_value(&mut vt, &parse_expr("ok && value", true)).is_none());
    assert!(
        lower_named_slot_expr(
            &mut vt,
            &parse_expr("ok ? value : <template slot=\"footer\"><span /></template>", true,),
        )
        .is_none()
    );
    assert!(lower_named_slot_expr(&mut vt, &parse_expr("ok && value", true)).is_none());

    let fragment_expr = parse_expr("<><span />{value}</>", true);
    let lowered_fragment =
        lower_expr_slot_value(&mut vt, &fragment_expr).expect("fragment slot lowered");
    let fragment_out = compact(&emit_stmts(lowered_fragment.stmts));
    assert!(fragment_out.contains("_$createDocumentFragment"));

    let empty_return_group =
        parse_jsx_element("<TransitionGroup>{items.map(item => { return; })}</TransitionGroup>");
    let empty_return_expr =
        build_transition_group_children_expr(&mut vt, &empty_return_group.children)
            .expect("empty return transition group");
    let empty_return_out = compact(&emit_expr(empty_return_expr));
    assert!(empty_return_out.contains("return;"));

    let try_only_group = parse_jsx_element(
        "<TransitionGroup>{items.map(item => { try { return <li key={item.id} />; } finally { return; } })}</TransitionGroup>",
    );
    let try_only_expr =
        build_transition_group_children_expr(&mut vt, &try_only_group.children).expect("try only");
    let try_only_out = compact(&emit_expr(try_only_expr));
    assert!(try_only_out.contains("_$compiledWithKey"));
    assert!(try_only_out.contains("return;"));
}

#[test]
fn hardens_complex_slot_fallbacks_and_transition_statement_noops() {
    let mut vt = new_vt();

    let both_branch_expr =
        parse_jsx_element("<Box>{ok ? <span key=\"a\">A</span> : <span key=\"b\">B</span>}</Box>");
    let lowered =
        lower_slot_value(&mut vt, &both_branch_expr.children).expect("complex conditional slot");
    let lowered_stmts = compact(&emit_stmts(lowered.stmts));
    assert!(lowered_stmts.contains("const__child"));
    assert!(lowered_stmts.contains("_$compiledRoot((__rue_parent_context)=>{"));
    assert!(!lowered.is_function);

    let mut named_vt = new_vt();
    assert!(
        lower_named_slot_expr(
            &mut named_vt,
            &parse_expr("ok ? <span slot=\"left\">L</span> : <span slot=\"right\">R</span>", true,),
        )
        .is_none()
    );

    let mut transition_vt = new_vt();
    let passthrough = parse_expr(
        "items.map(item => { label(item); try { log(item); } finally { cleanup(item); } return item.ok ? <li key={item.id} /> : <li key={item.alt} />; })",
        true,
    );
    let rewritten = rewrite_transition_group_render_expr(&mut transition_vt, &passthrough);
    let out = compact(&emit_expr(rewritten));

    assert!(out.contains("label(item);"));
    assert!(out.contains("log(item);"));
    assert!(out.contains("cleanup(item);"));
    assert!(out.contains("_$compiledWithKey"));
    assert!(out.contains("item.ok?"));
}

#[test]
fn hardens_slot_empty_alt_array_fallback_and_empty_named_slots() {
    let mut alt_vt = new_vt();
    let alt_child = parse_jsx_element("<Box>{empty ? null : <span>Tail</span>}</Box>");
    let alt_lowered = lower_slot_value(&mut alt_vt, &alt_child.children).expect("alt slot");
    let alt_stmts = compact(&emit_stmts(alt_lowered.stmts));
    let alt_out = compact(&emit_expr(alt_lowered.expr));
    assert!(alt_stmts.contains("_$compiledRoot((__rue_parent_context)=>{"), "{alt_stmts}");
    assert!(alt_stmts.contains("_$compiledCreateElement(\"span\",__rue_parent_context)"));
    assert!(alt_out.contains("empty?undefined:__child"));

    let mut array_vt = new_vt();
    let array_child = parse_jsx_element("<Box>{[<span key=\"a\" />]}</Box>");
    let array_lowered = lower_slot_value(&mut array_vt, &array_child.children).expect("array slot");
    let array_expr = compact(&emit_expr(array_lowered.expr));
    assert!(array_lowered.stmts.is_empty());
    assert!(array_expr.contains("[<spankey=\"a\"/>]"));

    let mut logical_or_vt = new_vt();
    let logical_or_child = parse_jsx_element("<Box>{ok || <span key=\"a\" />}</Box>");
    let logical_or_lowered =
        lower_slot_value(&mut logical_or_vt, &logical_or_child.children).expect("logical or slot");
    let logical_or_stmts = compact(&emit_stmts(logical_or_lowered.stmts));
    assert!(logical_or_stmts.contains("const__child"));
    assert!(logical_or_stmts.contains("_$createDocumentFragment"));
    let _logical_or_expr = compact(&emit_expr(logical_or_lowered.expr));
    assert!(logical_or_stmts.contains("_$mountCompiledSlotAt("), "{logical_or_stmts}");
    assert!(!logical_or_stmts.contains("__rue_compiled_branch_key"), "{logical_or_stmts}");
    assert!(logical_or_stmts.contains("_$mountCompiledSlotAt("), "{logical_or_stmts}");

    let mut named_alt_vt = new_vt();
    let (slot_name, named_lowered) = lower_named_slot_expr(
        &mut named_alt_vt,
        &parse_expr("empty ? null : <span slot=\"footer\">F</span>", true),
    )
    .expect("named empty alt slot");
    assert_eq!(compact(&emit_expr(slot_name)), "\"footer\";");
    assert!(compact(&emit_stmts(named_lowered.stmts)).contains("_$compiledRoot(()=>{"));
    assert!(compact(&emit_expr(named_lowered.expr)).contains("empty?undefined:__child"));

    let mut host_vt = new_vt();
    let mut host =
        parse_jsx_element("<Box><Template slot=\"ghost\"> </Template><span>Default</span></Box>");
    let rewrite = rewrite_component_children_to_props(&mut host_vt, &mut host);
    let stmts = compact(&emit_stmts(rewrite.stmts));
    let mount = compact(&emit_expr(build_component_mount_expr(&host)));

    assert!(stmts.contains("const__child"));
    assert!(stmts.contains("_$createElement(\"span\",_root)"));
    assert!(!mount.contains("__rue_slots"));
    assert!(!mount.contains("ghost"));
    assert!(mount.contains("children:__child"));
}

#[test]
fn hardens_logical_slot_and_transition_empty_child_edges() {
    let mut logical_vt = new_vt();
    let logical_child = parse_jsx_element("<Box>{ok && <span key=\"ok\">OK</span>}</Box>");
    let logical_lowered =
        lower_slot_value(&mut logical_vt, &logical_child.children).expect("logical slot");
    let logical_stmts = compact(&emit_stmts(logical_lowered.stmts));
    let logical_expr = compact(&emit_expr(logical_lowered.expr));
    assert!(logical_stmts.contains("_$compiledCreateElement(\"span\",__rue_parent_context)"));
    assert!(logical_expr.contains("ok?__child"));
    assert!(logical_expr.contains(":undefined"));

    let mut rejected_cond_vt = new_vt();
    assert!(
        lower_expr_slot_value(
            &mut rejected_cond_vt,
            &parse_expr("ok ? fallback : <span slot=\"footer\">F</span>", true),
        )
        .is_none()
    );

    let mut named_logical_vt = new_vt();
    let (slot_name, named_logical) = lower_named_slot_expr(
        &mut named_logical_vt,
        &parse_expr("ok && <span slot=\"footer\">F</span>", true),
    )
    .expect("logical named slot");
    assert_eq!(compact(&emit_expr(slot_name)), "\"footer\";");
    assert!(compact(&emit_expr(named_logical.expr)).contains("ok?__child"));

    let mut transition_vt = new_vt();
    let mut transition =
        parse_jsx_element("<TransitionGroup>{}<></>text<li>A</li></TransitionGroup>");
    let rewrite = rewrite_component_children_to_props(&mut transition_vt, &mut transition);
    let mount = compact(&emit_expr(rewrite.direct_render_expr.unwrap()));
    assert!(mount.contains("_$transitionGroup("), "{mount}");
    assert!(mount.contains("text"), "{mount}");
    assert!(!mount.contains("_$compiledWithKey"), "{mount}");
}

#[test]
fn hardens_default_child_statement_extension_and_named_conditional_rejection() {
    let mut default_vt = new_vt();
    let mut host = parse_jsx_element("<Box><span key=\"child\">Child</span></Box>");
    let rewrite = rewrite_component_children_to_props(&mut default_vt, &mut host);
    let stmts = compact(&emit_stmts(rewrite.stmts));
    let mount = compact(&emit_expr(build_component_mount_expr(&host)));

    assert!(stmts.contains("const__child"));
    assert!(stmts.contains("_$createElement(\"span\",_root)"));
    assert!(mount.contains("children:__child"));
    assert!(!mount.contains("__rue_slots"));

    let mut rejected_named_vt = new_vt();
    assert!(
        lower_named_slot_expr(
            &mut rejected_named_vt,
            &parse_expr("ok ? fallback : <span slot=\"footer\">F</span>", true),
        )
        .is_none()
    );

    let mut rejected_default_vt = new_vt();
    assert!(
        lower_expr_slot_value(
            &mut rejected_default_vt,
            &parse_expr("ok ? fallback : <span>F</span>", true),
        )
        .is_none()
    );
}

#[test]
fn hardens_nested_slot_bags_fragments_and_transition_switch_returns() {
    let mut slot_vt = new_vt();
    let mut host = parse_jsx_element(
        "<Panel><Template slot=\"header\"><><h1>{title}</h1><small>{subtitle}</small></></Template>{ready ? <Fragment><span>Body</span></Fragment> : null}{(ctx) => <Footer>{ctx.label}</Footer>}</Panel>",
    );
    let rewrite = rewrite_component_children_to_props(&mut slot_vt, &mut host);
    let stmts = compact(&emit_stmts(rewrite.stmts));
    let mount = compact(&emit_expr(build_component_mount_expr(&host)));

    assert!(host.children.is_empty());
    assert!(host.opening.self_closing);
    assert!(stmts.contains("_$createDocumentFragment"));
    assert!(stmts.contains("_$createElement(\"h1\",_root)"));
    assert!(stmts.contains("_$createElement(\"small\",_root)"));
    assert!(stmts.contains("_$createElement(\"span\",_root)"));
    assert!(mount.contains("__rue_slots"));
    assert!(mount.contains("\"header\":__child"));
    assert!(mount.contains("\"default\":["), "{mount}");
    assert!(mount.contains("children:["), "{mount}");
    assert!(!mount.contains("slot:"));

    let mut transition_vt = new_vt();
    let group = parse_jsx_element(
        "<TransitionGroup>{items.map(item => { switch (item.kind) { case 'a': return <li key={item.id}>A</li>; case 'b': return <li key={item.alt}>B</li>; default: return <li key={item.fallback}>F</li>; } })}</TransitionGroup>",
    );
    let children_expr =
        build_transition_group_children_expr(&mut transition_vt, &group.children).expect("group");
    let out = compact(&emit_expr(children_expr));

    assert!(out.contains("switch(item.kind)"));
    assert!(out.contains("_$compiledWithKey"));
    assert!(out.contains("item.id"));
    assert!(out.contains("item.alt"));
    assert!(out.contains("item.fallback"));
}

#[test]
fn hardens_slot_lowering_with_parenthesized_logical_and_empty_carriers() {
    let mut logical_vt = new_vt();
    let logical_host =
        parse_jsx_element("<Box>{(ready && <><span>A</span><span>B</span></>)}</Box>");
    let lowered = lower_slot_value(&mut logical_vt, &logical_host.children).expect("logical slot");
    let stmts = compact(&emit_stmts(lowered.stmts));
    let expr = compact(&emit_expr(lowered.expr));

    assert!(stmts.contains("_$createDocumentFragment"));
    assert!(stmts.contains("_$createElement(\"span\",_root)"));
    assert!(expr.contains("ready?__child"));

    let mut empty_named_vt = new_vt();
    let (empty_slot_name, empty_slot) = lower_named_slot_expr(
        &mut empty_named_vt,
        &parse_expr("<Template slot=\"aside\"><>{null}{false}</></Template>", true),
    )
    .expect("empty-ish named fragment slot");
    assert_eq!(compact(&emit_expr(empty_slot_name)), "\"aside\";");
    assert!(compact(&emit_stmts(empty_slot.stmts)).contains("_$createDocumentFragment"));

    let mut rejected_vt = new_vt();
    assert!(
        lower_expr_slot_value(
            &mut rejected_vt,
            &parse_expr("ready || <span slot=\"named\">Named</span>", true),
        )
        .is_none()
    );
}

#[test]
fn hardens_nullish_slot_fallbacks_and_empty_key_attrs() {
    let mut nullish_vt = new_vt();
    let nullish_host =
        parse_jsx_element("<Box>{content ?? <span key=\"fallback\">Fallback</span>}</Box>");
    let lowered = lower_slot_value(&mut nullish_vt, &nullish_host.children)
        .expect("nullish slot fallback should lower through wrapper");
    let stmts = compact(&emit_stmts(lowered.stmts));
    let expr = compact(&emit_expr(lowered.expr));

    assert!(stmts.contains("const__child"));
    assert!(stmts.contains("_$createDocumentFragment"));
    assert!(stmts.contains("_$mountCompiledSlotAt("), "{stmts}");
    assert!(stmts.contains("_$mountCompiledSlotAt("), "{stmts}");
    assert!(stmts.contains("_$compiledCreateElement(\"span\",__rue_parent_context)"));
    assert!(expr.contains("__child"));

    let empty_key = parse_jsx_element("<li key />");
    assert!(extract_jsx_key_expr(&empty_key).is_none());
}

#[test]
fn hardens_slot_component_source_and_multiple_event_props_mounts() {
    let explicit_source = parse_jsx_element(
        "<Slot source={customSource} handlePointerDown={onDown} handleKeyUp={onKey} label=\"menu\" />",
    );
    let out = compact(&emit_expr(build_component_mount_expr(&explicit_source)));

    assert!(out.starts_with("_$createComponent(Slot,"));
    assert!(out.contains("source:customSource"));
    assert!(!out.contains("getCurrentInstance"));
    assert!(out.contains("handlePointerDown:onDown"));
    assert!(out.contains("handleKeyUp:onKey"));
    assert!(out.contains("label:\"menu\""));

    let member_component =
        parse_jsx_element("<Namespace.Menu.Item handleFocus={onFocus} data-id=\"x\" />");
    let member_out = compact(&emit_expr(build_component_mount_expr(&member_component)));
    assert!(member_out.contains("_$createComponent(Namespace.Menu.Item"));
    assert!(member_out.contains("handleFocus:onFocus"));
    assert!(member_out.contains("\"data-id\":\"x\""));
}

#[test]
fn hardens_transition_group_mixed_direct_children_and_nested_logicals() {
    let mut vt = new_vt();
    let group = parse_jsx_element(
        "<TransitionGroup><li key=\"static\">Static</li>{ready && <li key={id}>Ready</li>}{fallback ? null : <Card key={fallbackId} />}</TransitionGroup>",
    );
    let children_expr =
        build_transition_group_children_expr(&mut vt, &group.children).expect("children expr");
    let out = compact(&emit_expr(children_expr));

    assert!(out.starts_with("["));
    assert!(out.contains("_$compiledWithKey"));
    assert!(out.contains("\"static\""));
    assert!(out.contains("ready?"));
    assert!(out.contains(":\"\""));
    assert!(out.contains("fallback?null"));
    assert!(out.contains("fallbackId"));

    let mut non_map_vt = new_vt();
    let non_map_call = rewrite_transition_group_render_expr(
        &mut non_map_vt,
        &parse_expr("items.filter(Boolean).map", false),
    );
    assert_eq!(compact(&emit_expr(non_map_call)), "items.filter(Boolean).map;");
}

#[test]
fn hardens_member_named_slots_source_defaults_and_slot_attr_removal() {
    let mut vt = new_vt();
    let (slot_name, lowered) = lower_named_slot_expr(
        &mut vt,
        &parse_expr(
            "<Namespace.Header slot=\"header\" title={title}><span>{title}</span></Namespace.Header>",
            true,
        ),
    )
    .expect("member named slot");
    let name_out = compact(&emit_expr(slot_name));
    let stmts_out = compact(&emit_stmts(lowered.stmts));
    let expr_out = compact(&emit_expr(lowered.expr));

    assert_eq!(name_out, "\"header\";");
    assert!(stmts_out.contains("_$createComponent(Namespace.Header"));
    assert!(stmts_out.contains("title:title"));
    assert!(stmts_out.contains("children:__child"));
    assert!(!stmts_out.contains("slot:\"header\""));
    assert_eq!(expr_out, "__child2;");

    let slot_without_source = parse_jsx_element("<Slot name=\"default\" />");
    let slot_out = compact(&emit_expr(build_component_mount_expr(&slot_without_source)));
    assert!(slot_out.contains("source:getCurrentInstance()&&getCurrentInstance().propsRO"));
    assert!(slot_out.contains("name:\"default\""));
}

#[test]
fn hardens_component_slot_fallbacks_for_arrays_and_nullish_named_slots() {
    let mut array_vt = new_vt();
    let array_host = parse_jsx_element("<Box>{items.map(item => <span>{item.label}</span>)}</Box>");
    let array_lowered =
        lower_slot_value(&mut array_vt, &array_host.children).expect("array-like child");
    let array_out = compact(&emit_expr(array_lowered.expr));
    assert!(array_lowered.stmts.is_empty());
    assert!(array_out.contains("items.map("), "{array_out}");
    assert!(array_out.contains("_$compiledRoot("), "{array_out}");
    assert!(!array_out.contains("_$compiledKeyedList"), "{array_out}");
    assert!(array_out.contains("item.label"), "{array_out}");
    assert!(!array_lowered.is_function);

    let mut named_vt = new_vt();
    assert!(
        lower_named_slot_expr(
            &mut named_vt,
            &parse_expr("override ?? <Template slot=\"header\"><span>H</span></Template>", true),
        )
        .is_none()
    );

    let mut rejected_vt = new_vt();
    assert!(
        lower_named_slot_expr(
            &mut rejected_vt,
            &parse_expr("override ?? <span slot=\"header\">H</span>", true),
        )
        .is_none()
    );
}

#[test]
fn hardens_transition_group_try_finally_and_member_fallback_keys() {
    let mut vt = new_vt();
    let group = parse_jsx_element(
        "<TransitionGroup>{rows.map(row => { try { if (row.skip) return <Card key={row.skipKey} />; return <li key={row.id}>{row.label}</li>; } catch (err) { return <Fallback key={err.id} />; } finally { row.done(); } })}</TransitionGroup>",
    );
    let children_expr =
        build_transition_group_children_expr(&mut vt, &group.children).expect("transition expr");
    let out = compact(&emit_expr(children_expr));

    assert!(out.contains("_$compiledWithKey"), "{out}");
    assert!(out.contains("row.skipKey"), "{out}");
    assert!(out.contains("row.id"), "{out}");
    assert!(out.contains("err.id"), "{out}");
    assert!(out.contains("row.done();"), "{out}");

    let member_group = parse_jsx_element(
        "<TransitionGroup>{rows.map(row => <UI.Row key={row.id}>{row.label}</UI.Row>)}</TransitionGroup>",
    );
    let member_expr =
        build_transition_group_children_expr(&mut vt, &member_group.children).expect("member expr");
    let member_out = compact(&emit_expr(member_expr));
    assert!(member_out.contains("_$createComponent(UI.Row"), "{member_out}");
    assert!(member_out.contains("row.id"), "{member_out}");
}

#[test]
fn hardens_transition_group_nested_loop_and_switch_return_rewrites() {
    let mut vt = new_vt();
    let group = parse_jsx_element(
        "<TransitionGroup>{items.map(item => { for (const child of item.children) { if (child.hot) return <li key={child.id}>{child.label}</li>; } switch (item.kind) { case 'skip': return null; default: return item.ready && <li key={item.id}>{item.label}</li>; } })}</TransitionGroup>",
    );
    let children_expr =
        build_transition_group_children_expr(&mut vt, &group.children).expect("transition group");
    let out = compact(&emit_expr(children_expr));

    assert!(out.contains("for(constchildofitem.children)"));
    assert!(out.contains("switch(item.kind)"));
    assert!(out.contains("_$compiledWithKey"));
    assert!(out.contains("child.id"));
    assert!(out.contains("item.ready?"));
    assert!(out.contains("item.id"));
    assert!(out.contains("returnnull"));
}

#[test]
fn hardens_slot_lowering_static_false_and_nullish_slot_edges() {
    let mut false_vt = new_vt();
    let false_host = parse_jsx_element("<Box>{false}</Box>");
    assert!(lower_slot_value(&mut false_vt, &false_host.children).is_none());

    let mut rejected_named_vt = new_vt();
    assert!(
        lower_named_slot_expr(
            &mut rejected_named_vt,
            &parse_expr(
                "provided ?? <Template slot=\"empty\"><span>Fallback</span></Template>",
                true,
            ),
        )
        .is_none()
    );

    let mut nullish_default_vt = new_vt();
    let host = parse_jsx_element("<Box>{provided ?? <><span>Fallback</span></>}</Box>");
    let lowered = lower_slot_value(&mut nullish_default_vt, &host.children)
        .expect("nullish default fallback");
    let stmts_out = compact(&emit_stmts(lowered.stmts));
    let expr_out = compact(&emit_expr(lowered.expr));

    assert!(stmts_out.contains("_$mountCompiledSlotAt("), "{stmts_out}");
    assert!(stmts_out.contains("_$mountCompiledSlotAt("), "{stmts_out}");
    assert!(stmts_out.contains("_$createDocumentFragment"));
    assert!(stmts_out.contains("_$compiledCreateElement(\"span\",_root)"));
    assert!(expr_out.contains("__child"));
}

#[test]
fn hardens_slot_lowering_static_empty_conditional_and_text_misses() {
    let mut alt_vt = new_vt();
    let alt = lower_expr_slot_value(
        &mut alt_vt,
        &parse_expr("null ? null : <Badge>{count}</Badge>", true),
    )
    .expect("static-empty conditional alt");
    let alt_out = compact(&emit_expr(alt.expr));
    let alt_stmts = compact(&emit_stmts(alt.stmts));

    assert!(alt_out.contains("?undefined:"), "{alt_out}");
    assert!(alt_stmts.contains("_$createComponent(Badge"), "{alt_stmts}");

    let mut text_vt = new_vt();
    let text_host = parse_jsx_element("<Box>{'label'}</Box>");
    let text = lower_slot_value(&mut text_vt, &text_host.children).expect("literal text slot");
    assert!(text.stmts.is_empty());
    assert_eq!(compact(&emit_expr(text.expr)), "'label';");

    let mut complex_vt = new_vt();
    let complex_host = parse_jsx_element("<Box>{condition ? <A /> : <B />}</Box>");
    let complex =
        lower_slot_value(&mut complex_vt, &complex_host.children).expect("complex slot fallback");
    let complex_out = compact(&emit_stmts(complex.stmts));

    assert!(complex_out.contains("condition?"), "{complex_out}");
    assert!(complex_out.contains("_$createComponent(A"), "{complex_out}");
    assert!(complex_out.contains("_$createComponent(B"), "{complex_out}");
}

#[test]
fn deep_compiles_multi_child_component_slots_with_runtime_value_fallbacks() {
    let mut vt = new_vt();
    let host = parse_jsx_element(
        r#"<Display>
          {image ? <img src={image.src} /> : image.children}
          {hasContent ? <div ref={(node) => assign(node)}>{image.children}</div> : fallback}
        </Display>"#,
    );
    let lowered = lower_slot_value(&mut vt, &host.children).expect("closed mixed-value slots");
    let stmts_out = compact(&emit_stmts(lowered.stmts));
    let expr_out = compact(&emit_expr(lowered.expr));

    assert!(expr_out.starts_with("["), "{expr_out}");
    assert!(stmts_out.contains("_$compiledCreateElement(\"img\""), "{stmts_out}");
    assert!(stmts_out.contains("_$compiledCreateElement(\"div\""), "{stmts_out}");
    assert!(stmts_out.contains("onOwnerCleanup"), "{stmts_out}");
    assert!(!stmts_out.contains("_$createElement("), "{stmts_out}");
    assert!(!stmts_out.contains("_$compiledBindUseRef"), "{stmts_out}");
}

#[test]
fn hardens_slot_lowering_rejected_conditionals_and_jsx_expr_fallbacks() {
    let mut rejected_vt = new_vt();
    assert!(
        lower_expr_slot_value(&mut rejected_vt, &parse_expr("ok ? <A /> : <B />", true)).is_none()
    );

    let mut mixed_vt = new_vt();
    let mixed_host = parse_jsx_element("<Box>{ok ? <A /> : value}</Box>");
    let mixed = lower_slot_value(&mut mixed_vt, &mixed_host.children).expect("mixed fallback");
    let mixed_out = compact(&emit_stmts(mixed.stmts));

    assert!(mixed_out.contains("ok?"), "{mixed_out}");
    assert!(mixed_out.contains("_$createComponent(A"), "{mixed_out}");
    assert!(mixed_out.contains("_$compiledValueFactory(value)"), "{mixed_out}");
    assert!(compact(&emit_expr(mixed.expr)).contains("__child"), "{mixed_out}");

    let mut empty_expr_vt = new_vt();
    let empty_expr_host = parse_jsx_element("<Box>{}</Box>");
    assert!(lower_slot_value(&mut empty_expr_vt, &empty_expr_host.children).is_none());
}

#[test]
fn hardens_slot_lowering_nested_conditionals_functions_and_member_names() {
    let mut nested_vt = new_vt();
    let nested_host = parse_jsx_element(
        "<Panel>{ready ? (fallback ?? <Namespace.Body id={id}><span>{label}</span></Namespace.Body>) : <Fragment><em>Empty</em></Fragment>}</Panel>",
    );
    let lowered =
        lower_slot_value(&mut nested_vt, &nested_host.children).expect("nested conditional slot");
    let stmts = compact(&emit_stmts(lowered.stmts));
    let expr = compact(&emit_expr(lowered.expr));

    assert!(stmts.contains("ready?"), "{stmts}");
    assert!(stmts.contains("fallback") && stmts.contains("_$compiledValueFactory"), "{stmts}");
    assert!(stmts.contains("_$createComponent(Namespace.Body"), "{stmts}");
    assert!(stmts.contains("_$createDocumentFragment"), "{stmts}");
    assert!(stmts.contains("_$createElement(\"em\",_root)"), "{stmts}");
    assert!(expr.contains("__child"), "{expr}");

    let mut fn_vt = new_vt();
    let fn_host = parse_jsx_element(
        "<Panel>{(ctx) => <Namespace.Footer>{ctx.label}</Namespace.Footer>}</Panel>",
    );
    let fn_slot = lower_slot_value(&mut fn_vt, &fn_host.children).expect("function child");
    let fn_out = compact(&emit_expr(fn_slot.expr));
    assert!(fn_slot.stmts.is_empty());
    assert!(fn_slot.is_function);
    assert!(
        fn_out.contains("(ctx)=><Namespace.Footer>{ctx.label}</Namespace.Footer>;"),
        "{fn_out}"
    );
}

#[test]
fn hardens_component_mount_empty_values_and_named_slot_carriers() {
    let mut host = parse_jsx_element(
        "<Panel title={undefined} slot={ignored}><template slot=\"header\"><Slot name=\"title\" /></template><Namespace.Footer slot=\"footer\" /></Panel>",
    );
    let mut vt = new_vt();
    let rewrite = rewrite_component_children_to_props(&mut vt, &mut host);
    let stmts = compact(&emit_stmts(rewrite.stmts));
    let mount = compact(&emit_expr(build_component_mount_expr(&host)));

    assert!(host.children.is_empty());
    assert!(host.opening.self_closing);
    assert!(stmts.contains("_$createComponent(Slot"), "{stmts}");
    assert!(stmts.contains("_$createComponent(Namespace.Footer"), "{stmts}");
    assert!(mount.contains("__rue_slots"), "{mount}");
    assert!(mount.contains("\"header\":__child"), "{mount}");
    assert!(mount.contains("\"footer\":__child"), "{mount}");
    assert!(mount.contains("title:undefined"), "{mount}");
    assert!(mount.contains("slot:ignored"), "{mount}");
}

#[test]
fn hardens_deep_member_components_empty_expr_slots_and_transition_finalizers() {
    let deep_member = parse_jsx_element("<Design.System.Card title=\"x\" enabled />");
    let deep_member_out = compact(&emit_expr(build_component_mount_expr(&deep_member)));

    assert!(deep_member_out.contains("_$createComponent(Design.System.Card"), "{deep_member_out}");
    assert!(deep_member_out.contains("title:\"x\""), "{deep_member_out}");
    assert!(deep_member_out.contains("enabled:true"), "{deep_member_out}");

    let mut empty_expr_vt = new_vt();
    let empty_expr_host = parse_jsx_element("<Panel>{}</Panel>");
    assert!(lower_slot_value(&mut empty_expr_vt, &empty_expr_host.children).is_none());

    let mut transition_vt = new_vt();
    let group = parse_jsx_element(
        "<TransitionGroup>{rows.map(row => { try { touch(row); } finally { return <li key={row.id}>{row.name}</li>; } })}</TransitionGroup>",
    );
    let children_expr = build_transition_group_children_expr(&mut transition_vt, &group.children)
        .expect("transition group children");
    let transition_out = compact(&emit_expr(children_expr));

    assert!(transition_out.contains("finally"), "{transition_out}");
    assert!(transition_out.contains("_$compiledWithKey"), "{transition_out}");
    assert!(transition_out.contains("row.id"), "{transition_out}");
    assert!(transition_out.contains("_$createElement(\"li\""), "{transition_out}");
}

#[test]
fn hardens_scoped_default_dynamic_named_slot_and_event_props() {
    let mut host = parse_jsx_element(
        "<Panel handleFocus={onFocus}>{(ctx) => ctx.body}{ready && <Template slot={slotName}><span>{label}</span></Template>}</Panel>",
    );
    let mut vt = new_vt();
    let rewrite = rewrite_component_children_to_props(&mut vt, &mut host);
    let stmts = compact(&emit_stmts(rewrite.stmts));
    let mount = compact(&emit_expr(build_component_mount_expr(&host)));

    assert!(host.children.is_empty());
    assert!(host.opening.self_closing);
    assert!(stmts.contains("_$createElement(\"span\",_root)"), "{stmts}");
    assert!(mount.starts_with("_$createComponent(Panel"), "{mount}");
    assert!(mount.contains("handleFocus:onFocus"), "{mount}");
    assert!(mount.contains("__rue_slots"), "{mount}");
    assert!(mount.contains("\"default\":(ctx)=>ctx.body"), "{mount}");
    assert!(mount.contains("[slotName]:"), "{mount}");
    assert!(mount.contains("ready?__child"), "{mount}");
    assert!(!mount.contains("__rueNativeOnFocus"), "{mount}");
}
