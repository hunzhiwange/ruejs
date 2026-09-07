use std::sync::Arc;

use swc_core::common::{FileName, SourceMap};
use swc_core::ecma::ast::Program;
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn transform_module(src: &str) -> String {
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("compiled-component-regions-test.tsx".into()).into(),
        src.to_string(),
    );
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    let program = Program::Module(parser.parse_module().expect("parse module"));
    let program = crate::run_full_transform_with_options(program, true, true, None);
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    emitter.emit_program(&program).expect("emit transformed module");
    String::from_utf8(buf).expect("utf8")
}

#[test]
fn custom_composables_keep_hidden_refs_reactive_in_deep_compilation() {
    let output = transform_module(
        r#"
import { type FC } from '@rue-js/rue';

const LocaleReader: FC = () => {
  const { locale, translate } = useI18n();
  const currentLocale = locale.value;
  return <p>{translate('hello', currentLocale)}</p>;
};
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("constcurrentLocale=computed(()=>locale.value)"), "{output}");
    assert!(compact.contains("currentLocale.get()"), "{output}");
    assert!(compact.contains("useI18n()"), "{output}");
    assert!(compact.contains("_$withCompiledPropsUpdater(vapor("), "{output}");
    assert!(compact.contains("_$compiledMarkComponentRenderReactive(LocaleReader)"), "{output}");
}

#[test]
fn groups_top_level_fallthrough_setup_into_stable_regions() {
    let output = transform_module(
        r#"
import { ref, signal } from '@rue-js/rue';

export function RegionView(props) {
  const entryLabel = 'entry';
  const entrySignal = signal(0);
  const entryRef = ref(1);
  function entryText() { return entryLabel; }
  if (props.phase === 'entry') return <p>entry</p>;

  const middleLabel = 'middle';
  const middleSignal = signal(2);
  const middleRef = ref(3);
  function middleText() { return middleLabel; }
  if (props.phase === 'middle') return <p>middle</p>;

  const finalLabel = 'final';
  const finalSignal = signal(4);
  const finalRef = ref(5);
  function finalText() { return finalLabel; }
  return <p title={props.label}>final</p>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert_eq!(
        compact.matches("_$compiledSetup(\"RegionView:setup-region:").count(),
        3,
        "{output}"
    );
    assert_eq!(compact.matches("_$withCompiledHookScope(()=>").count(), 1, "{output}");
    assert!(compact.contains("\"RegionView:setup-region:0\""), "{output}");
    assert!(compact.contains("\"RegionView:setup-region:1\""), "{output}");
    assert!(compact.contains("\"RegionView:setup-region:2\""), "{output}");
    assert!(compact.contains("constentrySignal=signal(0);constentryRef=ref(1);"), "{output}");
    assert!(compact.contains("constmiddleSignal=signal(2);constmiddleRef=ref(3);"), "{output}");
    assert!(compact.contains("constfinalSignal=signal(4);constfinalRef=ref(5);"), "{output}");
    assert!(!compact.contains("\"signal:"), "{output}");
    assert!(!compact.contains("\"ref:"), "{output}");
    assert!(
        compact.contains(
            "entryLabel:entryLabel,entrySignal:entrySignal,entryRef:entryRef,entryText:entryText"
        ),
        "{output}"
    );
    assert!(compact.contains("middleLabel:middleLabel,middleSignal:middleSignal,middleRef:middleRef,middleText:middleText"), "{output}");
    assert!(
        compact.contains(
            "finalLabel:finalLabel,finalSignal:finalSignal,finalRef:finalRef,finalText:finalText"
        ),
        "{output}"
    );
    assert!(compact.contains("_$compiledBranch("), "{output}");
    assert!(compact.contains("_$compiledRoot("), "{output}");
    assert!(!compact.contains("vapor("), "{output}");
    assert!(!compact.contains("_$createElement"), "{output}");
    assert!(!compact.contains("_$compiledMarkComponentRenderReactive"), "{output}");
}

#[test]
fn assigns_static_compiled_hook_slots_without_vapor_helpers() {
    let output = transform_module(
        r#"
import { onMounted, onUnmounted, useEffect, useMemo, useRef, useSignal } from '@rue-js/rue';

export function HookView() {
  const value = useMemo(() => 'ready', []);
  const stable = useRef(value);
  const [count] = useSignal(1);
  useEffect(() => () => consume(stable.current));
  onMounted(() => consume('mounted'));
  onUnmounted(() => consume('unmounted'));
  return <p>ready</p>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("useMemo(()=>'ready',[])"), "{output}");
    assert!(compact.contains("_$compiledUseRef(\"HookView:hook:0\""), "{output}");
    assert!(compact.contains("useSignal(1)"), "{output}");
    assert!(!compact.contains("_$compiledUseMemo"), "{output}");
    assert!(!compact.contains("_$compiledUseSignal"), "{output}");
    assert!(compact.contains("_$compiledUseEffect(\"HookView:hook:1\""), "{output}");
    assert!(!compact.contains("_$compiledWithHookId"), "{output}");
    assert!(!compact.contains("\"@rue-js/rue/internal\""), "{output}");
}

#[test]
fn lowers_react_use_state_bindings_to_hidden_signals() {
    let output = transform_module(
        r#"
import { useEffect, useState, useState as useCounter } from '@rue-js/rue';

export function Counter() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useCounter(() => 1);
  const snapshot = { count, step };
  const readLatest = () => count + step;
  useEffect(() => consume(count), [count, step]);
  return <button title={count.toString()} onClick={() => setCount(count + step)}>
    {count}{snapshot.count}{readLatest()}
  </button>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(
        compact.contains("const[_$state,setCount]=_$compiledUseState(\"Counter:hook:0\",0)"),
        "{output}"
    );
    assert!(
        compact.contains("const[_$state1,setStep]=_$compiledUseState(\"Counter:hook:1\",()=>1)"),
        "{output}"
    );
    assert!(
        compact.contains("constsnapshot={count:_$state.get(),step:_$state1.get()}"),
        "{output}"
    );
    assert!(compact.contains("()=>_$state.get()+_$state1.get()"), "{output}");
    assert!(compact.contains("()=>[_$state.get(),_$state1.get()]"), "{output}");
    assert!(compact.contains("_$state.get().toString()"), "{output}");
    assert!(compact.contains("setCount(_$state.get()+_$state1.get())"), "{output}");
    assert!(!compact.contains("const[count,setCount]"), "{output}");
    assert!(!compact.contains("const[step,setStep]"), "{output}");
}

#[test]
fn preserves_shadowed_react_state_names() {
    let output = transform_module(
        r#"
import { useState } from '@rue-js/rue';

export function ShadowedState() {
  const [count, setCount] = useState(0);
  const rootObject = { count };
  const member = external.count;
  return <button onClick={() => {
    const fromParameter = (count) => count + 1;
    function fromFunction(count) { return count + 2; }
    {
      const count = 3;
      consume(count);
    }
    try { consume(rootObject); } catch (count) { consume(count); }
    for (const count of values) consume(count);
    setCount(count + fromParameter(count) + fromFunction(count));
  }}>
    {count}{member}
  </button>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("const[_$state,setCount]=_$compiledUseState"), "{output}");
    assert!(compact.contains("constrootObject={count:_$state.get()}"), "{output}");
    assert!(compact.contains("external.count"), "{output}");
    assert!(compact.contains("(count)=>count+1"), "{output}");
    assert!(compact.contains("functionfromFunction(count){returncount+2;}"), "{output}");
    assert!(compact.contains("constcount=3;consume(count)"), "{output}");
    assert!(compact.contains("catch(count){consume(count);}"), "{output}");
    assert!(compact.contains("for(constcountofvalues)consume(count)"), "{output}");
    assert!(
        compact.contains(
            "setCount(_$state.get()+fromParameter(_$state.get())+fromFunction(_$state.get()))"
        ),
        "{output}"
    );
}

#[test]
fn wraps_compiled_use_effect_dependencies_in_lazy_reader() {
    let output = transform_module(
        r#"
import { useEffect, useMemo, useCallback } from '@rue-js/rue';

export function EffectView(props) {
  useEffect(() => consume(count.get()), [count.get(), props.id]);
  useEffect(callback, deps);
  useEffect(callback, null);
  useEffect(callback);
  useEffect(callback, []);
  const memo = useMemo(() => compute(), deps);
  const handler = useCallback(() => consume(), deps);
  return <p>ready</p>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    for expected in [
        "_$compiledUseEffect(\"EffectView:hook:0\",()=>consume(count.get()),()=>[count.get(),_$rueCompiledProp0.get()])",
        "_$compiledUseEffect(\"EffectView:hook:1\",callback,()=>deps)",
        "_$compiledUseEffect(\"EffectView:hook:2\",callback,()=>null)",
        "_$compiledUseEffect(\"EffectView:hook:3\",callback)",
        "_$compiledUseEffect(\"EffectView:hook:4\",callback,()=>[])",
        "useMemo(()=>compute(),deps)",
        "useCallback(()=>consume(),deps)",
    ] {
        assert!(compact.contains(expected), "missing {expected}\n{output}");
    }
    assert!(!compact.contains("_$compiledUseMemo"), "{output}");
    assert!(!compact.contains("_$compiledUseCallback"), "{output}");
    assert!(output.contains(", _$compiledUseEffect,"), "{output}");
}

#[test]
fn keeps_props_derived_values_live_inside_the_compiled_branch() {
    let output = transform_module(
        r#"
export function LivePropsView(props) {
  const stable = 'stable';
  const liveLabel = props.label.toUpperCase();
  function snapshotText() { return liveLabel; }
  if (liveLabel === 'ready') return <p>ready</p>;

  const tail = 'tail';
  return <p title={props.label}>tail</p>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert_eq!(
        compact.matches("_$compiledSetup(\"LivePropsView:setup-region:").count(),
        2,
        "{output}"
    );
    assert!(!compact.contains("liveLabel:liveLabel"), "{output}");
    assert!(!compact.contains("snapshotText:snapshotText"), "{output}");
    let branch_start = compact.find("_$compiledBranch(()=>{").expect("compiled branch");
    let live_label =
        compact.find("constliveLabel=_$rueCompiledProp").expect("live props derivation");
    assert!(live_label > branch_start, "{output}");
    assert!(
        compact.find("functionsnapshotText()").expect("live helper") > branch_start,
        "{output}"
    );
    assert!(compact.contains(".get().toUpperCase()"), "{output}");
    assert!(compact.contains("__rue_compiled_branch_refresh:true"), "{output}");
    assert!(!compact.contains("vapor("), "{output}");
}

#[test]
fn rewrites_destructured_props_inside_compiled_setup_regions() {
    let output = transform_module(
        r#"
export function Provider({ theme, token }) {
  const runtime = useToken({ theme, token });
  if (runtime.active) return <section>active</section>;
  return <div>{runtime.label}</div>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("useToken({theme:_$rueCompiledProp"), "{output}");
    assert!(!compact.contains("useToken({theme:theme,token:token})"), "{output}");
}

#[test]
fn preserves_nested_parameter_shadowing_for_destructured_props() {
    let output = transform_module(
        r#"
export function Table({ sortStates }) {
  const normalize = (sortStates) => sortStates.filter(Boolean);
  const rows = normalize(sortStates);
  if (rows.length) return <div>rows</div>;
  return <span>empty</span>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();
    assert!(compact.contains("(sortStates)=>sortStates.filter(Boolean)"), "{output}");
    assert!(compact.contains("normalize(_$rueCompiledProp"), "{output}");
}

#[test]
fn compiles_switch_control_flow_through_keyed_compiled_branches() {
    let output = transform_module(
        r#"
export function UnsupportedView(props) {
  switch (props.phase) {
    case 'first': return <p>first</p>;
    default: return <p>{props.label}</p>;
  }
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(!compact.contains("vapor("), "{output}");
    assert!(compact.contains("_$template("), "{output}");
    assert!(compact.contains("<p>rue:direct-text</p>"), "{output}");
    assert!(!compact.contains("renderAnchor("), "{output}");
    assert!(!compact.contains("_$createElement"), "{output}");
    assert!(compact.contains("_$compiledBranch("), "{output}");
    assert!(compact.contains("__rue_compiled_branch_key"), "{output}");
}

#[test]
fn compiles_nested_early_returns_and_logical_results_without_fallback() {
    let output = transform_module(
        r#"
export function ControlFlowView(props) {
  if (props.ready) {
    if (props.detail) return props.visible && <strong>detail</strong>;
    return <p>ready</p>;
  }
  if (props.failed) return <p>failed</p>;
  return <></>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(!compact.contains("vapor("), "{output}");
    assert!(!compact.contains("renderBetween("), "{output}");
    assert!(!compact.contains("renderAnchor("), "{output}");
    assert!(compact.contains("_$compiledBranch("), "{output}");
    assert!(compact.contains("__rue_compiled_branch_key"), "{output}");
}

#[test]
fn compiles_zero_prop_and_nested_local_components_through_the_direct_abi() {
    let output = transform_module(
        r#"
function Leaf() {
  return <strong>leaf</strong>;
}

export function Parent() {
  return <section><Leaf /></section>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("functionLeaf()"), "{output}");
    assert!(compact.contains("functionParent()"), "{output}");
    assert!(compact.contains("_$compiledComponent(Leaf,()=>({}))"), "{output}");
    assert!(compact.contains("_$mountCompiledSlotAt({parent:"), "{output}");
    assert!(!compact.contains("_$createComponent"), "{output}");
    assert!(!compact.contains("\"@rue-js/rue/internal\""), "{output}");
}

#[test]
fn compiles_imported_component_children_through_the_direct_abi() {
    let output = transform_module(
        r#"
import Shell from './Shell';
import { RouterView } from '@rue-js/router';
export function App() {
  return <Shell><RouterView /></Shell>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();
    assert!(compact.contains("_$compiledComponent(Shell"), "{output}");
    assert!(compact.contains("_$mountCompiledComponent("), "{output}");
    assert!(!compact.contains("_$createComponent"), "{output}");
    assert!(!compact.contains("\"@rue-js/rue/internal\""), "{output}");
}

#[test]
fn compiles_imported_component_conditional_children_through_the_direct_abi() {
    let output = transform_module(
        r#"
import Layout from './Layout';
import { RouterView } from '@rue-js/router';
export function App() {
  const direct = readRoute().path === '/direct';
  return <Layout>{direct ? <RouterView /> : <Layout><RouterView /></Layout>}</Layout>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();
    assert!(compact.contains("_$compiledBranch("), "{output}");
    assert!(!compact.contains("_$createComponent"), "{output}");
    assert!(!compact.contains("\"@rue-js/rue/internal\""), "{output}");
}

#[test]
fn compiles_local_component_children_through_the_slot_factory_abi() {
    let output = transform_module(
        r#"
function Frame(props) {
  return <section>{props.children}</section>;
}

export function Page() {
  return <main><Frame><span>body</span><><em>tail</em></></Frame></main>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("_$compiledComponent(Frame"), "{output}");
    assert!(
        compact.contains("children:[(target,slotProps,owner)=>_$mountCompiledSlotFactory("),
        "{output}"
    );
    assert!(compact.contains("_$mountCompiledSlotAt({parent:"), "{output}");
    assert!(compact.contains("_$compiledCreateElement(\"span\""), "{output}");
    assert!(compact.contains("_$compiledCreateElement(\"em\""), "{output}");
    assert!(!compact.contains("renderAnchor("), "{output}");
    assert!(!compact.contains("renderBetween("), "{output}");
    assert!(!compact.contains("_$compiledRootFactory"), "{output}");
}

#[test]
fn preserves_multiple_component_children_as_an_ordered_slot_array() {
    let output = transform_module(
        r#"
function Stack({ reverse, children }) {
  return <section>{reverse ? [...children].reverse() : children}</section>;
}

export function Page() {
  return <Stack reverse>
    <span>A</span>
    <span>B</span>
    <span>C</span>
  </Stack>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("children:[(target,slotProps,owner)=>"), "{output}");
    assert_eq!(compact.matches("_$mountCompiledSlotFactory(").count(), 3, "{output}");
    assert!(!compact.contains("_$compiledCreateText("), "{output}");
}

#[test]
fn mounts_map_results_from_a_local_jsx_render_helper_as_nodes() {
    let output = transform_module(
        r#"
const renderItem = item => <span>{item.label}</span>;
export const List = ({ items }) => (
  <div>{items.map(item => renderItem(item))}</div>
);
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains(".map((item)=>renderItem(item))"), "{output}");
    assert!(compact.contains("renderAnchor(__slot,"), "{output}");
    assert!(!compact.contains("_$settextContent"), "{output}");
}

#[test]
fn compiles_destructured_props_with_defaults_as_live_getters() {
    let output = transform_module(
        r#"
export function Greeting({ label = 'fallback', active }) {
  return <p class={active ? 'active' : 'idle'}>{label}</p>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("_$compiledSignal("), "{output}");
    assert!(compact.contains("_$withCompiledPropsUpdater("), "{output}");
    assert!(compact.contains("===void0?'fallback':"), "{output}");
    assert!(!compact.contains("\"@rue-js/rue/internal\""), "{output}");
}

#[test]
fn compiles_prop_driven_map_components_with_live_prop_updaters() {
    let output = transform_module(
        r#"
const VideoList = props => (
  <div>
    <span>{props.videos.length}</span>
    {props.videos.map(video => <p key={video.title}>{video.title}</p>)}
  </div>
);

export const SearchResults = props => <VideoList videos={props.videos} />;
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.matches("_$withCompiledPropsUpdater(").count() >= 2, "{output}");
    assert!(compact.contains("_$rueCompiledProp0.get()||[]"), "{output}");
    assert!(compact.contains("_$compiledComponent(VideoList"), "{output}");
    assert!(!compact.contains("_$createComponent"), "{output}");
}

#[test]
fn compiles_destructured_rest_props_and_native_spread_without_vapor() {
    let output = transform_module(
        r#"
export const Notice = ({ role, onClick, ...rest }) => {
  const attrs = { ...rest, role: role ?? 'status' };
  return <button {...attrs} onClick={onClick}>notice</button>;
};
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("_$compiledOmitProps("), "{output}");
    assert!(compact.contains("_$compiledSpreadAttributes("), "{output}");
    assert!(!compact.contains("\"@rue-js/rue/internal\""), "{output}");
    assert!(!compact.contains("_$spreadAttributes"), "{output}");
}

#[test]
fn compiles_conditional_component_slots_with_empty_branches() {
    let output = transform_module(
        r#"
const Slot = ({ children }) => <span>{children}</span>;
export const Content = ({ end, visible, children }) => end ? (
  <>{visible ? <Slot>{children}</Slot> : null}</>
) : (
  <>{visible ? <Slot>{children}</Slot> : false}</>
);
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("_$compiledBranch("), "{output}");
    assert!(compact.contains("_$compiledComponent(Slot"), "{output}");
    assert!(!compact.contains("renderAnchor("), "{output}");
    assert!(!compact.contains("_$createComponent"), "{output}");
    assert!(!compact.contains("\"@rue-js/rue/internal\""), "{output}");
}

#[test]
fn compiles_explicit_dynamic_component_registry_without_vapor_dispatch() {
    let output = transform_module(
        r#"
const Card = ({ children }) => <article>{children}</article>;
const Panel = ({ children }) => <section>{children}</section>;
export const View = ({ kind, children }) => (
  <Component is={kind} registry={{ card: Card, panel: Panel }} title="demo">
    {children}
  </Component>
);
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();
    assert!(compact.contains("_$compiledDynamicComponent("), "{output}");
    assert!(compact.contains("[_$rueCompiledProp"), "{output}");
    assert!(!compact.contains("_$createComponent"), "{output}");
    assert!(!compact.contains("renderAnchor("), "{output}");
    assert!(!compact.contains("\"@rue-js/rue/internal\""), "{output}");
}

#[test]
fn compiles_native_spread_with_local_component_child() {
    let output = transform_module(
        r#"
        import type { FC } from '@rue-js/rue'
        const Child: FC<any> = ({ children }) => <span>{children}</span>
        const Parent: FC<any> = ({ children, ...rest }) => (
          <button {...rest}><Child>{children}</Child></button>
        )
        export default Parent
        "#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();
    assert!(!compact.contains("\"@rue-js/rue/internal\""), "{output}");
    assert!(!compact.contains("_$createComponent"), "{output}");
    assert!(compact.contains("_$compiledComponent(Child"), "{output}");
    assert!(compact.contains("_$mountCompiledSlotAt({parent:"), "{output}");
}

#[test]
fn compiles_conditional_fragment_component_with_opaque_named_slot() {
    let output = transform_module(
        r#"
const Slot = ({ children }) => <span>{children}</span>;
const Child = ({ end, icon, children }) => end ? (
  <>{children ? <Slot>{children}</Slot> : null}{icon ? <Slot>{icon}</Slot> : null}</>
) : (
  <>{icon ? <Slot>{icon}</Slot> : null}{children ? <Slot>{children}</Slot> : null}</>
);
export const Parent = ({ children, ...rest }) => <button {...rest}><Child icon="x">{children}</Child></button>;
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();
    assert!(!compact.contains("\"@rue-js/rue/internal\""), "{output}");
    assert!(compact.contains("_$compiledComponent(Child"), "{output}");
    assert!(compact.contains("_$mountCompiledSlotAt({parent:"), "{output}");
}

#[test]
fn compiles_control_builtins_through_closed_slot_factories() {
    let output = transform_module(
        r#"
import { KeepAlive, Suspense, Teleport, Template, Transition, TransitionGroup } from '@rue-js/rue';
export function Builtins(props) {
  return <main>
    <Teleport to={props.target}><b>teleport</b></Teleport>
    <Suspense fallback={props.fallback}><i>suspense</i></Suspense>
    <KeepAlive><u key={props.cacheKey}>keep</u></KeepAlive>
    <Transition><em>transition</em></Transition>
    <TransitionGroup><small>group</small></TransitionGroup>
    <Template><span>template</span></Template>
  </main>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert_eq!(compact.matches("_$compiledComponent(").count(), 4, "{output}");
    assert_eq!(compact.matches("_$mountCompiledSlotAt(").count(), 4, "{output}");
    assert_eq!(compact.matches("children:(target,slotProps,owner)=>").count(), 4, "{output}");
    assert!(compact.contains("cacheKey:_$rueCompiledProp0.get()"), "{output}");
    assert!(compact.contains("cacheName:\"u\""), "{output}");
    assert!(!compact.contains("renderBetween("), "{output}");
    assert_eq!(compact.matches("renderAnchor(").count(), 2, "{output}");
    assert_eq!(compact.matches("_$createComponent(").count(), 2, "{output}");
    assert!(!compact.contains("_$compiledRootFactory("), "{output}");
}

#[test]
fn leaves_async_components_outside_compiled_branch_factories() {
    let output = transform_module(
        r#"
export async function DelayedChunk() {
  await loadChunk();
  return <div>loaded</div>;
}
"#,
    );

    assert!(output.contains("async function DelayedChunk"), "{output}");
    assert!(output.contains("await loadChunk()"), "{output}");
    assert!(!output.contains("_$compiledBranch"), "{output}");
}

#[test]
fn infers_dynamic_component_keep_alive_identity_and_name() {
    let output = transform_module(
        r#"
import { Component, KeepAlive } from '@rue-js/rue';
export const Viewport = props => (
  <KeepAlive exclude="DraftPanel">
    <Component is={props.views[props.active]} key={props.active} />
  </KeepAlive>
);
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();
    assert!(compact.contains("cacheKey:_$rueCompiledProp0.get()"), "{output}");
    assert!(
        compact.contains("cacheName:_$rueCompiledProp1.get()[_$rueCompiledProp0.get()].name"),
        "{output}"
    );
}
