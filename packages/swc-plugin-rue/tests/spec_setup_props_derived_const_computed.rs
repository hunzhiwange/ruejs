//! SWC 插件转换行为测试（spec_setup_props_derived_const_computed）
//!
//! 覆盖：顶层只读 props 派生 const 会在组件 phase 2 中降成 computed，
//! 后续读取自动改写为 `.get()`。
use swc_plugin_rue::{apply, apply_pre};

mod utils;

#[test]
fn lowers_props_derived_consts_into_computed_and_rewrites_reads() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

type Props = {
  showSearch?: boolean | { placeholder?: string }
  label?: string
}

const normalizeSearchConfig = (showSearch?: boolean | { placeholder?: string }) => {
  if (!showSearch) return { placeholder: 'hidden' }
  if (typeof showSearch === 'object') {
    return { placeholder: showSearch.placeholder ?? 'search...' }
  }
  return { placeholder: 'search...' }
}

const Comp: FC<Props> = ({ showSearch, label = 'fallback' }) => {
  const count = ref(0)
  const searchConfig = normalizeSearchConfig(showSearch)
  const summary = `${label}:${searchConfig.placeholder}`

  return <div data-count={count.value}>{summary}-{searchConfig.placeholder}</div>
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));
    println!("{}", normalized);

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_setup_props_derived_const_computed.out.js",
        utils::strip_marker(&out),
    )
    .ok();

    assert!(normalized.contains("_$compiledSetup(\"useSetup:0:0\""), "{normalized}");

    assert!(normalized.contains(&utils::normalize(r#"const count = ref(0);"#,)));

    assert!(normalized.contains(&utils::normalize(
        r#"const searchConfig = computed(()=>normalizeSearchConfig(__rue_props.showSearch));"#,
    )));

    assert!(
        normalized
            .contains(&utils::normalize(r#"const __rue_phase2_searchConfig = searchConfig;"#,))
    );

    assert!(normalized.contains(&utils::normalize(
      r#"const summary = computed(()=>`${(__rue_props.label === void 0 ? 'fallback' : __rue_props.label)}:${__rue_phase2_searchConfig.get().placeholder}`);"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"return { count: count, searchConfig: searchConfig, __rue_phase2_searchConfig: __rue_phase2_searchConfig, summary: summary, __rue_phase2_summary: __rue_phase2_summary };"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"const { count: count, searchConfig: searchConfig, __rue_phase2_searchConfig: __rue_phase2_searchConfig, summary: summary, __rue_phase2_summary: __rue_phase2_summary } = _$useSetup;"#,
    )));

    assert!(normalized.contains(&utils::normalize(
      r#"return <div data-count={count.value}>{summary.get()}-{searchConfig.get().placeholder}</div>;"#,
    )));
}

#[test]
fn lowers_local_reactive_derived_arrays_into_computed_and_rewrites_reads() {
    let src = r##"
import { type FC, computed, reactive, ref, shallowRef, toRef } from '@rue-js/rue'

const Comp: FC = () => {
  const count = ref(1)
  const shallow = shallowRef({ label: 'shallow' })
  const state = reactive({ name: 'Rue' })
  const nameRef = toRef(state, 'name')
  const doubled = computed(() => count.value * 2)
  const rows = [
    { name: 'ref', value: count.value },
    { name: 'shallow', value: shallow.value.label },
    { name: 'toRef', value: nameRef.value },
    { name: 'computed', value: doubled.get() },
    { name: 'reactive', value: state.name },
  ]

  return <table>{rows.map((row, idx) => <tr key={idx}><td>{row.value}</td></tr>)}</table>
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));
    println!("{}", normalized);

    assert!(normalized.contains(&utils::normalize(r#"const rows = computed(()=>["#,)));
    assert!(normalized.contains(&utils::normalize(r#"{ name: 'ref', value: count.value }"#,)));
    assert!(normalized.contains(&utils::normalize(r#"{ name: 'reactive', value: state.name }"#,)));
    assert!(normalized.contains(&utils::normalize(
        r#"return <table>{rows.get().map((row, idx)=><tr key={idx}><td>{row.value}</td></tr>)}</table>;"#,
    )));
    assert!(normalized.contains(&utils::normalize(
        r#"const { count: count, shallow: shallow, state: state, nameRef: nameRef, doubled: doubled, rows: rows, __rue_phase2_rows: __rue_phase2_rows } = _$useSetup;"#,
    )));
}

#[test]
fn preserves_hygiene_for_nested_props_derived_computed_reads() {
    let src = r##"
  import { type FC, ref } from '@rue-js/rue'

  type Props = {
    count?: number
  }

  const Comp: FC<Props> = props => {
    const count = Number(props.count ?? 0)
    const meterWidth = `${Math.max(8, Math.min(count * 9, 100))}%`

    return <div data-count={count}>{meterWidth}</div>
  }

  const Page: FC = () => {
    const count = ref(7)
    return <Comp count={count.value} />
  }
  "##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));
    println!("{}", normalized);

    assert!(normalized.contains(&utils::normalize(
      r#"const __rue_phase2_count = count;
      const meterWidth = computed(()=>`${Math.max(8, Math.min(__rue_phase2_count.get() * 9, 100))}%`);"#,
    )));

    assert!(!normalized.contains(&utils::normalize(
      r#"const meterWidth = _$compiledWithHookId("computed:1:1", ()=>computed(()=>`${Math.max(8, Math.min(count.get() * 9, 100))}%`));"#,
    )));

    assert!(normalized.contains(&utils::normalize(r#"const __child1_raw = count.get();"#,)));

    assert!(normalized.contains(r#"_el1.setAttribute("data-count", String(__child1_next))"#));
    assert!(normalized.contains(r#"_$compiledText(_el2, ()=>meterWidth.get())"#));
}

#[test]
fn keeps_snapshot_only_props_derived_consts_plain_inside_setup() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

type Props = {
  showSearch?: boolean | { defaultValue?: string }
}

const normalizeSearchConfig = (showSearch?: boolean | { defaultValue?: string }) => {
  if (!showSearch) return { defaultValue: '' }
  if (typeof showSearch === 'object') {
    return { defaultValue: showSearch.defaultValue ?? '' }
  }
  return { defaultValue: '' }
}

const Comp: FC<Props> = ({ showSearch }) => {
  const searchConfig = normalizeSearchConfig(showSearch)
  const searchValueRef = ref(searchConfig.defaultValue)

  return <div>{searchValueRef.value}</div>
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));
    println!("{}", normalized);

    assert!(normalized.contains(&utils::normalize(
        r#"const _$useSetup = _$compiledSetup("useSetup:0:0", ()=>{
        const searchConfig = normalizeSearchConfig(__rue_props.showSearch);
        const searchValueRef = ref(searchConfig.defaultValue);
        return {
            searchConfig: searchConfig,
            searchValueRef: searchValueRef
        };
    });"#,
    )));

    assert!(!normalized.contains("computed(()=>normalizeSearchConfig(__rue_props.showSearch))"));
    assert!(
        normalized.contains(&utils::normalize(r#"return <div>{searchValueRef.value}</div>;"#,))
    );
}

#[test]
fn keeps_snapshot_only_lazy_state_initializers_plain_inside_setup() {
    let src = r##"
import { type FC, useState } from '@rue-js/rue'

type Props = {
  showSearch?: boolean | { defaultValue?: string }
}

const normalizeSearchConfig = (showSearch?: boolean | { defaultValue?: string }) => {
  if (!showSearch) return { defaultValue: '' }
  if (typeof showSearch === 'object') {
    return { defaultValue: showSearch.defaultValue ?? '' }
  }
  return { defaultValue: '' }
}

const Comp: FC<Props> = ({ showSearch }) => {
  const searchConfig = normalizeSearchConfig(showSearch)
  const state = useState(() => searchConfig.defaultValue)

  return <div>{state[0].value}</div>
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));
    println!("{}", normalized);

    assert!(normalized.contains(&utils::normalize(
        r#"const searchConfig = normalizeSearchConfig(__rue_props.showSearch);"#,
    )));
    assert!(
        normalized.contains(&utils::normalize(
            r#"const state = useState(()=>searchConfig.defaultValue);"#,
        ))
    );
    assert!(!normalized.contains("computed(()=>normalizeSearchConfig(__rue_props.showSearch))"));
    assert!(normalized.contains(&utils::normalize(r#"return <div>{state[0].value}</div>;"#,)));
}

#[test]
fn keeps_snapshot_only_imperative_helper_consumption_plain_inside_setup() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

type Props = {
  showSearch?: boolean | { defaultValue?: string }
}

const normalizeSearchConfig = (showSearch?: boolean | { defaultValue?: string }) => {
  if (!showSearch) return { defaultValue: '' }
  if (typeof showSearch === 'object') {
    return { defaultValue: showSearch.defaultValue ?? '' }
  }
  return { defaultValue: '' }
}

const Comp: FC<Props> = ({ showSearch }) => {
  const searchConfig = normalizeSearchConfig(showSearch)
  const getInitialSearchValue = () => searchConfig.defaultValue.trim()
  const initialSearchValue = getInitialSearchValue()
  const searchValueRef = ref(initialSearchValue)

  return <div>{searchValueRef.value}</div>
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));
    println!("{}", normalized);

    assert!(normalized.contains(&utils::normalize(
        r#"const searchConfig = normalizeSearchConfig(__rue_props.showSearch);"#,
    )));
    assert!(normalized.contains(&utils::normalize(
        r#"const getInitialSearchValue = ()=>searchConfig.defaultValue.trim();"#,
    )));
    assert!(
        normalized
            .contains(&utils::normalize(r#"const initialSearchValue = getInitialSearchValue();"#,))
    );
    assert!(
        normalized
            .contains(&utils::normalize(r#"const searchValueRef = ref(initialSearchValue);"#,))
    );
    assert!(!normalized.contains("computed(()=>normalizeSearchConfig(__rue_props.showSearch))"));
    assert!(
        normalized.contains(&utils::normalize(r#"return <div>{searchValueRef.value}</div>;"#,))
    );
}

#[test]
fn keeps_snapshot_only_helper_alias_passthrough_plain_inside_setup() {
    let src = r##"
import { type FC, useState } from '@rue-js/rue'

type Props = {
  showSearch?: boolean | { defaultValue?: string }
}

const normalizeSearchConfig = (showSearch?: boolean | { defaultValue?: string }) => {
  if (!showSearch) return { defaultValue: '' }
  if (typeof showSearch === 'object') {
    return { defaultValue: showSearch.defaultValue ?? '' }
  }
  return { defaultValue: '' }
}

const Comp: FC<Props> = ({ showSearch }) => {
  const searchConfig = normalizeSearchConfig(showSearch)
  const getInitialSearchValue = () => searchConfig.defaultValue.trim()
  const lazyInit = getInitialSearchValue
  const state = useState(lazyInit)

  return <div>{state[0].value}</div>
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));
    println!("{}", normalized);

    assert!(normalized.contains(&utils::normalize(
        r#"const searchConfig = normalizeSearchConfig(__rue_props.showSearch);"#,
    )));
    assert!(normalized.contains(&utils::normalize(
        r#"const getInitialSearchValue = ()=>searchConfig.defaultValue.trim();"#,
    )));
    assert!(normalized.contains(&utils::normalize(r#"const lazyInit = getInitialSearchValue;"#,)));
    assert!(normalized.contains(&utils::normalize(r#"const state = useState(lazyInit);"#,)));
    assert!(!normalized.contains("computed(()=>normalizeSearchConfig(__rue_props.showSearch))"));
    assert!(normalized.contains(&utils::normalize(r#"return <div>{state[0].value}</div>;"#,)));
}

#[test]
fn lowers_props_derived_consts_when_helper_alias_reaches_render() {
    let src = r##"
import { type FC } from '@rue-js/rue'

type Props = {
  showSearch?: boolean | { placeholder?: string }
}

const normalizeSearchConfig = (showSearch?: boolean | { placeholder?: string }) => {
  if (!showSearch) return { placeholder: 'hidden' }
  if (typeof showSearch === 'object') {
    return { placeholder: showSearch.placeholder ?? 'search...' }
  }
  return { placeholder: 'search...' }
}

const Comp: FC<Props> = ({ showSearch }) => {
  const searchConfig = normalizeSearchConfig(showSearch)
  const renderSearchValue = () => searchConfig.placeholder.trim()
  const renderSearchValueAlias = renderSearchValue

  return <div>{renderSearchValueAlias()}</div>
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));
    println!("{}", normalized);

    assert!(normalized.contains(&utils::normalize(
        r#"const searchConfig = computed(()=>normalizeSearchConfig(__rue_props.showSearch));"#,
    )));
    assert!(normalized.contains(&utils::normalize(
        r#"const __rue_phase2_searchConfig = searchConfig;
      const renderSearchValue = ()=>__rue_phase2_searchConfig.get().placeholder.trim();"#,
    )));
    assert!(
        normalized
            .contains(&utils::normalize(r#"const renderSearchValueAlias = renderSearchValue;"#,))
    );
    assert!(
        normalized.contains(&utils::normalize(r#"return <div>{renderSearchValueAlias()}</div>;"#,))
    );
}
