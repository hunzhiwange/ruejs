//! SWC 插件转换行为测试（spec_setup_finally_multi_spread_second_spread_chain）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn finally_with_multi_spread_chain_and_second_spread_from_function() {
    let src = r##"
import { ref } from '@rue-js/rue'

function Comp(): JSX.Element {
  const a = ref(3)
  function buildA() {
    return { u: a.value, nested2: [a.value, { q: `q=${a.value}-${a.value > 0 ? 'X' : 'Y'}` }] }
  }
  function buildB() {
    return { nested: [a.value, { w: a.value > 0 ? 'ok' : 'no' }], list: [a.value, 'm'] }
  }
  function mk() {
    return { deep: { more: [ { k: a.value }, a.value > 2 ? 'AA' : 'BB' ] } }
  }
  try {
    const t = a.value + 1
  } finally {
    const mixObj = { ...buildA(), ...mk().deep, extra: a.value > 0 ? ['t', a.value] : ['f'] }
    const mixArr = [...buildA().nested2, ...mk().deep.more, ...buildB().list]
    onBeforeUnmount(() => console.log('mix', mixObj.extra[0], mixArr[3]))
  }
  return <div>{buildA().nested2[1].q}-{mk().deep.more[0].k}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { ref, onBeforeUnmount, _$vaporWithHookId, useSetup } from '@rue-js/rue';
function Comp(): JSX.Element {
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const a = _$vaporWithHookId("ref:1.2:0", ()=>ref(3));
        function buildA() {
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
        function buildB() {
            return {
                nested: [
                    a.value,
                    {
                        w: a.value > 0 ? 'ok' : 'no'
                    }
                ],
                list: [
                    a.value,
                    'm'
                ]
            };
        }
        function mk() {
            return {
                deep: {
                    more: [
                        {
                            k: a.value
                        },
                        a.value > 2 ? 'AA' : 'BB'
                    ]
                }
            };
        }
        try {
            const t = a.value + 1;
        } finally{
            const mixObj = {
                ...buildA(),
                ...mk().deep,
                extra: a.value > 0 ? [
                    't',
                    a.value
                ] : [
                    'f'
                ]
            };
            const mixArr = [
                ...buildA().nested2,
                ...mk().deep.more,
                ...buildB().list
            ];
            onBeforeUnmount(()=>console.log('mix', mixObj.extra[0], mixArr[3]));
        }
        return {
            a: a,
            buildA: buildA,
            buildB: buildB,
            mk: mk
        };
    }));
    const { a: a, buildA: buildA, buildB: buildB, mk: mk } = _$useSetup;
    return <div>{buildA().nested2[1].q}-{mk().deep.more[0].k}</div>;
}
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_finally_multi_spread_second_spread_chain.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
