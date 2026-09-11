use swc_plugin_rue::apply;

mod utils;

fn import_for<'a>(output: &'a str, capability: &str) -> &'a str {
    output
        .lines()
        .find(|line| line.contains(&format!("@rue-js/rue/internal/{capability}\"")))
        .unwrap_or_else(|| panic!("missing {capability} import: {output}"))
}

#[test]
fn does_not_auto_inject_signal_user_api() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const count = signal(0);

const Demo: FC = () => <div>{count.value}</div>;
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::strip_marker(&utils::emit(program, cm));
    let normalized = utils::normalize(&out);

    assert!(normalized.contains("signal(0)"));
    assert!(!normalized.contains(&utils::normalize(", signal } from '@rue-js/rue'")));
    assert!(!normalized.contains(&utils::normalize(" signal, ")));
}

#[test]
fn does_not_auto_inject_h_user_api() {
    let src = r##"
const node = h('div', null, 'hello');
"##;

    let (program, cm) = utils::parse(src, "h-test.tsx");
    let program = apply(program);
    let out = utils::strip_marker(&utils::emit(program, cm));
    let normalized = utils::normalize(&out);

    assert!(normalized.contains(&utils::normalize("const node = h('div', null, 'hello');")));
    assert!(!normalized.contains(&utils::normalize("import { h } from '@rue-js/rue';")));
    assert!(!normalized.contains(&utils::normalize(", h } from '@rue-js/rue'")));
}

#[test]
fn safe_jsx_uses_only_the_compiled_runtime_boundary() {
    let src = r##"
import { type FC } from '@rue-js/rue';

const Demo: FC = () => <div id="safe">hello</div>;
"##;

    let (program, cm) = utils::parse(src, "safe-compiled-boundary.tsx");
    let program = apply(program);
    let out = utils::strip_marker(&utils::emit(program, cm));
    let normalized = utils::normalize(&out);

    assert!(out.contains("@rue-js/rue/internal/dom"));
    assert!(!out.contains("from \"@rue-js/rue/internal/component\""));
    assert!(!out.contains(concat!("@rue-js", "/jsx-runtime")));
    assert!(!out.contains(concat!("@rue-js", "/jsx-dev-runtime")));
    assert!(!normalized.contains(&utils::normalize("import { h } from '@rue-js/rue';")));
    assert!(!normalized.contains(&utils::normalize(", h } from '@rue-js/rue';")));
    assert!(!normalized.contains(&utils::normalize("h(")));
    assert!(!normalized.contains(&utils::normalize("jsx(")));
    assert!(!normalized.contains(&utils::normalize("jsxs(")));
}

#[test]
fn safe_fragment_uses_only_the_compiled_runtime_boundary() {
    let src = r##"
import { type FC } from '@rue-js/rue';
const Demo: FC = () => <><h1>safe</h1><span>ready</span></>;
"##;

    let (program, cm) = utils::parse(src, "safe-fragment-boundary.tsx");
    let out = utils::strip_marker(&utils::emit(apply(program), cm));

    assert!(out.contains("@rue-js/rue/internal/dom"), "{out}");
    assert!(!out.contains("from \"@rue-js/rue/internal/compiler\""), "{out}");
    assert!(out.contains("_$compiledRoot"), "{out}");
    assert!(!utils::normalize(&out).contains(&utils::normalize("vapor(")), "{out}");
}

#[test]
fn compiler_consumes_jsx_in_every_expression_container() {
    let src = r##"
const moduleNode = <main>module</main>;
const record = { node: <aside>field</aside> };

function withDefault(node = <header>default</header>) {
  const nested = () => () => <section>nested</section>;
  return [node, nested()];
}

async function loadView() {
  const body = <><UI.Card>member</UI.Card><footer>async</footer></>;
  return body;
}
"##;

    let (program, cm) = utils::parse(src, "all-expression-containers.tsx");
    let out = utils::strip_marker(&utils::emit(apply(program), cm));
    let normalized = utils::normalize(&out);

    assert!(!out.contains(concat!("@rue-js", "/jsx-runtime")), "{out}");
    assert!(!out.contains(concat!("@rue-js", "/jsx-dev-runtime")), "{out}");
    assert!(!normalized.contains("jsx("), "{out}");
    assert!(!normalized.contains("jsxs("), "{out}");
    assert!(!normalized.contains("jsxDEV("), "{out}");
    assert!(!out.contains("<main"), "{out}");
    assert!(!out.contains("<aside"), "{out}");
    assert!(!out.contains("<header"), "{out}");
    assert!(!out.contains("<section"), "{out}");
    assert!(!out.contains("<UI.Card"), "{out}");
    assert!(!out.contains("<footer"), "{out}");
    assert!(out.contains("_$createComponent(UI.Card"), "{out}");
}

#[test]
fn mixed_fragment_module_keeps_its_block_entry() {
    let src = r##"
import { type FC } from '@rue-js/rue';
const Child: FC = () => <i />;
const Safe: FC = () => <><span>ready</span></>;
const Mixed: FC = () => <Child />;
"##;

    let (program, cm) = utils::parse(src, "mixed-fragment-boundary.tsx");
    let out = utils::strip_marker(&utils::emit(apply(program), cm));
    let vapor_import = out
        .lines()
        .find(|line| line.contains("from \"@rue-js/rue/internal/block\""))
        .unwrap_or_default();

    assert!(vapor_import.contains("_$compiledRoot"), "{out}");
    assert!(!out.contains("@rue-js/rue/internal/compiler"), "{out}");
}

#[test]
fn rewrites_safe_value_imports_to_reactive_entry() {
    let src = r##"
import { type FC, ref, useState } from '@rue-js/rue';

const Demo: FC = () => {
  const count = ref(0);
  const [label] = useState('ok');
  return <div>{count.value}-{label}</div>;
};
"##;

    let (program, cm) = utils::parse(src, "rewrite-safe.tsx");
    let program = apply(program);
    let out = utils::strip_marker(&utils::emit(program, cm));
    let normalized = utils::normalize(&out);
    let first_line = import_for(&out, "reactive");

    assert!(first_line.contains("from \"@rue-js/rue/internal/reactive\""), "{out}");
    assert!(first_line.contains("ref"));
    assert!(first_line.contains("useState"));
    assert!(normalized.contains(&utils::normalize("import { type FC } from '@rue-js/rue';")));
    assert!(
        !normalized
            .contains(&utils::normalize("import { type FC, ref, useState } from '@rue-js/rue';",))
    );
}

#[test]
fn rewrites_use_app_to_reactive_entry() {
    let src = r##"
import { type FC, ref, useApp } from '@rue-js/rue';

const count = ref(0);
const App: FC = () => <button>{count.value}</button>;

useApp(App).mount('#app');
"##;

    let (program, cm) = utils::parse(src, "rewrite-use-app.tsx");
    let program = apply(program);
    let out = utils::strip_marker(&utils::emit(program, cm));
    let normalized = utils::normalize(&out);
    let first_line = import_for(&out, "reactive");

    assert!(first_line.contains("from \"@rue-js/rue/internal/reactive\""), "{out}");
    assert!(first_line.contains("ref"));
    assert!(first_line.contains("useApp"));
    assert!(normalized.contains(&utils::normalize("import { type FC } from '@rue-js/rue';")));
    assert!(
        !normalized
            .contains(&utils::normalize("import { type FC, ref, useApp } from '@rue-js/rue';",))
    );
}

#[test]
fn routes_component_and_reactive_values_to_unique_entries() {
    let src = r##"
import { type FC, TransitionGroup, ref } from '@rue-js/rue';

const Demo: FC = () => {
  const items = ref([1, 2, 3]);
  return <TransitionGroup>{items.value.map(item => <div key={item}>{item}</div>)}</TransitionGroup>;
};
"##;

    let (program, cm) = utils::parse(src, "rewrite-mixed.tsx");
    let program = apply(program);
    let out = utils::strip_marker(&utils::emit(program, cm));
    let normalized = utils::normalize(&out);
    let internal_import = out.lines().find(|line| {
        line.contains("from \"@rue-js/rue/internal/reactive\"")
            && !line.contains("@rue-js/rue/internal/compiler")
    });
    let builtins_import =
        out.lines().find(|line| line.contains("from \"@rue-js/rue/internal/builtin\""));

    assert!(internal_import.is_some_and(|line| line.contains("ref")), "{out}");
    assert!(builtins_import.is_some_and(|line| line.contains("TransitionGroup")), "{out}");
    assert!(normalized.contains(&utils::normalize("import { type FC } from '@rue-js/rue';")));
    assert!(!normalized.contains(&utils::normalize(
        "import { type FC, TransitionGroup, ref } from '@rue-js/rue';",
    )));
}

#[test]
fn rewrites_transition_import_to_unique_entries_entry() {
    let src = r##"
import { type FC, Transition, ref } from '@rue-js/rue';

const Demo: FC = () => {
  const open = ref(true);
  return (
    <Transition>
      {open.value ? <div>hello</div> : null}
    </Transition>
  );
};
"##;

    let (program, cm) = utils::parse(src, "rewrite-transition.tsx");
    let program = apply(program);
    let out = utils::strip_marker(&utils::emit(program, cm));
    let normalized = utils::normalize(&out);
    let internal_import = out.lines().find(|line| {
        line.contains("from \"@rue-js/rue/internal/reactive\"")
            && !line.contains("@rue-js/rue/internal/compiler")
    });
    let builtins_import =
        out.lines().find(|line| line.contains("from \"@rue-js/rue/internal/builtin\""));

    assert!(internal_import.is_some_and(|line| line.contains("ref")), "{out}");
    assert!(builtins_import.is_some_and(|line| line.contains("Transition")), "{out}");
    assert!(normalized.contains(&utils::normalize("import { type FC } from '@rue-js/rue';")));
    assert!(
        !normalized.contains(&utils::normalize(
            "import { type FC, Transition, ref } from '@rue-js/rue';",
        ))
    );
}

#[test]
fn reactive_compiled_bindings_have_unique_helper_entries() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue';
const message = ref('ready');
const Demo: FC = () => <div title={message.value}>{message.value}</div>;
"##;

    let (program, cm) = utils::parse(src, "reactive-compiled-import.tsx");
    let out = utils::strip_marker(&utils::emit(apply(program), cm));
    for (helper, entry) in [
        ("ref", "reactive"),
        ("_$compiledRoot", "block"),
        ("_$compiledText", "dom"),
        ("effect", "reactive"),
    ] {
        assert!(import_for(&out, entry).contains(helper), "missing {helper}: {out}");
    }
    assert!(!out.contains("from \"@rue-js/rue/internal/compiler\""), "{out}");
}

#[test]
fn explicit_compiled_signal_keeps_pure_compiled_module_on_compiled_graph() {
    let src = r##"
import { signal } from '@rue-js/rue/internal/compiler';
const message = signal('ready');
export const Demo = () => <div>{message.get()}</div>;
"##;

    let (program, cm) = utils::parse(src, "explicit-compiled-signal.tsx");
    let out = utils::strip_marker(&utils::emit(apply(program), cm));
    let compiled_import = out
        .lines()
        .find(|line| line.contains("@rue-js/rue/internal/reactive"))
        .expect("compiled runtime import");

    assert!(compiled_import.contains("signal"), "{out}");
    assert!(import_for(&out, "block").contains("_$compiledRoot"), "{out}");
    assert!(import_for(&out, "dom").contains("_$compiledText"), "{out}");
    assert!(!out.contains("from \"@rue-js/rue/internal/component\""), "{out}");
}

#[test]
fn public_signal_keeps_pure_compiled_module_on_compiled_graph() {
    let src = r##"
import { signal } from '@rue-js/rue';
const message = signal('ready');
export const Demo = () => <div>{message.get()}</div>;
"##;

    let (program, cm) = utils::parse(src, "public-compiled-signal.tsx");
    let out = utils::strip_marker(&utils::emit(apply(program), cm));
    let compiled_import = out
        .lines()
        .find(|line| line.contains("@rue-js/rue/internal/reactive"))
        .expect("compiled runtime import");

    assert!(compiled_import.contains("signal"), "{out}");
    assert!(import_for(&out, "block").contains("_$compiledRoot"), "{out}");
    assert!(import_for(&out, "dom").contains("_$compiledText"), "{out}");
    assert!(!out.contains("from \"@rue-js/rue\""), "{out}");
    assert!(!out.contains("from \"@rue-js/rue/internal/component\""), "{out}");
}

#[test]
fn public_signal_keeps_its_reactive_entry_in_a_mixed_module() {
    let src = r##"
import { signal } from '@rue-js/rue';
const message = signal('ready');
const Child = () => <i />;
export const Demo = () => <Child>{message.get()}</Child>;
"##;

    let (program, cm) = utils::parse(src, "public-signal-mixed-vapor.tsx");
    let out = utils::strip_marker(&utils::emit(apply(program), cm));
    for (helper, entry) in
        [("signal", "reactive"), ("_$compiledRoot", "block"), ("_$createComponent", "component")]
    {
        assert!(import_for(&out, entry).contains(helper), "missing {helper}: {out}");
    }
    assert!(!out.contains("@rue-js/rue/internal/compiler"), "{out}");
}

#[test]
fn public_signal_alias_does_not_capture_a_same_named_local_binding() {
    let src = r##"
import { signal as createSignal } from '@rue-js/rue';
const message = createSignal('ready');
const readLocal = (signal) => signal();
export const Demo = () => <div>{message.get()}</div>;
"##;

    let (program, cm) = utils::parse(src, "public-signal-alias-local-binding.tsx");
    let out = utils::strip_marker(&utils::emit(apply(program), cm));
    let compiled_import = out
        .lines()
        .find(|line| line.contains("@rue-js/rue/internal/reactive"))
        .unwrap_or_else(|| panic!("compiled runtime import: {out}"));
    let normalized = utils::normalize(&out);

    assert!(compiled_import.contains("signal as createSignal"), "{out}");
    assert!(
        normalized.contains(&utils::normalize("const message = createSignal('ready');")),
        "{out}"
    );
    assert!(normalized.contains(&utils::normalize("()=>signal()")), "{out}");
    assert!(!normalized.contains(&utils::normalize("()=>createSignal()")), "{out}");
    assert!(!out.contains("from \"@rue-js/rue\""), "{out}");
    assert!(!out.contains("from \"@rue-js/rue/internal/component\""), "{out}");
}
