//! SWC 插件转换行为测试（spec_setup_nested_funcs_cross_boundary）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn nested_functions_reference_unavailable_after_control_are_not_collected() {
    let src = r##"
import { ref } from 'rue-js'

function Comp(): JSX.Element {
  const a = ref(0)
  function before() { return a.value }
  if (a.value > 0) {
    const x = 1
  }
  function after() { return x }
  return <div>{before()}-{x}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { ref, _$vaporWithHookId, useSetup } from 'rue-js';
function Comp(): JSX.Element {
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const a = _$vaporWithHookId("ref:1.2:0", ()=>ref(0));
        function before() {
            return a.value;
        }
        if (a.value > 0) {
            const x = 1;
        }
        function after() {
            return x;
        }
        return {
            a: a,
            before: before,
            after: after
        };
    }));
    const { a: a, before: before, after: after } = _$useSetup;
    return <div>{before()}-{x}</div>;
}
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_nested_funcs_cross_boundary.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
