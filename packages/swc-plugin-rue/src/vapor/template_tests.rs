use std::process::Command;
use std::sync::Arc;

use swc_core::common::{FileName, SourceMap};
use swc_core::ecma::ast::Program;
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn transform_module(src: &str) -> String {
    transform_module_with_static_props(src, false)
}

fn transform_module_with_static_props(src: &str, static_component_props: bool) -> String {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("static-template-test.tsx".into()).into(),
        src.to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let program = Program::Module(parser.parse_module().expect("parse module"));
    let output = if static_component_props {
        crate::run_full_transform_with_options(program, true, true, None)
    } else {
        crate::apply(program)
    };

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

fn compact(src: &str) -> String {
    src.chars().filter(|ch| !ch.is_whitespace()).collect()
}

fn without_imports(src: &str) -> String {
    src.lines().filter(|line| !line.starts_with("import ")).collect::<Vec<_>>().join("\n")
}

#[test]
fn hoists_and_deduplicates_static_html_with_the_shared_template_helper() {
    let output = transform_module(
        r#"
const First = () => <div class="a"><span>hello</span></div>;
const Second = () => <div class="a"><span>hello</span></div>;
"#,
    );
    let compact = compact(&output);

    assert_eq!(compact.matches("_$compiledCreateElement(\"div\"").count(), 2, "{output}");
    assert_eq!(compact.matches("_$compiledCreateTextNode(\"hello\")").count(), 2, "{output}");
    assert_eq!(compact.matches("_$compiledRoot(").count(), 2, "{output}");
    assert!(output.contains("@rue-js/rue/internal"), "{output}");
    assert!(compact.contains("_$compiledAppendChild"), "{output}");
    assert!(!compact.contains("document.createElement(\"template\")"), "{output}");
    assert!(!compact.contains(".innerHTML="), "{output}");
    assert!(!compact.contains("_$createElement"), "{output}");
    assert!(!compact.contains("_$appendChild"), "{output}");
    assert!(compact.contains("_$compiledRoot"), "{output}");
    assert!(!compact.contains("vapor("), "{output}");
}

#[test]
fn hoists_pure_static_jsx_in_module_expression_context_and_preserves_reactive_key() {
    let output = transform_module(
        r#"
const selection = { value: "after" };
const controlledAfterContent = (
  <div key={selection.value} className="controlled-after-content">
    <div className="controlled-after-content__body">After content</div>
  </div>
);
"#,
    );
    let compact = compact(&output);

    assert_eq!(compact.matches("_$compiledCreateElement(\"div\"").count(), 2, "{output}");
    assert!(compact.contains("controlled-after-content__body"), "{output}");
    assert!(compact.contains("_$compiledWithKey("), "{output}");
    assert!(compact.contains("selection.value"), "{output}");
    assert!(compact.contains("_$compiledCreateElement("), "{output}");
}

#[test]
fn keeps_component_children_on_the_renderable_anchor_path_with_static_props() {
    let output = transform_module_with_static_props(
        r#"
const Layout = props => <main><div className="content">{props.children}</div></main>;
const App = () => <Layout><RouterView /></Layout>;
"#,
        true,
    );
    let compact = compact(&output);

    assert!(compact.contains("_$compiledPropsGet(props,\"children\")"), "{output}");
    assert!(compact.contains("_$mountCompiledSlotAt("), "{output}");
    assert!(!compact.contains("_$compiledText("), "{output}");
}

#[test]
fn rejects_unsafe_boundaries_while_cloning_supported_attribute_roots() {
    let output = transform_module(
        r#"
const SvgView = () => <svg><circle /></svg>;
const CustomView = () => <x-card>hello</x-card>;
const SpreadView = () => <div {...props}>hello</div>;
const EventView = () => <button onClick={handle}>hello</button>;
const RefView = () => <input ref={inputRef} />;
"#,
    );
    let compact = compact(&output);

    assert!(output.contains("@rue-js/rue/internal"), "{output}");
    assert_eq!(compact.matches("_$createElement(").count(), 3, "{output}");
    assert!(compact.contains("_$compiledSpreadAttributes"), "{output}");
    assert_eq!(compact.matches("_$compiledRoot(").count(), 5, "{output}");
    assert!(compact.contains(".addEventListener(\"click\""), "{output}");
    assert!(compact.contains(".removeEventListener(\"click\""), "{output}");
    assert!(compact.contains("onOwnerCleanup("), "{output}");
    assert!(!compact.contains("_$addEventListener"), "{output}");
    assert!(!compact.contains("_$compiledBindUseRef"), "{output}");
    assert_eq!(compact.matches("_$template(").count(), 3, "{output}");
    assert_eq!(compact.matches(".content.cloneNode(true)").count(), 3, "{output}");
    assert!(!compact.contains("_$createElement(\"div\""), "{output}");
    assert!(!compact.contains("_$createElement(\"button\""), "{output}");
    assert!(!compact.contains("_$createElement(\"input\""), "{output}");
}

#[test]
fn clones_native_skeleton_around_a_dynamic_root_attribute() {
    let output = transform_module(
        r#"
const View = props => <section id={props.id}><span className="label">hello</span></section>;
"#,
    );
    let compact = compact(&output);

    assert!(output.contains("@rue-js/rue/internal/compiler"), "{output}");
    assert!(!compact.contains("_$createElement(\"section\""), "{output}");
    assert!(
        compact.contains(
            "const_$getTemplate1=_$template('<section><spanclass=\"label\">hello</span></section>')"
        ),
        "{output}"
    );
    assert!(compact.contains("_$getTemplate1().content.cloneNode(true)"), "{output}");
    assert!(compact.contains("_el1.setAttribute(\"id\""), "{output}");
    assert!(!compact.contains("_$createElement(\"span\""), "{output}");
}

#[test]
fn template_shell_clones_single_scalar_text_hole() {
    let output = transform_module_with_static_props(
        r#"
function View(props) {
  return <section><div>静态</div><div>{props.label}</div><p>静态</p></section>;
}
const App = () => <View label="初始" />;
"#,
        true,
    );
    let compact = compact(&output);

    assert_eq!(compact.matches("const_$getTemplate1=_$template(").count(), 1, "{output}");
    assert_eq!(compact.matches(".content.cloneNode(true)").count(), 1, "{output}");
    assert_eq!(compact.matches("<!--rue:text-hole:").count(), 0, "{output}");
    assert!(compact.contains("<div>rue:direct-text</div>"), "{output}");
    assert_eq!(compact.matches("_$compiledCreateTextNode(\"\")").count(), 0, "{output}");
    assert!(compact.contains(".childNodes[1].childNodes[0]"), "{output}");
    assert!(!compact.contains(".insertBefore("), "{output}");
    assert!(!compact.contains(".removeChild("), "{output}");
    assert_eq!(compact.matches("_$compiledText(").count(), 1, "{output}");
    assert!(!compact.contains("renderAnchor"), "{output}");
    assert!(!compact.contains("Object.is("), "{output}");
    assert!(!compact.contains("_$compiledCreateElement("), "{output}");
    assert!(!compact.contains("_$compiledAppendChild("), "{output}");
}

#[test]
fn template_shell_keeps_opaque_single_children_on_the_anchor_path() {
    let output = transform_module(
        r#"
const View = () => <section><div>{renderValue()}</div></section>;
"#,
    );
    let compact = compact(&output);

    assert!(compact.contains("renderAnchor"), "{output}");
    assert!(!compact.contains("_$compiledText("), "{output}");
}

#[test]
fn direct_text_candidates_keep_mixed_svg_and_table_boundaries_safe() {
    let output = transform_module_with_static_props(
        r#"
function Mixed(props) {
  return <div>prefix {props.value}</div>;
}
function SvgValue(props) {
  return <svg><text>{props.value}</text></svg>;
}
function TableValue(props) {
  return <table><tbody><tr><td>{props.value}</td></tr></tbody></table>;
}
const App = () => <><Mixed value="mixed" /><SvgValue value="svg" /><TableValue value="cell" /></>;
"#,
        true,
    );
    let compact = compact(&output);

    assert_eq!(compact.matches("rue:direct-text").count(), 1, "{output}");
    assert!(compact.contains("<div>prefix<!--rue:text-hole:0--></div>"), "{output}");
    assert!(compact.contains("<td>rue:direct-text</td>"), "{output}");
    assert!(compact.contains("_$createElement(\"svg\""), "{output}");
    assert!(!compact.contains("<text>rue:direct-text</text>"), "{output}");
}

#[test]
fn template_shell_supports_nested_mixed_text_holes() {
    let output = transform_module_with_static_props(
        r#"
function View(props) {
  return <section><div>{props.label} - {props.value}</div><p>prefix {props.note}<span>{props.tail}</span></p></section>;
}
const App = () => <View label="标签" value="值" note="说明" tail="结尾" />;
"#,
        true,
    );
    let compact = compact(&output);

    assert_eq!(compact.matches("const_$getTemplate1=_$template(").count(), 1, "{output}");
    assert_eq!(compact.matches(".content.cloneNode(true)").count(), 1, "{output}");
    assert_eq!(compact.matches("<!--rue:text-hole:").count(), 3, "{output}");
    assert_eq!(compact.matches("rue:direct-text").count(), 1, "{output}");
    assert_eq!(compact.matches("_$compiledCreateTextNode(\"\")").count(), 3, "{output}");
    assert!(compact.contains(".childNodes[0].childNodes[0]"), "{output}");
    assert!(compact.contains(".childNodes[0].childNodes[2]"), "{output}");
    assert!(compact.contains(".childNodes[1].childNodes[1]"), "{output}");
    assert!(compact.contains(".childNodes[1].childNodes[2].childNodes[0]"), "{output}");

    let first_dom_mutation = compact.find(".insertBefore(").expect("insert text hole");
    for path in [
        ".childNodes[0].childNodes[0]",
        ".childNodes[0].childNodes[2]",
        ".childNodes[1].childNodes[1]",
        ".childNodes[1].childNodes[2].childNodes[0]",
    ] {
        assert!(compact.find(path).expect("anchor path") < first_dom_mutation, "{output}");
    }
    assert_eq!(compact.matches(".insertBefore(").count(), 3, "{output}");
    assert_eq!(compact.matches(".removeChild(").count(), 3, "{output}");
    assert!(!compact.contains("_$compiledCreateElement("), "{output}");
    assert!(!compact.contains("_$compiledAppendChild("), "{output}");
}

#[test]
fn template_shell_accepts_inlined_safe_branch_local_text() {
    let output = transform_module_with_static_props(
        r#"
function View(props) {
  if (props.mode === 0) return <div>A · {props.label}</div>;
  const hello = 'hello';
  if (props.mode === 1) return <section>B · {props.label} · {hello}</section>;
  const world = 'world';
  return <article>C · {props.label} · {world}</article>;
}
const App = () => <View mode={0} label="初始" />;
"#,
        true,
    );
    let compact = compact(&output);

    assert_eq!(compact.matches("const_$getTemplate").count(), 3, "{output}");
    assert_eq!(compact.matches(".content.cloneNode(true)").count(), 3, "{output}");
    assert_eq!(compact.matches("<!--rue:text-hole:").count(), 3, "{output}");
    assert!(!compact.contains("_$compiledCreateElement("), "{output}");
    assert!(compact.contains("B·<!--rue:text-hole:0-->·hello"), "{output}");
    assert!(compact.contains("C·<!--rue:text-hole:0-->·world"), "{output}");
}

#[test]
fn template_shell_coalesces_adjacent_static_text_for_hole_paths() {
    let output = transform_module_with_static_props(
        r#"
function View(props) {
  return <div>{props.left} prefix {'fixed'} {props.right}</div>;
}
const App = () => <View left="左" right="右" />;
"#,
        true,
    );
    let compact = compact(&output);

    assert!(
        compact.contains("<!--rue:text-hole:0-->prefixfixed<!--rue:text-hole:1-->"),
        "{output}"
    );
    assert!(compact.contains("_root.childNodes[0]"), "{output}");
    assert!(compact.contains("_root.childNodes[2]"), "{output}");
    assert!(!compact.contains("_root.childNodes[3]"), "{output}");
}

#[test]
fn template_shell_deduplicates_equal_hole_shapes() {
    let output = transform_module_with_static_props(
        r#"
function First(props) {
  return <div>{props.label} - {props.value}</div>;
}
function Second(props) {
  return <div>{props.title} - {props.detail}</div>;
}
const App = () => <><First label="一" value="二" /><Second title="三" detail="四" /></>;
"#,
        true,
    );
    let compact = compact(&output);

    assert_eq!(compact.matches("const_$getTemplate1=_$template(").count(), 1, "{output}");
    assert_eq!(compact.matches("<!--rue:text-hole:").count(), 2, "{output}");
    assert_eq!(compact.matches(".content.cloneNode(true)").count(), 2, "{output}");
    assert_eq!(compact.matches("_$compiledCreateTextNode(\"\")").count(), 4, "{output}");
    assert_eq!(compact.matches("_$compiledText(").count(), 4, "{output}");
    assert!(!compact.contains("Object.is("), "{output}");
}

#[test]
fn template_shell_preserves_component_fallback_while_cloning_supported_holes() {
    let output = transform_module_with_static_props(
        r#"
function View(props) {
  return <>
    <div>{format(props.label)}</div>
    <div {...props.attrs}>{props.label}</div>
    <div><Child value={props.label} /></div>
    <ul>{props.items.map(item => item)}</ul>
    <div title={props.label}>{props.label}</div>
  </>;
}
const App = () => <View label="标签" attrs={{}} items={[]} />;
"#,
        true,
    );
    let compact = compact(&output);

    assert_eq!(compact.matches("<!--rue:text-hole:").count(), 2, "{output}");
    assert!(compact.contains("<div>rue:direct-text</div>"), "{output}");
    assert_eq!(compact.matches("<!--rue:opaque-hole:").count(), 1, "{output}");
    assert_eq!(compact.matches(".content.cloneNode(true)").count(), 5, "{output}");
    assert_eq!(compact.matches("_$template(").count(), 4, "{output}");
    assert!(compact.contains("_$createComponent(Child"), "{output}");
    assert!(!compact.contains("_$createElement(\"div\""), "{output}");
}

#[test]
fn component_children_collect_static_native_templates_without_crossing_component_semantics() {
    let output = transform_module(
        r#"
const DefaultChild = () => <Layout preview={<article>Prop only</article>}><section><h1>Title</h1></section></Layout>;
const MultipleChildren = () => <Layout><header>Header</header><main>Main</main></Layout>;
const NamedSlot = () => <SidebarPlayground><Template slot="sidebar"><aside>Sidebar</aside></Template></SidebarPlayground>;
"#,
    );
    let compact = compact(&output);

    assert_eq!(compact.matches("_$template(").count(), 4, "{output}");
    assert_eq!(compact.matches(".content.cloneNode(true)").count(), 4, "{output}");
    assert!(compact.contains("_$compiledRoot("), "{output}");
    assert!(!compact.contains("_$createElement(\"section\""), "{output}");
    assert!(!compact.contains("_$createElement(\"header\""), "{output}");
    assert!(!compact.contains("_$createElement(\"main\""), "{output}");
    assert!(!compact.contains("_$createElement(\"aside\""), "{output}");
    assert!(compact.contains("_$compiledCreateElement(\"article\""), "{output}");
    assert!(compact.contains("_$createComponent(Layout,()=>({"), "{output}");
    assert!(compact.contains("_$createComponent(SidebarPlayground,()=>({"), "{output}");
    assert!(compact.contains("\"sidebar\":"), "{output}");
    assert!(!compact.contains("_$template('<Layout"), "{output}");
    assert!(!compact.contains("_$template('<SidebarPlayground"), "{output}");
}

#[test]
fn avoids_user_template_identifier_collisions() {
    let output = transform_module(
        r#"
const _$template1 = "user-cache";
const _$getTemplate1 = () => "user-getter";
const View = () => <div>hello</div>;
"#,
    );
    let compact = compact(&output);

    assert!(compact.contains("_$compiledCreateElement(\"div\""), "{output}");
    assert!(!compact.contains("const_$getTemplate2"), "{output}");
    assert_eq!(compact.matches("const_$template1=\"user-cache\"").count(), 1, "{output}");
}

#[test]
fn preserves_directive_prologues_and_rejects_parser_sensitive_html() {
    let output = transform_module(
        r#"
"use client";
import { type FC } from "@rue-js/rue";
const View: FC = () => <div>hello</div>;
const Textarea = () => <textarea value={"hello"} />;
const Select = label => <select value={"a"}><option value="a">{label}</option></select>;
const Body = content => <body>{content}</body>;
"#,
    );
    let compact = compact(&output);
    let directive = compact.find("\"useclient\";").expect("directive prologue");
    let type_import = compact.find("from\"@rue-js/rue\";").expect("type import");
    let first_view = compact.find("constView").expect("first component");

    assert!(directive < type_import && type_import < first_view, "{output}");
    assert_eq!(compact.matches("_$createElement(").count(), 3, "{output}");
    assert!(compact.contains("_$setValue(_root,\"hello\")"), "{output}");
    assert!(compact.contains("_$setValue(_root,\"a\")"), "{output}");
    assert!(compact.contains("_$createElement(\"body\""), "{output}");
    assert!(!compact.contains("_$createElement(\"option\""), "{output}");
    assert!(compact.contains("<optionvalue=\"a\"><!--rue:text-hole:0--></option>"), "{output}");
}

#[test]
fn executes_lazy_static_template_mount_and_idempotent_dispose_in_jsdom() {
    let output = transform_module(
        r#"
const View = () => <div class="a"><span>hello</span></div>;
"#,
    );
    let executable = without_imports(&output);
    let script = format!(
        r#"
const {{ JSDOM }} = require("jsdom");
const cleanups = [];
const _$compiledPropsGet = (props, key) => props[key];
const _$compiledPropsSnapshot = props => props;
const _$compiledPropsCall = (fn, receiver, args) => Reflect.apply(fn, receiver, args);
const _$compiledRoot = setup => {{
  let mounted;
  return {{
  __rue_compiled_mount: parent => {{
    const result = setup(parent);
    mounted = result && result.__rue_compiled_host !== undefined ? result.__rue_compiled_host : result;
    return mounted;
  }},
  dispose() {{
    while (cleanups.length) cleanups.pop()();
    mounted?.remove();
  }}
  }};
}};
const _$compiledCreateElement = tag => document.createElement(tag);
const _$compiledCreateTextNode = value => document.createTextNode(value);
const _$compiledAppendChild = (parent, child) => parent.appendChild(child);
{executable}
if (typeof document !== "undefined") throw new Error("module evaluation touched document");
const dom = new JSDOM("<!doctype html><body></body>");
global.document = dom.window.document;
let templateCreates = 0;
const createElement = document.createElement.bind(document);
document.createElement = tag => {{
  if (tag === "template") templateCreates += 1;
  return createElement(tag);
}};
const first = View();
if (templateCreates !== 0) throw new Error("template initialized before setup");
const firstContainer = document.createElement("main");
const firstRoot = first.__rue_compiled_mount(firstContainer);
firstContainer.appendChild(firstRoot);
if (firstContainer.innerHTML !== '<div class="a"><span>hello</span></div>') {{
  throw new Error(`unexpected DOM: ${{firstContainer.innerHTML}}`);
}}
if (templateCreates !== 0) throw new Error(`unexpected template creation: ${{templateCreates}}`);
first.dispose();
first.dispose();
if (firstContainer.innerHTML !== "") throw new Error("dispose was not idempotent");
const second = View();
const secondContainer = document.createElement("main");
secondContainer.appendChild(second.__rue_compiled_mount(secondContainer));
if (templateCreates !== 0) throw new Error("compiled constructors created a template");
delete global.document;
"#,
    );

    let result = Command::new("node")
        .args(["-e", &script])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .expect("run generated JavaScript in jsdom");
    assert!(
        result.status.success(),
        "node failed\nstdout:\n{}\nstderr:\n{}\ngenerated:\n{}",
        String::from_utf8_lossy(&result.stdout),
        String::from_utf8_lossy(&result.stderr),
        executable,
    );
}

#[test]
fn template_skeleton_reuses_dynamic_attrs_events_refs_and_spread_in_source_order() {
    let compiled_output = transform_module(
        r#"
import { signal } from '@rue-js/rue';
const CompiledView = props => {
  const state = signal(0);
  props.state = state;
  return (
    <section
      className={state.get() === 0 ? 'first' : 'second'}
      style={String(state.get() === 0 ? 'color: red' : 'color: blue')}
      title={state.get() === 0 ? 'initial' : 'updated'}
    >
      <input value={String(state.get() === 0 ? 'one' : 'two')} disabled={Boolean(state.get())} ref={props.inputRef} />
      <button onClick={props.onClick} onFocusCapture={props.onFocus}>Save</button>
    </section>
  );
};
"#,
    );
    let compiled = compact(&compiled_output);
    assert_eq!(compiled.matches(".content.cloneNode(true)").count(), 1, "{compiled_output}");
    assert!(compiled.contains("_$template("), "{compiled_output}");
    assert!(!compiled.contains("_$compiledCreateElement("), "{compiled_output}");
    assert!(!compiled.contains("_$createElement("), "{compiled_output}");
    assert!(compiled.contains(".childNodes[0]"), "{compiled_output}");
    assert!(compiled.contains(".childNodes[1]"), "{compiled_output}");
    assert!(compiled.contains(".addEventListener(\"click\""), "{compiled_output}");
    assert!(compiled.contains(".removeEventListener(\"click\""), "{compiled_output}");
    assert!(compiled.contains("capture:true"), "{compiled_output}");

    let vapor_output = transform_module(
        r#"
const SpreadView = props => (
  <article data-phase="before" {...props.spread} title="after" ref={props.articleRef}>
    <span className={props.labelClass}>Label</span>
  </article>
);
"#,
    );
    let vapor = compact(&vapor_output);
    assert_eq!(vapor.matches(".content.cloneNode(true)").count(), 1, "{vapor_output}");
    assert!(vapor.contains("_$template("), "{vapor_output}");
    assert!(!vapor.contains("_$createElement(\"article\""), "{vapor_output}");
    assert!(!vapor.contains("_$createElement(\"span\""), "{vapor_output}");
    let before = vapor.find("_el1.setAttribute(\"data-phase\",\"before\")").expect("before attr");
    let spread = vapor
        .find("_$compiledSpreadAttributes(_el1,()=>_$compiledPropsGet(props,\"spread\"),[\"title\",\"ref\",\"__rue_static_template_id__\"])")
        .expect("spread attr");
    let after = vapor.find("_el1.setAttribute(\"title\",\"after\")").expect("after attr");
    assert!(before < spread && spread < after, "{vapor_output}");

    let compiled_executable = without_imports(&compiled_output);
    let compiled_script = format!(
        r#"
const {{ JSDOM }} = require("jsdom");
const dom = new JSDOM("<!doctype html><body></body>");
global.document = dom.window.document;
const effects = [];
const cleanups = [];
const effect = fn => {{ effects.push(fn); fn(); }};
const onCleanup = fn => cleanups.push(fn);
const _$compiledWithHookId = (_id, fn) => fn();
const useSetup = fn => fn();
const _$compiledSetup = (_id, fn) => fn();
const _$compiledPropsGet = (props, key) => props[key];
const _$compiledPropsSnapshot = props => props;
const _$compiledPropsCall = (fn, receiver, args) => Reflect.apply(fn, receiver, args);
const _$compiledRoot = setup => ({{
  __rue_compiled_mount: parent => {{
    const result = setup(parent);
    return result && result.__rue_compiled_host !== undefined ? result.__rue_compiled_host : result;
  }},
  dispose() {{ while (cleanups.length) cleanups.pop()(); }}
}});
const _$template = html => {{
  let cached;
  return () => {{
    if (!cached) {{
      cached = document.createElement("template");
      cached.innerHTML = html;
    }}
    return cached;
  }};
}};
const signal = value => ({{ get: () => value, set: next => {{ value = next; }} }});
const _$setStyle = (el, value) => {{ el.style.cssText = value == null ? "" : String(value); }};
const _$setValue = (el, value) => {{ el.value = value == null ? "" : String(value); }};
const onOwnerCleanup = fn => cleanups.push(fn);
{compiled_executable}
const calls = [];
const refs = [];
const props = {{
  inputRef: value => refs.push(value),
  onClick: () => calls.push("click:first"),
  onFocus: () => calls.push("focus:first")
}};
const handle = CompiledView(props);
const host = document.createElement("main");
const root = handle.__rue_compiled_mount(host);
host.appendChild(root);
const input = host.querySelector("input");
const button = host.querySelector("button");
if (host.innerHTML !== '<section class="first" style="color: red;" title="initial"><input><button>Save</button></section>') throw new Error(`initial DOM: ${{host.innerHTML}}`);
if (input.value !== "one" || input.disabled) throw new Error("initial input state");
if (refs.length !== 1 || refs[0] !== input) throw new Error("initial ref");
button.dispatchEvent(new dom.window.MouseEvent("click", {{ bubbles: true }}));
button.dispatchEvent(new dom.window.FocusEvent("focus", {{ bubbles: false }}));
props.state.set(1);
props.onClick = () => calls.push("click:second");
for (const run of effects) run();
if (root.className !== "second" || root.style.color !== "blue" || root.title !== "updated") throw new Error(`updated attrs: ${{host.innerHTML}}`);
if (input.value !== "two" || !input.disabled) throw new Error("updated input state");
button.dispatchEvent(new dom.window.MouseEvent("click", {{ bubbles: true }}));
if (calls.join(",") !== "click:first,focus:first,click:second") throw new Error(`events: ${{calls}}`);
handle.dispose();
button.dispatchEvent(new dom.window.MouseEvent("click", {{ bubbles: true }}));
if (calls.length !== 3) throw new Error("event cleanup");
if (refs.length !== 2 || refs[1] !== null) throw new Error("ref cleanup");
delete global.document;
"#,
    );
    let result = Command::new("node")
        .args(["-e", &compiled_script])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .expect("run compiled attribute skeleton in jsdom");
    assert!(
        result.status.success(),
        "compiled jsdom failed\nstdout:\n{}\nstderr:\n{}\ngenerated:\n{}",
        String::from_utf8_lossy(&result.stdout),
        String::from_utf8_lossy(&result.stderr),
        compiled_output,
    );

    let vapor_executable = without_imports(&vapor_output);
    let vapor_script = format!(
        r#"
const {{ JSDOM }} = require("jsdom");
const dom = new JSDOM("<!doctype html><body></body>");
global.document = dom.window.document;
const effects = [];
const cleanups = [];
const watchEffect = fn => {{ effects.push(fn); fn(); }};
const effect = fn => {{ effects.push(fn); fn(); }};
const vapor = setup => ({{
  __rue_compiled_mount: setup,
  dispose() {{ while (cleanups.length) cleanups.pop()(); }}
}});
const _$compiledPropsGet = (props, key) => props[key];
const _$compiledPropsSnapshot = props => props;
const _$compiledPropsCall = (fn, receiver, args) => Reflect.apply(fn, receiver, args);
const _$compiledRoot = setup => ({{
  __rue_compiled_mount: parent => {{
    const result = setup(parent);
    return result && result.__rue_compiled_host !== undefined ? result.__rue_compiled_host : result;
  }},
  dispose() {{ while (cleanups.length) cleanups.pop()(); }}
}});
const _$template = html => {{
  let cached;
  return () => {{
    if (!cached) {{
      cached = document.createElement("template");
      cached.innerHTML = html;
    }}
    return cached;
  }};
}};
const _$setAttribute = (el, name, value) => el.setAttribute(name, value);
const _$setClassName = (el, value) => {{ el.className = value == null ? "" : String(value); }};
const _$spreadAttributes = (el, value) => {{
  for (const [name, next] of Object.entries(value || {{}})) el.setAttribute(name, String(next));
}};
const _$compiledSpreadAttributes = (el, read, excluded) => {{
  const blocked = new Set(excluded || []);
  for (const [name, next] of Object.entries(read() || {{}})) {{
    if (!blocked.has(name)) el.setAttribute(name, String(next));
  }}
}};
const onOwnerCleanup = fn => cleanups.push(fn);
const _$compiledBindUseRef = (el, read) => {{
  const ref = read();
  if (typeof ref === "function") ref(el);
  else if (ref && typeof ref === "object" && "current" in ref) ref.current = el;
  cleanups.push(() => {{
    if (typeof ref === "function") ref(null);
    else if (ref && typeof ref === "object" && "current" in ref) ref.current = null;
  }});
}};
{vapor_executable}
const refs = [];
const props = {{
  spread: {{ "data-phase": "spread", title: "spread" }},
  articleRef: value => refs.push(value),
  labelClass: "first"
}};
const handle = SpreadView(props);
const host = document.createElement("main");
const root = handle.__rue_compiled_mount(host);
host.appendChild(root);
const label = host.querySelector("span");
if (root.getAttribute("data-phase") !== "spread") throw new Error(`spread did not override before: ${{host.innerHTML}}`);
if (root.title !== "after") throw new Error(`static after did not override spread: ${{host.innerHTML}}`);
if (label.className !== "first") throw new Error(`initial nested binding: ${{host.innerHTML}}`);
if (refs.length !== 1 || refs[0] !== root) throw new Error("initial vapor ref");
props.labelClass = "second";
effects[effects.length - 1]();
if (label.className !== "second") throw new Error(`updated nested binding: ${{host.innerHTML}}`);
handle.dispose();
if (refs.length !== 2 || refs[1] !== null) throw new Error("vapor ref cleanup");
delete global.document;
"#,
    );
    let result = Command::new("node")
        .args(["-e", &vapor_script])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .expect("run vapor attribute skeleton in jsdom");
    assert!(
        result.status.success(),
        "vapor jsdom failed\nstdout:\n{}\nstderr:\n{}\ngenerated:\n{}",
        String::from_utf8_lossy(&result.stdout),
        String::from_utf8_lossy(&result.stderr),
        vapor_output,
    );
}

#[test]
fn template_skeleton_keeps_explicit_attributes_after_reactive_spread_updates() {
    let output = transform_module(
        r#"
const View = props => (
  <main data-before="fixed" {...props.spread} title="explicit" data-after={props.after}>
    <span>stable</span>
  </main>
);
"#,
    );
    let compact = compact(&output);

    assert!(
        compact.contains("_$compiledSpreadAttributes(_el1,()=>_$compiledPropsGet(props,\"spread\"),[\"title\",\"data-after\",\"__rue_static_template_id__\"]);"),
        "{output}"
    );
    assert!(compact.contains("_el1.setAttribute(\"title\",\"explicit\")"), "{output}");
    assert!(!compact.contains("_$createElement(\"main\""), "{output}");
}

#[test]
fn template_skeleton_mounts_expression_control_flow_and_lists_at_precomputed_holes() {
    let output = transform_module(
        r#"
const View = props => {
  const local = props.local;
  return (
    <section className={props.className}>
      <i data-static="before">before</i>
      {props.value}
      {props.show ? <b>shown</b> : null}
      {local}
      {props.items.map(item => <em key={item.id}>{item.label}</em>)}
      {props.labels.map(label => <span>{label}</span>)}
      <i data-static="after">after</i>
    </section>
  );
};
"#,
    );
    let compact = compact(&output);

    assert_eq!(compact.matches("rue:text-hole:").count(), 5, "{output}");
    assert_eq!(compact.matches("rue:row-text").count(), 1, "{output}");
    assert!(!compact.contains("_$createElement(\"section\""), "{output}");
    assert!(!compact.contains("_$createElement(\"i\""), "{output}");
    assert!(compact.contains("_$compiledText("), "{output}");
    assert!(compact.contains("_$compiledBranchAt("), "{output}");
    assert!(compact.contains("_$reconcileKeyed("), "{output}");
    assert_eq!(compact.matches(".content.cloneNode(true)").count(), 2, "{output}");
    assert!(!compact.contains("_$compiledKeyedList({"), "{output}");

    let first_mount = ["_$compiledText(", "_$compiledBranchAt(", "_$reconcileKeyed("]
        .into_iter()
        .filter_map(|needle| compact.find(needle))
        .min()
        .expect("first hole mount");
    let last_path = compact[..first_mount].rfind(".childNodes[").expect("precomputed hole path");
    assert!(last_path < first_mount, "all hole paths must resolve before mounting\n{output}");

    let executable = without_imports(&output);
    let script = format!(
        r#"
const {{ JSDOM }} = require("jsdom");
const dom = new JSDOM("<!doctype html><body></body>");
global.document = dom.window.document;
const effects = [];
const cleanups = [];
let activeEffect;
const registerEffect = fn => {{
  let active = true;
  const run = () => {{
    if (!active) return;
    const previous = activeEffect;
    activeEffect = run;
    try {{ fn(); }} finally {{ activeEffect = previous; }}
  }};
  effects.push(run);
  cleanups.push(() => {{ active = false; }});
  run();
}};
const watchEffect = registerEffect;
const effect = registerEffect;
const _$compiledRenderEffect = registerEffect;
const onOwnerCleanup = cleanup => cleanups.push(cleanup);
const _$compiledText = (node, read) => {{
  let previous;
  effect(() => {{
    const raw = read();
    const next = raw == null || typeof raw === "boolean" ? "" : String(raw);
    if (Object.is(previous, next)) return;
    previous = next;
    node.textContent = next;
  }});
}};
const untrack = fn => fn();
const computed = read => ({{ get: read }});
const _$compiledWithHookId = (_id, fn) => fn();
const useSetup = fn => fn();
const _$compiledSetup = (_id, fn) => fn();
const vapor = setup => ({{
  __rue_compiled_mount: setup,
  dispose() {{ while (cleanups.length) cleanups.pop()(); }}
}});
const _$compiledPropsGet = (props, key) => props[key];
const _$compiledPropsSnapshot = props => props;
const _$compiledPropsCall = (fn, receiver, args) => Reflect.apply(fn, receiver, args);
const _$compiledRoot = setup => ({{
  __rue_compiled_mount: parent => {{
    const result = setup(parent);
    return result && result.__rue_compiled_host !== undefined ? result.__rue_compiled_host : result;
  }},
  dispose() {{ while (cleanups.length) cleanups.pop()(); }}
}});
const _$compiledSignal = initial => {{
  let value = initial;
  const subscribers = new Set();
  return {{
    get: () => {{ if (activeEffect) subscribers.add(activeEffect); return value; }},
    set: next => {{ value = next; for (const run of [...subscribers]) run(); }}
  }};
}};
const _$mountCompiledSlotFactory = (target, _owner, create) => {{
  const handle = create();
  const host = handle.__rue_compiled_mount(target.parent);
  const node = host.nodeType === 11 ? host.firstChild : host;
  if (host.nodeType === 11) target.parent.insertBefore(host, target.before);
  else target.parent.insertBefore(node, target.before);
  return {{ node, dispose: () => handle.dispose?.() }};
}};
const _$mountCompiledKeyedRow = (mount, patch) => {{
  const parent = document.createDocumentFragment();
  return {{ ...mount({{ parent, before: null }}, {{}}, null), patch }};
}};
const _$mountCompiledKeyedRowOwnerless = (setup, patch, target) => {{
  const parent = target?.parent || document.createDocumentFragment();
  const result = setup(parent);
  const roots = result && result.__rue_compiled_roots ? [...result.__rue_compiled_roots] : [result];
  for (const root of roots) if (root.parentNode !== parent) parent.insertBefore(root, target?.before || null);
  return {{ node: roots[0], last: roots.at(-1), patch, dispose() {{}} }};
}};
const _$mountCompiledKeyedSingleRowOwnerless = _$mountCompiledKeyedRowOwnerless;
const _$mountCompiledKeyedRowSetup = (setup, patch, target) => {{
  const start = cleanups.length;
  const row = _$mountCompiledKeyedRowOwnerless(setup, patch, target);
  const owned = cleanups.splice(start);
  row.dispose = () => {{ for (const cleanup of owned.splice(0)) cleanup(); }};
  return row;
}};
const _$disposeCompiledKeyedRows = rows => {{ for (const row of rows) row.dispose(); }};
const _$template = html => {{
  let cached;
  return () => {{
    if (!cached) {{
      cached = document.createElement("template");
      cached.innerHTML = html;
    }}
    return cached;
  }};
}};
const _$createComment = text => document.createComment(text);
const _$createDocumentFragment = () => document.createDocumentFragment();
const _$createElement = tag => document.createElement(tag);
const _$compiledCreateElement = tag => document.createElement(tag);
const _$compiledCreateTextNode = text => document.createTextNode(text);
const _$compiledAppendChild = (parent, child) => parent.appendChild(child);
const _$appendChild = (parent, child) => parent.appendChild(child);
const _$createTextWrapper = () => document.createTextNode("");
const _$settextContent = (node, value) => {{
  node.textContent = value == null || typeof value === "boolean" ? "" : String(value);
}};
const _$setClassName = (node, value) => {{ node.className = value == null ? "" : String(value); }};
const rendered = new WeakMap();
const nodesFor = value => {{
  if (value == null || typeof value === "boolean") return [];
  if (Array.isArray(value)) return value.flatMap(nodesFor);
  if (value && typeof value.__rue_compiled_mount === "function") {{
    return nodesFor(value.__rue_compiled_mount(null));
  }}
  if (value && typeof value.nodeType === "number") {{
    return value.nodeType === 11 ? Array.from(value.childNodes) : [value];
  }}
  return [document.createTextNode(String(value))];
}};
const renderAnchor = (value, parent, anchor) => {{
  for (const node of rendered.get(anchor) || []) if (node.parentNode === parent) parent.removeChild(node);
  const nodes = nodesFor(value);
  for (const node of nodes) parent.insertBefore(node, anchor);
  rendered.set(anchor, nodes);
}};
const _$mountCompiledSlotAt = (target, read) => effect(() => {{
  renderAnchor(read(), target.parent, target.before);
}});
const branchKeys = new WeakMap();
const _$compiledBranchAt = (parent, anchor, read) => effect(() => {{
  const selection = read();
  const keyed = selection && typeof selection === "object" && "__rue_compiled_branch_key" in selection;
  const key = keyed ? selection.__rue_compiled_branch_key : Symbol();
  if (branchKeys.has(anchor) && Object.is(branchKeys.get(anchor), key)) return;
  branchKeys.set(anchor, key);
  renderAnchor(keyed ? selection.create() : selection, parent, anchor);
}});
const _$reconcileKeyed = (parent, before, previous, items, getKey, renderItem) => {{
  const old = new Map(previous.map(entry => [entry.key, entry]));
  const next = items.map((item, index) => {{
    const key = getKey(item, index);
    let entry = old.get(key);
    if (entry) {{
      entry.patch(item, index);
      old.delete(key);
    }} else {{
      entry = {{ key, ...renderItem(item, index) }};
    }}
    parent.insertBefore(entry.node, before);
    return entry;
  }});
  for (const entry of old.values()) {{
    entry.dispose();
    if (entry.node.parentNode === parent) parent.removeChild(entry.node);
  }}
  return next;
}};
const _$reconcileKeyedSingle = _$reconcileKeyed;
const _$compiledKeyedList = (options) => {{
  let cursor = options.start.nextSibling;
  while (cursor && cursor !== options.before) {{
    const next = cursor.nextSibling;
    options.parent.removeChild(cursor);
    cursor = next;
  }}
  const next = new Map();
  options.items.forEach((item, index) => {{
    const anchor = document.createComment("row");
    options.parent.insertBefore(anchor, options.before);
    options.renderItem(item, options.parent, anchor, anchor, index);
    next.set(options.getKey(item, index), anchor);
  }});
  return next;
}};
{executable}
const props = {{
  className: "initial",
  value: "one",
  show: true,
  local: "local",
  items: [{{ id: "a", label: "A" }}, {{ id: "b", label: "B" }}],
  labels: ["x", "y"]
}};
const handle = View(props);
const host = document.createElement("main");
const root = handle.__rue_compiled_mount(host);
host.appendChild(root);
const before = root.querySelector('[data-static="before"]');
const after = root.querySelector('[data-static="after"]');
const holes = Array.from(root.childNodes).filter(node => node.nodeType === 8 && node.data.startsWith("rue:text-hole:"));
const [rowA, rowB] = root.querySelectorAll("em");
if (root.textContent !== "beforeoneshownlocalABxyafter") throw new Error(`initial DOM: ${{root.innerHTML}}`);
if (holes.length !== 4) throw new Error(`initial holes: ${{root.innerHTML}}`);

props.className = "updated";
props.value = null;
props.show = false;
props.local = true;
props.items = [{{ id: "b", label: "B2" }}, {{ id: "a", label: "A2" }}];
props.labels = ["z"];
for (const run of [...effects]) run();
for (const run of [...effects]) run();
const rows = root.querySelectorAll("em");
if (root.textContent !== "beforeB2A2zafter") throw new Error(`updated DOM: ${{root.innerHTML}}`);
if (root.className !== "updated") throw new Error("attribute update");
if (root.querySelector('[data-static="before"]') !== before || root.querySelector('[data-static="after"]') !== after) throw new Error("static sibling identity");
if (rows[0] !== rowB || rows[1] !== rowA) throw new Error("keyed row identity");
const nextHoles = Array.from(root.childNodes).filter(node => node.nodeType === 8 && node.data.startsWith("rue:text-hole:"));
if (nextHoles.length !== holes.length || nextHoles.some((node, index) => node !== holes[index])) throw new Error("hole identity");

handle.dispose();
const disposed = root.innerHTML;
props.value = "late";
props.items = [{{ id: "c", label: "C" }}];
for (const run of effects) run();
if (root.innerHTML !== disposed) throw new Error("disposed effects updated DOM");
delete global.document;
"#,
    );
    let result = Command::new("node")
        .args(["-e", &script])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .expect("run expression/list template skeleton in jsdom");
    assert!(
        result.status.success(),
        "jsdom failed\nstdout:\n{}\nstderr:\n{}\ngenerated:\n{}",
        String::from_utf8_lossy(&result.stdout),
        String::from_utf8_lossy(&result.stderr),
        output,
    );
}

#[test]
fn template_skeleton_mounts_components_and_preserves_lazy_slots_at_opaque_holes() {
    let output = transform_module_with_static_props(
        r#"
function CompiledPanel(props) {
  return <strong>{props.label}</strong>;
}
const View = props => (
  <Layout>
    <section data-shell="stable">
      <i>before</i>
      <Panel>{() => { props.panelSlotCalls += 1; return props.label; }}</Panel>
      <CompiledPanel label={props.label} />
      <Widgets.Member />
      <x-card><Template slot="detail">{() => { props.detailSlotCalls += 1; return props.detail; }}</Template></x-card>
      <svg><circle cx="1" cy="1" r="1" /></svg>
      <math><mi>x</mi></math>
      <i>after</i>
    </section>
    <Template slot="aside"><aside>{() => { props.asideSlotCalls += 1; return props.aside; }}</aside></Template>
  </Layout>
);
"#,
        true,
    );
    let compact = compact(&output);

    assert!(
        compact.contains(
            "<sectiondata-shell=\"stable\"><i>before</i><!--rue:opaque-hole:0--><!--rue:opaque-hole:1--><!--rue:opaque-hole:2--><!--rue:opaque-hole:3--><!--rue:opaque-hole:4--><!--rue:opaque-hole:5--><i>after</i></section>"
        ),
        "{output}"
    );
    assert_eq!(compact.matches(".content.cloneNode(true)").count(), 3, "{output}");
    assert!(compact.contains("_$createComponent(Panel"), "{output}");
    assert!(compact.contains("_$compiledComponent(CompiledPanel"), "{output}");
    assert!(compact.contains("_$mountCompiledSlotAt({parent:"), "{output}");
    assert!(compact.contains("_$createComponent(Widgets.Member"), "{output}");
    assert!(compact.contains("_$createElement(\"x-card\""), "{output}");
    assert!(compact.contains("_$createElement(\"svg\""), "{output}");
    assert!(compact.contains("_$createElement(\"math\""), "{output}");
    assert!(compact.contains("\"aside\":__child1"), "{output}");
    assert!(compact.contains("\"detail\":()=>"), "{output}");
    assert!(!compact.contains("_$createElement(\"section\""), "{output}");
    assert!(!compact.contains("_$createElement(\"i\""), "{output}");

    let executable = without_imports(&output);
    let script = format!(
        r#"
const {{ JSDOM }} = require("jsdom");
const dom = new JSDOM("<!doctype html><body></body>");
global.document = dom.window.document;
let activeBucket = null;
const effects = [];
const watchEffects = [];
const counters = {{ panelSetup: 0, panelCleanup: 0, memberSetup: 0, memberCleanup: 0, compiledCleanup: 0 }};
const ownedHandle = (setup, onDispose = () => {{}}) => {{
  const bucket = [];
  let disposed = false;
  return {{
    __rue_compiled_mount(parent) {{
      const previous = activeBucket;
      activeBucket = bucket;
      try {{ return setup(parent); }} finally {{ activeBucket = previous; }}
    }},
    dispose() {{
      if (disposed) return;
      disposed = true;
      while (bucket.length) bucket.pop()();
      onDispose();
    }}
  }};
}};
const vapor = setup => ownedHandle(setup);
const _$compiledPropsGet = (props, key) => props[key];
const _$compiledPropsSnapshot = props => props;
const _$compiledPropsCall = (fn, receiver, args) => Reflect.apply(fn, receiver, args);
const _$compiledRoot = setup => ownedHandle(parent => {{
  const result = setup(parent);
  return result && result.__rue_compiled_host !== undefined ? result.__rue_compiled_host : result;
}}, () => {{ counters.compiledCleanup += 1; }});
const _$withCompiledPropsUpdater = (handle, update) => {{ handle.__update = update; return handle; }};
const _$compiledSignal = value => ({{ get: () => value, set: next => {{ value = next; }} }});
const _$compiledBatch = fn => fn();
const effect = fn => {{ effects.push(fn); fn(); }};
const _$compiledSetup = (_id, fn) => fn();
const _$compiledText = (node, read) => {{
  let previous;
  effect(() => {{
    const raw = read();
    const next = raw == null || typeof raw === "boolean" ? "" : String(raw);
    if (Object.is(previous, next)) return;
    previous = next;
    node.textContent = next;
  }});
}};
const watchEffect = fn => {{ watchEffects.push(fn); fn(); }};
const untrack = fn => fn();
const getCurrentInstance = () => null;
const _$template = html => {{
  let cached;
  return () => {{
    if (!cached) {{ cached = document.createElement("template"); cached.innerHTML = html; }}
    return cached;
  }};
}};
const _$createDocumentFragment = () => document.createDocumentFragment();
const _$compiledCreateDocumentFragment = () => document.createDocumentFragment();
const _$createTextNode = value => document.createTextNode(value);
const _$compiledCreateTextNode = value => document.createTextNode(value);
const _$appendChild = (parent, child) => parent.appendChild(child);
const _$setAttribute = (node, name, value) => node.setAttribute(name, value);
const _$setProperty = (node, name, value) => {{ node[name] = value; }};
const getCurrentOwner = () => null;
const _$createElement = (tag, parent) => {{
  const svg = "http://www.w3.org/2000/svg";
  const math = "http://www.w3.org/1998/Math/MathML";
  if (tag === "svg" || parent?.namespaceURI === svg) return document.createElementNS(svg, tag);
  if (tag === "math" || parent?.namespaceURI === math) return document.createElementNS(math, tag);
  return document.createElement(tag);
}};
const _$createComponent = (factory, readProps) => factory(
  typeof readProps === "function" ? readProps() : readProps
);
const anchorState = new WeakMap();
const renderAnchor = (value, parent, anchor) => {{
  const previous = anchorState.get(anchor);
  if (previous) {{
    previous.dispose?.();
    for (const node of previous.nodes) if (node.parentNode === parent) parent.removeChild(node);
  }}
  if (typeof value === "function") value = value();
  let dispose;
  let result = value;
  if (value && typeof value.__rue_compiled_mount === "function") {{
    result = value.__rue_compiled_mount(parent);
    dispose = () => value.dispose();
  }}
  const nodes = result == null || typeof result === "boolean"
    ? []
    : result.nodeType === 11
      ? Array.from(result.childNodes)
      : result.nodeType
        ? [result]
        : [document.createTextNode(String(result))];
  for (const node of nodes) parent.insertBefore(node, anchor);
  anchorState.set(anchor, {{ nodes, dispose }});
  if (activeBucket && !previous) activeBucket.push(() => {{
    const current = anchorState.get(anchor);
    current?.dispose?.();
    for (const node of current?.nodes || []) if (node.parentNode === parent) parent.removeChild(node);
    anchorState.delete(anchor);
  }});
}};
const _$mountCompiledComponent = (parent, factory, readProps) => {{
  const handle = factory(readProps());
  const result = handle.__rue_compiled_mount(parent);
  if (result != null && (result.nodeType === 11 || result.parentNode !== parent)) parent.appendChild(result);
  if (activeBucket) activeBucket.push(() => handle.dispose());
  let initial = true;
  effect(() => {{
    const next = readProps();
    if (initial) initial = false;
    else handle.__update(next);
  }});
  return result;
}};
const _$compiledComponent = (factory, readProps) => {{
  const handle = factory(readProps());
  let initialized = false;
  return {{
    __rue_compiled_mount(parent) {{
      const result = handle.__rue_compiled_mount(parent);
      effect(() => {{
        const next = readProps();
        if (initialized) handle.__update?.(next);
        else initialized = true;
      }});
      return result;
    }},
    dispose() {{ handle.dispose?.(); }}
  }};
}};
const _$mountCompiledSlotFactory = (target, _owner, create) => {{
  const handle = create();
  const result = handle.__rue_compiled_mount(target.parent);
  const nodes = result?.nodeType === 11 ? Array.from(result.childNodes) : result ? [result] : [];
  for (const node of nodes) target.parent.insertBefore(node, target.before);
  return {{ node: nodes[0] ?? null, last: nodes.at(-1) ?? null, dispose: () => handle.dispose?.() }};
}};
const _$mountCompiledSlotAt = (target, read) => {{
  let mounted;
  let previous;
  effect(() => {{
    const value = read();
    if (Object.is(previous, value)) return;
    previous = value;
    mounted?.dispose?.();
    mounted = typeof value === "function"
      ? value(target, {{}}, null)
      : (() => {{ renderAnchor(value, target.parent, target.before); return null; }})();
  }});
  if (activeBucket) activeBucket.push(() => mounted?.dispose?.());
}};
{executable}
const appendHandle = (handle, parent) => {{
  const result = handle.__rue_compiled_mount(parent);
  if (result != null) parent.appendChild(result);
  if (activeBucket) activeBucket.push(() => handle.dispose());
}};
const Panel = props => ownedHandle(() => {{
  counters.panelSetup += 1;
  const span = document.createElement("span");
  span.setAttribute("data-panel", "");
  span.textContent = props.__rue_slots.default();
  return span;
}}, () => {{ counters.panelCleanup += 1; }});
const Widgets = {{
  Member: () => ownedHandle(() => {{
    counters.memberSetup += 1;
    const mark = document.createElement("mark");
    mark.textContent = "member";
    return mark;
  }}, () => {{ counters.memberCleanup += 1; }})
}};
const Layout = props => ownedHandle(() => {{
  const fragment = document.createDocumentFragment();
  appendHandle(props.__rue_slots.default, fragment);
  appendHandle(props.__rue_slots.aside, fragment);
  return fragment;
}});
const props = {{
  label: "initial", detail: "detail", aside: "aside",
  panelSlotCalls: 0, detailSlotCalls: 0, asideSlotCalls: 0
}};
const handle = View(props);
if (props.panelSlotCalls || props.detailSlotCalls || props.asideSlotCalls) throw new Error("slot factory ran before mount");
const host = document.createElement("main");
host.appendChild(handle.__rue_compiled_mount(host));
const section = host.querySelector("section");
const staticBefore = section.firstElementChild;
const staticAfter = section.lastElementChild;
if (section.getAttribute("data-shell") !== "stable") throw new Error(`missing shell: ${{host.innerHTML}}`);
if (counters.panelSetup !== 1 || counters.memberSetup !== 1) throw new Error(`setup counts: ${{JSON.stringify(counters)}}`);
if (props.panelSlotCalls !== 1 || props.asideSlotCalls !== 1 || props.detailSlotCalls !== 0) throw new Error(`slot counts: ${{JSON.stringify(props)}}`);
if (section.querySelector("span[data-panel]")?.textContent !== "initial") throw new Error(`panel mount: ${{section.innerHTML}}`);
if (section.querySelector("strong")?.textContent !== "initial") throw new Error(`compiled mount: ${{section.innerHTML}}`);
if (section.querySelector("mark")?.textContent !== "member") throw new Error(`member mount: ${{section.innerHTML}}`);
if (!section.querySelector("x-card") || !section.querySelector("svg circle") || !section.querySelector("math mi")) throw new Error(`opaque mounts: ${{section.innerHTML}}`);
if (host.querySelector("aside")?.textContent !== "aside") throw new Error(`named slot: ${{host.innerHTML}}`);
props.label = "updated";
for (const run of effects) run();
for (const run of effects) run();
if (section.querySelector("strong")?.textContent !== "updated") throw new Error(`compiled update: ${{section.innerHTML}}`);
if (section.firstElementChild !== staticBefore || section.lastElementChild !== staticAfter) throw new Error("static sibling identity changed");
handle.dispose();
handle.dispose();
if (counters.panelCleanup !== counters.panelSetup || counters.memberCleanup !== 1 || counters.compiledCleanup !== 3) throw new Error(`cleanup counts: ${{JSON.stringify(counters)}}`);
delete global.document;
"#,
    );
    let result = Command::new("node")
        .args(["-e", &script])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .expect("run component and opaque-hole template skeleton in jsdom");
    assert!(
        result.status.success(),
        "jsdom failed\nstdout:\n{}\nstderr:\n{}\ngenerated:\n{}",
        String::from_utf8_lossy(&result.stdout),
        String::from_utf8_lossy(&result.stderr),
        output,
    );
}

#[test]
fn ordinary_template_keeps_comment_text_holes() {
    let output = transform_module("const View = () => <div>{count.get()}</div>;");
    assert!(output.contains("rue:text-hole"), "{output}");
    assert!(!output.contains("rue:row-text"), "{output}");
}
