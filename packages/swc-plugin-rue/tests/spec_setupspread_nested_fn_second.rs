//! SWC 插件转换行为测试（spec_setupspread_nested_fn_second）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn nested_fn_return_second_spread_with_tpl_and_cond() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(3)
  function build1() {
    return { u: a.value, nested2: [a.value, { q: `q=${a.value}-${a.value > 0 ? 'X' : 'Y'}` }] }
  }
  function build2() {
    return { nested: [a.value, { w: a.value > 0 ? 'ok' : 'no' }] }
  }
  const obj = { ...build1(), ...build2(), more: `p=${a.value}-${a.value > 0 ? 'x' : 'y'}` }
  const arr = [...build2().nested, ...build1().nested2, a.value > 0 ? ['t', a.value] : ['f']]
  return <div>{obj.more}-{arr[3][0]}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"import { computed, _$compiledWithHookId, useSetup } from "@rue-js/rue/internal";
import { type FC, ref } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const a = ref(3);
            function build1() {
                return {
                    u: a.value,
                    nested2: [
                        a.value,
                        {
                            q: `q=${a.value}-${a.value > 0 ? 'X' : 'Y'}`
                        }
                    ]
                };
            }
            function build2() {
                return {
                    nested: [
                        a.value,
                        {
                            w: a.value > 0 ? 'ok' : 'no'
                        }
                    ]
                };
            }
            const obj = computed(()=>({
                        ...build1(),
                        ...build2(),
                        more: `p=${a.value}-${a.value > 0 ? 'x' : 'y'}`
                }));
            untrack(()=>obj.get());
            const __rue_phase2_obj = obj;
            const arr = computed(()=>[
                        ...build2().nested,
                        ...build1().nested2,
                        a.value > 0 ? [
                            't',
                            a.value
                        ] : [
                            'f'
                        ]
                ]);
            untrack(()=>arr.get());
            const __rue_phase2_arr = arr;
            return {
                a: a,
                build1: build1,
                build2: build2,
                obj: obj,
                __rue_phase2_obj: __rue_phase2_obj,
                arr: arr,
                __rue_phase2_arr: __rue_phase2_arr
            };
        }));
    const { a: a, build1: build1, build2: build2, obj: obj, __rue_phase2_obj: __rue_phase2_obj, arr: arr, __rue_phase2_arr: __rue_phase2_arr } = _$useSetup;
    return <div>{obj.get().more}-{arr.get()[3][0]}</div>;
};
"##;

    use utils::{normalize_setup_snapshot, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_spread_nested_fn_second.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(
        normalize_setup_snapshot(&strip_marker(&out)),
        normalize_setup_snapshot(&strip_marker(expected_fragment))
    );
}
