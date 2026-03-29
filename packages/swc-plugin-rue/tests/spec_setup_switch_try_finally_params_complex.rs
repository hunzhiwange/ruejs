//! SWC 插件转换行为测试（spec_setup_switch_try_finally_params_complex）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn switch_try_finally_with_complex_params_and_whitelist_mix() {
    let src = r##"
import { type FC, ref } from 'rue-js'

const Comp: FC = () => {
  const a = ref(0)
  watchEffect(() => console.log('pre', a.value))
  switch (a.value) {
    case 0: {
      try {
        const b = a.value + 1
        console.log(b)
      } catch (e) {
        console.log(e)
      } finally {
        onBeforeUnmount(() => console.log(`fin=${a.value}-${a.value > 0 ? 'x' : 'y'}`, [a.value], { x: a.value }))
      }
      break
    }
    default: {
      watchEffect(() => console.log([a.value, 'k'], { t: `v=${a.value}` }))
    }
  }
  return <div>{a.value}</div>
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
        _$vaporWithHookId("watchEffect:1:1", ()=>watchEffect(()=>console.log('pre', a.value)));
        switch(a.value){
            case 0:
                {
                    try {
                        const b = a.value + 1;
                        console.log(b);
                    } catch (e) {
                        console.log(e);
                    } finally{
                        onBeforeUnmount(()=>console.log(`fin=${a.value}-${a.value > 0 ? 'x' : 'y'}`, [
                                a.value
                            ], {
                                x: a.value
                            }));
                    }
                    break;
                }
            default:
                {
                    _$vaporWithHookId("watchEffect:1:2", ()=>watchEffect(()=>console.log([
                                a.value,
                                'k'
                            ], {
                                t: `v=${a.value}`
                            })));
                }
        }
        return {
            a: a
        };
    }));
    const { a: a } = _$useSetup;
    return <div>{a.value}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write(
        "target/vapor_outputs/spec_on_setup_switch_try_finally_params_complex.out.js",
        strip_marker(&out),
    )
    .ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
