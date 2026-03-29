//! SWC 插件转换行为测试（spec_setup_control_multilevel_cross）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn multilevel_control_and_cross_branch_dependencies() {
    let src = r##"
import { type FC, ref } from 'rue-js'

const Comp: FC = () => {
  const a = ref(1)
  function pre() { return a.value }
  if (a.value > 0) {
    const b = a.value + 2
    if (b > 3) {
      const c = b + a.value
      function inner() { return c }
      console.log(inner())
    }
  }
  return <div>{pre()}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, _$vaporWithHookId, useSetup } from 'rue-js';
const Comp: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const a = _$vaporWithHookId("ref:1:0", ()=>ref(1));
        function pre() {
            return a.value;
        }
        if (a.value > 0) {
            const b = a.value + 2;
            if (b > 3) {
                const c = b + a.value;
                function inner() {
                    return c;
                }
                console.log(inner());
            }
        }
        return {
            a: a,
            pre: pre
        };
    }));
    const { a: a, pre: pre } = _$useSetup;
    return <div>{pre()}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_control_multilevel_cross.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
