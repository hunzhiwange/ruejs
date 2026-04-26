//! SWC 插件转换行为测试（spec_setup_object_method_local_fn）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn object_method_defines_local_fn_and_uses_outer_dep() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(1)
  const obj = {
    meth() {
      function local() { return a.value }
      return local() + 1
    }
  }
  return <div>{obj.meth()}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { _$vaporWithHookId, useSetup } from "@rue-js/rue/vapor";
import { type FC, ref } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const a = _$vaporWithHookId("ref:1:0", ()=>ref(1));
        const obj = {
            meth () {
                function local() {
                    return a.value;
                }
                return local() + 1;
            }
        };
        return {
            a: a,
            obj: obj
        };
    }));
    const { a: a, obj: obj } = _$useSetup;
    return <div>{obj.meth()}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_object_method_local_fn.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
