//! SWC 插件转换行为测试（spec_setup_object_method_mutual）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn object_method_with_mutual_local_functions_and_arrows() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(2)
  const obj = {
    meth() {
      function local1() { return a.value }
      const local2 = () => local3() + a.value
      const local3 = () => local1() + a.value
      return local2() + local3()
    }
  }
  return <div>{obj.meth()}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"import { ref, computed, _$compiledWithHookId, useSetup } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const a = ref(2);
            const obj = computed(()=>({
                        meth () {
                            function local1() {
                                return a.value;
                            }
                            const local2 = ()=>local3() + a.value;
                            const local3 = ()=>local1() + a.value;
                            return local2() + local3();
                        }
                }));
            untrack(()=>obj.get());
            const __rue_phase2_obj = obj;
            return {
                a: a,
                obj: obj,
                __rue_phase2_obj: __rue_phase2_obj
            };
        }));
    const { a: a, obj: obj, __rue_phase2_obj: __rue_phase2_obj } = _$useSetup;
    return <div>{obj.get().meth()}</div>;
};
"##;

    use utils::{normalize_setup_snapshot, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_object_method_mutual.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(
        normalize_setup_snapshot(&strip_marker(&out)),
        normalize_setup_snapshot(&strip_marker(expected_fragment))
    );
}
