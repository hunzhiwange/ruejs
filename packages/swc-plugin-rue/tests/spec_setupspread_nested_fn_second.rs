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

    let expected_fragment = r##"
import { _$vaporWithHookId, useSetup } from "@rue-js/rue/vapor";
import { type FC, ref } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const a = _$vaporWithHookId("ref:1:0", ()=>ref(3));
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
        const obj = {
            ...build1(),
            ...build2(),
            more: `p=${a.value}-${a.value > 0 ? 'x' : 'y'}`
        };
        const arr = [
            ...build2().nested,
            ...build1().nested2,
            a.value > 0 ? [
                't',
                a.value
            ] : [
                'f'
            ]
        ];
        return {
            a: a,
            build1: build1,
            build2: build2,
            obj: obj,
            arr: arr
        };
    }));
    const { a: a, build1: build1, build2: build2, obj: obj, arr: arr } = _$useSetup;
    return <div>{obj.more}-{arr[3][0]}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_spread_nested_fn_second.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
