//! SWC 插件转换行为测试（spec_props_reactive_destructure）
//!
//! 覆盖：组件参数解构会保留隐藏 props 对象，并把安全读取重写为 props 访问；
//! 同时对 `watch(query, ...)` 这种按值传递场景给出 warning。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn rewrites_component_props_destructure_reads_to_hidden_props_object() {
    let src = r##"
import { type FC, computed, watchEffect } from '@rue-js/rue'

const Comp: FC<{ query?: string; count: number; label?: string }> = ({
  query = ' hello ',
  count: total,
  label: text = 'fallback',
}) => {
  const upper = computed(() => query.trim().toUpperCase())
  const payload = { total, text, query }
  const format = (query: string) => query.toLowerCase()

  watchEffect(() => {
    console.log(query, total, text, payload.total, format(query))
  })

  return <button onClick={() => console.log(query, total, text)}>{upper.get()}-{payload.query}</button>
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_props_reactive_destructure.out.js",
        utils::strip_marker(&out),
    )
    .ok();

    assert!(normalized.contains(&utils::normalize(r#"}> = (__rue_props)=>{"#,)));

    assert!(normalized.contains(&utils::normalize(
        r#"const upper = computed(()=>(__rue_props.query === void 0 ? ' hello ' : __rue_props.query).trim().toUpperCase());"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"const payload = computed(()=>({
        total: __rue_props.count,
        text: (__rue_props.label === void 0 ? 'fallback' : __rue_props.label),
        query: (__rue_props.query === void 0 ? ' hello ' : __rue_props.query)
    }));"#,
    )));

    assert!(normalized.contains(&utils::normalize(r#"const __rue_phase2_payload = payload;"#,)));

    assert!(
        normalized.contains(&utils::normalize(
            r#"const format = (query: string)=>query.toLowerCase();"#,
        ))
    );

    assert!(normalized.contains(&utils::normalize(r#"watchEffect(()=>{"#,)));

    assert!(normalized.contains(&utils::normalize(
        r#"console.log((__rue_props.query === void 0 ? ' hello ' : __rue_props.query), __rue_props.count, (__rue_props.label === void 0 ? 'fallback' : __rue_props.label), __rue_phase2_payload.get().total, format((__rue_props.query === void 0 ? ' hello ' : __rue_props.query)));"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"return <button onClick={()=>console.log((__rue_props.query === void 0 ? ' hello ' : __rue_props.query), __rue_props.count, (__rue_props.label === void 0 ? 'fallback' : __rue_props.label))}>{upper.get()}-{payload.get().query}</button>;"#,
    )));
}

#[test]
fn rewrites_nested_component_props_destructure_reads() {
    let src = r##"
import { type FC, computed, watchEffect } from '@rue-js/rue'

const Comp: FC<{
    options: {
        query?: string
        meta: { label?: string }
    }
    counts: [number, number?]
}> = ({
    options: {
        query = ' nested ',
        meta: { label: text = 'deep-label' },
    },
    counts: [first, second = 2],
}) => {
    const summary = computed(() => `${query.trim().toUpperCase()}-${text}-${first}-${second}`)
    const shadow = (query: string) => query.toLowerCase()

    watchEffect(() => {
        console.log(query, text, first, second, shadow(query))
    })

    return <button onClick={() => console.log(query, text, first, second)}>{summary.get()}</button>
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));

    assert!(normalized.contains(&utils::normalize(r#"(__rue_props)=>{"#,)));

    assert!(normalized.contains(&utils::normalize(
        r#"(__rue_props.options.query === void 0 ? ' nested ' : __rue_props.options.query).trim().toUpperCase()"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"__rue_props.options.meta.label === void 0 ? 'deep-label' : __rue_props.options.meta.label"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"__rue_props.counts[1] === void 0 ? 2 : __rue_props.counts[1]"#,
    )));

    assert!(
        normalized.contains(&utils::normalize(
            r#"const shadow = (query: string)=>query.toLowerCase();"#,
        ))
    );

    assert!(normalized.contains(&utils::normalize(
                r#"console.log((__rue_props.options.query === void 0 ? ' nested ' : __rue_props.options.query), (__rue_props.options.meta.label === void 0 ? 'deep-label' : __rue_props.options.meta.label), __rue_props.counts[0], (__rue_props.counts[1] === void 0 ? 2 : __rue_props.counts[1]), shadow((__rue_props.options.query === void 0 ? ' nested ' : __rue_props.options.query)));"#,
        )));

    assert!(normalized.contains(&utils::normalize(r#"watchEffect(()=>{"#,)));
}

#[test]
fn rewrites_nested_component_props_destructure_with_param_default() {
    let src = r##"
import { type FC, computed, watchEffect } from '@rue-js/rue'

type Props = {
    options?: {
        query?: string
        meta?: { label?: string }
    }
    counts?: [number?, number?]
}

const Comp: FC<Props> = ({
    options: {
        query = ' nested-default ',
        meta: { label: text = 'default-label' } = {},
    } = {},
    counts: [first = 1, second = 2] = [],
}: Props = {}) => {
    const summary = computed(() => `${query.trim().toUpperCase()}-${text}-${first}-${second}`)

    watchEffect(() => {
        console.log(query, text, first, second)
    })

    return <button onClick={() => console.log(query, text, first, second)}>{summary.get()}</button>
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));

    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_props_reactive_destructure_nested_default.out.js",
        utils::strip_marker(&out),
    )
    .ok();

    assert!(normalized.contains(&utils::normalize(r#"(__rue_props: Props = {})=>{"#,)));

    assert!(normalized.contains(&utils::normalize(
        r#"__rue_props.options === void 0 ? {} : __rue_props.options.query === void 0 ? ' nested-default ' : __rue_props.options === void 0 ? {} : __rue_props.options.query"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"__rue_props.options === void 0 ? {} : __rue_props.options.meta === void 0 ? {} : __rue_props.options === void 0 ? {} : __rue_props.options.meta.label === void 0 ? 'default-label'"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"__rue_props.counts === void 0 ? [] : __rue_props.counts[0] === void 0 ? 1 : __rue_props.counts === void 0 ? [] : __rue_props.counts[0]"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"__rue_props.counts === void 0 ? [] : __rue_props.counts[1] === void 0 ? 2 : __rue_props.counts === void 0 ? [] : __rue_props.counts[1]"#,
    )));
}

#[test]
fn warns_when_watch_receives_destructured_prop_value() {
    use swc_plugin_rue::log;

    let src = r##"
import { type FC, watch } from '@rue-js/rue'

const Comp: FC<{ query: string }> = ({ query }) => {
  watch(query, () => {
    console.log(query)
  })

  return <div>{query}</div>
}
"##;

    let log_path = "target/spec_props_reactive_destructure.warning.log";
    std::fs::create_dir_all("target").ok();
    std::fs::remove_file(log_path).ok();

    log::set_log_enabled(true);
    log::set_log_console(false);
    log::set_log_level("warning");
    log::clear_log_include();
    log::clear_log_exclude();
    log::set_log_file(log_path);

    let (program, _cm) = utils::parse(src, "test.tsx");
    let _ = apply_pre(program);

    let log_output = std::fs::read_to_string(log_path).expect("warning log file");
    assert!(log_output.contains("reactive props destructure"));
    assert!(log_output.contains("watch(() => query, ...)"));
}

#[test]
fn rewrites_component_props_destructure_with_rest_and_phase2_computed_reads() {
    let src = r##"
import { type FC } from '@rue-js/rue'

type Props = {
  query?: string
  label?: string
  id?: string
}

const Comp: FC<Props> = ({ query = ' hello ', label = 'fallback', ...rest }) => {
  const summary = `${query.trim().toUpperCase()}-${label}`
  return <button data-id={rest.id}>{summary}</button>
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));

    assert!(normalized.contains(&utils::normalize(
        r#"const { query: __rue_rest_omit_0, label: __rue_rest_omit_1, ...rest } = __rue_props;"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"const summary = computed(()=>`${(__rue_props.query === void 0 ? ' hello ' : __rue_props.query).trim().toUpperCase()}-${(__rue_props.label === void 0 ? 'fallback' : __rue_props.label)}`);"#,
    )));

    assert!(normalized.contains(&utils::normalize(
        r#"return <button data-id={rest.id}>{summary.get()}</button>;"#,
    )));
}

#[test]
fn keeps_props_derived_early_render_control_reactive() {
    let src = r##"
import { type FC } from '@rue-js/rue'

const Comp: FC<{ open?: boolean; items: string[] }> = ({ open = false, items }) => {
  const getTotal = () => items.length
  const getOpen = () => open
  const total = getTotal()
  const visible = getOpen() && total > 0
  if (!visible) return null
  return <p>{total}</p>
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));

    assert!(normalized.contains(&utils::normalize("computed(()=>getTotal())")), "{out}");
    assert!(
        normalized
            .contains(&utils::normalize("__rue_props.open === void 0 ? false : __rue_props.open",)),
        "{out}",
    );
    assert!(normalized.contains(&utils::normalize("if (!__rue_phase2_visible.get())")), "{out}");
}
