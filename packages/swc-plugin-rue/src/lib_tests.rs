use super::*;
use std::sync::Arc;
use swc_core::common::sync::OnceCell;
use swc_core::common::{FileName, Mark, SourceMap};
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_core::plugin::proxies::PluginSourceMapProxy;
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn parse_program(src: &str) -> (Program, Arc<SourceMap>) {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(FileName::Custom("lib-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let program = Program::Module(parser.parse_module().expect("parse module"));
    (program, cm)
}

fn emit(program: Program, cm: Arc<SourceMap>) -> String {
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    emitter.emit_program(&program).expect("emit program");
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

fn empty_plugin_metadata() -> TransformPluginProgramMetadata {
    TransformPluginProgramMetadata {
        comments: None,
        source_map: PluginSourceMapProxy { source_file: OnceCell::new() },
        unresolved_mark: Mark::from_u32(0),
    }
}

#[test]
fn hydrate_target_routes_dom_helpers_to_the_explicit_hydration_entry() {
    let (program, cm) =
        parse_program("export const View = () => <button type=\"button\">hydrate</button>;");
    let out = emit(apply_hydrate(program), cm);

    assert!(out.contains("@rue-js/rue/internal/hydrate"), "{out}");
    assert!(out.contains("_$claimElement"), "{out}");
    assert!(!out.contains("from \"@rue-js/rue/internal\""), "{out}");
}

#[test]
fn diagnostics_strict_client_compile_rejects_dynamic_hooks_and_accepts_local_components() {
    let dynamic_hook = "import { useState } from '@rue-js/rue'; export const View = props => { if (props.active) { useState(0); } return <main>value</main>; };";
    let (program, _) = parse_program(dynamic_hook);
    assert!(
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| run_full_transform_with_options(
            program, true, true, None
        )))
        .is_err()
    );

    let local_component =
        "const Child = () => <span>child</span>; export const View = () => <Child />;";
    let (program, cm) = parse_program(local_component);
    let out = emit(run_full_transform_with_options(program, true, true, None), cm);
    assert!(!out.contains("__RUE_COMPILER_DIAGNOSTIC__"), "{out}");
}

#[test]
fn diagnostics_dynamic_hook_distinguishes_hooks_from_plain_local_calls() {
    let cases = [
        (
            "direct hook",
            "import { useState } from '@rue-js/rue'; if (ready) { useState(0); }",
            true,
        ),
        (
            "aliased hook",
            "import { useState as setupState } from '@rue-js/rue'; if (ready) { setupState(0); }",
            true,
        ),
        (
            "hook wrapper",
            "import { useState } from '@rue-js/rue'; const useCount = () => useState(0); if (ready) { useCount(); }",
            true,
        ),
        (
            "ordinary reactive factories",
            "import { computed, ref, watchEffect } from '@rue-js/rue'; if (ready) { const n = ref(0); computed(() => n.value); watchEffect(() => n.value); }",
            false,
        ),
        ("local component", "const LocalPanel = () => null; if (ready) { LocalPanel(); }", false),
        (
            "ordinary hook-shaped function",
            "const useLabel = () => 'label'; if (ready) { useLabel(); }",
            false,
        ),
        (
            "ordinary function sharing a builtin hook name",
            "const ref = value => ({ value }); if (ready) { ref(0); }",
            false,
        ),
    ];

    for (name, src, should_reject) in cases {
        let (program, _) = parse_program(src);
        let diagnostics = diagnostics::collect(&program);
        let has_dynamic_hook = diagnostics.iter().any(|item| item.category == "dynamic-hook");
        assert_eq!(has_dynamic_hook, should_reject, "{name}: {diagnostics:?}");
    }
}

#[test]
fn apply_pre_runs_pre_transform_pipeline_for_function_components() {
    let src = r#"
import { ref } from '@rue-js/rue';

function View(props) {
  const count = ref(0);
  return <template slot="header"><div v-show={props.ok}>{count.value}</div></template>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply_pre(program), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")), "{out}");
    assert!(out.contains(&normalize("const count = ref(0);")), "{out}");
    assert!(out.contains(&normalize(r#"return <Template slot="header"><div style={_$compiledShowStyle(undefined, props.ok)}>{count.value}</div></Template>;"#)));
    assert!(!out.contains("vapor(("));
}

#[test]
fn apply_runs_full_pre_and_vapor_pipeline_for_arrow_components() {
    let src = r#"
import { type FC, computed, ref, watchEffect } from '@rue-js/rue';

const View: FC = () => {
  const count = ref(0);
  const step = ref(1);
  const doubled = computed(() => count.value * 2);
  const deferred = () => ref(2);
  watchEffect(() => consume(doubled.value));
  return <div className="box">{count.value + step.value}</div>;
};
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply(program), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")));
    assert!(!out.contains("_$compiledMarkComponentRenderReactive"), "{out}");
    assert!(out.contains(&normalize("const count = ref(0);")), "{out}");
    assert!(out.contains(&normalize("const step = ref(1);")), "{out}");
    assert!(out.contains(&normalize("const doubled = computed(()=>count.value * 2);")), "{out}");
    assert!(out.contains(&normalize("watchEffect(()=>consume(doubled.value));")), "{out}");
    assert!(!out.contains("computed:0:"), "{out}");
    assert!(!out.contains("watchEffect:0:"), "{out}");
    assert!(!out.contains(&normalize(r#"_$compiledWithHookId("ref:"#)), "{out}");
    assert!(out.contains(&normalize("const deferred = ()=>ref(2)")), "{out}");
    assert!(out.contains("_$compiledRoot"));
    assert!(out.contains("_$compiledText"));
    assert!(out.contains("_$template"));
    assert!(out.contains(&normalize(r#"<div class="box">rue:direct-text</div>"#)));
    assert!(out.contains(".content.cloneNode(true)"));
    assert!(!out.contains("renderAnchor(__slot"));
    assert!(!out.contains(&normalize(r#"_$createElement("div""#)));
    assert!(!out.contains(&normalize(r#"_$createComment("rue:slot:anchor")"#)));
}

#[test]
fn apply_keeps_direct_vapor_setup_off_the_component_render_effect() {
    let src = r#"
import { type FC, signal, vapor } from '@rue-js/rue';

const View: FC = (props) => {
  const count = signal(0);
  return _$compiledRoot(() => props.ready ? count.get() : 0);
};
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply_pre(program), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")), "{out}");
    assert!(out.contains("signal"), "{out}");
    assert!(!out.contains("_$compiledMarkComponentRenderReactive"), "{out}");
}

#[test]
fn apply_pre_preserves_nested_jsx_closures_without_render_markers() {
    let src = r#"
import { type FC, ref } from '@rue-js/rue';

const View: FC = () => {
  const active = ref(false);
  return <Panel preview={() => <button>{active.value ? 'on' : 'off'}</button>} />;
};
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply_pre(program), cm));

    assert!(!out.contains("_$compiledMarkComponentRenderReactive"), "{out}");
    assert!(out.contains("preview={()=><button>"), "{out}");
}

#[test]
fn apply_closes_compiled_and_vapor_capability_boundaries() {
    let vapor_cases = [
        (
            "component",
            "import { Child } from './compiled-components'; export const View = () => <Child value=\"x\" />;",
        ),
        (
            "conditional renderable",
            "export const View = (props) => <div>{props.ready ? <i>A</i> : null}</div>;",
        ),
        (
            "slot",
            "import { Panel } from './compiled-components'; export const View = () => <Panel><Template slot=\"head\"><b>H</b></Template></Panel>;",
        ),
        ("spread", "export const View = (props) => <div {...props}>x</div>;"),
        (
            "dynamic event bag",
            "export const View = (eventProps) => <button {...eventProps}>x</button>;",
        ),
        ("svg", "export const View = () => <svg><circle cx=\"1\" /></svg>;"),
        ("mathml", "export const View = () => <math><mi>x</mi></math>;"),
        ("custom element", "export const View = (props) => <x-box value={props.value} />;"),
        (
            "teleport",
            "import { Teleport } from '@rue-js/rue'; export const View = () => <Teleport to=\"#target\"><b>x</b></Teleport>;",
        ),
        (
            "transition",
            "import { Transition } from '@rue-js/rue'; export const View = () => <Transition><b>x</b></Transition>;",
        ),
        (
            "keep-alive",
            "import { Child } from './compiled-components'; import { KeepAlive } from '@rue-js/rue'; export const View = () => <KeepAlive><Child /></KeepAlive>;",
        ),
        (
            "suspense",
            "import { Child } from './compiled-components'; import { Suspense } from '@rue-js/rue'; export const View = () => <Suspense><Child /></Suspense>;",
        ),
        (
            "hydration",
            "import { Hydration } from '@rue-js/rue'; export const View = () => <Hydration><b>x</b></Hydration>;",
        ),
        ("async boundary", "export const View = async () => <div>x</div>;"),
    ];

    for (name, src) in vapor_cases {
        let (program, cm) = parse_program(src);
        let out = emit(apply(program), cm);
        assert!(
            out.contains("@rue-js/rue/internal"),
            "{name} must route through the Vapor boundary: {out}",
        );
    }

    let fragment_src = "export const View = () => <><i>A</i><b>B</b></>;";
    let (fragment_program, fragment_cm) = parse_program(fragment_src);
    let fragment_out = emit(apply(fragment_program), fragment_cm);
    assert!(fragment_out.contains("@rue-js/rue/internal/dom"), "{fragment_out}");
    assert!(!fragment_out.contains("@rue-js/rue/internal/compiler"), "{fragment_out}");
    assert!(fragment_out.contains("_$compiledRoot"), "{fragment_out}");

    let unproven_src = "export const View = () => <div>{state.get()}</div>;";
    let (unproven_program, unproven_cm) = parse_program(unproven_src);
    let unproven_out = emit(apply(unproven_program), unproven_cm);
    assert!(unproven_out.contains("@rue-js/rue/internal"), "{unproven_out}");
    assert!(unproven_out.contains("_$compiledRoot("), "{unproven_out}");

    let coerced_unproven_src = "export const View = () => <div>{String(state.get())}</div>;";
    let (coerced_unproven_program, coerced_unproven_cm) = parse_program(coerced_unproven_src);
    let coerced_unproven_out = emit(apply(coerced_unproven_program), coerced_unproven_cm);
    assert!(coerced_unproven_out.contains("@rue-js/rue/internal"), "{coerced_unproven_out}");
    assert!(coerced_unproven_out.contains("_$compiledScalarRoot("), "{coerced_unproven_out}");
}

#[test]
fn apply_keeps_compiled_native_shell_and_keyed_list_off_the_vapor_graph() {
    let src = r#"
import { signal } from '@rue-js/rue/internal';

const rows = signal([{ id: 1, label: 'A' }]);
const selected = signal(1);
const clear = () => rows.set([]);

export const View = () => <main>
  <button onClick={clear}>Clear</button>
  <table><tbody>
    {rows.get().map(row => <tr key={row.id} className={row.id === selected.get() ? 'danger' : ''}>
      <td>{row.id}</td><td>{row.label}</td>
      <td><a data-action="remove"><span className="icon" /></a></td><td />
    </tr>)}
  </tbody></table>
</main>;
"#;
    let (program, cm) = parse_program(src);
    let out = emit(apply(program), cm);

    assert!(out.contains("from \"@rue-js/rue/internal/list\""), "{out}");
    assert!(!out.contains("@rue-js/rue/internal/compiler"), "{out}");
    assert!(!out.contains("_$compiledWithHookId"), "{out}");
    assert!(
        out.contains("_$compiledScalarRoot")
            || out.contains("_$compiledScalarOwnedRoot(")
            || out.contains("_$compiledRoot("),
        "{out}"
    );
    assert!(out.contains("_$reconcileKeyed"), "{out}");
    assert!(out.contains("_$template"), "{out}");
    assert!(!out.contains("document.createElement(\"template\")"), "{out}");
    assert!(out.contains(".content.cloneNode(true)"), "{out}");
    assert!(out.contains(".childNodes["), "{out}");
    assert!(out.contains(".addEventListener"), "{out}");
    assert!(!out.contains("_$createElement"), "{out}");
    assert!(!out.contains("_$appendChild"), "{out}");
    assert!(!out.contains("_$addEventListener"), "{out}");
}

#[test]
fn apply_routes_mixed_keyed_list_helpers_to_unique_entries() {
    let src = r#"
import { signal } from '@rue-js/rue';

const rows = signal([{ id: 1, label: 'A' }]);
const Child = () => <span>fallback</span>;

export const View = () => <>
  <ul>{rows.get().map(row => <li key={row.id}>{row.label}</li>)}</ul>
  <Child />
</>;
"#;
    let (program, cm) = parse_program(src);
    let out = emit(apply(program), cm);
    for (helper, source) in [
        ("signal", "reactive"),
        ("_$compiledRenderEffect", "reactive"),
        ("_$reconcileKeyedSingle", "list"),
        ("_$mountCompiledComponent", "component"),
    ] {
        assert!(
            out.lines().any(|line| (line.contains(helper)
                || (helper == "signal" && line.contains("_$compiledScalarSignal"))
                || (helper == "_$compiledRenderEffect"
                    && line.contains("_$compiledScalarEffect")))
                && line.contains(&format!("@rue-js/rue/internal/{source}"))),
            "{out}"
        );
    }
}

#[test]
fn apply_pre_dedupes_duplicate_use_setup_ids_across_components() {
    let src = r#"
import { ref } from '@rue-js/rue';

function First() {
  const count = ref(0);
  return <div>{count.value}</div>;
}

function Second() {
  const count = ref(1);
  return <div>{count.value}</div>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply_pre(program), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")), "{out}");
    assert_eq!(out.matches("_$compiledWithHookId").count(), 0, "{out}");
}

#[test]
fn full_transform_pipeline_shared_by_entrypoints_rewrites_pre_and_vapor() {
    let src = r#"
import { ref } from '@rue-js/rue';

const View = () => {
  const count = ref(0);
  return <section>{count.value}</section>;
};
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(run_full_transform(program, true, None), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")), "{out}");
    assert!(out.contains(&normalize("const count = ref(0);")), "{out}");
    assert!(out.contains("_$compiledRoot"));
    assert!(out.contains("_$compiledText"));
    assert!(out.contains("_$template"));
    assert!(out.contains(".content.cloneNode(true)"));
    assert!(out.contains("<!--rue:text-hole:0-->"));
    assert!(!out.contains(&normalize(r#"_$createElement("section""#)));
    assert!(!out.contains("watchEffect"));
}

#[test]
fn plugin_transform_entry_delegates_to_full_pipeline() {
    let src = r#"
import { ref } from '@rue-js/rue';

const View = () => {
  const count = ref(0);
  return <main>{count.value}</main>;
};
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(transform(program, empty_plugin_metadata()), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")));
    assert!(out.contains(&normalize("const count = ref(0);")), "{out}");
    assert!(out.contains("_$compiledRoot"));
    assert!(out.contains("_$compiledText"));
    assert!(!out.contains("watchEffect"));
}

#[test]
fn apply_pre_combines_list_show_event_and_model_directives() {
    let src = r#"
import { ref } from '@rue-js/rue';

function View(props) {
  const text = ref('');
  return <section>
    <input v-model:trim={text.value} />
    <button v-on:click-stop="props.save(text.value)" v-show={props.canSave}>Save</button>
    <ul><li v-for="(item, index) in props.items" v-show={item.visible}>{index}:{item.label}</li></ul>
  </section>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply_pre(program), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")));
    assert!(out.contains(&normalize("const text = ref('');")), "{out}");
    assert!(out.contains("props.items"));
    assert!(out.contains(".map("));
    assert!(out.contains(&normalize("style={_$compiledShowStyle(undefined, item.visible)}")));
    assert!(out.contains(&normalize("style={_$compiledShowStyle(undefined, props.canSave)}")));
    assert!(out.contains("_$compiledWithEventModifiers"));
    assert!(out.contains(&normalize("\"stop\"")));
    assert!(out.contains(&normalize("value={text.value}")));
    assert!(out.contains("onInput"));
}

#[test]
fn apply_handles_slot_conditionals_lists_and_router_link_together() {
    let src = r#"
import { Header, Item, Panel } from './compiled-components';
import { RouterLink, ref } from '@rue-js/rue';

const View = (props) => {
  const current = ref(null);
  const header = props.ready ? <Header title={props.title} /> : null;
  return <Panel>
    {header}
    <RouterLink to={props.to} replace>Open</RouterLink>
    {props.rows.map(row => <Item key={row.id}>{row.name}</Item>)}
  </Panel>;
};
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply(program), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")));
    assert!(out.contains("_$compiledRoot("));
    assert!(out.contains(&normalize("_$compiledComponent(Panel")));
    assert!(!out.contains(&normalize("_$compiledKeyedList")));
    assert!(out.contains("_$mountCompiledComponent(_root, RouterLink"), "{out}");
    assert!(out.contains("to: _$compiledPropsGet(props, \"to\")"), "{out}");
    assert!(out.contains(&normalize("const current = ref(null);")), "{out}");
}

#[test]
fn apply_pre_preserves_broken_else_and_rewrites_component_model_combo() {
    let src = r#"
function View(props) {
  return <section>
    <Header />
    <Fallback v-else />
    <Field v-model:lazy-user-name={props.user.name} />
  </section>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply_pre(program), cm));

    assert!(out.contains("v-else"), "{out}");
    assert!(out.contains(&normalize("userName={props.user.name}")));
    assert!(out.contains("onUpdateUserName"));
    assert!(out.contains("props.user.name = value"));
    assert!(out.contains("userNameModifiers"));
    assert!(out.contains(&normalize("\"lazy\": true")));
    assert!(!out.contains("v-model"));
}

#[test]
fn apply_handles_transition_group_complex_map_control_flow() {
    let src = r#"
import { TransitionGroup } from '@rue-js/rue';
const View = (props) => {
  return <TransitionGroup>
    {props.rows.map(row => {
      try {
        if (row.hidden) return <li key={row.id}>Hidden</li>;
      } finally {
        props.touch(row.id);
      }
      return <li key={row.id}>{String(row.label)}</li>;
    })}
  </TransitionGroup>;
};
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply(program), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")));
    assert!(out.contains(&normalize("_$transitionGroup(")));
    assert!(out.contains("_$reconcileKeyed"), "{out}");
    assert!(out.contains("finally"), "{out}");
    assert!(out.contains("touch"), "{out}");
    assert!(out.contains("hidden"));
    assert!(out.contains("Hidden"));
}

#[test]
fn apply_handles_fragment_slots_lists_and_pre_directives_together() {
    let src = r#"
import { Footer, Item, Panel } from './compiled-components';
import { ref } from '@rue-js/rue';

function View(props) {
  const selected = ref(null);
  const renderFooter = (row) => row.ready ? <Footer key={row.id}>{row.label}</Footer> : null;
  return <>
    <Panel>
      <Template slot="footer">{props.rows.map(renderFooter)}</Template>
      {(row) => <Item active={row.id === selected.value}>{row.label}</Item>}
    </Panel>
    <section v-show={props.visible}>
      {props.rows.map(row => <article key={row.id}>{row.label}</article>)}
    </section>
  </>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply(program), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")));
    assert!(out.contains(&normalize("const selected = ref(null);")), "{out}");
    assert!(out.contains(&normalize("_$createComponent(Panel")));
    assert!(out.contains("__rue_slots"));
    assert!(out.contains("footer"));
    assert!(out.contains("_$reconcileKeyed"));
    assert!(out.contains("_$compiledShowStyle"));
    assert!(out.contains("_$compiledPropsGet(props, \"visible\")"));
    assert!(out.contains("_$mountCompiledKeyedSingleRow"), "{out}");
}

#[test]
fn apply_handles_dense_control_directive_and_component_slot_pipeline() {
    let src = r#"
import { TransitionGroup } from '@rue-js/rue';
import { Badge, Footer, Shell } from './compiled-components';
import { RouterLink, ref } from '@rue-js/rue';

function View({ rows, activeId, to, visible }) {
  const draft = ref('');
  const badge = (row) => row.hot ? <Badge key={row.id}>{String(row.label)}</Badge> : null;
  return <>
    <Shell>
      <Template slot="toolbar">
        <input v-model:trim={draft.value} />
        <RouterLink to={to} v-show={visible}>Go</RouterLink>
      </Template>
      {(ctx) => <Footer>{ctx.label}</Footer>}
    </Shell>
    <TransitionGroup>
      {rows.map((row, index) => {
        const selected = row.id === activeId;
        if (row.hidden) return <li key={row.id} v-on:click-stop={() => row.open()}>{String(index)}</li>;
        return <li key={row.id} className={selected ? 'on' : 'off'}>{row.hot ? <Badge>{String(row.label)}</Badge> : null}</li>;
      })}
    </TransitionGroup>
  </>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply(program), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")));
    assert!(out.contains(&normalize("const draft = ref('');")), "{out}");
    assert!(out.contains("__rue_slots"));
    assert!(out.contains("toolbar"));
    assert!(out.contains(&normalize("_$createComponent(Shell")));
    assert!(out.contains(&normalize("_$transitionGroup(")));
    assert!(out.contains("_$reconcileKeyed"), "{out}");
    assert!(out.contains("_$compiledPropsGet(__rue_props, \"rows\")"), "{out}");
    assert!(out.contains("_$compiledWithEventModifiers"));
    assert!(out.contains("_$compiledShowStyle"));
    assert!(out.contains(&normalize("_$createComponent(RouterLink")), "{out}");
    assert!(out.contains("_$mountCompiledSlotAt"), "{out}");
    assert!(!out.contains("RouterLink.__rueOnClick"), "{out}");
    assert!(out.contains("selected"));
}

#[test]
fn apply_pre_keeps_pre_directive_islands_while_rewriting_adjacent_directives() {
    let src = r#"
function View(props) {
  return <section>
    <div v-pre v-if={props.skip} v-show={props.skipVisible} v-on:click="props.skip()">{props.raw}</div>
    <div v-if={props.ok}>Ready</div>
    <div v-else-if={props.waiting}>Waiting</div>
    <div v-else>Done</div>
    <Field v-model:lazy-user-name={props.user.name} />
  </section>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply_pre(program), cm));

    assert!(out.contains("v-pre"));
    assert!(out.contains("v-if=\"{props.skip}\""));
    assert!(out.contains("v-show=\"{props.skipVisible}\""));
    assert!(out.contains("v-on:click"));
    assert!(out.contains("props.ok ?"));
    assert!(out.contains("props.waiting ?"));
    assert!(out.contains(&normalize("userName={props.user.name}")));
    assert!(out.contains("onUpdateUserName"));
    assert!(out.contains("userNameModifiers"));
    assert!(!out.contains("v-model"));
}

#[test]
fn apply_pre_rewrites_text_html_memo_model_and_event_modifiers_together() {
    let src = r#"
import { ref } from '@rue-js/rue';

function View(props) {
  const draft = ref('');
  return <form v-on:submit-prevent="props.save(draft.value)">
    <h1 v-text={props.title}>old</h1>
    <article v-html="props.markup"><span /></article>
    <input v-model:trim={draft.value} />
    <Badge v-memo={[props.title]}>{draft.value}</Badge>
  </form>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply_pre(program), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")));
    assert!(out.contains(&normalize("const draft = ref('');")), "{out}");
    assert!(out.contains("_$compiledWithEventModifiers"));
    assert!(out.contains(&normalize("\"prevent\"")));
    assert!(out.contains(&normalize("<h1>{props.title}</h1>")));
    assert!(out.contains("dangerouslySetInnerHTML"));
    assert!(out.contains("__html"));
    assert!(out.contains("_$compiledMemo"));
    assert!(!out.contains("useMemo"));
    assert!(out.contains("value={draft.value}"));
    assert!(!out.contains("v-text"));
    assert!(!out.contains("v-html"));
    assert!(!out.contains("v-model"));
    assert!(!out.contains("v-memo"));
}

#[test]
fn apply_adapts_unproven_render_helper_rows_in_dynamic_slots() {
    let src = r#"
import { Card, Footer, RouterLink, Shell } from './compiled-components';
function View(props) {
  const renderRow = (row) => row.kind === 'link'
    ? <RouterLink key={row.id} to={row.to}>{row.label}</RouterLink>
    : <Card key={row.id} onPick={() => props.pick(row.id)}>{row.label}</Card>;

  return <Shell onEnter={props.enter}>
    <Template slot={props.slotName}>
      <>{props.rows.map(renderRow)}</>
    </Template>
    {props.ready && <Footer key="footer">{props.summary}</Footer>}
  </Shell>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = emit(apply(program), cm);
    assert!(out.contains("_$compiledValueFactory"), "{out}");
}

#[test]
fn transform_entry_handles_multiple_components_without_cross_component_slot_leakage() {
    let src = r#"
import { Item, Panel } from './compiled-components';
import { ref } from '@rue-js/rue';

function First(props) {
  const count = ref(0);
  return <Panel>
    <Template slot="header"><span>{count.value}</span></Template>
    {props.items.map(item => <Item key={item.id}>{item.label}</Item>)}
  </Panel>;
}

const Second = (props) => {
  return <Panel>
    <Template slot="footer"><small>{props.footer}</small></Template>
    {props.ready ? <span>Ready</span> : null}
  </Panel>;
};
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(transform(program, empty_plugin_metadata()), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")));
    assert!(out.contains(&normalize("const count = ref(0);")), "{out}");
    assert!(out.contains("ref(0)"), "{out}");
    assert_eq!(out.matches("__rue_slots").count(), 2);
    assert!(out.contains("\"header\""));
    assert!(out.contains("\"footer\""));
    assert!(!out.contains("_$compiledKeyedList"));
    assert!(out.contains("_$compiledComponent(Panel"), "{out}");
}

#[test]
fn transform_entry_handles_props_destructure_dynamic_slots_and_keyed_component_lists() {
    let src = r#"
import { Dashboard,RouterLink,Card } from './compiled-components';
import { ref } from '@rue-js/rue';

function View({ rows, selectedId, to, slotName, visible }) {
  const draft = ref('');
  const label = selectedId + ':' + rows.length;
  return <Dashboard>
    <Template slot={slotName}>
      <RouterLink to={to} v-show={visible} v-on:click-prevent="console.log(label)">{label}</RouterLink>
    </Template>
    {rows.map(([id, title], index) => (
      <Card key={id} active={id === selectedId} index={index}>{title ?? draft.value}</Card>
    ))}
  </Dashboard>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(transform(program, empty_plugin_metadata()), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")));
    assert!(out.contains(&normalize("const draft = ref('');")), "{out}");
    assert!(out.contains("_$compiledPropsGet(__rue_props, \"rows\")"), "{out}");
    assert!(out.contains("_$compiledPropsGet(__rue_props, \"selectedId\")"));
    assert!(out.contains("_$compiledPropsGet(__rue_props, \"slotName\")"));
    assert!(out.contains("_$compiledPropsGet(__rue_props, \"visible\")"));
    assert!(out.contains("__rue_slots"));
    assert!(!out.contains("_$compiledKeyedList"));
    assert!(out.contains("_$rueCompiledProp0.get().map"), "{out}");
    assert!(out.contains("_$compiledShowStyle"));
    assert!(out.contains("_$compiledWithEventModifiers"));
    assert!(!out.contains("v-on:click"));
}

#[test]
fn apply_pre_rewrites_template_for_condition_text_html_and_native_models_together() {
    let src = r#"
function View(props) {
  return <section>
    <template v-for="(row, index) in props.rows">
      <article v-if={row.visible} v-text={row.title} />
      <article v-else v-html="row.html" />
      <input v-model:trim-number={props.form[index].value} />
    </template>
  </section>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply_pre(program), cm));

    assert!(out.contains("Array.isArray(__rue_v_for_source)"), "{out}");
    assert!(out.contains("(props.rows).map"), "{out}");
    assert!(out.contains("([row, index])"));
    assert!(out.contains("row.visible ?"));
    assert!(out.contains("<article/>{row.title}"));
    assert!(out.contains("dangerouslySetInnerHTML"));
    assert!(out.contains("__html"));
    assert!(out.contains("value={props.form[index].value}"));
    assert!(out.contains("onInput"));
    assert!(!out.contains("v-for"));
    assert!(!out.contains("v-text"));
    assert!(!out.contains("v-html"));
    assert!(!out.contains("v-model"));
}

#[test]
fn transform_entry_hardens_nested_slot_setup_model_and_transition_pipeline() {
    let src = r#"
import { Template, TransitionGroup } from '@rue-js/rue';
import { Card, Shell } from './compiled-components';
import { ref, computed } from '@rue-js/rue';

function View({ rows, form, activeId, slotName, ...rest }) {
  const draft = ref('');
  const activeLabel = computed(() => activeId + ':' + rows.length);
  return <Shell data-kind={rest.kind}>
    <Template slot={slotName}>
      <input v-model:trim={form.title} v-on:keyup-enter-prevent="rest.submit(form.title)" />
      {rows.map(({ id, title }, index) => (
        <Card key={id} active={id === activeId} index={index}>{title ?? draft.value}</Card>
      ))}
    </Template>
    <Template slot="footer"><span v-show={rest.ready}>{activeLabel.value}</span></Template>
    <TransitionGroup>
      {rows.map(row => {
        const rowKey = row.id ?? activeId;
        if (row.hidden) return <li key={rowKey}>Hidden</li>;
        return <li key={rowKey}>{row.label}</li>;
      })}
    </TransitionGroup>
  </Shell>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(transform(program, empty_plugin_metadata()), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")));
    assert!(out.contains(&normalize("const draft = ref('');")), "{out}");
    assert!(out.contains(&normalize(
        "const activeLabel = computed(()=>_$compiledPropsGet(__rue_props, \"activeId\") + ':' + _$compiledPropsGet(__rue_props, \"rows\").length);"
    )), "{out}");
    assert!(out.contains("_$compiledPropsGet(__rue_props, \"rows\")"), "{out}");
    assert!(out.contains("_$compiledPropsGet(__rue_props, \"form\")"), "{out}");
    assert!(out.contains("__rue_slots"));
    assert!(
        out.contains("[slotName]")
            || out.contains("[_$compiledPropsGet(__rue_props, \"slotName\")]"),
        "{out}"
    );
    assert!(!out.contains("_$compiledKeyedList"));
    assert!(out.contains("_$compiledWithEventModifiers"));
    assert!(out.contains("_$compiledShowStyle"));
    assert!(out.contains("_$compiledComponent(Shell"));
    assert!(out.contains("_$transitionGroup("));
}

#[test]
fn apply_pre_hardens_template_directives_safe_model_and_event_combo() {
    let src = r#"
function View(props) {
  return <section>
    <template v-for="{ item, index } in props.entries">
      <Field __rue_model__user_name__mods__lazy__trim={item.user.name} v-on:update-user-name-native="props.touch(index)" />
      <span v-if={item.visible} v-text={item.title} />
      <span v-else-if={item.html} v-html="item.html" />
      <span v-else>Empty</span>
    </template>
  </section>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply_pre(program), cm));

    assert!(out.contains("(props.entries).map"), "{out}");
    assert!(out.contains("([{ item, index }])"), "{out}");
    assert!(out.contains("userName={item.user.name}"), "{out}");
    assert!(out.contains("onUpdateUserName"));
    assert!(out.contains("userNameModifiers"));
    assert!(out.contains("onUpdateUserNameNative"));
    assert!(out.contains("item.visible ?"));
    assert!(out.contains("dangerouslySetInnerHTML"));
    assert!(!out.contains("v-for"));
    assert!(!out.contains("v-text"));
    assert!(!out.contains("v-html"));
}

#[test]
fn apply_adapts_nested_unproven_fragment_list_rows() {
    let src = r#"
import { Badge, Header, Item, Layout, RouterLink } from './compiled-components';
const View = (props) => {
  const extra = props.ready ? <Badge>{props.count}</Badge> : null;
  return <Layout>
    {props.header ?? <Header title={props.title} />}
    <Template slot="nav">
      <RouterLink to={props.to} replace={props.replace}>{props.label}</RouterLink>
    </Template>
    <>
      {props.groups.map(group => <Fragment key={group.id}>
        <h2>{group.title}</h2>
        {group.items.map(item => <Item key={item.id}>{item.name}</Item>)}
      </Fragment>)}
    </>
    {extra}
  </Layout>;
};
"#;
    let (program, cm) = parse_program(src);
    let out = emit(apply(program), cm);
    assert!(out.contains("_$compiledValueFactory"), "{out}");
}

#[test]
fn transform_entry_hardens_rest_props_block_keys_and_dynamic_slot_fallbacks() {
    let src = r#"
import { Frame } from './compiled-components';
import { computed } from '@rue-js/rue';

function Dashboard({ rows, slotName, visible = true, ...rest }) {
  const total = computed(() => rows.length);
  return <Frame data-kind={rest.kind}>
    <Template slot={slotName ?? "main"}>
      {rows.map(row => {
        const label = row.label ?? rest.fallback;
        return <article key={row.id} v-on:click-prevent={() => rest.pick(row.id)}>{label}</article>;
      })}
    </Template>
    {visible && <aside v-show={rest.open}>{total.value}</aside>}
  </Frame>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(transform(program, empty_plugin_metadata()), cm));

    assert!(out.contains("_$compiledPropsGet(__rue_props, \"rows\")"), "{out}");
    assert!(out.contains("_$compiledPropsGet(__rue_props, \"slotName\")"), "{out}");
    assert!(out.contains("_$compiledPropsGet(__rue_props, \"visible\")"), "{out}");
    assert!(out.contains("__rue_slots"));
    assert!(!out.contains("_$compiledKeyedList"));
    assert!(
        out.contains("_$compiledPropsGet(__rue_props, \"rows\").map")
            || out.contains("_$rueCompiledProp"),
        "{out}"
    );
    assert!(out.contains("row.id"));
    assert!(out.contains("_$compiledWithEventModifiers"));
    assert!(out.contains("_$compiledShowStyle"));
    assert!(out.contains("_$createComponent(Frame"));
    assert!(out.contains("_$compiledValueFactory"));
}

#[test]
fn apply_pre_hardens_r_prefixed_template_show_model_and_event_directives() {
    let src = r#"
function View(props) {
  return <>
    <input r-model:trim={props.form.name} r-on:keyup-enter-prevent="props.submit(props.form.name)" />
    <section>
      <span r-for="(item, index) of props.items" r-show={props.ready} r-text={item.visible ? index : item.name} />
    </section>
  </>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply_pre(program), cm));

    assert!(out.contains("(props.items).map"), "{out}");
    assert!(out.contains("([item, index])"), "{out}");
    assert!(out.contains("value={props.form.name}"), "{out}");
    assert!(out.contains("onKeyup"));
    assert!(out.contains("_$compiledWithEventModifiers"));
    assert!(out.contains("item.visible ? index : item.name"));
    assert!(out.contains("_$compiledShowStyle"));
    assert!(!out.contains("r-for"));
    assert!(!out.contains("r-text"));
    assert!(!out.contains("r-model"));
}

#[test]
fn apply_pre_hardens_nested_template_model_event_show_and_else_boundaries() {
    let src = r#"
function View(props) {
  return <Panel>
    <template v-for="(row, index) in props.rows">
      <Field v-model:title-trim={row.title} v-on:update-title-native="props.touch(row.id)" />
      <span v-if={row.visible} v-show={props.ready} v-text={row.label ?? index} />
      <span v-else-if={row.html} v-html="row.html" />
      <span v-else>{props.empty}</span>
    </template>
    <template slot="actions">
      <button r-on:click-stop-prevent="props.cancel()">Cancel</button>
    </template>
  </Panel>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply_pre(program), cm));

    assert!(out.contains("(props.rows).map"), "{out}");
    assert!(out.contains("([row, index])"), "{out}");
    assert!(out.contains("titleTrim={row.title}"), "{out}");
    assert!(out.contains("onUpdateTitleTrim"));
    assert!(out.contains("onUpdateTitleNative"));
    assert!(out.contains("row.visible ?"));
    assert!(out.contains("_$compiledShowStyle"));
    assert!(out.contains("dangerouslySetInnerHTML"));
    assert!(out.contains("_$compiledWithEventModifiers"));
    assert!(!out.contains("v-for"));
    assert!(!out.contains("v-if"));
    assert!(!out.contains("v-text"));
    assert!(!out.contains("v-html"));
}

#[test]
#[should_panic(
    expected = "Rue member component must be rooted in a statically known function factory"
)]
fn rejects_member_components_in_transform_entry_hardens_routerlink_member_components_and_nested_fragment_lists()
 {
    let src = r#"
import { ref } from '@rue-js/rue';

const View = ({ groups, route, active, slotName, ...rest }) => {
  const draft = ref('');
  return <Shell.Root data-kind={rest.kind}>
    <Template slot={slotName || "main"}>
      <RouterLink to={route.to} replace={route.replace}>{route.label}</RouterLink>
      <>
        {groups.map(group => <Fragment key={group.id}>
          <h2 v-show={active === group.id}>{group.title}</h2>
          {group.items.map(item => <Item.Card key={item.id} v-on:click-once={() => rest.pick(item.id)}>{item.label ?? draft.value}</Item.Card>)}
        </Fragment>)}
      </>
    </Template>
    {rest.footer ?? <Footer value={draft.value} />}
  </Shell.Root>;
};
"#;
    let (program, _cm) = parse_program(src);
    let _ = transform(program, empty_plugin_metadata());
}

#[test]
fn apply_hardens_component_models_native_events_and_transition_slots_together() {
    let src = r#"
import { Template, TransitionGroup } from '@rue-js/rue';
import { Editor, Layout } from './compiled-components';
function View(props) {
  return <Layout>
    <Template slot="editor">
      <div __rue_on__save__mods__prevent={props.save}><Editor v-model:content-lazy-trim={props.doc.content} /></div>
      <input v-model:number={props.doc.count} v-on:keydown-enter="props.commit(props.doc.count)" />
    </Template>
    <TransitionGroup>
      {props.rows.map(row => {
        if (row.loading) return <li key={row.id}>Loading</li>;
        return row.visible ? <li key={row.id}>{row.label}</li> : null;
      })}
    </TransitionGroup>
  </Layout>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply(program), cm));

    assert!(
        out.contains("_$compiledComponent(Layout")
            || out.contains("_$mountCompiledComponent(")
            || out.contains("_$createComponent(Layout"),
        "{out}"
    );
    assert!(out.contains("__rue_slots"));
    assert!(out.contains("contentLazyTrim: _$compiledPropsGet(props, \"doc\").content"), "{out}");
    assert!(out.contains("onUpdateContentLazyTrim"));
    assert!(out.contains(".addEventListener(\"save\""), "{out}");
    assert!(out.contains("_$compiledWithEventModifiers"));
    assert!(out.contains("$event.target"));
    assert!(!out.contains(" as HTMLInputElement"));
    assert!(out.contains("parseFloat(value)"));
    assert!(out.contains("_$transitionGroup("));
    assert!(out.contains("_$reconcileKeyed"), "{out}");
    assert!(!out.contains("v-model"));
    assert!(!out.contains("v-on"));
}

#[test]
fn transform_entry_preserves_loop_shadowing_after_props_phase2_lowering() {
    let src = r#"
import { Panel,Item } from './compiled-components';
function View({ count, rows }) {
  const total = count * 2;
  const renderTotal = () => {
    for (let total = 0; total < 2; total++) console.log(total);
    for (const total of rows) console.log(total);
    return total;
  };
  return <Panel>
    <span>{renderTotal()}</span>
    {rows.map(row => <Item key={row.id}>{row.label ?? total}</Item>)}
  </Panel>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(transform(program, empty_plugin_metadata()), cm));

    assert!(out.contains(&normalize("@rue-js/rue/internal")));
    assert!(out.contains("const total = _$rueCompiledProp0.get() * 2"), "{out}");
    assert!(
        out.contains(&normalize("for(let total = 0; total < 2; total++)console.log(total);")),
        "{out}"
    );
    assert!(out.contains("const total of _$rueCompiledProp1.get()"), "{out}");
    assert!(out.contains("console.log(total)"), "{out}");
    assert!(out.contains("return total"), "{out}");
    assert!(out.contains("_$compiledPropsGet(__rue_props, \"rows\")"), "{out}");
}

#[test]
fn apply_pre_hardens_object_for_source_component_model_and_native_event_combo() {
    let src = r#"
function View(props) {
  return <Form>
    <template v-for="(entry, name) in props.fields">
      <Field v-model:value-trim={entry.value} v-on:blur-native-capture="props.touch(name)" />
      <button v-if={entry.dirty} r-on:click-stop-prevent="props.save(name)">Save</button>
      <button v-else disabled>Clean</button>
    </template>
  </Form>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply_pre(program), cm));

    assert!(out.contains("Object.entries(__rue_v_for_source"), "{out}");
    assert!(out.contains("([entry, name])"), "{out}");
    assert!(out.contains("valueTrim={entry.value}"), "{out}");
    assert!(out.contains("onUpdateValueTrim"));
    assert!(out.contains("__rueNativeOnBlur"));
    assert!(out.contains("\"capture\""));
    assert!(out.contains("entry.dirty ?"));
    assert!(out.contains("_$compiledWithEventModifiers"));
    assert!(!out.contains("v-for"));
    assert!(!out.contains("v-model"));
    assert!(!out.contains("r-on"));
}

#[test]
#[should_panic(
    expected = "Rue member component must be rooted in a statically known function factory"
)]
fn rejects_member_components_in_apply_hardens_nested_dynamic_slots_with_router_links_and_keyed_fragments()
 {
    let src = r#"
import { Footer, RouterLink, Shell } from './compiled-components';
function View(props) {
  return <Shell>
    <Template slot={props.primarySlot ?? "main"}>
      <RouterLink to={props.route.to} replace={props.route.replace}>{props.route.label}</RouterLink>
      {props.sections.map(section => <Fragment key={section.id}>
        <Header.Title>{section.title}</Header.Title>
        {section.rows.map(row => row.url
          ? <RouterLink key={row.id} to={row.url}>{row.label}</RouterLink>
          : <Card.Item key={row.id} __rueNativeOnClick={() => props.pick(row.id)}>{row.label}</Card.Item>)}
      </Fragment>)}
    </Template>
    {props.footer ? <Footer>{props.footer}</Footer> : null}
  </Shell>;
}
"#;
    let (program, _cm) = parse_program(src);
    let _ = transform(program, empty_plugin_metadata());
}

#[test]
fn apply_pre_hardens_pre_islands_inside_template_lists() {
    let src = r#"
function View(props) {
  return <section>
    <template v-for="row in props.rows">
      <article v-pre v-if={row.skip} v-show={row.visible} v-html="row.raw">{row.raw}</article>
      <article v-if={row.visible} v-text={row.title} />
      <article v-else>Hidden</article>
    </template>
  </section>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply_pre(program), cm));

    assert!(out.contains("(props.rows).map"), "{out}");
    assert!(out.contains("([row])"), "{out}");
    assert!(out.contains("v-pre"));
    assert!(out.contains("v-if=\"{row.skip}\""));
    assert!(out.contains("v-show=\"{row.visible}\""));
    assert!(out.contains("v-html"));
    assert!(out.contains("row.visible ?"));
    assert!(out.contains("{row.title}"));
    assert!(!out.contains("v-for"));
}

#[test]
fn transform_entry_hardens_component_slot_models_lists_and_show_together() {
    let src = r#"
import { Dialog, Editor, Footer, Row } from './compiled-components';
function View({ rows, form, ready, slotName }) {
  return <Dialog v-show={ready}>
    <Template slot={slotName}>
      <Editor v-model:body-lazy={form.body} />
      {rows.map(({ id, label }, index) => <Row key={id} index={index}>{label ?? form.body}</Row>)}
    </Template>
    {ready && <Footer>{form.body}</Footer>}
  </Dialog>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(transform(program, empty_plugin_metadata()), cm));

    assert!(out.contains("_$compiledPropsGet(__rue_props, \"rows\")"), "{out}");
    assert!(out.contains("_$compiledPropsGet(__rue_props, \"form\")"), "{out}");
    assert!(out.contains("_$compiledComponent(Dialog"), "{out}");
    assert!(out.contains("_$compiledShowStyle"));
    assert!(out.contains("__rue_slots"));
    assert!(out.contains("slotName"), "{out}");
    assert!(out.contains("bodyLazy: _$rueCompiledProp0.get().body"), "{out}");
    assert!(out.contains("onUpdateBodyLazy"));
    assert!(!out.contains("_$compiledKeyedList"));
    assert!(out.contains("_$compiledComponent(Footer"), "{out}");
}

#[test]
fn transform_entry_hardens_defaulted_list_params_without_dangling_aliases() {
    let src = r#"
function View(props) {
  return <ul>
    {props.rows.map((row = props.fallback) => <li key={row.id}>{String(row.label)}</li>)}
  </ul>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(transform(program, empty_plugin_metadata()), cm));

    assert!(!out.contains("_$compiledKeyedList"), "{out}");
    assert!(out.contains("item === undefined ? _$rueCompiledProp0.get() : item"), "{out}");
    assert!(out.contains("_$reconcileKeyed("), "{out}");
}

#[test]
fn transform_entry_hardens_defaulted_destructured_lists_and_native_key_scan() {
    let src = r#"
function View(props) {
  return <ul>
    {props.rows.map(({ id, label } = props.fallback, index) => {
      const text = label ?? props.empty;
      return <li key={id}>{String(text)}:{String(index)}</li>;
    })}
  </ul>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(transform(program, empty_plugin_metadata()), cm));

    assert!(!out.contains("_$compiledKeyedList"), "{out}");
    assert!(out.contains("item === undefined ? _$rueCompiledProp1.get() : item"), "{out}");
    assert!(out.contains(".label ?? _$rueCompiledProp0.get()"), "{out}");
    assert!(out.contains("_$rowIndex1.get()"), "{out}");
}

#[test]
fn transform_entry_hardens_bare_loop_shadowing_and_post_return_phase2() {
    let src = r#"
import { Panel } from './compiled-components';
function View({ count, records, totals }) {
  const total = count * 2;
  const render = () => {
    for (total in records) {
      console.log(total);
    }
    for (total of totals) {
      console.log(total);
    }
    return { total };
  };
  return <Panel value={render().total}>{total}</Panel>;
  after(total);
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(transform(program, empty_plugin_metadata()), cm));

    assert!(out.contains("const total = _$rueCompiledProp0.get() * 2"), "{out}");
    assert!(out.contains("for(total in _$rueCompiledProp1.get())"), "{out}");
    assert!(out.contains("total of _$rueCompiledProp2.get()"), "{out}");
    assert!(out.contains("console.log(total)"), "{out}");
    assert!(out.contains("return { total }"), "{out}");
    assert!(out.contains("after(total)"), "{out}");
}

#[test]
fn apply_pre_hardens_duplicate_show_for_model_if_and_pre_boundaries() {
    let src = r#"
function View(props) {
  return <section>
    <input v-model:number={props.count} v-show={props.visible} r-show={props.enabled} />
    <template v-for="item in props.items">
      <span v-if={item.ready}>{item.label}</span>
      <span v-pre v-else>{item.raw}</span>
    </template>
    <button r-on:click-once-capture="props.save()">Save</button>
  </section>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(apply_pre(program), cm));

    assert!(out.contains("value={props.count}"), "{out}");
    assert!(out.contains("onInput"), "{out}");
    assert!(out.contains("_$compiledShowStyle"), "{out}");
    assert!(out.contains("props.enabled"), "{out}");
    assert!(out.contains("v-show={props.visible}"), "{out}");
    assert!(out.contains("(props.items).map"), "{out}");
    assert!(out.contains("([item])"), "{out}");
    assert!(out.contains("item.ready ?"), "{out}");
    assert!(out.contains("v-pre"), "{out}");
    assert!(out.contains("v-else"), "{out}");
    assert!(out.contains("onClickCaptureOnce"));
    assert!(!out.contains("_$compiledWithEventModifiers"));
}

#[test]
fn transform_entry_hardens_array_default_lists_for_loops_and_transition_finalizers() {
    let src = r#"
function View({ rows, fallback, count, limit }) {
  const total = count + 1;
  const render = () => {
    for (let i = total; i < limit; i++) {
      report(i, total);
    }
    return total;
  };
  return <section data-total={render()}>
    {rows.map(([id, meta] = fallback, index) => <li key={id}>{String(meta.label)}:{String(index)}</li>)}
    <TransitionGroup>
      {rows.map(row => {
        try {
          touch(row);
        } finally {
          return <li key={row.id}>{row.name}</li>;
        }
      })}
    </TransitionGroup>
  </section>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(transform(program, empty_plugin_metadata()), cm));

    assert!(!out.contains("_$compiledKeyedList"), "{out}");
    assert!(out.contains("=== undefined ? _$compiledPropsGet(__rue_props, \"fallback\")"), "{out}");
    assert!(out.contains("_$reconcileKeyed("), "{out}");
    assert!(
        out.contains("for(let i = __rue_phase2_total.get(); i < _$compiledPropsGet(__rue_props, \"limit\"); i++)"),
        "{out}"
    );
    assert!(out.contains("report(i, __rue_phase2_total.get())"), "{out}");
    assert!(out.contains("finally"), "{out}");
}

#[test]
fn transform_entry_hardens_member_children_type_alias_imports_and_ts_wrappers() {
    let src = r#"
import { Card, Panel } from './compiled-components';
import { "ref" as localRef, "FC" as RueFC } from '@rue-js/rue';

type ViewType = RueFC;

const View: ViewType = (props) => {
  const count = localRef(0);
  return <section>
    {props.children}
    {ctx.children}
    <Panel><Card title={'ok' as const} count={(1 as number)} onReady={props.ready} /></Panel>
    <span>{count.value}</span>
  </section>;
};
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(transform(program, empty_plugin_metadata()), cm));

    assert!(out.contains("@rue-js/rue/internal"), "{out}");
    assert!(out.contains("type \"FC\" as RueFC"), "{out}");
    assert!(out.contains("ref as localRef"), "{out}");
    assert!(out.matches("rue:text-hole:").count() >= 2, "{out}");
    assert!(out.contains("_$compiledPropsGet(props, \"children\")"), "{out}");
    assert!(out.contains("ctx.children"), "{out}");
    assert!(out.contains("_$mountCompiledComponent(_root, Card"), "{out}");
    assert!(out.contains("title: 'ok'"), "{out}");
    assert!(out.contains("count: 1"), "{out}");
    assert!(out.contains("_$compiledRoot("), "{out}");
}

#[test]
fn transform_entry_routes_accessor_get_children_as_renderable_slots() {
    let src = r#"
import { computed } from '@rue-js/rue';

function View(props) {
  const indicator = computed(() => props.done ? <span className="ok">ok</span> : `${props.percent}%`);
  return <section>
    <div>{indicator.get()}</div>
    <div>{(indicator.get() as any) ?? props.fallback}</div>
    <div>{props.ready && indicator.get()}</div>
    <span>{String(indicator.get())}</span>
    <span>{props.reader.get(0)}</span>
  </section>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(transform(program, empty_plugin_metadata()), cm));

    assert!(out.contains("@rue-js/rue/internal"), "{out}");
    assert!(out.contains("_$compiledValueFactory(indicator.get())"), "{out}");
    assert!(out.contains("(indicator.get() as any) ??"), "{out}");
    assert!(
        out.contains("_$rueCompiledProp4.get() ? _$compiledValueFactory(indicator.get()) :"),
        "{out}"
    );
    assert!(!out.contains("_$compiledBranch("), "{out}");
    assert!(out.matches("_$mountCompiledSlotAt(").count() >= 1, "{out}");
    assert!(!out.contains("_$settextContent(_") || !out.contains(", indicator.get());"), "{out}");
    assert!(out.contains("String(indicator.get())"), "{out}");
    assert!(out.contains("_$rueCompiledProp3.get().get(0)"), "{out}");
}

#[test]
fn transform_entry_hardens_slot_routerlink_modelled_lists_and_show_combo() {
    let src = r#"
import { Field, Panel, RouterLink } from './compiled-components';
function View(props) {
  return <Panel>
    {(ctx) => <span>{ctx.label}</span>}
    {props.ready && <Template slot={props.slotName}><RouterLink to={props.href} replace>Go</RouterLink></Template>}
    {props.rows.map((row = props.fallback, idx) => (
      <Field key={row.id} v-model:value-trim={row.value} v-show={row.visible}>{idx}</Field>
    ))}
  </Panel>;
}
"#;
    let (program, cm) = parse_program(src);
    let out = normalize(&emit(transform(program, empty_plugin_metadata()), cm));

    assert!(out.contains("__rue_slots"), "{out}");
    assert!(out.contains("_$compiledPropsGet(props, \"slotName\")"), "{out}");
    assert!(!out.contains("_$compiledKeyedList"), "{out}");
    assert!(out.contains("_$compiledPropsGet(props, \"rows\").map((row = _$compiledPropsGet(props, \"fallback\"), idx)"), "{out}");
    assert!(out.contains("onUpdateValueTrim"), "{out}");
    assert!(out.contains("_$compiledShowStyle"), "{out}");
    assert!(out.contains("RouterLink"), "{out}");
    assert!(!out.contains("v-model"), "{out}");
    assert!(!out.contains("v-show"), "{out}");
}

#[test]
fn compiled_props_direct_and_structural_reads() {
    let (program, cm) = parse_program(
        r#"
        export function View(props) {
            const dynamic = () => props[key()];
            const keys = () => Object.keys(props);
            const has = () => 'added' in props;
            const rest = () => { const { title, ...rest } = props; return rest; };
            const spread = () => ({ ...props });
            return <p>{props.title}</p>;
        }
    "#,
    );
    let output = emit(run_full_transform(program, true, None), cm);
    for helper in [
        "_$compiledPropsGet",
        "_$compiledPropsKeys",
        "_$compiledPropsHas",
        "_$compiledPropsSnapshot",
    ] {
        assert!(output.contains(helper), "missing {helper}: {output}");
    }
    assert!(!output.contains("props.title"), "{output}");
}

#[test]
fn compiled_props_preserves_shadowing_and_method_receivers() {
    let (program, cm) = parse_program(
        r#"
        export function View(props) {
            const call = () => props.action(1);
            const shadow = props => props.title;
            const caught = () => { try {} catch (props) { return props.title; } };
            const loop = () => { for (const props of []) { props.title; } };
            return <p>{props.title}</p>;
        }
    "#,
    );
    let output = emit(run_full_transform(program, true, None), cm);
    assert!(
        output.contains("_$compiledPropsCall(_$compiledPropsGet(props, \"action\"), props"),
        "{output}"
    );
    assert!(output.contains("props.title"), "{output}");
}

#[test]
fn compiled_props_leaves_default_exported_utilities_untouched() {
    for source in [
        "export default function format(value) { return value.toFixed(2) }",
        "export default value => value.toFixed(2)",
    ] {
        let (program, cm) = parse_program(source);
        let output = emit(run_full_transform(program, true, None), cm);
        assert!(!output.contains("_$compiledProps"), "{output}");
        assert!(output.contains("value.toFixed(2)"), "{output}");
    }
}

#[test]
fn builtin_primitives_have_independent_imports_without_component_adapters() {
    for (name, helper, entry) in [
        ("Teleport", "_$teleport", "teleport"),
        ("Transition", "_$transition", "transition"),
        ("TransitionGroup", "_$transitionGroup", "transitiongroup"),
        ("KeepAlive", "_$keepAlive", "keepalive"),
        ("Suspense", "_$suspense", "suspense"),
    ] {
        let source = format!(
            "import {{ {name} }} from '@rue-js/rue'; export const View = () => <{name}><b>content</b></{name}>;"
        );
        let (program, cm) = parse_program(&source);
        let out = emit(apply(program), cm);
        assert!(out.contains(helper), "{out}");
        assert!(out.contains(&format!("@rue-js/rue/internal/{entry}")), "{out}");
        assert!(!out.contains("internal/builtin"), "{out}");
        assert!(!out.contains("_$compiledComponent("), "{out}");
        assert!(!out.contains("_$createComponent("), "{out}");
        assert!(out.contains("_$mountCompiledSlotFactory"), "{out}");
    }
}

#[test]
fn builtin_template_erases_and_aliases_preserve_binding_identity() {
    for source in [
        "import { Template } from '@rue-js/rue'; const View = () => <Template><b>content</b></Template>;",
        "import { Template as Shell } from '@rue-js/rue'; const View = () => <Shell><b>content</b></Shell>;",
    ] {
        let (program, cm) = parse_program(source);
        let out = emit(apply(program), cm);
        assert!(!out.contains("internal/builtin"), "{out}");
        assert!(!out.contains("_$compiledComponent("), "{out}");
    }
    let (program, cm) =
        parse_program("const Teleport = () => <b>local</b>; const View = () => <Teleport/>;");
    let out = emit(apply(program), cm);
    assert!(!out.contains("_$teleport"), "{out}");
    assert!(out.contains("_$compiledComponent("), "{out}");
}

#[test]
fn bootstrap_lowers_render_to_lazy_mount_factory() {
    let (program, cm) = parse_program(
        "import { render } from '@rue-js/rue'; export const app = render(<main>ready</main>, '#app');",
    );
    let out = emit(apply(program), cm);
    assert!(out.contains("_$mountApp("), "{out}");
    assert!(out.contains("@rue-js/rue/internal/app"), "{out}");
    assert!(!out.contains("import { render"), "{out}");
    assert!(out.contains("_$compiledStaticRoot("), "{out}");
}

#[test]
fn bootstrap_lowers_create_rue_component_to_lazy_factory() {
    let (program, cm) = parse_program(
        "import { createRue as app } from '@rue-js/rue'; import App from './App'; export const root = app(App).mount('#app');",
    );
    let out = emit(apply(program), cm);
    assert!(out.contains("_$createApp("), "{out}");
    assert!(out.contains("@rue-js/rue/internal/app"), "{out}");
    assert!(!out.contains("createRue"), "{out}");
}

#[test]
#[should_panic(expected = "Rue compiler required: render expects JSX")]
fn bootstrap_rejects_arbitrary_render() {
    let (program, _) =
        parse_program("import { render } from '@rue-js/rue'; render(readUnknown(), '#app');");
    apply(program);
}

#[test]
#[should_panic(expected = "Rue compiler required")]
fn bootstrap_rejects_runtime_jsx() {
    let (program, _) =
        parse_program("import { jsx } from '@rue-js/rue/jsx-runtime'; jsx('main', {});");
    apply(program);
}
