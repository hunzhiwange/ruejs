//! SWC 插件转换行为测试（spec_setup_finally_deep_chain）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn deep_finally_chain_with_nested_whitelist_and_complex_params() {
    let src = r##"
import { ref } from '@rue-js/rue'

function Comp(): JSX.Element {
  const a = ref(2)
  const info = { x: a.value, arr: [a.value, `t=${a.value > 1 ? 'A' : 'B'}`] }
  watchEffect(() => console.log('pre', info.x))
  try {
    const x = a.value + 1
  } finally {
    try {
      const y = a.value + 2
    } finally {
      try {
        const z = a.value + 3
      } finally {
        onBeforeUnmount(() => watchEffect(() => console.log('end', info.arr[1], a.value)))
      }
    }
  }
  return <div>{info.arr[1]}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"import { onBeforeUnmount, watchEffect, ref, computed, _$compiledWithHookId, useSetup } from "@rue-js/rue/internal";
function Comp(): JSX.Element {
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const a = ref(2);
            const info = computed(()=>({
                        x: a.value,
                        arr: [
                            a.value,
                            `t=${a.value > 1 ? 'A' : 'B'}`
                        ]
                }));
            untrack(()=>info.get());
            const __rue_phase2_info = info;
            watchEffect(()=>console.log('pre', __rue_phase2_info.get().x));
            try {
                const x = a.value + 1;
            } finally{
                try {
                    const y = a.value + 2;
                } finally{
                    try {
                        const z = a.value + 3;
                    } finally{
                        onBeforeUnmount(()=>_$compiledWithHookId("watchEffect:1.2:3", ()=>watchEffect(()=>console.log('end', __rue_phase2_info.get().arr[1], a.value))));
                    }
                }
            }
            return {
                a: a,
                info: info,
                __rue_phase2_info: __rue_phase2_info
            };
        }));
    const { a: a, info: info, __rue_phase2_info: __rue_phase2_info } = _$useSetup;
    return <div>{info.get().arr[1]}</div>;
}
"##;

    use utils::{normalize_setup_snapshot, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_finally_deep_chain.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(
        normalize_setup_snapshot(&strip_marker(&out)),
        normalize_setup_snapshot(&strip_marker(expected_fragment))
    );
}
