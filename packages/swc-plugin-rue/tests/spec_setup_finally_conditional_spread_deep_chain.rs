//! SWC 插件转换行为测试（spec_setup_finally_conditional_spread_deep_chain）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn finally_with_conditional_spread_and_deep_function_returns() {
    let src = r##"
import { ref } from '@rue-js/rue'

function Comp(): JSX.Element {
  const a = ref(2)
  function buildX() {
    return { u: a.value, obj: { q: `q=${a.value}-${a.value > 0 ? 'A' : 'B'}` } }
  }
  function buildY() {
    return { v: a.value, arr: [a.value, { w: a.value > 1 ? 'Y' : 'N' }] }
  }
  function mkDeep() {
    return { deep: { more: [ { k: a.value }, a.value > 1 ? 'AA' : 'BB' ] } }
  }
  function mkOther() {
    return { other: [a.value, 'z'] }
  }
  try {
    const t = a.value + 1
  } finally {
    const combined = { ...(a.value > 0 ? buildX() : buildY()), ...mkDeep().deep, ...(a.value > 1 ? { extra: ['t', a.value] } : { extra: ['f'] }) }
    const list = [...(a.value > 0 ? mkOther().other : [0]), ...mkDeep().deep.more]
    onBeforeUnmount(() => console.log('combo', combined.extra[0], list[2]))
  }
  return <div>{a.value > 0 ? buildX().obj.q : buildY().arr[1].w}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { ref, onBeforeUnmount, _$vaporWithHookId, useSetup } from '@rue-js/rue';
function Comp(): JSX.Element {
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const a = _$vaporWithHookId("ref:1.2:0", ()=>ref(2));
        function buildX() {
            return {
                u: a.value,
                obj: {
                    q: `q=${a.value}-${a.value > 0 ? 'A' : 'B'}`
                }
            };
        }
        function buildY() {
            return {
                v: a.value,
                arr: [
                    a.value,
                    {
                        w: a.value > 1 ? 'Y' : 'N'
                    }
                ]
            };
        }
        function mkDeep() {
            return {
                deep: {
                    more: [
                        {
                            k: a.value
                        },
                        a.value > 1 ? 'AA' : 'BB'
                    ]
                }
            };
        }
        function mkOther() {
            return {
                other: [
                    a.value,
                    'z'
                ]
            };
        }
        try {
            const t = a.value + 1;
        } finally{
            const combined = {
                ...(a.value > 0 ? buildX() : buildY()),
                ...mkDeep().deep,
                ...(a.value > 1 ? {
                    extra: [
                        't',
                        a.value
                    ]
                } : {
                    extra: [
                        'f'
                    ]
                })
            };
            const list = [
                ...(a.value > 0 ? mkOther().other : [
                    0
                ]),
                ...mkDeep().deep.more
            ];
            onBeforeUnmount(()=>console.log('combo', combined.extra[0], list[2]));
        }
        return {
            a: a,
            buildX: buildX,
            buildY: buildY,
            mkDeep: mkDeep,
            mkOther: mkOther
        };
    }));
    const { a: a, buildX: buildX, buildY: buildY, mkDeep: mkDeep, mkOther: mkOther } = _$useSetup;
    return <div>{a.value > 0 ? buildX().obj.q : buildY().arr[1].w}</div>;
}
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_finally_conditional_spread_deep_chain.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
