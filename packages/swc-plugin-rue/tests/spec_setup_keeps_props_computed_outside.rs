//! SWC 插件转换行为测试（spec_setup_keeps_props_computed_outside）
//!
//! 覆盖：依赖组件参数的 computed 不应被搬进 useSetup，否则会把 render 期依赖冻结到初始化阶段。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn keeps_props_dependent_computed_outside_use_setup() {
    let src = r##"
import { type FC, computed, ref } from '@rue-js/rue'

const Comp: FC<{ query: string }> = (props) => {
  const count = ref(0)
  const filtered = computed(() => props.query.trim().toLowerCase())
  return <div>{count.value}{filtered.value}</div>
}
"##;

    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);
    let normalized = utils::normalize(&utils::strip_marker(&out));

    assert!(normalized.contains(&utils::normalize(
        r#"const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const count = _$vaporWithHookId("ref:1:0", ()=>ref(0));
        return {
            count: count
        };
    }));"#,
    )));

    assert!(normalized.contains("const filtered = _$vaporWithHookId("));
    assert!(normalized.contains("computed(()=>props.query.trim().toLowerCase())"));

    assert!(!normalized.contains(&utils::normalize(
        r#"useSetup(()=>{
        const count = _$vaporWithHookId("ref:1:0", ()=>ref(0));
        const filtered = _$vaporWithHookId("#,
    )));
}
