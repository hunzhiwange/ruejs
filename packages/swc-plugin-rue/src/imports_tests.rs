use super::*;
use std::sync::Arc;
use swc_core::common::{FileName, SourceMap};
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn parse_module(src: &str) -> (Module, Arc<SourceMap>) {
    let cm = Arc::new(SourceMap::default());
    let fm =
        cm.new_source_file(FileName::Custom("imports-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx: true, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    (parser.parse_module().expect("parse module"), cm)
}

fn emit_module(module: &Module, cm: Arc<SourceMap>) -> String {
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    emitter.emit_module(module).expect("emit module");
    String::from_utf8(buf).expect("utf8")
}

fn compact(src: &str) -> String {
    src.chars().filter(|ch| !ch.is_whitespace()).collect()
}

fn ensure_and_emit(src: &str) -> String {
    let (mut module, cm) = parse_module(src);
    ensure_runtime_imports(&mut module);
    compact(&emit_module(&module, cm))
}

fn import_source_count(src: &str, source: &str) -> usize {
    src.matches(&format!("'{source}'")).count() + src.matches(&format!("\"{source}\"")).count()
}

fn import_clause_for_source<'a>(src: &'a str, source: &str) -> &'a str {
    let source_offset = src.find(source).expect("import source");
    let import_offset = src[..source_offset].rfind("import").expect("import declaration");
    &src[import_offset..source_offset]
}

#[test]
fn precise_capability_import_snapshots() {
    for (source, expected) in [
        (
            "_$compiledCreateElement('div');",
            "import{_$compiledCreateElement}from\"@rue-js/rue/internal/dom\";",
        ),
        ("_$compiledSignal(0);", "import{_$compiledSignal}from\"@rue-js/rue/internal/reactive\";"),
        (
            "_$compiledDelegateEvent();",
            "import{_$compiledDelegateEvent}from\"@rue-js/rue/internal/events\";",
        ),
        (
            "_$mountCompiledComponent();",
            "import{_$mountCompiledComponent}from\"@rue-js/rue/internal/component\";",
        ),
        ("_$reconcileKeyed();", "import{_$reconcileKeyed}from\"@rue-js/rue/internal/list\";"),
        (
            "import { Teleport } from '@rue-js/rue'; Teleport();",
            "import{Teleport}from\"@rue-js/rue/internal/builtin\";",
        ),
    ] {
        let output = ensure_and_emit(source);
        assert!(output.starts_with(expected), "{output}");
    }
}

#[test]
fn mixed_helpers_keep_unique_entries_and_dedupe() {
    let output = ensure_and_emit(
        "_$compiledSignal(0); _$compiledSignal(1); _$mountCompiledComponent(); _$compiledDelegateEvent();",
    );
    for source in ["reactive", "component", "events"] {
        assert_eq!(
            import_source_count(&output, &format!("@rue-js/rue/internal/{source}")),
            1,
            "{output}"
        );
    }
    assert!(!output.contains("internal/compiler"), "{output}");
    assert_eq!(
        import_clause_for_source(&output, "@rue-js/rue/internal/reactive"),
        "import{_$compiledSignal}from\""
    );
}

#[test]
fn explicit_legacy_sources_are_routed_to_the_same_unique_entry() {
    for legacy in ["compiler", "component", "builtins"] {
        let output = ensure_and_emit(&format!(
            "import {{ signal as local }} from '@rue-js/rue/internal/{legacy}'; local(0); _$mountCompiledComponent();"
        ));
        assert!(
            output.contains("import{signalaslocal}from\"@rue-js/rue/internal/reactive\";"),
            "{output}"
        );
    }
}

#[test]
fn root_values_route_even_without_a_generated_boundary() {
    let output = ensure_and_emit(
        "import { ref, computed, signal } from '@rue-js/rue'; const n = ref(0); signal(1); computed(() => n.value);",
    );
    assert_eq!(import_source_count(&output, "@rue-js/rue"), 0, "{output}");
    assert_eq!(import_source_count(&output, "@rue-js/rue/internal/reactive"), 1, "{output}");
}

#[test]
fn aliases_types_and_side_effect_imports_are_preserved() {
    let output = ensure_and_emit(
        "import '@rue-js/rue'; import { type FC, createApp, signal as local } from '@rue-js/rue'; import type { SignalHandle } from '@rue-js/rue/internal/compiler'; const View: FC = () => local(0); createApp(View);",
    );
    assert!(output.contains("import'@rue-js/rue';"), "{output}");
    assert!(output.contains("typeFC,createApp"), "{output}");
    assert!(output.contains("importtype{SignalHandle}"), "{output}");
    assert!(output.contains("signalaslocal"), "{output}");
}

#[test]
fn repeated_routing_is_idempotent() {
    let (mut module, cm) = parse_module(
        "import { signal as local, type FC } from '@rue-js/rue'; _$compiledRoot(() => local(0)); _$compiledRoot(() => local(1));",
    );
    ensure_runtime_imports(&mut module);
    let first = emit_module(&module, cm.clone());
    ensure_runtime_imports(&mut module);
    assert_eq!(first, emit_module(&module, cm));
}

#[test]
fn local_generated_names_are_not_unknown_runtime_helpers() {
    let output = ensure_and_emit(
        "const _$getTemplate1 = () => 1; function _$local() { return _$getTemplate1(); } _$local();",
    );
    assert!(!output.contains("import"), "{output}");
}

#[test]
#[should_panic(expected = "Unknown Rue runtime helper: _$missing")]
fn unknown_unbound_helper_is_a_compile_error() {
    ensure_and_emit("_$missing();");
}

#[test]
#[should_panic(expected = "Unknown Rue runtime helper: _$missing")]
fn unknown_imported_helper_is_a_compile_error() {
    ensure_and_emit("import { _$missing as alias } from '@rue-js/rue/internal/compiler'; alias();");
}

#[test]
#[should_panic(expected = "Unknown Rue runtime helper: missing")]
fn unknown_full_internal_import_is_not_a_fallback() {
    ensure_and_emit("import { missing } from '@rue-js/rue/internal'; missing();");
}

#[test]
#[should_panic(expected = "named helper imports")]
fn namespace_imports_cannot_retain_aggregate_entries() {
    ensure_and_emit("import * as Runtime from '@rue-js/rue/internal'; Runtime.signal(0);");
}

#[test]
#[should_panic(expected = "Rue compiler left residual JSX")]
fn uncompiled_jsx_is_a_compile_error() {
    let (module, _) = parse_module("const View = () => <div />;");
    crate::assert_no_residual_jsx(&Program::Module(module));
}

#[test]
fn server_operations_are_deduplicated_and_preserve_directives() {
    let (mut module, cm) = parse_module(
        "'use server'; _$writeElement('div', null, []); _$writeElement('p', null, []);",
    );
    ensure_runtime_imports(&mut module);
    let output = compact(&emit_module(&module, cm));
    assert!(
        output.starts_with("'useserver';import{_$writeElement}from\"@rue-js/rue/internal/ssr\";"),
        "{output}"
    );
}

#[test]
fn real_jsx_uses_precise_capabilities() {
    for (source, required) in [
        ("export const View = () => <div>hello</div>;", "dom"),
        (
            "import { ref } from '@rue-js/rue'; const n = ref(0); export const View = () => <div>{n.value}</div>;",
            "reactive",
        ),
        ("export const View = () => <button onClick={() => {}}>go</button>;", "events"),
        ("import Child from './Child'; export const View = () => <Child />;", "component"),
        (
            "const rows = [1, 2]; export const View = () => <ul>{rows.map(row => <li key={row}>{row}</li>)}</ul>;",
            "list",
        ),
        (
            "import { Teleport } from '@rue-js/rue'; export const View = () => <Teleport to='body'><div /></Teleport>;",
            "teleport",
        ),
    ] {
        let (module, cm) = parse_module(source);
        let Program::Module(output) = crate::apply(Program::Module(module)) else {
            panic!("module")
        };
        let output = emit_module(&output, cm);
        assert!(output.contains(&format!("@rue-js/rue/internal/{required}")), "{output}");
        assert!(
            !output.contains("internal/compiler\"") && !output.contains("internal/builtins\""),
            "{output}"
        );
    }
}
