//! SWC 插件转换行为测试（spec_setup_switch_try_finally_deep）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn deep_switch_try_finally_with_nested_whitelist_and_complex_params() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const a = ref(0)
  const info = { x: a.value, arr: [a.value, `t=${a.value > 0 ? 'Y' : 'N'}`] }
  watchEffect(() => console.log('pre', info.x))
  switch (a.value % 2) {
    case 0: {
      try {
        const b = a.value + 1
      } finally {
        watchEffect(() => {
          onBeforeUnmount(() => console.log('cleanup', a.value, info.arr[1]))
        })
      }
      break
    }
    default: {
      try {
        const c = a.value + 2
        console.log(c)
      } finally {
        onBeforeUnmount(() => watchEffect(() => console.log('done', a.value)))
      }
    }
  }
  return <div>{info.arr[1]}</div>
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
        const info = {
            x: a.value,
            arr: [
                a.value,
                `t=${a.value > 0 ? 'Y' : 'N'}`
            ]
        };
        _$vaporWithHookId("watchEffect:1:1", ()=>watchEffect(()=>console.log('pre', info.x)));
        switch(a.value % 2){
            case 0:
                {
                    try {
                        const b = a.value + 1;
                    } finally{
                        _$vaporWithHookId("watchEffect:1:2", ()=>watchEffect(()=>{
                                onBeforeUnmount(()=>console.log('cleanup', a.value, info.arr[1]));
                            }));
                    }
                    break;
                }
            default:
                {
                    try {
                        const c = a.value + 2;
                        console.log(c);
                    } finally{
                        onBeforeUnmount(()=>_$vaporWithHookId("watchEffect:1:3", ()=>watchEffect(()=>console.log('done', a.value))));
                    }
                }
        }
        return {
            a: a,
            info: info
        };
    }));
    const { a: a, info: info } = _$useSetup;
    return <div>{info.arr[1]}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_switch_try_finally_deep.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
