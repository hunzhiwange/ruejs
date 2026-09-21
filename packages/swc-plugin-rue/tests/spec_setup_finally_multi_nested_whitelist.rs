//! SWC 插件转换行为测试（spec_setup_finally_multi_nested_whitelist）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn multi_nested_finally_with_whitelist_chains_and_mixed_params() {
    let src = r##"
import { ref } from '@rue-js/rue'

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

    let expected_fragment = r##"import { onBeforeUnmount, watchEffect, ref, computed, _$compiledWithHookId, useSetup } from "@rue-js/rue/internal";
function Comp(): JSX.Element {
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const a = ref(1);
            const obj = computed(()=>({
                        z: a.value,
                        arr: [
                            a.value,
                            {
                                w: a.value > 0 ? 'ok' : 'no'
                            }
                        ]
                }));
            untrack(()=>obj.get());
            const __rue_phase2_obj = obj;
            watchEffect(()=>{
                    onBeforeUnmount(()=>console.log('phase1', a.value));
                });
            try {
                const k = a.value + 3;
            } finally{
                try {
                    const m = a.value + 4;
                } finally{
                    _$compiledWithHookId("watchEffect:1.2:4", ()=>watchEffect(()=>{
                            onBeforeUnmount(()=>_$compiledWithHookId("watchEffect:1.2:3", ()=>watchEffect(()=>console.log('phase3', __rue_phase2_obj.get().arr[1].w))));
                        }));
                }
            }
            return {
                a: a,
                obj: obj,
                __rue_phase2_obj: __rue_phase2_obj
            };
        }));
    const { a: a, obj: obj, __rue_phase2_obj: __rue_phase2_obj } = _$useSetup;
    return <div>{obj.get().arr[0]}</div>;
}
"##;

    use utils::{normalize_setup_snapshot, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_finally_multi_nested_whitelist.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(
        normalize_setup_snapshot(&strip_marker(&out)),
        normalize_setup_snapshot(&strip_marker(expected_fragment))
    );
}
