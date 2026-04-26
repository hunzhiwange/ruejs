//! SWC 插件转换行为测试（spec_whitelist）
//!
//! 覆盖：此用例的转换快照对比。
use swc_plugin_rue::apply_pre;

mod utils;

#[test]
fn transforms_setup_with_watch_effects() {
    let src = r##"
import { type FC, ref } from '@rue-js/rue'

const Comp: FC = () => {
  const c = ref(0)
  const d = ref(1)
  watchEffect(() => {
    console.log(c.value + d.value)
  })
  onBeforeUnmount(() => {
    console.log('cleanup')
  })
  return <div>{c.value}</div>
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
        const c = _$vaporWithHookId("ref:1:0", ()=>ref(0));
        const d = _$vaporWithHookId("ref:1:1", ()=>ref(1));
        _$vaporWithHookId("watchEffect:1:2", ()=>watchEffect(()=>{
                console.log(c.value + d.value);
            }));
        onBeforeUnmount(()=>{
            console.log('cleanup');
        });
        return {
            c: c,
            d: d
        };
    }));
    const { c: c, d: d } = _$useSetup;
    return <div>{c.value}</div>;
};
"##;

    use utils::{normalize, strip_marker};
    std::fs::create_dir_all("target/vapor_outputs").ok();
    std::fs::write("target/vapor_outputs/spec_whitelist.out.js", strip_marker(&out)).ok();
    assert_eq!(normalize(&strip_marker(&out)), normalize(&strip_marker(expected_fragment)));
}
