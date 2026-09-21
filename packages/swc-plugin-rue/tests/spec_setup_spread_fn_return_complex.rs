//! SWC 插件转换行为测试（spec_setup_spread_fn_return_complex）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn spread_fn_return_with_nested_tpl_and_conditional() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(1)
  function build() {
    return {
      x: a.value,
      nested: [a.value, { y: a.value, label: `n=${a.value}-${a.value > 0 ? 'x' : 'y'}` }],
      flag: a.value > 0 ? 'ok' : 'no'
    }
  }
  const obj = { ...build(), z: a.value }
  const arr = [...build().nested, a.value > 0 ? 't' : 'f']
  return <div>{obj.z}-{arr[2]}</div>
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
                            y: a.value,
                            label: `n=${a.value}-${a.value > 0 ? 'x' : 'y'}`
                        }
                    ],
                    flag: a.value > 0 ? 'ok' : 'no'
                };
            }
            const obj = computed(()=>({
                        ...build(),
                        z: a.value
                }));
            untrack(()=>obj.get());
            const __rue_phase2_obj = obj;
            const arr = computed(()=>[
                        ...build().nested,
                        a.value > 0 ? 't' : 'f'
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
    return <div>{obj.get().z}-{arr.get()[2]}</div>;
};
"##;

    use utils::{normalize_setup_snapshot, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_spread_fn_return_complex.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(
        normalize_setup_snapshot(&strip_marker(&out)),
        normalize_setup_snapshot(&strip_marker(expected_fragment))
    );
}
