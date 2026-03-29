//! SWC 插件转换行为测试（spec_setup_object_method_deeper_mutual）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn object_method_with_deeper_mutual_functions_and_arrows() {
    let src = r##"
import { type FC, ref } from 'rue-js'

const Comp: FC = () => {
  const a = ref(2)
  const obj = {
    meth() {
      function f1() { return a.value }
      const g1 = () => f1() + a.value
      const g2 = () => g1() + a.value
      function f2() { return a.value + g2() }
      return g2() + f2()
    }
  }
  return <div>{obj.meth()}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, _$vaporWithHookId, useSetup } from 'rue-js';
const Comp: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const a = _$vaporWithHookId("ref:1:0", ()=>ref(2));
        const obj = {
            meth () {
                function f1() {
                    return a.value;
                }
                const g1 = ()=>f1() + a.value;
                const g2 = ()=>g1() + a.value;
                function f2() {
                    return a.value + g2();
                }
                return g2() + f2();
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
        "target/vapor_outputs/spec_on_setup_object_method_deeper_mutual.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
