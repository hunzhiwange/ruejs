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
fn converts_named_import_specs_for_ident_and_string_exports() {
    let ident_name = ModuleExportName::Ident(Ident::new(
        Atom::from("computed"),
        DUMMY_SP,
        SyntaxContext::empty(),
    ));
    assert_eq!(module_export_name_to_string(&ident_name), "computed");

    let string_name = ModuleExportName::Str(Str {
        span: DUMMY_SP,
        value: Atom::from("dash-name").into(),
        raw: None,
    });
    assert_eq!(module_export_name_to_string(&string_name), "dash-name");

    let named = ImportNamedSpecifier {
        span: DUMMY_SP,
        local: Ident::new(Atom::from("dash"), DUMMY_SP, SyntaxContext::empty()),
        imported: Some(string_name),
        is_type_only: true,
    };
    let spec = named_import_to_spec(&named);
    assert_eq!(spec.local, "dash");
    assert_eq!(spec.imported.as_deref(), Some("dash-name"));
    assert!(spec.is_type_only);

    let specifier = spec_to_named_import(&NamedImportSpec {
        local: "localComputed".to_string(),
        local_ctxt: SyntaxContext::empty(),
        imported: Some("computed".to_string()),
        is_type_only: false,
    });
    let ImportSpecifier::Named(named) = specifier else {
        panic!("expected named import");
    };
    assert_eq!(named.local.sym.as_ref(), "localComputed");
    assert_eq!(
        named.imported.as_ref().map(module_export_name_to_string).as_deref(),
        Some("computed"),
    );
}

#[test]
fn ensure_runtime_imports_moves_safe_root_values_and_marks_used_root_types() {
    let out = ensure_and_emit(
        r#"
import RueDefault, { FC, createApp, ref as localRef, useApp, watchEffect } from '@rue-js/rue';
import { _$compiledRoot } from '@rue-js/rue/internal';

type View = FC;
const state = localRef(0);
watchEffect(() => state.value);
useApp(View).mount('#app');
_$createElement;
"#,
    );

    assert!(out.contains("@rue-js/rue/internal/component"));
    assert!(out.contains("_$compiledRoot"));
    assert!(out.contains("refaslocalRef"));
    assert!(out.contains("useApp"));
    assert!(out.contains("watchEffect"));
    assert!(out.contains("_$createElement"));
    assert!(out.contains("importRueDefault,{typeFC,createApp}from"));
    assert_eq!(import_source_count(&out, "@rue-js/rue"), 1);
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/component"), 1);
}

#[test]
fn ensure_runtime_imports_inserts_only_missing_sources() {
    let type_only = ensure_and_emit("type View = FC;");
    assert!(type_only.starts_with("import{typeFC}from"));
    assert_eq!(import_source_count(&type_only, "@rue-js/rue"), 1);
    assert_eq!(import_source_count(&type_only, "@rue-js/rue/internal/component"), 0);

    let helper_only = ensure_and_emit("const node = _$createComment('anchor');");
    assert!(helper_only.starts_with("import{_$createComment}from"));
    assert_eq!(import_source_count(&helper_only, "@rue-js/rue"), 0);
    assert_eq!(import_source_count(&helper_only, "@rue-js/rue/internal/compiler"), 0);
    assert_eq!(import_source_count(&helper_only, "@rue-js/rue/internal/component"), 1);

    let template_only = ensure_and_emit("const getTemplate = _$template('<div></div>');");
    assert!(template_only.starts_with("import{_$template}from"));
    assert_eq!(import_source_count(&template_only, "@rue-js/rue/internal/compiler"), 1);
    assert_eq!(import_source_count(&template_only, "@rue-js/rue/internal/component"), 0);

    let compiled_only = ensure_and_emit(
        "import { signal, effect, _$compiledRoot } from '@rue-js/rue'; signal; effect; _$compiledRoot;",
    );
    assert_eq!(import_source_count(&compiled_only, "@rue-js/rue"), 0);
    assert_eq!(import_source_count(&compiled_only, "@rue-js/rue/internal/compiler"), 1);
    assert_eq!(import_source_count(&compiled_only, "@rue-js/rue/internal/component"), 0);
    assert!(
        import_clause_for_source(&compiled_only, "@rue-js/rue/internal/compiler")
            .contains("effect,signal,_$compiledRoot"),
        "{compiled_only}",
    );

    let unused = ensure_and_emit("const value = 1;");
    assert_eq!(unused, "constvalue=1;");
}

#[test]
fn ensure_runtime_imports_keeps_compiled_values_on_root_without_a_generated_boundary() {
    let out = ensure_and_emit(
        "import { h, render, setReactiveScheduling, signal } from '@rue-js/rue'; h; render; setReactiveScheduling; signal;",
    );

    assert_eq!(import_source_count(&out, "@rue-js/rue"), 1, "{out}");
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/component"), 0, "{out}");
    assert!(out.contains("setReactiveScheduling"), "{out}");
    assert!(out.contains("signal"), "{out}");
}

#[test]
fn ensure_runtime_imports_skips_existing_specs_and_local_collisions() {
    let with_default_collision = ensure_and_emit(
        r#"
import watchEffect, { ref } from '@rue-js/rue/internal';

watchEffect(() => {});
ref(0);
computed(() => 1);
"#,
    );
    assert_eq!(with_default_collision.matches("watchEffect").count(), 2);
    assert_eq!(with_default_collision.matches("ref").count(), 2);
    assert!(with_default_collision.contains("computed"));
    assert!(with_default_collision.contains("watchEffect"));
    assert!(with_default_collision.contains("ref"));
    assert!(with_default_collision.contains("computed"));
    assert!(with_default_collision.contains("@rue-js/rue/internal/component"));

    let with_namespace_collision = ensure_and_emit(
        r#"
import * as computed from '@rue-js/rue/internal';

computed(() => 1);
"#,
    );
    assert_eq!(with_namespace_collision.matches("computed").count(), 2);
    assert!(!with_namespace_collision.contains("{computed}"));
}

#[test]
fn mark_root_type_only_imports_leaves_unused_forced_root_types_as_values() {
    let (mut module, cm) = parse_module("import { FC } from '@rue-js/rue'; type Other = string;");
    let used_types = ["Other".to_string()].into_iter().collect();

    mark_root_type_only_imports(&mut module, &used_types);

    let out = compact(&emit_module(&module, cm));
    assert!(out.contains("import{FC}from"));
    assert!(!out.contains("typeFC"));
}

#[test]
fn ensure_runtime_imports_moves_string_named_root_aliases_and_keeps_type_aliases() {
    let out = ensure_and_emit(
        r#"
import { "ref" as localRef, "computed" as localComputed, "FC" as RueFC, createApp } from '@rue-js/rue';

type View = RueFC;
const state = localRef(0);
const doubled = localComputed(() => state.value * 2);
createApp(View);
"#,
    );

    assert_eq!(import_source_count(&out, "@rue-js/rue"), 1);
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/compiler"), 0);
    assert!(out.contains("type\"FC\"asRueFC"), "{out}");
    assert!(out.contains("\"ref\"aslocalRef"), "{out}");
    assert!(out.contains("\"computed\"aslocalComputed"), "{out}");
    assert!(out.contains("conststate=localRef(0);"), "{out}");
    assert!(out.contains("constdoubled=localComputed(()=>state.value*2);"), "{out}");
}

#[test]
fn ensure_runtime_imports_merges_helpers_without_duplicate_string_named_aliases() {
    let out = ensure_and_emit(
        r#"
import { ref as localRef } from '@rue-js/rue/internal';
import { "ref" as localRef, watchEffect } from '@rue-js/rue';

const state = localRef(0);
watchEffect(() => state.value);
"#,
    );

    assert_eq!(import_source_count(&out, "@rue-js/rue"), 0);
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/component"), 1);
    assert_eq!(out.matches("refaslocalRef").count(), 1, "{out}");
    assert!(out.contains("watchEffect"), "{out}");
}

#[test]
fn ensure_runtime_imports_keeps_compiled_helpers_on_the_vapor_graph_in_mixed_modules() {
    let out = ensure_and_emit(
        r#"
import { type FC, signal, effect, _$compiledRoot, Transition, KeepAlive, Suspense, Hydration, "_$compiledMarkComponentRenderReactive" as markRender } from '@rue-js/rue';

type View = FC;
signal;
effect;
_$compiledRoot;
Transition;
KeepAlive;
Suspense;
Hydration;
markRender;
"#,
    );

    assert_eq!(import_source_count(&out, "@rue-js/rue"), 1, "{out}");
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/compiler"), 0, "{out}");
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/component"), 1, "{out}");
    assert!(out.contains("import{typeFC}from"), "{out}");
    let vapor_clause = import_clause_for_source(&out, "@rue-js/rue/internal/component");
    assert!(vapor_clause.contains("_$compiledRoot"), "{out}");
    assert!(vapor_clause.contains("signal"), "{out}");
    assert!(vapor_clause.contains("effect"), "{out}");
    assert!(out.contains("Transition"), "{out}");
    assert!(out.contains("KeepAlive"), "{out}");
    assert!(out.contains("Suspense"), "{out}");
    assert!(out.contains("Hydration"), "{out}");
    assert!(out.contains("_$compiledMarkComponentRenderReactiveasmarkRender"), "{out}");
}

#[test]
fn ensure_runtime_imports_keeps_public_ref_value_semantics_with_compiled_text() {
    let out = ensure_and_emit(
        r#"
import { ref } from '@rue-js/rue';
const value = ref(0);
_$compiledRoot;
_$compiledText;
value.value += 1;
"#,
    );

    assert_eq!(import_source_count(&out, "@rue-js/rue"), 0, "{out}");
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/compiler"), 0, "{out}");
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/component"), 1, "{out}");
    let component_clause = import_clause_for_source(&out, "@rue-js/rue/internal/component");
    assert!(component_clause.contains("ref"), "{out}");
    assert!(component_clause.contains("_$compiledRoot"), "{out}");
    assert!(component_clause.contains("_$compiledText"), "{out}");
}

#[test]
fn ensure_runtime_imports_preserves_aliases_and_collisions_across_runtime_sources() {
    let out = ensure_and_emit(
        r#"
import signal, { effect } from '@rue-js/rue/internal/compiler';
import { "_$compiledMarkComponentRenderReactive" as markRender } from '@rue-js/rue/internal';
import { "signal" as localSignal, createApp } from '@rue-js/rue';

signal;
effect;
localSignal;
markRender;
createApp;
"#,
    );

    assert_eq!(import_source_count(&out, "@rue-js/rue"), 1, "{out}");
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/compiler"), 1, "{out}");
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/component"), 1, "{out}");
    assert_eq!(out.matches("effect").count(), 2, "{out}");
    assert_eq!(out.matches("signalaslocalSignal").count(), 1, "{out}");
    assert_eq!(out.matches("_$compiledMarkComponentRenderReactive").count(), 1, "{out}");
    assert!(out.contains("import{createApp}from'@rue-js/rue'"), "{out}");
}

#[test]
fn ensure_runtime_imports_uses_existing_vapor_values_for_module_tier_aggregation() {
    let out = ensure_and_emit(
        r#"
import { ref } from '@rue-js/rue/internal';
import { signal } from '@rue-js/rue';

const legacy = ref(0);
const state = signal(0);
legacy;
state;
"#,
    );

    assert_eq!(import_source_count(&out, "@rue-js/rue"), 0, "{out}");
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/compiler"), 0, "{out}");
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/component"), 1, "{out}");
    let vapor_clause = import_clause_for_source(&out, "@rue-js/rue/internal/component");
    assert!(vapor_clause.contains("ref"), "{out}");
    assert!(vapor_clause.contains("signal"), "{out}");
}

#[test]
fn ensure_runtime_imports_injects_vapor_owned_list_effect_and_reconcile_in_mixed_modules() {
    assert!(!crate::compiled_capabilities::should_auto_inject_helper("vapor"));
    let out = ensure_and_emit(
        "_$compiledRoot(() => {}); effect(() => {}); _$reconcileKeyed(parent, before, rows, items, key, mount);",
    );

    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/compiler"), 1, "{out}");
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/component"), 0, "{out}");
    let compiled_clause = import_clause_for_source(&out, "@rue-js/rue/internal/compiler");
    assert!(compiled_clause.contains("_$compiledRoot"), "{out}");
    assert!(compiled_clause.contains("effect"), "{out}");
    assert!(compiled_clause.contains("_$reconcileKeyed"), "{out}");
    assert!(!out.contains("vapor("), "{out}");
}

#[test]
fn ensure_runtime_imports_keeps_compiled_hook_scope_on_the_mixed_hook_graph() {
    let out = ensure_and_emit(
        r#"
_$withCompiledHookScope(() => _$compiledBranch(() => _$compiledRoot(() => null)));
_$compiledWithHookId('Region:setup-region:0', () => useSetup(() => ({})));
"#,
    );

    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/compiler"), 0, "{out}");
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/component"), 1, "{out}");
    let vapor_clause = import_clause_for_source(&out, "@rue-js/rue/internal/component");
    for helper in [
        "_$withCompiledHookScope",
        "_$compiledBranch",
        "_$compiledRoot",
        "_$compiledWithHookId",
        "useSetup",
    ] {
        assert!(vapor_clause.contains(helper), "missing {helper}: {out}");
    }
    assert!(!out.contains("_$createElement"), "{out}");
}

#[test]
fn ensure_runtime_imports_keeps_generated_list_helpers_with_explicit_compiled_signals() {
    let out = ensure_and_emit(
        r#"
import { signal } from '@rue-js/rue/internal/compiler';

const rows = signal([]);
useSetup(() => rows);
effect(() => rows.get());
_$reconcileKeyed(parent, before, rows.get(), items, key, mount);
const owner = createOwner();
runWithOwner(owner, mount);
disposeOwner(owner);
"#,
    );

    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/compiler"), 1, "{out}");
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/component"), 1, "{out}");
    let compiled_clause = import_clause_for_source(&out, "@rue-js/rue/internal/compiler");
    for helper in ["effect", "_$reconcileKeyed", "createOwner", "runWithOwner", "disposeOwner"] {
        assert!(compiled_clause.contains(helper), "missing {helper}: {out}");
    }
    assert!(
        import_clause_for_source(&out, "@rue-js/rue/internal/compiler").contains("signal"),
        "{out}"
    );
    let vapor_clause = import_clause_for_source(&out, "@rue-js/rue/internal/component");
    assert!(vapor_clause.contains("useSetup"), "{out}");
    assert!(!vapor_clause.contains("effect"), "{out}");
    assert!(!vapor_clause.contains("_$reconcileKeyed"), "{out}");
}

#[test]
fn ensure_runtime_imports_injects_only_used_compiled_row_owner_helpers() {
    let out = ensure_and_emit(
        "useSetup(() => {}); _$reconcileKeyed(parent, before, rows, items, key, mount); const owner = createOwner(); runWithOwner(owner, mount); disposeOwner(owner);",
    );

    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/compiler"), 0, "{out}");
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/component"), 1, "{out}");
    let vapor_clause = import_clause_for_source(&out, "@rue-js/rue/internal/component");
    for helper in ["_$reconcileKeyed", "createOwner", "runWithOwner", "disposeOwner"] {
        assert!(vapor_clause.contains(helper), "missing {helper}: {out}");
    }
    assert!(!vapor_clause.contains("createSelector"), "{out}");
}

#[test]
fn ensure_runtime_imports_routes_compiled_setup_without_a_vapor_entry() {
    let out = ensure_and_emit(
        "const state = _$compiledSetup('App:setup-region:0', () => signal(0)); _$compiledRoot(() => state);",
    );

    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/compiler"), 1, "{out}");
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/component"), 0, "{out}");
    let compiled_clause = import_clause_for_source(&out, "@rue-js/rue/internal/compiler");
    assert!(compiled_clause.contains("_$compiledSetup"), "{out}");
    assert!(compiled_clause.contains("_$compiledRoot"), "{out}");
}

#[test]
fn ensure_runtime_imports_keeps_compiled_setup_off_the_vapor_entry() {
    let out = ensure_and_emit(
        "useSetup(() => {}); const state = _$compiledSetup('App:setup-region:0', () => signal(0)); _$compiledRoot(() => state);",
    );

    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/compiler"), 0, "{out}");
    assert_eq!(import_source_count(&out, "@rue-js/rue/internal/component"), 1, "{out}");
    let vapor_clause = import_clause_for_source(&out, "@rue-js/rue/internal/component");
    assert!(vapor_clause.contains("useSetup"), "{out}");
    assert!(vapor_clause.contains("_$compiledSetup"), "{out}");
}

#[test]
fn routes_simple_complex_and_mixed_modules_to_distinct_runtime_entries() {
    let simple = ensure_and_emit(
        "const state = _$compiledSetup('App:setup-region:0', () => signal(0)); effect(() => state.get()); _$compiledRoot(() => state);",
    );
    assert_eq!(import_source_count(&simple, "@rue-js/rue/internal/compiler"), 1, "{simple}");
    assert_eq!(import_source_count(&simple, "@rue-js/rue/internal/component"), 0, "{simple}");

    let complex = ensure_and_emit(
        "import { signal } from '@rue-js/rue'; Hydration; useSetup(() => ({})); _$compiledMarkComponentRenderReactive(); signal; _$compiledRoot;",
    );
    assert_eq!(import_source_count(&complex, "@rue-js/rue/internal/compiler"), 0, "{complex}");
    assert_eq!(import_source_count(&complex, "@rue-js/rue/internal/component"), 1, "{complex}");
    let complex_clause = import_clause_for_source(&complex, "@rue-js/rue/internal/component");
    for helper in ["useSetup", "_$compiledMarkComponentRenderReactive", "signal", "_$compiledRoot"]
    {
        assert!(complex_clause.contains(helper), "missing {helper}: {complex}");
    }

    let mixed = ensure_and_emit(
        "useSetup(() => {}); effect(() => {}); _$reconcileKeyed(parent, before, rows, items, key, mount);",
    );
    assert_eq!(import_source_count(&mixed, "@rue-js/rue/internal/compiler"), 0, "{mixed}");
    assert_eq!(import_source_count(&mixed, "@rue-js/rue/internal/component"), 1, "{mixed}");
}
