//! SWC 插件转换行为测试（spec_setup_spread）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn collects_object_and_array_with_spreads_when_deps_available() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const extra = { y: 2 }
  const arr0 = [1]
  const a = ref(0)
  const obj = { ...extra, x: a.value }
  const arr = [...arr0, a.value]
  return <div>{arr[1]}-{obj.x}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"import { computed, _$compiledWithHookId, useSetup } from "@rue-js/rue/internal";
import { type FC, ref } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const extra = {
                y: 2
            };
            const arr0 = [
                1
            ];
            const a = ref(0);
            const obj = computed(()=>({
                        ...extra,
                        x: a.value
                    }));
            untrack(()=>obj.get());
            const __rue_phase2_obj = obj;
            const arr = computed(()=>[
                        ...arr0,
                        a.value
                    ]);
            untrack(()=>arr.get());
            const __rue_phase2_arr = arr;
            return {
                extra: extra,
                arr0: arr0,
                a: a,
                obj: obj,
                __rue_phase2_obj: __rue_phase2_obj,
                arr: arr,
                __rue_phase2_arr: __rue_phase2_arr
            };
        }));
    const { extra: extra, arr0: arr0, a: a, obj: obj, __rue_phase2_obj: __rue_phase2_obj, arr: arr, __rue_phase2_arr: __rue_phase2_arr } = _$useSetup;
    return <div>{arr.get()[1]}-{obj.get().x}</div>;
};
"##;

    use utils::{normalize_setup_snapshot, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec_on_setup_spread.out.js", strip_marker(&out)).ok();
    assert_eq!(
        normalize_setup_snapshot(&strip_marker(&out)),
        normalize_setup_snapshot(&strip_marker(expected_fragment))
    );
}
