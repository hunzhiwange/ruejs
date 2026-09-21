use super::*;
use std::collections::HashMap;
use std::sync::Arc;
use swc_core::common::{DUMMY_SP, FileName, SourceMap};
use swc_core::ecma::ast::{Module, ModuleItem, Program};
use swc_core::ecma::codegen::{Emitter, text_writer::JsWriter};
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

fn parse_expr(src: &str, tsx: bool) -> Expr {
    let cm = Arc::new(SourceMap::default());
    let fm = cm
        .new_source_file(FileName::Custom("element-list-test.tsx".into()).into(), src.to_string());
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax { tsx, ..Default::default() }),
        StringInput::from(&*fm),
        None,
    );
    *parser.parse_expr().expect("parse expr")
}

fn parse_call(src: &str) -> CallExpr {
    match parse_expr(src, true) {
        Expr::Call(call) => call,
        other => panic!("expected call expr, got {other:?}"),
    }
}

fn new_vt() -> VaporTransform {
    VaporTransform {
        next_el: 0,
        next_list: 0,
        next_map: 0,
        next_child: 0,
        once_depth: 0,
        did_transform: false,
        static_templates: true,
        el_tag_by_ident: HashMap::new(),
        renderable_local_scopes: Vec::new(),
        plain_local_scopes: Vec::new(),
    }
}

fn emit_stmts(stmts: Vec<Stmt>) -> String {
    let cm = Arc::new(SourceMap::default());
    let module = Module {
        span: DUMMY_SP,
        body: stmts.into_iter().map(ModuleItem::Stmt).collect(),
        shebang: None,
    };
    let mut buf = Vec::new();
    let mut emitter = Emitter {
        cfg: Default::default(),
        comments: None,
        cm: cm.clone(),
        wr: JsWriter::new(cm, "\n", &mut buf, None),
    };
    emitter.emit_program(&Program::Module(module)).expect("emit");
    String::from_utf8(buf).expect("utf8")
}

fn compact(src: &str) -> String {
    src.chars().filter(|ch| !ch.is_whitespace()).collect()
}

fn compile_list(source: &str) -> Option<String> {
    let mut vt = new_vt();
    let call = parse_call(source);
    let mut stmts = Vec::new();
    try_build_list_from_map(&mut vt, &ident("root"), &call, &mut stmts)
        .then(|| compact(&emit_stmts(stmts)))
}

#[test]
fn compiles_keyed_native_rows_to_closed_factories() {
    let out =
        compile_list("items.map((item, index) => <li key={item.id}>{index}:{item.name}</li>)")
            .expect("compiled list");

    assert!(out.contains("_$reconcileKeyed("), "{out}");
    assert!(out.contains("_$compiledRenderEffect("), "{out}");
    assert!(!out.contains("effect("), "{out}");
    assert!(out.contains("(item,index)=>item.id"), "{out}");
    assert!(out.contains("_$mountCompiledKeyedRow("), "{out}");
    assert!(out.contains("_$rowItem1.set(_$rowNextItem)"), "{out}");
    assert!(out.contains("_$rowIndex1.set(_$rowNextIndex)"), "{out}");
    assert!(!out.contains("_$compiledKeyedList"), "{out}");
    assert!(!out.contains("renderBetween("), "{out}");
    assert!(!out.contains("renderAnchor("), "{out}");
}

#[test]
fn uses_a_direct_item_slot_for_simple_native_rows() {
    let out = compile_list(
        "items.map(item => <li key={item.id} className={item.className} onClick={() => select(item)}>{item.name}</li>)",
    )
    .expect("compiled list");

    assert!(out.contains("let_$rowItem1=item"), "{out}");
    assert!(out.contains("_$rowItem1=_$rowNextItem"), "{out}");
    assert!(!out.contains("_$rowItem1=_$compiledSignal("), "{out}");
    assert!(!out.contains("_$rowItem1.get()"), "{out}");
}

#[test]
fn gates_direct_and_slot_row_updates_through_list_memo() {
    let direct = compile_list(
        "items.map(item => _$compiledMemo(null, () => <li key={item.id}>{item.name}</li>, [item.name]))",
    )
    .expect("compiled direct memo row");
    assert!(direct.contains("_$mountCompiledKeyedSingleRowDirect("), "{direct}");
    assert!(direct.contains("(_$rowNextItem,_$rowNextIndex,_$rowMemoChanged)=>"), "{direct}");
    assert!(direct.contains("_$rowMemoChanged||_map1_memo.refresh()"), "{direct}");

    let slot = compile_list(
        "items.map(item => _$compiledMemo(null, () => <tr key={item.id} className={item.active ? 'active' : ''}><td>{item.name}</td></tr>, []))",
    )
    .expect("compiled slot memo row");
    assert!(
        slot.contains("()=>_map1_memo.read(()=>_$compiledValueFactory(_$rowItem1.get().name))"),
        "{slot}"
    );
}

#[test]
fn emits_ownerless_factory_for_resource_free_simple_native_rows() {
    let resource_free = compile_list(
        "items.map(item => <li key={item.id} className={item.className}>{item.name}</li>)",
    )
    .expect("compiled list");
    assert!(resource_free.contains("_$mountCompiledKeyedSingleRowDirect("), "{resource_free}");
    assert!(!resource_free.contains("_$mountCompiledKeyedSingleRowOwnerless("), "{resource_free}");
    assert!(!resource_free.contains("_$compiledStaticRoot("), "{resource_free}");
    assert!(!resource_free.contains("_$compiledRoot("), "{resource_free}");
    assert!(!resource_free.contains("_$mountCompiledKeyedSingleRow("), "{resource_free}");
    assert!(resource_free.contains("_$reconcileKeyedSingle("), "{resource_free}");
    assert!(!resource_free.contains("_$reconcileKeyed("), "{resource_free}");
    assert!(!resource_free.contains("_$mountCompiledSlotFactory("), "{resource_free}");

    for source in [
        "items.map(item => <li key={item.id} v-memo={[item.name]}>{item.name}</li>)",
        "items.map(item => <Row key={item.id}>{item.name}</Row>)",
    ] {
        let out = compile_list(source).expect("compiled list");
        assert!(!out.contains("_$mountCompiledKeyedSingleRowOwnerless("), "{source}: {out}");
    }
}

#[test]
fn emits_ownerless_factory_for_delegated_events_and_direct_selector_subscriptions() {
    let delegated = compile_list(
        "items.map(item => <li key={item.id} onClick={() => select(item)}>{item.name}</li>)",
    )
    .expect("compiled list");
    assert!(delegated.contains("_$mountCompiledKeyedSingleRowDirect("), "{delegated}");
    assert!(!delegated.contains("_$mountCompiledKeyedSingleRowOwnerless("), "{delegated}");
    assert!(!delegated.contains("_$compiledStaticRoot("), "{delegated}");
    assert!(delegated.contains("_$compiledDelegateEventOwnerless("), "{delegated}");
    assert!(!delegated.contains("onOwnerCleanup(_$compiledDelegateEvent"), "{delegated}");

    let selector = compile_list(
        "items.map(item => <li key={item.id} className={item.id === selected.get() ? 'selected' : ''}>{item.name}</li>)",
    )
    .expect("compiled list");
    assert!(selector.contains("_$mountCompiledKeyedSingleRowDirect("), "{selector}");
    assert!(selector.contains("_selector.subscribeKeyUnique("), "{selector}");
    assert!(!selector.contains("effect("), "{selector}");

    for source in [
        "items.map(item => <li key={item.id} onClick={event => select(event, item)}>{item.name}</li>)",
        "items.map(item => <li key={item.id} onClickCapture={() => select(item)}>{item.name}</li>)",
        "items.map(item => <li key={item.id} onScroll={() => select(item)}>{item.name}</li>)",
        "items.map(item => <li key={item.id} v-memo={[item.name]}>{item.name}</li>)",
        "items.map(item => <li key={item.id} ref={capture}>{item.name}</li>)",
        "items.map(item => <li key={item.id} {...item}>{item.name}</li>)",
        "items.map(item => item.ok ? <li key={item.id}>{item.name}</li> : null)",
        "items.map(item => { onCleanup(() => select(item)); return <li key={item.id}>{item.name}</li> })",
        "items.map(item => { effect(() => select(item)); return <li key={item.id}>{item.name}</li> })",
    ] {
        let out = compile_list(source).expect("compiled list");
        assert!(!out.contains("_$mountCompiledKeyedSingleRowOwnerless("), "{source}: {out}");
    }
}

#[test]
fn omits_index_signal_when_the_row_does_not_read_the_map_index() {
    for source in [
        "items.map(item => <li key={item.id}>{item.name}</li>)",
        "items.map((item, index) => <li key={index}>{item.name}</li>)",
        "items.map((item, index) => <li key={item.id}>{((index) => index + 1)(4)}</li>)",
        "items.map(([index, item]) => <li key={item.id}>{index}</li>)",
    ] {
        let out = compile_list(source).expect("compiled list");

        assert!(!out.contains("_$rowIndex1=_$compiledSignal("), "{source}: {out}");
        assert!(!out.contains("_$rowIndex1.set("), "{source}: {out}");
    }
}

#[test]
fn keeps_index_signal_for_direct_and_event_closure_reads() {
    for source in [
        "items.map((item, index) => <li key={item.id}>{index}:{item.name}</li>)",
        "items.map((item, index) => <li key={item.id} onClick={() => select(index)}>{item.name}</li>)",
        "items.map((item, index) => <li key={item.id} v-memo={[index]}>{item.name}</li>)",
    ] {
        let out = compile_list(source).expect("compiled list");

        assert!(out.contains("_$rowIndex1=_$compiledSignal(index)"), "{source}: {out}");
        assert!(out.contains("_$rowIndex1.set(_$rowNextIndex)"), "{source}: {out}");
    }
}

#[test]
fn emits_the_existing_index_proof_into_the_reconcile_abi() {
    let without_index = compile_list(
        "items.map((item, index) => <li key={item.id} onClick={() => select(item)}>{item.name}</li>)",
    )
    .expect("compiled list");
    let text_index =
        compile_list("items.map((item, index) => <li key={item.id}>{index}:{item.name}</li>)")
            .expect("compiled list");
    let event_index = compile_list(
        "items.map((item, index) => <li key={item.id} onClick={() => select(index)}>{item.name}</li>)",
    )
    .expect("compiled list");
    let multiple_roots = compile_list(
        "items.map(item => <><span key={item.id}>{item.name}</span><em>{item.meta}</em></>)",
    )
    .expect("compiled list");

    assert!(without_index.contains("},false,true)"), "{without_index}");
    assert!(text_index.contains("},true,false)"), "{text_index}");
    assert!(event_index.contains("},true,false)"), "{event_index}");
    assert!(multiple_roots.contains("_$reconcileKeyed("), "{multiple_roots}");
    assert!(!multiple_roots.contains("_$reconcileKeyedSingle("), "{multiple_roots}");
    assert!(multiple_roots.contains("},false,false)"), "{multiple_roots}");
}

#[test]
fn compiles_fragment_and_block_branch_rows() {
    for source in [
        "items.map(item => <><span key={item.id}>{item.a}</span><em>{item.b}</em></>)",
        "items.map(item => { if (item.ok) return <li key={item.id}>{item.name}</li>; return <li key={item.id}>off</li>; })",
        "items.map(item => <li key={item.id} ref={item.ref}>{item.name}</li>)",
    ] {
        let out = compile_list(source).unwrap_or_else(|| panic!("expected compiled row: {source}"));
        assert!(out.contains("_$reconcileKeyed("), "{source}: {out}");
        assert!(out.contains("_$mountCompiledKeyedRow("), "{source}: {out}");
        assert!(!out.contains("_$compiledKeyedList"), "{source}: {out}");
    }
}

#[test]
fn compiles_rows_with_derived_members_and_formatter_calls() {
    let out = compile_list(
        "items.map(item => { const isEditing = editingId.value === item.id; const editingValue = isEditing ? editingTitle.value : item.title; const meta = STATUS_META[item.status]; return <li key={`${item.id}-${isEditing}`}><span>{meta.label}</span><time>{formatCreatedAt(item.createdAt)}</time><input value={editingValue} /></li>; })",
    )
    .expect("compiled list");

    assert!(out.contains("_$reconcileKeyed("), "{out}");
    assert!(out.contains("_$mountCompiledKeyedRow("), "{out}");
    assert!(!out.contains("items.map("), "{out}");
}

#[test]
fn keeps_unrelated_row_reads_out_of_key_getter() {
    let out = compile_list(
        "items.map(item => { const isEditing = editingId.value === item.id; const editingValue = isEditing ? editingTitle.value : item.title; return <li key={`${item.id}-${isEditing}`}><input value={editingValue} /></li>; })",
    )
    .expect("compiled list");

    assert!(out.contains("(item,idx)=>`${item.id}-${(editingId.value===item.id)}`"), "{out}",);
}

#[test]
fn compiles_index_keyed_rows_at_a_precomputed_anchor() {
    let mut vt = new_vt();
    let call = parse_call("rows.map(row => <li>{row.label}</li>)");
    let mut stmts = Vec::new();

    assert!(try_build_list_from_map_at(
        &mut vt,
        &ident("parent"),
        &ident("hole"),
        &call,
        &mut stmts,
    ));
    let out = compact(&emit_stmts(stmts));
    assert!(out.contains("_$reconcileKeyedSingle(parent,hole"), "{out}");
    assert!(out.contains("(row,idx)=>idx"), "{out}");
    assert!(!out.contains("rue:list:end"), "{out}");
    assert!(!out.contains("_$compiledKeyedList"), "{out}");
}

#[test]
fn adapts_call_rows_and_diagnoses_other_rows_without_a_closed_factory() {
    for source in [
        "rows.map(row => <Row key={row.id} row={row} />)",
        "rows.map(row => opaqueRow(row))",
        "rows.map(async row => <li key={row.id}>{row.label}</li>)",
        "rows.map(row => <svg:path key={row.id}>{row.label}</svg:path>)",
    ] {
        let mut vt = new_vt();
        let call = parse_call(source);
        let mut stmts = Vec::new();

        let handled = try_build_list_from_map(&mut vt, &ident("root"), &call, &mut stmts);
        assert_eq!(handled, !source.contains("async row"), "{source}");
        let out = emit_stmts(stmts);
        if source.contains("async row") {
            assert!(out.is_empty(), "{source}: {out}");
        } else {
            assert!(out.contains("_$reconcileKeyed"), "{source}: {out}");
            assert!(!out.contains("renderAnchor"), "{source}: {out}");
            if source.contains("opaqueRow") {
                assert!(out.contains("_$compiledValueFactory"), "{source}: {out}");
            } else {
                assert!(out.contains("_$mountCompiledKeyedRow"), "{source}: {out}");
            }
        }
    }
}

#[test]
fn rejects_non_map_calls_without_output() {
    let mut vt = new_vt();
    let call = parse_call("items.filter(item => item.ok)");
    let mut stmts = Vec::new();

    assert!(!try_build_list_from_map(&mut vt, &ident("root"), &call, &mut stmts));
    assert!(stmts.is_empty());
}

#[test]
fn resource_rows_share_the_closed_factory_protocol() {
    let out = compile_list(
        "items.map(item => <li key={item.id} onClick={event => select(event, item)}>{item.name}</li>)",
    )
    .expect("compiled list");
    assert!(out.contains("_$mountCompiledKeyedSingleRow("), "{out}");
    assert!(out.contains("_$mountCompiledSlotFactory("), "{out}");
    for source in [
        "items.map(item => <li key={item.id} v-memo={[item.name]} onClick={() => select(item)}>{item.name}</li>)",
        "items.map(item => <li key={item.id} ref={capture}>{item.name}</li>)",
        "items.map(item => <Row key={item.id}>{item.name}</Row>)",
        "items.map(item => <li key={item.id} {...item}>{item.name}</li>)",
    ] {
        let out = compile_list(source).expect("compiled list");
        assert!(!out.contains("_$mountCompiledKeyedSingleRowSetup("), "{source}: {out}");
    }
}

#[test]
fn reuses_only_isolated_simple_row_text() {
    let out = compile_list("items.map(item => <li key={item.id}><a>{item.name}</a></li>)").unwrap();
    assert!(out.contains("rue:row-text"), "{out}");
    assert!(!out.contains("_$compiledCreateTextNode("), "{out}");
    assert!(!out.contains("insertBefore("), "{out}");
    assert!(!out.contains("removeChild("), "{out}");
    for source in [
        "items.map(item => <li key={item.id}>prefix{item.name}</li>)",
        "items.map(item => <li key={item.id}>{item.name}{item.id}</li>)",
        "items.map(item => <tr key={item.id}>{item.name}</tr>)",
    ] {
        let out = compile_list(source).unwrap();
        assert!(!out.contains("rue:row-text"), "{out}");
        assert!(out.contains("rue:text-hole"), "{out}");
        assert!(out.contains("_$compiledCreateTextNode("), "{out}");
    }
}
