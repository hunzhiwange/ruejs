//! SWC 插件转换行为测试（spec_setup_spread_multi_build_chain）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn multi_build_functions_with_multiple_spreads_and_nested_tpl_cond_arrays() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(5)
  function build1() {
    return { x: a.value, arr: [a.value, { y: `y=${a.value}-${a.value > 0 ? 'A' : 'B'}` }] }
  }
  function build2() {
    return { obj: { z: a.value > 0 ? 'ok' : 'no' }, arr2: [a.value, 'm'] }
  }
  function build3() {
    return { more: `m=${a.value}`, arr3: [ { k: a.value }, a.value > 3 ? 'X' : 'Y' ] }
  }
  const combined = { ...build1(), ...build2(), ...build3(), extra: a.value > 0 ? ['t', a.value] : ['f'] }
  const list = [...build1().arr, ...build2().arr2, ...build3().arr3, a.value > 0 ? { p: a.value } : { p: 0 }]
  return <div>{combined.extra[0]}-{list[3].p}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"import { computed, _$compiledWithHookId, useSetup } from "@rue-js/rue/internal";
import { type FC, ref } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const a = ref(5);
            function build1() {
                return {
                    x: a.value,
                    arr: [
                        a.value,
                        {
                            y: `y=${a.value}-${a.value > 0 ? 'A' : 'B'}`
                        }
                    ]
                };
            }
            function build2() {
                return {
                    obj: {
                        z: a.value > 0 ? 'ok' : 'no'
                    },
                    arr2: [
                        a.value,
                        'm'
                    ]
                };
            }
            function build3() {
                return {
                    more: `m=${a.value}`,
                    arr3: [
                        {
                            k: a.value
                        },
                        a.value > 3 ? 'X' : 'Y'
                    ]
                };
            }
            const combined = computed(()=>({
                        ...build1(),
                        ...build2(),
                        ...build3(),
                        extra: a.value > 0 ? [
                            't',
                            a.value
                        ] : [
                            'f'
                        ]
                }));
            untrack(()=>combined.get());
            const __rue_phase2_combined = combined;
            const list = computed(()=>[
                        ...build1().arr,
                        ...build2().arr2,
                        ...build3().arr3,
                        a.value > 0 ? {
                            p: a.value
                        } : {
                            p: 0
                        }
                ]);
            untrack(()=>list.get());
            const __rue_phase2_list = list;
            return {
                a: a,
                build1: build1,
                build2: build2,
                build3: build3,
                combined: combined,
                __rue_phase2_combined: __rue_phase2_combined,
                list: list,
                __rue_phase2_list: __rue_phase2_list
            };
        }));
    const { a: a, build1: build1, build2: build2, build3: build3, combined: combined, __rue_phase2_combined: __rue_phase2_combined, list: list, __rue_phase2_list: __rue_phase2_list } = _$useSetup;
    return <div>{combined.get().extra[0]}-{list.get()[3].p}</div>;
};
"##;

    use utils::{normalize_setup_snapshot, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_spread_multi_build_chain.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(
        normalize_setup_snapshot(&strip_marker(&out)),
        normalize_setup_snapshot(&strip_marker(expected_fragment))
    );
}
