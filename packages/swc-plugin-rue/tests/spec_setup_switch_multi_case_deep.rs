//! SWC 插件转换行为测试（spec_setup_switch_multi_case_deep）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn switch_multi_case_with_nested_try_finally_and_whitelist() {
    let src = r##"
import { type FC, ref } from 'rue-js'

const Comp: FC = () => {
  const a = ref(0)
  const pre = a.value + 1
  watchEffect(() => console.log('setup', pre))
  switch (a.value % 3) {
    case 0: {
      const b = a.value + 2
      try {
        const c = a.value + 3
      } finally {
        onBeforeUnmount(() => console.log('c', a.value))
      }
      break
    }
    case 1: {
      watchEffect(() => console.log('case1', a.value))
      break
    }
    case 2: {
      try {
        const d = a.value + 4
      } finally {
        watchEffect(() => onBeforeUnmount(() => console.log('case2', a.value)))
      }
      break
    }
    default: {
      const e = a.value + 5
    }
  }
  return <div>{pre}</div>
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
            const pre = a.value + 1;
            _$vaporWithHookId("watchEffect:1:1", ()=>watchEffect(()=>console.log('setup', pre)));
            switch(a.value % 3){
                case 0:
                    {
                        const b = a.value + 2;
                        try {
                            const c = a.value + 3;
                        } finally{
                            onBeforeUnmount(()=>console.log('c', a.value));
                        }
                        break;
                    }
                case 1:
                    {
                        _$vaporWithHookId("watchEffect:1:2", ()=>watchEffect(()=>console.log('case1', a.value)));
                        break;
                    }
                case 2:
                    {
                        try {
                            const d = a.value + 4;
                        } finally{
                            _$vaporWithHookId("watchEffect:1:3", ()=>watchEffect(()=>onBeforeUnmount(()=>console.log('case2', a.value))));
                        }
                        break;
                    }
                default:
                    {
                        const e = a.value + 5;
                    }
            }
            return {
                a: a,
                pre: pre
            };
        }));
    const { a: a, pre: pre } = _$useSetup;
    return <div>{pre}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_switch_multi_case_deep.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
