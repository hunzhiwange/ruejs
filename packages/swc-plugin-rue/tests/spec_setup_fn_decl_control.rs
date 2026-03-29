//! SWC 插件转换行为测试（spec_setup_fn_decl_control）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn skips_vars_after_first_control_in_fn_decl() {
    let src = r##"
import { ref } from 'rue-js'

function Comp(): JSX.Element {
  const a = ref(0)
  function before() { return a.value }
  if (a.value > 0) {
    const b = ref(1)
    console.log(b.value)
  }
  const c = ref(2)
  function after() { return c.value }
  return <div>{before()}-{c.value}</div>
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
            const b = _$vaporWithHookId("ref:1.2:1", ()=>ref(1));
            console.log(b.value);
        }
        const c = _$vaporWithHookId("ref:1.2:2", ()=>ref(2));
        function after() {
            return c.value;
        }
        return {
            a: a,
            before: before,
            c: c,
            after: after
        };
    }));
    const { a: a, before: before, c: c, after: after } = _$useSetup;
    return <div>{before()}-{c.value}</div>;
}
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec_on_setup_fn_decl_control.out.js", strip_marker(&out))
        .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
