//! Complex list-row code-generation baseline.
//!
//! These assertions intentionally describe the conservative paths used before
//! owned list mounts are introduced. They are shared by the later performance
//! work so an optimization cannot silently change the row classification.

use swc_plugin_rue::apply;

mod utils;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum RowMountShape {
    CompatibilityRenderAnchor,
    RenderAnchor,
    OwnedRenderBetween,
    OwnedOpaqueRenderBetween,
}

fn transform(row: &str) -> String {
    let source = format!(
        r##"
import {{ _$compiledWithKey, type FC, onMounted, onUnmounted }} from '@rue-js/rue';

type Row = {{ id: number; label: string; active: boolean; attrs: Record<string, string> }};
declare const rows: {{ value: Row[] }};
declare const rowRef: (id: number, node: HTMLElement | null) => void;

const ChildRow: FC<{{ row: Row }}> = props => {{
  onMounted(() => void props.row.id);
  onUnmounted(() => void props.row.id);
  return <li data-row-id={{props.row.id}}>{{props.row.label}}</li>;
}};

const opaqueRow = (row: Row) => <li data-row-id={{row.id}}>{{row.label}}</li>;

const App: FC = () => <ul>{{rows.value.map(row => ({row}))}}</ul>;
"##
    );
    let (program, cm) = utils::parse(&source, "complex-list-row.tsx");
    utils::normalize(&utils::strip_marker(&utils::emit(apply(program), cm)))
}

fn transform_source(source: &str) -> String {
    let (program, cm) = utils::parse(source, "complex-list-row-capabilities.tsx");
    utils::normalize(&utils::strip_marker(&utils::emit(apply(program), cm)))
}

fn assert_reactive_anchor(name: &str, row: &str) {
    let output = transform(row);
    assert!(
        output.contains("_$reconcileKeyed"),
        "{name} must stay on the keyed reconciliation path: {output}"
    );
    assert!(output.contains("_$compiledText"), "{name}: {output}");
    assert!(!output.contains("_$compiledKeyedList"), "{name}: {output}");
}

fn assert_shape(name: &str, row: &str, expected: RowMountShape) {
    let output = transform(row);

    match expected {
        RowMountShape::CompatibilityRenderAnchor | RowMountShape::RenderAnchor => {
            assert!(output.contains("_$reconcileKeyed"), "{name}: {output}");
            assert!(output.contains("_$mountCompiledKeyedRow"), "{name}: {output}");
        }
        RowMountShape::OwnedRenderBetween | RowMountShape::OwnedOpaqueRenderBetween => {
            assert!(output.contains("_$reconcileKeyed"), "{name}: {output}");
            assert!(output.contains("_$mountCompiledKeyedRow"), "{name}: {output}");
        }
    }
    assert!(!output.contains("_$compiledKeyedList"), "{name}: {output}");
}

#[test]
fn spread_row_reports_compiled_runtime_capability() {
    let output = transform("<li key={row.id} {...row.attrs} data-row-id={row.id}>{row.label}</li>");
    assert!(output.contains("_$compiledSpreadAttributes"), "{output}");
    assert!(!output.contains("_$compiledKeyedList"), "{output}");
    assert!(!output.contains("state: _map1_state"), "{output}");
}

#[test]
fn unshadowed_scalar_calls_use_reactive_anchor_fallback() {
    assert_reactive_anchor(
        "global String",
        "<li key={row.id} data-row-id={row.id}>{String(row.label)}</li>",
    );
    assert_reactive_anchor(
        "global Number",
        "<li key={row.id} data-row-id={row.id}>{Number(row.id)}</li>",
    );
    assert_reactive_anchor(
        "global Boolean",
        "<li key={row.id} data-row-id={row.id}>{Boolean(row.active)}</li>",
    );
}

#[test]
fn shadowed_scalar_calls_remain_conservative() {
    let parameter_shadow = transform_source(
        r##"
import { type FC } from '@rue-js/rue';
type Row = { id: number; label: string };
declare const rows: { value: Row[] };
const App: FC = () => <ul>{rows.value.map((row, String) => (
  <li key={row.id}>{String(row.id)}</li>
))}</ul>;
"##,
    );
    assert!(!parameter_shadow.contains(concat!("direct", "Root: true")), "{parameter_shadow}");

    let local_shadow = transform_source(
        r##"
import { type FC } from '@rue-js/rue';
type Row = { id: number; label: string };
declare const rows: { value: Row[] };
declare const format: (value: number) => string;
const App: FC = () => <ul>{rows.value.map(row => {
  const String = format;
  return <li key={row.id}>{String(row.id)}</li>;
})}</ul>;
"##,
    );
    assert!(!local_shadow.contains(concat!("direct", "Root: true")), "{local_shadow}");

    let import_shadow = transform_source(
        r##"
import { type FC } from '@rue-js/rue';
import { String } from './format';
type Row = { id: number; label: string };
declare const rows: { value: Row[] };
const App: FC = () => <ul>{rows.value.map(row => (
  <li key={row.id}>{String(row.id)}</li>
))}</ul>;
"##,
    );
    assert!(!import_shadow.contains(concat!("direct", "Root: true")), "{import_shadow}");
}

#[test]
fn index_tracking_uses_scope_aware_references() {
    let unused = transform_source(
        r##"
import { type FC } from '@rue-js/rue';
type Row = { id: number; label: string };
declare const rows: { value: Row[] };
const App: FC = () => <ul>{rows.value.map((row, index) => (
  <li key={row.id}>{row.label}</li>
))}</ul>;
"##,
    );
    assert!(unused.contains("_$reconcileKeyed"), "{unused}");
    assert!(!unused.contains("trackIndex:"), "{unused}");

    let alias_use = transform_source(
        r##"
import { type FC } from '@rue-js/rue';
type Row = { id: number; label: string };
declare const rows: { value: Row[] };
const App: FC = () => <ul>{rows.value.map((row, index) => {
  const position = index;
  return <li key={row.id}>{position}:{row.label}</li>;
})}</ul>;
"##,
    );
    assert!(!alias_use.contains("trackIndex: false"), "{alias_use}");

    let closure_use = transform_source(
        r##"
import { type FC } from '@rue-js/rue';
type Row = { id: number; label: string };
declare const rows: { value: Row[] };
const App: FC = () => <ul>{rows.value.map((row, index) => (
  <li key={row.id} title={() => index}>{row.label}</li>
))}</ul>;
"##,
    );
    assert!(!closure_use.contains("trackIndex: false"), "{closure_use}");
}

#[test]
fn ref_row_uses_compatibility_owner_cleanup() {
    assert_shape(
        "ref",
        "<li key={row.id} ref={node => rowRef(row.id, node)} data-row-id={row.id}>{row.label}</li>",
        RowMountShape::CompatibilityRenderAnchor,
    );
    let output = transform(
        "<li key={row.id} ref={node => rowRef(row.id, node)} data-row-id={row.id}>{row.label}</li>",
    );
    assert!(output.contains("onOwnerCleanup"), "{output}");
    assert!(!output.contains("onBeforeUnmount"), "{output}");
}

#[test]
fn structural_and_component_refs_remain_conservative() {
    assert_shape(
        "structural ref",
        "<li key={row.id} ref={node => rowRef(row.id, node)}>{row.active ? <strong>{row.label}</strong> : <em>{row.label}</em>}</li>",
        RowMountShape::RenderAnchor,
    );
    let component =
        transform("<ChildRow key={row.id} ref={node => rowRef(row.id, node)} row={row} />");
    assert!(!component.contains(concat!("direct", "Root: true")), "{component}");
    assert!(component.contains("_$createComponent(ChildRow"), "{component}");
    assert!(component.contains("_$mountCompiledSlotFactory"), "{component}");
}

#[test]
fn ref_owner_registrar_avoids_row_local_collisions() {
    let output = transform_source(
        r##"
import { type FC } from '@rue-js/rue';
type Row = { id: number; label: string };
declare const rows: { value: Row[] };
declare const rowRef: (id: number, node: HTMLElement | null) => void;
const App: FC = () => <ul>{rows.value.map(row => {
  const registerRefCleanup = row.label;
  return <li key={row.id} ref={node => registerRefCleanup && rowRef(row.id, node)}>{row.label}</li>;
})}</ul>;
"##,
    );
    assert!(output.contains("const registerRefCleanup = row.label"), "{output}");
    assert!(output.contains("onOwnerCleanup"), "{output}");
}

#[test]
fn native_conditional_row_uses_render_anchor_baseline() {
    assert_shape(
        "native conditional",
        "<li key={row.id} data-row-id={row.id}>{row.active ? <strong>{row.label}</strong> : <em>{row.label}</em>}</li>",
        RowMountShape::RenderAnchor,
    );
}

#[test]
fn component_row_uses_render_between_baseline() {
    assert_shape(
        "component",
        "<ChildRow key={row.id} row={row} />",
        RowMountShape::OwnedRenderBetween,
    );
}

#[test]
fn opaque_call_row_uses_render_between_baseline() {
    assert_shape(
        "opaque call",
        "_$compiledWithKey(opaqueRow(row), row.id)",
        RowMountShape::OwnedOpaqueRenderBetween,
    );
}

#[test]
fn async_and_external_row_boundaries_use_explicit_owned_strategy() {
    for (name, row) in [
        ("Teleport", "<Teleport key={row.id} to={target}>{row.label}</Teleport>"),
        ("Transition", "<Transition key={row.id}><li>{row.label}</li></Transition>"),
        ("KeepAlive", "<KeepAlive key={row.id}><ChildRow row={row} /></KeepAlive>"),
        (
            "Suspense",
            "<Suspense key={row.id} fallback={<span>pending</span>}><ChildRow row={row} /></Suspense>",
        ),
    ] {
        let output = transform(row);
        assert!(!output.contains("_$compiledKeyedList"), "{name}: {output}");
        assert!(output.contains(name), "{name}: {output}");
        assert!(
            output.contains("_$reconcileKeyed") || output.contains("renderAnchor(__slot"),
            "{name}: {output}"
        );
    }
}

#[test]
fn final_linear_gate_keeps_main_paths_on_explicit_mount_capabilities() {
    let cases = [
        (
            "spread",
            "<li key={row.id} {...row.attrs}>{row.label}</li>",
            "renderAnchor(__slot, parent, start)",
        ),
        (
            "ref",
            "<li key={row.id} ref={node => rowRef(row.id, node)}>{row.label}</li>",
            "renderAnchor(__slot, parent, start)",
        ),
        (
            "native structural",
            "<li key={row.id}>{row.active ? <strong>{row.label}</strong> : <em>{row.label}</em>}</li>",
            "ownedMount: true",
        ),
        ("component", "<ChildRow key={row.id} row={row} />", "ownedMount: true"),
        ("opaque", "_$compiledWithKey(opaqueRow(row), row.id)", "opaqueRenderable: true"),
    ];

    for (name, row, _capability) in cases {
        let output = transform(row);
        assert!(!output.contains("_$compiledKeyedList"), "{name}: {output}");
        assert!(
            output.contains("_$reconcileKeyed") || output.contains("renderAnchor(__slot"),
            "{name}: {output}"
        );
    }
}

#[test]
fn multiple_list_expressions_get_independent_stable_states() {
    let source = r##"
import { type FC } from '@rue-js/rue';
type Row = { id: number; label: string };
declare const first: { value: Row[] };
declare const second: { value: Row[] };
const App: FC = () => <section>
  <ul>{first.value.map(row => <li key={row.id}>{row.label}</li>)}</ul>
  <ol>{second.value.map(row => <li key={row.id}>{row.label}</li>)}</ol>
</section>;
"##;
    let (program, cm) = utils::parse(source, "multiple-complex-list-rows.tsx");
    let output = utils::normalize(&utils::strip_marker(&utils::emit(apply(program), cm)));

    assert!(output.contains("let _map1_elements = []"), "{output}");
    assert!(output.contains("let _map2_elements = []"), "{output}");
    assert!(output.contains("_map1_elements = _$reconcileKeyed"), "{output}");
    assert!(output.contains("_map2_elements = _$reconcileKeyed"), "{output}");
}
