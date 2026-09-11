//! Server JSX target code-generation contract.
use swc_plugin_rue::{apply, apply_server};
mod utils;

#[test]
fn server_target_uses_only_server_renderer_operations_and_preserves_directives() {
    let source = r#"
"use server";
import { type FC, createContext } from '@rue-js/rue';

const Theme = createContext('light');
const Card: FC<{ title: string }> = props => <article>{props.title}</article>;
const Page: FC = () => (
  <>
    <Theme.Provider value="dark"><Card title="Rue" /></Theme.Provider>
    <main data-ready>{['safe', <strong>server</strong>]}</main>
  </>
);
"#;

    let (program, cm) = utils::parse(source, "server-target.tsx");
    let output = utils::emit(apply_server(program), cm);

    assert!(output.trim_start().starts_with("\"use server\";"));
    assert!(output.contains("from \"@rue-js/rue/internal/ssr\""));
    assert!(output.contains("_$writeElement"));
    assert!(output.contains("_$writeComponent"));
    assert!(output.contains("_$writeText"));
    assert!(!output.contains("@rue-js/rue/internal/dom"));
    assert!(!output.contains("@rue-js/rue/internal/block"));
    assert!(!output.contains("jsx-runtime"));
    assert!(!output.contains("<article"));
    assert!(!output.contains("<main"));
}

#[test]
fn client_target_does_not_import_server_renderer() {
    let (program, cm) = utils::parse("export const App = () => <main>client</main>", "client.tsx");
    let output = utils::emit(apply(program), cm);

    assert!(output.contains("@rue-js/rue/"));
    assert!(!output.contains("@rue-js/rue/internal/ssr"));
}

#[test]
fn server_target_preserves_inline_whitespace_before_expressions() {
    let (program, cm) = utils::parse(
        "export const Page = ({ id }) => <div>params.id is {id}</div>",
        "server-inline-whitespace.tsx",
    );
    let output = utils::emit(apply_server(program), cm);

    assert!(output.contains("\"params.id is \""), "{output}");
}

#[test]
fn shared_node_plan_emits_writer_and_claim_instructions() {
    let source = "import { signal } from '@rue-js/rue'; const value = signal('one'); export const View = () => <main><svg><text>{value.get()}</text></svg>{value.get() ? <b>yes</b> : <i>no</i>}</main>;";
    let (program, cm) = utils::parse(source, "shared.tsx");
    let server = utils::emit(apply_server(program.clone()), cm.clone());
    let hydrate = utils::emit(swc_plugin_rue::apply_hydrate(program), cm);
    assert!(server.contains("_$writeElement"), "{server}");
    assert!(hydrate.contains("_$claimElement"), "{hydrate}");
    assert!(server.contains("_$writeRange"), "{server}");
    assert!(hydrate.contains("_$claimRange"), "{hydrate}");
    for forbidden in
        ["internal/dom", "internal/block", "serverElement", "renderAnchor", "_$template"]
    {
        assert!(!hydrate.contains(forbidden), "{hydrate}");
    }
}

#[test]
fn runtime_root_context_aliases_use_exact_compiled_entries() {
    let source = "import {createContext as context, useContext as read} from '@rue-js/runtime'; export const Theme=context('light'); export const View=()=> <p>{read(Theme)}</p>;";
    let (program, cm) = utils::parse(source, "runtime-context.tsx");
    for output in [
        utils::emit(apply_server(program.clone()), cm.clone()),
        utils::emit(swc_plugin_rue::apply_hydrate(program), cm),
    ] {
        assert!(output.contains("@rue-js/rue/internal/reactive"), "{output}");
        assert!(output.contains("_$planUseContext"), "{output}");
        assert!(!output.contains("from \"@rue-js/runtime\""), "{output}");
    }
}

#[test]
fn writer_and_claim_lower_rest_props_to_the_shared_props_controller() {
    let source =
        "export const View=({label, children, ...attrs})=> <a {...attrs}>{label}{children}</a>;";
    let (program, cm) = utils::parse(source, "rest-props.tsx");
    for output in [
        utils::emit(apply_server(program.clone()), cm.clone()),
        utils::emit(swc_plugin_rue::apply_hydrate(program), cm),
    ] {
        assert!(output.contains("_$compiledOmitProps"), "{output}");
        assert!(!output.contains("...attrs"), "{output}");
        assert!(output.contains("\"children\""), "{output}");
    }
}

#[test]
fn destructured_and_computed_children_use_slot_instructions() {
    for source in [
        "export const Layout = ({children}) => <body>{children}</body>;",
        "export const Layout = ({children: content}) => <body>{content}</body>;",
        "export const Layout = props => <body>{props['children']}</body>;",
    ] {
        let (program, cm) = utils::parse(source, "layout-slots.tsx");
        for (output, operation) in [
            (utils::emit(apply_server(program.clone()), cm.clone()), "_$writeSlot"),
            (utils::emit(swc_plugin_rue::apply_hydrate(program), cm), "_$claimSlot"),
        ] {
            assert!(output.contains(operation), "{output}");
            assert!(!output.contains("_$writeText"), "{output}");
            assert!(!output.contains("_$claimText"), "{output}");
        }
    }
}

#[test]
fn named_layout_slots_use_the_declared_plan_type() {
    let source = "export const Layout = ({team, label}: {team?: import('@rue-js/rue').RenderableOutput; label: string}) => <aside>{team}{label}</aside>";
    let (program, cm) = utils::parse(source, "named-slots.tsx");
    for (output, slot, text) in [
        (utils::emit(apply_server(program.clone()), cm.clone()), "_$writeSlot", "_$writeText"),
        (utils::emit(swc_plugin_rue::apply_hydrate(program), cm), "_$claimSlot", "_$claimText"),
    ] {
        assert!(output.contains(slot), "{output}");
        assert!(output.contains(text), "{output}");
    }
}

#[test]
fn writer_and_claim_subscribe_to_initially_absent_props() {
    let source = "export const Form=props=><form onSubmit={props.onSubmit}>{props.label}</form>";
    let (program, cm) = utils::parse(source, "optional-props.tsx");
    for output in [
        utils::emit(apply_server(program.clone()), cm.clone()),
        utils::emit(swc_plugin_rue::apply_hydrate(program), cm),
    ] {
        assert!(output.contains("_$compiledPropsGet(props, \"onSubmit\")"), "{output}");
        assert!(output.contains("_$compiledPropsGet(props, \"label\")"), "{output}");
    }
}

#[test]
fn local_template_components_are_not_treated_as_builtins() {
    let source = "const Template=props=><section>{props.children}</section>;export const View=()=> <Template><p>content</p></Template>";
    let (program, cm) = utils::parse(source, "local-template.tsx");
    for (output, operation) in [
        (utils::emit(apply_server(program.clone()), cm.clone()), "_$writeComponent"),
        (utils::emit(swc_plugin_rue::apply_hydrate(program), cm), "_$claimComponent"),
    ] {
        assert!(output.contains(operation), "{output}");
        assert!(output.contains("Template"), "{output}");
    }
}

#[test]
fn destructured_component_props_are_rewritten_after_jsx_lowering() {
    let source =
        "export function App({Component: Page, pageProps}) { return <Page {...pageProps}/> }";
    let (program, cm) = utils::parse(source, "component-prop.tsx");
    for output in [
        utils::emit(apply_server(program.clone()), cm.clone()),
        utils::emit(swc_plugin_rue::apply_hydrate(program), cm),
    ] {
        assert!(output.contains("_$compiledPropsGet(_$planProps, \"Component\")"), "{output}");
        assert!(!output.contains(", Page,"), "{output}");
    }
}

#[test]
fn action_state_alias_lowers_state_and_pending_reads() {
    let source = "import {useActionState as useSubmit} from 'text/form'; export const View=()=>{const [state, submit, pending]=useSubmit(action, {count: 0});return <form action={submit}><button disabled={pending}>{state.count}</button></form>}";
    let (program, cm) = utils::parse(source, "action-state.tsx");
    for output in [
        utils::emit(apply_server(program.clone()), cm.clone()),
        utils::emit(swc_plugin_rue::apply_hydrate(program), cm),
    ] {
        assert!(output.contains("_$compiledUseActionState"), "{output}");
        assert!(!output.contains("disabled: pending"), "{output}");
        assert!(!output.contains("state.count"), "{output}");
    }
}
