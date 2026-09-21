//! SWC 插件转换行为测试（spec_setup_switch_nested_switch）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn switch_case_contains_nested_switch_and_whitelist_mix() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(0)
  const pre = { t: `t=${a.value}`, arr: [a.value, a.value > 0 ? 'X' : 'Y'] }
  watchEffect(() => console.log('setup', pre.t))
  switch (a.value % 2) {
    case 0: {
      const b = a.value + 1
      switch (b % 2) {
        case 0: {
          watchEffect(() => onBeforeUnmount(() => console.log('inner', pre.arr[1])))
          break
        }
        default: {
          onBeforeUnmount(() => console.log('other', a.value))
        }
      }
      break
    }
    case 1: {
      try {
        const c = a.value + 2
      } finally {
        watchEffect(() => console.log('fin', a.value))
      }
      break
    }
  }
  return <div>{pre.arr[0]}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"import { onBeforeUnmount, watchEffect, ref, computed, _$compiledWithHookId, useSetup } from "@rue-js/rue/internal";
import { type FC } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$compiledWithHookId("useSetup:0:0", ()=>useSetup(()=>{
            const a = ref(0);
            const pre = computed(()=>({
                        t: `t=${a.value}`,
                        arr: [
                            a.value,
                            a.value > 0 ? 'X' : 'Y'
                        ]
                }));
            untrack(()=>pre.get());
            const __rue_phase2_pre = pre;
            watchEffect(()=>console.log('setup', __rue_phase2_pre.get().t));
            switch(a.value % 2){
                case 0:
                    {
                        const b = a.value + 1;
                        switch(b % 2){
                            case 0:
                                {
                                    _$compiledWithHookId("watchEffect:1:3", ()=>watchEffect(()=>onBeforeUnmount(()=>console.log('inner', __rue_phase2_pre.get().arr[1]))));
                                    break;
                                }
                            default:
                                {
                                    onBeforeUnmount(()=>console.log('other', a.value));
                                }
                        }
                        break;
                    }
                case 1:
                    {
                        try {
                            const c = a.value + 2;
                        } finally{
                            _$compiledWithHookId("watchEffect:1:4", ()=>watchEffect(()=>console.log('fin', a.value)));
                        }
                        break;
                    }
            }
            return {
                a: a,
                pre: pre,
                __rue_phase2_pre: __rue_phase2_pre
            };
        }));
    const { a: a, pre: pre, __rue_phase2_pre: __rue_phase2_pre } = _$useSetup;
    return <div>{pre.get().arr[0]}</div>;
};
"##;

    use utils::{normalize_setup_snapshot, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_switch_nested_switch.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(
        normalize_setup_snapshot(&strip_marker(&out)),
        normalize_setup_snapshot(&strip_marker(expected_fragment))
    );
}
