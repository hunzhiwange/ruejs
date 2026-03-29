//! SWC 插件转换行为测试（spec_setup_finally_multi_nested_whitelist）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn multi_nested_finally_with_whitelist_chains_and_mixed_params() {
    let src = r##"
import { ref } from 'rue-js'

function Comp(): JSX.Element {
  const a = ref(1)
  const obj = { z: a.value, arr: [a.value, { w: a.value > 0 ? 'ok' : 'no' }] }
  watchEffect(() => {
    onBeforeUnmount(() => console.log('phase1', a.value))
  })
  try {
    const k = a.value + 3
  } finally {
    try {
      const m = a.value + 4
    } finally {
      watchEffect(() => {
        onBeforeUnmount(() => watchEffect(() => console.log('phase3', obj.arr[1].w)))
      })
    }
  }
  return <div>{obj.arr[0]}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { ref, onBeforeUnmount, watchEffect, _$vaporWithHookId, useSetup } from 'rue-js';
function Comp(): JSX.Element {
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const a = _$vaporWithHookId("ref:1.2:0", ()=>ref(1));
            const obj = {
                z: a.value,
                arr: [
                    a.value,
                    {
                        w: a.value > 0 ? 'ok' : 'no'
                    }
                ]
            };
            _$vaporWithHookId("watchEffect:1.2:1", ()=>watchEffect(()=>{
                    onBeforeUnmount(()=>console.log('phase1', a.value));
                }));
            try {
                const k = a.value + 3;
            } finally{
                try {
                    const m = a.value + 4;
                } finally{
                    _$vaporWithHookId("watchEffect:1.2:3", ()=>watchEffect(()=>{
                            onBeforeUnmount(()=>_$vaporWithHookId("watchEffect:1.2:2", ()=>watchEffect(()=>console.log('phase3', obj.arr[1].w))));
                        }));
                }
            }
            return {
                a: a,
                obj: obj
            };
        }));
    const { a: a, obj: obj } = _$useSetup;
    return <div>{obj.arr[0]}</div>;
}
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_finally_multi_nested_whitelist.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
