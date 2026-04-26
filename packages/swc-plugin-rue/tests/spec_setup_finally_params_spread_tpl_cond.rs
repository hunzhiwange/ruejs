//! SWC 插件转换行为测试（spec_setup_finally_params_spread_tpl_cond）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn finally_params_with_multi_spread_and_tpl_cond_nesting() {
    let src = r##"
import { ref } from '@rue-js/rue'

function Comp(): JSX.Element {
  const a = ref(1)
  function build1() {
    return { x: a.value, arr: [a.value, { q: `q=${a.value}-${a.value > 0 ? 'A' : 'B'}` }] }
  }
  function build2() {
    return { y: a.value > 0 ? 'yes' : 'no', list: [ { k: a.value }, a.value ] }
  }
  try {
    const tmp = a.value + 1
  } finally {
    watchEffect(() => {
      const mix = { ...build1(), ...build2(), extra: a.value > 0 ? ['t', a.value] : ['f'] }
      onBeforeUnmount(() => console.log('cleanup', mix.extra[0], mix.arr[1].q))
    })
  }
  return <div>{build1().arr[0]}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { onBeforeUnmount, watchEffect, _$vaporWithHookId, useSetup } from "@rue-js/rue/vapor";
import { ref } from '@rue-js/rue';
function Comp(): JSX.Element {
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const a = _$vaporWithHookId("ref:1.2:0", ()=>ref(1));
            function build1() {
                return {
                    x: a.value,
                    arr: [
                        a.value,
                        {
                            q: `q=${a.value}-${a.value > 0 ? 'A' : 'B'}`
                        }
                    ]
                };
            }
            function build2() {
                return {
                    y: a.value > 0 ? 'yes' : 'no',
                    list: [
                        {
                            k: a.value
                        },
                        a.value
                    ]
                };
            }
            try {
                const tmp = a.value + 1;
            } finally{
                _$vaporWithHookId("watchEffect:1.2:1", ()=>watchEffect(()=>{
                        const mix = {
                            ...build1(),
                            ...build2(),
                            extra: a.value > 0 ? [
                                't',
                                a.value
                            ] : [
                                'f'
                            ]
                        };
                        onBeforeUnmount(()=>console.log('cleanup', mix.extra[0], mix.arr[1].q));
                    }));
            }
            return {
                a: a,
                build1: build1,
                build2: build2
            };
        }));
    const { a: a, build1: build1, build2: build2 } = _$useSetup;
    return <div>{build1().arr[0]}</div>;
}
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_finally_params_spread_tpl_cond.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
