//! SWC 插件转换行为测试（spec_setup_spread_fn_return）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn spread_of_function_returned_objects_and_arrays_are_collected() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(1)
  function build() {
    return { x: a.value, nested: [a.value, { y: a.value }] }
  }
  const obj = { ...build(), y: a.value }
  const arr = [...build().nested, a.value]
  return <div>{obj.y}-{arr[2]}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"import { computed, _$compiledWithHookId, useSetup } from "@rue-js/rue/internal";
import { type FC, ref } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const a = ref(1);
            function build() {
                return {
                    x: a.value,
                    nested: [
                        a.value,
                        {
                            y: a.value
                        }
                    ]
                };
            }
            const obj = computed(()=>({
                        ...build(),
                        y: a.value
                }));
            untrack(()=>obj.get());
            const __rue_phase2_obj = obj;
            const arr = computed(()=>[
                        ...build().nested,
                        a.value
                ]);
            untrack(()=>arr.get());
            const __rue_phase2_arr = arr;
            return {
                a: a,
                build: build,
                obj: obj,
                __rue_phase2_obj: __rue_phase2_obj,
                arr: arr,
                __rue_phase2_arr: __rue_phase2_arr
            };
        }));
    const { a: a, build: build, obj: obj, __rue_phase2_obj: __rue_phase2_obj, arr: arr, __rue_phase2_arr: __rue_phase2_arr } = _$useSetup;
    return <div>{obj.get().y}-{arr.get()[2]}</div>;
};
"##;

    use utils::{normalize_setup_snapshot, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_spread_fn_return.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(
        normalize_setup_snapshot(&strip_marker(&out)),
        normalize_setup_snapshot(&strip_marker(expected_fragment))
    );
}
