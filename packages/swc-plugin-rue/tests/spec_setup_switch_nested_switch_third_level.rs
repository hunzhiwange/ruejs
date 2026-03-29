//! SWC 插件转换行为测试（spec_setup_switch_nested_switch_third_level）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn switch_case_nested_switch_third_level_with_try_catch_finally() {
    let src = r##"
import { type FC, ref } from 'rue-js'

const Comp: FC = () => {
  const a = ref(0)
  const pre = { t: `t=${a.value}`, arr: [a.value, a.value > 0 ? 'X' : 'Y'] }
  watchEffect(() => console.log('setup', pre.t))
  switch (a.value % 2) {
    case 0: {
      const b = a.value + 1
      switch (b % 3) {
        case 1: {
          try {
            const c = a.value + 5
          } catch (e) {
            console.log(e)
          } finally {
            switch (c % 2) {
              case 0: {
                watchEffect(() => onBeforeUnmount(() => console.log('third', pre.arr[1])))
                break
              }
              default: {
                onBeforeUnmount(() => console.log('third-other', a.value))
              }
            }
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
  return <div>{pre.arr[0]}</div>
}
"##;
    let (program, cm) = utils::parse(src, "test.tsx");
    let program = apply_pre(program);
    let out = utils::emit(program, cm);

    let expected_fragment = r##"
import { type FC, ref, onBeforeUnmount, watchEffect, _$vaporWithHookId, useSetup } from 'rue-js';
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
                        case 1:
                            {
                                try {
                                    const c = a.value + 5;
                                } catch (e) {
                                    console.log(e);
                                } finally{
                                    switch(c % 2){
                                        case 0:
                                            {
                                                _$vaporWithHookId("watchEffect:1:2", ()=>watchEffect(()=>onBeforeUnmount(()=>console.log('third', pre.arr[1]))));
                                                break;
                                            }
                                        default:
                                            {
                                                onBeforeUnmount(()=>console.log('third-other', a.value));
                                            }
                                    }
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
    return <div>{pre.arr[0]}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_switch_nested_switch_third_level.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
