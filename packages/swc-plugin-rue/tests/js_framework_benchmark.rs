//! js-framework-benchmark row-shape resource-budget regressions.
//!
//! These tests protect the single-root keyed-row codegen budget used by the
//! benchmark implementation.

use swc_plugin_rue::apply;

mod utils;

fn transform_benchmark_row() -> String {
    let source = r##"
import { type FC, ref, shallowRef, triggerRef } from '@rue-js/rue';

type Row = { id: number; label: string };
declare function buildData(count?: number): Row[];

const App: FC = () => {
  const rows = shallowRef<Row[]>([]);
  const selected = ref<number | undefined>(undefined);

  const runLots = () => {
    rows.value = buildData(10_000);
    selected.value = undefined;
  };

  const update = () => {
    for (let i = 0, length = rows.value.length; i < length; i += 10) {
      const row = rows.value[i];
      rows.value[i] = { ...row, label: `${row.label} !!!` };
    }
    triggerRef(rows);
  };

  const swapRows = () => {
    if (rows.value.length > 998) {
      const row = rows.value[1];
      rows.value[1] = rows.value[998];
      rows.value[998] = row;
      triggerRef(rows);
    }
  };

  const select = (id: number) => {
    selected.value = id;
  };

  const remove = (id: number) => {
    const index = rows.value.findIndex((row) => row.id === id);
    rows.value.splice(index, 1);
    triggerRef(rows);
  };

  return (
    <table className="table table-hover table-striped test-data">
      <tbody>
        {rows.value.map((row) => (
          <tr
            key={row.id}
            data-row-id={row.id}
            className={row.id === selected.value ? 'danger' : ''}
          >
            <td className="col-md-1">{row.id}</td>
            <td className="col-md-4">
              <a onClick={() => select(row.id)}>{row.label}</a>
            </td>
            <td className="col-md-1">
              <a onClick={() => remove(row.id)}>
                <span className="glyphicon glyphicon-remove" aria-hidden="true"></span>
              </a>
            </td>
            <td className="col-md-6"></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
"##;

    let (program, cm) = utils::parse(source, "js-framework-benchmark.tsx");
    let output = utils::emit(apply(program), cm);
    utils::normalize(&utils::strip_marker(&output))
}

fn transform_signal_benchmark_row() -> String {
    let source = r##"
import type { FC } from '@rue-js/rue';
import { signal } from '@rue-js/rue/internal';

type Row = { id: number; label: string };

const App: FC = () => {
  const rows = signal<Row[]>([]);
  const selected = signal<number | undefined>(undefined);

  return (
    <table className="table table-hover table-striped test-data">
      <tbody>
        {rows.get().map((row) => (
          <tr
            key={row.id}
            data-row-id={row.id}
            className={row.id === selected.get() ? 'danger' : ''}
          >
            <td className="col-md-1">{row.id}</td>
            <td className="col-md-4"><a>{row.label}</a></td>
            <td className="col-md-6"></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
"##;

    let (program, cm) = utils::parse(source, "js-framework-benchmark-signal.tsx");
    let output = utils::emit(apply(program), cm);
    utils::normalize(&utils::strip_marker(&output))
}

#[test]
fn benchmark_key_is_structural_only() {
    let output = transform_benchmark_row();
    let key_attribute_writes = output.matches(", \"key\",").count();

    assert!(
        output.contains("(row, idx)=>row.id"),
        "benchmark key must remain available to the list reconciler"
    );
    assert_eq!(
        key_attribute_writes, 0,
        "benchmark key must be structural metadata only; transformed output emitted {key_attribute_writes} key DOM attribute write(s)"
    );
}

#[test]
fn benchmark_row_codegen_stays_within_effect_budget() {
    let output = transform_benchmark_row();

    assert!(
        output.contains("_$reconcileKeyedSingle") && !output.contains("_$reconcileKeyed,"),
        "benchmark row must use only the compact single-root keyed core: {output}"
    );
    assert!(
        output.contains("_$compiledRenderEffect"),
        "benchmark list scheduling must use the compiled render effect: {output}"
    );
    assert!(
        !output.contains("_$compiledKeyedList"),
        "benchmark row must not retain the generic list helper: {output}"
    );
    assert!(
        output.contains("_$mountCompiledKeyedSingleRowDirect")
            && output.contains("return [ _root, _root ]"),
        "benchmark mount must use the compact single-node keyed-row/root protocol: {output}"
    );
    assert!(
        !output.contains("_$mountCompiledKeyedRow(")
            && !output.contains("_$mountCompiledKeyedSingleRow(")
            && !output.contains("_$mountCompiledSlotFactory("),
        "benchmark row must use the direct ownerless setup protocol: {output}"
    );
    assert_eq!(
        output.matches("_$compiledDelegateEventOwnerless(").count(),
        2,
        "both benchmark click handlers must use compact delegation: {output}"
    );
    assert!(
        !output.contains(".addEventListener(") && !output.contains(".removeEventListener("),
        "benchmark rows must not allocate native listeners per event node: {output}"
    );
    assert!(
        output.contains("_$rowPatchImpl") && !output.contains("_$compiledText("),
        "benchmark row-local text must lower into the direct row patch: {output}"
    );
    assert!(
        !output.contains("_$createTextWrapper("),
        "benchmark row-local text must not leave HTML wrapper elements in the table row: {output}"
    );
    assert!(
        !output.contains("renderAnchor("),
        "benchmark row must not emit per-row or per-text renderAnchor mounts: {output}"
    );
    assert!(
        !output.contains("watchEffect("),
        "benchmark compiled path must not emit Vapor watchers: {output}"
    );
    assert!(
        output.contains("Object.is("),
        "compiled class/text/attribute bindings must guard equal DOM writes: {output}"
    );
}

#[test]
fn signal_benchmark_row_uses_the_same_direct_root_budget() {
    let output = transform_signal_benchmark_row();

    assert!(
        output.contains("_$reconcileKeyedSingle") && !output.contains("_$reconcileKeyed,"),
        "signal.get() bindings must use the compact single-root keyed core: {output}"
    );
    assert!(
        output.contains("_$mountCompiledKeyedSingleRowDirect")
            && output.contains("return [ _root, _root ]"),
        "signal.get() mount must use the compact single-node keyed-row/root protocol: {output}"
    );
    assert!(
        !output.contains("_$mountCompiledKeyedRow(")
            && !output.contains("_$mountCompiledKeyedSingleRow(")
            && !output.contains("_$mountCompiledSlotFactory("),
        "signal.get() row must use the direct ownerless setup protocol: {output}"
    );
    assert!(
        output.contains("selected.get()"),
        "signal getter dependency reads must survive effect coalescing: {output}"
    );
    assert!(
        !output.contains("_$createTextWrapper("),
        "signal benchmark row-local text must not create wrapper elements: {output}"
    );
    assert!(
        !output.contains("renderAnchor("),
        "signal benchmark rows must not register per-row anchors: {output}"
    );
    assert!(
        !output.contains("watchEffect(") && !output.contains("_$compiledKeyedList"),
        "signal benchmark must stay off the Vapor list path: {output}"
    );
}

#[test]
fn signal_benchmark_stays_on_native_signal_apis() {
    let output = transform_signal_benchmark_row();

    assert!(
        !output.contains("vapor("),
        "compiled signal benchmark must not call the Vapor renderer: {output}"
    );

    assert!(
        output.contains("signal<Row[]>([])"),
        "native signal construction must survive compilation: {output}"
    );
    assert!(
        output.contains("rows.get()"),
        "native signal list reads must remain on SignalHandle::get: {output}"
    );
    assert!(
        output.contains("selected.get()"),
        "native signal scalar reads must remain on SignalHandle::get: {output}"
    );

    for forbidden in ["shallowRef(", "triggerRef(", "rows.value", "selected.value"] {
        assert!(
            !output.contains(forbidden),
            "native signal codegen must not fall back to `{forbidden}`: {output}"
        );
    }

    let compiled_import = output
        .lines()
        .find(|line| line.contains("@rue-js/rue/internal"))
        .expect("compiled runtime import");
    for helper in ["signal", "_$compiledRenderEffect", "_$reconcileKeyedSingle", "createSelector"] {
        assert!(
            compiled_import.contains(helper),
            "generated `{helper}` must share the explicit compiled signal graph: {output}"
        );
    }
    for removed_helper in ["createOwner", "disposeOwner", "runWithOwner", "onCleanup"] {
        assert!(
            !compiled_import.contains(removed_helper),
            "compiled selector rows must not import `{removed_helper}`: {output}"
        );
    }
}
