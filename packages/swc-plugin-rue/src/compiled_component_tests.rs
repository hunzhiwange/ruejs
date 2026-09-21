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
fn leaves_plain_destructured_helpers_outside_the_component_props_transform() {
    let output = transform_module(
        r#"
const resolveSurfaceClass = ({ variant, invalid }) => {
  if (invalid) return 'border-error';
  if (variant === 'outlined') return 'border-base';
  return undefined;
};

const Root = ({ variant, invalid }) => (
  <fieldset className={resolveSurfaceClass({ variant, invalid })}>content</fieldset>
);
"#,
    );

    assert!(!output.contains("const resolveSurfaceClass = (__rue_props"), "{output}");
    assert!(output.contains("resolveSurfaceClass({"), "{output}");
}

#[test]
fn lowers_hooks_when_props_cannot_be_specialized() {
    let output = transform_module(
        r#"
import { useState, useEffect } from '@rue-js/rue';
export const App = props => {
  const [value, setValue] = useState(0);
  useEffect(() => consume(value), [value]);
  return <main {...props} onClick={() => setValue(value + 1)}>{String(value)}</main>;
};
"#,
    );
    assert!(output.contains("_$compiledUseState("), "{output}");
    assert!(output.contains("_$compiledUseEffect("), "{output}");
    assert!(!output.contains(" useState("), "{output}");
    assert!(!output.contains("_$compiledWithHookId"), "{output}");
}

#[test]
fn does_not_lower_same_named_hooks_from_non_rue_modules() {
    let output = transform_module(
        r#"
import { useState } from './client-hook-error';
export default function App() {
  const [value] = useState(0);
  return <main>{String(value)}</main>;
}
"#,
    );
    assert!(output.contains("useState(0)"), "{output}");
    assert!(!output.contains("_$compiledUseState("), "{output}");
}

#[test]
fn lowers_hooks_for_named_function_exported_by_default_identifier() {
    let source = r#"
import { useState } from '@rue-js/rue';
function Link() {
  const [pending, setPending] = useState(false);
  if (Math.random()) consume(pending);
  return Context.Provider({
    value: { pending },
    children: () => <a onClick={() => setPending(true)}>{String(pending)}</a>,
  });
}
export default Link;
"#;
    let output = transform_module(source);
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();
    assert!(output.contains("_$compiledUseState("), "{output}");
    assert!(!output.contains(" useState("), "{output}");
    assert!(compact.contains("children:_$compiledRoot("), "{output}");
    assert!(!compact.contains("children:()=>_$compiledRoot("), "{output}");
}

#[test]
fn lowers_hooks_for_named_function_exported_by_named_default_specifier() {
    let output = transform_module(
        r#"
import { useState } from '@rue-js/rue';
function Link() {
  const [pending, setPending] = useState(false);
  return <a onClick={() => setPending(true)}>{String(pending)}</a>;
}
export { Link as default };
"#,
    );
    assert!(output.contains("_$compiledUseState("), "{output}");
    assert!(!output.contains(" useState("), "{output}");
}

#[test]
fn rejects_conditional_hooks_without_props_specialization() {
    for statement in [
        "if (props.active) useState(0);",
        "props.active && useState(0);",
        "props.active ? useState(0) : undefined;",
        "for (const row of props.rows) useState(row);",
    ] {
        let source = format!(
            "import {{ useState }} from '@rue-js/rue'; export const App = props => {{ {statement} return <main {{...props}}>value</main>; }};"
        );
        assert!(std::panic::catch_unwind(|| transform_module(&source)).is_err(), "{statement}");
    }
}

#[test]
fn accepts_async_components_created_by_imported_use_component() {
    let output = transform_module(
        r#"
import { useComponent as lazyComponent } from '@rue-js/rue';

const DocSearchBox = lazyComponent(() => import('./DocSearchBox'));
const Layout = () => <main><DocSearchBox /></main>;
"#,
    );

    assert!(output.contains("DocSearchBox"), "{output}");
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
    assert!(compact.contains("_$compiledRoot("), "{output}");
    assert!(!compact.contains("_$compiledMarkComponentRenderReactive"), "{output}");
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
fn keeps_prop_initialized_uncontrolled_state_stable_across_branch_refreshes() {
    let output = transform_module(
        r#"
import { computed, ref } from '@rue-js/rue';

export function RangeLike(props) {
  const bounds = computed(() => ({ min: props.min ?? 0, max: props.max ?? 100 }));
  const uncontrolledValue = ref(props.defaultValue ?? bounds.get().min);
  const currentValue = computed(() => uncontrolledValue.value);
  if (props.enhanced) return <output>{currentValue.get()}</output>;
  return <input type="range" value={currentValue.get()} />;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    let setup_end = compact
        .find("uncontrolledValue:uncontrolledValue")
        .unwrap_or_else(|| panic!("stable setup bindings\n{output}"));
    let branch_condition =
        compact.find("if(_$rueCompiledProp1.get())").expect("compiled branch condition");

    assert!(setup_end < branch_condition, "{output}");
    assert_eq!(compact.matches("constuncontrolledValue=ref(").count(), 1, "{output}");
}

#[test]
fn moves_props_derived_snapshot_dependency_chains_before_compiled_setup() {
    let output = transform_module(
        r#"
import { ref } from '@rue-js/rue';

const resolveTextValue = value => value == null ? '' : String(value);

export function TextareaLike({ value, defaultValue, enhanced }) {
  const isControlled = value !== undefined;
  const initialTextValue = resolveTextValue(isControlled ? value : defaultValue);
  const currentValue = ref(initialTextValue);
  if (enhanced) return <output>{currentValue.value}</output>;
  return <textarea value={currentValue.value} />;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    let is_controlled = compact.find("constisControlled=").expect("control snapshot");
    let initial_value = compact.find("constinitialTextValue=").expect("initial value snapshot");
    let current_value = compact.find("constcurrentValue=ref(initialTextValue)").expect("state");

    assert!(is_controlled < initial_value, "{output}");
    assert!(initial_value < current_value, "{output}");
    assert_eq!(compact.matches("constcurrentValue=ref(").count(), 1, "{output}");
}

#[test]
fn preserves_tdz_order_for_immediate_watchers_and_mutable_callback_cells() {
    let output = transform_module(
        r#"
import { ref, watch } from '@rue-js/rue';

export function SelectLike({ value, enhanced }) {
  const selected = ref(value);
  let intent = selected.value;
  const sync = () => { intent = value; };
  watch(() => value, () => sync(), { immediate: true });
  if (enhanced) return <output>{selected.value}</output>;
  return <select value={intent} />;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    let mutable_cell = compact.find("letintent=").expect("mutable cell");
    let immediate_watch = compact.find("watch(()=>").expect("watch");
    assert!(mutable_cell < immediate_watch, "{output}");
}

#[test]
fn preserves_local_reader_order_for_snapshot_state_setup() {
    let output = transform_module(
        r#"
import { ref } from '@rue-js/rue';

export function ToggleLike({ checked, defaultChecked }) {
  const readControlled = () => checked;
  const state = ref(defaultChecked ?? readControlled() ?? false);
  return <input type="checkbox" checked={readControlled() ?? state.value} />;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();
    let reader = compact.find("constreadControlled=").expect("local reader");
    let state = compact.find("conststate=ref(").expect("snapshot state");

    assert!(reader < state, "{output}");
    assert_eq!(compact.matches("conststate=ref(").count(), 1, "{output}");
}

#[test]
fn compiles_fallthrough_branch_with_setup_conditionals_before_return() {
    let output = transform_module(
        r#"
export const Progress = ({ type = 'line', color, className }) => {
  if (type === 'native') {
    let cls = 'progress';
    if (color) cls += ` progress-${color}`;
    if (className) cls += ` ${className}`;
    return <progress className={cls} />;
  }

  const label = type === 'line' ? 'line' : 'circle';
  if (type === 'line') return <div data-type="line">{label}</div>;
  return <svg data-type="circle"><circle /></svg>;
};
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("_$compiledBranch("), "{output}");
    assert!(compact.contains("_$compiledPropsGet(__rue_props,\"type\")"), "{output}");
    assert!(compact.contains("_$withCompiledPropsUpdater("), "{output}");
    assert!(!compact.contains("if(type===\"line\")return_$compiledRoot"), "{output}");
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
    assert!(
        output
            .lines()
            .any(|line| line.contains("_$compiledUseEffect") && line.contains("internal/reactive")),
        "{output}"
    );
}

#[test]
fn refreshes_only_returns_that_capture_selector_bindings() {
    let output = transform_module(
        r#"
export function Layout(props) {
  if (insideLayout()) return <>{props.children}</>;
  const label = readLabel();
  function snapshot() { return label; }
  if (useSnapshot()) return <p>{snapshot()}</p>;
  return <section>{label}</section>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();
    assert!(compact.contains("__rue_compiled_branch_key:0,create:"), "{output}");
    assert!(compact.contains("__rue_compiled_branch_key:0,create:"), "{output}");
    for key in [1, 2] {
        assert!(
            compact.contains(&format!(
                "__rue_compiled_branch_key:{key},__rue_compiled_branch_refresh:true"
            )),
            "{output}"
        );
    }
}

#[test]
fn refreshes_a_same_key_branch_that_captures_a_signal_snapshot() {
    let output = transform_module(
        r#"
import { signal } from '@rue-js/rue';
const rows = signal(['first']);
export function ResourceList() {
  const snapshot = rows.get();
  if (!snapshot.length) return <p>empty</p>;
  return <ul>{snapshot.map(value => <li>{value}</li>)}</ul>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("constsnapshot=rows.get()"), "{output}");
    assert!(
        compact.contains("__rue_compiled_branch_key:1,__rue_compiled_branch_refresh:true"),
        "{output}"
    );
}

#[test]
fn does_not_refresh_a_single_terminal_compiled_return() {
    let output = transform_module(
        r#"
import { ref } from '@rue-js/rue';

export function StableInput() {
  const value = ref('one');
  const LocalInput = () => <input value={value.value} />;
  return <><LocalInput /></>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("_$compiledRoot("), "{output}");
    assert!(!compact.contains("__rue_compiled_branch_refresh:true"), "{output}");
}

#[test]
fn caches_immediate_watch_at_its_original_selector_position() {
    let output = transform_module(
        r#"
import { ref, watch } from '@rue-js/rue';
export function WatchedMenu(props) {
  const open = ref(false);
  const sync = value => { open.value = value; };
  watch(() => props.open, value => sync(!!value), { immediate: true });
  if (props.asSection) return <section data-open={open.value} />;
  return <div data-open={open.value} />;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert_eq!(compact.matches("watch(()=>").count(), 1, "{output}");
    assert!(compact.contains("setup-effect:"), "{output}");
    assert!(compact.contains("_$compiledSetup(\"WatchedMenu:setup-effect:"), "{output}");
    assert!(!compact.contains("__rue_compiled_branch_refresh:true"), "{output}");
}

#[test]
fn keeps_props_derived_values_live_inside_the_compiled_branch() {
    let output = transform_module(
        r#"
export function LivePropsView(props) {
  const stable = 'stable';
  const liveLabel = props.label.toUpperCase();
  function snapshotText() { return liveLabel; }
  if (liveLabel === 'ready') return <p>{liveLabel}</p>;

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
    let live_label = compact
        .find("constliveLabel=computed(()=>_$rueCompiledProp")
        .unwrap_or_else(|| panic!("missing live props derivation\n{output}"));
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
fn preserves_snapshot_dependency_order_with_shadowed_loop_bindings() {
    let output = transform_module(
        r#"
import { ref } from '@rue-js/rue';

export function SnapshotRows(props) {
  const initial = props.seed + 1;
  const state = ref(initial);
  for (const initial of props.rows) consume(initial);
  if (props.enhanced) return <output>{initial}</output>;
  return <p>{state.value}</p>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    let initial = compact.find("constinitial=").expect("snapshot dependency");
    let state = compact.find("conststate=ref(").expect("snapshot state");
    let loop_start = compact.find("for(constinitialof").expect("shadowed loop");
    assert!(initial < state && state < loop_start, "{output}");
    assert_eq!(compact.matches("conststate=ref(").count(), 1, "{output}");
    assert!(compact.contains("for(constinitialof_$compiledPropsGet(props,\"rows\"))"), "{output}");
    assert!(compact.contains("consume(initial)"), "{output}");
    assert!(!compact.contains("consume(initial.get())"), "{output}");
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
    default: return <p>{String(props.label)}</p>;
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

    assert!(compact.contains("functionLeaf(_$rueProps,_$rueSlots,_$rueOwner)"), "{output}");
    assert!(compact.contains("functionParent(_$rueProps,_$rueSlots,_$rueOwner)"), "{output}");
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
    assert!(compact.contains("children:(target,slotProps,owner)=>{"), "{output}");
    assert!(compact.contains("_$mountCompiledSlotFactory("), "{output}");
    assert!(compact.contains("_$mountCompiledSlotAt({parent:"), "{output}");
    assert!(compact.contains("_$compiledCreateElement(\"span\""), "{output}");
    assert!(compact.contains("_$compiledCreateElement(\"em\""), "{output}");
    assert!(!compact.contains("renderAnchor("), "{output}");
    assert!(!compact.contains("renderBetween("), "{output}");
    assert!(!compact.contains("_$compiledRootFactory"), "{output}");
}

#[test]
fn scalar_list_optimization_does_not_rewrite_unrelated_multi_node_slot_roots() {
    let output = transform_module(
        r#"
import { signal } from '@rue-js/rue';
import Shell from './Shell';
import Child from './Child';

const rows = signal([{ id: 1, label: 'A' }]);

export function Page() {
  return <Shell>
    <h1>title</h1>
    <ul>{rows.get().map(row => <li key={row.id}>{row.label}</li>)}</ul>
    <Child />
  </Shell>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();
    let page = compact.split("functionPage(").nth(1).expect("compiled Page declaration");

    assert!(compact.contains("_$reconcileKeyedSingle("), "{output}");
    assert!(page.contains("_$compiledRoot("), "{output}");
    assert!(!page.contains("_$compiledScalarOwnedRoot("), "{output}");
}

#[test]
fn classifies_nested_multi_node_root_without_scalarizing() {
    let output = transform_module(
        r#"
import { signal } from '@rue-js/rue';
const rows = signal([{ id: 1 }]);
export function Page() {
  return <><section>{rows.get().map(row => <i key={row.id}>row</i>)}</section><footer>end</footer></>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();
    let page = compact.split("functionPage(").nth(1).expect("compiled Page declaration");

    assert!(page.contains("_$compiledRoot("), "{output}");
    assert!(!page.contains("_$compiledScalarRoot("), "{output}");
    assert!(!page.contains("_$compiledScalarOwnedRoot("), "{output}");
}

#[test]
fn keeps_unknown_root_on_general_compiled_root() {
    use crate::compiled_invariants::{CompiledRootRangeProof, compiled_root_range_proof};

    let call = {
        let cm = Arc::new(SourceMap::default());
        let fm = cm.new_source_file(
            FileName::Custom("unknown-root-proof.ts".into()).into(),
            "_$compiledRoot(() => range);".to_string(),
        );
        let mut parser =
            Parser::new(Syntax::Typescript(TsSyntax::default()), StringInput::from(&*fm), None);
        let module = parser.parse_module().expect("parse module");
        let swc_core::ecma::ast::ModuleItem::Stmt(swc_core::ecma::ast::Stmt::Expr(statement)) =
            &module.body[0]
        else {
            panic!("expected expression statement");
        };
        let swc_core::ecma::ast::Expr::Call(call) = statement.expr.as_ref() else {
            panic!("expected call");
        };
        call.clone()
    };

    assert_eq!(compiled_root_range_proof(&call), CompiledRootRangeProof::Unknown);
}

#[test]
fn scalar_parent_preserves_nested_multi_node_root() {
    use swc_core::ecma::visit::VisitMutWith;
    let cm = Arc::new(SourceMap::default());
    let fm = cm.new_source_file(
        FileName::Custom("nested-root.ts".into()).into(),
        "_$compiledRoot(() => { const nested = _$compiledRoot(() => [first, last]); return [root, root]; });".to_string(),
    );
    let mut parser =
        Parser::new(Syntax::Typescript(TsSyntax::default()), StringInput::from(&*fm), None);
    let mut program = Program::Module(parser.parse_module().expect("parse roots"));
    program.visit_mut_with(&mut super::ScalarListRootPass);
    assert!(crate::compiled_invariants::validate(&program).is_ok());
}

#[test]
fn compiled_children_factory_preserves_value_call_compatibility() {
    let output = transform_module(
        r#"
const renderPreview = value => typeof value === 'function' ? value() : value;

function Preview({ children }) {
  const preview = Array.isArray(children) ? children[0] : children;
  return <section>{renderPreview(preview)}</section>;
}

export function Page() {
  return <Preview><h1>content</h1></Preview>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("_$compiledComponent(Preview"), "{output}");
    assert!(compact.contains("target==null?__slot"), "{output}");
    assert!(compact.contains("renderPreview(__slot"), "{output}");
}

#[test]
fn preserves_destructured_renderable_children_without_value_unwrap() {
    let output = transform_module(
        r#"
export function LegacyContainer(props) {
  if (props.enhanced) return <button>enhanced</button>;
  const { children } = props;
  return <div>{children}</div>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("_$compiledPropsGet("), "{output}");
    assert!(!compact.contains("\"children\").value"), "{output}");
}

#[test]
fn defers_opaque_render_helpers_until_the_slot_is_mounted() {
    let output = transform_module(
        r#"
import { signal } from '@rue-js/rue';

const renderPreview = preview => preview();

function Example({ preview }) {
  const tab = signal('preview');
  return <section>{tab.get() === 'preview' ? renderPreview(preview) : 'source'}</section>;
}

export const Page = () => <Example preview={() => <button>pick</button>} />;
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("_$compiledValueFactory(renderPreview(__slot"), "{output}");
    assert!(compact.contains("(_$rueCompiledProp0.get())"), "{output}");
    assert!(!compact.contains("?_$compiledValueFactory(renderPreview("), "{output}");
}

#[test]
#[should_panic(expected = "children is a slot factory")]
fn rejects_array_operations_on_component_children() {
    transform_module(
        "const Stack=({children})=><section>{[...children].reverse()}</section>; export const Page=()=> <Stack><i>A</i><b>B</b></Stack>;",
    );
}

#[test]
fn adapts_unproven_local_render_helper_list_values() {
    let output = transform_module(
        r#"
const renderItem = item => <span>{item.label}</span>;
export const List = ({ items }) => <div>{items.map(item => renderItem(item))}</div>;
"#,
    );
    assert!(output.contains("_$compiledValueFactory"), "{output}");
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
    assert!(compact.contains("===void0?"), "{output}");
    assert!(compact.contains("'fallback'"), "{output}");
    assert!(compact.contains("_$compiledValueFactory("), "{output}");
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
export const makeSection = (defaultAs) => {
  const Component = ({ as = defaultAs, className, children, ...rest }) => {
    const Tag = as;
    return Tag === 'div'
      ? <div {...rest} className={className}>{children}</div>
      : <span {...rest} className={className}>{children}</span>;
  };
  return Component;
};
export const Other = ({ children, ...rest }) => <section {...rest}>{children}</section>;
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("_$compiledOmitProps("), "{output}");
    assert!(compact.contains("_$compiledSpreadAttributes("), "{output}");
    assert!(!compact.contains("()=>rest"), "{output}");
    assert!(!compact.contains("\"@rue-js/rue/internal\""), "{output}");
    assert!(!compact.contains("_$spreadAttributes"), "{output}");
}

#[test]
fn leaves_lowercase_scalar_helpers_with_early_returns_uncompiled() {
    let output = transform_module(
        r#"
const readMaxLength = (props) => {
  if (typeof props.maxLength === 'number') return props.maxLength;
  if (typeof props.maxlength === 'number') return props.maxlength;
  return undefined;
};
export const Input = (props) => <span>{readMaxLength(props)}</span>;
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("constreadMaxLength=(props)=>{"), "{output}");
    assert!(!compact.contains("constreadMaxLength=(props,_$rueSlots,_$rueOwner)"), "{output}");
    assert!(!compact.contains("readMaxLength=(_$rueProps"), "{output}");
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
    assert!(compact.contains("switch("), "{output}");
    assert!(!compact.contains("_$compiledDynamicComponent"), "{output}");
    assert!(compact.contains("case\"card\":"), "{output}");
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
fn preserves_destructured_children_as_renderable_content_in_custom_elements() {
    let output = transform_module(
        r#"
const CustomElementHost = ({ children }) => <calendar-date>{children}</calendar-date>;
export const Page = () => <CustomElementHost><button>Previous</button><calendar-month /></CustomElementHost>;
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("_$rueCompiledSlot.get()"), "{output}");
    assert!(compact.contains("_$mountCompiledSlotAt({parent:"), "{output}");
    assert!(!compact.contains("_$settextContent"), "{output}");
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
    <Suspense fallback={<b>loading</b>}><i>suspense</i></Suspense>
    <KeepAlive><u key={props.cacheKey}>keep</u></KeepAlive>
    <Transition><em>transition</em></Transition>
    <TransitionGroup><small>group</small></TransitionGroup>
    <Template><span>template</span></Template>
  </main>;
}
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    for helper in ["_$teleport", "_$transition", "_$transitionGroup", "_$keepAlive", "_$suspense"] {
        assert!(compact.contains(helper), "{output}");
    }
    assert!(compact.matches("children:(target,slotProps,owner)=>").count() >= 5, "{output}");
    assert!(compact.contains("cacheKey:"), "{output}");
    assert!(compact.contains("cacheName:\"u\""), "{output}");
    assert!(!compact.contains("renderAnchor("), "{output}");
    assert!(!compact.contains("_$createComponent("), "{output}");
    assert!(!compact.contains("_$compiledComponent("), "{output}");
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
import { KeepAlive } from '@rue-js/rue';
import Panel from './Panel';
export const Viewport = props => <KeepAlive exclude="DraftPanel"><Panel key={props.active}/></KeepAlive>;
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();
    assert!(compact.contains("_$keepAlive("), "{output}");
    assert!(compact.contains("cacheKey:"), "{output}");
    assert!(compact.contains("cacheName:\"Panel\""), "{output}");
}

#[test]
fn props_reads_survive_render_reactive_component_wrappers() {
    let output = transform_module(
        r#"
import { type FC, computed, useSetup, ref } from '@rue-js/rue';
const Panel: FC<{mode?: string}> = ({mode, ...rest}) => {
  const state = useSetup(() => ({mode: ref('month')}));
  const currentMode = computed(() => mode ?? state.mode.value);
  return <section {...rest}><button onClick={() => { state.mode.value = 'year' }}>{currentMode.get()}</button></section>;
};
"#,
    );
    assert!(output.contains("_$compiledPropsGet(__rue_props, \"mode\")"), "{output}");
    assert!(!output.contains("__rue_props.mode"), "{output}");
}

#[test]
fn recognizes_state_aliases_from_the_precise_reactive_entry() {
    let output = transform_module(
        r#"
import { useState as state } from '@rue-js/rue/internal/reactive';
export function View() {
    const [value, setValue] = state(0);
    return <p>{value}</p>;
}
"#,
    );
    assert!(output.contains("_$compiledUseState"), "{output}");
    assert!(!output.contains("internal/compiler"), "{output}");
}

#[test]
fn recognizes_action_state_from_the_runtime_reactive_entry() {
    let output = transform_module(
        r#"
import { useActionState } from '@rue-js/runtime/internal/reactive';
export function View() {
    const [state, submit, pending] = useActionState(action, { count: 0 });
    return <form action={submit}><button disabled={pending}>{state.count}</button></form>;
}
"#,
    );
    assert!(output.contains("_$compiledUseActionState(\"View:hook:0\""), "{output}");
    assert!(!output.contains("disabled: pending"), "{output}");
    assert!(!output.contains("state.count"), "{output}");
}

#[test]
fn custom_hook_uses_child_owner_and_live_state_fields() {
    let output = transform_module(
        r#"
import { useState } from '@rue-js/rue';
function useCounter() { const [count, setCount] = useState(0); return { count, setCount }; }
export function View() { const first = useCounter(); const second = useCounter(); return <span>{String(first.count + second.count)}</span>; }
"#,
    );
    assert!(output.contains("_$compiledCreateOwner"), "{output}");
    assert!(output.contains("get count ()"), "{output}");
    assert!(!output.contains("_$compiledWithHookId"), "{output}");
}

#[test]
#[should_panic(expected = "Rue hooks require a statically compiled call")]
fn rejects_dynamic_hook_selection() {
    transform_module(
        r#"
import { useState } from '@rue-js/rue';
export function View() { const hook = Math.random() ? useState : (() => [0]); const [value] = hook(0); return <span>{String(value)}</span>; }
"#,
    );
}

#[test]
fn lowers_imported_effect_alias_to_an_owner_slot() {
    let output = transform_module(
        r#"
import { useEffect as afterMount } from '@rue-js/rue';
export function View() { afterMount(() => console.log('mounted'), []); return <span>ready</span>; }
"#,
    );
    assert!(output.contains("_$compiledUseEffect"), "{output}");
    assert!(!output.contains("_$compiledWithHookId"), "{output}");
}

#[test]
fn preserves_nested_local_bindings_that_shadow_destructured_props() {
    let output = transform_module(
        r#"
import { computed } from '@rue-js/rue';
export const View = ({ currentPath }) => {
  const Child = () => {
    const currentPath = computed(() => '/child');
    const readPath = () => currentPath.get();
    return <span>{readPath()}</span>;
  };
  return <Child path={currentPath} />;
};
"#,
    );
    assert!(output.contains("()=>currentPath.get()"), "{output}");
    assert!(!output.contains("_$rueCompiledProp0.get().get()"), "{output}");
}

#[test]
fn keeps_reactive_empty_early_return_inside_the_compiled_branch() {
    let output = transform_module(
        r#"
import { computed } from '@rue-js/rue';
export const Modal = ({ open }, slots = {}) => {
  const shouldMount = computed(() => open);
  if (!shouldMount.get()) return <></>;
  return <div role="dialog">{slots.footer ?? 'visible'}</div>;
};
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("_$compiledBranch(()=>{"), "{output}");
    assert!(compact.contains("if(!shouldMount.get())"), "{output}");
}

#[test]
fn keeps_structural_props_reads_inside_reactive_component_branches() {
    let output = transform_module(
        r#"
import { computed } from '@rue-js/rue';
export const SkeletonLike = props => {
  const { avatar, title, paragraph, ...rest } = props;
  const hasLoadingProp = computed(() => Object.prototype.hasOwnProperty.call(props, 'loading'));
  const composite = computed(() => hasLoadingProp.get() || avatar || title || paragraph);
  if (!composite.get()) return <span {...props}>primitive</span>;
  if (props.loading === false) return <>{props.children}</>;
  return <div {...rest}>loading</div>;
};
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("_$compiledBranch(()=>{"), "{output}");
    assert!(compact.contains("_$compiledPropsSnapshot(props)"), "{output}");
    assert!(compact.contains("_$compiledPropsGet(props,\"loading\")"), "{output}");
}

#[test]
fn routes_computed_callback_results_through_renderable_children() {
    let output = transform_module(
        r#"
import { computed } from '@rue-js/rue';
export const Item = ({ renderItem, label }) => {
  const content = computed(() => renderItem ? renderItem() : label);
  return <button>{content}</button>;
};
"#,
    );

    assert!(output.contains("_$compiledValueFactory(content)"), "{output}");
    assert!(!output.contains("_$compiledText"), "{output}");
}

#[test]
fn lowers_reactive_branches_in_nested_local_component_factories() {
    let output = transform_module(
        r#"
import { ref, type FC } from '@rue-js/rue';
export const View: FC<{ spinning?: boolean }> = props => {
  const visible = ref(props.spinning ?? false);
  const fullscreen = false;
  const isNested = true;
  const Indicator = () => visible.value
    ? !fullscreen && !isNested ? <span>loading</span> : <div>loading</div>
    : <></>;
  return <section><Indicator /></section>;
};
"#,
    );
    let compact: String = output.chars().filter(|ch| !ch.is_whitespace()).collect();

    assert!(compact.contains("constIndicator=(_$rueProps,_$rueSlots,_$rueOwner)=>"), "{output}");
    assert!(compact.contains("_$compiledBranch(()=>"), "{output}");
    assert!(!compact.contains("create:()=>null"), "{output}");
    assert!(compact.contains("__rue_compiled_branch_key:0"), "{output}");
    assert!(compact.contains("__rue_compiled_branch_key:1"), "{output}");
}
