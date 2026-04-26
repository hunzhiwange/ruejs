//! SWC 插件转换行为测试（spec_setup_switch_nested_switch_try_finally）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn switch_case_nested_switch_with_try_finally_interleave() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(0)
  const pre = { t: `t=${a.value}`, arr: [a.value, a.value > 0 ? 'X' : 'Y'] }
  watchEffect(() => console.log('setup', pre.t))
  switch (a.value % 2) {
    case 0: {
      const b = a.value + 1
      switch (b % 3) {
        case 2: {
          try {
            const c = a.value + 7
          } finally {
            watchEffect(() => {
              onBeforeUnmount(() => console.log('inner2', pre.arr[0], a.value))
              console.log('extra', b)
            })
          }
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
        const d = a.value + 2
      } finally {
        watchEffect(() => console.log('fin', a.value))
      }
      break
    }
  }
  return <div>{pre.arr[1]}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { onBeforeUnmount, watchEffect, _$vaporWithHookId, useSetup } from "@rue-js/rue/vapor";
import { type FC, ref } from '@rue-js/rue';
const Comp: FC = ()=>{
    const _$useSetup = _$vaporWithHookId("useSetup:0:0", ()=>useSetup(()=>{
        const a = _$vaporWithHookId("ref:1:0", ()=>ref(0));
        const pre = {
            t: `t=${a.value}`,
            arr: [
                a.value,
                a.value > 0 ? 'X' : 'Y'
            ]
        };
        _$vaporWithHookId("watchEffect:1:1", ()=>watchEffect(()=>console.log('setup', pre.t)));
        switch(a.value % 2){
            case 0:
                {
                    const b = a.value + 1;
                    switch(b % 3){
                        case 2:
                            {
                                try {
                                    const c = a.value + 7;
                                } finally{
                                    _$vaporWithHookId("watchEffect:1:2", ()=>watchEffect(()=>{
                                            onBeforeUnmount(()=>console.log('inner2', pre.arr[0], a.value));
                                            console.log('extra', b);
                                        }));
                                }
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
                        const d = a.value + 2;
                    } finally{
                        _$vaporWithHookId("watchEffect:1:3", ()=>watchEffect(()=>console.log('fin', a.value)));
                    }
                    break;
                }
        }
        return {
            a: a,
            pre: pre
        };
    }));
    const { a: a, pre: pre } = _$useSetup;
    return <div>{pre.arr[1]}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_switch_nested_switch_try_finally.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
